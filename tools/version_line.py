"""Check the hub's version line and the SDK versions that share it (ADR-0007 decision 3).

spec/versions.json records the current MAJOR.MINOR line and each SDK's latest released version. A
port passes its own version to the reusable shared-check workflow, which runs this tool, so a port
cannot move to another minor by accident.

A port that has never released has no entry yet. It may declare the line it is built for, which is
the current line or a later one, but never an earlier one (ADR-0008). The entry appears at its first
release, and from then on the equality rule below applies.

On release day for a minor the hub moves the line first and each SDK entry follows once that port
has released, so an entry may trail the line but never lead it. The site reads the entries, so
it never names a version a registry does not serve yet.

    py tools/version_line.py --check
    py tools/version_line.py --sdk rust --version 0.1.0-beta.1
    py tools/version_line.py --sdk python --version 0.1.0b1

Python is the one registry that spells a pre-release the PEP 440 way. The mapping lives in
semver_spelling() and pep440_spelling() so the site can use the same rule (ADR-0007 decision 4).
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSIONS = ROOT / 'spec' / 'versions.json'

LINE = re.compile(r'^(0|[1-9]\d*)\.(0|[1-9]\d*)$')
SEMVER = re.compile(
    r'^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(beta|rc)\.([1-9]\d*))?$')
PEP440 = re.compile(
    r'^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:(a|b|rc)([1-9]\d*))?$')
SDK = re.compile(r'^[a-z][a-z0-9-]*$')
PEP440_KINDS = {'a': 'alpha', 'b': 'beta', 'rc': 'rc'}


class VersionError(Exception):
    """A version file or a version that breaks ADR-0007 or ADR-0008."""


def read(path=VERSIONS):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except OSError as error:
        raise VersionError(f'cannot read {path}: {error.strerror}') from error
    except json.JSONDecodeError as error:
        raise VersionError(f'{path}: not valid JSON: {error}') from error


def semver_spelling(sdk, version):
    """The SemVer spelling of a port's version. Python also accepts the PEP 440 spelling."""
    if sdk != 'python':
        return version
    found = PEP440.match(version)
    if not found:
        return version
    major, minor, patch, kind, number = found.groups()
    core = f'{major}.{minor}.{patch}'
    return f'{core}-{PEP440_KINDS[kind]}.{number}' if kind else core


def pep440_spelling(version):
    """The PEP 440 spelling of a SemVer version: 0.1.0-beta.1 is 0.1.0b1, 0.1.0-rc.1 is 0.1.0rc1."""
    found = SEMVER.match(version)
    if not found:
        raise VersionError(f'{version}: not a SemVer version')
    major, minor, patch, kind, number = found.groups()
    core = f'{major}.{minor}.{patch}'
    if not kind:
        return core
    return f'{core}{"b" if kind == "beta" else "rc"}{number}'


def parse_version(sdk, version):
    """The SemVer spelling of one SDK version and its (MAJOR, MINOR)."""
    if not isinstance(version, str):
        raise VersionError(f'{sdk}: the version must be a string')
    spelled = semver_spelling(sdk, version)
    found = SEMVER.match(spelled)
    if not found:
        raise VersionError(
            f'{sdk} {version}: not a SemVer version with an allowed pre-release (-beta.N or -rc.N)')
    return spelled, (int(found.group(1)), int(found.group(2)))


def line_parts(line):
    major, minor = line.split('.')
    return int(major), int(minor)


def check_version(sdk, version, line):
    """Check a port's own version is on the line and return its SemVer spelling."""
    spelled, (major, minor) = parse_version(sdk, version)
    if (major, minor) != line_parts(line):
        raise VersionError(f'{sdk} {version}: major.minor {major}.{minor} is not the hub line {line}')
    return spelled


def validate(document):
    """Validate a parsed spec/versions.json. Raises VersionError on the first problem."""
    if not isinstance(document, dict):
        raise VersionError('the version file must be a JSON object')
    if document.get('schema') != 1:
        raise VersionError(f'schema must be 1, not {document.get("schema")!r}')
    line = document.get('line')
    if not isinstance(line, str) or not LINE.match(line):
        raise VersionError(f'line must be MAJOR.MINOR, not {line!r}')
    sdks = document.get('sdks')
    if not isinstance(sdks, dict) or not sdks:
        raise VersionError('sdks must be a non-empty object')
    for sdk, version in sdks.items():
        if not SDK.match(sdk):
            raise VersionError(f'{sdk!r}: not an SDK name')
        _, (major, minor) = parse_version(sdk, version)
        if (major, minor) > line_parts(line):
            raise VersionError(
                f'{sdk} {version}: released on {major}.{minor}, ahead of the hub line {line}')
    return document


def load(path=VERSIONS):
    """Read and validate spec/versions.json."""
    return validate(read(path))


def check_sdk(document, sdk, version):
    """Check one port's version against the file and return its SemVer spelling.

    A port with an entry has released, so its version must be on the hub line. A port with no
    entry has never released, so it may declare the current line or a later one, never an earlier
    one (ADR-0008).
    """
    sdks = document['sdks']
    if sdk in sdks:
        return check_version(sdk, version, document['line'])
    spelled, (major, minor) = parse_version(sdk, version)
    line = line_parts(document['line'])
    if (major, minor) < line:
        raise VersionError(
            f'{sdk} {version}: {major}.{minor} is behind the hub line {document["line"]}; '
            'a port with no entry may declare the current line or a later one')
    return spelled


def main(argv=None):
    parser = argparse.ArgumentParser(description="Check the hub's version line and an SDK's version.")
    parser.add_argument('--check', action='store_true', help='validate spec/versions.json')
    parser.add_argument('--sdk', help='SDK name in spec/versions.json, for example python')
    parser.add_argument('--version', help='the SDK version to check against the line')
    parser.add_argument('--file', type=Path, default=VERSIONS, help='the version file (default: spec/versions.json)')
    args = parser.parse_args(argv)
    try:
        document = load(args.file)
        if args.check:
            if args.sdk or args.version:
                raise VersionError('--check does not take --sdk or --version')
            line = document['line']
            behind = [sdk for sdk, version in document['sdks'].items()
                      if parse_version(sdk, version)[1] != line_parts(line)]
            print(f'version-line: {len(document["sdks"])} SDKs, line {line}, all valid')
            if behind:
                print(f'version-line: not yet released on {line}: {", ".join(behind)}')
            return 0
        if not args.sdk or args.version is None:
            parser.error('--sdk and --version must be given together, or use --check')
        spelled = check_sdk(document, args.sdk, args.version)
        if args.sdk not in document['sdks'] and \
                parse_version(args.sdk, args.version)[1] > line_parts(document['line']):
            print(f'version-line: {args.sdk} {args.version} is ahead of the {document["line"]} '
                  f'line ({spelled}); the port has not released yet')
        else:
            print(f'version-line: {args.sdk} {args.version} is on the {document["line"]} line ({spelled})')
        return 0
    except VersionError as error:
        print(f'version-line: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
