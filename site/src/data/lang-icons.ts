// Language marks from Simple Icons (CC0), keyed by Port.id or by an id in Port.alsoFor, and the
// glyphs for each language's links. Served once as an SVG sprite (pages/lang-icons.svg.ts) so the
// marks are cached and stay out of the page's HTML.
import {
  siAndroid,
  siC,
  siCplusplus,
  siDotnet,
  siGithub,
  siGo,
  siJavascript,
  siKotlin,
  siOpenjdk,
  siPython,
  siRust,
  siSwift,
  siTypescript,
} from "simple-icons";

export const langIcons: Record<string, { path: string }> = {
  csharp: siDotnet,
  rust: siRust,
  go: siGo,
  typescript: siTypescript,
  javascript: siJavascript,
  python: siPython,
  swift: siSwift,
  kotlin: siKotlin,
  java: siOpenjdk,
  android: siAndroid,
  cpp: siCplusplus,
  c: siC,
  // The source link is a GitHub repository.
  source: siGithub,
};

/** Outline glyphs on the same 24 unit grid: an open book for the guide, a box for the registry. */
export const linkIcons: Record<string, string> = {
  guide: "M12 6.5C10.3 5.2 7.8 4.5 4 4.5v13c3.8 0 6.3.7 8 2 1.7-1.3 4.2-2 8-2v-13c-3.8 0-6.3.7-8 2Zm0 0v13",
  package: "M12 3 4 7v10l8 4 8-4V7l-8-4ZM4 7l8 4 8-4M12 11v10",
};
