#!/usr/bin/env bash
# The hub's CI command. .github/workflows/ci.yml runs this same script, so a green local run
# means a green CI run. Standard library Python only.
set -euo pipefail

cd "$(dirname "$0")/.."
PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" --version >/dev/null 2>&1; then PYTHON=python; fi

checks=0
skipped=()
run() {
  echo "ci: $*"
  "$@"
  checks=$((checks + 1))
}

run "$PYTHON" spec/reference/verify_vectors.py
run "$PYTHON" tools/make_vectors.py --check
run "$PYTHON" tools/data_sanity.py
run "$PYTHON" -m unittest discover -s tools/tests

# actionlint isn't on GitHub's runners; locally set ACTIONLINT or put it on PATH.
ACTIONLINT="${ACTIONLINT:-$(command -v actionlint || true)}"
if [ -n "$ACTIONLINT" ]; then
  run "$ACTIONLINT" -shellcheck= -pyflakes=
else
  echo "ci: actionlint not found, workflow lint skipped"
  skipped+=("workflow lint")
fi

# A skipped check is reported as such and never counted as passed.
if [ "${#skipped[@]}" -eq 0 ]; then
  echo "ci: $checks checks passed"
else
  joined=$(IFS=,; echo "${skipped[*]}")
  echo "ci: $checks checks passed, ${#skipped[@]} skipped (${joined//,/, })"
fi
