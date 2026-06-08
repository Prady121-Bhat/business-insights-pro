import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireMinRole, requireAnalyst, requireManager } from '../../middleware/permission.middleware';
import { reportRateLimiter } from '../../middleware/rateLimiter.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/stats', requireMinRole('analyst'), reportsController.stats);
router.get('/', requireMinRole('analyst'), reportsController.list);
router.post('/', reportRateLimiter, requireMinRole('analyst'), reportsController.generate);
router.get('/:id/download', requireMinRole('analyst'), reportsController.download);
router.delete('/:id', requireManager, reportsController.remove);

export default router;
