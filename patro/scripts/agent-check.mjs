// Agent readiness on the built site, the pull request check beside Lighthouse
// (.github/workflows/patro.yml). The runner is shared with nepdate.com: web/agent-check.mjs. The
// About, Contact and Privacy pages live on nepdate.com, so they are checked there.
//
//   npm run build && npm run agent-check
import { fileURLToPath } from "node:url";
import { run } from "../../web/agent-check.mjs";

await run({
  site: "patro",
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  port: 8798,
});
