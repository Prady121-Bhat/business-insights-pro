import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { customersService } from './customers.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.utils';
import { AppError } from '../../middleware/errorHandler.middleware';

const validate = (req: Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Validation failed', 422, errors.array());
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const customer = await customersService.create(req.tenantId!, req.body, req.user!.userId);
    sendCreated(res, customer, 'Customer created');
  } catch (err) { next(err); }
};

export const listCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const result = await customersService.list(req.tenantId!, req.query as any);
    sendPaginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await customersService.getById(req.params.id, req.tenantId!);
    sendSuccess(res, customer);
  } catch (err) { next(err); }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const customer = await customersService.update(req.params.id, req.tenantId!, req.body);
    sendSuccess(res, customer, 'Customer updated');
  } catch (err) { next(err); }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await customersService.delete(req.params.id, req.tenantId!);
    sendSuccess(res, null, 'Customer deactivated');
  } catch (err) { next(err); }
};

export const getCustomerSales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as any;
    const result = await customersService.getCustomerSales(req.params.id, req.tenantId!, page, limit);
    sendPaginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

export const runRFMAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customersService.runRFMAnalysis(req.tenantId!);
    sendSuccess(res, result, `RFM analysis complete — ${result.updated} customers updated`);
  } catch (err) { next(err); }
};

export const runCLVAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customersService.runCLVAnalysis(req.tenantId!);
    sendSuccess(res, result, `CLV analysis complete — ${result.updated} customers updated`);
  } catch (err) { next(err); }
};

export const runChurnAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customersService.runChurnAnalysis(req.tenantId!);
    sendSuccess(res, result, `Churn analysis complete — ${result.updated} customers updated`);
  } catch (err) { next(err); }
};

export const runAllAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customersService.runAllAnalytics(req.tenantId!);
    sendSuccess(res, result, 'All customer analytics refreshed');
  } catch (err) { next(err); }
};

export const getRFMData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await customersService.getRFMData(req.tenantId!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getCLVData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await customersService.getCLVData(req.tenantId!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getChurnData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await customersService.getChurnData(req.tenantId!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getCohortAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const months = Number(req.query.months) || 6;
    const data = await customersService.getCohortAnalysis(req.tenantId!, months);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getRetentionCurve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const months = Number(req.query.months) || 12;
    const data = await customersService.getRetentionCurve(req.tenantId!, months);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const getSegmentSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await customersService.getSegmentSummary(req.tenantId!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
};
