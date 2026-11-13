import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { POS_MODAL_BACKDROP_TRANSITION, POS_MODAL_PANEL_TRANSITION } from '../../utils/motion';

interface PosTransferModalProps {
  totalAmount: number;
  originalTotalAmount?: number;
  discountAmount?: number;
  onOpenDiscountModal?: () => void;
  onClearDiscount?: () => void;
  onConfirmPayment: (buyerName?: string, memo?: string) => void;
  onClose: () => void;
}

export const PosTransferModal: React.FC<PosTransferModalProps> = ({
  totalAmount,
  originalTotalAmount,
  discountAmount = 0,
  onOpenDiscountModal,
  onClearDiscount,
  onConfirmPayment,
  onClose,
}) => {
  const [buyerName, setBuyerName] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmPayment(buyerName.trim() || undefined, memo.trim() || undefined);
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
      <motion.form
        onSubmit={handleSubmit}
        initial={{ scale: 0.96, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 6 }}
        transition={POS_MODAL_PANEL_TRANSITION}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white">계좌이체 결제 확인</h3>
            <p className="text-xs text-surface-dim mt-0.5">송금 내역 확인 후 결제 완료를 눌러주세요</p>
          </div>

          {onOpenDiscountModal && (
            <button
              type="button"
              onClick={onOpenDiscountModal}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-surface-dim hover:text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {discountAmount > 0 ? '할인 수정' : '할인 입력'}
            </button>
          )}
        </div>

        <div className="py-3 border-y border-white/10 flex flex-col gap-2">
          {discountAmount > 0 && originalTotalAmount !== undefined && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-dim">적용 전 금액</span>
                <span className="font-mono tabular-nums text-surface-dim">
                  {originalTotalAmount.toLocaleString()}원
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-bold">할인 적용 금액</span>
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono tabular-nums text-amber-300 font-bold">
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
            <span className="text-xs font-medium text-surface-dim">이체 확인할 금액</span>
            <span className="text-xl font-bold font-mono tabular-nums text-secondary-container">
              {totalAmount.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* Buyer / Sender Name Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-surface-dim mb-1.5">
              입금자 / 주문자 이름 (선택)
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              placeholder="입금자명 입력 (생략 가능)"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:border-secondary focus:outline-none text-xs sm:text-sm text-white placeholder:text-surface-dim/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-surface-dim mb-1.5">
              메모 (선택)
            </label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="비고 사항 (생략 가능)"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus:border-secondary focus:outline-none text-xs sm:text-sm text-white placeholder:text-surface-dim/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="submit"
            className="py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 active:scale-[0.98] text-white text-xs sm:text-sm font-bold whitespace-nowrap flex items-center justify-center transition-[background-color,transform] cursor-pointer"
          >
            이체 확인 완료
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
};
