// Benchmark numbers for the landing page and /docs/project/performance/. Every number is copied
// from the report named in `source` (each port's docs/benchmarks.md, or the hub's
// docs/benchmarks/dotnet.md for C#); change them only together with that report.
// Operations B1 to B8 are defined in the hub's spec/BENCHMARK.md. Times are nanoseconds per
// operation, lower is better.

const blob = (repo: string, path: string) => `https://github.com/sanamhub/${repo}/blob/main/${path}`;

export const BENCHMARK_SPEC = blob("nepdate", "spec/BENCHMARK.md");

export const OPERATIONS = [
  { id: "B1", name: "BS to AD" },
  { id: "B2", name: "AD to BS" },
  { id: "B3", name: "Add 1000 days" },
  { id: "B4", name: "Add 13 months" },
  { id: "B5", name: "Long Nepali date with weekday" },
  { id: "B6", name: "Strict parse" },
  { id: "B7", name: "Patro info for a day" },
  { id: "B8", name: "Patro month grid" },
] as const;

export interface Competitor {
  name: string;
  b1: number;
  b2: number;
  /** How many of the 64 dates it gets right, where its report counts them. Set it whenever the
   *  library is faster than NepDate: a fast wrong answer is listed, never ranked first. */
  agrees?: number;
}

export interface PortBenchmark {
  /** Matches Port.id in ports.ts. */
  id: string;
  name: string;
  machine: string;
  /** B1 to B8, in OPERATIONS order. */
  ops: [number, number, number, number, number, number, number, number];
  /** Every other Bikram Sambat library the port measured on B1 and B2, on the same machine. */
  competitors: Competitor[];
  source: string;
}

const LAPTOP = "Intel Core i5-12500H laptop";

export const benchmarks: PortBenchmark[] = [
  {
    id: "rust",
    name: "Rust",
    machine: LAPTOP,
    ops: [2.9, 3.1, 3.19, 2.6, 16.04, 18.38, 3.46, 298.8],
    competitors: [
      { name: "nepdate-cli", b1: 60.89, b2: 147.12 },
      { name: "nepali-date-converter", b1: 94.63, b2: 113.35 },
      { name: "adtobs", b1: 165.17, b2: 68364.55 },
      { name: "npdatetime", b1: 2805.86, b2: 1679.56 },
    ],
    source: blob("nepdate-rust", "docs/benchmarks.md"),
  },
  {
    id: "cpp",
    name: "C++",
    machine: `${LAPTOP}, MSVC`,
    ops: [7.09, 8.94, 7.55, 5.58, 28.41, 12.13, 12.81, 516.64],
    competitors: [
      { name: "nepdate-cli", b1: 33.34, b2: 305.94 },
      { name: "nepalical", b1: 1064, b2: 809 },
      { name: "aatishnn", b1: 29519, b2: 24774 },
    ],
    source: blob("nepdate-cpp", "docs/benchmarks.md"),
  },
  {
    id: "c",
    name: "C",
    machine: `${LAPTOP}, MSVC`,
    ops: [4.87, 6.02, 7.57, 9.36, 42.12, 24.5, 15.63, 534.41],
    competitors: [{ name: "aatishnn", b1: 26801.56, b2: 23111.56 }],
    source: blob("nepdate-c", "docs/benchmarks.md"),
  },
  {
    id: "go",
    name: "Go",
    machine: LAPTOP,
    ops: [6.21, 5.03, 4.67, 4.14, 30.95, 34.8, 11.83, 398.1],
    competitors: [
      { name: "go-nepali", b1: 172.9, b2: 56.23 },
      { name: "gobikramsambat", b1: 215.75, b2: 207.55 },
      { name: "gobs", b1: 379.85, b2: 349.3 },
      { name: "nepcal", b1: 1627.5, b2: 6113.5 },
    ],
    source: blob("nepdate-go", "docs/benchmarks.md"),
  },
  {
    id: "swift",
    name: "Swift",
    machine: "GitHub macos-latest runner (Apple M1)",
    ops: [20.8, 20.2, 14.3, 13.7, 390.6, 52.7, 39.7, 1531.2],
    competitors: [
      { name: "Nepali-Date-Picker-SPM", b1: 921.9, b2: 1015.6 },
      { name: "NepaliDateConverter", b1: 1687.5, b2: 17015.6 },
    ],
    source: blob("nepdate-swift", "docs/benchmarks.md"),
  },
  {
    id: "kotlin",
    name: "Kotlin",
    machine: `${LAPTOP}, JDK 17`,
    ops: [21.0, 12.0, 15.0, 13.4, 191.8, 38.9, 4.5, 134.6],
    competitors: [
      { name: "adbs", b1: 402.8, b2: 430.9 },
      { name: "shivathapaa", b1: 997.3, b2: 1806.4 },
      { name: "aagitoex", b1: 1622876, b2: 1653642 },
    ],
    source: blob("nepdate-kotlin", "docs/benchmarks.md"),
  },
  {
    id: "typescript",
    name: "TypeScript",
    machine: `${LAPTOP}, Node.js`,
    ops: [30.9, 26.7, 50.5, 55.9, 174.5, 65.9, 5.6, 517.1],
    competitors: [
      { name: "nepali-datetime", b1: 379.7, b2: 249.1 },
      { name: "@inicrea/bikram-sambat-core", b1: 740.7, b2: 380.2 },
      { name: "world-calendars", b1: 863.7, b2: 1065.4 },
      { name: "nepali-date-library", b1: 981.3, b2: 1556.0 },
      { name: "bikram-sambat", b1: 3828.8, b2: 1959.6 },
      { name: "@remotemerge/nepali-date-converter", b1: 4595.6, b2: 18889.9 },
      { name: "nepali-date-converter", b1: 12673.9, b2: 23619.7 },
      { name: "bikram-sambat-js", b1: 13765.0, b2: 12894.5 },
      { name: "@sbmdkl/nepali-date-converter", b1: 15991.3, b2: 15005.3 },
    ],
    source: blob("nepdate-typescript", "docs/benchmarks.md"),
  },
  {
    id: "python",
    name: "Python",
    machine: `${LAPTOP}, CPython`,
    ops: [724.4, 821.6, 662.4, 597.7, 526.8, 1316.3, 128.3, 21608.9],
    competitors: [
      { name: "bikram-sambat", b1: 1244.8, b2: 1103.2 },
      { name: "nepkit", b1: 2106.4, b2: 2089.4 },
      { name: "nepali-datetime", b1: 2618.4, b2: 8496.8 },
      { name: "npdatetime", b1: 6104.7, b2: 3953.0 },
      { name: "pyBSDate", b1: 7886.7, b2: 10671.7 },
      { name: "nepali", b1: 15477.7, b2: 7366.0 },
      { name: "bikram", b1: 18192.4, b2: 72847.3 },
      { name: "nepali-calendar-utils", b1: 76786.6, b2: 52465.1 },
    ],
    source: blob("nepdate-python", "docs/benchmarks.md"),
  },
];

/** C# NepDate 2.0.7 on .NET 10, the original every port is compared with. Its competitors were
 *  measured in a later run, where NepDate itself took 15.10 and 21.60 ns on B1 and B2. */
export const csharp: PortBenchmark = {
  id: "csharp",
  name: "C#",
  machine: `${LAPTOP}, .NET 10`,
  ops: [13.29, 18.64, 17.5, 18.85, 153.02, 21.55, 47.93, 3132.66],
  competitors: [
    { name: "OSN.NepaliCalendar", b1: 12.9, b2: 24.66, agrees: 61 },
    { name: "BsadConverter", b1: 129.84, b2: 639.36, agrees: 62 },
    { name: "NepaliUtility.Core", b1: 354.81, b2: 2268.19, agrees: 61 },
    { name: "BSDateConverter", b1: 599.51, b2: 5829.35, agrees: 61 },
    { name: "NepaliCalendarBS", b1: 14612.94, b2: 199.73, agrees: 63 },
    { name: "NepaliDateConverter.NETCORE", b1: 24224.09, b2: 52243.22, agrees: 60 },
    { name: "NepaliDateConverter.Net", b1: 31448.7, b2: 51057.99, agrees: 60 },
  ],
  source: blob("nepdate", "docs/benchmarks/dotnet.md"),
};

/** C# NepDate first, then the ports: every language on the site. */
export const languages: PortBenchmark[] = [csharp, ...benchmarks];

export const competitorCount = languages.reduce((sum, port) => sum + port.competitors.length, 0);

/** The fastest other library on B1, how many times slower it is than NepDate, and how many of the
 *  64 dates it gets wrong where that was counted. */
export function nearest(port: PortBenchmark) {
  const best = port.competitors.reduce((a, b) => (b.b1 < a.b1 ? b : a));
  const wrong = best.agrees === undefined ? undefined : 64 - best.agrees;
  return { name: best.name, b1: best.b1, times: best.b1 / port.ops[0], wrong };
}

/** NepDate beats every competitor on both B1 and B2, unless that competitor gets some of the 64
 *  dates wrong and says so in `agrees`; the build fails if a number says otherwise. */
for (const port of languages) {
  for (const c of port.competitors) {
    const faster = c.b1 <= port.ops[0] || c.b2 <= port.ops[1];
    if (faster && !(c.agrees !== undefined && c.agrees < 64)) {
      throw new Error(`benchmarks.ts: ${c.name} is not slower than ${port.name} on B1 and B2`);
    }
  }
}

/** Formats nanoseconds for display: 2.9 ns, 13.3 ns, 724 ns, 1.6 µs, 1.62 ms. */
export function formatNs(ns: number): string {
  if (ns < 100) return `${ns.toFixed(1)} ns`;
  if (ns < 1000) return `${Math.round(ns)} ns`;
  if (ns < 1e6) return `${(ns / 1000).toFixed(ns < 1e4 ? 2 : 1)} µs`;
  return `${(ns / 1e6).toFixed(2)} ms`;
}
