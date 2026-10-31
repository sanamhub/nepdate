// Lighthouse on the built site, the pull request check (.github/workflows/site.yml). The runner
// is shared with patro.nepdate.com: web/lighthouse.mjs.
//
//   npm run build && npm run lighthouse
import { fileURLToPath } from "node:url";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { run } from "../../web/lighthouse.mjs";

await run({
  site: "nepdate.com",
  dist: fileURLToPath(new URL("../dist/", import.meta.url)),
  pages: ["/", "/mitibar/", "/docs/quickstart/", "/docs/project/performance/"],
  lighthouse,
  chromeLauncher,
  desktopConfig,
});
