import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Plus,
  Trash2,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Calendar,
  X,
  Filter,
  Layers,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  Edit2,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PosGifticon } from '../../types/pos';
import {
  savePosGifticon,
  saveMultiplePosGifticons,
  deletePosGifticon,
  deleteMultiplePosGifticons,
  updatePosGifticonStatus,
  editPosGifticon,
  batchUpdatePosGifticons,
} from '../../services/posFirestore';

interface PosGifticonManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gifticons?: PosGifticon[];
  currentUserName: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function PosGifticonManagerModal({
  isOpen,
  onClose,
  gifticons,
  currentUserName,
  currentUserId,
  isAdmin,
}: PosGifticonManagerModalProps) {
  const activeGifticons = gifticons || [];

  // Tabs: 'list' (기프티콘 목록 및 검색) | 'single' (개별 기프티콘 등록) | 'batch' (엑셀/시트 일괄 붙여넣기 등록)
  const [activeTab, setActiveTab] = useState<'list' | 'single' | 'batch'>('list');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'USED' | 'CANCELLED'>('ALL');

  // Multi-selection state for batch deletion
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Single gifticon form state
  const [singleId, setSingleId] = useState('');
  const [singleAmount, setSingleAmount] = useState<number | ''>(3000);
  const [singleDesc, setSingleDesc] = useState('');
  const [singleMemo, setSingleMemo] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);

  // Batch import form state (Google Sheet / Excel paste)
  const [batchRawText, setBatchRawText] = useState('');
  const [batchDefaultAmount, setBatchDefaultAmount] = useState<number>(3000);
  const [batchDefaultDesc, setBatchDefaultDesc] = useState('학생회/매점 이벤트 기프티콘');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ success: number; skipped: number } | null>(null);

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Filtered gifticons
  const filteredGifticons = useMemo(() => {
    return activeGifticons.filter(c => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = c.id.toLowerCase().includes(q);
        const descMatch = c.description?.toLowerCase().includes(q);
        const memoMatch = c.memo?.toLowerCase().includes(q);
        const usedByMatch = c.usedBy?.toLowerCase().includes(q);
        const amountMatch = c.amount.toString().includes(q);
        return idMatch || descMatch || memoMatch || usedByMatch || amountMatch;
      }
      return true;
    });
  }, [activeGifticons, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = activeGifticons.length;
    const active = activeGifticons.filter(c => c.status === 'ACTIVE').length;
    const used = activeGifticons.filter(c => c.status === 'USED').length;
    const cancelled = activeGifticons.filter(c => c.status === 'CANCELLED').length;
    const activeTotalAmount = activeGifticons
      .filter(c => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + c.amount, 0);
    const usedTotalAmount = activeGifticons
      .filter(c => c.status === 'USED')
      .reduce((sum, c) => sum + c.amount, 0);

    return { total, active, used, cancelled, activeTotalAmount, usedTotalAmount };
  }, [activeGifticons]);

  // Handle single gifticon creation
  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = singleId.trim();
    if (!cleanId) {
      showFeedback('기프티콘 번호를 입력해주세요.', 'error');
      return;
    }
    const amt = typeof singleAmount === 'number' ? singleAmount : parseInt(String(singleAmount), 10);
    if (!amt || isNaN(amt) || amt <= 0) {
      showFeedback('올바른 할인 금액(원)을 입력해주세요.', 'error');
      return;
    }

    setSingleLoading(true);
    try {
      await savePosGifticon(
        {
          id: cleanId,
          amount: amt,
          description: singleDesc.trim() || undefined,
          memo: singleMemo.trim() || undefined,
          status: 'ACTIVE',
        },
        currentUserName,
        currentUserId
      );
      showFeedback(`기프티콘 [${cleanId}] (${amt.toLocaleString()}원) 등록 완료!`, 'success');
      setSingleId('');
      setSingleDesc('');
      setSingleMemo('');
      setActiveTab('list');
    } catch (err: any) {
      console.error(err);
      showFeedback(err.message || '기프티콘 등록에 실패했습니다.', 'error');
    } finally {
      setSingleLoading(false);
    }
  };

  // Parse batch raw text (Supports: 1. "기프티콘번호 \t 금액 \t 설명", 2. "기프티콘번호 \t 금액", 3. "기프티콘번호" 단독 나열)
  const parsedBatchItems = useMemo(() => {
    if (!batchRawText.trim()) return [];
    const lines = batchRawText.split(/\r?\n/);
    const result: Array<{ id: string; amount: number; description?: string; memo?: string }> = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Split by tab or comma
      const parts = line.includes('\t')
        ? line.split('\t').map(p => p.trim())
        : line.includes(',')
        ? line.split(',').map(p => p.trim())
        : [line];

      const id = parts[0];
      if (!id) continue;

      let amount = batchDefaultAmount;
      let description = batchDefaultDesc;
      let memo: string | undefined = undefined;

      if (parts.length >= 2) {
        const parsedAmt = parseInt(parts[1].replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsedAmt) && parsedAmt > 0) {
          amount = parsedAmt;
        } else if (parts[1]) {
          description = parts[1];
        }
      }

      if (parts.length >= 3) {
        if (typeof parts[2] === 'string' && parts[2]) {
          description = parts[2];
        }
      }

      if (parts.length >= 4) {
        memo = parts[3];
      }

      result.push({ id, amount, description, memo });
    }

    return result;
  }, [batchRawText, batchDefaultAmount, batchDefaultDesc]);

  // Execute Batch Import
  const handleExecuteBatchImport = async () => {
    if (parsedBatchItems.length === 0) {
      showFeedback('등록할 유효한 기프티콘 데이터가 없습니다.', 'error');
      return;
    }

    setBatchLoading(true);
    try {
      const res = await saveMultiplePosGifticons(parsedBatchItems, currentUserName, currentUserId);
      setBatchResult({ success: res.successCount, skipped: parsedBatchItems.length - res.successCount });
      showFeedback(`기프티콘 총 ${res.successCount}장이 성공적으로 일괄 등록되었습니다!`, 'success');
      setBatchRawText('');
      setActiveTab('list');
    } catch (err: any) {
      console.error(err);
      showFeedback(err.message || '일괄 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setBatchLoading(false);
    }
  };

  // Toggle select
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredGifticons.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredGifticons.map(c => c.id)));
    }
  };

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single'; id: string } | { type: 'batch'; ids: string[] } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Trigger delete single
  const requestDeleteSingle = (gifticonId: string) => {
    setDeleteTarget({ type: 'single', id: gifticonId });
  };

  // Trigger delete batch
  const requestDeleteBatch = () => {
    if (selectedIds.size === 0) return;
    setDeleteTarget({ type: 'batch', ids: Array.from(selectedIds) });
  };

  // Confirm and execute deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'single') {
        const cleanId = deleteTarget.id.trim();
        await deletePosGifticon(cleanId, currentUserName, currentUserId);
        showFeedback(`기프티콘 [${cleanId}] 삭제 완료`, 'success');
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          next.delete(cleanId);
          return next;
        });
      } else {
        const cleanIds = deleteTarget.ids.map(id => id.trim());
        await deleteMultiplePosGifticons(cleanIds, currentUserName, currentUserId);
        showFeedback(`${cleanIds.length}장의 기프티콘 삭제 완료`, 'success');
        setSelectedIds(new Set());
      }
      setDeleteTarget(null);
    } catch (err: any) {
      console.error(err);
      showFeedback(err.message || '기프티콘 삭제 실패', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Individual Edit Modal state
  const [editingGifticon, setEditingGifticon] = useState<PosGifticon | null>(null);
  const [editFormId, setEditFormId] = useState('');
  const [editFormAmount, setEditFormAmount] = useState<number | ''>(3000);
  const [editFormStatus, setEditFormStatus] = useState<'ACTIVE' | 'USED' | 'CANCELLED'>('ACTIVE');
  const [editFormDesc, setEditFormDesc] = useState('');
  const [editFormMemo, setEditFormMemo] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Open individual edit
  const handleOpenEdit = (gifticon: PosGifticon) => {
    setEditingGifticon(gifticon);
    setEditFormId(gifticon.id);
    setEditFormAmount(gifticon.amount);
    setEditFormStatus(gifticon.status);
    setEditFormDesc(gifticon.description || '');
    setEditFormMemo(gifticon.memo || '');
  };

  // Submit individual edit
  const handleSaveIndividualEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGifticon) return;
    const cleanId = editFormId.trim();
    if (!cleanId) {
      showFeedback('기프티콘 번호를 입력해주세요.', 'error');
      return;
    }
    const amt = typeof editFormAmount === 'number' ? editFormAmount : parseInt(String(editFormAmount), 10);
    if (!amt || isNaN(amt) || amt <= 0) {
      showFeedback('올바른 할인 금액(원)을 입력해주세요.', 'error');
      return;
    }

    setIsSavingEdit(true);
    try {
      await editPosGifticon(
        editingGifticon.id,
        {
          id: cleanId,
          amount: amt,
          status: editFormStatus,
          description: editFormDesc.trim() || undefined,
          memo: editFormMemo.trim() || undefined,
        },
        currentUserName,
        currentUserId
      );
      showFeedback(`기프티콘 [${cleanId}] (${amt.toLocaleString()}원) 수정이 완료되었습니다.`, 'success');
      setEditingGifticon(null);
    } catch (err: any) {
      console.error(err);
      showFeedback(err.message || '기프티콘 수정 실패', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Batch Edit Modal state (금액, 상태, 폐기 상태만 일괄 수정 가능)
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [batchUpdateAmountEnabled, setBatchUpdateAmountEnabled] = useState(false);
  const [batchUpdateAmountValue, setBatchUpdateAmountValue] = useState<number | ''>(3000);
  const [batchUpdateStatusEnabled, setBatchUpdateStatusEnabled] = useState(false);
  const [batchUpdateStatusValue, setBatchUpdateStatusValue] = useState<'ACTIVE' | 'USED' | 'CANCELLED'>('ACTIVE');
  const [isSavingBatchEdit, setIsSavingBatchEdit] = useState(false);

  const handleOpenBatchEdit = () => {
    if (selectedIds.size === 0) {
      showFeedback('일괄 수정할 기프티콘을 먼저 체크박스로 선택해주세요.', 'error');
      return;
    }
    setBatchUpdateAmountEnabled(false);
    setBatchUpdateAmountValue(3000);
    setBatchUpdateStatusEnabled(false);
    setBatchUpdateStatusValue('ACTIVE');
    setShowBatchEditModal(true);
  };

  const handleSaveBatchEdit = async () => {
    if (selectedIds.size === 0) return;
    if (!batchUpdateAmountEnabled && !batchUpdateStatusEnabled) {
      showFeedback('일괄 변경할 항목(금액 또는 상태)의 체크박스를 활성화해주세요.', 'error');
      return;
    }

    const updates: { amount?: number; status?: 'ACTIVE' | 'USED' | 'CANCELLED' } = {};
    if (batchUpdateAmountEnabled) {
      const amt = typeof batchUpdateAmountValue === 'number' ? batchUpdateAmountValue : parseInt(String(batchUpdateAmountValue), 10);
      if (!amt || isNaN(amt) || amt <= 0) {
        showFeedback('올바른 할인 금액(원)을 입력해주세요.', 'error');
        return;
      }
      updates.amount = amt;
    }
    if (batchUpdateStatusEnabled) {
      updates.status = batchUpdateStatusValue;
    }

    setIsSavingBatchEdit(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await batchUpdatePosGifticons(ids, updates, currentUserName, currentUserId);
      showFeedback(`선택한 ${res.updatedCount}장의 기프티콘이 성공적으로 일괄 수정되었습니다.`, 'success');
      setShowBatchEditModal(false);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error(err);
      showFeedback(err.message || '일괄 수정 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSavingBatchEdit(false);
    }
  };

  // Quick Selection Helpers: USED / CANCELLED
  const handleSelectAllUsed = () => {
    const usedIds = activeGifticons.filter(g => g.status === 'USED').map(g => g.id);
    if (usedIds.length === 0) {
      showFeedback('사용 완료된 기프티콘이 없습니다.', 'error');
      return;
    }
    setSelectedIds(new Set(usedIds));
    showFeedback(`사용 완료된 기프티콘 ${usedIds.length}장이 선택되었습니다.`, 'success');
  };

  const handleSelectAllCancelled = () => {
    const cancelledIds = activeGifticons.filter(g => g.status === 'CANCELLED').map(g => g.id);
    if (cancelledIds.length === 0) {
      showFeedback('폐기/무효 처리된 기프티콘이 없습니다.', 'error');
      return;
    }
    setSelectedIds(new Set(cancelledIds));
    showFeedback(`폐기/무효 기프티콘 ${cancelledIds.length}장이 선택되었습니다.`, 'success');
  };

  const handleSelectAllCleanupTargets = () => {
    const targetIds = activeGifticons.filter(g => g.status === 'USED' || g.status === 'CANCELLED').map(g => g.id);
    if (targetIds.length === 0) {
      showFeedback('정리할 사용 완료 또는 폐기 항목이 없습니다.', 'error');
      return;
    }
    setSelectedIds(new Set(targetIds));
    showFeedback(`정리 대상(사용완료 + 폐기) 총 ${targetIds.length}장이 선택되었습니다.`, 'success');
  };

  // Direct Cleanup trigger for all spent/cancelled gifticons
  const requestDirectCleanup = () => {
    const targetIds = activeGifticons.filter(g => g.status === 'USED' || g.status === 'CANCELLED').map(g => g.id);
    if (targetIds.length === 0) {
      showFeedback('정리할 사용 완료 또는 폐기 항목이 없습니다.', 'error');
      return;
    }
    setDeleteTarget({ type: 'batch', ids: targetIds });
  };

  // Change gifticon status (e.g. revive or cancel)
  const handleChangeStatus = async (gifticonId: string, nextStatus: 'ACTIVE' | 'USED' | 'CANCELLED') => {
    try {
      const cleanId = gifticonId.trim();
      await updatePosGifticonStatus(cleanId, nextStatus, currentUserName, currentUserId);
      showFeedback(`기프티콘 상태를 '${nextStatus}'(으)로 변경했습니다.`, 'success');
    } catch (err: any) {
      showFeedback(err.message || '상태 변경 실패', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1328] border border-white/20 rounded-3xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#070d1e] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">기프티콘 시스템 관리</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeGifticons.length}장
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-surface-dim hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-[#091024] border-b border-white/5 shrink-0 text-xs">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-surface-dim block mb-0.5">전체 발행 기프티콘</span>
            <span className="text-base font-black text-white font-mono">
              {stats.total.toLocaleString()}장
            </span>
          </div>
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
            <span className="text-emerald-300 block mb-0.5">사용 가능 (미사용)</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-base font-black text-emerald-300 font-mono">
                {stats.active.toLocaleString()}장
              </span>
              <span className="text-[11px] text-emerald-200/70">
                ({stats.activeTotalAmount.toLocaleString()}원)
              </span>
            </div>
          </div>
          <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
            <span className="text-blue-300 block mb-0.5">결제 사용 완료</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-base font-black text-blue-300 font-mono">
                {stats.used.toLocaleString()}장
              </span>
              <span className="text-[11px] text-blue-200/70">
                ({stats.usedTotalAmount.toLocaleString()}원)
              </span>
            </div>
          </div>
          <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
            <span className="text-rose-300 block mb-0.5">폐기/비활성화</span>
            <span className="text-base font-black text-rose-300 font-mono">
              {stats.cancelled.toLocaleString()}장
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 py-2 border-b border-white/10 bg-[#080e22] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'list'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-surface-dim hover:text-white'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>기프티콘 목록 ({filteredGifticons.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'batch'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-surface-dim hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>일괄 등록</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'single'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-surface-dim hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>단건 등록</span>
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`text-xs px-3 py-1 rounded-xl font-bold flex items-center space-x-1.5 animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {/* TAB 1: LIST & SEARCH */}
          {activeTab === 'list' && (
            <div className="space-y-3.5">
              {/* Search & Status Filter bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-black/40 p-2.5 rounded-2xl border border-white/10">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-surface-dim absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="기프티콘 번호, 설명, 금액 검색..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-dim hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
                  {(['ALL', 'ACTIVE', 'USED', 'CANCELLED'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        statusFilter === st
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-surface-dim hover:text-white'
                      }`}
                    >
                      {st === 'ALL' && '전체'}
                      {st === 'ACTIVE' && '미사용(가능)'}
                      {st === 'USED' && '사용완료'}
                      {st === 'CANCELLED' && '폐기/무효'}
                    </button>
                  ))}

                  {selectedIds.size > 0 && (
                    <div className="flex items-center space-x-1.5 ml-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenBatchEdit}
                        disabled={isDeleting}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center space-x-1 shrink-0 transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>{selectedIds.size}개 일괄 수정</span>
                      </button>

                      <button
                        type="button"
                        onClick={requestDeleteBatch}
                        disabled={isDeleting}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1 shrink-0 transition-colors cursor-pointer shadow-md shadow-rose-950/40"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{selectedIds.size}개 일괄 삭제</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedIds(new Set())}
                        className="px-2 py-1 rounded-lg text-xs font-medium text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 shrink-0 transition-colors cursor-pointer"
                      >
                        선택 해제
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Selection & Cleanup Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#081024] rounded-2xl border border-white/5 text-xs">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-[11px] font-bold text-surface-dim mr-1">체크박스 빠른 선택:</span>
                  <button
                    type="button"
                    onClick={handleSelectAllUsed}
                    disabled={stats.used === 0}
                    className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-semibold text-[11px] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    사용 완료 ({stats.used}장)
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllCancelled}
                    disabled={stats.cancelled === 0}
                    className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-[11px] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    폐기/무효 ({stats.cancelled}장)
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllCleanupTargets}
                    disabled={stats.used + stats.cancelled === 0}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white border border-white/10 font-semibold text-[11px] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    정리대상 전체 ({stats.used + stats.cancelled}장)
                  </button>
                </div>

                {stats.used + stats.cancelled > 0 && (
                  <button
                    type="button"
                    onClick={requestDirectCleanup}
                    disabled={isDeleting}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-[11px] flex items-center space-x-1 transition-colors cursor-pointer ml-auto"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>사용완료/폐기 일괄 정리 ({stats.used + stats.cancelled}장)</span>
                  </button>
                )}
              </div>

              {/* Gifticons List Table */}
              {filteredGifticons.length === 0 ? (
                <div className="py-16 text-center text-surface-dim flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                    <Ticket className="w-7 h-7 text-white/30" />
                  </div>
                  <p className="text-sm font-bold text-white/70">등록된 기프티콘이 없습니다</p>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 p-3 bg-black/40 text-[11px] font-bold text-surface-dim border-b border-white/10 select-none">
                    <div className="col-span-1 flex items-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-surface-dim hover:text-white"
                      >
                        {selectedIds.size > 0 && selectedIds.size === filteredGifticons.length ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="col-span-3">기프티콘 번호 (코드)</div>
                    <div className="col-span-2 text-right">할인 금액</div>
                    <div className="col-span-1 text-center">상태</div>
                    <div className="col-span-3">설명 / 메모 / 사용정보</div>
                    <div className="col-span-2 text-right">제어</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-white/5">
                    {filteredGifticons.map(gifticon => {
                      const isSelected = selectedIds.has(gifticon.id);
                      return (
                        <div
                          key={gifticon.id}
                          className={`grid grid-cols-12 gap-2 p-3 text-xs items-center transition-colors ${
                            isSelected ? 'bg-amber-500/10' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="col-span-1 flex items-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(gifticon.id)}
                              className="text-surface-dim hover:text-white"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <div className="col-span-3 font-mono font-bold text-white tracking-wider truncate flex items-center space-x-1.5">
                            <span>{gifticon.id}</span>
                          </div>

                          <div className="col-span-2 text-right font-mono font-black text-amber-300">
                            {gifticon.amount.toLocaleString()}원
                          </div>

                          <div className="col-span-1 text-center">
                            {gifticon.status === 'ACTIVE' && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                사용 가능
                              </span>
                            )}
                            {gifticon.status === 'USED' && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                                사용 완료
                              </span>
                            )}
                            {gifticon.status === 'CANCELLED' && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                                무효/폐기
                              </span>
                            )}
                          </div>

                          <div className="col-span-3 text-[11px] space-y-0.5 min-w-0 pr-1">
                            {gifticon.description && (
                              <div className="text-white/85 font-medium truncate" title={`설명: ${gifticon.description}`}>
                                {gifticon.description}
                              </div>
                            )}
                            {gifticon.memo && (
                              <div
                                className="text-amber-300 text-[10px] flex items-center space-x-1.5 truncate"
                                title={`메모: ${gifticon.memo}`}
                              >
                                <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] shrink-0 border border-amber-500/30">
                                  메모
                                </span>
                                <span className="truncate">{gifticon.memo}</span>
                              </div>
                            )}
                            {gifticon.status === 'USED' && (
                              <div className="text-blue-300 text-[10px] font-medium truncate flex items-center space-x-1">
                                <span className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold text-[9px] shrink-0 border border-blue-500/30">
                                  사용처
                                </span>
                                <span className="truncate">
                                  {gifticon.usedBy ? gifticon.usedBy : '결제 사용'}
                                  {gifticon.usedOrderId ? ` (#${gifticon.usedOrderId.slice(-4)})` : ''}
                                </span>
                              </div>
                            )}
                            {!gifticon.description && !gifticon.memo && gifticon.status !== 'USED' && (
                              <span className="text-surface-dim/40">-</span>
                            )}
                          </div>

                          <div className="col-span-2 flex items-center justify-end space-x-1">
                            {/* Individual Edit Button */}
                            <button
                              type="button"
                              title="기프티콘 번호, 금액, 설명, 메모 상세 수정"
                              onClick={() => handleOpenEdit(gifticon)}
                              className="p-1.5 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {gifticon.status === 'USED' && (
                              <button
                                type="button"
                                title="미사용 상태로 되돌리기 (수동 복구)"
                                onClick={() => handleChangeStatus(gifticon.id, 'ACTIVE')}
                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-emerald-300 text-[10px] font-bold flex items-center space-x-0.5"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>복구</span>
                              </button>
                            )}

                            {gifticon.status === 'ACTIVE' && (
                              <button
                                type="button"
                                title="기프티콘 폐기/무효화"
                                onClick={() => handleChangeStatus(gifticon.id, 'CANCELLED')}
                                className="px-1.5 py-1 rounded bg-white/5 hover:bg-rose-500/20 text-surface-dim hover:text-rose-300 text-[10px]"
                              >
                                폐기
                              </button>
                            )}

                            {gifticon.status === 'CANCELLED' && (
                              <button
                                type="button"
                                title="다시 활성화"
                                onClick={() => handleChangeStatus(gifticon.id, 'ACTIVE')}
                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-emerald-300 text-[10px] font-bold"
                              >
                                활성화
                              </button>
                            )}

                            <button
                              type="button"
                              title="영구 삭제"
                              onClick={() => requestDeleteSingle(gifticon.id)}
                              className="p-1.5 rounded-lg text-surface-dim hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* TAB 2: BATCH SHEET / EXCEL IMPORT */}
          {activeTab === 'batch' && (
            <div className="max-w-2xl mx-auto space-y-4 py-2">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>구글 스프레드시트 / 엑셀 표 영역 붙여넣기 안내</span>
                </div>
                <p className="text-amber-200/90 leading-relaxed">
                  구글 시트나 엑셀에서 기프티콘 목록 열들을 복사(<kbd className="bg-black/40 px-1 py-0.5 rounded text-[10px]">Ctrl+C</kbd>)하여 아래 상자에 그대로 붙여넣기(<kbd className="bg-black/40 px-1 py-0.5 rounded text-[10px]">Ctrl+V</kbd>)하세요.
                </p>
                <div className="bg-black/40 p-2.5 rounded-xl font-mono text-[11px] text-surface-dim space-y-1">
                  <div className="text-white/80 font-bold">지원되는 형식 (탭 또는 쉼표 구분):</div>
                  <div>1. <span className="text-amber-300">기프티콘번호 [금액] [설명]</span> (예: <code>GFT-2026-001	3000	개교기념일</code>)</div>
                  <div>2. <span className="text-amber-300">기프티콘번호 [금액]</span> (예: <code>2026-A101	2000</code>)</div>
                  <div>3. <span className="text-amber-300">기프티콘번호 단독</span> (금액 미기재 시 아래 '기본 금액'으로 자동 일괄 적용)</div>
                </div>
              </div>

              {/* Default fallbacks for batch */}
              <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div>
                  <label className="text-[11px] font-bold text-surface-dim block mb-1">
                    기본 할인 금액 (금액 열이 없을 때 적용)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={batchDefaultAmount}
                      onChange={e => setBatchDefaultAmount(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-amber-500/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-dim">원</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-surface-dim block mb-1">
                    기본 발급 설명
                  </label>
                  <input
                    type="text"
                    value={batchDefaultDesc}
                    onChange={e => setBatchDefaultDesc(e.target.value)}
                    placeholder="예: 학생회 이벤트 발급"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>엑셀 / 시트 데이터 붙여넣기</span>
                  </label>
                  <span className="text-xs text-amber-400 font-bold font-mono">
                    감지된 기프티콘: {parsedBatchItems.length}장
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={batchRawText}
                  onChange={e => setBatchRawText(e.target.value)}
                  placeholder={`여기에 엑셀 표를 붙여넣으세요. 예시:
CPN-001	3000	체육대회 1등
CPN-002	3000	체육대회 2등
CPN-003	2000
CPN-004`}
                  className="w-full bg-black/50 border border-white/15 focus:border-amber-500/60 rounded-2xl p-3.5 text-xs font-mono text-white placeholder-slate-600 outline-none transition-all leading-relaxed custom-scrollbar"
                />
              </div>

              {/* Preview strip */}
              {parsedBatchItems.length > 0 && (
                <div className="bg-black/30 p-3 rounded-2xl border border-white/10 space-y-1 text-xs">
                  <div className="text-surface-dim font-bold flex items-center justify-between">
                    <span>미리보기 (상위 5건):</span>
                    <span className="text-amber-300 font-mono">
                      총 가치: {parsedBatchItems.reduce((s, c) => s + c.amount, 0).toLocaleString()}원
                    </span>
                  </div>
                  <div className="divide-y divide-white/5 font-mono text-[11px]">
                    {parsedBatchItems.slice(0, 5).map((it, idx) => (
                      <div key={idx} className="py-1 flex justify-between">
                        <span className="text-white font-bold">{it.id}</span>
                        <span className="text-amber-300">{it.amount.toLocaleString()}원</span>
                        <span className="text-surface-dim truncate max-w-[200px]">{it.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                disabled={batchLoading || parsedBatchItems.length === 0}
                onClick={handleExecuteBatchImport}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-black transition-all flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                  {batchLoading
                    ? '일괄 등록 처리 중...'
                    : `기프티콘 ${parsedBatchItems.length}장 일괄 등록 완료`}
                </span>
              </button>
            </div>
          )}

          {/* TAB 3: SINGLE REGISTRATION */}
          {activeTab === 'single' && (
            <form onSubmit={handleCreateSingle} className="max-w-md mx-auto space-y-4 py-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3.5">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>개별 기프티콘 번호 등록</span>
                </h3>

                <div>
                  <label className="text-xs font-bold text-surface-dim block mb-1">
                    기프티콘 번호 (고유 코드) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={singleId}
                    onChange={e => setSingleId(e.target.value)}
                    placeholder="예: 2026-GIFT-001 또는 자유 형식"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-amber-500/50"
                  />
                  <p className="text-[11px] text-surface-dim mt-1">
                    포맷 제한 없음 (영문, 숫자, 하이픈 등 자유롭게 입력 가능)
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-surface-dim block mb-1">
                    할인 액면 금액 (원) <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      step={1}
                      value={singleAmount}
                      onChange={e => setSingleAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      placeholder="예: 3000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-amber-500/50"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-surface-dim">원</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-surface-dim block mb-1">
                    설명 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={singleDesc}
                    onChange={e => setSingleDesc(e.target.value)}
                    placeholder="예: 1학기 철도축제 당첨 기프티콘"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-surface-dim block mb-1">
                    메모 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={singleMemo}
                    onChange={e => setSingleMemo(e.target.value)}
                    placeholder="메모 입력 (선택사항)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={singleLoading}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-black transition-all flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/20 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                <span>{singleLoading ? '등록 중...' : '기프티콘 등록 완료'}</span>
              </button>
            </form>
          )}
        </div>

        {/* In-Modal Delete Confirmation Overlay */}
        <AnimatePresence>
          {deleteTarget && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => !isDeleting && setDeleteTarget(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-[#0b1328] border border-rose-500/40 w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3.5 border border-rose-500/30">
                  <Trash2 className="w-6 h-6" />
                </div>

                <h3 className="text-base font-bold text-white mb-1.5">
                  {deleteTarget.type === 'single'
                    ? `기프티콘 [${deleteTarget.id}] 삭제`
                    : `기프티콘 ${deleteTarget.ids.length}장 일괄 삭제`}
                </h3>

                <p className="text-xs text-surface-dim mb-5 leading-relaxed">
                  {deleteTarget.type === 'single'
                    ? `선택한 기프티콘 [${deleteTarget.id}]을(를) 영구 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.`
                    : `선택한 총 ${deleteTarget.ids.length}장의 기프티콘을 영구 삭제하시겠습니까? 삭제된 기프티콘 번호는 사용할 수 없습니다.`}
                </p>

                <div className="flex space-x-2.5 w-full">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all shadow-lg shadow-rose-950/40 disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? '삭제 중...' : '영구 삭제'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* In-Modal Individual Edit Overlay */}
        <AnimatePresence>
          {editingGifticon && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => !isSavingEdit && setEditingGifticon(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-[#0b1328] border border-amber-500/40 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden"
              >
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                      <Edit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">기프티콘 정보 개별 수정</h3>
                      <p className="text-[11px] text-surface-dim">번호, 금액, 상태, 설명, 메모를 수정합니다.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => setEditingGifticon(null)}
                    className="p-1 rounded-lg text-surface-dim hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveIndividualEdit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-surface-dim block mb-1">
                      기프티콘 번호 (코드) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormId}
                      onChange={e => setEditFormId(e.target.value)}
                      placeholder="예: RAIL-2026-0001"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-amber-500/50"
                    />
                    {editFormId.trim() !== editingGifticon.id && (
                      <p className="text-[10px] text-amber-300 mt-1">
                        ※ 번호 변경 시 기존 번호 데이터가 새로운 번호로 자동 이전됩니다.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-surface-dim block mb-1">
                      할인 액면 금액 (원) <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="100"
                        step="100"
                        value={editFormAmount}
                        onChange={e => setEditFormAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        placeholder="예: 3000"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-amber-500/50"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-surface-dim">원</span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {[1000, 2000, 3000, 5000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setEditFormAmount(amt)}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-surface-dim hover:text-white border border-white/10 font-mono"
                        >
                          {amt.toLocaleString()}원
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-surface-dim block mb-1">상태</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditFormStatus('ACTIVE')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 ${
                          editFormStatus === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                            : 'bg-white/5 text-surface-dim border-white/10 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>사용 가능</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormStatus('USED')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 ${
                          editFormStatus === 'USED'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                            : 'bg-white/5 text-surface-dim border-white/10 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>사용 완료</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormStatus('CANCELLED')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 ${
                          editFormStatus === 'CANCELLED'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                            : 'bg-white/5 text-surface-dim border-white/10 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span>폐기/무효</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-surface-dim block mb-1">설명 (선택사항)</label>
                    <input
                      type="text"
                      value={editFormDesc}
                      onChange={e => setEditFormDesc(e.target.value)}
                      placeholder="예: 축제 이벤트 지급권"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-surface-dim block mb-1">메모 (선택사항)</label>
                    <input
                      type="text"
                      value={editFormMemo}
                      onChange={e => setEditFormMemo(e.target.value)}
                      placeholder="메모 입력 (선택사항)"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="flex space-x-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSavingEdit}
                      onClick={() => setEditingGifticon(null)}
                      className="flex-1 py-3 rounded-xl text-xs font-bold text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="flex-1 py-3 rounded-xl text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-950/40 disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingEdit ? '저장 중...' : '수정 완료'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* In-Modal Batch Edit Overlay */}
        <AnimatePresence>
          {showBatchEditModal && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => !isSavingBatchEdit && setShowBatchEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-[#0b1328] border border-amber-500/40 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden"
              >
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">기프티콘 일괄 수정</h3>
                      <p className="text-[11px] text-surface-dim">
                        선택된 총 <span className="text-amber-400 font-bold">{selectedIds.size}장</span>의 기프티콘을 한 번에 수정합니다.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSavingBatchEdit}
                    onClick={() => setShowBatchEditModal(false)}
                    className="p-1 rounded-lg text-surface-dim hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-200/90 leading-relaxed flex items-start space-x-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">일괄 수정 범위 안내:</span>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      일괄 수정에서는 <span className="font-bold underline">금액</span>과 <span className="font-bold underline">상태 (폐기/무효 포함)</span>만 일괄 변경할 수 있습니다. 기프티콘 번호, 설명, 메모는 목록의 개별 수정 버튼을 이용해주세요.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Option 1: Amount Batch Update */}
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    batchUpdateAmountEnabled
                      ? 'bg-white/5 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-black/20 border-white/5 opacity-70'
                  }`}>
                    <label className="flex items-center space-x-2 cursor-pointer mb-2.5">
                      <input
                        type="checkbox"
                        checked={batchUpdateAmountEnabled}
                        onChange={e => setBatchUpdateAmountEnabled(e.target.checked)}
                        className="rounded border-white/20 text-amber-500 focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-white">1. 할인 금액 일괄 변경</span>
                    </label>

                    {batchUpdateAmountEnabled && (
                      <div className="space-y-2 pl-6">
                        <div className="relative">
                          <input
                            type="number"
                            min="100"
                            step="100"
                            value={batchUpdateAmountValue}
                            onChange={e => setBatchUpdateAmountValue(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                            placeholder="변경할 할인 금액 입력 (원)"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-amber-500/50"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-surface-dim">원</span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {[1000, 2000, 3000, 5000].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setBatchUpdateAmountValue(amt)}
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-surface-dim hover:text-white border border-white/10 font-mono"
                            >
                              {amt.toLocaleString()}원
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Status Batch Update */}
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    batchUpdateStatusEnabled
                      ? 'bg-white/5 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-black/20 border-white/5 opacity-70'
                  }`}>
                    <label className="flex items-center space-x-2 cursor-pointer mb-2.5">
                      <input
                        type="checkbox"
                        checked={batchUpdateStatusEnabled}
                        onChange={e => setBatchUpdateStatusEnabled(e.target.checked)}
                        className="rounded border-white/20 text-amber-500 focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-white">2. 상태 일괄 변경 (폐기/무효 포함)</span>
                    </label>

                    {batchUpdateStatusEnabled && (
                      <div className="grid grid-cols-3 gap-2 pl-6">
                        <button
                          type="button"
                          onClick={() => setBatchUpdateStatusValue('ACTIVE')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 ${
                            batchUpdateStatusValue === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-white/5 text-surface-dim border-white/10 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>사용 가능</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBatchUpdateStatusValue('USED')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 ${
                            batchUpdateStatusValue === 'USED'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-white/5 text-surface-dim border-white/10 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <span>사용 완료</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBatchUpdateStatusValue('CANCELLED')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1.5 ${
                            batchUpdateStatusValue === 'CANCELLED'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-white/5 text-surface-dim border-white/10 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                          <span>폐기/무효</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2.5 pt-5">
                  <button
                    type="button"
                    disabled={isSavingBatchEdit}
                    onClick={() => setShowBatchEditModal(false)}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-surface-dim hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={isSavingBatchEdit || (!batchUpdateAmountEnabled && !batchUpdateStatusEnabled)}
                    onClick={handleSaveBatchEdit}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-950/40 disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingBatchEdit ? '일괄 수정 중...' : `${selectedIds.size}장 일괄 수정 적용`}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

