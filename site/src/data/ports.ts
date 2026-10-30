// The one place the site names a version, a package or an install line. Pages import these
// instead of typing them, and scripts/check-versions.mjs fails the build when a page types a
// version itself. Every install line and snippet below is copied from the port's README or built
// only from names in its docs/API.md.

/** The version every port shipped as its first public pre-release. */
export const VERSION = "0.1.0-beta.1";
/** The same version as PyPI spells it (PEP 440). */
export const PYPI_VERSION = "0.1.0b1";
/** MitiBar's release, tagged in its own repository (it has its own version line). */
export const MITIBAR_VERSION = "0.2.0-beta.3";
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
    install: `cargo add nepdate@=${VERSION}`,
    patroInstall: `cargo add nepdate-patro@=${VERSION}`,
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
    install: `go get github.com/sanamhub/nepdate-go@v${VERSION}`,
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
    install: "npm install nepdate-core@beta",
    patroInstall: "npm install nepdate-patro@beta",
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
    id: "swift",
    name: "Swift",
    lang: "swift",
    repo: "nepdate-swift",
    core: "NepDate",
    patro: "NepDatePatro",
    install: `.package(url: "https://github.com/sanamhub/nepdate-swift", exact: "${VERSION}")`,
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
    install: `implementation("io.github.sanamhub:nepdate:${VERSION}")`,
    patroInstall: `implementation("io.github.sanamhub:nepdate-patro:${VERSION}")`,
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
    id: "cpp",
    name: "C++",
    lang: "cpp",
    repo: "nepdate-cpp",
    core: "nepdate::nepdate",
    patro: "nepdate::patro",
    install: `FetchContent_Declare(nepdate GIT_REPOSITORY https://github.com/sanamhub/nepdate-cpp.git GIT_TAG v${VERSION})`,
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
    install: `FetchContent_Declare(nepdate-c GIT_REPOSITORY https://github.com/sanamhub/nepdate-c.git GIT_TAG v${VERSION})`,
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
];

/** The ports built in this family, without upstream C# NepDate. */
export const familyPorts = ports.filter((port) => !port.upstream);

export const repoUrl = (port: Port) => port.upstream?.href ?? gh(port.repo);
