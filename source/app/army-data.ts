import {
  HEROES,
  type BattlefieldTheme,
  type Hero,
  type Role,
} from "./game-data";

export type TroopKind =
  | "보병"
  | "창병"
  | "기병"
  | "궁병"
  | "방패병"
  | "수군";

export type TerrainFeature =
  | "개활지"
  | "도로"
  | "고지"
  | "협로"
  | "암석"
  | "갑판"
  | "수로"
  | "얕은물"
  | "진흙"
  | "갈대"
  | "숲"
  | "폐허"
  | "사구"
  | "오아시스";

export type TacticId =
  | "line-hold"
  | "high-ground"
  | "flank"
  | "ambush";

export type ArmyFormationId =
  | "anhaeng"
  | "bongsi"
  | "hakik"
  | "eorin"
  | "bangwon"
  | "jangsa";

export const ALL_TROOP_KINDS: TroopKind[] = [
  "보병",
  "창병",
  "기병",
  "궁병",
  "방패병",
  "수군",
];

export type Regiment = {
  id: string;
  name: string;
  kind: TroopKind;
  troops: number;
  maxTroops: number;
  position: number;
  commanderId?: string;
  veterancy: number;
};

export type CommanderEffect = {
  title: string;
  summary: string;
  favoredTroop: TroopKind;
  commandableTroops: TroopKind[];
  attack: number;
  armor: number;
  morale: number;
  range: number;
  mobility: number;
  terrainMastery: BattlefieldTheme[];
};

export const TROOP_META: Record<
  TroopKind,
  {
    hanja: string;
    subtitle: string;
    attack: number;
    armor: number;
    range: number;
    mobility: number;
    cadence: number;
    counter: TroopKind[];
    color: string;
  }
> = {
  보병: {
    hanja: "步",
    subtitle: "전열 유지",
    attack: 58,
    armor: 54,
    range: 1,
    mobility: 2,
    cadence: 2,
    counter: ["궁병"],
    color: "#a98758",
  },
  창병: {
    hanja: "槍",
    subtitle: "기병 저지",
    attack: 61,
    armor: 57,
    range: 1,
    mobility: 2,
    cadence: 2,
    counter: ["기병"],
    color: "#7f9a82",
  },
  기병: {
    hanja: "騎",
    subtitle: "측면 돌파",
    attack: 78,
    armor: 48,
    range: 1,
    mobility: 4,
    cadence: 2,
    counter: ["궁병", "보병"],
    color: "#b66e4d",
  },
  궁병: {
    hanja: "弓",
    subtitle: "원거리 제압",
    attack: 67,
    armor: 30,
    range: 4,
    mobility: 2,
    cadence: 3,
    counter: ["창병", "방패병"],
    color: "#6e8ca2",
  },
  방패병: {
    hanja: "盾",
    subtitle: "사격 방호",
    attack: 43,
    armor: 78,
    range: 1,
    mobility: 1,
    cadence: 3,
    counter: ["궁병"],
    color: "#857b6b",
  },
  수군: {
    hanja: "舟",
    subtitle: "수로 장악",
    attack: 63,
    armor: 51,
    range: 2,
    mobility: 3,
    cadence: 2,
    counter: ["보병", "창병"],
    color: "#547f8a",
  },
};

export const TROOP_CAPACITY: Record<TroopKind, number> = {
  보병: 1040,
  창병: 980,
  기병: 620,
  궁병: 760,
  방패병: 1100,
  수군: 820,
};

export const TACTICS: Record<
  TacticId,
  {
    name: string;
    hanja: string;
    description: string;
    attack: number;
    armor: number;
    morale: number;
    mobility: number;
    favoredTerrain: BattlefieldTheme[];
  }
> = {
  "line-hold": {
    name: "전열 고수",
    hanja: "守",
    description: "방패·창병을 중심으로 피해를 나누며 전선을 유지합니다.",
    attack: 0,
    armor: 0.13,
    morale: 10,
    mobility: -1,
    favoredTerrain: ["평지", "산지"],
  },
  "high-ground": {
    name: "고지 선점",
    hanja: "據",
    description: "고지와 폐허를 먼저 점거해 궁병의 사거리와 화력을 높입니다.",
    attack: 0.08,
    armor: 0.04,
    morale: 4,
    mobility: 0,
    favoredTerrain: ["산지", "정글", "사막"],
  },
  flank: {
    name: "우회 기동",
    hanja: "迂",
    description: "기병과 수군이 측면을 돌아 후열을 우선 타격합니다.",
    attack: 0.12,
    armor: -0.05,
    morale: 0,
    mobility: 1,
    favoredTerrain: ["평지", "바다", "사막"],
  },
  ambush: {
    name: "매복 사격",
    hanja: "伏",
    description: "숲·갈대·협로에서 첫 교전 피해와 적 사기 손실을 키웁니다.",
    attack: 0.1,
    armor: 0,
    morale: 6,
    mobility: 0,
    favoredTerrain: ["습지", "정글", "산지"],
  },
};

export const FORMATION_META: Record<
  ArmyFormationId,
  {
    name: string;
    hanja: string;
    description: string;
    attack: number;
    armor: number;
    morale: number;
    favoredTroops: TroopKind[];
  }
> = {
  anhaeng: {
    name: "안행진",
    hanja: "雁",
    description: "양익의 사격선을 열어 궁병과 수군의 교차 사격을 강화합니다.",
    attack: 0.08,
    armor: 0.02,
    morale: 4,
    favoredTroops: ["궁병", "수군"],
  },
  bongsi: {
    name: "봉시진",
    hanja: "鋒",
    description: "화살촉처럼 중앙을 찔러 기병과 보병의 돌파력을 높입니다.",
    attack: 0.14,
    armor: -0.05,
    morale: 2,
    favoredTroops: ["기병", "보병"],
  },
  hakik: {
    name: "학익진",
    hanja: "鶴",
    description: "좌우 날개로 적을 감싸 측면 피해와 사기 압박을 높입니다.",
    attack: 0.1,
    armor: 0,
    morale: 7,
    favoredTroops: ["궁병", "기병"],
  },
  eorin: {
    name: "어린진",
    hanja: "鱗",
    description: "부대를 비늘처럼 겹쳐 전열의 생존력을 높입니다.",
    attack: 0.02,
    armor: 0.14,
    morale: 9,
    favoredTroops: ["보병", "창병"],
  },
  bangwon: {
    name: "방원진",
    hanja: "圓",
    description: "방패벽 안쪽을 보호해 지휘관과 궁병의 생존을 보장합니다.",
    attack: -0.02,
    armor: 0.17,
    morale: 12,
    favoredTroops: ["방패병", "궁병"],
  },
  jangsa: {
    name: "장사진",
    hanja: "蛇",
    description: "긴 대열이 지형을 타고 움직여 수로와 협로를 빠르게 장악합니다.",
    attack: 0.06,
    armor: 0.04,
    morale: 5,
    favoredTroops: ["수군", "기병"],
  },
};

export const FORMATION_ORDER = Object.keys(
  FORMATION_META,
) as ArmyFormationId[];

export const FORMATION_CELLS: Record<ArmyFormationId, number[]> = {
  anhaeng: [1, 5, 9, 11, 14, 17, 20, 22, 24, 26],
  bongsi: [3, 9, 10, 11, 15, 16, 17, 18, 19, 24],
  hakik: [3, 8, 12, 14, 16, 18, 20, 21, 24, 27],
  eorin: [2, 3, 4, 9, 10, 11, 16, 17, 18, 24],
  bangwon: [1, 2, 3, 4, 5, 7, 13, 22, 23, 24, 25, 26],
  jangsa: [2, 3, 9, 10, 16, 17, 23, 24, 25],
};

export const FORMATION_COUNTERS: Record<
  ArmyFormationId,
  ArmyFormationId[]
> = {
  anhaeng: ["hakik"],
  bongsi: ["anhaeng", "jangsa"],
  hakik: ["eorin", "bangwon"],
  eorin: ["bongsi"],
  bangwon: ["anhaeng"],
  jangsa: ["hakik", "bangwon"],
};

export const TERRAIN_FEATURE_META: Record<
  TerrainFeature,
  {
    mark: string;
    title: string;
    hint: string;
    attack: number;
    armor: number;
    range: number;
    mobility: number;
    favoredTroops: TroopKind[];
  }
> = {
  개활지: {
    mark: "原",
    title: "개활지",
    hint: "기병 이동 +1",
    attack: 0,
    armor: 0,
    range: 0,
    mobility: 1,
    favoredTroops: ["기병"],
  },
  도로: {
    mark: "道",
    title: "군용로",
    hint: "모든 부대 이동 +1",
    attack: 0,
    armor: 0,
    range: 0,
    mobility: 1,
    favoredTroops: ["보병", "창병", "기병", "궁병", "방패병", "수군"],
  },
  고지: {
    mark: "高",
    title: "고지",
    hint: "궁병 사거리 +1, 공격 +12%",
    attack: 0.12,
    armor: 0.05,
    range: 1,
    mobility: -1,
    favoredTroops: ["궁병"],
  },
  협로: {
    mark: "峽",
    title: "협로",
    hint: "창·방패 방어 +14%",
    attack: 0,
    armor: 0.14,
    range: 0,
    mobility: -1,
    favoredTroops: ["창병", "방패병"],
  },
  암석: {
    mark: "岩",
    title: "암석 지대",
    hint: "원거리 피해 감소",
    attack: -0.04,
    armor: 0.1,
    range: 0,
    mobility: -1,
    favoredTroops: ["보병", "방패병"],
  },
  갑판: {
    mark: "舷",
    title: "함선 갑판",
    hint: "수군 공격·이동 상승",
    attack: 0.1,
    armor: 0.03,
    range: 0,
    mobility: 1,
    favoredTroops: ["수군"],
  },
  수로: {
    mark: "水",
    title: "수로",
    hint: "수군 이동 +2, 기병 이동 -2",
    attack: 0.08,
    armor: 0,
    range: 0,
    mobility: 2,
    favoredTroops: ["수군"],
  },
  얕은물: {
    mark: "淺",
    title: "얕은 물",
    hint: "수군·창병 방어 상승",
    attack: 0,
    armor: 0.08,
    range: 0,
    mobility: -1,
    favoredTroops: ["수군", "창병"],
  },
  진흙: {
    mark: "泥",
    title: "진흙",
    hint: "기병 이동·공격 저하",
    attack: -0.08,
    armor: 0.04,
    range: 0,
    mobility: -2,
    favoredTroops: ["방패병"],
  },
  갈대: {
    mark: "蘆",
    title: "갈대밭",
    hint: "궁병 첫 사격 강화",
    attack: 0.09,
    armor: 0.02,
    range: 0,
    mobility: -1,
    favoredTroops: ["궁병", "수군"],
  },
  숲: {
    mark: "林",
    title: "숲",
    hint: "매복 피해 +14%",
    attack: 0.14,
    armor: 0.04,
    range: -1,
    mobility: -1,
    favoredTroops: ["보병", "궁병"],
  },
  폐허: {
    mark: "墟",
    title: "고대 폐허",
    hint: "궁병·방패병 엄폐",
    attack: 0.04,
    armor: 0.13,
    range: 0,
    mobility: -1,
    favoredTroops: ["궁병", "방패병"],
  },
  사구: {
    mark: "丘",
    title: "사구",
    hint: "고지 판정, 이동 저하",
    attack: 0.08,
    armor: 0.04,
    range: 1,
    mobility: -1,
    favoredTroops: ["궁병", "기병"],
  },
  오아시스: {
    mark: "泉",
    title: "오아시스",
    hint: "사기 회복 +8",
    attack: 0,
    armor: 0.05,
    range: 0,
    mobility: 0,
    favoredTroops: ["보병", "창병", "기병", "궁병", "방패병", "수군"],
  },
};

const baseFeatures = (feature: TerrainFeature) =>
  Array.from({ length: 28 }, () => feature);

const withFeatures = (
  base: TerrainFeature,
  groups: Partial<Record<TerrainFeature, number[]>>,
) => {
  const result = baseFeatures(base);
  Object.entries(groups).forEach(([feature, positions]) => {
    positions?.forEach((position) => {
      result[position] = feature as TerrainFeature;
    });
  });
  return result;
};

export const BATTLEFIELD_FEATURES: Record<
  BattlefieldTheme,
  TerrainFeature[]
> = {
  평지: withFeatures("개활지", {
    도로: [3, 10, 17, 24],
    고지: [0, 6],
  }),
  산지: withFeatures("암석", {
    고지: [0, 1, 5, 6, 14, 20],
    협로: [3, 9, 10, 11, 17, 24],
    도로: [16, 18],
  }),
  바다: withFeatures("갑판", {
    수로: [0, 6, 7, 13, 14, 20, 21, 27],
    얕은물: [1, 5, 22, 26],
  }),
  습지: withFeatures("진흙", {
    수로: [0, 6, 8, 12, 15, 19, 21, 27],
    갈대: [1, 5, 14, 20, 22, 26],
    도로: [3, 10, 17, 24],
  }),
  정글: withFeatures("숲", {
    폐허: [2, 3, 4, 10, 16, 17, 18, 24],
    도로: [9, 11, 23, 25],
    개활지: [15, 19],
  }),
  사막: withFeatures("개활지", {
    사구: [0, 1, 5, 6, 14, 20, 21, 27],
    오아시스: [10, 17],
    도로: [3, 9, 11, 16, 18, 24],
  }),
};

const favoredTroopForRole: Record<Role, TroopKind> = {
  군주: "보병",
  용장: "보병",
  수호: "방패병",
  책사: "궁병",
  궁수: "궁병",
  기병: "기병",
  암살: "기병",
  지원: "창병",
};

export const commandableTroopsFor = (hero: Hero): TroopKind[] => {
  const roleTroops: Record<Role, TroopKind[]> = {
    군주: ["보병", "창병", "방패병"],
    용장: ["보병", "창병"],
    수호: ["방패병", "창병", "보병"],
    책사: ["궁병", "보병"],
    궁수: ["궁병", "보병"],
    기병: ["기병", "보병"],
    암살: ["기병", "보병"],
    지원: ["창병", "방패병"],
  };
  const commandable = [...roleTroops[hero.role]];

  if (hero.cost >= 4 && ["군주", "용장", "기병"].includes(hero.role)) {
    commandable.push("기병");
  }
  if (hero.cost >= 3 && hero.role === "암살") {
    commandable.push("궁병");
  }
  if (hero.cost >= 4 && ["기병", "용장"].includes(hero.role)) {
    commandable.push("창병");
  }

  const navalCommanders = new Set([
    "sun-ce",
    "zhou-yu",
    "lu-su",
    "lu-meng",
    "gan-ning",
    "guan-yu",
    "zhuge-liang",
  ]);
  if (
    navalCommanders.has(hero.id) ||
    (hero.faction === "오" &&
      (hero.cost >= 2 || hero.affinity.includes("바다")))
  ) {
    commandable.push("수군");
  }

  return ALL_TROOP_KINDS.filter((kind) => commandable.includes(kind));
};

export const commanderEffectFor = (hero: Hero): CommanderEffect => {
  const scale = 0.025 + hero.cost * 0.018;
  const favoredTroop = favoredTroopForRole[hero.role];

  const roleEffects: Record<
    Role,
    Pick<
      CommanderEffect,
      "title" | "summary" | "attack" | "armor" | "morale" | "range" | "mobility"
    >
  > = {
    군주: {
      title: "대군 지휘",
      summary: `부대 사기 +${8 + hero.cost * 3}, 인접 아군 사기 유지`,
      attack: scale * 0.55,
      armor: scale * 0.35,
      morale: 8 + hero.cost * 3,
      range: 0,
      mobility: 0,
    },
    용장: {
      title: "선봉 격려",
      summary: `첫 교전 공격 +${Math.round(scale * 130)}%`,
      attack: scale * 1.3,
      armor: 0,
      morale: 4 + hero.cost,
      range: 0,
      mobility: 0,
    },
    수호: {
      title: "철벽 통솔",
      summary: `피해 감소 ${Math.round(scale * 100)}%`,
      attack: 0,
      armor: scale * 1.1,
      morale: 6 + hero.cost,
      range: 0,
      mobility: 0,
    },
    책사: {
      title: "지형 책략",
      summary: `지형 보너스 증폭, 원거리 공격 +${Math.round(scale * 90)}%`,
      attack: scale * 0.9,
      armor: scale * 0.2,
      morale: 4,
      range: hero.cost >= 4 ? 1 : 0,
      mobility: 0,
    },
    궁수: {
      title: "일제 사격",
      summary: `궁병 사거리·연사 강화`,
      attack: scale,
      armor: 0,
      morale: 3,
      range: hero.cost >= 3 ? 1 : 0,
      mobility: 0,
    },
    기병: {
      title: "철기 돌파",
      summary: `기병 이동 +1, 돌격 공격 +${Math.round(scale * 120)}%`,
      attack: scale * 1.2,
      armor: 0,
      morale: 5,
      range: 0,
      mobility: 1,
    },
    암살: {
      title: "후열 교란",
      summary: "첫 목표를 적 후열로 지정하고 사기를削減",
      attack: scale,
      armor: 0,
      morale: 2,
      range: 0,
      mobility: 1,
    },
    지원: {
      title: "군수 보급",
      summary: `교전 중 병력 회복 ${25 + hero.cost * 15}`,
      attack: scale * 0.25,
      armor: scale * 0.45,
      morale: 8 + hero.cost * 2,
      range: 0,
      mobility: 0,
    },
  };

  return {
    ...roleEffects[hero.role],
    favoredTroop,
    commandableTroops: commandableTroopsFor(hero),
    terrainMastery: hero.affinity,
  };
};

export const commanderPowerScore = (hero: Hero, regiment: Regiment) => {
  const effect = commanderEffectFor(hero);
  return (
    hero.cost * 10 +
    (effect.favoredTroop === regiment.kind ? 18 : 0) +
    (effect.commandableTroops.includes(regiment.kind) ? 8 : -100) +
    effect.terrainMastery.length * 2
  );
};

export const INITIAL_REGIMENTS: Regiment[] = [
  {
    id: "shield-center",
    name: "중군 방패대",
    kind: "방패병",
    troops: 1100,
    maxTroops: 1100,
    position: 3,
    veterancy: 0,
  },
  {
    id: "spear-left",
    name: "좌익 장창대",
    kind: "창병",
    troops: 980,
    maxTroops: 980,
    position: 9,
    veterancy: 0,
  },
  {
    id: "infantry-right",
    name: "우익 보병대",
    kind: "보병",
    troops: 1040,
    maxTroops: 1040,
    position: 11,
    veterancy: 0,
  },
  {
    id: "archer-left",
    name: "좌궁 사격대",
    kind: "궁병",
    troops: 760,
    maxTroops: 760,
    position: 23,
    veterancy: 0,
  },
  {
    id: "archer-right",
    name: "우궁 사격대",
    kind: "궁병",
    troops: 760,
    maxTroops: 760,
    position: 25,
    veterancy: 0,
  },
  {
    id: "cavalry-wing",
    name: "별동 철기대",
    kind: "기병",
    troops: 620,
    maxTroops: 620,
    position: 20,
    veterancy: 0,
  },
];

const seeded = (seed: number) => {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return { next, value: next / 4294967296 };
};

export const commanderDeckForTurn = (
  turn: number,
  faction?: Hero["faction"],
) => {
  const maxCost = Math.min(5, 1 + Math.ceil(turn / 2));
  const pool = HEROES.filter(
    (hero) =>
      hero.cost <= maxCost &&
      (turn >= 4 || !faction || hero.faction === faction || hero.cost === 1),
  );
  const picked: Hero[] = [];
  let seed = turn * 7919 + 47;

  while (picked.length < 4 && pool.length) {
    const roll = seeded(seed);
    seed = roll.next;
    const remaining = pool.filter(
      (hero) => !picked.some((candidate) => candidate.id === hero.id),
    );
    if (!remaining.length) break;
    picked.push(remaining[Math.floor(roll.value * remaining.length)]);
  }

  return picked;
};

export const nextBattlefieldTheme = (
  turn: number,
  previous?: BattlefieldTheme,
) => {
  const themes: BattlefieldTheme[] = [
    "평지",
    "산지",
    "바다",
    "습지",
    "정글",
    "사막",
  ];
  const start = Math.abs(turn * 11 + 3) % themes.length;
  return themes.find((theme, index) => index >= start && theme !== previous) ??
    themes.find((theme) => theme !== previous) ??
    "평지";
};

export const recommendedTacticFor = (theme: BattlefieldTheme) =>
  (Object.keys(TACTICS) as TacticId[])
    .filter((id) => TACTICS[id].favoredTerrain.includes(theme))
    .sort((a, b) => TACTICS[b].attack - TACTICS[a].attack)[0] ?? "line-hold";
