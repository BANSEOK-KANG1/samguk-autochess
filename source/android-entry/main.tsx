import { StrictMode, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "../app/combat-motion.css";

/** Fixed design canvas — scaled uniformly to fit inside the device screen. */
const DESIGN_WIDTH = 1180;
const DESIGN_HEIGHT = 720;

type Fit = {
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

function readViewport(): { width: number; height: number } {
  const vv = window.visualViewport;
  const width = Math.max(
    1,
    Math.round(
      vv?.width ||
        window.innerWidth ||
        document.documentElement.clientWidth ||
        screen.width,
    ),
  );
  const height = Math.max(
    1,
    Math.round(
      vv?.height ||
        window.innerHeight ||
        document.documentElement.clientHeight ||
        screen.height,
    ),
  );
  return { width, height };
}

/** Keep a thin safe margin so UI never sits under notches / rounded corners. */
function safePad(width: number, height: number) {
  return {
    x: Math.max(6, Math.round(width * 0.01)),
    y: Math.max(6, Math.round(height * 0.018)),
  };
}

function computeFit(): Fit {
  const { width, height } = readViewport();
  const pad = safePad(width, height);
  const availW = Math.max(1, width - pad.x * 2);
  const availH = Math.max(1, height - pad.y * 2);
  // Contain: entire UI visible, no edge clipping (letterbox if needed).
  const scale = Math.min(availW / DESIGN_WIDTH, availH / DESIGN_HEIGHT);
  const drawnW = DESIGN_WIDTH * scale;
  const drawnH = DESIGN_HEIGHT * scale;
  return {
    width,
    height,
    scaleX: scale,
    scaleY: scale,
    offsetX: Math.round((width - drawnW) / 2),
    offsetY: Math.round((height - drawnH) / 2),
  };
}

function applyFitCss(fit: Fit) {
  const root = document.documentElement;
  root.classList.add("android-shell");
  root.style.setProperty("--app-scale-x", String(fit.scaleX));
  root.style.setProperty("--app-scale-y", String(fit.scaleY));
  root.style.setProperty("--app-vw", `${fit.width}px`);
  root.style.setProperty("--app-vh", `${fit.height}px`);
  root.style.setProperty("--app-offset-x", `${fit.offsetX}px`);
  root.style.setProperty("--app-offset-y", `${fit.offsetY}px`);
  root.style.width = "100%";
  root.style.height = "100%";
  if (document.body) {
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
  }
}

// Apply before first React paint so the board never flashes at 1× scale.
applyFitCss(computeFit());

function AndroidShell() {
  const [fit, setFit] = useState<Fit>(() => computeFit());

  useLayoutEffect(() => {
    const sync = () => {
      const next = computeFit();
      applyFitCss(next);
      setFit(next);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    const timers = [0, 32, 100, 250, 600, 1200, 2000].map((ms) =>
      window.setTimeout(sync, ms),
    );
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <div
      className="android-stage"
      style={{ width: fit.width, height: fit.height }}
    >
      <div
        className="android-stage-inner"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scaleX}, ${fit.scaleY})`,
          transformOrigin: "0 0",
        }}
      >
        <Home />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AndroidShell />
  </StrictMode>,
);
