import request from 'supertest';
import { signAccessToken } from '../../utils/jwt.utils';

jest.mock('../../config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn() },
}));

jest.mock('../../services/scheduler.service', () => ({
  schedulerService: { start: jest.fn(), stop: jest.fn() },
}));

jest.mock('../../models/User.model', () => ({
  User: { findById: jest.fn() },
}));

jest.mock('../../models/RefreshToken.model', () => ({
  RefreshToken: { findOne: jest.fn() },
}));

jest.mock('../../models/AuditLog.model', () => ({
  AuditLog: { create: jest.fn() },
  AuditAction: {},
}));

const mockSalesList = {
  data: [{ _id: 'sale-1', saleNumber: 'SL-000001', summary: { grandTotal: 100 } }],
  pagination: { page: 1, limit: 25, total: 1, pages: 1 },
};

jest.mock('../../models/Sale.model', () => ({
  Sale: {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockSalesList.data),
    }),
    countDocuments: jest.fn().mockResolvedValue(1),
    findOne: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn().mockResolvedValue([
      { totalRevenue: 5000, totalProfit: 1200, totalOrders: 10, avgOrderValue: 500 },
    ]),
  },
}));

jest.mock('../../services/cache.service', () => ({
  cacheService: { invalidateTenant: jest.fn(), get: jest.fn(), set: jest.fn() },
}));

import { app } from '../../app';
import { User } from '../../models/User.model';

const TENANT_ID = '507f1f77bcf86cd799439011';

const authToken = signAccessToken({
  userId: '507f1f77bcf86cd799439099',
  companyId: TENANT_ID,
  role: 'company_admin',
  email: 'admin@test.com',
});

beforeEach(() => {
  jest.clearAllMocks();

  (User.findById as jest.Mock).mockResolvedValue({
    _id: '507f1f77bcf86cd799439099',
    email: 'admin@test.com',
    role: 'company_admin',
    companyId: TENANT_ID,
    isActive: true,
    isEmailVerified: true,
  });
});

describe('GET /api/v1/sales', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/sales');
    expect(res.status).toBe(401);
  });

  it('returns 401 without X-Company-Id header', async () => {
    const res = await request(app)
      .get('/api/v1/sales')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with sales list', async () => {
    const res = await request(app)
      .get('/api/v1/sales')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Company-Id', TENANT_ID);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/v1/sales/stats', () => {
  it('returns 200 with stats object', async () => {
    const res = await request(app)
      .get('/api/v1/sales/stats')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Company-Id', TENANT_ID);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalRevenue');
    expect(res.body.data).toHaveProperty('totalOrders');
  });
});

describe('POST /api/v1/sales', () => {
  it('returns 400 when no items provided', async () => {
    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Company-Id', TENANT_ID)
      .send({ channel: 'in_store', paymentMethod: 'cash' });

    expect(res.status).toBe(400);
  });
});
