/**
 * Android WebView(APK) 셸에서 실행 중인지 여부.
 * android-entry가 <html>에 android-shell 클래스를 붙인다.
 * 라이트 모드: 무거운 장식 DOM·VFX를 건너뛰어 프레임을 확보한다.
 */
export const isLiteShell = () =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("android-shell");
