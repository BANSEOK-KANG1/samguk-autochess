import type { BoardCombatInput } from "../combat-engine";
import type { TacticId } from "../combat-config";
import type { FormationId } from "../formation-config";
import type { BattlefieldTheme } from "../game-data";
import { boardToCombatInputs } from "./game-session";
import type { BoardSnapshot, MatchState, PlayerState } from "./types";

export type MatchSnapshot = {
  version: 1;
  matchId: string;
  seed: number;
  theme: BattlefieldTheme;
  round: number;
  stage: number;
  difficulty: MatchState["difficulty"];
  boards: BoardSnapshot[];
};

const validateUnit = (unit: BoardCombatInput) =>
  Boolean(unit.uid && unit.heroId) &&
  (unit.star === 1 || unit.star === 2 || unit.star === 3) &&
  Number.isInteger(unit.boardIndex) &&
  unit.boardIndex >= 0 &&
  unit.boardIndex < 28;

export const snapshotFromPlayer = (
  player: PlayerState,
  units?: BoardCombatInput[],
): BoardSnapshot => ({
  playerId: player.id,
  name: player.name,
  tactic: player.tactic,
  formation: player.formation,
  level: player.level,
  units: units ?? boardToCombatInputs(player.board),
});

export const createMatchSnapshot = (
  match: MatchState,
  boards: BoardSnapshot[],
): MatchSnapshot => ({
  version: 1,
  matchId: `match-${match.seed}-${match.round}-${match.stage}`,
  seed: match.seed + match.round * 131 + match.stage * 17,
  theme: match.theme,
  round: match.round,
  stage: match.stage,
  difficulty: match.difficulty,
  boards,
});

export const validateMatchSnapshot = (
  snapshot: MatchSnapshot,
): { ok: true } | { ok: false; reason: string } => {
  if (!snapshot || snapshot.version !== 1) {
    return { ok: false, reason: "unsupported version" };
  }
  if (!Number.isFinite(snapshot.seed)) {
    return { ok: false, reason: "invalid seed" };
  }
  if (!Array.isArray(snapshot.boards) || snapshot.boards.length < 1) {
    return { ok: false, reason: "missing boards" };
  }
  for (const board of snapshot.boards) {
    if (!board.playerId || !board.tactic || !board.formation) {
      return { ok: false, reason: `invalid board meta ${board.playerId}` };
    }
    if (!Array.isArray(board.units) || board.units.some((unit) => !validateUnit(unit))) {
      return { ok: false, reason: `invalid units on ${board.playerId}` };
    }
  }
  return { ok: true };
};

export const serializeMatchSnapshot = (snapshot: MatchSnapshot) =>
  JSON.stringify(snapshot);

export const parseMatchSnapshot = (
  raw: string,
): { ok: true; snapshot: MatchSnapshot } | { ok: false; reason: string } => {
  try {
    const snapshot = JSON.parse(raw) as MatchSnapshot;
    const valid = validateMatchSnapshot(snapshot);
    if (!valid.ok) return valid;
    return { ok: true, snapshot };
  } catch {
    return { ok: false, reason: "malformed json" };
  }
};

/** Stable fingerprint for async ghost exchange / future room codes. */
export const snapshotFingerprint = (snapshot: MatchSnapshot) => {
  const body = serializeMatchSnapshot({
    ...snapshot,
    boards: [...snapshot.boards].sort((a, b) =>
      a.playerId.localeCompare(b.playerId),
    ),
  });
  let hash = 2166136261;
  for (let index = 0; index < body.length; index += 1) {
    hash ^= body.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export type GhostExchangePayload = {
  code: string;
  snapshot: MatchSnapshot;
  createdAt: number;
};

export const packGhostCode = (snapshot: MatchSnapshot): string => {
  const payload: GhostExchangePayload = {
    code: snapshotFingerprint(snapshot),
    snapshot,
    createdAt: Date.now(),
  };
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
};

export const unpackGhostCode = (
  code: string,
): { ok: true; payload: GhostExchangePayload } | { ok: false; reason: string } => {
  try {
    const json =
      typeof atob === "function"
        ? decodeURIComponent(escape(atob(code)))
        : Buffer.from(code, "base64").toString("utf8");
    const payload = JSON.parse(json) as GhostExchangePayload;
    const valid = validateMatchSnapshot(payload.snapshot);
    if (!valid.ok) return valid;
    if (payload.code !== snapshotFingerprint(payload.snapshot)) {
      return { ok: false, reason: "fingerprint mismatch" };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid ghost code" };
  }
};

export type AsyncReadyBoard = {
  playerId: string;
  name: string;
  tactic: TacticId;
  formation: FormationId;
  level: number;
  units: BoardCombatInput[];
};
