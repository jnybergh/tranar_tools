import { Player, Session } from './types'

const PLAYERS_KEY = 'hockey.players.v1'
const SESSIONS_KEY = 'hockey.sessions.v1'
const DRAFT_KEY = 'hockey.draft.v1'

export function loadPlayers(): Player[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PLAYERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as any[]
    if (!Array.isArray(parsed)) return []

    // Migrate older shapes.
    return parsed
      .map((p) => {
        if (!p || typeof p !== 'object') return null
        if (typeof p.firstName === 'string' && typeof p.lastInitial === 'string') {
          return {
            id: String(p.id),
            firstName: p.firstName,
            lastInitial: String(p.lastInitial).slice(0, 1).toUpperCase(),
            canGoalie: !!p.canGoalie,
            activeToday: p.activeToday !== false
          } as Player
        }

        // Old: { id, name, isGoalie }
        const name = typeof p.name === 'string' ? p.name.trim() : ''
        const parts = name.split(/\s+/).filter(Boolean)
        const firstName = parts[0] ?? 'Spelare'
        const lastInitial = (parts[1]?.[0] ?? 'X').toUpperCase()
        return {
          id: String(p.id ?? ''),
          firstName,
          lastInitial,
          canGoalie: !!p.isGoalie,
          activeToday: true
        } as Player
      })
      .filter(Boolean) as Player[]
  } catch {
    return []
  }
}

export function savePlayers(players: Player[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players))
}

export function loadSessions(): Session[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Session[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSessions(sessions: Session[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export type Draft = {
  split: { teamA: string[]; teamB: string[] }
  goalies?: { A?: string; B?: string }
}

export function loadDraft(): Draft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Draft
    if (!parsed || !parsed.split) return null
    return parsed
  } catch {
    return null
  }
}

export function saveDraft(draft: Draft): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DRAFT_KEY)
}
