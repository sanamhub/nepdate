// Lighthouse on the built site, the pull request check (.github/workflows/patro.yml). The runner
// is shared with nepdate.com: web/lighthouse.mjs.
//
//   npm run build && npm run lighthouse
import { fileURLToPath } from "node:url";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { run } from "../../web/lighthouse.mjs";

await run({
  site: "patro",
  dist: fileURLToPath(new URL("../dist/", import.meta.url)),
  pages: ["/", "/2083/07/22/", "/2083/"],
  lighthouse,
  chromeLauncher,
  desktopConfig,
});
