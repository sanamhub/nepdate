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
    ops: [2.95, 3.31, 3.24, 2.11, 14.67, 12.6, 3.38, 199.49],
    competitors: [],
    source: blob("nepdate-rust", "docs/benchmarks.md"),
  },
  {
    id: "cpp",
    name: "C++",
    machine: `${LAPTOP}, MSVC`,
    ops: [6.46, 7.65, 6.68, 4.91, 21.7, 11.84, 11.25, 423.53],
    competitors: [],
    source: blob("nepdate-cpp", "docs/benchmarks.md"),
  },
  {
    id: "c",
    name: "C",
    machine: `${LAPTOP}, MSVC`,
    ops: [4.94, 6.05, 7.47, 9.14, 40.76, 23.7, 16.55, 577.1],
    competitors: [],
    source: blob("nepdate-c", "docs/benchmarks.md"),
  },
  {
    id: "go",
    name: "Go",
    machine: LAPTOP,
    ops: [5.14, 4.09, 3.97, 3.56, 24.21, 7.63, 6.91, 246.05],
    competitors: [{ name: "go-nepali", b1: 110.35, b2: 48.27, agrees: 60 }],
    source: blob("nepdate-go", "docs/benchmarks.md"),
  },
  {
    id: "swift",
    name: "Swift",
    machine: "GitHub macos-latest runner (Apple M1)",
    ops: [20.2, 16.9, 17.6, 19.5, 421.9, 32.6, 38.4, 1468.8],
    competitors: [{ name: "Nepali-Date-Picker-SPM", b1: 937.5, b2: 1062.5, agrees: 61 }],
    source: blob("nepdate-swift", "docs/benchmarks.md"),
  },
  {
    id: "kotlin",
    name: "Kotlin",
    machine: `${LAPTOP}, JDK 17`,
    ops: [15.63, 6.93, 3.33, 5.08, 111.42, 26.4, 2.3, 72.99],
    competitors: [{ name: "shivathapaa", b1: 696.95, b2: 694.7, agrees: 61 }],
    source: blob("nepdate-kotlin", "docs/benchmarks.md"),
  },
  {
    id: "typescript",
    name: "TypeScript",
    machine: `${LAPTOP}, Node.js`,
    ops: [26.3, 24.2, 12.98, 12.04, 262.3, 76.5, 5.1, 383.1],
    competitors: [
      { name: "world-calendars", b1: 778.8, b2: 832.9 },
      { name: "nepali-date-converter", b1: 2111.4, b2: 2250.6 },
      { name: "bikram-sambat", b1: 2751.2, b2: 1482.6 },
    ],
    source: blob("nepdate-typescript", "docs/benchmarks.md"),
  },
  // Preliminary: measured on the reference laptop while other work was running on it, so the quiet
  // rerun in the sweep replaces these figures (nepdate-php docs/benchmarks.md says the same). The
  // two competitors are the ones BENCHMARK.md §7 selects for PHP.
  {
    id: "php",
    name: "PHP",
    machine: `${LAPTOP}, PHP 8.3`,
    ops: [1456, 2427, 2235, 1793, 1067, 2525, 2105, 115490],
    competitors: [
      { name: "laravel-nepali-date", b1: 1470822, b2: 1676688, agrees: 60 },
      { name: "ernilambar/nepali-date", b1: 5773987, b2: 4913110, agrees: 60 },
    ],
    source: blob("nepdate-php", "docs/benchmarks.md"),
  },
  {
    id: "python",
    name: "Python",
    machine: `${LAPTOP}, CPython`,
    ops: [671.2, 569.87, 517.52, 472.77, 476.4, 1261.36, 130.58, 17178.66],
    competitors: [
      { name: "nepali-datetime", b1: 2043.93, b2: 6613.95, agrees: 62 },
      { name: "nepali", b1: 12457.04, b2: 6545.16, agrees: 60 },
    ],
    source: blob("nepdate-python", "docs/benchmarks.md"),
  },
  {
    id: "dart",
    name: "Dart",
    machine: `${LAPTOP}, Dart AOT (preliminary)`,
    ops: [67.37, 121.59, 19.35, 17.11, 854.73, 102.36, 42.48, 1698.46],
    competitors: [{ name: "nepali_utils", b1: 33526.7, b2: 79675.04, agrees: 31 }],
    source: blob("nepdate-dart", "docs/benchmarks.md"),
  },
  // Preliminary: measured before the 30 second CPU-idle check, so the quiet rerun in the sweep
  // replaces these figures (nepdate-zig docs/benchmarks.md says the same). The comparison is the
  // C core this package wraps, not an independent Zig library.
  {
    id: "zig",
    name: "Zig",
    machine: LAPTOP,
    ops: [22.2, 14.0, 3.8, 8.4, 240.1, 111.1, 32.2, 1139.3],
    competitors: [],
    source: blob("nepdate-zig", "docs/benchmarks.md"),
  },
];

/** C# NepDate 2.0.7 on .NET 10, the original every port is compared with. `ops` is the hub's
 *  64-date harness, like every port. The competitors are the three selected by BENCHMARK section 7
 *  and measured in the same run on the same 64 dates. `agrees` is the lower of B1 and B2. */
export const csharp: PortBenchmark = {
  id: "csharp",
  name: "C#",
  machine: `${LAPTOP}, .NET 10`,
  ops: [13.5, 20.1, 19.05, 20.19, 150.41, 22.42, 48.21, 3112.76],
  competitors: [
    { name: "DateConverterNepali", b1: 405.99, b2: 590.1, agrees: 61 },
    { name: "NepaliCalendarBS", b1: 13047.6, b2: 184.97, agrees: 63 },
    { name: "NepaliDateConverter.NETCORE", b1: 21730.5, b2: 46302.6, agrees: 60 },
  ],
  source: blob("nepdate", "docs/benchmarks/dotnet.md"),
};

/** C# NepDate first, then the ports: every language on the site. */
export const languages: PortBenchmark[] = [csharp, ...benchmarks];

export const competitorCount = languages.reduce((sum, port) => sum + port.competitors.length, 0);

/** NepDate's B1 and B2 in the same run as the port's competitors. */
function rivalBase(port: PortBenchmark) {
  return { b1: port.ops[0], b2: port.ops[1] };
}

/** The fastest other library on B1, NepDate's B1 in the same run (`ours`), how many times slower
 *  that library is, and how many of the 64 dates it gets wrong where that was counted. Returns
 *  null for a language with no mature library to compare. */
export function nearest(port: PortBenchmark) {
  if (port.competitors.length === 0) return null;
  const best = port.competitors.reduce((a, b) => (b.b1 < a.b1 ? b : a));
  const ours = rivalBase(port).b1;
  const wrong = best.agrees === undefined ? undefined : 64 - best.agrees;
  return { name: best.name, b1: best.b1, ours, times: best.b1 / ours, wrong };
}

/** NepDate beats every competitor on both B1 and B2, unless that competitor gets some of the 64
 *  dates wrong and says so in `agrees`; the build fails if a number says otherwise. */
for (const port of languages) {
  const base = rivalBase(port);
  for (const c of port.competitors) {
    const faster = c.b1 <= base.b1 || c.b2 <= base.b2;
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
