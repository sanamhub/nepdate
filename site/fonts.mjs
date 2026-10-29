// The font families for Astro's font API, read from the installed fontsource packages so the files
// and their unicode ranges always match the package version. Astro writes the @font-face rules,
// hashes the files and generates metric-matched fallbacks. Shared with patro/ (ADR-0006), which
// passes its own module URL and its own Astro's font providers, so nothing resolves from site/:
// this file imports no package.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

/**
 * One subset of a fontsource variable package as a local-provider variant.
 * @param {NodeRequire} require resolves the package from the calling project
 * @param {string} pkg e.g. "@fontsource-variable/noto-sans"
 * @param {string} subset e.g. "latin"
 */
function variant(require, pkg, subset) {
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
 * The font families for a project, resolved from that project's own packages.
 * @param {string} moduleUrl the calling config's `import.meta.url`
 * @param {typeof import("astro/config").fontProviders} providers the caller's `fontProviders`
 * @param {{ mono?: boolean }} [options] `mono: false` leaves out the code face
 */
export function fontsFor(moduleUrl, providers, { mono = true } = {}) {
  const require = createRequire(moduleUrl);
  /**
   * @param {string} name
   * @param {string} cssVariable
   * @param {string} pkg
   * @param {string} subset
   * @param {string[]} fallbacks
   */
  const family = (name, cssVariable, pkg, subset, fallbacks) => ({
    provider: providers.local(),
    name,
    cssVariable,
    fallbacks,
    optimizedFallbacks: fallbacks.length > 0,
    options: { variants: [variant(require, pkg, subset)] },
  });
  return [
    // Devanagari comes first in --nd-font-sans and covers only Devanagari, so it has no fallbacks
    // of its own: Latin text falls through to Noto Sans and its metric-matched fallback.
    family("Noto Sans Devanagari", "--nd-font-noto-deva", "@fontsource-variable/noto-sans-devanagari", "devanagari", []),
    family("Noto Sans", "--nd-font-noto", "@fontsource-variable/noto-sans", "latin", ["sans-serif"]),
    ...(mono
      ? [family("JetBrains Mono", "--nd-font-jetbrains", "@fontsource-variable/jetbrains-mono", "latin", ["monospace"])]
      : []),
  ];
}

