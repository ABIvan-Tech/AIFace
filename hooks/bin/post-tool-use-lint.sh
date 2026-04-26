#!/bin/sh
set -eu

# Universal post-tool-use linter hook.
# Runs the appropriate linter after file edit/create operations.
# Auto-detects project type by scanning for marker files.
#
# Supported project types:
#   Node.js / TypeScript  (package.json)
#   Python                (pyproject.toml, setup.py, setup.cfg)
#   Go                    (go.mod)
#   Rust                  (Cargo.toml)
#   Kotlin / Android      (build.gradle.kts, build.gradle)
#   Swift / iOS           (Package.swift, *.xcodeproj)
#
# If no linter is found, the hook exits silently (no block).

INPUT=$(cat || true)

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.toolName // ""')

# Only lint after file-modifying tools
case "$TOOL_NAME" in
  edit|create|editFiles|insert|replace) ;;
  *) exit 0 ;;
esac

# Extract the edited file path
EDITED_FILE=$(printf '%s' "$INPUT" | jq -r '
  .toolArgs.path //
  .toolArgs.file //
  .toolArgs.filePath //
  .arguments.path //
  ""
')

if [ -z "$EDITED_FILE" ]; then
  exit 0
fi

# Determine file extension
EXT="${EDITED_FILE##*.}"

# Walk up from the edited file to find the project root and type
find_project_root() {
  dir=$(dirname "$EDITED_FILE")
  # Resolve to absolute if relative
  case "$dir" in
    /*) ;;
    *)  dir="$(pwd)/$dir" ;;
  esac

  while [ "$dir" != "/" ]; do
    # Node.js / TypeScript
    if [ -f "$dir/package.json" ]; then
      echo "node:$dir"
      return 0
    fi
    # Python
    if [ -f "$dir/pyproject.toml" ] || [ -f "$dir/setup.py" ] || [ -f "$dir/setup.cfg" ]; then
      echo "python:$dir"
      return 0
    fi
    # Go
    if [ -f "$dir/go.mod" ]; then
      echo "go:$dir"
      return 0
    fi
    # Rust
    if [ -f "$dir/Cargo.toml" ]; then
      echo "rust:$dir"
      return 0
    fi
    # Kotlin / Android (Gradle)
    if [ -f "$dir/build.gradle.kts" ] || [ -f "$dir/build.gradle" ]; then
      echo "kotlin:$dir"
      return 0
    fi
    # Swift
    if [ -f "$dir/Package.swift" ]; then
      echo "swift:$dir"
      return 0
    fi
    # Erlang
    if [ -f "$dir/rebar.config" ] || [ -f "$dir/erlang.mk" ]; then
      echo "erlang:$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done

  echo "unknown:"
  return 0
}

PROJECT_INFO=$(find_project_root)
PROJECT_TYPE="${PROJECT_INFO%%:*}"
PROJECT_ROOT="${PROJECT_INFO#*:}"

if [ "$PROJECT_TYPE" = "unknown" ] || [ -z "$PROJECT_ROOT" ]; then
  exit 0
fi

LINT_OUTPUT=""
LINT_EXIT=0

run_lint() {
  case "$PROJECT_TYPE" in

    node)
      # Try project-local eslint first, then npx, then npm run lint
      if [ -f "$PROJECT_ROOT/node_modules/.bin/eslint" ]; then
        LINT_OUTPUT=$("$PROJECT_ROOT/node_modules/.bin/eslint" --no-error-on-unmatched-pattern --format compact "$EDITED_FILE" 2>&1) || LINT_EXIT=$?
      elif command -v npx >/dev/null 2>&1 && [ -f "$PROJECT_ROOT/package.json" ] && grep -q '"eslint"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
        LINT_OUTPUT=$(cd "$PROJECT_ROOT" && npx --no-install eslint --no-error-on-unmatched-pattern --format compact "$EDITED_FILE" 2>&1) || LINT_EXIT=$?
      elif [ -f "$PROJECT_ROOT/package.json" ] && jq -e '.scripts.lint' "$PROJECT_ROOT/package.json" >/dev/null 2>&1; then
        LINT_OUTPUT=$(cd "$PROJECT_ROOT" && npm run lint --silent 2>&1) || LINT_EXIT=$?
      else
        return 0
      fi
      ;;

    python)
      if command -v ruff >/dev/null 2>&1; then
        LINT_OUTPUT=$(ruff check --output-format concise "$EDITED_FILE" 2>&1) || LINT_EXIT=$?
      elif command -v flake8 >/dev/null 2>&1; then
        LINT_OUTPUT=$(flake8 "$EDITED_FILE" 2>&1) || LINT_EXIT=$?
      elif command -v pylint >/dev/null 2>&1; then
        LINT_OUTPUT=$(pylint --output-format=text "$EDITED_FILE" 2>&1) || LINT_EXIT=$?
      else
        return 0
      fi
      ;;

    go)
      if command -v golangci-lint >/dev/null 2>&1; then
        LINT_OUTPUT=$(cd "$PROJECT_ROOT" && golangci-lint run --new-from-rev=HEAD --out-format=line-number "$EDITED_FILE" 2>&1) || LINT_EXIT=$?
      elif command -v go >/dev/null 2>&1; then
        LINT_OUTPUT=$(cd "$PROJECT_ROOT" && go vet ./... 2>&1) || LINT_EXIT=$?
      else
        return 0
      fi
      ;;

    rust)
      if command -v cargo >/dev/null 2>&1; then
        LINT_OUTPUT=$(cd "$PROJECT_ROOT" && cargo clippy --message-format=short 2>&1) || LINT_EXIT=$?
      else
        return 0
      fi
      ;;

    kotlin)
      if command -v ktlint >/dev/null 2>&1; then
        LINT_OUTPUT=$(ktlint "$EDITED_FILE" 2>&1) || LINT_EXIT=$?
      elif [ -f "$PROJECT_ROOT/gradlew" ]; then
        LINT_OUTPUT=$(cd "$PROJECT_ROOT" && ./gradlew lint --quiet 2>&1) || LINT_EXIT=$?
      else
        return 0
      fi
      ;;

    swift)
      if command -v swiftlint >/dev/null 2>&1; then
        LINT_OUTPUT=$(swiftlint lint --path "$EDITED_FILE" --quiet 2>&1) || LINT_EXIT=$?
      else
        return 0
      fi
      ;;

    erlang)
      if [ -f "$PROJECT_ROOT/rebar3" ] || command -v rebar3 >/dev/null 2>&1; then
        REBAR="./rebar3"
        if ! [ -f "$PROJECT_ROOT/rebar3" ]; then REBAR="rebar3"; fi
        # Try rebar3 lint (elvis)
        LINT_OUTPUT=$(cd "$PROJECT_ROOT" && $REBAR lint 2>&1) || LINT_EXIT=$?
      elif command -v elvis >/dev/null 2>&1; then
        LINT_OUTPUT=$(cd "$PROJECT_ROOT" && elvis rock "$EDITED_FILE" 2>&1) || LINT_EXIT=$?
      else
        return 0
      fi
      ;;

    *)
      return 0
      ;;
  esac
}

run_lint

# If lint passed or linter not found, allow silently
if [ "$LINT_EXIT" -eq 0 ]; then
  exit 0
fi

# Truncate long output to avoid flooding the agent context
MAX_CHARS=2000
if [ ${#LINT_OUTPUT} -gt $MAX_CHARS ]; then
  LINT_OUTPUT="$(printf '%s' "$LINT_OUTPUT" | head -c $MAX_CHARS)
... (truncated, $((${#LINT_OUTPUT} - MAX_CHARS)) chars omitted)"
fi

# Return lint warnings as agent-visible feedback (not a block — advisory)
jq -nc \
  --arg lint "$LINT_OUTPUT" \
  --arg project "$PROJECT_TYPE" \
  --arg file "$EDITED_FILE" \
  '{
    "copilot:note": ("Lint issues found in " + $file + " (" + $project + " project):\n" + $lint)
  }'

exit 0
