import { Types } from 'mongoose';
import { User, IUser, UserRole } from '../../models/User.model';
import { userRepository } from '../../repositories/user.repository';
import { tenantService } from '../../services/tenant.service';
import { emailService } from '../../services/email.service';
import { generateToken, hashToken } from '../../utils/crypto.utils';
import { AppError } from '../../middleware/errorHandler.middleware';
import { logger } from '../../config/logger';

interface InviteInput {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  companyId: string;
  invitedByName: string;
  companyName: string;
}

interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  preferences?: Partial<IUser['preferences']>;
}

class UsersService {
  private sanitize(user: IUser): Partial<IUser> {
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

  async inviteUser(input: InviteInput): Promise<{ message: string }> {
    await tenantService.assertUserLimit(input.companyId);

    const existing = await User.findOne({ email: input.email });
    if (existing) {
      if (existing.companyId?.toString() === input.companyId) {
        throw new AppError('User already belongs to your company', 409);
      }
      throw new AppError('Email already registered on the platform', 409);
    }

    const tempPassword = generateToken(12);
    const verificationToken = generateToken();
    const hashedVerifyToken = hashToken(verificationToken);

    const user = await User.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: tempPassword,
      role: input.role,
      companyId: new Types.ObjectId(input.companyId),
      isEmailVerified: false,
      emailVerificationToken: hashedVerifyToken,
      emailVerificationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await tenantService.refreshUsageMetrics(input.companyId);

    await emailService.sendInvitation(
      user.email,
      user.firstName,
      input.companyName,
      input.invitedByName,
      verificationToken,
      tempPassword
    );

    logger.info('User invited', { userId: user._id, companyId: input.companyId });
    return { message: `Invitation sent to ${user.email}` };
  }

  async listUsers(
    companyId: string,
    options: { role?: UserRole; isActive?: boolean; page?: number; limit?: number }
  ) {
    return userRepository.findByCompany(companyId, options);
  }

  async getUserById(userId: string, companyId: string): Promise<Partial<IUser>> {
    const user = await User.findOne({
      _id: userId,
      companyId,
    }).select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires');

    if (!user) throw new AppError('User not found', 404);
    return user.toObject({ virtuals: true });
  }

  async updateUser(userId: string, companyId: string, input: UpdateUserInput): Promise<Partial<IUser>> {
    const user = await User.findOne({ _id: userId, companyId });
    if (!user) throw new AppError('User not found', 404);

    const updateData: any = {};
    if (input.firstName) updateData.firstName = input.firstName;
    if (input.lastName) updateData.lastName = input.lastName;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.avatar) updateData.avatar = input.avatar;
    if (input.preferences) {
      for (const [k, v] of Object.entries(input.preferences)) {
        updateData[`preferences.${k}`] = v;
      }
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });
    return this.sanitize(updated!);
  }

  async changeRole(
    targetUserId: string,
    companyId: string,
    newRole: UserRole,
    requesterId: string,
    requesterRole: string
  ): Promise<Partial<IUser>> {
    if (targetUserId === requesterId) {
      throw new AppError('Cannot change your own role', 400);
    }

    const target = await User.findOne({ _id: targetUserId, companyId });
    if (!target) throw new AppError('User not found', 404);

    if (target.role === 'company_admin' && requesterRole !== 'super_admin') {
      throw new AppError('Only super admins can change company admin roles', 403);
    }

    if (newRole === 'company_admin' && requesterRole !== 'super_admin') {
      throw new AppError('Only super admins can promote to company admin', 403);
    }

    const updated = await User.findByIdAndUpdate(
      targetUserId,
      { $set: { role: newRole } },
      { new: true }
    );

    logger.info('Role changed', { targetUserId, newRole, changedBy: requesterId });
    return this.sanitize(updated!);
  }

  async deactivateUser(userId: string, companyId: string, requesterId: string): Promise<void> {
    if (userId === requesterId) throw new AppError('Cannot deactivate your own account', 400);

    const user = await User.findOne({ _id: userId, companyId });
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'super_admin') throw new AppError('Cannot deactivate super admin', 403);

    await User.findByIdAndUpdate(userId, { isActive: false });
    await tenantService.refreshUsageMetrics(companyId);
    logger.info('User deactivated', { userId, companyId });
  }

  async reactivateUser(userId: string, companyId: string): Promise<void> {
    await tenantService.assertUserLimit(companyId);

    const user = await User.findOne({ _id: userId, companyId });
    if (!user) throw new AppError('User not found', 404);

    await User.findByIdAndUpdate(userId, { isActive: true });
    await tenantService.refreshUsageMetrics(companyId);
    logger.info('User reactivated', { userId, companyId });
  }

  async updateOwnProfile(userId: string, input: UpdateUserInput): Promise<Partial<IUser>> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const updateData: any = {};
    if (input.firstName) updateData.firstName = input.firstName;
    if (input.lastName) updateData.lastName = input.lastName;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.avatar) updateData.avatar = input.avatar;
    if (input.preferences) {
      for (const [k, v] of Object.entries(input.preferences)) {
        updateData[`preferences.${k}`] = v;
      }
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });
    return this.sanitize(updated!);
  }

  async getCompanyStats(companyId: string) {
    const stats = await User.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          byRole: {
            $push: {
              role: '$role',
              isActive: '$isActive',
            },
          },
        },
      },
    ]);

    if (!stats.length) return { total: 0, active: 0, inactive: 0, byRole: {} };

    const { total, active, byRole } = stats[0];
    const roleCounts: Record<string, number> = {};
    for (const u of byRole) {
      if (u.isActive) roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    }

    return { total, active, inactive: total - active, byRole: roleCounts };
  }
}

export const usersService = new UsersService();
