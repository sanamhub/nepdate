// The "page not found" answer in Markdown, built to dist/404.md. The Worker (worker.js, ADR-0010)
// sends it with status 404 when a client that asks for text/markdown requests a path with no page.
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const url = (path: string) => new URL(path, site?.href ?? "https://nepdate.com/").href;
  const body = [
    "# Page not found",
    "",
    "There is no page at this address on nepdate.com. It may have moved, or the link has a typo.",
    "",
    `- Every page, for agents: ${url("/llms.txt")}`,
    `- The documentation: ${url("/docs/")}`,
    `- The sitemap: ${url("/sitemap-index.xml")}`,
    `- The home page: ${url("/")}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
