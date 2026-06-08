import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { authService } from './auth.service';
import { sendSuccess, sendCreated, sendError } from '../../utils/response.utils';
import { AppError } from '../../middleware/errorHandler.middleware';

const handleValidation = (req: Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 422, errors.array());
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    handleValidation(req);
    const result = await authService.register(req.body);
    sendCreated(res, result, result.message);
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    handleValidation(req);
    const result = await authService.verifyEmail(req.body.token);
    sendSuccess(res, result, result.message);
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    handleValidation(req);
    const result = await authService.login({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    handleValidation(req);
    const tokens = await authService.refreshTokens(
      req.body.refreshToken,
      req.ip,
      req.get('user-agent')
    );
    sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

export const logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await authService.logoutAll(req.user!.userId);
    sendSuccess(res, null, 'Logged out from all devices');
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    handleValidation(req);
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    handleValidation(req);
    await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, null, 'Password reset successfully. Please log in.');
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    handleValidation(req);
    await authService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
    sendSuccess(res, null, 'Password changed successfully.');
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.getMe(req.user!.userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
