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


class ImporterTest(unittest.TestCase):
    def setUp(self):
        self.root = scratch_root(self, 'data', 'tools/NOTICE.template')
        (self.root / 'data/UPSTREAM').write_text(OLD + '\n', encoding='utf-8', newline='\n')
        self.calendar, self.patro = load_docs(ROOT)
        self.repo = Path(tempfile.mkdtemp(prefix='nepdate-upstream-'))
        self.addCleanup(shutil.rmtree, self.repo, ignore_errors=True)

    def run_importer(self, calendar=None, patro=None, commit=OLD, summary=None, today=TODAY):
        if self.repo.exists():
            shutil.rmtree(self.repo)
        fake_upstream.write(self.repo, calendar or self.calendar, patro or self.patro)
        argv = [str(self.repo), '--commit', commit]
        if summary:
            argv += ['--summary', str(summary)]
        with contextlib.redirect_stdout(io.StringIO()):
            return extract_from_csharp.main(argv, root=self.root, today=today)

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


if __name__ == '__main__':
    unittest.main()
