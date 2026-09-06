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
import { renderNotFound } from "./views/notFound.js";
import { renderPrivacyPolicy, renderTermsConditions, renderCookiePolicy, renderCopyrightDisclaimer } from "./views/legal.js";
import { initCookieConsentUI, openCookiePreferencesModal } from "./cookieConsent.js";

const viewport = document.getElementById("app-viewport");

// Route mappings with regex for dynamic route parameters and SEO metadata
const routes = [
  { 
    pattern: /^\/$/, 
    handler: renderLanding, 
    title: "SAMARG — Free Cricket Draft Game & World Cup Simulator | Online Multiplayer",
    description: "Play SAMARG, the premier free online cricket draft game and World Cup tournament simulator. Scout iconic international squads, draft your dream Playing XI, challenge friends in live multiplayer rooms, and simulate realistic ball-by-ball matches."
  },
  { 
    pattern: /^\/draft$/, 
    handler: renderDraft, 
    title: "Scout & Draft Playing XI | SAMARG Cricket Draft Game",
    description: "Scout authentic historical squads and draft your ultimate Playing XI with tactical roles for openers, middle-order batsmen, all-rounders, and bowlers."
  },
  { 
    pattern: /^\/room\/([^/]+)$/, 
    handler: (vp, code) => renderRoom(vp, code),
    title: (param) => `Live Multiplayer Draft Room (${param || 'Active'}) | SAMARG Cricket`,
    description: "Join a real-time multiplayer cricket draft room on SAMARG. Draft squads head-to-head with friends and simulate live cricket matches."
  },
  { 
    pattern: /^\/squad$/, 
    handler: renderSquadReview, 
    title: "Squad Review & Team Balance | SAMARG Cricket Draft",
    description: "Review your Playing XI, inspect batting and bowling balance charts, assign captain & vice-captain, and finalize your roster for the tournament."
  },
  { 
    pattern: /^\/tournament$/, 
    handler: renderTournament, 
    title: "World Cup Tournament Fixtures & Knockouts | SAMARG Cricket",
    description: "Compete across tournament group stages, semi-finals, and finals in the SAMARG World Cup Cricket Simulator."
  },
  { 
    pattern: /^\/match\/([^/]+)$/, 
    handler: (vp, id) => renderMatchCenter(vp, id),
    title: "Ball-by-Ball Match Center | SAMARG Cricket Simulator",
    description: "Experience live ball-by-ball match simulation with real-time wagon wheels, run chases, and commentary in SAMARG."
  },
  { 
    pattern: /^\/result\/([^/]+)$/, 
    handler: (vp, id) => renderResultCard(vp, id),
    title: "Match Result & Scorecard | SAMARG Cricket Simulator",
    description: "View the official cricket match scorecard, player stats, and download the custom retro result card on SAMARG."
  },
  { 
    pattern: /^\/summary$/, 
    handler: renderSummary, 
    title: "Campaign Summary & Trophy | SAMARG Cricket Simulator",
    description: "Review your tournament campaign performance, trophies won, and submit your score to the global Hall of Fame."
  },
  { 
    pattern: /^\/leaderboard$/, 
    handler: renderLeaderboard, 
    title: "Global Hall of Fame & Leaderboard | SAMARG Cricket Draft",
    description: "See the top cricket managers and undefeated World Cup champions on the SAMARG global leaderboard."
  },
  { 
    pattern: /^\/profile$/, 
    handler: renderProfile, 
    title: "User Profile & Career Stats | SAMARG Cricket Draft",
    description: "Track your total campaigns, trophy cabinet, perfect runs, and best net run rate on SAMARG Cricket Draft."
  },
  { 
    pattern: /^\/privacy$/, 
    handler: renderPrivacyPolicy, 
    title: "Privacy Policy | SAMARG Cricket Draft",
    description: "Read the official Privacy Policy for SAMARG Cricket Draft, detailing data protection, anonymous session handling, and user rights."
  },
  { 
    pattern: /^\/terms$/, 
    handler: renderTermsConditions, 
    title: "Terms of Service | SAMARG Cricket Draft",
    description: "Review the Terms of Service and non-monetary simulation disclaimers for SAMARG Cricket Draft."
  },
  { 
    pattern: /^\/cookie-policy$/, 
    handler: renderCookiePolicy, 
    title: "Cookie Policy & Tracking Preferences | SAMARG Cricket",
    description: "Understand how SAMARG uses essential cookies and manage your analytical tracking preferences."
  },
  { 
    pattern: /^\/copyright$/, 
    handler: renderCopyrightDisclaimer, 
    title: "Copyright Notice & Fair Use Disclaimers | SAMARG Cricket",
    description: "Review copyright notices, nominative fair use disclaimers, open-source attributions, and DMCA contact details for SAMARG."
  },
  { 
    pattern: /^\/404$/, 
    handler: renderNotFound, 
    title: "Page Not Found (404) | SAMARG Cricket Draft",
    description: "The requested cricket pitch or match could not be found. Return to SAMARG Cricket Home."
  }
];

// Dynamically updates document title, description, and canonical for search engines and social link previews
function updateRouteSEO(title, description, path) {
  if (title) {
    document.title = title;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute("content", title);
  }
  if (description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", description);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute("content", description);
  }
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    const base = window.location.origin || "https://samarg-7be68.web.app";
    canonical.setAttribute("href", `${base}/#${path}`);
  }
}

let isAuthInitialized = true;

// Handles hash routing
function resolveRoute() {
  if (!navigator.onLine) {
    viewport.innerHTML = "";
    updateRouteSEO("Offline | SAMARG Cricket", "You are currently offline. Connect to the internet to resume draft and match simulation.", "/offline");
    renderNotFound(viewport, { isOffline: true });
    return;
  }

  const hash = window.location.hash || "#/";
  const path = hash.slice(1); // Strip the leading '#'

  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      // Extract parameter if any
      const param = match[1] || null;
      const pageTitle = typeof route.title === "function" ? route.title(param) : route.title;
      const pageDesc = typeof route.description === "function" ? route.description(param) : route.description;
      updateRouteSEO(pageTitle, pageDesc, path);

      viewport.innerHTML = ""; // Clear view before rendering
      route.handler(viewport, param);
      return;
    }
  }

  // Fallback to 404 view if route not found
  updateRouteSEO("Page Not Found (404) | SAMARG Cricket Draft", "The requested cricket pitch could not be found.", "/404");
  viewport.innerHTML = "";
  renderNotFound(viewport);
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
  initCookieConsentUI();
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

// Global Share & Footer Preferences Handlers
document.addEventListener("DOMContentLoaded", () => {
  // Footer Cookie Preferences button handler
  const cookieSettingsBtn = document.getElementById("footer-cookie-settings-btn");
  if (cookieSettingsBtn) {
    cookieSettingsBtn.addEventListener("click", () => {
      openCookiePreferencesModal();
    });
  }

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

// Register Service Worker for offline 404 reload support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn("Service Worker registration skipped:", err);
    });
  });
}

// Network status listeners
window.addEventListener('offline', () => {
  if (window.showToast) window.showToast("You are offline!", true);
  resolveRoute();
});

window.addEventListener('online', () => {
  if (window.showToast) window.showToast("Network connection restored!");
  resolveRoute();
});

// Event listeners for routing
window.addEventListener("hashchange", resolveRoute);
window.addEventListener("load", resolveRoute);
export { resolveRoute };
