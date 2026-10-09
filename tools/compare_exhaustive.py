"""Compare data/ with what C# NepDate computes for every supported day.

Input is the output directory of tools/csharp-exhaustive (bs2ad.tsv, ad2bs.tsv, patro.tsv).
The BS->AD mapping here is derived with Python's datetime only, so it shares no code with
spec/reference/verify_vectors.py. Exits 1 on the first kind of mismatch it finds.

Usage:
    py tools/compare_exhaustive.py <csharp-exhaustive-output-dir>
"""

from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def our_days() -> dict[str, dt.date]:
    calendar = json.loads((ROOT / "data/calendar/bs-calendar.json").read_text(encoding="utf-8"))
    lengths = calendar["month_lengths"]
    ad = dt.date.fromisoformat(calendar["epoch"]["ad"])
    days = {}
    for year in range(1901, 2200):
        for month, length in enumerate(lengths[str(year)], start=1):
            for day in range(1, length + 1):
                days[f"{year:04}-{month:02}-{day:02}"] = ad
                ad += dt.timedelta(days=1)
    return days


def our_meta() -> dict[str, tuple]:
    meta = {}
    for path in sorted((ROOT / "data/patro").glob("*.json")):
        for bs, value in json.loads(path.read_text(encoding="utf-8"))["days"].items():
            tithi = value.get("tithi", {})
            events = value.get("events", [])
            meta[bs] = (
                tithi.get("np", ""),
                tithi.get("en", ""),
                1 if value.get("holiday") else 0,
                "|".join(e["np"] for e in events),
                "|".join(e["en"] for e in events),
            )
    return meta


def rows(path: Path):
    for line in path.read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#"):
            yield line.split("\t")


def main() -> int:
    out = Path(sys.argv[1])
    days = our_days()
    errors: list[str] = []

    seen = 0
    for bs, ad, weekday, _ in rows(out / "bs2ad.tsv"):
        seen += 1
        date = dt.date.fromisoformat(ad)
        if days.get(bs) != date:
            errors.append(f"BS->AD {bs}: C# {ad}, data {days.get(bs)}")
        if date.isoweekday() % 7 != int(weekday):
            errors.append(f"weekday {bs}: C# {weekday}")
    if seen != len(days):
        errors.append(f"C# has {seen} BS days, data has {len(days)}")

    inverse = {ad: bs for bs, ad in days.items()}
    for ad, bs in rows(out / "ad2bs.tsv"):
        if inverse.get(dt.date.fromisoformat(ad)) != bs:
            errors.append(f"AD->BS {ad}: C# {bs}, data {inverse.get(dt.date.fromisoformat(ad))}")

    csharp_meta = {r[0]: (r[1], r[2], int(r[3]), r[4], r[5]) for r in rows(out / "patro.tsv")}
    mine = our_meta()
    for bs in sorted(set(csharp_meta) | set(mine)):
        if csharp_meta.get(bs) != mine.get(bs):
            errors.append(f"metadata {bs}: C# {csharp_meta.get(bs)}, data {mine.get(bs)}")

    for line in errors[:20]:
        print("MISMATCH", line)
    print(f"exhaustive: {len(days)} BS days, {len(inverse)} AD days, {len(mine)} metadata days, "
          f"{len(errors)} mismatches")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
