// @ts-check
const esbuild = require("esbuild");
const path = require("path");

const isWatch = process.argv.includes("--watch");
const isProduction = process.env.NODE_ENV === "production";

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: [path.resolve(__dirname, "src/extension.ts")],
  bundle: true,
  outfile: path.resolve(__dirname, "dist/extension.js"),
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node16",
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: "info",
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await esbuild.build(buildOptions);
    console.log("Build complete.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
