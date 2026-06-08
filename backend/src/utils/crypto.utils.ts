import crypto from 'crypto';

export const generateToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateNumericOTP = (length = 6): string => {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
};

export const generateEntityNumber = (prefix: string, count: number): string => {
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
};
