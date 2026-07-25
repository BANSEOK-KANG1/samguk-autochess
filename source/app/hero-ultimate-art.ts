import type { Hero } from "./game-data";

export type HeroUltimateArt = {
  src: string;
  /** 장수가 왼쪽 약 35%에 배치된 원화의 포커스 지점 */
  focus: string;
};

const HERO_ULTIMATE_ART: Partial<Record<Hero["id"], HeroUltimateArt>> = {
  "cao-cao": {
    src: "./ultimate-scenes/cao-cao-ultimate-v22.webp",
    focus: "28% center",
  },
  "guan-yu": {
    src: "./ultimate-scenes/guan-yu-ultimate-v22.webp",
    focus: "30% center",
  },
  "zhou-yu": {
    src: "./ultimate-scenes/zhou-yu-ultimate-v22.webp",
    focus: "32% center",
  },
};

export const heroUltimateArtFor = (hero: Hero) =>
  HERO_ULTIMATE_ART[hero.id] ?? null;
