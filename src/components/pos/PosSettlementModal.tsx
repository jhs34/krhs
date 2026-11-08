import { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Coins, 
  Banknote, 
  Printer, 
  Copy, 
  Check, 
  Lock, 
  FileText, 
  Calendar, 
  Sparkles, 
  History, 
  Info, 
  ChevronRight, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  HelpCircle,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  LogIn,
  LogOut,
  RotateCcw,
  Plus,
  Save,
  Ticket
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { PosOrder, PosSettlement } from '../../types/pos';
import { 
  subscribePosSettlements, 
  savePosSettlement, 
  deletePosSettlement 
} from '../../services/posFirestore';
import { auth, loginWithGoogle, logout } from '../../firebase';

interface PosSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PosOrder[];
  currentUserName: string;
  currentUserId: string;
  settlement: PosSettlement | null;
  onSaveSettlement: (settlement: PosSettlement) => void;
  onDeleteSettlement?: (id: string) => void;
  isAdmin?: boolean;
}

export function PosSettlementModal({
  isOpen,
  onClose,
  orders,
  currentUserName,
  currentUserId,
  settlement,
  onSaveSettlement,
  onDeleteSettlement,
  isAdmin = false,
}: PosSettlementModalProps) {
  // Navigation Tabs: 'today' (당일 마감 정산) or 'history' (역대 마감 내역)
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  const todayId = format(new Date(), 'yyyy-MM-dd');

  // Google Auth for Admin Verification
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Opening preparation cash (준비금)
  const [initialCash, setInitialCash] = useState<number>(() => (settlement?.id === todayId && typeof settlement?.initialCash === 'number' ? settlement.initialCash : 50000));

  // Denominations for physical cash counting (한국 원화 화폐 규격)
  const [counts, setCounts] = useState<{ [denom: number]: number }>({
    50000: 0,
    10000: 0,
    5000: 0,
    1000: 0,
    500: 0,
    100: 0,
  });

  const [directCashInput, setDirectCashInput] = useState<string>('');
  const [useDirectInput, setUseDirectInput] = useState<boolean>(false);
  const [closingNote, setClosingNote] = useState<string>(() => (settlement?.id === todayId ? settlement.note || '' : ''));
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [isFinalized, setIsFinalized] = useState<boolean>(() => Boolean(settlement && settlement.id === todayId && settlement.status === 'CLOSED'));

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // History state
  const [historyList, setHistoryList] = useState<PosSettlement[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PosSettlement | null>(null);
  const [copiedHistoryReport, setCopiedHistoryReport] = useState<boolean>(false);

  // History Search & Filter state
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DISCREPANCY' | 'MATCH' | 'THIS_MONTH'>('ALL');

  // Admin Edit & Delete state for history items
  const [editingSettlement, setEditingSettlement] = useState<PosSettlement | null>(null);
  const [editInitialCash, setEditInitialCash] = useState<number>(0);
  const [editActualCash, setEditActualCash] = useState<number>(0);
  const [editNote, setEditNote] = useState<string>('');
  const [editClosedBy, setEditClosedBy] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'OPEN' | 'CLOSED'>('CLOSED');
  const [settlementToDelete, setSettlementToDelete] = useState<PosSettlement | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Google Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setGoogleUser(user);
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
  const isAuthorizedAdmin = isAdmin || isGoogleAdmin;

  // Sync state when settlement prop changes
  useEffect(() => {
    if (settlement && settlement.id === todayId) {
      if (typeof settlement.initialCash === 'number') {
        setInitialCash(settlement.initialCash);
      }
      if (settlement.note) {
        setClosingNote(settlement.note);
      }
      setIsFinalized(settlement.status === 'CLOSED');
    } else {
      setIsFinalized(false);
    }
  }, [settlement, todayId]);

  // Subscribe to all historical settlements when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribePosSettlements(list => {
      setHistoryList(list);
      const todayRecord = list.find(s => s.id === todayId);
      if (todayRecord && todayRecord.status === 'CLOSED') {
        setIsFinalized(true);
        if (typeof todayRecord.initialCash === 'number' && initialCash === 50000) {
          setInitialCash(todayRecord.initialCash);
        }
        if (todayRecord.note && !closingNote) {
          setClosingNote(todayRecord.note);
        }
      } else {
        // If todayRecord does not exist in history (e.g. deleted by user) or is not CLOSED
        setIsFinalized(false);
      }
    });
    return () => unsub();
  }, [isOpen, todayId]);

  // Calculate order metrics for today (기프티콘 제외 실매출 및 정가/기프티콘 분리)
  const activeOrders = useMemo(() => orders.filter(o => !o.isCancelled), [orders]);
  const cancelledOrders = useMemo(() => orders.filter(o => o.isCancelled), [orders]);

  // Actual cash/transfer received (실제 돈)
  const transferSales = useMemo(
    () => activeOrders.filter(o => o.paymentMethod === 'TRANSFER').reduce((s, o) => s + (o.actualPaidAmount ?? (o.totalAmount - (o.gifticonDiscountAmount || 0))), 0),
    [activeOrders]
  );

  const cashSales = useMemo(
    () => activeOrders.filter(o => o.paymentMethod === 'CASH').reduce((s, o) => s + (o.actualPaidAmount ?? (o.totalAmount - (o.gifticonDiscountAmount || 0))), 0),
    [activeOrders]
  );

  // Actual collected revenue (기프티콘 제외 실수납 매출)
  const totalSales = transferSales + cashSales;

  // Gross total sales (정가 기준)
  const grossSales = useMemo(
    () => activeOrders.reduce((s, o) => s + o.totalAmount, 0),
    [activeOrders]
  );

  // Total gifticon discounts applied
  const gifticonSales = useMemo(
    () => activeOrders.reduce((s, o) => s + (o.gifticonDiscountAmount || 0), 0),
    [activeOrders]
  );

  // Expected cash in drawer = initialCash + cashSales
  const expectedCashInDrawer = initialCash + cashSales;

  // Actual cash in drawer
  const countedCash = useMemo(() => {
    if (useDirectInput) {
      return parseInt(directCashInput.replace(/[^0-9]/g, ''), 10) || 0;
    }
    return Object.entries(counts).reduce((sum, [denom, count]) => {
      return sum + Number(denom) * (count || 0);
    }, 0);
  }, [useDirectInput, directCashInput, counts]);

  // Discrepancy (실측금액 - 장부상금액)
  const discrepancy = countedCash - expectedCashInDrawer;

  // Aggregate History KPIs (only completed closures)
  const historyStats = useMemo(() => {
    const closedList = historyList.filter(item => item.status === 'CLOSED');
    const totalCount = closedList.length;
    const grandTotalSales = closedList.reduce((acc, item) => acc + (item.totalSales || 0), 0);
    const grandCashSales = closedList.reduce((acc, item) => acc + (item.cashSales || 0), 0);
    const grandTransferSales = closedList.reduce((acc, item) => acc + (item.transferSales || 0), 0);
    return { totalCount, grandTotalSales, grandCashSales, grandTransferSales };
  }, [historyList]);

  // Filtered History list based on search and status (only completed closing records)
  const filteredHistoryList = useMemo(() => {
    return historyList.filter(item => {
      // Historical tab is strictly for completed closures
      if (item.status !== 'CLOSED') return false;

      // Date Picker Search
      if (searchDate && item.id !== searchDate) return false;

      // Text Query Search (Date, Manager, Note)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = item.id.toLowerCase().includes(q);
        const matchBy = (item.closedBy || item.openedBy || '').toLowerCase().includes(q);
        const matchNote = (item.note || '').toLowerCase().includes(q);
        if (!matchId && !matchBy && !matchNote) return false;
      }

      // Status Filter
      const expected = (item.initialCash || 0) + (item.cashSales || 0);
      const diff = typeof item.discrepancy === 'number' ? item.discrepancy : ((item.actualCashInput || 0) - expected);

      if (filterStatus === 'DISCREPANCY' && diff === 0) return false;
      if (filterStatus === 'MATCH' && diff !== 0) return false;
      if (filterStatus === 'THIS_MONTH') {
        const currentMonth = format(new Date(), 'yyyy-MM');
        if (!item.id.startsWith(currentMonth)) return false;
      }

      return true;
    });
  }, [historyList, searchDate, searchQuery, filterStatus]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCountChange = (denom: number, val: string) => {
    const n = Math.max(0, parseInt(val, 10) || 0);
    setCounts(prev => ({ ...prev, [denom]: n }));
  };

  const handleQuickAdd = (denom: number, delta: number) => {
    setCounts(prev => ({ ...prev, [denom]: Math.max(0, (prev[denom] || 0) + delta) }));
  };

  // Google Login / Logout
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      showToast('관리자 구글 계정으로 인증되었습니다.');
    } catch (e) {
      console.error(e);
      showToast('구글 로그인에 실패했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      showToast('관리자 계정에서 로그아웃되었습니다.');
    } catch (e) {
      console.error(e);
    }
  };

  // Save Opening Preparation Cash Only (시작 준비금 등록 / 저장)
  const handleSaveInitialCashOnly = async () => {
    const todayId = format(new Date(), 'yyyy-MM-dd');
    const existingToday = (settlement?.id === todayId ? settlement : null) || historyList.find(s => s.id === todayId);
    const wasClosed = isFinalized || existingToday?.status === 'CLOSED';

    // Recalculate discrepancy based on new initialCash
    const expectedWithNewInitial = initialCash + cashSales;
    const newDiscrepancy = countedCash - expectedWithNewInitial;

    const newSettlement: PosSettlement = {
      id: todayId,
      openedAt: existingToday?.openedAt || (settlement?.id === todayId && settlement?.openedAt) || new Date().toISOString(),
      closedAt: wasClosed ? (existingToday?.closedAt || new Date().toISOString()) : undefined,
      openedBy: existingToday?.openedBy || (settlement?.id === todayId && settlement?.openedBy) || currentUserName,
      closedBy: wasClosed ? (existingToday?.closedBy || currentUserName) : undefined,
      initialCash,
      transferSales,
      cashSales,
      totalSales,
      actualCashInput: countedCash,
      discrepancy: newDiscrepancy,
      status: wasClosed ? 'CLOSED' : 'OPEN', // 당일 마감이 이미 저장된 상태라면 마감 상태(CLOSED)를 안전하게 유지
      note: closingNote || existingToday?.note || '',
    };

    try {
      await savePosSettlement(newSettlement, currentUserName);
      setIsFinalized(wasClosed);
      onSaveSettlement(newSettlement);
      if (wasClosed) {
        showToast(`시작 준비금(${initialCash.toLocaleString()}원)이 변경되어 당일 마감 정산에 즉시 반영되었습니다.`);
      } else {
        showToast(`시작 준비금(${initialCash.toLocaleString()}원)이 성공적으로 설정되었습니다.`);
      }
    } catch (err) {
      console.error(err);
      showToast('시작 준비금 저장 중 오류가 발생했습니다.');
    }
  };

  // Finalize Shift Settlement (마감 정산 저장)
  const handleFinalize = async () => {
    const todayId = format(new Date(), 'yyyy-MM-dd');
    const newSettlement: PosSettlement = {
      id: todayId,
      openedAt: (settlement?.id === todayId && settlement?.openedAt) || new Date().toISOString(),
      closedAt: new Date().toISOString(),
      openedBy: (settlement?.id === todayId && settlement?.openedBy) || currentUserName,
      closedBy: currentUserName,
      initialCash,
      transferSales,
      cashSales,
      totalSales,
      actualCashInput: countedCash,
      discrepancy,
      status: 'CLOSED',
      note: closingNote,
    };

    try {
      const wasFinalized = isFinalized;
      await savePosSettlement(newSettlement, currentUserName);
      onSaveSettlement(newSettlement);
      setIsFinalized(true);
      showToast(wasFinalized ? '일일 영업 마감 정산 내역이 성공적으로 수정되었습니다.' : '일일 영업 마감 정산이 완료되어 안전하게 저장되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('마감 저장 중 오류가 발생했습니다.');
    }
  };

  // Open Edit for a Historical Settlement
  const handleStartEdit = (item: PosSettlement) => {
    setEditingSettlement(item);
    setEditInitialCash(item.initialCash || 0);
    setEditActualCash(item.actualCashInput || 0);
    setEditNote(item.note || '');
    setEditClosedBy(item.closedBy || item.openedBy || currentUserName);
    setEditStatus(item.status || 'CLOSED');
  };

  // Save Edit for a Historical Settlement
  const handleSaveEdit = async () => {
    if (!editingSettlement) return;

    const expected = editInitialCash + (editingSettlement.cashSales || 0);
    const newDiff = editActualCash - expected;

    const updated: PosSettlement = {
      ...editingSettlement,
      initialCash: editInitialCash,
      actualCashInput: editActualCash,
      discrepancy: newDiff,
      note: editNote,
      closedBy: editClosedBy,
      status: editStatus,
    };

    try {
      await savePosSettlement(updated, currentUserName);
      setEditingSettlement(null);
      if (selectedHistoryItem?.id === updated.id) {
        setSelectedHistoryItem(updated);
      }
      showToast(`[${updated.id}] 마감 정산 내역이 성공적으로 수정되었습니다.`);
    } catch (err) {
      console.error(err);
      showToast('정산 내역 수정 저장 중 오류가 발생했습니다.');
    }
  };

  // Confirm Delete for a Historical Settlement
  const handleConfirmDelete = async () => {
    if (!settlementToDelete) return;
    const targetId = settlementToDelete.id;
    setIsDeleting(true);
    try {
      await deletePosSettlement(targetId, currentUserName);
      if (selectedHistoryItem?.id === targetId) {
        setSelectedHistoryItem(null);
      }
      if (targetId === todayId) {
        setIsFinalized(false);
        setClosingNote('');
        setCounts({
          50000: 0,
          10000: 0,
          5000: 0,
          1000: 0,
          500: 0,
          100: 0,
        });
        setDirectCashInput('');
        try {
          localStorage.removeItem('pos_daily_settlement_v1');
        } catch (e) {
          console.error(e);
        }
        onDeleteSettlement?.(targetId);
      }
      showToast(`[${targetId}] 마감 정산 내역이 삭제되었습니다.`);
      setSettlementToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('정산 내역 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate Report Text for Any Settlement
  const formatReportText = (s: {
    id: string;
    closedAt?: string;
    openedAt?: string;
    closedBy?: string;
    openedBy?: string;
    status: string;
    totalSales: number;
    transferSales: number;
    cashSales: number;
    initialCash: number;
    actualCashInput?: number;
    discrepancy?: number;
    note?: string;
    ordersCount?: number;
    activeCount?: number;
    cancelCount?: number;
  }) => {
    const timeStr = s.closedAt 
      ? format(new Date(s.closedAt), 'yyyy.MM.dd HH:mm') 
      : (s.openedAt ? format(new Date(s.openedAt), 'yyyy.MM.dd HH:mm') : s.id);
    const expected = s.initialCash + s.cashSales;
    const diff = typeof s.discrepancy === 'number' ? s.discrepancy : ((s.actualCashInput || 0) - expected);

    return [
      '================================',
      '      한국철도고등학교 매점      ',
      '       [ 일일 영업 마감 보고서 ]  ',
      '================================',
      `정산일자: ${s.id}`,
      `마감일시: ${timeStr}`,
      `마감담당: ${s.closedBy || s.openedBy || currentUserName}`,
      `마감상태: ${s.status === 'CLOSED' ? '마감 완료' : '진행 중'}`,
      '--------------------------------',
      `[매출 실적]`,
      s.ordersCount ? `· 총 주문: ${s.ordersCount}건 (정상 ${s.activeCount || 0}건, 취소 ${s.cancelCount || 0}건)` : '',
      `· 계좌이체 매출: ${(s.transferSales || 0).toLocaleString()}원`,
      `· 현금 매출:     ${(s.cashSales || 0).toLocaleString()}원`,
      `· 총 매출 합계:   ${(s.totalSales || 0).toLocaleString()}원`,
      '--------------------------------',
      `[금고 시재금 정산]`,
      `· 시작 준비금:   ${(s.initialCash || 0).toLocaleString()}원`,
      `· 장부상 현금:   ${expected.toLocaleString()}원`,
      `· 실측된 현금:   ${(s.actualCashInput || 0).toLocaleString()}원`,
      `· 시재 과부족:   ${diff === 0 ? '0원 (일치)' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}원 (${diff > 0 ? '과잉' : '부족'})`}`,
      '================================',
      s.note ? `특이사항: ${s.note}` : '특이사항 없음.',
      '================================',
    ].filter(Boolean).join('\n');
  };

  // Copy Settlement Report
  const handleCopyReport = () => {
    const text = formatReportText({
      id: format(new Date(), 'yyyy-MM-dd'),
      closedAt: new Date().toISOString(),
      closedBy: currentUserName,
      status: isFinalized ? 'CLOSED' : 'OPEN',
      totalSales,
      transferSales,
      cashSales,
      initialCash,
      actualCashInput: countedCash,
      discrepancy,
      note: closingNote,
      ordersCount: orders.length,
      activeCount: activeOrders.length,
      cancelCount: cancelledOrders.length,
    });

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Copy History Item Report
  const handleCopyHistoryReport = (item: PosSettlement) => {
    const text = formatReportText(item);
    navigator.clipboard.writeText(text);
    setCopiedHistoryReport(true);
    setTimeout(() => setCopiedHistoryReport(false), 2000);
  };

  // CRITICAL: Modal Early Return after all hooks
  if (!isOpen) return null;

  return (
    <div id="pos-settlement-modal" className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-primary border-0 sm:border sm:border-white/10 rounded-none sm:rounded-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Global Floating Toast */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0a1120] border border-secondary/50 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-secondary-container" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#0a1120] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center justify-between sm:justify-start space-x-3">
            <div className="min-w-0">
              <div className="flex items-baseline space-x-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">마감 정산</h2>
                {activeTab === 'today' && isFinalized && (
                  <span className="text-xs font-bold text-emerald-400 shrink-0">
                    · 오늘 마감 완료
                  </span>
                )}
                {isAuthorizedAdmin && (
                  <span className="text-xs font-bold text-secondary-container shrink-0">
                    · 관리자
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              id="btn-close-settlement-mobile"
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-lg hover:bg-white/5 text-surface-dim hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2">
            {/* Tab Selector */}
            <div className="flex items-center space-x-1 bg-primary p-1 rounded-lg border border-white/10 text-xs flex-1 sm:flex-initial">
              <button
                type="button"
                id="tab-settlement-today"
                onClick={() => {
                  setActiveTab('today');
                  setSelectedHistoryItem(null);
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                  activeTab === 'today'
                    ? 'bg-secondary text-white'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>당일 마감 정산</span>
              </button>
              <button
                type="button"
                id="tab-settlement-history"
                onClick={() => setActiveTab('history')}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-secondary text-white'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>역대 마감 내역</span>
                {historyList.filter(s => s.status === 'CLOSED').length > 0 && (
                  <span className="font-mono tabular-nums text-[11px] opacity-80 ml-0.5">
                    {historyList.filter(s => s.status === 'CLOSED').length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              id="btn-close-settlement"
              onClick={onClose}
              className="hidden sm:block p-1.5 rounded-lg hover:bg-white/5 text-surface-dim hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TODAY'S SETTLEMENT                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'today' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 custom-scrollbar">
              
              {/* Optional Collapsible Educational Guide Banner */}
              {showGuide && (
                <div className="bg-[#0a1120] border border-white/10 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs text-surface-dim">
                  <div className="flex items-start space-x-2.5">
                    <Info className="w-4 h-4 text-secondary-container shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-white">시작 준비금 안내</p>
                      <p className="text-[11px] leading-relaxed">
                        영업 전 금고에 넣어둔 기초 잔돈입니다. 우측 상단 [준비금]에 입력 시 &apos;장부상 금고 현금(준비금+현금매출)&apos;에 즉시 반영됩니다.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuide(false)}
                    className="p-1 text-surface-dim hover:text-white rounded cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Section 1: Sales Performance Strip (Crisp 1px Grid Table) */}
              <div>
                <div className="flex items-center justify-between pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-dim">
                    당일 매출 실적
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums text-surface-dim">
                    {todayId}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/15 border border-white/15 rounded-xl overflow-hidden">
                  {/* Total Revenue */}
                  <div className="bg-[#0a1120] p-3.5">
                    <span className="text-[11px] text-surface-dim block">실수납 총 매출</span>
                    <span className="text-lg sm:text-xl font-black text-secondary-container font-mono tabular-nums block mt-1">
                      {totalSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-surface-dim/80 block mt-0.5">
                      정상 {activeOrders.length}건
                    </span>
                  </div>

                  {/* Transfer Sales */}
                  <div className="bg-[#0a1120] p-3.5">
                    <span className="text-[11px] text-surface-dim block">계좌이체</span>
                    <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums block mt-1">
                      {transferSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-surface-dim/80 block mt-0.5">
                      {activeOrders.filter(o => o.paymentMethod === 'TRANSFER').length}건
                    </span>
                  </div>

                  {/* Cash Sales */}
                  <div className="bg-[#0a1120] p-3.5">
                    <span className="text-[11px] text-surface-dim block">현금</span>
                    <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums block mt-1">
                      {cashSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-surface-dim/80 block mt-0.5">
                      {activeOrders.filter(o => o.paymentMethod === 'CASH').length}건
                    </span>
                  </div>

                  {/* Cancelled */}
                  <div className="bg-[#0a1120] p-3.5">
                    <span className="text-[11px] text-surface-dim block">취소/환불</span>
                    <span className="text-lg sm:text-xl font-black text-rose-400 font-mono tabular-nums block mt-1">
                      {cancelledOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-rose-400/80 block mt-0.5">
                      {cancelledOrders.length}건
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Cash Drawer Reconciliation (금고 시재금 대조) */}
              <div className="bg-[#0a1120] border border-white/15 rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-white">금고 시재금 대조</h3>
                    <button
                      type="button"
                      onClick={() => setShowGuide(!showGuide)}
                      className="text-surface-dim hover:text-white p-0.5 transition-colors cursor-pointer"
                      title="준비금 안내 보기"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-secondary-container" />
                    </button>
                  </div>

                  {/* Initial Preparation Cash Setting */}
                  <div className="flex items-center space-x-2">
                    <label htmlFor="input-initial-cash" className="text-xs text-surface-dim font-medium whitespace-nowrap cursor-pointer">
                      시작 준비금
                    </label>
                    <div className="relative">
                      <input
                        id="input-initial-cash"
                        type="number"
                        min="0"
                        step="1000"
                        value={initialCash === 0 ? '' : initialCash}
                        placeholder="0"
                        onChange={e => setInitialCash(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-24 bg-primary border border-white/15 rounded-lg pl-2.5 pr-6 py-1 text-xs text-right font-mono tabular-nums font-bold text-white outline-none focus:border-secondary-container"
                      />
                      <span className="text-[10px] text-surface-dim absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        원
                      </span>
                    </div>
                    <button
                      type="button"
                      id="btn-save-initial-cash"
                      onClick={handleSaveInitialCashOnly}
                      title="시작 준비금만 즉시 저장"
                      className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/90 text-white text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shrink-0"
                    >
                      <Save className="w-3 h-3" />
                      <span>저장</span>
                    </button>
                  </div>
                </div>

                {/* Expected vs Actual Highlight (Crisp 1px Grid) */}
                <div className="grid grid-cols-3 gap-px bg-white/15 border border-white/15 rounded-lg overflow-hidden">
                  {/* Expected in Drawer */}
                  <div className="bg-primary/80 p-3">
                    <span className="text-[11px] text-surface-dim block truncate">
                      장부상 금고 (준비금+현금)
                    </span>
                    <div className="text-sm sm:text-lg font-black font-mono tabular-nums text-white mt-1 truncate">
                      {expectedCashInDrawer.toLocaleString()}원
                    </div>
                  </div>

                  {/* Counted Cash in Drawer */}
                  <div className="bg-primary/80 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-surface-dim truncate">
                        실측 금고 현금
                      </span>
                      <button
                        type="button"
                        id="btn-toggle-input-mode"
                        onClick={() => setUseDirectInput(!useDirectInput)}
                        className="text-[10px] text-secondary-container hover:underline cursor-pointer shrink-0 ml-1 font-bold"
                      >
                        {useDirectInput ? '권종별' : '직접입력'}
                      </button>
                    </div>
                    <div className="text-sm sm:text-lg font-black font-mono tabular-nums text-secondary-container mt-1 truncate">
                      {countedCash.toLocaleString()}원
                    </div>
                  </div>

                  {/* Discrepancy (과부족) */}
                  <div className="bg-primary/80 p-3">
                    <span className="text-[11px] text-surface-dim block truncate">
                      시재 과부족 ({discrepancy === 0 ? '정상 일치' : discrepancy > 0 ? '장부 초과' : '현금 부족'})
                    </span>
                    <div
                      className={`text-sm sm:text-lg font-black font-mono tabular-nums mt-1 truncate ${
                        discrepancy === 0
                          ? 'text-emerald-400'
                          : discrepancy > 0
                          ? 'text-secondary-container'
                          : 'text-rose-400'
                      }`}
                    >
                      {discrepancy === 0
                        ? '0원'
                        : `${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString()}원`}
                    </div>
                  </div>
                </div>

                {/* Denomination Counter Grid */}
                {!useDirectInput ? (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-surface-dim">
                      권종별 실측 수량
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                      {[
                        { denom: 50000, label: '5만원' },
                        { denom: 10000, label: '1만원' },
                        { denom: 5000, label: '5천원' },
                        { denom: 1000, label: '1천원' },
                        { denom: 500, label: '500원' },
                        { denom: 100, label: '100원' },
                      ].map(({ denom, label }) => {
                        const count = counts[denom] || 0;
                        const subtotal = denom * count;

                        return (
                          <div key={denom} className="bg-primary border border-white/10 p-2 rounded-lg">
                            <div className="font-bold text-white mb-1.5 flex justify-between items-baseline text-[11px]">
                              <span>{label}</span>
                              <span className="text-[10px] font-mono tabular-nums text-surface-dim">
                                {subtotal > 0 ? `${(subtotal / 1000).toLocaleString()}k` : ''}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleQuickAdd(denom, -1)}
                                className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 active:scale-95 text-white flex items-center justify-center font-bold text-xs cursor-pointer shrink-0"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={count}
                                onChange={e => handleCountChange(denom, e.target.value)}
                                className="w-full bg-transparent border-b border-white/15 py-0.5 text-center text-xs font-mono tabular-nums font-bold text-white outline-none focus:border-secondary-container"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuickAdd(denom, 1)}
                                className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 active:scale-95 text-white flex items-center justify-center font-bold text-xs cursor-pointer shrink-0"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-surface-dim block mb-1.5">
                      실제 금고 현금 직접 입력 (원)
                    </label>
                    <input
                      type="text"
                      id="input-direct-cash"
                      value={directCashInput}
                      onChange={e => setDirectCashInput(e.target.value)}
                      placeholder="예: 73000"
                      className="w-full bg-primary border border-white/15 rounded-lg px-3 py-2 text-sm font-mono tabular-nums font-bold text-white outline-none focus:border-secondary-container"
                    />
                  </div>
                )}
              </div>

              {/* Section 3: Closing Notes */}
              <div>
                <label htmlFor="input-closing-note" className="text-xs font-bold text-surface-dim block mb-1.5">
                  마감 특이사항 / 메모 <span className="text-white/30 font-normal">(선택)</span>
                </label>
                <textarea
                  id="input-closing-note"
                  value={closingNote}
                  onChange={e => setClosingNote(e.target.value)}
                  placeholder="예: 거스름돈 교환, 특이사항 등"
                  rows={2}
                  className="w-full bg-[#0a1120] border border-white/15 rounded-xl p-3 text-xs text-white placeholder:text-surface-dim/40 outline-none focus:border-secondary-container resize-none"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-4 sm:px-6 py-3.5 border-t border-white/10 bg-[#0a1120] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <button
                  type="button"
                  id="btn-copy-settlement-report"
                  onClick={handleCopyReport}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors border border-white/10 cursor-pointer"
                >
                  {copiedReport ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">복사 완료</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-surface-dim" />
                      <span>보고서 복사</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-print-settlement-report"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors border border-white/10 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-surface-dim" />
                  <span>보고서 인쇄</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  닫기
                </button>

                {isFinalized && (
                  <button
                    type="button"
                    id="btn-delete-today-settlement"
                    onClick={() => {
                      const todayRecord = historyList.find(s => s.id === todayId) || settlement || ({
                        id: todayId,
                        status: 'CLOSED',
                        totalSales,
                        transferSales,
                        cashSales,
                        initialCash,
                      } as PosSettlement);
                      setSettlementToDelete(todayRecord);
                    }}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-colors cursor-pointer"
                    title="당일 마감 내역 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="truncate">마감 삭제</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-finalize-settlement"
                  onClick={handleFinalize}
                  className="flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="truncate">{isFinalized ? '마감 정산 수정' : '마감 정산 저장'}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HISTORICAL SETTLEMENTS (역대 마감 내역 조회 및 관리자 수정/삭제)     */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 custom-scrollbar">
            
            {/* Top Toolbar: Unboxed Search & Filter Controls */}
            <div className="pb-3.5 border-b border-white/10 space-y-2.5">
              <div className="flex items-center gap-2">
                {/* Specific Date Picker */}
                <div className="relative w-38 sm:w-44 shrink-0">
                  <label htmlFor="input-search-date" className="sr-only">일자 검색</label>
                  <input
                    id="input-search-date"
                    type="date"
                    value={searchDate}
                    onChange={e => setSearchDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a1120] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-secondary font-mono [color-scheme:dark]"
                  />
                </div>

                {/* Text Keyword Search */}
                <div className="relative flex-1 min-w-0">
                  <label htmlFor="input-search-query" className="sr-only">키워드 검색</label>
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-surface-dim">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-search-query"
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="담당자, 메모 검색..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#0a1120] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-secondary placeholder:text-surface-dim/50 truncate"
                  />
                </div>

                {/* Clear Filter Button */}
                {(searchDate || searchQuery || filterStatus !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDate('');
                      setSearchQuery('');
                      setFilterStatus('ALL');
                    }}
                    title="필터 초기화"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white border border-white/10 transition-colors shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'ALL', label: '전체' },
                  { id: 'THIS_MONTH', label: '이번 달' },
                  { id: 'DISCREPANCY', label: '오차 발생일' },
                  { id: 'MATCH', label: '시재 일치일' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterStatus(tab.id as any)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      filterStatus === tab.id
                        ? 'bg-secondary text-white'
                        : 'bg-white/5 text-surface-dim hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* If detailed item is selected */}
            {selectedHistoryItem ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryItem(null)}
                    className="flex items-center space-x-1.5 text-xs text-secondary-container hover:underline cursor-pointer font-bold px-1 py-1 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>목록으로</span>
                  </button>

                  <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-hide">
                    {/* Admin Edit / Delete Actions */}
                    {isAuthorizedAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(selectedHistoryItem)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-secondary-container border border-white/10 text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>수정</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettlementToDelete(selectedHistoryItem)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>삭제</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyHistoryReport(selectedHistoryItem)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedHistoryReport ? (
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
                      onClick={() => window.print()}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 transition-colors cursor-pointer shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5 text-surface-dim" />
                      <span>인쇄</span>
                    </button>
                  </div>
                </div>

                {/* Printable Terminal Style Report Card */}
                <div className="bg-[#0a1120] border border-white/10 rounded-xl p-5 sm:p-6 max-w-2xl mx-auto font-mono text-xs space-y-4">
                  <div className="text-center border-b border-white/10 pb-4">
                    <div className="text-base font-black text-white font-sans tracking-wide">
                      한국철도고등학교 매점
                    </div>
                    <div className="text-secondary-container font-bold text-xs mt-0.5">
                      일일 영업 마감 정산 보고서
                    </div>
                    <div className="text-surface-dim text-[11px] mt-1">
                      정산 일자: {selectedHistoryItem.id}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-white/90">
                    <div className="flex justify-between">
                      <span className="text-surface-dim">마감 시각</span>
                      <span>
                        {selectedHistoryItem.closedAt
                          ? format(new Date(selectedHistoryItem.closedAt), 'yyyy-MM-dd HH:mm:ss')
                          : selectedHistoryItem.openedAt || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">마감 담당자</span>
                      <span className="font-bold text-white">{selectedHistoryItem.closedBy || selectedHistoryItem.openedBy || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">정산 상태</span>
                      <span className={selectedHistoryItem.status === 'CLOSED' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        {selectedHistoryItem.status === 'CLOSED' ? '마감 완료 (CLOSED)' : '진행 중 (OPEN)'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 space-y-2">
                    <div className="text-xs font-bold text-secondary-container font-sans">
                      매출 실적
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">계좌이체 매출</span>
                      <span className="text-white tabular-nums">{(selectedHistoryItem.transferSales || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">현금 매출</span>
                      <span className="text-white tabular-nums">{(selectedHistoryItem.cashSales || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-white/10">
                      <span>총 매출 합계</span>
                      <span className="text-secondary-container font-mono tabular-nums font-bold">{(selectedHistoryItem.totalSales || 0).toLocaleString()}원</span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 space-y-2">
                    <div className="text-xs font-bold text-emerald-400 font-sans">
                      금고 시재금 정산
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">시작 준비금</span>
                      <span className="tabular-nums">{(selectedHistoryItem.initialCash || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">장부상 현금 (준비금+현금매출)</span>
                      <span className="tabular-nums">{((selectedHistoryItem.initialCash || 0) + (selectedHistoryItem.cashSales || 0)).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">실측된 금고 현금</span>
                      <span className="text-emerald-400 font-bold tabular-nums">{(selectedHistoryItem.actualCashInput || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-1 border-t border-white/10">
                      <span>시재 과부족 (오차)</span>
                      <span className={`tabular-nums ${
                        (selectedHistoryItem.discrepancy || 0) === 0
                          ? 'text-emerald-400'
                          : (selectedHistoryItem.discrepancy || 0) > 0
                          ? 'text-secondary-container'
                          : 'text-rose-400'
                      }`}>
                        {(selectedHistoryItem.discrepancy || 0) === 0
                          ? '0원 (정상 일치)'
                          : `${(selectedHistoryItem.discrepancy || 0) > 0 ? '+' : ''}${(selectedHistoryItem.discrepancy || 0).toLocaleString()}원`}
                      </span>
                    </div>
                  </div>

                  {selectedHistoryItem.note && (
                    <div className="border-t border-white/10 pt-3">
                      <div className="text-[11px] text-surface-dim mb-1">특이사항 메모</div>
                      <div className="text-white/90 text-xs">
                        {selectedHistoryItem.note}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* History List Overview */
              <div className="space-y-4">
                {/* Aggregate KPI Strip (Crisp 1px Grid Table) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/15 border border-white/15 rounded-xl overflow-hidden">
                  <div className="bg-[#0a1120] p-3.5">
                    <span className="text-[11px] text-surface-dim block mb-1">누적 마감 일수</span>
                    <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
                      {historyStats.totalCount}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">일</span>
                    </span>
                  </div>
                  <div className="bg-[#0a1120] p-3.5">
                    <span className="text-[11px] text-surface-dim block mb-1">누적 정산 총 매출</span>
                    <span className="text-lg sm:text-xl font-black text-secondary-container font-mono tabular-nums">
                      {historyStats.grandTotalSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                  </div>
                  <div className="bg-[#0a1120] p-3.5">
                    <span className="text-[11px] text-surface-dim block mb-1">누적 현금 정산액</span>
                    <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
                      {historyStats.grandCashSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                  </div>
                  <div className="bg-[#0a1120] p-3.5">
                    <span className="text-[11px] text-surface-dim block mb-1">누적 계좌이체액</span>
                    <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
                      {historyStats.grandTransferSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                  </div>
                </div>

                {/* Settlements Hairline List */}
                {filteredHistoryList.length === 0 ? (
                  <div className="py-14 text-center space-y-1.5 text-surface-dim">
                    <History className="w-8 h-8 text-surface-dim/30 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-white">일치하는 마감 정산 내역이 없습니다</h4>
                  </div>
                ) : (
                  <div className="border-t border-b border-white/10 divide-y divide-white/5">
                    {filteredHistoryList.map(item => {
                      const expected = (item.initialCash || 0) + (item.cashSales || 0);
                      const discrepancyVal = typeof item.discrepancy === 'number' 
                        ? item.discrepancy 
                        : ((item.actualCashInput || 0) - expected);

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedHistoryItem(item)}
                          className="hover:bg-white/[0.02] py-3.5 px-2 sm:px-3 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="text-sm font-black text-white font-mono tabular-nums group-hover:text-secondary-container transition-colors">
                                {item.id}
                              </span>
                              <span className="text-white/25">·</span>
                              <span className="text-surface-dim font-medium">
                                담당 {item.closedBy || item.openedBy || '담당자'}
                              </span>
                              <span className="text-white/25">·</span>
                              <span className={`font-bold font-mono tabular-nums ${
                                discrepancyVal === 0
                                  ? 'text-emerald-400'
                                  : discrepancyVal > 0
                                  ? 'text-secondary-container'
                                  : 'text-rose-400'
                              }`}>
                                {discrepancyVal === 0 ? '시재 일치' : discrepancyVal > 0 ? `+${discrepancyVal.toLocaleString()}원 과잉` : `${discrepancyVal.toLocaleString()}원 부족`}
                              </span>
                            </div>
                            <div className="text-[11px] text-surface-dim flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono tabular-nums">
                              <span>준비금 {(item.initialCash || 0).toLocaleString()}원</span>
                              <span className="text-white/20">·</span>
                              <span>실측 {(item.actualCashInput || 0).toLocaleString()}원</span>
                              {item.note && (
                                <>
                                  <span className="text-white/20">·</span>
                                  <span className="font-sans text-white/80 truncate max-w-[180px] sm:max-w-[260px]">{item.note}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <div className="text-[10px] text-surface-dim">총 매출</div>
                              <div className="text-sm font-black text-white font-mono tabular-nums">
                                {(item.totalSales || 0).toLocaleString()}원
                              </div>
                            </div>

                            {isAuthorizedAdmin && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleStartEdit(item);
                                  }}
                                  title="수정"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-surface-dim hover:text-white transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSettlementToDelete(item);
                                  }}
                                  title="삭제"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-surface-dim hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <ChevronRight className="w-4 h-4 text-surface-dim group-hover:text-white transition-colors shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-MODAL 1: EDIT HISTORICAL SETTLEMENT (관리자 전용 정산 수정 모달)          */}
        {/* ========================================================================= */}
        {editingSettlement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#0a1120] border border-white/10 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white">
                  마감 정산 수정 ({editingSettlement.id})
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingSettlement(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-surface-dim hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-surface-dim font-medium mb-1">
                    시작 준비금 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editInitialCash}
                    onChange={e => setEditInitialCash(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-surface-dim font-medium mb-1">
                    실측 금고 현금 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editActualCash}
                    onChange={e => setEditActualCash(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold outline-none focus:border-secondary"
                  />
                </div>

                <div className="py-2.5 border-t border-b border-white/10 space-y-1">
                  <div className="flex justify-between text-surface-dim">
                    <span>장부상 현금</span>
                    <span className="font-mono text-white tabular-nums">{(editInitialCash + (editingSettlement.cashSales || 0)).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>시재 과부족</span>
                    <span className={`font-mono tabular-nums ${
                      (editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))) === 0
                        ? 'text-emerald-400'
                        : (editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))) > 0
                        ? 'text-secondary-container'
                        : 'text-rose-400'
                    }`}>
                      {(editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))) === 0
                        ? '0원 (일치)'
                        : `${(editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))) > 0 ? '+' : ''}${(editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))).toLocaleString()}원`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-surface-dim font-medium mb-1">
                      마감 담당자
                    </label>
                    <input
                      type="text"
                      value={editClosedBy}
                      onChange={e => setEditClosedBy(e.target.value)}
                      className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-surface-dim font-medium mb-1">
                      마감 상태
                    </label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as any)}
                      className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-secondary"
                    >
                      <option value="CLOSED">CLOSED (마감 완료)</option>
                      <option value="OPEN">OPEN (영업 중)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-surface-dim font-medium mb-1">
                    메모
                  </label>
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    rows={2}
                    className="w-full bg-primary border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-secondary resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSettlement(null)}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 py-2.5 rounded-lg bg-secondary hover:bg-secondary/90 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-MODAL 2: DELETE CONFIRMATION (관리자 전용 정산 삭제 확인 모달)          */}
        {/* ========================================================================= */}
        {settlementToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#0a1120] border border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
              <div>
                <h3 className="text-base font-bold text-white mb-1">마감 정산 삭제 ({settlementToDelete.id})</h3>
                <p className="text-xs text-surface-dim leading-relaxed">
                  해당 일자의 마감 정산 보고서를 영구 삭제합니다.
                </p>
              </div>

              <div className="py-2.5 border-t border-b border-white/10 text-xs font-mono text-surface-dim space-y-1">
                <div className="flex justify-between">
                  <span>총 매출</span>
                  <span className="text-white tabular-nums">{(settlementToDelete.totalSales || 0).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>담당자</span>
                  <span className="text-white font-sans">{settlementToDelete.closedBy || settlementToDelete.openedBy || '-'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettlementToDelete(null)}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
