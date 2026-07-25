import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBattleState,
  simulateBattleToEnd,
} from "../app/combat-engine.ts";
import {
  beginCombatRound,
  boardToCombatInputs,
  buildAiBoardInputs,
  buildPairings,
  createMatchSnapshot,
  createMatchState,
  humanPlayer,
  mergeRoster,
  opponentForHuman,
  packGhostCode,
  parseMatchSnapshot,
  settleMatchRound,
  snapshotFingerprint,
  snapshotFromPlayer,
  unpackGhostCode,
  validateMatchSnapshot,
} from "../app/session/index.ts";

describe("session match foundation", () => {
  it("creates 2~4 seat matches with human + AI", () => {
    const match = createMatchState({ aiCount: 3, seed: 42 });
    assert.equal(match.players.length, 4);
    assert.equal(match.players.filter((p) => p.kind === "ai").length, 3);
    assert.ok(humanPlayer(match).board.some(Boolean));
    assert.ok(buildPairings(match).length >= 2);
  });

  it("merges three copies into a higher star", () => {
    const board = Array.from({ length: 28 }, () => null);
    const bench = [
      { uid: "a", heroId: "cao-cao", star: 1 as const, items: [null, null] as [null, null] },
      { uid: "b", heroId: "cao-cao", star: 1 as const, items: [null, null] as [null, null] },
      { uid: "c", heroId: "cao-cao", star: 1 as const, items: [null, null] as [null, null] },
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    const merged = mergeRoster(board, bench);
    assert.equal(merged.mergedName, "조조 2성");
    assert.equal(merged.bench.filter(Boolean).length, 1);
    assert.equal(merged.bench.find(Boolean)?.star, 2);
  });

  it("settles a campaign round with deterministic AI boards", () => {
    let match = createMatchState({
      mode: "single",
      difficulty: "normal",
      aiCount: 1,
      seed: 777,
    });
    match = beginCombatRound(match);
    const foe = opponentForHuman(match);
    assert.ok(foe, "2-seat match should always pair human vs AI");
    const human = humanPlayer(match);
    const allies = boardToCombatInputs(human.board);
    const enemies = buildAiBoardInputs(foe!, match, match.seed + 11);
    const battle = createBattleState({
      allies,
      enemies,
      enemyCount: enemies.length,
      level: human.level,
      theme: match.theme,
      seed: match.seed,
      allyTactic: human.tactic,
      enemyTactic: foe!.tactic,
      allyFormation: human.formation,
      enemyFormation: foe!.formation,
    });
    const finished = simulateBattleToEnd(battle);
    assert.ok(finished.winner);
    const settled = settleMatchRound(match, finished.winner!);
    assert.ok(["prep", "finished"].includes(settled.phase));
    assert.ok(settled.lastResults.length >= 1);
  });
});

describe("async ghost snapshot", () => {
  it("validates and fingerprints deterministic snapshots", () => {
    const match = createMatchState({ aiCount: 1, seed: 99 });
    const human = humanPlayer(match);
    const snap = createMatchSnapshot(match, [
      snapshotFromPlayer(human),
      snapshotFromPlayer(match.players[1], buildAiBoardInputs(match.players[1], match, 123)),
    ]);
    assert.equal(validateMatchSnapshot(snap).ok, true);
    const fp1 = snapshotFingerprint(snap);
    const fp2 = snapshotFingerprint(snap);
    assert.equal(fp1, fp2);
    const packed = packGhostCode(snap);
    const unpacked = unpackGhostCode(packed);
    assert.equal(unpacked.ok, true);
    if (unpacked.ok) {
      assert.equal(snapshotFingerprint(unpacked.payload.snapshot), fp1);
    }
    const parsed = parseMatchSnapshot(JSON.stringify(snap));
    assert.equal(parsed.ok, true);
  });

  it("rejects tampered ghost fingerprints", () => {
    const match = createMatchState({ aiCount: 1, seed: 12 });
    const snap = createMatchSnapshot(match, [snapshotFromPlayer(humanPlayer(match))]);
    const packed = packGhostCode(snap);
    const broken = packed.slice(0, -2) + "aa";
    const unpacked = unpackGhostCode(broken);
    assert.equal(unpacked.ok, false);
  });
});
