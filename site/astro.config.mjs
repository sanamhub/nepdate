// nepdate.com: the landing page (src/pages/index.astro) and the docs under /docs/ (Starlight).
// Built to static files in dist/ and served by a Cloudflare Worker (wrangler.jsonc, ADR-0005).
import starlight from "@astrojs/starlight";
import { defineConfig, fontProviders } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import starlightLlmsTxt from "starlight-llms-txt";
import { fontsFor } from "./fonts.mjs";
import { versionLine, ports } from "./src/data/ports";

// Every language in family order (ports.ts), for the descriptions below.
const languageList = new Intl.ListFormat("en", { type: "conjunction" }).format(ports.map((port) => port.name));

export default defineConfig({
  site: "https://nepdate.com",
  trailingSlash: "ignore",
  // Inline the CSS: one round trip less before first paint, at a few KB of HTML per page.
  build: { format: "directory", inlineStylesheets: "always" },
  fonts: fontsFor(import.meta.url, fontProviders),
  integrations: [
    starlight({
      title: "NepDate",
      description: `Bikram Sambat (Nepali calendar) libraries for ${languageList}, and the MitiBar desktop calendar.`,
      // The title text beside the logo names the site, so the logo itself is decorative.
      logo: { src: "./src/assets/nepdate.svg", alt: "" },
      favicon: "/favicon.svg",
      components: {
        Head: "./src/components/Head.astro",
        SocialIcons: "./src/components/DocsNav.astro",
        ThemeSelect: "../web/ThemeToggle.astro",
      },
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/sanamhub/nepdate" }],
      editLink: { baseUrl: "https://github.com/sanamhub/nepdate/edit/main/site/" },
      customCss: ["./src/styles/tokens.css", "./src/styles/starlight.css"],
      head: [
        { tag: "meta", attrs: { name: "theme-color", content: "#FDFBF8", media: "(prefers-color-scheme: light)" } },
        { tag: "meta", attrs: { name: "theme-color", content: "#16120E", media: "(prefers-color-scheme: dark)" } },
        { tag: "meta", attrs: { property: "og:image", content: "https://nepdate.com/og-docs.png" } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { property: "og:image:alt", content: "NepDate documentation for every language" } },
        { tag: "meta", attrs: { name: "twitter:image", content: "https://nepdate.com/og-docs.png" } },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
      ],
      expressiveCode: {
        themes: ["github-dark-default", "github-light-default"],
        // Code sits on the landing page's sunken surface in a hairline frame, without a shadow.
        styleOverrides: {
          borderRadius: "var(--nd-radius-m)",
          borderColor: "var(--nd-hairline)",
          codeFontFamily: "var(--nd-font-mono)",
          codeBackground: "var(--nd-sunken)",
          frames: {
            shadowColor: "transparent",
            editorTabBarBackground: "var(--nd-raised)",
            editorActiveTabBackground: "var(--nd-sunken)",
            editorActiveTabIndicatorTopColor: "transparent",
            editorActiveTabIndicatorBottomColor: "var(--nd-ink)",
            terminalTitlebarBackground: "var(--nd-raised)",
            terminalBackground: "var(--nd-sunken)",
          },
        },
      },
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Introduction", link: "/docs/" },
            { label: "Quick start", link: "/docs/quickstart/" },
          ],
        },
        {
          label: "Languages",
          items: [
            { label: "C#", link: "/docs/csharp/" },
            { label: "TypeScript", link: "/docs/typescript/" },
            { label: "Python", link: "/docs/python/" },
            { label: "PHP", link: "/docs/php/" },
            { label: "Java", link: "/docs/java/" },
            { label: "Dart", link: "/docs/dart/" },
            { label: "Kotlin", link: "/docs/kotlin/" },
            { label: "Go (Golang)", link: "/docs/go/" },
            { label: "Swift", link: "/docs/swift/" },
            { label: "C++", link: "/docs/cpp/" },
            { label: "C", link: "/docs/c/" },
            { label: "Rust", link: "/docs/rust/" },
            { label: "Ruby", link: "/docs/ruby/" },
            { label: "Zig", link: "/docs/zig/" },
          ],
        },
        {
          label: "Components",
          items: [{ label: "Date picker", link: "/docs/datepicker/" }],
        },
        {
          label: "Concepts",
          items: [
            { label: "The Bikram Sambat calendar", link: "/docs/concepts/calendar/" },
            { label: "Core and patro", link: "/docs/concepts/core-and-patro/" },
            { label: "Formatting", link: "/docs/concepts/formatting/" },
            { label: "Parsing", link: "/docs/concepts/parsing/" },
          ],
        },
        {
          label: "Apps",
          items: [
            { label: "MitiBar", link: "/docs/apps/mitibar/" },
            { label: "Mobile", link: "/docs/apps/mobile/" },
          ],
        },
        {
          label: "Project",
          items: [
            { label: "Data and credits", link: "/docs/project/data/" },
            { label: "Same answer everywhere", link: "/docs/project/conformance/" },
            { label: "Performance", link: "/docs/project/performance/" },
            { label: "Versions and status", link: "/docs/project/versions/" },
            { label: "Contributing", link: "/docs/project/contributing/" },
          ],
        },
      ],
      plugins: [
        // The landing page is a custom page the validator can't see into; its anchors are listed here.
        starlightLinksValidator({ errorOnLocalLinks: true, exclude: ["/", "/#convert", "/#languages", "/#mitibar", "/#performance"] }),
        starlightLlmsTxt({
          projectName: "NepDate",
          description: `Bikram Sambat (Nepali calendar) date libraries for ${languageList} with the same behaviour in every language, built from one shared dataset and spec.`,
          details: [
            `Every port converts between BS and AD for BS 1901-01-01 to 2199-12-30 (AD 1844-04-11 to 2143-04-15). Each ships a core package and a separate patro package (tithi, public holidays, events). Every SDK shares the ${versionLine} version line. C# NepDate is the original library, one package with its own versions.`,
            "",
            "## When to use NepDate",
            "",
            "Reach for NepDate when code has to work with Bikram Sambat (BS, Nepali calendar) dates:",
            "",
            "- Convert a BS date to AD (Gregorian) or back, for any day from BS 1901-01-01 to 2199-12-30, without a network call.",
            "- Show today's date in Nepal, a BS month calendar, or a BS date picker in a web form.",
            "- Format a BS date in Nepali (Devanagari digits and month names) or English, or parse one typed by a user.",
            "- Add days or months to a BS date, find the days between two dates, or the start and end of a BS month or fiscal year.",
            "- Look up the tithi, public holidays and events of a day from BS 2077 to 2084 (the separate patro package).",
            "- Get the same answer in several languages: every port is tested against the same 109,212 days and the C# library.",
            "",
            "How to call it: install the core package for the project's language (below), then follow that language's guide at https://nepdate.com/docs/<language>/. Each guide's first example converts a date. For a browser date picker, see https://nepdate.com/docs/datepicker/. For a day's tithi or holidays without code, link a page on https://patro.nepdate.com/ (`/YYYY/MM/DD/`).",
            "",
            "Not a fit: Nepal Sambat or other calendars, and official government holiday notices (the patro data is informational).",
            "",
            "Install the core:",
            "",
            ...ports.map((port) => `- ${port.name}: \`${port.install}\``),
          ].join("\n"),
        }),
      ],
    }),
  ],
});
