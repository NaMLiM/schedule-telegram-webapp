require('dotenv').config();

const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const HRM_API_URL = process.env.HRM_API_URL || '';
const HRM_API_TOKEN = process.env.HRM_API_TOKEN || '';
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ── Database ────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'schedule.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS synced_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    team_type TEXT DEFAULT 'general',
    is_active INTEGER DEFAULT 1,
    synced_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS synced_employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_uuid TEXT NOT NULL,
    team_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    employee_number TEXT,
    role TEXT DEFAULT 'member',
    synced_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES synced_teams(id)
  );

  CREATE TABLE IF NOT EXISTS user_teams (
    telegram_id TEXT PRIMARY KEY,
    team_uuid TEXT NOT NULL,
    display_name TEXT,
    joined_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_uuid) REFERENCES synced_teams(uuid)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_uuid TEXT NOT NULL,
    event_date TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_employee_uuids TEXT DEFAULT '[]',
    created_by_telegram_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_uuid) REFERENCES synced_teams(uuid)
  );
`);

// ── HMAC verification ───────────────────────────────────────────────
function verifyTelegramInitData(initData, botToken) {
  if (!botToken) return true; // dev mode: accept all
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    params.delete('hash');

    const keys = [...params.keys()].sort();
    const dataCheckString = keys.map(k => `${k}=${params.get(k)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return computedHash === hash;
  } catch {
    return false;
  }
}

// ── Auth middleware ──────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const telegramId = req.headers['x-telegram-id'];
  const initData = req.headers['x-init-data'];

  if (!telegramId) {
    return res.status(401).json({ error: 'Missing x-telegram-id header' });
  }

  if (!verifyTelegramInitData(initData || '', BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid initData signature' });
  }

  req.telegramId = String(telegramId);
  req.isAdmin = ADMIN_IDS.includes(req.telegramId);

  // Look up user team
  if (!req.isAdmin) {
    const userTeam = db.prepare('SELECT team_uuid FROM user_teams WHERE telegram_id = ?').get(req.telegramId);
    if (!userTeam) {
      return res.status(403).json({ error: 'Access denied. You are not registered as an employee.' });
    }
    req.userTeamUuid = userTeam.team_uuid;
  }

  next();
}

function adminOnly(req, res, next) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ── Express app ─────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ── Seed sample data ────────────────────────────────────────────────
function seedSampleData() {
  const existing = db.prepare('SELECT COUNT(*) as count FROM synced_teams').get();
  if (existing.count > 0) return;

  const seed = db.transaction(() => {
    const insertTeam = db.prepare(
      'INSERT INTO synced_teams (uuid, name, team_type) VALUES (?, ?, ?)'
    );
    const insertEmp = db.prepare(
      'INSERT INTO synced_employees (employee_uuid, team_id, name, employee_number, role) VALUES (?, ?, ?, ?, ?)'
    );

    const teams = [
      {
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Installation Alpha',
        type: 'installation',
        members: [
          { uuid: 'emp-001', name: 'Alex Johnson', num: 'EMP001', role: 'lead' },
          { uuid: 'emp-002', name: 'Budi Santoso', num: 'EMP002', role: 'technician' },
          { uuid: 'emp-003', name: 'Citra Dewi', num: 'EMP003', role: 'technician' },
          { uuid: 'emp-004', name: 'David Lee', num: 'EMP004', role: 'member' },
        ],
      },
      {
        uuid: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Service Bravo',
        type: 'service',
        members: [
          { uuid: 'emp-005', name: 'Emma Wilson', num: 'EMP005', role: 'lead' },
          { uuid: 'emp-006', name: 'Fajar Rahman', num: 'EMP006', role: 'technician' },
          { uuid: 'emp-007', name: 'Grace Tan', num: 'EMP007', role: 'member' },
        ],
      },
      {
        uuid: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Support Charlie',
        type: 'support',
        members: [
          { uuid: 'emp-008', name: 'Hadi Wijaya', num: 'EMP008', role: 'lead' },
          { uuid: 'emp-009', name: 'Ika Putri', num: 'EMP009', role: 'member' },
        ],
      },
    ];

    for (const team of teams) {
      const result = insertTeam.run(team.uuid, team.name, team.type);
      const teamId = result.lastInsertRowid;
      for (const m of team.members) {
        insertEmp.run(m.uuid, teamId, m.name, m.num, m.role);
      }
    }
  });

  seed();
  console.log('[seed] Sample teams seeded');
}

// ── HRM Sync ────────────────────────────────────────────────────────
async function syncFromHrm() {
  if (!HRM_API_URL || !HRM_API_TOKEN) return false;

  try {
    const res = await fetch(`${HRM_API_URL}/api/internal/teams`, {
      headers: { Authorization: `Bearer ${HRM_API_TOKEN}` },
    });
    if (!res.ok) return false;

    const { teams } = await res.json();

    const sync = db.transaction(() => {
      db.prepare('DELETE FROM synced_employees').run();
      db.prepare('DELETE FROM synced_teams').run();

      const insertTeam = db.prepare(
        'INSERT INTO synced_teams (uuid, name, team_type) VALUES (?, ?, ?)'
      );
      const insertEmp = db.prepare(
        'INSERT INTO synced_employees (employee_uuid, team_id, name, employee_number, role) VALUES (?, ?, ?, ?, ?)'
      );

      for (const team of teams) {
        const result = insertTeam.run(team.uuid, team.name, team.team_type || 'general');
        const teamId = result.lastInsertRowid;
        for (const m of team.members || []) {
          insertEmp.run(m.employee_uuid, teamId, m.name, m.employee_number || null, m.role || 'member');
        }
      }
    });

    sync();
    console.log('[sync] HRM sync completed');
    return true;
  } catch (err) {
    console.error('[sync] HRM sync failed:', err.message);
    return false;
  }
}

// ── API Routes ──────────────────────────────────────────────────────

// GET /api/status
app.get('/api/status', (req, res) => {
  const teamsCount = db.prepare('SELECT COUNT(*) as count FROM synced_teams').get().count;
  // Track last sync time from meta table
  let lastSync = null;
  try {
    const row = db.prepare("SELECT value FROM kv WHERE key = 'last_sync'").get();
    lastSync = row ? row.value : null;
  } catch {
    // kv table may not exist yet
  }
  res.json({ admin_telegram_ids: ADMIN_IDS, teams_count: teamsCount, last_sync: lastSync });
});

// POST /api/sync
app.post('/api/sync', async (req, res) => {
  let synced = false;
  if (HRM_API_URL && HRM_API_TOKEN) {
    synced = await syncFromHrm();
  }
  if (!synced) {
    seedSampleData();
  }

  // Update last sync timestamp
  db.exec("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)");
  db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES ('last_sync', ?)").run(
    new Date().toISOString()
  );

  const teamsCount = db.prepare('SELECT COUNT(*) as count FROM synced_teams').get().count;
  res.json({ status: 'synced', teams_count: teamsCount });
});

// GET /api/teams
app.get('/api/teams', (req, res) => {
  const teams = db.prepare(
    'SELECT id, uuid, name, team_type, is_active FROM synced_teams ORDER BY name'
  ).all();
  const mapped = teams.map(t => ({
    ...t,
    is_active: Boolean(t.is_active),
  }));
  res.json({ teams: mapped });
});

// GET /api/teams/:uuid/employees
app.get('/api/teams/:uuid/employees', (req, res) => {
  const team = db.prepare('SELECT id FROM synced_teams WHERE uuid = ?').get(req.params.uuid);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const employees = db.prepare(
    'SELECT id, employee_uuid, name, employee_number, role FROM synced_employees WHERE team_id = ? ORDER BY name'
  ).all(team.id);
  res.json({ employees });
});

// GET /api/user/me
app.get('/api/user/me', authMiddleware, (req, res) => {
  const userTeamRow = db.prepare(
    `SELECT ut.team_uuid, ut.display_name, st.name as team_name
     FROM user_teams ut
     JOIN synced_teams st ON st.uuid = ut.team_uuid
     WHERE ut.telegram_id = ?`
  ).get(req.telegramId);

  res.json({
    telegram_id: req.telegramId,
    is_admin: req.isAdmin,
    team: userTeamRow ? { uuid: userTeamRow.team_uuid, name: userTeamRow.team_name } : null,
    display_name: userTeamRow ? userTeamRow.display_name : null,
  });
});

// GET /api/events
app.get('/api/events', authMiddleware, (req, res) => {
  let teamUuid;
  if (req.isAdmin) {
    teamUuid = req.query.team_uuid;
    if (!teamUuid) return res.status(400).json({ error: 'team_uuid query param required for admin' });
  } else {
    teamUuid = req.userTeamUuid;
  }

  const events = db.prepare(
    'SELECT * FROM events WHERE team_uuid = ? ORDER BY event_date DESC, created_at DESC'
  ).all(teamUuid);

  res.json({ events });
});

// GET /api/events/all — admin only, returns all events
app.get('/api/events/all', authMiddleware, adminOnly, (req, res) => {
  const events = db.prepare(
    'SELECT * FROM events ORDER BY event_date DESC, created_at DESC'
  ).all();
  res.json({ events });
});

// POST /api/events
app.post('/api/events', authMiddleware, (req, res) => {
  const { event_date, description, assigned_employee_uuids, team_uuid } = req.body;

  if (!event_date || !description) {
    return res.status(400).json({ error: 'event_date and description are required' });
  }

  let targetTeamUuid;
  if (req.isAdmin) {
    if (!team_uuid) return res.status(400).json({ error: 'team_uuid required for admin' });
    targetTeamUuid = team_uuid;
  } else {
    targetTeamUuid = req.userTeamUuid;
  }

  // Verify team exists
  const team = db.prepare('SELECT uuid FROM synced_teams WHERE uuid = ?').get(targetTeamUuid);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const empUuids = assigned_employee_uuids
    ? JSON.stringify(assigned_employee_uuids)
    : '[]';

  const result = db.prepare(
    `INSERT INTO events (team_uuid, event_date, description, assigned_employee_uuids, created_by_telegram_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(targetTeamUuid, event_date, description, empUuids, req.telegramId);

  const created = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// DELETE /api/events/:id
app.delete('/api/events/:id', authMiddleware, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Only creator or admin can delete
  if (!req.isAdmin && event.created_by_telegram_id !== req.telegramId) {
    return res.status(403).json({ error: 'Only the event creator or an admin can delete this event' });
  }

  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ deleted: true, id: Number(req.params.id) });
});

// POST /api/sync-hrm — admin only
app.post('/api/sync-hrm', authMiddleware, adminOnly, async (req, res) => {
  if (!HRM_API_URL || !HRM_API_TOKEN) {
    return res.status(400).json({ error: 'HRM integration not configured' });
  }

  const synced = await syncFromHrm();
  if (!synced) {
    return res.status(500).json({ error: 'HRM sync failed' });
  }

  db.exec("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)");
  db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES ('last_sync', ?)").run(
    new Date().toISOString()
  );

  const teamsCount = db.prepare('SELECT COUNT(*) as count FROM synced_teams').get().count;
  res.json({ status: 'synced', teams_count: teamsCount });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────────
// Auto-seed on startup if no teams exist
const existingTeams = db.prepare('SELECT COUNT(*) as count FROM synced_teams').get().count;
if (existingTeams === 0) {
  if (HRM_API_URL && HRM_API_TOKEN) {
    syncFromHrm().then(synced => {
      if (!synced) seedSampleData();
      startServer();
    });
  } else {
    seedSampleData();
    startServer();
  }
} else {
  startServer();
}

function startServer() {
  app.listen(PORT, () => {
    console.log(`[server] Schedule Web App running on http://localhost:${PORT}`);
  });
}
