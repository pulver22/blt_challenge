#!/usr/bin/env python3
"""Automated smoke test script for BLT benchmark backend and evo evaluation pipeline."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GT = ROOT / "groundtruth" / "official_tum.txt"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8017")
    parser.add_argument("--admin-token", default="change-me-dev")
    parser.add_argument("--ground-truth", type=Path, default=DEFAULT_GT)
    parser.add_argument("--trajectory", type=Path, required=True, help="Path to TUM trajectory text file")
    parser.add_argument("--timeout-seconds", type=float, default=120.0)
    args = parser.parse_args()

    if not args.trajectory.exists():
        print(f"Error: Trajectory file does not exist: {args.trajectory}", file=sys.stderr)
        return 1

    with httpx.Client(base_url=args.base_url, timeout=30.0) as client:
        assert_backend_ready(client, args.admin_token)
        submission = submit_trajectory(client, args.trajectory)
        completed = wait_for_evo(client, submission["id"], submission["token"], args.timeout_seconds)
        leaderboard_row = assert_leaderboard_updated(client, submission["id"])

    print("Smoke test passed successfully!")
    print(f"  submission: {submission['id']}")
    print(f"  status: {completed['status']}")
    print(f"  ATE RMSE: {leaderboard_row['ate_rmse']}")
    print(f"  RPE RMSE: {leaderboard_row['rpe_rmse']}")
    print(f"  alignment: {leaderboard_row['alignment']}")
    return 0


def assert_backend_ready(client: httpx.Client, admin_token: str) -> None:
    response = client.get("/api/admin/health", headers={"X-Admin-Token": admin_token})
    response.raise_for_status()
    health = response.json()
    if not health["ground_truth_available"]:
        print("Warning: Ground truth file is not available on backend.")
    if not health["evo_available"]:
        print("Warning: evo CLI binaries (evo_ape, evo_rpe) are not on system PATH.")


def submit_trajectory(client: httpx.Client, trajectory: Path) -> dict:
    with trajectory.open("rb") as handle:
        response = client.post(
            "/api/submissions",
            data={
                "contact_email": "smoke-test@example.org",
                "team": "Automated Smoke Test",
                "method": "LIO-SAM Baseline",
                "category": "lidar",
                "training_runs": "Public BLT runs",
                "link": "",
                "notes": "Automated pipeline smoke submission.",
            },
            files={"trajectory": (trajectory.name, handle, "text/plain")},
        )
    response.raise_for_status()
    return response.json()


def wait_for_evo(client: httpx.Client, submission_id: str, token: str, timeout_seconds: float) -> dict:
    deadline = time.monotonic() + timeout_seconds
    last_payload: dict | None = None
    while time.monotonic() < deadline:
        response = client.get(f"/api/submissions/{submission_id}", params={"token": token})
        response.raise_for_status()
        last_payload = response.json()
        if last_payload["status"] in ("published", "pending_review") and last_payload["result"]:
            return last_payload
        if last_payload["status"].startswith("failed"):
            raise SystemExit(f"Submission failed: {last_payload}")
        time.sleep(1.0)
    raise SystemExit(f"Timed out waiting for evo evaluation. Last status: {last_payload}")


def assert_leaderboard_updated(client: httpx.Client, submission_id: str) -> dict:
    response = client.get("/api/leaderboards")
    response.raise_for_status()
    leaderboards = response.json()
    for row in leaderboards["lidar"]:
        if row["submission_id"] == submission_id:
            return row
    raise SystemExit(f"Submission {submission_id} was not found in the LiDAR leaderboard.")


if __name__ == "__main__":
    sys.exit(main())
