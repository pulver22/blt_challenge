import json
import sqlite3
from datetime import UTC, datetime
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
                    invite_code_id TEXT NOT NULL REFERENCES invite_codes(id),
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
                """
            )

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

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

    def remaining_attempts(self, invite_code_id: str, category: str) -> int:
        with self.connect() as db:
            used = db.execute(
                """
                SELECT COUNT(*) FROM submissions
                WHERE invite_code_id = ? AND category = ? AND attempt_number IS NOT NULL
                """,
                (invite_code_id, category),
            ).fetchone()[0]
        return max(0, self.attempt_limit - int(used))

    def create_submission(
        self,
        *,
        invite_code_id: str,
        team: str,
        contact_email: str,
        method: str,
        category: str,
        training_runs: str,
        link: str,
        notes: str,
        upload_path: str,
        status: str,
        validation_summary: Any | None = None,
    ) -> dict[str, Any]:
        consumes_attempt = status != "failed_validation"
        now = utc_now()
        raw_token = generate_private_token()
        with self.connect() as db:
            attempt_number = None
            if consumes_attempt:
                used = db.execute(
                    """
                    SELECT COUNT(*) FROM submissions
                    WHERE invite_code_id = ? AND category = ? AND attempt_number IS NOT NULL
                    """,
                    (invite_code_id, category),
                ).fetchone()[0]
                if used >= self.attempt_limit:
                    raise AttemptLimitExceeded("This invite has used all attempts for the selected category.")
                attempt_number = int(used) + 1

            submission = {
                "id": uuid4().hex,
                "invite_code_id": invite_code_id,
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
                "created_at": now,
                "updated_at": now,
            }
            db.execute(
                """
                INSERT INTO submissions (
                    id, invite_code_id, token_hash, team, contact_email, method, category,
                    training_runs, link, notes, upload_path, status, publication_state,
                    attempt_number, validation_rows, validation_first_timestamp,
                    validation_last_timestamp, created_at, updated_at
                )
                VALUES (
                    :id, :invite_code_id, :token_hash, :team, :contact_email, :method,
                    :category, :training_runs, :link, :notes, :upload_path, :status,
                    :publication_state, :attempt_number, :validation_rows,
                    :validation_first_timestamp, :validation_last_timestamp, :created_at,
                    :updated_at
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
        publication_state = "pending_review" if status == "pending_review" else None
        with self.connect() as db:
            if publication_state:
                db.execute(
                    """
                    UPDATE submissions SET status = ?, publication_state = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (status, publication_state, utc_now(), submission_id),
                )
            else:
                db.execute(
                    "UPDATE submissions SET status = ?, updated_at = ? WHERE id = ?",
                    (status, utc_now(), submission_id),
                )

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
        return {
            "app_version": app_version,
            "queue_length": int(queue_length),
            "ground_truth_available": ground_truth_path.exists(),
            "evo_available": self._command_available("evo_ape") and self._command_available("evo_rpe"),
            "data_dir": str(data_dir),
            "disk_bytes": usage,
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
