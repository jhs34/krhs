import { useState } from 'react';
import { X, Check, Banknote, Coins, ArrowRight, User, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface PosCashModalProps {
  totalAmount: number;
  onConfirmPayment: (received: number, change: number, buyerName?: string, memo?: string) => void;
  onClose: () => void;
}

export function PosCashModal({ totalAmount, onConfirmPayment, onClose }: PosCashModalProps) {
  const [receivedStr, setReceivedStr] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  const receivedAmount = parseInt(receivedStr, 10) || 0;
  const changeAmount = receivedAmount - totalAmount;
  const isSufficient = receivedAmount >= totalAmount;

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

        {/* Display comparison: Total vs Received vs Change */}
        <div className="grid grid-cols-2 gap-2.5 my-3">
          {/* Total Amount to pay */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-col">
            <span className="text-[11px] font-bold text-surface-dim">총 결제 대상 금액</span>
            <span className="text-xl md:text-2xl font-black text-white mt-1">
              {totalAmount.toLocaleString()}원
            </span>
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
          receivedAmount === 0
            ? 'bg-white/5 border-white/10 text-surface-dim'
            : isSufficient
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            : 'bg-red-500/15 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 shrink-0" />
            <span className="text-xs md:text-sm font-bold">
              {receivedAmount === 0
                ? '받은 금액을 입력해주세요'
                : isSufficient
                ? '내어줄 거스름돈'
                : '부족한 금액'}
            </span>
          </div>

          <span className="text-lg md:text-xl font-black font-mono">
            {receivedAmount === 0
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
              placeholder="결제자 이름 (미입력 가능)"
              maxLength={20}
              className="w-full bg-black/40 border border-white/10 focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
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
              placeholder="주문 메모 (선택사항, 예: 요청사항, 메모 등)"
              maxLength={100}
              className="w-full bg-black/40 border border-white/10 focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Quick Amount Presets */}
        <div className="grid grid-cols-5 gap-1.5 my-2.5">
          <button
            type="button"
            onClick={handleSetExact}
            className="py-2 px-1 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 active:scale-95 transition-all text-center"
          >
            딱 맞게
          </button>
          {[1000, 5000, 10000, 50000].map(amt => (
            <button
              key={amt}
              type="button"
              onClick={() => handleAddQuickCash(amt)}
              className="py-2 px-1 rounded-xl text-xs font-bold bg-white/5 text-white border border-white/5 hover:bg-white/10 active:scale-95 transition-all text-center"
            >
              +{amt >= 10000 ? `${amt / 10000}만원` : `${amt / 1000}천원`}
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
            <button
              key={btn}
              type="button"
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === '⌫') handleBackspace();
                else handleDigit(btn);
              }}
              className={`py-3 rounded-xl text-base font-bold transition-all active:scale-95 ${
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

        {/* Complete Payment Button */}
        <button
          type="button"
          disabled={!isSufficient}
          onClick={handleComplete}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center space-x-2 transition-all shadow-lg ${
            isSufficient
              ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] shadow-emerald-900/30'
              : 'bg-white/10 text-white/40 cursor-not-allowed'
          }`}
        >
          <Check className="w-5 h-5" />
          <span>
            {isSufficient
              ? `${changeAmount > 0 ? `거스름돈 ${changeAmount.toLocaleString()}원 반환 및 ` : ''}결제 완료`
              : '받은 금액이 부족합니다'}
          </span>
          {isSufficient && <ArrowRight className="w-4 h-4" />}
        </button>
      </motion.div>
    </div>
  );
}
