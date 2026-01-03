#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PATCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Applying patch from: $PATCH_DIR"
echo "Project root:       $ROOT_DIR"

if [ ! -f "$ROOT_DIR/package.json" ] || [ ! -d "$ROOT_DIR/app" ]; then
  echo "ERROR: This doesn't look like the FamilySyncMigrate project root."
  exit 1
fi

rsync -av --delete "$PATCH_DIR/app/" "$ROOT_DIR/app/"

echo "✅ Patch applied."
