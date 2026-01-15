import type { GoalieStats, Player, TrainingSession } from "./types";

export function getTodayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function displayName(p: Player): string {
  return `${p.firstName} ${p.lastInitial}.`;
}

export function computeGoalieStats(sessions: TrainingSession[], playerId: string): GoalieStats {
  let count = 0;
  let lastISO: string | undefined;
  for (const s of sessions) {
    const { goalieRedId, goalieBlackId } = s.split;
    if (goalieRedId === playerId || goalieBlackId === playerId) {
      count += 1;
      if (!lastISO || s.dateISO > lastISO) lastISO = s.dateISO;
    }
  }
  return { count, lastISO };
}
