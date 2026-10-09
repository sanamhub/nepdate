"""Shared helpers for the tool tests: import paths and a scratch copy of the repository."""
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for path in (ROOT / 'tools', ROOT / 'spec' / 'reference'):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))


def scratch_root(test, *parts):
    """Copy the named repository folders into a temporary root, removed after the test."""
    tmp = Path(tempfile.mkdtemp(prefix='nepdate-test-'))
    test.addCleanup(shutil.rmtree, tmp, ignore_errors=True)
    for part in parts:
        source = ROOT / part
        if source.is_dir():
            shutil.copytree(source, tmp / part)
        else:
            (tmp / part).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, tmp / part)
    return tmp
