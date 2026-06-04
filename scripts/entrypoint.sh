#!/bin/sh
# ── Nginx entrypoint — generates self-signed cert if LE cert missing ──
set -e

DOMAIN="${DOMAIN:-schedule.local}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Generate the nginx config from template
sed "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf

# If LE cert doesn't exist yet, generate a self-signed bootstrap cert
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
  echo "[entrypoint] No LE cert found for $DOMAIN — generating self-signed bootstrap cert"
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=$DOMAIN" 2>/dev/null
  echo "[entrypoint] Self-signed cert created — replace with 'DOMAIN=$DOMAIN ./scripts/init-cert.sh'"
fi

echo "[entrypoint] Starting nginx for $DOMAIN"
exec nginx -g 'daemon off;'
