#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js 20 LTS or newer first." >&2
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required. Install the Rust stable toolchain first." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  npm ci
fi

npm run tauri -- build "$@"
