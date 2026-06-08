import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { usersService } from './users.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.utils';
import { AppError } from '../../middleware/errorHandler.middleware';

const validate = (req: Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Validation failed', 422, errors.array());
};

export const inviteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const result = await usersService.inviteUser({
      ...req.body,
      companyId: req.tenantId!,
      invitedByName: `${req.user!.email}`,
      companyName: req.company?.name || 'Your Company',
    });
    sendCreated(res, result, result.message);
  } catch (err) { next(err); }
};

export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const { page, limit, role, isActive } = req.query as any;
    const result = await usersService.listUsers(req.tenantId!, { page, limit, role, isActive });
    sendPaginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.getUserById(req.params.id, req.tenantId!);
    sendSuccess(res, user);
  } catch (err) { next(err); }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const user = await usersService.updateUser(req.params.id, req.tenantId!, req.body);
    sendSuccess(res, user, 'User updated');
  } catch (err) { next(err); }
};

export const updateOwnProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const user = await usersService.updateOwnProfile(req.user!.userId, req.body);
    sendSuccess(res, user, 'Profile updated');
  } catch (err) { next(err); }
};

export const changeRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const user = await usersService.changeRole(
      req.params.id,
      req.tenantId!,
      req.body.role,
      req.user!.userId,
      req.user!.role
    );
    sendSuccess(res, user, 'Role updated');
  } catch (err) { next(err); }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await usersService.deactivateUser(req.params.id, req.tenantId!, req.user!.userId);
    sendSuccess(res, null, 'User deactivated');
  } catch (err) { next(err); }
};

export const reactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await usersService.reactivateUser(req.params.id, req.tenantId!);
    sendSuccess(res, null, 'User reactivated');
  } catch (err) { next(err); }
};

export const getCompanyStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await usersService.getCompanyStats(req.tenantId!);
    sendSuccess(res, stats);
  } catch (err) { next(err); }
};
