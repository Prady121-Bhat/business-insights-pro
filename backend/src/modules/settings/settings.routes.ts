import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireMinRole, requireManager, requireCompanyAdmin } from '../../middleware/permission.middleware';
import { uploadLogo } from '../../middleware/upload.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', requireMinRole('analyst'), settingsController.get.bind(settingsController));
router.get('/export', requireCompanyAdmin, settingsController.exportSettings.bind(settingsController));

router.patch('/company', requireManager, settingsController.updateCompany.bind(settingsController));
router.patch('/:section', requireManager, settingsController.updateSection.bind(settingsController));

router.post('/logo', requireManager, uploadLogo, settingsController.uploadLogo.bind(settingsController));
router.delete('/logo', requireManager, settingsController.deleteLogo.bind(settingsController));

export default router;
