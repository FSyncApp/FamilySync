#!/usr/bin/env bash
set -euo pipefail

# Script lives at: <PROJECT>/_patches/<this_folder>/APPLY.sh
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATCH_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

STAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_DIR="${PROJECT_ROOT}/_patches/_backup_messages_v1_polish_${STAMP}"

echo "Project root: ${PROJECT_ROOT}"
echo "Patch root:   ${PATCH_ROOT}"
echo "Backup dir:   ${BACKUP_DIR}"
echo ""

mkdir -p "${PROJECT_ROOT}/_patches"
mkdir -p "${BACKUP_DIR}"

backup_file () {
  local rel="$1"
  local src="${PROJECT_ROOT}/${rel}"
  if [[ -f "${src}" ]]; then
    mkdir -p "$(dirname "${BACKUP_DIR}/${rel}")"
    cp "${src}" "${BACKUP_DIR}/${rel}"
    echo "Backed up: ${rel}"
  else
    echo "No existing file to back up: ${rel}"
  fi
}

copy_file () {
  local rel="$1"
  local src="${PATCH_ROOT}/${rel}"
  local dst="${PROJECT_ROOT}/${rel}"
  mkdir -p "$(dirname "${dst}")"
  cp "${src}" "${dst}"
  echo "Copied: ${rel}"
}

# Backups
backup_file "client/screens/MessagesScreen.tsx"
backup_file "client/screens/MessageThreadScreen.tsx"

echo ""
echo "Applying patch (copying files into project)..."

copy_file "client/screens/MessagesScreen.tsx"
copy_file "client/screens/MessageThreadScreen.tsx"

echo ""
echo "Done."
echo "Backup created at: ${BACKUP_DIR}"
