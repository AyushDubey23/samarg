const { mulberry32 } = require('./seededRng');
const { getResourcePercentage, calculateDLSTarget } = require('./dlsApprox');
const { adjustProbabilities } = require('./matchupModel');
const commentaryBank = require('./commentaryBank.json');

class BallEngine {
  constructor(seed) {
    this.random = mulberry32(seed);
  }

  // Pick a random element from an array
  choice(arr) {
    const idx = Math.floor(this.random() * arr.length);
    return arr[idx];
  }

  // Generate commentary for a ball outcome
  generateCommentary(outcome, batterName, bowlerName) {
    const templates = commentaryBank[outcome] || commentaryBank['dot'];
    const template = this.choice(templates);
    return template.replace(/{batter}/g, batterName).replace(/{bowler}/g, bowlerName);
  }

  // Logical bowler selection for the next over
  selectBowler(team, lastBowlerId, overNumber, oversBowledMap, maxOversPerBowler) {
    // A bowler cannot bowl consecutive overs
    // Filter players who can bowl (bowlingType != null) and have overs remaining
    const options = team.filter(p => p.bowlingType && (oversBowledMap[p.id] || 0) < maxOversPerBowler && p.id !== lastBowlerId);
    
    if (options.length === 0) {
      // Fallback: any player who isn't the last bowler
      const fallback = team.filter(p => p.id !== lastBowlerId);
      return this.choice(fallback);
    }

    // Sort options based on over phase suitability
    // Powerplay (0-5): favors pacers with high powerplay bowling rating
    // Death (15-19): favors death-specialist bowlers
    // Middle: favors spinners and all-rounders
    options.sort((a, b) => {
      if (overNumber < 6) {
        const ratingA = a.powerplayBowlingRating || 50;
        const ratingB = b.powerplayBowlingRating || 50;
        return ratingB - ratingA;
      } else if (overNumber >= 15) {
        const ratingA = a.deathBowlingRating || 50;
        const ratingB = b.deathBowlingRating || 50;
        return ratingB - ratingA;
      } else {
        // Favor spinners in middle overs
        const typeA = (a.bowlingType || '').toLowerCase();
        const typeB = (b.bowlingType || '').toLowerCase();
        const isSpinA = typeA.includes('spin') || typeA.includes('orthodox') || typeA.includes('wrist');
        const isSpinB = typeB.includes('spin') || typeB.includes('orthodox') || typeB.includes('wrist');
        if (isSpinA && !isSpinB) return -1;
        if (!isSpinA && isSpinB) return 1;
        return (b.wicketTakingRating || 50) - (a.wicketTakingRating || 50);
      }
    });

    // Pick from top 2 suited options to add variety
    const pool = options.slice(0, Math.min(2, options.length));
    return this.choice(pool);
  }

  // Helper to determine the type of wicket
  resolveWicketType(bowler) {
    const bowlType = (bowler.bowlingType || 'pace-medium').toLowerCase();
    const isSpin = bowlType.includes('spin') || bowlType.includes('orthodox') || bowlType.includes('wrist');
    const roll = this.random();

    if (isSpin) {
      if (roll < 0.15) return 'bowled';
      if (roll < 0.30) return 'lbw';
      if (roll < 0.45) return 'stumped';
      if (roll < 0.95) return 'caught';
      return 'runout';
    } else {
      if (roll < 0.20) return 'bowled';
      if (roll < 0.30) return 'lbw';
      if (roll < 0.95) return 'caught';
      return 'runout';
    }
  }

  // Simulate a single innings
  simulateInnings(battingTeam, bowlingTeam, inningsNumber, targetInfo = null, maxOvers = 20, rainDelayInfo = null) {
    const battingCard = battingTeam.map(p => ({
      id: p.id,
      name: p.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      outState: 'not out',
      bowledBy: null,
      caughtBy: null,
      dismissalType: null
    }));

    const bowlingCard = {};
    bowlingTeam.forEach(p => {
      if (p.bowlingType) {
        bowlingCard[p.id] = {
          id: p.id,
          name: p.name,
          overs: 0,
          balls: 0,
          runsConceded: 0,
          wickets: 0,
          wides: 0,
          noballs: 0
        };
      }
    });

    const oversBowledMap = {};
    const maxOversPerBowler = Math.ceil(maxOvers / 5);

    let runs = 0;
    let wickets = 0;
    let ballsBowled = 0;
    let strikerIdx = 0;
    let nonStrikerIdx = 1;
    let nextBatterIdx = 2;
    let lastWicketBall = -999;

    const ballsLog = [];
    let isFreeHit = false;
    let lastBowler = null;
    let currentBowler = null;

    // Rain interruption trigger configuration
    const rainTriggerBall = rainDelayInfo ? rainDelayInfo.triggerBall : -1;
    const newMaxOvers = rainDelayInfo ? rainDelayInfo.newMaxOvers : maxOvers;
    let inningsCompletedEarlyByRain = false;

    while (ballsBowled < newMaxOvers * 6 && wickets < 10) {
      const overNumber = Math.floor(ballsBowled / 6);
      const ballInOver = (ballsBowled % 6) + 1;

      // Trigger rain mid-innings
      if (ballsBowled === rainTriggerBall) {
        inningsCompletedEarlyByRain = true;
        break;
      }

      // Select bowler if start of over
      if (ballInOver === 1) {
        const lastBowlerId = lastBowler ? lastBowler.id : null;
        currentBowler = this.selectBowler(bowlingTeam, lastBowlerId, overNumber, oversBowledMap, maxOversPerBowler);
        lastBowler = currentBowler;
        if (!bowlingCard[currentBowler.id]) {
          bowlingCard[currentBowler.id] = {
            id: currentBowler.id,
            name: currentBowler.name,
            overs: 0,
            balls: 0,
            runsConceded: 0,
            wickets: 0,
            wides: 0,
            noballs: 0
          };
        }
      }

      const striker = battingCard[strikerIdx];
      const nonStriker = battingCard[nonStrikerIdx];

      const matchState = {
        innings: inningsNumber,
        runs,
        wickets,
        ballsBowled,
        totalOvers: newMaxOvers,
        target: targetInfo ? targetInfo.targetRuns : null,
        isFreeHit,
        nonStriker: battingTeam[nonStrikerIdx],
        battingCaptain: battingTeam.find(p => p.isCaptain),
        lastWicketBall
      };

      // Get matchup adjusted probabilities
      const probs = adjustProbabilities(
        battingTeam[strikerIdx],
        currentBowler,
        matchState
      );

      // Roll outcome
      const outcomeRoll = this.random();
      let outcome = 'dot';
      let cumProb = 0;
      for (const [k, p] of Object.entries(probs)) {
        cumProb += p;
        if (outcomeRoll <= cumProb) {
          outcome = k;
          break;
        }
      }

      let ballRuns = 0;
      let wicketFell = false;
      let isExtra = false;
      let extraType = null;
      let comm = '';
      let wType = null;

      if (outcome === 'dot') {
        ballRuns = 0;
        isFreeHit = false; // Free hit expires on dot
        comm = this.generateCommentary('dot', striker.name, currentBowler.name);
      } else if (outcome === 'one') {
        ballRuns = 1;
        isFreeHit = false;
        comm = this.generateCommentary('single', striker.name, currentBowler.name);
      } else if (outcome === 'two') {
        ballRuns = 2;
        isFreeHit = false;
        comm = this.generateCommentary('two', striker.name, currentBowler.name);
      } else if (outcome === 'three') {
        ballRuns = 3;
        isFreeHit = false;
        comm = this.generateCommentary('three', striker.name, currentBowler.name);
      } else if (outcome === 'four') {
        ballRuns = 4;
        isFreeHit = false;
        striker.fours += 1;
        comm = this.generateCommentary('four', striker.name, currentBowler.name);
      } else if (outcome === 'six') {
        ballRuns = 6;
        isFreeHit = false;
        striker.sixes += 1;
        comm = this.generateCommentary('six', striker.name, currentBowler.name);
      } else if (outcome === 'wicket') {
        wType = this.resolveWicketType(currentBowler);
        if (isFreeHit && wType !== 'runout') {
          // Free hit saves batsman!
          ballRuns = 0; // standard dot result
          isFreeHit = false;
          comm = `${currentBowler.name} to ${striker.name}, OUT? No, it's a Free Hit! Batsman survives.`;
        } else {
          wicketFell = true;
          isFreeHit = false;
          lastWicketBall = ballsBowled;

          if (wType === 'runout') {
            // Runout - 50/50 who gets out
            const outStriker = this.random() < 0.5;
            const victim = outStriker ? striker : nonStriker;
            victim.outState = 'run out';
            victim.dismissalType = 'run out';
            
            comm = this.generateCommentary('wicket_runout', victim.name, currentBowler.name);
            if (outStriker) {
              strikerIdx = nextBatterIdx;
            } else {
              nonStrikerIdx = nextBatterIdx;
            }
          } else {
            // Bowler's wicket
            striker.outState = `out ${wType}`;
            striker.bowledBy = currentBowler.name;
            striker.dismissalType = wType;
            if (wType === 'caught') {
              const catchers = bowlingTeam.filter(p => p.id !== currentBowler.id);
              const catcher = this.choice(catchers);
              striker.caughtBy = catcher.name;
            }
            
            comm = this.generateCommentary(`wicket_${wType}`, striker.name, currentBowler.name);
            strikerIdx = nextBatterIdx;
          }
          
          nextBatterIdx++;
          wickets++;
        }
      } else if (outcome === 'extras') {
        isExtra = true;
        const extraRoll = this.random();
        
        if (extraRoll < 0.65) {
          // Wide
          ballRuns = 1;
          extraType = 'wide';
          runs += 1;
          bowlingCard[currentBowler.id].runsConceded += 1;
          bowlingCard[currentBowler.id].wides += 1;
          comm = this.generateCommentary('wide', striker.name, currentBowler.name);
          // Wide is rebowled, ballsBowled does not increment, stats are written
          ballsLog.push({
            over: overNumber,
            ballInOver,
            strikerId: striker.id,
            bowlerId: currentBowler.id,
            runs: 1,
            isWicket: false,
            wicketType: null,
            isExtra: true,
            extraType: 'wide',
            commentary: comm
          });
          continue; // rebowl
        } else if (extraRoll < 0.80) {
          // No-ball
          ballRuns = 1;
          extraType = 'noball';
          isFreeHit = true; // TRIGGERS FREE HIT next ball
          runs += 1;
          bowlingCard[currentBowler.id].runsConceded += 1;
          bowlingCard[currentBowler.id].noballs += 1;
          comm = this.generateCommentary('noball', striker.name, currentBowler.name);
          // Rebowled, ballsBowled does not increment
          ballsLog.push({
            over: overNumber,
            ballInOver,
            strikerId: striker.id,
            bowlerId: currentBowler.id,
            runs: 1,
            isWicket: false,
            wicketType: null,
            isExtra: true,
            extraType: 'noball',
            commentary: comm
          });
          continue; // rebowl
        } else {
          // Byes/Legbyes
          isFreeHit = false;
          extraType = 'bye';
          const byeRoll = this.random();
          let byeRuns = 1;
          if (byeRoll < 0.5) byeRuns = 1;
          else if (byeRoll < 0.8) byeRuns = 2;
          else if (byeRoll < 0.9) byeRuns = 4;
          else byeRuns = 0; // dead ball

          ballRuns = byeRuns;
          runs += byeRuns;
          comm = `${currentBowler.name} to ${striker.name}, ${byeRuns} bye(s). Sneaks past the keeper!`;
        }
      }

      // Increment stats for legal delivery
      ballsBowled++;
      striker.balls += 1;
      if (!isExtra || extraType === 'bye') {
        striker.runs += ballRuns;
      }
      runs += ballRuns;

      // Update bowler stats
      const bCard = bowlingCard[currentBowler.id];
      bCard.balls += 1;
      if (!isExtra || extraType === 'bye') {
        bCard.runsConceded += ballRuns;
      }
      if (wicketFell && wType !== 'runout') {
        bCard.wickets += 1;
      }

      // Record log
      ballsLog.push({
        over: Math.floor((ballsBowled - 1) / 6),
        ballInOver: ((ballsBowled - 1) % 6) + 1,
        strikerId: striker.id,
        bowlerId: currentBowler.id,
        runs: ballRuns,
        isWicket: wicketFell,
        wicketType: wType,
        isExtra,
        extraType,
        commentary: comm
      });

      // Update overs bowled map at end of over
      if (ballsBowled % 6 === 0) {
        oversBowledMap[currentBowler.id] = (oversBowledMap[currentBowler.id] || 0) + 1;
        bCard.overs = oversBowledMap[currentBowler.id];
        bCard.balls = 0; // clear fractional balls count for formatting
        
        // Swap batsmen at end of over
        const temp = strikerIdx;
        strikerIdx = nonStrikerIdx;
        nonStrikerIdx = temp;
      }

      // Rotate batsmen on single/three
      if (ballRuns === 1 || ballRuns === 3) {
        const temp = strikerIdx;
        strikerIdx = nonStrikerIdx;
        nonStrikerIdx = temp;
      }

      // Check second innings chase target met
      if (targetInfo && runs >= targetInfo.targetRuns) {
        break;
      }
    }

    // Set remaining bowlers' overs format correctly
    for (const bid in bowlingCard) {
      const bc = bowlingCard[bid];
      if (bc.balls > 0) {
        bc.overs = bc.overs + bc.balls / 10;
        bc.balls = 0;
      }
    }

    return {
      balls: ballsLog,
      totalRuns: runs,
      totalWickets: wickets,
      oversBowled: Math.floor(ballsBowled / 6) + (ballsBowled % 6) / 10,
      battingCard,
      bowlingCard: Object.values(bowlingCard),
      rainInterrupted: inningsCompletedEarlyByRain,
      oversLimit: newMaxOvers
    };
  }

  // Simulate complete match: 2 Innings + optional Super Over
  simulateMatch(teamA, teamB, isKnockout = false) {
    // 1. Toss
    const tossWinner = this.random() < 0.5 ? 'teamA' : 'teamB';
    const tossDecision = this.random() < 0.6 ? 'bowl' : 'bat'; // 60% bowl first in T20s
    
    let battingFirst, bowlingFirst;
    if (tossWinner === 'teamA') {
      if (tossDecision === 'bat') {
        battingFirst = teamA;
        bowlingFirst = teamB;
      } else {
        battingFirst = teamB;
        bowlingFirst = teamA;
      }
    } else {
      if (tossDecision === 'bat') {
        battingFirst = teamB;
        bowlingFirst = teamA;
      } else {
        battingFirst = teamA;
        bowlingFirst = teamB;
      }
    }

    // Check for random weather event (5% chance)
    let rainInfo = null;
    if (this.random() < 0.05) {
      // Rain delays!
      const triggerBall = Math.floor(30 + this.random() * 80); // between overs 5 and 18
      const oversLost = Math.floor(3 + this.random() * 8); // 3 to 10 overs lost
      rainInfo = { triggerBall, newMaxOvers: Math.max(5, 20 - oversLost) };
    }

    // 2. Innings 1
    const innings1 = this.simulateInnings(battingFirst.players, bowlingFirst.players, 1, null, 20, rainInfo);
    
    // Calculate resources used by Innings 1
    let resourcesUsed1 = 100;
    if (innings1.rainInterrupted) {
      // Batting stopped early by rain
      const oversLeft = 20 - (innings1.oversLimit);
      resourcesUsed1 = 100 - getResourcePercentage(oversLeft, innings1.totalWickets);
    }

    // 3. Innings 2 Setup
    let innings2MaxOvers = 20;
    let targetRuns = innings1.totalRuns + 1;
    let resourcesAvailable2 = 100;

    let rainInfo2 = null;
    if (innings1.rainInterrupted) {
      // Innings 1 was shortened, so Innings 2 starts shortened
      innings2MaxOvers = innings1.oversLimit;
      resourcesAvailable2 = getResourcePercentage(innings2MaxOvers, 0);
      targetRuns = calculateDLSTarget(innings1.totalRuns, resourcesUsed1, resourcesAvailable2);
    } else if (this.random() < 0.05) {
      // Rain happens mid-chase!
      const triggerBall = Math.floor(20 + this.random() * 60); // early to middle chase
      const oversLost = Math.floor(3 + this.random() * 6);
      innings2MaxOvers = Math.max(5, 20 - oversLost);
      
      resourcesAvailable2 = getResourcePercentage(innings2MaxOvers, 0);
      targetRuns = calculateDLSTarget(innings1.totalRuns, 100, resourcesAvailable2);
      rainInfo2 = { triggerBall, newMaxOvers: innings2MaxOvers };
    }

    const targetInfo = { targetRuns, targetOvers: innings2MaxOvers };

    // Innings 2
    const innings2 = this.simulateInnings(bowlingFirst.players, battingFirst.players, 2, targetInfo, innings2MaxOvers, rainInfo2);

    // DLS calculation if chase gets cut short mid-play
    let finalTarget = targetRuns;
    let winningTeam = null;
    let resultMargin = '';

    if (innings2.rainInterrupted) {
      // Innings 2 stopped mid-play by rain, need to calculate par score at point of stoppage
      // Minimum 5 overs (30 balls) bowled needed for a result
      const ballsBowled2 = Math.floor(innings2.oversBowled) * 6 + Math.round((innings2.oversBowled % 1) * 10);
      if (ballsBowled2 >= 30) {
        const oversRemaining = innings2MaxOvers - innings2.oversBowled;
        const resLeft = getResourcePercentage(oversRemaining, innings2.totalWickets);
        const resUsed2 = resourcesAvailable2 - resLeft;
        
        // Par score is A's runs * (resUsed2 / resUsed1)
        const parScore = Math.floor(innings1.totalRuns * (resUsed2 / resourcesUsed1));
        finalTarget = parScore + 1;

        if (innings2.totalRuns >= finalTarget) {
          winningTeam = bowlingFirst.name;
          resultMargin = `won by ${innings2.totalRuns - parScore} runs (DLS Method)`;
        } else {
          winningTeam = battingFirst.name;
          resultMargin = `won by ${parScore - innings2.totalRuns} runs (DLS Method)`;
        }
      } else {
        // Abandoned
        winningTeam = 'no_result';
        resultMargin = 'Abandoned due to rain (No Result)';
      }
    } else {
      // Clean result without stoppage
      if (innings2.totalRuns >= targetRuns) {
        winningTeam = bowlingFirst.name;
        const wicketsLeft = 10 - innings2.totalWickets;
        resultMargin = `won by ${wicketsLeft} wickets`;
      } else {
        if (innings2.totalRuns === targetRuns - 1) {
          winningTeam = 'tie';
          resultMargin = 'Match tied';
        } else {
          winningTeam = battingFirst.name;
          const runMargin = (targetRuns - 1) - innings2.totalRuns;
          resultMargin = `won by ${runMargin} runs`;
        }
      }
    }

    // 4. Knockout Super Over resolution
    let superOverData = null;
    if (winningTeam === 'tie' && isKnockout) {
      // Super Over: 1 over per side, max 3 batsmen (2 wickets)
      // Pick top 3 batsmen and best bowler for each team
      const teamABatsmen = teamA.players.slice(0, 3);
      const teamBBatsmen = teamB.players.slice(0, 3);
      
      const teamABowler = this.selectBowler(teamA.players, null, 18, {}, 4);
      const teamBBowler = this.selectBowler(teamB.players, null, 18, {}, 4);

      // Super Over Innings 1 (Team A bats first)
      const so1 = this.simulateInnings(teamABatsmen, [teamBBowler], 1, null, 1);
      
      // Super Over Innings 2 (Team B chases)
      const soTarget = { targetRuns: so1.totalRuns + 1 };
      const so2 = this.simulateInnings(teamBBatsmen, [teamABowler], 2, soTarget, 1);

      let superWinner = null;
      if (so2.totalRuns >= soTarget.targetRuns) {
        superWinner = teamB.name;
        resultMargin = `won the Super Over (Tied at ${innings1.totalRuns} runs)`;
      } else if (so2.totalRuns === soTarget.targetRuns - 1) {
        // Tied again - decide by boundary count back or random
        superWinner = so2.totalRuns > so1.totalRuns ? teamB.name : teamA.name;
        resultMargin = `won by boundary count in Super Over`;
      } else {
        superWinner = teamA.name;
        resultMargin = `won the Super Over (Tied at ${innings1.totalRuns} runs)`;
      }

      winningTeam = superWinner;
      superOverData = { innings1: so1, innings2: so2 };
    }

    // 5. Select Man of the Match (MVP)
    let motm = null;
    const allPlayersPerformance = [];

    // Score performances (Captain 2x, Vice-Captain 1.5x)
    const scorePerformance = (player, teamName, isBatting) => {
      let score = 0;
      if (isBatting) {
        score += player.runs;
        score += player.fours * 1;
        score += player.sixes * 2;
        if (player.runs >= 50) score += 10;
        if (player.runs >= 100) score += 25;
      } else {
        score += player.wickets * 20;
        score += Math.max(0, (24 - (player.overs * 6 || 0)) * 2);
      }
      if (player.isCaptain) score *= 2.0;
      else if (player.isViceCaptain) score *= 1.5;
      return score;
    };

    innings1.battingCard.forEach(p => allPlayersPerformance.push({ name: p.name, score: scorePerformance(p, battingFirst.name, true) }));
    innings1.bowlingCard.forEach(p => allPlayersPerformance.push({ name: p.name, score: scorePerformance(p, bowlingFirst.name, false) }));
    innings2.battingCard.forEach(p => allPlayersPerformance.push({ name: p.name, score: scorePerformance(p, bowlingFirst.name, true) }));
    innings2.bowlingCard.forEach(p => allPlayersPerformance.push({ name: p.name, score: scorePerformance(p, battingFirst.name, false) }));

    allPlayersPerformance.sort((a, b) => b.score - a.score);
    motm = allPlayersPerformance[0] ? allPlayersPerformance[0].name : null;

    return {
      tossWinner: tossWinner === 'teamA' ? teamA.name : teamB.name,
      tossDecision,
      inningsData: [innings1, innings2],
      result: {
        winner: winningTeam,
        margin: resultMargin
      },
      superOver: superOverData,
      manOfTheMatch: motm,
      simulatedAt: new Date().toISOString()
    };
  }
}

module.exports = BallEngine;
