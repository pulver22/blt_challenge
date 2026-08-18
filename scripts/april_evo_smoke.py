#!/usr/bin/env python3
"""Submit the April LIO-SAM fixture to a running BLT backend and publish it."""

from __future__ import annotations

import argparse
import shutil
import sys
import time
from pathlib import Path

import httpx


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GT = ROOT / "groundtruth" / "official_tum.txt"
DEFAULT_TRAJECTORY = ROOT / "var" / "fixtures" / "april" / "LIO-SAM_ktima_april.tum.tum"
DEFAULT_SOURCE_GT = Path(
    "/Users/rpolvara/Desktop/row5/results/ktima_april/"
    "traj_ktima_april_ktima_april_results_lio_ape/GPS.tum.tum",
)
DEFAULT_SOURCE_TRAJECTORY = Path(
    "/Users/rpolvara/Desktop/row5/results/ktima_april/"
    "traj_ktima_april_ktima_april_results_lio_ape/LIO-SAM_ktima_april.tum.tum",
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8017")
    parser.add_argument("--admin-token", default="change-me-dev")
    parser.add_argument("--ground-truth", type=Path, default=DEFAULT_GT)
    parser.add_argument("--trajectory", type=Path, default=DEFAULT_TRAJECTORY)
    parser.add_argument("--source-ground-truth", type=Path, default=DEFAULT_SOURCE_GT)
    parser.add_argument("--source-trajectory", type=Path, default=DEFAULT_SOURCE_TRAJECTORY)
    parser.add_argument("--timeout-seconds", type=float, default=120.0)
    args = parser.parse_args()

    ensure_fixture(args.ground_truth, args.source_ground_truth, "ground truth")
    ensure_fixture(args.trajectory, args.source_trajectory, "trajectory")

    with httpx.Client(base_url=args.base_url, timeout=30.0) as client:
        assert_backend_ready(client, args.admin_token)
        invite_code = create_invite(client, args.admin_token)
        submission = submit_trajectory(client, invite_code, args.trajectory)
        completed = wait_for_evo(client, submission["id"], submission["token"], args.timeout_seconds)
        publish(client, args.admin_token, submission["id"])
        leaderboard_row = assert_leaderboard_updated(client, submission["id"])

    print("April evo smoke passed")
    print(f"  submission: {submission['id']}")
    print(f"  status: {completed['status']}")
    print(f"  ATE RMSE: {leaderboard_row['ate_rmse']}")
    print(f"  RPE RMSE: {leaderboard_row['rpe_rmse']}")
    print(f"  alignment: {leaderboard_row['alignment']}")
    return 0


def ensure_fixture(target: Path, source: Path, label: str) -> None:
    if target.exists():
        return
    if not source.exists():
        raise SystemExit(
            f"Missing {label}: {target}. Copy it there or pass --source-{label.replace(' ', '-')}."
        )
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)


def assert_backend_ready(client: httpx.Client, admin_token: str) -> None:
    response = client.get("/api/admin/health", headers={"X-Admin-Token": admin_token})
    response.raise_for_status()
    health = response.json()
    if not health["ground_truth_available"]:
        raise SystemExit("Backend does not see the configured ground truth file.")
    if not health["evo_available"]:
        raise SystemExit("Backend does not have evo_ape and evo_rpe on PATH.")


def create_invite(client: httpx.Client, admin_token: str) -> str:
    response = client.post(
        "/api/admin/invites",
        headers={"X-Admin-Token": admin_token},
        json={"team_label": "April Smoke Test"},
    )
    response.raise_for_status()
    return response.json()["code"]


def submit_trajectory(client: httpx.Client, invite_code: str, trajectory: Path) -> dict:
    with trajectory.open("rb") as handle:
        response = client.post(
            "/api/submissions",
            data={
                "invite_code": invite_code,
                "contact_email": "april-smoke@example.invalid",
                "team": "April Smoke Test",
                "method": "LIO-SAM ktima_april",
                "category": "lidar",
                "training_runs": "April local fixture",
                "link": "",
                "notes": "Local smoke submission for evo pipeline validation.",
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
        if last_payload["status"] == "pending_review" and last_payload["result"]:
            return last_payload
        if last_payload["status"].startswith("failed"):
            raise SystemExit(f"Submission failed: {last_payload}")
        time.sleep(1.0)
    raise SystemExit(f"Timed out waiting for evo. Last status: {last_payload}")


def publish(client: httpx.Client, admin_token: str, submission_id: str) -> None:
    response = client.post(
        f"/api/admin/submissions/{submission_id}/publish",
        headers={"X-Admin-Token": admin_token},
    )
    response.raise_for_status()


def assert_leaderboard_updated(client: httpx.Client, submission_id: str) -> dict:
    response = client.get("/api/leaderboards")
    response.raise_for_status()
    leaderboards = response.json()
    for row in leaderboards["lidar"]:
        if row["submission_id"] == submission_id:
            return row
    raise SystemExit(f"Published submission {submission_id} was not found in the LiDAR leaderboard.")


if __name__ == "__main__":
    sys.exit(main())
