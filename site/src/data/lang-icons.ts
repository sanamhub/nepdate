// Language marks from Simple Icons (CC0), keyed by Port.id. Served once as an SVG sprite
// (pages/lang-icons.svg.ts) so the marks are cached and stay out of the page's HTML.
import { siC, siCplusplus, siDotnet, siGo, siKotlin, siPython, siRust, siSwift, siTypescript } from "simple-icons";

export const langIcons: Record<string, { path: string }> = {
  csharp: siDotnet,
  rust: siRust,
  go: siGo,
  typescript: siTypescript,
  python: siPython,
  swift: siSwift,
  kotlin: siKotlin,
  cpp: siCplusplus,
  c: siC,
};
