import { useState, useMemo, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  X, 
  RotateCcw, 
  Printer, 
  Copy, 
  Check, 
  Clock, 
  Ban, 
  Calendar, 
  Download, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  Plus, 
  AlertTriangle,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from '../../firebase';
import { PosOrder } from '../../types/pos';

interface PosSalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PosOrder[];
  onCancelOrder: (orderId: string, reason?: string) => void;
  onUpdateOrder?: (order: PosOrder) => Promise<void> | void;
  onDeleteOrder?: (orderId: string) => Promise<void> | void;
  onDeleteMultipleOrders?: (orderIds: string[]) => Promise<void> | void;
  currentUserName: string;
}

export function PosSalesHistoryModal({
  isOpen,
  onClose,
  orders,
  onCancelOrder,
  onUpdateOrder,
  onDeleteOrder,
  onDeleteMultipleOrders,
  currentUserName,
}: PosSalesHistoryModalProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<'ALL' | 'TRANSFER' | 'CASH' | 'CANCELLED'>('ALL');
  const [filterDate, setFilterDate] = useState<string>('ALL'); // 'ALL' or 'YYYY-MM-DD'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmCancelTarget, setConfirmCancelTarget] = useState<PosOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('고객 요청 (단순 변심/재결제)');
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  // Multi-selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState<boolean>(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);

  // Collapsed dates in grouped list
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Google Admin Auth State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Modals for Google Admin: Edit Order & Delete Order
  const [editingOrder, setEditingOrder] = useState<PosOrder | null>(null);
  const [deletingOrderTarget, setDeletingOrderTarget] = useState<PosOrder | null>(null);

  // Listen to Google Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await user.reload();
        } catch {
          // ignore offline reload
        }
      }
      setGoogleUser(auth.currentUser || user);
    });
    return () => unsub();
  }, []);

  const userEmail = googleUser?.email || googleUser?.providerData?.[0]?.email || '';
  const isGoogleAdmin = Boolean(
    googleUser &&
    (userEmail === 'jhs34.kr@gmail.com' ||
     userEmail === 'hoya100304@gmail.com' ||
     googleUser.emailVerified)
  );

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error('Google login error', e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Google logout error', e);
    }
  };

  // Sorted orders (newest first)
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders]);

  // Extract all distinct dates available in orders
  const availableDates = useMemo(() => {
    const dateMap = new Map<string, { dateStr: string; count: number; total: number }>();
    orders.forEach(order => {
      try {
        const d = new Date(order.timestamp);
        const key = format(d, 'yyyy-MM-dd');
        const prev = dateMap.get(key) || { dateStr: key, count: 0, total: 0 };
        prev.count += 1;
        if (!order.isCancelled) {
          prev.total += order.totalAmount;
        }
        dateMap.set(key, prev);
      } catch {
        // fallback
      }
    });
    return Array.from(dateMap.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [orders]);

  // Filtered orders based on payment method, date, and search
  const filteredOrders = useMemo(() => {
    return sortedOrders.filter(order => {
      // Payment method filter
      if (filterMethod === 'CANCELLED') {
        if (!order.isCancelled) return false;
      } else if (filterMethod === 'TRANSFER') {
        if (order.paymentMethod !== 'TRANSFER' || order.isCancelled) return false;
      } else if (filterMethod === 'CASH') {
        if (order.paymentMethod !== 'CASH' || order.isCancelled) return false;
      }

      // Date filter
      if (filterDate !== 'ALL') {
        try {
          const orderDateStr = format(new Date(order.timestamp), 'yyyy-MM-dd');
          if (orderDateStr !== filterDate) return false;
        } catch {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesHandler = order.handlerName.toLowerCase().includes(q);
        const matchesItem = order.items.some(i => i.name.toLowerCase().includes(q));
        const matchesAmount = order.totalAmount.toString().includes(q);
        return matchesId || matchesHandler || matchesItem || matchesAmount;
      }

      return true;
    });
  }, [sortedOrders, filterMethod, filterDate, searchQuery]);

  // Group filtered orders by date
  const groupedOrdersByDate = useMemo(() => {
    const groups: { [dateKey: string]: { dateStr: string; orders: PosOrder[]; totalAmount: number; cashTotal: number; transferTotal: number } } = {};

    filteredOrders.forEach(order => {
      let dateKey = '기타 일자';
      try {
        dateKey = format(new Date(order.timestamp), 'yyyy-MM-dd');
      } catch {
        // ignore
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateStr: dateKey,
          orders: [],
          totalAmount: 0,
          cashTotal: 0,
          transferTotal: 0,
        };
      }

      groups[dateKey].orders.push(order);
      if (!order.isCancelled) {
        groups[dateKey].totalAmount += order.totalAmount;
        if (order.paymentMethod === 'CASH') {
          groups[dateKey].cashTotal += order.totalAmount;
        } else {
          groups[dateKey].transferTotal += order.totalAmount;
        }
      }
    });

    return Object.values(groups).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [filteredOrders]);

  // Selected Order for Receipt view
  const activeOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = orders.find(o => o.id === selectedOrderId);
      if (found) return found;
    }
    return filteredOrders[0] || null;
  }, [selectedOrderId, orders, filteredOrders]);

  // Metric stats for currently displayed scope
  const activeOrders = filteredOrders.filter(o => !o.isCancelled);
  const totalSalesAmount = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const transferAmount = activeOrders
    .filter(o => o.paymentMethod === 'TRANSFER')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const cashAmount = activeOrders
    .filter(o => o.paymentMethod === 'CASH')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const cancelledCount = filteredOrders.filter(o => o.isCancelled).length;

  // Multi-selection calculations
  const isAllFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.has(o.id));
  const isSomeFilteredSelected = filteredOrders.some(o => selectedOrderIds.has(o.id));

  const handleToggleSelectOrder = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Unselect all in current filtered view
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        filteredOrders.forEach(o => next.delete(o.id));
        return next;
      });
    } else {
      // Select all in current filtered view
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        filteredOrders.forEach(o => next.add(o.id));
        return next;
      });
    }
  };

  const handleToggleSelectDateGroup = (dateOrders: PosOrder[], e: React.MouseEvent) => {
    e.stopPropagation();
    const allDateSelected = dateOrders.every(o => selectedOrderIds.has(o.id));
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (allDateSelected) {
        dateOrders.forEach(o => next.delete(o.id));
      } else {
        dateOrders.forEach(o => next.add(o.id));
      }
      return next;
    });
  };

  const handleToggleCollapseDate = (dateKey: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  // Selected orders summary for bulk deletion
  const selectedOrdersList = useMemo(() => {
    return orders.filter(o => selectedOrderIds.has(o.id));
  }, [orders, selectedOrderIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedOrdersList.reduce((sum, o) => sum + (o.isCancelled ? 0 : o.totalAmount), 0);
  }, [selectedOrdersList]);

  // Plain text receipt formatting
  const getReceiptText = (order: PosOrder) => {
    return [
      '================================',
      '      한국철도고등학교 매점      ',
      '          [ 영 수 증 ]          ',
      '================================',
      `주문번호: ${order.id}`,
      `판매일시: ${format(new Date(order.timestamp), 'yyyy-MM-dd HH:mm:ss')}`,
      `담 당 자: ${order.handlerName}`,
      '--------------------------------',
      '상품명               수량    금액',
      '--------------------------------',
      ...order.items.map(
        i => `${i.name.padEnd(12, ' ')} ${String(i.count).padStart(3, ' ')}  ${(i.price * i.count).toLocaleString().padStart(8, ' ')}원`
      ),
      '--------------------------------',
      `총 결제금액: ${order.totalAmount.toLocaleString()}원`,
      `결제수단: ${order.paymentMethod === 'CASH' ? '현금 결제' : '계좌이체 결제'}`,
      ...(order.cashReceived ? [`받은금액: ${order.cashReceived.toLocaleString()}원`, `거스름돈: ${(order.changeAmount || 0).toLocaleString()}원`] : []),
      order.isCancelled
        ? `[결제취소]: ${order.cancelledAt ? format(new Date(order.cancelledAt), 'yyyy-MM-dd HH:mm') : ''} (${order.cancelledBy || ''})\n취소사유: ${order.cancelReason || '고객 요청/변심'}`
        : '',
      '================================',
      '      이용해 주셔서 감사합니다.      ',
      '================================',
    ].filter(Boolean).join('\n');
  };

  const handleCopyReceipt = (order: PosOrder) => {
    const text = getReceiptText(order);
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const handleDownloadReceipt = (order: PosOrder) => {
    const text = getReceiptText(order);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_${order.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleConfirmCancel = () => {
    if (!confirmCancelTarget) return;
    onCancelOrder(confirmCancelTarget.id, cancelReason);
    setConfirmCancelTarget(null);
  };

  const handleOpenEditModal = (order: PosOrder) => {
    setEditingOrder(JSON.parse(JSON.stringify(order)));
  };

  const handleSaveEditOrder = async () => {
    if (!editingOrder) return;
    if (onUpdateOrder) {
      await onUpdateOrder(editingOrder);
    }
    setEditingOrder(null);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!deletingOrderTarget) return;
    if (onDeleteOrder) {
      await onDeleteOrder(deletingOrderTarget.id);
    }
    if (selectedOrderId === deletingOrderTarget.id) {
      setSelectedOrderId(null);
    }
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      next.delete(deletingOrderTarget.id);
      return next;
    });
    setDeletingOrderTarget(null);
  };

  const handleExecuteBatchDelete = async () => {
    if (selectedOrderIds.size === 0) return;
    setIsBatchDeleting(true);
    try {
      const idsToDelete = Array.from(selectedOrderIds);
      if (onDeleteMultipleOrders) {
        await onDeleteMultipleOrders(idsToDelete);
      } else if (onDeleteOrder) {
        for (const id of idsToDelete) {
          await onDeleteOrder(id);
        }
      }
      setSelectedOrderIds(new Set());
      setShowBatchDeleteModal(false);
    } catch (e) {
      console.error('Batch delete error:', e);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Helper date label
  const formatDateHeaderLabel = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      const dayOfWeek = format(d, 'EEEE', { locale: ko });
      let prefix = '';
      if (isToday(d)) {
        prefix = '오늘 · ';
      } else if (isYesterday(d)) {
        prefix = '어제 · ';
      }
      return `${prefix}${format(d, 'yyyy년 M월 d일')} (${dayOfWeek})`;
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e172e] border border-white/10 rounded-3xl w-full max-w-6xl h-[94vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#090e1c] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-white">매출 내역 및 일자별 영수증 관리</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-surface-dim">
                  총 {orders.length}건
                </span>
                {filterDate !== 'ALL' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                    {filterDate} 조회 중
                  </span>
                )}
              </div>
              <p className="text-xs text-surface-dim">
                일자별 매출 분류, 영수증 재발급, 다중 선택 일괄 삭제 및 수정 제어를 지원합니다.
              </p>
            </div>
          </div>

          {/* Google Admin Auth Status & Actions */}
          <div className="flex items-center space-x-2">
            {isGoogleAdmin ? (
              <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-xs leading-tight text-emerald-200">
                  <span className="font-bold block text-emerald-300">관리자 인증됨</span>
                  <span className="text-[11px] text-emerald-100 font-mono block truncate max-w-[190px]">{googleUser?.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  title="구글 로그아웃"
                  className="p-1 rounded-lg hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? '로그인 중...' : '구글 관리자 로그인'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 sm:p-4 bg-[#0c1428] border-b border-white/5 shrink-0 text-xs">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-surface-dim block mb-0.5">
              {filterDate === 'ALL' ? '전체 누적 실매출' : `${filterDate} 실매출`}
            </span>
            <span className="text-base font-black text-white font-mono">
              {totalSalesAmount.toLocaleString()}원
            </span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-indigo-300 block mb-0.5">계좌이체 매출</span>
            <span className="text-base font-black text-indigo-300 font-mono">
              {transferAmount.toLocaleString()}원
            </span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-emerald-400 block mb-0.5">현금 매출</span>
            <span className="text-base font-black text-emerald-400 font-mono">
              {cashAmount.toLocaleString()}원
            </span>
          </div>

          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-red-400 block mb-0.5">결제 취소/환불</span>
            <span className="text-base font-black text-red-400 font-mono">
              {cancelledCount}건
            </span>
          </div>
        </div>

        {/* Date Selector Navigation Bar */}
        <div className="px-4 py-2.5 bg-[#090f20] border-b border-white/10 flex items-center justify-between gap-3 shrink-0 overflow-x-auto scrollbar-hide">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-xs text-surface-dim font-bold shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>일자별 보기:</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setFilterDate('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterDate === 'ALL'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white/5 text-surface-dim hover:text-white'
                }`}
              >
                전체 일자 ({orders.length})
              </button>

              {availableDates.slice(0, 6).map(({ dateStr, count, total }) => {
                const isCurrent = filterDate === dateStr;
                let label = dateStr;
                try {
                  const d = parseISO(dateStr);
                  if (isToday(d)) label = `오늘 (${format(d, 'M.d')})`;
                  else if (isYesterday(d)) label = `어제 (${format(d, 'M.d')})`;
                  else label = format(d, 'M월 d일');
                } catch {
                  // ignore
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setFilterDate(dateStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                      isCurrent
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-white/5 text-surface-dim hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isCurrent ? 'bg-white/20 text-white' : 'bg-white/10 text-surface-dim'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Input for older dates */}
          <div className="flex items-center space-x-2 shrink-0">
            <input
              type="date"
              value={filterDate === 'ALL' ? '' : filterDate}
              onChange={e => {
                if (e.target.value) {
                  setFilterDate(e.target.value);
                } else {
                  setFilterDate('ALL');
                }
              }}
              className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white outline-none focus:border-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Content Body: Left Orders List with Grouping & Right Receipt Detail */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Orders List & Grouped Date View */}
          <div className="w-full md:w-7/12 border-r border-white/10 flex flex-col h-full overflow-hidden bg-[#0a1122]">
            {/* Filter Bar & Search */}
            <div className="p-3 border-b border-white/10 space-y-2.5 bg-[#0a1122] shrink-0">
              <div className="flex items-center justify-between gap-2">
                {/* Method Filter Buttons */}
                <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setFilterMethod('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      filterMethod === 'ALL'
                        ? 'bg-secondary text-white shadow-sm'
                        : 'bg-white/5 text-surface-dim hover:text-white'
                    }`}
                  >
                    전체 결제
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMethod('TRANSFER')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      filterMethod === 'TRANSFER'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white/5 text-indigo-300 hover:text-white'
                    }`}
                  >
                    계좌이체
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMethod('CASH')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      filterMethod === 'CASH'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white/5 text-emerald-300 hover:text-white'
                    }`}
                  >
                    현금
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMethod('CANCELLED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      filterMethod === 'CANCELLED'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-white/5 text-red-400 hover:text-white'
                    }`}
                  >
                    취소/환불
                  </button>
                </div>

                {/* Bulk Select All Button */}
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer shrink-0 border border-white/5"
                >
                  {isAllFilteredSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      <span>전체 해제</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>전체 선택</span>
                    </>
                  )}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-surface-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="주문번호, 품목명, 담당자, 금액 검색..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-surface-dim/60 focus:border-secondary outline-none"
                />
              </div>
            </div>

            {/* Floating Multi-selection Toolbar */}
            {selectedOrderIds.size > 0 && (
              <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border-b border-blue-500/30 p-3 flex items-center justify-between gap-2 shrink-0 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center space-x-2 text-xs text-blue-200">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span>
                    <strong className="text-white font-black">{selectedOrderIds.size}건</strong> 선택됨
                    (합계: <strong className="text-white font-mono">{selectedTotalAmount.toLocaleString()}원</strong>)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds(new Set())}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    선택 해제
                  </button>

                  {isGoogleAdmin ? (
                    <button
                      type="button"
                      onClick={() => setShowBatchDeleteModal(true)}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-md shadow-red-600/30 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>선택 항목 일괄 삭제</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                      <span>로그인 후 일괄삭제 가능</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Orders Grouped List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
              {groupedOrdersByDate.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-surface-dim py-16">
                  <Receipt className="w-12 h-12 mb-3 text-white/20" />
                  <p className="text-sm font-bold text-white/70">해당 조건의 매출 내역이 없습니다.</p>
                  <p className="text-xs text-surface-dim mt-1">상단의 일자 또는 결제 수단 필터를 변경해보세요.</p>
                </div>
              ) : (
                groupedOrdersByDate.map(group => {
                  const isCollapsed = collapsedDates.has(group.dateStr);
                  const allDateSelected = group.orders.length > 0 && group.orders.every(o => selectedOrderIds.has(o.id));

                  return (
                    <div key={group.dateStr} className="space-y-2">
                      {/* Date Group Header */}
                      <div 
                        onClick={() => handleToggleCollapseDate(group.dateStr)}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex items-center space-x-2.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelectDateGroup(group.orders, e)}
                            className="text-surface-dim hover:text-white p-0.5 cursor-pointer"
                            title="이 날짜 전체 선택/해제"
                          >
                            {allDateSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex items-center space-x-1.5 text-xs font-black text-white">
                            <span>{formatDateHeaderLabel(group.dateStr)}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-surface-dim">
                              {group.orders.length}건
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-xs">
                          <div className="text-right">
                            <span className="text-[10px] text-surface-dim block">당일 실매출 합계</span>
                            <span className="font-mono font-black text-white text-xs sm:text-sm">
                              {group.totalAmount.toLocaleString()}원
                            </span>
                          </div>

                          <div className="text-surface-dim p-1">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Date Orders */}
                      {!isCollapsed && (
                        <div className="space-y-2 pl-1 sm:pl-2">
                          {group.orders.map(order => {
                            const isSelected = activeOrder?.id === order.id;
                            const isChecked = selectedOrderIds.has(order.id);
                            const firstItemName = order.items[0]?.name || '품목';
                            const otherCount = order.items.length - 1;
                            const itemTitle = otherCount > 0 ? `${firstItemName} 외 ${otherCount}건` : firstItemName;

                            return (
                              <div
                                key={order.id}
                                onClick={() => setSelectedOrderId(order.id)}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                  isChecked
                                    ? 'bg-blue-950/40 border-blue-500/50 shadow-md shadow-blue-500/10'
                                    : isSelected
                                    ? 'bg-secondary/20 border-secondary shadow-md shadow-secondary/10'
                                    : order.isCancelled
                                    ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                              >
                                {/* Checkbox & Main Info */}
                                <div className="flex items-center space-x-3 flex-1 min-w-0 pr-3">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleSelectOrder(order.id, e)}
                                    className="text-surface-dim hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-primary" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                                      <span className="font-mono text-xs font-bold text-white/90">
                                        {order.id}
                                      </span>

                                      {order.isCancelled ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                                          결제 취소
                                        </span>
                                      ) : (
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            order.paymentMethod === 'TRANSFER'
                                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          }`}
                                        >
                                          {order.paymentMethod === 'TRANSFER' ? '계좌이체' : '현금'}
                                        </span>
                                      )}

                                      <span className="text-[11px] text-surface-dim flex items-center space-x-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{format(new Date(order.timestamp), 'HH:mm:ss')}</span>
                                      </span>
                                    </div>

                                    <div className="text-xs font-semibold text-white/90 truncate">
                                      {itemTitle}
                                    </div>

                                    <div className="text-[11px] text-surface-dim mt-0.5 flex items-center space-x-2">
                                      <span>담당: {order.handlerName}</span>
                                      <span>·</span>
                                      <span>{order.items.reduce((s, i) => s + i.count, 0)}개 상품</span>
                                    </div>

                                    {order.isCancelled && (
                                      <div className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md mt-1.5 inline-block">
                                        취소 사유: {order.cancelReason || '고객 요청/변심'}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Total Amount */}
                                <div className="text-right shrink-0">
                                  <div
                                    className={`text-sm md:text-base font-black font-mono ${
                                      order.isCancelled ? 'line-through text-surface-dim' : 'text-white'
                                    }`}
                                  >
                                    {order.totalAmount.toLocaleString()}원
                                  </div>
                                  {order.isCancelled && (
                                    <div className="text-[10px] text-red-400 font-bold mt-0.5">
                                      환불 완료
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Receipt Detail View */}
          <div className="w-full md:w-5/12 bg-[#090e1c] flex flex-col h-full overflow-hidden">
            {activeOrder ? (
              <div className="flex-1 flex flex-col h-full p-4 overflow-y-auto custom-scrollbar">
                {/* Receipt Paper Card */}
                <div className="bg-white text-black p-5 rounded-2xl shadow-xl font-mono text-xs max-w-sm mx-auto w-full border border-gray-200">
                  {/* Store Header */}
                  <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                    <h3 className="text-sm font-black tracking-tight text-gray-900">
                      한국철도고등학교 매점
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">KRHS POS TERMINAL</p>
                    <div className="text-[11px] font-bold mt-1 text-gray-700">
                      [ {activeOrder.isCancelled ? '결제 취소 영수증' : '전자 영수증'} ]
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="space-y-1 text-[11px] text-gray-600 border-b border-dashed border-gray-300 pb-3 mb-3">
                    <div className="flex justify-between">
                      <span>주문번호:</span>
                      <span className="font-bold text-gray-900">{activeOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>판매일시:</span>
                      <span>{format(new Date(activeOrder.timestamp), 'yyyy-MM-dd HH:mm:ss')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>담당근무자:</span>
                      <span>{activeOrder.handlerName}</span>
                    </div>
                  </div>

                  {/* Item Rows */}
                  <div className="space-y-2 border-b border-dashed border-gray-300 pb-3 mb-3">
                    <div className="flex justify-between font-bold text-gray-700 text-[11px]">
                      <span>품목명</span>
                      <div className="flex space-x-3">
                        <span className="w-8 text-right">수량</span>
                        <span className="w-16 text-right">금액</span>
                      </div>
                    </div>
                    {activeOrder.items.map(item => (
                      <div key={item.itemId} className="flex justify-between text-gray-900 text-[11px]">
                        <span className="truncate pr-2">{item.name}</span>
                        <div className="flex space-x-3 shrink-0 font-medium">
                          <span className="w-8 text-right">{item.count}</span>
                          <span className="w-16 text-right">{(item.price * item.count).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total & Payment Summary */}
                  <div className="space-y-1.5 text-xs text-gray-800 border-b border-dashed border-gray-300 pb-3 mb-3">
                    <div className="flex justify-between text-sm font-black text-gray-900 pt-1">
                      <span>합계 금액:</span>
                      <span>{activeOrder.totalAmount.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>결제 수단:</span>
                      <span className="font-bold text-indigo-700">
                        {activeOrder.paymentMethod === 'TRANSFER' ? '계좌이체' : '현금'}
                      </span>
                    </div>

                    {activeOrder.cashReceived !== undefined && (
                      <>
                        <div className="flex justify-between text-[11px] text-gray-600">
                          <span>받은 금액:</span>
                          <span>{activeOrder.cashReceived.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                          <span>거스름돈:</span>
                          <span>{(activeOrder.changeAmount || 0).toLocaleString()}원</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cancellation Alert if Cancelled */}
                  {activeOrder.isCancelled && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3 text-[11px] text-red-700 space-y-1">
                      <div className="font-bold text-red-800 flex items-center justify-between">
                        <span>결제 취소 (환불 완료)</span>
                        <span className="text-[10px] text-red-500 font-normal">
                          {activeOrder.cancelledAt ? format(new Date(activeOrder.cancelledAt), 'yyyy-MM-dd HH:mm') : ''}
                        </span>
                      </div>
                      <div className="text-red-900 bg-red-100/70 px-2 py-1 rounded text-[11px] font-semibold">
                        취소사유: {activeOrder.cancelReason || '고객 요청/변심'}
                      </div>
                      <div className="text-[10px] text-red-600">
                        취소 처리자: {activeOrder.cancelledBy || '관리자'}
                      </div>
                    </div>
                  )}

                  {/* Footer message */}
                  <div className="text-center text-[10px] text-gray-400">
                    <div>이용해 주셔서 감사합니다.</div>
                  </div>
                </div>

                {/* Receipt Actions Bottom */}
                <div className="mt-4 max-w-sm mx-auto w-full space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyReceipt(activeOrder)}
                      className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {copiedReceipt ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-surface-dim" />
                          <span>복사</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(activeOrder)}
                      className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                      title="영수증 텍스트 파일(.txt) 다운로드"
                    >
                      <Download className="w-3.5 h-3.5 text-surface-dim" />
                      <span>저장</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-surface-dim" />
                      <span>출력</span>
                    </button>
                  </div>

                  {/* Regular cancel order button */}
                  {!activeOrder.isCancelled && (
                    <button
                      type="button"
                      onClick={() => setConfirmCancelTarget(activeOrder)}
                      className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Ban className="w-4 h-4 text-amber-400" />
                      <span>결제 취소 및 환불 (재고 자동 복원)</span>
                    </button>
                  )}

                  {/* Google Admin Special Actions Bar: Edit & Permanent Delete */}
                  {isGoogleAdmin ? (
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>관리자 전용 개별 제어</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(activeOrder)}
                          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-300" />
                          <span>내역 직접 수정</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingOrderTarget(activeOrder)}
                          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>영구 삭제</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-[11px] font-medium flex items-center justify-center space-x-1.5 border border-white/5 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>구글 관리자 로그인 시 수정/삭제 가능</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-surface-dim p-8">
                <Receipt className="w-12 h-12 mb-3 text-white/10" />
                <p className="text-xs text-white/60">좌측 목록에서 영수증을 확인할 주문을 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#141b33] border-2 border-red-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">선택한 매출 내역 일괄 삭제</h3>
                <span className="text-xs text-red-300 font-bold">
                  총 {selectedOrderIds.size}건의 주문이 완전히 삭제됩니다.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-200 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              <p className="font-bold">
                선택한 주문 내역(총 합계: {selectedTotalAmount.toLocaleString()}원)이 데이터베이스에서 영구적으로 삭제되며, 복구할 수 없습니다.
              </p>
              <div className="space-y-1 text-[11px] text-red-300/80 pt-1 border-t border-red-500/20">
                {selectedOrdersList.slice(0, 5).map(o => (
                  <div key={o.id} className="flex justify-between">
                    <span>{o.id} ({o.items[0]?.name || '품목'} 등)</span>
                    <span className="font-mono">{o.totalAmount.toLocaleString()}원</span>
                  </div>
                ))}
                {selectedOrdersList.length > 5 && (
                  <div className="text-center text-red-400 font-bold pt-1">
                    ... 외 {selectedOrdersList.length - 5}건
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={isBatchDeleting}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDelete}
                disabled={isBatchDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isBatchDeleting ? '삭제 중...' : `선택한 ${selectedOrderIds.size}건 삭제 실행`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirm Modal */}
      {confirmCancelTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#121c38] border-2 border-red-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">결제 취소 및 환불 확인</h3>
                <span className="text-xs text-surface-dim">주문번호: {confirmCancelTarget.id}</span>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-200 leading-relaxed">
              <p className="font-bold mb-1">
                취소 시 총 {confirmCancelTarget.totalAmount.toLocaleString()}원이 당일 매출에서 차감되며, 판매되었던 상품 수량이 자동으로 재고에 복원(재입고)됩니다.
              </p>
              <p className="text-[11px] text-red-300/80">
                품목: {confirmCancelTarget.items.map(i => `${i.name}(${i.count}개)`).join(', ')}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-surface-dim">취소 사유 직접 입력</label>
                {cancelReason && (
                  <button
                    type="button"
                    onClick={() => setCancelReason('')}
                    className="text-[10px] text-surface-dim hover:text-white underline cursor-pointer"
                  >
                    내용 지우기
                  </button>
                )}
              </div>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="취소 사유를 입력하세요 (예: 품목 변경, 잘못된 수량 입력 등)"
                className="w-full bg-black/40 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/50 transition-all"
                autoFocus
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  '고객 변심 (구매 취소)',
                  '품목/수량 입력 오류',
                  '결제 수단 변경 재결제',
                  '상품 불량/교환 요청',
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelReason(preset)}
                    className={`text-[10px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                      cancelReason === preset
                        ? 'bg-red-500/20 border-red-500/50 text-red-200 font-bold'
                        : 'bg-white/5 border-white/10 text-surface-dim hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCancelTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                결제 취소 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0e172e] border border-blue-500/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center space-x-3 text-blue-400">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">매출 내역 관리자 수정</h3>
                  <span className="text-xs text-blue-300 font-mono">주문번호: {editingOrder.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {/* Order Time & Handler */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-surface-dim font-bold mb-1">판매 일시</label>
                  <input
                    type="text"
                    value={editingOrder.timestamp}
                    onChange={e => setEditingOrder({ ...editingOrder, timestamp: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-surface-dim font-bold mb-1">담당 근무자</label>
                  <input
                    type="text"
                    value={editingOrder.handlerName}
                    onChange={e => setEditingOrder({ ...editingOrder, handlerName: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="text-xs">
                <label className="block text-surface-dim font-bold mb-1">결제 수단</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingOrder({ ...editingOrder, paymentMethod: 'CASH' })}
                    className={`py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      editingOrder.paymentMethod === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-white/5 text-surface-dim border-white/10 hover:text-white'
                    }`}
                  >
                    현금 결제 (CASH)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingOrder({ ...editingOrder, paymentMethod: 'TRANSFER' })}
                    className={`py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      editingOrder.paymentMethod === 'TRANSFER'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-white/5 text-surface-dim border-white/10 hover:text-white'
                    }`}
                  >
                    계좌이체 (TRANSFER)
                  </button>
                </div>
              </div>

              {/* Items List Modification */}
              <div className="text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-surface-dim font-bold">주문 품목 목록</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [
                        ...editingOrder.items,
                        { itemId: `item_${Date.now()}`, name: '새 상품', price: 1000, count: 1 },
                      ];
                      const newTotal = newItems.reduce((s, i) => s + i.price * i.count, 0);
                      setEditingOrder({ ...editingOrder, items: newItems, totalAmount: newTotal });
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>품목 추가</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editingOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => {
                          const updated = [...editingOrder.items];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setEditingOrder({ ...editingOrder, items: updated });
                        }}
                        placeholder="상품명"
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                      <div className="flex items-center space-x-1 w-24">
                        <input
                          type="number"
                          value={item.price}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            const updated = [...editingOrder.items];
                            updated[idx] = { ...updated[idx], price: val };
                            const newTotal = updated.reduce((s, i) => s + i.price * i.count, 0);
                            setEditingOrder({ ...editingOrder, items: updated, totalAmount: newTotal });
                          }}
                          placeholder="단가"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs text-right"
                        />
                        <span className="text-[10px] text-surface-dim">원</span>
                      </div>
                      <div className="flex items-center space-x-1 w-16">
                        <input
                          type="number"
                          value={item.count}
                          onChange={e => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            const updated = [...editingOrder.items];
                            updated[idx] = { ...updated[idx], count: val };
                            const newTotal = updated.reduce((s, i) => s + i.price * i.count, 0);
                            setEditingOrder({ ...editingOrder, items: updated, totalAmount: newTotal });
                          }}
                          placeholder="수량"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs text-center"
                        />
                        <span className="text-[10px] text-surface-dim">개</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingOrder.items.filter((_, i) => i !== idx);
                          const newTotal = updated.reduce((s, i) => s + i.price * i.count, 0);
                          setEditingOrder({ ...editingOrder, items: updated, totalAmount: newTotal });
                        }}
                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                        title="품목 제거"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Amount */}
              <div className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-surface-dim font-bold">총 결제 금액 (원)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const computed = editingOrder.items.reduce((s, i) => s + i.price * i.count, 0);
                      setEditingOrder({ ...editingOrder, totalAmount: computed });
                    }}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    품목 합계로 재계산
                  </button>
                </div>
                <input
                  type="number"
                  value={editingOrder.totalAmount}
                  onChange={e => setEditingOrder({ ...editingOrder, totalAmount: parseInt(e.target.value) || 0 })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm outline-none focus:border-blue-400"
                />
              </div>

              {/* Cash specific values */}
              {editingOrder.paymentMethod === 'CASH' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-surface-dim font-bold mb-1">받은 금액</label>
                    <input
                      type="number"
                      value={editingOrder.cashReceived ?? editingOrder.totalAmount}
                      onChange={e => {
                        const rec = parseInt(e.target.value) || 0;
                        setEditingOrder({
                          ...editingOrder,
                          cashReceived: rec,
                          changeAmount: Math.max(0, rec - editingOrder.totalAmount),
                        });
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-surface-dim font-bold mb-1">거스름돈</label>
                    <input
                      type="number"
                      value={editingOrder.changeAmount ?? 0}
                      onChange={e => setEditingOrder({ ...editingOrder, changeAmount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Cancel State Edit */}
              <div className="text-xs p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingOrder.isCancelled}
                    onChange={e => {
                      const isCanc = e.target.checked;
                      setEditingOrder({
                        ...editingOrder,
                        isCancelled: isCanc,
                        cancelledBy: isCanc ? editingOrder.cancelledBy || '관리자' : undefined,
                        cancelledAt: isCanc ? editingOrder.cancelledAt || new Date().toISOString() : undefined,
                        cancelReason: isCanc ? editingOrder.cancelReason || '관리자 직접 수정' : undefined,
                      });
                    }}
                    className="w-4 h-4 rounded text-red-500 focus:ring-0"
                  />
                  <span className="font-bold text-white">결제 취소 상태로 변경</span>
                </label>

                {editingOrder.isCancelled && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <div>
                      <label className="block text-surface-dim text-[11px] mb-1">취소 사유</label>
                      <input
                        type="text"
                        value={editingOrder.cancelReason || ''}
                        onChange={e => setEditingOrder({ ...editingOrder, cancelReason: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex space-x-2 pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleSaveEditOrder}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                수정 내용 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Order Confirm Modal */}
      {deletingOrderTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#121c38] border-2 border-red-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">매출 내역 영구 삭제</h3>
                <span className="text-xs text-surface-dim">주문번호: {deletingOrderTarget.id}</span>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-200 leading-relaxed">
              <p className="font-bold mb-1">
                이 주문을 데이터베이스에서 완전히 삭제하시겠습니까?
              </p>
              <p className="text-[11px] text-red-300/80">
                삭제 시 매출 집계 및 통계에서 영구히 제외되며 되돌릴 수 없습니다.
              </p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingOrderTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                완전 삭제 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
