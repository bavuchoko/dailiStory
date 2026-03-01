# Android 앱 출시 가이드 (릴리즈 빌드)

Play Store에 앱을 올리거나, 실제 사용자에게 배포할 때 필요한 설정입니다.

---

## 1. 왜 필요한가?

- **개발 중**: `debug.keystore`로 앱에 서명 → Google 로그인은 이 keystore의 SHA-1으로 동작
- **출시용**: 별도의 **릴리즈 keystore**로 서명 → 이 keystore의 SHA-1도 Google Cloud에 등록해야 로그인이 됨

서명이 다르면 앱이 다른 앱으로 인식되므로, 출시용 keystore의 SHA-1을 추가로 등록해야 합니다.

---

## 2. 릴리즈 keystore 만들기 (한 번만)

터미널에서 프로젝트 폴더로 이동한 뒤 실행:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias dailyStory -keyalg RSA -keysize 2048 -validity 10000
```

- 비밀번호 입력 (잊지 말고 안전한 곳에 보관)
- 이름, 조직 등 질문에 답변
- `release.keystore` 파일이 생성됨

⚠️ **주의**: 이 파일과 비밀번호를 잃어버리면 앱 업데이트가 불가능합니다. 반드시 백업해 두세요.

---

## 3. 릴리즈 keystore의 SHA-1 확인

```bash
keytool -exportcert -keystore android/app/release.keystore -alias dailyStory -storepass [비밀번호] -keypass [비밀번호] 2>/dev/null | openssl x509 -fingerprint -sha1 -noout
```

출력 예: `SHA1 Fingerprint=AA:BB:CC:DD:EE:FF:...`  
→ `=` 뒤의 `AA:BB:CC:DD:EE:FF:...` 값을 복사합니다.

---

## 4. Google Cloud Console에 SHA-1 추가

1. [Google Cloud Console](https://console.cloud.google.com/) → **사용자 인증 정보**
2. **Daily Story Android** OAuth 클라이언트 클릭
3. **SHA-1 인증서 지문**에 위에서 복사한 값을 **추가** (기존 디버그 SHA-1은 그대로 두고, 새로 추가)
4. **저장**

---

## 5. build.gradle에 릴리즈 서명 설정

`android/app/build.gradle`에서 `signingConfigs`와 `release`를 아래처럼 수정합니다.

**수정 전:**
```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        ...
    }
}
...
release {
    signingConfig signingConfigs.debug  // ← 이건 디버그 keystore 사용 중
    ...
}
```

**수정 후:**
```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file('release.keystore')
        storePassword '여기에_비밀번호'
        keyAlias 'dailyStory'
        keyPassword '여기에_비밀번호'
    }
}
...
release {
    signingConfig signingConfigs.release  // ← 릴리즈 keystore 사용
    minifyEnabled enableProguardInReleaseBuilds
    proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
}
```

⚠️ **보안**:
- `release.keystore`와 비밀번호는 절대 Git에 커밋하지 마세요. `.gitignore`에 `*.keystore` 추가 권장.
- 비밀번호를 코드에 직접 넣지 않으려면 `gradle.properties`에 변수로 넣고 `build.gradle`에서 참조하는 방법이 있습니다. (선택)

---

## 6. 릴리즈 빌드 생성

```bash
cd android
./gradlew assemblePlayRelease
```

생성된 APK 경로: `android/app/build/outputs/apk/play/release/app-play-release.apk`

---

## 7. Play Store에 올릴 때 (추가)

Google Play Console에서 **앱 서명**을 사용하면, Google이 앱을 다시 서명합니다.  
이때 **앱 서명 키 인증서**의 SHA-1이 생깁니다.

1. Play Console → 앱 선택 → **설정** → **앱 무결성**
2. **앱 서명 키 인증서**의 SHA-1 복사
3. Google Cloud Console → **Daily Story Android** → SHA-1에 **추가로 등록**

---

## 요약 체크리스트

| 항목 | 작업 |
|------|------|
| 1 | `release.keystore` 생성 |
| 2 | 릴리즈 keystore의 SHA-1 확인 |
| 3 | Google Cloud Console → Android OAuth 클라이언트에 SHA-1 추가 |
| 4 | `build.gradle`에 `signingConfigs.release` 추가 |
| 5 | `release` 빌드 타입이 `signingConfigs.release` 사용하도록 변경 |
| 6 | Play Store 사용 시: 앱 서명 키 SHA-1도 추가 |
