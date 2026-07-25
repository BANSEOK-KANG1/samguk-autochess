import { StrictMode, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "../app/combat-motion.css";

/** Desktop layout design size — stretched to fill the device screen. */
const DESIGN_WIDTH = 1180;
const DESIGN_HEIGHT = 720;

type Fit = { scaleX: number; scaleY: number; width: number; height: number };

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

function computeFit(): Fit {
  const { width, height } = readViewport();
  return {
    width,
    height,
    scaleX: width / DESIGN_WIDTH,
    scaleY: height / DESIGN_HEIGHT,
  };
}

function applyFitCss(fit: Fit) {
  const root = document.documentElement;
  root.classList.add("android-shell");
  root.style.setProperty("--app-scale-x", String(fit.scaleX));
  root.style.setProperty("--app-scale-y", String(fit.scaleY));
  root.style.setProperty("--app-vw", `${fit.width}px`);
  root.style.setProperty("--app-vh", `${fit.height}px`);
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
          transform: `scale(${fit.scaleX}, ${fit.scaleY})`,
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
