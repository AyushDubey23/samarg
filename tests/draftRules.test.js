const { validateDraftXI } = require('../functions/engine/draftRules');

describe('Draft Rules Validation Tests', () => {
  // Helper to generate a dummy player
  const makePlayer = (id, role, isWicketkeeper = false, bowlingType = null) => ({
    id,
    name: `Player ${id}`,
    role,
    isWicketkeeper,
    bowlingType
  });

  test('Should validate a correctly structured Playing XI', () => {
    const players = [
      makePlayer(1, 'opener'),
      makePlayer(2, 'opener'),
      makePlayer(3, 'topOrder'),
      makePlayer(4, 'topOrder'),
      makePlayer(5, 'keeper', true),
      makePlayer(6, 'allRounder', false, 'spin'),
      makePlayer(7, 'allRounder', false, 'pace-medium'),
      makePlayer(8, 'spinner', false, 'off-spin'),
      makePlayer(9, 'pacer', false, 'pace-fast'),
      makePlayer(10, 'pacer', false, 'pace-fast'),
      makePlayer(11, 'middleOrder')
    ];

    const result = validateDraftXI(players);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeNull();
  });

  test('Should reject a Playing XI with less than 11 players', () => {
    const players = [
      makePlayer(1, 'opener'),
      makePlayer(2, 'opener'),
      makePlayer(3, 'topOrder'),
      makePlayer(4, 'topOrder'),
      makePlayer(5, 'keeper', true),
      makePlayer(6, 'allRounder', false, 'spin'),
      makePlayer(7, 'allRounder', false, 'pace-medium'),
      makePlayer(8, 'spinner', false, 'off-spin'),
      makePlayer(9, 'pacer', false, 'pace-fast'),
      makePlayer(10, 'pacer', false, 'pace-fast')
    ];

    const result = validateDraftXI(players);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('It must contain exactly 11 players');
  });

  test('Should reject a Playing XI without a Wicketkeeper', () => {
    const players = [
      makePlayer(1, 'opener'),
      makePlayer(2, 'opener'),
      makePlayer(3, 'topOrder'),
      makePlayer(4, 'topOrder'),
      makePlayer(5, 'middleOrder'), // No keeper role, no isWicketkeeper
      makePlayer(6, 'allRounder', false, 'spin'),
      makePlayer(7, 'allRounder', false, 'pace-medium'),
      makePlayer(8, 'spinner', false, 'off-spin'),
      makePlayer(9, 'pacer', false, 'pace-fast'),
      makePlayer(10, 'pacer', false, 'pace-fast'),
      makePlayer(11, 'middleOrder')
    ];

    const result = validateDraftXI(players);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at least one designated Wicketkeeper');
  });

  test('Should reject a Playing XI with fewer than 5 bowling options', () => {
    const players = [
      makePlayer(1, 'opener'),
      makePlayer(2, 'opener'),
      makePlayer(3, 'topOrder'),
      makePlayer(4, 'topOrder'),
      makePlayer(5, 'keeper', true),
      makePlayer(6, 'middleOrder'),
      makePlayer(7, 'middleOrder'),
      makePlayer(8, 'spinner', false, 'off-spin'), // bowler 1
      makePlayer(9, 'pacer', false, 'pace-fast'),   // bowler 2
      makePlayer(10, 'pacer', false, 'pace-fast'),  // bowler 3
      makePlayer(11, 'pacer', false, 'pace-fast')   // bowler 4
    ];

    const result = validateDraftXI(players);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('You need at least 5 options to cover 20 overs');
  });
});
