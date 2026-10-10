import { useState } from 'react';
import { X, Check, Banknote, Coins, ArrowRight, User, FileText, Ticket } from 'lucide-react';
import { motion } from 'motion/react';
import { PosGifticon } from '../../types/pos';

interface PosCashModalProps {
  totalAmount: number; // 실제 결제 대상 금액 (기프티콘 할인 후 실결제액)
  originalTotalAmount?: number; // 할인 전 정가
  appliedGifticons?: PosGifticon[]; // 적용된 기프티콘 목록
  onOpenGifticonModal?: () => void;
  onRemoveGifticon?: (gifticonId: string) => void;
  onConfirmPayment: (received: number, change: number, buyerName?: string, memo?: string) => void;
  onClose: () => void;
}

export function PosCashModal({
  totalAmount,
  originalTotalAmount,
  appliedGifticons,
  onOpenGifticonModal,
  onRemoveGifticon,
  onConfirmPayment,
  onClose,
}: PosCashModalProps) {
  const activeGifticons = appliedGifticons || [];
  const openModal = onOpenGifticonModal;
  const removeHandler = onRemoveGifticon;

  const [receivedStr, setReceivedStr] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  const receivedAmount = parseInt(receivedStr, 10) || 0;
  const changeAmount = receivedAmount - totalAmount;
  const isSufficient = receivedAmount >= totalAmount;

  const totalDiscount = activeGifticons.reduce((sum, c) => sum + c.amount, 0);

  const handleDigit = (digit: string) => {
    if (receivedStr === '0') {
      setReceivedStr(digit);
    } else if (receivedStr.length < 8) {
      setReceivedStr(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (receivedStr.length <= 1) {
      setReceivedStr('');
    } else {
      setReceivedStr(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setReceivedStr('');
  };

  const handleAddQuickCash = (amount: number) => {
    const next = (parseInt(receivedStr, 10) || 0) + amount;
    setReceivedStr(String(next));
  };

  const handleSetExact = () => {
    setReceivedStr(String(totalAmount));
  };

  const handleComplete = () => {
    if (!isSufficient) return;
    onConfirmPayment(receivedAmount, changeAmount, buyerName.trim() || undefined, memo.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.92, opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1224] border border-white/20 w-full max-w-md max-h-[95vh] overflow-y-auto custom-scrollbar rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">현금 결제 처리</h3>
              <p className="text-[11px] text-surface-dim">받은 금액을 입력하여 거스름돈을 계산합니다</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-surface-dim hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gifticon Section in Modal */}
        <div className="mt-3 p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
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

        {/* Display comparison: Total vs Received vs Change */}
        <div className="grid grid-cols-2 gap-2.5 my-3">
          {/* Total Amount to pay */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-col">
            <span className="text-[11px] font-bold text-surface-dim">실 결제 대상 금액</span>
            <span className="text-xl md:text-2xl font-black text-white mt-1 font-mono">
              {totalAmount.toLocaleString()}원
            </span>
            {originalTotalAmount && originalTotalAmount !== totalAmount && (
              <span className="text-[10px] text-surface-dim line-through mt-0.5 font-mono">
                정가 {originalTotalAmount.toLocaleString()}원
              </span>
            )}
          </div>

          {/* Received Input display */}
          <div className="bg-secondary/15 border border-secondary/30 rounded-2xl p-3 flex flex-col">
            <span className="text-[11px] font-bold text-secondary-fixed">받은 현금</span>
            <span className="text-xl md:text-2xl font-black text-white mt-1 font-mono">
              {receivedAmount > 0 ? `${receivedAmount.toLocaleString()}원` : '0원'}
            </span>
          </div>
        </div>

        {/* Change Banner */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
          totalAmount === 0
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            : receivedAmount === 0
            ? 'bg-white/5 border-white/10 text-surface-dim'
            : isSufficient
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            : 'bg-red-500/15 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 shrink-0" />
            <span className="text-xs md:text-sm font-bold">
              {totalAmount === 0
                ? '기프티콘으로 전액 결제 (추가 결제액 0원)'
                : receivedAmount === 0
                ? '받은 금액을 입력해주세요'
                : isSufficient
                ? '내어줄 거스름돈'
                : '부족한 금액'}
            </span>
          </div>

          <span className="text-lg md:text-xl font-black font-mono">
            {totalAmount === 0
              ? '0원'
              : receivedAmount === 0
              ? '0원'
              : isSufficient
              ? `${changeAmount.toLocaleString()}원`
              : `-${Math.abs(changeAmount).toLocaleString()}원`}
          </span>
        </div>

        {/* Optional Buyer Name & Memo Inputs */}
        <div className="mt-2.5 mb-1 space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <label className="text-[11px] font-bold text-surface-dim flex items-center space-x-1">
                <User className="w-3 h-3 text-emerald-400" />
                <span>결제자 이름</span>
              </label>
              <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">선택사항</span>
            </div>
            <input
              type="text"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              placeholder="학생 이름 / 학번 등 (미입력 가능)"
              maxLength={20}
              className="w-full bg-black/40 border border-white/10 focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <label className="text-[11px] font-bold text-surface-dim flex items-center space-x-1">
                <FileText className="w-3 h-3 text-emerald-400" />
                <span>메모</span>
              </label>
              <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">선택사항</span>
            </div>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="주문 메모 (선택사항)"
              maxLength={100}
              className="w-full bg-black/40 border border-white/10 focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Quick Cash Buttons */}
        {totalAmount > 0 && (
          <div className="grid grid-cols-4 gap-1.5 my-2.5">
            <button
              type="button"
              onClick={handleSetExact}
              className="py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all border border-white/10"
            >
              딱 맞게
            </button>
            <button
              type="button"
              onClick={() => handleAddQuickCash(1000)}
              className="py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/15 active:scale-95 text-white/90 transition-all border border-white/5"
            >
              +1,000
            </button>
            <button
              type="button"
              onClick={() => handleAddQuickCash(5000)}
              className="py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/15 active:scale-95 text-white/90 transition-all border border-white/5"
            >
              +5,000
            </button>
            <button
              type="button"
              onClick={() => handleAddQuickCash(10000)}
              className="py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/15 active:scale-95 text-white/90 transition-all border border-white/5"
            >
              +10,000
            </button>
          </div>
        )}

        {/* Numeric Keypad Grid */}
        {totalAmount > 0 && (
          <div className="grid grid-cols-3 gap-2 my-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') handleClear();
                  else if (k === '⌫') handleBackspace();
                  else handleDigit(k);
                }}
                className={`py-2.5 rounded-xl font-black text-base sm:text-lg active:scale-95 transition-all flex items-center justify-center ${
                  k === 'C'
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                    : k === '⌫'
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div className="flex space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl font-bold text-xs md:text-sm bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            disabled={totalAmount > 0 && !isSufficient}
            onClick={handleComplete}
            className="flex-[2] py-3.5 rounded-2xl font-bold text-xs md:text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none text-white transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/40"
          >
            <Check className="w-4 h-4" />
            <span>
              {totalAmount === 0 ? '기프티콘 결제 완료' : '현금 결제 완료'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
