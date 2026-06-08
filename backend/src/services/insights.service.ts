import { Types } from 'mongoose';
import { Sale } from '../models/Sale.model';
import { Customer } from '../models/Customer.model';
import { Product } from '../models/Product.model';
import { Expense } from '../models/Expense.model';
import { Notification } from '../models/Notification.model';
import { Settings } from '../models/Settings.model';
import { saleRepository } from '../repositories/sale.repository';
import { expenseRepository } from '../repositories/expense.repository';
import { logger } from '../config/logger';

export interface Insight {
  type: string;
  category: 'revenue' | 'inventory' | 'customers' | 'expenses' | 'growth' | 'operations';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metric?: number;
  metricLabel?: string;
  recommendation: string;
  actionUrl?: string;
  impact?: 'high' | 'medium' | 'low';
}

class InsightsService {
  private async getSettings(companyId: string) {
    return Settings.findOne({ companyId });
  }

  async generateInsights(companyId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const settings = await this.getSettings(companyId);
    const revenueDropThreshold = settings?.notifications.revenueDropThreshold ?? 20;
    const churnDays = settings?.analytics.churnThresholdDays ?? 90;

    const [currRevenue, prevRevenue, currExpenses, prevExpenses] = await Promise.all([
      saleRepository.getRevenueSummary(companyId, thirtyDaysAgo, now),
      saleRepository.getRevenueSummary(companyId, sixtyDaysAgo, thirtyDaysAgo),
      expenseRepository.getExpenseSummary(companyId, thirtyDaysAgo, now),
      expenseRepository.getExpenseSummary(companyId, sixtyDaysAgo, thirtyDaysAgo),
    ]);

    const curr = currRevenue[0];
    const prev = prevRevenue[0];
    const currExp = currExpenses[0];
    const prevExp = prevExpenses[0];

    // ── Revenue insights ──────────────────────────────────────────────────────
    if (curr && prev && prev.totalRevenue > 0) {
      const revGrowth = ((curr.totalRevenue - prev.totalRevenue) / prev.totalRevenue) * 100;

      if (revGrowth <= -revenueDropThreshold) {
        insights.push({
          type: 'revenue_drop', category: 'revenue', severity: 'error', impact: 'high',
          title: 'Significant Revenue Drop Detected',
          message: `Revenue fell ${Math.abs(revGrowth).toFixed(1)}% vs previous 30 days ($${prev.totalRevenue.toFixed(0)} → $${curr.totalRevenue.toFixed(0)}).`,
          metric: revGrowth, metricLabel: 'Revenue Change',
          recommendation: 'Review top-selling products for stock issues and check if key customers churned. Consider a promotional campaign.',
          actionUrl: '/analytics/revenue',
        });
      } else if (revGrowth >= 20) {
        insights.push({
          type: 'revenue_spike', category: 'revenue', severity: 'success', impact: 'high',
          title: 'Strong Revenue Growth',
          message: `Revenue grew ${revGrowth.toFixed(1)}% vs previous 30 days — up $${(curr.totalRevenue - prev.totalRevenue).toFixed(0)}.`,
          metric: revGrowth, metricLabel: 'Revenue Growth',
          recommendation: "Identify which products or channels drove this growth and scale what's working.",
          actionUrl: '/analytics/revenue',
        });
      }

      // AOV decline
      if (curr.avgOrderValue && prev.avgOrderValue && curr.avgOrderValue < prev.avgOrderValue * 0.85) {
        const aovDrop = ((curr.avgOrderValue - prev.avgOrderValue) / prev.avgOrderValue) * 100;
        insights.push({
          type: 'aov_drop', category: 'revenue', severity: 'warning', impact: 'medium',
          title: 'Average Order Value Declining',
          message: `AOV dropped ${Math.abs(aovDrop).toFixed(1)}% — from $${prev.avgOrderValue.toFixed(2)} to $${curr.avgOrderValue.toFixed(2)}.`,
          metric: curr.avgOrderValue, metricLabel: 'Avg Order Value',
          recommendation: 'Introduce upsell prompts, product bundles, or review discount policies.',
          actionUrl: '/analytics/revenue',
        });
      }

      // Gross margin compression
      if (curr.profitMargin && prev.profitMargin && curr.profitMargin < prev.profitMargin - 5) {
        insights.push({
          type: 'margin_compression', category: 'revenue', severity: 'warning', impact: 'high',
          title: 'Gross Margin Compressing',
          message: `Gross margin fell from ${prev.profitMargin.toFixed(1)}% to ${curr.profitMargin.toFixed(1)}% — a ${(prev.profitMargin - curr.profitMargin).toFixed(1)}pp decline.`,
          metric: curr.profitMargin, metricLabel: 'Gross Margin',
          recommendation: 'Review COGS per product. Check if discounting is eroding margins on high-volume items.',
          actionUrl: '/analytics/revenue',
        });
      }
    }

    // Net profit / operating loss
    if (curr && currExp) {
      const netProfit = curr.totalProfit - currExp.totalExpenses;
      const netMargin = curr.totalRevenue > 0 ? (netProfit / curr.totalRevenue) * 100 : 0;
      if (netProfit < 0) {
        insights.push({
          type: 'negative_profit', category: 'expenses', severity: 'error', impact: 'high',
          title: 'Operating at a Loss',
          message: `Net profit is -$${Math.abs(netProfit).toFixed(0)} this period. Revenue isn't covering operating costs.`,
          metric: netProfit, metricLabel: 'Net Profit',
          recommendation: 'Immediate action: review highest expense categories and identify revenue growth levers.',
          actionUrl: '/analytics/revenue',
        });
      } else if (netMargin > 20) {
        insights.push({
          type: 'strong_margin', category: 'revenue', severity: 'success', impact: 'medium',
          title: 'Excellent Net Margin',
          message: `Net profit margin is ${netMargin.toFixed(1)}% — well above industry benchmarks.`,
          metric: netMargin, metricLabel: 'Net Margin',
          recommendation: 'Reinvest surplus into growth channels: marketing, inventory expansion, or product development.',
          actionUrl: '/analytics/revenue',
        });
      }
    }

    // ── Expense insights ──────────────────────────────────────────────────────
    if (currExp && prevExp && prevExp.totalExpenses > 0) {
      const expGrowth = ((currExp.totalExpenses - prevExp.totalExpenses) / prevExp.totalExpenses) * 100;
      if (expGrowth > 30) {
        insights.push({
          type: 'expense_spike', category: 'expenses', severity: 'warning', impact: 'high',
          title: 'Expense Spike Detected',
          message: `Operating expenses increased ${expGrowth.toFixed(1)}% vs last month ($${prevExp.totalExpenses.toFixed(0)} → $${currExp.totalExpenses.toFixed(0)}).`,
          metric: expGrowth, metricLabel: 'Expense Growth',
          recommendation: 'Review expense categories for unexpected increases. Compare against revenue growth to assess profitability impact.',
          actionUrl: '/analytics/expenses',
        });
      }
    }

    // Expense-to-revenue ratio
    if (curr?.totalRevenue && currExp?.totalExpenses && curr.totalRevenue > 0) {
      const expRatio = (currExp.totalExpenses / curr.totalRevenue) * 100;
      if (expRatio > 60) {
        insights.push({
          type: 'high_expense_ratio', category: 'expenses', severity: 'warning', impact: 'high',
          title: 'High Operating Expense Ratio',
          message: `Expenses are ${expRatio.toFixed(1)}% of revenue — above the 60% healthy threshold.`,
          metric: expRatio, metricLabel: 'Expense Ratio',
          recommendation: 'Identify non-essential costs to cut. Target highest-value expense categories first.',
          actionUrl: '/analytics/expenses',
        });
      }
    }

    // Largest expense category
    const expByCategory = await expenseRepository.getExpenseByCategory(companyId, thirtyDaysAgo, now);
    if (expByCategory.length > 0 && currExp?.totalExpenses > 0) {
      const top = expByCategory[0];
      const topPct = (top.total / currExp.totalExpenses) * 100;
      if (topPct > 40) {
        insights.push({
          type: 'expense_concentration', category: 'expenses', severity: 'info', impact: 'medium',
          title: `${top._id} Dominates Expenses`,
          message: `${top._id} accounts for ${topPct.toFixed(0)}% of total operating expenses this month.`,
          metric: topPct, metricLabel: 'Category Concentration',
          recommendation: `Audit ${top._id} spend for optimisation opportunities. Compare against prior months to identify trends.`,
          actionUrl: '/analytics/expenses',
        });
      }
    }

    // ── Top products ──────────────────────────────────────────────────────────
    const topProducts = await saleRepository.getTopProducts(companyId, thirtyDaysAgo, now, 5);
    if (topProducts.length > 0) {
      insights.push({
        type: 'top_products', category: 'revenue', severity: 'info', impact: 'low',
        title: 'Top Revenue Driver Identified',
        message: `"${topProducts[0].productName}" leads with $${topProducts[0].revenue.toFixed(0)} revenue and ${topProducts[0].quantity} units sold this month.`,
        metric: topProducts[0].revenue, metricLabel: 'Top Product Revenue',
        recommendation: 'Ensure adequate stock for top performers. Consider marketing these more aggressively.',
        actionUrl: '/analytics/inventory',
      });
    }

    // ── Sales channel insights ────────────────────────────────────────────────
    const channelData = await saleRepository.getSalesByChannel(companyId, thirtyDaysAgo, now);
    if (channelData.length >= 2) {
      const topChannel = channelData[0];
      const totalChannelRev = channelData.reduce((s: number, c: any) => s + c.revenue, 0);
      const topChannelPct = (topChannel.revenue / totalChannelRev) * 100;
      if (topChannelPct > 70) {
        insights.push({
          type: 'channel_concentration', category: 'operations', severity: 'info', impact: 'medium',
          title: 'Sales Channel Concentration Risk',
          message: `${topChannelPct.toFixed(0)}% of revenue comes from a single channel (${topChannel._id}). Diversification reduces risk.`,
          metric: topChannelPct, metricLabel: 'Channel Concentration',
          recommendation: 'Explore underperforming channels. Small investment in secondary channels reduces single-point-of-failure risk.',
          actionUrl: '/analytics/revenue',
        });
      }
    }

    // ── Customer concentration risk ────────────────────────────────────────────
    const customerConcentration = await Customer.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), isActive: true } },
      { $sort: { 'metrics.totalRevenue': -1 } },
      { $limit: 1 },
      { $group: { _id: null, topRevenue: { $first: '$metrics.totalRevenue' }, total: { $sum: '$metrics.totalRevenue' } } },
    ]);

    if (customerConcentration.length > 0) {
      const { topRevenue, total } = customerConcentration[0];
      const topPct = total > 0 ? (topRevenue / total) * 100 : 0;
      if (topPct > 30) {
        insights.push({
          type: 'customer_concentration', category: 'customers', severity: 'warning', impact: 'high',
          title: 'Customer Concentration Risk',
          message: `Your top customer represents ${topPct.toFixed(0)}% of total revenue — high dependency risk.`,
          metric: topPct, metricLabel: 'Top Customer Revenue %',
          recommendation: 'Actively diversify your customer base. Losing this customer would significantly impact revenue.',
          actionUrl: '/analytics/customers',
        });
      }
    }

    // ── Inventory insights ────────────────────────────────────────────────────
    const [lowStockCount, outOfStockCount, deadInventoryCount] = await Promise.all([
      Product.countDocuments({
        companyId, isActive: true,
        $expr: { $and: [{ $gt: ['$inventory.currentStock', 0] }, { $lte: ['$inventory.currentStock', '$inventory.reorderPoint'] }] },
      }),
      Product.countDocuments({ companyId, isActive: true, 'inventory.currentStock': 0 }),
      Product.countDocuments({ companyId, isActive: true, 'metrics.velocityCategory': 'dead', 'inventory.currentStock': { $gt: 0 } }),
    ]);

    if (outOfStockCount > 0) {
      insights.push({
        type: 'stockout', category: 'inventory', severity: 'error', impact: 'high',
        title: `${outOfStockCount} Product${outOfStockCount > 1 ? 's' : ''} Out of Stock`,
        message: `${outOfStockCount} product${outOfStockCount > 1 ? 's are' : ' is'} completely out of stock — lost sales accumulating.`,
        metric: outOfStockCount, metricLabel: 'Out of Stock Count',
        recommendation: 'Prioritize restocking these items immediately. Check reorder recommendations.',
        actionUrl: '/analytics/inventory',
      });
    }

    if (lowStockCount > 0) {
      insights.push({
        type: 'low_inventory', category: 'inventory', severity: lowStockCount > 5 ? 'error' : 'warning', impact: 'high',
        title: `${lowStockCount} Product${lowStockCount > 1 ? 's' : ''} Below Reorder Point`,
        message: `${lowStockCount} product${lowStockCount > 1 ? 's are' : ' is'} at or below reorder point — stockout risk is high.`,
        metric: lowStockCount, metricLabel: 'Low Stock Count',
        recommendation: 'Review the reorder queue and place purchase orders now to prevent stockouts.',
        actionUrl: '/analytics/inventory',
      });
    }

    if (deadInventoryCount > 0) {
      const deadValue = await Product.aggregate([
        { $match: { companyId: new Types.ObjectId(companyId), isActive: true, 'metrics.velocityCategory': 'dead', 'inventory.currentStock': { $gt: 0 } } },
        { $group: { _id: null, cost: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } } } },
      ]);
      const capitalTied = deadValue[0]?.cost ?? 0;
      insights.push({
        type: 'dead_inventory', category: 'inventory', severity: 'warning', impact: 'medium',
        title: `$${capitalTied.toFixed(0)} Tied Up in Dead Inventory`,
        message: `${deadInventoryCount} products with no sales in 90+ days hold $${capitalTied.toFixed(0)} in cost value.`,
        metric: capitalTied, metricLabel: 'Dead Inventory Value',
        recommendation: 'Liquidate or discount dead stock. Free up working capital for higher-velocity products.',
        actionUrl: '/analytics/inventory',
      });
    }

    // ── Customer health insights ───────────────────────────────────────────────
    const [highChurnRisk, newCustomers7d, vipAtRisk] = await Promise.all([
      Customer.countDocuments({ companyId, isActive: true, 'churnRisk.level': 'high' }),
      Customer.countDocuments({ companyId, isActive: true, createdAt: { $gte: sevenDaysAgo } }),
      Customer.countDocuments({ companyId, isActive: true, segment: 'vip', 'churnRisk.level': { $in: ['high', 'medium'] } }),
    ]);

    if (vipAtRisk > 0) {
      insights.push({
        type: 'vip_churn_risk', category: 'customers', severity: 'error', impact: 'high',
        title: `${vipAtRisk} VIP Customer${vipAtRisk > 1 ? 's' : ''} at Churn Risk`,
        message: `${vipAtRisk} VIP customer${vipAtRisk > 1 ? 's' : ''} — your highest-value segment — show signs of disengagement.`,
        metric: vipAtRisk, metricLabel: 'VIP Customers at Risk',
        recommendation: 'Personally reach out to these customers. Offer loyalty rewards, exclusive discounts, or a dedicated account manager.',
        actionUrl: '/analytics/customers',
      });
    } else if (highChurnRisk > 0) {
      insights.push({
        type: 'churn_risk', category: 'customers', severity: 'warning', impact: 'medium',
        title: `${highChurnRisk} High-Risk Customer${highChurnRisk > 1 ? 's' : ''}`,
        message: `${highChurnRisk} customer${highChurnRisk > 1 ? 's are' : ' is'} at high churn risk based on purchase patterns.`,
        metric: highChurnRisk, metricLabel: 'High Churn Risk Count',
        recommendation: 'Launch a win-back campaign targeting these customers with personalised offers.',
        actionUrl: '/analytics/customers',
      });
    }

    if (newCustomers7d >= 5) {
      insights.push({
        type: 'new_customer_surge', category: 'growth', severity: 'success', impact: 'medium',
        title: 'New Customer Acquisition Spike',
        message: `${newCustomers7d} new customers acquired in the last 7 days — strong top-of-funnel activity.`,
        metric: newCustomers7d, metricLabel: 'New Customers (7d)',
        recommendation: 'Nurture these new customers immediately with a welcome campaign to maximise conversion to repeat buyers.',
        actionUrl: '/analytics/customers',
      });
    }

    // Repeat purchase rate
    const repeatCustomers = await Customer.countDocuments({ companyId, isActive: true, 'metrics.totalOrders': { $gte: 2 } });
    const totalCustomers = await Customer.countDocuments({ companyId, isActive: true });
    if (totalCustomers > 0) {
      const repeatRate = (repeatCustomers / totalCustomers) * 100;
      if (repeatRate < 20) {
        insights.push({
          type: 'low_repeat_rate', category: 'growth', severity: 'warning', impact: 'high',
          title: 'Low Customer Repeat Purchase Rate',
          message: `Only ${repeatRate.toFixed(0)}% of customers have made more than one purchase.`,
          metric: repeatRate, metricLabel: 'Repeat Purchase Rate',
          recommendation: 'Implement post-purchase follow-ups, loyalty programs, or subscription offers to boost retention.',
          actionUrl: '/analytics/customers',
        });
      } else if (repeatRate > 60) {
        insights.push({
          type: 'strong_retention', category: 'growth', severity: 'success', impact: 'medium',
          title: 'Excellent Customer Retention',
          message: `${repeatRate.toFixed(0)}% of customers are repeat buyers — strong loyalty signal.`,
          metric: repeatRate, metricLabel: 'Repeat Purchase Rate',
          recommendation: 'Leverage your loyal base through referral programs and word-of-mouth marketing.',
          actionUrl: '/analytics/customers',
        });
      }
    }

    // ── Growth opportunity ────────────────────────────────────────────────────
    // Fast-moving products near reorder — growth opportunity
    const fastMovingLowStock = await Product.countDocuments({
      companyId, isActive: true,
      'metrics.velocityCategory': 'fast',
      $expr: { $lte: ['$inventory.currentStock', { $multiply: ['$inventory.reorderPoint', 1.5] }] },
    });
    if (fastMovingLowStock > 0) {
      insights.push({
        type: 'fast_mover_stock_risk', category: 'growth', severity: 'warning', impact: 'high',
        title: `${fastMovingLowStock} Fast-Selling Product${fastMovingLowStock > 1 ? 's' : ''} Running Low`,
        message: `${fastMovingLowStock} fast-moving product${fastMovingLowStock > 1 ? 's are' : ' is'} approaching reorder levels — stockouts will directly cut revenue.`,
        metric: fastMovingLowStock, metricLabel: 'Fast Movers at Risk',
        recommendation: 'Increase reorder quantities for fast movers. Consider safety stock buffers of 30-45 days for top sellers.',
        actionUrl: '/analytics/inventory',
      });
    }

    // Sort: error > warning > success > info, then by impact
    const SEVERITY_ORDER = { error: 0, warning: 1, success: 2, info: 3 };
    const IMPACT_ORDER = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => {
      const sv = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sv !== 0) return sv;
      return (IMPACT_ORDER[a.impact ?? 'low'] ?? 2) - (IMPACT_ORDER[b.impact ?? 'low'] ?? 2);
    });

    return insights;
  }

  async generateAndSaveInsights(companyId: string): Promise<void> {
    try {
      const insights = await this.generateInsights(companyId);
      const actionable = insights.filter((i) => i.severity === 'error' || i.severity === 'warning');

      for (const insight of actionable) {
        await Notification.findOneAndUpdate(
          { companyId, type: insight.type as any, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          {
            $setOnInsert: {
              companyId, type: insight.type, severity: insight.severity,
              title: insight.title, message: insight.message,
              actionUrl: insight.actionUrl, isRead: false, isEmailSent: false,
            },
          },
          { upsert: true }
        );
      }

      logger.info('Insights generated', { companyId, total: insights.length, actionable: actionable.length });
    } catch (err: any) {
      logger.error('Insight generation failed', { companyId, error: err.message });
    }
  }

  async getInsightsSummary(companyId: string) {
    const insights = await this.generateInsights(companyId);
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = { error: 0, warning: 0, success: 0, info: 0 };

    for (const i of insights) {
      byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
      bySeverity[i.severity]++;
    }

    return { total: insights.length, bySeverity, byCategory };
  }
}

export const insightsService = new InsightsService();
