import threading
import time
from pathlib import Path

from backend.config import Settings
from backend.evaluator import EvaluationError, run_evaluation
from backend.store import Store


class EvaluationWorker:
    def __init__(self, *, store: Store, settings: Settings):
        self.store = store
        self.settings = settings
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, name="evaluation-worker", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=5)

    def _run(self) -> None:
        while not self._stop.is_set():
            job = self.store.claim_next_queued()
            if job is None:
                self._stop.wait(self.settings.worker_poll_seconds)
                continue
            self.evaluate_once(job)

    def evaluate_once(self, job: dict) -> None:
        artifact_dir = self.settings.data_dir / "results" / job["id"]
        try:
            metrics = run_evaluation(
                category=job["category"],
                ground_truth_path=self.settings.ground_truth_path,
                trajectory_path=Path(job["upload_path"]),
                output_dir=artifact_dir,
                timestamp_tolerance=self.settings.timestamp_tolerance,
                timeout_seconds=self.settings.evo_timeout_seconds,
            )
            self.store.record_result(
                job["id"],
                ate_rmse=float(metrics["ate_rmse"]),
                rpe_rmse=float(metrics["rpe_rmse"]),
                alignment=str(metrics["alignment"]),
                artifact_path=str(artifact_dir),
                raw_metrics=metrics,
            )
            self.store.update_submission_status(job["id"], "pending_review")
        except EvaluationError as exc:
            failure_dir = self.settings.data_dir / "failures"
            failure_dir.mkdir(parents=True, exist_ok=True)
            (failure_dir / f"{job['id']}.log").write_text(str(exc), encoding="utf-8")
            self.store.update_submission_status(job["id"], "failed_evo")
        except Exception as exc:
            failure_dir = self.settings.data_dir / "failures"
            failure_dir.mkdir(parents=True, exist_ok=True)
            (failure_dir / f"{job['id']}.log").write_text(repr(exc), encoding="utf-8")
            self.store.update_submission_status(job["id"], "failed_evo")


def run_worker_forever(store: Store, settings: Settings) -> None:
    worker = EvaluationWorker(store=store, settings=settings)
    worker.start()
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        worker.stop()
