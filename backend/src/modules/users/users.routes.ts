import { Router } from 'express';
import {
  inviteUser,
  listUsers,
  getUserById,
  updateUser,
  updateOwnProfile,
  changeRole,
  deactivateUser,
  reactivateUser,
  getCompanyStats,
} from './users.controller';
import {
  inviteUserValidation,
  updateUserValidation,
  changeRoleValidation,
  listUsersValidation,
} from './users.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';
import { requireCompanyAdmin, requireManager, requireSelfOrAdmin } from '../../middleware/permission.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/stats', requireCompanyAdmin, getCompanyStats);
router.get('/', requireManager, listUsersValidation, listUsers);
router.post('/invite', requireCompanyAdmin, inviteUserValidation, inviteUser);

router.get('/me', updateOwnProfile);
router.put('/me', updateUserValidation, updateOwnProfile);

router.get('/:id', requireManager, getUserById);
router.put('/:id', requireCompanyAdmin, updateUserValidation, updateUser);
router.patch('/:id/role', requireCompanyAdmin, changeRoleValidation, changeRole);
router.patch('/:id/deactivate', requireCompanyAdmin, deactivateUser);
router.patch('/:id/reactivate', requireCompanyAdmin, reactivateUser);

export default router;
