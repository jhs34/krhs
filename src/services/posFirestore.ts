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
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import { PosCategory, PosItem, PosOrder, PosSettlement, CartItem, PaymentMethod, PosPreset, PosAuditLog } from '../types/pos';

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
          paymentMethod: (data.paymentMethod as PaymentMethod) || 'CASH',
          totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
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
        actualCashInput: typeof data.actualCashInput === 'number' ? data.actualCashInput : undefined,
        discrepancy: typeof data.discrepancy === 'number' ? data.discrepancy : undefined,
        status: (data.status as 'OPEN' | 'CLOSED') || 'OPEN',
      });
    },
    err => {
      console.error('Firestore settlement subscription error:', err);
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
  paymentMethod: PaymentMethod;
  totalAmount: number;
  cashReceived?: number;
  changeAmount?: number;
  cart: CartItem[];
}

/**
 * [트랜잭션 일관성] 결제 완료 처리 시 orders 생성과 items.stock 차감을 단일 트랜잭션으로 처리하여 재고 불일치 방지.
 */
export async function runOrderTransaction(params: RunOrderParams): Promise<PosOrder> {
  await ensurePosAuth();

  if (params.cart.length === 0) {
    throw new Error('장바구니가 비어 있습니다.');
  }

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

    // 2. Transaction Write Phase: Create Order document and deduct stock
    const ordersCol = collection(db, 'orders');
    const orderDocRef = doc(ordersCol);

    const nowIso = new Date().toISOString();
    const newOrder: PosOrder = {
      id: orderDocRef.id,
      sessionId: params.sessionId,
      timestamp: nowIso,
      handlerUid: params.handlerUid,
      handlerName: params.handlerName,
      paymentMethod: params.paymentMethod,
      totalAmount: params.totalAmount,
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

    return newOrder;
  }).then(async order => {
    // Background audit logging (Non-blocking)
    const itemsSummary = params.cart.map(c => `${c.item.name} x${c.count}`).join(', ');
    await logPosActivity({
      action: 'ORDER_CREATED',
      actionTitle: '결제 완료',
      category: 'SALE',
      actorName: params.handlerName || '판매원',
      actorUid: params.handlerUid,
      sessionId: params.sessionId,
      details: `${params.paymentMethod === 'TRANSFER' ? '계좌이체' : '현금'} 결제 ${params.totalAmount.toLocaleString()}원 (${itemsSummary})`,
      metadata: {
        orderId: order.id,
        paymentMethod: params.paymentMethod,
        totalAmount: params.totalAmount,
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
 * [트랜잭션 일관성] 결제 취소 시 order 상태 변경과 품목 재고 자동 복원을 단일 트랜잭션으로 원자적 처리.
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
  });

  // Background audit logging
  if (cancelledOrderData) {
    await logPosActivity({
      action: 'ORDER_CANCELLED',
      actionTitle: '주문 결제 취소 (환불)',
      category: 'SALE',
      actorName: cancelledBy || '관리자',
      sessionId: cancelledOrderData.sessionId,
      details: `주문번호 #${orderId.slice(-6)} 취소 완료 (${(cancelledOrderData.totalAmount || 0).toLocaleString()}원 환불, 사유: ${cancelReason || '단순 변심'})`,
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
 * Save or update a single POS item.
 */
export async function savePosItem(
  item: Partial<PosItem> & { id?: string },
  actorName = '관리자'
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

  logPosActivity({
    action: isNew ? 'ITEM_CREATED' : 'ITEM_UPDATED',
    actionTitle: isNew ? '신규 상품 등록' : '상품 정보 수정',
    category: 'INVENTORY',
    actorName,
    details: `상품 [${item.name || '미정'}] ${isNew ? '신규 등록' : '정보 수정'} (가격: ${(item.price || 0).toLocaleString()}원, 재고: ${item.stock ?? 0}개)`,
    metadata: { itemId: id, name: item.name, price: item.price, stock: item.stock, barcode: item.barcode },
  }).catch(() => {});

  return id;
}

/**
 * Delete a POS item.
 */
export async function deletePosItem(
  id: string,
  itemName?: string,
  actorName = '관리자'
): Promise<void> {
  await ensurePosAuth();
  await deleteDoc(doc(db, 'items', id));

  logPosActivity({
    action: 'ITEM_DELETED',
    actionTitle: '상품 삭제',
    category: 'INVENTORY',
    actorName,
    details: `상품 [${itemName || id}] 영구 삭제`,
    metadata: { itemId: id, itemName },
  }).catch(() => {});
}

/**
 * Save or update a POS category.
 */
export async function savePosCategory(cat: PosCategory, actorName = '관리자'): Promise<void> {
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

  logPosActivity({
    action: 'CATEGORY_UPDATED',
    actionTitle: '카테고리 저장',
    category: 'INVENTORY',
    actorName,
    details: `카테고리 [${cat.name}] 정보 저장 (순서: ${cat.orderIndex})`,
    metadata: { categoryId: cat.id, name: cat.name, orderIndex: cat.orderIndex },
  }).catch(() => {});
}

/**
 * Delete a POS category.
 */
export async function deletePosCategory(
  id: string,
  catName?: string,
  actorName = '관리자'
): Promise<void> {
  await ensurePosAuth();
  await deleteDoc(doc(db, 'categories', id));

  logPosActivity({
    action: 'CATEGORY_DELETED',
    actionTitle: '카테고리 삭제',
    category: 'INVENTORY',
    actorName,
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
  logPosActivity({
    action: isClosed ? 'SETTLEMENT_CLOSED' : 'SETTLEMENT_OPENED',
    actionTitle: isClosed ? '영업 마감 정산' : '영업 개시 준비금 등록',
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
    action: 'ORDER_UPDATED',
    actionTitle: '주문 내역 수정',
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
    action: 'ORDER_DELETED',
    actionTitle: '주문 영구 삭제',
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
    action: 'BATCH_ORDERS_DELETED',
    actionTitle: '주문 일괄 삭제',
    category: 'SALE',
    actorName,
    details: `총 ${orderIds.length}건의 주문 내역 일괄 영구 삭제`,
    metadata: { deletedCount: orderIds.length, orderIds: orderIds.slice(0, 10) },
  }).catch(() => {});
}

/**
 * [즐겨찾기 관리] 모든 상품의 즐겨찾기 일괄 해제
 */
export async function clearAllPosFavorites(items: PosItem[], actorName = '관리자'): Promise<void> {
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
  actorName = '관리자'
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
    action: 'PRESET_APPLIED',
    actionTitle: '메뉴 프리셋 적용',
    category: 'SYSTEM',
    actorName,
    details: `[${presetName}] 적용 완료 (카테고리 ${categories.length}개, 품목 ${items.length}개)`,
    metadata: { presetName, categoriesCount: categories.length, itemsCount: items.length },
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
export async function savePosPreset(preset: PosPreset, actorName = '관리자'): Promise<void> {
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
    action: 'PRESET_SAVED',
    actionTitle: '메뉴 프리셋 저장',
    category: 'SYSTEM',
    actorName,
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
  actorName = '관리자'
): Promise<void> {
  await ensurePosAuth();
  const presetRef = doc(db, 'pos_presets', presetId);
  await deleteDoc(presetRef);

  logPosActivity({
    action: 'PRESET_DELETED',
    actionTitle: '메뉴 프리셋 삭제',
    category: 'SYSTEM',
    actorName,
    details: `커스텀 프리셋 [${presetName || presetId}] 삭제`,
    metadata: { presetId, presetName },
  }).catch(() => {});
}

/**
 * Clean up existing categories/items and reseed with default fresh list
 */
export async function resetPosDataToDefaults(
  defaultCategories: PosCategory[],
  defaultItems: PosItem[]
): Promise<void> {
  await applyPosPreset(defaultCategories, defaultItems);
}

/**
 * =====================================================================
 * POS 통합 감사 로그 (Audit & Activity Logs) 서비스
 * =====================================================================
 */

/**
 * Record a new audit log entry into Firestore.
 */
export async function logPosActivity(
  log: Omit<PosAuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): Promise<string> {
  try {
    await ensurePosAuth();
    const id = log.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const logDocRef = doc(db, 'pos_logs', id);
    const timestamp = log.timestamp || new Date().toISOString();

    const entry: PosAuditLog = {
      id,
      timestamp,
      action: log.action,
      actionTitle: log.actionTitle,
      category: log.category,
      actorName: log.actorName || '시스템',
      actorUid: log.actorUid,
      details: log.details,
      metadata: log.metadata,
      sessionId: log.sessionId,
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
  const q = query(collection(db, 'pos_logs'), orderBy('timestamp', 'desc'), limit(maxEntries));
  return onSnapshot(
    q,
    snapshot => {
      const logs: PosAuditLog[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          timestamp: data.timestamp || new Date().toISOString(),
          action: data.action || 'SYSTEM',
          actionTitle: data.actionTitle || '시스템 작업',
          category: data.category || 'SYSTEM',
          actorName: data.actorName || '관리자',
          actorUid: data.actorUid,
          details: data.details || '',
          metadata: data.metadata || undefined,
          sessionId: data.sessionId,
        };
      });
      onData(logs);
    },
    err => {
      console.error('Firestore pos_logs subscription error:', err);
      if (onError) onError(err);
    }
  );
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



