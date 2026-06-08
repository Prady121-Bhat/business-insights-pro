import { Types } from 'mongoose';
import { User, IUser, UserRole } from '../models/User.model';
import { BaseRepository } from './base.repository';

class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).exec();
  }

  async findByCompany(
    companyId: string | Types.ObjectId,
    options?: { role?: UserRole; isActive?: boolean; page?: number; limit?: number }
  ) {
    const filter: any = { companyId };
    if (options?.role) filter.role = options.role;
    if (options?.isActive !== undefined) filter.isActive = options.isActive;

    return this.findPaginated(filter, {
      page: options?.page,
      limit: options?.limit,
      sort: { createdAt: -1 },
      select: '-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires',
    });
  }

  async countByCompany(companyId: string | Types.ObjectId): Promise<number> {
    return User.countDocuments({ companyId, isActive: true }).exec();
  }

  async findActiveByCompany(companyId: string | Types.ObjectId): Promise<IUser[]> {
    return User.find({ companyId, isActive: true })
      .select('_id firstName lastName email role avatar lastLoginAt')
      .sort({ firstName: 1 })
      .exec();
  }
}

export const userRepository = new UserRepository();
