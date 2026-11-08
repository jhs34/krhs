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
  Minus,
  AlertTriangle,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  Ticket,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, loginWithGoogle, logout, getDisplayUserEmail } from '../../firebase';
import { PosOrder, PosRefundedItem } from '../../types/pos';

interface PosSalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PosOrder[];
  onCancelOrder: (orderId: string, reason?: string) => Promise<void> | void;
  onPartialCancelOrder?: (
    orderId: string,
    refundTargets: Array<{ itemId: string; count: number }>,
    reason?: string
  ) => Promise<void> | void;
  onRestoreCancelledOrder?: (orderId: string, restoreStock?: boolean) => Promise<void> | void;
  onRestorePartialRefund?: (
    orderId: string,
    restoreTargets: Array<{ itemId: string; count: number; name?: string; price?: number }>,
    restoreStock?: boolean
  ) => Promise<void> | void;
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
  onPartialCancelOrder,
  onRestoreCancelledOrder,
  onRestorePartialRefund,
  onUpdateOrder,
  onDeleteOrder,
  onDeleteMultipleOrders,
  currentUserName,
}: PosSalesHistoryModalProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<'ALL' | 'TRANSFER' | 'CASH' | 'CANCELLED'>('ALL');
  const [filterDate, setFilterDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd')); // 'ALL' or 'YYYY-MM-DD'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmCancelTarget, setConfirmCancelTarget] = useState<PosOrder | null>(null);
  const [refundSelection, setRefundSelection] = useState<Record<string, number>>({});
  const [isProcessingRefund, setIsProcessingRefund] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('고객 요청 (단순 변심/재결제)');
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'list' | 'receipt'>('list');

  // Reset date filter to today's date whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setFilterDate(format(new Date(), 'yyyy-MM-dd'));
      setSelectedOrderId(null);
    }
  }, [isOpen]);

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
  const [editSyncStockOption, setEditSyncStockOption] = useState<boolean>(true);
  const [deletingOrderTarget, setDeletingOrderTarget] = useState<PosOrder | null>(null);

  // Restore/Revert Refund States
  const [confirmRestoreCancelTarget, setConfirmRestoreCancelTarget] = useState<PosOrder | null>(null);
  const [confirmRestorePartialTarget, setConfirmRestorePartialTarget] = useState<PosOrder | null>(null);
  const [restorePartialSelection, setRestorePartialSelection] = useState<Record<string, number>>({});
  const [restoreStockOption, setRestoreStockOption] = useState<boolean>(true);
  const [isProcessingRestore, setIsProcessingRestore] = useState<boolean>(false);

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

  const userEmail = (googleUser?.email || googleUser?.providerData?.[0]?.email || '').toLowerCase().trim();
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

  // Extract all distinct dates available in orders (always including today)
  const availableDates = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const dateMap = new Map<string, { dateStr: string; count: number; total: number }>();
    dateMap.set(todayKey, { dateStr: todayKey, count: 0, total: 0 });

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
        const matchesBuyer = order.buyerName ? order.buyerName.toLowerCase().includes(q) : false;
        const matchesMemo = order.memo ? order.memo.toLowerCase().includes(q) : false;
        const matchesItem = order.items.some(i => i.name.toLowerCase().includes(q));
        const matchesAmount = order.totalAmount.toString().includes(q);
        return matchesId || matchesHandler || matchesBuyer || matchesMemo || matchesItem || matchesAmount;
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
        const netOrderAmount =
          order.actualPaidAmount ?? Math.max(0, order.totalAmount - (order.gifticonDiscountAmount || 0));
        groups[dateKey].totalAmount += netOrderAmount;
        if (order.paymentMethod === 'CASH') {
          groups[dateKey].cashTotal += netOrderAmount;
        } else {
          groups[dateKey].transferTotal += netOrderAmount;
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
  // Gross sales (정가 기준 총 매출)
  const grossSalesAmount = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  // Total gifticon discount deducted
  const totalGifticonDiscountAmount = activeOrders.reduce((sum, o) => sum + (o.gifticonDiscountAmount || 0), 0);
  // Net cash/transfer sales received (실제 수납된 매출)
  const netPaidSalesAmount = activeOrders.reduce((sum, o) => sum + (o.actualPaidAmount ?? (o.totalAmount - (o.gifticonDiscountAmount || 0))), 0);
  const transferAmount = activeOrders
    .filter(o => o.paymentMethod === 'TRANSFER')
    .reduce((sum, o) => sum + (o.actualPaidAmount ?? (o.totalAmount - (o.gifticonDiscountAmount || 0))), 0);
  const cashAmount = activeOrders
    .filter(o => o.paymentMethod === 'CASH')
    .reduce((sum, o) => sum + (o.actualPaidAmount ?? (o.totalAmount - (o.gifticonDiscountAmount || 0))), 0);
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
    return selectedOrdersList.reduce(
      (sum, o) =>
        sum +
        (o.isCancelled
          ? 0
          : (o.actualPaidAmount ?? Math.max(0, o.totalAmount - (o.gifticonDiscountAmount || 0)))),
      0
    );
  }, [selectedOrdersList]);

  // Plain text receipt formatting
  const getReceiptText = (order: PosOrder) => {
    const discountAmt = order.gifticonDiscountAmount || 0;
    const netPaidAmt = order.actualPaidAmount ?? Math.max(0, order.totalAmount - discountAmt);
    return [
      '================================',
      '      한국철도고등학교 매점      ',
      '          [ 영 수 증 ]          ',
      '================================',
      `주문번호: ${order.id}`,
      `판매일시: ${format(new Date(order.timestamp), 'yyyy-MM-dd HH:mm:ss')}`,
      `담 당 자: ${order.handlerName}`,
      ...(order.buyerName ? [`결 제 자: ${order.buyerName}`] : []),
      ...(order.memo ? [`메    모: ${order.memo}`] : []),
      '--------------------------------',
      '상품명               수량    금액',
      '--------------------------------',
      ...order.items.map(
        i => `${i.name.padEnd(12, ' ')} ${String(i.count).padStart(3, ' ')}  ${(i.price * i.count).toLocaleString().padStart(8, ' ')}원`
      ),
      ...(order.refundedItems && order.refundedItems.length > 0
        ? [
            '--- [개별/부분 환불 내역] ---',
            ...order.refundedItems.map(
              ri => `(환불)${ri.name.padEnd(9, ' ')} -${String(ri.count).padStart(2, ' ')} -${(ri.price * ri.count).toLocaleString().padStart(7, ' ')}원`
            ),
          ]
        : []),
      '--------------------------------',
      ...(order.refundedAmount && order.refundedAmount > 0
        ? [`부분환불누계: -${order.refundedAmount.toLocaleString()}원`]
        : []),
      ...(discountAmt > 0
        ? [
            `적용전금액: ${order.totalAmount.toLocaleString()}원`,
            `할 인 금 액: -${discountAmt.toLocaleString()}원`,
            `실결제금액: ${netPaidAmt.toLocaleString()}원`,
          ]
        : [`총 결제금액: ${order.totalAmount.toLocaleString()}원`]),
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

  const openRefundModal = (order: PosOrder, preselectedItemId?: string) => {
    setConfirmCancelTarget(order);
    if (preselectedItemId === '__PARTIAL__') {
      // Partial mode init: select 1 of the first item (or empty if user wants to pick)
      const first = order.items[0];
      if (first) {
        setRefundSelection({ [first.itemId]: 1 });
      } else {
        setRefundSelection({});
      }
      setCancelReason('고객 요청 (개별 품목 환불)');
    } else if (preselectedItemId) {
      // Specific item clicked on receipt
      setRefundSelection({ [preselectedItemId]: 1 });
      setCancelReason('고객 요청 (개별 품목 환불)');
    } else {
      // Full order cancel init: select all items & full quantities
      const allMap: Record<string, number> = {};
      order.items.forEach(i => {
        allMap[i.itemId] = (allMap[i.itemId] || 0) + i.count;
      });
      setRefundSelection(allMap);
      setCancelReason('고객 요청 (단순 변심/재결제)');
    }
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancelTarget || isProcessingRefund) return;

    const targets = confirmCancelTarget.items
      .map(item => ({
        itemId: item.itemId,
        count: Math.min(item.count, Math.max(0, refundSelection[item.itemId] || 0)),
      }))
      .filter(t => t.count > 0);

    if (targets.length === 0) return;

    const isFullRefund = confirmCancelTarget.items.every(
      item => (refundSelection[item.itemId] || 0) >= item.count
    );

    setIsProcessingRefund(true);
    try {
      if (isFullRefund || !onPartialCancelOrder) {
        await onCancelOrder(confirmCancelTarget.id, cancelReason);
      } else {
        await onPartialCancelOrder(confirmCancelTarget.id, targets, cancelReason);
      }
      setConfirmCancelTarget(null);
      setRefundSelection({});
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const openRestorePartialModal = (order: PosOrder, specificItem?: PosRefundedItem) => {
    setConfirmRestorePartialTarget(order);
    setRestoreStockOption(true);
    if (specificItem) {
      setRestorePartialSelection({ [specificItem.itemId]: specificItem.count });
    } else {
      const allRefunds: Record<string, number> = {};
      (order.refundedItems || []).forEach(r => {
        allRefunds[r.itemId] = (allRefunds[r.itemId] || 0) + r.count;
      });
      setRestorePartialSelection(allRefunds);
    }
  };

  const handleExecuteRestoreCancel = async () => {
    if (!confirmRestoreCancelTarget || !onRestoreCancelledOrder || isProcessingRestore) return;
    setIsProcessingRestore(true);
    try {
      await onRestoreCancelledOrder(confirmRestoreCancelTarget.id, restoreStockOption);
      setConfirmRestoreCancelTarget(null);
    } finally {
      setIsProcessingRestore(false);
    }
  };

  const handleExecuteRestorePartial = async () => {
    if (!confirmRestorePartialTarget || !onRestorePartialRefund || isProcessingRestore) return;
    const targets = (confirmRestorePartialTarget.refundedItems || [])
      .map(r => ({
        itemId: r.itemId,
        name: r.name,
        price: r.price,
        count: Math.min(r.count, Math.max(0, restorePartialSelection[r.itemId] || 0)),
      }))
      .filter(t => t.count > 0);

    if (targets.length === 0) return;

    setIsProcessingRestore(true);
    try {
      await onRestorePartialRefund(confirmRestorePartialTarget.id, targets, restoreStockOption);
      setConfirmRestorePartialTarget(null);
      setRestorePartialSelection({});
    } finally {
      setIsProcessingRestore(false);
    }
  };

  const handleOpenEditModal = (order: PosOrder) => {
    const copy: PosOrder = JSON.parse(JSON.stringify(order));
    if (!copy.refundedItems) copy.refundedItems = [];
    if (typeof copy.refundedAmount !== 'number') copy.refundedAmount = 0;
    const discount = typeof copy.gifticonDiscountAmount === 'number' ? Math.max(0, copy.gifticonDiscountAmount) : 0;
    copy.gifticonDiscountAmount = discount;
    copy.actualPaidAmount =
      typeof copy.actualPaidAmount === 'number'
        ? Math.max(0, copy.actualPaidAmount)
        : Math.max(0, copy.totalAmount - discount);
    setEditingOrder(copy);
    setEditSyncStockOption(true);
  };

  const handleSaveEditOrder = async () => {
    if (!editingOrder) return;
    const discount = Math.min(
      Math.max(0, editingOrder.totalAmount),
      Math.max(0, editingOrder.gifticonDiscountAmount || 0)
    );
    const actualPaid = Math.max(0, editingOrder.totalAmount - discount);
    const normalizedOrder: PosOrder = {
      ...editingOrder,
      gifticonDiscountAmount: discount,
      actualPaidAmount: actualPaid,
      usedGifticons: [],
    };
    if (onUpdateOrder) {
      await onUpdateOrder(normalizedOrder);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-primary border-0 sm:border sm:border-white/10 rounded-none sm:rounded-2xl w-full max-w-6xl h-full sm:h-[94vh] sm:max-h-[900px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#0a1120] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div>
              <div className="flex items-baseline space-x-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">매출 내역</h2>
                <span className="text-xs font-mono tabular-nums text-surface-dim font-medium">
                  총 {orders.length}건
                </span>
                {filterDate !== 'ALL' && (
                  <span className="hidden sm:inline text-xs font-mono tabular-nums text-secondary-container font-bold">
                    · {filterDate} 조회
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Google Admin Auth Status & Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            {isGoogleAdmin ? (
              <div className="flex items-center space-x-2 text-xs text-surface-dim pr-2 border-r border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-secondary-container shrink-0" />
                <span className="font-mono text-[11px] text-white truncate max-w-[120px] sm:max-w-[180px]">
                  {getDisplayUserEmail(googleUser?.email)}
                </span>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  title="구글 로그아웃"
                  className="p-1 rounded hover:bg-white/5 text-surface-dim hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-surface-dim hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-secondary-container" />
                <span>{isLoggingIn ? '...' : '관리자 인증'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-surface-dim hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unboxed KPI Strip (divide-x instead of 6 separate colored boxes) */}
        <div className="flex items-center divide-x divide-white/10 bg-[#0a1120] border-b border-white/10 shrink-0 overflow-x-auto scrollbar-hide">
          <div className="px-4 sm:px-5 py-2.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-surface-dim block whitespace-nowrap">
              실수납 매출
            </span>
            <span className="text-sm sm:text-base font-black text-secondary-container font-mono tabular-nums whitespace-nowrap">
              {netPaidSalesAmount.toLocaleString()}원
            </span>
          </div>

          <div className="px-4 sm:px-5 py-2.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-surface-dim block whitespace-nowrap">
              총 매출 (정가)
            </span>
            <span className="text-sm sm:text-base font-black text-white font-mono tabular-nums whitespace-nowrap">
              {grossSalesAmount.toLocaleString()}원
            </span>
          </div>

          <div className="px-4 sm:px-5 py-2.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-surface-dim block whitespace-nowrap">
              계좌이체
            </span>
            <span className="text-sm sm:text-base font-black text-white font-mono tabular-nums whitespace-nowrap">
              {transferAmount.toLocaleString()}원
            </span>
          </div>

          <div className="px-4 sm:px-5 py-2.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-surface-dim block whitespace-nowrap">
              현금
            </span>
            <span className="text-sm sm:text-base font-black text-white font-mono tabular-nums whitespace-nowrap">
              {cashAmount.toLocaleString()}원
            </span>
          </div>

          <div className="px-4 sm:px-5 py-2.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-surface-dim block whitespace-nowrap">
              할인 금액
            </span>
            <span className="text-sm sm:text-base font-black text-purple-300 font-mono tabular-nums whitespace-nowrap">
              {totalGifticonDiscountAmount > 0 ? `-${totalGifticonDiscountAmount.toLocaleString()}원` : '0원'}
            </span>
          </div>

          <div className="px-4 sm:px-5 py-2.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-surface-dim block whitespace-nowrap">
              취소/환불
            </span>
            <span className="text-sm sm:text-base font-black text-rose-400 font-mono tabular-nums whitespace-nowrap">
              {cancelledCount}건
            </span>
          </div>
        </div>

        {/* Date Selector Navigation Bar (Underline tabs instead of pills) */}
        <div className="px-4 sm:px-6 bg-primary border-b border-white/10 flex items-center justify-between gap-3 shrink-0 overflow-x-auto scrollbar-hide">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setFilterDate('ALL')}
              className={`py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                filterDate === 'ALL'
                  ? 'border-secondary-container text-white'
                  : 'border-transparent text-surface-dim hover:text-white'
              }`}
            >
              전체 일자 <span className="font-mono tabular-nums text-[11px] opacity-70 ml-0.5">{orders.length}</span>
            </button>

            {availableDates.slice(0, 6).map(({ dateStr, count }) => {
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
                  className={`py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    isCurrent
                      ? 'border-secondary-container text-white'
                      : 'border-transparent text-surface-dim hover:text-white'
                  }`}
                >
                  <span>{label}</span>
                  <span className="font-mono tabular-nums text-[11px] opacity-70 ml-1">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Date Input for older dates */}
          <div className="flex items-center space-x-2 py-1.5 shrink-0">
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
              className="bg-[#0a1120] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-secondary-container cursor-pointer font-mono"
            />
          </div>
        </div>

        {/* Content Body: Left Orders List with Grouping & Right Receipt Detail */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left: Orders List & Grouped Date View */}
          <div className={`w-full md:w-7/12 border-r border-white/10 flex flex-col h-full overflow-hidden bg-primary ${mobileTab === 'list' ? 'flex' : 'hidden md:flex'}`}>
            {/* Filter Bar & Search */}
            <div className="px-4 py-3 border-b border-white/10 space-y-2.5 bg-[#0a1120]/60 shrink-0">
              <div className="flex items-center justify-between gap-2">
                {/* Method Filter Buttons */}
                <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
                  {([
                    { key: 'ALL', label: '전체 결제' },
                    { key: 'TRANSFER', label: '계좌이체' },
                    { key: 'CASH', label: '현금' },
                    { key: 'CANCELLED', label: '취소/환불' },
                  ] as const).map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilterMethod(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        filterMethod === tab.key
                          ? 'bg-secondary text-white'
                          : 'text-surface-dim hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Bulk Select All Button */}
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  {isAllFilteredSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-secondary-container" />
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
                  className="w-full bg-primary border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-surface-dim/50 focus:border-secondary-container outline-none transition-colors"
                />
              </div>
            </div>

            {/* Floating Multi-selection Toolbar */}
            {selectedOrderIds.size > 0 && (
              <div className="bg-[#0a1120] border-b border-secondary/40 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center space-x-2 text-xs text-surface-dim">
                  <CheckSquare className="w-4 h-4 text-secondary-container" />
                  <span>
                    <strong className="text-white font-bold font-mono tabular-nums">{selectedOrderIds.size}건</strong> 선택됨
                    (합계 <strong className="text-white font-mono tabular-nums">{selectedTotalAmount.toLocaleString()}원</strong>)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds(new Set())}
                    className="px-2.5 py-1 rounded text-xs font-bold text-surface-dim hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    해제
                  </button>

                  {isGoogleAdmin ? (
                    <button
                      type="button"
                      onClick={() => setShowBatchDeleteModal(true)}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>선택 일괄 삭제</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/5 text-surface-dim hover:text-white text-xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3 text-secondary-container" />
                      <span>관리자 인증 후 삭제</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Orders Grouped List */}
            <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 custom-scrollbar">
              {groupedOrdersByDate.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-surface-dim py-16">
                  <Receipt className="w-10 h-10 mb-3 text-white/15" />
                  <p className="text-sm font-bold text-white/70">해당 조건의 매출 내역이 없습니다.</p>
                  <p className="text-xs text-surface-dim mt-1">일자 또는 결제 수단 필터를 변경해보세요.</p>
                </div>
              ) : (
                groupedOrdersByDate.map(group => {
                  const isCollapsed = collapsedDates.has(group.dateStr);
                  const allDateSelected = group.orders.length > 0 && group.orders.every(o => selectedOrderIds.has(o.id));

                  return (
                    <div key={group.dateStr} className="bg-[#0a1120] border border-white/15 rounded-xl overflow-hidden">
                      {/* Distinct Date Group Header */}
                      <div 
                        onClick={() => handleToggleCollapseDate(group.dateStr)}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-[#101b33] border-b border-white/10 cursor-pointer select-none group"
                      >
                        <div className="flex items-center space-x-2.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelectDateGroup(group.orders, e)}
                            className="text-surface-dim hover:text-white p-0.5 cursor-pointer"
                            title="이 날짜 전체 선택/해제"
                          >
                            {allDateSelected ? (
                              <CheckSquare className="w-4 h-4 text-secondary-container" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex items-baseline space-x-2 text-xs">
                            <span className="font-bold text-white group-hover:text-secondary-container transition-colors">
                              {formatDateHeaderLabel(group.dateStr)}
                            </span>
                            <span className="font-mono tabular-nums text-[11px] text-surface-dim">
                              {group.orders.length}건
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-xs">
                          <div className="flex items-baseline space-x-1.5">
                            <span className="text-[11px] text-surface-dim">실매출</span>
                            <span className="font-mono tabular-nums font-bold text-secondary-container text-xs sm:text-sm">
                              {group.totalAmount.toLocaleString()}원
                            </span>
                          </div>

                          <div className="text-surface-dim">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Date Orders with crisp visible dividers */}
                      {!isCollapsed && (
                        <div className="divide-y divide-white/10">
                          {group.orders.map(order => {
                            const isSelected = activeOrder?.id === order.id;
                            const isChecked = selectedOrderIds.has(order.id);
                            const firstItemName = order.items[0]?.name || '품목';
                            const otherCount = order.items.length - 1;
                            const itemTitle = otherCount > 0 ? `${firstItemName} 외 ${otherCount}건` : firstItemName;

                            return (
                              <div
                                key={order.id}
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setMobileTab('receipt');
                                }}
                                className={`py-3 px-3.5 transition-colors cursor-pointer flex items-center justify-between ${
                                  isChecked
                                    ? 'bg-secondary/20'
                                    : isSelected
                                    ? 'bg-[#132242] border-l-2 border-secondary-container'
                                    : 'hover:bg-white/[0.04]'
                                }`}
                              >
                                {/* Checkbox & Main Info */}
                                <div className="flex items-center space-x-3 flex-1 min-w-0 pr-3">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleSelectOrder(order.id, e)}
                                    className="text-surface-dim hover:text-white p-0.5 cursor-pointer shrink-0"
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-secondary-container" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    {/* Inline metadata line */}
                                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap text-[11px]">
                                      <span className="font-mono font-bold text-white/85 truncate max-w-[130px] sm:max-w-none">
                                        {order.id}
                                      </span>
                                      <span className="text-white/25">·</span>

                                      {order.isCancelled ? (
                                        <span className="font-bold text-rose-400 shrink-0">
                                          결제 취소
                                        </span>
                                      ) : (
                                        <>
                                          <span
                                            className={`font-bold shrink-0 ${
                                              order.paymentMethod === 'TRANSFER'
                                                ? 'text-secondary-container'
                                                : 'text-emerald-400'
                                            }`}
                                          >
                                            {order.paymentMethod === 'TRANSFER' ? '계좌이체' : '현금'}
                                          </span>
                                          {order.refundedAmount && order.refundedAmount > 0 ? (
                                            <>
                                              <span className="text-white/25">·</span>
                                              <span className="font-bold font-mono tabular-nums text-amber-400 shrink-0">
                                                부분 환불 (-{order.refundedAmount.toLocaleString()}원)
                                              </span>
                                            </>
                                          ) : null}
                                        </>
                                      )}

                                      <span className="text-white/25">·</span>
                                      <span className="text-surface-dim font-mono tabular-nums shrink-0">
                                        {format(new Date(order.timestamp), 'HH:mm:ss')}
                                      </span>
                                    </div>

                                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                                      {itemTitle}
                                    </div>

                                    <div className="text-[11px] text-surface-dim mt-0.5 flex items-center space-x-1.5 flex-wrap">
                                      <span>담당 {order.handlerName}</span>
                                      {order.buyerName && (
                                        <>
                                          <span className="text-white/25">·</span>
                                          <span className="text-secondary-container font-medium">결제자 {order.buyerName}</span>
                                        </>
                                      )}
                                      {order.memo && (
                                        <>
                                          <span className="text-white/25">·</span>
                                          <span className="text-amber-400/90 font-medium truncate max-w-[150px]">메모: {order.memo}</span>
                                        </>
                                      )}
                                      <span className="text-white/25">·</span>
                                      <span className="font-mono tabular-nums">{order.items.reduce((s, i) => s + i.count, 0)}개</span>
                                    </div>

                                    {order.isCancelled && (
                                      <div className="text-[11px] text-rose-400/90 mt-1">
                                        취소 사유: {order.cancelReason || '고객 요청/변심'}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Total Amount */}
                                <div className="text-right shrink-0 pl-2">
                                  <div
                                    className={`text-sm sm:text-base font-black font-mono tabular-nums ${
                                      order.isCancelled ? 'line-through text-surface-dim' : 'text-white'
                                    }`}
                                  >
                                    {(order.actualPaidAmount ?? order.totalAmount).toLocaleString()}원
                                  </div>
                                  {order.gifticonDiscountAmount && order.gifticonDiscountAmount > 0 && !order.isCancelled && (
                                    <div className="text-[10px] text-purple-300 font-mono tabular-nums font-bold mt-0.5">
                                      할인 -{order.gifticonDiscountAmount.toLocaleString()}원
                                    </div>
                                  )}
                                  {order.isCancelled && (
                                    <div className="text-[10px] text-rose-400 font-bold mt-0.5">
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
          <div className={`w-full md:w-5/12 bg-[#0a1120] flex flex-col h-full overflow-hidden ${mobileTab === 'receipt' ? 'flex' : 'hidden md:flex'}`}>
            {/* Mobile Back Button */}
            <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-primary border-b border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setMobileTab('list')}
                className="flex items-center space-x-1.5 text-xs font-bold text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>목록으로</span>
              </button>
              {activeOrder && (
                <span className="text-xs font-bold text-surface-dim">
                  영수증 상세
                </span>
              )}
            </div>

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
                      <span className="font-bold text-gray-900 font-mono">
                        {activeOrder.id.replace(/^ptci_?/i, '')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>판매일시:</span>
                      <span>{format(new Date(activeOrder.timestamp), 'yyyy-MM-dd HH:mm:ss')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>담당근무자:</span>
                      <span>{activeOrder.handlerName}</span>
                    </div>
                    {activeOrder.buyerName ? (
                      <div className="flex justify-between">
                        <span>결제자:</span>
                        <span>{activeOrder.buyerName}</span>
                      </div>
                    ) : null}
                    {activeOrder.memo ? (
                      <div className="flex justify-between">
                        <span>메모:</span>
                        <span className="text-right max-w-[180px] break-words">{activeOrder.memo}</span>
                      </div>
                    ) : null}
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
                      <div key={item.itemId} className="flex items-center justify-between text-gray-900 text-[11px] gap-1">
                        <span className="truncate pr-1">{item.name}</span>
                        <div className="flex space-x-3 shrink-0 font-medium">
                          <span className="w-8 text-right">{item.count}</span>
                          <span className="w-16 text-right">{(item.price * item.count).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}

                    {/* Partially Refunded Items History on Receipt */}
                    {activeOrder.refundedItems && activeOrder.refundedItems.length > 0 && (
                      <div className="pt-2 mt-2 border-t border-dotted border-red-200 space-y-1">
                        <div className="text-[10px] font-bold text-red-600 flex items-center justify-between">
                          <span>[개별/부분 환불된 품목]</span>
                          {activeOrder.refundedAmount ? (
                            <span>총 -{activeOrder.refundedAmount.toLocaleString()}원</span>
                          ) : null}
                        </div>
                        {activeOrder.refundedItems.map((ri, idx) => (
                          <div
                            key={`${ri.itemId}_${idx}`}
                            className="flex items-center justify-between text-red-500/80 text-[10px] gap-1"
                          >
                            <span className="truncate pr-1 line-through">{ri.name} (환불)</span>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="w-8 text-right line-through">-{ri.count}</span>
                              <span className="w-16 text-right line-through">-{(ri.price * ri.count).toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => openRestorePartialModal(activeOrder, ri)}
                                title={`${ri.name} 환불 취소 (주문 품목으로 복원)`}
                                className="px-1 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-[9px] font-bold shrink-0 transition-colors cursor-pointer print:hidden"
                              >
                                환불취소
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Total & Payment Summary */}
                  <div className="space-y-1.5 text-xs text-gray-800 border-b border-dashed border-gray-300 pb-3 mb-3">
                    {activeOrder.gifticonDiscountAmount && activeOrder.gifticonDiscountAmount > 0 ? (
                      <>
                        <div className="flex justify-between text-xs text-gray-600 pt-1">
                          <span>적용 전 금액:</span>
                          <span className="font-mono">{activeOrder.totalAmount.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-purple-700">
                          <span>할인 적용 금액:</span>
                          <span className="font-mono">-{activeOrder.gifticonDiscountAmount.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
                          <span>적용 후 금액:</span>
                          <span className="font-mono text-emerald-700">
                            {(activeOrder.actualPaidAmount ?? Math.max(0, activeOrder.totalAmount - (activeOrder.gifticonDiscountAmount || 0))).toLocaleString()}원
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-200">
                        <span>결제 금액:</span>
                        <span className="font-mono">{activeOrder.totalAmount.toLocaleString()}원</span>
                      </div>
                    )}

                    <div className="flex justify-between text-[11px] pt-1">
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

                  {/* Cancel / Partial Refund OR Restore Order Buttons */}
                  {activeOrder.isCancelled ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmRestoreCancelTarget(activeOrder);
                          setRestoreStockOption(true);
                        }}
                        className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>결제 취소 철회 (환불 취소 / 정상 결제 복원)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(activeOrder.items.length > 1 || activeOrder.items.some(i => i.count > 1)) && (
                          <button
                            type="button"
                            onClick={() => openRefundModal(activeOrder, '__PARTIAL__')}
                            className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4 text-orange-400 shrink-0" />
                            <span>개별 품목 부분 환불</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openRefundModal(activeOrder)}
                          className={`w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors cursor-pointer ${
                            activeOrder.items.length > 1 || activeOrder.items.some(i => i.count > 1)
                              ? ''
                              : 'sm:col-span-2'
                          }`}
                        >
                          <Ban className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>전체 결제 취소 및 환불</span>
                        </button>
                      </div>

                      {activeOrder.refundedItems && activeOrder.refundedItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openRestorePartialModal(activeOrder)}
                          className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>부분 환불 취소 (환불된 품목 복원)</span>
                        </button>
                      )}
                    </div>
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
                        <span>관리자 로그인 시 수정/삭제 가능</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-surface-dim p-8 text-center">
                <Receipt className="w-12 h-12 mb-3 text-white/10" />
                <p className="text-xs text-white/60 mb-4">목록에서 영수증을 확인할 주문을 선택해주세요.</p>
                <button
                  type="button"
                  onClick={() => setMobileTab('list')}
                  className="md:hidden px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-lg cursor-pointer"
                >
                  주문 목록 보러 가기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a1120] border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">선택 매출 일괄 삭제</h3>
              <span className="text-xs font-mono text-rose-400 font-bold">
                총 {selectedOrderIds.size}건 · {selectedTotalAmount.toLocaleString()}원
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-surface-dim leading-relaxed">
                선택한 주문 내역을 영구 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
              </p>
              <div className="divide-y divide-white/5 border-t border-b border-white/10 py-1 max-h-36 overflow-y-auto custom-scrollbar text-[11px]">
                {selectedOrdersList.slice(0, 5).map(o => (
                  <div key={o.id} className="flex justify-between py-1.5 text-surface-dim">
                    <span className="truncate pr-2">{o.id} ({o.items[0]?.name || '품목'} 등)</span>
                    <span className="font-mono text-white shrink-0">{o.totalAmount.toLocaleString()}원</span>
                  </div>
                ))}
                {selectedOrdersList.length > 5 && (
                  <div className="text-center text-surface-dim py-1">
                    외 {selectedOrdersList.length - 5}건
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
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
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isBatchDeleting ? '삭제 중...' : `${selectedOrderIds.size}건 삭제`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel / Partial Refund Order Confirm Modal */}
      {confirmCancelTarget && (() => {
        const selectedRefundAmount = confirmCancelTarget.items.reduce((sum, item) => {
          const c = Math.min(item.count, Math.max(0, refundSelection[item.itemId] || 0));
          return sum + item.price * c;
        }, 0);
        const totalSelectedCount = confirmCancelTarget.items.reduce((sum, item) => {
          const c = Math.min(item.count, Math.max(0, refundSelection[item.itemId] || 0));
          return sum + c;
        }, 0);
        const isFullRefundSelected = confirmCancelTarget.items.every(
          item => (refundSelection[item.itemId] || 0) >= item.count
        );
        const remainingAmount = Math.max(0, confirmCancelTarget.totalAmount - selectedRefundAmount);

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0a1120] border border-white/10 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">결제 취소 / 개별 환불</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isFullRefundSelected
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {isFullRefundSelected ? '전체 취소' : '부분 환불'}
                  </span>
                  <span className="text-xs text-surface-dim font-mono hidden sm:inline">· {confirmCancelTarget.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmCancelTarget(null)}
                  className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {/* Item Selection List for Partial or Full Refund */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-surface-dim">환불 품목 및 수량</span>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const allMap: Record<string, number> = {};
                          confirmCancelTarget.items.forEach(i => {
                            allMap[i.itemId] = i.count;
                          });
                          setRefundSelection(allMap);
                        }}
                        className="text-surface-dim hover:text-white cursor-pointer"
                      >
                        전체 선택
                      </button>
                      <span className="text-white/20">·</span>
                      <button
                        type="button"
                        onClick={() => setRefundSelection({})}
                        className="text-surface-dim hover:text-white cursor-pointer"
                      >
                        선택 해제
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-white/5 border-t border-b border-white/10">
                    {confirmCancelTarget.items.map(item => {
                      const selectedCount = Math.min(
                        item.count,
                        Math.max(0, refundSelection[item.itemId] || 0)
                      );
                      const isChecked = selectedCount > 0;

                      return (
                        <div
                          key={item.itemId}
                          onClick={() => {
                            setRefundSelection(prev => ({
                              ...prev,
                              [item.itemId]: isChecked ? 0 : item.count,
                            }));
                          }}
                          className={`py-2.5 px-2 transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                            isChecked ? 'bg-rose-500/10 text-white' : 'text-surface-dim hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <div className="shrink-0">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-rose-400" />
                              ) : (
                                <Square className="w-4 h-4 text-surface-dim" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-white truncate">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-surface-dim font-mono">
                                {item.price.toLocaleString()}원 × {item.count}개
                              </div>
                            </div>
                          </div>

                          <div
                            className="flex items-center space-x-2 shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            {item.count > 1 && (
                              <div className="flex items-center space-x-1 bg-primary border border-white/10 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRefundSelection(prev => ({
                                      ...prev,
                                      [item.itemId]: Math.max(0, selectedCount - 1),
                                    }))
                                  }
                                  className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-mono font-bold px-1.5 text-white">
                                  {selectedCount}/{item.count}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRefundSelection(prev => ({
                                      ...prev,
                                      [item.itemId]: Math.min(item.count, selectedCount + 1),
                                    }))
                                  }
                                  className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <div className="text-right min-w-[64px]">
                              <span
                                className={`text-xs font-mono font-bold ${
                                  isChecked ? 'text-rose-400' : 'text-surface-dim'
                                }`}
                              >
                                {isChecked ? `-${(item.price * selectedCount).toLocaleString()}원` : '0원'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Readout */}
                <div className="py-2.5 px-3 rounded-xl bg-primary border border-white/10 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-surface-dim">선택 환불 금액 ({totalSelectedCount}개)</span>
                    <span className="text-sm font-black font-mono text-rose-400">
                      -{selectedRefundAmount.toLocaleString()}원
                    </span>
                  </div>
                  {!isFullRefundSelected && totalSelectedCount > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-surface-dim pt-1 border-t border-white/5">
                      <span>환불 후 유지 금액</span>
                      <span className="font-mono font-bold text-white">{remainingAmount.toLocaleString()}원</span>
                    </div>
                  )}
                </div>

                {/* Cancel Reason */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-surface-dim">환불/취소 사유</label>
                    {cancelReason && (
                      <button
                        type="button"
                        onClick={() => setCancelReason('')}
                        className="text-[11px] text-surface-dim hover:text-white cursor-pointer"
                      >
                        지우기
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="환불 사유 입력"
                    className="w-full bg-primary border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-secondary-container transition-colors"
                  />

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      '고객 요청 (개별 품목 환불)',
                      '고객 변심 (구매 취소)',
                      '품목/수량 입력 오류',
                      '결제 수단 변경 재결제',
                    ].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCancelReason(preset)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          cancelReason === preset
                            ? 'bg-secondary/20 border-secondary/50 text-white font-bold'
                            : 'bg-white/5 border-white/10 text-surface-dim hover:text-white'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-3 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmCancelTarget(null)}
                  disabled={isProcessingRefund}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={totalSelectedCount === 0 || isProcessingRefund}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isProcessingRefund
                    ? '처리 중...'
                    : isFullRefundSelected
                    ? `전체 결제 취소 (${selectedRefundAmount.toLocaleString()}원)`
                    : `부분 환불 (${selectedRefundAmount.toLocaleString()}원)`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Admin Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a1120] border border-white/10 rounded-2xl p-5 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-baseline space-x-2">
                <h3 className="text-sm sm:text-base font-bold text-white">매출 내역 수정</h3>
                <span className="text-xs text-surface-dim font-mono">· {editingOrder.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {/* Order Time & Handler & Buyer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-surface-dim font-medium mb-1">판매 일시</label>
                  <input
                    type="text"
                    value={editingOrder.timestamp}
                    onChange={e => setEditingOrder({ ...editingOrder, timestamp: e.target.value })}
                    className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-secondary-container"
                  />
                </div>
                <div>
                  <label className="block text-surface-dim font-medium mb-1">담당 근무자</label>
                  <input
                    type="text"
                    value={editingOrder.handlerName}
                    onChange={e => setEditingOrder({ ...editingOrder, handlerName: e.target.value })}
                    className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-secondary-container"
                  />
                </div>
                <div>
                  <label className="block text-surface-dim font-medium mb-1">결제자 이름 (선택)</label>
                  <input
                    type="text"
                    value={editingOrder.buyerName || ''}
                    placeholder="미입력"
                    onChange={e => setEditingOrder({ ...editingOrder, buyerName: e.target.value || undefined })}
                    className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-secondary-container"
                  />
                </div>
                <div>
                  <label className="block text-surface-dim font-medium mb-1">메모 (선택)</label>
                  <input
                    type="text"
                    value={editingOrder.memo || ''}
                    placeholder="메모 없음"
                    onChange={e => setEditingOrder({ ...editingOrder, memo: e.target.value || undefined })}
                    className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-secondary-container"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="text-xs">
                <label className="block text-surface-dim font-medium mb-1">결제 수단</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingOrder({ ...editingOrder, paymentMethod: 'CASH' })}
                    className={`py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                      editingOrder.paymentMethod === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-primary text-surface-dim border-white/10 hover:text-white'
                    }`}
                  >
                    현금 결제
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingOrder({ ...editingOrder, paymentMethod: 'TRANSFER' })}
                    className={`py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                      editingOrder.paymentMethod === 'TRANSFER'
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-primary text-surface-dim border-white/10 hover:text-white'
                    }`}
                  >
                    계좌이체
                  </button>
                </div>
              </div>

              {/* Items List Modification */}
              <div className="text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-surface-dim font-medium">주문 품목 목록</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [
                        ...editingOrder.items,
                        { itemId: `item_${Date.now()}`, name: '새 상품', price: 1000, count: 1 },
                      ];
                      const newTotal = newItems.reduce((s, i) => s + i.price * i.count, 0);
                      const nextDiscount = Math.min(newTotal, Math.max(0, editingOrder.gifticonDiscountAmount || 0));
                      const nextActual = Math.max(0, newTotal - nextDiscount);
                      setEditingOrder({
                        ...editingOrder,
                        items: newItems,
                        totalAmount: newTotal,
                        gifticonDiscountAmount: nextDiscount,
                        actualPaidAmount: nextActual,
                      });
                    }}
                    className="text-xs text-secondary-container hover:underline font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>품목 추가</span>
                  </button>
                </div>

                <div className="divide-y divide-white/5 border-t border-b border-white/10">
                  {editingOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 py-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => {
                          const updated = [...editingOrder.items];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setEditingOrder({ ...editingOrder, items: updated });
                        }}
                        placeholder="상품명"
                        className="flex-1 bg-primary border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs"
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
                            const nextDiscount = Math.min(newTotal, Math.max(0, editingOrder.gifticonDiscountAmount || 0));
                            const nextActual = Math.max(0, newTotal - nextDiscount);
                            setEditingOrder({
                              ...editingOrder,
                              items: updated,
                              totalAmount: newTotal,
                              gifticonDiscountAmount: nextDiscount,
                              actualPaidAmount: nextActual,
                            });
                          }}
                          placeholder="단가"
                          className="w-full bg-primary border border-white/10 rounded-lg px-2 py-1.5 text-white font-mono text-xs text-right"
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
                            const nextDiscount = Math.min(newTotal, Math.max(0, editingOrder.gifticonDiscountAmount || 0));
                            const nextActual = Math.max(0, newTotal - nextDiscount);
                            setEditingOrder({
                              ...editingOrder,
                              items: updated,
                              totalAmount: newTotal,
                              gifticonDiscountAmount: nextDiscount,
                              actualPaidAmount: nextActual,
                            });
                          }}
                          placeholder="수량"
                          className="w-full bg-primary border border-white/10 rounded-lg px-2 py-1.5 text-white font-mono text-xs text-center"
                        />
                        <span className="text-[10px] text-surface-dim">개</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingOrder.items.filter((_, i) => i !== idx);
                          const newTotal = updated.reduce((s, i) => s + i.price * i.count, 0);
                          const nextDiscount = Math.min(newTotal, Math.max(0, editingOrder.gifticonDiscountAmount || 0));
                          const nextActual = Math.max(0, newTotal - nextDiscount);
                          setEditingOrder({
                            ...editingOrder,
                            items: updated,
                            totalAmount: newTotal,
                            gifticonDiscountAmount: nextDiscount,
                            actualPaidAmount: nextActual,
                          });
                        }}
                        className="p-1.5 text-surface-dim hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="품목 제거"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing & Direct Discount Modification (적용 전 / 할인 적용 금액 / 적용 후 금액) */}
              <div className="text-xs rounded-xl bg-white/[0.03] border border-white/10 p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 적용 전 금액 (Total Amount) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-surface-dim font-medium">적용 전 금액 (원)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const computed = editingOrder.items.reduce((s, i) => s + i.price * i.count, 0);
                          const nextDiscount = Math.min(computed, Math.max(0, editingOrder.gifticonDiscountAmount || 0));
                          const nextActual = Math.max(0, computed - nextDiscount);
                          setEditingOrder({
                            ...editingOrder,
                            totalAmount: computed,
                            gifticonDiscountAmount: nextDiscount,
                            actualPaidAmount: nextActual,
                          });
                        }}
                        className="text-[11px] text-secondary-container hover:underline cursor-pointer"
                      >
                        품목 합계로 재계산
                      </button>
                    </div>
                    <input
                      type="number"
                      value={editingOrder.totalAmount}
                      onChange={e => {
                        const nextTotal = Math.max(0, parseInt(e.target.value) || 0);
                        const nextDiscount = Math.min(nextTotal, Math.max(0, editingOrder.gifticonDiscountAmount || 0));
                        const nextActual = Math.max(0, nextTotal - nextDiscount);
                        setEditingOrder({
                          ...editingOrder,
                          totalAmount: nextTotal,
                          gifticonDiscountAmount: nextDiscount,
                          actualPaidAmount: nextActual,
                        });
                      }}
                      className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm outline-none focus:border-secondary-container"
                    />
                  </div>

                  {/* 할인 적용 금액 (Discount Amount) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-purple-300 font-bold">할인 적용 금액 (원)</label>
                      {(editingOrder.gifticonDiscountAmount || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOrder({
                              ...editingOrder,
                              gifticonDiscountAmount: 0,
                              actualPaidAmount: editingOrder.totalAmount,
                            });
                          }}
                          className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                        >
                          할인 초기화 (0원)
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      value={editingOrder.gifticonDiscountAmount || 0}
                      onChange={e => {
                        const rawDiscount = Math.max(0, parseInt(e.target.value) || 0);
                        const clampedDiscount = Math.min(editingOrder.totalAmount, rawDiscount);
                        const nextActual = Math.max(0, editingOrder.totalAmount - clampedDiscount);
                        const nextChange =
                          editingOrder.paymentMethod === 'CASH' && editingOrder.cashReceived !== undefined
                            ? Math.max(0, editingOrder.cashReceived - nextActual)
                            : editingOrder.changeAmount;
                        setEditingOrder({
                          ...editingOrder,
                          gifticonDiscountAmount: clampedDiscount,
                          actualPaidAmount: nextActual,
                          changeAmount: nextChange,
                        });
                      }}
                      className="w-full bg-primary border border-purple-500/30 rounded-lg px-3 py-2 text-purple-200 font-mono font-bold text-sm outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                {/* 적용 후 실결제 금액 (Actual Paid Amount) */}
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-surface-dim font-bold">적용 후 실결제 금액</span>
                  <span className="text-base font-black font-mono tabular-nums text-secondary-container">
                    {(
                      editingOrder.actualPaidAmount ??
                      Math.max(0, editingOrder.totalAmount - (editingOrder.gifticonDiscountAmount || 0))
                    ).toLocaleString()}
                    원
                  </span>
                </div>
              </div>

              {/* Cash specific values */}
              {editingOrder.paymentMethod === 'CASH' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-surface-dim font-medium mb-1">받은 금액</label>
                    <input
                      type="number"
                      value={
                        editingOrder.cashReceived ??
                        (editingOrder.actualPaidAmount ?? editingOrder.totalAmount)
                      }
                      onChange={e => {
                        const rec = parseInt(e.target.value) || 0;
                        const netPayable =
                          editingOrder.actualPaidAmount ??
                          Math.max(0, editingOrder.totalAmount - (editingOrder.gifticonDiscountAmount || 0));
                        setEditingOrder({
                          ...editingOrder,
                          cashReceived: rec,
                          changeAmount: Math.max(0, rec - netPayable),
                        });
                      }}
                      className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-surface-dim font-medium mb-1">거스름돈</label>
                    <input
                      type="number"
                      value={editingOrder.changeAmount ?? 0}
                      onChange={e => setEditingOrder({ ...editingOrder, changeAmount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Refunded Items Modification */}
              <div className="text-xs space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-surface-dim font-medium">
                    부분 환불 이력 ({(editingOrder.refundedItems || []).length}건)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentRefunds = editingOrder.refundedItems || [];
                      const newRefundItem: PosRefundedItem = {
                        itemId: `refund_${Date.now()}`,
                        name: '환불 품목',
                        price: 1000,
                        count: 1,
                        cancelReason: '고객 요청',
                        refundedAt: new Date().toISOString(),
                        refundedBy: currentUserName || '관리자',
                      };
                      const updatedRefunds = [...currentRefunds, newRefundItem];
                      const newRefundTotal = updatedRefunds.reduce((sum, r) => sum + r.price * r.count, 0);
                      setEditingOrder({
                        ...editingOrder,
                        refundedItems: updatedRefunds,
                        refundedAmount: newRefundTotal,
                      });
                    }}
                    className="text-xs text-amber-400 hover:underline font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>환불 품목 추가</span>
                  </button>
                </div>

                {(!editingOrder.refundedItems || editingOrder.refundedItems.length === 0) ? (
                  <div className="text-[11px] text-surface-dim py-2">
                    등록된 개별 환불 내역이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editingOrder.refundedItems.map((refItem, rIdx) => (
                      <div
                        key={rIdx}
                        className="bg-primary p-2.5 rounded-xl border border-white/10 space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={refItem.name}
                            onChange={e => {
                              const updated = [...(editingOrder.refundedItems || [])];
                              updated[rIdx] = { ...updated[rIdx], name: e.target.value };
                              setEditingOrder({ ...editingOrder, refundedItems: updated });
                            }}
                            placeholder="환불 상품명"
                            className="flex-1 bg-[#0a1120] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs"
                          />
                          <div className="flex items-center space-x-1 w-24">
                            <input
                              type="number"
                              value={refItem.price}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                const updated = [...(editingOrder.refundedItems || [])];
                                updated[rIdx] = { ...updated[rIdx], price: val };
                                const newRefundTotal = updated.reduce((s, r) => s + r.price * r.count, 0);
                                setEditingOrder({
                                  ...editingOrder,
                                  refundedItems: updated,
                                  refundedAmount: newRefundTotal,
                                });
                              }}
                              placeholder="단가"
                              className="w-full bg-[#0a1120] border border-white/10 rounded-lg px-2 py-1.5 text-white font-mono text-xs text-right"
                            />
                            <span className="text-[10px] text-surface-dim">원</span>
                          </div>
                          <div className="flex items-center space-x-1 w-16">
                            <input
                              type="number"
                              value={refItem.count}
                              onChange={e => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                const updated = [...(editingOrder.refundedItems || [])];
                                updated[rIdx] = { ...updated[rIdx], count: val };
                                const newRefundTotal = updated.reduce((s, r) => s + r.price * r.count, 0);
                                setEditingOrder({
                                  ...editingOrder,
                                  refundedItems: updated,
                                  refundedAmount: newRefundTotal,
                                });
                              }}
                              placeholder="수량"
                              className="w-full bg-[#0a1120] border border-white/10 rounded-lg px-2 py-1.5 text-white font-mono text-xs text-center"
                            />
                            <span className="text-[10px] text-surface-dim">개</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <input
                            type="text"
                            value={refItem.cancelReason || ''}
                            onChange={e => {
                              const updated = [...(editingOrder.refundedItems || [])];
                              updated[rIdx] = { ...updated[rIdx], cancelReason: e.target.value };
                              setEditingOrder({ ...editingOrder, refundedItems: updated });
                            }}
                            placeholder="환불 사유 (선택)"
                            className="flex-1 bg-[#0a1120] border border-white/10 rounded-lg px-2.5 py-1 text-white text-[11px]"
                          />
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const remainingRefunds = (editingOrder.refundedItems || []).filter((_, i) => i !== rIdx);
                                const currentItems = [...editingOrder.items];
                                const matchIdx = currentItems.findIndex(ci => ci.itemId === refItem.itemId);
                                if (matchIdx >= 0) {
                                  currentItems[matchIdx] = {
                                    ...currentItems[matchIdx],
                                    count: currentItems[matchIdx].count + refItem.count,
                                  };
                                } else {
                                  currentItems.push({
                                    itemId: refItem.itemId,
                                    name: refItem.name,
                                    price: refItem.price,
                                    count: refItem.count,
                                  });
                                }
                                const newTotal = currentItems.reduce((s, i) => s + i.price * i.count, 0);
                                const newRefundTotal = remainingRefunds.reduce((s, r) => s + r.price * r.count, 0);
                                const nextDiscount = Math.min(newTotal, Math.max(0, editingOrder.gifticonDiscountAmount || 0));
                                const nextActual = Math.max(0, newTotal - nextDiscount);
                                setEditingOrder({
                                  ...editingOrder,
                                  items: currentItems,
                                  totalAmount: newTotal,
                                  gifticonDiscountAmount: nextDiscount,
                                  actualPaidAmount: nextActual,
                                  refundedItems: remainingRefunds,
                                  refundedAmount: newRefundTotal,
                                });
                              }}
                              className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-bold cursor-pointer"
                            >
                              품목 복원
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const remainingRefunds = (editingOrder.refundedItems || []).filter((_, i) => i !== rIdx);
                                const newRefundTotal = remainingRefunds.reduce((s, r) => s + r.price * r.count, 0);
                                setEditingOrder({
                                  ...editingOrder,
                                  refundedItems: remainingRefunds,
                                  refundedAmount: newRefundTotal,
                                });
                              }}
                              className="p-1 text-surface-dim hover:text-rose-400 rounded cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cancel State Edit */}
              <div className="text-xs pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingOrder.isCancelled}
                      onChange={e => {
                        const isCanc = e.target.checked;
                        setEditingOrder({
                          ...editingOrder,
                          isCancelled: isCanc,
                          cancelledBy: isCanc ? editingOrder.cancelledBy || currentUserName || '관리자' : undefined,
                          cancelledAt: isCanc ? editingOrder.cancelledAt || new Date().toISOString() : undefined,
                          cancelReason: isCanc ? editingOrder.cancelReason || '관리자 직접 수정' : undefined,
                        });
                      }}
                      className="w-4 h-4 rounded text-rose-500 focus:ring-0"
                    />
                    <span className="font-bold text-white">결제 취소(전체 환불) 상태로 설정</span>
                  </label>
                  <span className={`text-[11px] font-bold ${editingOrder.isCancelled ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {editingOrder.isCancelled ? '취소됨' : '정상 결제'}
                  </span>
                </div>

                {editingOrder.isCancelled && (
                  <input
                    type="text"
                    value={editingOrder.cancelReason || ''}
                    onChange={e => setEditingOrder({ ...editingOrder, cancelReason: e.target.value })}
                    placeholder="취소 사유 입력"
                    className="w-full bg-primary border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs"
                  />
                )}
              </div>
            </div>

            <div className="flex space-x-2 pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveEditOrder}
                className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Order Confirm Modal */}
      {deletingOrderTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a1120] border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="pb-3 border-b border-white/10 flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-white">매출 내역 삭제</h3>
              <span className="text-xs text-surface-dim font-mono">{deletingOrderTarget.id}</span>
            </div>

            <p className="text-xs text-surface-dim leading-relaxed">
              이 주문 내역을 영구 삭제하시겠습니까? 삭제 시 매출 집계에서 제외되며 복구할 수 없습니다.
            </p>

            <div className="flex space-x-2 pt-1">
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
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Full Cancellation Modal */}
      {confirmRestoreCancelTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a1120] border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="pb-3 border-b border-white/10 flex items-baseline justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white">결제 취소 철회</h3>
              <span className="text-xs text-surface-dim font-mono">{confirmRestoreCancelTarget.id}</span>
            </div>

            <div className="space-y-2 text-xs text-surface-dim">
              <p className="text-white font-medium">
                결제 취소를 철회하고 정상 결제 상태로 복원하시겠습니까?
              </p>
              <div className="py-2.5 px-3 rounded-xl bg-primary border border-white/10 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>복원 금액</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {(confirmRestoreCancelTarget.actualPaidAmount ?? confirmRestoreCancelTarget.totalAmount).toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>주문 품목</span>
                  <span className="text-white truncate max-w-[220px]">
                    {confirmRestoreCancelTarget.items.map(i => `${i.name} ${i.count}개`).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <label className="flex items-center space-x-2 text-xs text-surface-dim cursor-pointer">
              <input
                type="checkbox"
                checked={restoreStockOption}
                onChange={e => setRestoreStockOption(e.target.checked)}
                className="w-4 h-4 rounded text-secondary focus:ring-0"
              />
              <span>판매 수량에 다시 반영</span>
            </label>

            <div className="flex space-x-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConfirmRestoreCancelTarget(null)}
                disabled={isProcessingRestore}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecuteRestoreCancel}
                disabled={isProcessingRestore}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isProcessingRestore ? '복원 중...' : '정상 결제로 복원'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Partial Refund Modal */}
      {confirmRestorePartialTarget && (() => {
        const refundedItems = confirmRestorePartialTarget.refundedItems || [];
        const totalSelectedRestoreCount = refundedItems.reduce(
          (sum, i) => sum + Math.min(i.count, Math.max(0, restorePartialSelection[i.itemId] || 0)),
          0
        );
        const selectedRestoreAmount = refundedItems.reduce(
          (sum, i) =>
            sum + i.price * Math.min(i.count, Math.max(0, restorePartialSelection[i.itemId] || 0)),
          0
        );

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0a1120] border border-white/10 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                <div className="flex items-baseline space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">부분 환불 취소 (품목 복원)</h3>
                  <span className="text-xs text-surface-dim font-mono">· {confirmRestorePartialTarget.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmRestorePartialTarget(null)}
                  className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-surface-dim">복원할 환불 품목 선택</span>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const allMap: Record<string, number> = {};
                        refundedItems.forEach(i => {
                          allMap[i.itemId] = i.count;
                        });
                        setRestorePartialSelection(allMap);
                      }}
                      className="text-surface-dim hover:text-white cursor-pointer"
                    >
                      전체 선택
                    </button>
                    <span className="text-white/20">·</span>
                    <button
                      type="button"
                      onClick={() => setRestorePartialSelection({})}
                      className="text-surface-dim hover:text-white cursor-pointer"
                    >
                      선택 해제
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-white/5 border-t border-b border-white/10">
                  {refundedItems.map(item => {
                    const selectedCount = Math.min(
                      item.count,
                      Math.max(0, restorePartialSelection[item.itemId] || 0)
                    );
                    const isChecked = selectedCount > 0;

                    return (
                      <div
                        key={item.itemId}
                        onClick={() => {
                          setRestorePartialSelection(prev => ({
                            ...prev,
                            [item.itemId]: isChecked ? 0 : item.count,
                          }));
                        }}
                        className={`py-2.5 px-2 transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked ? 'bg-secondary/15 text-white' : 'text-surface-dim hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <div className="shrink-0">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-secondary-container" />
                            ) : (
                              <Square className="w-4 h-4 text-surface-dim" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-surface-dim font-mono">
                              {item.price.toLocaleString()}원 × 환불 {item.count}개
                            </div>
                          </div>
                        </div>

                        <div
                          className="flex items-center space-x-2 shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          {item.count > 1 && (
                            <div className="flex items-center space-x-1 bg-primary border border-white/10 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setRestorePartialSelection(prev => ({
                                    ...prev,
                                    [item.itemId]: Math.max(0, selectedCount - 1),
                                  }))
                                }
                                className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-mono font-bold px-1.5 text-white">
                                {selectedCount}/{item.count}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRestorePartialSelection(prev => ({
                                    ...prev,
                                    [item.itemId]: Math.min(item.count, selectedCount + 1),
                                  }))
                                }
                                className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <div className="text-right min-w-[64px]">
                            <span
                              className={`text-xs font-mono font-bold ${
                                isChecked ? 'text-emerald-400' : 'text-surface-dim'
                              }`}
                            >
                              {isChecked ? `+${(item.price * selectedCount).toLocaleString()}원` : '0원'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Readout */}
                <div className="py-2.5 px-3 rounded-xl bg-primary border border-white/10 flex items-center justify-between text-xs font-bold">
                  <span className="text-surface-dim">복원 금액 ({totalSelectedRestoreCount}개)</span>
                  <span className="text-sm font-black font-mono text-emerald-400">
                    +{selectedRestoreAmount.toLocaleString()}원
                  </span>
                </div>

                <label className="flex items-center space-x-2 text-xs text-surface-dim cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreStockOption}
                    onChange={e => setRestoreStockOption(e.target.checked)}
                    className="w-4 h-4 rounded text-secondary focus:ring-0"
                  />
                  <span>판매 수량에 다시 반영</span>
                </label>
              </div>

              <div className="flex space-x-2 pt-3 border-t border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmRestorePartialTarget(null)}
                  disabled={isProcessingRestore}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestorePartial}
                  disabled={totalSelectedRestoreCount === 0 || isProcessingRestore}
                  className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isProcessingRestore
                    ? '복원 중...'
                    : `부분 환불 취소 (+${selectedRestoreAmount.toLocaleString()}원)`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
