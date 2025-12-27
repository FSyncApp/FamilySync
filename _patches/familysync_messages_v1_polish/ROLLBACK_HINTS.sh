#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Backups live in: ${PROJECT_ROOT}/_patches/_backup_messages_v1_polish_*"
echo "To rollback:"
echo "  ls ${PROJECT_ROOT}/_patches | grep _backup_messages_v1_polish_"
echo "  cp -R ${PROJECT_ROOT}/_patches/<backup_folder>/client ${PROJECT_ROOT}/client"
