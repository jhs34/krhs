import { Trash2, Plus, Minus, ShoppingCart, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, PosGifticon } from '../../types/pos';

interface PosCartProps {
  cart: CartItem[];
  appliedGifticons?: PosGifticon[];
  onOpenGifticonModal?: () => void;
  onRemoveGifticon?: (gifticonId: string) => void;
  isProcessing?: boolean;
  isOnline?: boolean;
  onUpdateCount: (itemId: string, newCount: number) => void;
  onRemoveItem: (itemId: string) => void;
  onRequestClear: () => void;
  onOpenKeypad: (cartItem: CartItem) => void;
  onRequestCashPayment: () => void;
  onRequestTransferPayment: () => void;
}

export function PosCart({
  cart,
  appliedGifticons,
  onOpenGifticonModal,
  onRemoveGifticon,
  isProcessing = false,
  isOnline = true,
  onUpdateCount,
  onRemoveItem,
  onRequestClear,
  onOpenKeypad,
  onRequestCashPayment,
  onRequestTransferPayment,
}: PosCartProps) {
  const activeGifticons = appliedGifticons || [];
  const removeHandler = onRemoveGifticon;

  const totalCount = cart.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.item.price * item.count, 0);
  const gifticonDiscountAmount = activeGifticons.reduce((sum, c) => sum + c.amount, 0);
  const actualPayableAmount = Math.max(0, totalAmount - gifticonDiscountAmount);
  const forfeitedExcess = Math.max(0, gifticonDiscountAmount - totalAmount);
  const isEmpty = cart.length === 0;

  return (
    <div className="w-full h-full flex flex-col bg-[#0a1120] border-l border-white/5 select-none min-w-[260px] overflow-hidden">
      {/* Cart Header: Unboxed quiet count & accessible actions */}
      <div className="px-5 h-12 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 leading-none translate-y-[1px]">
          <h2 className="font-sans font-bold text-white text-sm sm:text-base tracking-tight">주문 내역</h2>
          <span className="text-xs font-mono tabular-nums text-surface-dim">
            {totalCount}개
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenGifticonModal && !isEmpty && (
            <button
              type="button"
              onClick={onOpenGifticonModal}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-secondary-container shrink-0" />
              <span className="leading-none translate-y-[0.5px]">
                기프티콘{activeGifticons.length > 0 ? ` (${activeGifticons.length})` : ''}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={isEmpty}
            onClick={onRequestClear}
            className="px-2 py-1 rounded-lg text-xs font-medium text-surface-dim hover:text-rose-400 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer leading-none"
          >
            비우기
          </button>
        </div>
      </div>

      {/* Cart Items List: Clean hairline-divided rows (No heavy card boxes per item!) */}
      <div className="flex-1 overflow-y-auto px-5 custom-scrollbar">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-surface-dim">
            <ShoppingCart className="w-8 h-8 text-white/15 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-bold text-white/70">장바구니가 비어 있습니다</p>
            <p className="text-xs text-surface-dim mt-1 max-w-[200px] leading-relaxed">
              좌측 메뉴에서 상품을 선택하여 주문에 담으세요.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {cart.map(cartItem => {
                const itemTotal = cartItem.item.price * cartItem.count;

                return (
                  <motion.div
                    key={cartItem.item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.16 }}
                    className="py-3.5 flex flex-col space-y-2.5 group"
                  >
                    {/* Top Row: Item Name, Unit Price & Remove */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white leading-snug truncate">
                          {cartItem.item.name}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-surface-dim mt-0.5">
                          단가 {cartItem.item.price.toLocaleString()}원
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(cartItem.item.id)}
                        className="text-surface-dim/60 hover:text-red-400 p-1 transition-colors shrink-0 cursor-pointer"
                        title="품목 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom Row: Clean inline Stepper & Subtotal */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (cartItem.count > 1) {
                              onUpdateCount(cartItem.item.id, cartItem.count - 1);
                            } else {
                              onRemoveItem(cartItem.item.id);
                            }
                          }}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          title="수량 직접 입력"
                          onClick={() => onOpenKeypad(cartItem)}
                          className="min-w-[36px] px-2 py-0.5 rounded-md hover:bg-white/5 text-white font-bold text-sm font-mono tabular-nums text-center transition-colors cursor-pointer"
                        >
                          {cartItem.count}
                        </button>

                        <button
                          type="button"
                          onClick={() => onUpdateCount(cartItem.item.id, cartItem.count + 1)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right font-mono tabular-nums">
                        <span className="text-sm sm:text-base font-bold text-white">
                          {itemTotal.toLocaleString()}
                        </span>
                        <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cart Footer: Open Typographic Summary & Checkout Actions (No nested box inside footer) */}
      <div className="p-5 bg-primary/60 border-t border-white/10 shrink-0 space-y-4">
        <div className="space-y-1.5">
          {gifticonDiscountAmount > 0 && (
            <>
              <div className="flex justify-between items-center text-xs text-surface-dim">
                <span>상품 합계</span>
                <span className="font-mono tabular-nums line-through">{totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center text-xs text-secondary-container font-medium">
                <span>기프티콘 할인 ({activeGifticons.length}장)</span>
                <span className="font-mono tabular-nums">-{gifticonDiscountAmount.toLocaleString()}원</span>
              </div>
              {removeHandler && activeGifticons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {activeGifticons.map(c => (
                    <span
                      key={c.id}
                      className="inline-flex items-center space-x-1 text-[11px] text-surface-dim font-mono"
                    >
                      <span>#{c.id}</span>
                      <button
                        type="button"
                        onClick={() => removeHandler(c.id)}
                        className="hover:text-white text-surface-dim/70 cursor-pointer"
                        title="기프티콘 해제"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {forfeitedExcess > 0 && (
            <div className="flex justify-between items-center text-[11px] text-red-300/80">
              <span>초과 차액 소멸</span>
              <span className="font-mono tabular-nums">{forfeitedExcess.toLocaleString()}원</span>
            </div>
          )}

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-medium text-surface-dim">
              결제 예정 금액 ({totalCount}개)
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono tabular-nums">
              {actualPayableAmount.toLocaleString()}
              <span className="text-sm font-normal text-surface-dim ml-1">원</span>
            </div>
          </div>
        </div>

        {!isOnline && (
          <div className="py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium text-center">
            오프라인 상태: 네트워크 연결을 확인해주세요.
          </div>
        )}

        {/* Dual Payment Actions matching KRHS Brand Palette */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={isEmpty || isProcessing || !isOnline}
            onClick={onRequestTransferPayment}
            className="py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-secondary hover:brightness-110 active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer"
          >
            <span>{isProcessing ? '처리 중...' : '계좌이체 결제'}</span>
          </button>

          <button
            type="button"
            disabled={isEmpty || isProcessing || !isOnline}
            onClick={onRequestCashPayment}
            className="py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-white/10 hover:bg-white/15 border border-white/10 active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer"
          >
            <span>{isProcessing ? '처리 중...' : '현금 결제'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
