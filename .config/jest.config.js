/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['ts', 'js', 'html', 'json'],
  rootDir: './..',
  testMatch: [`<rootDir>/src/**/*.test.ts`],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: `<rootDir>/tsconfig.spec.json`,
      },
    ],
  },
  moduleNameMapper: {
    uuid: require.resolve('uuid'),
  },
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
  passWithNoTests: false,
  forceExit: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/test/*.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/**/*.t.ts',
    '!src/**/*.i.ts',
  ],
  coverageReporters: ['clover', 'json', 'lcov', ['text', { skipFull: false }], 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: '<rootDir>/coverage',
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: '<rootDir>/coverage', outputName: `test-results.xml` }],
    ['jest-slow-test-reporter', { numTests: 8, warnOnSlowerThan: 300, color: true }],
    ['jest-html-reporter', { outputPath: '<rootDir>/coverage/report.html' }],
  ],
};
