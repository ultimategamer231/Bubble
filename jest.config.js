/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/index.ts', '!src/**/*.d.ts'],
  // Phase 1 gate: the pure domain must stay at or above 90% line coverage.
  coverageThreshold: { './src/domain/': { lines: 90 } },
};
