// The language marks as one SVG sprite: <use href="/lang-icons.svg#rust">. Built to a static file.
import type { APIRoute } from "astro";
import { langIcons } from "../data/lang-icons";

export const GET: APIRoute = () => {
  const symbols = Object.entries(langIcons)
    .map(([id, icon]) => `<symbol id="${id}" viewBox="0 0 24 24"><path fill="currentColor" d="${icon.path}"/></symbol>`)
    .join("");
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>`, {
    headers: { "Content-Type": "image/svg+xml" },
  });
};
