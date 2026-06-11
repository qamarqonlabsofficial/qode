import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["cjs"],
  target: "node18",
  outDir: "dist",
  clean: true,
  splitting: false,
  shims: true,
  esbuildOptions(options) {
    options.banner = {
      js: "#!/usr/bin/env node",
    };
  },
});
