FROM node:22-alpine AS builder

WORKDIR /app

# Backend deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Frontend deps & build
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm ci && npm cache clean --force
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── Runtime stage ─────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy backend deps
COPY --from=builder /app/node_modules ./node_modules
# Copy backend source
COPY package.json server.js ./
# Copy built frontend (primary)
COPY --from=builder /app/dist ./dist
# Keep public/ as fallback
COPY public ./public

# Metadata
LABEL org.opencontainers.image.title="Schedule Telegram Web App"
LABEL org.opencontainers.image.description="Team event scheduling with Telegram Mini App integration"
LABEL org.opencontainers.image.source="https://github.com/NaMLiM/schedule-telegram-webapp"

EXPOSE 3000
VOLUME ["/app/data"]

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/status || exit 1

CMD ["node", "server.js"]
