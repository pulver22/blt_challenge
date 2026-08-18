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
    ip_rate_limit_per_hour: int = 5
    ip_whitelist: tuple[str, ...] = ()
    timestamp_tolerance: float = 0.05
    evo_timeout_seconds: int = 600
    worker_poll_seconds: float = 2.0
    static_dir: Path = Path("dist")
    admin_email: str = "rpolvara@lincoln.ac.uk"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "rpolvara@lincoln.ac.uk"

    @classmethod
    def from_env(cls) -> "Settings":
        raw_whitelist = os.getenv("BLT_IP_WHITELIST", "")
        ip_whitelist = tuple(ip.strip() for ip in raw_whitelist.split(",") if ip.strip())
        return cls(
            database_path=Path(os.getenv("BLT_DATABASE_PATH", "var/app.db")),
            data_dir=Path(os.getenv("BLT_DATA_DIR", "var/data")),
            ground_truth_path=Path(os.getenv("BLT_GROUND_TRUTH_PATH", "groundtruth/official_tum.txt")),
            admin_token=os.getenv("BLT_ADMIN_TOKEN", "change-me"),
            public_base_url=os.getenv("BLT_PUBLIC_BASE_URL", ""),
            app_version=os.getenv("BLT_APP_VERSION", "dev"),
            max_upload_bytes=int(os.getenv("BLT_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024))),
            attempt_limit_per_category=int(os.getenv("BLT_ATTEMPT_LIMIT_PER_CATEGORY", "5")),
            ip_rate_limit_per_hour=int(os.getenv("BLT_IP_RATE_LIMIT_PER_HOUR", "5")),
            ip_whitelist=ip_whitelist,
            timestamp_tolerance=float(os.getenv("BLT_TIMESTAMP_TOLERANCE", "0.05")),
            evo_timeout_seconds=int(os.getenv("BLT_EVO_TIMEOUT_SECONDS", "600")),
            worker_poll_seconds=float(os.getenv("BLT_WORKER_POLL_SECONDS", "2")),
            static_dir=Path(os.getenv("BLT_STATIC_DIR", "dist")),
            admin_email=os.getenv("BLT_ADMIN_EMAIL", "rpolvara@lincoln.ac.uk"),
            smtp_host=os.getenv("BLT_SMTP_HOST", ""),
            smtp_port=int(os.getenv("BLT_SMTP_PORT", "587")),
            smtp_user=os.getenv("BLT_SMTP_USER", ""),
            smtp_password=os.getenv("BLT_SMTP_PASSWORD", ""),
            smtp_from=os.getenv("BLT_SMTP_FROM", "rpolvara@lincoln.ac.uk"),
        )
