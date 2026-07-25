import type { MatchState } from "./types";
import { MATCH_SAVE_VERSION } from "./types";

const SAVE_KEY = "samguk-autochess-match-v1";

export type SavedMatchEnvelope = {
  version: typeof MATCH_SAVE_VERSION;
  savedAt: number;
  match: MatchState;
};

export const saveMatch = (match: MatchState): boolean => {
  if (typeof localStorage === "undefined") return false;
  try {
    const payload: SavedMatchEnvelope = {
      version: MATCH_SAVE_VERSION,
      savedAt: Date.now(),
      match: {
        ...match,
        phase: match.phase === "combat" ? "prep" : match.phase,
      },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
};

export const loadMatch = (): SavedMatchEnvelope | null => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedMatchEnvelope;
    if (!parsed || parsed.version !== MATCH_SAVE_VERSION || !parsed.match) {
      clearMatchSave();
      return null;
    }
    if (parsed.match.phase === "combat") {
      parsed.match = { ...parsed.match, phase: "prep" };
    }
    return parsed;
  } catch {
    clearMatchSave();
    return null;
  }
};

export const clearMatchSave = () => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
};

export const hasMatchSave = () => Boolean(loadMatch());
