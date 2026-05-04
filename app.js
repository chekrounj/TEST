// ===================== TimeTrack — application logic =====================
// Persistence keys
const STORE_KEY = "timetrack.v1";

// ---------- Utilities ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = (p = "id") => p + "_" + Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtHours = (h) => (Math.round(h * 100) / 100).toFixed(2).replace(/\.00$/, "") + "h";
const fmtNum = (n) => Math.round(n * 100) / 100;

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return null;
}

function parseHours(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(",", ".");
  // "8h30" / "8:30"
  const hm = s.match(/^(\d+)\s*[h:]\s*(\d+)?$/i);
  if (hm) return Number(hm[1]) + (Number(hm[2] || 0) / 60);
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ---------- Store ----------
const defaultState = () => ({
  clients: [],
  projects: [],
  tasks: [],
  employees: [],
  assignments: [], // { id, employeeId, taskId, dueDate, urgency, estimate, note, status, createdAt, completedAt }
  timeEntries: [], // { id, employeeId, date, clientId, projectId, taskId, hours, description }
  attendance: [],  // { id, employeeId, date, hours }
  settings: { tolerance: 0.5, mode: "day", dailyHours: 8, block: "warn" },
  currentUserId: null,
});

let state = defaultState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) state = Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) {
    console.warn("Could not load state", e);
  }
}
function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

// ---------- Toasts ----------
function toast(msg, type = "info", ms = 3000) {
  const wrap = $("#toastWrap");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .25s";
    setTimeout(() => el.remove(), 260);
  }, ms);
}

// ---------- Lookups ----------
const byId = (list, id) => list.find(x => x.id === id);
const clientName = id => byId(state.clients, id)?.name || "—";
const projectName = id => byId(state.projects, id)?.name || "—";
const taskName = id => byId(state.tasks, id)?.name || "—";
const employeeName = id => byId(state.employees, id)?.name || "—";

// ---------- Navigation ----------
function showPage(name) {
  $$(".page").forEach(p => p.classList.remove("active"));
  $$(".nav-item").forEach(p => p.classList.remove("active"));
  const page = $("#page-" + name);
  if (page) page.classList.add("active");
  const nav = $(`.nav-item[data-page="${name}"]`);
  if (nav) nav.classList.add("active");
  const titles = {
    dashboard: ["Tableau de bord", "Vue d'ensemble de l'activité"],
    time: ["Saisie des heures", "Enregistrer les heures effectuées par tâche"],
    assignments: ["Tâches assignées", "Affectations, urgences et échéances"],
    clients: ["Clients", "Catalogue des clients"],
    projects: ["Projets", "Catalogue des projets"],
    tasks: ["Tâches", "Catalogue des tâches"],
    employees: ["Employés", "Liste des employés"],
    attendance: ["Présences", "Heures de présence et conciliation"],
    reports: ["Rapports", "Indicateurs et exports"],
    settings: ["Paramètres", "Tolérance, comparaison et données"],
  };
  const [t, s] = titles[name] || ["", ""];
  $("#pageTitle").textContent = t;
  $("#pageSub").textContent = s;
  if (name === "dashboard") renderDashboard();
  if (name === "time") renderTimePage();
  if (name === "assignments") renderAssignments();
  if (name === "clients") renderClients();
  if (name === "projects") renderProjects();
  if (name === "tasks") renderTasks();
  if (name === "employees") renderEmployees();
  if (name === "attendance") renderAttendance();
  if (name === "reports") renderReports();
  if (name === "settings") renderSettings();
}

// ---------- Selects ----------
function fillSelect(sel, items, opts = {}) {
  const value = sel.value;
  sel.innerHTML = "";
  if (opts.placeholder !== false) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = opts.placeholder || "— Sélectionner —";
    sel.appendChild(opt);
  }
  for (const it of items) {
    const opt = document.createElement("option");
    opt.value = it.value;
    opt.textContent = it.label;
    sel.appendChild(opt);
  }
  if (value && items.some(i => i.value === value)) sel.value = value;
}

function refreshSelects() {
  // Time entry
  fillSelect($("#teClient"), state.clients.map(c => ({ value: c.id, label: c.name })));
  fillSelect($("#teProject"), state.projects.map(p => ({ value: p.id, label: `${p.name} — ${clientName(p.clientId)}` })));
  fillSelect($("#teTask"), state.tasks.map(t => ({ value: t.id, label: `${t.name} — ${projectName(t.projectId)}` })));
  // Project form
  fillSelect($("#prClient"), state.clients.map(c => ({ value: c.id, label: c.name })));
  // Task form
  fillSelect($("#tkProject"), state.projects.map(p => ({ value: p.id, label: `${p.name} — ${clientName(p.clientId)}` })));
  // Assign form
  fillSelect($("#asEmployee"), state.employees.map(e => ({ value: e.id, label: e.name })));
  fillSelect($("#asTask"), state.tasks.map(t => ({ value: t.id, label: `${t.name} — ${projectName(t.projectId)}` })));
  // Attendance form
  fillSelect($("#atEmployee"), state.employees.map(e => ({ value: e.id, label: e.name })));
  // Reports
  fillSelect($("#rpEmployee"), [{ value: "all", label: "Tous" }, ...state.employees.map(e => ({ value: e.id, label: e.name }))], { placeholder: false });
  fillSelect($("#rpClient"), [{ value: "all", label: "Tous" }, ...state.clients.map(c => ({ value: c.id, label: c.name }))], { placeholder: false });
  // User picker
  const picker = $("#userPicker");
  picker.innerHTML = "";
  if (state.employees.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Ajouter un employé";
    picker.appendChild(opt);
  } else {
    for (const e of state.employees) {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = e.name;
      picker.appendChild(opt);
    }
    if (!state.currentUserId || !byId(state.employees, state.currentUserId)) {
      state.currentUserId = state.employees[0].id;
      saveState();
    }
    picker.value = state.currentUserId;
  }
  refreshUserCard();
}

function refreshUserCard() {
  const u = byId(state.employees, state.currentUserId);
  $("#userName").textContent = u ? u.name : "Aucun employé";
  $("#userInitials").textContent = u ? u.name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase() : "?";
  $("#timeEmployeeLbl").textContent = u ? `Employé : ${u.name}` : "";
}

// ===================== Dashboard =====================
let chartDaily, chartProjects, chartByEmp;

function totalHoursIn(range) {
  return state.timeEntries
    .filter(e => (!range.from || e.date >= range.from) && (!range.to || e.date <= range.to)
      && (!range.employeeId || e.employeeId === range.employeeId))
    .reduce((s, e) => s + Number(e.hours || 0), 0);
}

function renderDashboard() {
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - 6);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  const dailyData = days.map(d => state.timeEntries.filter(e => e.date === d).reduce((s, e) => s + Number(e.hours), 0));

  const weekHours = dailyData.reduce((a, b) => a + b, 0);
  $("#kpiWeekHours").textContent = fmtHours(weekHours);

  const pending = state.assignments.filter(a => a.status !== "done").length;
  const done = state.assignments.filter(a => a.status === "done").length;
  $("#kpiPending").textContent = pending;
  $("#kpiDone").textContent = done;

  // Variance: sum of |presence - entries| for last 7 days
  let totalVar = 0, totalAtt = 0;
  for (const d of days) {
    const att = state.attendance.filter(a => a.date === d).reduce((s, a) => s + Number(a.hours), 0);
    const log = state.timeEntries.filter(e => e.date === d).reduce((s, e) => s + Number(e.hours), 0);
    totalAtt += att;
    totalVar += Math.abs(att - log);
  }
  $("#kpiVariance").textContent = fmtHours(totalVar);
  $("#kpiVarianceLbl").textContent = `tolérance ±${state.settings.tolerance}h / ${state.settings.mode === "day" ? "jour" : "sem"}`;

  // Trend
  const lastWeek = dailyData[dailyData.length - 1] || 0;
  $("#kpiWeekTrend").textContent = lastWeek > 0 ? `aujourd'hui : ${fmtHours(lastWeek)}` : "aucune saisie aujourd'hui";

  // Charts
  drawDaily(days, dailyData);
  drawProjects();
  // Lists
  renderUrgentList();
  renderRecentList();
}

function drawDaily(labels, data) {
  if (!window.Chart) return;
  if (chartDaily) chartDaily.destroy();
  const ctx = $("#chartDaily").getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, "rgba(99,102,241,0.45)");
  grad.addColorStop(1, "rgba(99,102,241,0.02)");
  chartDaily = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.map(d => d.slice(5)),
      datasets: [{
        label: "Heures",
        data,
        fill: true, backgroundColor: grad, borderColor: "#6366f1",
        tension: 0.35, pointBackgroundColor: "#6366f1",
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function drawProjects() {
  if (!window.Chart) return;
  if (chartProjects) chartProjects.destroy();
  const map = new Map();
  for (const e of state.timeEntries) {
    map.set(e.projectId, (map.get(e.projectId) || 0) + Number(e.hours));
  }
  const labels = [...map.keys()].map(projectName);
  const values = [...map.values()];
  const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#22c55e"];
  chartProjects = new Chart($("#chartProjects").getContext("2d"), {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: labels.map((_, i) => colors[i % colors.length]) }] },
    options: { plugins: { legend: { position: "right" } } },
  });
}

function renderUrgentList() {
  const wrap = $("#urgentList");
  const items = state.assignments
    .filter(a => a.status !== "done")
    .sort((a, b) => (b.urgency === "urgent") - (a.urgency === "urgent") || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);
  if (items.length === 0) { wrap.innerHTML = `<div class="empty">Aucune tâche urgente</div>`; return; }
  wrap.innerHTML = items.map(a => `
    <div class="list-item">
      <div>
        <div><strong>${taskName(a.taskId)}</strong> ${badgeUrgency(a.urgency)}</div>
        <div class="meta">${employeeName(a.employeeId)} · échéance ${a.dueDate}</div>
      </div>
      ${badgeStatus(a.status)}
    </div>
  `).join("");
}

function renderRecentList() {
  const wrap = $("#recentList");
  const items = [...state.timeEntries].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
  if (items.length === 0) { wrap.innerHTML = `<div class="empty">Aucune saisie récente</div>`; return; }
  wrap.innerHTML = items.map(e => `
    <div class="list-item">
      <div>
        <div><strong>${taskName(e.taskId)}</strong> · ${fmtHours(Number(e.hours))}</div>
        <div class="meta">${employeeName(e.employeeId)} · ${projectName(e.projectId)} · ${e.date}</div>
      </div>
      <span class="badge badge-progress">${e.date}</span>
    </div>
  `).join("");
}

function badgeUrgency(u) {
  return u === "urgent"
    ? `<span class="badge badge-urgent">URGENT</span>`
    : `<span class="badge badge-normal">Normal</span>`;
}
function badgeStatus(s) {
  if (s === "done") return `<span class="badge badge-done">Achevée</span>`;
  if (s === "in_progress") return `<span class="badge badge-progress">En cours</span>`;
  return `<span class="badge badge-pending">En attente</span>`;
}

// ===================== Time entries =====================
function getDayHoursLogged(employeeId, date, exceptId = null) {
  return state.timeEntries
    .filter(e => e.employeeId === employeeId && e.date === date && e.id !== exceptId)
    .reduce((s, e) => s + Number(e.hours), 0);
}
function getWeekHoursLogged(employeeId, date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday-based
  const monday = new Date(d); monday.setDate(d.getDate() - day);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const from = monday.toISOString().slice(0, 10);
  const to = sunday.toISOString().slice(0, 10);
  return state.timeEntries.filter(e => e.employeeId === employeeId && e.date >= from && e.date <= to)
    .reduce((s, e) => s + Number(e.hours), 0);
}
function getAttendance(employeeId, date) {
  if (state.settings.mode === "week") {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    const monday = new Date(d); monday.setDate(d.getDate() - day);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const from = monday.toISOString().slice(0, 10);
    const to = sunday.toISOString().slice(0, 10);
    return state.attendance.filter(a => a.employeeId === employeeId && a.date >= from && a.date <= to)
      .reduce((s, a) => s + Number(a.hours), 0);
  }
  return state.attendance.filter(a => a.employeeId === employeeId && a.date === date)
    .reduce((s, a) => s + Number(a.hours), 0);
}

function reconcileFor(employeeId, date, addedHours = 0, exceptId = null) {
  const logged = (state.settings.mode === "week"
    ? getWeekHoursLogged(employeeId, date)
    : getDayHoursLogged(employeeId, date, exceptId)) + Number(addedHours || 0);
  const present = getAttendance(employeeId, date);
  const variance = logged - present;
  const tol = Number(state.settings.tolerance || 0);
  let status = "ok";
  if (Math.abs(variance) > tol) status = variance > 0 ? "over" : "under";
  return { logged, present, variance, status };
}

function renderTimePage() {
  $("#teDate").value = $("#teDate").value || todayStr();
  // Auto-link client when project selected, etc.
  $("#teProject").onchange = () => {
    const p = byId(state.projects, $("#teProject").value);
    if (p) $("#teClient").value = p.clientId;
    fillSelect($("#teTask"), state.tasks.filter(t => !p || t.projectId === p.id).map(t => ({ value: t.id, label: t.name })));
  };
  $("#teClient").onchange = () => {
    const cid = $("#teClient").value;
    fillSelect($("#teProject"), state.projects.filter(p => !cid || p.clientId === cid).map(p => ({ value: p.id, label: p.name })));
  };

  const updateReconcile = () => {
    const empId = state.currentUserId;
    const date = $("#teDate").value;
    const h = parseHours($("#teHours").value);
    if (!empId || !date) { $("#teReconcile").textContent = ""; return; }
    const r = reconcileFor(empId, date, h);
    const el = $("#teReconcile");
    el.classList.remove("ok", "warn", "bad");
    if (r.present === 0) {
      el.textContent = `Présence non saisie pour ${date}`;
      el.classList.add("warn");
      return;
    }
    const sign = r.variance >= 0 ? "+" : "";
    if (r.status === "ok") {
      el.textContent = `✓ Saisie ${fmtHours(r.logged)} / présence ${fmtHours(r.present)} (écart ${sign}${fmtNum(r.variance)}h)`;
      el.classList.add("ok");
    } else if (r.status === "over") {
      el.textContent = `⚠ Trop d'heures saisies : ${fmtHours(r.logged)} vs présence ${fmtHours(r.present)} (écart +${fmtNum(r.variance)}h, tol ±${state.settings.tolerance}h)`;
      el.classList.add("bad");
    } else {
      el.textContent = `⚠ Heures incomplètes : ${fmtHours(r.logged)} vs présence ${fmtHours(r.present)} (écart ${fmtNum(r.variance)}h, tol ±${state.settings.tolerance}h)`;
      el.classList.add("bad");
    }
  };
  $("#teHours").oninput = updateReconcile;
  $("#teDate").onchange = updateReconcile;
  updateReconcile();

  renderEntriesTable();
}

function renderEntriesTable() {
  const from = $("#teFrom").value;
  const to = $("#teTo").value;
  const list = state.timeEntries
    .filter(e => e.employeeId === state.currentUserId)
    .filter(e => (!from || e.date >= from) && (!to || e.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  const tbl = $("#entriesTable");
  if (list.length === 0) {
    tbl.innerHTML = `<thead><tr><th>Date</th><th>Client</th><th>Projet</th><th>Tâche</th><th>Heures</th><th></th></tr></thead><tbody><tr><td colspan="6" class="empty">Aucune saisie</td></tr></tbody>`;
    return;
  }
  tbl.innerHTML = `
    <thead><tr><th>Date</th><th>Client</th><th>Projet</th><th>Tâche</th><th>Heures</th><th>Description</th><th></th></tr></thead>
    <tbody>
    ${list.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${clientName(e.clientId)}</td>
        <td>${projectName(e.projectId)}</td>
        <td>${taskName(e.taskId)}</td>
        <td><strong>${fmtHours(Number(e.hours))}</strong></td>
        <td>${e.description || ""}</td>
        <td><button class="btn-icon" data-del-entry="${e.id}" title="Supprimer">✕</button></td>
      </tr>
    `).join("")}
    </tbody>`;
  tbl.onclick = ev => {
    const id = ev.target.dataset.delEntry;
    if (id) {
      state.timeEntries = state.timeEntries.filter(e => e.id !== id);
      saveState(); renderEntriesTable(); renderDashboard();
      toast("Saisie supprimée", "info");
    }
  };
}

// ===================== Assignments =====================
function renderAssignments() {
  $("#asDue").value = $("#asDue").value || todayStr();
  const status = $("#asFilterStatus").value;
  const urg = $("#asFilterUrgency").value;
  const list = state.assignments
    .filter(a => status === "all" || a.status === status)
    .filter(a => urg === "all" || a.urgency === urg)
    .sort((a, b) => (b.urgency === "urgent") - (a.urgency === "urgent") || a.dueDate.localeCompare(b.dueDate));
  const tbl = $("#assignTable");
  if (list.length === 0) {
    tbl.innerHTML = `<thead><tr><th>Tâche</th><th>Employé</th><th>Échéance</th><th>Urgence</th><th>Estim.</th><th>Statut</th><th></th></tr></thead><tbody><tr><td colspan="7" class="empty">Aucune assignation</td></tr></tbody>`;
    return;
  }
  tbl.innerHTML = `
    <thead><tr><th>Tâche</th><th>Employé</th><th>Échéance</th><th>Urgence</th><th>Estim.</th><th>Réel</th><th>Statut</th><th></th></tr></thead>
    <tbody>
    ${list.map(a => {
      const real = state.timeEntries.filter(e => e.taskId === a.taskId && e.employeeId === a.employeeId).reduce((s, e) => s + Number(e.hours), 0);
      return `
        <tr>
          <td><strong>${taskName(a.taskId)}</strong><div class="meta">${projectName(byId(state.tasks, a.taskId)?.projectId)}</div></td>
          <td>${employeeName(a.employeeId)}</td>
          <td>${a.dueDate}</td>
          <td>${badgeUrgency(a.urgency)}</td>
          <td>${a.estimate ? fmtHours(Number(a.estimate)) : "—"}</td>
          <td>${fmtHours(real)}</td>
          <td>${badgeStatus(a.status)}</td>
          <td>
            <select data-status="${a.id}">
              <option value="pending" ${a.status === "pending" ? "selected" : ""}>En attente</option>
              <option value="in_progress" ${a.status === "in_progress" ? "selected" : ""}>En cours</option>
              <option value="done" ${a.status === "done" ? "selected" : ""}>Achevée</option>
            </select>
            <button class="btn-icon" data-del-as="${a.id}">✕</button>
          </td>
        </tr>`;
    }).join("")}
    </tbody>`;
  tbl.onchange = ev => {
    const id = ev.target.dataset.status;
    if (id) {
      const a = byId(state.assignments, id);
      a.status = ev.target.value;
      a.completedAt = a.status === "done" ? Date.now() : null;
      saveState();
      toast("Statut mis à jour", "success");
    }
  };
  tbl.onclick = ev => {
    const id = ev.target.dataset.delAs;
    if (id) {
      state.assignments = state.assignments.filter(a => a.id !== id);
      saveState(); renderAssignments();
      toast("Assignation supprimée", "info");
    }
  };
}

// ===================== Catalog (clients/projects/tasks/employees) =====================
function renderClients() {
  const tbl = $("#clientsTable");
  if (state.clients.length === 0) {
    tbl.innerHTML = `<thead><tr><th>Nom</th><th>Code</th><th>Contact</th><th>Email</th><th></th></tr></thead><tbody><tr><td colspan="5" class="empty">Aucun client</td></tr></tbody>`;
    return;
  }
  tbl.innerHTML = `
    <thead><tr><th>Nom</th><th>Code</th><th>Contact</th><th>Email</th><th></th></tr></thead>
    <tbody>${state.clients.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.code || ""}</td>
        <td>${c.contact || ""}</td>
        <td>${c.email || ""}</td>
        <td><button class="btn-icon" data-del-cl="${c.id}">✕</button></td>
      </tr>`).join("")}
    </tbody>`;
  tbl.onclick = ev => {
    const id = ev.target.dataset.delCl;
    if (id) {
      const used = state.projects.some(p => p.clientId === id);
      if (used && !confirm("Ce client a des projets. Supprimer quand même ?")) return;
      state.clients = state.clients.filter(c => c.id !== id);
      saveState(); refreshSelects(); renderClients();
      toast("Client supprimé", "info");
    }
  };
}

function renderProjects() {
  const tbl = $("#projectsTable");
  if (state.projects.length === 0) {
    tbl.innerHTML = `<thead><tr><th>Nom</th><th>Client</th><th>Code</th><th>Statut</th><th></th></tr></thead><tbody><tr><td colspan="5" class="empty">Aucun projet</td></tr></tbody>`;
    return;
  }
  tbl.innerHTML = `
    <thead><tr><th>Nom</th><th>Client</th><th>Code</th><th>Statut</th><th></th></tr></thead>
    <tbody>${state.projects.map(p => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${clientName(p.clientId)}</td>
        <td>${p.code || ""}</td>
        <td>${p.status === "closed" ? `<span class="badge badge-warn">Clôturé</span>` : `<span class="badge badge-ok">Actif</span>`}</td>
        <td><button class="btn-icon" data-del-pr="${p.id}">✕</button></td>
      </tr>`).join("")}
    </tbody>`;
  tbl.onclick = ev => {
    const id = ev.target.dataset.delPr;
    if (id) {
      state.projects = state.projects.filter(p => p.id !== id);
      state.tasks = state.tasks.filter(t => t.projectId !== id);
      saveState(); refreshSelects(); renderProjects();
      toast("Projet supprimé", "info");
    }
  };
}

function renderTasks() {
  const tbl = $("#tasksTable");
  if (state.tasks.length === 0) {
    tbl.innerHTML = `<thead><tr><th>Nom</th><th>Projet</th><th>Client</th><th>Code</th><th>Estim.</th><th></th></tr></thead><tbody><tr><td colspan="6" class="empty">Aucune tâche</td></tr></tbody>`;
    return;
  }
  tbl.innerHTML = `
    <thead><tr><th>Nom</th><th>Projet</th><th>Client</th><th>Code</th><th>Estim.</th><th></th></tr></thead>
    <tbody>${state.tasks.map(t => {
      const p = byId(state.projects, t.projectId);
      return `<tr>
        <td><strong>${t.name}</strong></td>
        <td>${projectName(t.projectId)}</td>
        <td>${p ? clientName(p.clientId) : "—"}</td>
        <td>${t.code || ""}</td>
        <td>${t.estimate ? fmtHours(Number(t.estimate)) : ""}</td>
        <td><button class="btn-icon" data-del-tk="${t.id}">✕</button></td>
      </tr>`;
    }).join("")}
    </tbody>`;
  tbl.onclick = ev => {
    const id = ev.target.dataset.delTk;
    if (id) {
      state.tasks = state.tasks.filter(t => t.id !== id);
      state.assignments = state.assignments.filter(a => a.taskId !== id);
      state.timeEntries = state.timeEntries.filter(e => e.taskId !== id);
      saveState(); refreshSelects(); renderTasks();
      toast("Tâche supprimée", "info");
    }
  };
}

function renderEmployees() {
  const tbl = $("#employeesTable");
  if (state.employees.length === 0) {
    tbl.innerHTML = `<thead><tr><th>Nom</th><th>Matricule</th><th>Email</th><th>Service</th><th></th></tr></thead><tbody><tr><td colspan="5" class="empty">Aucun employé</td></tr></tbody>`;
    return;
  }
  tbl.innerHTML = `
    <thead><tr><th>Nom</th><th>Matricule</th><th>Email</th><th>Service</th><th></th></tr></thead>
    <tbody>${state.employees.map(e => `
      <tr>
        <td><strong>${e.name}</strong></td>
        <td>${e.code || ""}</td>
        <td>${e.email || ""}</td>
        <td>${e.team || ""}</td>
        <td><button class="btn-icon" data-del-em="${e.id}">✕</button></td>
      </tr>`).join("")}
    </tbody>`;
  tbl.onclick = ev => {
    const id = ev.target.dataset.delEm;
    if (id) {
      state.employees = state.employees.filter(e => e.id !== id);
      if (state.currentUserId === id) state.currentUserId = state.employees[0]?.id || null;
      saveState(); refreshSelects(); renderEmployees();
      toast("Employé supprimé", "info");
    }
  };
}

// ===================== Attendance + reconciliation =====================
function renderAttendance() {
  $("#atDate").value = $("#atDate").value || todayStr();
  const tbl = $("#reconcileTable");
  // Build a per-employee/date matrix from attendance + entries
  const keys = new Set();
  for (const a of state.attendance) keys.add(`${a.employeeId}|${a.date}`);
  for (const e of state.timeEntries) keys.add(`${e.employeeId}|${e.date}`);
  const rows = [...keys].map(k => {
    const [emp, date] = k.split("|");
    const att = state.attendance.filter(a => a.employeeId === emp && a.date === date).reduce((s, a) => s + Number(a.hours), 0);
    const log = state.timeEntries.filter(e => e.employeeId === emp && e.date === date).reduce((s, e) => s + Number(e.hours), 0);
    return { emp, date, att, log, diff: log - att };
  }).sort((a, b) => b.date.localeCompare(a.date));
  if (rows.length === 0) {
    tbl.innerHTML = `<thead><tr><th>Employé</th><th>Date</th><th>Présence</th><th>Saisies</th><th>Écart</th><th>Statut</th></tr></thead><tbody><tr><td colspan="6" class="empty">Aucune donnée</td></tr></tbody>`;
    return;
  }
  const tol = Number(state.settings.tolerance || 0);
  tbl.innerHTML = `
    <thead><tr><th>Employé</th><th>Date</th><th>Présence</th><th>Saisies</th><th>Écart</th><th>Statut</th></tr></thead>
    <tbody>${rows.map(r => {
      let badge = `<span class="badge badge-ok">OK</span>`;
      if (Math.abs(r.diff) > tol) badge = `<span class="badge badge-bad">Hors tolérance</span>`;
      else if (Math.abs(r.diff) > 0) badge = `<span class="badge badge-warn">Léger écart</span>`;
      return `<tr>
        <td>${employeeName(r.emp)}</td>
        <td>${r.date}</td>
        <td>${fmtHours(r.att)}</td>
        <td>${fmtHours(r.log)}</td>
        <td>${r.diff >= 0 ? "+" : ""}${fmtNum(r.diff)}h</td>
        <td>${badge}</td>
      </tr>`;
    }).join("")}
    </tbody>`;
}

// ===================== Reports =====================
function renderReports() {
  const from = $("#rpFrom").value;
  const to = $("#rpTo").value;
  const empF = $("#rpEmployee").value || "all";
  const cliF = $("#rpClient").value || "all";

  const inRange = (e) =>
    (!from || e.date >= from) && (!to || e.date <= to)
    && (empF === "all" || e.employeeId === empF)
    && (cliF === "all" || e.clientId === cliF);

  const entries = state.timeEntries.filter(inRange);

  const pending = state.assignments.filter(a => a.status !== "done"
    && (empF === "all" || a.employeeId === empF)
    && (cliF === "all" || byId(state.tasks, a.taskId) && byId(state.projects, byId(state.tasks, a.taskId)?.projectId)?.clientId === cliF)).length;
  const done = state.assignments.filter(a => a.status === "done"
    && (empF === "all" || a.employeeId === empF)).length;
  $("#rpPending").textContent = pending;
  $("#rpDone").textContent = done;

  // Processing time per task: total hours, first/last entry
  const taskMap = new Map();
  for (const e of entries) {
    const m = taskMap.get(e.taskId) || { taskId: e.taskId, hours: 0, first: e.date, last: e.date, count: 0 };
    m.hours += Number(e.hours);
    m.count += 1;
    if (e.date < m.first) m.first = e.date;
    if (e.date > m.last) m.last = e.date;
    taskMap.set(e.taskId, m);
  }
  const procRows = [...taskMap.values()].sort((a, b) => b.hours - a.hours);
  const procTbl = $("#rpProcessing");
  if (procRows.length === 0) {
    procTbl.innerHTML = `<thead><tr><th>Tâche</th><th>Heures</th><th>Saisies</th><th>Période</th></tr></thead><tbody><tr><td colspan="4" class="empty">Aucune donnée</td></tr></tbody>`;
  } else {
    procTbl.innerHTML = `
      <thead><tr><th>Tâche</th><th>Heures</th><th>Saisies</th><th>Période</th></tr></thead>
      <tbody>${procRows.map(r => `
        <tr><td>${taskName(r.taskId)}</td><td><strong>${fmtHours(r.hours)}</strong></td><td>${r.count}</td><td>${r.first} → ${r.last}</td></tr>
      `).join("")}</tbody>`;
  }

  // By employee chart
  if (chartByEmp) chartByEmp.destroy();
  const emps = (empF === "all" ? state.employees : state.employees.filter(e => e.id === empF));
  const labels = emps.map(e => e.name);
  const values = emps.map(e => entries.filter(t => t.employeeId === e.id).reduce((s, t) => s + Number(t.hours), 0));
  if (window.Chart && labels.length) {
    chartByEmp = new Chart($("#chartByEmp").getContext("2d"), {
      type: "bar",
      data: { labels, datasets: [{ data: values, backgroundColor: "#6366f1", borderRadius: 8 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });
  }

  // Tasks detail
  const allTasks = state.assignments.filter(a => empF === "all" || a.employeeId === empF);
  const tbl = $("#rpTasksTable");
  if (allTasks.length === 0) {
    tbl.innerHTML = `<thead><tr><th>Tâche</th><th>Employé</th><th>Urgence</th><th>Échéance</th><th>Statut</th><th>Heures réelles</th></tr></thead><tbody><tr><td colspan="6" class="empty">Aucune assignation</td></tr></tbody>`;
  } else {
    tbl.innerHTML = `
      <thead><tr><th>Tâche</th><th>Employé</th><th>Urgence</th><th>Échéance</th><th>Statut</th><th>Heures réelles</th></tr></thead>
      <tbody>${allTasks.map(a => {
        const real = state.timeEntries.filter(e => e.taskId === a.taskId && e.employeeId === a.employeeId).reduce((s, e) => s + Number(e.hours), 0);
        return `<tr>
          <td>${taskName(a.taskId)}</td>
          <td>${employeeName(a.employeeId)}</td>
          <td>${badgeUrgency(a.urgency)}</td>
          <td>${a.dueDate}</td>
          <td>${badgeStatus(a.status)}</td>
          <td><strong>${fmtHours(real)}</strong></td>
        </tr>`;
      }).join("")}</tbody>`;
  }
}

// ===================== Settings =====================
function renderSettings() {
  $("#stTolerance").value = state.settings.tolerance;
  $("#stMode").value = state.settings.mode;
  $("#stDailyHours").value = state.settings.dailyHours;
  $("#stBlock").value = state.settings.block;
}

// ===================== Excel I/O =====================
function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => resolve(r.result);
    r.readAsArrayBuffer(file);
  });
}

async function importExcel(file) {
  const buf = await readFile(file);
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function get(row, ...keys) {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase().trim() === k.toLowerCase()) return row[rk];
    }
  }
  return "";
}

function downloadTemplate(filename, headers, rows = []) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Modele");
  XLSX.writeFile(wb, filename);
}

async function importClientsFile(file) {
  const rows = await importExcel(file);
  let added = 0, skipped = 0;
  for (const r of rows) {
    const name = String(get(r, "Nom", "Name", "Client") || "").trim();
    if (!name) { skipped++; continue; }
    if (state.clients.some(c => c.name.toLowerCase() === name.toLowerCase())) { skipped++; continue; }
    state.clients.push({
      id: uid("cl"), name,
      code: String(get(r, "Code") || "").trim(),
      contact: String(get(r, "Contact") || "").trim(),
      email: String(get(r, "Email", "Mail") || "").trim(),
    });
    added++;
  }
  saveState(); refreshSelects(); renderClients();
  toast(`${added} clients importés, ${skipped} ignorés`, added ? "success" : "warn");
}

async function importProjectsFile(file) {
  const rows = await importExcel(file);
  let added = 0, skipped = 0;
  for (const r of rows) {
    const name = String(get(r, "Nom", "Name", "Projet", "Project") || "").trim();
    const cliName = String(get(r, "Client") || "").trim();
    if (!name || !cliName) { skipped++; continue; }
    let client = state.clients.find(c => c.name.toLowerCase() === cliName.toLowerCase());
    if (!client) { client = { id: uid("cl"), name: cliName }; state.clients.push(client); }
    if (state.projects.some(p => p.name.toLowerCase() === name.toLowerCase() && p.clientId === client.id)) { skipped++; continue; }
    state.projects.push({
      id: uid("pr"), name, clientId: client.id,
      code: String(get(r, "Code") || "").trim(),
      status: String(get(r, "Statut", "Status") || "active").toLowerCase().includes("clos") ? "closed" : "active",
    });
    added++;
  }
  saveState(); refreshSelects(); renderProjects();
  toast(`${added} projets importés, ${skipped} ignorés`, added ? "success" : "warn");
}

async function importTasksFile(file) {
  const rows = await importExcel(file);
  let added = 0, skipped = 0;
  for (const r of rows) {
    const name = String(get(r, "Nom", "Name", "Tache", "Tâche", "Task") || "").trim();
    const projName = String(get(r, "Projet", "Project") || "").trim();
    if (!name || !projName) { skipped++; continue; }
    const project = state.projects.find(p => p.name.toLowerCase() === projName.toLowerCase());
    if (!project) { skipped++; continue; }
    if (state.tasks.some(t => t.name.toLowerCase() === name.toLowerCase() && t.projectId === project.id)) { skipped++; continue; }
    state.tasks.push({
      id: uid("tk"), name, projectId: project.id,
      code: String(get(r, "Code") || "").trim(),
      estimate: parseHours(get(r, "Estim", "Estimation", "Heures estimees", "Heures estimées")) || null,
    });
    added++;
  }
  saveState(); refreshSelects(); renderTasks();
  toast(`${added} tâches importées, ${skipped} ignorées`, added ? "success" : "warn");
}

async function importEmployeesFile(file) {
  const rows = await importExcel(file);
  let added = 0, skipped = 0;
  for (const r of rows) {
    const name = String(get(r, "Nom", "Name", "Employe", "Employé") || "").trim();
    if (!name) { skipped++; continue; }
    if (state.employees.some(e => e.name.toLowerCase() === name.toLowerCase())) { skipped++; continue; }
    state.employees.push({
      id: uid("em"), name,
      code: String(get(r, "Matricule", "Code") || "").trim(),
      email: String(get(r, "Email", "Mail") || "").trim(),
      team: String(get(r, "Service", "Team", "Equipe", "Équipe") || "").trim(),
    });
    added++;
  }
  saveState(); refreshSelects(); renderEmployees();
  toast(`${added} employés importés, ${skipped} ignorés`, added ? "success" : "warn");
}

async function importAttendanceFile(file) {
  const rows = await importExcel(file);
  let added = 0, skipped = 0;
  for (const r of rows) {
    const empName = String(get(r, "Employe", "Employé", "Nom", "Name") || "").trim();
    const matricule = String(get(r, "Matricule", "Code") || "").trim();
    const date = parseDate(get(r, "Date", "Jour"));
    const hours = parseHours(get(r, "Heures", "Hours", "Presence", "Présence"));
    if (!date || !hours) { skipped++; continue; }
    let emp = null;
    if (matricule) emp = state.employees.find(e => e.code && e.code.toLowerCase() === matricule.toLowerCase());
    if (!emp && empName) emp = state.employees.find(e => e.name.toLowerCase() === empName.toLowerCase());
    if (!emp && empName) {
      emp = { id: uid("em"), name: empName, code: matricule };
      state.employees.push(emp);
    }
    if (!emp) { skipped++; continue; }
    // Replace existing same-day record
    state.attendance = state.attendance.filter(a => !(a.employeeId === emp.id && a.date === date));
    state.attendance.push({ id: uid("at"), employeeId: emp.id, date, hours });
    added++;
  }
  saveState(); refreshSelects(); renderAttendance();
  toast(`${added} présences importées, ${skipped} ignorées`, added ? "success" : "warn");
}

function exportReportExcel() {
  const wb = XLSX.utils.book_new();
  // Saisies
  const entries = state.timeEntries.map(e => ({
    Date: e.date, Employé: employeeName(e.employeeId),
    Client: clientName(e.clientId), Projet: projectName(e.projectId), Tâche: taskName(e.taskId),
    Heures: Number(e.hours), Description: e.description || "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entries), "Saisies");
  // Assignations
  const assigns = state.assignments.map(a => ({
    Tâche: taskName(a.taskId), Employé: employeeName(a.employeeId),
    Urgence: a.urgency, Échéance: a.dueDate, Statut: a.status,
    Estimation: a.estimate || "",
    Réel: state.timeEntries.filter(e => e.taskId === a.taskId && e.employeeId === a.employeeId).reduce((s, e) => s + Number(e.hours), 0),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assigns), "Assignations");
  // Conciliation
  const keys = new Set();
  for (const a of state.attendance) keys.add(`${a.employeeId}|${a.date}`);
  for (const e of state.timeEntries) keys.add(`${e.employeeId}|${e.date}`);
  const reco = [...keys].map(k => {
    const [emp, date] = k.split("|");
    const att = state.attendance.filter(a => a.employeeId === emp && a.date === date).reduce((s, a) => s + Number(a.hours), 0);
    const log = state.timeEntries.filter(e => e.employeeId === emp && e.date === date).reduce((s, e) => s + Number(e.hours), 0);
    return { Employé: employeeName(emp), Date: date, Présence: att, Saisies: log, Écart: log - att };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reco), "Conciliation");
  XLSX.writeFile(wb, "rapport-timetrack.xlsx");
}

// ===================== Seed =====================
function seedDemo() {
  if (!confirm("Charger des données d'exemple ? (les données existantes seront conservées)")) return;
  const cl1 = { id: uid("cl"), name: "ACME Corp", code: "ACM", contact: "Marie Dupont", email: "marie@acme.com" };
  const cl2 = { id: uid("cl"), name: "Globex", code: "GLB", contact: "Jean Martin", email: "j.martin@globex.com" };
  state.clients.push(cl1, cl2);

  const pr1 = { id: uid("pr"), name: "Refonte site web", clientId: cl1.id, code: "WEB-25", status: "active" };
  const pr2 = { id: uid("pr"), name: "Application mobile", clientId: cl1.id, code: "MOB-25", status: "active" };
  const pr3 = { id: uid("pr"), name: "Migration ERP", clientId: cl2.id, code: "ERP-25", status: "active" };
  state.projects.push(pr1, pr2, pr3);

  const tasks = [
    { id: uid("tk"), name: "Maquettes UI", projectId: pr1.id, estimate: 12 },
    { id: uid("tk"), name: "Intégration HTML", projectId: pr1.id, estimate: 24 },
    { id: uid("tk"), name: "Backend API", projectId: pr1.id, estimate: 30 },
    { id: uid("tk"), name: "Conception iOS", projectId: pr2.id, estimate: 16 },
    { id: uid("tk"), name: "Conception Android", projectId: pr2.id, estimate: 16 },
    { id: uid("tk"), name: "Migration des données", projectId: pr3.id, estimate: 40 },
    { id: uid("tk"), name: "Formation utilisateurs", projectId: pr3.id, estimate: 8 },
  ];
  state.tasks.push(...tasks);

  const e1 = { id: uid("em"), name: "Sophie Bernard", code: "EMP001", email: "s.bernard@ex.com", team: "Dev" };
  const e2 = { id: uid("em"), name: "Lucas Moreau", code: "EMP002", email: "l.moreau@ex.com", team: "Dev" };
  const e3 = { id: uid("em"), name: "Emma Laurent", code: "EMP003", email: "e.laurent@ex.com", team: "Design" };
  state.employees.push(e1, e2, e3);
  if (!state.currentUserId) state.currentUserId = e1.id;

  // Assignments
  const today = new Date();
  const dPlus = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  state.assignments.push(
    { id: uid("as"), employeeId: e1.id, taskId: tasks[2].id, dueDate: dPlus(3), urgency: "urgent", estimate: 30, status: "in_progress", note: "Priorité haute", createdAt: Date.now() },
    { id: uid("as"), employeeId: e2.id, taskId: tasks[1].id, dueDate: dPlus(7), urgency: "normal", estimate: 24, status: "pending", note: "", createdAt: Date.now() },
    { id: uid("as"), employeeId: e3.id, taskId: tasks[0].id, dueDate: dPlus(2), urgency: "urgent", estimate: 12, status: "in_progress", note: "Validation client", createdAt: Date.now() },
    { id: uid("as"), employeeId: e1.id, taskId: tasks[5].id, dueDate: dPlus(14), urgency: "normal", estimate: 40, status: "pending", note: "", createdAt: Date.now() },
    { id: uid("as"), employeeId: e2.id, taskId: tasks[6].id, dueDate: dPlus(-2), urgency: "normal", estimate: 8, status: "done", completedAt: Date.now(), createdAt: Date.now() - 86400000 * 5 },
  );

  // Time entries last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = dPlus(-i);
    state.timeEntries.push({ id: uid("te"), employeeId: e1.id, date: d, clientId: cl1.id, projectId: pr1.id, taskId: tasks[2].id, hours: 4 + Math.random() * 3, description: "Dév API", createdAt: Date.now() - i * 86400000 });
    state.timeEntries.push({ id: uid("te"), employeeId: e2.id, date: d, clientId: cl1.id, projectId: pr1.id, taskId: tasks[1].id, hours: 3 + Math.random() * 3, description: "Intégration", createdAt: Date.now() - i * 86400000 });
    state.timeEntries.push({ id: uid("te"), employeeId: e3.id, date: d, clientId: cl1.id, projectId: pr1.id, taskId: tasks[0].id, hours: 2 + Math.random() * 4, description: "UI", createdAt: Date.now() - i * 86400000 });
    state.attendance.push({ id: uid("at"), employeeId: e1.id, date: d, hours: 8 });
    state.attendance.push({ id: uid("at"), employeeId: e2.id, date: d, hours: 7.5 });
    state.attendance.push({ id: uid("at"), employeeId: e3.id, date: d, hours: 8 });
  }

  saveState(); refreshSelects(); showPage("dashboard");
  toast("Données d'exemple chargées", "success");
}

// ===================== Wiring =====================
function on(sel, ev, fn) { const el = $(sel); if (el) el.addEventListener(ev, fn); }

function bindNav() {
  $$(".nav-item").forEach(n => n.addEventListener("click", e => { e.preventDefault(); showPage(n.dataset.page); }));
}

function bindForms() {
  // Client
  on("#clientForm", "submit", e => {
    e.preventDefault();
    const name = $("#clName").value.trim();
    if (!name) return;
    state.clients.push({ id: uid("cl"), name, code: $("#clCode").value.trim(), contact: $("#clContact").value.trim(), email: $("#clEmail").value.trim() });
    saveState(); refreshSelects(); renderClients(); e.target.reset();
    toast("Client ajouté", "success");
  });
  // Project
  on("#projectForm", "submit", e => {
    e.preventDefault();
    const name = $("#prName").value.trim();
    const clientId = $("#prClient").value;
    if (!name || !clientId) { toast("Renseignez nom et client", "warn"); return; }
    state.projects.push({ id: uid("pr"), name, clientId, code: $("#prCode").value.trim(), status: $("#prStatus").value });
    saveState(); refreshSelects(); renderProjects(); e.target.reset();
    toast("Projet ajouté", "success");
  });
  // Task
  on("#taskForm", "submit", e => {
    e.preventDefault();
    const name = $("#tkName").value.trim();
    const projectId = $("#tkProject").value;
    if (!name || !projectId) { toast("Renseignez nom et projet", "warn"); return; }
    state.tasks.push({
      id: uid("tk"), name, projectId,
      code: $("#tkCode").value.trim(),
      estimate: parseHours($("#tkEstimate").value) || null,
    });
    saveState(); refreshSelects(); renderTasks(); e.target.reset();
    toast("Tâche ajoutée", "success");
  });
  // Employee
  on("#employeeForm", "submit", e => {
    e.preventDefault();
    const name = $("#emName").value.trim();
    if (!name) return;
    state.employees.push({ id: uid("em"), name, code: $("#emCode").value.trim(), email: $("#emEmail").value.trim(), team: $("#emTeam").value.trim() });
    if (!state.currentUserId) state.currentUserId = state.employees[state.employees.length - 1].id;
    saveState(); refreshSelects(); renderEmployees(); e.target.reset();
    toast("Employé ajouté", "success");
  });
  // Assignment
  on("#assignForm", "submit", e => {
    e.preventDefault();
    const employeeId = $("#asEmployee").value;
    const taskId = $("#asTask").value;
    const dueDate = $("#asDue").value;
    if (!employeeId || !taskId || !dueDate) { toast("Renseignez employé, tâche et date", "warn"); return; }
    state.assignments.push({
      id: uid("as"), employeeId, taskId, dueDate,
      urgency: $("#asUrgency").value,
      estimate: parseHours($("#asEst").value) || null,
      note: $("#asNote").value.trim(),
      status: "pending", createdAt: Date.now(),
    });
    saveState(); renderAssignments(); e.target.reset();
    toast("Tâche assignée", "success");
  });
  on("#asFilterStatus", "change", renderAssignments);
  on("#asFilterUrgency", "change", renderAssignments);

  // Time
  on("#timeForm", "submit", e => {
    e.preventDefault();
    const empId = state.currentUserId;
    if (!empId) { toast("Sélectionnez un employé", "warn"); return; }
    const date = $("#teDate").value;
    const clientId = $("#teClient").value;
    const projectId = $("#teProject").value;
    const taskId = $("#teTask").value;
    const hours = parseHours($("#teHours").value);
    if (!date || !clientId || !projectId || !taskId || !hours) { toast("Tous les champs sont requis", "warn"); return; }
    const r = reconcileFor(empId, date, hours);
    if (r.status !== "ok" && state.settings.block === "block" && r.present > 0) {
      toast(`Saisie bloquée : écart de ${fmtNum(r.variance)}h vs présence (${fmtHours(r.present)}). Tolérance ±${state.settings.tolerance}h`, "error", 5000);
      return;
    }
    if (r.status !== "ok" && r.present > 0) {
      toast(`Attention : écart de ${fmtNum(r.variance)}h par rapport à la présence (${fmtHours(r.present)})`, "warn", 5000);
    }
    if (r.present === 0) {
      toast("Présence non saisie pour cette date — saisie enregistrée sans contrôle", "warn", 4000);
    }
    state.timeEntries.push({
      id: uid("te"), employeeId: empId, date, clientId, projectId, taskId,
      hours, description: $("#teDesc").value.trim(), createdAt: Date.now(),
    });
    saveState(); renderTimePage(); renderDashboard();
    $("#teHours").value = ""; $("#teDesc").value = "";
    toast("Heures enregistrées", "success");
  });
  on("#teFrom", "change", renderEntriesTable);
  on("#teTo", "change", renderEntriesTable);

  // Attendance
  on("#attendanceForm", "submit", e => {
    e.preventDefault();
    const employeeId = $("#atEmployee").value;
    const date = $("#atDate").value;
    const hours = parseHours($("#atHours").value);
    if (!employeeId || !date || !hours) { toast("Tous les champs sont requis", "warn"); return; }
    state.attendance = state.attendance.filter(a => !(a.employeeId === employeeId && a.date === date));
    state.attendance.push({ id: uid("at"), employeeId, date, hours });
    saveState(); renderAttendance();
    toast("Présence enregistrée", "success");
  });

  // Settings
  on("#settingsForm", "submit", e => {
    e.preventDefault();
    state.settings.tolerance = parseFloat($("#stTolerance").value) || 0;
    state.settings.mode = $("#stMode").value;
    state.settings.dailyHours = parseFloat($("#stDailyHours").value) || 8;
    state.settings.block = $("#stBlock").value;
    saveState();
    toast("Paramètres sauvegardés", "success");
  });

  // User picker
  on("#userPicker", "change", e => {
    state.currentUserId = e.target.value || null;
    saveState(); refreshUserCard(); renderTimePage(); renderDashboard();
  });

  // Imports + templates
  const wireImport = (btnSel, fileSel, handler) => {
    on(btnSel, "click", () => $(fileSel).click());
    on(fileSel, "change", async e => {
      const f = e.target.files[0]; if (!f) return;
      try { await handler(f); } catch (err) { console.error(err); toast("Erreur d'import : " + err.message, "error", 5000); }
      e.target.value = "";
    });
  };
  wireImport("#btnImportClients", "#fileClients", importClientsFile);
  wireImport("#btnImportProjects", "#fileProjects", importProjectsFile);
  wireImport("#btnImportTasks", "#fileTasks", importTasksFile);
  wireImport("#btnImportEmployees", "#fileEmployees", importEmployeesFile);
  wireImport("#btnImportAttendance", "#fileAttendance", importAttendanceFile);

  on("#btnTplClients", "click", () => downloadTemplate("modele-clients.xlsx", ["Nom", "Code", "Contact", "Email"], [["ACME Corp", "ACM", "Marie Dupont", "marie@acme.com"]]));
  on("#btnTplProjects", "click", () => downloadTemplate("modele-projets.xlsx", ["Nom", "Client", "Code", "Statut"], [["Refonte site", "ACME Corp", "WEB-25", "actif"]]));
  on("#btnTplTasks", "click", () => downloadTemplate("modele-taches.xlsx", ["Nom", "Projet", "Code", "Heures estimees"], [["Maquettes UI", "Refonte site", "T01", 12]]));
  on("#btnTplEmployees", "click", () => downloadTemplate("modele-employes.xlsx", ["Nom", "Matricule", "Email", "Service"], [["Sophie Bernard", "EMP001", "s.bernard@ex.com", "Dev"]]));
  on("#btnTplAttendance", "click", () => downloadTemplate("modele-presences.xlsx", ["Employe", "Matricule", "Date", "Heures"], [["Sophie Bernard", "EMP001", todayStr(), 8]]));

  // Reports
  on("#rpFrom", "change", renderReports);
  on("#rpTo", "change", renderReports);
  on("#rpEmployee", "change", renderReports);
  on("#rpClient", "change", renderReports);
  on("#btnExportReport", "click", exportReportExcel);

  // Top-bar
  on("#btnSeed", "click", seedDemo);
  on("#btnQuickEntry", "click", () => showPage("time"));

  // Settings extras
  on("#btnExportAll", "click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "timetrack-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  on("#btnImportAll", "click", () => $("#fileAll").click());
  on("#fileAll", "change", async e => {
    const f = e.target.files[0]; if (!f) return;
    const txt = await f.text();
    try {
      state = Object.assign(defaultState(), JSON.parse(txt));
      saveState(); refreshSelects(); showPage("dashboard");
      toast("Données importées", "success");
    } catch (err) { toast("Fichier invalide", "error"); }
    e.target.value = "";
  });
  on("#btnReset", "click", () => {
    if (!confirm("Effacer toutes les données ? Cette action est irréversible.")) return;
    state = defaultState();
    saveState(); refreshSelects(); showPage("dashboard");
    toast("Données réinitialisées", "info");
  });
}

// ---------- Boot ----------
function boot() {
  loadState();
  // First run: prompt to seed
  bindNav();
  bindForms();
  refreshSelects();
  showPage("dashboard");
}

document.addEventListener("DOMContentLoaded", boot);
