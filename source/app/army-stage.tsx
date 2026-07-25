"use client";

import {
  BATTLEFIELD_BY_ID,
  HERO_BY_ID,
} from "./game-data";
import {
  FORMATION_META,
  TACTICS,
  TERRAIN_FEATURE_META,
  TROOP_META,
} from "./army-data";
import type {
  ArmyBattleEvent,
  ArmyBattleState,
} from "./army-engine";
import { heroPortraitStyle } from "./hero-portrait";

const unitStyle = (
  unit: ArmyBattleState["units"][number],
): React.CSSProperties =>
  ({
    "--army-left": `${unit.column * (100 / 7) + 7.1}%`,
    "--army-top": `${unit.row * 12.4 + 5.5}%`,
    "--troop-color": TROOP_META[unit.kind].color,
    "--army-depth": 20 + unit.row,
    "--army-facing": unit.side === "ally" ? -1 : 1,
  }) as React.CSSProperties;

const eventStyle = (
  battleEvent: ArmyBattleEvent,
  state: ArmyBattleState,
): React.CSSProperties | undefined => {
  const unit = state.units.find(
    (candidate) =>
      candidate.id === (battleEvent.targetId ?? battleEvent.actorId),
  );
  if (!unit) return undefined;
  return {
    "--event-left": `${unit.column * (100 / 7) + 7.1}%`,
    "--event-top": `${unit.row * 12.4 + 5.5}%`,
  } as React.CSSProperties;
};

const SoldierFormation = ({
  kind,
  ratio,
}: {
  kind: ArmyBattleState["units"][number]["kind"];
  ratio: number;
}) => {
  const visible = Math.max(2, Math.ceil(ratio * 12));
  return (
    <div className={`soldier-formation troop-${kind}`} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <i key={index} className={index >= visible ? "fallen" : ""}>
          <b />
          <span />
        </i>
      ))}
    </div>
  );
};

export function ArmyStage({
  state,
  speed,
  onToggleSpeed,
  onSkip,
  onContinue,
}: {
  state: ArmyBattleState;
  speed: 1 | 2;
  onToggleSpeed: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const battlefield = BATTLEFIELD_BY_ID[state.theme];
  const allyTroops = state.units
    .filter((unit) => unit.side === "ally")
    .reduce((sum, unit) => sum + unit.troops, 0);
  const enemyTroops = state.units
    .filter((unit) => unit.side === "enemy")
    .reduce((sum, unit) => sum + unit.troops, 0);
  const allyUnits = state.units.filter(
    (unit) => unit.side === "ally" && unit.troops > 0 && unit.morale > 0,
  ).length;
  const enemyUnits = state.units.filter(
    (unit) => unit.side === "enemy" && unit.troops > 0 && unit.morale > 0,
  ).length;
  const result =
    state.winner === "ally"
      ? "아군 승리"
      : state.winner === "enemy"
        ? "전선 후퇴"
        : state.winner === "draw"
          ? "교착"
          : null;

  return (
    <div
      className={`army-battle-modal terrain-${battlefield.slug}`}
      role="dialog"
      aria-label={`${state.theme} 병력 자동전투`}
      style={
        {
          "--terrain-image": `url('${battlefield.asset}')`,
          "--terrain-accent": battlefield.accent,
        } as React.CSSProperties
      }
    >
      <div className="army-battle-shell">
        <header className="army-battle-head">
          <div>
            <small>TURN {state.turn} · MASS BATTLE SIMULATION</small>
            <h2>
              <i>{battlefield.hanja}</i>
              {state.theme} 병력전
            </h2>
          </div>
          <div className="battle-force-meter" aria-label="교전 병력 현황">
            <span>
              我 <b>{allyTroops.toLocaleString()}</b>
              <small>{allyUnits}개 부대</small>
            </span>
            <em>제 {state.tick}합</em>
            <span>
              敵 <b>{enemyTroops.toLocaleString()}</b>
              <small>{enemyUnits}개 부대</small>
            </span>
          </div>
          <div className="army-battle-controls">
            <button onClick={onToggleSpeed} aria-label="전투 속도 변경">
              ×{speed}
            </button>
            <button onClick={onSkip} disabled={Boolean(state.winner)}>
              결과까지
            </button>
          </div>
        </header>

        <div className="army-battle-body">
          <div className="army-battlefield">
            <div className="army-battlefield-image" aria-hidden="true" />
            <div className="army-battle-vignette" aria-hidden="true" />
            <div className="battle-rank enemy" aria-hidden="true">
              적군 진영
            </div>
            <div className="battle-rank ally" aria-hidden="true">
              아군 진영
            </div>
            <div className="battle-contact-line" aria-hidden="true">
              <span>交戰線</span>
            </div>

            <div className="battle-plan-badges">
              <span className="enemy">
                <i>{FORMATION_META[state.enemyFormation].hanja}</i>
                적 {FORMATION_META[state.enemyFormation].name} ·{" "}
                {TACTICS[state.enemyTactic].name}
              </span>
              <span className="ally">
                <i>{FORMATION_META[state.formation].hanja}</i>
                아군 {FORMATION_META[state.formation].name} ·{" "}
                {TACTICS[state.tactic].name}
              </span>
            </div>

            {state.units.map((unit) => {
              const ratio = Math.max(0, unit.troops / unit.maxTroops);
              const moraleRatio = Math.max(
                0,
                unit.morale / unit.maxMorale,
              );
              const commander = unit.commanderId
                ? HERO_BY_ID[unit.commanderId]
                : undefined;
              return (
                <div
                  key={unit.id}
                  className={[
                    "army-unit",
                    unit.side,
                    `is-${unit.action}`,
                    unit.troops <= 0 || unit.morale <= 0 ? "is-routed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={unitStyle(unit)}
                  aria-label={`${unit.side === "ally" ? "아군" : "적군"} ${
                    unit.name
                  } ${unit.troops}명 사기 ${unit.morale}`}
                >
                  {commander ? (
                    <div
                      className="unit-commander"
                      title={`${commander.name} 지휘`}
                      style={heroPortraitStyle(commander)}
                    >
                      <span>{commander.name}</span>
                    </div>
                  ) : null}
                  <SoldierFormation kind={unit.kind} ratio={ratio} />
                  <div className="army-unit-card">
                    <span className="troop-emblem">
                      {TROOP_META[unit.kind].hanja}
                    </span>
                    <b>{unit.name}</b>
                    <strong>{unit.troops.toLocaleString()}명</strong>
                    <div className="troop-bar">
                      <i style={{ width: `${ratio * 100}%` }} />
                    </div>
                    <div className="morale-bar">
                      <i style={{ width: `${moraleRatio * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {state.events
              .filter(
                (battleEvent) =>
                  battleEvent.type === "attack" ||
                  battleEvent.type === "commander" ||
                  battleEvent.type === "rout",
              )
              .map((battleEvent) => (
                <div
                  key={battleEvent.id}
                  className={`army-event-float event-${battleEvent.type}`}
                  style={eventStyle(battleEvent, state)}
                >
                  {battleEvent.type === "commander" ? "令" : ""}
                  {battleEvent.type === "rout"
                    ? "潰"
                    : battleEvent.amount
                      ? `-${battleEvent.amount}`
                      : ""}
                </div>
              ))}

            {result ? (
              <div className={`army-battle-result result-${state.winner}`}>
                <span>
                  {state.winner === "ally"
                    ? "勝"
                    : state.winner === "enemy"
                      ? "退"
                      : "衡"}
                </span>
                <small>TURN {state.turn} RESULT</small>
                <h3>{result}</h3>
                <p>
                  아군 잔존 {allyTroops.toLocaleString()}명 · 적군 잔존{" "}
                  {enemyTroops.toLocaleString()}명
                </p>
                <button onClick={onContinue}>군영으로 복귀</button>
              </div>
            ) : null}
          </div>

          <aside className="army-battle-log">
            <div className="log-heading">
              <span>戰況</span>
              <div>
                <small>LIVE BATTLE LOG</small>
                <b>전황 기록</b>
              </div>
            </div>
            <div className="terrain-current">
              <i>{battlefield.hanja}</i>
              <span>
                <small>현재 전장</small>
                <b>{battlefield.subtitle}</b>
              </span>
            </div>
            <ol>
              {[...state.log]
                .reverse()
                .slice(0, 12)
                .map((battleEvent) => (
                  <li key={battleEvent.id} className={battleEvent.tone}>
                    <span>
                      {battleEvent.type === "commander"
                        ? "令"
                        : battleEvent.type === "rout"
                          ? "潰"
                          : battleEvent.type === "move"
                            ? "進"
                            : "擊"}
                    </span>
                    <p>
                      <b>{battleEvent.label}</b>
                      {battleEvent.amount ? (
                        <small>{battleEvent.amount}명 손실</small>
                      ) : null}
                    </p>
                  </li>
                ))}
            </ol>
            <footer>
              <b>지형 판정</b>
              <p>
                고지·숲·진흙·수로의 공격, 방어, 사거리, 이동 보정이
                부대별로 매 행동 주기 계산됩니다.
              </p>
              <div className="terrain-legend-row">
                {Array.from(
                  new Set(state.units.map((unit) => unit.terrain)),
                )
                  .slice(0, 4)
                  .map((feature) => (
                    <span key={feature}>
                      <i>{TERRAIN_FEATURE_META[feature].mark}</i>
                      {feature}
                    </span>
                  ))}
              </div>
            </footer>
          </aside>
        </div>
      </div>
    </div>
  );
}

