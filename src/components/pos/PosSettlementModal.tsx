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
  Save
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
  isAdmin = false,
}: PosSettlementModalProps) {
  // Navigation Tabs: 'today' (당일 마감 정산) or 'history' (역대 마감 내역)
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  // Google Auth for Admin Verification
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Opening preparation cash (준비금)
  const [initialCash, setInitialCash] = useState<number>(() => settlement?.initialCash ?? 50000);

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
  const [closingNote, setClosingNote] = useState<string>(() => settlement?.note || '');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [isFinalized, setIsFinalized] = useState<boolean>(() => settlement?.status === 'CLOSED');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    if (settlement) {
      if (typeof settlement.initialCash === 'number') {
        setInitialCash(settlement.initialCash);
      }
      if (settlement.note) {
        setClosingNote(settlement.note);
      }
      setIsFinalized(settlement.status === 'CLOSED');
    }
  }, [settlement]);

  // Subscribe to all historical settlements when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribePosSettlements(list => {
      setHistoryList(list);
    });
    return () => unsub();
  }, [isOpen]);

  // Calculate order metrics for today
  const activeOrders = useMemo(() => orders.filter(o => !o.isCancelled), [orders]);
  const cancelledOrders = useMemo(() => orders.filter(o => o.isCancelled), [orders]);

  const transferSales = useMemo(
    () => activeOrders.filter(o => o.paymentMethod === 'TRANSFER').reduce((s, o) => s + o.totalAmount, 0),
    [activeOrders]
  );

  const cashSales = useMemo(
    () => activeOrders.filter(o => o.paymentMethod === 'CASH').reduce((s, o) => s + o.totalAmount, 0),
    [activeOrders]
  );

  const totalSales = transferSales + cashSales;

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

  // Aggregate History KPIs
  const historyStats = useMemo(() => {
    const totalCount = historyList.length;
    const grandTotalSales = historyList.reduce((acc, item) => acc + (item.totalSales || 0), 0);
    const grandCashSales = historyList.reduce((acc, item) => acc + (item.cashSales || 0), 0);
    const grandTransferSales = historyList.reduce((acc, item) => acc + (item.transferSales || 0), 0);
    return { totalCount, grandTotalSales, grandCashSales, grandTransferSales };
  }, [historyList]);

  // Filtered History list based on search and status
  const filteredHistoryList = useMemo(() => {
    return historyList.filter(item => {
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
    const newSettlement: PosSettlement = {
      id: todayId,
      openedAt: settlement?.openedAt || new Date().toISOString(),
      openedBy: settlement?.openedBy || currentUserName,
      initialCash,
      transferSales,
      cashSales,
      totalSales,
      actualCashInput: countedCash,
      discrepancy,
      status: settlement?.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
      note: closingNote,
    };

    try {
      await savePosSettlement(newSettlement, currentUserName);
      onSaveSettlement(newSettlement);
      showToast(`시작 준비금(${initialCash.toLocaleString()}원)이 성공적으로 설정되었습니다.`);
    } catch (err) {
      console.error(err);
      showToast('시작 준비금 저장 중 오류가 발생했습니다.');
    }
  };

  // Finalize Shift Settlement (일일 영업 마감 확정)
  const handleFinalize = async () => {
    const todayId = format(new Date(), 'yyyy-MM-dd');
    const newSettlement: PosSettlement = {
      id: todayId,
      openedAt: settlement?.openedAt || new Date().toISOString(),
      closedAt: new Date().toISOString(),
      openedBy: settlement?.openedBy || currentUserName,
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
      await savePosSettlement(newSettlement, currentUserName);
      onSaveSettlement(newSettlement);
      setIsFinalized(true);
      showToast('일일 영업 마감이 완료되어 안전하게 저장되었습니다.');
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
    setIsDeleting(true);
    try {
      await deletePosSettlement(settlementToDelete.id, currentUserName);
      if (selectedHistoryItem?.id === settlementToDelete.id) {
        setSelectedHistoryItem(null);
      }
      showToast(`[${settlementToDelete.id}] 마감 정산 내역이 삭제되었습니다.`);
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
    <div id="pos-settlement-modal" className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e172e] border-0 sm:border sm:border-white/10 rounded-none sm:rounded-3xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Global Floating Toast */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-secondary px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-white/10 bg-[#090e1c] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center justify-between sm:justify-start space-x-3">
            <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black text-white truncate">일일 시재금 및 마감 정산</h2>
                  {activeTab === 'today' && isFinalized && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      오늘 마감 완료
                    </span>
                  )}
                  {isAuthorizedAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1 shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      <span>관리자</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-surface-dim truncate hidden sm:block">
                  총 매출 집계 및 금고 현금 실측을 대조하고, 역대 마감 정산 보고서를 조회·관리합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-close-settlement-mobile"
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2">
            {/* Tab Selector */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs flex-1 sm:flex-initial">
              <button
                type="button"
                id="tab-settlement-today"
                onClick={() => {
                  setActiveTab('today');
                  setSelectedHistoryItem(null);
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'today'
                    ? 'bg-secondary text-white shadow-sm'
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
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-secondary text-white shadow-sm'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>역대 마감 내역</span>
                {historyList.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-white/10 text-surface-dim'
                  }`}>
                    {historyList.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              id="btn-close-settlement"
              onClick={onClose}
              className="hidden sm:block p-2 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
              
              {/* Educational Notice Banner: What is expected cash & how is it set? */}
              <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/30 rounded-2xl p-4 flex items-start space-x-3 text-xs text-blue-200">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <div className="font-bold text-white flex items-center space-x-2">
                    <span>💡 [안내] 시작 준비금과 장부상 금고 현금</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      실시간 자동 계산
                    </span>
                  </div>
                  <p className="text-blue-200/90">
                    <strong>&apos;시작 준비금&apos;</strong>은 영업 전 거스름돈용으로 금고에 넣어둔 기초 현금입니다. 아래 
                    <span className="text-white font-bold underline underline-offset-2 mx-1">[시작 준비금 설정]</span>에 금액을 입력하면
                    <strong>&apos;장부상 금고 현금(준비금 + 오늘 현금매출)&apos;</strong>에 즉시 반영됩니다.
                  </p>
                  <p className="text-blue-300/80 text-[11px]">
                    👉 아침에 매점을 열 때는 준비금을 맞춘 뒤 <strong>[시작 준비금 등록/저장]</strong>만 누르면 바로 영업을 개시할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* Section 1: Sales Performance Dashboard */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-surface-dim mb-3 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-secondary" />
                  <span>1. 당일 영업 매출 실적 집계</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Total Revenue */}
                  <div className="bg-[#121c38] border border-secondary/30 rounded-2xl p-4">
                    <span className="text-xs text-surface-dim block mb-1">총 매출 합계</span>
                    <span className="text-xl sm:text-2xl font-black text-white font-mono">
                      {totalSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                    <span className="text-[11px] text-secondary-fixed block mt-1">
                      결제 {activeOrders.length}건
                    </span>
                  </div>

                  {/* Transfer Sales */}
                  <div className="bg-[#121c38] border border-indigo-500/20 rounded-2xl p-4">
                    <span className="text-xs text-indigo-300 block mb-1">계좌이체 매출</span>
                    <span className="text-xl sm:text-2xl font-black text-indigo-200 font-mono">
                      {transferSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                    <span className="text-[11px] text-surface-dim block mt-1">
                      {activeOrders.filter(o => o.paymentMethod === 'TRANSFER').length}건 완료
                    </span>
                  </div>

                  {/* Cash Sales */}
                  <div className="bg-[#121c38] border border-emerald-500/20 rounded-2xl p-4">
                    <span className="text-xs text-emerald-300 block mb-1">현금 매출</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-200 font-mono">
                      {cashSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                    <span className="text-[11px] text-surface-dim block mt-1">
                      {activeOrders.filter(o => o.paymentMethod === 'CASH').length}건 완료
                    </span>
                  </div>

                  {/* Cancelled */}
                  <div className="bg-[#121c38] border border-red-500/20 rounded-2xl p-4">
                    <span className="text-xs text-red-300 block mb-1">취소 및 환불</span>
                    <span className="text-xl sm:text-2xl font-black text-red-300 font-mono">
                      {cancelledOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                    <span className="text-[11px] text-red-400/80 block mt-1">
                      {cancelledOrders.length}건 취소됨
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Cash Drawer Reconciliation (금고 시재금 대조) */}
              <div className="bg-[#090e1c] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center space-x-2">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>2. 금고 현금 시재금 정산 및 대조</span>
                    </h3>
                    <p className="text-xs text-surface-dim mt-0.5">
                      시작 준비금과 오늘 발생한 현금 매출의 합산액을 실제 금고 현금과 대조합니다.
                    </p>
                  </div>

                  {/* Initial Preparation Cash Setting Box with Direct Buttons */}
                  <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
                    <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
                      <div className="flex flex-col text-left sm:text-right">
                        <label htmlFor="input-initial-cash" className="text-xs text-white font-bold cursor-pointer">
                          시작 준비금 설정:
                        </label>
                        <span className="text-[10px] text-secondary">거스름돈용 기초 현금</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <div className="relative">
                          <input
                            id="input-initial-cash"
                            type="number"
                            min="0"
                            step="1000"
                            value={initialCash === 0 ? '' : initialCash}
                            placeholder="0"
                            onChange={e => setInitialCash(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-28 bg-black/70 border border-secondary/50 rounded-xl px-2.5 py-1 text-xs text-right font-mono font-bold text-white outline-none focus:border-secondary focus:ring-1 focus:ring-secondary cursor-text"
                          />
                          <span className="text-xs text-surface-dim absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            원
                          </span>
                        </div>
                        <button
                          type="button"
                          id="btn-save-initial-cash"
                          onClick={handleSaveInitialCashOnly}
                          title="시작 준비금만 즉시 저장"
                          className="px-2.5 py-1 rounded-xl bg-secondary/20 hover:bg-secondary text-secondary hover:text-white border border-secondary/40 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shrink-0"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>저장</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expected vs Actual Highlight */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Expected in Drawer */}
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-surface-dim font-bold">장부상 금고 현금</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        자동 계산
                      </span>
                    </div>
                    <div className="text-lg font-black font-mono text-white">
                      {expectedCashInDrawer.toLocaleString()}원
                    </div>
                    <div className="text-[11px] text-blue-300/80 mt-1 flex items-center space-x-1">
                      <span>준비금({initialCash.toLocaleString()})</span>
                      <span>+</span>
                      <span>현금매출({cashSales.toLocaleString()})</span>
                    </div>
                  </div>

                  {/* Counted Cash in Drawer */}
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-surface-dim font-bold">실측된 금고 현금</span>
                      <button
                        type="button"
                        id="btn-toggle-input-mode"
                        onClick={() => setUseDirectInput(!useDirectInput)}
                        className="text-[10px] text-secondary hover:underline cursor-pointer"
                      >
                        {useDirectInput ? '권종별 계산기로 전환' : '직접 금액 입력으로 전환'}
                      </button>
                    </div>
                    <div className="text-lg font-black font-mono text-emerald-400">
                      {countedCash.toLocaleString()}원
                    </div>
                    <div className="text-[11px] text-surface-dim mt-1">
                      {useDirectInput ? '직접 타이핑 입력 중' : '아래 권종별 수량 합산'}
                    </div>
                  </div>

                  {/* Discrepancy (과부족) */}
                  <div
                    className={`p-3.5 rounded-xl border ${
                      discrepancy === 0
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : discrepancy > 0
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <span className="text-xs block mb-1 font-bold">시재 과부족 (오차)</span>
                    <div className="text-lg font-black font-mono">
                      {discrepancy === 0
                        ? '0원 (정상 일치)'
                        : `${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString()}원`}
                    </div>
                    <div className="text-[11px] font-medium mt-1">
                      {discrepancy === 0
                        ? '장부와 실측 현금이 완벽히 일치합니다.'
                        : discrepancy > 0
                        ? '장부보다 현금이 많습니다 (과잉).'
                        : '장부보다 현금이 부족합니다 (확인 필요).'}
                    </div>
                  </div>
                </div>

                {/* Denomination Counter Grid */}
                {!useDirectInput ? (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-surface-dim flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Coins className="w-3.5 h-3.5 text-secondary" />
                        <span>권종별 지폐 및 동전 수량 입력 (실측 계산기)</span>
                      </span>
                      <span className="text-[11px] text-surface-dim font-normal">
                        금고의 돈을 세어 장수를 입력하면 실측 현금이 자동 계산됩니다.
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                      {[
                        { denom: 50000, label: '5만원', type: '지폐' },
                        { denom: 10000, label: '1만원', type: '지폐' },
                        { denom: 5000, label: '5천원', type: '지폐' },
                        { denom: 1000, label: '1천원', type: '지폐' },
                        { denom: 500, label: '500원', type: '동전' },
                        { denom: 100, label: '100원', type: '동전' },
                      ].map(({ denom, label, type }) => {
                        const count = counts[denom] || 0;
                        const subtotal = denom * count;

                        return (
                          <div key={denom} className="bg-black/30 border border-white/10 p-2 rounded-xl">
                            <div className="font-bold text-white/80 mb-1 flex justify-between items-center">
                              <span className="text-white font-bold">{label}</span>
                              <span className="text-[9px] text-surface-dim px-1 py-0.2 bg-white/5 rounded">{type}</span>
                            </div>

                            <div className="flex items-center space-x-1 mb-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickAdd(denom, -1)}
                                className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center font-bold text-sm sm:text-xs cursor-pointer shrink-0"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={count}
                                onChange={e => handleCountChange(denom, e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-1 text-center text-xs font-bold text-white outline-none focus:border-secondary"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuickAdd(denom, 1)}
                                className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center font-bold text-sm sm:text-xs cursor-pointer shrink-0"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-[10px] text-right font-mono text-emerald-400/90 truncate">
                              {subtotal.toLocaleString()}원
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <label className="text-xs font-bold text-surface-dim block mb-1">
                      실제 세어본 금고 총 현금 (원):
                    </label>
                    <input
                      type="text"
                      id="input-direct-cash"
                      value={directCashInput}
                      onChange={e => setDirectCashInput(e.target.value)}
                      placeholder="예: 73000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white outline-none focus:border-secondary"
                    />
                  </div>
                )}
              </div>

              {/* Section 3: Closing Notes */}
              <div>
                <label htmlFor="input-closing-note" className="text-xs font-bold text-surface-dim block mb-1.5">
                  3. 마감 특이사항 / 업무 인수인계 메모 (선택사항)
                </label>
                <textarea
                  id="input-closing-note"
                  value={closingNote}
                  onChange={e => setClosingNote(e.target.value)}
                  placeholder="예: 거스름돈 1,000원권 10장 교환함, 음료수 재고 1박스 입고 확인 등"
                  rows={2}
                  className="w-full bg-[#090e1c] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder:text-surface-dim/50 outline-none focus:border-secondary resize-none"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3.5 sm:p-5 border-t border-white/10 bg-[#090e1c] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <button
                  type="button"
                  id="btn-copy-settlement-report"
                  onClick={handleCopyReport}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors border border-white/10 cursor-pointer"
                >
                  {copiedReport ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">보고서 복사됨!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-surface-dim" />
                      <span>마감 보고서 복사</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-print-settlement-report"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors border border-white/10 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-surface-dim" />
                  <span>보고서 인쇄</span>
                </button>
              </div>

              <div className="grid grid-cols-3 sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="col-span-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  닫기
                </button>

                <button
                  type="button"
                  id="btn-finalize-settlement"
                  onClick={handleFinalize}
                  className="col-span-2 sm:flex-initial flex items-center justify-center space-x-2 py-2.5 px-4 sm:px-5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-black shadow-lg shadow-secondary/20 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="truncate">{isFinalized ? '마감 내역 재저장' : '일일 영업 마감 확정'}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HISTORICAL SETTLEMENTS (역대 마감 내역 조회 및 관리자 수정/삭제)     */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
            
            {/* Top Toolbar: Admin Auth Status & Search/Filter Controls */}
            <div className="bg-[#090e1c] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-secondary" />
                    <span>역대 마감 내역 검색 및 필터</span>
                  </span>
                  <span className="text-[11px] text-surface-dim">
                    (총 {historyList.length}건 중 {filteredHistoryList.length}건 표시)
                  </span>
                </div>

                {/* Admin Auth Pill */}
                <div className="flex items-center space-x-2">
                  {isAuthorizedAdmin ? (
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>관리자 인증됨 (수정·삭제 가능)</span>
                      {googleUser && (
                        <button
                          type="button"
                          onClick={handleGoogleLogout}
                          title="로그아웃"
                          className="ml-1 text-surface-dim hover:text-white cursor-pointer"
                        >
                          <LogOut className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5 text-secondary" />
                      <span>{isLoggingIn ? '로그인 중...' : '관리자 구글 로그인'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Search Inputs: Date Picker & Text Search */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Specific Date Picker */}
                <div className="sm:col-span-4 relative">
                  <label htmlFor="input-search-date" className="sr-only">일자 검색</label>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-dim">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-search-date"
                    type="date"
                    value={searchDate}
                    onChange={e => setSearchDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-secondary font-mono"
                  />
                </div>

                {/* Text Keyword Search */}
                <div className="sm:col-span-5 relative">
                  <label htmlFor="input-search-query" className="sr-only">키워드 검색</label>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-dim">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-search-query"
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="날짜(2026-09), 담당자, 메모 등 검색..."
                    className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-secondary placeholder:text-surface-dim/60"
                  />
                </div>

                {/* Clear Filter Button */}
                {(searchDate || searchQuery || filterStatus !== 'ALL') && (
                  <div className="sm:col-span-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchDate('');
                        setSearchQuery('');
                        setFilterStatus('ALL');
                      }}
                      className="w-full flex items-center justify-center space-x-1 py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold border border-white/10 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>필터 초기화</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-[11px] text-surface-dim mr-1">분류:</span>
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterStatus === tab.id
                        ? 'bg-secondary text-white shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white'
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
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryItem(null)}
                    className="flex items-center space-x-1.5 text-xs text-secondary hover:underline cursor-pointer font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>마감 목록으로 돌아가기</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {/* Admin Edit / Delete Actions */}
                    {isAuthorizedAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(selectedHistoryItem)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>정산 수정</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettlementToDelete(selectedHistoryItem)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>삭제</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyHistoryReport(selectedHistoryItem)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 transition-colors cursor-pointer"
                    >
                      {copiedHistoryReport ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-surface-dim" />
                          <span>보고서 텍스트 복사</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-surface-dim" />
                      <span>인쇄</span>
                    </button>
                  </div>
                </div>

                {/* Printable Terminal Style Report Card */}
                <div className="bg-[#090e1c] border border-white/10 rounded-2xl p-5 sm:p-6 max-w-2xl mx-auto font-mono text-xs space-y-4 shadow-xl">
                  <div className="text-center border-b border-white/10 pb-4">
                    <div className="text-base font-black text-white font-sans tracking-wide">
                      한국철도고등학교 학생회 매점
                    </div>
                    <div className="text-secondary font-bold text-xs mt-0.5">
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

                  <div className="border-t border-dashed border-white/15 pt-3 space-y-2">
                    <div className="text-xs font-bold text-secondary font-sans flex items-center space-x-1">
                      <span>[매출 실적]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">· 계좌이체 매출</span>
                      <span className="text-white">{(selectedHistoryItem.transferSales || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">· 현금 매출</span>
                      <span className="text-white">{(selectedHistoryItem.cashSales || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-white/10">
                      <span>총 매출 합계</span>
                      <span className="text-secondary">{(selectedHistoryItem.totalSales || 0).toLocaleString()}원</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-white/15 pt-3 space-y-2">
                    <div className="text-xs font-bold text-emerald-400 font-sans flex items-center space-x-1">
                      <span>[금고 시재금 정산]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">· 시작 준비금</span>
                      <span>{(selectedHistoryItem.initialCash || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">· 장부상 현금 (준비금+현금매출)</span>
                      <span>{((selectedHistoryItem.initialCash || 0) + (selectedHistoryItem.cashSales || 0)).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-dim">· 실측된 금고 현금</span>
                      <span className="text-emerald-400 font-bold">{(selectedHistoryItem.actualCashInput || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-1 border-t border-white/10">
                      <span>시재 과부족 (오차)</span>
                      <span className={
                        (selectedHistoryItem.discrepancy || 0) === 0
                          ? 'text-emerald-400'
                          : (selectedHistoryItem.discrepancy || 0) > 0
                          ? 'text-blue-400'
                          : 'text-red-400'
                      }>
                        {(selectedHistoryItem.discrepancy || 0) === 0
                          ? '0원 (정상 일치)'
                          : `${(selectedHistoryItem.discrepancy || 0) > 0 ? '+' : ''}${(selectedHistoryItem.discrepancy || 0).toLocaleString()}원`}
                      </span>
                    </div>
                  </div>

                  {selectedHistoryItem.note && (
                    <div className="border-t border-dashed border-white/15 pt-3">
                      <div className="text-[11px] text-surface-dim mb-1">특이사항 메모:</div>
                      <div className="p-2.5 rounded-xl bg-white/5 text-white/90 text-xs">
                        {selectedHistoryItem.note}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* History List Overview */
              <div className="space-y-4">
                {/* Aggregate KPI Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#121c38] border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[11px] text-surface-dim block mb-1">누적 마감 일수</span>
                    <span className="text-lg sm:text-xl font-black text-white font-mono">
                      {historyStats.totalCount}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">일</span>
                    </span>
                  </div>
                  <div className="bg-[#121c38] border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[11px] text-surface-dim block mb-1">누적 정산 총 매출</span>
                    <span className="text-lg sm:text-xl font-black text-secondary font-mono">
                      {historyStats.grandTotalSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                  </div>
                  <div className="bg-[#121c38] border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[11px] text-surface-dim block mb-1">누적 현금 정산액</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                      {historyStats.grandCashSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                  </div>
                  <div className="bg-[#121c38] border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[11px] text-surface-dim block mb-1">누적 계좌이체액</span>
                    <span className="text-lg sm:text-xl font-black text-indigo-300 font-mono">
                      {historyStats.grandTransferSales.toLocaleString()}
                      <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                    </span>
                  </div>
                </div>

                {/* Settlements List */}
                {filteredHistoryList.length === 0 ? (
                  <div className="py-12 text-center bg-[#090e1c] border border-white/10 rounded-2xl space-y-2">
                    <History className="w-10 h-10 text-surface-dim mx-auto opacity-50" />
                    <h4 className="text-sm font-bold text-white">일치하는 마감 정산 내역이 없습니다.</h4>
                    <p className="text-xs text-surface-dim max-w-sm mx-auto">
                      {historyList.length === 0
                        ? "영업 종료 후 [당일 마감 정산] 탭에서 '일일 영업 마감 확정'을 누르면 일자별로 영구 저장됩니다."
                        : "검색 조건이나 일자 필터를 변경해 보세요."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-surface-dim flex items-center justify-between px-1">
                      <span>역대 마감 정산 일지 ({filteredHistoryList.length}건)</span>
                      <span className="text-[11px] font-normal">항목을 클릭하면 상세 영수증을 확인하고 수정·삭제할 수 있습니다.</span>
                    </div>

                    <div className="space-y-2">
                      {filteredHistoryList.map(item => {
                        const expected = (item.initialCash || 0) + (item.cashSales || 0);
                        const discrepancyVal = typeof item.discrepancy === 'number' 
                          ? item.discrepancy 
                          : ((item.actualCashInput || 0) - expected);

                        return (
                          <div
                            key={item.id}
                            className="bg-[#090e1c] hover:bg-[#121c38] border border-white/10 hover:border-secondary/40 rounded-2xl p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                          >
                            <div 
                              onClick={() => setSelectedHistoryItem(item)}
                              className="flex items-start space-x-3 min-w-0 cursor-pointer flex-1"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-surface-dim group-hover:text-secondary group-hover:border-secondary/30 transition-colors shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <span className="text-sm font-black text-white font-mono">{item.id}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-surface-dim">
                                    담당: {item.closedBy || item.openedBy || '담당자'}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    discrepancyVal === 0
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : discrepancyVal > 0
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  }`}>
                                    {discrepancyVal === 0 ? '시재 일치' : discrepancyVal > 0 ? `+${discrepancyVal.toLocaleString()}원 과잉` : `${discrepancyVal.toLocaleString()}원 부족`}
                                  </span>
                                </div>
                                <div className="text-xs text-surface-dim mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                  <span>준비금: {(item.initialCash || 0).toLocaleString()}원</span>
                                  <span>실측현금: {(item.actualCashInput || 0).toLocaleString()}원</span>
                                  {item.note && <span className="text-white/70 truncate max-w-[220px]">메모: {item.note}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Actions & Total */}
                            <div className="flex items-center space-x-3 self-end sm:self-center shrink-0">
                              <div className="text-right">
                                <div className="text-[11px] text-surface-dim">정산 총 매출</div>
                                <div className="text-base font-black text-white font-mono">
                                  {(item.totalSales || 0).toLocaleString()}원
                                </div>
                              </div>

                              {/* Admin Inline Edit/Delete shortcuts */}
                              {isAuthorizedAdmin && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleStartEdit(item);
                                    }}
                                    title="마감 정산 수정"
                                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition-all cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setSettlementToDelete(item);
                                    }}
                                    title="마감 정산 삭제"
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedHistoryItem(item)}
                                className="p-2 rounded-xl bg-white/5 text-surface-dim group-hover:text-white group-hover:translate-x-0.5 transition-all cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
            <div className="bg-[#0e172e] border border-blue-500/40 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      마감 정산 내역 수정 ({editingSettlement.id})
                    </h3>
                    <p className="text-[11px] text-surface-dim">
                      관리자 권한으로 준비금, 실측 시재, 메모를 직접 정정합니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSettlement(null)}
                  className="p-1.5 rounded-lg bg-white/5 text-surface-dim hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Initial Cash */}
                <div>
                  <label className="block text-surface-dim font-bold mb-1">
                    시작 준비금 (원):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editInitialCash}
                    onChange={e => setEditInitialCash(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-blue-400"
                  />
                </div>

                {/* Actual Counted Cash */}
                <div>
                  <label className="block text-surface-dim font-bold mb-1">
                    실측된 금고 현금 (원):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editActualCash}
                    onChange={e => setEditActualCash(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold outline-none focus:border-blue-400"
                  />
                </div>

                {/* Real-time Recalculated Discrepancy Preview */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex justify-between text-surface-dim">
                    <span>장부상 현금: (준비금 {editInitialCash.toLocaleString()}원 + 현금매출 {(editingSettlement.cashSales || 0).toLocaleString()}원)</span>
                    <span className="font-mono text-white">{(editInitialCash + (editingSettlement.cashSales || 0)).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>재계산된 시재 과부족:</span>
                    <span className={
                      (editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))) === 0
                        ? 'text-emerald-400'
                        : (editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))) > 0
                        ? 'text-blue-400'
                        : 'text-red-400'
                    }>
                      {(editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))) === 0
                        ? '0원 (일치)'
                        : `${(editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))) > 0 ? '+' : ''}${(editActualCash - (editInitialCash + (editingSettlement.cashSales || 0))).toLocaleString()}원`}
                    </span>
                  </div>
                </div>

                {/* Closed By & Status */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-surface-dim font-bold mb-1">
                      마감 담당자:
                    </label>
                    <input
                      type="text"
                      value={editClosedBy}
                      onChange={e => setEditClosedBy(e.target.value)}
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-surface-dim font-bold mb-1">
                      마감 상태:
                    </label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as any)}
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white outline-none focus:border-blue-400"
                    >
                      <option value="CLOSED">CLOSED (마감 완료)</option>
                      <option value="OPEN">OPEN (영업 중)</option>
                    </select>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-surface-dim font-bold mb-1">
                    특이사항 메모:
                  </label>
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    rows={2}
                    className="w-full bg-black/50 border border-white/15 rounded-xl p-2.5 text-white outline-none focus:border-blue-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingSettlement(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-600/20 flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>수정 사항 저장</span>
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
            <div className="bg-[#0e172e] border border-red-500/40 rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">마감 정산 내역 삭제 확인</h3>
                  <p className="text-xs text-red-300/80">경고: 이 작업은 되돌릴 수 없습니다.</p>
                </div>
              </div>

              <p className="text-xs text-surface-dim leading-relaxed">
                정말로 <span className="font-mono font-bold text-white">[{settlementToDelete.id}]</span> 일자의 
                마감 정산 보고서를 완전히 삭제하시겠습니까? 삭제 내역은 POS 감사 로그에 영구 기록됩니다.
              </p>

              <div className="p-3 rounded-xl bg-white/5 text-xs font-mono text-white/80 space-y-0.5">
                <div>· 일자: {settlementToDelete.id}</div>
                <div>· 총 매출: {(settlementToDelete.totalSales || 0).toLocaleString()}원</div>
                <div>· 담당자: {settlementToDelete.closedBy || settlementToDelete.openedBy || '-'}</div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSettlementToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-600/20 flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? '삭제 중...' : '영구 삭제'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
