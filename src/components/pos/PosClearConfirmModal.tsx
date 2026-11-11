import { motion } from 'motion/react';
import { POS_MODAL_BACKDROP_TRANSITION, POS_MODAL_PANEL_TRANSITION } from '../../utils/motion';

interface PosClearConfirmModalProps {
  onConfirm: () => void;
  onClose: () => void;
  totalItems: number;
}

export function PosClearConfirmModal({ onConfirm, onClose, totalItems }: PosClearConfirmModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={POS_MODAL_BACKDROP_TRANSITION}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 6 }}
        transition={POS_MODAL_PANEL_TRANSITION}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col relative"
      >
        <h3 className="text-lg font-bold text-white mb-1.5">
          장바구니를 모두 비우시겠습니까?
        </h3>
        <p className="text-xs text-surface-dim mb-6 leading-relaxed">
          현재 선택된 <span className="text-white font-semibold">{totalItems}개</span>의 품목이 주문 목록에서 초기화됩니다.
        </p>

        <div className="flex w-full space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-xs sm:text-sm bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white transition-all cursor-pointer"
          >
            모두 비우기
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
