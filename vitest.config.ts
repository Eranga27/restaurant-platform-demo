import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    setupFiles: ["tests/unit/setup.ts"],
    // `server-only` throws outside a React Server environment; stub it for tests.
    alias: {
      "server-only": fileURLToPath(new URL("./tests/unit/stubs/empty.ts", import.meta.url)),
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          exclude: ["tests/unit/db/**"],
        },
      },
      {
        // Each database test file boots its own in-memory Postgres (PGlite,
        // a few hundred MB). One at a time, or parallel workers run out of memory.
        extends: true,
        test: {
          name: "db",
          include: ["tests/unit/db/**/*.test.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
