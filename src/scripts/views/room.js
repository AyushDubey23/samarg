import { auth, rtdb, db, functions } from "../firebaseInit.js";
import { ref, onValue, set, update, off } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { validateDraftXI } from "../utils/draftRules.js";
import { signInAnonymously } from "firebase/auth";

const AUTHENTIC_FALLBACK_SQUADS = [
  {
    nationalTeam: "India",
    tournamentYear: "2011",
    tournamentEdition: "2011 World Cup",
    players: [
      { id: "2011_ind_1", name: "Sachin Tendulkar", role: "opener", batRating: 98, bowlRating: 45, isWicketkeeper: false, battingAverage: 44.8, strikeRate: 86.2, economyRate: 5.1, bowlingType: "leg-spin", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_2", name: "Virender Sehwag", role: "opener", batRating: 94, bowlRating: 30, isWicketkeeper: false, battingAverage: 35.1, strikeRate: 104.3, economyRate: 5.2, bowlingType: "off-spin", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_3", name: "Gautam Gambhir", role: "topOrder", batRating: 91, bowlRating: 0, isWicketkeeper: false, battingAverage: 39.7, strikeRate: 85.2, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_4", name: "Virat Kohli", role: "topOrder", batRating: 96, bowlRating: 20, isWicketkeeper: false, battingAverage: 58.7, strikeRate: 93.6, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_5", name: "Yuvraj Singh", role: "allRounder", batRating: 90, bowlRating: 82, isWicketkeeper: false, battingAverage: 36.5, strikeRate: 87.6, economyRate: 4.8, bowlingType: "left-arm-orthodox", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_6", name: "MS Dhoni", role: "keeper", batRating: 92, bowlRating: 0, isWicketkeeper: true, battingAverage: 50.6, strikeRate: 89.0, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_7", name: "Suresh Raina", role: "middleOrder", batRating: 86, bowlRating: 50, isWicketkeeper: false, battingAverage: 35.3, strikeRate: 93.5, economyRate: 5.1, bowlingType: "off-spin", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_8", name: "Harbhajan Singh", role: "spinner", batRating: 45, bowlRating: 88, isWicketkeeper: false, battingAverage: 13.3, strikeRate: 81.0, economyRate: 4.3, bowlingType: "off-spin", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_9", name: "Zaheer Khan", role: "pacer", batRating: 30, bowlRating: 94, isWicketkeeper: false, battingAverage: 12.0, strikeRate: 72.0, economyRate: 4.9, bowlingType: "left-arm-pace", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_10", name: "Munaf Patel", role: "pacer", batRating: 15, bowlRating: 85, isWicketkeeper: false, battingAverage: 7.1, strikeRate: 52.0, economyRate: 4.9, bowlingType: "pace-medium", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_11", name: "Ashish Nehra", role: "pacer", batRating: 18, bowlRating: 84, isWicketkeeper: false, battingAverage: 5.8, strikeRate: 58.0, economyRate: 5.2, bowlingType: "left-arm-pace", nationalTeam: "IND", tournamentYear: 2011 }
    ]
  },
  {
    nationalTeam: "Australia",
    tournamentYear: "2015",
    tournamentEdition: "2015 World Cup",
    players: [
      { id: "2015_aus_1", name: "David Warner", role: "opener", batRating: 95, bowlRating: 10, isWicketkeeper: false, battingAverage: 45.3, strikeRate: 97.2, economyRate: null, bowlingType: null, nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_2", name: "Aaron Finch", role: "opener", batRating: 89, bowlRating: 15, isWicketkeeper: false, battingAverage: 38.9, strikeRate: 87.7, economyRate: null, bowlingType: null, nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_3", name: "Steve Smith", role: "topOrder", batRating: 96, bowlRating: 35, isWicketkeeper: false, battingAverage: 43.5, strikeRate: 87.1, economyRate: 5.3, bowlingType: "leg-spin", nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_4", name: "Michael Clarke", role: "topOrder", batRating: 92, bowlRating: 25, isWicketkeeper: false, battingAverage: 44.5, strikeRate: 78.9, economyRate: 5.0, bowlingType: "left-arm-orthodox", nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_5", name: "Shane Watson", role: "allRounder", batRating: 89, bowlRating: 84, isWicketkeeper: false, battingAverage: 40.5, strikeRate: 90.4, economyRate: 4.9, bowlingType: "pace-fast", nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_6", name: "Glenn Maxwell", role: "allRounder", batRating: 91, bowlRating: 72, isWicketkeeper: false, battingAverage: 35.2, strikeRate: 126.9, economyRate: 5.5, bowlingType: "off-spin", nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_7", name: "Brad Haddin", role: "keeper", batRating: 84, bowlRating: 0, isWicketkeeper: true, battingAverage: 31.5, strikeRate: 83.0, economyRate: null, bowlingType: null, nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_8", name: "James Faulkner", role: "allRounder", batRating: 82, bowlRating: 87, isWicketkeeper: false, battingAverage: 34.4, strikeRate: 104.2, economyRate: 5.5, bowlingType: "left-arm-pace", nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_9", name: "Mitchell Johnson", role: "pacer", batRating: 40, bowlRating: 94, isWicketkeeper: false, battingAverage: 16.1, strikeRate: 93.0, economyRate: 4.8, bowlingType: "left-arm-pace", nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_10", name: "Mitchell Starc", role: "pacer", batRating: 30, bowlRating: 97, isWicketkeeper: false, battingAverage: 11.2, strikeRate: 85.0, economyRate: 5.1, bowlingType: "left-arm-pace", nationalTeam: "AUS", tournamentYear: 2015 },
      { id: "2015_aus_11", name: "Josh Hazlewood", role: "pacer", batRating: 20, bowlRating: 91, isWicketkeeper: false, battingAverage: 7.2, strikeRate: 60.0, economyRate: 4.7, bowlingType: "pace-fast", nationalTeam: "AUS", tournamentYear: 2015 }
    ]
  },
  {
    nationalTeam: "England",
    tournamentYear: "2019",
    tournamentEdition: "2019 World Cup",
    players: [
      { id: "2019_eng_1", name: "Jason Roy", role: "opener", batRating: 91, bowlRating: 10, isWicketkeeper: false, battingAverage: 39.9, strikeRate: 105.5, economyRate: null, bowlingType: null, nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_2", name: "Jonny Bairstow", role: "opener", batRating: 92, bowlRating: 0, isWicketkeeper: false, battingAverage: 44.2, strikeRate: 103.6, economyRate: null, bowlingType: null, nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_3", name: "Joe Root", role: "topOrder", batRating: 94, bowlRating: 40, isWicketkeeper: false, battingAverage: 48.3, strikeRate: 86.8, economyRate: 5.6, bowlingType: "off-spin", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_4", name: "Eoin Morgan", role: "middleOrder", batRating: 89, bowlRating: 0, isWicketkeeper: false, battingAverage: 39.2, strikeRate: 91.1, economyRate: null, bowlingType: null, nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_5", name: "Ben Stokes", role: "allRounder", batRating: 92, bowlRating: 86, isWicketkeeper: false, battingAverage: 38.9, strikeRate: 95.8, economyRate: 6.0, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_6", name: "Jos Buttler", role: "keeper", batRating: 93, bowlRating: 0, isWicketkeeper: true, battingAverage: 39.5, strikeRate: 117.1, economyRate: null, bowlingType: null, nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_7", name: "Chris Woakes", role: "allRounder", batRating: 78, bowlRating: 88, isWicketkeeper: false, battingAverage: 24.8, strikeRate: 88.6, economyRate: 5.4, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_8", name: "Liam Plunkett", role: "pacer", batRating: 35, bowlRating: 86, isWicketkeeper: false, battingAverage: 21.0, strikeRate: 98.0, economyRate: 5.8, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_9", name: "Jofra Archer", role: "pacer", batRating: 30, bowlRating: 95, isWicketkeeper: false, battingAverage: 11.8, strikeRate: 90.0, economyRate: 4.6, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_10", name: "Adil Rashid", role: "spinner", batRating: 40, bowlRating: 89, isWicketkeeper: false, battingAverage: 18.2, strikeRate: 85.0, economyRate: 5.6, bowlingType: "leg-spin", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_11", name: "Mark Wood", role: "pacer", batRating: 20, bowlRating: 91, isWicketkeeper: false, battingAverage: 8.5, strikeRate: 70.0, economyRate: 5.5, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 }
    ]
  },
  {
    nationalTeam: "Pakistan",
    tournamentYear: "1992",
    tournamentEdition: "1992 World Cup",
    players: [
      { id: "1992_pak_1", name: "Aamer Sohail", role: "opener", batRating: 87, bowlRating: 30, isWicketkeeper: false, battingAverage: 31.8, strikeRate: 65.5, economyRate: 4.6, bowlingType: "left-arm-orthodox", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_2", name: "Rameez Raja", role: "opener", batRating: 86, bowlRating: 0, isWicketkeeper: false, battingAverage: 32.0, strikeRate: 63.0, economyRate: null, bowlingType: null, nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_3", name: "Imran Khan", role: "allRounder", batRating: 91, bowlRating: 93, isWicketkeeper: false, battingAverage: 33.4, strikeRate: 72.6, economyRate: 3.9, bowlingType: "pace-fast", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_4", name: "Javed Miandad", role: "topOrder", batRating: 95, bowlRating: 20, isWicketkeeper: false, battingAverage: 41.7, strikeRate: 67.0, economyRate: 4.6, bowlingType: "leg-spin", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_5", name: "Inzamam-ul-Haq", role: "middleOrder", batRating: 90, bowlRating: 0, isWicketkeeper: false, battingAverage: 39.5, strikeRate: 74.2, economyRate: null, bowlingType: null, nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_6", name: "Wasim Akram", role: "allRounder", batRating: 75, bowlRating: 98, isWicketkeeper: false, battingAverage: 16.5, strikeRate: 88.0, economyRate: 3.8, bowlingType: "left-arm-pace", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_7", name: "Moin Khan", role: "keeper", batRating: 82, bowlRating: 0, isWicketkeeper: true, battingAverage: 23.0, strikeRate: 81.3, economyRate: null, bowlingType: null, nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_8", name: "Mushtaq Ahmed", role: "spinner", batRating: 30, bowlRating: 90, isWicketkeeper: false, battingAverage: 8.5, strikeRate: 55.0, economyRate: 4.3, bowlingType: "leg-spin", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_9", name: "Aqib Javed", role: "pacer", batRating: 20, bowlRating: 88, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 50.0, economyRate: 4.3, bowlingType: "pace-fast", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_10", name: "Ijaz Ahmed", role: "middleOrder", batRating: 84, bowlRating: 35, isWicketkeeper: false, battingAverage: 32.3, strikeRate: 80.3, economyRate: 4.7, bowlingType: "pace-medium", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_11", name: "Zahid Fazal", role: "middleOrder", batRating: 78, bowlRating: 0, isWicketkeeper: false, battingAverage: 25.0, strikeRate: 65.0, economyRate: null, bowlingType: null, nationalTeam: "PAK", tournamentYear: 1992 }
    ]
  },
  {
    nationalTeam: "West Indies",
    tournamentYear: "1975",
    tournamentEdition: "1975 World Cup",
    players: [
      { id: "1975_wi_1", name: "Gordon Greenidge", role: "opener", batRating: 93, bowlRating: 0, isWicketkeeper: false, battingAverage: 45.0, strikeRate: 64.9, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_2", name: "Roy Fredericks", role: "opener", batRating: 88, bowlRating: 10, isWicketkeeper: false, battingAverage: 35.0, strikeRate: 68.0, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_3", name: "Alvin Kallicharran", role: "topOrder", batRating: 90, bowlRating: 0, isWicketkeeper: false, battingAverage: 34.4, strikeRate: 65.0, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_4", name: "Rohan Kanhai", role: "topOrder", batRating: 91, bowlRating: 0, isWicketkeeper: false, battingAverage: 37.5, strikeRate: 60.0, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_5", name: "Clive Lloyd", role: "middleOrder", batRating: 94, bowlRating: 30, isWicketkeeper: false, battingAverage: 39.5, strikeRate: 81.2, economyRate: 4.0, bowlingType: "pace-medium", nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_6", name: "Viv Richards", role: "topOrder", batRating: 97, bowlRating: 40, isWicketkeeper: false, battingAverage: 47.0, strikeRate: 90.2, economyRate: 4.4, bowlingType: "off-spin", nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_7", name: "Deryck Murray", role: "keeper", batRating: 80, bowlRating: 0, isWicketkeeper: true, battingAverage: 24.5, strikeRate: 55.0, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_8", name: "Keith Boyce", role: "allRounder", batRating: 70, bowlRating: 87, isWicketkeeper: false, battingAverage: 20.0, strikeRate: 75.0, economyRate: 3.5, bowlingType: "pace-medium", nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_9", name: "Bernard Julien", role: "allRounder", batRating: 68, bowlRating: 86, isWicketkeeper: false, battingAverage: 18.0, strikeRate: 70.0, economyRate: 3.6, bowlingType: "left-arm-pace", nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_10", name: "Andy Roberts", role: "pacer", batRating: 25, bowlRating: 94, isWicketkeeper: false, battingAverage: 10.0, strikeRate: 55.0, economyRate: 3.4, bowlingType: "pace-fast", nationalTeam: "WI", tournamentYear: 1975 },
      { id: "1975_wi_11", name: "Lance Gibbs", role: "spinner", batRating: 15, bowlRating: 92, isWicketkeeper: false, battingAverage: 5.0, strikeRate: 40.0, economyRate: 2.7, bowlingType: "off-spin", nationalTeam: "WI", tournamentYear: 1975 }
    ]
  },
  {
    nationalTeam: "India",
    tournamentYear: "2024",
    tournamentEdition: "2024 T20 World Cup",
    players: [
      { id: "2024_ind_1", name: "Rohit Sharma", role: "opener", batRating: 96, bowlRating: 0, isWicketkeeper: false, battingAverage: 32.0, strikeRate: 140.0, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_2", name: "Virat Kohli", role: "opener", batRating: 97, bowlRating: 15, isWicketkeeper: false, battingAverage: 48.7, strikeRate: 137.0, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_3", name: "Rishabh Pant", role: "keeper", batRating: 91, bowlRating: 0, isWicketkeeper: true, battingAverage: 34.6, strikeRate: 126.6, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_4", name: "Suryakumar Yadav", role: "topOrder", batRating: 98, bowlRating: 0, isWicketkeeper: false, battingAverage: 43.3, strikeRate: 167.7, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_5", name: "Shivam Dube", role: "middleOrder", batRating: 86, bowlRating: 65, isWicketkeeper: false, battingAverage: 30.0, strikeRate: 145.0, economyRate: 7.5, bowlingType: "pace-medium", nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_6", name: "Hardik Pandya", role: "allRounder", batRating: 92, bowlRating: 88, isWicketkeeper: false, battingAverage: 34.0, strikeRate: 140.0, economyRate: 7.2, bowlingType: "pace-fast", nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_7", name: "Ravindra Jadeja", role: "allRounder", batRating: 85, bowlRating: 86, isWicketkeeper: false, battingAverage: 25.0, strikeRate: 125.0, economyRate: 6.8, bowlingType: "left-arm-orthodox", nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_8", name: "Axar Patel", role: "allRounder", batRating: 84, bowlRating: 87, isWicketkeeper: false, battingAverage: 22.0, strikeRate: 140.0, economyRate: 6.5, bowlingType: "left-arm-orthodox", nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_9", name: "Kuldeep Yadav", role: "spinner", batRating: 30, bowlRating: 92, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 65.0, economyRate: 6.2, bowlingType: "left-arm-unorthodox", nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_10", name: "Arshdeep Singh", role: "pacer", batRating: 20, bowlRating: 93, isWicketkeeper: false, battingAverage: 6.0, strikeRate: 60.0, economyRate: 7.1, bowlingType: "left-arm-pace", nationalTeam: "IND", tournamentYear: 2024 },
      { id: "2024_ind_11", name: "Jasprit Bumrah", role: "pacer", batRating: 15, bowlRating: 99, isWicketkeeper: false, battingAverage: 5.4, strikeRate: 65.0, economyRate: 4.1, bowlingType: "pace-fast", nationalTeam: "IND", tournamentYear: 2024 }
    ]
  }
];

export async function fetchClientRandomSquad() {
  try {
    const squadsRef = collection(db, "squads");
    const snap = await getDocs(squadsRef);
    if (!snap.empty) {
      const docs = snap.docs;
      const randomDoc = docs[Math.floor(Math.random() * docs.length)].data();

      const playerIds = randomDoc.playerIds || [];
      let players = [];
      if (playerIds.length > 0) {
        const playerFetches = playerIds.map(pid => getDoc(doc(db, "players", pid)));
        const playerSnaps = await Promise.all(playerFetches);
        players = playerSnaps
          .filter(ps => ps.exists())
          .map(ps => {
            const data = ps.data();
            return {
              id: ps.id,
              name: data.name,
              nationalTeam: data.nationalTeam,
              tournamentEdition: data.tournamentEdition || `${data.tournamentYear} World Cup`,
              tournamentYear: data.tournamentYear,
              role: data.role,
              isWicketkeeper: data.isWicketkeeper || false,
              batRating: data.batRating || 75,
              bowlRating: data.bowlRating || 0,
              battingAverage: data.battingAverage || data.batRating || 30.0,
              strikeRate: data.strikeRate || 100.0,
              economyRate: data.economyRate || (data.bowlRating ? 6.5 : null),
              bowlingType: data.bowlingType || null
            };
          });
      }

      if (players.length >= 5) {
        return {
          nationalTeam: randomDoc.nationalTeam || "World XI",
          tournamentYear: randomDoc.tournamentYear || "2023",
          tournamentEdition: randomDoc.editionId || `${randomDoc.tournamentYear} World Cup`,
          players
        };
      }
    }
  } catch (e) {
    console.warn("Firestore squad fetch error, using authentic fallback squad:", e);
  }

  // Pick a complete, authentic squad from fallback pool
  const chosenSquad = AUTHENTIC_FALLBACK_SQUADS[Math.floor(Math.random() * AUTHENTIC_FALLBACK_SQUADS.length)];
  return {
    nationalTeam: chosenSquad.nationalTeam,
    tournamentYear: chosenSquad.tournamentYear,
    tournamentEdition: chosenSquad.tournamentEdition || `${chosenSquad.tournamentYear} World Cup`,
    players: chosenSquad.players
  };
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

  // Attach presence handler
  if (auth.currentUser) {
    const presenceRef = ref(rtdb, `rooms/${roomCode}/players/${auth.currentUser.uid}/connectionStatus`);
    set(presenceRef, "online");
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

      // Direct routing based on room status
      if (roomData.status === "lobby") {
        renderLobby(viewport, roomCode, roomData);
      } else if (roomData.status === "drafting") {
        renderDraftPhase(viewport, roomCode, roomData);
      } else if (roomData.status === "placing") {
        renderPlacingPhase(viewport, roomCode, roomData, currentSpectatorUid, (spectatedUid) => {
          currentSpectatorUid = spectatedUid;
        });
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
  const startEnabled = playerUids.length === maxPlayers && readyCount === maxPlayers;

  viewport.innerHTML = `
    <div class="squad-review-container">
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
                <div class="roster-item" style="border-left: 4px solid ${p.ready ? 'var(--primary)' : 'var(--willow-tan)'};">
                  <div class="roster-details">
                    <span class="roster-name">${p.displayName || "Unknown Player"} ${isUser ? '<span class="you-tag">YOU</span>' : ''}</span>
                    <span class="roster-sub" style="font-size: 0.75rem; display: flex; align-items: center; gap: 0.35rem; margin-top: 0.2rem;">
                      <span class="tab-dot" style="width: 6px; height: 6px; border-radius: 50%; background-color: ${connStatus === 'online' ? '#39d353' : 'var(--accent-red)'};"></span>
                      ${connStatus.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span class="status-badge ${p.ready ? 'complete' : 'pending'}">${p.ready ? 'READY' : 'WAITING'}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
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
        <div class="career-stats-widget">
          <h3 style="text-transform: uppercase; font-size: 1rem; color: var(--willow-tan); margin-bottom: 1rem;">Match Settings</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.95rem;">
            <div><strong>Difficulty:</strong> ${room.difficulty === 'openBook' ? 'Open Book (Classic)' : 'Blind Scout (Almanac)'}</div>
            <div><strong>Pick Timer Limit:</strong> ${room.turnTimerSeconds} seconds</div>
            <div><strong>Requires Password:</strong> ${room.password ? 'Yes' : 'No'}</div>
            <div class="auth-upgrade-callout" style="margin-top: 1rem;">
              <strong>Lobby Invite Info:</strong>
              Share the Room Code <strong>${roomCode}</strong> or copy the web link to invite friends. Everyone drafts together live!
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Room Join Modal Overlay for Direct Link Visitors -->
    <div id="room-join-modal" style="${userJoined ? 'display: none;' : 'display: flex;'} position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.85); z-index: 999; align-items: center; justify-content: center; padding: 1rem;">
      <div class="career-stats-widget" style="width: 100%; max-width: 400px; padding: 1.75rem; background: var(--bg-medium); border: 1px solid var(--glass-border);">
        <h3 style="color: var(--willow-tan); text-transform: uppercase; font-size: 1.1rem; margin-bottom: 1.25rem;">Join Room Lobby</h3>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <label>
            <span style="display: block; font-size: 0.85rem; color: var(--chalk-white-dark); margin-bottom: 0.35rem;">Enter Your Display Name:</span>
            <input type="text" id="direct-join-player-name" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); text-align: left; padding: 0.6rem; color: white; font-size: 0.95rem;" placeholder="Enter your name" value="${auth.currentUser?.displayName || ''}">
          </label>
          ${room.password ? `
            <label>
              <span style="display: block; font-size: 0.85rem; color: var(--chalk-white-dark); margin-bottom: 0.35rem;">Room Password:</span>
              <input type="password" id="direct-join-password" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); text-align: left; padding: 0.6rem; color: white; font-size: 0.95rem;" placeholder="Enter room password">
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
          const playerUids = Object.keys(room.players || {});
          const shuffledUids = [...playerUids].sort(() => Math.random() - 0.5);
          const squads = {};
          shuffledUids.forEach(uid => {
            squads[uid] = {
              ready: false,
              slots: Array(11).fill(null),
              bench: []
            };
          });
          await update(ref(rtdb, `rooms/${roomCode}`), {
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
          });
        }
        showToast("Draft successfully initialized!");
      } catch (err) {
        startBtn.disabled = false;
        showToast(err.message, true);
      }
    });
  }
}

/**
 * 2. LIVE DRAFT PHASE VIEW
 */
let slotAnimationTimer = null;
function renderDraftPhase(viewport, roomCode, room) {
  const currentUid = auth.currentUser ? auth.currentUser.uid : "";
  const draftState = room.draftState || {};
  const activePlayer = room.players[draftState.activePlayerUid];
  const isActiveTurn = draftState.activePlayerUid === currentUid;
  const reveal = draftState.currentReveal;

  // Clear previous animations if reveal is null
  if (!reveal && slotAnimationTimer) {
    clearInterval(slotAnimationTimer);
    slotAnimationTimer = null;
  }

  viewport.innerHTML = `
    <div class="squad-review-container">
      <!-- Active turn headers & timer ring -->
      <div class="flex justify-between align-center" style="border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <div>
          <span class="role-badge ${isActiveTurn ? 'opener' : 'keeper'}">
            ${isActiveTurn ? 'YOUR TURN' : 'OPPONENT TURN'}
          </span>
          <h2 style="font-size: 1.5rem; margin-top: 0.4rem;">
            ${isActiveTurn ? 'Roll the squad and claim your player!' : `Waiting for ${activePlayer?.displayName}...`}
          </h2>
        </div>
        <div id="draft-timer-badge" class="tv-scoreboard" style="padding: 0.6rem 1.2rem; min-width: 70px; text-align: center; border-left: 3px solid var(--willow-tan);">
          <div class="score-overs" style="font-size: 0.75rem; text-transform: uppercase;">Time Left</div>
          <div class="score-runs" id="draft-countdown-sec" style="font-size: 1.7rem; color: var(--willow-tan);">20s</div>
        </div>
      </div>

      <div class="match-mid-layout">
        <!-- Draft board controls (Roll / Reveals) -->
        <div class="graph-card" style="display: flex; flex-direction: column; justify-content: center; min-height: 350px;">
          ${!reveal ? `
            <div class="text-center" style="padding: 2rem;">
              <!-- Slot machine slot display before roll -->
              <div id="slot-machine-display" class="tv-scoreboard" style="margin-bottom: 2rem; font-size: 1.5rem; text-transform: uppercase; font-weight: 800; padding: 1.5rem; border-color: var(--willow-tan);">
                ROLL NEXT SQUAD
              </div>
              <button id="roll-squad-btn" class="btn btn-accent btn-lg" ${isActiveTurn ? '' : 'disabled'}>
                ${isActiveTurn ? 'Roll Squad' : 'Waiting for Roll...'}
              </button>
            </div>
          ` : `
            <div>
              <div class="flex justify-between align-center" style="margin-bottom: 1rem;">
                <h3 style="font-size: 1.15rem; color: var(--willow-tan); text-transform: uppercase;">
                  ${reveal.nationalTeam} (${reveal.tournamentYear}) Roster
                </h3>
                <span class="role-badge all-rounder">Select 1 Player</span>
              </div>
              <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem; max-height: 280px; overflow-y: auto; padding-right: 0.5rem;" id="rolled-players-grid">
                ${reveal.players.map(p => {
                  const isClaimed = (draftState.claimedPlayerIds || []).includes(p.id);
                  return `
                    <div class="active-card-group draft-card-item ${isClaimed ? 'claimed-dim' : ''}" style="text-align: center; padding: 0.75rem; cursor: ${isClaimed || !isActiveTurn ? 'not-allowed' : 'pointer'}; position: relative;" data-player-id="${p.id}">
                      <div class="role-badge" style="font-size: 0.65rem; margin-bottom: 0.35rem;">${p.role.toUpperCase()}</div>
                      <div style="font-weight: 700; font-size: 0.85rem; height: 36px; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
                      
                      <!-- Composite Overall Ratings badges -->
                      <div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 0.5rem;">
                        <span class="stat-pill">BAT: ${p.batRating}</span>
                        ${p.bowlRating > 0 ? `<span class="stat-pill" style="border-color: var(--accent-red);">BOWL: ${p.bowlRating}</span>` : ''}
                      </div>

                      ${isClaimed ? `
                        <div class="status-badge complete" style="position: absolute; top: 40%; left: 25%; transform: rotate(-15deg); font-weight: 900;">CLAIMED</div>
                      ` : ''}
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `}
        </div>

        <!-- Room activity log & progress drawer -->
        <div class="controls-card">
          <h4 style="border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem;">Draft Roster Status</h4>
          <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
            ${(draftState.turnOrder || []).map(uid => {
              const p = (room.players || {})[uid] || {};
              const pSquad = (room.squads || {})[uid] || {};
              const pBench = pSquad.bench || [];
              const pSlots = pSquad.slots || [];
              const claimedCount = pBench.length + pSlots.filter(s => s !== null).length;
              return `
                <div class="flex justify-between align-center" style="padding: 0.5rem; background: var(--bg-light); border-radius: var(--border-radius-sm);">
                  <span style="font-weight: ${uid === draftState.activePlayerUid ? '800' : '500'}; color: ${uid === draftState.activePlayerUid ? 'var(--willow-tan)' : 'var(--chalk-white)'};">
                    ${uid === draftState.activePlayerUid ? '● ' : ''}${p.displayName || "Unknown Player"}
                  </span>
                  <span class="role-badge" style="font-family: var(--font-family-mono);">${claimedCount}/11 Claimed</span>
                </div>
              `;
            }).join("")}
          </div>
          
          <div class="auth-upgrade-callout" style="margin-top: 1.5rem; font-size: 0.8rem;">
            <strong>Rule reminder:</strong>
            You can select any player from the rolled squad. Position balance is enforced later during manual placement!
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
        // Start client slot-machine animation loop
        startSlotMachineAnimation();
        try {
          const rollSquadFn = httpsCallable(functions, "rollSquad");
          await rollSquadFn({ code: roomCode });
        } catch (fnErr) {
          console.warn("Cloud function rollSquad failed, performing RTDB direct roll fallback:", fnErr);
          const rolledSquad = await fetchClientRandomSquad();
          const turnTimerSec = room.turnTimerSeconds || 20;
          await update(ref(rtdb, `rooms/${roomCode}/draftState`), {
            turnDeadline: Date.now() + turnTimerSec * 1000,
            currentReveal: {
              nationalTeam: rolledSquad.nationalTeam,
              tournamentYear: rolledSquad.tournamentYear,
              players: rolledSquad.players,
              rolledAt: Date.now(),
              rolledBy: currentUid
            }
          });
        }
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

  // Attach card claim handler
  if (reveal && isActiveTurn) {
    const cards = document.querySelectorAll(".draft-card-item");
    cards.forEach(card => {
      card.addEventListener("click", async () => {
        const playerId = card.getAttribute("data-player-id");
        const claimedIds = draftState.claimedPlayerIds || [];
        if (claimedIds.includes(playerId)) return; // Already claimed

        try {
          // Play card select visual effect before calling functions
          card.style.transform = "scale(0.95)";
          card.style.borderColor = "var(--primary)";
          
          try {
            const claimPlayerFn = httpsCallable(functions, "claimPlayer");
            await claimPlayerFn({ code: roomCode, playerId });
            showToast("Player successfully claimed!");
          } catch (fnErr) {
            console.warn("Cloud function claimPlayer failed, performing RTDB direct claim fallback:", fnErr);
            const targetPlayer = (reveal.players || []).find(p => String(p.id) === String(playerId));
            if (!targetPlayer) return;

            const userSquad = (room.squads || {})[currentUid] || { slots: Array(11).fill(null), bench: [] };
            const currentBench = userSquad.bench || [];
            const updatedBench = [...currentBench, targetPlayer];

            const turnOrder = draftState.turnOrder || [];
            const currentTurnIndex = draftState.turnIndex || 0;
            const nextTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
            const nextActiveUid = turnOrder[nextTurnIndex];

            const updatedClaimed = [...claimedIds, playerId];

            const updates = {};
            updates[`rooms/${roomCode}/squads/${currentUid}/bench`] = updatedBench;
            updates[`rooms/${roomCode}/draftState/turnIndex`] = nextTurnIndex;
            updates[`rooms/${roomCode}/draftState/activePlayerUid`] = nextActiveUid;
            updates[`rooms/${roomCode}/draftState/claimedPlayerIds`] = updatedClaimed;
            updates[`rooms/${roomCode}/draftState/currentReveal`] = null;
            updates[`rooms/${roomCode}/draftState/turnDeadline`] = null;

            // Check if all players reached 11 squad picks
            let allComplete = true;
            turnOrder.forEach(uid => {
              const sq = (room.squads || {})[uid] || { slots: Array(11).fill(null), bench: [] };
              const count = (sq.bench ? sq.bench.length : 0) + (sq.slots ? sq.slots.filter(s => s !== null).length : 0);
              if (uid === currentUid) {
                if (updatedBench.length < 11) allComplete = false;
              } else {
                if (count < 11) allComplete = false;
              }
            });

            if (allComplete) {
              updates[`rooms/${roomCode}/status`] = "placement";
            }

            await update(ref(rtdb), updates);
            showToast("Player successfully claimed!");
          }
        } catch (err) {
          card.style.transform = "";
          card.style.borderColor = "";
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
        // Timer expired — auto-claim a random unclaimed player from the revealed squad
        clearInterval(timerInterval);
        try {
          if (reveal && reveal.players && reveal.players.length > 0) {
            // Find unclaimed players in this reveal
            const claimedIds = draftState.claimedPlayerIds || [];
            const availablePlayers = reveal.players.filter(p => !claimedIds.includes(p.id));

            if (availablePlayers.length > 0) {
              // Pick a random unclaimed player
              const randomPick = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];

              // Auto-claim using direct RTDB write (same as manual claim fallback)
              const userSquad = (room.squads || {})[currentUid] || { slots: Array(11).fill(null), bench: [] };
              const currentBench = userSquad.bench || [];
              const updatedBench = [...currentBench, randomPick];

              const turnOrder = draftState.turnOrder || [];
              const currentTurnIndex = draftState.turnIndex || 0;
              const nextTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
              const nextActiveUid = turnOrder[nextTurnIndex];

              const updatedClaimed = [...claimedIds, randomPick.id];

              const updates = {};
              updates[`rooms/${roomCode}/squads/${currentUid}/bench`] = updatedBench;
              updates[`rooms/${roomCode}/draftState/turnIndex`] = nextTurnIndex;
              updates[`rooms/${roomCode}/draftState/activePlayerUid`] = nextActiveUid;
              updates[`rooms/${roomCode}/draftState/claimedPlayerIds`] = updatedClaimed;
              updates[`rooms/${roomCode}/draftState/currentReveal`] = null;
              updates[`rooms/${roomCode}/draftState/turnDeadline`] = null;

              // Check if all players reached 11 squad picks
              let allComplete = true;
              turnOrder.forEach(uid => {
                const sq = (room.squads || {})[uid] || { slots: Array(11).fill(null), bench: [] };
                const count = (sq.bench ? sq.bench.length : 0) + (sq.slots ? sq.slots.filter(s => s !== null).length : 0);
                if (uid === currentUid) {
                  if (updatedBench.length < 11) allComplete = false;
                } else {
                  if (count < 11) allComplete = false;
                }
              });

              if (allComplete) {
                updates[`rooms/${roomCode}/status`] = "placement";
              }

              await update(ref(rtdb), updates);
              showToast(`⏱ Time's up! Auto-picked ${randomPick.name}`, false);
            } else {
              // All players in this reveal are claimed — just clear the reveal and advance turn
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
              showToast("⏱ Time's up! No unclaimed players left — turn skipped.", false);
            }
          } else {
            // No squad was revealed (player never rolled) — skip the turn
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
            showToast("⏱ Time's up! You didn't roll — turn skipped.", false);
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

// Cinematic slot-machine visual cycles
function startSlotMachineAnimation() {
  const teamsPool = ["INDIA", "AUSTRALIA", "WEST INDIES", "SOUTH AFRICA", "PAKISTAN", "ENGLAND", "NEW ZEALAND", "SRI LANKA", "AFGHANISTAN"];
  const textEl = document.getElementById("slot-machine-display");
  if (!textEl) return;

  let speed = 60;
  let counter = 0;

  slotAnimationTimer = setInterval(() => {
    textEl.innerText = teamsPool[counter % teamsPool.length];
    counter++;
  }, speed);
}

/**
 * 3. MANUAL PLACING PHASE VIEW (Pitch Stadium graphic)
 */
function renderPlacingPhase(viewport, roomCode, room, spectatedUid, setSpectatorUid) {
  const currentUid = auth.currentUser ? auth.currentUser.uid : "";
  const spectatorSquad = room.squads?.[spectatedUid] || { slots: Array(11).fill(null), bench: [], ready: false };
  const isOwnBoard = spectatedUid === currentUid;
  
  const slots = spectatorSquad.slots;
  const bench = spectatorSquad.bench;

  // Zone classifications
  const zoneInfo = [
    { name: "Openers", indices: [0, 1] },
    { name: "Top-order Batsmen", indices: [2, 3, 4] },
    { name: "Middle-order Accumulators", indices: [5, 6] },
    { name: "Wicketkeeper", indices: [7] },
    { name: "All-rounder", indices: [8] },
    { name: "Spin Bowlers", indices: [9] },
    { name: "Pace Bowlers", indices: [10] }
  ];

  // Check role validation for Locking XI button status
  const filledSlots = slots.filter(s => s !== null);
  const rules = validateDraftXI(filledSlots);
  const totalPlaced = slots.filter(s => s !== null).length;
  const isFinalizable = totalPlaced === 11 && rules.valid && !spectatorSquad.ready;

  viewport.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <div class="flex justify-between align-center" style="margin-bottom: 1.5rem;">
        <div>
          <span class="role-badge spinner" style="font-size: 0.85rem; margin-bottom: 0.5rem;">Phase: Squad Placements</span>
          <h1 style="font-size: 2.2rem;">Assemble your Playing XI</h1>
        </div>

        ${isOwnBoard && !spectatorSquad.ready ? `
          <button id="lock-squad-btn" class="btn btn-primary" ${isFinalizable ? '' : 'disabled'}>
            Lock Playing XI
          </button>
        ` : ''}

        ${spectatorSquad.ready ? `
          <span class="status-badge complete" style="padding: 0.5rem 1rem; font-size: 0.9rem;">SQUAD LOCKED</span>
        ` : ''}
      </div>

      <!-- Live alert boxes -->
      ${isOwnBoard && !spectatorSquad.ready ? `
        <div style="margin-bottom: 1rem;">
          ${rules.valid ? `
            <div class="validation-success-alert">
              ✓ Squad Satisfies All Validation Rules! Ready to Lock.
            </div>
          ` : `
            <div class="validation-error-alert">
              ⚠️ Roster Constraint Unfulfilled: ${rules.reason} (Placed: ${totalPlaced}/11)
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
                      return `
                        <div class="pitch-player-slot ${player ? 'filled' : 'empty'}" data-slot-index="${idx}" style="pointer-events: ${spectatorSquad.ready || !isOwnBoard ? 'none' : 'auto'};">
                          <div class="player-avatar-circle">
                            ${player ? `
                              <!-- Role specific head silhouette -->
                              <img src="./assets/silhouettes/${getPlayerSilhouette(player.role)}.svg" style="width: 38px; height: 38px; filter: invert(0.95);" />
                              
                              <span class="rating-badge-chip">${player.batRating}</span>
                              
                              ${player.isCaptain ? '<span class="designation-badge">C</span>' : ''}
                              ${player.isViceCaptain ? '<span class="designation-badge" style="background: var(--willow-tan);">V</span>' : ''}
                            ` : `
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            `}
                          </div>
                          <div class="player-name-plate">
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
            ${Object.keys(room.players).map(uid => {
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
            }).join("")}
          </div>
        </div>

        <!-- Reserves drawer & placements utilities -->
        <div>
          <div class="career-stats-widget" style="margin-bottom: 1.5rem;">
            <h4 style="border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; text-transform: uppercase;">
              ${isOwnBoard ? 'Your Backups Pool' : `${room.players[spectatedUid]?.displayName}'s Backups`}
            </h4>
            <p style="font-size: 0.8rem; color: var(--chalk-white-dim); margin-top: 0.5rem;">
              ${isOwnBoard ? 'Drag or click a player to place them in an empty role slot.' : 'Viewing reserves list of teammate.'}
            </p>
            
            <div class="roster-list" style="margin-top: 1rem; max-height: 350px; overflow-y: auto;">
              ${bench.length === 0 ? `
                <div class="text-center" style="padding: 2rem; color: var(--chalk-white-dark); font-size: 0.9rem;">
                  No players in reserve.
                </div>
              ` : bench.map(p => {
                return `
                  <div class="roster-item bench-card-item" style="padding: 0.65rem 0.85rem; cursor: ${spectatorSquad.ready || !isOwnBoard ? 'default' : 'pointer'};" data-player-id="${p.id}">
                    <div>
                      <div class="roster-name" style="font-size: 0.9rem;">${p.name}</div>
                      <div class="roster-sub" style="font-size: 0.75rem;">${p.role.toUpperCase()} • ${p.nationalTeam} (${p.tournamentYear})</div>
                    </div>
                    <div style="display: flex; gap: 0.35rem;">
                      <span class="role-badge opener" style="font-size: 0.65rem;">BAT: ${p.batRating}</span>
                      ${p.bowlRating > 0 ? `<span class="role-badge pacer" style="font-size: 0.65rem;">BOWL: ${p.bowlRating}</span>` : ''}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- Captain/VC designating inputs -->
          ${isOwnBoard && !spectatorSquad.ready ? `
            <div class="career-stats-widget">
              <h4 style="margin-bottom: 1rem; text-transform: uppercase;">Designations</h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
                <label>
                  <span style="display: block; margin-bottom: 0.25rem; font-size: 0.8rem; color: var(--chalk-white-dark);">Select Captain (C):</span>
                  <select id="captain-select" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); padding: 0.35rem; color: white;">
                    <option value="">-- Choose Captain --</option>
                    ${slots.filter(s => s !== null).map(p => `<option value="${p.id}" ${p.id === spectatorSquad.captainId ? 'selected' : ''}>${p.name}</option>`).join("")}
                  </select>
                </label>
                <label>
                  <span style="display: block; margin-bottom: 0.25rem; font-size: 0.8rem; color: var(--chalk-white-dark);">Select Vice-Captain (VC):</span>
                  <select id="vice-captain-select" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); padding: 0.35rem; color: white;">
                    <option value="">-- Choose Vice-Captain --</option>
                    ${slots.filter(s => s !== null).map(p => `<option value="${p.id}" ${p.id === spectatorSquad.viceCaptainId ? 'selected' : ''}>${p.name}</option>`).join("")}
                  </select>
                </label>
              </div>
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
        const updatedSlots = [...slots];
        updatedSlots[slotIdx] = null;
        
        const updatedBench = [...bench];
        updatedBench.push(player);

        await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), {
          slots: updatedSlots,
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
          showToast("Now tap an empty role slot on the pitch to place this player!");
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
          const placePlayerFn = httpsCallable(functions, "placePlayer");
          await placePlayerFn({ code: roomCode, playerId: activeBenchPlayerId, slotIndex: slotIdx });
          activeBenchPlayerId = null;
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    // Handle designations update
    const capSelect = document.getElementById("captain-select");
    const vcSelect = document.getElementById("vice-captain-select");

    if (capSelect) {
      capSelect.addEventListener("change", async () => {
        await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), {
          captainId: capSelect.value
        });
      });
    }

    if (vcSelect) {
      vcSelect.addEventListener("change", async () => {
        await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), {
          viceCaptainId: vcSelect.value
        });
      });
    }

    // Handle Lock XI click
    const lockBtn = document.getElementById("lock-squad-btn");
    if (lockBtn) {
      lockBtn.addEventListener("click", async () => {
        const cId = capSelect?.value || "";
        const vcId = vcSelect?.value || "";
        if (!cId || !vcId) {
          showToast("Please designate both a Captain and a Vice-Captain first!", true);
          return;
        }

        try {
          lockBtn.disabled = true;
          const finalizeFn = httpsCallable(functions, "finalizeSquad");
          await finalizeFn({ code: roomCode, captainId: cId, viceCaptainId: vcId });
          showToast("Roster locked successfully!");
        } catch (err) {
          lockBtn.disabled = false;
          showToast(err.message, true);
        }
      });
    }
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
function renderSimulatingPhase(viewport, roomCode, room) {
  const currentUid = auth.currentUser ? auth.currentUser.uid : "";
  const sim = room.simulation || {};
  const startsAt = sim.startsAt || Date.now();
  const standings = sim.standingsTable || [];

  viewport.innerHTML = `
    <div class="squad-review-container">
      <div class="text-center" style="margin-bottom: 2rem;">
        <span class="role-badge all-rounder" style="font-size: 0.85rem;">Phase: Synced Match Simulation</span>
        <h1 style="font-size: 2.4rem; margin-top: 0.4rem;">World Cup Match Highlights</h1>
        <p style="color: var(--chalk-white-dim); margin-top: 0.2rem;" id="sim-status-title">Aligning broadcast timers...</p>
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
            <div class="score-row flex justify-between align-center" style="margin-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 1rem;">
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

        <!-- Commentary scrolling feed -->
        <div class="commentary-card" style="margin-top: 1.5rem;">
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

      <!-- Post Match Complete view -->
      <div id="pb-finished-screen" style="display: none; margin-top: 2rem;">
        <h2 style="font-size: 1.7rem; color: var(--willow-tan); border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; text-transform: uppercase;">
          Tournament Standings
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

        <!-- Chemistry Report details -->
        <div class="career-stats-widget" style="margin-top: 2rem;">
          <h3 style="color: var(--willow-tan); text-transform: uppercase; font-size: 1.1rem; margin-bottom: 1rem;">Chemistry & Partnership Report</h3>
          <div style="font-size: 0.95rem; color: var(--chalk-white-dim); line-height: 1.6; display: flex; flex-direction: column; gap: 0.6rem;">
            <div>✓ <strong>teammate chemistry links</strong> were active for players who played in the same national squads historically.</div>
            <div>✓ Batting partnerships combining <strong>Anchor</strong> and <strong>Aggressor</strong> temperaments boosted strike rotations.</div>
            <div>✓ Captains with <strong>Calm-under-pressure</strong> composure successfully stabilized wickets cascades.</div>
          </div>
        </div>

        <div class="flex justify-between" style="margin-top: 2rem;">
          <button id="post-submit-leaderboard-btn" class="btn btn-accent">Submit to Leaderboard</button>
          <a href="#/" class="btn btn-secondary">Return to Lobby</a>
        </div>
      </div>
    </div>
  `;

  // Synchronised trigger countdown
  clearInterval(playbackTimer);
  playbackTimer = setInterval(() => {
    const remainingMs = startsAt - getServerTime();
    const sec = Math.max(0, Math.ceil(remainingMs / 1000));
    
    const countText = document.getElementById("pb-countdown-sec");
    if (countText) {
      countText.innerText = `0${sec}s`;
    }

    if (remainingMs <= 0) {
      clearInterval(playbackTimer);
      // Hide countdown, show scoreboard screen and start fast-forward frames
      const countdownScreen = document.getElementById("pb-countdown-screen");
      const screenContainer = document.getElementById("sim-screen-container");
      const statusTitle = document.getElementById("sim-status-title");

      if (countdownScreen) countdownScreen.style.display = "none";
      if (screenContainer) screenContainer.style.display = "block";
      if (statusTitle) statusTitle.innerText = "Match Live in progress";

      // Execute Cinematic fast-forward scheduler loop
      startCinematicHighlightLoop(sim.matches);
    }
  }, 250);

  // Attach submit to leaderboard handler
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
}

// Fixed 50-second compressed cinematic playback loops
function startCinematicHighlightLoop(matches) {
  if (!matches || matches.length === 0) return;

  // Let's run simulation highlights of the first match (human vs human or user vs AI)
  // For other games, they run in parallel but user spectates match 0
  const match = matches[0];
  const tA = match.teamAName;
  const tB = match.teamBName;

  document.getElementById("pb-teamA").innerText = tA;
  document.getElementById("pb-teamB").innerText = tB;

  const totalDurationMs = 50000; // 50 seconds
  const i1 = match.inningsData[0];
  const i2 = match.inningsData[1];

  const allDeliveries = [];
  
  // Flatten Innings 1 balls
  i1.balls.forEach(b => {
    allDeliveries.push({ innings: 1, ...b });
  });

  // Flatten Innings 2 balls
  i2.balls.forEach(b => {
    allDeliveries.push({ innings: 2, ...b });
  });

  const totalBalls = allDeliveries.length;
  // Calculate pace intervals: ~50 seconds split between total balls
  // Notable balls (boundaries, wickets) pause longer, normal balls tick fast
  const delayNormal = 200; // fast tick for dots/singles
  const delayNotable = 1800; // long pause for highlights

  let ballIndex = 0;
  let runs1 = 0;
  let wickets1 = 0;
  let runs2 = 0;
  let wickets2 = 0;

  const overOutcomes = [];

  function tickPlayback() {
    if (ballIndex >= totalBalls) {
      // Playback complete, reveal standings
      const statusTitle = document.getElementById("sim-status-title");
      if (statusTitle) statusTitle.innerText = "Match Complete! Standings settled.";
      
      const finishedScreen = document.getElementById("pb-finished-screen");
      if (finishedScreen) finishedScreen.style.display = "block";
      return;
    }

    const ball = allDeliveries[ballIndex];
    let nextDelay = delayNormal;

    const commList = document.getElementById("pb-commentary-feed-list");
    const overList = document.getElementById("pb-current-over-list");

    // Process runs and wickets counters
    if (ball.innings === 1) {
      if (ball.isWicket) wickets1++;
      if (!ball.isExtra || ball.extraType === "bye") {
        runs1 += ball.runs;
      } else if (ball.extraType === "wide" || ball.extraType === "noball") {
        runs1 += 1; // wides/noballs add 1 penalty
      }
      
      // Update scorecard displays
      document.getElementById("pb-runsA").innerText = `${runs1}/${wickets1}`;
      document.getElementById("pb-oversA").innerText = `${ball.over}.${ball.ballInOver} ov`;
    } else {
      // Innings 2 chase
      document.getElementById("pb-target-ticker").style.display = "block";
      document.getElementById("pb-target-runs").innerText = `${i1.totalRuns + 1} runs`;

      if (ball.isWicket) wickets2++;
      if (!ball.isExtra || ball.extraType === "bye") {
        runs2 += ball.runs;
      } else if (ball.extraType === "wide" || ball.extraType === "noball") {
        runs2 += 1;
      }

      document.getElementById("pb-runsB").innerText = `${runs2}/${wickets2}`;
      document.getElementById("pb-oversB").innerText = `${ball.over}.${ball.ballInOver} ov`;
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
