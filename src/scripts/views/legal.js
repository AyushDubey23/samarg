/**
 * SAMARG Legal Views
 * Renders dedicated pages for:
 * - Privacy Policy (#/privacy)
 * - Terms & Conditions (#/terms)
 * - Cookie Policy (#/cookie-policy)
 * - Copyright & Simulation Disclaimers (#/copyright)
 */

import { openCookiePreferencesModal } from "../cookieConsent.js";

function getLegalNavigationHtml(currentRoute) {
  return `
    <nav class="legal-nav-bar" aria-label="Legal documents navigation">
      <a href="#/privacy" class="btn ${currentRoute === 'privacy' ? 'btn-primary' : 'btn-secondary'} btn-sm">Privacy Policy</a>
      <a href="#/terms" class="btn ${currentRoute === 'terms' ? 'btn-primary' : 'btn-secondary'} btn-sm">Terms & Conditions</a>
      <a href="#/cookie-policy" class="btn ${currentRoute === 'cookie-policy' ? 'btn-primary' : 'btn-secondary'} btn-sm">Cookie Policy</a>
      <a href="#/copyright" class="btn ${currentRoute === 'copyright' ? 'btn-primary' : 'btn-secondary'} btn-sm">Copyright & Disclaimers</a>
      <a href="#/" class="btn btn-accent btn-sm" style="margin-left: auto;">Back to Game 🏏</a>
    </nav>
  `;
}

/**
 * Render Privacy Policy View
 */
export function renderPrivacyPolicy(viewport) {
  viewport.innerHTML = `
    <article class="legal-page-container">
      <header class="legal-header">
        <div class="legal-badge-strip">
          <span class="legal-badge">Compliance & Privacy</span>
          <span class="legal-badge">GDPR & CCPA Aligned</span>
        </div>
        <h1 class="legal-title">Privacy Policy</h1>
        <div class="legal-last-updated">Last Updated: September 2026 &bull; Effective Date: September 6, 2026</div>
      </header>

      <div class="legal-body">
        <section class="legal-section">
          <h2>1. Introduction & Overview</h2>
          <p>
            Welcome to <strong>SAMARG XI</strong> ("SAMARG", "we", "our", or "us"). We operate the cricket draft strategy game and ball-by-ball World Cup simulation platform at this web application. We value your personal privacy and are committed to safeguarding any data processed while you draft teams, compete in tournaments, or host multiplayer lobbies.
          </p>
          <p>
            This Privacy Policy explains how information is collected, used, disclosed, and secured when you use our web application, as well as your statutory rights under data protection laws including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
          </p>
        </section>

        <section class="legal-section">
          <h2>2. Information We Collect</h2>
          <h3>A. Information Collected Automatically</h3>
          <ul>
            <li><strong>Anonymous Authentication Identifiers:</strong> To let you immediately scout players and enter multiplayer rooms without mandatory registration, Firebase Authentication provisions an anonymous unique identifier (UID).</li>
            <li><strong>Gameplay & Session Telemetry:</strong> Room lobby participation, player draft selections, team balance calculations, ball-by-ball match simulation seeds, and tournament progression logs.</li>
            <li><strong>Technical Diagnostics:</strong> Browser type, viewport resolution, network latency, and WebSocket connectivity states needed to synchronize real-time multiplayer draft timers.</li>
          </ul>

          <h3>B. Information You Voluntarily Provide</h3>
          <ul>
            <li><strong>Player Display Name:</strong> The custom nickname or handle you choose to identify yourself in multiplayer draft rooms or on global leaderboards.</li>
            <li><strong>Optional Google Authentication Data:</strong> If you choose to link a Google Account to preserve your cross-device career statistics, we receive your verified email, display name, and avatar URL provided by Google OAuth. We never access your Google password or private Google account files.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>3. How We Use Your Information</h2>
          <p>We process collected data exclusively for lawful and legitimate purposes:</p>
          <ul>
            <li>Operating the real-time multiplayer draft engine, calculating player turn timers, and syncing squad selections.</li>
            <li>Running realistic, deterministic ball-by-ball match simulations and generating statistical scorecards.</li>
            <li>Maintaining global and league leaderboards (Net Run Rate, win streaks, and tournament trophies).</li>
            <li>Preventing abuse, rate-limiting malicious automated crawlers, and ensuring database security.</li>
            <li>Analyzing aggregate gameplay metrics to balance cricket player ratings and improve simulator performance (only with analytical consent).</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>4. Third-Party Service Providers & Sub-Processors</h2>
          <p>We work with trusted infrastructure providers under strict confidentiality agreements:</p>
          <ul>
            <li><strong>Google Firebase (Google LLC):</strong> Cloud infrastructure hosting Firebase Authentication, Realtime Database (for low-latency draft room state), Cloud Firestore (for persistent leaderboards and campaigns), and Cloud Functions. Data is hosted in secure Google Cloud data centers adhering to SOC 2, ISO 27001, and GDPR compliance standards.</li>
            <li><strong>Google Analytics (Google LLC):</strong> Optional web measurement (Measurement ID: <code>G-DSSQWVB7N7</code>) to analyze aggregate page navigation and match engine speeds. Initialized <em>only</em> if you grant explicit consent in our Cookie & Privacy settings.</li>
            <li><strong>Hosting & Content Delivery:</strong> Vercel and Firebase Hosting for static asset delivery and edge routing.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>5. Database Security & Client Access Policy</h2>
          <div class="legal-callout-box">
            <strong>Defensive Security Commitment:</strong>
            SAMARG enforces strict database security rules. Direct arbitrary reading or writing to our root databases is forbidden. Access to real-time room lobbies is restricted strictly to authenticated sessions, and critical match calculations and leaderboard writes are executed authoritatively via server-side Cloud Functions or isolated administrative rules.
          </div>
        </section>

        <section class="legal-section">
          <h2>6. Data Retention & Deletion Rights</h2>
          <p>
            Transient multiplayer draft rooms and socket states are automatically pruned and deleted after 2 to 5 minutes of lobby inactivity. Anonymous user accounts without active career campaigns or leaderboard records are automatically purged periodically.
          </p>
          <p>
            You have the right to request the deletion of your leaderboard entries or linked account data at any time. Simply clear your browser's local cache or reach out to our team at the contact details below.
          </p>
        </section>

        <section class="legal-section">
          <h2>7. Contact & Data Controller</h2>
          <p>
            For privacy inquiries, data deletion requests, or questions regarding our data practices, please contact our Data Protection Officer:
          </p>
          <p>
            <strong>SAMARG Engineering Team</strong><br>
            Email: <a href="mailto:privacy@samarg-cricket.app">privacy@samarg-cricket.app</a><br>
            Project Repository: <a href="https://github.com/AyushDubey23/samarg" target="_blank" rel="noopener noreferrer">github.com/AyushDubey23/samarg</a>
          </p>
        </section>
      </div>

      ${getLegalNavigationHtml('privacy')}
    </article>
  `;
  window.scrollTo(0, 0);
}

/**
 * Render Terms and Conditions View
 */
export function renderTermsConditions(viewport) {
  viewport.innerHTML = `
    <article class="legal-page-container">
      <header class="legal-header">
        <div class="legal-badge-strip">
          <span class="legal-badge">Terms of Service</span>
          <span class="legal-badge">Fair Play Agreement</span>
        </div>
        <h1 class="legal-title">Terms & Conditions</h1>
        <div class="legal-last-updated">Last Updated: September 2026 &bull; Version 2.4</div>
      </header>

      <div class="legal-body">
        <section class="legal-section">
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or playing <strong>SAMARG XI</strong> (including the drafting tool, tournament simulator, multiplayer lobbies, and leaderboard services), you confirm that you have read, understood, and agreed to be bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, you must discontinue use immediately.
          </p>
        </section>

        <section class="legal-section">
          <h2>2. Non-Gambling & Free-to-Play Disclaimer</h2>
          <div class="legal-callout-box">
            <strong>CRITICAL LEGAL NOTICE: FREE STRATEGY SIMULATION ONLY</strong><br>
            SAMARG XI is strictly a free-to-play sports strategy drafting game and statistical simulation tool built for entertainment, analytical study, and cricket fan engagement.
            <ul>
              <li><strong>NO REAL MONEY:</strong> There are no deposits, wagers, real-money transactions, paid loot boxes, cash prizes, or monetary payouts of any kind.</li>
              <li><strong>NO BETTING:</strong> SAMARG XI does not provide, facilitate, or endorse sports betting, gambling, or fantasy wagering. Any in-game "points," "coins," or "trophies" possess zero monetary or real-world cash value.</li>
            </ul>
          </div>
        </section>

        <section class="legal-section">
          <h2>3. Permitted Use & Fair Play Rules</h2>
          <p>Users are granted a personal, revocable, non-exclusive, non-transferable license to play the simulator in accordance with fair play standards. You explicitly agree NOT to:</p>
          <ul>
            <li>Deploy automated bots, scrapers, automated draft pickers, or packet injection scripts to tamper with room lobbies or leaderboard submissions.</li>
            <li>Exploit software bugs, timing loopholes, or websocket anomalies to manipulate simulation outcomes.</li>
            <li>Submit offensive, defamatory, hateful, or racially discriminatory room names or player nicknames.</li>
            <li>Attempt unauthorized access to backend databases, server infrastructure, or other players' private rooms.</li>
          </ul>
          <p>
            We reserve the right to immediately terminate room lobbies, nullify illegitimate leaderboard entries, and revoke access for any user violating these provisions.
          </p>
        </section>

        <section class="legal-section">
          <h2>4. Multiplayer Room Codes & Passwords</h2>
          <p>
            When you create a multiplayer room, you are assigned a 6-character room code. If you choose to configure a room password, it is your responsibility to safeguard it. SAMARG is not liable for unauthorized access resulting from room codes or passwords shared publicly by players on streaming or social channels.
          </p>
        </section>

        <section class="legal-section">
          <h2>5. Intellectual Property Rights</h2>
          <p>
            All original code, algorithms, physics calculations, mathematical probability models, visual design, custom graphics, and retro UI design systems comprising SAMARG XI are the proprietary intellectual property of the SAMARG project and its contributors. All rights are reserved under applicable international copyright laws.
          </p>
        </section>

        <section class="legal-section">
          <h2>6. Disclaimer of Warranties</h2>
          <p>
            SAMARG XI IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR UNINTERRUPTED OPERATION. WE DO NOT GUARANTEE THAT MULTIPLAYER DRAFT SESSIONS OR MATCH CALCULATIONS WILL BE 100% ERROR-FREE OR IMMUNE TO NETWORK DISCONNECTIONS.
          </p>
        </section>

        <section class="legal-section">
          <h2>7. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SAMARG AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR ACCESS TO, USE OF, OR INABILITY TO ACCESS THE GAME, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
        </section>

        <section class="legal-section">
          <h2>8. Modifications to Terms</h2>
          <p>
            We reserve the right to revise or update these Terms at any time. Changes will be posted to this page with an updated revision date. Your continued use of the platform constitutes acceptance of the amended Terms.
          </p>
        </section>
      </div>

      ${getLegalNavigationHtml('terms')}
    </article>
  `;
  window.scrollTo(0, 0);
}

/**
 * Render Cookie Policy View
 */
export function renderCookiePolicy(viewport) {
  viewport.innerHTML = `
    <article class="legal-page-container">
      <header class="legal-header">
        <div class="legal-badge-strip">
          <span class="legal-badge">Cookie Compliance</span>
          <span class="legal-badge">ePrivacy Directive</span>
        </div>
        <h1 class="legal-title">Cookie Policy</h1>
        <div class="legal-last-updated">Last Updated: September 2026 &bull; Transparent Storage Guide</div>
      </header>

      <div class="legal-body">
        <section class="legal-section">
          <h2>1. What Are Cookies and Local Storage?</h2>
          <p>
            Cookies are small text files placed on your computer or mobile device by websites that you visit. Web storage technologies, including <code>localStorage</code> and <code>sessionStorage</code>, are modern browser standards that allow web applications to store data securely on your client machine without transmitting it over every HTTP request header.
          </p>
          <p>
            SAMARG XI relies primarily on standard browser <code>localStorage</code> and minimal essential cookies to keep you logged in and ensure continuous multiplayer gameplay.
          </p>
        </section>

        <section class="legal-section">
          <h2>2. Categories of Storage We Use</h2>
          
          <div class="cookie-option-item" style="margin-bottom: 1.25rem;">
            <div class="cookie-option-header">
              <strong>Category 1: Strictly Necessary Storage (Always Active)</strong>
              <span class="cookie-status-badge required">Essential</span>
            </div>
            <p class="cookie-option-desc">
              These items are technically required for SAMARG to operate. They cannot be turned off because without them, core game features like drafting and multiplayer synchronization would break.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 0.75rem; font-size: 0.85rem;">
              <thead>
                <tr style="background: #EADECC; text-align: left; font-weight: 800; border: 1px solid #1E1E1E;">
                  <th style="padding: 6px 10px;">Storage Key / Cookie</th>
                  <th style="padding: 6px 10px;">Provider</th>
                  <th style="padding: 6px 10px;">Exact Purpose</th>
                  <th style="padding: 6px 10px;">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #1E1E1E;">
                  <td style="padding: 6px 10px; font-family: var(--font-family-mono); font-weight: 700;">samarg_cookie_consent_v1</td>
                  <td style="padding: 6px 10px;">SAMARG</td>
                  <td style="padding: 6px 10px;">Stores your cookie & privacy preferences so the banner doesn't repeatedly ask.</td>
                  <td style="padding: 6px 10px;">1 Year</td>
                </tr>
                <tr style="border-bottom: 1px solid #1E1E1E;">
                  <td style="padding: 6px 10px; font-family: var(--font-family-mono); font-weight: 700;">firebase:authUser:...</td>
                  <td style="padding: 6px 10px;">Firebase Auth</td>
                  <td style="padding: 6px 10px;">Stores your anonymous or authenticated session token to keep you connected to your draft.</td>
                  <td style="padding: 6px 10px;">Persistent</td>
                </tr>
                <tr style="border-bottom: 1px solid #1E1E1E;">
                  <td style="padding: 6px 10px; font-family: var(--font-family-mono); font-weight: 700;">samarg_active_draft</td>
                  <td style="padding: 6px 10px;">SAMARG</td>
                  <td style="padding: 6px 10px;">Safeguards your drafted XI squad buffer locally in case of sudden network disconnection.</td>
                  <td style="padding: 6px 10px;">Session</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="cookie-option-item">
            <div class="cookie-option-header">
              <strong>Category 2: Analytics & Measurement Cookies (Optional)</strong>
              <span class="cookie-status-badge optional">Requires Consent</span>
            </div>
            <p class="cookie-option-desc">
              These cookies help us understand how players interact with the simulator (such as draft turn speeds, match completion rates, and device screen sizes) so we can optimize performance.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 0.75rem; font-size: 0.85rem;">
              <thead>
                <tr style="background: #EADECC; text-align: left; font-weight: 800; border: 1px solid #1E1E1E;">
                  <th style="padding: 6px 10px;">Cookie Name</th>
                  <th style="padding: 6px 10px;">Provider</th>
                  <th style="padding: 6px 10px;">Purpose</th>
                  <th style="padding: 6px 10px;">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #1E1E1E;">
                  <td style="padding: 6px 10px; font-family: var(--font-family-mono); font-weight: 700;">_ga, _ga_*</td>
                  <td style="padding: 6px 10px;">Google Analytics</td>
                  <td style="padding: 6px 10px;">Calculates visitor, session, and match engagement data for aggregate analytics reporting.</td>
                  <td style="padding: 6px 10px;">Up to 2 Years</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="legal-section">
          <h2>3. Managing Your Cookie Choices</h2>
          <p>
            You have full control over non-essential cookies. You can grant, customize, or revoke your consent at any time directly through SAMARG using the control below:
          </p>
          <div style="margin: 1.5rem 0;">
            <button id="legal-open-cookie-modal-btn" class="btn btn-accent">
              Open Cookie Preferences Manager ⚙️
            </button>
          </div>
          <p>
            Additionally, all modern browsers allow you to modify your cookie settings to block third-party cookies or notify you before a cookie is saved. Consult your browser's Help menu for details:
          </p>
          <ul>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome Cookie Settings</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer">Mozilla Firefox Cookie Settings</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari Cookie Settings</a></li>
            <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge Cookie Settings</a></li>
          </ul>
        </section>
      </div>

      ${getLegalNavigationHtml('cookie-policy')}
    </article>
  `;

  // Attach button handler to launch the preferences modal
  document.getElementById("legal-open-cookie-modal-btn")?.addEventListener("click", () => {
    openCookiePreferencesModal();
  });

  window.scrollTo(0, 0);
}

/**
 * Render Copyright & Intellectual Property Disclaimers View
 */
export function renderCopyrightDisclaimer(viewport) {
  viewport.innerHTML = `
    <article class="legal-page-container">
      <header class="legal-header">
        <div class="legal-badge-strip">
          <span class="legal-badge">Copyright & IP Notice</span>
          <span class="legal-badge">Fair Use & Disclaimers</span>
        </div>
        <h1 class="legal-title">Copyright Notice & Legal Disclaimers</h1>
        <div class="legal-last-updated">&copy; 2026 SAMARG Cricket Project &bull; All Rights Reserved</div>
      </header>

      <div class="legal-body">
        <section class="legal-section">
          <h2>1. Copyright Notice</h2>
          <p>
            &copy; 2026 <strong>SAMARG Cricket Simulator</strong>. All rights reserved.
          </p>
          <p>
            The software, source code, interactive architecture, simulation probability formulas, ball-by-ball commentary engines, visual layouts, retro styling themes, and UI elements comprising SAMARG XI are the proprietary property of the SAMARG development project. Unauthorized reproduction, modification, decompilation, public redistribution, or commercial resale of the software without express written permission is strictly prohibited.
          </p>
        </section>

        <section class="legal-section">
          <h2>2. Cricket Player Likeness & Nominative Fair Use Disclaimer</h2>
          <div class="legal-callout-box">
            <strong>FAIR USE & HISTORICAL CRICKET STATISTICAL DATA</strong><br>
            SAMARG XI includes references to real-world international cricket players, historic national teams, batting/bowling statistics, and World Cup tournament records solely for historical accuracy, statistical simulation, and educational commentary.
            <ul>
              <li><strong>NON-AFFILIATION:</strong> SAMARG XI is an independent simulation project. It is <strong>NOT</strong> affiliated with, endorsed by, sponsored by, or associated with the International Cricket Council (ICC), the Board of Control for Cricket in India (BCCI), England and Wales Cricket Board (ECB), Cricket Australia, Cricket South Africa, Pakistan Cricket Board (PCB), or any national cricket governing body, commercial league (such as the IPL, BBL, or PSL), or player franchise.</li>
              <li><strong>STATISTICAL HISTORICAL FACTS:</strong> Player names, historical career averages, strike rates, economy rates, and past World Cup match dates represent factual historical sports records protected under nominative fair use principles in copyright and trademark law.</li>
              <li><strong>NO ENDORSEMENT:</strong> The inclusion of any player's name or historical record does not imply endorsement, authorization, or sponsorship of SAMARG XI by that individual or team.</li>
            </ul>
          </div>
        </section>

        <section class="legal-section">
          <h2>3. Open Source Software Licenses & Attributions</h2>
          <p>
            SAMARG XI is proudly built using premier open-source technologies. We gratefully acknowledge the creators and maintainers of the following software libraries:
          </p>
          <ul>
            <li><strong>Firebase SDK:</strong> Apache License 2.0 &bull; Developed by Google LLC.</li>
            <li><strong>Vite:</strong> MIT License &bull; Created by Evan You and the Vite Core Team.</li>
            <li><strong>html2canvas:</strong> MIT License &bull; Created by Niklas von Hertzen for rendering scorecard image shares.</li>
            <li><strong>Typography Fonts:</strong>
              <ul>
                <li><em>Outfit</em>: SIL Open Font License 1.1 (designed by Rodrigo Fuenzalida / Omnibus-Type).</li>
                <li><em>Bebas Neue</em>: SIL Open Font License 1.1 (designed by Ryoichi Tsunekawa / Dharma Type).</li>
                <li><em>JetBrains Mono</em>: Apache License 2.0 (designed by JetBrains).</li>
              </ul>
            </li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>4. DMCA / Copyright Infringement Takedown Notice</h2>
          <p>
            SAMARG respects the intellectual property rights of others and complies with the provisions of the Digital Millennium Copyright Act (17 U.S.C. &sect; 512). If you believe in good faith that any content hosted on this application infringes upon your copyright or trademark, please transmit a formal written notice containing the following details to our Designated Agent:
          </p>
          <ol>
            <li>Identification of the copyrighted work claimed to have been infringed, or a representative list if multiple works are involved.</li>
            <li>Identification of the specific material claimed to be infringing, along with information reasonably sufficient to permit us to locate the material (such as the exact URL or view).</li>
            <li>Your contact information, including your full legal name, physical mailing address, telephone number, and email address.</li>
            <li>A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement that the information in your notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
            <li>A physical or electronic signature of a person authorized to act on behalf of the copyright owner.</li>
          </ol>
          <p>
            Please send copyright infringement notices to:<br>
            <strong>SAMARG Copyright Agent</strong><br>
            Email: <a href="mailto:copyright@samarg-cricket.app">copyright@samarg-cricket.app</a><br>
            Subject: <em>DMCA Copyright Takedown Request</em>
          </p>
        </section>
      </div>

      ${getLegalNavigationHtml('copyright')}
    </article>
  `;
  window.scrollTo(0, 0);
}
