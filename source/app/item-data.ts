import type { Cost } from "./game-data";

export type ItemSlot = "weapon" | "armor" | "mount";
export type ItemTier = "component" | "finished";

/** 무기 세부 종류 — 종류별 전투 역할이 갈림 */
export type WeaponKind = "sword" | "bow" | "spear" | "dagger" | "fan" | "axe";
export type ArmorKind = "light" | "heavy" | "robe" | "shield";
export type MountKind = "warhorse" | "charger" | "swift";
export type ItemKind = WeaponKind | ArmorKind | MountKind;

export type ItemCombatEffect = {
  /** 치명타 확률 가산 (0~1) */
  critChance?: number;
  /** 기본 공격 피해의 흡혈 비율 */
  lifesteal?: number;
  /** 피격 시 공격자에게 반사 피해(고정) */
  thorns?: number;
  /** 전투 시작 보호막(최대 체력 비율) */
  startShield?: number;
  /** 사거리 가산 칸 */
  rangeBonus?: number;
  /** 받는 피해 감소 비율 */
  damageReduce?: number;
  /** 처치 시 체력 회복(최대 체력 비율) */
  healOnKill?: number;
  /** 피격 기력 수급 보너스(절대치) */
  manaOnHitBonus?: number;
};

export type ItemDef = {
  id: string;
  name: string;
  hanja: string;
  slot: ItemSlot;
  kind: ItemKind;
  tier: ItemTier;
  cost: number;
  /** 한 줄 역할 설명 */
  blurb: string;
  description: string;
  /** 조합 재료 2개. 완성템만 가짐 */
  recipe?: [string, string];
  attack?: number;
  defense?: number;
  health?: number;
  manaGain?: number;
  skillPower?: number;
  effect?: ItemCombatEffect;
  /** UI 강조색 */
  accent: string;
  glyph: string;
};

export const ITEM_SLOT_LABEL: Record<ItemSlot, string> = {
  weapon: "무기",
  armor: "방어구",
  mount: "탈것",
};

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  sword: "검",
  bow: "활",
  spear: "창",
  dagger: "단도",
  fan: "선(책)",
  axe: "부월",
  light: "경갑",
  heavy: "중갑",
  robe: "법포",
  shield: "방패",
  warhorse: "군마",
  charger: "돌격마",
  swift: "신고마",
};

export const ITEM_KIND_ROLE: Record<ItemKind, string> = {
  sword: "안정적 공격",
  bow: "원거리·기력",
  spear: "돌파·체력",
  dagger: "치명타",
  fan: "필살기·기력",
  axe: "중타·흡혈",
  light: "기동 방어",
  heavy: "튼튼한 방벽",
  robe: "회복·기력",
  shield: "피해 감소",
  warhorse: "체력·돌진",
  charger: "공격·충격",
  swift: "기력·필살",
};

/** 조합 재료(기본템) — 상점에서만 등장 */
export const COMPONENT_ITEMS: ItemDef[] = [
  {
    id: "iron-blade",
    name: "철검",
    hanja: "鐵劍",
    slot: "weapon",
    kind: "sword",
    tier: "component",
    cost: 2,
    glyph: "검",
    accent: "#c4a574",
    blurb: "검 · 기본 공격 강화",
    description: "공격력 +10",
    attack: 10,
  },
  {
    id: "recurve-bow",
    name: "각궁",
    hanja: "角弓",
    slot: "weapon",
    kind: "bow",
    tier: "component",
    cost: 2,
    glyph: "활",
    accent: "#8faf7a",
    blurb: "활 · 기력 수급",
    description: "공격력 +7 · 기력 수급 +2",
    attack: 7,
    manaGain: 2,
  },
  {
    id: "war-spear",
    name: "기창",
    hanja: "騎槍",
    slot: "weapon",
    kind: "spear",
    tier: "component",
    cost: 2,
    glyph: "창",
    accent: "#b8906a",
    blurb: "창 · 돌파와 체력",
    description: "공격력 +8 · 체력 +35",
    attack: 8,
    health: 35,
  },
  {
    id: "shadow-dagger",
    name: "암연단도",
    hanja: "暗刃",
    slot: "weapon",
    kind: "dagger",
    tier: "component",
    cost: 2,
    glyph: "단",
    accent: "#7a8a9a",
    blurb: "단도 · 치명타",
    description: "공격력 +6 · 치명타 +12%",
    attack: 6,
    effect: { critChance: 0.12 },
  },
  {
    id: "tactician-fan",
    name: "군선부채",
    hanja: "軍扇",
    slot: "weapon",
    kind: "fan",
    tier: "component",
    cost: 2,
    glyph: "선",
    accent: "#9a7ab0",
    blurb: "선 · 필살기",
    description: "기력 수급 +2 · 필살기 +10%",
    manaGain: 2,
    skillPower: 0.1,
  },
  {
    id: "bronze-axe",
    name: "청동부월",
    hanja: "銅鉞",
    slot: "weapon",
    kind: "axe",
    tier: "component",
    cost: 3,
    glyph: "월",
    accent: "#b07050",
    blurb: "부월 · 흡혈",
    description: "공격력 +9 · 흡혈 8%",
    attack: 9,
    effect: { lifesteal: 0.08 },
  },
  {
    id: "leather-vest",
    name: "가죽갑",
    hanja: "皮甲",
    slot: "armor",
    kind: "light",
    tier: "component",
    cost: 2,
    glyph: "경",
    accent: "#8a7a5a",
    blurb: "경갑 · 기동 방어",
    description: "방어력 +7 · 체력 +45",
    defense: 7,
    health: 45,
  },
  {
    id: "iron-plate",
    name: "철갑",
    hanja: "鐵甲",
    slot: "armor",
    kind: "heavy",
    tier: "component",
    cost: 3,
    glyph: "중",
    accent: "#6a7a8a",
    blurb: "중갑 · 방벽",
    description: "방어력 +12 · 체력 +70",
    defense: 12,
    health: 70,
  },
  {
    id: "war-cloak",
    name: "군포",
    hanja: "軍袍",
    slot: "armor",
    kind: "robe",
    tier: "component",
    cost: 2,
    glyph: "포",
    accent: "#7a6a90",
    blurb: "법포 · 기력",
    description: "체력 +55 · 기력 수급 +2 · 피격 기력 +2",
    health: 55,
    manaGain: 2,
    effect: { manaOnHitBonus: 2 },
  },
  {
    id: "round-shield",
    name: "원형방패",
    hanja: "圓盾",
    slot: "armor",
    kind: "shield",
    tier: "component",
    cost: 2,
    glyph: "방",
    accent: "#708090",
    blurb: "방패 · 피해 감소",
    description: "방어력 +8 · 받는 피해 -6% · 시작 방벽 6%",
    defense: 8,
    effect: { damageReduce: 0.06, startShield: 0.06 },
  },
  {
    id: "saddle",
    name: "안장",
    hanja: "안",
    slot: "mount",
    kind: "warhorse",
    tier: "component",
    cost: 2,
    glyph: "안",
    accent: "#9a8058",
    blurb: "군마 안장",
    description: "체력 +40 · 공격력 +5",
    health: 40,
    attack: 5,
  },
  {
    id: "horseshoe",
    name: "편자",
    hanja: "蹄鐵",
    slot: "mount",
    kind: "swift",
    tier: "component",
    cost: 2,
    glyph: "급",
    accent: "#8898a8",
    blurb: "신고마 편자",
    description: "기력 수급 +3",
    manaGain: 3,
  },
  {
    id: "bridle",
    name: "고삐",
    hanja: "轡",
    slot: "mount",
    kind: "charger",
    tier: "component",
    cost: 2,
    glyph: "轡",
    accent: "#a87858",
    blurb: "돌격 고삐",
    description: "공격력 +6 · 필살기 +7%",
    attack: 6,
    skillPower: 0.07,
  },
];

/** 완성템 — 재료 2개를 합치면 생성 */
export const FINISHED_ITEMS: ItemDef[] = [
  {
    id: "azure-dragon-blade",
    name: "청룡언월도",
    hanja: "青龍",
    slot: "weapon",
    kind: "sword",
    tier: "finished",
    cost: 5,
    glyph: "용",
    accent: "#3d8f6a",
    recipe: ["iron-blade", "iron-blade"],
    blurb: "명검 · 필살 강화",
    description: "공격력 +24 · 필살기 +20% · 처치 시 체력 8% 회복",
    attack: 24,
    skillPower: 0.2,
    effect: { healOnKill: 0.08 },
  },
  {
    id: "meteor-bow",
    name: "유성각궁",
    hanja: "流星",
    slot: "weapon",
    kind: "bow",
    tier: "finished",
    cost: 5,
    glyph: "성",
    accent: "#6a9a5a",
    recipe: ["recurve-bow", "recurve-bow"],
    blurb: "강궁 · 장거리",
    description: "공격력 +16 · 기력 +3 · 사거리 +1 · 필살기 +12%",
    attack: 16,
    manaGain: 3,
    skillPower: 0.12,
    effect: { rangeBonus: 1 },
  },
  {
    id: "tiger-spear",
    name: "호표기창",
    hanja: "虎槍",
    slot: "weapon",
    kind: "spear",
    tier: "finished",
    cost: 5,
    glyph: "호",
    accent: "#c07040",
    recipe: ["war-spear", "saddle"],
    blurb: "기창 · 돌파",
    description: "공격력 +20 · 체력 +90 · 시작 방벽 8%",
    attack: 20,
    health: 90,
    effect: { startShield: 0.08 },
  },
  {
    id: "serpent-dagger",
    name: "독사암도",
    hanja: "蛇刃",
    slot: "weapon",
    kind: "dagger",
    tier: "finished",
    cost: 5,
    glyph: "사",
    accent: "#5a7a6a",
    recipe: ["shadow-dagger", "shadow-dagger"],
    blurb: "암기 · 치명",
    description: "공격력 +14 · 치명타 +28% · 흡혈 6%",
    attack: 14,
    effect: { critChance: 0.28, lifesteal: 0.06 },
  },
  {
    id: "red-cliff-fan",
    name: "적벽화선",
    hanja: "赤壁",
    slot: "weapon",
    kind: "fan",
    tier: "finished",
    cost: 5,
    glyph: "화",
    accent: "#c05040",
    recipe: ["tactician-fan", "tactician-fan"],
    blurb: "화선 · 필살 폭주",
    description: "기력 수급 +4 · 필살기 +24% · 피격 기력 +3",
    manaGain: 4,
    skillPower: 0.24,
    effect: { manaOnHitBonus: 3 },
  },
  {
    id: "mountain-splitter",
    name: "개산부월",
    hanja: "開山",
    slot: "weapon",
    kind: "axe",
    tier: "finished",
    cost: 6,
    glyph: "산",
    accent: "#a85838",
    recipe: ["bronze-axe", "iron-blade"],
    blurb: "부월 · 중타 흡혈",
    description: "공격력 +26 · 흡혈 16% · 치명타 +8%",
    attack: 26,
    effect: { lifesteal: 0.16, critChance: 0.08 },
  },
  {
    id: "shadow-mail",
    name: "암영철갑",
    hanja: "暗甲",
    slot: "armor",
    kind: "heavy",
    tier: "finished",
    cost: 5,
    glyph: "암",
    accent: "#4a5a6a",
    recipe: ["iron-plate", "leather-vest"],
    blurb: "중갑 · 철벽",
    description: "방어력 +20 · 체력 +130 · 받는 피해 -8%",
    defense: 20,
    health: 130,
    effect: { damageReduce: 0.08 },
  },
  {
    id: "general-cloak",
    name: "대장군포",
    hanja: "將袍",
    slot: "armor",
    kind: "robe",
    tier: "finished",
    cost: 4,
    glyph: "장",
    accent: "#7a5a90",
    recipe: ["war-cloak", "leather-vest"],
    blurb: "장포 · 지휘",
    description: "체력 +120 · 기력 +2 · 방어 +10 · 피격 기력 +3",
    health: 120,
    manaGain: 2,
    defense: 10,
    effect: { manaOnHitBonus: 3 },
  },
  {
    id: "turtle-shield",
    name: "현무방패",
    hanja: "玄武",
    slot: "armor",
    kind: "shield",
    tier: "finished",
    cost: 5,
    glyph: "무",
    accent: "#4a6a7a",
    recipe: ["round-shield", "iron-plate"],
    blurb: "방패 · 반사",
    description: "방어력 +16 · 피해 -10% · 가시 18 · 시작 방벽 12%",
    defense: 16,
    effect: { damageReduce: 0.1, thorns: 18, startShield: 0.12 },
  },
  {
    id: "red-hare",
    name: "적토마",
    hanja: "赤兔",
    slot: "mount",
    kind: "warhorse",
    tier: "finished",
    cost: 6,
    glyph: "토",
    accent: "#c04030",
    recipe: ["saddle", "horseshoe"],
    blurb: "명마 · 체력·돌진",
    description: "체력 +110 · 공격력 +14 · 기력 +2 · 시작 방벽 6%",
    health: 110,
    attack: 14,
    manaGain: 2,
    effect: { startShield: 0.06 },
  },
  {
    id: "shadow-steed",
    name: "절영",
    hanja: "絕影",
    slot: "mount",
    kind: "swift",
    tier: "finished",
    cost: 5,
    glyph: "영",
    accent: "#5a4a70",
    recipe: ["bridle", "horseshoe"],
    blurb: "신고마 · 필살",
    description: "공격력 +15 · 기력 +3 · 필살기 +12% · 치명타 +6%",
    attack: 15,
    manaGain: 3,
    skillPower: 0.12,
    effect: { critChance: 0.06 },
  },
  {
    id: "hex-charger",
    name: "조황비전",
    hanja: "爪黃",
    slot: "mount",
    kind: "charger",
    tier: "finished",
    cost: 5,
    glyph: "조",
    accent: "#b88840",
    recipe: ["bridle", "saddle"],
    blurb: "돌격마 · 충격",
    description: "공격력 +18 · 체력 +70 · 흡혈 10%",
    attack: 18,
    health: 70,
    effect: { lifesteal: 0.1 },
  },
];

export const ALL_ITEMS: ItemDef[] = [...COMPONENT_ITEMS, ...FINISHED_ITEMS];
export const ITEM_BY_ID = Object.fromEntries(
  ALL_ITEMS.map((item) => [item.id, item]),
) as Record<string, ItemDef>;

export const SHOP_COMPONENT_POOL = COMPONENT_ITEMS.map((item) => item.id);

export type EquippedItems = [string | null, string | null];

export const emptyEquipment = (): EquippedItems => [null, null];

export type AggregatedItemStats = {
  attack: number;
  defense: number;
  health: number;
  manaGain: number;
  skillPower: number;
  critChance: number;
  lifesteal: number;
  thorns: number;
  startShield: number;
  rangeBonus: number;
  damageReduce: number;
  healOnKill: number;
  manaOnHitBonus: number;
};

export const itemStatsFor = (
  itemIds: (string | null | undefined)[],
): AggregatedItemStats => {
  const total: AggregatedItemStats = {
    attack: 0,
    defense: 0,
    health: 0,
    manaGain: 0,
    skillPower: 0,
    critChance: 0,
    lifesteal: 0,
    thorns: 0,
    startShield: 0,
    rangeBonus: 0,
    damageReduce: 0,
    healOnKill: 0,
    manaOnHitBonus: 0,
  };
  itemIds.forEach((id) => {
    if (!id) return;
    const item = ITEM_BY_ID[id];
    if (!item) return;
    total.attack += item.attack ?? 0;
    total.defense += item.defense ?? 0;
    total.health += item.health ?? 0;
    total.manaGain += item.manaGain ?? 0;
    total.skillPower += item.skillPower ?? 0;
    const effect = item.effect;
    if (!effect) return;
    total.critChance += effect.critChance ?? 0;
    total.lifesteal += effect.lifesteal ?? 0;
    total.thorns += effect.thorns ?? 0;
    total.startShield += effect.startShield ?? 0;
    total.rangeBonus += effect.rangeBonus ?? 0;
    total.damageReduce += effect.damageReduce ?? 0;
    total.healOnKill += effect.healOnKill ?? 0;
    total.manaOnHitBonus += effect.manaOnHitBonus ?? 0;
  });
  total.damageReduce = Math.min(0.35, total.damageReduce);
  total.critChance = Math.min(0.55, total.critChance);
  total.lifesteal = Math.min(0.4, total.lifesteal);
  return total;
};

/** 같은 칸에 같은 슬롯 아이템이 있으면 장착 불가. 단, 조합 가능한 재료끼리는 허용 */
export const canEquipItem = (
  equipment: EquippedItems,
  itemId: string,
  slotIndex: 0 | 1,
) => {
  const item = ITEM_BY_ID[itemId];
  if (!item) return false;
  const other = equipment[slotIndex === 0 ? 1 : 0];
  if (!other) return true;
  const otherItem = ITEM_BY_ID[other];
  if (!otherItem || otherItem.slot !== item.slot) return true;
  return Boolean(tryCombineItems(other, itemId));
};

/** 보유 재료 2개로 완성템 조합 가능 여부 검사 후 완성템 id 반환 */
export const tryCombineItems = (a: string, b: string) => {
  const pair = [a, b].sort();
  return (
    FINISHED_ITEMS.find((item) => {
      if (!item.recipe) return false;
      const need = [...item.recipe].sort();
      return need[0] === pair[0] && need[1] === pair[1];
    })?.id ?? null
  );
};

export const rollItemShop = (seed = Date.now()) => {
  const picks: string[] = [];
  let value = seed;
  for (let index = 0; index < 5; index += 1) {
    value = (value * 1664525 + 1013904223) >>> 0;
    const pool = SHOP_COMPONENT_POOL;
    picks.push(pool[value % pool.length]);
  }
  return picks;
};

export const formatItemStats = (item: ItemDef) => {
  const parts: string[] = [];
  if (item.attack) parts.push(`공+${item.attack}`);
  if (item.defense) parts.push(`방+${item.defense}`);
  if (item.health) parts.push(`체+${item.health}`);
  if (item.manaGain) parts.push(`기력+${item.manaGain}`);
  if (item.skillPower) parts.push(`필살+${Math.round(item.skillPower * 100)}%`);
  if (item.effect?.critChance)
    parts.push(`치명+${Math.round(item.effect.critChance * 100)}%`);
  if (item.effect?.lifesteal)
    parts.push(`흡혈${Math.round(item.effect.lifesteal * 100)}%`);
  if (item.effect?.rangeBonus) parts.push(`사거리+${item.effect.rangeBonus}`);
  if (item.effect?.damageReduce)
    parts.push(`피해-${Math.round(item.effect.damageReduce * 100)}%`);
  if (item.effect?.thorns) parts.push(`가시${item.effect.thorns}`);
  return parts.join(" · ");
};

/** 코스트별 필살기 게이지 최대치 — 고코스트일수록 더 많이 채워야 함 */
export const ultimateGaugeForCost = (cost: Cost) => 70 + cost * 14;

/** 성급별 게이지 수급 배율 — 고성일수록 빠르게 채움 */
export const STAR_GAUGE_RATE = {
  1: 1,
  2: 1.28,
  3: 1.6,
} as const;

/** 코스트별 필살기 위력 배율 */
export const COST_SKILL_POWER = {
  1: 0.92,
  2: 1,
  3: 1.12,
  4: 1.28,
  5: 1.48,
} as const;
