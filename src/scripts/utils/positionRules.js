/**
 * Position Rules & Formatting Helper for SAMARG Cricket Draft
 * Enforces batting order eligibility and Wicketkeeper constraints.
 */

/**
 * Formats player name with a small (WK) prefix for Wicketkeepers.
 * Example: "(WK) MS Dhoni" or "(WK) DHONI"
 */
export function formatPlayerName(player, isShort = false) {
  if (!player) return "";
  const role = String(player.role || '').toLowerCase();
  const isWK = !!player.isWicketkeeper || !!player.isWK || role === 'keeper';
  const prefix = isWK ? '(WK) ' : '';

  if (isShort) {
    const lastName = String(player.name || '').split(" ").slice(-1)[0].toUpperCase();
    return prefix + lastName;
  }
  return prefix + player.name;
}

export function getAllowedSlotsForPlayer(player) {
  if (!player) return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const role = String(player.role || '').toLowerCase();
  const name = String(player.name || '').toLowerCase();
  const isKeeper = !!player.isWicketkeeper || !!player.isWK || role === 'keeper';
  const batRating = player.batRating || player.battingAverage || 0;
  const bowlRating = player.bowlRating || player.economyRate || 0;

  // 1. Star / Specialty Player Overrides
  if (name.includes('kohli') || name.includes('rohit') || name.includes('gambhir') || name.includes('sehwag') || name.includes('warner') || name.includes('sachin') || name.includes('babar')) {
    return [0, 1, 2, 3];
  }

  if (name.includes('bumrah') || name.includes('starc') || name.includes('shami') || name.includes('bhuvi') || name.includes('boult') || name.includes('kuldeep') || name.includes('chahal') || name.includes('rabada')) {
    return [5, 6, 7, 8, 9, 10];
  }

  // 2. Role-based Slot Restrictions
  if (role === 'opener') {
    return [0, 1, 2, 3];
  }

  if (role === 'toporder' || role === 'top-order') {
    return [0, 1, 2, 3];
  }

  if (role === 'middleorder' || role === 'middle-order') {
    return [2, 3, 4, 5, 6];
  }

  if (isKeeper) {
    if (batRating >= 80) {
      return [0, 1, 2, 3, 4, 5, 6];
    }
    return [2, 3, 4, 5, 6, 7];
  }

  if (role === 'allrounder' || role === 'all-rounder') {
    return [3, 4, 5, 6, 7, 8];
  }

  if (role === 'pacer' || role === 'spinner') {
    return [5, 6, 7, 8, 9, 10];
  }

  // 3. Fallback based on ratings if role is ambiguous
  if (batRating >= 75 && bowlRating < 50) {
    return [0, 1, 2, 3, 4, 5];
  }
  if (bowlRating >= 70) {
    return [5, 6, 7, 8, 9, 10];
  }

  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

export function isPlayerAllowedInSlot(player, slotIndex, currentSlots = []) {
  if (!player) return true;

  // Mandatory Wicketkeeper check for the final pick when 10 slots are filled and 0 Wicketkeeper selected
  if (Array.isArray(currentSlots) && currentSlots.length > 0) {
    const existingOtherPlaced = currentSlots.filter((p, idx) => p !== null && idx !== slotIndex);
    const hasKeeperInOtherSlots = existingOtherPlaced.some(p => p && (p.isWicketkeeper || p.isWK || String(p.role || '').toLowerCase() === 'keeper'));
    const isThisPlayerKeeper = !!player.isWicketkeeper || !!player.isWK || String(player.role || '').toLowerCase() === 'keeper';

    // If 10 players are placed and 0 keepers exist so far, the final player MUST be a Wicketkeeper
    if (existingOtherPlaced.length === 10 && !hasKeeperInOtherSlots && !isThisPlayerKeeper) {
      return false;
    }
  }

  const allowedSlots = getAllowedSlotsForPlayer(player);
  return allowedSlots.includes(slotIndex);
}

export function getSlotLabel(slotIndex) {
  const labels = [
    "Opener (#1)",
    "Opener (#2)",
    "One-Down (#3)",
    "Two-Down (#4)",
    "Middle-Order (#5)",
    "Middle-Order (#6)",
    "Lower-Order (#7)",
    "Bowler/All-Rounder (#8)",
    "Bowler (#9)",
    "Bowler (#10)",
    "Tailender (#11)"
  ];
  return labels[slotIndex] || `Position #${slotIndex + 1}`;
}

export function getIneligibleReason(player, slotIndex, currentSlots = []) {
  if (!player) return "No player selected.";

  if (Array.isArray(currentSlots) && currentSlots.length > 0) {
    const existingOtherPlaced = currentSlots.filter((p, idx) => p !== null && idx !== slotIndex);
    const hasKeeperInOtherSlots = existingOtherPlaced.some(p => p && (p.isWicketkeeper || p.isWK || String(p.role || '').toLowerCase() === 'keeper'));
    const isThisPlayerKeeper = !!player.isWicketkeeper || !!player.isWK || String(player.role || '').toLowerCase() === 'keeper';

    if (existingOtherPlaced.length === 10 && !hasKeeperInOtherSlots && !isThisPlayerKeeper) {
      return `Mandatory Wicketkeeper Rule: No Wicketkeeper in your XI yet! Your final slot MUST be filled by a Wicketkeeper.`;
    }
  }

  const allowedSlots = getAllowedSlotsForPlayer(player);
  const allowedLabels = allowedSlots.map(s => `#${s + 1}`).join(", ");
  const targetLabel = getSlotLabel(slotIndex);

  return `${formatPlayerName(player)} is not eligible for ${targetLabel}. Allowed positions: ${allowedLabels}.`;
}
