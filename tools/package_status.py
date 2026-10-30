"""Report the last scheduled published-package check of every port.

``spec/packages.json`` is the list of ports, their registries and their ``verify-published``
workflow. For each port this asks the public GitHub API for the newest scheduled run of that
workflow and writes one status entry: the package, the version that run checked, its result, the
day it ran and the run's URL. A port that has never run the workflow on a schedule is reported as
``not checked``, never as passing, so a missing schedule cannot look green.

    python tools/package_status.py
    python tools/package_status.py --json package-status.json --md package-status.md
    python tools/package_status.py --spec spec/packages.json

The API is read without a token, which is enough for public repositories and their rate limit.
When ``GITHUB_TOKEN`` is set it is sent as well, which raises the limit in CI.

The version comes from the job names of the run: every ``verify-published.yml`` names its check
jobs ``verify <version>``, ``weekly <version>`` and ``metadata <version>``, so the version a run
checked survives in the API without another artifact. A skipped job is ignored.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "spec" / "packages.json"
API = "https://api.github.com"
USER_AGENT = "nepdate-package-status"
VERSIONED_JOB = re.compile(r"^(verify|weekly|metadata) (\S+)(?: \(.*\))?$")
# GitHub's conclusions, in the words the table uses.
RESULT_WORDS = {
    "success": "pass",
    "failure": "fail",
    "cancelled": "cancelled",
    "timed_out": "timed out",
    "skipped": "skipped",
    "startup_failure": "failed to start",
}

Fetcher = Callable[[str], Any]


def load_spec(path: Path) -> dict[str, Any]:
    """Read and check the port list.

    Args:
        path: The packages file.

    Returns:
        The parsed document.

    Raises:
        ValueError: A port entry is missing a field the report needs.
    """
    document = json.loads(path.read_text(encoding="utf-8"))
    ports = document.get("ports")
    if not isinstance(ports, list) or not ports:
        raise ValueError(f"{path} has no ports")
    required = ("id", "name", "repository", "workflow", "package")
    for port in ports:
        missing = [field for field in required if not port.get(field)]
        if missing:
            raise ValueError(f"{path}: port {port.get('id', '?')} is missing {', '.join(missing)}")
    return document


def api_getter(token: str | None, api: str = API) -> Fetcher:
    """Return a function that gets one JSON document from the GitHub API.

    Args:
        token: A token to send, or None to read without one.
        api: The API origin.

    Returns:
        A callable that takes a path below the origin.
    """

    def get(path: str) -> Any:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": USER_AGENT,
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = urllib.request.Request(f"{api}{path}", headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                raise LookupError(path) from exc
            detail = exc.read().decode("utf-8", "replace")[:300]
            raise RuntimeError(f"GitHub API answered {exc.code} for {path}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"GitHub API is unreachable: {exc.reason}") from exc

    return get


def latest_scheduled_run(port: dict[str, Any], get: Fetcher) -> dict[str, Any] | None:
    """Return the newest scheduled run of a port's workflow, or None.

    Args:
        port: One entry of ``spec/packages.json``.
        get: The API reader.

    Returns:
        The run document, or None when the workflow has never run on a schedule.
    """
    path = (
        f"/repos/{port['repository']}/actions/workflows/{port['workflow']}"
        "/runs?event=schedule&per_page=1"
    )
    try:
        document = get(path)
    except LookupError:
        return None
    runs = document.get("workflow_runs") or []
    return runs[0] if runs else None


def version_from_jobs(jobs: list[dict[str, Any]]) -> tuple[str, str]:
    """Read the version and the kind of check from the job names of a run.

    Args:
        jobs: The run's jobs.

    Returns:
        The kind (``verify``, ``weekly`` or ``metadata``) and the version, or ``unknown`` twice
        when no job carries one.
    """
    for job in jobs:
        if job.get("conclusion") == "skipped":
            continue
        found = VERSIONED_JOB.match(job.get("name") or "")
        if found:
            return found.group(1), found.group(2)
    return "unknown", "unknown"


def run_date(run: dict[str, Any]) -> str:
    """Return the day a run started, in ISO form.

    Args:
        run: The run document.

    Returns:
        ``YYYY-MM-DD``, or an empty string when the API has no timestamp.
    """
    stamp = run.get("run_started_at") or run.get("created_at") or ""
    return stamp[:10]


def status_of(port: dict[str, Any], get: Fetcher) -> dict[str, Any]:
    """Build the status entry of one port.

    Args:
        port: One entry of ``spec/packages.json``.
        get: The API reader.

    Returns:
        The entry written to the status file.
    """
    entry = {
        "id": port["id"],
        "name": port["name"],
        "package": port["package"],
        "repository": port["repository"],
        "workflow": port["workflow"],
        "version": None,
        "result": "not checked",
        "check": None,
        "checked": None,
        "run": None,
    }
    run = latest_scheduled_run(port, get)
    if run is None:
        return entry
    try:
        jobs = get(f"/repos/{port['repository']}/actions/runs/{run['id']}/jobs?per_page=100")
    except LookupError:
        # The run is there but its jobs are not readable; the result is still worth reporting.
        jobs = {}
    check, version = version_from_jobs(jobs.get("jobs") or [])
    entry.update(
        version=None if version == "unknown" else version,
        result=run.get("conclusion") or run.get("status") or "unknown",
        check=None if check == "unknown" else check,
        checked=run_date(run),
        run=run.get("html_url"),
    )
    return entry


def result_word(result: str) -> str:
    """Translate a GitHub conclusion into the table's word.

    Args:
        result: The conclusion, or ``not checked``.

    Returns:
        The word the table shows.
    """
    return RESULT_WORDS.get(result, result)


def render_table(entries: list[dict[str, Any]]) -> str:
    """Render the status entries as one Markdown table.

    Args:
        entries: The status entries, in the order of ``spec/packages.json``.

    Returns:
        A Markdown document ending with a newline.
    """
    lines = [
        "## Published packages",
        "",
        "The newest scheduled check of each port's `verify-published` workflow.",
        "",
        "| Package | Version | Result | Checked | Run |",
        "| --- | --- | --- | --- | --- |",
    ]
    for entry in entries:
        version = f"`{entry['version']}`" if entry["version"] else ""
        checked = entry["checked"] or ""
        run = f"[run]({entry['run']})" if entry["run"] else ""
        lines.append(
            f"| `{entry['package']}` ({entry['name']}) | {version} | "
            f"{result_word(entry['result'])} | {checked} | {run} |"
        )
    unchecked = sum(1 for entry in entries if entry["result"] == "not checked")
    if unchecked:
        lines += ["", f"{unchecked} of {len(entries)} ports have no scheduled run yet, so they are not checked."]
    return "\n".join(lines) + "\n"


def build_report(spec: dict[str, Any], get: Fetcher, now: datetime | None = None) -> dict[str, Any]:
    """Collect the status of every port.

    Args:
        spec: The parsed ``spec/packages.json``.
        get: The API reader.
        now: The time the report is made; the current time when None.

    Returns:
        The document written to the status file.
    """
    moment = now or datetime.now(timezone.utc)
    return {
        "checked_at": moment.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ports": [status_of(port, get) for port in spec["ports"]],
    }


def main(argv: list[str] | None = None) -> int:
    """Parse the arguments, read the API and write the two files.

    Args:
        argv: The command line arguments; ``sys.argv[1:]`` when None.

    Returns:
        0 when the report was written, 1 when the API or a file failed.
    """
    parser = argparse.ArgumentParser(
        description="Report the last scheduled verify-published run of every port.",
        epilog="GITHUB_TOKEN raises the API rate limit when it is set in the environment.",
    )
    parser.add_argument("--spec", type=Path, default=SPEC, help="the port list")
    parser.add_argument("--json", type=Path, default=Path("package-status.json"), help="the status file")
    parser.add_argument("--md", default="-", help="the Markdown table, with - for stdout")
    parser.add_argument("--api", default=API, help="the GitHub API origin")
    args = parser.parse_args(argv)

    try:
        spec = load_spec(args.spec)
        get = api_getter(os.environ.get("GITHUB_TOKEN") or None, args.api)
        report = build_report(spec, get)
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"package-status: {exc}", file=sys.stderr)
        return 1

    table = render_table(report["ports"])
    args.json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if args.md == "-":
        sys.stdout.write(table)
    else:
        Path(args.md).write_text(table, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
