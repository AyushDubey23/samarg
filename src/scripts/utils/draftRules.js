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
      reason: `Your Playing XI has ${players ? players.length : 0} players. It must contain exactly 11 players.`
    };
  }

  const hasKeeper = players.some(p => p.role === 'keeper' || p.isWicketkeeper === true);
  if (!hasKeeper) {
    return {
      valid: false,
      reason: "Your Playing XI must contain at least one designated Wicketkeeper."
    };
  }

  const bowlingOptions = players.filter(p => p.bowlingType && p.bowlingType !== null);
  if (bowlingOptions.length < 5) {
    return {
      valid: false,
      reason: `Your Playing XI only has ${bowlingOptions.length} bowling options. You need at least 5 options to cover 20 overs.`
    };
  }

  return { valid: true, reason: null };
}
