"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Toggle, Input } from "../../components/ui";
import type { Player, Split, TrainingSession } from "../../lib/types";
import { loadPlayers, savePlayers, loadSessions, saveSession, loadDraft, saveDraft, clearDraft } from "../../lib/storage";
import { computeGoalieStats, displayName, getTodayISO } from "../../lib/utils";
import { buildSplit, formatClipboard } from "../../lib/team";

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export default function TrainingPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  const [split, setSplit] = useState<Split>({ red: [], black: [] });
  const [previousSplit, setPreviousSplit] = useState<Split | null>(null);

  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string>("");
  const statusTimer = useRef<number | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const p = loadPlayers();
    const s = loadSessions();
    setPlayers(p);
    setSessions(s);

    const draft = loadDraft();
    if (draft) setSplit(draft);
  }, []);

  useEffect(() => {
    saveDraft(split);
  }, [split]);

  useEffect(() => {
    // Persist roster changes (availableToday toggles etc.)
    if (players.length) savePlayers(players);
  }, [players]);

  const idToPlayer = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const availablePlayers = useMemo(() => players.filter((p) => p.availableToday), [players]);
  const availableIds = useMemo(() => new Set(availablePlayers.map((p) => p.id)), [availablePlayers]);

  const goalieCandidates = useMemo(
    () => availablePlayers.filter((p) => p.canGoalie),
    [availablePlayers]
  );

  const goalieStats = useMemo(() => {
    const m = new Map<string, { count: number; lastISO?: string }>();
    for (const p of players) m.set(p.id, computeGoalieStats(sessions, p.id));
    return m;
  }, [players, sessions]);

  function flash(msg: string) {
    setStatus(msg);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(""), 2500);
  }

  function setAllAvailable(next: boolean) {
    setPlayers((prev) => prev.map((p) => ({ ...p, availableToday: next })));
  }

  function toggleAvailable(id: string, next: boolean) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, availableToday: next } : p)));
    // If they were in current split, remove them to keep things consistent.
    if (!next) {
      setSplit((prev) => ({
        ...prev,
        red: prev.red.filter((x) => x !== id),
        black: prev.black.filter((x) => x !== id),
        goalieRedId: prev.goalieRedId === id ? undefined : prev.goalieRedId,
        goalieBlackId: prev.goalieBlackId === id ? undefined : prev.goalieBlackId
      }));
    }
  }

  function createTeams() {
    if (availablePlayers.length < 2) return flash("Välj minst 2 spelare som är med idag.");
    setPreviousSplit(split);

    const { split: next, warning } = buildSplit({
      players,
      sessions,
      current: { red: [], black: [] },
      locked: {}
    });

    setSplit(next);
    if (warning) flash(warning);
    else flash("Lag skapade.");
  }

  function undo() {
    if (!previousSplit) return;
    setSplit(previousSplit);
    setPreviousSplit(null);
    flash("Ångrat senaste generering.");
  }

  function clear() {
    setPreviousSplit(split);
    setSplit({ red: [], black: [] });
    clearDraft();
    flash("Rensat.");
  }

  function moveBetweenTeams(playerId: string) {
    setSplit((prev) => {
      const inRed = prev.red.includes(playerId);
      const inBlack = prev.black.includes(playerId);
      const next: Split = { ...prev, red: prev.red.slice(), black: prev.black.slice() };

      if (inRed) {
        next.red = next.red.filter((x) => x !== playerId);
        next.black = uniq([...next.black, playerId]);
      } else if (inBlack) {
        next.black = next.black.filter((x) => x !== playerId);
        next.red = uniq([...next.red, playerId]);
      } else {
        // Not in any team: put into the smaller one.
        if (next.red.length <= next.black.length) next.red = uniq([...next.red, playerId]);
        else next.black = uniq([...next.black, playerId]);
      }

      // Keep goalie assignments if they exist; ensure goalies still belong to a team.
      if (next.goalieRedId && !next.red.includes(next.goalieRedId)) {
        next.red = uniq([...next.red, next.goalieRedId]);
        next.black = next.black.filter((x) => x !== next.goalieRedId);
      }
      if (next.goalieBlackId && !next.black.includes(next.goalieBlackId)) {
        next.black = uniq([...next.black, next.goalieBlackId]);
        next.red = next.red.filter((x) => x !== next.goalieBlackId);
      }

      return next;
    });
  }

  function ensureInTeam(team: "red" | "black", playerId: string) {
    setSplit((prev) => {
      const next: Split = { ...prev, red: prev.red.slice(), black: prev.black.slice() };
      if (team === "red") {
        next.red = uniq([...next.red, playerId]);
        next.black = next.black.filter((x) => x !== playerId);
        next.goalieRedId = playerId;
      } else {
        next.black = uniq([...next.black, playerId]);
        next.red = next.red.filter((x) => x !== playerId);
        next.goalieBlackId = playerId;
      }
      return next;
    });
  }

  function repickGoalies() {
    // Re-run buildSplit but try to keep current skater allocation to reduce churn:
    // we pass current split, locked empty. buildSplit will pick fair goalies and balance.
    setPreviousSplit(split);
    const { split: next, warning } = buildSplit({
      players,
      sessions,
      current: { red: split.red, black: split.black, goalieRedId: split.goalieRedId, goalieBlackId: split.goalieBlackId },
      locked: {}
    });
    setSplit(next);
    if (warning) flash(warning);
    else flash("Målvakter valda på nytt.");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatClipboard({ split, idToPlayer }));
      flash("Kopierat till urklipp.");
    } catch {
      flash("Kunde inte kopiera (blockerat av webbläsaren?).");
    }
  }

  function save() {
    if (!split.red.length && !split.black.length) return flash("Skapa lag först.");
    const session: TrainingSession = {
      id: crypto.randomUUID(),
      dateISO: getTodayISO(),
      note: note.trim() || undefined,
      split
    };
    const next = saveSession(session);
    setSessions(next);
    setNote("");
    flash("Träning sparad.");
  }

  const selectedCount = availablePlayers.length;

  const goalieRed = split.goalieRedId ? idToPlayer.get(split.goalieRedId) : undefined;
  const goalieBlack = split.goalieBlackId ? idToPlayer.get(split.goalieBlackId) : undefined;

  const goalieInfo = (p?: Player) => {
    if (!p) return "Ingen vald";
    const s = goalieStats.get(p.id);
    const count = s?.count ?? 0;
    const last = s?.lastISO ? `senast ${s.lastISO}` : "aldrig tidigare";
    return `${count} ggr • ${last}`;
  };

  const poolIds = useMemo(() => {
    const inTeams = new Set([...split.red, ...split.black]);
    return availablePlayers.map((p) => p.id).filter((id) => !inTeams.has(id));
  }, [availablePlayers, split.red, split.black]);

  const hasTeams = split.red.length + split.black.length > 0;

  return (
    <div className="grid gap-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-base font-semibold">1) Välj vilka som är med idag</div>
            <div className="mt-1 text-sm text-slate-400">
              Markera spelare som är på träningen. Målvakter väljs automatiskt bland “Kan stå”.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAllAvailable(true)}>
              Alla
            </Button>
            <Button variant="secondary" onClick={() => setAllAvailable(false)}>
              Rensa
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {players
            .slice()
            .sort((a, b) => (a.firstName + a.lastInitial).localeCompare(b.firstName + b.lastInitial, "sv"))
            .map((p) => (
              <Toggle
                key={p.id}
                checked={p.availableToday}
                onChange={(next) => toggleAvailable(p.id, next)}
                label={displayName(p)}
                sublabel={p.canGoalie ? "Kan stå i mål" : "—"}
              />
            ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-300">
            Valda idag: <span className="font-semibold">{selectedCount}</span> • Målvaktskandidater:{" "}
            <span className="font-semibold">{goalieCandidates.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={createTeams}>Skapa lag</Button>
            <Button variant="secondary" onClick={undo} disabled={!previousSplit}>
              Ångra
            </Button>
            <Button variant="secondary" onClick={clear}>
              Rensa lag
            </Button>
          </div>
        </div>

        {status ? <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">{status}</div> : null}
      </Card>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-base font-semibold">2) Resultat</div>
            <div className="mt-1 text-sm text-slate-400">När du är nöjd: kopiera och/eller spara träningen.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copy} disabled={!hasTeams}>
              Kopiera
            </Button>
            <Button onClick={save} disabled={!hasTeams}>
              Spara träning
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Lag Röd</div>
                <div className="text-xs text-slate-300/80">{split.red.length} spelare</div>
              </div>
              <div className="text-right text-xs text-slate-300/80">
                <div className="font-semibold">MV</div>
                <div>{goalieRed ? displayName(goalieRed) : "—"}</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {split.red.length === 0 ? (
                <div className="text-sm text-slate-300/80">Inget lag ännu.</div>
              ) : (
                split.red.map((id) => {
                  const p = idToPlayer.get(id);
                  if (!p) return null;
                  const isMV = id === split.goalieRedId;
                  return (
                    <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {displayName(p)} {isMV ? <span className="ml-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px]">MV</span> : null}
                        </div>
                      </div>
                      <Button variant="secondary" className="shrink-0 px-3 py-2 text-xs" onClick={() => moveBetweenTeams(id)}>
                        Flytta
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Lag Svart</div>
                <div className="text-xs text-slate-300/80">{split.black.length} spelare</div>
              </div>
              <div className="text-right text-xs text-slate-300/80">
                <div className="font-semibold">MV</div>
                <div>{goalieBlack ? displayName(goalieBlack) : "—"}</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {split.black.length === 0 ? (
                <div className="text-sm text-slate-300/80">Inget lag ännu.</div>
              ) : (
                split.black.map((id) => {
                  const p = idToPlayer.get(id);
                  if (!p) return null;
                  const isMV = id === split.goalieBlackId;
                  return (
                    <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {displayName(p)} {isMV ? <span className="ml-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px]">MV</span> : null}
                        </div>
                      </div>
                      <Button variant="secondary" className="shrink-0 px-3 py-2 text-xs" onClick={() => moveBetweenTeams(id)}>
                        Flytta
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-sm font-semibold">Målvakter idag</div>
            <div className="mt-2 grid gap-2 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-300">MV Röd</span>
                <span className="font-medium">{goalieRed ? displayName(goalieRed) : "—"}</span>
              </div>
              <div className="text-xs text-slate-400">{goalieInfo(goalieRed)}</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-slate-300">MV Svart</span>
                <span className="font-medium">{goalieBlack ? displayName(goalieBlack) : "—"}</span>
              </div>
              <div className="text-xs text-slate-400">{goalieInfo(goalieBlack)}</div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={repickGoalies} disabled={!hasTeams}>
                Välj om målvakter
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-sm font-semibold">Anteckning</div>
            <div className="mt-2">
              <Input
                placeholder="Valfritt, t.ex. fokus: passningar"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="text-sm text-slate-300 underline decoration-white/20 hover:text-white"
            onClick={() => setShowAdvanced((x) => !x)}
          >
            {showAdvanced ? "Dölj avancerat" : "Visa avancerat"}
          </button>

          {showAdvanced ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Card className="p-3">
                <div className="text-sm font-semibold">Byt målvakt (manuellt)</div>
                <div className="mt-2 text-xs text-slate-400">
                  Listan visar bara spelare som är med idag och markerade som “Kan stå”.
                </div>

                <div className="mt-3 grid gap-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-slate-300">MV Röd</span>
                    <select
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                      value={split.goalieRedId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        ensureInTeam("red", id);
                      }}
                      disabled={!hasTeams}
                    >
                      <option value="" disabled>
                        Välj…
                      </option>
                      {goalieCandidates
                        .slice()
                        .sort((a, b) => {
                          const sa = goalieStats.get(a.id);
                          const sb = goalieStats.get(b.id);
                          const ca = sa?.count ?? 0;
                          const cb = sb?.count ?? 0;
                          if (ca !== cb) return ca - cb;
                          const la = sa?.lastISO ?? "";
                          const lb = sb?.lastISO ?? "";
                          return la.localeCompare(lb);
                        })
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {displayName(p)}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs text-slate-300">MV Svart</span>
                    <select
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                      value={split.goalieBlackId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        ensureInTeam("black", id);
                      }}
                      disabled={!hasTeams}
                    >
                      <option value="" disabled>
                        Välj…
                      </option>
                      {goalieCandidates
                        .slice()
                        .sort((a, b) => {
                          const sa = goalieStats.get(a.id);
                          const sb = goalieStats.get(b.id);
                          const ca = sa?.count ?? 0;
                          const cb = sb?.count ?? 0;
                          if (ca !== cb) return ca - cb;
                          const la = sa?.lastISO ?? "";
                          const lb = sb?.lastISO ?? "";
                          return la.localeCompare(lb);
                        })
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {displayName(p)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              </Card>

              <Card className="p-3">
                <div className="text-sm font-semibold">Utanför lag</div>
                <div className="mt-2 text-xs text-slate-400">
                  Spelare som är med idag men inte ligger i något lag (kan hända om du ändrar urvalet efteråt).
                </div>

                <div className="mt-3 grid gap-2">
                  {poolIds.length === 0 ? (
                    <div className="text-sm text-slate-300/80">Ingen.</div>
                  ) : (
                    poolIds.map((id) => {
                      const p = idToPlayer.get(id);
                      if (!p) return null;
                      return (
                        <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                          <div className="min-w-0 truncate text-sm">{displayName(p)}</div>
                          <Button variant="secondary" className="shrink-0 px-3 py-2 text-xs" onClick={() => moveBetweenTeams(id)}>
                            Lägg i lag
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
