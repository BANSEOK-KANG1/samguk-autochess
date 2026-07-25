# 삼국지 오토체스 — Android APK

이 프로젝트는 Capacitor로 **안드로이드 전용 APK**를 만듭니다.

## 한 번에 빌드

```bash
cd source
npm run android:sync
```

Android Studio에서 열기:

```bash
npm run android:open
```

Studio에서 **Build > Build Bundle(s) / APK(s) > Build APK(s)**  
또는 터미널:

```bash
cd android
./gradlew assembleDebug
```

생성 위치:

`source/android/app/build/outputs/apk/debug/app-debug.apk`

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run android:web` | 웹 클라이언트를 `android-www`로 빌드 |
| `npm run android:sync` | 웹 빌드 + Capacitor sync |
| `npm run android:open` | Android Studio 실행 |
| `npm run android:run` | 연결 기기/에뮬레이터에 실행 |
| `npm run dev:android` | 안드로이드용 웹 미리보기 (`:5174`) |

## 환경

- Node 22+
- Android Studio + SDK (`~/Library/Android/sdk`)
- JDK 17+ (Android Studio JBR 권장)

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

## 참고

- 앱은 **가로(landscape)** 고정입니다.
- 데스크톱 UI(1180×720)를 화면에 맞춰 스케일합니다.
- 대기석 선택 시 우측 패널만 스크롤되고 전체 화면 높이는 고정됩니다.
