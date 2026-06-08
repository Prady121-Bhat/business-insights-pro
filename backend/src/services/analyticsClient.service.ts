import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

const client = axios.create({
  baseURL: env.ANALYTICS_SERVICE_URL ?? 'http://localhost:8001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': env.ANALYTICS_SERVICE_KEY ?? 'changeme-internal-key',
  },
});

export interface ForecastDataPoint {
  date: string;
  value: number;
}

export interface ForecastRequest {
  company_id: string;
  metric: 'revenue' | 'sales_volume' | 'demand' | 'customer_growth' | 'expenses';
  data_points: ForecastDataPoint[];
  periods: number;
  algorithm: 'linear_regression' | 'moving_average' | 'exponential_smoothing' | 'ensemble';
  granularity: 'day' | 'week' | 'month';
  confidence_level?: number;
}

export async function callForecastService(req: ForecastRequest) {
  try {
    const res = await client.post('/api/v1/forecast', req);
    return res.data;
  } catch (err: any) {
    logger.error('Analytics service error', {
      message: err.message,
      status: err.response?.status,
      detail: err.response?.data?.detail,
    });
    throw new Error(err.response?.data?.detail ?? 'Analytics service unavailable');
  }
}

export async function pingAnalyticsService(): Promise<boolean> {
  try {
    await client.get('/health');
    return true;
  } catch {
    return false;
  }
}
