import { Router } from 'express';
import { forecastingController } from './forecasting.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireMinRole } from '../../middleware/permission.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/health', requireMinRole('analyst'), forecastingController.serviceHealth);
router.get('/saved', requireMinRole('analyst'), forecastingController.getSaved);
router.get('/historical', requireMinRole('analyst'), forecastingController.getHistorical);
router.post('/generate', requireMinRole('analyst'), forecastingController.generate);

export default router;
