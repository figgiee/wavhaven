// jest.config.js
const nextJest = require('next/jest');

// Providing the path to your Next.js app to load next.config.js and .env files in your test environment
const createJestConfig = nextJest({
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  testEnvironment: 'jest-environment-jsdom',
  preset: 'ts-jest',
  // Handle module aliases (this will be automatically configured by next/jest)
  moduleNameMapper: {
    // Example: Handle CSS imports (if you need to)
    // '^.+\\.(css|sass|scss)$?': '<rootDir>/__mocks__/styleMock.js',

    // Handle image imports
    // '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$/i': '<rootDir>/__mocks__/fileMock.js',

    // Handle module aliases (this should match your tsconfig.json paths)
    '^@/(.*)$?': '<rootDir>/src/$1',
  },
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // Indicates whether the coverage information should be collected while executing the test
  // collectCoverage: true,
  // The directory where Jest should output its coverage files
  // coverageDirectory: "coverage",
  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // if you use TypeScript for setup
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig); 