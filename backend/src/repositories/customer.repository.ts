import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer.model';
import { Sale } from '../models/Sale.model';
import { BaseRepository } from './base.repository';

class CustomerRepository extends BaseRepository<ICustomer> {
  constructor() {
    super(Customer);
  }

  async getCustomerGrowthTrend(companyId: string, startDate: Date, endDate: Date) {
    return Customer.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          newCustomers: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
  }

  async getSegmentDistribution(companyId: string) {
    return Customer.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), isActive: true } },
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$metrics.totalRevenue' },
          avgLifetimeValue: { $avg: '$metrics.lifetimeValue' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async getRetentionByMonth(companyId: string, months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          saleDate: { $gte: startDate },
          status: { $nin: ['cancelled', 'refunded'] },
          customerId: { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$saleDate' },
            month: { $month: '$saleDate' },
          },
          uniqueCustomers: { $addToSet: '$customerId' },
        },
      },
      {
        $project: {
          _id: 1,
          customerCount: { $size: '$uniqueCustomers' },
          customers: '$uniqueCustomers',
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
  }

  async getTopCustomers(companyId: string, limit = 10) {
    return Customer.find({ companyId, isActive: true })
      .sort({ 'metrics.totalRevenue': -1 })
      .limit(limit)
      .select('firstName lastName email segment metrics churnRisk')
      .exec();
  }

  async getChurnRiskDistribution(companyId: string) {
    return Customer.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), isActive: true } },
      {
        $group: {
          _id: '$churnRisk.level',
          count: { $sum: 1 },
          avgRevenue: { $avg: '$metrics.totalRevenue' },
        },
      },
    ]);
  }

  async getCohortData(companyId: string, cohortMonths = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - cohortMonths);

    return Customer.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          'metrics.firstPurchaseDate': { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            cohortYear: { $year: '$metrics.firstPurchaseDate' },
            cohortMonth: { $month: '$metrics.firstPurchaseDate' },
          },
          cohortSize: { $sum: 1 },
          avgOrders: { $avg: '$metrics.totalOrders' },
          avgRevenue: { $avg: '$metrics.totalRevenue' },
        },
      },
      { $sort: { '_id.cohortYear': 1, '_id.cohortMonth': 1 } },
    ]);
  }
}

export const customerRepository = new CustomerRepository();
