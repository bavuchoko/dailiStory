# 백업 기능 설정 가이드

Daily Story 앱의 클라우드 백업(내보내기/가져오기) 기능을 사용하려면 플랫폼별 설정이 필요합니다.

## iOS - iCloud

1. Xcode에서 `ios/dailyStory.xcworkspace` 열기
2. 프로젝트 타겟 선택 → **Signing & Capabilities**
3. **+ Capability** 클릭 → **iCloud** 추가
4. iCloud 서비스에서 **iCloud Documents** 체크
5. 컨테이너 추가: `iCloud.{번들ID}` (예: `iCloud.com.parkjongsu.dailyStory`)

설정 후 `pod install` 및 앱 재빌드가 필요합니다.

## Android - Google Drive

**앱 패키지 이름**: `com.dailyStory` (build.gradle의 applicationId와 동일해야 함)

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성 또는 선택
2. **API 및 서비스** → **라이브러리** → **Google Drive API** 검색 후 **사용 설정**
3. **OAuth 동의 화면** 설정: **API 및 서비스** → **OAuth 동의 화면**에서 사용자 유형(내부/외부) 선택 후 앱 이름 등 저장
4. **Android용 OAuth 클라이언트 ID** 만들기 (반드시 필요):
   - **사용자 인증 정보** → **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
   - 애플리케이션 유형: **Android**
   - 이름: 예) "Daily Story Android"
   - 패키지 이름: `com.dailyStory`
   - **SHA-1 인증서 지문** 입력 (아래 명령으로 확인):
     ```bash
     keytool -exportcert -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | openssl x509 -fingerprint -sha1 -noout
     ```
     출력에서 `=` 뒤의 `AA:BB:CC:DD:...` 값을 복사해 붙여넣기
     - ⚠️ 이 프로젝트는 `~/.android/debug.keystore`가 아니라 **프로젝트 내 `android/app/debug.keystore`**를 사용합니다. 반드시 이 keystore의 SHA-1을 등록해야 합니다.
   - 만들기
5. **웹 애플리케이션용 OAuth 클라이언트 ID** 만들기 (앱에서 사용할 ID):
   - 다시 **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 이름: 예) "Daily Story Web"
   - 만들기 후 **클라이언트 ID** 복사 (끝이 `...apps.googleusercontent.com` 형태)
6. `App.tsx`에서 **웹 클라이언트 ID**로 교체 (Android 클라이언트 ID가 아님):

```ts
GoogleSignin.configure({
  webClientId: '복사한_웹_클라이언트_ID.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/drive.appdata'],
});
```

7. 앱 재빌드 후 내보내기 다시 시도

### DEVELOPER_ERROR가 뜨는 경우

- **항상** 앱 설정과 Google Cloud Console 설정이 서로 맞지 않을 때 발생합니다.
- 다음을 확인하세요:
  1. **웹 클라이언트 ID**를 썼는지 (Android 클라이언트 ID가 아닌, **웹 애플리케이션** 타입 ID)
  2. **Android OAuth 클라이언트**에 패키지 이름 `com.dailyStory`와 **SHA-1 지문**이 정확히 등록되었는지
  3. ⚠️ 이 프로젝트는 **`android/app/debug.keystore`**를 사용합니다. `~/.android/debug.keystore`의 SHA-1이 아니라, 프로젝트 keystore의 SHA-1을 등록해야 합니다.
  3. **Google Drive API**가 해당 프로젝트에서 사용 설정되어 있는지
- 설정 점검이 필요하면 터미널에서 다음을 실행한 뒤 안내를 따르세요:
  ```bash
  npx @react-native-google-signin/config-doctor
  ```
- 상세 문서: [react-native-google-signin 트러블슈팅](https://react-native-google-signin.github.io/docs/troubleshooting)

## 동작 방식

- **iOS**: iCloud Documents에 `DailyStory/backup.json` 저장
- **Android**: Google Drive **앱 전용(App Data)** 폴더에 동일 경로로 저장
- 백업 파일에는 일기 메타데이터와 사진(base64)이 포함됩니다.

## Drive / iCloud에서 백업 파일이 안 보이는 이유

- **내보내기(클라우드)**로 저장한 백업은 **앱 전용 저장소(App Data)**에 들어갑니다.
- 이 영역은 사용자가 Drive 앱이나 drive.google.com에서 **목록으로 볼 수 없습니다**. (보안·앱 전용 설계)
- 따라서 **Drive 앱에 들어가도 백업 파일이 안 보이는 것이 정상**입니다. 가져오기는 앱 안에서만 가능합니다.

**백업이 정상인지 확인하는 방법**

1. **앱에서 "백업 확인"**  
   백업 메뉴 → **백업 확인** → 클라우드에 저장된 백업 정보(일기 개수, 내보낸 시각)를 확인할 수 있습니다.
2. **파일로 내보내기 후 확인**  
   **파일로 내보내기** → 공유 시트에서 Drive 등에 저장한 파일은 **내 드라이브**에 들어가므로 Drive 앱/웹에서 보입니다. 해당 JSON 파일을 열어 내용을 확인할 수 있습니다.

## 구글 드라이브에 따로 설정할 것 있나요?

- **없습니다.** Drive 앱이나 drive.google.com에서 별도 설정할 것은 없습니다.
- 앱이 **Google 로그인**만 하면, 백업은 앱 전용 공간(App Data)에 저장·조회됩니다.

## 가져오기 두 가지 구분

| 메뉴 | 의미 | 언제 쓰나요 |
|------|------|-------------|
| **가져오기** | 클라우드(앱 전용 폴더)에서 복원 | 앱에서 **내보내기**를 한 번이라도 했을 때만 데이터가 있음. 그걸 복원할 때 사용. |
| **파일에서 가져오기** | 내가 고른 파일에서 복원 | **파일로 내보내기** 후 Drive/내 파일에 저장해 둔 JSON 파일을 선택해서 복원할 때 사용. |

- Drive 앱에서 보이는 **그 백업 파일**을 복원하려면 → **파일에서 가져오기**를 누른 뒤, 해당 파일을 선택하세요.
- **가져오기**만 누르면 “클라우드(앱 전용)”에 있는 백업만 찾습니다. 거기에 없으면 "저장된 백업이 없습니다" 등으로 안내됩니다.
