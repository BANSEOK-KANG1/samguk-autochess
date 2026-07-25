import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.samguk.autochess",
  appName: "삼국지 오토체스",
  webDir: "android-www",
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b0c0b",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
