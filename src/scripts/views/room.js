import { auth, rtdb, db, functions } from "../firebaseInit.js";
import { ref, onValue, set, update, off, get } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { validateDraftXI } from "../utils/draftRules.js";
import { signInAnonymously } from "firebase/auth";
import { BallEngine } from "../engine/ballEngine.js";

const AUTHENTIC_FALLBACK_SQUADS = [
  {
    nationalTeam: "India",
    tournamentYear: "2023",
    tournamentEdition: "2023 World Cup",
    players: [
      { id: "2023_ind_1", name: "Rohit Sharma", role: "opener", batRating: 95, bowlRating: 15, isWicketkeeper: false, battingAverage: 54.2, strikeRate: 125.9, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_2", name: "Shubman Gill", role: "opener", batRating: 91, bowlRating: 0, isWicketkeeper: false, battingAverage: 44.2, strikeRate: 102.6, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_3", name: "Virat Kohli", role: "topOrder", batRating: 98, bowlRating: 20, isWicketkeeper: false, battingAverage: 95.6, strikeRate: 90.3, economyRate: 4.5, bowlingType: "pace-medium", nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_4", name: "Shreyas Iyer", role: "middleOrder", batRating: 90, bowlRating: 0, isWicketkeeper: false, battingAverage: 66.2, strikeRate: 113.2, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_5", name: "KL Rahul", role: "keeper", batRating: 89, bowlRating: 0, isWicketkeeper: true, battingAverage: 75.3, strikeRate: 90.8, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_6", name: "Suryakumar Yadav", role: "middleOrder", batRating: 84, bowlRating: 0, isWicketkeeper: false, battingAverage: 21.2, strikeRate: 108.5, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_7", name: "Ravindra Jadeja", role: "allRounder", batRating: 84, bowlRating: 88, isWicketkeeper: false, battingAverage: 40.0, strikeRate: 85.0, economyRate: 4.2, bowlingType: "left-arm-orthodox", nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_8", name: "Mohammed Shami", role: "pacer", batRating: 20, bowlRating: 97, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 60.0, economyRate: 5.2, bowlingType: "pace-fast", nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_9", name: "Jasprit Bumrah", role: "pacer", batRating: 15, bowlRating: 96, isWicketkeeper: false, battingAverage: 6.0, strikeRate: 60.0, economyRate: 4.0, bowlingType: "pace-fast", nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_10", name: "Kuldeep Yadav", role: "spinner", batRating: 25, bowlRating: 91, isWicketkeeper: false, battingAverage: 10.0, strikeRate: 65.0, economyRate: 4.4, bowlingType: "left-arm-unorthodox", nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_11", name: "Mohammed Siraj", role: "pacer", batRating: 15, bowlRating: 88, isWicketkeeper: false, battingAverage: 5.0, strikeRate: 50.0, economyRate: 5.6, bowlingType: "pace-fast", nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_12", name: "Shardul Thakur", role: "allRounder", batRating: 72, bowlRating: 78, isWicketkeeper: false, battingAverage: 18.0, strikeRate: 90.0, economyRate: 6.0, bowlingType: "pace-medium", nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_13", name: "Ishan Kishan", role: "keeper", batRating: 82, bowlRating: 0, isWicketkeeper: true, battingAverage: 29.0, strikeRate: 95.0, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_14", name: "Ravichandran Ashwin", role: "spinner", batRating: 40, bowlRating: 84, isWicketkeeper: false, battingAverage: 16.0, strikeRate: 85.0, economyRate: 3.4, bowlingType: "off-spin", nationalTeam: "IND", tournamentYear: 2023 },
      { id: "2023_ind_15", name: "Hardik Pandya", role: "allRounder", batRating: 88, bowlRating: 85, isWicketkeeper: false, battingAverage: 37.0, strikeRate: 110.0, economyRate: 5.5, bowlingType: "pace-fast", nationalTeam: "IND", tournamentYear: 2023 }
    ]
  },
  {
    nationalTeam: "Australia",
    tournamentYear: "1999",
    tournamentEdition: "1999 World Cup",
    players: [
      { id: "1999_aus_1", name: "Adam Gilchrist", role: "keeper", batRating: 90, bowlRating: 0, isWicketkeeper: true, battingAverage: 35.8, strikeRate: 96.9, economyRate: null, bowlingType: null, nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_2", name: "Mark Waugh", role: "opener", batRating: 89, bowlRating: 60, isWicketkeeper: false, battingAverage: 39.3, strikeRate: 77.0, economyRate: 5.0, bowlingType: "off-spin", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_3", name: "Ricky Ponting", role: "topOrder", batRating: 92, bowlRating: 0, isWicketkeeper: false, battingAverage: 42.0, strikeRate: 80.0, economyRate: null, bowlingType: null, nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_4", name: "Steve Waugh", role: "middleOrder", batRating: 91, bowlRating: 70, isWicketkeeper: false, battingAverage: 32.9, strikeRate: 75.9, economyRate: 4.7, bowlingType: "pace-medium", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_5", name: "Michael Bevan", role: "middleOrder", batRating: 94, bowlRating: 60, isWicketkeeper: false, battingAverage: 53.5, strikeRate: 74.0, economyRate: 4.8, bowlingType: "left-arm-unorthodox", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_6", name: "Tom Moody", role: "allRounder", batRating: 80, bowlRating: 82, isWicketkeeper: false, battingAverage: 25.0, strikeRate: 75.0, economyRate: 3.9, bowlingType: "pace-medium", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_7", name: "Shane Lee", role: "allRounder", batRating: 75, bowlRating: 78, isWicketkeeper: false, battingAverage: 20.0, strikeRate: 80.0, economyRate: 4.5, bowlingType: "pace-medium", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_8", name: "Shane Warne", role: "spinner", batRating: 45, bowlRating: 97, isWicketkeeper: false, battingAverage: 13.0, strikeRate: 72.0, economyRate: 3.8, bowlingType: "leg-spin", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_9", name: "Damien Fleming", role: "pacer", batRating: 20, bowlRating: 88, isWicketkeeper: false, battingAverage: 9.0, strikeRate: 60.0, economyRate: 4.1, bowlingType: "pace-fast", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_10", name: "Paul Reiffel", role: "pacer", batRating: 25, bowlRating: 85, isWicketkeeper: false, battingAverage: 13.0, strikeRate: 65.0, economyRate: 4.0, bowlingType: "pace-fast", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_11", name: "Glenn McGrath", role: "pacer", batRating: 10, bowlRating: 97, isWicketkeeper: false, battingAverage: 3.8, strikeRate: 45.0, economyRate: 3.7, bowlingType: "pace-fast", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_12", name: "Darren Lehmann", role: "middleOrder", batRating: 85, bowlRating: 65, isWicketkeeper: false, battingAverage: 38.0, strikeRate: 81.0, economyRate: 4.8, bowlingType: "left-arm-orthodox", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_13", name: "Damien Martyn", role: "topOrder", batRating: 86, bowlRating: 0, isWicketkeeper: false, battingAverage: 40.0, strikeRate: 78.0, economyRate: null, bowlingType: null, nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_14", name: "Brendon Julian", role: "allRounder", batRating: 70, bowlRating: 79, isWicketkeeper: false, battingAverage: 16.0, strikeRate: 70.0, economyRate: 4.6, bowlingType: "left-arm-pace", nationalTeam: "AUS", tournamentYear: 1999 },
      { id: "1999_aus_15", name: "Colin Miller", role: "spinner", batRating: 20, bowlRating: 80, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 60.0, economyRate: 4.2, bowlingType: "off-spin", nationalTeam: "AUS", tournamentYear: 1999 }
    ]
  },
  {
    nationalTeam: "West Indies",
    tournamentYear: "2016",
    tournamentEdition: "2016 T20 World Cup",
    players: [
      { id: "2016_wi_1", name: "Chris Gayle", role: "opener", batRating: 95, bowlRating: 40, isWicketkeeper: false, battingAverage: 37.9, strikeRate: 142.7, economyRate: 6.5, bowlingType: "off-spin", nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_2", name: "Johnson Charles", role: "opener", batRating: 82, bowlRating: 0, isWicketkeeper: false, battingAverage: 24.5, strikeRate: 122.0, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_3", name: "Lendl Simmons", role: "topOrder", batRating: 87, bowlRating: 0, isWicketkeeper: false, battingAverage: 33.0, strikeRate: 130.0, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_4", name: "Marlon Samuels", role: "middleOrder", batRating: 89, bowlRating: 60, isWicketkeeper: false, battingAverage: 30.0, strikeRate: 118.0, economyRate: 6.8, bowlingType: "off-spin", nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_5", name: "Dinesh Ramdin", role: "keeper", batRating: 76, bowlRating: 0, isWicketkeeper: true, battingAverage: 20.0, strikeRate: 112.0, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_6", name: "Dwayne Bravo", role: "allRounder", batRating: 86, bowlRating: 89, isWicketkeeper: false, battingAverage: 27.0, strikeRate: 115.0, economyRate: 7.5, bowlingType: "pace-medium", nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_7", name: "Andre Russell", role: "allRounder", batRating: 92, bowlRating: 87, isWicketkeeper: false, battingAverage: 27.0, strikeRate: 156.0, economyRate: 7.8, bowlingType: "pace-fast", nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_8", name: "Darren Sammy", role: "allRounder", batRating: 82, bowlRating: 75, isWicketkeeper: false, battingAverage: 20.0, strikeRate: 145.0, economyRate: 7.2, bowlingType: "pace-medium", nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_9", name: "Carlos Brathwaite", role: "allRounder", batRating: 85, bowlRating: 80, isWicketkeeper: false, battingAverage: 18.0, strikeRate: 160.0, economyRate: 7.9, bowlingType: "pace-fast", nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_10", name: "Samuel Badree", role: "spinner", batRating: 20, bowlRating: 93, isWicketkeeper: false, battingAverage: 6.0, strikeRate: 60.0, economyRate: 5.6, bowlingType: "leg-spin", nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_11", name: "Sulieman Benn", role: "spinner", batRating: 15, bowlRating: 82, isWicketkeeper: false, battingAverage: 5.0, strikeRate: 50.0, economyRate: 6.2, bowlingType: "left-arm-orthodox", nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_12", name: "Evin Lewis", role: "opener", batRating: 88, bowlRating: 0, isWicketkeeper: false, battingAverage: 30.0, strikeRate: 150.0, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_13", name: "Andre Fletcher", role: "keeper", batRating: 80, bowlRating: 0, isWicketkeeper: true, battingAverage: 22.0, strikeRate: 110.0, economyRate: null, bowlingType: null, nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_14", name: "Jerome Taylor", role: "pacer", batRating: 15, bowlRating: 83, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 55.0, economyRate: 7.2, bowlingType: "pace-fast", nationalTeam: "WI", tournamentYear: 2016 },
      { id: "2016_wi_15", name: "Ashley Nurse", role: "allRounder", batRating: 70, bowlRating: 78, isWicketkeeper: false, battingAverage: 15.0, strikeRate: 120.0, economyRate: 6.9, bowlingType: "off-spin", nationalTeam: "WI", tournamentYear: 2016 }
    ]
  },
  {
    nationalTeam: "Netherlands",
    tournamentYear: "2023",
    tournamentEdition: "2023 World Cup",
    players: [
      { id: "2023_ned_1", name: "Max O'Dowd", role: "opener", batRating: 73, bowlRating: 0, isWicketkeeper: false, battingAverage: 31.2, strikeRate: 78.5, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_2", name: "Vikramjit Singh", role: "opener", batRating: 71, bowlRating: 60, isWicketkeeper: false, battingAverage: 28.5, strikeRate: 75.0, economyRate: 5.5, bowlingType: "pace-medium", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_3", name: "Colin Ackermann", role: "topOrder", batRating: 76, bowlRating: 70, isWicketkeeper: false, battingAverage: 34.0, strikeRate: 80.0, economyRate: 4.9, bowlingType: "off-spin", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_4", name: "Bas de Leede", role: "allRounder", batRating: 81, bowlRating: 80, isWicketkeeper: false, battingAverage: 32.5, strikeRate: 88.0, economyRate: 5.6, bowlingType: "pace-fast", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_5", name: "Scott Edwards", role: "keeper", batRating: 78, bowlRating: 0, isWicketkeeper: true, battingAverage: 38.2, strikeRate: 90.0, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_6", name: "Sybrand Engelbrecht", role: "middleOrder", batRating: 74, bowlRating: 0, isWicketkeeper: false, battingAverage: 35.0, strikeRate: 82.0, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_7", name: "Teja Nidamanuru", role: "middleOrder", batRating: 72, bowlRating: 0, isWicketkeeper: false, battingAverage: 29.0, strikeRate: 92.0, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_8", name: "Logan van Beek", role: "allRounder", batRating: 77, bowlRating: 79, isWicketkeeper: false, battingAverage: 25.0, strikeRate: 95.0, economyRate: 5.4, bowlingType: "pace-medium", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_9", name: "Roelof van der Merwe", role: "allRounder", batRating: 72, bowlRating: 80, isWicketkeeper: false, battingAverage: 20.0, strikeRate: 98.0, economyRate: 4.7, bowlingType: "left-arm-orthodox", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_10", name: "Aryan Dutt", role: "spinner", batRating: 40, bowlRating: 76, isWicketkeeper: false, battingAverage: 12.0, strikeRate: 70.0, economyRate: 5.1, bowlingType: "off-spin", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_11", name: "Paul van Meekeren", role: "pacer", batRating: 20, bowlRating: 77, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 60.0, economyRate: 5.3, bowlingType: "pace-fast", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_12", name: "Ryan ten Doeschate", role: "allRounder", batRating: 85, bowlRating: 74, isWicketkeeper: false, battingAverage: 67.0, strikeRate: 89.0, economyRate: 5.1, bowlingType: "pace-medium", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_13", name: "Wesley Barresi", role: "topOrder", batRating: 73, bowlRating: 0, isWicketkeeper: false, battingAverage: 30.5, strikeRate: 76.0, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_14", name: "Shariz Ahmad", role: "spinner", batRating: 20, bowlRating: 72, isWicketkeeper: false, battingAverage: 10.0, strikeRate: 60.0, economyRate: 5.5, bowlingType: "leg-spin", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_15", name: "Saqib Zulfiqar", role: "allRounder", batRating: 68, bowlRating: 70, isWicketkeeper: false, battingAverage: 18.0, strikeRate: 80.0, economyRate: 5.4, bowlingType: "leg-spin", nationalTeam: "NED", tournamentYear: 2023 }
    ]
  },
  {
    nationalTeam: "Zimbabwe",
    tournamentYear: "1999",
    tournamentEdition: "1999 World Cup",
    players: [
      { id: "1999_zim_1", name: "Grant Flower", role: "opener", batRating: 79, bowlRating: 65, isWicketkeeper: false, battingAverage: 33.5, strikeRate: 67.0, economyRate: 4.7, bowlingType: "left-arm-orthodox", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_2", name: "Neil Johnson", role: "allRounder", batRating: 82, bowlRating: 80, isWicketkeeper: false, battingAverage: 36.5, strikeRate: 78.0, economyRate: 4.4, bowlingType: "pace-medium", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_3", name: "Murray Goodwin", role: "topOrder", batRating: 80, bowlRating: 0, isWicketkeeper: false, battingAverage: 37.0, strikeRate: 72.0, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_4", name: "Andy Flower", role: "keeper", batRating: 88, bowlRating: 0, isWicketkeeper: true, battingAverage: 35.3, strikeRate: 74.6, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_5", name: "Alistair Campbell", role: "middleOrder", batRating: 78, bowlRating: 0, isWicketkeeper: false, battingAverage: 30.5, strikeRate: 66.0, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_6", name: "Guy Whittall", role: "allRounder", batRating: 75, bowlRating: 72, isWicketkeeper: false, battingAverage: 22.5, strikeRate: 68.0, economyRate: 4.6, bowlingType: "pace-medium", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_7", name: "Heath Streak", role: "allRounder", batRating: 75, bowlRating: 85, isWicketkeeper: false, battingAverage: 28.3, strikeRate: 73.0, economyRate: 4.5, bowlingType: "pace-fast", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_8", name: "Paul Strang", role: "spinner", batRating: 50, bowlRating: 76, isWicketkeeper: false, battingAverage: 15.0, strikeRate: 60.0, economyRate: 4.3, bowlingType: "leg-spin", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_9", name: "Henry Olonga", role: "pacer", batRating: 15, bowlRating: 74, isWicketkeeper: false, battingAverage: 6.0, strikeRate: 45.0, economyRate: 5.1, bowlingType: "pace-fast", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_10", name: "Eddo Brandes", role: "pacer", batRating: 25, bowlRating: 75, isWicketkeeper: false, battingAverage: 10.0, strikeRate: 65.0, economyRate: 4.5, bowlingType: "pace-fast", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_11", name: "Sikandar Raza", role: "allRounder", batRating: 83, bowlRating: 81, isWicketkeeper: false, battingAverage: 36.6, strikeRate: 85.0, economyRate: 4.9, bowlingType: "off-spin", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_12", name: "Tatenda Taibu", role: "keeper", batRating: 76, bowlRating: 0, isWicketkeeper: true, battingAverage: 29.0, strikeRate: 68.0, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_13", name: "Craig Wishart", role: "topOrder", batRating: 74, bowlRating: 0, isWicketkeeper: false, battingAverage: 28.0, strikeRate: 65.0, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_14", name: "Ray Price", role: "spinner", batRating: 15, bowlRating: 77, isWicketkeeper: false, battingAverage: 7.0, strikeRate: 45.0, economyRate: 4.0, bowlingType: "left-arm-orthodox", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_15", name: "Sean Williams", role: "allRounder", batRating: 82, bowlRating: 75, isWicketkeeper: false, battingAverage: 37.0, strikeRate: 82.0, economyRate: 4.9, bowlingType: "left-arm-orthodox", nationalTeam: "ZIM", tournamentYear: 1999 }
    ]
  },
  {
    nationalTeam: "Ireland",
    tournamentYear: "2011",
    tournamentEdition: "2011 World Cup",
    players: [
      { id: "2011_ire_1", name: "Paul Stirling", role: "opener", batRating: 81, bowlRating: 60, isWicketkeeper: false, battingAverage: 38.0, strikeRate: 86.0, economyRate: 4.8, bowlingType: "off-spin", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_2", name: "William Porterfield", role: "opener", batRating: 77, bowlRating: 0, isWicketkeeper: false, battingAverage: 30.5, strikeRate: 69.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_3", name: "Ed Joyce", role: "topOrder", batRating: 80, bowlRating: 0, isWicketkeeper: false, battingAverage: 38.0, strikeRate: 67.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_4", name: "Niall O'Brien", role: "keeper", batRating: 76, bowlRating: 0, isWicketkeeper: true, battingAverage: 28.5, strikeRate: 75.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_5", name: "Kevin O'Brien", role: "allRounder", batRating: 85, bowlRating: 77, isWicketkeeper: false, battingAverage: 30.5, strikeRate: 89.0, economyRate: 5.2, bowlingType: "pace-medium", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_6", name: "Alex Cusack", role: "allRounder", batRating: 74, bowlRating: 76, isWicketkeeper: false, battingAverage: 22.0, strikeRate: 72.0, economyRate: 4.6, bowlingType: "pace-medium", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_7", name: "John Mooney", role: "allRounder", batRating: 73, bowlRating: 74, isWicketkeeper: false, battingAverage: 24.0, strikeRate: 82.0, economyRate: 5.1, bowlingType: "pace-medium", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_8", name: "Trent Johnston", role: "allRounder", batRating: 71, bowlRating: 76, isWicketkeeper: false, battingAverage: 19.5, strikeRate: 80.0, economyRate: 4.3, bowlingType: "pace-fast", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_9", name: "George Dockrell", role: "spinner", batRating: 40, bowlRating: 76, isWicketkeeper: false, battingAverage: 12.0, strikeRate: 65.0, economyRate: 4.4, bowlingType: "left-arm-orthodox", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_10", name: "Boyd Rankin", role: "pacer", batRating: 15, bowlRating: 78, isWicketkeeper: false, battingAverage: 5.0, strikeRate: 40.0, economyRate: 4.7, bowlingType: "pace-fast", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_11", name: "Andy Balbirnie", role: "topOrder", batRating: 79, bowlRating: 0, isWicketkeeper: false, battingAverage: 32.0, strikeRate: 76.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_12", name: "Joshua Little", role: "pacer", batRating: 20, bowlRating: 80, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 50.0, economyRate: 5.4, bowlingType: "left-arm-pace", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_13", name: "Harry Tector", role: "topOrder", batRating: 82, bowlRating: 65, isWicketkeeper: false, battingAverage: 40.0, strikeRate: 82.0, economyRate: 5.0, bowlingType: "off-spin", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_14", name: "Mark Adair", role: "allRounder", batRating: 72, bowlRating: 78, isWicketkeeper: false, battingAverage: 18.0, strikeRate: 110.0, economyRate: 5.6, bowlingType: "pace-fast", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_15", name: "Lorcan Tucker", role: "keeper", batRating: 77, bowlRating: 0, isWicketkeeper: true, battingAverage: 28.0, strikeRate: 88.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 }
    ]
  },
  {
    nationalTeam: "Afghanistan",
    tournamentYear: "2024",
    tournamentEdition: "2024 T20 World Cup",
    players: [
      { id: "2024_afg_1", name: "Rahmanullah Gurbaz", role: "opener", batRating: 90, bowlRating: 0, isWicketkeeper: true, battingAverage: 37.5, strikeRate: 88.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_2", name: "Ibrahim Zadran", role: "opener", batRating: 88, bowlRating: 0, isWicketkeeper: false, battingAverage: 47.8, strikeRate: 80.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_3", name: "Rahmat Shah", role: "topOrder", batRating: 85, bowlRating: 30, isWicketkeeper: false, battingAverage: 36.5, strikeRate: 70.0, economyRate: 5.2, bowlingType: "leg-spin", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_4", name: "Hashmatullah Shahidi", role: "topOrder", batRating: 84, bowlRating: 0, isWicketkeeper: false, battingAverage: 33.0, strikeRate: 68.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_5", name: "Najibullah Zadran", role: "middleOrder", batRating: 86, bowlRating: 0, isWicketkeeper: false, battingAverage: 30.0, strikeRate: 89.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_6", name: "Mohammad Nabi", role: "allRounder", batRating: 88, bowlRating: 86, isWicketkeeper: false, battingAverage: 27.2, strikeRate: 85.5, economyRate: 4.3, bowlingType: "off-spin", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_7", name: "Azmatullah Omarzai", role: "allRounder", batRating: 89, bowlRating: 84, isWicketkeeper: false, battingAverage: 40.5, strikeRate: 98.0, economyRate: 5.4, bowlingType: "pace-fast", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_8", name: "Gulbadin Naib", role: "allRounder", batRating: 82, bowlRating: 80, isWicketkeeper: false, battingAverage: 21.5, strikeRate: 86.0, economyRate: 5.3, bowlingType: "pace-medium", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_9", name: "Rashid Khan", role: "spinner", batRating: 65, bowlRating: 98, isWicketkeeper: false, battingAverage: 18.5, strikeRate: 110.0, economyRate: 4.2, bowlingType: "leg-spin", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_10", name: "Mujeeb Ur Rahman", role: "spinner", batRating: 30, bowlRating: 90, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 60.0, economyRate: 4.5, bowlingType: "off-spin", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_11", name: "Fazalhaq Farooqi", role: "pacer", batRating: 15, bowlRating: 94, isWicketkeeper: false, battingAverage: 4.0, strikeRate: 40.0, economyRate: 5.0, bowlingType: "left-arm-pace", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_12", name: "Naveen-ul-Haq", role: "pacer", batRating: 20, bowlRating: 89, isWicketkeeper: false, battingAverage: 6.0, strikeRate: 50.0, economyRate: 5.5, bowlingType: "pace-medium", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_13", name: "Hazratullah Zazai", role: "opener", batRating: 82, bowlRating: 0, isWicketkeeper: false, battingAverage: 28.0, strikeRate: 135.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_14", name: "Noor Ahmad", role: "spinner", batRating: 20, bowlRating: 86, isWicketkeeper: false, battingAverage: 5.0, strikeRate: 45.0, economyRate: 4.8, bowlingType: "left-arm-unorthodox", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_15", name: "Karim Janat", role: "allRounder", batRating: 75, bowlRating: 78, isWicketkeeper: false, battingAverage: 20.0, strikeRate: 110.0, economyRate: 5.8, bowlingType: "pace-medium", nationalTeam: "AFG", tournamentYear: 2024 }
    ]
  }
];

export async function fetchClientRandomSquad() {
  const UNDERDOG_TEAMS = ['NED', 'ZIM', 'IRE', 'AFG', 'BAN', 'SL', 'WI', 'KEN', 'SCO', 'CAN', 'USA', 'UAE', 'Netherlands', 'Zimbabwe', 'Ireland', 'Afghanistan', 'Bangladesh', 'Sri Lanka', 'West Indies'];

  try {
    const snap = await getDocs(collection(db, "squads"));
    if (!snap.empty) {
      const docs = snap.docs;
      const squadByTeam = {};
      docs.forEach(d => {
        const data = d.data();
        const team = data.nationalTeam || "IND";
        if (!squadByTeam[team]) squadByTeam[team] = [];
        squadByTeam[team].push(data);
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
      const randomDoc = squadByTeam[chosenTeam][Math.floor(Math.random() * squadByTeam[chosenTeam].length)];

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

  // Pick a complete, authentic squad from fallback pool with team diversity (75% underdog weighted)
  const fallbackByTeam = {};
  AUTHENTIC_FALLBACK_SQUADS.forEach(s => {
    const t = s.nationalTeam;
    if (!fallbackByTeam[t]) fallbackByTeam[t] = [];
    fallbackByTeam[t].push(s);
  });
  const fallbackTeams = Object.keys(fallbackByTeam);
  const fallbackUnderdogs = fallbackTeams.filter(t => UNDERDOG_TEAMS.includes(t));
  const fallbackHeavyweights = fallbackTeams.filter(t => !UNDERDOG_TEAMS.includes(t));

  let pickedTeam;
  if (fallbackUnderdogs.length > 0 && (Math.random() < 0.75 || fallbackHeavyweights.length === 0)) {
    pickedTeam = fallbackUnderdogs[Math.floor(Math.random() * fallbackUnderdogs.length)];
  } else if (fallbackHeavyweights.length > 0) {
    pickedTeam = fallbackHeavyweights[Math.floor(Math.random() * fallbackHeavyweights.length)];
  } else {
    pickedTeam = fallbackTeams[Math.floor(Math.random() * fallbackTeams.length)];
  }
  const chosenSquad = fallbackByTeam[pickedTeam][Math.floor(Math.random() * fallbackByTeam[pickedTeam].length)];

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

  const userDisplayName = players[currentUid]?.displayName || "";
  const needsNamePrompt = !userJoined || !userDisplayName || userDisplayName === "Guest Player" || userDisplayName === "Player" || userDisplayName.startsWith("Guest");

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

          <!-- Inline Name Editor for User -->
          <div style="margin-top: 1.25rem; padding: 0.85rem; background: var(--bg-light); border-radius: var(--border-radius-sm); border: 1px solid var(--glass-border);">
            <label style="font-size: 0.8rem; color: var(--willow-tan); display: block; margin-bottom: 0.35rem; font-weight: bold;">Your Player Display Name:</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="inline-player-name-input" class="btn btn-secondary btn-sm" style="flex: 1; text-align: left; padding: 0.45rem 0.75rem; color: white; font-size: 0.9rem;" value="${userDisplayName}" placeholder="Type your player name...">
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

    <!-- Room Join Modal Overlay for Direct Link Visitors & Name Setup -->
    <div id="room-join-modal" style="${needsNamePrompt ? 'display: flex;' : 'display: none;'} position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.85); z-index: 999; align-items: center; justify-content: center; padding: 1rem;">
      <div class="career-stats-widget" style="width: 100%; max-width: 400px; padding: 1.75rem; background: var(--bg-medium); border: 1px solid var(--glass-border);">
        <h3 style="color: var(--willow-tan); text-transform: uppercase; font-size: 1.1rem; margin-bottom: 1.25rem;">Enter Your Player Name</h3>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <label>
            <span style="display: block; font-size: 0.85rem; color: var(--chalk-white-dark); margin-bottom: 0.35rem;">Enter Your Display Name:</span>
            <input type="text" id="direct-join-player-name" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px solid var(--glass-border); text-align: left; padding: 0.6rem; color: white; font-size: 0.95rem;" placeholder="Enter your name" value="${userDisplayName !== 'Guest Player' ? userDisplayName : ''}">
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
let selectedDraftPlayerId = null;
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
              <!-- Retro Header Card matching reference image -->
              <div style="background: #fdfbf7; color: #111; padding: 1.15rem; border-radius: 10px; border: 2px solid #e0d8c8; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="font-size: 0.7rem; text-transform: uppercase; color: #888; font-weight: 800; letter-spacing: 1px;">DRAWN</div>
                <h2 style="font-size: 1.8rem; margin: 0.2rem 0; font-weight: 900; color: #111;">
                  <span style="color: #d32f2f;">${reveal.nationalTeam}</span>
                </h2>
                <div style="font-size: 1.15rem; font-weight: 800; color: #d32f2f; font-family: var(--font-family-mono);">
                  Tournament ${reveal.tournamentYear}
                </div>
                <div style="margin-top: 0.85rem; border-top: 1px solid #e5dec9; padding-top: 0.65rem; display: flex; gap: 0.5rem;">
                  <button id="roll-squad-btn" class="btn btn-secondary btn-sm" style="flex: 1; background: #fff; border: 2px solid #111; color: #111; font-weight: 800; font-size: 0.8rem;">
                    🔄 RE-ROLL TEAM
                  </button>
                </div>
              </div>

              <!-- Retro Pick A Player List matching reference image -->
              <div style="margin-top: 1rem; background: #fdfbf7; border: 2px solid #e0d8c8; border-radius: 10px; padding: 0.75rem;">
                <div class="flex justify-between align-center" style="margin-bottom: 0.5rem;">
                  <div style="font-size: 0.75rem; font-weight: 900; color: #777; text-transform: uppercase; letter-spacing: 1px;">
                    PICK A PLAYER
                  </div>
                  <span style="font-size: 0.68rem; color: #d32f2f; font-weight: bold;">Tap player, then tap pitch spot!</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 380px; overflow-y: auto; padding-right: 0.25rem;" id="rolled-players-grid">
                  ${reveal.players.map((p, idx) => {
                    const isClaimed = (draftState.claimedPlayerIds || []).includes(p.id);
                    const isSelected = selectedDraftPlayerId === p.id;
                    return `
                      <div class="draft-card-item ${isClaimed ? 'claimed-dim' : ''} ${isSelected ? 'selected-gold' : ''}" 
                           data-player-id="${p.id}" 
                           style="display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.75rem; background: ${isSelected ? '#fffde7' : (isClaimed ? '#eee' : '#ffffff')}; border: ${isSelected ? '2px solid #f57f17' : '1px solid #e0d8c8'}; border-radius: 6px; cursor: ${isClaimed || !isActiveTurn ? 'not-allowed' : 'pointer'}; position: relative;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0;">
                          <span style="font-family: var(--font-family-mono); font-weight: 900; color: #888; font-size: 0.8rem; min-width: 24px;">#${idx + 1}</span>
                          <img src="${getPlayerPhoto(p.name)}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #ccc;" alt="${p.name}" />
                          <div style="min-width: 0; flex: 1;">
                            <div style="font-weight: 800; font-size: 0.85rem; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
                            <span style="font-size: 0.62rem; background: #eee; color: #333; padding: 1px 4px; border-radius: 3px; font-weight: 800;">${getRoleShort(p.role)}</span>
                          </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
                          <span style="font-size: 0.72rem; color: #d32f2f; font-weight: 900;">BAT ${p.batRating}</span>
                          ${p.bowlRating > 0 ? `<span style="font-size: 0.72rem; color: #1976d2; font-weight: 900;">BOWL ${p.bowlRating}</span>` : ''}
                        </div>
                        ${isClaimed ? `
                          <div style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.62rem; font-weight: 900;">CLAIMED</div>
                        ` : ''}
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>
          `}
        </div>

        <!-- Room activity log & Side-by-side Field Setup canvas -->
        <div class="controls-card">
          <div class="flex justify-between align-center" style="border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
            <h4 style="text-transform: uppercase; font-size: 0.9rem; margin: 0; color: var(--willow-tan);">Field Setup (Playing XI)</h4>
            <span class="role-badge all-rounder" style="font-size: 0.7rem;">${getFilledSlotsArray(((room.squads || {})[currentUid] || {}).slots).filter(s => s !== null).length}/11 Placed</span>
          </div>

          <!-- STADIUM PITCH GRAPHIC SIDE-BY-SIDE -->
          <div class="pitch-stadium" style="padding: 0.65rem; margin-bottom: 1rem; min-height: 270px; border-radius: 12px; background: radial-gradient(circle at center, #1b4d3e 0%, #0d2b1d 100%);">
            <div class="pitch-center-lane"></div>
            ${[
              { name: "Top Order", indices: [0, 1, 2] },
              { name: "Middle Order", indices: [3, 4, 5] },
              { name: "Keeper", indices: [6] },
              { name: "Bowlers", indices: [7, 8, 9, 10] }
            ].map(zone => `
              <div class="pitch-zone" style="margin-bottom: 0.35rem;">
                <div class="pitch-zone-header" style="font-size: 0.65rem; padding: 1px 6px;">${zone.name}</div>
                <div class="pitch-grid-row">
                  ${zone.indices.map(idx => {
                    const p = getFilledSlotsArray(((room.squads || {})[currentUid] || {}).slots)[idx];
                    const oop = isOutOfPosition(p, idx);
                    return `
                      <div class="pitch-player-slot ${p ? 'filled' : 'empty'}" data-slot-index="${idx}" style="padding: 0.25rem; border: ${selectedDraftPlayerId && !p ? '2px dashed #39d353' : ''};">
                        <div class="player-avatar-circle" style="width: 32px; height: 32px; position: relative;">
                          ${p ? `
                            <img src="${getPlayerPhoto(p.name)}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="${p.name}" />
                            <span style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); background: #e53935; color: white; padding: 0 3px; border-radius: 3px; font-size: 0.55rem; font-weight: bold; white-space: nowrap;">BAT ${p.batRating}</span>
                          ` : `
                            <span style="font-size: 0.65rem; font-weight: bold; color: var(--willow-tan);">#${idx + 1}</span>
                          `}
                        </div>
                        <div class="player-name-plate" style="font-size: 0.65rem; margin-top: 10px; font-weight: 700;">
                          ${p ? p.name.split(" ").slice(-1)[0] : 'EMPTY'}
                        </div>
                        ${oop ? `
                          <span style="font-size: 0.5rem; background: #c62828; color: white; padding: 0 3px; border-radius: 2px; font-weight: 900; margin-top: 2px; white-space: nowrap;">⚠️ OOP</span>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Turn Order Roster Status -->
          <h5 style="font-size: 0.8rem; text-transform: uppercase; color: var(--chalk-white-dim); margin-bottom: 0.5rem;">Draft Roster Status</h5>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${(draftState.turnOrder || []).map(uid => {
              const p = (room.players || {})[uid] || {};
              const sq = (room.squads || {})[uid] || {};
              const pBench = ensureArray(sq.bench);
              const pSlots = getFilledSlotsArray(sq.slots);
              const claimedCount = pBench.length + pSlots.filter(s => s !== null).length;
              return `
                <div class="flex justify-between align-center" style="padding: 0.35rem 0.6rem; background: var(--bg-light); border-radius: var(--border-radius-sm); font-size: 0.8rem;">
                  <span style="font-weight: ${uid === draftState.activePlayerUid ? '800' : '500'}; color: ${uid === draftState.activePlayerUid ? 'var(--willow-tan)' : 'var(--chalk-white)'};">
                    ${uid === draftState.activePlayerUid ? '● ' : ''}${p.displayName || "Player"}
                  </span>
                  <span class="role-badge" style="font-size: 0.65rem;">${claimedCount}/11 Claimed</span>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="auth-upgrade-callout" style="margin-top: 1rem; font-size: 0.78rem; padding: 0.5rem 0.75rem;">
            <strong>Spot Placement:</strong>
            Tap a player on the list, then tap ANY empty spot on the pitch setup to place them right there!
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

  // Attach card claim handler with spot selection
  if (reveal && isActiveTurn) {
    const cards = document.querySelectorAll(".draft-card-item");
    cards.forEach(card => {
      card.addEventListener("click", async () => {
        const playerId = card.getAttribute("data-player-id");
        const claimedIds = draftState.claimedPlayerIds || [];
        if (claimedIds.includes(playerId)) return;

        if (selectedDraftPlayerId === playerId) {
          selectedDraftPlayerId = null;
          renderDraftPhase(viewport, roomCode, room);
          return;
        }

        selectedDraftPlayerId = playerId;
        showToast("Player selected! Now tap an empty pitch spot to place them.");
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
        const updatedClaimed = [...ensureArray(draftState.claimedPlayerIds), targetPlayer.id];

        const updates = {};
        updates[`rooms/${roomCode}/squads/${currentUid}/slots`] = updatedSlots;
        updates[`rooms/${roomCode}/squads/${currentUid}/bench`] = updatedBench;
        updates[`rooms/${roomCode}/draftState/turnIndex`] = nextTurnIndex;
        updates[`rooms/${roomCode}/draftState/activePlayerUid`] = nextActiveUid;
        updates[`rooms/${roomCode}/draftState/claimedPlayerIds`] = updatedClaimed;
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
          showToast(`Placed ${targetPlayer.name} into Slot #${slotIdx + 1}!`);
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
        // Timer expired — auto-claim a random unclaimed player from the revealed squad
        clearInterval(timerInterval);
        try {
          if (reveal && reveal.players && reveal.players.length > 0) {
            // Find unclaimed players in this reveal
            const claimedIds = draftState.claimedPlayerIds || [];
            const availablePlayers = ensureArray(reveal.players).filter(p => !claimedIds.includes(p.id));

            if (availablePlayers.length > 0) {
              // Pick a random unclaimed player
              const randomPick = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];

              // Auto-claim using direct RTDB write (same as manual claim fallback)
              const userSquad = (room.squads || {})[currentUid] || { slots: Array(11).fill(null), bench: [] };
              const currentBench = ensureArray(userSquad.bench);
              const updatedBench = [...currentBench, randomPick];

              const turnOrder = draftState.turnOrder || [];
              const currentTurnIndex = draftState.turnIndex || 0;
              const nextTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
              const nextActiveUid = turnOrder[nextTurnIndex];

              const updatedClaimed = [...ensureArray(claimedIds), randomPick.id];

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
                const sqSlots = getFilledSlotsArray(sq.slots);
                const sqBench = ensureArray((uid === currentUid) ? updatedBench : sq.bench);
                const count = sqBench.length + sqSlots.filter(s => s !== null).length;
                if (count < 11) allComplete = false;
              });

              if (allComplete) {
                updates[`rooms/${roomCode}/status`] = "placing";
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

function getPlayerPhoto(name) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'cricket')}&backgroundColor=0a2e1d,031d10`;
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
    { name: "Top Order / Batting", indices: [0, 1, 2] },
    { name: "Middle Order / All-Rounders", indices: [3, 4, 5] },
    { name: "Wicketkeeper / Specialist", indices: [6] },
    { name: "Spin & Pace Bowlers", indices: [7, 8, 9, 10] }
  ];

  // Check XI status for Locking button
  const totalPlaced = slots.filter(s => s !== null).length;
  const isFinalizable = totalPlaced === 11 && !spectatorSquad.ready;

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
              ✓ All 11 Playing XI Positions Filled! Ready to Lock and Simulate.
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

                      return `
                        <div class="pitch-player-slot ${player ? 'filled' : 'empty'}" data-slot-index="${idx}" style="pointer-events: ${spectatorSquad.ready || !isOwnBoard ? 'none' : 'auto'}; position: relative;">
                          <div class="player-avatar-circle" style="position: relative; overflow: visible; border-color: ${borderColor};">
                            ${player ? `
                              <img src="${getPlayerPhoto(player.name)}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid ${borderColor};" alt="${player.name}" />
                              
                              <div style="display: flex; gap: 2px; position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%); white-space: nowrap; z-index: 5;">
                                <span class="rating-chip bat-chip" style="background: linear-gradient(135deg, #e53935, #c62828); color: white; padding: 1px 4px; border-radius: 4px; font-size: 0.62rem; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.6);">BAT ${player.batRating}</span>
                                ${player.bowlRating > 0 ? `<span class="rating-chip bowl-chip" style="background: linear-gradient(135deg, #1e88e5, #1565c0); color: white; padding: 1px 4px; border-radius: 4px; font-size: 0.62rem; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.6);">BOWL ${player.bowlRating}</span>` : ''}
                              </div>

                              ${player.isCaptain ? '<span class="designation-badge" style="position: absolute; top: -6px; right: -8px; background: #ffb703; color: #000; font-weight: 900; font-size: 0.65rem; padding: 1px 5px; border-radius: 6px; border: 1px solid #fff; z-index: 6;">C (2x)</span>' : ''}
                              ${player.isViceCaptain ? '<span class="designation-badge" style="position: absolute; top: -6px; right: -8px; background: #e0e0e0; color: #000; font-weight: 900; font-size: 0.65rem; padding: 1px 5px; border-radius: 6px; border: 1px solid #fff; z-index: 6;">VC (1.5x)</span>' : ''}
                            ` : `
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            `}
                          </div>
                          <div class="player-name-plate" style="margin-top: 14px; font-weight: 700;">
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
          showToast("Now tap an empty position slot on the pitch to place this player!");
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
          try {
            const placePlayerFn = httpsCallable(functions, "placePlayer");
            await placePlayerFn({ code: roomCode, playerId: activeBenchPlayerId, slotIndex: slotIdx });
          } catch (fnErr) {
            console.warn("Cloud function placePlayer failed, performing RTDB direct place fallback:", fnErr);
            const userSquad = room.squads?.[currentUid] || { slots: Array(11).fill(null), bench: [] };
            const currentBench = [...(userSquad.bench || [])];
            
            const rawSlots = userSquad.slots || [];
            const currentSlots = Array(11).fill(null);
            for (let i = 0; i < 11; i++) {
              if (rawSlots[i]) currentSlots[i] = rawSlots[i];
            }

            const playerIdx = currentBench.findIndex(p => String(p.id) === String(activeBenchPlayerId));
            if (playerIdx !== -1) {
              const playerToPlace = currentBench.splice(playerIdx, 1)[0];
              const existingPlayer = currentSlots[slotIdx];
              if (existingPlayer) {
                currentBench.push(existingPlayer);
              }
              currentSlots[slotIdx] = playerToPlace;

              const sanitizedSlots = currentSlots.map(s => s || null);

              await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), {
                bench: currentBench,
                slots: sanitizedSlots
              });
            } else {
              throw new Error("Player is not on your backup bench.");
            }
          }
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
          try {
            const finalizeFn = httpsCallable(functions, "finalizeSquad");
            await finalizeFn({ code: roomCode, captainId: cId, viceCaptainId: vcId });
          } catch (fnErr) {
            console.warn("Cloud function finalizeSquad failed, performing RTDB direct finalize fallback:", fnErr);
            const userSquad = room.squads?.[currentUid] || { slots: Array(11).fill(null), bench: [] };
            const updatedSlots = (userSquad.slots || []).map(p => {
              if (!p) return null;
              return {
                ...p,
                isCaptain: String(p.id) === String(cId),
                isViceCaptain: String(p.id) === String(vcId)
              };
            });
            await update(ref(rtdb, `rooms/${roomCode}/squads/${currentUid}`), {
              ready: true,
              slots: updatedSlots,
              captainId: cId,
              viceCaptainId: vcId
            });
          }

          // Verify if all players in room have locked their squad
          const updatedRoomSnap = await get(ref(rtdb, `rooms/${roomCode}`));
          const updatedRoom = updatedRoomSnap.val();
          if (updatedRoom) {
            const playerUids = Object.keys(updatedRoom.players || {});
            const allReady = playerUids.length > 0 && playerUids.every(uid => updatedRoom.squads?.[uid]?.ready);

            if (allReady && !updatedRoom.simulation?.matches) {
              await runClientSimulationFallback(roomCode, updatedRoom);
            }
          }

          showToast("Roster locked successfully!");
        } catch (err) {
          lockBtn.disabled = false;
          showToast(err.message, true);
        }
      });
    }

    // Auto check if all players ready in placing phase
    const playerUids = Object.keys(room.players || {});
    const allReady = playerUids.length > 0 && playerUids.every(uid => room.squads?.[uid]?.ready);
    if (allReady && !room.simulation?.matches) {
      runClientSimulationFallback(roomCode, room);
    }
  }
}

async function runClientSimulationFallback(roomCode, room) {
  try {
    const players = room.players || {};
    const squads = room.squads || {};
    const uids = Object.keys(players);
    const engine = new BallEngine(Math.floor(Math.random() * 2147483647));
    const simulatedMatches = [];

    if (room.mode === "solo") {
      const playerUid = uids[0];
      const playerXI = squads[playerUid]?.slots || [];
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
        const sim = engine.simulateMatch(playerTeam, opp, false);
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

    } else if (room.mode === "duel") {
      const p1Uid = uids[0];
      const p2Uid = uids[1] || uids[0];
      const teamA = { id: p1Uid, name: players[p1Uid]?.displayName || "Player 1", players: squads[p1Uid]?.slots || [] };
      const teamB = { id: p2Uid, name: players[p2Uid]?.displayName || "Player 2", players: squads[p2Uid]?.slots || [] };

      const sim = engine.simulateMatch(teamA, teamB, true);
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

    const startsAt = Date.now() + 2000;
    await update(ref(rtdb, `rooms/${roomCode}`), {
      status: "simulating",
      "simulation/matches": simulatedMatches,
      "simulation/standingsTable": standings,
      "simulation/startsAt": startsAt
    });
  } catch (err) {
    console.error("Client simulation error:", err);
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

        <!-- Live Batter & Bowler Side-by-Side Scorecard Panel -->
        <div class="career-stats-widget" style="margin-top: 1.25rem; border: 1px solid var(--glass-border); padding: 1rem;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <!-- Live Batter Card -->
            <div style="flex: 1; min-width: 250px; background: rgba(0,0,0,0.3); padding: 0.85rem; border-radius: 8px; border-left: 4px solid var(--willow-tan);">
              <h5 style="color: var(--willow-tan); text-transform: uppercase; font-size: 0.8rem; margin: 0 0 0.5rem 0;">On Crease (Batting)</h5>
              <div id="pb-live-striker" style="font-size: 0.9rem; font-weight: bold; display: flex; align-items: center; justify-content: space-between;">
                <span>🏏 Striker: -</span>
                <span style="color: var(--willow-tan);">0 (0)</span>
              </div>
              <div id="pb-live-nonstriker" style="font-size: 0.85rem; color: var(--chalk-white-dim); margin-top: 0.35rem; display: flex; align-items: center; justify-content: space-between;">
                <span>Non-Striker: -</span>
                <span>0 (0)</span>
              </div>
            </div>

            <!-- Live Bowler Card -->
            <div style="flex: 1; min-width: 240px; background: rgba(0,0,0,0.3); padding: 0.85rem; border-radius: 8px; border-left: 4px solid #1e88e5;">
              <h5 style="color: #64b5f6; text-transform: uppercase; font-size: 0.8rem; margin: 0 0 0.5rem 0;">Current Bowler</h5>
              <div id="pb-live-bowler" style="font-size: 0.9rem; font-weight: bold; display: flex; align-items: center; justify-content: space-between;">
                <span>⚡ Bowler: -</span>
                <span style="color: #64b5f6;">0-0 (0.0 ov)</span>
              </div>
              <div id="pb-live-bowler-econ" style="font-size: 0.8rem; color: var(--chalk-white-dim); margin-top: 0.35rem;">
                Economy: 0.00
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

      <!-- Post Match Complete Glorious Champions Victory Card -->
      <div id="pb-finished-screen" style="display: none; margin-top: 2rem;">
        <div id="champions-victory-card" style="text-align: center; background: radial-gradient(circle at center, #2e1a05 0%, #0d0903 100%); border: 3px solid #ffd700; border-radius: 16px; padding: 2rem 1.5rem; margin-bottom: 2rem; box-shadow: 0 10px 30px rgba(255,215,0,0.3);">
          <div style="font-size: 3rem; margin-bottom: 0.4rem;">🏆 👑 🏆</div>
          <span class="role-badge all-rounder" style="background: linear-gradient(135deg, #ffd700, #ff8c00); color: black; font-weight: 900; font-size: 0.85rem; padding: 4px 12px; text-transform: uppercase;">
            WORLD CUP CHAMPION
          </span>
          <h1 id="champion-team-title" style="font-size: 2.5rem; margin-top: 0.6rem; background: linear-gradient(135deg, #fff, #ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900;">
            ${standings[0]?.teamName || "Champion Team"}
          </h1>
          <p id="champion-sub-title" style="font-size: 1.05rem; color: #ffe0b2; margin-top: 0.2rem;">
            Final Points: <strong>${standings[0]?.points || 0} PTS</strong> • NRR: <strong>${standings[0]?.nrr > 0 ? '+' : ''}${standings[0]?.nrr || '0.00'}</strong>
          </p>
        </div>

        <h2 style="font-size: 1.5rem; color: var(--willow-tan); border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; text-transform: uppercase;">
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

    // Update live side-by-side batter & bowler scorecard widgets
    const currentInningsData = ball.innings === 1 ? i1 : i2;
    const bCard = currentInningsData.battingCard || {};
    const bwCard = currentInningsData.bowlingCard || {};

    const strikerData = bCard[ball.strikerId];
    const bowlerData = bwCard[ball.bowlerId];

    const strikerEl = document.getElementById("pb-live-striker");
    const bowlerEl = document.getElementById("pb-live-bowler");
    const bowlerEconEl = document.getElementById("pb-live-bowler-econ");

    if (strikerEl && strikerData) {
      strikerEl.innerHTML = `<span>🏏 ${strikerData.name} *</span><span style="color: var(--willow-tan); font-weight: 800;">${strikerData.runs} (${strikerData.balls}) • ${strikerData.fours}x4 ${strikerData.sixes}x6</span>`;
    }
    if (bowlerEl && bowlerData) {
      const ovStr = `${Math.floor((bowlerData.balls || 0) / 6)}.${(bowlerData.balls || 0) % 6}`;
      const econVal = (bowlerData.balls || 0) > 0 ? (((bowlerData.runsConceded || 0) / bowlerData.balls) * 6).toFixed(2) : '0.00';
      bowlerEl.innerHTML = `<span>⚡ ${bowlerData.name}</span><span style="color: #64b5f6; font-weight: 800;">${bowlerData.wickets || 0}-${bowlerData.runsConceded || 0} (${ovStr} ov)</span>`;
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
