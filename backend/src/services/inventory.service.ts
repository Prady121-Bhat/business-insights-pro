import { Types } from 'mongoose';
import { Product } from '../models/Product.model';
import { productRepository } from '../repositories/product.repository';
import { cacheService } from './cache.service';

const CACHE_TTL = 10 * 60 * 1000; // 10 min in ms

export class InventoryService {
  async getInventoryOverview(companyId: string) {
    const cacheKey = `inventory:overview:${companyId}`;
    return cacheService.getOrSet(cacheKey, async () => {
      const [summary, valuation, velocity] = await Promise.all([
        this._getStockSummary(companyId),
        productRepository.getInventoryValuation(companyId),
        productRepository.getVelocityBreakdown(companyId),
      ]);
      return { summary, valuation, velocity };
    });
  }

  private async _getStockSummary(companyId: string) {
    const result = await Product.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: '$inventory.currentStock' },
          totalCostValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } },
          totalRetailValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.sellingPrice'] } },
          outOfStock: { $sum: { $cond: [{ $eq: ['$inventory.currentStock', 0] }, 1, 0] } },
          lowStock: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$inventory.currentStock', 0] },
                    { $lte: ['$inventory.currentStock', '$inventory.reorderPoint'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          deadInventoryUnits: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$metrics.velocityCategory', 'dead'] },
                    { $gt: ['$inventory.currentStock', 0] },
                  ],
                },
                '$inventory.currentStock',
                0,
              ],
            },
          },
          deadInventoryCost: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$metrics.velocityCategory', 'dead'] },
                    { $gt: ['$inventory.currentStock', 0] },
                  ],
                },
                { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] },
                0,
              ],
            },
          },
          avgTurnoverRate: { $avg: '$metrics.turnoverRate' },
          avgDaysOfInventory: { $avg: '$metrics.daysOfInventory' },
        },
      },
    ]);
    return result[0] ?? {
      totalProducts: 0, totalUnits: 0, totalCostValue: 0, totalRetailValue: 0,
      outOfStock: 0, lowStock: 0, deadInventoryUnits: 0, deadInventoryCost: 0,
      avgTurnoverRate: 0, avgDaysOfInventory: 0,
    };
  }

  async getStockoutPredictions(companyId: string) {
    const cacheKey = `inventory:stockout:${companyId}`;
    return cacheService.getOrSet(cacheKey, async () => {
      return Product.find({
        companyId,
        isActive: true,
        'inventory.currentStock': { $gt: 0 },
        'metrics.daysOfInventory': { $lte: 30 },
      })
        .sort({ 'metrics.daysOfInventory': 1 })
        .limit(20)
        .select('name sku category inventory.currentStock metrics.daysOfInventory metrics.averageMonthlySales stockoutRisk pricing')
        .lean();
    });
  }

  async getReorderRecommendations(companyId: string) {
    const cacheKey = `inventory:reorder:${companyId}`;
    return cacheService.getOrSet(cacheKey, async () => {
      const products = await Product.find({
        companyId,
        isActive: true,
        $expr: { $lte: ['$inventory.currentStock', '$inventory.reorderPoint'] },
      })
        .sort({ 'inventory.currentStock': 1 })
        .limit(50)
        .lean();

      return products.map((p: any) => {
        const currentStock = p.inventory?.currentStock ?? 0;
        const reorderPoint = p.inventory?.reorderPoint ?? 0;
        const reorderQuantity = p.inventory?.reorderQuantity ?? 0;
        const avgMonthlySales = p.metrics?.averageMonthlySales ?? 0;
        const urgency = currentStock === 0 ? 'critical' : currentStock <= reorderPoint * 0.5 ? 'high' : 'medium';
        const suggestedOrderQty = Math.max(reorderQuantity, Math.ceil(avgMonthlySales * 2));
        const estimatedCost = suggestedOrderQty * (p.pricing?.costPrice ?? 0);

        return {
          _id: p._id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          currentStock,
          reorderPoint,
          suggestedOrderQty,
          urgency,
          estimatedCost,
          daysUntilStockout: p.metrics?.daysOfInventory ?? 0,
          avgMonthlySales: Math.round(avgMonthlySales),
        };
      });
    });
  }

  async getLowStockAlerts(companyId: string) {
    const cacheKey = `inventory:lowstock:${companyId}`;
    return cacheService.getOrSet(cacheKey, async () => {
      return productRepository.getLowStockProducts(companyId, 25);
    });
  }

  async getDeadInventory(companyId: string) {
    const cacheKey = `inventory:dead:${companyId}`;
    return cacheService.getOrSet(cacheKey, async () => {
      return productRepository.getDeadInventory(companyId, 25);
    });
  }

  async computeVelocity(companyId: string) {
    await productRepository.computeSaleVelocity(companyId);
    cacheService.invalidateTenant(companyId);
  }

  async adjustStock(companyId: string, productId: string, adjustment: number, reason?: string) {
    const product = await Product.findOne({ _id: productId, companyId });
    if (!product) return null;
    const newStock = Math.max(0, (product.inventory?.currentStock ?? 0) + adjustment);
    product.inventory.currentStock = newStock;
    await product.save();
    cacheService.invalidateTenant(companyId);
    return product;
  }
}

export const inventoryService = new InventoryService();
