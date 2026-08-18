# BLT SLAM Benchmark Challenge Server

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![evo](https://img.shields.io/badge/evo-Python_Benchmarking-FF6F00.svg?style=flat)](https://github.com/MichaelGrupp/evo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An automated benchmark platform for agricultural robotics SLAM algorithms. Participants train pipelines on public **BLT (Lincoln Agricultural Robotics)** dataset runs, generate 3D trajectory odometry locally, and submit TUM text trajectories for server-side evaluation against unreleased ground truth.

---

## Key Features

- **Automated Self-Service Submissions**: Direct trajectory uploads with instant format and client-side validation.
- **Server-Side Ground Truth Evaluation**: Evaluates Absolute Trajectory Error (ATE RMSE) and Relative Pose Error (RPE RMSE) using the [`evo`](https://github.com/MichaelGrupp/evo) package against withheld server-side ground truth.
- **Dual-Layer Rate Limiting & Quotas**: Built-in IP sliding-window rate limiting and email category quotas to prevent spam and queue flooding while permitting team collaboration.
- **Auto-Publishing & Email Alerts**: Automatically publishes evaluated results to the public leaderboard and dispatches email notifications to `rpolvara@lincoln.ac.uk`.
- **Modern Glassmorphic Web Interface**: Responsive Dark/Light theme, interactive visual analytics charts (`Recharts`), live evaluation auto-polling (`TanStack Query`), and drag-and-drop dropzone.

---

## Architecture Overview

```
BLT SLAM Benchmark Project Structure
├── backend/                  # FastAPI Application & Background Evaluation Engine
│   ├── app.py                # REST API Endpoints & Rate Limiting Logic
│   ├── config.py             # Server Settings & Environment Variable Loader
│   ├── email_service.py      # Outbound SMTP Admin Email Notifications
│   ├── evaluator.py          # evo CLI Benchmarking Wrapper
│   ├── store.py              # SQLite Persistence Engine & Audit Logging
│   └── worker.py             # Async Evaluation Queue Worker
├── src/                      # React 19 + TypeScript Frontend Application
│   ├── components/           # UI Components (Leaderboard, SubmissionPanel, AdminPanel)
│   ├── context/              # Dark/Light Theme Engine Context
│   ├── lib/                  # API Clients & Submission Validation
│   ├── pages/                # HomePage, SubmissionPage Views
│   └── styles.css            # Custom CSS Tokens & Glassmorphism Utilities
├── docs/                     # System Documentation
│   ├── SELF_HOSTING.md       # Self-Hosting, Docker & Production Deployment
│   ├── ADMINISTRATION.md     # Admin Guide, Rate Limit Overrides & Moderation
│   └── API_REFERENCE.md      # REST API Specification & Data Formats
└── docker-compose.yml        # Production Docker Container Orchestration
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Python 3.10+
- `evo` package installed (`pip install evo`)

### 1. Frontend Development Server
```bash
npm install
npm run dev
```
*(Runs Vite dev server on `http://localhost:5173` with API proxying to port `8017`)*.

### 2. Backend FastAPI Service
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn backend.main:app --reload --port 8017
```

---

## Production Deployment & Self-Hosting

The platform is fully containerized for production deployment.

```bash
# 1. Clone repository & configure environment
cp .env.example .env

# 2. Place private ground truth at
groundtruth/official_tum.txt

# 3. Launch with Docker Compose
docker compose up --build -d
```

For complete hosting instructions, Nginx reverse proxy configuration, and TLS setup, see the **[Self-Hosting Guide](docs/SELF_HOSTING.md)**.

---

## Documentation Index

- 📘 **[Self-Hosting Guide](docs/SELF_HOSTING.md)**: Deployment steps, Docker configuration, Nginx setup, backups, and environment variables reference.
- 🔑 **[Administration Guide](docs/ADMINISTRATION.md)**: Admin token authentication, overriding rate limits, email quota management, and moderation controls.
- 📡 **[API Reference](docs/API_REFERENCE.md)**: Complete REST API endpoint documentation and TUM trajectory format specifications.

---

## Testing & Verification

Run the test suite across backend and frontend services:

```bash
# Frontend Unit Tests (Vitest)
npm test -- --run

# Frontend Production Build Check
npm run build

# Backend Test Suite (Pytest)
.venv/bin/pytest backend/tests
```

---

## License

Distributed under the [MIT License](LICENSE).
