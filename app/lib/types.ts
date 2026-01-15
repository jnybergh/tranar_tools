export type Player = {
  id: string
  firstName: string
  lastInitial: string // 1 bokstav
  canGoalie: boolean
  activeToday: boolean
}

export type TeamKey = 'A' | 'B'

export type LockState = Record<string, TeamKey | null>

export type TeamSplit = {
  teamA: string[]
  teamB: string[]
}

export type Session = {
  id: string
  createdAt: number // epoch ms
  dateISO: string   // YYYY-MM-DD
  note?: string
  split: TeamSplit
  goalies?: {
    A?: string
    B?: string
  }
}

export type GoalieStats = {
  count: number
  lastDateISO: string | null
}

