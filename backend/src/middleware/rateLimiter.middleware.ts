import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { sendError } from '../utils/response.utils';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many requests. Please try again later.', 429);
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many authentication attempts. Try again in 15 minutes.', 429);
  },
});

export const importRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  handler: (_req, res) => {
    sendError(res, 'Import limit reached. Try again in an hour.', 429);
  },
});

export const reportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  handler: (_req, res) => {
    sendError(res, 'Report generation limit reached.', 429);
  },
});
