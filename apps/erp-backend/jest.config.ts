// apps/erp-backend/jest.config.ts
// Configuration for running unit + integration tests
export default {
  // Recognize file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Project root
  rootDir: '.',

  // Only run unit and integration specs
  testMatch: [
    '<rootDir>/test/unit/**/*.spec.ts',
    '<rootDir>/test/integration/**/*.spec.ts',
  ],

  // Ignore e2e tests in this config
  testPathIgnorePatterns: ['<rootDir>/test/e2e/'],

  // Use ts-jest for TypeScript
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Module name mappings for imports
  moduleNameMapper: {
    // Stub Prisma client to use test stub instead of real generated client
    '^generated/prisma$': '<rootDir>/test/prisma-client.ts',

    '^generated/prisma/(.*)$': '<rootDir>/test/prisma-client.ts', // catch sub-imports too

    // Map src/ aliases to the src directory
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  // Only collect coverage from actual source files
  collectCoverageFrom: ['<rootDir>/src/**/*.(t|j)s'],
  coverageDirectory: '<rootDir>/coverage',

  // Node environment for tests
  testEnvironment: 'node',
};
