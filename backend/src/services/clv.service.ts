import { Types } from 'mongoose';
import { Sale } from '../models/Sale.model';
import { Customer } from '../models/Customer.model';
import { Settings } from '../models/Settings.model';
import { logger } from '../config/logger';

class CLVService {
  async computeAndSave(companyId: string): Promise<{ updated: number }> {
    const settings = await Settings.findOne({ companyId });
    const churnDays = settings?.analytics.churnThresholdDays ?? 90;

    const customers = await Customer.find({ companyId, isActive: true }).lean();
    if (!customers.length) return { updated: 0 };

    const now = new Date();
    const updates: Promise<any>[] = [];

    for (const customer of customers) {
      const { totalRevenue, totalOrders, firstPurchaseDate, lastPurchaseDate } = customer.metrics;

      if (!firstPurchaseDate || totalOrders === 0) continue;

      const firstDate = new Date(firstPurchaseDate);
      const lastDate = lastPurchaseDate ? new Date(lastPurchaseDate) : now;
      const ageMonths = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const purchaseFrequencyPerMonth = totalOrders / ageMonths;

      const daysSinceLast = lastPurchaseDate
        ? (now.getTime() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)
        : 999;

      const projectedMonthsRemaining = Math.max(0, churnDays / 30 - daysSinceLast / 30);
      const clv = avgOrderValue * purchaseFrequencyPerMonth * (ageMonths + projectedMonthsRemaining);

      updates.push(
        Customer.findByIdAndUpdate(customer._id, {
          $set: {
            'metrics.lifetimeValue': Math.round(clv * 100) / 100,
            'metrics.averageOrderValue': Math.round(avgOrderValue * 100) / 100,
          },
        })
      );
    }

    await Promise.all(updates);
    logger.info('CLV computed', { companyId, customers: updates.length });
    return { updated: updates.length };
  }

  async getCLVDistribution(companyId: string) {
    const customers = await Customer.find({
      companyId,
      isActive: true,
      'metrics.lifetimeValue': { $gt: 0 },
    })
      .select('metrics.lifetimeValue segment')
      .lean();

    const segments: Record<string, number[]> = {};
    for (const c of customers) {
      const seg = (c as any).segment as string;
      if (!segments[seg]) segments[seg] = [];
      segments[seg].push((c.metrics as any).lifetimeValue ?? 0);
    }

    return Object.entries(segments).map(([segment, values]) => ({
      segment,
      avgCLV: values.reduce((a, b) => a + b, 0) / values.length,
      minCLV: Math.min(...values),
      maxCLV: Math.max(...values),
      count: values.length,
    }));
  }

  async getTopCLVCustomers(companyId: string, limit = 20) {
    return Customer.find({ companyId, isActive: true, 'metrics.lifetimeValue': { $gt: 0 } })
      .sort({ 'metrics.lifetimeValue': -1 })
      .limit(limit)
      .select('firstName lastName email segment metrics churnRisk')
      .lean();
  }
}

export const clvService = new CLVService();
