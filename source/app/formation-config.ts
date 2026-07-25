import type { Hero, Role } from "./game-data";

export type FormationId =
  | "anhaeng"
  | "bongsi"
  | "hakik"
  | "eorin"
  | "bangwon"
  | "jangsa";

export type FormationEffect = {
  attack: number;
  defense: number;
  health: number;
  mana: number;
  shield: number;
  range: number;
};

export type FormationRule = {
  label: string;
  hanja: string;
  subtitle: string;
  description: string;
  favoredRoles: Role[];
  cells: number[];
  coreCells: number[];
  color: string;
  tiers: [number, number, number];
  tierLabels: [string, string, string];
  effect: FormationEffect;
};

export const FORMATIONS: Record<FormationId, FormationRule> = {
  anhaeng: {
    label: "안행진",
    hanja: "雁",
    subtitle: "기러기 날개",
    description:
      "양익을 비스듬히 펼쳐 원거리 장수가 서로의 사각을 보완합니다.",
    favoredRoles: ["궁수", "책사", "지원"],
    cells: [1, 5, 9, 11, 14, 17, 20, 22, 24, 26],
    coreCells: [17, 24],
    color: "#ad83c5",
    tiers: [2, 4, 6],
    tierLabels: [
      "사격선 정렬 · 공격·기력 소폭 상승",
      "교차 사격 · 공격·기력 상승",
      "낙안연격 · 사거리와 선제 기력 상승",
    ],
    effect: {
      attack: 0.13,
      defense: 0.03,
      health: 0,
      mana: 18,
      shield: 0,
      range: 1,
    },
  },
  bongsi: {
    label: "봉시진",
    hanja: "鋒",
    subtitle: "화살촉 돌파",
    description:
      "중앙 선봉을 화살촉처럼 세워 한 지점을 빠르게 무너뜨립니다.",
    favoredRoles: ["용장", "기병", "암살"],
    cells: [3, 9, 10, 11, 15, 16, 17, 18, 19, 24],
    coreCells: [3, 10, 17],
    color: "#cf684f",
    tiers: [2, 4, 6],
    tierLabels: [
      "선봉 압박 · 근접 공격 상승",
      "쐐기 돌파 · 공격·체력 상승",
      "파진격 · 최대 공격 상승, 방어 일부 감소",
    ],
    effect: {
      attack: 0.18,
      defense: -0.04,
      health: 0.05,
      mana: 8,
      shield: 0,
      range: 0,
    },
  },
  hakik: {
    label: "학익진",
    hanja: "鶴",
    subtitle: "쌍익 포위",
    description:
      "좌우 날개를 넓게 벌려 측면 공격과 책략 연계를 강화합니다.",
    favoredRoles: ["궁수", "암살", "책사"],
    cells: [3, 8, 12, 14, 16, 18, 20, 21, 24, 27],
    coreCells: [14, 20, 24],
    color: "#d0a55f",
    tiers: [2, 4, 6],
    tierLabels: [
      "양익 전개 · 공격·기력 소폭 상승",
      "측면 압박 · 공격·기력 상승",
      "포학협공 · 양익 장수 화력 극대화",
    ],
    effect: {
      attack: 0.15,
      defense: 0,
      health: 0,
      mana: 15,
      shield: 0,
      range: 0,
    },
  },
  eorin: {
    label: "어린진",
    hanja: "鱗",
    subtitle: "비늘 중첩",
    description:
      "병력을 비늘처럼 겹쳐 전열과 후열이 피해를 나누어 받습니다.",
    favoredRoles: ["군주", "용장", "수호"],
    cells: [2, 3, 4, 9, 10, 11, 16, 17, 18, 24],
    coreCells: [10, 17, 24],
    color: "#7da2b2",
    tiers: [2, 4, 6],
    tierLabels: [
      "비늘 결속 · 방어 소폭 상승",
      "중첩 호위 · 방어·체력 상승",
      "철린벽 · 전열 생존력 극대화",
    ],
    effect: {
      attack: 0.05,
      defense: 0.15,
      health: 0.12,
      mana: 0,
      shield: 0.04,
      range: 0,
    },
  },
  bangwon: {
    label: "방원진",
    hanja: "圓",
    subtitle: "사방 수비",
    description:
      "외곽이 중앙을 감싸 지휘관과 지원 장수의 생존을 보장합니다.",
    favoredRoles: ["수호", "군주", "지원"],
    cells: [1, 2, 3, 4, 5, 7, 13, 22, 23, 24, 25, 26],
    coreCells: [17, 24],
    color: "#72a17a",
    tiers: [2, 4, 6],
    tierLabels: [
      "호위 고리 · 체력·보호막 상승",
      "방진 결속 · 방어·체력 상승",
      "금성철벽 · 시작 보호막 극대화",
    ],
    effect: {
      attack: 0,
      defense: 0.16,
      health: 0.16,
      mana: 8,
      shield: 0.1,
      range: 0,
    },
  },
  jangsa: {
    label: "장사진",
    hanja: "蛇",
    subtitle: "긴 뱀의 흐름",
    description:
      "세로로 이어진 병력이 앞뒤를 바꾸며 빠르게 전장을 가릅니다.",
    favoredRoles: ["기병", "암살", "지원"],
    cells: [2, 3, 9, 10, 16, 17, 23, 24, 25],
    coreCells: [3, 10, 17, 24],
    color: "#9ca85f",
    tiers: [2, 4, 6],
    tierLabels: [
      "사행 기동 · 공격·기력 소폭 상승",
      "두미상응 · 공격·방어 상승",
      "장사돌진 · 선제 기력과 기동 화력 상승",
    ],
    effect: {
      attack: 0.11,
      defense: 0.07,
      health: 0.05,
      mana: 20,
      shield: 0,
      range: 0,
    },
  },
};

export const FORMATION_ORDER = Object.keys(FORMATIONS) as FormationId[];

export const formationTierForCount = (
  formationId: FormationId,
  activeCount: number,
) => {
  const tiers = FORMATIONS[formationId].tiers;
  if (activeCount >= tiers[2]) return 3;
  if (activeCount >= tiers[1]) return 2;
  if (activeCount >= tiers[0]) return 1;
  return 0;
};

export const formationActiveCount = (
  board: ({ heroId: string } | null)[],
  formationId: FormationId,
) =>
  FORMATIONS[formationId].cells.filter((index) => Boolean(board[index])).length;

const TIER_SCALE = [0, 0.45, 0.72, 1] as const;

export const formationEffectsFor = (
  hero: Hero,
  boardIndex: number,
  formationId: FormationId,
  tier: number,
) => {
  const formation = FORMATIONS[formationId];
  const isMember = formation.cells.includes(boardIndex);
  const isCore = formation.coreCells.includes(boardIndex);
  const isFavored = formation.favoredRoles.includes(hero.role);
  const roleScale = isFavored ? 1 : 0.52;
  const coreScale = isCore ? 1.15 : 1;
  const scale = isMember
    ? TIER_SCALE[Math.max(0, Math.min(3, tier)) as 0 | 1 | 2 | 3] *
      roleScale *
      coreScale
    : 0;

  return {
    isMember,
    isCore,
    isFavored,
    attack: formation.effect.attack * scale,
    defense: formation.effect.defense * scale,
    health: formation.effect.health * scale,
    mana: Math.round(formation.effect.mana * scale),
    shield: formation.effect.shield * scale,
    range:
      tier >= 3 && isMember && isFavored ? formation.effect.range : 0,
  };
};

export const formationPowerModifierFor = (
  hero: Hero,
  boardIndex: number,
  formationId: FormationId,
  tier: number,
) => {
  const effect = formationEffectsFor(hero, boardIndex, formationId, tier);
  return (
    effect.attack * 0.44 +
    effect.defense * 0.22 +
    effect.health * 0.2 +
    effect.shield * 0.08 +
    (effect.mana / 100) * 0.06
  );
};

export const enemyFormationForSeed = (seed: number) =>
  FORMATION_ORDER[Math.abs(seed * 7 + 3) % FORMATION_ORDER.length];
