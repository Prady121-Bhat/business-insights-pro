import { body, param, query } from 'express-validator';

export const createCustomerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name required').isLength({ max: 50 }),
  body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('customerId').trim().notEmpty().withMessage('Customer ID required'),
  body('address').optional().isObject(),
  body('tags').optional().isArray(),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const updateCustomerValidation = [
  param('id').isMongoId().withMessage('Invalid customer ID'),
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('address').optional().isObject(),
  body('tags').optional().isArray(),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('segment').optional().isIn(['vip', 'loyal', 'regular', 'at_risk', 'lost', 'new']),
];

export const listCustomersValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('segment').optional().isIn(['vip', 'loyal', 'regular', 'at_risk', 'lost', 'new']),
  query('churnRisk').optional().isIn(['low', 'medium', 'high']),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['totalRevenue', 'totalOrders', 'lastPurchaseDate', 'lifetimeValue', 'churnRisk']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];
