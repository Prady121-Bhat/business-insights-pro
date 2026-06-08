import { Router } from 'express';
import { importsController } from './imports.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireMinRole, requireEmployee, requireManager } from '../../middleware/permission.middleware';
import { importRateLimiter } from '../../middleware/rateLimiter.middleware';
import { uploadImport } from '../../middleware/upload.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/fields/:entityType', requireMinRole('analyst'), importsController.getFieldDefs);
router.get('/jobs', requireMinRole('analyst'), importsController.listJobs);
router.get('/jobs/:id', requireMinRole('analyst'), importsController.getJobStatus);
router.patch('/jobs/:id/cancel', requireEmployee, importsController.cancelJob);

router.post('/upload', importRateLimiter, requireEmployee, uploadImport, importsController.upload);
router.post('/validate', requireEmployee, importsController.validateMapping);
router.post('/start', requireEmployee, importsController.startImport);

export default router;
