# POS 시스템 감사 로그(Audit Log) 전면 개편 아키텍처 및 단계별 실행 계획

POS 시스템의 신뢰성과 투명성을 극대화하기 위해, 기존 로그 ID 표준화(3자리 액션코드 + 타임스탬프)에 이어 **데이터 모델, 전수 로깅 커버리지, 시각화 UI, 다차원 검색/필터, 보관/내보내기**를 아우르는 전면 개편 종합 계획입니다. 사용자 요청에 따라 **10분 내외 단위 마일스톤**으로 분할하여 단계별 안전 검증을 거치며 진행합니다.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **확정된 실행 원칙 (User Confirmed)**
> 1. **탄탄한 밑바탕 우선 원칙**: 단순 UI 패치가 아닌, 데이터 스키마와 메타데이터 규격부터 사소한 디테일까지 완벽히 표준화합니다.
> 2. **10분 단위 마일스톤 분할 실행**: 각 작업 단위를 10분 내외 분량으로 쪼개어, 매 단계 완료 시 컴파일 검증 및 사용자 확인 후 다음 단계로 전진합니다.

---

## 1. Overview & Core Concept

- **목표**: 매점 POS에서 발생하는 모든 활동(결제, 환불, 재고 증감, 단가 변경, 카테고리/프리셋 조작, 정산 오차, 기프티콘 등록/사용/복원, 로그인/아웃)을 단일 표준 규격으로 100% 추적 가능한 엔터프라이즈급 감사 시스템 구축.
- **핵심 가치**:
  - **무결성(Integrity)**: 모든 상태 변경에 대해 "누가, 언제, 무엇을, 어떻게, 변경 전후가 무엇인지" 기록.
  - **가독성(Clarity)**: 기술적 JSON 대신 직관적인 배지, 타임라인, 전/후 비교(Diff) 테이블 제공.
  - **신속성(Searchability)**: 로그 ID, 작업자, 카테고리, 특정 품목명으로 즉각적인 추적 및 엑셀 보고서 다운로드.

---

## 2. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        POS Business Operations                         │
│  [Sales/Refunds]   [Inventory/Items]   [Settlements]   [Gifticons/Auth]│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Standardized Audit Logger (posFirestore.ts)               │
│  - ID Generator: [ACT3][YYYYMMDDHHmmss][SSS]                           │
│  - Severity Classifier: INFO | WARN | CRITICAL                         │
│  - Strict Payload Validators (No un-typed any metadata)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Firestore Collection: `/audit_logs`                  │
│  - Real-time Firestore Subscription & Indexed Querying                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  PosAuditLogModal & Detail View Engine                 │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │ Multi-Dimension Filter│  │ Categorized Detail Visualizers        │  │
│  │ - Period / Severity   │  │ - Order Receipt / Refund Breakdown    │  │
│  │ - Category / Operator │  │ - Inventory Diff (Before/After Table) │  │
│  │ - Live Search         │  │ - Settlement Discrepancy Alert Box    │  │
│  └───────────────────────┘  │ - Gifticon Audit Trace                │  │
│                             └───────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 세부 메타데이터 스키마 규격 (Strict Metadata Schemas)

1. **결제/환불 (`PCA`, `PTR`, `PCC`)**:
   - `orderId`, `paymentMethod`, `totalAmount`, `actualPaidAmount`, `gifticonDiscountAmount`
   - `items`: `Array<{ itemId: string; name: string; price: number; count: number }>`
   - `refundReason`, `restoredItems`, `restoredGifticons`
2. **품목/재고 (`ICR`, `IUP`, `IMU`, `IDL`)**:
   - `itemId`, `itemName`, `changeType` ('STOCK' | 'PRICE' | 'STATUS' | 'NAME')
   - `diffs`: `Array<{ field: string; label: string; from: any; to: any }>`
3. **정산 (`SOO`, `SXX`, `SUP`, `SDL`)**:
   - `sessionId`, `expectedCash`, `actualCashInput`, `discrepancy`, `transferSales`, `cashSales`, `note`
4. **기프티콘 (`GCR`, `GMC`, `GUS`, `GRT`, `GUP`, `GDL`)**:
   - `gifticonId`, `amount`, `status`, `orderId`, `reason`

---

## 3. 10분 마일스톤 단계별 실행 계획 (Milestone Roadmap)

각 마일스톤은 **10분 내외 작업 단위**로 독립 검증(컴파일 & 린트 통과) 후 사용자 확인을 거칩니다.

### 🚩 마일스톤 1: 데이터 모델 및 타입 규격 고도화 (10분)
- `src/types/pos.ts`:
  - `PosAuditLog`의 `metadata`를 Any 타입에서 카테고리별 엄격한 유니온 타입(`PosOrderLogMeta`, `PosInventoryLogMeta`, `PosSettlementLogMeta`, `PosGifticonLogMeta`, `PosPresetLogMeta`)으로 정밀 정의.
  - 변경 전후 비교를 위한 `PosFieldDiff` 및 `PosItemChangeDetail` 정밀 규격화.
  - 심각도 필드(`severity: 'INFO' | 'WARN' | 'CRITICAL'`) 필수화 및 액션 코드 매핑 완성.
- **검증**: `compile_applet` & `lint_applet` 0 에러 확인.

### 🚩 마일스톤 2: 로깅 엔진 및 전수 로깅 빈틈 보완 (10분)
- `src/services/posFirestore.ts`:
  - 품목 단일 수정(`updatePosItem`), 단일 패치(`patchPosItem`), 재고 실사, 카테고리 조작, 프리셋 조작 시 이전 값(Before)과 새 값(After)을 비교하여 자동 `diffs` 배열을 생성해 로깅하도록 보완.
  - 정산 마감 시 오차 발생(`SXX`)과 정상 마감(`SOO`)의 메타데이터 분리 기록.
- **검증**: `compile_applet` & Firestore 트랜잭션 정상 빌드 확인.

### 🚩 마일스톤 3: 로그 상세 모달(Detail View) 시각화 개편 (10분)
- `src/components/pos/PosAuditLogDetailView.tsx`:
  - 재고/품목 수정 로그: **변경 전 $\rightarrow$ 변경 후(Diff) 직관적 비교 테이블** 렌더링.
  - 정산 로그: 오차 발생 시 빨간색 경고 배지 및 오차액/실측금액 대조표 렌더링.
  - 결제/취소 로그: 미니 전자영수증 카드 및 복원된 기프티콘/재고 상세 태그 렌더링.
- **검증**: 컴파일 및 화면 렌더링 확인.

### 🚩 마일스톤 4: 다차원 필터 및 실시간 검색 고도화 (10분)
- `src/components/pos/PosAuditLogModal.tsx`:
  - 기간 필터 개선 (오늘 / 최근 3일 / 최근 7일 / 최근 30일 / 전체).
  - 심각도 필터 (전체 / 정상 / 경고·오차 / 취소·삭제).
  - 작업자별 드롭다운 필터 및 액션 코드 다중 선택 지원.
  - 검색창 반응성 및 하이라이트 UI 개선.
- **검증**: 필터링 상태 머신 동작 및 빌드 확인.

### 🚩 마일스톤 5: 감사 보고서 내보내기(Export) 및 최종 검증 (10분)
- 감사 로그 CSV / 엑셀 형식 다운로드 기능 추가 (한글 인코딩 BOM 지원).
- 전체 사이트 연동 통합 테스트 및 빌드/린트 무결성 최종 검증.

---

## 4. 진행 절차

위 계획 승인 시, 즉시 **마일스톤 1 (데이터 모델 및 타입 규격 고도화 - 10분 단위)** 작업부터 착수합니다. 각 마일스톤 완료 시 빌드 검증 결과를 보고하고 사용자 승인을 받아 다음 마일스톤으로 넘어갑니다.
