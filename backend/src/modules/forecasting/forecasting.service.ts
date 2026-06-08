import { Types } from 'mongoose';
import { Sale } from '../../models/Sale.model';
import { Expense } from '../../models/Expense.model';
import { Customer } from '../../models/Customer.model';
import { Forecast } from '../../models/Forecast.model';
import { callForecastService, ForecastDataPoint } from '../../services/analyticsClient.service';
import { cacheService } from '../../services/cache.service';
import { AppError } from '../../middleware/errorHandler.middleware';

type Metric = 'revenue' | 'sales_volume' | 'demand' | 'customer_growth' | 'expenses';
type Algorithm = 'linear_regression' | 'moving_average' | 'exponential_smoothing' | 'ensemble';
type Granularity = 'day' | 'week' | 'month';

interface ForecastOptions {
  metric: Metric;
  periods: number;
  algorithm: Algorithm;
  granularity: Granularity;
  confidenceLevel?: number;
}

const GRANULARITY_GROUP: Record<Granularity, object> = {
  month: { year: { $year: '$saleDate' }, month: { $month: '$saleDate' } },
  week: { year: { $year: '$saleDate' }, week: { $week: '$saleDate' } },
  day: { year: { $year: '$saleDate' }, month: { $month: '$saleDate' }, day: { $dayOfMonth: '$saleDate' } },
};

function granularityLabel(g: Record<string, any>, granularity: Granularity): string {
  if (granularity === 'month') return `${g.year}-${String(g.month).padStart(2, '0')}`;
  if (granularity === 'week') return `${g.year}-W${String(g.week).padStart(2, '0')}`;
  return `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
}

async function getRevenueData(companyId: string, granularity: Granularity): Promise<ForecastDataPoint[]> {
  const group = GRANULARITY_GROUP[granularity];
  const dateField = '$saleDate';
  const lookback = granularity === 'day' ? 90 : granularity === 'week' ? 180 : 365;
  const since = new Date(Date.now() - lookback * 24 * 60 * 60 * 1000);

  const results = await Sale.aggregate([
    { $match: { companyId: new Types.ObjectId(companyId), saleDate: { $gte: since }, status: { $nin: ['cancelled', 'refunded'] } } },
    { $group: { _id: group, value: { $sum: '$summary.grandTotal' } } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1 } },
  ]);

  return results.map((r) => ({ date: granularityLabel(r._id, granularity), value: r.value }));
}

async function getSalesVolumeData(companyId: string, granularity: Granularity): Promise<ForecastDataPoint[]> {
  const group = GRANULARITY_GROUP[granularity];
  const lookback = granularity === 'day' ? 90 : 365;
  const since = new Date(Date.now() - lookback * 24 * 60 * 60 * 1000);

  const results = await Sale.aggregate([
    { $match: { companyId: new Types.ObjectId(companyId), saleDate: { $gte: since }, status: { $nin: ['cancelled', 'refunded'] } } },
    { $group: { _id: group, value: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } },
  ]);

  return results.map((r) => ({ date: granularityLabel(r._id, granularity), value: r.value }));
}

async function getDemandData(companyId: string, granularity: Granularity): Promise<ForecastDataPoint[]> {
  const group: any = { ...(GRANULARITY_GROUP[granularity] as any) };
  // Rewrite date fields to use saleDate from unwound items
  const lookback = 365;
  const since = new Date(Date.now() - lookback * 24 * 60 * 60 * 1000);

  const results = await Sale.aggregate([
    { $match: { companyId: new Types.ObjectId(companyId), saleDate: { $gte: since }, status: { $nin: ['cancelled', 'refunded'] } } },
    { $unwind: '$items' },
    { $group: { _id: group, value: { $sum: '$items.quantity' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return results.map((r) => ({ date: granularityLabel(r._id, granularity), value: r.value }));
}

async function getCustomerGrowthData(companyId: string, granularity: Granularity): Promise<ForecastDataPoint[]> {
  const groupExpr = granularity === 'month'
    ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
    : { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };

  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const results = await Customer.aggregate([
    { $match: { companyId: new Types.ObjectId(companyId), createdAt: { $gte: since } } },
    { $group: { _id: groupExpr, value: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return results.map((r) => ({ date: granularityLabel(r._id, granularity === 'day' ? 'month' : granularity), value: r.value }));
}

async function getExpensesData(companyId: string, granularity: Granularity): Promise<ForecastDataPoint[]> {
  const groupExpr = granularity === 'month'
    ? { year: { $year: '$date' }, month: { $month: '$date' } }
    : { year: { $year: '$date' }, week: { $week: '$date' } };

  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const results = await Expense.aggregate([
    { $match: { companyId: new Types.ObjectId(companyId), date: { $gte: since }, status: { $ne: 'cancelled' } } },
    { $group: { _id: groupExpr, value: { $sum: '$amount' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return results.map((r) => ({ date: granularityLabel(r._id, granularity === 'day' ? 'month' : granularity), value: r.value }));
}

const DATA_FETCHERS: Record<Metric, (companyId: string, g: Granularity) => Promise<ForecastDataPoint[]>> = {
  revenue: getRevenueData,
  sales_volume: getSalesVolumeData,
  demand: getDemandData,
  customer_growth: getCustomerGrowthData,
  expenses: getExpensesData,
};

export class ForecastingService {
  async generateForecast(companyId: string, opts: ForecastOptions) {
    const cacheKey = `forecast:${companyId}:${opts.metric}:${opts.granularity}:${opts.algorithm}:${opts.periods}`;
    return cacheService.getOrSet(cacheKey, async () => {
      const fetcher = DATA_FETCHERS[opts.metric];
      if (!fetcher) throw new AppError(`Unknown metric: ${opts.metric}`, 400);

      const dataPoints = await fetcher(companyId, opts.granularity);
      if (dataPoints.length < 3) {
        throw new AppError(`Insufficient data for forecasting (need ≥3 data points, got ${dataPoints.length})`, 422);
      }

      const result = await callForecastService({
        company_id: companyId,
        metric: opts.metric,
        data_points: dataPoints,
        periods: opts.periods,
        algorithm: opts.algorithm,
        granularity: opts.granularity,
        confidence_level: opts.confidenceLevel ?? 0.95,
      });

      // Persist to Forecast collection (TTL 24h in model)
      await Forecast.findOneAndUpdate(
        { companyId, metric: opts.metric, algorithm: opts.algorithm, granularity: opts.granularity },
        {
          $set: {
            companyId,
            metric: opts.metric,
            algorithm: opts.algorithm,
            granularity: opts.granularity,
            periods: opts.periods,
            dataPoints: result.forecast.map((p: any) => ({
              date: new Date(p.date.length === 7 ? p.date + '-01' : p.date),
              predicted: p.predicted,
              lower: p.lower,
              upper: p.upper,
            })),
            metadata: result.metadata,
            generatedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      return result;
    });
  }

  async getSavedForecasts(companyId: string) {
    return Forecast.find({ companyId })
      .sort({ generatedAt: -1 })
      .select('-dataPoints')
      .lean();
  }

  async getHistoricalData(companyId: string, metric: Metric, granularity: Granularity) {
    const fetcher = DATA_FETCHERS[metric];
    if (!fetcher) throw new AppError(`Unknown metric: ${metric}`, 400);
    return fetcher(companyId, granularity);
  }
}

export const forecastingService = new ForecastingService();
