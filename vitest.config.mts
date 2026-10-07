import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` throws outside React Server Components; tests are fine without it.
      "server-only": new URL("./src/test/empty-module.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Each integration test file boots its own in-memory Postgres (PGlite).
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
