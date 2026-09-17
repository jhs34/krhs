import { Trash2, Plus, Minus, CreditCard, Banknote, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem } from '../../types/pos';

interface PosCartProps {
  cart: CartItem[];
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
  isProcessing = false,
  isOnline = true,
  onUpdateCount,
  onRemoveItem,
  onRequestClear,
  onOpenKeypad,
  onRequestCashPayment,
  onRequestTransferPayment,
}: PosCartProps) {
  const totalCount = cart.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.item.price * item.count, 0);
  const isEmpty = cart.length === 0;

  return (
    <div className="w-full h-full flex flex-col bg-[#070b16] select-none min-w-[260px] overflow-hidden">
      {/* Cart Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#060a14]">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5 text-secondary" />
          <h2 className="font-bold text-white text-base md:text-lg">주문 내역</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-secondary/20 text-secondary-fixed border border-secondary/30">
            {totalCount}개
          </span>
        </div>

        <button
          type="button"
          disabled={isEmpty}
          onClick={onRequestClear}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>비우기</span>
        </button>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-surface-dim">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <ShoppingCart className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-sm font-bold text-white/70">장바구니가 비어 있습니다</p>
            <p className="text-xs text-surface-dim mt-1 max-w-[200px] leading-relaxed">
              좌측 메뉴 목록에서 품목을 터치하여 주문에 추가하세요.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {cart.map(cartItem => {
              const itemTotal = cartItem.item.price * cartItem.count;
              const isMaxStock = cartItem.count >= cartItem.item.stock;

              return (
                <motion.div
                  key={cartItem.item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-3 flex flex-col space-y-2 shadow-sm"
                >
                  {/* Item title & remove */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-sm font-bold text-white leading-tight truncate">
                        {cartItem.item.name}
                      </div>
                      <div className="text-xs text-surface-dim mt-0.5">
                        단가: {cartItem.item.price.toLocaleString()}원
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(cartItem.item.id)}
                      className="text-surface-dim hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity Stepper & Subtotal */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    {/* Stepper */}
                    <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          if (cartItem.count > 1) {
                            onUpdateCount(cartItem.item.id, cartItem.count - 1);
                          } else {
                            onRemoveItem(cartItem.item.id);
                          }
                        }}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      {/* Clickable quantity badge: Opens Keypad */}
                      <button
                        type="button"
                        title="수량 터치하여 직접 입력"
                        onClick={() => onOpenKeypad(cartItem)}
                        className="px-3 py-0.5 rounded-md hover:bg-secondary/20 text-white font-black text-sm tracking-wider font-mono hover:text-secondary-fixed transition-colors"
                      >
                        {cartItem.count}
                      </button>

                      <button
                        type="button"
                        disabled={isMaxStock}
                        onClick={() => onUpdateCount(cartItem.item.id, cartItem.count + 1)}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right">
                      <div className="text-base font-black text-secondary-fixed">
                        {itemTotal.toLocaleString()}
                        <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Cart Footer: Summary & Checkout Buttons */}
      <div className="p-4 bg-[#050812] border-t border-white/10 shrink-0 space-y-3 shadow-2xl">
        {/* Total Price Display */}
        <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-surface-dim font-medium">총 결제 금액</span>
            <div className="text-[11px] text-white/50">총 {totalCount}개 품목</div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tight font-mono">
            {totalAmount.toLocaleString()}
            <span className="text-sm font-normal text-surface-dim ml-1">원</span>
          </div>
        </div>

        {/* Offline Warning Banner if disconnected */}
        {!isOnline && (
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center justify-center space-x-1.5 animate-pulse">
            <span>인터넷 연결 끊김: 네트워크를 재연결해주세요</span>
          </div>
        )}

        {/* Dual Payment Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Transfer */}
          <button
            type="button"
            disabled={isEmpty || isProcessing || !isOnline}
            onClick={onRequestTransferPayment}
            className="py-3.5 px-3 rounded-2xl font-bold text-xs md:text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all flex flex-col items-center justify-center space-y-1 shadow-lg shadow-indigo-950/40 border border-indigo-500/30 relative"
          >
            <div className="flex items-center space-x-1.5">
              <CreditCard className="w-4 h-4" />
              <span>{isProcessing ? '처리 중...' : '계좌이체 완료'}</span>
            </div>
            <span className="text-[10px] text-indigo-200/70 font-normal">농협 계좌 확인</span>
          </button>

          {/* Cash */}
          <button
            type="button"
            disabled={isEmpty || isProcessing || !isOnline}
            onClick={onRequestCashPayment}
            className="py-3.5 px-3 rounded-2xl font-bold text-xs md:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all flex flex-col items-center justify-center space-y-1 shadow-lg shadow-emerald-950/40 border border-emerald-500/30 relative"
          >
            <div className="flex items-center space-x-1.5">
              <Banknote className="w-4 h-4" />
              <span>{isProcessing ? '처리 중...' : '현금 결제'}</span>
            </div>
            <span className="text-[10px] text-emerald-200/70 font-normal">거스름돈 계산</span>
          </button>
        </div>
      </div>
    </div>
  );
}
