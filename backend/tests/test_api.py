from pathlib import Path

from fastapi.testclient import TestClient

from backend.app import create_app
from backend.config import Settings


def make_client(tmp_path: Path) -> TestClient:
    settings = Settings(
        database_path=tmp_path / "app.db",
        data_dir=tmp_path / "data",
        ground_truth_path=tmp_path / "groundtruth.txt",
        admin_token="admin-token",
        app_version="test",
    )
    settings.ground_truth_path.write_text(
        "1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n",
        encoding="utf-8",
    )
    app = create_app(settings=settings, start_worker=False)
    return TestClient(app)


def test_submission_flow_returns_private_status_and_pending_review_result(tmp_path: Path):
    client = make_client(tmp_path)
    invite_response = client.post(
        "/api/admin/invites",
        headers={"X-Admin-Token": "admin-token"},
        json={"team_label": "Lincoln Robotics"},
    )
    invite_code = invite_response.json()["code"]

    response = client.post(
        "/api/submissions",
        data={
            "invite_code": invite_code,
            "contact_email": "team@example.org",
            "team": "Lincoln Robotics",
            "method": "SummerGraph",
            "category": "lidar",
            "training_runs": "Spring",
            "link": "https://example.org",
            "notes": "beta",
        },
        files={"trajectory": ("trajectory.txt", b"1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["status"] == "queued"
    assert payload["status_url"].startswith("/submissions/")

    app_store = client.app.state.store
    app_store.record_result(payload["id"], ate_rmse=0.18, rpe_rmse=0.04, alignment="se3", artifact_path="/tmp/evo")
    app_store.update_submission_status(payload["id"], "pending_review")

    status_response = client.get(f"/api/submissions/{payload['id']}?token={payload['token']}")

    assert status_response.status_code == 200
    assert status_response.json()["result"]["ate_rmse"] == 0.18


def test_rejects_invalid_invite_and_non_tum_uploads(tmp_path: Path):
    client = make_client(tmp_path)

    bad_invite = client.post(
        "/api/submissions",
        data={
            "invite_code": "bad",
            "contact_email": "team@example.org",
            "team": "Lincoln Robotics",
            "method": "SummerGraph",
            "category": "lidar",
        },
        files={"trajectory": ("trajectory.txt", b"1000.000 0 0 0 0 0 0 1\n")},
    )
    assert bad_invite.status_code == 403

    invite_response = client.post(
        "/api/admin/invites",
        headers={"X-Admin-Token": "admin-token"},
        json={"team_label": "Lincoln Robotics"},
    )
    invite_code = invite_response.json()["code"]
    wrong_format = client.post(
        "/api/submissions",
        data={
            "invite_code": invite_code,
            "contact_email": "team@example.org",
            "team": "Lincoln Robotics",
            "method": "SummerGraph",
            "category": "lidar",
        },
        files={"trajectory": ("trajectory.csv", b"timestamp,x,y,z\n")},
    )

    assert wrong_format.status_code == 400
    assert "TUM .txt" in wrong_format.json()["detail"]


def test_admin_can_publish_and_leaderboard_is_public(tmp_path: Path):
    client = make_client(tmp_path)
    invite_response = client.post(
        "/api/admin/invites",
        headers={"X-Admin-Token": "admin-token"},
        json={"team_label": "RowMapper"},
    )
    submission = client.post(
        "/api/submissions",
        data={
            "invite_code": invite_response.json()["code"],
            "contact_email": "team@example.org",
            "team": "RowMapper",
            "method": "ICP Rows",
            "category": "lidar",
        },
        files={"trajectory": ("trajectory.txt", b"1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n")},
    ).json()

    store = client.app.state.store
    store.record_result(submission["id"], ate_rmse=0.12, rpe_rmse=0.03, alignment="se3", artifact_path="/tmp/evo")
    store.update_submission_status(submission["id"], "pending_review")

    publish = client.post(
        f"/api/admin/submissions/{submission['id']}/publish",
        headers={"X-Admin-Token": "admin-token"},
    )
    leaderboard = client.get("/api/leaderboards")

    assert publish.status_code == 200
    assert leaderboard.json()["lidar"][0]["team"] == "RowMapper"
    assert leaderboard.json()["lidar"][0]["ate_rmse"] == 0.12
