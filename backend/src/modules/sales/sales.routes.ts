import { Router } from 'express';
import { salesController } from './sales.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireMinRole, requireEmployee, requireManager } from '../../middleware/permission.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/stats', requireMinRole('analyst'), salesController.stats.bind(salesController));
router.get('/', requireMinRole('analyst'), salesController.list.bind(salesController));
router.get('/:id', requireMinRole('analyst'), salesController.getById.bind(salesController));
router.post('/', requireEmployee, salesController.create.bind(salesController));
router.patch('/:id', requireEmployee, salesController.update.bind(salesController));
router.delete('/:id', requireManager, salesController.remove.bind(salesController));

export default router;
