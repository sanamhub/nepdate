// Agent readiness on the built site, the pull request check beside Lighthouse
// (.github/workflows/site.yml). The runner is shared with patro.nepdate.com: web/agent-check.mjs.
//
//   npm run build && npm run agent-check
import { fileURLToPath } from "node:url";
import { run } from "../../web/agent-check.mjs";

await run({
  site: "nepdate.com",
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  trustPages: ["/about/", "/contact/", "/privacy/"],
});
