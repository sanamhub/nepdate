"""Write a fake C# NepDate checkout from hub-shaped data, for the importer tests.

Only the files and shapes extract_from_csharp.py reads: src/NepDate/Core/Dictionaries/*.cs. The
month lengths come in the layout of upstream commit cb05cb65 (NepaliToEnglish and EnglishToNepali),
in the later one (MonthTable), or in both.
"""
import datetime as dt
from pathlib import Path

import support  # noqa: F401  (import paths)
import nepcal

DICT_DIR = Path('src/NepDate/Core/Dictionaries')
META_BASE, META_LAST = 2001, 2089
DICTIONARIES, MONTH_TABLE, BOTH = 'dictionaries', 'month-table', 'both'


def cs_string(text):
    return '"' + text.replace('\\', '\\\\').replace('"', '\\"') + '"'


def int_block(name, values):
    body = ',\n'.join('            ' + ', '.join(str(v) for v in values[i:i + 16])
                      for i in range(0, len(values), 16))
    return f'        internal static readonly ushort[] {name} = new ushort[]\n        {{\n{body}\n        }};\n'


def tuple_block(rows):
    body = '\n'.join(f'            ({a},{b},{c},{d}), // [{i}]' for i, (a, b, c, d) in enumerate(rows))
    return ('        internal static readonly (int, int, int, int)[] data = new (int, int, int, int)[]\n'
            f'        {{\n{body}\n        }};\n')


def wrap(name, body):
    return f'namespace NepDate.Core.Dictionaries\n{{\n    internal static class {name}\n    {{\n{body}    }}\n}}\n'


def write_file(repo, name, body):
    out = Path(repo) / DICT_DIR
    out.mkdir(parents=True, exist_ok=True)
    # Upstream files start with a byte order mark; the importer reads them as utf-8-sig.
    (out / f'{name}.cs').write_text('﻿' + wrap(name, body), encoding='utf-8', newline='\n')


def month_starts(calendar):
    """MonthTable.Start for a calendar document: the first day of every month, then the total."""
    starts = [0]
    for year in range(nepcal.MIN, nepcal.MAX + 1):
        for length in calendar['month_lengths'][str(year)]:
            starts.append(starts[-1] + length)
    return starts


def write_month_table(repo, starts, total_days=None, month_count=None):
    """MonthTable.cs as upstream lays it out: the constants, then twelve month starts per line."""
    total_days = starts[-1] if total_days is None else total_days
    month_count = (nepcal.MAX - nepcal.MIN + 1) * 12 if month_count is None else month_count
    months = starts[:-1]
    rows = [f'            {", ".join(str(v) for v in months[i:i + 12])},  // {nepcal.MIN + i // 12}'
            for i in range(0, len(months), 12)]
    body = (f'        internal const int MinYear = {nepcal.MIN};\n'
            f'        internal const int MaxYear = {nepcal.MAX};\n'
            f'        internal const int MonthCount = {month_count};\n'
            f'        internal const int TotalDays = {total_days};\n\n'
            '        // The last entry is TotalDays, so the length of month i is Start[i + 1] - Start[i].\n'
            '        internal static readonly int[] Start = new int[]\n'
            '        {\n' + '\n'.join(rows) + f'\n            {starts[-1]}\n        }};\n')
    write_file(repo, 'MonthTable', body)


def write(repo, calendar, patro_docs, layout=DICTIONARIES):
    """Write the fake checkout under repo from a calendar document and {year: patro document}."""
    cal = nepcal.Calendar(calendar['month_lengths'])
    if layout in (MONTH_TABLE, BOTH):
        write_month_table(repo, month_starts(calendar))
    if layout in (DICTIONARIES, BOTH):
        write_dictionaries(repo, cal)
    write_metadata(repo, cal, patro_docs)


def write_dictionaries(repo, cal):
    def files(name, body):
        write_file(repo, name, body)

    n2e = []
    for y in range(nepcal.MIN, nepcal.MAX + 1):
        for m in range(1, 13):
            length = cal.ml(y, m)
            n2e.append((length, *cal.to_ad(y, m, length)))
    files('NepaliToEnglish', tuple_block(n2e))

    e2n = []
    month = dt.date(1844, 4, 1)
    while month <= dt.date(2143, 4, 1):
        following = (month.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
        end = following - dt.timedelta(days=1)
        serial = nepcal.dfc(end.year, end.month, end.day) - cal.epoch
        bs = cal.fs(serial) if serial < cal.total_days else (2200, 1, serial - cal.total_days + 1)
        e2n.append((end.day, *bs))
        month = following
    files('EnglishToNepali', tuple_block(e2n))


def write_metadata(repo, cal, patro_docs):
    def files(name, body):
        write_file(repo, name, body)

    base = cal.ts(META_BASE, 1, 1)
    starts = [cal.ts(y, m, 1) - base for y in range(META_BASE, META_LAST + 1) for m in range(1, 13)]
    files('CalendarOffsets', int_block('MonthStart', starts))

    days = {}
    for doc in patro_docs.values():
        days.update(doc['days'])
    offsets = {key: cal.ts(*map(int, key.split('-'))) - base for key in days}
    pool = []

    def pool_id(pair):
        if pair not in pool:
            pool.append(pair)
        return pool.index(pair)

    tithi = [(offsets[k], pool_id((d['tithi']['np'], d['tithi']['en'])))
             for k, d in sorted(days.items()) if 'tithi' in d]
    events = [(offsets[k], [pool_id((e['np'], e['en'])) for e in d['events']])
              for k, d in sorted(days.items()) if d.get('events')]
    holidays = [offsets[k] for k, d in sorted(days.items()) if d.get('holiday')]

    files('TithiData', int_block('DayOffsets', [o for o, _ in tithi]) + int_block('PoolIds', [p for _, p in tithi]))
    files('HolidayData', int_block('DayOffsets', holidays))
    slices = [0]
    for _, ids in events:
        slices.append(slices[-1] + len(ids))
    files('EventData', int_block('DayOffsets', [o for o, _ in events]) + int_block('SliceStart', slices)
          + int_block('Entries', [i for _, ids in events for i in ids]))
    pool_body = '\n'.join(f'            ({cs_string(np_)}, {cs_string(en)}), // [{i}]' for i, (np_, en) in enumerate(pool))
    files('CalendarStrings', '        internal static readonly (string Np, string En)[] Pool = new (string, string)[]\n'
          f'        {{\n{pool_body}\n        }};\n')
