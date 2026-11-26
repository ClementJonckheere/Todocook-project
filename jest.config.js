/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  // Les tests d'intégration partagent une même base Postgres (TEST_DATABASE_URL) et celui des
  // migrations la vide entièrement : exécution en série pour éviter qu'ils se perturbent.
  maxWorkers: 1,
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    // Tests de routes : next/headers n'existe qu'à l'intérieur du serveur Next
    "^next/headers$": "<rootDir>/src/__tests__/support/next-headers.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFiles: ["<rootDir>/src/__tests__/support/env.ts"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
};
