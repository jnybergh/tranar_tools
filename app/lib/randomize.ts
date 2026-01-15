import { GoalieStats, LockState, Player, TeamSplit } from './types'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function normalizeSplit(split: TeamSplit) {
  const a = [...split.teamA].sort()
  const b = [...split.teamB].sort()
  return { a, b }
}

export function isSameSplit(x: TeamSplit, y: TeamSplit): boolean {
  const nx = normalizeSplit(x)
  const ny = normalizeSplit(y)

  const direct = arrayEq(nx.a, ny.a) && arrayEq(nx.b, ny.b)
  const swapped = arrayEq(nx.a, ny.b) && arrayEq(nx.b, ny.a)
  return direct || swapped
}

function arrayEq(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export type RandomizeArgs = {
  selectedPlayerIds: string[]
  players: Player[]
  locks: LockState
  avoidSplits: TeamSplit[]
  goalieStats: Record<string, GoalieStats>
  maxAttempts?: number
  seed?: number
}

export type RandomizeResult = {
  split: TeamSplit
  goalies: { A?: string; B?: string }
  seed: number
  warnings: string[]
}

export function randomizeTeams(args: RandomizeArgs): RandomizeResult {
  const { selectedPlayerIds, players, locks, avoidSplits, goalieStats } = args
  const maxAttempts = args.maxAttempts ?? 60
  const warnings: string[] = []

  const selected = new Set(selectedPlayerIds)
  const selectedPlayers = players.filter((p) => selected.has(p.id))

  const goalieCandidates = selectedPlayers.filter((p) => p.canGoalie)
  if (goalieCandidates.length < 2) {
    warnings.push('Mindre än 2 målvaktskandidater bland dagens spelare. Jag försöker ändå dela så bra som möjligt.')
  }

  const baseSeed = (args.seed ?? Date.now()) >>> 0

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = (baseSeed + attempt * 1013904223) >>> 0
    const rand = mulberry32(seed)

    const lockedA = selectedPlayers.filter((p) => locks[p.id] === 'A').map((p) => p.id)
    const lockedB = selectedPlayers.filter((p) => locks[p.id] === 'B').map((p) => p.id)

    const usedLocked = new Set([...lockedA, ...lockedB])

    const freePlayers = selectedPlayers.filter((p) => !usedLocked.has(p.id))

    // Goalies: ensure one per team when possible (fair rotation)
    const lockedGoaliesA = lockedA.filter((id) => players.find((p) => p.id === id)?.canGoalie)
    const lockedGoaliesB = lockedB.filter((id) => players.find((p) => p.id === id)?.canGoalie)

    let teamA: string[] = [...lockedA]
    let teamB: string[] = [...lockedB]

    const freeGoalies = freePlayers.filter((p) => p.canGoalie).map((p) => p.id)
    const freeSkaters = freePlayers.filter((p) => !p.canGoalie).map((p) => p.id)

    const chosenGoalies = pickFairGoalies(freeGoalies, goalieStats, rand)
    const shuffledSkaters = shuffle(freeSkaters, rand)

    // Place goalies
    const needsA = lockedGoaliesA.length === 0
    const needsB = lockedGoaliesB.length === 0

    let goalieA: string | undefined
    let goalieB: string | undefined

    if (needsA && needsB) {
      if (chosenGoalies.length >= 2) {
        goalieA = chosenGoalies[0]
        goalieB = chosenGoalies[1]
        teamA.push(goalieA)
        teamB.push(goalieB)
        chosenGoalies.splice(0, 2)
      } else if (chosenGoalies.length === 1) {
        // One goalie only
        const g = chosenGoalies[0]
        if (rand() < 0.5) {
          goalieA = g
          teamA.push(g)
        } else {
          goalieB = g
          teamB.push(g)
        }
        chosenGoalies.splice(0, 1)
      }
    } else if (needsA && !needsB) {
      if (chosenGoalies.length >= 1) {
        goalieA = chosenGoalies[0]
        teamA.push(goalieA)
        chosenGoalies.splice(0, 1)
      }
    } else if (!needsA && needsB) {
      if (chosenGoalies.length >= 1) {
        goalieB = chosenGoalies[0]
        teamB.push(goalieB)
        chosenGoalies.splice(0, 1)
      }
    }

    // Any remaining goalies are treated as skaters for balancing (U8 rotates)
    const rest = [...chosenGoalies, ...shuffledSkaters]

    // Balance sizes to be as even as possible
    const totalTargetA = Math.ceil(selectedPlayers.length / 2)
    // Fill alternating but respecting target
    for (const id of rest) {
      if (teamA.length < totalTargetA) {
        teamA.push(id)
      } else {
        teamB.push(id)
      }
    }

    const split = { teamA, teamB }

    const isAvoided = avoidSplits.some((s) => isSameSplit(split, s))
    if (isAvoided) continue

    // Final small balance pass if locked caused imbalance
    const balanced = balanceIfNeeded(split, players, locks, selectedPlayerIds, rand)

    const isAvoided2 = avoidSplits.some((s) => isSameSplit(balanced, s))
    if (isAvoided2) continue

    // Determine final goalie IDs (prefer explicitly chosen or locked)
    const finalGoalies = {
      A: lockedGoaliesA[0] ?? goalieA,
      B: lockedGoaliesB[0] ?? goalieB
    }

    return { split: balanced, seed, warnings, goalies: finalGoalies }
  }

  warnings.push('Kunde inte hitta en unik lagindelning som skiljer sig från senaste historiken. Visar bästa försök ändå.')
  // Fallback: just do a simple split with no avoid
  const fallback = randomizeTeams({ ...args, avoidSplits: [], maxAttempts: 1, seed: (args.seed ?? Date.now()) })
  return { ...fallback, warnings: [...fallback.warnings, ...warnings] }
}

function balanceIfNeeded(
  split: TeamSplit,
  players: Player[],
  locks: LockState,
  selectedPlayerIds: string[],
  rand: () => number
): TeamSplit {
  // Only swap free (unlocked) skaters if one team is larger by >1
  let { teamA, teamB } = { teamA: [...split.teamA], teamB: [...split.teamB] }

  const isLocked = (id: string) => locks[id] === 'A' || locks[id] === 'B'
  const selectedSet = new Set(selectedPlayerIds)

  const freeA = teamA.filter((id) => selectedSet.has(id) && !isLocked(id))
  const freeB = teamB.filter((id) => selectedSet.has(id) && !isLocked(id))

  while (Math.abs(teamA.length - teamB.length) > 1) {
    if (teamA.length > teamB.length) {
      // move one free from A to B
      const movable = freeA.filter((id) => teamA.includes(id))
      if (movable.length === 0) break
      const pick = movable[Math.floor(rand() * movable.length)]
      teamA = teamA.filter((x) => x !== pick)
      teamB = [...teamB, pick]
    } else {
      const movable = freeB.filter((id) => teamB.includes(id))
      if (movable.length === 0) break
      const pick = movable[Math.floor(rand() * movable.length)]
      teamB = teamB.filter((x) => x !== pick)
      teamA = [...teamA, pick]
    }
  }

  // Ensure at most one goalie per team? Not required; keep as is.
  return { teamA, teamB }
}

function pickFairGoalies(goalieIds: string[], stats: Record<string, GoalieStats>, rand: () => number): string[] {
  const list = goalieIds.slice()
  // Sort by: count asc, lastDate oldest first (null = oldest), then random tie-break
  list.sort((a, b) => {
    const sa = stats[a] ?? { count: 0, lastDateISO: null }
    const sb = stats[b] ?? { count: 0, lastDateISO: null }
    if (sa.count !== sb.count) return sa.count - sb.count
    const da = sa.lastDateISO ?? ''
    const db = sb.lastDateISO ?? ''
    if (da !== db) {
      // '' means never => should come first
      if (da === '') return -1
      if (db === '') return 1
      return da.localeCompare(db)
    }
    // random tie-break
    return rand() < 0.5 ? -1 : 1
  })
  return list
}
