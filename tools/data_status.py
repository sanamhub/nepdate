"""Print how far the tithi, public holiday and event data in data/patro/ reach.

Exit 1 when public holidays end within 183 days: the release gate every app uses. Tithi or events
ending within 183 days print WARNING lines and exit 0, or exit 1 with --strict (the weekly upstream
sync uses --strict to raise its issue).

    py tools/data_status.py [--strict] [--today YYYY-MM-DD]
"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'spec' / 'reference'))
import nepcal  # noqa: E402

GATE_DAYS = 183
# (label, test on one day's entry); holidays decide the exit code, the others only warn.
KINDS = [
    ('tithi', lambda day: 'tithi' in day),
    ('holidays', lambda day: day.get('holiday') is True),
    ('events', lambda day: bool(day.get('events'))),
]


def iso_date(text):
    try:
        return dt.date.fromisoformat(text)
    except ValueError:
        raise argparse.ArgumentTypeError(f'not an AD date in YYYY-MM-DD: {text!r}')


def coverage(root):
    """{label: (first BS date, last BS date)} over every data/patro/*.json file."""
    found = {label: [] for label, _ in KINDS}
    for path in sorted((Path(root) / 'data' / 'patro').glob('*.json')):
        for key, day in json.loads(path.read_text(encoding='utf-8'))['days'].items():
            for label, has in KINDS:
                if has(day):
                    found[label].append(key)
    return {label: (min(keys), max(keys)) for label, keys in found.items() if keys}


def main(argv=None, root=ROOT):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--strict', action='store_true',
                        help='also exit 1 when tithi or events end within 183 days')
    parser.add_argument('--today', type=iso_date, default=dt.date.today(),
                        help='AD date to count from instead of today (for tests)')
    args = parser.parse_args(argv)

    cal = nepcal.load(root)
    ranges = coverage(root)

    def ad(bs):
        return dt.date(*cal.to_ad(*map(int, bs.split('-'))))

    failed = False
    warnings = []
    for label, _ in KINDS:
        if label not in ranges:
            print(f'{label:<9} no data')
            if label == 'holidays':
                failed = True
            else:
                warnings.append(f'{label}: no data')
            continue
        first, last = ranges[label]
        left = (ad(last) - args.today).days
        print(f'{label:<9} BS {first} to {last} (AD {ad(first)} to {ad(last)}), {left} days left')
        if left < GATE_DAYS:
            if label == 'holidays':
                failed = True
            else:
                warnings.append(f'{label} data ends on BS {last} (AD {ad(last)}), {left} days left')
    for warning in warnings:
        print(f'WARNING: {warning}')
    if failed:
        print(f'FAIL: public holiday data ends within {GATE_DAYS} days or is missing')
        return 1
    if warnings and args.strict:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
