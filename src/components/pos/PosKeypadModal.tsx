import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { CartItem } from '../../types/pos';
import { POS_MODAL_BACKDROP_TRANSITION, POS_MODAL_PANEL_TRANSITION, POS_BUMP_TRANSITION } from '../../utils/motion';

interface PosKeypadModalProps {
  cartItem: CartItem;
  onConfirm: (newCount: number) => void;
  onClose: () => void;
}

export function PosKeypadModal({ cartItem, onConfirm, onClose }: PosKeypadModalProps) {
  const [valStr, setValStr] = useState<string>(String(cartItem.count));
  const maxLimit = 999;

  const handleDigit = (digit: string) => {
    if (valStr === '0') {
      setValStr(digit);
    } else if (valStr.length < 3) {
      setValStr(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (valStr.length <= 1) {
      setValStr('0');
    } else {
      setValStr(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setValStr('0');
  };

  const handleAddPreset = (add: number) => {
    const current = parseInt(valStr, 10) || 0;
    const next = current + add;
    setValStr(String(Math.min(next, maxLimit)));
  };

  const currentCount = parseInt(valStr, 10) || 0;

  const handleSave = () => {
    if (currentCount <= 0) return;
    const finalCount = Math.min(currentCount, maxLimit);
    onConfirm(finalCount);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={POS_MODAL_BACKDROP_TRANSITION}
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 6 }}
        transition={POS_MODAL_PANEL_TRANSITION}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-sm max-h-[95vh] overflow-y-auto custom-scrollbar rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-bold text-white text-base">수량 직접 입력</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Info & Live Readout (Unboxed, hairline divided) */}
        <div className="py-4 border-b border-white/10 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{cartItem.item.name}</div>
            <div className="text-xs text-surface-dim font-mono tabular-nums mt-1">
              단가 {cartItem.item.price.toLocaleString()}원
            </div>
            <div className="text-xs text-secondary-container font-mono tabular-nums mt-0.5">
              소계 {(currentCount * cartItem.item.price).toLocaleString()}원
            </div>
          </div>

          <div className="text-right shrink-0">
            <motion.div
              key={valStr}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={POS_BUMP_TRANSITION}
              className="text-3xl sm:text-4xl font-black tracking-tight font-mono tabular-nums text-white leading-none origin-right"
            >
              {valStr}
              <span className="text-sm font-normal text-surface-dim ml-1">개</span>
            </motion.div>
          </div>
        </div>

        {/* Quick Add Presets */}
        <div className="grid grid-cols-4 gap-1.5 py-3 border-b border-white/10">
          {[1, 5, 10, 20].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleAddPreset(n)}
              className="py-2 rounded-lg text-xs font-bold font-mono tabular-nums bg-white/[0.03] hover:bg-white/[0.08] text-secondary-container border border-white/5 active:scale-95 transition-all cursor-pointer"
            >
              +{n}
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-1.5 my-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
            <button
              key={btn}
              type="button"
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === '⌫') handleBackspace();
                else handleDigit(btn);
              }}
              className={`py-3 rounded-lg text-lg font-bold font-mono tabular-nums transition-all active:scale-95 cursor-pointer ${
                btn === 'C'
                  ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                  : btn === '⌫'
                  ? 'bg-white/5 text-surface-dim hover:bg-white/10'
                  : 'bg-white/[0.03] text-white hover:bg-white/[0.08] border border-white/5'
              }`}
            >
              {btn}
            </button>
          ))}
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          disabled={currentCount <= 0}
          onClick={handleSave}
          className="w-full mt-1 py-3.5 rounded-xl font-bold text-sm text-white bg-secondary hover:bg-secondary/90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>수량 적용</span>
        </button>
      </motion.div>
    </motion.div>
  );
}
