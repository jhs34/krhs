import { useState } from 'react';
import { Check, X, QrCode, CreditCard, User, FileText, Ticket } from 'lucide-react';
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.92, opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0b1326] border border-white/20 w-full max-w-sm rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
          <div className="flex items-center space-x-2 text-left">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">계좌이체 결제</h3>
              <p className="text-[11px] text-surface-dim">입금 확인 후 결제를 완료합니다</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-surface-dim hover:text-white hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gifticon Section in Modal */}
        <div className="w-full mb-3.5 p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
              <Ticket className="w-4 h-4 shrink-0" />
              <span>할인 기프티콘</span>
              {activeGifticons.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                  {activeGifticons.length}장 적용 (-{totalDiscount.toLocaleString()}원)
                </span>
              )}
            </div>

            {openModal && (
              <button
                type="button"
                onClick={openModal}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer"
              >
                {activeGifticons.length > 0 ? '기프티콘 추가/변경' : '+ 기프티콘 번호 입력'}
              </button>
            )}
          </div>

          {activeGifticons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
              {activeGifticons.map(c => (
                <div
                  key={c.id}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-200"
                >
                  <span className="font-mono font-bold">{c.id}</span>
                  <span className="text-amber-400 font-mono">(-{c.amount.toLocaleString()}원)</span>
                  {removeHandler && (
                    <button
                      type="button"
                      onClick={() => removeHandler(c.id)}
                      className="text-surface-dim hover:text-white p-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total Amount Box */}
        <div className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 mb-4 text-center">
          <span className="text-xs font-bold text-indigo-300">
            {totalAmount === 0 ? '기프티콘 전액 결제' : '이체 입금 요청 금액'}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-white mt-1 font-mono tracking-tight">
            {totalAmount.toLocaleString()}<span className="text-xl sm:text-2xl font-bold text-indigo-200 ml-1">원</span>
          </div>
          {originalTotalAmount && originalTotalAmount !== totalAmount && (
            <div className="text-xs text-surface-dim line-through mt-1 font-mono">
              정가 {originalTotalAmount.toLocaleString()}원
            </div>
          )}
        </div>

        {/* Optional Buyer Name & Memo Inputs */}
        <div className="w-full mb-5 text-left space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <label className="text-xs font-bold text-surface-dim flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>결제자(입금자) 이름</span>
              </label>
              <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">선택사항</span>
            </div>
            <input
              type="text"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              placeholder="결제자 / 입금자명 (미입력 가능)"
              maxLength={20}
              className="w-full bg-black/40 border border-white/10 focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <label className="text-xs font-bold text-surface-dim flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>메모</span>
              </label>
              <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">선택사항</span>
            </div>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="주문 메모 (선택사항, 예: 요청사항 등)"
              maxLength={100}
              className="w-full bg-black/40 border border-white/10 focus:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex w-full space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl font-bold text-xs md:text-sm bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-[1.5] py-3.5 rounded-xl font-bold text-xs md:text-sm bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-900/30"
          >
            <Check className="w-4 h-4" />
            <span>{totalAmount === 0 ? '기프티콘 결제 확인' : '입금 확인 완료'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
