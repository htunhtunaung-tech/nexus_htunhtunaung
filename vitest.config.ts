import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Lets tests use "@/lib/..." imports, like the app does
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node", testTimeout: 20000,
    include: ["tests/**/*.test.ts"],
  },
});