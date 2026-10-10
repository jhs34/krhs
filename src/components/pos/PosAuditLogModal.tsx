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
  LogIn,
  Ticket,
} from 'lucide-react';
import { PosAuditLog, PosLogCategory, PosUser } from '../../types/pos';
import { deletePosLog, clearAllPosLogs } from '../../services/posFirestore';
import { loginWithGoogle, logout as firebaseLogout, auth } from '../../firebase';
import { createGoogleAdminPosUser, POS_ACCOUNTS } from '../../services/posAuth';
import { PosAuditLogDetailView } from './PosAuditLogDetailView';

export function getLogOperatorId(log: PosAuditLog): string {
  if (log.actorUid) {
    if (log.actorUid.startsWith('pos-')) {
      const pin = log.actorUid.replace('pos-', '');
      const found = POS_ACCOUNTS.find(a => a.pin === pin);
      if (found) return found.id;
    }
    return log.actorUid;
  }
  if (log.actorId) return log.actorId;
  if (log.actorName) {
    const clean = log.actorName.replace(/\s*\(관리자\)\s*/g, '').trim();
    if (clean) return clean;
  }
  return '시스템';
}

interface PosAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: PosAuditLog[];
  isAdmin: boolean;
  actorName?: string;
  actorId?: string;
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
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);
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
        text: err?.message || '관리자 로그인에 실패했습니다.',
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
        text: '관리자 계정에서 로그아웃되었습니다.',
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

  // Date-scoped logs
  const dateScopedLogs = useMemo(() => {
    if (dateFilter === 'ALL') return logs;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return logs.filter(log => {
      const logLocalDate = getLocalDateStr(log.timestamp);
      if (dateFilter === 'TODAY') {
        return (
          logLocalDate === todayStr ||
          log.sessionId === todayStr ||
          log.timestamp.slice(0, 10) === todayStr
        );
      } else if (dateFilter === 'WEEK') {
        try {
          const logDate = new Date(log.timestamp);
          if (!isNaN(logDate.getTime()) && logDate < sevenDaysAgo) {
            return false;
          }
        } catch {
          return false;
        }
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate && customEndDate) {
          const start = customStartDate <= customEndDate ? customStartDate : customEndDate;
          const end = customStartDate <= customEndDate ? customEndDate : customStartDate;
          return logLocalDate >= start && logLocalDate <= end;
        } else if (customStartDate) {
          return logLocalDate >= customStartDate;
        } else if (customEndDate) {
          return logLocalDate <= customEndDate;
        }
      }
      return true;
    });
  }, [logs, dateFilter, customStartDate, customEndDate]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return dateScopedLogs.filter(log => {
      // Category filter
      if (selectedCategory === 'GIFTICON') {
        if (log.category !== 'GIFTICON') return false;
      } else if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inDetails = log.details.toLowerCase().includes(q);
        const operatorId = getLogOperatorId(log).toLowerCase();
        const inActor = operatorId.includes(q) || (log.actorName ? log.actorName.toLowerCase().includes(q) : false);
        const inTitle = log.actionTitle.toLowerCase().includes(q);
        const inAction = log.action.toLowerCase().includes(q);
        const inId = log.id.toLowerCase().includes(q);
        const inMeta = log.metadata ? JSON.stringify(log.metadata).toLowerCase().includes(q) : false;
        return inDetails || inActor || inTitle || inAction || inId || inMeta;
      }

      return true;
    });
  }, [dateScopedLogs, selectedCategory, searchQuery]);

  // Statistics (scoped to current dateFilter for live tab counters)
  const stats = useMemo(() => {
    const total = dateScopedLogs.length;
    const saleCount = dateScopedLogs.filter(l => l.category === 'SALE').length;
    const inventoryCount = dateScopedLogs.filter(l => l.category === 'INVENTORY').length;
    const settlementCount = dateScopedLogs.filter(l => l.category === 'SETTLEMENT').length;
    const gifticonCount = dateScopedLogs.filter(l => l.category === 'GIFTICON').length;
    const systemCount = dateScopedLogs.filter(l => l.category === 'SYSTEM').length;
    const authCount = dateScopedLogs.filter(l => l.category === 'AUTH').length;
    return { total, saleCount, inventoryCount, settlementCount, gifticonCount, systemCount, authCount };
  }, [dateScopedLogs]);

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
            <ShoppingBag className="w-3 h-3" /> 결제
          </span>
        );
      case 'INVENTORY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Package className="w-3 h-3" /> 재고
          </span>
        );
      case 'SETTLEMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Calculator className="w-3 h-3" /> 정산
          </span>
        );
      case 'GIFTICON':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Ticket className="w-3 h-3 text-amber-600" /> 기프티콘
          </span>
        );
      case 'SYSTEM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Settings className="w-3 h-3" /> 설정
          </span>
        );
      case 'AUTH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <User className="w-3 h-3" /> 계정
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            기타
          </span>
        );
    }
  };

  const getActionColor = (action: string) => {
    // Red: Cancellation, deletes, discrepancy
    if (
      action === 'PCC' ||
      action === 'PDL' ||
      action === 'IDL' ||
      action === 'CDL' ||
      action === 'PSD' ||
      action === 'GDL' ||
      action === 'SDL' ||
      action === 'SXX' ||
      action.includes('CANCEL') ||
      action.includes('DELETE') ||
      action.includes('DISCREPANCY')
    ) {
      return 'border-l-4 border-l-rose-500 bg-rose-50/40 hover:bg-rose-50/70';
    }
    // Green: Payment success, normal settlement
    if (
      action === 'PCA' ||
      action === 'PTR' ||
      action === 'PAY' ||
      action === 'SOO' ||
      action === 'ORDER_CREATED'
    ) {
      return 'border-l-4 border-l-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60';
    }
    // Purple: Settlement
    if (action.startsWith('S') || action.includes('SETTLEMENT')) {
      return 'border-l-4 border-l-purple-500 bg-purple-50/30 hover:bg-purple-50/60';
    }
    // Amber: Gifticons
    if (action.startsWith('G') || action.includes('GIFTICON')) {
      return 'border-l-4 border-l-amber-500 bg-amber-50/40 hover:bg-amber-50/70';
    }
    // Blue: Inventory & Category
    if (action.startsWith('I') || action.startsWith('C') || action.includes('ITEM') || action.includes('CATEGORY')) {
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
                  <span>관리자</span>
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
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>{isGoogleLoading ? '...' : '관리자 로그인'}</span>
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

        {/* Integrated Category Tabs & Counter Strip */}
        <div className="px-2.5 sm:px-6 py-2 bg-slate-100/90 border-b border-slate-200 text-xs shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs w-full justify-between gap-1 min-w-[340px] sm:min-w-0">
            {[
              {
                id: 'ALL' as const,
                label: '전체',
                count: stats.total,
                activeClass: 'bg-slate-900 text-white shadow-xs',
                badgeActiveClass: 'bg-white/20 text-white',
                inactiveClass: 'text-slate-700 hover:bg-slate-100',
                badgeInactiveClass: 'bg-slate-100 text-slate-800',
              },
              {
                id: 'SALE' as const,
                label: '결제',
                count: stats.saleCount,
                activeClass: 'bg-emerald-600 text-white shadow-xs',
                badgeActiveClass: 'bg-white/25 text-white',
                inactiveClass: 'text-emerald-700 hover:bg-emerald-50',
                badgeInactiveClass: 'bg-emerald-50 text-emerald-800',
              },
              {
                id: 'INVENTORY' as const,
                label: '재고',
                count: stats.inventoryCount,
                activeClass: 'bg-blue-600 text-white shadow-xs',
                badgeActiveClass: 'bg-white/25 text-white',
                inactiveClass: 'text-blue-700 hover:bg-blue-50',
                badgeInactiveClass: 'bg-blue-50 text-blue-800',
              },
              {
                id: 'SETTLEMENT' as const,
                label: '정산',
                count: stats.settlementCount,
                activeClass: 'bg-purple-600 text-white shadow-xs',
                badgeActiveClass: 'bg-white/25 text-white',
                inactiveClass: 'text-purple-700 hover:bg-purple-50',
                badgeInactiveClass: 'bg-purple-50 text-purple-800',
              },
              {
                id: 'GIFTICON' as const,
                label: '기프티콘',
                count: stats.gifticonCount,
                activeClass: 'bg-amber-600 text-white shadow-xs',
                badgeActiveClass: 'bg-white/25 text-white',
                inactiveClass: 'text-amber-800 hover:bg-amber-50',
                badgeInactiveClass: 'bg-amber-100 text-amber-900',
              },
              {
                id: 'SYSTEM' as const,
                label: '설정',
                count: stats.systemCount,
                activeClass: 'bg-amber-600 text-white shadow-xs',
                badgeActiveClass: 'bg-white/25 text-white',
                inactiveClass: 'text-amber-700 hover:bg-amber-50',
                badgeInactiveClass: 'bg-amber-50 text-amber-800',
              },
              {
                id: 'AUTH' as const,
                label: '계정',
                count: stats.authCount,
                activeClass: 'bg-slate-700 text-white shadow-xs',
                badgeActiveClass: 'bg-white/20 text-white',
                inactiveClass: 'text-slate-700 hover:bg-slate-100',
                badgeInactiveClass: 'bg-slate-100 text-slate-800',
              },
            ].map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-1 px-1 sm:px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap transition-all cursor-pointer text-center select-none ${
                    isSelected
                      ? `${cat.activeClass} font-bold`
                      : `${cat.inactiveClass} font-medium`
                  }`}
                >
                  <span className="text-[11px] sm:text-xs">{cat.label}</span>
                  <span
                    className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      isSelected ? cat.badgeActiveClass : cat.badgeInactiveClass
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="p-3 sm:px-6 sm:py-3 bg-white border-b border-slate-200 shrink-0">
          {/* Date filter & Search input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium text-slate-600 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter('TODAY');
                      setShowCustomDatePicker(false);
                    }}
                    className={`px-2 sm:px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      dateFilter === 'TODAY' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
                    }`}
                  >
                    오늘 ({dateCounts.today})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter('WEEK');
                      setShowCustomDatePicker(false);
                    }}
                    className={`px-2 sm:px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      dateFilter === 'WEEK' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
                    }`}
                  >
                    최근 7일 ({dateCounts.week})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter('ALL');
                      setShowCustomDatePicker(false);
                    }}
                    className={`px-2 sm:px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      dateFilter === 'ALL' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
                    }`}
                  >
                    전체 ({dateCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter('CUSTOM');
                      setShowCustomDatePicker(prev => !prev);
                      if (!customStartDate) {
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        setCustomStartDate(todayStr);
                        setCustomEndDate(todayStr);
                      }
                    }}
                    className={`px-2 sm:px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      dateFilter === 'CUSTOM'
                        ? 'bg-blue-600 shadow-xs text-white font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>
                      {dateFilter === 'CUSTOM' && customStartDate
                        ? customStartDate === customEndDate || !customEndDate
                          ? customStartDate.slice(5) // MM-DD
                          : `${customStartDate.slice(5)}~${customEndDate.slice(5)}`
                        : '날짜선택'}
                    </span>
                  </button>
                </div>

                {dateFilter === 'CUSTOM' && (
                  <button
                    type="button"
                    onClick={() => setShowCustomDatePicker(prev => !prev)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium cursor-pointer shrink-0"
                  >
                    {showCustomDatePicker ? '달력 접기' : '날짜 변경'}
                  </button>
                )}
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

          {/* Custom Date / Range Picker Expandable Panel */}
          {dateFilter === 'CUSTOM' && showCustomDatePicker && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex-wrap">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                기간 설정:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => {
                    setCustomStartDate(e.target.value);
                    if (!customEndDate) setCustomEndDate(e.target.value);
                  }}
                  style={{ colorScheme: 'light' }}
                  className="px-2 py-1 text-xs bg-white text-slate-900 font-semibold font-mono border border-slate-300 rounded-md shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-600 font-bold">~</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  style={{ colorScheme: 'light' }}
                  className="px-2 py-1 text-xs bg-white text-slate-900 font-semibold font-mono border border-slate-300 rounded-md shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200/90 text-slate-800 border border-slate-300">
                            {log.action}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{log.actionTitle}</span>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatDateTime(log.timestamp)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200" title="로그 고유 식별 번호">
                            {log.id}
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
                        <span className="font-medium font-mono">{getLogOperatorId(log)}</span>
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
                    <span>작업자 ID: {getLogOperatorId(logToDelete)}</span>
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
