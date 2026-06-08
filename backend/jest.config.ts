import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!app.ts',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: { lines: 50 },
  },
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^../../config/env$': '<rootDir>/__tests__/__mocks__/env.mock.ts',
    '^../config/env$': '<rootDir>/__tests__/__mocks__/env.mock.ts',
    '^./config/env$': '<rootDir>/__tests__/__mocks__/env.mock.ts',
  },
  testTimeout: 15000,
  verbose: true,
};

export default config;
