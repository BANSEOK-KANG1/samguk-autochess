"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BATTLEFIELD_BY_ID,
  BATTLEFIELD_THEMES,
  BOND_RULES,
  FACTION_COLOR,
  FACTION_EFFECTS,
  HEROES,
  HERO_BY_ID,
  ROLE_EFFECTS,
  SHOP_ODDS,
  rangeLabelFor,
  type BattlefieldTheme,
  type Faction,
  type Hero,
  type Role,
} from "./game-data";
import {
  advanceBattle,
  createBattleState,
  simulateBattleToEnd,
  type BattleState,
  type CombatWinner,
} from "./combat-engine";
import {
  DIFFICULTIES,
  GAME_MODES,
  ROLE_ARCHETYPES,
  TACTICS,
  enemyTacticForSeed,
  type AiRivalCount,
  type DifficultyId,
  type GameMode,
  type TacticId,
} from "./combat-config";
import {
  FORMATIONS,
  enemyFormationForSeed,
  formationActiveCount,
  formationTierForCount,
  type FormationId,
} from "./formation-config";
import { CombatStage } from "./combat-stage";
import {
  COMBAT_SKILL_HOLD_MS,
  COMBAT_TICK_MS,
  type CombatSpeed,
} from "./combat-timing";
import {
  playSfx,
  unlockSfx,
  isSfxMuted,
  toggleSfxMuted,
  subscribeSfxMute,
  setBgmDesired,
} from "./sound";
import { ModePanel } from "./mode-panel";
import { heroPortraitStyle } from "./hero-portrait";
import { heroCombatArtStyle } from "./hero-combat-art";
import { ArenaToken } from "./arena-board";
import { isArenaTheme, arenaTileFor, arenaDecorFor } from "./arena-maps";
import { heroAppearanceFor } from "./hero-appearance";
import { combatIdentityFor } from "./hero-combat-identity";
import { dutyProfileFor } from "./combat-duty";
import { traitsForHero } from "./hero-traits";
import {
  COMBAT_ALLY_FRONT_ROW,
  COMBAT_TERRAIN_META,
  combatTerrainCellAt,
} from "./combat-terrain";
import { assetCssUrl, assetUrl } from "./asset-url";
import {
  ITEM_BY_ID,
  ITEM_KIND_LABEL,
  ITEM_SLOT_LABEL,
  canEquipItem,
  emptyEquipment,
  formatItemStats,
  rollItemShop,
  tryCombineItems,
  type EquippedItems,
} from "./item-data";
import { ItemIcon } from "./item-icon";
import {
  BOARD_COLUMNS,
  BOARD_POSITIONS,
  BOARD_SIZE,
  beginCombatRound,
  boardToCombatInputs,
  buildAiBoardInputs,
  buildBanditInputs,
  clearMatchSave,
  createInitialBench,
  createInitialBoard,
  createMatchSnapshot,
  createMatchState,
  currentEncounterRule,
  hasMatchSave,
  humanPlayer,
  loadMatch,
  mergeRoster,
  LOOT_SHOP_FREE_REROLLS,
  REROLL_COST,
  opponentForHuman,
  practiceEnemyMeta,
  rollShop,
  saveMatch,
  settleFarmRound,
  settleMatchRound,
  snapshotFromPlayer,
  updateHuman,
  type MatchState,
  type Unit,
} from "./session";

const INTRO_SCENES = [
  {
    id: "guan-yu",
    src: "ultimate-scenes/guan-yu-ultimate-v22.webp",
    label: "관우",
  },
  {
    id: "cao-cao",
    src: "ultimate-scenes/cao-cao-ultimate-v22.webp",
    label: "조조",
  },
  {
    id: "zhou-yu",
    src: "ultimate-scenes/zhou-yu-ultimate-v22.webp",
    label: "주유",
  },
] as const;

type Zone = "board" | "bench";
type Selection = { zone: Zone; index: number } | null;
type ShopKind = "heroes" | "items";
type DragOverTarget =
  | { zone: Zone; index: number }
  | { zone: "sell" };
type PlacementVerdict = "valid" | "swap" | "blocked" | "full" | "self";

const turnIndexFor = (round: number, stage: number) =>
  (round - 1) * 5 + stage;
const isItemShopTurn = (round: number, stage: number) =>
  turnIndexFor(round, stage) % 3 === 0;
const RANKS = [
  { name: "최전열", mark: "1", hint: "수호·용장·기병" },
  { name: "전열", mark: "2", hint: "근접 장수" },
  { name: "후열", mark: "3", hint: "책사·궁수" },
  { name: "최후열", mark: "4", hint: "지원·원거리" },
] as const;

const prepTerrainFor = (theme: BattlefieldTheme, boardIndex: number) => {
  const depth = Math.floor(boardIndex / BOARD_COLUMNS);
  const lane = boardIndex % BOARD_COLUMNS;
  return combatTerrainCellAt(
    theme,
    COMBAT_ALLY_FRONT_ROW + depth,
    lane,
  );
};

/** 낭떠러지 등에 남아 있는 장수를 가장 가까운 길로 옮긴다 */
const snapBoardToPaths = (
  boardInput: (Unit | null)[],
  theme: BattlefieldTheme,
) => {
  const next = [...boardInput];
  const occupied = new Set(
    next.flatMap((piece, index) => (piece ? [index] : [])),
  );

  next.forEach((piece, index) => {
    if (!piece || prepTerrainFor(theme, index).walkable) return;
    occupied.delete(index);
    const destination = Array.from({ length: BOARD_SIZE }, (_, slot) => slot)
      .filter(
        (slot) =>
          !occupied.has(slot) && prepTerrainFor(theme, slot).walkable,
      )
      .sort((a, b) => {
        const rowA = Math.floor(a / BOARD_COLUMNS);
        const colA = a % BOARD_COLUMNS;
        const rowB = Math.floor(b / BOARD_COLUMNS);
        const colB = b % BOARD_COLUMNS;
        const row = Math.floor(index / BOARD_COLUMNS);
        const col = index % BOARD_COLUMNS;
        return (
          Math.max(Math.abs(rowA - row), Math.abs(colA - col)) -
            Math.max(Math.abs(rowB - row), Math.abs(colB - col)) ||
          a - b
        );
      })[0];
    next[index] = null;
    if (destination !== undefined) {
      next[destination] = piece;
      occupied.add(destination);
    }
  });

  return next;
};

const MODEL_ART: Record<
  string,
  { src: string; epithet: string; silhouette: string; material: string }
> = {
  "cao-cao": {
    src: "/character-design/cao-cao-3d.png",
    epithet: "패도를 설계하는 군주",
    silhouette: "넓은 견갑 · 낮은 왕관 · 한손 지휘검",
    material: "흑철·남색 칠갑·무광 금속",
  },
  "guan-yu": {
    src: "/character-design/guan-yu-3d.png",
    epithet: "전열을 가르는 청룡",
    silhouette: "긴 수염 · 세로형 갑주 · 대형 언월도",
    material: "녹색 비늘갑·황동·적색 안면",
  },
  "zhou-yu": {
    src: "/character-design/zhou-yu-3d.png",
    epithet: "화공을 지휘하는 미주랑",
    silhouette: "날렵한 로브 · 비대칭 망토 · 적염선",
    material: "진홍 비단·흑칠 갑편·금실",
  },
};

const makeUnit = (heroId: string, index: number): Unit => ({
  uid: `${heroId}-${index}-${Date.now()}`,
  heroId,
  star: 1,
  items: emptyEquipment(),
});

function Stars({ star }: { star: Unit["star"] }) {
  return (
    <span className="stars" aria-label={`${star}성`}>
      {"◆".repeat(star)}
    </span>
  );
}

function SynergyPips({
  count,
  tiers,
  color,
}: {
  count: number;
  tiers: number[];
  color: string;
}) {
  return (
    <span className="synergy-pips" aria-hidden="true">
      {Array.from({ length: Math.min(6, tiers.at(-1) ?? 2) }, (_, index) => (
        <i
          className={index < count ? "on" : ""}
          key={index}
          style={{ "--pip-color": color } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

function UnitPiece({
  piece,
  theme,
  selected,
  dragging = false,
  tokenized = false,
  onClick,
  onDragStart,
  onDragEnd,
  variant = "board",
}: {
  piece: Unit;
  theme: BattlefieldTheme;
  selected: boolean;
  dragging?: boolean;
  tokenized?: boolean;
  onClick: () => void;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  variant?: "board" | "bench";
}) {
  const hero = HERO_BY_ID[piece.heroId];
  const role = ROLE_ARCHETYPES[hero.role];
  const identity = combatIdentityFor(hero.id, hero.role);
  const appearance = heroAppearanceFor(hero.id, hero.role, hero.faction);
  const terrainReady = hero.affinity.includes(theme);
  const traits = traitsForHero(hero);

  if (tokenized && variant === "board") {
    return (
      <button
        className={`arena-token-piece unit-star-${piece.star} ${selected ? "selected" : ""} ${dragging ? "is-dragging" : ""} ${terrainReady ? "terrain-ready" : ""}`}
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={`${hero.name} · ${hero.skill} · ${identity.weaponName}`}
        aria-label={`${hero.name} ${piece.star}성 배치`}
      >
        <ArenaToken hero={hero} star={piece.star} variant="prep" />
        {(piece.items[0] || piece.items[1]) && (
          <span className="arena-token-items" aria-hidden="true">
            {piece.items.filter(Boolean).map((itemId) => (
              <i key={itemId}>{ITEM_BY_ID[itemId!]?.glyph ?? "템"}</i>
            ))}
          </span>
        )}
      </button>
    );
  }

  if (variant === "bench") {
    return (
      <button
        className={`unit-piece unit-card-compact unit-star-${piece.star} ${selected ? "selected" : ""} ${dragging ? "is-dragging" : ""}`}
        style={{ "--faction": FACTION_COLOR[hero.faction] } as React.CSSProperties}
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={`${hero.name} · ${hero.skill}`}
      >
        <span className="unit-portrait" style={heroPortraitStyle(hero)} />
        <span className={`unit-role-mark archetype-${role.id}`}>{role.glyph}</span>
        <span className="unit-faction">{hero.faction}</span>
        <span className="trait-icons trait-icons-compact">
          {traits.slice(0, 3).map((trait) => (
            <i
              key={trait.id}
              title={trait.tip}
              style={{ "--trait-tone": trait.tone } as React.CSSProperties}
            >
              {trait.glyph}
            </i>
          ))}
        </span>
        <Stars star={piece.star} />
        <span className="unit-meta">
          <strong>{hero.name}</strong>
          <small>{dutyProfileFor(hero).short} · {hero.role}</small>
        </span>
      </button>
    );
  }

  return (
    <button
      className={`board-figurine unit-star-${piece.star} role-${hero.role} weapon-${identity.weapon} ${selected ? "selected" : ""} ${dragging ? "is-dragging" : ""} ${terrainReady ? "terrain-ready" : ""}`}
      style={
        {
          "--faction": FACTION_COLOR[hero.faction],
          "--signature": identity.color,
          "--armor-main": appearance.armor,
          "--body-scale-x": appearance.bodyScaleX,
          "--body-scale-y": appearance.bodyScaleY,
        } as React.CSSProperties
      }
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${hero.name} · ${hero.skill} · ${identity.weaponName}`}
      aria-label={`${hero.name} ${piece.star}성 배치`}
    >
      <i className="figurine-ground" aria-hidden="true" />
      <i className="figurine-shadow" aria-hidden="true" />
      <span className="figurine-body" style={heroCombatArtStyle(hero)} aria-hidden="true" />
      <span className="figurine-rim" aria-hidden="true" />
      <span className={`figurine-role archetype-${role.id}`}>{role.glyph}</span>
      <span className="figurine-banner">{hero.faction}</span>
      <span className="trait-icons trait-icons-figurine">
        {traits.slice(0, 4).map((trait) => (
          <i
            key={trait.id}
            title={trait.tip}
            style={{ "--trait-tone": trait.tone } as React.CSSProperties}
          >
            {trait.glyph}
          </i>
        ))}
      </span>
      {terrainReady && (
        <span className="figurine-affinity">{theme}</span>
      )}
      <Stars star={piece.star} />
      {(piece.items[0] || piece.items[1]) && (
        <span className="figurine-items" aria-hidden="true">
          {piece.items.filter(Boolean).map((itemId) => (
            <i key={itemId}>{ITEM_BY_ID[itemId!]?.glyph ?? "템"}</i>
          ))}
        </span>
      )}
      <span className="figurine-name">
        <strong>{hero.name}</strong>
        <small>{dutyProfileFor(hero).short}</small>
      </span>
    </button>
  );
}

function PlacementGhost({
  piece,
  tokenized = false,
}: {
  piece: Unit;
  tokenized?: boolean;
}) {
  const hero = HERO_BY_ID[piece.heroId];
  if (tokenized) {
    return (
      <span className="placement-ghost is-token" aria-hidden="true">
        <span className="placement-ghost-pad" />
        <ArenaToken hero={hero} star={piece.star} variant="prep" />
      </span>
    );
  }
  return (
    <span className="placement-ghost" aria-hidden="true">
      <span className="placement-ghost-pad" />
      <span className="placement-ghost-body" style={heroCombatArtStyle(hero)} />
      <strong>{hero.name}</strong>
    </span>
  );
}

function ShopCard({
  heroId,
  onBuy,
}: {
  heroId: string | null;
  onBuy: () => void;
}) {
  if (!heroId) return <div className="shop-card sold">영입 완료</div>;
  const hero = HERO_BY_ID[heroId];
  const role = ROLE_ARCHETYPES[hero.role];
  return (
    <button
      className="shop-card"
      style={{ "--faction": FACTION_COLOR[hero.faction] } as React.CSSProperties}
      onClick={onBuy}
    >
      <span className="shop-portrait" style={heroPortraitStyle(hero)} />
      <span className="shop-gradient" />
      <span className={`shop-role-mark archetype-${role.id}`}>{role.glyph}</span>
      <span className="shop-faction">{hero.faction === "기타" ? "군" : hero.faction}</span>
      <span className="shop-info">
        <strong>{hero.name}</strong>
        <small>
          {hero.faction} · {role.label}
        </small>
        <em>{hero.bonds.slice(0, 2).join(" · ")}</em>
      </span>
      <span className="shop-cost">● {hero.cost}</span>
    </button>
  );
}

function ItemShopCard({
  itemId,
  onBuy,
}: {
  itemId: string | null;
  onBuy: () => void;
}) {
  if (!itemId) return <div className="shop-card sold item-card">구매 완료</div>;
  const item = ITEM_BY_ID[itemId];
  if (!item) return <div className="shop-card sold item-card">알 수 없음</div>;
  return (
    <button
      className={`shop-card item-card slot-${item.slot} kind-${item.kind} tier-${item.tier}`}
      style={{ "--item-accent": item.accent } as React.CSSProperties}
      onClick={onBuy}
    >
      <span className="item-art" aria-hidden="true">
        <ItemIcon kind={item.kind} slot={item.slot} accent={item.accent} size={48} />
        <i>{ITEM_KIND_LABEL[item.kind]}</i>
      </span>
      <span className="item-body">
        <strong>{item.name}</strong>
        <small>
          {ITEM_SLOT_LABEL[item.slot]} ·{" "}
          {item.tier === "component" ? "조합" : "완성"}
        </small>
        <em>{item.blurb}</em>
        <span className="item-stat-line">{formatItemStats(item)}</span>
      </span>
      <span className="shop-cost">● {item.cost}</span>
    </button>
  );
}

export default function Home() {
  const uid = useRef(1000);
  const resultTimer = useRef<number | null>(null);
  const heldSkillId = useRef<string | null>(null);
  const skillHoldUntil = useRef(0);
  const [match, setMatch] = useState<MatchState>(() =>
    createMatchState({ mode: "single", difficulty: "heroic", aiCount: 2 }),
  );
  const [aiCount, setAiCount] = useState<AiRivalCount>(2);
  const [board, setBoard] = useState<(Unit | null)[]>(() => createInitialBoard(1));
  const [bench, setBench] = useState<(Unit | null)[]>(() => createInitialBench(1));
  const [shop, setShop] = useState<(string | null)[]>(() => rollShop(1, 17));
  const [shopKind, setShopKind] = useState<ShopKind>("heroes");
  const [itemShop, setItemShop] = useState<(string | null)[]>(() =>
    rollItemShop(42),
  );
  const [itemBag, setItemBag] = useState<string[]>([]);
  const [freeRerolls, setFreeRerolls] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [dragOver, setDragOver] = useState<DragOverTarget | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [placeFlash, setPlaceFlash] = useState<number | null>(null);
  const [gold, setGold] = useState(10);
  const [health, setHealth] = useState(100);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [round, setRound] = useState(1);
  const [stage, setStage] = useState(1);
  const [streak, setStreak] = useState(0);
  const [locked, setLocked] = useState(false);
  const [theme, setTheme] = useState<BattlefieldTheme>("평지");
  const [mode, setMode] = useState<GameMode>("single");
  const [difficulty, setDifficulty] = useState<DifficultyId>("heroic");
  const [tactic, setTactic] = useState<TacticId>("fortress");
  const [formation, setFormation] = useState<FormationId>("anhaeng");
  const [rankPoints, setRankPoints] = useState(1240);
  const [modeOpen, setModeOpen] = useState(false);
  const [artLabOpen, setArtLabOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogFaction, setCatalogFaction] = useState<Faction | "전체">("전체");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(
    "난세 원정 · 맞수들과 겨뤄 최후까지 남으세요.",
  );
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [battleResult, setBattleResult] = useState<CombatWinner | null>(null);
  const [speed, setSpeed] = useState<CombatSpeed>(1);
  const [introOpen, setIntroOpen] = useState(true);
  const [introScene, setIntroScene] = useState(0);
  const [savedAvailable, setSavedAvailable] = useState(false);
  const [sfxMuted, setSfxMutedState] = useState(isSfxMuted);
  const currentTheme = BATTLEFIELD_BY_ID[theme];
  const currentFormation = FORMATIONS[formation];
  const boardCount = board.filter(Boolean).length;
  const formationCount = formationActiveCount(board, formation);
  const formationTier = formationTierForCount(formation, formationCount);
  const combat = Boolean(battle);
  const useArena = isArenaTheme(theme);
  const scout = opponentForHuman(match);
  const campaignMode = mode === "single" || mode === "versus";
  const encounter = currentEncounterRule(match);

  const applyHumanSnapshot = (next: MatchState) => {
    const human = humanPlayer(next);
    setBoard(human.board);
    setBench(human.bench);
    setShop(human.shop);
    setShopKind(human.shopKind);
    setItemShop(human.itemShop);
    setItemBag(human.itemBag);
    setFreeRerolls(human.freeRerolls);
    setGold(human.gold);
    setHealth(human.health);
    setLevel(human.level);
    setXp(human.xp);
    setStreak(human.streak);
    setLocked(human.locked);
    setTactic(human.tactic);
    setFormation(human.formation);
    setRound(next.round);
    setStage(next.stage);
    setTheme(next.theme);
    setMode(next.mode);
    setDifficulty(next.difficulty);
    setAiCount(next.aiCount);
    setRankPoints(next.rankPoints);
    setNotice(next.notice);
    setMatch(next);
  };

  const syncHumanIntoMatch = (base: MatchState = match): MatchState =>
    updateHuman(
      {
        ...base,
        mode,
        difficulty,
        aiCount,
        rankPoints,
      },
      {
        board,
        bench,
        shop,
        shopKind,
        itemShop,
        itemBag,
        freeRerolls,
        gold,
        health,
        level,
        xp,
        streak,
        locked,
        tactic,
        formation,
      },
    );

  const startNewMatch = (nextMode: GameMode, rivals: AiRivalCount = aiCount) => {
    void unlockSfx();
    playSfx("ui");
    clearMatchSave();
    const created = createMatchState({
      mode: nextMode,
      difficulty,
      aiCount: nextMode === "practice" ? 1 : rivals,
      tactic,
      formation,
      // 연습 전투는 Kenney 사막 타일맵 프로토타입에서 바로 시작한다.
      theme: nextMode === "practice" ? "사막" : "평지",
      seed: Date.now() % 1_000_000_000,
      rankPoints,
    });
    applyHumanSnapshot(created);
    setBattle(null);
    setBattleResult(null);
    setSelection(null);
    setIntroOpen(false);
    setSavedAvailable(false);
  };

  const continueMatch = () => {
    void unlockSfx();
    const saved = loadMatch();
    if (!saved) {
      setNotice("이어서 할 원정이 없습니다.");
      return;
    }
    playSfx("ui");
    applyHumanSnapshot(saved.match);
    setBattle(null);
    setBattleResult(null);
    setIntroOpen(false);
  };

  useEffect(() => {
    setSavedAvailable(hasMatchSave());
  }, []);

  useEffect(() => subscribeSfxMute(setSfxMutedState), []);

  useEffect(() => {
    if (!introOpen) return;
    const timer = window.setInterval(() => {
      setIntroScene((current) => (current + 1) % INTRO_SCENES.length);
    }, 7200);
    return () => window.clearInterval(timer);
  }, [introOpen]);

  useEffect(() => {
    setBgmDesired(introOpen);
    return () => setBgmDesired(false);
  }, [introOpen]);

  useEffect(() => {
    if (!selection) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelection(null);
        setDragOver(null);
        setIsDragging(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection]);

  useEffect(() => {
    if (placeFlash === null) return;
    const timer = window.setTimeout(() => setPlaceFlash(null), 420);
    return () => window.clearTimeout(timer);
  }, [placeFlash]);

  useEffect(() => {
    if (!combat) return;
    const timer = window.setInterval(() => {
      setBattle((current) => {
        if (!current || current.winner) return current;
        const latestSkill = [...current.events]
          .reverse()
          .find((battleEvent) => battleEvent.type === "skill");
        if (latestSkill) {
          const now = Date.now();
          if (heldSkillId.current !== latestSkill.id) {
            heldSkillId.current = latestSkill.id;
            skillHoldUntil.current = now + COMBAT_SKILL_HOLD_MS[speed];
            return current;
          }
          if (now < skillHoldUntil.current) return current;
        }
        return advanceBattle(current);
      });
    }, COMBAT_TICK_MS[speed]);
    return () => window.clearInterval(timer);
  }, [combat, speed]);

  useEffect(() => {
    if (combat) return;
    heldSkillId.current = null;
    skillHoldUntil.current = 0;
  }, [combat]);

  useEffect(() => {
    if (!battle?.winner || battleResult || resultTimer.current) return;
    const winner = battle.winner;
    resultTimer.current = window.setTimeout(() => {
      setBattleResult(winner);
      playSfx(winner === "ally" ? "win" : winner === "draw" ? "ui" : "lose");
      resultTimer.current = window.setTimeout(() => {
        if (campaignMode) {
          const synced = syncHumanIntoMatch();
          const settled =
            currentEncounterRule(synced).kind === "farm"
              ? settleFarmRound(synced, winner)
              : settleMatchRound(synced, winner);
          applyHumanSnapshot(settled);
          saveMatch(settled);
          setSavedAvailable(true);
          setBoard((current) => snapBoardToPaths(current, settled.theme));
        } else {
          const won = winner === "ally";
          const draw = winner === "draw";
          const interest = Math.min(5, Math.floor(gold / 10));
          const streakGold = won
            ? Math.min(3, Math.floor(Math.max(0, streak) / 2))
            : 0;
          const reward = DIFFICULTIES[difficulty].rewardMultiplier;
          setGold(
            (value) =>
              value +
              Math.round((won ? 6 : draw ? 4 : 3) * reward) +
              interest +
              streakGold,
          );
          setHealth((value) =>
            Math.max(0, value - (winner === "enemy" ? 8 : 0)),
          );
          setStreak((value) =>
            won
              ? Math.max(1, value + 1)
              : draw
                ? 0
                : Math.min(-1, value - 1),
          );
          setRound((value) => (stage === 5 ? value + 1 : value));
          setStage((value) => (value === 5 ? 1 : value + 1));
          if (!locked) {
            const upcomingStage = stage === 5 ? 1 : stage + 1;
            const upcomingRound = stage === 5 ? round + 1 : round;
            if (isItemShopTurn(upcomingRound, upcomingStage)) {
              setShopKind("items");
              setItemShop(rollItemShop(Date.now() + upcomingRound * 97));
              setFreeRerolls(LOOT_SHOP_FREE_REROLLS);
            } else {
              setShopKind("heroes");
              setShop(rollShop(level, Date.now() + upcomingRound));
              setFreeRerolls(0);
            }
          }
          setNotice(
            won
              ? `승리 · 연습 보상 반영`
              : draw
                ? `무승부 · 연습 계속`
                : `패배 · 체력 감소`,
          );
          setBoard((current) => snapBoardToPaths(current, theme));
        }
        setBattle(null);
        setBattleResult(null);
        setSpeed(1);
        resultTimer.current = null;
      }, 2100);
    }, 0);
  }, [battle, battleResult, campaignMode, difficulty, gold, level, locked, match, mode, round, stage, streak, theme, board, bench, shop, shopKind, itemShop, itemBag, freeRerolls, health, xp, tactic, formation, aiCount, rankPoints]);

  useEffect(
    () => () => {
      if (resultTimer.current) window.clearTimeout(resultTimer.current);
    },
    [],
  );

  const boardHeroes = useMemo(
    () => board.filter(Boolean).map((piece) => HERO_BY_ID[piece!.heroId]),
    [board],
  );

  const factionCounts = useMemo(() => {
    const counts = { 위: 0, 촉: 0, 오: 0, 기타: 0 } as Record<Faction, number>;
    boardHeroes.forEach((hero) => {
      counts[hero.faction] += 1;
    });
    return counts;
  }, [boardHeroes]);

  const roleCounts = useMemo(() => {
    const counts = {} as Partial<Record<Role, number>>;
    boardHeroes.forEach((hero) => {
      counts[hero.role] = (counts[hero.role] ?? 0) + 1;
    });
    return counts;
  }, [boardHeroes]);

  const bonds = useMemo(() => {
    const counts: Record<string, number> = {};
    boardHeroes.forEach((hero) =>
      hero.bonds.forEach((bond) => {
        counts[bond] = (counts[bond] ?? 0) + 1;
      }),
    );
    return Object.entries(counts)
      .filter(([bond, count]) => BOND_RULES[bond] && count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [boardHeroes]);

  const selectedPiece =
    selection &&
    (selection.zone === "board"
      ? board[selection.index]
      : bench[selection.index]);
  const selectedHero = selectedPiece
    ? HERO_BY_ID[selectedPiece.heroId]
    : undefined;
  const placingActive = Boolean(selection && selectedPiece);
  const sellValue =
    selectedHero && selectedPiece
      ? selectedHero.cost *
        (selectedPiece.star === 1 ? 1 : selectedPiece.star === 2 ? 3 : 9)
      : 0;

  const placementVerdict = (
    source: Exclude<Selection, null>,
    targetZone: Zone,
    targetIndex: number,
  ): PlacementVerdict => {
    if (source.zone === targetZone && source.index === targetIndex) return "self";
    if (targetZone === "board" && !prepTerrainFor(theme, targetIndex).walkable) {
      return "blocked";
    }
    const targetRoster = targetZone === "board" ? board : bench;
    const targetPiece = targetRoster[targetIndex];
    if (
      targetZone === "board" &&
      source.zone === "bench" &&
      !targetPiece &&
      boardCount >= level
    ) {
      return "full";
    }
    if (targetPiece) return "swap";
    return "valid";
  };

  const relocateUnit = (
    source: Exclude<Selection, null>,
    targetZone: Zone,
    targetIndex: number,
  ) => {
    const verdict = placementVerdict(source, targetZone, targetIndex);
    if (verdict === "self") {
      setSelection(null);
      setDragOver(null);
      setIsDragging(false);
      return;
    }
    if (verdict === "blocked") {
      const blocked = prepTerrainFor(theme, targetIndex);
      playSfx("ui");
      setNotice(
        `${COMBAT_TERRAIN_META[blocked.kind].label}에는 배치할 수 없습니다. 길로만 이동·배치하세요.`,
      );
      return;
    }
    if (verdict === "full") {
      playSfx("ui");
      setNotice(`출전 한도 ${level}명입니다. 레벨을 올리거나 장수를 교체하세요.`);
      return;
    }
    const nextBoard = [...board];
    const nextBench = [...bench];
    const sourceRoster = source.zone === "board" ? nextBoard : nextBench;
    const destinationRoster = targetZone === "board" ? nextBoard : nextBench;
    const sourcePiece = sourceRoster[source.index];
    sourceRoster[source.index] = destinationRoster[targetIndex];
    destinationRoster[targetIndex] = sourcePiece;
    setBoard(nextBoard);
    setBench(nextBench);
    setSelection(null);
    setDragOver(null);
    setIsDragging(false);
    if (sourcePiece) {
      playSfx(verdict === "swap" ? "equip" : "buy");
      if (targetZone === "board") setPlaceFlash(targetIndex);
      setNotice(
        verdict === "swap"
          ? `${HERO_BY_ID[sourcePiece.heroId].name}과 자리를 바꿨습니다.`
          : `${HERO_BY_ID[sourcePiece.heroId].name} 배치를 변경했습니다.`,
      );
    }
  };

  const moveUnit = (targetZone: Zone, targetIndex: number) => {
    const targetRoster = targetZone === "board" ? board : bench;
    const targetPiece = targetRoster[targetIndex];
    if (!selection) {
      if (targetPiece) {
        playSfx("ui");
        setSelection({ zone: targetZone, index: targetIndex });
      }
      return;
    }
    relocateUnit(selection, targetZone, targetIndex);
  };

  const dragStart = (
    event: React.DragEvent,
    zone: Zone,
    index: number,
  ) => {
    event.dataTransfer.setData("text/plain", `${zone}:${index}`);
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setDragImage(event.currentTarget, 36, 48);
    } catch {
      /* some browsers reject custom drag images */
    }
    setSelection({ zone, index });
    setIsDragging(true);
    playSfx("ui");
  };

  const dragEnd = () => {
    setIsDragging(false);
    setDragOver(null);
  };

  const dropUnit = (
    event: React.DragEvent,
    targetZone: Zone,
    targetIndex: number,
  ) => {
    event.preventDefault();
    const [zone, index] = event.dataTransfer.getData("text/plain").split(":");
    if ((zone === "board" || zone === "bench") && Number.isFinite(Number(index))) {
      relocateUnit({ zone, index: Number(index) }, targetZone, targetIndex);
    } else {
      setIsDragging(false);
      setDragOver(null);
    }
  };

  const sellSelected = () => {
    if (!selection || !selectedPiece || !selectedHero) return;
    const nextBoard = [...board];
    const nextBench = [...bench];
    (selection.zone === "board" ? nextBoard : nextBench)[selection.index] = null;
    const value = sellValue;
    const returned = selectedPiece.items.filter(Boolean) as string[];
    setBoard(nextBoard);
    setBench(nextBench);
    if (returned.length) setItemBag((bag) => [...bag, ...returned]);
    setGold((current) => current + value);
    setSelection(null);
    setDragOver(null);
    setIsDragging(false);
    playSfx("reroll");
    setNotice(`${selectedHero.name}을 보내고 금화 ${value}를 회수했습니다.`);
  };

  const placementCoach = placingActive && selectedHero
    ? isDragging
      ? `${selectedHero.name} 배치 중 · 빛나는 칸에 놓거나, 다른 장수 위로 올려 교체하세요`
      : `${selectedHero.name} 선택 · 빈 칸 클릭/드래그로 배치 · Esc로 취소`
    : `대기석에서 전장으로 올리세요 · 진법 칸이 더 밝게 빛납니다 · 출전 ${boardCount}/${level}`;

  const buyHero = (shopIndex: number) => {
    const heroId = shop[shopIndex];
    if (!heroId) return;
    const hero = HERO_BY_ID[heroId];
    if (gold < hero.cost) {
      setNotice(`${hero.name} 영입에 금화 ${hero.cost}가 필요합니다.`);
      return;
    }
    const emptyBench = bench.findIndex((piece) => !piece);
    if (emptyBench < 0) {
      setNotice("대기석이 가득 찼습니다. 장수를 배치하거나 판매하세요.");
      return;
    }
    const nextBench = [...bench];
    nextBench[emptyBench] = {
      uid: `buy-${uid.current++}`,
      heroId,
      star: 1,
      items: emptyEquipment(),
    };
    const merged = mergeRoster(board, nextBench);
    setBoard(merged.board);
    setBench(merged.bench);
    if (merged.returnedItems.length) {
      setItemBag((bag) => [...bag, ...merged.returnedItems]);
    }
    setGold((value) => value - hero.cost);
    setShop((current) =>
      current.map((item, index) => (index === shopIndex ? null : item)),
    );
    playSfx(merged.mergedName ? "merge" : "buy");
    setNotice(
      merged.mergedName
        ? `${merged.mergedName} 승급 완료!`
        : `${hero.name}을 대기석에 영입했습니다.`,
    );
  };

  const buyItem = (shopIndex: number) => {
    const itemId = itemShop[shopIndex];
    if (!itemId) return;
    const item = ITEM_BY_ID[itemId];
    if (!item) return;
    if (gold < item.cost) {
      setNotice(`${item.name} 구매에 금화 ${item.cost}가 필요합니다.`);
      return;
    }
    setGold((value) => value - item.cost);
    setItemBag((bag) => [...bag, itemId]);
    setItemShop((current) =>
      current.map((entry, index) => (index === shopIndex ? null : entry)),
    );
    playSfx("buy");
    setNotice(
      `${item.name}을 가방에 넣었습니다. 장수를 선택한 뒤 장착하세요.`,
    );
  };

  const equipFromBag = (bagIndex: number) => {
    if (!selection || !selectedPiece) {
      setNotice("먼저 장착할 장수를 선택하세요.");
      return;
    }
    const itemId = itemBag[bagIndex];
    if (!itemId) return;
    let slotIndex: 0 | 1;
    if (!selectedPiece.items[0]) slotIndex = 0;
    else if (!selectedPiece.items[1]) slotIndex = 1;
    else {
      setNotice("장수당 아이템은 최대 2개까지 착용할 수 있습니다.");
      return;
    }
    if (!canEquipItem(selectedPiece.items, itemId, slotIndex)) {
      setNotice("같은 종류(무기·방어구·탈것)는 중복 착용할 수 없습니다.");
      return;
    }
    const nextItems: EquippedItems = [selectedPiece.items[0], selectedPiece.items[1]];
    nextItems[slotIndex] = itemId;
    let noticeText = `${ITEM_BY_ID[itemId].name}을 장착했습니다.`;
    if (nextItems[0] && nextItems[1]) {
      const combined = tryCombineItems(nextItems[0], nextItems[1]);
      if (combined) {
        nextItems[0] = combined;
        nextItems[1] = null;
        noticeText = `${ITEM_BY_ID[combined]?.name ?? "완성 아이템"} 조합에 성공했습니다!`;
      }
    }
    const nextBoard = [...board];
    const nextBench = [...bench];
    const roster = selection.zone === "board" ? nextBoard : nextBench;
    roster[selection.index] = { ...selectedPiece, items: nextItems };
    setBoard(nextBoard);
    setBench(nextBench);
    setItemBag((bag) => bag.filter((_, index) => index !== bagIndex));
    playSfx(noticeText.includes("조합") ? "merge" : "equip");
    setNotice(noticeText);
  };

  const unequipItem = (slotIndex: 0 | 1) => {
    if (!selection || !selectedPiece) return;
    const itemId = selectedPiece.items[slotIndex];
    if (!itemId) return;
    const nextItems: EquippedItems = [...selectedPiece.items];
    nextItems[slotIndex] = null;
    const nextBoard = [...board];
    const nextBench = [...bench];
    const roster = selection.zone === "board" ? nextBoard : nextBench;
    roster[selection.index] = { ...selectedPiece, items: nextItems };
    setBoard(nextBoard);
    setBench(nextBench);
    setItemBag((bag) => [...bag, itemId]);
    setNotice(`${ITEM_BY_ID[itemId].name}을 가방으로 내렸습니다.`);
  };

  const reroll = () => {
    const isFree = freeRerolls > 0;
    if (!isFree && gold < REROLL_COST) {
      return setNotice(`새로고침에는 금화 ${REROLL_COST}가 필요합니다.`);
    }
    if (isFree) {
      setFreeRerolls((value) => value - 1);
    } else {
      setGold((value) => value - REROLL_COST);
    }
    const suffix = isFree ? " (무료)" : ` (금화 ${REROLL_COST})`;
    if (shopKind === "items") {
      setItemShop(rollItemShop(Date.now()));
      playSfx("reroll");
      setNotice(`전리품 후보를 새로 불러왔습니다.${suffix}`);
    } else {
      setShop(rollShop(level, Date.now()));
      playSfx("reroll");
      setNotice(`장수 영입 후보를 새로 불러왔습니다.${suffix}`);
    }
  };

  const buyXp = () => {
    if (gold < 4) return setNotice("경험치 구매에는 금화 4가 필요합니다.");
    if (level >= 9) return setNotice("최대 레벨입니다.");
    const target = level * 6;
    const nextXp = xp + 4;
    setGold((value) => value - 4);
    if (nextXp >= target) {
      setLevel((value) => value + 1);
      setXp(nextXp - target);
      setNotice(`레벨 ${level + 1} 달성 · 출전 한도가 늘었습니다.`);
    } else {
      setXp(nextXp);
      setNotice(`경험치 +4 · ${nextXp}/${target}`);
    }
  };

  const startBattle = () => {
    if (!boardCount) return setNotice("전장에 장수를 먼저 배치하세요.");
    if (campaignMode && match.phase === "finished") {
      setNotice("원정이 끝났습니다. 처음부터 다시 시작해 보세요.");
      setIntroOpen(true);
      return;
    }
    void unlockSfx();
    playSfx("battle");
    const allies = boardToCombatInputs(board);
    if (allies.length !== boardCount) {
      setNotice("배치 인원과 출전 명단이 일치하지 않습니다. 다시 배치해 주세요.");
      return;
    }

    if (campaignMode) {
      const synced = syncHumanIntoMatch();
      const combatMatch = beginCombatRound(synced);
      const combatEncounter = currentEncounterRule(combatMatch);
      const foe = opponentForHuman(combatMatch);
      if (combatEncounter.kind === "rival" && !foe) {
        const settled = settleMatchRound(combatMatch, "draw");
        applyHumanSnapshot(settled);
        saveMatch(settled);
        setSavedAvailable(true);
        setNotice(settled.notice || "부전승 · 라운드 보상 반영");
        return;
      }
      const seed =
        combatMatch.seed + combatMatch.round * 137 + combatMatch.stage * 31;
      const enemyUnits =
        combatEncounter.kind === "farm"
          ? buildBanditInputs(combatMatch, combatEncounter)
          : foe?.kind === "ai"
          ? buildAiBoardInputs(foe, combatMatch, seed + 11)
          : boardToCombatInputs(foe!.board);
      setMatch(combatMatch);
      setTheme(combatMatch.theme);
      setRound(combatMatch.round);
      setStage(combatMatch.stage);
      setBattleResult(null);
      setBattle(
        createBattleState({
          allies,
          enemies: enemyUnits,
          enemyCount: enemyUnits.length,
          level,
          theme: combatMatch.theme,
          seed,
          allyTactic: tactic,
          enemyTactic:
            combatEncounter.kind === "farm"
              ? "assault"
              : foe?.tactic ?? enemyTacticForSeed(seed),
          allyFormation: formation,
          enemyFormation:
            combatEncounter.kind === "farm"
              ? "bongsi"
              : foe?.formation ?? enemyFormationForSeed(seed),
          enemyScale: combatEncounter.enemyScale,
        }),
      );
      if (foe) {
        createMatchSnapshot(combatMatch, [
          snapshotFromPlayer(humanPlayer(combatMatch), allies),
          snapshotFromPlayer(foe, enemyUnits),
        ]);
      }
      setNotice(
        combatEncounter.kind === "farm"
          ? `${combatEncounter.label} · 산적 ${enemyUnits.length}명 · 금화 ${combatEncounter.goldReward}${combatEncounter.itemDrops ? ` · 전리품 ${combatEncounter.itemDrops}개` : ""}`
          : `${foe!.name}과 군웅 격돌 · 다른 대진은 자동으로 진행됩니다`,
      );
      return;
    }

    const candidates = BATTLEFIELD_THEMES.filter((item) => item.id !== theme);
    // 사막 프로토타입일 때는 전투도 같은 타일맵/토큰 스타일을 유지한다.
    const nextTheme = useArena
      ? theme
      : candidates[Math.floor(Math.random() * candidates.length)].id;
    const seed = Math.floor(Date.now() / 1000) + round * 137 + stage * 31;
    const meta = practiceEnemyMeta({ difficulty }, seed);
    setTheme(nextTheme);
    setBattleResult(null);
    setBattle(
      createBattleState({
        allies,
        enemyCount: Math.min(level, Math.max(4, boardCount)),
        level,
        theme: nextTheme,
        seed,
        allyTactic: tactic,
        enemyTactic: meta.enemyTactic,
        allyFormation: formation,
        enemyFormation: meta.enemyFormation,
        enemyScale: meta.enemyScale,
        enemyLeaderStar: meta.enemyLeaderStar,
      }),
    );
    setNotice(`연습 출전 ${allies.length}명 · 전투 시작`);
  };

  const filteredHeroes = HEROES.filter(
    (hero) =>
      (catalogFaction === "전체" || hero.faction === catalogFaction) &&
      `${hero.name}${hero.hanja}${hero.bonds.join("")}`.includes(search.trim()),
  );

  return (
    <main
      className={`game-root terrain-${currentTheme.slug}`}
      style={{
        "--terrain-image": assetCssUrl(currentTheme.asset),
        "--terrain-accent": currentTheme.accent,
      } as React.CSSProperties}
    >
      {introOpen && (
        <div
          className="intro-screen"
          role="dialog"
          aria-label="게임 시작"
          onPointerDown={() => {
            void unlockSfx();
          }}
        >
          <div className="intro-stage" aria-hidden="true">
            {INTRO_SCENES.map((scene, index) => (
              <div
                className={`intro-scene ${index === introScene ? "is-active" : ""}`}
                key={scene.id}
                style={{ backgroundImage: assetCssUrl(scene.src) }}
              />
            ))}
            <div className="intro-veil" />
            <div className="intro-embers" />
          </div>

          <div className="intro-shell">
            <header className="intro-brand">
              <strong className="intro-title">삼국지 오토체스</strong>
              <p>난세를 헤쳐, 최후까지 살아남으세요</p>
            </header>

            <div className={`intro-actions ${savedAvailable ? "has-continue" : ""}`}>
              {savedAvailable && (
                <button
                  className="intro-card intro-card--continue"
                  onClick={continueMatch}
                >
                  <small>저장된 원정</small>
                  <strong>이어하기</strong>
                  <span>떠난 막사에서 다시 출진합니다</span>
                </button>
              )}
              <button
                className="intro-card intro-card--primary"
                onClick={() => startNewMatch("single", aiCount)}
              >
                <small>본 게임 · {GAME_MODES.single.estimatedMinutes}</small>
                <strong>새 원정</strong>
                <span>{GAME_MODES.single.description}</span>
              </button>
              <button
                className="intro-card intro-card--secondary"
                onClick={() => startNewMatch("practice", 1)}
              >
                <small>가볍게 · {GAME_MODES.practice.estimatedMinutes}</small>
                <strong>연습 전투</strong>
                <span>{GAME_MODES.practice.description}</span>
              </button>
              <button
                className="intro-card intro-card--ghost"
                onClick={() => {
                  void unlockSfx();
                  playSfx("ui");
                  setModeOpen(true);
                }}
              >
                <small>사전 준비</small>
                <strong>출진 설정</strong>
                <span>난이도 · 맞수 수 · 진법 · 전술</span>
              </button>
            </div>

            <footer className="intro-foot">
              <button
                className="intro-mute"
                onClick={() => {
                  void unlockSfx();
                  toggleSfxMuted();
                }}
                aria-label={sfxMuted ? "소리 켜기" : "소리 끄기"}
              >
                {sfxMuted ? "음소거" : "브금·효과음"}
              </button>
              <span className="intro-version">PRE-ALPHA v0.2.3</span>
              <span className="intro-scene-label" aria-hidden="true">
                {INTRO_SCENES[introScene]?.label}
              </span>
            </footer>
          </div>
        </div>
      )}
      <div className="ink-map" aria-hidden="true" />
      <div className={`game-frame ${combat ? "game-frame--combat" : ""}`}>
        <header className="top-bar">
          <div className="brand">
            <span className="red-seal">삼국</span>
            <strong className="brand-title">삼국지 오토체스</strong>
            <span className="prototype-tag">프리알파 · 자동전투</span>
          </div>
          <div className="player-stats">
            <span><i className="heart">♥</i><small>체력</small><strong>{health}</strong></span>
            <span><i>●</i><small>금화</small><strong>{gold}</strong></span>
            <span><i>Lv</i><small>레벨</small><strong>{level}</strong></span>
            <span><i>연</i><small>연승</small><strong>{Math.max(0, streak)}</strong></span>
          </div>
          <nav className="top-actions">
            <button
              onClick={() => {
                void unlockSfx();
                toggleSfxMuted();
              }}
              aria-label={sfxMuted ? "효과음 켜기" : "효과음 끄기"}
              title={sfxMuted ? "효과음 켜기" : "효과음 끄기"}
            >
              {sfxMuted ? "음소거" : "소리"}
            </button>
            <button onClick={() => setArtLabOpen(true)}>3D 아트</button>
            <button onClick={() => setModeOpen(true)}>게임 설정</button>
            <button onClick={() => setCatalogOpen(true)}>장수록 <b>100</b></button>
          </nav>
        </header>

        <section className="battle-layout">
          <aside className="synergy-panel panel">
            <div className="panel-heading"><span>활성 시너지</span><small>{boardCount}/{level}</small></div>
            <div className="synergy-list">
              {(Object.keys(factionCounts) as Faction[]).map((faction) => {
                const count = factionCounts[faction];
                const rule = FACTION_EFFECTS[faction];
                return (
                  <div className={`synergy-row ${count >= 2 ? "active" : ""}`} key={faction}>
                    <span className="faction-badge" style={{ "--faction": FACTION_COLOR[faction] } as React.CSSProperties}>{faction}</span>
                    <span className="synergy-copy">
                      <strong>{faction} 진영 <em>{count}</em></strong>
                      <SynergyPips count={count} tiers={rule.tiers} color={FACTION_COLOR[faction]} />
                      <small>{rule.effects[Math.max(0, rule.tiers.findIndex((tier) => count < tier) - 1)] ?? rule.effects[0]}</small>
                    </span>
                  </div>
                );
              })}
              {bonds.map(([bond, count]) => (
                <div className="synergy-row active" key={bond}>
                  <span className="bond-badge">연</span>
                  <span className="synergy-copy">
                    <strong>{bond} <em>{count}</em></strong>
                    <SynergyPips count={count} tiers={BOND_RULES[bond].tiers} color="#c79c54" />
                    <small>{BOND_RULES[bond].effect}</small>
                  </span>
                </div>
              ))}
              {(Object.entries(roleCounts) as [Role, number][])
                .filter(([, count]) => count >= 2)
                .slice(0, 3)
                .map(([role, count]) => (
                  <div className="role-chip" key={role}>
                    <span>{ROLE_ARCHETYPES[role].glyph}</span>
                    <b>{role} {count}</b>
                    <small>{ROLE_EFFECTS[role].effect}</small>
                  </div>
                ))}
            </div>
            <div className="synergy-tip">
              <b>{currentFormation.label} · {formationTier}단계</b>
              빛나는 <b>{currentFormation.label}</b> 칸에 장수를 배치하면 역할별 진형 보너스가 적용됩니다.
            </div>
          </aside>

          <section className="battlefield panel">
            <div className="battlefield-top">
              <span className={`phase encounter-phase encounter-${encounter.kind}`}>
                {encounter.number}전 · {encounter.label}
              </span>
              <div className="terrain-title" style={{ "--terrain-accent": currentTheme.accent } as React.CSSProperties}>
                <span>{theme}</span>
                <h1>군웅의 전장<small>{theme} · {currentTheme.subtitle}</small></h1>
              </div>
              <span className="timer">배치 7×4 · 전투 7×8 · {boardCount}/{level}</span>
            </div>
            <div
              className={`board prep-stage terrain-${currentTheme.slug} ${useArena ? "arena-desert" : ""} ${placingActive ? "is-placing" : ""} ${isDragging ? "is-dragging" : ""}`}
              style={{
                "--terrain-image": assetCssUrl(currentTheme.asset),
                "--terrain-accent": currentTheme.accent,
                backgroundImage: useArena
                  ? undefined
                  : `linear-gradient(180deg, rgba(6, 9, 8, 0.18), rgba(4, 6, 5, 0.55)), ${assetCssUrl(currentTheme.asset)}`,
                backgroundSize: useArena ? undefined : "cover",
                backgroundPosition: useArena ? undefined : "center 48%",
                backgroundRepeat: useArena ? undefined : "no-repeat",
              } as React.CSSProperties}
            >
              {!useArena && <div className="board-terrain-layer" aria-hidden="true" />}
              {!useArena && (
                <div className="board-scenery" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
              )}
              {useArena && (
                <div className="arena-decor" aria-hidden="true">
                  {arenaDecorFor(theme).map((decor, i) => (
                    <img
                      key={i}
                      src={assetUrl(decor.src)}
                      alt=""
                      style={{
                        left: `${decor.x * 100}%`,
                        top: `${decor.y * 100}%`,
                        width: `${decor.size}px`,
                        transform: `translate(-50%, -50%) scaleX(${decor.flip ? -1 : 1})`,
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="placement-lane-wash" aria-hidden="true">
                <span>전열</span>
                <span>후열</span>
              </div>
              <div className="enemy-direction"><span>▲ 적 진영 (상단)</span><small>전투는 7×8 위아래 교전 · 배치칸은 아군 하단 7×4</small></div>
              <div className="placement-coach" role="status">
                <b>{placingActive ? "배치" : "준비"}</b>
                <span>{placementCoach}</span>
              </div>
              <button
                className="formation-command"
                style={{ "--formation": currentFormation.color } as React.CSSProperties}
                onClick={() => setModeOpen(true)}
              >
                <i>{currentFormation.label.slice(0, 1)}</i>
                <span><small>진법</small><strong>{currentFormation.label}</strong><em>{formationCount}명 · {formationTier}단계</em></span>
                <b>변경</b>
              </button>
              <div className="rank-labels">
                {RANKS.map((rank) => <span key={rank.name}><b>{rank.name}</b><small>{rank.hint}</small></span>)}
              </div>
              {board.map((piece, index) => {
                const row = Math.floor(index / BOARD_COLUMNS);
                const formationCell = currentFormation.cells.includes(index);
                const coreCell = currentFormation.coreCells.includes(index);
                const terrainCell = prepTerrainFor(theme, index);
                const verdict =
                  selection && selectedPiece
                    ? placementVerdict(selection, "board", index)
                    : null;
                const isHover =
                  dragOver?.zone === "board" && dragOver.index === index;
                const ghostVisible =
                  placingActive &&
                  selectedPiece &&
                  !piece &&
                  verdict === "valid" &&
                  isHover;
                return (
                  <div
                    className={[
                      "board-slot",
                      "terrain-pad",
                      `terrain-pad-${terrainCell.kind}`,
                      piece ? "occupied" : "",
                      formationCell ? "formation-cell" : "",
                      coreCell ? "formation-core-cell" : "",
                      terrainCell.walkable ? "is-walkable" : "is-blocked",
                      verdict ? `drop-${verdict}` : "",
                      isHover ? "is-drag-over" : "",
                      placeFlash === index ? "just-placed" : "",
                      row <= 1 ? "lane-front" : "lane-back",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-row={row}
                    data-column={index % BOARD_COLUMNS}
                    key={index}
                    style={formationCell ? { "--formation": currentFormation.color } as React.CSSProperties : undefined}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOver({ zone: "board", index });
                    }}
                    onPointerEnter={() => {
                      if (placingActive) setDragOver({ zone: "board", index });
                    }}
                    onPointerLeave={() => {
                      if (isDragging) return;
                      setDragOver((current) =>
                        current?.zone === "board" && current.index === index
                          ? null
                          : current,
                      );
                    }}
                    onDrop={(event) => dropUnit(event, "board", index)}
                    title={`${COMBAT_TERRAIN_META[terrainCell.kind].label} · ${COMBAT_TERRAIN_META[terrainCell.kind].shortRule}`}
                  >
                    {useArena && (
                      <img
                        className="arena-tile"
                        src={assetUrl(arenaTileFor(theme, terrainCell.kind))}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                      />
                    )}
                    <span className="slot-mark">{formationCell ? currentFormation.label.slice(0, 1) : RANKS[row].mark}</span>
                    {coreCell && <span className="formation-core-mark">핵</span>}
                    {terrainCell.kind !== "ground" && (
                      <span className="slot-terrain-badge">
                        <i>{COMBAT_TERRAIN_META[terrainCell.kind].hanja}</i>
                        <b>{COMBAT_TERRAIN_META[terrainCell.kind].label}</b>
                      </span>
                    )}
                    {verdict === "swap" && isHover && piece && (
                      <span className="swap-badge">교체</span>
                    )}
                    {ghostVisible && selectedPiece && (
                      <PlacementGhost piece={selectedPiece} tokenized={useArena} />
                    )}
                    {piece ? (
                      <UnitPiece
                        piece={piece}
                        theme={theme}
                        variant="board"
                        tokenized={useArena}
                        selected={selection?.zone === "board" && selection.index === index}
                        dragging={isDragging && selection?.zone === "board" && selection.index === index}
                        onClick={() => moveUnit("board", index)}
                        onDragStart={(event) => dragStart(event, "board", index)}
                        onDragEnd={dragEnd}
                      />
                    ) : (
                      <button
                        className={`empty-slot ${terrainCell.walkable ? "" : "empty-slot-blocked"} ${verdict === "valid" ? "is-droppable" : ""}`}
                        onClick={() => moveUnit("board", index)}
                        disabled={!terrainCell.walkable && !selection}
                      >
                        {terrainCell.walkable
                          ? formationCell
                            ? currentFormation.label.slice(0, 1)
                            : placingActive && verdict === "valid"
                              ? "↓"
                              : "+"
                          : COMBAT_TERRAIN_META[terrainCell.kind].label.slice(0, 1)}
                      </button>
                    )}
                  </div>
                );
              })}
              <div className="battle-wash" />
            </div>
            <div className={`bench-wrap ${placingActive ? "is-placing" : ""}`}>
              {(placingActive || isDragging) && selectedPiece && selectedHero && (
                <div
                  className={`placement-sell-tray ${dragOver?.zone === "sell" ? "is-hot" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOver({ zone: "sell" });
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    sellSelected();
                  }}
                >
                  <button type="button" onClick={sellSelected}>
                    <small>장수 보내기</small>
                    <strong>● {sellValue}</strong>
                    <span>여기로 드래그하거나 클릭</span>
                  </button>
                </div>
              )}
              <div className="bench-title">
                <span>대기석 · 카드</span>
                <small>
                  {placingActive
                    ? "선택한 장수를 전장 칸으로 끌어 올리세요"
                    : "상점에서 영입한 뒤 전장에 올려 배치"}
                </small>
              </div>
              <div className="bench">
                {bench.map((piece, index) => {
                  const verdict =
                    selection && selectedPiece
                      ? placementVerdict(selection, "bench", index)
                      : null;
                  const isHover =
                    dragOver?.zone === "bench" && dragOver.index === index;
                  return (
                    <div
                      className={[
                        "bench-slot",
                        piece ? "occupied" : "",
                        verdict ? `drop-${verdict}` : "",
                        isHover ? "is-drag-over" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={index}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDragOver({ zone: "bench", index });
                      }}
                      onDrop={(event) => dropUnit(event, "bench", index)}
                    >
                      {piece ? (
                        <UnitPiece
                          piece={piece}
                          theme={theme}
                          variant="bench"
                          selected={selection?.zone === "bench" && selection.index === index}
                          dragging={isDragging && selection?.zone === "bench" && selection.index === index}
                          onClick={() => moveUnit("bench", index)}
                          onDragStart={(event) => dragStart(event, "bench", index)}
                          onDragEnd={dragEnd}
                        />
                      ) : (
                        <button className="empty-slot" onClick={() => moveUnit("bench", index)}>
                          {index + 1}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="round-panel panel">
            <div className="panel-heading"><span>{selectedHero ? "장수 상세" : "전장 상황"}</span><small className="ready">{campaignMode ? `${match.players.length}인` : "연습"}</small></div>
            {campaignMode && (
              <div className="match-standings">
                <div className={`encounter-brief encounter-${encounter.kind}`}>
                  <b>{encounter.kind === "farm" ? "약탈전" : "군웅전"}</b>
                  <strong>{encounter.label}</strong>
                  <small>{encounter.subtitle}</small>
                  {encounter.kind === "farm" && (
                    <em>
                      보상 금화 {encounter.goldReward}
                      {encounter.itemDrops
                        ? ` · 전리품 ${encounter.itemDrops}개`
                        : " · 병력 훈련"}
                    </em>
                  )}
                </div>
                <span className="match-standings-title">대진 · 체력</span>
                {[...match.players]
                  .sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.health - a.health)
                  .map((player) => {
                    const isFoe = scout?.id === player.id;
                    const isSelf = player.id === match.humanId;
                    return (
                      <div
                        className={`match-standing ${isSelf ? "is-self" : ""} ${isFoe ? "is-foe" : ""} ${player.eliminated ? "is-out" : ""}`}
                        key={player.id}
                      >
                        <b>{player.name}</b>
                        <em>♥ {player.health}</em>
                        <small>
                          {player.eliminated
                            ? `${player.placement ?? "-"}위 탈락`
                            : `${player.wins}승 ${player.losses}패`}
                        </small>
                      </div>
                    );
                  })}
                {encounter.kind === "rival" && scout && (
                  <p className="match-scout">다음 상대 · {scout.name} · {FORMATIONS[scout.formation].label}</p>
                )}
              </div>
            )}
            {selectedHero && selectedPiece ? (
              <div className="selected-detail">
                <div className="detail-portrait" style={{ ...heroPortraitStyle(selectedHero), "--faction": FACTION_COLOR[selectedHero.faction] } as React.CSSProperties} />
                <div><small>{selectedHero.faction} · {selectedHero.role}</small><h2>{selectedHero.name}</h2><p>{dutyProfileFor(selectedHero).label} · {selectedHero.cost}코스트 · {rangeLabelFor(selectedHero.range)} {selectedHero.range}칸</p></div>
                <div className="detail-skill"><span>고유 스킬</span><strong>{selectedHero.skill}</strong><p>공격 {selectedHero.attack} · 방어 {selectedHero.defense} · 체력 {selectedHero.health} · 사거리 {selectedHero.range}</p><em className="duty-blurb">{dutyProfileFor(selectedHero).glyph} {dutyProfileFor(selectedHero).description}</em></div>
                <div className="trait-panel">
                  <span>특성</span>
                  <div className="trait-icons trait-icons-detail">
                    {traitsForHero(selectedHero).map((trait) => (
                      <i
                        key={trait.id}
                        title={trait.tip}
                        style={{ "--trait-tone": trait.tone } as React.CSSProperties}
                      >
                        <b>{trait.glyph}</b>
                        <small>{trait.label}</small>
                      </i>
                    ))}
                  </div>
                </div>
                <div className="detail-passive"><span>{selectedHero.passive.kind} 패시브</span><strong>{selectedHero.passive.name}</strong><p>{selectedHero.passive.description}</p></div>
                <div className="detail-items">
                  <span>장비 · 최대 2칸 · 무기/방어/탈것 중복 불가</span>
                  <div className="equip-slots">
                    {([0, 1] as const).map((slot) => {
                      const equippedId = selectedPiece.items[slot];
                      const equipped = equippedId ? ITEM_BY_ID[equippedId] : null;
                      return (
                        <button
                          className={`equip-slot ${equipped ? "filled" : ""}`}
                          key={slot}
                          style={
                            equipped
                              ? ({ "--item-accent": equipped.accent } as React.CSSProperties)
                              : undefined
                          }
                          onClick={() => unequipItem(slot)}
                          title={equipped ? equipped.description : "빈 슬롯"}
                        >
                          {equipped ? (
                            <>
                              <ItemIcon
                                kind={equipped.kind}
                                slot={equipped.slot}
                                accent={equipped.accent}
                                size={22}
                              />
                              <strong>{equipped.name}</strong>
                              <small>
                                {ITEM_KIND_LABEL[equipped.kind]} ·{" "}
                                {formatItemStats(equipped)}
                              </small>
                            </>
                          ) : (
                            <em>빈 슬롯 {slot + 1}</em>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {itemBag.length > 0 && (
                    <div className="item-bag">
                      <small>가방 · 클릭하여 장착</small>
                      <div className="item-bag-row">
                        {itemBag.map((itemId, index) => {
                          const item = ITEM_BY_ID[itemId];
                          return (
                            <button
                              className="bag-item"
                              key={`${itemId}-${index}`}
                              style={
                                item
                                  ? ({ "--item-accent": item.accent } as React.CSSProperties)
                                  : undefined
                              }
                              onClick={() => equipFromBag(index)}
                              title={item?.description}
                            >
                              {item && (
                                <ItemIcon
                                  kind={item.kind}
                                  slot={item.slot}
                                  accent={item.accent}
                                  size={18}
                                />
                              )}
                              <span>{item?.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {MODEL_ART[selectedHero.id] && (
                  <button className="model-preview-button" onClick={() => setArtLabOpen(true)}>
                    <span style={{ backgroundImage: `url('${MODEL_ART[selectedHero.id].src}')` }} />
                    <b>3D 모델 시안 보기</b>
                  </button>
                )}
                <div className="detail-bonds">
                  {selectedHero.bonds.map((bond) => <span key={bond}>{bond}</span>)}
                  {selectedHero.affinity.map((item) => <span key={item}>{item}</span>)}
                </div>
                <button className="sell-button" onClick={sellSelected}>장수 보내기 · ● {selectedHero.cost * (selectedPiece.star === 1 ? 1 : selectedPiece.star === 2 ? 3 : 9)}</button>
              </div>
            ) : (
              <div className="opponent-card">
                <div className="opponent-mode"><span>{GAME_MODES[mode].label}</span><b>{mode === "single" ? DIFFICULTIES[difficulty].label : `${rankPoints}점`}</b></div>
                <span className="banner-icon terrain-banner">{theme}</span>
                <b className="opponent-terrain">{theme} · {currentTheme.subtitle}</b>
                <strong>{mode === "single" ? "호로관 선봉대" : "군웅 경쟁 진형"}</strong>
                <p>예상 전력 {Math.round(820 * DIFFICULTIES[difficulty].enemyScale + round * 75)}</p>
                <button className="opponent-plan-button" onClick={() => setModeOpen(true)}>
                  <i style={{ "--tactic": TACTICS[tactic].color } as React.CSSProperties}>{TACTICS[tactic].label.slice(0, 2)}</i>
                  <span><small>전술</small><b>{TACTICS[tactic].label}</b></span><em>변경</em>
                </button>
                <ul className="terrain-rules">{currentTheme.ruleText.map((rule) => <li key={rule}>{rule}</li>)}</ul>
              </div>
            )}
            <div className="combat-records redesigned-readout">
              <div><span className="record-avatar">전</span><p><b>무작위 전장</b><small>평지·산지·바다·습지·정글·사막</small></p></div>
              <div><span className="record-avatar">역</span><p><b>역할 실루엣</b><small>탱커·딜러·힐러·책략가</small></p></div>
              <div><span className="record-avatar">동</span><p><b>전용 모션</b><small>무기별 공격·스킬·피격</small></p></div>
            </div>
          </aside>
        </section>

        <section className="shop-dock panel">
          <div className="economy-panel">
            <div className="level-copy"><span>레벨 {level}</span><small>{xp}/{level * 6}</small></div>
            <div className="xp-bar"><i style={{ width: `${Math.min(100, (xp / (level * 6)) * 100)}%` }} /></div>
            <div className="odds">{(SHOP_ODDS[level] ?? SHOP_ODDS[9]).map((odd, index) => <span className={`cost-${index + 1}`} key={index}>● {odd}%</span>)}</div>
            <div className="merge-rule"><b>◆ → ◆◆ → ◆◆◆</b><span>같은 성급 장수 3장 자동 승급</span></div>
            <div className="economy-actions">
              <button className={freeRerolls > 0 ? "is-free" : ""} onClick={reroll}><b>↻</b><span>새로고침<small>{freeRerolls > 0 ? `무료 ${freeRerolls}회` : `● ${REROLL_COST}`}</small></span></button>
              <button onClick={buyXp}><b>+</b><span>경험치<small>● 4</small></span></button>
              <button className={locked ? "locked" : ""} onClick={() => setLocked((value) => !value)}><b>{locked ? "◆" : "◇"}</b><span>상점 잠금<small>{locked ? "유지 중" : "해제"}</small></span></button>
            </div>
          </div>
          <div className="shop-area">
            <div className="shop-title">
              <span>
                {shopKind === "items"
                  ? "전리품 상점 · 첫 새로고침 무료"
                  : "장수 영입 · 카드"}
              </span>
              <small>{notice}</small>
            </div>
            <div className="shop-row">
              {shopKind === "items"
                ? itemShop.map((itemId, index) => (
                    <ItemShopCard
                      itemId={itemId}
                      onBuy={() => buyItem(index)}
                      key={`item-${index}`}
                    />
                  ))
                : shop.map((heroId, index) => (
                    <ShopCard
                      heroId={heroId}
                      onBuy={() => buyHero(index)}
                      key={index}
                    />
                  ))}
            </div>
            {itemBag.length > 0 && shopKind === "heroes" && (
              <div className="dock-item-bag">
                <small>보유 아이템 {itemBag.length}</small>
                {itemBag.slice(0, 8).map((itemId, index) => (
                  <button
                    className="bag-item"
                    key={`dock-${itemId}-${index}`}
                    style={
                      ITEM_BY_ID[itemId]
                        ? ({ "--item-accent": ITEM_BY_ID[itemId].accent } as React.CSSProperties)
                        : undefined
                    }
                    onClick={() => equipFromBag(index)}
                    title={ITEM_BY_ID[itemId]?.name}
                  >
                    {ITEM_BY_ID[itemId] ? (
                      <ItemIcon
                        kind={ITEM_BY_ID[itemId].kind}
                        slot={ITEM_BY_ID[itemId].slot}
                        accent={ITEM_BY_ID[itemId].accent}
                        size={18}
                      />
                    ) : (
                      "템"
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="battle-action">
            <span>
              {encounter.number}전 · {encounter.label}<br />
              {campaignMode
                ? encounter.kind === "farm"
                  ? `약탈전 · 목표 레벨 ${encounter.targetLevel} · 금화 ${encounter.goldReward}`
                  : `군웅전 · 맞수 ${aiCount} · 보상 ×${DIFFICULTIES[difficulty].rewardMultiplier}`
                : "연습 전투 · 저장 없음"}
            </span>
            <button onClick={startBattle} disabled={combat || (campaignMode && match.phase === "finished")}><small>자동 전투</small>전투 시작</button>
            <p>이자 +{Math.min(5, Math.floor(gold / 10))} · 연승 보너스 +{Math.min(3, Math.floor(Math.max(0, streak) / 2))}</p>
          </div>
        </section>
      </div>

      {battle && (
        <CombatStage
          state={battle}
          theme={battle.theme}
          opponent={
            encounter.kind === "farm"
              ? "산적·황건 무리"
              : scout?.name ?? (mode === "practice" ? "연습 상대" : "맞수")
          }
          battleLabel={`${encounter.number}전 · ${encounter.label}`}
          speed={speed}
          result={battleResult}
          onToggleSpeed={() => setSpeed((value) => value === 1 ? 2 : 1)}
          onSkip={() => setBattle((current) => current ? simulateBattleToEnd(current) : current)}
        />
      )}

      {modeOpen && (
        <ModePanel
          mode={mode}
          difficulty={difficulty}
          aiCount={aiCount}
          tactic={tactic}
          formation={formation}
          rankPoints={rankPoints}
          onModeChange={setMode}
          onDifficultyChange={setDifficulty}
          onAiCountChange={setAiCount}
          onTacticChange={setTactic}
          onFormationChange={setFormation}
          onClose={() => setModeOpen(false)}
        />
      )}

      {artLabOpen && (
        <div className="art-lab-overlay" role="dialog" aria-modal="true" aria-label="3D 캐릭터 아트 디렉션">
          <section className="art-lab">
            <header>
              <div><small>CHARACTER ART & MODELING HUB</small><h2>출시형 3D 캐릭터 디자인</h2><p>작은 전장에서도 장수·역할·무기가 한눈에 읽히는 5.5~6등신 스타일라이즈드 PBR 기준입니다.</p></div>
              <button onClick={() => setArtLabOpen(false)}>×</button>
            </header>
            <div className="art-lab-grid">
              {Object.entries(MODEL_ART).map(([heroId, design]) => {
                const hero = HERO_BY_ID[heroId];
                return (
                  <article className={`model-card faction-${hero.faction}`} key={heroId}>
                    <div className="model-render" style={{ backgroundImage: `url('${design.src}')` }} />
                    <div className="model-copy">
                      <span>{hero.faction} · {ROLE_ARCHETYPES[hero.role].label} · {hero.cost}코스트</span>
                      <h3>{hero.name}</h3>
                      <strong>{design.epithet}</strong>
                      <dl><div><dt>실루엣</dt><dd>{design.silhouette}</dd></div><div><dt>재질</dt><dd>{design.material}</dd></div><div><dt>모션 키</dt><dd>{hero.skill} · {hero.role} 전용 리그</dd></div></dl>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="model-pipeline">
              <div><b>형태 언어</b><span>탱커는 수평·중량, 딜러는 대각선·무기, 힐러는 원형·소매, 책략가는 세로·천 재질</span></div>
              <div><b>모델 예산</b><span>LOD0 45–65K tris · LOD1 22K · LOD2 8K · 주요 장수 2K PBR</span></div>
              <div><b>공용 리그</b><span>70본 내외 · 무기/등/손 VFX 소켓 · 이동은 인플레이스, 스킬만 제한적 루트 모션</span></div>
              <div><b>필수 모션</b><span>대기·이동·기본 공격 2종·스킬·피격·사망·승리 · 역할별 타이밍 차별화</span></div>
            </div>
          </section>
        </div>
      )}

      {catalogOpen && (
        <div className="catalog-overlay" role="dialog" aria-modal="true">
          <section className="catalog">
            <header className="catalog-head"><div><span>장수 100</span><h2>삼국 장수록</h2><p>100명의 장수는 얼굴·두식·무기·갑주·색 배합이 겹치지 않도록 분리합니다.</p></div><button onClick={() => setCatalogOpen(false)}>×</button></header>
            <div className="catalog-tools">
              <div className="faction-tabs">{(["전체", "위", "촉", "오", "기타"] as const).map((item) => <button className={catalogFaction === item ? "active" : ""} onClick={() => setCatalogFaction(item)} key={item}>{item}</button>)}</div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="장수·인연 검색" />
              <span>{filteredHeroes.length}명</span>
            </div>
            <div className="catalog-grid">
              {filteredHeroes.map((hero: Hero) => (
                <article className="catalog-card" style={{ "--faction": FACTION_COLOR[hero.faction] } as React.CSSProperties} key={hero.id}>
                  <div className="catalog-portrait" style={heroPortraitStyle(hero)} />
                  <div className="catalog-card-top"><span>{hero.faction}</span><b>{hero.cost} COST</b></div>
                  <div className="catalog-card-copy"><h3>{hero.name}</h3><small>{hero.faction} · {hero.role}</small><strong>{hero.skill}</strong><p>{hero.bonds.join(" · ")}</p></div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
