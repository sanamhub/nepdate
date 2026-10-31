"""Regenerate the vector files under spec/vectors/ from data/ (ADR-0002, decision 7).

Two files come out of the same pass over `data/`:

- spec/vectors/month-boundaries.csv: one row for the first and one for the last day of every BS
  month: the BS date, its AD date, the weekday and the month length. 299 years x 12 months x 2 =
  7176 rows.
- spec/vectors/patro-summary.json: the counts every port grows its patro tables from, so no port
  pins a number that a data update changes (spec/PATRO.md section 3).

    py tools/make_vectors.py           # write the files
    py tools/make_vectors.py --check   # exit 1 when a committed file differs from data/
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'spec' / 'reference'))
import nepcal  # noqa: E402

VECTORS = 'spec/vectors/month-boundaries.csv'
PATRO_SUMMARY = 'spec/vectors/patro-summary.json'
PATRO_SCHEMA = 1


def render(root=ROOT):
    """The CSV text for the data under root."""
    cal = nepcal.load(root)
    rows = ['bs,ad,weekday,month_length']
    for y in range(nepcal.MIN, nepcal.MAX + 1):
        for m in range(1, 13):
            length = cal.ml(y, m)
            for d in (1, length):
                ay, am, ad = cal.to_ad(y, m, d)
                rows.append(f'{y:04}-{m:02}-{d:02},{ay:04}-{am:02}-{ad:02},'
                            f'{nepcal.WEEKDAYS[cal.weekday(y, m, d)]},{length}')
    return '\n'.join(rows) + '\n'


def patro_days(root=ROOT):
    """Every (date, day) pair in data/patro, oldest first."""
    days = {}
    for path in sorted((Path(root) / 'data' / 'patro').glob('*.json')):
        days.update(json.loads(path.read_text(encoding='utf-8'))['days'])
    if not days:
        raise SystemExit('data/patro holds no days')
    return [(key, days[key]) for key in sorted(days)]


def patro_summary(root=ROOT):
    """The counts a port needs, as an ordered dict, derived from data/patro and the calendar.

    `names` counts distinct (np, en) pairs over tithi and events; `event_names` the event pairs
    alone. `name_bytes` is the UTF-8 length of every pair's np and en added up, with no separator
    and no terminator, which is how the C and C++ ports lay out their name pool.
    """
    cal = nepcal.load(root)
    days = patro_days(root)
    first_day, last_day = days[0][0], days[-1][0]

    def serial(day):
        return cal.ts(*map(int, day.split('-')))

    tithi_days = [(day, value) for day, value in days if value.get('tithi')]
    pairs = {}
    event_pairs = set()
    name_bytes = 0

    def intern(name):
        nonlocal name_bytes
        pair = (name['np'], name['en'])
        if pair not in pairs:
            pairs[pair] = True
            name_bytes += len(name['np'].encode('utf-8')) + len(name['en'].encode('utf-8'))

    for _, value in days:
        if value.get('tithi'):
            intern(value['tithi'])
        for event in value.get('events') or []:
            intern(event)
            event_pairs.add((event['np'], event['en']))

    first_serial, last_serial = serial(first_day), serial(last_day)
    return {
        'schema': PATRO_SCHEMA,
        'first_year': int(first_day[:4]),
        'last_year': int(last_day[:4]),
        'first_day': first_day,
        'last_day': last_day,
        'first_serial': first_serial,
        'last_serial': last_serial,
        'days': last_serial - first_serial + 1,
        'tithi_first_day': tithi_days[0][0],
        'tithi_last_day': tithi_days[-1][0],
        'tithi_first_serial': serial(tithi_days[0][0]),
        'tithi_days': len(tithi_days),
        'tithi_names': len({(value['tithi']['np'], value['tithi']['en'])
                            for _, value in tithi_days}),
        'holidays': sum(1 for _, value in days if value.get('holiday')),
        'event_days': sum(1 for _, value in days if value.get('events')),
        'events': sum(len(value.get('events') or []) for _, value in days),
        'event_names': len(event_pairs),
        'names': len(pairs),
        'name_bytes': name_bytes,
    }


def render_patro_summary(root=ROOT):
    """The JSON text of the patro summary for the data under root."""
    return json.dumps(patro_summary(root), indent=2, ensure_ascii=False) + '\n'


def read(path):
    try:
        return path.read_text(encoding='utf-8')
    except OSError:
        return None


def detail(name, text):
    """What a log line says about a written or checked file."""
    if name == VECTORS:
        return f'{text.count(chr(10)) - 1} rows'
    try:
        return f'{json.loads(text)["names"]} name pairs'
    except (KeyError, TypeError, ValueError):
        return 'unreadable'


def main(argv=None, root=ROOT):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--check', action='store_true',
                        help='exit 1 when a committed file differs instead of writing it')
    args = parser.parse_args(argv)
    files = [(VECTORS, render(root)), (PATRO_SUMMARY, render_patro_summary(root))]
    if args.check:
        stale = False
        for name, text in files:
            if read(Path(root) / name) != text:
                print(f'{name} differs from data/: run py tools/make_vectors.py', file=sys.stderr)
                stale = True
            else:
                print(f'{name} matches data/ ({detail(name, text)})')
        return 1 if stale else 0
    for name, text in files:
        path = Path(root) / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8', newline='\n')
        print(f'wrote {name} ({detail(name, text)})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
