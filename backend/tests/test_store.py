from pathlib import Path

from backend.store import Store


def test_attempt_accounting_counts_evo_runs_only(tmp_path: Path):
    store = Store(tmp_path / "app.db")
    store.initialize()
    invite = store.create_invite(team_label="Lincoln Robotics", code="BLT-TEST")

    validation_failure = store.create_submission(
        invite_code_id=invite["id"],
        team="Lincoln Robotics",
        contact_email="team@example.org",
        method="Bad Format",
        category="lidar",
        training_runs="Spring",
        link="",
        notes="",
        upload_path="/tmp/bad.txt",
        status="failed_validation",
    )
    assert validation_failure["attempt_number"] is None

    queued = store.create_submission(
        invite_code_id=invite["id"],
        team="Lincoln Robotics",
        contact_email="team@example.org",
        method="Real Attempt",
        category="lidar",
        training_runs="Spring",
        link="",
        notes="",
        upload_path="/tmp/good.txt",
        status="queued",
    )

    assert queued["attempt_number"] == 1
    assert store.remaining_attempts(invite["id"], "lidar") == 4


def test_public_leaderboard_returns_best_published_result_per_team_category(tmp_path: Path):
    store = Store(tmp_path / "app.db")
    store.initialize()
    invite = store.create_invite(team_label="RowMapper", code="BLT-ROW")

    first = store.create_submission(
        invite_code_id=invite["id"],
        team="RowMapper",
        contact_email="team@example.org",
        method="ICP v1",
        category="lidar",
        training_runs="Spring",
        link="",
        notes="",
        upload_path="/tmp/one.txt",
        status="pending_review",
    )
    second = store.create_submission(
        invite_code_id=invite["id"],
        team="RowMapper",
        contact_email="team@example.org",
        method="ICP v2",
        category="lidar",
        training_runs="Spring",
        link="",
        notes="",
        upload_path="/tmp/two.txt",
        status="pending_review",
    )
    store.record_result(first["id"], ate_rmse=0.4, rpe_rmse=0.08, alignment="se3", artifact_path="/tmp/a")
    store.record_result(second["id"], ate_rmse=0.2, rpe_rmse=0.06, alignment="se3", artifact_path="/tmp/b")
    store.set_publication(first["id"], "published")
    store.set_publication(second["id"], "published")

    leaderboards = store.public_leaderboards()

    assert [row["submission_id"] for row in leaderboards["lidar"]] == [second["id"]]
    assert leaderboards["lidar"][0]["rank"] == 1
    assert leaderboards["combined"][0]["exploratory"] is True
