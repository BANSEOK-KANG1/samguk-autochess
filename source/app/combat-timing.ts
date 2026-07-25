/** Combat playback pacing. Tick rates are ~1.7× / ~2.8× the original 780ms baseline. */
export type CombatSpeed = 1 | 2;

export const COMBAT_TICK_MS: Record<CombatSpeed, number> = {
  1: 450,
  2: 280,
};

/** Skill freeze / signature overlay — keep near the original default so ultimates still land. */
export const COMBAT_SKILL_HOLD_MS: Record<CombatSpeed, number> = {
  1: 1480,
  2: 900,
};

export const COMBAT_CINEMATIC_MS: Record<CombatSpeed, number> = {
  1: 1220,
  2: 720,
};

export const COMBAT_SPEED_LABEL: Record<CombatSpeed, string> = {
  1: "1.5",
  2: "2.5",
};
