import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { ImportJob } from '../../models/ImportJob.model';
import { AppError } from '../../middleware/errorHandler.middleware';
import { parseFile } from './import-parser.service';
import { validateRows, ENTITY_FIELDS } from './import-validators';
import { processImportJob } from './import-processor.service';
import path from 'path';

const VALID_ENTITIES = ['customers', 'products', 'expenses', 'sales'];

export class ImportsController {
  // Step 1: Upload file → returns headers for mapping
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);

      const { entityType } = req.body;
      if (!VALID_ENTITIES.includes(entityType)) throw new AppError('Invalid entityType', 400);

      const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
      const fileType = ext === 'xlsx' || ext === 'xls' ? ext : 'csv';

      const { headers, rows, totalRows } = await parseFile(req.file.path, fileType);
      if (totalRows === 0) throw new AppError('File is empty or has no data rows', 400);

      const job = await ImportJob.create({
        companyId: new Types.ObjectId(req.tenantId!),
        createdBy: new Types.ObjectId(req.user!.userId),
        entityType,
        status: 'mapping',
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: fileType as any,
        filePath: req.file.path,
        validation: { totalRows, validRows: 0, invalidRows: 0, errors: [] },
        progress: { processed: 0, total: totalRows, percentage: 0 },
        result: { created: 0, updated: 0, skipped: 0, failed: 0 },
      });

      // Auto-suggest column mapping based on name similarity
      const fields = ENTITY_FIELDS[entityType] ?? [];
      const suggested: Record<string, string> = {};
      for (const header of headers) {
        const normalized = header.toLowerCase().replace(/[\s_\-]/g, '');
        const match = fields.find((f) => {
          const fNorm = f.key.toLowerCase();
          const lNorm = f.label.toLowerCase().replace(/[\s_\-]/g, '');
          return fNorm === normalized || lNorm === normalized || fNorm.includes(normalized) || normalized.includes(fNorm);
        });
        if (match) suggested[header] = match.key;
      }

      res.status(201).json({
        success: true,
        data: {
          jobId: job._id,
          headers,
          totalRows,
          entityType,
          fields,
          suggestedMapping: suggested,
          preview: rows.slice(0, 3),
        },
      });
    } catch (e) { next(e); }
  }

  // Step 2: Save mapping + validate → returns validation errors
  async validateMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId, mapping } = req.body;
      if (!jobId || !mapping) throw new AppError('jobId and mapping required', 400);

      const job = await ImportJob.findOne({ _id: jobId, companyId: req.tenantId });
      if (!job) throw new AppError('Import job not found', 404);
      if (!['mapping', 'validating'].includes(job.status)) throw new AppError('Job is not in mapping state', 400);

      const { headers, rows } = await parseFile(job.filePath, job.fileType);
      const result = validateRows(rows, mapping, job.entityType);

      job.columnMapping = mapping;
      job.status = 'validating';
      job.validation = {
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
        errors: result.errors,
      };
      await job.save();

      res.json({
        success: true,
        data: {
          jobId,
          totalRows: result.totalRows,
          validRows: result.validRows,
          invalidRows: result.invalidRows,
          errors: result.errors.slice(0, 50),
          totalErrors: result.errors.length,
          preview: result.preview,
          canProceed: result.validRows > 0,
        },
      });
    } catch (e) { next(e); }
  }

  // Step 3: Start processing (async — returns immediately)
  async startImport(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.body;
      if (!jobId) throw new AppError('jobId required', 400);

      const job = await ImportJob.findOne({ _id: jobId, companyId: req.tenantId });
      if (!job) throw new AppError('Import job not found', 404);
      if (job.status !== 'validating') throw new AppError('Job must be in validating state', 400);
      if (job.validation.validRows === 0) throw new AppError('No valid rows to import', 400);

      // Fire and forget — processing runs in background
      setImmediate(() => processImportJob(String(job._id)));

      res.json({ success: true, data: { jobId, message: 'Import started' } });
    } catch (e) { next(e); }
  }

  // Poll job status
  async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await ImportJob.findOne({ _id: req.params.id, companyId: req.tenantId }).lean();
      if (!job) throw new AppError('Import job not found', 404);
      res.json({ success: true, data: job });
    } catch (e) { next(e); }
  }

  // List all jobs
  async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, entityType, status } = req.query;
      const filter: any = { companyId: req.tenantId };
      if (entityType) filter.entityType = entityType;
      if (status) filter.status = status;

      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        ImportJob.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).select('-filePath').lean(),
        ImportJob.countDocuments(filter),
      ]);

      res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
    } catch (e) { next(e); }
  }

  // Cancel a pending/mapping job
  async cancelJob(req: Request, res: Response, next: NextFunction) {
    try {
      const job = await ImportJob.findOne({ _id: req.params.id, companyId: req.tenantId });
      if (!job) throw new AppError('Import job not found', 404);
      if (['completed', 'failed', 'cancelled'].includes(job.status)) throw new AppError('Cannot cancel job in current state', 400);

      job.status = 'cancelled';
      await job.save();
      res.json({ success: true, message: 'Job cancelled' });
    } catch (e) { next(e); }
  }

  // Get entity field definitions for the mapping UI
  async getFieldDefs(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType } = req.params;
      if (!VALID_ENTITIES.includes(entityType)) throw new AppError('Invalid entityType', 400);
      res.json({ success: true, data: ENTITY_FIELDS[entityType] });
    } catch (e) { next(e); }
  }
}

export const importsController = new ImportsController();
