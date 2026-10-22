# 식품 제조원가 결재 시스템

원가담당자가 제품별 **제조원가계산서**를 작성하고, 팀장 → 공장장 → 임원 순으로 **전자결재**하는 웹앱입니다.
결재 화면은 반응형이라 휴대폰 브라우저에서도 승인/반려할 수 있습니다.

| 구분 | 기술 |
| --- | --- |
| 백엔드 | Java 17+ (17/21/25 테스트 완료), Spring Boot 3.3, Spring Data JPA, Spring Security + JWT, H2(개발용) |
| 웹 | React 18, TypeScript, Vite, React Router, Bootstrap 5 |

```
food-cost-approval/
├── backend/       Spring Boot REST API (포트 8090)
├── web/           React 웹앱
├── release/       미리 빌드된 실행 jar
├── scripts/       find-jdk.cmd (JDK 자동 탐색)
├── start.bat/.sh  미리 빌드된 jar 실행 (JDK 만 필요)
└── run-local.bat/.sh  빌드 + 실행
```

## 실행 방법

필요: **JDK 17 이상(21 권장)**. 소스를 다시 빌드할 때만 Node.js 20+ 가 필요합니다.

### 가장 간단한 실행: `start.bat` (JDK 만 있으면 됨)

zip 배포본에는 미리 빌드된 `release/food-cost-approval.jar` 가 들어 있어 Node.js·Maven·인터넷 없이 실행됩니다.
(Git 저장소에는 jar 를 올리지 않으므로, clone 한 경우 `run-local.bat` 을 한 번 실행해 빌드한 뒤 `start.bat` 을 쓰세요.)

```bat
start.bat              :: Windows → http://localhost:8090
start.bat 9000         :: 다른 포트
./start.sh             # macOS / Linux
```

### 소스를 고친 뒤 다시 빌드해서 실행: `run-local.bat`

웹 화면 빌드 → 백엔드 패키징(웹 포함) → 실행까지 한 번에 합니다.

```bat
run-local.bat          :: Windows
./run-local.sh         # macOS / Linux
```

- **JDK**: `C:\aondev\jdk-21` → `JAVA_HOME` → PATH → `Program Files\Java`, `Eclipse Adoptium`, `%USERPROFILE%\.jdks` 순서로 자동 탐색
  (`scripts/find-jdk.cmd`). 다른 위치면 배치 파일의 `PREFERRED_JDK` 한 줄을 고치세요.
- **Node.js**: PATH, `Program Files\nodejs`, `C:\aondev\node*` 에서 찾고, 없으면 미리 빌드된 `web/dist` 를 그대로 씁니다.
  화면(React) 소스를 고쳤다면 Node.js 20+ 가 필요합니다.
- **Maven**: 설치 불필요. `mvnw` 가 처음 한 번 내려받습니다(인터넷 필요).

> **JDK 가 없다면**: cmd 에서 `winget install EclipseAdoptium.Temurin.21.JDK` 또는 https://adoptium.net 에서
> Temurin 21 LTS 설치 후 **새 cmd 창**에서 다시 실행하세요.

빌드한 jar 는 `java -jar backend/target/food-cost-approval-0.1.0.jar` 로도 실행됩니다.
포트는 `SERVER_PORT` 환경변수로 바꿀 수 있습니다.

### 개발 모드 (화면 수정 시 자동 반영)

```bash
# 1) 백엔드 (8090)
cd backend
./mvnw spring-boot:run      # Windows: mvnw.cmd spring-boot:run

# 2) 웹 (새 터미널) - /api 요청은 8090 으로 프록시
cd web
npm install
npm run dev                  # http://localhost:5173
```

같은 Wi-Fi 의 휴대폰에서는 `http://<PC IP>:8090` (개발 모드는 `:5173`) 으로 접속하면 됩니다.

### 테스트 계정 (비밀번호 모두 `1234`)

| 아이디 | 이름 | 역할 |
| --- | --- | --- |
| `writer` | 김원가 대리 | 원가담당 (작성) |
| `writer2` | 정생산 과장 | 원가담당 (작성) |
| `leader` | 이팀장 팀장 | 결재권자 |
| `plant` | 박공장 공장장 | 결재권자 |
| `exec` | 최상무 상무 | 결재권자 |
| `admin` | 관리자 | 관리자 |

서버를 띄우면 샘플 자재 17종, 제품 3종, 원가계산서 4건(승인완료/결재중 2건/임시저장)이 자동 생성됩니다.
H2 콘솔: http://localhost:8090/h2-console (JDBC URL `jdbc:h2:mem:foodcost`, 사용자 `sa`)

## 주요 기능

- **원가계산서 작성**: 제품 선택 + 배치 생산수량 → **총 생산량 자동 계산** → 배합표 입력 → 노무비·제조경비 입력 → 원가 실시간 미리보기
  - 배합표는 **원자재**(배합비 % 입력, 투입량 자동 계산)와 **포장자재**(투입량 입력)로 나뉘고 각각 행 추가
  - 원자재 배합비 합계가 100%가 아니면 화면에 경고 표시
- **결재선 지정**: 결재권자를 순서대로 추가/순서변경
- **결재**: 상신 → 순차 승인 → 최종 승인 / 반려(사유 필수) / 회수(아무도 승인 전일 때)
- **결재함**: 내 차례인 문서, 내가 처리한 문서. 상단 메뉴에 대기 건수 표시
- **기준정보**: 원재료·포장재 단가, 제품 관리 (원가담당/관리자만 수정)
  - 제품 판매가는 등록·수정 화면에서 입력할 수 없습니다. 등록 시 비어 있다가(`-`) 원가계산서가 최종 승인되면 책정됩니다.
  - 제품 **수정 잠금**: 원가계산서를 최초 상신하면 수정할 수 없습니다(목록에 `수정불가`, 마우스를 올리면 사유 표시).
    최초 상신이 반려·회수되면 다시 수정할 수 있지만, 판매가가 책정된 뒤에는 이후 상신이 반려돼도 계속 수정할 수 없습니다.
  - 판매가가 책정된 제품은 제품명을 클릭하면 **판매가 이력** 팝업(제품명 · 판매가 · 결재승인일자, 최신순)이 열립니다.
  - 코드는 **자동 채번, 수정 불가**: `{구분코드}-{4자리 순번}`, 같은 구분의 가장 큰 순번 + 1 (없으면 0001)

    | 구분 | 코드 예 |
    | --- | --- |
    | 원재료 | `M-0001`, `M-0002` … |
    | 포장재 | `P-0001`, `P-0002` … |
    | 제품 | `FG-0001`, `FG-0002` … |
  - 자재는 **원재료 등록 / 포장재 등록** 버튼으로 여러 행을 추가해 한 번에 저장 (요청 순서대로 채번)
  - 자재 구분은 코드와 연결되므로 등록 후 변경 불가

### 원가 계산식 (`CostSheet.recalculate`)

```
제품 당 무게(g) = 규격 무게(g) × 입수(EA)                ← 제품 화면에서 자동 계산 (예: 20g × 10EA = 200g)
총 생산량(kg)   = 제품 당 무게(g) × 배치 생산수량 ÷ 1000
총 투입량(kg)   = 총 생산량 ÷ (1 − 원재료 손실률%)          ← 기본정보에서 원재료 손실률 입력
원자재 투입량   = 총 생산량 × 배합비%                     ← 자재 단위가 g 이면 × 1000 (원자재 행에는 손실률 없음)
원자재 금액     = 투입량 × 단가,  원자재 합계 = Σ 원자재 금액
원재료비        = 원자재 합계 ÷ (1 − 원재료 손실률%)
포장자재 금액   = 투입량 × 단가 × (1 + 손실률%)            ← 투입량은 배치 생산량 기준, 손실률은 행마다 입력
총원가   = 원재료비 + 포장자재비 + 노무비 + 제조경비         ← 배치(생산 1회) 기준, 노무비·제조경비가 0원이면 상신 불가
개당원가 = 총원가 ÷ 생산수량
마진율   = (판매가 − 개당원가) ÷ 판매가 × 100
```

- 예) 버터쿠키(20g × 10EA = 200g) × 2,000개 = 총 생산량 400kg, 원재료 손실률 2% → 총 투입량 408.163kg
  - 박력분 60% → 240kg × 1,350원 = 324,000원, 백설탕 40% → 160kg × 1,480원 = 236,800원 → 원자재 합계 560,800원
  - 원재료비 = 560,800 ÷ 0.98 = 572,244.90원
- 제품 규격은 무게(g)와 입수(EA)를 숫자로 입력하고, 저장 시 `20g × 10EA` 처럼 단위가 붙습니다. 원가계산서에는 작성 시점의 제품 당 무게가 저장됩니다.

### 숫자 표시 규칙 (`web/src/utils/format.ts`)

| 구분 | 자릿수 | 예 |
| --- | --- | --- |
| 원 단위 (단가, 품목 금액, 원자재비·포장자재비, 총원가, 개당 원가) | 소수 둘째자리 | `1,350.00` |
| 무게 (원자재 투입량, 총 투입량) | 소수 셋째자리 | `408.163` |
| 판매가, 노무비, 제조경비, 총 생산량, 제품 당 무게, 생산수량 | 정수 | `4,500` |

금액은 서버에서도 소수 둘째자리로 반올림해 저장합니다.
- 서버가 계산한 값이 기준이고, 웹 화면 미리보기(`web/src/utils/cost.ts`)는 같은 공식을 씁니다.
- 자재명·단가는 작성 시점 값으로 품목에 **스냅샷** 저장되므로, 나중에 기준단가를 바꿔도 결재된 문서는 바뀌지 않습니다.

### 결재 규칙 (`CostSheet` 엔티티)

| 상태 | 가능한 동작 |
| --- | --- |
| 임시저장 | 작성자: 수정, 삭제, 상신 |
| 결재중 | 현재 차례 결재자: 승인, 반려 / 작성자: 회수(승인자 없을 때만) |
| 반려 | 작성자: 수정 후 재상신 (결재선 초기화, 이력은 유지) |
| 승인완료 | 조회만 가능 |

- 작성자 본인은 결재선에 넣을 수 없고, 같은 사람을 두 번 넣을 수 없습니다.
- 모든 상신/승인/반려/회수는 결재 이력(`approval_history`)에 남습니다.
- **승인 판매가**: 최종 결재자가 승인할 때 개당 승인 판매가를 입력합니다(기본값은 작성 시 판매가).
  승인완료되면 원가계산서 목록·결재함의 개당원가 옆과 상세 화면에 표시되고(그 외 상태는 `-`),
  같은 제품코드의 제품 판매가가 승인 판매가로 변경됩니다. 중간 결재자에게는 입력칸이 없습니다.

## REST API

모든 API는 `Authorization: Bearer <token>` 헤더가 필요합니다. (로그인 제외)

| Method | URL | 설명 |
| --- | --- | --- |
| POST | `/api/auth/login` | 로그인 → `{ token, user }` |
| GET | `/api/auth/me` | 내 정보 |
| GET | `/api/users/approvers` | 결재권자 목록 |
| GET/POST/PUT | `/api/materials`, `/api/materials/{id}` | 원재료·포장재 (코드 자동 채번) |
| POST | `/api/materials/batch` | 원재료·포장재 일괄 등록 `{ items: [...] }` |
| GET/POST/PUT | `/api/products`, `/api/products/{id}` | 제품 (코드 자동 채번, 판매가는 받지 않음, 잠긴 제품 수정 시 400) |
| GET | `/api/products/{id}/price-history` | 제품 판매가 이력 (최종 승인된 원가계산서 기준, 최신순) |
| GET | `/api/cost-sheets?scope=mine\|all&status=` | 원가계산서 목록 |
| GET/PUT/DELETE | `/api/cost-sheets/{id}` | 상세 / 수정 / 삭제 |
| POST | `/api/cost-sheets` | 작성 |
| POST | `/api/cost-sheets/{id}/submit` | 상신 |
| POST | `/api/cost-sheets/{id}/withdraw` | 회수 |
| POST | `/api/cost-sheets/{id}/approve` | 승인 `{ comment, salePrice }` (salePrice 는 최종 결재자만) |
| POST | `/api/cost-sheets/{id}/reject` | 반려 `{ comment }` (필수) |
| GET | `/api/approvals?box=pending\|done` | 결재함 |
| GET | `/api/approvals/count` | 결재 대기 건수 |

상세 응답의 `permissions`(canEdit, canSubmit, canApprove 등)로 화면 버튼 노출을 결정하므로,
모바일 앱을 만들 때도 같은 API를 그대로 쓰면 됩니다.

## 테스트

```bash
cd backend && ./mvnw test       # 원가 계산, 결재 흐름, 권한, 코드 채번, 제품 규격, 승인 판매가, 판매가 이력, 노무비·제조경비 0원 상신 차단, 제품 수정 잠금 (32건)
cd web && npm run build      # 타입체크 + 빌드
```

## 운영 전환 시 할 일

- **DB**: `application.yml` 의 H2 를 MySQL/MariaDB/Oracle/PostgreSQL 로 교체하고 `ddl-auto: validate` + Flyway 등 마이그레이션 도구 사용
- **JWT 비밀키**: 환경변수 `APP_JWT_SECRET` 로 32바이트 이상 값 지정
- **샘플 데이터 끄기**: `app.seed-data: false`
- **배포**: `run-local` 과 같이 jar 하나로 배포하거나, `web/dist/` 를 Nginx 로 서빙하고 `/api` 를 백엔드로 프록시

## 다음 단계 아이디어

- 모바일 앱: Capacitor 로 현재 웹앱을 감싸 Android/iOS 빌드하거나, React Native 로 결재 전용 앱 작성 (API 재사용)
- 결재 요청/완료 푸시·메일 알림
- 이전 승인 원가와 비교 (단가 변동 하이라이트)
- 첨부파일 (견적서, 단가 근거)
- 원가계산서 출력 (OZ Report / PDF), 엑셀 다운로드
- 금액·마진율 기준 결재선 자동 지정 (전결 규정)
