import { auth, db, functions } from "../firebaseInit.js";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { validateDraftXI } from "../utils/draftRules.js";
import { formatPlayerName } from "../utils/positionRules.js";

let currentCampaign = null;

export async function renderSquadReview(container) {
  const user = auth.currentUser;
  if (!user) return;

  // Fetch active drafting campaign
  try {
    const q = query(
      collection(db, "campaigns"),
      where("ownerUid", "==", user.uid),
      where("status", "==", "drafting")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // No active draft, redirect to home
      window.location.hash = "#/";
      return;
    }

    currentCampaign = { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (err) {
    console.error("Error fetching campaign for review:", err);
    container.innerHTML = `<h3 class="text-red text-center mt-4">Failed to load campaign.</h3>`;
    return;
  }

  const squad = currentCampaign.squadXI;
  const validation = validateDraftXI(squad);

  // Calculate team aggregate statistics for the SVG balance chart
  const battingAverages = squad.map(p => p.battingAverage);
  const strikeRates = squad.map(p => p.strikeRate);
  const bowlers = squad.filter(p => p.bowlingType !== null);
  const bowlingEcons = bowlers.map(p => p.economyRate || 8.0);
  const bowlingSRs = bowlers.map(p => p.strikeRateBowling || 24.0);
  const fieldings = squad.map(p => p.fieldingRating || 70);

  const teamBatAvg = battingAverages.reduce((a, b) => a + b, 0) / 11;
  const teamSR = strikeRates.reduce((a, b) => a + b, 0) / 11;
  const teamEcon = bowlers.length > 0 ? (bowlingEcons.reduce((a, b) => a + b, 0) / bowlers.length) : 8.5;
  const teamBowlSR = bowlers.length > 0 ? (bowlingSRs.reduce((a, b) => a + b, 0) / bowlers.length) : 26.0;
  const teamFielding = fieldings.reduce((a, b) => a + b, 0) / 11;

  // Normalize metrics to 0-100 values for the SVG chart
  const valBatAvg = Math.min(100, Math.max(10, (teamBatAvg / 50) * 100));
  const valSR = Math.min(100, Math.max(10, (teamSR / 150) * 100));
  // Economy: lower is better. Scale 9.0 to 10%, 4.0 to 100%
  const valEcon = Math.min(100, Math.max(10, ((9.0 - teamEcon) / (9.0 - 4.0)) * 100));
  // Bowling SR: lower is better. Scale 36 to 10%, 18 to 100%
  const valBowlSR = Math.min(100, Math.max(10, ((36.0 - teamBowlSR) / (36.0 - 18.0)) * 100));
  const valFielding = teamFielding;

  container.innerHTML = `
    <div class="squad-review-container">
      <div class="sr-header text-center">
        <h2>Playing XI Lineup</h2>
        <p>Review your squad composition and team attributes before entering the Samarg Cup.</p>
      </div>

      <div class="sr-layout-grid mt-4">
        <!-- Roster Column -->
        <div class="sr-roster">
          <h3>Your Team Roster</h3>
          <div class="roster-list mt-2">
            ${squad.map((player, idx) => `
              <div class="roster-item">
                <span class="roster-pos">${idx + 1}</span>
                <div class="roster-details">
                  <div class="roster-name">${formatPlayerName(player)}</div>
                  <div class="roster-sub">${player.nationalTeam} (${player.tournamentYear}) - <span class="role-badge" style="padding:0; font-size:0.75rem;">${player.role}</span></div>
                </div>
                <div class="roster-stats">
                  <span>Bat: <strong>${player.battingAverage.toFixed(0)}</strong></span>
                  ${player.bowlingType ? `<span>Bowl: <strong>${player.economyRate.toFixed(1)}</strong></span>` : "<span>-</span>"}
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Balance Chart & CTA Column -->
        <div class="sr-analysis">
          <div class="analysis-card">
            <h3>Team Attributes Balance</h3>
            <!-- Plain SVG Bar Chart -->
            <div class="chart-container mt-2">
              <svg viewBox="0 0 400 240" width="100%" height="240" class="balance-svg">
                <!-- Grid Lines -->
                <line x1="120" y1="20" x2="120" y2="210" stroke="#1E1E1E" stroke-width="1.5" />
                <line x1="190" y1="20" x2="190" y2="210" stroke="#D8D0C0" stroke-dasharray="3" />
                <line x1="260" y1="20" x2="260" y2="210" stroke="#D8D0C0" stroke-dasharray="3" />
                <line x1="330" y1="20" x2="330" y2="210" stroke="#D8D0C0" stroke-dasharray="3" />
                <line x1="380" y1="20" x2="380" y2="210" stroke="#D8D0C0" stroke-width="1" />

                <!-- Bar 1: Batting Average -->
                <text x="10" y="45" fill="#111111" font-size="12" font-weight="700" font-family="var(--font-family-sans)">Batting Average</text>
                <rect x="120" y="32" width="${valBatAvg * 2.6}" height="18" fill="var(--primary)" rx="0" stroke="#1E1E1E" stroke-width="1.5" />
                <text x="${120 + valBatAvg * 2.6 + 10}" y="46" fill="#111111" font-size="12" font-weight="900" font-family="var(--font-family-mono)">${teamBatAvg.toFixed(1)}</text>

                <!-- Bar 2: Strike Rate -->
                <text x="10" y="85" fill="#111111" font-size="12" font-weight="700" font-family="var(--font-family-sans)">Strike Rate</text>
                <rect x="120" y="72" width="${valSR * 2.6}" height="18" fill="var(--primary)" rx="0" stroke="#1E1E1E" stroke-width="1.5" />
                <text x="${120 + valSR * 2.6 + 10}" y="86" fill="#111111" font-size="12" font-weight="900" font-family="var(--font-family-mono)">${teamSR.toFixed(0)}</text>

                <!-- Bar 3: Bowling Econ -->
                <text x="10" y="125" fill="#111111" font-size="12" font-weight="700" font-family="var(--font-family-sans)">Bowling Econ</text>
                <rect x="120" y="112" width="${valEcon * 2.6}" height="18" fill="var(--willow-tan)" rx="0" stroke="#1E1E1E" stroke-width="1.5" />
                <text x="${120 + valEcon * 2.6 + 10}" y="126" fill="#111111" font-size="12" font-weight="900" font-family="var(--font-family-mono)">${teamEcon.toFixed(2)}</text>

                <!-- Bar 4: Bowling Strike Rate -->
                <text x="10" y="165" fill="#111111" font-size="12" font-weight="700" font-family="var(--font-family-sans)">Bowling SR</text>
                <rect x="120" y="152" width="${valBowlSR * 2.6}" height="18" fill="var(--willow-tan)" rx="0" stroke="#1E1E1E" stroke-width="1.5" />
                <text x="${120 + valBowlSR * 2.6 + 10}" y="166" fill="#111111" font-size="12" font-weight="900" font-family="var(--font-family-mono)">${teamBowlSR.toFixed(1)}</text>

                <!-- Bar 5: Fielding -->
                <text x="10" y="205" fill="#111111" font-size="12" font-weight="700" font-family="var(--font-family-sans)">Fielding Rating</text>
                <rect x="120" y="192" width="${valFielding * 2.6}" height="18" fill="var(--accent-gold)" rx="0" stroke="#1E1E1E" stroke-width="1.5" />
                <text x="${120 + valFielding * 2.6 + 10}" y="206" fill="#111111" font-size="12" font-weight="900" font-family="var(--font-family-mono)">${teamFielding.toFixed(0)}</text>
              </svg>
            </div>
          </div>

          <div class="cta-card mt-2">
            ${validation.valid ? `
              <div class="validation-success-alert">
                <span>✓ All selection requirements satisfied! Ready to enter tournament.</span>
              </div>
              <button id="start-wc-btn" class="btn btn-primary btn-lg mt-2" style="width:100%;">
                Enter Samarg World Cup
              </button>
            ` : `
              <div class="validation-error-alert">
                <strong>XI Incomplete:</strong> ${validation.reason}
              </div>
              <a href="#/draft" class="btn btn-danger mt-2" style="width:100%;">Fix Draft Lineup</a>
            `}
            <a href="#/draft" class="btn btn-secondary mt-1" style="width:100%;">Back to Draft</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach start tournament event listener
  if (validation.valid) {
    document.getElementById("start-wc-btn").addEventListener("click", startWorldCup);
  }
}

async function startWorldCup() {
  const btn = document.getElementById("start-wc-btn");
  btn.disabled = true;
  btn.innerText = "Assembling League Fixtures...";

  try {
    const finalizeCampaignFn = httpsCallable(functions, "finalizeCampaign");
    const result = await finalizeCampaignFn({
      campaignId: currentCampaign.id,
      squadXI: currentCampaign.squadXI
    });
    
    showToast("Tournament Hub setup complete! Good luck!");
    window.location.hash = "#/tournament";
  } catch (err) {
    console.error("Tournament finalization failed:", err);
    showToast("Setup failed: " + err.message, true);
    btn.disabled = false;
    btn.innerText = "Enter Samarg World Cup";
  }
}
