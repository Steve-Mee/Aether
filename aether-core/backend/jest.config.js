/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/shared/**/*.ts',
    'src/bootstrap/**/*.ts',
    'src/modules/**/application/**/*.ts',
    'src/modules/**/api/**/*.ts',
    'src/ai/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  // Thresholds reflect post-intelligence-layer surface area; raise as module coverage recovers.
  coverageThreshold: {
    global: {
      lines: 50,
      statements: 50,
    },
    './src/shared/approval/': {
      lines: 60,
      statements: 60,
    },
    './src/bootstrap/': {
      lines: 70,
      statements: 70,
    },
  },
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};
