// MitiBar's page reads its files, numbers and links from here. The file names are the release
// workflow's (mitibar .github/workflows/release-mitibar.yml), built from MITIBAR_VERSION so a new
// release changes one line in ports.ts. The numbers are copied from mitibar
// docs/benchmarks-widget.md, with the machine and the date they were measured on.
import { MITIBAR_REPO, MITIBAR_VERSION } from "./ports";

const base = `${MITIBAR_REPO}/releases/download/v${MITIBAR_VERSION}`;
const file = (name: string) => ({ name, url: `${base}/${name}` });

export interface Download {
  label: string;
  note: string;
  name: string;
  url: string;
}

export interface Platform {
  id: "windows" | "macos" | "linux";
  name: string;
  files: Download[];
  /** The command that prints a file's SHA-256, to compare with SHA256SUMS. */
  verify: string;
}

export const platforms: Platform[] = [
  {
    id: "windows",
    name: "Windows",
    files: [
      { label: "Installer, x64", note: "Most PCs", ...file(`mitibar_${MITIBAR_VERSION}_x64-setup.exe`) },
      { label: "Installer, ARM64", note: "Snapdragon and other ARM PCs", ...file(`mitibar_${MITIBAR_VERSION}_arm64-setup.exe`) },
      { label: "Portable, x64", note: "A zip; no install", ...file(`MitiBar-${MITIBAR_VERSION}-windows-x64-portable.zip`) },
      { label: "Portable, ARM64", note: "A zip; no install", ...file(`MitiBar-${MITIBAR_VERSION}-windows-arm64-portable.zip`) },
    ],
    verify: `certutil -hashfile mitibar_${MITIBAR_VERSION}_x64-setup.exe SHA256`,
  },
  {
    id: "macos",
    name: "macOS",
    files: [{ label: "Disk image", note: "Drag MitiBar to Applications", ...file(`MitiBar-${MITIBAR_VERSION}.dmg`) }],
    verify: `shasum -a 256 MitiBar-${MITIBAR_VERSION}.dmg`,
  },
  {
    id: "linux",
    name: "Linux",
    files: [
      { label: "Debian and Ubuntu, x64", note: ".deb package", ...file(`mitibar_${MITIBAR_VERSION}_amd64.deb`) },
      { label: "AppImage, x64", note: "Any distribution", ...file(`mitibar_${MITIBAR_VERSION}_x86_64.AppImage`) },
    ],
    verify: `sha256sum mitibar_${MITIBAR_VERSION}_amd64.deb`,
  },
];

export const SHA256SUMS = `${base}/SHA256SUMS`;
export const SBOM = file(`MitiBar-${MITIBAR_VERSION}.cdx.json`);
export const BENCHMARKS = `${MITIBAR_REPO}/blob/main/docs/benchmarks-widget.md`;
export const SIGNING_POLICY = `${MITIBAR_REPO}#code-signing-policy`;

/** Measured on 2026-10-19 on one Windows 11 laptop (Core i5-12500H); see BENCHMARKS. */
export const numbers = {
  binaryMb: "11.6",
  startMs: "68",
  privateMb: "34",
  machine: "a Windows 11 laptop with a Core i5-12500H",
};

/** NepDate Widget, Raju Prasai's Windows app: the full toolbox to MitiBar's date. */
export const NEPDATE_WIDGET = "https://nepdatewidget.rajuprasai.com.np/";
export const NEPDATE_WIDGET_REPO = "https://github.com/RajuPrasai/NepDateWidget";
