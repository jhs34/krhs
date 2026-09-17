import { AlertTriangle, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface PosClearConfirmModalProps {
  onConfirm: () => void;
  onClose: () => void;
  totalItems: number;
}

export function PosClearConfirmModal({ onConfirm, onClose, totalItems }: PosClearConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, filter: 'blur(8px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.9, opacity: 0, filter: 'blur(8px)' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0e1628] border border-white/20 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative"
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          장바구니를 모두 비우시겠습니까?
        </h3>
        <p className="text-xs text-surface-dim mb-5 leading-relaxed">
          현재 담긴 <span className="text-white font-bold">{totalItems}개</span>의 품목이 주문 목록에서 모두 삭제됩니다.
        </p>

        <div className="flex w-full space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-xs md:text-sm bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 rounded-xl font-bold text-xs md:text-sm bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-red-900/30"
          >
            <Trash2 className="w-4 h-4" />
            <span>모두 비우기</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
