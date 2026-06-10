import re
import subprocess
from pathlib import Path


class EvaluationError(RuntimeError):
    pass


def build_evo_commands(
    *,
    category: str,
    ground_truth_path: Path,
    trajectory_path: Path,
    output_dir: Path,
    timestamp_tolerance: float,
) -> tuple[list[str], list[str]]:
    alignment_args = ["--align"]
    if category == "vision":
        alignment_args.append("--correct_scale")

    common = [
        "tum",
        str(ground_truth_path),
        str(trajectory_path),
        *alignment_args,
        "--t_max_diff",
        str(timestamp_tolerance),
    ]
    ape = [
        "evo_ape",
        *common,
        "-r",
        "full",
        "--save_results",
        str(output_dir / "ape.zip"),
    ]
    rpe = [
        "evo_rpe",
        *common,
        "-r",
        "trans_part",
        "--save_results",
        str(output_dir / "rpe.zip"),
    ]
    return ape, rpe


def parse_evo_metrics(*, ape_output: str, rpe_output: str) -> dict[str, float]:
    return {
        "ate_rmse": _extract_rmse(ape_output, "APE"),
        "rpe_rmse": _extract_rmse(rpe_output, "RPE"),
    }


def run_evaluation(
    *,
    category: str,
    ground_truth_path: Path,
    trajectory_path: Path,
    output_dir: Path,
    timestamp_tolerance: float,
    timeout_seconds: int,
) -> dict[str, float | str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    ape_command, rpe_command = build_evo_commands(
        category=category,
        ground_truth_path=ground_truth_path,
        trajectory_path=trajectory_path,
        output_dir=output_dir,
        timestamp_tolerance=timestamp_tolerance,
    )
    ape = _run_command(ape_command, timeout_seconds)
    rpe = _run_command(rpe_command, timeout_seconds)
    metrics = parse_evo_metrics(ape_output=ape.stdout, rpe_output=rpe.stdout)
    metrics["alignment"] = "sim3" if category == "vision" else "se3"
    return metrics


def _run_command(command: list[str], timeout_seconds: int) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        raise EvaluationError(f"evo timed out after {timeout_seconds} seconds.") from exc
    except subprocess.CalledProcessError as exc:
        output = "\n".join(part for part in [exc.stdout, exc.stderr] if part)
        raise EvaluationError(output.strip() or "evo failed.") from exc


def _extract_rmse(output: str, label: str) -> float:
    for line in output.splitlines():
        match = re.match(r"\s*rmse\s+([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*$", line)
        if match:
            return float(match.group(1))
    raise EvaluationError(f"Could not parse {label} RMSE from evo output.")
