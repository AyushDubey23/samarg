import { auth, db, functions, rtdb } from "../firebaseInit.js";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { signInAnonymously } from "firebase/auth";
import { ref, set, get, serverTimestamp, onValue } from "firebase/database";

function generateClientRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function renderLanding(container) {
  const user = auth.currentUser;
  let statsHTML = "";

  if (user) {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const stats = userSnap.data().stats;
        if (stats && stats.totalCampaigns > 0) {
          statsHTML = `
            <div class="user-stats-card">
              <h3>Your Career Stats</h3>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-val">${stats.totalCampaigns}</span>
                  <span class="stat-lbl">Campaigns</span>
                </div>
                <div class="stat-item">
                  <span class="stat-val text-gold">${stats.perfectRuns}</span>
                  <span class="stat-lbl">Perfect Runs</span>
                </div>
                <div class="stat-item">
                  <span class="stat-val">${stats.bestNRR > 0 ? "+" : ""}${stats.bestNRR.toFixed(3)}</span>
                  <span class="stat-lbl">Best NRR</span>
                </div>
              </div>
              <a href="#/profile" class="btn btn-secondary mt-2" style="width:100%;">View History</a>
            </div>
          `;
        }
      }
    } catch (err) {
      console.warn("Could not load user stats for landing:", err);
    }
  }

  container.innerHTML = `
    <div class="landing-hero">
      <div class="hero-content">
        <h1>SAMARG</h1>
        <p class="hero-sub">
          Draft cricket legends from real World Cups. Race your friends to a perfect undefeated campaign!
        </p>

        <!-- Multiplayer game creator configurations card -->
        <div class="career-stats-widget" style="padding: 1.5rem; max-width: 500px; margin-top: 1.5rem; background: #FFFFFF; border: 2px solid #1E1E1E; box-shadow: 4px 4px 0px #1E1E1E;">
          <h3 style="color: #C89B3C; text-transform: uppercase; font-size: 1.1rem; margin-bottom: 1.25rem; font-weight: 900;">
            Create Room or Join Lobby
          </h3>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- Mode Selector -->
            <div>
              <span style="display: block; font-size: 0.85rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Match Mode:</span>
              <div class="speed-buttons">
                <button class="speed-btn mode-select-btn active" data-mode="duel">2-Player Duel</button>
                <button class="speed-btn mode-select-btn" data-mode="cup">4-Player Cup</button>
                <button class="speed-btn mode-select-btn" data-mode="solo">Solo Campaign</button>
              </div>
            </div>

            <!-- Difficulty Selector -->
            <div>
              <span style="display: block; font-size: 0.85rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Draft Difficulty:</span>
              <div class="speed-buttons">
                <button class="speed-btn diff-select-btn active" data-diff="openBook">Open Book (Classic)</button>
                <button class="speed-btn diff-select-btn" data-diff="blindScout">Blind Scout (Memory)</button>
              </div>
            </div>

            <!-- Turn Timer Picker -->
            <div>
              <span style="display: block; font-size: 0.85rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Pick Time Limit:</span>
              <div class="speed-buttons">
                <button class="speed-btn timer-select-btn active" data-timer="20">20 Seconds</button>
                <button class="speed-btn timer-select-btn" data-timer="30">30 Seconds</button>
                <button class="speed-btn timer-select-btn" data-timer="45">45 Seconds</button>
              </div>
            </div>

            <!-- Password -->
            <label>
              <span style="display: block; font-size: 0.85rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Room Password (Optional):</span>
              <input type="password" id="room-password" style="width: 100%; border: 2px solid #1E1E1E; text-align: left; padding: 0.6rem; color: #111111; background: #FFFFFF; font-weight: 800;" placeholder="LEAVE BLANK FOR OPEN ROOM">
            </label>

            <!-- Actions buttons -->
            <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
              <button id="show-create-btn" class="btn btn-primary" style="flex: 1;">Create Room</button>
              <button id="show-join-btn" class="btn btn-secondary" style="flex: 1;">Join Room Code</button>
            </div>
          </div>
        </div>
      </div>
      
      ${statsHTML}
    </div>

    <!-- Create Room Name Dialog overlay -->
    <div id="create-dialog-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.75); z-index: 999; align-items: center; justify-content: center; padding: 1rem;">
      <div class="career-stats-widget" style="width: 100%; max-width: 420px; padding: 1.75rem; background: #FFFFFF; border: 2.5px solid #1E1E1E; box-shadow: 6px 6px 0px #1E1E1E;">
        <h3 style="color: #C89B3C; text-transform: uppercase; font-size: 1.2rem; margin-bottom: 1.25rem; font-weight: 900;">Create Room — Enter Name</h3>
        
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <label>
            <span style="display: block; font-size: 0.88rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Your Display Name:</span>
            <input type="text" id="create-player-name" style="width: 100%; border: 2px solid #1E1E1E; text-align: left; padding: 0.6rem; color: #111111; background: #FFFFFF; font-size: 0.95rem; font-weight: 800;" placeholder="e.g. Captain Player" value="${user?.displayName || ''}">
          </label>
          
          <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
            <button id="submit-create-btn" class="btn btn-primary" style="flex: 1;">Confirm & Create</button>
            <button id="cancel-create-btn" class="btn btn-secondary" style="flex: 1;">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden Join Dialog overlay -->
    <div id="join-dialog-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.75); z-index: 999; align-items: center; justify-content: center; padding: 1rem;">
      <div class="career-stats-widget" style="width: 100%; max-width: 420px; padding: 1.75rem; background: #FFFFFF; border: 2.5px solid #1E1E1E; box-shadow: 6px 6px 0px #1E1E1E;">
        <h3 style="color: #C89B3C; text-transform: uppercase; font-size: 1.2rem; margin-bottom: 1.25rem; font-weight: 900;">Join Existing Room</h3>
        
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <label>
            <span style="display: block; font-size: 0.88rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Your Display Name:</span>
            <input type="text" id="join-player-name" style="width: 100%; border: 2px solid #1E1E1E; text-align: left; padding: 0.6rem; color: #111111; background: #FFFFFF; font-size: 0.95rem; font-weight: 800;" placeholder="e.g. Player Two" value="${user?.displayName || ''}">
          </label>
          <label>
            <span style="display: block; font-size: 0.88rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Enter Room Code:</span>
            <input type="text" id="join-room-code" style="width: 100%; border: 2px solid #1E1E1E; text-align: left; padding: 0.6rem; color: #111111; background: #FFFFFF; font-size: 0.95rem; text-transform: uppercase; font-weight: 800;" placeholder="e.g. AB12XY">
          </label>
          <label>
            <span style="display: block; font-size: 0.88rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Enter Password (If required):</span>
            <input type="password" id="join-room-password" style="width: 100%; border: 2px solid #1E1E1E; text-align: left; padding: 0.6rem; color: #111111; background: #FFFFFF; font-size: 0.95rem; font-weight: 800;" placeholder="Leave blank if none">
          </label>
          <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
            <button id="submit-join-btn" class="btn btn-primary" style="flex: 1;">Confirm & Join</button>
            <button id="cancel-join-btn" class="btn btn-secondary" style="flex: 1;">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Public Rooms Waiting For Player 2 Section -->
    <section class="landing-steps mt-4" style="margin-top: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 2.5px solid #1E1E1E; padding-bottom: 0.5rem;">
        <div>
          <span class="role-badge all-rounder" style="background: #E53926; color: #FFFFFF; font-weight: 900; font-size: 0.72rem; padding: 2px 8px; border: 1px solid #1E1E1E;">LIVE LOBBIES</span>
          <h2 style="font-size: 1.5rem; margin: 0.3rem 0 0 0; font-weight: 900; color: #111111;">PUBLIC ROOMS WAITING FOR PLAYER 2</h2>
        </div>
        <span style="font-size: 0.78rem; font-weight: 800; color: #666666;">Real-time Updates</span>
      </div>

      <div id="public-rooms-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; min-height: 90px;">
        <div style="padding: 1.5rem; background: #FFFFFF; border: 2px solid #1E1E1E; text-align: center; color: #666666; font-weight: 800; box-shadow: 3px 3px 0px #1E1E1E; grid-column: 1 / -1;">
          Scanning for live waiting rooms...
        </div>
      </div>
    </section>

    <section class="landing-steps mt-4">
      <h2>Multiplayer Drafting</h2>
      <div class="steps-grid">
        <div class="step-card">
          <div class="step-num">1</div>
          <h3>Draft turns rotate</h3>
          <p>Roll squads simultaneously and draft players on active turns. Other players watch live.</p>
        </div>
        <div class="step-card">
          <div class="step-num">2</div>
          <h3>Manual placements</h3>
          <p>Place drafted players into specific zones on your pitch stadium. Designate Captain & VC.</p>
        </div>
        <div class="step-card">
          <div class="step-num">3</div>
          <h3>Synced Simulation</h3>
          <p>Once all squads lock, watch the match simulation playing highlights at the same second!</p>
        </div>
      </div>
    </section>
  `;

  // UI state toggles logic
  let activeMode = "duel";
  let activeDiff = "openBook";
  let activeTimer = 20;

  const modeBtns = container.querySelectorAll(".mode-select-btn");
  modeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      modeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeMode = btn.getAttribute("data-mode");
    });
  });

  const diffBtns = container.querySelectorAll(".diff-select-btn");
  diffBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      diffBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeDiff = btn.getAttribute("data-diff");
    });
  });

  const timerBtns = container.querySelectorAll(".timer-select-btn");
  timerBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      timerBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTimer = parseInt(btn.getAttribute("data-timer"), 10);
    });
  });

  // Create Room Dialog Triggers
  const createOverlay = container.querySelector("#create-dialog-overlay");
  const showCreateBtn = container.querySelector("#show-create-btn");
  const cancelCreateBtn = container.querySelector("#cancel-create-btn");
  const submitCreateBtn = container.querySelector("#submit-create-btn");

  if (showCreateBtn && createOverlay) {
    showCreateBtn.addEventListener("click", () => {
      createOverlay.style.display = "flex";
      const nameInput = container.querySelector("#create-player-name");
      if (nameInput) nameInput.focus();
    });
  }

  if (cancelCreateBtn && createOverlay) {
    cancelCreateBtn.addEventListener("click", () => {
      createOverlay.style.display = "none";
    });
  }

  if (submitCreateBtn) {
    submitCreateBtn.addEventListener("click", async () => {
      const nameInput = container.querySelector("#create-player-name").value.trim();
      const pwInput = container.querySelector("#room-password").value.trim();
      
      const displayName = nameInput || "Host Player";
      
      try {
        submitCreateBtn.disabled = true;
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (authErr) { console.warn("Anonymous login skipped:", authErr); }
        }
        const userUid = auth.currentUser ? auth.currentUser.uid : ("user_" + Math.random().toString(36).substring(2, 9));

        let roomCode = null;
        try {
          const createRoomFn = httpsCallable(functions, "createRoom");
          const res = await createRoomFn({
            mode: activeMode,
            difficulty: activeDiff,
            turnTimerSeconds: activeTimer,
            password: pwInput || null,
            displayName
          });
          roomCode = res.data.code;
        } catch (fnErr) {
          console.warn("Cloud function createRoom failed, performing RTDB direct room creation fallback:", fnErr);
          roomCode = generateClientRoomCode();
          const roomRef = ref(rtdb, `rooms/${roomCode}`);
          const initialRoomState = {
            hostUid: userUid,
            mode: activeMode,
            difficulty: activeDiff,
            turnTimerSeconds: activeTimer,
            password: pwInput || null,
            status: "lobby",
            createdAt: serverTimestamp(),
            players: {
              [userUid]: {
                displayName: displayName,
                joinedAt: serverTimestamp(),
                ready: true,
                connectionStatus: "online"
              }
            },
            draftState: {
              turnIndex: 0,
              activePlayerUid: "",
              currentReveal: null,
              turnDeadline: null,
              claimedPlayerIds: []
            },
            squads: {}
          };
          await set(roomRef, initialRoomState);
        }

        if (auth.currentUser && nameInput) {
          auth.currentUser.displayName = displayName;
        }

        createOverlay.style.display = "none";
        showToast("Room successfully created!");
        window.location.hash = `#/room/${roomCode}`;
      } catch (err) {
        submitCreateBtn.disabled = false;
        showToast(err.message, true);
      }
    });
  }

  // Join Room Dialog Triggers
  const joinOverlay = container.querySelector("#join-dialog-overlay");
  const showJoinBtn = container.querySelector("#show-join-btn");
  const cancelJoinBtn = container.querySelector("#cancel-join-btn");
  const submitJoinBtn = container.querySelector("#submit-join-btn");

  if (showJoinBtn && joinOverlay) {
    showJoinBtn.addEventListener("click", () => {
      joinOverlay.style.display = "flex";
      const nameInput = container.querySelector("#join-player-name");
      if (nameInput) nameInput.focus();
    });
  }

  if (cancelJoinBtn && joinOverlay) {
    cancelJoinBtn.addEventListener("click", () => {
      joinOverlay.style.display = "none";
    });
  }

  if (submitJoinBtn) {
    submitJoinBtn.addEventListener("click", async () => {
      const nameInput = container.querySelector("#join-player-name").value.trim();
      const codeInput = container.querySelector("#join-room-code").value.trim().toUpperCase();
      const pwInput = container.querySelector("#join-room-password").value.trim();
      
      if (!codeInput) {
        showToast("Please enter a room code!", true);
        return;
      }

      const displayName = nameInput || "Guest Player";

      try {
        submitJoinBtn.disabled = true;
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (authErr) { console.warn("Anonymous login skipped:", authErr); }
        }
        const userUid = auth.currentUser ? auth.currentUser.uid : ("user_" + Math.random().toString(36).substring(2, 9));

        try {
          const joinRoomFn = httpsCallable(functions, "joinRoom");
          await joinRoomFn({
            code: codeInput,
            password: pwInput || null,
            displayName
          });
        } catch (fnErr) {
          console.warn("Cloud function joinRoom failed, performing RTDB direct join fallback:", fnErr);
          const roomSnap = await get(ref(rtdb, `rooms/${codeInput}`));
          if (!roomSnap.exists()) {
            throw new Error("Room not found.");
          }
          const roomData = roomSnap.val();
          if (roomData.status !== "lobby") {
            throw new Error("Draft has already started in this room.");
          }
          if (roomData.password && roomData.password !== pwInput) {
            throw new Error("Incorrect room password.");
          }
          const playerRef = ref(rtdb, `rooms/${codeInput}/players/${userUid}`);
          await set(playerRef, {
            displayName: displayName,
            joinedAt: serverTimestamp(),
            ready: false,
            connectionStatus: "online"
          });
        }

        if (auth.currentUser && nameInput) {
          auth.currentUser.displayName = displayName;
        }

        joinOverlay.style.display = "none";
        showToast("Joined room successfully!");
        window.location.hash = `#/room/${codeInput}`;
      } catch (err) {
        submitJoinBtn.disabled = false;
        showToast(err.message, true);
      }
    });
  }

  // Real-time listener for public rooms waiting for Player 2
  const roomsRef = ref(rtdb, 'rooms');
  onValue(roomsRef, (snap) => {
    const publicContainer = container.querySelector("#public-rooms-container");
    if (!publicContainer) return;

    const allRooms = snap.val() || {};
    const openRooms = [];

    Object.keys(allRooms).forEach(code => {
      const r = allRooms[code];
      if (r && r.status === "lobby") {
        const players = r.players || {};
        const pKeys = Object.keys(players);
        const createdAt = r.createdAt || Date.now();
        const elapsed = Date.now() - createdAt;
        const TWO_MINS_MS = 120000;

        // Auto-delete 1-player rooms older than 2 minutes
        if (pKeys.length === 1 && elapsed >= TWO_MINS_MS) {
          try { remove(ref(rtdb, `rooms/${code}`)); } catch (e) {}
          return;
        }

        // Rooms with 1 player waiting for Player 2 (and no password)
        if (pKeys.length === 1 && !r.password) {
          const hostPlayer = players[pKeys[0]] || {};
          openRooms.push({
            code,
            hostName: hostPlayer.displayName || "Host Player",
            mode: r.mode || "duel",
            timerSec: r.turnTimerSeconds || 20,
            createdAt: r.createdAt || Date.now()
          });
        }
      }
    });

    if (openRooms.length === 0) {
      publicContainer.innerHTML = `
        <div style="padding: 1.5rem; background: #FFFFFF; border: 2px solid #1E1E1E; text-align: center; color: #666666; font-weight: 800; box-shadow: 3px 3px 0px #1E1E1E; grid-column: 1 / -1;">
          No open public rooms waiting right now. Click <strong>Create Room</strong> above to host one!
        </div>
      `;
      return;
    }

    publicContainer.innerHTML = openRooms.map(r => `
      <div style="background: #FFFFFF; border: 2.5px solid #1E1E1E; padding: 1.1rem; box-shadow: 4px 4px 0px #1E1E1E; border-radius: 0px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span class="role-badge all-rounder" style="background: #C89B3C; color: #111; font-weight: 900; font-size: 0.68rem; padding: 2px 6px;">${r.mode.toUpperCase()}</span>
            <span style="font-family: var(--font-family-mono); font-weight: 900; font-size: 0.9rem; color: #E53926;">#${r.code}</span>
          </div>
          <div style="font-weight: 900; font-size: 1.1rem; color: #111111; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${r.hostName}'s Room
          </div>
          <div style="font-size: 0.78rem; font-weight: 700; color: #555555; margin-bottom: 1rem;">
            1/2 Players • Waiting for Player 2
          </div>
        </div>
        <button class="btn btn-primary btn-sm join-public-room-btn" data-code="${r.code}" style="width: 100%; font-weight: 900; background: #E53926; border: 1.5px solid #1E1E1E;">
          ⚡ Join Match
        </button>
      </div>
    `).join("");

    const joinBtns = publicContainer.querySelectorAll(".join-public-room-btn");
    joinBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-code");
        window.location.hash = `#/room/${code}`;
      });
    });
  });
}
