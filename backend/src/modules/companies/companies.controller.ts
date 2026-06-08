import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { companiesService } from './companies.service';
import { sendSuccess } from '../../utils/response.utils';
import { AppError } from '../../middleware/errorHandler.middleware';

const validate = (req: Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Validation failed', 422, errors.array());
};

export const getCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await companiesService.getCompany(req.tenantId!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const updateCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const company = await companiesService.updateCompany(req.tenantId!, req.body);
    sendSuccess(res, company, 'Company updated');
  } catch (err) { next(err); }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const company = await companiesService.updateSettings(req.tenantId!, req.body);
    sendSuccess(res, company, 'Settings updated');
  } catch (err) { next(err); }
};

export const updateBranding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const settings = await companiesService.updateBranding(req.tenantId!, req.body);
    sendSuccess(res, settings, 'Branding updated');
  } catch (err) { next(err); }
};

export const getSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sub = await companiesService.getSubscription(req.tenantId!);
    sendSuccess(res, sub);
  } catch (err) { next(err); }
};

export const updateAnalyticsSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await companiesService.updateAnalyticsSettings(req.tenantId!, req.body);
    sendSuccess(res, settings, 'Analytics settings updated');
  } catch (err) { next(err); }
};

export const updateNotificationSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await companiesService.updateNotificationSettings(req.tenantId!, req.body);
    sendSuccess(res, settings, 'Notification settings updated');
  } catch (err) { next(err); }
};

export const getAllCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query as any;
    const result = await companiesService.getAllCompanies(Number(page), Number(limit));
    sendSuccess(res, result);
  } catch (err) { next(err); }
};
