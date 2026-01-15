'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card } from '../components/ui'
import { loadPlayers, loadSessions, saveSessions, saveDraft } from '../lib/storage'
import type { Player, Session } from '../lib/types'

function label(p: Player) {
  return `${p.firstName} ${p.lastInitial}.`
}

export default function HistoryPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    setPlayers(loadPlayers())
    setSessions(loadSessions().slice().sort((a, b) => b.createdAt - a.createdAt))
  }, [])

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const byId = useMemo(() => {
    const m = new Map<string, Player>()
    for (const p of players) m.set(p.id, p)
    return m
  }, [players])

  function removeSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  function useSession(s: Session) {
    saveDraft({ split: s.split, goalies: s.goalies })
    window.location.href = '/training'
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Historik</div>
            <div className="mt-1 text-xs text-zinc-400">Sparade träningar (senaste först).</div>
          </div>
          <Badge>{sessions.length} sparade</Badge>
        </div>
      </Card>

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <Card className="p-4">
            <div className="text-sm text-zinc-400">Inga sparade träningar än. Gå till Träning och klicka “Spara”.</div>
          </Card>
        ) : (
          sessions.map((s) => {
            const teamA = s.split.teamA.map((id) => byId.get(id)).filter(Boolean) as Player[]
            const teamB = s.split.teamB.map((id) => byId.get(id)).filter(Boolean) as Player[]
            return (
              <Card key={s.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">{s.dateISO}</div>
                      {s.note ? <Badge>{s.note}</Badge> : null}
                      <Badge>{teamA.length + teamB.length} spelare</Badge>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      MV: {s.goalies?.A && byId.get(s.goalies.A) ? label(byId.get(s.goalies.A) as Player) : '—'} (Röd) •{' '}
                      {s.goalies?.B && byId.get(s.goalies.B) ? label(byId.get(s.goalies.B) as Player) : '—'} (Svart)
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => useSession(s)}>Använd igen</Button>
                    <Button variant="secondary" onClick={() => removeSession(s.id)}>
                      Ta bort
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-red-200">Lag Röd</div>
                    <div className="mt-2 text-sm text-zinc-200 space-y-1">
                      {teamA.map((p) => (
                        <div key={p.id}>• {label(p)}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-100">Lag Svart</div>
                    <div className="mt-2 text-sm text-zinc-200 space-y-1">
                      {teamB.map((p) => (
                        <div key={p.id}>• {label(p)}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
