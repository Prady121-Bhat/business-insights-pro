import { Types } from 'mongoose';
import { Customer, ICustomer } from '../../models/Customer.model';
import { Sale } from '../../models/Sale.model';
import { customerRepository } from '../../repositories/customer.repository';
import { rfmService } from '../../services/rfm.service';
import { clvService } from '../../services/clv.service';
import { churnService } from '../../services/churn.service';
import { cacheService } from '../../services/cache.service';
import { buildTenantFilter, parsePagination } from '../../utils/tenant.utils';
import { AppError } from '../../middleware/errorHandler.middleware';
import { generateEntityNumber } from '../../utils/crypto.utils';
import { logger } from '../../config/logger';

interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  customerId?: string;
  address?: Partial<ICustomer['address']>;
  tags?: string[];
  notes?: string;
}

interface ListOptions {
  page?: number;
  limit?: number;
  segment?: string;
  churnRisk?: 'low' | 'medium' | 'high';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class CustomersService {
  async create(companyId: string, input: CreateCustomerInput, createdBy: string) {
    if (input.email) {
      const exists = await Customer.findOne({ companyId, email: input.email });
      if (exists) throw new AppError('Customer with this email already exists', 409);
    }

    const count = await Customer.countDocuments({ companyId });
    const customerId = input.customerId || generateEntityNumber('CUS', count);

    const existing = await Customer.findOne({ companyId, customerId });
    if (existing) throw new AppError('Customer ID already in use', 409);

    const customer = await Customer.create({
      companyId,
      ...input,
      customerId,
    });

    cacheService.invalidateTenant(companyId);
    return customer;
  }

  async list(companyId: string, opts: ListOptions) {
    const { page = 1, limit = 20 } = opts;
    const filter: any = buildTenantFilter(companyId, { isActive: true });

    if (opts.segment) filter.segment = opts.segment;
    if (opts.churnRisk) filter['churnRisk.level'] = opts.churnRisk;
    if (opts.search) {
      const re = new RegExp(opts.search, 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { customerId: re }, { company: re }];
    }

    const sortMap: Record<string, string> = {
      totalRevenue: 'metrics.totalRevenue',
      totalOrders: 'metrics.totalOrders',
      lastPurchaseDate: 'metrics.lastPurchaseDate',
      lifetimeValue: 'metrics.lifetimeValue',
      churnRisk: 'churnRisk.score',
    };

    const sortField = sortMap[opts.sortBy ?? 'totalRevenue'] ?? 'metrics.totalRevenue';
    const sortDir = opts.sortOrder === 'asc' ? 1 : -1;

    return customerRepository.findPaginated(filter, {
      page,
      limit,
      sort: { [sortField]: sortDir },
      select: '-__v',
    });
  }

  async getById(customerId: string, companyId: string) {
    const customer = await Customer.findOne({
      _id: customerId,
      companyId,
      isActive: true,
    });
    if (!customer) throw new AppError('Customer not found', 404);
    return customer;
  }

  async update(customerId: string, companyId: string, input: Partial<CreateCustomerInput> & { segment?: string }) {
    const customer = await Customer.findOne({ _id: customerId, companyId });
    if (!customer) throw new AppError('Customer not found', 404);

    if (input.email && input.email !== customer.email) {
      const exists = await Customer.findOne({ companyId, email: input.email, _id: { $ne: customerId } });
      if (exists) throw new AppError('Email already in use by another customer', 409);
    }

    const updated = await Customer.findByIdAndUpdate(
      customerId,
      { $set: input },
      { new: true, runValidators: true }
    );

    cacheService.invalidateTenant(companyId);
    return updated!;
  }

  async delete(customerId: string, companyId: string) {
    const customer = await Customer.findOne({ _id: customerId, companyId });
    if (!customer) throw new AppError('Customer not found', 404);
    await Customer.findByIdAndUpdate(customerId, { isActive: false });
    cacheService.invalidateTenant(companyId);
  }

  async getCustomerSales(customerId: string, companyId: string, page = 1, limit = 20) {
    const customer = await Customer.findOne({ _id: customerId, companyId });
    if (!customer) throw new AppError('Customer not found', 404);

    const skip = (page - 1) * limit;
    const [sales, total] = await Promise.all([
      Sale.find({ customerId, companyId })
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit)
        .select('saleNumber saleDate summary.grandTotal status paymentStatus channel items'),
      Sale.countDocuments({ customerId, companyId }),
    ]);

    return {
      data: sales,
      pagination: {
        page, limit, total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async runRFMAnalysis(companyId: string) {
    const result = await rfmService.computeAndSave(companyId);
    cacheService.invalidateTenant(companyId);
    return result;
  }

  async runCLVAnalysis(companyId: string) {
    const result = await clvService.computeAndSave(companyId);
    cacheService.invalidateTenant(companyId);
    return result;
  }

  async runChurnAnalysis(companyId: string) {
    const result = await churnService.computeAndSave(companyId);
    cacheService.invalidateTenant(companyId);
    return result;
  }

  async runAllAnalytics(companyId: string) {
    const [rfm, clv, churn] = await Promise.all([
      rfmService.computeAndSave(companyId),
      clvService.computeAndSave(companyId),
      churnService.computeAndSave(companyId),
    ]);
    cacheService.invalidateTenant(companyId);
    logger.info('All customer analytics computed', { companyId });
    return { rfm, clv, churn };
  }

  async getRFMData(companyId: string) {
    const cacheKey = cacheService.buildKey('analytics', companyId, 'rfm');
    return cacheService.getOrSet(cacheKey, async () => {
      const [distribution, topCustomers] = await Promise.all([
        rfmService.getRFMDistribution(companyId),
        rfmService.getTopRFMCustomers(companyId, 20),
      ]);
      return { distribution, topCustomers };
    }, 15 * 60 * 1000);
  }

  async getCLVData(companyId: string) {
    const cacheKey = cacheService.buildKey('analytics', companyId, 'clv');
    return cacheService.getOrSet(cacheKey, async () => {
      const [distribution, topCustomers] = await Promise.all([
        clvService.getCLVDistribution(companyId),
        clvService.getTopCLVCustomers(companyId, 20),
      ]);
      return { distribution, topCustomers };
    }, 15 * 60 * 1000);
  }

  async getChurnData(companyId: string) {
    const cacheKey = cacheService.buildKey('analytics', companyId, 'churn');
    return cacheService.getOrSet(cacheKey, async () => {
      const [summary, atRisk] = await Promise.all([
        churnService.getChurnSummary(companyId),
        churnService.getChurnRiskCustomers(companyId, undefined, 50),
      ]);
      return { summary, atRisk };
    }, 15 * 60 * 1000);
  }

  async getCohortAnalysis(companyId: string, months = 6) {
    const cacheKey = cacheService.buildKey('analytics', companyId, 'cohort-detail', months);
    return cacheService.getOrSet(cacheKey, () =>
      customerRepository.getCohortData(companyId, months),
      15 * 60 * 1000
    );
  }

  async getRetentionCurve(companyId: string, months = 12) {
    return customerRepository.getRetentionByMonth(companyId, months);
  }

  async getSegmentSummary(companyId: string) {
    const cacheKey = cacheService.buildKey('analytics', companyId, 'segment-summary');
    return cacheService.getOrSet(cacheKey, () =>
      customerRepository.getSegmentDistribution(companyId),
      10 * 60 * 1000
    );
  }
}

export const customersService = new CustomersService();
