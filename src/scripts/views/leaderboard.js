import { auth, db } from "../firebaseInit.js";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

export async function renderLeaderboard(container) {
  container.innerHTML = `<div class="text-center mt-4"><h3>Loading Global Standings...</h3></div>`;

  try {
    const q = query(
      collection(db, "leaderboard"),
      orderBy("perfectRun", "desc"),
      orderBy("wins", "desc"),
      orderBy("nrr", "desc"),
      limit(30)
    );
    const snap = await getDocs(q);

    const entries = [];
    snap.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });

    renderLeaderboardLayout(container, entries);
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    container.innerHTML = `<h3 class="text-red text-center mt-4">Failed to load leaderboard. Make sure Firebase emulators are running and seeded!</h3>`;
  }
}

function renderLeaderboardLayout(container, entries) {
  container.innerHTML = `
    <div class="leaderboard-container">
      <div class="lb-header text-center">
        <h2>Global Hall of Fame</h2>
        <p>Top Campaigns &bull; Ranked by Wins, Perfect Runs, and Net Run Rate (NRR)</p>
      </div>

      <div class="lb-wrapper mt-4">
        ${entries.length === 0 ? `
          <div class="text-center p-4" style="color: var(--chalk-white-dark);">
            <h3>No entries found yet!</h3>
            <p class="mt-1">Be the first to complete a campaign and submit your score!</p>
            <a href="#/draft" class="btn btn-primary mt-2">Start Scouting</a>
          </div>
        ` : `
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th style="width: 80px;">Rank</th>
                <th style="text-align: left;">Player Name</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>NRR</th>
                <th style="text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map((entry, idx) => {
                const isPerfect = entry.perfectRun === true;
                const isCurrent = auth.currentUser && entry.uid === auth.currentUser.uid;
                return `
                  <tr class="${isCurrent ? 'player-row-highlight' : ''}">
                    <td><strong>#${idx + 1}</strong></td>
                    <td style="text-align: left; font-weight: 500;">
                      ${entry.displayName} ${isCurrent ? '<span class="you-tag">YOU</span>' : ""}
                    </td>
                    <td><strong>${entry.wins}</strong></td>
                    <td>${entry.losses}</td>
                    <td class="font-mono">${entry.nrr > 0 ? "+" : ""}${entry.nrr.toFixed(3)}</td>
                    <td style="text-align: right;">
                      ${isPerfect ? `
                        <span class="perfect-trophy-badge">👑 Samarg Run</span>
                      ` : `
                        <span class="active-trophy-badge" style="background: var(--bg-light); color: var(--chalk-white-dim);">Completed</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `;
}
