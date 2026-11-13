import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PosCategory, PosItem } from '../../types/pos';
import { POS_MODAL_BACKDROP_TRANSITION, POS_MODAL_PANEL_TRANSITION, EASE_OUT_EXPO } from '../../utils/motion';

interface PosItemFormModalProps {
  item?: PosItem | null; // null이면 신규 추가
  categories: PosCategory[];
  onSave: (savedItem: PosItem) => void;
  onClose: () => void;
}

export function PosItemFormModal({ item, categories, onSave, onClose }: PosItemFormModalProps) {
  const isEdit = !!item;

  const resolveCat = (val?: string) => {
    if (!val) return categories[0]?.name || '';
    const matched = categories.find(
      c => c.name.trim().toLowerCase() === val.trim().toLowerCase()
    );
    return matched ? matched.name : categories[0]?.name || val;
  };

  const [name, setName] = useState(item?.name || '');
  const [categoryId, setCategoryId] = useState(() => resolveCat(item?.categoryId));
  const [price, setPrice] = useState<number | ''>(item?.price ?? 1000);
  const [isSoldOut, setIsSoldOut] = useState<boolean>(() => Boolean(item?.isSoldOut));
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite ?? false);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategoryId(resolveCat(item.categoryId));
      setPrice(item.price);
      setIsSoldOut(Boolean(item.isSoldOut));
      setIsFavorite(item.isFavorite);
      setIsActive(item.isActive);
    }
  }, [item, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('상품명을 입력해주세요.');
      return;
    }
    if (!categoryId) {
      setError('카테고리를 선택해주세요.');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('올바른 판매 가격을 입력해주세요.');
      return;
    }

    const saved: PosItem = {
      id: item ? item.id : `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      categoryId,
      price: numPrice,
      stock: item?.stock ?? 999,
      isSoldOut,
      totalSold: item?.totalSold || 0,
      isFavorite,
      isActive,
      updatedAt: new Date().toISOString(),
    };

    onSave(saved);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={POS_MODAL_BACKDROP_TRANSITION}
      onClick={onClose}
      className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={POS_MODAL_PANEL_TRANSITION}
        onClick={e => e.stopPropagation()}
        className="bg-[#0a1120] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-primary/40">
          <div>
            <h3 className="text-base font-bold text-white">
              {isEdit ? '상품 정보 수정' : '신규 상품 등록'}
            </h3>
            <p className="text-[11px] text-surface-dim mt-0.5">
              {isEdit
                ? `누적 판매 ${(item?.totalSold || 0).toLocaleString()}개`
                : '매점에 진열할 새 품목을 등록합니다.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key="item-form-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: EASE_OUT_EXPO }}
                className="flex items-center space-x-2 text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-surface-dim mb-1.5">
              상품명 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 포카리스웨트 340ml, 육개장 사발면"
              className="w-full bg-primary border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/40"
              required
              autoFocus
            />
          </div>

          {/* Category & Price in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-surface-dim mb-1.5">
                카테고리 <span className="text-rose-400">*</span>
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-primary border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-secondary"
              >
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name} className="bg-[#0a1120] text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-dim mb-1.5">
                판매 가격 (원) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={price === 0 || price === '' ? '' : String(price)}
                  onChange={e => {
                    const digits = e.target.value.replace(/[^0-9]/g, '');
                    setPrice(digits === '' ? 0 : Math.min(999999999, parseInt(digits, 10)));
                  }}
                  placeholder="0"
                  className="w-full bg-primary border border-white/10 rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-white font-mono tabular-nums placeholder:text-surface-dim/50 focus:outline-none focus:border-secondary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-dim font-bold">
                  원
                </span>
              </div>
            </div>
          </div>

          {/* Status & Menu Display Segmented Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-surface-dim mb-1.5">
                판매 상태
              </label>
              <div className="grid grid-cols-2 gap-1 bg-primary p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSoldOut(false)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    !isSoldOut
                      ? 'bg-secondary text-white'
                      : 'text-surface-dim hover:text-white'
                  }`}
                >
                  판매중
                </button>
                <button
                  type="button"
                  onClick={() => setIsSoldOut(true)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isSoldOut
                      ? 'bg-rose-600 text-white'
                      : 'text-surface-dim hover:text-white'
                  }`}
                >
                  품절
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-dim mb-1.5">
                메뉴판 노출
              </label>
              <div className="grid grid-cols-2 gap-1 bg-primary p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-secondary text-white'
                      : 'text-surface-dim hover:text-white'
                  }`}
                >
                  진열
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    !isActive
                      ? 'bg-white/15 text-white'
                      : 'text-surface-dim hover:text-white'
                  }`}
                >
                  숨김
                </button>
              </div>
            </div>
          </div>

          {/* Favorite Toggle Row */}
          <button
            type="button"
            onClick={() => setIsFavorite(prev => !prev)}
            role="switch"
            aria-checked={isFavorite}
            className="w-full py-2.5 px-3.5 rounded-xl bg-primary border border-white/10 hover:border-white/20 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="text-left">
              <div className="text-xs font-semibold text-white">인기 메뉴 상단 노출</div>
              <div className="text-[11px] text-surface-dim mt-0.5">
                즐겨찾기 탭 및 메뉴판 상단에 우선 배치합니다
              </div>
            </div>
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                isFavorite ? 'bg-secondary' : 'bg-white/15'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isFavorite ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          {/* Footer Submit Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2.5 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white whitespace-nowrap transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-secondary text-white hover:bg-secondary/90 whitespace-nowrap transition-colors cursor-pointer"
            >
              {isEdit ? '저장' : '상품 등록'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
