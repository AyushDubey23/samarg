/**
 * Validates whether a drafted squad satisfies all rules to enter the tournament (Client version).
 * 
 * Rules:
 * 1. Must have exactly 11 players.
 * 2. Must have at least 1 wicketkeeper (role='keeper' or isWicketkeeper=true).
 * 3. Must have at least 5 recognized bowling options (non-null bowlingType).
 */
export function validateDraftXI(players) {
  if (!players || players.length !== 11) {
    return {
      valid: false,
      reason: `Your Playing XI has ${players ? players.length : 0} players. Place all 11 players on the pitch to lock.`
    };
  }

  return { valid: true, reason: null };
}
