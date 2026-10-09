import subprocess
import sys
import tempfile
import unittest

from support import ROOT, scratch_root

SCRIPT = 'spec/reference/verify_vectors.py'


def run(script, cwd):
    return subprocess.run([sys.executable, str(script)], cwd=cwd, capture_output=True,
                          text=True, encoding='utf-8')


class VerifyVectorsTest(unittest.TestCase):
    def test_runs_from_any_directory(self):
        with tempfile.TemporaryDirectory() as cwd:
            result = run(ROOT / SCRIPT, cwd)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(result.stdout.startswith('spec OK 7176 vectors'), result.stdout)
        self.assertIn('parsing OK', result.stdout)

    def test_runs_from_a_spoke_shared_folder(self):
        # Spokes vendor data/ and spec/ under shared/ (ADR-0001 decision 3).
        root = scratch_root(self, 'data', 'spec')
        shared = root / 'shared'
        shared.mkdir()
        (root / 'data').rename(shared / 'data')
        (root / 'spec').rename(shared / 'spec')
        result = run(shared / SCRIPT, root)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_fails_on_a_wrong_vector(self):
        root = scratch_root(self, 'data', 'spec')
        path = root / 'spec/vectors/month-boundaries.csv'
        path.write_text(path.read_text(encoding='utf-8').replace('1844-04-11', '1844-04-12', 1),
                        encoding='utf-8', newline='\n')
        self.assertNotEqual(run(root / SCRIPT, root).returncode, 0)


if __name__ == '__main__':
    unittest.main()
