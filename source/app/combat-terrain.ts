import type { BattlefieldTheme } from "./game-data";

export type CombatTerrainKind =
  | "ground"
  | "high"
  | "choke"
  | "rough"
  | "cover"
  | "water"
  | "cliff";

export type CombatTerrainCell = {
  row: number;
  column: number;
  kind: CombatTerrainKind;
  walkable: boolean;
  elevation: number;
  moveCost: number;
  attack: number;
  defense: number;
  range: number;
};

/**
 * 위아래 교전 전장: 7열(레인) × 8행
 * 적군 상단 0~3 · 아군 하단 4~7
 */
export const COMBAT_GRID_COLUMNS = 7;
export const COMBAT_GRID_ROWS = 8;
export const COMBAT_ALLY_FRONT_ROW = 4;
export const COMBAT_ENEMY_FRONT_ROW = 3;
/** @deprecated 좌우 교전 호환용 — 상하 전장에서는 FRONT_ROW 사용 */
export const COMBAT_ALLY_FRONT_COLUMN = COMBAT_ALLY_FRONT_ROW;
export const COMBAT_ENEMY_FRONT_COLUMN = COMBAT_ENEMY_FRONT_ROW;

export const COMBAT_TERRAIN_META: Record<
  CombatTerrainKind,
  {
    label: string;
    hanja: string;
    shortRule: string;
  }
> = {
  ground: {
    label: "통로",
    hanja: "道",
    shortRule: "이동·공격 가능",
  },
  high: {
    label: "고지 길",
    hanja: "高",
    shortRule: "공격 +10% · 이동 가능",
  },
  choke: {
    label: "협로",
    hanja: "隘",
    shortRule: "방어 +12% · 좁은 길",
  },
  rough: {
    label: "험로",
    hanja: "險",
    shortRule: "이동에 1행동 추가",
  },
  cover: {
    label: "밀림",
    hanja: "林",
    shortRule: "진입·공격 불가",
  },
  water: {
    label: "수역",
    hanja: "水",
    shortRule: "진입·공격 불가",
  },
  cliff: {
    label: "낭떠러지",
    hanja: "崖",
    shortRule: "진입·공격 불가",
  },
};

const SYMBOL_KIND = {
  g: "ground",
  h: "high",
  n: "choke",
  r: "rough",
  v: "cover",
  w: "water",
  c: "cliff",
} as const satisfies Record<string, CombatTerrainKind>;

/**
 * 8행 × 7열.
 * 위(0~3)=적, 아래(4~7)=아군. g/h/n/r=통로, c/w/v=진입 불가.
 */
const TERRAIN_LAYOUTS: Record<BattlefieldTheme, readonly string[]> = {
  평지: [
    "ccgggcc",
    "cgggggc",
    "ggggggg",
    "gggnngg",
    "gggnngg",
    "ggggggg",
    "cgggggc",
    "ccgggcc",
  ],
  산지: [
    "ccccccc",
    "cggcggc",
    "chgnnhc",
    "cgnnngc",
    "cgnnngc",
    "chgnnhc",
    "cggcggc",
    "ccccccc",
  ],
  바다: [
    "wwwwwww",
    "wwgggww",
    "wgggggw",
    "wggnngw",
    "wggnngw",
    "wgggggw",
    "wwgggww",
    "wwwwwww",
  ],
  습지: [
    "crrcrrc",
    "rggrggr",
    "rggnngr",
    "rgnnnnr",
    "rgnnnnr",
    "rggnngr",
    "rggrggr",
    "crrcrrc",
  ],
  정글: [
    "vvvvvvv",
    "vggvggv",
    "vggnngv",
    "vgnnnnv",
    "vgnnnnv",
    "vggnngv",
    "vggvggv",
    "vvvvvvv",
  ],
  사막: [
    "crrcrrc",
    "rggrggr",
    "rhgnnhr",
    "rgnnnnr",
    "rgnnnnr",
    "rhgnnhr",
    "rggrggr",
    "crrcrrc",
  ],
};

const CELL_STATS: Record<
  CombatTerrainKind,
  Pick<
    CombatTerrainCell,
    "walkable" | "elevation" | "moveCost" | "attack" | "defense" | "range"
  >
> = {
  ground: {
    walkable: true,
    elevation: 0,
    moveCost: 1,
    attack: 0,
    defense: 0,
    range: 0,
  },
  high: {
    walkable: true,
    elevation: 1,
    moveCost: 1,
    attack: 0.1,
    defense: 0.04,
    range: 0,
  },
  choke: {
    walkable: true,
    elevation: 0,
    moveCost: 1,
    attack: 0,
    defense: 0.12,
    range: 0,
  },
  rough: {
    walkable: true,
    elevation: 0,
    moveCost: 2,
    attack: -0.04,
    defense: 0,
    range: 0,
  },
  cover: {
    walkable: false,
    elevation: 0,
    moveCost: 99,
    attack: 0,
    defense: 0,
    range: 0,
  },
  water: {
    walkable: false,
    elevation: -1,
    moveCost: 99,
    attack: 0,
    defense: 0,
    range: 0,
  },
  cliff: {
    walkable: false,
    elevation: -2,
    moveCost: 99,
    attack: 0,
    defense: 0,
    range: 0,
  },
};

export const combatTerrainGrid = (
  theme: BattlefieldTheme,
): CombatTerrainCell[] =>
  TERRAIN_LAYOUTS[theme].flatMap((line, row) =>
    [...line].map((symbol, column) => {
      const kind = SYMBOL_KIND[symbol as keyof typeof SYMBOL_KIND] ?? "ground";
      return {
        row,
        column,
        kind,
        ...CELL_STATS[kind],
      };
    }),
  );

export const combatTerrainCellAt = (
  theme: BattlefieldTheme,
  row: number,
  column: number,
) => {
  const symbol = TERRAIN_LAYOUTS[theme][row]?.[column];
  const kind = symbol
    ? SYMBOL_KIND[symbol as keyof typeof SYMBOL_KIND] ?? "ground"
    : "cliff";
  return {
    row,
    column,
    kind,
    ...CELL_STATS[kind],
  } satisfies CombatTerrainCell;
};

export const isPathCell = (
  theme: BattlefieldTheme,
  row: number,
  column: number,
) => combatTerrainCellAt(theme, row, column).walkable;

export const normalizeCombatPosition = (
  theme: BattlefieldTheme,
  row: number,
  column: number,
) => {
  const current = combatTerrainCellAt(theme, row, column);
  if (current.walkable) return { row, column };

  return (
    combatTerrainGrid(theme)
      .filter((cell) => cell.walkable)
      .sort((a, b) => {
        const distanceA = Math.max(
          Math.abs(a.row - row),
          Math.abs(a.column - column),
        );
        const distanceB = Math.max(
          Math.abs(b.row - row),
          Math.abs(b.column - column),
        );
        if (distanceA !== distanceB) return distanceA - distanceB;
        if (a.row !== b.row) return a.row - b.row;
        return a.column - b.column;
      })[0] ?? { row, column }
  );
};

export const terrainRulesForTheme = (theme: BattlefieldTheme) => {
  const kinds = new Set(combatTerrainGrid(theme).map((cell) => cell.kind));
  return [...kinds]
    .filter((kind) => kind !== "ground")
    .map((kind) => ({
      kind,
      ...COMBAT_TERRAIN_META[kind],
    }));
};
