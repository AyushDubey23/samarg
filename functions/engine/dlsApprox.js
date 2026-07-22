/**
 * Calculates the resource percentage remaining for a team based on
 * overs remaining in their innings and wickets lost.
 * 
 * @param {number} oversRemaining - Overs remaining in the innings (up to 20)
 * @param {number} wicketsLost - Current wickets lost (0 to 10)
 * @returns {number} Resource percentage remaining (0 to 100)
 */
function getResourcePercentage(oversRemaining, wicketsLost) {
  if (oversRemaining <= 0 || wicketsLost >= 10) return 0;

  // Saturation curve for overs remaining: early overs are worth less dynamically
  // e.g. at 20 overs remaining: oversRatio = 1.0
  //      at 10 overs remaining: oversRatio ~ 0.67
  //      at 5 overs remaining: oversRatio ~ 0.37
  const oversRatio = 1.0 - Math.pow(1.0 - Math.min(20, oversRemaining) / 20.0, 1.6);

  // Wicket decay factor: resources decline sharply as wickets fall
  // e.g. at 0 wickets lost: wicketsRatio = 1.0
  //      at 5 wickets lost: wicketsRatio ~ 0.59
  //      at 9 wickets lost: wicketsRatio ~ 0.17
  const wicketsRatio = Math.pow(1.0 - wicketsLost / 10.0, 0.75);

  return Math.min(100, Math.max(0, oversRatio * wicketsRatio * 100));
}

/**
 * Calculates the adjusted target for the chasing team.
 * 
 * @param {number} teamAScore - Runs scored by Team A
 * @param {number} teamAResourcesUsed - Resource percentage used by Team A (0 to 100)
 * @param {number} teamBResourcesAvailable - Resource percentage available to Team B (0 to 100)
 * @returns {number} Adjusted target for Team B (runs needed to win)
 */
function calculateDLSTarget(teamAScore, teamAResourcesUsed, teamBResourcesAvailable) {
  if (teamAResourcesUsed <= 0) return teamAScore + 1;

  const resourceRatio = teamBResourcesAvailable / teamAResourcesUsed;
  const rawTarget = teamAScore * resourceRatio;

  // Standard rounding rules: floor and add 1 to get the win target
  return Math.max(1, Math.floor(rawTarget) + 1);
}

module.exports = {
  getResourcePercentage,
  calculateDLSTarget
};
