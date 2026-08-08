import { mulberry32 } from './seededRng.js';
import { getResourcePercentage, calculateDLSTarget } from './dlsApprox.js';
import { adjustProbabilities } from './matchupModel.js';
import commentaryBank from './commentaryBank.json';

export class BallEngine {
  constructor(seed) {
    this.random = mulberry32(seed);
  }

  choice(arr) {
    const idx = Math.floor(this.random() * arr.length);
    return arr[idx];
  }

  generateCommentary(outcome, batterName, bowlerName) {
    const templates = commentaryBank[outcome] || commentaryBank['dot'];
    const template = this.choice(templates);
    return template.replace(/{batter}/g, batterName).replace(/{bowler}/g, bowlerName);
  }

  selectBowler(team, lastBowlerId, overNumber, oversBowledMap, maxOversPerBowler) {
    const options = team.filter(p => p.bowlingType && (oversBowledMap[p.id] || 0) < maxOversPerBowler && p.id !== lastBowlerId);
    
    if (options.length === 0) {
      const fallback = team.filter(p => p.id !== lastBowlerId);
      return this.choice(fallback);
    }

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
        const typeA = (a.bowlingType || '').toLowerCase();
        const typeB = (b.bowlingType || '').toLowerCase();
        const isSpinA = typeA.includes('spin') || typeA.includes('orthodox') || typeA.includes('wrist');
        const isSpinB = typeB.includes('spin') || typeB.includes('orthodox') || typeB.includes('wrist');
        if (isSpinA && !isSpinB) return -1;
        if (!isSpinA && isSpinB) return 1;
        return (b.wicketTakingRating || 50) - (a.wicketTakingRating || 50);
      }
    });

    const pool = options.slice(0, Math.min(2, options.length));
    return this.choice(pool);
  }

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

    const rainTriggerBall = rainDelayInfo ? rainDelayInfo.triggerBall : -1;
    const newMaxOvers = rainDelayInfo ? rainDelayInfo.newMaxOvers : maxOvers;
    let inningsCompletedEarlyByRain = false;

    while (ballsBowled < newMaxOvers * 6 && wickets < 10) {
      const overNumber = Math.floor(ballsBowled / 6);
      const ballInOver = (ballsBowled % 6) + 1;

      if (ballsBowled === rainTriggerBall) {
        inningsCompletedEarlyByRain = true;
        break;
      }

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

      const probs = adjustProbabilities(
        battingTeam[strikerIdx],
        currentBowler,
        matchState
      );

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
        isFreeHit = false;
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
          ballRuns = 0;
          isFreeHit = false;
          comm = `${currentBowler.name} to ${striker.name}, OUT? No, it's a Free Hit! Batsman survives.`;
        } else {
          wicketFell = true;
          isFreeHit = false;
          lastWicketBall = ballsBowled;

          if (wType === 'runout') {
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
            striker.outState = `out ${wType}`;
            striker.bowledBy = currentBowler.name;
            striker.dismissalType = wType;
            if (wType === 'caught') {
              const catchers = bowlingTeam.filter(p => p.id !== currentBowler.id);
              const catcher = this.choice(catchers);
              striker.caughtBy = catcher ? catcher.name : 'Fielder';
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
          ballRuns = 1;
          extraType = 'wide';
          runs += 1;
          bowlingCard[currentBowler.id].runsConceded += 1;
          bowlingCard[currentBowler.id].wides += 1;
          comm = this.generateCommentary('wide', striker.name, currentBowler.name);
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
          continue;
        } else if (extraRoll < 0.80) {
          ballRuns = 1;
          extraType = 'noball';
          isFreeHit = true;
          runs += 1;
          bowlingCard[currentBowler.id].runsConceded += 1;
          bowlingCard[currentBowler.id].noballs += 1;
          comm = this.generateCommentary('noball', striker.name, currentBowler.name);
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
          continue;
        } else {
          isFreeHit = false;
          extraType = 'bye';
          const byeRoll = this.random();
          let byeRuns = 1;
          if (byeRoll < 0.5) byeRuns = 1;
          else if (byeRoll < 0.8) byeRuns = 2;
          else if (byeRoll < 0.9) byeRuns = 4;
          else byeRuns = 0;

          ballRuns = byeRuns;
          runs += byeRuns;
          comm = `${currentBowler.name} to ${striker.name}, ${byeRuns} bye(s). Sneaks past the keeper!`;
        }
      }

      ballsBowled++;
      striker.balls += 1;
      if (!isExtra || extraType === 'bye') {
        striker.runs += ballRuns;
      }
      runs += ballRuns;

      const bCard = bowlingCard[currentBowler.id];
      bCard.balls += 1;
      if (!isExtra || extraType === 'bye') {
        bCard.runsConceded += ballRuns;
      }
      if (wicketFell && wType !== 'runout') {
        bCard.wickets += 1;
      }

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

      if (ballsBowled % 6 === 0) {
        oversBowledMap[currentBowler.id] = (oversBowledMap[currentBowler.id] || 0) + 1;
        bCard.overs = oversBowledMap[currentBowler.id];
        bCard.balls = 0;
        
        const temp = strikerIdx;
        strikerIdx = nonStrikerIdx;
        nonStrikerIdx = temp;
      }

      if (ballRuns === 1 || ballRuns === 3) {
        const temp = strikerIdx;
        strikerIdx = nonStrikerIdx;
        nonStrikerIdx = temp;
      }

      if (targetInfo && runs >= targetInfo.targetRuns) {
        break;
      }
    }

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

  simulateMatch(teamA, teamB, isKnockout = false) {
    const tossWinner = this.random() < 0.5 ? 'teamA' : 'teamB';
    const tossDecision = this.random() < 0.6 ? 'bowl' : 'bat';
    
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

    let rainInfo = null;
    if (this.random() < 0.05) {
      const triggerBall = Math.floor(this.random() * 30) + 30;
      const newMaxOvers = 10;
      rainInfo = { triggerBall, newMaxOvers };
    }

    const innings1 = this.simulateInnings(battingFirst.players, bowlingFirst.players, 1, null, 20, rainInfo);

    let targetRuns = innings1.totalRuns + 1;
    let innings2MaxOvers = 20;

    const resourcesUsed1 = rainInfo && innings1.rainInterrupted
      ? 100 - getResourcePercentage(20 - Math.floor(rainInfo.triggerBall / 6), innings1.totalWickets)
      : 100;

    let resourcesAvailable2 = 100;
    let rainInfo2 = null;

    if (!rainInfo && this.random() < 0.05) {
      const triggerBall2 = Math.floor(this.random() * 30) + 30;
      innings2MaxOvers = 12;
      resourcesAvailable2 = 100 - getResourcePercentage(20 - 12, 0);
      targetRuns = calculateDLSTarget(innings1.totalRuns, resourcesUsed1, resourcesAvailable2);
      rainInfo2 = { triggerBall: triggerBall2, newMaxOvers: innings2MaxOvers };
    }

    const innings2 = this.simulateInnings(
      bowlingFirst.players,
      battingFirst.players,
      2,
      { targetRuns },
      innings2MaxOvers,
      rainInfo2
    );

    let winningTeam = null;
    let resultMargin = '';

    if (rainInfo2 && innings2.rainInterrupted) {
      const ballsBowled2 = Math.floor(innings2.oversBowled) * 6 + Math.round((innings2.oversBowled % 1) * 10);
      if (ballsBowled2 >= 30) {
        const oversRemaining = innings2MaxOvers - innings2.oversBowled;
        const resLeft = getResourcePercentage(oversRemaining, innings2.totalWickets);
        const resUsed2 = resourcesAvailable2 - resLeft;
        const parScore = Math.floor(innings1.totalRuns * (resUsed2 / resourcesUsed1));
        const finalTarget = parScore + 1;

        if (innings2.totalRuns >= finalTarget) {
          winningTeam = bowlingFirst.name;
          resultMargin = `won by ${innings2.totalRuns - parScore} runs (DLS Method)`;
        } else {
          winningTeam = battingFirst.name;
          resultMargin = `won by ${parScore - innings2.totalRuns} runs (DLS Method)`;
        }
      } else {
        winningTeam = 'no_result';
        resultMargin = 'Abandoned due to rain (No Result)';
      }
    } else {
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

    let superOverData = null;
    if (winningTeam === 'tie' && isKnockout) {
      const teamABatsmen = teamA.players.slice(0, 3);
      const teamBBatsmen = teamB.players.slice(0, 3);
      
      const teamABowler = this.selectBowler(teamA.players, null, 18, {}, 4);
      const teamBBowler = this.selectBowler(teamB.players, null, 18, {}, 4);

      const so1 = this.simulateInnings(teamABatsmen, [teamBBowler], 1, null, 1);
      const soTarget = { targetRuns: so1.totalRuns + 1 };
      const so2 = this.simulateInnings(teamBBatsmen, [teamABowler], 2, soTarget, 1);

      let superWinner = null;
      if (so2.totalRuns >= soTarget.targetRuns) {
        superWinner = teamB.name;
        resultMargin = `won the Super Over (Tied at ${innings1.totalRuns} runs)`;
      } else if (so2.totalRuns === soTarget.targetRuns - 1) {
        superWinner = so2.totalRuns > so1.totalRuns ? teamB.name : teamA.name;
        resultMargin = `won by boundary count in Super Over`;
      } else {
        superWinner = teamA.name;
        resultMargin = `won the Super Over (Tied at ${innings1.totalRuns} runs)`;
      }

      winningTeam = superWinner;
      superOverData = { innings1: so1, innings2: so2 };
    }

    let motm = null;
    const allPlayersPerformance = [];

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
