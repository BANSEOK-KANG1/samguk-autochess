import type { Hero } from "./game-data";

const FACTION_COMBAT_ATLAS: Record<Hero["faction"], string> = {
  위: "/combat-units/wei-fullbody.webp",
  촉: "/combat-units/shu-fullbody.webp",
  오: "/combat-units/wu-fullbody.webp",
  기타: "/combat-units/others-fullbody.webp",
};

export const heroCombatArtStyle = (hero: Hero) => {
  const column = hero.portraitIndex % 5;
  const row = Math.floor(hero.portraitIndex / 5);

  return {
    backgroundImage: `url('${FACTION_COMBAT_ATLAS[hero.faction]}')`,
    backgroundPosition: `${column * 25}% ${row * 25}%`,
    backgroundSize: "500% 500%",
  };
};
