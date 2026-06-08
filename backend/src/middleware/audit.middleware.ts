import { Request, Response, NextFunction } from 'express';
import { AuditLog, AuditAction } from '../models/AuditLog.model';
import { logger } from '../config/logger';

interface AuditOptions {
  action: AuditAction;
  resource: string;
  getResourceId?: (req: Request) => string | undefined;
  getDescription?: (req: Request) => string;
}

export const auditLog = (options: AuditOptions | string) => {
  const opts: AuditOptions = typeof options === 'string'
    ? { action: options as AuditAction, resource: options }
    : options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      const success = body?.success !== false && res.statusCode < 400;

      AuditLog.create({
        companyId: req.user?.companyId || req.tenantId,
        userId: req.user?.userId,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        action: opts.action,
        resource: opts.resource,
        resourceId: opts.getResourceId?.(req) || req.params.id,
        description: opts.getDescription?.(req) || `${opts.action} ${opts.resource}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        statusCode: res.statusCode,
        success,
      }).catch((err) => logger.error('Audit log failed', { error: err.message }));

      return originalJson(body);
    };

    next();
  };
};
