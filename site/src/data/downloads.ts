// Download counts, read from each registry's public API when the site is built. Only registries
// that publish counts appear: Go modules, SwiftPM, Maven Central and CMake FetchContent have no
// public count, so those languages show none. A failed or slow request leaves its language
// without a count; it never fails the build and never falls back to a made-up number.

export interface Downloads {
  /** Core and patro packages together. */
  count: number;
  /** What the count covers, as the registry defines it. */
  span: string;
  registry: string;
}

const TIMEOUT_MS = 5000;
const HEADERS = { "User-Agent": "nepdate.com build (https://github.com/sanamhub/nepdate)" };

async function json(url: string): Promise<any> {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

const sources: Record<string, () => Promise<Downloads>> = {
  csharp: async () => {
    const body = await json("https://azuresearch-usnc.nuget.org/query?q=packageid:NepDate&prerelease=true");
    const hit = body.data.find((p: any) => p.id.toLowerCase() === "nepdate");
    return { count: hit.totalDownloads, span: "all time", registry: "NuGet" };
  },
  rust: async () => {
    const crates = await Promise.all(["nepdate", "nepdate-patro"].map((c) => json(`https://crates.io/api/v1/crates/${c}`)));
    return { count: sum(crates.map((c) => c.crate.downloads)), span: "all time", registry: "crates.io" };
  },
  typescript: async () => {
    const packages = await Promise.all(
      ["nepdate-core", "nepdate-patro"].map((p) => json(`https://api.npmjs.org/downloads/point/last-year/${p}`)),
    );
    return { count: sum(packages.map((p) => p.downloads)), span: "last 12 months", registry: "npm" };
  },
  python: async () => {
    const packages = await Promise.all(
      ["nepdate-core", "nepdate-patro"].map((p) => json(`https://pypistats.org/api/packages/${p}/overall?mirrors=false`)),
    );
    const counts = packages.map((p) => sum(p.data.map((row: any) => row.downloads)));
    return { count: sum(counts), span: "last 180 days, without mirrors", registry: "PyPI" };
  },
};

async function load(): Promise<Record<string, Downloads>> {
  const entries = await Promise.all(
    Object.entries(sources).map(async ([id, read]) => {
      try {
        const value = await read();
        return Number.isFinite(value.count) ? ([id, value] as const) : null;
      } catch (error) {
        console.warn(`downloads: no count for ${id}: ${(error as Error).message}`);
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((e) => e !== null));
}

/** Fetched once per build and shared by every page that imports it. */
export const downloads = await load();

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const formatCount = (n: number) => (n < 1000 ? n.toLocaleString("en") : compact.format(n));
