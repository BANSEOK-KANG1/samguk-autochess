import { HEROES } from "../game-data";
import { DIFFICULTIES } from "../combat-config";
import { FORMATIONS, type FormationId } from "../formation-config";
import type { BoardCombatInput } from "../combat-engine";
import type { MatchState, PlayerState } from "./types";
import { BOARD_COLUMNS } from "./types";

const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];

const randomFromSeed = (seed: number) => {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return { seed: next, value: next / 0x100000000 };
};

const isBackline = (role: string) =>
  role === "궁수" || role === "책사" || role === "지원";

/**
 * Build a deterministic AI board snapshot from match progress.
 * Reuses the same formation-biased placement rules as combat enemy generation.
 */
export const buildAiBoardInputs = (
  player: PlayerState,
  match: MatchState,
  initialSeed: number,
): BoardCombatInput[] => {
  const scale = DIFFICULTIES[match.difficulty].enemyScale;
  const level = Math.max(
    3,
    Math.min(9, Math.round(player.level * scale + match.round * 0.35)),
  );
  const count = Math.min(
    level,
    Math.max(4, 3 + match.round + Math.floor(match.stage / 2)),
  );
  const leaderStar: 1 | 2 =
    match.difficulty === "legendary" || level >= 8 ? 2 : 1;
  const formationId: FormationId = player.formation;
  const maxCost = Math.min(5, Math.max(3, Math.ceil(level / 2) + 1));
  const factionBias =
    player.aiPersona === "wei"
      ? "위"
      : player.aiPersona === "shu"
        ? "촉"
        : player.aiPersona === "wu"
          ? "오"
          : null;
  const candidates = HEROES.filter((hero) => {
    if (hero.cost > maxCost) return false;
    if (!factionBias) return true;
    return hero.faction === factionBias || hero.cost >= 4;
  });
  const pool = candidates.length ? candidates : HEROES.filter((hero) => hero.cost <= maxCost);
  const picked: BoardCombatInput[] = [];
  let seed = initialSeed;

  for (let index = 0; index < count; index += 1) {
    const roll = randomFromSeed(seed);
    seed = roll.seed;
    const remaining = pool.filter(
      (hero) => !picked.some((piece) => piece.heroId === hero.id),
    );
    const heroPool = remaining.length ? remaining : pool;
    const hero = heroPool[Math.floor(roll.value * heroPool.length) % heroPool.length];
    const occupied = new Set(picked.map((piece) => piece.boardIndex));
    const formationSlots = [...FORMATIONS[formationId].cells].sort((a, b) => {
      const rowA = Math.floor(a / BOARD_COLUMNS);
      const rowB = Math.floor(b / BOARD_COLUMNS);
      const roleDirection = isBackline(hero.role) ? rowB - rowA : rowA - rowB;
      if (roleDirection !== 0) return roleDirection;
      const coreA = FORMATIONS[formationId].coreCells.includes(a) ? -1 : 1;
      const coreB = FORMATIONS[formationId].coreCells.includes(b) ? -1 : 1;
      if (coreA !== coreB) return coreA - coreB;
      return (
        Math.abs((a % BOARD_COLUMNS) - 3) - Math.abs((b % BOARD_COLUMNS) - 3)
      );
    });
    const fallbackRow = isBackline(hero.role)
      ? index % 2 === 0
        ? 3
        : 2
      : index % 2;
    const fallbackIndex =
      fallbackRow * BOARD_COLUMNS + COLUMN_ORDER[index % COLUMN_ORDER.length];
    const boardIndex =
      formationSlots.find((slot) => !occupied.has(slot)) ?? fallbackIndex;
    picked.push({
      uid: `${player.id}-${hero.id}-${index}`,
      heroId: hero.id,
      star: index === 0 && leaderStar === 2 ? 2 : 1,
      boardIndex,
    });
  }

  return picked;
};
