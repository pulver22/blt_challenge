from dataclasses import dataclass
from pathlib import Path


class TrajectoryValidationError(ValueError):
    pass


@dataclass(frozen=True)
class TumSummary:
    rows: int
    first_timestamp: float
    last_timestamp: float


def validate_tum_file(path: Path) -> TumSummary:
    rows = 0
    first_timestamp: float | None = None
    last_timestamp: float | None = None

    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) != 8:
                raise TrajectoryValidationError(
                    f"Line {line_number} must contain 8 numeric columns for TUM format.",
                )
            try:
                values = [float(part) for part in parts]
            except ValueError as exc:
                raise TrajectoryValidationError(f"Line {line_number} contains a non-numeric value.") from exc
            timestamp = values[0]
            if last_timestamp is not None and timestamp < last_timestamp:
                raise TrajectoryValidationError("TUM timestamps must be monotonically increasing.")
            if first_timestamp is None:
                first_timestamp = timestamp
            last_timestamp = timestamp
            rows += 1

    if rows == 0 or first_timestamp is None or last_timestamp is None:
        raise TrajectoryValidationError("No trajectory poses found in TUM file.")

    return TumSummary(rows=rows, first_timestamp=first_timestamp, last_timestamp=last_timestamp)
