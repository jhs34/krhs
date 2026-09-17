import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Search,
  Edit2,
  Trash2,
  Star,
  StarOff,
  Boxes,
  Tag,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  PackageCheck,
  Check,
  Layers,
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  Eye,
  CheckCircle2,
  Save,
  Info,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from 'lucide-react';
import { PosCategory, PosItem, PosPreset } from '../../types/pos';
import { DEFAULT_POS_CATEGORIES, DEFAULT_POS_ITEMS } from '../../data/defaultPosData';
import {
  subscribePosPresets,
  savePosPreset,
  deletePosPreset,
} from '../../services/posFirestore';
import { PosItemFormModal } from './PosItemFormModal';

interface PosProductManagerModalProps {
  categories: PosCategory[];
  items: PosItem[];
  onUpdateItems: (newItems: PosItem[]) => void;
  onUpdateCategories: (newCategories: PosCategory[]) => void;
  onDeleteItem?: (id: string) => void;
  onDeleteCategory?: (id: string) => void;
  onResetToDefault: () => void;
  onApplyPreset?: (categories: PosCategory[], items: PosItem[], presetName: string) => void;
  onClearAllFavorites?: () => void;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const PRESETS_STORAGE_KEY = 'krhs_pos_saved_presets_v2';

export function PosProductManagerModal({
  categories,
  items,
  onUpdateItems,
  onUpdateCategories,
  onDeleteItem,
  onDeleteCategory,
  onResetToDefault,
  onApplyPreset,
  onClearAllFavorites,
  onClose,
  showToast,
}: PosProductManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'presets'>('items');

  // Items Tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [editingItem, setEditingItem] = useState<PosItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<PosItem | null>(null);
  const [showClearFavoritesConfirm, setShowClearFavoritesConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [colDensity, setColDensity] = useState<'auto' | '2' | '3' | '4' | '5'>('auto');

  // Category Tab state
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<PosCategory | null>(null);

  // Presets State
  const [customPresets, setCustomPresets] = useState<PosPreset[]>(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse local presets', e);
    }
    return [];
  });

  // New Preset Form State
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  // Preset Action Modals
  const [applyTargetPreset, setApplyTargetPreset] = useState<PosPreset | null>(null);
  const [deleteTargetPreset, setDeleteTargetPreset] = useState<PosPreset | null>(null);
  const [editingPreset, setEditingPreset] = useState<PosPreset | null>(null);
  const [editPresetName, setEditPresetName] = useState('');
  const [editPresetDesc, setEditPresetDesc] = useState('');
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);

  // Subscribe to Firestore Presets
  useEffect(() => {
    const unsub = subscribePosPresets(
      fetched => {
        setCustomPresets(fetched);
        try {
          localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(fetched));
        } catch (e) {
          console.error('Error caching presets', e);
        }
      },
      err => console.error('Presets subscription error', err)
    );
    return () => unsub();
  }, []);

  // Built-in Default Presets
  const builtInPresets: PosPreset[] = useMemo(() => [
    {
      id: 'preset-empty',
      name: '빈 메뉴판 (공백 / 초기화)',
      description: '모든 카테고리와 상품을 비우고 완전히 처음부터 새 메뉴를 등록할 때 사용합니다.',
      isBuiltIn: true,
      categories: [],
      items: [],
      createdAt: '시스템 내장 기본',
    },
    {
      id: 'preset-default-33',
      name: '한철고 매점 기본 메뉴 (33종)',
      description: '라면 10종, 한강라면 4종, 과자 8종, 간식 3종, 음료수 7종, 아이스크림 1종 (총 33종 / 기본 재고 각 20개)',
      isBuiltIn: true,
      categories: DEFAULT_POS_CATEGORIES,
      items: DEFAULT_POS_ITEMS,
      createdAt: '시스템 내장 기본',
    },
  ], []);

  // Combined Presets
  const allPresets = useMemo(() => {
    return [...builtInPresets, ...customPresets];
  }, [builtInPresets, customPresets]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCat =
        selectedCategoryFilter === 'ALL' || item.categoryId === selectedCategoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (item.barcode && item.barcode.includes(searchQuery.trim()));
      return matchCat && matchQuery;
    });
  }, [items, selectedCategoryFilter, searchQuery]);

  // Statistics
  const totalStockCount = useMemo(() => items.reduce((sum, it) => sum + it.stock, 0), [items]);
  const outOfStockCount = useMemo(() => items.filter(it => it.stock <= 0).length, [items]);
  const lowStockCount = useMemo(
    () => items.filter(it => it.stock > 0 && it.stock <= 5).length,
    [items]
  );
  const favoritesCount = useMemo(() => items.filter(it => it.isFavorite).length, [items]);

  // Item Handlers
  const handleSaveItem = (savedItem: PosItem) => {
    const exists = items.some(it => it.id === savedItem.id);
    if (exists) {
      onUpdateItems(items.map(it => (it.id === savedItem.id ? savedItem : it)));
      showToast(`'${savedItem.name}' 상품 정보가 수정되었습니다.`);
    } else {
      onUpdateItems([savedItem, ...items]);
      showToast(`'${savedItem.name}' 상품이 새로 등록되었습니다.`);
    }
    setEditingItem(null);
    setShowAddModal(false);
  };

  const handleDeleteItem = () => {
    if (!deleteConfirmItem) return;
    if (onDeleteItem) {
      onDeleteItem(deleteConfirmItem.id);
    }
    onUpdateItems(items.filter(it => it.id !== deleteConfirmItem.id));
    showToast(`'${deleteConfirmItem.name}' 상품이 삭제되었습니다.`);
    setDeleteConfirmItem(null);
  };

  const handleToggleFavorite = (itemId: string) => {
    onUpdateItems(
      items.map(it => (it.id === itemId ? { ...it, isFavorite: !it.isFavorite } : it))
    );
  };

  const handleToggleActive = (itemId: string) => {
    onUpdateItems(items.map(it => (it.id === itemId ? { ...it, isActive: !it.isActive } : it)));
  };

  const handleAdjustStock = (itemId: string, delta: number) => {
    onUpdateItems(
      items.map(it => {
        if (it.id === itemId) {
          const nextStock = Math.max(0, it.stock + delta);
          return { ...it, stock: nextStock };
        }
        return it;
      })
    );
  };

  const handleSetExactStock = (itemId: string, exact: number) => {
    onUpdateItems(
      items.map(it => {
        if (it.id === itemId) {
          return { ...it, stock: Math.max(0, exact) };
        }
        return it;
      })
    );
  };

  // Category Handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newId = `cat-${Date.now()}`;
    const newCategory: PosCategory = {
      id: newId,
      name: newCatName.trim(),
      orderIndex: categories.length + 1,
    };

    onUpdateCategories([...categories, newCategory]);
    setNewCatName('');
    showToast(`'${newCategory.name}' 카테고리가 추가되었습니다.`);
  };

  const handleSaveCategoryName = (catId: string) => {
    if (!editingCatName.trim()) return;
    onUpdateCategories(
      categories.map(c => (c.id === catId ? { ...c, name: editingCatName.trim() } : c))
    );
    setEditingCatId(null);
    setEditingCatName('');
    showToast('카테고리 이름이 수정되었습니다.');
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const copy = [...categories];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reIndexed = copy.map((cat, idx) => ({ ...cat, orderIndex: idx + 1 }));
    onUpdateCategories(reIndexed);
  };

  const handleDeleteCategory = () => {
    if (!deleteConfirmCat) return;

    const hasItems = items.some(it => it.categoryId === deleteConfirmCat.id);
    if (hasItems) {
      showToast('해당 카테고리에 배정된 상품이 있어 삭제할 수 없습니다. 상품을 먼저 이동하거나 삭제하세요.', 'error');
      setDeleteConfirmCat(null);
      return;
    }

    if (onDeleteCategory) {
      onDeleteCategory(deleteConfirmCat.id);
    }
    onUpdateCategories(categories.filter(c => c.id !== deleteConfirmCat.id));
    showToast(`'${deleteConfirmCat.name}' 카테고리가 삭제되었습니다.`);
    setDeleteConfirmCat(null);
  };

  // Bulk Quick Actions
  const handleReplenishAllSoldOut = () => {
    const updated = items.map(it => (it.stock <= 0 ? { ...it, stock: 10 } : it));
    onUpdateItems(updated);
    showToast(`품절 상품 ${outOfStockCount}종의 재고를 각 10개씩 일괄 입고했습니다.`);
  };

  const handleExecuteClearAllFavorites = () => {
    if (onClearAllFavorites) {
      onClearAllFavorites();
    } else {
      onUpdateItems(items.map(i => ({ ...i, isFavorite: false })));
      showToast('모든 상품의 즐겨찾기가 해제되었습니다.');
    }
    setShowClearFavoritesConfirm(false);
  };

  // Preset Handlers
  const handleCreatePresetFromCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    setIsSavingPreset(true);
    try {
      const presetId = `preset-${Date.now()}`;
      const newPreset: PosPreset = {
        id: presetId,
        name: newPresetName.trim(),
        description: newPresetDesc.trim() || `카테고리 ${categories.length}개 · 상품 ${items.length}종`,
        isBuiltIn: false,
        categories: JSON.parse(JSON.stringify(categories)),
        items: JSON.parse(JSON.stringify(items)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePosPreset(newPreset);
      setCustomPresets(prev => [newPreset, ...prev.filter(p => p.id !== presetId)]);
      setNewPresetName('');
      setNewPresetDesc('');
      showToast(`'${newPreset.name}' 프리셋이 저장되었습니다.`, 'success');
    } catch (err: any) {
      console.error('Save preset error:', err);
      showToast('프리셋 저장 실패: ' + err.message, 'error');
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleApplyPresetConfirm = async () => {
    if (!applyTargetPreset) return;

    if (onApplyPreset) {
      onApplyPreset(applyTargetPreset.categories, applyTargetPreset.items, applyTargetPreset.name);
    } else {
      onUpdateCategories(applyTargetPreset.categories);
      onUpdateItems(applyTargetPreset.items);
      showToast(`'${applyTargetPreset.name}' 프리셋이 적용되었습니다.`, 'success');
    }
    setApplyTargetPreset(null);
  };

  const handleOpenEditPreset = (preset: PosPreset) => {
    setEditingPreset(preset);
    setEditPresetName(preset.name);
    setEditPresetDesc(preset.description || '');
  };

  const handleSaveEditPreset = async () => {
    if (!editingPreset || !editPresetName.trim()) return;

    try {
      const updated: PosPreset = {
        ...editingPreset,
        name: editPresetName.trim(),
        description: editPresetDesc.trim(),
        updatedAt: new Date().toISOString(),
      };

      await savePosPreset(updated);
      setCustomPresets(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast(`'${updated.name}' 프리셋 정보가 수정되었습니다.`, 'success');
      setEditingPreset(null);
    } catch (err: any) {
      console.error('Update preset error:', err);
      showToast('프리셋 수정 실패: ' + err.message, 'error');
    }
  };

  const handleOverwritePresetWithCurrent = async (preset: PosPreset) => {
    try {
      const updated: PosPreset = {
        ...preset,
        categories: JSON.parse(JSON.stringify(categories)),
        items: JSON.parse(JSON.stringify(items)),
        updatedAt: new Date().toISOString(),
      };

      await savePosPreset(updated);
      setCustomPresets(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast(`'${preset.name}' 프리셋 내용이 현재 메뉴(${items.length}종)로 갱신되었습니다.`, 'success');
    } catch (err: any) {
      console.error('Overwrite preset error:', err);
      showToast('프리셋 갱신 실패: ' + err.message, 'error');
    }
  };

  const handleDeletePresetConfirm = async () => {
    if (!deleteTargetPreset) return;

    try {
      await deletePosPreset(deleteTargetPreset.id);
      setCustomPresets(prev => prev.filter(p => p.id !== deleteTargetPreset.id));
      showToast(`'${deleteTargetPreset.name}' 프리셋이 삭제되었습니다.`);
    } catch (err: any) {
      console.error('Delete preset error:', err);
      showToast('프리셋 삭제 실패: ' + err.message, 'error');
    } finally {
      setDeleteTargetPreset(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1329] border border-white/15 w-full max-w-[1500px] h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  매점 메뉴 & 프리셋 관리 패널
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  ADMIN POS
                </span>
              </div>
              <p className="text-xs text-surface-dim">
                총 {items.length}개 상품 · 품절 {outOfStockCount}개 · 즐겨찾기 {favoritesCount}개 · 저장된 프리셋 {allPresets.length}개
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tabs */}
            <div className="flex bg-[#162035] p-1 rounded-2xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'items'
                    ? 'bg-secondary text-on-secondary shadow'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>상품/재고 관리 ({items.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'categories'
                    ? 'bg-secondary text-on-secondary shadow'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>카테고리 관리 ({categories.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'presets'
                    ? 'bg-secondary text-on-secondary shadow'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>메뉴 프리셋 ({allPresets.length})</span>
              </button>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Items Management */}
        {activeTab === 'items' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Control Bar: Search, Category Filters, Clear Favorites, Add Button */}
            <div className="p-4 border-b border-white/10 bg-white/[0.01] flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-dim" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="상품명 또는 바코드 검색..."
                  className="w-full bg-[#162035] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-dim hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategoryFilter === 'ALL'
                      ? 'bg-white text-black font-bold'
                      : 'bg-white/5 text-surface-dim hover:text-white'
                  }`}
                >
                  전체 ({items.length})
                </button>
                {categories.map(cat => {
                  const count = items.filter(it => it.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedCategoryFilter === cat.id
                          ? 'bg-secondary text-on-secondary font-bold'
                          : 'bg-white/5 text-surface-dim hover:text-white'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Actions Right */}
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {/* View Mode & Column Density Controls */}
                <div className="flex items-center bg-[#162035] border border-white/10 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="카드 그리드 뷰"
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'grid'
                        ? 'bg-secondary text-on-secondary shadow-sm'
                        : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    title="컴팩트 표(테이블) 뷰"
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'table'
                        ? 'bg-secondary text-on-secondary shadow-sm'
                        : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Count Preset Pills (when in grid mode) */}
                {viewMode === 'grid' && (
                  <div className="flex items-center bg-[#162035] border border-white/10 rounded-xl p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setColDensity('auto')}
                      title="화면 너비에 맞춰 자동 조정"
                      className={`px-2 py-1 rounded-lg transition-all ${
                        colDensity === 'auto'
                          ? 'bg-white/20 text-white shadow-sm'
                          : 'text-surface-dim hover:text-white'
                      }`}
                    >
                      자동
                    </button>
                    {(['2', '3', '4', '5'] as const).map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setColDensity(col)}
                        title={`${col}열 고정`}
                        className={`px-2 py-1 rounded-lg transition-all ${
                          colDensity === col
                            ? 'bg-white/20 text-white shadow-sm'
                            : 'text-surface-dim hover:text-white'
                        }`}
                      >
                        {col}열
                      </button>
                    ))}
                  </div>
                )}

                {/* Clear All Favorites Button */}
                <button
                  type="button"
                  onClick={() => setShowClearFavoritesConfirm(true)}
                  disabled={favoritesCount === 0}
                  title={favoritesCount === 0 ? '등록된 즐겨찾기가 없습니다' : `즐겨찾기 ${favoritesCount}개 전체 해제`}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <StarOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">즐겨찾기 모두 해제</span>
                  <span>({favoritesCount})</span>
                </button>

                {/* Add New Item Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary text-on-secondary hover:brightness-110 transition-all flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>신규 상품 등록</span>
                </button>
              </div>
            </div>

            {/* Items Grid / Table List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <Boxes className="w-12 h-12 text-surface-dim/40 mb-3" />
                  <p className="text-surface-dim text-sm font-medium">검색된 상품이 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setShowAddModal(true);
                    }}
                    className="mt-3 text-xs text-secondary font-bold hover:underline"
                  >
                    새 상품 추가하기
                  </button>
                </div>
              ) : viewMode === 'table' ? (
                /* Compact Table View */
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#111c33]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-surface-dim uppercase font-mono text-[11px]">
                        <th className="py-3 px-4 w-12 text-center">★</th>
                        <th className="py-3 px-4">상품명</th>
                        <th className="py-3 px-4">카테고리</th>
                        <th className="py-3 px-4">바코드</th>
                        <th className="py-3 px-4 text-right">판매가</th>
                        <th className="py-3 px-4 text-center">재고 수량</th>
                        <th className="py-3 px-4 text-center">판매 상태</th>
                        <th className="py-3 px-4 text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredItems.map(item => {
                        const category = categories.find(c => c.id === item.categoryId);
                        const isSoldOut = item.stock <= 0;
                        const isLow = item.stock > 0 && item.stock <= 5;

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-white/[0.03] transition-colors ${
                              !item.isActive ? 'opacity-50' : ''
                            }`}
                          >
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleFavorite(item.id)}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    item.isFavorite
                                      ? 'fill-amber-300 text-amber-300'
                                      : 'text-surface-dim'
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              {item.name}
                            </td>
                            <td className="py-3 px-4 text-surface-dim">
                              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[11px]">
                                {category?.name || '미분류'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-surface-dim font-mono">
                              {item.barcode ? `#${item.barcode}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-secondary">
                              {item.price.toLocaleString()}원
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center space-x-2">
                                <span
                                  className={`font-mono font-bold ${
                                    isSoldOut
                                      ? 'text-red-400'
                                      : isLow
                                      ? 'text-amber-400'
                                      : 'text-emerald-300'
                                  }`}
                                >
                                  {item.stock}개
                                </span>
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustStock(item.id, -1)}
                                    disabled={item.stock <= 0}
                                    className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 text-surface-dim hover:text-white flex items-center justify-center font-bold text-xs"
                                  >
                                    -
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustStock(item.id, 1)}
                                    className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center font-bold text-xs"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustStock(item.id, 10)}
                                    className="px-1 h-5 rounded bg-secondary/15 hover:bg-secondary/25 text-secondary text-[10px] font-bold"
                                  >
                                    +10
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(item.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                  item.isActive
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                                }`}
                              >
                                {item.isActive ? '판매 중' : '중단됨'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setShowAddModal(true);
                                  }}
                                  title="상품 수정"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmItem(item)}
                                  title="상품 삭제"
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Responsive Grid View */
                <div
                  className={
                    colDensity === '2'
                      ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5'
                      : colDensity === '3'
                      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-3.5'
                      : colDensity === '4'
                      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5'
                      : colDensity === '5'
                      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3'
                      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7 gap-3 sm:gap-3.5'
                  }
                >
                  {filteredItems.map(item => {
                    const category = categories.find(c => c.id === item.categoryId);
                    const isSoldOut = item.stock <= 0;
                    const isLow = item.stock > 0 && item.stock <= 5;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          !item.isActive
                            ? 'bg-[#0f172a]/60 border-white/5 opacity-60'
                            : isSoldOut
                            ? 'bg-red-950/20 border-red-900/30'
                            : 'bg-[#111c33] border-white/10 hover:border-white/20 shadow-sm'
                        }`}
                      >
                        {/* Item Top Info */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-surface-dim">
                                {category?.name || '미분류'}
                              </span>
                              {item.barcode && (
                                <span className="text-[10px] text-surface-dim font-mono">
                                  #{item.barcode}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                            <div className="text-xs font-mono font-bold text-secondary mt-0.5">
                              {item.price.toLocaleString()}원
                            </div>
                          </div>

                          {/* Star Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(item.id)}
                            title={item.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 등록'}
                            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                              item.isFavorite
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-white/5 text-surface-dim hover:text-white'
                            }`}
                          >
                            <Star
                              className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-300' : ''}`}
                            />
                          </button>
                        </div>

                        {/* Stock Controls */}
                        <div className="bg-[#0b1324] border border-white/5 rounded-xl p-2.5 flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-surface-dim">현재 재고:</span>
                            <span
                              className={`text-sm font-mono font-bold ${
                                isSoldOut
                                  ? 'text-red-400'
                                  : isLow
                                  ? 'text-amber-400'
                                  : 'text-emerald-300'
                              }`}
                            >
                              {item.stock}개
                            </span>
                            {isSoldOut && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                                품절
                              </span>
                            )}
                            {isLow && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                부족
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(item.id, -1)}
                              disabled={item.stock <= 0}
                              className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 text-surface-dim hover:text-white flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(item.id, 1)}
                              className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(item.id, 10)}
                              className="px-1.5 h-6 rounded bg-secondary/15 hover:bg-secondary/25 text-secondary text-[10px] font-bold"
                            >
                              +10
                            </button>
                          </div>
                        </div>

                        {/* Bottom Actions: Active Toggle, Edit, Delete */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          {/* Active / Pause */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item.id)}
                            title={item.isActive ? '판매 중단으로 전환' : '판매 개시로 전환'}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                              item.isActive
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25'
                            }`}
                          >
                            {item.isActive ? '판매 중' : '중단됨'}
                          </button>

                          <div className="flex items-center space-x-1.5">
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setShowAddModal(true);
                              }}
                              title="상품 수정"
                              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmItem(item)}
                              title="상품 삭제"
                              className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Category Management */}
        {activeTab === 'categories' && (
          <div className="flex-1 flex flex-col p-6 min-h-0 overflow-y-auto custom-scrollbar">
            {/* Add New Category Box */}
            <form
              onSubmit={handleAddCategory}
              className="bg-[#111c33] border border-white/10 p-4 rounded-2xl flex items-center space-x-3 mb-6 shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="새 카테고리 이름 입력 (예: 제과류, 핫도그/소시지, 기념품)"
                  className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/50"
                />
              </div>
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary text-on-secondary disabled:opacity-40 hover:brightness-110 transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>카테고리 추가</span>
              </button>
            </form>

            {/* Category List */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-surface-dim uppercase tracking-wider mb-2">
                등록된 카테고리 목록 (순서 및 품목 수)
              </h3>
              {categories.map((cat, idx) => {
                const assignedItemsCount = items.filter(it => it.categoryId === cat.id).length;
                const isEditing = editingCatId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-2xl bg-[#111c33] border border-white/10 flex items-center justify-between gap-3"
                  >
                    {/* Index & Name */}
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-white/5 text-surface-dim font-mono text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center space-x-2 flex-1 max-w-sm">
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={e => setEditingCatName(e.target.value)}
                            className="bg-[#1e293b] border border-secondary rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none flex-1"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryName(cat.id)}
                            className="p-1.5 rounded-lg bg-secondary text-on-secondary hover:brightness-110 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="p-1.5 rounded-lg bg-white/5 text-surface-dim hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white">{cat.name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-surface-dim font-medium">
                            {assignedItemsCount}개 상품 배정됨
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions: Reorder & Rename & Delete */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, 'up')}
                        disabled={idx === 0}
                        title="위로 이동"
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-surface-dim hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, 'down')}
                        disabled={idx === categories.length - 1}
                        title="아래로 이동"
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-surface-dim hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Rename */}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatName(cat.name);
                          }}
                          title="이름 수정"
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center ml-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmCat(cat)}
                        title="카테고리 삭제"
                        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 flex items-center justify-center ml-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Presets & Tools Management */}
        {activeTab === 'presets' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* Section 1: Save Current Menu as New Preset */}
            <div className="p-5 rounded-2xl bg-[#111c33] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                    <BookmarkPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      현재 메뉴 구성을 새 프리셋으로 저장
                    </h3>
                    <p className="text-xs text-surface-dim">
                      현재 활성화된 카테고리({categories.length}개) 및 상품({items.length}종)을 스냅샷으로 저장합니다.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreatePresetFromCurrent} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    placeholder="프리셋 이름 (예: 축제 매점 특별메뉴)"
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/50"
                  />
                </div>
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={newPresetDesc}
                    onChange={e => setNewPresetDesc(e.target.value)}
                    placeholder="프리셋 설명 (선택 사항)"
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={!newPresetName.trim() || isSavingPreset}
                    className="w-full h-full py-2.5 px-3 rounded-xl text-xs font-bold bg-secondary text-on-secondary disabled:opacity-40 hover:brightness-110 transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingPreset ? '저장 중...' : '프리셋 저장'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section 2: Preset List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-dim uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-secondary" />
                  <span>사용 가능한 메뉴 프리셋 목록 ({allPresets.length}개)</span>
                </h3>
                <span className="text-[11px] text-surface-dim">
                  원하는 프리셋의 [이 프리셋으로 설정] 버튼을 누르면 현재 POS에 즉시 적용됩니다.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {allPresets.map(preset => {
                  const isExpanded = expandedPresetId === preset.id;
                  const totalStock = preset.items.reduce((s, it) => s + (it.stock || 0), 0);

                  return (
                    <div
                      key={preset.id}
                      className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                        preset.isBuiltIn
                          ? 'bg-[#101b38] border-indigo-500/20 hover:border-indigo-500/40'
                          : 'bg-[#111c33] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Preset Header */}
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              {preset.isBuiltIn ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  기본 프리셋
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  사용자 정의 프리셋
                                </span>
                              )}
                              <span className="text-[10px] text-surface-dim font-mono">
                                카테고리 {preset.categories.length}개 · 상품 {preset.items.length}종
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-white tracking-tight">{preset.name}</h4>
                            <p className="text-xs text-surface-dim mt-1 leading-relaxed">
                              {preset.description || '별도 설명 없음'}
                            </p>
                          </div>
                        </div>

                        {/* Preset Stats Chip */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5 text-[11px] text-surface-dim">
                          <span className="bg-white/5 px-2.5 py-1 rounded-lg">
                            상품 합계: <strong className="text-white">{preset.items.length}종</strong>
                          </span>
                          <span className="bg-white/5 px-2.5 py-1 rounded-lg">
                            총 재고: <strong className="text-white">{totalStock}개</strong>
                          </span>
                          {preset.createdAt && (
                            <span className="text-[10px] text-surface-dim/70 ml-auto">
                              {preset.isBuiltIn ? preset.createdAt : new Date(preset.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Preview Expand Area */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs animate-in fade-in">
                            <div className="text-[11px] font-bold text-surface-dim">포함된 카테고리:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {preset.categories.length === 0 ? (
                                <span className="text-surface-dim text-xs italic">카테고리 없음 (공백)</span>
                              ) : (
                                preset.categories.map(c => (
                                  <span key={c.id} className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[11px]">
                                    {c.name}
                                  </span>
                                ))
                              )}
                            </div>

                            <div className="text-[11px] font-bold text-surface-dim pt-2">포함된 주요 상품 ({preset.items.length}종):</div>
                            <div className="max-h-36 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                              {preset.items.length === 0 ? (
                                <span className="text-surface-dim text-xs italic">등록된 상품 없음 (공백)</span>
                              ) : (
                                preset.items.map(it => (
                                  <div key={it.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-black/20 border border-white/5">
                                    <span className="text-white truncate">{it.name}</span>
                                    <div className="flex items-center space-x-2 shrink-0 font-mono text-surface-dim">
                                      <span>{it.price.toLocaleString()}원</span>
                                      <span className="text-secondary">{it.stock}개</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Preset Action Bar */}
                      <div className="p-3 bg-[#0a1022] border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                        {/* Preview Toggle */}
                        <button
                          type="button"
                          onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isExpanded ? '상세 접기' : '미리보기'}</span>
                        </button>

                        <div className="flex items-center space-x-1.5 ml-auto">
                          {/* Custom Preset Controls: Edit, Overwrite, Delete */}
                          {!preset.isBuiltIn && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPreset(preset)}
                                title="이름 및 설명 수정"
                                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOverwritePresetWithCurrent(preset)}
                                title="현재 POS 메뉴 상태로 프리셋 덮어쓰기 저장"
                                className="px-2 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-500/30 flex items-center space-x-1 cursor-pointer"
                              >
                                <Save className="w-3 h-3" />
                                <span>갱신</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTargetPreset(preset)}
                                title="프리셋 삭제"
                                className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Apply Preset Button */}
                          <button
                            type="button"
                            onClick={() => setApplyTargetPreset(preset)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-secondary hover:brightness-110 text-on-secondary shadow transition-all flex items-center space-x-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>이 프리셋으로 설정</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Additional Quick Tools */}
            <div className="p-5 rounded-2xl bg-[#111c33] border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <PackageCheck className="w-4 h-4 text-secondary" />
                <span>기타 보조 도구</span>
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleReplenishAllSoldOut}
                  disabled={outOfStockCount === 0}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-secondary/20 hover:bg-secondary/30 text-secondary-fixed border border-secondary/40 disabled:opacity-30 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>품절 상품 전체에 재고 +10개 채우기 ({outOfStockCount}종)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearFavoritesConfirm(true)}
                  disabled={favoritesCount === 0}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 disabled:opacity-30 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <StarOff className="w-4 h-4" />
                  <span>즐겨찾기 전체 해제 (모두 비우기)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Item Form (Add / Edit) */}
        {showAddModal && (
          <PosItemFormModal
            item={editingItem}
            categories={categories}
            onSave={handleSaveItem}
            onClose={() => {
              setShowAddModal(false);
              setEditingItem(null);
            }}
          />
        )}

        {/* Modal: Delete Item Confirm */}
        {deleteConfirmItem && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-red-500/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">상품 삭제 확인</h4>
                <p className="text-xs text-surface-dim mt-1">
                  <span className="font-bold text-white">'{deleteConfirmItem.name}'</span> 상품을 완전히 삭제하시겠습니까?
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmItem(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteItem}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Category Confirm */}
        {deleteConfirmCat && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-red-500/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">카테고리 삭제 확인</h4>
                <p className="text-xs text-surface-dim mt-1">
                  <span className="font-bold text-white">'{deleteConfirmCat.name}'</span> 카테고리를 삭제하시겠습니까?
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCat(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Clear All Favorites Confirm */}
        {showClearFavoritesConfirm && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-amber-500/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center mx-auto">
                <StarOff className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">즐겨찾기 전체 해제</h4>
                <p className="text-xs text-surface-dim mt-1 leading-relaxed">
                  현재 등록된 <strong className="text-amber-300 font-bold">{favoritesCount}개</strong> 상품의 즐겨찾기를 모두 해제하시겠습니까?<br/>
                  (상품 자체는 삭제되지 않고 일반 상품으로 유지됩니다.)
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearFavoritesConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClearAllFavorites}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg cursor-pointer"
                >
                  전체 해제 실행
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Apply Preset Confirm */}
        {applyTargetPreset && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-secondary/40 w-full max-w-md rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">프리셋 메뉴 설정 (적용)</h4>
                <p className="text-xs text-surface-dim mt-2 leading-relaxed">
                  현재 POS 메뉴 구성을 <strong className="text-white">'{applyTargetPreset.name}'</strong> 프리셋으로 변경하시겠습니까?
                </p>
                <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 text-left text-xs space-y-1">
                  <div className="text-surface-dim">
                    • 적용될 카테고리: <strong className="text-white">{applyTargetPreset.categories.length}개</strong>
                  </div>
                  <div className="text-surface-dim">
                    • 적용될 상품 품목: <strong className="text-white">{applyTargetPreset.items.length}종</strong>
                  </div>
                  <div className="text-[11px] text-amber-300/80 pt-1">
                    * 기존 카테고리 및 상품 목록이 이 프리셋 내용으로 교체 동기화됩니다.
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyTargetPreset(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleApplyPresetConfirm}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-secondary hover:brightness-110 text-on-secondary shadow-lg cursor-pointer"
                >
                  프리셋 적용하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Preset Info */}
        {editingPreset && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-white/20 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-base font-bold text-white">프리셋 정보 수정</h4>
                <button
                  type="button"
                  onClick={() => setEditingPreset(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-surface-dim block mb-1">프리셋 이름</label>
                  <input
                    type="text"
                    value={editPresetName}
                    onChange={e => setEditPresetName(e.target.value)}
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-dim block mb-1">프리셋 설명</label>
                  <textarea
                    rows={3}
                    value={editPresetDesc}
                    onChange={e => setEditPresetDesc(e.target.value)}
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-secondary resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPreset(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={!editPresetName.trim()}
                  onClick={handleSaveEditPreset}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-secondary hover:brightness-110 text-on-secondary disabled:opacity-40 shadow cursor-pointer"
                >
                  수정 저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Preset Confirm */}
        {deleteTargetPreset && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-red-500/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">프리셋 삭제 확인</h4>
                <p className="text-xs text-surface-dim mt-1 leading-relaxed">
                  <strong className="text-white">'{deleteTargetPreset.name}'</strong> 프리셋을 완전히 삭제하시겠습니까?
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetPreset(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeletePresetConfirm}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
