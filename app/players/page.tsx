"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button, Input, Toggle } from "../../components/ui";
import type { Player, TrainingSession } from "../../lib/types";
import { loadPlayers, loadSessions, savePlayers } from "../../lib/storage";
import { computeGoalieStats, displayName } from "../../lib/utils";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastInitial, setLastInitial] = useState("");
  const [canGoalie, setCanGoalie] = useState(false);

  useEffect(() => {
    const p = loadPlayers();
    const s = loadSessions();
    setPlayers(p);
    setSessions(s);
  }, []);

  useEffect(() => {
    savePlayers(players);
  }, [players]);

  const sorted = useMemo(() => {
    return players
      .slice()
      .sort((a, b) => (a.firstName + a.lastInitial).localeCompare(b.firstName + b.lastInitial, "sv"));
  }, [players]);

  function addPlayer() {
    const f = firstName.trim();
    const l = lastInitial.trim().toUpperCase();
    if (!f) return;
    if (!l || l.length !== 1) return;

    const p: Player = {
      id: crypto.randomUUID(),
      firstName: f,
      lastInitial: l,
      canGoalie,
      availableToday: true
    };

    setPlayers((prev) => [...prev, p]);
    setFirstName("");
    setLastInitial("");
    setCanGoalie(false);
  }

  function update(id: string, patch: Partial<Player>) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function remove(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold">Spelare</h1>
            <p className="text-sm text-slate-400">
              Hantera truppen och markera vilka som kan stå i mål. Målvaktsstatistik beräknas från historiken.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            Totalt: {players.length}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Input placeholder="Förnamn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input
            placeholder="Efternamn (1 bokstav)"
            value={lastInitial}
            onChange={(e) => setLastInitial(e.target.value)}
            maxLength={1}
          />
          <div className="sm:col-span-1">
            <Toggle
              checked={canGoalie}
              onChange={setCanGoalie}
              label="Kan stå"
              sublabel="Vill/kan vara målvakt"
            />
          </div>
          <div className="flex items-stretch">
            <Button className="w-full" onClick={addPlayer}>
              Lägg till
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-slate-400">
              Inga spelare ännu. Lägg till första spelaren ovan.
            </div>
          ) : (
            sorted.map((p) => {
              const st = computeGoalieStats(sessions, p.id);
              return (
                <Card key={p.id} className="p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold truncate">{displayName(p)}</div>
                        {p.canGoalie ? (
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-slate-200">
                            Kan stå
                          </span>
                        ) : null}
                        {!p.availableToday ? (
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-slate-400">
                            Ej idag
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-400">
                        Målvakt: {st.count} gånger {st.lastISO ? `• senast ${st.lastISO}` : "• aldrig"}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center">
                      <Toggle
                        checked={p.availableToday}
                        onChange={(v) => update(p.id, { availableToday: v })}
                        label="Med idag"
                        sublabel="Påverkar slumpen"
                      />
                      <Toggle
                        checked={p.canGoalie}
                        onChange={(v) => update(p.id, { canGoalie: v })}
                        label="Kan stå"
                        sublabel="Målvaktslista"
                      />
                      <Button variant="danger" onClick={() => remove(p.id)}>
                        Ta bort
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Tips</h2>
        <div className="mt-2 space-y-2 text-sm text-slate-400">
          <p>
            Markera <b>Kan stå</b> bara för de barn som vill/kan stå i mål. Rotation väljer sedan rättvist ut målvakter
            baserat på historik.
          </p>
          <p>
            “Med idag” är en snabb toggle för dagar då någon är borta – utan att du behöver ta bort spelaren ur listan.
          </p>
        </div>
      </Card>
    </div>
  );
}
