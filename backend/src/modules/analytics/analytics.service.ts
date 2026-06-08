import { Types } from 'mongoose';
import { Sale } from '../../models/Sale.model';
import { Customer } from '../../models/Customer.model';
import { Product } from '../../models/Product.model';
import { Expense } from '../../models/Expense.model';
import { saleRepository } from '../../repositories/sale.repository';
import { customerRepository } from '../../repositories/customer.repository';
import { expenseRepository } from '../../repositories/expense.repository';
import { cacheService } from '../../services/cache.service';
import { parseDateRange } from '../../utils/tenant.utils';

type Granularity = 'day' | 'week' | 'month' | 'year';

const DEFAULT_DAYS = 30;

function getDefaultRange(days = DEFAULT_DAYS): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

function getPreviousPeriod(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
  const diff = endDate.getTime() - startDate.getTime();
  return {
    startDate: new Date(startDate.getTime() - diff),
    endDate: new Date(startDate.getTime() - 1),
  };
}

function calcGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function summarize(raw: any[]) {
  return raw[0] ?? {
    totalRevenue: 0,
    totalProfit: 0,
    totalCost: 0,
    totalDiscount: 0,
    totalTax: 0,
    orderCount: 0,
    avgOrderValue: 0,
  };
}

class AnalyticsService {
  async getOverviewKPIs(companyId: string, startDate?: Date, endDate?: Date) {
    const range = startDate && endDate ? { startDate, endDate } : getDefaultRange(30);
    const prev = getPreviousPeriod(range.startDate, range.endDate);

    const cacheKey = cacheService.buildKey(
      'analytics', companyId, 'kpi',
      range.startDate.toISOString(), range.endDate.toISOString()
    );

    return cacheService.getOrSet(cacheKey, async () => {
      const [currentSales, prevSales, currentExpenses, prevExpenses, totalCustomers, newCustomers, prevNewCustomers] =
        await Promise.all([
          saleRepository.getRevenueSummary(companyId, range.startDate, range.endDate),
          saleRepository.getRevenueSummary(companyId, prev.startDate, prev.endDate),
          expenseRepository.getExpenseSummary(companyId, range.startDate, range.endDate),
          expenseRepository.getExpenseSummary(companyId, prev.startDate, prev.endDate),
          Customer.countDocuments({ companyId, isActive: true }),
          Customer.countDocuments({ companyId, createdAt: { $gte: range.startDate, $lte: range.endDate } }),
          Customer.countDocuments({ companyId, createdAt: { $gte: prev.startDate, $lte: prev.endDate } }),
        ]);

      const curr = summarize(currentSales);
      const prev2 = summarize(prevSales);
      const currExp = currentExpenses[0] ?? { totalExpenses: 0 };
      const prevExp = prevExpenses[0] ?? { totalExpenses: 0 };

      const netProfit = curr.totalProfit - currExp.totalExpenses;
      const prevNetProfit = prev2.totalProfit - prevExp.totalExpenses;
      const profitMargin = curr.totalRevenue > 0 ? (curr.totalProfit / curr.totalRevenue) * 100 : 0;

      return {
        period: { startDate: range.startDate, endDate: range.endDate },
        kpis: {
          revenue: {
            value: curr.totalRevenue,
            previousValue: prev2.totalRevenue,
            growth: calcGrowth(curr.totalRevenue, prev2.totalRevenue),
          },
          grossProfit: {
            value: curr.totalProfit,
            previousValue: prev2.totalProfit,
            growth: calcGrowth(curr.totalProfit, prev2.totalProfit),
          },
          netProfit: {
            value: netProfit,
            previousValue: prevNetProfit,
            growth: calcGrowth(netProfit, prevNetProfit),
          },
          expenses: {
            value: currExp.totalExpenses,
            previousValue: prevExp.totalExpenses,
            growth: calcGrowth(currExp.totalExpenses, prevExp.totalExpenses),
          },
          orders: {
            value: curr.orderCount,
            previousValue: prev2.orderCount,
            growth: calcGrowth(curr.orderCount, prev2.orderCount),
          },
          avgOrderValue: {
            value: Number((curr.avgOrderValue || 0).toFixed(2)),
            previousValue: Number((prev2.avgOrderValue || 0).toFixed(2)),
            growth: calcGrowth(curr.avgOrderValue || 0, prev2.avgOrderValue || 0),
          },
          customers: {
            value: totalCustomers,
            newThisPeriod: newCustomers,
            previousNewCustomers: prevNewCustomers,
            growth: calcGrowth(newCustomers, prevNewCustomers),
          },
          profitMargin: {
            value: Number(profitMargin.toFixed(2)),
            label: `${profitMargin.toFixed(1)}%`,
          },
        },
      };
    }, 5 * 60 * 1000);
  }

  async getRevenueTrend(companyId: string, startDate?: Date, endDate?: Date, granularity: Granularity = 'day') {
    const range = startDate && endDate ? { startDate, endDate } : getDefaultRange(30);
    const cacheKey = cacheService.buildKey('analytics', companyId, 'revenue-trend', granularity, range.startDate.toISOString());

    return cacheService.getOrSet(cacheKey, async () => {
      const [trend, categoryBreakdown, channelBreakdown] = await Promise.all([
        saleRepository.getRevenueTrend(companyId, range.startDate, range.endDate, granularity),
        saleRepository.getSalesByCategory(companyId, range.startDate, range.endDate),
        saleRepository.getSalesByChannel(companyId, range.startDate, range.endDate),
      ]);
      return { period: range, granularity, trend, categoryBreakdown, channelBreakdown };
    }, 5 * 60 * 1000);
  }

  async getTopProducts(companyId: string, startDate?: Date, endDate?: Date, limit = 10) {
    const range = startDate && endDate ? { startDate, endDate } : getDefaultRange(30);
    const cacheKey = cacheService.buildKey('analytics', companyId, 'top-products', limit, range.startDate.toISOString());

    return cacheService.getOrSet(cacheKey, () =>
      saleRepository.getTopProducts(companyId, range.startDate, range.endDate, limit),
      5 * 60 * 1000
    );
  }

  async getHeatmap(companyId: string, startDate?: Date, endDate?: Date) {
    const range = startDate && endDate ? { startDate, endDate } : getDefaultRange(30);
    const cacheKey = cacheService.buildKey('analytics', companyId, 'heatmap', range.startDate.toISOString());

    return cacheService.getOrSet(cacheKey, () =>
      saleRepository.getHourlyHeatmap(companyId, range.startDate, range.endDate),
      10 * 60 * 1000
    );
  }

  async getCustomerAnalytics(companyId: string) {
    const cacheKey = cacheService.buildKey('analytics', companyId, 'customers');

    return cacheService.getOrSet(cacheKey, async () => {
      const range = getDefaultRange(365);

      const [
        segmentDist,
        churnRisk,
        topCustomers,
        growth,
        churnCount,
        atRiskCount,
      ] = await Promise.all([
        customerRepository.getSegmentDistribution(companyId),
        customerRepository.getChurnRiskDistribution(companyId),
        customerRepository.getTopCustomers(companyId, 10),
        customerRepository.getCustomerGrowthTrend(companyId, range.startDate, range.endDate),
        Customer.countDocuments({ companyId, segment: 'lost' }),
        Customer.countDocuments({ companyId, 'churnRisk.level': { $in: ['medium', 'high'] } }),
      ]);

      const totalCustomers = await Customer.countDocuments({ companyId, isActive: true });
      const retentionRate = totalCustomers > 0
        ? Number(((1 - churnCount / (totalCustomers + churnCount)) * 100).toFixed(2))
        : 0;

      return {
        totalCustomers,
        retentionRate,
        atRiskCount,
        churnedCount: churnCount,
        segmentDistribution: segmentDist,
        churnRiskDistribution: churnRisk,
        topCustomers,
        growthTrend: growth,
      };
    }, 10 * 60 * 1000);
  }

  async getRetentionAnalysis(companyId: string, months = 12) {
    const cacheKey = cacheService.buildKey('analytics', companyId, 'retention', months);
    return cacheService.getOrSet(cacheKey, () =>
      customerRepository.getRetentionByMonth(companyId, months),
      15 * 60 * 1000
    );
  }

  async getCohortAnalysis(companyId: string, cohortMonths = 6) {
    const cacheKey = cacheService.buildKey('analytics', companyId, 'cohort', cohortMonths);
    return cacheService.getOrSet(cacheKey, () =>
      customerRepository.getCohortData(companyId, cohortMonths),
      15 * 60 * 1000
    );
  }

  async getInventoryAnalytics(companyId: string) {
    const cacheKey = cacheService.buildKey('analytics', companyId, 'inventory');

    return cacheService.getOrSet(cacheKey, async () => {
      const [
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        velocityBreakdown,
        inventoryValue,
        deadInventory,
      ] = await Promise.all([
        Product.countDocuments({ companyId, isActive: true }),
        Product.find({
          companyId,
          isActive: true,
          $expr: {
            $and: [
              { $gt: ['$inventory.currentStock', 0] },
              { $lte: ['$inventory.currentStock', '$inventory.reorderPoint'] },
            ],
          },
        }).select('name sku inventory pricing metrics').limit(20),
        Product.countDocuments({ companyId, isActive: true, 'inventory.currentStock': 0 }),
        Product.aggregate([
          { $match: { companyId: new Types.ObjectId(companyId), isActive: true } },
          { $group: { _id: '$metrics.velocityCategory', count: { $sum: 1 }, totalRevenue: { $sum: '$metrics.totalRevenue' } } },
        ]),
        Product.aggregate([
          { $match: { companyId: new Types.ObjectId(companyId), isActive: true } },
          {
            $group: {
              _id: null,
              totalCostValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } },
              totalRetailValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.sellingPrice'] } },
              totalUnits: { $sum: '$inventory.currentStock' },
            },
          },
        ]),
        Product.find({
          companyId,
          isActive: true,
          'metrics.velocityCategory': 'dead',
          'inventory.currentStock': { $gt: 0 },
        }).select('name sku inventory pricing metrics').limit(20),
      ]);

      const invValue = inventoryValue[0] ?? { totalCostValue: 0, totalRetailValue: 0, totalUnits: 0 };

      return {
        summary: {
          totalProducts,
          outOfStockCount: outOfStockProducts,
          lowStockCount: lowStockProducts.length,
          totalCostValue: invValue.totalCostValue,
          totalRetailValue: invValue.totalRetailValue,
          totalUnits: invValue.totalUnits,
        },
        lowStockProducts,
        deadInventory,
        velocityBreakdown,
      };
    }, 10 * 60 * 1000);
  }

  async getExpenseAnalytics(companyId: string, startDate?: Date, endDate?: Date) {
    const range = startDate && endDate ? { startDate, endDate } : getDefaultRange(30);
    const cacheKey = cacheService.buildKey('analytics', companyId, 'expenses', range.startDate.toISOString());

    return cacheService.getOrSet(cacheKey, async () => {
      const [summary, byCategory, trend] = await Promise.all([
        expenseRepository.getExpenseSummary(companyId, range.startDate, range.endDate),
        expenseRepository.getExpenseByCategory(companyId, range.startDate, range.endDate),
        expenseRepository.getExpenseTrend(companyId, range.startDate, range.endDate),
      ]);
      return {
        period: range,
        summary: summary[0] ?? { totalExpenses: 0, count: 0, avgExpense: 0 },
        byCategory,
        trend,
      };
    }, 5 * 60 * 1000);
  }

  async getProfitAndLoss(companyId: string, startDate?: Date, endDate?: Date) {
    const range = startDate && endDate ? { startDate, endDate } : getDefaultRange(30);
    const prev = getPreviousPeriod(range.startDate, range.endDate);
    const cacheKey = cacheService.buildKey('analytics', companyId, 'pnl', range.startDate.toISOString());

    return cacheService.getOrSet(cacheKey, async () => {
      const [currSales, prevSales, currExpenses, prevExpenses, expByCategory] = await Promise.all([
        saleRepository.getRevenueSummary(companyId, range.startDate, range.endDate),
        saleRepository.getRevenueSummary(companyId, prev.startDate, prev.endDate),
        expenseRepository.getExpenseSummary(companyId, range.startDate, range.endDate),
        expenseRepository.getExpenseSummary(companyId, prev.startDate, prev.endDate),
        expenseRepository.getExpenseByCategory(companyId, range.startDate, range.endDate),
      ]);

      const curr = summarize(currSales);
      const prev2 = summarize(prevSales);
      const currExp = currExpenses[0] ?? { totalExpenses: 0 };
      const prevExp = prevExpenses[0] ?? { totalExpenses: 0 };

      const netProfit = curr.totalProfit - currExp.totalExpenses;
      const prevNetProfit = prev2.totalProfit - prevExp.totalExpenses;

      return {
        period: range,
        revenue: curr.totalRevenue,
        cogs: curr.totalCost,
        grossProfit: curr.totalProfit,
        grossMargin: curr.totalRevenue > 0 ? (curr.totalProfit / curr.totalRevenue) * 100 : 0,
        totalExpenses: currExp.totalExpenses,
        netProfit,
        netMargin: curr.totalRevenue > 0 ? (netProfit / curr.totalRevenue) * 100 : 0,
        growth: {
          revenue: calcGrowth(curr.totalRevenue, prev2.totalRevenue),
          grossProfit: calcGrowth(curr.totalProfit, prev2.totalProfit),
          expenses: calcGrowth(currExp.totalExpenses, prevExp.totalExpenses),
          netProfit: calcGrowth(netProfit, prevNetProfit),
        },
        expenseBreakdown: expByCategory,
      };
    }, 5 * 60 * 1000);
  }
}

export const analyticsService = new AnalyticsService();
