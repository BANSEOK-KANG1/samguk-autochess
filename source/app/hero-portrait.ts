import type { Hero } from "./game-data";

const FACTION_ATLAS: Record<Hero["faction"], string> = {
  위: "/portraits/wei-atlas.webp",
  촉: "/portraits/shu-atlas.webp",
  오: "/portraits/wu-atlas.webp",
  기타: "/portraits/others-atlas.webp",
};

export const heroPortraitStyle = (hero: Hero) => {
  const column = hero.portraitIndex % 5;
  const row = Math.floor(hero.portraitIndex / 5);

  return {
    backgroundImage: `url('${FACTION_ATLAS[hero.faction]}')`,
    backgroundPosition: `${column * 25}% ${row * 25}%`,
    backgroundSize: "500% 500%",
  };
};
