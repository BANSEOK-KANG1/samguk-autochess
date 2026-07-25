import type { BoardCombatInput } from "../combat-engine";
import type { MatchState } from "./types";

export type EncounterKind = "farm" | "rival";

export type EncounterRule = {
  number: number;
  kind: EncounterKind;
  label: string;
  subtitle: string;
  targetLevel: number;
  enemyCount: number;
  enemyScale: number;
  goldReward: number;
  itemDrops: number;
};

const BANDIT_ROSTER = [
  "zhang-liang",
  "zhang-bao-yellow",
  "dong-bai",
  "yue-jin",
  "cao-hong",
] as const;

const BANDIT_SLOTS = [3, 9, 11, 16, 18, 24];

export const encounterNumberFor = (round: number, stage: number) =>
  (round - 1) * 5 + stage;

/**
 * Opening: encounters 1–3 are neutral farming rounds.
 * Afterwards: three rival rounds, then one farming round (7, 11, 15...).
 */
export const isFarmEncounterNumber = (number: number) =>
  number <= 3 || (number > 3 && (number - 3) % 4 === 0);

export const encounterRuleFor = (
  round: number,
  stage: number,
): EncounterRule => {
  const number = encounterNumberFor(round, stage);
  const kind: EncounterKind = isFarmEncounterNumber(number) ? "farm" : "rival";
  const openingFarm = number <= 3;
  const farmCycle = Math.max(0, Math.floor((number - 3) / 4));

  if (kind === "farm") {
    return {
      number,
      kind,
      label: openingFarm ? `초반 파밍 ${number}/3` : "산적 토벌",
      subtitle: openingFarm
        ? "산적·황건 잔당을 잡고 조합전 준비"
        : "조합전 3회 뒤 보급을 챙기는 파밍판",
      targetLevel: openingFarm ? number + 1 : Math.min(9, 4 + farmCycle),
      enemyCount: openingFarm
        ? number
        : Math.min(6, 3 + farmCycle),
      enemyScale: openingFarm ? 0.48 + number * 0.07 : Math.min(0.95, 0.68 + farmCycle * 0.06),
      goldReward: openingFarm ? 4 + number : 7 + farmCycle,
      itemDrops: number === 1 ? 0 : number === 2 ? 1 : Math.min(2, 1 + Math.floor(farmCycle / 2)),
    };
  }

  return {
    number,
    kind,
    label: "라이벌 조합전",
    subtitle: "진형·시너지·아이템을 갖춘 상대와 순위 경쟁",
    targetLevel: Math.min(9, 4 + Math.floor((number - 4) / 4)),
    enemyCount: 0,
    enemyScale: 1,
    goldReward: 0,
    itemDrops: 0,
  };
};

export const currentEncounterRule = (match: MatchState) =>
  encounterRuleFor(match.round, match.stage);

export const nextEncounterPosition = (round: number, stage: number) => ({
  round: stage === 5 ? round + 1 : round,
  stage: stage === 5 ? 1 : stage + 1,
});

export const nextEncounterRule = (match: MatchState) => {
  const next = nextEncounterPosition(match.round, match.stage);
  return encounterRuleFor(next.round, next.stage);
};

export const buildBanditInputs = (
  match: MatchState,
  rule = currentEncounterRule(match),
): BoardCombatInput[] =>
  Array.from({ length: rule.enemyCount }, (_, index) => ({
    uid: `bandit-${rule.number}-${index}`,
    heroId: BANDIT_ROSTER[index % BANDIT_ROSTER.length],
    star: (rule.number >= 11 && index === 0 ? 2 : 1) as 1 | 2,
    boardIndex: BANDIT_SLOTS[index % BANDIT_SLOTS.length],
  }));
