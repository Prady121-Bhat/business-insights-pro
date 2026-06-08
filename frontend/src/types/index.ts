export type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'analyst' | 'employee' | 'viewer';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  companyId?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: { email: boolean; inApp: boolean };
  };
  createdAt: string;
}

export interface Company {
  _id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  address?: { street?: string; city?: string; state?: string; country?: string; zipCode?: string };
  settings: {
    currency: string;
    timezone: string;
    taxRate: number;
    fiscalYearStart: number;
    theme: 'light' | 'dark';
    dateFormat: string;
    numberFormat: string;
  };
  subscription: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'trialing' | 'past_due' | 'cancelled';
    trialEndsAt?: string;
    maxUsers: number;
    maxDataRows: number;
  };
}

export interface KPIMetric {
  value: number;
  previousValue?: number;
  growth?: number;
  label?: string;
}

export interface OverviewKPIs {
  period: { startDate: string; endDate: string };
  kpis: {
    revenue: KPIMetric;
    grossProfit: KPIMetric;
    netProfit: KPIMetric;
    expenses: KPIMetric;
    orders: KPIMetric;
    avgOrderValue: KPIMetric;
    customers: KPIMetric & { newThisPeriod: number };
    profitMargin: KPIMetric;
  };
}

export interface TrendDataPoint {
  _id: { year: number; month?: number; day?: number };
  revenue: number;
  profit: number;
  orders: number;
  avgOrderValue: number;
}

export interface RevenueTrend {
  period: { startDate: string; endDate: string };
  granularity: string;
  trend: TrendDataPoint[];
  categoryBreakdown: Array<{ _id: string; revenue: number; quantity: number; orders: number }>;
  channelBreakdown: Array<{ _id: string; revenue: number; orders: number; avgOrderValue: number }>;
}

export interface TopProduct {
  _id: string;
  productName: string;
  sku: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  orders: number;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  retentionRate: number;
  atRiskCount: number;
  churnedCount: number;
  segmentDistribution: Array<{ _id: string; count: number; totalRevenue: number; avgLifetimeValue: number }>;
  churnRiskDistribution: Array<{ _id: string; count: number; avgRevenue: number }>;
  topCustomers: Customer[];
  growthTrend: Array<{ _id: { year: number; month: number }; newCustomers: number }>;
}

export interface Customer {
  _id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email?: string;
  phone?: string;
  segment: 'vip' | 'loyal' | 'regular' | 'at_risk' | 'lost' | 'new';
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastPurchaseDate?: string;
    lifetimeValue: number;
  };
  churnRisk: { score: number; level: 'low' | 'medium' | 'high' };
  createdAt: string;
}

export interface InventoryAnalytics {
  summary: {
    totalProducts: number;
    outOfStockCount: number;
    lowStockCount: number;
    totalCostValue: number;
    totalRetailValue: number;
    totalUnits: number;
  };
  lowStockProducts: Product[];
  deadInventory: Product[];
  velocityBreakdown: Array<{ _id: string; count: number; totalRevenue: number }>;
}

export interface Product {
  _id: string;
  sku: string;
  name: string;
  category: string;
  pricing: { costPrice: number; sellingPrice: number; margin: number };
  inventory: { currentStock: number; reorderPoint: number };
  metrics: { totalSold: number; totalRevenue: number; velocityCategory: string };
  isActive: boolean;
}

export interface Insight {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metric?: number;
  recommendation: string;
  actionUrl?: string;
}

export interface HeatmapPoint {
  _id: { dayOfWeek: number; hour: number };
  orders: number;
  revenue: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type DateRange = { startDate: Date | null; endDate: Date | null };
export type Granularity = 'day' | 'week' | 'month' | 'year';
export type Theme = 'light' | 'dark';
