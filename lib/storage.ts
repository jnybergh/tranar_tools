import type { Player, TrainingSession, Split } from "./types";

const KEY_PLAYERS = "hockey_players_v2";
const KEY_SESSIONS = "hockey_sessions_v2";
const KEY_DRAFT = "hockey_draft_v2";

export function loadPlayers(): Player[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_PLAYERS);
    if (!raw) return [];
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
