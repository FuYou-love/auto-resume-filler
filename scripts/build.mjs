import { build, context } from "esbuild";
import { cp, copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outdir = resolve(root, "dist");
const watch = process.argv.includes("--watch");

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await Promise.all([
  copyFile(resolve(root, "manifest.json"), resolve(outdir, "manifest.json")),
  copyFile(resolve(root, "src/popup/index.html"), resolve(outdir, "popup.html")),
  copyFile(resolve(root, "src/options/index.html"), resolve(outdir, "options.html")),
  cp(resolve(root, "node_modules/pdfjs-dist/cmaps"), resolve(outdir, "cmaps"), { recursive: true }),
  cp(resolve(root, "node_modules/pdfjs-dist/standard_fonts"), resolve(outdir, "standard_fonts"), { recursive: true })
]);

const options = {
  entryPoints: {
    popup: resolve(root, "src/popup/main.tsx"),
    options: resolve(root, "src/options/main.tsx"),
    content: resolve(root, "src/content.ts"),
    background: resolve(root, "src/background.ts"),
    "pdf-worker": resolve(root, "src/resume/pdf-worker.ts")
  },
  bundle: true,
  outdir,
  format: "iife",
  platform: "browser",
  target: ["chrome114", "edge114"],
  jsx: "automatic",
  sourcemap: watch,
  minify: !watch,
  logLevel: "info"
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("正在监听源码变化，构建目录：dist");
} else {
  await build(options);
}
