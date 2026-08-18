from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config import Settings
from backend.store import AttemptLimitExceeded, RateLimitExceeded, Store
from backend.validation import TrajectoryValidationError, is_supported_tum_filename, validate_tum_file
from backend.worker import EvaluationWorker


class InviteCreateRequest(BaseModel):
    team_label: str


class QuotaResetRequest(BaseModel):
    contact_email: str
    category: str = "lidar"
    additional_attempts: int = 5


class BlacklistRequest(BaseModel):
    entry_type: str
    value: str
    reason: str = ""


class SystemSettingRequest(BaseModel):
    key: str
    value: str


def create_app(settings: Settings | None = None, *, start_worker: bool = True) -> FastAPI:
    resolved_settings = settings or Settings.from_env()
    store = Store(resolved_settings.database_path, attempt_limit=resolved_settings.attempt_limit_per_category)
    store.initialize()
    resolved_settings.data_dir.mkdir(parents=True, exist_ok=True)
    for child in ["uploads", "results", "failures"]:
        (resolved_settings.data_dir / child).mkdir(parents=True, exist_ok=True)

    app = FastAPI(title="BLT Benchmark", version=resolved_settings.app_version)
    app.state.settings = resolved_settings
    app.state.store = store
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["*"],
    )

    worker: EvaluationWorker | None = None
    if start_worker:
        worker = EvaluationWorker(store=store, settings=resolved_settings)

        @app.on_event("startup")
        def _start_worker() -> None:
            worker.start()

        @app.on_event("shutdown")
        def _stop_worker() -> None:
            worker.stop()

    def require_admin(x_admin_token: str = Header(default="")) -> None:
        if not resolved_settings.admin_token or x_admin_token != resolved_settings.admin_token:
            raise HTTPException(status_code=401, detail="Admin token is required.")

    @app.get("/api/leaderboards")
    def leaderboards() -> dict:
        return store.public_leaderboards()

    @app.post("/api/submissions", status_code=201)
    async def create_submission(
        request: Request,
        contact_email: str = Form(...),
        team: str = Form(...),
        method: str = Form(...),
        category: str = Form(...),
        invite_code: str = Form(""),
        training_runs: str = Form(""),
        link: str = Form(""),
        notes: str = Form(""),
        trajectory: UploadFile = File(...),
    ) -> dict:
        # Check system freeze switch
        if store.get_system_setting("submissions_frozen", "false") == "true":
            raise HTTPException(status_code=503, detail="Submissions are currently paused for benchmark maintenance.")

        client_ip = request.headers.get("X-Forwarded-For", getattr(request.client, "host", "127.0.0.1")).split(",")[0].strip()

        # Check blacklist
        is_blocked, block_reason = store.is_blacklisted(contact_email, client_ip)
        if is_blocked:
            raise HTTPException(status_code=403, detail=block_reason)

        try:
            store.check_ip_rate_limit(
                client_ip,
                limit_per_hour=resolved_settings.ip_rate_limit_per_hour,
                whitelist=resolved_settings.ip_whitelist,
            )
        except RateLimitExceeded as exc:
            raise HTTPException(status_code=429, detail=str(exc)) from exc

        invite = None
        if invite_code:
            invite = store.find_active_invite(invite_code)
            if invite is None:
                raise HTTPException(status_code=403, detail="Invalid or disabled invite code.")

        if category not in {"lidar", "vision"}:
            raise HTTPException(status_code=400, detail="Category must be lidar or vision.")
        if not is_supported_tum_filename(trajectory.filename):
            raise HTTPException(status_code=400, detail="Upload a TUM text trajectory file.")

        upload_path = await _save_upload(trajectory, resolved_settings)
        invite_id = invite["id"] if invite else ""

        try:
            validation_summary = validate_tum_file(upload_path)
        except TrajectoryValidationError as exc:
            store.create_submission(
                invite_code_id=invite_id,
                team=team,
                contact_email=contact_email,
                method=method,
                category=category,
                training_runs=training_runs,
                link=link,
                notes=notes,
                upload_path=str(upload_path),
                status="failed_validation",
            )
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        try:
            store.log_ip_request(client_ip)
            submission = store.create_submission(
                invite_code_id=invite_id,
                team=team,
                contact_email=contact_email,
                method=method,
                category=category,
                training_runs=training_runs,
                link=link,
                notes=notes,
                upload_path=str(upload_path),
                status="queued",
                validation_summary=validation_summary,
            )
        except AttemptLimitExceeded as exc:
            raise HTTPException(status_code=429, detail=str(exc)) from exc

        remaining = (
            store.remaining_attempts(invite["id"], category)
            if invite
            else store.remaining_attempts_by_email(contact_email, category)
        )

        status_path = f"/submissions/{submission['id']}?token={submission['token']}"
        return {
            "id": submission["id"],
            "token": submission["token"],
            "status": submission["status"],
            "attempt_number": submission["attempt_number"],
            "remaining_attempts": remaining,
            "status_url": f"{resolved_settings.public_base_url}{status_path}" if resolved_settings.public_base_url else status_path,
        }

    @app.get("/api/submissions/{submission_id}")
    def submission_status(submission_id: str, token: str) -> dict:
        submission = store.get_submission_for_token(submission_id, token)
        if submission is None:
            raise HTTPException(status_code=404, detail="Submission not found.")
        return _public_submission_status(submission)

    # --- ADMIN ENDPOINTS ---
    @app.post("/api/admin/invites", dependencies=[Depends(require_admin)])
    def create_invite(payload: InviteCreateRequest) -> dict:
        return store.create_invite(team_label=payload.team_label)

    @app.get("/api/admin/invites", dependencies=[Depends(require_admin)])
    def list_invites() -> list[dict]:
        return store.list_invites()

    @app.post("/api/admin/invites/{invite_id}/disable", dependencies=[Depends(require_admin)])
    def disable_invite(invite_id: str) -> dict:
        invite = store.disable_invite(invite_id)
        if invite is None:
            raise HTTPException(status_code=404, detail="Invite not found.")
        return invite

    @app.get("/api/admin/submissions", dependencies=[Depends(require_admin)])
    def admin_submissions() -> list[dict]:
        return store.list_submissions()

    @app.post("/api/admin/submissions/{submission_id}/publish", dependencies=[Depends(require_admin)])
    def publish_submission(submission_id: str) -> dict:
        submission = store.set_publication(submission_id, "published")
        if submission is None:
            raise HTTPException(status_code=404, detail="Submission not found.")
        submission.pop("token_hash", None)
        return submission

    @app.post("/api/admin/submissions/{submission_id}/hide", dependencies=[Depends(require_admin)])
    def hide_submission(submission_id: str) -> dict:
        submission = store.set_publication(submission_id, "hidden")
        if submission is None:
            raise HTTPException(status_code=404, detail="Submission not found.")
        submission.pop("token_hash", None)
        return submission

    @app.post("/api/admin/submissions/{submission_id}/retry", dependencies=[Depends(require_admin)])
    def retry_submission(submission_id: str) -> dict:
        submission = store.retry_submission(submission_id)
        if submission is None:
            raise HTTPException(status_code=404, detail="Submission not found.")
        return submission

    @app.delete("/api/admin/submissions/{submission_id}", dependencies=[Depends(require_admin)])
    def delete_submission(submission_id: str) -> dict:
        success = store.delete_submission(submission_id, resolved_settings.data_dir)
        if not success:
            raise HTTPException(status_code=404, detail="Submission not found.")
        return {"status": "deleted", "id": submission_id}

    @app.post("/api/admin/submissions/{submission_id}/baseline", dependencies=[Depends(require_admin)])
    def toggle_baseline(submission_id: str) -> dict:
        submission = store.toggle_baseline_tag(submission_id)
        if submission is None:
            raise HTTPException(status_code=404, detail="Submission not found.")
        return submission

    @app.get("/api/admin/submissions/{submission_id}/logs", dependencies=[Depends(require_admin)])
    def submission_logs(submission_id: str) -> dict:
        try:
            return store.get_submission_logs(submission_id, resolved_settings.data_dir)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @app.get("/api/admin/submissions/{submission_id}/download", dependencies=[Depends(require_admin)])
    def download_trajectory(submission_id: str) -> FileResponse:
        submission = store.get_submission(submission_id)
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found.")
        upload_path = Path(submission["upload_path"])
        if not upload_path.exists():
            raise HTTPException(status_code=404, detail="Uploaded trajectory file not found on disk.")
        return FileResponse(upload_path, filename=f"{submission['team']}_{submission['method']}_trajectory.txt")

    @app.post("/api/admin/quotas/reset", dependencies=[Depends(require_admin)])
    def reset_quota(payload: QuotaResetRequest) -> dict:
        new_limit = store.reset_quota_by_email(payload.contact_email, payload.category, payload.additional_attempts)
        return {"contact_email": payload.contact_email, "category": payload.category, "new_limit": new_limit}

    @app.get("/api/admin/blacklist", dependencies=[Depends(require_admin)])
    def list_blacklist() -> list[dict]:
        return store.list_blacklist_entries()

    @app.post("/api/admin/blacklist", dependencies=[Depends(require_admin)])
    def add_blacklist(payload: BlacklistRequest) -> dict:
        try:
            return store.add_blacklist_entry(payload.entry_type, payload.value, payload.reason)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.delete("/api/admin/blacklist/{entry_id}", dependencies=[Depends(require_admin)])
    def delete_blacklist(entry_id: str) -> dict:
        store.remove_blacklist_entry(entry_id)
        return {"status": "removed", "id": entry_id}

    @app.get("/api/admin/system/settings", dependencies=[Depends(require_admin)])
    def get_system_settings() -> dict:
        return {
            "submissions_frozen": store.get_system_setting("submissions_frozen", "false") == "true",
            "active_target_name": store.get_system_setting("active_target_name", "Official Summer Test Run"),
        }

    @app.post("/api/admin/system/settings", dependencies=[Depends(require_admin)])
    def update_system_setting(payload: SystemSettingRequest) -> dict:
        store.set_system_setting(payload.key, payload.value)
        return {"key": payload.key, "value": payload.value}

    @app.get("/api/admin/audit-logs", dependencies=[Depends(require_admin)])
    def list_audit_logs() -> list[dict]:
        return store.list_audit_events(limit=50)

    @app.get("/api/admin/export/csv", dependencies=[Depends(require_admin)])
    def export_csv() -> Response:
        csv_data = store.export_leaderboard_csv()
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=blt_benchmark_leaderboard.csv"},
        )

    @app.get("/api/admin/health", dependencies=[Depends(require_admin)])
    def admin_health() -> dict:
        return store.health(
            data_dir=resolved_settings.data_dir,
            ground_truth_path=resolved_settings.ground_truth_path,
            app_version=resolved_settings.app_version,
        )

    _mount_static(app, resolved_settings.static_dir)
    return app


async def _save_upload(upload: UploadFile, settings: Settings) -> Path:
    upload_dir = settings.data_dir / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(upload.filename or "trajectory.txt").name
    upload_path = upload_dir / f"{uuid4().hex}-{safe_name}"
    total = 0
    with upload_path.open("wb") as handle:
        while chunk := await upload.read(1024 * 1024):
            total += len(chunk)
            if total > settings.max_upload_bytes:
                handle.close()
                upload_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Trajectory upload exceeds 25 MB.")
            handle.write(chunk)
    return upload_path


def _public_submission_status(submission: dict) -> dict:
    return {
        "id": submission["id"],
        "team": submission["team"],
        "method": submission["method"],
        "category": submission["category"],
        "status": submission["status"],
        "publication_state": submission["publication_state"],
        "attempt_number": submission["attempt_number"],
        "is_baseline": submission.get("is_baseline", 0),
        "created_at": submission["created_at"],
        "updated_at": submission["updated_at"],
        "result": submission["result"],
    }


def _mount_static(app: FastAPI, static_dir: Path) -> None:
    if not static_dir.exists():
        return
    assets = static_dir / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        candidate = static_dir / path
        if path and candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(static_dir / "index.html")
