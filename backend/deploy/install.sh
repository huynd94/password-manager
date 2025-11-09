#!/usr/bin/env bash
set -euo pipefail

# Password Manager Backend deploy script for Ubuntu 24.04
# - Installs Node.js, PostgreSQL, (optional) Nginx + Certbot
# - Builds and runs backend as a systemd service
#
# Usage examples:
#   sudo bash backend/deploy/install.sh
#   sudo bash backend/deploy/install.sh --domain example.com --email admin@example.com
#   sudo bash backend/deploy/install.sh --port 4000 --db-name password_manager --db-user pm_user --db-pass 'StrongPass123' \
#       --jwt-secret 'change_me' --cors-origin 'https://app.example.com'

DOMAIN=""
EMAIL=""
USE_CERTBOT="auto"   # auto|true|false (auto enables if DOMAIN provided)
PORT="4000"
DB_NAME="password_manager"
DB_USER="password_manager"
DB_PASS=""
JWT_SECRET=""
CORS_ORIGIN=""
APP_DIR="/opt/password-manager"
BACKEND_DIR="$APP_DIR/backend"
WEB_ROOT="/var/www/password-manager"
ENV_DIR="/etc/password-manager"
ENV_FILE="$ENV_DIR/env"
SERVICE_NAME="password-manager"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2;;
    --email) EMAIL="$2"; shift 2;;
    --use-certbot) USE_CERTBOT="$2"; shift 2;;
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

# Determine default CORS origin
if [[ -z "$CORS_ORIGIN" ]]; then
  if [[ -n "$DOMAIN" ]]; then
    CORS_ORIGIN="https://$DOMAIN"
  else
    CORS_ORIGIN="*"  # default permissive for IP-based access
  fi
fi
echo "Using CORS_ORIGIN=$CORS_ORIGIN"

echo "[1/9] Updating apt and installing base packages..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg lsb-release ufw jq rsync

echo "[2/9] Installing Node.js LTS (NodeSource)..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs build-essential
else
  echo "Node.js already installed: $(node -v)"
fi

echo "[3/9] Installing PostgreSQL..."
if ! command -v psql >/dev/null 2>&1; then
  apt-get install -y postgresql postgresql-contrib
else
  echo "PostgreSQL already installed: $(psql --version)"
fi

echo "[4/9] Creating database and user..."
if [[ -z "$DB_PASS" ]]; then
  DB_PASS=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 24)
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres createdb "$DB_NAME"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "ALTER DATABASE \"$DB_NAME\" OWNER TO \"$DB_USER\";"

# Ensure extension and table exist as superuser to avoid permission issues
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d "$DB_NAME" -c "CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), username VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL, encrypted_vault TEXT);"

echo "[5/9] Preparing application directory at $APP_DIR ..."
mkdir -p "$BACKEND_DIR" "$ENV_DIR"

REPO_ROOT="$(pwd)"
SRC_BACKEND_DIR="$REPO_ROOT/backend"
if [[ ! -f "$SRC_BACKEND_DIR/package.json" ]]; then
  echo "Could not find backend sources at $SRC_BACKEND_DIR. Run this script from the repo root." >&2
  exit 1
fi
rsync -a --delete "$SRC_BACKEND_DIR/" "$BACKEND_DIR/"
chown -R www-data:www-data "$APP_DIR"

echo "[6/9] Installing backend dependencies and building..."
cd "$BACKEND_DIR"
npm install
npm run build

echo "[7/9] Writing environment file to $ENV_FILE ..."
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

echo "[8/9] Installing systemd service..."
cat > "/etc/systemd/system/$SERVICE_NAME.service" <<SERVICE
[Unit]
Description=Password Manager API
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

if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "Service $SERVICE_NAME is running."
else
  echo "Service failed to start. Check logs: journalctl -u $SERVICE_NAME -f" >&2
  exit 1
fi

echo "[9/9] Building frontend and configuring Nginx..."
apt-get install -y nginx

# Build frontend (Vite)
cd "$REPO_ROOT"
npm install
npm run build
mkdir -p "$WEB_ROOT"
rsync -a --delete "$REPO_ROOT/dist/" "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"

SERVER_NAME_CONF="_"
if [[ -n "$DOMAIN" ]]; then
  SERVER_NAME_CONF="$DOMAIN"
fi

cat > /etc/nginx/sites-available/$SERVICE_NAME.conf <<NGINX
server {
    listen 80;
    server_name $SERVER_NAME_CONF;

    root $WEB_ROOT;
    index index.html;

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
}
NGINX

ln -sf /etc/nginx/sites-available/$SERVICE_NAME.conf /etc/nginx/sites-enabled/$SERVICE_NAME.conf
nginx -t && systemctl reload nginx

# UFW rules for web
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH || true
  ufw allow 'Nginx Full' || true
fi

if [[ -n "$DOMAIN" && "$USE_CERTBOT" != "false" ]]; then
  if [[ -z "$EMAIL" ]]; then
    echo "Skipping TLS: --email is required for certbot."
  else
    echo "Issuing Let's Encrypt certificate via certbot..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || echo "Certbot failed; check DNS and try again."
  fi
fi

# Backend port remains internal (proxied by Nginx). Not opening $PORT on UFW.

echo "\nDeployment complete!"
if [[ -n "$DOMAIN" ]]; then
  echo "- API available via: https://$DOMAIN"
else
  echo "- API available via: http://YOUR_SERVER_IP:$PORT"
fi
echo "- Env file: $ENV_FILE"
echo "- Logs: journalctl -u $SERVICE_NAME -f"
