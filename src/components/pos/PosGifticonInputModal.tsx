import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { X, Delete, RotateCcw } from 'lucide-react';
import { POS_MODAL_BACKDROP_TRANSITION, POS_MODAL_PANEL_TRANSITION, POS_BUMP_TRANSITION } from '../../utils/motion';

interface PosGifticonInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalTotalAmount: number;
  discountAmount: number;
  onApplyDiscount: (amount: number) => void;
}

export const PosGifticonInputModal: React.FC<PosGifticonInputModalProps> = ({
  isOpen,
  onClose,
  originalTotalAmount,
  discountAmount,
  onApplyDiscount,
}) => {
  const [inputValue, setInputValue] = useState<number>(discountAmount);
  const [isFreshOpen, setIsFreshOpen] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setInputValue(Math.min(discountAmount, originalTotalAmount));
      setIsFreshOpen(true);
    }
  }, [isOpen, discountAmount, originalTotalAmount]);

  const clampAmount = useCallback(
    (val: number) => Math.max(0, Math.min(originalTotalAmount, val)),
    [originalTotalAmount]
  );

  const handleDigit = useCallback(
    (digits: string) => {
      setInputValue(prev => {
        const baseStr = isFreshOpen ? '' : prev === 0 ? '' : String(prev);
        const nextStr = baseStr + digits;
        const parsed = parseInt(nextStr, 10);
        if (isNaN(parsed)) return 0;
        return clampAmount(parsed);
      });
      setIsFreshOpen(false);
    },
    [isFreshOpen, clampAmount]
  );

  const handleBackspace = useCallback(() => {
    setInputValue(prev => {
      const str = String(prev);
      if (str.length <= 1) return 0;
      return parseInt(str.slice(0, -1), 10) || 0;
    });
    setIsFreshOpen(false);
  }, []);

  const handleClear = useCallback(() => {
    setInputValue(0);
    setIsFreshOpen(false);
  }, []);

  const handleConfirm = useCallback(() => {
    onApplyDiscount(clampAmount(inputValue));
    onClose();
  }, [inputValue, clampAmount, onApplyDiscount, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleBackspace, handleClear, handleConfirm, onClose]);

  const finalPayableAmount = Math.max(0, originalTotalAmount - inputValue);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={POS_MODAL_BACKDROP_TRANSITION}
      onClick={onClose}
      className="fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={POS_MODAL_PANEL_TRANSITION}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-white">할인 적용</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Summary + Keypad Only */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* Before / Discount / After Display */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-surface-dim">
                <span>적용 전 금액</span>
                <span className="font-mono tabular-nums text-white font-semibold">
                  {originalTotalAmount.toLocaleString()}원
                </span>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">적용 금액</span>
                <div className="flex items-center space-x-2">
                  <motion.span
                    key={inputValue}
                    initial={{ scale: 1.07 }}
                    animate={{ scale: 1 }}
                    transition={POS_BUMP_TRANSITION}
                    className="text-xl font-bold font-mono tabular-nums text-amber-300 tracking-tight inline-block origin-right"
                  >
                    {inputValue > 0 ? `-${inputValue.toLocaleString()}` : '0'}
                    <span className="text-xs font-normal text-amber-300/70 ml-0.5">원</span>
                  </motion.span>
                  {inputValue > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-1 rounded-md bg-white/5 hover:bg-white/10 active:scale-90 text-surface-dim hover:text-white transition-[background-color,color,transform] cursor-pointer"
                      title="초기화"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-xs font-bold text-surface-dim">적용 후 금액</span>
                <motion.span
                  key={finalPayableAmount}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={POS_BUMP_TRANSITION}
                  className="text-lg font-bold font-mono tabular-nums text-secondary-container inline-block origin-right"
                >
                  {finalPayableAmount.toLocaleString()}
                  <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                </motion.span>
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-11 sm:h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/15 active:scale-[0.98] border border-white/10 text-base sm:text-lg font-bold font-mono text-white transition-[background-color,transform] cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleDigit('00')}
                className="h-11 sm:h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/15 active:scale-[0.98] border border-white/10 text-sm sm:text-base font-bold font-mono text-surface-dim hover:text-white transition-[background-color,color,transform] cursor-pointer"
              >
                00
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-11 sm:h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/15 active:scale-[0.98] border border-white/10 text-base sm:text-lg font-bold font-mono text-white transition-[background-color,transform] cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 sm:h-12 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 active:scale-[0.98] border border-white/10 text-surface-dim hover:text-rose-300 flex items-center justify-center transition-[background-color,color,transform] cursor-pointer"
                aria-label="지우기"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-[#070c18] border-t border-white/10 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 active:scale-[0.98] text-white text-xs sm:text-sm font-bold whitespace-nowrap flex items-center justify-center transition-[background-color,transform] cursor-pointer"
            >
              적용
            </button>
          </div>
      </motion.div>
    </motion.div>
  );
};
