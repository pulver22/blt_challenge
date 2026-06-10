#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${BLT_BACKUP_SOURCE_DIR:-$ROOT_DIR/var}"
BACKUP_DIR="${BLT_BACKUP_DIR:-$ROOT_DIR/backups}"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
DEST="$BACKUP_DIR/$STAMP"

mkdir -p "$DEST"

if [[ -f "$SOURCE_DIR/app.db" ]]; then
  python3 - "$SOURCE_DIR/app.db" "$DEST/app.db" <<'PY'
import sqlite3
import sys

source = sqlite3.connect(sys.argv[1])
target = sqlite3.connect(sys.argv[2])
with target:
    source.backup(target)
source.close()
target.close()
PY
fi

if [[ -d "$SOURCE_DIR/data" ]]; then
  tar -C "$SOURCE_DIR" -czf "$DEST/data.tar.gz" data
fi

echo "Backup written to $DEST"
