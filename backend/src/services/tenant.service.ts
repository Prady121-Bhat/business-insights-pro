import { Types } from 'mongoose';
import { Company } from '../models/Company.model';
import { User } from '../models/User.model';
import { Subscription } from '../models/Subscription.model';
import { Settings } from '../models/Settings.model';
import { AppError } from '../middleware/errorHandler.middleware';

const PLAN_LIMITS = {
  starter:      { maxUsers: 5,         maxDataRows: 50_000,    maxReports: 10,  forecastHorizonDays: 30,  apiAccess: false, customBranding: false, scheduledReports: false, advancedAnalytics: false },
  professional: { maxUsers: 25,        maxDataRows: 500_000,   maxReports: 100, forecastHorizonDays: 90,  apiAccess: true,  customBranding: false, scheduledReports: true,  advancedAnalytics: true  },
  enterprise:   { maxUsers: 999_999,   maxDataRows: 999_999_999, maxReports: 999_999, forecastHorizonDays: 365, apiAccess: true, customBranding: true, scheduledReports: true, advancedAnalytics: true },
};

class TenantService {
  async assertUserLimit(companyId: string): Promise<void> {
    const [sub, currentUsers] = await Promise.all([
      Subscription.findOne({ companyId }),
      User.countDocuments({ companyId, isActive: true }),
    ]);
    if (!sub) throw new AppError('Subscription not found', 404);
    if (currentUsers >= sub.limits.maxUsers) {
      throw new AppError(
        `User limit reached (${sub.limits.maxUsers}). Upgrade your plan to add more users.`,
        402
      );
    }
  }

  async assertFeatureAccess(companyId: string, feature: keyof typeof PLAN_LIMITS['starter']): Promise<void> {
    const sub = await Subscription.findOne({ companyId });
    if (!sub) throw new AppError('Subscription not found', 404);
    if (!sub.limits[feature as keyof typeof sub.limits]) {
      throw new AppError(`Feature not available on your plan. Upgrade to access this.`, 402);
    }
  }

  async getCompanyContext(companyId: string) {
    const [company, subscription, settings] = await Promise.all([
      Company.findById(companyId),
      Subscription.findOne({ companyId }),
      Settings.findOne({ companyId }),
    ]);
    if (!company) throw new AppError('Company not found', 404);
    return { company, subscription, settings };
  }

  async upgradePlan(companyId: string, plan: 'starter' | 'professional' | 'enterprise'): Promise<void> {
    const limits = PLAN_LIMITS[plan];
    await Promise.all([
      Company.findByIdAndUpdate(companyId, { 'subscription.plan': plan, 'subscription.status': 'active' }),
      Subscription.findOneAndUpdate(
        { companyId },
        {
          plan,
          status: 'active',
          limits,
          'billing.amount': plan === 'starter' ? 49 : plan === 'professional' ? 149 : 499,
        },
        { new: true }
      ),
    ]);
  }

  async refreshUsageMetrics(companyId: string): Promise<void> {
    const currentUsers = await User.countDocuments({ companyId, isActive: true });
    await Subscription.findOneAndUpdate(
      { companyId },
      {
        'usage.currentUsers': currentUsers,
        'usage.lastCalculated': new Date(),
      }
    );
  }

  buildTenantFilter(companyId: string | undefined, extraFilter: Record<string, any> = {}): Record<string, any> {
    if (!companyId) throw new AppError('Tenant context missing', 500);
    return { companyId: new Types.ObjectId(companyId), ...extraFilter };
  }
}

export const tenantService = new TenantService();
