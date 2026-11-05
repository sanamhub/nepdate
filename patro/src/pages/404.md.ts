// The "page not found" answer in Markdown, built to dist/404.md. The Worker (worker.js, ADR-0010)
// sends it with status 404 when a client that asks for text/markdown requests a path with no page.
import type { APIRoute } from "astro";
import { FIRST_YEAR, LAST_YEAR } from "../lib/patro";

export const GET: APIRoute = () => {
  const body = [
    "# Page not found",
    "",
    `There is no page at this address on patro.nepdate.com. Months run from Baishakh ${FIRST_YEAR} to Chaitra ${LAST_YEAR} at \`/YYYY/MM/\`, and a day has its own page at \`/YYYY/MM/DD/\` when the patro has data for it.`,
    "",
    "- Every page pattern, for agents: https://patro.nepdate.com/llms.txt",
    "- This month: https://patro.nepdate.com/",
    "- The NepDate libraries and docs: https://nepdate.com/docs/",
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
