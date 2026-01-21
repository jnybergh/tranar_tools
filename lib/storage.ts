import type { Player, TrainingSession, Split } from "./types";

const KEY_PLAYERS = "hockey_players_v2";
const KEY_SESSIONS = "hockey_sessions_v2";
const KEY_DRAFT = "hockey_draft_v2";

function makePlayerId(i: number, firstName: string, lastInitial: string) {
  const safe = (s: string) => s.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
  return `p${i}_${safe(firstName)}_${safe(lastInitial)}`;
}

const INITIAL_PLAYERS: Player[] = [
  { id: makePlayerId(1, "Axel", "G"), firstName: "Axel", lastInitial: "G", canGoalie: false, availableToday: true },
  { id: makePlayerId(2, "Ebba", "P"), firstName: "Ebba", lastInitial: "P", canGoalie: false, availableToday: true },
  { id: makePlayerId(3, "Elias", "A"), firstName: "Elias", lastInitial: "A", canGoalie: false, availableToday: true },
  { id: makePlayerId(4, "Ella", "S"), firstName: "Ella", lastInitial: "S", canGoalie: false, availableToday: true },
  { id: makePlayerId(5, "Franz", "B"), firstName: "Franz", lastInitial: "B", canGoalie: false, availableToday: true },
  { id: makePlayerId(6, "Frei", "W"), firstName: "Frei", lastInitial: "W", canGoalie: false, availableToday: true },
  { id: makePlayerId(7, "Freja", "J"), firstName: "Freja", lastInitial: "J", canGoalie: false, availableToday: true },
  { id: makePlayerId(8, "Hjalmar", "V"), firstName: "Hjalmar", lastInitial: "V", canGoalie: false, availableToday: true },
  { id: makePlayerId(9, "Hugo", "J"), firstName: "Hugo", lastInitial: "J", canGoalie: false, availableToday: true },
  { id: makePlayerId(10, "Iris", "H"), firstName: "Iris", lastInitial: "H", canGoalie: false, availableToday: true },
  { id: makePlayerId(11, "Julian", "B"), firstName: "Julian", lastInitial: "B", canGoalie: false, availableToday: true },
  { id: makePlayerId(12, "Junie", "E"), firstName: "Junie", lastInitial: "E", canGoalie: false, availableToday: true },
  { id: makePlayerId(13, "Lennon", "R"), firstName: "Lennon", lastInitial: "R", canGoalie: false, availableToday: true },
  { id: makePlayerId(14, "Loke", "E"), firstName: "Loke", lastInitial: "E", canGoalie: false, availableToday: true },
  { id: makePlayerId(15, "Matheo", "H"), firstName: "Matheo", lastInitial: "H", canGoalie: false, availableToday: true },
  { id: makePlayerId(16, "Matheus", "J"), firstName: "Matheus", lastInitial: "J", canGoalie: false, availableToday: true },
  { id: makePlayerId(17, "Mila", "S"), firstName: "Mila", lastInitial: "S", canGoalie: false, availableToday: true },
  { id: makePlayerId(18, "Milton", "D"), firstName: "Milton", lastInitial: "D", canGoalie: false, availableToday: true },
  { id: makePlayerId(19, "Nicolas", "K"), firstName: "Nicolas", lastInitial: "K", canGoalie: false, availableToday: true },
  { id: makePlayerId(20, "Oliver", "E"), firstName: "Oliver", lastInitial: "E", canGoalie: false, availableToday: true },
  { id: makePlayerId(21, "Oscar", "L"), firstName: "Oscar", lastInitial: "L", canGoalie: false, availableToday: true },
  { id: makePlayerId(22, "Walter", "L"), firstName: "Walter", lastInitial: "L", canGoalie: false, availableToday: true },
  { id: makePlayerId(23, "William", "N"), firstName: "William", lastInitial: "N", canGoalie: false, availableToday: true },
];


export function loadPlayers(): Player[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_PLAYERS);
    if (!raw) {
      // Seed roster on first run to avoid manual data entry.
      window.localStorage.setItem(KEY_PLAYERS, JSON.stringify(INITIAL_PLAYERS));
      return INITIAL_PLAYERS;
    }
    const parsed = JSON.parse(raw) as Player[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlayers(players: Player[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_PLAYERS, JSON.stringify(players));
}

export function loadSessions(): TrainingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrainingSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice().sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0));
  } catch {
    return [];
  }
}

export function saveSession(session: TrainingSession): TrainingSession[] {
  const sessions = loadSessions();
  const next = [session, ...sessions].slice(0, 60);
  window.localStorage.setItem(KEY_SESSIONS, JSON.stringify(next));
  return next;
}

export function deleteSession(id: string): TrainingSession[] {
  const sessions = loadSessions();
  const next = sessions.filter((s) => s.id !== id);
  window.localStorage.setItem(KEY_SESSIONS, JSON.stringify(next));
  return next;
}

export function loadDraft(): Split | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_DRAFT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Split;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(split: Split) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_DRAFT, JSON.stringify(split));
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_DRAFT);
}
