import contextlib
import io
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from support import ROOT
import shared_sync


def git(repo, *args):
    return subprocess.run(['git', '-C', str(repo), '-c', 'user.name=test', '-c', 'user.email=test@example.invalid',
                           '-c', 'commit.gpgsign=false', *args],
                          check=True, capture_output=True, text=True).stdout.strip()


def run(argv):
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        code = shared_sync.main(argv)
    return code, out.getvalue()


class SharedSyncTest(unittest.TestCase):
    def setUp(self):
        tmp = Path(tempfile.mkdtemp(prefix='nepdate-sync-'))
        self.addCleanup(shutil.rmtree, tmp, ignore_errors=True)
        self.hub = tmp / 'nepdate'
        self.spoke = tmp / 'nepdate-kotlin'
        self.spoke.mkdir()
        (self.hub / 'data/patro').mkdir(parents=True)
        (self.hub / 'spec/reference').mkdir(parents=True)
        (self.hub / 'data/patro/2083.json').write_text('{"year": 2083}\n', encoding='utf-8')
        (self.hub / 'spec/PARITY.md').write_text('# Parity\n', encoding='utf-8')
        (self.hub / 'spec/reference/nepcal.py').write_text('MIN = 1901\n', encoding='utf-8')
        (self.hub / 'tools').mkdir()
        (self.hub / 'tools/not_vendored.py').write_text('', encoding='utf-8')
        git(self.hub, 'init', '-q', '-b', 'main')
        git(self.hub, 'add', '-A')
        git(self.hub, 'commit', '-q', '-m', 'first')
        self.first = git(self.hub, 'rev-parse', 'HEAD')
        # Untracked files are not part of the commit and must never be copied.
        (self.hub / 'spec/reference/__pycache__').mkdir()
        (self.hub / 'spec/reference/__pycache__/nepcal.pyc').write_bytes(b'\0')

    def sync(self, *extra):
        return run([str(self.spoke), '--hub', str(self.hub), *extra])

    def test_sync_copies_data_and_spec_at_the_commit_and_writes_version(self):
        self.assertEqual(self.sync()[0], 0)
        shared = self.spoke / 'shared'
        self.assertEqual((shared / 'VERSION').read_text(encoding='utf-8'), self.first + '\n')
        self.assertEqual((shared / 'data/patro/2083.json').read_text(encoding='utf-8'), '{"year": 2083}\n')
        self.assertTrue((shared / 'spec/reference/nepcal.py').exists())
        self.assertFalse((shared / 'tools').exists())
        self.assertFalse((shared / 'spec/reference/__pycache__').exists())

    def test_sync_uses_the_commit_not_the_working_tree(self):
        (self.hub / 'spec/PARITY.md').write_text('# edited, not committed\n', encoding='utf-8')
        self.sync()
        self.assertEqual((self.spoke / 'shared/spec/PARITY.md').read_text(encoding='utf-8'), '# Parity\n')

    def test_sync_replaces_files_removed_in_the_hub(self):
        (self.spoke / 'shared/spec').mkdir(parents=True)
        (self.spoke / 'shared/spec/OLD.md').write_text('old\n', encoding='utf-8')
        self.sync()
        self.assertFalse((self.spoke / 'shared/spec/OLD.md').exists())

    def test_sync_to_an_older_rev(self):
        (self.hub / 'spec/PARITY.md').write_text('# Parity 2\n', encoding='utf-8')
        git(self.hub, 'commit', '-q', '-am', 'second')
        self.sync('--rev', self.first)
        self.assertEqual((self.spoke / 'shared/VERSION').read_text(encoding='utf-8'), self.first + '\n')
        self.assertEqual((self.spoke / 'shared/spec/PARITY.md').read_text(encoding='utf-8'), '# Parity\n')

    def test_check_passes_after_sync(self):
        self.sync()
        code, out = self.sync('--check')
        self.assertEqual(code, 0, out)

    def test_check_fails_on_an_edited_file(self):
        self.sync()
        (self.spoke / 'shared/data/patro/2083.json').write_text('{"year": 2084}\n', encoding='utf-8')
        code, out = self.sync('--check')
        self.assertEqual(code, 1)
        self.assertIn('data/patro/2083.json', out)

    def test_check_accepts_crlf_in_a_windows_working_tree(self):
        self.sync()
        path = self.spoke / 'shared/spec/PARITY.md'
        path.write_bytes(path.read_bytes().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n'))
        self.assertEqual(self.sync('--check')[0], 0)

    def test_check_fails_on_an_added_or_missing_file(self):
        self.sync()
        (self.spoke / 'shared/spec/EXTRA.md').write_text('x\n', encoding='utf-8')
        (self.spoke / 'shared/spec/PARITY.md').unlink()
        code, out = self.sync('--check')
        self.assertEqual(code, 1)
        self.assertIn('spec/EXTRA.md', out)
        self.assertIn('spec/PARITY.md', out)

    def test_check_uses_the_version_commit(self):
        self.sync()
        (self.hub / 'spec/PARITY.md').write_text('# Parity 2\n', encoding='utf-8')
        git(self.hub, 'commit', '-q', '-am', 'second')
        self.assertEqual(self.sync('--check')[0], 0)

    def test_check_against_a_plain_directory(self):
        # CI downloads the hub as a tarball at the VERSION commit: no .git folder there.
        self.sync()
        plain = self.hub.parent / 'tarball'
        shutil.copytree(self.hub, plain, ignore=shutil.ignore_patterns('.git', '__pycache__'))
        self.assertEqual(run([str(self.spoke), '--hub', str(plain), '--check'])[0], 0)
        (plain / 'spec/PARITY.md').write_text('# other\n', encoding='utf-8')
        self.assertEqual(run([str(self.spoke), '--hub', str(plain), '--check'])[0], 1)

    def test_check_without_version_fails(self):
        code, out = self.sync('--check')
        self.assertEqual(code, 1)
        self.assertIn('VERSION', out)

    def test_runs_against_this_hub(self):
        code, _ = run([str(self.spoke), '--hub', str(ROOT), '--rev', 'HEAD'])
        self.assertEqual(code, 0)
        self.assertTrue((self.spoke / 'shared/spec/reference/verify_vectors.py').exists())
        self.assertEqual(run([str(self.spoke), '--hub', str(ROOT), '--check'])[0], 0)


if __name__ == '__main__':
    unittest.main()
