import { body, param, query } from 'express-validator';

export const inviteUserValidation = [
  body('firstName').trim().notEmpty().withMessage('First name required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name required').isLength({ max: 50 }),
  body('email').trim().notEmpty().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('role')
    .notEmpty().withMessage('Role required')
    .isIn(['company_admin', 'manager', 'analyst', 'employee', 'viewer'])
    .withMessage('Invalid role'),
];

export const updateUserValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('phone').optional().trim(),
  body('preferences').optional().isObject(),
];

export const changeRoleValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role')
    .notEmpty().withMessage('Role required')
    .isIn(['company_admin', 'manager', 'analyst', 'employee', 'viewer'])
    .withMessage('Invalid role'),
];

export const listUsersValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['company_admin', 'manager', 'analyst', 'employee', 'viewer']),
  query('isActive').optional().isBoolean().toBoolean(),
];
