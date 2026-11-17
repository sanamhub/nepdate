import contextlib
import copy
import datetime as dt
import io
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from support import ROOT, scratch_root
import extract_from_csharp
import fake_upstream

OLD = 'cb05cb65c7d3cb570c76992a8e83ed1e73213346'
NEW = '1111111111111111111111111111111111111111'
TODAY = dt.date(2026, 10, 9)


def load_docs(root):
    calendar = json.loads((root / 'data/calendar/bs-calendar.json').read_text(encoding='utf-8'))
    patro = {int(p.stem): json.loads(p.read_text(encoding='utf-8'))
             for p in sorted((root / 'data/patro').glob('*.json'))}
    return calendar, patro


def snapshot(root):
    return {p.relative_to(root).as_posix(): p.read_bytes()
            for p in sorted((root / 'data').rglob('*')) if p.is_file()}


class ImporterBase(unittest.TestCase):
    """A scratch hub root and a fake upstream checkout, with no tests of its own."""

    def setUp(self):
        self.root = self.fresh_root()
        self.calendar, self.patro = load_docs(ROOT)
        self.repo = Path(tempfile.mkdtemp(prefix='nepdate-upstream-'))
        self.addCleanup(shutil.rmtree, self.repo, ignore_errors=True)

    def run_importer(self, calendar=None, patro=None, commit=OLD, summary=None, today=TODAY,
                     layout=fake_upstream.DICTIONARIES):
        self.write_upstream(calendar, patro, layout)
        return self.import_written(commit, summary, today)

    def write_upstream(self, calendar=None, patro=None, layout=fake_upstream.DICTIONARIES):
        if self.repo.exists():
            shutil.rmtree(self.repo)
        fake_upstream.write(self.repo, calendar or self.calendar, patro or self.patro, layout)

    def import_written(self, commit=OLD, summary=None, today=TODAY):
        argv = [str(self.repo), '--commit', commit]
        if summary:
            argv += ['--summary', str(summary)]
        with contextlib.redirect_stdout(io.StringIO()):
            return extract_from_csharp.main(argv, root=self.root, today=today)

    def fresh_root(self):
        root = scratch_root(self, 'data', 'tools/NOTICE.template')
        (root / 'data/UPSTREAM').write_text(OLD + '\n', encoding='utf-8', newline='\n')
        return root


class ImporterTest(ImporterBase):
    def test_unchanged_upstream_changes_no_file(self):
        self.run_importer()
        first = snapshot(self.root)
        self.run_importer(today=TODAY + dt.timedelta(days=3))
        self.assertEqual(snapshot(self.root), first)

    def test_unchanged_data_keeps_every_data_file_byte_for_byte(self):
        before = snapshot(ROOT)
        self.run_importer()
        after = snapshot(self.root)
        for name, content in before.items():
            if name.startswith(('data/calendar/', 'data/patro/')):
                self.assertEqual(after[name], content, name)

    def test_new_commit_without_data_change_moves_only_upstream_and_notice(self):
        before = snapshot(self.root)
        summary = self.root / 'summary.md'
        self.run_importer(commit=NEW, summary=summary)
        after = snapshot(self.root)
        changed = sorted(name for name in after if before.get(name) != after[name])
        self.assertEqual(changed, ['data/NOTICE', 'data/UPSTREAM'])
        self.assertEqual(after['data/UPSTREAM'], (NEW + '\n').encode())
        notice = after['data/NOTICE'].decode('utf-8')
        self.assertIn(NEW, notice)
        self.assertIn(TODAY.isoformat(), notice)
        self.assertIn('No data changes', summary.read_text(encoding='utf-8'))

    def test_notice_keeps_its_date_while_the_commit_is_the_same(self):
        self.run_importer(commit=NEW)
        notice = (self.root / 'data/NOTICE').read_text(encoding='utf-8')
        self.run_importer(commit=NEW, today=TODAY + dt.timedelta(days=7))
        self.assertEqual((self.root / 'data/NOTICE').read_text(encoding='utf-8'), notice)

    def test_month_length_change_rewrites_the_calendar_and_lists_it(self):
        calendar = copy.deepcopy(self.calendar)
        lengths = calendar['month_lengths']['2199']
        lengths[0], lengths[1] = lengths[0] + 1, lengths[1] - 1
        summary = self.root / 'summary.md'
        before = snapshot(self.root)
        self.run_importer(calendar=calendar, commit=NEW, summary=summary)
        written, _ = load_docs(self.root)
        self.assertEqual(written['month_lengths']['2199'], lengths)
        self.assertEqual(written['source']['commit'], NEW)
        self.assertEqual(written['source']['imported'], TODAY.isoformat())
        after = snapshot(self.root)
        self.assertEqual([n for n in after if n.startswith('data/patro/') and before[n] != after[n]], [])
        text = summary.read_text(encoding='utf-8')
        self.assertIn('BS 2199-01', text)
        self.assertIn('BS 2199-02', text)
        self.assertNotIn('BS 2199-03', text)

    def test_event_change_rewrites_only_that_year(self):
        patro = copy.deepcopy(self.patro)
        day = patro[2083]['days']['2083-01-01']
        day['events'][0]['en'] = 'Mesh Sankranti "renamed"'
        summary = self.root / 'summary.md'
        before = snapshot(self.root)
        self.run_importer(patro=patro, commit=NEW, summary=summary)
        after = snapshot(self.root)
        changed = sorted(n for n in after if before.get(n) != after[n])
        self.assertEqual(changed, ['data/NOTICE', 'data/UPSTREAM', 'data/patro/2083.json'])
        _, written = load_docs(self.root)
        self.assertEqual(written[2083]['days']['2083-01-01']['events'][0]['en'], 'Mesh Sankranti "renamed"')
        self.assertEqual(written[2083]['source']['commit'], NEW)
        self.assertEqual(written[2082]['source']['commit'], OLD)
        text = summary.read_text(encoding='utf-8')
        self.assertIn('BS 2083-01', text)
        self.assertNotIn('BS 2082', text)

    def test_year_without_data_upstream_is_removed(self):
        patro = copy.deepcopy(self.patro)
        del patro[2084]
        summary = self.root / 'summary.md'
        self.run_importer(patro=patro, commit=NEW, summary=summary)
        self.assertFalse((self.root / 'data/patro/2084.json').exists())
        self.assertIn('BS 2084', summary.read_text(encoding='utf-8'))

    def test_vectors_are_left_to_make_vectors(self):
        self.run_importer()
        self.assertFalse((self.root / 'spec').exists())

    def test_help(self):
        with contextlib.redirect_stdout(io.StringIO()) as out, self.assertRaises(SystemExit) as exit_:
            extract_from_csharp.main(['--help'], root=self.root)
        self.assertEqual(exit_.exception.code, 0)
        self.assertIn('--summary', out.getvalue())


class MonthTableTest(ImporterBase):
    """The layout C# NepDate moved to: MonthTable.Start instead of the two conversion tables."""

    def assert_fails(self, message):
        with contextlib.redirect_stderr(io.StringIO()) as err, self.assertRaises(SystemExit) as exit_:
            self.import_written()
        self.assertEqual(exit_.exception.code, 1)
        self.assertIn(message, err.getvalue())

    def table(self, starts, **constants):
        fake_upstream.write_month_table(self.repo, starts, **constants)

    def test_month_table_gives_the_same_bytes_as_the_dictionaries(self):
        self.run_importer(commit=NEW)
        from_dictionaries = snapshot(self.root)
        self.root = self.fresh_root()
        self.run_importer(commit=NEW, layout=fake_upstream.MONTH_TABLE)
        self.assertEqual(snapshot(self.root), from_dictionaries)

    def test_month_table_keeps_every_data_file_byte_for_byte(self):
        before = snapshot(ROOT)
        self.run_importer(layout=fake_upstream.MONTH_TABLE)
        after = snapshot(self.root)
        for name, content in before.items():
            if name.startswith(('data/calendar/', 'data/patro/')):
                self.assertEqual(after[name], content, name)

    def test_month_table_length_change_is_imported(self):
        calendar = copy.deepcopy(self.calendar)
        lengths = calendar['month_lengths']['2199']
        lengths[0], lengths[1] = lengths[0] + 1, lengths[1] - 1
        self.run_importer(calendar=calendar, commit=NEW, layout=fake_upstream.MONTH_TABLE)
        written, _ = load_docs(self.root)
        self.assertEqual(written['month_lengths']['2199'], lengths)
        self.assertEqual(written['epoch'], {'bs': '1901-01-01', 'ad': '1844-04-11'})

    def test_both_layouts_that_agree_are_imported(self):
        self.run_importer(layout=fake_upstream.BOTH)
        self.assertEqual(snapshot(self.root)['data/calendar/bs-calendar.json'],
                         snapshot(ROOT)['data/calendar/bs-calendar.json'])

    def test_both_layouts_that_disagree_fail(self):
        self.write_upstream(layout=fake_upstream.BOTH)
        starts = fake_upstream.month_starts(self.calendar)
        starts[1] += 1  # 1901-01 one day longer, 1901-02 one day shorter
        self.table(starts)
        self.assert_fails('MonthTable.cs and NepaliToEnglish.cs disagree at 1901-1')

    def test_a_wrong_length_fails(self):
        self.write_upstream(layout=fake_upstream.MONTH_TABLE)
        starts = fake_upstream.month_starts(self.calendar)
        starts[1] -= 3  # 1901-01 shrinks to 28 days
        self.table(starts)
        self.assert_fails('1901-1: length 28 outside 29..32')

    def test_a_wrong_total_days_fails(self):
        self.write_upstream(layout=fake_upstream.MONTH_TABLE)
        starts = fake_upstream.month_starts(self.calendar)
        self.table(starts, total_days=starts[-1] + 1)
        self.assert_fails(f'MonthTable.Start ends at {starts[-1]}, but TotalDays is {starts[-1] + 1}')

    def test_a_missing_month_fails(self):
        self.write_upstream(layout=fake_upstream.MONTH_TABLE)
        starts = fake_upstream.month_starts(self.calendar)
        del starts[100]
        self.table(starts)
        self.assert_fails('MonthTable.Start has 3588 entries, expected 3589')

    def test_a_wrong_month_count_fails(self):
        self.write_upstream(layout=fake_upstream.MONTH_TABLE)
        self.table(fake_upstream.month_starts(self.calendar), month_count=3587)
        self.assert_fails('MonthTable.MonthCount is 3587, expected 3588')

    def test_neither_layout_fails(self):
        self.write_upstream(layout=fake_upstream.MONTH_TABLE)
        (self.repo / fake_upstream.DICT_DIR / 'MonthTable.cs').unlink()
        self.assert_fails('neither MonthTable.cs nor NepaliToEnglish.cs')

    def test_half_of_the_old_layout_fails(self):
        self.write_upstream()
        (self.repo / fake_upstream.DICT_DIR / 'EnglishToNepali.cs').unlink()
        self.assert_fails('only one of NepaliToEnglish.cs and EnglishToNepali.cs')


if __name__ == '__main__':
    unittest.main()
