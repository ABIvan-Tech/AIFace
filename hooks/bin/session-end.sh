#!/bin/sh
set -eu

INPUT=$(cat || true)
LOG_DIR=".tmp/copilot-hooks"
LOG_FILE="$LOG_DIR/session-end.jsonl"

mkdir -p "$LOG_DIR"

if ! command -v jq >/dev/null 2>&1; then
  echo "WARNING: jq not found. Session logging is disabled." >&2
  printf '%s\n' "$INPUT" >> "$LOG_FILE"
else
  printf '%s' "$INPUT" | jq -c '.' >> "$LOG_FILE" 2>/dev/null || printf '%s\n' "$INPUT" >> "$LOG_FILE"
fi

exit 0
