import { auth, db } from "../firebaseInit.js";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

let activeCampaign = null;
let activeLeague = null;

export async function renderTournament(container) {
  const user = auth.currentUser;
  if (!user) return;

  container.innerHTML = `<div class="text-center mt-4"><h3>Loading Tournament Hub...</h3></div>`;

  try {
    // 1. Fetch inProgress campaign
    const q = query(
      collection(db, "campaigns"),
      where("ownerUid", "==", user.uid),
      where("status", "==", "inProgress")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Check if there is a complete campaign to display summary
      const qc = query(
        collection(db, "campaigns"),
        where("ownerUid", "==", user.uid),
        where("status", "==", "complete")
      );
      const snapc = await getDocs(qc);
      if (!snapc.empty) {
        window.location.hash = "#/summary";
      } else {
        window.location.hash = "#/";
      }
      return;
    }

    activeCampaign = { id: snap.docs[0].id, ...snap.docs[0].data() };

    // 2. Fetch League standings and fixtures
    const leagueRef = doc(db, "leagues", activeCampaign.leagueId);
    const leagueSnap = await getDoc(leagueRef);
    if (!leagueSnap.exists) {
      showToast("League document not found.", true);
      window.location.hash = "#/";
      return;
    }

    activeLeague = leagueSnap.data();
    renderTournamentLayout(container);
  } catch (err) {
    console.error("Error loading tournament hub:", err);
    container.innerHTML = `<h3 class="text-red text-center mt-4">Failed to load tournament data.</h3>`;
  }
}

function renderTournamentLayout(container) {
  // Find player's next match in the fixtures list
  // The player plays exactly one match in each of the 7 rounds
  // Let's filter fixtures involving "player_team" that are still pending
  const playerPendingMatch = activeLeague.fixtures.find(
    f => (f.teamAId === "player_team" || f.teamBId === "player_team") && f.status === "pending"
  );

  const currentRound = activeLeague.currentMatchIndex + 1; // Rounds 1 to 7

  container.innerHTML = `
    <div class="tournament-hub">
      <div class="hub-header">
        <h2>Samarg World Cup Hub</h2>
        <p>Round-Robin Stage &bull; Round ${Math.min(7, currentRound)} of 7</p>
      </div>

      <div class="hub-layout mt-4">
        <!-- Standings Table Column -->
        <div class="hub-standings">
          <h3>League Standings</h3>
          <div class="standings-wrapper mt-2">
            <table class="standings-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th style="text-align: left;">Team</th>
                  <th>Pld</th>
                  <th>W</th>
                  <th>L</th>
                  <th>T</th>
                  <th>NRR</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                ${activeLeague.standingsTable.map((team, idx) => {
                  const isPlayer = team.teamId === "player_team";
                  const matchesPlayed = team.wins + team.losses + team.ties;
                  return `
                    <tr class="${isPlayer ? 'player-row-highlight' : ''}">
                      <td><strong>${idx + 1}</strong></td>
                      <td style="text-align: left; font-weight: 500;">
                        ${team.teamName} ${isPlayer ? '<span class="you-tag">YOU</span>' : ""}
                      </td>
                      <td>${matchesPlayed}</td>
                      <td>${team.wins}</td>
                      <td>${team.losses}</td>
                      <td>${team.ties}</td>
                      <td class="font-mono">${team.nrr > 0 ? "+" : ""}${team.nrr.toFixed(3)}</td>
                      <td><strong>${team.points}</strong></td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
          <p class="standings-sub mt-1">Top of the table wins the Samarg Cup after 7 rounds.</p>
        </div>

        <!-- Fixtures Column -->
        <div class="hub-fixtures">
          <div class="fixtures-header-row">
            <h3>Round Fixtures</h3>
            <div class="round-selector">
              <span class="round-indicator">Showing Round ${Math.min(7, currentRound)}</span>
            </div>
          </div>

          <div class="fixtures-list mt-2">
            ${activeLeague.fixtures
              .filter(f => f.round === Math.min(7, currentRound))
              .map(f => {
                const isPlayerMatch = f.teamAId === "player_team" || f.teamBId === "player_team";
                const isComplete = f.status === "complete";
                return `
                  <div class="fixture-item ${isPlayerMatch ? 'player-fixture-highlight' : ''}">
                    <div class="fix-teams">
                      <div class="fix-team ${f.teamAId === 'player_team' ? 'font-bold' : ''}">${f.teamAName}</div>
                      <div class="fix-vs">vs</div>
                      <div class="fix-team ${f.teamBId === 'player_team' ? 'font-bold' : ''}">${f.teamBName}</div>
                    </div>
                    <div class="fix-status">
                      ${isComplete ? `
                        <span class="status-badge complete">Complete</span>
                        <div class="fix-result">${f.result}</div>
                      ` : `
                        <span class="status-badge pending">Pending</span>
                      `}
                    </div>
                  </div>
                `;
              }).join("")}
          </div>

          <div class="hub-cta mt-4">
            ${playerPendingMatch ? `
              <button id="play-next-btn" class="btn btn-primary btn-lg" style="width: 100%;" data-match-id="${playerPendingMatch.matchId}">
                Play Round ${currentRound} Match
              </button>
            ` : `
              <div class="complete-alert">
                <h3>Campaign Completed!</h3>
                <p>You have finished all matches in this tournament.</p>
                <a href="#/summary" class="btn btn-accent mt-2" style="width: 100%;">View Campaign Summary</a>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event listener to Play Next Match button
  const playBtn = document.getElementById("play-next-btn");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      const matchId = playBtn.getAttribute("data-match-id");
      window.location.hash = `#/match/${matchId}`;
    });
  }
}
