// node --test web/agent-worker.test.js: the Worker against a fake ASSETS binding that serves a few
// files the way Workers static assets does (404 page for a missing path, as wrangler.jsonc sets).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createWorker, markdownPath, preferred, quality } from "./agent-worker.js";

const FILES = {
  "/": ["<!doctype html><title>Home</title>", "text/html; charset=utf-8"],
  "/index.md": ["# Home\n\nMarkdown home.\n", "text/markdown"],
  "/docs/": ["<!doctype html><title>Docs</title>", "text/html; charset=utf-8"],
  "/404.md": ["# Page not found\n\nSee /llms.txt.\n", "text/markdown"],
  "/404.html": ["<!doctype html><title>404</title>", "text/html; charset=utf-8"],
  "/llms.txt": ["# Site\n", "text/plain; charset=utf-8"],
};

const ASSETS = {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const file = FILES[pathname];
    const head = request.method === "HEAD";
    if (file) return new Response(head ? null : file[0], { status: 200, headers: { "Content-Type": file[1], "X-Content-Type-Options": "nosniff" } });
    const [body, type] = FILES["/404.html"];
    return new Response(head ? null : body, { status: 404, headers: { "Content-Type": type } });
  },
};

const worker = createWorker({ docs: "https://example.test/docs/" });
const get = (path, accept, method = "GET") =>
  worker.fetch(new Request(`https://example.test${path}`, { method, headers: accept ? { Accept: accept } : {} }), { ASSETS });

const BROWSER = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

describe("preferred", () => {
  it("gives browsers and plain clients HTML", () => {
    assert.equal(preferred(BROWSER), "html");
    assert.equal(preferred("*/*"), "html");
    assert.equal(preferred(null), "html");
    assert.equal(preferred(""), "html");
  });
  it("gives Markdown when it is named at least as high as HTML", () => {
    assert.equal(preferred("text/markdown"), "markdown");
    assert.equal(preferred("text/markdown, text/html;q=0.9"), "markdown");
    assert.equal(preferred("text/html, text/markdown"), "markdown");
    assert.equal(preferred("text/html, text/markdown;q=0.5"), "html");
    assert.equal(preferred("text/markdown;q=0"), "html");
  });
  it("gives JSON only when it is named and Markdown is not", () => {
    assert.equal(preferred("application/json"), "json");
    assert.equal(preferred("application/json, text/markdown"), "markdown");
    assert.equal(preferred("text/html, application/json;q=0.9"), "html");
  });
  it("reads q values and ignores case and spaces", () => {
    assert.equal(quality("TEXT/Markdown ; q=0.4", "text/markdown"), 0.4);
    assert.equal(quality("text/*", "text/markdown"), 0);
  });
});

describe("markdownPath", () => {
  it("maps a page path to its index.md", () => {
    assert.equal(markdownPath("/"), "/index.md");
    assert.equal(markdownPath("/docs"), "/docs/index.md");
    assert.equal(markdownPath("/docs/"), "/docs/index.md");
    assert.equal(markdownPath("/index.md"), "/index.md");
  });
});

describe("worker", () => {
  it("serves the home page as Markdown with Vary: Accept", async () => {
    const res = await get("/", "text/markdown");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "text/markdown; charset=utf-8");
    assert.equal(res.headers.get("Vary"), "Accept");
    assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
    assert.match(await res.text(), /^# Home/);
  });

  it("serves HTML to a browser, with Vary: Accept", async () => {
    const res = await get("/", BROWSER);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("Content-Type"), /^text\/html/);
    assert.equal(res.headers.get("Vary"), "Accept");
    assert.match(await res.text(), /<title>Home/);
  });

  it("falls back to HTML for a page without a Markdown file", async () => {
    const res = await get("/docs/", "text/markdown");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("Content-Type"), /^text\/html/);
    assert.equal(res.headers.get("Vary"), "Accept");
  });

  it("answers a missing path in Markdown with 404", async () => {
    const res = await get("/no-such-page", "text/markdown");
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("Content-Type"), "text/markdown; charset=utf-8");
    const body = await res.text();
    assert.ok(body.length >= 20);
    assert.match(body, /llms\.txt/);
  });

  it("answers a missing path in JSON with 404 and a resolution", async () => {
    const res = await get("/api/nothing", "application/json");
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("Content-Type"), "application/json; charset=utf-8");
    const { error } = await res.json();
    assert.equal(error.code, "not_found");
    assert.equal(error.status, 404);
    assert.equal(error.message, "No page at /api/nothing.");
    assert.equal(error.llms, "https://example.test/llms.txt");
    assert.equal(error.docs, "https://example.test/docs/");
    assert.match(error.resolution, /no API/);
  });

  it("keeps the HTML 404 page for browsers", async () => {
    const res = await get("/no-such-page", BROWSER);
    assert.equal(res.status, 404);
    assert.match(await res.text(), /<title>404/);
  });

  it("passes other files through untouched", async () => {
    const res = await get("/llms.txt", "text/markdown");
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "# Site\n");
    const plain = await get("/llms.txt", "*/*");
    assert.equal(plain.headers.get("Vary"), null);
  });

  it("answers HEAD without a body", async () => {
    const res = await get("/no-such-page", "application/json", "HEAD");
    assert.equal(res.status, 404);
    assert.equal(await res.text(), "");
  });

  it("leaves other methods to the static files", async () => {
    const res = await get("/", "text/markdown", "POST");
    assert.match(res.headers.get("Content-Type"), /^text\/html/);
  });
});
