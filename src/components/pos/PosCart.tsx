import React from 'react';
import {
  Trash2,
  Plus,
  Minus,
  Banknote,
  Building2,
  ShoppingCart,
  Loader2,
  X,
  Ticket,
} from 'lucide-react';
import { CartItem } from '../../types/pos';
import { motion, AnimatePresence } from 'motion/react';

interface PosCartProps {
  cart: CartItem[];
  discountAmount?: number;
  onOpenDiscountModal?: () => void;
  onClearDiscount?: () => void;
  isProcessing: boolean;
  isOnline: boolean;
  onUpdateCount: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onRequestClear: () => void;
  onOpenKeypad: (cartItem: CartItem) => void;
  onRequestCashPayment: () => void;
  onRequestTransferPayment: () => void;
}

export const PosCart: React.FC<PosCartProps> = ({
  cart,
  discountAmount = 0,
  onOpenDiscountModal,
  onClearDiscount,
  isProcessing,
  isOnline,
  onUpdateCount,
  onRemoveItem,
  onRequestClear,
  onOpenKeypad,
  onRequestCashPayment,
  onRequestTransferPayment,
}) => {
  const totalAmount = cart.reduce((sum, item) => sum + item.item.price * item.count, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.count, 0);
  const effectiveDiscount = Math.min(totalAmount, Math.max(0, discountAmount));
  const payableAmount = Math.max(0, totalAmount - effectiveDiscount);

  const canCheckout = cart.length > 0 && !isProcessing && isOnline;

  return (
    <div className="w-full h-full bg-[#0a1120] border-t md:border-t-0 md:border-l border-white/10 flex flex-col shrink-0 select-none overflow-hidden">
      {/* Cart Header (h-12 matching PosMenuGrid category strip) */}
      <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between bg-[#0a1120]/60 shrink-0">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-4 h-4 text-secondary-container shrink-0" />
          <h2 className="text-sm font-bold text-white tracking-tight">주문 내역</h2>
          {totalItems > 0 && (
            <span className="text-xs font-mono tabular-nums font-bold text-secondary-container">
              {totalItems}개
            </span>
          )}
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={onRequestClear}
            disabled={isProcessing}
            className="inline-flex items-center justify-center space-x-1 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 h-7 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>비우기</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 divide-y divide-white/8">
        <AnimatePresence initial={false}>
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-surface-dim/50">
              <ShoppingCart className="w-8 h-8 stroke-[1.5] text-surface-dim/30 mb-2.5" />
              <p className="text-xs sm:text-sm font-medium text-surface-dim/70">장바구니가 비어 있습니다</p>
              <p className="text-[11px] mt-1 text-surface-dim/40">메뉴를 터치하면 이곳에 담깁니다</p>
            </div>
          ) : (
            cart.map(({ item, count }) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.14 }}
                className="py-2.5 px-1 flex flex-col gap-2 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">{item.name}</h4>
                    <p className="text-[11px] font-mono tabular-nums text-surface-dim mt-0.5">
                      단가 {item.price.toLocaleString()}원
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    disabled={isProcessing}
                    className="p-1 rounded-md text-surface-dim/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="항목 삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  {/* Quantity Stepper & Direct Keypad Trigger */}
                  <div className="flex items-center space-x-1 bg-black/30 p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => onUpdateCount(item.id, -1)}
                      disabled={isProcessing}
                      className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 active:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenKeypad({ item, count })}
                      disabled={isProcessing}
                      className="min-w-[2.25rem] px-1.5 h-7 rounded-md hover:bg-secondary/20 text-center font-mono tabular-nums font-bold text-xs sm:text-sm text-secondary-container transition-colors cursor-pointer"
                      title="수량 직접 입력"
                    >
                      {count}
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateCount(item.id, 1)}
                      disabled={isProcessing}
                      className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 active:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right font-mono tabular-nums font-bold text-white text-xs sm:text-sm">
                    {(item.price * count).toLocaleString()}
                    <span className="text-[11px] font-sans font-normal text-surface-dim ml-0.5">원</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Cart Footer: Single Discount Button + Total + Payment Buttons */}
      <div className="p-4 bg-[#070c18] border-t border-white/10 space-y-3">
        {cart.length > 0 && (
          <div className="pb-2.5 border-b border-white/10">
            {effectiveDiscount > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-surface-dim">
                  <span>적용 전 금액</span>
                  <span className="font-mono tabular-nums text-white">
                    {totalAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={onOpenDiscountModal}
                    className="flex items-center space-x-1.5 text-purple-300 hover:text-purple-200 font-bold cursor-pointer"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>할인 금액 수정</span>
                  </button>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono tabular-nums font-bold text-purple-300">
                      -{effectiveDiscount.toLocaleString()}원
                    </span>
                    {onClearDiscount && (
                      <button
                        type="button"
                        onClick={onClearDiscount}
                        className="p-0.5 rounded bg-white/5 hover:bg-rose-500/20 text-surface-dim hover:text-rose-300 transition-colors cursor-pointer"
                        title="할인 해제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              onOpenDiscountModal && (
                <button
                  type="button"
                  onClick={onOpenDiscountModal}
                  disabled={isProcessing}
                  className="w-full py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/25 flex items-center justify-between text-xs text-purple-200 font-bold transition-colors cursor-pointer"
                >
                  <span className="flex items-center space-x-1.5">
                    <Ticket className="w-3.5 h-3.5 text-purple-400" />
                    <span>할인 금액 입력</span>
                  </span>
                  <span className="text-[11px] text-purple-300/80 font-mono">+ 할인 적용</span>
                </button>
              )
            )}
          </div>
        )}

        {/* Payable Total Display */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-surface-dim">
            {effectiveDiscount > 0 ? '적용 후 금액' : '총 결제 금액'}
          </span>
          <div className="flex items-baseline">
            <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white tracking-tight">
              {payableAmount.toLocaleString()}
            </span>
            <span className="text-xs font-sans font-normal text-surface-dim ml-1">원</span>
          </div>
        </div>

        {/* Payment Action Buttons */}
        {effectiveDiscount > 0 && payableAmount === 0 ? (
          <button
            type="button"
            disabled={!canCheckout}
            onClick={onRequestCashPayment}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-bold transition-all cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Ticket className="w-4 h-4" />
            )}
            <span className="text-xs sm:text-sm">전액 할인 결제 완료 (0원)</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!canCheckout}
              onClick={onRequestCashPayment}
              className="flex items-center justify-center space-x-2 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-bold transition-all cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Banknote className="w-4 h-4" />
              )}
              <span className="text-xs sm:text-sm">현금 결제</span>
            </button>

            <button
              type="button"
              disabled={!canCheckout}
              onClick={onRequestTransferPayment}
              className="flex items-center justify-center space-x-2 py-3 px-3 rounded-xl bg-secondary hover:bg-secondary/90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white font-bold transition-all cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
              <span className="text-xs sm:text-sm">계좌이체</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
