"""Fold the hub's upstream sync check results into a report, a PR body and issue bodies.

.github/workflows/upstream-sync.yml runs the checks with the tools next to this one and calls this
tool. The only network call here is the NuGet version lookup.

    py tools/upstream_sync.py code-changed --repo <NepDate clone> --previous <sha> --out code.json
    py tools/upstream_sync.py nuget --out nuget.json
    py tools/upstream_sync.py report --results <dir> --root . --out <dir> [--outcome name=status]...
    py tools/upstream_sync.py apply --artifact <dir> --root . [--github-output <file>]
    py tools/upstream_sync.py issue --title <title> --body-file <file>
    py tools/upstream_sync.py issues --artifact <dir>

`report` reads the log each check wrote plus the JSON from `code-changed` and `nuget`, and writes
report.md, results.json, pr-title.txt, pr-body.md and one body file per issue. The publish job only
applies the artifact and calls `issues`, so it reads nothing from the NepDate clone. The check job
builds NepDate's code, so `issues` trusts no line of issues.tsv: a title must be one of TITLES and
a body must be one of the artifact's own issue/<n>.md files, and `apply` writes the PR title
only when it has the shape `report` gives it.

Issue bodies never carry "days left", a timestamp or a run link: a daily run must produce the same
body for the same finding, or the issue would collect one comment per day.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
for extra in (ROOT, ROOT / 'tools', ROOT / 'spec' / 'reference'):
    if str(extra) not in sys.path:
        sys.path.insert(0, str(extra))

import data_status  # noqa: E402
import nepcal  # noqa: E402

LABEL = 'upstream-sync'
NUGET_INDEX = 'https://api.nuget.org/v3-flatcontainer/nepdate/index.json'
GOLDEN_CSPROJ = 'tools/csharp-golden/CsharpGolden.csproj'
CODE_DIR = 'src/NepDate/Core/Dictionaries'
UNTRACKED_DATA = ('data/UPSTREAM', 'data/NOTICE')
VECTORS = 'spec/vectors'
CHECKS = ('import', 'vectors', 'verify', 'sanity', 'exhaustive')
NAMES = {'import': 'Importer', 'vectors': 'Vectors', 'verify': 'Spec and vectors',
         'sanity': 'Data sanity', 'exhaustive': 'Exhaustive C# comparison',
         'status': 'Data running out'}
TITLES = {
    'code': 'Upstream NepDate changed outside the data',
    'status': 'Data running out',
    'import': 'Upstream NepDate import failed',
}
PR_CHECKS = {'Importer', 'Vectors', 'Spec and vectors', 'Data sanity', 'Exhaustive C# comparison'}


def git(repo: Path, *args: str) -> str:
    return subprocess.run(['git', '-C', str(repo), *args], check=True, capture_output=True,
                          text=True).stdout


def read_json(path: Path, default):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return default


def write_text(path: Path, text: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(text, encoding='utf-8', newline='\n')


def one_line(text: str) -> str:
    return ' '.join(str(text).replace('\r', ' ').split('\n')).strip()


# --------------------------------------------------------------------------- versions and NuGet

def version_key(text: str) -> tuple:
    """Sort key for a release version: 2.0.10 is newer than 2.0.9, a release is newer than its beta."""
    core, _, rest = text.strip().partition('-')
    numbers = tuple(int(part) for part in re.findall(r'\d+', core))[:3]
    numbers += (0,) * (3 - len(numbers))
    return numbers, 1 if not rest else 0, rest


def pinned_version(csproj: Path = ROOT / GOLDEN_CSPROJ) -> str:
    source = Path(csproj).read_text(encoding='utf-8')
    found = re.search(r'<PackageReference\s+Include="NepDate"\s+Version="([^"]+)"', source)
    return found.group(1) if found else ''


def latest_on_nuget(url: str = NUGET_INDEX, open_url=urllib.request.urlopen) -> str:
    """The newest release version on nuget.org; prereleases are ignored."""
    with open_url(url, timeout=30) as response:
        versions = json.loads(response.read().decode('utf-8'))['versions']
    releases = [version for version in versions if '-' not in version] or versions
    return max(releases, key=version_key)


def nuget_result(csproj: Path = ROOT / GOLDEN_CSPROJ, fetch=latest_on_nuget) -> dict:
    """Compare the newest release with the version tools/csharp-golden pins."""
    pinned = pinned_version(csproj)
    result = {'pinned': pinned, 'latest': None, 'newer': False, 'error': None}
    try:
        result['latest'] = fetch()
    except Exception as error:  # a network or format problem: nothing to compare, nothing to report
        result['error'] = f'{type(error).__name__}: {error}'
        return result
    result['newer'] = bool(pinned) and version_key(result['latest']) > version_key(pinned)
    return result


# --------------------------------------------------------------------------- upstream commits

def commit_list(repo: Path, previous: str) -> tuple[list[dict], str | None]:
    """The commits in previous..HEAD, oldest first, with the files each one touched."""
    try:
        git(repo, 'rev-parse', '--verify', f'{previous}^{{commit}}')
    except subprocess.CalledProcessError:
        return [], f'upstream history has no commit {previous}'
    commits = {}
    for chunk in git(repo, 'log', '--format=%x1e%H%x1f%h%x1f%s', f'{previous}..HEAD').split('\x1e'):
        if chunk.strip():
            sha, short, subject = chunk.split('\x1f', 2)
            commits[sha] = {'sha': sha, 'short': short, 'subject': subject.rstrip('\n'), 'files': []}
    for chunk in git(repo, 'log', '--name-only', '--format=%x1e%H', f'{previous}..HEAD').split('\x1e'):
        lines = [line for line in chunk.splitlines() if line.strip()]
        if lines and lines[0] in commits:
            commits[lines[0]]['files'] = lines[1:]
    return list(reversed(list(commits.values()))), None


def code_changes(repo: Path, previous: str) -> dict:
    """What changed upstream since the commit data/UPSTREAM records."""
    repo = Path(repo)
    head = git(repo, 'rev-parse', 'HEAD').strip()
    result = {'head': head, 'short': head[:7], 'previous': previous, 'moved': head != previous,
              'commits': [], 'code_commits': [], 'code_files': [], 'error': None}
    if not previous or not result['moved']:
        return result
    commits, error = commit_list(repo, previous)
    result['commits'] = commits
    result['error'] = error
    for commit in commits:
        outside = [name for name in commit['files'] if not name.startswith(CODE_DIR + '/')]
        if outside:
            result['code_commits'].append({'sha': commit['sha'], 'short': commit['short'],
                                           'subject': commit['subject']})
            result['code_files'] += outside
    result['code_files'] = sorted(set(result['code_files']))
    return result


# --------------------------------------------------------------------------- the hub working tree

def changed_files(root: Path) -> list[str]:
    """The paths under data/ and spec/vectors/ that differ from HEAD in the hub checkout."""
    out = git(root, 'status', '--porcelain', '-z', '--', 'data', VECTORS)
    paths = []
    for entry in out.split('\0'):
        if entry and len(entry) > 3:
            paths.append(entry[3:].strip())
    return sorted(set(paths))


def is_data_change(path: str) -> bool:
    if path.startswith(VECTORS + '/'):
        return True
    return path.startswith('data/') and path not in UNTRACKED_DATA


def short_ranges(root: Path, today: dt.date | None = None) -> dict:
    """{label: (last BS day, last AD day)} for the kinds under the gate; None when a kind is empty."""
    root = Path(root)
    today = today or dt.date.today()
    try:
        ranges = data_status.coverage(root)
        calendar = nepcal.load(root)
    except (OSError, ValueError, KeyError):
        return {}
    short = {}
    for label, _ in data_status.KINDS:
        if label not in ranges:
            short[label] = None
            continue
        last = ranges[label][1]
        ad = dt.date(*calendar.to_ad(*map(int, last.split('-'))))
        if (ad - today).days < data_status.GATE_DAYS:
            short[label] = (last, ad)
    return short


def log_lines(path: Path) -> list[str]:
    try:
        return Path(path).read_text(encoding='utf-8', errors='replace').splitlines()
    except OSError:
        return []


def scrub(text: str, *paths: Path) -> str:
    """Replace checkout paths in a log with names, so a report or an issue names no directory."""
    names = ('<hub>', '<upstream>')
    for path, name in zip(paths, names):
        if path:
            text = text.replace(str(Path(path).resolve()).rstrip('/\\'), name)
    return text


def last_line(path: Path) -> str:
    lines = [line.strip() for line in log_lines(Path(path)) if line.strip()]
    return lines[-1] if lines else ''


def first_line(path: Path) -> str:
    lines = [line.strip() for line in log_lines(Path(path)) if line.strip()]
    return lines[0] if lines else ''


def tail(path: Path, count: int = 30) -> str:
    lines = [line for line in log_lines(Path(path))[-count:] if not line.startswith('~~~')]
    return '\n'.join(lines)


# --------------------------------------------------------------------------- the text

def outcome_word(value: str | None) -> str:
    return {'success': 'ok', 'failure': 'failed', 'skipped': 'skipped'}.get(value or '', 'not run')


def cell(text: str, limit: int = 140) -> str:
    text = ' '.join(str(text).split()).replace('|', '\\|')
    return text if len(text) <= limit else text[:limit - 3] + '...'


def bullet(short: str, subject: str) -> str:
    return f'- `{short}` {one_line(subject)}'


def spoken(short: str, full: str) -> str:
    """A commit as its short SHA with the full one in brackets, or "unknown"."""
    if not full:
        return 'unknown'
    return f'`{short}` ({full})'


def summary_lines(path) -> list[str]:
    try:
        text = Path(path).read_text(encoding='utf-8')
    except (OSError, TypeError):
        return []
    lines = [line[2:].strip() for line in text.splitlines() if line.startswith('- ')]
    return [line for line in lines if line and line != 'No data changes.']


def render_report(report: dict) -> str:
    upstream = report['upstream']
    lines = ['# Upstream sync', '',
             f'- Upstream: {spoken(upstream["short"], upstream["head"])}',
             f'- Previous import: {spoken(upstream["previous"][:7], upstream["previous"])}',
             f'- Data: {"changed" if report["data_changed"] else "unchanged"}',
             f'- Pull request: {report["pr"]["title"] or "none"}']
    if report['issues']:
        lines.append('- Issues: ' + ', '.join(issue['title'] for issue in report['issues']))
    else:
        lines.append('- Issues: none')
    lines += ['', '## Checks', '', '| Check | Result | Detail |', '|---|---|---|']
    for row in report['checks']:
        lines.append(f'| {row["name"]} | {row["result"]} | {cell(row["detail"])} |')
    if report['changed_paths']:
        lines += ['', '## Changed files', ''] + [f'- `{one_line(path)}`' for path in report['changed_paths']]
    if report['data_summary']:
        lines += ['', '## Data changes', ''] + [f'- {one_line(line)}' for line in report['data_summary']]
    lines += ['', '## Upstream commits since the last import', '']
    lines += [bullet(commit['short'], commit['subject']) for commit in upstream['commits']] or ['- none']
    if upstream.get('error'):
        lines += ['', f'`git log` reported: {one_line(upstream["error"])}']
    if report['code_commits']:
        lines += ['', '## Commits outside `src/NepDate/Core/Dictionaries`', '']
        lines += [bullet(commit['short'], commit['subject']) for commit in report['code_commits']]
        lines += [f'- file: `{one_line(name)}`' for name in report['code_files']]
    nuget = report['nuget']
    lines += ['', '## NuGet release', '']
    if nuget.get('error'):
        lines.append(f'- could not read nuget.org: {one_line(nuget["error"])}')
    elif nuget:
        state = 'newer than the pinned version' if nuget['newer'] else 'matches the pinned version'
        lines.append(f'- `NepDate` {nuget["latest"]} on nuget.org, {state}'
                     f' (`tools/csharp-golden` pins {nuget["pinned"]})')
    return '\n'.join(lines) + '\n'


def render_pr_body(report: dict) -> str:
    upstream = report['upstream']
    lines = [f'Syncs `data/` with [RajuPrasai/NepDate@{upstream["short"]}]'
             f'(https://github.com/RajuPrasai/NepDate/commit/{upstream["head"]}) and regenerates '
             '`spec/vectors/month-boundaries.csv`.', '',
             f'Upstream commits since `{upstream["previous"][:7]}`:', '']
    lines += [bullet(commit['short'], commit['subject']) for commit in upstream['commits']] or ['- none']
    lines += ['', 'Data changes:', '']
    lines += [f'- {one_line(line)}' for line in report['data_summary']] or ['- none reported by the importer']
    lines += ['', 'Checks:', '']
    for row in report['checks']:
        if row['name'] in PR_CHECKS:
            lines.append(f'- {row["name"]}: {row["result"]}, {cell(row["detail"], 200)}')
    lines += ['', 'Review against `docs/runbooks/data-update.md`. After merge, add '
                  f'`Changed: calendar data synced from NepDate {upstream["short"]}` to `CHANGELOG.md`.']
    return '\n'.join(lines) + '\n'


def render_code_issue(code: dict, nuget: dict) -> str:
    lines = ['Something upstream changed outside `src/NepDate/Core/Dictionaries`, the directory the '
             'importer reads. The behaviour the ports must match may have changed with it.', '',
             '## Commits outside the data', '']
    if code.get('error'):
        lines.append(f'`git log` reported: {one_line(code["error"])}.')
    elif code.get('code_commits'):
        lines += [bullet(commit['short'], commit['subject']) for commit in code['code_commits']]
        lines += [f'- file: `{one_line(name)}`' for name in code['code_files']]
    else:
        lines.append('No commit since the last import touched a file outside the data.')
    lines += ['', '## NuGet release', '']
    if nuget.get('error'):
        lines.append(f'nuget.org could not be read: {one_line(nuget["error"])}.')
    elif nuget.get('newer'):
        lines.append(f'`NepDate` {nuget["latest"]} is on nuget.org and `tools/csharp-golden` pins '
                     f'{nuget["pinned"]}. The golden vectors should be regenerated against it '
                     '(ADR-0003, `spec/PARITY.md`).')
    else:
        lines.append(f'`NepDate` {nuget.get("latest")} is the newest release and matches the version '
                     '`tools/csharp-golden` pins.')
    lines += ['', 'Compare the commits with `spec/`: a changed behaviour is either a spec change, a new '
                  'vector, or a deviation added to `spec/PARITY.md`. Reproduce it against '
                  '`tools/csharp-golden` before changing either.']
    return '\n'.join(lines) + '\n'


def render_status_issue(short: dict, log_tail: str) -> str:
    lines = [f'Tithi, holiday or event data ends within {data_status.GATE_DAYS} days, so '
             '`tools/data_status.py --strict` fails and every port shows nothing for those days.', '']
    if short:
        lines += ['| Data | Last day (BS) | Last day (AD) |', '|---|---|---|']
        for label, found in short.items():
            lines.append(f'| {label} | missing | missing |' if found is None
                         else f'| {label} | {found[0]} | {found[1]} |')
        lines.append('')
    elif log_tail.strip():
        lines += ['~~~', log_tail.strip(), '~~~', '']
    lines += ['Add the next year in C# NepDate first (ADR-0002). The daily `upstream-sync` imports it '
              'and opens the pull request here; every port gets it through its own sync afterwards.']
    return '\n'.join(lines) + '\n'


def render_import_issue(failed: list[tuple[str, str]], head: str) -> str:
    lines = [f'The import of upstream `{head[:7]}` did not come through cleanly, so `data/` was not '
             'changed.', '', 'Failed checks:', '']
    lines += [f'- {name}' for name, _ in failed]
    for name, text in failed:
        lines += ['', f'### {name}', '', '~~~', text.strip(), '~~~']
    lines += ['', 'The importer reads C# source from `src/NepDate/Core/Dictionaries`; a failure here '
                  'usually means that layout changed. Fix the tool, or the input it reads, and run '
                  'the workflow again (`docs/runbooks/data-update.md`).']
    return '\n'.join(lines) + '\n'


# --------------------------------------------------------------------------- report

def checks_table(outcomes: dict, code: dict, nuget: dict, data_changed: bool,
                 changed: list[str], results: Path, paths: tuple = ()) -> list[dict]:
    rows = [{'name': 'Upstream data', 'result': 'changed' if data_changed else 'unchanged',
             'detail': f'{len(changed)} file(s) differ from HEAD' if changed else ''}]
    for key in CHECKS + ('status',):
        log = Path(results) / f'{key}.log'
        # verify_vectors.py prints one line per group of checks; the first names the vectors.
        detail = first_line(log) if key == 'verify' else last_line(log)
        rows.append({'name': NAMES[key], 'result': outcome_word(outcomes.get(key)),
                     'detail': scrub(detail, *paths)})
    rows.append({'name': 'Upstream code',
                 'result': 'changed' if code.get('code_commits') else
                           ('not checked' if not code else 'unchanged'),
                 'detail': f'{len(code.get("code_commits") or [])} commit(s) outside the data'})
    if not nuget:
        rows.append({'name': 'NuGet release', 'result': 'not checked', 'detail': ''})
    else:
        rows.append({'name': 'NuGet release',
                     'result': 'not checked' if nuget.get('error') else
                               ('newer version' if nuget['newer'] else 'unchanged'),
                     'detail': f'{nuget.get("latest")} against the pinned {nuget.get("pinned")}'})
    return rows


def build(root: Path, results: Path, out: Path, outcomes: dict, summary=None, previous=None,
          upstream_dir: Path | None = None, today: dt.date | None = None) -> dict:
    root, results, out = Path(root), Path(results), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    code = read_json(results / 'code.json', {})
    nuget = read_json(results / 'nuget.json', {})
    previous = previous or code.get('previous') or ''
    if not previous:
        try:
            previous = git(root, 'show', 'HEAD:data/UPSTREAM').strip()
        except subprocess.CalledProcessError:
            previous = ''
    head = code.get('head', '')
    upstream = {'head': head, 'short': code.get('short') or head[:7], 'previous': previous,
                'moved': code.get('moved'), 'commits': code.get('commits') or [],
                'error': code.get('error')}

    changed = changed_files(root)
    data_changed = outcomes.get('import') == 'success' and any(is_data_change(path) for path in changed)
    data_summary = summary_lines(summary) if data_changed else []
    title = f'chore(data): sync from NepDate {upstream["short"]}' if data_changed else ''

    bodies = []
    paths = (root, Path(upstream_dir) if upstream_dir else None)
    if code.get('code_commits') or code.get('error') or nuget.get('newer'):
        bodies.append((TITLES['code'], render_code_issue(code, nuget)))
    if outcomes.get('status') == 'failure':
        bodies.append((TITLES['status'],
                       render_status_issue(short_ranges(root, today),
                                           scrub(tail(results / 'status.log'), *paths))))
    failed = [(NAMES[key], scrub(tail(results / f'{key}.log'), *paths)) for key in CHECKS
              if outcomes.get(key) == 'failure']
    if failed:
        bodies.append((TITLES['import'], render_import_issue(failed, head)))

    issues = []
    shutil.rmtree(out / 'issue', ignore_errors=True)
    for index, (issue_title, text) in enumerate(bodies, 1):
        name = f'issue/{index}.md'
        write_text(out / name, text)
        issues.append({'title': issue_title, 'body': name})
    write_text(out / 'issues.tsv',
               ''.join(f'{issue["title"]}\t{issue["body"]}\n' for issue in issues))

    report = {'upstream': upstream, 'data_changed': data_changed, 'changed_paths': changed,
              'data_summary': data_summary,
              'code_commits': code.get('code_commits') or [],
              'code_files': code.get('code_files') or [],
              'nuget': nuget, 'issues': issues,
              'checks': checks_table(outcomes, code, nuget, data_changed, changed, results, paths),
              'pr': {'needed': data_changed, 'title': title, 'body': 'pr-body.md'}}
    write_text(out / 'pr-body.md', render_pr_body(report) if data_changed else '')
    write_text(out / 'pr-title.txt', title + '\n')
    write_text(out / 'report.md', render_report(report))
    write_text(out / 'results.json', json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    stage(out, root)
    return report


def stage(out: Path, root: Path = ROOT) -> None:
    """Put data/ and spec/vectors/ into the artifact next to the report."""
    for name in ('data', VECTORS):
        target = Path(out) / name
        shutil.rmtree(target, ignore_errors=True)
        shutil.copytree(Path(root) / name, target)


# --------------------------------------------------------------------------- publish

PR_TITLE = re.compile(r'chore\(data\): sync from NepDate [0-9a-f]{7,40}')


def apply_artifact(artifact: Path, root: Path, github_output: Path | None = None) -> int:
    """Copy the artifact's data into a checkout and write the step outputs the PR step reads."""
    artifact, root = Path(artifact), Path(root)
    results = read_json(artifact / 'results.json', {})
    outputs = 'data_changed=false\n'
    if not results.get('data_changed'):
        print('the artifact holds no data change, nothing to apply')
        if github_output:
            write_outputs(github_output, outputs)
        return 0
    title = str((results.get('pr') or {}).get('title', ''))
    if not PR_TITLE.fullmatch(title):
        print(f'FAIL: the pull request title {title[:80]!r} is not one report writes')
        return 1
    for name in ('data', VECTORS):
        source = artifact / name
        if not source.is_dir():
            print(f'FAIL: {name} is missing from the artifact')
            return 1
        target = root / name
        shutil.rmtree(target, ignore_errors=True)
        shutil.copytree(source, target)
        print(f'applied {name}')
    if github_output:
        write_outputs(github_output, f'data_changed=true\ntitle={title}\n')
    return 0


def write_outputs(path: Path, text: str) -> None:
    with Path(path).open('a', encoding='utf-8', newline='\n') as handle:
        handle.write(text)


def same_body(before: str, after: str) -> bool:
    return before.replace('\r\n', '\n').strip() == after.replace('\r\n', '\n').strip()


def gh(*args: str) -> str:
    result = subprocess.run(['gh', *args], capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(f'gh {" ".join(args)} failed: {result.stderr.strip()}')
    return result.stdout


def report_issue(title: str, body_file: Path, run=gh, assignee: str = '') -> str:
    """Open the labelled issue with this title, or comment on it when the body changed."""
    body_file = Path(body_file)
    body = body_file.read_text(encoding='utf-8')
    open_issues = json.loads(run('issue', 'list', '--label', LABEL, '--state', 'open',
                                 '--json', 'number,title', '--limit', '100'))
    for issue in open_issues:
        if issue['title'] != title:
            continue
        number = str(issue['number'])
        view = json.loads(run('issue', 'view', number, '--json', 'body,comments'))
        comments = view.get('comments') or []
        last = comments[-1]['body'] if comments else view.get('body', '')
        if same_body(last or '', body):
            print(f'{title}: issue #{number} already says this, no comment')
            return 'unchanged'
        run('issue', 'comment', number, '--body-file', str(body_file))
        print(f'{title}: commented on issue #{number}')
        return 'commented'
    args = ['issue', 'create', '--title', title, '--label', LABEL, '--body-file', str(body_file)]
    if assignee:
        args += ['--assignee', assignee]
    url = run(*args).strip()
    print(f'{title}: opened {url}')
    return 'opened'


ISSUE_BODY = re.compile(r'issue/[0-9]+\.md')


def artifact_issues(artifact: Path) -> list[tuple[str, Path]]:
    """The (title, body file) rows of the artifact's issues.tsv; raises ValueError on a bad row."""
    artifact = Path(artifact).resolve()
    try:
        text = (artifact / 'issues.tsv').read_text(encoding='utf-8')
    except OSError:
        return []
    rows = []
    for number, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        title, _, body = line.partition('\t')
        if title not in TITLES.values():
            raise ValueError(f'issues.tsv line {number}: unknown title {title[:80]!r}')
        if not ISSUE_BODY.fullmatch(body):
            raise ValueError(f'issues.tsv line {number}: body {body[:80]!r} is not issue/<n>.md')
        path = artifact / body
        if not path.is_file() or path.is_symlink():
            raise ValueError(f'issues.tsv line {number}: {body} is missing from the artifact')
        rows.append((title, path))
    return rows


def report_issues(artifact: Path, run=gh, assignee: str = '') -> int:
    try:
        rows = artifact_issues(artifact)
    except ValueError as error:
        print(f'FAIL: {error}', file=sys.stderr)
        return 1
    if not rows:
        print('no issue to report')
    for title, body in rows:
        report_issue(title, body, run, assignee)
    return 0


# --------------------------------------------------------------------------- command line

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description='Report the hub upstream sync; see the module docstring for the steps.')
    sub = parser.add_subparsers(dest='command', required=True)

    code = sub.add_parser('code-changed', help='list the upstream commits outside the data directory')
    code.add_argument('--repo', type=Path, required=True, help='a NepDate clone')
    code.add_argument('--previous', required=True, help='the commit in data/UPSTREAM')
    code.add_argument('--out', type=Path, required=True, help='write the JSON result here')

    nuget = sub.add_parser('nuget', help='compare the newest NepDate release with the pinned version')
    nuget.add_argument('--csproj', type=Path, default=ROOT / GOLDEN_CSPROJ)
    nuget.add_argument('--out', type=Path, required=True, help='write the JSON result here')

    rep = sub.add_parser('report', help='fold the check results into a report, a PR body and issues')
    rep.add_argument('--results', type=Path, required=True, help='directory the checks wrote to')
    rep.add_argument('--root', type=Path, default=ROOT, help='the hub checkout (default: this repository)')
    rep.add_argument('--out', type=Path, required=True, help='write the report and the bodies here')
    rep.add_argument('--summary', type=Path, help="the importer's --summary file")
    rep.add_argument('--upstream', type=Path, help='the NepDate clone, for names in the report')
    rep.add_argument('--previous', help='the commit in data/UPSTREAM before the import')
    rep.add_argument('--today', type=dt.date.fromisoformat,
                     help='AD date to count the 183 days from (for tests)')
    rep.add_argument('--outcome', action='append', default=[], metavar='NAME=STATUS',
                     help='a check step outcome, repeatable')

    apply = sub.add_parser('apply', help="copy the artifact's data/ and spec/vectors/ into a checkout")
    apply.add_argument('--artifact', type=Path, required=True)
    apply.add_argument('--root', type=Path, default=Path('.'))
    apply.add_argument('--github-output', type=Path,
                       default=Path(os.environ['GITHUB_OUTPUT']) if os.environ.get('GITHUB_OUTPUT') else None,
                       help='append data_changed and title here (default: $GITHUB_OUTPUT)')

    issue = sub.add_parser('issue', help='open or comment on one labelled issue')
    issue.add_argument('--title', required=True)
    issue.add_argument('--body-file', type=Path, required=True)
    issue.add_argument('--assignee', default=os.environ.get('SYNC_ASSIGNEE', ''))

    issues = sub.add_parser('issues', help="report every issue the artifact's issues.tsv lists")
    issues.add_argument('--artifact', type=Path, required=True)
    issues.add_argument('--assignee', default=os.environ.get('SYNC_ASSIGNEE', ''))

    args = parser.parse_args(argv)
    if args.command == 'code-changed':
        result = code_changes(args.repo, args.previous)
        write_text(args.out, json.dumps(result, indent=2, ensure_ascii=False) + '\n')
        print(f'code: {len(result["commits"])} commit(s) since {args.previous[:7]}, '
              f'{len(result["code_commits"])} outside the data')
        return 0
    if args.command == 'nuget':
        result = nuget_result(args.csproj)
        write_text(args.out, json.dumps(result, indent=2) + '\n')
        if result['error']:
            print(f'WARNING: could not read nuget.org: {result["error"]}')
        elif result['newer']:
            print(f'nuget: {result["latest"]} is newer than the pinned {result["pinned"]}')
        else:
            print(f'nuget: {result["latest"]} matches the pinned {result["pinned"]}')
        return 0
    if args.command == 'report':
        outcomes = {}
        for item in args.outcome:
            name, _, status = item.partition('=')
            outcomes[name.strip()] = status.strip()
        report = build(args.root, args.results, args.out, outcomes, args.summary, args.previous,
                       args.upstream, args.today)
        for row in report['checks']:
            print(f'{row["name"]}: {row["result"]} {row["detail"]}'.rstrip())
        print(f'report: {args.out / "report.md"}')
        return 0
    if args.command == 'apply':
        return apply_artifact(args.artifact, args.root, args.github_output)
    if args.command == 'issue':
        report_issue(args.title, args.body_file, assignee=args.assignee)
        return 0
    if args.command == 'issues':
        return report_issues(args.artifact, assignee=args.assignee)
    return 1


if __name__ == '__main__':
    sys.exit(main())
