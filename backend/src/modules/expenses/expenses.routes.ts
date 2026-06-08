import { Router } from 'express';
import { expensesController } from './expenses.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireMinRole, requireEmployee, requireManager } from '../../middleware/permission.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/stats', requireMinRole('analyst'), expensesController.stats.bind(expensesController));
router.get('/', requireMinRole('analyst'), expensesController.list.bind(expensesController));
router.get('/:id', requireMinRole('analyst'), expensesController.getById.bind(expensesController));
router.post('/', requireEmployee, expensesController.create.bind(expensesController));
router.patch('/:id', requireEmployee, expensesController.update.bind(expensesController));
router.delete('/:id', requireManager, expensesController.remove.bind(expensesController));

export default router;
