// Agent readiness on a built site, the pull request check beside Lighthouse (.github/workflows/
// site.yml and patro.yml). Each project calls run() from its own scripts/agent-check.mjs.
//
// Is Agentic (is-agentic.com) scores only the live domain from a stored report, so it cannot
// score a pull request. This runs the checks it reports that the sites can pass, against the
// real Worker and static files under `wrangler dev`: Markdown for the home page, Markdown and
// JSON 404s, llms.txt with when-to-use guidance, JSON-LD and trust pages. Writes
// lighthouse/agent-readiness.md (also to the job summary), which the Lighthouse comment appends,
// and exits 1 when a check fails.
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "lighthouse";
const PROBE = "/__agent-readiness-probe-404";

/** Starts `wrangler dev` for the project in `cwd` and resolves its origin once it answers. */
async function startWrangler(cwd, port) {
  // The package's exports do not include its bin, so this is the path npm installs it at.
  const wrangler = join(cwd, "node_modules", "wrangler", "bin", "wrangler.js");
  const child = spawn(process.execPath, [wrangler, "dev", "--local", "--ip", "127.0.0.1", "--port", String(port)], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  let log = "";
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`wrangler dev exited:\n${log}`);
    try {
      await fetch(origin, { signal: AbortSignal.timeout(1000) });
      return { origin, stop: () => child.kill() };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  child.kill();
  throw new Error(`wrangler dev did not answer on ${origin}:\n${log}`);
}

const get = (origin, path, accept) => fetch(new URL(path, origin), { headers: accept ? { Accept: accept } : {}, redirect: "follow" });
const varyHasAccept = (res) => /(^|,)\s*accept\s*(,|$)/i.test(res.headers.get("Vary") ?? "");

/** The JSON-LD objects on a page, flattened out of any @graph. */
function jsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks.flatMap(([, json]) => {
    const data = JSON.parse(json);
    return data["@graph"] ?? [data];
  });
}

/** The visible text of an HTML page's <main>, roughly: tags and whitespace collapsed. */
const mainText = (html) =>
  (html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The checks. Each returns [ok, detail].
 * @param {string} origin
 * @param {{ trustPages: string[], softwareUrls: boolean }} options
 */
function checks(origin, { trustPages, softwareUrls }) {
  return [
    [
      "Markdown for the home page",
      async () => {
        const md = await get(origin, "/", "text/markdown");
        const body = await md.text();
        const html = await get(origin, "/", "text/html");
        const ok =
          md.status === 200 &&
          md.headers.get("Content-Type")?.startsWith("text/markdown") &&
          varyHasAccept(md) &&
          body.trim().length > 0 &&
          html.headers.get("Content-Type")?.startsWith("text/html");
        return [ok, `${md.status} ${md.headers.get("Content-Type")}, Vary: ${md.headers.get("Vary")}; HTML: ${html.headers.get("Content-Type")}`];
      },
    ],
    [
      "Markdown 404",
      async () => {
        const res = await get(origin, PROBE, "text/markdown");
        const body = await res.text();
        const ok = res.status === 404 && res.headers.get("Content-Type")?.startsWith("text/markdown") && body.length >= 20 && /llms\.txt|sitemap/.test(body);
        return [ok, `${res.status} ${res.headers.get("Content-Type")}, ${body.length} characters`];
      },
    ],
    [
      "JSON 404",
      async () => {
        const res = await get(origin, PROBE, "application/json");
        let error;
        try {
          ({ error } = await res.json());
        } catch {}
        const ok = res.status === 404 && res.headers.get("Content-Type")?.startsWith("application/json") && !!error?.code && !!error?.message && !!error?.resolution;
        return [ok, `${res.status} ${res.headers.get("Content-Type")}, code ${error?.code ?? "missing"}`];
      },
    ],
    [
      "llms.txt says when to use it",
      async () => {
        const res = await get(origin, "/llms.txt");
        const body = await res.text();
        return [res.status === 200 && /^## When to use/m.test(body), `${res.status}, ${/^## When to use/m.test(body) ? "has" : "no"} "When to use" section`];
      },
    ],
    [
      "JSON-LD: Organization with a contact point",
      async () => {
        const entities = jsonLd(await (await get(origin, "/", "text/html")).text());
        const org = entities.find((e) => e["@type"] === "Organization");
        const apps = entities.filter((e) => e["@type"] === "SoftwareApplication");
        const appsOk = !softwareUrls || apps.every((e) => e.url);
        const ok = !!org?.contactPoint && !!org?.url && appsOk;
        return [ok, `${entities.map((e) => e["@type"]).join(", ")}${apps.length ? `; SoftwareApplication url ${appsOk ? "set" : "missing"}` : ""}`];
      },
    ],
    ...trustPages.map((path) => [
      `Trust page ${path}`,
      async () => {
        const res = await get(origin, path, "text/html");
        const length = mainText(await res.text()).length;
        return [res.status === 200 && length >= 500, `${res.status}, ${length} characters`];
      },
    ]),
  ];
}

/**
 * Runs the checks against `wrangler dev` in `cwd` (after `npm run build`) and exits with the result.
 * @param {{ site: string, cwd: string, port?: number, trustPages?: string[], softwareUrls?: boolean }} options
 */
export async function run({ site, cwd, port = 8799, trustPages = [], softwareUrls = true }) {
  const { origin, stop } = await startWrangler(cwd, port);
  const rows = [];
  try {
    for (const [name, check] of checks(origin, { trustPages, softwareUrls })) {
      try {
        const [ok, detail] = await check();
        rows.push({ name, ok, detail });
      } catch (error) {
        rows.push({ name, ok: false, detail: String(error) });
      }
    }
  } finally {
    stop();
  }

  const failed = rows.filter((row) => !row.ok);
  const summary = [
    `### Agent readiness on ${site}: ${failed.length ? `${failed.length} of ${rows.length} checks failed` : `all ${rows.length} checks pass`}`,
    "",
    "The checks Is Agentic reports that a static site can pass, run against the built site and its Worker (`wrangler dev`).",
    "",
    "| | Check | Result |",
    "|---|---|---|",
    ...rows.map((row) => `| ${row.ok ? "OK" : "FAIL"} | ${row.name} | ${row.detail.replaceAll("|", "\\|")} |`),
    "",
  ].join("\n");

  mkdirSync(join(cwd, OUT), { recursive: true });
  writeFileSync(join(cwd, OUT, "agent-readiness.md"), summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
  process.exit(failed.length ? 1 : 0);
}
