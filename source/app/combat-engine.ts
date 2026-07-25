import {
  HEROES,
  HERO_BY_ID,
  STAR_DEFENSE_MULTIPLIER,
  STAR_MULTIPLIER,
  synergyStatsFor,
  terrainModifierFor,
  type BattlefieldTheme,
  type Hero,
  type Role,
} from "./game-data";
import {
  TACTICS,
  type TacticId,
} from "./combat-config";
import {
  FORMATIONS,
  formationEffectsFor,
  formationTierForCount,
  type FormationId,
} from "./formation-config";
import {
  STATUS_META,
  TERRAIN_EVENT_META,
  type CombatImpact,
  type StatusKind,
} from "./combat-effects";
import {
  COMBAT_ALLY_FRONT_ROW,
  COMBAT_ENEMY_FRONT_ROW,
  COMBAT_GRID_COLUMNS,
  COMBAT_GRID_ROWS,
  COMBAT_TERRAIN_META,
  combatTerrainCellAt,
  combatTerrainGrid,
  isPathCell,
  type CombatTerrainKind,
} from "./combat-terrain";
import {
  COST_SKILL_POWER,
  STAR_GAUGE_RATE,
  itemStatsFor,
  ultimateGaugeForCost,
  type EquippedItems,
} from "./item-data";
import {
  combatDutyFor,
  dutyProfileFor,
  isSupportDuty,
  type CombatDuty,
} from "./combat-duty";

export type CombatSide = "ally" | "enemy";
export type CombatWinner = CombatSide | "draw";
export type CombatAction =
  | "idle"
  | "move"
  | "attack"
  | "skill"
  | "hurt"
  | "heal"
  | "defeated";

export type BoardCombatInput = {
  uid: string;
  heroId: string;
  star: 1 | 2 | 3;
  boardIndex: number;
  items?: EquippedItems;
};

export type CombatStatus = {
  kind: StatusKind;
  sourceId: string;
  remaining: number;
  power: number;
  appliedAt: number;
};

export type CombatUnit = {
  id: string;
  heroId: string;
  side: CombatSide;
  star: 1 | 2 | 3;
  row: number;
  column: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  shield: number;
  attack: number;
  defense: number;
  range: number;
  cooldown: number;
  /** 필살기 재사용까지 남은 행동 주기. 남발을 막기 위한 하드 락 */
  skillLock: number;
  action: CombatAction;
  statuses: CombatStatus[];
  skillCasts: number;
  formationMember: boolean;
  formationCore: boolean;
  formationFavored: boolean;
  terrainKind: CombatTerrainKind;
  /** 기본 공격 시 기력 수급 (성급·아이템 반영) */
  manaOnAttack: number;
  /** 피격 시 기력 수급 비율(최대 기력 대비) */
  manaOnHitRatio: number;
  /** 피격 시 추가 기력(아이템) */
  manaOnHitBonus: number;
  /** 필살기 위력 배율 */
  skillPower: number;
  critChance: number;
  lifesteal: number;
  thorns: number;
  damageReduce: number;
  healOnKill: number;
  duty: CombatDuty;
  targetId?: string;
};

export type CombatEvent = {
  id: string;
  tick: number;
  type:
    | "move"
    | "attack"
    | "skill"
    | "damage"
    | "heal"
    | "defeat"
    | "status"
    | "terrain";
  actorId: string;
  targetId?: string;
  amount?: number;
  label: string;
  status?: StatusKind;
  terrain?: BattlefieldTheme;
  impact?: CombatImpact;
  duration?: number;
};

export type BattleState = {
  tick: number;
  seed: number;
  theme: BattlefieldTheme;
  units: CombatUnit[];
  events: CombatEvent[];
  log: CombatEvent[];
  winner: CombatWinner | null;
  allyTactic: TacticId;
  enemyTactic: TacticId;
  allyFormation: FormationId;
  enemyFormation: FormationId;
  allyFormationTier: number;
  enemyFormationTier: number;
};

const BOARD_COLUMNS = 7;
const MAX_TICKS = 120;
const COMBAT_DURABILITY = 2.35;
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];
/** 기본 공격 1회당 기력 (성급·아이템 배율 전) */
const BASE_MANA_ON_ATTACK = 9;
/** 피격 1회당 최대 기력 대비 기본 비율 */
const BASE_MANA_ON_HIT_RATIO = 0.055;
/** 필살기 1회 후 재시전까지 최소 대기 틱 */
const SKILL_LOCK_TICKS = 11;
/** 장수당 한 전투 최대 필살기 횟수 */
const MAX_SKILL_CASTS = 2;
const STAR_SKILL_POWER = {
  1: 1,
  2: 1.16,
  3: 1.36,
} as const;

const roleCooldown: Record<Role, number> = {
  군주: 2,
  용장: 2,
  수호: 3,
  책사: 3,
  궁수: 2,
  기병: 1,
  암살: 1,
  지원: 3,
};

const rankModifierFor = (hero: Hero, boardIndex: number) => {
  const row = Math.floor(boardIndex / BOARD_COLUMNS);
  const frontline = ["수호", "용장", "기병"].includes(hero.role);
  const backline = ["궁수", "책사", "지원"].includes(hero.role);

  if (row === 0 && frontline) return 0.12;
  if (row === 1 && frontline) return 0.07;
  if (row === 2 && backline) return 0.07;
  if (row === 3 && backline) return 0.12;
  return 0;
};

const randomFromSeed = (seed: number) => {
  const nextSeed = (seed * 1664525 + 1013904223) >>> 0;
  return { seed: nextSeed, value: nextSeed / 4294967296 };
};

const distanceBetween = (a: CombatUnit, b: CombatUnit) =>
  Math.abs(a.row - b.row) + Math.abs(a.column - b.column);

/** 상하좌우만 이동 — 대각선 금지 */
const ORTHOGONAL_STEPS = [
  { rowDelta: -1, columnDelta: 0 },
  { rowDelta: 1, columnDelta: 0 },
  { rowDelta: 0, columnDelta: -1 },
  { rowDelta: 0, columnDelta: 1 },
] as const;

/** 장수 고유 사거리만 사용 (지형 사거리 보정 없음) */
const effectiveRange = (unit: CombatUnit) => unit.range;

/**
 * 통로가 아닌 타일(낭떠러지·수역·밀림)에서는 사거리 1이어도 공격 불가.
 * 원거리는 시야선이 비통로를 가로지르면 막힌다.
 */
const hasClearAttackLine = (
  from: Pick<CombatUnit, "row" | "column">,
  to: Pick<CombatUnit, "row" | "column">,
  theme: BattlefieldTheme,
) => {
  if (!isPathCell(theme, from.row, from.column)) return false;
  if (!isPathCell(theme, to.row, to.column)) return false;

  const steps =
    Math.abs(to.row - from.row) + Math.abs(to.column - from.column);
  if (steps <= 1) return true;

  for (let step = 1; step < steps; step += 1) {
    const row = Math.round(from.row + ((to.row - from.row) * step) / steps);
    const column = Math.round(
      from.column + ((to.column - from.column) * step) / steps,
    );
    if (row === from.row && column === from.column) continue;
    if (row === to.row && column === to.column) continue;
    if (!isPathCell(theme, row, column)) return false;
  }
  return true;
};

const canStrikeTarget = (
  actor: CombatUnit,
  target: CombatUnit,
  theme: BattlefieldTheme,
) =>
  distanceBetween(actor, target) <= effectiveRange(actor) &&
  hasClearAttackLine(actor, target, theme);

const terrainDamageMultiplier = (
  actor: CombatUnit,
  target: CombatUnit,
) => {
  const terrainStats = (kind: CombatTerrainKind) => {
    if (kind === "high") {
      return { attack: 0.1, defense: 0.04, elevation: 1 };
    }
    if (kind === "choke") {
      return { attack: 0, defense: 0.12, elevation: 0 };
    }
    if (kind === "rough") {
      return { attack: -0.04, defense: 0, elevation: 0 };
    }
    if (kind === "cover") {
      return { attack: 0.04, defense: 0.1, elevation: 0 };
    }
    return { attack: 0, defense: 0, elevation: 0 };
  };
  const actorTerrain = terrainStats(actor.terrainKind);
  const targetTerrain = terrainStats(target.terrainKind);
  const heightAdvantage =
    actorTerrain.elevation > targetTerrain.elevation ? 0.08 : 0;
  return Math.max(
    0.72,
    1 +
      actorTerrain.attack +
      heightAdvantage -
      targetTerrain.defense,
  );
};

const isBackline = (role: Role) =>
  role === "궁수" || role === "책사" || role === "지원";

const buildEnemyInputs = (
  count: number,
  level: number,
  initialSeed: number,
  leaderStar: 1 | 2,
  formationId: FormationId,
) => {
  const maxCost = Math.min(5, Math.max(3, Math.ceil(level / 2) + 1));
  const candidates = HEROES.filter((hero) => hero.cost <= maxCost);
  const picked: BoardCombatInput[] = [];
  let seed = initialSeed;

  for (let index = 0; index < count; index += 1) {
    const roll = randomFromSeed(seed);
    seed = roll.seed;
    const remaining = candidates.filter(
      (hero) => !picked.some((piece) => piece.heroId === hero.id),
    );
    const pool = remaining.length ? remaining : candidates;
    const hero = pool[Math.floor(roll.value * pool.length) % pool.length];
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
        Math.abs((a % BOARD_COLUMNS) - 3) -
        Math.abs((b % BOARD_COLUMNS) - 3)
      );
    });
    const fallbackRow = isBackline(hero.role)
      ? index % 2 === 0
        ? 3
        : 2
      : index % 2;
    const fallbackIndex =
      fallbackRow * BOARD_COLUMNS +
      COLUMN_ORDER[index % COLUMN_ORDER.length];
    const boardIndex =
      formationSlots.find((slot) => !occupied.has(slot)) ?? fallbackIndex;
    picked.push({
      uid: `enemy-${hero.id}-${index}`,
      heroId: hero.id,
      star: index === 0 && (leaderStar === 2 || level >= 8) ? 2 : 1,
      boardIndex,
    });
  }

  return { inputs: picked, seed };
};


const tacticModifiersFor = (hero: Hero, tactic: TacticId) => {
  if (!TACTICS[tactic].favoredRoles.includes(hero.role)) {
    return {
      attack: 0,
      defense: 0,
      health: 0,
      mana: 0,
      shield: 0,
    };
  }

  if (tactic === "assault") {
    return {
      attack: 0.15,
      defense: -0.04,
      health: 0,
      mana: 0,
      shield: 0,
    };
  }
  if (tactic === "fortress") {
    return {
      attack: -0.03,
      defense: 0.16,
      health: 0.13,
      mana: 0,
      shield: 0.1,
    };
  }
  if (tactic === "volley") {
    return {
      attack: 0.14,
      defense: -0.03,
      health: 0,
      mana: 18,
      shield: 0,
    };
  }
  return {
    attack: 0.1,
    defense: 0,
    health: 0.08,
    mana: 22,
    shield: 0,
  };
};

const makeCombatUnit = (
  piece: BoardCombatInput,
  side: CombatSide,
  theme: BattlefieldTheme,
  roster: BoardCombatInput[],
  tactic: TacticId,
  formationId: FormationId,
  formationTier: number,
  statScale: number,
): CombatUnit => {
  const hero = HERO_BY_ID[piece.heroId];
  const localDepth = Math.floor(piece.boardIndex / BOARD_COLUMNS);
  const lane = piece.boardIndex % BOARD_COLUMNS;
  const starScale = STAR_MULTIPLIER[piece.star];
  const defenseStarScale = STAR_DEFENSE_MULTIPLIER[piece.star];
  const terrain = terrainModifierFor(hero, theme, piece.star);
  const rank = rankModifierFor(hero, piece.boardIndex);
  const synergy = synergyStatsFor(roster, hero);
  const tacticModifier = tacticModifiersFor(hero, tactic);
  const formation = formationEffectsFor(
    hero,
    piece.boardIndex,
    formationId,
    formationTier,
  );
  const itemBonus = itemStatsFor(piece.items ?? [null, null]);
  const gaugeRate = STAR_GAUGE_RATE[piece.star];
  const maxMana = ultimateGaugeForCost(hero.cost);
  const totalModifier = Math.max(0.72, 1 + terrain + rank);
  const maxHp = Math.round(
    (hero.health *
      starScale *
      totalModifier *
      statScale *
      COMBAT_DURABILITY *
      (1 + tacticModifier.health + formation.health + synergy.health) +
      itemBonus.health),
  );
  const baseShield = hero.role === "수호" ? maxHp * 0.08 : 0;
  const column = Math.max(0, Math.min(COMBAT_GRID_COLUMNS - 1, lane));
  const row = Math.max(
    0,
    Math.min(
      COMBAT_GRID_ROWS - 1,
      side === "ally"
        ? COMBAT_ALLY_FRONT_ROW + localDepth
        : COMBAT_ENEMY_FRONT_ROW - localDepth,
    ),
  );
  const terrainKind = combatTerrainCellAt(theme, row, column).kind;

  return {
    id: `${side}-${piece.uid}`,
    heroId: piece.heroId,
    side,
    star: piece.star,
    row,
    column,
    hp: maxHp,
    maxHp,
    mana: 0,
    maxMana,
    shield: Math.round(
      baseShield +
        maxHp *
          (tacticModifier.shield +
            formation.shield +
            synergy.shield +
            itemBonus.startShield),
    ),
    attack: Math.round(
      (hero.attack *
        starScale *
        totalModifier *
        statScale *
        (1 + tacticModifier.attack + formation.attack + synergy.attack) +
        itemBonus.attack) *
        (combatDutyFor(hero) === "ranged-dps"
          ? 1.08
          : combatDutyFor(hero) === "mage-dps"
            ? 1.04
            : 1),
    ),
    defense: Math.round(
      hero.defense *
        defenseStarScale *
        totalModifier *
        statScale *
        (1 + tacticModifier.defense + formation.defense + synergy.defense) +
        itemBonus.defense,
    ),
    range: hero.range + itemBonus.rangeBonus,
    cooldown: side === "ally" ? 0 : 1,
    skillLock: 0,
    action: "idle",
    statuses: [],
    skillCasts: 0,
    formationMember: formation.isMember,
    formationCore: formation.isCore,
    formationFavored: formation.isFavored,
    terrainKind,
    manaOnAttack: Math.round(
      (BASE_MANA_ON_ATTACK + itemBonus.manaGain) * gaugeRate,
    ),
    manaOnHitRatio: BASE_MANA_ON_HIT_RATIO * gaugeRate,
    manaOnHitBonus: itemBonus.manaOnHitBonus,
    skillPower:
      COST_SKILL_POWER[hero.cost] *
        STAR_SKILL_POWER[piece.star] *
        (1 + itemBonus.skillPower),
    critChance: itemBonus.critChance,
    lifesteal: itemBonus.lifesteal,
    thorns: itemBonus.thorns,
    damageReduce: itemBonus.damageReduce,
    healOnKill: itemBonus.healOnKill,
    duty: combatDutyFor(hero),
  };
};

/** 아군은 하단(4~7), 적은 상단(0~3) 보행 가능 칸에 1인 1칸으로 강제 배치 */
const packUnitsOntoWalkableCells = (
  units: CombatUnit[],
  theme: BattlefieldTheme,
) => {
  const occupied = new Set<string>();
  const grid = combatTerrainGrid(theme);
  const prefersSide = (side: CombatSide, row: number) =>
    side === "ally"
      ? row >= COMBAT_ALLY_FRONT_ROW
      : row <= COMBAT_ENEMY_FRONT_ROW;

  [...units]
    .sort((a, b) => {
      if (a.side !== b.side) return a.side === "ally" ? -1 : 1;
      return a.row - b.row || a.column - b.column;
    })
    .forEach((unit) => {
      const candidates = grid
        .filter(
          (cell) =>
            cell.walkable && !occupied.has(`${cell.row}:${cell.column}`),
        )
        .sort((a, b) => {
          const sideA = prefersSide(unit.side, a.row) ? 0 : 1;
          const sideB = prefersSide(unit.side, b.row) ? 0 : 1;
          if (sideA !== sideB) return sideA - sideB;
          const distanceA = Math.max(
            Math.abs(a.row - unit.row),
            Math.abs(a.column - unit.column),
          );
          const distanceB = Math.max(
            Math.abs(b.row - unit.row),
            Math.abs(b.column - unit.column),
          );
          return (
            distanceA - distanceB ||
            a.row - b.row ||
            a.column - b.column
          );
        });
      const chosen = candidates[0];
      if (!chosen) return;
      unit.row = chosen.row;
      unit.column = chosen.column;
      unit.terrainKind = chosen.kind;
      occupied.add(`${unit.row}:${unit.column}`);
    });

  return units;
};

export const createBattleState = ({
  allies,
  enemyCount,
  level,
  theme,
  seed,
  allyTactic = "fortress",
  enemyTactic = "assault",
  allyFormation = "anhaeng",
  enemyFormation = "bongsi",
  enemyScale = 1,
  enemyLeaderStar = 1,
  enemies: enemyOverrides,
}: {
  allies: BoardCombatInput[];
  enemyCount: number;
  level: number;
  theme: BattlefieldTheme;
  seed: number;
  allyTactic?: TacticId;
  enemyTactic?: TacticId;
  allyFormation?: FormationId;
  enemyFormation?: FormationId;
  enemyScale?: number;
  enemyLeaderStar?: 1 | 2;
  /** When provided, skip procedural AI generation (PvP / ghost boards). */
  enemies?: BoardCombatInput[];
}): BattleState => {
  const enemies = enemyOverrides?.length
    ? { inputs: enemyOverrides, seed }
    : buildEnemyInputs(
        enemyCount,
        level,
        seed,
        enemyLeaderStar,
        enemyFormation,
      );
  const allyFormationCount = FORMATIONS[allyFormation].cells.filter((index) =>
    allies.some((piece) => piece.boardIndex === index),
  ).length;
  const enemyFormationCount = FORMATIONS[enemyFormation].cells.filter((index) =>
    enemies.inputs.some((piece) => piece.boardIndex === index),
  ).length;
  const allyFormationTier = formationTierForCount(
    allyFormation,
    allyFormationCount,
  );
  const enemyFormationTier = formationTierForCount(
    enemyFormation,
    enemyFormationCount,
  );
  const units = packUnitsOntoWalkableCells(
    [
      ...enemies.inputs.map((piece) =>
        makeCombatUnit(
          piece,
          "enemy",
          theme,
          enemies.inputs,
          enemyTactic,
          enemyFormation,
          enemyFormationTier,
          enemyScale,
        ),
      ),
      ...allies.map((piece) =>
        makeCombatUnit(
          piece,
          "ally",
          theme,
          allies,
          allyTactic,
          allyFormation,
          allyFormationTier,
          1,
        ),
      ),
    ],
    theme,
  );

  return {
    tick: 0,
    seed: enemies.seed,
    theme,
    units,
    events: [],
    log: [],
    winner: null,
    allyTactic,
    enemyTactic,
    allyFormation,
    enemyFormation,
    allyFormationTier,
    enemyFormationTier,
  };
};

const nearestTarget = (
  actor: CombatUnit,
  units: CombatUnit[],
  theme: BattlefieldTheme,
) => {
  const taunt = actor.statuses.find(
    (status) => status.kind === "taunt" && status.remaining > 0,
  );
  const taunter = taunt
    ? units.find(
        (unit) =>
          unit.id === taunt.sourceId &&
          unit.side !== actor.side &&
          unit.hp > 0,
      )
    : undefined;
  if (taunter) return taunter;

  const foes = units.filter((unit) => unit.side !== actor.side && unit.hp > 0);
  const strikeable = foes
    .filter((unit) => canStrikeTarget(actor, unit, theme))
    .sort((a, b) => {
      const distance = distanceBetween(actor, a) - distanceBetween(actor, b);
      if (distance !== 0) return distance;
      return a.hp - b.hp;
    });
  if (strikeable[0]) return strikeable[0];

  return foes.sort((a, b) => {
    const distance = distanceBetween(actor, a) - distanceBetween(actor, b);
    if (distance !== 0) return distance;
    return a.hp - b.hp;
  })[0];
};

const nextOpenPosition = (
  actor: CombatUnit,
  target: CombatUnit,
  units: CombatUnit[],
  theme: BattlefieldTheme,
) => {
  const occupied = new Set(
    units
      .filter((unit) => unit.hp > 0 && unit.id !== actor.id)
      .map((unit) => `${unit.row}:${unit.column}`),
  );
  const targetRange = effectiveRange(actor);
  type PathNode = {
    row: number;
    column: number;
    cost: number;
    first?: { row: number; column: number };
  };
  const frontier: PathNode[] = [
    { row: actor.row, column: actor.column, cost: 0 },
  ];
  const visited = new Map<string, number>([
    [`${actor.row}:${actor.column}`, 0],
  ]);

  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift();
    if (!current) break;
    if (current.first) {
      const stand = { row: current.row, column: current.column };
      const inRange =
        Math.abs(stand.row - target.row) +
          Math.abs(stand.column - target.column) <=
        targetRange;
      if (inRange && hasClearAttackLine(stand, target, theme)) {
        return combatTerrainCellAt(
          theme,
          current.first.row,
          current.first.column,
        );
      }
    }

    ORTHOGONAL_STEPS.forEach(({ rowDelta, columnDelta }) => {
      const row = current.row + rowDelta;
      const column = current.column + columnDelta;
      const cell = combatTerrainCellAt(theme, row, column);
      const key = `${row}:${column}`;
      if (
        row < 0 ||
        row >= COMBAT_GRID_ROWS ||
        column < 0 ||
        column >= COMBAT_GRID_COLUMNS ||
        !cell.walkable ||
        occupied.has(key)
      ) {
        return;
      }

      const nextCost = current.cost + cell.moveCost;
      if ((visited.get(key) ?? Number.POSITIVE_INFINITY) <= nextCost) return;
      visited.set(key, nextCost);
      frontier.push({
        row,
        column,
        cost: nextCost,
        first: current.first ?? { row, column },
      });
    });
  }

  return combatTerrainGrid(theme)
    .filter(
      (cell) =>
        cell.walkable &&
        !occupied.has(`${cell.row}:${cell.column}`) &&
        Math.abs(actor.row - cell.row) + Math.abs(actor.column - cell.column) ===
          1,
    )
    .sort(
      (a, b) =>
        Math.abs(a.row - target.row) +
          Math.abs(a.column - target.column) -
          (Math.abs(b.row - target.row) + Math.abs(b.column - target.column)) ||
        a.moveCost - b.moveCost,
    )[0];
};

const event = (
  tick: number,
  sequence: number,
  type: CombatEvent["type"],
  actorId: string,
  label: string,
  targetId?: string,
  amount?: number,
  details: Partial<
    Pick<
      CombatEvent,
      "status" | "terrain" | "impact" | "duration"
    >
  > = {},
): CombatEvent => ({
  id: `${tick}-${sequence}-${actorId}`,
  tick,
  type,
  actorId,
  targetId,
  amount,
  label,
  ...details,
});

const applyDamage = (
  target: CombatUnit,
  rawDamage: number,
  defenseFactor = 0.24,
  options?: { attacker?: CombatUnit; skipThorns?: boolean },
) => {
  const reduced = Math.round(
    rawDamage *
      (1 - target.damageReduce) *
      (target.statuses.some((status) => status.kind === "ward" && status.remaining > 0)
        ? 0.88
        : 1),
  );
  const mitigated = Math.max(
    10,
    Math.round(reduced - target.defense * defenseFactor),
  );
  const absorbed = Math.min(target.shield, mitigated);
  target.shield -= absorbed;
  const damage = mitigated - absorbed;
  target.hp = Math.max(0, target.hp - damage);
  /** 피격 게이지: 타격당 최대 기력의 일정 비율 + 아이템 보너스 */
  if (damage > 0 && target.hp > 0) {
    const hitMana =
      Math.max(2, Math.round(target.maxMana * target.manaOnHitRatio)) +
      target.manaOnHitBonus;
    target.mana = Math.min(target.maxMana, target.mana + hitMana);
  }
  if (
    options?.attacker &&
    !options.skipThorns &&
    target.thorns > 0 &&
    damage > 0 &&
    options.attacker.hp > 0
  ) {
    applyDamage(options.attacker, target.thorns, 0.08, { skipThorns: true });
  }
  target.action = target.hp > 0 ? "hurt" : "defeated";
  return damage;
};

const applyStatus = (
  source: CombatUnit | string,
  target: CombatUnit,
  kind: StatusKind,
  duration: number,
  power: number,
  tick: number,
  events: CombatEvent[],
) => {
  if (target.hp <= 0) return;
  const sourceId = typeof source === "string" ? source : source.id;
  const current = target.statuses.find((status) => status.kind === kind);
  if (current) {
    current.sourceId = sourceId;
    current.remaining = Math.max(current.remaining, duration);
    current.power = Math.max(current.power, power);
    current.appliedAt = tick;
  } else {
    target.statuses.push({
      kind,
      sourceId,
      remaining: duration,
      power,
      appliedAt: tick,
    });
  }
  events.push(
    event(
      tick,
      events.length,
      "status",
      sourceId,
      `${HERO_BY_ID[target.heroId].name} · ${STATUS_META[kind].label}`,
      target.id,
      undefined,
      { status: kind, duration },
    ),
  );
};

const recordDefeat = (
  actorId: string,
  target: CombatUnit,
  tick: number,
  events: CombatEvent[],
) => {
  if (target.hp > 0) return;
  events.push(
    event(
      tick,
      events.length,
      "defeat",
      actorId,
      `${HERO_BY_ID[target.heroId].name} 전사`,
      target.id,
    ),
  );
};

const strike = (
  actor: CombatUnit,
  target: CombatUnit,
  multiplier: number,
  label: string,
  tick: number,
  events: CombatEvent[],
  impact: CombatImpact = "light",
) => {
  const powerScale = impact === "ultimate" ? actor.skillPower : 1;
  const damage = applyDamage(
    target,
    actor.attack *
      multiplier *
      powerScale *
      terrainDamageMultiplier(actor, target),
    0.24,
    { attacker: actor },
  );
  if (actor.lifesteal > 0 && damage > 0 && actor.hp > 0) {
    actor.hp = Math.min(
      actor.maxHp,
      actor.hp + Math.round(damage * actor.lifesteal),
    );
  }
  if (target.hp <= 0 && actor.healOnKill > 0 && actor.hp > 0) {
    actor.hp = Math.min(
      actor.maxHp,
      actor.hp + Math.round(actor.maxHp * actor.healOnKill),
    );
  }
  events.push(
    event(
      tick,
      events.length,
      "damage",
      actor.id,
      target.hp > 0 ? label : `${label} · 격파`,
      target.id,
      damage,
      { impact },
    ),
  );
  recordDefeat(actor.id, target, tick, events);
  return damage;
};

const healUnit = (
  actor: CombatUnit,
  target: CombatUnit,
  amount: number,
  label: string,
  tick: number,
  events: CombatEvent[],
) => {
  const effective = Math.max(
    0,
    Math.min(target.maxHp - target.hp, Math.round(amount)),
  );
  target.hp += effective;
  target.action = "heal";
  events.push(
    event(
      tick,
      events.length,
      "heal",
      actor.id,
      label,
      target.id,
      effective,
    ),
  );
};

const alliesInRadius = (
  actor: CombatUnit,
  units: CombatUnit[],
  radius: number,
  includeSelf = false,
) =>
  units.filter(
    (unit) =>
      unit.side === actor.side &&
      unit.hp > 0 &&
      (includeSelf || unit.id !== actor.id) &&
      distanceBetween(actor, unit) <= radius,
  );

const lowestAlly = (actor: CombatUnit, units: CombatUnit[]) =>
  units
    .filter((unit) => unit.side === actor.side && unit.hp > 0)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];

/** 힐러·버퍼·오라의 기본 지원 행동. 성공하면 true */
const trySupportAction = (
  actor: CombatUnit,
  units: CombatUnit[],
  tick: number,
  events: CombatEvent[],
  seedValue: number,
) => {
  if (!isSupportDuty(actor.duty)) return false;
  const profile = dutyProfileFor(HERO_BY_ID[actor.heroId]);
  const wounded = lowestAlly(actor, units);
  const needsHeal = wounded && wounded.hp / wounded.maxHp < 0.85;

  if (actor.duty === "healer") {
    if (!wounded || wounded.hp >= wounded.maxHp) return false;
    if (!needsHeal && seedValue > profile.supportBias) return false;
    const amount = Math.round(
      actor.attack * (1.15 + actor.star * 0.22) + actor.maxHp * 0.04,
    );
    healUnit(actor, wounded, amount, `${HERO_BY_ID[actor.heroId].name} · 치유`, tick, events);
    applyStatus(actor, wounded, "regen", 2, Math.round(actor.attack * 0.12), tick, events);
    actor.action = "heal";
    actor.targetId = wounded.id;
    actor.cooldown = 2;
    actor.mana = Math.min(actor.maxMana, actor.mana + Math.round(actor.manaOnAttack * 0.7));
    return true;
  }

  if (actor.duty === "buffer") {
    const nearby = alliesInRadius(actor, units, 2, true);
    if (!nearby.length) return false;
    if (seedValue > profile.supportBias && !needsHeal) return false;
    nearby.slice(0, 3).forEach((ally) => {
      applyStatus(
        actor,
        ally,
        "inspire",
        3,
        Math.round(actor.attack * 0.08),
        tick,
        events,
      );
      applyStatus(actor, ally, "ward", 3, 0, tick, events);
      ally.shield += Math.round(ally.maxHp * 0.04);
    });
    actor.action = "heal";
    actor.targetId = nearby[0]?.id;
    actor.cooldown = 2;
    actor.mana = Math.min(actor.maxMana, actor.mana + actor.manaOnAttack);
    events.push(
      event(
        tick,
        events.length,
        "heal",
        actor.id,
        `${HERO_BY_ID[actor.heroId].name} · 진형 고무`,
        nearby[0]?.id,
        nearby.length,
      ),
    );
    return true;
  }

  if (actor.duty === "aura" || actor.duty === "commander") {
    const radius = actor.duty === "commander" ? 3 : 2;
    const nearby = alliesInRadius(actor, units, radius, true);
    if (!nearby.length) return false;
    if (seedValue > profile.supportBias && !(needsHeal && wounded)) return false;
    nearby.forEach((ally) => {
      const mend = Math.round(actor.attack * (actor.duty === "commander" ? 0.35 : 0.55));
      if (ally.hp < ally.maxHp) {
        healUnit(
          actor,
          ally,
          mend,
          `${HERO_BY_ID[actor.heroId].name} · 가호`,
          tick,
          events,
        );
      }
      ally.shield += Math.round(ally.maxHp * (actor.duty === "commander" ? 0.03 : 0.045));
      applyStatus(actor, ally, "ward", 2, 0, tick, events);
    });
    actor.action = "heal";
    actor.targetId = wounded?.id ?? nearby[0]?.id;
    actor.cooldown = actor.duty === "commander" ? 3 : 2;
    actor.mana = Math.min(actor.maxMana, actor.mana + actor.manaOnAttack);
    return true;
  }

  return false;
};

const enemiesAround = (
  actor: CombatUnit,
  center: CombatUnit,
  units: CombatUnit[],
  radius = 1,
  limit = 4,
) =>
  units
    .filter(
      (unit) =>
        unit.side !== actor.side &&
        unit.hp > 0 &&
        distanceBetween(unit, center) <= radius,
    )
    .sort((a, b) => distanceBetween(a, center) - distanceBetween(b, center))
    .slice(0, limit);

const castIconicSkill = (
  actor: CombatUnit,
  target: CombatUnit,
  units: CombatUnit[],
  theme: BattlefieldTheme,
  tick: number,
  events: CombatEvent[],
) => {
  const hero = HERO_BY_ID[actor.heroId];
  const foes = units.filter(
    (unit) => unit.side !== actor.side && unit.hp > 0,
  );
  const allies = units.filter(
    (unit) => unit.side === actor.side && unit.hp > 0,
  );
  const clustered = enemiesAround(actor, target, units);

  switch (actor.heroId) {
    case "guan-yu": {
      clustered.slice(0, 3).forEach((enemy, index) => {
        strike(
          actor,
          enemy,
          index === 0 ? 2.45 : 1.72,
          hero.skill,
          tick,
          events,
          index === 0 ? "ultimate" : "heavy",
        );
      });
      applyStatus(actor, target, "stun", 2, 0, tick, events);
      return true;
    }
    case "lu-bu": {
      foes
        .sort(
          (a, b) =>
            distanceBetween(actor, a) - distanceBetween(actor, b),
        )
        .slice(0, 3)
        .forEach((enemy, index) => {
          strike(
            actor,
            enemy,
            index === 0 ? 2.75 : 2.08,
            hero.skill,
            tick,
            events,
            index === 0 ? "ultimate" : "heavy",
          );
          applyStatus(actor, enemy, "fear", 2, 0, tick, events);
        });
      return true;
    }
    case "zhou-yu":
    case "zhu-rong": {
      const power = Math.round(actor.attack * 0.24);
      clustered.forEach((enemy, index) => {
        strike(
          actor,
          enemy,
          actor.heroId === "zhou-yu" ? 1.62 : 1.85,
          hero.skill,
          tick,
          events,
          index === 0 ? "ultimate" : "heavy",
        );
        applyStatus(actor, enemy, "burn", 4, power, tick, events);
      });
      return true;
    }
    case "cao-cao": {
      foes
        .sort(
          (a, b) =>
            distanceBetween(actor, a) - distanceBetween(actor, b),
        )
        .slice(0, 4)
        .forEach((enemy, index) => {
          strike(
            actor,
            enemy,
            1.28,
            hero.skill,
            tick,
            events,
            index === 0 ? "ultimate" : "heavy",
          );
          if (index < 2) {
            applyStatus(actor, enemy, "fear", 2, 0, tick, events);
          }
        });
      allies.forEach((ally) => {
        ally.shield += Math.round(ally.maxHp * 0.06);
      });
      return true;
    }
    case "liu-bei":
    case "hua-tuo": {
      allies
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
        .slice(0, 3)
        .forEach((ally) => {
          healUnit(
            actor,
            ally,
            actor.attack * (actor.heroId === "hua-tuo" ? 2.15 : 1.72),
            `${hero.skill} 회복`,
            tick,
            events,
          );
          ally.shield += Math.round(
            ally.maxHp * (actor.heroId === "liu-bei" ? 0.1 : 0.06),
          );
          ally.statuses = actor.heroId === "hua-tuo"
            ? []
            : ally.statuses.slice(1);
        });
      return true;
    }
    case "zhuge-liang": {
      clustered.slice(0, 4).forEach((enemy, index) => {
        strike(
          actor,
          enemy,
          1.76,
          hero.skill,
          tick,
          events,
          index === 0 ? "ultimate" : "heavy",
        );
        applyStatus(actor, enemy, "stun", 2, 0, tick, events);
      });
      return true;
    }
    case "zhang-fei": {
      actor.shield += Math.round(actor.maxHp * 0.24);
      foes
        .sort(
          (a, b) =>
            distanceBetween(actor, a) - distanceBetween(actor, b),
        )
        .slice(0, 3)
        .forEach((enemy, index) => {
          strike(
            actor,
            enemy,
            1.12,
            hero.skill,
            tick,
            events,
            index === 0 ? "ultimate" : "heavy",
          );
          applyStatus(actor, enemy, "fear", 2, 0, tick, events);
        });
      return true;
    }
    case "sima-yi": {
      foes
        .sort((a, b) => b.mana - a.mana)
        .slice(0, 3)
        .forEach((enemy, index) => {
          strike(
            actor,
            enemy,
            1.52,
            hero.skill,
            tick,
            events,
            index === 0 ? "ultimate" : "heavy",
          );
          enemy.mana = Math.max(0, enemy.mana - 28);
          applyStatus(
            actor,
            enemy,
            "poison",
            4,
            Math.round(actor.attack * 0.2),
            tick,
            events,
          );
        });
      return true;
    }
    case "zhao-yun": {
      const weakest = [...foes].sort(
        (a, b) => a.hp / a.maxHp - b.hp / b.maxHp,
      )[0];
      if (!weakest) return true;
      actor.targetId = weakest.id;
      if (!canStrikeTarget(actor, weakest, theme)) {
        const landing = nextOpenPosition(actor, weakest, units, theme);
        if (landing) {
          actor.row = landing.row;
          actor.column = landing.column;
          actor.terrainKind = landing.kind;
          actor.action = "move";
          actor.cooldown = Math.max(actor.cooldown, Math.max(1, landing.moveCost));
        }
        return true;
      }
      strike(
        actor,
        weakest,
        2.82,
        hero.skill,
        tick,
        events,
        "ultimate",
      );
      applyStatus(actor, weakest, "stun", 2, 0, tick, events);
      return true;
    }
    case "sun-ce": {
      clustered.slice(0, 3).forEach((enemy, index) => {
        strike(
          actor,
          enemy,
          index === 0 ? 2.38 : 1.58,
          hero.skill,
          tick,
          events,
          index === 0 ? "ultimate" : "heavy",
        );
      });
      applyStatus(actor, target, "stun", 2, 0, tick, events);
      return true;
    }
    case "diao-chan": {
      foes
        .sort((a, b) => b.attack - a.attack)
        .slice(0, 2)
        .forEach((enemy, index) => {
          strike(
            actor,
            enemy,
            1.18,
            hero.skill,
            tick,
            events,
            index === 0 ? "ultimate" : "heavy",
          );
          applyStatus(actor, enemy, "freeze", 3, 0, tick, events);
        });
      return true;
    }
    case "zhang-jiao": {
      foes
        .sort(
          (a, b) =>
            distanceBetween(actor, a) - distanceBetween(actor, b),
        )
        .slice(0, 4)
        .forEach((enemy, index) => {
          strike(
            actor,
            enemy,
            Math.max(1.12, 1.82 - index * 0.18),
            hero.skill,
            tick,
            events,
            index === 0 ? "ultimate" : "heavy",
          );
          if (index === 0 || actor.skillCasts % 3 === 0) {
            applyStatus(actor, enemy, "stun", 2, 0, tick, events);
          }
        });
      return true;
    }
    case "gan-ning": {
      const backline = [...foes].sort((a, b) =>
        actor.side === "ally" ? a.row - b.row : b.row - a.row,
      )[0];
      if (!backline) return true;
      actor.targetId = backline.id;
      strike(
        actor,
        backline,
        2.65,
        hero.skill,
        tick,
        events,
        "ultimate",
      );
      applyStatus(
        actor,
        backline,
        "poison",
        3,
        Math.round(actor.attack * 0.18),
        tick,
        events,
      );
      return true;
    }
    case "huang-zhong": {
      foes
        .sort(
          (a, b) =>
            Math.abs(a.column - target.column) -
            Math.abs(b.column - target.column),
        )
        .slice(0, 3)
        .forEach((enemy, index) => {
          strike(
            actor,
            enemy,
            index === 0 ? 2.52 : 1.46,
            hero.skill,
            tick,
            events,
            index === 0 ? "ultimate" : "heavy",
          );
        });
      applyStatus(actor, target, "stun", 2, 0, tick, events);
      return true;
    }
    default:
      return false;
  }
};

const castSkill = (
  actor: CombatUnit,
  target: CombatUnit,
  units: CombatUnit[],
  theme: BattlefieldTheme,
  tick: number,
  events: CombatEvent[],
) => {
  const hero = HERO_BY_ID[actor.heroId];
  actor.mana = 0;
  actor.skillCasts += 1;
  actor.skillLock = SKILL_LOCK_TICKS;
  actor.cooldown = Math.max(actor.cooldown, 2);
  actor.action = "skill";
  actor.targetId = target.id;
  events.push(
    event(
      tick,
      events.length,
      "skill",
      actor.id,
      `${hero.name} · ${hero.skill}`,
      target.id,
      undefined,
      { impact: "ultimate" },
    ),
  );

  if (castIconicSkill(actor, target, units, theme, tick, events)) return;

  if (actor.duty === "healer") {
    const allies = units
      .filter((unit) => unit.side === actor.side && unit.hp > 0)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    const amount = Math.round(actor.attack * 3.1 * actor.skillPower);
    allies.slice(0, 3).forEach((ally, index) => {
      healUnit(
        actor,
        ally,
        index === 0 ? amount : Math.round(amount * 0.55),
        `${hero.skill} 회복`,
        tick,
        events,
      );
      applyStatus(
        actor,
        ally,
        "regen",
        3,
        Math.round(actor.attack * 0.15),
        tick,
        events,
      );
    });
    return;
  }

  if (actor.duty === "buffer") {
    alliesInRadius(actor, units, 3, true).forEach((ally) => {
      applyStatus(
        actor,
        ally,
        "inspire",
        4,
        Math.round(actor.attack * 0.14),
        tick,
        events,
      );
      applyStatus(actor, ally, "ward", 4, 0, tick, events);
      ally.shield += Math.round(ally.maxHp * 0.08);
      healUnit(
        actor,
        ally,
        Math.round(actor.attack * 0.8 * actor.skillPower),
        `${hero.skill} 진형 강화`,
        tick,
        events,
      );
    });
    return;
  }

  if (actor.duty === "aura" || actor.duty === "commander") {
    const allies = units.filter(
      (unit) => unit.side === actor.side && unit.hp > 0,
    );
    allies.forEach((ally) => {
      healUnit(
        actor,
        ally,
        Math.round(
          actor.attack *
            (actor.duty === "commander" ? 1.1 : 1.6) *
            actor.skillPower,
        ),
        `${hero.skill} 가호`,
        tick,
        events,
      );
      applyStatus(actor, ally, "ward", 3, 0, tick, events);
      ally.shield += Math.round(
        ally.maxHp * (actor.duty === "commander" ? 0.05 : 0.07),
      );
    });
    return;
  }

  if (hero.role === "수호") {
    const amount = Math.round(actor.maxHp * 0.38);
    actor.shield += amount;
    actor.hp = Math.min(actor.maxHp, actor.hp + Math.round(amount * 0.4));
    events.push(
      event(
        tick,
        events.length,
        "heal",
        actor.id,
        `${hero.skill} 방벽`,
        actor.id,
        amount,
      ),
    );
    return;
  }

  const targets =
    hero.role === "책사" || hero.role === "군주"
      ? units
          .filter(
            (unit) =>
              unit.side !== actor.side &&
              unit.hp > 0 &&
              distanceBetween(unit, target) <= 1,
          )
          .slice(0, 3)
      : [target];
  const skillMultiplier =
    actor.duty === "ranged-dps"
      ? 3.55
      : actor.duty === "mage-dps"
        ? 3.05
        : hero.role === "궁수" || hero.role === "암살"
          ? 3.35
          : hero.role === "책사"
            ? 2.75
            : hero.role === "기병" || hero.role === "용장"
              ? 3.1
              : 2.9;

  targets.forEach((skillTarget, index) => {
    strike(
      actor,
      skillTarget,
      skillMultiplier,
      hero.skill,
      tick,
      events,
      index === 0 ? "ultimate" : "heavy",
    );
  });
};

const moveAwayFrom = (
  actor: CombatUnit,
  source: CombatUnit,
  units: CombatUnit[],
  theme: BattlefieldTheme,
) => {
  const occupied = new Set(
    units
      .filter((unit) => unit.hp > 0 && unit.id !== actor.id)
      .map((unit) => `${unit.row}:${unit.column}`),
  );
  const rowStep = Math.sign(actor.row - source.row);
  const columnStep = Math.sign(actor.column - source.column);
  const candidates = [
    { row: actor.row + rowStep, column: actor.column },
    { row: actor.row, column: actor.column + columnStep },
    { row: actor.row - rowStep, column: actor.column },
    { row: actor.row, column: actor.column - columnStep },
  ].filter(
    (candidate, index, list) =>
      (candidate.row !== actor.row || candidate.column !== actor.column) &&
      list.findIndex(
        (item) => item.row === candidate.row && item.column === candidate.column,
      ) === index,
  );
  const next = candidates.find(
    ({ row, column }) =>
      row >= 0 &&
      row < COMBAT_GRID_ROWS &&
      column >= 0 &&
      column < COMBAT_GRID_COLUMNS &&
      combatTerrainCellAt(theme, row, column).walkable &&
      !occupied.has(`${row}:${column}`),
  );
  if (next) {
    actor.row = next.row;
    actor.column = next.column;
    actor.terrainKind = combatTerrainCellAt(
      theme,
      next.row,
      next.column,
    ).kind;
  }
};

const processDamageOverTime = (
  units: CombatUnit[],
  tick: number,
  events: CombatEvent[],
) => {
  units.forEach((unit) => {
    if (unit.hp <= 0) return;
    unit.statuses
      .filter(
        (status) =>
          status.remaining > 0 &&
          status.appliedAt < tick &&
          (status.kind === "burn" ||
            status.kind === "poison" ||
            status.kind === "regen"),
      )
      .forEach((status) => {
        if (status.kind === "regen") {
          const healed = Math.min(
            unit.maxHp - unit.hp,
            Math.max(8, status.power),
          );
          if (healed <= 0) return;
          unit.hp += healed;
          events.push(
            event(
              tick,
              events.length,
              "heal",
              status.sourceId,
              "재생 회복",
              unit.id,
              healed,
              { status: "regen", impact: "light" },
            ),
          );
          return;
        }
        const damage = applyDamage(
          unit,
          status.power,
          status.kind === "poison" ? 0.04 : 0.12,
        );
        events.push(
          event(
            tick,
            events.length,
            "damage",
            status.sourceId,
            `${STATUS_META[status.kind].label} 피해`,
            unit.id,
            damage,
            { status: status.kind, impact: "light" },
          ),
        );
        recordDefeat(status.sourceId, unit, tick, events);
      });
  });
};

const terrainTargets = (
  units: CombatUnit[],
  selector: (unit: CombatUnit) => number,
) =>
  (["ally", "enemy"] as CombatSide[]).flatMap((side) => {
    const target = units
      .filter((unit) => unit.side === side && unit.hp > 0)
      .sort((a, b) => selector(a) - selector(b))[0];
    return target ? [target] : [];
  });

const resolveTerrainEvent = (
  theme: BattlefieldTheme,
  units: CombatUnit[],
  tick: number,
  events: CombatEvent[],
) => {
  if (tick !== 1 && tick % 12 !== 0) return;
  const meta = TERRAIN_EVENT_META[theme];
  const sourceId = `terrain-${meta.slug}`;
  events.push(
    event(
      tick,
      events.length,
      "terrain",
      sourceId,
      `${meta.label} · ${meta.description}`,
      undefined,
      undefined,
      { terrain: theme, impact: theme === "평지" ? "light" : "heavy" },
    ),
  );

  if (theme === "평지") {
    units
      .filter(
        (unit) =>
          unit.hp > 0 &&
          ["기병", "용장"].includes(HERO_BY_ID[unit.heroId].role),
      )
      .forEach((unit) => {
        unit.attack = Math.round(unit.attack * 1.06);
      });
    return;
  }

  if (theme === "산지") {
    const cliffs = combatTerrainGrid(theme).filter(
      (cell) => cell.kind === "cliff",
    );
    const cliffDistance = (unit: CombatUnit) =>
      Math.min(
        ...cliffs.map((cell) =>
          Math.max(
            Math.abs(unit.row - cell.row),
            Math.abs(unit.column - cell.column),
          ),
        ),
      );
    terrainTargets(units, cliffDistance).forEach(
      (target) => {
        const isFall = cliffDistance(target) <= 1;
        const damage = applyDamage(
          target,
          Math.max(52, target.maxHp * (isFall ? 0.16 : 0.07)),
          0.08,
        );
        events.push(
          event(
            tick,
            events.length,
            "damage",
            sourceId,
            isFall ? "낭떠러지 추락" : "낙석 충돌",
            target.id,
            damage,
            { terrain: theme, impact: "heavy" },
          ),
        );
        applyStatus(sourceId, target, "stun", 2, 0, tick, events);
        recordDefeat(sourceId, target, tick, events);
      },
    );
    return;
  }

  if (theme === "바다") {
    terrainTargets(units, (unit) => Math.abs(unit.column - 3)).forEach(
      (target) => {
        const source: CombatUnit = {
          ...target,
          column: target.column,
          row:
            target.side === "ally"
              ? COMBAT_ALLY_FRONT_ROW
              : COMBAT_ENEMY_FRONT_ROW,
        };
        moveAwayFrom(target, source, units, theme);
        applyStatus(sourceId, target, "freeze", 2, 0, tick, events);
      },
    );
    return;
  }

  if (theme === "습지") {
    terrainTargets(units, (unit) => {
      const role = HERO_BY_ID[unit.heroId].role;
      return ["기병", "용장", "수호"].includes(role) ? 0 : 10;
    }).forEach((target) => {
      applyStatus(sourceId, target, "freeze", 2, 0, tick, events);
      applyStatus(
        sourceId,
        target,
        "poison",
        3,
        Math.round(target.maxHp * 0.025),
        tick,
        events,
      );
    });
    return;
  }

  if (theme === "정글") {
    terrainTargets(
      units,
      (unit) => unit.hp / unit.maxHp + Math.abs(unit.column - 3.5) * 0.03,
    ).forEach((target) => {
      applyStatus(
        sourceId,
        target,
        "poison",
        4,
        Math.round(target.maxHp * 0.03),
        tick,
        events,
      );
    });
    return;
  }

  terrainTargets(units, (unit) => {
    const role = HERO_BY_ID[unit.heroId].role;
    return ["궁수", "책사", "지원"].includes(role) ? 0 : 10;
  }).forEach((target) => {
    applyStatus(sourceId, target, "fear", 2, 0, tick, events);
  });
};

export const advanceBattle = (previous: BattleState): BattleState => {
  if (previous.winner) return previous;

  const tick = previous.tick + 1;
  const units: CombatUnit[] = previous.units.map(
    (unit): CombatUnit => ({
      ...unit,
      statuses: unit.statuses.map((status) => ({ ...status })),
      action: unit.hp > 0 ? "idle" : "defeated",
      cooldown: Math.max(0, unit.cooldown - 1),
      skillLock: Math.max(0, unit.skillLock - 1),
    }),
  );
  const events: CombatEvent[] = [];
  let seed = previous.seed;
  processDamageOverTime(units, tick, events);
  resolveTerrainEvent(previous.theme, units, tick, events);
  const actingOrder = [...units]
    .filter((unit) => unit.hp > 0)
    .sort((a, b) => {
      if (a.side !== b.side) {
        if (tick % 2 === 0) return a.side === "ally" ? -1 : 1;
        return a.side === "enemy" ? -1 : 1;
      }
      return a.id.localeCompare(b.id);
    });

  actingOrder.forEach((orderedActor) => {
    const actor = units.find((unit) => unit.id === orderedActor.id);
    if (!actor || actor.hp <= 0 || actor.cooldown > 0) return;
    if (
      actor.statuses.some(
        (status) =>
          status.remaining > 0 &&
          (status.kind === "stun" || status.kind === "freeze"),
      )
    ) {
      actor.cooldown = 1;
      return;
    }
    const fear = actor.statuses.find(
      (status) => status.kind === "fear" && status.remaining > 0,
    );
    if (fear) {
      const source = units.find(
        (unit) => unit.id === fear.sourceId && unit.hp > 0,
      );
      if (source) {
        moveAwayFrom(actor, source, units, previous.theme);
        actor.action = "move";
        actor.targetId = source.id;
      }
      actor.cooldown = 1;
      events.push(
        event(
          tick,
          events.length,
          "status",
          fear.sourceId,
          `${HERO_BY_ID[actor.heroId].name} · 공포 후퇴`,
          actor.id,
          undefined,
          { status: "fear", duration: fear.remaining },
        ),
      );
      return;
    }
    const target = nearestTarget(actor, units, previous.theme);
    if (!target) return;

    const supportRoll = randomFromSeed(seed);
    seed = supportRoll.seed;
    if (
      trySupportAction(
        actor,
        units,
        tick,
        events,
        supportRoll.value,
      )
    ) {
      return;
    }

    if (!canStrikeTarget(actor, target, previous.theme)) {
      const position = nextOpenPosition(
        actor,
        target,
        units,
        previous.theme,
      );
      if (position) {
        actor.row = position.row;
        actor.column = position.column;
        actor.terrainKind = position.kind;
        actor.action = "move";
        actor.targetId = target.id;
        /** 이동한 틱에는 공격 불가 — 이동 비용만큼 대기 */
        actor.cooldown = Math.max(1, position.moveCost);
        events.push(
          event(
            tick,
            events.length,
            "move",
            actor.id,
            `${HERO_BY_ID[actor.heroId].name} · ${COMBAT_TERRAIN_META[position.kind].label} 진입`,
            target.id,
          ),
        );
      }
      return;
    }

    /** 사거리 안이면 제자리 공격만 — 이동과 공격은 같은 행동에 불가 */
    actor.targetId = target.id;
    actor.cooldown = roleCooldown[HERO_BY_ID[actor.heroId].role];
    const canUlt =
      actor.mana >= actor.maxMana &&
      actor.skillLock <= 0 &&
      actor.skillCasts < MAX_SKILL_CASTS;
    if (canUlt) {
      castSkill(actor, target, units, previous.theme, tick, events);
      return;
    }

    const roll = randomFromSeed(seed);
    seed = roll.seed;
    const roleCrit =
      actor.duty === "ranged-dps" || actor.duty === "assassin"
        ? 0.2
        : HERO_BY_ID[actor.heroId].role === "궁수" ||
            HERO_BY_ID[actor.heroId].role === "암살"
          ? 0.18
          : 0.06;
    const critical = roll.value < roleCrit + actor.critChance;
    const inspireBonus = actor.statuses.some(
      (status) => status.kind === "inspire" && status.remaining > 0,
    )
      ? 1.12
      : 1;
    const dutyBonus =
      actor.duty === "ranged-dps"
        ? 1.1
        : actor.duty === "mage-dps"
          ? 1.06
          : 1;
    actor.action = "attack";
    const damage = applyDamage(
      target,
      actor.attack *
        (1.02 + roll.value * 0.2) *
        (critical ? 1.55 : 1) *
        inspireBonus *
        dutyBonus *
        terrainDamageMultiplier(actor, target),
      0.24,
      { attacker: actor },
    );
    if (actor.lifesteal > 0 && damage > 0) {
      actor.hp = Math.min(
        actor.maxHp,
        actor.hp + Math.round(damage * actor.lifesteal),
      );
    }
    if (target.hp <= 0 && actor.healOnKill > 0) {
      actor.hp = Math.min(
        actor.maxHp,
        actor.hp + Math.round(actor.maxHp * actor.healOnKill),
      );
    }
    actor.mana = Math.min(actor.maxMana, actor.mana + actor.manaOnAttack);
    events.push(
      event(
        tick,
        events.length,
        "attack",
        actor.id,
        critical ? "치명타" : "기본 공격",
        target.id,
        damage,
        { impact: critical ? "heavy" : "light" },
      ),
    );
    recordDefeat(actor.id, target, tick, events);
  });

  units.forEach((unit) => {
    unit.statuses = unit.statuses
      .map((status) =>
        status.appliedAt === tick
          ? status
          : { ...status, remaining: status.remaining - 1 },
      )
      .filter((status) => status.remaining > 0);
  });

  const alliesAlive = units.some(
    (unit) => unit.side === "ally" && unit.hp > 0,
  );
  const enemiesAlive = units.some(
    (unit) => unit.side === "enemy" && unit.hp > 0,
  );
  let winner: CombatWinner | null = null;

  if (!alliesAlive && !enemiesAlive) winner = "draw";
  else if (!enemiesAlive) winner = "ally";
  else if (!alliesAlive) winner = "enemy";
  else if (tick >= MAX_TICKS) {
    const allyHp = units
      .filter((unit) => unit.side === "ally")
      .reduce((sum, unit) => sum + unit.hp / unit.maxHp, 0);
    const enemyHp = units
      .filter((unit) => unit.side === "enemy")
      .reduce((sum, unit) => sum + unit.hp / unit.maxHp, 0);
    winner =
      Math.abs(allyHp - enemyHp) < 0.05
        ? "draw"
        : allyHp > enemyHp
          ? "ally"
          : "enemy";
  }

  return {
    tick,
    seed,
    theme: previous.theme,
    units,
    events,
    log: [...events.filter((item) => item.type !== "move"), ...previous.log].slice(
      0,
      10,
    ),
    winner,
    allyTactic: previous.allyTactic,
    enemyTactic: previous.enemyTactic,
    allyFormation: previous.allyFormation,
    enemyFormation: previous.enemyFormation,
    allyFormationTier: previous.allyFormationTier,
    enemyFormationTier: previous.enemyFormationTier,
  };
};

export const simulateBattleToEnd = (state: BattleState) => {
  let current = state;
  while (!current.winner) current = advanceBattle(current);
  return current;
};
