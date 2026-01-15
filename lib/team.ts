import type { Player, Split, TrainingSession } from "./types";
import { computeGoalieStats } from "./utils";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function norm(team: string[]): string {
  return team.slice().sort().join(",");
}

function sameSplit(a: Split, b: Split): boolean {
  const ar = norm(a.red);
  const ab = norm(a.black);
  const br = norm(b.red);
  const bb = norm(b.black);
  return (ar === br && ab === bb) || (ar === bb && ab === br);
}

export function pickGoaliesFair({ candidates, sessions }: { candidates: Player[]; sessions: TrainingSession[] }): Player[] {
  const decorated = candidates.map((p) => {
    const st = computeGoalieStats(sessions, p.id);
    return { p, count: st.count, lastISO: st.lastISO };
  });

  const shuffled = shuffle(decorated);

  shuffled.sort((a, b) => {
    if (a.count !== b.count) return a.count - b.count;

    const aLast = a.lastISO ?? "";
    const bLast = b.lastISO ?? "";
    if (aLast === bLast) return 0;
    if (aLast === "") return -1;
    if (bLast === "") return 1;
    return aLast < bLast ? -1 : 1; // older first
  });

  return shuffled.map((x) => x.p);
}

export function buildSplit({
  players,
  sessions,
  current,
  locked
}: {
  players: Player[];
  sessions: TrainingSession[];
  current: Split;
  locked: Record<string, boolean>;
}): { split: Split; warning?: string } {
  const available = players.filter((p) => p.availableToday);

  const currentRed = (current.red ?? []).filter((id) => available.some((p) => p.id === id));
  const currentBlack = (current.black ?? []).filter((id) => available.some((p) => p.id === id));

  const lockedRed = currentRed.filter((id) => locked[id]);
  const lockedBlack = currentBlack.filter((id) => locked[id]);
  const lockedSet = new Set([...lockedRed, ...lockedBlack]);

  const freePlayers = available.filter((p) => !lockedSet.has(p.id));
  const freeGoalieCandidates = freePlayers.filter((p) => p.canGoalie);
  const freeSkaters = freePlayers.filter((p) => !p.canGoalie);

  const avoidSplits = sessions.slice(0, 2).map((s) => s.split);

  const idToPlayer = new Map(available.map((p) => [p.id, p]));
  const lockedGoaliesRed = lockedRed.filter((id) => idToPlayer.get(id)?.canGoalie);
  const lockedGoaliesBlack = lockedBlack.filter((id) => idToPlayer.get(id)?.canGoalie);

  const tries = 120;
  let best: Split | null = null;
  let warning: string | undefined;

  for (let t = 0; t < tries; t++) {
    const split: Split = { red: [...lockedRed], black: [...lockedBlack] };

    const needRed = lockedGoaliesRed.length === 0;
    const needBlack = lockedGoaliesBlack.length === 0;

    const orderedGoalies = pickGoaliesFair({ candidates: freeGoalieCandidates, sessions });
    const poolGoalies = orderedGoalies.map((p) => p.id);

    if (needRed && poolGoalies.length > 0) split.red.push(poolGoalies.shift()!);
    if (needBlack && poolGoalies.length > 0) split.black.push(poolGoalies.shift()!);

    const restIds = shuffle([...poolGoalies, ...freeSkaters.map((p) => p.id)]);
    for (const id of restIds) {
      if (split.red.length <= split.black.length) split.red.push(id);
      else split.black.push(id);
    }

    const matchesAvoid = avoidSplits.some((a) => sameSplit(split, a));
    if (!matchesAvoid) {
      best = split;
      break;
    }
    if (t == tries - 1) best = split;
  }

  const finalSplit = best ?? { red: [], black: [] };
  finalSplit.goalieRedId = finalSplit.red.find((id) => idToPlayer.get(id)?.canGoalie);
  finalSplit.goalieBlackId = finalSplit.black.find((id) => idToPlayer.get(id)?.canGoalie);

  const totalCandidates = available.filter((p) => p.canGoalie).length;
  if (totalCandidates < 2) warning = "Färre än 2 målvaktskandidater är markerade (kan stå).";
  else if (!finalSplit.goalieRedId || !finalSplit.goalieBlackId) warning = "Kunde inte placera en målvakt i varje lag (kolla låsningar / urval).";

  return { split: finalSplit, warning };
}

export function formatClipboard({ split, idToPlayer }: { split: Split; idToPlayer: Map<string, Player> }): string {
  const fmt = (id: string) => {
    const p = idToPlayer.get(id);
    if (!p) return "Okänd";
    const isMV = id === split.goalieRedId || id === split.goalieBlackId;
    return `${p.firstName} ${p.lastInitial}.${isMV ? " (MV)" : ""}`;
  };

  const lines: string[] = [];
  lines.push("Lag Röd");
  for (const id of split.red) lines.push(`- ${fmt(id)}`);
  lines.push("");
  lines.push("Lag Svart");
  for (const id of split.black) lines.push(`- ${fmt(id)}`);
  return lines.join("\n");
}
