import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { PosAuditLog, PosLogCategory } from '../../types/pos';
import { deletePosLog, clearAllPosLogs } from '../../services/posFirestore';

interface PosAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: PosAuditLog[];
  isAdmin: boolean;
  actorName: string;
}

export const PosAuditLogModal: React.FC<PosAuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  isAdmin,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PosLogCategory | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('TODAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
        const logDate = log.timestamp.slice(0, 10);
        if (logDate !== todayStr && log.sessionId !== todayStr) {
          return false;
        }
      } else if (dateFilter === 'WEEK') {
        const logDate = new Date(log.timestamp);
        if (logDate < sevenDaysAgo) {
          return false;
        }
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
    const systemCount = logs.filter(l => l.category === 'SYSTEM' || l.category === 'AUTH').length;
    return { total, saleCount, inventoryCount, settlementCount, systemCount };
  }, [logs]);

  const handleDeleteSingle = async (logId: string) => {
    if (!confirm('이 로그 항목을 삭제하시겠습니까?')) return;
    try {
      await deletePosLog(logId);
    } catch (e) {
      alert('로그 삭제 실패: ' + (e as Error).message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('현재 저장된 모든 감사 로그를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    setIsProcessing(true);
    try {
      await clearAllPosLogs(logs);
      setIsDeletingAll(false);
    } catch (e) {
      alert('로그 전체 삭제 실패: ' + (e as Error).message);
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
            <Settings className="w-3 h-3" /> 시스템
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
    <div id="pos-audit-log-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="flex flex-col w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">POS 감사 및 활동 로그 (Audit Log)</h2>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-600/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  실시간 기록 중
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                결제 승인, 결제 취소, 품목/재고 변동, 정산 마감, 시스템 설정 등 모든 POS 변경 이력을 투명하게 기록합니다.
              </p>
            </div>
          </div>
          <button
            id="btn-close-audit-log"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-6 py-3 bg-slate-100/80 border-b border-slate-200 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
            <div className="text-slate-500 font-medium">전체 로그</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{stats.total}건</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
            <div className="text-emerald-700 font-medium">판매/취소</div>
            <div className="text-base font-bold text-emerald-800 mt-0.5">{stats.saleCount}건</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-blue-200 text-center">
            <div className="text-blue-700 font-medium">재고/품목</div>
            <div className="text-base font-bold text-blue-800 mt-0.5">{stats.inventoryCount}건</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-purple-200 text-center">
            <div className="text-purple-700 font-medium">정산/마감</div>
            <div className="text-base font-bold text-purple-800 mt-0.5">{stats.settlementCount}건</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-center">
            <div className="text-amber-700 font-medium">시스템/계정</div>
            <div className="text-base font-bold text-amber-800 mt-0.5">{stats.systemCount}건</div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: '전체 로그' },
              { id: 'SALE', label: '판매/결제' },
              { id: 'INVENTORY', label: '재고/품목' },
              { id: 'SETTLEMENT', label: '정산/마감' },
              { id: 'SYSTEM', label: '시스템 설정' },
              { id: 'AUTH', label: '계정/인증' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium text-slate-600">
                <button
                  onClick={() => setDateFilter('TODAY')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    dateFilter === 'TODAY' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  오늘
                </button>
                <button
                  onClick={() => setDateFilter('WEEK')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    dateFilter === 'WEEK' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  최근 7일
                </button>
                <button
                  onClick={() => setDateFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    dateFilter === 'ALL' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  전체 기간
                </button>
              </div>

              <span className="text-xs text-slate-500">
                표시 중: <strong className="text-slate-900">{filteredLogs.length}</strong>건
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isAdmin && logs.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={isProcessing}
                  title="관리자 전용: 감사 로그 전체 삭제"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  로그 비우기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Log List View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <AlertCircle className="w-12 h-12 stroke-[1.5] mb-2" />
              <p className="text-sm font-medium text-slate-600">조건에 부합하는 감사 로그가 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">필터를 변경하거나 검색어를 비워보세요.</p>
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
                        {hasMetadata && (
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                            title="상세 데이터 확인"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteSingle(log.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="로그 삭제 (관리자)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Metadata Drawer */}
                  <AnimatePresence>
                    {isExpanded && hasMetadata && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-3 bg-slate-900 text-slate-200 text-xs font-mono border-t border-slate-800"
                      >
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-700 text-slate-400">
                          <span>세부 정보 및 메타데이터 (JSON)</span>
                          <span>ID: {log.id}</span>
                        </div>
                        <pre className="whitespace-pre-wrap overflow-x-auto text-[11px] leading-relaxed text-blue-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-t border-slate-200 shrink-0">
          <div className="text-xs text-slate-500">
            실시간으로 기록된 로그는 Firestore에 안전하게 보존되며 인사이동 및 회계 감사 시 활용됩니다.
          </div>
          <button
            id="btn-audit-log-done"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            닫기
          </button>
        </div>
      </motion.div>
    </div>
  );
};
