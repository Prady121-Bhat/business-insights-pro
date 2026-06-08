import { AppError } from '../../middleware/errorHandler.middleware';

// Mock all external deps before importing auth service
jest.mock('../../models/User.model', () => ({
  User: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../models/Company.model', () => ({
  Company: {
    findById: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
  },
}));

jest.mock('../../models/RefreshToken.model', () => ({
  RefreshToken: {
    create: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../models/Settings.model', () => ({ Settings: { create: jest.fn() } }));
jest.mock('../../models/Subscription.model', () => ({ Subscription: { create: jest.fn() } }));

jest.mock('../../services/email.service', () => ({
  emailService: {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../config/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

import { User } from '../../models/User.model';
import { Company } from '../../models/Company.model';
import { RefreshToken } from '../../models/RefreshToken.model';
import { authService } from '../../modules/auth/auth.service';

const mockUser = {
  _id: { toString: () => 'user-id-123' },
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
  role: 'company_admin',
  companyId: { toString: () => 'company-id-456' },
  isActive: true,
  isEmailVerified: true,
  isLocked: false,
  loginAttempts: 0,
  comparePassword: jest.fn(),
  incrementLoginAttempts: jest.fn(),
  toObject: jest.fn().mockReturnValue({ _id: 'user-id-123', email: 'john@test.com' }),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthService', () => {
  describe('register', () => {
    it('throws 409 when email already registered', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ _id: 'existing' });

      await expect(authService.register({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@test.com',
        password: 'Password1!',
      })).rejects.toThrow(AppError);
    });

    it('creates company and user on new registration', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (Company.exists as jest.Mock).mockResolvedValue(null);
      (Company.create as jest.Mock).mockResolvedValue({ _id: 'co-id' });
      (User.create as jest.Mock).mockResolvedValue({ _id: 'usr-id', email: 'new@test.com', firstName: 'New' });

      const result = await authService.register({
        firstName: 'New',
        lastName: 'User',
        email: 'new@test.com',
        password: 'Password1!',
        companyName: 'Acme Corp',
      });

      expect(Company.create).toHaveBeenCalledTimes(1);
      expect(User.create).toHaveBeenCalledTimes(1);
      expect(result.message).toContain('Registration successful');
    });
  });

  describe('login', () => {
    it('throws 401 for non-existent user', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.login({ email: 'ghost@test.com', password: 'pass' }))
        .rejects.toThrow(AppError);
    });

    it('throws 423 for locked account', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ ...mockUser, isLocked: true });

      await expect(authService.login({ email: 'john@test.com', password: 'pass' }))
        .rejects.toThrow(AppError);
    });

    it('throws 401 for wrong password', async () => {
      mockUser.comparePassword.mockResolvedValue(false);
      mockUser.incrementLoginAttempts.mockResolvedValue(undefined);
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(authService.login({ email: 'john@test.com', password: 'wrong' }))
        .rejects.toThrow(AppError);
    });

    it('returns tokens on valid credentials', async () => {
      mockUser.comparePassword.mockResolvedValue(true);
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
      (RefreshToken.create as jest.Mock).mockResolvedValue({});
      (Company.findById as jest.Mock).mockResolvedValue({
        _id: 'co-id',
        toObject: () => ({ name: 'Acme' }),
      });

      const result = await authService.login({ email: 'john@test.com', password: 'correct' });

      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      (RefreshToken.findOneAndUpdate as jest.Mock).mockResolvedValue({});
      await authService.logout('some-raw-token');
      expect(RefreshToken.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('forgotPassword', () => {
    it('silently succeeds for non-existent email (security)', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      await expect(authService.forgotPassword('ghost@test.com')).resolves.toBeUndefined();
    });

    it('sends reset email for existing user', async () => {
      const { emailService } = await import('../../services/email.service');
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await authService.forgotPassword('john@test.com');

      expect(emailService.sendPasswordReset).toHaveBeenCalledTimes(1);
    });
  });
});
