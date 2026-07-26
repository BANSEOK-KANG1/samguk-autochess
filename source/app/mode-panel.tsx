"use client";

import {
  AI_RIVAL_OPTIONS,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  GAME_MODES,
  TACTICS,
  TACTIC_ORDER,
  type AiRivalCount,
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
  aiCount,
  tactic,
  formation,
  rankPoints,
  onModeChange,
  onDifficultyChange,
  onAiCountChange,
  onTacticChange,
  onFormationChange,
  onClose,
}: {
  mode: GameMode;
  difficulty: DifficultyId;
  aiCount: AiRivalCount;
  tactic: TacticId;
  formation: FormationId;
  rankPoints: number;
  onModeChange: (mode: GameMode) => void;
  onDifficultyChange: (difficulty: DifficultyId) => void;
  onAiCountChange: (count: AiRivalCount) => void;
  onTacticChange: (tactic: TacticId) => void;
  onFormationChange: (formation: FormationId) => void;
  onClose: () => void;
}) {
  const selectedTactic = TACTICS[tactic];
  const selectedFormation = FORMATIONS[formation];
  const showCampaignRules = mode === "single" || mode === "versus";

  return (
    <div
      className="mode-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="출진 준비"
    >
      <div className="mode-panel">
        <header className="mode-panel-head">
          <div>
            <small>군영 막사 · 출진 준비</small>
            <h2>어떻게 싸울까요?</h2>
            <p>혼자 원정을 떠나거나, 맞수들과 한판 겨뤄 보세요.</p>
          </div>
          <button onClick={onClose} aria-label="출진 준비 닫기">×</button>
        </header>

        <section className="mode-section">
          <div className="mode-section-title">
            <span>1</span>
            <div><b>놀이 방식</b><small>목표와 상대를 고릅니다</small></div>
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
                    <em>예상 {item.estimatedMinutes}</em>
                  </span>
                  {modeId === "versus" && <em>군웅 점수 {rankPoints}</em>}
                </button>
              );
            })}
          </div>
        </section>

        {showCampaignRules && (
          <section className="mode-section">
            <div className="mode-section-title">
              <span>2</span>
              <div>
                <b>맞수 수</b>
                <small>당신 포함 최대 4인 · 빈자리는 AI가 채웁니다</small>
              </div>
            </div>
            <div className="difficulty-grid ai-rival-grid">
              {AI_RIVAL_OPTIONS.map((option) => (
                <button
                  className={aiCount === option.count ? "selected" : ""}
                  key={option.count}
                  onClick={() => onAiCountChange(option.count)}
                  aria-pressed={aiCount === option.count}
                >
                  <i>{option.seats}</i>
                  <strong>{option.label}</strong>
                  <span>총 {option.seats}인</span>
                  <p>{option.blurb}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className={`mode-section difficulty-section ${mode === "practice" ? "is-locked" : ""}`}>
          <div className="mode-section-title">
            <span>{showCampaignRules ? "3" : "2"}</span>
            <div>
              <b>{mode === "practice" ? "연습 규칙" : "난이도"}</b>
              <small>
                {mode === "practice"
                  ? "저장 없는 가벼운 연습"
                  : "적 성장과 승리 보상"}
              </small>
            </div>
          </div>
          {mode === "practice" ? (
            <div className="versus-rule">
              <b>연습 전투</b>
              <span>한 판 저장·탈락 없이 AI 한 팀과만 겨룹니다.</span>
              <small>긴 원정은 「난세 원정」이나 「군웅 점수전」에서 이어 가세요.</small>
            </div>
          ) : (
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
          )}
        </section>

        <section className="mode-section">
          <div className="mode-section-title">
            <span>{showCampaignRules ? "4" : "3"}</span>
            <div><b>싸움 방식</b><small>역할에 맞춘 전투 보정</small></div>
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
            <span>{showCampaignRules ? "5" : "4"}</span>
            <div>
              <b>진법</b>
              <small>유효 칸에 장수를 올려 2·4·6명 단계 활성화</small>
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
          <div>
            <span>지금 준비</span>
            <b>
              {GAME_MODES[mode].label}
              {showCampaignRules
                ? ` · ${DIFFICULTIES[difficulty].label} · 맞수 ${aiCount}`
                : ""}
              {" · "}
              {selectedTactic.label} · {selectedFormation.label}
            </b>
          </div>
          <button onClick={onClose}>이대로 출진</button>
        </footer>
      </div>
    </div>
  );
}
