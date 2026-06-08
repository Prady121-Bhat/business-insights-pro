import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { env } from '../config/env';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: any[];

  constructor(message: string, statusCode = 500, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const appError = err as AppError;
  const statusCode = appError.statusCode || 500;
  const isOperational = appError.isOperational || false;

  if (!isOperational) {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  }

  let message = err.message || 'Internal server error';
  let errors = appError.errors;

  if (err.name === 'ValidationError') {
    const mongooseError = err as any;
    message = 'Validation failed';
    errors = Object.values(mongooseError.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    res.status(422).json({ success: false, message, errors });
    return;
  }

  if (err.name === 'CastError') {
    message = 'Invalid ID format';
    res.status(400).json({ success: false, message });
    return;
  }

  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0];
    message = `${field} already exists`;
    res.status(409).json({ success: false, message });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token expired' });
    return;
  }

  const response: Record<string, any> = { success: false, message };
  if (errors) response.errors = errors;
  if (!env.isProd && !isOperational) response.stack = err.stack;

  res.status(statusCode).json(response);
};
