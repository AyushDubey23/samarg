import { auth, db, functions } from "../firebaseInit.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

let activeCampaign = null;
let activeLeague = null;

export async function renderSummary(container) {
  const user = auth.currentUser;
  if (!user) return;

  container.innerHTML = `<div class="text-center mt-4"><h3>Loading Campaign Summary...</h3></div>`;

  try {
    // Fetch the most recent complete or inProgress campaign
    // (If inProgress, they could have finished the 7th match and need summary)
    const q = query(
      collection(db, "campaigns"),
      where("ownerUid", "==", user.uid)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      window.location.hash = "#/";
      return;
    }

    // Sort locally by createdAt desc to get the latest
    const campaigns = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    activeCampaign = campaigns[0];

    // Load league
    const leagueRef = doc(db, "leagues", `league_${activeCampaign.id}`);
    const leagueSnap = await getDoc(leagueRef);
    if (!leagueSnap.exists) {
      window.location.hash = "#/";
      return;
    }

    activeLeague = leagueSnap.data();

    // Check if tournament actually finished (7 matches)
    if (activeLeague.currentMatchIndex < 7) {
      // Not complete, return to hub
      window.location.hash = "#/tournament";
      return;
    }

    renderSummaryLayout(container);
  } catch (err) {
    console.error("Error rendering summary:", err);
    container.innerHTML = `<h3 class="text-red text-center mt-4">Failed to load campaign summary.</h3>`;
  }
}

function renderSummaryLayout(container) {
  const playerStanding = activeLeague.standingsTable.find(s => s.teamId === "player_team");
  const playerRank = activeLeague.standingsTable.findIndex(s => s.teamId === "player_team") + 1;
  const isPerfect = playerStanding.wins === 7;

  container.innerHTML = `
    <div class="summary-container">
      <div class="summary-card-hero text-center">
        ${isPerfect ? `
          <div class="trophy-seal" style="font-size: 4.5rem; animation: pulse 2s infinite;">🏆</div>
          <h1 class="text-gold" style="font-size: 2.2rem; font-weight: 800;">PERFECT SAMARG RUN!</h1>
          <p class="summary-subtitle">7 Matches Played. 7 Wins. 0 Losses. Undefeated Greatness!</p>
        ` : `
          <div class="trophy-seal" style="font-size: 4rem;">🏏</div>
          <h1 style="font-size: 2rem;">Campaign Finished</h1>
          <p class="summary-subtitle">Your Playing XI finished in <strong>Position #${playerRank}</strong></p>
        `}
      </div>

      <div class="summary-grid mt-4">
        <!-- Campaign Stats & Standings -->
        <div class="summary-info-panel">
          <div class="summary-stats-box">
            <h3>Campaign Record</h3>
            <div class="stats-row mt-2">
              <div class="stat-block">
                <strong>7</strong>
                <span>Matches</span>
              </div>
              <div class="stat-block">
                <strong class="${playerStanding.wins === 7 ? 'text-gold' : ''}">${playerStanding.wins}</strong>
                <span>Wins</span>
              </div>
              <div class="stat-block">
                <strong>${playerStanding.losses}</strong>
                <span>Losses</span>
              </div>
              <div class="stat-block">
                <strong>${playerStanding.nrr > 0 ? "+" : ""}${playerStanding.nrr.toFixed(3)}</strong>
                <span>NRR</span>
              </div>
            </div>
          </div>

          <div class="final-standings-list mt-2">
            <h3>Final Table Standings</h3>
            <div class="standings-wrapper mt-1">
              <table class="standings-table">
                <tbody>
                  ${activeLeague.standingsTable.map((team, idx) => {
                    const isPlayer = team.teamId === "player_team";
                    return `
                      <tr class="${isPlayer ? 'player-row-highlight' : ''}">
                        <td><strong>${idx + 1}</strong></td>
                        <td style="text-align: left; font-weight: 500;">${team.teamName}</td>
                        <td>${team.wins}W-${team.losses}L</td>
                        <td class="font-mono">${team.nrr > 0 ? "+" : ""}${team.nrr.toFixed(3)}</td>
                        <td><strong>${team.points} pts</strong></td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Leaderboard Submit & Next campaign -->
        <div class="summary-actions-panel">
          <div class="action-card">
            <h3>Submit to Leaderboard</h3>
            <p class="mt-1" style="font-size: 0.9rem; color: var(--chalk-white-dim);">
              Post your NRR and wins to the global leaderboards to compete with players worldwide.
            </p>

            <div class="submit-form mt-2">
              <div class="form-group">
                <label for="leaderboard-name-input" style="font-size: 0.85rem; font-weight:600; color: var(--chalk-white-dim);">Display Name</label>
                <input type="text" id="leaderboard-name-input" class="name-input mt-1" value="${auth.currentUser.displayName || ""}" placeholder="Enter name for leaderboard..." style="width: 100%; padding: 0.75rem; border-radius: var(--border-radius-sm); border: 1px solid var(--glass-border); background: var(--bg-dark); color: white;">
              </div>

              <button id="submit-leaderboard-btn" class="btn btn-accent mt-2" style="width: 100%;">
                Submit Result
              </button>
            </div>
          </div>

          <div class="campaign-restart-card mt-2 text-center">
            <button id="start-new-campaign-btn" class="btn btn-primary btn-lg" style="width: 100%;">
              Start New Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  document.getElementById("submit-leaderboard-btn").addEventListener("click", submitLeaderboard);
  document.getElementById("start-new-campaign-btn").addEventListener("click", startNewCampaign);
}

async function submitLeaderboard() {
  const btn = document.getElementById("submit-leaderboard-btn");
  const nameInput = document.getElementById("leaderboard-name-input");
  const name = nameInput.value.trim() || "Anonymous Player";

  btn.disabled = true;
  btn.innerText = "Submitting to cloud...";

  try {
    const submitFn = httpsCallable(functions, "submitToLeaderboard");
    await submitFn({
      campaignId: activeCampaign.id,
      displayName: name
    });

    showToast("Submitted successfully to leaderboards!");
    window.location.hash = "#/leaderboard";
  } catch (err) {
    console.error("Leaderboard submit failed:", err);
    showToast("Failed to submit: " + err.message, true);
    btn.disabled = false;
    btn.innerText = "Submit Result";
  }
}

async function startNewCampaign() {
  // To start a new campaign, we need to mark any current active campaigns as closed,
  // or we can just update this campaign's status in Firestore to 'complete_archived'.
  // Our draft.js view automatically creates a new campaign if no 'drafting' one exists!
  // So we just redirect them to `#/draft`. The draft logic will boot a new campaign since the current is complete!
  window.location.hash = "#/draft";
}
