/**
 * Validates whether a drafted squad satisfies all rules to enter the tournament (Client version).
 * 
 * Rules:
 * 1. Must have exactly 11 players.
 * 2. Must have at least 1 wicketkeeper (role='keeper' or isWicketkeeper=true).
 * 3. Must have at least 5 recognized bowling options (players with bowlRating > 0, role pacer/spinner/allRounder, or non-null bowlingType).
 */
export function validateDraftXI(players) {
  if (!players || players.length !== 11) {
    return {
      valid: false,
      reason: `Your Playing XI has ${players ? players.length : 0} players. It must contain exactly 11 players. Place all 11 players on the pitch to lock.`
    };
  }

  const hasKeeper = players.some(p => p && (p.isWicketkeeper || p.role === 'keeper'));
  if (!hasKeeper) {
    return {
      valid: false,
      reason: "Your team needs at least one designated Wicketkeeper."
    };
  }

  const bowlers = players.filter(p => p && (p.bowlingType || (p.bowlRating && p.bowlRating > 0) || ['pacer', 'spinner', 'allRounder'].includes(p.role)));
  if (bowlers.length < 5) {
    return {
      valid: false,
      reason: "You need at least 5 options to cover 20 overs."
    };
  }

  return { valid: true, reason: null };
}
