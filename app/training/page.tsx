"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Input } from "../../components/ui";
import type { Player, Split, TeamSide, TrainingSession } from "../../lib/types";
import { clearDraft, loadDraft, loadPlayers, loadSessions, saveDraft, saveSession } from "../../lib/storage";
import { computeGoalieStats, displayName, getTodayISO } from "../../lib/utils";
import { buildSplit, formatClipboard, pickGoaliesFair } from "../../lib/team";

type DragPayload = { playerId: string; from: TeamSide };

export default function TrainingPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  const [split, setSplit] = useState<Split>({ red: [], black: [] });
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");

  const [status, setStatus] = useState<string>("");
  const [poolOpen, setPoolOpen] = useState(false);
  const [lockGoalies, setLockGoalies] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const p = loadPlayers();
    const s = loadSessions();
    setPlayers(p);
    setSessions(s);

    const draft = loadDraft();
    if (draft) setSplit(draft);
  }, []);

  useEffect(() => {
    // Default: show pool on large screens, collapse on mobile.
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setPoolOpen(true);
    }
  }, []);


  useEffect(() => {
    saveDraft(split);
  }, [split]);

  const availablePlayers = useMemo(() => players.filter((p) => p.availableToday), [players]);

  const idToPlayer = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const poolIds = useMemo(() => {
    const inRed = new Set(split.red);
    const inBlack = new Set(split.black);
    return availablePlayers.map((p) => p.id).filter((id) => !inRed.has(id) && !inBlack.has(id));
  }, [availablePlayers, split]);

  function flash(msg: string) {
    setStatus(msg);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus(""), 2600);
  }

  function toggleLock(id: string) {
    setLocked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
  }

  function onDragStart(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropTo(side: TeamSide, e: React.DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload: DragPayload;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      return;
    }

    const { playerId, from } = payload;

    // remove from origin
    if (from === "red") setSplit((prev) => ({ ...prev, red: prev.red.filter((x) => x !== playerId) }));
    if (from === "black") setSplit((prev) => ({ ...prev, black: prev.black.filter((x) => x !== playerId) }));

    // add to target
    if (side === "red") setSplit((prev) => ({ ...prev, red: prev.red.includes(playerId) ? prev.red : [...prev.red, playerId] }));
    if (side === "black") setSplit((prev) => ({ ...prev, black: prev.black.includes(playerId) ? prev.black : [...prev.black, playerId] }));
    if (side === "pool") {
      // nothing else: dropping to pool means it isn't in a team
    }

    flash("Flyttad.");
  }

  function randomize() {
    if (availablePlayers.length < 2) return flash("För få spelare markerade som tillgängliga idag.");
    const derivedLocked = lockGoalies
      ? {
          ...locked,
          ...(split.goalieRedId ? { [split.goalieRedId]: true } : {}),
          ...(split.goalieBlackId ? { [split.goalieBlackId]: true } : {})
        }
      : locked;
    const res = buildSplit({ players, sessions, current: split, locked: derivedLocked });
    setSplit(res.split);
    if (res.warning) flash(res.warning);
    else flash("Nya lag slumpade.");
  }

  function toggleLockGoalies() {
    setLockGoalies((v) => {
      const next = !v;
      flash(next ? "Målvakter låses vid slumpa om." : "Målvakter kan ändras vid slump.");
      return next;
    });
  }

  function pickGoaliesOnly() {
    const available = players.filter((p) => p.availableToday);
    const candidates = available.filter((p) => p.canGoalie);
    if (candidates.length < 2) return flash("Färre än 2 målvaktskandidater är markerade (kan stå).");

    const ordered = pickGoaliesFair({ candidates, sessions });
    const g1 = ordered[0];
    const g2 = ordered[1];
    if (!g1 || !g2) return flash("Kunde inte välja två målvakter.");

    setSplit((prev) => {
      const red = (prev.red ?? []).filter((id) => id !== g1.id && id !== g2.id);
      const black = (prev.black ?? []).filter((id) => id !== g1.id && id !== g2.id);

      red.unshift(g1.id);
      black.unshift(g2.id);

      // Keep teams reasonably balanced (move one skater if needed)
      if (red.length - black.length >= 2) {
        const moved = red.pop();
        if (moved && moved !== g1.id) black.push(moved);
      } else if (black.length - red.length >= 2) {
        const moved = black.pop();
        if (moved && moved !== g2.id) red.push(moved);
      }

      return { ...prev, red, black, goalieRedId: g1.id, goalieBlackId: g2.id };
    });

    flash("Målvakter omvalda.");
  }

  async function copyClipboard() {
    const text = formatClipboard({ split, idToPlayer });
    try {
      await navigator.clipboard.writeText(text);
      flash("Kopierat till urklipp.");
    } catch {
      flash("Kunde inte kopiera (webbläsaren blockerade).");
    }
  }

  function reset() {
    setSplit({ red: [], black: [] });
    setLocked({});
    clearDraft();
    flash("Rensat.");
  }

  function save() {
    if (split.red.length === 0 && split.black.length === 0) return flash("Inga lag att spara.");
    const session: TrainingSession = {
      id: crypto.randomUUID(),
      dateISO: getTodayISO(),
      note: note.trim() || undefined,
      split
    };
    const next = saveSession(session);
    setSessions(next);
    setNote("");
    flash("Sparat i historik.");
  }

  const goalieRed = split.goalieRedId ? idToPlayer.get(split.goalieRedId) : undefined;
  const goalieBlack = split.goalieBlackId ? idToPlayer.get(split.goalieBlackId) : undefined;

  const goalieRedStats = useMemo(() => {
    return split.goalieRedId ? computeGoalieStats(sessions, split.goalieRedId) : { count: 0, lastISO: undefined };
  }, [sessions, split.goalieRedId]);

  const goalieBlackStats = useMemo(() => {
    return split.goalieBlackId ? computeGoalieStats(sessions, split.goalieBlackId) : { count: 0, lastISO: undefined };
  }, [sessions, split.goalieBlackId]);


  return (
    <div className="pb-28">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Träning</h1>
          <p className="text-sm text-slate-400">
            Slumpa lag med rättvis målvaktsrotation. Justera med drag &amp; drop och spara när det sitter.
          </p>
        </div>

        {/* Desktop quick actions (the primary actions are also in the sticky bar) */}
        <div className="hidden gap-2 lg:flex">
          <Button onClick={randomize}>Slumpa lag</Button>
          <Button variant="secondary" onClick={copyClipboard}>Kopiera</Button>
          <Button variant="secondary" onClick={reset}>Rensa</Button>
          <Button onClick={save}>Spara</Button>
        </div>
      </div>

      {/* Goalie panel */}
      <Card className="mb-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Målvakter idag</div>
            <div className="mt-1 text-xs text-slate-400">
              Val baseras på minst antal gånger och längst senast (slump vid lika).
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={pickGoaliesOnly}>Välj om målvakter</Button>
            <Button variant="secondary" onClick={toggleLockGoalies}>
              {lockGoalies ? "Lås upp målvakter" : "Lås målvakter"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-red-300">Lag Röd</div>
              <div className="text-[11px] text-slate-400">MV</div>
            </div>
            <div className="mt-1 text-base font-semibold">{goalieRed ? displayName(goalieRed) : "—"}</div>
            <div className="mt-1 text-xs text-slate-400">
              {goalieRed ? `Stått: ${goalieRedStats.count} • Senast: ${goalieRedStats.lastISO ?? "—"}` : "Välj två målvakter i spelarlistan (Kan stå)."}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-200">Lag Svart</div>
              <div className="text-[11px] text-slate-400">MV</div>
            </div>
            <div className="mt-1 text-base font-semibold">{goalieBlack ? displayName(goalieBlack) : "—"}</div>
            <div className="mt-1 text-xs text-slate-400">
              {goalieBlack ? `Stått: ${goalieBlackStats.count} • Senast: ${goalieBlackStats.lastISO ?? "—"}` : "Välj två målvakter i spelarlistan (Kan stå)."}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Teams */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold">Lag</div>
            <div className="text-xs text-slate-400">Dra spelare mellan lag eller lås med 🔒</div>
          </div>

          {status ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              {status}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card
              className="p-4"
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo("red", e)}
            >
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold text-red-300">Lag Röd</div>
                <div className="text-xs text-slate-400">{split.red.length} spelare</div>
              </div>

              <div className="mt-3 grid gap-2">
                {split.red.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-2 text-sm text-slate-400">
                    Dra spelare hit eller klicka “Slumpa lag”.
                  </div>
                ) : (
                  split.red.map((id) => (
                    <PlayerChip
                      key={id}
                      id={id}
                      player={idToPlayer.get(id)}
                      isGoalie={id === split.goalieRedId}
                      locked={!!locked[id]}
                      onToggleLock={() => toggleLock(id)}
                      onDragStart={(e) => onDragStart(e, { playerId: id, from: "red" })}
                    />
                  ))
                )}
              </div>
            </Card>

            <Card
              className="p-4"
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo("black", e)}
            >
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold text-slate-200">Lag Svart</div>
                <div className="text-xs text-slate-400">{split.black.length} spelare</div>
              </div>

              <div className="mt-3 grid gap-2">
                {split.black.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-2 text-sm text-slate-400">
                    Dra spelare hit eller klicka “Slumpa lag”.
                  </div>
                ) : (
                  split.black.map((id) => (
                    <PlayerChip
                      key={id}
                      id={id}
                      player={idToPlayer.get(id)}
                      isGoalie={id === split.goalieBlackId}
                      locked={!!locked[id]}
                      onToggleLock={() => toggleLock(id)}
                      onDragStart={(e) => onDragStart(e, { playerId: id, from: "black" })}
                    />
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">
              Tips: Lås en spelare om du vill behålla den platsen när du slumpa om.
            </div>
            <div className="w-full sm:max-w-md">
              <Input
                placeholder="Anteckning (valfritt), t.ex. fokus: passningar"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Pool (collapsible) */}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Utanför lag</div>
              <div className="mt-1 text-xs text-slate-400">{poolIds.length} spelare</div>
            </div>

            <Button
              variant="secondary"
              onClick={() => setPoolOpen((v) => !v)}
            >
              {poolOpen ? "Dölj" : "Visa"}
            </Button>
          </div>

          {poolOpen ? (
            <div
              className="mt-3"
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo("pool", e)}
            >
              <div className="grid gap-2">
                {poolIds.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-3 py-2 text-sm text-slate-400">
                    Alla spelare är i lag.
                  </div>
                ) : (
                  poolIds.map((id) => (
                    <PlayerChip
                      key={id}
                      id={id}
                      player={idToPlayer.get(id)}
                      isGoalie={id === split.goalieRedId || id === split.goalieBlackId}
                      locked={false}
                      onToggleLock={() => {}}
                      onDragStart={(e) => onDragStart(e, { playerId: id, from: "pool" })}
                      hideLock
                    />
                  ))
                )}
              </div>

              <div className="mt-3 text-xs text-slate-400">
                Dra en spelare till Lag Röd eller Lag Svart.
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-white/10 px-3 py-2 text-sm text-slate-400">
              Klicka “Visa” för att se spelare utanför lag.
            </div>
          )}
        </Card>
      </div>

      {/* Sticky action bar (mobile-first) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Button className="flex-1" onClick={randomize}>Slumpa lag</Button>
          <Button variant="secondary" onClick={copyClipboard}>Kopiera</Button>
          <Button variant="secondary" onClick={save}>Spara</Button>
          <Button variant="secondary" onClick={reset} className="hidden sm:inline-flex">Rensa</Button>
        </div>
      </div>
    </div>
  );

}

function PlayerChip({
  player,
  isGoalie,
  locked,
  onToggleLock,
  onDragStart,
  hideLock
}: {
  id: string;
  player?: Player;
  isGoalie: boolean;
  locked: boolean;
  onToggleLock: () => void;
  onDragStart: (e: React.DragEvent) => void;
  hideLock?: boolean;
}) {
  const name = player ? displayName(player) : "Okänd";
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={[
        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm",
        locked ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5"
      ].join(" ")}
    >
      <span className="truncate">{name}</span>
      <span className="flex items-center gap-2">
        {isGoalie ? (
          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-slate-200">
            MV
          </span>
        ) : null}
        {!hideLock ? (
          <button
            type="button"
            onClick={onToggleLock}
            className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs hover:bg-black/30"
            title={locked ? "Låst" : "Lås"}
            aria-label={locked ? "Låst" : "Lås"}
          >
            {locked ? "🔒" : "🔓"}
          </button>
        ) : null}
      </span>
    </div>
  );
}