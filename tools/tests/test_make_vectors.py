import contextlib
import io
import json
import unittest

from support import ROOT, scratch_root
import make_vectors

VECTORS = 'spec/vectors/month-boundaries.csv'


def run(argv, root):
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        return make_vectors.main(argv, root=root)


class MakeVectorsTest(unittest.TestCase):
    def test_committed_file_matches_data(self):
        self.assertEqual(run(['--check'], ROOT), 0)

    def test_render_has_first_and_last_day_of_every_month(self):
        lines = make_vectors.render(ROOT).splitlines()
        self.assertEqual(lines[0], 'bs,ad,weekday,month_length')
        self.assertEqual(len(lines), 1 + 299 * 12 * 2)
        self.assertEqual(lines[1], '1901-01-01,1844-04-11,Thursday,31')
        self.assertEqual(lines[-1], '2199-12-30,2143-04-15,Monday,30')

    def test_check_fails_when_committed_file_differs(self):
        root = scratch_root(self, 'data', VECTORS)
        path = root / VECTORS
        path.write_text(path.read_text(encoding='utf-8').replace('Thursday', 'Friday', 1),
                        encoding='utf-8', newline='\n')
        self.assertEqual(run(['--check'], root), 1)

    def test_write_regenerates_the_file(self):
        root = scratch_root(self, 'data', VECTORS)
        (root / VECTORS).write_text('stale\n', encoding='utf-8')
        self.assertEqual(run([], root), 0)
        self.assertEqual((root / VECTORS).read_bytes(), (ROOT / VECTORS).read_bytes())
        self.assertEqual(run(['--check'], root), 0)

    def test_check_follows_data(self):
        root = scratch_root(self, 'data', VECTORS)
        path = root / 'data/calendar/bs-calendar.json'
        calendar = json.loads(path.read_text(encoding='utf-8'))
        lengths = calendar['month_lengths']['2199']
        lengths[0], lengths[1] = lengths[1] - 1, lengths[0] + 1
        path.write_text(json.dumps(calendar), encoding='utf-8')
        self.assertEqual(run(['--check'], root), 1)


if __name__ == '__main__':
    unittest.main()
