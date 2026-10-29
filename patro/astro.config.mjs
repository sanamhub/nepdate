// patro.nepdate.com (ADR-0006): a page per BS month and per day with patro data, built to static
// files in dist/. The look, the fonts and the drawings come from ../site, so both sites change
// together.
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { fontsFor } from "../site/fonts.mjs";

export default defineConfig({
  site: "https://patro.nepdate.com",
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "always" },
  fonts: fontsFor(import.meta.url, { mono: false }),
  integrations: [sitemap()],
  vite: {
    // The shared files in ../site live outside this project's root.
    server: { fs: { allow: [".."] } },
  },
});
