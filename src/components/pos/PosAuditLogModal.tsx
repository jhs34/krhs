import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  RefreshCw,
  Trash2,
  Calendar,
  User,
  ShoppingBag,
  Package,
  Calculator,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogOut,
} from 'lucide-react';
import { PosAuditLog, PosLogCategory, PosUser } from '../../types/pos';
import { deletePosLog, clearAllPosLogs } from '../../services/posFirestore';
import { loginWithGoogle, logout as firebaseLogout, auth } from '../../firebase';
import { createGoogleAdminPosUser } from '../../services/posAuth';
import { PosAuditLogDetailView } from './PosAuditLogDetailView';

interface PosAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: PosAuditLog[];
  isAdmin: boolean;
  actorName: string;
  onGoogleAdminLogin?: (user: PosUser) => void;
  onGoogleAdminLogout?: () => void;
}

export const PosAuditLogModal: React.FC<PosAuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  isAdmin: propIsAdmin,
  actorName,
  onGoogleAdminLogin,
  onGoogleAdminLogout,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PosLogCategory | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('TODAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [logToDelete, setLogToDelete] = useState<PosAuditLog | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [localIsAdmin, setLocalIsAdmin] = useState(false);

  const effectiveIsAdmin = propIsAdmin || localIsAdmin;

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleGoogleAdminLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const googleUser = await loginWithGoogle();
      if (googleUser && googleUser.email) {
        const adminUser = createGoogleAdminPosUser(
          googleUser.email,
          googleUser.displayName,
          googleUser.uid
        );
        setLocalIsAdmin(true);
        if (onGoogleAdminLogin) {
          onGoogleAdminLogin(adminUser);
        }
        setToastMessage({
          type: 'success',
          text: `포털 관리자 계정(${googleUser.email})으로 로그인되었습니다.`,
        });
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setToastMessage({
        type: 'error',
        text: err?.message || '구글 관리자 로그인에 실패했습니다.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleAdminLogout = async () => {
    try {
      await firebaseLogout();
      setLocalIsAdmin(false);
      if (onGoogleAdminLogout) {
        onGoogleAdminLogout();
      }
      setToastMessage({
        type: 'info',
        text: '구글 관리자 계정에서 로그아웃되었습니다.',
      });
    } catch (err: any) {
      console.error('Logout error', err);
    }
  };

  // Helper to extract local date string (YYYY-MM-DD) from timestamp
  const getLocalDateStr = (timestampStr: string): string => {
    try {
      const d = new Date(timestampStr);
      if (isNaN(d.getTime())) return timestampStr.slice(0, 10);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return timestampStr.slice(0, 10);
    }
  };

  // Date counts for tabs
  const dateCounts = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let todayCount = 0;
    let weekCount = 0;

    logs.forEach(log => {
      const localDate = getLocalDateStr(log.timestamp);
      if (localDate === todayStr || log.sessionId === todayStr || log.timestamp.slice(0, 10) === todayStr) {
        todayCount++;
      }
      try {
        const d = new Date(log.timestamp);
        if (!isNaN(d.getTime()) && d >= sevenDaysAgo) {
          weekCount++;
        }
      } catch {}
    });

    return { today: todayCount, week: weekCount, all: logs.length };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return logs.filter(log => {
      // Category filter
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }

      // Date filter
      if (dateFilter === 'TODAY') {
        const localDate = getLocalDateStr(log.timestamp);
        const isToday =
          localDate === todayStr ||
          log.sessionId === todayStr ||
          log.timestamp.slice(0, 10) === todayStr;
        if (!isToday) {
          return false;
        }
      } else if (dateFilter === 'WEEK') {
        try {
          const logDate = new Date(log.timestamp);
          if (!isNaN(logDate.getTime()) && logDate < sevenDaysAgo) {
            return false;
          }
        } catch {}
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inDetails = log.details.toLowerCase().includes(q);
        const inActor = log.actorName.toLowerCase().includes(q);
        const inTitle = log.actionTitle.toLowerCase().includes(q);
        const inAction = log.action.toLowerCase().includes(q);
        const inMeta = log.metadata ? JSON.stringify(log.metadata).toLowerCase().includes(q) : false;
        return inDetails || inActor || inTitle || inAction || inMeta;
      }

      return true;
    });
  }, [logs, selectedCategory, dateFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const saleCount = logs.filter(l => l.category === 'SALE').length;
    const inventoryCount = logs.filter(l => l.category === 'INVENTORY').length;
    const settlementCount = logs.filter(l => l.category === 'SETTLEMENT').length;
    const systemCount = logs.filter(l => l.category === 'SYSTEM').length;
    const authCount = logs.filter(l => l.category === 'AUTH').length;
    return { total, saleCount, inventoryCount, settlementCount, systemCount, authCount };
  }, [logs]);

  const handleExecuteDeleteSingle = async () => {
    if (!logToDelete) return;
    setIsProcessing(true);
    try {
      await deletePosLog(logToDelete.id);
      const title = logToDelete.actionTitle;
      setLogToDelete(null);
      setToastMessage({ type: 'success', text: `'${title}' 로그가 정상적으로 삭제되었습니다.` });
    } catch (e) {
      setToastMessage({ type: 'error', text: '로그 삭제 실패: ' + (e as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteClearAll = async () => {
    setIsProcessing(true);
    const count = logs.length;
    try {
      await clearAllPosLogs(logs);
      setShowClearConfirmModal(false);
      setToastMessage({ type: 'success', text: `감사 로그 총 ${count}건을 모두 비웠습니다.` });
    } catch (e) {
      setToastMessage({ type: 'error', text: '로그 전체 삭제 실패: ' + (e as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const getCategoryBadge = (category: PosLogCategory) => {
    switch (category) {
      case 'SALE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShoppingBag className="w-3 h-3" /> 판매·결제
          </span>
        );
      case 'INVENTORY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Package className="w-3 h-3" /> 재고·품목
          </span>
        );
      case 'SETTLEMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Calculator className="w-3 h-3" /> 정산·마감
          </span>
        );
      case 'SYSTEM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Settings className="w-3 h-3" /> 시스템 설정
          </span>
        );
      case 'AUTH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <User className="w-3 h-3" /> 계정·인증
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            일반
          </span>
        );
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CANCEL') || action.includes('DELETE')) {
      return 'border-l-4 border-l-rose-500 bg-rose-50/40 hover:bg-rose-50/70';
    }
    if (action === 'ORDER_CREATED') {
      return 'border-l-4 border-l-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60';
    }
    if (action.includes('SETTLEMENT')) {
      return 'border-l-4 border-l-purple-500 bg-purple-50/30 hover:bg-purple-50/60';
    }
    if (action.includes('ITEM') || action.includes('CATEGORY')) {
      return 'border-l-4 border-l-blue-500 bg-blue-50/30 hover:bg-blue-50/60';
    }
    return 'border-l-4 border-l-slate-400 bg-white hover:bg-slate-50';
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    } catch {
      return iso;
    }
  };

  return (
    <div id="pos-audit-log-modal" className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="flex flex-col w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] bg-white rounded-none sm:rounded-2xl shadow-2xl overflow-hidden border-0 sm:border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">POS 감사 및 활동 로그</h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-600/50 shrink-0">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
                  실시간 기록 중
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
                결제 승인, 결제 취소, 품목/재고 변동, 정산 마감, 시스템 설정 등 모든 POS 변경 이력을 투명하게 기록합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {effectiveIsAdmin ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>구글 관리자</span>
                </div>
                {onGoogleAdminLogout && (
                  <button
                    type="button"
                    onClick={handleGoogleAdminLogout}
                    className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-medium border border-red-500/30 transition-colors cursor-pointer"
                    title="관리자 로그아웃"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">로그아웃</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleAdminLogin}
                disabled={isGoogleLoading}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                title="구글 계정(jhs34.kr@gmail.com)으로 관리자 로그인"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#ffffff"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>구글 관리자 로그인</span>
              </button>
            )}

            <button
              id="btn-close-audit-log"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Compact Single-Row Stats Strip */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 px-3 sm:px-6 py-2 bg-slate-100/90 border-b border-slate-200 text-xs shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center divide-x divide-slate-200 bg-white border border-slate-200 rounded-lg shadow-2xs w-full py-1 px-1.5 justify-around text-center">
            <div className="flex-1 px-1.5 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">전체</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">{stats.total}</span>
            </div>
            <div className="flex-1 px-1.5 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span className="text-[10px] sm:text-xs text-emerald-700 font-medium">판매/결제</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono">{stats.saleCount}</span>
            </div>
            <div className="flex-1 px-1.5 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span className="text-[10px] sm:text-xs text-blue-700 font-medium">재고/품목</span>
              <span className="text-xs sm:text-sm font-bold text-blue-700 font-mono">{stats.inventoryCount}</span>
            </div>
            <div className="flex-1 px-1.5 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span className="text-[10px] sm:text-xs text-purple-700 font-medium">정산/마감</span>
              <span className="text-xs sm:text-sm font-bold text-purple-700 font-mono">{stats.settlementCount}</span>
            </div>
            <div className="flex-1 px-1.5 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span className="text-[10px] sm:text-xs text-amber-700 font-medium">시스템 설정</span>
              <span className="text-xs sm:text-sm font-bold text-amber-700 font-mono">{stats.systemCount}</span>
            </div>
            <div className="flex-1 px-1.5 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span className="text-[10px] sm:text-xs text-slate-700 font-medium">계정/인증</span>
              <span className="text-xs sm:text-sm font-bold text-slate-700 font-mono">{stats.authCount}</span>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col gap-2.5 sm:gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex overflow-x-auto pb-1 sm:pb-0 items-center gap-1.5 text-xs no-scrollbar">
            {[
              { id: 'ALL', label: '전체' },
              { id: 'SALE', label: '판매/결제' },
              { id: 'INVENTORY', label: '재고/품목' },
              { id: 'SETTLEMENT', label: '정산/마감' },
              { id: 'SYSTEM', label: '시스템 설정' },
              { id: 'AUTH', label: '계정/인증' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Date filter & Search input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium text-slate-600 shrink-0">
                <button
                  type="button"
                  onClick={() => setDateFilter('TODAY')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    dateFilter === 'TODAY' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  오늘 ({dateCounts.today})
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('WEEK')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    dateFilter === 'WEEK' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  최근 7일 ({dateCounts.week})
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    dateFilter === 'ALL' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  전체 ({dateCounts.all})
                </button>
              </div>

              <span className="text-xs text-slate-500 shrink-0">
                표시: <strong className="text-slate-900 font-mono">{filteredLogs.length}</strong>건
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="담당자, 품목명, 상세 내용 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {effectiveIsAdmin && logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(true)}
                  disabled={isProcessing}
                  title="관리자 전용: 감사 로그 전체 삭제"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">로그 비우기</span>
                  <span className="sm:hidden">비우기</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Log List View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center px-4">
              <AlertCircle className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                {dateFilter === 'TODAY' ? '오늘 기록된 감사 로그가 없습니다.' : '조건에 부합하는 감사 로그가 없습니다.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {logs.length > 0
                  ? `전체 ${logs.length}건의 로그가 데이터베이스에 보관되어 있습니다.`
                  : '포스기에서 결제, 상품/재고 수정, 로그인 등의 활동 시 실시간으로 안전하게 기록됩니다.'}
              </p>
              {logs.length > 0 && dateFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('ALL');
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  전체 로그 ({logs.length}건) 보기
                </button>
              )}
            </div>
          ) : (
            filteredLogs.map(log => {
              const isExpanded = expandedLogId === log.id;
              const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

              return (
                <div
                  key={log.id}
                  id={`log-item-${log.id}`}
                  className={`rounded-xl border border-slate-200/90 shadow-xs transition-all overflow-hidden ${getActionColor(
                    log.action
                  )}`}
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none"
                  >
                    {/* Left Details */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="pt-0.5 shrink-0">{getCategoryBadge(log.category)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{log.actionTitle}</span>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium mt-0.5 break-words">
                          {log.details}
                        </p>
                      </div>
                    </div>

                    {/* Right Meta & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                      <div className="flex items-center gap-1 text-xs text-slate-600 bg-white/80 px-2 py-1 rounded-md border border-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{log.actorName}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title={isExpanded ? '상세 정보 닫기' : '언제/누가/어떤 카테고리/활동/세부 내역 펼치기'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {effectiveIsAdmin && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setLogToDelete(log);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="로그 삭제 (관리자)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Structured 5-W Audit Report Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <PosAuditLogDetailView log={log} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-4 py-3 sm:px-6 sm:py-3.5 bg-white border-t border-slate-200 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
            실시간으로 기록된 로그는 Firestore에 안전하게 보존되며 인사이동 및 회계 감사 시 활용됩니다.
          </div>
          <button
            id="btn-audit-log-done"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] rounded-xl transition-all shadow-xs cursor-pointer text-center"
          >
            닫기
          </button>
        </div>

        {/* In-app Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`absolute top-4 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold pointer-events-auto backdrop-blur-md ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/40 shadow-emerald-950/50'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-950/95 text-rose-200 border-rose-500/40 shadow-rose-950/50'
                  : 'bg-slate-900/95 text-slate-200 border-slate-700 shadow-slate-950/50'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="ml-2 text-white/50 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear All Logs Custom Confirmation Modal */}
        <AnimatePresence>
          {showClearConfirmModal && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
              onClick={() => !isProcessing && setShowClearConfirmModal(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}
                className="bg-[#0e1628] border border-rose-500/30 text-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4 shadow-inner">
                  <AlertTriangle className="w-7 h-7" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  감사 로그를 모두 비우시겠습니까?
                </h3>

                <div className="bg-rose-950/40 border border-rose-500/20 rounded-2xl p-4 mb-5 w-full text-left">
                  <p className="text-xs text-rose-200 leading-relaxed font-medium">
                    ⚠️ 현재 저장된 모든 감사 로그 <strong className="text-white underline decoration-rose-400 decoration-2 font-bold">{logs.length}건</strong>이 데이터베이스에서 영구 삭제됩니다.
                  </p>
                  <p className="text-[11px] text-rose-300/80 mt-1.5 leading-normal">
                    이 작업은 되돌릴 수 없으며 복구되지 않습니다. 마감 증빙 및 판매 내역 감사 기록이 모두 삭제됩니다.
                  </p>
                </div>

                <div className="flex w-full space-x-3">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setShowClearConfirmModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-xs md:text-sm bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleExecuteClearAll}
                    className="flex-1 py-3 rounded-xl font-bold text-xs md:text-sm bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center space-x-2 shadow-lg shadow-rose-950/50 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>삭제 처리 중...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>로그 전체 삭제</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Single Log Delete Custom Confirmation Modal */}
        <AnimatePresence>
          {logToDelete && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
              onClick={() => !isProcessing && setLogToDelete(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={e => e.stopPropagation()}
                className="bg-[#0e1628] border border-white/20 text-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
                  <Trash2 className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-white mb-1.5">
                  로그 항목을 삭제하시겠습니까?
                </h3>

                <p className="text-xs text-surface-dim mb-4">
                  선택한 감사 기록 1건이 데이터베이스에서 삭제됩니다.
                </p>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-5 w-full text-left">
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span>{logToDelete.actionTitle}</span>
                    <span className="text-[11px] font-mono text-slate-400 font-normal">
                      {formatDateTime(logToDelete.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 break-words leading-relaxed">
                    {logToDelete.details}
                  </p>
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>작성자: {logToDelete.actorName}</span>
                    <span>분류: {logToDelete.category}</span>
                  </div>
                </div>

                <div className="flex w-full space-x-3">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setLogToDelete(null)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleExecuteDeleteSingle}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-950/40 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>삭제 중...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>삭제하기</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
