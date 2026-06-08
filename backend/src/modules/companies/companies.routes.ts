import { Router } from 'express';
import {
  getCompany,
  updateCompany,
  updateSettings,
  updateBranding,
  getSubscription,
  updateAnalyticsSettings,
  updateNotificationSettings,
  getAllCompanies,
} from './companies.controller';
import {
  updateCompanyValidation,
  updateSettingsValidation,
  updateBrandingValidation,
} from './companies.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireCompanyAdmin, requireSuperAdmin } from '../../middleware/permission.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', getCompany);
router.put('/', requireCompanyAdmin, updateCompanyValidation, updateCompany);
router.put('/settings', requireCompanyAdmin, updateSettingsValidation, updateSettings);
router.put('/branding', requireCompanyAdmin, updateBrandingValidation, updateBranding);
router.put('/settings/analytics', requireCompanyAdmin, updateAnalyticsSettings);
router.put('/settings/notifications', requireCompanyAdmin, updateNotificationSettings);
router.get('/subscription', getSubscription);

router.get('/all', requireSuperAdmin, getAllCompanies);

export default router;
