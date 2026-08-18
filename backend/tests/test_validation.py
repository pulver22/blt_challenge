from pathlib import Path

import pytest

from backend.validation import TrajectoryValidationError, validate_tum_file


def test_validates_tum_trajectory_rows(tmp_path: Path):
    upload = tmp_path / "trajectory.txt"
    upload.write_text(
        "\n".join(
            [
                "# timestamp tx ty tz qx qy qz qw",
                "1000.000 0.0 0.1 0.2 0.0 0.0 0.0 1.0",
                "1000.050 0.1 0.1 0.2 0.0 0.0 0.0 1.0",
            ],
        ),
        encoding="utf-8",
    )

    summary = validate_tum_file(upload)

    assert summary.rows == 2
    assert summary.first_timestamp == 1000.0
    assert summary.last_timestamp == 1000.05


def test_rejects_non_tum_rows(tmp_path: Path):
    upload = tmp_path / "trajectory.txt"
    upload.write_text("1 2 3\n", encoding="utf-8")

    with pytest.raises(TrajectoryValidationError, match="8 numeric columns"):
        validate_tum_file(upload)


def test_rejects_empty_tum_file(tmp_path: Path):
    upload = tmp_path / "trajectory.txt"
    upload.write_text("# comments only\n", encoding="utf-8")

    with pytest.raises(TrajectoryValidationError, match="No trajectory poses"):
        validate_tum_file(upload)
