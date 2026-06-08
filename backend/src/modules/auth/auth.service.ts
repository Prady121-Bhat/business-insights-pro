import crypto from 'crypto';
import { Types } from 'mongoose';
import { User, IUser } from '../../models/User.model';
import { Company, ICompany } from '../../models/Company.model';
import { RefreshToken } from '../../models/RefreshToken.model';
import { Settings } from '../../models/Settings.model';
import { Subscription } from '../../models/Subscription.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.utils';
import { generateToken, hashToken, generateSlug } from '../../utils/crypto.utils';
import { emailService } from '../../services/email.service';
import { AppError } from '../../middleware/errorHandler.middleware';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName?: string;
}

interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: Partial<IUser>;
  company?: Partial<ICompany>;
  tokens: AuthTokens;
}

class AuthService {
  private async generateAuthTokens(user: IUser, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const tokenId = new Types.ObjectId().toString();

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      companyId: user.companyId?.toString(),
      role: user.role,
      email: user.email,
    });

    const rawRefreshToken = signRefreshToken({
      userId: user._id.toString(),
      tokenId,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      token: hashToken(rawRefreshToken),
      expiresAt,
      ipAddress,
      userAgent,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private sanitizeUser(user: IUser): Partial<IUser> {
    const obj = user.toObject({ virtuals: true });
    delete obj.password;
    delete obj.emailVerificationToken;
    delete obj.emailVerificationExpires;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    delete obj.loginAttempts;
    delete obj.lockUntil;
    return obj;
  }

  async register(input: RegisterInput): Promise<{ message: string }> {
    const existing = await User.findOne({ email: input.email });
    if (existing) throw new AppError('Email already registered', 409);

    let company: ICompany | null = null;

    if (input.companyName) {
      let slug = generateSlug(input.companyName);
      const slugExists = await Company.exists({ slug });
      if (slugExists) slug = `${slug}-${Date.now()}`;

      company = await Company.create({
        name: input.companyName,
        slug,
        email: input.email,
      });

      await Settings.create({ companyId: company._id });
      await Subscription.create({ companyId: company._id });
    }

    const verificationToken = generateToken();
    const hashedToken = hashToken(verificationToken);

    const user = await User.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
      role: company ? 'company_admin' : 'viewer',
      companyId: company?._id,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await emailService.sendEmailVerification(user.email, user.firstName, verificationToken).catch((e) => logger.warn('Email send failed (dev)', { error: e.message }));

    logger.info('User registered', { userId: user._id, email: user.email });
    return { message: 'Registration successful. Check your email to verify your account.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) throw new AppError('Invalid or expired verification token', 400);

    await User.findByIdAndUpdate(user._id, {
      $set: { isEmailVerified: true },
      $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 },
    });

    if (user.companyId) {
      const company = await Company.findById(user.companyId);
      if (company) await emailService.sendWelcome(user.email, user.firstName, company.name);
    }

    logger.info('Email verified', { userId: user._id });
    return { message: 'Email verified successfully. You can now log in.' };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email }).select(
      '+password +loginAttempts +lockUntil'
    );

    if (!user) throw new AppError('Invalid email or password', 401);

    if (user.isLocked) {
      throw new AppError('Account locked due to too many failed attempts. Try again in 2 hours.', 423);
    }

    if (!user.isActive) throw new AppError('Account deactivated. Contact your administrator.', 403);

    const isValid = await user.comparePassword(input.password);
    if (!isValid) {
      await user.incrementLoginAttempts();
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isEmailVerified && env.isProd) {
      throw new AppError('Please verify your email before logging in.', 403);
    }

    await User.findByIdAndUpdate(user._id, {
      $set: { lastLoginAt: new Date(), loginAttempts: 0 },
      $unset: { lockUntil: 1 },
    });

    const tokens = await this.generateAuthTokens(user, input.ipAddress, input.userAgent);

    let company: Partial<ICompany> | undefined;
    if (user.companyId) {
      const companyDoc = await Company.findById(user.companyId);
      if (companyDoc) {
        company = companyDoc.toObject();
      }
    }

    logger.info('User logged in', { userId: user._id, email: user.email });

    return {
      user: this.sanitizeUser(user),
      company,
      tokens,
    };
  }

  async refreshTokens(rawToken: string, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    let payload: ReturnType<typeof verifyRefreshToken>;
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const hashedToken = hashToken(rawToken);
    const storedToken = await RefreshToken.findOne({
      userId: payload.userId,
      token: hashedToken,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!storedToken) throw new AppError('Refresh token revoked or expired', 401);

    await RefreshToken.findByIdAndUpdate(storedToken._id, { isRevoked: true });

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) throw new AppError('User not found or deactivated', 401);

    return this.generateAuthTokens(user, ipAddress, userAgent);
  }

  async logout(rawToken: string): Promise<void> {
    const hashedToken = hashToken(rawToken);
    await RefreshToken.findOneAndUpdate({ token: hashedToken }, { isRevoked: true });
  }

  async logoutAll(userId: string): Promise<void> {
    await RefreshToken.updateMany({ userId, isRevoked: false }, { isRevoked: true });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user) return;

    const resetToken = generateToken();
    const hashedToken = hashToken(resetToken);

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
    });

    await emailService.sendPasswordReset(user.email, user.firstName, resetToken);
    logger.info('Password reset email sent', { userId: user._id });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) throw new AppError('Invalid or expired reset token', 400);

    user.password = newPassword;
    await user.updateOne({
      $set: { password: user.password },
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
    });

    await this.logoutAll(user._id.toString());

    logger.info('Password reset', { userId: user._id });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new AppError('User not found', 404);

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) throw new AppError('Current password is incorrect', 401);

    user.password = newPassword;
    await user.save();

    await this.logoutAll(userId);
    logger.info('Password changed', { userId });
  }

  async getMe(userId: string): Promise<{ user: Partial<IUser>; company?: Partial<ICompany> }> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    let company: Partial<ICompany> | undefined;
    if (user.companyId) {
      const companyDoc = await Company.findById(user.companyId);
      if (companyDoc) company = companyDoc.toObject();
    }

    return { user: this.sanitizeUser(user), company };
  }
}

export const authService = new AuthService();
