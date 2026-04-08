#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backend_path="$repo_root/backend"
web_path="$repo_root/web"

is_port_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

open_terminal_window() {
  local working_dir="$1"
  local command="$2"

  osascript - "$working_dir" "$command" <<'APPLESCRIPT' >/dev/null
on run argv
  set workingDir to item 1 of argv
  set shellCommand to item 2 of argv
  tell application "Terminal"
    activate
    do script "cd " & quoted form of workingDir & "; " & shellCommand
  end tell
end run
APPLESCRIPT
}

if is_port_listening 27017; then
  echo "MongoDB is already running on localhost:27017."
else
  mongo_service_name=""
  if command -v brew >/dev/null 2>&1; then
    mongo_service_name="$(brew services list 2>/dev/null | awk '/^mongodb-community(@[0-9.]+)? / { print $1; exit }')"
  fi

  if [[ -n "$mongo_service_name" ]]; then
    brew services start "$mongo_service_name" >/dev/null
    echo "Started MongoDB service with Homebrew ($mongo_service_name)."
  else
    echo "Warning: MongoDB service was not found. Start MongoDB manually if your backend needs it." >&2
  fi
fi

if is_port_listening 8082; then
  echo "Backend is already running on http://localhost:8082"
else
  open_terminal_window "$backend_path" "mvn spring-boot:run"
  echo "Starting backend on http://localhost:8082"
fi

if is_port_listening 4201; then
  echo "Frontend is already running on http://localhost:4201"
else
  open_terminal_window "$web_path" "npm run start"
  echo "Starting frontend on http://localhost:4201"
fi

echo "Startup command finished."