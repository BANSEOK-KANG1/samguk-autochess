import { DIFFICULTIES } from "../combat-config";
import { BATTLEFIELD_THEMES, type BattlefieldTheme } from "../game-data";
import {
  createBattleState,
  simulateBattleToEnd,
  type CombatWinner,
} from "../combat-engine";
import { enemyTacticForSeed } from "../combat-config";
import { enemyFormationForSeed } from "../formation-config";
import { rollItemShop } from "../item-data";
import { boardToCombatInputs, rollShop } from "./game-session";
import { buildAiBoardInputs } from "./ai-seat";
import type { FightResult, MatchState, Pairing, PlayerState } from "./types";

const alivePlayers = (match: MatchState) =>
  match.players.filter((player) => !player.eliminated);

export const buildPairings = (match: MatchState): Pairing[] => {
  const ids = alivePlayers(match).map((player) => player.id);
  const rotated = [...ids];
  const pivot = (match.round * 3 + match.stage + match.seed) % Math.max(1, rotated.length);
  for (let step = 0; step < pivot; step += 1) {
    const head = rotated.shift();
    if (head) rotated.push(head);
  }
  const pairings: Pairing[] = [];
  for (let index = 0; index < rotated.length; index += 2) {
    pairings.push({
      a: rotated[index],
      b: rotated[index + 1] ?? null,
    });
  }
  return pairings;
};

export const turnIndexFor = (round: number, stage: number) =>
  (round - 1) * 5 + stage;

export const isItemShopTurn = (round: number, stage: number) =>
  turnIndexFor(round, stage) % 3 === 0;

const interestGold = (gold: number) => Math.min(5, Math.floor(gold / 10));

const streakBonus = (streak: number, won: boolean) =>
  won ? Math.min(3, Math.floor(Math.max(0, streak) / 2)) : 0;

const basePayout = (winner: CombatWinner | "bye", rewardMultiplier: number) => {
  const raw = winner === "ally" ? 6 : winner === "draw" ? 4 : winner === "bye" ? 5 : 3;
  return Math.round(raw * rewardMultiplier);
};

const damageForLoss = (round: number, stage: number, survivorCount: number) =>
  Math.min(18, 6 + Math.floor((round - 1) / 1) + stage + Math.max(0, 4 - survivorCount));

export const playerById = (match: MatchState, id: string) =>
  match.players.find((player) => player.id === id);

export const humanPairing = (match: MatchState) =>
  match.pairings.find(
    (pairing) => pairing.a === match.humanId || pairing.b === match.humanId,
  ) ?? null;

export const opponentForHuman = (match: MatchState): PlayerState | null => {
  const pairing = humanPairing(match);
  if (!pairing) return null;
  const foeId = pairing.a === match.humanId ? pairing.b : pairing.a;
  return foeId ? playerById(match, foeId) ?? null : null;
};

const resolveFight = (
  match: MatchState,
  pairing: Pairing,
  pairingIndex: number,
  theme: BattlefieldTheme,
  humanWinner?: CombatWinner,
): FightResult => {
  if (!pairing.b) {
    return {
      pairingIndex,
      aId: pairing.a,
      bId: null,
      winner: "bye",
      damage: 0,
    };
  }

  const a = playerById(match, pairing.a)!;
  const b = playerById(match, pairing.b)!;
  const involvesHuman =
    pairing.a === match.humanId || pairing.b === match.humanId;

  let winner: CombatWinner;
  if (involvesHuman && humanWinner) {
    // Watched battle always places the human on the ally side.
    // FightResult uses ally = pairing.a won, enemy = pairing.b won.
    const humanIsA = pairing.a === match.humanId;
    if (humanWinner === "draw") winner = "draw";
    else if (humanIsA) winner = humanWinner;
    else winner = humanWinner === "ally" ? "enemy" : "ally";
  } else {
    const seed =
      match.seed + match.round * 131 + match.stage * 17 + pairingIndex * 41;
    const aUnits =
      a.kind === "ai"
        ? buildAiBoardInputs(a, match, seed)
        : boardToCombatInputs(a.board);
    const bUnits =
      b.kind === "ai"
        ? buildAiBoardInputs(b, match, seed + 7)
        : boardToCombatInputs(b.board);
    const battle = createBattleState({
      allies: aUnits,
      enemies: bUnits,
      enemyCount: bUnits.length,
      level: Math.max(a.level, b.level),
      theme,
      seed,
      allyTactic: a.tactic,
      enemyTactic: b.tactic,
      allyFormation: a.formation,
      enemyFormation: b.formation,
      enemyScale: 1,
    });
    const finished = simulateBattleToEnd(battle);
    winner = finished.winner ?? "draw";
  }

  const survivors = alivePlayers(match).length;
  const damage =
    winner === "draw" || winner === ("bye" as CombatWinner)
      ? 0
      : damageForLoss(match.round, match.stage, survivors);

  return {
    pairingIndex,
    aId: pairing.a,
    bId: pairing.b,
    winner,
    damage,
  };
};

const applyFightToPlayers = (
  players: PlayerState[],
  result: FightResult,
  rewardMultiplier: number,
): PlayerState[] => {
  if (result.winner === "bye") {
    return players.map((player) => {
      if (player.id !== result.aId) return player;
      const interest = interestGold(player.gold);
      return {
        ...player,
        gold: player.gold + basePayout("bye", rewardMultiplier) + interest,
        streak: Math.max(1, player.streak + 1),
        wins: player.wins + 1,
      };
    });
  }

  const aWon = result.winner === "ally";
  const draw = result.winner === "draw";
  const bWon = result.winner === "enemy";

  return players.map((player) => {
    if (player.id !== result.aId && player.id !== result.bId) return player;
    const isA = player.id === result.aId;
    const won = isA ? aWon : bWon;
    const lost = isA ? bWon : aWon;
    const interest = interestGold(player.gold);
    const streakGold = streakBonus(player.streak, won);
    const payout = basePayout(
      won ? "ally" : draw ? "draw" : "enemy",
      rewardMultiplier,
    );
    const nextHealth = lost
      ? Math.max(0, player.health - result.damage)
      : player.health;
    return {
      ...player,
      gold: player.gold + payout + interest + streakGold,
      health: nextHealth,
      streak: won
        ? Math.max(1, player.streak + 1)
        : draw
          ? 0
          : Math.min(-1, player.streak - 1),
      wins: player.wins + (won ? 1 : 0),
      losses: player.losses + (lost ? 1 : 0),
      draws: player.draws + (draw ? 1 : 0),
      eliminated: nextHealth <= 0,
    };
  });
};

const assignPlacements = (players: PlayerState[]): PlayerState[] => {
  const eliminatedOrder = players
    .filter((player) => player.eliminated && player.placement == null)
    .sort((a, b) => b.health - a.health || b.wins - a.wins);
  let nextPlace = players.filter((player) => player.placement != null).length;
  // Lowest place numbers for first eliminated... we want placement 4 for first out in 4p
  const total = players.length;
  let assigned = [...players];
  eliminatedOrder.forEach((victim) => {
    const place = total - nextPlace;
    nextPlace += 1;
    assigned = assigned.map((player) =>
      player.id === victim.id ? { ...player, placement: place } : player,
    );
  });

  const survivors = assigned.filter((player) => !player.eliminated);
  if (survivors.length === 1) {
    assigned = assigned.map((player) =>
      player.id === survivors[0].id ? { ...player, placement: 1 } : player,
    );
  }
  return assigned;
};

const refreshShops = (match: MatchState, players: PlayerState[]): PlayerState[] => {
  const upcomingStage = match.stage === 5 ? 1 : match.stage + 1;
  const upcomingRound = match.stage === 5 ? match.round + 1 : match.round;
  return players.map((player, index) => {
    if (player.eliminated || player.locked) return player;
    if (isItemShopTurn(upcomingRound, upcomingStage)) {
      return {
        ...player,
        shopKind: "items",
        itemShop: rollItemShop(match.seed + upcomingRound * 97 + index * 13),
      };
    }
    return {
      ...player,
      shopKind: "heroes",
      shop: rollShop(player.level, match.seed + upcomingRound * 53 + index * 19),
    };
  });
};

/** Advance AI boards each prep so rivals grow with the campaign. */
export const growAiSeats = (match: MatchState): MatchState => {
  const players = match.players.map((player, index) => {
    if (player.kind !== "ai" || player.eliminated) return player;
    const seed = match.seed + match.round * 70 + match.stage * 9 + index * 33;
    const units = buildAiBoardInputs(player, match, seed);
    const board = Array.from({ length: 28 }, () => null as PlayerState["board"][number]);
    units.forEach((unit) => {
      board[unit.boardIndex] = {
        uid: unit.uid,
        heroId: unit.heroId,
        star: unit.star,
        items: unit.items ?? [null, null],
      };
    });
    return {
      ...player,
      board,
      level: Math.min(9, player.level + (match.stage === 1 ? 1 : 0)),
      gold: player.gold + 2,
    };
  });
  return { ...match, players };
};

export const beginCombatRound = (match: MatchState): MatchState => {
  const themes = BATTLEFIELD_THEMES.filter((item) => item.id !== match.theme);
  const themeRoll =
    (match.seed + match.round * 17 + match.stage * 5) % themes.length;
  const theme = themes[themeRoll]?.id ?? match.theme;
  const grown = growAiSeats({ ...match, theme });
  return {
    ...grown,
    theme,
    pairings: buildPairings(grown),
    phase: "combat",
    notice: `${match.round}-${match.stage} 교전 개시 · ${theme}`,
  };
};

export const settleMatchRound = (
  match: MatchState,
  humanWinner: CombatWinner,
): MatchState => {
  const rewardMultiplier = DIFFICULTIES[match.difficulty].rewardMultiplier;
  const theme = match.theme;
  let players = [...match.players];
  const results: FightResult[] = match.pairings.map((pairing, index) =>
    resolveFight({ ...match, players }, pairing, index, theme, humanWinner),
  );

  results.forEach((result) => {
    players = applyFightToPlayers(players, result, rewardMultiplier);
  });
  players = assignPlacements(players);

  const human = players.find((player) => player.id === match.humanId)!;
  const humanResult = results.find(
    (result) => result.aId === human.id || result.bId === human.id,
  );
  const humanWon =
    humanResult &&
    ((humanResult.aId === human.id && humanResult.winner === "ally") ||
      (humanResult.bId === human.id && humanResult.winner === "enemy"));
  const humanDraw = humanResult?.winner === "draw";

  let rankPoints = match.rankPoints;
  if (match.mode === "versus") {
    rankPoints = Math.max(
      0,
      rankPoints + (humanWon ? 26 : humanDraw ? 2 : -18),
    );
  }

  const survivors = players.filter((player) => !player.eliminated);
  const finished = human.eliminated || survivors.length <= 1;

  const nextRound = match.stage === 5 ? match.round + 1 : match.round;
  const nextStage = match.stage === 5 ? 1 : match.stage + 1;
  const advanced: MatchState = {
    ...match,
    players: finished ? players : refreshShops(match, players),
    lastResults: results,
    round: finished ? match.round : nextRound,
    stage: finished ? match.stage : nextStage,
    phase: finished ? "finished" : "prep",
    rankPoints,
    pairings: finished
      ? match.pairings
      : buildPairings({
          ...match,
          players,
          round: nextRound,
          stage: nextStage,
        }),
    notice: finished
      ? human.eliminated
        ? `패배 · ${human.placement ?? survivors.length + 1}위`
        : `승리 · 최종 ${human.placement ?? 1}위`
      : humanWon
        ? `승리 · 다음 ${nextRound}-${nextStage} 준비`
        : humanDraw
          ? `무승부 · 다음 ${nextRound}-${nextStage} 준비`
          : `패배 · 체력 ${human.health} · 다음 ${nextRound}-${nextStage}`,
  };
  return advanced;
};

export const practiceEnemyMeta = (
  match: Pick<MatchState, "difficulty">,
  seed: number,
) => ({
  enemyTactic: enemyTacticForSeed(seed),
  enemyFormation: enemyFormationForSeed(seed),
  enemyScale: DIFFICULTIES[match.difficulty].enemyScale,
  enemyLeaderStar: (match.difficulty === "legendary" ? 2 : 1) as 1 | 2,
});
