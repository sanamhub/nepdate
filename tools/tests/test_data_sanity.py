import contextlib
import io
import json
import unittest

from support import ROOT, scratch_root
import data_sanity


def run(root):
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        code = data_sanity.main([], root=root)
    return code, out.getvalue()


class DataSanityTest(unittest.TestCase):
    def test_committed_data_has_only_known_findings(self):
        code, out = run(ROOT)
        self.assertEqual(code, 0, out)
        self.assertIn('year-length 2087: 367 days (known)', out)
        self.assertIn('year-length 2090: 364 days (known)', out)
        self.assertIn('new-year 2088:', out)
        self.assertIn('364: 1, 365: 221, 366: 76, 367: 1', out)

    def test_only_2088_new_year_is_off(self):
        cal = data_sanity.nepcal.load(ROOT)
        self.assertEqual([f.year for f in data_sanity.new_year_findings(cal)], [2088])

    def test_no_new_year_name_is_wrong(self):
        self.assertEqual(data_sanity.new_year_name_findings(ROOT), [])

    def test_wrong_new_year_name_exits_1(self):
        root = scratch_root(self, 'data')
        path = root / 'data/patro/2083.json'
        patro = json.loads(path.read_text(encoding='utf-8'))
        patro['days']['2083-01-01']['events'][0]['np'] = 'नयाँ वर्ष २०८२'
        path.write_text(json.dumps(patro, ensure_ascii=False), encoding='utf-8')
        code, out = run(root)
        self.assertEqual(code, 1)
        self.assertIn('new-year-name 2083', out)
        self.assertIn('NEW', out)

    def test_finding_not_in_known_questions_exits_1(self):
        root = scratch_root(self, 'data')
        (root / 'data/known-questions.json').write_text(
            json.dumps([{'check': 'year-length', 'years': [2087, 2090]}]), encoding='utf-8')
        code, out = run(root)
        self.assertEqual(code, 1)
        self.assertIn('new-year 2088', out)
        self.assertIn('NEW', out)

    def test_new_short_year_exits_1(self):
        root = scratch_root(self, 'data')
        path = root / 'data/calendar/bs-calendar.json'
        calendar = json.loads(path.read_text(encoding='utf-8'))
        lengths = calendar['month_lengths']['2199']
        lengths[10] -= 1
        lengths[11] -= 1
        path.write_text(json.dumps(calendar), encoding='utf-8')
        code, out = run(root)
        self.assertEqual(code, 1)
        self.assertIn('year-length 2199', out)

    def test_help(self):
        with contextlib.redirect_stdout(io.StringIO()) as out, self.assertRaises(SystemExit):
            data_sanity.main(['--help'], root=ROOT)
        self.assertIn('known-questions.json', out.getvalue())


if __name__ == '__main__':
    unittest.main()
