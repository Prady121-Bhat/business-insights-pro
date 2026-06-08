import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Sale } from '../../models/Sale.model';
import { Product } from '../../models/Product.model';
import { Customer } from '../../models/Customer.model';
import { AppError } from '../../middleware/errorHandler.middleware';
import { cacheService } from '../../services/cache.service';

function buildFilter(tenantId: string, q: Record<string, any>) {
  const f: any = { companyId: new Types.ObjectId(tenantId) };
  if (q.status) f.status = q.status;
  if (q.paymentStatus) f.paymentStatus = q.paymentStatus;
  if (q.channel) f.channel = q.channel;
  if (q.customerId) f.customerId = new Types.ObjectId(q.customerId as string);
  if (q.from || q.to) {
    f.saleDate = {};
    if (q.from) f.saleDate.$gte = new Date(q.from as string);
    if (q.to) f.saleDate.$lte = new Date(q.to as string);
  }
  if (q.search) {
    f.$or = [
      { saleNumber: { $regex: q.search, $options: 'i' } },
      { customerName: { $regex: q.search, $options: 'i' } },
      { 'items.productName': { $regex: q.search, $options: 'i' } },
    ];
  }
  return f;
}

function calcSummary(items: any[]) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalDiscount = items.reduce((s, i) => s + (i.discount ?? 0), 0);
  const totalTax = items.reduce((s, i) => s + (i.taxAmount ?? 0), 0);
  const totalCost = items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
  const grandTotal = subtotal - totalDiscount + totalTax;
  const grossProfit = grandTotal - totalCost;
  const profitMargin = grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0;
  return { subtotal, totalDiscount, totalTax, shippingCost: 0, grandTotal, totalCost, grossProfit, profitMargin };
}

async function enrichItems(items: any[], tenantId: string) {
  return Promise.all(items.map(async (item) => {
    const product = await Product.findOne({ companyId: tenantId, _id: item.productId }).lean();
    if (!product) throw new AppError(`Product ${item.productId} not found`, 404);
    const unitPrice = item.unitPrice ?? product.pricing.sellingPrice;
    const costPrice = product.pricing.costPrice;
    const quantity = item.quantity;
    const discount = item.discount ?? 0;
    const taxRate = item.taxRate ?? product.pricing.taxRate ?? 0;
    const subtotal = quantity * unitPrice - discount;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const profit = total - quantity * costPrice;
    return {
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      quantity,
      unitPrice,
      costPrice,
      discount,
      taxRate,
      taxAmount,
      subtotal,
      total,
      profit,
    };
  }));
}

let saleCounter = 1;
async function nextSaleNumber(tenantId: string): Promise<string> {
  const last = await Sale.findOne({ companyId: tenantId }).sort({ createdAt: -1 }).select('saleNumber').lean();
  if (last?.saleNumber) {
    const num = parseInt(last.saleNumber.replace(/\D/g, ''), 10);
    if (!isNaN(num)) return `SL-${String(num + 1).padStart(6, '0')}`;
  }
  return `SL-${String(saleCounter++).padStart(6, '0')}`;
}

export class SalesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 25, sortBy = 'saleDate', sortOrder = 'desc', ...rest } = req.query;
      const filter = buildFilter(req.tenantId!, rest);
      const skip = (Number(page) - 1) * Number(limit);
      const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      const [data, total] = await Promise.all([
        Sale.find(filter).sort(sort).skip(skip).limit(Number(limit))
          .populate('customerId', 'firstName lastName email')
          .lean(),
        Sale.countDocuments(filter),
      ]);

      res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
    } catch (e) { next(e); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await Sale.findOne({ _id: req.params.id, companyId: req.tenantId })
        .populate('customerId', 'firstName lastName email phone')
        .lean();
      if (!sale) throw new AppError('Sale not found', 404);
      res.json({ success: true, data: sale });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, customerId, customerName, channel, paymentMethod, paymentStatus, saleDate, notes, tags, region } = req.body;
      if (!items?.length) throw new AppError('At least one item required', 400);

      const enriched = await enrichItems(items, req.tenantId!);
      const summary = calcSummary(enriched);
      const saleNumber = await nextSaleNumber(req.tenantId!);

      // Resolve customerName if customerId given
      let resolvedName = customerName;
      if (customerId && !customerName) {
        const cust = await Customer.findOne({ _id: customerId, companyId: req.tenantId }).lean();
        if (cust) resolvedName = `${cust.firstName} ${cust.lastName}`.trim();
      }

      const sale = await Sale.create({
        companyId: new Types.ObjectId(req.tenantId!),
        saleNumber,
        customerId: customerId ? new Types.ObjectId(customerId) : undefined,
        customerName: resolvedName,
        items: enriched,
        summary,
        channel: channel ?? 'in_store',
        paymentMethod: paymentMethod ?? 'cash',
        paymentStatus: paymentStatus ?? 'paid',
        status: 'confirmed',
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        notes,
        tags: tags ?? [],
        region,
        createdBy: new Types.ObjectId(req.user!.userId),
      });

      cacheService.invalidateTenant(req.tenantId!);
      res.status(201).json({ success: true, data: sale });
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await Sale.findOne({ _id: req.params.id, companyId: req.tenantId });
      if (!sale) throw new AppError('Sale not found', 404);
      if (['cancelled', 'refunded'].includes(sale.status)) throw new AppError('Cannot edit cancelled or refunded sale', 400);

      const allowed = ['status', 'paymentStatus', 'paymentMethod', 'paymentDate', 'deliveryDate', 'notes', 'tags', 'channel', 'region'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) (sale as any)[key] = req.body[key];
      }

      // Re-enrich items if provided
      if (req.body.items?.length) {
        sale.items = await enrichItems(req.body.items, req.tenantId!) as any;
        sale.summary = calcSummary(sale.items) as any;
      }

      await sale.save();
      cacheService.invalidateTenant(req.tenantId!);
      res.json({ success: true, data: sale });
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await Sale.findOne({ _id: req.params.id, companyId: req.tenantId });
      if (!sale) throw new AppError('Sale not found', 404);
      sale.status = 'cancelled';
      await sale.save();
      cacheService.invalidateTenant(req.tenantId!);
      res.json({ success: true, message: 'Sale cancelled' });
    } catch (e) { next(e); }
  }

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query;
      const match: any = { companyId: new Types.ObjectId(req.tenantId!), status: { $ne: 'cancelled' } };
      if (from || to) {
        match.saleDate = {};
        if (from) match.saleDate.$gte = new Date(from as string);
        if (to) match.saleDate.$lte = new Date(to as string);
      }

      const [agg] = await Sale.aggregate([
        { $match: match },
        { $group: { _id: null, totalRevenue: { $sum: '$summary.grandTotal' }, totalProfit: { $sum: '$summary.grossProfit' }, totalOrders: { $sum: 1 }, avgOrderValue: { $avg: '$summary.grandTotal' } } },
      ]);

      res.json({ success: true, data: agg ?? { totalRevenue: 0, totalProfit: 0, totalOrders: 0, avgOrderValue: 0 } });
    } catch (e) { next(e); }
  }
}

export const salesController = new SalesController();
