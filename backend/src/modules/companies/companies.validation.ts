import { body } from 'express-validator';

export const updateCompanyValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('phone').optional().trim(),
  body('website').optional().trim().isURL({ require_protocol: false }).withMessage('Invalid URL'),
  body('address').optional().isObject(),
  body('address.street').optional().trim().isLength({ max: 200 }),
  body('address.city').optional().trim().isLength({ max: 100 }),
  body('address.state').optional().trim().isLength({ max: 100 }),
  body('address.country').optional().trim().isLength({ max: 100 }),
  body('address.zipCode').optional().trim().isLength({ max: 20 }),
];

export const updateSettingsValidation = [
  body('currency').optional().trim().isLength({ min: 3, max: 3 }).toUpperCase().withMessage('Currency must be 3-letter code'),
  body('timezone').optional().trim().isLength({ max: 50 }),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be 0-100'),
  body('fiscalYearStart').optional().isInt({ min: 1, max: 12 }).withMessage('Fiscal year start must be 1-12'),
  body('theme').optional().isIn(['light', 'dark']),
  body('dateFormat').optional().trim(),
  body('numberFormat').optional().trim(),
];

export const updateBrandingValidation = [
  body('primaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'),
  body('secondaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'),
];
