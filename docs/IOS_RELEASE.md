# iOS 앱 출시 가이드 (처음부터 배포까지)

앱 개발만 해본 초보자를 위한, iOS 앱을 TestFlight 테스트 → App Store 출시까지 단계별 가이드입니다.

---

## 사전 준비 (이미 있으면 건너뛰기)

- [ ] **Apple Developer Program** 가입 ($99/년) — [developer.apple.com](https://developer.apple.com)
- [ ] **Xcode** 설치 (Mac App Store)
- [ ] **iPhone** (실기기 테스트용, 시뮬레이터만 있어도 Archive는 가능)

---

## 전체 흐름 요약

```
1. App Store Connect 앱 등록
2. Xcode 서명 설정
3. Archive → 업로드
4. TestFlight 내부 테스트
5. (테스트 OK) App Store 제출 → 심사 → 출시
```

---

## 1단계: App Store Connect에서 앱 등록

### 1-1. 접속

1. [App Store Connect](https://appstoreconnect.apple.com/) 접속
2. Apple ID로 로그인 (Developer Program 가입한 계정)

### 1-2. 새 앱 만들기

1. **앱** 메뉴 클릭
2. **+** 버튼 → **새 앱**
3. 아래 정보 입력:

| 항목 | 입력값 |
|------|--------|
| 플랫폼 | iOS |
| 이름 | dailyStory (또는 원하는 앱 이름) |
| 기본 언어 | 한국어 |
| 번들 ID | `com.parkjongsu.dailyStory` (Xcode와 동일해야 함) |
| SKU | `dailystory001` (내부용, 아무 값이나 가능) |
| 사용자 접근 | 전체 접근 |

4. **만들기** 클릭

---

## 2단계: Xcode 서명 설정

### 2-1. 프로젝트 열기

1. **Xcode** 실행
2. **File** → **Open** → `ios/dailyStory.xcworkspace` 선택  
   ⚠️ `.xcodeproj`가 아니라 **`.xcworkspace`**를 열어야 합니다.

### 2-2. 서명 설정

1. 왼쪽 프로젝트 네비게이터에서 **dailyStory** (파란 아이콘) 클릭
2. **TARGETS** → **dailyStory** 선택
3. **Signing & Capabilities** 탭 클릭
4. 다음 확인/설정:

| 항목 | 설정 |
|------|------|
| **Automatically manage signing** | ✅ 체크 |
| **Team** | 본인 Apple Developer 계정 선택 (Jongsu Park 등) |
| **Bundle Identifier** | `com.parkjongsu.dailyStory` |

5. Team을 선택하면 Xcode가 자동으로 인증서·프로비저닝 프로파일 생성

### 2-3. 오류가 나올 때

- **"No signing certificate"** → Team 선택 후 잠시 대기, 또는 Xcode 메뉴 **Xcode** → **Settings** → **Accounts**에서 Apple ID 로그인 확인
- **"No devices"** → 실기기 테스트용. TestFlight만 할 거면 시뮬레이터로 Archive 가능 (Any iOS Device 선택)

---

## 3단계: Archive (배포용 빌드 만들기)

### 3-1. 실행 대상 선택

1. Xcode 상단 **실행 대상** 드롭다운 클릭
2. **Any iOS Device (arm64)** 선택  
   ⚠️ 시뮬레이터가 아닌 **Any iOS Device**여야 합니다.

### 3-2. Archive 실행

1. 메뉴 **Product** → **Archive**
2. 빌드 완료까지 대기 (2~5분)
3. 완료되면 **Organizer** 창이 자동으로 열림

### 3-3. Archive가 안 될 때

- **"Archive" 메뉴가 비활성화** → 실행 대상을 **Any iOS Device**로 바꿨는지 확인
- **서명 오류** → 2단계 서명 설정 다시 확인

---

## 4단계: App Store Connect에 업로드

### 4-1. Distribute App

1. Organizer 창에서 방금 만든 **Archive** 선택
2. **Distribute App** 버튼 클릭

### 4-2. 업로드 옵션 선택

1. **App Store Connect** 선택 → **Next**
2. **Upload** 선택 → **Next**
3. 옵션은 기본값 유지 (체크해제된 것들 그대로) → **Next**
4. **Upload** 클릭

### 4-3. 업로드 완료

1. 업로드가 끝나면 **Done** 클릭
2. App Store Connect에서 빌드가 **처리 중**으로 표시됨 (10~30분 소요)

---

## 5단계: TestFlight 내부 테스트

### 5-1. 빌드 확인

1. [App Store Connect](https://appstoreconnect.apple.com/) → **앱** → **dailyStory**
2. **TestFlight** 탭 클릭
3. **빌드** 섹션에서 업로드한 빌드가 **"처리 완료"** 될 때까지 대기

### 5-2. 내부 테스터 추가

1. 왼쪽 **테스터** → **내부 테스팅** 클릭
2. **+** 버튼 → **테스터 추가**
3. App Store Connect 팀 멤버 이메일 선택 (본인 이메일 포함)
4. **추가** 클릭

### 5-3. 빌드를 내부 테스트에 연결

1. **빌드** 섹션에서 처리 완료된 빌드 선택
2. **내부 테스팅** 그룹에 해당 빌드 할당
3. 테스터에게 **초대 이메일**이 자동 발송됨

### 5-4. iPhone에서 테스트

1. iPhone에 **TestFlight** 앱 설치 (App Store에서 "TestFlight" 검색)
2. 초대 이메일 수락 (또는 TestFlight 앱에서 초대 확인)
3. **설치** 버튼으로 앱 설치
4. 앱 실행 후 동작 확인

---

## 6단계: App Store 제출 (테스트 OK 후)

### 6-1. 배포 탭으로 이동

1. App Store Connect → **배포** 탭
2. **iOS 앱 버전 1.0** 선택

### 6-2. 필수 정보 입력

| 항목 | 내용 |
|------|------|
| **미리보기 및 스크린샷** | iPhone 6.7", 6.5", 5.5" 등 요구 크기별 스크린샷 (Xcode 시뮬레이터로 캡처 가능) |
| **프로모션 텍스트** | (선택) 앱 설명 한 줄 |
| **설명** | 앱 소개 (최대 4,000자) |
| **키워드** | 검색용 키워드 (쉼표 구분) |
| **지원 URL** | 웹사이트 또는 개인 페이지 |
| **개인정보 처리방침 URL** | 필수 (없으면 임시 페이지라도) |
| **빌드** | TestFlight에 올린 빌드 선택 |

### 6-3. 앱 심사 정보

1. **일반 정보** → **앱 심사** 메뉴
2. **연락처 정보** (심사 중 문의받을 이메일·전화번호)
3. **데모 계정** (로그인이 필요한 앱인 경우)
4. **참고 사항** (심사원에게 전달할 설명)

### 6-4. 심사 제출

1. 모든 필수 항목 입력 후 **저장**
2. **심사에 추가** 버튼 클릭
3. 수출 규정·광고 등 질문에 답변
4. **제출** 클릭

### 6-5. 심사 결과

- **승인**: 1~2일 (보통 24시간 내)
- **거절**: Resolution Center에서 사유 확인 → 수정 후 재제출

---

## 용어 정리

| 용어 | 설명 |
|------|------|
| **Archive** | 배포용으로 압축·서명된 빌드 파일 |
| **서명(Signing)** | 앱에 개발자 신원을 증명하는 디지털 서명 |
| **Provisioning Profile** | 특정 앱·기기에서 실행을 허용하는 설정 파일 |
| **TestFlight** | 출시 전 베타 테스트용 배포 도구 |
| **Bundle ID** | 앱을 구분하는 고유 ID (예: com.parkjongsu.dailyStory) |

---

## 문제 해결

### Archive 시 "No accounts with App Store Connect access"
- Xcode → **Settings** → **Accounts**에서 Apple ID 추가
- 해당 계정이 Developer Program에 가입되어 있는지 확인

### "Keychain 접근" 비밀번호 요청
- Mac 로그인 비밀번호 입력
- **항상 허용** 선택하면 다음부터 묻지 않음

### 빌드 업로드 후 "처리 중"에서 멈춤
- 최대 1시간까지 걸릴 수 있음
- 이메일로 "빌드 처리 완료" 알림이 옴

### TestFlight 앱이 "만료됨"
- 빌드당 90일 제한
- 새 빌드 업로드 후 다시 테스트

---

## 관련 문서

- [PAID_PURCHASE.md](./PAID_PURCHASE.md) — 인앱결제(광고 제거) 설정
- [BACKUP_SETUP.md](./BACKUP_SETUP.md) — iCloud 백업 설정
