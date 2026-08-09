import { auth, rtdb, db, functions } from "../firebaseInit.js";
import { ref, onValue, set, update, off, get } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { validateDraftXI } from "../utils/draftRules.js";
import { signInAnonymously } from "firebase/auth";
import { BallEngine } from "../engine/ballEngine.js";
import { getRandomPoolSquad } from "../utils/squadPool.js";

const POSITION_LABELS = [
  "TOP ORDER 1", "TOP ORDER 2", "TOP ORDER 3",
  "MIDDLE ORDER 1", "MIDDLE ORDER 2", "MIDDLE ORDER 3",
  "ALL-ROUNDER 1", "ALL-ROUNDER 2",
  "BOWLER 1", "BOWLER 2", "BOWLER 3"
];

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
      { id: "2023_ned_1", name: "Max O'Dowd", role: "opener", batRating: 80, bowlRating: 0, isWicketkeeper: false, battingAverage: 31.2, strikeRate: 78.5, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_2", name: "Vikramjit Singh", role: "opener", batRating: 78, bowlRating: 50, isWicketkeeper: false, battingAverage: 28.5, strikeRate: 75.0, economyRate: 5.5, bowlingType: "pace-medium", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_3", name: "Colin Ackermann", role: "topOrder", batRating: 83, bowlRating: 72, isWicketkeeper: false, battingAverage: 34.0, strikeRate: 80.0, economyRate: 4.9, bowlingType: "off-spin", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_4", name: "Bas de Leede", role: "allRounder", batRating: 87, bowlRating: 86, isWicketkeeper: false, battingAverage: 32.5, strikeRate: 88.0, economyRate: 5.6, bowlingType: "pace-fast", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_5", name: "Scott Edwards", role: "keeper", batRating: 85, bowlRating: 0, isWicketkeeper: true, battingAverage: 38.2, strikeRate: 90.0, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_6", name: "Sybrand Engelbrecht", role: "middleOrder", batRating: 81, bowlRating: 0, isWicketkeeper: false, battingAverage: 35.0, strikeRate: 82.0, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_7", name: "Teja Nidamanuru", role: "middleOrder", batRating: 82, bowlRating: 0, isWicketkeeper: false, battingAverage: 29.0, strikeRate: 92.0, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_8", name: "Logan van Beek", role: "allRounder", batRating: 76, bowlRating: 84, isWicketkeeper: false, battingAverage: 25.0, strikeRate: 95.0, economyRate: 5.4, bowlingType: "pace-medium", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_9", name: "Roelof van der Merwe", role: "allRounder", batRating: 74, bowlRating: 86, isWicketkeeper: false, battingAverage: 20.0, strikeRate: 98.0, economyRate: 4.7, bowlingType: "left-arm-orthodox", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_10", name: "Aryan Dutt", role: "spinner", batRating: 35, bowlRating: 84, isWicketkeeper: false, battingAverage: 12.0, strikeRate: 70.0, economyRate: 5.1, bowlingType: "off-spin", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_11", name: "Paul van Meekeren", role: "pacer", batRating: 20, bowlRating: 86, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 60.0, economyRate: 5.3, bowlingType: "pace-fast", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_12", name: "Ryan ten Doeschate", role: "allRounder", batRating: 91, bowlRating: 80, isWicketkeeper: false, battingAverage: 67.0, strikeRate: 89.0, economyRate: 5.1, bowlingType: "pace-medium", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_13", name: "Wesley Barresi", role: "topOrder", batRating: 79, bowlRating: 0, isWicketkeeper: false, battingAverage: 30.5, strikeRate: 76.0, economyRate: null, bowlingType: null, nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_14", name: "Shariz Ahmad", role: "spinner", batRating: 20, bowlRating: 78, isWicketkeeper: false, battingAverage: 10.0, strikeRate: 60.0, economyRate: 5.5, bowlingType: "leg-spin", nationalTeam: "NED", tournamentYear: 2023 },
      { id: "2023_ned_15", name: "Saqib Zulfiqar", role: "allRounder", batRating: 72, bowlRating: 76, isWicketkeeper: false, battingAverage: 18.0, strikeRate: 80.0, economyRate: 5.4, bowlingType: "leg-spin", nationalTeam: "NED", tournamentYear: 2023 }
    ]
  },
  {
    nationalTeam: "Zimbabwe",
    tournamentYear: "1999",
    tournamentEdition: "1999 World Cup",
    players: [
      { id: "1999_zim_1", name: "Grant Flower", role: "opener", batRating: 85, bowlRating: 70, isWicketkeeper: false, battingAverage: 33.5, strikeRate: 67.0, economyRate: 4.7, bowlingType: "left-arm-orthodox", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_2", name: "Neil Johnson", role: "allRounder", batRating: 87, bowlRating: 82, isWicketkeeper: false, battingAverage: 36.5, strikeRate: 78.0, economyRate: 4.4, bowlingType: "pace-medium", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_3", name: "Murray Goodwin", role: "topOrder", batRating: 86, bowlRating: 0, isWicketkeeper: false, battingAverage: 37.0, strikeRate: 72.0, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_4", name: "Andy Flower", role: "keeper", batRating: 94, bowlRating: 0, isWicketkeeper: true, battingAverage: 35.3, strikeRate: 74.6, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_5", name: "Alistair Campbell", role: "middleOrder", batRating: 83, bowlRating: 0, isWicketkeeper: false, battingAverage: 30.5, strikeRate: 66.0, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_6", name: "Guy Whittall", role: "allRounder", batRating: 80, bowlRating: 77, isWicketkeeper: false, battingAverage: 22.5, strikeRate: 68.0, economyRate: 4.6, bowlingType: "pace-medium", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_7", name: "Heath Streak", role: "allRounder", batRating: 76, bowlRating: 89, isWicketkeeper: false, battingAverage: 28.3, strikeRate: 73.0, economyRate: 4.5, bowlingType: "pace-fast", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_8", name: "Paul Strang", role: "spinner", batRating: 60, bowlRating: 82, isWicketkeeper: false, battingAverage: 15.0, strikeRate: 60.0, economyRate: 4.3, bowlingType: "leg-spin", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_9", name: "Henry Olonga", role: "pacer", batRating: 15, bowlRating: 84, isWicketkeeper: false, battingAverage: 6.0, strikeRate: 45.0, economyRate: 5.1, bowlingType: "pace-fast", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_10", name: "Eddo Brandes", role: "pacer", batRating: 25, bowlRating: 82, isWicketkeeper: false, battingAverage: 10.0, strikeRate: 65.0, economyRate: 4.5, bowlingType: "pace-fast", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_11", name: "Sikandar Raza", role: "allRounder", batRating: 89, bowlRating: 86, isWicketkeeper: false, battingAverage: 36.6, strikeRate: 85.0, economyRate: 4.9, bowlingType: "off-spin", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_12", name: "Tatenda Taibu", role: "keeper", batRating: 82, bowlRating: 0, isWicketkeeper: true, battingAverage: 29.0, strikeRate: 68.0, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_13", name: "Craig Wishart", role: "topOrder", batRating: 78, bowlRating: 0, isWicketkeeper: false, battingAverage: 28.0, strikeRate: 65.0, economyRate: null, bowlingType: null, nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_14", name: "Ray Price", role: "spinner", batRating: 15, bowlRating: 83, isWicketkeeper: false, battingAverage: 7.0, strikeRate: 45.0, economyRate: 4.0, bowlingType: "left-arm-orthodox", nationalTeam: "ZIM", tournamentYear: 1999 },
      { id: "1999_zim_15", name: "Sean Williams", role: "allRounder", batRating: 88, bowlRating: 81, isWicketkeeper: false, battingAverage: 37.0, strikeRate: 82.0, economyRate: 4.9, bowlingType: "left-arm-orthodox", nationalTeam: "ZIM", tournamentYear: 1999 }
    ]
  },
  {
    nationalTeam: "Ireland",
    tournamentYear: "2011",
    tournamentEdition: "2011 World Cup",
    players: [
      { id: "2011_ire_1", name: "Paul Stirling", role: "opener", batRating: 87, bowlRating: 62, isWicketkeeper: false, battingAverage: 38.0, strikeRate: 86.0, economyRate: 4.8, bowlingType: "off-spin", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_2", name: "William Porterfield", role: "opener", batRating: 84, bowlRating: 0, isWicketkeeper: false, battingAverage: 30.5, strikeRate: 69.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_3", name: "Ed Joyce", role: "topOrder", batRating: 85, bowlRating: 0, isWicketkeeper: false, battingAverage: 38.0, strikeRate: 67.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_4", name: "Niall O'Brien", role: "keeper", batRating: 83, bowlRating: 0, isWicketkeeper: true, battingAverage: 28.5, strikeRate: 75.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_5", name: "Kevin O'Brien", role: "allRounder", batRating: 90, bowlRating: 82, isWicketkeeper: false, battingAverage: 30.5, strikeRate: 89.0, economyRate: 5.2, bowlingType: "pace-medium", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_6", name: "Alex Cusack", role: "allRounder", batRating: 77, bowlRating: 80, isWicketkeeper: false, battingAverage: 22.0, strikeRate: 72.0, economyRate: 4.6, bowlingType: "pace-medium", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_7", name: "John Mooney", role: "allRounder", batRating: 79, bowlRating: 81, isWicketkeeper: false, battingAverage: 24.0, strikeRate: 82.0, economyRate: 5.1, bowlingType: "pace-medium", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_8", name: "Trent Johnston", role: "allRounder", batRating: 73, bowlRating: 83, isWicketkeeper: false, battingAverage: 19.5, strikeRate: 80.0, economyRate: 4.3, bowlingType: "pace-fast", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_9", name: "George Dockrell", role: "spinner", batRating: 30, bowlRating: 83, isWicketkeeper: false, battingAverage: 12.0, strikeRate: 65.0, economyRate: 4.4, bowlingType: "left-arm-orthodox", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_10", name: "Boyd Rankin", role: "pacer", batRating: 15, bowlRating: 86, isWicketkeeper: false, battingAverage: 5.0, strikeRate: 40.0, economyRate: 4.7, bowlingType: "pace-fast", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_11", name: "Andy Balbirnie", role: "topOrder", batRating: 86, bowlRating: 0, isWicketkeeper: false, battingAverage: 32.0, strikeRate: 76.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_12", name: "Joshua Little", role: "pacer", batRating: 20, bowlRating: 87, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 50.0, economyRate: 5.4, bowlingType: "left-arm-pace", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_13", name: "Harry Tector", role: "topOrder", batRating: 88, bowlRating: 72, isWicketkeeper: false, battingAverage: 40.0, strikeRate: 82.0, economyRate: 5.0, bowlingType: "off-spin", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_14", name: "Mark Adair", role: "allRounder", batRating: 75, bowlRating: 85, isWicketkeeper: false, battingAverage: 18.0, strikeRate: 110.0, economyRate: 5.6, bowlingType: "pace-fast", nationalTeam: "IRE", tournamentYear: 2011 },
      { id: "2011_ire_15", name: "Lorcan Tucker", role: "keeper", batRating: 83, bowlRating: 0, isWicketkeeper: true, battingAverage: 28.0, strikeRate: 88.0, economyRate: null, bowlingType: null, nationalTeam: "IRE", tournamentYear: 2011 }
    ]
  },
  {
    nationalTeam: "Afghanistan",
    tournamentYear: "2024",
    tournamentEdition: "2024 T20 World Cup",
    players: [
      { id: "2024_afg_1", name: "Rahmanullah Gurbaz", role: "opener", batRating: 88, bowlRating: 0, isWicketkeeper: true, battingAverage: 37.5, strikeRate: 88.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_2", name: "Ibrahim Zadran", role: "opener", batRating: 89, bowlRating: 0, isWicketkeeper: false, battingAverage: 47.8, strikeRate: 80.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_3", name: "Rahmat Shah", role: "topOrder", batRating: 84, bowlRating: 30, isWicketkeeper: false, battingAverage: 36.5, strikeRate: 70.0, economyRate: 5.2, bowlingType: "leg-spin", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_4", name: "Hashmatullah Shahidi", role: "topOrder", batRating: 85, bowlRating: 0, isWicketkeeper: false, battingAverage: 33.0, strikeRate: 68.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_5", name: "Najibullah Zadran", role: "middleOrder", batRating: 84, bowlRating: 0, isWicketkeeper: false, battingAverage: 30.0, strikeRate: 89.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_6", name: "Mohammad Nabi", role: "allRounder", batRating: 85, bowlRating: 86, isWicketkeeper: false, battingAverage: 27.2, strikeRate: 85.5, economyRate: 4.3, bowlingType: "off-spin", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_7", name: "Azmatullah Omarzai", role: "allRounder", batRating: 87, bowlRating: 84, isWicketkeeper: false, battingAverage: 40.5, strikeRate: 98.0, economyRate: 5.4, bowlingType: "pace-fast", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_8", name: "Gulbadin Naib", role: "allRounder", batRating: 81, bowlRating: 82, isWicketkeeper: false, battingAverage: 21.5, strikeRate: 86.0, economyRate: 5.3, bowlingType: "pace-medium", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_9", name: "Rashid Khan", role: "spinner", batRating: 65, bowlRating: 97, isWicketkeeper: false, battingAverage: 18.5, strikeRate: 110.0, economyRate: 4.2, bowlingType: "leg-spin", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_10", name: "Mujeeb Ur Rahman", role: "spinner", batRating: 25, bowlRating: 88, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 60.0, economyRate: 4.5, bowlingType: "off-spin", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_11", name: "Fazalhaq Farooqi", role: "pacer", batRating: 15, bowlRating: 89, isWicketkeeper: false, battingAverage: 4.0, strikeRate: 40.0, economyRate: 5.0, bowlingType: "left-arm-pace", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_12", name: "Naveen-ul-Haq", role: "pacer", batRating: 20, bowlRating: 86, isWicketkeeper: false, battingAverage: 6.0, strikeRate: 50.0, economyRate: 5.5, bowlingType: "pace-medium", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_13", name: "Hazratullah Zazai", role: "opener", batRating: 83, bowlRating: 0, isWicketkeeper: false, battingAverage: 28.0, strikeRate: 135.0, economyRate: null, bowlingType: null, nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_14", name: "Noor Ahmad", role: "spinner", batRating: 20, bowlRating: 86, isWicketkeeper: false, battingAverage: 5.0, strikeRate: 45.0, economyRate: 4.8, bowlingType: "left-arm-unorthodox", nationalTeam: "AFG", tournamentYear: 2024 },
      { id: "2024_afg_15", name: "Karim Janat", role: "allRounder", batRating: 78, bowlRating: 79, isWicketkeeper: false, battingAverage: 20.0, strikeRate: 110.0, economyRate: 5.8, bowlingType: "pace-medium", nationalTeam: "AFG", tournamentYear: 2024 }
    ]
  },
  {
    id: "1992_pak",
    nationalTeam: "Pakistan",
    tournamentYear: "1992",
    tournamentEdition: "1992 World Cup",
    players: [
      { id: "1992_pak_1", name: "Aamer Sohail", role: "opener", batRating: 82, bowlRating: 40, isWicketkeeper: false, battingAverage: 31.8, strikeRate: 65.5, economyRate: 4.6, bowlingType: "left-arm-orthodox", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_2", name: "Rameez Raja", role: "opener", batRating: 84, bowlRating: 0, isWicketkeeper: false, battingAverage: 32.0, strikeRate: 63.3, economyRate: null, bowlingType: null, nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_3", name: "Imran Khan", role: "allRounder", batRating: 90, bowlRating: 91, isWicketkeeper: false, battingAverage: 33.4, strikeRate: 72.6, economyRate: 3.8, bowlingType: "pace-fast", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_4", name: "Javed Miandad", role: "topOrder", batRating: 93, bowlRating: 0, isWicketkeeper: false, battingAverage: 41.7, strikeRate: 67.0, economyRate: null, bowlingType: null, nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_5", name: "Inzamam-ul-Haq", role: "middleOrder", batRating: 89, bowlRating: 0, isWicketkeeper: false, battingAverage: 39.5, strikeRate: 90.0, economyRate: null, bowlingType: null, nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_6", name: "Wasim Akram", role: "allRounder", batRating: 75, bowlRating: 97, isWicketkeeper: false, battingAverage: 23.5, strikeRate: 88.0, economyRate: 3.8, bowlingType: "left-arm-pace", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_7", name: "Moin Khan", role: "keeper", batRating: 78, bowlRating: 0, isWicketkeeper: true, battingAverage: 23.0, strikeRate: 85.0, economyRate: null, bowlingType: null, nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_8", name: "Mushtaq Ahmed", role: "spinner", batRating: 25, bowlRating: 90, isWicketkeeper: false, battingAverage: 11.0, strikeRate: 60.0, economyRate: 4.2, bowlingType: "leg-spin", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_9", name: "Aaqib Javed", role: "pacer", batRating: 20, bowlRating: 86, isWicketkeeper: false, battingAverage: 10.0, strikeRate: 50.0, economyRate: 4.2, bowlingType: "pace-fast", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_10", name: "Ijaz Ahmed", role: "middleOrder", batRating: 82, bowlRating: 50, isWicketkeeper: false, battingAverage: 32.3, strikeRate: 80.0, economyRate: 4.9, bowlingType: "pace-medium", nationalTeam: "PAK", tournamentYear: 1992 },
      { id: "1992_pak_11", name: "Zahid Fazal", role: "topOrder", batRating: 72, bowlRating: 0, isWicketkeeper: false, battingAverage: 23.0, strikeRate: 60.0, economyRate: null, bowlingType: null, nationalTeam: "PAK", tournamentYear: 1992 }
    ]
  },
  {
    id: "2011_ind",
    nationalTeam: "India",
    tournamentYear: "2011",
    tournamentEdition: "2011 World Cup",
    players: [
      { id: "2011_ind_1", name: "Virender Sehwag", role: "opener", batRating: 93, bowlRating: 40, isWicketkeeper: false, battingAverage: 35.1, strikeRate: 104.3, economyRate: 5.2, bowlingType: "off-spin", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_2", name: "Sachin Tendulkar", role: "opener", batRating: 96, bowlRating: 45, isWicketkeeper: false, battingAverage: 44.8, strikeRate: 86.2, economyRate: 5.1, bowlingType: "leg-spin", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_3", name: "Gautam Gambhir", role: "topOrder", batRating: 90, bowlRating: 0, isWicketkeeper: false, battingAverage: 39.7, strikeRate: 85.2, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_4", name: "Virat Kohli", role: "topOrder", batRating: 88, bowlRating: 0, isWicketkeeper: false, battingAverage: 45.0, strikeRate: 88.0, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_5", name: "Yuvraj Singh", role: "allRounder", batRating: 92, bowlRating: 86, isWicketkeeper: false, battingAverage: 36.5, strikeRate: 87.5, economyRate: 4.8, bowlingType: "left-arm-orthodox", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_6", name: "MS Dhoni", role: "keeper", batRating: 91, bowlRating: 0, isWicketkeeper: true, battingAverage: 50.5, strikeRate: 87.5, economyRate: null, bowlingType: null, nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_7", name: "Suresh Raina", role: "middleOrder", batRating: 84, bowlRating: 60, isWicketkeeper: false, battingAverage: 35.0, strikeRate: 93.0, economyRate: 5.1, bowlingType: "off-spin", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_8", name: "Harbhajan Singh", role: "spinner", batRating: 45, bowlRating: 88, isWicketkeeper: false, battingAverage: 13.0, strikeRate: 80.0, economyRate: 4.3, bowlingType: "off-spin", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_9", name: "Zaheer Khan", role: "pacer", batRating: 20, bowlRating: 94, isWicketkeeper: false, battingAverage: 12.0, strikeRate: 65.0, economyRate: 4.8, bowlingType: "left-arm-pace", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_10", name: "Munaf Patel", role: "pacer", batRating: 15, bowlRating: 85, isWicketkeeper: false, battingAverage: 7.0, strikeRate: 50.0, economyRate: 4.9, bowlingType: "pace-fast", nationalTeam: "IND", tournamentYear: 2011 },
      { id: "2011_ind_11", name: "S. Sreesanth", role: "pacer", batRating: 15, bowlRating: 82, isWicketkeeper: false, battingAverage: 8.0, strikeRate: 50.0, economyRate: 6.0, bowlingType: "pace-fast", nationalTeam: "IND", tournamentYear: 2011 }
    ]
  },
  {
    id: "1996_sl",
    nationalTeam: "Sri Lanka",
    tournamentYear: "1996",
    tournamentEdition: "1996 World Cup",
    players: [
      { id: "1996_sl_1", name: "Sanath Jayasuriya", role: "opener", batRating: 94, bowlRating: 82, isWicketkeeper: false, battingAverage: 32.3, strikeRate: 91.2, economyRate: 4.7, bowlingType: "left-arm-orthodox", nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_2", name: "Romesh Kaluwitharana", role: "keeper", batRating: 82, bowlRating: 0, isWicketkeeper: true, battingAverage: 22.2, strikeRate: 77.8, economyRate: null, bowlingType: null, nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_3", name: "Asanka Gurusinha", role: "topOrder", batRating: 86, bowlRating: 40, isWicketkeeper: false, battingAverage: 28.2, strikeRate: 62.6, economyRate: 4.8, bowlingType: "pace-medium", nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_4", name: "Aravinda de Silva", role: "topOrder", batRating: 95, bowlRating: 75, isWicketkeeper: false, battingAverage: 34.9, strikeRate: 81.1, economyRate: 4.8, bowlingType: "off-spin", nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_5", name: "Arjuna Ranatunga", role: "middleOrder", batRating: 90, bowlRating: 50, isWicketkeeper: false, battingAverage: 35.8, strikeRate: 77.9, economyRate: 4.7, bowlingType: "pace-medium", nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_6", name: "Roshan Mahanama", role: "middleOrder", batRating: 81, bowlRating: 0, isWicketkeeper: false, battingAverage: 29.5, strikeRate: 60.5, economyRate: null, bowlingType: null, nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_7", name: "Hashan Tillakaratne", role: "middleOrder", batRating: 82, bowlRating: 0, isWicketkeeper: false, battingAverage: 29.6, strikeRate: 65.0, economyRate: null, bowlingType: null, nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_8", name: "Chaminda Vaas", role: "pacer", batRating: 60, bowlRating: 91, isWicketkeeper: false, battingAverage: 13.6, strikeRate: 70.0, economyRate: 4.1, bowlingType: "left-arm-pace", nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_9", name: "Muttiah Muralitharan", role: "spinner", batRating: 20, bowlRating: 96, isWicketkeeper: false, battingAverage: 6.9, strikeRate: 70.0, economyRate: 3.9, bowlingType: "off-spin", nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_10", name: "Kumar Dharmasena", role: "allRounder", batRating: 72, bowlRating: 82, isWicketkeeper: false, battingAverage: 19.5, strikeRate: 65.0, economyRate: 4.3, bowlingType: "off-spin", nationalTeam: "SL", tournamentYear: 1996 },
      { id: "1996_sl_11", name: "Pramodya Wickramasinghe", role: "pacer", batRating: 20, bowlRating: 80, isWicketkeeper: false, battingAverage: 9.0, strikeRate: 50.0, economyRate: 4.6, bowlingType: "pace-fast", nationalTeam: "SL", tournamentYear: 1996 }
    ]
  },
  {
    id: "2019_eng",
    nationalTeam: "England",
    tournamentYear: "2019",
    tournamentEdition: "2019 World Cup",
    players: [
      { id: "2019_eng_1", name: "Jason Roy", role: "opener", batRating: 91, bowlRating: 0, isWicketkeeper: false, battingAverage: 39.9, strikeRate: 105.5, economyRate: null, bowlingType: null, nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_2", name: "Jonny Bairstow", role: "opener", batRating: 90, bowlRating: 0, isWicketkeeper: false, battingAverage: 44.2, strikeRate: 103.6, economyRate: null, bowlingType: null, nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_3", name: "Joe Root", role: "topOrder", batRating: 93, bowlRating: 50, isWicketkeeper: false, battingAverage: 48.3, strikeRate: 86.8, economyRate: 5.6, bowlingType: "off-spin", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_4", name: "Eoin Morgan", role: "middleOrder", batRating: 89, bowlRating: 0, isWicketkeeper: false, battingAverage: 39.2, strikeRate: 91.1, economyRate: null, bowlingType: null, nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_5", name: "Ben Stokes", role: "allRounder", batRating: 95, bowlRating: 85, isWicketkeeper: false, battingAverage: 38.9, strikeRate: 95.8, economyRate: 6.0, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_6", name: "Jos Buttler", role: "keeper", batRating: 92, bowlRating: 0, isWicketkeeper: true, battingAverage: 39.5, strikeRate: 117.1, economyRate: null, bowlingType: null, nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_7", name: "Chris Woakes", role: "allRounder", batRating: 78, bowlRating: 88, isWicketkeeper: false, battingAverage: 24.8, strikeRate: 88.6, economyRate: 5.4, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_8", name: "Liam Plunkett", role: "pacer", batRating: 40, bowlRating: 87, isWicketkeeper: false, battingAverage: 21.0, strikeRate: 98.0, economyRate: 5.8, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_9", name: "Jofra Archer", role: "pacer", batRating: 30, bowlRating: 93, isWicketkeeper: false, battingAverage: 11.8, strikeRate: 90.0, economyRate: 4.6, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_10", name: "Adil Rashid", role: "spinner", batRating: 35, bowlRating: 87, isWicketkeeper: false, battingAverage: 18.2, strikeRate: 85.0, economyRate: 5.6, bowlingType: "leg-spin", nationalTeam: "ENG", tournamentYear: 2019 },
      { id: "2019_eng_11", name: "Mark Wood", role: "pacer", batRating: 20, bowlRating: 88, isWicketkeeper: false, battingAverage: 8.5, strikeRate: 70.0, economyRate: 5.5, bowlingType: "pace-fast", nationalTeam: "ENG", tournamentYear: 2019 }
    ]
  }
];

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
  const rerollsLeft = userSquadData.rerollsLeft !== undefined ? userSquadData.rerollsLeft : 1;

  // Clear slot machine animation timer when squad is revealed
  if (reveal && slotAnimationTimer) {
    clearInterval(slotAnimationTimer);
    slotAnimationTimer = null;
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
  const playerUids = Object.keys(playersMap);
  const p1Uid = currentUid;
  const p2Uid = playerUids.find(id => id !== currentUid) || playerUids[0];

  const p1 = playersMap[p1Uid] || { displayName: "PLAYER 1 - YOU" };
  const p2 = playersMap[p2Uid] || { displayName: "PLAYER 2" };

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
                <span style="font-weight: 900; font-size: 1.05rem; color: #111;">PLAYER 1 - YOU</span>
              </div>
              <span style="font-family: var(--font-family-mono); font-weight: 800; font-size: 1.1rem; color: #111;">${p1Count}/11</span>
            </div>
          </div>

          <!-- Player 2 Box -->
          <div style="flex: 1; min-width: 200px; padding: 0.75rem 1rem; background: ${activeUid === p2Uid ? '#ffebee' : '#fff'}; border: 2px solid ${activeUid === p2Uid ? '#d32f2f' : '#ccc'}; border-radius: 0px; position: relative;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${activeUid === p2Uid ? '<span style="background: #d32f2f; color: white; padding: 2px 6px; border-radius: 0px; font-size: 0.65rem; font-weight: 900;">ON THE CLOCK</span>' : ''}
                <span style="font-weight: 900; font-size: 1.05rem; color: #111;">${(p2.displayName || "PLAYER 2").toUpperCase()}</span>
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
          Watch ${(p2.displayName || "Player 2").split(" ")[0]}
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
                    <button id="reroll-squad-btn" class="btn btn-secondary btn-sm" style="font-weight: 900; font-size: 0.75rem; padding: 3px 8px;" ${rerollsLeft > 0 ? '' : 'disabled'}>
                      🎲 REROLL SQUAD (${rerollsLeft} Left)
                    </button>
                  ` : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 380px; overflow-y: auto;" id="rolled-players-grid">
                  ${reveal.players.map((p, idx) => {
                    const claimedIds = draftState.claimedPlayerIds || [];
                    const claimedNames = (draftState.claimedPlayerNames || []).map(n => String(n).toLowerCase().trim());
                    const pNameNorm = String(p.name || '').toLowerCase().trim();
                    const isClaimedById = claimedIds.includes(p.id);
                    const isClaimedByName = claimedNames.some(cn => pNameNorm === cn || pNameNorm.includes(cn) || cn.includes(pNameNorm));
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
                  }).join("")}
                </div>
              </div>
            </div>
          `}
        </div>

        <!-- Room activity log & Side-by-side Field Setup canvas -->
        <div class="controls-card" style="background: #FFFFFF; border: 2px solid #1E1E1E; border-radius: 12px; padding: 1rem; box-shadow: 3px 3px 0px #1E1E1E;">
          <div class="flex justify-between align-center" style="border-bottom: 2px solid #1E1E1E; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
            <h4 style="text-transform: uppercase; font-size: 0.95rem; margin: 0; color: #111; font-weight: 900;">FIELD SETUP (${isViewingOpponent ? (p2.displayName || 'OPPONENT') : 'MY TEAM'})</h4>
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

  // Attach Reroll Squad button handler
  const rerollBtn = document.getElementById("reroll-squad-btn");
  if (rerollBtn && isActiveTurn) {
    rerollBtn.addEventListener("click", async () => {
      if (rerollsLeft <= 0) {
        showToast("You have already used your 1 squad reroll!", true);
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
            <div style="font-weight: 900; font-size: 1.05rem; color: #111111;">${(p1.displayName || "YOU").toUpperCase()}</div>
            <div style="font-size: 0.78rem; font-weight: 800; color: #E53926;">CAPTAIN DESIGNATED</div>
          </div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #C89B3C;">VS</div>
          <div>
            <div style="font-weight: 900; font-size: 1.05rem; color: #111111;">${(p2.displayName || "OPPONENT").toUpperCase()}</div>
            <div style="font-size: 0.78rem; font-weight: 800; color: #1E88E5;">CAPTAIN DESIGNATED</div>
          </div>
        </div>

        <!-- Real Metallic 3D Coin Arena -->
        <div style="perspective: 1000px; margin: 3rem auto 2.5rem auto; width: 140px; height: 140px; position: relative;">
          <div id="toss-coin" style="width: 100%; height: 100%; position: absolute; transform-style: preserve-3d; transition: transform 2.6s cubic-bezier(0.15, 0.85, 0.35, 1.2); transform: ${tossState.flipped ? 'translateY(0) rotateY(1800deg) scale(1)' : 'translateY(0) rotateY(0deg) scale(1)'};">
            <!-- Heads Side (Gold) -->
            <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: radial-gradient(circle at 35% 35%, #FFF2A1, #D4AF37 60%, #aa820a); border: 5px solid #1E1E1E; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 900; color: #111111; box-shadow: inset 0 0 12px rgba(255,255,255,0.7), inset 0 -4px 10px rgba(0,0,0,0.5), 0 6px 15px rgba(0,0,0,0.4); text-shadow: 0 1px 2px rgba(255,255,255,0.8);">
              <span style="font-size: 1.8rem; margin-bottom: -2px;">👑</span>
              <span>HEADS</span>
            </div>
            <!-- Tails Side (Silver) -->
            <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; transform: rotateY(180deg); background: radial-gradient(circle at 35% 35%, #FFFFFF, #B0BEC5 60%, #546E7A); border: 5px solid #1E1E1E; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 900; color: #111111; box-shadow: inset 0 0 12px rgba(255,255,255,0.8), inset 0 -4px 10px rgba(0,0,0,0.5), 0 6px 15px rgba(0,0,0,0.4); text-shadow: 0 1px 2px rgba(255,255,255,0.8);">
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

    } else if (room.mode === "duel") {
      const p1Uid = uids[0];
      const p2Uid = uids[1] || uids[0];
      const teamA = { id: p1Uid, name: players[p1Uid]?.displayName || "Player 1", players: squads[p1Uid]?.slots || [] };
      const teamB = { id: p2Uid, name: players[p2Uid]?.displayName || "Player 2", players: squads[p2Uid]?.slots || [] };

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
let simPlaybackStarted = false;
let simPlaybackRoomCode = null;

function renderSimulatingPhase(viewport, roomCode, room) {
  if (simPlaybackStarted && simPlaybackRoomCode === roomCode) {
    // Match simulation is already actively playing for this room — do not re-render DOM or restart playback on RTDB updates
    return;
  }
  simPlaybackStarted = true;
  simPlaybackRoomCode = roomCode;

  const currentUid = auth.currentUser ? auth.currentUser.uid : "";
  const sim = room.simulation || {};
  const startsAt = sim.startsAt || Date.now();
  const standings = sim.standingsTable || [];

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
      startCinematicHighlightLoop(sim.matches, standings, currentUid, roomCode);
    }
  }, 250);
}

// Fixed 50-second compressed cinematic playback loops
function startCinematicHighlightLoop(matches, standings = [], currentUid = "", roomCode = "") {
  if (!matches || matches.length === 0) return;

  const match = matches[0];
  const i1 = match.inningsData[0];
  const i2 = match.inningsData[1];

  const team1Name = i1.battingTeamName || match.teamAName;
  const team2Name = i2.battingTeamName || match.teamBName;

  const teamAEl = document.getElementById("pb-teamA");
  const teamBEl = document.getElementById("pb-teamB");
  if (teamAEl) teamAEl.innerText = team1Name;
  if (teamBEl) teamBEl.innerText = team2Name;

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
  i1.balls.forEach(b => {
    allDeliveries.push({ innings: 1, ...b });
  });

  // Flatten Innings 2 balls
  i2.balls.forEach(b => {
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
      // Playback complete, reveal standings & winner victory card dynamically
      const statusTitle = document.getElementById("sim-status-title");
      if (statusTitle) statusTitle.innerText = "Match Complete! Standings settled.";

      const finishedScreen = document.getElementById("pb-finished-screen");
      if (finishedScreen) {
        finishedScreen.innerHTML = `
          <div id="champions-victory-card" style="text-align: center; background: radial-gradient(circle at center, #2e1a05 0%, #0d0903 100%); border: 3px solid #ffd700; border-radius: 0px; padding: 2rem 1.5rem; margin-bottom: 2rem; box-shadow: 0 10px 30px rgba(255,215,0,0.3);">
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
    if (ball.innings === 1) {
      if (ball.isWicket) wickets1++;
      if (!ball.isExtra || ball.extraType === "bye") {
        runs1 += ball.runs;
      } else if (ball.extraType === "wide" || ball.extraType === "noball") {
        runs1 += 1; // wides/noballs add 1 penalty
      }
      
      const rA = document.getElementById("pb-runsA");
      const oA = document.getElementById("pb-oversA");
      if (rA) rA.innerText = `${runs1}/${wickets1}`;
      if (oA) oA.innerText = formatOvers(ball.over, ball.ballInOver);
    } else {
      // Innings 2 chase
      const tT = document.getElementById("pb-target-ticker");
      const tR = document.getElementById("pb-target-runs");
      if (tT) tT.style.display = "block";
      if (tR) tR.innerText = `${i1.totalRuns + 1} runs`;

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
