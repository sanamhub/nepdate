import contextlib
import io
import json
import unittest

from support import ROOT, scratch_root
import make_vectors

VECTORS = 'spec/vectors/month-boundaries.csv'
SUMMARY = 'spec/vectors/patro-summary.json'


def run(argv, root):
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        return make_vectors.main(argv, root=root)


class MakeVectorsTest(unittest.TestCase):
    def test_committed_files_match_data(self):
        self.assertEqual(run(['--check'], ROOT), 0)

    def test_render_has_first_and_last_day_of_every_month(self):
        lines = make_vectors.render(ROOT).splitlines()
        self.assertEqual(lines[0], 'bs,ad,weekday,month_length')
        self.assertEqual(len(lines), 1 + 299 * 12 * 2)
        self.assertEqual(lines[1], '1901-01-01,1844-04-11,Thursday,31')
        self.assertEqual(lines[-1], '2199-12-30,2143-04-15,Monday,30')

    def test_check_fails_when_committed_file_differs(self):
        root = scratch_root(self, 'data', 'spec/vectors')
        path = root / VECTORS
        path.write_text(path.read_text(encoding='utf-8').replace('Thursday', 'Friday', 1),
                        encoding='utf-8', newline='\n')
        self.assertEqual(run(['--check'], root), 1)

    def test_check_fails_when_the_summary_is_stale(self):
        root = scratch_root(self, 'data', 'spec/vectors')
        (root / SUMMARY).write_text('{"schema": 1}\n', encoding='utf-8')
        self.assertEqual(run(['--check'], root), 1)

    def test_check_follows_the_patro_data(self):
        root = scratch_root(self, 'data', 'spec/vectors')
        path = root / 'data/patro/2084.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        day = next(value for value in data['days'].values() if value.get('events'))
        day['events'][0]['en'] += ' '
        path.write_text(json.dumps(data), encoding='utf-8')
        self.assertEqual(run(['--check'], root), 1)

    def test_check_follows_the_calendar_data(self):
        root = scratch_root(self, 'data', 'spec/vectors')
        path = root / 'data/calendar/bs-calendar.json'
        calendar = json.loads(path.read_text(encoding='utf-8'))
        lengths = calendar['month_lengths']['2199']
        lengths[0], lengths[1] = lengths[1] - 1, lengths[0] + 1
        path.write_text(json.dumps(calendar), encoding='utf-8')
        self.assertEqual(run(['--check'], root), 1)

    def test_write_regenerates_the_files(self):
        root = scratch_root(self, 'data', 'spec/vectors')
        for part in (VECTORS, SUMMARY):
            (root / part).write_text('stale\n', encoding='utf-8')
        self.assertEqual(run([], root), 0)
        for part in (VECTORS, SUMMARY):
            self.assertEqual((root / part).read_bytes(), (ROOT / part).read_bytes())
        self.assertEqual(run(['--check'], root), 0)

    def test_summary_counts_the_data(self):
        summary = make_vectors.patro_summary(ROOT)
        self.assertEqual(summary['schema'], 1)
        days = make_vectors.patro_days(ROOT)
        self.assertEqual(summary['first_day'], days[0][0])
        self.assertEqual(summary['last_day'], days[-1][0])
        self.assertEqual(summary['first_year'], int(days[0][0][:4]))
        self.assertEqual(summary['last_year'], int(days[-1][0][:4]))
        self.assertEqual(summary['days'],
                         summary['last_serial'] - summary['first_serial'] + 1)
        self.assertEqual(summary['tithi_days'],
                         sum(1 for _, day in days if day.get('tithi')))
        self.assertEqual(summary['holidays'],
                         sum(1 for _, day in days if day.get('holiday')))
        self.assertEqual(summary['event_days'],
                         sum(1 for _, day in days if day.get('events')))
        self.assertEqual(summary['events'],
                         sum(len(day.get('events') or []) for _, day in days))
        pairs = set()
        event_pairs = set()
        for _, day in days:
            if day.get('tithi'):
                pairs.add((day['tithi']['np'], day['tithi']['en']))
            for event in day.get('events') or []:
                pairs.add((event['np'], event['en']))
                event_pairs.add((event['np'], event['en']))
        self.assertEqual(summary['names'], len(pairs))
        self.assertEqual(summary['event_names'], len(event_pairs))
        self.assertEqual(summary['name_bytes'],
                         sum(len(np.encode('utf-8')) + len(en.encode('utf-8'))
                             for np, en in pairs))

    def test_summary_is_read_by_the_ports(self):
        # The file lives in shared/spec/vectors/, so it must stay inside spec/vectors.
        self.assertEqual(make_vectors.PATRO_SUMMARY, SUMMARY)


if __name__ == '__main__':
    unittest.main()
