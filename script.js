// ─── NexoPlayStore — Tienda (index.html) ─────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// ── Firebase config ───────────────────────────────────────────────────────
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

// ── WhatsApp ───────────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = "573228878237";

// ── Catálogo de juegos (estático, igual al original) ───────────────────────
const games = [
  { id: "freefire", name: "Diamantes Free Fire", image: "images/freefire.png", message: "Hola NexoPlayStore! Quiero recargar diamantes para Free Fire." },
  { id: "roblox", name: "Robux Roblox", image: "images/roblox.png", message: "Hola NexoPlayStore! Quiero recargar Robux para Roblox." },
  { id: "pubg", name: "UC PUBG Mobile", image: "images/pubg.png", message: "Hola NexoPlayStore! Quiero recargar UC para PUBG Mobile." },
  { id: "codm", name: "CP COD Mobile", image: "images/codm.png", message: "Hola NexoPlayStore! Quiero recargar CP para Call of Duty Mobile." },
  { id: "clash", name: "Clash of Clans / Royale", image: "images/clash.png", message: "Hola NexoPlayStore! Quiero recargar para Clash." },
];

function renderGames() {
  const grid = document.getElementById("games-grid");
  grid.innerHTML = games.map(g => {
    const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(g.message)}`;
    const nameHtml = g.name.split(" ").map((w, i) => i === 0 ? `${w}<br>` : `${w} `).join("");
    return `
      <div class="game-card">
        <img src="${g.image}" alt="${g.name}" loading="lazy">
        <div class="game-card-overlay">
          <h3>${nameHtml}</h3>
          <a class="recharge" href="${link}" target="_blank" rel="noopener noreferrer">
            <i data-lucide="shopping-cart"></i><span>Recargar</span>
          </a>
        </div>
      </div>`;
  }).join("");
  if (window.lucide) lucide.createIcons();
}
renderGames();

// ── Footer year ──────────────────────────────────────────────────────────
document.getElementById("footer-year").textContent =
  `© ${new Date().getFullYear()} NexoPlayStore. Todos los derechos reservados.`;

// ── Auth Modal logic ─────────────────────────────────────────────────────
const modal = document.getElementById("auth-modal");
const modalSubtitle = document.getElementById("modal-subtitle");
const tabs = document.querySelectorAll(".modal-tab");
const fieldName = document.getElementById("field-name");
const inputName = document.getElementById("input-name");
const inputEmail = document.getElementById("input-email");
const inputPassword = document.getElementById("input-password");
const authForm = document.getElementById("auth-form");
const authError = document.getElementById("auth-error");
const authSubmit = document.getElementById("auth-submit");
const modalSwitchText = document.getElementById("modal-switch-text");
const modalSwitchBtn = document.getElementById("modal-switch-btn");
const togglePw = document.getElementById("toggle-pw");

let currentTab = "login";

function openModal(tab = "login") {
  setTab(tab);
  modal.classList.add("open");
}
function closeModal() {
  modal.classList.remove("open");
  authForm.reset();
  authError.style.display = "none";
}
function setTab(tab) {
  currentTab = tab;
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  fieldName.style.display = tab === "register" ? "block" : "none";
  modalSubtitle.textContent = tab === "login" ? "Inicia sesión en tu cuenta" : "Crea tu cuenta gratis";
  authSubmit.textContent = tab === "login" ? "Iniciar sesión" : "Crear cuenta";
  modalSwitchText.innerHTML = tab === "login"
    ? `¿No tienes cuenta? <button type="button" id="modal-switch-btn">Regístrate gratis</button>`
    : `¿Ya tienes cuenta? <button type="button" id="modal-switch-btn">Inicia sesión</button>`;
  document.getElementById("modal-switch-btn").addEventListener("click", () => setTab(tab === "login" ? "register" : "login"));
  authError.style.display = "none";
}

document.getElementById("modal-close-btn").addEventListener("click", closeModal);
modal.addEventListener("click", closeModal);
tabs.forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
modalSwitchBtn.addEventListener("click", () => setTab(currentTab === "login" ? "register" : "login"));
togglePw.addEventListener("click", () => {
  const isPw = inputPassword.type === "password";
  inputPassword.type = isPw ? "text" : "password";
  togglePw.innerHTML = `<i data-lucide="${isPw ? "eye-off" : "eye"}"></i>`;
  if (window.lucide) lucide.createIcons();
});

function fbErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use": return "Este correo ya está registrado.";
    case "auth/invalid-email": return "Correo electrónico inválido.";
    case "auth/weak-password": return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests": return "Demasiados intentos. Espera unos minutos.";
    default: return "Error al autenticar. Intenta de nuevo.";
  }
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.style.display = "none";
  authSubmit.disabled = true;
  const original = authSubmit.innerHTML;
  authSubmit.innerHTML = `<span class="spinner"></span> ${currentTab === "login" ? "Ingresando..." : "Creando cuenta..."}`;
  try {
    if (currentTab === "login") {
      await signInWithEmailAndPassword(auth, inputEmail.value, inputPassword.value);
    } else {
      const cred = await createUserWithEmailAndPassword(auth, inputEmail.value, inputPassword.value);
      await updateProfile(cred.user, { displayName: inputName.value.trim() });
    }
    closeModal();
  } catch (err) {
    authError.textContent = fbErrorMessage(err.code || "");
    authError.style.display = "block";
  } finally {
    authSubmit.disabled = false;
    authSubmit.innerHTML = original;
  }
});

// ── Navbar auth area (login button / avatar) ─────────────────────────────
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function renderAuthArea(user) {
  const desktop = document.getElementById("auth-area-desktop");
  const mobile = document.getElementById("auth-area-mobile");

  if (!user) {
    desktop.innerHTML = `<button class="btn-login" id="login-btn-desktop"><i data-lucide="log-in"></i>Iniciar sesión</button>`;
    mobile.innerHTML = `<button class="btn-login small" id="login-btn-mobile" aria-label="Iniciar sesión"><i data-lucide="log-in"></i></button>`;
    if (window.lucide) lucide.createIcons();
    document.getElementById("login-btn-desktop").addEventListener("click", () => openModal("login"));
    document.getElementById("login-btn-mobile").addEventListener("click", () => openModal("login"));
    return;
  }

  const initials = getInitials(user.displayName);
  const name = user.displayName || user.email || "Usuario";
  const firstName = name.split(" ")[0];

  const avatarHtml = (idSuffix) => `
    <div class="user-menu">
      <button class="avatar-btn" id="avatar-btn-${idSuffix}">
        <div class="avatar-circle">${initials}</div>
        <span class="desktop-only" style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${firstName}</span>
      </button>
      <div class="avatar-dropdown" id="avatar-dropdown-${idSuffix}">
        <div class="avatar-dropdown-header">
          <p>${name}</p>
          <span>${user.email || ""}</span>
        </div>
        <div style="padding:.5rem">
          <button id="logout-btn-${idSuffix}">Cerrar sesión</button>
        </div>
      </div>
    </div>`;

  desktop.innerHTML = avatarHtml("desktop");
  mobile.innerHTML = avatarHtml("mobile");

  ["desktop", "mobile"].forEach(suffix => {
    const btn = document.getElementById(`avatar-btn-${suffix}`);
    const dropdown = document.getElementById(`avatar-dropdown-${suffix}`);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });
    document.getElementById(`logout-btn-${suffix}`).addEventListener("click", async () => {
      dropdown.classList.remove("open");
      await signOut(auth);
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".avatar-dropdown").forEach(d => d.classList.remove("open"));
  });
}

onAuthStateChanged(auth, (user) => {
  renderAuthArea(user);
});

// ── Init icons ────────────────────────────────────────────────────────────
if (window.lucide) lucide.createIcons();
