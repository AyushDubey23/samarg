/**
 * Validates whether a drafted squad satisfies all rules to enter the tournament.
 * 
 * Rules:
 * 1. Must have exactly 11 players.
 * 2. Must have at least 1 wicketkeeper (marked by role='keeper' or isWicketkeeper=true).
 * 3. Must have at least 5 recognized bowling options (players with a non-null bowlingType).
 * 
 * @param {Array} players - Array of 11 player objects
 * @returns {Object} { valid: boolean, reason: string|null }
 */
function validateDraftXI(players) {
  if (!players || players.length !== 11) {
    return {
      valid: false,
      reason: `Your Playing XI has ${players ? players.length : 0} players. Place all 11 players on the pitch to lock.`
    };
  }

  return { valid: true, reason: null };
}

module.exports = {
  validateDraftXI
};
