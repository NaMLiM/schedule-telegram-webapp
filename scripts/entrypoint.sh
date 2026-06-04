#!/bin/sh
# ── Nginx entrypoint — generates self-signed cert if LE cert missing ──
set -e

DOMAIN="${DOMAIN:-schedule.local}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Install openssl CLI if not present (nginx:alpine doesn't always ship it)
if ! command -v openssl >/dev/null 2>&1; then
  echo "[entrypoint] Installing openssl..."
  apk add --no-cache openssl >/dev/null 2>&1
fi

# Generate the nginx config from template
sed "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf
echo "[entrypoint] Config generated for $DOMAIN"

# If LE cert doesn't exist yet, generate a self-signed bootstrap cert
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
  echo "[entrypoint] No LE cert at $CERT_DIR — creating self-signed bootstrap cert"
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=$DOMAIN"
  echo "[entrypoint] Self-signed cert created at $CERT_DIR"
else
  echo "[entrypoint] LE cert found at $CERT_DIR"
fi

echo "[entrypoint] Starting nginx"
exec nginx -g 'daemon off;'
