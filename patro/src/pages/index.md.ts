// The home page as Markdown, built to dist/index.md. The Worker (worker.js, ADR-0010) serves it for
// `/` when a client asks for text/markdown. It is public/llms.txt, which already describes every
// page in Markdown, so the two never drift.
import type { APIRoute } from "astro";
import llms from "../../public/llms.txt?raw";

export const GET: APIRoute = () => new Response(llms, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
