import {
  HEROES,
  HERO_BY_ID,
  SHOP_ODDS,
  type BattlefieldTheme,
} from "../game-data";
import { DIFFICULTIES, type DifficultyId, type GameMode, type TacticId } from "../combat-config";
import type { FormationId } from "../formation-config";
import { emptyEquipment, rollItemShop } from "../item-data";
import {
  BOARD_POSITIONS,
  BOARD_SIZE,
  type MatchState,
  type PlayerState,
  type Unit,
} from "./types";
import { buildPairings } from "./match-loop";
import { encounterRuleFor } from "./encounter-rules";

const AI_PERSONAS = [
  { id: "wei-forge", name: "위나라 대장군", persona: "wei" },
  { id: "shu-oath", name: "촉한 의형제", persona: "shu" },
  { id: "wu-tide", name: "오나라 수군", persona: "wu" },
] as const;

const STARTER_BOARD = ["yue-jin"] as const;
const STARTER_BENCH = ["yu-jin", "cao-zhen"] as const;

const seededUnit = (heroId: string, index: number, seed: number): Unit => ({
  uid: `${heroId}-${index}-${seed}`,
  heroId,
  star: 1,
  items: emptyEquipment(),
});

export const createInitialBoard = (seed = 1): (Unit | null)[] => {
  const board: (Unit | null)[] = Array.from({ length: BOARD_SIZE }, () => null);
  STARTER_BOARD.forEach((heroId, index) => {
    board[BOARD_POSITIONS[index + 2]] = seededUnit(heroId, index, seed);
  });
  return board;
};

export const createInitialBench = (seed = 1): (Unit | null)[] =>
  Array.from({ length: 9 }, (_, index) =>
    STARTER_BENCH[index]
      ? seededUnit(STARTER_BENCH[index], index + 20, seed)
      : null,
  );

export const rollCost = (level: number, roll01: number) => {
  const odds = SHOP_ODDS[level] ?? SHOP_ODDS[9];
  let cursor = 0;
  for (let index = 0; index < odds.length; index += 1) {
    cursor += odds[index];
    if (roll01 * 100 <= cursor) return index + 1;
  }
  return 1;
};

export const rollShop = (level: number, seed: number) => {
  let cursor = seed;
  return Array.from({ length: 5 }, () => {
    cursor = (cursor * 1664525 + 1013904223) >>> 0;
    const cost = rollCost(level, (cursor % 10000) / 10000);
    const candidates = HEROES.filter((hero) => hero.cost === cost);
    cursor = (cursor * 1664525 + 1013904223) >>> 0;
    return candidates[cursor % candidates.length].id;
  });
};

export const mergeRoster = (
  boardInput: (Unit | null)[],
  benchInput: (Unit | null)[],
) => {
  const board = [...boardInput];
  const bench = [...benchInput];
  let mergedName = "";
  let keepMerging = true;
  const returnedItems: string[] = [];

  while (keepMerging) {
    keepMerging = false;
    for (const hero of HEROES) {
      for (const star of [1, 2] as const) {
        const matches: { zone: "board" | "bench"; index: number }[] = [];
        board.forEach((piece, index) => {
          if (piece?.heroId === hero.id && piece.star === star) {
            matches.push({ zone: "board", index });
          }
        });
        bench.forEach((piece, index) => {
          if (piece?.heroId === hero.id && piece.star === star) {
            matches.push({ zone: "bench", index });
          }
        });
        if (matches.length < 3) continue;

        const [keeper, ...consumed] = matches.slice(0, 3);
        const roster = keeper.zone === "board" ? board : bench;
        const piece = roster[keeper.index];
        if (!piece) continue;
        roster[keeper.index] = {
          ...piece,
          star: (star + 1) as 2 | 3,
          items: piece.items,
        };
        consumed.forEach((match) => {
          const victim = (match.zone === "board" ? board : bench)[match.index];
          if (victim) {
            victim.items.forEach((itemId) => {
              if (itemId) returnedItems.push(itemId);
            });
          }
          (match.zone === "board" ? board : bench)[match.index] = null;
        });
        mergedName = `${hero.name} ${star + 1}성`;
        keepMerging = true;
      }
    }
  }
  return { board, bench, mergedName, returnedItems };
};

const emptyPlayer = ({
  id,
  name,
  kind,
  seed,
  tactic,
  formation,
  aiPersona,
}: {
  id: string;
  name: string;
  kind: PlayerState["kind"];
  seed: number;
  tactic: TacticId;
  formation: FormationId;
  aiPersona?: string;
}): PlayerState => ({
  id,
  name,
  kind,
  health: 100,
  gold: kind === "human" ? 10 : 8 + (seed % 4),
  level: 1,
  xp: 0,
  streak: 0,
  board: kind === "human" ? createInitialBoard(seed) : Array.from({ length: BOARD_SIZE }, () => null),
  bench: kind === "human" ? createInitialBench(seed) : Array.from({ length: 9 }, () => null),
  shop: rollShop(1, seed + 17),
  shopKind: "heroes",
  itemShop: rollItemShop(seed + 42),
  itemBag: [],
  locked: false,
  tactic,
  formation,
  eliminated: false,
  placement: null,
  wins: 0,
  losses: 0,
  draws: 0,
  aiPersona,
});

export const createMatchState = ({
  mode = "single",
  difficulty = "heroic",
  aiCount = 2,
  tactic = "fortress",
  formation = "anhaeng",
  theme = "평지",
  seed = Date.now() % 1_000_000_000,
  rankPoints = 1240,
}: {
  mode?: GameMode;
  difficulty?: DifficultyId;
  aiCount?: 1 | 2 | 3;
  tactic?: TacticId;
  formation?: FormationId;
  theme?: BattlefieldTheme;
  seed?: number;
  rankPoints?: number;
} = {}): MatchState => {
  const humanId = "player-human";
  const players: PlayerState[] = [
    emptyPlayer({
      id: humanId,
      name: "아군 본진",
      kind: "human",
      seed,
      tactic,
      formation,
    }),
  ];

  const formations: FormationId[] = ["anhaeng", "bongsi", "hakik", "eorin"];
  const tactics: TacticId[] = ["assault", "fortress", "volley", "sustain"];

  for (let index = 0; index < aiCount; index += 1) {
    const persona = AI_PERSONAS[index % AI_PERSONAS.length];
    players.push(
      emptyPlayer({
        id: `player-ai-${index + 1}`,
        name: persona.name,
        kind: "ai",
        seed: seed + (index + 1) * 97,
        tactic: tactics[(index + 1) % tactics.length],
        formation: formations[(index + 2) % formations.length],
        aiPersona: persona.persona,
      }),
    );
  }

  const match: MatchState = {
    version: 2,
    mode,
    difficulty,
    aiCount,
    round: 1,
    stage: 1,
    theme,
    seed,
    players,
    humanId,
    pairings: [],
    lastResults: [],
    phase: "prep",
    rankPoints,
    notice: `${DIFFICULTIES[difficulty].label} · AI ${aiCount}명 대결 · 약 15~25분`,
  };
  return {
    ...match,
    pairings:
      encounterRuleFor(match.round, match.stage).kind === "farm"
        ? []
        : buildPairings(match),
  };
};

export const humanPlayer = (match: MatchState) =>
  match.players.find((player) => player.id === match.humanId)!;

export const updateHuman = (
  match: MatchState,
  patch: Partial<PlayerState>,
): MatchState => ({
  ...match,
  players: match.players.map((player) =>
    player.id === match.humanId ? { ...player, ...patch } : player,
  ),
});

export const boardToCombatInputs = (board: (Unit | null)[]) =>
  board.flatMap((piece, boardIndex) =>
    piece
      ? [
          {
            uid: piece.uid,
            heroId: piece.heroId,
            star: piece.star,
            boardIndex,
            items: piece.items,
          },
        ]
      : [],
  );

export const heroName = (heroId: string) => HERO_BY_ID[heroId]?.name ?? heroId;
