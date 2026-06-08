import { Router } from 'express';
import { insightsController } from './insights.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireMinRole, requireAnalyst, requireManager } from '../../middleware/permission.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', requireMinRole('analyst'), insightsController.getInsights);
router.post('/refresh', requireManager, insightsController.refreshInsights);
router.get('/summary', requireMinRole('analyst'), insightsController.getSummary);
router.get('/notifications', requireMinRole('viewer'), insightsController.getNotificationHistory);
router.get('/notifications/unread-count', requireMinRole('viewer'), insightsController.getUnreadCount);
router.patch('/notifications/read', requireMinRole('viewer'), insightsController.markRead);
router.patch('/notifications/read-all', requireMinRole('viewer'), insightsController.markAllRead);

export default router;
