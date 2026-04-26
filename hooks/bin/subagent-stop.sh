#!/bin/sh
set -eu

INPUT=$(cat || true)
LOG_DIR=".tmp/copilot-hooks"
BLOCK_LOG="$LOG_DIR/subagent-stop-blocks.log"

mkdir -p "$LOG_DIR"
printf '%s\n' "$INPUT" >> "$LOG_DIR/subagent-stop.jsonl"

if ! command -v jq >/dev/null 2>&1; then
  echo "WARNING: jq not found. Subagent output validation is disabled." >&2
  exit 0
fi

SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.sessionId // .input.sessionId // .session.id // ""')
TRANSCRIPT_PATH=$(printf '%s' "$INPUT" | jq -r '.transcriptPath // .input.transcriptPath // ""')

block() {
  reason=$1
  validation_hash=$(printf '%s' "$VALIDATION_TEXT" | cksum | awk '{print $1 ":" $2}')
  state_key="$SESSION_ID|$AGENT_NAME_LC|$reason|$validation_hash"
  printf '%s\n' "$state_key" >> "$BLOCK_LOG"
  repeated_count=$(grep -Fxc "$state_key" "$BLOCK_LOG" 2>/dev/null || true)
  # Prevent pathological retry loops when the runtime keeps resubmitting the same rejected output.
  if [ "${repeated_count:-0}" -ge 3 ]; then
    printf '%s\n' "$state_key" >> "$LOG_DIR/subagent-stop-bypassed.log"
    exit 0
  fi
  jq -nc --arg reason "$reason" '{decision:"block", reason:$reason}'
  exit 0
}

AGENT_NAME=$(printf '%s' "$INPUT" | jq -r '.agentName // .input.agentName // .subagentName // .agent.name // ""')
AGENT_NAME_LC=$(printf '%s' "$AGENT_NAME" | tr '[:upper:]' '[:lower:]')
PAYLOAD_TEXT=$(printf '%s' "$INPUT" | jq -r '.message // .output // .response // ""')

resolve_validation_text() {
  if [ -n "$PAYLOAD_TEXT" ]; then
    printf '%s' "$PAYLOAD_TEXT"
    return 0
  fi

  if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
    return 0
  fi

  # In real Copilot CLI hook payloads the agent response lives in transcriptPath, not in the hook JSON itself.
  tool_call_id=$(jq -Rrsc --arg agent "$AGENT_NAME_LC" '
    def events:
      split("\n")
      | map(select(length > 0) | fromjson?);
    [
      events[]
      | select(.type == "subagent.started")
      | select(((.data.agentName // .data.agentDisplayName // "") | ascii_downcase) == $agent)
      | .data.toolCallId
    ] | last // ""
  ' "$TRANSCRIPT_PATH")

  if [ -z "$tool_call_id" ]; then
    return 0
  fi

  jq -Rrsc --arg tool_call_id "$tool_call_id" '
    def events:
      split("\n")
      | map(select(length > 0) | fromjson?);
    [
      events[]
      | select(.type == "assistant.message")
      | select((.data.parentToolCallId // "") == $tool_call_id)
      | .data.content // ""
      | select(length > 0)
    ] | last // ""
  ' "$TRANSCRIPT_PATH"
}

VALIDATION_TEXT=$(resolve_validation_text)
if [ -z "$VALIDATION_TEXT" ]; then
  VALIDATION_TEXT=$(printf '%s' "$INPUT" | jq -r '[.. | strings] | join("\n")')
fi

ALL_TEXT=$VALIDATION_TEXT

if printf '%s' "$AGENT_NAME_LC" | grep -q 'planner'; then
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Clarification Status:[[:space:]]+(COMPLETE|INCOMPLETE)'; then
    block "Planner output must include Clarification Status: COMPLETE or Clarification Status: INCOMPLETE."
  fi
  if printf '%s' "$ALL_TEXT" | grep -Eq 'Clarification Status:[[:space:]]+COMPLETE'; then
    if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Known Facts'; then
      block "Planner marked COMPLETE without Known Facts section."
    fi
    if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Open Assumptions'; then
      block "Planner marked COMPLETE without Open Assumptions section."
    fi
    if ! printf '%s' "$ALL_TEXT" | grep -Eq 'User-Equivalent Verification'; then
      block "Planner output marked complete must include User-Equivalent Verification."
    fi
    if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Artifact Ownership'; then
      block "Planner output marked complete must include Artifact Ownership."
    fi
    if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Execution Path / Causal Path'; then
      block "Planner output marked complete must include Execution Path / Causal Path."
    fi
    if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Rubber-Duck Recommendation:[[:space:]]+(RECOMMENDED|OPTIONAL|SKIP)'; then
      block "Planner output marked complete must include Rubber-Duck Recommendation: RECOMMENDED, OPTIONAL, or SKIP."
    fi
    if printf '%s' "$ALL_TEXT" | grep -Eq 'Parallelization Decision:[[:space:]]*/fleet|Status:[[:space:]]*ENABLED'; then
      if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Ownership Plan'; then
        block "Planner output enabling parallel work must include Ownership Plan."
      fi
    fi
  fi
fi

if printf '%s' "$AGENT_NAME_LC" | grep -q 'implementer'; then
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Changes Made'; then
    block "Implementer output must include Changes Made."
  fi
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Validation'; then
    block "Implementer output must include Validation."
  fi
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Files Owned'; then
    block "Implementer output must include Files Owned."
  fi
fi

if printf '%s' "$AGENT_NAME_LC" | grep -q 'debugger'; then
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Reproduction'; then
    block "Debugger output must include Reproduction."
  fi
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Proof of Reachability'; then
    block "Debugger output must include Proof of Reachability."
  fi
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Root Cause'; then
    block "Debugger output must include Root Cause."
  fi
fi

if printf '%s' "$AGENT_NAME_LC" | grep -q 'verifier'; then
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Verification Verdict:[[:space:]]+(PASS|BLOCKED)'; then
    block "Verifier output must include Verification Verdict: PASS or Verification Verdict: BLOCKED."
  fi
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Primary Verification Path'; then
    block "Verifier output must include Primary Verification Path."
  fi
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Commands Run'; then
    block "Verifier output must include Commands Run."
  fi
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Parity With User Workflow'; then
    block "Verifier output must include Parity With User Workflow."
  fi
fi

if printf '%s' "$AGENT_NAME_LC" | grep -q 'memory'; then
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Memory Transaction Successful:|Memory Update:[[:space:]]+SKIP'; then
    block "Memory-curator output must include a successful memory transaction or an explicit skip."
  fi
fi

if printf '%s' "$ALL_TEXT" | grep -q 'Implementation Readiness:'; then
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Implementation Readiness:[[:space:]]+(PASS|BLOCKED)'; then
    block "Readiness output must include Implementation Readiness: PASS or Implementation Readiness: BLOCKED."
  fi
fi

if printf '%s' "$ALL_TEXT" | grep -q 'Verification Verdict:'; then
  if ! printf '%s' "$ALL_TEXT" | grep -Eq 'Verification Verdict:[[:space:]]+(PASS|BLOCKED)'; then
    block "Verification output uses the verdict marker but not an allowed value."
  fi
fi

exit 0
