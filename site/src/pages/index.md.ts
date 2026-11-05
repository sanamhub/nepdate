// The home page as Markdown, built to dist/index.md. The Worker (worker.js, ADR-0010) serves it
// for `/` when a client asks for text/markdown. Built from the same ports.ts as the HTML page, so
// the install lines cannot drift.
import type { APIRoute } from "astro";
import { DATA_ERROR_FORM, HUB, MITIBAR_VERSION, PATRO, ports, versionLine } from "../data/ports";

export const GET: APIRoute = ({ site }) => {
  const base = site?.href ?? "https://nepdate.com/";
  const url = (path: string) => new URL(path, base).href;
  const languages = new Intl.ListFormat("en", { type: "conjunction" }).format(ports.map((port) => port.name));

  const install = ports.map((port) => {
    const patro = port.patroInstall ? ` Patro: \`${port.patroInstall}\`.` : " The patro is part of the same package.";
    return `- **${port.name}**: \`${port.install}\`.${patro} Guide: ${url(`/docs/${port.id}/`)}`;
  });

  const body = [
    "# NepDate: fast Nepali dates for every language you ship",
    "",
    `> Bikram Sambat (BS, Nepali calendar) date libraries for ${languages}, built from one dataset and one spec so every language gives the same answer. Plus MitiBar, a Nepali calendar for your desktop, and a free online patro.`,
    "",
    "Every port converts between BS and AD for BS 1901-01-01 to 2199-12-30 (AD 1844-04-11 to 2143-04-15), formats and parses dates in Nepali and English, and works with months, ranges and fiscal years. Each ships a core package and a separate patro package with tithi, public holidays and events for BS 2077 to 2084.",
    `Every SDK shares the ${versionLine} version line; C# NepDate is the original library, with its own versions.`,
    "",
    "## Install the core",
    "",
    ...install,
    "",
    "## Where to go next",
    "",
    `- Quick start: ${url("/docs/quickstart/")}`,
    `- Every page for agents: ${url("/llms.txt")} (full text: ${url("/llms-full.txt")})`,
    `- Date picker for the browser: ${url("/docs/datepicker/")}`,
    `- Online patro, a page for every month and day: ${PATRO}`,
    `- MitiBar ${MITIBAR_VERSION}, the desktop calendar: ${url("/mitibar/")}`,
    `- Performance against other libraries: ${url("/docs/project/performance/")}`,
    `- Source, data and spec: ${HUB}`,
    `- Report a wrong date, holiday or tithi: ${DATA_ERROR_FORM}`,
    `- About, contact and privacy: ${url("/about/")}, ${url("/contact/")}, ${url("/privacy/")}`,
    "",
    "Holiday data is informational; NepDate is not affiliated with the Government of Nepal.",
    "",
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
