"""Tests for tools/version_line.py: the hub file, the line, the pre-release and the PEP 440 spelling."""
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from support import ROOT
import version_line

DOCUMENT = {
    'schema': 1,
    'line': '0.1',
    'sdks': {
        'rust': '0.1.0-beta.1',
        'go': '0.1.0-beta.1',
        'typescript': '0.1.0-beta.1',
        'python': '0.1.0-beta.1',
        'swift': '0.1.0-beta.1',
        'kotlin': '0.1.0-beta.1',
        'cpp': '0.1.0-beta.1',
        'c': '0.1.0-beta.1',
    },
}


def document(**overrides):
    copy = json.loads(json.dumps(DOCUMENT))
    copy.update(overrides)
    return copy


class FileTest(unittest.TestCase):
    def test_the_hub_file_is_valid_and_lists_the_ports_in_hub_order(self):
        found = version_line.load(ROOT / 'spec' / 'versions.json')
        self.assertEqual(found['line'], '0.2')
        self.assertEqual(
            list(found['sdks']),
            ['rust', 'go', 'typescript', 'python', 'swift', 'kotlin', 'cpp', 'c', 'dart', 'php'],
        )

    def test_entries_may_trail_a_line_that_moved_first(self):
        version_line.validate(document(line='0.2'))
        version_line.validate(document(line='1.0'))

    def test_an_entry_ahead_of_the_line_is_rejected(self):
        sdks = dict(DOCUMENT['sdks'], rust='0.2.0-beta.1')
        with self.assertRaisesRegex(version_line.VersionError, 'rust 0.2.0-beta.1.*ahead of the hub line 0.1'):
            version_line.validate(document(sdks=sdks))

    def test_lines_compare_as_numbers(self):
        sdks = dict(DOCUMENT['sdks'], c='0.9.0')
        version_line.validate(document(line='0.10', sdks=sdks))

    def test_an_unknown_pre_release_is_rejected(self):
        sdks = dict(DOCUMENT['sdks'], rust='0.1.0-alpha.1')
        with self.assertRaisesRegex(version_line.VersionError, 'allowed pre-release'):
            version_line.validate(document(sdks=sdks))

    def test_a_port_behind_the_line_fails_its_own_check(self):
        with self.assertRaisesRegex(version_line.VersionError, 'go 0.1.0-beta.1.*not the hub line 0.2'):
            version_line.check_sdk(document(line='0.2'), 'go', '0.1.0-beta.1')

    def test_a_missing_file_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(version_line.VersionError, 'cannot read'):
                version_line.read(Path(tmp) / 'versions.json')

    def test_a_port_with_no_entry_may_declare_the_current_line(self):
        self.assertEqual(version_line.check_sdk(DOCUMENT, 'java', '0.1.0-rc.1'), '0.1.0-rc.1')

    def test_a_port_with_no_entry_may_declare_a_later_line(self):
        self.assertEqual(
            version_line.check_sdk(document(line='0.2'), 'java', '1.0.0-rc.1'), '1.0.0-rc.1')

    def test_a_port_with_no_entry_may_not_declare_an_earlier_line(self):
        with self.assertRaisesRegex(version_line.VersionError, 'behind the hub line 0.2'):
            version_line.check_sdk(document(line='0.2'), 'java', '0.1.0-rc.1')

    def test_a_released_port_still_may_not_lead_the_line(self):
        with self.assertRaisesRegex(version_line.VersionError, 'rust 0.2.0-rc.1.*not the hub line 0.1'):
            version_line.check_sdk(DOCUMENT, 'rust', '0.2.0-rc.1')


class SpellingTest(unittest.TestCase):
    def test_python_accepts_the_pep_440_spelling(self):
        self.assertEqual(version_line.check_sdk(DOCUMENT, 'python', '0.1.0b1'), '0.1.0-beta.1')
        self.assertEqual(version_line.check_sdk(DOCUMENT, 'python', '0.1.0rc1'), '0.1.0-rc.1')
        self.assertEqual(version_line.check_sdk(DOCUMENT, 'python', '0.1.0'), '0.1.0')

    def test_python_still_accepts_the_semver_spelling(self):
        self.assertEqual(version_line.check_sdk(DOCUMENT, 'python', '0.1.0-beta.1'), '0.1.0-beta.1')

    def test_the_mapping_goes_both_ways(self):
        for semver, pep440 in (
            ('0.1.0-beta.1', '0.1.0b1'),
            ('0.1.0-rc.1', '0.1.0rc1'),
            ('0.1.0', '0.1.0'),
        ):
            self.assertEqual(version_line.semver_spelling('python', pep440), semver)
            self.assertEqual(version_line.pep440_spelling(semver), pep440)

    def test_another_registry_does_not_accept_the_pep_440_spelling(self):
        with self.assertRaisesRegex(version_line.VersionError, 'allowed pre-release'):
            version_line.check_sdk(DOCUMENT, 'rust', '0.1.0b1')


class CommandLineTest(unittest.TestCase):
    def run_tool(self, *args):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = version_line.main(list(args))
        return code, out.getvalue(), err.getvalue()

    def test_check_accepts_the_hub_file(self):
        code, out, _ = self.run_tool('--check')
        self.assertEqual(code, 0)
        self.assertIn('10 SDKs, line 0.2', out)

    def test_a_version_on_another_line_fails_with_a_clear_message(self):
        code, _, err = self.run_tool('--sdk', 'rust', '--version', '0.3.0-beta.1')
        self.assertEqual(code, 1)
        self.assertIn('major.minor 0.3 is not the hub line 0.2', err)

    def test_the_python_spelling_passes_the_command(self):
        code, out, _ = self.run_tool('--sdk', 'python', '--version', '0.2.0rc1')
        self.assertEqual(code, 0)
        self.assertIn('0.2.0-rc.1', out)

    def test_an_unreleased_port_on_a_later_line_passes_the_command(self):
        code, out, _ = self.run_tool('--sdk', 'java', '--version', '1.0.0-rc.1')
        self.assertEqual(code, 0)
        self.assertIn('ahead of the 0.2 line', out)
        self.assertIn('has not released yet', out)

    def test_an_unreleased_port_on_an_earlier_line_fails_the_command(self):
        code, _, err = self.run_tool('--sdk', 'java', '--version', '0.1.0-rc.1')
        self.assertEqual(code, 1)
        self.assertIn('behind the hub line 0.2', err)


if __name__ == '__main__':
    unittest.main()
