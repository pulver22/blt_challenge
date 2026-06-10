# BLT SLAM Challenge Live Beta

Self-hosted private beta website for a BLT dataset SLAM challenge.

The site presents a participant-first challenge flow:

- train SLAM methods on public BLT runs;
- run LiDAR or vision SLAM locally on a single official summer test run;
- upload generated odometry as TUM `.txt` trajectory files;
- evaluate submissions with `evo` against private ground truth on a Raspberry Pi;
- review completed results in an admin screen before publishing LiDAR, Vision, and exploratory Combined leaderboards.

The backend is a FastAPI service with SQLite persistence, filesystem artifacts, invite-code submissions, and a single background worker that runs one `evo` job at a time.

## Development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn backend.main:app --reload
```

For the complete upload flow, run the FastAPI service because it serves `/api/*` and the built frontend together in production.

## Devcontainer

For laptop development with VS Code Dev Containers or compatible tooling, reopen the repo in the included devcontainer. It installs Python 3.12, Node 22, `evo`, backend test dependencies, frontend dependencies, and creates ignored local runtime folders.

The devcontainer automatically starts both development servers when the container starts:

- Vite frontend on port `5173`
- FastAPI backend on port `8017`

Vite proxies `/api/*` to the backend on `8017`, so use the frontend URL for normal development.

Logs are written to `var/devcontainer/frontend.log` and `var/devcontainer/backend.log`.

To force-restart both servers manually after changing dev server configuration, run:

```bash
bash .devcontainer/start-dev.sh restart
```

For a production-like local run:

```bash
npm run build
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

The devcontainer forwards ports `5173`, `8017`, and `8000`. Optional local ground truth should be placed at the ignored path `groundtruth/official_tum.txt`.

## Configuration

Create `.env` from `.env.example` for Docker deployment. Important values:

- `BLT_ADMIN_TOKEN`: long random token used by `/admin`.
- `BLT_PUBLIC_BASE_URL`: reserved zrok public URL, used when returning private status links.
- `BLT_GROUND_TRUTH_PATH`: read-only TUM ground-truth file path inside the container.
- `BLT_MAX_UPLOAD_BYTES`: default `26214400` bytes.
- `BLT_EVO_TIMEOUT_SECONDS`: default `600`.

Ground truth should live outside public/static paths. With the provided Compose file, put it at:

```bash
groundtruth/official_tum.txt
```

## Raspberry Pi Deployment

Assumptions: Raspberry Pi OS 64-bit, Docker, and Docker Compose are available.

1. Copy `.env.example` to `.env` and set `BLT_ADMIN_TOKEN` plus `BLT_PUBLIC_BASE_URL`.
2. Place private ground truth at `groundtruth/official_tum.txt`.
3. Build and start the app:

```bash
docker compose up --build -d
```

4. Open `http://<pi-host>:8000/admin`, enter the admin token, and create invite codes.
5. Create a reserved zrok share that points to `http://127.0.0.1:8000`.
6. Share the zrok URL and per-team invite codes with beta participants.

## Backups

Run local snapshots on the Pi:

```bash
scripts/backup.sh
```

By default this writes timestamped backups under `backups/`. It copies SQLite with the SQLite backup API and archives uploaded/result artifacts from `var/data`.

For cron, use an absolute path, for example:

```cron
15 2 * * * cd /home/pi/blt_benchmark && /home/pi/blt_benchmark/scripts/backup.sh
```

## Verification

Frontend:

```bash
npm test -- --run
npm run build
```

Backend:

```bash
.venv/bin/pytest backend/tests
```

Docker smoke check:

```bash
docker compose up --build
curl http://127.0.0.1:8000/api/leaderboards
```
