import { Types } from 'mongoose';
import { Customer } from '../models/Customer.model';
import { Settings } from '../models/Settings.model';
import { logger } from '../config/logger';

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

class ChurnService {
  async computeAndSave(companyId: string): Promise<{ updated: number }> {
    const settings = await Settings.findOne({ companyId });
    const churnDays = settings?.analytics.churnThresholdDays ?? 90;

    const customers = await Customer.find({
      companyId,
      isActive: true,
      'metrics.firstPurchaseDate': { $exists: true },
    }).lean();

    if (!customers.length) return { updated: 0 };

    const now = new Date();
    const updates: Promise<any>[] = [];

    for (const customer of customers) {
      const { totalOrders, totalRevenue, lastPurchaseDate, daysSinceLastPurchase, rfmScore } = customer.metrics;

      const daysSince = lastPurchaseDate
        ? (now.getTime() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)
        : churnDays + 1;

      const recencyWeight = daysSince / churnDays;
      const frequencyWeight = totalOrders <= 1 ? 0.8 : totalOrders <= 3 ? 0.4 : 0.1;
      const rfmWeight = rfmScore ? (1 - rfmScore.total / 15) : 0.5;
      const revenueWeight = totalRevenue < 100 ? 0.3 : 0;

      const rawScore = (recencyWeight * 0.5) + (frequencyWeight * 0.25) + (rfmWeight * 0.2) + (revenueWeight * 0.05);
      const churnScore = Math.min(100, Math.round(sigmoid(rawScore * 6 - 3) * 100));

      const level = churnScore >= 70 ? 'high' : churnScore >= 40 ? 'medium' : 'low';

      const predictedChurnDate = level !== 'low'
        ? new Date(now.getTime() + (churnDays - daysSince) * 24 * 60 * 60 * 1000)
        : undefined;

      updates.push(
        Customer.findByIdAndUpdate(customer._id, {
          $set: {
            'churnRisk.score': churnScore,
            'churnRisk.level': level,
            'churnRisk.lastCalculated': now,
            ...(predictedChurnDate ? { 'churnRisk.predictedChurnDate': predictedChurnDate } : {}),
            segment: daysSince > churnDays * 2 ? 'lost' : customer.segment,
          },
        })
      );
    }

    await Promise.all(updates);
    logger.info('Churn scores computed', { companyId, customers: updates.length });
    return { updated: updates.length };
  }

  async getChurnRiskCustomers(companyId: string, level?: 'low' | 'medium' | 'high', limit = 50) {
    const filter: any = { companyId, isActive: true };
    if (level) filter['churnRisk.level'] = level;
    else filter['churnRisk.level'] = { $in: ['medium', 'high'] };

    return Customer.find(filter)
      .sort({ 'churnRisk.score': -1 })
      .limit(limit)
      .select('firstName lastName email segment metrics churnRisk')
      .lean();
  }

  async getChurnSummary(companyId: string) {
    const [total, high, medium, low, lost] = await Promise.all([
      Customer.countDocuments({ companyId, isActive: true }),
      Customer.countDocuments({ companyId, isActive: true, 'churnRisk.level': 'high' }),
      Customer.countDocuments({ companyId, isActive: true, 'churnRisk.level': 'medium' }),
      Customer.countDocuments({ companyId, isActive: true, 'churnRisk.level': 'low' }),
      Customer.countDocuments({ companyId, isActive: true, segment: 'lost' }),
    ]);

    const atRiskRevenue = await Customer.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), isActive: true, 'churnRisk.level': { $in: ['medium', 'high'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$metrics.totalRevenue' } } },
    ]);

    return {
      total,
      high,
      medium,
      low,
      lost,
      atRisk: high + medium,
      atRiskRate: total > 0 ? ((high + medium) / total) * 100 : 0,
      atRiskRevenue: atRiskRevenue[0]?.totalRevenue ?? 0,
    };
  }
}

export const churnService = new ChurnService();
