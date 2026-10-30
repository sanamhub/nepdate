"""Tests for tools/package_status.py: the run walk, the two checks, the version in a job name and
the table."""
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from support import ROOT
import package_status

PORT = {
    "id": "rust",
    "name": "Rust",
    "repository": "sanamhub/nepdate-rust",
    "workflow": "verify-published.yml",
    "package": "nepdate",
}
RUNS = (
    "/repos/sanamhub/nepdate-rust/actions/workflows/verify-published.yml"
    f"/runs?event=schedule&per_page={package_status.RUNS_PER_PAGE}"
)
WEEKLY = {
    "id": 42,
    "conclusion": "success",
    "run_started_at": "2026-10-26T04:17:03Z",
    "html_url": "https://github.com/sanamhub/nepdate-rust/actions/runs/42",
}
DAILY = {
    "id": 43,
    "conclusion": "success",
    "run_started_at": "2026-10-29T03:07:02Z",
    "html_url": "https://github.com/sanamhub/nepdate-rust/actions/runs/43",
}


def jobs_path(run_id):
    return f"/repos/sanamhub/nepdate-rust/actions/runs/{run_id}/jobs?per_page=100"


def job(name, conclusion="success"):
    return {"name": name, "conclusion": conclusion}


def weekly_jobs(version="0.1.0-beta.1", result="success"):
    """The jobs of a weekly run: the install check ran, the registry check was skipped."""
    return [
        job("resolve the version"),
        job(f"weekly {version}", result),
        job(f"metadata {version}", "skipped"),
    ]


def daily_jobs(version="0.1.0-beta.1", result="success"):
    """The jobs of a daily run: the registry check ran, the install check was skipped."""
    return [
        job("resolve the version"),
        job(f"weekly {version}", "skipped"),
        job(f"metadata {version}", result),
    ]


class FakeApi:
    """Answers from a fixed map and records the paths it was asked for."""

    def __init__(self, pages):
        self.pages = pages
        self.calls = []

    def __call__(self, path):
        self.calls.append(path)
        if path in self.pages:
            return self.pages[path]
        raise LookupError(path)

    def job_reads(self):
        """The runs whose jobs were read, in the order they were read."""
        return [path.rsplit("/", 2)[1] for path in self.calls if "/jobs" in path]


def run_document(run_id=42, **overrides):
    run = dict(WEEKLY, id=run_id, html_url=f"https://github.com/sanamhub/nepdate-rust/actions/runs/{run_id}")
    run.update(overrides)
    return run


def api_with(runs=(), jobs=None):
    """A fake API serving the runs newest first and each run's jobs by id."""
    pages = {RUNS: {"workflow_runs": list(runs)}}
    for run in runs:
        if jobs and run["id"] in jobs:
            pages[jobs_path(run["id"])] = {"jobs": jobs[run["id"]]}
    return FakeApi(pages)


class StatusTest(unittest.TestCase):
    def test_the_newest_install_and_registry_checks_are_reported_separately(self):
        get = api_with([DAILY, WEEKLY], {43: daily_jobs(), 42: weekly_jobs()})
        entry = package_status.status_of(PORT, get)
        self.assertEqual(
            entry["install"],
            {
                "version": "0.1.0-beta.1",
                "result": "success",
                "checked": "2026-10-26",
                "run": "https://github.com/sanamhub/nepdate-rust/actions/runs/42",
            },
        )
        self.assertEqual(
            entry["registry"],
            {
                "version": "0.1.0-beta.1",
                "result": "success",
                "checked": "2026-10-29",
                "run": "https://github.com/sanamhub/nepdate-rust/actions/runs/43",
            },
        )
        self.assertEqual(get.job_reads(), ["43", "42"])

    def test_a_registry_check_without_an_install_check_is_not_checked(self):
        get = api_with([DAILY], {43: daily_jobs()})
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["registry"]["result"], "success")
        self.assertEqual(entry["install"], dict(package_status.NOT_CHECKED))

    def test_an_install_check_without_a_registry_check_is_not_checked(self):
        get = api_with([WEEKLY], {42: weekly_jobs()})
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["install"]["result"], "success")
        self.assertEqual(entry["registry"], dict(package_status.NOT_CHECKED))

    def test_a_run_whose_jobs_are_all_skipped_is_walked_past(self):
        quiet = run_document(44, run_started_at="2026-10-30T03:07:02Z")
        get = api_with(
            [quiet, DAILY],
            {
                44: [
                    job("resolve the version", "skipped"),
                    job("weekly 0.1.0-beta.1", "skipped"),
                    job("metadata 0.1.0-beta.1", "skipped"),
                ],
                43: daily_jobs(),
            },
        )
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["registry"]["run"], DAILY["html_url"])
        self.assertEqual(entry["install"], dict(package_status.NOT_CHECKED))
        self.assertEqual(get.job_reads(), ["44", "43"])

    def test_the_walk_stops_once_both_checks_are_found(self):
        older = run_document(41, run_started_at="2026-10-19T04:17:03Z")
        get = api_with(
            [DAILY, WEEKLY, older],
            {43: daily_jobs(), 42: weekly_jobs(), 41: weekly_jobs()},
        )
        package_status.status_of(PORT, get)
        self.assertNotIn("41", get.job_reads())

    def test_the_walk_ends_with_the_window_and_reports_not_checked(self):
        runs = [
            run_document(50 + index, run_started_at=f"2026-10-2{index}T03:07:02Z")
            for index in range(3)
        ]
        get = api_with(runs, {run["id"]: [job("verify 0.1.0-beta.1")] for run in runs})
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["install"], dict(package_status.NOT_CHECKED))
        self.assertEqual(entry["registry"], dict(package_status.NOT_CHECKED))
        self.assertEqual(len(get.job_reads()), 3)
        self.assertIn(RUNS, get.calls)

    def test_a_workflow_that_cannot_be_read_is_not_checked(self):
        entry = package_status.status_of(PORT, FakeApi({}))
        self.assertEqual(entry["install"]["result"], "not checked")

    def test_a_port_with_no_scheduled_run_is_not_checked(self):
        entry = package_status.status_of(PORT, api_with([]))
        self.assertEqual(entry["install"], dict(package_status.NOT_CHECKED))
        self.assertEqual(entry["registry"], dict(package_status.NOT_CHECKED))

    def test_a_failing_matrix_leg_fails_the_check(self):
        get = api_with(
            [WEEKLY],
            {
                42: [
                    job("resolve the version"),
                    job("weekly 0.1.0-beta.1 (npm)"),
                    job("weekly 0.1.0-beta.1 (pnpm)", "failure"),
                ]
            },
        )
        self.assertEqual(package_status.status_of(PORT, get)["install"]["result"], "failure")

    def test_a_platform_suffix_on_the_job_name_is_accepted(self):
        get = api_with([WEEKLY], {42: [job("weekly 0.1.0-beta.1 (macOS)")]})
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["install"]["version"], "0.1.0-beta.1")
        self.assertEqual(entry["install"]["result"], "success")

    def test_a_verify_job_is_neither_check(self):
        get = api_with([WEEKLY], {42: [job("verify 0.1.0-beta.1")]})
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["install"], dict(package_status.NOT_CHECKED))
        self.assertEqual(entry["registry"], dict(package_status.NOT_CHECKED))

    def test_a_run_without_a_start_time_uses_its_creation_time(self):
        run = run_document(42, run_started_at=None, created_at="2026-10-26T04:17:03Z")
        get = api_with([run], {42: weekly_jobs()})
        self.assertEqual(package_status.status_of(PORT, get)["install"]["checked"], "2026-10-26")

    def test_a_run_whose_jobs_are_not_readable_is_walked_past(self):
        get = api_with([DAILY, WEEKLY], {42: weekly_jobs()})
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["install"]["run"], WEEKLY["html_url"])
        self.assertEqual(entry["registry"], dict(package_status.NOT_CHECKED))


def check(**overrides):
    base = {
        "version": "0.1.0-beta.1",
        "result": "success",
        "checked": "2026-10-26",
        "run": "https://github.com/sanamhub/nepdate-rust/actions/runs/42",
    }
    base.update(overrides)
    return base


class TableTest(unittest.TestCase):
    def entry(self, install=None, registry=None):
        if install is None:
            install = check()
        if registry is None:
            registry = check(
                checked="2026-10-29",
                run="https://github.com/sanamhub/nepdate-rust/actions/runs/43",
            )
        return {"package": "nepdate", "name": "Rust", "install": install, "registry": registry}

    def test_both_checks_show_their_own_version_day_and_run(self):
        table = package_status.render_table([self.entry()])
        self.assertIn("| Package | Install | Registry |", table)
        self.assertIn("pass `0.1.0-beta.1` on 2026-10-26", table)
        self.assertIn("pass `0.1.0-beta.1` on 2026-10-29", table)
        self.assertIn("[run](https://github.com/sanamhub/nepdate-rust/actions/runs/42)", table)
        self.assertIn("[run](https://github.com/sanamhub/nepdate-rust/actions/runs/43)", table)

    def test_an_unchecked_install_never_shows_pass(self):
        table = package_status.render_table([self.entry(install=dict(package_status.NOT_CHECKED))])
        self.assertIn("| `nepdate` (Rust) | not checked | pass `0.1.0-beta.1` on 2026-10-29", table)
        self.assertIn("1 of 1 ports have no scheduled install check", table)
        self.assertNotIn("no scheduled registry check", table)

    def test_an_unchecked_registry_never_shows_pass(self):
        table = package_status.render_table([self.entry(registry=dict(package_status.NOT_CHECKED))])
        self.assertIn(
            "pass `0.1.0-beta.1` on 2026-10-26 ([run](https://github.com/sanamhub/nepdate-rust/actions/runs/42))"
            " | not checked |",
            table,
        )
        self.assertIn("1 of 1 ports have no scheduled registry check", table)
        self.assertNotIn("no scheduled install check", table)

    def test_a_port_with_neither_check_never_shows_pass(self):
        table = package_status.render_table(
            [self.entry(install=dict(package_status.NOT_CHECKED), registry=dict(package_status.NOT_CHECKED))]
        )
        self.assertIn("| `nepdate` (Rust) | not checked | not checked |", table)
        self.assertNotIn("pass", table)
        self.assertIn("1 of 1 ports have no scheduled install check", table)
        self.assertIn("1 of 1 ports have no scheduled registry check", table)


class ReportTest(unittest.TestCase):
    def test_the_report_keeps_the_spec_order_and_a_timestamp(self):
        spec = {"ports": [PORT, {**PORT, "id": "go", "name": "Go", "package": "nepdate-go"}]}
        get = api_with([DAILY, WEEKLY], {43: daily_jobs(), 42: weekly_jobs()})
        report = package_status.build_report(spec, get, datetime(2026, 10, 30, 12, 0, tzinfo=timezone.utc))
        self.assertEqual(report["checked_at"], "2026-10-30T12:00:00Z")
        self.assertEqual([port["id"] for port in report["ports"]], ["rust", "go"])
        self.assertEqual(report["ports"][0]["install"]["result"], "success")
        self.assertEqual(report["ports"][0]["registry"]["checked"], "2026-10-29")

    def test_the_spec_used_here_lists_every_released_port(self):
        spec = package_status.load_spec(ROOT / "spec" / "packages.json")
        self.assertEqual(
            [port["id"] for port in spec["ports"]],
            ["rust", "go", "typescript", "python", "swift", "kotlin", "cpp", "c"],
        )
        for port in spec["ports"]:
            self.assertTrue(port["packages"])
            self.assertTrue(port["install"])
            self.assertTrue(port["workflow"].endswith(".yml"))

    def test_a_port_without_a_required_field_is_rejected(self):
        spec = {"ports": [{"id": "rust", "name": "Rust"}]}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "packages.json"
            path.write_text(json.dumps(spec), encoding="utf-8")
            with self.assertRaises(ValueError):
                package_status.load_spec(path)


if __name__ == "__main__":
    unittest.main()
