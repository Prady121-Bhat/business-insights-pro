import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.middleware';
import { UserRole } from '../models/User.model';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  company_admin: 80,
  manager: 60,
  analyst: 40,
  employee: 20,
  viewer: 10,
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const userRole = req.user.role as UserRole;
    if (!roles.includes(userRole)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
};

export const requireMinRole = (minRole: UserRole) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const userRole = req.user.role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < requiredLevel) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
};

export const requireSuperAdmin = requireRole('super_admin');
export const requireCompanyAdmin = requireMinRole('company_admin');
export const requireManager = requireMinRole('manager');
export const requireAnalyst = requireMinRole('analyst');
export const requireEmployee = requireMinRole('employee');

export const requireSelfOrAdmin = (userIdParam = 'id') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const targetId = req.params[userIdParam];
    const isSelf = req.user.userId === targetId;
    const isAdmin = ['super_admin', 'company_admin'].includes(req.user.role);

    if (!isSelf && !isAdmin) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
};
