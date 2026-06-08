import { Request, Response, NextFunction } from 'express';
import { insightsService } from '../../services/insights.service';
import { Notification } from '../../models/Notification.model';
import { AppError } from '../../middleware/errorHandler.middleware';
import { cacheService } from '../../services/cache.service';

export class InsightsController {
  async getInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, severity } = req.query;
      const cacheKey = `insights:${req.tenantId}`;

      let data = await cacheService.get<any[]>(cacheKey);
      if (!data) {
        data = await insightsService.generateInsights(req.tenantId!);
        cacheService.set(cacheKey, data, 5 * 60 * 1000);
      }

      let filtered = data;
      if (category) filtered = filtered.filter((i) => i.category === category);
      if (severity) filtered = filtered.filter((i) => i.severity === severity);

      res.json({ success: true, data: filtered, total: filtered.length });
    } catch (e) { next(e); }
  }

  async refreshInsights(req: Request, res: Response, next: NextFunction) {
    try {
      cacheService.invalidateKey(`insights:${req.tenantId}`);
      await insightsService.generateAndSaveInsights(req.tenantId!);
      const data = await insightsService.generateInsights(req.tenantId!);
      cacheService.set(`insights:${req.tenantId}`, data, 5 * 60);
      res.json({ success: true, data, total: data.length, message: 'Insights refreshed' });
    } catch (e) { next(e); }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await insightsService.getInsightsSummary(req.tenantId!);
      res.json({ success: true, data: summary });
    } catch (e) { next(e); }
  }

  async getNotificationHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, unreadOnly } = req.query;
      const filter: any = { companyId: req.tenantId };
      if (unreadOnly === 'true') filter.isRead = false;

      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        Notification.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
      });
    } catch (e) { next(e); }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) throw new AppError('ids array required', 400);

      await Notification.updateMany(
        { _id: { $in: ids }, companyId: req.tenantId },
        { $set: { isRead: true } }
      );
      res.json({ success: true, message: `${ids.length} notification(s) marked read` });
    } catch (e) { next(e); }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await Notification.updateMany(
        { companyId: req.tenantId, isRead: false },
        { $set: { isRead: true } }
      );
      res.json({ success: true, message: `${result.modifiedCount} notifications marked read` });
    } catch (e) { next(e); }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await Notification.countDocuments({ companyId: req.tenantId, isRead: false });
      res.json({ success: true, data: { count } });
    } catch (e) { next(e); }
  }
}

export const insightsController = new InsightsController();
