import { Player, Session } from './types'

const PLAYERS_KEY = 'hockey.players.v1'
const SESSIONS_KEY = 'hockey.sessions.v1'

export function loadPlayers(): Player[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PLAYERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Player[]
    return Array.isArray(parsed) ? parsed : []
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
