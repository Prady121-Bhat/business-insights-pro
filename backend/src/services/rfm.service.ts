import { Types } from 'mongoose';
import { Sale } from '../models/Sale.model';
import { Customer } from '../models/Customer.model';
import { logger } from '../config/logger';

interface RFMScores { recency: number; frequency: number; monetary: number; total: number }
interface CustomerRFM {
  customerId: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  scores: RFMScores;
  segment: string;
}

function scoreRFM(value: number, thresholds: number[], reverse = false): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (reverse ? value <= thresholds[i] : value >= thresholds[i]) return 5 - i;
  }
  return 1;
}

function assignSegment(r: number, f: number, m: number): string {
  const total = r + f + m;
  if (r >= 4 && f >= 4 && m >= 4) return 'vip';
  if (r >= 3 && f >= 3) return 'loyal';
  if (r >= 4 && f <= 2) return 'new';
  if (r <= 2 && f >= 3) return 'at_risk';
  if (r <= 1 && f >= 2) return 'lost';
  return 'regular';
}

class RFMService {
  async computeAndSave(companyId: string): Promise<{ updated: number }> {
    const now = new Date();

    const salesAgg = await Sale.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          status: { $nin: ['cancelled', 'refunded'] },
          customerId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$customerId',
          lastPurchase: { $max: '$saleDate' },
          frequency: { $sum: 1 },
          monetary: { $sum: '$summary.grandTotal' },
        },
      },
    ]);

    if (!salesAgg.length) return { updated: 0 };

    const recencyDays = salesAgg.map((s) =>
      Math.floor((now.getTime() - new Date(s.lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
    );
    const frequencies = salesAgg.map((s) => s.frequency);
    const monetaries = salesAgg.map((s) => s.monetary);

    const rThresholds = [7, 14, 30, 60];
    const fThresholds = [12, 6, 3, 1];
    const mThresholds = [
      monetaries.sort((a, b) => b - a)[Math.floor(salesAgg.length * 0.2)] ?? 5000,
      monetaries[Math.floor(salesAgg.length * 0.4)] ?? 2000,
      monetaries[Math.floor(salesAgg.length * 0.6)] ?? 1000,
      monetaries[Math.floor(salesAgg.length * 0.8)] ?? 500,
    ];

    const updates: Promise<any>[] = [];

    for (const sale of salesAgg) {
      const rDays = Math.floor((now.getTime() - new Date(sale.lastPurchase).getTime()) / (1000 * 60 * 60 * 24));
      const r = scoreRFM(rDays, rThresholds, true);
      const f = scoreRFM(sale.frequency, fThresholds);
      const m = scoreRFM(sale.monetary, mThresholds);
      const segment = assignSegment(r, f, m);

      updates.push(
        Customer.findByIdAndUpdate(sale._id, {
          $set: {
            segment,
            'metrics.lastPurchaseDate': sale.lastPurchase,
            'metrics.totalOrders': sale.frequency,
            'metrics.totalRevenue': sale.monetary,
            'metrics.averageOrderValue': sale.monetary / sale.frequency,
            'metrics.daysSinceLastPurchase': rDays,
            'metrics.rfmScore': { recency: r, frequency: f, monetary: m, total: r + f + m },
          },
        })
      );
    }

    await Promise.all(updates);
    logger.info('RFM computed', { companyId, customers: salesAgg.length });
    return { updated: salesAgg.length };
  }

  async getRFMDistribution(companyId: string) {
    return Customer.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), isActive: true, 'metrics.rfmScore': { $exists: true } } },
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 },
          avgRecency: { $avg: '$metrics.rfmScore.recency' },
          avgFrequency: { $avg: '$metrics.rfmScore.frequency' },
          avgMonetary: { $avg: '$metrics.rfmScore.monetary' },
          totalRevenue: { $sum: '$metrics.totalRevenue' },
          avgLTV: { $avg: '$metrics.lifetimeValue' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
  }

  async getTopRFMCustomers(companyId: string, limit = 20) {
    return Customer.find({
      companyId,
      isActive: true,
      'metrics.rfmScore': { $exists: true },
    })
      .sort({ 'metrics.rfmScore.total': -1, 'metrics.totalRevenue': -1 })
      .limit(limit)
      .select('firstName lastName email segment metrics churnRisk')
      .lean();
  }
}

export const rfmService = new RFMService();
