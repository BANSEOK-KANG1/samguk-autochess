import type { BattlefieldTheme } from "./game-data";
import type { CombatTerrainKind } from "./combat-terrain";

/**
 * Kenney 스케치 타일맵 프로토타입.
 *
 * 지형 판정(walkable/kind)은 기존 `combat-terrain`을 그대로 쓰고,
 * 각 셀을 Kenney 큐브 타일로 그려 TFT식 보드 느낌을 만든다.
 * 팩이 없는 테마는 `null`을 돌려주어 기존 디오라마 경로를 유지한다.
 */

export type ArenaDecor = {
  /** 보드 폭/높이 기준 0~1 정규화 좌표 */
  x: number;
  y: number;
  /** 타일 파일명 (팩 base 기준 상대 경로) */
  src: string;
  /** 렌더 폭(px). 높이는 스프라이트 비율로 자동 */
  size: number;
  flip?: boolean;
};

export type ArenaPack = {
  label: string;
  /** public 하위 에셋 폴더 */
  base: string;
  /** 지형 종류별 큐브 타일 */
  tiles: Record<CombatTerrainKind, string>;
  /** 배치 칸을 가리지 않는 가장자리 장식 */
  decor: ArenaDecor[];
};

const DESERT_PACK: ArenaPack = {
  label: "사막 스케치",
  base: "kenney-desert",
  tiles: {
    ground: "dirt_center_N.png",
    high: "dirt_center_E.png",
    choke: "dirt_low_N.png",
    rough: "dirt_low_N.png",
    cover: "trees_N.png",
    water: "water_center_N.png",
    cliff: "grass_water_N.png",
  },
  decor: [
    { x: -0.02, y: 0.08, src: "tree_N.png", size: 96 },
    { x: 0.94, y: 0.02, src: "trees_N.png", size: 120 },
    { x: 1.0, y: 0.62, src: "rocks_N.png", size: 88, flip: true },
    { x: -0.04, y: 0.7, src: "structure_tent_N.png", size: 132 },
    { x: 0.5, y: -0.06, src: "rocks_E.png", size: 78 },
  ],
};

/**
 * 테마별 타일맵 팩. 새 Kenney 팩을 붙일 때는 타일을 public에 복사하고
 * 여기에 항목만 추가하면 된다.
 */
export const ARENA_PACKS: Partial<Record<BattlefieldTheme, ArenaPack>> = {
  사막: DESERT_PACK,
};

export const getArenaPack = (theme: BattlefieldTheme): ArenaPack | null =>
  ARENA_PACKS[theme] ?? null;

export const isArenaTheme = (theme: BattlefieldTheme): boolean =>
  Boolean(ARENA_PACKS[theme]);

/** 셀에 깔 타일 이미지 경로. 팩이 없으면 빈 문자열. */
export const arenaTileFor = (
  theme: BattlefieldTheme,
  kind: CombatTerrainKind,
): string => {
  const pack = getArenaPack(theme);
  return pack ? `${pack.base}/${pack.tiles[kind]}` : "";
};

/** 가장자리 장식 목록 (경로는 이미 팩 base가 붙은 상태). */
export const arenaDecorFor = (theme: BattlefieldTheme): ArenaDecor[] => {
  const pack = getArenaPack(theme);
  if (!pack) return [];
  return pack.decor.map((decor) => ({
    ...decor,
    src: `${pack.base}/${decor.src}`,
  }));
};
