import contextlib
import io
import json
import unittest

from support import ROOT, scratch_root
import data_status


def run(argv, root):
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        code = data_status.main(argv, root=root)
    return code, out.getvalue()


def write_patro(test, ends):
    """A scratch root whose patro data starts on 2077-01-01 and ends where `ends` says."""
    root = scratch_root(test, 'data/calendar')
    days = {}
    for kind, last in ends.items():
        for key in ('2077-01-01', last):
            day = days.setdefault(key, {})
            if kind == 'tithi':
                day['tithi'] = {'np': 'प्रतिपदा', 'en': 'Pratipada'}
            elif kind == 'holiday':
                day['holiday'] = True
            else:
                day['events'] = [{'np': 'क', 'en': 'A'}]
    patro = root / 'data/patro'
    patro.mkdir(parents=True)
    for year in sorted({key[:4] for key in days}):
        year_days = {k: v for k, v in sorted(days.items()) if k.startswith(year)}
        (patro / f'{year}.json').write_text(
            json.dumps({'schema': 1, 'year': int(year), 'days': year_days}, ensure_ascii=False),
            encoding='utf-8')
    return root


# The data at upstream cb05cb65 (H1 acceptance criteria): tithi ends BS 2083-12-30 = AD 2027-04-13,
# holidays BS 2084-08-18 = AD 2027-12-03, events BS 2084-08-20.
AC_ENDS = {'tithi': '2083-12-30', 'holiday': '2084-08-18', 'events': '2084-08-20'}


class DataStatusTest(unittest.TestCase):
    def setUp(self):
        self.root = write_patro(self, AC_ENDS)

    def test_183_days_of_tithi_left_is_no_warning(self):
        code, out = run(['--today', '2026-10-12'], self.root)
        self.assertEqual(code, 0)
        self.assertNotIn('WARNING', out)
        self.assertIn('183 days left', out)

    def test_under_183_days_of_tithi_warns_and_exits_0(self):
        code, out = run(['--today', '2026-10-20'], self.root)
        self.assertEqual(code, 0)
        warnings = [line for line in out.splitlines() if line.startswith('WARNING')]
        self.assertEqual(len(warnings), 1, out)
        self.assertIn('tithi', warnings[0])

    def test_strict_turns_the_tithi_warning_into_exit_1(self):
        code, _ = run(['--today', '2026-10-20', '--strict'], self.root)
        self.assertEqual(code, 1)

    def test_under_183_days_of_holidays_exits_1(self):
        code, out = run(['--today', '2027-06-04'], self.root)
        self.assertEqual(code, 1)
        self.assertIn('holidays', out)

    def test_183_days_of_holidays_left_exits_0(self):
        code, _ = run(['--today', '2027-06-03'], self.root)
        self.assertEqual(code, 0)

    def test_events_ending_soon_warn(self):
        root = write_patro(self, {'tithi': '2084-08-20', 'holiday': '2084-08-20', 'events': '2083-12-30'})
        code, out = run(['--today', '2026-10-20'], root)
        self.assertEqual(code, 0)
        self.assertIn('WARNING: events', out)
        self.assertEqual(run(['--today', '2026-10-20', '--strict'], root)[0], 1)

    def test_prints_first_and_last_dates(self):
        _, out = run(['--today', '2026-10-12'], self.root)
        self.assertIn('BS 2077-01-01 to 2083-12-30 (AD 2020-04-13 to 2027-04-13)', out)
        self.assertIn('BS 2077-01-01 to 2084-08-18 (AD 2020-04-13 to 2027-12-03)', out)

    def test_runs_on_the_committed_data(self):
        # A fixed --today keeps the test independent of the clock: the committed tithi data
        # ends AD 2027-04-13, which is under the 183-day warning from 2026-10-13 on.
        code, out = run(['--today', '2026-10-01'], ROOT)
        self.assertEqual(code, 0, out)
        self.assertEqual(len([line for line in out.splitlines() if 'days left' in line]), 3, out)
        code, out = run(['--strict', '--today', '2026-10-13'], ROOT)
        self.assertEqual(code, 1, out)
        self.assertIn('tithi', out)

    def test_rejects_a_bad_today(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            data_status.main(['--today', '12/10/2026'], root=self.root)


if __name__ == '__main__':
    unittest.main()
