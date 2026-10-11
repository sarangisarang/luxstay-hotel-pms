#!/usr/bin/env bash
# PostgreSQL backup script for the LuxStay PMS.
#
# Usage:
#   ./scripts/backup.sh                  — dump to $BACKUP_DIR (default: ~/luxstay-backups)
#   ./scripts/backup.sh restore <file>   — restore from a dump file
#
# Requires: pg_dump / psql, gzip
# Settings come from the environment, or from .env in the repository root.
#
# A dump contains guest personal data (names, emails, passport numbers) and
# password hashes. It must never be committed, so the backup folder has to be
# outside this repository; the script refuses to write inside it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Read the keys this script needs from a .env file without executing it.
# Handles inline comments ("KEY=value   # note") and optional surrounding
# quotes. Variables already set in the environment take precedence.
load_env_file() {
  local file="$1" line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip blank lines and full-line comments
    [[ -z "${line//[[:space:]]/}" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue
    key="${line%%=*}"
    key="${key//[[:space:]]/}"
    value="${line#*=}"
    # Drop an inline comment (a '#' preceded by whitespace)
    value="$(sed -E 's/[[:space:]]+#.*$//' <<< "$value")"
    # Trim whitespace and one pair of matching surrounding quotes
    value="$(sed -E "s/^[[:space:]]+//; s/[[:space:]]+\$//; s/^\"(.*)\"\$/\1/; s/^'(.*)'\$/\1/" <<< "$value")"
    case "$key" in
      DB_NAME|DB_USER|DB_PASS|DB_HOST|DB_PORT|BACKUP_DIR)
        if [[ -z "${!key:-}" ]]; then
          export "$key=$value"
        fi
        ;;
    esac
  done < "$file"
}

if [[ -f "$ROOT_DIR/.env" ]]; then
  load_env_file "$ROOT_DIR/.env"
fi

DB_NAME="${DB_NAME:-booking}"
DB_USER="${DB_USER:-booking_user}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
# No default password on purpose: a silent fallback hides a misconfiguration.
DB_PASS="${DB_PASS:?DB_PASS is not set. Add it to .env or export it before running this script.}"

BACKUP_DIR="${BACKUP_DIR:-$HOME/luxstay-backups}"

# Dumps hold personal data: create files readable by the current user only.
umask 077
mkdir -p "$BACKUP_DIR"

# Refuse a backup folder inside the repository, so a dump can never end up
# in a commit again.
BACKUP_DIR_ABS="$(cd "$BACKUP_DIR" && pwd -P)"
ROOT_DIR_ABS="$(cd "$ROOT_DIR" && pwd -P)"
if [[ "$BACKUP_DIR_ABS" == "$ROOT_DIR_ABS" || "$BACKUP_DIR_ABS" == "$ROOT_DIR_ABS"/* ]]; then
  echo "ERROR: BACKUP_DIR ($BACKUP_DIR_ABS) is inside the repository." >&2
  echo "       Database dumps contain personal data and must be stored outside it." >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="$BACKUP_DIR_ABS/booking_${TIMESTAMP}.sql.gz"

# ── Restore mode ──────────────────────────────────────────────────────────────
if [[ "${1:-}" == "restore" ]]; then
  RESTORE_FILE="${2:-}"
  if [[ -z "$RESTORE_FILE" || ! -f "$RESTORE_FILE" ]]; then
    echo "Usage: $0 restore <path-to-dump.sql.gz>"
    exit 1
  fi
  echo "Restoring $RESTORE_FILE → $DB_NAME …"
  gunzip -c "$RESTORE_FILE" | \
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
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

# Delete backups older than 14 days
find "$BACKUP_DIR_ABS" -name "booking_*.sql.gz" -mtime +14 -delete
echo "Old backups pruned (>14 days)."
