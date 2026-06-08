import { createWriteStream } from 'fs';
import path from 'path';
import { env } from '../../../config/env';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(row: any[]): string {
  return row.map(escapeCsv).join(',');
}

async function writeCsv(filePath: string, headers: string[], rows: any[][]): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(filePath, { encoding: 'utf8' });
    stream.write('﻿'); // BOM for Excel UTF-8
    stream.write(rowToCsv(headers) + '\n');
    for (const row of rows) {
      stream.write(rowToCsv(row) + '\n');
    }
    stream.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

function fmtDate(d: any) { return d ? new Date(d).toLocaleDateString() : ''; }
function fmtNum(n: any) { return n !== null && n !== undefined ? Number(n).toFixed(2) : '0.00'; }

export async function generateRevenueCsv(data: any, filePath: string): Promise<void> {
  const { summary, trend, topProducts, byChannel } = data;

  const rows: any[][] = [
    ['REVENUE REPORT'],
    ['Period', `${fmtDate(data.period.startDate)} - ${fmtDate(data.period.endDate)}`],
    [],
    ['SUMMARY'],
    ['Metric', 'Value'],
    ['Total Revenue', fmtNum(summary.totalRevenue)],
    ['Total Orders', summary.totalOrders],
    ['Gross Profit', fmtNum(summary.totalProfit)],
    ['Gross Margin %', fmtNum(summary.profitMargin)],
    ['Net Profit', fmtNum(summary.netProfit)],
    ['Net Margin %', fmtNum(summary.netMargin)],
    ['Avg Order Value', fmtNum(summary.avgOrderValue)],
    ['Revenue Growth %', fmtNum(summary.revenueGrowth)],
    [],
    ['DAILY TREND'],
    ['Date', 'Revenue', 'Orders', 'Profit'],
    ...trend.map((t: any) => [t._id ?? t.date ?? t.label, fmtNum(t.revenue ?? t.value), t.orders ?? 0, fmtNum(t.profit ?? 0)]),
    [],
    ['TOP PRODUCTS'],
    ['Product', 'Quantity', 'Revenue', 'Profit'],
    ...topProducts.map((p: any) => [p.productName, p.quantity, fmtNum(p.revenue), fmtNum(p.profit ?? 0)]),
    [],
    ['BY CHANNEL'],
    ['Channel', 'Orders', 'Revenue'],
    ...byChannel.map((c: any) => [c._id, c.count, fmtNum(c.revenue)]),
  ];

  await writeCsv(filePath, [], rows);
}

export async function generateSalesCsv(data: any, filePath: string): Promise<void> {
  const headers = ['Order Number', 'Date', 'Customer', 'Items', 'Revenue', 'Profit', 'Margin %', 'Channel', 'Status'];
  const rows = data.sales.map((s: any) => [
    s.saleNumber ?? s._id,
    fmtDate(s.saleDate),
    s.customerId ? `${s.customerId.firstName ?? ''} ${s.customerId.lastName ?? ''}`.trim() : 'N/A',
    (s.items ?? []).length,
    fmtNum(s.summary?.grandTotal),
    fmtNum(s.summary?.grossProfit),
    fmtNum(s.summary?.profitMargin),
    s.channel ?? '',
    s.status ?? '',
  ]);
  await writeCsv(filePath, headers, rows);
}

export async function generateCustomerCsv(data: any, filePath: string): Promise<void> {
  const headers = ['Name', 'Email', 'Phone', 'Segment', 'Total Orders', 'Total Revenue', 'Avg Order Value', 'Lifetime Value', 'Churn Risk', 'Last Purchase'];
  const rows = data.customers.map((c: any) => [
    `${c.firstName} ${c.lastName}`,
    c.email ?? '',
    c.phone ?? '',
    c.segment ?? '',
    c.metrics?.totalOrders ?? 0,
    fmtNum(c.metrics?.totalRevenue),
    fmtNum(c.metrics?.averageOrderValue),
    fmtNum(c.metrics?.lifetimeValue),
    c.churnRisk?.level ?? '',
    fmtDate(c.metrics?.lastPurchaseDate),
  ]);
  await writeCsv(filePath, headers, rows);
}

export async function generateInventoryCsv(data: any, filePath: string): Promise<void> {
  const headers = ['SKU', 'Product Name', 'Category', 'Brand', 'Stock', 'Reorder Point', 'Cost Price', 'Selling Price', 'Margin %', 'Velocity', 'Days of Inventory', 'Cost Value', 'Retail Value'];
  const rows = data.products.map((p: any) => [
    p.sku ?? '',
    p.name,
    p.category ?? '',
    p.brand ?? '',
    p.inventory?.currentStock ?? 0,
    p.inventory?.reorderPoint ?? 0,
    fmtNum(p.pricing?.costPrice),
    fmtNum(p.pricing?.sellingPrice),
    fmtNum(p.pricing?.margin),
    p.metrics?.velocityCategory ?? '',
    p.metrics?.daysOfInventory ?? '',
    fmtNum((p.inventory?.currentStock ?? 0) * (p.pricing?.costPrice ?? 0)),
    fmtNum((p.inventory?.currentStock ?? 0) * (p.pricing?.sellingPrice ?? 0)),
  ]);
  await writeCsv(filePath, headers, rows);
}

export async function generateExpenseCsv(data: any, filePath: string): Promise<void> {
  const headers = ['Date', 'Title', 'Category', 'Amount', 'Vendor', 'Status', 'Recurring'];
  const rows = data.expenses.map((e: any) => [
    fmtDate(e.date),
    e.title ?? '',
    e.category ?? '',
    fmtNum(e.amount),
    e.vendor ?? '',
    e.status ?? '',
    e.isRecurring ? 'Yes' : 'No',
  ]);
  await writeCsv(filePath, headers, rows);
}
