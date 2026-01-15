'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, Checkbox, Input } from '../components/ui'
import { computeGoalieStats } from '../lib/goalies'
import { loadDraft, loadPlayers, loadSessions, savePlayers, saveSessions, clearDraft } from '../lib/storage'
import type { LockState, Player, Session, TeamKey, TeamSplit } from '../lib/types'
import { randomizeTeams } from '../lib/randomize'
import { textExport, todayISO, uid } from '../lib/utils'

type DragPayload = { id: string; from: 'pool' | 'A' | 'B' }

function nameOf(p: Player) {
  return `${p.firstName} ${p.lastInitial}.`
}

export default function TrainingPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [sessions, setSessions] = useState<Session[]>([])

  const [locks, setLocks] = useState<LockState>({})
  const [split, setSplit] = useState<TeamSplit>({ teamA: [], teamB: [] })
  const [goalies, setGoalies] = useState<{ A?: string; B?: string }>({})
  const [warnings, setWarnings] = useState<string[]>([])

  const [dateISO, setDateISO] = useState(todayISO())
  const [note, setNote] = useState('')

  const dragRef = useRef<DragPayload | null>(null)

  useEffect(() => {
    const p = loadPlayers()
    const s = loadSessions().slice().sort((a, b) => b.createdAt - a.createdAt)
    setPlayers(p)
    setSessions(s)

    const draft = loadDraft()
    if (draft?.split) {
      setSplit(draft.split)
      setGoalies(draft.goalies ?? {})
      clearDraft()
    }
  }, [])

  useEffect(() => {
    savePlayers(players)
  }, [players])

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const selectedPlayers = useMemo(() => players.filter((p) => p.activeToday), [players])
  const selectedIds = useMemo(() => selectedPlayers.map((p) => p.id), [selectedPlayers])

  const goalieStats = useMemo(() => computeGoalieStats(players, sessions), [players, sessions])
  const avoidSplits = useMemo(() => sessions.slice(0, 2).map((x) => x.split), [sessions])

  const byId = useMemo(() => {
    const m = new Map<string, Player>()
    for (const p of players) m.set(p.id, p)
    return m
  }, [players])

  const teamAPlayers = useMemo(
    () => split.teamA.map((id) => byId.get(id)).filter(Boolean) as Player[],
    [split, byId]
  )
  const teamBPlayers = useMemo(
    () => split.teamB.map((id) => byId.get(id)).filter(Boolean) as Player[],
    [split, byId]
  )
  const poolPlayers = useMemo(() => {
    const inTeams = new Set([...split.teamA, ...split.teamB])
    return selectedPlayers.filter((p) => !inTeams.has(p.id))
  }, [selectedPlayers, split])

  function setActiveToday(id: string, v: boolean) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, activeToday: v } : p))
    )
    if (!v) {
      setSplit((cur) => ({
        teamA: cur.teamA.filter((x) => x !== id),
        teamB: cur.teamB.filter((x) => x !== id)
      }))
      setLocks((cur) => {
        const { [id]: _, ...rest } = cur
        return rest
      })
      setGoalies((cur) => {
        const next = { ...cur }
        if (next.A === id) delete next.A
        if (next.B === id) delete next.B
        return next
      })
    }
  }

  function randomize() {
    if (selectedIds.length < 2) {
      setWarnings(['Välj minst två spelare (Med idag) för att kunna slumpa.'])
      return
    }
    const res = randomizeTeams({
      selectedPlayerIds: selectedIds,
      players,
      locks,
      avoidSplits,
      goalieStats
    })
    setSplit(res.split)
    setGoalies(res.goalies)
    setWarnings(res.warnings)
  }

  function clearTeams() {
    setSplit({ teamA: [], teamB: [] })
    setGoalies({})
    setWarnings([])
    setLocks({})
  }

  async function copyTeams() {
    const A = teamAPlayers.map(nameOf)
    const B = teamBPlayers.map(nameOf)
    const text = textExport({ teamAName: 'Lag Röd', teamBName: 'Lag Svart', teamA: A, teamB: B })
    try {
      await navigator.clipboard.writeText(text)
      setWarnings(['Kopierat till urklipp.'])
    } catch {
      setWarnings(['Kunde inte kopiera (blockerat av webbläsaren?).'])
    }
  }

  function saveTraining() {
    if (split.teamA.length === 0 && split.teamB.length === 0) {
      setWarnings(['Det finns inga lag att spara än.'])
      return
    }
    const s: Session = {
      id: uid('sess'),
      createdAt: Date.now(),
      dateISO,
      note: note.trim() || undefined,
      split,
      goalies
    }
    setSessions((prev) => [s, ...prev].slice(0, 40))
    setWarnings(['Träningen sparades i historiken.'])
  }

  function onDragStart(id: string, from: DragPayload['from']) {
    dragRef.current = { id, from }
  }

  function onDrop(e: React.DragEvent, to: DragPayload['from']) {
    e.preventDefault()
    const payload = dragRef.current
    if (!payload) return
    const { id, from } = payload
    dragRef.current = null
    if (from === to) return

    setSplit((cur) => {
      const nextA = cur.teamA.filter((x) => x !== id)
      const nextB = cur.teamB.filter((x) => x !== id)
      if (to === 'A') nextA.push(id)
      if (to === 'B') nextB.push(id)
      return { teamA: nextA, teamB: nextB }
    })

    // Moving implies intended assignment; set lock when moved into a team.
    if (to === 'A' || to === 'B') {
      setLocks((cur) => ({ ...cur, [id]: to }))
    } else {
      setLocks((cur) => ({ ...cur, [id]: null }))
    }
  }

  function allowDrop(e: React.DragEvent) {
    e.preventDefault()
  }

  function toggleLock(id: string, team: TeamKey) {
    setLocks((cur) => ({ ...cur, [id]: cur[id] === team ? null : team }))
  }

  const selectedGoalieCount = useMemo(
    () => selectedPlayers.filter((p) => p.canGoalie).length,
    [selectedPlayers]
  )

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold">Träning</div>
              <Badge>{selectedPlayers.length} med idag</Badge>
              <Badge>{selectedGoalieCount} målvaktskandidater</Badge>
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              Slumpen väljer målvakter rättvist (minst gånger + längst senast) och delar sedan lagen.
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <Button onClick={randomize}>Slumpa lag</Button>
            <Button variant="secondary" onClick={copyTeams}>Kopiera</Button>
            <Button variant="secondary" onClick={saveTraining}>Spara</Button>
            <Button variant="secondary" onClick={clearTeams}>Rensa</Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="text-xs text-zinc-400">Datum</label>
            <Input value={dateISO} onChange={(e) => setDateISO(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-400">Anteckning (valfritt)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="t.ex. fokus: passningar" />
          </div>
        </div>

        {warnings.length > 0 ? (
          <div className="mt-4 space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
                {w}
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4" onDragOver={allowDrop} onDrop={(e) => onDrop(e, 'A')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-red-200">Lag Röd</h2>
              <div className="text-xs text-zinc-400">{teamAPlayers.length} spelare</div>
            </div>
            {goalies.A ? (
              <Badge>MV: {byId.get(goalies.A)?.firstName ?? '—'}</Badge>
            ) : (
              <Badge>MV: —</Badge>
            )}
          </div>

          <TeamList
            team="A"
            players={teamAPlayers}
            locks={locks}
            onDragStart={onDragStart}
            onToggleLock={toggleLock}
            goalieId={goalies.A}
          />
        </Card>

        <Card className="p-4" onDragOver={allowDrop} onDrop={(e) => onDrop(e, 'B')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Lag Svart</h2>
              <div className="text-xs text-zinc-400">{teamBPlayers.length} spelare</div>
            </div>
            {goalies.B ? (
              <Badge>MV: {byId.get(goalies.B)?.firstName ?? '—'}</Badge>
            ) : (
              <Badge>MV: —</Badge>
            )}
          </div>

          <TeamList
            team="B"
            players={teamBPlayers}
            locks={locks}
            onDragStart={onDragStart}
            onToggleLock={toggleLock}
            goalieId={goalies.B}
          />
        </Card>

        <Card className="p-4" onDragOver={allowDrop} onDrop={(e) => onDrop(e, 'pool')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Utanför lag</h2>
              <div className="text-xs text-zinc-400">{poolPlayers.length} spelare</div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {poolPlayers.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-400">
                Inga spelare utanför lagen.
              </div>
            ) : (
              poolPlayers.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => onDragStart(p.id, 'pool')}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                >
                  <span className="truncate">{nameOf(p)}</span>
                  <span className="flex items-center gap-2">
                    {p.canGoalie ? <Badge>MV-kand</Badge> : null}
                  </span>
                </div>
              ))
            )}
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer select-none text-sm text-zinc-200">Dagens spelare</summary>
            <div className="mt-3 space-y-2">
              {players
                .slice()
                .sort((a, b) => (a.firstName + a.lastInitial).localeCompare(b.firstName + b.lastInitial, 'sv'))
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{nameOf(p)}</div>
                      <div className="text-xs text-zinc-500">
                        {p.canGoalie ? 'Målvaktskandidat' : 'Utespelare'}
                      </div>
                    </div>
                    <Checkbox label="Med" checked={p.activeToday} onChange={(v) => setActiveToday(p.id, v)} />
                  </div>
                ))}
            </div>
          </details>
        </Card>
      </div>
    </div>
  )
}

function TeamList({
  team,
  players,
  locks,
  onDragStart,
  onToggleLock,
  goalieId
}: {
  team: TeamKey
  players: Player[]
  locks: LockState
  onDragStart: (id: string, from: 'A' | 'B') => void
  onToggleLock: (id: string, team: TeamKey) => void
  goalieId?: string
}) {
  return (
    <div className="mt-3 space-y-2">
      {players.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-400">
          Dra spelare hit eller klicka “Slumpa lag”.
        </div>
      ) : (
        players.map((p) => {
          const locked = locks[p.id] === team
          const isGoalieToday = goalieId === p.id
          return (
            <div
              key={p.id}
              draggable
              onDragStart={() => onDragStart(p.id, team)}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              <div className="min-w-0 truncate">{nameOf(p)}</div>
              <div className="flex items-center gap-2">
                {isGoalieToday ? <Badge>MV</Badge> : null}
                <button
                  type="button"
                  onClick={() => onToggleLock(p.id, team)}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-200 hover:bg-black/30"
                  title={locked ? 'Låst i laget' : 'Lås i laget'}
                >
                  {locked ? '🔒' : '🔓'}
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
