/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  moduleNameMapper: {
    "^@resourcegrid/shared$": "<rootDir>/../../../packages/shared/src/index.ts",
  },
  transform: {
    // isolatedModules: transpile-only. Full type-checking is done separately via
    // `tsc --noEmit`; this keeps ts-jest from re-checking heavy type chains
    // (e.g. zod/v4 via the Anthropic helper) per worker, which OOMs the checker.
    "^.+\\.ts$": [
      "ts-jest",
      { tsconfig: "<rootDir>/../tsconfig.json", isolatedModules: true },
    ],
  },
};
