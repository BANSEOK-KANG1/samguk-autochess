"use client";

import { useEffect, useRef, useState } from "react";
import {
  BATTLEFIELD_BY_ID,
  FACTION_COLOR,
  HERO_BY_ID,
  type BattlefieldTheme,
  type Role,
} from "./game-data";
import type {
  BattleState,
  CombatEvent,
  CombatUnit,
  CombatWinner,
} from "./combat-engine";
import { DUTY_PROFILES } from "./combat-duty";
import { traitsForHero } from "./hero-traits";
import {
  ROLE_ARCHETYPES,
  TACTICS,
} from "./combat-config";
import { FORMATIONS } from "./formation-config";
import { combatIdentityFor } from "./hero-combat-identity";
import { heroAppearanceFor } from "./hero-appearance";
import { heroCombatArtStyle } from "./hero-combat-art";
import { heroPortraitStyle } from "./hero-portrait";
import { heroUltimateArtFor } from "./hero-ultimate-art";
import {
  STATUS_META,
  TERRAIN_EVENT_META,
} from "./combat-effects";
import {
  COMBAT_TERRAIN_META,
  combatTerrainGrid,
  terrainRulesForTheme,
} from "./combat-terrain";

const ROLE_MOTION_CLASS: Record<Role, string> = {
  군주: "role-lord",
  용장: "role-warrior",
  수호: "role-guardian",
  책사: "role-strategist",
  궁수: "role-archer",
  기병: "role-cavalry",
  암살: "role-assassin",
  지원: "role-support",
};

const combatLeftFor = (column: number) => 4.2 + column * 13.1;
const combatTopFor = (row: number) => 3.4 + row * 11.2;
const combatCenterLeftFor = (column: number) => combatLeftFor(column) + 5.8;
const combatTopForUnit = (unit: CombatUnit) =>
  combatTopFor(unit.row) - (unit.terrainKind === "high" ? 1.1 : 0);
const combatCenterTopForUnit = (unit: CombatUnit) =>
  combatTopForUnit(unit) + 4.5;

const unitPosition = (unit: CombatUnit, units: CombatUnit[]) => {
  const target = units.find((candidate) => candidate.id === unit.targetId);
  const facing = target
    ? target.column === unit.column
      ? unit.side === "ally"
        ? 1
        : -1
      : target.column > unit.column
        ? 1
        : -1
    : unit.side === "ally"
      ? 1
      : -1;
  const depthScale = 0.72 + unit.row * 0.012;
  const starScale = unit.star === 1 ? 0.8 : unit.star === 2 ? 0.93 : 1.07;

  return {
    "--combat-left": `${combatLeftFor(unit.column)}%`,
    "--combat-top": `${combatTopForUnit(unit)}%`,
    "--faction": FACTION_COLOR[HERO_BY_ID[unit.heroId].faction],
    "--combat-depth": 10 + unit.row,
    "--fighter-facing": facing,
    "--fighter-lunge": `${facing * 10}px`,
    "--fighter-lunge-back": `${facing * -4}px`,
    "--fighter-lunge-soft": `${facing * 7}px`,
    "--fighter-lunge-heavy": `${facing * 14}px`,
    "--fighter-lunge-ultra": `${facing * 18}px`,
    "--fighter-recoil": `${facing * -7}px`,
    "--fighter-recoil-soft": `${facing * -3}px`,
    "--fighter-scale": depthScale,
    "--star-scale": starScale,
    "--fighter-render-scale": depthScale * starScale,
    "--fighter-dead-scale": depthScale * starScale * 0.82,
  } as React.CSSProperties;
};

const eventPosition = (
  battleEvent: CombatEvent,
  units: CombatUnit[],
) => {
  const unit = units.find(
    (candidate) =>
      candidate.id === (battleEvent.targetId ?? battleEvent.actorId),
  );
  return unit
    ? ({
        "--event-left": `${combatCenterLeftFor(unit.column)}%`,
        "--event-top": `${combatCenterTopForUnit(unit)}%`,
      } as React.CSSProperties)
    : undefined;
};

const eventTrajectory = (
  battleEvent: CombatEvent,
  units: CombatUnit[],
) => {
  const actor = units.find((unit) => unit.id === battleEvent.actorId);
  const target = units.find((unit) => unit.id === battleEvent.targetId);
  if (!actor || !target) return undefined;

  return {
    "--projectile-from-left": `${combatCenterLeftFor(actor.column)}%`,
    "--projectile-from-top": `${combatCenterTopForUnit(actor)}%`,
    "--projectile-to-left": `${combatCenterLeftFor(target.column)}%`,
    "--projectile-to-top": `${combatCenterTopForUnit(target)}%`,
  } as React.CSSProperties;
};

const ultimatePosition = (
  battleEvent: CombatEvent,
  units: CombatUnit[],
  color: string,
  accent: string,
) => {
  const actor = units.find((unit) => unit.id === battleEvent.actorId);
  if (!actor) return undefined;

  return {
    "--ultimate-left": `${combatCenterLeftFor(actor.column)}%`,
    "--ultimate-top": `${combatCenterTopForUnit(actor)}%`,
    "--signature": color,
    "--signature-accent": accent,
  } as React.CSSProperties;
};

export function CombatStage({
  state,
  theme,
  opponent,
  battleLabel,
  speed,
  result,
  onToggleSpeed,
  onSkip,
}: {
  state: BattleState;
  theme: BattlefieldTheme;
  opponent: string;
  battleLabel: string;
  speed: 1 | 2;
  result: CombatWinner | null;
  onToggleSpeed: () => void;
  onSkip: () => void;
}) {
  const [signatureMoment, setSignatureMoment] =
    useState<CombatEvent | null>(null);
  const [terrainMoment, setTerrainMoment] =
    useState<CombatEvent | null>(null);
  const signatureShowTimer = useRef<number | null>(null);
  const signatureTimer = useRef<number | null>(null);
  const terrainShowTimer = useRef<number | null>(null);
  const terrainTimer = useRef<number | null>(null);
  const battlefield = BATTLEFIELD_BY_ID[theme];
  const allyAlive = state.units.filter(
    (unit) => unit.side === "ally" && unit.hp > 0,
  ).length;
  const enemyAlive = state.units.filter(
    (unit) => unit.side === "enemy" && unit.hp > 0,
  ).length;
  const remainingSeconds = Math.max(0, 45 - Math.floor(state.tick * 0.55));
  const allyTactic = TACTICS[state.allyTactic];
  const enemyTactic = TACTICS[state.enemyTactic];
  const allyFormation = FORMATIONS[state.allyFormation];
  const enemyFormation = FORMATIONS[state.enemyFormation];
  const terrainGrid = combatTerrainGrid(theme);
  const terrainRules = terrainRulesForTheme(theme);
  const signatureActor = signatureMoment
    ? state.units.find((unit) => unit.id === signatureMoment.actorId) ?? null
    : null;
  const signatureHero = signatureActor
    ? HERO_BY_ID[signatureActor.heroId]
    : null;
  const signatureIdentity = signatureHero
    ? combatIdentityFor(signatureHero.id, signatureHero.role)
    : null;
  const signatureRole = signatureHero
    ? ROLE_ARCHETYPES[signatureHero.role]
    : null;
  const signatureScene = signatureHero
    ? heroUltimateArtFor(signatureHero)
    : null;

  useEffect(() => {
    const latestSkill = [...state.events]
      .reverse()
      .find((battleEvent) => battleEvent.type === "skill");
    if (!latestSkill) return;

    if (signatureShowTimer.current) {
      window.clearTimeout(signatureShowTimer.current);
    }
    signatureShowTimer.current = window.setTimeout(() => {
      setSignatureMoment(latestSkill);
      signatureShowTimer.current = null;
    }, 0);
    if (signatureTimer.current) {
      window.clearTimeout(signatureTimer.current);
    }
    signatureTimer.current = window.setTimeout(() => {
      setSignatureMoment((current) =>
        current?.id === latestSkill.id ? null : current,
      );
      signatureTimer.current = null;
    }, speed === 1 ? 1480 : 820);
  }, [speed, state.events]);

  useEffect(() => {
    const latestTerrain = [...state.events]
      .reverse()
      .find((battleEvent) => battleEvent.type === "terrain");
    if (!latestTerrain) return;

    if (terrainShowTimer.current) {
      window.clearTimeout(terrainShowTimer.current);
    }
    terrainShowTimer.current = window.setTimeout(() => {
      setTerrainMoment(latestTerrain);
      terrainShowTimer.current = null;
    }, 0);
    if (terrainTimer.current) {
      window.clearTimeout(terrainTimer.current);
    }
    terrainTimer.current = window.setTimeout(() => {
      setTerrainMoment((current) =>
        current?.id === latestTerrain.id ? null : current,
      );
      terrainTimer.current = null;
    }, 980);
  }, [state.events]);

  useEffect(
    () => () => {
      if (signatureShowTimer.current) {
        window.clearTimeout(signatureShowTimer.current);
      }
      if (signatureTimer.current) {
        window.clearTimeout(signatureTimer.current);
      }
      if (terrainShowTimer.current) {
        window.clearTimeout(terrainShowTimer.current);
      }
      if (terrainTimer.current) {
        window.clearTimeout(terrainTimer.current);
      }
    },
    [],
  );

  return (
    <div
      className={`live-combat motion-system-v21 motion-system-v22 terrain-${battlefield.slug}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${opponent} 자동 전투`}
      style={{
        "--terrain-image": `url('${battlefield.asset}')`,
        "--terrain-accent": battlefield.accent,
        "--cinematic-duration": speed === 1 ? "1220ms" : "620ms",
      } as React.CSSProperties}
    >
      <div className="live-combat-shell">
        <header className="live-combat-head">
          <div>
            <small>{battleLabel} · AUTO BATTLE</small>
            <h2>
              <i>{battlefield.hanja}</i>
              {theme} 전장
            </h2>
          </div>
          <div className="combat-score" aria-live="polite">
            <span>아군 <b>{allyAlive}</b></span>
            <em>{remainingSeconds}</em>
            <span><b>{enemyAlive}</b> 적군</span>
          </div>
          <div className="combat-controls">
            <button onClick={onToggleSpeed} aria-label="전투 속도 변경">
              ×{speed}
            </button>
            <button onClick={onSkip}>결과까지</button>
          </div>
        </header>

        <div className="live-combat-body">
          <div
            className={`combat-arena ${signatureMoment ? "ultimate-active" : ""}`}
          >
            <div className="combat-horizon" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className="combat-scenery scenery-back" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i /><i />
            </div>
            <div className="combat-ground-3d" aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
            <div className="combat-key-light" aria-hidden="true" />
            <div className="combat-atmosphere" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div
              className={`terrain-combat-vfx terrain-${battlefield.slug} ${
                terrainMoment ? "is-active" : ""
              }`}
              aria-hidden="true"
            >
              <i /><i /><i /><i /><i /><i />
            </div>
            <div className="combat-side-label enemy">
              <span>敵</span>
              <b>{opponent}</b>
            </div>
            <div className="combat-side-label ally">
              <span>我</span>
              <b>{allyFormation.label}</b>
            </div>
            <div className="combat-midline">
              <span>交戰線</span>
            </div>
            <div className="terrain-topology-hud">
              <small>실전 지형 판정</small>
              <strong>{battlefield.subtitle}</strong>
              <div>
                {terrainRules.map((rule) => (
                  <span className={`terrain-rule terrain-${rule.kind}`} key={rule.kind}>
                    <i>{rule.hanja}</i>
                    <b>{rule.label}</b>
                    <em>{rule.shortRule}</em>
                  </span>
                ))}
              </div>
            </div>
            <div
              className="combat-tactic-badge enemy"
              style={{ "--tactic": enemyTactic.color } as React.CSSProperties}
            >
              <i>{enemyTactic.hanja}</i>
              <span><small>적 전술</small><b>{enemyTactic.label}</b></span>
            </div>
            <div
              className="combat-tactic-badge ally"
              style={{ "--tactic": allyTactic.color } as React.CSSProperties}
            >
              <i>{allyTactic.hanja}</i>
              <span><small>아군 전술</small><b>{allyTactic.label}</b></span>
            </div>
            <div
              className="combat-formation-sigil enemy"
              style={{ "--formation": enemyFormation.color } as React.CSSProperties}
            >
              <i>{enemyFormation.hanja}</i>
              <span>
                <small>적 진법</small>
                <b>{enemyFormation.label}</b>
                <em>{state.enemyFormationTier}단계</em>
              </span>
            </div>
            <div
              className="combat-formation-sigil ally"
              style={{ "--formation": allyFormation.color } as React.CSSProperties}
            >
              <i>{allyFormation.hanja}</i>
              <span>
                <small>아군 진법</small>
                <b>{allyFormation.label}</b>
                <em>{state.allyFormationTier}단계</em>
              </span>
            </div>
            <div className="combat-cells" aria-hidden="true">
              {terrainGrid.map((cell) => (
                <i
                  key={`${cell.row}-${cell.column}`}
                  className={`${cell.row >= 4 ? "ally-cell" : "enemy-cell"} terrain-cell terrain-cell-${cell.kind} ${cell.walkable ? "is-walkable" : "is-blocked"}`}
                >
                  {cell.kind !== "ground" && (
                    <b>{COMBAT_TERRAIN_META[cell.kind].hanja}</b>
                  )}
                </i>
              ))}
            </div>
            <div className="combat-scenery scenery-front" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i /><i />
            </div>

            {state.units.map((unit) => {
              const hero = HERO_BY_ID[unit.heroId];
              const roleVisual = ROLE_ARCHETYPES[hero.role];
              const dutyVisual = DUTY_PROFILES[unit.duty];
              const traits = traitsForHero(hero);
              const identity = combatIdentityFor(hero.id, hero.role);
              const appearance = heroAppearanceFor(
                hero.id,
                hero.role,
                hero.faction,
              );
              const hp = Math.max(0, (unit.hp / unit.maxHp) * 100);
              const mana = Math.max(0, (unit.mana / unit.maxMana) * 100);
              const statusClasses = unit.statuses
                .map((status) => `status-${status.kind}`)
                .join(" ");
              const statusLabel = unit.statuses
                .map(
                  (status) =>
                    `${STATUS_META[status.kind].label} ${status.remaining}`,
                )
                .join(", ");
              return (
                <div
                  className={`combat-unit side-${unit.side} footing-${unit.terrainKind} star-tier-${unit.star} archetype-${roleVisual.id} motion-${roleVisual.motion} ${ROLE_MOTION_CLASS[hero.role]} build-${appearance.build} face-${appearance.face} headgear-${appearance.headgear} beard-${appearance.beard} material-${appearance.variant} rarity-${hero.cost} hero-${hero.id} weapon-${identity.weapon} signature-${identity.effect} action-${unit.action} ${statusClasses} ${unit.formationMember ? "in-formation" : "out-formation"} ${unit.formationCore ? "formation-core" : ""} ${unit.formationFavored ? "formation-favored" : ""} ${unit.hp <= 0 ? "dead" : ""}`}
                  key={unit.id}
                  style={{
                    ...unitPosition(unit, state.units),
                    "--signature": identity.color,
                    "--signature-accent": identity.accent,
                    "--armor-main": appearance.armor,
                    "--armor-deep": appearance.armorDeep,
                    "--armor-trim": appearance.trim,
                    "--cloth-main": appearance.cloth,
                    "--skin-tone": appearance.skin,
                    "--hair-tone": appearance.hair,
                    "--metal-tone": appearance.metal,
                    "--body-scale-x": appearance.bodyScaleX,
                    "--body-scale-y": appearance.bodyScaleY,
                    "--hero-head-width": `${appearance.headWidth}px`,
                    "--hero-head-height": `${appearance.headHeight}px`,
                    "--helmet-tilt": `${appearance.helmetTilt}deg`,
                  } as React.CSSProperties}
                  aria-label={`${unit.side === "ally" ? "아군" : "적군"} ${hero.name} 체력 ${Math.round(hp)}%${statusLabel ? `, ${statusLabel}` : ""}`}
                >
                  <span className="combat-fighter" aria-hidden="true">
                    <i className="fighter-ground" />
                    <i className="fighter-depth-shadow" />
                    <span className="fighter-ascension-ring">
                      <i />
                      <i />
                    </span>
                    <span className="fighter-star-particles">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                    <span className="fighter-mount">
                      <i className="mount-body" />
                      <i className="mount-head" />
                      <i className="mount-leg mount-leg-a" />
                      <i className="mount-leg mount-leg-b" />
                      <i className="mount-leg mount-leg-c" />
                      <i className="mount-leg mount-leg-d" />
                    </span>
                    <span className="fighter-rig">
                      <span
                        className="fighter-body-art"
                        style={heroCombatArtStyle(hero)}
                      />
                      <span className="fighter-articulated-body">
                        <i
                          className="fighter-segment segment-legs"
                          style={heroCombatArtStyle(hero)}
                        />
                        <i
                          className="fighter-segment segment-torso"
                          style={heroCombatArtStyle(hero)}
                        />
                        <i
                          className="fighter-segment segment-arm-back"
                          style={heroCombatArtStyle(hero)}
                        />
                        <i
                          className="fighter-segment segment-arm-weapon"
                          style={heroCombatArtStyle(hero)}
                        />
                        <i
                          className="fighter-segment segment-head"
                          style={heroCombatArtStyle(hero)}
                        />
                      </span>
                      <span className="fighter-joint-map" aria-hidden="true">
                        <i className="joint joint-neck" />
                        <i className="joint joint-shoulder-back" />
                        <i className="joint joint-shoulder-weapon" />
                        <i className="joint joint-elbow-back" />
                        <i className="joint joint-elbow-weapon" />
                        <i className="joint joint-pelvis" />
                        <i className="joint joint-knee-back" />
                        <i className="joint joint-knee-front" />
                      </span>
                      <i className="fighter-body-rim" />
                      <i className="fighter-aura-disc" />
                      <i className="fighter-rank-halo" />
                      <i className="fighter-banner"><b>{hero.faction}</b></i>
                    </span>
                    <span
                      className="fighter-afterimage"
                      style={heroCombatArtStyle(hero)}
                    />
                    <span className="fighter-signature-trail">
                      <i />
                      <i />
                      <i />
                    </span>
                    <i className="fighter-speed-line fighter-speed-line-a" />
                    <i className="fighter-speed-line fighter-speed-line-b" />
                    <i className="fighter-speed-line fighter-speed-line-c" />
                    <i className="fighter-action-arc" />
                    <i className="fighter-action-arc fighter-action-arc-back" />
                    <i className="fighter-dust" />
                  </span>
                  <span className="combat-role-vfx" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  {unit.terrainKind !== "ground" && (
                    <span
                      className={`combat-footing-badge footing-${unit.terrainKind}`}
                      title={COMBAT_TERRAIN_META[unit.terrainKind].shortRule}
                    >
                      <i>{COMBAT_TERRAIN_META[unit.terrainKind].hanja}</i>
                      <b>{COMBAT_TERRAIN_META[unit.terrainKind].label}</b>
                    </span>
                  )}
                  <span className="combat-role-crest" title={`${dutyVisual.label} · ${dutyVisual.description}`}>
                    <i>{dutyVisual.glyph}</i>
                    <b>{dutyVisual.short}</b>
                  </span>
                  <span className="trait-icons trait-icons-combat">
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
                  <span className="combat-unit-ring" />
                  <span className="combat-unit-name">
                    <b>{hero.name}</b>
                    <small>{identity.weaponName} · {hero.skill}</small>
                  </span>
                  <span className="combat-hp">
                    <i style={{ width: `${hp}%` }} />
                  </span>
                  <span className="combat-mana">
                    <i style={{ width: `${mana}%` }} />
                  </span>
                  {unit.shield > 0 && <span className="combat-shield">盾</span>}
                  {unit.statuses.length > 0 && (
                    <span className="combat-status-stack">
                      {unit.statuses.map((status) => (
                        <i
                          className={`status-badge status-${status.kind}`}
                          title={`${STATUS_META[status.kind].label}: ${STATUS_META[status.kind].description}`}
                          key={status.kind}
                        >
                          <b>{STATUS_META[status.kind].glyph}</b>
                          <small>{status.remaining}</small>
                        </i>
                      ))}
                    </span>
                  )}
                  <span className="combat-stars">
                    {"◆".repeat(unit.star)}
                  </span>
                </div>
              );
            })}

            <div className="combat-event-layer" aria-hidden="true">
              {state.events
                .filter(
                  (battleEvent) =>
                    battleEvent.targetId &&
                    (battleEvent.type === "attack" ||
                      battleEvent.type === "damage"),
                )
                .map((battleEvent) => {
                  const actor = state.units.find(
                    (unit) => unit.id === battleEvent.actorId,
                  );
                  if (!actor) return null;
                  const hero = HERO_BY_ID[actor.heroId];
                  const roleVisual = ROLE_ARCHETYPES[hero.role];
                  return (
                    <span
                      className={`combat-projectile projectile-${roleVisual.motion} projectile-${battleEvent.type}`}
                      key={`projectile-${battleEvent.id}`}
                      style={eventTrajectory(battleEvent, state.units)}
                    >
                      <i>{roleVisual.glyph}</i>
                    </span>
                  );
                })}
              {state.events
                .filter(
                  (battleEvent) =>
                    battleEvent.targetId &&
                    (battleEvent.type === "attack" ||
                      battleEvent.type === "damage"),
                )
                .map((battleEvent) => (
                  <span
                    className={`combat-impact impact-${battleEvent.type} impact-${battleEvent.impact ?? "light"}`}
                    key={`impact-${battleEvent.id}`}
                    style={eventPosition(battleEvent, state.units)}
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                ))}
              {state.events
                .filter((battleEvent) => battleEvent.type === "heal")
                .map((battleEvent) => (
                  <span
                    className="combat-heal-motes"
                    key={`heal-${battleEvent.id}`}
                    style={eventPosition(battleEvent, state.units)}
                  >
                    <i>+</i><i>+</i><i>+</i>
                  </span>
                ))}
              {state.events
                .filter(
                  (battleEvent) =>
                    battleEvent.type === "status" &&
                    battleEvent.targetId &&
                    battleEvent.status,
                )
                .map((battleEvent) => {
                  const status = battleEvent.status;
                  if (!status) return null;
                  return (
                    <span
                      className={`combat-status-burst status-${status}`}
                      key={`status-${battleEvent.id}`}
                      style={eventPosition(battleEvent, state.units)}
                    >
                      <i>{STATUS_META[status].glyph}</i>
                    </span>
                  );
                })}
            </div>

            {state.events
              .filter(
                (battleEvent) =>
                  battleEvent.amount &&
                  (battleEvent.type === "attack" ||
                    battleEvent.type === "damage" ||
                    battleEvent.type === "heal"),
              )
              .map((battleEvent) => (
                <span
                  className={`combat-float event-${battleEvent.type}`}
                  key={battleEvent.id}
                  style={eventPosition(battleEvent, state.units)}
                >
                  {battleEvent.type === "heal" ? "+" : "-"}
                  {battleEvent.amount}
                </span>
              ))}

            <div className="ultimate-layer" aria-hidden="true">
              {(signatureMoment ? [signatureMoment] : [])
                .map((battleEvent) => {
                  const actor = state.units.find(
                    (unit) => unit.id === battleEvent.actorId,
                  );
                  if (!actor) return null;
                  const hero = HERO_BY_ID[actor.heroId];
                  const identity = combatIdentityFor(hero.id, hero.role);
                  return (
                    <div
                      className={`ultimate-vfx ultimate-${identity.effect} side-${actor.side}`}
                      key={`ultimate-${battleEvent.id}`}
                      style={ultimatePosition(
                        battleEvent,
                        state.units,
                        identity.color,
                        identity.accent,
                      )}
                    >
                      <span className="ultimate-seal">
                        <i>{identity.glyph}</i>
                        <b>{hero.hanja}</b>
                      </span>
                      <span className="ultimate-ring ring-a" />
                      <span className="ultimate-ring ring-b" />
                      <span className="ultimate-stroke stroke-a" />
                      <span className="ultimate-stroke stroke-b" />
                      <span className="ultimate-stroke stroke-c" />
                    </div>
                  );
                })}
            </div>

            {terrainMoment && (
              <div className={`terrain-event-callout terrain-${battlefield.slug}`}>
                <small>{TERRAIN_EVENT_META[theme].glyph}</small>
                <span>
                  <em>{TERRAIN_EVENT_META[theme].hanja}</em>
                  <strong>{TERRAIN_EVENT_META[theme].label}</strong>
                  <b>{TERRAIN_EVENT_META[theme].description}</b>
                </span>
              </div>
            )}

            {signatureMoment &&
              signatureActor &&
              signatureHero &&
              signatureIdentity &&
              signatureRole && (
                <div
                  className={`ultimate-cinematic side-${signatureActor.side} skill-${signatureRole.id} ultimate-${signatureIdentity.effect} cinematic-star-${signatureActor.star} ${signatureScene ? "has-signature-scene" : "uses-battlefield-scene"}`}
                  key={`cinematic-${signatureMoment.id}`}
                  style={
                    {
                      "--signature": signatureIdentity.color,
                      "--signature-accent": signatureIdentity.accent,
                      "--ultimate-scene-image": `url('${
                        signatureScene?.src ?? battlefield.asset
                      }')`,
                      "--ultimate-scene-focus":
                        signatureScene?.focus ?? "center center",
                    } as React.CSSProperties
                  }
                  aria-hidden="true"
                >
                  <div className="ultimate-scene-art">
                    <i />
                  </div>
                  <div className="ultimate-cinematic-wash">
                    <i /><i /><i /><i /><i /><i />
                  </div>
                  <div className="ultimate-portrait-frame">
                    <span
                      className="ultimate-portrait-art"
                      style={heroPortraitStyle(signatureHero)}
                    />
                    <span className="ultimate-portrait-light" />
                    <b>{signatureHero.hanja}</b>
                  </div>
                  <div className="ultimate-cinematic-copy">
                    <small>
                      <i>{signatureHero.faction}</i>
                      {signatureIdentity.weaponName} · {signatureRole.label}
                    </small>
                    <h3>{signatureHero.name}</h3>
                    <strong>
                      {signatureMoment.label.replace(
                        `${signatureHero.name} · `,
                        "",
                      )}
                    </strong>
                    <em>{signatureIdentity.title}</em>
                  </div>
                  <span className="ultimate-cinematic-glyph">
                    {signatureIdentity.glyph}
                  </span>
                  <span className="ultimate-cinematic-body">
                    <i style={heroCombatArtStyle(signatureHero)} />
                  </span>
                  <span className="ultimate-cinematic-cut cut-a" />
                  <span className="ultimate-cinematic-cut cut-b" />
                  <span className="ultimate-cinematic-timeline"><i /></span>
                </div>
              )}

            {result && (
              <div className={`combat-verdict verdict-${result}`} role="status">
                <span>{result === "ally" ? "勝" : result === "enemy" ? "敗" : "和"}</span>
                <strong>
                  {result === "ally"
                    ? "전투 승리"
                    : result === "enemy"
                      ? "전투 패배"
                      : "무승부"}
                </strong>
                <small>
                  아군 {allyAlive}명 · 적군 {enemyAlive}명 생존
                </small>
              </div>
            )}
          </div>

          <aside className="combat-feed">
            <div>
              <small>전황 기록</small>
              <strong>{state.tick}번째 행동 주기</strong>
            </div>
            <ul>
              {state.log.length ? (
                state.log.map((battleEvent) => (
                  <li
                    className={`feed-${battleEvent.type}`}
                    key={battleEvent.id}
                  >
                    <i>
                      {battleEvent.type === "skill"
                        ? "技"
                        : battleEvent.type === "defeat"
                          ? "沒"
                          : battleEvent.type === "terrain"
                            ? "地"
                            : battleEvent.type === "status" &&
                                battleEvent.status
                              ? STATUS_META[battleEvent.status].glyph
                              : "擊"}
                    </i>
                    <span>{battleEvent.label}</span>
                    {battleEvent.amount ? <b>{battleEvent.amount}</b> : null}
                  </li>
                ))
              ) : (
                <li className="feed-ready">
                  <i>令</i>
                  <span>양 진영이 진군을 시작합니다.</span>
                </li>
              )}
            </ul>
            <div className="combat-legend">
              <span><i className="tank-dot">盾</i> 탱커</span>
              <span><i className="dealer-dot">刃</i> 딜러</span>
              <span><i className="healer-dot">癒</i> 힐러</span>
              <span><i className="tactician-dot">策</i> 책략가</span>
              <small>장수별 기술 · 상태이상 · 전장 사건이 실시간으로 판정됩니다.</small>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
