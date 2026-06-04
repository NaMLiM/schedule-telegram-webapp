/* ═══════════════════════════════════════════════════════════════════
   Schedule Telegram Web App — app.js
   ═══════════════════════════════════════════════════════════════════ */

// ── State ───────────────────────────────────────────────────────────
let TG_ID = null;
let TG_NAME = null;
let isAdmin = false;
let userTeam = null;  // { uuid, name } | null
let allTeams = [];    // [{ id, uuid, name, ... }] for admin switcher
let teamEmployees = []; // [{ id, employee_uuid, name, ... }] for current team
let currentTeamUuid = null;
let events = [];
let currentView = 'calendar';
let calendarYear, calendarMonth;

// ── DOM refs ────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── API helper ──────────────────────────────────────────────────────
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (TG_ID) headers['x-telegram-id'] = String(TG_ID);
  if (window.Telegram?.WebApp?.initData) headers['x-init-data'] = window.Telegram.WebApp.initData;
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    if (res.status === 403) { showAccessDenied(); return null; }
    if (res.status === 401) { showAccessDenied(); return null; }
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Toast ───────────────────────────────────────────────────────────
let toastTimer;

function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.classList.remove('hiding');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 2500);
}

// ── Access Denied ───────────────────────────────────────────────────
function showAccessDenied() {
  $('#loading-screen').style.display = 'none';
  $('#main-app').style.display = 'none';
  $('#access-denied').style.display = 'flex';
}

// ── Date Utilities ──────────────────────────────────────────────────
function dayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(ts) {
  const d = new Date(ts + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDateLong(ts) {
  const d = new Date(ts + 'T00:00:00');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function isToday(ts) {
  return dayKey(new Date()) === ts;
}

function sameDay(a, b) {
  return a === b;
}

function escHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// ── Day name helpers ────────────────────────────────────────────────
const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── NL Date Parser ──────────────────────────────────────────────────
// Returns { dates: ['YYYY-MM-DD', ...], description: string }
function parseEventText(text) {
  text = text.trim();
  if (!text) return null;

  let desc = text;
  let dates = [];

  // Patterns to try

  // 1. "June 5-7: desc" or "June 5 - 7: desc" — date range
  const rangeRegex = /^(?:on\s+)?([A-Z][a-z]+)\s+(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*[:：]\s*(.+)/i;
  const rangeMatch = desc.match(rangeRegex);
  if (rangeMatch) {
    const month = MONTH_NAMES.findIndex(m => m.toLowerCase() === rangeMatch[1].toLowerCase());
    if (month >= 0) {
      const year = new Date().getFullYear();
      const startDay = parseInt(rangeMatch[2]);
      const endDay = parseInt(rangeMatch[3]);
      for (let d = startDay; d <= endDay; d++) {
        dates.push(dayKey(new Date(year, month, d)));
      }
      return { dates, description: rangeMatch[4].trim() };
    }
  }

  // 2. "June 3: desc" or "June 3 desc" or "on June 3: desc"
  const datePrefixRegex = /^(?:on\s+)?([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[:：]?\s*(.*)/i;
  const dateMatch = desc.match(datePrefixRegex);
  if (dateMatch) {
    const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === dateMatch[1].toLowerCase());
    if (monthIdx >= 0) {
      const day = parseInt(dateMatch[2]);
      const year = new Date().getFullYear();
      const date = dayKey(new Date(year, monthIdx, day));
      const remaining = dateMatch[3].trim();
      return { dates: [date], description: remaining || text };
    }
  }

  // 3. "tomorrow" keyword — strip "tomorrow" from start and use next day
  const tomorrowRegex = /^tomorrow\s*[:：]?\s*(.*)/i;
  const tomorrowMatch = desc.match(tomorrowRegex);
  if (tomorrowMatch) {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    dates = [dayKey(tmr)];
    desc = tomorrowMatch[1].trim() || text.replace(/^tomorrow\s*/i, '');
    return { dates, description: desc };
  }

  // 4. "next Monday/Tuesday/etc" → next occurrence
  const nextDayRegex = /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:：]?\s*(.*)/i;
  const nextDayMatch = desc.match(nextDayRegex);
  if (nextDayMatch) {
    const targetDay = DAY_NAMES.indexOf(nextDayMatch[1].toLowerCase());
    const today = new Date();
    const daysUntil = ((targetDay + 7 - today.getDay()) % 7) + 7; // Next week
    const target = new Date(today);
    target.setDate(today.getDate() + daysUntil);
    dates = [dayKey(target)];
    return { dates, description: nextDayMatch[2].trim() || text };
  }

  // 5. "Monday/Tuesday" (bare day name) → closest future occurrence
  const dayNameRegex = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:：]?\s*(.*)/i;
  const dayNameMatch = desc.match(dayNameRegex);
  if (dayNameMatch) {
    const targetDay = DAY_NAMES.indexOf(dayNameMatch[1].toLowerCase());
    const today = new Date();
    let daysUntil = (targetDay + 7 - today.getDay()) % 7;
    if (daysUntil === 0) daysUntil = 7; // If it's today, go next week
    const target = new Date(today);
    target.setDate(today.getDate() + daysUntil);
    dates = [dayKey(target)];
    return { dates, description: dayNameMatch[2].trim() || text };
  }

  // 6. "in N days"
  const inDaysRegex = /^in\s+(\d+)\s+days?\s*[:：]?\s*(.*)/i;
  const inDaysMatch = desc.match(inDaysRegex);
  if (inDaysMatch) {
    const n = parseInt(inDaysMatch[1]);
    const target = new Date();
    target.setDate(target.getDate() + n);
    dates = [dayKey(target)];
    return { dates, description: inDaysMatch[2].trim() || text };
  }

  // 7. Fallback: today
  return { dates: [dayKey(new Date())], description: text };
}

// ── Get employee names by uuids ─────────────────────────────────────
function getEmployeeNames(uuidJson) {
  try {
    const uuids = JSON.parse(uuidJson);
    if (!Array.isArray(uuids) || uuids.length === 0) return '';
    return uuids.map(u => {
      const emp = teamEmployees.find(e => e.employee_uuid === u);
      return emp ? emp.name : u;
    });
  } catch {
    return '';
  }
}

// ── Calendar Rendering ──────────────────────────────────────────────
function renderCalendar() {
  const grid = $('#calendar-grid');
  const label = $('#cal-label');

  const year = calendarYear;
  const month = calendarMonth;

  label.textContent = `${MONTH_NAMES[month]} ${year}`;

  // Build day name header
  let html = '<div class="day-names">';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    html += `<span>${d}</span>`;
  });
  html += '</div>';

  // First day of month, last day
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const todayStr = dayKey(new Date());

  // Build event day set for quick lookup
  const eventDays = new Set(events.map(e => e.event_date));

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="cal-day other-month" data-date="prev-${day}">${day}</div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let cls = 'cal-day';
    if (dateStr === todayStr) cls += ' today';
    if (eventDays.has(dateStr)) cls += ' has-events';
    html += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
  }

  // Next month leading days
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month" data-date="next-${d}">${d}</div>`;
  }

  grid.innerHTML = html;

  // Click handlers
  grid.querySelectorAll('.cal-day:not(.other-month)').forEach(el => {
    el.addEventListener('click', () => {
      const date = el.dataset.date;
      showDayDetail(date);
    });
  });
}

function showDayDetail(date) {
  const dayEvents = events.filter(e => e.event_date === date);
  $('#detail-date').textContent = formatDateLong(date);

  let html = '';
  if (dayEvents.length === 0) {
    html = '<div class="empty-state"><p>No events on this day</p></div>';
  } else {
    dayEvents.forEach(ev => {
      const names = getEmployeeNames(ev.assigned_employee_uuids);
      const chipsHtml = Array.isArray(names) && names.length > 0
        ? `<div class="event-card-chips">${names.map(n => `<span class="chip">${escHtml(n)}</span>`).join('')}</div>`
        : '';
      html += `
        <div class="event-card">
          <div class="event-card-desc">${escHtml(ev.description)}</div>
          ${chipsHtml}
        </div>`;
    });
  }

  $('#detail-events').innerHTML = html;
  $('#detail-modal').style.display = 'flex';

  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
  }
}

function closeDetailModal() {
  $('#detail-modal').style.display = 'none';
}

// ── List Rendering ──────────────────────────────────────────────────
function renderList() {
  const container = $('#list-events');

  if (events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No scheduled events</p>
      </div>`;
    return;
  }

  // Group by date
  const grouped = {};
  events.forEach(ev => {
    if (!grouped[ev.event_date]) grouped[ev.event_date] = [];
    grouped[ev.event_date].push(ev);
  });

  // Sort dates ascending
  const sortedDates = Object.keys(grouped).sort();

  let html = '';
  sortedDates.forEach(date => {
    html += `<div class="date-group">
      <div class="date-group-header">${formatDateLong(date)}</div>`;
    grouped[date].forEach(ev => {
      const names = getEmployeeNames(ev.assigned_employee_uuids);
      const chipsHtml = Array.isArray(names) && names.length > 0
        ? `<div class="event-card-chips">${names.map(n => `<span class="chip">${escHtml(n)}</span>`).join('')}</div>`
        : '';

      // Delete button: show for admin or creator
      const canDelete = isAdmin || String(ev.created_by_telegram_id) === String(TG_ID);
      const delBtn = canDelete
        ? `<button class="event-delete" data-event-id="${ev.id}" title="Delete">🗑</button>`
        : '';

      html += `
        <div class="event-card">
          <div class="event-card-desc">${escHtml(ev.description)}</div>
          ${chipsHtml}
          ${delBtn}
        </div>`;
    });
    html += '</div>';
  });

  container.innerHTML = html;

  // Bind delete buttons
  container.querySelectorAll('.event-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const eventId = btn.dataset.eventId;
      await deleteEvent(eventId);
    });
  });
}

// ── Event CRUD ──────────────────────────────────────────────────────
async function deleteEvent(eventId) {
  try {
    const result = await api(`/api/events/${eventId}`, { method: 'DELETE' });
    if (!result) return;
    showToast('Event deleted');
    await fetchEvents();
  } catch (err) {
    showToast('Failed to delete event');
    console.error(err);
  }
}

async function fetchEvents() {
  try {
    let url;
    if (isAdmin) {
      // Admin fetches all or specific team
      if (currentTeamUuid && currentTeamUuid !== '__all__') {
        url = `/api/events?team_uuid=${encodeURIComponent(currentTeamUuid)}`;
      } else {
        url = '/api/events/all';
      }
    } else {
      url = '/api/events';
    }

    const data = await api(url);
    if (data && data.events) {
      events = data.events;
    }
  } catch (err) {
    console.error('Failed to fetch events:', err);
    events = [];
  }
  refreshViews();
}

async function addEvents(parsedDates, description, employeeUuids) {
  const teamUuid = isAdmin ? currentTeamUuid : userTeam?.uuid;
  if (!teamUuid) {
    showToast('No team selected');
    return;
  }

  try {
    for (const date of parsedDates) {
      const body = {
        event_date: date,
        description,
        assigned_employee_uuids: employeeUuids || [],
      };
      if (isAdmin) body.team_uuid = teamUuid;

      await api('/api/events', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }
    showToast(`Event${parsedDates.length > 1 ? 's' : ''} added`);
    await fetchEvents();
  } catch (err) {
    showToast('Failed to add event');
    console.error(err);
  }
}

// ── Employee Picker ─────────────────────────────────────────────────
let pendingAdd = null; // { dates, description }

function showEmployeePicker(dates, description) {
  pendingAdd = { dates, description };

  // Fetch employees for current team
  const teamUuid = isAdmin ? currentTeamUuid : userTeam?.uuid;
  if (!teamUuid) {
    showToast('No team selected');
    return;
  }

  api(`/api/teams/${encodeURIComponent(teamUuid)}/employees`).then(data => {
    if (!data) return;

    // Keep selected state
    const list = $('#picker-list');
    const selected = new Set();

    list.innerHTML = data.employees.map(emp => `
      <div class="picker-item" data-uuid="${escHtml(emp.employee_uuid)}">
        <span class="picker-check">☐</span>
        <span>${escHtml(emp.name)}</span>
        ${emp.role === 'lead' ? '<span class="chip">Lead</span>' : ''}
      </div>
    `).join('');

    list.querySelectorAll('.picker-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('selected');
        const check = item.querySelector('.picker-check');
        const uuid = item.dataset.uuid;
        if (item.classList.contains('selected')) {
          selected.add(uuid);
          check.textContent = '☑';
        } else {
          selected.delete(uuid);
          check.textContent = '☐';
        }
      });
    });

    $('#picker-modal').style.display = 'flex';

    // Confirm handler (rebind fresh)
    const confirmBtn = $('#picker-confirm');
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    newConfirm.addEventListener('click', () => {
      $('#picker-modal').style.display = 'none';
      addEvents(pendingAdd.dates, pendingAdd.description, [...selected]);
      pendingAdd = null;
    });
  });
}

function closePickerModal() {
  $('#picker-modal').style.display = 'none';
  pendingAdd = null;
}

// ── Refresh Views ───────────────────────────────────────────────────
function refreshViews() {
  if (currentView === 'calendar') renderCalendar();
  else renderList();
}

// ── Admin Team Switcher ─────────────────────────────────────────────
async function loadTeamsForSwitcher() {
  try {
    const data = await api('/api/teams');
    if (data) {
      allTeams = data.teams;

      const select = $('#team-switcher');
      select.innerHTML = '<option value="__all__">All Teams</option>';
      allTeams.forEach(t => {
        select.innerHTML += `<option value="${escHtml(t.uuid)}">${escHtml(t.name)}</option>`;
      });

      // Set initial value
      if (isAdmin && userTeam) {
        select.value = userTeam.uuid;
        currentTeamUuid = userTeam.uuid;
      } else if (isAdmin) {
        select.value = '__all__';
        currentTeamUuid = '__all__';
      }

      select.addEventListener('change', async () => {
        currentTeamUuid = select.value;
        if (currentTeamUuid === '__all__') {
          updateHeaderForAllTeams();
        } else {
          const team = allTeams.find(t => t.uuid === currentTeamUuid);
          updateHeaderTeam(team ? team.name : 'Team', currentTeamUuid);
        }
        await fetchEvents();
      });
    }
  } catch (err) {
    console.error('Failed to load teams:', err);
  }
}

function updateHeaderForAllTeams() {
  $('#team-name').textContent = 'All Teams';
}

function updateHeaderTeam(name, uuid) {
  $('#team-name').textContent = name;
  // Also load employees for this team
  currentTeamUuid = uuid;
  api(`/api/teams/${encodeURIComponent(uuid)}/employees`).then(data => {
    if (data) teamEmployees = data.employees;
  });
}

// ── Theme ───────────────────────────────────────────────────────────
function applyTelegramTheme() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  const tp = tg.themeParams;
  if (!tp) return;

  const root = document.documentElement;

  // Apply Telegram color scheme class
  root.classList.toggle('tg-dark', tg.colorScheme === 'dark');

  // Map theme params to CSS variables
  const map = {
    '--tg-theme-bg-color': tp.bg_color,
    '--tg-theme-text-color': tp.text_color,
    '--tg-theme-hint-color': tp.hint_color,
    '--tg-theme-link-color': tp.link_color,
    '--tg-theme-button-color': tp.button_color,
    '--tg-theme-button-text-color': tp.button_text_color,
    '--tg-theme-secondary-bg-color': tp.secondary_bg_color,
    '--tg-theme-header-bg-color': tp.header_bg_color || tp.bg_color,
    '--tg-theme-bottom-bar-bg-color': tp.bottom_bar_bg_color || tp.bg_color,
    '--tg-theme-accent-text-color': tp.accent_text_color || tp.button_color,
    '--tg-theme-section-bg-color': tp.section_bg_color || tp.secondary_bg_color,
    '--tg-theme-section-header-text-color': tp.section_header_text_color || tp.button_color,
    '--tg-theme-subtitle-text-color': tp.subtitle_text_color || tp.hint_color,
    '--tg-theme-destructive-text-color': tp.destructive_text_color,
  };

  for (const [key, val] of Object.entries(map)) {
    if (val) root.style.setProperty(key, val);
  }

  // Apply safe area insets from Telegram SDK
  const sa = tg.SafeAreaInset;
  if (sa) {
    root.style.setProperty('--safe-area-top', sa.top + 'px');
    root.style.setProperty('--safe-area-bottom', sa.bottom + 'px');
    root.style.setProperty('--safe-area-left', sa.left + 'px');
    root.style.setProperty('--safe-area-right', sa.right + 'px');
  }

  // Enable native header / bottom bar color matching
  tg.setHeaderColor?.(tp.header_bg_color || tp.bg_color);
  tg.setBottomBarColor?.(tp.bottom_bar_bg_color || tp.bg_color);
}

// ── Initialization ──────────────────────────────────────────────────
async function init() {
  // 1. Init Telegram WebApp
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    applyTelegramTheme();

    tg.onEvent('themeChanged', () => {
      applyTelegramTheme();
    });

    // 2. Get telegram user info
    const user = tg.initDataUnsafe?.user;
    if (user) {
      TG_ID = String(user.id);
      TG_NAME = [user.first_name, user.last_name].filter(Boolean).join(' ') || `User ${TG_ID}`;
    }
  } else {
    // Dev mode: generate a random test ID
    TG_ID = 'dev-' + Math.random().toString(36).slice(2, 9);
    TG_NAME = 'Dev User';
    console.log('[dev] Using test ID:', TG_ID);
  }

  // 3. Show loading screen
  $('#loading-screen').style.display = 'flex';

  // 4. Call /api/user/me
  try {
    const userData = await api('/api/user/me');
    if (!userData) return; // Access denied handled by api()

    isAdmin = userData.is_admin;
    userTeam = userData.team;

    // 5. Setup admin UI
    if (isAdmin) {
      $('#admin-badge').style.display = 'inline-block';
      $('#sync-btn').style.display = 'inline-flex';
      $('#team-switcher').style.display = 'block';
      await loadTeamsForSwitcher();
      currentTeamUuid = userTeam ? userTeam.uuid : '__all__';
    } else {
      currentTeamUuid = userTeam?.uuid;
      $('#team-name').textContent = userTeam?.name || 'My Team';
    }

    // 6. Fetch events
    await fetchEvents();

    // 7. Show main app
    $('#loading-screen').style.display = 'none';
    $('#main-app').style.display = 'flex';

    // 8. Initial render
    refreshViews();

    // 9. Load employees for non-admin
    if (!isAdmin && userTeam) {
      api(`/api/teams/${encodeURIComponent(userTeam.uuid)}/employees`).then(data => {
        if (data) teamEmployees = data.employees;
      });
    }

  } catch (err) {
    console.error('Init failed:', err);
    showAccessDenied();
  }

  // Bind global listeners
  bindListeners();
}

function bindListeners() {
  // Tab switching
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.tab;
      $('#view-calendar').style.display = currentView === 'calendar' ? 'block' : 'none';
      $('#view-list').style.display = currentView === 'list' ? 'block' : 'none';
      refreshViews();

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    });
  });

  // Calendar navigation
  const now = new Date();
  calendarYear = now.getFullYear();
  calendarMonth = now.getMonth();

  $('#cal-prev').addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderCalendar();
  });

  $('#cal-next').addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderCalendar();
  });

  // Add event button
  $('#add-event-btn').addEventListener('click', () => {
    const input = $('#event-input');
    const text = input.value.trim();
    if (!text) return;

    const parsed = parseEventText(text);
    if (!parsed) return;

    showEmployeePicker(parsed.dates, parsed.description);
    input.value = '';
    $('#event-preview').style.display = 'none';

    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }
  });

  // Sync button
  $('#sync-btn').addEventListener('click', async () => {
    const btn = $('#sync-btn');
    btn.textContent = '⏳';
    btn.disabled = true;
    try {
      const data = await api('/api/sync-hrm', { method: 'POST' });
      if (data) {
        showToast('Synced — ' + data.teams_count + ' teams loaded');
        await loadTeamsForSwitcher();
        await fetchEvents();
      }
    } catch (err) {
      showToast('Sync failed — ' + err.message);
    } finally {
      btn.textContent = '🔄';
      btn.disabled = false;
    }
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('success');
    }
  });

  // Live preview
  $('#event-input').addEventListener('input', () => {
    const text = $('#event-input').value.trim();
    const preview = $('#event-preview');
    if (!text) {
      preview.style.display = 'none';
      return;
    }
    const parsed = parseEventText(text);
    if (parsed && parsed.dates.length > 0) {
      const dateLabel = parsed.dates.length === 1
        ? formatDateLong(parsed.dates[0])
        : `${formatDate(parsed.dates[0])} — ${formatDate(parsed.dates[parsed.dates.length - 1])}`;
      preview.innerHTML = `<strong>${dateLabel}</strong>: ${escHtml(parsed.description)}`;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  });

  // Enter key to submit
  $('#event-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#add-event-btn').click();
  });

  // Modal close handlers
  $('#picker-cancel').addEventListener('click', closePickerModal);
  $('#detail-close').addEventListener('click', closeDetailModal);

  // Close modals on overlay click
  $('#picker-modal').addEventListener('click', (e) => {
    if (e.target === $('#picker-modal')) closePickerModal();
  });
  $('#detail-modal').addEventListener('click', (e) => {
    if (e.target === $('#detail-modal')) closeDetailModal();
  });
}

// ── Boot ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
