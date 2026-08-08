const BASE_PROBABILITIES = {
  dot: 0.36,
  one: 0.34,
  two: 0.06,
  three: 0.01,
  four: 0.10,
  six: 0.05,
  wicket: 0.05,
  extras: 0.03
};

/**
 * Adjusts the baseline T20 ball outcome probabilities based on batter vs bowler matchups,
 * match phase, aggression scaling, and chase pressure.
 * 
 * @param {Object} batter - Batsman stats and ratings
 * @param {Object} bowler - Bowler stats and ratings
 * @param {Object} matchState - Current state of the match
 * @returns {Object} Adjusted outcome probabilities
 */
function adjustProbabilities(batter, bowler, matchState) {
  // Deep copy base probabilities
  const probs = { ...BASE_PROBABILITIES };

  const totalOvers = matchState.totalOvers || 20;
  const currentBall = matchState.ballsBowled;
  const currentOver = Math.floor(currentBall / 6);
  const isFreeHit = !!matchState.isFreeHit;

  // Extract v2 additions from matchState
  const nonStriker = matchState.nonStriker;
  const battingCaptain = matchState.battingCaptain;
  const lastWicketBall = matchState.lastWicketBall !== undefined ? matchState.lastWicketBall : -999;

  // Determine match phase
  let phase = 'middle';
  if (currentOver < 6) phase = 'powerplay';
  else if (currentOver >= 15) phase = 'death';

  // 1. Determine Bowler Type (Pace vs Spin)
  const bType = (bowler.bowlingType || 'pace-medium').toLowerCase();
  const isSpin = bType.includes('spin') || bType.includes('orthodox') || bType.includes('wrist');
  const isPace = !isSpin;

  // 2. Batter vs Bowler Rating Advantage Scaling
  const batRating = batter.batRating || batter.vsPaceRating || 75;
  const bowlRating = bowler.bowlRating || bowler.wicketTakingRating || 70;

  let effectiveBat = batRating;
  if (batter.isCaptain) effectiveBat *= 1.20;
  if (batter.isViceCaptain) effectiveBat *= 1.10;

  let effectiveBowl = bowlRating;
  if (bowler.isCaptain) effectiveBowl *= 1.20;
  if (bowler.isViceCaptain) effectiveBowl *= 1.10;

  const ratingDiff = (effectiveBat - effectiveBowl) / 100;
  let wicketMult = 1.0;

  if (ratingDiff > 0) {
    probs.four += ratingDiff * 0.18;
    probs.six += ratingDiff * 0.12;
    probs.one += ratingDiff * 0.08;
    probs.dot -= ratingDiff * 0.28;
    wicketMult = Math.max(0.25, 1.0 - ratingDiff * 1.6);
  } else {
    const bowlAdv = Math.abs(ratingDiff);
    probs.dot += bowlAdv * 0.25;
    probs.four = Math.max(0.01, probs.four - bowlAdv * 0.10);
    probs.six = Math.max(0.005, probs.six - bowlAdv * 0.08);
    wicketMult = 1.0 + bowlAdv * 2.2;
  }

  // v2 Composure Cascade: if batter is Volatile and a wicket fell in the last 6 balls (1 over)
  if (batter.composureTag === 'Volatile' && (currentBall - lastWicketBall) <= 6) {
    wicketMult *= 1.20; // 20% dismissals spike
  }

  // v2 Calm Captain Modifier: Calm-under-pressure captain reduces dismissal chance team-wide
  if (battingCaptain && battingCaptain.composureTag === 'Calm-under-pressure') {
    wicketMult *= 0.95; // 5% reduction in wicket probability
  }

  // 4. Match Phase Adjustments
  if (phase === 'powerplay') {
    probs.four *= 1.25;
    probs.six *= 1.15;
    probs.dot *= 0.90;

    if (isPace) {
      const ppBowlSkill = bowler.powerplayBowlingRating || 50;
      wicketMult *= (1.0 + (ppBowlSkill - 50) / 100);
    } else {
      const ppBowlSkill = bowler.powerplayBowlingRating || 50;
      if (ppBowlSkill < 55) {
        probs.four *= 1.1;
      } else {
        probs.dot *= 1.05;
      }
    }
  } else if (phase === 'death') {
    probs.six *= 1.6;
    probs.four *= 1.2;
    probs.one *= 0.75;
    probs.two *= 0.8;
    probs.dot *= 1.1;

    const deathBowlSkill = bowler.deathBowlingRating || 50;
    const powerHittingSkill = batter.powerHittingRating || 50;

    const deathMatchup = (deathBowlSkill - powerHittingSkill) / 100;
    if (deathMatchup > 0) {
      wicketMult *= (1.2 + deathMatchup);
      probs.dot *= (1.0 + deathMatchup * 0.3);
      probs.six *= (1.0 - deathMatchup * 0.3);
    } else {
      probs.six *= (1.0 + Math.abs(deathMatchup) * 0.5);
      wicketMult *= (1.0 - Math.abs(deathMatchup) * 0.2);
    }
  } else {
    probs.one *= 1.1;
    probs.two *= 1.15;
    probs.four *= 0.9;
    probs.six *= 0.85;
  }

  // 5. Aggression and Chase Pressure in 2nd Innings
  if (matchState.innings === 2 && matchState.target) {
    const runsRemaining = matchState.target - matchState.runs;
    const ballsRemaining = totalOvers * 6 - currentBall;
    
    if (ballsRemaining > 0) {
      const rrr = (runsRemaining / (ballsRemaining / 6));
      const crr = currentBall > 0 ? (matchState.runs / (currentBall / 6)) : 0;
      
      if (rrr > 8.0 || rrr > crr + 1.0) {
        const pressure = Math.min(2.0, rrr / 6.0);
        probs.six *= (1.0 + (pressure - 1.0) * 0.5);
        probs.four *= (1.0 + (pressure - 1.0) * 0.2);
        wicketMult *= Math.pow(pressure, 1.5);
        probs.dot *= (0.9 + (pressure - 1.0) * 0.1);
      }
    }
  }

  // v2 Chemistry Multipliers (Pairwise crease chemistry)
  if (nonStriker) {
    const hasTeammateLink = Array.isArray(batter.chemistryLinks) && batter.chemistryLinks.includes(nonStriker.id);
    if (hasTeammateLink) {
      // Teammate link: +3% runs, -2% wicket probability
      probs.one *= 1.03;
      probs.two *= 1.03;
      probs.three *= 1.03;
      probs.four *= 1.03;
      probs.six *= 1.03;
      wicketMult *= 0.98;
    }

    const t1 = batter.battingTemperament;
    const t2 = nonStriker.battingTemperament;

    // Anchor + Aggressor: +5% runs, -3% wicket risk
    if ((t1 === 'Anchor' && t2 === 'Aggressor') || (t1 === 'Aggressor' && t2 === 'Anchor')) {
      probs.one *= 1.05;
      probs.two *= 1.05;
      probs.three *= 1.05;
      probs.four *= 1.05;
      probs.six *= 1.05;
      wicketMult *= 0.97;
    }

    // Aggressor + Aggressor: +12% boundaries, +10% wicket risk
    if (t1 === 'Aggressor' && t2 === 'Aggressor') {
      probs.four *= 1.12;
      probs.six *= 1.12;
      wicketMult *= 1.10;
    }
  }

  // Apply Wicket Multiplier
  probs.wicket *= wicketMult;

  // Free Hit Rule
  if (isFreeHit) {
    probs.wicket = BASE_PROBABILITIES.wicket * 0.1;
  }

  // 6. Ensure no probability goes below zero
  for (const k in probs) {
    probs[k] = Math.max(0.001, probs[k]);
  }

  // 7. Normalization
  const sum = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const k in probs) {
    probs[k] /= sum;
  }

  return probs;
}

module.exports = {
  adjustProbabilities
};
