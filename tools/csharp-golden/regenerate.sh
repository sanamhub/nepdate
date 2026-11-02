#!/usr/bin/env bash
# Rebuild every generated vector under spec/vectors/ byte for byte.
#
#   bash tools/csharp-golden/regenerate.sh
#
# The C# recorder writes spec/vectors/csharp-golden/*.tsv from the published NepDate 2.0.7
# package. make_vectors.py writes the reference-only year length (C# has no year-length API,
# D-12), plus month-boundaries.csv and patro-summary.json from data/.
set -euo pipefail
cd "$(dirname "$0")/../.."

dotnet run --project tools/csharp-golden -- spec/vectors/csharp-golden

PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" --version >/dev/null 2>&1; then PYTHON=python; fi
"$PYTHON" tools/make_vectors.py
