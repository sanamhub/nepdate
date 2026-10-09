"""One-time importer: C# NepDate data tables -> language-neutral JSON under data/.

Why this exists: see docs/adr/0002-canonical-data-and-upstream-first.md.
data/ is the source of truth for every port. Ports generate their tables
from a vendored copy of data/, never from the C# repo (docs/adr/0001).

Usage:
    py tools/extract_from_csharp.py <path-to-NepDate-repo> [--commit <sha>]

Checks performed (script exits non-zero on any mismatch):
  1. NepaliToEnglish month-end AD dates are contiguous with month lengths.
  2. Every EnglishToNepali entry agrees with the BS->AD map built from (1).
  3. CalendarOffsets.MonthStart agrees with cumulative month lengths.
  4. Metadata offsets (tithi/holiday/event) resolve to valid BS dates.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DICT_DIR = Path("src/NepDate/Core/Dictionaries")

TUPLE4 = re.compile(r"\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)")
STRING_PAIR = re.compile(r'\("((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\)')


def read(repo: Path, name: str) -> str:
    return (repo / DICT_DIR / name).read_text(encoding="utf-8-sig")


def int_array(source: str, field: str) -> list[int]:
    match = re.search(field + r"\s*=\s*new\s+\w+\[\]\s*\{(.*?)\};", source, re.S)
    if not match:
        raise SystemExit(f"array {field} not found")
    body = re.sub(r"//[^\n]*", "", match.group(1))
    return [int(x) for x in re.findall(r"\d+", body)]


def data_tuples(source: str) -> list[tuple[int, int, int, int]]:
    body = source.split("data = new", 1)[1]
    return [tuple(int(g) for g in m.groups()) for m in TUPLE4.finditer(body)]


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", type=Path)
    parser.add_argument("--commit", default="unknown")
    args = parser.parse_args()
    repo: Path = args.repo

    # ---- 1. BS month lengths + epoch -------------------------------------
    n2e = data_tuples(read(repo, "NepaliToEnglish.cs"))
    min_year, max_year = 1901, 2199
    if len(n2e) != (max_year - min_year + 1) * 12:
        fail(f"NepaliToEnglish has {len(n2e)} rows, expected 3588")

    lengths: dict[int, list[int]] = {}
    month_start: dict[tuple[int, int], dt.date] = {}
    previous_end: dt.date | None = None
    for index, (length, ey, em, ed) in enumerate(n2e):
        year, month = min_year + index // 12, index % 12 + 1
        end = dt.date(ey, em, ed)
        start = end - dt.timedelta(days=length - 1)
        if not 29 <= length <= 32:
            fail(f"{year}-{month}: length {length} outside 29..32")
        if previous_end and start != previous_end + dt.timedelta(days=1):
            fail(f"{year}-{month}: gap/overlap before {start}")
        lengths.setdefault(year, []).append(length)
        month_start[(year, month)] = start
        previous_end = end

    epoch_ad = month_start[(min_year, 1)]

    def bs_to_ad(year: int, month: int, day: int) -> dt.date:
        return month_start[(year, month)] + dt.timedelta(days=day - 1)

    ad_to_bs: dict[dt.date, tuple[int, int, int]] = {}
    for (year, month), start in month_start.items():
        for day in range(1, lengths[year][month - 1] + 1):
            ad_to_bs[start + dt.timedelta(days=day - 1)] = (year, month, day)

    # ---- 2. Cross-check EnglishToNepali ----------------------------------
    e2n = data_tuples(read(repo, "EnglishToNepali.cs"))
    checked = 0
    for index, (ad_len, ny, nm, nd) in enumerate(e2n):
        ad_year, ad_month = 1844 + (index + 3) // 12, (index + 3) % 12 + 1
        ad_end = dt.date(ad_year, ad_month, ad_len)
        if ny > max_year:  # documented hypothetical boundary row (2143-04)
            continue
        if ad_to_bs.get(ad_end) != (ny, nm, nd):
            fail(f"EnglishToNepali {ad_end}: table says {ny}-{nm}-{nd}, "
                 f"derived {ad_to_bs.get(ad_end)}")
        checked += 1

    # ---- 3. Cross-check CalendarOffsets ----------------------------------
    offsets_src = read(repo, "CalendarOffsets.cs")
    meta_starts = int_array(offsets_src, "MonthStart")
    meta_base = 2001
    base_ordinal = bs_to_ad(meta_base, 1, 1).toordinal()
    for index, offset in enumerate(meta_starts):
        year, month = meta_base + index // 12, index % 12 + 1
        if bs_to_ad(year, month, 1).toordinal() - base_ordinal != offset:
            fail(f"CalendarOffsets mismatch at {year}-{month}")

    def offset_to_bs(offset: int) -> str:
        y, m, d = ad_to_bs[dt.date.fromordinal(base_ordinal + offset)]
        return f"{y:04}-{m:02}-{d:02}"

    # ---- 4. Metadata -----------------------------------------------------
    pool = [(np_, en) for np_, en in STRING_PAIR.findall(read(repo, "CalendarStrings.cs"))]
    days: dict[str, dict] = {}

    tithi_src = read(repo, "TithiData.cs")
    for offset, pool_id in zip(int_array(tithi_src, "DayOffsets"), int_array(tithi_src, "PoolIds")):
        np_, en = pool[pool_id]
        days.setdefault(offset_to_bs(offset), {})["tithi"] = {"np": np_, "en": en}

    for offset in int_array(read(repo, "HolidayData.cs"), "DayOffsets"):
        days.setdefault(offset_to_bs(offset), {})["holiday"] = True

    event_src = read(repo, "EventData.cs")
    event_days = int_array(event_src, "DayOffsets")
    slices = int_array(event_src, "SliceStart")
    entries = int_array(event_src, "Entries")
    if len(slices) != len(event_days) + 1:
        fail("EventData.SliceStart must have DayOffsets.Length + 1 entries")
    for i, offset in enumerate(event_days):
        names = [{"np": pool[e][0], "en": pool[e][1]} for e in entries[slices[i]:slices[i + 1]]]
        days.setdefault(offset_to_bs(offset), {})["events"] = names

    # ---- Write outputs ---------------------------------------------------
    source = {"repo": "https://github.com/RajuPrasai/NepDate", "commit": args.commit,
              "license": "MIT", "imported": dt.date.today().isoformat()}
    calendar = {
        "schema": 1,
        "source": source,
        "min_year": min_year,
        "max_year": max_year,
        "epoch": {"bs": f"{min_year}-01-01", "ad": epoch_ad.isoformat()},
        "month_lengths": {str(y): lengths[y] for y in sorted(lengths)},
    }
    write_json(ROOT / "data/calendar/bs-calendar.json", calendar, compact_lists=True)

    events_dir = ROOT / "data/patro"
    for old in events_dir.glob("*.json"):
        old.unlink()
    by_year: dict[str, dict] = {}
    for key in sorted(days):
        by_year.setdefault(key[:4], {})[key] = days[key]
    for year, year_days in by_year.items():
        write_json(events_dir / f"{year}.json",
                   {"schema": 1, "source": source, "year": int(year), "days": year_days})

    write_vectors(month_start, lengths)

    print(f"OK epoch {min_year}-01-01 BS = {epoch_ad} AD")
    print(f"OK {len(n2e)} BS months, {checked} AD month-ends cross-checked")
    print(f"OK {len(meta_starts)} metadata month offsets cross-checked")
    print(f"OK metadata years {min(by_year)}..{max(by_year)}, {len(days)} days")


def write_vectors(month_start: dict, lengths: dict) -> None:
    """Conformance vectors: first and last day of every BS month (every port must pass)."""
    weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    rows = ["bs,ad,weekday,month_length"]
    for (year, month), start in sorted(month_start.items()):
        length = lengths[year][month - 1]
        for day in (1, length):
            ad = start + dt.timedelta(days=day - 1)
            rows.append(f"{year:04}-{month:02}-{day:02},{ad.isoformat()},"
                        f"{weekdays[(ad.weekday() + 1) % 7]},{length}")
    path = ROOT / "spec/vectors/month-boundaries.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(rows) + "\n", encoding="utf-8", newline="\n")


def write_json(path: Path, value: dict, compact_lists: bool = False) -> None:
    text = json.dumps(value, ensure_ascii=False, indent=2)
    if compact_lists:  # keep each year's 12 lengths on one line for readable diffs
        text = re.sub(r"\[\s+([\d,\s]+?)\s+\]", lambda m: "[" + re.sub(r"\s+", " ", m.group(1)) + "]", text)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text + "\n", encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
