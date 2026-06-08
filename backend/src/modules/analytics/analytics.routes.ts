import { Router } from 'express';
import {
  getOverviewKPIs,
  getRevenueTrend,
  getTopProducts,
  getHeatmap,
  getCustomerAnalytics,
  getRetentionAnalysis,
  getCohortAnalysis,
  getInventoryAnalytics,
  getExpenseAnalytics,
  getProfitAndLoss,
  getInsights,
} from './analytics.controller';
import {
  kpiValidation,
  trendValidation,
  topProductsValidation,
  cohortValidation,
  retentionValidation,
} from './analytics.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireAnalyst } from '../../middleware/permission.middleware';

const router = Router();

router.use(authenticate, requireTenant, requireAnalyst);

router.get('/kpis',               kpiValidation,         getOverviewKPIs);
router.get('/revenue/trend',      trendValidation,       getRevenueTrend);
router.get('/revenue/pnl',        kpiValidation,         getProfitAndLoss);
router.get('/products/top',       topProductsValidation, getTopProducts);
router.get('/sales/heatmap',      kpiValidation,         getHeatmap);
router.get('/customers',                                 getCustomerAnalytics);
router.get('/customers/retention', retentionValidation,  getRetentionAnalysis);
router.get('/customers/cohort',   cohortValidation,      getCohortAnalysis);
router.get('/inventory',                                 getInventoryAnalytics);
router.get('/expenses',           kpiValidation,         getExpenseAnalytics);
router.get('/insights',                                  getInsights);

export default router;
