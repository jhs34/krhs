import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Check,
  Ticket,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PosGifticon } from '../../types/pos';

interface PosGifticonInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalTotalAmount: number; // 원래 상품 총액
  availableGifticons?: PosGifticon[]; // 전체 기프티콘 풀
  appliedGifticons?: PosGifticon[]; // 현재 적용 중인 기프티콘 목록
  onApplyGifticons?: (gifticons: PosGifticon[]) => void;
}

export function PosGifticonInputModal({
  isOpen,
  onClose,
  originalTotalAmount,
  availableGifticons,
  appliedGifticons,
  onApplyGifticons,
}: PosGifticonInputModalProps) {
  const activeAvailable = availableGifticons || [];
  const activeApplied = appliedGifticons || [];
  const applyHandler = onApplyGifticons || (() => {});

  const [inputCode, setInputCode] = useState('');
  const [selectedList, setSelectedList] = useState<PosGifticon[]>(() => [...activeApplied]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedList([...activeApplied]);
      setInputCode('');
      setErrorMessage(null);
    }
  }, [isOpen, activeApplied]);

  // Calculations
  const totalGifticonDiscount = useMemo(() => {
    return selectedList.reduce((sum, c) => sum + c.amount, 0);
  }, [selectedList]);

  // Actual required payment (cannot be negative)
  const actualPayable = Math.max(0, originalTotalAmount - totalGifticonDiscount);
  // Any unused excess amount that will be forfeited according to school policy
  const forfeitedExcess = Math.max(0, totalGifticonDiscount - originalTotalAmount);

  // Add gifticon by code
  const handleAddCode = () => {
    const clean = inputCode.trim();
    setErrorMessage(null);

    if (!clean) {
      setErrorMessage('기프티콘 번호를 입력해주세요.');
      return;
    }

    // Check if already in current selection
    if (selectedList.some(c => c.id.toLowerCase() === clean.toLowerCase())) {
      setErrorMessage(`기프티콘 [${clean}]은(는) 이미 결제에 추가되었습니다.`);
      return;
    }

    // Lookup in database
    const found = activeAvailable.find(c => c.id.toLowerCase() === clean.toLowerCase());

    if (!found) {
      setErrorMessage(`기프티콘 번호 [${clean}]을(를) 찾을 수 없습니다. 번호를 다시 확인하세요.`);
      return;
    }

    if (found.status !== 'ACTIVE') {
      setErrorMessage(
        `기프티콘 [${clean}]은(는) ${found.status === 'USED' ? '이미 사용 완료된' : '폐기/무효화된'} 기프티콘입니다.`
      );
      return;
    }

    setSelectedList(prev => [...prev, found]);
    setInputCode('');
  };

  // Remove gifticon from list
  const handleRemove = (gifticonId: string) => {
    setSelectedList(prev => prev.filter(c => c.id !== gifticonId));
  };

  // Apply and confirm
  const handleConfirm = () => {
    applyHandler(selectedList);
    onClose();
  };

  // Clear all
  const handleClearAll = () => {
    setSelectedList([]);
    applyHandler([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, filter: 'blur(8px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.93, opacity: 0, filter: 'blur(8px)' }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0b1328] border border-amber-500/30 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10 relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">매점 기프티콘 적용</h3>
              <p className="text-[11px] text-surface-dim">기프티콘 번호를 입력하여 결제 금액에서 차감합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-surface-dim hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="my-4 space-y-2 relative z-10">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Ticket className="w-4 h-4 text-surface-dim absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputCode}
                onChange={e => {
                  setInputCode(e.target.value);
                  setErrorMessage(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCode();
                  }
                }}
                placeholder="기프티콘 번호 입력 (대소문자 무관)"
                autoFocus
                className="w-full bg-black/50 border border-white/15 focus:border-amber-400/80 rounded-2xl pl-10 pr-3.5 py-3 text-sm font-mono text-white placeholder-slate-500 outline-none transition-all tracking-wider uppercase"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCode}
              className="px-5 rounded-2xl font-bold text-xs sm:text-sm bg-amber-500 hover:bg-amber-400 active:scale-95 text-black transition-all flex items-center space-x-1 shadow-lg shadow-amber-500/20 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>추가</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center space-x-1.5 text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 px-3 py-2 rounded-xl animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Selected Applied Gifticons List */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-surface-dim">
              적용된 기프티콘 목록 ({selectedList.length}장)
            </span>
            {selectedList.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedList([])}
                className="text-[11px] text-rose-400 hover:underline cursor-pointer"
              >
                모두 해제
              </button>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {selectedList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-surface-dim">
                적용된 기프티콘이 없습니다. 위 입력창에 기프티콘 번호를 입력하세요.
              </div>
            ) : (
              selectedList.map((c, idx) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-white tracking-wider truncate">
                        {c.id}
                      </div>
                      {(c.description || c.memo) && (
                        <div className="text-[10px] text-amber-200/80 truncate flex items-center space-x-1.5">
                          {c.description && <span>{c.description}</span>}
                          {c.memo && (
                            <span className="text-amber-300 font-medium">
                              {c.description ? `(메모: ${c.memo})` : `메모: ${c.memo}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-mono font-black text-amber-300">
                      -{c.amount.toLocaleString()}원
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(c.id)}
                      className="p-1 rounded-lg text-surface-dim hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Financial Breakdown Card */}
        <div className="my-4 p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs relative z-10">
          <div className="flex justify-between text-surface-dim">
            <span>주문 상품 합계 (정가):</span>
            <span className="font-mono text-white font-bold">
              {originalTotalAmount.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between text-amber-400">
            <span>기프티콘 총 할인 합계:</span>
            <span className="font-mono font-bold">
              -{totalGifticonDiscount.toLocaleString()}원
            </span>
          </div>

          {forfeitedExcess > 0 && (
            <div className="flex justify-between text-rose-300/90 text-[11px] pt-1 border-t border-white/5">
              <span className="flex items-center space-x-1">
                <HelpCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>잔액 초과분 (이월 불가 소멸):</span>
              </span>
              <span className="font-mono text-rose-300 font-bold">
                {forfeitedExcess.toLocaleString()}원 소멸
              </span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
            <span className="font-bold text-white text-xs">최종 실결제 대상 금액:</span>
            <div className="text-xl font-black font-mono text-emerald-400">
              {actualPayable.toLocaleString()}
              <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex space-x-2.5 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-[2] py-3 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {selectedList.length > 0
                ? `${selectedList.length}장 기프티콘 적용하기`
                : '기프티콘 없이 결제 진행'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
