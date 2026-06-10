from pathlib import Path

from backend.evaluator import build_evo_commands, parse_evo_metrics


def test_builds_category_specific_evo_commands(tmp_path: Path):
    ground_truth = tmp_path / "groundtruth.txt"
    upload = tmp_path / "upload.txt"
    output_dir = tmp_path / "artifacts"

    lidar_ape, _ = build_evo_commands(
        category="lidar",
        ground_truth_path=ground_truth,
        trajectory_path=upload,
        output_dir=output_dir,
        timestamp_tolerance=0.05,
    )
    vision_ape, _ = build_evo_commands(
        category="vision",
        ground_truth_path=ground_truth,
        trajectory_path=upload,
        output_dir=output_dir,
        timestamp_tolerance=0.05,
    )

    assert "--align" in lidar_ape
    assert "--correct_scale" not in lidar_ape
    assert "--correct_scale" in vision_ape
    assert "--t_max_diff" in lidar_ape
    assert "0.05" in lidar_ape


def test_parses_evo_rmse_metrics():
    metrics = parse_evo_metrics(
        ape_output="rmse 0.184\nmean 0.120\n",
        rpe_output="rmse 0.041\nmedian 0.032\n",
    )

    assert metrics["ate_rmse"] == 0.184
    assert metrics["rpe_rmse"] == 0.041
