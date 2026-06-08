import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { AppError } from '../../middleware/errorHandler.middleware';

const VALID_TYPES = ['revenue', 'sales', 'customer', 'inventory', 'expense'];
const VALID_FORMATS = ['pdf', 'excel', 'csv'];

export class ReportsController {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, format, title, startDate, endDate } = req.body;
      if (!VALID_TYPES.includes(type)) throw new AppError(`Invalid type. Valid: ${VALID_TYPES.join(', ')}`, 400);
      if (!VALID_FORMATS.includes(format)) throw new AppError(`Invalid format. Valid: ${VALID_FORMATS.join(', ')}`, 400);
      if (!title?.trim()) throw new AppError('title is required', 400);

      const report = await reportsService.generateReport({
        type, format, title: title.trim(),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        companyId: req.tenantId!,
        userId: req.user!.userId,
      });

      res.status(201).json({ success: true, data: report });
    } catch (e) { next(e); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, type, format } = req.query;
      const result = await reportsService.listReports(req.tenantId!, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        type: type as string,
        format: format as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  }

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const { filePath, mimeType, filename } = await reportsService.downloadReport(req.tenantId!, req.params.id);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath, { root: '/' });
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await reportsService.deleteReport(req.tenantId!, req.params.id);
      res.json({ success: true, message: 'Report deleted' });
    } catch (e) { next(e); }
  }

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportsService.getStats(req.tenantId!);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
}

export const reportsController = new ReportsController();
