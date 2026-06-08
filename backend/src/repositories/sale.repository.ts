import { Types } from 'mongoose';
import { Sale, ISale } from '../models/Sale.model';
import { BaseRepository } from './base.repository';

class SaleRepository extends BaseRepository<ISale> {
  constructor() {
    super(Sale);
  }

  async getRevenueSummary(companyId: string, startDate: Date, endDate: Date) {
    return Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          saleDate: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$summary.grandTotal' },
          totalProfit: { $sum: '$summary.grossProfit' },
          totalCost: { $sum: '$summary.totalCost' },
          totalDiscount: { $sum: '$summary.totalDiscount' },
          totalTax: { $sum: '$summary.totalTax' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$summary.grandTotal' },
        },
      },
    ]);
  }

  async getRevenueTrend(
    companyId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month' | 'year'
  ) {
    const groupId: Record<string, any> = {
      year: { $year: '$saleDate' },
    };
    if (granularity !== 'year') groupId.month = { $month: '$saleDate' };
    if (granularity === 'day' || granularity === 'week') groupId.day = { $dayOfMonth: '$saleDate' };
    if (granularity === 'week') groupId.week = { $week: '$saleDate' };

    return Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          saleDate: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      {
        $group: {
          _id: groupId,
          revenue: { $sum: '$summary.grandTotal' },
          profit: { $sum: '$summary.grossProfit' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$summary.grandTotal' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
  }

  async getTopProducts(companyId: string, startDate: Date, endDate: Date, limit = 10) {
    return Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          saleDate: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          sku: { $first: '$items.sku' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
          profit: { $sum: '$items.profit' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);
  }

  async getSalesByChannel(companyId: string, startDate: Date, endDate: Date) {
    return Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          saleDate: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      {
        $group: {
          _id: '$channel',
          revenue: { $sum: '$summary.grandTotal' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$summary.grandTotal' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
  }

  async getSalesByCategory(companyId: string, startDate: Date, endDate: Date) {
    return Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          saleDate: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$product.category',
          revenue: { $sum: '$items.total' },
          quantity: { $sum: '$items.quantity' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
  }

  async getHourlyHeatmap(companyId: string, startDate: Date, endDate: Date) {
    return Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          saleDate: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$saleDate' },
            hour: { $hour: '$saleDate' },
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$summary.grandTotal' },
        },
      },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
    ]);
  }
}

export const saleRepository = new SaleRepository();
