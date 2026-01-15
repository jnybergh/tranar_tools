"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Input } from "../../components/ui";
import type { Player, Split, TeamSide, TrainingSession } from "../../lib/types";
import { clearDraft, loadDraft, loadPlayers, loadSessions, saveDraft, saveSession } from "../../lib/storage";
import { displayName, getTodayISO } from "../../lib/utils";
import { buildSplit, formatClipboard } from "../../lib/team";

type DragPayload = { playerId: string; from: TeamSide };

export default function TrainingPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  const [split, setSplit] = useState<Split>({ red: [], black: [] });
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");

  const [status, setStatus] = useState<string>("");
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
    const res = buildSplit({ players, sessions, current: split, locked });
    setSplit(res.split);
    if (res.warning) flash(res.warning);
    else flash("Nya lag slumpade.");
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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-base font-semibold">Träning</h1>
            <p className="text-sm text-slate-400">
              Slumpa lag med rättvis målvaktsrotation. Dra spelare mellan lag och lås vid behov.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={randomize}>Slumpa lag</Button>
            <Button variant="secondary" onClick={copyClipboard}>Kopiera</Button>
            <Button variant="secondary" onClick={reset}>Rensa</Button>
            <Button onClick={save}>Spara</Button>
          </div>
        </div>

        {status ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
            {status}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card
            className="p-4"
            onDragOver={allowDrop}
            onDrop={(e) => onDropTo("red", e)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Lag Röd</h2>
                <div className="text-xs text-slate-400">{split.red.length} spelare</div>
              </div>
              <div className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-100">Röd</div>
            </div>

            <div className="mt-3 grid gap-2">
              {split.red.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-slate-400">
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

            <div className="mt-3 text-xs text-slate-400">
              Målvakt: {goalieRed ? displayName(goalieRed) : "—"}
            </div>
          </Card>

          <Card
            className="p-4"
            onDragOver={allowDrop}
            onDrop={(e) => onDropTo("black", e)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Lag Svart</h2>
                <div className="text-xs text-slate-400">{split.black.length} spelare</div>
              </div>
              <div className="rounded-full bg-slate-800/80 px-2 py-1 text-xs text-slate-100 border border-white/10">
                Svart
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {split.black.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-slate-400">
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

            <div className="mt-3 text-xs text-slate-400">
              Målvakt: {goalieBlack ? displayName(goalieBlack) : "—"}
            </div>
          </Card>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-400">
            Tips: Klicka 🔒 för att låsa en spelare i laget innan du slumpa om.
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

      <Card
        className="p-4"
        onDragOver={allowDrop}
        onDrop={(e) => onDropTo("pool", e)}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Utanför lag</h2>
            <div className="text-xs text-slate-400">{poolIds.length} spelare</div>
          </div>
          <div className="text-xs text-slate-400">Dra hit för att ta ur lag</div>
        </div>

        <div className="mt-3 grid gap-2">
          {poolIds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-slate-400">
              Alla tillgängliga spelare är i lag.
            </div>
          ) : (
            poolIds.map((id) => (
              <div
                key={id}
                draggable
                onDragStart={(e) => onDragStart(e, { playerId: id, from: "pool" })}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <span className="truncate">{idToPlayer.get(id) ? displayName(idToPlayer.get(id)!) : "Okänd"}</span>
                {id === split.goalieRedId || id === split.goalieBlackId ? (
                  <span className="ml-2 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-slate-200">
                    MV
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function PlayerChip({
  player,
  isGoalie,
  locked,
  onToggleLock,
  onDragStart
}: {
  id: string;
  player?: Player;
  isGoalie: boolean;
  locked: boolean;
  onToggleLock: () => void;
  onDragStart: (e: React.DragEvent) => void;
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
        <button
          type="button"
          onClick={onToggleLock}
          className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs hover:bg-black/30"
          title={locked ? "Låst" : "Lås"}
          aria-label={locked ? "Låst" : "Lås"}
        >
          {locked ? "🔒" : "🔓"}
        </button>
      </span>
    </div>
  );
}
