import { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Plus } from 'lucide-react';
import { PosCategory, PosItem } from '../../types/pos';

interface PosItemFormModalProps {
  item?: PosItem | null; // null이면 신규 추가
  categories: PosCategory[];
  onSave: (savedItem: PosItem) => void;
  onClose: () => void;
}

export function PosItemFormModal({ item, categories, onSave, onClose }: PosItemFormModalProps) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name || '');
  const [categoryId, setCategoryId] = useState(item?.categoryId || (categories[0]?.id || ''));
  const [price, setPrice] = useState<number | ''>(item?.price ?? 1000);
  const [stock, setStock] = useState<number | ''>(item?.stock ?? 20);
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite ?? false);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [barcode, setBarcode] = useState(item?.barcode || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategoryId(item.categoryId);
      setPrice(item.price);
      setStock(item.stock);
      setIsFavorite(item.isFavorite);
      setIsActive(item.isActive);
      setBarcode(item.barcode || '');
    }
  }, [item]);

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
    const numStock = Number(stock);
    if (isNaN(numStock) || numStock < 0) {
      setError('올바른 재고 수량을 입력해주세요.');
      return;
    }

    const saved: PosItem = {
      id: item ? item.id : `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      categoryId,
      price: numPrice,
      stock: numStock,
      isFavorite,
      isActive,
      barcode: barcode.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSave(saved);
  };

  const addStockQuick = (amount: number) => {
    const current = typeof stock === 'number' ? stock : 0;
    setStock(Math.max(0, current + amount));
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/15 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEdit ? '상품 정보 수정' : '신규 상품 등록'}
              </h3>
              <p className="text-[11px] text-surface-dim">
                {isEdit ? `ID: ${item?.id}` : '매점에 진열할 새 품목을 등록합니다.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-xs text-red-300 bg-red-500/15 border border-red-500/30 px-3.5 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-surface-dim mb-1.5">
              상품명 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 포카리스웨트 340ml, 육개장 사발면"
              className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary placeholder:text-surface-dim/40"
              required
              autoFocus
            />
          </div>

          {/* Category & Price in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-surface-dim mb-1.5">
                카테고리 <span className="text-red-400">*</span>
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-secondary"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-[#0f172a] text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-dim mb-1.5">
                판매 가격 (원) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={price}
                  onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="1000"
                  className="w-full bg-[#1e293b] border border-white/10 rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-secondary"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-dim font-bold">
                  원
                </span>
              </div>
            </div>
          </div>

          {/* Stock & Quick Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-surface-dim">
                재고 수량 (개) <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => addStockQuick(5)}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/5 hover:bg-white/10 text-secondary border border-white/10"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => addStockQuick(10)}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/5 hover:bg-white/10 text-secondary border border-white/10"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => addStockQuick(20)}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/5 hover:bg-white/10 text-secondary border border-white/10"
                >
                  +20
                </button>
                <button
                  type="button"
                  onClick={() => setStock(0)}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30"
                >
                  0(품절)
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={stock}
                onChange={e => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full bg-[#1e293b] border border-white/10 rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-secondary"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-dim font-bold">
                개
              </span>
            </div>
          </div>

          {/* Barcode (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-surface-dim mb-1.5">
              바코드 번호 (선택)
            </label>
            <input
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              placeholder="바코드 스캐너 입력 또는 공란"
              className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-secondary placeholder:text-surface-dim/40"
            />
          </div>

          {/* Favorite & Active Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsFavorite(prev => !prev)}
              className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                isFavorite
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-surface-dim hover:text-white'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm ${
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
              className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/15 border-red-500/40 text-red-300'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
                }`}
              >
                {isActive ? 'ON' : 'OFF'}
              </div>
              <div>
                <div className="text-xs font-bold text-white">판매 상태</div>
                <div className="text-[10px] text-surface-dim">
                  {isActive ? '정상 판매 중' : '임시 판매 중단'}
                </div>
              </div>
            </button>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors border border-white/10"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-secondary text-on-secondary hover:brightness-110 transition-all shadow-md flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isEdit ? '변경사항 저장' : '새 상품 등록 완료'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
