# Schedule Telegram Web App

Team event scheduling with Telegram Mini App integration, built with Express and SQLite.

## Setup

```bash
npm install
cp .env.example .env   # edit with your config
npm start
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `HRM_API_URL` | HRM internal API base URL (optional, for team sync) |
| `HRM_API_TOKEN` | Bearer token for HRM API |
| `ADMIN_TELEGRAM_IDS` | Comma-separated Telegram user IDs with admin access |
| `BOT_TOKEN` | Telegram Bot token (for HMAC verification of initData) |

## Auth Flow

1. Frontend sends `x-telegram-id` and `x-init-data` headers
2. Backend verifies initData with HMAC-SHA256 using BOT_TOKEN
3. User matched against ADMIN_TELEGRAM_IDS (admin) or user_teams table (regular user)
4. Unmatched users receive 403

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/status` | No | App status, team count |
| POST | `/api/sync` | No | Trigger HRM sync or seed sample data |
| GET | `/api/teams` | No | All teams |
| GET | `/api/teams/:uuid/employees` | No | Team employees |
| GET | `/api/user/me` | Required | Current user info |
| GET | `/api/events` | Required | Events (scoped to team) |
| GET | `/api/events/all` | Admin | All events across teams |
| POST | `/api/events` | Required | Create event |
| DELETE | `/api/events/:id` | Required | Delete event (creator/admin) |
| POST | `/api/sync-hrm` | Admin | Trigger HRM sync |

## Tech Stack

- **Backend:** Express 5, better-sqlite3
- **Database:** SQLite (4 tables)
- **Frontend:** Vanilla JS, Telegram Web App SDK
- **Date handling:** Vanilla JS (NL date parsing)
