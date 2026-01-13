'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, Checkbox, Input } from './components/ui'
import { loadPlayers, loadSessions, savePlayers, saveSessions } from './lib/storage'
import { LockState, Player, Session, TeamKey, TeamSplit } from './lib/types'
import { randomizeTeams, isSameSplit } from './lib/randomize'

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

type DragPayload = {
  id: string
  from: 'pool' | 'A' | 'B'
}

export default function Page() {
  const [players, setPlayers] = useState<Player[]>([])
  const [sessions, setSessions] = useState<Session[]>([])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [locks, setLocks] = useState<LockState>({})

  const [split, setSplit] = useState<TeamSplit>({ teamA: [], teamB: [] })
  const [lastSeed, setLastSeed] = useState<number | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const [newName, setNewName] = useState('')
  const [newIsGoalie, setNewIsGoalie] = useState(false)

  const [dateISO, setDateISO] = useState(todayISO())
  const [note, setNote] = useState('')

  const dragRef = useRef<DragPayload | null>(null)

  useEffect(() => {
    const p = loadPlayers()
    const s = loadSessions()
    setPlayers(p)
    setSessions(s)

    // Default: select everyone
    const initialSelected = new Set(p.map((x) => x.id))
    setSelectedIds(initialSelected)
  }, [])

  useEffect(() => {
    savePlayers(players)
  }, [players])

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const selectedPlayers = useMemo(() => {
    const s = selectedIds
    return players.filter((p) => s.has(p.id))
  }, [players, selectedIds])

  const goalieCountSelected = useMemo(() => selectedPlayers.filter((p) => p.isGoalie).length, [selectedPlayers])

  const avoidSplits = useMemo(() => sessions.slice(0, 2).map((x) => x.split), [sessions])

  const teamAPlayers = useMemo(() => split.teamA.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[], [split, players])
  const teamBPlayers = useMemo(() => split.teamB.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[], [split, players])

  const poolPlayers = useMemo(() => {
    const inTeams = new Set([...split.teamA, ...split.teamB])
    return selectedPlayers.filter((p) => !inTeams.has(p.id))
  }, [selectedPlayers, split])

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      // If we deselect someone who is in a team, remove them
      if (!next.has(id)) {
        setSplit((cur) => ({
          teamA: cur.teamA.filter((x) => x !== id),
          teamB: cur.teamB.filter((x) => x !== id)
        }))
        setLocks((cur) => {
          const { [id]: _, ...rest } = cur
          return rest
        })
      }
      return next
    })
  }

  function addPlayer() {
    const name = newName.trim()
    if (!name) return
    const p: Player = { id: uid('p'), name, isGoalie: newIsGoalie }
    setPlayers((prev) => [p, ...prev])
    setSelectedIds((prev) => new Set([p.id, ...Array.from(prev)]))
    setNewName('')
    setNewIsGoalie(false)
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setSplit((cur) => ({ teamA: cur.teamA.filter((x) => x !== id), teamB: cur.teamB.filter((x) => x !== id) }))
    setLocks((cur) => {
      const { [id]: _, ...rest } = cur
      return rest
    })
  }

  function updatePlayer(id: string, patch: Partial<Player>) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function setLock(id: string, to: TeamKey | null) {
    setLocks((prev) => ({ ...prev, [id]: to }))
  }

  function clearTeams() {
    setSplit({ teamA: [], teamB: [] })
    setLocks({})
    setWarnings([])
    setLastSeed(null)
  }

  function doRandomize() {
    if (selectedPlayers.length < 2) {
      setWarnings(['Välj minst 2 spelare.'])
      return
    }

    const res = randomizeTeams({
      selectedPlayerIds: Array.from(selectedIds),
      players,
      locks,
      avoidSplits
    })

    setSplit(res.split)
    setLastSeed(res.seed)
    setWarnings(res.warnings)
  }

  function movePlayer(id: string, to: 'pool' | TeamKey) {
    setSplit((cur) => {
      const nextA = cur.teamA.filter((x) => x !== id)
      const nextB = cur.teamB.filter((x) => x !== id)
      if (to === 'A') nextA.push(id)
      else if (to === 'B') nextB.push(id)
      return { teamA: nextA, teamB: nextB }
    })
    if (to === 'pool') {
      setLocks((cur) => {
        const { [id]: _, ...rest } = cur
        return rest
      })
    }
  }

  function onDragStart(e: React.DragEvent, payload: DragPayload) {
    dragRef.current = payload
    e.dataTransfer.setData('text/plain', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDrop(e: React.DragEvent, to: 'pool' | TeamKey) {
    e.preventDefault()
    const raw = e.dataTransfer.getData('text/plain')
    const payload: DragPayload | null = raw ? JSON.parse(raw) : dragRef.current
    if (!payload?.id) return
    movePlayer(payload.id, to)
  }

  function allowDrop(e: React.DragEvent) {
    e.preventDefault()
  }

  function splitSummaryText(s: TeamSplit) {
    const byId = new Map(players.map((p) => [p.id, p]))
    const fmt = (ids: string[]) =>
      ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((p) => `${p!.name}${p!.isGoalie ? ' (MV)' : ''}`)
        .join(', ')

    return `Lag Röd: ${fmt(s.teamA)}\nLag Blå: ${fmt(s.teamB)}`
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(splitSummaryText(split))
      setWarnings(['Kopierat till urklipp.'])
    } catch {
      setWarnings(['Kunde inte kopiera (webbläsaren blockerade). Markera och kopiera manuellt.'])
    }
  }

  function saveSession() {
    const all = [...split.teamA, ...split.teamB]
    if (all.length === 0) {
      setWarnings(['Inga lag att spara. Slumpa eller flytta in spelare först.'])
      return
    }

    const session: Session = {
      id: uid('s'),
      createdAt: Date.now(),
      dateISO,
      note: note.trim() || undefined,
      split: {
        teamA: [...split.teamA],
        teamB: [...split.teamB]
      }
    }

    setSessions((prev) => {
      // newest first; keep last 30 by default
      const next = [session, ...prev]
      return next.slice(0, 30)
    })

    setWarnings(['Sparat i historiken.'])
  }

  function loadSessionIntoTeams(s: Session) {
    // If players list has changed, keep only existing & selected
    const exists = new Set(players.map((p) => p.id))
    const selected = selectedIds
    const filterIds = (ids: string[]) => ids.filter((id) => exists.has(id) && selected.has(id))

    const nextSplit = { teamA: filterIds(s.split.teamA), teamB: filterIds(s.split.teamB) }
    setSplit(nextSplit)
    setWarnings([])
    setLastSeed(null)
  }

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  const similarityToLatest = useMemo(() => {
    if (!sessions[0]) return null
    const same = isSameSplit(split, sessions[0].split)
    return same
  }, [split, sessions])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Players */}
      <Card className="lg:col-span-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Spelare</h2>
            <p className="text-sm text-zinc-500">Hantera listan och markera målvakter.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{players.length} totalt</Badge>
            <Badge>{selectedPlayers.length} valda</Badge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Namn (t.ex. Leo P)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPlayer()
              }}
            />
            <Button onClick={addPlayer} className="shrink-0">Lägg till</Button>
          </div>
          <Checkbox label="Målvakt" checked={newIsGoalie} onChange={setNewIsGoalie} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setSelectedIds(new Set(players.map((p) => p.id)))}>
            Välj alla
          </Button>
          <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
            Välj inga
          </Button>
          <div className="text-xs text-zinc-500">Valda målvakter: {goalieCountSelected}</div>
        </div>

        <div className="mt-4 max-h-[50vh] overflow-auto rounded-2xl border">
          <ul className="divide-y">
            {players.map((p) => {
              const selected = selectedIds.has(p.id)
              const lock = locks[p.id] ?? null
              return (
                <li key={p.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelected(p.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="min-w-0">
                        <input
                          className="w-full bg-transparent text-sm font-medium outline-none"
                          value={p.name}
                          onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                        />
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <label className="text-xs text-zinc-600 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={p.isGoalie}
                              onChange={(e) => updatePlayer(p.id, { isGoalie: e.target.checked })}
                              className="h-3.5 w-3.5"
                            />
                            Målvakt
                          </label>
                          {lock && <Badge>Låst i Lag {lock === 'A' ? 'Röd' : 'Blå'}</Badge>}
                        </div>
                      </div>
                    </label>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        title="Lås i Lag Röd"
                        onClick={() => setLock(p.id, locks[p.id] === 'A' ? null : 'A')}
                        disabled={!selected}
                      >
                        Lås Röd
                      </Button>
                      <Button
                        variant="secondary"
                        title="Lås i Lag Blå"
                        onClick={() => setLock(p.id, locks[p.id] === 'B' ? null : 'B')}
                        disabled={!selected}
                      >
                        Lås Blå
                      </Button>
                      <Button variant="danger" onClick={() => removePlayer(p.id)} title="Ta bort spelare">
                        Ta bort
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </Card>

      {/* Middle: Controls + Pool */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <Card className="p-4">
          <h2 className="text-base font-semibold">Lagindelning</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={doRandomize}>Slumpa lag</Button>
            <Button variant="secondary" onClick={clearTeams}>Rensa lag</Button>
            <Button variant="secondary" onClick={copyToClipboard} disabled={split.teamA.length + split.teamB.length === 0}>
              Kopiera
            </Button>
          </div>
          <div className="mt-3 text-sm text-zinc-600">
            <div>
              Undviker identisk indelning mot de senaste <strong>2</strong> sparade träningarna (om möjligt).
            </div>
            {lastSeed !== null && <div className="text-xs text-zinc-500 mt-1">Seed: {lastSeed}</div>}
            {similarityToLatest !== null && (
              <div className="text-xs text-zinc-500 mt-1">Liknar senaste träningen: {similarityToLatest ? 'JA (identisk)' : 'nej'}</div>
            )}
          </div>

          {warnings.length > 0 && (
            <div className="mt-3 rounded-2xl border bg-zinc-50 p-3 text-sm">
              <ul className="list-disc pl-5">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="p-4" onDragOver={allowDrop} onDrop={(e) => onDrop(e, 'pool')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Spelare utanför lag</h3>
              <p className="text-xs text-zinc-500">Dra spelare hit för att plocka ur ett lag.</p>
            </div>
            <Badge>{poolPlayers.length}</Badge>
          </div>

          <ul className="mt-3 grid grid-cols-1 gap-2">
            {poolPlayers.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border bg-white p-3 text-sm flex items-center justify-between"
                draggable
                onDragStart={(e) => onDragStart(e, { id: p.id, from: 'pool' })}
              >
                <span className="truncate">
                  {p.name} {p.isGoalie ? <span className="text-xs text-zinc-500">(MV)</span> : null}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => movePlayer(p.id, 'A')}>Till Röd</Button>
                  <Button variant="secondary" onClick={() => movePlayer(p.id, 'B')}>Till Blå</Button>
                </div>
              </li>
            ))}
            {poolPlayers.length === 0 && (
              <li className="text-sm text-zinc-500">Alla valda spelare ligger redan i lag.</li>
            )}
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold">Spara träning (historik)</h3>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anteckning (valfritt)" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={saveSession} disabled={split.teamA.length + split.teamB.length === 0}>Spara</Button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Historiken sparas lokalt i webbläsaren (förberedd för backend senare).</p>
        </Card>
      </div>

      {/* Right: Teams + History */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <TeamColumn
          title="Lag Röd"
          teamKey="A"
          players={teamAPlayers}
          onDragOver={allowDrop}
          onDrop={onDrop}
          onDragStart={onDragStart}
          onMove={movePlayer}
        />
        <TeamColumn
          title="Lag Blå"
          teamKey="B"
          players={teamBPlayers}
          onDragOver={allowDrop}
          onDrop={onDrop}
          onDragStart={onDragStart}
          onMove={movePlayer}
        />

        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Historik</h3>
              <p className="text-xs text-zinc-500">Senaste sparade träningar.</p>
            </div>
            <Badge>{sessions.length}</Badge>
          </div>

          <div className="mt-3 max-h-[34vh] overflow-auto rounded-2xl border">
            <ul className="divide-y">
              {sessions.map((s) => (
                <li key={s.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{s.dateISO}</div>
                      {s.note && <div className="text-xs text-zinc-500 truncate">{s.note}</div>}
                      <div className="mt-1 text-xs text-zinc-500">
                        Röd: {s.split.teamA.length} • Blå: {s.split.teamB.length}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="secondary" onClick={() => loadSessionIntoTeams(s)}>Använd</Button>
                      <Button variant="danger" onClick={() => deleteSession(s.id)}>Ta bort</Button>
                    </div>
                  </div>
                </li>
              ))}
              {sessions.length === 0 && <li className="p-3 text-sm text-zinc-500">Ingen historik än. Spara en träning så hamnar den här.</li>}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}

function TeamColumn({
  title,
  teamKey,
  players,
  onDragOver,
  onDrop,
  onDragStart,
  onMove
}: {
  title: string
  teamKey: TeamKey
  players: Player[]
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, to: 'pool' | TeamKey) => void
  onDragStart: (e: React.DragEvent, payload: { id: string; from: 'pool' | 'A' | 'B' }) => void
  onMove: (id: string, to: 'pool' | TeamKey) => void
}) {
  const goalieCount = players.filter((p) => p.isGoalie).length
  return (
    <Card className="p-4" onDragOver={onDragOver} onDrop={(e) => onDrop(e, teamKey)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-zinc-500">Dra spelare hit för att lägga i laget.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{players.length}</Badge>
          <Badge>MV: {goalieCount}</Badge>
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border bg-white p-3 text-sm flex items-center justify-between"
            draggable
            onDragStart={(e) => onDragStart(e, { id: p.id, from: teamKey })}
          >
            <span className="truncate">
              {p.name} {p.isGoalie ? <span className="text-xs text-zinc-500">(MV)</span> : null}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onMove(p.id, teamKey === 'A' ? 'B' : 'A')}>
                Flytta
              </Button>
              <Button variant="secondary" onClick={() => onMove(p.id, 'pool')}>Ut</Button>
            </div>
          </li>
        ))}
        {players.length === 0 && <li className="text-sm text-zinc-500">Tomt lag. Dra in spelare eller slumpa.</li>}
      </ul>
    </Card>
  )
}
