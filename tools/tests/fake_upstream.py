"""Write a fake C# NepDate checkout from hub-shaped data, for the importer tests.

Only the files and shapes extract_from_csharp.py reads: src/NepDate/Core/Dictionaries/*.cs in the
layout of upstream commit cb05cb65.
"""
import datetime as dt
from pathlib import Path

import support  # noqa: F401  (import paths)
import nepcal

DICT_DIR = Path('src/NepDate/Core/Dictionaries')
META_BASE, META_LAST = 2001, 2089


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


def write(repo, calendar, patro_docs):
    """Write the fake checkout under repo from a calendar document and {year: patro document}."""
    cal = nepcal.Calendar(calendar['month_lengths'])
    out = Path(repo) / DICT_DIR
    out.mkdir(parents=True, exist_ok=True)

    def files(name, body):
        # Upstream files start with a byte order mark; the importer reads them as utf-8-sig.
        (out / f'{name}.cs').write_text('﻿' + wrap(name, body), encoding='utf-8', newline='\n')

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
