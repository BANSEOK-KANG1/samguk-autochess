import type { ItemKind, ItemSlot } from "./item-data";
import { useId } from "react";

/**
 * 아이템 상점/장비용 스케치풍 SVG 아이콘.
 * Kenney sketch 톤(굵은 외곽선 + 단순 실루엣)에 맞춘 맞춤 디자인.
 */
export function ItemIcon({
  kind,
  slot,
  accent,
  size = 44,
}: {
  kind: ItemKind;
  slot: ItemSlot;
  accent?: string;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const stroke = accent ?? "#e8d5a3";
  const glowId = `item-glow-${kind}-${uid}`;
  return (
    <svg
      className={`item-icon item-icon-${slot} item-icon-${kind}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={glowId} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.55" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill={`url(#${glowId})`} />
      <g
        fill="none"
        stroke={stroke}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {iconPaths(kind)}
      </g>
    </svg>
  );
}

function iconPaths(kind: ItemKind) {
  switch (kind) {
    case "sword":
      return (
        <>
          <path d="M20 46 L42 18" />
          <path d="M38 16 L46 24" />
          <path d="M24 42 L20 46 L24 50" />
          <path d="M28 38 L34 44" />
        </>
      );
    case "bow":
      return (
        <>
          <path d="M18 16 C40 20, 40 44, 18 48" />
          <path d="M20 18 L20 46" />
          <path d="M22 32 L48 32" />
          <path d="M44 28 L50 32 L44 36" />
        </>
      );
    case "spear":
      return (
        <>
          <path d="M18 48 L46 16" />
          <path d="M42 14 L50 22" />
          <path d="M40 18 L46 24" />
          <path d="M20 44 L16 50" />
        </>
      );
    case "dagger":
      return (
        <>
          <path d="M24 44 L44 18" />
          <path d="M40 16 L48 24" />
          <path d="M28 40 L34 46" />
          <path d="M22 46 L20 50 L24 48" />
        </>
      );
    case "fan":
      return (
        <>
          <path d="M32 46 L14 24 C24 16, 40 16, 50 24 Z" />
          <path d="M32 46 L22 26" />
          <path d="M32 46 L32 22" />
          <path d="M32 46 L42 26" />
        </>
      );
    case "axe":
      return (
        <>
          <path d="M24 48 L40 20" />
          <path d="M34 18 C48 14, 52 28, 42 34 Z" />
          <path d="M22 46 L18 52" />
        </>
      );
    case "light":
      return (
        <>
          <path d="M20 22 L32 16 L44 22 L42 44 L32 50 L22 44 Z" />
          <path d="M32 18 L32 48" />
          <path d="M24 28 L40 28" />
        </>
      );
    case "heavy":
      return (
        <>
          <path d="M18 20 L32 14 L46 20 L44 46 L32 52 L20 46 Z" />
          <path d="M22 28 L42 28" />
          <path d="M22 36 L42 36" />
          <path d="M32 16 L32 50" />
        </>
      );
    case "robe":
      return (
        <>
          <path d="M24 16 L32 20 L40 16 L46 24 L42 50 L22 50 L18 24 Z" />
          <path d="M26 28 C32 34, 32 34, 38 28" />
          <path d="M32 22 L32 48" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M32 12 L48 20 L46 38 C44 48, 32 54, 32 54 C32 54, 20 48, 18 38 L16 20 Z" />
          <path d="M32 18 L32 48" />
          <path d="M22 28 L42 28" />
        </>
      );
    case "warhorse":
      return (
        <>
          <path d="M16 40 C20 28, 28 24, 36 26 L44 20 L48 26 L42 32 C48 36, 48 44, 42 48 L22 48 C16 46, 14 42, 16 40 Z" />
          <path d="M28 34 L34 30" />
          <path d="M24 48 L24 54" />
          <path d="M38 48 L38 54" />
        </>
      );
    case "charger":
      return (
        <>
          <path d="M14 42 C18 30, 28 24, 38 26 L48 18 L52 26 L44 34 C50 38, 50 46, 42 50 L20 50 C14 48, 12 44, 14 42 Z" />
          <path d="M40 22 L54 28" />
          <path d="M22 50 L22 56" />
          <path d="M36 50 L36 56" />
        </>
      );
    case "swift":
      return (
        <>
          <path d="M18 40 C22 28, 30 24, 38 26 L46 18 L50 24 L42 32 C48 34, 48 44, 40 48 L24 48 C18 46, 16 42, 18 40 Z" />
          <path d="M12 30 L22 34" />
          <path d="M12 36 L24 38" />
          <path d="M26 48 L26 54" />
          <path d="M38 48 L38 54" />
        </>
      );
    default:
      return <circle cx="32" cy="32" r="12" />;
  }
}
