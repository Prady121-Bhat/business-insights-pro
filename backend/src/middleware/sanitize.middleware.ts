import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';

export const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized ${key} in request from ${req.ip}`);
  },
});

export const trimStrings = (req: Request, _res: Response, next: NextFunction): void => {
  const trim = (obj: any): any => {
    if (typeof obj === 'string') return obj.trim();
    if (Array.isArray(obj)) return obj.map(trim);
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        obj[key] = trim(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) req.body = trim(req.body);
  next();
};
