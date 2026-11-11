import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Banknote, Check, RotateCcw, Ticket, X, User } from 'lucide-react';
import { POS_MODAL_BACKDROP_TRANSITION, POS_MODAL_PANEL_TRANSITION, POS_BUMP_TRANSITION } from '../../utils/motion';

interface PosCashModalProps {
  totalAmount: number; // 할인 차감 후 실결제 금액
  originalTotalAmount?: number;
  discountAmount?: number;
  onOpenDiscountModal?: () => void;
  onClearDiscount?: () => void;
  onConfirmPayment: (cashReceived: number, changeAmount: number, buyerName?: string, memo?: string) => void;
  onClose: () => void;
}

export const PosCashModal: React.FC<PosCashModalProps> = ({
  totalAmount,
  originalTotalAmount,
  discountAmount = 0,
  onOpenDiscountModal,
  onClearDiscount,
  onConfirmPayment,
  onClose,
}) => {
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [buyerName, setBuyerName] = useState<string>('');

  // If cashReceived is 0, treat it as exact payment (딱 맞게 받음)
  const effectiveReceived = cashReceived === 0 ? totalAmount : cashReceived;
  const changeAmount = effectiveReceived - totalAmount;
  const isInsufficient = effectiveReceived < totalAmount;

  const handleAddCash = (amount: number) => {
    setCashReceived(prev => prev + amount);
  };

  const handleExactAmount = () => {
    setCashReceived(totalAmount);
  };

  const handleConfirm = () => {
    if (isInsufficient) return;
    onConfirmPayment(
      effectiveReceived,
      Math.max(0, changeAmount),
      buyerName.trim() || undefined,
      undefined
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={POS_MODAL_BACKDROP_TRANSITION}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 6 }}
        transition={POS_MODAL_PANEL_TRANSITION}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <Banknote className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-white">현금 수납 및 거스름돈 계산</h3>
              <p className="text-xs text-surface-dim">
                금액을 선택하지 않고 완료하면 정액 수납 처리됩니다
              </p>
            </div>
          </div>

          {onOpenDiscountModal && (
            <button
              type="button"
              onClick={onOpenDiscountModal}
              className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shrink-0"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>{discountAmount > 0 ? '할인 수정' : '할인 입력'}</span>
            </button>
          )}
        </div>

        {/* Amount Summary */}
        <div className="py-3 border-y border-white/10 space-y-2.5">
          {discountAmount > 0 && originalTotalAmount !== undefined && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-dim">적용 전 금액</span>
                <span className="font-mono tabular-nums text-surface-dim">
                  {originalTotalAmount.toLocaleString()}원
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300 font-bold">할인 적용 금액</span>
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono tabular-nums text-purple-300 font-bold">
                    -{discountAmount.toLocaleString()}원
                  </span>
                  {onClearDiscount && (
                    <button
                      type="button"
                      onClick={onClearDiscount}
                      className="text-surface-dim hover:text-rose-400 p-0.5 cursor-pointer"
                      title="할인 해제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-dim">받을 금액 (실결제액)</span>
            <span className="text-lg font-bold font-mono tabular-nums text-white">
              {totalAmount.toLocaleString()}원
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-dim">받은 현금</span>
            <div className="flex items-center space-x-2">
              <motion.span
                key={effectiveReceived}
                initial={{ scale: 1.07 }}
                animate={{ scale: 1 }}
                transition={POS_BUMP_TRANSITION}
                className="text-lg font-bold font-mono tabular-nums text-emerald-400 inline-block origin-right"
              >
                {effectiveReceived.toLocaleString()}원
              </motion.span>
              {cashReceived > 0 && (
                <button
                  type="button"
                  onClick={() => setCashReceived(0)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 active:scale-90 text-surface-dim hover:text-white transition-all cursor-pointer"
                  title="초기화"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-surface-dim">거스름돈</span>
            <motion.span
              key={changeAmount}
              initial={{ scale: 1.07 }}
              animate={{ scale: 1 }}
              transition={POS_BUMP_TRANSITION}
              className={`text-xl font-black font-mono tabular-nums inline-block origin-right ${
                isInsufficient ? 'text-rose-400' : 'text-amber-300'
              }`}
            >
              {isInsufficient
                ? `${Math.abs(changeAmount).toLocaleString()}원 부족`
                : `${changeAmount.toLocaleString()}원`}
            </motion.span>
          </div>
        </div>

        {/* Quick Cash Buttons */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 5000, 10000, 50000].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => handleAddCash(amt)}
                className="py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/15 active:scale-95 border border-white/10 font-mono tabular-nums text-xs sm:text-sm font-bold text-white transition-all cursor-pointer"
              >
                +{amt.toLocaleString()}
              </button>
            ))}
            <button
              type="button"
              onClick={handleExactAmount}
              className="py-2.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 border border-emerald-500/30 text-xs sm:text-sm font-bold text-emerald-300 transition-all cursor-pointer"
            >
              정액 수납
            </button>
          </div>
        </div>

        {/* Optional Buyer Name Input */}
        <div className="pt-1">
          <label className="block text-[11px] font-semibold text-surface-dim mb-1.5">
            주문자 이름 (선택)
          </label>
          <div className="relative">
            <User className="w-3.5 h-3.5 text-surface-dim absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              placeholder="이름 입력 (생략 가능)"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:border-emerald-500/50 focus:outline-none text-xs sm:text-sm text-white placeholder:text-surface-dim/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isInsufficient}
            onClick={handleConfirm}
            className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>현금 결제 완료</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
