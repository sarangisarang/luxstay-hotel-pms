#!/usr/bin/env bash
# PostgreSQL backup script for HotelBooking PMS.
# Usage:
#   ./scripts/backup.sh              — dump to ./backups/
#   ./scripts/backup.sh restore <file> — restore from a dump file
#
# Requires: pg_dump / psql, gzip
# Env vars read from .env if present (or environment).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present (production uses real env vars)
if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)
fi

DB_NAME="${DB_NAME:-booking}"
DB_USER="${DB_USER:-booking_user}"
DB_PASS="${DB_PASS:-1234}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"

BACKUP_DIR="$ROOT_DIR/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="$BACKUP_DIR/booking_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# ── Restore mode ──────────────────────────────────────────────────────────────
if [[ "${1:-}" == "restore" ]]; then
  RESTORE_FILE="${2:-}"
  if [[ -z "$RESTORE_FILE" || ! -f "$RESTORE_FILE" ]]; then
    echo "Usage: $0 restore <path-to-dump.sql.gz>"
    exit 1
  fi
  echo "Restoring $RESTORE_FILE → $DB_NAME …"
  PGPASSWORD="$DB_PASS" gunzip -c "$RESTORE_FILE" | \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
  echo "Restore complete."
  exit 0
fi

# ── Backup mode ───────────────────────────────────────────────────────────────
echo "Backing up $DB_NAME → $DUMP_FILE …"
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  --no-password \
  --format=plain \
  --clean \
  --if-exists \
  "$DB_NAME" | gzip > "$DUMP_FILE"

SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
echo "Done. Size: $SIZE"

# Keep last 14 daily backups
find "$BACKUP_DIR" -name "booking_*.sql.gz" -mtime +14 -delete
echo "Old backups pruned (>14 days)."
