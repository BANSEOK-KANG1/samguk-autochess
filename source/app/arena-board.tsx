"use client";

import { FACTION_COLOR, HERO_BY_ID, type Hero } from "./game-data";
import { ROLE_ARCHETYPES } from "./combat-config";
import { combatIdentityFor } from "./hero-combat-identity";

/**
 * 사막 타일맵 프로토타입에서 장수 아트 대신 쓰는 진영·역할 토큰.
 * prep(배치) / combat(전투) 공용. 사실적 3D 아트를 끄고, 진영 색 원판 +
 * 역할 글리프 + 성급 + 짧은 이름으로 한눈에 읽히게 한다.
 */
export function ArenaToken({
  hero,
  star,
  variant,
  hpPercent,
  compact = false,
}: {
  hero: Hero;
  star: number;
  variant: "prep" | "combat";
  hpPercent?: number;
  compact?: boolean;
}) {
  const role = ROLE_ARCHETYPES[hero.role];
  const identity = combatIdentityFor(hero.id, hero.role);
  return (
    <span
      className={`arena-token arena-token-${variant} role-${hero.role} ${compact ? "is-compact" : ""}`}
      style={
        {
          "--faction": FACTION_COLOR[hero.faction],
          "--signature": identity.color,
        } as React.CSSProperties
      }
    >
      <span className="arena-token-disc">
        <i className="arena-token-glyph">{role.glyph}</i>
        <b className="arena-token-faction">{hero.faction}</b>
      </span>
      <span className="arena-token-stars" aria-hidden="true">
        {"◆".repeat(Math.max(1, star))}
      </span>
      <span className="arena-token-name">{hero.name}</span>
      {variant === "combat" && typeof hpPercent === "number" && (
        <span className="arena-token-hp">
          <i style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }} />
        </span>
      )}
    </span>
  );
}

/** heroId 편의 래퍼. */
export function ArenaTokenById({
  heroId,
  star,
  variant,
  hpPercent,
  compact,
}: {
  heroId: string;
  star: number;
  variant: "prep" | "combat";
  hpPercent?: number;
  compact?: boolean;
}) {
  const hero = HERO_BY_ID[heroId];
  if (!hero) return null;
  return (
    <ArenaToken
      hero={hero}
      star={star}
      variant={variant}
      hpPercent={hpPercent}
      compact={compact}
    />
  );
}
