const BallEngine = require('../functions/engine/ballEngine');

describe('Ball Engine Simulation & Calibration Tests', () => {
  // Generate a mock team of neutral players (ratings centered at 50)
  const generateNeutralTeam = (name) => {
    const players = [];
    for (let i = 1; i <= 11; i++) {
      const isWK = i === 5;
      const isBowler = i >= 7;
      players.push({
        id: `${name}_player_${i}`,
        name: `${name} Player ${i}`,
        role: isWK ? 'keeper' : (isBowler ? 'pacer' : 'middleOrder'),
        isWicketkeeper: isWK,
        isCaptain: i === 1,
        battingAverage: 30.0,
        strikeRate: 130.0,
        vsPaceRating: 50,
        vsSpinRating: 50,
        powerHittingRating: 50,
        temperamentConsistency: 50,
        runningBetweenWickets: 75,
        bowlingType: isBowler ? 'pace-medium' : null,
        bowlingAverage: 25.0,
        economyRate: 7.5,
        strikeRateBowling: 20.0,
        wicketTakingRating: 50,
        deathBowlingRating: 50,
        powerplayBowlingRating: 50,
        fieldingRating: 70
      });
    }
    return { name, players };
  };

  test('Should calibrate ball outcome frequencies within tolerance over 10,000 balls', () => {
    // Fixed seed to make the test deterministic
    const engine = new BallEngine(42);

    const teamA = generateNeutralTeam('Team A');
    const teamB = generateNeutralTeam('Team B');

    const counts = {
      dot: 0,
      one: 0,
      two: 0,
      three: 0,
      four: 0,
      six: 0,
      wicket: 0,
      extras: 0
    };

    let totalBalls = 0;

    // Run multiple matches to accumulate 10,000+ balls
    while (totalBalls < 10000) {
      // Simulate an innings (Innings 1)
      const innings = engine.simulateInnings(teamA.players, teamB.players, 1, null, 20);
      
      innings.balls.forEach(ball => {
        totalBalls++;
        
        if (ball.isWicket) {
          counts.wicket++;
        } else if (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'noball')) {
          counts.extras++;
        } else {
          // Runs check
          if (ball.runs === 0) counts.dot++;
          else if (ball.runs === 1) counts.one++;
          else if (ball.runs === 2) counts.two++;
          else if (ball.runs === 3) counts.three++;
          else if (ball.runs === 4) counts.four++;
          else if (ball.runs === 6) counts.six++;
        }
      });
    }

    // Output percentages
    const pct = {};
    for (const key in counts) {
      pct[key] = counts[key] / totalBalls;
    }

    console.log(`Stat Sanity: Run of ${totalBalls} balls generated outcome frequencies:`, pct);

    // Calibration values from Section 3.5:
    // dot ~36%, 1 run ~34%, 2 runs ~6%, 3 runs ~1%, four ~10%, six ~5%, wicket ~5%, extras ~3%
    // We expect some variance due to powerplay and death phase shifts, so we allow generous but logical tolerances:
    expect(pct.dot).toBeGreaterThan(0.28);
    expect(pct.dot).toBeLessThan(0.44);

    expect(pct.one).toBeGreaterThan(0.26);
    expect(pct.one).toBeLessThan(0.40);

    expect(pct.two).toBeGreaterThan(0.03);
    expect(pct.two).toBeLessThan(0.12);

    expect(pct.four).toBeGreaterThan(0.06);
    expect(pct.four).toBeLessThan(0.16);

    expect(pct.six).toBeGreaterThan(0.02);
    expect(pct.six).toBeLessThan(0.09);

    expect(pct.wicket).toBeGreaterThan(0.02);
    expect(pct.wicket).toBeLessThan(0.09);

    expect(pct.extras).toBeGreaterThan(0.01);
    expect(pct.extras).toBeLessThan(0.07);
  });
});
