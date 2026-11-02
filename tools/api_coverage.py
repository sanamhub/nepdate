"""Check that every row of spec/API.md is covered by a vector, a clock note, or a decision.

    py tools/api_coverage.py           # exit 1 on an uncovered row or a broken reference
    py tools/api_coverage.py --check   # the same, for the CI script

A row is covered when its Vectors cell names an existing file under spec/vectors/, or when it
says the value is a clock read, a language mechanism, or not ported. The check also verifies
that the "Groups and counts" table matches the rows and that every new vector file is named by
at least one row, so a row or a file cannot be added without the other.
"""
import argparse
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = 'spec/API.md'
PARITY = 'spec/PARITY.md'
VECTORS = 'spec/vectors'

# The files added for the API v1 rows. Each one must be named by at least one row.
NEW_FILES = (
    'year-length.tsv', 'day-diff.tsv', 'ymd-int.tsv', 'bulk.tsv', 'serialization.tsv',
    'format-matrix.tsv', 'ranges.tsv', 'range-factories.tsv', 'range-splits.tsv',
    'range-days.tsv', 'range-format.tsv',
)
FILE = re.compile(r'([A-Za-z0-9_-]+\.(?:tsv|csv|json))')
D_NUMBER = re.compile(r'\bD-\d\d\b')
ROW_ID = re.compile(r'[A-Z]{2}\d\d')


def cells(line):
    return [cell.strip() for cell in line.strip().strip('|').split('|')]


def read_rows(text):
    """The eight group tables: (row id, Vectors cell), in file order."""
    lines = text.splitlines()
    rows = []
    index = 0
    while index < len(lines):
        if lines[index].strip() == '| ID | C# signature | What the code does | Vectors |':
            index += 2
            while index < len(lines) and lines[index].startswith('|'):
                found = cells(lines[index])
                if len(found) == 4 and ROW_ID.fullmatch(found[0]):
                    rows.append((found[0], found[3]))
                index += 1
            continue
        index += 1
    return rows


def read_counts(text):
    """The prefix -> row count mapping and the declared total of the Groups and counts table."""
    lines = text.splitlines()
    counts = {}
    total = None
    for index, line in enumerate(lines):
        if line.strip() != '| Group | Prefix | Rows |':
            continue
        index += 2
        while index < len(lines) and lines[index].startswith('|'):
            found = cells(lines[index])
            if len(found) == 3 and re.fullmatch(r'[A-Z]{2}', found[1]):
                counts[found[1]] = int(found[2])
            elif len(found) == 3 and found[0].strip('* ') == 'Total':
                total = int(found[2].strip('* '))
            index += 1
    return counts, total


def resolve(name, root):
    for candidate in (Path(root) / VECTORS / 'csharp-golden' / name, Path(root) / VECTORS / name):
        if candidate.is_file():
            return candidate
    return None


def check(root=ROOT):
    root = Path(root)
    text = (root / API).read_text(encoding='utf-8')
    parity = (root / PARITY).read_text(encoding='utf-8')
    rows = read_rows(text)
    errors = []
    named = set()

    if not rows:
        errors.append(f'{API}: no API rows found')
    for row, vectors in rows:
        lowered = vectors.lower()
        if not vectors:
            errors.append(f'{row}: empty Vectors cell')
            continue
        if 'needs vectors' in lowered:
            errors.append(f'{row}: still says needs vectors')
            continue
        for name in FILE.findall(vectors):
            if resolve(name, root) is None:
                errors.append(f'{row}: {name} does not exist under {VECTORS}/')
            else:
                named.add(name)
        if not FILE.findall(vectors) and 'no vector' not in lowered and 'not ported' not in lowered \
                and 'clock' not in lowered:
            errors.append(f'{row}: no vector file and no clock or decision note ({vectors})')
        for number in D_NUMBER.findall(vectors):
            if number not in parity:
                errors.append(f'{row}: {number} is not defined in {PARITY}')

    counts, total = read_counts(text)
    found = Counter(row[:2] for row, _ in rows)
    declared_total = total if total is not None else sum(counts.values())
    if declared_total != sum(found.values()):
        errors.append(f'{API}: the Groups and counts total is {declared_total}, '
                      f'but the tables hold {sum(found.values())} rows')
    if sum(counts.values()) != declared_total:
        errors.append(f'{API}: the group counts sum to {sum(counts.values())}, '
                      f'but the total row says {declared_total}')
    for prefix, declared in counts.items():
        if found.get(prefix, 0) != declared:
            errors.append(f'{prefix}: the counts table says {declared}, the table has {found.get(prefix, 0)}')
    for prefix in found:
        if prefix not in counts:
            errors.append(f'{prefix}: rows are not in the Groups and counts table')

    for name in NEW_FILES:
        if name not in named:
            errors.append(f'{name}: no API row names this file')
        path = resolve(name, root)
        if path is not None and path.stat().st_size >= 1_000_000:
            errors.append(f'{name}: {path.stat().st_size} bytes, over the 1 MB limit')

    # The section that used to list uncovered rows must stay empty.
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if line.strip() == '## Rows that need vectors':
            for following in lines[index + 1:]:
                if following.startswith('## '):
                    break
                if following.startswith('|') and 'needs vectors' in following.lower():
                    errors.append(f'{API}: the Rows that need vectors table is not empty')

    if errors:
        for error in errors:
            print(f'FAIL: {error}', file=sys.stderr)
        return 1
    print(f'api coverage OK {len(rows)} rows, {len(named)} vector files, 0 uncovered')
    return 0


def main(argv=None, root=ROOT):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--check', action='store_true', help='check only (the default behaviour)')
    parser.parse_args(argv)
    return check(root)


if __name__ == '__main__':
    sys.exit(main())
