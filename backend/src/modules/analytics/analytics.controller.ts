import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { analyticsService } from './analytics.service';
import { insightsService } from '../../services/insights.service';
import { sendSuccess } from '../../utils/response.utils';
import { AppError } from '../../middleware/errorHandler.middleware';

const validate = (req: Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Validation failed', 422, errors.array());
};

const extractRange = (req: Request) => ({
  startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
  endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
});

export const getOverviewKPIs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const { startDate, endDate } = extractRange(req);
    const data = await analyticsService.getOverviewKPIs(req.tenantId!, startDate, endDate);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getRevenueTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const { startDate, endDate } = extractRange(req);
    const granularity = (req.query.granularity as any) || 'day';
    const data = await analyticsService.getRevenueTrend(req.tenantId!, startDate, endDate, granularity);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getTopProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const { startDate, endDate } = extractRange(req);
    const limit = Number(req.query.limit) || 10;
    const data = await analyticsService.getTopProducts(req.tenantId!, startDate, endDate, limit);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getHeatmap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const { startDate, endDate } = extractRange(req);
    const data = await analyticsService.getHeatmap(req.tenantId!, startDate, endDate);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getCustomerAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await analyticsService.getCustomerAnalytics(req.tenantId!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getRetentionAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const months = Number(req.query.months) || 12;
    const data = await analyticsService.getRetentionAnalysis(req.tenantId!, months);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getCohortAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const months = Number(req.query.months) || 6;
    const data = await analyticsService.getCohortAnalysis(req.tenantId!, months);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getInventoryAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await analyticsService.getInventoryAnalytics(req.tenantId!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getExpenseAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const { startDate, endDate } = extractRange(req);
    const data = await analyticsService.getExpenseAnalytics(req.tenantId!, startDate, endDate);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getProfitAndLoss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const { startDate, endDate } = extractRange(req);
    const data = await analyticsService.getProfitAndLoss(req.tenantId!, startDate, endDate);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getInsights = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await insightsService.generateInsights(req.tenantId!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};
