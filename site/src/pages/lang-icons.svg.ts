// The language marks and link glyphs as one SVG sprite: <use href="/lang-icons.svg#rust">.
// Built to a static file.
import type { APIRoute } from "astro";
import { langIcons, linkIcons } from "../data/lang-icons";

const filled = ([id, icon]: [string, { path: string }]) =>
  `<symbol id="${id}" viewBox="0 0 24 24"><path fill="currentColor" d="${icon.path}"/></symbol>`;
const outlined = ([id, path]: [string, string]) =>
  `<symbol id="${id}" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="${path}"/></symbol>`;

export const GET: APIRoute = () => {
  const symbols = [...Object.entries(langIcons).map(filled), ...Object.entries(linkIcons).map(outlined)].join("");
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>`, {
    headers: { "Content-Type": "image/svg+xml" },
  });
};
