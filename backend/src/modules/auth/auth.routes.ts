import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
} from './auth.controller';
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  verifyEmailValidation,
  refreshTokenValidation,
} from './auth.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware';

const router = Router();

router.post('/register', authRateLimiter, registerValidation, register);
router.post('/verify-email', verifyEmailValidation, verifyEmail);
router.post('/login', authRateLimiter, loginValidation, login);
router.post('/refresh-token', refreshTokenValidation, refreshToken);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);
router.post('/forgot-password', authRateLimiter, forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.put('/change-password', authenticate, changePasswordValidation, changePassword);
router.get('/me', authenticate, getMe);

export default router;
