import { Router } from 'express';
import { productsController } from './products.controller';
import { createProductValidation, updateProductValidation, adjustStockValidation } from './products.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireMinRole, requireManager, requireEmployee } from '../../middleware/permission.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();

router.use(authenticate, requireTenant);

// Inventory analytics
router.get('/inventory/overview', requireMinRole('analyst'), productsController.getInventoryOverview);
router.get('/inventory/stockout', requireMinRole('analyst'), productsController.getStockoutPredictions);
router.get('/inventory/reorder', requireMinRole('analyst'), productsController.getReorderRecommendations);
router.get('/inventory/low-stock', requireMinRole('analyst'), productsController.getLowStockAlerts);
router.get('/inventory/dead', requireMinRole('analyst'), productsController.getDeadInventory);
router.post('/inventory/compute', requireManager, productsController.computeMetrics);

// Categories
router.get('/categories', requireMinRole('viewer'), productsController.getCategories);

// Stock adjustment
router.patch('/:id/stock', requireManager, adjustStockValidation, auditLog('stock_adjusted'), productsController.adjustStock);

// CRUD
router.get('/', requireMinRole('viewer'), productsController.list);
router.post('/', requireEmployee, createProductValidation, auditLog('product_created'), productsController.create);
router.get('/:id', requireMinRole('viewer'), productsController.getById);
router.put('/:id', requireEmployee, updateProductValidation, auditLog('product_updated'), productsController.update);
router.delete('/:id', requireManager, auditLog('product_deleted'), productsController.remove);

export default router;
