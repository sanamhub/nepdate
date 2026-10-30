"""Tests for tools/package_status.py: the run lookup, the version in a job name and the table."""
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
    "/runs?event=schedule&per_page=1"
)


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


def run_document(**overrides):
    run = {
        "id": 42,
        "conclusion": "success",
        "run_started_at": "2026-10-26T04:17:03Z",
        "html_url": "https://github.com/sanamhub/nepdate-rust/actions/runs/42",
    }
    run.update(overrides)
    return run


def api_with_run(jobs, run=None):
    run = run or run_document()
    return FakeApi(
        {
            RUNS: {"workflow_runs": [run]},
            "/repos/sanamhub/nepdate-rust/actions/runs/42/jobs?per_page=100": {"jobs": jobs},
        }
    )


class StatusTest(unittest.TestCase):
    def test_a_successful_weekly_run_reports_its_version_and_day(self):
        get = api_with_run(
            [
                {"name": "resolve the version", "conclusion": "success"},
                {"name": "weekly 0.1.0-beta.1", "conclusion": "success"},
                {"name": "metadata 0.1.0-beta.1", "conclusion": "skipped"},
            ]
        )
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["version"], "0.1.0-beta.1")
        self.assertEqual(entry["result"], "success")
        self.assertEqual(entry["check"], "weekly")
        self.assertEqual(entry["checked"], "2026-10-26")
        self.assertEqual(entry["run"], "https://github.com/sanamhub/nepdate-rust/actions/runs/42")

    def test_a_port_with_no_scheduled_run_is_not_checked(self):
        entry = package_status.status_of(PORT, FakeApi({}))
        self.assertEqual(entry["result"], "not checked")
        self.assertIsNone(entry["version"])
        self.assertIsNone(entry["checked"])
        self.assertIsNone(entry["run"])

    def test_a_missing_workflow_is_not_checked(self):
        entry = package_status.status_of(PORT, FakeApi({}))
        self.assertEqual(entry["result"], "not checked")

    def test_a_skipped_verify_job_is_ignored(self):
        get = api_with_run(
            [
                {"name": "verify 0.1.0-beta.1", "conclusion": "skipped"},
                {"name": "metadata 0.1.0-beta.1", "conclusion": "success"},
            ]
        )
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["check"], "metadata")

    def test_a_platform_suffix_on_the_job_name_is_accepted(self):
        get = api_with_run([{"name": "verify 0.1.0-beta.1 (macOS)", "conclusion": "success"}])
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["version"], "0.1.0-beta.1")
        self.assertEqual(entry["check"], "verify")

    def test_a_failing_run_keeps_the_conclusion(self):
        get = api_with_run(
            [{"name": "weekly 0.1.0-beta.1", "conclusion": "failure"}],
            run_document(conclusion="failure"),
        )
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["result"], "failure")

    def test_a_run_without_a_versioned_job_still_reports_its_result(self):
        get = api_with_run([{"name": "verify-published", "conclusion": "success"}])
        entry = package_status.status_of(PORT, get)
        self.assertIsNone(entry["version"])
        self.assertIsNone(entry["check"])
        self.assertEqual(entry["result"], "success")

    def test_a_run_without_a_start_time_uses_its_creation_time(self):
        run = run_document(run_started_at=None, created_at="2026-10-26T04:17:03Z")
        get = api_with_run([{"name": "weekly 0.1.0-beta.1", "conclusion": "success"}], run)
        self.assertEqual(package_status.status_of(PORT, get)["checked"], "2026-10-26")

    def test_a_run_whose_jobs_are_not_readable_still_reports_its_result(self):
        get = FakeApi({RUNS: {"workflow_runs": [run_document()]}})
        entry = package_status.status_of(PORT, get)
        self.assertEqual(entry["result"], "success")
        self.assertIsNone(entry["version"])


class TableTest(unittest.TestCase):
    def entry(self, **overrides):
        base = {
            "package": "nepdate",
            "name": "Rust",
            "version": "0.1.0-beta.1",
            "result": "success",
            "checked": "2026-10-26",
            "run": "https://github.com/sanamhub/nepdate-rust/actions/runs/42",
        }
        base.update(overrides)
        return base

    def test_a_passing_port_shows_pass_and_the_run_link(self):
        table = package_status.render_table([self.entry()])
        self.assertIn("| `nepdate` (Rust) | `0.1.0-beta.1` | pass | 2026-10-26 |", table)
        self.assertIn("[run](https://github.com/sanamhub/nepdate-rust/actions/runs/42)", table)

    def test_an_unchecked_port_never_shows_pass(self):
        table = package_status.render_table(
            [self.entry(version=None, result="not checked", checked=None, run=None)]
        )
        self.assertIn("not checked", table)
        self.assertNotIn("pass", table)
        self.assertIn("1 of 1 ports have no scheduled run yet", table)


class ReportTest(unittest.TestCase):
    def test_the_report_keeps_the_spec_order_and_a_timestamp(self):
        spec = {"ports": [PORT, {**PORT, "id": "go", "name": "Go", "package": "nepdate-go"}]}
        get = api_with_run([{"name": "weekly 0.1.0-beta.1", "conclusion": "success"}])
        report = package_status.build_report(spec, get, datetime(2026, 10, 30, 12, 0, tzinfo=timezone.utc))
        self.assertEqual(report["checked_at"], "2026-10-30T12:00:00Z")
        self.assertEqual([port["id"] for port in report["ports"]], ["rust", "go"])

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
        import json
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "packages.json"
            path.write_text(json.dumps(spec), encoding="utf-8")
            with self.assertRaises(ValueError):
                package_status.load_spec(path)


if __name__ == "__main__":
    unittest.main()
