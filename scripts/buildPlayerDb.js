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

// Historical Iconic Players template
const ICONIC_PLAYERS = [
  { name: 'Sachin Tendulkar', team: 'IND', role: 'opener', start: 1989, end: 2013, batAvg: 44.8, batSR: 86.2, bowlType: 'leg-spin', bowlAvg: 44.4, bowlEcon: 5.1, bowlSR: 52.2 },
  { name: 'Virat Kohli', team: 'IND', role: 'topOrder', start: 2008, end: 2026, batAvg: 58.7, batSR: 93.6, bowlType: null },
  { name: 'MS Dhoni', team: 'IND', role: 'keeper', start: 2004, end: 2019, batAvg: 50.6, batSR: 89.0, bowlType: null },
  { name: 'Rohit Sharma', team: 'IND', role: 'opener', start: 2007, end: 2026, batAvg: 49.1, batSR: 92.4, bowlType: null },
  { name: 'Yuvraj Singh', team: 'IND', role: 'allRounder', start: 2000, end: 2017, batAvg: 36.5, batSR: 87.6, bowlType: 'left-arm-orthodox', bowlAvg: 36.2, bowlEcon: 4.8, bowlSR: 45.0 },
  { name: 'Kapil Dev', team: 'IND', role: 'allRounder', start: 1978, end: 1994, batAvg: 23.8, batSR: 95.0, bowlType: 'pace-fast', bowlAvg: 27.4, bowlEcon: 3.7, bowlSR: 44.0 },
  { name: 'Jasprit Bumrah', team: 'IND', role: 'pacer', start: 2016, end: 2026, batAvg: 5.4, batSR: 65.0, bowlType: 'pace-fast', bowlAvg: 19.8, bowlEcon: 4.5, bowlSR: 28.5 },
  { name: 'Ricky Ponting', team: 'AUS', role: 'topOrder', start: 1995, end: 2012, batAvg: 42.0, batSR: 80.4, bowlType: null },
  { name: 'Shane Warne', team: 'AUS', role: 'spinner', start: 1992, end: 2007, batAvg: 13.0, batSR: 72.0, bowlType: 'leg-spin', bowlAvg: 25.7, bowlEcon: 4.2, bowlSR: 36.3 },
  { name: 'Glenn McGrath', team: 'AUS', role: 'pacer', start: 1993, end: 2007, batAvg: 4.0, batSR: 50.0, bowlType: 'pace-fast', bowlAvg: 22.0, bowlEcon: 3.8, bowlSR: 34.0 },
  { name: 'Adam Gilchrist', team: 'AUS', role: 'keeper', start: 1996, end: 2008, batAvg: 35.8, batSR: 96.9, bowlType: null },
  { name: 'Mitchell Starc', team: 'AUS', role: 'pacer', start: 2010, end: 2026, batAvg: 11.2, batSR: 85.0, bowlType: 'left-arm-pace', bowlAvg: 22.4, bowlEcon: 5.1, bowlSR: 26.2 },
  { name: 'Brian Lara', team: 'WI', role: 'topOrder', start: 1990, end: 2007, batAvg: 40.5, batSR: 79.5, bowlType: null },
  { name: 'Chris Gayle', team: 'WI', role: 'opener', start: 1999, end: 2021, batAvg: 37.8, batSR: 87.2, bowlType: 'off-spin', bowlAvg: 35.2, bowlEcon: 4.7, bowlSR: 44.5 },
  { name: 'Viv Richards', team: 'WI', role: 'topOrder', start: 1974, end: 1991, batAvg: 47.0, batSR: 90.2, bowlType: 'off-spin', bowlAvg: 35.8, bowlEcon: 4.4, bowlSR: 48.0 },
  { name: 'AB de Villiers', team: 'RSA', role: 'topOrder', start: 2005, end: 2018, batAvg: 53.5, batSR: 101.2, bowlType: null },
  { name: 'Jacques Kallis', team: 'RSA', role: 'allRounder', start: 1996, end: 2014, batAvg: 44.3, batSR: 72.8, bowlType: 'pace-medium', bowlAvg: 31.7, bowlEcon: 4.8, bowlSR: 39.3 },
  { name: 'Dale Steyn', team: 'RSA', role: 'pacer', start: 2005, end: 2020, batAvg: 8.5, batSR: 70.0, bowlType: 'pace-fast', bowlAvg: 25.9, bowlEcon: 4.8, bowlSR: 31.8 },
  { name: 'Wasim Akram', team: 'PAK', role: 'allRounder', start: 1984, end: 2003, batAvg: 16.5, batSR: 88.0, bowlType: 'left-arm-pace', bowlAvg: 23.5, bowlEcon: 3.8, bowlSR: 36.2 },
  { name: 'Shahid Afridi', team: 'PAK', role: 'allRounder', start: 1996, end: 2017, batAvg: 23.5, batSR: 117.0, bowlType: 'leg-spin', bowlAvg: 34.5, bowlEcon: 4.6, bowlSR: 44.5 },
  { name: 'Babar Azam', team: 'PAK', role: 'opener', start: 2015, end: 2026, batAvg: 48.5, batSR: 88.5, bowlType: null },
  { name: 'Kumar Sangakkara', team: 'SL', role: 'keeper', start: 2000, end: 2015, batAvg: 41.9, batSR: 78.8, bowlType: null },
  { name: 'Muttiah Muralitharan', team: 'SL', role: 'spinner', start: 1993, end: 2011, batAvg: 6.8, batSR: 75.0, bowlType: 'off-spin', bowlAvg: 23.0, bowlEcon: 3.9, bowlSR: 35.0 },
  { name: 'Lasith Malinga', team: 'SL', role: 'pacer', start: 2004, end: 2020, batAvg: 6.2, batSR: 72.0, bowlType: 'pace-fast', bowlAvg: 27.2, bowlEcon: 5.2, bowlSR: 32.0 },
  { name: 'Kevin Pietersen', team: 'ENG', role: 'topOrder', start: 2004, end: 2014, batAvg: 40.7, batSR: 86.5, bowlType: null },
  { name: 'James Anderson', team: 'ENG', role: 'pacer', start: 2002, end: 2020, batAvg: 7.5, batSR: 60.0, bowlType: 'pace-fast', bowlAvg: 29.2, bowlEcon: 4.9, bowlSR: 35.8 },
  { name: 'Kane Williamson', team: 'NZ', role: 'topOrder', start: 2010, end: 2026, batAvg: 48.2, batSR: 81.0, bowlType: null },
  { name: 'Daniel Vettori', team: 'NZ', role: 'spinner', start: 1997, end: 2015, batAvg: 17.3, batSR: 82.0, bowlType: 'left-arm-orthodox', bowlAvg: 31.5, bowlEcon: 4.1, bowlSR: 46.0 },
  { name: 'Rashid Khan', team: 'AFG', role: 'spinner', start: 2015, end: 2026, batAvg: 18.5, batSR: 110.0, bowlType: 'leg-spin', bowlAvg: 18.2, bowlEcon: 4.2, bowlSR: 26.5 },
  { name: 'Saurabh Netravalkar', team: 'USA', role: 'pacer', start: 2019, end: 2026, batAvg: 6.0, batSR: 70.0, bowlType: 'left-arm-pace', bowlAvg: 22.0, bowlEcon: 4.5, bowlSR: 29.0 }
];

// Country name lists for generating realistic squads
const NAME_TEMPLATES = {
  IND: {
    first: ['Ramesh', 'Amit', 'Sanjay', 'Vijay', 'Rajesh', 'Sunil', 'Kunal', 'Aniket', 'Abhishek', 'Pranav', 'Devendra', 'Rahul', 'Arjun', 'Manish', 'Suresh'],
    last: ['Sharma', 'Patel', 'Kumar', 'Singh', 'Iyer', 'Gupta', 'Joshi', 'Mehta', 'Kulkarni', 'Reddy', 'Chatterjee', 'Deshmukh', 'Yadav', 'Verma', 'Pillai']
  },
  AUS: {
    first: ['David', 'Steve', 'John', 'Michael', 'Peter', 'Robert', 'James', 'Andrew', 'Matthew', 'Shane', 'Mitchell', 'Brett', 'Mark', 'Travis', 'Glenn'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Johnson', 'Davis', 'Miller', 'Anderson', 'Thomas', 'Waugh', 'Marsh', 'Starc', 'Head', 'Finch']
  },
  ENG: {
    first: ['Kevin', 'Stuart', 'Ben', 'Jos', 'Joe', 'Eoin', 'Alastair', 'Paul', 'Andrew', 'Ian', 'Harry', 'Robert', 'David', 'Chris', 'Mark'],
    last: ['Anderson', 'Broad', 'Stokes', 'Buttler', 'Root', 'Morgan', 'Cook', 'Collingwood', 'Flintoff', 'Bell', 'Bairstow', 'Archer', 'Brook', 'Wood', 'Jordan']
  },
  WI: {
    first: ['Denesh', 'Marlon', 'Ravi', 'Clive', 'Courtney', 'Curtly', 'Jason', 'Kieron', 'Darren', 'Sherfane', 'Romario', 'Roston', 'Alzarri', 'Obed', 'Johnson'],
    last: ['Bravo', 'Russell', 'Pooran', 'Walsh', 'Ambrose', 'Holder', 'Pollard', 'Sammy', 'Chanderpaul', 'King', 'Charles', 'Powell', 'Rutherford', 'Shepherd', 'Chase']
  },
  RSA: {
    first: ['Johan', 'Albie', 'Morne', 'Jacques', 'Graeme', 'Hashim', 'Dale', 'Quinton', 'Kagiso', 'Aiden', 'David', 'Anrich', 'Heinrich', 'Faf', 'Tabraiz'],
    last: ['Burger', 'Botha', 'Pretorius', 'de Kock', 'Amla', 'Steyn', 'Smith', 'Pollock', 'Morkel', 'Donald', 'Klaasen', 'Miller', 'Rabada', 'Nortje', 'Shamsi']
  },
  PAK: {
    first: ['Zafar', 'Tariq', 'Yasir', 'Kashif', 'Mohammad', 'Shaheen', 'Babar', 'Rizwan', 'Haris', 'Naseem', 'Shoaib', 'Wasim', 'Waqar', 'Imran', 'Inzamam'],
    last: ['Iqbal', 'Mahmood', 'Khan', 'Ali', 'Shah', 'Rizwan', 'Azam', 'Gul', 'Haq', 'Rauf', 'Akram', 'Akhtar', 'Younis', 'ul-Haq', 'Ahmed']
  },
  NZ: {
    first: ['Craig', 'Ross', 'Shane', 'Brendon', 'Kane', 'Ross', 'Trent', 'Tim', 'Jacob', 'Scott', 'Kyle', 'Devon', 'Mitchell', 'Tom', 'Glenn'],
    last: ['Southee', 'Franklin', 'Guptill', 'Williamson', 'Taylor', 'Boult', 'Oram', 'Styris', 'Mills', 'Phillips', 'Conway', 'Santner', 'Latham', 'Crowe', 'Fleming']
  },
  SL: {
    first: ['Chaminda', 'Dilshan', 'Mahela', 'Kumar', 'Sanath', 'Aravinda', 'Upul', 'Angelo', 'Wanindu', 'Pathum', 'Charith', 'Kusal', 'Nuwan', 'Dilhara', 'Ajantha'],
    last: ['Mendis', 'Silva', 'Perera', 'Jayasuriya', 'Jayawardene', 'Sangakkara', 'de Silva', 'Ranatunga', 'Vaas', 'Dilshan', 'Tharanga', 'Mathews', 'Hasaranga', 'Nissanka', 'Asalanka']
  },
  AFG: {
    first: ['Gulbadin', 'Najibullah', 'Mohammad', 'Ibrahim', 'Rahmanullah', 'Fazalhaq', 'Naveen', 'Mujeeb', 'Azmatullah', 'Rashid', 'Rahmat', 'Hashmatullah', 'Noor', 'Karim', 'Hazratullah'],
    last: ['Khan', 'Nabi', 'Zadran', 'Gurbaz', 'Farooqi', 'ul-Haq', 'Ur Rahman', 'Omarzai', 'Naib', 'Shahidi', 'Shah', 'Ahmad', 'Janat', 'Zazai', 'Ahmad']
  },
  DEFAULT: {
    first: ['John', 'David', 'Michael', 'Robert', 'William', 'Peter', 'Andrew', 'Paul', 'Thomas', 'Richard', 'Steven', 'Harry', 'George', 'Charles', 'Arthur'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Johnson', 'Davis', 'Miller', 'Anderson', 'Thomas', 'White', 'Harris', 'Martin', 'Clark', 'Lewis']
  }
};

// Compile and helper to generate random names/squads
function choice(arr, randomFn) {
  return arr[Math.floor(randomFn() * arr.length)];
}

// Custom simple LCG random generator to ensure seed consistency in generation
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

// Iterate editions
EDITIONS.forEach((ed) => {
  ed.teams.forEach((teamCode) => {
    const squadId = `${ed.id}_${teamCode}`;
    const playerIds = [];

    // Find active iconic players for this team and year
    const activeIconics = ICONIC_PLAYERS.filter(p => p.team === teamCode && ed.year >= p.start && ed.year <= p.end);
    
    // Sort to fill distinct roles first
    const squadPlayers = [...activeIconics];
    const rolesCount = {
      opener: squadPlayers.filter(p => p.role === 'opener').length,
      topOrder: squadPlayers.filter(p => p.role === 'topOrder').length,
      middleOrder: squadPlayers.filter(p => p.role === 'middleOrder').length,
      keeper: squadPlayers.filter(p => p.role === 'keeper').length,
      allRounder: squadPlayers.filter(p => p.role === 'allRounder').length,
      spinner: squadPlayers.filter(p => p.role === 'spinner').length,
      pacer: squadPlayers.filter(p => p.role === 'pacer').length
    };

    // Target configuration of roles for a balanced 15-player squad
    const targetRoles = [
      { role: 'opener', target: 2 },
      { role: 'topOrder', target: 3 },
      { role: 'middleOrder', target: 3 },
      { role: 'keeper', target: 1 },
      { role: 'allRounder', target: 2 },
      { role: 'spinner', target: 2 },
      { role: 'pacer', target: 2 }
    ];

    let playerIndex = 1;

    // Fill each role category up to its target
    targetRoles.forEach(({ role, target }) => {
      while (rolesCount[role] < target) {
        // Generate a new player
        const template = NAME_TEMPLATES[teamCode] || NAME_TEMPLATES.DEFAULT;
        const name = `${choice(template.first, lcg)} ${choice(template.last, lcg)}`;
        
        // Ensure name is unique in squad
        if (squadPlayers.some(p => p.name === name)) continue;

        // Statistics ranges based on role
        let batAvg = 15.0;
        let batSR = 110.0;
        let bowlType = null;
        let bowlAvg = null;
        let bowlEcon = null;
        let bowlSR = null;

        if (role === 'opener') {
          batAvg = 28.0 + lcg() * 14.0;
          batSR = ed.format === 'T20' ? 120.0 + lcg() * 20.0 : 72.0 + lcg() * 15.0;
        } else if (role === 'topOrder') {
          batAvg = 30.0 + lcg() * 15.0;
          batSR = ed.format === 'T20' ? 122.0 + lcg() * 22.0 : 74.0 + lcg() * 16.0;
        } else if (role === 'middleOrder') {
          batAvg = 28.0 + lcg() * 16.0;
          batSR = ed.format === 'T20' ? 125.0 + lcg() * 25.0 : 75.0 + lcg() * 18.0;
        } else if (role === 'keeper') {
          batAvg = 24.0 + lcg() * 12.0;
          batSR = ed.format === 'T20' ? 118.0 + lcg() * 18.0 : 70.0 + lcg() * 15.0;
        } else if (role === 'allRounder') {
          batAvg = 22.0 + lcg() * 10.0;
          batSR = ed.format === 'T20' ? 122.0 + lcg() * 24.0 : 74.0 + lcg() * 18.0;
          bowlType = lcg() < 0.5 ? 'off-spin' : 'pace-medium';
          bowlAvg = 24.0 + lcg() * 8.0;
          bowlEcon = ed.format === 'T20' ? 7.2 + lcg() * 1.5 : 4.4 + lcg() * 1.2;
          bowlSR = 18.0 + lcg() * 8.0;
        } else if (role === 'spinner') {
          batAvg = 8.0 + lcg() * 8.0;
          batSR = ed.format === 'T20' ? 85.0 + lcg() * 25.0 : 55.0 + lcg() * 18.0;
          bowlType = lcg() < 0.5 ? 'off-spin' : 'leg-spin';
          bowlAvg = 21.0 + lcg() * 8.0;
          bowlEcon = ed.format === 'T20' ? 6.8 + lcg() * 1.4 : 4.0 + lcg() * 1.0;
          bowlSR = 18.0 + lcg() * 8.0;
        } else if (role === 'pacer') {
          batAvg = 7.0 + lcg() * 8.0;
          batSR = ed.format === 'T20' ? 80.0 + lcg() * 25.0 : 50.0 + lcg() * 18.0;
          bowlType = 'pace-fast';
          bowlAvg = 22.0 + lcg() * 8.0;
          bowlEcon = ed.format === 'T20' ? 7.2 + lcg() * 1.6 : 4.3 + lcg() * 1.2;
          bowlSR = 16.0 + lcg() * 8.0;
        }

        squadPlayers.push({
          name,
          role,
          team: teamCode,
          start: ed.year - 5,
          end: ed.year + 5,
          batAvg,
          batSR,
          bowlType,
          bowlAvg,
          bowlEcon,
          bowlSR
        });

        rolesCount[role]++;
      }
    });

    // Make sure we have exactly 15 players
    const final15 = squadPlayers.slice(0, 15);

    final15.forEach((p, idx) => {
      const slug = getSlug(p.name);
      const playerId = `${ed.id}_${teamCode}_${slug}`;
      playerIds.push(playerId);

      const isSENA = ['AUS', 'ENG', 'NZ', 'RSA'].includes(teamCode);
      const isSubcont = ['IND', 'PAK', 'SL', 'AFG'].includes(teamCode);

      // Calculations for vsPace and vsSpin
      let bBase = Math.min(p.role === 'spinner' || p.role === 'pacer' ? 55 : 99, Math.max(35, ((p.batAvg - 10) / (45 - 10)) * 60 + 35));
      let paceBonus = 0;
      if (isSENA) paceBonus += 5;
      if (idx < 3) paceBonus += 5;
      const vsPace = Math.round(Math.min(99, Math.max(20, bBase + paceBonus)));

      let spinBonus = 0;
      if (isSubcont) spinBonus += 8;
      if (idx >= 3 && idx <= 6) spinBonus += 3;
      const vsSpin = Math.round(Math.min(99, Math.max(20, bBase + spinBonus)));

      // Power hitting
      let power = 35;
      if (ed.format === 'T20') {
        power = ((p.batSR - 100) / (160 - 100)) * 50 + 40;
      } else {
        power = ((p.batSR - 65) / (110 - 65)) * 55 + 35;
      }
      if (idx >= 4 && idx <= 6) power += 5;
      if (p.role === 'spinner' || p.role === 'pacer') power = Math.min(45, power);
      const powerHitting = Math.round(Math.min(99, Math.max(20, power)));

      // Temperament consistency
      const temperament = Math.round(Math.min(99, Math.max(30, ((p.batAvg - 15) / (50 - 15)) * 50 + 45)));

      // Composite Batting Rating (BAT overall)
      let batRating = 10;
      if (p.role !== 'spinner' && p.role !== 'pacer') {
        let batAvgRating, batSRRating;
        if (ed.format === 'T20') {
          batAvgRating = ((p.batAvg - 10) / 35) * 100;
          batSRRating = ((p.batSR - 90) / 70) * 100;
        } else {
          batAvgRating = ((p.batAvg - 10) / 40) * 100;
          batSRRating = ((p.batSR - 55) / 45) * 100;
        }
        batRating = Math.round(Math.min(99, Math.max(10, 0.5 * batAvgRating + 0.5 * batSRRating)));
      } else {
        // Capped low for pure bowlers
        batRating = Math.round(15 + lcg() * 25);
      }

      // Bowling ratings and Composite (BOWL overall)
      let wicketTaking = 35;
      let powerplayBowling = 35;
      let deathBowling = 35;
      let bowlRating = 0;

      if (p.bowlType) {
        if (p.bowlSR && p.bowlSR > 0) {
          wicketTaking = ((36 - p.bowlSR) / (36 - 18)) * 50 + 45;
          wicketTaking = Math.round(Math.min(99, Math.max(35, wicketTaking)));
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

        // Composite Bowl Rating calculation
        let econRating, wicketRating;
        if (ed.format === 'T20') {
          econRating = ((10.0 - econ) / 4.5) * 100;
          wicketRating = ((32 - p.bowlSR) / 18) * 100;
        } else {
          econRating = ((7.0 - econ) / 3.5) * 100;
          wicketRating = ((45 - p.bowlSR) / 25) * 100;
        }
        bowlRating = Math.round(Math.min(99, Math.max(10, 0.4 * econRating + 0.6 * wicketRating)));
      }

      // Fielding
      let fielding = 70;
      if (p.role === 'keeper') fielding = Math.round(85 + lcg() * 12);
      else if (p.role === 'allRounder' || (p.role !== 'spinner' && p.role !== 'pacer')) fielding = Math.round(70 + lcg() * 20);
      else fielding = Math.round(55 + lcg() * 15);

      // Hidden Behavior tags
      let battingTemperament = 'Situational';
      if (p.batAvg > 38 && p.batSR < (ed.format === 'T20' ? 132 : 80)) {
        battingTemperament = 'Anchor';
      } else if (p.batSR > (ed.format === 'T20' ? 140 : 92) && p.batAvg > 26) {
        battingTemperament = 'Aggressor';
      } else if (p.role === 'allRounder' || idx >= 5 && idx <= 7) {
        battingTemperament = 'Finisher';
      }

      let bowlingTemperament = 'Strike Bowler';
      if (p.bowlType) {
        if (powerplayBowling > deathBowling + 10) bowlingTemperament = 'New-Ball Specialist';
        else if (deathBowling > powerplayBowling + 10) bowlingTemperament = 'Death Specialist';
        else if (p.bowlEcon && p.bowlEcon < (ed.format === 'T20' ? 7.2 : 4.2)) bowlingTemperament = 'Containment';
      } else {
        bowlingTemperament = 'None';
      }

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
        bowlingAverage: p.bowlAvg,
        economyRate: p.bowlEcon,
        strikeRateBowling: p.bowlSR,
        wicketTakingRating: wicketTaking,
        deathBowlingRating: deathBowling,
        powerplayBowlingRating: powerplayBowling,
        fieldingRating: fielding,
        role: p.role,
        
        // v2 Extensions
        batRating,
        bowlRating,
        battingTemperament,
        bowlingTemperament,
        composureTag,
        chemistryLinks: [] // Populated by squad teammate lists during setup
      });
    });

    outputSquads[squadId] = {
      editionId: ed.id,
      tournamentYear: ed.year,
      nationalTeam: teamCode,
      playerIds,
      isChampionSquad: ed.year === 2011 && teamCode === 'IND' || ed.year === 2007 && teamCode === 'IND' || ed.year === 1975 && teamCode === 'WI' // Simple highlights
    };
  });
});

// Post-process player records to add chemistry links (link all players in the same squad)
for (const [squadId, squad] of Object.entries(outputSquads)) {
  squad.playerIds.forEach(pid => {
    const player = outputPlayers.find(p => p.id === pid);
    if (player) {
      player.chemistryLinks = squad.playerIds.filter(id => id !== pid);
    }
  });
}

// Save seed file
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(
  path.join(dataDir, 'players.seed.json'),
  JSON.stringify({ players: outputPlayers, squads: outputSquads }, null, 2),
  'utf8'
);

console.log(`Success: Generated ${outputPlayers.length} players across ${Object.keys(outputSquads).length} squads for 22 tournaments.`);
