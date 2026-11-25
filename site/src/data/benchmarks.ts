// Benchmark numbers for the landing page and /docs/project/performance/. Every number is copied
// from the report named in `source` (each port's docs/benchmarks.md, or the hub's
// docs/benchmarks/dotnet.md for C#); change them only together with that report.
// Operations B1 to B8 are defined in the hub's spec/BENCHMARK.md. Times are nanoseconds per
// operation, lower is better.

import { ports } from "./ports";

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
  /** NepDate's own B1 and B2 from the run that timed the competitors, when that run was on another
   *  machine than `ops` (a competitor that only runs there). Competitors are compared with these. */
  rivalRun?: { machine: string; b1: number; b2: number };
  source: string;
}

const LAPTOP = "Intel Core i5-12500H laptop";

export const benchmarks: PortBenchmark[] = [
  {
    id: "rust",
    name: "Rust",
    machine: LAPTOP,
    ops: [2.95, 3.89, 3.34, 2.17, 15.97, 13.07, 3.42, 219.14],
    competitors: [],
    source: blob("nepdate-rust", "docs/benchmarks.md"),
  },
  {
    id: "cpp",
    name: "C++",
    machine: `${LAPTOP}, MSVC`,
    ops: [6.76, 8.15, 6.97, 4.73, 22.71, 10.29, 9.44, 369.48],
    competitors: [],
    source: blob("nepdate-cpp", "docs/benchmarks.md"),
  },
  {
    id: "c",
    name: "C",
    machine: `${LAPTOP}, MSVC`,
    ops: [5.4, 7.42, 8.29, 11.08, 32.75, 11.92, 16.57, 540.18],
    competitors: [],
    source: blob("nepdate-c", "docs/benchmarks.md"),
  },
  {
    id: "go",
    name: "Go",
    machine: LAPTOP,
    ops: [5.24, 4.2, 4.03, 3.64, 24.79, 7.84, 7.11, 255.55],
    competitors: [{ name: "go-nepali", b1: 111.85, b2: 49.05, agrees: 60 }],
    source: blob("nepdate-go", "docs/benchmarks.md"),
  },
  {
    id: "swift",
    name: "Swift",
    machine: `${LAPTOP}, WSL 2, Swift 6.4.1`,
    ops: [12.6, 10.2, 6.7, 5.7, 359.4, 22.8, 45.2, 1578.1],
    // Nepali-Date-Picker-SPM ships an arm64 macOS XCFramework only, so it was timed on the runner.
    competitors: [{ name: "Nepali-Date-Picker-SPM", b1: 937.5, b2: 1062.5, agrees: 61 }],
    rivalRun: { machine: "GitHub's macOS runner (Apple M1)", b1: 20.2, b2: 16.9 },
    source: blob("nepdate-swift", "docs/benchmarks.md"),
  },
  {
    id: "kotlin",
    name: "Kotlin",
    machine: `${LAPTOP}, JDK 17`,
    ops: [14.36, 6.48, 3.15, 4.78, 29.72, 23.75, 2.13, 67.91],
    competitors: [{ name: "shivathapaa", b1: 649.4, b2: 628.51, agrees: 61 }],
    source: blob("nepdate-kotlin", "docs/benchmarks.md"),
  },
  {
    id: "java",
    name: "Java",
    machine: `${LAPTOP}, JDK 17`,
    ops: [12.23, 5.78, 4.55, 4.56, 30.18, 23.46, 1.1, 48.94],
    competitors: [{ name: "shivathapaa", b1: 641.89, b2: 656.91, agrees: 61 }],
    source: blob("nepdate-java", "docs/benchmarks.md"),
  },
  {
    id: "typescript",
    name: "TypeScript",
    machine: `${LAPTOP}, Node.js`,
    ops: [24.3, 22.8, 12.0, 11.4, 136.9, 63.3, 4.8, 351.4],
    competitors: [
      { name: "world-calendars", b1: 712.2, b2: 757.3, agrees: 60 },
      { name: "nepali-date-converter", b1: 1961.4, b2: 2108.3, agrees: 61 },
      { name: "bikram-sambat", b1: 1917.0, b2: 1372.8, agrees: 62 },
    ],
    source: blob("nepdate-typescript", "docs/benchmarks.md"),
  },
  // The two competitors are the ones BENCHMARK.md §7 selects for PHP.
  {
    id: "php",
    name: "PHP",
    machine: `${LAPTOP}, PHP 8.3`,
    ops: [986, 785, 935, 726, 554, 963, 323, 20888],
    competitors: [
      { name: "laravel-nepali-date", b1: 1516771, b2: 1534718, agrees: 60 },
      { name: "ernilambar/nepali-date", b1: 3661036, b2: 3178989, agrees: 60 },
    ],
    source: blob("nepdate-php", "docs/benchmarks.md"),
  },
  {
    id: "python",
    name: "Python",
    machine: `${LAPTOP}, CPython`,
    ops: [612.77, 518.85, 474.25, 431.25, 433.35, 1157.1, 118.91, 15840.07],
    competitors: [
      { name: "nepali-datetime", b1: 1888.81, b2: 6152.13, agrees: 62 },
      { name: "nepali", b1: 11540.27, b2: 6125.01, agrees: 60 },
    ],
    source: blob("nepdate-python", "docs/benchmarks.md"),
  },
  {
    id: "dart",
    name: "Dart",
    machine: `${LAPTOP}, Dart AOT`,
    ops: [51.55, 38.5, 10.42, 8.62, 154.65, 33.66, 3.66, 291.19],
    competitors: [{ name: "nepali_utils", b1: 23556.34, b2: 56007.51, agrees: 31 }],
    source: blob("nepdate-dart", "docs/benchmarks.md"),
  },
  // No RubyGems candidate passes BENCHMARK.md section 7, so the competitor list is empty.
  {
    id: "ruby",
    name: "Ruby",
    machine: `${LAPTOP}, Ruby 3.4`,
    ops: [462.7, 430.4, 458.2, 438.1, 475.8, 1211.3, 108.1, 16324.6],
    competitors: [],
    source: blob("nepdate-ruby", "docs/benchmarks.md"),
  },
  // The comparison is the C core this package wraps, not an independent Zig library. The idle gate
  // and the load during the run are recorded in nepdate-zig docs/benchmarks.md.
  {
    id: "zig",
    name: "Zig",
    machine: LAPTOP,
    ops: [11.2, 5.1, 1.4, 2.9, 37.5, 42.7, 7.6, 278.8],
    competitors: [],
    source: blob("nepdate-zig", "docs/benchmarks.md"),
  },
];

/** C# NepDate 2.1.0 on .NET 10, the original every port is compared with. `ops` is the hub's
 *  64-date harness, like every port. The competitors are the three selected by BENCHMARK section 7
 *  and measured in the same run on the same 64 dates. `agrees` is the lower of B1 and B2. */
export const csharp: PortBenchmark = {
  id: "csharp",
  name: "C#",
  machine: `${LAPTOP}, .NET 10`,
  ops: [5.6, 5.9, 2.79, 2.45, 29.96, 7.28, 16.46, 633.13],
  competitors: [
    { name: "DateConverterNepali", b1: 419.3, b2: 614.9, agrees: 61 },
    { name: "NepaliCalendarBS", b1: 12614, b2: 192, agrees: 63 },
    { name: "NepaliDateConverter.NETCORE", b1: 22174, b2: 46434.4, agrees: 60 },
  ],
  source: blob("nepdate", "docs/benchmarks/dotnet.md"),
};

/** C# NepDate first, then the ports: every language on the site. */
/** Every port's benchmark, in the site's language order (ports.ts). */
export const languages: PortBenchmark[] = [csharp, ...benchmarks].sort(
  (x, y) => ports.findIndex((p) => p.id === x.id) - ports.findIndex((p) => p.id === y.id),
);

export const competitorCount = languages.reduce((sum, port) => sum + port.competitors.length, 0);

/** NepDate's B1 and B2 in the same run as the port's competitors. */
function rivalBase(port: PortBenchmark) {
  return port.rivalRun ?? { b1: port.ops[0], b2: port.ops[1] };
}

/** The fastest other library on B1, NepDate's B1 in the same run (`ours`), how many times slower
 *  that library is, and how many of the 64 dates it gets wrong where that was counted. Returns
 *  null for a language with no mature library to compare. */
export function nearest(port: PortBenchmark) {
  if (port.competitors.length === 0) return null;
  const best = port.competitors.reduce((a, b) => (b.b1 < a.b1 ? b : a));
  const ours = rivalBase(port).b1;
  const wrong = best.agrees === undefined ? undefined : 64 - best.agrees;
  const machine = port.rivalRun?.machine;
  return { name: best.name, b1: best.b1, ours, times: best.b1 / ours, wrong, machine };
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


/** `spec/BENCHMARK.md` section 6: the ports with a time target against C# NepDate on B1, B2 and B7.
 *  `limit` is the highest allowed port/C# ratio; "faster" targets need a ratio below 1. */
const CSHARP_TARGETS: { id: string; limit: number; label: string }[] = [
  { id: "rust", limit: 1, label: "faster than C#" },
  { id: "cpp", limit: 1, label: "faster than C#" },
  { id: "go", limit: 1.5, label: "within 1.5 times" },
  { id: "swift", limit: 1.5, label: "within 1.5 times" },
  { id: "kotlin", limit: 1.5, label: "within 1.5 times" },
  { id: "java", limit: 1.5, label: "within 1.5 times" },
  { id: "typescript", limit: 3, label: "within 3 times" },
];

/** Each targeted port's B1, B2 and B7 as a multiple of C# NepDate's, worked out from `csharp.ops`,
 *  so a new C# version changes only that row. Time only; allocation is in each port's report. */
export const targets = CSHARP_TARGETS.map((t) => {
  const port = benchmarks.find((b) => b.id === t.id);
  if (!port) throw new Error(`benchmarks.ts: no benchmark for target ${t.id}`);
  const ratios = [0, 1, 6].map((i) => port.ops[i] / csharp.ops[i]);
  const met = ratios.map((r) => (t.limit === 1 ? r < 1 : r <= t.limit));
  return { name: port.name, label: t.label, ratios, met };
});

/** Formats a port/C# ratio: 0.43×, 2.6×. */
export function formatRatio(r: number): string {
  return `${r.toFixed(r < 1 ? 2 : 1)}×`;
}
