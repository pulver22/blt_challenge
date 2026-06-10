from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config import Settings
from backend.store import AttemptLimitExceeded, Store
from backend.validation import TrajectoryValidationError, validate_tum_file
from backend.worker import EvaluationWorker


class InviteCreateRequest(BaseModel):
    team_label: str


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
        allow_methods=["GET", "POST"],
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
        invite_code: str = Form(...),
        contact_email: str = Form(...),
        team: str = Form(...),
        method: str = Form(...),
        category: str = Form(...),
        training_runs: str = Form(""),
        link: str = Form(""),
        notes: str = Form(""),
        trajectory: UploadFile = File(...),
    ) -> dict:
        invite = store.find_active_invite(invite_code)
        if invite is None:
            raise HTTPException(status_code=403, detail="Invalid or disabled invite code.")
        if category not in {"lidar", "vision"}:
            raise HTTPException(status_code=400, detail="Category must be lidar or vision.")
        if not trajectory.filename or not trajectory.filename.lower().endswith(".txt"):
            raise HTTPException(status_code=400, detail="Upload a TUM .txt trajectory file.")

        upload_path = await _save_upload(trajectory, resolved_settings)
        try:
            validation_summary = validate_tum_file(upload_path)
        except TrajectoryValidationError as exc:
            store.create_submission(
                invite_code_id=invite["id"],
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
            submission = store.create_submission(
                invite_code_id=invite["id"],
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

        status_path = f"/submissions/{submission['id']}?token={submission['token']}"
        return {
            "id": submission["id"],
            "token": submission["token"],
            "status": submission["status"],
            "attempt_number": submission["attempt_number"],
            "remaining_attempts": store.remaining_attempts(invite["id"], category),
            "status_url": f"{resolved_settings.public_base_url}{status_path}" if resolved_settings.public_base_url else status_path,
        }

    @app.get("/api/submissions/{submission_id}")
    def submission_status(submission_id: str, token: str) -> dict:
        submission = store.get_submission_for_token(submission_id, token)
        if submission is None:
            raise HTTPException(status_code=404, detail="Submission not found.")
        return _public_submission_status(submission)

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
