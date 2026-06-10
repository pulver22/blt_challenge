import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    database_path: Path = Path("var/app.db")
    data_dir: Path = Path("var/data")
    ground_truth_path: Path = Path("groundtruth/official_tum.txt")
    admin_token: str = "change-me"
    public_base_url: str = ""
    app_version: str = "dev"
    max_upload_bytes: int = 25 * 1024 * 1024
    attempt_limit_per_category: int = 5
    timestamp_tolerance: float = 0.05
    evo_timeout_seconds: int = 600
    worker_poll_seconds: float = 2.0
    static_dir: Path = Path("dist")

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            database_path=Path(os.getenv("BLT_DATABASE_PATH", "var/app.db")),
            data_dir=Path(os.getenv("BLT_DATA_DIR", "var/data")),
            ground_truth_path=Path(os.getenv("BLT_GROUND_TRUTH_PATH", "groundtruth/official_tum.txt")),
            admin_token=os.getenv("BLT_ADMIN_TOKEN", "change-me"),
            public_base_url=os.getenv("BLT_PUBLIC_BASE_URL", ""),
            app_version=os.getenv("BLT_APP_VERSION", "dev"),
            max_upload_bytes=int(os.getenv("BLT_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024))),
            attempt_limit_per_category=int(os.getenv("BLT_ATTEMPT_LIMIT_PER_CATEGORY", "5")),
            timestamp_tolerance=float(os.getenv("BLT_TIMESTAMP_TOLERANCE", "0.05")),
            evo_timeout_seconds=int(os.getenv("BLT_EVO_TIMEOUT_SECONDS", "600")),
            worker_poll_seconds=float(os.getenv("BLT_WORKER_POLL_SECONDS", "2")),
            static_dir=Path(os.getenv("BLT_STATIC_DIR", "dist")),
        )
