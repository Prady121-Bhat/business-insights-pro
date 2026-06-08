import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../../services/notification.service';
import { AppError } from '../../middleware/errorHandler.middleware';

export class NotificationsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 30, type, severity, unread } = req.query;
      const result = await notificationService.list(
        req.tenantId!,
        req.user!.userId,
        {
          page: Number(page),
          limit: Math.min(Number(limit), 100),
          type: type as string | undefined,
          severity: severity as string | undefined,
          unreadOnly: unread === 'true',
        },
      );
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.tenantId!, req.user!.userId);
      res.json({ success: true, data: { count } });
    } catch (e) { next(e); }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || !ids.length) throw new AppError('ids array required', 400);
      await notificationService.markRead(ids, req.tenantId!);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllRead(req.tenantId!, req.user!.userId);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  async deleteOne(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.deleteOne(req.params.id, req.tenantId!);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  async deleteRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.deleteRead(req.tenantId!);
      res.json({ success: true, message: 'Read notifications cleared' });
    } catch (e) { next(e); }
  }
}

export const notificationsController = new NotificationsController();
