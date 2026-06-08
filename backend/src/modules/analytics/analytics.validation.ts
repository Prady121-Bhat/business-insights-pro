import { query } from 'express-validator';

const dateOptional = (field: string) =>
  query(field).optional().isISO8601().withMessage(`${field} must be valid ISO 8601 date`).toDate();

const granularityOptional = query('granularity')
  .optional()
  .isIn(['day', 'week', 'month', 'year'])
  .withMessage('granularity must be day|week|month|year');

const limitOptional = (max = 50) =>
  query('limit').optional().isInt({ min: 1, max }).toInt();

export const kpiValidation = [
  dateOptional('startDate'),
  dateOptional('endDate'),
];

export const trendValidation = [
  dateOptional('startDate'),
  dateOptional('endDate'),
  granularityOptional,
];

export const topProductsValidation = [
  dateOptional('startDate'),
  dateOptional('endDate'),
  limitOptional(50),
];

export const topCustomersValidation = [
  limitOptional(50),
];

export const cohortValidation = [
  query('months').optional().isInt({ min: 1, max: 24 }).toInt(),
];

export const retentionValidation = [
  query('months').optional().isInt({ min: 1, max: 24 }).toInt(),
];
