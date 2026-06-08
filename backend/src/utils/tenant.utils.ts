import { Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler.middleware';

export const toObjectId = (id: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(id)) throw new AppError('Invalid ID', 400);
  return new Types.ObjectId(id);
};

export const buildTenantFilter = (
  companyId: string | undefined,
  extra: Record<string, any> = {}
): Record<string, any> => {
  if (!companyId) throw new AppError('Tenant context missing', 500);
  return { companyId: toObjectId(companyId), ...extra };
};

export const assertSameTenant = (
  resourceCompanyId: string | Types.ObjectId | undefined,
  requestCompanyId: string | undefined
): void => {
  if (!resourceCompanyId || !requestCompanyId) throw new AppError('Tenant mismatch', 403);
  if (resourceCompanyId.toString() !== requestCompanyId) {
    throw new AppError('Access denied: resource belongs to another tenant', 403);
  }
};

export const parsePagination = (
  query: Record<string, any>,
  defaults = { page: 1, limit: 20, maxLimit: 100 }
) => {
  const page = Math.max(1, parseInt(query.page) || defaults.page);
  const limit = Math.min(defaults.maxLimit, Math.max(1, parseInt(query.limit) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit };
};

export const parseDateRange = (query: Record<string, any>): { startDate?: Date; endDate?: Date } => {
  const result: { startDate?: Date; endDate?: Date } = {};
  if (query.startDate) result.startDate = new Date(query.startDate);
  if (query.endDate) {
    const end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);
    result.endDate = end;
  }
  return result;
};

export const buildDateRangeFilter = (startDate?: Date, endDate?: Date, field = 'createdAt') => {
  const filter: Record<string, any> = {};
  if (startDate || endDate) {
    filter[field] = {};
    if (startDate) filter[field].$gte = startDate;
    if (endDate) filter[field].$lte = endDate;
  }
  return filter;
};
