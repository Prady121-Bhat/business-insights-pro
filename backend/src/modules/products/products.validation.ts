import { body, param } from 'express-validator';

export const createProductValidation = [
  body('name').trim().notEmpty().isLength({ min: 2, max: 200 }),
  body('sku').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('category').trim().notEmpty(),
  body('description').optional().isLength({ max: 1000 }),
  body('brand').optional().isLength({ max: 100 }),
  body('pricing.costPrice').isFloat({ min: 0 }),
  body('pricing.sellingPrice').isFloat({ min: 0 }),
  body('pricing.taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('inventory.currentStock').optional().isFloat({ min: 0 }),
  body('inventory.reorderPoint').isFloat({ min: 0 }),
  body('inventory.reorderQuantity').isFloat({ min: 1 }),
  body('inventory.maxStock').optional().isFloat({ min: 0 }),
];

export const updateProductValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('category').optional().trim().notEmpty(),
  body('description').optional().isLength({ max: 1000 }),
  body('pricing.costPrice').optional().isFloat({ min: 0 }),
  body('pricing.sellingPrice').optional().isFloat({ min: 0 }),
  body('inventory.currentStock').optional().isFloat({ min: 0 }),
  body('inventory.reorderPoint').optional().isFloat({ min: 0 }),
  body('inventory.reorderQuantity').optional().isFloat({ min: 1 }),
  body('isActive').optional().isBoolean(),
];

export const adjustStockValidation = [
  body('adjustment').isFloat().custom((v) => v !== 0).withMessage('adjustment cannot be zero'),
  body('reason').optional().isLength({ max: 300 }),
];
