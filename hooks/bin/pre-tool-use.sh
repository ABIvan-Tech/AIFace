#!/bin/sh
set -eu

INPUT=$(cat || true)

if ! command -v jq >/dev/null 2>&1; then
  echo "WARNING: jq not found. Repository hooks are inactive. Security guardrails are NOT being enforced." >&2
  exit 0
fi

deny() {
  jq -nc --arg reason "$1" \
    '{permissionDecision:"deny", permissionDecisionReason:$reason}'
  exit 0
}

TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.toolName // ""')

if [ "$TOOL_NAME" = "bash" ]; then
  COMMAND=$(printf '%s' "$INPUT" | jq -r '.toolArgs.command // ""')

  if printf '%s' "$COMMAND" | grep -Eiq '(^|[[:space:]])sudo([[:space:]]|$)|git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-fd|rm[[:space:]]+-rf[[:space:]]+/|mkfs|dd[[:space:]]+if=|chmod[[:space:]]+-R[[:space:]]+777|curl[^|]*\|[[:space:]]*(sh|bash)|wget[^|]*\|[[:space:]]*(sh|bash)'; then
    deny "Blocked by repository hook: dangerous shell pattern detected."
  fi

  if printf '%s' "$COMMAND" | grep -Eq 'git[[:space:]]+-C[[:space:]]+' \
    && printf '%s' "$COMMAND" | grep -Eq '(^|[^0-9])>>?[[:space:]]*[^[:space:]&/]'; then
    deny "Blocked by repository hook: git -C with relative shell redirection writes outside the target repo. Use an absolute output path or read stdout directly."
  fi
fi

case "$TOOL_NAME" in
  edit|create)
    if printf '%s' "$INPUT" | jq -r '.toolArgs | .. | strings' | grep -Eq '(^|/)\.git(/|$)|(^|/)\.github/hooks(/|$)|(^|/)\.env($|\.)|\.pem$|\.key$|\.crt$|\.p12$|(^|/)\.ssh(/|$)'; then
      deny "Blocked by repository hook: sensitive path edit requires explicit human handling."
    fi
    ;;
esac

if [ "$TOOL_NAME" = "create" ]; then
  CREATE_PATH=$(printf '%s' "$INPUT" | jq -r '.toolArgs.path // .arguments.path // ""')
  if [ -n "$CREATE_PATH" ] && [ -e "$CREATE_PATH" ]; then
    deny "Blocked by repository hook: create target already exists. Read it first, then use edit/update semantics or choose a new path."
  fi
fi

exit 0
