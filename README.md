# Schedule Telegram WebApp

Telegram Mini App for team schedule management with MMA HRM integration.

**Stack:** Node.js + Express + node:sqlite + vanilla JS

## Quick Start

```bash
cp .env.example .env
npm install
npm start
# → http://localhost:3000
```

## Features

- 📅 Calendar + 📋 List views
- 🔄 Auto-sync from HRM internal API (`/api/internal/teams`)
- 📝 Natural language date input
- 👤 Employee assignment
- 🛡️ Admin mode (`ADMIN_MODE=true`)
- 📱 Telegram native theming

## Env

| Var | Desc |
|-----|------|
| `PORT` | Server port (3000) |
| `HRM_API_URL` | HRM base URL |
| `HRM_API_TOKEN` | Bearer token |
| `ADMIN_MODE` | Admin mode (false) |

Without HRM config, loads 3 sample teams.

## API

| Method | Path | Desc |
|--------|------|------|
| GET | `/api/status` | Status |
| POST | `/api/sync` | Manual sync |
| GET | `/api/teams` | Teams |
| GET | `/api/teams/:uuid/employees` | Employees |
| GET | `/api/events?team_uuid=X` | Events |
| GET | `/api/events/all` | All (admin) |
| POST | `/api/events` | Create |
| DELETE | `/api/events/:id` | Delete |
