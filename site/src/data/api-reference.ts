// The API reference page (/docs/reference/) reads the naming tables of the hub's spec/API.md, the
// one inventory every port is built and reviewed against, so a renamed function changes the spec
// and the site together. This file only adds what the spec does not have: a plain name for each
// row and a sentence for each group.

import spec from "../../../spec/API.md?raw";

/** The spec's column headers, mapped to the site's port ids (ports.ts). */
const COLUMNS: Record<string, string> = {
  "C#": "csharp",
  Rust: "rust",
  Go: "go",
  TypeScript: "typescript",
  Python: "python",
  Swift: "swift",
  Kotlin: "kotlin",
  "C++": "cpp",
  C: "c",
  PHP: "php",
  Dart: "dart",
  Java: "java",
  Ruby: "ruby",
  Zig: "zig",
};

/** What each row does, in the words a caller would search for. Keyed by the spec row ID. */
const LABELS: Record<string, string> = {
  ND01: "Create a date from year, month and day",
  ND02: "Create a date from text",
  ND03: "Create a date from text, guessing the field order",
  ND04: "Create a date from a Gregorian date",
  ND05: "Check for the empty value",
  ND06: "Year",
  ND07: "Month, 1 to 12",
  ND08: "Day of the month",
  ND09: "Gregorian (AD) date",
  ND10: "Day of the week",
  ND11: "Day of the BS year",
  ND12: "Days in this month, 29 to 32",
  ND13: "Month as a named value",
  ND14: "Today in Nepal, or in a time zone",
  ND15: "Now (the same date as today)",
  ND16: "First supported date, BS 1901-01-01",
  ND17: "Last supported date, BS 2199-12-30",
  ND18: "Last day of this month",
  ND19: "Split into year, month and day",
  ND20: "Length of the BS year, 364 to 367 days",
  ND21: "Is it today?",
  ND22: "Is it yesterday?",
  ND23: "Is it tomorrow?",
  ND24: "Compare two dates",
  ND25: "Compare with any value",
  ND26: "Check two dates are equal",
  ND27: "Check equality with any value",
  ND28: "Hash code",
  ND29: "Equal (==)",
  ND30: "Not equal (!=)",
  ND31: "Earlier than (<)",
  ND32: "Earlier or equal (<=)",
  ND33: "Later than (>)",
  ND34: "Later or equal (>=)",
  NC01: "Convert a Gregorian date to BS",
  NC02: "Read a date from free text",
  NC03: "Read a date from free text, without an error",
  NC04: "Convert many Gregorian dates to BS",
  NC05: "Convert many BS date strings to AD",
  NC06: "Convert many BS dates to AD",
  NC07: "Convert many Gregorian dates to BS, in batches",
  NC08: "Convert many BS dates to AD, in batches",
  NC09: "Convert to and from other types",
  NC10: "JSON as a \"YYYY-MM-DD\" string",
  NC11: "JSON as a year, month, day object",
  NC12: "JSON as a string, Newtonsoft.Json",
  NC13: "JSON as an object, Newtonsoft.Json",
  NC14: "XML",
  NC15: "Register the JSON converters",
  NC16: "Register the Newtonsoft.Json converters",
  NA01: "Add months",
  NA02: "Add days",
  NA03: "Add years",
  NA04: "Days between two dates",
  NA05: "Subtract one date from another",
  NF01: "Default text, YYYY/MM/DD",
  NF02: "Text in a chosen field order and separator",
  NF03: "Long form in English, Shrawan 15, 2081",
  NF04: "Short form in Devanagari digits",
  NF05: "Long form in Nepali",
  NF06: "Format with a pattern",
  NF07: "Format into a buffer",
  NF08: "Field orders",
  NF09: "Separators",
  NF10: "Month names",
  NP01: "Parse year, month, day text",
  NP02: "Parse, guessing the field order",
  NP03: "Parse without an error",
  NP04: "Parse without an error, guessing the field order",
  NP05: "The language's standard parse interface",
  NP06: "Parse from a character span",
  NP07: "Parse free text, with month names",
  NP08: "Parse free text without an error",
  NP09: "Parse error type",
  NR01: "Date range type",
  NR02: "Create a range from two dates",
  NR03: "First date of a range",
  NR04: "Last date of a range",
  NR05: "Check for an empty range",
  NR06: "Number of days in a range",
  NR07: "Range of one day",
  NR08: "Range of a number of days",
  NR09: "Range of a BS month",
  NR10: "Range of a fiscal year",
  NR11: "Range of a BS year",
  NR12: "This month",
  NR13: "This fiscal year",
  NR14: "This BS year",
  NR15: "Does a range contain a date?",
  NR16: "Does a range contain another?",
  NR17: "Do two ranges overlap?",
  NR18: "Are two ranges next to each other?",
  NR19: "Overlap of two ranges",
  NR20: "Range covering two ranges",
  NR21: "Range minus another range",
  NR22: "Split a range by month",
  NR23: "Split a range by fiscal quarter",
  NR24: "Every nth day of a range",
  NR25: "Working days of a range",
  NR26: "Weekend days of a range",
  NR27: "Every day of a range",
  NR28: "Range as text",
  NR29: "Range as text, in a chosen format",
  NR30: "Check two ranges are equal",
  NY01: "Fiscal quarters",
  NY02: "Start of this date's fiscal year",
  NY03: "End of this date's fiscal year",
  NY04: "Start and end of this date's fiscal year",
  NY05: "Start of a fiscal quarter",
  NY06: "End of a fiscal quarter",
  NY07: "Start and end of a fiscal quarter",
  NY08: "Start of a named fiscal year",
  NY09: "End of a named fiscal year",
  NY10: "Start and end of a named fiscal year",
  NY11: "Start of a quarter of a named fiscal year",
  NY12: "End of a quarter of a named fiscal year",
  NY13: "Start and end of a quarter of a named fiscal year",
  NT01: "Patro entry of a day",
  NT02: "Tithi in Nepali",
  NT03: "Tithi in English",
  NT04: "Is it a public holiday?",
  NT05: "Events in Nepali",
  NT06: "Events in English",
  NT07: "Look up a day",
};

/** One sentence under each group heading, and the guide page that explains it. */
const GROUPS: Record<string, { intro: string; guide?: { label: string; href: string } }> = {
  ND: {
    intro: "Build a date, read its parts, and compare dates. Every date is checked against BS 1901-01-01 to 2199-12-30.",
    guide: { label: "The Bikram Sambat calendar", href: "/docs/concepts/calendar/" },
  },
  NC: {
    intro: "Move between BS and AD one date or many at a time, and store a date as text, JSON or XML.",
  },
  NA: {
    intro: "Add days, months and years, and count the days between two dates. Adding months clamps to the last day of a shorter month unless you ask otherwise.",
  },
  NF: {
    intro: "Write a date as numbers, as words in English or Nepali, or with a pattern.",
    guide: { label: "Formatting", href: "/docs/concepts/formatting/" },
  },
  NP: {
    intro: "Read a date from text. The strict parser takes year, month, day; the lenient one also takes month names.",
    guide: { label: "Parsing", href: "/docs/concepts/parsing/" },
  },
  NR: {
    intro: "An inclusive run of days, with the month, fiscal year and calendar year shortcuts, set operations and splits.",
  },
  NY: {
    intro: "The fiscal year runs from 1 Shrawan to the last day of Ashad, in four quarters.",
  },
  NT: {
    intro: "Tithi, public holidays and events for BS 2077 to 2084, from the separate patro package.",
    guide: { label: "Core and patro", href: "/docs/concepts/core-and-patro/" },
  },
};

export interface ApiRow {
  id: string;
  label: string;
  /** The name in each language as HTML (inline code from the spec's backticks), keyed by port id. */
  names: Record<string, string>;
  /** Port ids where the spec says the row is not offered. */
  missing: string[];
}

export interface ApiGroup {
  prefix: string;
  title: string;
  slug: string;
  intro: string;
  guide?: { label: string; href: string };
  rows: ApiRow[];
}

const escape = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** The spec's cell markdown, which is plain text and `code`, as HTML. */
function cellHtml(cell: string): string {
  return cell
    .split("`")
    .map((part, i) => (i % 2 === 1 ? `<code>${escape(part.replaceAll("\\|", "|"))}</code>` : escape(part)))
    .join("");
}

/** Splits a markdown table row on the pipes that are not inside backticks or escaped. */
function cells(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inCode = false;
  for (let i = 1; i < line.length; i++) {
    const ch = line[i] as string;
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode && line[i - 1] !== "\\") {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  return out;
}

const isMissing = (cell: string) => /^not ported\b/i.test(cell.trim()) || cell.trim() === "";

function parse(text: string): ApiGroup[] {
  const groups: ApiGroup[] = [];
  let group: ApiGroup | undefined;
  let header: string[] | undefined;
  for (const line of text.split(/\r?\n/)) {
    const heading = /^## \d+\. (.+)$/.exec(line);
    if (heading) {
      const title = heading[1] as string;
      group = { prefix: "", title, slug: title.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, ""), intro: "", rows: [] };
      groups.push(group);
      header = undefined;
      continue;
    }
    if (/^## /.test(line)) {
      group = undefined;
      continue;
    }
    if (!group || !line.startsWith("|")) continue;
    const row = cells(line);
    if (row[0] === "ID" && row[1] === "C#") {
      header = row;
      continue;
    }
    if (!header || !/^N[A-Z]\d\d$/.test(row[0] ?? "")) continue;
    const id = row[0] as string;
    const names: Record<string, string> = {};
    const missing: string[] = [];
    header.forEach((column, i) => {
      const port = COLUMNS[column];
      if (!port) return;
      const cell = row[i] ?? "";
      if (isMissing(cell)) missing.push(port);
      names[port] = cellHtml(cell);
    });
    const label = LABELS[id];
    if (!label) throw new Error(`api-reference: no label for spec row ${id}`);
    group.prefix = id.slice(0, 2);
    group.rows.push({ id, label, names, missing });
  }
  for (const g of groups) {
    const extra = GROUPS[g.prefix];
    if (!extra || g.rows.length === 0) throw new Error(`api-reference: spec group "${g.title}" has no naming table`);
    g.intro = extra.intro;
    g.guide = extra.guide;
  }
  const seen = new Set(groups.flatMap((g) => g.rows.map((r) => r.id)));
  const unused = Object.keys(LABELS).filter((id) => !seen.has(id));
  if (unused.length) throw new Error(`api-reference: labels for rows the spec no longer has: ${unused.join(", ")}`);
  return groups;
}

/** Every group of spec/API.md with its naming table. Rows no port offers are left out. */
export const apiGroups: ApiGroup[] = parse(spec).map((g) => ({
  ...g,
  rows: g.rows.filter((r) => r.missing.length < Object.keys(COLUMNS).length - 1),
}));

/** The ports in the spec's tables. */
export const apiPorts: string[] = Object.values(COLUMNS);
