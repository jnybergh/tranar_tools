export type Player = {
  id: string
  name: string
  isGoalie: boolean
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
}
