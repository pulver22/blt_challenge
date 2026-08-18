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
        ip_rate_limit_per_hour=5,
    )
    settings.ground_truth_path.write_text(
        "1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n",
        encoding="utf-8",
    )
    app = create_app(settings=settings, start_worker=False)
    return TestClient(app)


def test_submission_flow_returns_private_status_and_auto_published_result(tmp_path: Path):
    client = make_client(tmp_path)

    response = client.post(
        "/api/submissions",
        data={
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
    assert status_response.json()["publication_state"] == "published"


def test_rejects_non_tum_uploads(tmp_path: Path):
    client = make_client(tmp_path)

    wrong_format = client.post(
        "/api/submissions",
        data={
            "contact_email": "team@example.org",
            "team": "Lincoln Robotics",
            "method": "SummerGraph",
            "category": "lidar",
        },
        files={"trajectory": ("trajectory.csv", b"timestamp,x,y,z\n")},
    )

    assert wrong_format.status_code == 400
    assert "TUM text" in wrong_format.json()["detail"]


def test_accepts_common_tum_text_extensions(tmp_path: Path):
    client = make_client(tmp_path)

    response = client.post(
        "/api/submissions",
        data={
            "contact_email": "team@example.org",
            "team": "April LiDAR",
            "method": "LIO-SAM",
            "category": "lidar",
        },
        files={
            "trajectory": (
                "LIO-SAM_ktima_april.tum.tum",
                b"1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n",
            ),
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "queued"


def test_ip_rate_limit_exceeded_returns_429(tmp_path: Path):
    client = make_client(tmp_path)

    for i in range(5):
        res = client.post(
            "/api/submissions",
            data={
                "contact_email": f"user{i}@example.org",
                "team": "Lincoln Robotics",
                "method": "SummerGraph",
                "category": "lidar",
            },
            files={"trajectory": ("trajectory.txt", b"1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n")},
        )
        assert res.status_code == 201

    sixth_res = client.post(
        "/api/submissions",
        data={
            "contact_email": "user6@example.org",
            "team": "Lincoln Robotics",
            "method": "SummerGraph",
            "category": "lidar",
        },
        files={"trajectory": ("trajectory.txt", b"1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n")},
    )
    assert sixth_res.status_code == 429
    assert "rate limit exceeded" in sixth_res.json()["detail"].lower()


def test_admin_system_freeze_blocks_submissions(tmp_path: Path):
    client = make_client(tmp_path)

    # Freeze system
    freeze_res = client.post(
        "/api/admin/system/settings",
        headers={"X-Admin-Token": "admin-token"},
        json={"key": "submissions_frozen", "value": "true"},
    )
    assert freeze_res.status_code == 200

    sub_res = client.post(
        "/api/submissions",
        data={
            "contact_email": "blocked@example.org",
            "team": "Lincoln Robotics",
            "method": "SummerGraph",
            "category": "lidar",
        },
        files={"trajectory": ("trajectory.txt", b"1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n")},
    )
    assert sub_res.status_code == 503
    assert "paused" in sub_res.json()["detail"].lower()


def test_admin_blacklist_blocks_email(tmp_path: Path):
    client = make_client(tmp_path)

    # Add email to blacklist
    bl_res = client.post(
        "/api/admin/blacklist",
        headers={"X-Admin-Token": "admin-token"},
        json={"entry_type": "email", "value": "spammer@example.org", "reason": "Spam activity"},
    )
    assert bl_res.status_code == 200

    sub_res = client.post(
        "/api/submissions",
        data={
            "contact_email": "spammer@example.org",
            "team": "Spam Team",
            "method": "Spam SLAM",
            "category": "lidar",
        },
        files={"trajectory": ("trajectory.txt", b"1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n")},
    )
    assert sub_res.status_code == 403
    assert "blacklisted" in sub_res.json()["detail"].lower()


def test_admin_retry_delete_and_csv_export(tmp_path: Path):
    client = make_client(tmp_path)

    sub_res = client.post(
        "/api/submissions",
        data={
            "contact_email": "team@example.org",
            "team": "Lincoln Robotics",
            "method": "SummerGraph",
            "category": "lidar",
        },
        files={"trajectory": ("trajectory.txt", b"1000.000 0 0 0 0 0 0 1\n1000.050 0.1 0 0 0 0 0 1\n")},
    )
    sub_id = sub_res.json()["id"]

    # Test baseline toggle
    base_res = client.post(
        f"/api/admin/submissions/{sub_id}/baseline",
        headers={"X-Admin-Token": "admin-token"},
    )
    assert base_res.status_code == 200
    assert base_res.json()["is_baseline"] == 1

    # Test retry endpoint
    retry_res = client.post(
        f"/api/admin/submissions/{sub_id}/retry",
        headers={"X-Admin-Token": "admin-token"},
    )
    assert retry_res.status_code == 200
    assert retry_res.json()["status"] == "queued"

    # Test CSV export
    csv_res = client.get(
        "/api/admin/export/csv",
        headers={"X-Admin-Token": "admin-token"},
    )
    assert csv_res.status_code == 200
    assert "rank,submission_id" in csv_res.text

    # Test delete endpoint
    del_res = client.delete(
        f"/api/admin/submissions/{sub_id}",
        headers={"X-Admin-Token": "admin-token"},
    )
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"
