"""Regenerate spec/vectors/month-boundaries.csv from data/ (ADR-0002, decision 7).

One row for the first and one for the last day of every BS month: the BS date, its AD date, the
weekday and the month length. 299 years x 12 months x 2 = 7176 rows.

    py tools/make_vectors.py           # write the file
    py tools/make_vectors.py --check   # exit 1 when the committed file differs from data/
"""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'spec' / 'reference'))
import nepcal  # noqa: E402

VECTORS = 'spec/vectors/month-boundaries.csv'


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


def main(argv=None, root=ROOT):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--check', action='store_true',
                        help='exit 1 when the committed file differs instead of writing it')
    args = parser.parse_args(argv)
    path = Path(root) / VECTORS
    text = render(root)
    if args.check:
        current = path.read_text(encoding='utf-8') if path.exists() else None
        if current != text:
            print(f'{VECTORS} differs from data/: run py tools/make_vectors.py', file=sys.stderr)
            return 1
        print(f'{VECTORS} matches data/ ({text.count(chr(10)) - 1} rows)')
        return 0
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8', newline='\n')
    print(f'wrote {VECTORS} ({text.count(chr(10)) - 1} rows)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
