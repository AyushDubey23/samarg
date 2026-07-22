import { auth, db, functions, rtdb } from "../firebaseInit.js";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { signInAnonymously } from "firebase/auth";
import { ref, set, get, serverTimestamp } from "firebase/database";

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
        <div class="career-stats-widget" style="padding: 1.5rem; max-width: 500px; margin-top: 1.5rem;">
          <h3 style="color: var(--willow-tan); text-transform: uppercase; font-size: 1rem; margin-bottom: 1.25rem;">
            Create Room or Join Lobby
          </h3>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- Mode Selector -->
            <div>
              <span style="display: block; font-size: 0.8rem; color: var(--chalk-white-dark); margin-bottom: 0.25rem;">Match Mode:</span>
              <div class="speed-buttons">
                <button class="speed-btn mode-select-btn active" data-mode="duel">2-Player Duel</button>
                <button class="speed-btn mode-select-btn" data-mode="cup">4-Player Cup</button>
                <button class="speed-btn mode-select-btn" data-mode="solo">Solo Campaign</button>
              </div>
            </div>

            <!-- Difficulty Selector -->
            <div>
              <span style="display: block; font-size: 0.8rem; color: var(--chalk-white-dark); margin-bottom: 0.25rem;">Draft Difficulty:</span>
              <div class="speed-buttons">
                <button class="speed-btn diff-select-btn active" data-diff="openBook">Open Book (Classic)</button>
                <button class="speed-btn diff-select-btn" data-diff="blindScout">Blind Scout (Memory)</button>
              </div>
            </div>

            <!-- Turn Timer Picker -->
            <div>
              <span style="display: block; font-size: 0.8rem; color: var(--chalk-white-dark); margin-bottom: 0.25rem;">Pick Time Limit:</span>
              <div class="speed-buttons">
                <button class="speed-btn timer-select-btn active" data-timer="20">20 Seconds</button>
                <button class="speed-btn timer-select-btn" data-timer="30">30 Seconds</button>
                <button class="speed-btn timer-select-btn" data-timer="45">45 Seconds</button>
              </div>
            </div>

            <!-- Password -->
            <label>
              <span style="display: block; font-size: 0.8rem; color: var(--chalk-white-dark); margin-bottom: 0.25rem;">Room Password (Optional):</span>
              <input type="password" id="room-password" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); text-align: left; padding: 0.5rem; color: white;" placeholder="Leave blank for open room">
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
    <div id="create-dialog-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.85); z-index: 999; align-items: center; justify-content: center; padding: 1rem;">
      <div class="career-stats-widget" style="width: 100%; max-width: 400px; padding: 1.75rem; background: var(--bg-medium); border: 1px solid var(--glass-border);">
        <h3 style="color: var(--willow-tan); text-transform: uppercase; font-size: 1.1rem; margin-bottom: 1.25rem;">Create Room — Enter Name</h3>
        
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <label>
            <span style="display: block; font-size: 0.85rem; color: var(--chalk-white-dark); margin-bottom: 0.35rem;">Your Display Name:</span>
            <input type="text" id="create-player-name" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); text-align: left; padding: 0.6rem; color: white; font-size: 0.95rem;" placeholder="e.g. Captain Player" value="${user?.displayName || ''}">
          </label>
          
          <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
            <button id="submit-create-btn" class="btn btn-primary" style="flex: 1;">Confirm & Create</button>
            <button id="cancel-create-btn" class="btn btn-secondary" style="flex: 1;">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden Join Dialog overlay -->
    <div id="join-dialog-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.85); z-index: 999; align-items: center; justify-content: center; padding: 1rem;">
      <div class="career-stats-widget" style="width: 100%; max-width: 400px; padding: 1.75rem; background: var(--bg-medium); border: 1px solid var(--glass-border);">
        <h3 style="color: var(--willow-tan); text-transform: uppercase; font-size: 1.1rem; margin-bottom: 1.25rem;">Join Existing Room</h3>
        
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <label>
            <span style="display: block; font-size: 0.85rem; color: var(--chalk-white-dark); margin-bottom: 0.35rem;">Your Display Name:</span>
            <input type="text" id="join-player-name" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); text-align: left; padding: 0.6rem; color: white; font-size: 0.95rem;" placeholder="e.g. Player Two" value="${user?.displayName || ''}">
          </label>
          <label>
            <span style="display: block; font-size: 0.85rem; color: var(--chalk-white-dark); margin-bottom: 0.35rem;">Enter Room Code:</span>
            <input type="text" id="join-room-code" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); text-align: left; padding: 0.6rem; color: white; font-size: 0.95rem; text-transform: uppercase;" placeholder="e.g. AB12XY">
          </label>
          <label>
            <span style="display: block; font-size: 0.85rem; color: var(--chalk-white-dark); margin-bottom: 0.35rem;">Enter Password (If required):</span>
            <input type="password" id="join-room-password" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); text-align: left; padding: 0.6rem; color: white; font-size: 0.95rem;" placeholder="Leave blank if none">
          </label>
          <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
            <button id="submit-join-btn" class="btn btn-primary" style="flex: 1;">Confirm & Join</button>
            <button id="cancel-join-btn" class="btn btn-secondary" style="flex: 1;">Cancel</button>
          </div>
        </div>
      </div>
    </div>

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
}
