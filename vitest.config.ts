import path from "node:path";

import { defineConfig } from "vitest/config";

// Unit tests for pure functions (no database, no Next.js runtime). `npm test`
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
