// The marks and link glyphs as one SVG sprite: <use href="/lang-icons.svg#rust">. Built to a
// static file.
import type { APIRoute } from "astro";
import { linkIcons, marks, type Mark } from "../data/lang-icons";

const part = (p: NonNullable<Mark["parts"]>[number]) =>
  p.stroke
    ? `<path fill="none" stroke="${p.stroke}" stroke-width="1.4" stroke-linecap="round" d="${p.d}"/>`
    : `<path fill="${p.fill}" d="${p.d}"/>`;
const filled = ([id, mark]: [string, Mark]) =>
  mark.parts
    ? `<symbol id="${id}" viewBox="0 0 24 24">${mark.parts.map(part).join("")}</symbol>`
    : mark.outline
    ? outlined([id, mark.path])
    : `<symbol id="${id}" viewBox="0 0 24 24"><path fill="currentColor"${mark.evenOdd ? ' fill-rule="evenodd"' : ""} d="${mark.path}"/></symbol>`;
const outlined = ([id, path]: [string, string]) =>
  `<symbol id="${id}" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="${path}"/></symbol>`;

export const GET: APIRoute = () => {
  const symbols = [...Object.entries(marks).map(filled), ...Object.entries(linkIcons).map(outlined)].join("");
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>`, {
    headers: { "Content-Type": "image/svg+xml" },
  });
};
