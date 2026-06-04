#!/bin/sh
# ── Initial Let's Encrypt cert via Cloudflare DNS challenge ──────────
# Run once before starting the stack for the first time.
# Usage: DOMAIN=schedule.yourdomain.com ./scripts/init-cert.sh

set -euo pipefail

DOMAIN="${DOMAIN:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: DOMAIN=your.domain ./scripts/init-cert.sh"
  exit 1
fi

CLOUDFLARE_INI="${CLOUDFLARE_INI:-./nginx/cloudflare.ini}"

# Build the certbot command
docker compose run --rm certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials "$CLOUDFLARE_INI" \
  --email admin@"$DOMAIN" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo ""
echo "Done! Certs for $DOMAIN are in ./certbot/conf/live/$DOMAIN/"
echo "Start the stack with: docker compose up -d"
