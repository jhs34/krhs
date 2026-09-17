import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { format } from 'date-fns';
import { CheckCircle2, AlertCircle, Power, AlertTriangle } from 'lucide-react';
import { PosHeader } from '../components/pos/PosHeader';
import { PosMenuGrid } from '../components/pos/PosMenuGrid';
import { PosCart } from '../components/pos/PosCart';
import { PosKeypadModal } from '../components/pos/PosKeypadModal';
import { PosClearConfirmModal } from '../components/pos/PosClearConfirmModal';
import { PosCashModal } from '../components/pos/PosCashModal';
import { PosTransferModal } from '../components/pos/PosTransferModal';
import { PosLoginModal } from '../components/pos/PosLoginModal';
import { PosProductManagerModal } from '../components/pos/PosProductManagerModal';
import { PosSalesHistoryModal } from '../components/pos/PosSalesHistoryModal';
import { PosSettlementModal } from '../components/pos/PosSettlementModal';
import { PosAuditLogModal } from '../components/pos/PosAuditLogModal';
import { PosSplitDivider } from '../components/pos/PosSplitDivider';
import { PosHubHome } from '../components/pos/PosHubHome';
import { getStoredPosUser, logoutPosUser } from '../services/posAuth';
import { DEFAULT_POS_CATEGORIES, DEFAULT_POS_ITEMS } from '../data/defaultPosData';
import { PosCategory, PosItem, CartItem, PosUser, PosOrder, PosSettlement, PosPreset, PosAuditLog } from '../types/pos';
import { PosFeedback } from '../utils/posFeedback';
import {
  ensurePosAuth,
  subscribePosCategories,
  subscribePosItems,
  subscribePosOrders,
  subscribePosSettlement,
  subscribePosLogs,
  seedInitialPosData,
  resetPosDataToDefaults,
  clearAllPosFavorites,
  applyPosPreset,
  subscribePosPresets,
  savePosPreset,
  deletePosPreset,
  runOrderTransaction,
  runCancelOrderTransaction,
  updatePosOrder,
  deletePosOrder,
  deleteMultiplePosOrders,
  savePosItem,
  savePosCategory,
  deletePosItem,
  deletePosCategory,
  savePosSettlement,
} from '../services/posFirestore';

const CART_STORAGE_KEY = 'krhs_pos_cart_session_v2';
const ITEMS_STORAGE_KEY = 'krhs_pos_items_v2';
const CATEGORIES_STORAGE_KEY = 'krhs_pos_categories_v2';
const ORDERS_STORAGE_KEY = 'krhs_pos_orders_v2';
const SETTLEMENT_STORAGE_KEY = 'krhs_pos_settlement_v2';
const LOGS_STORAGE_KEY = 'krhs_pos_logs_v2';
const SPLIT_RATIO_STORAGE_KEY = 'krhs_pos_split_ratio_v2';

export function PosPage() {
  const navigate = useNavigate();
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Split Ratio between Menu and Cart (default 62% menu, 38% cart)
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(SPLIT_RATIO_STORAGE_KEY);
      if (saved) {
        const num = parseFloat(saved);
        if (!isNaN(num) && num >= 30 && num <= 80) return num;
      }
    } catch (e) {
      console.error('Failed to load split ratio', e);
    }
    return 62;
  });

  // Persist split ratio
  useEffect(() => {
    try {
      localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, splitRatio.toString());
    } catch (e) {
      console.error('Failed to save split ratio', e);
    }
  }, [splitRatio]);

  // Auth User state
  const [currentUser, setCurrentUser] = useState<PosUser | null>(() => getStoredPosUser());

  // Screen View Mode: 'hub' (포스기 메인화면) | 'register' (포스기 판매/영업 화면)
  const [posScreenMode, setPosScreenMode] = useState<'hub' | 'register'>('hub');

  // Modal for switching accounts during sales
  const [showSwitchAccountModal, setShowSwitchAccountModal] = useState<boolean>(false);

  // Modal for confirming shift end
  const [showEndShiftConfirm, setShowEndShiftConfirm] = useState<boolean>(false);

  // POS Categories State (hydrated from localStorage)
  const [categories, setCategories] = useState<PosCategory[]>(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
    return DEFAULT_POS_CATEGORIES;
  });

  // POS Items State (hydrated from localStorage)
  const [items, setItems] = useState<PosItem[]>(() => {
    try {
      const saved = localStorage.getItem(ITEMS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load items', e);
    }
    return DEFAULT_POS_ITEMS;
  });

  // Cart State (hydrated from localStorage to prevent loss on screen refresh)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load cart', e);
    }
    return [];
  });

  // Persist items
  useEffect(() => {
    try {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save items', e);
    }
  }, [items]);

  // Persist categories
  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories', e);
    }
  }, [categories]);

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  }, [cart]);

  // Modals
  const [keypadTarget, setKeypadTarget] = useState<CartItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showCashModal, setShowCashModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showProductManager, setShowProductManager] = useState<boolean>(false);
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState<boolean>(false);
  const [showSettlementModal, setShowSettlementModal] = useState<boolean>(false);
  const [showAuditLogModal, setShowAuditLogModal] = useState<boolean>(false);

  // Audit Logs State (hydrated from localStorage)
  const [logs, setLogs] = useState<PosAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(LOGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load logs', e);
    }
    return [];
  });

  // Orders State (hydrated from localStorage)
  const [orders, setOrders] = useState<PosOrder[]>(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load orders', e);
    }
    return [
      {
        id: `ORD-${format(new Date(), 'yyMMdd')}-001`,
        sessionId: format(new Date(), 'yyyy-MM-dd'),
        timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        handlerUid: 'staff',
        handlerName: '매점판매원 (학생회)',
        paymentMethod: 'TRANSFER',
        totalAmount: 3200,
        items: [
          { itemId: 'snack-1', name: '포카칩 (오리지널)', price: 1700, count: 1 },
          { itemId: 'drink-1', name: '코카콜라 (캔 250ml)', price: 1500, count: 1 },
        ],
        isCancelled: false,
      },
      {
        id: `ORD-${format(new Date(), 'yyMMdd')}-002`,
        sessionId: format(new Date(), 'yyyy-MM-dd'),
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        handlerUid: 'staff',
        handlerName: '매점판매원 (학생회)',
        paymentMethod: 'CASH',
        totalAmount: 2000,
        cashReceived: 5000,
        changeAmount: 3000,
        items: [
          { itemId: 'ice-1', name: '메로나', price: 1000, count: 2 },
        ],
        isCancelled: false,
      },
    ];
  });

  // Daily Settlement State (hydrated from localStorage)
  const [settlement, setSettlement] = useState<PosSettlement | null>(() => {
    try {
      const saved = localStorage.getItem(SETTLEMENT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load settlement', e);
    }
    return null;
  });

  // Persist orders
  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders', e);
    }
  }, [orders]);

  // Persist settlement
  useEffect(() => {
    try {
      if (settlement) {
        localStorage.setItem(SETTLEMENT_STORAGE_KEY, JSON.stringify(settlement));
      }
    } catch (e) {
      console.error('Failed to save settlement', e);
    }
  }, [settlement]);

  // Persist audit logs
  useEffect(() => {
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save logs', e);
    }
  }, [logs]);

  // Day metrics dynamically calculated from orders
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');

  // Firestore Sync & Transaction Processing State
  const [isProcessingOrder, setIsProcessingOrder] = useState<boolean>(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);

  // Network Online/Offline state
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  // Sound Feedback mute state
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('krhs_pos_sound_muted') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSound = () => {
    setIsSoundMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem('krhs_pos_sound_muted', String(next));
      } catch {}
      return next;
    });
  };

  // Listen to browser network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('네트워크가 다시 연결되었습니다.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('인터넷 연결이 끊어졌습니다. 연결 상태를 확인하세요.', 'error');
      if (!isSoundMuted) PosFeedback.playError();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSoundMuted]);

  // Firestore Real-time Subscriptions (Categories, Items, Orders, Settlement, Audit Logs)
  useEffect(() => {
    let unsubCats: (() => void) | null = null;
    let unsubItems: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;
    let unsubSettlement: (() => void) | null = null;
    let unsubLogs: (() => void) | null = null;

    const init = async () => {
      await ensurePosAuth();
      setIsFirestoreConnected(true);

      // Subscribe to Categories
      unsubCats = subscribePosCategories(firestoreCats => {
        if (firestoreCats.length > 0) {
          setCategories(firestoreCats);
        } else {
          // If completely empty in Firestore on initial load, auto-seed defaults
          seedInitialPosData(DEFAULT_POS_CATEGORIES, DEFAULT_POS_ITEMS).catch(console.error);
        }
      });

      // Subscribe to Items & Inventory
      unsubItems = subscribePosItems(firestoreItems => {
        if (firestoreItems.length > 0) {
          setItems(firestoreItems);
        }
      });

      // Subscribe to Orders
      unsubOrders = subscribePosOrders(firestoreOrders => {
        if (firestoreOrders.length > 0) {
          setOrders(firestoreOrders);
        }
      });

      // Subscribe to Today's Settlement
      unsubSettlement = subscribePosSettlement(todayDateStr, firestoreSettlement => {
        if (firestoreSettlement) {
          setSettlement(firestoreSettlement);
        }
      });

      // Subscribe to Audit Logs
      unsubLogs = subscribePosLogs(firestoreLogs => {
        if (firestoreLogs) {
          setLogs(firestoreLogs);
        }
      });
    };

    init().catch(err => {
      console.warn('Firestore initialization fallback:', err);
    });

    return () => {
      if (unsubCats) unsubCats();
      if (unsubItems) unsubItems();
      if (unsubOrders) unsubOrders();
      if (unsubSettlement) unsubSettlement();
      if (unsubLogs) unsubLogs();
    };
  }, [todayDateStr]);

  const todayOrders = useMemo(() => {
    return orders.filter(o => {
      try {
        return format(new Date(o.timestamp), 'yyyy-MM-dd') === todayDateStr;
      } catch {
        return false;
      }
    });
  }, [orders, todayDateStr]);

  const activeTodayOrders = useMemo(() => todayOrders.filter(o => !o.isCancelled), [todayOrders]);

  const totalSalesToday = useMemo(
    () => activeTodayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [activeTodayOrders]
  );

  const cashSalesToday = useMemo(
    () =>
      activeTodayOrders
        .filter(o => o.paymentMethod === 'CASH')
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [activeTodayOrders]
  );

  const transferSalesToday = useMemo(
    () =>
      activeTodayOrders
        .filter(o => o.paymentMethod === 'TRANSFER')
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [activeTodayOrders]
  );

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Safe item updater with Cart synchronization & Firestore Sync
  const handleUpdateItems = async (newItems: PosItem[]) => {
    setItems(newItems);
    setCart(prevCart => {
      return prevCart
        .filter(ci => newItems.some(it => it.id === ci.item.id))
        .map(ci => {
          const fresh = newItems.find(it => it.id === ci.item.id)!;
          return {
            item: fresh,
            count: Math.min(ci.count, Math.max(1, fresh.stock)),
          };
        })
        .filter(ci => ci.item.stock > 0);
    });

    try {
      for (const item of newItems) {
        await savePosItem(item);
      }
    } catch (e) {
      console.error('Failed to sync items with Firestore:', e);
    }
  };

  const handleUpdateCategories = async (newCategories: PosCategory[]) => {
    setCategories(newCategories);
    try {
      for (const cat of newCategories) {
        await savePosCategory(cat);
      }
    } catch (e) {
      console.error('Failed to sync categories with Firestore:', e);
    }
  };

  const handleResetToDefault = async () => {
    try {
      await resetPosDataToDefaults(DEFAULT_POS_CATEGORIES, DEFAULT_POS_ITEMS);
      setItems(DEFAULT_POS_ITEMS);
      setCategories(DEFAULT_POS_CATEGORIES);
      setCart([]);
      showToast('새로운 기본 메뉴 33종 및 카테고리가 초기화되었습니다.', 'success');
    } catch (e: any) {
      console.error('Reset error:', e);
      showToast('초기화 중 오류가 발생했습니다: ' + e.message, 'error');
    }
  };

  const handleApplyPreset = async (
    newCategories: PosCategory[],
    newItems: PosItem[],
    presetName: string
  ) => {
    try {
      await applyPosPreset(newCategories, newItems);
      setCategories(newCategories);
      setItems(newItems);
      setCart([]);
      showToast(`'${presetName}' 프리셋이 성공적으로 적용되었습니다.`, 'success');
    } catch (e: any) {
      console.error('Preset apply error:', e);
      showToast('프리셋 적용 중 오류가 발생했습니다: ' + e.message, 'error');
    }
  };

  const handleClearAllFavorites = async () => {
    try {
      await clearAllPosFavorites(items);
      setItems(prev => prev.map(i => ({ ...i, isFavorite: false })));
      showToast('모든 상품의 즐겨찾기가 일괄 해제되었습니다.', 'success');
    } catch (e: any) {
      console.error('Clear favorites error:', e);
      showToast('즐겨찾기 해제 중 오류가 발생했습니다: ' + e.message, 'error');
    }
  };

  // Cart Operations
  const handleAddToCart = (item: PosItem) => {
    if (item.stock <= 0) {
      if (!isSoundMuted) PosFeedback.playError();
      showToast(`${item.name}은(는) 품절되었습니다.`, 'error');
      return;
    }

    if (!isSoundMuted) PosFeedback.playBeep();

    setCart(prevCart => {
      const existing = prevCart.find(ci => ci.item.id === item.id);
      if (existing) {
        if (existing.count >= item.stock) {
          if (!isSoundMuted) PosFeedback.playError();
          showToast(`재고(${item.stock}개)보다 더 많이 담을 수 없습니다.`, 'error');
          return prevCart;
        }
        return prevCart.map(ci =>
          ci.item.id === item.id ? { ...ci, count: ci.count + 1 } : ci
        );
      } else {
        return [...prevCart, { item, count: 1 }];
      }
    });
  };

  const handleUpdateCount = (itemId: string, newCount: number) => {
    if (!isSoundMuted) PosFeedback.playBeep();
    setCart(prevCart => {
      return prevCart.map(ci => {
        if (ci.item.id === itemId) {
          const validCount = Math.max(1, Math.min(newCount, ci.item.stock));
          return { ...ci, count: validCount };
        }
        return ci;
      });
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!isSoundMuted) PosFeedback.playCancel();
    setCart(prevCart => prevCart.filter(ci => ci.item.id !== itemId));
  };

  const handleClearCart = () => {
    if (!isSoundMuted) PosFeedback.playCancel();
    setCart([]);
    showToast('장바구니를 비웠습니다.');
  };

  const handleKeypadConfirm = (newCount: number) => {
    if (!keypadTarget) return;
    handleUpdateCount(keypadTarget.item.id, newCount);
    setKeypadTarget(null);
  };

  // [트랜잭션 결제] runOrderTransaction: orders 문서 생성과 items.stock 차감을 Firestore 단일 트랜잭션으로 원자적 처리
  const executeOrder = async (
    method: 'CASH' | 'TRANSFER',
    total: number,
    cashReceived?: number,
    changeAmount?: number,
    extraDetails?: string
  ) => {
    if (cart.length === 0) return;
    setIsProcessingOrder(true);

    try {
      const newOrder = await runOrderTransaction({
        sessionId: todayDateStr,
        handlerUid: currentUser?.id || 'staff',
        handlerName: currentUser?.name || '매점판매원',
        paymentMethod: method,
        totalAmount: total,
        cashReceived,
        changeAmount,
        cart,
      });

      // Cart reset upon success
      setCart([]);

      if (!isSoundMuted) PosFeedback.playSuccess();

      showToast(
        `${method === 'CASH' ? '현금' : '계좌이체'} 결제가 완료되었습니다! (${total.toLocaleString()}원)${extraDetails ? ` - ${extraDetails}` : ''}`,
        'success'
      );
    } catch (error: any) {
      console.error('Order transaction error:', error);
      if (!isSoundMuted) PosFeedback.playError();
      showToast(error.message || '결제 처리 중 오류가 발생했습니다. 재고를 확인하세요.', 'error');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleConfirmCashPayment = (received: number, change: number) => {
    const total = cart.reduce((sum, item) => sum + item.item.price * item.count, 0);
    setShowCashModal(false);
    executeOrder('CASH', total, received, change, change > 0 ? `거스름돈 ${change.toLocaleString()}원` : '거스름돈 없음');
  };

  const handleConfirmTransferPayment = () => {
    const total = cart.reduce((sum, item) => sum + item.item.price * item.count, 0);
    setShowTransferModal(false);
    executeOrder('TRANSFER', total, undefined, undefined, '입금 확인 완료');
  };

  // [트랜잭션 결제 취소] runCancelOrderTransaction: order 상태 취소 처리 및 품목 재고 자동 원자적 롤백
  const handleCancelOrder = async (orderId: string, reason?: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    if (target.isCancelled) {
      showToast('이미 취소된 주문입니다.', 'error');
      return;
    }

    try {
      const trimmedReason = reason?.trim() || '단순 변심/고객 요청';
      const nowIso = new Date().toISOString();
      const cancelAuthor = currentUser?.name || '관리자';

      // 1. 즉시 로컬 state 갱신 (Firestore 실시간 지연 없이 즉각 화면 반영)
      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.id === orderId
            ? {
                ...o,
                isCancelled: true,
                cancelledBy: cancelAuthor,
                cancelledAt: nowIso,
                cancelReason: trimmedReason,
              }
            : o
        )
      );

      // 2. Firestore 트랜잭션 동기화 (원자적 재고 롤백 & 주문 업데이트)
      await runCancelOrderTransaction(orderId, cancelAuthor, trimmedReason);
      showToast(`주문(${orderId.slice(-6)}) 결제가 취소되고 재고가 자동 복원되었습니다.`, 'success');
    } catch (error: any) {
      console.error('Cancel order failed:', error);
      showToast(error.message || '결제 취소 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleSaveSettlement = async (newSettlement: PosSettlement) => {
    setSettlement(newSettlement);
    try {
      await savePosSettlement(newSettlement);
      showToast('마감 정산 보고서가 Firestore에 저장되었습니다.', 'success');
    } catch (e: any) {
      console.error('Save settlement error:', e);
      showToast('정산 저장 중 오류 발생: ' + e.message, 'error');
    }
  };

  // [관리자 전용] 매출 내역(주문) 직접 수정
  const handleUpdateOrder = async (updatedOrder: PosOrder) => {
    setOrders(prev => prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o)));
    try {
      await updatePosOrder(updatedOrder);
      showToast('매출 내역이 성공적으로 수정되었습니다.', 'success');
    } catch (e: any) {
      console.error('Update order error:', e);
      showToast('매출 수정 중 오류가 발생했습니다: ' + e.message, 'error');
    }
  };

  // [관리자 전용] 매출 내역(주문) 완전 삭제
  const handleDeleteOrder = async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      await deletePosOrder(orderId);
      showToast('매출 내역이 완전히 삭제되었습니다.', 'success');
    } catch (e: any) {
      console.error('Delete order error:', e);
      showToast('매출 삭제 중 오류가 발생했습니다: ' + e.message, 'error');
    }
  };

  // [관리자 전용] 여러 매출 내역(주문) 일괄 삭제
  const handleDeleteMultipleOrders = async (orderIds: string[]) => {
    if (!orderIds || orderIds.length === 0) return;
    const count = orderIds.length;
    setOrders(prev => prev.filter(o => !orderIds.includes(o.id)));
    try {
      await deleteMultiplePosOrders(orderIds);
      showToast(`선택한 ${count}건의 매출 내역이 일괄 삭제되었습니다.`, 'success');
    } catch (e: any) {
      console.error('Batch delete orders error:', e);
      showToast('일괄 삭제 중 오류가 발생했습니다: ' + e.message, 'error');
    }
  };

  // Safe Logout at Main Screen
  const handleLogout = () => {
    logoutPosUser();
    setCurrentUser(null);
    setPosScreenMode('hub');
    showToast('POS 시스템에서 로그아웃되었습니다.');
  };

  // Exit to School Portal
  const handleExitToPortal = () => {
    navigate('/');
  };

  // End Shift and return to Main Hub
  const handleConfirmEndShift = () => {
    setShowEndShiftConfirm(false);
    setCart([]);
    setPosScreenMode('hub');
    showToast('매점 영업이 종료되었습니다. 메인 화면으로 복귀했습니다.');
  };

  // Switch account success during sales
  const handleSwitchAccountSuccess = (newUser: PosUser) => {
    setCurrentUser(newUser);
    setShowSwitchAccountModal(false);
    showToast(`근무자가 '${newUser.name}' 님으로 교환되었습니다.`);
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + item.item.price * item.count, 0);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#080d1a] text-white flex flex-col overflow-hidden z-50 select-none">
      {/* 1. If not logged in at all, show dedicated POS initial login modal */}
      {!currentUser && (
        <PosLoginModal
          onLoginSuccess={user => {
            setCurrentUser(user);
            setPosScreenMode('hub');
          }}
          onExitToPortal={handleExitToPortal}
        />
      )}

      {/* 2. When logged in: If in 'hub' mode -> Show POS Main Screen (Landing Hub) */}
      {currentUser && posScreenMode === 'hub' && (
        <PosHubHome
          user={currentUser}
          items={items}
          categories={categories}
          totalSalesToday={totalSalesToday}
          cashSalesToday={cashSalesToday}
          transferSalesToday={transferSalesToday}
          todayOrdersCount={activeTodayOrders.length}
          hasActiveCart={cart.length > 0}
          onStartSales={() => setPosScreenMode('register')}
          onOpenProductManager={() => setShowProductManager(true)}
          onOpenSalesHistory={() => setShowSalesHistoryModal(true)}
          onOpenSettlement={() => setShowSettlementModal(true)}
          onOpenAuditLog={() => setShowAuditLogModal(true)}
          onLogout={handleLogout}
          onExitToPortal={handleExitToPortal}
        />
      )}

      {/* 3. When logged in: If in 'register' mode -> Active Sales Register Screen */}
      {currentUser && posScreenMode === 'register' && (
        <>
          {/* POS Active Sales Header with Switch Account & End Shift */}
          <PosHeader
            user={currentUser}
            isCloudConnected={isFirestoreConnected}
            isOnline={isOnline}
            isSoundMuted={isSoundMuted}
            onToggleSound={toggleSound}
            onExitToPortal={handleExitToPortal}
            onOpenProductManager={() => setShowProductManager(true)}
            onOpenSalesHistory={() => setShowSalesHistoryModal(true)}
            onOpenAuditLog={() => setShowAuditLogModal(true)}
            onSwitchAccount={() => setShowSwitchAccountModal(true)}
            onEndShift={() => setShowEndShiftConfirm(true)}
            totalSalesToday={totalSalesToday}
            cashSalesToday={cashSalesToday}
            transferSalesToday={transferSalesToday}
          />

          {/* Main 2-Column Split: Menu Grid vs Cart with Galaxy-style Draggable Splitter */}
          <div
            ref={splitContainerRef}
            className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative select-none z-0"
          >
            {/* Left Panel: Menu selection */}
            <div
              style={{ width: `${splitRatio}%` }}
              className="w-full md:w-auto h-full flex flex-col overflow-hidden min-w-0 md:min-w-[280px]"
            >
              <PosMenuGrid
                categories={categories}
                items={items}
                cart={cart}
                onAddToCart={handleAddToCart}
                onOpenProductManager={() => setShowProductManager(true)}
              />
            </div>

            {/* Samsung Galaxy Split-Screen Draggable Divider */}
            <PosSplitDivider
              splitRatio={splitRatio}
              onRatioChange={setSplitRatio}
              containerRef={splitContainerRef}
              minRatio={30}
              maxRatio={78}
              defaultRatio={62}
            />

            {/* Right Panel: Cart & Payment Panel */}
            <div
              style={{ width: `${100 - splitRatio}%` }}
              className="w-full md:w-auto h-full flex flex-col overflow-hidden min-w-0 md:min-w-[260px]"
            >
              <PosCart
                cart={cart}
                isProcessing={isProcessingOrder}
                isOnline={isOnline}
                onUpdateCount={handleUpdateCount}
                onRemoveItem={handleRemoveItem}
                onRequestClear={() => setShowClearConfirm(true)}
                onOpenKeypad={cartItem => setKeypadTarget(cartItem)}
                onRequestCashPayment={() => setShowCashModal(true)}
                onRequestTransferPayment={() => setShowTransferModal(true)}
              />
            </div>
          </div>
        </>
      )}

      {/* Modal: Switch Account during sales */}
      <AnimatePresence>
        {showSwitchAccountModal && currentUser && (
          <PosLoginModal
            mode="switch"
            currentUserName={currentUser.name}
            onLoginSuccess={handleSwitchAccountSuccess}
            onClose={() => setShowSwitchAccountModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal: End Shift Confirmation */}
      <AnimatePresence>
        {showEndShiftConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e172e] border border-white/20 w-full max-w-md rounded-3xl p-6 shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4 mx-auto border border-red-500/30">
                <Power className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white text-center">
                매점 영업을 종료하시겠습니까?
              </h3>
              <p className="text-xs text-surface-dim text-center mt-2 leading-relaxed">
                영업 종료 시 판매 화면이 정리되고 <strong className="text-white">POS 메인 화면</strong>으로 복귀합니다. 메인 화면에서 오늘 정산 내역을 확인하거나 안전하게 로그아웃할 수 있습니다.
              </p>

              {cart.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>현재 장바구니에 담긴 {cart.length}개 품목이 비워집니다.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEndShiftConfirm(false)}
                  className="py-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-surface-dim hover:text-white transition-colors"
                >
                  취소 (영업 계속)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEndShift}
                  className="py-3 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all active:scale-[0.98]"
                >
                  영업 종료 확인
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs md:text-sm font-bold border backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-red-600/90 border-red-500/50 text-white'
                : 'bg-emerald-600/90 border-emerald-500/50 text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-200" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Direct Quantity Keypad */}
      <AnimatePresence>
        {keypadTarget && (
          <PosKeypadModal
            cartItem={keypadTarget}
            onConfirm={handleKeypadConfirm}
            onClose={() => setKeypadTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal: Clear Cart Confirm */}
      <AnimatePresence>
        {showClearConfirm && (
          <PosClearConfirmModal
            totalItems={cart.reduce((s, i) => s + i.count, 0)}
            onConfirm={handleClearCart}
            onClose={() => setShowClearConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal: Cash Payment Calculator */}
      <AnimatePresence>
        {showCashModal && (
          <PosCashModal
            totalAmount={totalCartAmount}
            onConfirmPayment={handleConfirmCashPayment}
            onClose={() => setShowCashModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal: Transfer Payment Confirmation (Simplified) */}
      <AnimatePresence>
        {showTransferModal && (
          <PosTransferModal
            totalAmount={totalCartAmount}
            onConfirmPayment={handleConfirmTransferPayment}
            onClose={() => setShowTransferModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal: Product and Category Manager */}
      <AnimatePresence>
        {showProductManager && (
          <PosProductManagerModal
            categories={categories}
            items={items}
            onUpdateItems={handleUpdateItems}
            onUpdateCategories={handleUpdateCategories}
            onDeleteItem={deletePosItem}
            onDeleteCategory={deletePosCategory}
            onResetToDefault={handleResetToDefault}
            onApplyPreset={handleApplyPreset}
            onClearAllFavorites={handleClearAllFavorites}
            onClose={() => setShowProductManager(false)}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Modal: Sales History & Receipts (3단계) */}
      <PosSalesHistoryModal
        isOpen={showSalesHistoryModal}
        onClose={() => setShowSalesHistoryModal(false)}
        orders={orders}
        onCancelOrder={handleCancelOrder}
        onUpdateOrder={handleUpdateOrder}
        onDeleteOrder={handleDeleteOrder}
        onDeleteMultipleOrders={handleDeleteMultipleOrders}
        currentUserName={currentUser?.name || '관리자'}
      />

      {/* Modal: Daily Shift Settlement & Cash Drawer (3단계) */}
      <PosSettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        orders={todayOrders}
        currentUserName={currentUser?.name || '관리자'}
        currentUserId={currentUser?.id || 'admin'}
        settlement={settlement}
        onSaveSettlement={handleSaveSettlement}
      />

      {/* Modal: Activity & Audit Logs (감사 로그) */}
      <PosAuditLogModal
        isOpen={showAuditLogModal}
        onClose={() => setShowAuditLogModal(false)}
        logs={logs}
        isAdmin={currentUser?.role === 'admin'}
        actorName={currentUser?.name || '관리자'}
      />
    </div>
  );
}
