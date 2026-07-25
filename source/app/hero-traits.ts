import {
  FACTION_COLOR,
  rangeLabelFor,
  type Hero,
} from "./game-data";
import { dutyProfileFor } from "./combat-duty";

export type TraitIcon = {
  id: string;
  glyph: string;
  label: string;
  tip: string;
  tone: string;
};

/** 장수 카드/피규어에 붙는 특성 아이콘 묶음 */
export const traitsForHero = (hero: Hero): TraitIcon[] => {
  const duty = dutyProfileFor(hero);
  const rangeTone =
    hero.range >= 5 ? "#6aae7a" : hero.range >= 3 ? "#7a9ec4" : "#c49a6a";
  const traits: TraitIcon[] = [
    {
      id: `duty-${duty.id}`,
      glyph: duty.glyph,
      label: duty.short,
      tip: `${duty.label} · ${duty.description}`,
      tone: "#d4b56a",
    },
    {
      id: `range-${hero.range}`,
      glyph: hero.range >= 5 ? "장" : hero.range >= 3 ? "중" : "근",
      label: `${hero.range}`,
      tip: `${rangeLabelFor(hero.range)} · 사거리 ${hero.range}칸`,
      tone: rangeTone,
    },
    {
      id: `faction-${hero.faction}`,
      glyph: hero.faction === "기타" ? "군" : hero.faction.slice(0, 1),
      label: hero.faction,
      tip: `${hero.faction} 진영`,
      tone: FACTION_COLOR[hero.faction],
    },
  ];

  hero.bonds.slice(0, 2).forEach((bond) => {
    traits.push({
      id: `bond-${bond}`,
      glyph: bond.slice(0, 1),
      label: bond.slice(0, 2),
      tip: `인연 · ${bond}`,
      tone: "#c79c54",
    });
  });

  if (hero.passive.kind === "전투") {
    traits.push({
      id: "passive-combat",
      glyph: "전",
      label: "전투",
      tip: `${hero.passive.name} · ${hero.passive.description}`,
      tone: "#c07050",
    });
  } else if (hero.passive.kind === "지형") {
    traits.push({
      id: "passive-terrain",
      glyph: "지",
      label: "지형",
      tip: `${hero.passive.name} · ${hero.passive.description}`,
      tone: "#6a9080",
    });
  } else {
    traits.push({
      id: "passive-eco",
      glyph: "경",
      label: "경제",
      tip: `${hero.passive.name} · ${hero.passive.description}`,
      tone: "#b08a45",
    });
  }

  return traits.slice(0, 5);
};
