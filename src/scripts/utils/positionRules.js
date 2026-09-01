/**
 * Position Rules Helper for SAMARG Cricket Draft
 * Enforces batting order eligibility based on player roles and specialization.
 * 
 * Batting Positions (1-indexed: 1..11, 0-indexed slot indices: 0..10):
 * Slot 0: #1 Opener
 * Slot 1: #2 Opener
 * Slot 2: #3 One-Down / Top Order
 * Slot 3: #4 Two-Down / Middle Order
 * Slot 4: #5 Middle Order
 * Slot 5: #6 Lower Middle Order / Finisher / Bowler
 * Slot 6: #7 All-Rounder / Bowler
 * Slot 7: #8 Bowler / All-Rounder (7 down)
 * Slot 8: #9 Bowler (8 down)
 * Slot 9: #10 Bowler (9 down)
 * Slot 10: #11 Tailender Bowler
 */

export function getAllowedSlotsForPlayer(player) {
  if (!player) return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const role = String(player.role || '').toLowerCase();
  const name = String(player.name || '').toLowerCase();
  const isKeeper = !!player.isWicketkeeper || role === 'keeper';
  const batRating = player.batRating || player.battingAverage || 0;
  const bowlRating = player.bowlRating || player.economyRate || 0;

  // 1. Star / Specialty Player Overrides
  // Top Order Superstars (e.g. Virat Kohli, Rohit Sharma, Gautam Gambhir, Sachin, Babar Azam, Warner, KL Rahul)
  if (name.includes('kohli') || name.includes('rohit') || name.includes('gambhir') || name.includes('sehwag') || name.includes('warner') || name.includes('sachin') || name.includes('babar')) {
    // Can open (#1, #2), play One-down (#3), or Two-down (#4)
    return [0, 1, 2, 3];
  }

  // Pure Bowlers / Specialists (e.g. Bumrah, Starc, Shami, Boult, Kuldeep, Chahal, Rashid, Rabada)
  if (name.includes('bumrah') || name.includes('starc') || name.includes('shami') || name.includes('bhuvi') || name.includes('boult') || name.includes('kuldeep') || name.includes('chahal') || name.includes('rabada')) {
    // Bowlers have a wide lower-order range: #6 through #11 (Indices 5..10)
    return [5, 6, 7, 8, 9, 10];
  }

  // 2. Role-based Slot Restrictions
  if (role === 'opener') {
    // Openers can open (#1, #2) or play 1-down (#3) or 2-down (#4)
    return [0, 1, 2, 3];
  }

  if (role === 'toporder' || role === 'top-order') {
    // Top order batsmen (#1, #2, #3, #4)
    return [0, 1, 2, 3];
  }

  if (role === 'middleorder' || role === 'middle-order') {
    // Middle order batsmen (#3, #4, #5, #6, #7)
    return [2, 3, 4, 5, 6];
  }

  if (isKeeper) {
    // Wicketkeeper: Wicketkeeper-openers/top-order can bat #1-#7
    if (batRating >= 80) {
      return [0, 1, 2, 3, 4, 5, 6];
    }
    return [2, 3, 4, 5, 6, 7];
  }

  if (role === 'allrounder' || role === 'all-rounder') {
    // All-Rounders: Flexible upper-middle to lower-order (#4 to #9)
    return [3, 4, 5, 6, 7, 8];
  }

  if (role === 'pacer' || role === 'spinner') {
    // Bowlers: Enlarged lower order range (#6, #7, #8, #9, #10, #11)
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

export function isPlayerAllowedInSlot(player, slotIndex) {
  if (!player) return true;
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

export function getIneligibleReason(player, slotIndex) {
  if (!player) return "No player selected.";
  const allowedSlots = getAllowedSlotsForPlayer(player);
  const allowedLabels = allowedSlots.map(s => `#${s + 1}`).join(", ");
  const targetLabel = getSlotLabel(slotIndex);

  return `${player.name} (${player.role || 'Player'}) is not eligible for ${targetLabel}. Allowed positions: ${allowedLabels}.`;
}
