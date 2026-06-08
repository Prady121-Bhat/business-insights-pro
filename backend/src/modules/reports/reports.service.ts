import path from 'path';
import fs from 'fs';
import { Types } from 'mongoose';
import { Report, IReport } from '../../models/Report.model';
import { AppError } from '../../middleware/errorHandler.middleware';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import {
  getRevenueReportData, getSalesReportData, getCustomerReportData,
  getInventoryReportData, getExpenseReportData,
} from './report-data.service';
import {
  generateRevenuePdf, generateCustomerPdf, generateInventoryPdf, generateExpensePdf,
} from './generators/pdf.generator';
import {
  generateRevenueExcel, generateSalesExcel, generateCustomerExcel,
  generateInventoryExcel, generateExpenseExcel,
} from './generators/excel.generator';
import {
  generateRevenueCsv, generateSalesCsv, generateCustomerCsv,
  generateInventoryCsv, generateExpenseCsv,
} from './generators/csv.generator';

const UPLOAD_DIR = path.join(env.UPLOAD_DIR ?? './uploads', 'reports');

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getFilePath(reportId: string, format: string): string {
  const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'csv';
  return path.join(UPLOAD_DIR, `report_${reportId}.${ext}`);
}

function getMimeType(format: string) {
  if (format === 'pdf') return 'application/pdf';
  if (format === 'excel') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'text/csv';
}

interface GenerateOptions {
  type: string;
  format: 'pdf' | 'excel' | 'csv';
  title: string;
  startDate?: Date;
  endDate?: Date;
  companyId: string;
  userId: string;
}

export class ReportsService {
  async generateReport(opts: GenerateOptions): Promise<IReport> {
    ensureDir();
    const start = Date.now();

    const report = await Report.create({
      companyId: new Types.ObjectId(opts.companyId),
      createdBy: new Types.ObjectId(opts.userId),
      title: opts.title,
      type: opts.type,
      format: opts.format,
      status: 'generating',
      parameters: {
        startDate: opts.startDate,
        endDate: opts.endDate,
      },
    });

    const filePath = getFilePath(String(report._id), opts.format);
    const range = {
      startDate: opts.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: opts.endDate ?? new Date(),
    };

    try {
      await this._generate(opts.type, opts.format, opts.companyId, range, filePath);

      const stat = fs.statSync(filePath);
      report.status = 'completed';
      report.filePath = filePath;
      report.fileSize = stat.size;
      report.generationDuration = Date.now() - start;
      await report.save();

      logger.info('Report generated', { reportId: report._id, type: opts.type, format: opts.format, ms: report.generationDuration });
      return report;
    } catch (err: any) {
      report.status = 'failed';
      report.errorMessage = err.message;
      await report.save();
      logger.error('Report generation failed', { reportId: report._id, error: err.message });
      throw new AppError(`Report generation failed: ${err.message}`, 500);
    }
  }

  private async _generate(type: string, format: string, companyId: string, range: { startDate: Date; endDate: Date }, filePath: string): Promise<void> {
    let data: any;

    switch (type) {
      case 'revenue': data = await getRevenueReportData(companyId, range); break;
      case 'sales': data = await getSalesReportData(companyId, range); break;
      case 'customer': data = await getCustomerReportData(companyId, range); break;
      case 'inventory': data = await getInventoryReportData(companyId); break;
      case 'expense': data = await getExpenseReportData(companyId, range); break;
      default: throw new AppError(`Unknown report type: ${type}`, 400);
    }

    if (format === 'pdf') {
      switch (type) {
        case 'revenue': await generateRevenuePdf(data, filePath); break;
        case 'customer': await generateCustomerPdf(data, filePath); break;
        case 'inventory': await generateInventoryPdf(data, filePath); break;
        case 'expense': await generateExpensePdf(data, filePath); break;
        default: await generateRevenuePdf(data, filePath);
      }
    } else if (format === 'excel') {
      switch (type) {
        case 'revenue': await generateRevenueExcel(data, filePath); break;
        case 'sales': await generateSalesExcel(data, filePath); break;
        case 'customer': await generateCustomerExcel(data, filePath); break;
        case 'inventory': await generateInventoryExcel(data, filePath); break;
        case 'expense': await generateExpenseExcel(data, filePath); break;
        default: await generateRevenueExcel(data, filePath);
      }
    } else {
      switch (type) {
        case 'revenue': await generateRevenueCsv(data, filePath); break;
        case 'sales': await generateSalesCsv(data, filePath); break;
        case 'customer': await generateCustomerCsv(data, filePath); break;
        case 'inventory': await generateInventoryCsv(data, filePath); break;
        case 'expense': await generateExpenseCsv(data, filePath); break;
        default: await generateRevenueCsv(data, filePath);
      }
    }
  }

  async listReports(companyId: string, opts: { page?: number; limit?: number; type?: string; format?: string }) {
    const filter: any = { companyId };
    if (opts.type) filter.type = opts.type;
    if (opts.format) filter.format = opts.format;

    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-filePath').lean(),
      Report.countDocuments(filter),
    ]);

    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async downloadReport(companyId: string, reportId: string): Promise<{ filePath: string; mimeType: string; filename: string }> {
    const report = await Report.findOne({ _id: reportId, companyId });
    if (!report) throw new AppError('Report not found', 404);
    if (report.status !== 'completed') throw new AppError(`Report not ready (status: ${report.status})`, 400);
    if (!report.filePath || !fs.existsSync(report.filePath)) throw new AppError('Report file not found — may have expired', 404);

    report.downloadCount++;
    await report.save();

    const ext = report.format === 'excel' ? 'xlsx' : report.format;
    return {
      filePath: report.filePath,
      mimeType: getMimeType(report.format),
      filename: `${report.title.replace(/[^a-z0-9]/gi, '_')}.${ext}`,
    };
  }

  async deleteReport(companyId: string, reportId: string): Promise<void> {
    const report = await Report.findOne({ _id: reportId, companyId });
    if (!report) throw new AppError('Report not found', 404);

    if (report.filePath && fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }
    await report.deleteOne();
  }

  async getStats(companyId: string) {
    const [total, byType, byFormat, recentFailed] = await Promise.all([
      Report.countDocuments({ companyId }),
      Report.aggregate([{ $match: { companyId: new Types.ObjectId(companyId) } }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
      Report.aggregate([{ $match: { companyId: new Types.ObjectId(companyId) } }, { $group: { _id: '$format', count: { $sum: 1 } } }]),
      Report.countDocuments({ companyId, status: 'failed', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    ]);
    return { total, byType, byFormat, recentFailed };
  }
}

export const reportsService = new ReportsService();
