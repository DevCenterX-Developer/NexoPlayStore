// ─── NexoPlayStore — Panel de Administración ─────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInAnonymously, signOut as fbSignOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBbldp35i1iUmISHRxOnIUe72U8tGZsIc4",
  authDomain: "nexostore-ee75f.firebaseapp.com",
  projectId: "nexostore-ee75f",
  storageBucket: "nexostore-ee75f.firebasestorage.app",
  messagingSenderId: "306815622750",
  appId: "1:306815622750:web:a6d2967f5afa8603281ecf",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const icons = () => { if (window.lucide) lucide.createIcons(); };

// ── Admin auth (simple password) ─────────────────────────────────────────
const ADMIN_SESSION_KEY = "nexo_admin_ok";
const ADMIN_PASSWORD = "NexoStore";

async function adminLogin(password) {
  if (password !== ADMIN_PASSWORD) return false;
  try { await signInAnonymously(auth); } catch { /* rules may be open */ }
  sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  return true;
}
async function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  try { await fbSignOut(auth); } catch {}
}
function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

// ── Games / Sales collections ────────────────────────────────────────────
const GAMES_COL = "games";
const SALES_COL = "sales";

const DEFAULT_GAMES = [
  { name: "Diamantes Free Fire", emoji: "💎", currency: "Diamantes", price: 15000, cost: 11000, active: true },
  { name: "Robux Roblox", emoji: "🎮", currency: "Robux", price: 12000, cost: 9000, active: true },
  { name: "UC PUBG Mobile", emoji: "🚀", currency: "UC", price: 18000, cost: 13000, active: true },
  { name: "CP COD Mobile", emoji: "🔥", currency: "CP", price: 16000, cost: 12000, active: true },
  { name: "Clash of Clans / Royale", emoji: "⚔️", currency: "Gemas", price: 14000, cost: 10500, active: true },
];

async function ensureGamesSeeded() {
  try {
    const snap = await getDocs(collection(db, GAMES_COL));
    if (snap.empty) {
      await Promise.all(DEFAULT_GAMES.map(g => setDoc(doc(collection(db, GAMES_COL)), g)));
    }
  } catch (err) {
    console.error("No se pudo verificar/sembrar el catálogo de juegos:", err);
  }
}

function subscribeGames(onData, onError) {
  return onSnapshot(collection(db, GAMES_COL), snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => onError?.(err));
}
async function saveGame(game) {
  const { id, ...data } = game;
  await setDoc(doc(db, GAMES_COL, id), data);
}
async function deleteGame(id) { await deleteDoc(doc(db, GAMES_COL, id)); }
function newGameId() { return doc(collection(db, GAMES_COL)).id; }

function subscribeSales(onData, onError) {
  const q = query(collection(db, SALES_COL), orderBy("date", "desc"));
  return onSnapshot(q, snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => onError?.(err));
}
async function saveSale(sale) {
  const { id, ...data } = sale;
  await setDoc(doc(db, SALES_COL, id), data);
}
async function updateSaleStatus(id, status) { await setDoc(doc(db, SALES_COL, id), { status }, { merge: true }); }
async function deleteSale(id) { await deleteDoc(doc(db, SALES_COL, id)); }
function newSaleId() { return doc(collection(db, SALES_COL)).id; }

function getDashboardStats(sales) {
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.date).toDateString() === today && s.status !== "Fallido");
  return {
    todayRevenue: todaySales.reduce((a, s) => a + s.price, 0),
    todayProfit: todaySales.reduce((a, s) => a + s.profit, 0),
    todayCount: todaySales.length,
    pendingCount: sales.filter(s => s.status === "Pendiente").length,
    totalRevenue: sales.filter(s => s.status !== "Fallido").reduce((a, s) => a + s.price, 0),
    totalProfit: sales.filter(s => s.status !== "Fallido").reduce((a, s) => a + s.profit, 0),
  };
}

function exportSalesToCSV(sales) {
  const headers = ["ID", "Fecha", "Juego", "Cantidad", "Precio COP", "Ganancia COP", "Estado", "Cliente", "Tag Jugador", "Notas"];
  const rows = sales.map(s => [s.id, new Date(s.date).toLocaleString("es-CO"), s.gameName, s.amount, s.price, s.profit, s.status, s.customerName, s.playerTag, s.notes]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ventas_nexoplaystore_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function fmt(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

// ── View switching (login vs app) ────────────────────────────────────────
const viewChecking = document.getElementById("view-checking");
const viewLogin = document.getElementById("view-login");
const viewApp = document.getElementById("view-app");

function showLogin() {
  viewChecking.classList.add("hidden");
  viewApp.classList.add("hidden");
  viewLogin.classList.remove("hidden");
  icons();
}
function showApp() {
  viewChecking.classList.add("hidden");
  viewLogin.classList.add("hidden");
  viewApp.classList.remove("hidden");
  ensureGamesSeeded();
  buildNav();
  router();
  icons();
}

async function bootstrap() {
  if (isAdminLoggedIn()) {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("No se pudo restablecer la sesión de Firebase:", err);
    }
    showApp();
  } else {
    showLogin();
  }
}
bootstrap();

// ── Login form ────────────────────────────────────────────────────────────
const loginForm = document.getElementById("login-form");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginSubmit = document.getElementById("login-submit");

document.getElementById("login-toggle-pw").addEventListener("click", () => {
  const isPw = loginPassword.type === "password";
  loginPassword.type = isPw ? "text" : "password";
  document.getElementById("login-toggle-pw").innerHTML = `<i data-lucide="${isPw ? "eye-off" : "eye"}"></i>`;
  icons();
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  loginSubmit.disabled = true;
  const original = loginSubmit.innerHTML;
  loginSubmit.innerHTML = `<span class="spinner sm"></span> Verificando...`;
  const ok = await adminLogin(loginPassword.value);
  loginSubmit.disabled = false;
  loginSubmit.innerHTML = original;
  icons();
  if (ok) {
    location.hash = "#/dashboard";
    showApp();
  } else {
    loginError.textContent = "Contraseña incorrecta.";
    loginError.classList.remove("hidden");
    loginPassword.value = "";
  }
});

async function doLogout() {
  await adminLogout();
  showLogin();
  loginForm.reset();
}
document.getElementById("desktop-logout-btn").addEventListener("click", doLogout);
document.getElementById("mobile-logout-btn").addEventListener("click", doLogout);

// ── Sidebar nav / routing ────────────────────────────────────────────────
const NAV = [
  { hash: "#/dashboard", icon: "layout-dashboard", label: "Dashboard" },
  { hash: "#/games", icon: "gamepad-2", label: "Juegos" },
  { hash: "#/sales", icon: "shopping-bag", label: "Ventas" },
];

function buildNav() {
  const current = location.hash || "#/dashboard";
  const navHtml = NAV.map(n => `<a href="${n.hash}" class="${current === n.hash ? "active" : ""}" data-hash="${n.hash}"><i data-lucide="${n.icon}"></i>${n.label}</a>`).join("");
  document.getElementById("desktop-nav").innerHTML = navHtml;
  document.getElementById("mobile-nav").innerHTML = navHtml;
  icons();
  document.querySelectorAll("#mobile-nav a").forEach(a => a.addEventListener("click", closeDrawer));
}

const drawer = document.getElementById("mobile-drawer");
document.getElementById("mobile-menu-btn").addEventListener("click", () => drawer.classList.add("open"));
document.getElementById("mobile-drawer-backdrop").addEventListener("click", closeDrawer);
function closeDrawer() { drawer.classList.remove("open"); }

const pages = { "#/dashboard": "page-dashboard", "#/games": "page-games", "#/sales": "page-sales" };
let gamesUnsub = null, salesUnsub = null, dashUnsub = null;

function router() {
  if (!isAdminLoggedIn()) { showLogin(); return; }
  const hash = pages[location.hash] ? location.hash : "#/dashboard";
  Object.entries(pages).forEach(([h, id]) => document.getElementById(id).classList.toggle("hidden", h !== hash));
  buildNav();
  if (hash === "#/dashboard") initDashboard();
  if (hash === "#/games") initGames();
  if (hash === "#/sales") initSales();
}
window.addEventListener("hashchange", router);

// ── Dashboard ─────────────────────────────────────────────────────────────
function initDashboard() {
  document.getElementById("dashboard-date").textContent =
    new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const loading = document.getElementById("dashboard-loading");
  const content = document.getElementById("dashboard-content");
  const errorBox = document.getElementById("dashboard-error");
  loading.classList.remove("hidden");
  content.classList.add("hidden");
  errorBox.innerHTML = "";

  if (dashUnsub) dashUnsub();
  dashUnsub = subscribeSales(
    sales => {
      loading.classList.add("hidden");
      content.classList.remove("hidden");
      renderDashboard(sales);
    },
    err => {
      loading.classList.add("hidden");
      errorBox.innerHTML = `<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:16px;padding:1rem;margin-bottom:1rem;font-size:.85rem;color:#f87171">Error al cargar ventas: ${err.message}</div>`;
    }
  );
}

function renderDashboard(sales) {
  const stats = getDashboardStats(sales);
  const cards = [
    { label: "Ingresos de hoy", value: fmt(stats.todayRevenue), icon: "dollar-sign", color: "#60a5fa", bg: "rgba(59,130,246,.1)" },
    { label: "Ganancia de hoy", value: fmt(stats.todayProfit), icon: "trending-up", color: "#4ade80", bg: "rgba(34,197,94,.1)" },
    { label: "Ventas de hoy", value: stats.todayCount, icon: "shopping-bag", color: "#be00cc", bg: "rgba(190,0,204,.1)" },
    { label: "Pendientes", value: stats.pendingCount, icon: "clock", color: "#facc15", bg: "rgba(234,179,8,.1)" },
  ];
  document.getElementById("stat-grid").innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="top">
        <p>${c.label}</p>
        <div class="icon-badge" style="background:${c.bg}"><i data-lucide="${c.icon}" style="color:${c.color};width:16px;height:16px"></i></div>
      </div>
      <p class="value" style="color:${c.color}">${c.value}</p>
    </div>`).join("");

  document.getElementById("total-revenue").textContent = fmt(stats.totalRevenue);
  document.getElementById("total-profit").textContent = fmt(stats.totalProfit);

  const recent = sales.slice(0, 8);
  const recentBox = document.getElementById("recent-sales");
  recentBox.innerHTML = recent.length === 0
    ? `<p class="empty-msg">Sin ventas registradas aún</p>`
    : recent.map(s => `
      <div class="recent-row">
        <span style="font-size:1.3rem">${s.gameEmoji}</span>
        <div style="flex:1;min-width:0">
          <p class="name">${s.customerName}</p>
          <p class="sub">${s.amount} · ${new Date(s.date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div>
          <p class="amount">${fmt(s.price)}</p>
          <span class="badge badge-${s.status}">${s.status}</span>
        </div>
      </div>`).join("");
  icons();
}

// ── Games page ────────────────────────────────────────────────────────────
let currentGames = [];
let editingGameId = null;
let pendingDeleteGameId = null;

function initGames() {
  const loading = document.getElementById("games-loading");
  const errorBox = document.getElementById("games-error");
  loading.classList.remove("hidden");
  errorBox.innerHTML = "";
  if (gamesUnsub) gamesUnsub();
  gamesUnsub = subscribeGames(
    games => { loading.classList.add("hidden"); currentGames = games; renderGamesList(games); populateGameSelect(games); },
    err => { loading.classList.add("hidden"); errorBox.innerHTML = `<div style="padding:.75rem 1.25rem;font-size:.85rem;color:#f87171;background:rgba(239,68,68,.1);border-bottom:1px solid rgba(239,68,68,.2)">Error al cargar juegos: ${err.message}</div>`; }
  );
}

function renderGamesList(games) {
  const box = document.getElementById("games-list");
  if (games.length === 0) { box.innerHTML = `<p class="empty-msg">Sin juegos. Agrega el primero.</p>`; return; }
  box.innerHTML = games.map(g => `
    <div class="data-row">
      <div class="mobile-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">
          <div style="display:flex;align-items:center;gap:.5rem">
            <span style="font-size:1.4rem">${g.emoji}</span>
            <div><p style="font-size:.9rem;font-weight:600">${g.name}</p><p style="font-size:.75rem;color:#6b7280">${g.currency}</p></div>
          </div>
          <span class="chip ${g.active ? "chip-active" : "chip-inactive"}">${g.active ? "Activo" : "Inactivo"}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.75rem;font-size:.85rem">
          <div><p style="font-size:.7rem;color:#6b7280">Precio</p><p style="font-weight:600">${fmt(g.price)}</p></div>
          <div><p style="font-size:.7rem;color:#6b7280">Costo</p><p style="font-weight:600">${fmt(g.cost)}</p></div>
          <div><p style="font-size:.7rem;color:#6b7280">Ganancia</p><p style="font-weight:600;color:#4ade80">${fmt(g.price - g.cost)}</p></div>
        </div>
        <div style="display:flex;gap:.5rem">
          <button class="btn btn-outline" style="flex:1;justify-content:center;font-size:.75rem" data-action="toggle" data-id="${g.id}">${g.active ? "Desactivar" : "Activar"}</button>
          <button class="btn" style="flex:1;justify-content:center;font-size:.75rem;background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.2)" data-action="edit" data-id="${g.id}"><i data-lucide="pencil" style="width:14px;height:14px"></i>Editar</button>
          <button class="btn" style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)" data-action="delete" data-id="${g.id}"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
        </div>
      </div>
      <div class="desktop-row games-row">
        <div style="display:flex;align-items:center;gap:.75rem"><span style="font-size:1.2rem">${g.emoji}</span><div><p style="font-size:.9rem">${g.name}</p><p style="font-size:.75rem;color:#6b7280">${g.currency}</p></div></div>
        <p style="font-size:.9rem">${fmt(g.price)}</p>
        <p style="font-size:.9rem;color:#9ca3af">${fmt(g.cost)}</p>
        <p style="font-size:.9rem;color:#4ade80;font-weight:600">${fmt(g.price - g.cost)}</p>
        <button class="chip ${g.active ? "chip-active" : "chip-inactive"}" data-action="toggle" data-id="${g.id}">${g.active ? "Activo" : "Inactivo"}</button>
        <div style="display:flex;gap:.25rem">
          <button class="icon-btn blue" data-action="edit" data-id="${g.id}" title="Editar"><i data-lucide="pencil" style="width:15px;height:15px"></i></button>
          <button class="icon-btn red" data-action="delete" data-id="${g.id}" title="Eliminar"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button>
        </div>
      </div>
    </div>`).join("");
  icons();

  box.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const g = currentGames.find(x => x.id === id);
      if (action === "toggle") saveGame({ ...g, active: !g.active });
      if (action === "edit") openGameModal(g);
      if (action === "delete") { pendingDeleteGameId = id; document.getElementById("game-delete-modal").classList.add("open"); }
    });
  });
}

// Game modal
const gameModal = document.getElementById("game-modal");
const gameEmoji = document.getElementById("game-emoji");
const gameName = document.getElementById("game-name");
const gameCurrency = document.getElementById("game-currency");
const gamePrice = document.getElementById("game-price");
const gameCost = document.getElementById("game-cost");
const gameActiveToggle = document.getElementById("game-active-toggle");
const gameActiveLabel = document.getElementById("game-active-label");
const gameProfitPreview = document.getElementById("game-profit-preview");
const gameSaveError = document.getElementById("game-save-error");
let gameActive = true;

function openGameModal(game) {
  editingGameId = game ? game.id : null;
  document.getElementById("game-modal-title").textContent = game ? "Editar juego" : "Agregar juego";
  gameEmoji.value = game ? game.emoji : "🎮";
  gameName.value = game ? game.name : "";
  gameCurrency.value = game ? game.currency : "";
  gamePrice.value = game ? game.price : 0;
  gameCost.value = game ? game.cost : 0;
  gameActive = game ? game.active : true;
  updateGameToggleUI();
  updateGameProfitPreview();
  gameSaveError.classList.add("hidden");
  gameModal.classList.add("open");
  icons();
}
function updateGameToggleUI() {
  gameActiveToggle.classList.toggle("on", gameActive);
  gameActiveLabel.textContent = gameActive ? "Activo en la tienda" : "Inactivo";
}
function updateGameProfitPreview() {
  const price = Number(gamePrice.value) || 0;
  const cost = Number(gameCost.value) || 0;
  const profit = price - cost;
  const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : "0";
  gameProfitPreview.textContent = `${fmt(profit)} (${margin}%)`;
  gameProfitPreview.style.color = profit >= 0 ? "#4ade80" : "#f87171";
}
[gamePrice, gameCost].forEach(el => el.addEventListener("input", updateGameProfitPreview));
gameActiveToggle.addEventListener("click", () => { gameActive = !gameActive; updateGameToggleUI(); });

document.getElementById("add-game-btn").addEventListener("click", () => openGameModal(null));
document.getElementById("game-modal-close").addEventListener("click", () => gameModal.classList.remove("open"));
document.getElementById("game-modal-cancel").addEventListener("click", () => gameModal.classList.remove("open"));

document.getElementById("game-modal-save").addEventListener("click", async () => {
  if (!gameName.value || !gameCurrency.value) return;
  const btn = document.getElementById("game-modal-save");
  const original = btn.innerHTML;
  btn.innerHTML = `<span class="spinner sm"></span> Guardar`;
  try {
    const game = {
      id: editingGameId ?? newGameId(),
      name: gameName.value, emoji: gameEmoji.value || "🎮", currency: gameCurrency.value,
      price: Number(gamePrice.value) || 0, cost: Number(gameCost.value) || 0, active: gameActive,
    };
    await saveGame(game);
    gameModal.classList.remove("open");
  } catch (err) {
    gameSaveError.textContent = "No se pudo guardar. Verifica permisos de Firestore.";
    gameSaveError.classList.remove("hidden");
  } finally {
    btn.innerHTML = original;
    icons();
  }
});

document.getElementById("game-delete-cancel").addEventListener("click", () => document.getElementById("game-delete-modal").classList.remove("open"));
document.getElementById("game-delete-confirm").addEventListener("click", async () => {
  if (pendingDeleteGameId) await deleteGame(pendingDeleteGameId);
  pendingDeleteGameId = null;
  document.getElementById("game-delete-modal").classList.remove("open");
});

function populateGameSelect(games) {
  const filterSelect = document.getElementById("filter-game");
  const saleSelect = document.getElementById("sale-game");
  if (filterSelect) {
    const cur = filterSelect.value;
    filterSelect.innerHTML = `<option value="">Todos los juegos</option>` + games.map(g => `<option value="${g.id}">${g.emoji} ${g.name}</option>`).join("");
    filterSelect.value = cur;
  }
  if (saleSelect) {
    const cur = saleSelect.value;
    saleSelect.innerHTML = `<option value="">Selecciona un juego</option>` + games.map(g => `<option value="${g.id}">${g.emoji} ${g.name}</option>`).join("");
    saleSelect.value = cur;
  }
}

// ── Sales page ────────────────────────────────────────────────────────────
let currentSales = [];
let pendingDeleteSaleId = null;

function initSales() {
  const loading = document.getElementById("sales-loading");
  const errorBox = document.getElementById("sales-error");
  loading.classList.remove("hidden");
  errorBox.innerHTML = "";

  if (salesUnsub) salesUnsub();
  salesUnsub = subscribeSales(
    sales => { loading.classList.add("hidden"); currentSales = sales; renderSalesList(); },
    err => { loading.classList.add("hidden"); errorBox.innerHTML = `<div style="padding:.75rem 1.25rem;font-size:.85rem;color:#f87171;background:rgba(239,68,68,.1);border-bottom:1px solid rgba(239,68,68,.2)">Error al cargar ventas: ${err.message}</div>`; }
  );

  if (!gamesUnsub) {
    gamesUnsub = subscribeGames(games => { currentGames = games; populateGameSelect(games); }, () => {});
  } else {
    populateGameSelect(currentGames);
  }
}

function getFilteredSales() {
  const search = document.getElementById("filter-search").value.toLowerCase();
  const status = document.getElementById("filter-status").value;
  const gameId = document.getElementById("filter-game").value;
  const date = document.getElementById("filter-date").value;
  return currentSales.filter(s => {
    if (status && s.status !== status) return false;
    if (gameId && s.gameId !== gameId) return false;
    if (date && !s.date.startsWith(date)) return false;
    if (search && !s.customerName.toLowerCase().includes(search) && !s.playerTag.toLowerCase().includes(search) && !s.id.toLowerCase().includes(search)) return false;
    return true;
  });
}

["filter-search", "filter-status", "filter-game", "filter-date"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderSalesList);
});
document.getElementById("clear-filters-btn").addEventListener("click", () => {
  document.getElementById("filter-search").value = "";
  document.getElementById("filter-status").value = "";
  document.getElementById("filter-game").value = "";
  document.getElementById("filter-date").value = "";
  renderSalesList();
});
document.getElementById("export-csv-btn").addEventListener("click", () => exportSalesToCSV(getFilteredSales()));

const STATUS_ICON = { Pendiente: "clock", Entregado: "check-circle", Fallido: "x-circle" };

function renderSalesList() {
  const filtered = getFilteredSales();
  document.getElementById("sales-count").textContent = `${filtered.length} registros · Tiempo real`;
  const box = document.getElementById("sales-list");
  if (filtered.length === 0) { box.innerHTML = `<p class="empty-msg">Sin ventas con los filtros actuales</p>`; return; }

  box.innerHTML = filtered.map(s => {
    const statusBtns = (compact) => `
      ${s.status !== "Entregado" ? `<button class="${compact ? "btn" : "icon-btn green"}" ${compact ? 'style="font-size:.7rem;background:rgba(34,197,94,.1);color:#4ade80;border:1px solid rgba(34,197,94,.2)"' : 'title="Entregado"'} data-action="status" data-status="Entregado" data-id="${s.id}"><i data-lucide="check-circle" style="width:${compact ? 12 : 15}px;height:${compact ? 12 : 15}px"></i>${compact ? " Entregado" : ""}</button>` : ""}
      ${s.status !== "Fallido" ? `<button class="${compact ? "btn" : "icon-btn red"}" ${compact ? 'style="font-size:.7rem;background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)"' : 'title="Fallido"'} data-action="status" data-status="Fallido" data-id="${s.id}"><i data-lucide="x-circle" style="width:${compact ? 12 : 15}px;height:${compact ? 12 : 15}px"></i>${compact ? " Fallido" : ""}</button>` : ""}
      ${s.status !== "Pendiente" ? `<button class="${compact ? "btn" : "icon-btn yellow"}" ${compact ? 'style="font-size:.7rem;background:rgba(234,179,8,.1);color:#facc15;border:1px solid rgba(234,179,8,.2)"' : 'title="Pendiente"'} data-action="status" data-status="Pendiente" data-id="${s.id}"><i data-lucide="clock" style="width:${compact ? 12 : 15}px;height:${compact ? 12 : 15}px"></i>${compact ? " Pendiente" : ""}</button>` : ""}
    `;
    return `
    <div class="data-row">
      <div class="mobile-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">
          <div>
            <p style="font-size:.7rem;color:#6b7280;font-family:monospace">${s.id}</p>
            <p style="font-weight:600;font-size:.9rem">${s.customerName}</p>
            <p style="font-size:.75rem;color:#6b7280">Tag: ${s.playerTag}</p>
          </div>
          <span class="badge badge-${s.status}"><i data-lucide="${STATUS_ICON[s.status]}" style="width:11px;height:11px"></i>${s.status}</span>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;font-size:.85rem">
          <span>${s.gameEmoji}</span><span style="color:#d1d5db">${s.amount}</span>
          <span style="margin-left:auto;font-weight:600">${fmt(s.price)}</span>
          <span style="color:#4ade80;font-size:.75rem">+${fmt(s.profit)}</span>
        </div>
        <p style="font-size:.75rem;color:#6b7280;margin-bottom:.75rem">${new Date(s.date).toLocaleString("es-CO")}</p>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">
          ${statusBtns(true)}
          <button class="icon-btn red" style="margin-left:auto" data-action="delete" data-id="${s.id}"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
        </div>
      </div>
      <div class="desktop-row sales-row">
        <p style="font-size:.75rem;color:#6b7280;font-family:monospace;overflow:hidden;text-overflow:ellipsis">${s.id}</p>
        <div><p style="font-size:.9rem">${s.customerName}</p><p style="font-size:.75rem;color:#6b7280">${s.playerTag} · ${new Date(s.date).toLocaleDateString("es-CO")}</p></div>
        <div><p style="font-size:.9rem">${s.gameEmoji} ${s.amount}</p><p style="font-size:.75rem;color:#6b7280">${s.gameName}</p></div>
        <p style="font-size:.9rem;font-weight:600">${fmt(s.price)}</p>
        <p style="font-size:.9rem;color:#4ade80">+${fmt(s.profit)}</p>
        <span class="badge badge-${s.status}"><i data-lucide="${STATUS_ICON[s.status]}" style="width:11px;height:11px"></i>${s.status}</span>
        <div style="display:flex;gap:.15rem">
          ${statusBtns(false)}
          <button class="icon-btn red" data-action="delete" data-id="${s.id}"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
        </div>
      </div>
    </div>`;
  }).join("");
  icons();

  box.querySelectorAll("[data-action='status']").forEach(btn => btn.addEventListener("click", () => updateSaleStatus(btn.dataset.id, btn.dataset.status)));
  box.querySelectorAll("[data-action='delete']").forEach(btn => btn.addEventListener("click", () => {
    pendingDeleteSaleId = btn.dataset.id;
    document.getElementById("sale-delete-modal").classList.add("open");
  }));
}

document.getElementById("sale-delete-cancel").addEventListener("click", () => document.getElementById("sale-delete-modal").classList.remove("open"));
document.getElementById("sale-delete-confirm").addEventListener("click", async () => {
  if (pendingDeleteSaleId) await deleteSale(pendingDeleteSaleId);
  pendingDeleteSaleId = null;
  document.getElementById("sale-delete-modal").classList.remove("open");
});

// Sale modal
const saleModal = document.getElementById("sale-modal");
const saleGame = document.getElementById("sale-game");
const saleAmount = document.getElementById("sale-amount");
const saleCustomer = document.getElementById("sale-customer");
const saleTag = document.getElementById("sale-tag");
const salePrice = document.getElementById("sale-price");
const saleCost = document.getElementById("sale-cost");
const saleNotes = document.getElementById("sale-notes");
const saleSaveError = document.getElementById("sale-save-error");
const saleProfitPreviewWrap = document.getElementById("sale-profit-preview-wrap");
const saleProfitPreview = document.getElementById("sale-profit-preview");
let saleStatus = "Pendiente";

function resetSaleForm() {
  saleGame.value = ""; saleAmount.value = ""; saleCustomer.value = ""; saleTag.value = "";
  salePrice.value = 0; saleCost.value = 0; saleNotes.value = ""; saleStatus = "Pendiente";
  updateSaleStatusUI();
  updateSaleProfitPreview();
  saleSaveError.classList.add("hidden");
}
function updateSaleStatusUI() {
  document.querySelectorAll(".status-choice").forEach(b => {
    b.classList.toggle(`active-${b.dataset.status}`, b.dataset.status === saleStatus);
  });
}
function updateSaleProfitPreview() {
  const price = Number(salePrice.value) || 0;
  const cost = Number(saleCost.value) || 0;
  if (price > 0) {
    saleProfitPreviewWrap.classList.remove("hidden");
    const profit = price - cost;
    saleProfitPreview.textContent = fmt(profit);
    saleProfitPreview.style.color = profit >= 0 ? "#4ade80" : "#f87171";
  } else {
    saleProfitPreviewWrap.classList.add("hidden");
  }
}
[salePrice, saleCost].forEach(el => el.addEventListener("input", updateSaleProfitPreview));
document.querySelectorAll(".status-choice").forEach(b => b.addEventListener("click", () => { saleStatus = b.dataset.status; updateSaleStatusUI(); }));
saleGame.addEventListener("change", () => {
  const g = currentGames.find(x => x.id === saleGame.value);
  salePrice.value = g ? g.price : 0;
  saleCost.value = g ? g.cost : 0;
  saleAmount.placeholder = g ? `ej. 310 ${g.currency}` : "ej. 310 Diamantes";
  updateSaleProfitPreview();
});

document.getElementById("add-sale-btn").addEventListener("click", () => { resetSaleForm(); saleModal.classList.add("open"); icons(); });
document.getElementById("sale-modal-close").addEventListener("click", () => saleModal.classList.remove("open"));
document.getElementById("sale-modal-cancel").addEventListener("click", () => saleModal.classList.remove("open"));

document.getElementById("sale-modal-save").addEventListener("click", async () => {
  const g = currentGames.find(x => x.id === saleGame.value);
  if (!g || !saleCustomer.value || !saleAmount.value) return;
  const btn = document.getElementById("sale-modal-save");
  const original = btn.innerHTML;
  btn.innerHTML = `<span class="spinner sm"></span> Registrar`;
  try {
    const sale = {
      id: newSaleId(), gameId: g.id, gameName: g.name, gameEmoji: g.emoji,
      amount: saleAmount.value, price: Number(salePrice.value) || 0,
      profit: (Number(salePrice.value) || 0) - (Number(saleCost.value) || 0),
      status: saleStatus, date: new Date().toISOString(),
      customerName: saleCustomer.value, playerTag: saleTag.value, notes: saleNotes.value,
    };
    await saveSale(sale);
    saleModal.classList.remove("open");
  } catch (err) {
    saleSaveError.textContent = "No se pudo guardar. Verifica permisos de Firestore.";
    saleSaveError.classList.remove("hidden");
  } finally {
    btn.innerHTML = original;
    icons();
  }
});

icons();
