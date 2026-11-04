import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Check,
  Ticket,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
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

  useEffect(() => {
    if (isOpen) {
      setSelectedList([...activeApplied]);
      setInputCode('');
      setErrorMessage(null);
    }
  }, [isOpen, activeApplied]);

  const totalGifticonDiscount = useMemo(() => {
    return selectedList.reduce((sum, c) => sum + c.amount, 0);
  }, [selectedList]);

  const actualPayable = Math.max(0, originalTotalAmount - totalGifticonDiscount);
  const forfeitedExcess = Math.max(0, totalGifticonDiscount - originalTotalAmount);

  const handleAddCode = () => {
    const clean = inputCode.trim();
    setErrorMessage(null);

    if (!clean) {
      setErrorMessage('기프티콘 번호를 입력해주세요.');
      return;
    }

    if (selectedList.some(c => c.id.toLowerCase() === clean.toLowerCase())) {
      setErrorMessage(`기프티콘 [${clean}]은(는) 이미 결제에 추가되었습니다.`);
      return;
    }

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

  const handleRemove = (gifticonId: string) => {
    setSelectedList(prev => prev.filter(c => c.id !== gifticonId));
  };

  const handleConfirm = () => {
    applyHandler(selectedList);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div>
            <h3 className="font-bold text-white text-base">매점 기프티콘 적용</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="py-4 border-b border-white/10 space-y-2">
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
                placeholder="기프티콘 번호 입력"
                autoFocus
                className="w-full bg-primary border border-white/10 focus:border-amber-400 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-white/25 outline-none transition-colors tracking-wider uppercase"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCode}
              className="px-4 rounded-xl font-bold text-xs sm:text-sm bg-secondary hover:bg-secondary/90 active:scale-95 text-white transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>추가</span>
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-center space-x-1.5 text-xs text-rose-400 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Selected Applied Gifticons List (Hairline-divided rows, not nested boxes) */}
        <div className="py-3.5 border-b border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-surface-dim">
              적용된 기프티콘 ({selectedList.length}장)
            </span>
            {selectedList.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedList([])}
                className="text-[11px] text-rose-400 hover:underline cursor-pointer"
              >
                전체 해제
              </button>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
            {selectedList.length === 0 ? (
              <div className="py-6 text-center text-xs text-surface-dim">
                적용된 기프티콘이 없습니다.
              </div>
            ) : (
              selectedList.map((c, idx) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span className="text-[11px] font-mono text-surface-dim w-4">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-white tracking-wider truncate">
                        {c.id}
                      </div>
                      {(c.description || c.memo) && (
                        <div className="text-[11px] text-surface-dim truncate">
                          {c.description}
                          {c.memo ? ` (${c.memo})` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-mono tabular-nums font-bold text-amber-400">
                      -{c.amount.toLocaleString()}원
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(c.id)}
                      className="p-1 rounded text-surface-dim hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Financial Breakdown (Unboxed typographic rows) */}
        <div className="py-4 space-y-2 text-xs">
          <div className="flex justify-between text-surface-dim">
            <span>주문 상품 합계</span>
            <span className="font-mono tabular-nums text-white font-bold">
              {originalTotalAmount.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between text-amber-400">
            <span>기프티콘 할인 합계</span>
            <span className="font-mono tabular-nums font-bold">
              -{totalGifticonDiscount.toLocaleString()}원
            </span>
          </div>

          {forfeitedExcess > 0 && (
            <div className="flex justify-between text-rose-400 text-[11px] pt-1">
              <span className="flex items-center space-x-1">
                <HelpCircle className="w-3 h-3 shrink-0" />
                <span>잔액 초과분 (이월 불가 소멸)</span>
              </span>
              <span className="font-mono tabular-nums font-bold">
                {forfeitedExcess.toLocaleString()}원 소멸
              </span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-3 border-t border-white/10">
            <span className="font-bold text-white text-xs">최종 실결제 금액</span>
            <div className="text-xl font-black font-mono tabular-nums text-secondary-container">
              {actualPayable.toLocaleString()}
              <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex space-x-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-[2] py-3 rounded-xl font-bold text-xs sm:text-sm bg-secondary hover:bg-secondary/90 active:scale-[0.99] text-white transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {selectedList.length > 0
                ? `${selectedList.length}장 기프티콘 적용`
                : '기프티콘 없이 진행'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
