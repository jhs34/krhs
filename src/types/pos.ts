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
  stock: number;
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

export interface PosOrder {
  id: string;
  sessionId: string; // e.g. "2026-09-16"
  timestamp: string; // ISO string
  handlerUid: string;
  handlerName: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
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
  transferSales: number; // 이체 합계
  cashSales: number; // 현금 합계
  totalSales: number; // 총 매출
  actualCashInput?: number; // 실측 현금
  discrepancy?: number; // 오차 (+ / -)
  status: 'OPEN' | 'CLOSED';
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

export type PosLogAction =
  | 'ORDER_CREATED'
  | 'ORDER_CANCELLED'
  | 'ORDER_UPDATED'
  | 'ORDER_DELETED'
  | 'BATCH_ORDERS_DELETED'
  | 'ITEM_CREATED'
  | 'ITEM_UPDATED'
  | 'ITEM_DELETED'
  | 'STOCK_ADJUSTED'
  | 'FAVORITES_CLEARED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'PRESET_APPLIED'
  | 'PRESET_SAVED'
  | 'PRESET_DELETED'
  | 'POS_RESET'
  | 'SETTLEMENT_OPENED'
  | 'SETTLEMENT_CLOSED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT';

export type PosLogCategory = 'SALE' | 'INVENTORY' | 'SETTLEMENT' | 'SYSTEM' | 'AUTH';

export interface PosAuditLog {
  id: string;
  timestamp: string; // ISO string
  action: PosLogAction;
  actionTitle: string; // human readable name
  category: PosLogCategory;
  actorName: string; // "김철도 (관리자)" or email
  actorUid?: string;
  details: string; // 요약 설명
  metadata?: Record<string, any>; // 주문번호, 이전값/이후값, 품목 내역 등
  sessionId?: string; // e.g. "2026-09-16"
}

