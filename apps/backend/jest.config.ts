import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'UNIT',
      rootDir: '.',
      roots: ['<rootDir>/src'],
      testRegex: '.*\\.unit\\.test\\.ts$',
      moduleFileExtensions: ['js', 'json', 'ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
      },
      moduleNameMapper: {
        '^shared/(.*)$': '<rootDir>/shared/$1',
      },
    },
    {
      displayName: 'INTEGRATION',
      rootDir: '.',
      roots: ['<rootDir>/src'],
      testRegex: '.*\\.int\\.test\\.ts$',
      globalSetup: '<rootDir>/tests/setup.ts',
      globalTeardown: '<rootDir>/tests/teardown.ts',
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
      },
      moduleNameMapper: {
        '^shared/(.*)$': '<rootDir>/shared/$1',
      },
    },
    {
      displayName: 'E2E',
      rootDir: '.',
      roots: ['<rootDir>/src'],
      testRegex: '.*\\.e2e\\.test\\.ts$',
      globalSetup: '<rootDir>/tests/setup.ts',
      globalTeardown: '<rootDir>/tests/teardown.ts',
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
      },
      moduleNameMapper: {
        '^shared/(.*)$': '<rootDir>/shared/$1',
      },
    },
  ],
};
export default config;
