import { Check, X, QrCode, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';

interface PosTransferModalProps {
  totalAmount: number;
  onConfirmPayment: () => void;
  onClose: () => void;
}

export function PosTransferModal({ totalAmount, onConfirmPayment, onClose }: PosTransferModalProps) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.92, opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0b1326] border border-white/20 w-full max-w-sm rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2 text-left">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">계좌이체 결제</h3>
              <p className="text-[11px] text-surface-dim">입금 확인 후 결제를 완료합니다</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-surface-dim hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Amount Box */}
        <div className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 mb-6 text-center">
          <span className="text-xs font-bold text-indigo-300">이체 입금 요청 금액</span>
          <div className="text-4xl font-black text-white mt-2 font-mono tracking-tight">
            {totalAmount.toLocaleString()}<span className="text-2xl font-bold text-indigo-200 ml-1">원</span>
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
            onClick={onConfirmPayment}
            className="flex-[1.5] py-3.5 rounded-xl font-bold text-xs md:text-sm bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-900/30"
          >
            <Check className="w-4 h-4" />
            <span>입금 확인 완료</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
