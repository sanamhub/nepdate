// The one place the site names a version, a package or an install line. Pages import these
// instead of typing them, and scripts/check-versions.mjs fails the build when a page types a
// version itself. Every install line and snippet below is copied from the port's README or built
// only from names in its docs/API.md.

/** The version every port shipped as its first public pre-release. */
export const VERSION = "0.1.0-beta.1";
/** The same version as PyPI spells it (PEP 440). */
export const PYPI_VERSION = "0.1.0b1";
/** MitiBar's release, tagged in nepdate-rust. */
export const MITIBAR_VERSION = "0.1.0-beta.1";
export const MITIBAR_RELEASE = `https://github.com/sanamhub/nepdate-rust/releases/tag/mitibar-v${MITIBAR_VERSION}`;

export const HUB = "https://github.com/sanamhub/nepdate";
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
  installLang: string;
  registry: { label: string; href: string };
  api: { label: string; href: string };
  /** BS 2081-04-15 to AD and the long English form, in this language. */
  sample: string;
}

const gh = (repo: string) => `https://github.com/sanamhub/${repo}`;

export const ports: Port[] = [
  {
    id: "rust",
    name: "Rust",
    lang: "rust",
    repo: "nepdate-rust",
    core: "nepdate",
    patro: "nepdate-patro",
    install: `cargo add nepdate@=${VERSION}`,
    installLang: "sh",
    registry: { label: "crates.io", href: "https://crates.io/crates/nepdate" },
    api: { label: "docs.rs", href: "https://docs.rs/nepdate" },
    sample: `use nepdate::{Lang, LongDate, NepaliDate};

let date = NepaliDate::new(2081, 4, 15)?;
let ad = date.to_gregorian();
assert_eq!((ad.year(), ad.month(), ad.day()), (2024, 7, 30));
println!("{}", date.long(LongDate::default(), Lang::En)); // Shrawan 15, 2081`,
  },
  {
    id: "go",
    name: "Go",
    lang: "go",
    repo: "nepdate-go",
    core: "github.com/sanamhub/nepdate-go",
    patro: "github.com/sanamhub/nepdate-go/patro",
    install: `go get github.com/sanamhub/nepdate-go@v${VERSION}`,
    installLang: "sh",
    registry: { label: "pkg.go.dev", href: "https://pkg.go.dev/github.com/sanamhub/nepdate-go" },
    api: { label: "pkg.go.dev", href: "https://pkg.go.dev/github.com/sanamhub/nepdate-go" },
    sample: `d, err := nepdate.New(2081, nepdate.Shrawan, 15)
if err != nil {
	log.Fatal(err)
}
y, m, day := d.Gregorian()
fmt.Println(y, int(m), day)                            // 2024 7 30
fmt.Println(d.Format("MMMM d, yyyy", nepdate.English)) // Shrawan 15, 2081`,
  },
  {
    id: "typescript",
    name: "TypeScript",
    lang: "ts",
    repo: "nepdate-typescript",
    core: "nepdate-core",
    patro: "nepdate-patro",
    install: "npm install nepdate-core@beta",
    installLang: "sh",
    registry: { label: "npm", href: "https://www.npmjs.com/package/nepdate-core" },
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
    installLang: "kotlin",
    registry: { label: "Maven Central", href: "https://central.sonatype.com/artifact/io.github.sanamhub/nepdate" },
    api: { label: "API.md", href: `${gh("nepdate-kotlin")}/blob/main/docs/API.md` },
    sample: `val date = NepaliDate.of(2081, 4, 15)
println("\${date.gregorianYear}-\${date.gregorianMonth}-\${date.gregorianDay}") // 2024-7-30
println(date.toLongString())                                                // Shrawan 15, 2081`,
  },
  {
    id: "cpp",
    name: "C++",
    lang: "cpp",
    repo: "nepdate-cpp",
    core: "nepdate::nepdate",
    patro: "nepdate::patro",
    install: `FetchContent_Declare(nepdate GIT_REPOSITORY https://github.com/sanamhub/nepdate-cpp.git GIT_TAG v${VERSION})`,
    installLang: "cmake",
    registry: { label: "Releases", href: `${gh("nepdate-cpp")}/releases` },
    api: { label: "API.md", href: `${gh("nepdate-cpp")}/blob/main/docs/API.md` },
    sample: `#include <nepdate/nepdate.hpp>

const nepdate::date d = nepdate::make_date(2081, 4, 15).value();
const auto ad = d.to_year_month_day();    // 2024-07-30
std::cout << nepdate::to_string(d);       // 2081/04/15`,
  },
];

export const repoUrl = (port: Port) => gh(port.repo);
