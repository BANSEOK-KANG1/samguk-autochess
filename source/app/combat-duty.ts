import type { Hero, Role } from "./game-data";

/**
 * 전투 직무 — 병과(Role) 안의 세부 플레이 스타일.
 * 원거리 딜러 / 힐러 / 버퍼 / 오라 서포터 등을 구분한다.
 */
export type CombatDuty =
  | "melee-dps"
  | "ranged-dps"
  | "mage-dps"
  | "tank"
  | "assassin"
  | "healer"
  | "buffer"
  | "aura"
  | "commander";

export type DutyProfile = {
  id: CombatDuty;
  label: string;
  short: string;
  glyph: string;
  description: string;
  /** 기본 행동에서 아군 지원을 시도할 확률 가중 */
  supportBias: number;
};

export const DUTY_PROFILES: Record<CombatDuty, DutyProfile> = {
  "melee-dps": {
    id: "melee-dps",
    label: "근접 딜러",
    short: "근접",
    glyph: "근",
    description: "전열에서 기본 공격으로 압박합니다.",
    supportBias: 0,
  },
  "ranged-dps": {
    id: "ranged-dps",
    label: "원거리 딜러",
    short: "원딜",
    glyph: "원",
    description: "후열에서 안정적으로 사격합니다. 공격력이 소폭 보정됩니다.",
    supportBias: 0,
  },
  "mage-dps": {
    id: "mage-dps",
    label: "책략 딜러",
    short: "법딜",
    glyph: "책",
    description: "원거리 책략 피해와 범위 스킬에 특화됩니다.",
    supportBias: 0,
  },
  tank: {
    id: "tank",
    label: "탱커",
    short: "탱",
    glyph: "탱",
    description: "앞줄에서 피해를 흡수하고 전열을 지킵니다.",
    supportBias: 0,
  },
  assassin: {
    id: "assassin",
    label: "암살자",
    short: "암살",
    glyph: "암",
    description: "약한 적을 노리는 치명 특화 딜러입니다.",
    supportBias: 0,
  },
  healer: {
    id: "healer",
    label: "힐러",
    short: "힐",
    glyph: "힐",
    description: "체력이 낮은 아군을 우선 회복합니다.",
    supportBias: 0.82,
  },
  buffer: {
    id: "buffer",
    label: "버퍼",
    short: "버프",
    glyph: "버",
    description: "주변 아군의 공격·방어를 강화합니다.",
    supportBias: 0.75,
  },
  aura: {
    id: "aura",
    label: "오라 서포터",
    short: "오라",
    glyph: "오",
    description: "인접 아군에게 지속 가호(회복·보호)를 풉니다.",
    supportBias: 0.55,
  },
  commander: {
    id: "commander",
    label: "지휘관",
    short: "지휘",
    glyph: "지",
    description: "아군 전체를 고무하는 지휘형 역할입니다.",
    supportBias: 0.35,
  },
};

/** 장수 고유 직무 오버라이드 */
const HERO_DUTY_OVERRIDES: Partial<Record<string, CombatDuty>> = {
  // 힐러
  "hua-tuo": "healer",
  "da-qiao": "healer",
  "xiao-qiao": "healer",
  "cai-wenji": "healer",
  "bu-lianshi": "healer",
  "zhen-ji": "healer",
  "huang-yueying": "healer",

  // 버퍼
  "xun-yu": "buffer",
  "lu-su": "buffer",
  "ma-liang": "buffer",
  "ju-shou": "buffer",
  "jian-yong": "buffer",
  "man-chong": "buffer",
  "mi-zhu": "buffer",

  // 오라 서포터 (지원 중 나머지·일부 군주형)
  "liu-bei": "commander",
  "cao-cao": "commander",
  "sun-quan": "commander",
  "yuan-shao": "commander",
  "cao-pi": "commander",
  "liu-shan": "aura",

  // 원거리·책략 딜러 강조
  "huang-zhong": "ranged-dps",
  "xiahou-yuan": "ranged-dps",
  "taishi-ci": "ranged-dps",
  "sun-shangxiang": "ranged-dps",
  "zhu-ran": "ranged-dps",
  "han-dang": "ranged-dps",
  "zhu-rong": "ranged-dps",
  "zhuge-liang": "mage-dps",
  "zhou-yu": "mage-dps",
  "sima-yi": "mage-dps",
  "lu-xun": "mage-dps",
  "zhang-jiao": "mage-dps",
  "jia-xu": "mage-dps",
  "pang-tong": "mage-dps",
  "guo-jia": "mage-dps",
};

const ROLE_DEFAULT_DUTY: Record<Role, CombatDuty> = {
  군주: "commander",
  용장: "melee-dps",
  수호: "tank",
  책사: "mage-dps",
  궁수: "ranged-dps",
  기병: "melee-dps",
  암살: "assassin",
  지원: "aura",
};

/** 지원 병과 중 직무가 없는 장수는 이름 해시로 힐/버프/오라 분산 */
const supportDutyFromHash = (heroId: string): CombatDuty => {
  const hash = [...heroId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const pick = hash % 3;
  if (pick === 0) return "healer";
  if (pick === 1) return "buffer";
  return "aura";
};

export const combatDutyFor = (hero: Pick<Hero, "id" | "role">): CombatDuty => {
  const override = HERO_DUTY_OVERRIDES[hero.id];
  if (override) return override;
  if (hero.role === "지원") return supportDutyFromHash(hero.id);
  return ROLE_DEFAULT_DUTY[hero.role];
};

export const dutyProfileFor = (hero: Pick<Hero, "id" | "role">) =>
  DUTY_PROFILES[combatDutyFor(hero)];

/** 원거리 직무인지 */
export const isRangedDuty = (duty: CombatDuty) =>
  duty === "ranged-dps" || duty === "mage-dps" || duty === "healer" || duty === "buffer" || duty === "aura";

/** 기본 행동에서 아군을 돌볼 수 있는 직무 */
export const isSupportDuty = (duty: CombatDuty) =>
  duty === "healer" || duty === "buffer" || duty === "aura" || duty === "commander";
