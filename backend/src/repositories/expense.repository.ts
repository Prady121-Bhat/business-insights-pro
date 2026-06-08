import { Types } from 'mongoose';
import { Expense, IExpense } from '../models/Expense.model';
import { BaseRepository } from './base.repository';

class ExpenseRepository extends BaseRepository<IExpense> {
  constructor() {
    super(Expense);
  }

  async getExpenseSummary(companyId: string, startDate: Date, endDate: Date) {
    return Expense.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          expenseDate: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          avgExpense: { $avg: '$totalAmount' },
        },
      },
    ]);
  }

  async getExpenseByCategory(companyId: string, startDate: Date, endDate: Date) {
    return Expense.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          expenseDate: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);
  }

  async getExpenseTrend(companyId: string, startDate: Date, endDate: Date) {
    return Expense.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          expenseDate: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$expenseDate' },
            month: { $month: '$expenseDate' },
          },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
  }
}

export const expenseRepository = new ExpenseRepository();
