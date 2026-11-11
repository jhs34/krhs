import { useState, useEffect } from 'react';
import { X, AlertCircle, Check, Ban, TrendingUp, Plus } from 'lucide-react';
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
              {isEdit ? `상품 ID: ${item?.id}` : '매점에 진열할 새 품목을 등록합니다.'}
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
                  type="number"
                  min="0"
                  step="50"
                  value={price}
                  onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="1000"
                  className="w-full bg-primary border border-white/10 rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-secondary"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-dim font-bold">
                  원
                </span>
              </div>
            </div>
          </div>

          {/* Status: In Stock (판매중) vs Sold Out (품절) */}
          <div>
            <label className="block text-xs font-semibold text-surface-dim mb-1.5">
              판매 상태
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSoldOut(false)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  !isSoldOut
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-surface-dim hover:text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>판매중 (정상)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSoldOut(true)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isSoldOut
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : 'bg-white/5 border-white/10 text-surface-dim hover:text-white'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>품절</span>
              </button>
            </div>
            {isEdit && (
              <div className="mt-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs text-surface-dim">
                <span className="flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-secondary-container" />
                  <span>누적 판매량</span>
                </span>
                <span className="font-mono font-bold text-white tabular-nums">
                  {(item?.totalSold || 0).toLocaleString()}개 판매됨
                </span>
              </div>
            )}
          </div>

          {/* Favorite & Active Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsFavorite(prev => !prev)}
              className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                isFavorite
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-surface-dim hover:text-white'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${
                  isFavorite ? 'bg-amber-500 text-black font-bold' : 'bg-white/10 text-surface-dim'
                }`}
              >
                ★
              </div>
              <div>
                <div className="text-xs font-bold text-white">인기/즐겨찾기</div>
                <div className="text-[10px] text-surface-dim">
                  {isFavorite ? '상단 탭에 노출' : '일반 품목'}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsActive(prev => !prev)}
              className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                }`}
              >
                {isActive ? '진열' : '숨김'}
              </div>
              <div>
                <div className="text-xs font-bold text-white">진열 상태</div>
                <div className="text-[10px] text-surface-dim">
                  {isActive ? '메뉴판에 노출' : '메뉴판에서 숨김'}
                </div>
              </div>
            </button>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2.5 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-secondary text-white hover:bg-secondary/90 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isEdit ? '변경사항 저장' : '새 상품 등록 완료'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
