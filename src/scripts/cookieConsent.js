/**
 * SAMARG Cookie Consent & Tracing Control Manager
 * Handles ePrivacy / GDPR compliant cookie consent, preferences management,
 * and guarded initialization of third-party analytics / tracing.
 */

import { app } from "./firebaseInit.js";

const CONSENT_STORAGE_KEY = "samarg_cookie_consent_v1";

let analyticsInstance = null;

/**
 * Retrieve current cookie preferences from localStorage.
 * Returns null if the user has not yet made a choice.
 */
export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read cookie consent preference:", e);
    return null;
  }
}

/**
 * Checks if user has explicitly granted consent for analytics/tracking.
 */
export function hasAnalyticsConsent() {
  const consent = getCookieConsent();
  return Boolean(consent && consent.analytics === true);
}

/**
 * Persist user consent choice and trigger analytics initialization if consented.
 */
export function saveCookieConsent(preferences) {
  const consentRecord = {
    necessary: true, // Always true for game state, auth tokens & room sync
    analytics: Boolean(preferences.analytics),
    timestamp: new Date().toISOString()
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentRecord));
  } catch (e) {
    console.warn("Could not save cookie consent preference:", e);
  }

  // Dispatch global event for listeners across views
  window.dispatchEvent(new CustomEvent("samarg:cookie-consent-updated", { detail: consentRecord }));

  // Handle analytics tracing based on user choice
  if (consentRecord.analytics) {
    initAnalyticsSafely();
  } else {
    disableAnalyticsSafely();
  }

  return consentRecord;
}

/**
 * Guarded initializer for Firebase / Google Analytics (G-DSSQWVB7N7).
 * Only activates if the user has explicitly granted analytics consent.
 */
export async function initAnalyticsSafely() {
  if (!hasAnalyticsConsent()) {
    console.log("[Cookie Consent] Analytics tracking disabled (consent not granted).");
    return;
  }

  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const supported = await isSupported();
    if (supported && !analyticsInstance) {
      analyticsInstance = getAnalytics(app);
      console.log("[Cookie Consent] Analytics tracking initialized with user consent.");
    }
  } catch (err) {
    console.warn("[Cookie Consent] Failed to initialize analytics:", err);
  }
}

/**
 * Disables tracking and purges analytics instance if consent is revoked.
 */
function disableAnalyticsSafely() {
  analyticsInstance = null;
  console.log("[Cookie Consent] Analytics tracking disabled & cookies restricted.");
}

/**
 * Renders the bottom Cookie Consent Banner if user hasn't chosen yet.
 */
export function initCookieConsentUI() {
  const existingConsent = getCookieConsent();
  if (!existingConsent) {
    showCookieBanner();
  } else if (existingConsent.analytics) {
    initAnalyticsSafely();
  }
}

/**
 * Displays the retro-styled Cookie Consent banner at the bottom of the page.
 */
export function showCookieBanner() {
  if (document.getElementById("cookie-consent-banner")) return;

  const banner = document.createElement("div");
  banner.id = "cookie-consent-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Cookie and Privacy Consent");

  banner.innerHTML = `
    <div class="cookie-banner-inner">
      <div class="cookie-banner-text">
        <div class="cookie-banner-title">
          <span class="cookie-icon" aria-hidden="true">🍪</span>
          <strong>COOKIE & PRIVACY NOTICE</strong>
        </div>
        <p>
          SAMARG uses essential cookies and local storage to preserve your anonymous player session, draft state, and real-time multiplayer room connections. We also request optional analytical cookies to help us improve simulator match engine performance and draft balance.
          <a href="#/cookie-policy" class="cookie-policy-link">Learn more in our Cookie Policy</a>.
        </p>
      </div>
      <div class="cookie-banner-actions">
        <button id="cookie-btn-decline" class="btn btn-secondary btn-sm" aria-label="Decline non-essential cookies">
          Essential Only
        </button>
        <button id="cookie-btn-manage" class="btn btn-accent btn-sm" aria-label="Manage cookie settings">
          Preferences
        </button>
        <button id="cookie-btn-accept" class="btn btn-primary btn-sm" aria-label="Accept all cookies">
          Accept All
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("cookie-btn-accept")?.addEventListener("click", () => {
    saveCookieConsent({ analytics: true });
    dismissBanner();
    if (window.showToast) window.showToast("All cookies accepted. Thank you!");
  });

  document.getElementById("cookie-btn-decline")?.addEventListener("click", () => {
    saveCookieConsent({ analytics: false });
    dismissBanner();
    if (window.showToast) window.showToast("Only strictly necessary storage enabled.");
  });

  document.getElementById("cookie-btn-manage")?.addEventListener("click", () => {
    openCookiePreferencesModal();
  });
}

function dismissBanner() {
  const banner = document.getElementById("cookie-consent-banner");
  if (banner) {
    banner.classList.add("cookie-banner-fade-out");
    setTimeout(() => banner.remove(), 300);
  }
}

/**
 * Opens the interactive Cookie Preferences modal.
 * Can be called from the banner or from the footer link at any time.
 */
export function openCookiePreferencesModal() {
  const existing = document.getElementById("cookie-prefs-modal");
  if (existing) existing.remove();

  const currentConsent = getCookieConsent() || { necessary: true, analytics: false };

  const modal = document.createElement("div");
  modal.id = "cookie-prefs-modal";
  modal.className = "cookie-modal-backdrop";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "cookie-prefs-title");

  modal.innerHTML = `
    <div class="cookie-modal-card">
      <div class="cookie-modal-header">
        <h2 id="cookie-prefs-title">Cookie & Privacy Preferences</h2>
        <button id="close-cookie-modal-btn" class="cookie-modal-close" aria-label="Close preferences modal">&times;</button>
      </div>

      <p class="cookie-modal-intro">
        Customize which categories of storage and cookies you allow SAMARG XI to use. You can revisit and change these settings anytime via the "Cookie Settings" link in the footer.
      </p>

      <div class="cookie-options-list">
        <!-- Strictly Necessary -->
        <div class="cookie-option-item">
          <div class="cookie-option-header">
            <div>
              <strong>Strictly Necessary Storage & Cookies</strong>
              <span class="cookie-status-badge required">Always Active</span>
            </div>
          </div>
          <p class="cookie-option-desc">
            Required for the core functionality of SAMARG: preserving anonymous player authentication tokens, maintaining active World Cup drafts, storing tournament bracket progression, and managing real-time multiplayer websocket connections.
          </p>
        </div>

        <!-- Analytics & Performance -->
        <div class="cookie-option-item">
          <div class="cookie-option-header">
            <div>
              <strong>Analytics & Performance Cookies</strong>
              <span class="cookie-status-badge optional">Optional</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="pref-analytics-toggle" ${currentConsent.analytics ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p class="cookie-option-desc">
            Helps our developers understand aggregate gameplay patterns (e.g. ball-by-ball simulation load times, popular draft selections, and room connection stability) via Google Analytics (<code style="background:#FAF6ED; padding:2px 5px; border:1px solid #1E1E1E;">G-DSSQWVB7N7</code>). No personal data or identifiable passwords are sold or used for ad targeting.
          </p>
        </div>
      </div>

      <div class="cookie-modal-actions">
        <button id="pref-save-btn" class="btn btn-primary">
          Save My Preferences
        </button>
        <button id="pref-accept-all-btn" class="btn btn-accent">
          Accept All Cookies
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  const closeModal = () => modal.remove();
  document.getElementById("close-cookie-modal-btn")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Save specific preferences
  document.getElementById("pref-save-btn")?.addEventListener("click", () => {
    const analyticsChecked = document.getElementById("pref-analytics-toggle")?.checked || false;
    saveCookieConsent({ analytics: analyticsChecked });
    dismissBanner();
    closeModal();
    if (window.showToast) {
      window.showToast(analyticsChecked ? "Preferences saved (Analytics enabled)." : "Preferences saved (Analytics disabled).");
    }
  });

  // Accept all shortcut
  document.getElementById("pref-accept-all-btn")?.addEventListener("click", () => {
    saveCookieConsent({ analytics: true });
    dismissBanner();
    closeModal();
    if (window.showToast) window.showToast("All cookies accepted!");
  });
}
