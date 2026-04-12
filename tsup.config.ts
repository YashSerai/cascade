import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["server/index.ts"],
  outDir: "dist/server",
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true
});
