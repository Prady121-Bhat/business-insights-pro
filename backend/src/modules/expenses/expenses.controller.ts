import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Expense } from '../../models/Expense.model';
import { AppError } from '../../middleware/errorHandler.middleware';
import { cacheService } from '../../services/cache.service';

let expCounter = 1;
async function nextExpenseNumber(tenantId: string): Promise<string> {
  const last = await Expense.findOne({ companyId: tenantId }).sort({ createdAt: -1 }).select('expenseNumber').lean();
  if (last?.expenseNumber) {
    const num = parseInt(last.expenseNumber.replace(/\D/g, ''), 10);
    if (!isNaN(num)) return `EXP-${String(num + 1).padStart(6, '0')}`;
  }
  return `EXP-${String(expCounter++).padStart(6, '0')}`;
}

export class ExpensesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 25, category, paymentStatus, from, to, search, sortBy = 'expenseDate', sortOrder = 'desc' } = req.query;
      const filter: any = { companyId: new Types.ObjectId(req.tenantId!) };

      if (category) filter.category = category;
      if (paymentStatus) filter.paymentStatus = paymentStatus;
      if (from || to) {
        filter.expenseDate = {};
        if (from) filter.expenseDate.$gte = new Date(from as string);
        if (to) filter.expenseDate.$lte = new Date(to as string);
      }
      if (search) filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { expenseNumber: { $regex: search, $options: 'i' } },
      ];

      const skip = (Number(page) - 1) * Number(limit);
      const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      const [data, total] = await Promise.all([
        Expense.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
        Expense.countDocuments(filter),
      ]);

      res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
    } catch (e) { next(e); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await Expense.findOne({ _id: req.params.id, companyId: req.tenantId }).lean();
      if (!expense) throw new AppError('Expense not found', 404);
      res.json({ success: true, data: expense });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, category, amount, taxAmount = 0, currency = 'USD', expenseDate, paymentMethod, paymentStatus, vendor, isRecurring, recurringInterval, tags } = req.body;
      if (!title) throw new AppError('Title is required', 400);
      if (!amount || amount <= 0) throw new AppError('Amount must be positive', 400);
      if (!category) throw new AppError('Category is required', 400);

      const expenseNumber = await nextExpenseNumber(req.tenantId!);

      const expense = await Expense.create({
        companyId: new Types.ObjectId(req.tenantId!),
        expenseNumber,
        title,
        description,
        category,
        amount,
        taxAmount,
        totalAmount: amount + taxAmount,
        currency,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMethod: paymentMethod ?? 'bank_transfer',
        paymentStatus: paymentStatus ?? 'paid',
        vendor,
        isRecurring: isRecurring ?? false,
        recurringInterval: isRecurring ? recurringInterval : undefined,
        tags: tags ?? [],
        createdBy: new Types.ObjectId(req.user!.userId),
      });

      cacheService.invalidateTenant(req.tenantId!);
      res.status(201).json({ success: true, data: expense });
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await Expense.findOne({ _id: req.params.id, companyId: req.tenantId });
      if (!expense) throw new AppError('Expense not found', 404);

      const allowed = ['title', 'description', 'category', 'amount', 'taxAmount', 'currency', 'expenseDate', 'paymentMethod', 'paymentStatus', 'vendor', 'isRecurring', 'recurringInterval', 'tags'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) (expense as any)[key] = req.body[key];
      }
      if (req.body.amount !== undefined || req.body.taxAmount !== undefined) {
        expense.totalAmount = expense.amount + expense.taxAmount;
      }

      await expense.save();
      cacheService.invalidateTenant(req.tenantId!);
      res.json({ success: true, data: expense });
    } catch (e) { next(e); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await Expense.findOneAndDelete({ _id: req.params.id, companyId: req.tenantId });
      if (!expense) throw new AppError('Expense not found', 404);
      cacheService.invalidateTenant(req.tenantId!);
      res.json({ success: true, message: 'Expense deleted' });
    } catch (e) { next(e); }
  }

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query;
      const match: any = { companyId: new Types.ObjectId(req.tenantId!) };
      if (from || to) {
        match.expenseDate = {};
        if (from) match.expenseDate.$gte = new Date(from as string);
        if (to) match.expenseDate.$lte = new Date(to as string);
      }

      const [totals, byCategory] = await Promise.all([
        Expense.aggregate([
          { $match: match },
          { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 }, avgAmount: { $avg: '$totalAmount' } } },
        ]),
        Expense.aggregate([
          { $match: match },
          { $group: { _id: '$category', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } },
        ]),
      ]);

      res.json({ success: true, data: { totals: totals[0] ?? { total: 0, count: 0, avgAmount: 0 }, byCategory } });
    } catch (e) { next(e); }
  }
}

export const expensesController = new ExpensesController();
