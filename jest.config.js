/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.jest.json' }
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@core-v3/(.*)$': '<rootDir>/core-v3/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/dist/'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Improve performance and avoid ESM issues in node_modules unless explicitly needed
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.(spec|test).(ts|tsx|js|jsx)',
    '<rootDir>/**/?(*.)+(spec|test).(ts|tsx|js|jsx)'
  ],
};
