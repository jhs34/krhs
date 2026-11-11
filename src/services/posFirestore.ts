import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  PosCategory,
  PosItem,
  PosOrder,
  PosSettlement,
  CartItem,
  PaymentMethod,
  PosPreset,
  PosAuditLog,
  PosOrderItem,
  PosRefundedItem,
} from '../types/pos';

/**
 * POS uses PIN-based staff authentication and dedicated Firestore rules for POS collections.
 * Skipping anonymous sign-in prevents 400 Bad Request console logs when Anonymous Auth is disabled.
 */
export async function ensurePosAuth(): Promise<void> {
  return;
}

/**
 * Subscribe to POS categories in real-time.
 */
export function subscribePosCategories(
  onData: (categories: PosCategory[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, 'categories');
  return onSnapshot(
    colRef,
    snapshot => {
      const nameMap = new Map<string, PosCategory>();
      snapshot.docs.forEach((docSnap, idx) => {
        const data = docSnap.data();
        const rawName = (data.name || docSnap.id || '').trim();
        if (!rawName) return;
        const key = rawName.toLowerCase();
        if (!nameMap.has(key)) {
          nameMap.set(key, {
            name: rawName,
            orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : idx + 1,
          });
        }
      });
      const categories: PosCategory[] = Array.from(nameMap.values()).sort(
        (a, b) => a.orderIndex - b.orderIndex
      );
      onData(categories);
    },
    err => {
      console.error('Firestore categories subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to POS items & inventory in real-time.
 */
export function subscribePosItems(
  onData: (items: PosItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, 'items');
  return onSnapshot(
    colRef,
    snapshot => {
      const items: PosItem[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const isSoldOut = Boolean(data.isSoldOut === true);
        return {
          id: docSnap.id,
          name: data.name || '',
          categoryId: data.categoryId || '',
          price: typeof data.price === 'number' ? data.price : 0,
          stock: typeof data.stock === 'number' ? data.stock : 999,
          isSoldOut,
          totalSold: typeof data.totalSold === 'number' ? data.totalSold : 0,
          isFavorite: Boolean(data.isFavorite),
          isActive: data.isActive !== false,
          barcode: data.barcode || '',
          updatedAt: data.updatedAt || '',
        };
      });
      onData(items);
    },
    err => {
      console.error('Firestore items subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to POS orders in real-time.
 */
export function subscribePosOrders(
  onData: (orders: PosOrder[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    snapshot => {
      const orders: PosOrder[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          sessionId: data.sessionId || '',
          timestamp: data.timestamp || new Date().toISOString(),
          handlerUid: data.handlerUid || '',
          handlerName: data.handlerName || '판매원',
          buyerName: data.buyerName || undefined,
          memo: data.memo || undefined,
          paymentMethod: (data.paymentMethod as PaymentMethod) || 'CASH',
          totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
          gifticonDiscountAmount: typeof data.gifticonDiscountAmount === 'number' ? data.gifticonDiscountAmount : 0,
          actualPaidAmount: typeof data.actualPaidAmount === 'number' ? data.actualPaidAmount : (typeof data.totalAmount === 'number' ? data.totalAmount : 0),
          usedGifticons: Array.isArray(data.usedGifticons) ? data.usedGifticons : [],
          cashReceived: typeof data.cashReceived === 'number' ? data.cashReceived : undefined,
          changeAmount: typeof data.changeAmount === 'number' ? data.changeAmount : undefined,
          items: Array.isArray(data.items) ? data.items : [],
          refundedItems: Array.isArray(data.refundedItems) ? data.refundedItems : undefined,
          refundedAmount: typeof data.refundedAmount === 'number' ? data.refundedAmount : undefined,
          isCancelled: Boolean(data.isCancelled),
          cancelledBy: data.cancelledBy || undefined,
          cancelledAt: data.cancelledAt || undefined,
          cancelReason: data.cancelReason || undefined,
        };
      });
      onData(orders);
    },
    err => {
      console.error('Firestore orders subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to POS daily settlement report in real-time.
 */
export function subscribePosSettlement(
  sessionId: string,
  onData: (settlement: PosSettlement | null) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, 'settlements', sessionId);
  return onSnapshot(
    docRef,
    snapshot => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      onData({
        id: snapshot.id,
        openedAt: data.openedAt || '',
        closedAt: data.closedAt || undefined,
        openedBy: data.openedBy || '',
        closedBy: data.closedBy || undefined,
        initialCash: typeof data.initialCash === 'number' ? data.initialCash : 0,
        transferSales: typeof data.transferSales === 'number' ? data.transferSales : 0,
        cashSales: typeof data.cashSales === 'number' ? data.cashSales : 0,
        totalSales: typeof data.totalSales === 'number' ? data.totalSales : 0,
        grossSales: typeof data.grossSales === 'number' ? data.grossSales : undefined,
        gifticonSales: typeof data.gifticonSales === 'number' ? data.gifticonSales : undefined,
        actualCashInput: typeof data.actualCashInput === 'number' ? data.actualCashInput : undefined,
        discrepancy: typeof data.discrepancy === 'number' ? data.discrepancy : undefined,
        status: (data.status as 'OPEN' | 'CLOSED') || 'OPEN',
        note: data.note || '',
      });
    },
    err => {
      console.error('Firestore settlement subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to all historical POS daily settlement reports in real-time (newest first).
 */
export function subscribePosSettlements(
  onData: (settlements: PosSettlement[]) => void,
  onError?: (error: Error) => void
): () => void {
  const collRef = collection(db, 'settlements');
  return onSnapshot(
    collRef,
    snapshot => {
      const list: PosSettlement[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          openedAt: data.openedAt || '',
          closedAt: data.closedAt || undefined,
          openedBy: data.openedBy || '',
          closedBy: data.closedBy || undefined,
          initialCash: typeof data.initialCash === 'number' ? data.initialCash : 0,
          transferSales: typeof data.transferSales === 'number' ? data.transferSales : 0,
          cashSales: typeof data.cashSales === 'number' ? data.cashSales : 0,
          totalSales: typeof data.totalSales === 'number' ? data.totalSales : 0,
          grossSales: typeof data.grossSales === 'number' ? data.grossSales : undefined,
          gifticonSales: typeof data.gifticonSales === 'number' ? data.gifticonSales : undefined,
          actualCashInput: typeof data.actualCashInput === 'number' ? data.actualCashInput : undefined,
          discrepancy: typeof data.discrepancy === 'number' ? data.discrepancy : undefined,
          status: (data.status as 'OPEN' | 'CLOSED') || 'OPEN',
          note: data.note || '',
        };
      });
      // Sort newest first by id (YYYY-MM-DD) or closedAt
      list.sort((a, b) => {
        const timeB = b.closedAt || b.openedAt || b.id;
        const timeA = a.closedAt || a.openedAt || a.id;
        return timeB.localeCompare(timeA);
      });
      onData(list);
    },
    err => {
      console.error('Firestore settlements list subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Seeds initial categories and items into Firestore if empty.
 */
export async function seedInitialPosData(
  defaultCategories: PosCategory[],
  defaultItems: PosItem[]
): Promise<void> {
  await ensurePosAuth();
  const batch = writeBatch(db);

  const seenCatNames = new Set<string>();
  for (const cat of defaultCategories) {
    const cleanName = cat.name.trim();
    if (!cleanName || seenCatNames.has(cleanName.toLowerCase())) continue;
    seenCatNames.add(cleanName.toLowerCase());
    const catRef = doc(db, 'categories', cleanName);
    batch.set(catRef, {
      name: cleanName,
      orderIndex: cat.orderIndex,
    });
  }

  for (const item of defaultItems) {
    const itemRef = doc(db, 'items', item.id);
    batch.set(itemRef, {
      name: item.name,
      categoryId: item.categoryId,
      price: item.price,
      stock: item.stock,
      isFavorite: item.isFavorite,
      isActive: item.isActive,
      barcode: item.barcode || '',
      updatedAt: new Date().toISOString(),
    });
  }

  await batch.commit();
}

/**
 * Helper to strip undefined values deeply before passing to Firestore set/update/transaction calls
 */
function sanitizeForFirestore<T>(val: T): T {
  if (val === null || val === undefined) {
    return undefined as unknown as T;
  }
  if (Array.isArray(val)) {
    return val
      .map(item => sanitizeForFirestore(item))
      .filter(item => item !== undefined) as unknown as T;
  }
  if (typeof val === 'object') {
    // Preserve FieldValues, ServerTimestamps, Dates, etc.
    if (val.constructor && val.constructor.name !== 'Object') {
      return val;
    }
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(val as Record<string, any>)) {
      if (value !== undefined) {
        const cleanedValue = sanitizeForFirestore(value);
        if (cleanedValue !== undefined) {
          clean[key] = cleanedValue;
        }
      }
    }
    return clean as T;
  }
  return val;
}

export interface RunOrderParams {
  sessionId: string;
  handlerUid: string;
  handlerName: string;
  buyerName?: string;
  memo?: string;
  paymentMethod: PaymentMethod;
  totalAmount: number; // 상품 정가 합계 금액
  gifticonDiscountAmount?: number; // 직접 할인 적용 금액
  actualPaidAmount?: number; // 실제 수납 금액 (totalAmount - gifticonDiscountAmount, 최소 0원)
  cashReceived?: number;
  changeAmount?: number;
  cart: CartItem[];
}

/**
 * [트랜잭션 일관성] 결제 완료 처리 시:
 * 1. 장바구니 상품들의 실시간 품절 여부 확인 및 누적 판매량 반영
 * 2. orders 문서 생성
 * 을 단일 트랜잭션으로 원자적 처리하여 데이터 불일치 방지.
 */
export async function runOrderTransaction(params: RunOrderParams): Promise<PosOrder> {
  await ensurePosAuth();

  if (params.cart.length === 0) {
    throw new Error('장바구니가 비어 있습니다.');
  }

  const discountAmount = Math.max(0, params.gifticonDiscountAmount ?? 0);
  const actualPaid = Math.max(0, params.totalAmount - discountAmount);

  return await runTransaction(db, async transaction => {
    // 1. Transaction Read Phase: Read fresh state for all items
    const itemReads: Array<{
      ref: ReturnType<typeof doc>;
      currentStock: number;
      currentSold: number;
      name: string;
      item: PosItem;
      requestedCount: number;
    }> = [];

    for (const cartItem of params.cart) {
      const itemRef = doc(db, 'items', cartItem.item.id);
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists()) {
        throw new Error(`상품 "${cartItem.item.name}"을(를) 시스템에서 찾을 수 없습니다.`);
      }

      const itemData = itemDoc.data();
      const isSoldOut = Boolean(itemData.isSoldOut === true);

      // Real-time sold out validation check
      if (isSoldOut || itemData.isActive === false) {
        throw new Error(
          `[품절] "${itemData.name || cartItem.item.name}" 상품은 현재 품절 상태입니다.`
        );
      }

      itemReads.push({
        ref: itemRef,
        currentStock: typeof itemData.stock === 'number' ? itemData.stock : 999,
        currentSold: typeof itemData.totalSold === 'number' ? itemData.totalSold : 0,
        name: itemData.name || cartItem.item.name,
        item: cartItem.item,
        requestedCount: cartItem.count,
      });
    }

    // 2. Transaction Write Phase: Create Order document & update totalSold
    const ordersCol = collection(db, 'orders');
    const orderDocRef = doc(ordersCol);

    const nowIso = new Date().toISOString();
    const cleanBuyerName = params.buyerName?.trim() || undefined;
    const cleanMemo = params.memo?.trim() || undefined;

    const newOrder: PosOrder = {
      id: orderDocRef.id,
      sessionId: params.sessionId,
      timestamp: nowIso,
      handlerUid: params.handlerUid,
      handlerName: params.handlerName,
      buyerName: cleanBuyerName,
      memo: cleanMemo,
      paymentMethod: params.paymentMethod,
      totalAmount: params.totalAmount,
      gifticonDiscountAmount: discountAmount,
      actualPaidAmount: actualPaid,
      cashReceived: params.paymentMethod === 'CASH' ? params.cashReceived : undefined,
      changeAmount: params.paymentMethod === 'CASH' ? params.changeAmount : undefined,
      items: params.cart.map(ci => ({
        itemId: ci.item.id,
        name: ci.item.name,
        price: ci.item.price,
        count: ci.count,
      })),
      isCancelled: false,
    };

    // Save order
    transaction.set(
      orderDocRef,
      sanitizeForFirestore({
        ...newOrder,
        createdAt: serverTimestamp(),
      })
    );

    // Update totalSold atomically
    for (const read of itemReads) {
      transaction.update(read.ref, {
        totalSold: read.currentSold + read.requestedCount,
        updatedAt: nowIso,
      });
    }

    return newOrder;
  }).then(async order => {
    // Background audit logging (Non-blocking)
    const itemsSummary = params.cart.map(c => `${c.item.name} x${c.count}`).join(', ');
    const buyerSuffix = order.buyerName ? ` [결제자: ${order.buyerName}]` : '';
    const discountSuffix = order.gifticonDiscountAmount && order.gifticonDiscountAmount > 0
      ? ` (할인 적용 -${order.gifticonDiscountAmount.toLocaleString()}원, 실결제 ${(order.actualPaidAmount ?? 0).toLocaleString()}원)`
      : '';

    const isTransfer = params.paymentMethod === 'TRANSFER';
    await logPosActivity({
      action: isTransfer ? 'PTR' : 'PCA',
      actionTitle: isTransfer ? '계좌이체 결제 완료' : '현금 결제 완료',
      category: 'SALE',
      actorId: params.handlerUid || params.handlerName || '판매원',
      actorUid: params.handlerUid,
      sessionId: params.sessionId,
      details: `${isTransfer ? '계좌이체' : '현금'} 결제 ${params.totalAmount.toLocaleString()}원 (${itemsSummary})${buyerSuffix}${discountSuffix}`,
      metadata: {
        orderId: order.id,
        buyerName: order.buyerName || undefined,
        memo: order.memo || undefined,
        paymentMethod: params.paymentMethod,
        totalAmount: params.totalAmount,
        gifticonDiscountAmount: order.gifticonDiscountAmount || 0,
        actualPaidAmount: order.actualPaidAmount ?? params.totalAmount,
        cashReceived: params.cashReceived,
        changeAmount: params.changeAmount,
        itemsCount: params.cart.reduce((sum, c) => sum + c.count, 0),
        items: params.cart.map(c => ({ name: c.item.name, count: c.count, price: c.item.price })),
      },
    }).catch(e => console.warn('Audit log failed:', e));

    return order;
  });
}

/**
 * [트랜잭션 일관성] 결제 취소 시 order 상태 변경 및 품목 재고/누적 판매량 자동 복원을 단일 트랜잭션으로 원자적 처리.
 */
export async function runCancelOrderTransaction(
  orderId: string,
  cancelledBy: string,
  cancelReason?: string
): Promise<void> {
  await ensurePosAuth();

  const orderRef = doc(db, 'orders', orderId);
  let cancelledOrderData: any = null;
  let restoredItemsSummary: string[] = [];

  await runTransaction(db, async transaction => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error('해당 주문 내역을 찾을 수 없습니다.');
    }

    const orderData = orderDoc.data();
    if (orderData.isCancelled) {
      throw new Error('이미 결제 취소 처리된 주문입니다.');
    }

    cancelledOrderData = orderData;
    const items: Array<{ itemId: string; count: number; name: string }> = orderData.items || [];
    restoredItemsSummary = items.map(i => `${i.name} ${i.count}개`);

    // Read current items to adjust totalSold and stock
    const itemReads: Array<{
      ref: ReturnType<typeof doc>;
      currentSold: number;
      currentStock: number;
      countToRestore: number;
    }> = [];

    for (const orderItem of items) {
      const itemRef = doc(db, 'items', orderItem.itemId);
      const itemDoc = await transaction.get(itemRef);
      if (itemDoc.exists()) {
        const data = itemDoc.data();
        itemReads.push({
          ref: itemRef,
          currentSold: typeof data.totalSold === 'number' ? data.totalSold : 0,
          currentStock: typeof data.stock === 'number' ? data.stock : 999,
          countToRestore: orderItem.count,
        });
      }
    }

    const nowIso = new Date().toISOString();

    // Mark order as cancelled
    transaction.update(
      orderRef,
      sanitizeForFirestore({
        isCancelled: true,
        cancelledBy: cancelledBy || '관리자',
        cancelledAt: nowIso,
        cancelReason: cancelReason ? cancelReason.trim() : '단순 변심/고객 요청',
        updatedAt: serverTimestamp(),
      })
    );

    // Restore totalSold and stocks atomically
    for (const read of itemReads) {
      transaction.update(read.ref, {
        totalSold: Math.max(0, read.currentSold - read.countToRestore),
        stock: read.currentStock + read.countToRestore,
        updatedAt: nowIso,
      });
    }
  });

  // Background audit logging
  if (cancelledOrderData) {
    await logPosActivity({
      action: 'PCC',
      actionTitle: '결제 취소 (환불/재고복원)',
      category: 'SALE',
      actorId: cancelledBy || '관리자',
      actorUid: cancelledBy,
      sessionId: cancelledOrderData.sessionId,
      details: `주문번호 #${orderId.slice(-6)} 결제 취소 완료 (${(cancelledOrderData.totalAmount || 0).toLocaleString()}원 환불, 사유: ${cancelReason || '단순 변심'})`,
      metadata: {
        orderId,
        refundAmount: cancelledOrderData.totalAmount,
        cancelReason: cancelReason || '단순 변심',
        restoredItems: restoredItemsSummary,
      },
    }).catch(e => console.warn('Audit log failed:', e));
  }
}

/**
 * [개별/부분 환불 트랜잭션] 주문 내 특정 품목/수량만 선택하여 환불 처리하고 재고 및 판매수량을 원자적으로 복원합니다.
 * 만약 모든 잔여 품목이 환불되면 전체 주문 취소(isCancelled: true)로 자동 전환됩니다.
 */
export async function runPartialCancelOrderTransaction(
  orderId: string,
  refundTargets: Array<{ itemId: string; count: number }>,
  cancelledBy: string,
  cancelReason?: string
): Promise<PosOrder> {
  await ensurePosAuth();

  const validTargets = refundTargets.filter(t => t.itemId && t.count > 0);
  if (validTargets.length === 0) {
    throw new Error('환불할 품목과 수량을 선택해주세요.');
  }

  const orderRef = doc(db, 'orders', orderId);
  let updatedOrderResult: PosOrder | null = null;
  let refundedItemsSummary: string[] = [];
  let thisRefundTotal = 0;
  let becameFullyCancelled = false;

  await runTransaction(db, async transaction => {
    // 1. ALL READS FIRST
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error('해당 주문 내역을 찾을 수 없습니다.');
    }

    const orderData = orderDoc.data() as PosOrder;
    if (orderData.isCancelled) {
      throw new Error('이미 전체 취소된 주문입니다.');
    }

    const currentItems = Array.isArray(orderData.items) ? orderData.items : [];
    const targetMap = new Map<string, number>();
    for (const t of validTargets) {
      targetMap.set(t.itemId, (targetMap.get(t.itemId) || 0) + t.count);
    }

    // Read all target item docs before any writes
    const itemReads: Array<{
      ref: ReturnType<typeof doc>;
      currentSold: number;
      currentStock: number;
      countToRestore: number;
    }> = [];

    for (const [itemId, reqCount] of targetMap.entries()) {
      const orderItem = currentItems.find(i => i.itemId === itemId);
      if (!orderItem) continue;
      const actualRefundCount = Math.min(orderItem.count, reqCount);
      if (actualRefundCount <= 0) continue;

      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await transaction.get(itemRef);
      if (itemDoc.exists()) {
        const data = itemDoc.data();
        itemReads.push({
          ref: itemRef,
          currentSold: typeof data.totalSold === 'number' ? data.totalSold : 0,
          currentStock: typeof data.stock === 'number' ? data.stock : 999,
          countToRestore: actualRefundCount,
        });
      }
    }

    // 2. COMPUTE NEW ORDER STATE
    const nowIso = new Date().toISOString();
    const cleanReason = cancelReason?.trim() || '고객 요청 (개별 품목 환불)';
    const remainingItems: typeof currentItems = [];
    const newlyRefundedItems: NonNullable<PosOrder['refundedItems']> = [];

    thisRefundTotal = 0;
    refundedItemsSummary = [];

    for (const item of currentItems) {
      const reqRefund = targetMap.get(item.itemId) || 0;
      const refundCount = Math.min(item.count, reqRefund);
      const remainCount = item.count - refundCount;

      if (refundCount > 0) {
        thisRefundTotal += item.price * refundCount;
        refundedItemsSummary.push(`${item.name} ${refundCount}개`);
        newlyRefundedItems.push({
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          count: refundCount,
          refundedAt: nowIso,
          refundedBy: cancelledBy || '관리자',
          cancelReason: cleanReason,
        });
      }

      if (remainCount > 0) {
        remainingItems.push({
          ...item,
          count: remainCount,
        });
      }
    }

    if (newlyRefundedItems.length === 0) {
      throw new Error('환불 가능한 품목 수량이 없습니다.');
    }

    const updatedRefundedItems = [
      ...(Array.isArray(orderData.refundedItems) ? orderData.refundedItems : []),
      ...newlyRefundedItems,
    ];
    const updatedRefundedAmount = (orderData.refundedAmount || 0) + thisRefundTotal;

    if (remainingItems.length === 0) {
      // All remaining items were refunded -> mark entire order as cancelled
      becameFullyCancelled = true;

      const patch = {
        items: currentItems, // Preserve last items on cancelled receipt
        refundedItems: updatedRefundedItems,
        refundedAmount: updatedRefundedAmount,
        isCancelled: true,
        cancelledBy: cancelledBy || '관리자',
        cancelledAt: nowIso,
        cancelReason: cleanReason,
      };

      transaction.update(
        orderRef,
        sanitizeForFirestore({
          ...patch,
          updatedAt: serverTimestamp(),
        })
      );

      updatedOrderResult = {
        ...orderData,
        id: orderId,
        ...patch,
      };
    } else {
      // Partial refund -> order remains active with reduced items & amount
      becameFullyCancelled = false;
      const newTotalAmount = remainingItems.reduce((sum, i) => sum + i.price * i.count, 0);
      const discount = orderData.gifticonDiscountAmount || 0;
      const newActualPaidAmount = Math.max(0, newTotalAmount - discount);
      const newChangeAmount =
        orderData.paymentMethod === 'CASH' && typeof orderData.cashReceived === 'number'
          ? Math.max(0, orderData.cashReceived - newActualPaidAmount)
          : orderData.changeAmount;

      const patch: Partial<PosOrder> = {
        items: remainingItems,
        totalAmount: newTotalAmount,
        actualPaidAmount: newActualPaidAmount,
        changeAmount: newChangeAmount,
        refundedItems: updatedRefundedItems,
        refundedAmount: updatedRefundedAmount,
      };

      transaction.update(
        orderRef,
        sanitizeForFirestore({
          ...patch,
          updatedAt: serverTimestamp(),
        })
      );

      updatedOrderResult = {
        ...orderData,
        id: orderId,
        ...patch,
      };
    }

    // 3. UPDATE ITEMS STOCK & TOTAL SOLD
    for (const read of itemReads) {
      transaction.update(read.ref, {
        totalSold: Math.max(0, read.currentSold - read.countToRestore),
        stock: read.currentStock + read.countToRestore,
        updatedAt: nowIso,
      });
    }
  });

  if (!updatedOrderResult) {
    throw new Error('부분 환불 처리 결과를 생성하지 못했습니다.');
  }

  const finalOrder: PosOrder = updatedOrderResult;

  // Audit Log
  await logPosActivity({
    action: 'PCC',
    actionTitle: becameFullyCancelled ? '결제 취소 (전체 품목 환불)' : '개별 품목 부분 환불 (재고복원)',
    category: 'SALE',
    actorId: cancelledBy || '관리자',
    actorName: cancelledBy || '관리자',
    actorUid: cancelledBy,
    sessionId: finalOrder.sessionId,
    details: becameFullyCancelled
      ? `주문번호 #${orderId.slice(-6)} 잔여 품목 전체 환불로 주문 취소 처리 (${refundedItemsSummary.join(', ')}, -${thisRefundTotal.toLocaleString()}원)`
      : `주문번호 #${orderId.slice(-6)} 개별 품목 부분 환불 완료 [${refundedItemsSummary.join(', ')}] (-${thisRefundTotal.toLocaleString()}원 환불 → 잔여 결제액 ${(finalOrder.actualPaidAmount ?? finalOrder.totalAmount).toLocaleString()}원, 사유: ${cancelReason || '고객 요청'})`,
    metadata: {
      orderId,
      isPartialRefund: !becameFullyCancelled,
      refundAmount: thisRefundTotal,
      remainingAmount: finalOrder.actualPaidAmount ?? finalOrder.totalAmount,
      refundedItems: refundedItemsSummary,
      cancelReason: cancelReason || '고객 요청',
    },
  }).catch(e => console.warn('Audit log failed:', e));

  return finalOrder;
}

/**
 * [트랜잭션 일관성] 결제 취소(전체 환불) 철회 및 정상 결제 복원
 * - orders.isCancelled: false, cancelledBy/cancelledAt/cancelReason 삭제
 * - 환불 시 복구되었던 재고와 누적 판매량을 다시 판매 상태로 재반영 (stock 차감, totalSold 증가)
 */
export async function runRestoreCancelledOrderTransaction(
  orderId: string,
  restoredBy: string,
  restoreStock = true
): Promise<PosOrder> {
  await ensurePosAuth();

  const orderRef = doc(db, 'orders', orderId);
  let restoredOrderResult: PosOrder | null = null;
  let affectedItemsSummary: string[] = [];

  await runTransaction(db, async transaction => {
    // 1. ALL READS FIRST
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error('해당 주문 내역을 찾을 수 없습니다.');
    }

    const orderData = orderDoc.data() as PosOrder;
    if (!orderData.isCancelled) {
      throw new Error('결제 취소 상태가 아닌 주문입니다.');
    }

    const items: Array<{ itemId: string; count: number; name: string }> = Array.isArray(orderData.items) ? orderData.items : [];
    affectedItemsSummary = items.map(i => `${i.name} ${i.count}개`);

    const itemReads: Array<{
      ref: ReturnType<typeof doc>;
      currentSold: number;
      currentStock: number;
      countToDeduct: number;
    }> = [];

    if (restoreStock) {
      for (const orderItem of items) {
        if (!orderItem.itemId) continue;
        const itemRef = doc(db, 'items', orderItem.itemId);
        const itemDoc = await transaction.get(itemRef);
        if (itemDoc.exists()) {
          const data = itemDoc.data();
          itemReads.push({
            ref: itemRef,
            currentSold: typeof data.totalSold === 'number' ? data.totalSold : 0,
            currentStock: typeof data.stock === 'number' ? data.stock : 999,
            countToDeduct: orderItem.count,
          });
        }
      }
    }

    // 2. ALL WRITES AFTER READS
    const nowIso = new Date().toISOString();

    transaction.update(
      orderRef,
      sanitizeForFirestore({
        isCancelled: false,
        cancelledBy: deleteField(),
        cancelledAt: deleteField(),
        cancelReason: deleteField(),
        updatedAt: serverTimestamp(),
      })
    );

    if (restoreStock) {
      for (const read of itemReads) {
        transaction.update(read.ref, {
          totalSold: read.currentSold + read.countToDeduct,
          stock: Math.max(0, read.currentStock - read.countToDeduct),
          updatedAt: nowIso,
        });
      }
    }

    restoredOrderResult = {
      ...orderData,
      id: orderId,
      isCancelled: false,
      cancelledBy: undefined,
      cancelledAt: undefined,
      cancelReason: undefined,
    };
  });

  if (!restoredOrderResult) {
    throw new Error('주문 복원 결과를 생성하지 못했습니다.');
  }

  const finalOrder = restoredOrderResult;

  await logPosActivity({
    action: 'PCR',
    actionTitle: '결제 취소(환불) 철회 및 정상 복원',
    category: 'SALE',
    actorId: restoredBy || '관리자',
    actorName: restoredBy || '관리자',
    sessionId: finalOrder.sessionId,
    details: `주문번호 #${orderId.slice(-6)} 결제 취소(환불) 철회 완료 (정상 결제 상태로 복원, ${affectedItemsSummary.join(', ')} 판매량 재반영)`,
    metadata: {
      orderId,
      restoredBy,
      restoreStock,
      totalAmount: finalOrder.totalAmount,
    },
  }).catch(e => console.warn('Audit log failed:', e));

  return finalOrder;
}

/**
 * [개별/부분 환불 취소/철회 트랜잭션] 특정 부분 환불 품목의 환불을 취소하고 원래 주문 품목으로 복원합니다.
 * - order.refundedItems에서 해당 품목 수량 차감(또는 제거)
 * - order.items에 해당 품목 수량 복원(또는 추가)
 * - order.totalAmount, order.actualPaidAmount, order.changeAmount 자동 재계산
 * - 상품 재고 stock 차감 및 totalSold 증가
 * - 만약 해당 주문이 전체 취소(isCancelled: true) 상태였다면 정상 결제 상태로 자동 복원
 */
export async function runRestorePartialRefundTransaction(
  orderId: string,
  restoreTargets: Array<{ itemId: string; count: number; name?: string; price?: number }>,
  restoredBy: string,
  restoreStock = true
): Promise<PosOrder> {
  await ensurePosAuth();

  const validTargets = restoreTargets.filter(t => t.itemId && t.count > 0);
  if (validTargets.length === 0) {
    throw new Error('복원할 환불 품목을 선택해주세요.');
  }

  const orderRef = doc(db, 'orders', orderId);
  let updatedOrderResult: PosOrder | null = null;
  let restoredSummary: string[] = [];
  let restoredMoneyTotal = 0;

  await runTransaction(db, async transaction => {
    // 1. ALL READS FIRST
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error('해당 주문 내역을 찾을 수 없습니다.');
    }

    const orderData = orderDoc.data() as PosOrder;
    const currentRefundedItems: PosRefundedItem[] = Array.isArray(orderData.refundedItems) ? [...orderData.refundedItems] : [];
    if (currentRefundedItems.length === 0) {
      throw new Error('복원할 수 있는 부분 환불 내역이 없습니다.');
    }

    const targetMap = new Map<string, number>();
    for (const t of validTargets) {
      targetMap.set(t.itemId, (targetMap.get(t.itemId) || 0) + t.count);
    }

    // Read item docs if restoreStock is true
    const itemReads: Array<{
      ref: ReturnType<typeof doc>;
      currentSold: number;
      currentStock: number;
      countToDeduct: number;
    }> = [];

    if (restoreStock) {
      for (const [itemId, reqCount] of targetMap.entries()) {
        const itemRef = doc(db, 'items', itemId);
        const itemDoc = await transaction.get(itemRef);
        if (itemDoc.exists()) {
          const data = itemDoc.data();
          itemReads.push({
            ref: itemRef,
            currentSold: typeof data.totalSold === 'number' ? data.totalSold : 0,
            currentStock: typeof data.stock === 'number' ? data.stock : 999,
            countToDeduct: reqCount,
          });
        }
      }
    }

    // 2. COMPUTE NEW ORDER STATE
    const newItems: PosOrderItem[] = Array.isArray(orderData.items) ? [...orderData.items] : [];
    const newRefundedItems: PosRefundedItem[] = [];
    restoredSummary = [];
    restoredMoneyTotal = 0;

    for (const refItem of currentRefundedItems) {
      const neededCount = targetMap.get(refItem.itemId) || 0;
      if (neededCount <= 0) {
        newRefundedItems.push(refItem);
        continue;
      }

      const countToRevert = Math.min(refItem.count, neededCount);
      targetMap.set(refItem.itemId, neededCount - countToRevert);
      restoredMoneyTotal += refItem.price * countToRevert;
      restoredSummary.push(`${refItem.name} ${countToRevert}개`);

      // Put back to active items
      const existingItemIndex = newItems.findIndex(i => i.itemId === refItem.itemId);
      if (existingItemIndex >= 0) {
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          count: newItems[existingItemIndex].count + countToRevert,
        };
      } else {
        newItems.push({
          itemId: refItem.itemId,
          name: refItem.name,
          price: refItem.price,
          count: countToRevert,
        });
      }

      const remainRefundCount = refItem.count - countToRevert;
      if (remainRefundCount > 0) {
        newRefundedItems.push({
          ...refItem,
          count: remainRefundCount,
        });
      }
    }

    const newRefundedAmount = Math.max(0, (orderData.refundedAmount || 0) - restoredMoneyTotal);
    const newTotalAmount = newItems.reduce((sum, i) => sum + i.price * i.count, 0);
    const discount = orderData.gifticonDiscountAmount || 0;
    const newActualPaidAmount = Math.max(0, newTotalAmount - discount);
    const newChangeAmount =
      orderData.paymentMethod === 'CASH' && typeof orderData.cashReceived === 'number'
        ? Math.max(0, orderData.cashReceived - newActualPaidAmount)
        : (typeof orderData.changeAmount === 'number' ? orderData.changeAmount : undefined);

    const patch: Record<string, any> = {
      items: newItems,
      refundedItems: newRefundedItems,
      refundedAmount: newRefundedAmount,
      totalAmount: newTotalAmount,
      actualPaidAmount: newActualPaidAmount,
      isCancelled: false, // Reopen order if it was marked cancelled
      cancelledAt: deleteField(),
      cancelledBy: deleteField(),
      cancelReason: deleteField(),
      updatedAt: serverTimestamp(),
    };

    if (newChangeAmount !== undefined) {
      patch.changeAmount = newChangeAmount;
    }

    transaction.update(orderRef, sanitizeForFirestore(patch));

    if (restoreStock) {
      const nowIso = new Date().toISOString();
      for (const read of itemReads) {
        transaction.update(read.ref, {
          totalSold: read.currentSold + read.countToDeduct,
          stock: Math.max(0, read.currentStock - read.countToDeduct),
          updatedAt: nowIso,
        });
      }
    }

    updatedOrderResult = {
      ...orderData,
      id: orderId,
      items: newItems,
      refundedItems: newRefundedItems,
      refundedAmount: newRefundedAmount,
      totalAmount: newTotalAmount,
      actualPaidAmount: newActualPaidAmount,
      changeAmount: newChangeAmount,
      isCancelled: false,
      cancelledAt: undefined,
      cancelledBy: undefined,
      cancelReason: undefined,
    };
  });

  if (!updatedOrderResult) {
    throw new Error('부분 환불 취소 결과를 생성하지 못했습니다.');
  }

  const finalOrder = updatedOrderResult;

  await logPosActivity({
    action: 'PCR',
    actionTitle: '개별 품목 환불 취소 (품목 복원)',
    category: 'SALE',
    actorId: restoredBy || '관리자',
    actorName: restoredBy || '관리자',
    sessionId: finalOrder.sessionId,
    details: `주문번호 #${orderId.slice(-6)} 부분 환불 취소 완료 [${restoredSummary.join(', ')}] (+${restoredMoneyTotal.toLocaleString()}원 복원 → 실결제 ${(finalOrder.actualPaidAmount ?? finalOrder.totalAmount).toLocaleString()}원)`,
    metadata: {
      orderId,
      restoredBy,
      restoredItems: restoredSummary,
      restoredAmount: restoredMoneyTotal,
    },
  }).catch(e => console.warn('Audit log failed:', e));

  return finalOrder;
}

/**
 * Fast atomic update for a single POS item (stock adjustment, favorite toggle, active state, name, etc.)
 */
export async function saveSinglePosItemPartial(
  itemId: string,
  patch: Partial<PosItem>,
  actorName = '근무자',
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  const itemRef = doc(db, 'items', itemId);
  const cleanPatch: Record<string, any> = {
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(itemRef, sanitizeForFirestore(cleanPatch), { merge: true });

  // Optional lightweight log for stock / status adjustments
  if (patch.stock !== undefined || patch.isActive !== undefined || patch.price !== undefined || patch.name !== undefined) {
    logPosActivity({
      action: 'IUP',
      actionTitle: '상품 정보 수정',
      category: 'INVENTORY',
      actorName,
      actorUid,
      details: `상품 [#${itemId.slice(-6)}] 업데이트 (${Object.entries(patch)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')})`,
      metadata: { itemId, ...patch },
    }).catch(() => {});
  }
}

/**
 * Batch save modified items with custom summary log to prevent log spamming
 */
export async function saveBatchPosItemsWithSummary(
  changedItems: PosItem[],
  logSummaryDetails: string,
  actorName = '근무자',
  extraMetadata?: Record<string, any>,
  actorUid?: string
): Promise<void> {
  if (changedItems.length === 0) return;
  await ensurePosAuth();
  const chunkSize = 400;
  for (let i = 0; i < changedItems.length; i += chunkSize) {
    const chunk = changedItems.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    for (const item of chunk) {
      const itemRef = doc(db, 'items', item.id);
      batch.set(
        itemRef,
        sanitizeForFirestore({
          name: item.name || '',
          categoryId: item.categoryId || '',
          price: typeof item.price === 'number' ? item.price : 0,
          stock: typeof item.stock === 'number' ? item.stock : 999,
          isSoldOut: Boolean(item.isSoldOut),
          totalSold: typeof item.totalSold === 'number' ? item.totalSold : 0,
          isFavorite: Boolean(item.isFavorite),
          isActive: item.isActive !== false,
          barcode: item.barcode || '',
          updatedAt: item.updatedAt || nowIso,
        }),
        { merge: true }
      );
    }
    await batch.commit();
  }

  logPosActivity({
    action: 'IMU',
    actionTitle: '상품 정보/품절상태 일괄 저장',
    category: 'INVENTORY',
    actorName,
    actorUid,
    details: logSummaryDetails || `총 ${changedItems.length}개 상품 변경사항 일괄 저장`,
    metadata: {
      count: changedItems.length,
      itemNames: changedItems.map(it => it.name).slice(0, 15),
      ...extraMetadata,
    },
  }).catch(() => {});
}

/**
 * Fast batch save for multiple POS items (atomic commit, eliminates subscription lag & reversion)
 */
export async function saveMultiplePosItems(
  items: PosItem[],
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  if (items.length === 0) return;
  await ensurePosAuth();
  const chunkSize = 400;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    for (const item of chunk) {
      const itemRef = doc(db, 'items', item.id);
      batch.set(
        itemRef,
        sanitizeForFirestore({
          name: item.name || '',
          categoryId: item.categoryId || '',
          price: typeof item.price === 'number' ? item.price : 0,
          stock: typeof item.stock === 'number' ? item.stock : 999,
          isSoldOut: Boolean(item.isSoldOut),
          totalSold: typeof item.totalSold === 'number' ? item.totalSold : 0,
          isFavorite: Boolean(item.isFavorite),
          isActive: item.isActive !== false,
          barcode: item.barcode || '',
          updatedAt: item.updatedAt || nowIso,
        }),
        { merge: true }
      );
    }
    await batch.commit();
  }

  logPosActivity({
    action: 'IMU',
    actionTitle: '상품 다중 일괄 업데이트',
    category: 'INVENTORY',
    actorName,
    actorUid,
    details: `총 ${items.length}개 상품 데이터 일괄 동기화`,
    metadata: { count: items.length },
  }).catch(() => {});
}

/**
 * Save or update a single POS item.
 */
export async function savePosItem(
  item: Partial<PosItem> & { id?: string },
  actorName = '관리자',
  actorUid?: string
): Promise<string> {
  await ensurePosAuth();
  const isNew = !item.id;
  const id = item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const itemRef = doc(db, 'items', id);
  await setDoc(
    itemRef,
    sanitizeForFirestore({
      name: item.name || '',
      categoryId: item.categoryId || '',
      price: item.price || 0,
      stock: typeof item.stock === 'number' ? item.stock : 999,
      isSoldOut: Boolean(item.isSoldOut),
      totalSold: typeof item.totalSold === 'number' ? item.totalSold : 0,
      isFavorite: Boolean(item.isFavorite),
      isActive: item.isActive !== false,
      barcode: item.barcode || '',
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );

  const diffs: any[] = [];
  if (item.price !== undefined) diffs.push({ field: 'price', label: '판매 가격', from: isNew ? '신규' : '-', to: `${(item.price || 0).toLocaleString()}원` });
  if (item.isSoldOut !== undefined) diffs.push({ field: 'isSoldOut', label: '품절 상태', from: '-', to: item.isSoldOut ? '품절' : '판매중' });
  if (item.stock !== undefined) diffs.push({ field: 'stock', label: '재고 수량', from: isNew ? '초기' : '-', to: `${item.stock ?? 0}개` });
  if (item.isActive !== undefined) diffs.push({ field: 'isActive', label: '판매 상태', from: '-', to: item.isActive !== false ? '판매중' : '판매중단' });

  logPosActivity({
    action: isNew ? 'ICR' : 'IUP',
    actionTitle: isNew ? '신규 상품 등록' : '상품 정보 수정',
    category: 'INVENTORY',
    actorName,
    actorUid,
    details: `상품 [${item.name || '미정'}] ${isNew ? '신규 등록' : '정보 수정'} (가격: ${(item.price || 0).toLocaleString()}원, 상태: ${item.isSoldOut ? '품절' : '판매중'})`,
    metadata: {
      itemId: id,
      name: item.name,
      price: item.price,
      isSoldOut: item.isSoldOut,
      stock: item.stock,
      barcode: item.barcode,
      itemChanges: [
        {
          itemId: id,
          itemName: item.name || '미정',
          changeType: isNew ? 'CREATED' : 'MULTIPLE',
          summary: isNew ? `신규 상품 등록 (가격: ${(item.price || 0).toLocaleString()}원, 초기 재고: ${item.stock ?? 0}개)` : '상품 정보 수정',
          diffs,
        },
      ],
    },
  }).catch(() => {});

  return id;
}

/**
 * Delete a POS item.
 */
export async function deletePosItem(
  id: string,
  itemName?: string,
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  await deleteDoc(doc(db, 'items', id));

  logPosActivity({
    action: 'IDL',
    actionTitle: '상품 삭제',
    category: 'INVENTORY',
    actorName,
    actorUid,
    details: `상품 [${itemName || id}] 영구 삭제`,
    metadata: {
      itemId: id,
      itemName,
      itemChanges: [
        {
          itemId: id,
          itemName: itemName || id,
          changeType: 'STATUS',
          summary: '상품 데이터 영구 삭제',
        },
      ],
    },
  }).catch(() => {});
}

/**
 * Batch save multiple POS categories with a single consolidated log.
 */
export async function saveBatchPosCategories(
  categories: PosCategory[],
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  if (categories.length === 0) return;
  await ensurePosAuth();

  // Deduplicate categories by clean name
  const uniqueCats = new Map<string, PosCategory>();
  categories.forEach((cat, idx) => {
    const cleanName = cat.name.trim();
    if (cleanName && !uniqueCats.has(cleanName.toLowerCase())) {
      uniqueCats.set(cleanName.toLowerCase(), {
        name: cleanName,
        orderIndex: typeof cat.orderIndex === 'number' ? cat.orderIndex : idx + 1,
      });
    }
  });

  const batch = writeBatch(db);
  for (const cat of uniqueCats.values()) {
    const catRef = doc(db, 'categories', cat.name);
    batch.set(
      catRef,
      {
        name: cat.name,
        orderIndex: cat.orderIndex,
      },
      { merge: true }
    );
  }
  await batch.commit();

  logPosActivity({
    action: 'CMU',
    actionTitle: '카테고리 구성 일괄 저장',
    category: 'INVENTORY',
    actorName,
    actorUid,
    details: `카테고리 목록 (${Array.from(uniqueCats.values()).map(c => c.name).join(', ')}) 일괄 변경 저장`,
    metadata: { count: uniqueCats.size },
  }).catch(() => {});
}

/**
 * Save or update a single POS category.
 */
export async function savePosCategory(
  cat: PosCategory,
  actorName = '관리자',
  shouldLog = true,
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  const cleanName = cat.name.trim();
  const catRef = doc(db, 'categories', cleanName);
  await setDoc(
    catRef,
    {
      name: cleanName,
      orderIndex: cat.orderIndex,
    },
    { merge: true }
  );

  if (shouldLog) {
    logPosActivity({
      action: 'CUP',
      actionTitle: '카테고리 정보 저장',
      category: 'INVENTORY',
      actorName,
      actorUid,
      details: `카테고리 [${cleanName}] 정보 저장 (순서: ${cat.orderIndex})`,
      metadata: { categoryId: cleanName, name: cleanName, orderIndex: cat.orderIndex },
    }).catch(() => {});
  }
}

/**
 * Delete a POS category.
 */
export async function deletePosCategory(
  id: string,
  catName?: string,
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  await deleteDoc(doc(db, 'categories', id));
  if (catName && catName !== id) {
    try {
      await deleteDoc(doc(db, 'categories', catName));
    } catch {}
  }

  logPosActivity({
    action: 'CDL',
    actionTitle: '카테고리 삭제',
    category: 'INVENTORY',
    actorName,
    actorUid,
    details: `카테고리 [${catName || id}] 삭제`,
    metadata: { categoryId: id, catName },
  }).catch(() => {});
}

/**
 * Save or update settlement report for a session.
 */
export async function savePosSettlement(
  settlement: PosSettlement,
  actorName = '담당자'
): Promise<void> {
  await ensurePosAuth();
  const docRef = doc(db, 'settlements', settlement.id);
  await setDoc(
    docRef,
    sanitizeForFirestore({
      ...settlement,
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );

  const isClosed = settlement.status === 'CLOSED';
  const isNormal = (settlement.discrepancy === 0 || !settlement.discrepancy);
  const actionCode = isClosed ? (isNormal ? 'SOO' : 'SXX') : 'SUP';
  const actionTitle = isClosed
    ? (isNormal ? '마감 정산 정상 완료 (일치)' : '마감 정산 불일치 경고 (오차 발생)')
    : '영업 준비금/일지 수정';

  logPosActivity({
    action: actionCode,
    actionTitle,
    category: 'SETTLEMENT',
    actorName: isClosed ? (settlement.closedBy || actorName) : (settlement.openedBy || actorName),
    sessionId: settlement.id,
    details: isClosed
      ? `[${settlement.id}] 영업 마감 완료 (실수납 매출: ${settlement.totalSales.toLocaleString()}원${settlement.gifticonSales ? `, 할인: -${settlement.gifticonSales.toLocaleString()}원` : ''}, 오차: ${(settlement.discrepancy || 0).toLocaleString()}원)`
      : `[${settlement.id}] 영업 개시 (준비금: ${settlement.initialCash.toLocaleString()}원)`,
    metadata: {
      sessionId: settlement.id,
      status: settlement.status,
      grossSales: settlement.grossSales,
      gifticonSales: settlement.gifticonSales,
      totalSales: settlement.totalSales,
      transferSales: settlement.transferSales,
      cashSales: settlement.cashSales,
      initialCash: settlement.initialCash,
      actualCashInput: settlement.actualCashInput,
      discrepancy: settlement.discrepancy,
    },
  }).catch(() => {});
}

/**
 * [관리자 전용] 일일 정산 보고서 삭제
 */
export async function deletePosSettlement(
  settlementId: string,
  actorName = '관리자'
): Promise<void> {
  await ensurePosAuth();
  const docRef = doc(db, 'settlements', settlementId);
  await deleteDoc(docRef);

  logPosActivity({
    action: 'SDL',
    actionTitle: '마감 일지 삭제',
    category: 'SETTLEMENT',
    actorName,
    sessionId: settlementId,
    details: `[${settlementId}] 일일 마감 정산 보고서가 관리자에 의해 삭제되었습니다.`,
  }).catch(() => {});
}

/**
 * [관리자 전용] 매출 내역(주문) 직접 수정
 */
export async function updatePosOrder(order: PosOrder, actorName = '관리자'): Promise<void> {
  await ensurePosAuth();
  const orderRef = doc(db, 'orders', order.id);
  const discount = typeof order.gifticonDiscountAmount === 'number' ? Math.max(0, order.gifticonDiscountAmount) : 0;
  const actualPaid =
    typeof order.actualPaidAmount === 'number'
      ? Math.max(0, order.actualPaidAmount)
      : Math.max(0, order.totalAmount - discount);

  const dataToSave: Record<string, any> = {
    ...order,
    gifticonDiscountAmount: discount,
    actualPaidAmount: actualPaid,
    usedGifticons: Array.isArray(order.usedGifticons) ? order.usedGifticons : [],
    refundedItems: Array.isArray(order.refundedItems) ? order.refundedItems : [],
    refundedAmount: typeof order.refundedAmount === 'number' ? order.refundedAmount : 0,
    updatedAt: serverTimestamp(),
  };

  if (!order.isCancelled) {
    dataToSave.cancelledBy = deleteField();
    dataToSave.cancelledAt = deleteField();
    dataToSave.cancelReason = deleteField();
  }

  await setDoc(orderRef, sanitizeForFirestore(dataToSave), { merge: true });

  logPosActivity({
    action: 'PUP',
    actionTitle: '결제/매출 정보 직접 수정',
    category: 'SALE',
    actorName,
    sessionId: order.sessionId,
    details: `주문번호 #${order.id.slice(-6)} 내역 수정 (금액: ${(order.actualPaidAmount ?? order.totalAmount).toLocaleString()}원, 품목수: ${order.items.length}개, 부분환불: ${(order.refundedItems || []).length}개)`,
    metadata: {
      orderId: order.id,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      isCancelled: order.isCancelled,
      refundedCount: (order.refundedItems || []).length,
    },
  }).catch(() => {});
}

/**
 * [관리자 전용] 매출 내역(주문) 완전 삭제 (미취소 주문일 시 판매 수량 복구)
 */
export async function deletePosOrder(orderId: string, actorName = '관리자'): Promise<void> {
  await ensurePosAuth();
  const orderRef = doc(db, 'orders', orderId);

  try {
    await runTransaction(db, async transaction => {
      // 1. ALL READS MUST HAPPEN BEFORE ANY WRITES IN FIRESTORE TRANSACTIONS
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) return;

      const orderData = orderDoc.data() as PosOrder;
      const itemReads: Array<{
        ref: ReturnType<typeof doc>;
        currentSold: number;
        currentStock: number;
        countToRestore: number;
      }> = [];

      // If order was active (not cancelled), read all items first
      if (!orderData.isCancelled && Array.isArray(orderData.items)) {
        // Aggregate counts by itemId in case the same item appears multiple times
        const itemCountMap = new Map<string, number>();
        for (const orderItem of orderData.items) {
          if (!orderItem.itemId) continue;
          itemCountMap.set(orderItem.itemId, (itemCountMap.get(orderItem.itemId) || 0) + (orderItem.count || 0));
        }

        for (const [itemId, countToRestore] of itemCountMap.entries()) {
          const itemRef = doc(db, 'items', itemId);
          const itemDoc = await transaction.get(itemRef);
          if (itemDoc.exists()) {
            const itemData = itemDoc.data();
            itemReads.push({
              ref: itemRef,
              currentSold: typeof itemData.totalSold === 'number' ? itemData.totalSold : 0,
              currentStock: typeof itemData.stock === 'number' ? itemData.stock : 999,
              countToRestore,
            });
          }
        }
      }

      // 2. NOW EXECUTE ALL WRITES AFTER ALL READS HAVE COMPLETED
      const nowIso = new Date().toISOString();
      for (const read of itemReads) {
        transaction.update(read.ref, {
          totalSold: Math.max(0, read.currentSold - read.countToRestore),
          stock: read.currentStock + read.countToRestore,
          updatedAt: nowIso,
        });
      }

      transaction.delete(orderRef);
    });
  } catch (txError) {
    console.warn('Transaction failed in deletePosOrder, falling back to direct delete:', txError);
    await deleteDoc(orderRef);
  }

  logPosActivity({
    action: 'PDL',
    actionTitle: '매출 내역 삭제 및 판매수량 복구',
    category: 'SALE',
    actorName,
    details: `주문번호 #${orderId.slice(-6)} 내역 영구 삭제 (판매 수량 복구 처리)`,
    metadata: { orderId },
  }).catch(() => {});
}

/**
 * [관리자 전용] 여러 매출 내역(주문) 일괄 삭제 (미취소 주문일 시 판매 수량 일괄 복구)
 */
export async function deleteMultiplePosOrders(orderIds: string[], actorName = '관리자'): Promise<void> {
  if (!orderIds || orderIds.length === 0) return;
  await ensurePosAuth();

  for (const id of orderIds) {
    await deletePosOrder(id, actorName);
  }

  logPosActivity({
    action: 'PDL',
    actionTitle: '매출 내역 일괄 영구 삭제',
    category: 'SALE',
    actorName,
    details: `총 ${orderIds.length}건의 주문 내역 일괄 삭제 (판매 수량 자동 복구)`,
    metadata: { deletedCount: orderIds.length, orderIds: orderIds.slice(0, 10) },
  }).catch(() => {});
}

/**
 * [즐겨찾기 관리] 모든 상품의 즐겨찾기 일괄 해제
 */
export async function clearAllPosFavorites(
  items: PosItem[],
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  const favoriteItems = items.filter(i => i.isFavorite);
  if (favoriteItems.length === 0) return;
  await ensurePosAuth();

  const chunkSize = 400;
  for (let i = 0; i < favoriteItems.length; i += chunkSize) {
    const chunk = favoriteItems.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const itemRef = doc(db, 'items', item.id);
      batch.update(itemRef, { isFavorite: false, updatedAt: new Date().toISOString() });
    }
    await batch.commit();
  }

  logPosActivity({
    action: 'FAVORITES_CLEARED',
    actionTitle: '즐겨찾기 전체 해제',
    category: 'INVENTORY',
    actorName,
    actorUid,
    details: `즐겨찾기 등록 상품 ${favoriteItems.length}개 일괄 해제`,
    metadata: { count: favoriteItems.length },
  }).catch(() => {});
}

/**
 * [프리셋 적용] 선택한 프리셋의 카테고리 및 상품들을 현재 POS 메뉴로 교체 적용
 */
export async function applyPosPreset(
  categories: PosCategory[],
  items: PosItem[],
  presetName = '프리셋',
  actorName = '관리자',
  presetId?: string,
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();

  // 1. Build category mapping dictionary to resolve any legacy or raw IDs to clean category names
  const catMap = new Map<string, string>();
  const normalizedCats: PosCategory[] = [];

  categories.forEach((cat, idx) => {
    const cleanName = (cat.name || '').trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    if (!catMap.has(key)) {
      const orderIdx = typeof cat.orderIndex === 'number' ? cat.orderIndex : idx + 1;
      normalizedCats.push({
        name: cleanName,
        orderIndex: orderIdx,
      });
      catMap.set(key, cleanName);
      if ((cat as any).id) {
        catMap.set(String((cat as any).id).trim().toLowerCase(), cleanName);
      }
    }
  });

  // 2. Delete all existing items & categories from Firestore
  const itemsSnapshot = await getDocs(collection(db, 'items'));
  const catsSnapshot = await getDocs(collection(db, 'categories'));

  const batch1 = writeBatch(db);
  itemsSnapshot.forEach(docSnap => {
    batch1.delete(docSnap.ref);
  });
  catsSnapshot.forEach(docSnap => {
    batch1.delete(docSnap.ref);
  });
  await batch1.commit();

  // 3. Batch insert new preset categories and items (if any)
  if (normalizedCats.length > 0 || items.length > 0) {
    const batch2 = writeBatch(db);

    for (const cat of normalizedCats) {
      const catRef = doc(db, 'categories', cat.name);
      batch2.set(catRef, {
        name: cat.name,
        orderIndex: cat.orderIndex,
      });
    }

    const fallbackCatName = normalizedCats[0]?.name || '기타';
    for (const item of items) {
      const itemRef = doc(db, 'items', item.id);
      const rawCatId = (item.categoryId || '').trim();
      const catKey = rawCatId.toLowerCase();
      const resolvedCategory =
        catMap.get(catKey) ||
        catMap.get(catKey.replace(/^cat-/, '')) ||
        rawCatId ||
        fallbackCatName;

      batch2.set(itemRef, {
        name: item.name,
        categoryId: resolvedCategory,
        price: item.price,
        stock: item.stock ?? 999,
        isSoldOut: Boolean(item.isSoldOut),
        totalSold: 0,
        isFavorite: Boolean(item.isFavorite),
        isActive: item.isActive !== false,
        barcode: item.barcode || '',
        updatedAt: new Date().toISOString(),
      });
    }

    await batch2.commit();
  }

  logPosActivity({
    action: 'PSA',
    actionTitle: '메뉴 프리셋 적용',
    category: 'SYSTEM',
    actorName,
    actorUid,
    details: `[${presetName}] 메뉴 프리셋 적용 완료${presetId ? ` (ID: ${presetId})` : ''}`,
    metadata: {
      presetId: presetId || '',
      presetName,
    },
  }).catch(() => {});
}

/**
 * Subscribe to saved custom POS presets
 */
export function subscribePosPresets(
  onData: (presets: PosPreset[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, 'pos_presets');
  return onSnapshot(
    colRef,
    snapshot => {
      const presets: PosPreset[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '무제 프리셋',
          description: data.description || '',
          isBuiltIn: false,
          categories: Array.isArray(data.categories) ? data.categories : [],
          items: Array.isArray(data.items) ? data.items : [],
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
        };
      });
      onData(presets);
    },
    err => {
      console.error('Firestore pos_presets subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a custom POS preset
 */
export async function savePosPreset(
  preset: PosPreset,
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  const presetRef = doc(db, 'pos_presets', preset.id);
  await setDoc(
    presetRef,
    sanitizeForFirestore({
      ...preset,
      updatedAt: new Date().toISOString(),
      createdAt: preset.createdAt || new Date().toISOString(),
    }),
    { merge: true }
  );

  logPosActivity({
    action: 'PSO',
    actionTitle: '메뉴 프리셋 저장',
    category: 'SYSTEM',
    actorName,
    actorUid,
    details: `커스텀 프리셋 [${preset.name}] 저장 (품목 ${preset.items?.length || 0}개, 카테고리 ${preset.categories?.length || 0}개)`,
    metadata: { presetId: preset.id, presetName: preset.name },
  }).catch(() => {});
}

/**
 * Delete a custom POS preset
 */
export async function deletePosPreset(
  presetId: string,
  presetName?: string,
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  const presetRef = doc(db, 'pos_presets', presetId);
  await deleteDoc(presetRef);

  logPosActivity({
    action: 'PSD',
    actionTitle: '메뉴 프리셋 삭제',
    category: 'SYSTEM',
    actorName,
    actorUid,
    details: `커스텀 프리셋 [${presetName || presetId}] 삭제`,
    metadata: { presetId, presetName },
  }).catch(() => {});
}

/**
 * Clean up existing categories/items and reseed with default fresh list
 */
export async function resetPosDataToDefaults(
  defaultCategories: PosCategory[],
  defaultItems: PosItem[],
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  await applyPosPreset(defaultCategories, defaultItems, '한철고 매점 기본 메뉴 (33종)', actorName, 'preset-default-33', actorUid);
}

/**
 * =====================================================================
 * POS 통합 감사 로그 (Audit & Activity Logs) 서비스
 * =====================================================================
 */

/**
 * 3글자 표준 접두어 + 발생 시각(YYYYMMDDHHmmss) + 밀리초(SSS, 3자리: 000~999)
 * 예: 현금 결제(PCA) 2026-10-21 19:37:22.482 -> PCA20261021193722482
 */
export function generatePosLogId(actionCode: string, date: Date = new Date()): string {
  const prefix = (actionCode || 'SYS').slice(0, 3).toUpperCase().padEnd(3, 'X');
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const MM = String(date.getMinutes()).padStart(2, '0');
  const SS = String(date.getSeconds()).padStart(2, '0');
  const SSS = String(date.getMilliseconds()).padStart(3, '0');
  return `${prefix}${yyyy}${mm}${dd}${HH}${MM}${SS}${SSS}`;
}

/**
 * 로그 시스템 전면 개편 전 임시 전역 비활성화 플래그 (개편 완료 후 재활성화 예정)
 */
export const IS_POS_AUDIT_LOG_ENABLED = false;

/**
 * Record a new audit log entry into Firestore.
 */
export async function logPosActivity(
  log: Omit<PosAuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): Promise<string> {
  // 로그 시스템 전면 개편 작업 진행 중으로 사이트 전체 로그 기록 비활성화
  if (!IS_POS_AUDIT_LOG_ENABLED) {
    return '';
  }

  try {
    await ensurePosAuth();
    const now = new Date();
    const id = log.id || generatePosLogId(log.action, now);
    const logDocRef = doc(db, 'pos_logs', id);
    const timestamp = log.timestamp || now.toISOString();
    const defaultSessionId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 원문 JSON 또는 메타데이터만 단독으로 열람하더라도
    // 작업 성격(결제 완료, 상품 수정, 취소 환불 등)을 명확히 식별할 수 있도록 기본 필드 명시 보강
    const enrichedMetadata: Record<string, any> = {
      eventType: log.action,
      eventTitle: log.actionTitle,
      eventCategory: log.category,
      summary: log.details,
      ...(log.metadata || {}),
    };

    const actorId = log.actorId || log.actorUid || (log.actorName ? log.actorName.replace(/\s*\(관리자\)\s*/g, '').trim() : undefined) || '관리자';
    const entry: PosAuditLog = {
      id,
      timestamp,
      action: log.action,
      actionTitle: log.actionTitle,
      category: log.category,
      actorId,
      actorName: log.actorName || actorId,
      actorUid: log.actorUid || actorId,
      details: log.details,
      metadata: enrichedMetadata,
      sessionId: log.sessionId || defaultSessionId,
    };

    await setDoc(
      logDocRef,
      sanitizeForFirestore({
        ...entry,
        createdAt: serverTimestamp(),
      })
    );

    return id;
  } catch (error) {
    console.warn('Failed to record POS audit log:', error);
    return '';
  }
}

/**
 * Subscribe to POS audit & activity logs in real-time.
 */
export function subscribePosLogs(
  onData: (logs: PosAuditLog[]) => void,
  onError?: (error: Error) => void,
  maxEntries = 300
): () => void {
  // 로그 시스템 전면 개편 작업 진행 중으로 사이트 전체 로그 구독 비활성화
  if (!IS_POS_AUDIT_LOG_ENABLED) {
    onData([]);
    return () => {};
  }
  const mapDocToLog = (docSnap: any): PosAuditLog => {
    const data = docSnap.data();
    const actorId = data.actorId || data.actorUid || (data.actorName ? data.actorName.replace(/\s*\(관리자\)\s*/g, '').trim() : undefined) || '관리자';
    return {
      id: docSnap.id,
      timestamp: data.timestamp || new Date().toISOString(),
      action: data.action || 'SYSTEM',
      actionTitle: data.actionTitle || '시스템 작업',
      category: data.category || 'SYSTEM',
      actorId,
      actorName: data.actorName || actorId,
      actorUid: data.actorUid || actorId,
      details: data.details || '',
      metadata: data.metadata || undefined,
      sessionId: data.sessionId,
    };
  };

  try {
    const q = query(collection(db, 'pos_logs'), orderBy('timestamp', 'desc'), limit(maxEntries));
    return onSnapshot(
      q,
      snapshot => {
        const logs: PosAuditLog[] = snapshot.docs.map(mapDocToLog);
        onData(logs);
      },
      err => {
        console.warn('Firestore pos_logs subscription error with orderBy, falling back to unordered query:', err);
        const fallbackQ = query(collection(db, 'pos_logs'), limit(maxEntries));
        return onSnapshot(
          fallbackQ,
          snapshot => {
            const logs: PosAuditLog[] = snapshot.docs.map(mapDocToLog);
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            onData(logs);
          },
          fallbackErr => {
            console.error('Firestore pos_logs fallback error:', fallbackErr);
            if (onError) onError(fallbackErr);
          }
        );
      }
    );
  } catch (err) {
    console.error('Failed to setup pos_logs subscription:', err);
    if (onError) onError(err as Error);
    return () => {};
  }
}

/**
 * Delete a single audit log entry (Admin only).
 */
export async function deletePosLog(logId: string): Promise<void> {
  await ensurePosAuth();
  const logRef = doc(db, 'pos_logs', logId);
  await deleteDoc(logRef);
}

/**
 * Clear all audit logs (Admin only).
 */
export async function clearAllPosLogs(logs: PosAuditLog[]): Promise<void> {
  if (!logs || logs.length === 0) return;
  await ensurePosAuth();

  const chunkSize = 400;
  for (let i = 0; i < logs.length; i += chunkSize) {
    const chunk = logs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const logRef = doc(db, 'pos_logs', item.id);
      batch.delete(logRef);
    }
    await batch.commit();
  }
}
