"""Tests for tools/upstream_sync.py: the version compare, the commit split, the report and gh."""
import contextlib
import io
import json
import shutil
import subprocess
import tempfile
import unittest
from datetime import date
from pathlib import Path

from support import ROOT, scratch_root
import upstream_sync

COMMIT_ENV = ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false']


def git(repo, *args):
    return subprocess.run(['git', '-C', str(repo), *COMMIT_ENV, *args],
                          check=True, capture_output=True, text=True).stdout.strip()


def temp_dir(test, prefix='nepdate-sync-'):
    path = Path(tempfile.mkdtemp(prefix=prefix))
    test.addCleanup(shutil.rmtree, path, ignore_errors=True)
    return path


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8', newline='\n')


def read(path):
    return Path(path).read_text(encoding='utf-8')


class VersionTest(unittest.TestCase):
    def test_2_0_10_is_newer_than_2_0_9(self):
        self.assertGreater(upstream_sync.version_key('2.0.10'), upstream_sync.version_key('2.0.9'))

    def test_a_release_is_newer_than_its_own_beta(self):
        self.assertGreater(upstream_sync.version_key('2.1.0'), upstream_sync.version_key('2.1.0-beta.1'))
        self.assertGreater(upstream_sync.version_key('2.1.0'), upstream_sync.version_key('2.0.9'))

    def test_the_pinned_version_is_read_from_the_csproj(self):
        self.assertEqual(upstream_sync.pinned_version(ROOT / upstream_sync.GOLDEN_CSPROJ), '2.0.7')

    def test_a_newer_release_fires(self):
        result = upstream_sync.nuget_result(ROOT / upstream_sync.GOLDEN_CSPROJ, fetch=lambda: '2.0.8')
        self.assertEqual(result, {'pinned': '2.0.7', 'latest': '2.0.8', 'newer': True, 'error': None})

    def test_the_pinned_release_does_not_fire(self):
        result = upstream_sync.nuget_result(ROOT / upstream_sync.GOLDEN_CSPROJ, fetch=lambda: '2.0.7')
        self.assertFalse(result['newer'])

    def test_prereleases_are_ignored(self):
        versions = ['2.0.7', '2.0.8-beta.1', '2.1.0-rc.2']
        payload = json.dumps({'versions': versions}).encode()
        fetched = upstream_sync.latest_on_nuget(open_url=lambda *a, **k: io.BytesIO(payload))
        self.assertEqual(fetched, '2.0.7')

    def test_a_network_error_is_recorded_and_does_not_raise(self):
        def fetch():
            raise OSError('no route to host')
        result = upstream_sync.nuget_result(ROOT / upstream_sync.GOLDEN_CSPROJ, fetch=fetch)
        self.assertFalse(result['newer'])
        self.assertIn('no route to host', result['error'])


class CodeChangesTest(unittest.TestCase):
    def setUp(self):
        self.repo = temp_dir(self)
        write(self.repo / 'src/NepDate/Core/Dictionaries/NepaliToEnglish.cs', '// data\n')
        git(self.repo, 'init', '-q', '-b', 'main')
        git(self.repo, 'add', '-A')
        git(self.repo, 'commit', '-q', '-m', 'first')
        self.first = git(self.repo, 'rev-parse', 'HEAD')

    def commit(self, message, *paths):
        for path in paths:
            write(self.repo / path, message + '\n')
        git(self.repo, 'add', '-A')
        git(self.repo, 'commit', '-q', '-m', message)
        return git(self.repo, 'rev-parse', 'HEAD')

    def test_a_dictionary_change_is_data_and_a_test_change_is_code(self):
        data = self.commit('data: new tithi', 'src/NepDate/Core/Dictionaries/TithiData.cs')
        code = self.commit('fix: new year name', 'tests/NepDate.Tests/Core/CalendarDataTests.cs')
        result = upstream_sync.code_changes(self.repo, self.first)
        self.assertTrue(result['moved'])
        self.assertEqual([commit['sha'] for commit in result['commits']], [data, code])
        self.assertEqual([commit['sha'] for commit in result['code_commits']], [code])
        self.assertEqual(result['code_files'], ['tests/NepDate.Tests/Core/CalendarDataTests.cs'])

    def test_commits_come_oldest_first(self):
        self.commit('one', 'README.md')
        self.commit('two', 'src/NepDate/NepDate.csproj')
        result = upstream_sync.code_changes(self.repo, self.first)
        self.assertEqual([commit['subject'] for commit in result['commits']], ['one', 'two'])

    def test_a_history_without_the_previous_commit_is_reported(self):
        self.commit('one', 'README.md')
        result = upstream_sync.code_changes(self.repo, '0' * 40)
        self.assertIn('no commit', result['error'])
        self.assertFalse(result['code_commits'])

    def test_no_move_skips_the_log(self):
        result = upstream_sync.code_changes(self.repo, git(self.repo, 'rev-parse', 'HEAD'))
        self.assertFalse(result['moved'])
        self.assertEqual(result['commits'], [])


class ReportTest(unittest.TestCase):
    """A hub checkout with a simulated import, and the results the check job would have collected."""

    def setUp(self):
        self.root = scratch_root(self, 'data', 'spec')
        self.set_2084_new_year('New Year 2083')
        git(self.root, 'init', '-q', '-b', 'main')
        git(self.root, 'add', '-A')
        git(self.root, 'commit', '-q', '-m', 'hub')
        self.results = temp_dir(self)
        self.out = temp_dir(self)
        write(self.results / 'import.log', 'OK 3588 BS months\nOK 1 changed BS months\n')
        write(self.results / 'code.json', json.dumps({
            'head': 'c6fff4f2f60ac01e31c086568320649627422ba1', 'short': 'c6fff4f',
            'previous': git(self.root, 'rev-parse', 'HEAD'), 'moved': True,
            'commits': [{'sha': 'a1db246', 'short': 'a1db246', 'subject': 'fix: new year name',
                         'files': ['tests/NepDate.Tests/Core/CalendarDataTests.cs']}],
            'code_commits': [{'sha': 'a1db246', 'short': 'a1db246', 'subject': 'fix: new year name'}],
            'code_files': ['tests/NepDate.Tests/Core/CalendarDataTests.cs'], 'error': None}))
        write(self.results / 'nuget.json',
              json.dumps({'pinned': '2.0.7', 'latest': '2.0.7', 'newer': False, 'error': None}))

    def set_2084_new_year(self, name):
        path = self.root / 'data/patro/2084.json'
        document = json.loads(read(path))
        document['days']['2084-01-01']['events'][0]['en'] = name
        write(path, json.dumps(document, ensure_ascii=False, indent=2) + '\n')
        return path

    def import_data(self):
        path = self.set_2084_new_year('New Year 2084')
        write(self.root / 'data/UPSTREAM', 'c6fff4f2f60ac01e31c086568320649627422ba1\n')
        write(self.root / 'data/NOTICE', 'extracted from NepDate\n')
        return path

    def report(self, **kwargs):
        outcomes = kwargs.pop('outcomes', {'import': 'success', 'vectors': 'success', 'verify': 'success',
                                           'sanity': 'success', 'exhaustive': 'success',
                                           'status': 'success'})
        summary = kwargs.pop('summary', None)
        if summary:
            write(summary, '- BS 2084-01: events changed\n')
        with contextlib.redirect_stdout(io.StringIO()):
            return upstream_sync.build(self.root, self.results, self.out, outcomes, summary, **kwargs)

    def test_a_changed_patro_file_makes_a_pull_request(self):
        self.import_data()
        report = self.report()
        self.assertTrue(report['data_changed'])
        self.assertEqual(report['pr']['title'], 'chore(data): sync from NepDate c6fff4f')
        self.assertIn('data/patro/2084.json', report['changed_paths'])
        self.assertTrue((self.out / 'data/patro/2084.json').exists())
        self.assertTrue((self.out / upstream_sync.VECTORS / 'month-boundaries.csv').exists())

    def test_upstream_and_notice_alone_make_no_pull_request(self):
        write(self.root / 'data/UPSTREAM', 'c6fff4f2f60ac01e31c086568320649627422ba1\n')
        write(self.root / 'data/NOTICE', 'extracted from NepDate\n')
        report = self.report()
        self.assertFalse(report['data_changed'])
        self.assertEqual(report['pr']['title'], '')
        self.assertFalse((self.out / 'pr-body.md').read_text(encoding='utf-8'))

    def issue_body(self, report, title):
        for issue in report['issues']:
            if issue['title'] == title:
                return read(self.out / issue['body'])
        self.fail(f'no issue titled {title!r}')

    def test_a_failed_importer_makes_no_pull_request(self):
        self.import_data()
        report = self.report(outcomes={'import': 'failure', 'vectors': 'skipped', 'verify': 'skipped',
                                       'sanity': 'skipped', 'exhaustive': 'skipped', 'status': 'success'})
        self.assertFalse(report['data_changed'])
        body = self.issue_body(report, 'Upstream NepDate import failed')
        self.assertIn('Failed checks', body)
        self.assertIn('Importer', body)
        self.assertIn('OK 1 changed BS months', body)

    def test_the_report_names_every_check(self):
        self.import_data()
        report = self.report(summary=self.results / 'summary.md')
        text = read(self.out / 'report.md')
        for row in report['checks']:
            self.assertIn(row['name'], text)
        self.assertIn('BS 2084-01: events changed', text)
        self.assertIn('a1db246', text)
        self.assertIn('2.0.7', text)

    def test_the_pull_request_body_lists_the_commits_and_the_changes(self):
        self.import_data()
        self.report(summary=self.results / 'summary.md')
        body = read(self.out / 'pr-body.md')
        self.assertIn('a1db246', body)
        self.assertIn('BS 2084-01: events changed', body)
        self.assertIn('Exhaustive C# comparison: ok', body)

    def test_the_nuget_check_alone_reports_the_same_issue(self):
        write(self.results / 'nuget.json',
              json.dumps({'pinned': '2.0.7', 'latest': '2.0.8', 'newer': True, 'error': None}))
        report = self.report()
        self.assertIn('Upstream NepDate changed outside the data',
                      [issue['title'] for issue in report['issues']])
        self.assertIn('2.0.8', self.issue_body(report, 'Upstream NepDate changed outside the data'))

    def test_no_change_reports_no_issue_and_no_pull_request(self):
        write(self.results / 'nuget.json', json.dumps({'pinned': '2.0.7', 'latest': '2.0.7',
                                                       'newer': False, 'error': None}))
        write(self.results / 'code.json', json.dumps({
            'head': 'c6fff4f2f60ac01e31c086568320649627422ba1', 'short': 'c6fff4f',
            'previous': 'c6fff4f2f60ac01e31c086568320649627422ba1', 'moved': False,
            'commits': [], 'code_commits': [], 'code_files': [], 'error': None}))
        report = self.report(outcomes={'status': 'success'})
        self.assertEqual(report['issues'], [])
        self.assertFalse(report['data_changed'])
        self.assertIn('- Issues: none', read(self.out / 'report.md'))
        self.assertEqual(read(self.out / 'issues.tsv'), '')

    def test_the_status_issue_carries_no_day_count(self):
        report = self.report(outcomes={'status': 'failure'}, today=date(2026, 10, 30))
        body = self.issue_body(report, 'Data running out')
        self.assertNotIn('days left', body)
        self.assertIn('2027-04-13', body)

    def test_the_status_issue_is_the_same_body_on_a_later_day(self):
        first = self.issue_body(self.report(outcomes={'status': 'failure'}, today=date(2026, 10, 30)),
                                'Data running out')
        later = self.issue_body(self.report(outcomes={'status': 'failure'}, today=date(2026, 11, 30)),
                                'Data running out')
        self.assertEqual(first, later)

    def test_the_issue_bodies_name_no_checkout_path(self):
        write(self.results / 'import.log', f'FAIL: {self.root}/data/patro/2084.json\n')
        report = self.report(outcomes={'import': 'failure', 'status': 'failure'},
                             upstream_dir=Path('/upstream'), today=date(2026, 10, 30))
        for issue in report['issues']:
            self.assertNotIn(str(self.root), read(self.out / issue['body']))

    def test_apply_copies_the_artifact_into_the_checkout(self):
        self.import_data()
        self.report()
        target = scratch_root(self, 'data', 'spec')
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(upstream_sync.apply_artifact(self.out, target), 0)
        self.assertIn('New Year 2084', read(target / 'data/patro/2084.json'))

    def test_apply_writes_the_step_outputs(self):
        self.import_data()
        self.report()
        target = scratch_root(self, 'data', 'spec')
        outputs = temp_dir(self) / 'github-output'
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(upstream_sync.apply_artifact(self.out, target, outputs), 0)
        self.assertEqual(read(outputs), 'data_changed=true\ntitle=chore(data): sync from NepDate c6fff4f\n')

    def test_apply_refuses_a_title_report_did_not_write(self):
        self.import_data()
        self.report()
        results = json.loads(read(self.out / 'results.json'))
        results['pr']['title'] = 'chore(data): sync\nother=1'
        write(self.out / 'results.json', json.dumps(results))
        target = scratch_root(self, 'data', 'spec')
        outputs = temp_dir(self) / 'github-output'
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(upstream_sync.apply_artifact(self.out, target, outputs), 1)
        self.assertFalse(outputs.exists())

    def test_issues_reports_every_listed_issue(self):
        self.report(outcomes={'status': 'failure'}, today=date(2026, 10, 30))
        fake = FakeGh()
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(upstream_sync.report_issues(self.out, fake), 0)
        created = [call for call in fake.calls if call[:2] == ('issue', 'create')]
        self.assertEqual([call[call.index('--title') + 1] for call in created],
                         ['Upstream NepDate changed outside the data', 'Data running out'])

    def test_issues_refuses_a_title_it_does_not_know(self):
        write(self.out / 'issue/1.md', 'text\n')
        write(self.out / 'issues.tsv', '@everyone look here\tissue/1.md\n')
        fake = FakeGh()
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(upstream_sync.report_issues(self.out, fake), 1)
        self.assertEqual(fake.calls, [])

    def test_issues_refuses_a_body_outside_the_artifact(self):
        write(self.out / 'issues.tsv', 'Data running out\t../../etc/passwd\n')
        fake = FakeGh()
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(upstream_sync.report_issues(self.out, fake), 1)
        self.assertEqual(fake.calls, [])

    def test_apply_does_nothing_without_a_data_change(self):
        self.report(outcomes={'status': 'success'})
        target = scratch_root(self, 'data', 'spec')
        before = read(target / 'data/patro/2084.json')
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(upstream_sync.apply_artifact(self.out, target), 0)
        self.assertEqual(read(target / 'data/patro/2084.json'), before)


class FakeGh:
    def __init__(self, issues=(), comments=(), body=''):
        self.issues = list(issues)
        self.comments = list(comments)
        self.body = body
        self.calls = []

    def __call__(self, *args):
        self.calls.append(args)
        if args[:2] == ('issue', 'list'):
            return json.dumps(self.issues)
        if args[:2] == ('issue', 'view'):
            return json.dumps({'body': self.body, 'comments': [{'body': c} for c in self.comments]})
        if args[:2] == ('issue', 'create'):
            return 'https://github.com/sanamhub/nepdate/issues/9\n'
        if args[:2] == ('issue', 'comment'):
            return ''
        raise AssertionError(f'unexpected gh call: {args}')


class IssueTest(unittest.TestCase):
    title = 'Data running out'

    def setUp(self):
        self.directory = temp_dir(self)
        self.body = self.directory / 'body.md'
        write(self.body, 'the same text\n')

    def run_issue(self, fake, assignee=''):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            action = upstream_sync.report_issue(self.title, self.body, fake, assignee)
        return action, out.getvalue()

    def test_opens_an_issue_when_none_is_open(self):
        fake = FakeGh()
        action, _ = self.run_issue(fake, assignee='sanam')
        self.assertEqual(action, 'opened')
        create = [call for call in fake.calls if call[:2] == ('issue', 'create')][0]
        self.assertIn('--title', create)
        self.assertIn(self.title, create)
        self.assertIn('--label', create)
        self.assertIn('upstream-sync', create)
        self.assertIn(str(self.body), create)
        self.assertEqual(create[-2:], ('--assignee', 'sanam'))

    def test_opens_without_an_assignee(self):
        fake = FakeGh()
        self.run_issue(fake)
        create = [call for call in fake.calls if call[:2] == ('issue', 'create')][0]
        self.assertNotIn('--assignee', create)

    def test_comments_when_the_body_changed(self):
        fake = FakeGh(issues=[{'number': 7, 'title': self.title}], comments=['older text'])
        action, _ = self.run_issue(fake)
        self.assertEqual(action, 'commented')
        comment = [call for call in fake.calls if call[:2] == ('issue', 'comment')][0]
        self.assertEqual(comment[2], '7')
        self.assertIn(str(self.body), comment)

    def test_stays_silent_when_the_last_comment_is_the_same(self):
        fake = FakeGh(issues=[{'number': 7, 'title': self.title}], comments=['older', 'the same text\n'])
        action, _ = self.run_issue(fake)
        self.assertEqual(action, 'unchanged')
        self.assertFalse([call for call in fake.calls if call[:2] == ('issue', 'comment')])

    def test_stays_silent_when_the_issue_body_is_the_same(self):
        fake = FakeGh(issues=[{'number': 7, 'title': self.title}], body='the same text')
        action, _ = self.run_issue(fake)
        self.assertEqual(action, 'unchanged')

    def test_ignores_an_open_issue_with_another_title(self):
        fake = FakeGh(issues=[{'number': 7, 'title': 'Data running out (old)'}])
        action, _ = self.run_issue(fake)
        self.assertEqual(action, 'opened')

    def test_a_failing_gh_stops_the_run(self):
        def failing(*args):
            raise SystemExit('gh issue list failed: no token')
        with self.assertRaises(SystemExit):
            self.run_issue(failing)


if __name__ == '__main__':
    unittest.main()
