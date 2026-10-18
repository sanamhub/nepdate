"""Sanity checks on data/calendar/bs-calendar.json, behind data/README.md "Known data questions".

- year-length: every BS year has 365 or 366 days.
- new-year: the AD date of each BS New Year (1 Baishakh) is within 1 day of the median of its ten
  nearest neighbouring years.
- new-year-name: a "नयाँ वर्ष <year>" event on 1 Baishakh in data/patro/ names that BS year.

Prints every finding. Exits 1 only on a finding that data/known-questions.json doesn't list; that
file and the README table describe the same entries.

    py tools/data_sanity.py
"""
import argparse
import datetime as dt
import json
import re
import statistics
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'spec' / 'reference'))
import nepcal  # noqa: E402

NEIGHBOURS = 10
NEW_YEAR_NAME = re.compile('नयाँ वर्ष ([०-९]+)')
DEVANAGARI_DIGITS = str.maketrans('०१२३४५६७८९', '0123456789')
NEW_YEAR_TOLERANCE_DAYS = 1


@dataclass
class Finding:
    check: str
    year: int
    detail: str


def year_length(cal, y):
    return sum(cal.ml(y, m) for m in range(1, 13))


def year_length_findings(cal):
    return [Finding('year-length', y, f'{year_length(cal, y)} days')
            for y in range(nepcal.MIN, nepcal.MAX + 1) if year_length(cal, y) not in (365, 366)]


def new_year_findings(cal):
    # Day of the AD year in a fixed common year, so leap years don't shift the comparison.
    def day(y):
        _, m, d = cal.to_ad(y, 1, 1)
        return dt.date(2001, m, d).timetuple().tm_yday

    years = list(range(nepcal.MIN, nepcal.MAX + 1))
    days = {y: day(y) for y in years}
    findings = []
    for y in years:
        others = sorted((y2 for y2 in years if y2 != y), key=lambda y2: (abs(y2 - y), y2))[:NEIGHBOURS]
        median = statistics.median(days[y2] for y2 in others)
        if abs(days[y] - median) > NEW_YEAR_TOLERANCE_DAYS:
            ad = dt.date(*cal.to_ad(y, 1, 1))
            findings.append(Finding('new-year', y, f'AD {ad}, {days[y] - median:+g} days from the median'
                                                   f' of its {NEIGHBOURS} neighbours'))
    return findings


def new_year_name_findings(root):
    findings = []
    for path in sorted((Path(root) / 'data/patro').glob('*.json')):
        year = int(path.stem)
        day = json.loads(path.read_text(encoding='utf-8')).get('days', {}).get(f'{year}-01-01', {})
        for event in day.get('events', []):
            match = NEW_YEAR_NAME.search(event['np'])
            if match and int(match.group(1).translate(DEVANAGARI_DIGITS)) != year:
                findings.append(Finding('new-year-name', year, f'{year}-01-01 is named "{event["en"]}"'))
    return findings


def main(argv=None, root=ROOT):
    parser = argparse.ArgumentParser(
        description='Check year lengths, New Year dates and New Year names; exit 1 on a finding not listed in '
                    'data/known-questions.json.')
    parser.parse_args(argv)
    cal = nepcal.load(root)
    known = {(entry['check'], year)
             for entry in json.loads((Path(root) / 'data/known-questions.json').read_text(encoding='utf-8'))
             for year in entry['years']}

    lengths = Counter(year_length(cal, y) for y in range(nepcal.MIN, nepcal.MAX + 1))
    print('year lengths: ' + ', '.join(f'{n}: {count}' for n, count in sorted(lengths.items())))
    new = 0
    for finding in year_length_findings(cal) + new_year_findings(cal) + new_year_name_findings(root):
        status = 'known' if (finding.check, finding.year) in known else 'NEW'
        new += status == 'NEW'
        print(f'{finding.check} {finding.year}: {finding.detail} ({status})')
    if new:
        print(f'FAIL: {new} finding(s) not in data/known-questions.json')
        return 1
    print('OK: every finding is a known data question')
    return 0


if __name__ == '__main__':
    sys.exit(main())
