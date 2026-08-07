const fs = require('fs');
const path = require('path');

function getSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').trim();
}

const EDITIONS = [
  // ODI World Cups
  { id: '1975_odi', name: '1975 World Cup', year: 1975, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'KEN'] },
  { id: '1979_odi', name: '1979 World Cup', year: 1979, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'CAN'] },
  { id: '1983_odi', name: '1983 World Cup', year: 1983, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'ZIM'] },
  { id: '1987_odi', name: '1987 World Cup', year: 1987, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'ZIM'] },
  { id: '1992_odi', name: '1992 World Cup', year: 1992, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'RSA', 'ZIM'] },
  { id: '1996_odi', name: '1996 World Cup', year: 1996, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'RSA', 'ZIM', 'KEN', 'NED', 'UAE'] },
  { id: '1999_odi', name: '1999 World Cup', year: 1999, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'RSA', 'ZIM', 'KEN', 'BAN', 'SCO'] },
  { id: '2003_odi', name: '2003 World Cup', year: 2003, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'RSA', 'ZIM', 'KEN', 'BAN', 'NED', 'CAN', 'USA'] },
  { id: '2007_odi', name: '2007 World Cup', year: 2007, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'RSA', 'BAN', 'ZIM', 'KEN', 'IRE', 'NED', 'CAN', 'SCO', 'USA'] },
  { id: '2011_odi', name: '2011 World Cup', year: 2011, format: 'ODI', teams: ['IND', 'AUS', 'PAK', 'WI', 'ENG', 'NZ', 'SL', 'RSA', 'BAN', 'ZIM', 'IRE', 'NED', 'CAN', 'KEN'] },
  { id: '2015_odi', name: '2015 World Cup', year: 2015, format: 'ODI', teams: ['IND', 'AUS', 'WI', 'ENG', 'NZ', 'SL', 'RSA', 'PAK', 'BAN', 'ZIM', 'IRE', 'AFG', 'SCO', 'UAE'] },
  { id: '2019_odi', name: '2019 World Cup', year: 2019, format: 'ODI', teams: ['IND', 'AUS', 'ENG', 'NZ', 'SL', 'RSA', 'PAK', 'BAN', 'AFG', 'WI'] },
  { id: '2023_odi', name: '2023 World Cup', year: 2023, format: 'ODI', teams: ['IND', 'AUS', 'ENG', 'NZ', 'SL', 'RSA', 'PAK', 'BAN', 'AFG', 'NED'] },
  
  // T20 World Cups
  { id: '2007_t20', name: '2007 T20 World Cup', year: 2007, format: 'T20', teams: ['IND', 'AUS', 'PAK', 'RSA', 'WI', 'ENG', 'NZ', 'SL', 'BAN', 'ZIM', 'KEN', 'SCO'] },
  { id: '2009_t20', name: '2009 T20 World Cup', year: 2009, format: 'T20', teams: ['IND', 'AUS', 'PAK', 'RSA', 'WI', 'ENG', 'NZ', 'SL', 'BAN', 'IRE', 'NED', 'SCO'] },
  { id: '2010_t20', name: '2010 T20 World Cup', year: 2010, format: 'T20', teams: ['IND', 'AUS', 'PAK', 'RSA', 'WI', 'ENG', 'NZ', 'SL', 'BAN', 'ZIM', 'AFG', 'IRE'] },
  { id: '2012_t20', name: '2012 T20 World Cup', year: 2012, format: 'T20', teams: ['IND', 'AUS', 'PAK', 'RSA', 'WI', 'ENG', 'NZ', 'SL', 'BAN', 'ZIM', 'AFG', 'IRE'] },
  { id: '2014_t20', name: '2014 T20 World Cup', year: 2014, format: 'T20', teams: ['IND', 'AUS', 'PAK', 'RSA', 'WI', 'ENG', 'NZ', 'SL', 'BAN', 'ZIM', 'AFG', 'IRE', 'NED', 'UAE'] },
  { id: '2016_t20', name: '2016 T20 World Cup', year: 2016, format: 'T20', teams: ['IND', 'AUS', 'PAK', 'RSA', 'WI', 'ENG', 'NZ', 'SL', 'BAN', 'ZIM', 'AFG', 'IRE', 'NED', 'SCO'] },
  { id: '2021_t20', name: '2021 T20 World Cup', year: 2021, format: 'T20', teams: ['IND', 'AUS', 'PAK', 'RSA', 'WI', 'ENG', 'NZ', 'SL', 'BAN', 'AFG', 'IRE', 'NED', 'SCO', 'USA'] },
  { id: '2022_t20', name: '2022 T20 World Cup', year: 2022, format: 'T20', teams: ['IND', 'AUS', 'PAK', 'RSA', 'WI', 'ENG', 'NZ', 'SL', 'BAN', 'AFG', 'IRE', 'NED', 'SCO', 'ZIM'] },
  { id: '2024_t20', name: '2024 T20 World Cup', year: 2024, format: 'T20', teams: ['IND', 'RSA', 'AUS', 'ENG', 'WI', 'AFG', 'PAK', 'USA', 'BAN', 'IRE', 'SCO', 'NED', 'NZ'] }
];

// Real Cricket Players Bank per nation and role
const REAL_PLAYERS_POOL = {
  IND: {
    opener: [
      { name: 'Sachin Tendulkar', batAvg: 44.8, batSR: 86.2, bowlType: 'leg-spin', bowlAvg: 44.4, bowlEcon: 5.1, bowlSR: 52.2 },
      { name: 'Virender Sehwag', batAvg: 35.1, batSR: 104.3, bowlType: 'off-spin', bowlAvg: 40.1, bowlEcon: 5.2, bowlSR: 46.0 },
      { name: 'Rohit Sharma', batAvg: 49.1, batSR: 92.4, bowlType: null },
      { name: 'Gautam Gambhir', batAvg: 39.7, batSR: 85.2, bowlType: null },
      { name: 'Shikhar Dhawan', batAvg: 44.1, batSR: 91.3, bowlType: null },
      { name: 'Yashasvi Jaiswal', batAvg: 36.5, batSR: 161.9, bowlType: null },
      { name: 'Krishnamachari Srikkanth', batAvg: 29.0, batSR: 71.7, bowlType: null },
      { name: 'Sourav Ganguly', batAvg: 41.0, batSR: 73.7, bowlType: 'pace-medium', bowlAvg: 38.4, bowlEcon: 5.0, bowlSR: 45.6 }
    ],
    topOrder: [
      { name: 'Virat Kohli', batAvg: 58.7, batSR: 93.6, bowlType: null },
      { name: 'Rahul Dravid', batAvg: 39.1, batSR: 71.2, bowlType: null },
      { name: 'Mohammad Azharuddin', batAvg: 36.9, batSR: 74.0, bowlType: null },
      { name: 'Suryakumar Yadav', batAvg: 43.3, batSR: 167.7, bowlType: null },
      { name: 'VVS Laxman', batAvg: 30.7, batSR: 69.3, bowlType: null },
      { name: 'Robin Uthappa', batAvg: 25.9, batSR: 90.0, bowlType: null },
      { name: 'Shreyas Iyer', batAvg: 47.6, batSR: 101.2, bowlType: null }
    ],
    middleOrder: [
      { name: 'MS Dhoni', batAvg: 50.6, batSR: 89.0, bowlType: null },
      { name: 'Yuvraj Singh', batAvg: 36.5, batSR: 87.6, bowlType: 'left-arm-orthodox', bowlAvg: 36.2, bowlEcon: 4.8, bowlSR: 45.0 },
      { name: 'Suresh Raina', batAvg: 35.3, batSR: 93.5, bowlType: 'off-spin', bowlAvg: 50.1, bowlEcon: 5.1, bowlSR: 58.0 },
      { name: 'Rishabh Pant', batAvg: 34.6, batSR: 106.6, bowlType: null },
      { name: 'Sanju Samson', batAvg: 56.6, batSR: 99.6, bowlType: null },
      { name: 'Dinesh Karthik', batAvg: 30.2, batSR: 73.2, bowlType: null },
      { name: 'Kedar Jadhav', batAvg: 42.1, batSR: 101.6, bowlType: 'off-spin', bowlAvg: 34.7, bowlEcon: 5.1, bowlSR: 40.0 }
    ],
    keeper: [
      { name: 'MS Dhoni', batAvg: 50.6, batSR: 89.0, bowlType: null },
      { name: 'Rishabh Pant', batAvg: 34.6, batSR: 106.6, bowlType: null },
      { name: 'Sanju Samson', batAvg: 56.6, batSR: 99.6, bowlType: null },
      { name: 'Dinesh Karthik', batAvg: 30.2, batSR: 73.2, bowlType: null },
      { name: 'Nayan Mongia', batAvg: 20.2, batSR: 66.8, bowlType: null },
      { name: 'Kiran More', batAvg: 13.1, batSR: 64.0, bowlType: null }
    ],
    allRounder: [
      { name: 'Kapil Dev', batAvg: 23.8, batSR: 95.0, bowlType: 'pace-fast', bowlAvg: 27.4, bowlEcon: 3.7, bowlSR: 44.0 },
      { name: 'Hardik Pandya', batAvg: 34.0, batSR: 110.3, bowlType: 'pace-fast', bowlAvg: 35.6, bowlEcon: 5.5, bowlSR: 38.0 },
      { name: 'Ravindra Jadeja', batAvg: 32.7, batSR: 85.0, bowlType: 'left-arm-orthodox', bowlAvg: 36.0, bowlEcon: 4.9, bowlSR: 44.0 },
      { name: 'Axar Patel', batAvg: 20.8, batSR: 101.0, bowlType: 'left-arm-orthodox', bowlAvg: 31.8, bowlEcon: 4.5, bowlSR: 42.0 },
      { name: 'Irfan Pathan', batAvg: 23.4, batSR: 79.5, bowlType: 'left-arm-pace', bowlAvg: 29.7, bowlEcon: 5.2, bowlSR: 34.0 },
      { name: 'Yusuf Pathan', batAvg: 27.0, batSR: 113.6, bowlType: 'off-spin', bowlAvg: 33.6, bowlEcon: 5.5, bowlSR: 36.0 },
      { name: 'Ravichandran Ashwin', batAvg: 16.4, batSR: 86.8, bowlType: 'off-spin', bowlAvg: 33.2, bowlEcon: 4.9, bowlSR: 40.0 }
    ],
    spinner: [
      { name: 'Harbhajan Singh', batAvg: 13.3, batSR: 81.0, bowlType: 'off-spin', bowlAvg: 33.4, bowlEcon: 4.3, bowlSR: 46.0 },
      { name: 'Anil Kumble', batAvg: 10.5, batSR: 61.0, bowlType: 'leg-spin', bowlAvg: 30.9, bowlEcon: 4.3, bowlSR: 43.0 },
      { name: 'Kuldeep Yadav', batAvg: 11.2, batSR: 66.0, bowlType: 'left-arm-unorthodox', bowlAvg: 26.0, bowlEcon: 5.0, bowlSR: 31.0 },
      { name: 'Yuzvendra Chahal', batAvg: 5.2, batSR: 45.0, bowlType: 'leg-spin', bowlAvg: 27.1, bowlEcon: 5.2, bowlSR: 31.0 },
      { name: 'Piyush Chawla', batAvg: 14.2, batSR: 75.0, bowlType: 'leg-spin', bowlAvg: 34.9, bowlEcon: 5.1, bowlSR: 41.0 }
    ],
    pacer: [
      { name: 'Jasprit Bumrah', batAvg: 5.4, batSR: 65.0, bowlType: 'pace-fast', bowlAvg: 19.8, bowlEcon: 4.5, bowlSR: 28.5 },
      { name: 'Zaheer Khan', batAvg: 12.0, batSR: 72.0, bowlType: 'left-arm-pace', bowlAvg: 29.4, bowlEcon: 4.9, bowlSR: 35.8 },
      { name: 'Javagal Srinath', batAvg: 10.5, batSR: 70.0, bowlType: 'pace-fast', bowlAvg: 28.1, bowlEcon: 4.4, bowlSR: 37.8 },
      { name: 'Mohammed Shami', batAvg: 8.5, batSR: 78.0, bowlType: 'pace-fast', bowlAvg: 23.8, bowlEcon: 5.5, bowlSR: 26.0 },
      { name: 'Bhuvneshwar Kumar', batAvg: 14.1, batSR: 75.0, bowlType: 'pace-medium', bowlAvg: 35.1, bowlEcon: 5.0, bowlSR: 41.0 },
      { name: 'Arshdeep Singh', batAvg: 6.0, batSR: 60.0, bowlType: 'left-arm-pace', bowlAvg: 24.2, bowlEcon: 5.6, bowlSR: 26.0 },
      { name: 'Mohammed Siraj', batAvg: 7.0, batSR: 55.0, bowlType: 'pace-fast', bowlAvg: 22.7, bowlEcon: 5.2, bowlSR: 26.0 },
      { name: 'Ashish Nehra', batAvg: 5.8, batSR: 58.0, bowlType: 'left-arm-pace', bowlAvg: 31.7, bowlEcon: 5.2, bowlSR: 36.6 },
      { name: 'Munaf Patel', batAvg: 7.1, batSR: 52.0, bowlType: 'pace-medium', bowlAvg: 30.2, bowlEcon: 4.9, bowlSR: 36.7 }
    ]
  },
  AUS: {
    opener: [
      { name: 'Adam Gilchrist', batAvg: 35.8, batSR: 96.9, bowlType: null },
      { name: 'Matthew Hayden', batAvg: 43.8, batSR: 78.9, bowlType: null },
      { name: 'David Warner', batAvg: 45.3, batSR: 97.2, bowlType: null },
      { name: 'Aaron Finch', batAvg: 38.9, batSR: 87.7, bowlType: null },
      { name: 'Mark Waugh', batAvg: 39.3, batSR: 76.9, bowlType: 'off-spin', bowlAvg: 39.0, bowlEcon: 4.7, bowlSR: 49.0 },
      { name: 'Travis Head', batAvg: 42.5, batSR: 104.5, bowlType: 'off-spin', bowlAvg: 45.0, bowlEcon: 5.3, bowlSR: 50.0 }
    ],
    topOrder: [
      { name: 'Ricky Ponting', batAvg: 42.0, batSR: 80.4, bowlType: null },
      { name: 'Steve Smith', batAvg: 43.5, batSR: 87.1, bowlType: 'leg-spin', bowlAvg: 38.0, bowlEcon: 5.3, bowlSR: 43.0 },
      { name: 'Michael Clarke', batAvg: 44.5, batSR: 78.9, bowlType: 'left-arm-orthodox', bowlAvg: 38.1, bowlEcon: 5.0, bowlSR: 45.0 },
      { name: 'Damien Martyn', batAvg: 40.8, batSR: 77.7, bowlType: null },
      { name: 'Justin Langer', batAvg: 32.0, batSR: 70.0, bowlType: null },
      { name: 'Greg Chappell', batAvg: 40.4, batSR: 75.0, bowlType: 'pace-medium', bowlAvg: 29.1, bowlEcon: 4.0, bowlSR: 43.0 }
    ],
    middleOrder: [
      { name: 'Michael Bevan', batAvg: 53.6, batSR: 74.2, bowlType: 'left-arm-unorthodox', bowlAvg: 45.9, bowlEcon: 5.0, bowlSR: 54.0 },
      { name: 'Allan Border', batAvg: 30.6, batSR: 71.4, bowlType: 'left-arm-orthodox', bowlAvg: 28.4, bowlEcon: 4.6, bowlSR: 36.8 },
      { name: 'Darren Lehmann', batAvg: 38.9, batSR: 81.3, bowlType: 'left-arm-orthodox', bowlAvg: 27.7, bowlEcon: 4.8, bowlSR: 34.6 },
      { name: 'George Bailey', batAvg: 40.5, batSR: 83.5, bowlType: null },
      { name: 'Brad Haddin', batAvg: 31.5, batSR: 83.0, bowlType: null },
      { name: 'Alex Carey', batAvg: 33.5, batSR: 88.0, bowlType: null }
    ],
    keeper: [
      { name: 'Adam Gilchrist', batAvg: 35.8, batSR: 96.9, bowlType: null },
      { name: 'Brad Haddin', batAvg: 31.5, batSR: 83.0, bowlType: null },
      { name: 'Matthew Wade', batAvg: 26.5, batSR: 85.0, bowlType: null },
      { name: 'Ian Healy', batAvg: 21.0, batSR: 83.8, bowlType: null },
      { name: 'Alex Carey', batAvg: 33.5, batSR: 88.0, bowlType: null }
    ],
    allRounder: [
      { name: 'Shane Watson', batAvg: 40.5, batSR: 90.4, bowlType: 'pace-fast', bowlAvg: 31.8, bowlEcon: 4.9, bowlSR: 38.0 },
      { name: 'Glenn Maxwell', batAvg: 35.2, batSR: 126.9, bowlType: 'off-spin', bowlAvg: 40.2, bowlEcon: 5.5, bowlSR: 43.0 },
      { name: 'Andrew Symonds', batAvg: 39.7, batSR: 92.4, bowlType: 'off-spin', bowlAvg: 37.2, bowlEcon: 5.0, bowlSR: 44.0 },
      { name: 'Mitchell Marsh', batAvg: 35.8, batSR: 94.0, bowlType: 'pace-fast', bowlAvg: 35.0, bowlEcon: 5.4, bowlSR: 38.0 },
      { name: 'James Faulkner', batAvg: 34.4, batSR: 104.2, bowlType: 'left-arm-pace', bowlAvg: 30.8, bowlEcon: 5.5, bowlSR: 33.0 },
      { name: 'Steve Waugh', batAvg: 32.9, batSR: 75.9, bowlType: 'pace-medium', bowlAvg: 34.6, bowlEcon: 4.7, bowlSR: 44.0 }
    ],
    spinner: [
      { name: 'Shane Warne', batAvg: 13.0, batSR: 72.0, bowlType: 'leg-spin', bowlAvg: 25.7, bowlEcon: 4.2, bowlSR: 36.3 },
      { name: 'Adam Zampa', batAvg: 6.5, batSR: 60.0, bowlType: 'leg-spin', bowlAvg: 28.2, bowlEcon: 5.4, bowlSR: 31.0 },
      { name: 'Brad Hogg', batAvg: 20.2, batSR: 80.0, bowlType: 'left-arm-unorthodox', bowlAvg: 26.8, bowlEcon: 4.5, bowlSR: 35.0 },
      { name: 'Nathan Lyon', batAvg: 17.5, batSR: 75.0, bowlType: 'off-spin', bowlAvg: 46.0, bowlEcon: 4.9, bowlSR: 56.0 },
      { name: 'Ashton Agar', batAvg: 18.0, batSR: 85.0, bowlType: 'left-arm-orthodox', bowlAvg: 45.0, bowlEcon: 5.1, bowlSR: 52.0 }
    ],
    pacer: [
      { name: 'Glenn McGrath', batAvg: 4.0, batSR: 50.0, bowlType: 'pace-fast', bowlAvg: 22.0, bowlEcon: 3.8, bowlSR: 34.0 },
      { name: 'Mitchell Starc', batAvg: 11.2, batSR: 85.0, bowlType: 'left-arm-pace', bowlAvg: 22.4, bowlEcon: 5.1, bowlSR: 26.2 },
      { name: 'Brett Lee', batAvg: 17.6, batSR: 84.0, bowlType: 'pace-fast', bowlAvg: 23.3, bowlEcon: 4.7, bowlSR: 29.4 },
      { name: 'Mitchell Johnson', batAvg: 16.1, batSR: 93.0, bowlType: 'left-arm-pace', bowlAvg: 25.2, bowlEcon: 4.8, bowlSR: 31.2 },
      { name: 'Pat Cummins', batAvg: 16.5, batSR: 82.0, bowlType: 'pace-fast', bowlAvg: 28.5, bowlEcon: 5.2, bowlSR: 32.0 },
      { name: 'Josh Hazlewood', batAvg: 7.2, batSR: 60.0, bowlType: 'pace-fast', bowlAvg: 26.8, bowlEcon: 4.7, bowlSR: 34.0 },
      { name: 'Jason Gillespie', batAvg: 12.5, batSR: 65.0, bowlType: 'pace-fast', bowlAvg: 25.4, bowlEcon: 4.2, bowlSR: 36.0 },
      { name: 'Nathan Bracken', batAvg: 11.0, batSR: 70.0, bowlType: 'left-arm-pace', bowlAvg: 24.3, bowlEcon: 4.4, bowlSR: 33.0 }
    ]
  },
  ENG: {
    opener: [
      { name: 'Jason Roy', batAvg: 39.9, batSR: 105.5, bowlType: null },
      { name: 'Jonny Bairstow', batAvg: 44.2, batSR: 103.6, bowlType: null },
      { name: 'Marcus Trescothick', batAvg: 37.3, batSR: 85.2, bowlType: null },
      { name: 'Alastair Cook', batAvg: 36.4, batSR: 77.1, bowlType: null },
      { name: 'Alex Hales', batAvg: 37.7, batSR: 95.7, bowlType: null },
      { name: 'Graham Gooch', batAvg: 36.9, batSR: 61.8, bowlType: 'pace-medium', bowlAvg: 42.1, bowlEcon: 4.4, bowlSR: 57.0 }
    ],
    topOrder: [
      { name: 'Joe Root', batAvg: 48.3, batSR: 86.8, bowlType: 'off-spin', bowlAvg: 47.0, bowlEcon: 5.6, bowlSR: 50.0 },
      { name: 'Kevin Pietersen', batAvg: 40.7, batSR: 86.5, bowlType: 'off-spin', bowlAvg: 60.0, bowlEcon: 5.3, bowlSR: 68.0 },
      { name: 'Jonathan Trott', batAvg: 51.2, batSR: 77.0, bowlType: null },
      { name: 'Ian Bell', batAvg: 37.8, batSR: 77.1, bowlType: null },
      { name: 'Harry Brook', batAvg: 32.5, batSR: 100.0, bowlType: null },
      { name: 'Allan Lamb', batAvg: 39.3, batSR: 75.5, bowlType: null }
    ],
    middleOrder: [
      { name: 'Eoin Morgan', batAvg: 39.2, batSR: 91.1, bowlType: null },
      { name: 'Jos Buttler', batAvg: 39.5, batSR: 117.1, bowlType: null },
      { name: 'Paul Collingwood', batAvg: 35.3, batSR: 76.9, bowlType: 'pace-medium', bowlAvg: 38.6, bowlEcon: 4.9, bowlSR: 46.8 },
      { name: 'Ben Duckett', batAvg: 42.0, batSR: 98.0, bowlType: null },
      { name: 'Neil Fairbrother', batAvg: 39.4, batSR: 72.8, bowlType: null }
    ],
    keeper: [
      { name: 'Jos Buttler', batAvg: 39.5, batSR: 117.1, bowlType: null },
      { name: 'Alec Stewart', batAvg: 31.6, batSR: 68.3, bowlType: null },
      { name: 'Matt Prior', batAvg: 24.1, batSR: 76.5, bowlType: null },
      { name: 'Jonny Bairstow', batAvg: 44.2, batSR: 103.6, bowlType: null }
    ],
    allRounder: [
      { name: 'Ben Stokes', batAvg: 38.9, batSR: 95.8, bowlType: 'pace-fast', bowlAvg: 42.3, bowlEcon: 6.0, bowlSR: 42.0 },
      { name: 'Andrew Flintoff', batAvg: 32.0, batSR: 88.8, bowlType: 'pace-fast', bowlAvg: 24.3, bowlEcon: 4.3, bowlSR: 33.2 },
      { name: 'Chris Woakes', batAvg: 24.8, batSR: 88.6, bowlType: 'pace-fast', bowlAvg: 30.2, bowlEcon: 5.4, bowlSR: 33.3 },
      { name: 'Moeen Ali', batAvg: 25.1, batSR: 99.4, bowlType: 'off-spin', bowlAvg: 47.9, bowlEcon: 5.3, bowlSR: 54.0 },
      { name: 'Liam Livingstone', batAvg: 28.5, batSR: 112.0, bowlType: 'off-spin', bowlAvg: 42.0, bowlEcon: 5.7, bowlSR: 44.0 }
    ],
    spinner: [
      { name: 'Adil Rashid', batAvg: 18.2, batSR: 85.0, bowlType: 'leg-spin', bowlAvg: 32.3, bowlEcon: 5.6, bowlSR: 34.5 },
      { name: 'Graeme Swann', batAvg: 14.1, batSR: 78.0, bowlType: 'off-spin', bowlAvg: 27.7, bowlEcon: 4.5, bowlSR: 36.6 },
      { name: 'Monty Panesar', batAvg: 5.0, batSR: 40.0, bowlType: 'left-arm-orthodox', bowlAvg: 52.0, bowlEcon: 4.6, bowlSR: 67.0 }
    ],
    pacer: [
      { name: 'James Anderson', batAvg: 7.5, batSR: 60.0, bowlType: 'pace-fast', bowlAvg: 29.2, bowlEcon: 4.9, bowlSR: 35.8 },
      { name: 'Stuart Broad', batAvg: 12.2, batSR: 74.0, bowlType: 'pace-fast', bowlAvg: 30.1, bowlEcon: 5.2, bowlSR: 34.5 },
      { name: 'Jofra Archer', batAvg: 11.8, batSR: 90.0, bowlType: 'pace-fast', bowlAvg: 24.0, bowlEcon: 4.6, bowlSR: 31.0 },
      { name: 'Mark Wood', batAvg: 8.5, batSR: 70.0, bowlType: 'pace-fast', bowlAvg: 37.8, bowlEcon: 5.5, bowlSR: 40.0 },
      { name: 'Liam Plunkett', batAvg: 21.0, batSR: 98.0, bowlType: 'pace-fast', bowlAvg: 29.7, bowlEcon: 5.8, bowlSR: 30.5 },
      { name: 'Darren Gough', batAvg: 12.4, batSR: 68.0, bowlType: 'pace-fast', bowlAvg: 26.4, bowlEcon: 4.3, bowlSR: 36.5 }
    ]
  },
  PAK: {
    opener: [
      { name: 'Saeed Anwar', batAvg: 39.2, batSR: 80.6, bowlType: 'left-arm-orthodox', bowlAvg: 45.0, bowlEcon: 4.8, bowlSR: 56.0 },
      { name: 'Babar Azam', batAvg: 56.7, batSR: 88.2, bowlType: null },
      { name: 'Mohammad Rizwan', batAvg: 40.2, batSR: 89.5, bowlType: null },
      { name: 'Aamer Sohail', batAvg: 31.8, batSR: 65.5, bowlType: 'left-arm-orthodox', bowlAvg: 42.0, bowlEcon: 4.6, bowlSR: 54.0 },
      { name: 'Fakhar Zaman', batAvg: 45.6, batSR: 93.3, bowlType: 'left-arm-orthodox', bowlAvg: 48.0, bowlEcon: 5.1, bowlSR: 56.0 },
      { name: 'Imam-ul-Haq', batAvg: 48.2, batSR: 82.0, bowlType: null }
    ],
    topOrder: [
      { name: 'Javed Miandad', batAvg: 41.7, batSR: 67.0, bowlType: 'leg-spin', bowlAvg: 42.0, bowlEcon: 4.6, bowlSR: 54.0 },
      { name: 'Younis Khan', batAvg: 31.2, batSR: 75.3, bowlType: null },
      { name: 'Mohammad Yousuf', batAvg: 41.7, batSR: 75.1, bowlType: null },
      { name: 'Zaheer Abbas', batAvg: 47.6, batSR: 84.8, bowlType: 'off-spin', bowlAvg: 38.0, bowlEcon: 4.2, bowlSR: 54.0 },
      { name: 'Inzamam-ul-Haq', batAvg: 39.5, batSR: 74.2, bowlType: null }
    ],
    middleOrder: [
      { name: 'Inzamam-ul-Haq', batAvg: 39.5, batSR: 74.2, bowlType: null },
      { name: 'Misbah-ul-Haq', batAvg: 43.4, batSR: 73.7, bowlType: null },
      { name: 'Shoaib Malik', batAvg: 34.5, batSR: 81.9, bowlType: 'off-spin', bowlAvg: 39.1, bowlEcon: 4.6, bowlSR: 50.4 },
      { name: 'Ijaz Ahmed', batAvg: 32.3, batSR: 80.3, bowlType: 'pace-medium', bowlAvg: 33.0, bowlEcon: 4.7, bowlSR: 42.0 },
      { name: 'Saleem Malik', batAvg: 32.9, batSR: 76.4, bowlType: 'off-spin', bowlAvg: 33.2, bowlEcon: 4.6, bowlSR: 43.0 }
    ],
    keeper: [
      { name: 'Moin Khan', batAvg: 23.0, batSR: 81.3, bowlType: null },
      { name: 'Rashid Latif', batAvg: 19.0, batSR: 76.2, bowlType: null },
      { name: 'Mohammad Rizwan', batAvg: 40.2, batSR: 89.5, bowlType: null },
      { name: 'Kamran Akmal', batAvg: 26.1, batSR: 84.3, bowlType: null },
      { name: 'Sarfaraz Ahmed', batAvg: 33.6, batSR: 87.8, bowlType: null }
    ],
    allRounder: [
      { name: 'Imran Khan', batAvg: 33.4, batSR: 72.6, bowlType: 'pace-fast', bowlAvg: 26.6, bowlEcon: 3.9, bowlSR: 40.9 },
      { name: 'Wasim Akram', batAvg: 16.5, batSR: 88.0, bowlType: 'left-arm-pace', bowlAvg: 23.5, bowlEcon: 3.8, bowlSR: 36.2 },
      { name: 'Shahid Afridi', batAvg: 23.5, batSR: 117.0, bowlType: 'leg-spin', bowlAvg: 34.5, bowlEcon: 4.6, bowlSR: 44.5 },
      { name: 'Abdul Razzaq', batAvg: 29.7, batSR: 81.3, bowlType: 'pace-fast', bowlAvg: 31.8, bowlEcon: 4.7, bowlSR: 40.5 },
      { name: 'Shadab Khan', batAvg: 26.0, batSR: 92.0, bowlType: 'leg-spin', bowlAvg: 32.5, bowlEcon: 5.1, bowlSR: 38.0 }
    ],
    spinner: [
      { name: 'Saqlain Mushtaq', batAvg: 11.4, batSR: 62.0, bowlType: 'off-spin', bowlAvg: 21.8, bowlEcon: 4.3, bowlSR: 30.4 },
      { name: 'Saeed Ajmal', batAvg: 9.0, batSR: 65.0, bowlType: 'off-spin', bowlAvg: 22.7, bowlEcon: 4.2, bowlSR: 32.6 },
      { name: 'Mushtaq Ahmed', batAvg: 8.5, batSR: 55.0, bowlType: 'leg-spin', bowlAvg: 33.3, bowlEcon: 4.3, bowlSR: 46.8 },
      { name: 'Abdul Qadir', batAvg: 15.6, batSR: 60.0, bowlType: 'leg-spin', bowlAvg: 26.2, bowlEcon: 4.1, bowlSR: 38.0 }
    ],
    pacer: [
      { name: 'Waqar Younis', batAvg: 10.3, batSR: 68.0, bowlType: 'pace-fast', bowlAvg: 23.8, bowlEcon: 4.7, bowlSR: 30.5 },
      { name: 'Shoaib Akhtar', batAvg: 8.9, batSR: 73.0, bowlType: 'pace-fast', bowlAvg: 25.0, bowlEcon: 4.8, bowlSR: 31.4 },
      { name: 'Shaheen Afridi', batAvg: 10.0, batSR: 75.0, bowlType: 'left-arm-pace', bowlAvg: 23.4, bowlEcon: 5.5, bowlSR: 25.5 },
      { name: 'Haris Rauf', batAvg: 7.0, batSR: 60.0, bowlType: 'pace-fast', bowlAvg: 26.0, bowlEcon: 5.8, bowlSR: 26.8 },
      { name: 'Naseem Shah', batAvg: 8.0, batSR: 65.0, bowlType: 'pace-fast', bowlAvg: 24.5, bowlEcon: 4.9, bowlSR: 29.0 },
      { name: 'Umar Gul', batAvg: 11.2, batSR: 80.0, bowlType: 'pace-fast', bowlAvg: 28.7, bowlEcon: 5.2, bowlSR: 33.0 },
      { name: 'Aqib Javed', batAvg: 8.0, batSR: 50.0, bowlType: 'pace-fast', bowlAvg: 31.4, bowlEcon: 4.3, bowlSR: 44.0 }
    ]
  },
  WI: {
    opener: [
      { name: 'Gordon Greenidge', batAvg: 45.0, batSR: 64.9, bowlType: null },
      { name: 'Desmond Haynes', batAvg: 41.4, batSR: 63.1, bowlType: null },
      { name: 'Chris Gayle', batAvg: 37.8, batSR: 87.2, bowlType: 'off-spin', bowlAvg: 35.2, bowlEcon: 4.7, bowlSR: 44.5 },
      { name: 'Roy Fredericks', batAvg: 35.0, batSR: 68.0, bowlType: null },
      { name: 'Johnson Charles', batAvg: 27.5, batSR: 86.0, bowlType: null },
      { name: 'Evin Lewis', batAvg: 36.8, batSR: 83.0, bowlType: null }
    ],
    topOrder: [
      { name: 'Viv Richards', batAvg: 47.0, batSR: 90.2, bowlType: 'off-spin', bowlAvg: 35.8, bowlEcon: 4.4, bowlSR: 48.0 },
      { name: 'Brian Lara', batAvg: 40.5, batSR: 79.5, bowlType: null },
      { name: 'Alvin Kallicharran', batAvg: 34.4, batSR: 65.0, bowlType: null },
      { name: 'Rohan Kanhai', batAvg: 37.5, batSR: 60.0, bowlType: null },
      { name: 'Marlon Samuels', batAvg: 32.9, batSR: 75.1, bowlType: 'off-spin', bowlAvg: 44.0, bowlEcon: 4.8, bowlSR: 55.0 },
      { name: 'Nicholas Pooran', batAvg: 36.5, batSR: 98.0, bowlType: null }
    ],
    middleOrder: [
      { name: 'Clive Lloyd', batAvg: 39.5, batSR: 81.2, bowlType: 'pace-medium', bowlAvg: 26.2, bowlEcon: 4.0, bowlSR: 39.0 },
      { name: 'Shivnarine Chanderpaul', batAvg: 41.6, batSR: 70.7, bowlType: 'leg-spin', bowlAvg: 56.0, bowlEcon: 5.1, bowlSR: 66.0 },
      { name: 'Ramnaresh Sarwan', batAvg: 42.7, batSR: 75.7, bowlType: 'leg-spin', bowlAvg: 36.0, bowlEcon: 5.4, bowlSR: 40.0 },
      { name: 'Carl Hooper', batAvg: 35.3, batSR: 76.6, bowlType: 'off-spin', bowlAvg: 36.0, bowlEcon: 4.4, bowlSR: 49.0 },
      { name: 'Shimron Hetmyer', batAvg: 35.2, batSR: 106.0, bowlType: null }
    ],
    keeper: [
      { name: 'Deryck Murray', batAvg: 24.5, batSR: 55.0, bowlType: null },
      { name: 'Jeff Dujon', batAvg: 23.2, batSR: 67.0, bowlType: null },
      { name: 'Denesh Ramdin', batAvg: 25.0, batSR: 70.4, bowlType: null },
      { name: 'Ridley Jacobs', batAvg: 28.3, batSR: 77.8, bowlType: null },
      { name: 'Shai Hope', batAvg: 50.2, batSR: 76.5, bowlType: null }
    ],
    allRounder: [
      { name: 'Dwayne Bravo', batAvg: 27.6, batSR: 82.3, bowlType: 'pace-medium', bowlAvg: 29.5, bowlEcon: 5.4, bowlSR: 32.7 },
      { name: 'Andre Russell', batAvg: 27.2, batSR: 130.2, bowlType: 'pace-fast', bowlAvg: 31.8, bowlEcon: 5.8, bowlSR: 32.8 },
      { name: 'Jason Holder', batAvg: 24.5, batSR: 91.0, bowlType: 'pace-medium', bowlAvg: 36.5, bowlEcon: 5.5, bowlSR: 39.8 },
      { name: 'Kieron Pollard', batAvg: 26.0, batSR: 94.4, bowlType: 'pace-medium', bowlAvg: 39.2, bowlEcon: 5.7, bowlSR: 41.0 },
      { name: 'Darren Sammy', batAvg: 24.9, batSR: 101.0, bowlType: 'pace-medium', bowlAvg: 35.4, bowlEcon: 4.6, bowlSR: 46.0 },
      { name: 'Carlos Brathwaite', batAvg: 16.2, batSR: 90.0, bowlType: 'pace-medium', bowlAvg: 41.0, bowlEcon: 5.8, bowlSR: 42.0 }
    ],
    spinner: [
      { name: 'Sunil Narine', batAvg: 11.0, batSR: 80.0, bowlType: 'off-spin', bowlAvg: 26.4, bowlEcon: 4.1, bowlSR: 38.0 },
      { name: 'Samuel Badree', batAvg: 8.0, batSR: 50.0, bowlType: 'leg-spin', bowlAvg: 21.0, bowlEcon: 4.8, bowlSR: 26.0 },
      { name: 'Lance Gibbs', batAvg: 5.0, batSR: 40.0, bowlType: 'off-spin', bowlAvg: 27.2, bowlEcon: 2.7, bowlSR: 59.0 },
      { name: 'Sulieman Benn', batAvg: 8.5, batSR: 60.0, bowlType: 'left-arm-orthodox', bowlAvg: 31.8, bowlEcon: 4.7, bowlSR: 40.0 }
    ],
    pacer: [
      { name: 'Curtly Ambrose', batAvg: 7.2, batSR: 50.0, bowlType: 'pace-fast', bowlAvg: 24.1, bowlEcon: 3.4, bowlSR: 41.7 },
      { name: 'Courtney Walsh', batAvg: 7.0, batSR: 52.0, bowlType: 'pace-fast', bowlAvg: 30.4, bowlEcon: 3.8, bowlSR: 47.6 },
      { name: 'Andy Roberts', batAvg: 10.0, batSR: 55.0, bowlType: 'pace-fast', bowlAvg: 20.3, bowlEcon: 3.4, bowlSR: 35.8 },
      { name: 'Michael Holding', batAvg: 9.0, batSR: 60.0, bowlType: 'pace-fast', bowlAvg: 21.3, bowlEcon: 3.3, bowlSR: 38.4 },
      { name: 'Joel Garner', batAvg: 9.5, batSR: 65.0, bowlType: 'pace-fast', bowlAvg: 18.8, bowlEcon: 3.0, bowlSR: 36.5 },
      { name: 'Malcolm Marshall', batAvg: 14.8, batSR: 70.0, bowlType: 'pace-fast', bowlAvg: 26.9, bowlEcon: 3.5, bowlSR: 45.4 },
      { name: 'Alzarri Joseph', batAvg: 12.0, batSR: 75.0, bowlType: 'pace-fast', bowlAvg: 27.5, bowlEcon: 5.4, bowlSR: 30.5 }
    ]
  },
  RSA: {
    opener: [
      { name: 'Hashim Amla', batAvg: 49.4, batSR: 88.3, bowlType: null },
      { name: 'Quinton de Kock', batAvg: 45.7, batSR: 96.6, bowlType: null },
      { name: 'Graeme Smith', batAvg: 37.9, batSR: 80.8, bowlType: 'off-spin', bowlAvg: 53.0, bowlEcon: 5.4, bowlSR: 58.0 },
      { name: 'Herschelle Gibbs', batAvg: 36.1, batSR: 83.2, bowlType: null },
      { name: 'Gary Kirsten', batAvg: 40.9, batSR: 72.0, bowlType: null }
    ],
    topOrder: [
      { name: 'AB de Villiers', batAvg: 53.5, batSR: 101.2, bowlType: null },
      { name: 'Faf du Plessis', batAvg: 47.4, batSR: 88.6, bowlType: 'leg-spin', bowlAvg: 45.0, bowlEcon: 5.2, bowlSR: 52.0 },
      { name: 'Jacques Kallis', batAvg: 44.3, batSR: 72.8, bowlType: 'pace-medium', bowlAvg: 31.7, bowlEcon: 4.8, bowlSR: 39.3 },
      { name: 'Aiden Markram', batAvg: 36.5, batSR: 95.0, bowlType: 'off-spin', bowlAvg: 38.0, bowlEcon: 5.5, bowlSR: 41.0 },
      { name: 'Daryl Cullinan', batAvg: 33.0, batSR: 71.0, bowlType: null }
    ],
    middleOrder: [
      { name: 'David Miller', batAvg: 42.6, batSR: 103.3, bowlType: null },
      { name: 'Heinrich Klaasen', batAvg: 41.5, batSR: 115.0, bowlType: null },
      { name: 'Hansie Cronje', batAvg: 38.6, batSR: 76.4, bowlType: 'pace-medium', bowlAvg: 34.7, bowlEcon: 4.4, bowlSR: 46.8 },
      { name: 'Jonty Rhodes', batAvg: 35.1, batSR: 80.9, bowlType: null },
      { name: 'JP Duminy', batAvg: 36.8, batSR: 84.5, bowlType: 'off-spin', bowlAvg: 28.7, bowlEcon: 4.6, bowlSR: 37.0 }
    ],
    keeper: [
      { name: 'Quinton de Kock', batAvg: 45.7, batSR: 96.6, bowlType: null },
      { name: 'Mark Boucher', batAvg: 28.5, batSR: 84.7, bowlType: null },
      { name: 'Heinrich Klaasen', batAvg: 41.5, batSR: 115.0, bowlType: null },
      { name: 'Dave Richardson', batAvg: 19.5, batSR: 62.0, bowlType: null }
    ],
    allRounder: [
      { name: 'Jacques Kallis', batAvg: 44.3, batSR: 72.8, bowlType: 'pace-medium', bowlAvg: 31.7, bowlEcon: 4.8, bowlSR: 39.3 },
      { name: 'Lance Klusener', batAvg: 41.1, batSR: 89.9, bowlType: 'pace-medium', bowlAvg: 29.9, bowlEcon: 4.7, bowlSR: 38.2 },
      { name: 'Shaun Pollock', batAvg: 26.4, batSR: 86.6, bowlType: 'pace-fast', bowlAvg: 24.5, bowlEcon: 3.6, bowlSR: 40.0 },
      { name: 'Wayne Parnell', batAvg: 22.0, batSR: 80.0, bowlType: 'left-arm-pace', bowlAvg: 30.0, bowlEcon: 5.2, bowlSR: 34.0 },
      { name: 'Marco Jansen', batAvg: 25.0, batSR: 95.0, bowlType: 'left-arm-pace', bowlAvg: 32.0, bowlEcon: 5.6, bowlSR: 34.0 }
    ],
    spinner: [
      { name: 'Imran Tahir', batAvg: 7.5, batSR: 60.0, bowlType: 'leg-spin', bowlAvg: 24.8, bowlEcon: 4.6, bowlSR: 32.0 },
      { name: 'Tabraiz Shamsi', batAvg: 4.5, batSR: 40.0, bowlType: 'left-arm-unorthodox', bowlAvg: 27.0, bowlEcon: 5.3, bowlSR: 30.5 },
      { name: 'Paul Adams', batAvg: 9.5, batSR: 55.0, bowlType: 'left-arm-unorthodox', bowlAvg: 28.1, bowlEcon: 4.5, bowlSR: 37.0 },
      { name: 'Keshav Maharaj', batAvg: 15.0, batSR: 75.0, bowlType: 'left-arm-orthodox', bowlAvg: 31.0, bowlEcon: 4.7, bowlSR: 39.0 }
    ],
    pacer: [
      { name: 'Dale Steyn', batAvg: 8.5, batSR: 70.0, bowlType: 'pace-fast', bowlAvg: 25.9, bowlEcon: 4.8, bowlSR: 31.8 },
      { name: 'Allan Donald', batAvg: 4.3, batSR: 40.0, bowlType: 'pace-fast', bowlAvg: 21.7, bowlEcon: 4.1, bowlSR: 31.4 },
      { name: 'Kagiso Rabada', batAvg: 18.0, batSR: 80.0, bowlType: 'pace-fast', bowlAvg: 27.5, bowlEcon: 5.0, bowlSR: 32.6 },
      { name: 'Morne Morkel', batAvg: 7.8, batSR: 65.0, bowlType: 'pace-fast', bowlAvg: 25.3, bowlEcon: 4.9, bowlSR: 30.8 },
      { name: 'Anrich Nortje', batAvg: 6.0, batSR: 50.0, bowlType: 'pace-fast', bowlAvg: 24.0, bowlEcon: 5.4, bowlSR: 26.5 },
      { name: 'Makhaya Ntini', batAvg: 8.6, batSR: 66.0, bowlType: 'pace-fast', bowlAvg: 24.6, bowlEcon: 4.4, bowlSR: 33.4 }
    ]
  },
  SL: {
    opener: [
      { name: 'Sanath Jayasuriya', batAvg: 32.3, batSR: 91.2, bowlType: 'left-arm-orthodox', bowlAvg: 36.7, bowlEcon: 4.8, bowlSR: 46.0 },
      { name: 'Marvan Atapattu', batAvg: 37.5, batSR: 67.7, bowlType: null },
      { name: 'Tillakaratne Dilshan', batAvg: 39.2, batSR: 86.2, bowlType: 'off-spin', bowlAvg: 45.0, bowlEcon: 4.8, bowlSR: 55.0 },
      { name: 'Upul Tharanga', batAvg: 34.3, batSR: 75.8, bowlType: null },
      { name: 'Pathum Nissanka', batAvg: 43.8, batSR: 89.2, bowlType: null }
    ],
    topOrder: [
      { name: 'Kumar Sangakkara', batAvg: 41.9, batSR: 78.8, bowlType: null },
      { name: 'Mahela Jayawardene', batAvg: 33.3, batSR: 78.9, bowlType: 'pace-medium', bowlAvg: 40.0, bowlEcon: 4.8, bowlSR: 50.0 },
      { name: 'Aravinda de Silva', batAvg: 34.9, batSR: 81.1, bowlType: 'off-spin', bowlAvg: 39.4, bowlEcon: 4.8, bowlSR: 48.0 },
      { name: 'Asanka Gurusinha', batAvg: 28.2, batSR: 60.0, bowlType: 'pace-medium', bowlAvg: 50.0, bowlEcon: 4.5, bowlSR: 66.0 },
      { name: 'Charith Asalanka', batAvg: 41.5, batSR: 89.0, bowlType: 'off-spin', bowlAvg: 35.0, bowlEcon: 4.8, bowlSR: 43.0 }
    ],
    middleOrder: [
      { name: 'Arjuna Ranatunga', batAvg: 35.8, batSR: 77.9, bowlType: 'pace-medium', bowlAvg: 47.5, bowlEcon: 4.7, bowlSR: 60.0 },
      { name: 'Roshan Mahanama', batAvg: 29.5, batSR: 60.5, bowlType: null },
      { name: 'Hashan Tillakaratne', batAvg: 29.6, batSR: 65.2, bowlType: null },
      { name: 'Bhanuka Rajapaksa', batAvg: 26.0, batSR: 130.0, bowlType: null }
    ],
    keeper: [
      { name: 'Kumar Sangakkara', batAvg: 41.9, batSR: 78.8, bowlType: null },
      { name: 'Romesh Kaluwitharana', batAvg: 22.2, batSR: 78.1, bowlType: null },
      { name: 'Kusal Perera', batAvg: 31.0, batSR: 92.5, bowlType: null },
      { name: 'Kusal Mendis', batAvg: 32.5, batSR: 85.0, bowlType: null }
    ],
    allRounder: [
      { name: 'Angelo Mathews', batAvg: 41.0, batSR: 83.0, bowlType: 'pace-medium', bowlAvg: 33.4, bowlEcon: 4.6, bowlSR: 43.0 },
      { name: 'Wanindu Hasaranga', batAvg: 23.5, batSR: 110.0, bowlType: 'leg-spin', bowlAvg: 21.6, bowlEcon: 5.0, bowlSR: 25.8 },
      { name: 'Chaminda Vaas', batAvg: 13.7, batSR: 72.0, bowlType: 'left-arm-pace', bowlAvg: 27.5, bowlEcon: 4.2, bowlSR: 39.4 },
      { name: 'Thisara Perera', batAvg: 19.9, batSR: 112.0, bowlType: 'pace-medium', bowlAvg: 32.8, bowlEcon: 5.8, bowlSR: 33.8 },
      { name: 'Dasun Shanaka', batAvg: 22.4, batSR: 93.0, bowlType: 'pace-medium', bowlAvg: 34.0, bowlEcon: 5.5, bowlSR: 37.0 }
    ],
    spinner: [
      { name: 'Muttiah Muralitharan', batAvg: 6.8, batSR: 75.0, bowlType: 'off-spin', bowlAvg: 23.0, bowlEcon: 3.9, bowlSR: 35.0 },
      { name: 'Rangana Herath', batAvg: 11.0, batSR: 60.0, bowlType: 'left-arm-orthodox', bowlAvg: 31.9, bowlEcon: 4.4, bowlSR: 43.0 },
      { name: 'Ajantha Mendis', batAvg: 8.5, batSR: 65.0, bowlType: 'off-spin', bowlAvg: 21.8, bowlEcon: 4.8, bowlSR: 27.2 },
      { name: 'Maheesh Theekshana', batAvg: 7.0, batSR: 60.0, bowlType: 'off-spin', bowlAvg: 26.0, bowlEcon: 4.5, bowlSR: 34.0 }
    ],
    pacer: [
      { name: 'Lasith Malinga', batAvg: 6.2, batSR: 72.0, bowlType: 'pace-fast', bowlAvg: 27.2, bowlEcon: 5.2, bowlSR: 32.0 },
      { name: 'Nuwan Kulasekara', batAvg: 14.5, batSR: 75.0, bowlType: 'pace-medium', bowlAvg: 33.9, bowlEcon: 4.9, bowlSR: 41.0 },
      { name: 'Dilhara Fernando', batAvg: 7.5, batSR: 55.0, bowlType: 'pace-fast', bowlAvg: 30.6, bowlEcon: 5.2, bowlSR: 35.0 },
      { name: 'Dushmantha Chameera', batAvg: 8.0, batSR: 60.0, bowlType: 'pace-fast', bowlAvg: 32.0, bowlEcon: 5.4, bowlSR: 35.0 }
    ]
  },
  NZ: {
    opener: [
      { name: 'Brendon McCullum', batAvg: 30.4, batSR: 96.4, bowlType: null },
      { name: 'Martin Guptill', batAvg: 41.7, batSR: 87.6, bowlType: 'off-spin', bowlAvg: 42.0, bowlEcon: 5.3, bowlSR: 48.0 },
      { name: 'Stephen Fleming', batAvg: 32.4, batSR: 71.4, bowlType: null },
      { name: 'Devon Conway', batAvg: 44.0, batSR: 88.5, bowlType: null },
      { name: 'Nathan Astle', batAvg: 34.9, batSR: 72.6, bowlType: 'pace-medium', bowlAvg: 38.4, bowlEcon: 4.7, bowlSR: 48.8 }
    ],
    topOrder: [
      { name: 'Kane Williamson', batAvg: 48.2, batSR: 81.0, bowlType: 'off-spin', bowlAvg: 35.0, bowlEcon: 5.3, bowlSR: 40.0 },
      { name: 'Ross Taylor', batAvg: 47.5, batSR: 83.3, bowlType: null },
      { name: 'Martin Crowe', batAvg: 38.5, batSR: 72.6, bowlType: null },
      { name: 'Daryl Mitchell', batAvg: 42.5, batSR: 93.0, bowlType: 'pace-medium', bowlAvg: 36.0, bowlEcon: 5.5, bowlSR: 39.0 },
      { name: 'Rachin Ravindra', batAvg: 41.0, batSR: 105.0, bowlType: 'left-arm-orthodox', bowlAvg: 38.0, bowlEcon: 5.6, bowlSR: 40.0 }
    ],
    middleOrder: [
      { name: 'Glenn Phillips', batAvg: 35.0, batSR: 102.0, bowlType: 'off-spin', bowlAvg: 30.0, bowlEcon: 5.1, bowlSR: 35.0 },
      { name: 'Craig McMillan', batAvg: 28.1, batSR: 75.9, bowlType: 'pace-medium', bowlAvg: 35.0, bowlEcon: 4.9, bowlSR: 43.0 },
      { name: 'Mark Chapman', batAvg: 30.0, batSR: 95.0, bowlType: null },
      { name: 'Chris Harris', batAvg: 29.0, batSR: 66.0, bowlType: 'pace-medium', bowlAvg: 37.5, bowlEcon: 4.2, bowlSR: 52.8 }
    ],
    keeper: [
      { name: 'Brendon McCullum', batAvg: 30.4, batSR: 96.4, bowlType: null },
      { name: 'Tom Latham', batAvg: 34.8, batSR: 85.0, bowlType: null },
      { name: 'Luke Ronchi', batAvg: 23.6, batSR: 114.5, bowlType: null },
      { name: 'Devon Conway', batAvg: 44.0, batSR: 88.5, bowlType: null }
    ],
    allRounder: [
      { name: 'Chris Cairns', batAvg: 29.4, batSR: 84.3, bowlType: 'pace-fast', bowlAvg: 32.8, bowlEcon: 4.8, bowlSR: 40.8 },
      { name: 'Jacob Oram', batAvg: 24.0, batSR: 86.6, bowlType: 'pace-medium', bowlAvg: 29.1, bowlEcon: 4.3, bowlSR: 40.0 },
      { name: 'James Neesham', batAvg: 28.5, batSR: 104.0, bowlType: 'pace-medium', bowlAvg: 31.5, bowlEcon: 6.0, bowlSR: 31.0 },
      { name: 'Colin de Grandhomme', batAvg: 27.5, batSR: 106.0, bowlType: 'pace-medium', bowlAvg: 31.0, bowlEcon: 4.9, bowlSR: 38.0 },
      { name: 'Scott Styris', batAvg: 32.4, batSR: 79.4, bowlType: 'pace-medium', bowlAvg: 35.3, bowlEcon: 4.7, bowlSR: 44.8 }
    ],
    spinner: [
      { name: 'Daniel Vettori', batAvg: 17.3, batSR: 82.0, bowlType: 'left-arm-orthodox', bowlAvg: 31.5, bowlEcon: 4.1, bowlSR: 46.0 },
      { name: 'Mitchell Santner', batAvg: 27.5, batSR: 89.0, bowlType: 'left-arm-orthodox', bowlAvg: 35.6, bowlEcon: 4.8, bowlSR: 44.0 },
      { name: 'Ish Sodhi', batAvg: 9.0, batSR: 65.0, bowlType: 'leg-spin', bowlAvg: 33.8, bowlEcon: 5.4, bowlSR: 37.0 }
    ],
    pacer: [
      { name: 'Trent Boult', batAvg: 9.5, batSR: 70.0, bowlType: 'left-arm-pace', bowlAvg: 23.8, bowlEcon: 4.9, bowlSR: 29.1 },
      { name: 'Tim Southee', batAvg: 12.5, batSR: 85.0, bowlType: 'pace-fast', bowlAvg: 33.6, bowlEcon: 5.4, bowlSR: 37.0 },
      { name: 'Shane Bond', batAvg: 16.2, batSR: 69.0, bowlType: 'pace-fast', bowlAvg: 20.8, bowlEcon: 4.2, bowlSR: 29.2 },
      { name: 'Lockie Ferguson', batAvg: 7.0, batSR: 60.0, bowlType: 'pace-fast', bowlAvg: 31.0, bowlEcon: 5.6, bowlSR: 33.0 },
      { name: 'Matt Henry', batAvg: 11.0, batSR: 75.0, bowlType: 'pace-fast', bowlAvg: 26.0, bowlEcon: 5.1, bowlSR: 30.5 },
      { name: 'Kyle Jamieson', batAvg: 18.0, batSR: 80.0, bowlType: 'pace-fast', bowlAvg: 30.0, bowlEcon: 4.9, bowlSR: 36.0 }
    ]
  },
  AFG: {
    opener: [
      { name: 'Rahmanullah Gurbaz', batAvg: 37.5, batSR: 88.0, bowlType: null },
      { name: 'Ibrahim Zadran', batAvg: 47.8, batSR: 80.0, bowlType: null },
      { name: 'Hazratullah Zazai', batAvg: 28.0, batSR: 135.0, bowlType: null }
    ],
    topOrder: [
      { name: 'Rahmat Shah', batAvg: 36.5, batSR: 70.0, bowlType: 'leg-spin', bowlAvg: 45.0, bowlEcon: 5.2, bowlSR: 52.0 },
      { name: 'Hashmatullah Shahidi', batAvg: 33.0, batSR: 68.0, bowlType: null },
      { name: 'Najibullah Zadran', batAvg: 30.0, batSR: 89.0, bowlType: null }
    ],
    middleOrder: [
      { name: 'Mohammad Nabi', batAvg: 27.2, batSR: 85.5, bowlType: 'off-spin', bowlAvg: 31.0, bowlEcon: 4.3, bowlSR: 43.0 },
      { name: 'Azmatullah Omarzai', batAvg: 40.5, batSR: 98.0, bowlType: 'pace-fast', bowlAvg: 33.0, bowlEcon: 5.4, bowlSR: 36.0 },
      { name: 'Gulbadin Naib', batAvg: 21.5, batSR: 86.0, bowlType: 'pace-medium', bowlAvg: 35.0, bowlEcon: 5.3, bowlSR: 39.0 }
    ],
    keeper: [
      { name: 'Rahmanullah Gurbaz', batAvg: 37.5, batSR: 88.0, bowlType: null },
      { name: 'Ikram Alikhil', batAvg: 25.0, batSR: 68.0, bowlType: null },
      { name: 'Mohammad Shahzad', batAvg: 33.6, batSR: 88.4, bowlType: null }
    ],
    allRounder: [
      { name: 'Mohammad Nabi', batAvg: 27.2, batSR: 85.5, bowlType: 'off-spin', bowlAvg: 31.0, bowlEcon: 4.3, bowlSR: 43.0 },
      { name: 'Azmatullah Omarzai', batAvg: 40.5, batSR: 98.0, bowlType: 'pace-fast', bowlAvg: 33.0, bowlEcon: 5.4, bowlSR: 36.0 },
      { name: 'Gulbadin Naib', batAvg: 21.5, batSR: 86.0, bowlType: 'pace-medium', bowlAvg: 35.0, bowlEcon: 5.3, bowlSR: 39.0 },
      { name: 'Karim Janat', batAvg: 20.0, batSR: 110.0, bowlType: 'pace-medium', bowlAvg: 32.0, bowlEcon: 5.8, bowlSR: 33.0 }
    ],
    spinner: [
      { name: 'Rashid Khan', batAvg: 18.5, batSR: 110.0, bowlType: 'leg-spin', bowlAvg: 18.2, bowlEcon: 4.2, bowlSR: 26.5 },
      { name: 'Mujeeb Ur Rahman', batAvg: 8.0, batSR: 60.0, bowlType: 'off-spin', bowlAvg: 24.5, bowlEcon: 4.5, bowlSR: 32.6 },
      { name: 'Noor Ahmad', batAvg: 5.0, batSR: 45.0, bowlType: 'left-arm-unorthodox', bowlAvg: 25.0, bowlEcon: 4.8, bowlSR: 31.0 }
    ],
    pacer: [
      { name: 'Fazalhaq Farooqi', batAvg: 4.0, batSR: 40.0, bowlType: 'left-arm-pace', bowlAvg: 23.5, bowlEcon: 5.0, bowlSR: 28.0 },
      { name: 'Naveen-ul-Haq', batAvg: 6.0, batSR: 50.0, bowlType: 'pace-medium', bowlAvg: 25.4, bowlEcon: 5.5, bowlSR: 27.8 },
      { name: 'Hamid Hassan', batAvg: 6.5, batSR: 55.0, bowlType: 'pace-fast', bowlAvg: 22.5, bowlEcon: 4.6, bowlSR: 29.0 },
      { name: 'Dawlat Zadran', batAvg: 14.0, batSR: 80.0, bowlType: 'pace-fast', bowlAvg: 32.0, bowlEcon: 5.4, bowlSR: 35.0 }
    ]
  }
};

// Generic fallback for minor teams (USA, BAN, ZIM, IRE, SCO, NED, KEN, CAN, UAE) using real historical cricketers
REAL_PLAYERS_POOL.BAN = REAL_PLAYERS_POOL.IND;
REAL_PLAYERS_POOL.ZIM = REAL_PLAYERS_POOL.RSA;
REAL_PLAYERS_POOL.IRE = REAL_PLAYERS_POOL.ENG;
REAL_PLAYERS_POOL.SCO = REAL_PLAYERS_POOL.ENG;
REAL_PLAYERS_POOL.NED = REAL_PLAYERS_POOL.ENG;
REAL_PLAYERS_POOL.USA = REAL_PLAYERS_POOL.IND;
REAL_PLAYERS_POOL.CAN = REAL_PLAYERS_POOL.ENG;
REAL_PLAYERS_POOL.KEN = REAL_PLAYERS_POOL.WI;
REAL_PLAYERS_POOL.UAE = REAL_PLAYERS_POOL.IND;

function createLcg(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const lcg = createLcg(12345);

const outputPlayers = [];
const outputSquads = {};

EDITIONS.forEach((ed) => {
  ed.teams.forEach((teamCode) => {
    const squadId = `${ed.id}_${teamCode}`;
    const playerIds = [];

    const countryPool = REAL_PLAYERS_POOL[teamCode] || REAL_PLAYERS_POOL.IND;
    const squadPlayers = [];
    const usedNames = new Set();

    const targetRoles = [
      { role: 'opener', count: 2 },
      { role: 'topOrder', count: 3 },
      { role: 'middleOrder', count: 3 },
      { role: 'keeper', count: 1 },
      { role: 'allRounder', count: 2 },
      { role: 'spinner', count: 2 },
      { role: 'pacer', count: 2 }
    ];

    targetRoles.forEach(({ role, count }) => {
      let pool = countryPool[role] || countryPool.topOrder;
      let added = 0;
      for (let p of pool) {
        if (added >= count) break;
        if (!usedNames.has(p.name)) {
          usedNames.add(p.name);
          squadPlayers.push({ ...p, role, team: teamCode });
          added++;
        }
      }
      // If pool didn't have enough, pick from topOrder or allRounder
      if (added < count) {
        let altPool = countryPool.topOrder.concat(countryPool.allRounder).concat(countryPool.pacer);
        for (let p of altPool) {
          if (added >= count) break;
          if (!usedNames.has(p.name)) {
            usedNames.add(p.name);
            squadPlayers.push({ ...p, role, team: teamCode });
            added++;
          }
        }
      }
    });

    const final15 = squadPlayers.slice(0, 15);

    final15.forEach((p, idx) => {
      const slug = getSlug(p.name);
      const playerId = `${ed.id}_${teamCode}_${slug}`;
      playerIds.push(playerId);

      const isSENA = ['AUS', 'ENG', 'NZ', 'RSA'].includes(teamCode);
      const isSubcont = ['IND', 'PAK', 'SL', 'AFG'].includes(teamCode);

      let bBase = Math.min(p.role === 'spinner' || p.role === 'pacer' ? 55 : 99, Math.max(35, ((p.batAvg - 10) / (45 - 10)) * 60 + 35));
      let paceBonus = isSENA ? 5 : 0;
      if (idx < 3) paceBonus += 5;
      const vsPace = Math.round(Math.min(99, Math.max(20, bBase + paceBonus)));

      let spinBonus = isSubcont ? 8 : 0;
      if (idx >= 3 && idx <= 6) spinBonus += 3;
      const vsSpin = Math.round(Math.min(99, Math.max(20, bBase + spinBonus)));

      let power = ed.format === 'T20' ? ((p.batSR - 100) / (160 - 100)) * 50 + 40 : ((p.batSR - 65) / (110 - 65)) * 55 + 35;
      if (idx >= 4 && idx <= 6) power += 5;
      if (p.role === 'spinner' || p.role === 'pacer') power = Math.min(45, power);
      const powerHitting = Math.round(Math.min(99, Math.max(20, power)));

      const temperament = Math.round(Math.min(99, Math.max(30, ((p.batAvg - 15) / (50 - 15)) * 50 + 45)));

      let batRating = 10;
      if (p.role !== 'spinner' && p.role !== 'pacer') {
        let batAvgRating = ed.format === 'T20' ? ((p.batAvg - 10) / 38) * 42 + 50 : ((p.batAvg - 10) / 42) * 42 + 50;
        let batSRRating = ed.format === 'T20' ? ((p.batSR - 90) / 70) * 42 + 50 : ((p.batSR - 55) / 45) * 42 + 50;
        batRating = Math.round(Math.min(94, Math.max(55, 0.65 * batAvgRating + 0.35 * batSRRating)));
      } else {
        batRating = Math.round(15 + lcg() * 20);
      }

      let wicketTaking = 35;
      let powerplayBowling = 35;
      let deathBowling = 35;
      let bowlRating = 0;

      if (p.bowlType) {
        if (p.bowlSR && p.bowlSR > 0) {
          wicketTaking = ((36 - p.bowlSR) / (36 - 18)) * 40 + 50;
          wicketTaking = Math.round(Math.min(94, Math.max(35, wicketTaking)));
        }
        const econ = p.bowlEcon || 8.0;
        const isPace = p.bowlType.includes('pace') || p.bowlType.includes('medium') || p.bowlType.includes('fast');
        if (isPace) {
          powerplayBowling = Math.round(0.6 * wicketTaking + 0.4 * (100 - econ * 10));
          deathBowling = Math.round(0.5 * (100 - econ * 10) + 0.5 * wicketTaking);
        } else {
          powerplayBowling = Math.round(0.4 * wicketTaking + 0.6 * (100 - econ * 12));
          deathBowling = Math.round(Math.max(25, 0.4 * wicketTaking + 0.4 * (100 - econ * 11) - 10));
        }

        let econRating = ed.format === 'T20' ? ((10.0 - econ) / 4.5) * 42 + 50 : ((7.0 - econ) / 3.5) * 42 + 50;
        let wicketRating = ed.format === 'T20' ? ((32 - (p.bowlSR || 24)) / 18) * 42 + 50 : ((45 - (p.bowlSR || 30)) / 25) * 42 + 50;
        bowlRating = Math.round(Math.min(94, Math.max(55, 0.5 * econRating + 0.5 * wicketRating)));
      }

      let fielding = p.role === 'keeper' ? Math.round(85 + lcg() * 12) : (p.role === 'allRounder' || (p.role !== 'spinner' && p.role !== 'pacer') ? Math.round(70 + lcg() * 20) : Math.round(55 + lcg() * 15));

      let battingTemperament = p.batAvg > 38 && p.batSR < (ed.format === 'T20' ? 132 : 80) ? 'Anchor' : (p.batSR > (ed.format === 'T20' ? 140 : 92) && p.batAvg > 26 ? 'Aggressor' : 'Finisher');
      let bowlingTemperament = p.bowlType ? (powerplayBowling > deathBowling + 10 ? 'New-Ball Specialist' : (deathBowling > powerplayBowling + 10 ? 'Death Specialist' : 'Containment')) : 'None';
      const composureTag = temperament > 72 || idx === 0 ? 'Calm-under-pressure' : (temperament < 45 ? 'Volatile' : 'Normal');

      outputPlayers.push({
        id: playerId,
        name: p.name,
        nationalTeam: teamCode,
        tournamentEdition: ed.name,
        tournamentYear: ed.year,
        battingHand: lcg() < 0.3 ? 'left' : 'right',
        battingPosition: idx + 1,
        isWicketkeeper: p.role === 'keeper',
        isCaptain: idx === 0,
        battingAverage: p.batAvg,
        strikeRate: p.batSR,
        vsPaceRating: vsPace,
        vsSpinRating: vsSpin,
        powerHittingRating: powerHitting,
        temperamentConsistency: temperament,
        runningBetweenWickets: Math.round(65 + lcg() * 30),
        bowlingType: p.bowlType,
        bowlingAverage: p.bowlAvg || null,
        economyRate: p.bowlEcon || null,
        strikeRateBowling: p.bowlSR || null,
        wicketTakingRating: wicketTaking,
        deathBowlingRating: deathBowling,
        powerplayBowlingRating: powerplayBowling,
        fieldingRating: fielding,
        role: p.role,
        batRating,
        bowlRating,
        battingTemperament,
        bowlingTemperament,
        composureTag,
        chemistryLinks: []
      });
    });

    outputSquads[squadId] = {
      editionId: ed.id,
      tournamentYear: ed.year,
      nationalTeam: teamCode,
      playerIds,
      isChampionSquad: (ed.year === 2011 && teamCode === 'IND') || (ed.year === 2007 && teamCode === 'IND') || (ed.year === 1975 && teamCode === 'WI') || (ed.year === 2024 && teamCode === 'IND') || (ed.year === 2019 && teamCode === 'ENG') || (ed.year === 2015 && teamCode === 'AUS')
    };
  });
});

for (const [squadId, squad] of Object.entries(outputSquads)) {
  squad.playerIds.forEach(pid => {
    const player = outputPlayers.find(p => p.id === pid);
    if (player) {
      player.chemistryLinks = squad.playerIds.filter(id => id !== pid);
    }
  });
}

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(
  path.join(dataDir, 'players.seed.json'),
  JSON.stringify({ players: outputPlayers, squads: outputSquads }, null, 2),
  'utf8'
);

console.log(`Success: Generated ${outputPlayers.length} real players across ${Object.keys(outputSquads).length} squads for 22 tournaments.`);
