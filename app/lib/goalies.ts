import type { GoalieStats, Player, Session } from './types'

export function computeGoalieStats(players: Player[], sessions: Session[]): Record<string, GoalieStats> {
  const stats: Record<string, GoalieStats> = {}
  for (const p of players) {
    stats[p.id] = { count: 0, lastDateISO: null }
  }

  // Sessions may be stored in any order. We use dateISO as "last".
  for (const s of sessions) {
    const gA = s.goalies?.A
    const gB = s.goalies?.B
    for (const gid of [gA, gB]) {
      if (!gid) continue
      if (!stats[gid]) stats[gid] = { count: 0, lastDateISO: null }
      stats[gid].count += 1
      const cur = stats[gid].lastDateISO
      if (!cur || s.dateISO > cur) stats[gid].lastDateISO = s.dateISO
    }
  }

  return stats
}
