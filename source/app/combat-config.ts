import type { Role } from "./game-data";

export type GameMode = "single" | "versus";
export type DifficultyId = "normal" | "heroic" | "legendary";
export type TacticId = "assault" | "fortress" | "volley" | "sustain";
export type CombatArchetype =
  | "dealer"
  | "tank"
  | "healer"
  | "tactician"
  | "buffer"
  | "support";

export const GAME_MODES: Record<
  GameMode,
  {
    label: string;
    hanja: string;
    eyebrow: string;
    description: string;
  }
> = {
  single: {
    label: "싱글 원정",
    hanja: "원정",
    eyebrow: "PVE CAMPAIGN",
    description: "난이도에 맞춰 적의 성장률과 보상을 정하고 토벌전을 이어갑니다.",
  },
  versus: {
    label: "군웅 대전",
    hanja: "대전",
    eyebrow: "AI VERSUS PRESEASON",
    description: "동일 레벨의 경쟁 진형과 겨루며 승패에 따라 군웅 점수가 오르내립니다.",
  },
};

export const DIFFICULTIES: Record<
  DifficultyId,
  {
    label: string;
    hanja: string;
    enemyScale: number;
    rewardMultiplier: number;
    description: string;
    tone: string;
  }
> = {
  normal: {
    label: "일반",
    hanja: "일반",
    enemyScale: 0.9,
    rewardMultiplier: 1,
    description: "지형과 배치의 기본 상성을 익히는 안정적인 원정입니다.",
    tone: "#7e9f78",
  },
  heroic: {
    label: "영웅",
    hanja: "영웅",
    enemyScale: 1.08,
    rewardMultiplier: 1.25,
    description: "적 능력치가 상승하고 전술 대응이 중요해집니다.",
    tone: "#c49a55",
  },
  legendary: {
    label: "전설",
    hanja: "전설",
    enemyScale: 1.24,
    rewardMultiplier: 1.5,
    description: "적 선봉이 2성으로 출전합니다. 정교한 역할 조합이 필요합니다.",
    tone: "#b85a4e",
  },
};

export const TACTICS: Record<
  TacticId,
  {
    label: string;
    hanja: string;
    description: string;
    bonus: string;
    risk: string;
    favoredRoles: Role[];
    color: string;
  }
> = {
  assault: {
    label: "돌파 전술",
    hanja: "돌파",
    description: "선봉이 빠르게 거리를 좁혀 적 후열을 흔듭니다.",
    bonus: "용장·기병·암살 공격 +15%",
    risk: "해당 병과 방어 -4%",
    favoredRoles: ["용장", "기병", "암살"],
    color: "#c7614f",
  },
  fortress: {
    label: "철벽 전술",
    hanja: "철벽",
    description: "전열이 버티는 동안 후열이 안정적으로 기력을 모읍니다.",
    bonus: "수호·군주 체력·방어 상승",
    risk: "해당 병과 공격 -3%",
    favoredRoles: ["수호", "군주"],
    color: "#6d98ad",
  },
  volley: {
    label: "집중 포화",
    hanja: "포화",
    description: "원거리 장수가 선제 공격으로 한 대상을 빠르게 정리합니다.",
    bonus: "궁수·책사 공격 +14%·기력 +18",
    risk: "해당 병과 방어 -3%",
    favoredRoles: ["궁수", "책사"],
    color: "#a77bc4",
  },
  sustain: {
    label: "지구 전술",
    hanja: "지구",
    description: "회복과 지휘 스킬을 먼저 가동해 장기전 우위를 만듭니다.",
    bonus: "지원·군주 체력 +8%·기력 +22",
    risk: "순간 화력은 낮음",
    favoredRoles: ["지원", "군주"],
    color: "#77a86e",
  },
};

export const TACTIC_ORDER = Object.keys(TACTICS) as TacticId[];
export const DIFFICULTY_ORDER = Object.keys(DIFFICULTIES) as DifficultyId[];

export const ROLE_ARCHETYPES: Record<
  Role,
  {
    id: CombatArchetype;
    label: string;
    glyph: string;
    motion: "melee" | "ranged" | "magic" | "support" | "guard";
  }
> = {
  군주: { id: "tactician", label: "지휘관", glyph: "군", motion: "magic" },
  용장: { id: "dealer", label: "근접 딜러", glyph: "용", motion: "melee" },
  수호: { id: "tank", label: "탱커", glyph: "수", motion: "guard" },
  책사: { id: "tactician", label: "책략 딜러", glyph: "책", motion: "magic" },
  궁수: { id: "dealer", label: "원거리 딜러", glyph: "궁", motion: "ranged" },
  기병: { id: "dealer", label: "돌격 딜러", glyph: "기", motion: "melee" },
  암살: { id: "dealer", label: "암살 딜러", glyph: "암", motion: "melee" },
  지원: { id: "support", label: "서포터", glyph: "지", motion: "support" },
};

export const enemyTacticForSeed = (seed: number) =>
  TACTIC_ORDER[Math.abs(seed) % TACTIC_ORDER.length];

