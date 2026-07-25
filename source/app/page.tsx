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
  STARTING_BENCH,
  STARTING_BOARD,
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
import { ModePanel } from "./mode-panel";
import { heroPortraitStyle } from "./hero-portrait";
import { heroCombatArtStyle } from "./hero-combat-art";
import { heroAppearanceFor } from "./hero-appearance";
import { combatIdentityFor } from "./hero-combat-identity";
import { dutyProfileFor } from "./combat-duty";
import { traitsForHero } from "./hero-traits";
import {
  COMBAT_ALLY_FRONT_ROW,
  COMBAT_TERRAIN_META,
  combatTerrainCellAt,
} from "./combat-terrain";
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

type Unit = {
  uid: string;
  heroId: string;
  star: 1 | 2 | 3;
  items: EquippedItems;
};

type Zone = "board" | "bench";
type Selection = { zone: Zone; index: number } | null;
type ShopKind = "heroes" | "items";

const BOARD_COLUMNS = 7;
const BOARD_SIZE = 28;
const BOARD_POSITIONS = [10, 2, 3, 11, 4, 24];
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

const createInitialBoard = () => {
  const board: (Unit | null)[] = Array.from({ length: BOARD_SIZE }, () => null);
  STARTING_BOARD.forEach((heroId, index) => {
    board[BOARD_POSITIONS[index]] = makeUnit(heroId, index);
  });
  return board;
};

const createInitialBench = () =>
  Array.from({ length: 9 }, (_, index) =>
    STARTING_BENCH[index] ? makeUnit(STARTING_BENCH[index], index + 20) : null,
  );

const rollCost = (level: number) => {
  const odds = SHOP_ODDS[level] ?? SHOP_ODDS[9];
  const roll = Math.random() * 100;
  let cursor = 0;
  for (let index = 0; index < odds.length; index += 1) {
    cursor += odds[index];
    if (roll <= cursor) return index + 1;
  }
  return 1;
};

const rollShop = (level: number) =>
  Array.from({ length: 5 }, () => {
    const cost = rollCost(level);
    const candidates = HEROES.filter((hero) => hero.cost === cost);
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  });

const mergeRoster = (
  boardInput: (Unit | null)[],
  benchInput: (Unit | null)[],
) => {
  const board = [...boardInput];
  const bench = [...benchInput];
  let mergedName = "";
  let keepMerging = true;
  const returnedItems: string[] = [];

  while (keepMerging) {
    keepMerging = false;
    for (const hero of HEROES) {
      for (const star of [1, 2] as const) {
        const matches: { zone: Zone; index: number }[] = [];
        board.forEach((piece, index) => {
          if (piece?.heroId === hero.id && piece.star === star) {
            matches.push({ zone: "board", index });
          }
        });
        bench.forEach((piece, index) => {
          if (piece?.heroId === hero.id && piece.star === star) {
            matches.push({ zone: "bench", index });
          }
        });
        if (matches.length < 3) continue;

        const [keeper, ...consumed] = matches.slice(0, 3);
        const roster = keeper.zone === "board" ? board : bench;
        const piece = roster[keeper.index];
        if (!piece) continue;
        roster[keeper.index] = {
          ...piece,
          star: (star + 1) as 2 | 3,
          items: piece.items,
        };
        consumed.forEach((match) => {
          const victim = (match.zone === "board" ? board : bench)[match.index];
          if (victim) {
            victim.items.forEach((itemId) => {
              if (itemId) returnedItems.push(itemId);
            });
          }
          (match.zone === "board" ? board : bench)[match.index] = null;
        });
        mergedName = `${hero.name} ${star + 1}성`;
        keepMerging = true;
      }
    }
  }
  return { board, bench, mergedName, returnedItems };
};

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
  onClick,
  onDragStart,
  variant = "board",
}: {
  piece: Unit;
  theme: BattlefieldTheme;
  selected: boolean;
  onClick: () => void;
  onDragStart: (event: React.DragEvent) => void;
  variant?: "board" | "bench";
}) {
  const hero = HERO_BY_ID[piece.heroId];
  const role = ROLE_ARCHETYPES[hero.role];
  const identity = combatIdentityFor(hero.id, hero.role);
  const appearance = heroAppearanceFor(hero.id, hero.role, hero.faction);
  const terrainReady = hero.affinity.includes(theme);
  const traits = traitsForHero(hero);

  if (variant === "bench") {
    return (
      <button
        className={`unit-piece unit-card-compact unit-star-${piece.star} ${selected ? "selected" : ""}`}
        style={{ "--faction": FACTION_COLOR[hero.faction] } as React.CSSProperties}
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
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
      className={`board-figurine unit-star-${piece.star} role-${hero.role} weapon-${identity.weapon} ${selected ? "selected" : ""} ${terrainReady ? "terrain-ready" : ""}`}
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
      <span className="item-glyph-plate" aria-hidden="true">
        <b>{item.glyph}</b>
        <i>{ITEM_KIND_LABEL[item.kind]}</i>
      </span>
      <span className="shop-info">
        <strong>{item.name}</strong>
        <small>
          {ITEM_SLOT_LABEL[item.slot]} · {ITEM_KIND_LABEL[item.kind]} ·{" "}
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
  const [board, setBoard] = useState<(Unit | null)[]>(createInitialBoard);
  const [bench, setBench] = useState<(Unit | null)[]>(createInitialBench);
  const [shop, setShop] = useState<(string | null)[]>([
    "gan-ning",
    "gan-ning",
    "gan-ning",
    "lu-bu",
    "zhuge-liang",
  ]);
  const [shopKind, setShopKind] = useState<ShopKind>("heroes");
  const [itemShop, setItemShop] = useState<(string | null)[]>(() =>
    rollItemShop(42),
  );
  const [itemBag, setItemBag] = useState<string[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [gold, setGold] = useState(27);
  const [health, setHealth] = useState(82);
  const [level, setLevel] = useState(6);
  const [xp, setXp] = useState(18);
  const [round, setRound] = useState(3);
  const [stage, setStage] = useState(2);
  const [streak, setStreak] = useState(2);
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
    "장수를 카드로 영입한 뒤, 전장에 2.5D로 배치하세요.",
  );
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [battleResult, setBattleResult] = useState<CombatWinner | null>(null);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [introOpen, setIntroOpen] = useState(true);
  const currentTheme = BATTLEFIELD_BY_ID[theme];
  const currentFormation = FORMATIONS[formation];
  const boardCount = board.filter(Boolean).length;
  const formationCount = formationActiveCount(board, formation);
  const formationTier = formationTierForCount(formation, formationCount);
  const combat = Boolean(battle);

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
            skillHoldUntil.current = now + (speed === 1 ? 1480 : 820);
            return current;
          }
          if (now < skillHoldUntil.current) return current;
        }
        return advanceBattle(current);
      });
    }, speed === 1 ? 780 : 420);
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
      resultTimer.current = window.setTimeout(() => {
        const won = winner === "ally";
        const draw = winner === "draw";
        const interest = Math.min(5, Math.floor(gold / 10));
        const streakGold = won
          ? Math.min(3, Math.floor(Math.max(0, streak) / 2))
          : 0;
        setGold(
          (value) =>
            value + (won ? 6 : draw ? 4 : 3) + interest + streakGold,
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
        setRankPoints((value) =>
          mode === "versus"
            ? Math.max(0, value + (won ? 26 : draw ? 2 : -18))
            : value,
        );
        setRound((value) => (stage === 5 ? value + 1 : value));
        setStage((value) => (value === 5 ? 1 : value + 1));
        if (!locked) {
          const upcomingStage = stage === 5 ? 1 : stage + 1;
          const upcomingRound = stage === 5 ? round + 1 : round;
          if (isItemShopTurn(upcomingRound, upcomingStage)) {
            setShopKind("items");
            setItemShop(rollItemShop(Date.now() + upcomingRound * 97));
          } else {
            setShopKind("heroes");
            setShop(rollShop(level));
          }
        }
        setNotice(
          won
            ? `승리 · 기본 6 + 이자 ${interest} + 연승 ${streakGold} 획득`
            : draw
              ? `무승부 · 금화 ${4 + interest} 획득`
              : `패배 · 체력 8 감소, 금화 ${3 + interest} 획득`,
        );
        setBattle(null);
        setBattleResult(null);
        setSpeed(1);
        setBoard((current) => snapBoardToPaths(current, theme));
        resultTimer.current = null;
      }, 2100);
    }, 0);
  }, [battle, battleResult, gold, level, locked, mode, stage, streak, theme]);

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

  const relocateUnit = (
    source: Exclude<Selection, null>,
    targetZone: Zone,
    targetIndex: number,
  ) => {
    const targetRoster = targetZone === "board" ? board : bench;
    const targetPiece = targetRoster[targetIndex];
    if (source.zone === targetZone && source.index === targetIndex) {
      setSelection(null);
      return;
    }
    if (
      targetZone === "board" &&
      !prepTerrainFor(theme, targetIndex).walkable
    ) {
      const blocked = prepTerrainFor(theme, targetIndex);
      setNotice(
        `${COMBAT_TERRAIN_META[blocked.kind].label}에는 배치할 수 없습니다. 길로만 이동·배치하세요.`,
      );
      return;
    }
    if (
      targetZone === "board" &&
      source.zone === "bench" &&
      !targetPiece &&
      boardCount >= level
    ) {
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
    if (sourcePiece) {
      setNotice(`${HERO_BY_ID[sourcePiece.heroId].name} 배치를 변경했습니다.`);
    }
  };

  const moveUnit = (targetZone: Zone, targetIndex: number) => {
    const targetRoster = targetZone === "board" ? board : bench;
    const targetPiece = targetRoster[targetIndex];
    if (!selection) {
      if (targetPiece) setSelection({ zone: targetZone, index: targetIndex });
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
    setSelection({ zone, index });
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
    }
  };

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
    if (gold < 2) return setNotice("새로고침에는 금화 2가 필요합니다.");
    setGold((value) => value - 2);
    if (shopKind === "items") {
      setItemShop(rollItemShop(Date.now()));
      setNotice("아이템 상점 후보를 새로 불러왔습니다.");
    } else {
      setShop(rollShop(level));
      setNotice("장수 영입 후보를 새로 불러왔습니다.");
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

  const sellSelected = () => {
    if (!selection || !selectedPiece || !selectedHero) return;
    const nextBoard = [...board];
    const nextBench = [...bench];
    (selection.zone === "board" ? nextBoard : nextBench)[selection.index] = null;
    const value = selectedHero.cost * (selectedPiece.star === 1 ? 1 : selectedPiece.star === 2 ? 3 : 9);
    const returned = selectedPiece.items.filter(Boolean) as string[];
    setBoard(nextBoard);
    setBench(nextBench);
    if (returned.length) setItemBag((bag) => [...bag, ...returned]);
    setGold((current) => current + value);
    setSelection(null);
    setNotice(`${selectedHero.name}을 보내고 금화 ${value}를 회수했습니다.`);
  };

  const startBattle = () => {
    if (!boardCount) return setNotice("전장에 장수를 먼저 배치하세요.");
    const allies = board.flatMap((piece, boardIndex) =>
      piece
        ? [
            {
              uid: piece.uid,
              heroId: piece.heroId,
              star: piece.star,
              boardIndex,
              items: piece.items,
            },
          ]
        : [],
    );
    if (allies.length !== boardCount) {
      setNotice("배치 인원과 출전 명단이 일치하지 않습니다. 다시 배치해 주세요.");
      return;
    }
    const candidates = BATTLEFIELD_THEMES.filter((item) => item.id !== theme);
    const nextTheme = candidates[Math.floor(Math.random() * candidates.length)].id;
    const seed = Math.floor(Date.now() / 1000) + round * 137 + stage * 31;
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
        enemyTactic: enemyTacticForSeed(seed),
        allyFormation: formation,
        enemyFormation: enemyFormationForSeed(seed),
        enemyScale:
          mode === "single" ? DIFFICULTIES[difficulty].enemyScale : 1.08,
        enemyLeaderStar: difficulty === "legendary" ? 2 : 1,
      }),
    );
    setNotice(`출전 ${allies.length}명 · 전투 시작`);
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
        "--terrain-image": `url('${currentTheme.asset}')`,
        "--terrain-accent": currentTheme.accent,
      } as React.CSSProperties}
    >
      {introOpen && (
        <div className="intro-screen" role="dialog" aria-label="게임 시작">
          <span className="intro-emblem">삼</span>
          <h1>삼국지 오토체스</h1>
          <p>백 명의 장수 · 진법과 지형이 얽히는 자동 전투</p>
          <button className="intro-start" onClick={() => setIntroOpen(false)}>
            전투 준비 시작
          </button>
          <span className="intro-version">PRE-ALPHA v0.1.5</span>
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
              <span className="phase">{round}-{stage} · 준비 단계</span>
              <div className="terrain-title" style={{ "--terrain-accent": currentTheme.accent } as React.CSSProperties}>
                <span>{theme}</span>
                <h1>군웅의 전장<small>{theme} · {currentTheme.subtitle}</small></h1>
              </div>
              <span className="timer">배치 7×4 · 전투 7×8 · {boardCount}/{level}</span>
            </div>
            <div
              className={`board prep-stage terrain-${currentTheme.slug}`}
              style={{
                "--terrain-image": `url('${currentTheme.asset}')`,
                "--terrain-accent": currentTheme.accent,
              } as React.CSSProperties}
            >
              <div className="board-terrain-layer" aria-hidden="true" />
              <div className="board-scenery" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <div className="enemy-direction"><span>▲ 적 진영 (상단)</span><small>전투는 7×8 위아래 교전 · 배치칸은 아군 하단 7×4</small></div>
              <button
                className="formation-command"
                style={{ "--formation": currentFormation.color } as React.CSSProperties}
                onClick={() => setModeOpen(true)}
              >
                <i>{currentFormation.label.slice(0, 1)}</i>
                <span><small>출전 진법</small><strong>{currentFormation.label}</strong><em>{formationCount}명 · {formationTier}단계</em></span>
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
                return (
                  <div
                    className={`board-slot terrain-pad terrain-pad-${terrainCell.kind} ${piece ? "occupied" : ""} ${formationCell ? "formation-cell" : ""} ${coreCell ? "formation-core-cell" : ""} ${terrainCell.walkable ? "is-walkable" : "is-blocked"}`}
                    data-row={row}
                    data-column={index % BOARD_COLUMNS}
                    key={index}
                    style={formationCell ? { "--formation": currentFormation.color } as React.CSSProperties : undefined}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropUnit(event, "board", index)}
                    title={`${COMBAT_TERRAIN_META[terrainCell.kind].label} · ${COMBAT_TERRAIN_META[terrainCell.kind].shortRule}`}
                  >
                    <span className="slot-mark">{formationCell ? currentFormation.label.slice(0, 1) : RANKS[row].mark}</span>
                    {coreCell && <span className="formation-core-mark">핵</span>}
                    {terrainCell.kind !== "ground" && (
                      <span className="slot-terrain-badge">
                        <i>{COMBAT_TERRAIN_META[terrainCell.kind].hanja}</i>
                        <b>{COMBAT_TERRAIN_META[terrainCell.kind].label}</b>
                      </span>
                    )}
                    {piece ? (
                      <UnitPiece
                        piece={piece}
                        theme={theme}
                        variant="board"
                        selected={selection?.zone === "board" && selection.index === index}
                        onClick={() => moveUnit("board", index)}
                        onDragStart={(event) => dragStart(event, "board", index)}
                      />
                    ) : (
                      <button
                        className={`empty-slot ${terrainCell.walkable ? "" : "empty-slot-blocked"}`}
                        onClick={() => moveUnit("board", index)}
                        disabled={!terrainCell.walkable && !selection}
                      >
                        {terrainCell.walkable
                          ? formationCell
                            ? currentFormation.label.slice(0, 1)
                            : "+"
                          : COMBAT_TERRAIN_META[terrainCell.kind].label.slice(0, 1)}
                      </button>
                    )}
                  </div>
                );
              })}
              <div className="battle-wash" />
            </div>
            <div className="bench-wrap">
              <div className="bench-title"><span>대기석 · 카드</span><small>상점 영입 카드 · 전장에 올려 2.5D로 배치</small></div>
              <div className="bench">
                {bench.map((piece, index) => (
                  <div
                    className={`bench-slot ${piece ? "occupied" : ""}`}
                    key={index}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropUnit(event, "bench", index)}
                  >
                    {piece ? (
                      <UnitPiece
                        piece={piece}
                        theme={theme}
                        variant="bench"
                        selected={selection?.zone === "bench" && selection.index === index}
                        onClick={() => moveUnit("bench", index)}
                        onDragStart={(event) => dragStart(event, "bench", index)}
                      />
                    ) : <button className="empty-slot" onClick={() => moveUnit("bench", index)}>{index + 1}</button>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="round-panel panel">
            <div className="panel-heading"><span>{selectedHero ? "장수 상세" : "다음 상대"}</span><small className="ready">준비</small></div>
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
                              <b className="equip-glyph">{equipped.glyph}</b>
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
                              <b>{item?.glyph}</b>
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
                  <span><small>출전 전술</small><b>{TACTICS[tactic].label}</b></span><em>변경</em>
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
              <button onClick={reroll}><b>↻</b><span>새로고침<small>● 2</small></span></button>
              <button onClick={buyXp}><b>+</b><span>경험치<small>● 4</small></span></button>
              <button className={locked ? "locked" : ""} onClick={() => setLocked((value) => !value)}><b>{locked ? "◆" : "◇"}</b><span>상점 잠금<small>{locked ? "유지 중" : "해제"}</small></span></button>
            </div>
          </div>
          <div className="shop-area">
            <div className="shop-title">
              <span>
                {shopKind === "items"
                  ? "아이템 상점 · 3턴마다"
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
                    onClick={() => equipFromBag(index)}
                  >
                    {ITEM_BY_ID[itemId]?.glyph ?? "템"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="battle-action">
            <span>{round}-{stage} · {FORMATIONS[formation].label} {formationTier}단계<br />전투 직전 전장 테마가 무작위로 공개됩니다.</span>
            <button onClick={startBattle} disabled={combat}><small>자동 전투</small>전투 시작</button>
            <p>이자 +{Math.min(5, Math.floor(gold / 10))} · 연승 보너스 +{Math.min(3, Math.floor(Math.max(0, streak) / 2))}</p>
          </div>
        </section>
      </div>

      {battle && (
        <CombatStage
          state={battle}
          theme={battle.theme}
          opponent={mode === "single" ? "호로관 선봉대" : "군웅 경쟁 진형"}
          battleLabel={`${round}-${stage} 자동 교전`}
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
          tactic={tactic}
          formation={formation}
          rankPoints={rankPoints}
          onModeChange={setMode}
          onDifficultyChange={setDifficulty}
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
