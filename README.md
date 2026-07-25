# 삼국지 오토체스 (Samguk Autochess)

삼국지 테마 오토체스 프로토타입입니다.  
웹(Vite) + **Android APK(Capacitor)** 로 플레이할 수 있습니다.

## APK 다운로드

최신 Android APK는 GitHub Releases에서 받으세요.

➡️ **[Releases / APK 다운로드](https://github.com/BANSEOK-KANG1/samguk-autochess/releases/latest)**

설치 시 “알 수 없는 앱” 허용이 필요할 수 있습니다. (debug 빌드)

최신: **v0.1.9** — contain 스케일(잘림 없음) · 화면별 세이프 마진

## 웹 실행

```bash
cd source
npm ci
npm run dev
```

## Android 다시 빌드

```bash
cd source
npm run android:sync
cd android && ./gradlew assembleDebug
```

자세한 내용: [`source/docs/ANDROID_APK_KO.md`](source/docs/ANDROID_APK_KO.md)

## 주요 기능

- 장수 상점 / 1→2→3성 합성
- 7×4 배치 · 7×8 위아래 자동전투
- 시너지 · 진법 · 지형 통로
- 원딜 / 힐러 / 버퍼 / 오라 직무
- 아이템(무기·방어구·탈것) 조합
- 필살기 게이지(공격·피격)
