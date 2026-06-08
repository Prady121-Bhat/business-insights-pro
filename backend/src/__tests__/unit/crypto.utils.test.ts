import {
  generateToken,
  hashToken,
  generateSlug,
  generateEntityNumber,
  generateNumericOTP,
} from '../../utils/crypto.utils';

describe('crypto.utils', () => {
  describe('generateToken', () => {
    it('returns hex string of default length (64 chars = 32 bytes)', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('returns hex string of custom byte length', () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32);
    });

    it('produces unique tokens each call', () => {
      const a = generateToken();
      const b = generateToken();
      expect(a).not.toBe(b);
    });
  });

  describe('hashToken', () => {
    it('returns consistent SHA-256 hash', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('returns 64-char hex string', () => {
      const hash = hashToken('abc');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('different input produces different hash', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });
  });

  describe('generateSlug', () => {
    it('lowercases and trims', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world');
    });

    it('replaces spaces with hyphens', () => {
      expect(generateSlug('Acme Corp')).toBe('acme-corp');
    });

    it('removes special characters', () => {
      expect(generateSlug('My Company! @#$')).toBe('my-company-');
    });

    it('collapses multiple hyphens', () => {
      expect(generateSlug('hello---world')).toBe('hello-world');
    });

    it('truncates to 50 chars', () => {
      const long = 'a'.repeat(100);
      expect(generateSlug(long)).toHaveLength(50);
    });
  });

  describe('generateEntityNumber', () => {
    it('formats with prefix and zero-padded count', () => {
      expect(generateEntityNumber('SL', 0)).toBe('SL-000001');
      expect(generateEntityNumber('EXP', 99)).toBe('EXP-000100');
    });
  });

  describe('generateNumericOTP', () => {
    it('returns numeric string of default length 6', () => {
      const otp = generateNumericOTP();
      expect(otp).toHaveLength(6);
      expect(/^\d+$/.test(otp)).toBe(true);
    });

    it('returns numeric string of custom length', () => {
      const otp = generateNumericOTP(4);
      expect(otp).toHaveLength(4);
    });
  });
});
