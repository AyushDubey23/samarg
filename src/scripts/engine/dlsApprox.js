export function getResourcePercentage(oversRemaining, wicketsLost) {
  if (oversRemaining <= 0 || wicketsLost >= 10) return 0;
  const oversRatio = 1.0 - Math.pow(1.0 - Math.min(20, oversRemaining) / 20.0, 1.6);
  const wicketsRatio = Math.pow(1.0 - wicketsLost / 10.0, 0.75);
  return Math.min(100, Math.max(0, oversRatio * wicketsRatio * 100));
}

export function calculateDLSTarget(teamAScore, teamAResourcesUsed, teamBResourcesAvailable) {
  if (teamAResourcesUsed <= 0) return teamAScore + 1;
  const resourceRatio = teamBResourcesAvailable / teamAResourcesUsed;
  const rawTarget = teamAScore * resourceRatio;
  return Math.max(1, Math.floor(rawTarget) + 1);
}
