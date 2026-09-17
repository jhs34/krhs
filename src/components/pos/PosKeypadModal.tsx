import { useState } from 'react';
import { X, Check, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import { CartItem } from '../../types/pos';

interface PosKeypadModalProps {
  cartItem: CartItem;
  onConfirm: (newCount: number) => void;
  onClose: () => void;
}

export function PosKeypadModal({ cartItem, onConfirm, onClose }: PosKeypadModalProps) {
  const [valStr, setValStr] = useState<string>(String(cartItem.count));
  const maxStock = cartItem.item.stock;

  const handleDigit = (digit: string) => {
    if (valStr === '0') {
      setValStr(digit);
    } else if (valStr.length < 4) {
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
    setValStr(String(Math.min(next, maxStock)));
  };

  const currentCount = parseInt(valStr, 10) || 0;
  const isOverStock = currentCount > maxStock;

  const handleSave = () => {
    if (currentCount <= 0) return;
    const finalCount = Math.min(currentCount, maxStock);
    onConfirm(finalCount);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0c1426] border border-white/20 w-full max-w-sm max-h-[95vh] overflow-y-auto custom-scrollbar rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-secondary" />
            <h3 className="font-bold text-white text-base">수량 직접 입력</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-surface-dim hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Info */}
        <div className="py-3">
          <div className="text-sm font-bold text-white truncate">{cartItem.item.name}</div>
          <div className="text-xs text-surface-dim flex justify-between mt-1">
            <span>단가: {cartItem.item.price.toLocaleString()}원</span>
            <span className="text-emerald-400 font-bold">남은 재고: {maxStock}개</span>
          </div>
        </div>

        {/* Big Display */}
        <div className={`p-4 rounded-2xl border text-center my-1 transition-colors ${
          isOverStock 
            ? 'bg-red-500/10 border-red-500/40 text-red-400' 
            : 'bg-black/50 border-white/15 text-white'
        }`}>
          <div className="text-3xl md:text-4xl font-black tracking-wider font-mono">
            {valStr}
            <span className="text-sm font-normal text-surface-dim ml-1">개</span>
          </div>
          <div className="text-xs font-semibold text-secondary-fixed mt-1">
            소계: {(currentCount * cartItem.item.price).toLocaleString()}원
          </div>
          {isOverStock && (
            <div className="text-[11px] font-bold text-red-400 mt-1">
              * 재고({maxStock}개)를 초과하여 입력할 수 없습니다.
            </div>
          )}
        </div>

        {/* Quick Add Presets */}
        <div className="grid grid-cols-4 gap-2 my-2">
          {[1, 5, 10, 20].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleAddPreset(n)}
              className="py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/15 text-secondary-fixed border border-white/5 active:scale-95 transition-all"
            >
              +{n}개
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 my-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
            <button
              key={btn}
              type="button"
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === '⌫') handleBackspace();
                else handleDigit(btn);
              }}
              className={`py-3.5 rounded-2xl text-lg font-bold transition-all active:scale-95 ${
                btn === 'C'
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  : btn === '⌫'
                  ? 'bg-white/10 text-surface-dim hover:bg-white/20'
                  : 'bg-white/5 text-white hover:bg-white/15 border border-white/5'
              }`}
            >
              {btn}
            </button>
          ))}
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          disabled={currentCount <= 0 || isOverStock}
          onClick={handleSave}
          className="w-full mt-2 py-3.5 rounded-xl font-bold text-sm text-white bg-secondary hover:bg-secondary/90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-lg shadow-secondary/20"
        >
          <Check className="w-4 h-4" />
          <span>수량 적용하기</span>
        </button>
      </motion.div>
    </div>
  );
}
