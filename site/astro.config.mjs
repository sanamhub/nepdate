// nepdate.com: the landing page (src/pages/index.astro) and the docs under /docs/ (Starlight).
// Built to static files in dist/ and served by a Cloudflare Worker (wrangler.jsonc, ADR-0005).
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import starlightLlmsTxt from "starlight-llms-txt";
import { fonts } from "./fonts.mjs";
import { VERSION } from "./src/data/ports";

export default defineConfig({
  site: "https://nepdate.com",
  trailingSlash: "ignore",
  // Inline the CSS: one round trip less before first paint, at a few KB of HTML per page.
  build: { format: "directory", inlineStylesheets: "always" },
  fonts,
  integrations: [
    starlight({
      title: "NepDate",
      description:
        "Bikram Sambat (Nepali calendar) libraries for C#, Rust, Go, TypeScript, Python, Swift, Kotlin and C++, and the MitiBar desktop calendar.",
      logo: { src: "./src/assets/nepdate.svg", alt: "NepDate" },
      favicon: "/favicon.svg",
      components: { Head: "./src/components/Head.astro" },
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/sanamhub/nepdate" }],
      editLink: { baseUrl: "https://github.com/sanamhub/nepdate/edit/main/site/" },
      customCss: ["./src/styles/tokens.css", "./src/styles/starlight.css"],
      head: [
        { tag: "meta", attrs: { name: "theme-color", content: "#FDFBF8", media: "(prefers-color-scheme: light)" } },
        { tag: "meta", attrs: { name: "theme-color", content: "#16120E", media: "(prefers-color-scheme: dark)" } },
        { tag: "meta", attrs: { property: "og:image", content: "https://nepdate.com/og.png" } },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
      ],
      expressiveCode: {
        themes: ["github-dark-default", "github-light-default"],
        styleOverrides: { borderRadius: "0.5rem", codeFontFamily: "var(--nd-font-mono)" },
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
            { label: "C# and .NET", link: "/docs/csharp/" },
            { label: "Rust", link: "/docs/rust/" },
            { label: "Go (Golang)", link: "/docs/go/" },
            { label: "TypeScript and JavaScript", link: "/docs/typescript/" },
            { label: "Python", link: "/docs/python/" },
            { label: "Swift", link: "/docs/swift/" },
            { label: "Kotlin and Java", link: "/docs/kotlin/" },
            { label: "C++", link: "/docs/cpp/" },
            { label: "C (in development)", link: "/docs/c/" },
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
            { label: "Calendar data", link: "/docs/project/data/" },
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
          description:
            "Bikram Sambat (Nepali calendar) libraries with the same behaviour in Rust, Go, TypeScript, Python, Swift, Kotlin and C++, built from one shared dataset and spec.",
          details:
            `Every port converts between BS and AD for BS 1901-01-01 to 2199-12-30 (AD 1844-04-11 to 2143-04-15). Each ships a core package and a separate patro package (tithi, public holidays, events). Version ${VERSION} is a pre-release.`,
        }),
      ],
    }),
  ],
});
