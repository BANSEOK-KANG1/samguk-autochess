import type { Faction, Role } from "./game-data";

export type HeadgearStyle =
  | "crown"
  | "diadem"
  | "war-helm"
  | "heavy-helm"
  | "plume"
  | "winged-helm"
  | "tiger-helm"
  | "horned-helm"
  | "scholar-cap"
  | "topknot"
  | "hood"
  | "fur-cap"
  | "veil"
  | "healer-cap";

export type BeardStyle =
  | "none"
  | "short"
  | "long"
  | "full"
  | "mask";

export type BuildStyle =
  | "regal"
  | "heroic"
  | "fortress"
  | "robed"
  | "agile"
  | "mounted";

export type FaceStyle = "round" | "square" | "long" | "sharp";

export type HeroAppearance = {
  headgear: HeadgearStyle;
  beard: BeardStyle;
  build: BuildStyle;
  face: FaceStyle;
  armor: string;
  armorDeep: string;
  trim: string;
  cloth: string;
  skin: string;
  hair: string;
  metal: string;
  variant: number;
  bodyScaleX: number;
  bodyScaleY: number;
  headWidth: number;
  headHeight: number;
  helmetTilt: number;
};

const FACTION_PALETTES: Record<
  Faction,
  Pick<
    HeroAppearance,
    "armor" | "armorDeep" | "trim" | "cloth" | "skin" | "hair" | "metal"
  >
> = {
  위: {
    armor: "#456d9a",
    armorDeep: "#172b43",
    trim: "#b9cad8",
    cloth: "#243d62",
    skin: "#b98562",
    hair: "#171a1d",
    metal: "#c7d3da",
  },
  촉: {
    armor: "#487c5c",
    armorDeep: "#183628",
    trim: "#d0b56f",
    cloth: "#28543a",
    skin: "#b9825d",
    hair: "#191b17",
    metal: "#c9d1c0",
  },
  오: {
    armor: "#9b4c43",
    armorDeep: "#471c1b",
    trim: "#d4b16e",
    cloth: "#6f2928",
    skin: "#ba8561",
    hair: "#1b1818",
    metal: "#d4c8b2",
  },
  기타: {
    armor: "#776341",
    armorDeep: "#33291f",
    trim: "#c9a55e",
    cloth: "#4c3d2b",
    skin: "#ad7958",
    hair: "#171615",
    metal: "#c3b797",
  },
};

const ROLE_SHAPES: Record<
  Role,
  Pick<HeroAppearance, "headgear" | "beard" | "build">
> = {
  군주: { headgear: "crown", beard: "short", build: "regal" },
  용장: { headgear: "war-helm", beard: "short", build: "heroic" },
  수호: { headgear: "heavy-helm", beard: "full", build: "fortress" },
  책사: { headgear: "scholar-cap", beard: "none", build: "robed" },
  궁수: { headgear: "topknot", beard: "none", build: "agile" },
  기병: { headgear: "plume", beard: "short", build: "mounted" },
  암살: { headgear: "hood", beard: "mask", build: "agile" },
  지원: { headgear: "healer-cap", beard: "none", build: "robed" },
};

const ROLE_HEADGEAR: Record<Role, HeadgearStyle[]> = {
  군주: ["crown", "diadem", "winged-helm"],
  용장: ["war-helm", "plume", "tiger-helm"],
  수호: ["heavy-helm", "horned-helm", "war-helm"],
  책사: ["scholar-cap", "hood", "diadem"],
  궁수: ["topknot", "fur-cap", "plume"],
  기병: ["plume", "winged-helm", "war-helm"],
  암살: ["hood", "topknot", "veil"],
  지원: ["healer-cap", "scholar-cap", "veil"],
};

const ROLE_BUILDS: Record<Role, BuildStyle[]> = {
  군주: ["regal", "robed", "heroic"],
  용장: ["heroic", "fortress", "agile"],
  수호: ["fortress", "heroic", "mounted"],
  책사: ["robed", "regal", "agile"],
  궁수: ["agile", "heroic", "mounted"],
  기병: ["mounted", "heroic", "agile"],
  암살: ["agile", "robed", "heroic"],
  지원: ["robed", "regal", "agile"],
};

const ROLE_BEARDS: Record<Role, BeardStyle[]> = {
  군주: ["short", "none", "long"],
  용장: ["short", "full", "none"],
  수호: ["full", "short", "long"],
  책사: ["none", "short", "long"],
  궁수: ["none", "short", "long"],
  기병: ["short", "none", "full"],
  암살: ["mask", "none", "short"],
  지원: ["none", "short", "long"],
};

const FEMALE_HEROES = new Set([
  "zhen-ji",
  "wang-yi",
  "huang-yueying",
  "da-qiao",
  "diao-chan",
  "sun-shangxiang",
  "xiao-qiao",
  "bu-lianshi",
  "zhu-rong",
  "cai-wenji",
  "dong-bai",
]);

const ICONIC_APPEARANCES: Partial<
  Record<string, Partial<Omit<HeroAppearance, "variant">>>
> = {
  "cao-cao": {
    headgear: "crown",
    beard: "short",
    armor: "#3d5f87",
    armorDeep: "#121e31",
    trim: "#d5c07a",
    cloth: "#1e3150",
  },
  "liu-bei": {
    headgear: "diadem",
    beard: "short",
    armor: "#4f7d55",
    armorDeep: "#183324",
    trim: "#d8c57d",
    cloth: "#2e5839",
  },
  "sun-quan": {
    headgear: "crown",
    beard: "short",
    armor: "#8d453e",
    armorDeep: "#391819",
    trim: "#e0bd74",
    cloth: "#692727",
  },
  "lu-bu": {
    headgear: "plume",
    beard: "none",
    build: "heroic",
    armor: "#9f3935",
    armorDeep: "#25151a",
    trim: "#e1bc64",
    cloth: "#5e1f25",
    metal: "#d9d2c1",
  },
  "guan-yu": {
    headgear: "diadem",
    beard: "long",
    armor: "#39705a",
    armorDeep: "#123326",
    trim: "#d1b264",
    cloth: "#204d38",
    skin: "#ae684e",
  },
  "zhang-fei": {
    headgear: "war-helm",
    beard: "full",
    build: "fortress",
    armor: "#5a4938",
    armorDeep: "#211b19",
    trim: "#bd8f52",
    cloth: "#3d2724",
    skin: "#966044",
  },
  "zhuge-liang": {
    headgear: "scholar-cap",
    beard: "none",
    build: "robed",
    armor: "#71809d",
    armorDeep: "#273347",
    trim: "#e3dcc6",
    cloth: "#c8c4b4",
    hair: "#24211e",
  },
  "zhou-yu": {
    headgear: "topknot",
    beard: "none",
    build: "regal",
    armor: "#a84d43",
    armorDeep: "#451b1c",
    trim: "#efc178",
    cloth: "#762b2b",
  },
  "sima-yi": {
    headgear: "hood",
    beard: "short",
    build: "robed",
    armor: "#5b4a70",
    armorDeep: "#211b31",
    trim: "#bda9cf",
    cloth: "#352745",
  },
  "zhao-yun": {
    headgear: "plume",
    beard: "none",
    armor: "#788f9d",
    armorDeep: "#293b46",
    trim: "#e2e6dc",
    cloth: "#476272",
    metal: "#e4ebec",
  },
  "ma-chao": {
    headgear: "plume",
    beard: "none",
    armor: "#8b989d",
    armorDeep: "#344047",
    trim: "#e6dcae",
    cloth: "#52656e",
  },
  "huang-zhong": {
    headgear: "topknot",
    beard: "long",
    armor: "#80704c",
    armorDeep: "#332b21",
    trim: "#d4b66c",
    hair: "#d1c7ad",
  },
  "sun-ce": {
    headgear: "plume",
    beard: "none",
    build: "heroic",
    armor: "#a94b3d",
    armorDeep: "#441a19",
    trim: "#e5b764",
    cloth: "#702627",
  },
  "diao-chan": {
    headgear: "diadem",
    beard: "none",
    build: "agile",
    armor: "#9d668e",
    armorDeep: "#40263c",
    trim: "#ebc7dc",
    cloth: "#724563",
    hair: "#241a21",
  },
  "gan-ning": {
    headgear: "hood",
    beard: "mask",
    armor: "#356a76",
    armorDeep: "#152f38",
    trim: "#d2bc77",
    cloth: "#234c56",
  },
  "zhang-jiao": {
    headgear: "scholar-cap",
    beard: "long",
    build: "robed",
    armor: "#8d7d45",
    armorDeep: "#38301d",
    trim: "#e0ca6e",
    cloth: "#5b512d",
  },
  "hua-tuo": {
    headgear: "healer-cap",
    beard: "long",
    build: "robed",
    armor: "#72836a",
    armorDeep: "#334134",
    trim: "#dfd7b4",
    cloth: "#aeb59d",
    hair: "#d5d0c2",
  },
  "zhu-rong": {
    headgear: "diadem",
    beard: "none",
    build: "agile",
    armor: "#a64732",
    armorDeep: "#411d18",
    trim: "#e5a957",
    cloth: "#762b23",
  },
  "meng-huo": {
    headgear: "heavy-helm",
    beard: "full",
    build: "fortress",
    armor: "#6d633d",
    armorDeep: "#2e2a1c",
    trim: "#d2ad5b",
    cloth: "#443e28",
  },
};

const appearanceHash = (heroId: string) =>
  [...heroId].reduce(
    (sum, letter, index) => (sum * 33 + letter.charCodeAt(0) * (index + 7)) >>> 0,
    5381,
  );

export const heroAppearanceFor = (
  heroId: string,
  role: Role,
  faction: Faction,
): HeroAppearance => {
  const hash = appearanceHash(heroId);
  const feminine = FEMALE_HEROES.has(heroId);
  const headgearPool = feminine
    ? (["diadem", "veil", "topknot", "healer-cap"] satisfies HeadgearStyle[])
    : ROLE_HEADGEAR[role];
  const headgear = headgearPool[hash % headgearPool.length];
  const beard = feminine
    ? "none"
    : ROLE_BEARDS[role][Math.floor(hash / 7) % ROLE_BEARDS[role].length];
  const build =
    ROLE_BUILDS[role][Math.floor(hash / 13) % ROLE_BUILDS[role].length];
  const faces: FaceStyle[] = ["round", "square", "long", "sharp"];
  const face = faces[Math.floor(hash / 17) % faces.length];

  return {
    ...FACTION_PALETTES[faction],
    ...ROLE_SHAPES[role],
    headgear,
    beard,
    build,
    face,
    variant: hash % 4,
    bodyScaleX: 0.9 + (hash % 9) * 0.025,
    bodyScaleY: 0.94 + (Math.floor(hash / 11) % 8) * 0.02,
    headWidth: 25 + (Math.floor(hash / 19) % 7),
    headHeight: 27 + (Math.floor(hash / 23) % 7),
    helmetTilt: -5 + (Math.floor(hash / 29) % 11),
    ...ICONIC_APPEARANCES[heroId],
  };
};
