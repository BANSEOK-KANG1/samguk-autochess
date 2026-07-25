import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "../app/combat-motion.css";

/** Desktop layout design size — stretched to fill the device screen. */
const DESIGN_WIDTH = 1180;
const DESIGN_HEIGHT = 720;

function readViewport() {
  const vv = window.visualViewport;
  const width = Math.max(
    1,
    Math.round(vv?.width ?? window.innerWidth ?? document.documentElement.clientWidth),
  );
  const height = Math.max(
    1,
    Math.round(vv?.height ?? window.innerHeight ?? document.documentElement.clientHeight),
  );
  return { width, height };
}

function applyFullscreenFit() {
  const { width, height } = readViewport();
  const scaleX = width / DESIGN_WIDTH;
  const scaleY = height / DESIGN_HEIGHT;
  const root = document.documentElement;
  root.style.setProperty("--app-scale-x", String(scaleX));
  root.style.setProperty("--app-scale-y", String(scaleY));
  root.style.setProperty("--app-vw", `${width}px`);
  root.style.setProperty("--app-vh", `${height}px`);
  root.style.setProperty("--app-scale", String(Math.min(scaleX, scaleY)));
}

function AndroidShell() {
  useEffect(() => {
    document.documentElement.classList.add("android-shell");
    applyFullscreenFit();

    const onResize = () => applyFullscreenFit();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);

    // Orientation / inset settle after first paint
    const timers = [0, 50, 150, 400, 1000].map((ms) =>
      window.setTimeout(onResize, ms),
    );

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <div className="android-stage">
      <div className="android-stage-inner">
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
