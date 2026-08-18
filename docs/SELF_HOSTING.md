# Self-Hosting Guide - BLT SLAM Benchmark Server

This guide provides instructions for deploying and self-hosting the **BLT SLAM Benchmark Challenge** platform in production environments using Docker or standalone Linux servers.

---

## System Requirements

- **Operating System**: Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL / macOS)
- **Container Runtime**: Docker 24+ & Docker Compose v2+
- **Hardware Minimum**: 2 CPU cores, 4 GB RAM, 10 GB disk space
- **Dependencies (for bare-metal execution)**:
  - Python 3.10+
  - Node.js 20+
  - `evo` Python benchmark package (`pip install evo --upgrade`)

---

## 1. Quick Production Deployment (Docker Compose)

The easiest way to self-host the benchmark server is using Docker Compose.

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/lincoln/blt_benchmark.git
cd blt_benchmark
cp .env.example .env
```

Edit `.env` to set production settings:
```env
# Required Security & Base URL Settings
BLT_ADMIN_TOKEN=your-secure-random-admin-token-here
BLT_PUBLIC_BASE_URL=https://benchmark.yourdomain.org

# Benchmark Ground Truth Location
BLT_GROUND_TRUTH_PATH=groundtruth/official_tum.txt

# Autonomous Quotas & Rate Limits
BLT_ATTEMPT_LIMIT_PER_CATEGORY=5
BLT_IP_RATE_LIMIT_PER_HOUR=5

# Admin Email & SMTP Notification Settings
BLT_ADMIN_EMAIL=rpolvara@lincoln.ac.uk
BLT_SMTP_FROM=rpolvara@lincoln.ac.uk
BLT_SMTP_HOST=mail.yourdomain.org
BLT_SMTP_PORT=587
BLT_SMTP_USER=smtp-user
BLT_SMTP_PASSWORD=smtp-password
```

### Step 2: Mount Hidden Ground Truth
Place your unreleased private evaluation trajectory (`.txt` in TUM format) at:
```bash
groundtruth/official_tum.txt
```
*(Ensure this file remains outside public static directories)*.

### Step 3: Build & Launch Services
```bash
docker compose up --build -d
```

The application will build the React frontend bundle, launch the FastAPI server, initialize SQLite database schemas, and start the background evaluation worker on port `8000`.

---

## 2. Environment Configuration Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `BLT_ADMIN_TOKEN` | Administrative authentication token used for `/admin` access and moderation headers (`X-Admin-Token`). | `change-me` |
| `BLT_PUBLIC_BASE_URL` | Public HTTPS base URL used when returning private submission status links. | `""` |
| `BLT_GROUND_TRUTH_PATH` | Path to private ground truth trajectory text file. | `groundtruth/official_tum.txt` |
| `BLT_ATTEMPT_LIMIT_PER_CATEGORY` | Hard quota of evaluated attempts allowed per email address per category (`lidar`/`vision`). | `5` |
| `BLT_IP_RATE_LIMIT_PER_HOUR` | Maximum submissions allowed per IP address per hour (set `0` to disable). | `5` |
| `BLT_IP_WHITELIST` | Comma-separated list of IP addresses exempt from rate limiting (e.g. `137.222.1.1,137.222.1.2`). | `""` |
| `BLT_ADMIN_EMAIL` | Admin recipient email address for published submission notifications. | `rpolvara@lincoln.ac.uk` |
| `BLT_SMTP_HOST` | Hostname of outbound SMTP server. If empty, emails fall back to console logging. | `""` |
| `BLT_SMTP_PORT` | SMTP port (typically `587` for STARTTLS or `465` for SSL). | `587` |
| `BLT_SMTP_USER` | Username for SMTP server authentication. | `""` |
| `BLT_SMTP_PASSWORD` | Password for SMTP server authentication. | `""` |
| `BLT_SMTP_FROM` | Sender address in outbound notification emails. | `rpolvara@lincoln.ac.uk` |
| `BLT_EVO_TIMEOUT_SECONDS` | Maximum seconds allowed for single `evo` execution before timing out. | `600` |

---

## 3. Reverse Proxy & TLS Setup

For production hosting, place a reverse proxy in front of port `8000`.

### Nginx Example (`/etc/nginx/sites-available/blt-benchmark`)
```nginx
server {
    listen 80;
    server_name benchmark.yourdomain.org;
    return 310 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name benchmark.yourdomain.org;

    ssl_certificate /etc/letsencrypt/live/benchmark.yourdomain.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/benchmark.yourdomain.org/privkey.pem;

    client_max_body_size 30M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Backups & Maintenance

Run automated database and artifact backups using the included backup script:

```bash
bash scripts/backup.sh
```

By default, timestamped backups are stored in `backups/`.

### Automated Cron Backup Example
To schedule daily backups at 02:15 AM:
```cron
15 2 * * * cd /opt/blt_benchmark && bash scripts/backup.sh >> /var/log/blt_backup.log 2>&1
```
