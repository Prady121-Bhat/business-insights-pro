import ExcelJS from 'exceljs';

const BRAND_COLOR = '2563EB'; // primary blue
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_COLOR}` } };
const ACCENT_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
const SECTION_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

function headerStyle(ws: ExcelJS.Worksheet, row: number, cols: number) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c);
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } } };
  }
}

function sectionTitle(ws: ExcelJS.Worksheet, row: number, title: string, cols: number) {
  ws.mergeCells(row, 1, row, cols);
  const cell = ws.getCell(row, 1);
  cell.value = title;
  cell.fill = SECTION_FILL;
  cell.font = { bold: true, size: 12, color: { argb: `FF${BRAND_COLOR}` } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
}

function numFmt(ws: ExcelJS.Worksheet, row: number, col: number, isCurrency = true) {
  ws.getCell(row, col).numFmt = isCurrency ? '"$"#,##0.00' : '#,##0.00';
}

function pctFmt(ws: ExcelJS.Worksheet, row: number, col: number) {
  ws.getCell(row, col).numFmt = '0.00"%"';
}

function addTitle(wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet, title: string, subtitle: string) {
  ws.getRow(1).height = 36;
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 18, color: { argb: `FF${BRAND_COLOR}` } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  titleCell.fill = ACCENT_FILL;

  ws.mergeCells('A2:H2');
  const subCell = ws.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { size: 10, color: { argb: 'FF64748B' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.addRow([]);
}

function fmtDate(d: any) { return d ? new Date(d).toLocaleDateString() : ''; }

export async function generateRevenueExcel(data: any, filePath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Business Insights Pro';
  wb.created = new Date();

  // ── Summary Sheet ──────────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Revenue Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
  ws.columns = [
    { key: 'metric', width: 28 }, { key: 'value', width: 20 }, { key: 'gap', width: 4 },
    { key: 'metric2', width: 28 }, { key: 'value2', width: 20 },
  ];

  addTitle(wb, ws, '📊 Revenue Report', `${fmtDate(data.period.startDate)} – ${fmtDate(data.period.endDate)}`);

  sectionTitle(ws, 4, 'KEY METRICS', 5);
  headerStyle(ws, 4, 5);

  const s = data.summary;
  const kpis = [
    ['Total Revenue', s.totalRevenue, 'Total Orders', s.totalOrders],
    ['Gross Profit', s.totalProfit, 'Gross Margin', s.profitMargin],
    ['Net Profit', s.netProfit, 'Net Margin', s.netMargin],
    ['Avg Order Value', s.avgOrderValue, 'Revenue Growth %', s.revenueGrowth],
    ['Total Expenses', s.totalExpenses, '', ''],
  ];
  let r = 5;
  for (const [m1, v1, m2, v2] of kpis) {
    ws.addRow([m1, v1, '', m2, v2]);
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 4).font = { bold: true };
    if (typeof v1 === 'number' && String(m1).includes('Revenue') || String(m1).includes('Profit') || String(m1).includes('Value') || String(m1).includes('Expense')) numFmt(ws, r, 2);
    if (String(m1).includes('%') || String(m1).includes('Margin') || String(m1).includes('Growth')) pctFmt(ws, r, 2);
    if (typeof v2 === 'number' && (String(m2).includes('Revenue') || String(m2).includes('Profit') || String(m2).includes('Value'))) numFmt(ws, r, 5);
    if (String(m2).includes('%') || String(m2).includes('Margin') || String(m2).includes('Growth')) pctFmt(ws, r, 5);
    if (r % 2 === 0) { ws.getCell(r, 1).fill = ACCENT_FILL; ws.getCell(r, 2).fill = ACCENT_FILL; }
    r++;
  }

  ws.addRow([]);

  // ── Trend Sheet ────────────────────────────────────────────────────────────
  const wsTrend = wb.addWorksheet('Daily Trend');
  wsTrend.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Orders', key: 'orders', width: 10 },
    { header: 'Gross Profit', key: 'profit', width: 16, style: { numFmt: '"$"#,##0.00' } },
  ];
  headerStyle(wsTrend, 1, 4);
  data.trend.forEach((t: any, i: number) => {
    wsTrend.addRow({ date: t._id ?? t.date ?? t.label, revenue: t.revenue ?? t.value, orders: t.orders ?? 0, profit: t.profit ?? 0 });
    if (i % 2 === 0) { wsTrend.lastRow!.eachCell((cell) => { cell.fill = ACCENT_FILL; }); }
  });

  // ── Top Products Sheet ─────────────────────────────────────────────────────
  const wsProd = wb.addWorksheet('Top Products');
  wsProd.columns = [
    { header: '#', key: 'rank', width: 6 },
    { header: 'Product', key: 'name', width: 32 },
    { header: 'Units Sold', key: 'qty', width: 14 },
    { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Profit', key: 'profit', width: 16, style: { numFmt: '"$"#,##0.00' } },
  ];
  headerStyle(wsProd, 1, 5);
  data.topProducts.forEach((p: any, i: number) => {
    wsProd.addRow({ rank: i + 1, name: p.productName, qty: p.quantity, revenue: p.revenue, profit: p.profit ?? 0 });
    if (i % 2 === 0) { wsProd.lastRow!.eachCell((cell) => { cell.fill = ACCENT_FILL; }); }
  });

  // ── Channel Sheet ──────────────────────────────────────────────────────────
  const wsCh = wb.addWorksheet('By Channel');
  wsCh.columns = [
    { header: 'Channel', key: 'channel', width: 20 },
    { header: 'Orders', key: 'orders', width: 12 },
    { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: '"$"#,##0.00' } },
  ];
  headerStyle(wsCh, 1, 3);
  data.byChannel.forEach((c: any, i: number) => {
    wsCh.addRow({ channel: c._id, orders: c.count, revenue: c.revenue });
    if (i % 2 === 0) { wsCh.lastRow!.eachCell((cell) => { cell.fill = ACCENT_FILL; }); }
  });

  await wb.xlsx.writeFile(filePath);
}

export async function generateSalesExcel(data: any, filePath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Business Insights Pro';

  const ws = wb.addWorksheet('Sales Transactions', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Order #', key: 'num', width: 16 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Customer', key: 'customer', width: 24 },
    { header: 'Items', key: 'items', width: 8 },
    { header: 'Revenue', key: 'revenue', width: 14, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Profit', key: 'profit', width: 14, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Margin %', key: 'margin', width: 12, style: { numFmt: '0.00"%"' } },
    { header: 'Channel', key: 'channel', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  headerStyle(ws, 1, 9);

  data.sales.forEach((s: any, i: number) => {
    ws.addRow({
      num: s.saleNumber ?? String(s._id).slice(-8),
      date: fmtDate(s.saleDate),
      customer: s.customerId ? `${s.customerId.firstName ?? ''} ${s.customerId.lastName ?? ''}`.trim() : 'Walk-in',
      items: (s.items ?? []).length,
      revenue: s.summary?.grandTotal ?? 0,
      profit: s.summary?.grossProfit ?? 0,
      margin: s.summary?.profitMargin ?? 0,
      channel: s.channel ?? '',
      status: s.status ?? '',
    });
    if (i % 2 === 0) ws.lastRow!.eachCell((cell) => { cell.fill = ACCENT_FILL; });
  });

  await wb.xlsx.writeFile(filePath);
}

export async function generateCustomerExcel(data: any, filePath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Business Insights Pro';

  // Summary
  const wsSummary = wb.addWorksheet('Summary');
  addTitle(wb, wsSummary, '👥 Customer Report', new Date().toLocaleDateString());
  wsSummary.addRow(['Total Customers', data.summary.totalCustomers]);
  wsSummary.addRow(['Repeat Customers', data.summary.repeatCustomers]);
  wsSummary.addRow(['Repeat Rate %', data.summary.repeatRate.toFixed(1)]);
  wsSummary.addRow(['New Customers (period)', data.newCustomers]);
  wsSummary.addRow(['Total Revenue', data.summary.totalRevenue]);
  wsSummary.columns = [{ width: 24 }, { width: 16 }];

  wsSummary.addRow([]);
  wsSummary.addRow(['SEGMENT DISTRIBUTION']);
  wsSummary.addRow(['Segment', 'Count', 'Revenue', 'Avg CLV']);
  const hRow = wsSummary.lastRow!.number;
  headerStyle(wsSummary, hRow, 4);
  data.segmentDist.forEach((seg: any) => {
    wsSummary.addRow([seg._id, seg.count, seg.totalRevenue, seg.avgCLV ?? 0]);
  });

  // Customer list
  const wsCustomers = wb.addWorksheet('All Customers', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsCustomers.columns = [
    { header: 'Name', key: 'name', width: 24 }, { header: 'Email', key: 'email', width: 28 },
    { header: 'Segment', key: 'seg', width: 14 }, { header: 'Orders', key: 'orders', width: 10 },
    { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Avg Order', key: 'aov', width: 14, style: { numFmt: '"$"#,##0.00' } },
    { header: 'CLV', key: 'clv', width: 14, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Churn Risk', key: 'churn', width: 12 }, { header: 'Last Purchase', key: 'last', width: 16 },
  ];
  headerStyle(wsCustomers, 1, 9);
  data.customers.slice(0, 200).forEach((c: any, i: number) => {
    wsCustomers.addRow({
      name: `${c.firstName} ${c.lastName}`,
      email: c.email ?? '', seg: c.segment ?? '',
      orders: c.metrics?.totalOrders ?? 0,
      revenue: c.metrics?.totalRevenue ?? 0,
      aov: c.metrics?.averageOrderValue ?? 0,
      clv: c.metrics?.lifetimeValue ?? 0,
      churn: c.churnRisk?.level ?? '', last: fmtDate(c.metrics?.lastPurchaseDate),
    });
    if (i % 2 === 0) wsCustomers.lastRow!.eachCell((cell) => { cell.fill = ACCENT_FILL; });
  });

  await wb.xlsx.writeFile(filePath);
}

export async function generateInventoryExcel(data: any, filePath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Business Insights Pro';

  // Stock overview
  const wsOverview = wb.addWorksheet('Overview');
  addTitle(wb, wsOverview, '📦 Inventory Report', new Date().toLocaleDateString());
  const s = data.summary ?? {};
  const overviewRows = [
    ['Total Products', s.totalProducts ?? 0], ['Total Units', s.totalUnits ?? 0],
    ['Cost Value', s.totalCostValue ?? 0], ['Retail Value', s.totalRetailValue ?? 0],
    ['Out of Stock', s.outOfStock ?? 0], ['Low Stock', s.lowStock ?? 0],
  ];
  overviewRows.forEach(([k, v]) => { wsOverview.addRow([k, v]); });
  wsOverview.columns = [{ width: 22 }, { width: 18 }];

  // Full product list
  const wsProducts = wb.addWorksheet('All Products', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsProducts.columns = [
    { header: 'SKU', key: 'sku', width: 14 }, { header: 'Product', key: 'name', width: 30 },
    { header: 'Category', key: 'cat', width: 16 }, { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Reorder Pt', key: 'reorder', width: 12 },
    { header: 'Cost Price', key: 'cost', width: 14, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Sell Price', key: 'sell', width: 14, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Margin %', key: 'margin', width: 12, style: { numFmt: '0.00"%"' } },
    { header: 'Velocity', key: 'vel', width: 12 },
    { header: 'Days Inv', key: 'days', width: 12 },
    { header: 'Cost Value', key: 'costval', width: 14, style: { numFmt: '"$"#,##0.00' } },
  ];
  headerStyle(wsProducts, 1, 11);
  data.products.forEach((p: any, i: number) => {
    wsProducts.addRow({
      sku: p.sku, name: p.name, cat: p.category, stock: p.inventory?.currentStock,
      reorder: p.inventory?.reorderPoint, cost: p.pricing?.costPrice, sell: p.pricing?.sellingPrice,
      margin: p.pricing?.margin, vel: p.metrics?.velocityCategory,
      days: p.metrics?.daysOfInventory,
      costval: (p.inventory?.currentStock ?? 0) * (p.pricing?.costPrice ?? 0),
    });
    if (i % 2 === 0) wsProducts.lastRow!.eachCell((cell) => { cell.fill = ACCENT_FILL; });
  });

  // Low stock sheet
  const wsLow = wb.addWorksheet('Low Stock');
  wsLow.columns = wsProducts.columns.slice(0, 8);
  headerStyle(wsLow, 1, 8);
  data.lowStock.forEach((p: any, i: number) => {
    wsLow.addRow({ sku: p.sku, name: p.name, cat: p.category, stock: p.inventory?.currentStock, reorder: p.inventory?.reorderPoint, cost: p.pricing?.costPrice, sell: p.pricing?.sellingPrice, margin: p.pricing?.margin });
    if (i % 2 === 0) wsLow.lastRow!.eachCell((cell) => { cell.fill = ACCENT_FILL; });
  });

  await wb.xlsx.writeFile(filePath);
}

export async function generateExpenseExcel(data: any, filePath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Business Insights Pro';

  const wsSummary = wb.addWorksheet('Summary');
  addTitle(wb, wsSummary, '💰 Expense Report', `${fmtDate(data.period.startDate)} – ${fmtDate(data.period.endDate)}`);
  wsSummary.addRow(['Total Expenses', data.summary.totalExpenses]);
  wsSummary.addRow(['Expense Count', data.summary.count]);
  wsSummary.addRow(['Avg Expense', data.summary.avgExpense]);
  wsSummary.addRow(['Growth vs Prior Period %', data.summary.growth?.toFixed(1)]);

  wsSummary.addRow([]);
  wsSummary.addRow(['BY CATEGORY']);
  wsSummary.addRow(['Category', 'Count', 'Total', '% of Total']);
  const hRow = wsSummary.lastRow!.number;
  headerStyle(wsSummary, hRow, 4);
  const total = data.summary.totalExpenses || 1;
  data.byCategory.forEach((c: any) => {
    wsSummary.addRow([c._id, c.count, c.total, ((c.total / total) * 100).toFixed(1) + '%']);
  });

  const wsExp = wb.addWorksheet('Transactions', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsExp.columns = [
    { header: 'Date', key: 'date', width: 14 }, { header: 'Title', key: 'title', width: 28 },
    { header: 'Category', key: 'cat', width: 18 },
    { header: 'Amount', key: 'amount', width: 14, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Vendor', key: 'vendor', width: 20 }, { header: 'Status', key: 'status', width: 12 },
    { header: 'Recurring', key: 'recurring', width: 12 },
  ];
  headerStyle(wsExp, 1, 7);
  data.expenses.forEach((e: any, i: number) => {
    wsExp.addRow({ date: fmtDate(e.date), title: e.title, cat: e.category, amount: e.amount, vendor: e.vendor ?? '', status: e.status ?? '', recurring: e.isRecurring ? 'Yes' : 'No' });
    if (i % 2 === 0) wsExp.lastRow!.eachCell((cell) => { cell.fill = ACCENT_FILL; });
  });

  await wb.xlsx.writeFile(filePath);
}
