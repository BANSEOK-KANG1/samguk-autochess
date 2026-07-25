import {
  BATTLEFIELD_FEATURES,
  FORMATION_CELLS,
  FORMATION_COUNTERS,
  FORMATION_META,
  TERRAIN_FEATURE_META,
  TACTICS,
  TROOP_META,
  commanderEffectFor,
  type ArmyFormationId,
  type Regiment,
  type TacticId,
  type TerrainFeature,
  type TroopKind,
} from "./army-data";
import {
  HERO_BY_ID,
  type BattlefieldTheme,
} from "./game-data";

export type ArmySide = "ally" | "enemy";
export type ArmyWinner = ArmySide | "draw";
export type ArmyAction =
  | "idle"
  | "advance"
  | "volley"
  | "clash"
  | "charge"
  | "rally"
  | "routed";

export type ArmyBattleUnit = {
  id: string;
  sourceRegimentId: string;
  side: ArmySide;
  name: string;
  kind: TroopKind;
  troops: number;
  maxTroops: number;
  morale: number;
  maxMorale: number;
  row: number;
  column: number;
  attack: number;
  armor: number;
  range: number;
  mobility: number;
  cadence: number;
  cooldown: number;
  commanderId?: string;
  commanderReady: number;
  terrain: TerrainFeature;
  action: ArmyAction;
  targetId?: string;
  formationMember: boolean;
  veterancy: number;
};

export type ArmyBattleEvent = {
  id: string;
  tick: number;
  type:
    | "move"
    | "attack"
    | "casualty"
    | "morale"
    | "commander"
    | "rout"
    | "terrain";
  actorId: string;
  targetId?: string;
  amount?: number;
  label: string;
  tone?: "ally" | "enemy" | "terrain";
};

export type ArmyBattleState = {
  tick: number;
  seed: number;
  turn: number;
  theme: BattlefieldTheme;
  tactic: TacticId;
  enemyTactic: TacticId;
  formation: ArmyFormationId;
  enemyFormation: ArmyFormationId;
  units: ArmyBattleUnit[];
  events: ArmyBattleEvent[];
  log: ArmyBattleEvent[];
  winner: ArmyWinner | null;
};

export type EnemyIntel = {
  regiments: Regiment[];
  tactic: TacticId;
  formation: ArmyFormationId;
  commanderId?: string;
  confidence: "확정";
};

const BOARD_COLUMNS = 7;
const MAX_TICKS = 56;

const seeded = (seed: number) => {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return { next, value: next / 4294967296 };
};

const event = (
  tick: number,
  index: number,
  type: ArmyBattleEvent["type"],
  actorId: string,
  label: string,
  targetId?: string,
  amount?: number,
  tone?: ArmyBattleEvent["tone"],
): ArmyBattleEvent => ({
  id: `${tick}-${index}-${actorId}`,
  tick,
  type,
  actorId,
  targetId,
  amount,
  label,
  tone,
});

const distance = (a: ArmyBattleUnit, b: ArmyBattleUnit) =>
  Math.max(Math.abs(a.row - b.row), Math.abs(a.column - b.column));

const localPositionFor = (side: ArmySide, position: number) => {
  const localRow = Math.floor(position / BOARD_COLUMNS);
  const column = position % BOARD_COLUMNS;
  return {
    row: side === "ally" ? 4 + localRow : 3 - localRow,
    column,
  };
};

const featureForCombatPosition = (
  theme: BattlefieldTheme,
  side: ArmySide,
  row: number,
  column: number,
) => {
  const localRow = side === "ally" ? row - 4 : 3 - row;
  const localIndex =
    Math.max(0, Math.min(3, localRow)) * BOARD_COLUMNS + column;
  return BATTLEFIELD_FEATURES[theme][localIndex];
};

const createUnit = (
  regiment: Regiment,
  side: ArmySide,
  theme: BattlefieldTheme,
  tacticId: TacticId,
  formationId: ArmyFormationId,
  opponentFormationId: ArmyFormationId,
  turnScale: number,
): ArmyBattleUnit => {
  const meta = TROOP_META[regiment.kind];
  const tactic = TACTICS[tacticId];
  const formation = FORMATION_META[formationId];
  const position = localPositionFor(side, regiment.position);
  const feature = featureForCombatPosition(
    theme,
    side,
    position.row,
    position.column,
  );
  const terrain = TERRAIN_FEATURE_META[feature];
  const isTerrainFavored = terrain.favoredTroops.includes(regiment.kind);
  const formationMember = FORMATION_CELLS[formationId].includes(
    regiment.position,
  );
  const hasFormationCounter =
    FORMATION_COUNTERS[formationId].includes(opponentFormationId);
  const formationFavored =
    formationMember && formation.favoredTroops.includes(regiment.kind);
  const commander = regiment.commanderId
    ? HERO_BY_ID[regiment.commanderId]
    : undefined;
  const command = commander ? commanderEffectFor(commander) : undefined;
  const commanderFavored = command?.favoredTroop === regiment.kind;
  const terrainMastery = command?.terrainMastery.includes(theme);
  const terrainScale = isTerrainFavored ? 1 : 0.34;
  const formationScale = formationMember
    ? formationFavored
      ? 1
      : 0.45
    : 0;
  const commandScale = command
    ? commanderFavored
      ? 1
      : 0.48
    : 0;
  const maxMorale = Math.round(
    100 +
      tactic.morale +
      formation.morale * formationScale +
      (hasFormationCounter ? 5 : 0) +
      (command?.morale ?? 0) * commandScale +
      (feature === "오아시스" ? 8 : 0),
  );

  return {
    id: `${side}-${regiment.id}`,
    sourceRegimentId: regiment.id,
    side,
    name: regiment.name,
    kind: regiment.kind,
    troops: Math.round(regiment.troops * turnScale),
    maxTroops: Math.round(regiment.maxTroops * turnScale),
    morale: maxMorale,
    maxMorale,
    row: position.row,
    column: position.column,
    attack: Math.round(
      meta.attack *
        (1 +
          tactic.attack +
          terrain.attack * terrainScale +
          formation.attack * formationScale +
          (hasFormationCounter ? 0.08 : 0) +
          (command?.attack ?? 0) * commandScale +
          regiment.veterancy * 0.025 +
          (terrainMastery ? 0.08 : 0)),
    ),
    armor: Math.round(
      meta.armor *
        (1 +
          tactic.armor +
          terrain.armor * terrainScale +
          formation.armor * formationScale +
          (command?.armor ?? 0) * commandScale +
          regiment.veterancy * 0.02),
    ),
    range: Math.max(
      1,
      meta.range +
        terrain.range * (isTerrainFavored ? 1 : 0) +
        (command?.range ?? 0),
    ),
    mobility: Math.max(
      1,
      meta.mobility +
        tactic.mobility +
        (isTerrainFavored ? terrain.mobility : Math.min(0, terrain.mobility)) +
        (command?.mobility ?? 0),
    ),
    cadence: meta.cadence,
    cooldown: side === "ally" ? 0 : 1,
    commanderId: regiment.commanderId,
    commanderReady: 3,
    terrain: feature,
    action: "idle",
    formationMember,
    veterancy: regiment.veterancy,
  };
};

const enemyRegimentsFor = (
  turn: number,
  theme: BattlefieldTheme,
  seed: number,
) => {
  const themeTroops: Record<BattlefieldTheme, TroopKind[]> = {
    평지: ["기병", "보병", "창병", "궁병"],
    산지: ["창병", "궁병", "방패병", "보병"],
    바다: ["수군", "궁병", "수군", "창병"],
    습지: ["수군", "창병", "궁병", "방패병"],
    정글: ["보병", "궁병", "창병", "기병"],
    사막: ["기병", "궁병", "보병", "창병"],
  };
  const count = Math.min(8, 4 + Math.floor(turn / 2));
  const positions = [3, 9, 11, 16, 18, 22, 24, 26];
  const troops = themeTroops[theme];
  let nextSeed = seed;

  return Array.from({ length: count }, (_, index) => {
    const roll = seeded(nextSeed);
    nextSeed = roll.next;
    const kind = troops[(index + Math.floor(roll.value * troops.length)) %
      troops.length];
    const maxTroops = 720 + turn * 58 + Math.round(roll.value * 240);
    return {
      id: `enemy-${turn}-${index}`,
      name: `${theme} ${TROOP_META[kind].subtitle} ${index + 1}대`,
      kind,
      troops: maxTroops,
      maxTroops,
      position: positions[index],
      commanderId: index === 0
        ? ["hua-xiong", "gao-shun", "zhang-bao-yellow", "yan-liang"][
            turn % 4
          ]
        : undefined,
      veterancy: Math.min(4, Math.floor(turn / 3)),
    } satisfies Regiment;
  });
};

export const enemyIntelFor = ({
  turn,
  theme,
  seed = 20260725,
}: {
  turn: number;
  theme: BattlefieldTheme;
  seed?: number;
}): EnemyIntel => {
  const enemyTactics: TacticId[] = [
    "line-hold",
    "high-ground",
    "flank",
    "ambush",
  ];
  const enemyFormations: ArmyFormationId[] = [
    "bongsi",
    "eorin",
    "hakik",
    "jangsa",
  ];
  const tactic = enemyTactics[(turn + 1) % enemyTactics.length];
  const formation = enemyFormations[(turn + 2) % enemyFormations.length];
  const regiments = enemyRegimentsFor(turn, theme, seed + turn * 97);

  return {
    regiments,
    tactic,
    formation,
    commanderId: regiments.find((regiment) => regiment.commanderId)
      ?.commanderId,
    confidence: "확정",
  };
};

export const createArmyBattleState = ({
  regiments,
  theme,
  tactic,
  formation,
  turn,
  seed = 20260725,
  enemyIntel,
}: {
  regiments: Regiment[];
  theme: BattlefieldTheme;
  tactic: TacticId;
  formation: ArmyFormationId;
  turn: number;
  seed?: number;
  enemyIntel?: EnemyIntel;
}): ArmyBattleState => {
  const intel = enemyIntel ?? enemyIntelFor({ turn, theme, seed });
  const enemyTactic = intel.tactic;
  const enemyFormation = intel.formation;
  const enemies = intel.regiments;

  return {
    tick: 0,
    seed,
    turn,
    theme,
    tactic,
    enemyTactic,
    formation,
    enemyFormation,
    units: [
      ...enemies.map((regiment) =>
        createUnit(
          regiment,
          "enemy",
          theme,
          enemyTactic,
          enemyFormation,
          formation,
          1,
        ),
      ),
      ...regiments
        .filter((regiment) => regiment.troops > 0)
        .map((regiment) =>
          createUnit(
            regiment,
            "ally",
            theme,
            tactic,
            formation,
            enemyFormation,
            1,
          ),
        ),
    ],
    events: [],
    log: [],
    winner: null,
  };
};

const chooseTarget = (
  actor: ArmyBattleUnit,
  units: ArmyBattleUnit[],
  tactic: TacticId,
) => {
  const enemies = units.filter(
    (unit) => unit.side !== actor.side && unit.troops > 0 && unit.morale > 0,
  );
  const counterKinds = TROOP_META[actor.kind].counter;

  return enemies.sort((a, b) => {
    if (tactic === "flank") {
      const backline = actor.side === "ally" ? a.row : 7 - a.row;
      const otherBackline = actor.side === "ally" ? b.row : 7 - b.row;
      if (backline !== otherBackline) return otherBackline - backline;
    }
    const counterA = counterKinds.includes(a.kind) ? -1 : 0;
    const counterB = counterKinds.includes(b.kind) ? -1 : 0;
    if (counterA !== counterB) return counterA - counterB;
    const range = distance(actor, a) - distance(actor, b);
    if (range !== 0) return range;
    return a.troops - b.troops;
  })[0];
};

const moveToward = (
  actor: ArmyBattleUnit,
  target: ArmyBattleUnit,
  units: ArmyBattleUnit[],
) => {
  const occupied = new Set(
    units
      .filter((unit) => unit.troops > 0 && unit.id !== actor.id)
      .map((unit) => `${unit.row}:${unit.column}`),
  );
  const rowStep = Math.sign(target.row - actor.row);
  const columnStep = Math.sign(target.column - actor.column);
  const options = [
    { row: actor.row + rowStep, column: actor.column + columnStep },
    { row: actor.row + rowStep, column: actor.column },
    { row: actor.row, column: actor.column + columnStep },
    { row: actor.row, column: actor.column - columnStep },
  ];
  const open = options.find(
    (position) =>
      position.row >= 0 &&
      position.row < 8 &&
      position.column >= 0 &&
      position.column < BOARD_COLUMNS &&
      !occupied.has(`${position.row}:${position.column}`),
  );

  if (open) {
    actor.row = open.row;
    actor.column = open.column;
    return true;
  }
  return false;
};

const triggerCommander = (
  actor: ArmyBattleUnit,
  target: ArmyBattleUnit,
  units: ArmyBattleUnit[],
  tick: number,
  events: ArmyBattleEvent[],
) => {
  if (!actor.commanderId || actor.commanderReady > 0) return false;
  const hero = HERO_BY_ID[actor.commanderId];
  const allies = units.filter(
    (unit) => unit.side === actor.side && unit.troops > 0,
  );
  const enemies = units.filter(
    (unit) => unit.side !== actor.side && unit.troops > 0,
  );
  actor.commanderReady = Math.max(3, 7 - hero.cost);
  actor.action = "rally";

  if (hero.role === "군주") {
    allies.forEach((unit) => {
      unit.morale = Math.min(unit.maxMorale, unit.morale + 8 + hero.cost * 2);
    });
  } else if (hero.role === "지원") {
    const weakest = [...allies].sort(
      (a, b) => a.troops / a.maxTroops - b.troops / b.maxTroops,
    )[0];
    if (weakest) {
      const reinforced = Math.min(
        weakest.maxTroops - weakest.troops,
        25 + hero.cost * 15,
      );
      weakest.troops += reinforced;
    }
  } else if (hero.role === "책사" || hero.role === "암살") {
    enemies
      .sort((a, b) => a.morale - b.morale)
      .slice(0, hero.cost >= 4 ? 2 : 1)
      .forEach((unit) => {
        unit.morale = Math.max(0, unit.morale - (10 + hero.cost * 2));
      });
  } else if (hero.role === "수호") {
    actor.armor += 7 + hero.cost * 2;
    actor.morale = Math.min(actor.maxMorale, actor.morale + 10);
  } else {
    const burst = Math.max(
      18,
      Math.round(actor.attack * (0.4 + hero.cost * 0.08)),
    );
    target.troops = Math.max(0, target.troops - burst);
    target.morale = Math.max(0, target.morale - Math.ceil(burst / 10));
  }

  events.push(
    event(
      tick,
      events.length,
      "commander",
      actor.id,
      `${hero.name} · ${hero.skill}`,
      target.id,
      hero.cost,
      actor.side,
    ),
  );
  return true;
};

const resolveWinner = (state: ArmyBattleState) => {
  const ally = state.units.filter(
    (unit) => unit.side === "ally" && unit.troops > 0 && unit.morale > 0,
  );
  const enemy = state.units.filter(
    (unit) => unit.side === "enemy" && unit.troops > 0 && unit.morale > 0,
  );
  if (!ally.length && !enemy.length) return "draw";
  if (!ally.length) return "enemy";
  if (!enemy.length) return "ally";
  if (state.tick < MAX_TICKS) return null;

  const score = (side: ArmySide) =>
    state.units
      .filter((unit) => unit.side === side)
      .reduce(
        (sum, unit) =>
          sum +
          Math.max(0, unit.troops) +
          Math.max(0, unit.morale) * 3,
        0,
      );
  const allyScore = score("ally");
  const enemyScore = score("enemy");
  if (Math.abs(allyScore - enemyScore) < 120) return "draw";
  return allyScore > enemyScore ? "ally" : "enemy";
};

export const advanceArmyBattle = (
  current: ArmyBattleState,
): ArmyBattleState => {
  if (current.winner) return current;
  const units = current.units.map((unit) => ({ ...unit }));
  const events: ArmyBattleEvent[] = [];
  const tick = current.tick + 1;
  let seed = current.seed;

  units.forEach((unit) => {
    unit.action = unit.troops > 0 ? "idle" : "routed";
    unit.cooldown = Math.max(0, unit.cooldown - 1);
    unit.commanderReady = Math.max(0, unit.commanderReady - 1);
    unit.terrain = featureForCombatPosition(
      current.theme,
      unit.side,
      unit.row,
      unit.column,
    );
  });

  const actingOrder = [...units]
    .filter((unit) => unit.troops > 0 && unit.morale > 0)
    .sort((a, b) => b.mobility - a.mobility || b.morale - a.morale);

  for (const actor of actingOrder) {
    if (actor.troops <= 0 || actor.morale <= 0) continue;
    const tactic =
      actor.side === "ally" ? current.tactic : current.enemyTactic;
    const target = chooseTarget(actor, units, tactic);
    if (!target) continue;
    actor.targetId = target.id;

    if (triggerCommander(actor, target, units, tick, events)) continue;

    if (distance(actor, target) > actor.range) {
      if (moveToward(actor, target, units)) {
        actor.action = "advance";
        actor.terrain = featureForCombatPosition(
          current.theme,
          actor.side,
          actor.row,
          actor.column,
        );
        events.push(
          event(
            tick,
            events.length,
            "move",
            actor.id,
            `${actor.name} · ${TERRAIN_FEATURE_META[actor.terrain].title} 진입`,
            undefined,
            undefined,
            "terrain",
          ),
        );
      }
      continue;
    }

    if (actor.cooldown > 0) continue;
    const roll = seeded(seed);
    seed = roll.next;
    const troopRatio = Math.max(0.22, actor.troops / actor.maxTroops);
    const counter = TROOP_META[actor.kind].counter.includes(target.kind)
      ? 1.23
      : TROOP_META[target.kind].counter.includes(actor.kind)
        ? 0.84
        : 1;
    const terrain = TERRAIN_FEATURE_META[actor.terrain];
    const terrainEdge = terrain.favoredTroops.includes(actor.kind)
      ? 1 + terrain.attack
      : 1;
    const tacticEdge = TACTICS[tactic].favoredTerrain.includes(current.theme)
      ? 1.07
      : 1;
    const raw =
      actor.attack *
      (0.45 + troopRatio * 0.55) *
      counter *
      terrainEdge *
      tacticEdge *
      (0.88 + roll.value * 0.24);
    const mitigation = 118 / (118 + target.armor);
    const casualties = Math.max(9, Math.round(raw * mitigation));
    const before = target.troops;
    target.troops = Math.max(0, target.troops - casualties);
    const actual = before - target.troops;
    const ranged = actor.range >= 3 && distance(actor, target) > 1;
    const cavalryCharge =
      actor.kind === "기병" && distance(actor, target) <= 1 && tick <= 8;
    actor.action = ranged ? "volley" : cavalryCharge ? "charge" : "clash";
    actor.cooldown = Math.max(1, actor.cadence - (actor.mobility >= 4 ? 1 : 0));
    target.morale = Math.max(
      0,
      target.morale -
        Math.max(2, Math.round(actual / 13)) -
        (cavalryCharge ? 6 : 0),
    );

    events.push(
      event(
        tick,
        events.length,
        "attack",
        actor.id,
        ranged
          ? `${actor.name} · 일제 사격`
          : cavalryCharge
            ? `${actor.name} · 측면 돌격`
            : `${actor.name} · 전열 교전`,
        target.id,
        actual,
        actor.side,
      ),
    );

    if (target.troops <= 0 || target.morale <= 0) {
      target.action = "routed";
      target.morale = 0;
      units
        .filter(
          (unit) =>
            unit.side === target.side &&
            unit.id !== target.id &&
            distance(unit, target) <= 1,
        )
        .forEach((unit) => {
          unit.morale = Math.max(0, unit.morale - 7);
        });
      events.push(
        event(
          tick,
          events.length,
          "rout",
          actor.id,
          `${target.name} 전열 붕괴`,
          target.id,
          actual,
          actor.side,
        ),
      );
    }
  }

  const next: ArmyBattleState = {
    ...current,
    tick,
    seed,
    units,
    events,
    log: [...current.log, ...events].slice(-80),
    winner: null,
  };
  next.winner = resolveWinner(next);
  return next;
};

export const simulateArmyBattleToEnd = (initial: ArmyBattleState) => {
  let state = initial;
  let guard = 0;
  while (!state.winner && guard < MAX_TICKS + 4) {
    state = advanceArmyBattle(state);
    guard += 1;
  }
  return state;
};

export const armyStrength = (regiments: Regiment[]) =>
  regiments.reduce((sum, regiment) => {
    const meta = TROOP_META[regiment.kind];
    const commander = regiment.commanderId
      ? HERO_BY_ID[regiment.commanderId]
      : undefined;
    return (
      sum +
      regiment.troops *
        (1 + regiment.veterancy * 0.04) *
        (1 + (meta.attack + meta.armor) / 500) *
        (1 + (commander?.cost ?? 0) * 0.035)
    );
  }, 0);
