// Marks for the languages, registries and platforms, mostly from Simple Icons (CC0), and the
// outline glyphs for links. Served once as an SVG sprite (pages/lang-icons.svg.ts) so the marks are
// cached and stay out of the page's HTML.
//
// Each mark carries its brand colour twice: as published, for the light theme, and adjusted for the
// dark one, where a black or very dark brand colour would vanish. brandColours() does that once at
// build time, so the CSS only picks one of two custom properties.
import {
  siAndroid,
  siApachemaven,
  siApple,
  siC,
  siCplusplus,
  siDart,
  siGithub,
  siGo,
  siIos,
  siKotlin,
  siLinux,
  siNpm,
  siNuget,
  siPackagist,
  siPhp,
  siPypi,
  siPython,
  siRuby,
  siRubygems,
  siRust,
  siSwift,
  siTypescript,
  siZig,
} from "simple-icons";

export interface Mark {
  path: string;
  hex: string;
  /** Holes cut out with the even-odd rule (the hand-drawn marks below). */
  evenOdd?: boolean;
  /** Drawn as a 1.8 unit line instead of filled (the Java cup). */
  outline?: boolean;
}

// Simple Icons has no C# mark, so this one is drawn on the same 24 unit grid: the hexagon with the
// C and the sharp cut out of it. The sharp is ten pieces that never overlap, so even-odd keeps
// every piece a hole.
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const csharp: Mark = {
  hex: "68217A",
  evenOdd: true,
  path: [
    "M12 1.5 21.1 6.75v10.5L12 22.5l-9.1-5.25V6.75Z",
    "M13.83 8.79A5 5 0 1 0 13.83 15.21L12.37 13.99A3.1 3.1 0 1 1 12.37 10.01Z",
    rect(16, 9.4, 0.8, 1.5),
    rect(16, 11.7, 0.8, 0.8),
    rect(16, 13.3, 0.8, 1.3),
    rect(17.9, 9.4, 0.8, 1.5),
    rect(17.9, 11.7, 0.8, 0.8),
    rect(17.9, 13.3, 0.8, 1.3),
    rect(15, 10.9, 4.6, 0.8),
    rect(15, 12.5, 4.6, 0.8),
  ].join(""),
};

// Windows has no Simple Icons mark either: four panes.
const windows: Mark = {
  hex: "0078D4",
  path: "M3 5.1 10.4 4v7.2H3Zm8.4-1.2L21 2.5v8.7h-9.6ZM3 12.8h7.4V20L3 18.9Zm8.4 0H21v8.7l-9.6-1.4Z",
};

// Simple Icons carries no Java cup (only the OpenJDK mascot), so this is the cup and its steam as a
// line drawing on the same grid, in Java's orange.
const java: Mark = {
  hex: "E76F00",
  outline: true,
  path: "M9.5 2.5c-1.5 1.5 1.5 2.5 0 4M13 3.5c-1.1 1.1 1.1 1.9 0 3M5 10h11v3.5a5.5 5.5 0 0 1-11 0ZM16 11.3h1.1a2.3 2.3 0 0 1 0 4.6H15.5M3.5 21.5h15",
};

/** Language marks, keyed by Port.id. */
export const langIcons: Record<string, Mark> = {
  csharp,
  rust: siRust,
  go: siGo,
  typescript: siTypescript,
  python: siPython,
  php: siPhp,
  ruby: siRuby,
  swift: siSwift,
  kotlin: siKotlin,
  java,
  cpp: siCplusplus,
  c: siC,
  dart: siDart,
  zig: siZig,
};

/** Registry marks, keyed by the label in Port.registry. */
export const registryIcons: Record<string, Mark> = {
  NuGet: siNuget,
  "crates.io": siRust,
  "pkg.go.dev": siGo,
  npm: siNpm,
  PyPI: siPypi,
  Packagist: siPackagist,
  RubyGems: siRubygems,
  "Swift Package Index": siSwift,
  "Maven Central": siApachemaven,
  "pub.dev": siDart,
  Releases: siGithub,
  "GitHub Releases": siGithub,
};

/** Platforms, and the source link's GitHub mark. */
export const platformIcons: Record<string, Mark> = {
  windows,
  macos: siApple,
  linux: siLinux,
  android: siAndroid,
  ios: siIos,
  source: siGithub,
};

/** Outline glyphs on the same 24 unit grid: an open book for the guide, a box for a package. */
export const linkIcons: Record<string, string> = {
  guide: "M12 6.5C10.3 5.2 7.8 4.5 4 4.5v13c3.8 0 6.3.7 8 2 1.7-1.3 4.2-2 8-2v-13c-3.8 0-6.3.7-8 2Zm0 0v13",
  package: "M12 3 4 7v10l8 4 8-4V7l-8-4ZM4 7l8 4 8-4M12 11v10",
};

export function registryId(label: string): string {
  return `reg-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/** Every filled mark by sprite id. Registry marks are prefixed so they never collide. */
export const marks: Record<string, Mark> = {
  ...langIcons,
  ...platformIcons,
  ...Object.fromEntries(Object.entries(registryIcons).map(([label, mark]) => [registryId(label), mark])),
};

/**
 * The brand colour for each theme. Light: as published, darkened where it is too pale to read on
 * paper (C's grey blue, Linux yellow). Dark: black and grey marks take the theme's ink, and other
 * dark colours are lifted toward white so they keep their hue.
 */
export function brandColours(hex: string): { light: string; dark: string } {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const mix = (toward: number, amount: number) =>
    `#${[r, g, b]
      .map((c) => Math.round((c + (toward - c) * amount) * 255).toString(16).padStart(2, "0"))
      .join("")}`;
  const light = chroma < 0.12 && luminance < 0.05 ? "var(--nd-ink)" : luminance > 0.45 ? mix(0, 0.22) : `#${hex}`;
  const dark = chroma < 0.12 ? "var(--nd-ink)" : luminance < 0.12 ? mix(1, 0.45) : `#${hex}`;
  return { light, dark };
}
