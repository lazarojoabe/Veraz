export function calculateProgress(consumed: number, goal: number) {
  if (!Number.isFinite(consumed) || !Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(Math.max(Math.round((consumed / goal) * 100), 0), 100);
}
