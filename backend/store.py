import json
import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from backend.security import (
    generate_invite_code,
    generate_private_token,
    hash_invite_code,
    hash_secret,
    verify_invite_code,
    verify_secret,
)


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


class AttemptLimitExceeded(ValueError):
    pass


class RateLimitExceeded(ValueError):
    pass


class BlacklistedError(ValueError):
    pass


class SystemFrozenError(ValueError):
    pass


class Store:
    def __init__(self, database_path: Path, attempt_limit: int = 5):
        self.database_path = database_path
        self.attempt_limit = attempt_limit

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript(
                """
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS invite_codes (
                    id TEXT PRIMARY KEY,
                    team_label TEXT NOT NULL,
                    code_hash TEXT NOT NULL,
                    active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    disabled_at TEXT
                );
                CREATE TABLE IF NOT EXISTS submissions (
                    id TEXT PRIMARY KEY,
                    invite_code_id TEXT,
                    token_hash TEXT NOT NULL,
                    team TEXT NOT NULL,
                    contact_email TEXT NOT NULL,
                    method TEXT NOT NULL,
                    category TEXT NOT NULL,
                    training_runs TEXT NOT NULL DEFAULT '',
                    link TEXT NOT NULL DEFAULT '',
                    notes TEXT NOT NULL DEFAULT '',
                    upload_path TEXT NOT NULL,
                    status TEXT NOT NULL,
                    publication_state TEXT NOT NULL DEFAULT 'private',
                    attempt_number INTEGER,
                    validation_rows INTEGER,
                    validation_first_timestamp REAL,
                    validation_last_timestamp REAL,
                    is_baseline INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS evo_results (
                    submission_id TEXT PRIMARY KEY REFERENCES submissions(id),
                    ate_rmse REAL NOT NULL,
                    rpe_rmse REAL NOT NULL,
                    alignment TEXT NOT NULL,
                    artifact_path TEXT NOT NULL,
                    raw_metrics_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS audit_events (
                    id TEXT PRIMARY KEY,
                    actor TEXT NOT NULL,
                    action TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS ip_submission_logs (
                    id TEXT PRIMARY KEY,
                    ip_address TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS blacklist_entries (
                    id TEXT PRIMARY KEY,
                    entry_type TEXT NOT NULL,
                    value TEXT NOT NULL,
                    reason TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS system_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_ip_logs ON ip_submission_logs(ip_address, created_at);
                """
            )
            # Ensure is_baseline column exists if database was created previously
            cols = [row[1] for row in db.execute("PRAGMA table_info(submissions)").fetchall()]
            if "is_baseline" not in cols:
                db.execute("ALTER TABLE submissions ADD COLUMN is_baseline INTEGER NOT NULL DEFAULT 0")

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    # --- SYSTEM SETTINGS ---
    def get_system_setting(self, key: str, default: str = "") -> str:
        with self.connect() as db:
            row = db.execute("SELECT value FROM system_settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else default

    def set_system_setting(self, key: str, value: str) -> None:
        with self.connect() as db:
            db.execute(
                "INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)",
                (key, str(value)),
            )
            self._audit(db, "admin", "set_system_setting", "setting", key, {"value": value})

    # --- BLACKLIST MANAGEMENT ---
    def is_blacklisted(self, email: str, ip_address: str) -> tuple[bool, str]:
        clean_email = email.strip().lower()
        with self.connect() as db:
            rows = db.execute("SELECT * FROM blacklist_entries").fetchall()
        for row in rows:
            entry = dict(row)
            val = entry["value"].strip().lower()
            if entry["entry_type"] == "email" and clean_email == val:
                return True, f"Email address '{email}' is blacklisted: {entry['reason']}"
            if entry["entry_type"] == "ip" and ip_address == entry["value"].strip():
                return True, f"IP address '{ip_address}' is blacklisted: {entry['reason']}"
        return False, ""

    def add_blacklist_entry(self, entry_type: str, value: str, reason: str = "") -> dict[str, Any]:
        if entry_type not in {"email", "ip"}:
            raise ValueError("Entry type must be email or ip.")
        entry = {
            "id": uuid4().hex,
            "entry_type": entry_type,
            "value": value.strip(),
            "reason": reason.strip(),
            "created_at": utc_now(),
        }
        with self.connect() as db:
            db.execute(
                """
                INSERT INTO blacklist_entries (id, entry_type, value, reason, created_at)
                VALUES (:id, :entry_type, :value, :reason, :created_at)
                """,
                entry,
            )
            self._audit(db, "admin", "add_blacklist", entry_type, entry["id"], {"value": value})
        return entry

    def remove_blacklist_entry(self, entry_id: str) -> None:
        with self.connect() as db:
            db.execute("DELETE FROM blacklist_entries WHERE id = ?", (entry_id,))
            self._audit(db, "admin", "remove_blacklist", "blacklist_entry", entry_id, {})

    def list_blacklist_entries(self) -> list[dict[str, Any]]:
        with self.connect() as db:
            rows = db.execute("SELECT * FROM blacklist_entries ORDER BY created_at DESC").fetchall()
        return [dict(row) for row in rows]

    # --- IP & RATE LIMITING ---
    def log_ip_request(self, ip_address: str) -> None:
        with self.connect() as db:
            db.execute(
                "INSERT INTO ip_submission_logs (id, ip_address, created_at) VALUES (?, ?, ?)",
                (uuid4().hex, ip_address, utc_now()),
            )

    def check_ip_rate_limit(self, ip_address: str, limit_per_hour: int = 5, whitelist: tuple[str, ...] = ()) -> None:
        if limit_per_hour <= 0 or ip_address in whitelist:
            return
        one_hour_ago = (datetime.now(UTC) - timedelta(hours=1)).isoformat(timespec="seconds")
        with self.connect() as db:
            count = db.execute(
                "SELECT COUNT(*) FROM ip_submission_logs WHERE ip_address = ? AND created_at >= ?",
                (ip_address, one_hour_ago),
            ).fetchone()[0]
        if count >= limit_per_hour:
            raise RateLimitExceeded(
                f"IP rate limit exceeded ({count}/{limit_per_hour} submissions in the last hour). Please try again later."
            )

    # --- INVITE CODES ---
    def create_invite(self, *, team_label: str, code: str | None = None) -> dict[str, Any]:
        raw_code = code or generate_invite_code()
        invite = {
            "id": uuid4().hex,
            "team_label": team_label.strip(),
            "code_hash": hash_invite_code(raw_code),
            "active": 1,
            "created_at": utc_now(),
        }
        with self.connect() as db:
            db.execute(
                """
                INSERT INTO invite_codes (id, team_label, code_hash, active, created_at)
                VALUES (:id, :team_label, :code_hash, :active, :created_at)
                """,
                invite,
            )
            self._audit(db, "admin", "create_invite", "invite_code", invite["id"], {"team_label": team_label})
        return {"id": invite["id"], "team_label": invite["team_label"], "active": True, "code": raw_code}

    def disable_invite(self, invite_id: str) -> dict[str, Any] | None:
        with self.connect() as db:
            db.execute(
                "UPDATE invite_codes SET active = 0, disabled_at = ? WHERE id = ?",
                (utc_now(), invite_id),
            )
            self._audit(db, "admin", "disable_invite", "invite_code", invite_id, {})
            row = db.execute("SELECT * FROM invite_codes WHERE id = ?", (invite_id,)).fetchone()
        return dict(row) if row else None

    def list_invites(self) -> list[dict[str, Any]]:
        with self.connect() as db:
            rows = db.execute(
                "SELECT id, team_label, active, created_at, disabled_at FROM invite_codes ORDER BY created_at DESC",
            ).fetchall()
        return [dict(row) for row in rows]

    def find_active_invite(self, code: str) -> dict[str, Any] | None:
        with self.connect() as db:
            rows = db.execute("SELECT * FROM invite_codes WHERE active = 1").fetchall()
        for row in rows:
            invite = dict(row)
            if verify_invite_code(code, invite["code_hash"]):
                return invite
        return None

    # --- QUOTA MANAGEMENT ---
    def remaining_attempts_by_email(self, contact_email: str, category: str) -> int:
        clean_email = contact_email.strip().lower()
        with self.connect() as db:
            used = db.execute(
                """
                SELECT COUNT(*) FROM submissions
                WHERE LOWER(contact_email) = ? AND category = ? AND attempt_number IS NOT NULL
                """,
                (clean_email, category),
            ).fetchone()[0]
            # Check for custom admin limit override
            override = db.execute(
                "SELECT value FROM system_settings WHERE key = ?",
                (f"quota_override_{clean_email}_{category}",),
            ).fetchone()
        limit = int(override["value"]) if override else self.attempt_limit
        return max(0, limit - int(used))

    def reset_quota_by_email(self, contact_email: str, category: str, additional_attempts: int = 5) -> int:
        clean_email = contact_email.strip().lower()
        with self.connect() as db:
            used = db.execute(
                """
                SELECT COUNT(*) FROM submissions
                WHERE LOWER(contact_email) = ? AND category = ? AND attempt_number IS NOT NULL
                """,
                (clean_email, category),
            ).fetchone()[0]
            new_limit = int(used) + additional_attempts
            db.execute(
                "INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)",
                (f"quota_override_{clean_email}_{category}", str(new_limit)),
            )
            self._audit(db, "admin", "reset_quota", "email", clean_email, {"category": category, "new_limit": new_limit})
        return new_limit

    def remaining_attempts(self, invite_code_id: str, category: str) -> int:
        with self.connect() as db:
            used = db.execute(
                """
                SELECT COUNT(*) FROM submissions
                WHERE (invite_code_id = ? OR LOWER(contact_email) = ?) AND category = ? AND attempt_number IS NOT NULL
                """,
                (invite_code_id, invite_code_id.strip().lower(), category),
            ).fetchone()[0]
        return max(0, self.attempt_limit - int(used))

    # --- SUBMISSIONS ---
    def create_submission(
        self,
        *,
        team: str,
        contact_email: str,
        method: str,
        category: str,
        training_runs: str,
        link: str,
        notes: str,
        upload_path: str,
        status: str,
        invite_code_id: str | None = None,
        validation_summary: Any | None = None,
    ) -> dict[str, Any]:
        consumes_attempt = status != "failed_validation"
        now = utc_now()
        raw_token = generate_private_token()
        clean_email = contact_email.strip().lower()
        with self.connect() as db:
            attempt_number = None
            if consumes_attempt:
                used = db.execute(
                    """
                    SELECT COUNT(*) FROM submissions
                    WHERE LOWER(contact_email) = ? AND category = ? AND attempt_number IS NOT NULL
                    """,
                    (clean_email, category),
                ).fetchone()[0]
                override = db.execute(
                    "SELECT value FROM system_settings WHERE key = ?",
                    (f"quota_override_{clean_email}_{category}",),
                ).fetchone()
                limit = int(override["value"]) if override else self.attempt_limit
                if used >= limit:
                    raise AttemptLimitExceeded(
                        f"Attempt limit reached ({used}/{limit}) for {category} category. Contact rpolvara@lincoln.ac.uk to request a quota reset."
                    )
                attempt_number = int(used) + 1

            submission = {
                "id": uuid4().hex,
                "invite_code_id": invite_code_id or "",
                "token_hash": hash_secret(raw_token),
                "team": team.strip(),
                "contact_email": contact_email.strip(),
                "method": method.strip(),
                "category": category,
                "training_runs": training_runs.strip(),
                "link": link.strip(),
                "notes": notes.strip(),
                "upload_path": upload_path,
                "status": status,
                "publication_state": "private",
                "attempt_number": attempt_number,
                "validation_rows": getattr(validation_summary, "rows", None),
                "validation_first_timestamp": getattr(validation_summary, "first_timestamp", None),
                "validation_last_timestamp": getattr(validation_summary, "last_timestamp", None),
                "is_baseline": 0,
                "created_at": now,
                "updated_at": now,
            }
            db.execute(
                """
                INSERT INTO submissions (
                    id, invite_code_id, token_hash, team, contact_email, method, category,
                    training_runs, link, notes, upload_path, status, publication_state,
                    attempt_number, validation_rows, validation_first_timestamp,
                    validation_last_timestamp, is_baseline, created_at, updated_at
                )
                VALUES (
                    :id, :invite_code_id, :token_hash, :team, :contact_email, :method,
                    :category, :training_runs, :link, :notes, :upload_path, :status,
                    :publication_state, :attempt_number, :validation_rows,
                    :validation_first_timestamp, :validation_last_timestamp, :is_baseline,
                    :created_at, :updated_at
                )
                """,
                submission,
            )
            self._audit(db, "participant", "create_submission", "submission", submission["id"], {"status": status})
        submission["token"] = raw_token
        return submission

    def claim_next_queued(self) -> dict[str, Any] | None:
        with self.connect() as db:
            row = db.execute(
                "SELECT * FROM submissions WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1",
            ).fetchone()
            if row is None:
                return None
            db.execute(
                "UPDATE submissions SET status = 'running', updated_at = ? WHERE id = ? AND status = 'queued'",
                (utc_now(), row["id"]),
            )
            claimed = db.execute("SELECT * FROM submissions WHERE id = ?", (row["id"],)).fetchone()
        return dict(claimed) if claimed else None

    def update_submission_status(self, submission_id: str, status: str) -> None:
        publication_state = "published" if status == "pending_review" else None
        final_status = "published" if status == "pending_review" else status
        with self.connect() as db:
            if publication_state:
                db.execute(
                    """
                    UPDATE submissions SET status = ?, publication_state = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (final_status, publication_state, utc_now(), submission_id),
                )
            else:
                db.execute(
                    "UPDATE submissions SET status = ?, updated_at = ? WHERE id = ?",
                    (status, utc_now(), submission_id),
                )

    def retry_submission(self, submission_id: str) -> dict[str, Any] | None:
        with self.connect() as db:
            db.execute(
                "UPDATE submissions SET status = 'queued', publication_state = 'private', updated_at = ? WHERE id = ?",
                (utc_now(), submission_id),
            )
            self._audit(db, "admin", "retry_submission", "submission", submission_id, {})
            row = self._submission_query(db, "s.id = ?", (submission_id,)).fetchone()
        return self._shape_submission(row) if row else None

    def delete_submission(self, submission_id: str, data_dir: Path) -> bool:
        with self.connect() as db:
            row = db.execute("SELECT upload_path FROM submissions WHERE id = ?", (submission_id,)).fetchone()
            if not row:
                return False
            upload_path = Path(row["upload_path"])
            db.execute("DELETE FROM evo_results WHERE submission_id = ?", (submission_id,))
            db.execute("DELETE FROM submissions WHERE id = ?", (submission_id,))
            self._audit(db, "admin", "delete_submission", "submission", submission_id, {})
        
        # Clean up files from data directory
        if upload_path.exists():
            upload_path.unlink(missing_ok=True)
        res_dir = data_dir / "results" / submission_id
        if res_dir.exists():
            import shutil
            shutil.rmtree(res_dir, ignore_errors=True)
        fail_log = data_dir / "failures" / f"{submission_id}.log"
        if fail_log.exists():
            fail_log.unlink(missing_ok=True)
        return True

    def toggle_baseline_tag(self, submission_id: str) -> dict[str, Any] | None:
        with self.connect() as db:
            row = db.execute("SELECT is_baseline FROM submissions WHERE id = ?", (submission_id,)).fetchone()
            if not row:
                return None
            next_val = 0 if row["is_baseline"] else 1
            db.execute(
                "UPDATE submissions SET is_baseline = ?, updated_at = ? WHERE id = ?",
                (next_val, utc_now(), submission_id),
            )
            self._audit(db, "admin", "toggle_baseline", "submission", submission_id, {"is_baseline": next_val})
            updated_row = self._submission_query(db, "s.id = ?", (submission_id,)).fetchone()
        return self._shape_submission(updated_row) if updated_row else None

    def get_submission_logs(self, submission_id: str, data_dir: Path) -> dict[str, Any]:
        with self.connect() as db:
            row = self._submission_query(db, "s.id = ?", (submission_id,)).fetchone()
        if not row:
            raise ValueError("Submission not found.")
        
        shaped = self._shape_submission(row)
        fail_log = data_dir / "failures" / f"{submission_id}.log"
        failure_text = fail_log.read_text(encoding="utf-8") if fail_log.exists() else ""
        
        return {
            "submission": shaped,
            "failure_log": failure_text,
            "upload_path": shaped.get("upload_path"),
        }

    def record_result(
        self,
        submission_id: str,
        *,
        ate_rmse: float,
        rpe_rmse: float,
        alignment: str,
        artifact_path: str,
        raw_metrics: dict[str, Any] | None = None,
    ) -> None:
        with self.connect() as db:
            db.execute(
                """
                INSERT OR REPLACE INTO evo_results (
                    submission_id, ate_rmse, rpe_rmse, alignment, artifact_path, raw_metrics_json, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    submission_id,
                    ate_rmse,
                    rpe_rmse,
                    alignment,
                    artifact_path,
                    json.dumps(raw_metrics or {}, sort_keys=True),
                    utc_now(),
                ),
            )

    def set_publication(self, submission_id: str, state: str) -> dict[str, Any] | None:
        if state not in {"published", "hidden", "pending_review"}:
            raise ValueError("Invalid publication state.")
        with self.connect() as db:
            db.execute(
                "UPDATE submissions SET publication_state = ?, updated_at = ? WHERE id = ?",
                (state, utc_now(), submission_id),
            )
            self._audit(db, "admin", f"{state}_submission", "submission", submission_id, {})
            row = self._submission_query(db, "s.id = ?", (submission_id,)).fetchone()
        return self._shape_submission(row) if row else None

    def get_submission_for_token(self, submission_id: str, token: str) -> dict[str, Any] | None:
        with self.connect() as db:
            row = self._submission_query(db, "s.id = ?", (submission_id,)).fetchone()
        if row is None:
            return None
        submission = self._shape_submission(row)
        if not verify_secret(token, submission.pop("token_hash")):
            return None
        return submission

    def get_submission(self, submission_id: str) -> dict[str, Any] | None:
        with self.connect() as db:
            row = self._submission_query(db, "s.id = ?", (submission_id,)).fetchone()
        if row is None:
            return None
        submission = self._shape_submission(row)
        submission.pop("token_hash", None)
        return submission

    def list_submissions(self) -> list[dict[str, Any]]:
        with self.connect() as db:
            rows = self._submission_query(db, "1 = 1", (), "s.created_at DESC").fetchall()
        submissions = [self._shape_submission(row) for row in rows]
        for submission in submissions:
            submission.pop("token_hash", None)
        return submissions

    def list_audit_events(self, limit: int = 50) -> list[dict[str, Any]]:
        with self.connect() as db:
            rows = db.execute("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(row) for row in rows]

    def export_leaderboard_csv(self) -> str:
        leaderboards = self.public_leaderboards()
        lines = ["rank,submission_id,team,method,category,ate_rmse,rpe_rmse,alignment,published_at,is_baseline"]
        for cat in ["lidar", "vision"]:
            for entry in leaderboards.get(cat, []):
                sub_id = entry.get("submission_id", "")
                team = f'"{entry.get("team", "")}"'
                method = f'"{entry.get("method", "")}"'
                category = entry.get("category", "")
                ate = entry.get("ate_rmse", "")
                rpe = entry.get("rpe_rmse", "")
                alignment = entry.get("alignment", "")
                published_at = entry.get("published_at", "")
                is_baseline = entry.get("is_baseline", 0)
                lines.append(f'{entry.get("rank")},{sub_id},{team},{method},{category},{ate},{rpe},{alignment},{published_at},{is_baseline}')
        return "\n".join(lines)

    def public_leaderboards(self) -> dict[str, list[dict[str, Any]]]:
        with self.connect() as db:
            rows = self._submission_query(
                db,
                "s.publication_state = 'published' AND er.submission_id IS NOT NULL",
                (),
                "er.ate_rmse ASC, s.created_at ASC",
            ).fetchall()
        best_by_team_category: dict[tuple[str, str], dict[str, Any]] = {}
        for row in rows:
            shaped = self._public_row(self._shape_submission(row))
            key = (shaped["team"], shaped["category"])
            existing = best_by_team_category.get(key)
            if existing is None or shaped["ate_rmse"] < existing["ate_rmse"]:
                best_by_team_category[key] = shaped

        lidar = sorted(
            [row for row in best_by_team_category.values() if row["category"] == "lidar"],
            key=lambda row: row["ate_rmse"],
        )
        vision = sorted(
            [row for row in best_by_team_category.values() if row["category"] == "vision"],
            key=lambda row: row["ate_rmse"],
        )
        combined = sorted(best_by_team_category.values(), key=lambda row: row["ate_rmse"])
        return {
            "lidar": self._rank(lidar),
            "vision": self._rank(vision),
            "combined": self._rank([{**row, "exploratory": True} for row in combined]),
        }

    def health(self, data_dir: Path, ground_truth_path: Path, app_version: str) -> dict[str, Any]:
        with self.connect() as db:
            queue_length = db.execute("SELECT COUNT(*) FROM submissions WHERE status = 'queued'").fetchone()[0]
            latest_failures = self._submission_query(
                db,
                "s.status IN ('failed_validation', 'failed_evo')",
                (),
                "s.updated_at DESC LIMIT 5",
            ).fetchall()
        usage = self._directory_usage(data_dir)
        frozen = self.get_system_setting("submissions_frozen", "false") == "true"
        return {
            "app_version": app_version,
            "queue_length": int(queue_length),
            "ground_truth_available": ground_truth_path.exists(),
            "evo_available": self._command_available("evo_ape") and self._command_available("evo_rpe"),
            "data_dir": str(data_dir),
            "disk_bytes": usage,
            "submissions_frozen": frozen,
            "latest_failures": [
                {
                    "id": row["id"],
                    "team": row["team"],
                    "method": row["method"],
                    "status": row["status"],
                    "updated_at": row["updated_at"],
                }
                for row in latest_failures
            ],
        }

    def _submission_query(
        self,
        db: sqlite3.Connection,
        where: str,
        params: tuple[Any, ...],
        order_by: str = "s.created_at DESC",
    ) -> sqlite3.Cursor:
        return db.execute(
            f"""
            SELECT
                s.*,
                er.ate_rmse,
                er.rpe_rmse,
                er.alignment,
                er.artifact_path,
                er.raw_metrics_json,
                er.created_at AS result_created_at
            FROM submissions s
            LEFT JOIN evo_results er ON er.submission_id = s.id
            WHERE {where}
            ORDER BY {order_by}
            """,
            params,
        )

    def _shape_submission(self, row: sqlite3.Row) -> dict[str, Any]:
        submission = dict(row)
        result = None
        if submission.get("ate_rmse") is not None:
            result = {
                "ate_rmse": submission.pop("ate_rmse"),
                "rpe_rmse": submission.pop("rpe_rmse"),
                "alignment": submission.pop("alignment"),
                "artifact_path": submission.pop("artifact_path"),
                "raw_metrics": json.loads(submission.pop("raw_metrics_json") or "{}"),
                "created_at": submission.pop("result_created_at"),
            }
        else:
            for key in ["ate_rmse", "rpe_rmse", "alignment", "artifact_path", "raw_metrics_json", "result_created_at"]:
                submission.pop(key, None)
        submission["result"] = result
        return submission

    def _public_row(self, submission: dict[str, Any]) -> dict[str, Any]:
        result = submission["result"] or {}
        return {
            "submission_id": submission["id"],
            "team": submission["team"],
            "method": submission["method"],
            "category": submission["category"],
            "training_runs": submission["training_runs"],
            "link": submission["link"],
            "notes": submission["notes"],
            "attempt_number": submission["attempt_number"],
            "is_baseline": submission.get("is_baseline", 0),
            "ate_rmse": result["ate_rmse"],
            "rpe_rmse": result["rpe_rmse"],
            "alignment": result["alignment"],
            "published_at": submission["updated_at"],
            "exploratory": False,
        }

    def _rank(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [{**row, "rank": index + 1} for index, row in enumerate(rows)]

    def _audit(
        self,
        db: sqlite3.Connection,
        actor: str,
        action: str,
        entity_type: str,
        entity_id: str,
        metadata: dict[str, Any],
    ) -> None:
        db.execute(
            """
            INSERT INTO audit_events (id, actor, action, entity_type, entity_id, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (uuid4().hex, actor, action, entity_type, entity_id, json.dumps(metadata), utc_now()),
        )

    def _directory_usage(self, path: Path) -> int:
        if not path.exists():
            return 0
        return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())

    def _command_available(self, command: str) -> bool:
        from shutil import which

        return which(command) is not None
