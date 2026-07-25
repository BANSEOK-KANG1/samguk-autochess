"use client";

import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  GAME_MODES,
  TACTICS,
  TACTIC_ORDER,
  type DifficultyId,
  type GameMode,
  type TacticId,
} from "./combat-config";
import {
  FORMATIONS,
  FORMATION_ORDER,
  type FormationId,
} from "./formation-config";

function FormationMiniMap({ formationId }: { formationId: FormationId }) {
  const formation = FORMATIONS[formationId];
  return (
    <span className="formation-mini-map" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <i
          className={`${formation.cells.includes(index) ? "active" : ""} ${
            formation.coreCells.includes(index) ? "core" : ""
          }`}
          key={index}
        />
      ))}
    </span>
  );
}

export function ModePanel({
  mode,
  difficulty,
  tactic,
  formation,
  rankPoints,
  onModeChange,
  onDifficultyChange,
  onTacticChange,
  onFormationChange,
  onClose,
}: {
  mode: GameMode;
  difficulty: DifficultyId;
  tactic: TacticId;
  formation: FormationId;
  rankPoints: number;
  onModeChange: (mode: GameMode) => void;
  onDifficultyChange: (difficulty: DifficultyId) => void;
  onTacticChange: (tactic: TacticId) => void;
  onFormationChange: (formation: FormationId) => void;
  onClose: () => void;
}) {
  const selectedTactic = TACTICS[tactic];
  const selectedFormation = FORMATIONS[formation];

  return (
    <div
      className="mode-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="전쟁 방식과 전술 설정"
    >
      <div className="mode-panel">
        <header className="mode-panel-head">
          <div>
            <small>전쟁 본부 · 출전 설정</small>
            <h2>전쟁 방식과 출전 전술</h2>
            <p>전투 전에 상대의 성장 규칙과 우리 진형의 행동 방향을 결정합니다.</p>
          </div>
          <button onClick={onClose} aria-label="전쟁 방식 설정 닫기">×</button>
        </header>

        <section className="mode-section">
          <div className="mode-section-title">
            <span>1</span>
            <div><b>전쟁 방식</b><small>플레이 목표와 상대 규칙</small></div>
          </div>
          <div className="mode-choice-grid">
            {(Object.keys(GAME_MODES) as GameMode[]).map((modeId) => {
              const item = GAME_MODES[modeId];
              return (
                <button
                  className={mode === modeId ? "selected" : ""}
                  key={modeId}
                  onClick={() => onModeChange(modeId)}
                  aria-pressed={mode === modeId}
                >
                  <i>{item.hanja}</i>
                  <span>
                    <small>{item.eyebrow}</small>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                  </span>
                  {modeId === "versus" && <em>군웅 점수 {rankPoints}</em>}
                </button>
              );
            })}
          </div>
        </section>

        <section className={`mode-section difficulty-section ${mode === "versus" ? "is-locked" : ""}`}>
          <div className="mode-section-title">
            <span>2</span>
            <div>
              <b>{mode === "single" ? "원정 난이도" : "대전 매칭 규칙"}</b>
              <small>{mode === "single" ? "적 성장률과 승리 보상" : "동일 레벨 경쟁 진형 자동 매칭"}</small>
            </div>
          </div>
          {mode === "single" ? (
            <div className="difficulty-grid">
              {DIFFICULTY_ORDER.map((difficultyId) => {
                const item = DIFFICULTIES[difficultyId];
                return (
                  <button
                    className={difficulty === difficultyId ? "selected" : ""}
                    style={{ "--difficulty": item.tone } as React.CSSProperties}
                    key={difficultyId}
                    onClick={() => onDifficultyChange(difficultyId)}
                    aria-pressed={difficulty === difficultyId}
                  >
                    <i>{item.hanja}</i>
                    <strong>{item.label}</strong>
                    <span>적 전력 ×{item.enemyScale.toFixed(2)}</span>
                    <span>보상 ×{item.rewardMultiplier.toFixed(2)}</span>
                    <p>{item.description}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="versus-rule">
              <b>AI 대전 프리시즌</b>
              <span>연승할수록 강한 경쟁 진형이 등장하고 승리 +26 · 무승부 +2 · 패배 -18점</span>
              <small>실시간 이용자 매칭은 계정·서버 단계에서 확장할 수 있도록 전투 규칙을 분리했습니다.</small>
            </div>
          )}
        </section>

        <section className="mode-section">
          <div className="mode-section-title">
            <span>3</span>
            <div><b>출전 전술</b><small>내 역할 구성에 맞춘 전투 보정</small></div>
          </div>
          <div className="tactic-grid">
            {TACTIC_ORDER.map((tacticId) => {
              const item = TACTICS[tacticId];
              return (
                <button
                  className={tactic === tacticId ? "selected" : ""}
                  style={{ "--tactic": item.color } as React.CSSProperties}
                  key={tacticId}
                  onClick={() => onTacticChange(tacticId)}
                  aria-pressed={tactic === tacticId}
                >
                  <i>{item.hanja}</i>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.bonus}</small>
                    <em>{item.risk}</em>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="tactic-readout" style={{ "--tactic": selectedTactic.color } as React.CSSProperties}>
            <i>{selectedTactic.hanja}</i>
            <span>
              <small>선택한 전술</small>
              <strong>{selectedTactic.label}</strong>
              <p>{selectedTactic.description}</p>
            </span>
            <b>{selectedTactic.favoredRoles.join(" · ")}</b>
          </div>
        </section>

        <section className="mode-section formation-section">
          <div className="mode-section-title">
            <span>4</span>
            <div>
              <b>출전 진법</b>
              <small>유효 칸에 장수를 배치해 2·4·6명 단계 활성화</small>
            </div>
          </div>
          <div className="formation-choice-grid">
            {FORMATION_ORDER.map((formationId) => {
              const item = FORMATIONS[formationId];
              return (
                <button
                  className={formation === formationId ? "selected" : ""}
                  style={{ "--formation": item.color } as React.CSSProperties}
                  key={formationId}
                  onClick={() => onFormationChange(formationId)}
                  aria-pressed={formation === formationId}
                >
                  <span className="formation-choice-copy">
                    <i>{item.hanja}</i>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.subtitle}</small>
                    </span>
                  </span>
                  <FormationMiniMap formationId={formationId} />
                  <p>{item.description}</p>
                  <em>{item.favoredRoles.join(" · ")}</em>
                </button>
              );
            })}
          </div>
          <div
            className="formation-readout"
            style={{ "--formation": selectedFormation.color } as React.CSSProperties}
          >
            <i>{selectedFormation.hanja}</i>
            <span>
              <small>선택한 진법</small>
              <strong>{selectedFormation.label} · {selectedFormation.subtitle}</strong>
              <p>{selectedFormation.tierLabels[2]}</p>
            </span>
            <b>가담 {selectedFormation.tiers.join(" / ")}명</b>
          </div>
        </section>

        <footer className="mode-panel-foot">
          <div><span>현재 출전안</span><b>{GAME_MODES[mode].label} · {mode === "single" ? DIFFICULTIES[difficulty].label : `군웅 ${rankPoints}`} · {selectedTactic.label} · {selectedFormation.label}</b></div>
          <button onClick={onClose}>출전안 적용</button>
        </footer>
      </div>
    </div>
  );
}
