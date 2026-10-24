// The site's three font families for Astro's font API, read from the installed fontsource
// packages so the files and their unicode ranges always match the package version. Astro writes
// the @font-face rules, hashes the files and generates metric-matched fallbacks.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fontProviders } from "astro/config";

const require = createRequire(import.meta.url);

/**
 * One subset of a fontsource variable package as a local-provider variant.
 * @param {string} pkg e.g. "@fontsource-variable/noto-sans"
 * @param {string} subset e.g. "latin"
 */
function variant(pkg, subset) {
  const css = readFileSync(require.resolve(`${pkg}/wght.css`), "utf8");
  for (const block of css.split("@font-face").slice(1)) {
    const file = /url\(\.\/(files\/[^)]+-wght-normal\.woff2)\)/.exec(block)?.[1];
    if (!file?.endsWith(`-${subset}-wght-normal.woff2`)) continue;
    const weight = /font-weight:\s*([\d ]+);/.exec(block)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1];
    if (!weight || !range) break;
    return {
      src: [`${pkg}/${file}`],
      weight,
      style: "normal",
      display: "swap",
      unicodeRange: range.split(",").map((part) => part.trim()),
    };
  }
  throw new Error(`fonts.mjs: no ${subset} subset in ${pkg}/wght.css`);
}

/**
 * @param {string} name
 * @param {string} cssVariable
 * @param {string} pkg
 * @param {string} subset
 * @param {string[]} fallbacks
 */
const family = (name, cssVariable, pkg, subset, fallbacks) => ({
  provider: fontProviders.local(),
  name,
  cssVariable,
  fallbacks,
  optimizedFallbacks: fallbacks.length > 0,
  options: { variants: [variant(pkg, subset)] },
});

export const fonts = [
  // Devanagari comes first in --nd-font-sans and covers only Devanagari, so it has no fallbacks of
  // its own: Latin text falls through to Noto Sans and its metric-matched fallback.
  family("Noto Sans Devanagari", "--nd-font-noto-deva", "@fontsource-variable/noto-sans-devanagari", "devanagari", []),
  family("Noto Sans", "--nd-font-noto", "@fontsource-variable/noto-sans", "latin", ["sans-serif"]),
  family("JetBrains Mono", "--nd-font-jetbrains", "@fontsource-variable/jetbrains-mono", "latin", ["monospace"]),
];
