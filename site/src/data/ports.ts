// The one place the site names a version, a package or an install line. Pages import these
// instead of typing them, and scripts/check-versions.mjs fails the build when a page types a
// version itself. Versions come from the hub's spec/versions.json (ADR-0007), so a patch release
// of one port shows correctly without a second edit here. Every install line and snippet below is
// copied from the port's README or built only from names in its docs/API.md.

import versionsJson from "../../../spec/versions.json";

/** The MAJOR.MINOR line every SDK shares (ADR-0007 decision 1). */
export const versionLine: string = versionsJson.line;
/** Each SDK's latest released version, in the order spec/versions.json lists them. */
export const versions = versionsJson.sdks;
export type Sdk = keyof typeof versions;
/**
 * The same version as PyPI spells it (PEP 440): 0.1.0-beta.1 is 0.1.0b1, 0.1.0-rc.1 is 0.1.0rc1.
 * This is the site's copy of the mapping in tools/version_line.py.
 */
export const PYPI_VERSION = pep440(versions.python);

function pep440(version: string): string {
  const found = /^(.*)-(beta|rc)\.(\d+)$/.exec(version);
  if (!found) return version;
  return `${found[1]}${found[2] === "beta" ? "b" : "rc"}${found[3]}`;
}

/** The date picker is a UI component outside the SDK line and keeps its own version (ADR-0007 decision 6). */
export const DATEPICKER_VERSION = "0.1.0-beta.2";
/** MitiBar's release, tagged in its own repository (it has its own version line). */
export const MITIBAR_VERSION = "1.0.0";
/** C# NepDate, the original library the ports are checked against (hub ADR-0003). */
export const CSHARP_VERSION = "2.0.7";
export const MITIBAR_REPO = "https://github.com/sanamhub/mitibar";
export const MITIBAR_RELEASE = `${MITIBAR_REPO}/releases/tag/v${MITIBAR_VERSION}`;

export const HUB = "https://github.com/sanamhub/nepdate";
/** The calendar site (ADR-0006). */
export const PATRO = "https://patro.nepdate.com/";
export const DATA_ERROR_FORM = "https://github.com/sanamhub/nepdate/issues/new/choose";

export interface Port {
  /** Docs slug: /docs/<id>/ */
  id: string;
  name: string;
  /** The language as Expressive Code knows it. */
  lang: string;
  repo: string;
  core: string;
  patro: string;
  /** One line for the landing page's install list. */
  install: string;
  /** How to add the patro (tithi, holidays, events); null where the core package already has it. */
  patroInstall: string | null;
  installLang: string;
  registry: { label: string; href: string };
  api: { label: string; href: string };
  /** BS 2081-04-15 to AD and the long English form, in this language. */
  sample: string;
  /** Other languages the same packages serve, shown beside the name with their marks. */
  alsoFor?: { name: string; icon: string }[];
  /** Set for C# NepDate: maintained upstream, with its own version and one package. */
  upstream?: { href: string; docs: string };
}

const gh = (repo: string) => `https://github.com/sanamhub/${repo}`;

export const ports: Port[] = [
  {
    id: "csharp",
    name: "C#",
    lang: "csharp",
    repo: "NepDate",
    core: "NepDate",
    patro: "NepDate",
    install: `dotnet add package NepDate --version ${CSHARP_VERSION}`,
    patroInstall: null,
    installLang: "sh",
    registry: { label: "NuGet", href: "https://www.nuget.org/packages/NepDate/" },
    api: { label: "NepDate docs", href: "https://nepdate.rajuprasai.com.np/" },
    sample: `using NepDate;

var date = new NepaliDate(2081, 4, 15);
// 2024-07-30
Console.WriteLine(date.EnglishDate.ToString("yyyy-MM-dd"));
// Shrawan 15, 2081
Console.WriteLine(date.ToLongDateString());`,
    upstream: { href: "https://github.com/RajuPrasai/NepDate", docs: "https://nepdate.rajuprasai.com.np/" },
  },
  {
    id: "rust",
    name: "Rust",
    lang: "rust",
    repo: "nepdate-rust",
    core: "nepdate",
    patro: "nepdate-patro",
    install: `cargo add nepdate@=${versions.rust}`,
    patroInstall: `cargo add nepdate-patro@=${versions.rust}`,
    installLang: "sh",
    registry: { label: "crates.io", href: "https://crates.io/crates/nepdate" },
    api: { label: "docs.rs", href: "https://docs.rs/nepdate" },
    sample: `use nepdate::{Lang, LongDate, NepaliDate};

let date = NepaliDate::new(2081, 4, 15)?;
let ad = date.to_gregorian(); // 2024-07-30
// Shrawan 15, 2081
println!("{}", date.long(LongDate::default(), Lang::En));`,
  },
  {
    id: "go",
    name: "Go",
    lang: "go",
    repo: "nepdate-go",
    core: "github.com/sanamhub/nepdate-go",
    patro: "github.com/sanamhub/nepdate-go/patro",
    install: `go get github.com/sanamhub/nepdate-go@v${versions.go}`,
    patroInstall: `import "github.com/sanamhub/nepdate-go/patro"`,
    installLang: "sh",
    registry: { label: "pkg.go.dev", href: "https://pkg.go.dev/github.com/sanamhub/nepdate-go" },
    api: { label: "pkg.go.dev", href: "https://pkg.go.dev/github.com/sanamhub/nepdate-go" },
    sample: `d, err := nepdate.New(2081, nepdate.Shrawan, 15)
if err != nil {
	log.Fatal(err)
}
y, m, day := d.Gregorian()
fmt.Println(y, int(m), day) // 2024 7 30
// Shrawan 15, 2081
fmt.Println(d.Format("MMMM d, yyyy", nepdate.English))`,
  },
  {
    id: "typescript",
    name: "TypeScript",
    lang: "ts",
    repo: "nepdate-typescript",
    core: "nepdate-core",
    patro: "nepdate-patro",
    install: `npm install nepdate-core@${versions.typescript}`,
    patroInstall: `npm install nepdate-patro@${versions.typescript}`,
    installLang: "sh",
    registry: { label: "npm", href: "https://www.npmjs.com/package/nepdate-core" },
    alsoFor: [{ name: "JavaScript", icon: "javascript" }],
    api: { label: "API.md", href: `${gh("nepdate-typescript")}/blob/main/docs/API.md` },
    sample: `import { NepaliDate } from "nepdate-core";

const date = NepaliDate.of(2081, 4, 15);
date.toGregorian(); // { year: 2024, month: 7, day: 30 }
date.long();        // "Shrawan 15, 2081"`,
  },
  {
    id: "python",
    name: "Python",
    lang: "python",
    repo: "nepdate-python",
    core: "nepdate-core",
    patro: "nepdate-patro",
    install: "pip install --pre nepdate-core",
    patroInstall: "pip install --pre nepdate-patro",
    installLang: "sh",
    registry: { label: "PyPI", href: "https://pypi.org/project/nepdate-core/" },
    api: { label: "API.md", href: `${gh("nepdate-python")}/blob/main/docs/API.md` },
    sample: `from nepdate import NepaliDate

date = NepaliDate(2081, 4, 15)
date.to_date()  # datetime.date(2024, 7, 30)
date.long()     # 'Shrawan 15, 2081'`,
  },
  {
    id: "php",
    name: "PHP",
    lang: "php",
    repo: "nepdate-php",
    core: "sanamhub/nepdate",
    patro: "sanamhub/nepdate-patro",
    install: `composer require sanamhub/nepdate:${versions.php}`,
    patroInstall: `composer require sanamhub/nepdate-patro:${versions.php}`,
    installLang: "sh",
    registry: { label: "Packagist", href: "https://packagist.org/packages/sanamhub/nepdate" },
    api: { label: "API.md", href: `${gh("nepdate-php")}/blob/main/docs/API.md` },
    sample: `$date = NepaliDate::fromBs(2081, 4, 15);

$date->toDateTime()->format('Y-m-d'); // '2024-07-30'
$date->toLongString();                // 'Shrawan 15, 2081'
$date->isoformat();                   // '2081-04-15'`,
  },
  {
    id: "swift",
    name: "Swift",
    lang: "swift",
    repo: "nepdate-swift",
    core: "NepDate",
    patro: "NepDatePatro",
    install: `.package(url: "https://github.com/sanamhub/nepdate-swift", exact: "${versions.swift}")`,
    patroInstall: `.product(name: "NepDatePatro", package: "nepdate-swift")`,
    installLang: "swift",
    registry: { label: "Swift Package Index", href: "https://swiftpackageindex.com/sanamhub/nepdate-swift" },
    api: { label: "API.md", href: `${gh("nepdate-swift")}/blob/main/docs/API.md` },
    sample: `import NepDate

let date = try NepaliDate(year: 2081, month: 4, day: 15)
print(date.gregorian) // (year: 2024, month: 7, day: 30)
print(date.long())    // Shrawan 15, 2081`,
  },
  {
    id: "kotlin",
    name: "Kotlin",
    lang: "kotlin",
    repo: "nepdate-kotlin",
    core: "io.github.sanamhub:nepdate",
    patro: "io.github.sanamhub:nepdate-patro",
    install: `implementation("io.github.sanamhub:nepdate:${versions.kotlin}")`,
    patroInstall: `implementation("io.github.sanamhub:nepdate-patro:${versions.kotlin}")`,
    installLang: "kotlin",
    registry: { label: "Maven Central", href: "https://central.sonatype.com/artifact/io.github.sanamhub/nepdate" },
    alsoFor: [
      { name: "Java", icon: "java" },
      { name: "Android", icon: "android" },
    ],
    api: { label: "API.md", href: `${gh("nepdate-kotlin")}/blob/main/docs/API.md` },
    sample: `val date = NepaliDate.of(2081, 4, 15)
val y = date.gregorianYear   // 2024
val m = date.gregorianMonth  // 7
val d = date.gregorianDay    // 30
println(date.toLongString()) // Shrawan 15, 2081`,
  },
  {
    id: "java",
    name: "Java",
    lang: "java",
    repo: "nepdate-java",
    core: "io.github.sanamhub:nepdate-java",
    patro: "io.github.sanamhub:nepdate-java-patro",
    install: `implementation("io.github.sanamhub:nepdate-java:${versions.java}")`,
    patroInstall: `implementation("io.github.sanamhub:nepdate-java-patro:${versions.java}")`,
    installLang: "kotlin",
    registry: { label: "Maven Central", href: "https://central.sonatype.com/artifact/io.github.sanamhub/nepdate-java" },
    api: { label: "API.md", href: `${gh("nepdate-java")}/blob/main/docs/API.md` },
    sample: `import io.github.sanamhub.nepdate.java.NepaliDate;

NepaliDate date = NepaliDate.of(2081, 4, 15);
date.toLocalDate();   // 2024-07-30
date.toLongString();  // "Shrawan 15, 2081"`,
  },
  {
    id: "cpp",
    name: "C++",
    lang: "cpp",
    repo: "nepdate-cpp",
    core: "nepdate::nepdate",
    patro: "nepdate::patro",
    install: `FetchContent_Declare(nepdate GIT_REPOSITORY https://github.com/sanamhub/nepdate-cpp.git GIT_TAG v${versions.cpp})`,
    patroInstall: "target_link_libraries(app PRIVATE nepdate::patro)",
    installLang: "cmake",
    registry: { label: "Releases", href: `${gh("nepdate-cpp")}/releases` },
    api: { label: "API.md", href: `${gh("nepdate-cpp")}/blob/main/docs/API.md` },
    sample: `#include <nepdate/nepdate.hpp>

const auto d = nepdate::make_date(2081, 4, 15).value();
const auto ad = d.to_year_month_day();    // 2024-07-30
std::cout << nepdate::to_string(d);       // 2081/04/15`,
  },
  {
    id: "c",
    name: "C",
    lang: "c",
    repo: "nepdate-c",
    core: "nepdate-c::nepdate",
    patro: "nepdate-c::patro",
    install: `FetchContent_Declare(nepdate-c GIT_REPOSITORY https://github.com/sanamhub/nepdate-c.git GIT_TAG v${versions.c})`,
    patroInstall: "target_link_libraries(app PRIVATE nepdate-c::patro)",
    installLang: "cmake",
    registry: { label: "Releases", href: `${gh("nepdate-c")}/releases` },
    api: { label: "API.md", href: `${gh("nepdate-c")}/blob/main/docs/API.md` },
    sample: `#include <nepdate.h>

nepdate_date d;
nepdate_ymd ad;
nepdate_from_bs(2081, 4, 15, &d);
nepdate_to_ad(d, &ad);                   // 2024-07-30`,
  },
  {
    id: "dart",
    name: "Dart",
    lang: "dart",
    repo: "nepdate-dart",
    core: "nepdate",
    patro: "nepdate_patro",
    install: `dart pub add nepdate:${versions.dart}`,
    patroInstall: `dart pub add nepdate_patro:${versions.dart}`,
    installLang: "sh",
    registry: { label: "pub.dev", href: "https://pub.dev/packages/nepdate" },
    alsoFor: [{ name: "Flutter", icon: "flutter" }],
    api: { label: "API.md", href: `${gh("nepdate-dart")}/blob/main/docs/API.md` },
    sample: `import 'package:nepdate/nepdate.dart';

final date = NepaliDate.fromBs(2081, 4, 15);
date.toDateTime();          // 2024-07-30 00:00:00.000Z
date.toLongString();        // "Shrawan 15, 2081"`,
  },
];

/** The ports built in this family, without upstream C# NepDate. */
export const familyPorts = ports.filter((port) => !port.upstream);

export const repoUrl = (port: Port) => port.upstream?.href ?? gh(port.repo);
