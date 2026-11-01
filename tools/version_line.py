"""Check the hub's version line and the SDK versions that share it (ADR-0007 decision 3).

spec/versions.json records the current MAJOR.MINOR line and each SDK's latest released version. A
port passes its own version to the reusable shared-check workflow, which runs this tool, so a port
cannot move to another minor by accident.

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
    """A version file or a version that breaks ADR-0007."""


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


def check_version(sdk, version, line):
    """Validate one SDK version against the line and return its SemVer spelling."""
    if not isinstance(version, str):
        raise VersionError(f'{sdk}: the version must be a string')
    spelled = semver_spelling(sdk, version)
    found = SEMVER.match(spelled)
    if not found:
        raise VersionError(
            f'{sdk} {version}: not a SemVer version with an allowed pre-release (-beta.N or -rc.N)')
    major, minor = found.group(1), found.group(2)
    if f'{major}.{minor}' != line:
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
        check_version(sdk, version, line)
    return document


def load(path=VERSIONS):
    """Read and validate spec/versions.json."""
    return validate(read(path))


def check_sdk(document, sdk, version):
    """Check one port's version against the file and return its SemVer spelling."""
    sdks = document['sdks']
    if sdk not in sdks:
        raise VersionError(f'unknown SDK {sdk!r}; spec/versions.json lists {", ".join(sdks)}')
    return check_version(sdk, version, document['line'])


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
            print(f'version-line: {len(document["sdks"])} SDKs on {document["line"]}, all valid')
            return 0
        if not args.sdk or args.version is None:
            parser.error('--sdk and --version must be given together, or use --check')
        spelled = check_sdk(document, args.sdk, args.version)
        print(f'version-line: {args.sdk} {args.version} is on the {document["line"]} line ({spelled})')
        return 0
    except VersionError as error:
        print(f'version-line: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
