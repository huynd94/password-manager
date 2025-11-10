#!/usr/bin/env bash
set -euo pipefail

# CloudPanel-friendly uninstall script
# - Removes our service and app files only
# - Does NOT touch Nginx/Certbot managed by CloudPanel
# - Optional: drop database and user
#
# Usage (run from anywhere):
#   sudo bash backend/deploy/uninstall-cloudpanel.sh --drop-db --db-name password_manager --db-user password_manager

SERVICE_NAME="password-manager"
APP_DIR="/opt/password-manager"
ENV_DIR="/etc/password-manager"
DROP_DB=false
DB_NAME="password_manager"
DB_USER="password_manager"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --drop-db) DROP_DB=true; shift;;
    --db-name) DB_NAME="$2"; shift 2;;
    --db-user) DB_USER="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (use sudo)." >&2
  exit 1
fi

echo "Stopping and disabling service $SERVICE_NAME ..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true
systemctl disable "$SERVICE_NAME" 2>/dev/null || true
rm -f "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload

echo "Removing app and env directories ..."
rm -rf "$APP_DIR" "$ENV_DIR"

if $DROP_DB; then
  echo "Dropping database $DB_NAME and user $DB_USER ..."
  if command -v psql >/dev/null 2>&1; then
    sudo -u postgres psql -c "REVOKE ALL PRIVILEGES ON DATABASE \"$DB_NAME\" FROM \"$DB_USER\";" || true
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" || true
    sudo -u postgres psql -c "DROP ROLE IF EXISTS \"$DB_USER\";" || true
  else
    echo "psql not found; skipping DB drop."
  fi
fi

echo "Uninstall (CloudPanel) done."

