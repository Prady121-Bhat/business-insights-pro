import { Request, Response, NextFunction } from 'express';
import { forecastingService } from './forecasting.service';
import { AppError } from '../../middleware/errorHandler.middleware';
import { pingAnalyticsService } from '../../services/analyticsClient.service';

const VALID_METRICS = ['revenue', 'sales_volume', 'demand', 'customer_growth', 'expenses'];
const VALID_ALGOS = ['linear_regression', 'moving_average', 'exponential_smoothing', 'ensemble'];
const VALID_GRANULARITY = ['day', 'week', 'month'];

export class ForecastingController {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        metric = 'revenue',
        periods = 6,
        algorithm = 'ensemble',
        granularity = 'month',
        confidenceLevel,
      } = req.body;

      if (!VALID_METRICS.includes(metric)) throw new AppError(`Invalid metric. Valid: ${VALID_METRICS.join(', ')}`, 400);
      if (!VALID_ALGOS.includes(algorithm)) throw new AppError(`Invalid algorithm. Valid: ${VALID_ALGOS.join(', ')}`, 400);
      if (!VALID_GRANULARITY.includes(granularity)) throw new AppError('Invalid granularity', 400);
      if (Number(periods) < 1 || Number(periods) > 24) throw new AppError('periods must be 1-24', 400);

      const result = await forecastingService.generateForecast(req.tenantId!, {
        metric, periods: Number(periods), algorithm, granularity,
        confidenceLevel: confidenceLevel ? Number(confidenceLevel) : undefined,
      });

      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async getSaved(req: Request, res: Response, next: NextFunction) {
    try {
      const forecasts = await forecastingService.getSavedForecasts(req.tenantId!);
      res.json({ success: true, data: forecasts });
    } catch (e) { next(e); }
  }

  async getHistorical(req: Request, res: Response, next: NextFunction) {
    try {
      const { metric = 'revenue', granularity = 'month' } = req.query;
      if (!VALID_METRICS.includes(metric as string)) throw new AppError('Invalid metric', 400);
      if (!VALID_GRANULARITY.includes(granularity as string)) throw new AppError('Invalid granularity', 400);

      const data = await forecastingService.getHistoricalData(
        req.tenantId!,
        metric as any,
        granularity as any,
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async serviceHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const alive = await pingAnalyticsService();
      res.json({ success: true, analyticsServiceOnline: alive });
    } catch (e) { next(e); }
  }
}

export const forecastingController = new ForecastingController();
