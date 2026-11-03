// Fails when a page types a release version instead of importing it from src/data/ports.ts, and
// when a typed version is not one the hub records in spec/versions.json. Run by `npm run check`
// and in CI.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const allowed = new Set([join("src", "data", "ports.ts")]);
const spec = JSON.parse(readFileSync(join(root, "..", "spec", "versions.json"), "utf8"));
// Both spellings count as known: the semver one and the PEP 440 one PyPI uses.
const pep440 = (v) => v.replace(/-(beta|rc)\.(\d+)$/, (_, kind, n) => `${kind === "beta" ? "b" : "rc"}${n}`);
const known = new Set([spec.line, ...Object.values(spec.sdks), ...Object.values(spec.sdks).map(pep440)]);
// A pre-release in semver (0.1.0-beta.1) or PEP 440 (0.1.0b1) spelling.
const version = /\b\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+|(?:a|b|rc)\d+)\b/g;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(astro|md|mdx|ts|mjs)$/.test(name)) yield path;
  }
}

const typed = [];
const unknown = [];
for (const path of [...files(join(root, "src")), join(root, "astro.config.mjs")]) {
  const rel = relative(root, path);
  if (allowed.has(rel)) continue;
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const match of line.matchAll(version)) {
        const found = `${rel}:${i + 1}: ${match[0]}`;
        (known.has(match[0]) ? typed : unknown).push(found);
      }
    });
}

if (unknown.length > 0) {
  console.error("Versions not in spec/versions.json:");
  for (const problem of unknown) console.error(`  ${problem}`);
}
if (typed.length > 0) {
  console.error("Versions typed outside src/data/ports.ts:");
  for (const problem of typed) console.error(`  ${problem}`);
}
if (unknown.length > 0 || typed.length > 0) process.exit(1);
console.log("check-versions: every version comes from spec/versions.json, or the unreleased Ruby constant, through src/data/ports.ts");
