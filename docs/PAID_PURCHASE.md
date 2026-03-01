# 유료 결제(광고 제거) 처리 가이드

## 구현 상태

- **광고 제거 구매**: `react-native-iap`으로 인앱 결제 요청 → 결제 완료 시 `setPaid(true)` 호출되어 광고 제거.
- **구매 복원**: `getAvailablePurchases()`로 스토어 구매 내역 조회 후, `remove_ads` 상품이 있으면 `setPaid(true)` 적용.
- **도구 탭**: 「광고 제거 구매」「구매 복원」 버튼과 현재 유료 여부 표시.

## 상품 ID (필수)

앱에서 사용하는 상품 ID: **`remove_ads`** (`src/config/iap.ts`)

iOS·Android 스토어에 **반드시 동일 ID**로 인앱 상품을 등록해야 합니다.

---

## Android (Google Play Console)

### 사전 조건

- Play Console에 앱이 등록되어 있어야 함
- 앱이 **초안** 또는 **프로덕션** 상태여도 됨 (내부 테스트 트랙에 올려두면 됨)

### 단계

1. [Google Play Console](https://play.google.com/console/) 접속
2. 앱 선택
3. 왼쪽 메뉴: **수익 창출** (Monetize) → **제품** (Products) → **인앱 상품** (In-app products)
4. **상품 만들기** 클릭
5. **상품 ID** 입력: `remove_ads` (앱 코드와 정확히 일치해야 함)
6. **이름**: 예) "광고 제거"
7. **설명**: 예) "앱 내 광고를 영구적으로 제거합니다."
8. **가격** 설정 (예: 4,900원)
9. **저장** → **활성화** 클릭

### 테스트

- **라이선스 테스터** 추가: Play Console → **설정** → **라이선스 테스트** → 테스트용 Google 계정 이메일 추가
- 해당 계정으로 앱 설치 후 구매 시 실제 결제 없이 테스트 가능

---

## iOS (App Store Connect)

### 사전 조건

- Apple Developer Program 가입 (유료)
- App Store Connect에 앱이 등록되어 있어야 함

### 단계

1. [App Store Connect](https://appstoreconnect.apple.com/) 접속
2. **앱** → 해당 앱 선택
3. 왼쪽 메뉴: **기능** (Features) → **인앱 구입** (In-App Purchases)
4. **+** 버튼 → **인앱 구입 만들기**
5. **유형** 선택: **비소모성** (Non-Consumable) — 한 번 구매하면 영구 적용
6. **참조 이름**: 예) "광고 제거" (내부용, 사용자에게 안 보임)
7. **상품 ID** 입력: `remove_ads` (앱 코드와 정확히 일치해야 함)
8. **가격** 선택 (예: 4,900원)
9. **로컬화** 정보 입력 (표시 이름, 설명)
10. **저장** 후 **제출** (앱 심사와 함께 또는 별도 제출)

### 테스트

- **샌드박스 테스터** 계정 생성: App Store Connect → **사용자 및 앱** → **샌드박스** → 테스터 추가
- 기기에서 App Store 로그아웃 후, 앱 실행 → 구매 시 샌드박스 계정으로 로그인하면 테스트 결제 가능

---

## 동작 요약

| 기능 | 동작 |
|------|------|
| 광고 제거 구매 | 스토어 결제 UI 표시 → 결제 성공 시 자동으로 `setPaid(true)` 후 광고 제거 |
| 구매 복원 | 스토어에 저장된 구매 내역 조회 → `remove_ads` 있으면 `setPaid(true)` |
| IAP 미연결 시 | (라이브러리 오류 등) 구매 버튼 시 테스트용으로 `setPaid(true)` 호출 |

---

## 관련 파일

- `src/services/purchaseService.ts` — 구매/복원 로직, IAP 연동
- `src/services/paidStorage.ts` — 유료 여부 저장/조회
- `src/config/iap.ts` — 상품 ID 상수
- `src/screens/ToolsScreen.tsx` — 도구 탭 UI
