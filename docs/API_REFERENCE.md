# API Reference - BLT SLAM Benchmark Server

The **BLT SLAM Benchmark Server** provides REST API endpoints for fetching public leaderboards, submitting odometry trajectory files, and querying private evaluation status.

---

## Public Endpoints

### 1. Fetch Public Leaderboards
Retrieves the official category rankings (`lidar`, `vision`) and combined view ordered by Absolute Trajectory Error (ATE RMSE).

- **Method**: `GET`
- **Path**: `/api/leaderboards`
- **Response**: `200 OK`
```json
{
  "lidar": [
    {
      "rank": 1,
      "submission_id": "8f3b2a...",
      "team": "RowMapper",
      "method": "ICP Rows",
      "category": "lidar",
      "ate_rmse": 0.18,
      "rpe_rmse": 0.041,
      "alignment": "se3",
      "attempt_number": 1,
      "published_at": "2026-05-18T10:00:00Z"
    }
  ],
  "vision": [],
  "combined": []
}
```

---

### 2. Submit Trajectory Odometry
Uploads a TUM trajectory text file for live evaluation against server-side private ground truth.

- **Method**: `POST`
- **Path**: `/api/submissions`
- **Content-Type**: `multipart/form-data`
- **Form Parameters**:
  - `contact_email` *(string, required)*: Participant contact email address.
  - `team` *(string, required)*: Team or institutional affiliation.
  - `method` *(string, required)*: SLAM algorithm name.
  - `category` *(string, required)*: `lidar` or `vision`.
  - `trajectory` *(file, required)*: TUM format text file (`.txt`, `.tum`). Max size 25 MB.
  - `training_runs` *(string, optional)*: Public runs used for training/tuning.
  - `link` *(string, optional)*: Code repository or paper URL.
  - `notes` *(string, optional)*: Additional method description.

- **Response**: `201 Created`
```json
{
  "id": "c71a9b2...",
  "token": "secret-status-token",
  "status": "queued",
  "attempt_number": 1,
  "remaining_attempts": 4,
  "status_url": "https://benchmark.lcas.lincoln.ac.uk/submissions/c71a9b2...?token=secret-status-token"
}
```

- **Error Responses**:
  - `400 Bad Request`: Invalid file format or missing required fields.
  - `429 Too Many Requests`: IP rate limit or email category attempt quota exceeded.

---

### 3. Query Submission Status
Queries evaluation progress and benchmark metrics for a private submission.

- **Method**: `GET`
- **Path**: `/api/submissions/{id}?token={token}`
- **Response**: `200 OK`
```json
{
  "id": "c71a9b2...",
  "team": "Lincoln Robotics",
  "method": "SummerGraph",
  "category": "lidar",
  "status": "published",
  "publication_state": "published",
  "attempt_number": 1,
  "created_at": "2026-08-18T12:00:00Z",
  "updated_at": "2026-08-18T12:00:05Z",
  "result": {
    "ate_rmse": 0.18,
    "rpe_rmse": 0.041,
    "alignment": "se3"
  }
}
```

---

## TUM Trajectory File Specification

Uploads must follow the standard **TUM Odometry Text Format**:
- Space-delimited plain text file (`.txt` or `.tum`).
- 8 numerical columns per pose row:
  ```
  # timestamp x y z qx qy qz qw
  1648000000.0000 0.0000 0.0000 0.0000 0.0000 0.0000 0.0000 1.0000
  1648000000.0500 0.1000 0.0200 0.0010 0.0000 0.0000 0.0100 0.9999
  ```
