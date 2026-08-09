import { auth, db } from "./firebaseInit.js";
import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, linkWithPopup, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Import Views
import { renderLanding } from "./views/landing.js";
import { renderDraft } from "./views/draft.js";
import { renderRoom } from "./views/room.js";
import { renderSquadReview } from "./views/squadReview.js";
import { renderTournament } from "./views/tournament.js";
import { renderMatchCenter } from "./views/matchCenter.js";
import { renderResultCard } from "./views/resultCard.js";
import { renderSummary } from "./views/summary.js";
import { renderLeaderboard } from "./views/leaderboard.js";
import { renderProfile } from "./views/profile.js";

const viewport = document.getElementById("app-viewport");

// Route mappings with regex for dynamic route parameters
const routes = [
  { pattern: /^\/$/, handler: renderLanding },
  { pattern: /^\/draft$/, handler: renderDraft },
  { pattern: /^\/room\/([^/]+)$/, handler: (vp, code) => renderRoom(vp, code) },
  { pattern: /^\/squad$/, handler: renderSquadReview },
  { pattern: /^\/tournament$/, handler: renderTournament },
  { pattern: /^\/match\/([^/]+)$/, handler: (vp, id) => renderMatchCenter(vp, id) },
  { pattern: /^\/result\/([^/]+)$/, handler: (vp, id) => renderResultCard(vp, id) },
  { pattern: /^\/summary$/, handler: renderSummary },
  { pattern: /^\/leaderboard$/, handler: renderLeaderboard },
  { pattern: /^\/profile$/, handler: renderProfile }
];

let isAuthInitialized = false;

// Handles hash routing
function resolveRoute() {
  if (!isAuthInitialized) {
    viewport.innerHTML = `
      <div class="text-center" style="margin-top: 10vh;">
        <h2 style="font-size: 2rem;">Loading SAMARG...</h2>
        <p style="color: var(--chalk-white-dim); margin-top: 1rem;">Setting up simulation parameters</p>
      </div>
    `;
    return;
  }

  const hash = window.location.hash || "#/";
  const path = hash.slice(1); // Strip the leading '#'

  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      // Extract parameter if any
      const param = match[1] || null;
      viewport.innerHTML = ""; // Clear view before rendering
      route.handler(viewport, param);
      return;
    }
  }

  // Fallback to landing if route not found
  window.location.hash = "#/";
}

// Update authentication UI elements in Header
function updateAuthUI(user) {
  const container = document.getElementById("auth-status-container");
  if (!container) return;

  if (user.isAnonymous) {
    container.innerHTML = "";
  } else {
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <a href="#/profile" style="font-size: 0.85rem; color: var(--willow-tan); font-weight: 500;">
          ${user.displayName || "Player"}
        </a>
        <button id="signout-btn" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
          Sign Out
        </button>
      </div>
    `;
    document.getElementById("signout-btn").addEventListener("click", () => signOut(auth));
  }
}

// Global Toast utility
window.showToast = function (message, isError = false) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${isError ? "toast-error" : ""}`;
  toast.innerText = message;

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// Bootstrap Auth and Routing
let hasResolvedInitialRoute = false;

function initApp() {
  if (hasResolvedInitialRoute) return;
  hasResolvedInitialRoute = true;
  isAuthInitialized = true;
  resolveRoute();
}

// Fallback safety timer: Ensure route is resolved within 1.5s even if auth response is delayed
setTimeout(() => {
  if (!isAuthInitialized) {
    console.warn("Auth initialization timed out, rendering route with fallback state.");
    initApp();
  }
}, 1500);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("Bootstrapping anonymous session...");
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.error("Bootstrap anonymous login failed:", e);
      if (e.code === "auth/admin-restricted-operation" || e.code === "auth/operation-not-allowed") {
        showToast("Enable Anonymous Sign-In in Firebase Console > Authentication > Sign-in method", true);
      }
      initApp();
    }
  } else {
    updateAuthUI(user);
    initApp();
  }
});

// Global Share Button Handler
document.addEventListener("DOMContentLoaded", () => {
  const shareBtn = document.getElementById("share-game-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const shareData = {
        title: "SAMARG — Cricket Draft & World Cup Simulator",
        text: "Draft legendary World Cup cricket XI and simulate ball-by-ball matches in SAMARG!",
        url: window.location.href.includes("#/room/") ? window.location.href : window.location.origin
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          showToast("Game link shared successfully!");
          return;
        } catch (e) {
          if (e.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(shareData.url);
        showToast("Game link copied to clipboard!");
      } catch (e) {
        prompt("Copy game link to share with friends:", shareData.url);
      }
    });
  }
});

// Event listeners for routing
window.addEventListener("hashchange", resolveRoute);
window.addEventListener("load", resolveRoute);
export { resolveRoute };
