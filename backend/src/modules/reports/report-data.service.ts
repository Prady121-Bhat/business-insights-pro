import { Types } from 'mongoose';
import { Sale } from '../../models/Sale.model';
import { Customer } from '../../models/Customer.model';
import { Product } from '../../models/Product.model';
import { Expense } from '../../models/Expense.model';
import { Forecast } from '../../models/Forecast.model';
import { saleRepository } from '../../repositories/sale.repository';
import { expenseRepository } from '../../repositories/expense.repository';

export interface DateRange { startDate: Date; endDate: Date }

export async function getRevenueReportData(companyId: string, range: DateRange) {
  const cid = new Types.ObjectId(companyId);
  const prevStart = new Date(range.startDate.getTime() - (range.endDate.getTime() - range.startDate.getTime()));

  const [summary, prevSummary, trend, topProducts, byChannel, byCategory, expenses] = await Promise.all([
    saleRepository.getRevenueSummary(companyId, range.startDate, range.endDate),
    saleRepository.getRevenueSummary(companyId, prevStart, range.startDate),
    saleRepository.getRevenueTrend(companyId, range.startDate, range.endDate, 'day'),
    saleRepository.getTopProducts(companyId, range.startDate, range.endDate, 10),
    saleRepository.getSalesByChannel(companyId, range.startDate, range.endDate),
    saleRepository.getSalesByCategory(companyId, range.startDate, range.endDate),
    expenseRepository.getExpenseSummary(companyId, range.startDate, range.endDate),
  ]);

  const curr = summary[0] ?? { totalRevenue: 0, totalOrders: 0, totalProfit: 0, profitMargin: 0, avgOrderValue: 0 };
  const prev = prevSummary[0] ?? { totalRevenue: 0, totalOrders: 0, totalProfit: 0 };
  const exp = expenses[0] ?? { totalExpenses: 0 };

  const revenueGrowth = prev.totalRevenue > 0 ? ((curr.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100 : 0;
  const netProfit = curr.totalProfit - exp.totalExpenses;
  const netMargin = curr.totalRevenue > 0 ? (netProfit / curr.totalRevenue) * 100 : 0;

  return { summary: { ...curr, revenueGrowth, netProfit, netMargin, totalExpenses: exp.totalExpenses }, trend, topProducts, byChannel, byCategory, period: range };
}

export async function getSalesReportData(companyId: string, range: DateRange) {
  const cid = new Types.ObjectId(companyId);

  const [sales, dailyTotals, byCategory] = await Promise.all([
    Sale.find({
      companyId: cid,
      saleDate: { $gte: range.startDate, $lte: range.endDate },
      status: { $nin: ['cancelled', 'refunded'] },
    })
      .sort({ saleDate: -1 })
      .limit(500)
      .populate('customerId', 'firstName lastName email')
      .lean(),

    Sale.aggregate([
      { $match: { companyId: cid, saleDate: { $gte: range.startDate, $lte: range.endDate }, status: { $nin: ['cancelled', 'refunded'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }, revenue: { $sum: '$summary.grandTotal' }, orders: { $sum: 1 }, profit: { $sum: '$summary.grossProfit' } } },
      { $sort: { _id: 1 } },
    ]),

    saleRepository.getSalesByCategory(companyId, range.startDate, range.endDate),
  ]);

  return { sales, dailyTotals, byCategory, period: range };
}

export async function getCustomerReportData(companyId: string, range: DateRange) {
  const cid = new Types.ObjectId(companyId);

  const [customers, segmentDist, topCustomers, churnRisk, newCustomers] = await Promise.all([
    Customer.find({ companyId: cid, isActive: true })
      .sort({ 'metrics.totalRevenue': -1 })
      .limit(200)
      .lean(),

    Customer.aggregate([
      { $match: { companyId: cid, isActive: true } },
      { $group: { _id: '$segment', count: { $sum: 1 }, totalRevenue: { $sum: '$metrics.totalRevenue' }, avgCLV: { $avg: '$metrics.lifetimeValue' } } },
      { $sort: { totalRevenue: -1 } },
    ]),

    Customer.find({ companyId: cid, isActive: true }).sort({ 'metrics.totalRevenue': -1 }).limit(20).lean(),

    Customer.aggregate([
      { $match: { companyId: cid, isActive: true } },
      { $group: { _id: '$churnRisk.level', count: { $sum: 1 }, totalRevenue: { $sum: '$metrics.totalRevenue' } } },
    ]),

    Customer.countDocuments({ companyId: cid, createdAt: { $gte: range.startDate, $lte: range.endDate } }),
  ]);

  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c: any) => c.metrics?.totalOrders >= 2).length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  const totalRevenue = customers.reduce((s: number, c: any) => s + (c.metrics?.totalRevenue ?? 0), 0);

  return { customers, segmentDist, topCustomers, churnRisk, newCustomers, summary: { totalCustomers, repeatCustomers, repeatRate, totalRevenue }, period: range };
}

export async function getInventoryReportData(companyId: string) {
  const cid = new Types.ObjectId(companyId);

  const [products, stockSummary, velocityBreakdown, lowStock, deadInventory] = await Promise.all([
    Product.find({ companyId: cid, isActive: true }).sort({ 'metrics.totalRevenue': -1 }).limit(200).lean(),

    Product.aggregate([
      { $match: { companyId: cid, isActive: true } },
      { $group: { _id: null, totalProducts: { $sum: 1 }, totalUnits: { $sum: '$inventory.currentStock' }, totalCostValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } }, totalRetailValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.sellingPrice'] } }, outOfStock: { $sum: { $cond: [{ $eq: ['$inventory.currentStock', 0] }, 1, 0] } }, lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$inventory.currentStock', 0] }, { $lte: ['$inventory.currentStock', '$inventory.reorderPoint'] }] }, 1, 0] } } } },
    ]),

    Product.aggregate([
      { $match: { companyId: cid, isActive: true } },
      { $group: { _id: '$metrics.velocityCategory', count: { $sum: 1 }, totalRevenue: { $sum: '$metrics.totalRevenue' }, totalStock: { $sum: '$inventory.currentStock' } } },
      { $sort: { totalRevenue: -1 } },
    ]),

    Product.find({ companyId: cid, isActive: true, $expr: { $and: [{ $gt: ['$inventory.currentStock', 0] }, { $lte: ['$inventory.currentStock', '$inventory.reorderPoint'] }] } }).sort({ 'inventory.currentStock': 1 }).limit(50).lean(),

    Product.find({ companyId: cid, isActive: true, 'metrics.velocityCategory': 'dead', 'inventory.currentStock': { $gt: 0 } }).sort({ 'inventory.currentStock': -1 }).limit(50).lean(),
  ]);

  return { products, summary: stockSummary[0], velocityBreakdown, lowStock, deadInventory };
}

export async function getExpenseReportData(companyId: string, range: DateRange) {
  const cid = new Types.ObjectId(companyId);
  const prevStart = new Date(range.startDate.getTime() - (range.endDate.getTime() - range.startDate.getTime()));

  const [expenses, byCategory, trend, prevSummary, currSummary] = await Promise.all([
    Expense.find({ companyId: cid, date: { $gte: range.startDate, $lte: range.endDate } }).sort({ date: -1 }).limit(500).lean(),
    expenseRepository.getExpenseByCategory(companyId, range.startDate, range.endDate),
    expenseRepository.getExpenseTrend(companyId, range.startDate, range.endDate),
    expenseRepository.getExpenseSummary(companyId, prevStart, range.startDate),
    expenseRepository.getExpenseSummary(companyId, range.startDate, range.endDate),
  ]);

  const curr = currSummary[0] ?? { totalExpenses: 0, count: 0, avgExpense: 0 };
  const prev = prevSummary[0] ?? { totalExpenses: 0 };
  const growth = prev.totalExpenses > 0 ? ((curr.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100 : 0;

  return { expenses, byCategory, trend, summary: { ...curr, growth }, period: range };
}

export async function getForecastReportData(companyId: string) {
  const forecasts = await Forecast.find({ companyId }).sort({ generatedAt: -1 }).limit(10).lean();
  return { forecasts };
}
