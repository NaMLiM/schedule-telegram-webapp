// Telegram WebApp Init
var tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  tg.ready(); tg.expand();
  if (tg.themeParams) {
    var p = tg.themeParams;
    var sv = function(n,v) { if (v) document.documentElement.style.setProperty(n,v); };
    sv('--tg-theme-bg-color',p.bg_color); sv('--tg-theme-text-color',p.text_color); sv('--tg-theme-hint-color',p.hint_color);
    sv('--tg-theme-link-color',p.link_color); sv('--tg-theme-button-color',p.button_color); sv('--tg-theme-button-text-color',p.button_text_color);
    sv('--tg-theme-secondary-bg-color',p.secondary_bg_color); sv('--tg-theme-section-bg-color',p.section_bg_color);
    sv('--tg-theme-destructive-text-color',p.destructive_text_color);
  }
}

// State
var state = { teams:[], selectedTeamUuid:null, events:[], employees:[], adminMode:false, view:'calendar',
  currentMonth:new Date().getMonth(), currentYear:new Date().getFullYear(), selectedDate:null, parsedEvent:null };

// DOM
function $(s) { return document.querySelector(s); }
var teamSelect = $('#teamSelect'), calViewBtn = $('#calViewBtn'), listViewBtn = $('#listViewBtn');
var calendarView = $('#calendarView'), listView = $('#listView'), calendarGrid = $('#calendarGrid');
var monthLabel = $('#monthLabel'), dayEvents = $('#dayEvents'), eventList = $('#eventList');
var eventInput = $('#eventInput'), eventForm = $('#eventForm'), parsedPreview = $('#parsedPreview');
var submitBtn = $('#submitBtn'), employeeAssignRow = $('#employeeAssignRow'), employeeCheckboxes = $('#employeeCheckboxes');
var syncBtn = $('#syncBtn'), statusBar = $('#statusBar');

// API
async function api(url, opts) {
  opts = opts || {};
  var res = await fetch(url, Object.assign({ headers:{'Content-Type':'application/json'} }, opts));
  if (!res.ok) { var b = await res.text(); throw new Error(b || 'HTTP '+res.status); }
  return res.json();
}

// Toast
function toast(m) {
  var e = document.createElement('div'); e.className='toast'; e.textContent=m; document.body.appendChild(e);
  setTimeout(function(){ e.classList.add('fade'); setTimeout(function(){ e.remove(); },300); },2000);
}

// Helpers
function parseMonth(n) {
  var m = {january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11,jan:0,feb:1,mar:2,apr:3,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  return m[(n||'').toLowerCase()] !== undefined ? m[n.toLowerCase()] : -1;
}
function fd(y,m,d) { return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
function fdd(s) { var p=s.split('-'), ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return ms[parseInt(p[1])-1]+' '+parseInt(p[2])+', '+p[0]; }
function eh(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// NL Parser
function parseNL(input) {
  if (!input.trim()) return null;
  var today = new Date(); today.setHours(0,0,0,0);
  // Range: "June 5-7: ..."
  var rm = input.match(/(\w+)\s+(\d{1,2})\s*-\s*(\d{1,2}),?\s*(\d{4})?/i);
  if (rm) { var mi=parseMonth(rm[1]); if(mi>=0){var yr=rm[4]?parseInt(rm[4]):today.getFullYear();var ds=[];for(var d=parseInt(rm[2]);d<=parseInt(rm[3]);d++)ds.push(fd(yr,mi+1,d));var desc=input.replace(rm[0],'').replace(/^[:,\s]+/,'').trim();return {dates:ds,description:desc||input};} }
  var ds=null;
  var onmd=input.match(/on\s+(\w+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?/i);
  if(onmd){var mi2=parseMonth(onmd[1]);if(mi2>=0){var yr2=onmd[3]?parseInt(onmd[3]):today.getFullYear();ds=fd(yr2,mi2+1,parseInt(onmd[2]));}}
  if(!ds&&/\btomorrow\b/i.test(input)){var t=new Date(today);t.setDate(t.getDate()+1);ds=fd(t.getFullYear(),t.getMonth()+1,t.getDate());}
  if(!ds&&/\btoday\b/i.test(input)){ds=fd(today.getFullYear(),today.getMonth()+1,today.getDate());}
  var ndm=input.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if(!ds&&ndm){var dw=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];var td=dw.indexOf(ndm[1].toLowerCase());var d2=new Date(today);var ut=(td+7-d2.getDay())%7||7;d2.setDate(d2.getDate()+ut);ds=fd(d2.getFullYear(),d2.getMonth()+1,d2.getDate());}
  if(!ds){var mdm=input.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\b(?!\d|[\s]*\-)/i);if(mdm){var mi3=parseMonth(mdm[1]);if(mi3>=0)ds=fd(today.getFullYear(),mi3+1,parseInt(mdm[2]));}}
  if(ds){var desc2=input.replace(/on\s+\w+\s+\d{1,2}(?:[,\s]+\d{4})?/i,'').replace(/\btomorrow\b/i,'').replace(/\btoday\b/i,'').replace(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,'').replace(/^[,.\s]+/,'').trim();return {dates:[ds],description:desc2||input};}
  if(input.trim()) return {dates:[fd(today.getFullYear(),today.getMonth()+1,today.getDate())],description:input.trim()};
  return null;
}

// Init
async function init() {
  await loadStatus(); await loadTeams();
  try{await api('/api/sync',{method:'POST'});}catch(e){}
  await loadTeams(); setStatus(); renderMonth();
}

async function loadStatus() {
  try{var d=await api('/api/status');state.adminMode=d.admin_mode;if(state.adminMode)document.querySelector('.app-header h1').textContent='📅 Team Schedule (Admin)';}catch(e){}
}

async function loadTeams() {
  try{var d=await api('/api/teams');state.teams=d.teams||[];teamSelect.innerHTML='<option value="">-- Select a team --</option>';
    state.teams.forEach(function(t){var o=document.createElement('option');o.value=t.uuid;o.textContent=t.name+' ('+t.team_type+')';teamSelect.appendChild(o);});
    if(state.selectedTeamUuid&&state.teams.find(function(t){return t.uuid===state.selectedTeamUuid;}))teamSelect.value=state.selectedTeamUuid;
  }catch(e){statusBar.textContent='Could not load teams';}
}

function setStatus(){var c=state.teams.length;statusBar.textContent=state.adminMode?'Admin mode · '+c+' team'+(c!==1?'s':''):c+' team'+(c!==1?'s':'')+' available';}

teamSelect.addEventListener('change',async function(){
  state.selectedTeamUuid=teamSelect.value;state.selectedDate=null;
  if(!state.selectedTeamUuid){renderMonth();renderList();renderDayEvents();updateEC();return;}
  await loadEvents();await loadEmployees();renderMonth();renderList();renderDayEvents();updateEC();
});

async function loadEvents(){if(!state.selectedTeamUuid){state.events=[];return;}try{var d=await api('/api/events?team_uuid='+encodeURIComponent(state.selectedTeamUuid));state.events=d.events||[];}catch(e){state.events=[];}}
async function loadEmployees(){if(!state.selectedTeamUuid){state.employees=[];return;}try{var d=await api('/api/teams/'+encodeURIComponent(state.selectedTeamUuid)+'/employees');state.employees=d.employees||[];}catch(e){state.employees=[];}}

function updateEC(){
  if(state.employees.length===0){employeeAssignRow.style.display='none';employeeCheckboxes.innerHTML='';return;}
  employeeAssignRow.style.display='block';
  employeeCheckboxes.innerHTML=state.employees.map(function(e){return '<label><input type="checkbox" value="'+e.employee_uuid+'"> '+e.name+(e.role==='leader'?' 👑':'')+'</label>';}).join('');
}

// Calendar
function renderMonth(){
  var mn=['January','February','March','April','May','June','July','August','September','October','November','December'];
  monthLabel.textContent=mn[state.currentMonth]+' '+state.currentYear;
  var fd2=new Date(state.currentYear,state.currentMonth,1).getDay();
  var dim=new Date(state.currentYear,state.currentMonth+1,0).getDate();
  var dip=new Date(state.currentYear,state.currentMonth,0).getDate();
  var ed={}; state.events.forEach(function(e){ed[e.event_date]=true;});
  var today=fd(new Date().getFullYear(),new Date().getMonth()+1,new Date().getDate());
  var h='';
  for(var i=fd2-1;i>=0;i--)h+='<div class="cal-day other-month">'+(dip-i)+'</div>';
  for(var d=1;d<=dim;d++){var ds2=fd(state.currentYear,state.currentMonth+1,d);var cl='cal-day';if(ed[ds2])cl+=' has-events';if(ds2===today)cl+=' today';if(ds2===state.selectedDate)cl+=' selected';h+='<div class="'+cl+'" data-date="'+ds2+'">'+d+'</div>';}
  var tc=fd2+dim;var rm2=tc%7===0?0:7-(tc%7);for(var j=1;j<=rm2;j++)h+='<div class="cal-day other-month">'+j+'</div>';
  calendarGrid.innerHTML=h;
  calendarGrid.querySelectorAll('.cal-day:not(.other-month)').forEach(function(el){el.addEventListener('click',function(){state.selectedDate=el.dataset.date;renderMonth();renderDayEvents();});});
}

function renderDayEvents(){
  if(!state.selectedDate||!state.selectedTeamUuid){dayEvents.innerHTML='';return;}
  var de=state.events.filter(function(e){return e.event_date===state.selectedDate;});
  if(de.length===0){dayEvents.innerHTML='<div class="empty-state">No events on '+fdd(state.selectedDate)+'</div>';return;}
  var h='<h4>'+fdd(state.selectedDate)+'</h4>';
  de.forEach(function(ev){var n=getAN(ev);h+='<div class="event-item"><div><p>'+eh(ev.description)+'</p>'+(n?'<div class="assignees">👤 '+n+'</div>':'')+'</div><button class="btn-danger" data-event-id="'+ev.id+'">✕</button></div>';});
  dayEvents.innerHTML=h;
  dayEvents.querySelectorAll('.btn-danger').forEach(function(b){b.addEventListener('click',async function(){try{await api('/api/events/'+b.dataset.eventId,{method:'DELETE'});toast('Event deleted');}catch(e){toast('Failed to delete');}await loadEvents();renderMonth();renderDayEvents();renderList();});});
}

function getAN(ev){
  if(!ev.assigned_employee_uuids||ev.assigned_employee_uuids.length===0)return '';
  var us={};ev.assigned_employee_uuids.forEach(function(u){us[u]=true;});
  return state.employees.filter(function(e){return us[e.employee_uuid];}).map(function(e){return e.name;}).join(', ');
}

// List
function renderList(){
  if(!state.selectedTeamUuid||state.events.length===0){eventList.innerHTML='<div class="empty-state">No events yet</div>';return;}
  var g={};state.events.forEach(function(e){if(!g[e.event_date])g[e.event_date]=[];g[e.event_date].push(e);});
  var h='';
  Object.keys(g).sort().forEach(function(ds3){h+='<div class="event-date-heading">'+fdd(ds3)+'</div>';
    g[ds3].forEach(function(ev){var n=getAN(ev);h+='<div class="event-item"><div><p>'+eh(ev.description)+'</p>'+(n?'<div class="assignees">👤 '+n+'</div>':'')+'</div><button class="btn-danger" data-event-id="'+ev.id+'">✕</button></div>';});
  });
  eventList.innerHTML=h;
  eventList.querySelectorAll('.btn-danger').forEach(function(b){b.addEventListener('click',async function(){try{await api('/api/events/'+b.dataset.eventId,{method:'DELETE'});toast('Event deleted');}catch(e){toast('Failed to delete');}await loadEvents();renderMonth();renderDayEvents();renderList();});});
}

// View toggle
calViewBtn.addEventListener('click',function(){state.view='calendar';calViewBtn.classList.add('active');listViewBtn.classList.remove('active');calendarView.classList.remove('hidden');listView.classList.add('hidden');renderMonth();renderDayEvents();});
listViewBtn.addEventListener('click',function(){state.view='list';listViewBtn.classList.add('active');calViewBtn.classList.remove('active');listView.classList.remove('hidden');calendarView.classList.add('hidden');renderList();});

// Month nav
$('#prevMonth').addEventListener('click',function(){if(state.currentMonth===0){state.currentMonth=11;state.currentYear--;}else state.currentMonth--;renderMonth();renderDayEvents();});
$('#nextMonth').addEventListener('click',function(){if(state.currentMonth===11){state.currentMonth=0;state.currentYear++;}else state.currentMonth++;renderMonth();renderDayEvents();});

// Sync
syncBtn.addEventListener('click',async function(){statusBar.textContent='Syncing...';try{await api('/api/sync',{method:'POST'});statusBar.textContent='Synced';}catch(e){statusBar.textContent='Sync failed';}await loadTeams();if(state.selectedTeamUuid){await loadEvents();await loadEmployees();updateEC();renderMonth();renderList();renderDayEvents();}setStatus();});

// NL Input
eventInput.addEventListener('input',function(){var p2=parseNL(eventInput.value);if(p2&&p2.description){state.parsedEvent=p2;parsedPreview.classList.remove('hidden');parsedPreview.innerHTML='📅 <strong>'+p2.dates.map(fdd).join(', ')+'</strong><br>'+eh(p2.description);submitBtn.disabled=false;}else{state.parsedEvent=null;parsedPreview.classList.add('hidden');parsedPreview.innerHTML='';submitBtn.disabled=true;}});

// Submit
eventForm.addEventListener('submit',async function(e){e.preventDefault();if(!state.parsedEvent||!state.selectedTeamUuid)return;
  var cbs=employeeCheckboxes.querySelectorAll('input[type="checkbox"]:checked');var as=[];cbs.forEach(function(c){as.push(c.value);});
  submitBtn.disabled=true;submitBtn.textContent='Adding...';
  try{for(var i=0;i<state.parsedEvent.dates.length;i++){await api('/api/events',{method:'POST',body:JSON.stringify({team_uuid:state.selectedTeamUuid,event_date:state.parsedEvent.dates[i],description:state.parsedEvent.description,assigned_employee_uuids:as})});}
    toast('Event'+(state.parsedEvent.dates.length>1?'s':'')+' added');eventInput.value='';state.parsedEvent=null;parsedPreview.classList.add('hidden');submitBtn.disabled=true;
    employeeCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(function(c){c.checked=false;});
    await loadEvents();renderMonth();renderList();renderDayEvents();
  }catch(err){toast('Failed to add event');}
  submitBtn.disabled=false;submitBtn.textContent='Add Event';
});

init();
