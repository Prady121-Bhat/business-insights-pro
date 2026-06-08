import { Types } from 'mongoose';
import { ImportJob, IImportJob } from '../../models/ImportJob.model';
import { Customer } from '../../models/Customer.model';
import { Product } from '../../models/Product.model';
import { Expense } from '../../models/Expense.model';
import { Sale } from '../../models/Sale.model';
import { cacheService } from '../../services/cache.service';
import { notificationService } from '../../services/notification.service';
import { logger } from '../../config/logger';
import { ENTITY_FIELDS, validateRows } from './import-validators';
import { parseFile } from './import-parser.service';

async function updateProgress(job: IImportJob, processed: number) {
  const total = job.progress.total || 1;
  job.progress.processed = processed;
  job.progress.percentage = Math.round((processed / total) * 100);
  await ImportJob.findByIdAndUpdate(job._id, { $set: { 'progress.processed': processed, 'progress.percentage': job.progress.percentage } });
}

async function processCustomers(rows: Record<string, any>[], mapping: Record<string, string>, companyId: string, job: IImportJob) {
  const fieldToCsv = new Map(Object.entries(mapping).map(([col, field]) => [field, col]));
  const g = (row: Record<string, any>, field: string) => {
    const col = fieldToCsv.get(field);
    return col ? String(row[col] ?? '').trim() : '';
  };

  let created = 0, updated = 0, failed = 0;
  const cid = new Types.ObjectId(companyId);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const email = g(row, 'email').toLowerCase();
      const firstName = g(row, 'firstName');
      const lastName = g(row, 'lastName');

      const data: any = {
        companyId: cid,
        firstName,
        lastName,
        ...(email ? { email } : {}),
        ...(g(row, 'phone') ? { phone: g(row, 'phone') } : {}),
        ...(g(row, 'company') ? { company: g(row, 'company') } : {}),
        ...(g(row, 'city') ? { 'address.city': g(row, 'city') } : {}),
        ...(g(row, 'country') ? { 'address.country': g(row, 'country') } : {}),
        ...(g(row, 'notes') ? { notes: g(row, 'notes') } : {}),
        segment: g(row, 'segment') || 'new',
      };

      const filter = email ? { companyId: cid, email } : { companyId: cid, firstName, lastName };
      const result = await Customer.findOneAndUpdate(filter, { $set: data }, { upsert: true, new: true });
      if (result.isNew !== false) created++; else updated++;
    } catch (err: any) {
      failed++;
      logger.warn('Customer import row error', { row: i + 2, error: err.message });
    }

    if (i % 50 === 0) await updateProgress(job, i + 1);
  }

  return { created, updated, failed, skipped: 0 };
}

async function processProducts(rows: Record<string, any>[], mapping: Record<string, string>, companyId: string, job: IImportJob) {
  const fieldToCsv = new Map(Object.entries(mapping).map(([col, field]) => [field, col]));
  const g = (row: Record<string, any>, field: string) => {
    const col = fieldToCsv.get(field);
    return col ? String(row[col] ?? '').trim() : '';
  };
  const n = (row: Record<string, any>, field: string) => parseFloat(g(row, field).replace(/[,$]/g, '')) || 0;

  let created = 0, updated = 0, failed = 0;
  const cid = new Types.ObjectId(companyId);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const sku = g(row, 'sku');
      const costPrice = n(row, 'costPrice');
      const sellingPrice = n(row, 'sellingPrice');
      const margin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;

      const data: any = {
        companyId: cid,
        name: g(row, 'name'),
        sku,
        category: g(row, 'category'),
        ...(g(row, 'brand') ? { brand: g(row, 'brand') } : {}),
        ...(g(row, 'description') ? { description: g(row, 'description') } : {}),
        pricing: { costPrice, sellingPrice, margin, taxRate: n(row, 'taxRate') || 0 },
        inventory: {
          currentStock: n(row, 'currentStock') || 0,
          reorderPoint: n(row, 'reorderPoint') || 10,
          reorderQuantity: n(row, 'reorderQuantity') || 50,
        },
        metrics: { velocityCategory: 'slow', totalSold: 0, totalRevenue: 0, averageMonthlySales: 0, daysOfInventory: 9999, turnoverRate: 0 },
        isActive: true,
      };

      const result = await Product.findOneAndUpdate({ companyId: cid, sku }, { $set: data }, { upsert: true, new: true });
      // Mongoose doesn't reliably set isNew on upsert — use a workaround
      if (result.createdAt && result.updatedAt && result.createdAt.getTime() === result.updatedAt.getTime()) created++; else updated++;
    } catch (err: any) {
      failed++;
    }

    if (i % 50 === 0) await updateProgress(job, i + 1);
  }

  return { created, updated, failed, skipped: 0 };
}

async function processExpenses(rows: Record<string, any>[], mapping: Record<string, string>, companyId: string, job: IImportJob) {
  const fieldToCsv = new Map(Object.entries(mapping).map(([col, field]) => [field, col]));
  const g = (row: Record<string, any>, field: string) => {
    const col = fieldToCsv.get(field);
    return col ? String(row[col] ?? '').trim() : '';
  };

  let created = 0, failed = 0;
  const cid = new Types.ObjectId(companyId);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const amount = parseFloat(g(row, 'amount').replace(/[,$]/g, ''));
      const dateRaw = g(row, 'date');
      const date = new Date(dateRaw);

      await Expense.create({
        companyId: cid,
        title: g(row, 'title'),
        amount,
        category: g(row, 'category') || 'other',
        date,
        ...(g(row, 'vendor') ? { vendor: g(row, 'vendor') } : {}),
        ...(g(row, 'notes') ? { notes: g(row, 'notes') } : {}),
        isRecurring: ['true', 'yes', '1'].includes(g(row, 'isRecurring').toLowerCase()),
        status: 'approved',
      });
      created++;
    } catch (err: any) {
      failed++;
    }

    if (i % 50 === 0) await updateProgress(job, i + 1);
  }

  return { created, updated: 0, failed, skipped: 0 };
}

async function processSales(rows: Record<string, any>[], mapping: Record<string, string>, companyId: string, job: IImportJob) {
  const fieldToCsv = new Map(Object.entries(mapping).map(([col, field]) => [field, col]));
  const g = (row: Record<string, any>, field: string) => {
    const col = fieldToCsv.get(field);
    return col ? String(row[col] ?? '').trim() : '';
  };

  let created = 0, failed = 0, skipped = 0;
  const cid = new Types.ObjectId(companyId);

  // Cache SKU->productId within import
  const skuCache = new Map<string, { _id: Types.ObjectId; pricing: any; name: string } | null>();

  const getProduct = async (sku: string) => {
    if (skuCache.has(sku)) return skuCache.get(sku)!;
    const p = await Product.findOne({ companyId: cid, sku }).select('_id pricing name').lean();
    skuCache.set(sku, p as any);
    return p as any;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const sku = g(row, 'productSku');
      const product = await getProduct(sku);
      if (!product) { skipped++; continue; }

      const qty = parseFloat(g(row, 'quantity')) || 1;
      const unitPrice = parseFloat(g(row, 'unitPrice').replace(/[,$]/g, '')) || product.pricing?.sellingPrice || 0;
      const discount = parseFloat(g(row, 'discount').replace(/[,$]/g, '')) || 0;
      const subtotal = qty * unitPrice;
      const discountAmount = discount;
      const total = subtotal - discountAmount;
      const costPerUnit = product.pricing?.costPrice ?? 0;
      const grossProfit = total - qty * costPerUnit;
      const profitMargin = total > 0 ? (grossProfit / total) * 100 : 0;

      const saleDate = new Date(g(row, 'saleDate'));
      const channel = g(row, 'channel') || 'other';

      // Lookup or create customer
      let customerId: Types.ObjectId | undefined;
      const customerEmail = g(row, 'customerEmail');
      if (customerEmail) {
        const customer = await Customer.findOne({ companyId: cid, email: customerEmail }).lean();
        if (customer) customerId = customer._id as Types.ObjectId;
      }

      await Sale.create({
        companyId: cid,
        saleDate,
        ...(customerId ? { customerId } : {}),
        items: [{
          productId: product._id,
          productName: product.name,
          sku,
          quantity: qty,
          unitPrice,
          discount: discountAmount,
          subtotal,
          total,
          costPerUnit,
          profit: grossProfit,
        }],
        summary: {
          subtotal,
          totalDiscount: discountAmount,
          taxAmount: 0,
          grandTotal: total,
          grossProfit,
          profitMargin,
        },
        channel,
        status: 'completed',
        notes: g(row, 'notes'),
        saleNumber: `IMP-${Date.now()}-${i}`,
      });
      created++;
    } catch (err: any) {
      failed++;
      logger.warn('Sale import row error', { row: i + 2, error: err.message });
    }

    if (i % 25 === 0) await updateProgress(job, i + 1);
  }

  return { created, updated: 0, failed, skipped };
}

const PROCESSORS = {
  customers: processCustomers,
  products: processProducts,
  expenses: processExpenses,
  sales: processSales,
};

export async function processImportJob(jobId: string): Promise<void> {
  const job = await ImportJob.findById(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    job.startedAt = new Date();
    await job.save();

    const { headers, rows } = await parseFile(job.filePath, job.fileType);

    job.progress.total = rows.length;
    await job.save();

    const processor = PROCESSORS[job.entityType];
    if (!processor) throw new Error(`No processor for entity type: ${job.entityType}`);

    // Only process valid rows — re-validate with stored mapping
    const { validRows: validCount, errors } = validateRows(rows, job.columnMapping, job.entityType);
    const validRowData = rows.filter((_row, idx) => {
      const rowNum = idx + 2;
      return !errors.some((e) => e.row === rowNum);
    });

    const result = await processor(validRowData, job.columnMapping, String(job.companyId), job);

    job.status = 'completed';
    job.result = result;
    job.progress.processed = rows.length;
    job.progress.percentage = 100;
    job.completedAt = new Date();
    await job.save();

    cacheService.invalidateTenant(String(job.companyId));
    logger.info('Import completed', { jobId, entityType: job.entityType, result });

    await notificationService.createImportNotification(
      String(job.companyId),
      String(job.createdBy),
      'complete',
      { fileName: job.fileName, entityType: job.entityType, result },
    );
  } catch (err: any) {
    await ImportJob.findByIdAndUpdate(jobId, {
      $set: { status: 'failed', errorMessage: err.message, completedAt: new Date() },
    });
    logger.error('Import failed', { jobId, error: err.message });

    if (job.createdBy) {
      await notificationService.createImportNotification(
        String(job.companyId),
        String(job.createdBy),
        'failed',
        { fileName: job.fileName, entityType: job.entityType, errorMessage: err.message },
      );
    }
  }
}
