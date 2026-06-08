import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

const BRAND = '#2563EB';
const DARK = '#0F172A';
const MUTED = '#64748B';
const LIGHT_BG = '#F8FAFC';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
const ERROR = '#EF4444';

function fmtCurrency(n: number) { return `$${(n ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` }
function fmtDate(d: any) { return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'; }
function fmtPct(n: number) { return `${(n ?? 0).toFixed(1)}%`; }
function fmtNum(n: number) { return String(Math.round(n ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

interface PdfDoc extends PDFKit.PDFDocument { }

function createDoc(): PdfDoc {
  return new PDFDocument({ margin: 48, size: 'A4', info: { Author: 'Business Insights Pro', Creator: 'Business Insights Pro' } });
}

function addHeader(doc: PdfDoc, title: string, subtitle: string) {
  // Blue bar
  doc.rect(0, 0, doc.page.width, 80).fill(BRAND);
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text(title, 48, 22);
  doc.fontSize(10).font('Helvetica').text(subtitle, 48, 52);
  doc.y = 100;
  doc.fillColor(DARK);
}

function addSectionTitle(doc: PdfDoc, title: string) {
  doc.moveDown(0.4);
  const y = doc.y;
  doc.rect(48, y, doc.page.width - 96, 22).fill(LIGHT_BG);
  doc.fillColor(BRAND).fontSize(11).font('Helvetica-Bold').text(title, 56, y + 5, { lineBreak: false });
  doc.y = y + 30;
  doc.fillColor(DARK);
}

function addKpiRow(doc: PdfDoc, kpis: Array<{ label: string; value: string; color?: string }>) {
  const boxW = (doc.page.width - 96 - (kpis.length - 1) * 8) / kpis.length;
  const startX = 48;
  const y = doc.y;
  const h = 52;

  kpis.forEach((kpi, i) => {
    const x = startX + i * (boxW + 8);
    doc.rect(x, y, boxW, h).fill(LIGHT_BG);
    doc.fillColor(kpi.color ?? BRAND).fontSize(16).font('Helvetica-Bold')
      .text(kpi.value, x, y + 8, { width: boxW, align: 'center', lineBreak: false });
    doc.fillColor(MUTED).fontSize(8).font('Helvetica')
      .text(kpi.label, x, y + 30, { width: boxW, align: 'center', lineBreak: false });
  });

  doc.y = y + h + 10;
  doc.fillColor(DARK);
}

function addTable(doc: PdfDoc, headers: string[], rows: string[][], colWidths?: number[]) {
  const availW = doc.page.width - 96;
  const widths = colWidths ?? headers.map(() => availW / headers.length);
  const rowH = 20;
  let y = doc.y;

  // Header
  doc.rect(48, y, availW, rowH).fill(BRAND);
  let x = 48;
  headers.forEach((h, i) => {
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
      .text(h, x + 4, y + 5, { width: widths[i] - 8, lineBreak: false });
    x += widths[i];
  });
  y += rowH;

  rows.forEach((row, ri) => {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 48;
    }
    if (ri % 2 === 0) doc.rect(48, y, availW, rowH).fill(LIGHT_BG);
    x = 48;
    row.forEach((cell, ci) => {
      doc.fillColor(DARK).fontSize(8.5).font('Helvetica')
        .text(String(cell ?? ''), x + 4, y + 5, { width: widths[ci] - 8, lineBreak: false, ellipsis: true });
      x += widths[ci];
    });
    y += rowH;
  });

  doc.y = y + 8;
  doc.fillColor(DARK);
}

async function pipeToFile(doc: PdfDoc, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(filePath);
    doc.pipe(stream);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

export async function generateRevenuePdf(data: any, filePath: string): Promise<void> {
  const doc = createDoc();
  const { summary, trend, topProducts, byChannel, byCategory } = data;
  const period = `${fmtDate(data.period.startDate)} – ${fmtDate(data.period.endDate)}`;

  addHeader(doc, 'Revenue Report', period);

  addSectionTitle(doc, 'KEY METRICS');
  addKpiRow(doc, [
    { label: 'Total Revenue', value: fmtCurrency(summary.totalRevenue) },
    { label: 'Gross Profit', value: fmtCurrency(summary.totalProfit) },
    { label: 'Net Profit', value: fmtCurrency(summary.netProfit), color: summary.netProfit >= 0 ? SUCCESS : ERROR },
    { label: 'Orders', value: fmtNum(summary.totalOrders) },
  ]);
  addKpiRow(doc, [
    { label: 'Gross Margin', value: fmtPct(summary.profitMargin) },
    { label: 'Net Margin', value: fmtPct(summary.netMargin), color: summary.netMargin >= 10 ? SUCCESS : summary.netMargin >= 0 ? WARNING : ERROR },
    { label: 'Avg Order Value', value: fmtCurrency(summary.avgOrderValue) },
    { label: 'Revenue Growth', value: (summary.revenueGrowth >= 0 ? '+' : '') + fmtPct(summary.revenueGrowth), color: summary.revenueGrowth >= 0 ? SUCCESS : ERROR },
  ]);

  addSectionTitle(doc, 'TOP PRODUCTS');
  addTable(doc,
    ['#', 'Product', 'Units Sold', 'Revenue', 'Profit'],
    topProducts.slice(0, 10).map((p: any, i: number) => [
      String(i + 1), p.productName, fmtNum(p.quantity), fmtCurrency(p.revenue), fmtCurrency(p.profit ?? 0),
    ]),
    [30, 180, 80, 100, 100]
  );

  addSectionTitle(doc, 'REVENUE BY CHANNEL');
  addTable(doc,
    ['Channel', 'Orders', 'Revenue'],
    byChannel.map((c: any) => [c._id, fmtNum(c.count), fmtCurrency(c.revenue)]),
    [180, 100, 120]
  );

  if (byCategory?.length > 0) {
    addSectionTitle(doc, 'REVENUE BY CATEGORY');
    addTable(doc,
      ['Category', 'Orders', 'Revenue'],
      byCategory.map((c: any) => [c._id ?? c._id, fmtNum(c.count ?? c.orders), fmtCurrency(c.revenue)]),
      [180, 100, 120]
    );
  }

  // Footer
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(MUTED).fontSize(8)
      .text(`Business Insights Pro  ·  Generated ${new Date().toLocaleDateString()}  ·  Page ${i + 1} of ${pages.count}`, 48, doc.page.height - 32, { align: 'center', width: doc.page.width - 96 });
  }

  await pipeToFile(doc, filePath);
}

export async function generateCustomerPdf(data: any, filePath: string): Promise<void> {
  const doc = createDoc();

  addHeader(doc, 'Customer Analytics Report', new Date().toLocaleDateString());

  addSectionTitle(doc, 'OVERVIEW');
  addKpiRow(doc, [
    { label: 'Total Customers', value: fmtNum(data.summary.totalCustomers) },
    { label: 'Repeat Customers', value: fmtNum(data.summary.repeatCustomers) },
    { label: 'Repeat Rate', value: fmtPct(data.summary.repeatRate) },
    { label: 'New This Period', value: fmtNum(data.newCustomers) },
  ]);

  addSectionTitle(doc, 'SEGMENT DISTRIBUTION');
  addTable(doc,
    ['Segment', 'Count', 'Total Revenue', 'Avg CLV'],
    data.segmentDist.map((s: any) => [s._id, fmtNum(s.count), fmtCurrency(s.totalRevenue), fmtCurrency(s.avgCLV ?? 0)]),
    [120, 80, 130, 130]
  );

  addSectionTitle(doc, 'TOP CUSTOMERS BY REVENUE');
  addTable(doc,
    ['Customer', 'Segment', 'Orders', 'Revenue', 'Churn Risk'],
    data.topCustomers.slice(0, 15).map((c: any) => [
      `${c.firstName} ${c.lastName}`, c.segment ?? '', fmtNum(c.metrics?.totalOrders),
      fmtCurrency(c.metrics?.totalRevenue), c.churnRisk?.level ?? '—',
    ]),
    [160, 80, 60, 110, 80]
  );

  addSectionTitle(doc, 'CHURN RISK DISTRIBUTION');
  addTable(doc,
    ['Risk Level', 'Customer Count', 'Revenue at Risk'],
    data.churnRisk.map((r: any) => [r._id ?? '—', fmtNum(r.count), fmtCurrency(r.totalRevenue)]),
    [160, 140, 140]
  );

  await pipeToFile(doc, filePath);
}

export async function generateInventoryPdf(data: any, filePath: string): Promise<void> {
  const doc = createDoc();

  addHeader(doc, 'Inventory Report', new Date().toLocaleDateString());

  const s = data.summary ?? {};
  addSectionTitle(doc, 'STOCK OVERVIEW');
  addKpiRow(doc, [
    { label: 'Total Products', value: fmtNum(s.totalProducts) },
    { label: 'Total Units', value: fmtNum(s.totalUnits) },
    { label: 'Out of Stock', value: fmtNum(s.outOfStock), color: s.outOfStock > 0 ? ERROR : SUCCESS },
    { label: 'Low Stock', value: fmtNum(s.lowStock), color: s.lowStock > 0 ? WARNING : SUCCESS },
  ]);
  addKpiRow(doc, [
    { label: 'Cost Value', value: fmtCurrency(s.totalCostValue) },
    { label: 'Retail Value', value: fmtCurrency(s.totalRetailValue) },
    { label: 'Potential Margin', value: fmtCurrency((s.totalRetailValue ?? 0) - (s.totalCostValue ?? 0)) },
    { label: '', value: '' },
  ]);

  if (data.velocityBreakdown?.length > 0) {
    addSectionTitle(doc, 'VELOCITY BREAKDOWN');
    addTable(doc,
      ['Category', 'Products', 'Total Stock', 'Revenue'],
      data.velocityBreakdown.map((v: any) => [v._id, fmtNum(v.count), fmtNum(v.totalStock), fmtCurrency(v.totalRevenue)]),
      [130, 100, 110, 110]
    );
  }

  if (data.lowStock?.length > 0) {
    addSectionTitle(doc, 'LOW STOCK ALERTS');
    addTable(doc,
      ['SKU', 'Product', 'Stock', 'Reorder Pt'],
      data.lowStock.slice(0, 20).map((p: any) => [p.sku ?? '', p.name, fmtNum(p.inventory?.currentStock), fmtNum(p.inventory?.reorderPoint)]),
      [80, 200, 70, 80]
    );
  }

  if (data.deadInventory?.length > 0) {
    addSectionTitle(doc, 'DEAD INVENTORY (No Sales 90+ Days)');
    addTable(doc,
      ['SKU', 'Product', 'Stock', 'Cost Value'],
      data.deadInventory.slice(0, 20).map((p: any) => [
        p.sku ?? '', p.name, fmtNum(p.inventory?.currentStock),
        fmtCurrency((p.inventory?.currentStock ?? 0) * (p.pricing?.costPrice ?? 0)),
      ]),
      [80, 200, 70, 80]
    );
  }

  await pipeToFile(doc, filePath);
}

export async function generateExpensePdf(data: any, filePath: string): Promise<void> {
  const doc = createDoc();
  const period = `${fmtDate(data.period.startDate)} – ${fmtDate(data.period.endDate)}`;

  addHeader(doc, 'Expense Report', period);

  addSectionTitle(doc, 'SUMMARY');
  addKpiRow(doc, [
    { label: 'Total Expenses', value: fmtCurrency(data.summary.totalExpenses) },
    { label: 'Expense Count', value: fmtNum(data.summary.count) },
    { label: 'Avg Expense', value: fmtCurrency(data.summary.avgExpense) },
    { label: 'Growth vs Prior', value: (data.summary.growth >= 0 ? '+' : '') + fmtPct(data.summary.growth), color: data.summary.growth <= 0 ? SUCCESS : ERROR },
  ]);

  addSectionTitle(doc, 'BY CATEGORY');
  const total = data.summary.totalExpenses || 1;
  addTable(doc,
    ['Category', 'Count', 'Total', '% of Total'],
    data.byCategory.map((c: any) => [c._id, fmtNum(c.count), fmtCurrency(c.total), fmtPct((c.total / total) * 100)]),
    [160, 60, 130, 80]
  );

  addSectionTitle(doc, 'TRANSACTIONS');
  addTable(doc,
    ['Date', 'Title', 'Category', 'Amount', 'Vendor'],
    data.expenses.slice(0, 40).map((e: any) => [
      fmtDate(e.date), e.title ?? '', e.category ?? '', fmtCurrency(e.amount), e.vendor ?? '',
    ]),
    [80, 160, 90, 90, 90]
  );

  await pipeToFile(doc, filePath);
}
