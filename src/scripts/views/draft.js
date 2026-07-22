import { auth, db, functions } from "../firebaseInit.js";
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

// Draft Slot definitions
export const DRAFT_SLOTS = [
  { id: 0, label: "Opener", allowedRoles: ["opener"] },
  { id: 1, label: "Opener", allowedRoles: ["opener"] },
  { id: 2, label: "Top-Order", allowedRoles: ["topOrder", "opener"] },
  { id: 3, label: "Top-Order", allowedRoles: ["topOrder", "opener"] },
  { id: 4, label: "Middle-Order", allowedRoles: ["middleOrder"] },
  { id: 5, label: "Middle-Order", allowedRoles: ["middleOrder"] },
  { id: 6, label: "Wicketkeeper", allowedRoles: ["keeper"] },
  { id: 7, label: "All-Rounder", allowedRoles: ["allRounder"] },
  { id: 8, label: "Spin Bowler", allowedRoles: ["spinner", "allRounder"] },
  { id: 9, label: "Pace Bowler", allowedRoles: ["pacer", "allRounder"] },
  { id: 10, label: "Flex Bowler (Pace/Spin)", allowedRoles: ["pacer", "spinner", "allRounder"] }
];

let activeCampaign = null;
let currentScoutedSquad = null;

export async function renderDraft(container) {
  const user = auth.currentUser;
  if (!user) {
    container.innerHTML = `<div class="text-center mt-4"><h3>Initializing Anonymous Session...</h3></div>`;
    // The router auth listener will reload this view once logged in
    return;
  }

  // 1. Fetch active draft campaign or create a new one
  try {
    const q = query(
      collection(db, "campaigns"),
      where("ownerUid", "==", user.uid),
      where("status", "==", "drafting")
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      // Load active campaign
      const activeDoc = snap.docs[0];
      activeCampaign = { id: activeDoc.id, ...activeDoc.data() };
    } else {
      // Create new campaign
      const newCampaignId = `camp_${user.uid}_${Date.now()}`;
      const newCampaignData = {
        ownerUid: user.uid,
        squadXI: Array(11).fill(null),
        rescoutsUsed: 0,
        status: "drafting",
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "campaigns", newCampaignId), newCampaignData);
      activeCampaign = { id: newCampaignId, ...newCampaignData };
    }
  } catch (err) {
    console.error("Error setting up campaign:", err);
    container.innerHTML = `<div class="text-center mt-4"><h3 class="text-red">Firebase connection error. Please refresh.</h3></div>`;
    return;
  }

  renderDraftLayout(container);
}

function renderDraftLayout(container) {
  container.innerHTML = `
    <div class="draft-header-panel">
      <h2>Assemble Your Playing XI</h2>
      <div id="balance-meters" class="balance-meters-container">
        <!-- Balance meters rendered here -->
      </div>
    </div>

    <!-- 11 Slots Grid -->
    <div class="slots-grid">
      ${DRAFT_SLOTS.map((slot, index) => {
        const player = activeCampaign.squadXI[index];
        return `
          <div class="slot-card ${player ? 'filled' : 'empty'}" data-slot-id="${index}">
            <div class="slot-header">
              <span class="slot-idx">${index + 1}</span>
              <span class="slot-lbl">${slot.label}</span>
            </div>
            <div class="slot-body">
              ${player ? `
                <div class="player-brief">
                  <div class="player-name">${player.name}</div>
                  <div class="player-meta">${player.nationalTeam} (${player.tournamentYear})</div>
                  <div class="player-badge-row">
                    <span class="role-badge">${player.role}</span>
                    <span class="stat-pill">Bat ${player.battingAverage.toFixed(0)}</span>
                    ${player.bowlingType ? `<span class="stat-pill">Bowl ${player.economyRate.toFixed(1)}</span>` : ""}
                  </div>
                </div>
                <button class="remove-player-btn" data-slot-id="${index}">Remove</button>
              ` : `
                <div class="empty-placeholder">Open Slot</div>
              `}
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <!-- Scout Control Panel -->
    <div class="scout-control-panel mt-4">
      <div class="scout-actions-row">
        <button id="scout-btn" class="btn btn-primary btn-lg">
          Scout Squad
        </button>
        <div class="rescouts-counter">
          Re-scouts remaining: <strong id="rescouts-left">${3 - activeCampaign.rescoutsUsed}</strong>
        </div>
      </div>
      <div id="scouted-squad-container" class="scouted-squad-container mt-2">
        <!-- Scouted squad list displays here -->
      </div>
    </div>

    <div class="submit-squad-row mt-4 text-center">
      <button id="finalize-squad-btn" class="btn btn-accent btn-lg" style="display: none; width: 300px; margin: 0 auto;">
        Assemble & Review XI
      </button>
    </div>
  `;

  // Attach event listeners
  attachEventListeners(container);
  updateMeters();
  checkSquadCompletion();
}

function attachEventListeners(container) {
  // Scout Button Click
  const scoutBtn = document.getElementById("scout-btn");
  scoutBtn.addEventListener("click", performScout);

  // Remove Player Buttons
  container.querySelectorAll(".remove-player-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const slotId = parseInt(btn.getAttribute("data-slot-id"));
      activeCampaign.squadXI[slotId] = null;
      await saveSquad();
      renderDraftLayout(container);
    });
  });

  // Finalize Squad button click
  const finalizeBtn = document.getElementById("finalize-squad-btn");
  finalizeBtn.addEventListener("click", () => {
    window.location.hash = "#/squad";
  });
}

async function performScout() {
  const scoutBtn = document.getElementById("scout-btn");
  const squadContainer = document.getElementById("scouted-squad-container");

  scoutBtn.disabled = true;
  scoutBtn.innerText = "Searching talent...";
  squadContainer.innerHTML = `<div class="scout-loader">Scouting global historical squads...</div>`;

  try {
    const scoutSquadFn = httpsCallable(functions, "scoutSquad");
    const result = await scoutSquadFn();
    currentScoutedSquad = result.data;
    renderScoutedSquad();
  } catch (err) {
    console.error("Scouting call failed:", err);
    showToast("Scouting failed. Please try again.", true);
    squadContainer.innerHTML = `<div class="text-red">Failed to load scouted squad.</div>`;
  } finally {
    scoutBtn.disabled = false;
    scoutBtn.innerText = "Scout Squad";
  }
}

function renderScoutedSquad() {
  const container = document.getElementById("scouted-squad-container");
  if (!container || !currentScoutedSquad) return;

  const isChamp = currentScoutedSquad.isChampionSquad;

  container.innerHTML = `
    <div class="scouted-squad-header ${isChamp ? 'champion-squad-glow' : ''}">
      <div>
        <h3>Scouted Squad: <span class="text-gold">${currentScoutedSquad.nationalTeam} (${currentScoutedSquad.tournamentYear})</span></h3>
        <p>${currentScoutedSquad.tournamentEdition}</p>
      </div>
      ${isChamp ? `<span class="champ-badge">🏆 Champion Squad</span>` : ""}
    </div>
    
    <div class="scouted-players-grid mt-2">
      ${currentScoutedSquad.players.map(player => {
        // Find which open slots this player fits
        const eligibleSlots = DRAFT_SLOTS.filter(slot => {
          const isSlotOpen = activeCampaign.squadXI[slot.id] === null;
          const roleAllowed = slot.allowedRoles.includes(player.role);
          return isSlotOpen && roleAllowed;
        });

        const isSelectable = eligibleSlots.length > 0;

        return `
          <div class="player-draft-card ${isSelectable ? '' : 'disabled'}">
            <div class="pd-header">
              <span class="pd-name">${player.name}</span>
              <span class="pd-role">${player.role}</span>
            </div>
            <div class="pd-stats">
              <div>Avg: <strong>${player.battingAverage.toFixed(0)}</strong></div>
              <div>SR: <strong>${player.strikeRate.toFixed(0)}</strong></div>
              ${player.bowlingType ? `<div>Econ: <strong>${player.economyRate.toFixed(1)}</strong></div>` : "<div>-</div>"}
            </div>
            <div class="pd-actions mt-1">
              ${isSelectable ? `
                <div class="draft-options">
                  <span class="draft-lbl">Draft into:</span>
                  <div class="draft-slots-list">
                    ${eligibleSlots.map(slot => `
                      <button class="draft-select-btn" data-player-id="${player.id}" data-slot-id="${slot.id}">
                        Slot ${slot.id + 1} (${slot.label})
                      </button>
                    `).join("")}
                  </div>
                </div>
              ` : `
                <span class="no-slot-lbl">No Eligible Slots</span>
              `}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  // Attach click listeners to all draft select buttons
  container.querySelectorAll(".draft-select-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const playerId = btn.getAttribute("data-player-id");
      const slotId = parseInt(btn.getAttribute("data-slot-id"));
      const playerObj = currentScoutedSquad.players.find(p => p.id === playerId);
      
      if (playerObj) {
        activeCampaign.squadXI[slotId] = playerObj;
        await saveSquad();
        currentScoutedSquad = null; // Clear scouted squad after successful pick
        showToast(`Drafted ${playerObj.name}!`);
        renderDraftLayout(document.getElementById("app-viewport"));
      }
    });
  });
}

async function saveSquad() {
  const campaignRef = doc(db, "campaigns", activeCampaign.id);
  await updateDoc(campaignRef, {
    squadXI: activeCampaign.squadXI
  });
}

function updateMeters() {
  const metersEl = document.getElementById("balance-meters");
  if (!metersEl) return;

  const squad = activeCampaign.squadXI;
  const draftedCount = squad.filter(p => p !== null).length;

  if (draftedCount === 0) {
    metersEl.innerHTML = `<span style="font-size: 0.9rem; color: var(--chalk-white-dark);">Draft players to view balance meters.</span>`;
    return;
  }

  // Calculate Batting depth (average batting rating of top 7 batsmen)
  const battingPlayers = squad.filter(p => p !== null).sort((a, b) => b.battingAverage - a.battingAverage);
  const avgBatting = battingPlayers.slice(0, 7).reduce((acc, p) => acc + p.battingAverage, 0) / Math.max(1, Math.min(7, battingPlayers.length));

  // Calculate Bowling options (any player who bowls)
  const bowlingOptions = squad.filter(p => p !== null && p.bowlingType !== null);
  const avgBowlingEcon = bowlingOptions.reduce((acc, p) => acc + (p.economyRate || 8.0), 0) / Math.max(1, bowlingOptions.length);

  metersEl.innerHTML = `
    <div class="meter-bar-container">
      <div class="meter-lbl">Batting Depth: <strong>${avgBatting.toFixed(0)}</strong></div>
      <div class="meter-track"><div class="meter-fill" style="width: ${avgBatting}%; background-color: var(--primary);"></div></div>
    </div>
    <div class="meter-bar-container">
      <div class="meter-lbl">Bowling Options: <strong>${bowlingOptions.length} / 5</strong></div>
      <div class="meter-track"><div class="meter-fill" style="width: ${Math.min(100, (bowlingOptions.length / 5) * 100)}%; background-color: ${bowlingOptions.length >= 5 ? 'var(--primary)' : 'var(--willow-tan)'};"></div></div>
    </div>
  `;
}

function checkSquadCompletion() {
  const finalizeBtn = document.getElementById("finalize-squad-btn");
  if (!finalizeBtn) return;

  const isComplete = activeCampaign.squadXI.every(p => p !== null);
  if (isComplete) {
    finalizeBtn.style.display = "block";
    // Hide scout panel when draft complete
    document.querySelector(".scout-control-panel").style.display = "none";
  } else {
    finalizeBtn.style.display = "none";
  }
}
