import request from 'supertest';

// Mock mongoose connect/disconnect so no real DB needed
jest.mock('../../config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../models/User.model', () => ({
  User: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../models/Company.model', () => ({
  Company: {
    findById: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
  },
}));

jest.mock('../../models/RefreshToken.model', () => ({
  RefreshToken: {
    create: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../models/Settings.model', () => ({ Settings: { create: jest.fn() } }));
jest.mock('../../models/Subscription.model', () => ({ Subscription: { create: jest.fn() } }));

jest.mock('../../services/email.service', () => ({
  emailService: {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../config/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn() } }));
jest.mock('../../services/scheduler.service', () => ({ schedulerService: { start: jest.fn(), stop: jest.fn() } }));

import { app } from '../../app';
import { User } from '../../models/User.model';
import { Company } from '../../models/Company.model';
import { RefreshToken } from '../../models/RefreshToken.model';

beforeEach(() => jest.clearAllMocks());

describe('POST /api/v1/auth/register', () => {
  it('returns 422 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'bad' });

    expect(res.status).toBe(422);
  });

  it('returns 409 when email already exists', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({ _id: 'exists' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        password: 'Password1!',
        companyName: 'Acme',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 201 on successful registration', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (Company.exists as jest.Mock).mockResolvedValue(null);
    (Company.create as jest.Mock).mockResolvedValue({ _id: 'co-id' });
    (User.create as jest.Mock).mockResolvedValue({
      _id: 'usr-id',
      email: 'new@test.com',
      firstName: 'New',
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'New',
        lastName: 'User',
        email: 'new@test.com',
        password: 'Password1!',
        companyName: 'Test Corp',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns 422 for missing credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
  });

  it('returns 401 for invalid credentials', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@test.com', password: 'Password1!' });

    expect(res.status).toBe(401);
  });

  it('returns 200 with tokens on valid credentials', async () => {
    const mockUser = {
      _id: { toString: () => 'user-id' },
      firstName: 'John',
      email: 'john@test.com',
      role: 'company_admin',
      companyId: { toString: () => 'co-id' },
      isActive: true,
      isEmailVerified: true,
      isLocked: false,
      comparePassword: jest.fn().mockResolvedValue(true),
      incrementLoginAttempts: jest.fn(),
      toObject: jest.fn().mockReturnValue({ _id: 'user-id', email: 'john@test.com' }),
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
    (RefreshToken.create as jest.Mock).mockResolvedValue({});
    (Company.findById as jest.Mock).mockResolvedValue({
      _id: 'co-id',
      toObject: () => ({ name: 'Acme' }),
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john@test.com', password: 'Password1!' });

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    expect(res.body.data.tokens.refreshToken).toBeTruthy();
  });
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
