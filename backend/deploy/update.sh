#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="password-manager"
APP_DIR="/opt/password-manager"
BACKEND_DIR="$APP_DIR/backend"
WEB_ROOT="/var/www/password-manager"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (use sudo)." >&2
  exit 1
fi

REPO_ROOT="$(pwd)"
SRC_BACKEND_DIR="$REPO_ROOT/backend"
if [[ ! -f "$SRC_BACKEND_DIR/package.json" ]]; then
  echo "Could not find backend sources at $SRC_BACKEND_DIR. Run this script from the repo root." >&2
  exit 1
fi

echo "Syncing backend sources to $BACKEND_DIR ..."
mkdir -p "$BACKEND_DIR"
rsync -a --delete "$SRC_BACKEND_DIR/" "$BACKEND_DIR/"

cd "$BACKEND_DIR"
echo "Installing dependencies and building..."
npm install --include=dev
npm run build

echo "Restarting service $SERVICE_NAME ..."
systemctl restart "$SERVICE_NAME"
systemctl status "$SERVICE_NAME" --no-pager -l || true

echo "Building frontend..."
cd "$REPO_ROOT"
npm install --include=dev
npm run build
mkdir -p "$WEB_ROOT"
rsync -a --delete "$REPO_ROOT/dist/" "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"
systemctl reload nginx || true

echo "Update complete. Logs: journalctl -u $SERVICE_NAME -f"
