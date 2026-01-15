"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, Button } from "../../components/ui";
import type { Player, TrainingSession } from "../../lib/types";
import { deleteSession, loadPlayers, loadSessions, saveDraft } from "../../lib/storage";
import { displayName } from "../../lib/utils";

export default function HistoryPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  useEffect(() => {
    setPlayers(loadPlayers());
    setSessions(loadSessions());
  }, []);

  const idToPlayer = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  function name(id: string) {
    const p = idToPlayer.get(id);
    return p ? displayName(p) : "Okänd";
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold">Historik</h1>
            <p className="text-sm text-slate-400">Sparade träningar. Du kan visa eller återanvända en tidigare indelning.</p>
          </div>
          <Link
            href="/training"
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
          >
            Till Träning
          </Link>
        </div>
      </Card>

      {sessions.length === 0 ? (
        <Card className="p-4">
          <div className="text-sm text-slate-400">Ingen historik ännu. Gå till Träning och klicka “Spara”.</div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">{s.dateISO}</div>
                  {s.note ? <div className="text-sm text-slate-400">{s.note}</div> : null}
                  <div className="mt-2 text-xs text-slate-400">
                    MV Röd: {s.split.goalieRedId ? name(s.split.goalieRedId) : "—"} • MV Svart:{" "}
                    {s.split.goalieBlackId ? name(s.split.goalieBlackId) : "—"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      saveDraft(s.split);
                      window.location.href = "/training";
                    }}
                  >
                    Använd igen
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      const next = deleteSession(s.id);
                      setSessions(next);
                    }}
                  >
                    Ta bort
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-semibold text-red-200/90">Lag Röd</div>
                  <div className="grid gap-1 text-sm text-slate-300">
                    {s.split.red.map((id) => (
                      <div key={id}>{name(id)}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-200">Lag Svart</div>
                  <div className="grid gap-1 text-sm text-slate-300">
                    {s.split.black.map((id) => (
                      <div key={id}>{name(id)}</div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
