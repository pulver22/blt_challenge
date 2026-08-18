# Administrator Guide - BLT SLAM Benchmark Server

This guide explains how to administer the **BLT SLAM Benchmark Challenge** platform, manage submission quotas, override rate limits, block abusive accounts/IPs, moderate leaderboard entries, inspect raw evaluation logs, and export benchmark data.

---

## 1. Accessing the Admin Portal

The Administrator Portal is available on the web frontend at `/admin`.

### Authentication
Administrative actions require the `BLT_ADMIN_TOKEN` configured in your `.env` file.

- **Web GUI**: Enter your admin token in the password field at `/admin` and click **Refresh**.
- **REST API**: Pass the HTTP header `X-Admin-Token: <your-token>` with administrative API requests.

---

## 2. Advanced Administrator Control Suite

### 1. Quota Extension Tool
Search any team's contact email address and grant extra submission attempts (+5 or custom number) for `lidar` or `vision` categories directly from the GUI without server restarts.

### 2. Access & Blacklist Control
Block malicious email addresses or spamming IP addresses directly from the UI. Entries are recorded in SQLite `blacklist_entries` and instantly reject upload requests with an `HTTP 403 Forbidden` response.

### 3. Global Submissions Freeze Switch
Click **Freeze Submissions** in the top toolbar to temporarily block all incoming participant uploads (e.g., during evaluation dataset maintenance or ground truth updates).

### 4. Job Retry & Log Inspector Modal
- **Retry**: Re-enqueue any failed or queued submission with one click (`POST /api/admin/submissions/{id}/retry`).
- **Inspect**: Open a formatted popup modal showing raw `evo` stdout, stderr, failure tracebacks, raw JSON metrics, and a direct download button for the participant's uploaded `.txt` trajectory file.

### 5. Official Baseline Tagging
Toggle an **"Official Baseline"** badge on benchmark entries to highlight reference SLAM baselines (e.g. ORB-SLAM or LIO-SAM) on the public leaderboard.

### 6. Audit Trail Log & Leaderboard CSV Export
- **Audit Log**: Click **Audit Log** to inspect an interactive table of all administrative operations (moderation events, token creations, quota extensions).
- **Export Leaderboard CSV**: Click **Export Leaderboard CSV** for a one-click downloadable `.csv` file containing all ranked submission metrics, method descriptions, and timestamp metadata.

---

## 3. Administrative API Endpoints

| Method | Path | Description | Required Header |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/health` | Returns evaluation queue length, disk usage, evo toolchain status, and freeze state. | `X-Admin-Token` |
| `GET` | `/api/admin/submissions` | Lists all participant submissions with contact emails, baseline tags, and status. | `X-Admin-Token` |
| `POST` | `/api/admin/submissions/{id}/publish` | Marks a submission as published on the public leaderboard. | `X-Admin-Token` |
| `POST` | `/api/admin/submissions/{id}/hide` | Hides a submission from the public leaderboard. | `X-Admin-Token` |
| `POST` | `/api/admin/submissions/{id}/retry` | Re-enqueues a submission for evaluation (`status = queued`). | `X-Admin-Token` |
| `DELETE` | `/api/admin/submissions/{id}` | Permanently deletes a submission and cleans up disk files. | `X-Admin-Token` |
| `POST` | `/api/admin/submissions/{id}/baseline` | Toggles the Official Baseline tag on a submission. | `X-Admin-Token` |
| `GET` | `/api/admin/submissions/{id}/logs` | Returns failure log traceback and raw `evo` JSON metrics. | `X-Admin-Token` |
| `GET` | `/api/admin/submissions/{id}/download` | Downloads the participant's original uploaded `.txt` trajectory file. | `X-Admin-Token` |
| `POST` | `/api/admin/quotas/reset` | Resets or extends category attempt quotas for a contact email. | `X-Admin-Token` |
| `GET` | `/api/admin/blacklist` | Lists active email and IP blacklist entries. | `X-Admin-Token` |
| `POST` | `/api/admin/blacklist` | Adds an email address or IP address to the blacklist. | `X-Admin-Token` |
| `DELETE` | `/api/admin/blacklist/{id}` | Removes a blacklist entry. | `X-Admin-Token` |
| `GET` | `/api/admin/system/settings` | Fetches global system settings (e.g. `submissions_frozen`). | `X-Admin-Token` |
| `POST` | `/api/admin/system/settings` | Updates a global system setting. | `X-Admin-Token` |
| `GET` | `/api/admin/audit-logs` | Retrieves recent administrative audit events. | `X-Admin-Token` |
| `GET` | `/api/admin/export/csv` | Downloads all public leaderboard results as a formatted `.csv` file. | `X-Admin-Token` |
