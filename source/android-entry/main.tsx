import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "../app/combat-motion.css";

const DESIGN_WIDTH = 1180;
const DESIGN_HEIGHT = 720;

function AndroidShell() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    document.documentElement.classList.add("android-shell");
    const fit = () => {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      const next = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
      const safe = Number.isFinite(next) && next > 0 ? next : 1;
      setScale(safe);
      document.documentElement.style.setProperty("--app-scale", String(safe));
      document.documentElement.style.setProperty(
        "--app-shell-width",
        `${Math.round(DESIGN_WIDTH * safe)}px`,
      );
      document.documentElement.style.setProperty(
        "--app-shell-height",
        `${Math.round(DESIGN_HEIGHT * safe)}px`,
      );
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    window.visualViewport?.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("scroll", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("scroll", fit);
    };
  }, []);

  return (
    <div className="android-stage">
      <div
        className="android-stage-frame"
        style={{
          width: DESIGN_WIDTH * scale,
          height: DESIGN_HEIGHT * scale,
        }}
      >
        <div
          className="android-stage-inner"
          style={{ transform: `scale(${scale})` }}
        >
          <Home />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AndroidShell />
  </StrictMode>,
);
