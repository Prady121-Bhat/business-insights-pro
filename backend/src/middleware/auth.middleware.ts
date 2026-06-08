import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { AppError } from './errorHandler.middleware';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      companyId: payload.companyId,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
};

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      companyId: payload.companyId,
      role: payload.role,
      email: payload.email,
    };
  } catch {
    // silently ignore invalid token for optional auth
  }
  next();
};
