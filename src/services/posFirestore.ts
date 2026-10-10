import {
  collection,
  doc,
  getDoc,
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
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import {
  PosCategory,
  PosItem,
  PosOrder,
  PosSettlement,
  CartItem,
  PaymentMethod,
  PosPreset,
  PosAuditLog,
  PosGifticon,
  PosUsedGifticonSummary,
} from '../types/pos';

/**
 * Ensures a valid Firebase Authentication session for the POS tablet.
 * Uses background anonymous sign-in so operations succeed with security rules.
 */
export async function ensurePosAuth(): Promise<void> {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch {
    // Graceful fallback for environments where anonymous auth provider is not enabled
  }
}

/**
 * Subscribe to POS categories in real-time.
 */
export function subscribePosCategories(
  onData: (categories: PosCategory[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, 'categories'), orderBy('orderIndex', 'asc'));
  return onSnapshot(
    q,
    snapshot => {
      const categories: PosCategory[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '미분류',
          orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
        };
      });
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
        return {
          id: docSnap.id,
          name: data.name || '',
          categoryId: data.categoryId || '',
          price: typeof data.price === 'number' ? data.price : 0,
          stock: typeof data.stock === 'number' ? data.stock : 0,
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

  for (const cat of defaultCategories) {
    const catRef = doc(db, 'categories', cat.id);
    batch.set(catRef, {
      name: cat.name,
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
  totalAmount: number; // 원래 상품 합계 금액
  gifticonDiscountAmount?: number; // 기프티콘 총 할인 금액
  actualPaidAmount?: number; // 실제 수납 금액 (totalAmount - gifticonDiscountAmount, 최소 0원)
  gifticonsToUse?: PosGifticon[]; // 적용할 기프티콘 목록
  cashReceived?: number;
  changeAmount?: number;
  cart: CartItem[];
}

/**
 * [트랜잭션 일관성] 결제 완료 처리 시:
 * 1. 장바구니 상품들의 실시간 재고 확인 및 차감
 * 2. 사용된 기프티콘들의 상태 확인(ACTIVE 여부) 및 USED로 전환
 * 3. orders 문서 생성
 * 을 단일 트랜잭션으로 원자적 처리하여 중복 사용 및 재고 불일치 방지.
 */
export async function runOrderTransaction(params: RunOrderParams): Promise<PosOrder> {
  await ensurePosAuth();

  if (params.cart.length === 0) {
    throw new Error('장바구니가 비어 있습니다.');
  }

  const gifticons = params.gifticonsToUse || [];
  const gifticonDiscount = params.gifticonDiscountAmount ?? gifticons.reduce((sum, c) => sum + c.amount, 0);
  const actualPaid = Math.max(0, params.totalAmount - gifticonDiscount);

  return await runTransaction(db, async transaction => {
    // 1. Transaction Read Phase: Read fresh stock for all items
    const itemReads: Array<{
      ref: ReturnType<typeof doc>;
      currentStock: number;
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
      const currentStock = typeof itemData.stock === 'number' ? itemData.stock : 0;

      // Real-time stock validation check
      if (currentStock < cartItem.count) {
        throw new Error(
          `[품절/재고 부족] "${cartItem.item.name}"의 실시간 잔여 재고는 ${currentStock}개입니다. (요청: ${cartItem.count}개)`
        );
      }

      itemReads.push({
        ref: itemRef,
        currentStock,
        name: itemData.name || cartItem.item.name,
        item: cartItem.item,
        requestedCount: cartItem.count,
      });
    }

    // 1-B. Transaction Read Phase: Read and validate all gifticons
    const gifticonReads: Array<{
      ref: ReturnType<typeof doc>;
      gifticon: PosGifticon;
    }> = [];

    for (const c of gifticons) {
      const gifticonRef = doc(db, 'gifticons', c.id.trim());
      const gifticonDoc = await transaction.get(gifticonRef);

      if (!gifticonDoc.exists()) {
        throw new Error(`기프티콘 [${c.id}]을(를) 시스템에서 찾을 수 없습니다.`);
      }

      const cData = gifticonDoc.data() as PosGifticon;
      if (cData.status !== 'ACTIVE') {
        throw new Error(`기프티콘 [${c.id}]은(는) 이미 사용되었거나 비활성 상태입니다. (상태: ${cData.status})`);
      }

      gifticonReads.push({
        ref: gifticonRef,
        gifticon: { ...cData, id: gifticonDoc.id },
      });
    }

    // 2. Transaction Write Phase: Create Order document, deduct stock, mark gifticons as USED
    const ordersCol = collection(db, 'orders');
    const orderDocRef = doc(ordersCol);

    const nowIso = new Date().toISOString();
    const cleanBuyerName = params.buyerName?.trim() || undefined;
    const cleanMemo = params.memo?.trim() || undefined;

    const usedGifticonsSummary: PosUsedGifticonSummary[] = gifticonReads.map(gr => ({
      gifticonId: gr.gifticon.id,
      amount: gr.gifticon.amount,
    }));

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
      gifticonDiscountAmount: gifticonDiscount,
      actualPaidAmount: actualPaid,
      usedGifticons: usedGifticonsSummary.length > 0 ? usedGifticonsSummary : undefined,
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

    // Deduct stock atomically
    for (const read of itemReads) {
      const nextStock = read.currentStock - read.requestedCount;
      transaction.update(read.ref, {
        stock: nextStock,
        updatedAt: nowIso,
      });
    }

    // Mark gifticons as USED atomically
    for (const gr of gifticonReads) {
      transaction.update(gr.ref, {
        status: 'USED',
        usedAt: nowIso,
        usedOrderId: orderDocRef.id,
        usedBy: cleanBuyerName || params.handlerName,
      });
    }

    return newOrder;
  }).then(async order => {
    // Background audit logging (Non-blocking)
    const itemsSummary = params.cart.map(c => `${c.item.name} x${c.count}`).join(', ');
    const buyerSuffix = order.buyerName ? ` [결제자: ${order.buyerName}]` : '';
    const gifticonSuffix = order.gifticonDiscountAmount && order.gifticonDiscountAmount > 0
      ? ` (기프티콘 할인 -${order.gifticonDiscountAmount.toLocaleString()}원, 실결제 ${(order.actualPaidAmount ?? 0).toLocaleString()}원, 사용 기프티콘: ${order.usedGifticons?.map(u => u.gifticonId).join(', ')})`
      : '';

    const isTransfer = params.paymentMethod === 'TRANSFER';
    await logPosActivity({
      action: isTransfer ? 'PTR' : 'PCA',
      actionTitle: isTransfer ? '계좌이체 결제 완료' : '현금 결제 완료',
      category: 'SALE',
      actorId: params.handlerUid || params.handlerName || '판매원',
      actorUid: params.handlerUid,
      sessionId: params.sessionId,
      details: `${isTransfer ? '계좌이체' : '현금'} 결제 ${params.totalAmount.toLocaleString()}원 (${itemsSummary})${buyerSuffix}${gifticonSuffix}`,
      metadata: {
        orderId: order.id,
        buyerName: order.buyerName || undefined,
        memo: order.memo || undefined,
        paymentMethod: params.paymentMethod,
        totalAmount: params.totalAmount,
        gifticonDiscountAmount: order.gifticonDiscountAmount || 0,
        actualPaidAmount: order.actualPaidAmount ?? params.totalAmount,
        usedGifticons: order.usedGifticons || [],
        cashReceived: params.cashReceived,
        changeAmount: params.changeAmount,
        itemsCount: params.cart.reduce((sum, c) => sum + c.count, 0),
        items: params.cart.map(c => ({ name: c.item.name, count: c.count, price: c.item.price })),
      },
    }).catch(e => console.warn('Audit log failed:', e));

    // Also record dedicated GUS (Gifticon Use) logs for each gifticon used
    if (order.usedGifticons && order.usedGifticons.length > 0) {
      for (const ug of order.usedGifticons) {
        logPosActivity({
          action: 'GUS',
          actionTitle: '기프티콘 결제 사용',
          category: 'GIFTICON',
          actorId: params.handlerUid || params.handlerName || '판매원',
          actorUid: params.handlerUid,
          sessionId: params.sessionId,
          details: `기프티콘 [${ug.gifticonId}] 사용 완료 (${ug.amount.toLocaleString()}원 할인, 주문번호 #${order.id.slice(-6)})`,
          metadata: {
            gifticonId: ug.gifticonId,
            amount: ug.amount,
            orderId: order.id,
            buyerName: order.buyerName,
          },
        }).catch(() => {});
      }
    }

    return order;
  });
}

/**
 * [트랜잭션 일관성] 결제 취소 시 order 상태 변경, 품목 재고 자동 복원, 사용되었던 기프티콘 자동 복구(ACTIVE)를 단일 트랜잭션으로 원자적 처리.
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
  let restoredGifticonsList: PosUsedGifticonSummary[] = [];

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
    restoredGifticonsList = Array.isArray(orderData.usedGifticons) ? orderData.usedGifticons : [];

    // Read current stocks
    const itemReads: Array<{
      ref: ReturnType<typeof doc>;
      currentStock: number;
      countToRestore: number;
    }> = [];

    for (const orderItem of items) {
      const itemRef = doc(db, 'items', orderItem.itemId);
      const itemDoc = await transaction.get(itemRef);
      if (itemDoc.exists()) {
        const data = itemDoc.data();
        const currentStock = typeof data.stock === 'number' ? data.stock : 0;
        itemReads.push({
          ref: itemRef,
          currentStock,
          countToRestore: orderItem.count,
        });
      }
    }

    // Read gifticons to restore
    const gifticonRefsToRestore: Array<ReturnType<typeof doc>> = [];
    for (const ug of restoredGifticonsList) {
      const gRef = doc(db, 'gifticons', ug.gifticonId);
      const gDoc = await transaction.get(gRef);
      if (gDoc.exists()) {
        gifticonRefsToRestore.push(gRef);
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

    // Restore stocks
    for (const read of itemReads) {
      transaction.update(read.ref, {
        stock: read.currentStock + read.countToRestore,
        updatedAt: nowIso,
      });
    }

    // Restore gifticons to ACTIVE
    for (const gRef of gifticonRefsToRestore) {
      transaction.update(gRef, {
        status: 'ACTIVE',
        usedAt: null,
        usedOrderId: null,
        usedBy: null,
      });
    }
  });

  // Background audit logging
  if (cancelledOrderData) {
    const gifticonRestoredNote = restoredGifticonsList.length > 0
      ? `, 기프티콘 ${restoredGifticonsList.map(c => c.gifticonId).join(', ')} 미사용 복구 완료`
      : '';

    await logPosActivity({
      action: 'PCC',
      actionTitle: '결제 취소 (환불/재고복원)',
      category: 'SALE',
      actorId: cancelledBy || '관리자',
      actorUid: cancelledBy,
      sessionId: cancelledOrderData.sessionId,
      details: `주문번호 #${orderId.slice(-6)} 결제 취소 완료 (${(cancelledOrderData.totalAmount || 0).toLocaleString()}원 환불, 사유: ${cancelReason || '단순 변심'}${gifticonRestoredNote})`,
      metadata: {
        orderId,
        refundAmount: cancelledOrderData.totalAmount,
        cancelReason: cancelReason || '단순 변심',
        restoredItems: restoredItemsSummary,
        restoredGifticons: restoredGifticonsList,
      },
    }).catch(e => console.warn('Audit log failed:', e));

    // Dedicated GRT (Gifticon Restore) log if any gifticons were recovered
    if (restoredGifticonsList.length > 0) {
      for (const rg of restoredGifticonsList) {
        logPosActivity({
          action: 'GRT',
          actionTitle: '기프티콘 미사용 복원',
          category: 'GIFTICON',
          actorId: cancelledBy || '관리자',
          actorUid: cancelledBy,
          sessionId: cancelledOrderData.sessionId,
          details: `주문 취소로 기프티콘 [${rg.gifticonId}](${rg.amount.toLocaleString()}원)이 다시 미사용(사용가능) 상태로 복구되었습니다.`,
          metadata: {
            gifticonId: rg.gifticonId,
            amount: rg.amount,
            orderId,
            reason: cancelReason,
          },
        }).catch(() => {});
      }
    }
  }
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
          stock: typeof item.stock === 'number' ? item.stock : 0,
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
    actionTitle: '상품 재고/정보 일괄 저장',
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
          stock: typeof item.stock === 'number' ? item.stock : 0,
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
    {
      name: item.name || '',
      categoryId: item.categoryId || '',
      price: item.price || 0,
      stock: typeof item.stock === 'number' ? item.stock : 0,
      isFavorite: Boolean(item.isFavorite),
      isActive: item.isActive !== false,
      barcode: item.barcode || '',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const diffs: any[] = [];
  if (item.price !== undefined) diffs.push({ field: 'price', label: '판매 가격', from: isNew ? '신규' : '-', to: `${(item.price || 0).toLocaleString()}원` });
  if (item.stock !== undefined) diffs.push({ field: 'stock', label: '재고 수량', from: isNew ? '초기' : '-', to: `${item.stock ?? 0}개` });
  if (item.isActive !== undefined) diffs.push({ field: 'isActive', label: '판매 상태', from: '-', to: item.isActive !== false ? '판매중' : '판매중단' });

  logPosActivity({
    action: isNew ? 'ICR' : 'IUP',
    actionTitle: isNew ? '신규 상품 등록' : '상품 정보 수정',
    category: 'INVENTORY',
    actorName,
    actorUid,
    details: `상품 [${item.name || '미정'}] ${isNew ? '신규 등록' : '정보 수정'} (가격: ${(item.price || 0).toLocaleString()}원, 재고: ${item.stock ?? 0}개)`,
    metadata: {
      itemId: id,
      name: item.name,
      price: item.price,
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
  const batch = writeBatch(db);
  for (const cat of categories) {
    const catRef = doc(db, 'categories', cat.id);
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
    details: `카테고리 목록 (${categories.map(c => c.name).join(', ')}) 일괄 변경 저장`,
    metadata: { count: categories.length },
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
  const catRef = doc(db, 'categories', cat.id);
  await setDoc(
    catRef,
    {
      name: cat.name,
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
      details: `카테고리 [${cat.name}] 정보 저장 (순서: ${cat.orderIndex})`,
      metadata: { categoryId: cat.id, name: cat.name, orderIndex: cat.orderIndex },
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
      ? `[${settlement.id}] 영업 마감 완료 (총 매출: ${settlement.totalSales.toLocaleString()}원, 오차: ${(settlement.discrepancy || 0).toLocaleString()}원)`
      : `[${settlement.id}] 영업 개시 (준비금: ${settlement.initialCash.toLocaleString()}원)`,
    metadata: {
      sessionId: settlement.id,
      status: settlement.status,
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
  await setDoc(
    orderRef,
    sanitizeForFirestore({
      ...order,
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );

  logPosActivity({
    action: 'PUP',
    actionTitle: '결제 정보 수정',
    category: 'SALE',
    actorName,
    sessionId: order.sessionId,
    details: `주문번호 #${order.id.slice(-6)} 내역 수정 (금액: ${order.totalAmount.toLocaleString()}원)`,
    metadata: { orderId: order.id, totalAmount: order.totalAmount, paymentMethod: order.paymentMethod },
  }).catch(() => {});
}

/**
 * [관리자 전용] 매출 내역(주문) 완전 삭제
 */
export async function deletePosOrder(orderId: string, actorName = '관리자'): Promise<void> {
  await ensurePosAuth();
  const orderRef = doc(db, 'orders', orderId);
  await deleteDoc(orderRef);

  logPosActivity({
    action: 'PDL',
    actionTitle: '매출 내역 영구 삭제',
    category: 'SALE',
    actorName,
    details: `주문번호 #${orderId.slice(-6)} 내역 영구 삭제`,
    metadata: { orderId },
  }).catch(() => {});
}

/**
 * [관리자 전용] 여러 매출 내역(주문) 일괄 삭제
 */
export async function deleteMultiplePosOrders(orderIds: string[], actorName = '관리자'): Promise<void> {
  if (!orderIds || orderIds.length === 0) return;
  await ensurePosAuth();
  
  // Firestore batches support up to 500 operations
  const chunkSize = 400;
  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const id of chunk) {
      const orderRef = doc(db, 'orders', id);
      batch.delete(orderRef);
    }
    await batch.commit();
  }

  logPosActivity({
    action: 'PDL',
    actionTitle: '매출 내역 일괄 영구 삭제',
    category: 'SALE',
    actorName,
    details: `총 ${orderIds.length}건의 주문 내역 일괄 영구 삭제`,
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

  // 1. Delete all existing items & categories from Firestore
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

  // 2. Batch insert new preset categories and items (if any)
  if (categories.length > 0 || items.length > 0) {
    const batch2 = writeBatch(db);
    for (const cat of categories) {
      const catRef = doc(db, 'categories', cat.id);
      batch2.set(catRef, {
        name: cat.name,
        orderIndex: cat.orderIndex,
      });
    }

    for (const item of items) {
      const itemRef = doc(db, 'items', item.id);
      batch2.set(itemRef, {
        name: item.name,
        categoryId: item.categoryId,
        price: item.price,
        stock: item.stock,
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

// ==========================================
// GIFTICON MANAGEMENT SERVICES (기프티콘 관리)
// ==========================================

/**
 * Fetch a single gifticon by its ID directly.
 */
export async function getPosGifticon(gifticonId: string): Promise<PosGifticon | null> {
  await ensurePosAuth();
  const cRef = doc(db, 'gifticons', gifticonId.trim());
  const snap = await getDoc(cRef);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    amount: typeof d.amount === 'number' ? d.amount : 0,
    status: (d.status as 'ACTIVE' | 'USED' | 'CANCELLED') || 'ACTIVE',
    description: d.description || '',
    createdAt: d.createdAt || '',
    createdBy: d.createdBy || '',
    usedAt: d.usedAt || undefined,
    usedBy: d.usedBy || undefined,
    usedOrderId: d.usedOrderId || undefined,
    memo: d.memo || undefined,
  };
}

/**
 * Real-time subscription to all gifticons in Firestore.
 */
export function subscribePosGifticons(
  onData: (gifticons: PosGifticon[]) => void,
  onError?: (error: Error) => void
): () => void {
  const collRef = collection(db, 'gifticons');
  return onSnapshot(
    collRef,
    snapshot => {
      const gifticons: PosGifticon[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          amount: typeof d.amount === 'number' ? d.amount : 0,
          status: (d.status as 'ACTIVE' | 'USED' | 'CANCELLED') || 'ACTIVE',
          description: d.description || '',
          createdAt: d.createdAt || '',
          createdBy: d.createdBy || '',
          usedAt: d.usedAt || undefined,
          usedBy: d.usedBy || undefined,
          usedOrderId: d.usedOrderId || undefined,
          memo: d.memo || undefined,
        };
      });
      // Sort newest first
      gifticons.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(gifticons);
    },
    err => {
      console.error('Firestore gifticons subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a single gifticon.
 */
export async function savePosGifticon(
  gifticon: Partial<PosGifticon> & { id: string; amount: number },
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  const gifticonId = gifticon.id.trim();
  if (!gifticonId) {
    throw new Error('기프티콘 번호는 공백일 수 없습니다.');
  }
  if (gifticon.amount <= 0) {
    throw new Error('기프티콘 금액은 0원보다 커야 합니다.');
  }

  const docRef = doc(db, 'gifticons', gifticonId);
  const nowIso = new Date().toISOString();
  const payload: PosGifticon = {
    id: gifticonId,
    amount: gifticon.amount,
    status: gifticon.status || 'ACTIVE',
    description: gifticon.description?.trim() || undefined,
    createdAt: gifticon.createdAt || nowIso,
    createdBy: gifticon.createdBy || actorName,
    usedAt: gifticon.usedAt || undefined,
    usedBy: gifticon.usedBy || undefined,
    usedOrderId: gifticon.usedOrderId || undefined,
    memo: gifticon.memo?.trim() || undefined,
  };

  await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

  await logPosActivity({
    action: 'GCR',
    actionTitle: '기프티콘 개별 등록',
    category: 'GIFTICON',
    actorName,
    actorUid,
    details: `기프티콘 [${gifticonId}] (${gifticon.amount.toLocaleString()}원) 등록 완료`,
    metadata: {
      gifticonId,
      amount: gifticon.amount,
      status: payload.status,
    },
  }).catch(() => {});
}

/**
 * Batch save/import multiple gifticons from sheet/excel or generator.
 */
export async function saveMultiplePosGifticons(
  gifticons: Array<{ id: string; amount: number; description?: string; memo?: string }>,
  actorName = '관리자',
  actorUid?: string
): Promise<{ successCount: number; duplicateCount: number }> {
  if (!gifticons || gifticons.length === 0) return { successCount: 0, duplicateCount: 0 };
  await ensurePosAuth();

  const chunkSize = 400;
  const nowIso = new Date().toISOString();
  let successCount = 0;

  for (let i = 0; i < gifticons.length; i += chunkSize) {
    const chunk = gifticons.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const g of chunk) {
      const cleanId = g.id.trim();
      if (!cleanId || g.amount <= 0) continue;

      const cRef = doc(db, 'gifticons', cleanId);
      const payload: PosGifticon = {
        id: cleanId,
        amount: g.amount,
        status: 'ACTIVE',
        description: g.description?.trim() || undefined,
        createdAt: nowIso,
        createdBy: actorName,
        memo: g.memo?.trim() || undefined,
      };

      batch.set(cRef, sanitizeForFirestore(payload), { merge: true });
      successCount++;
    }

    await batch.commit();
  }

  const totalFaceValue = gifticons.reduce((sum, c) => sum + (c.amount || 0), 0);

  await logPosActivity({
    action: 'GMC',
    actionTitle: '기프티콘 일괄 등록 (Multi)',
    category: 'GIFTICON',
    actorName,
    actorUid,
    details: `기프티콘 ${successCount}장 일괄 등록 완료 (총 발행 가치: ${totalFaceValue.toLocaleString()}원)`,
    metadata: {
      count: successCount,
      totalFaceValue,
      sampleIds: gifticons.slice(0, 5).map(c => c.id),
    },
  }).catch(() => {});

  return { successCount, duplicateCount: 0 };
}

/**
 * Delete a single gifticon (Admin only).
 */
export async function deletePosGifticon(
  gifticonId: string,
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  const cleanId = gifticonId.trim();
  const cRef = doc(db, 'gifticons', cleanId);
  await deleteDoc(cRef);

  await logPosActivity({
    action: 'GDL',
    actionTitle: '기프티콘 삭제',
    category: 'GIFTICON',
    actorName,
    actorUid,
    details: `기프티콘 [${cleanId}] 폐기/삭제 완료`,
    metadata: { gifticonId: cleanId },
  }).catch(() => {});
}

/**
 * Delete multiple gifticons (Admin only).
 */
export async function deleteMultiplePosGifticons(
  gifticonIds: string[],
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  if (!gifticonIds || gifticonIds.length === 0) return;
  await ensurePosAuth();

  const chunkSize = 400;
  for (let i = 0; i < gifticonIds.length; i += chunkSize) {
    const chunk = gifticonIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const id of chunk) {
      const cleanId = id.trim();
      const cRef = doc(db, 'gifticons', cleanId);
      batch.delete(cRef);
    }
    await batch.commit();
  }

  await logPosActivity({
    action: 'GDL',
    actionTitle: '기프티콘 다중 삭제',
    category: 'GIFTICON',
    actorName,
    actorUid,
    details: `총 ${gifticonIds.length}장의 기프티콘 영구 삭제 완료`,
    metadata: { count: gifticonIds.length },
  }).catch(() => {});
}

/**
 * Change gifticon status (e.g. ACTIVE <-> CANCELLED).
 */
export async function updatePosGifticonStatus(
  gifticonId: string,
  newStatus: 'ACTIVE' | 'USED' | 'CANCELLED',
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  const cleanId = gifticonId.trim();
  const cRef = doc(db, 'gifticons', cleanId);
  await setDoc(cRef, { status: newStatus, updatedAt: new Date().toISOString() }, { merge: true });

  await logPosActivity({
    action: 'GUP',
    actionTitle: '기프티콘 상태 변경',
    category: 'GIFTICON',
    actorName,
    actorUid,
    details: `기프티콘 [${cleanId}] 상태를 '${newStatus}'(으)로 변경`,
    metadata: { gifticonId: cleanId, newStatus },
  }).catch(() => {});
}

/**
 * Edit a single gifticon's details (number/ID, amount, status, description, memo).
 * If the ID is changed, migrates the document to the new ID and deletes the old one.
 */
export async function editPosGifticon(
  oldId: string,
  updatedData: {
    id: string;
    amount: number;
    status: 'ACTIVE' | 'USED' | 'CANCELLED';
    description?: string;
    memo?: string;
  },
  actorName = '관리자',
  actorUid?: string
): Promise<void> {
  await ensurePosAuth();
  const cleanOldId = oldId.trim();
  const cleanNewId = updatedData.id.trim();

  if (!cleanNewId) {
    throw new Error('기프티콘 번호는 필수 입력 항목입니다.');
  }
  if (!updatedData.amount || updatedData.amount <= 0) {
    throw new Error('기프티콘 할인 금액은 0원보다 커야 합니다.');
  }

  const nowIso = new Date().toISOString();

  if (cleanNewId !== cleanOldId) {
    // ID changed: fetch old doc to preserve metadata (createdAt, etc.)
    const oldRef = doc(db, 'gifticons', cleanOldId);
    const oldSnap = await getDoc(oldRef);
    const oldData = oldSnap.exists() ? (oldSnap.data() as PosGifticon) : null;

    const newRef = doc(db, 'gifticons', cleanNewId);
    const newDocSnap = await getDoc(newRef);
    if (newDocSnap.exists()) {
      throw new Error(`기프티콘 번호 [${cleanNewId}]가 이미 존재합니다.`);
    }

    const payload: PosGifticon = {
      ...(oldData || {}),
      id: cleanNewId,
      amount: updatedData.amount,
      status: updatedData.status,
      description: updatedData.description?.trim() || undefined,
      memo: updatedData.memo?.trim() || undefined,
      createdAt: oldData?.createdAt || nowIso,
      createdBy: oldData?.createdBy || actorName,
    };

    const batch = writeBatch(db);
    batch.set(newRef, sanitizeForFirestore(payload));
    batch.delete(oldRef);
    await batch.commit();

    await logPosActivity({
      action: 'GUP',
      actionTitle: '기프티콘 번호 및 정보 수정',
      category: 'GIFTICON',
      actorName,
      actorUid,
      details: `기프티콘 [${cleanOldId}] -> [${cleanNewId}] (${updatedData.amount.toLocaleString()}원, 상태: ${updatedData.status}) 수정`,
      metadata: { oldId: cleanOldId, newId: cleanNewId, amount: updatedData.amount, status: updatedData.status },
    }).catch(() => {});
  } else {
    // Same ID: update fields
    const cRef = doc(db, 'gifticons', cleanOldId);
    const updates: Record<string, any> = {
      amount: updatedData.amount,
      status: updatedData.status,
      description: updatedData.description?.trim() || undefined,
      memo: updatedData.memo?.trim() || undefined,
      updatedAt: nowIso,
    };

    await setDoc(cRef, sanitizeForFirestore(updates), { merge: true });

    await logPosActivity({
      action: 'GUP',
      actionTitle: '기프티콘 정보 수정',
      category: 'GIFTICON',
      actorName,
      actorUid,
      details: `기프티콘 [${cleanOldId}] 정보 수정 (${updatedData.amount.toLocaleString()}원, ${updatedData.status})`,
      metadata: { gifticonId: cleanOldId, ...updates },
    }).catch(() => {});
  }
}

/**
 * Batch update multiple gifticons (amount, status/cancellation only).
 */
export async function batchUpdatePosGifticons(
  gifticonIds: string[],
  updates: {
    amount?: number;
    status?: 'ACTIVE' | 'USED' | 'CANCELLED';
  },
  actorName = '관리자',
  actorUid?: string
): Promise<{ updatedCount: number }> {
  if (!gifticonIds || gifticonIds.length === 0) return { updatedCount: 0 };
  await ensurePosAuth();

  const chunkSize = 400;
  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  for (let i = 0; i < gifticonIds.length; i += chunkSize) {
    const chunk = gifticonIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const id of chunk) {
      const cleanId = id.trim();
      const cRef = doc(db, 'gifticons', cleanId);
      const patch: Record<string, any> = { updatedAt: nowIso };

      if (typeof updates.amount === 'number' && updates.amount > 0) {
        patch.amount = updates.amount;
      }
      if (updates.status) {
        patch.status = updates.status;
        if (updates.status === 'ACTIVE') {
          // If reactivated, clear used details
          patch.usedAt = null;
          patch.usedBy = null;
          patch.usedOrderId = null;
        }
      }

      batch.set(cRef, sanitizeForFirestore(patch), { merge: true });
      updatedCount++;
    }

    await batch.commit();
  }

  await logPosActivity({
    action: 'GUP',
    actionTitle: '기프티콘 일괄 수정',
    category: 'GIFTICON',
    actorName,
    actorUid,
    details: `총 ${updatedCount}장의 기프티콘 일괄 수정 완료 (금액: ${updates.amount ?? '유지'}, 상태: ${updates.status ?? '유지'})`,
    metadata: { count: updatedCount, updates },
  }).catch(() => {});

  return { updatedCount };
}



