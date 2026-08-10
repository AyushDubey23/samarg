import { auth, rtdb, db, functions } from "../firebaseInit.js";
import { ref, onValue, set, update, off, get, remove } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { validateDraftXI } from "../utils/draftRules.js";
import { signInAnonymously } from "firebase/auth";
import { BallEngine } from "../engine/ballEngine.js";
import { getRandomPoolSquad, HISTORICAL_SQUAD_POOL } from "../utils/squadPool.js";
import html2canvas from "html2canvas";

const POSITION_LABELS = [
  "TOP ORDER 1", "TOP ORDER 2", "TOP ORDER 3",
  "MIDDLE ORDER 1", "MIDDLE ORDER 2", "MIDDLE ORDER 3",
  "ALL-ROUNDER 1", "ALL-ROUNDER 2",
  "BOWLER 1", "BOWLER 2", "BOWLER 3"
];

const AUTHENTIC_FALLBACK_SQUADS = HISTORICAL_SQUAD_POOL;

export async function fetchClientRandomSquad(roomDraftState = {}) {
  const rolledSquadIds = roomDraftState.rolledSquadIds || [];
  try {
    const squad = getRandomPoolSquad(rolledSquadIds);
    if (squad && squad.players && squad.players.length > 0) {
      return squad;
    }
  } catch (e) {
    console.warn("squadPool fetch error, using fallback:", e);
  }

  return getRandomPoolSquad([]);
}

let serverOffset = 0;
let timerInterval = null;
const offsetRef = ref(rtdb, ".info/serverTimeOffset");
onValue(offsetRef, (snap) => {
  serverOffset = snap.val() || 0;
});

function getServerTime() {
  return Date.now() + serverOffset;
}

export function renderRoom(viewport, roomCode) {
  let roomRef = ref(rtdb, `rooms/${roomCode}`);
  let roomData = null;
  let currentSpectatorUid = auth.currentUser ? auth.currentUser.uid : null;

  // Render Skeleton loader
  viewport.innerHTML = `
    <div class="text-center" style="margin-top: 10vh;">
      <h2 style="font-size: 2rem;">Connecting to Room ${roomCode}...</h2>
      <p style="color: var(--chalk-white-dim); margin-top: 1rem;">Resolving real-time state machine</p>
    </div>
  `;

  // Attach presence handler (only if user is already a registered player in the room)
  if (auth.currentUser) {
    onValue(ref(rtdb, `rooms/${roomCode}/players`), (playersSnap) => {
      if (auth.currentUser) {
        const pMap = playersSnap.val() || {};
        if (pMap[auth.currentUser.uid]) {
          set(ref(rtdb, `rooms/${roomCode}/players/${auth.currentUser.uid}/connectionStatus`), "online");
        }
      }
    }, { onlyOnce: true });
  }

  // Setup main listener
  onValue(roomRef, (snap) => {
    try {
      roomData = snap.val();
      if (!roomData) {
        clearInterval(timerInterval);
        viewport.innerHTML = `
          <div class="text-center" style="margin-top: 10vh;">
            <h2 style="font-size: 2.2rem; color: var(--accent-red);">Room Expired or Not Found</h2>
            <p style="color: var(--chalk-white-dim); margin-top: 1rem;">This room lobby does not exist or has timed out.</p>
            <a href="#/" class="btn btn-primary" style="margin-top: 1.5rem;">Return Home</a>
          </div>
        `;
        return;
      }

      if (!currentSpectatorUid) {
        currentSpectatorUid = auth.currentUser ? auth.currentUser.uid : null;
      }

      const currentUid = auth.currentUser ? auth.currentUser.uid : "";
      const playersMap = roomData.players || {};
      const playerUids = Object.keys(playersMap);
      const isMember = currentUid && playerUids.includes(currentUid);
      const isHost = roomData.hostUid === currentUid;

      // 2-Minute Inactivity Auto-Deletion Check for 1-Player Lobbies
      if (roomData.status === "lobby" && playerUids.length === 1) {
        const createdAtMs = roomData.createdAt || Date.now();
        const elapsedMs = Date.now() - createdAtMs;
        const TWO_MINS_MS = 120000;

        if (elapsedMs >= TWO_MINS_MS) {
          clearInterval(timerInterval);
          if (window._roomLobbyExpiryTimer) {
            clearInterval(window._roomLobbyExpiryTimer);
            window._roomLobbyExpiryTimer = null;
          }
          if (isHost) {
            remove(ref(rtdb, `rooms/${roomCode}`));
            showToast("Room deleted due to inactivity: No player joined within 2 minutes.", true);
            window.location.hash = "#/";
          } else {
            viewport.innerHTML = `
              <div class="text-center" style="margin-top: 10vh;">
                <h2 style="font-size: 2.2rem; color: var(--accent-red);">Room Expired</h2>
                <p style="color: var(--chalk-white-dim); margin-top: 1rem;">This room timed out after waiting 2 minutes for Player 2.</p>
                <a href="#/" class="btn btn-primary" style="margin-top: 1.5rem;">Return Home</a>
              </div>
            `;
          }
          return;
        }
      }

      // Check if room is full for a non-member trying to join
      if (!isMember && (playerUids.length >= 2 || roomData.status !== "lobby")) {
        clearInterval(timerInterval);
        viewport.innerHTML = `
          <div style="min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FAF6ED; padding: 2rem 1rem; font-family: var(--font-family);">
            <div style="background: #FAF6ED; border: 3px solid #E53926; border-radius: 0px; padding: 2.5rem 2rem; max-width: 520px; width: 100%; text-align: center; box-shadow: inset 0 0 0 4px #FAF6ED, inset 0 0 0 6px #E53926; transform: rotate(-0.5deg); margin-bottom: 2rem;">
              <h1 style="color: #E53926; font-size: 1.6rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; line-height: 1.4;">
                THE ROOM IS FULL.
              </h1>
            </div>

            <a href="#/" class="btn btn-secondary" style="background: #FFFFFF; color: #111111; border: 2.5px solid #111111; font-weight: 900; font-size: 1rem; padding: 0.6rem 1.75rem; box-shadow: 3px 3px 0px #111111; border-radius: 0px; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">⤺</span> BACK
            </a>
          </div>
        `;
        return;
      }

      // Direct routing based on room status
      if (roomData.status === "lobby") {
        renderLobby(viewport, roomCode, roomData);
      } else if (roomData.status === "drafting") {
        renderDraftPhase(viewport, roomCode, roomData);
      } else if (roomData.status === "placing") {
        const participantUids = (roomData.draftState?.turnOrder && roomData.draftState.turnOrder.length > 0)
          ? roomData.draftState.turnOrder
          : Object.keys(roomData.players || {});

        const allReady = participantUids.length > 0 && participantUids.every(uid => roomData.squads?.[uid]?.ready);

        if (allReady) {
          update(ref(rtdb, `rooms/${roomCode}`), {
            status: "toss",
            tossState: {
              flipped: false,
              winnerUid: null,
              decision: null,
              flippedBy: null
            }
          });
          return;
        }

        const userUid = auth.currentUser ? auth.currentUser.uid : "";
        if (!currentSpectatorUid || currentSpectatorUid !== userUid) {
          currentSpectatorUid = userUid;
        }
        renderPlacingPhase(viewport, roomCode, roomData, currentSpectatorUid, (spectatedUid) => {
          currentSpectatorUid = spectatedUid;
        });
      } else if (roomData.status === "toss") {
        renderTossPhase(viewport, roomCode, roomData);
      } else if (roomData.status === "simulating") {
        renderSimulatingPhase(viewport, roomCode, roomData);
      }
    } catch (err) {
      console.error("Error rendering room state:", err);
      showToast("Error updating room view: " + err.message, true);
    }
  }, (error) => {
    console.error("RTDB Room Listener Error:", error);
    viewport.innerHTML = `
      <div class="text-center" style="margin-top: 10vh;">
        <h2 style="font-size: 2.2rem; color: var(--accent-red);">Connection Error</h2>
        <p style="color: var(--chalk-white-dim); margin-top: 1rem;">${error.message}</p>
        <a href="#/" class="btn btn-primary" style="margin-top: 1.5rem;">Return Home</a>
      </div>
    `;
  });
}

/**
 * 1. LOBBY VIEW RENDERING
 */
function renderLobby(viewport, roomCode, room) {
  const currentUid = auth.currentUser ? auth.currentUser.uid : "";
  const isHost = room.hostUid === currentUid;
  const players = room.players || {};
  const playerUids = Object.keys(players);
  const userJoined = !!players[currentUid];

  // Count ready players
  const readyCount = Object.values(players).filter(p => p.ready).length;
  const maxPlayers = room.mode === "duel" ? 2 : (room.mode === "cup" ? 4 : 1);
  const startEnabled = playerUids.length >= 1;

  const userDisplayName = players[currentUid]?.displayName || "";
  const needsNamePrompt = !userJoined || !userDisplayName || userDisplayName === "Guest Player" || userDisplayName === "Player" || userDisplayName.startsWith("Guest");

  viewport.innerHTML = `
    <div class="squad-review-container">
      ${playerUids.length === 1 ? `
        <div style="background: #FFF2A1; border: 2.5px solid #1E1E1E; padding: 0.65rem 1rem; margin-bottom: 1.25rem; font-weight: 900; font-size: 0.88rem; color: #111111; box-shadow: 3px 3px 0px #1E1E1E; border-radius: 0px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <span id="lobby-expiry-countdown">⏱️ Room auto-deletes in 02:00 if no player joins</span>
          <span style="font-size: 0.72rem; text-transform: uppercase; font-weight: 900; color: #FFFFFF; background: #E53926; padding: 2px 6px; border: 1px solid #1E1E1E;">2 MIN TIMEOUT</span>
        </div>
      ` : ''}

      <div class="flex justify-between align-center" style="margin-bottom: 1.5rem;">
        <div>
          <span class="role-badge all-rounder" style="font-size: 0.8rem; margin-bottom: 0.5rem;">Lobby Mode: ${room.mode.toUpperCase()}</span>
          <h1 style="font-size: 2.2rem;">Room Code: <span style="color: var(--willow-tan);">${roomCode}</span></h1>
        </div>
        <button id="copy-link-btn" class="btn btn-secondary btn-sm">Copy Share Link</button>
      </div>

      <div class="profile-grid">
        <!-- Players slot list -->
        <div>
          <h3 style="text-transform: uppercase; font-size: 1rem; color: var(--chalk-white-dim); margin-bottom: 1rem;">
            Players joined (${playerUids.length}/${maxPlayers})
          </h3>
          <div class="roster-list" id="lobby-players-list">
            ${playerUids.map(uid => {
              const p = players[uid] || {};
              const isUser = uid === currentUid;
              const connStatus = p.connectionStatus || "offline";
              return `
                <div class="roster-item" style="background: #FFFFFF; border: 2px solid #1E1E1E; border-left: 5px solid ${p.ready ? '#E53926' : '#C89B3C'}; padding: 0.75rem 1rem; margin-bottom: 0.5rem; box-shadow: 2px 2px 0px #1E1E1E; border-radius: 0px; display: flex; justify-content: space-between; align-items: center;">
                  <div class="roster-details">
                    <span class="roster-name" style="color: #111111 !important; font-weight: 900; font-size: 1.05rem;">
                      ${p.displayName || "Unknown Player"} ${isUser ? '<span class="you-tag" style="background: #C89B3C; color: #111111; padding: 1px 6px; font-size: 0.68rem; font-weight: 900; margin-left: 0.35rem; border: 1px solid #1E1E1E;">YOU</span>' : ''}
                    </span>
                    <span class="roster-sub" style="font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; gap: 0.35rem; margin-top: 0.2rem; color: #333333 !important;">
                      <span class="tab-dot" style="width: 6px; height: 6px; border-radius: 50%; background-color: ${connStatus === 'online' ? '#39d353' : '#E53926'};"></span>
                      ${connStatus.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span class="status-badge ${p.ready ? 'complete' : 'pending'}" style="background: ${p.ready ? '#277748' : '#FAF6ED'}; color: ${p.ready ? '#FFFFFF' : '#111111'}; border: 1.5px solid #1E1E1E; padding: 3px 8px; font-weight: 900; font-size: 0.72rem;">${p.ready ? 'READY' : 'WAITING'}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Inline Name Editor for User -->
          <div style="margin-top: 1.25rem; padding: 0.85rem; background: #FFFFFF; border-radius: 8px; border: 2px solid #1E1E1E; box-shadow: 2px 2px 0px #1E1E1E;">
            <label style="font-size: 0.85rem; color: #C89B3C; display: block; margin-bottom: 0.35rem; font-weight: 900;">YOUR PLAYER DISPLAY NAME:</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="inline-player-name-input" style="flex: 1; text-align: left; padding: 0.5rem 0.75rem; color: #111111; background: #FFFFFF; border: 2px solid #1E1E1E; font-size: 0.9rem; font-weight: 800;" value="${userDisplayName}" placeholder="Type your player name...">
              <button id="inline-save-name-btn" class="btn btn-accent btn-sm">Save Name</button>
            </div>
          </div>

          <div style="margin-top: 1.25rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            ${userJoined ? `
              <button id="ready-toggle-btn" class="btn ${players[currentUid]?.ready ? 'btn-secondary' : 'btn-accent'}">
                ${players[currentUid]?.ready ? "Mark Not Ready" : "Mark Ready"}
              </button>
            ` : `
              <button id="join-room-btn" class="btn btn-accent">Join Lobby</button>
            `}

            ${isHost ? `
              <button id="start-draft-btn" class="btn btn-primary" ${startEnabled ? '' : 'disabled'}>
                Start Draft
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Room setup summary details -->
        <div class="career-stats-widget" style="background: #FFFFFF; border: 2px solid #1E1E1E; box-shadow: 4px 4px 0px #1E1E1E; padding: 1.5rem; color: #111111;">
          <h3 style="text-transform: uppercase; font-size: 1.1rem; color: #C89B3C; margin-bottom: 1rem; font-weight: 900;">Match Settings</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.95rem; color: #111111; font-weight: 700;">
            <div><strong>Difficulty:</strong> ${room.difficulty === 'openBook' ? 'Open Book (Classic)' : 'Blind Scout (Almanac)'}</div>
            <div><strong>Pick Timer Limit:</strong> ${room.turnTimerSeconds} seconds</div>
            <div><strong>Requires Password:</strong> ${room.password ? 'Yes' : 'No'}</div>
            <div class="auth-upgrade-callout" style="margin-top: 1rem; background: #FAF6ED; border: 2px solid #C89B3C; padding: 0.85rem; border-radius: 6px; color: #111111;">
              <strong style="color: #C89B3C; font-size: 0.9rem; text-transform: uppercase;">Lobby Invite Info:</strong><br>
              Share Room Code <strong style="color: #E53926; font-size: 1.05rem;">${roomCode}</strong> or copy web link to invite friends. Everyone drafts live together!
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Room Join Modal Overlay for Direct Link Visitors & Name Setup -->
    <div id="room-join-modal" style="${needsNamePrompt ? 'display: flex;' : 'display: none;'} position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.75); z-index: 999; align-items: center; justify-content: center; padding: 1rem;">
      <div class="career-stats-widget" style="width: 100%; max-width: 420px; padding: 1.75rem; background: #FFFFFF; border: 2.5px solid #1E1E1E; box-shadow: 6px 6px 0px #1E1E1E;">
        <h3 style="color: #C89B3C; text-transform: uppercase; font-size: 1.2rem; margin-bottom: 1.25rem; font-weight: 900;">Enter Your Player Name</h3>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <label>
            <span style="display: block; font-size: 0.88rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Enter Your Display Name:</span>
            <input type="text" id="direct-join-player-name" style="width: 100%; border: 2px solid #1E1E1E; text-align: left; padding: 0.6rem; color: #111111; background: #FFFFFF; font-size: 0.95rem; font-weight: 800;" placeholder="Enter your name" value="${userDisplayName !== 'Guest Player' ? userDisplayName : ''}">
          </label>
          ${room.password ? `
            <label>
              <span style="display: block; font-size: 0.88rem; color: #111111; margin-bottom: 0.35rem; font-weight: 800;">Room Password:</span>
              <input type="password" id="direct-join-password" style="width: 100%; border: 2px solid #1E1E1E; text-align: left; padding: 0.6rem; color: #111111; background: #FFFFFF; font-size: 0.95rem; font-weight: 800;" placeholder="Enter room password">
            </label>
          ` : ''}
          <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
            <button id="direct-join-submit-btn" class="btn btn-primary" style="flex: 1;">Confirm & Join Lobby</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const copyBtn = document.getElementById("copy-link-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const link = `${window.location.origin}/#/room/${roomCode}`;
      const shareData = {
        title: "SAMARG Cricket Draft Room",
        text: `Join my SAMARG Cricket Draft room! Room Code: ${roomCode}`,
        url: link
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          showToast("Room link shared!");
          return;
        } catch (err) {
          if (err.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(link);
        showToast("Share link copied to clipboard!");
      } catch (err) {
        prompt("Copy this link to invite friends:", link);
      }
    });
  }

  const readyBtn = document.getElementById("ready-toggle-btn");
  if (readyBtn) {
    readyBtn.addEventListener("click", async () => {
      const currentReadyState = players[currentUid]?.ready || false;
      const refReady = ref(rtdb, `rooms/${roomCode}/players/${currentUid}/ready`);
      await set(refReady, !currentReadyState);
    });
  }

  const inlineSaveBtn = document.getElementById("inline-save-name-btn");
  if (inlineSaveBtn) {
    inlineSaveBtn.addEventListener("click", async () => {
      const nameInput = (document.getElementById("inline-player-name-input")?.value || "").trim();
      if (!nameInput) {
        showToast("Please enter a valid display name!", true);
        return;
      }
      try {
        inlineSaveBtn.disabled = true;
        const refName = ref(rtdb, `rooms/${roomCode}/players/${currentUid}/displayName`);
        await set(refName, nameInput);
        if (auth.currentUser) {
          try { auth.currentUser.displayName = nameInput; } catch (e) {}
        }
        showToast("Display name updated successfully!");
      } catch (err) {
        inlineSaveBtn.disabled = false;
        showToast(err.message, true);
      }
    });
  }

  const joinBtn = document.getElementById("join-room-btn");
  const roomJoinModal = document.getElementById("room-join-modal");
  const directJoinSubmit = document.getElementById("direct-join-submit-btn");

  if (joinBtn && roomJoinModal) {
    joinBtn.addEventListener("click", () => {
      roomJoinModal.style.display = "flex";
      const nameIn = document.getElementById("direct-join-player-name");
      if (nameIn) nameIn.focus();
    });
  }

  if (directJoinSubmit) {
    directJoinSubmit.addEventListener("click", async () => {
      const nameInput = (document.getElementById("direct-join-player-name")?.value || "").trim();
      const pwInput = room.password ? (document.getElementById("direct-join-password")?.value || "").trim() : null;

      if (room.password && pwInput !== room.password) {
        showToast("Incorrect room password!", true);
        return;
      }

      const displayName = nameInput || "Guest Player";

      try {
        directJoinSubmit.disabled = true;
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (authErr) { console.warn(authErr); }
        }
        const userUid = auth.currentUser ? auth.currentUser.uid : ("user_" + Math.random().toString(36).substring(2, 9));

        try {
          const joinRoomFn = httpsCallable(functions, "joinRoom");
          await joinRoomFn({ code: roomCode, password: pwInput, displayName });
        } catch (fnErr) {
          console.warn("Cloud function joinRoom failed, performing RTDB direct join fallback:", fnErr);
          const playerRef = ref(rtdb, `rooms/${roomCode}/players/${userUid}`);
          await set(playerRef, {
            displayName: displayName,
            joinedAt: Date.now(),
            ready: false,
            connectionStatus: "online"
          });
        }

        if (auth.currentUser && nameInput) {
          auth.currentUser.displayName = displayName;
        }

        if (roomJoinModal) roomJoinModal.style.display = "none";
        showToast("Successfully joined lobby!");
      } catch (err) {
        directJoinSubmit.disabled = false;
        showToast(err.message, true);
      }
    });
  }

  const startBtn = document.getElementById("start-draft-btn");
  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      try {
        startBtn.disabled = true;
        try {
          const startDraftFn = httpsCallable(functions, "startDraft");
          await startDraftFn({ code: roomCode });
        } catch (fnErr) {
          console.warn("Cloud function startDraft failed, performing RTDB direct start fallback:", fnErr);
          const currentPlayersMap = room.players || {};
          let uids = Object.keys(currentPlayersMap);

          // If solo player starting, add AI Opponent CPU to guarantee a 2-team draft!
          if (uids.length === 1) {
            const botUid = "cpu_opponent";
            uids.push(botUid);
            await set(ref(rtdb, `rooms/${roomCode}/players/${botUid}`), {
              displayName: "AI Opponent (CPU)",
              ready: true,
              connectionStatus: "online",
              isBot: true
            });
          }

          const shuffledUids = [...uids].sort(() => Math.random() - 0.5);
          const squads = {};
          shuffledUids.forEach(uid => {
            squads[uid] = {
              ready: false,
              slots: Array(11).fill(null),
              bench: [],
              rerollsLeft: 2,
              yearRerollsLeft: 1
            };
          });
          const turnTimerSec = room.turnTimerSeconds || 20;
          await update(ref(rtdb, `rooms/${roomCode}`), {
            status: "drafting",
            squads,
            draftState: {
              turnOrder: shuffledUids,
              turnIndex: 0,
              activePlayerUid: shuffledUids[0],
              currentReveal: null,
              turnDeadline: Date.now() + turnTimerSec * 1000,
              claimedPlayerIds: [],
              claimedPlayerNames: []
            }
          });
        }
        showToast("Draft successfully initialized!");
      } catch (err) {
        startBtn.disabled = false;
        showToast(err.message, true);
      }
    });
  }

  // 2-Minute Expiry Countdown Timer for 1-player lobby
  if (room.status === "lobby" && playerUids.length === 1) {
    const createdAtMs = room.createdAt || Date.now();
    const TWO_MINS_MS = 120000;
    
    if (window._roomLobbyExpiryTimer) clearInterval(window._roomLobbyExpiryTimer);

    const updateTimerUI = () => {
      const elapsed = Date.now() - createdAtMs;
      const remMs = TWO_MINS_MS - elapsed;
      const timerBadge = document.getElementById("lobby-expiry-countdown");

      if (remMs <= 0) {
        clearInterval(window._roomLobbyExpiryTimer);
        window._roomLobbyExpiryTimer = null;
        if (isHost) {
          remove(ref(rtdb, `rooms/${roomCode}`));
          showToast("Room deleted due to inactivity: No player joined within 2 minutes.", true);
          window.location.hash = "#/";
        }
        return;
      }

      if (timerBadge) {
        const mins = Math.floor(remMs / 60000);
        const secs = Math.floor((remMs % 60000) / 1000);
        timerBadge.innerText = `⏱️ Room auto-deletes in ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} if no player joins`;
      }
    };

    updateTimerUI();
    window._roomLobbyExpiryTimer = setInterval(updateTimerUI, 1000);
  } else {
    if (window._roomLobbyExpiryTimer) {
      clearInterval(window._roomLobbyExpiryTimer);
      window._roomLobbyExpiryTimer = null;
    }
  }
}

function playWhistleSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(2800, ctx.currentTime);
    osc2.frequency.setValueAtTime(3200, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.28);
    osc2.stop(ctx.currentTime + 0.28);
  } catch (err) {
    console.warn("Whistle sound error:", err);
  }
}

/**
 * 2. LIVE DRAFT PHASE VIEW
 */
let slotAnimationTimer = null;
let selectedDraftPlayerId = null;
let draftSpectatedUid = null;
let lastTurnActiveUid = null;
let lastSignaledTurnUid = null;

function renderDraftPhase(viewport, roomCode, room) {
  const currentUid = auth.currentUser ? auth.currentUser.uid : "";
  const draftState = room.draftState || {};
  const activeUid = draftState.activePlayerUid;
  const activePlayer = (room.players || {})[activeUid];
  const isActiveTurn = activeUid === currentUid;
  const reveal = draftState.currentReveal;
  const userSquadData = (room.squads || {})[currentUid] || {};
  const rerollsLeft = userSquadData.rerollsLeft !== undefined ? userSquadData.rerollsLeft : 2;
  const yearRerollsLeft = userSquadData.yearRerollsLeft !== undefined ? userSquadData.yearRerollsLeft : 1;

  // Automatic CPU turn handler for solo rooms
  const activePlayerObj = (room.players || {})[activeUid] || {};
  if (activePlayerObj.isBot || activeUid === "cpu_opponent") {
    const isHost = room.hostUid === currentUid || Object.keys(room.players || {})[0] === currentUid;
    if (isHost && !window.cpuTurnTimeout) {
      window.cpuTurnTimeout = setTimeout(async () => {
        window.cpuTurnTimeout = null;
        try {
          let currentRevealData = reveal;
          if (!currentRevealData) {
            const rolledSquad = await fetchClientRandomSquad(draftState);
            const squadId = rolledSquad.squadId || `${rolledSquad.nationalTeam}_${rolledSquad.tournamentYear}`;
            currentRevealData = {
              squadId,
              nationalTeam: rolledSquad.nationalTeam,
              tournamentYear: rolledSquad.tournamentYear,
              players: rolledSquad.players,
              rolledAt: Date.now(),
              rolledBy: activeUid
            };
          }

          const claimedIds = draftState.claimedPlayerIds || [];
          const claimedNames = (draftState.claimedPlayerNames || []).map(n => String(n).toLowerCase().trim());
          const availablePlayers = ensureArray(currentRevealData.players).filter(p => {
            const pNameNorm = String(p.name || '').toLowerCase().trim();
            const isClaimedById = claimedIds.includes(p.id);
            const isClaimedByName = claimedNames.some(cn => pNameNorm === cn || pNameNorm.includes(cn) || cn.includes(pNameNorm));
            return !isClaimedById && !isClaimedByName;
          });

          if (availablePlayers.length > 0) {
            const randomPick = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
            const botSquad = (room.squads || {})[activeUid] || { slots: Array(11).fill(null), bench: [] };
            const currentSlots = [...getFilledSlotsArray(botSquad.slots)];
            const currentBench = [...ensureArray(botSquad.bench)];

            const emptyIndices = [];
            for (let i = 0; i < 11; i++) {
              if (currentSlots[i] === null) emptyIndices.push(i);
            }

            if (emptyIndices.length > 0) {
              const randSlotIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
              currentSlots[randSlotIdx] = randomPick;
            } else {
              currentBench.push(randomPick);
            }

            const turnOrder = draftState.turnOrder || [];
            const currentTurnIndex = draftState.turnIndex || 0;
            const nextTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
            const nextActiveUid = turnOrder[nextTurnIndex];
            const targetNameNorm = String(randomPick.name || '').toLowerCase().trim();
            const updatedClaimedIds = [...ensureArray(claimedIds), randomPick.id];
            const updatedClaimedNames = [...ensureArray(claimedNames), targetNameNorm];

            const updates = {};
            updates[`rooms/${roomCode}/squads/${activeUid}/slots`] = currentSlots;
            updates[`rooms/${roomCode}/squads/${activeUid}/bench`] = currentBench;
            updates[`rooms/${roomCode}/draftState/claimedPlayerIds`] = updatedClaimedIds;
            updates[`rooms/${roomCode}/draftState/claimedPlayerNames`] = updatedClaimedNames;
            updates[`rooms/${roomCode}/draftState/turnIndex`] = nextTurnIndex;
            updates[`rooms/${roomCode}/draftState/activePlayerUid`] = nextActiveUid;
            updates[`rooms/${roomCode}/draftState/currentReveal`] = null;
            updates[`rooms/${roomCode}/draftState/turnDeadline`] = Date.now() + (room.turnTimerSeconds || 20) * 1000;

            let allComplete = true;
            turnOrder.forEach(uid => {
              const sq = (room.squads || {})[uid] || { slots: Array(11).fill(null), bench: [] };
              const sqSlots = getFilledSlotsArray((uid === activeUid) ? currentSlots : sq.slots);
              const sqBench = ensureArray((uid === activeUid) ? currentBench : sq.bench);
              const count = sqBench.length + sqSlots.filter(s => s !== null).length;
              if (count < 11) allComplete = false;
            });

            if (allComplete) {
              updates[`rooms/${roomCode}/status`] = "placing";
            }

            await update(ref(rtdb), updates);
          }
        } catch (botErr) {
          console.warn("CPU turn execution error:", botErr);
        }
      }, 1000);
    }
  }

  // Play short whistle sound when it becomes your turn to roll/pick
  if (isActiveTurn && lastSignaledTurnUid !== currentUid) {
    lastSignaledTurnUid = currentUid;
    playWhistleSound();
  }

  // Auto-switch spectated view to active turn player when turn changes
  if (activeUid !== lastTurnActiveUid) {
    lastTurnActiveUid = activeUid;
    draftSpectatedUid = activeUid;
  }
  if (!draftSpectatedUid) {
    draftSpectatedUid = activeUid || currentUid;
  }

  // Player 1 (User) and Player 2 (Opponent) identification
  const playersMap = room.players || {};
  const participantUids = (draftState.turnOrder && draftState.turnOrder.length > 0)
    ? draftState.turnOrder
    : Object.keys(playersMap);

  const p1Uid = currentUid;
  const p2Uid = participantUids.find(id => id !== currentUid) || (participantUids.length > 1 ? participantUids[1] : participantUids[0]);

  const p1Obj = playersMap[p1Uid] || {};
  const p2Obj = playersMap[p2Uid] || {};

  const p1Name = (p1Obj.displayName || auth.currentUser?.displayName || "YOU").toUpperCase();
  const p2Name = (p2Obj.displayName || "OPPONENT").toUpperCase();

  const p1Squad = room.squads?.[p1Uid] || { slots: Array(11).fill(null), bench: [] };
  const p2Squad = room.squads?.[p2Uid] || { slots: Array(11).fill(null), bench: [] };

  const p1Count = getFilledSlotsArray(p1Squad.slots).filter(s => s !== null).length + (p1Squad.bench ? p1Squad.bench.length : 0);
  const p2Count = getFilledSlotsArray(p2Squad.slots).filter(s => s !== null).length + (p2Squad.bench ? p2Squad.bench.length : 0);

  // Spectated player squad
  const isViewingOpponent = draftSpectatedUid !== currentUid;
  const spectatedSquad = room.squads?.[draftSpectatedUid] || { slots: Array(11).fill(null), bench: [] };
  const spectatedSlots = getFilledSlotsArray(spectatedSquad.slots);

  // Clear previous animations if reveal is null
  if (!reveal && slotAnimationTimer) {
    clearInterval(slotAnimationTimer);
    slotAnimationTimer = null;
  }

  viewport.innerHTML = `
    <div class="squad-review-container">
      <!-- LIVE LINEUPS Header Bar -->
      <div style="background: #fdfbf7; border: 2px solid #111; border-radius: 0px; padding: 0.75rem 1.25rem; margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="font-size: 0.72rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #777; margin-bottom: 0.4rem;">
          LIVE LINEUPS
        </div>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <!-- Player 1 Box -->
          <div style="flex: 1; min-width: 200px; padding: 0.75rem 1rem; background: ${activeUid === p1Uid ? '#e8f5e9' : '#fff'}; border: 2px solid ${activeUid === p1Uid ? '#2e7d32' : '#ccc'}; border-radius: 0px; position: relative;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${activeUid === p1Uid ? '<span style="background: #d32f2f; color: white; padding: 2px 6px; border-radius: 0px; font-size: 0.65rem; font-weight: 900;">YOUR TURN</span>' : ''}
                <span style="font-weight: 900; font-size: 1.05rem; color: #111;">${p1Name} (YOU)</span>
              </div>
              <span style="font-family: var(--font-family-mono); font-weight: 800; font-size: 1.1rem; color: #111;">${p1Count}/11</span>
            </div>
          </div>

          <!-- Player 2 Box -->
          <div style="flex: 1; min-width: 200px; padding: 0.75rem 1rem; background: ${activeUid === p2Uid ? '#ffebee' : '#fff'}; border: 2px solid ${activeUid === p2Uid ? '#d32f2f' : '#ccc'}; border-radius: 0px; position: relative;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${activeUid === p2Uid ? '<span style="background: #d32f2f; color: white; padding: 2px 6px; border-radius: 0px; font-size: 0.65rem; font-weight: 900;">ON THE CLOCK</span>' : ''}
                <span style="font-weight: 900; font-size: 1.05rem; color: #111;">${p2Name}</span>
                ${activeUid === p2Uid ? '<span style="font-size: 0.75rem; color: #d32f2f;">choosing...</span>' : ''}
              </div>
              <div style="text-align: right;">
                <span id="draft-countdown-sec" style="font-family: var(--font-family-mono); font-weight: 900; font-size: 1.3rem; color: #d32f2f; margin-right: 0.75rem;">20s</span>
                <span style="font-family: var(--font-family-mono); font-weight: 800; font-size: 1.1rem; color: #111;">${p2Count}/11</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- View Switcher Tabs -->
      <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; justify-content: flex-start;">
        <button id="view-tab-opponent" class="btn btn-sm ${isViewingOpponent ? 'btn-accent' : 'btn-secondary'}" style="font-weight: 800;">
          Watch ${p2Name.split(" ")[0]}
        </button>
        <button id="view-tab-self" class="btn btn-sm ${!isViewingOpponent ? 'btn-accent' : 'btn-secondary'}" style="font-weight: 800;">
          My team ${p1Count}/11
        </button>
      </div>

      <div class="match-mid-layout draft-phase-container">
        <!-- Draft board controls (Roll / Reveals) -->
        <div class="graph-card" style="display: flex; flex-direction: column; justify-content: center; min-height: 350px;">
          ${!reveal ? `
            <div class="text-center" style="padding: 2rem;">
              <div id="slot-machine-display" class="tv-scoreboard" style="margin-bottom: 2rem; font-size: 1.5rem; text-transform: uppercase; font-weight: 800; padding: 1.5rem; border-color: var(--willow-tan);">
                ${isActiveTurn ? 'ROLL NEXT SQUAD' : 'WAITING FOR ROLL'}
              </div>
              <button id="roll-squad-btn" class="btn btn-accent btn-lg" ${isActiveTurn ? '' : 'disabled'}>
                ${isActiveTurn ? 'Roll Squad' : 'Waiting for Roll...'}
              </button>
            </div>
          ` : `
            <div>
              <div style="background: #fdfbf7; color: #111; padding: 1.15rem; border-radius: 0px; border: 2px solid #e0d8c8; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="font-size: 0.7rem; text-transform: uppercase; color: #888; font-weight: 800; letter-spacing: 1px;">DRAWN</div>
                <h2 style="font-size: 1.8rem; margin: 0.2rem 0; font-weight: 900; color: #111;">
                  <span style="color: #d32f2f;">${reveal.nationalTeam}</span>
                </h2>
                <div style="font-size: 1.15rem; font-weight: 800; color: #d32f2f; font-family: var(--font-family-mono);">
                  Tournament ${reveal.tournamentYear}
                </div>
              </div>

              <div style="margin-top: 1rem; background: #fdfbf7; border: 2px solid #e0d8c8; border-radius: 0px; padding: 0.75rem;">
                <div class="flex justify-between align-center" style="margin-bottom: 0.5rem;">
                  <div style="font-size: 0.75rem; font-weight: 900; color: #777; text-transform: uppercase; letter-spacing: 1px;">
                    PICK A PLAYER
                  </div>
                  ${isActiveTurn ? `
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                      <button id="reroll-squad-btn" class="btn btn-secondary btn-sm" style="font-weight: 900; font-size: 0.75rem; padding: 4px 10px;" ${rerollsLeft > 0 ? '' : 'disabled'}>
                        🎲 Roll Another Squad (${rerollsLeft} Left)
                      </button>
                      <button id="reroll-year-btn" class="btn btn-accent btn-sm" style="font-weight: 900; font-size: 0.75rem; padding: 4px 10px; background: #C89B3C; color: #111; border: 1.5px solid #1E1E1E;" ${yearRerollsLeft > 0 ? '' : 'disabled'}>
                        📅 Same Team Diff Year (${yearRerollsLeft} Left)
                      </button>
                    </div>
                  ` : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 380px; overflow-y: auto;" id="rolled-players-grid">
                  ${(() => {
                    const allClaimedIds = new Set(ensureArray(draftState.claimedPlayerIds));
                    const allClaimedNames = new Set((draftState.claimedPlayerNames || []).map(n => String(n).toLowerCase().trim()));

                    Object.values(room.squads || {}).forEach(sq => {
                      const slots = getFilledSlotsArray(sq.slots || []);
                      const bench = ensureArray(sq.bench || []);
                      [...slots, ...bench].forEach(p => {
                        if (p) {
                          if (p.id) allClaimedIds.add(p.id);
                          if (p.name) allClaimedNames.add(String(p.name).toLowerCase().trim());
                        }
                      });
                    });

                    return reveal.players.map((p, idx) => {
                      const pNameNorm = String(p.name || '').toLowerCase().trim();
                      const isClaimedById = allClaimedIds.has(p.id);
                      const isClaimedByName = allClaimedNames.has(pNameNorm) || [...allClaimedNames].some(cn => cn === pNameNorm || (cn.length > 4 && (pNameNorm.includes(cn) || cn.includes(pNameNorm))));
                      const isClaimed = isClaimedById || isClaimedByName;
                      const isSelected = selectedDraftPlayerId === p.id;
                      return `
                        <div class="draft-card-item ${isClaimed ? 'claimed-dim' : ''} ${isSelected ? 'selected-coral' : ''}" 
                             data-player-id="${p.id}" 
                             style="display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.75rem; background: ${isSelected ? 'var(--primary-coral)' : (isClaimed ? '#E5E0D5' : '#FFFFFF')}; color: ${isSelected ? '#FFFFFF' : '#111111'}; border: ${isSelected ? '2px solid #1E1E1E' : '1.5px solid #D8D0C0'}; border-radius: 0px; cursor: ${isClaimed || !isActiveTurn ? 'not-allowed' : 'pointer'}; opacity: ${isClaimed ? 0.6 : 1.0};">
                          <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                            <span style="font-family: var(--font-family-mono); font-weight: 900; font-size: 0.82rem; min-width: 24px;">#${idx + 1}</span>
                            <div style="font-weight: 800; font-size: 0.85rem;">${p.name}</div>
                          </div>
                          <div style="display: flex; gap: 0.35rem; align-items: center;">
                            <span style="font-size: 0.72rem; background: ${isSelected ? '#FFFFFF' : '#E53926'}; color: ${isSelected ? '#E53926' : '#FFFFFF'}; font-weight: 900; padding: 2px 5px; border: 1px solid #1E1E1E;">BAT ${p.batRating || 75}</span>
                            <span style="font-size: 0.72rem; background: ${isSelected ? '#FFFFFF' : '#1E88E5'}; color: ${isSelected ? '#1E88E5' : '#FFFFFF'}; font-weight: 900; padding: 2px 5px; border: 1px solid #1E1E1E;">BOWL ${p.bowlRating || 0}</span>
                          </div>
                          ${isClaimed ? `<div style="font-size: 0.62rem; font-weight: 900; margin-left: 0.35rem; color: #D32F2F;">TAKEN</div>` : ''}
                        </div>
                      `;
                    }).join("");
                  })()}
                </div>
              </div>
            </div>
          `}
        </div>

        <!-- Room activity log & Side-by-side Field Setup canvas -->
        <div class="controls-card" style="background: #FFFFFF; border: 2px solid #1E1E1E; border-radius: 12px; padding: 1rem; box-shadow: 3px 3px 0px #1E1E1E;">
          <div class="flex justify-between align-center" style="border-bottom: 2px solid #1E1E1E; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
            <h4 style="text-transform: uppercase; font-size: 0.95rem; margin: 0; color: #111; font-weight: 900;">FIELD SETUP (${isViewingOpponent ? p2Name : 'MY TEAM'})</h4>
            <span class="role-badge all-rounder" style="font-size: 0.75rem; background: #C89B3C; color: #111; font-weight: 900; border: 1px solid #1E1E1E;">${spectatedSlots.filter(s => s !== null).length}/11 PLACED</span>
          </div>

          <!-- STADIUM PITCH GRAPHIC SIDE-BY-SIDE -->
          <div class="pitch-stadium" style="padding: 0.75rem; margin-bottom: 1rem; min-height: 280px;">
            <div class="pitch-center-lane"></div>
            ${[
              { name: "3 Top Order", indices: [0, 1, 2] },
              { name: "3 Middle Order", indices: [3, 4, 5] },
              { name: "2 All-Rounder", indices: [6, 7] },
              { name: "3 Bowlers", indices: [8, 9, 10] }
            ].map(zone => `
              <div class="pitch-zone" style="margin-bottom: 0.5rem;">
                <div class="pitch-zone-header">${zone.name}</div>
                <div class="pitch-grid-row">
                  ${zone.indices.map(idx => {
                    const p = spectatedSlots[idx];
                    const isTargetPulse = selectedDraftPlayerId && !p && !isViewingOpponent;
                    return `
                      <div class="pitch-player-slot ${p ? 'filled' : 'empty'} ${isTargetPulse ? 'target-pulse' : ''}" data-slot-index="${idx}">
                        <div class="player-avatar-circle">
                          ${p ? (p.batRating || 75) : (idx + 1)}
                        </div>
                        <div class="player-name-plate">
                          ${p ? p.name.split(" ").slice(-1)[0].toUpperCase() : POSITION_LABELS[idx]}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Turn Order Roster Status -->
          <h5 style="font-size: 0.8rem; text-transform: uppercase; color: #111; margin-bottom: 0.5rem; font-weight: 900;">DRAFT ROSTER STATUS</h5>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${(draftState.turnOrder || []).map(uid => {
              const p = (room.players || {})[uid] || {};
              const sq = (room.squads || {})[uid] || {};
              const pBench = ensureArray(sq.bench);
              const pSlots = getFilledSlotsArray(sq.slots);
              const claimedCount = pBench.length + pSlots.filter(s => s !== null).length;
              return `
                <div class="flex justify-between align-center" style="padding: 0.45rem 0.65rem; background: #FAF6ED; border: 1px solid #1E1E1E; border-radius: 6px; font-size: 0.8rem;">
                  <span style="font-weight: ${uid === draftState.activePlayerUid ? '900' : '700'}; color: ${uid === draftState.activePlayerUid ? 'var(--primary-coral)' : '#111111'};">
                    ${uid === draftState.activePlayerUid ? '● ' : ''}${p.displayName || "Player"}
                  </span>
                  <span class="role-badge" style="font-size: 0.68rem; background: #111; color: #fff; font-weight: 800;">${claimedCount}/11 Claimed</span>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="auth-upgrade-callout" style="margin-top: 1rem; font-size: 0.78rem; padding: 0.5rem 0.75rem; background: #FFFDE7; border: 1px solid #C89B3C; color: #111;">
            <strong>Spot Placement:</strong>
            Tap a player on the list, then tap ANY empty spot on the pitch setup to place them right there!
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach roll button handler
  const rollBtn = document.getElementById("roll-squad-btn");
  if (rollBtn && isActiveTurn) {
    rollBtn.addEventListener("click", async () => {
      try {
        rollBtn.disabled = true;
        const rolledSquad = await fetchClientRandomSquad(draftState);
        const targetTeamLabel = `${rolledSquad.nationalTeam} (${rolledSquad.tournamentYear})`;
        startSlotMachineAnimation(targetTeamLabel);

        const turnTimerSec = room.turnTimerSeconds || 20;
        const squadId = rolledSquad.squadId || `${rolledSquad.nationalTeam}_${rolledSquad.tournamentYear}`;
        const currentRolledIds = Array.isArray(draftState.rolledSquadIds) ? draftState.rolledSquadIds : [];
        const updatedRolledIds = [...currentRolledIds, squadId];

        setTimeout(async () => {
          try {
            await update(ref(rtdb, `rooms/${roomCode}/draftState`), {
              turnDeadline: Date.now() + turnTimerSec * 1000,
              rolledSquadIds: updatedRolledIds,
              currentReveal: {
                squadId,
                nationalTeam: rolledSquad.nationalTeam,
                tournamentYear: rolledSquad.tournamentYear,
                players: rolledSquad.players,
                rolledAt: Date.now(),
                rolledBy: currentUid
              }
            });
          } catch (updateErr) {
            showToast(updateErr.message, true);
          }
        }, 900);
      } catch (err) {
        rollBtn.disabled = false;
        if (slotAnimationTimer) {
          clearInterval(slotAnimationTimer);
          slotAnimationTimer = null;
        }
        const textEl = document.getElementById("slot-machine-display");
        if (textEl) textEl.innerText = "ROLL NEXT SQUAD";
        showToast(err.message, true);
      }
    });
  }

  // Attach Reroll Squad button handler (2 chances for another random squad)
  const rerollBtn = document.getElementById("reroll-squad-btn");
  if (rerollBtn && isActiveTurn) {
    rerollBtn.addEventListener("click", async () => {
      if (rerollsLeft <= 0) {
        showToast("You have already used your 2 squad rerolls!", true);
        return;
      }
      try {
        rerollBtn.disabled = true;
        const rolledSquad = await fetchClientRandomSquad(draftState);
        const targetTeamLabel = `${rolledSquad.nationalTeam} (${rolledSquad.tournamentYear})`;
        startSlotMachineAnimation(targetTeamLabel);

        const turnTimerSec = room.turnTimerSeconds || 20;
        const squadId = rolledSquad.squadId || `${rolledSquad.nationalTeam}_${rolledSquad.tournamentYear}`;
        const currentRolledIds = Array.isArray(draftState.rolledSquadIds) ? draftState.rolledSquadIds : [];
        const updatedRolledIds = [...currentRolledIds, squadId];

        setTimeout(async () => {
          try {
            const updates = {};
            updates[`rooms/${roomCode}/draftState/turnDeadline`] = Date.now() + turnTimerSec * 1000;
            updates[`rooms/${roomCode}/draftState/rolledSquadIds`] = updatedRolledIds;
            updates[`rooms/${roomCode}/draftState/currentReveal`] = {
              squadId,
              nationalTeam: rolledSquad.nationalTeam,
              tournamentYear: rolledSquad.tournamentYear,
              players: rolledSquad.players,
              rolledAt: Date.now(),
              rolledBy: currentUid
            };
            updates[`rooms/${roomCode}/squads/${currentUid}/rerollsLeft`] = rerollsLeft - 1;

            await update(ref(rtdb), updates);
            showToast("🎲 Squad Rerolled! Select your player.");
          } catch (updateErr) {
            showToast(updateErr.message, true);
          }
        }, 900);
      } catch (err) {
        if (rerollBtn) rerollBtn.disabled = false;
        showToast(err.message, true);
      }
    });
  }

  // Attach Reroll Same Team Different Year button handler (1 chance)
  const rerollYearBtn = document.getElementById("reroll-year-btn");
  if (rerollYearBtn && isActiveTurn) {
    rerollYearBtn.addEventListener("click", async () => {
      if (yearRerollsLeft <= 0) {
        showToast("You have already used your 1 same-team year reroll!", true);
        return;
      }
      if (!reveal || !reveal.nationalTeam) {
        showToast("No active squad reveal to reroll year for!", true);
        return;
      }

      try {
        rerollYearBtn.disabled = true;
        const sameTeamName = reveal.nationalTeam;
        const currentYear = reveal.tournamentYear;

        // Find all squads for the same national team in HISTORICAL_SQUAD_POOL with different year
        const sameTeamSquads = HISTORICAL_SQUAD_POOL.filter(s => 
          s.nationalTeam.toLowerCase().trim() === sameTeamName.toLowerCase().trim() &&
          String(s.tournamentYear) !== String(currentYear)
        );

        if (sameTeamSquads.length === 0) {
          showToast(`No other tournament editions found for ${sameTeamName}!`, true);
          rerollYearBtn.disabled = false;
          return;
        }

        // Pick a random squad from different years
        const rolledSquad = sameTeamSquads[Math.floor(Math.random() * sameTeamSquads.length)];
        const targetTeamLabel = `${rolledSquad.nationalTeam} (${rolledSquad.tournamentYear})`;
        startSlotMachineAnimation(targetTeamLabel);

        const turnTimerSec = room.turnTimerSeconds || 20;
        const squadId = rolledSquad.squadId || `${rolledSquad.nationalTeam}_${rolledSquad.tournamentYear}`;
        const currentRolledIds = Array.isArray(draftState.rolledSquadIds) ? draftState.rolledSquadIds : [];
        const updatedRolledIds = [...currentRolledIds, squadId];

        setTimeout(async () => {
          try {
            const updates = {};
            updates[`rooms/${roomCode}/draftState/turnDeadline`] = Date.now() + turnTimerSec * 1000;
            updates[`rooms/${roomCode}/draftState/rolledSquadIds`] = updatedRolledIds;
            updates[`rooms/${roomCode}/draftState/currentReveal`] = {
              squadId,
              nationalTeam: rolledSquad.nationalTeam,
              tournamentYear: rolledSquad.tournamentYear,
              players: rolledSquad.players,
              rolledAt: Date.now(),
              rolledBy: currentUid
            };
            updates[`rooms/${roomCode}/squads/${currentUid}/yearRerollsLeft`] = yearRerollsLeft - 1;

            await update(ref(rtdb), updates);
            showToast(`📅 Rerolled ${sameTeamName} to ${rolledSquad.tournamentYear}! Select your player.`);
          } catch (updateErr) {
            showToast(updateErr.message, true);
          }
        }, 900);
      } catch (err) {
        if (rerollYearBtn) rerollYearBtn.disabled = false;
        showToast(err.message, true);
      }
    });
  }

  // Attach card claim handler with spot selection
  if (reveal && isActiveTurn) {
    const cards = document.querySelectorAll(".draft-card-item");
    cards.forEach(card => {
      card.addEventListener("click", async () => {
        const playerId = card.getAttribute("data-player-id");
        const claimedIds = draftState.claimedPlayerIds || [];
        const claimedNames = (draftState.claimedPlayerNames || []).map(n => String(n).toLowerCase().trim());
        const targetP = (reveal.players || []).find(p => String(p.id) === String(playerId));

        const pNameNorm = String(targetP?.name || '').toLowerCase().trim();
        const isClaimedById = claimedIds.includes(playerId);
        const isClaimedByName = targetP && claimedNames.some(cn => pNameNorm === cn || pNameNorm.includes(cn) || cn.includes(pNameNorm));

        if (isClaimedById || isClaimedByName) {
          showToast(`This player (${targetP ? targetP.name : 'Player'}) has already been drafted from another tournament year!`, true);
          return;
        }

        if (selectedDraftPlayerId === playerId) {
          selectedDraftPlayerId = null;
          renderDraftPhase(viewport, roomCode, room);
          return;
        }

        selectedDraftPlayerId = playerId;
        renderDraftPhase(viewport, roomCode, room);
      });
    });

    // Pitch slot click listeners to place selected player in THAT EXACT SPOT
    const slotElements = document.querySelectorAll(".pitch-player-slot");
    slotElements.forEach(slotEl => {
      slotEl.addEventListener("click", async () => {
        const slotIdx = parseInt(slotEl.getAttribute("data-slot-index"), 10);
        const userSquad = (room.squads || {})[currentUid] || { slots: Array(11).fill(null), bench: [] };
        const userSlots = getFilledSlotsArray(userSquad.slots);
        let updatedBench = [...ensureArray(userSquad.bench)];
        const updatedSlots = [...userSlots];

        if (updatedSlots[slotIdx] !== null) {
          showToast("This slot is already filled!", true);
          return;
        }

        if (!selectedDraftPlayerId) {
          showToast("Select a player from the list first!", true);
          return;
        }

        const targetPlayer = (reveal.players || []).find(p => String(p.id) === String(selectedDraftPlayerId));
        if (!targetPlayer) return;

        updatedSlots[slotIdx] = targetPlayer;
        selectedDraftPlayerId = null;

        const turnOrder = draftState.turnOrder || [];
        const currentTurnIndex = draftState.turnIndex || 0;
        const nextTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
        const nextActiveUid = turnOrder[nextTurnIndex];
        const targetNameNorm = String(targetPlayer.name || '').toLowerCase().trim();
        const updatedClaimedIds = [...ensureArray(draftState.claimedPlayerIds), targetPlayer.id];
        const updatedClaimedNames = [...ensureArray(draftState.claimedPlayerNames), targetNameNorm];

        const updates = {};
        updates[`rooms/${roomCode}/squads/${currentUid}/slots`] = updatedSlots;
        updates[`rooms/${roomCode}/squads/${currentUid}/bench`] = updatedBench;
        updates[`rooms/${roomCode}/draftState/claimedPlayerIds`] = updatedClaimedIds;
        updates[`rooms/${roomCode}/draftState/claimedPlayerNames`] = updatedClaimedNames;
        updates[`rooms/${roomCode}/draftState/turnIndex`] = nextTurnIndex;
        updates[`rooms/${roomCode}/draftState/activePlayerUid`] = nextActiveUid;
        updates[`rooms/${roomCode}/draftState/currentReveal`] = null;
        updates[`rooms/${roomCode}/draftState/turnDeadline`] = null;

        let allComplete = true;
        turnOrder.forEach(uid => {
          const sq = (room.squads || {})[uid] || { slots: Array(11).fill(null), bench: [] };
          const sqSlots = getFilledSlotsArray((uid === currentUid) ? updatedSlots : sq.slots);
          const sqBench = ensureArray((uid === currentUid) ? updatedBench : sq.bench);
          const count = sqBench.length + sqSlots.filter(s => s !== null).length;
          if (count < 11) allComplete = false;
        });

        if (allComplete) {
          updates[`rooms/${roomCode}/status`] = "placing";
        }

        try {
          await update(ref(rtdb), updates);
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  }

  // Active sync timer logic
  const timerBadge = document.getElementById("draft-countdown-sec");
  if (draftState.turnDeadline && timerBadge) {
    clearInterval(timerInterval);
    timerInterval = setInterval(async () => {
      const remainingMs = draftState.turnDeadline - getServerTime();
      const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
      
      timerBadge.innerText = `${secondsLeft}s`;

      if (secondsLeft === 0 && isActiveTurn) {
        // Timer expired — auto-assign a random player from reveal (or auto-roll if unrolled) to a random empty pitch slot!
        clearInterval(timerInterval);
        try {
          let currentRevealData = reveal;
          if (!currentRevealData) {
            // Auto-roll squad first if player timed out without rolling
            const rolledSquad = await fetchClientRandomSquad(draftState);
            const squadId = rolledSquad.squadId || `${rolledSquad.nationalTeam}_${rolledSquad.tournamentYear}`;
            currentRevealData = {
              squadId,
              nationalTeam: rolledSquad.nationalTeam,
              tournamentYear: rolledSquad.tournamentYear,
              players: rolledSquad.players,
              rolledAt: Date.now(),
              rolledBy: currentUid
            };
          }

          const claimedIds = draftState.claimedPlayerIds || [];
          const availablePlayers = ensureArray(currentRevealData.players).filter(p => !claimedIds.includes(p.id));

          if (availablePlayers.length > 0) {
            // Pick a random unclaimed player
            const randomPick = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];

            const userSquad = (room.squads || {})[currentUid] || { slots: Array(11).fill(null), bench: [] };
            const currentSlots = [...getFilledSlotsArray(userSquad.slots)];
            const currentBench = [...ensureArray(userSquad.bench)];

            // Find all empty pitch slot indices
            const emptyIndices = [];
            for (let i = 0; i < 11; i++) {
              if (currentSlots[i] === null) emptyIndices.push(i);
            }

            let slotAssignedText = "reserves";
            if (emptyIndices.length > 0) {
              const randSlotIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
              currentSlots[randSlotIdx] = randomPick;
              slotAssignedText = `Slot #${randSlotIdx + 1}`;
            } else {
              currentBench.push(randomPick);
            }

            const turnOrder = draftState.turnOrder || [];
            const currentTurnIndex = draftState.turnIndex || 0;
            const nextTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
            const nextActiveUid = turnOrder[nextTurnIndex];
            const updatedClaimed = [...ensureArray(claimedIds), randomPick.id];

            const updates = {};
            updates[`rooms/${roomCode}/squads/${currentUid}/slots`] = currentSlots;
            updates[`rooms/${roomCode}/squads/${currentUid}/bench`] = currentBench;
            updates[`rooms/${roomCode}/draftState/turnIndex`] = nextTurnIndex;
            updates[`rooms/${roomCode}/draftState/activePlayerUid`] = nextActiveUid;
            updates[`rooms/${roomCode}/draftState/claimedPlayerIds`] = updatedClaimed;
            updates[`rooms/${roomCode}/draftState/currentReveal`] = null;
            updates[`rooms/${roomCode}/draftState/turnDeadline`] = null;

            // Check if all players reached 11 squad picks
            let allComplete = true;
            turnOrder.forEach(uid => {
              const sq = (room.squads || {})[uid] || { slots: Array(11).fill(null), bench: [] };
              const sqSlots = getFilledSlotsArray((uid === currentUid) ? currentSlots : sq.slots);
              const sqBench = ensureArray((uid === currentUid) ? currentBench : sq.bench);
              const count = sqBench.length + sqSlots.filter(s => s !== null).length;
              if (count < 11) allComplete = false;
            });

            if (allComplete) {
              updates[`rooms/${roomCode}/status`] = "placing";
            }

            await update(ref(rtdb), updates);
            showToast(`⏱ Time's up! Auto-assigned ${randomPick.name} to ${slotAssignedText}`, false);
          } else {
            // No players available — advance turn
            const turnOrder = draftState.turnOrder || [];
            const currentTurnIndex = draftState.turnIndex || 0;
            const nextTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
            const nextActiveUid = turnOrder[nextTurnIndex];

            await update(ref(rtdb, `rooms/${roomCode}/draftState`), {
              currentReveal: null,
              turnDeadline: null,
              turnIndex: nextTurnIndex,
              activePlayerUid: nextActiveUid
            });
            showToast("⏱ Time's up! Turn skipped.", false);
          }
        } catch (err) {
          console.warn("Timer auto-pick error:", err);
          showToast("Auto-pick failed: " + err.message, true);
        }
      }
    }, 250);
  } else {
    clearInterval(timerInterval);
    if (timerBadge) {
      timerBadge.innerText = "WAIT";
    }
  }
}

// Cinematic slot-machine visual cycles ending on the drawn team
function startSlotMachineAnimation(finalTeamName = null) {
  if (slotAnimationTimer) {
    clearInterval(slotAnimationTimer);
    slotAnimationTimer = null;
  }
  const teamsPool = ["INDIA", "AUSTRALIA", "WEST INDIES", "SOUTH AFRICA", "PAKISTAN", "ENGLAND", "NEW ZEALAND", "SRI LANKA", "AFGHANISTAN"];
  const textEl = document.getElementById("slot-machine-display");
  if (!textEl) return;

  let speed = 50;
  let counter = 0;

  slotAnimationTimer = setInterval(() => {
    const el = document.getElementById("slot-machine-display");
    if (el) {
      el.innerText = teamsPool[counter % teamsPool.length];
    }
    counter++;
  }, speed);

  // Terminate animation after 900ms and display final drawn team
  setTimeout(() => {
    if (slotAnimationTimer) {
      clearInterval(slotAnimationTimer);
      slotAnimationTimer = null;
    }
    const el = document.getElementById("slot-machine-display");
    if (el && finalTeamName) {
      el.innerText = String(finalTeamName).toUpperCase();
    }
  }, 900);
}

const FAMOUS_JERSEYS = {
  "sachin tendulkar": 10, "ms dhoni": 7, "virat kohli": 18, "rohit sharma": 45,
  "jasprit bumrah": 93, "yuvraj singh": 12, "virender sehwag": 44, "suresh raina": 3,
  "gautam gambhir": 5, "kapil dev": 17, "sunil gavaskar": 1, "sourav ganguly": 99,
  "rahul dravid": 19, "shikhar dhawan": 25, "kl rahul": 1, "rishabh pant": 17,
  "hardik pandya": 33, "ravindra jadeja": 8, "axar patel": 20, "kuldeep yadav": 23,
  "mohammed shami": 11, "mohammed siraj": 73, "arshdeep singh": 2, "shane warne": 23,
  "ricky ponting": 14, "glenn mcgrath": 11, "adam gilchrist": 18, "matthew hayden": 28,
  "brett lee": 58, "david warner": 31, "steve smith": 49, "mitchell starc": 56,
  "pat cummins": 30, "babar azam": 56, "shaheen afridi": 10, "wasim akram": 3,
  "imran khan": 80, "shoaib akhtar": 14, "chris gayle": 333, "ab de villiers": 17,
  "kumar sangakkara": 11, "muttiah muralitharan": 8, "kane williamson": 22,
  "ben stokes": 55, "jos buttler": 63, "joe root": 66
};

function getJerseyNumber(player) {
  if (!player) return 0;
  if (player.jerseyNumber) return player.jerseyNumber;
  const lower = (player.name || "").toLowerCase().trim();
  if (FAMOUS_JERSEYS[lower]) return FAMOUS_JERSEYS[lower];
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash * 31 + lower.charCodeAt(i)) % 99;
  }
  return hash + 1;
}

function getRoleShort(role) {
  if (!role) return 'GEN';
  const r = String(role).toLowerCase();
  if (r.includes('open')) return 'OPN';
  if (r.includes('top')) return 'TOP';
  if (r.includes('mid')) return 'MID';
  if (r.includes('keep')) return 'WCP';
  if (r.includes('all')) return 'ALL';
  if (r.includes('pace') || r.includes('fast')) return 'PAC';
  if (r.includes('spin')) return 'SPN';
  return 'PLY';
}

function isOutOfPosition(p, slotIdx) {
  if (!p || slotIdx === undefined || slotIdx === null) return false;
  const r = (p.role || '').toLowerCase();
  const isBowlerRole = r.includes('pace') || r.includes('fast') || r.includes('spin');
  const isBatterRole = r.includes('open') || r.includes('top') || r.includes('mid') || r.includes('keep');

  if (isBowlerRole && slotIdx < 3) return true;
  if (isBatterRole && slotIdx >= 7) return true;
  return false;
}

function formatOvers(over, ballInOver) {
  if (ballInOver === 6) {
    return `${over + 1}.0 ov`;
  }
  return `${over}.${ballInOver} ov`;
}

function formatBowlerOvers(bCount) {
  const overs = Math.floor((bCount || 0) / 6);
  const balls = (bCount || 0) % 6;
  return `${overs}.${balls} ov`;
}

function ensureArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return Object.values(val);
  return [];
}

function getFilledSlotsArray(rawSlots) {
  const arr = Array(11).fill(null);
  if (!rawSlots) return arr;
  if (Array.isArray(rawSlots)) {
    for (let i = 0; i < 11; i++) {
      if (rawSlots[i]) arr[i] = rawSlots[i];
    }
  } else if (typeof rawSlots === 'object') {
    for (let i = 0; i < 11; i++) {
      if (rawSlots[i] !== undefined && rawSlots[i] !== null) {
        arr[i] = rawSlots[i];
      } else if (rawSlots[String(i)] !== undefined && rawSlots[String(i)] !== null) {
        arr[i] = rawSlots[String(i)];
      }
    }
  }
  return arr;
}

/**
 * 3. MANUAL PLACING PHASE VIEW (Pitch Stadium graphic)
 */
function renderPlacingPhase(viewport, roomCode, room, spectatedUid, setSpectatorUid) {
  const currentUid = auth.currentUser ? auth.currentUser.uid : "";
  const spectatorSquad = room.squads?.[spectatedUid] || { slots: Array(11).fill(null), bench: [], ready: false };
  const isOwnBoard = spectatedUid === currentUid;
  
  const slots = spectatorSquad.slots || Array(11).fill(null);
  const bench = spectatorSquad.bench || [];

  // Zone classifications (4 compact rows)
  const zoneInfo = [
    { name: "3 Top Order", indices: [0, 1, 2] },
    { name: "3 Middle Order", indices: [3, 4, 5] },
    { name: "2 All-Rounder", indices: [6, 7] },
    { name: "3 Bowlers", indices: [8, 9, 10] }
  ];

  // Check XI status for Locking button
  const totalPlaced = slots.filter(s => s !== null).length;
  const validPlaced = slots.filter(s => s !== null);

  let effectiveCaptainId = spectatorSquad.captainId || "";
  let effectiveViceCaptainId = spectatorSquad.viceCaptainId || "";
  let effectiveKeeperId = spectatorSquad.keeperId || "";

  if (!effectiveKeeperId && validPlaced.length > 0) {
    const naturalWK = validPlaced.find(p => p.isWicketkeeper || p.isWK || (p.role || '').toLowerCase().includes('keep'));
    const nonBowler = validPlaced.find(p => {
      const r = (p.role || '').toLowerCase();
      return !r.includes('all') && !r.includes('pace') && !r.includes('fast') && !r.includes('spin') && (p.bowlRating || 0) < 45;
    });
    if (naturalWK) effectiveKeeperId = naturalWK.id;
    else if (nonBowler) effectiveKeeperId = nonBowler.id;
    else effectiveKeeperId = validPlaced[0].id;
  }

  if (!effectiveCaptainId && validPlaced.length > 0) {
    const bestPlayer = [...validPlaced].sort((a, b) => ((b.batRating || 0) + (b.bowlRating || 0)) - ((a.batRating || 0) + (a.bowlRating || 0)))[0];
    if (bestPlayer) effectiveCaptainId = bestPlayer.id;
  }

  if (!effectiveViceCaptainId && validPlaced.length > 0) {
    const secondBest = validPlaced.find(p => String(p.id) !== String(effectiveCaptainId));
    if (secondBest) effectiveViceCaptainId = secondBest.id;
  }

  const isFinalizable = totalPlaced === 11 &&
                        effectiveCaptainId &&
                        effectiveViceCaptainId &&
                        effectiveKeeperId &&
                        effectiveCaptainId !== effectiveViceCaptainId &&
                        !spectatorSquad.ready;

  viewport.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <div class="flex justify-between align-center" style="margin-bottom: 1.5rem;">
        <div>
          <span class="role-badge spinner" style="font-size: 0.85rem; margin-bottom: 0.5rem;">Phase: Squad Placements</span>
          <h1 style="font-size: 2.2rem;">Assemble your Playing XI</h1>
          <p style="font-size: 0.85rem; color: var(--willow-tan); margin-top: 0.25rem;">
            💡 Tap any backup player on the right, then tap ANY empty position slot (1-11) on your pitch to place them.
          </p>
        </div>

        ${isOwnBoard && !spectatorSquad.ready ? `
          <button id="lock-squad-btn" class="btn btn-primary" ${isFinalizable ? '' : 'disabled'}>
            Lock Playing XI (${totalPlaced}/11 Placed)
          </button>
        ` : ''}

        ${spectatorSquad.ready ? `
          <span class="status-badge complete" style="padding: 0.5rem 1rem; font-size: 0.9rem;">SQUAD LOCKED</span>
        ` : ''}
      </div>

      <!-- Live alert box -->
      ${isOwnBoard && !spectatorSquad.ready ? `
        <div style="margin-bottom: 1rem;">
          ${totalPlaced === 11 ? `
            <div class="validation-success-alert" style="background: rgba(46, 125, 50, 0.2); border: 1px solid #4caf50; color: #a5d6a7; padding: 0.75rem; border-radius: 8px;">
              ✓ All 11 Playing XI Positions Filled! Select C, VC, and WK below to Lock.
            </div>
          ` : `
            <div class="validation-error-alert" style="background: rgba(211, 47, 47, 0.2); border: 1px solid #ef5350; color: #ef9a9a; padding: 0.75rem; border-radius: 8px;">
              ⚠️ Place all 11 players onto your pitch field to lock your roster. (${totalPlaced}/11 placed)
            </div>
          `}
        </div>
      ` : ''}

      <div class="profile-grid" style="grid-template-columns: 3fr 2fr; gap: 1.5rem;">
        <!-- STADIUM CANVAS FIELD -->
        <div>
          <div class="pitch-stadium">
            <div class="pitch-center-lane"></div>

            ${zoneInfo.map(zone => {
              return `
                <div class="pitch-zone">
                  <div class="pitch-zone-header">${zone.name}</div>
                  <div class="pitch-grid-row">
                    ${zone.indices.map(idx => {
                      const player = slots[idx];
                      const isPureBat = player && (player.bowlRating === 0 || !player.bowlRating);
                      const isPureBowl = player && player.bowlRating >= 75;
                      const isAllRounder = player && player.batRating >= 70 && player.bowlRating >= 70;

                      let borderColor = 'var(--glass-border)';
                      if (isPureBat) borderColor = '#e53935';
                      else if (isPureBowl) borderColor = '#1e88e5';
                      else if (isAllRounder) borderColor = '#ab47bc';
                      if (player?.isCaptain) borderColor = '#ffb703';

                      const isK = player && (String(player.id) === String(spectatorSquad.keeperId || effectiveKeeperId) || player.isWicketkeeper || player.isWK);

                      return `
                        <div class="pitch-player-slot ${player ? 'filled' : 'empty'}" data-slot-index="${idx}" style="pointer-events: ${spectatorSquad.ready || !isOwnBoard ? 'none' : 'auto'}; position: relative;">
                          <div class="player-avatar-circle" style="position: relative; overflow: visible; border-color: ${borderColor}; width: 44px; height: 44px; border-radius: 50%; background: #111111; color: #FFFFFF; font-family: var(--font-family-mono); font-weight: 900; font-size: 1.05rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                            ${player ? `
                              <span>#${getJerseyNumber(player)}</span>
                              
                              <div style="display: flex; position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%); white-space: nowrap; z-index: 5;">
                                <span class="rating-chip" style="background: #111111; color: #C89B3C; padding: 1px 5px; border-radius: 0px; font-size: 0.65rem; font-weight: 900; border: 1px solid #1E1E1E;">#${getJerseyNumber(player)}</span>
                              </div>

                              ${String(player.id) === String(spectatorSquad.captainId || effectiveCaptainId) ? '<span class="designation-badge" style="position: absolute; top: -6px; right: -8px; background: #ffb703; color: #000; font-weight: 900; font-size: 0.65rem; padding: 1px 5px; border-radius: 0px; border: 1px solid #1E1E1E; z-index: 6;">C</span>' : ''}
                              ${String(player.id) === String(spectatorSquad.viceCaptainId || effectiveViceCaptainId) ? '<span class="designation-badge" style="position: absolute; top: -6px; right: -8px; background: #e0e0e0; color: #000; font-weight: 900; font-size: 0.65rem; padding: 1px 5px; border-radius: 0px; border: 1px solid #1E1E1E; z-index: 6;">VC</span>' : ''}
                              ${isK ? '<span class="designation-badge" style="position: absolute; top: -6px; left: -8px; background: #2E7D32; color: #FFF; font-weight: 900; font-size: 0.65rem; padding: 1px 5px; border-radius: 0px; border: 1px solid #1E1E1E; z-index: 6;">WK</span>' : ''}
                            ` : `
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            `}
                          </div>
                          <div class="player-name-plate" style="margin-top: 14px; font-weight: 800;">
                            ${player ? player.name.split(" ").slice(-1)[0] : 'EMPTY'}
                          </div>
                        </div>
                      `;
                    }).join("")}
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Bottom selector tab strip for live spectating -->
          <div class="team-selector-tabs">
            ${(() => {
              const participantUids = (room.draftState?.turnOrder && room.draftState.turnOrder.length > 0)
                ? room.draftState.turnOrder
                : Object.keys(room.players || {});

              return participantUids.map(uid => {
                const p = room.players[uid] || {};
                const pSquad = room.squads?.[uid];
                const isLocked = pSquad?.ready;
                const connStatus = p.connectionStatus || "offline";
                return `
                  <button class="team-tab-btn spectate-tab-trigger ${uid === spectatedUid ? 'active' : ''} ${connStatus === 'online' ? 'online' : 'offline'}" data-player-uid="${uid}">
                    <span class="tab-dot"></span>
                    ${(p.displayName || "Player").split(" ")[0]} ${isLocked ? '🔒' : ''}
                  </button>
                `;
              }).join("");
            })()}
          </div>
        </div>

        <!-- Reserves drawer & placements utilities -->
        <div>
          <div class="career-stats-widget" style="margin-bottom: 1.5rem;">
            <h4 style="border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; text-transform: uppercase;">
              ${isOwnBoard ? 'Your Backups Pool' : `${room.players[spectatedUid]?.displayName}'s Backups`}
            </h4>
            <p style="font-size: 0.8rem; color: #333333; font-weight: 700; margin-top: 0.5rem;">
              ${isOwnBoard ? 'Drag or click a player to place them in an empty role slot.' : 'Viewing reserves list of teammate.'}
            </p>
            
            <div class="roster-list" style="margin-top: 1rem; max-height: 350px; overflow-y: auto;">
              ${bench.length === 0 ? `
                <div class="text-center" style="padding: 2rem; color: #666666; font-size: 0.9rem; font-weight: 800;">
                  No players in reserve.
                </div>
              ` : bench.map(p => {
                return `
                  <div class="roster-item bench-card-item" style="padding: 0.65rem 0.85rem; cursor: ${spectatorSquad.ready || !isOwnBoard ? 'default' : 'pointer'};" data-player-id="${p.id}">
                    <div>
                      <div class="roster-name" style="font-size: 0.9rem; color: #111111 !important; font-weight: 900;">#${getJerseyNumber(p)} ${p.name}</div>
                      <div class="roster-sub" style="font-size: 0.75rem; color: #444444 !important; font-weight: 700;">${p.role.toUpperCase()} • ${p.nationalTeam} (${p.tournamentYear})</div>
                    </div>
                    <div style="display: flex; gap: 0.35rem;">
                      <span class="role-badge opener" style="font-size: 0.65rem; background: #E53926; color: #FFF; font-weight: 900; border: 1px solid #1E1E1E;">BAT: ${p.batRating}</span>
                      ${p.bowlRating > 0 ? `<span class="role-badge pacer" style="font-size: 0.65rem; background: #1E88E5; color: #FFF; font-weight: 900; border: 1px solid #1E1E1E;">BOWL: ${p.bowlRating}</span>` : ''}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- Captain/VC/WK designating inputs & Ready Lock button -->
          ${isOwnBoard ? `
            <div class="career-stats-widget" style="margin-top: 1rem;">
              <h4 style="margin-bottom: 1rem; text-transform: uppercase; color: #C89B3C; font-weight: 900;">Designations & Lock</h4>
              ${spectatorSquad.ready ? `
                <div style="padding: 1rem; background: #FFFDE7; border: 2px solid #C89B3C; color: #111111; font-weight: 900; text-align: center; border-radius: 0px; box-shadow: 2px 2px 0px #1E1E1E;">
                  🔒 YOUR SQUAD IS LOCKED & READY! Waiting for opponent to lock XI...
                </div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
                  <label style="position: relative; z-index: 20;">
                    <span style="display: block; margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 900; color: #111111;">Select Captain (C - 2x points):</span>
                    <select id="captain-select" style="width: 100%; background: #FFFFFF; color: #111111 !important; border: 2px solid #1E1E1E; padding: 0.6rem 0.85rem; font-weight: 800; font-size: 0.95rem; border-radius: 0px; outline: none; cursor: pointer;">
                      <option value="">-- Choose Captain --</option>
                      ${slots.filter(s => s !== null && s.id !== (spectatorSquad.viceCaptainId || effectiveViceCaptainId)).map(p => `<option value="${p.id}" ${p.id === (spectatorSquad.captainId || effectiveCaptainId) ? 'selected' : ''}>#${getJerseyNumber(p)} - ${p.name}</option>`).join("")}
                    </select>
                  </label>

                  <label style="position: relative; z-index: 19; margin-top: 0.25rem;">
                    <span style="display: block; margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 900; color: #111111;">Select Vice-Captain (VC - 1.5x points):</span>
                    <select id="vice-captain-select" style="width: 100%; background: #FFFFFF; color: #111111 !important; border: 2px solid #1E1E1E; padding: 0.6rem 0.85rem; font-weight: 800; font-size: 0.95rem; border-radius: 0px; outline: none; cursor: pointer;">
                      <option value="">-- Choose Vice-Captain --</option>
                      ${slots.filter(s => s !== null && s.id !== (spectatorSquad.captainId || effectiveCaptainId)).map(p => `<option value="${p.id}" ${p.id === (spectatorSquad.viceCaptainId || effectiveViceCaptainId) ? 'selected' : ''}>#${getJerseyNumber(p)} - ${p.name}</option>`).join("")}
                    </select>
                  </label>

                  <label style="position: relative; z-index: 18; margin-top: 0.25rem;">
                    <span style="display: block; margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 900; color: #111111;">Select Wicketkeeper (WK):</span>
                    <select id="keeper-select" style="width: 100%; background: #FFFFFF; color: #111111 !important; border: 2px solid #1E1E1E; padding: 0.6rem 0.85rem; font-weight: 800; font-size: 0.95rem; border-radius: 0px; outline: none; cursor: pointer;">
                      <option value="">-- Choose Wicketkeeper --</option>
                      ${slots.filter(s => {
                        if (!s) return false;
                        const role = (s.role || '').toLowerCase();
                        const isBowlerOrAR = role.includes('all') || role.includes('pace') || role.includes('fast') || role.includes('spin') || (s.bowlRating || 0) >= 45;
                        return !isBowlerOrAR;
                      }).map(p => `<option value="${p.id}" ${p.id === (spectatorSquad.keeperId || effectiveKeeperId) || p.isWicketkeeper ? 'selected' : ''}>#${getJerseyNumber(p)} - ${p.name}</option>`).join("")}
                    </select>
                  </label>

                  <button id="lock-squad-btn-bottom" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 0.5rem; padding: 0.85rem; font-size: 0.95rem; font-weight: 900; background: var(--primary-coral); border: 2px solid #1E1E1E; box-shadow: 4px 4px 0px #1E1E1E;" ${isFinalizable ? '' : 'disabled'}>
                    🔒 LOCK SQUAD & START MATCH (${totalPlaced}/11)
                  </button>
                </div>
              `}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Attach spectator tab buttons
  document.querySelectorAll(".spectate-tab-trigger").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetUid = btn.getAttribute("data-player-uid");
      setSpectatorUid(targetUid);
      // Re-trigger viewport render by resolving path
      renderPlacingPhase(viewport, roomCode, room, targetUid, setSpectatorUid);
    });
  });

  // Attach slot removal clicks (returns to bench)
  if (isOwnBoard && !spectatorSquad.ready) {
    document.querySelectorAll(".pitch-player-slot.filled").forEach(slot => {
      slot.addEventListener("click", async () => {
        const slotIdx = parseInt(slot.getAttribute("data-slot-index"), 10);
        const player = slots[slotIdx];
        if (!player) return;

        // Move back to bench
        const rawSlots = spectatorSquad.slots || [];
        const currentSlots = Array(11).fill(null);
        for (let i = 0; i < 11; i++) {
          if (i !== slotIdx && rawSlots[i]) currentSlots[i] = rawSlots[i];
        }
        const sanitizedSlots = currentSlots.map(s => s || null);

        const updatedBench = [...bench, player];

        await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), {
          slots: sanitizedSlots,
          bench: updatedBench
        });
      });
    });

    // Attach reserve bench cards clicks
    let activeBenchPlayerId = null;
    document.querySelectorAll(".bench-card-item").forEach(card => {
      card.addEventListener("click", () => {
        // Toggle selection
        document.querySelectorAll(".bench-card-item").forEach(c => c.style.borderColor = "");
        const pId = card.getAttribute("data-player-id");
        if (activeBenchPlayerId === pId) {
          activeBenchPlayerId = null;
        } else {
          activeBenchPlayerId = pId;
          card.style.borderColor = "var(--primary)";
        }
      });
    });

    // Attach empty slot clicks to place selected bench player
    document.querySelectorAll(".pitch-player-slot.empty").forEach(slot => {
      slot.addEventListener("click", async () => {
        if (!activeBenchPlayerId) {
          showToast("Select a player from your backups pool first!", true);
          return;
        }
        const slotIdx = parseInt(slot.getAttribute("data-slot-index"), 10);
        try {
          const userSquad = (room.squads || {})[currentUid] || { slots: Array(11).fill(null), bench: [] };
          const userSlots = getFilledSlotsArray(userSquad.slots);
          let updatedBench = [...ensureArray(userSquad.bench)];
          const currentSlots = [...userSlots];

          const pIndex = updatedBench.findIndex(p => String(p.id) === String(activeBenchPlayerId));
          if (pIndex !== -1) {
            const [movedPlayer] = updatedBench.splice(pIndex, 1);
            currentSlots[slotIdx] = movedPlayer;

            const sanitizedSlots = currentSlots.map(s => s || null);

            await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), {
              bench: updatedBench,
              slots: sanitizedSlots
            });
          }
          activeBenchPlayerId = null;
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    const capSelect = document.getElementById("captain-select");
    const vcSelect = document.getElementById("vice-captain-select");
    const keeperSelect = document.getElementById("keeper-select");

    if (capSelect) {
      capSelect.addEventListener("change", async () => {
        const val = capSelect.value;
        const updates = { captainId: val };
        if (val && val === (spectatorSquad.viceCaptainId || effectiveViceCaptainId)) {
          updates.viceCaptainId = ""; // Auto-clear Vice Captain if same player selected!
        }
        await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), updates);
      });
    }

    if (vcSelect) {
      vcSelect.addEventListener("change", async () => {
        const val = vcSelect.value;
        const updates = { viceCaptainId: val };
        if (val && val === (spectatorSquad.captainId || effectiveCaptainId)) {
          updates.captainId = ""; // Auto-clear Captain if same player selected!
        }
        await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), updates);
      });
    }

    if (keeperSelect) {
      keeperSelect.addEventListener("change", async () => {
        const val = keeperSelect.value;
        await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), { keeperId: val });
      });
    }

    // Handle Lock XI click handler
    const handleLockSubmit = async () => {
      const cId = capSelect?.value || spectatorSquad.captainId || effectiveCaptainId;
      const vcId = vcSelect?.value || spectatorSquad.viceCaptainId || effectiveViceCaptainId;
      const kId = keeperSelect?.value || spectatorSquad.keeperId || effectiveKeeperId;

      if (!cId || !vcId || !kId) {
        showToast("Please designate Captain, Vice-Captain, AND Wicketkeeper first!", true);
        return;
      }

      if (cId === vcId) {
        showToast("Captain and Vice-Captain cannot be the same player!", true);
        return;
      }

      try {
        const topLock = document.getElementById("lock-squad-btn");
        const btmLock = document.getElementById("lock-squad-btn-bottom");
        if (topLock) topLock.disabled = true;
        if (btmLock) btmLock.disabled = true;

        const userSquad = room.squads?.[currentUid] || { slots: Array(11).fill(null), bench: [] };
        const currentSlots = getFilledSlotsArray(userSquad.slots);
        const updatedSlots = currentSlots.map(p => {
          if (!p) return null;
          return {
            ...p,
            isCaptain: String(p.id) === String(cId),
            isViceCaptain: String(p.id) === String(vcId),
            isWicketkeeper: String(p.id) === String(kId),
            isWK: String(p.id) === String(kId)
          };
        });

        await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), {
          ready: true,
          slots: updatedSlots,
          captainId: cId,
          viceCaptainId: vcId,
          keeperId: kId
        });

        // Verify if all players in room have locked their squad
        const updatedRoomSnap = await get(ref(rtdb, `rooms/${roomCode}`));
        const updatedRoom = updatedRoomSnap.val();
        if (updatedRoom) {
          const uids = Object.keys(updatedRoom.players || {});
          const allReady = uids.length > 0 && uids.every(uid => updatedRoom.squads?.[uid]?.ready);

          if (allReady && updatedRoom.status !== "toss" && updatedRoom.status !== "simulating") {
            await update(ref(rtdb, `rooms/${roomCode}`), {
              status: "toss",
              tossState: {
                flipped: false,
                winnerUid: null,
                decision: null,
                flippedBy: null
              }
            });
          }
        }

        showToast("Roster locked successfully! Moving to official Coin Toss...");
      } catch (err) {
        const topLock = document.getElementById("lock-squad-btn");
        const btmLock = document.getElementById("lock-squad-btn-bottom");
        if (topLock) topLock.disabled = false;
        if (btmLock) btmLock.disabled = false;
        showToast(err.message, true);
      }
    };

    document.getElementById("lock-squad-btn")?.addEventListener("click", handleLockSubmit);
    document.getElementById("lock-squad-btn-bottom")?.addEventListener("click", handleLockSubmit);
  }

  // Auto check if all players ready in placing phase
  const playerUids = Object.keys(room.players || {});
  const allReady = playerUids.length > 0 && playerUids.every(uid => room.squads?.[uid]?.ready);
  if (allReady && room.status !== "toss" && room.status !== "simulating") {
    update(ref(rtdb, `rooms/${roomCode}`), {
      status: "toss",
      tossState: {
        flipped: false,
        winnerUid: null,
        decision: null,
        flippedBy: null
      }
    });
  }
}

/**
 * 3.5 INTERACTIVE COIN TOSS PHASE VIEW
 */
function renderTossPhase(viewport, roomCode, room) {
  const currentUid = auth.currentUser ? auth.currentUser.uid : "";
  const tossState = room.tossState || {};
  const players = room.players || {};
  const playerUids = Object.keys(players);
  const p1Uid = currentUid;
  const p2Uid = playerUids.find(id => id !== currentUid) || playerUids[0];

  const p1 = players[p1Uid] || { displayName: "YOU" };
  const p2 = players[p2Uid] || { displayName: "OPPONENT" };

  const tossWinnerUid = tossState.winnerUid;
  const isTossWinner = tossWinnerUid === currentUid;
  const tossWinnerName = players[tossWinnerUid]?.displayName || (tossWinnerUid === currentUid ? "YOU" : "OPPONENT");

  viewport.innerHTML = `
    <div class="squad-review-container">
      <div class="controls-card text-center" style="padding: 2.5rem 1.5rem; background: #FFFFFF; border: 2px solid #1E1E1E; box-shadow: 4px 4px 0px #1E1E1E; border-radius: 0px; max-width: 650px; margin: 0 auto;">
        <span class="role-badge all-rounder" style="background: #C89B3C; color: #111111; font-size: 0.85rem; font-weight: 900; border: 1px solid #1E1E1E;">OFFICIAL MATCH TOSS</span>
        <h1 style="font-size: 2.2rem; font-weight: 900; margin-top: 0.6rem; color: #111111;">THE COIN TOSS</h1>
        <p style="color: #444444; font-weight: 700; font-size: 0.95rem; margin-top: 0.2rem;">
          Both captains are out on the pitch. Spin the official World Cup coin!
        </p>

        <!-- Cap vs Cap Header -->
        <div style="display: flex; justify-content: space-around; align-items: center; margin: 1.5rem 0; background: #FAF6ED; border: 2px solid #1E1E1E; padding: 0.85rem;">
          <div>
            <div style="font-weight: 900; font-size: 1.05rem; color: #111111;">${(players[currentUid]?.displayName || auth.currentUser?.displayName || "YOU").toUpperCase()}</div>
            <div style="font-size: 0.78rem; font-weight: 800; color: #E53926;">CAPTAIN DESIGNATED</div>
          </div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #C89B3C;">VS</div>
          <div>
            <div style="font-weight: 900; font-size: 1.05rem; color: #111111;">${(players[playerUids.find(id => id !== currentUid)]?.displayName || "OPPONENT").toUpperCase()}</div>
            <div style="font-size: 0.78rem; font-weight: 800; color: #1E88E5;">CAPTAIN DESIGNATED</div>
          </div>
        </div>

        <!-- Real Metallic 3D Coin Arena -->
        <div style="perspective: 1000px; margin: 3rem auto 2.5rem auto; width: 140px; height: 140px; position: relative;">
          <div id="toss-coin" style="width: 100%; height: 100%; position: absolute; transform-style: preserve-3d; transition: transform 2.6s cubic-bezier(0.15, 0.85, 0.35, 1.2); transform: ${tossState.flipped ? 'translateY(0) rotateY(1800deg) scale(1)' : 'translateY(0) rotateY(0deg) scale(1)'}; border-radius: 50% !important;">
            <!-- Heads Side (Gold) -->
            <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: radial-gradient(circle at 35% 35%, #FFF2A1, #D4AF37 60%, #aa820a); border: 5px solid #1E1E1E; border-radius: 50% !important; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 900; color: #111111; box-shadow: inset 0 0 12px rgba(255,255,255,0.7), inset 0 -4px 10px rgba(0,0,0,0.5), 0 6px 15px rgba(0,0,0,0.4); text-shadow: 0 1px 2px rgba(255,255,255,0.8);">
              <span style="font-size: 1.8rem; margin-bottom: -2px;">👑</span>
              <span>HEADS</span>
            </div>
            <!-- Tails Side (Silver) -->
            <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; transform: rotateY(180deg); background: radial-gradient(circle at 35% 35%, #FFFFFF, #B0BEC5 60%, #546E7A); border: 5px solid #1E1E1E; border-radius: 50% !important; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 900; color: #111111; box-shadow: inset 0 0 12px rgba(255,255,255,0.8), inset 0 -4px 10px rgba(0,0,0,0.5), 0 6px 15px rgba(0,0,0,0.4); text-shadow: 0 1px 2px rgba(255,255,255,0.8);">
              <span style="font-size: 1.8rem; margin-bottom: -2px;">🦅</span>
              <span>TAILS</span>
            </div>
          </div>
        </div>

        <div id="toss-result-box" style="margin-top: 1.5rem;">
          ${!tossState.flipped ? `
            <button id="spin-toss-btn" class="btn btn-primary btn-lg" style="padding: 0.85rem 2rem; font-size: 1.05rem;">
              🪙 FLIP THE COIN
            </button>
          ` : `
            <div style="margin-bottom: 1.25rem;">
              <h2 style="font-size: 1.5rem; color: #E53926; font-weight: 900; text-transform: uppercase;">
                🎉 ${tossWinnerName} WON THE TOSS!
              </h2>
            </div>

            ${isTossWinner ? `
              <div style="background: #FAF6ED; border: 2px solid #1E1E1E; padding: 1.25rem; margin-top: 1rem; border-radius: 0px; box-shadow: 2px 2px 0px #1E1E1E;">
                <h3 style="font-size: 1.05rem; color: #111111; font-weight: 900; margin-bottom: 1rem;">
                  ELECT YOUR DECISION:
                </h3>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                  <button id="elect-bat-btn" class="btn btn-primary btn-lg" style="flex: 1; max-width: 180px;">
                    🏏 ELECT TO BAT
                  </button>
                  <button id="elect-bowl-btn" class="btn btn-accent btn-lg" style="flex: 1; max-width: 180px;">
                    🎳 ELECT TO BOWL
                  </button>
                </div>
              </div>
            ` : `
              <div style="font-size: 1.05rem; color: #333333; font-weight: 800; padding: 1rem; background: #FAF6ED; border: 2px solid #1E1E1E;">
                Waiting for ${tossWinnerName} to decide to Bat or Bowl...
              </div>
            `}
          `}
        </div>
      </div>
    </div>
  `;

  // Attach spin coin button with realistic arc flip physics
  const spinBtn = document.getElementById("spin-toss-btn");
  if (spinBtn) {
    spinBtn.addEventListener("click", async () => {
      try {
        spinBtn.disabled = true;
        const coinEl = document.getElementById("toss-coin");
        const isHeads = Math.random() < 0.5;
        const targetRot = isHeads ? 1800 : 1980;

        if (coinEl) {
          coinEl.style.transition = "transform 1.3s cubic-bezier(0.2, 0.8, 0.4, 1)";
          coinEl.style.transform = `translateY(-140px) rotateY(${targetRot / 2}deg) scale(1.35)`;
          setTimeout(() => {
            if (coinEl) {
              coinEl.style.transition = "transform 1.3s cubic-bezier(0.6, 0, 0.8, 0.2)";
              coinEl.style.transform = `translateY(0px) rotateY(${targetRot}deg) scale(1)`;
            }
          }, 1300);
        }

        // Random toss winner selection
        const winnerUid = playerUids[Math.floor(Math.random() * playerUids.length)];

        setTimeout(async () => {
          await update(ref(rtdb, `rooms/${roomCode}/tossState`), {
            flipped: true,
            winnerUid,
            flippedBy: currentUid,
            flippedAt: Date.now()
          });
        }, 2600);
      } catch (err) {
        if (spinBtn) spinBtn.disabled = false;
        showToast(err.message, true);
      }
    });
  }

  // Attach elect bat / bowl buttons for toss winner
  const electBatBtn = document.getElementById("elect-bat-btn");
  const electBowlBtn = document.getElementById("elect-bowl-btn");

  const handleDecision = async (decision) => {
    try {
      if (electBatBtn) electBatBtn.disabled = true;
      if (electBowlBtn) electBowlBtn.disabled = true;

      await update(ref(rtdb, `rooms/${roomCode}/tossState`), {
        decision
      });

      // Launch simulation with toss winner & decision!
      await runClientSimulationFallback(roomCode, room, tossWinnerUid, decision);
    } catch (err) {
      if (electBatBtn) electBatBtn.disabled = false;
      if (electBowlBtn) electBowlBtn.disabled = false;
      showToast(err.message, true);
    }
  };

  if (electBatBtn) electBatBtn.addEventListener("click", () => handleDecision("bat"));
  if (electBowlBtn) electBowlBtn.addEventListener("click", () => handleDecision("bowl"));

  // Auto-launch simulation if toss decision is already recorded in RTDB
  if (tossState.flipped && tossState.winnerUid && tossState.decision && room.status === "toss") {
    runClientSimulationFallback(roomCode, room, tossState.winnerUid, tossState.decision);
  }
}

async function runClientSimulationFallback(roomCode, room, tossWinnerUid = null, tossDecision = "bat") {
  try {
    const players = room.players || {};
    const squads = room.squads || {};
    const uids = Object.keys(players);

    // Deterministic seed based on roomCode so both players generate 100% identical simulation
    let seed = 0;
    for (let i = 0; i < roomCode.length; i++) {
      seed = (seed * 31 + roomCode.charCodeAt(i)) & 0x7fffffff;
    }
    const engine = new BallEngine(seed);
    const simulatedMatches = [];

    if (room.mode === "solo") {
      const playerUid = uids[0];
      const playerXI = getFilledSlotsArray(squads[playerUid]?.slots).filter(p => p !== null && p !== undefined);
      const playerTeam = {
        id: playerUid,
        name: players[playerUid]?.displayName || "Player",
        players: playerXI
      };

      const defaultAITeams = [
        { name: "Australia (2015)", country: "AUS" },
        { name: "England (2019)", country: "ENG" },
        { name: "Pakistan (1992)", country: "PAK" },
        { name: "West Indies (1975)", country: "WI" },
        { name: "Sri Lanka (1996)", country: "SL" },
        { name: "South Africa (2015)", country: "RSA" },
        { name: "New Zealand (2019)", country: "NZ" }
      ];

      defaultAITeams.forEach((tm, idx) => {
        const aiPlayers = [
          { id: `ai_${idx}_1`, name: "Opener A", role: "opener", batRating: 85, bowlRating: 0, isWicketkeeper: false },
          { id: `ai_${idx}_2`, name: "Opener B", role: "opener", batRating: 82, bowlRating: 0, isWicketkeeper: false },
          { id: `ai_${idx}_3`, name: "Batter C", role: "topOrder", batRating: 88, bowlRating: 0, isWicketkeeper: false },
          { id: `ai_${idx}_4`, name: "Batter D", role: "topOrder", batRating: 84, bowlRating: 0, isWicketkeeper: false },
          { id: `ai_${idx}_5`, name: "Keeper E", role: "keeper", batRating: 80, bowlRating: 0, isWicketkeeper: true },
          { id: `ai_${idx}_6`, name: "All Rounder F", role: "allRounder", batRating: 78, bowlRating: 75, bowlingType: "pace-medium" },
          { id: `ai_${idx}_7`, name: "All Rounder G", role: "allRounder", batRating: 75, bowlRating: 78, bowlingType: "off-spin" },
          { id: `ai_${idx}_8`, name: "Spinner H", role: "spinner", batRating: 40, bowlRating: 85, bowlingType: "leg-spin" },
          { id: `ai_${idx}_9`, name: "Pacer I", role: "pacer", batRating: 25, bowlRating: 88, bowlingType: "pace-fast" },
          { id: `ai_${idx}_10`, name: "Pacer J", role: "pacer", batRating: 20, bowlRating: 86, bowlingType: "pace-fast" },
          { id: `ai_${idx}_11`, name: "Pacer K", role: "pacer", batRating: 15, bowlRating: 84, bowlingType: "left-arm-pace" }
        ];

        const opp = { id: `ai_team_${idx + 1}`, name: tm.name, players: aiPlayers };
        const forcedToss = idx === 0 ? { winner: tossWinnerUid || playerUid, decision: tossDecision } : null;
        const sim = engine.simulateMatch(playerTeam, opp, false, forcedToss);
        simulatedMatches.push({
          matchId: `${roomCode}_match_${idx + 1}`,
          round: idx + 1,
          teamAId: playerTeam.id,
          teamAName: playerTeam.name,
          teamBId: opp.id,
          teamBName: opp.name,
          ...sim
        });
      });

    } else if (room.mode === "duel" || uids.length >= 2) {
      const p1Uid = uids[0];
      const p2Uid = uids[1] || uids[0];

      let slotsA = getFilledSlotsArray(squads[p1Uid]?.slots).filter(p => p !== null && p !== undefined);
      let slotsB = getFilledSlotsArray(squads[p2Uid]?.slots).filter(p => p !== null && p !== undefined);

      if (slotsA.length === 0) slotsA = AUTHENTIC_FALLBACK_SQUADS[0].players;
      if (slotsB.length === 0) slotsB = AUTHENTIC_FALLBACK_SQUADS[1].players;

      const teamA = { id: p1Uid, name: players[p1Uid]?.displayName || "Player 1", players: slotsA };
      const teamB = { id: p2Uid, name: players[p2Uid]?.displayName || "Player 2", players: slotsB };

      const forcedToss = { winner: tossWinnerUid || p1Uid, decision: tossDecision };
      const sim = engine.simulateMatch(teamA, teamB, true, forcedToss);
      simulatedMatches.push({
        matchId: `${roomCode}_match_1`,
        round: 1,
        teamAId: p1Uid,
        teamAName: teamA.name,
        teamBId: p2Uid,
        teamBName: teamB.name,
        ...sim
      });
    }

    // Default safety fallback if no matches were pushed
    if (simulatedMatches.length === 0) {
      const p1Uid = uids[0] || "p1";
      const p2Uid = uids[1] || "p2";

      let slotsA = getFilledSlotsArray(squads[p1Uid]?.slots).filter(p => p !== null && p !== undefined);
      let slotsB = getFilledSlotsArray(squads[p2Uid]?.slots).filter(p => p !== null && p !== undefined);

      if (slotsA.length === 0) slotsA = AUTHENTIC_FALLBACK_SQUADS[0].players;
      if (slotsB.length === 0) slotsB = AUTHENTIC_FALLBACK_SQUADS[1].players;

      const teamA = { id: p1Uid, name: players[p1Uid]?.displayName || "Player 1", players: slotsA };
      const teamB = { id: p2Uid, name: players[p2Uid]?.displayName || "Player 2", players: slotsB };

      const forcedToss = { winner: tossWinnerUid || p1Uid, decision: tossDecision };
      const sim = engine.simulateMatch(teamA, teamB, true, forcedToss);
      simulatedMatches.push({
        matchId: `${roomCode}_match_1`,
        round: 1,
        teamAId: p1Uid,
        teamAName: teamA.name,
        teamBId: p2Uid,
        teamBName: teamB.name,
        ...sim
      });
    }

    const standings = uids.map(uid => ({
      teamId: uid,
      teamName: players[uid]?.displayName || "Player",
      wins: 0, losses: 0, ties: 0, points: 0, nrr: 0.0,
      runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0
    }));

    if (room.mode === "solo") {
      for (let i = 1; i <= 7; i++) {
        standings.push({
          teamId: `ai_team_${i}`,
          teamName: simulatedMatches[i - 1]?.teamBName || `AI Team ${i}`,
          wins: 0, losses: 0, ties: 0, points: 0, nrr: 0.0,
          runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0
        });
      }
    }

    simulatedMatches.forEach(m => {
      const tA = standings.find(s => s.teamId === m.teamAId);
      const tB = standings.find(s => s.teamId === m.teamBId);
      if (tA && tB) {
        if (m.result.winner === "tie") {
          tA.ties++; tB.ties++; tA.points += 1; tB.points += 1;
        } else {
          const winnerId = m.result.winner === m.teamAName ? m.teamAId : m.teamBId;
          if (winnerId === m.teamAId) { tA.wins++; tB.losses++; tA.points += 2; }
          else { tB.wins++; tA.losses++; tB.points += 2; }
        }
      }
    });

    standings.sort((a, b) => b.points - a.points);

    const startsAt = Date.now() + 4000;
    await update(ref(rtdb, `rooms/${roomCode}`), {
      status: "simulating",
      "simulation/matches": simulatedMatches,
      "simulation/standingsTable": standings,
      "simulation/startsAt": startsAt
    });
  } catch (err) {
    console.error("Client simulation error, performing emergency simulation fallback:", err);
    const startsAt = Date.now() + 4000;
    await update(ref(rtdb, `rooms/${roomCode}`), {
      status: "simulating",
      "simulation/startsAt": startsAt
    });
  }
}

// Maps player roles to silhouette basenames
function getPlayerSilhouette(role) {
  if (role === "keeper") return "keeper";
  if (role === "pacer") return "bowler";
  if (role === "spinner") return "bowler";
  return "batter";
}

/**
 * 4. SYNCED HIGHLIGHTS PLAYBACK
 */
let playbackTimer = null;
let simPlaybackStarted = false;
let simPlaybackRoomCode = null;

function renderSimulatingPhase(viewport, roomCode, room) {
  const currentUid = auth.currentUser ? auth.currentUser.uid : "";
  const sim = room.simulation || {};
  const startsAt = sim.startsAt || Date.now();
  const standings = sim.standingsTable || [];

  if (!document.getElementById("sim-screen-container") || simPlaybackRoomCode !== roomCode) {
    simPlaybackStarted = false;
  }

  if (document.getElementById("pb-teamA") && simPlaybackStarted && simPlaybackRoomCode === roomCode) {
    // If playback is already actively ticking in DOM, don't restart
    return;
  }
  simPlaybackStarted = true;
  simPlaybackRoomCode = roomCode;

  viewport.innerHTML = `
    <div class="squad-review-container">
      <div class="text-center" style="margin-bottom: 2rem;">
        <span class="role-badge all-rounder" style="font-size: 0.85rem;">Phase: Synced Match Simulation</span>
        <h1 style="font-size: 2.4rem; margin-top: 0.4rem; font-weight: 900; color: #111111;">World Cup Match Highlights</h1>
        <p style="color: #333333; font-weight: 800; margin-top: 0.2rem;" id="sim-status-title">Aligning broadcast timers...</p>
      </div>

      <!-- Scoreboard screen widget -->
      <div id="sim-screen-container" style="display: none;">
        <div class="match-mid-layout">
          <!-- TV scoreboard layout -->
          <div class="tv-scoreboard" style="flex: 2; border-color: var(--willow-tan);">
            <div class="score-row flex justify-between align-center">
              <div>
                <span class="score-team" id="pb-teamA">TEAM A</span>
                <span class="score-runs" id="pb-runsA">0/0</span>
              </div>
              <span class="score-overs" id="pb-oversA">0.0 ov</span>
            </div>
            <div class="score-row flex justify-between align-center" style="margin-top: 1rem; border-top: 1px dashed rgba(0,0,0,0.15); padding-top: 1rem;">
              <div>
                <span class="score-team" id="pb-teamB">TEAM B</span>
                <span class="score-runs" id="pb-runsB">0/0</span>
              </div>
              <span class="score-overs" id="pb-oversB">0.0 ov</span>
            </div>
            
            <div class="chase-row" id="pb-target-ticker" style="display: none;">
              Target: <span id="pb-target-runs">100 runs</span>
            </div>
          </div>

          <!-- Highlight Over outcomes strip -->
          <div class="controls-card">
            <h4>Current Over outcomes</h4>
            <div class="over-strip-container" style="margin-top: 1rem;">
              <div class="over-balls-list" id="pb-current-over-list">
                <!-- outcomes bubbles -->
              </div>
            </div>
          </div>
        </div>

        <!-- Live Batter & Bowler Side-by-Side Scorecard Panel -->
        <div class="career-stats-widget" style="margin-top: 1.25rem; border: 2px solid #1E1E1E; padding: 1rem; background: #FFFFFF; box-shadow: 3px 3px 0px #1E1E1E; border-radius: 0px;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <!-- Live Batter Card -->
            <div style="flex: 1; min-width: 250px; background: #FAF6ED; padding: 0.85rem; border-radius: 0px; border: 2px solid #1E1E1E; border-left: 5px solid #C89B3C;">
              <h5 style="color: #C89B3C; text-transform: uppercase; font-size: 0.85rem; margin: 0 0 0.5rem 0; font-weight: 900;">On Crease (Batting)</h5>
              <div id="pb-live-striker" style="font-size: 0.95rem; font-weight: 900; color: #111111; display: flex; align-items: center; justify-content: space-between;">
                <span>🏏 Striker: -</span>
                <span style="color: #C89B3C; font-weight: 900;">0 (0)</span>
              </div>
              <div id="pb-live-nonstriker" style="font-size: 0.85rem; color: #333333; font-weight: 800; margin-top: 0.35rem; display: flex; align-items: center; justify-content: space-between;">
                <span>Non-Striker: -</span>
                <span>0 (0)</span>
              </div>
            </div>

            <!-- Live Bowler Card -->
            <div style="flex: 1; min-width: 240px; background: #FAF6ED; padding: 0.85rem; border-radius: 0px; border: 2px solid #1E1E1E; border-left: 5px solid #1E88E5;">
              <h5 style="color: #1E88E5; text-transform: uppercase; font-size: 0.85rem; margin: 0 0 0.5rem 0; font-weight: 900;">Current Bowler</h5>
              <div id="pb-live-bowler" style="font-size: 0.95rem; font-weight: 900; color: #111111; display: flex; align-items: center; justify-content: space-between;">
                <span>⚡ Bowler: -</span>
                <span style="color: #1E88E5; font-weight: 900;">0-0 (0.0 ov)</span>
              </div>
              <div id="pb-live-bowler-econ" style="font-size: 0.85rem; color: #333333; font-weight: 800; margin-top: 0.35rem;">
                Economy: 0.00 rpo
              </div>
            </div>
          </div>
        </div>

        <!-- Commentary scrolling feed -->
        <div class="commentary-card" style="margin-top: 1.25rem;">
          <h4>Procedural Commentary Feed</h4>
          <div class="commentary-list" id="pb-commentary-feed-list">
            <div class="commentary-item">Waiting for match start...</div>
          </div>
        </div>
      </div>

      <!-- Countdown screen before broadcast starts -->
      <div id="pb-countdown-screen" class="text-center" style="padding: 3rem;">
        <div class="score-runs" id="pb-countdown-sec" style="font-size: 3rem; color: var(--accent-red);">03s</div>
        <p style="color: var(--chalk-white-dim); margin-top: 1rem;">MATCH BROADCAST STARTING IN</p>
      </div>

      <!-- Post Match Complete Glorious Champions Victory Card (Populated dynamically on match completion) -->
      <div id="pb-finished-screen" style="display: none; margin-top: 2rem;"></div>
    </div>
  `;

  const runHighlightLoop = () => {
    const countdownScreen = document.getElementById("pb-countdown-screen");
    const screenContainer = document.getElementById("sim-screen-container");
    const statusTitle = document.getElementById("sim-status-title");

    if (countdownScreen) countdownScreen.style.display = "none";
    if (screenContainer) screenContainer.style.display = "block";
    if (statusTitle) statusTitle.innerText = "Match Live in progress";

    startCinematicHighlightLoop(sim.matches, standings, currentUid, roomCode);
  };

  const remainingMs = startsAt - getServerTime();
  if (remainingMs <= 500) {
    runHighlightLoop();
  } else {
    clearInterval(playbackTimer);
    playbackTimer = setInterval(() => {
      const rem = startsAt - getServerTime();
      const sec = Math.max(0, Math.ceil(rem / 1000));
      
      const countText = document.getElementById("pb-countdown-sec");
      if (countText) {
        countText.innerText = `0${sec}s`;
      }

      if (rem <= 0) {
        clearInterval(playbackTimer);
        runHighlightLoop();
      }
    }, 250);
  }
}

// Fixed 50-second compressed cinematic playback loops
function startCinematicHighlightLoop(matches, standings = [], currentUid = "", roomCode = "") {
  if (!matches || matches.length === 0) {
    console.warn("No simulation matches found in room state, generating client fallback match...");
    const engine = new BallEngine(12345);
    const teamA = { id: "p1", name: "Team 1", players: AUTHENTIC_FALLBACK_SQUADS[0].players };
    const teamB = { id: "p2", name: "Team 2", players: AUTHENTIC_FALLBACK_SQUADS[1].players };
    const sim = engine.simulateMatch(teamA, teamB, true);
    matches = [{ matchId: "fallback_m1", round: 1, teamAId: "p1", teamAName: "Team 1", teamBId: "p2", teamBName: "Team 2", ...sim }];
  }

  const match = matches[0];
  const i1 = match.innings1 || (match.inningsData ? match.inningsData[0] : { balls: [], battingTeamName: match.teamAName });
  const i2 = match.innings2 || (match.inningsData ? match.inningsData[1] : { balls: [], battingTeamName: match.teamBName });

  const teamAName = match.teamAName || "TEAM A";
  const teamBName = match.teamBName || "TEAM B";

  const teamABattedFirst = (i1.battingTeamName === teamAName) || (i1.battingTeamId === match.teamAId);

  const teamAEl = document.getElementById("pb-teamA");
  const teamBEl = document.getElementById("pb-teamB");
  if (teamAEl) teamAEl.innerText = teamAName.toUpperCase();
  if (teamBEl) teamBEl.innerText = teamBName.toUpperCase();

  // Build ID lookup maps for player names
  const bMap1 = {};
  (i1.battingCard || []).forEach(p => { if (p && p.id) bMap1[p.id] = p; });
  const bwMap1 = {};
  (i1.bowlingCard || []).forEach(p => { if (p && p.id) bwMap1[p.id] = p; });

  const bMap2 = {};
  (i2.battingCard || []).forEach(p => { if (p && p.id) bMap2[p.id] = p; });
  const bwMap2 = {};
  (i2.bowlingCard || []).forEach(p => { if (p && p.id) bwMap2[p.id] = p; });

  const allDeliveries = [];
  
  // Flatten Innings 1 balls
  (i1.balls || []).forEach(b => {
    allDeliveries.push({ innings: 1, ...b });
  });

  // Flatten Innings 2 balls
  (i2.balls || []).forEach(b => {
    allDeliveries.push({ innings: 2, ...b });
  });

  const totalBalls = allDeliveries.length;
  const delayNormal = 200; // fast tick for dots/singles
  const delayNotable = 1800; // long pause for highlights

  let ballIndex = 0;
  let runs1 = 0;
  let wickets1 = 0;
  let runs2 = 0;
  let wickets2 = 0;

  const overOutcomes = [];
  const liveBatters = {};
  const liveBowlers = {};

  function getBatter(pId, name) {
    if (!liveBatters[pId]) {
      liveBatters[pId] = { name: name || "Batter", runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    }
    return liveBatters[pId];
  }

  function getBowler(pId, name) {
    if (!liveBowlers[pId]) {
      liveBowlers[pId] = { name: name || "Bowler", balls: 0, runsConceded: 0, wickets: 0 };
    }
    return liveBowlers[pId];
  }

  function tickPlayback() {
    if (ballIndex >= totalBalls) {
      // Playback complete
      const statusTitle = document.getElementById("sim-status-title");
      if (statusTitle) statusTitle.innerText = "Match Simulation Complete!";

      // Reveal Next Button container right under simulation screen
      let nextContainer = document.getElementById("pb-next-btn-container");
      if (!nextContainer) {
        const tvBoard = document.querySelector(".tv-scoreboard");
        if (tvBoard && tvBoard.parentNode) {
          nextContainer = document.createElement("div");
          nextContainer.id = "pb-next-btn-container";
          nextContainer.style.cssText = "margin: 1.5rem 0; text-align: center;";
          tvBoard.parentNode.insertBefore(nextContainer, tvBoard.nextSibling);
        }
      }

      if (nextContainer) {
        nextContainer.innerHTML = `
          <button id="pb-show-final-scorecard-btn" class="btn btn-primary btn-lg" style="font-weight: 900; background: var(--primary-coral); border: 3px solid #1E1E1E; box-shadow: 5px 5px 0px #1E1E1E; font-size: 1.25rem; padding: 0.85rem 2.2rem; cursor: pointer;">
            Next ➔ View Final Scorecard
          </button>
        `;
        const nextBtn = document.getElementById("pb-show-final-scorecard-btn");
        if (nextBtn) {
          nextBtn.addEventListener("click", () => {
            const finishedScreen = document.getElementById("pb-finished-screen");
            if (finishedScreen) {
              finishedScreen.style.display = "block";
              finishedScreen.scrollIntoView({ behavior: "smooth" });
            }
            nextContainer.style.display = "none";
          });
        }
      }

      // Correct Team A vs Team B mapping so Team A is ALWAYS on the left
      const teamABatCard = teamABattedFirst ? (i1.battingCard || []) : (i2.battingCard || []);
      const teamABowlCard = teamABattedFirst ? (i2.bowlingCard || []) : (i1.bowlingCard || []);
      const teamARuns = teamABattedFirst ? runs1 : runs2;
      const teamAWickets = teamABattedFirst ? wickets1 : wickets2;

      const teamBBatCard = teamABattedFirst ? (i2.battingCard || []) : (i1.battingCard || []);
      const teamBBowlCard = teamABattedFirst ? (i1.bowlingCard || []) : (i2.bowlingCard || []);
      const teamBRuns = teamABattedFirst ? runs2 : runs1;
      const teamBWickets = teamABattedFirst ? wickets2 : wickets1;

      // Compute Top 3 Batters & Top 2 Active Bowlers for Team A
      const topBattersA = [...teamABatCard].sort((a,b) => (b.runs || 0) - (a.runs || 0)).slice(0, 3);
      while (topBattersA.length < 3) topBattersA.push({ name: "-", runs: 0, balls: 0 });

      const topBowlersA = [...teamABowlCard]
        .filter(bw => (bw.overs || 0) > 0 || (bw.balls || 0) > 0)
        .sort((a,b) => (b.wickets || 0) - (a.wickets || 0) || (a.runsConceded || 0) - (b.runsConceded || 0))
        .slice(0, 2);
      while (topBowlersA.length < 2) topBowlersA.push({ name: "-", wickets: 0, runsConceded: 0, overs: 0 });

      // Compute Top 3 Batters & Top 2 Active Bowlers for Team B
      const topBattersB = [...teamBBatCard].sort((a,b) => (b.runs || 0) - (a.runs || 0)).slice(0, 3);
      while (topBattersB.length < 3) topBattersB.push({ name: "-", runs: 0, balls: 0 });

      const topBowlersB = [...teamBBowlCard]
        .filter(bw => (bw.overs || 0) > 0 || (bw.balls || 0) > 0)
        .sort((a,b) => (b.wickets || 0) - (a.wickets || 0) || (a.runsConceded || 0) - (b.runsConceded || 0))
        .slice(0, 2);
      while (topBowlersB.length < 2) topBowlersB.push({ name: "-", wickets: 0, runsConceded: 0, overs: 0 });

      const championName = match.result?.winner || standings[0]?.teamName || "CHAMPION";
      const winnerIsTeamA = match.result?.winner === teamAName;

      const finishedScreen = document.getElementById("pb-finished-screen");
      if (finishedScreen) {
        finishedScreen.innerHTML = `
          <!-- VINTAGE FINAL WINNING SCORECARD CARD (Responsive Mobile Fixed) -->
          <div id="final-winning-scorecard-card" style="background: #FAF6ED; border: 4px solid #1E1E1E; padding: 1.5rem 0.75rem; max-width: 580px; width: 100%; margin: 0 auto 1.5rem auto; box-shadow: 8px 8px 0px #1E1E1E; font-family: var(--font-family); color: #111111; text-align: center; border-radius: 0px; position: relative; box-sizing: border-box; overflow: hidden;">
            <!-- Header row -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1E1E1E; padding-bottom: 0.65rem; margin-bottom: 1.25rem;">
              <span style="font-weight: 900; font-size: 1.2rem; letter-spacing: 0.05em; font-family: var(--font-family-mono); color: #111111;">SAMARG XI</span>
              <span style="font-size: 0.75rem; font-weight: 900; text-transform: uppercase; color: #444444; letter-spacing: 0.05em;">WORLD CUP FINAL • ROOM ${roomCode}</span>
            </div>

            <!-- Big Team vs Team Scores -->
            <div style="display: flex; justify-content: space-around; align-items: center; margin-bottom: 0.5rem;">
              <div style="flex: 1; text-align: center; min-width: 0;">
                <div style="font-weight: 900; font-size: 1.25rem; color: #111111; border-bottom: ${winnerIsTeamA ? '3px solid #E53926' : 'none'}; display: inline-block; padding-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
                  ${teamAName.toUpperCase()}
                </div>
                <div style="font-size: 1.7rem; font-weight: 900; color: #E53926; font-family: var(--font-family-mono); margin-top: 0.2rem;">
                  ${teamARuns}/${teamAWickets}
                </div>
              </div>

              <div style="padding: 0 0.5rem; flex-shrink: 0;">
                <span style="font-size: 1.4rem; font-weight: 900; color: #C89B3C;">VS</span>
                <div style="font-size: 0.68rem; font-weight: 900; color: #666666; text-transform: uppercase;">FINAL</div>
              </div>

              <div style="flex: 1; text-align: center; min-width: 0;">
                <div style="font-weight: 900; font-size: 1.25rem; color: #111111; border-bottom: ${!winnerIsTeamA ? '3px solid #1E88E5' : 'none'}; display: inline-block; padding-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
                  ${teamBName.toUpperCase()}
                </div>
                <div style="font-size: 1.7rem; font-weight: 900; color: #1E88E5; font-family: var(--font-family-mono); margin-top: 0.2rem;">
                  ${teamBRuns}/${teamBWickets}
                </div>
              </div>
            </div>

            <!-- Gold Champion Banner -->
            <div style="background: linear-gradient(135deg, #FFF2A1, #D4AF37 60%, #aa820a); border: 2.5px solid #1E1E1E; padding: 0.65rem 0.5rem; margin: 1.15rem 0 1.35rem 0; font-weight: 900; font-size: 1.15rem; color: #111111; box-shadow: 3px 3px 0px #1E1E1E; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ★ CHAMPION - ${championName.toUpperCase()}
            </div>

            <!-- Side-by-side Top 3 Batters & Top 2 Bowlers Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; text-align: left;">
              <!-- Team A Top Performers Column -->
              <div style="display: flex; flex-direction: column; gap: 0.4rem; min-width: 0;">
                <div style="font-size: 0.72rem; font-weight: 900; text-transform: uppercase; color: #E53926; border-bottom: 1.5px solid #1E1E1E; padding-bottom: 0.2rem; margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${teamAName} TOP PERFORMERS
                </div>

                <!-- Top 3 Batters -->
                ${topBattersA.map((b, idx) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: ${idx === 0 ? '2px solid #C89B3C' : '1.5px solid #1E1E1E'}; padding: 0.35rem 0.5rem; box-shadow: ${idx === 0 ? '2px 2px 0px #C89B3C' : '1.5px 1.5px 0px #1E1E1E'}; gap: 0.25rem; overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 0.35rem; min-width: 0; flex: 1;">
                      <span style="font-size: 0.6rem; font-weight: 900; background: #E53926; color: #FFF; padding: 1px 4px; border: 1px solid #1E1E1E; flex-shrink: 0;">BAT</span>
                      <span style="font-weight: 800; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111111;">${b.name}</span>
                    </div>
                    <span style="font-family: var(--font-family-mono); font-weight: 900; font-size: 0.8rem; color: #111111; flex-shrink: 0; white-space: nowrap; margin-left: 0.25rem;">
                      ${b.runs}<span style="font-size: 0.68rem; font-weight: 700; color: #555555;">(${b.balls})</span>
                    </span>
                  </div>
                `).join("")}

                <!-- Top 2 Bowlers -->
                ${topBowlersA.map((bw, idx) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: ${idx === 0 ? '2px solid #C89B3C' : '1.5px solid #1E1E1E'}; padding: 0.35rem 0.5rem; box-shadow: ${idx === 0 ? '2px 2px 0px #C89B3C' : '1.5px 1.5px 0px #1E1E1E'}; margin-top: 0.1rem; gap: 0.25rem; overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 0.35rem; min-width: 0; flex: 1;">
                      <span style="font-size: 0.6rem; font-weight: 900; background: #1E88E5; color: #FFF; padding: 1px 4px; border: 1px solid #1E1E1E; flex-shrink: 0;">BOWL</span>
                      <span style="font-weight: 800; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111111;">${bw.name}</span>
                    </div>
                    <span style="font-family: var(--font-family-mono); font-weight: 900; font-size: 0.8rem; color: #111111; flex-shrink: 0; white-space: nowrap; margin-left: 0.25rem;">
                      ${bw.wickets}-${bw.runsConceded}
                    </span>
                  </div>
                `).join("")}
              </div>

              <!-- Team B Top Performers Column -->
              <div style="display: flex; flex-direction: column; gap: 0.4rem; min-width: 0;">
                <div style="font-size: 0.72rem; font-weight: 900; text-transform: uppercase; color: #1E88E5; border-bottom: 1.5px solid #1E1E1E; padding-bottom: 0.2rem; margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${teamBName} TOP PERFORMERS
                </div>

                <!-- Top 3 Batters -->
                ${topBattersB.map((b, idx) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: ${idx === 0 ? '2px solid #C89B3C' : '1.5px solid #1E1E1E'}; padding: 0.35rem 0.5rem; box-shadow: ${idx === 0 ? '2px 2px 0px #C89B3C' : '1.5px 1.5px 0px #1E1E1E'}; gap: 0.25rem; overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 0.35rem; min-width: 0; flex: 1;">
                      <span style="font-size: 0.6rem; font-weight: 900; background: #E53926; color: #FFF; padding: 1px 4px; border: 1px solid #1E1E1E; flex-shrink: 0;">BAT</span>
                      <span style="font-weight: 800; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111111;">${b.name}</span>
                    </div>
                    <span style="font-family: var(--font-family-mono); font-weight: 900; font-size: 0.8rem; color: #111111; flex-shrink: 0; white-space: nowrap; margin-left: 0.25rem;">
                      ${b.runs}<span style="font-size: 0.68rem; font-weight: 700; color: #555555;">(${b.balls})</span>
                    </span>
                  </div>
                `).join("")}

                <!-- Top 2 Bowlers -->
                ${topBowlersB.map((bw, idx) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: ${idx === 0 ? '2px solid #C89B3C' : '1.5px solid #1E1E1E'}; padding: 0.35rem 0.5rem; box-shadow: ${idx === 0 ? '2px 2px 0px #C89B3C' : '1.5px 1.5px 0px #1E1E1E'}; margin-top: 0.1rem; gap: 0.25rem; overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 0.35rem; min-width: 0; flex: 1;">
                      <span style="font-size: 0.6rem; font-weight: 900; background: #1E88E5; color: #FFF; padding: 1px 4px; border: 1px solid #1E1E1E; flex-shrink: 0;">BOWL</span>
                      <span style="font-weight: 800; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111111;">${bw.name}</span>
                    </div>
                    <span style="font-family: var(--font-family-mono); font-weight: 900; font-size: 0.8rem; color: #111111; flex-shrink: 0; white-space: nowrap; margin-left: 0.25rem;">
                      ${bw.wickets}-${bw.runsConceded}
                    </span>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Card Footer -->
            <div style="border-top: 2px solid #1E1E1E; margin-top: 1.35rem; padding-top: 0.65rem; font-size: 0.78rem; font-weight: 900; color: #444444; letter-spacing: 0.05em;">
              samarg.vercel.app • build your squad
            </div>
          </div>

          <!-- Scorecard Image Share Action Bar (No Download Button) -->
          <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 2rem; flex-wrap: wrap;">
            <button id="share-scorecard-img-btn" class="btn btn-accent btn-lg" style="font-weight: 900; background: #C89B3C; color: #111111; border: 2.5px solid #1E1E1E; box-shadow: 4px 4px 0px #1E1E1E; padding: 0.75rem 1.75rem; font-size: 1.05rem;">
              📸 Share Scorecard Image & Link
            </button>
          </div>

          <h2 style="font-size: 1.5rem; color: #C89B3C; border-bottom: 2px solid #1E1E1E; padding-bottom: 0.5rem; text-transform: uppercase; font-weight: 900;">
            Final Tournament Standings
          </h2>
          <table class="standings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Pld</th>
                <th>Won</th>
                <th>Lost</th>
                <th>Tied</th>
                <th>Points</th>
                <th>Net Run Rate</th>
              </tr>
            </thead>
            <tbody>
              ${standings.map((s, index) => {
                const isUser = s.teamId === currentUid;
                return `
                  <tr class="${isUser ? 'player-row-highlight' : ''}">
                    <td>#${index + 1}</td>
                    <td>${s.teamName} ${isUser ? '<span class="you-tag">YOU</span>' : ''}</td>
                    <td>${s.wins + s.losses + s.ties}</td>
                    <td>${s.wins}</td>
                    <td>${s.losses}</td>
                    <td>${s.ties}</td>
                    <td><strong>${s.points}</strong></td>
                    <td style="font-family: var(--font-family-mono);">${s.nrr > 0 ? '+' : ''}${s.nrr}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>

          <div class="user-stats-card" style="margin-top: 2rem;">
            <h3 style="color: #C89B3C; text-transform: uppercase; font-size: 1.1rem; margin-bottom: 1rem; font-weight: 900;">Chemistry & Partnership Report</h3>
            <div style="font-size: 0.95rem; color: #333333; font-weight: 700; line-height: 1.6; display: flex; flex-direction: column; gap: 0.6rem;">
              <div>✓ <strong>teammate chemistry links</strong> were active for players who played in the same national squads historically.</div>
              <div>✓ Batting partnerships combining <strong>Anchor</strong> and <strong>Aggressor</strong> temperaments boosted strike rotations.</div>
              <div>✓ Captains with <strong>Calm-under-pressure</strong> composure successfully stabilized wickets cascades.</div>
            </div>
          </div>

          <div class="flex justify-between" style="margin-top: 2rem;">
            <button id="post-submit-leaderboard-btn" class="btn btn-accent">Submit to Leaderboard</button>
            <a href="#/" class="btn btn-secondary">Return to Lobby</a>
          </div>
        `;

        // Share Scorecard Image & Website Link click handler
        const shareImgBtn = document.getElementById("share-scorecard-img-btn");
        if (shareImgBtn) {
          shareImgBtn.addEventListener("click", async () => {
            try {
              shareImgBtn.disabled = true;
              shareImgBtn.innerText = "⏳ Preparing Scorecard Image...";
              const cardEl = document.getElementById("final-winning-scorecard-card");
              const shareUrl = "https://samarg.vercel.app/";
              const shareNote = `🏆 SAMARG T20 WORLD CUP FINAL SCORECARD 🏆\n★ CHAMPION: ${championName.toUpperCase()}\nRoom Code: ${roomCode}\n\n${teamAName}: ${teamARuns}/${teamAWickets}\n${teamBName}: ${teamBRuns}/${teamBWickets}\n\nBuild your squad & play live:\n${shareUrl}`;

              if (!cardEl) {
                showToast("Scorecard element not found", true);
                return;
              }

              const canvas = await html2canvas(cardEl, { scale: 2, useCORS: true, backgroundColor: "#FAF6ED" });
              
              canvas.toBlob(async (blob) => {
                if (!blob) {
                  showToast("Could not generate image", true);
                  return;
                }

                const file = new File([blob], `samarg_scorecard_${roomCode}.png`, { type: "image/png" });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  try {
                    await navigator.share({
                      title: "SAMARG T20 World Cup Scorecard",
                      text: shareNote,
                      files: [file]
                    });
                    showToast("Scorecard image shared successfully!");
                    return;
                  } catch (e) {
                    if (e.name === "AbortError") return;
                  }
                }

                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: "SAMARG T20 World Cup Scorecard",
                      text: shareNote,
                      url: shareUrl
                    });
                    showToast("Scorecard link shared!");
                    return;
                  } catch (e) {
                    if (e.name === "AbortError") return;
                  }
                }

                try {
                  await navigator.clipboard.writeText(shareNote);
                  showToast("📋 Scorecard note & website link copied to clipboard!");
                } catch (e) {
                  prompt("Copy your scorecard note & website link:", shareNote);
                }
              }, "image/png");
            } catch (err) {
              showToast(err.message, true);
            } finally {
              shareImgBtn.disabled = false;
              shareImgBtn.innerText = "📸 Share Scorecard Image & Link";
            }
          });
        }

        const submitBtn = document.getElementById("post-submit-leaderboard-btn");
        if (submitBtn) {
          submitBtn.addEventListener("click", async () => {
            try {
              submitBtn.disabled = true;
              const submitFn = httpsCallable(functions, "submitToLeaderboard");
              await submitFn({ code: roomCode, displayName: auth.currentUser?.displayName });
              showToast("Roster performance submitted to leaderboard!");
            } catch (err) {
              submitBtn.disabled = false;
              showToast(err.message, true);
            }
          });
        }

        finishedScreen.style.display = "block";
      }
      return;
    }

    const ball = allDeliveries[ballIndex];
    let nextDelay = delayNormal;

    const commList = document.getElementById("pb-commentary-feed-list");
    const overList = document.getElementById("pb-current-over-list");

    const bMap = ball.innings === 1 ? bMap1 : bMap2;
    const bwMap = ball.innings === 1 ? bwMap1 : bwMap2;

    const strikerName = ball.strikerName || (bMap[ball.strikerId] ? bMap[ball.strikerId].name : "Striker");
    const bowlerName = ball.bowlerName || (bwMap[ball.bowlerId] ? bwMap[ball.bowlerId].name : "Bowler");
    const nonStrikerName = ball.nonStrikerName || (bMap[ball.nonStrikerId] ? bMap[ball.nonStrikerId].name : "Non-Striker");

    const striker = getBatter(ball.strikerId || "striker_" + ballIndex, strikerName);
    const nonStriker = getBatter(ball.nonStrikerId || "nonstriker_" + ballIndex, nonStrikerName);
    const bowler = getBowler(ball.bowlerId || "bowler_" + ballIndex, bowlerName);

    // Update striker stats
    if (!ball.isExtra || ball.extraType === "bye") {
      striker.runs += (ball.runs || 0);
      striker.balls += 1;
      if (ball.runs === 4) striker.fours += 1;
      if (ball.runs === 6) striker.sixes += 1;
    } else if (ball.extraType === "noball") {
      const batRuns = ball.runs > 0 ? ball.runs - 1 : 0;
      striker.runs += batRuns;
      if (batRuns === 4) striker.fours += 1;
      if (batRuns === 6) striker.sixes += 1;
    }

    if (ball.isWicket) {
      striker.out = true;
    }

    // Update bowler stats
    if (ball.extraType !== "wide" && ball.extraType !== "noball") {
      bowler.balls += 1;
    }
    bowler.runsConceded += (ball.runs || 0) + (ball.extraType === "wide" || ball.extraType === "noball" ? 1 : 0);
    if (ball.isWicket) {
      bowler.wickets += 1;
    }

    // Process team runs and wickets counters
    const isTeamABat = (ball.innings === 1 && teamABattedFirst) || (ball.innings === 2 && !teamABattedFirst);

    if (isTeamABat) {
      if (ball.isWicket) wickets1++;
      if (!ball.isExtra || ball.extraType === "bye") {
        runs1 += ball.runs;
      } else if (ball.extraType === "wide" || ball.extraType === "noball") {
        runs1 += 1;
      }
      
      const rA = document.getElementById("pb-runsA");
      const oA = document.getElementById("pb-oversA");
      if (rA) rA.innerText = `${runs1}/${wickets1}`;
      if (oA) oA.innerText = formatOvers(ball.over, ball.ballInOver);
    } else {
      if (ball.innings === 2) {
        const tT = document.getElementById("pb-target-ticker");
        const tR = document.getElementById("pb-target-runs");
        if (tT) tT.style.display = "block";
        if (tR) tR.innerText = `${i1.totalRuns + 1} runs`;
      }

      if (ball.isWicket) wickets2++;
      if (!ball.isExtra || ball.extraType === "bye") {
        runs2 += ball.runs;
      } else if (ball.extraType === "wide" || ball.extraType === "noball") {
        runs2 += 1;
      }

      const rB = document.getElementById("pb-runsB");
      const oB = document.getElementById("pb-oversB");
      if (rB) rB.innerText = `${runs2}/${wickets2}`;
      if (oB) oB.innerText = formatOvers(ball.over, ball.ballInOver);
    }

    // Update live side-by-side batter & bowler scorecard widgets
    const strikerEl = document.getElementById("pb-live-striker");
    const nonStrikerEl = document.getElementById("pb-live-nonstriker");
    const bowlerEl = document.getElementById("pb-live-bowler");
    const bowlerEconEl = document.getElementById("pb-live-bowler-econ");

    if (strikerEl) {
      strikerEl.innerHTML = `<span>🏏 ${striker.name} *</span><span style="color: #C89B3C; font-weight: 900;">${striker.runs} (${striker.balls}) • ${striker.fours}x4 ${striker.sixes}x6</span>`;
    }
    if (nonStrikerEl) {
      nonStrikerEl.innerHTML = `<span>Non-Striker: ${nonStriker.name}</span><span style="font-weight: 800; color: #333333;">${nonStriker.runs} (${nonStriker.balls})</span>`;
    }
    if (bowlerEl) {
      const ovStr = formatBowlerOvers(bowler.balls);
      const econVal = bowler.balls > 0 ? ((bowler.runsConceded / bowler.balls) * 6).toFixed(2) : '0.00';
      bowlerEl.innerHTML = `<span>⚡ ${bowler.name}</span><span style="color: #1E88E5; font-weight: 900;">${bowler.wickets}-${bowler.runsConceded} (${ovStr} ov)</span>`;
      if (bowlerEconEl) bowlerEconEl.innerText = `Economy: ${econVal} rpo`;
    }

    // Over outcome circles tracker
    if (ball.ballInOver === 1) {
      overOutcomes.length = 0; // Clear over outcomes bubble list at start of over
    }

    let bubbleVal = ball.runs;
    let bubbleClass = "";
    if (ball.isWicket) {
      bubbleVal = "W";
      bubbleClass = "wicket";
      nextDelay = delayNotable;
    } else if (ball.runs === 4 || ball.runs === 6) {
      bubbleClass = "boundary";
      nextDelay = delayNotable;
    } else if (ball.isExtra) {
      bubbleVal = ball.extraType === "wide" ? "WD" : "NB";
    }

    overOutcomes.push(`<div class="over-ball-circle ${bubbleClass}">${bubbleVal}</div>`);
    if (overList) {
      overList.innerHTML = overOutcomes.join("");
    }

    // Append commentary item
    if (commList) {
      const commItem = document.createElement("div");
      commItem.className = `commentary-item ${ball.isWicket ? 'wicket' : (ball.runs >= 4 ? 'boundary' : '')}`;
      commItem.innerHTML = `<span class="comm-ball">Inn ${ball.innings} - ${ball.over}.${ball.ballInOver}</span> ${ball.commentary}`;
      
      commList.insertBefore(commItem, commList.firstChild);
      if (commList.childNodes.length > 80) {
        commList.lastChild.remove();
      }
    }

    ballIndex++;
    setTimeout(tickPlayback, nextDelay);
  }

  // Launch ticks
  tickPlayback();
}
