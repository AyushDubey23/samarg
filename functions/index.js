const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const { getDatabase } = require("firebase-admin/database");
const admin = require("firebase-admin");

const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" || !!process.env.FIREBASE_DATABASE_EMULATOR_HOST;

// Initialize Firebase Admin
admin.initializeApp({
  databaseURL: isEmulator
    ? "http://127.0.0.1:9000?ns=samarg-7be68"
    : "https://samarg-7be68-default-rtdb.firebaseio.com"
});
const db = getFirestore();
const rtdb = getDatabase();
const ServerValue = admin.database.ServerValue || require("firebase-admin/database").ServerValue;

const BallEngine = require("./engine/ballEngine");
const { validateDraftXI } = require("./engine/draftRules");

// Helper to convert overs to actual balls
function oversToBalls(overs) {
  const completedOvers = Math.floor(overs);
  const fraction = Math.round((overs - completedOvers) * 10);
  return completedOvers * 6 + fraction;
}

// Generates a random alphanumeric room code
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing chars like O, I, 1, 0
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 1. createRoom - Creates a new RTDB room lobby
 */
exports.createRoom = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { mode, difficulty, turnTimerSeconds, password, displayName } = request.data;
  if (!mode || !difficulty || !turnTimerSeconds) {
    throw new HttpsError("invalid-argument", "Missing required room parameters.");
  }

  try {
    const code = generateRoomCode();
    const roomRef = rtdb.ref(`rooms/${code}`);

    const hostName = displayName || "Host Player";

    const initialRoomState = {
      hostUid: request.auth.uid,
      mode, // duel (2-player), cup (4-player), solo (campaign)
      difficulty, // openBook, blindScout
      turnTimerSeconds: parseInt(turnTimerSeconds, 10) || 20,
      password: password || null,
      status: "lobby",
      createdAt: ServerValue.TIMESTAMP,
      players: {
        [request.auth.uid]: {
          displayName: hostName,
          joinedAt: ServerValue.TIMESTAMP,
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

    await roomRef.set(initialRoomState);
    return { code };
  } catch (error) {
    console.error("Error in createRoom:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 2. joinRoom - Adds a player to a lobby
 */
exports.joinRoom = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { code, password, displayName } = request.data;
  if (!code) {
    throw new HttpsError("invalid-argument", "Missing room code.");
  }

  try {
    const roomRef = rtdb.ref(`rooms/${code}`);
    const snapshot = await roomRef.get();
    if (!snapshot.exists()) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const room = snapshot.val();
    if (room.status !== "lobby") {
      throw new HttpsError("failed-precondition", "Draft has already started in this room.");
    }

    if (room.password && room.password !== password) {
      throw new HttpsError("permission-denied", "Incorrect room password.");
    }

    const playersCount = Object.keys(room.players || {}).length;
    if (room.mode === "duel" && playersCount >= 2) {
      throw new HttpsError("failed-precondition", "Duel lobby is full (max 2 players).");
    }
    if (room.mode === "cup" && playersCount >= 4) {
      throw new HttpsError("failed-precondition", "Cup lobby is full (max 4 players).");
    }
    if (room.mode === "solo" && playersCount >= 1) {
      throw new HttpsError("failed-precondition", "Solo campaigns are single player only.");
    }

    const joinName = displayName || `Player ${playersCount + 1}`;

    await roomRef.child(`players/${request.auth.uid}`).set({
      displayName: joinName,
      joinedAt: ServerValue.TIMESTAMP,
      ready: false,
      connectionStatus: "online"
    });

    return { success: true };
  } catch (error) {
    console.error("Error in joinRoom:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 3. startDraft - Starts the draft phase (host only)
 */
exports.startDraft = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { code } = request.data;
  if (!code) {
    throw new HttpsError("invalid-argument", "Missing room code.");
  }

  try {
    const roomRef = rtdb.ref(`rooms/${code}`);
    const snapshot = await roomRef.get();
    if (!snapshot.exists()) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const room = snapshot.val();
    if (room.hostUid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Only the host can start the draft.");
    }

    const players = room.players || {};
    const playerUids = Object.keys(players);

    // Validate player counts
    if (room.mode === "duel" && playerUids.length !== 2) {
      throw new HttpsError("failed-precondition", "Duel requires exactly 2 players to start.");
    }
    if (room.mode === "cup" && playerUids.length !== 4) {
      throw new HttpsError("failed-precondition", "Cup requires exactly 4 players to start.");
    }
    if (room.mode === "solo" && playerUids.length !== 1) {
      throw new HttpsError("failed-precondition", "Solo campaign requires 1 player.");
    }

    // Validate everyone is ready
    const allReady = Object.values(players).every(p => p.ready);
    if (!allReady) {
      throw new HttpsError("failed-precondition", "All players must be marked ready to start.");
    }

    // Randomise turn order
    const shuffledUids = [...playerUids].sort(() => Math.random() - 0.5);

    // Initialize squads structures
    const squads = {};
    shuffledUids.forEach(uid => {
      squads[uid] = {
        ready: false,
        slots: Array(11).fill(null), // 11 empty slots to place drafted players
        bench: [] // backups/unplaced pool
      };
    });

    const updates = {
      status: "drafting",
      squads,
      draftState: {
        turnOrder: shuffledUids,
        turnIndex: 0,
        activePlayerUid: shuffledUids[0],
        currentReveal: null,
        turnDeadline: null,
        claimedPlayerIds: []
      }
    };

    await roomRef.update(updates);
    return { success: true };
  } catch (error) {
    console.error("Error in startDraft:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 4. rollSquad - Rolls a random historical squad for active turn
 */
exports.rollSquad = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { code } = request.data;
  if (!code) {
    throw new HttpsError("invalid-argument", "Missing room code.");
  }

  try {
    const roomRef = rtdb.ref(`rooms/${code}`);
    const snapshot = await roomRef.get();
    if (!snapshot.exists()) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const room = snapshot.val();
    if (room.status !== "drafting") {
      throw new HttpsError("failed-precondition", "Draft is not active.");
    }

    const draftState = room.draftState || {};
    if (draftState.activePlayerUid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "It is not your turn to roll.");
    }

    if (draftState.currentReveal) {
      throw new HttpsError("failed-precondition", "A squad has already been rolled. Pick a player first.");
    }

    // Fetch squads from Firestore
    const squadsSnap = await db.collection("squads").get();
    const allSquads = [];
    squadsSnap.forEach(doc => {
      allSquads.push({ id: doc.id, ...doc.data() });
    });

    const claimedIds = new Set(draftState.claimedPlayerIds || []);

    // Filter squads that contain at least one unclaimed player
    const eligibleSquads = allSquads.filter(sq => {
      return sq.playerIds.some(pid => !claimedIds.has(pid));
    });

    if (eligibleSquads.length === 0) {
      throw new HttpsError("not-found", "No squads with unclaimed players remaining.");
    }

    // Group eligible squads by nationalTeam, weighting underdog/weaker teams (75% chance)
    const UNDERDOG_TEAMS = ['NED', 'ZIM', 'IRE', 'AFG', 'BAN', 'SL', 'WI', 'KEN', 'SCO', 'CAN', 'USA', 'UAE', 'Netherlands', 'Zimbabwe', 'Ireland', 'Afghanistan', 'Bangladesh', 'Sri Lanka', 'West Indies'];
    const squadByTeam = {};
    eligibleSquads.forEach(sq => {
      const team = sq.nationalTeam || "IND";
      if (!squadByTeam[team]) squadByTeam[team] = [];
      squadByTeam[team].push(sq);
    });

    const availableTeams = Object.keys(squadByTeam);
    const availableUnderdogs = availableTeams.filter(t => UNDERDOG_TEAMS.includes(t));
    const availableHeavyweights = availableTeams.filter(t => !UNDERDOG_TEAMS.includes(t));

    let chosenTeam;
    if (availableUnderdogs.length > 0 && (Math.random() < 0.75 || availableHeavyweights.length === 0)) {
      chosenTeam = availableUnderdogs[Math.floor(Math.random() * availableUnderdogs.length)];
    } else if (availableHeavyweights.length > 0) {
      chosenTeam = availableHeavyweights[Math.floor(Math.random() * availableHeavyweights.length)];
    } else {
      chosenTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
    }
    const selectedSquad = squadByTeam[chosenTeam][Math.floor(Math.random() * squadByTeam[chosenTeam].length)];

    // Fetch players of this squad
    const playerRefs = selectedSquad.playerIds.map(pid => db.collection("players").doc(pid));
    const playersSnap = await db.getAll(...playerRefs);
    const players = playersSnap
      .filter(doc => doc.exists)
      .map(doc => {
        const data = doc.data();
        // Respect Difficulty Masking at draft reveal
        if (room.difficulty === "blindScout") {
          return {
            id: doc.id,
            name: data.name,
            nationalTeam: data.nationalTeam,
            tournamentEdition: data.tournamentEdition,
            role: data.role,
            isWicketkeeper: data.isWicketkeeper,
            batRating: "?", // Masked
            bowlRating: "?", // Masked
            battingAverage: data.battingAverage,
            strikeRate: data.strikeRate,
            economyRate: data.economyRate,
            bowlingType: data.bowlingType
          };
        }
        return {
          id: doc.id,
          name: data.name,
          nationalTeam: data.nationalTeam,
          tournamentEdition: data.tournamentEdition,
          role: data.role,
          isWicketkeeper: data.isWicketkeeper,
          batRating: data.batRating,
          bowlRating: data.bowlRating,
          battingAverage: data.battingAverage,
          strikeRate: data.strikeRate,
          economyRate: data.economyRate,
          bowlingType: data.bowlingType
        };
      });

    const turnTimer = parseInt(room.turnTimerSeconds, 10) || 20;
    const updates = {
      "draftState/currentReveal": {
        squadId: selectedSquad.id,
        editionId: selectedSquad.editionId,
        tournamentYear: selectedSquad.tournamentYear,
        nationalTeam: selectedSquad.nationalTeam,
        players
      },
      "draftState/turnDeadline": ServerValue.TIMESTAMP
    };

    // We write turnDeadline first, then modify it in a transaction or set it dynamically
    await roomRef.update(updates);

    // Fetch exact server time and set the absolute turnDeadline
    const deadlineSnap = await roomRef.child("draftState/turnDeadline").get();
    const serverTimestamp = deadlineSnap.val();
    const finalDeadline = serverTimestamp + (turnTimer * 1000);

    await roomRef.child("draftState/turnDeadline").set(finalDeadline);

    return { success: true };
  } catch (error) {
    console.error("Error in rollSquad:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 4b. scoutSquad - Scouts a random historical squad for solo campaign
 */
exports.scoutSquad = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  try {
    const squadsSnap = await db.collection("squads").get();
    if (squadsSnap.empty) {
      throw new HttpsError("not-found", "No squads found in database.");
    }
    const allSquads = [];
    squadsSnap.forEach(doc => allSquads.push({ id: doc.id, ...doc.data() }));
    const selectedSquad = allSquads[Math.floor(Math.random() * allSquads.length)];

    const playerRefs = selectedSquad.playerIds.map(pid => db.collection("players").doc(pid));
    const playersSnap = await db.getAll(...playerRefs);
    const players = playersSnap.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));

    return {
      squadId: selectedSquad.id,
      nationalTeam: selectedSquad.nationalTeam,
      tournamentYear: selectedSquad.tournamentYear,
      tournamentEdition: selectedSquad.tournamentEdition || `${selectedSquad.tournamentYear} World Cup`,
      isChampionSquad: selectedSquad.isChampionSquad || false,
      players
    };
  } catch (error) {
    console.error("Error in scoutSquad:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 5. claimPlayer - Claims a player from current reveal
 */
exports.claimPlayer = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { code, playerId } = request.data;
  if (!code || !playerId) {
    throw new HttpsError("invalid-argument", "Missing room code or playerId.");
  }

  try {
    const roomRef = rtdb.ref(`rooms/${code}`);
    const snapshot = await roomRef.get();
    if (!snapshot.exists()) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const room = snapshot.val();
    if (room.status !== "drafting") {
      throw new HttpsError("failed-precondition", "Draft is not active.");
    }

    const draftState = room.draftState || {};
    if (draftState.activePlayerUid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "It is not your turn.");
    }

    if (!draftState.currentReveal) {
      throw new HttpsError("failed-precondition", "Roll a squad first.");
    }

    // Verify player is in reveal list
    const revealPlayers = draftState.currentReveal.players || [];
    const playerInReveal = revealPlayers.find(p => p.id === playerId);
    if (!playerInReveal) {
      throw new HttpsError("not-found", "Player is not in the rolled squad.");
    }

    const claimedIds = draftState.claimedPlayerIds || [];
    if (claimedIds.includes(playerId)) {
      throw new HttpsError("failed-precondition", "Player has already been claimed by someone in this room.");
    }

    // Load full player details from Firestore to store on bench
    const playerSnap = await db.collection("players").doc(playerId).get();
    const fullPlayer = { id: playerSnap.id, ...playerSnap.data() };

    // Fetch user's current bench to push
    const userBench = room.squads[request.auth.uid].bench || [];
    const userSlots = room.squads[request.auth.uid].slots || [];
    const userTotalClaimed = userBench.length + userSlots.filter(s => s !== null).length;

    if (userTotalClaimed >= 15) {
      throw new HttpsError("failed-precondition", "You already have a full squad of 15.");
    }

    // Add to bench
    userBench.push(fullPlayer);
    claimedIds.push(playerId);

    // Rotate turn order logic (skip players who already have 15)
    const turnOrder = draftState.turnOrder || [];
    let nextIndex = (draftState.turnIndex + 1) % turnOrder.length;
    let iterations = 0;
    let nextPlayerUid = turnOrder[nextIndex];

    while (iterations < turnOrder.length) {
      const sq = (room.squads || {})[nextPlayerUid] || {};
      const pBench = (nextPlayerUid === request.auth.uid) ? userBench : (sq.bench || []);
      const pSlots = sq.slots || [];
      const pTotal = pBench.length + pSlots.filter(s => s !== null).length;

      if (pTotal < 15) {
        break; // Found eligible next player
      }
      nextIndex = (nextIndex + 1) % turnOrder.length;
      nextPlayerUid = turnOrder[nextIndex];
      iterations++;
    }

    // Check if draft is finished (everyone has 15 players)
    let allFinished = true;
    for (const uid of turnOrder) {
      const sq = (room.squads || {})[uid] || {};
      const pBench = (uid === request.auth.uid) ? userBench : (sq.bench || []);
      const pSlots = sq.slots || [];
      const pTotal = pBench.length + pSlots.filter(s => s !== null).length;
      if (pTotal < 15) {
        allFinished = false;
        break;
      }
    }

    const updates = {
      [`squads/${request.auth.uid}/bench`]: userBench,
      "draftState/claimedPlayerIds": claimedIds,
      "draftState/currentReveal": null,
      "draftState/turnDeadline": null
    };

    if (allFinished) {
      updates.status = "placing";
      updates["draftState/activePlayerUid"] = "";
    } else {
      updates["draftState/turnIndex"] = nextIndex;
      updates["draftState/activePlayerUid"] = nextPlayerUid;
    }

    await roomRef.update(updates);
    return { success: true };
  } catch (error) {
    console.error("Error in claimPlayer:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 6. expireTurn - Passes the turn if timer runs out with no pick
 */
exports.expireTurn = onCall({ cors: true }, async (request) => {
  const { code } = request.data;
  if (!code) {
    throw new HttpsError("invalid-argument", "Missing room code.");
  }

  try {
    const roomRef = rtdb.ref(`rooms/${code}`);
    const snapshot = await roomRef.get();
    if (!snapshot.exists()) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const room = snapshot.val();
    if (room.status !== "drafting") {
      return { success: false, reason: "Draft is not active." };
    }

    const draftState = room.draftState || {};
    if (!draftState.turnDeadline) {
      return { success: false, reason: "No turn countdown is running." };
    }

    // Get current server time
    const timeRef = roomRef.child("draftState/serverTimeCheck");
    await timeRef.set(ServerValue.TIMESTAMP);
    const timeSnap = await timeRef.get();
    const serverTime = timeSnap.val();
    await timeRef.remove();

    if (serverTime < draftState.turnDeadline) {
      return { success: false, reason: "Timer has not expired yet." };
    }

    // Expiry matches: Rotate turn skipping the rolled squad (no auto-pick)
    const turnOrder = draftState.turnOrder || [];
    let nextIndex = (draftState.turnIndex + 1) % turnOrder.length;
    let iterations = 0;
    let nextPlayerUid = turnOrder[nextIndex];

    while (iterations < turnOrder.length) {
      const pBench = room.squads[nextPlayerUid].bench || [];
      const pSlots = room.squads[nextPlayerUid].slots || [];
      const pTotal = pBench.length + pSlots.filter(s => s !== null).length;

      if (pTotal < 15) {
        break;
      }
      nextIndex = (nextIndex + 1) % turnOrder.length;
      nextPlayerUid = turnOrder[nextIndex];
      iterations++;
    }

    const updates = {
      "draftState/currentReveal": null,
      "draftState/turnDeadline": null,
      "draftState/turnIndex": nextIndex,
      "draftState/activePlayerUid": nextPlayerUid
    };

    await roomRef.update(updates);
    return { success: true };
  } catch (error) {
    console.error("Error in expireTurn:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 7. placePlayer - Places a bench player into a slot (1-indexed, 0 to 10 in array)
 */
exports.placePlayer = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { code, playerId, slotIndex } = request.data;
  if (!code || !playerId || slotIndex === undefined) {
    throw new HttpsError("invalid-argument", "Missing placing parameters.");
  }

  try {
    const roomRef = rtdb.ref(`rooms/${code}`);
    const snapshot = await roomRef.get();
    if (!snapshot.exists()) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const room = snapshot.val();
    const userSquad = room.squads[request.auth.uid];
    if (!userSquad) {
      throw new HttpsError("not-found", "Your squad record was not found.");
    }

    const bench = userSquad.bench || [];
    const rawSlots = userSquad.slots || [];
    const slots = Array(11).fill(null);
    for (let i = 0; i < 11; i++) {
      if (rawSlots[i]) slots[i] = rawSlots[i];
    }

    // Find player on bench
    const playerIdx = bench.findIndex(p => String(p.id) === String(playerId));
    if (playerIdx === -1) {
      throw new HttpsError("not-found", "Player is not on your bench.");
    }

    const playerToPlace = bench[playerIdx];

    // Remove from bench
    bench.splice(playerIdx, 1);

    // If target slot contains a player, move that player back to bench
    const existingPlayer = slots[slotIndex];
    if (existingPlayer) {
      bench.push(existingPlayer);
    }

    // Place new player
    slots[slotIndex] = playerToPlace;
    const sanitizedSlots = slots.map(s => s || null);

    await roomRef.child(`squads/${request.auth.uid}`).update({
      bench,
      slots: sanitizedSlots
    });

    return { success: true };
  } catch (error) {
    console.error("Error in placePlayer:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 8. finalizeSquad - Validates the squad layout and locks it
 */
exports.finalizeSquad = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { code, captainId, viceCaptainId } = request.data;
  if (!code || !captainId || !viceCaptainId) {
    throw new HttpsError("invalid-argument", "Missing code or designations.");
  }

  try {
    const roomRef = rtdb.ref(`rooms/${code}`);
    const snapshot = await roomRef.get();
    if (!snapshot.exists()) {
      throw new HttpsError("not-found", "Room not found.");
    }

    const room = snapshot.val();
    const userSquad = room.squads[request.auth.uid];
    if (!userSquad) {
      throw new HttpsError("not-found", "Your squad was not found.");
    }

    const slots = userSquad.slots || [];
    // Ensure all 11 slots are filled
    const filledSlotsCount = slots.filter(s => s !== null).length;
    if (filledSlotsCount !== 11) {
      throw new HttpsError("failed-precondition", "You must place exactly 11 players in your Playing XI before finalizing.");
    }

    // Run rules validation
    const rules = validateDraftXI(slots);
    if (!rules.valid) {
      throw new HttpsError("failed-precondition", rules.reason);
    }

    // Mark captain and vice-captain on squad
    // Add designation fields on individual player objects in slots
    const updatedSlots = slots.map(p => {
      return {
        ...p,
        isCaptain: String(p.id) === String(captainId),
        isViceCaptain: String(p.id) === String(viceCaptainId)
      };
    });

    await roomRef.child(`squads/${request.auth.uid}`).update({
      ready: true,
      slots: updatedSlots,
      captainId,
      viceCaptainId
    });

    // Check if ALL players are ready. If so, automatically simulate matches!
    const updatedSnap = await roomRef.get();
    const updatedRoom = updatedSnap.val();
    const playerUids = Object.keys(updatedRoom.players || {});
    const squadsMap = updatedRoom.squads || {};

    const allSquadsReady = playerUids.length > 0 && playerUids.every(uid => {
      const sq = squadsMap[uid];
      return sq && sq.ready === true && Array.isArray(sq.slots) && sq.slots.filter(s => s !== null).length === 11;
    });

    if (allSquadsReady) {
      try {
        await simulateRoomMatches(code, updatedRoom);
      } catch (simErr) {
        console.error("simulateRoomMatches failed inside finalizeSquad:", simErr);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in finalizeSquad:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

// Helper that executes simulated games and schedules synced starting times
async function simulateRoomMatches(code, room) {
  const roomRef = rtdb.ref(`rooms/${code}`);
  const players = room.players || {};
  const squads = room.squads || {};

  const uids = Object.keys(players);
  const engine = new BallEngine(Math.floor(Math.random() * 2147483647));

  const simulatedMatches = [];

  if (room.mode === "solo") {
    // Solo Campaign: Player XI vs 7 AI opponents (7 rounds)
    const playerUid = uids[0];
    const playerXI = squads[playerUid].slots;

    const allSquadsSnap = await db.collection("squads").get();
    const allSquads = [];
    if (!allSquadsSnap.empty) {
      allSquadsSnap.forEach(doc => {
        allSquads.push({ id: doc.id, ...doc.data() });
      });
    }

    const opponentTeams = [];
    let aiCounter = 1;

    if (allSquads.length >= 7) {
      const shuffled = allSquads.sort(() => 0.5 - Math.random());
      const aiSquads = shuffled.slice(0, 7);

      for (const squad of aiSquads) {
        const playerRefs = (squad.playerIds || []).map(pid => db.collection("players").doc(pid));
        let playersList = [];
        if (playerRefs.length > 0) {
          const playersSnap = await db.getAll(...playerRefs);
          playersList = playersSnap.filter(d => d.exists).map(doc => ({ id: doc.id, ...doc.data() }));
        }

        playersList.sort((a, b) => {
          const keeperA = a.role === "keeper" || a.isWicketkeeper ? 1 : 0;
          const keeperB = b.role === "keeper" || b.isWicketkeeper ? 1 : 0;
          if (keeperA !== keeperB) return keeperB - keeperA;
          const bowlA = a.bowlingType ? 1 : 0;
          const bowlB = b.bowlingType ? 1 : 0;
          return bowlB - bowlA;
        });

        opponentTeams.push({
          id: `ai_team_${aiCounter}`,
          name: `${squad.nationalTeam} (${squad.tournamentYear})`,
          players: playersList.slice(0, 11)
        });
        aiCounter++;
      }
    }

    // Fallback AI opponent generator if Firestore squads < 7
    const defaultAITeams = [
      { name: "Australia (2015)", country: "AUS", year: 2015 },
      { name: "England (2019)", country: "ENG", year: 2019 },
      { name: "Pakistan (1992)", country: "PAK", year: 1992 },
      { name: "West Indies (1975)", country: "WI", year: 1975 },
      { name: "Sri Lanka (1996)", country: "SL", year: 1996 },
      { name: "South Africa (2015)", country: "RSA", year: 2015 },
      { name: "New Zealand (2019)", country: "NZ", year: 2019 }
    ];

    while (opponentTeams.length < 7) {
      const idx = opponentTeams.length;
      const tm = defaultAITeams[idx] || defaultAITeams[0];
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
      opponentTeams.push({
        id: `ai_team_${idx + 1}`,
        name: tm.name,
        players: aiPlayers
      });
    }
        if (keeperA !== keeperB) return keeperB - keeperA;

        const bowlA = a.bowlingType ? 1 : 0;
        const bowlB = b.bowlingType ? 1 : 0;
        return bowlB - bowlA;
      });

      opponentTeams.push({
        id: `ai_team_${aiCounter}`,
        name: `${squad.nationalTeam} (${squad.tournamentYear})`,
        players: playersList.slice(0, 11)
      });
      aiCounter++;
    }

    const playerTeam = {
      id: playerUid,
      name: players[playerUid].displayName,
      players: playerXI
    };

    // Simulate 7 matches
    opponentTeams.forEach((opp, round) => {
      const sim = engine.simulateMatch(playerTeam, opp, false);
      simulatedMatches.push({
        matchId: `${code}_match_${round + 1}`,
        round: round + 1,
        teamAId: playerTeam.id,
        teamAName: playerTeam.name,
        teamBId: opp.id,
        teamBName: opp.name,
        ...sim
      });
    });

  } else if (room.mode === "duel") {
    // 2-player Duel: 1 single match
    const p1Uid = uids[0];
    const p2Uid = uids[1];

    const teamA = { id: p1Uid, name: players[p1Uid].displayName, players: squads[p1Uid].slots };
    const teamB = { id: p2Uid, name: players[p2Uid].displayName, players: squads[p2Uid].slots };

    const sim = engine.simulateMatch(teamA, teamB, true); // Knockout overrides tie
    simulatedMatches.push({
      matchId: `${code}_match_1`,
      round: 1,
      teamAId: p1Uid,
      teamAName: teamA.name,
      teamBId: p2Uid,
      teamBName: teamB.name,
      ...sim
    });

  } else if (room.mode === "cup") {
    // 4-player Cup: 6 matches (round-robin)
    // A vs B, A vs C, A vs D, B vs C, B vs D, C vs D
    const pairings = [
      [uids[0], uids[1], 1],
      [uids[0], uids[2], 2],
      [uids[0], uids[3], 3],
      [uids[1], uids[2], 3],
      [uids[1], uids[3], 2],
      [uids[2], uids[3], 1]
    ];

    let matchIdx = 1;
    pairings.forEach(([uid1, uid2, round]) => {
      const teamA = { id: uid1, name: players[uid1].displayName, players: squads[uid1].slots };
      const teamB = { id: uid2, name: players[uid2].displayName, players: squads[uid2].slots };

      const sim = engine.simulateMatch(teamA, teamB, false);
      simulatedMatches.push({
        matchId: `${code}_match_${matchIdx}`,
        round,
        teamAId: uid1,
        teamAName: teamA.name,
        teamBId: uid2,
        teamBName: teamB.name,
        ...sim
      });
      matchIdx++;
    });
  }

  // Calculate Standings Table
  const standings = uids.map(uid => ({
    teamId: uid,
    teamName: players[uid].displayName,
    wins: 0,
    losses: 0,
    ties: 0,
    points: 0,
    nrr: 0.0,
    runsScored: 0,
    ballsFaced: 0,
    runsConceded: 0,
    ballsBowled: 0
  }));

  if (room.mode === "solo") {
    // Add AI opponents to standings
    for (let i = 1; i <= 7; i++) {
      standings.push({
        teamId: `ai_team_${i}`,
        teamName: simulatedMatches[i - 1].teamBName,
        wins: 0,
        losses: 0,
        ties: 0,
        points: 0,
        nrr: 0.0,
        runsScored: 0,
        ballsFaced: 0,
        runsConceded: 0,
        ballsBowled: 0
      });
    }
  }

  // Accumulate NRR parameters
  simulatedMatches.forEach(m => {
    const tA = standings.find(s => s.teamId === m.teamAId);
    const tB = standings.find(s => s.teamId === m.teamBId);

    const i1 = m.inningsData[0];
    const i2 = m.inningsData[1];

    tA.runsScored += i1.totalRuns;
    tA.runsConceded += i2.totalRuns;
    tB.runsScored += i2.totalRuns;
    tB.runsConceded += i1.totalRuns;

    const ballsFacedA = i1.totalWickets === 10 ? 120 : oversToBalls(i1.oversBowled);
    tA.ballsFaced += ballsFacedA;
    tB.ballsBowled += ballsFacedA;

    let ballsFacedB = 0;
    if (i2.totalWickets === 10) {
      ballsFacedB = 120;
    } else if (i2.totalRuns >= i1.totalRuns + 1) {
      ballsFacedB = oversToBalls(i2.oversBowled);
    } else {
      ballsFacedB = 120;
    }
    tB.ballsFaced += ballsFacedB;
    tA.ballsBowled += ballsFacedB;

    if (m.result.winner === "tie") {
      tA.ties++;
      tB.ties++;
      tA.points += 1;
      tB.points += 1;
    } else {
      const winnerId = m.result.winner === m.teamAName ? m.teamAId : m.teamBId;
      const winner = standings.find(s => s.teamId === winnerId);
      const loser = standings.find(s => s.teamId === (winnerId === m.teamAId ? m.teamBId : m.teamAId));
      winner.wins++;
      loser.losses++;
      winner.points += 2;
    }
  });

  // NRR math
  standings.forEach(s => {
    const oversFacedDec = s.ballsFaced / 6;
    const oversBowledDec = s.ballsBowled / 6;
    const nrrScored = oversFacedDec > 0 ? (s.runsScored / oversFacedDec) : 0;
    const nrrConceded = oversBowledDec > 0 ? (s.runsConceded / oversBowledDec) : 0;
    s.nrr = parseFloat((nrrScored - nrrConceded).toFixed(3));
  });

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    return b.wins - a.wins;
  });

  // Calculate startsAt timestamp (server time + 2 seconds buffer for sync play)
  const timeRef = roomRef.child("draftState/serverTimeCheck");
  await timeRef.set(ServerValue.TIMESTAMP);
  const timeSnap = await timeRef.get();
  const serverTime = timeSnap.val();
  await timeRef.remove();

  const startsAt = serverTime + 2000;

  // Mirror finished room data to durable Firestore collection
  const finalRoomData = {
    code,
    mode: room.mode,
    difficulty: room.difficulty,
    turnTimerSeconds: room.turnTimerSeconds,
    hostUid: room.hostUid,
    players: room.players,
    squads: room.squads,
    matches: simulatedMatches,
    standingsTable: standings,
    startsAt,
    simulatedAt: new Date().toISOString()
  };

  await db.collection("rooms").doc(code).set(finalRoomData);

  // Write simulation triggers back to RTDB for synced client playback
  await roomRef.update({
    status: "simulating",
    "simulation/matches": simulatedMatches,
    "simulation/standingsTable": standings,
    "simulation/startsAt": startsAt
  });
}

/**
 * 9. submitToLeaderboard - Writes completed campaign wins to high-scores Firestore
 */
exports.submitToLeaderboard = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { code, displayName } = request.data;
  if (!code) {
    throw new HttpsError("invalid-argument", "Missing room code.");
  }

  try {
    const roomSnap = await db.collection("rooms").doc(code).get();
    if (!roomSnap.exists) {
      throw new HttpsError("not-found", "Durable room history not found.");
    }

    const room = roomSnap.data();
    const standing = room.standingsTable.find(s => s.teamId === request.auth.uid);
    if (!standing) {
      throw new HttpsError("not-found", "Player standings not found in this room.");
    }

    // Submit to leaderboard
    const perfectRun = room.mode === "solo" && standing.wins === 7 || room.mode === "cup" && standing.wins === 3;
    const name = displayName || "Anonymous Player";

    const entryId = `${request.auth.uid}_${code}`;
    const leaderboardRef = db.collection("leaderboard").doc(entryId);

    await leaderboardRef.set({
      uid: request.auth.uid,
      displayName: name,
      roomId: code,
      wins: standing.wins,
      losses: standing.losses,
      nrr: standing.nrr,
      perfectRun,
      submittedAt: new Date().toISOString()
    });

    // Update User profile statistics
    const userRef = db.collection("users").doc(request.auth.uid);
    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      let totalCampaigns = 1;
      let perfectRuns = perfectRun ? 1 : 0;
      let bestNRR = standing.nrr;

      if (userSnap.exists) {
        const data = userSnap.data();
        totalCampaigns = (data.stats?.totalCampaigns || 0) + 1;
        perfectRuns = (data.stats?.perfectRuns || 0) + (perfectRun ? 1 : 0);
        bestNRR = Math.max(data.stats?.bestNRR || -99, standing.nrr);
      }

      transaction.set(userRef, {
        displayName: name,
        stats: {
          totalCampaigns,
          perfectRuns,
          bestNRR
        }
      }, { merge: true });
    });

    return { success: true };
  } catch (error) {
    console.error("Error in submitToLeaderboard:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * 10. Scheduled daily cleanups for ephemeral RTDB rooms
 */
exports.nightlyAggregateStats = onSchedule({ schedule: "every 24 hours" }, async (event) => {
  console.log("Cleaning up expired RTDB rooms (> 2 hours old)...");
  
  const now = Date.now();
  const roomsRef = rtdb.ref("rooms");
  const snapshot = await roomsRef.get();
  
  if (snapshot.exists()) {
    const rooms = snapshot.val();
    const batch = {};
    
    for (const code in rooms) {
      const room = rooms[code];
      const ageHours = (now - (room.createdAt || now)) / (1000 * 60 * 60);
      if (ageHours > 2) {
        batch[code] = null; // Clear from RTDB
      }
    }
    
    if (Object.keys(batch).length > 0) {
      await roomsRef.update(batch);
      console.log(`Cleaned up ${Object.keys(batch).length} expired room nodes.`);
    }
  }
});
