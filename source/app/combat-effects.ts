import type { BattlefieldTheme } from "./game-data";

export type StatusKind =
  | "burn"
  | "poison"
  | "stun"
  | "freeze"
  | "taunt"
  | "fear"
  | "inspire"
  | "ward"
  | "regen";

export type CombatImpact = "light" | "heavy" | "ultimate";

export const STATUS_META: Record<
  StatusKind,
  { label: string; glyph: string; description: string }
> = {
  burn: {
    label: "화상",
    glyph: "火",
    description: "행동 주기마다 화염 피해를 받습니다.",
  },
  poison: {
    label: "중독",
    glyph: "毒",
    description: "방어를 무시하는 지속 피해를 받습니다.",
  },
  stun: {
    label: "기절",
    glyph: "暈",
    description: "행동할 수 없습니다.",
  },
  freeze: {
    label: "빙결",
    glyph: "氷",
    description: "행동과 이동이 봉쇄됩니다.",
  },
  taunt: {
    label: "도발",
    glyph: "挑",
    description: "도발한 장수를 우선 공격합니다.",
  },
  fear: {
    label: "공포",
    glyph: "恐",
    description: "공격하지 못하고 시전자에게서 물러납니다.",
  },
  inspire: {
    label: "고무",
    glyph: "鼓",
    description: "공격력이 일시적으로 상승합니다.",
  },
  ward: {
    label: "가호",
    glyph: "守",
    description: "방어력이 일시적으로 상승합니다.",
  },
  regen: {
    label: "재생",
    glyph: "癒",
    description: "매 주기 소량 체력을 회복합니다.",
  },
};

export const TERRAIN_EVENT_META: Record<
  BattlefieldTheme,
  {
    slug: string;
    label: string;
    hanja: string;
    glyph: string;
    description: string;
  }
> = {
  평지: {
    slug: "plain",
    label: "질풍 가도",
    hanja: "疾風街道",
    glyph: "風",
    description: "탁 트인 길에서 기병과 용장이 기세를 얻습니다.",
  },
  산지: {
    slug: "mountain",
    label: "협곡 낙석",
    hanja: "峽谷落石",
    glyph: "岩",
    description: "전선에 낙석이 쏟아져 피해와 기절을 일으킵니다.",
  },
  바다: {
    slug: "sea",
    label: "격랑",
    hanja: "激浪",
    glyph: "浪",
    description: "큰 파도가 전열을 밀어내고 움직임을 얼어붙게 합니다.",
  },
  습지: {
    slug: "swamp",
    label: "진흙 수렁",
    hanja: "泥濘",
    glyph: "泥",
    description: "진흙이 근접 장수의 발을 묶고 독기를 퍼뜨립니다.",
  },
  정글: {
    slug: "jungle",
    label: "독화살 매복",
    hanja: "毒箭伏兵",
    glyph: "伏",
    description: "수풀의 복병이 약해진 후열을 중독시킵니다.",
  },
  사막: {
    slug: "desert",
    label: "모래폭풍",
    hanja: "沙塵暴",
    glyph: "沙",
    description: "거센 모래바람이 후열의 시야와 대형을 무너뜨립니다.",
  },
};
