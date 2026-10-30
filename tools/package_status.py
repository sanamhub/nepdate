"""Report the scheduled published-package checks of every port.

``spec/packages.json`` is the list of ports, their registries and their ``verify-published``
workflow. Each port checks its published package two ways on a schedule: a weekly install check,
run by the ``weekly`` job, and a daily registry check, run by the ``metadata`` job. For each port
this walks the workflow's scheduled runs newest first, reads a run's jobs until it has found the
newest run of each check, and writes one status entry: the package and both checks, each with the
version it checked, its result, the day it ran and the run's URL.

The two are kept apart because the newest run is usually only the registry check, so a broken
install would otherwise be hidden until the next weekly run. A check with no run in the window is
reported as ``not checked``, never as passing, so a missing schedule cannot look green.

    python tools/package_status.py
    python tools/package_status.py --json package-status.json --md package-status.md
    python tools/package_status.py --spec spec/packages.json

The API is read without a token, which is enough for public repositories and their rate limit.
When ``GITHUB_TOKEN`` is set it is sent as well, which raises the limit in CI.

The version comes from the job names of the run: every ``verify-published.yml`` names its check
jobs ``verify <version>``, ``weekly <version>`` and ``metadata <version>``, so the version a run
checked survives in the API without another artifact. A skipped job is not a check: it says the
other kind of scheduled run ran that day, so the walk goes on to an older run.
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
# The two checks: the status field, and the job kind whose run made it.
CHECKS = (("install", "weekly"), ("registry", "metadata"))
# How many scheduled runs to walk before a check counts as not checked.
RUNS_PER_PAGE = 20
NOT_CHECKED = {"version": None, "result": "not checked", "checked": None, "run": None}
# GitHub's conclusions, in the words the table uses.
RESULT_WORDS = {
    "success": "pass",
    "failure": "fail",
    "cancelled": "cancelled",
    "timed_out": "timed out",
    "skipped": "skipped",
    "startup_failure": "failed to start",
    "in_progress": "running",
}
# The order a run's jobs are compared in: the worst one speaks for the check.
RESULT_ORDER = {
    "success": 0,
    "queued": 1,
    "in_progress": 2,
    "cancelled": 3,
    "failure": 4,
    "timed_out": 5,
    "startup_failure": 6,
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


def scheduled_runs(
    port: dict[str, Any], get: Fetcher, per_page: int = RUNS_PER_PAGE
) -> list[dict[str, Any]]:
    """Return the scheduled runs of a port's workflow, newest first.

    Args:
        port: One entry of ``spec/packages.json``.
        get: The API reader.
        per_page: How many runs to ask for; the walk ends with this window.

    Returns:
        The run documents, newest first; empty when the workflow never ran on a schedule.
    """
    path = (
        f"/repos/{port['repository']}/actions/workflows/{port['workflow']}"
        f"/runs?event=schedule&per_page={per_page}"
    )
    try:
        document = get(path)
    except LookupError:
        return []
    return document.get("workflow_runs") or []


def jobs_of(port: dict[str, Any], run: dict[str, Any], get: Fetcher) -> list[dict[str, Any]]:
    """Return the jobs of one run.

    Args:
        port: One entry of ``spec/packages.json``.
        run: The run document.
        get: The API reader.

    Returns:
        The run's jobs, or none when they are not readable, which leaves the check to an older
        run rather than reporting a result the jobs cannot support.
    """
    try:
        document = get(f"/repos/{port['repository']}/actions/runs/{run['id']}/jobs?per_page=100")
    except LookupError:
        return []
    return document.get("jobs") or []


def worst_result(results: list[str]) -> str:
    """Return the result that speaks for a check made of several jobs.

    Args:
        results: One conclusion or status per job of the check.

    Returns:
        The worst of them, so one failing matrix leg fails the check.
    """
    return max(results, key=lambda result: RESULT_ORDER.get(result, RESULT_ORDER["failure"]))


def check_from_run(
    run: dict[str, Any], jobs: list[dict[str, Any]], kind: str
) -> dict[str, Any] | None:
    """Build one check from a run, or None when that check did not run.

    Args:
        run: The run document.
        jobs: The run's jobs.
        kind: ``weekly`` for the install check, ``metadata`` for the registry check.

    Returns:
        The check with its version, result, day and run URL, or None when no job of that kind
        ran, which is how a skipped job and a run of the other check are left out.
    """
    ran = []
    for job in jobs:
        if job.get("conclusion") == "skipped":
            continue
        matched = VERSIONED_JOB.match(job.get("name") or "")
        if matched and matched.group(1) == kind:
            ran.append((matched.group(2), job.get("conclusion") or job.get("status") or "failure"))
    if not ran:
        return None
    return {
        "version": ran[0][0],
        "result": worst_result([result for _, result in ran]),
        "checked": run_date(run),
        "run": run.get("html_url"),
    }


def run_date(run: dict[str, Any]) -> str:
    """Return the day a run started, in ISO form.

    Args:
        run: The run document.

    Returns:
        ``YYYY-MM-DD``, or an empty string when the API has no timestamp.
    """
    stamp = run.get("run_started_at") or run.get("created_at") or ""
    return stamp[:10]


def status_of(port: dict[str, Any], get: Fetcher, per_page: int = RUNS_PER_PAGE) -> dict[str, Any]:
    """Build the status entry of one port.

    Args:
        port: One entry of ``spec/packages.json``.
        get: The API reader.
        per_page: How many scheduled runs to walk at most.

    Returns:
        The entry written to the status file: the port and one object per check.
    """
    entry = {
        "id": port["id"],
        "name": port["name"],
        "package": port["package"],
        "repository": port["repository"],
        "workflow": port["workflow"],
        "install": dict(NOT_CHECKED),
        "registry": dict(NOT_CHECKED),
    }
    missing = {field: kind for field, kind in CHECKS}
    for run in scheduled_runs(port, get, per_page):
        jobs = jobs_of(port, run, get)
        for field, kind in list(missing.items()):
            check = check_from_run(run, jobs, kind)
            if check is not None:
                entry[field] = check
                del missing[field]
        if not missing:
            break
    return entry


def result_word(result: str) -> str:
    """Translate a GitHub conclusion into the table's word.

    Args:
        result: The conclusion, or ``not checked``.

    Returns:
        The word the table shows.
    """
    return RESULT_WORDS.get(result, result)


def check_cell(check: dict[str, Any]) -> str:
    """Write one check as a table cell.

    Args:
        check: One check of a status entry.

    Returns:
        The result with the version, the day and the run link, or ``not checked``.
    """
    if check.get("result") == "not checked":
        return "not checked"
    parts = [result_word(check.get("result") or "unknown")]
    if check.get("version"):
        parts.append(f"`{check['version']}`")
    if check.get("checked"):
        parts.append(f"on {check['checked']}")
    cell = " ".join(parts)
    if check.get("run"):
        cell += f" ([run]({check['run']}))"
    return cell


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
        "The newest scheduled install check (`weekly`) and registry check (`metadata`) of each"
        " port's `verify-published` workflow.",
        "",
        "| Package | Install | Registry |",
        "| --- | --- | --- |",
    ]
    for entry in entries:
        lines.append(
            f"| `{entry['package']}` ({entry['name']}) | "
            f"{check_cell(entry['install'])} | {check_cell(entry['registry'])} |"
        )
    for field, _kind in CHECKS:
        unchecked = sum(1 for entry in entries if entry[field]["result"] == "not checked")
        if unchecked:
            lines += [
                "",
                f"{unchecked} of {len(entries)} ports have no scheduled {field} check, so they are"
                " not checked.",
            ]
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
        description="Report the scheduled install and registry checks of every port.",
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
