#!/usr/bin/env bash
set -euo pipefail

# CloudPanel-friendly installer
# - Does NOT modify Nginx/Certbot/Firewall (managed by CloudPanel)
# - Sets up backend (systemd) and copies built frontend to provided web root
#
# Usage examples (run from repo root):
#   sudo bash backend/deploy/install-cloudpanel.sh --web-root /home/USER/htdocs/DOMAIN/public --domain example.com \
#        --db-name password_manager --db-user pm_user --db-pass 'StrongPass123' --jwt-secret 'change_me'
#   sudo bash backend/deploy/install-cloudpanel.sh --web-root /home/USER/htdocs/DOMAIN/public

PORT="4000"
DB_NAME="password_manager"
DB_USER="password_manager"
DB_PASS=""
JWT_SECRET=""
DOMAIN=""
CORS_ORIGIN=""
WEB_ROOT=""
APP_DIR="/opt/password-manager"
BACKEND_DIR="$APP_DIR/backend"
ENV_DIR="/etc/password-manager"
ENV_FILE="$ENV_DIR/env"
SERVICE_NAME="password-manager"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-root) WEB_ROOT="$2"; shift 2;;
    --domain) DOMAIN="$2"; shift 2;;
    --port) PORT="$2"; shift 2;;
    --db-name) DB_NAME="$2"; shift 2;;
    --db-user) DB_USER="$2"; shift 2;;
    --db-pass) DB_PASS="$2"; shift 2;;
    --jwt-secret) JWT_SECRET="$2"; shift 2;;
    --cors-origin) CORS_ORIGIN="$2"; shift 2;;
    --app-dir) APP_DIR="$2"; BACKEND_DIR="$APP_DIR/backend"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (use sudo)." >&2
  exit 1
fi

if [[ -z "$WEB_ROOT" ]]; then
  echo "--web-root is required (CloudPanel site public directory)." >&2
  exit 1
fi

# Determine default CORS origin (no wildcard if domain provided)
if [[ -z "$CORS_ORIGIN" ]]; then
  if [[ -n "$DOMAIN" ]]; then
    CORS_ORIGIN="https://$DOMAIN"
  else
    CORS_ORIGIN="*"
  fi
fi
echo "Using CORS_ORIGIN=$CORS_ORIGIN"

echo "[1/6] Install base packages and Node.js if missing..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg lsb-release rsync jq
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs build-essential
fi

echo "[2/6] Install PostgreSQL if missing and prepare database..."
if ! command -v psql >/dev/null 2>&1; then
  apt-get install -y postgresql postgresql-contrib
fi
if [[ -z "$DB_PASS" ]]; then
  DB_PASS=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 24)
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres createdb "$DB_NAME"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "ALTER DATABASE \"$DB_NAME\" OWNER TO \"$DB_USER\";"
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d "$DB_NAME" -c "CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), username VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL, encrypted_vault TEXT);"

echo "[3/6] Sync backend and build..."
REPO_ROOT="$(pwd)"
SRC_BACKEND_DIR="$REPO_ROOT/backend"
if [[ ! -f "$SRC_BACKEND_DIR/package.json" ]]; then
  echo "Could not find backend sources at $SRC_BACKEND_DIR. Run this script from the repo root." >&2
  exit 1
fi
mkdir -p "$BACKEND_DIR" "$ENV_DIR"
rsync -a --delete "$SRC_BACKEND_DIR/" "$BACKEND_DIR/"
cd "$BACKEND_DIR"
npm install --include=dev
npm run build

echo "[4/6] Write backend environment and systemd service..."
if [[ -z "$JWT_SECRET" ]]; then
  JWT_SECRET=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 48)
fi
cat > "$ENV_FILE" <<EOF
PORT=$PORT
DATABASE_URL="postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
JWT_SECRET="$JWT_SECRET"
CORS_ORIGIN="$CORS_ORIGIN"
EOF
chmod 640 "$ENV_FILE"

cat > "/etc/systemd/system/$SERVICE_NAME.service" <<SERVICE
[Unit]
Description=Password Manager API (CloudPanel)
After=network.target postgresql.service

[Service]
Type=simple
EnvironmentFile=$ENV_FILE
WorkingDirectory=$BACKEND_DIR
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=3
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
systemctl status "$SERVICE_NAME" --no-pager -l || true

echo "[5/6] Build frontend and copy to CloudPanel web root..."
cd "$REPO_ROOT"
npm install --include=dev
npm run build
mkdir -p "$WEB_ROOT"
rsync -a --delete "$REPO_ROOT/dist/" "$WEB_ROOT/"

echo "[6/6] Done. Next steps in CloudPanel:"
cat <<INSTRUCT
- In the site Nginx config (CloudPanel UI), add:
  location /api {
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
      proxy_pass http://127.0.0.1:$PORT;
  }
  location / {
      try_files \$uri \$uri/ /index.html;
  }

- Ensure frontend points to '/api' (services/apiService.ts) and rebuild if you changed it.
- Restart Nginx from CloudPanel.
- Backend logs: journalctl -u $SERVICE_NAME -f
INSTRUCT

echo "Deployment complete."
