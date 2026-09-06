import { auth, db, functions } from "../firebaseInit.js";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

let matchData = null;
let currentBallIndex = 0;
let playbackInterval = null;
let playbackSpeed = 1000; // ms per ball (1x)
let isPaused = false;

// Flatten ball logs across both innings for unified playback
let allBalls = [];
let currentInningsNumber = 1;

export async function renderMatchCenter(container, matchId) {
  const user = auth.currentUser;
  if (!user) return;

  container.innerHTML = `
    <div class="match-loading-card text-center mt-4">
      <h2>Connecting to Match Center...</h2>
      <p style="color: var(--chalk-white-dim); margin-top: 1rem;">Establishing server-authoritative simulation</p>
      <div class="scout-loader mt-2"></div>
    </div>
  `;

  // Reset playback state
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
  currentBallIndex = 0;
  isPaused = false;
  allBalls = [];

  try {
    // Fetch match details
    const matchRef = doc(db, "matches", matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists) {
      showToast("Match not found.", true);
      window.location.hash = "#/tournament";
      return;
    }

    let currentMatchState = snap.data();

    if (currentMatchState.status === "pending") {
      // Trigger simulation on server
      const simulateMatchFn = httpsCallable(functions, "simulateMatch");
      const result = await simulateMatchFn({ matchId });
      matchData = result.data;
    } else {
      matchData = currentMatchState;
    }

    // Flatten balls for playback sequencing
    // Innings 1
    const i1 = matchData.inningsData[0];
    i1.balls.forEach(b => allBalls.push({ ...b, innings: 1 }));
    // Innings 2
    const i2 = matchData.inningsData[1];
    i2.balls.forEach(b => allBalls.push({ ...b, innings: 2 }));

    renderMatchLayout(container);
    startPlayback();
  } catch (err) {
    console.error("Match Center setup failed:", err);
    container.innerHTML = `<h3 class="text-red text-center mt-4">Simulation failed: ${err.message}</h3>`;
  }
}

function renderMatchLayout(container) {
  container.innerHTML = `
    <div class="match-center-container">
      <!-- Top Broadcast Bar -->
      <div class="broadcast-header">
        <div class="bh-team text-right">${matchData.teamAName}</div>
        <div class="bh-vs">VS</div>
        <div class="bh-team text-left">${matchData.teamBName}</div>
      </div>
      
      <div class="toss-info text-center mt-1">
        Toss: <strong>${matchData.tossWinner}</strong> chose to <strong>${matchData.tossDecision} first</strong>.
        ${matchData.inningsData[0].rainInterrupted || matchData.inningsData[1].rainInterrupted ? '<span class="text-gold">&nbsp;&bull;&nbsp;Rain Delays (DLS Applied)</span>' : ""}
      </div>

      <!-- TV-Style Live Scoreboard Widget -->
      <div class="tv-scoreboard mt-2">
        <div class="score-row">
          <div class="score-team" id="live-team-name">Loading...</div>
          <div class="score-runs" id="live-runs">0/0</div>
          <div class="score-overs" id="live-overs">(0.0 ov)</div>
        </div>
        <div class="chase-row" id="live-chase-status" style="display: none;">
          Need 0 runs from 0 balls (Required RRR: 0.0)
        </div>
      </div>

      <!-- Active Bat/Bowl Cards -->
      <div class="active-players-cards mt-2">
        <!-- Batsmen -->
        <div class="active-card-group">
          <h4>Batting</h4>
          <div class="active-player-item striker-highlight" id="striker-row">
            <span class="ap-name" id="striker-name">-</span>
            <span class="ap-stats" id="striker-stats">0 (0)</span>
          </div>
          <div class="active-player-item" id="nonstriker-row">
            <span class="ap-name" id="nonstriker-name">-</span>
            <span class="ap-stats" id="nonstriker-stats">0 (0)</span>
          </div>
        </div>

        <!-- Bowler & Over Strip -->
        <div class="active-card-group">
          <h4>Bowling</h4>
          <div class="active-player-item">
            <span class="ap-name" id="bowler-name">-</span>
            <span class="ap-stats" id="bowler-stats">0-0-0-0</span>
          </div>
          <div class="over-strip-container mt-1">
            <span class="ap-lbl">This Over:</span>
            <div class="over-balls-list" id="over-balls-list">
              <!-- Ball circles -->
            </div>
          </div>
        </div>
      </div>

      <!-- Graph & Playback Settings Grid -->
      <div class="match-mid-layout mt-2">
        <!-- Live Run Rate Line Chart -->
        <div class="graph-card">
          <h4>Innings Run Progression</h4>
          <div id="rr-graph-container" class="mt-1">
            <!-- Render SVG dynamically -->
          </div>
        </div>

        <!-- Playback Controls -->
        <div class="controls-card text-center">
          <h4>Playback Speed</h4>
          <div class="speed-buttons mt-1">
            <button class="btn btn-secondary speed-btn active" data-speed="1000">1x</button>
            <button class="btn btn-secondary speed-btn" data-speed="400">2x</button>
            <button class="btn btn-secondary speed-btn" data-speed="100">5x</button>
          </div>
          <div class="control-actions mt-2">
            <button id="pause-btn" class="btn btn-secondary" style="width: 100px;">Pause</button>
            <button id="skip-btn" class="btn btn-accent" style="flex:1;">Skip to Result</button>
          </div>
        </div>
      </div>

      <!-- Live Commentary -->
      <div class="commentary-card mt-2">
        <h4>Ball-by-Ball Commentary</h4>
        <div class="commentary-list mt-1" id="commentary-list" aria-live="polite">
          <!-- Text commentary items -->
        </div>
      </div>
    </div>
  `;

  // Speed controls listener
  container.querySelectorAll(".speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      playbackSpeed = parseInt(btn.getAttribute("data-speed"));
      if (playbackInterval && !isPaused) {
        clearInterval(playbackInterval);
        startPlayback();
      }
    });
  });

  // Pause/Play listener
  const pauseBtn = document.getElementById("pause-btn");
  pauseBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    if (isPaused) {
      pauseBtn.innerText = "Play";
      clearInterval(playbackInterval);
    } else {
      pauseBtn.innerText = "Pause";
      startPlayback();
    }
  });

  // Skip listener
  document.getElementById("skip-btn").addEventListener("click", () => {
    clearInterval(playbackInterval);
    currentBallIndex = allBalls.length - 1;
    updateUIState(true);
  });
}

function startPlayback() {
  playbackInterval = setInterval(() => {
    if (currentBallIndex < allBalls.length) {
      updateUIState(false);
      currentBallIndex++;
    } else {
      clearInterval(playbackInterval);
      completeMatch();
    }
  }, playbackSpeed);
}

function updateUIState(skipToEnd = false) {
  if (skipToEnd) {
    currentBallIndex = allBalls.length - 1;
  }

  const ball = allBalls[currentBallIndex];
  if (!ball) return;

  const currentInnings = matchData.inningsData[ball.innings - 1];
  const battingTeamName = ball.innings === 1 ? (matchData.tossDecision === "bat" ? matchData.tossWinner : getOpponentName()) : (matchData.tossDecision === "bowl" ? matchData.tossWinner : getOpponentName());
  
  // 1. Update Scoreboard
  // Accumulate runs up to current ball
  let currentRuns = 0;
  let currentWickets = 0;
  let ballsInInnings = 0;

  for (let i = 0; i <= currentBallIndex; i++) {
    const b = allBalls[i];
    if (b.innings === ball.innings) {
      if (b.isExtra && (b.extraType === "wide" || b.extraType === "noball")) {
        currentRuns += 1;
      } else {
        currentRuns += b.runs;
        if (b.isExtra && b.extraType === "bye") {
          // runs already added to team runs but not counted as legal delivery
        }
        ballsInInnings++;
      }
      if (b.isWicket) {
        currentWickets++;
      }
    }
  }

  const completedOvers = Math.floor(ballsInInnings / 6);
  const fractionalBalls = ballsInInnings % 6;

  document.getElementById("live-team-name").innerText = battingTeamName;
  document.getElementById("live-runs").innerText = `${currentRuns}/${currentWickets}`;
  document.getElementById("live-overs").innerText = `(${completedOvers}.${fractionalBalls} ov)`;

  // Chase info
  const chaseRow = document.getElementById("live-chase-status");
  if (ball.innings === 2) {
    chaseRow.style.display = "block";
    const i1Runs = matchData.inningsData[0].totalRuns;
    const target = currentInnings.oversLimit === 20 ? i1Runs + 1 : currentInnings.oversLimit * 5; // DLS target approx if cut short
    const runsNeeded = target - currentRuns;
    const ballsRemaining = currentInnings.oversLimit * 6 - ballsInInnings;
    const rrr = ballsRemaining > 0 ? (runsNeeded / (ballsRemaining / 6)) : 0;
    
    if (runsNeeded > 0 && ballsRemaining > 0) {
      chaseRow.innerText = `Need ${runsNeeded} runs from ${ballsRemaining} balls (Required RRR: ${rrr.toFixed(1)})`;
    } else if (runsNeeded <= 0) {
      chaseRow.innerText = `Target chased down!`;
    } else {
      chaseRow.innerText = `Innings completed.`;
    }
  } else {
    chaseRow.style.display = "none";
  }

  // 2. Active Batter details
  const striker = currentInnings.battingCard.find(p => p.id === ball.strikerId);
  // Find non-striker at this instant
  // To avoid complex reverse-history, we fallback to finding the active bats listed in the log
  let strikerRuns = 0;
  let strikerBalls = 0;
  for (let i = 0; i <= currentBallIndex; i++) {
    const b = allBalls[i];
    if (b.innings === ball.innings && b.strikerId === ball.strikerId) {
      if (!(b.isExtra && (b.extraType === "wide" || b.extraType === "noball"))) {
        strikerRuns += b.runs;
        strikerBalls++;
      }
    }
  }

  document.getElementById("striker-name").innerText = `${striker ? striker.name : "Batsman"} *`;
  document.getElementById("striker-stats").innerText = `${strikerRuns} (${strikerBalls})`;

  // 3. Active Bowler details
  const bowler = currentInnings.bowlingCard.find(bCard => bCard.id === ball.bowlerId);
  let bowlerRuns = 0;
  let bowlerWickets = 0;
  let bowlerBalls = 0;
  for (let i = 0; i <= currentBallIndex; i++) {
    const b = allBalls[i];
    if (b.innings === ball.innings && b.bowlerId === ball.bowlerId) {
      if (b.isWicket && b.wicketType !== "runout") {
        bowlerWickets++;
      }
      if (b.isExtra && (b.extraType === "wide" || b.extraType === "noball")) {
        bowlerRuns += 1;
      } else {
        bowlerRuns += b.runs;
        bowlerBalls++;
      }
    }
  }
  const bowlOvers = Math.floor(bowlerBalls / 6) + (bowlerBalls % 6) / 10;
  document.getElementById("bowler-name").innerText = bowler ? bowler.name : "Bowler";
  document.getElementById("bowler-stats").innerText = `${bowlOvers} ov - ${bowlerRuns} runs - ${bowlerWickets} wkts`;

  // 4. Over Strip
  const overBallsList = document.getElementById("over-balls-list");
  // Find all balls in the current over
  const currentOverNum = Math.floor(ballsInInnings / 6);
  const overBalls = [];
  for (let i = 0; i <= currentBallIndex; i++) {
    const b = allBalls[i];
    if (b.innings === ball.innings && b.over === currentOverNum) {
      let disp = b.runs.toString();
      if (b.isWicket) disp = "W";
      else if (b.isExtra && b.extraType === "wide") disp = "wd";
      else if (b.isExtra && b.extraType === "noball") disp = "nb";
      else if (b.isExtra && b.extraType === "bye") disp = `${b.runs}b`;
      overBalls.push(disp);
    }
  }

  overBallsList.innerHTML = overBalls.map(o => `
    <span class="over-ball-circle ${o === 'W' ? 'wicket' : (o === '4' || o === '6' ? 'boundary' : '')}">${o}</span>
  `).join("");

  // 5. Commentary
  const commList = document.getElementById("commentary-list");
  const commItem = document.createElement("div");
  commItem.className = `commentary-item ${ball.isWicket ? 'wicket' : (ball.runs === 4 || ball.runs === 6 ? 'boundary' : '')}`;
  
  // Format ball number prefix: over.ball
  const overPrefix = `<span class="comm-ball">${ball.over}.${ball.ballInOver}</span>`;
  commItem.innerHTML = `${overPrefix} ${ball.commentary}`;
  commList.insertBefore(commItem, commList.firstChild);

  // 6. Draw dynamic SVG Run Rate graph
  renderGraph();

  if (skipToEnd) {
    completeMatch();
  }
}

function getOpponentName() {
  return matchData.teamAId === "player_team" ? matchData.teamBName : matchData.teamAName;
}

function renderGraph() {
  const graphContainer = document.getElementById("rr-graph-container");
  if (!graphContainer) return;

  // Render over-by-over line progression
  // Innings 1 full path
  const i1 = matchData.inningsData[0];
  const i1Points = [{ over: 0, runs: 0 }];
  let cumRuns = 0;
  
  // Construct points per over
  for (let over = 1; over <= 20; over++) {
    // Sum runs up to this over in Innings 1
    const overBalls = i1.balls.filter(b => b.over < over);
    let runsSum = 0;
    overBalls.forEach(b => {
      if (b.isExtra && (b.extraType === "wide" || b.extraType === "noball")) runsSum += 1;
      else runsSum += b.runs;
    });
    i1Points.push({ over, runs: runsSum });
  }

  // Innings 2 progressive path based on currentBallIndex
  const i2Points = [{ over: 0, runs: 0 }];
  const currentBall = allBalls[currentBallIndex];
  if (currentBall) {
    let currentInnings2Runs = 0;
    let currentInnings2Balls = 0;
    for (let i = 0; i <= currentBallIndex; i++) {
      const b = allBalls[i];
      if (b.innings === 2) {
        if (b.isExtra && (b.extraType === "wide" || b.extraType === "noball")) {
          currentInnings2Runs += 1;
        } else {
          currentInnings2Runs += b.runs;
          currentInnings2Balls++;
        }
        
        if (currentInnings2Balls % 6 === 0) {
          i2Points.push({ over: currentInnings2Balls / 6, runs: currentInnings2Runs });
        }
      }
    }
    // Add current fractional over point
    if (currentInnings2Balls % 6 !== 0) {
      i2Points.push({ over: currentInnings2Balls / 6, runs: currentInnings2Runs });
    }
  }

  const maxRuns = Math.max(200, i1.totalRuns, matchData.inningsData[1].totalRuns);

  // SVG Coordinates mapping:
  // Over X: 40 + over * 16 (0 to 20 over range maps to X: 40 to 360)
  // Runs Y: 130 - (runs / maxRuns) * 110 (0 to maxRuns maps to Y: 130 to 20)
  const mapX = (ov) => 40 + ov * 16;
  const mapY = (rn) => 130 - (rn / maxRuns) * 110;

  const i1PathStr = i1Points.map(p => `${mapX(p.over)},${mapY(p.runs)}`).join(" ");
  const i2PathStr = i2Points.map(p => `${mapX(p.over)},${mapY(p.runs)}`).join(" ");

  graphContainer.innerHTML = `
    <svg viewBox="0 0 380 150" width="100%" height="150" style="background: #FFFFFF; border: 2px solid #1E1E1E;">
      <!-- Grid -->
      <line x1="40" y1="20" x2="360" y2="20" stroke="#EAE4D6" stroke-width="1" stroke-dasharray="3" />
      <line x1="40" y1="75" x2="360" y2="75" stroke="#EAE4D6" stroke-width="1" stroke-dasharray="3" />
      <line x1="40" y1="130" x2="360" y2="130" stroke="#1E1E1E" stroke-width="1.5" />
      <line x1="40" y1="20" x2="40" y2="130" stroke="#1E1E1E" stroke-width="1.5" />
      <line x1="360" y1="20" x2="360" y2="130" stroke="#EAE4D6" stroke-width="1" />

      <!-- Y Axis Labels -->
      <text x="32" y="24" fill="#111111" font-size="9" font-weight="700" text-anchor="end">${maxRuns}</text>
      <text x="32" y="79" fill="#111111" font-size="9" font-weight="700" text-anchor="end">${Math.round(maxRuns / 2)}</text>
      <text x="32" y="134" fill="#111111" font-size="9" font-weight="700" text-anchor="end">0</text>

      <!-- X Axis Labels -->
      <text x="40" y="142" fill="#111111" font-size="8" font-weight="700" text-anchor="middle">0</text>
      <text x="120" y="142" fill="#111111" font-size="8" font-weight="700" text-anchor="middle">5</text>
      <text x="200" y="142" fill="#111111" font-size="8" font-weight="700" text-anchor="middle">10</text>
      <text x="280" y="142" fill="#111111" font-size="8" font-weight="700" text-anchor="middle">15</text>
      <text x="360" y="142" fill="#111111" font-size="8" font-weight="700" text-anchor="middle">20 ov</text>

      <!-- Innings 1 Path (High Contrast Dark Gold Line) -->
      <polyline fill="none" stroke="var(--text-gold)" stroke-width="2.5" opacity="1" points="${i1PathStr}" />
      
      <!-- Innings 2 Path (Bright Coral Line) -->
      ${i2Points.length > 1 ? `<polyline fill="none" stroke="var(--primary-coral)" stroke-width="3" points="${i2PathStr}" />` : ""}
    </svg>
  `;
}

function completeMatch() {
  // Show standard alert and enableSkip
  const tvB = document.querySelector(".tv-scoreboard");
  if (tvB) {
    tvB.innerHTML += `
      <div class="result-ticker-alert mt-2 text-center" style="animation: pulse 1.5s infinite;">
        <h3>Match Over: ${matchData.result.winner === "tie" ? "Match Tied!" : matchData.result.winner + " " + matchData.result.margin}</h3>
        <p>Man of the Match: <strong>${matchData.manOfTheMatch}</strong></p>
        <button id="view-result-btn" class="btn btn-accent mt-2" style="width: 200px; margin: 0 auto;">
          Go to Result Card
        </button>
      </div>
    `;

    document.getElementById("view-result-btn").addEventListener("click", () => {
      window.location.hash = `#/result/${matchData.id || window.location.hash.split("/").pop()}`;
    });
  }
}
