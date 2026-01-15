'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Checkbox, Input } from '../components/ui'
import { computeGoalieStats } from '../lib/goalies'
import { loadPlayers, loadSessions, savePlayers } from '../lib/storage'
import type { Player } from '../lib/types'
import { uid } from '../lib/utils'

function label(p: Player) {
  return `${p.firstName} ${p.lastInitial}.`
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [sessions, setSessions] = useState(loadSessions())

  const [firstName, setFirstName] = useState('')
  const [lastInitial, setLastInitial] = useState('')
  const [canGoalie, setCanGoalie] = useState(false)

  useEffect(() => {
    const p = loadPlayers()
    setPlayers(p)
  }, [])

  useEffect(() => {
    savePlayers(players)
  }, [players])

  const goalieStats = useMemo(() => computeGoalieStats(players, sessions), [players, sessions])

  function addPlayer() {
    const fn = firstName.trim()
    const li = lastInitial.trim().slice(0, 1).toUpperCase()
    if (!fn || !li) return
    const p: Player = {
      id: uid('p'),
      firstName: fn,
      lastInitial: li,
      canGoalie,
      activeToday: true
    }
    setPlayers((prev) => [p, ...prev])
    setFirstName('')
    setLastInitial('')
    setCanGoalie(false)
  }

  function updatePlayer(id: string, patch: Partial<Player>) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  const sorted = useMemo(
    () =>
      players
        .slice()
        .sort((a, b) => (a.firstName + a.lastInitial).localeCompare(b.firstName + b.lastInitial, 'sv')),
    [players]
  )

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="text-base font-semibold">Spelare</div>
            <div className="mt-1 text-xs text-zinc-400">Hantera truppen och vilka som vill stå i mål.</div>
          </div>
          <div className="text-xs text-zinc-400">Tips: Ni kan styra dagens urval på Träning-sidan.</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-zinc-400">Förnamn</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="t.ex. Albin" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Efternamn (1 bokstav)</label>
            <Input value={lastInitial} onChange={(e) => setLastInitial(e.target.value)} placeholder="t.ex. S" />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <Checkbox label="Kan stå" checked={canGoalie} onChange={setCanGoalie} />
            <Button onClick={addPlayer}>Lägg till</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Trupp ({players.length})</div>
          <Badge>MV-statistik räknas från historik</Badge>
        </div>

        <div className="mt-4 divide-y divide-white/10">
          {sorted.length === 0 ? (
            <div className="py-6 text-sm text-zinc-400">Inga spelare än. Lägg till ovan.</div>
          ) : (
            sorted.map((p) => {
              const st = goalieStats[p.id] ?? { count: 0, lastDateISO: null }
              return (
                <div key={p.id} className="py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-medium">{label(p)}</div>
                      {p.canGoalie ? <Badge>MV-kandidat</Badge> : <Badge>Utespelare</Badge>}
                      {!p.activeToday ? <Badge>Ej med idag</Badge> : null}
                    </div>
                    {p.canGoalie ? (
                      <div className="mt-1 text-xs text-zinc-400">
                        Stått: {st.count} • Senast: {st.lastDateISO ?? 'aldrig'}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-zinc-500">&nbsp;</div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 justify-start sm:justify-end">
                    <Checkbox label="Med idag" checked={p.activeToday} onChange={(v) => updatePlayer(p.id, { activeToday: v })} />
                    <Checkbox label="Kan stå" checked={p.canGoalie} onChange={(v) => updatePlayer(p.id, { canGoalie: v })} />
                    <Button variant="danger" onClick={() => removePlayer(p.id)}>
                      Ta bort
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
