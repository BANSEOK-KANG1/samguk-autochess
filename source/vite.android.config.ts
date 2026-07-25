import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const entryDir = path.join(rootDir, "android-entry");

/** Android APK용 클라이언트 전용 빌드 (Capacitor webDir) */
export default defineConfig({
  root: entryDir,
  base: "./",
  publicDir: path.join(rootDir, "public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(rootDir, "app"),
    },
  },
  build: {
    outDir: path.join(rootDir, "android-www"),
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
  },
  server: {
    host: "0.0.0.0",
    port: 5174,
  },
});
