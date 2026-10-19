"""Workflow rules from CONTRIBUTING.md, checked on every file in .github/workflows/."""
import re
import unittest

from support import ROOT

WORKFLOWS = sorted((ROOT / '.github' / 'workflows').glob('*.yml'))
USES = re.compile(r'^\s*(?:-\s*)?uses:\s*(\S+)(.*)$')
PINNED = re.compile(r'^[\w.-]+/[\w.-]+(?:/[\w./-]+)?@[0-9a-f]{40}$')
VERSION_COMMENT = re.compile(r'^\s+#\s*\S+')


class WorkflowRulesTest(unittest.TestCase):
    def test_there_are_workflows(self):
        self.assertTrue(WORKFLOWS)

    def test_every_uses_is_pinned_to_a_full_sha_with_a_version_comment(self):
        for path in WORKFLOWS:
            for number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
                found = USES.match(line)
                if not found or line.lstrip().startswith('#'):
                    continue
                target, rest = found.groups()
                where = f'{path.name}:{number}'
                if target.startswith('./'):
                    continue
                self.assertRegex(target, PINNED, where)
                self.assertRegex(rest, VERSION_COMMENT, where)

    def test_top_level_permissions_are_read_only(self):
        for path in WORKFLOWS:
            text = path.read_text(encoding='utf-8')
            self.assertRegex(text, r'(?m)^permissions:\n  contents: read\n', path.name)

    def test_no_pull_request_target_or_inherited_secrets(self):
        for path in WORKFLOWS:
            code = '\n'.join(line for line in path.read_text(encoding='utf-8').splitlines()
                             if not line.lstrip().startswith('#'))
            self.assertNotIn('pull_request_target', code, path.name)
            self.assertNotRegex(code, r'secrets:\s*inherit', path.name)


if __name__ == '__main__':
    unittest.main()
