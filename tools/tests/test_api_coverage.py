import contextlib
import io
import unittest

from support import ROOT, scratch_root
import api_coverage


def run(root):
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        code = api_coverage.check(root)
    return code, out.getvalue()


class ApiCoverageTest(unittest.TestCase):
    def test_committed_api_is_covered(self):
        code, out = run(ROOT)
        self.assertEqual(code, 0, out)
        self.assertIn('api coverage OK 124 rows', out)

    def test_a_needs_vectors_row_fails(self):
        root = scratch_root(self, 'spec')
        path = root / 'spec/API.md'
        text = path.read_text(encoding='utf-8')
        text = text.replace('| dates.tsv; month-boundaries.csv |', '| needs vectors |', 1)
        path.write_text(text, encoding='utf-8', newline='\n')
        code, out = run(root)
        self.assertEqual(code, 1)
        self.assertIn('ND01', out)

    def test_a_missing_vector_file_fails(self):
        root = scratch_root(self, 'spec')
        path = root / 'spec/API.md'
        text = path.read_text(encoding='utf-8')
        text = text.replace('| dates.tsv; month-boundaries.csv |',
                            '| missing.tsv; month-boundaries.csv |', 1)
        path.write_text(text, encoding='utf-8', newline='\n')
        code, out = run(root)
        self.assertEqual(code, 1)
        self.assertIn('missing.tsv', out)

    def test_a_group_count_mismatch_fails(self):
        root = scratch_root(self, 'spec')
        path = root / 'spec/API.md'
        text = path.read_text(encoding='utf-8')
        text = text.replace('| **Total** | | **124** |', '| **Total** | | **123** |', 1)
        path.write_text(text, encoding='utf-8', newline='\n')
        code, out = run(root)
        self.assertEqual(code, 1)
        self.assertIn('total is 123', out)
