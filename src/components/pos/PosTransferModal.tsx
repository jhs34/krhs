import { useState } from 'react';
import { Check, X, Ticket } from 'lucide-react';
import { motion } from 'motion/react';
import { PosGifticon } from '../../types/pos';

interface PosTransferModalProps {
  totalAmount: number; // 실제 결제 대상 금액 (기프티콘 할인 후 실결제액)
  originalTotalAmount?: number; // 할인 전 원래 정가
  appliedGifticons?: PosGifticon[]; // 적용된 기프티콘 목록
  onOpenGifticonModal?: () => void;
  onRemoveGifticon?: (gifticonId: string) => void;
  onConfirmPayment: (buyerName?: string, memo?: string) => void;
  onClose: () => void;
}

export function PosTransferModal({
  totalAmount,
  originalTotalAmount,
  appliedGifticons,
  onOpenGifticonModal,
  onRemoveGifticon,
  onConfirmPayment,
  onClose,
}: PosTransferModalProps) {
  const activeGifticons = appliedGifticons || [];
  const openModal = onOpenGifticonModal;
  const removeHandler = onRemoveGifticon;

  const [buyerName, setBuyerName] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  const totalDiscount = activeGifticons.reduce((sum, c) => sum + c.amount, 0);

  const handleConfirm = () => {
    onConfirmPayment(buyerName.trim() || undefined, memo.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3.5 border-b border-white/10">
          <div>
            <h3 className="font-bold text-white text-base">계좌이체 결제</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gifticon Row (Unboxed hairline section) */}
        <div className="w-full py-3 border-b border-white/10 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs">
              <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold text-white">기프티콘 할인</span>
              {activeGifticons.length > 0 && (
                <span className="text-amber-400 font-mono tabular-nums font-bold">
                  {activeGifticons.length}장 (-{totalDiscount.toLocaleString()}원)
                </span>
              )}
            </div>

            {openModal && (
              <button
                type="button"
                onClick={openModal}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                {activeGifticons.length > 0 ? '변경' : '+ 번호 입력'}
              </button>
            )}
          </div>

          {activeGifticons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeGifticons.map(c => (
                <div
                  key={c.id}
                  className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-[11px] text-surface-dim"
                >
                  <span className="font-mono font-bold text-white">{c.id}</span>
                  <span className="text-amber-400 font-mono tabular-nums">-{c.amount.toLocaleString()}원</span>
                  {removeHandler && (
                    <button
                      type="button"
                      onClick={() => removeHandler(c.id)}
                      className="text-surface-dim hover:text-white pl-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total Amount Section (Unboxed open typographic focal point) */}
        <div className="w-full py-5 border-b border-white/10 flex items-baseline justify-between">
          <div>
            <span className="text-xs font-bold text-surface-dim block">
              {totalAmount === 0 ? '기프티콘 전액 결제' : '이체 입금 요청 금액'}
            </span>
            {originalTotalAmount && originalTotalAmount !== totalAmount && (
              <span className="text-[11px] text-surface-dim line-through mt-0.5 font-mono tabular-nums block">
                정가 {originalTotalAmount.toLocaleString()}원
              </span>
            )}
          </div>
          <div className="text-3xl font-black text-white font-mono tabular-nums tracking-tight">
            {totalAmount.toLocaleString()}<span className="text-base font-bold text-secondary-container ml-1">원</span>
          </div>
        </div>

        {/* Optional Buyer Name & Memo Inputs */}
        <div className="w-full py-4 text-left space-y-3">
          <div>
            <label className="text-xs font-medium text-surface-dim block mb-1.5">
              결제자(입금자) 이름 <span className="text-white/30 text-[11px]">(선택)</span>
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              placeholder="결제자 / 입금자명 (미입력 가능)"
              maxLength={20}
              className="w-full bg-primary border border-white/10 focus:border-secondary-container rounded-lg px-3 py-2.5 text-xs sm:text-sm text-white placeholder-white/25 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-surface-dim block mb-1.5">
              메모 <span className="text-white/30 text-[11px]">(선택)</span>
            </label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="주문 메모 (선택사항)"
              maxLength={100}
              className="w-full bg-primary border border-white/10 focus:border-secondary-container rounded-lg px-3 py-2.5 text-xs sm:text-sm text-white placeholder-white/25 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex w-full space-x-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-[1.6] py-3 rounded-xl font-bold text-xs sm:text-sm bg-secondary hover:bg-secondary/90 active:scale-[0.99] text-white transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{totalAmount === 0 ? '기프티콘 결제 확인' : '입금 확인 완료'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
