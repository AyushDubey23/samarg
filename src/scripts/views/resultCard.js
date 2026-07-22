import { auth, db } from "../firebaseInit.js";
import { doc, getDoc } from "firebase/firestore";

let matchData = null;

export async function renderResultCard(container, matchId) {
  const user = auth.currentUser;
  if (!user) return;

  container.innerHTML = `<div class="text-center mt-4"><h3>Loading Match Result...</h3></div>`;

  try {
    const matchRef = doc(db, "matches", matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists) {
      showToast("Match result not found.", true);
      window.location.hash = "#/tournament";
      return;
    }

    matchData = snap.data();
    renderResultLayout(container);
    drawShareCard();
  } catch (err) {
    console.error("Error loading result card:", err);
    container.innerHTML = `<h3 class="text-red text-center mt-4">Failed to load result.</h3>`;
  }
}

function renderResultLayout(container) {
  const i1 = matchData.inningsData[0];
  const i2 = matchData.inningsData[1];

  // Helper to find top performers
  const getTopPerformers = () => {
    const batters = [];
    const bowlers = [];

    const collectStats = (innings, teamName) => {
      innings.battingCard.forEach(p => {
        batters.push({ name: p.name, team: teamName, runs: p.runs, balls: p.balls });
      });
      innings.bowlingCard.forEach(p => {
        // overs could be fraction like 3.4
        bowlers.push({ name: p.name, team: teamName, wickets: p.wickets, runs: p.runsConceded, overs: p.overs });
      });
    };

    const isAFirst = matchData.tossDecision === "bat" ? matchData.tossWinner === matchData.teamAName : matchData.tossWinner === matchData.teamBName;
    if (isAFirst) {
      collectStats(i1, matchData.teamAName);
      collectStats(i2, matchData.teamBName);
    } else {
      collectStats(i1, matchData.teamBName);
      collectStats(i2, matchData.teamAName);
    }

    batters.sort((a, b) => b.runs - a.runs);
    bowlers.sort((a, b) => {
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      return a.runs - b.runs; // Lower runs conceded is better
    });

    return { topBatters: batters.slice(0, 3), topBowlers: bowlers.slice(0, 3) };
  };

  const { topBatters, topBowlers } = getTopPerformers();

  container.innerHTML = `
    <div class="result-card-container">
      <div class="rc-header text-center">
        <h2>Match Result Card</h2>
        <p class="text-gold mt-1" style="font-size: 1.15rem; font-weight: 700;">
          ${matchData.result.winner === "tie" ? "Match Tied!" : matchData.result.winner + " " + matchData.result.margin}
        </p>
      </div>

      <div class="rc-grid mt-4">
        <!-- Text Summary & Performers -->
        <div class="rc-summary-panel">
          <div class="scoreboard-summary">
            <h3>Match Summary</h3>
            <div class="summary-team-row mt-2">
              <span>${matchData.teamAName}</span>
              <strong>${i1.totalRuns}/${i1.totalWickets} <span class="ov-text">(${i1.oversBowled} ov)</span></strong>
            </div>
            <div class="summary-team-row">
              <span>${matchData.teamBName}</span>
              <strong>${i2.totalRuns}/${i2.totalWickets} <span class="ov-text">(${i2.oversBowled} ov)</span></strong>
            </div>
            <p class="mvp-banner mt-2">
              🏆 Man of the Match: <strong>${matchData.manOfTheMatch}</strong>
            </p>
          </div>

          <div class="top-performers-card mt-2">
            <h3>Top Performers</h3>
            <div class="perf-list mt-2">
              <div class="perf-col">
                <h4>Top Batting</h4>
                ${topBatters.map(b => `
                  <div class="perf-item">
                    <span>${b.name} (${b.team.slice(0,3)})</span>
                    <strong>${b.runs} <span class="balls-dim">(${b.balls})</span></strong>
                  </div>
                `).join("")}
              </div>
              <div class="perf-col">
                <h4>Top Bowling</h4>
                ${topBowlers.map(w => `
                  <div class="perf-item">
                    <span>${w.name} (${w.team.slice(0,3)})</span>
                    <strong>${w.wickets}/${w.runs} <span class="balls-dim">(${w.overs} ov)</span></strong>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <div class="action-buttons mt-4">
            <a href="#/tournament" class="btn btn-primary" style="width: 100%;">Return to Tournament Hub</a>
          </div>
        </div>

        <!-- HTML5 Canvas Share Graphic -->
        <div class="rc-share-panel text-center">
          <h3>Share Result Card</h3>
          <div class="canvas-wrapper mt-2">
            <canvas id="share-card-canvas" width="600" height="400" style="width:100%; max-width: 400px; border-radius: var(--border-radius-md); box-shadow: var(--shadow-md); border: 1px solid var(--glass-border);"></canvas>
          </div>
          <button id="download-card-btn" class="btn btn-accent mt-2" style="width: 250px; margin: 1rem auto 0 auto;">
            Download Share Card (PNG)
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach download handler
  document.getElementById("download-card-btn").addEventListener("click", downloadShareCard);
}

function drawShareCard() {
  const canvas = document.getElementById("share-card-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const i1 = matchData.inningsData[0];
  const i2 = matchData.inningsData[1];

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, 400);
  grad.addColorStop(0, "#08130c"); // Pitch green dark
  grad.addColorStop(1, "#0d2716"); // Pitch green medium
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 400);

  // Border & Chalk lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 15;
  ctx.strokeRect(10, 10, 580, 380);

  ctx.strokeStyle = "#806846"; // Willow tan
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 560, 360);

  // Logo / Title watermark
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "800 24px 'Inter', sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("SAMARG XI", 40, 60);

  ctx.fillStyle = "#b89d70"; // Willow tan light
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.letterSpacing = "1px";
  ctx.fillText("CRICKET SIMULATOR", 40, 80);

  // Winner text
  ctx.fillStyle = "#ffb01f"; // Gold
  ctx.font = "800 20px 'Inter', sans-serif";
  ctx.fillText(matchData.result.winner === "tie" ? "MATCH TIED!" : matchData.result.winner.toUpperCase(), 40, 140);
  
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 16px 'Inter', sans-serif";
  ctx.fillText(matchData.result.margin, 40, 165);

  // Score Box
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(40, 200, 520, 100);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.strokeRect(40, 200, 520, 100);

  // Scores
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "700 16px 'Inter', sans-serif";
  ctx.fillText(matchData.teamAName, 60, 238);
  ctx.fillText(matchData.teamBName, 60, 278);

  ctx.fillStyle = "white";
  ctx.font = "700 18px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${i1.totalRuns}/${i1.totalWickets} (${i1.oversBowled} ov)`, 540, 238);
  ctx.fillText(`${i2.totalRuns}/${i2.totalWickets} (${i2.oversBowled} ov)`, 540, 278);

  // MVP Footer
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.fillText("MAN OF THE MATCH", 40, 340);

  ctx.fillStyle = "#ffb01f";
  ctx.font = "700 18px 'Inter', sans-serif";
  ctx.fillText(matchData.manOfTheMatch, 40, 362);

  // Watermark
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "600 11px 'Inter', sans-serif";
  ctx.fillText("SAMARG.WEB.APP", 560, 362);
}

function downloadShareCard() {
  const canvas = document.getElementById("share-card-canvas");
  if (!canvas) return;

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `samarg_match_${Date.now()}.png`;
  link.href = url;
  link.click();
}
