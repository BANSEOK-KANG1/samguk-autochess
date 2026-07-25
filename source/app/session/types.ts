import type { BattlefieldTheme } from "../game-data";
import type { DifficultyId, GameMode, TacticId } from "../combat-config";
import type { FormationId } from "../formation-config";
import type { EquippedItems } from "../item-data";
import type { BoardCombatInput, CombatWinner } from "../combat-engine";

export type Unit = {
  uid: string;
  heroId: string;
  star: 1 | 2 | 3;
  items: EquippedItems;
};

export type SeatKind = "human" | "ai";
export type ShopKind = "heroes" | "items";
export type MatchPhase = "prep" | "combat" | "result" | "finished";

export type PlayerState = {
  id: string;
  name: string;
  kind: SeatKind;
  health: number;
  gold: number;
  level: number;
  xp: number;
  streak: number;
  board: (Unit | null)[];
  bench: (Unit | null)[];
  shop: (string | null)[];
  shopKind: ShopKind;
  itemShop: (string | null)[];
  itemBag: string[];
  locked: boolean;
  tactic: TacticId;
  formation: FormationId;
  eliminated: boolean;
  placement: number | null;
  wins: number;
  losses: number;
  draws: number;
  aiPersona?: string;
};

export type Pairing = {
  a: string;
  b: string | null;
};

export type FightResult = {
  pairingIndex: number;
  aId: string;
  bId: string | null;
  winner: CombatWinner | "bye";
  damage: number;
};

export type MatchState = {
  version: 2;
  mode: GameMode;
  difficulty: DifficultyId;
  /** Number of AI rivals (1–3). Total seats = aiCount + 1. */
  aiCount: 1 | 2 | 3;
  round: number;
  stage: number;
  theme: BattlefieldTheme;
  seed: number;
  players: PlayerState[];
  humanId: string;
  pairings: Pairing[];
  lastResults: FightResult[];
  phase: MatchPhase;
  rankPoints: number;
  notice: string;
};

export type BoardSnapshot = {
  playerId: string;
  name: string;
  tactic: TacticId;
  formation: FormationId;
  level: number;
  units: BoardCombatInput[];
};

export const BOARD_COLUMNS = 7;
export const BOARD_SIZE = 28;
export const BOARD_POSITIONS = [10, 2, 3, 11, 4, 24];
export const MATCH_SAVE_VERSION = 2 as const;
