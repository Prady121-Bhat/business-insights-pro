import { Router } from 'express';
import {
  createCustomer, listCustomers, getCustomer, updateCustomer, deleteCustomer,
  getCustomerSales, runRFMAnalysis, runCLVAnalysis, runChurnAnalysis, runAllAnalytics,
  getRFMData, getCLVData, getChurnData, getCohortAnalysis, getRetentionCurve, getSegmentSummary,
} from './customers.controller';
import { createCustomerValidation, updateCustomerValidation, listCustomersValidation } from './customers.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireAnalyst, requireManager } from '../../middleware/permission.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();
router.use(authenticate, requireTenant);

// Analytics triggers (manager+)
router.post('/analytics/run-all',   requireManager, runAllAnalytics);
router.post('/analytics/rfm',       requireManager, runRFMAnalysis);
router.post('/analytics/clv',       requireManager, runCLVAnalysis);
router.post('/analytics/churn',     requireManager, runChurnAnalysis);

// Analytics reads (analyst+)
router.get('/analytics/rfm',        requireAnalyst, getRFMData);
router.get('/analytics/clv',        requireAnalyst, getCLVData);
router.get('/analytics/churn',      requireAnalyst, getChurnData);
router.get('/analytics/cohort',     requireAnalyst, getCohortAnalysis);
router.get('/analytics/retention',  requireAnalyst, getRetentionCurve);
router.get('/analytics/segments',   requireAnalyst, getSegmentSummary);

// CRUD
router.get('/',     requireAnalyst, listCustomersValidation, listCustomers);
router.post('/',    requireManager, createCustomerValidation, auditLog({ action: 'create', resource: 'customer' }), createCustomer);
router.get('/:id',  requireAnalyst, getCustomer);
router.put('/:id',  requireManager, updateCustomerValidation, auditLog({ action: 'update', resource: 'customer' }), updateCustomer);
router.delete('/:id', requireManager, auditLog({ action: 'delete', resource: 'customer' }), deleteCustomer);
router.get('/:id/sales', requireAnalyst, getCustomerSales);

export default router;
