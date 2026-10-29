import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tmp = resolve(root, ".tmp");

await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });

await build({
  entryPoints: {
    "parser-smoke": resolve(root, "scripts/parser-smoke.ts"),
    "extract-smoke": resolve(root, "scripts/extract-smoke.ts")
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["pdfjs-dist"],
  outdir: tmp,
  outExtension: { ".js": ".cjs" },
  logLevel: "error"
});

for (const name of ["parser-smoke", "extract-smoke"]) {
  const result = spawnSync(process.execPath, [resolve(tmp, `${name}.cjs`)], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
