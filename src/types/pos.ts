export interface PosCategory {
  id: string;
  name: string;
  orderIndex: number;
}

export interface PosItem {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  stock?: number;
  isSoldOut?: boolean; // 품절 여부 (true: 품절 / false: 판매중)
  totalSold?: number;  // 누적 판매 수량
  isFavorite: boolean;
  isActive: boolean;
  barcode?: string;
  updatedAt?: string;
}

export interface CartItem {
  item: PosItem;
  count: number;
}

export interface PosUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'staff';
}

export type PaymentMethod = 'TRANSFER' | 'CASH';

export interface PosOrderItem {
  itemId: string;
  name: string;
  price: number;
  count: number;
}

/**
 * Gifticon Model
 * - id: 고유 기프티콘 번호/코드
 * - amount: 액면 할인 금액
 * - status: 'ACTIVE' (사용가능) | 'USED' (사용완료) | 'CANCELLED' (폐기/무효)
 */
export interface PosGifticon {
  id: string; // 기프티콘 번호 / 코드
  amount: number; // 할인 액면 금액 (원)
  status: 'ACTIVE' | 'USED' | 'CANCELLED';
  description?: string;
  createdAt?: string; // ISO string
  createdBy?: string; // 발급자
  usedAt?: string; // 사용 시각 ISO
  usedBy?: string; // 사용 판매원/구매자
  usedOrderId?: string; // 결제 주문 번호
  memo?: string;
}

export interface PosUsedGifticonSummary {
  gifticonId: string;
  amount: number;
}

export interface PosOrder {
  id: string;
  sessionId: string; // e.g. "2026-09-16"
  timestamp: string; // ISO string
  handlerUid: string;
  handlerName: string;
  buyerName?: string; // 결제자 이름 (선택사항)
  memo?: string; // 추가 메모 (선택사항)
  paymentMethod: PaymentMethod;
  totalAmount: number; // 상품 정가 합계 (원래 주문 금액)
  gifticonDiscountAmount?: number; // 기프티콘 총 할인 금액
  actualPaidAmount?: number; // 실제 고객 결제 금액 (totalAmount - 할인금액, 최소 0원)
  usedGifticons?: PosUsedGifticonSummary[]; // 사용된 기프티콘 목록
  cashReceived?: number;
  changeAmount?: number;
  items: PosOrderItem[];
  isCancelled: boolean;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface PosSettlement {
  id: string; // sessionId "YYYY-MM-DD"
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  initialCash: number; // 준비금
  transferSales: number; // 이체 합계 (실제 입금액)
  cashSales: number; // 현금 합계 (실제 입금액)
  totalSales: number; // 실제 수납 매출 (현금 + 계좌이체)
  grossSales?: number; // 기프티콘 포함 총 매출 (정가 기준)
  gifticonSales?: number; // 기프티콘 할인 총액
  actualCashInput?: number; // 실측 현금
  discrepancy?: number; // 오차 (+ / -)
  status: 'OPEN' | 'CLOSED';
  note?: string; // 마감 특이사항 메모
}

export interface PosPreset {
  id: string;
  name: string;
  description?: string;
  isBuiltIn?: boolean;
  categories: PosCategory[];
  items: PosItem[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 3글자 표준 감사 액션 코드
 */
export type PosLogAction =
  // 결제 (Payment)
  | 'PAY' // 일반 결제 완료
  | 'PCA' // 현금 결제 완료
  | 'PTR' // 계좌이체 결제 완료
  | 'PCC' // 결제 취소 (환불/재고복원)
  | 'PUP' // 결제 정보 수정
  | 'PDL' // 매출 내역 영구 삭제
  // 재고/상품 (Inventory)
  | 'ICR' // 상품 신규 등록
  | 'IUP' // 상품 단일 수정/재고 실사
  | 'IMU' // 상품 일괄 저장 (복합)
  | 'IDL' // 상품 삭제
  // 카테고리 (Category)
  | 'CCR' // 카테고리 추가
  | 'CUP' // 카테고리 단일 수정
  | 'CMU' // 카테고리 일괄 저장
  | 'CDL' // 카테고리 삭제
  // 프리셋 (Preset)
  | 'PSA' // 메뉴 프리셋 적용
  | 'PSC' // 새 프리셋 등록
  | 'PSO' // 프리셋 내용 갱신 (덮어쓰기)
  | 'PSU' // 프리셋 정보 수정
  | 'PSD' // 프리셋 삭제
  // 기프티콘 (Gifticon)
  | 'GCR' // 기프티콘 개별 등록
  | 'GMC' // 기프티콘 일괄 등록 (Multi)
  | 'GUS' // 기프티콘 결제 사용
  | 'GRT' // 기프티콘 미사용 복원
  | 'GUP' // 기프티콘 상태/정보 수정
  | 'GDL' // 기프티콘 영구 삭제
  // 정산 (Settlement)
  | 'SOO' // 마감 정산 정상 완료 (일치)
  | 'SXX' // 마감 정산 불일치 경고 (오차 발생)
  | 'SUP' // 마감 일지 수정
  | 'SDL' // 마감 일지 삭제
  // 계정 (Auth)
  | 'ALI' // 로그인
  | 'ALO' // 로그아웃
  // 시스템 (System)
  | 'XRS' // POS 데이터 기본값 초기화
  // 과거 호환용
  | string;

export type PosLogCategory = 'SALE' | 'INVENTORY' | 'SETTLEMENT' | 'SYSTEM' | 'AUTH' | 'GIFTICON';

export type PosLogSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export interface PosFieldDiff {
  field: string;
  label: string;
  from: string | number | boolean;
  to: string | number | boolean;
}

export interface PosItemChangeDetail {
  itemId: string;
  itemName: string;
  categoryName?: string;
  changeType?: 'CREATED' | 'STOCK' | 'PRICE' | 'STATUS' | 'FAVORITE' | 'RENAMED' | 'CATEGORY' | 'MULTIPLE';
  summary: string;
  diffs?: PosFieldDiff[];
}

export interface PosAuditLog {
  id: string; // 포맷: [3글자접두사]-[YYYYMMDD]-[HHMMSS]-[SSS] (예: PAY-20261021-193722-482)
  timestamp: string; // ISO string
  action: PosLogAction;
  actionTitle: string; // 인간 친화적 명칭 (예: "현금 결제 완료", "마감 정산 불일치")
  category: PosLogCategory;
  severity?: PosLogSeverity; // INFO | WARN | CRITICAL
  actorId?: string; // 작업자 ID
  actorName?: string; // 작업자 표시명
  actorUid?: string; // 인증 식별자
  details: string; // 한줄 명확한 요약 설명
  metadata?: Record<string, any>; // 세부 정보 (Diff, 품목 등)
  sessionId?: string; // "YYYY-MM-DD"
}
