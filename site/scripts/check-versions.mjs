// Fails when a page types a release version instead of importing it from src/data/ports.ts, so a
// release changes one file. Run by `npm run check` and in CI.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const allowed = new Set([join("src", "data", "ports.ts")]);
// A pre-release in semver (0.1.0-beta.1) or PEP 440 (0.1.0b1) spelling.
const version = /\b\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+|(?:a|b|rc)\d+)\b/g;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(astro|md|mdx|ts|mjs)$/.test(name)) yield path;
  }
}

const problems = [];
for (const path of [...files(join(root, "src")), join(root, "astro.config.mjs")]) {
  const rel = relative(root, path);
  if (allowed.has(rel)) continue;
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const match of line.matchAll(version)) problems.push(`${rel}:${i + 1}: ${match[0]}`);
    });
}

if (problems.length > 0) {
  console.error("Versions typed outside src/data/ports.ts:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("check-versions: every version comes from src/data/ports.ts");
