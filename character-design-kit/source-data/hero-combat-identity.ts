import type { Role } from "./game-data";

export type WeaponType =
  | "command-sword"
  | "twin-sword"
  | "guandao"
  | "halberd"
  | "war-spear"
  | "serpent-spear"
  | "greatblade"
  | "tower-shield"
  | "feather-fan"
  | "war-bow"
  | "twin-dagger"
  | "ritual-staff";

export type UltimateEffect =
  | "command"
  | "benevolence"
  | "dragon"
  | "fury"
  | "roar"
  | "storm"
  | "fire"
  | "counter"
  | "charge"
  | "volley"
  | "tide"
  | "moon"
  | "shadow"
  | "guard"
  | "heal"
  | "thunder";

export type CombatIdentity = {
  weapon: WeaponType;
  weaponName: string;
  effect: UltimateEffect;
  glyph: string;
  color: string;
  accent: string;
  title: string;
};

const ROLE_DEFAULTS: Record<Role, CombatIdentity> = {
  군주: {
    weapon: "command-sword",
    weaponName: "지휘검",
    effect: "command",
    glyph: "令",
    color: "#d6b45f",
    accent: "#fff0b0",
    title: "천하의 군령",
  },
  용장: {
    weapon: "greatblade",
    weaponName: "대도",
    effect: "fury",
    glyph: "斬",
    color: "#cf5c46",
    accent: "#ffd09a",
    title: "일기당천",
  },
  수호: {
    weapon: "tower-shield",
    weaponName: "철갑방패",
    effect: "guard",
    glyph: "壁",
    color: "#6b9db7",
    accent: "#c7eeff",
    title: "금성철벽",
  },
  책사: {
    weapon: "feather-fan",
    weaponName: "군사 부채",
    effect: "storm",
    glyph: "策",
    color: "#9f76cc",
    accent: "#e8d4ff",
    title: "천변지계",
  },
  궁수: {
    weapon: "war-bow",
    weaponName: "강궁",
    effect: "volley",
    glyph: "穿",
    color: "#cf9255",
    accent: "#ffe3a3",
    title: "백발백중",
  },
  기병: {
    weapon: "war-spear",
    weaponName: "기병창",
    effect: "charge",
    glyph: "突",
    color: "#6faab1",
    accent: "#d5fbf6",
    title: "철기돌파",
  },
  암살: {
    weapon: "twin-dagger",
    weaponName: "쌍단검",
    effect: "shadow",
    glyph: "影",
    color: "#a45f93",
    accent: "#ffd2f4",
    title: "무영살",
  },
  지원: {
    weapon: "ritual-staff",
    weaponName: "의장 지팡이",
    effect: "heal",
    glyph: "生",
    color: "#75aa68",
    accent: "#dbffc8",
    title: "생명의 숨결",
  },
};

const ICONIC_IDENTITIES: Partial<Record<string, CombatIdentity>> = {
  "cao-cao": {
    weapon: "command-sword",
    weaponName: "의천검",
    effect: "command",
    glyph: "覇",
    color: "#4f80b8",
    accent: "#d7eaff",
    title: "천하포무",
  },
  "liu-bei": {
    weapon: "twin-sword",
    weaponName: "쌍고검",
    effect: "benevolence",
    glyph: "仁",
    color: "#6ca861",
    accent: "#e1ffd0",
    title: "인의의 깃발",
  },
  "sun-quan": {
    weapon: "command-sword",
    weaponName: "벽안검",
    effect: "tide",
    glyph: "吳",
    color: "#b45a48",
    accent: "#ffd5b8",
    title: "벽안의 군령",
  },
  "lu-bu": {
    weapon: "halberd",
    weaponName: "방천화극",
    effect: "fury",
    glyph: "無",
    color: "#c5483d",
    accent: "#fff0a8",
    title: "천하무쌍",
  },
  "guan-yu": {
    weapon: "guandao",
    weaponName: "청룡언월도",
    effect: "dragon",
    glyph: "龍",
    color: "#429576",
    accent: "#caffdc",
    title: "청룡언월",
  },
  "zhang-fei": {
    weapon: "serpent-spear",
    weaponName: "장팔사모",
    effect: "roar",
    glyph: "喝",
    color: "#a96a3d",
    accent: "#ffe0a4",
    title: "장판교의 포효",
  },
  "zhuge-liang": {
    weapon: "feather-fan",
    weaponName: "백우선",
    effect: "storm",
    glyph: "風",
    color: "#7f91c8",
    accent: "#e5ecff",
    title: "동남풍",
  },
  "zhou-yu": {
    weapon: "feather-fan",
    weaponName: "적염선",
    effect: "fire",
    glyph: "火",
    color: "#c75343",
    accent: "#ffd28d",
    title: "적벽화공",
  },
  "sima-yi": {
    weapon: "feather-fan",
    weaponName: "현명선",
    effect: "counter",
    glyph: "反",
    color: "#72558c",
    accent: "#e5c9ff",
    title: "심연의 반계",
  },
  "zhao-yun": {
    weapon: "war-spear",
    weaponName: "용담창",
    effect: "charge",
    glyph: "趙",
    color: "#6e9da9",
    accent: "#e0fcff",
    title: "칠진칠출",
  },
  "ma-chao": {
    weapon: "war-spear",
    weaponName: "서량은창",
    effect: "charge",
    glyph: "鐵",
    color: "#91a8b3",
    accent: "#f1fbff",
    title: "철기돌파",
  },
  "huang-zhong": {
    weapon: "war-bow",
    weaponName: "황룡궁",
    effect: "volley",
    glyph: "穿",
    color: "#c6954f",
    accent: "#fff0b5",
    title: "백보천양",
  },
  "zhang-liao": {
    weapon: "halberd",
    weaponName: "요동월아극",
    effect: "charge",
    glyph: "遼",
    color: "#557fa4",
    accent: "#d1ebff",
    title: "요동강습",
  },
  "sun-ce": {
    weapon: "war-spear",
    weaponName: "패왕창",
    effect: "tide",
    glyph: "覇",
    color: "#bc5946",
    accent: "#ffd39e",
    title: "소패왕",
  },
  "da-qiao": {
    weapon: "ritual-staff",
    weaponName: "유수장",
    effect: "tide",
    glyph: "水",
    color: "#6ba6ae",
    accent: "#d2fbff",
    title: "유수의 가호",
  },
  "diao-chan": {
    weapon: "twin-dagger",
    weaponName: "폐월쌍인",
    effect: "moon",
    glyph: "月",
    color: "#b06c9e",
    accent: "#ffe0f7",
    title: "폐월",
  },
  "gan-ning": {
    weapon: "twin-dagger",
    weaponName: "금범쌍도",
    effect: "shadow",
    glyph: "夜",
    color: "#477e8f",
    accent: "#c9f5ff",
    title: "금범기습",
  },
  "xiahou-dun": {
    weapon: "greatblade",
    weaponName: "외안대도",
    effect: "guard",
    glyph: "獨",
    color: "#587c9c",
    accent: "#d5ecff",
    title: "강인한 외눈",
  },
  "pang-tong": {
    weapon: "feather-fan",
    weaponName: "봉추선",
    effect: "fire",
    glyph: "鳳",
    color: "#a35f75",
    accent: "#ffd5df",
    title: "봉추연환",
  },
  "lu-xun": {
    weapon: "feather-fan",
    weaponName: "연영선",
    effect: "fire",
    glyph: "炎",
    color: "#c86742",
    accent: "#ffe1a2",
    title: "화소연영",
  },
  "sun-shangxiang": {
    weapon: "war-bow",
    weaponName: "궁요희",
    effect: "volley",
    glyph: "姬",
    color: "#bd6b5d",
    accent: "#ffe1ce",
    title: "궁요희",
  },
  "meng-huo": {
    weapon: "tower-shield",
    weaponName: "남만왕 방패",
    effect: "fury",
    glyph: "王",
    color: "#8d7849",
    accent: "#f2dda1",
    title: "남만왕의 분노",
  },
  "zhu-rong": {
    weapon: "war-bow",
    weaponName: "화신비도",
    effect: "fire",
    glyph: "炎",
    color: "#c9583d",
    accent: "#ffd09a",
    title: "비도화염",
  },
  "zhang-jiao": {
    weapon: "ritual-staff",
    weaponName: "태평요술장",
    effect: "thunder",
    glyph: "雷",
    color: "#b69b45",
    accent: "#fff5a8",
    title: "창천사망",
  },
  "hua-tuo": {
    weapon: "ritual-staff",
    weaponName: "청낭장",
    effect: "heal",
    glyph: "生",
    color: "#67a666",
    accent: "#d8ffd1",
    title: "청낭서",
  },
  "zuo-ci": {
    weapon: "ritual-staff",
    weaponName: "둔갑천서",
    effect: "counter",
    glyph: "幻",
    color: "#7d6ab0",
    accent: "#e5dcff",
    title: "둔갑천서",
  },
};

const ROLE_WEAPON_VARIANTS: Record<
  Role,
  Array<Pick<CombatIdentity, "weapon" | "weaponName">>
> = {
  군주: [
    { weapon: "command-sword", weaponName: "지휘검" },
    { weapon: "twin-sword", weaponName: "군주쌍검" },
  ],
  용장: [
    { weapon: "greatblade", weaponName: "대도" },
    { weapon: "halberd", weaponName: "월아극" },
    { weapon: "war-spear", weaponName: "장창" },
    { weapon: "serpent-spear", weaponName: "사모" },
  ],
  수호: [
    { weapon: "tower-shield", weaponName: "철갑방패" },
    { weapon: "greatblade", weaponName: "수문대도" },
    { weapon: "war-spear", weaponName: "호위장창" },
  ],
  책사: [
    { weapon: "feather-fan", weaponName: "군사 부채" },
    { weapon: "ritual-staff", weaponName: "책략장" },
  ],
  궁수: [
    { weapon: "war-bow", weaponName: "강궁" },
    { weapon: "twin-dagger", weaponName: "투척쌍도" },
    { weapon: "war-spear", weaponName: "단극" },
  ],
  기병: [
    { weapon: "war-spear", weaponName: "기병창" },
    { weapon: "halberd", weaponName: "기마극" },
    { weapon: "greatblade", weaponName: "기마도" },
  ],
  암살: [
    { weapon: "twin-dagger", weaponName: "쌍단검" },
    { weapon: "twin-sword", weaponName: "은신쌍검" },
  ],
  지원: [
    { weapon: "ritual-staff", weaponName: "의장 지팡이" },
    { weapon: "feather-fan", weaponName: "치유선" },
    { weapon: "twin-sword", weaponName: "호신쌍검" },
  ],
};

const identityHash = (heroId: string) =>
  [...heroId].reduce(
    (sum, letter, index) => (sum + letter.charCodeAt(0) * (index + 11)) >>> 0,
    0,
  );

export const combatIdentityFor = (heroId: string, role: Role) => {
  const iconic = ICONIC_IDENTITIES[heroId];
  if (iconic) return iconic;

  const base = ROLE_DEFAULTS[role];
  const variants = ROLE_WEAPON_VARIANTS[role];
  const weapon = variants[identityHash(heroId) % variants.length];

  return {
    ...base,
    ...weapon,
  };
};
