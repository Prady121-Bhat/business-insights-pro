import { Types } from 'mongoose';
import { Product, IProduct } from '../models/Product.model';
import { Sale } from '../models/Sale.model';
import { BaseRepository } from './base.repository';

class ProductRepository extends BaseRepository<IProduct> {
  constructor() {
    super(Product);
  }

  async findByCompany(
    companyId: string,
    opts: { category?: string; velocityCategory?: string; lowStock?: boolean; outOfStock?: boolean; page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ) {
    const filter: any = { companyId: new Types.ObjectId(companyId), isActive: true };
    if (opts.category) filter.category = opts.category;
    if (opts.velocityCategory) filter['metrics.velocityCategory'] = opts.velocityCategory;
    if (opts.outOfStock) filter['inventory.currentStock'] = 0;
    if (opts.lowStock) {
      filter.$expr = { $and: [{ $gt: ['$inventory.currentStock', 0] }, { $lte: ['$inventory.currentStock', '$inventory.reorderPoint'] }] };
    }
    if (opts.search) {
      const re = new RegExp(opts.search, 'i');
      filter.$or = [{ name: re }, { sku: re }, { category: re }, { brand: re }];
    }

    const sortMap: Record<string, string> = {
      stock: 'inventory.currentStock',
      revenue: 'metrics.totalRevenue',
      sold: 'metrics.totalSold',
      margin: 'pricing.margin',
      name: 'name',
    };
    const sortField = sortMap[opts.sortBy ?? 'revenue'] ?? 'metrics.totalRevenue';
    const sortDir = opts.sortOrder === 'asc' ? 1 : -1;

    return this.findPaginated(filter, { page: opts.page, limit: opts.limit, sort: { [sortField]: sortDir } });
  }

  async getCategories(companyId: string): Promise<string[]> {
    return Product.distinct('category', { companyId, isActive: true });
  }

  async getVelocityBreakdown(companyId: string) {
    return Product.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), isActive: true } },
      {
        $group: {
          _id: '$metrics.velocityCategory',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$metrics.totalRevenue' },
          totalStock: { $sum: '$inventory.currentStock' },
          totalCostValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
  }

  async getInventoryValuation(companyId: string) {
    return Product.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), isActive: true } },
      {
        $group: {
          _id: '$category',
          costValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } },
          retailValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.sellingPrice'] } },
          units: { $sum: '$inventory.currentStock' },
          productCount: { $sum: 1 },
        },
      },
      { $sort: { costValue: -1 } },
    ]);
  }

  async getLowStockProducts(companyId: string, limit = 20): Promise<IProduct[]> {
    return Product.find({
      companyId,
      isActive: true,
      $expr: { $and: [{ $gt: ['$inventory.currentStock', 0] }, { $lte: ['$inventory.currentStock', '$inventory.reorderPoint'] }] },
    })
      .sort({ 'inventory.currentStock': 1 })
      .limit(limit)
      .lean() as unknown as Promise<IProduct[]>;
  }

  async getDeadInventory(companyId: string, limit = 20): Promise<IProduct[]> {
    return Product.find({
      companyId,
      isActive: true,
      'metrics.velocityCategory': 'dead',
      'inventory.currentStock': { $gt: 0 },
    })
      .sort({ 'inventory.currentStock': -1 })
      .limit(limit)
      .lean() as unknown as Promise<IProduct[]>;
  }

  async computeSaleVelocity(companyId: string): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const salesLast30 = await Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          saleDate: { $gte: thirtyDaysAgo },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          qty30: { $sum: '$items.quantity' },
          rev30: { $sum: '$items.total' },
          lastSold: { $max: '$$ROOT.saleDate' },
        },
      },
    ]);

    const salesLast90 = await Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          saleDate: { $gte: ninetyDaysAgo },
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          qty90: { $sum: '$items.quantity' },
          rev90: { $sum: '$items.total' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const map30 = new Map(salesLast30.map((s) => [s._id.toString(), s]));
    const map90 = new Map(salesLast90.map((s) => [s._id.toString(), s]));

    const products = await Product.find({ companyId, isActive: true }).select('_id inventory pricing').lean();

    const updates: Promise<any>[] = [];
    for (const p of products) {
      const id = (p._id as Types.ObjectId).toString();
      const s30 = map30.get(id);
      const s90 = map90.get(id);

      const monthlySales = s30?.qty30 ?? 0;
      const avgMonthlySales = s90?.qty90 ? s90.qty90 / 3 : 0;

      let velocityCategory: string;
      if (monthlySales >= 20) velocityCategory = 'fast';
      else if (monthlySales >= 5) velocityCategory = 'medium';
      else if (monthlySales >= 1) velocityCategory = 'slow';
      else velocityCategory = 'dead';

      const stock = p.inventory?.currentStock ?? 0;
      const daysOfInventory = avgMonthlySales > 0 ? (stock / (avgMonthlySales / 30)) : 9999;
      const turnoverRate = s90?.rev90 && p.pricing?.costPrice
        ? s90.rev90 / (stock * (p.pricing.costPrice || 1))
        : 0;

      const stockoutDate = avgMonthlySales > 0 && stock > 0
        ? new Date(Date.now() + (stock / (avgMonthlySales / 30)) * 24 * 60 * 60 * 1000)
        : undefined;

      const stockoutScore = daysOfInventory < 7 ? 90 :
        daysOfInventory < 14 ? 70 :
        daysOfInventory < 30 ? 50 :
        daysOfInventory < 60 ? 25 : 5;

      updates.push(
        Product.findByIdAndUpdate(p._id, {
          $set: {
            'metrics.totalSold': s90?.qty90 ?? 0,
            'metrics.totalRevenue': s90?.rev90 ?? 0,
            'metrics.averageMonthlySales': avgMonthlySales,
            'metrics.velocityCategory': velocityCategory,
            'metrics.daysOfInventory': Math.round(daysOfInventory),
            'metrics.turnoverRate': Math.round(turnoverRate * 100) / 100,
            ...(s30?.lastSold ? { 'metrics.lastSoldAt': s30.lastSold } : {}),
            'stockoutRisk.score': stockoutScore,
            ...(stockoutDate ? { 'stockoutRisk.predictedStockoutDate': stockoutDate } : {}),
            'stockoutRisk.lastCalculated': new Date(),
          },
        })
      );
    }

    await Promise.all(updates);
  }
}

export const productRepository = new ProductRepository();
