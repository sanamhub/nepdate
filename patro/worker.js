// patro.nepdate.com's Worker: Markdown and JSON for agents in front of the static files
// (ADR-0010). The logic is shared with nepdate.com in web/agent-worker.js.
import { createWorker } from "../web/agent-worker.js";

export default createWorker({ docs: "https://nepdate.com/docs/" });
