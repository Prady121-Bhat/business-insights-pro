import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', notificationsController.list.bind(notificationsController));
router.get('/unread-count', notificationsController.getUnreadCount.bind(notificationsController));
router.patch('/read', notificationsController.markRead.bind(notificationsController));
router.patch('/read-all', notificationsController.markAllRead.bind(notificationsController));
router.delete('/clear-read', notificationsController.deleteRead.bind(notificationsController));
router.delete('/:id', notificationsController.deleteOne.bind(notificationsController));

export default router;
