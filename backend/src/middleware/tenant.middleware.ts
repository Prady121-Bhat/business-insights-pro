import { Request, Response, NextFunction } from 'express';
import { Company } from '../models/Company.model';
import { AppError } from './errorHandler.middleware';

export const requireTenant = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  if (req.user.role === 'super_admin') {
    req.tenantId = req.headers['x-company-id'] as string | undefined || undefined;
    return next();
  }

  if (!req.user.companyId) {
    throw new AppError('No company associated with this account', 403);
  }

  const company = await Company.findOne({
    _id: req.user.companyId,
    isActive: true,
  });

  if (!company) {
    throw new AppError('Company not found or deactivated', 403);
  }

  if (
    company.subscription.status === 'cancelled' ||
    (company.subscription.status === 'trialing' &&
      company.subscription.trialEndsAt &&
      company.subscription.trialEndsAt < new Date())
  ) {
    throw new AppError('Subscription expired. Please renew to continue.', 402);
  }

  req.company = company;
  req.tenantId = company._id.toString();
  next();
};

export const injectTenantId = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user?.companyId) {
    req.tenantId = req.user.companyId;
  }
  next();
};
