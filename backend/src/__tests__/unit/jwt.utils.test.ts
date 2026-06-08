import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  AccessTokenPayload,
} from '../../utils/jwt.utils';

const ACCESS_PAYLOAD: AccessTokenPayload = {
  userId: '507f1f77bcf86cd799439011',
  companyId: '507f1f77bcf86cd799439012',
  role: 'company_admin',
  email: 'admin@test.com',
};

describe('jwt.utils', () => {
  describe('signAccessToken / verifyAccessToken', () => {
    it('signs and verifies a valid access token', () => {
      const token = signAccessToken(ACCESS_PAYLOAD);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(ACCESS_PAYLOAD.userId);
      expect(decoded.companyId).toBe(ACCESS_PAYLOAD.companyId);
      expect(decoded.role).toBe(ACCESS_PAYLOAD.role);
      expect(decoded.email).toBe(ACCESS_PAYLOAD.email);
    });

    it('includes correct issuer and audience', () => {
      const token = signAccessToken(ACCESS_PAYLOAD);
      const decoded = jwt.decode(token) as any;
      expect(decoded.iss).toBe('business-insights-pro');
      expect(decoded.aud).toBe('bip-client');
    });

    it('throws on tampered access token', () => {
      const token = signAccessToken(ACCESS_PAYLOAD);
      const tampered = token.slice(0, -5) + 'xxxxx';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });

    it('throws on expired access token', () => {
      const token = jwt.sign(ACCESS_PAYLOAD, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: '0s',
        issuer: 'business-insights-pro',
        audience: 'bip-client',
      });
      expect(() => verifyAccessToken(token)).toThrow(jwt.TokenExpiredError);
    });

    it('works without companyId (super_admin case)', () => {
      const payload = { userId: 'abc', role: 'super_admin', email: 'sa@test.com' };
      const token = signAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded.companyId).toBeUndefined();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    const REFRESH_PAYLOAD = { userId: '507f1f77bcf86cd799439011', tokenId: 'tok-1' };

    it('signs and verifies a valid refresh token', () => {
      const token = signRefreshToken(REFRESH_PAYLOAD);
      expect(typeof token).toBe('string');

      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(REFRESH_PAYLOAD.userId);
      expect(decoded.tokenId).toBe(REFRESH_PAYLOAD.tokenId);
    });

    it('throws on tampered refresh token', () => {
      const token = signRefreshToken(REFRESH_PAYLOAD);
      const tampered = token.slice(0, -5) + 'yyyyy';
      expect(() => verifyRefreshToken(tampered)).toThrow();
    });

    it('access token not accepted as refresh token', () => {
      const accessToken = signAccessToken(ACCESS_PAYLOAD);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });
});
