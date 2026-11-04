import { useState } from 'react';
import { X, Check, Ticket } from 'lucide-react';
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-md max-h-[95vh] overflow-y-auto custom-scrollbar rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div>
            <h3 className="font-bold text-white text-base">현금 결제 처리</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gifticon Row (Unboxed hairline section) */}
        <div className="py-3 border-b border-white/10 space-y-2">
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

        {/* Financial Comparison Strip (Unboxed divide-x) */}
        <div className="grid grid-cols-2 divide-x divide-white/10 py-3.5 border-b border-white/10">
          <div className="pr-4">
            <span className="text-[11px] font-medium text-surface-dim block">실 결제 금액</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-1 font-mono tabular-nums block">
              {totalAmount.toLocaleString()}원
            </span>
            {originalTotalAmount && originalTotalAmount !== totalAmount && (
              <span className="text-[11px] text-surface-dim line-through font-mono tabular-nums">
                정가 {originalTotalAmount.toLocaleString()}원
              </span>
            )}
          </div>

          <div className="pl-4">
            <span className="text-[11px] font-medium text-secondary-container block">받은 현금</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-1 font-mono tabular-nums block">
              {receivedAmount > 0 ? `${receivedAmount.toLocaleString()}원` : '0원'}
            </span>
          </div>
        </div>

        {/* Change Readout Row (Unboxed hairline row) */}
        <div className="py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-surface-dim">
            {totalAmount === 0
              ? '기프티콘 전액 결제 (추가 수납 없음)'
              : receivedAmount === 0
              ? '받은 금액을 입력하세요'
              : isSufficient
              ? '거스름돈'
              : '부족한 금액'}
          </span>

          <span
            className={`text-lg sm:text-xl font-black font-mono tabular-nums ${
              totalAmount === 0 || (receivedAmount > 0 && isSufficient)
                ? 'text-emerald-400'
                : receivedAmount === 0
                ? 'text-surface-dim'
                : 'text-rose-400'
            }`}
          >
            {totalAmount === 0 || receivedAmount === 0
              ? '0원'
              : isSufficient
              ? `${changeAmount.toLocaleString()}원`
              : `-${Math.abs(changeAmount).toLocaleString()}원`}
          </span>
        </div>

        {/* Optional Buyer Name & Memo Inputs */}
        <div className="grid grid-cols-2 gap-2.5 py-3 border-b border-white/10">
          <div>
            <label className="text-[11px] font-medium text-surface-dim block mb-1">
              결제자 이름 <span className="text-white/30">(선택)</span>
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              placeholder="이름 / 학번"
              maxLength={20}
              className="w-full bg-primary border border-white/10 focus:border-secondary-container rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/25 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-surface-dim block mb-1">
              메모 <span className="text-white/30">(선택)</span>
            </label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="주문 메모"
              maxLength={100}
              className="w-full bg-primary border border-white/10 focus:border-secondary-container rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/25 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Quick Cash Buttons */}
        {totalAmount > 0 && (
          <div className="grid grid-cols-4 gap-1.5 pt-3">
            <button
              type="button"
              onClick={handleSetExact}
              className="py-2 rounded-lg text-xs font-bold bg-secondary/20 hover:bg-secondary/30 text-secondary-container border border-secondary/30 active:scale-95 transition-all cursor-pointer"
            >
              딱 맞게
            </button>
            {[1000, 5000, 10000].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => handleAddQuickCash(amt)}
                className="py-2 rounded-lg text-xs font-bold font-mono tabular-nums bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/5 active:scale-95 transition-all cursor-pointer"
              >
                +{amt.toLocaleString()}
              </button>
            ))}
          </div>
        )}

        {/* Numeric Keypad Grid */}
        {totalAmount > 0 && (
          <div className="grid grid-cols-3 gap-1.5 my-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') handleClear();
                  else if (k === '⌫') handleBackspace();
                  else handleDigit(k);
                }}
                className={`py-2.5 rounded-lg font-bold font-mono tabular-nums text-base active:scale-95 transition-all flex items-center justify-center cursor-pointer ${
                  k === 'C'
                    ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                    : k === '⌫'
                    ? 'bg-white/5 text-surface-dim hover:bg-white/10'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/5'
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
            className="flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            disabled={totalAmount > 0 && !isSufficient}
            onClick={handleComplete}
            className="flex-[2] py-3 rounded-xl font-bold text-xs sm:text-sm bg-secondary hover:bg-secondary/90 active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none text-white transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
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
