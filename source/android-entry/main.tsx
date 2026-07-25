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
      const next = Math.min(
        window.innerWidth / DESIGN_WIDTH,
        window.innerHeight / DESIGN_HEIGHT,
      );
      setScale(next);
      document.documentElement.style.setProperty("--app-scale", String(next));
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, []);

  return (
    <div className="android-stage">
      <div
        className="android-stage-inner"
        style={{ "--app-scale": scale } as React.CSSProperties}
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
