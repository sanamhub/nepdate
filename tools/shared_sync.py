"""Copy the hub's data/ and spec/ into a spoke's shared/, or check that they match (ADR-0001 §3).

The local twin of the reusable workflows .github/workflows/shared-sync.yml and shared-check.yml,
for spokes worked on side by side with the hub before they have a GitHub remote.

    py tools/shared_sync.py ../nepdate-kotlin                 # shared/ := hub main, VERSION := its commit
    py tools/shared_sync.py ../nepdate-kotlin --rev <sha>     # a given hub commit instead
    py tools/shared_sync.py ../nepdate-kotlin --check         # exit 1 unless shared/ equals the hub at VERSION

Files come from the hub's commit (git archive), never from its working tree. --check also accepts a
plain directory as --hub (a downloaded tarball at the VERSION commit).
"""
import argparse
import io
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENDORED = ('data', 'spec')
IGNORED_DIRS = {'__pycache__'}


def git(hub, *args):
    return subprocess.run(['git', '-C', str(hub), *args], check=True, capture_output=True).stdout


def is_git(hub):
    try:
        git(hub, 'rev-parse', '--git-dir')
        return True
    except (OSError, subprocess.CalledProcessError):
        return False


def files_at(hub, rev):
    """{relative path: bytes} of data/ and spec/ in the hub at rev (or in a plain directory)."""
    if rev is None:
        return files_in(Path(hub))
    archive = git(hub, 'archive', '--format=tar', rev, '--', *VENDORED)
    files = {}
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for member in tar.getmembers():
            if member.isfile():
                files[member.name] = tar.extractfile(member).read()
    return files


def files_in(base):
    files = {}
    for part in VENDORED:
        for path in sorted((base / part).rglob('*')):
            if path.is_file() and not IGNORED_DIRS & set(path.relative_to(base).parts):
                files[path.relative_to(base).as_posix()] = path.read_bytes()
    return files


def sync(spoke, hub, rev):
    commit = git(hub, 'rev-parse', '--verify', f'{rev}^{{commit}}').decode().strip()
    files = files_at(hub, commit)
    shared = spoke / 'shared'
    for part in VENDORED:
        shutil.rmtree(shared / part, ignore_errors=True)
    for name, content in files.items():
        path = shared / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    (shared / 'VERSION').write_text(commit + '\n', encoding='utf-8', newline='\n')
    print(f'shared/ synced to hub {commit} ({len(files)} files)')
    return 0


def normalized(content):
    # Spokes store text with eol=lf, but a Windows checkout may hold CRLF in the working tree that
    # git commits as LF anyway. Binary files (with a NUL byte) are compared as they are.
    return content if b'\0' in content else content.replace(b'\r\n', b'\n')


def check(spoke, hub):
    version_file = spoke / 'shared' / 'VERSION'
    if not version_file.exists():
        print(f'FAIL: {version_file} not found')
        return 1
    version = version_file.read_text(encoding='utf-8').strip()
    expected = files_at(hub, version if is_git(hub) else None)
    actual = files_in(spoke / 'shared')
    problems = [f'missing   shared/{n}' for n in sorted(expected.keys() - actual.keys())]
    problems += [f'extra     shared/{n}' for n in sorted(actual.keys() - expected.keys())]
    problems += [f'differs   shared/{n}' for n in sorted(expected.keys() & actual.keys()) if normalized(expected[n]) != normalized(actual[n])]
    for problem in problems:
        print(problem)
    if problems:
        print(f'FAIL: shared/ differs from hub {version} in {len(problems)} file(s); never edit shared/ by hand, '
              f're-sync it')
        return 1
    print(f'shared/ matches hub {version} ({len(expected)} files)')
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Sync or check a spoke's shared/ against the hub.")
    parser.add_argument('spoke', type=Path, help='the spoke repository, for example ../nepdate-kotlin')
    parser.add_argument('--hub', type=Path, default=ROOT, help='the hub (default: this repository)')
    parser.add_argument('--rev', default='main', help='hub commit or branch to sync to (default: main)')
    parser.add_argument('--check', action='store_true',
                        help='compare shared/ with the hub at shared/VERSION instead of syncing')
    args = parser.parse_args(argv)
    if args.check:
        return check(args.spoke, args.hub)
    return sync(args.spoke, args.hub, args.rev)


if __name__ == '__main__':
    sys.exit(main())
