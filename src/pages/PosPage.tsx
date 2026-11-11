import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { format } from 'date-fns';
import { CheckCircle2, AlertCircle, Power, AlertTriangle, ShoppingCart, ChevronUp, ChevronDown } from 'lucide-react';
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
import { PosGifticonInputModal } from '../components/pos/PosGifticonInputModal';
import { PosSplitDivider } from '../components/pos/PosSplitDivider';
import { PosHubHome } from '../components/pos/PosHubHome';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getStoredPosUser, logoutPosUser, isGoogleAdminEmail } from '../services/posAuth';
import { DEFAULT_POS_CATEGORIES, DEFAULT_POS_ITEMS } from '../data/defaultPosData';
import { PosCategory, PosItem, CartItem, PosUser, PosOrder, PosSettlement, PosPreset, PosAuditLog } from '../types/pos';
import { PosFeedback } from '../utils/posFeedback';
import {
  POS_SCREEN_TRANSITION,
  POS_MODAL_BACKDROP_TRANSITION,
  POS_MODAL_PANEL_TRANSITION,
  POS_BUMP_TRANSITION,
} from '../utils/motion';
import {
  ensurePosAuth,
  subscribePosCategories,
  subscribePosItems,
  subscribePosOrders,
  subscribePosSettlement,
  subscribePosLogs,
  IS_POS_AUDIT_LOG_ENABLED,
  seedInitialPosData,
  resetPosDataToDefaults,
  clearAllPosFavorites,
  applyPosPreset,
  subscribePosPresets,
  savePosPreset,
  deletePosPreset,
  runOrderTransaction,
  runCancelOrderTransaction,
  runPartialCancelOrderTransaction,
  runRestoreCancelledOrderTransaction,
  runRestorePartialRefundTransaction,
  updatePosOrder,
  deletePosOrder,
  deleteMultiplePosOrders,
  savePosItem,
  saveSinglePosItemPartial,
  saveMultiplePosItems,
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

  // Ensure stored admin sessions remain backed by an authenticated & verified Google Admin token
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, firebaseUser => {
      setCurrentUser(prev => {
        if (!prev || prev.role !== 'admin') return prev;
        const email = (firebaseUser?.email || firebaseUser?.providerData?.[0]?.email || '').toLowerCase().trim();
        if (!firebaseUser || !firebaseUser.emailVerified || !isGoogleAdminEmail(email)) {
          logoutPosUser(prev);
          return null;
        }
        return prev;
      });
    });
    return () => unsub();
  }, []);

  // Screen View Mode: 'hub' (포스기 메인화면) | 'register' (포스기 판매/영업 화면)
  const [posScreenMode, setPosScreenMode] = useState<'hub' | 'register'>('hub');

  // Modal for confirming shift end
  const [showEndShiftConfirm, setShowEndShiftConfirm] = useState<boolean>(false);

  // POS Categories State (hydrated and deduplicated from localStorage)
  const [categories, setCategories] = useState<PosCategory[]>(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, PosCategory>();
          parsed.forEach((c: PosCategory, idx: number) => {
            const cleanName = (c.name || '').trim();
            if (cleanName && !map.has(cleanName.toLowerCase())) {
              map.set(cleanName.toLowerCase(), {
                name: cleanName,
                orderIndex: typeof c.orderIndex === 'number' ? c.orderIndex : idx + 1,
              });
            }
          });
          if (map.size > 0) {
            return Array.from(map.values()).sort((a, b) => a.orderIndex - b.orderIndex);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
    return DEFAULT_POS_CATEGORIES;
  });

  // POS Items State (hydrated from localStorage)
  const [items, setItems] = useState<PosItem[]>(() => {
    try {
      const saved = localStorage.getItem(ITEMS_STORAGE_KEY);
      if (saved) {
        const parsed: PosItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(it => ({
            ...it,
            categoryId: (it.categoryId || '').trim(),
          }));
        }
      }
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
  const [showGifticonModal, setShowGifticonModal] = useState<boolean>(false);

  // Direct Discount Amount State (직접 할인 금액)
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Responsive Viewport & Orientation Detection
  // 데스크톱 가로 모드 및 태블릿 가로 모드일 때만 좌우 2분할(Split) 레이아웃 적용.
  // 스마트폰(전체) 및 탭(태블릿: 갤럭시 탭, 아이패드 등)을 세로로 세웠을 때는 모바일처럼 장바구니가 하단으로 가도록 처리.
  const checkIsSplitLayout = () => {
    if (typeof window === 'undefined') return true;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLandscape = w > h;

    // 1. 세로 모드 (Portrait, h >= w):
    // 탭(태블릿) 세로 화면(iPad, 갤럭시 탭: 768px, 800px, 820px, 834px, 1024px 등)과 스마트폰 세로는
    // 모두 장바구니가 하단으로 이동 (false)
    // (단, 1150px 이상의 초대형 피벗 모니터만 가로 분할 유지)
    if (!isLandscape && w < 1150) {
      return false;
    }

    // 2. 가로 모드 (Landscape, w > h):
    // 최소 768px 이상의 가로 화면(태블릿 가로, 랩탑, PC 데스크톱)일 때만 좌우 분할
    if (isLandscape && w >= 768) {
      return true;
    }

    // 3. 그 외 (스마트폰 가로 등) 모두 하단 장바구니 모드
    return false;
  };

  const [isSplitLayout, setIsSplitLayout] = useState<boolean>(() => checkIsSplitLayout());

  useEffect(() => {
    const handleViewportChange = () => {
      const split = checkIsSplitLayout();
      setIsSplitLayout(split);
      if (split) {
        setIsMobileCartOpen(false);
      }
    };

    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    const mql = window.matchMedia('(orientation: portrait)');
    const handleMqlChange = () => handleViewportChange();
    if (mql?.addEventListener) {
      mql.addEventListener('change', handleMqlChange);
    }

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      if (mql?.removeEventListener) {
        mql.removeEventListener('change', handleMqlChange);
      }
    };
  }, []);

  // Mobile / Tablet Portrait Cart Slide-up & Gestures (방법 1: 슬라이드 제스처, 방법 2: 전용 하단 버튼)
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const touchStartYRef = useRef<number>(0);
  const touchCurrentYRef = useRef<number>(0);

  // Close mobile cart if screen expands to split layout
  useEffect(() => {
    if (isSplitLayout) {
      setIsMobileCartOpen(false);
    }
  }, [isSplitLayout]);

  // Swipe up on collapsed mobile bottom bar (방법 1)
  const handleBarTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchCurrentYRef.current = e.touches[0].clientY;
  };

  const handleBarTouchMove = (e: React.TouchEvent) => {
    touchCurrentYRef.current = e.touches[0].clientY;
  };

  const handleBarTouchEnd = () => {
    const diffY = touchStartYRef.current - touchCurrentYRef.current;
    if (diffY > 28) {
      setIsMobileCartOpen(true);
    }
  };

  // Swipe down on expanded mobile sheet header (방법 1)
  const handleSheetHeaderTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchCurrentYRef.current = e.touches[0].clientY;
  };

  const handleSheetHeaderTouchMove = (e: React.TouchEvent) => {
    touchCurrentYRef.current = e.touches[0].clientY;
  };

  const handleSheetHeaderTouchEnd = () => {
    const diffY = touchCurrentYRef.current - touchStartYRef.current;
    if (diffY > 35) {
      setIsMobileCartOpen(false);
    }
  };

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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load orders', e);
    }
    return [];
  });

  // Day metrics dynamically calculated from orders
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');

  // Daily Settlement State (hydrated from localStorage for today's date only)
  const [settlement, setSettlement] = useState<PosSettlement | null>(() => {
    try {
      const saved = localStorage.getItem(SETTLEMENT_STORAGE_KEY);
      if (saved) {
        const parsed: PosSettlement = JSON.parse(saved);
        if (parsed && parsed.id === todayDateStr) {
          return parsed;
        }
      }
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

  // Persist settlement (only for today)
  useEffect(() => {
    try {
      if (settlement && settlement.id === todayDateStr) {
        localStorage.setItem(SETTLEMENT_STORAGE_KEY, JSON.stringify(settlement));
      } else if (!settlement) {
        localStorage.removeItem(SETTLEMENT_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save settlement', e);
    }
  }, [settlement, todayDateStr]);

  // Persist audit logs
  useEffect(() => {
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save logs', e);
    }
  }, [logs]);

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
          const map = new Map<string, PosCategory>();
          firestoreCats.forEach((c, idx) => {
            const cleanName = c.name.trim();
            if (cleanName && !map.has(cleanName.toLowerCase())) {
              map.set(cleanName.toLowerCase(), {
                name: cleanName,
                orderIndex: typeof c.orderIndex === 'number' ? c.orderIndex : idx + 1,
              });
            }
          });
          setCategories(Array.from(map.values()).sort((a, b) => a.orderIndex - b.orderIndex));
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
        setOrders(firestoreOrders);
      });

      // Subscribe to Today's Settlement
      unsubSettlement = subscribePosSettlement(todayDateStr, firestoreSettlement => {
        if (firestoreSettlement) {
          setSettlement(firestoreSettlement);
        } else {
          // If no settlement exists in Firestore for today (or deleted), clear settlement and localStorage
          setSettlement(null);
          try {
            localStorage.removeItem(SETTLEMENT_STORAGE_KEY);
          } catch (e) {
            console.error(e);
          }
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
    () =>
      activeTodayOrders.reduce(
        (sum, o) => sum + (o.actualPaidAmount ?? Math.max(0, o.totalAmount - (o.gifticonDiscountAmount || 0))),
        0
      ),
    [activeTodayOrders]
  );

  const cashSalesToday = useMemo(
    () =>
      activeTodayOrders
        .filter(o => o.paymentMethod === 'CASH')
        .reduce(
          (sum, o) => sum + (o.actualPaidAmount ?? Math.max(0, o.totalAmount - (o.gifticonDiscountAmount || 0))),
          0
        ),
    [activeTodayOrders]
  );

  const transferSalesToday = useMemo(
    () =>
      activeTodayOrders
        .filter(o => o.paymentMethod === 'TRANSFER')
        .reduce(
          (sum, o) => sum + (o.actualPaidAmount ?? Math.max(0, o.totalAmount - (o.gifticonDiscountAmount || 0))),
          0
        ),
    [activeTodayOrders]
  );

  const todayDiscountTotal = useMemo(
    () => activeTodayOrders.reduce((sum, o) => sum + (o.gifticonDiscountAmount || 0), 0),
    [activeTodayOrders]
  );

  const todaySoldByItemMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeTodayOrders.forEach(order => {
      order.items?.forEach(oi => {
        if (oi.itemId && oi.count > 0) {
          map[oi.itemId] = (map[oi.itemId] || 0) + oi.count;
        }
      });
    });
    return map;
  }, [activeTodayOrders]);

  const todayTotalSoldCount = useMemo(
    () => Object.values(todaySoldByItemMap).reduce((sum, cnt) => sum + cnt, 0),
    [todaySoldByItemMap]
  );

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getActorId = (defaultRole: '근무자' | '관리자' = '근무자') => {
    if (!currentUser) return defaultRole;
    return currentUser.id || defaultRole;
  };

  // Fast atomic single-item updater (instant optimistic response, no subscription delay)
  const handleUpdateSingleItem = async (updatedItem: PosItem) => {
    // 1. Optimistic state update
    setItems(prev => {
      const exists = prev.some(it => it.id === updatedItem.id);
      if (exists) {
        return prev.map(it => (it.id === updatedItem.id ? updatedItem : it));
      }
      return [updatedItem, ...prev];
    });

    // 2. Sync cart
    setCart(prevCart => {
      return prevCart
        .map(ci => {
          if (ci.item.id === updatedItem.id) {
            return {
              ...ci,
              item: updatedItem,
            };
          }
          return ci;
        })
        .filter(ci => !ci.item.isSoldOut && ci.item.isActive !== false);
    });

    // 3. Fast single Firestore write
    try {
      await savePosItem(updatedItem, getActorId('근무자'), currentUser?.id);
    } catch (e) {
      console.error('Failed to sync item with Firestore:', e);
    }
  };

  // Fast partial property patcher (stock delta, active toggle, favorite toggle)
  const handlePatchSingleItem = async (itemId: string, patch: Partial<PosItem>) => {
    // 1. Optimistic state update
    setItems(prev =>
      prev.map(it => {
        if (it.id === itemId) {
          return { ...it, ...patch };
        }
        return it;
      })
    );

    // 2. Sync cart if relevant
    if (patch.stock !== undefined || patch.isSoldOut !== undefined || patch.name !== undefined || patch.price !== undefined || patch.isActive !== undefined) {
      setCart(prevCart => {
        return prevCart
          .map(ci => {
            if (ci.item.id === itemId) {
              const fresh = { ...ci.item, ...patch };
              return {
                ...ci,
                item: fresh,
              };
            }
            return ci;
          })
          .filter(ci => !ci.item.isSoldOut && ci.item.isActive !== false);
      });
    }

    // 3. Fast single Firestore write
    try {
      await saveSinglePosItemPartial(itemId, patch, getActorId('근무자'), currentUser?.id);
    } catch (e) {
      console.error('Failed to sync item patch with Firestore:', e);
    }
  };

  // Safe item updater with Cart synchronization (Local State Sync)
  const handleUpdateItems = (newItems: PosItem[]) => {
    setItems(newItems);
    setCart(prevCart => {
      return prevCart
        .filter(ci => newItems.some(it => it.id === ci.item.id))
        .map(ci => {
          const fresh = newItems.find(it => it.id === ci.item.id)!;
          return {
            ...ci,
            item: fresh,
          };
        })
        .filter(ci => !ci.item.isSoldOut && ci.item.isActive !== false);
    });
  };

  const handleUpdateCategories = (newCategories: PosCategory[]) => {
    const map = new Map<string, PosCategory>();
    newCategories.forEach((cat, idx) => {
      const cleanName = cat.name.trim();
      if (cleanName && !map.has(cleanName.toLowerCase())) {
        map.set(cleanName.toLowerCase(), {
          name: cleanName,
          orderIndex: typeof cat.orderIndex === 'number' ? cat.orderIndex : idx + 1,
        });
      }
    });
    setCategories(Array.from(map.values()).sort((a, b) => a.orderIndex - b.orderIndex));
  };

  const handleResetToDefault = async () => {
    try {
      await resetPosDataToDefaults(
        DEFAULT_POS_CATEGORIES,
        DEFAULT_POS_ITEMS,
        getActorId('관리자'),
        currentUser?.id
      );
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
    presetName: string,
    presetId?: string
  ) => {
    try {
      await applyPosPreset(newCategories, newItems, presetName, getActorId('관리자'), presetId, currentUser?.id);
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
      await clearAllPosFavorites(items, getActorId('근무자'), currentUser?.id);
      setItems(prev => prev.map(i => ({ ...i, isFavorite: false })));
      showToast('모든 상품의 즐겨찾기가 일괄 해제되었습니다.', 'success');
    } catch (e: any) {
      console.error('Clear favorites error:', e);
      showToast('즐겨찾기 해제 중 오류가 발생했습니다: ' + e.message, 'error');
    }
  };

  // Long-press quick toggle for Sold-Out status directly from register screen
  const handleQuickToggleSoldOut = async (item: PosItem) => {
    const nextSoldOut = !Boolean(item.isSoldOut);
    await handlePatchSingleItem(item.id, { isSoldOut: nextSoldOut });
    if (!isSoundMuted) {
      if (nextSoldOut) PosFeedback.playCancel();
      else PosFeedback.playBeep();
    }
    showToast(
      nextSoldOut
        ? `'${item.name}' 품절 처리되었습니다.`
        : `'${item.name}' 품절이 해제되어 판매중으로 전환되었습니다.`,
      nextSoldOut ? 'error' : 'success'
    );
  };

  // Cart Operations
  const handleAddToCart = (item: PosItem) => {
    const isSoldOut = Boolean(item.isSoldOut);
    if (isSoldOut) {
      if (!isSoundMuted) PosFeedback.playError();
      showToast(`${item.name}은(는) 현재 품절 상태입니다.`, 'error');
      return;
    }

    if (!isSoundMuted) PosFeedback.playBeep();

    setCart(prevCart => {
      const existing = prevCart.find(ci => ci.item.id === item.id);
      if (existing) {
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
          const validCount = Math.max(1, newCount);
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
    setDiscountAmount(0);
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
    extraDetails?: string,
    buyerName?: string,
    memo?: string
  ) => {
    if (cart.length === 0) return;
    setIsProcessingOrder(true);

    try {
      const effectiveDiscount = Math.min(total, Math.max(0, discountAmount));
      const actualPaidAmount = Math.max(0, total - effectiveDiscount);

      await runOrderTransaction({
        sessionId: todayDateStr,
        handlerUid: currentUser?.id || 'staff',
        handlerName: currentUser?.name || '매점판매원',
        buyerName,
        memo,
        paymentMethod: method,
        totalAmount: total,
        gifticonDiscountAmount: effectiveDiscount,
        actualPaidAmount,
        cashReceived,
        changeAmount,
        cart,
      });

      // Reset cart and applied discount upon success
      setCart([]);
      setDiscountAmount(0);

      if (!isSoundMuted) PosFeedback.playSuccess();

      const buyerText = buyerName ? ` (결제자: ${buyerName})` : '';
      const discountNotice = effectiveDiscount > 0
        ? ` [할인 -${effectiveDiscount.toLocaleString()}원 / 실결제 ${actualPaidAmount.toLocaleString()}원]`
        : '';

      showToast(
        `${method === 'CASH' ? '현금' : '계좌이체'} 결제가 완료되었습니다! (${(effectiveDiscount > 0 ? actualPaidAmount : total).toLocaleString()}원)${buyerText}${discountNotice}${extraDetails ? ` - ${extraDetails}` : ''}`,
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

  const handleConfirmCashPayment = (received: number, change: number, buyerName?: string, memo?: string) => {
    const total = cart.reduce((sum, item) => sum + item.item.price * item.count, 0);
    setShowCashModal(false);
    setIsMobileCartOpen(false);
    executeOrder('CASH', total, received, change, change > 0 ? `거스름돈 ${change.toLocaleString()}원` : '거스름돈 없음', buyerName, memo);
  };

  const handleConfirmTransferPayment = (buyerName?: string, memo?: string) => {
    const total = cart.reduce((sum, item) => sum + item.item.price * item.count, 0);
    setShowTransferModal(false);
    setIsMobileCartOpen(false);
    executeOrder('TRANSFER', total, undefined, undefined, '입금 확인 완료', buyerName, memo);
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

      // 1. 즉시 로컬 state 갱신 (주문 취소 및 상품 판매 수량 즉시 복구)
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

      if (target.items && target.items.length > 0) {
        setItems(prevItems =>
          prevItems.map(it => {
            const match = target.items?.find(ti => ti.itemId === it.id);
            if (match) {
              return {
                ...it,
                totalSold: Math.max(0, (it.totalSold || 0) - match.count),
              };
            }
            return it;
          })
        );
      }

      // 2. Firestore 트랜잭션 동기화 (원자적 판매수량 롤백 & 주문 업데이트)
      await runCancelOrderTransaction(orderId, cancelAuthor, trimmedReason);
      showToast(`주문(${orderId.slice(-6)}) 결제가 취소되고 판매 수량이 원복되었습니다.`, 'success');
    } catch (error: any) {
      console.error('Cancel order failed:', error);
      showToast(error.message || '결제 취소 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // [트랜잭션 개별/부분 환불] 주문 내 특정 품목/수량만 선택하여 환불 처리 및 판매 수량 원복
  const handlePartialCancelOrder = async (
    orderId: string,
    refundTargets: Array<{ itemId: string; count: number }>,
    reason?: string
  ) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    if (target.isCancelled) {
      showToast('이미 취소된 주문입니다.', 'error');
      return;
    }

    try {
      const trimmedReason = reason?.trim() || '고객 요청 (개별 품목 환불)';
      const cancelAuthor = currentUser?.name || '관리자';

      const updatedOrder = await runPartialCancelOrderTransaction(
        orderId,
        refundTargets,
        cancelAuthor,
        trimmedReason
      );

      setOrders(prev => prev.map(o => (o.id === orderId ? updatedOrder : o)));
      setItems(prevItems =>
        prevItems.map(it => {
          const match = refundTargets.find(rt => rt.itemId === it.id);
          if (match && match.count > 0) {
            return {
              ...it,
              totalSold: Math.max(0, (it.totalSold || 0) - match.count),
            };
          }
          return it;
        })
      );

      if (updatedOrder.isCancelled) {
        showToast(`주문(${orderId.slice(-6)})의 모든 품목이 환불되어 전체 결제 취소 처리되었습니다.`, 'success');
      } else {
        showToast(`주문(${orderId.slice(-6)})의 선택 품목 개별 환불 및 판매 수량 복원이 완료되었습니다.`, 'success');
      }
    } catch (error: any) {
      console.error('Partial cancel order failed:', error);
      showToast(error.message || '개별 환불 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // [트랜잭션 결제 취소(환불) 철회] 환불된 주문을 다시 정상 결제로 복원하고 재고/판매수량 재반영
  const handleRestoreCancelledOrder = async (orderId: string, restoreStock = true) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    if (!target.isCancelled) {
      showToast('이미 정상 결제 상태인 주문입니다.', 'error');
      return;
    }

    try {
      const restoredBy = currentUser?.name || '관리자';
      const restoredOrder = await runRestoreCancelledOrderTransaction(orderId, restoredBy, restoreStock);

      setOrders(prev => prev.map(o => (o.id === orderId ? restoredOrder : o)));

      if (restoreStock && target.items && target.items.length > 0) {
        setItems(prevItems =>
          prevItems.map(it => {
            const match = target.items?.find(ti => ti.itemId === it.id);
            if (match) {
              return {
                ...it,
                stock: Math.max(0, (it.stock ?? 999) - match.count),
                totalSold: (it.totalSold || 0) + match.count,
              };
            }
            return it;
          })
        );
      }

      showToast(`주문(${orderId.slice(-6)})의 결제 취소(환불)가 철회되고 정상 결제로 복원되었습니다.`, 'success');
    } catch (error: any) {
      console.error('Restore cancelled order failed:', error);
      showToast(error.message || '환불 취소 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // [트랜잭션 개별/부분 환불 취소/철회] 환불되었던 특정 품목을 주문으로 복원하고 재고/판매수량 재반영
  const handleRestorePartialRefund = async (
    orderId: string,
    restoreTargets: Array<{ itemId: string; count: number; name?: string; price?: number }>,
    restoreStock = true
  ) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    try {
      const restoredBy = currentUser?.name || '관리자';
      const restoredOrder = await runRestorePartialRefundTransaction(
        orderId,
        restoreTargets,
        restoredBy,
        restoreStock
      );

      setOrders(prev => prev.map(o => (o.id === orderId ? restoredOrder : o)));

      if (restoreStock) {
        setItems(prevItems =>
          prevItems.map(it => {
            const match = restoreTargets.find(rt => rt.itemId === it.id);
            if (match && match.count > 0) {
              return {
                ...it,
                stock: Math.max(0, (it.stock ?? 999) - match.count),
                totalSold: (it.totalSold || 0) + match.count,
              };
            }
            return it;
          })
        );
      }

      showToast(`주문(${orderId.slice(-6)})의 부분 환불이 취소되고 품목이 복원되었습니다.`, 'success');
    } catch (error: any) {
      console.error('Restore partial refund failed:', error);
      showToast(error.message || '부분 환불 취소 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleSaveSettlement = (newSettlement: PosSettlement) => {
    setSettlement(newSettlement);
  };

  const handleDeleteSettlement = (deletedId: string) => {
    if (settlement?.id === deletedId || deletedId === todayDateStr) {
      setSettlement(null);
      try {
        localStorage.removeItem(SETTLEMENT_STORAGE_KEY);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // [관리자 전용] 매출 내역(주문) 직접 수정 (재고/판매량 동기화 지원)
  const handleUpdateOrder = async (updatedOrder: PosOrder, syncStock = true) => {
    const prevOrder = orders.find(o => o.id === updatedOrder.id);
    setOrders(prev => prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o)));

    try {
      await updatePosOrder(updatedOrder, currentUser?.name || '관리자');

      // If syncStock is true and prevOrder is present, synchronize inventory differences
      if (syncStock && prevOrder) {
        const itemDeltas = new Map<string, number>();

        // Previous sold quantities
        if (!prevOrder.isCancelled) {
          prevOrder.items?.forEach(i => {
            itemDeltas.set(i.itemId, (itemDeltas.get(i.itemId) || 0) - i.count);
          });
        }
        // Updated sold quantities
        if (!updatedOrder.isCancelled) {
          updatedOrder.items?.forEach(i => {
            itemDeltas.set(i.itemId, (itemDeltas.get(i.itemId) || 0) + i.count);
          });
        }

        const changedItemsToUpdate: PosItem[] = [];
        setItems(prevItems =>
          prevItems.map(it => {
            const delta = itemDeltas.get(it.id) || 0;
            if (delta !== 0) {
              const updated = {
                ...it,
                stock: Math.max(0, (it.stock ?? 999) - delta),
                totalSold: Math.max(0, (it.totalSold || 0) + delta),
              };
              changedItemsToUpdate.push(updated);
              return updated;
            }
            return it;
          })
        );

        if (changedItemsToUpdate.length > 0) {
          saveMultiplePosItems(
            changedItemsToUpdate,
            currentUser?.name || '관리자',
            currentUser?.id
          ).catch(e => console.warn('Failed to sync item changes from order update:', e));
        }
      }

      showToast('매출 내역이 성공적으로 수정되었습니다.', 'success');
    } catch (e: any) {
      console.error('Update order error:', e);
      showToast('매출 수정 중 오류가 발생했습니다: ' + e.message, 'error');
    }
  };

  // [관리자 전용] 매출 내역(주문) 완전 삭제 (미취소 주문일 시 판매 수량 자동 복원)
  const handleDeleteOrder = async (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (target && !target.isCancelled && target.items && target.items.length > 0) {
      setItems(prevItems =>
        prevItems.map(it => {
          const match = target.items?.find(ti => ti.itemId === it.id);
          if (match) {
            return {
              ...it,
              totalSold: Math.max(0, (it.totalSold || 0) - match.count),
            };
          }
          return it;
        })
      );
    }

    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      await deletePosOrder(orderId, currentUser?.name || '관리자');
      showToast('매출 내역이 삭제되고 판매 수량이 복구되었습니다.', 'success');
    } catch (e: any) {
      console.error('Delete order error:', e);
      showToast('매출 삭제 중 오류가 발생했습니다: ' + e.message, 'error');
    }
  };

  // [관리자 전용] 여러 매출 내역(주문) 일괄 삭제 (미취소 주문일 시 판매 수량 자동 복원)
  const handleDeleteMultipleOrders = async (orderIds: string[]) => {
    if (!orderIds || orderIds.length === 0) return;
    const count = orderIds.length;
    const activeTargets = orders.filter(o => orderIds.includes(o.id) && !o.isCancelled);
    if (activeTargets.length > 0) {
      const deductMap: Record<string, number> = {};
      activeTargets.forEach(o => {
        o.items?.forEach(i => {
          deductMap[i.itemId] = (deductMap[i.itemId] || 0) + i.count;
        });
      });
      setItems(prevItems =>
        prevItems.map(it => {
          const deduct = deductMap[it.id];
          if (deduct) {
            return {
              ...it,
              totalSold: Math.max(0, (it.totalSold || 0) - deduct),
            };
          }
          return it;
        })
      );
    }

    setOrders(prev => prev.filter(o => !orderIds.includes(o.id)));
    try {
      await deleteMultiplePosOrders(orderIds, currentUser?.name || '관리자');
      showToast(`선택한 ${count}건의 매출 내역이 삭제되고 판매 수량이 복원되었습니다.`, 'success');
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
    setDiscountAmount(0);
    setPosScreenMode('hub');
    showToast('매점 영업이 종료되었습니다. 메인 화면으로 복귀했습니다.');
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + item.item.price * item.count, 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.count, 0);
  const effectiveDiscountAmount = Math.min(totalCartAmount, Math.max(0, discountAmount));
  const payableCartAmount = Math.max(0, totalCartAmount - effectiveDiscountAmount);

  // Automatically reset discountAmount if cart becomes empty
  useEffect(() => {
    if (cart.length === 0 && discountAmount !== 0) {
      setDiscountAmount(0);
    }
  }, [cart.length, discountAmount]);

  return (
    <div className="fixed inset-0 w-full h-full bg-primary text-white flex flex-col overflow-hidden z-50 select-none">
      <AnimatePresence mode="wait" initial={false}>
        {/* 1. If not logged in at all, show dedicated POS initial login modal */}
        {!currentUser ? (
          <PosLoginModal
            key="pos-screen-login"
            onLoginSuccess={user => {
              setCurrentUser(user);
              setPosScreenMode('hub');
            }}
            onExitToPortal={handleExitToPortal}
          />
        ) : posScreenMode === 'hub' ? (
          /* 2. When logged in: If in 'hub' mode -> Show POS Main Screen (Landing Hub) */
          <motion.div
            key="pos-screen-hub"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={POS_SCREEN_TRANSITION}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <PosHubHome
              user={currentUser}
              items={items}
              categories={categories}
              totalSalesToday={totalSalesToday}
              cashSalesToday={cashSalesToday}
              transferSalesToday={transferSalesToday}
              todayDiscountTotal={todayDiscountTotal}
              todayOrdersCount={activeTodayOrders.length}
              todayTotalSoldCount={todayTotalSoldCount}
              hasActiveCart={cart.length > 0}
              onStartSales={() => setPosScreenMode('register')}
              onOpenProductManager={() => setShowProductManager(true)}
              onOpenSalesHistory={() => setShowSalesHistoryModal(true)}
              onOpenSettlement={() => setShowSettlementModal(true)}
              onOpenAuditLog={IS_POS_AUDIT_LOG_ENABLED ? () => setShowAuditLogModal(true) : undefined}
              onLogout={handleLogout}
              onExitToPortal={handleExitToPortal}
            />
          </motion.div>
        ) : (
          /* 3. When logged in: If in 'register' mode -> Active Sales Register Screen */
          <motion.div
            key="pos-screen-register"
            initial={{ opacity: 0, scale: 0.992 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.992 }}
            transition={POS_SCREEN_TRANSITION}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {/* POS Active Sales Header with End Shift */}
            <PosHeader
              user={currentUser}
              isCloudConnected={isFirestoreConnected}
              isOnline={isOnline}
              isSoundMuted={isSoundMuted}
              onToggleSound={toggleSound}
              onExitToPortal={handleExitToPortal}
              onOpenProductManager={() => setShowProductManager(true)}
              onOpenSalesHistory={() => setShowSalesHistoryModal(true)}
              onOpenAuditLog={IS_POS_AUDIT_LOG_ENABLED ? () => setShowAuditLogModal(true) : undefined}
              onOpenSettlement={() => setShowSettlementModal(true)}
              onEndShift={() => setShowEndShiftConfirm(true)}
              totalSalesToday={totalSalesToday}
              cashSalesToday={cashSalesToday}
              transferSalesToday={transferSalesToday}
            />

          {/* Main Layout: Split Layout (Desktop & Tablet Landscape) vs Bottom Cart Mode (Mobile & Tablet Portrait) */}
          <div
            ref={splitContainerRef}
            className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative select-none z-0"
          >
            {/* Menu Selection Panel: Fullscreen on mobile & tablet portrait, split on landscape */}
            <div
              style={isSplitLayout ? { width: `${splitRatio}%` } : undefined}
              className={`w-full h-full flex flex-col overflow-hidden min-w-0 ${
                isSplitLayout ? 'md:w-auto md:min-w-[280px]' : ''
              }`}
            >
              <PosMenuGrid
                categories={categories}
                items={items}
                cart={cart}
                todaySoldMap={todaySoldByItemMap}
                onAddToCart={handleAddToCart}
                onToggleSoldOut={handleQuickToggleSoldOut}
                onOpenProductManager={() => setShowProductManager(true)}
              />
            </div>

            {/* Split Layout Only: Samsung Galaxy Split-Screen Draggable Divider */}
            {isSplitLayout && (
              <div className="flex h-full shrink-0">
                <PosSplitDivider
                  splitRatio={splitRatio}
                  onRatioChange={setSplitRatio}
                  containerRef={splitContainerRef}
                  minRatio={30}
                  maxRatio={78}
                  defaultRatio={62}
                />
              </div>
            )}

            {/* Split Layout Only: Right Panel Cart & Payment Panel */}
            {isSplitLayout && (
              <div
                style={{ width: `${100 - splitRatio}%` }}
                className="h-full flex flex-col overflow-hidden min-w-0 md:min-w-[260px]"
              >
                <PosCart
                  cart={cart}
                  discountAmount={effectiveDiscountAmount}
                  onOpenDiscountModal={() => setShowGifticonModal(true)}
                  onClearDiscount={() => setDiscountAmount(0)}
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
            )}
          </div>

          {/* Bottom Cart Mode (스마트폰 및 탭/태블릿 세로 모드): Floating Bottom Cart Bar */}
          {!isSplitLayout && (
            <div
              className={`fixed bottom-0 inset-x-0 z-40 bg-[#0a1120]/95 backdrop-blur-xl border-t border-white/10 px-4 sm:px-6 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 shadow-2xl transition-all select-none ${
                isMobileCartOpen ? 'pointer-events-none opacity-0 translate-y-full' : 'opacity-100 translate-y-0'
              }`}
            >
              <div className="max-w-3xl mx-auto">
                {/* Swipe handle bar */}
                <div
                  onTouchStart={handleBarTouchStart}
                  onTouchMove={handleBarTouchMove}
                  onTouchEnd={handleBarTouchEnd}
                  onClick={() => setIsMobileCartOpen(true)}
                  className="w-full flex justify-center py-1 cursor-grab active:cursor-grabbing"
                  aria-label="장바구니 열기 제스처 바"
                >
                  <div className="w-8 h-1 bg-white/15 rounded-sm" />
                </div>

                {/* Main Bar Content */}
                <div className="flex items-center justify-between gap-3 sm:gap-4 mt-0.5">
                  {/* Cart Summary & Price Info */}
                  <div
                    onClick={() => setIsMobileCartOpen(true)}
                    className="flex items-center space-x-3 cursor-pointer min-w-0 flex-1 py-1"
                  >
                    <motion.div
                      key={totalCartCount}
                      initial={totalCartCount > 0 ? { scale: 1.14 } : false}
                      animate={{ scale: 1 }}
                      transition={POS_BUMP_TRANSITION}
                      className="relative w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white shrink-0"
                    >
                      <ShoppingCart className="w-5 h-5 text-secondary-container" />
                    </motion.div>

                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs text-surface-dim font-medium truncate">
                        {totalCartCount > 0
                          ? effectiveDiscountAmount > 0
                            ? `선택 ${totalCartCount}개 (할인 -${effectiveDiscountAmount.toLocaleString()}원)`
                            : `선택 품목 ${totalCartCount}개`
                          : '장바구니가 비어 있습니다'}
                      </div>
                      <div className="text-base sm:text-lg font-black text-white font-mono tabular-nums tracking-tight">
                        <motion.span
                          key={payableCartAmount}
                          initial={totalCartCount > 0 ? { scale: 1.06 } : false}
                          animate={{ scale: 1 }}
                          transition={POS_BUMP_TRANSITION}
                          className="inline-block origin-left"
                        >
                          {payableCartAmount.toLocaleString()}
                        </motion.span>
                        <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Action Button */}
                  <button
                    type="button"
                    id="btn-open-mobile-cart"
                    onClick={() => setIsMobileCartOpen(true)}
                    className={`flex items-center justify-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                      totalCartCount > 0
                        ? 'bg-secondary hover:bg-secondary/90 active:scale-[0.98] text-white'
                        : 'bg-white/5 hover:bg-white/10 active:scale-[0.98] text-surface-dim border border-white/10'
                    }`}
                  >
                    <span>{totalCartCount > 0 ? `결제 (${totalCartCount})` : '장바구니 열기'}</span>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Cart Mode (스마트폰 및 탭/태블릿 세로 모드): Slide-up Cart Sheet */}
          {!isSplitLayout && (
            <AnimatePresence>
              {isMobileCartOpen && (
                <>
                  {/* Semi-transparent Dim Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMobileCartOpen(false)}
                    className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs"
                  />

                  {/* Bottom Sheet Modal */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                    className="fixed inset-x-0 bottom-0 z-[125] h-[88dvh] max-h-[92dvh] max-w-3xl mx-auto bg-primary border-t sm:border-x border-white/10 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
                  >
                    {/* Sheet Header with Gesture Drag Down Handle & Dedicated Close Button */}
                    <div
                      onTouchStart={handleSheetHeaderTouchStart}
                      onTouchMove={handleSheetHeaderTouchMove}
                      onTouchEnd={handleSheetHeaderTouchEnd}
                      className="pt-2 pb-3 px-4 sm:px-6 bg-[#0a1120] border-b border-white/10 flex flex-col select-none cursor-grab active:cursor-grabbing shrink-0"
                    >
                      {/* Pull Down Handle Bar */}
                      <div className="w-10 h-1 bg-white/20 rounded-sm mx-auto mb-2.5" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm sm:text-base font-bold text-white">주문 내역 및 결제</h3>
                          <span className="text-xs font-mono tabular-nums text-secondary-container font-bold">
                            {totalCartCount}개
                          </span>
                        </div>

                        {/* Dedicated Close Button */}
                        <button
                          type="button"
                          id="btn-close-mobile-cart-sheet"
                          onClick={() => setIsMobileCartOpen(false)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-surface-dim hover:text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
                        >
                          <ChevronDown className="w-4 h-4" />
                          <span>접기</span>
                        </button>
                      </div>
                    </div>

                    {/* Sheet Body: Full POS Cart */}
                    <div className="flex-1 overflow-hidden">
                      <PosCart
                        cart={cart}
                        discountAmount={effectiveDiscountAmount}
                        onOpenDiscountModal={() => setShowGifticonModal(true)}
                        onClearDiscount={() => setDiscountAmount(0)}
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
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: End Shift Confirmation */}
      <AnimatePresence>
        {showEndShiftConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={POS_MODAL_BACKDROP_TRANSITION}
            onClick={() => setShowEndShiftConfirm(false)}
            className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={POS_MODAL_PANEL_TRANSITION}
              onClick={e => e.stopPropagation()}
              className="bg-[#0a1120] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative"
            >
              <div className="pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white">
                  매점 영업을 종료하시겠습니까?
                </h3>
              </div>
              <p className="text-xs text-surface-dim mt-3 leading-relaxed">
                영업 종료 시 판매 화면이 정리되고 <strong className="text-white">POS 메인 화면</strong>으로 복귀합니다.
              </p>

              {cart.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-amber-400 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>현재 장바구니에 담긴 {cart.length}개 품목이 비워집니다.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEndShiftConfirm(false)}
                  className="py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEndShift}
                  className="py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-[0.98] cursor-pointer"
                >
                  영업 종료
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs sm:text-sm font-bold border backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-[#0a1120]/95 border-rose-500/40 text-rose-300'
                : 'bg-[#0a1120]/95 border-secondary/50 text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-secondary-container" />
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
            totalAmount={payableCartAmount}
            originalTotalAmount={totalCartAmount}
            discountAmount={effectiveDiscountAmount}
            onOpenDiscountModal={() => setShowGifticonModal(true)}
            onClearDiscount={() => setDiscountAmount(0)}
            onConfirmPayment={handleConfirmCashPayment}
            onClose={() => setShowCashModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal: Transfer Payment Confirmation (Simplified) */}
      <AnimatePresence>
        {showTransferModal && (
          <PosTransferModal
            totalAmount={payableCartAmount}
            originalTotalAmount={totalCartAmount}
            discountAmount={effectiveDiscountAmount}
            onOpenDiscountModal={() => setShowGifticonModal(true)}
            onClearDiscount={() => setDiscountAmount(0)}
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
            todaySoldMap={todaySoldByItemMap}
            isAdmin={currentUser?.role === 'admin'}
            currentUser={currentUser}
            onUpdateItems={handleUpdateItems}
            onUpdateSingleItem={handleUpdateSingleItem}
            onPatchItem={handlePatchSingleItem}
            onUpdateCategories={handleUpdateCategories}
            onDeleteItem={(id: string) => {
              deletePosItem(id, getActorId('근무자'), currentUser?.id);
            }}
            onDeleteCategory={(id: string) => {
              deletePosCategory(id, getActorId('근무자'), currentUser?.id);
            }}
            onResetToDefault={handleResetToDefault}
            onApplyPreset={handleApplyPreset}
            onClearAllFavorites={handleClearAllFavorites}
            onClose={() => setShowProductManager(false)}
            showToast={showToast}
            onGoogleAdminLogin={adminUser => {
              setCurrentUser(adminUser);
              showToast(`구글 관리자(${adminUser.name}) 계정으로 인증되었습니다.`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal: Sales History & Receipts (3단계) */}
      <PosSalesHistoryModal
        isOpen={showSalesHistoryModal}
        onClose={() => setShowSalesHistoryModal(false)}
        orders={orders}
        onCancelOrder={handleCancelOrder}
        onPartialCancelOrder={handlePartialCancelOrder}
        onRestoreCancelledOrder={handleRestoreCancelledOrder}
        onRestorePartialRefund={handleRestorePartialRefund}
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
        onDeleteSettlement={handleDeleteSettlement}
        isAdmin={currentUser?.role === 'admin'}
      />

      {/* Modal: Activity & Audit Logs (감사 로그 - 개편 전 전역 비활성화 상태) */}
      {IS_POS_AUDIT_LOG_ENABLED && (
        <PosAuditLogModal
          isOpen={showAuditLogModal}
          onClose={() => setShowAuditLogModal(false)}
          logs={logs}
          isAdmin={currentUser?.role === 'admin'}
          actorId={currentUser?.id || '관리자'}
          onGoogleAdminLogin={adminUser => {
            setCurrentUser(adminUser);
            showToast(`구글 관리자(${adminUser.name}) 계정으로 연결되었습니다.`);
          }}
          onGoogleAdminLogout={() => {
            handleLogout();
          }}
        />
      )}

      {/* Modal: Direct Discount Input Modal (할인 금액 입력) */}
      <AnimatePresence>
        {showGifticonModal && (
          <PosGifticonInputModal
            isOpen={showGifticonModal}
            onClose={() => setShowGifticonModal(false)}
            originalTotalAmount={totalCartAmount}
            discountAmount={effectiveDiscountAmount}
            onApplyDiscount={newDiscount => setDiscountAmount(newDiscount)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
