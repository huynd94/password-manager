#!/usr/bin/env bash
set -euo pipefail

# Generic uninstall script (non-CloudPanel)
# - Removes service, app dirs, env file, nginx site (if created by our installer)
# - Optional: drop database & user
# - Optional: purge packages (Node.js, PostgreSQL) [DANGEROUS]
#
# Usage:
#   sudo bash backend/deploy/uninstall.sh --drop-db --purge-node --purge-postgres

SERVICE_NAME="password-manager"
APP_DIR="/opt/password-manager"
ENV_DIR="/etc/password-manager"
NGINX_SITE="/etc/nginx/sites-available/password-manager.conf"
DROP_DB=false
PURGE_NODE=false
PURGE_POSTGRES=false
DB_NAME="password_manager"
DB_USER="password_manager"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --drop-db) DROP_DB=true; shift;;
    --db-name) DB_NAME="$2"; shift 2;;
    --db-user) DB_USER="$2"; shift 2;;
    --purge-node) PURGE_NODE=true; shift;;
    --purge-postgres) PURGE_POSTGRES=true; shift;;
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

if [[ -f "$NGINX_SITE" ]]; then
  echo "Removing nginx site $NGINX_SITE ..."
  rm -f "$NGINX_SITE"
  rm -f "/etc/nginx/sites-enabled/$(basename "$NGINX_SITE")" || true
  nginx -t && systemctl reload nginx || true
fi

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

if $PURGE_NODE; then
  echo "Purging Node.js (this may affect other apps)..."
  apt-get purge -y nodejs || true
  apt-get autoremove -y || true
fi

if $PURGE_POSTGRES; then
  echo "Purging PostgreSQL (this may remove all PostgreSQL clusters)..."
  systemctl stop postgresql || true
  apt-get purge -y postgresql* || true
  apt-get autoremove -y || true
fi

echo "Uninstall completed."

