import { useState, useMemo, useEffect, useRef } from 'react';
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
  FileSpreadsheet,
  Lock,
  ShieldAlert,
  ShieldCheck,
  LogIn,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { PosCategory, PosItem, PosPreset, PosUser, PosItemChangeDetail, PosFieldDiff } from '../../types/pos';
import { DEFAULT_POS_CATEGORIES, DEFAULT_POS_ITEMS } from '../../data/defaultPosData';
import {
  subscribePosPresets,
  savePosPreset,
  deletePosPreset,
  saveBatchPosItemsWithSummary,
  saveBatchPosCategories,
} from '../../services/posFirestore';
import { loginWithGoogle } from '../../firebase';
import { createGoogleAdminPosUser } from '../../services/posAuth';
import { PosItemFormModal } from './PosItemFormModal';
import { PosSheetImportModal } from './PosSheetImportModal';

interface PosProductManagerModalProps {
  categories: PosCategory[];
  items: PosItem[];
  isAdmin?: boolean;
  currentUser?: PosUser | null;
  onUpdateItems: (newItems: PosItem[]) => void;
  onUpdateSingleItem?: (item: PosItem) => void;
  onPatchItem?: (itemId: string, patch: Partial<PosItem>) => void;
  onUpdateCategories: (newCategories: PosCategory[]) => void;
  onDeleteItem?: (id: string) => void;
  onDeleteCategory?: (id: string) => void;
  onResetToDefault: () => void;
  onApplyPreset?: (categories: PosCategory[], items: PosItem[], presetName: string, presetId?: string) => void;
  onClearAllFavorites?: () => void;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onGoogleAdminLogin?: (user: PosUser) => void;
}

const PRESETS_STORAGE_KEY = 'krhs_pos_saved_presets_v2';

export function PosProductManagerModal({
  categories,
  items,
  isAdmin = false,
  currentUser,
  onUpdateItems,
  onUpdateCategories,
  onDeleteItem,
  onDeleteCategory,
  onResetToDefault,
  onApplyPreset,
  onClearAllFavorites,
  onClose,
  showToast,
  onGoogleAdminLogin,
}: PosProductManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'presets'>('items');

  // Local draft state for batch editing
  const [localItems, setLocalItems] = useState<PosItem[]>(() => JSON.parse(JSON.stringify(items)));
  const [localCategories, setLocalCategories] = useState<PosCategory[]>(() =>
    JSON.parse(JSON.stringify(categories))
  );

  // Track if user explicitly made manual edits in current session
  const isDirtyRef = useRef(false);

  // Sync with prop updates only when there are no pending manual local changes
  useEffect(() => {
    if (!isDirtyRef.current) {
      setLocalItems(JSON.parse(JSON.stringify(items)));
    }
  }, [items]);

  useEffect(() => {
    if (!isDirtyRef.current) {
      setLocalCategories(JSON.parse(JSON.stringify(categories)));
    }
  }, [categories]);

  // Compute modified items compared to original prop items
  const modifiedItems = useMemo(() => {
    if (!isDirtyRef.current) return [];
    return localItems.filter(local => {
      const orig = items.find(it => it.id === local.id);
      if (!orig) return true; // Newly added
      return (
        orig.name !== local.name ||
        orig.price !== local.price ||
        orig.stock !== local.stock ||
        orig.categoryId !== local.categoryId ||
        orig.isFavorite !== local.isFavorite ||
        orig.isActive !== local.isActive ||
        orig.barcode !== local.barcode
      );
    });
  }, [localItems, items]);

  const isCategoriesModified = useMemo(() => {
    if (!isDirtyRef.current) return false;
    if (localCategories.length !== categories.length) return true;
    return localCategories.some((c, idx) => {
      const orig = categories[idx];
      return !orig || orig.id !== c.id || orig.name !== c.name || orig.orderIndex !== c.orderIndex;
    });
  }, [localCategories, categories]);

  const hasChanges = isDirtyRef.current && (modifiedItems.length > 0 || isCategoriesModified);

  // Saving state
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [showUnsavedConfirmModal, setShowUnsavedConfirmModal] = useState(false);

  // Admin authentication state
  const [localIsAdmin, setLocalIsAdmin] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showAdminRequiredModal, setShowAdminRequiredModal] = useState<{
    isOpen: boolean;
    featureName: string;
  }>({ isOpen: false, featureName: '' });

  const effectiveIsAdmin = isAdmin || localIsAdmin;
  const currentActorId = currentUser?.id || (effectiveIsAdmin ? '관리자' : '근무자');
  const currentActorName = currentActorId;
  const currentActorUid = currentUser?.id || currentActorId;

  const handleGoogleAdminLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const googleUser = await loginWithGoogle();
      if (googleUser && googleUser.email) {
        const adminUser = createGoogleAdminPosUser(
          googleUser.email,
          googleUser.displayName,
          googleUser.uid
        );
        setLocalIsAdmin(true);
        if (onGoogleAdminLogin) {
          onGoogleAdminLogin(adminUser);
        }
        showToast(`구글 관리자 계정으로 인증되었습니다.`, 'success');
        setShowAdminRequiredModal({ isOpen: false, featureName: '' });
      }
    } catch (err: any) {
      console.error('Google admin login error:', err);
      showToast('관리자 로그인 실패: ' + (err.message || '인증 오류'), 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
  const [showSheetImportModal, setShowSheetImportModal] = useState(false);
  const [presetTypeFilter, setPresetTypeFilter] = useState<'ALL' | 'CUSTOM' | 'BUILTIN'>('ALL');

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
  const builtInPresets: PosPreset[] = useMemo(
    () => [
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
    ],
    []
  );

  // Combined Presets
  const allPresets = useMemo(() => {
    return [...builtInPresets, ...customPresets];
  }, [builtInPresets, customPresets]);

  // Filtered Presets for Tabs/Display
  const filteredPresets = useMemo(() => {
    return allPresets.filter(p => {
      if (presetTypeFilter === 'CUSTOM') return !p.isBuiltIn;
      if (presetTypeFilter === 'BUILTIN') return p.isBuiltIn;
      return true;
    });
  }, [allPresets, presetTypeFilter]);

  // Filtered items (using localItems)
  const filteredItems = useMemo(() => {
    return localItems.filter(item => {
      const matchCat =
        selectedCategoryFilter === 'ALL'
          ? true
          : selectedCategoryFilter === 'FAVORITES'
          ? item.isFavorite
          : item.categoryId === selectedCategoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchQuery;
    });
  }, [localItems, selectedCategoryFilter, searchQuery]);

  // Statistics (using localItems)
  const totalStockCount = useMemo(() => localItems.reduce((sum, it) => sum + it.stock, 0), [localItems]);
  const outOfStockCount = useMemo(() => localItems.filter(it => it.stock <= 0).length, [localItems]);
  const lowStockCount = useMemo(
    () => localItems.filter(it => it.stock > 0 && it.stock <= 5).length,
    [localItems]
  );
  const favoritesCount = useMemo(() => localItems.filter(it => it.isFavorite).length, [localItems]);

  // Item Local Handlers (Fast local update only - no Firestore calls until 'Save' is pressed)
  const handleSaveItem = (savedItem: PosItem) => {
    isDirtyRef.current = true;
    const exists = localItems.some(it => it.id === savedItem.id);
    if (exists) {
      setLocalItems(prev => prev.map(it => (it.id === savedItem.id ? savedItem : it)));
      showToast(`'${savedItem.name}' 상품 정보가 수정되었습니다. (저장 버튼을 눌러 확정)`);
    } else {
      setLocalItems(prev => [savedItem, ...prev]);
      showToast(`'${savedItem.name}' 상품이 목록에 추가되었습니다. (저장 버튼을 눌러 확정)`);
    }
    setEditingItem(null);
    setShowAddModal(false);
  };

  const handleDeleteItem = () => {
    if (!effectiveIsAdmin) {
      showToast('상품 삭제는 관리자만 가능합니다.', 'error');
      setShowAdminRequiredModal({ isOpen: true, featureName: '상품 삭제' });
      setDeleteConfirmItem(null);
      return;
    }
    if (!deleteConfirmItem) return;
    isDirtyRef.current = true;
    if (onDeleteItem) {
      onDeleteItem(deleteConfirmItem.id);
    }
    setLocalItems(prev => prev.filter(it => it.id !== deleteConfirmItem.id));
    showToast(`'${deleteConfirmItem.name}' 상품이 삭제되었습니다.`);
    setDeleteConfirmItem(null);
  };

  const handleToggleFavorite = (itemId: string) => {
    isDirtyRef.current = true;
    setLocalItems(prev =>
      prev.map(it => (it.id === itemId ? { ...it, isFavorite: !it.isFavorite } : it))
    );
  };

  const handleToggleActive = (itemId: string) => {
    isDirtyRef.current = true;
    setLocalItems(prev =>
      prev.map(it => (it.id === itemId ? { ...it, isActive: !it.isActive } : it))
    );
  };

  const handleAdjustStock = (itemId: string, delta: number) => {
    isDirtyRef.current = true;
    setLocalItems(prev =>
      prev.map(it => {
        if (it.id === itemId) {
          const nextStock = Math.max(0, it.stock + delta);
          return { ...it, stock: nextStock };
        }
        return it;
      })
    );
  };

  const handleSetExactStock = (itemId: string, exact: number) => {
    isDirtyRef.current = true;
    setLocalItems(prev =>
      prev.map(it => {
        if (it.id === itemId) {
          return { ...it, stock: Math.max(0, exact) };
        }
        return it;
      })
    );
  };

  // Category Handlers (Local)
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newId = `cat-${Date.now()}`;
    const newCategory: PosCategory = {
      id: newId,
      name: newCatName.trim(),
      orderIndex: localCategories.length + 1,
    };

    isDirtyRef.current = true;
    setLocalCategories(prev => [...prev, newCategory]);
    setNewCatName('');
    showToast(`'${newCategory.name}' 카테고리가 추가되었습니다. (저장 버튼을 눌러 확정)`);
  };

  const handleSaveCategoryName = (catId: string) => {
    if (!editingCatName.trim()) return;
    isDirtyRef.current = true;
    setLocalCategories(prev =>
      prev.map(c => (c.id === catId ? { ...c, name: editingCatName.trim() } : c))
    );
    setEditingCatId(null);
    setEditingCatName('');
    showToast('카테고리 이름이 수정되었습니다. (저장 버튼을 눌러 확정)');
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localCategories.length) return;

    const copy = [...localCategories];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reIndexed = copy.map((cat, idx) => ({ ...cat, orderIndex: idx + 1 }));
    isDirtyRef.current = true;
    setLocalCategories(reIndexed);
  };

  const handleDeleteCategory = () => {
    if (!effectiveIsAdmin) {
      showToast('카테고리 삭제는 관리자만 가능합니다.', 'error');
      setShowAdminRequiredModal({ isOpen: true, featureName: '카테고리 삭제' });
      setDeleteConfirmCat(null);
      return;
    }
    if (!deleteConfirmCat) return;

    const hasItems = localItems.some(it => it.categoryId === deleteConfirmCat.id);
    if (hasItems) {
      showToast('해당 카테고리에 배정된 상품이 있어 삭제할 수 없습니다. 상품을 먼저 이동하거나 삭제하세요.', 'error');
      setDeleteConfirmCat(null);
      return;
    }

    isDirtyRef.current = true;
    if (onDeleteCategory) {
      onDeleteCategory(deleteConfirmCat.id);
    }
    setLocalCategories(prev => prev.filter(c => c.id !== deleteConfirmCat.id));
    showToast(`'${deleteConfirmCat.name}' 카테고리가 삭제되었습니다.`);
    setDeleteConfirmCat(null);
  };

  // Bulk Quick Actions (Local)
  const handleReplenishAllSoldOut = () => {
    isDirtyRef.current = true;
    setLocalItems(prev => prev.map(it => (it.stock <= 0 ? { ...it, stock: 10 } : it)));
    showToast(`품절 상품 ${outOfStockCount}종의 재고를 각 10개씩 일괄 입고 설정했습니다. (저장 버튼을 눌러 확정)`);
  };

  const handleExecuteClearAllFavorites = () => {
    if (!effectiveIsAdmin) {
      showToast('즐겨찾기 전체 해제는 관리자만 가능합니다.', 'error');
      setShowAdminRequiredModal({ isOpen: true, featureName: '즐겨찾기 전체 해제' });
      setShowClearFavoritesConfirm(false);
      return;
    }
    isDirtyRef.current = true;
    setLocalItems(prev => prev.map(i => ({ ...i, isFavorite: false })));
    showToast('모든 상품의 즐겨찾기를 해제했습니다. (저장 버튼을 눌러 확정)');
    setShowClearFavoritesConfirm(false);
  };

  // Unified Save Changes Handler (Batch write + 1 aggregated Audit Log)
  const handleSaveChanges = async () => {
    if (!hasChanges) {
      showToast('변경된 내용이 없습니다.');
      return;
    }

    setIsSavingChanges(true);
    try {
      // 1. Generate consolidated log description & rich structured change items
      const detailsList: string[] = [];
      const itemChanges: PosItemChangeDetail[] = [];

      modifiedItems.forEach(newItem => {
        const oldItem = items.find(it => it.id === newItem.id);
        const cat = localCategories.find(c => c.id === newItem.categoryId);
        const catName = cat ? cat.name : '기본 카테고리';

        if (!oldItem) {
          detailsList.push(`[${newItem.name}] 신규등록 (재고 ${newItem.stock}개)`);
          itemChanges.push({
            itemId: newItem.id,
            itemName: newItem.name,
            categoryName: catName,
            changeType: 'CREATED',
            summary: `신규 상품 등록 (판매가: ${newItem.price.toLocaleString()}원, 초기 재고: ${newItem.stock}개)`,
            diffs: [
              { field: 'price', label: '판매 가격', from: '없음', to: `${newItem.price.toLocaleString()}원` },
              { field: 'stock', label: '초기 재고', from: '없음', to: `${newItem.stock}개` },
            ],
          });
        } else {
          const subChanges: string[] = [];
          const diffs: PosFieldDiff[] = [];

          if (oldItem.stock !== newItem.stock) {
            const diff = newItem.stock - oldItem.stock;
            const sign = diff > 0 ? `+${diff}` : `${diff}`;
            subChanges.push(`재고 ${oldItem.stock}개→${newItem.stock}개 (${sign})`);
            diffs.push({
              field: 'stock',
              label: '재고 수량',
              from: `${oldItem.stock}개`,
              to: `${newItem.stock}개 (${sign})`,
            });
          }
          if (oldItem.price !== newItem.price) {
            subChanges.push(`가격 ${oldItem.price.toLocaleString()}원→${newItem.price.toLocaleString()}원`);
            diffs.push({
              field: 'price',
              label: '판매 가격',
              from: `${oldItem.price.toLocaleString()}원`,
              to: `${newItem.price.toLocaleString()}원`,
            });
          }
          if (oldItem.name !== newItem.name) {
            subChanges.push(`이름 '${oldItem.name}'→'${newItem.name}'`);
            diffs.push({
              field: 'name',
              label: '상품명',
              from: oldItem.name,
              to: newItem.name,
            });
          }
          if (oldItem.isActive !== newItem.isActive) {
            subChanges.push(newItem.isActive ? '판매재개' : '판매중단');
            diffs.push({
              field: 'isActive',
              label: '판매 상태',
              from: oldItem.isActive ? '판매중' : '판매중단',
              to: newItem.isActive ? '판매중' : '판매중단',
            });
          }
          if (oldItem.isFavorite !== newItem.isFavorite) {
            subChanges.push(newItem.isFavorite ? '즐겨찾기' : '즐겨찾기해제');
            diffs.push({
              field: 'isFavorite',
              label: '즐겨찾기',
              from: oldItem.isFavorite ? '등록' : '미등록',
              to: newItem.isFavorite ? '등록' : '미등록',
            });
          }
          if (oldItem.categoryId !== newItem.categoryId) {
            const oldCatName = localCategories.find(c => c.id === oldItem.categoryId)?.name || '이전 카테고리';
            subChanges.push(`카테고리 '${oldCatName}'→'${catName}'`);
            diffs.push({
              field: 'categoryId',
              label: '카테고리',
              from: oldCatName,
              to: catName,
            });
          }

          if (subChanges.length > 0) {
            detailsList.push(`[${newItem.name}] ${subChanges.join(', ')}`);
            itemChanges.push({
              itemId: newItem.id,
              itemName: newItem.name,
              categoryName: catName,
              changeType: diffs.length === 1 && diffs[0].field === 'stock' ? 'STOCK' : diffs.length === 1 && diffs[0].field === 'price' ? 'PRICE' : 'MULTIPLE',
              summary: subChanges.join(' | '),
              diffs,
            });
          }
        }
      });

      if (isCategoriesModified) {
        detailsList.push(`카테고리 구성 변경`);
      }

      const summaryDetails =
        detailsList.length > 0
          ? `총 ${detailsList.length}건 수정: ` +
            detailsList.slice(0, 4).join(' | ') +
            (detailsList.length > 4 ? ` 외 ${detailsList.length - 4}건` : '')
          : `총 ${modifiedItems.length}개 품목 변경사항 일괄 저장`;

      // 2. Batch save items to Firestore with detailed change tracking
      if (modifiedItems.length > 0) {
        await saveBatchPosItemsWithSummary(
          modifiedItems,
          summaryDetails,
          currentActorName,
          {
            itemChanges,
            categoriesModified: isCategoriesModified,
          },
          currentActorUid
        );
      }

      // 3. Save categories only if actually modified
      if (isCategoriesModified) {
        await saveBatchPosCategories(localCategories, currentActorName, currentActorUid);
      }

      // 4. Update parent local state
      onUpdateItems(localItems);
      onUpdateCategories(localCategories);

      isDirtyRef.current = false;
      showToast(`총 ${modifiedItems.length}개 상품의 변경사항이 안전하게 저장되었습니다.`, 'success');
      setShowUnsavedConfirmModal(false);
    } catch (err: any) {
      console.error('Save changes error:', err);
      showToast('저장 중 오류가 발생했습니다: ' + err.message, 'error');
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Discard local changes and revert to props
  const handleDiscardChanges = () => {
    isDirtyRef.current = false;
    setLocalItems(JSON.parse(JSON.stringify(items)));
    setLocalCategories(JSON.parse(JSON.stringify(categories)));
    showToast('변경사항을 취소하고 원래대로 되돌렸습니다.');
    setShowUnsavedConfirmModal(false);
  };

  // Safe Close Attempt
  const handleAttemptClose = () => {
    if (hasChanges) {
      setShowUnsavedConfirmModal(true);
    } else {
      onClose();
    }
  };

  // Preset Handlers
  const handleCreatePresetFromCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveIsAdmin) {
      setShowAdminRequiredModal({ isOpen: true, featureName: '새 프리셋 저장' });
      return;
    }
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

      await savePosPreset(newPreset, currentActorName, currentActorUid);
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
    if (!effectiveIsAdmin) {
      setShowAdminRequiredModal({ isOpen: true, featureName: '프리셋 메뉴 설정' });
      setApplyTargetPreset(null);
      return;
    }
    if (!applyTargetPreset) return;

    const targetPreset = applyTargetPreset;
    setApplyTargetPreset(null);

    // Deep copy preset data
    const clonedCategories: PosCategory[] = JSON.parse(JSON.stringify(targetPreset.categories));
    const clonedItems: PosItem[] = JSON.parse(JSON.stringify(targetPreset.items));

    // Reset modification flag & update local modal state immediately
    isDirtyRef.current = false;
    setLocalCategories(clonedCategories);
    setLocalItems(clonedItems);

    if (onApplyPreset) {
      await onApplyPreset(clonedCategories, clonedItems, targetPreset.name, targetPreset.id);
    } else {
      onUpdateCategories(clonedCategories);
      onUpdateItems(clonedItems);
      showToast(`'${targetPreset.name}' 프리셋이 적용되었습니다.`, 'success');
    }
  };

  const handleApplyFromSheet = async (
    newCategories: PosCategory[],
    newItems: PosItem[],
    pName: string
  ) => {
    if (!effectiveIsAdmin) {
      setShowAdminRequiredModal({ isOpen: true, featureName: '시트/엑셀 재고 적용' });
      return;
    }
    const clonedCategories: PosCategory[] = JSON.parse(JSON.stringify(newCategories));
    const clonedItems: PosItem[] = JSON.parse(JSON.stringify(newItems));

    isDirtyRef.current = false;
    setLocalCategories(clonedCategories);
    setLocalItems(clonedItems);

    if (onApplyPreset) {
      await onApplyPreset(clonedCategories, clonedItems, pName);
    } else {
      onUpdateCategories(clonedCategories);
      onUpdateItems(clonedItems);
      showToast(`'${pName}' 프리셋이 적용되었습니다.`, 'success');
    }
  };

  const handleSavePresetFromSheet = async (preset: PosPreset) => {
    if (!effectiveIsAdmin) {
      setShowAdminRequiredModal({ isOpen: true, featureName: '시트/엑셀 프리셋 저장' });
      return;
    }
    await savePosPreset(preset, currentActorName, currentActorUid);
    setCustomPresets(prev => {
      const idx = prev.findIndex(p => p.id === preset.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = preset;
        return copy;
      }
      return [preset, ...prev];
    });
  };

  const handleOpenEditPreset = (preset: PosPreset) => {
    if (!effectiveIsAdmin) {
      setShowAdminRequiredModal({ isOpen: true, featureName: '프리셋 정보 수정' });
      return;
    }
    setEditingPreset(preset);
    setEditPresetName(preset.name);
    setEditPresetDesc(preset.description || '');
  };

  const handleSaveEditPreset = async () => {
    if (!effectiveIsAdmin) {
      setShowAdminRequiredModal({ isOpen: true, featureName: '프리셋 정보 수정' });
      return;
    }
    if (!editingPreset || !editPresetName.trim()) return;

    try {
      const updated: PosPreset = {
        ...editingPreset,
        name: editPresetName.trim(),
        description: editPresetDesc.trim(),
        updatedAt: new Date().toISOString(),
      };

      await savePosPreset(updated, currentActorName, currentActorUid);
      setCustomPresets(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast(`'${updated.name}' 프리셋 정보가 수정되었습니다.`, 'success');
      setEditingPreset(null);
    } catch (err: any) {
      console.error('Update preset error:', err);
      showToast('프리셋 수정 실패: ' + err.message, 'error');
    }
  };

  const handleOverwritePresetWithCurrent = async (preset: PosPreset) => {
    if (!effectiveIsAdmin) {
      setShowAdminRequiredModal({ isOpen: true, featureName: '프리셋 갱신' });
      return;
    }
    try {
      const updated: PosPreset = {
        ...preset,
        categories: JSON.parse(JSON.stringify(categories)),
        items: JSON.parse(JSON.stringify(items)),
        updatedAt: new Date().toISOString(),
      };

      await savePosPreset(updated, currentActorName, currentActorUid);
      setCustomPresets(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast(`'${preset.name}' 프리셋 내용이 현재 메뉴(${items.length}종)로 갱신되었습니다.`, 'success');
    } catch (err: any) {
      console.error('Overwrite preset error:', err);
      showToast('프리셋 갱신 실패: ' + err.message, 'error');
    }
  };

  const handleDeletePresetConfirm = async () => {
    if (!effectiveIsAdmin) {
      setShowAdminRequiredModal({ isOpen: true, featureName: '프리셋 삭제' });
      setDeleteTargetPreset(null);
      return;
    }
    if (!deleteTargetPreset) return;

    try {
      await deletePosPreset(deleteTargetPreset.id, deleteTargetPreset.name, currentActorName, currentActorUid);
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b1329] border border-white/15 w-full max-w-[1500px] h-full sm:h-[95vh] rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-white/[0.02] shrink-0">
          <div className="flex items-center justify-between sm:justify-start space-x-2.5 sm:space-x-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight truncate">
                    매점 메뉴 & 프리셋 관리
                  </h2>
                  {effectiveIsAdmin ? (
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 flex items-center space-x-1 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>관리자</span>
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 flex items-center space-x-1 shrink-0">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>근무자 모드</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-surface-dim truncate">
                  총 {localItems.length}개 상품 · 품절 {outOfStockCount}개 · 즐겨찾기 {favoritesCount}개
                  {hasChanges && (
                    <span className="ml-1.5 text-amber-300 font-bold">
                      (수정 중 {modifiedItems.length}건)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* If not admin, show Google Admin login button in header */}
            {!effectiveIsAdmin && (
              <button
                type="button"
                onClick={handleGoogleAdminLogin}
                disabled={isGoogleLoading}
                title="Google 관리자 계정으로 로그인하여 삭제 및 프리셋 권한 획득"
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>Google 관리자 로그인</span>
              </button>
            )}

            {/* Close Button on mobile top-right */}
            <button
              type="button"
              onClick={handleAttemptClose}
              className="sm:hidden w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto overflow-x-auto pb-0.5 sm:pb-0">
            {/* Header Save & Revert buttons when hasChanges */}
            {hasChanges && (
              <div className="flex items-center space-x-1.5 mr-1">
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={isSavingChanges}
                  title="수정한 내용을 모두 버리고 원래대로 복원"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-surface-dim hover:text-white transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">되돌리기</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSavingChanges}
                  title="수정한 모든 재고 및 상품 정보를 데이터베이스에 일괄 저장"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSavingChanges ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-slate-950" />
                  )}
                  <span>저장하기 ({modifiedItems.length})</span>
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex bg-[#162035] p-1 rounded-xl sm:rounded-2xl border border-white/10 text-xs shrink-0 max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all flex items-center space-x-1 sm:space-x-1.5 whitespace-nowrap ${
                  activeTab === 'items'
                    ? 'bg-secondary text-on-secondary shadow'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>상품/재고 ({localItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all flex items-center space-x-1 sm:space-x-1.5 whitespace-nowrap ${
                  activeTab === 'categories'
                    ? 'bg-secondary text-on-secondary shadow'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>카테고리 ({localCategories.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold transition-all flex items-center space-x-1 sm:space-x-1.5 whitespace-nowrap ${
                  activeTab === 'presets'
                    ? 'bg-secondary text-on-secondary shadow'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>프리셋 ({allPresets.length})</span>
              </button>
            </div>

            {/* Desktop Close */}
            <button
              type="button"
              onClick={handleAttemptClose}
              className="hidden sm:flex w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Items Management */}
        {activeTab === 'items' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {/* Control Bar: Search, Category Filters, Clear Favorites, Add Button */}
            <div className="p-2.5 sm:p-4 border-b border-white/10 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-dim" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="상품명 검색..."
                    className="w-full bg-[#162035] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-dim hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 max-w-full scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                      selectedCategoryFilter === 'ALL'
                        ? 'bg-white text-black font-bold'
                        : 'bg-white/5 text-surface-dim hover:text-white'
                    }`}
                  >
                    전체 ({localItems.length})
                  </button>

                  {/* Favorites Category Filter */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('FAVORITES')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 flex items-center space-x-1.5 ${
                      selectedCategoryFilter === 'FAVORITES'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                        : 'bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 border border-amber-400/25'
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        selectedCategoryFilter === 'FAVORITES'
                          ? 'fill-slate-950 text-slate-950'
                          : 'fill-amber-400 text-amber-400'
                      }`}
                    />
                    <span>즐겨찾기 ({favoritesCount})</span>
                  </button>

                  {localCategories.map(cat => {
                    const count = localItems.filter(it => it.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat.id)}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
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
              </div>

              {/* Actions Right */}
              <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0">
                {/* View Mode & Column Density Controls */}
                <div className="flex items-center bg-[#162035] border border-white/10 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="카드 그리드 뷰"
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-secondary text-on-secondary shadow-sm'
                        : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Count Preset Pills (when in grid mode, on medium+ screens) */}
                {viewMode === 'grid' && (
                  <div className="hidden sm:flex items-center bg-[#162035] border border-white/10 rounded-xl p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setColDensity('auto')}
                      title="화면 너비에 맞춰 자동 조정"
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
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
                        className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
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

                {/* Add New Item Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setShowAddModal(true);
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-secondary text-on-secondary hover:brightness-110 transition-all flex items-center space-x-1 sm:space-x-1.5 shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span className="whitespace-nowrap">상품 등록</span>
                </button>
              </div>
            </div>

            {/* Items Grid / Table List */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 min-h-0 custom-scrollbar">
              {/* Category-level Favorites Management Banner */}
              {selectedCategoryFilter === 'FAVORITES' && (
                <div className="mb-3 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2 text-xs text-amber-300">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                    <span>
                      즐겨찾기 상품 <strong>{favoritesCount}개</strong>를 모아보고 있습니다.
                    </span>
                  </div>
                  {favoritesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearFavoritesConfirm(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                    >
                      <StarOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>즐겨찾기 모두 해제</span>
                    </button>
                  )}
                </div>
              )}
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
                    className="mt-3 text-xs text-secondary font-bold hover:underline cursor-pointer"
                  >
                    새 상품 추가하기
                  </button>
                </div>
              ) : viewMode === 'table' ? (
                /* Compact View: Mobile friendly list rows on small screens, clean table on sm+ */
                <div>
                  {/* Mobile Row View (Block/Card rows without horizontal scroll) */}
                  <div className="block sm:hidden space-y-2">
                    {filteredItems.map(item => {
                      const category = localCategories.find(c => c.id === item.categoryId);
                      const isSoldOut = item.stock <= 0;
                      const isLow = item.stock > 0 && item.stock <= 5;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-colors bg-[#111c33] ${
                            !item.isActive
                              ? 'border-white/5 opacity-60'
                              : isSoldOut
                              ? 'border-red-900/30'
                              : 'border-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleFavorite(item.id)}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    item.isFavorite
                                      ? 'fill-amber-300 text-amber-300'
                                      : 'text-surface-dim'
                                  }`}
                                />
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-surface-dim">
                                    {category?.name || '미분류'}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-white truncate mt-0.5">{item.name}</h4>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-sm font-mono font-bold text-secondary">
                                {item.price.toLocaleString()}원
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(item.id)}
                                className={`mt-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                  item.isActive
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                                }`}
                              >
                                {item.isActive ? '판매 중' : '중단됨'}
                              </button>
                            </div>
                          </div>

                          {/* Mobile Row Bottom: Stock & Actions */}
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-surface-dim">재고</span>
                              <span
                                className={`font-mono text-xs font-bold ${
                                  isSoldOut
                                    ? 'text-red-400'
                                    : isLow
                                    ? 'text-amber-400'
                                    : 'text-emerald-300'
                                }`}
                              >
                                {item.stock}개
                              </span>
                              <div className="flex items-center gap-0.5 ml-1">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStock(item.id, -1)}
                                  disabled={item.stock <= 0}
                                  className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 text-surface-dim hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStock(item.id, 1)}
                                  className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStock(item.id, 10)}
                                  className="px-1.5 h-5 rounded bg-secondary/15 hover:bg-secondary/25 text-secondary text-[10px] font-bold cursor-pointer"
                                >
                                  +10
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setShowAddModal(true);
                                }}
                                title="상품 수정"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!effectiveIsAdmin) {
                                    setShowAdminRequiredModal({ isOpen: true, featureName: '상품 삭제' });
                                    return;
                                  }
                                  setDeleteConfirmItem(item);
                                }}
                                title={effectiveIsAdmin ? "상품 삭제" : "상품 삭제 (관리자 전용)"}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  effectiveIsAdmin
                                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300'
                                    : 'bg-white/5 hover:bg-amber-500/15 text-surface-dim hover:text-amber-300'
                                }`}
                              >
                                {effectiveIsAdmin ? (
                                  <Trash2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tablet & Desktop Table View */}
                  <div className="hidden sm:block border border-white/10 rounded-2xl overflow-x-auto bg-[#111c33] max-w-full">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-surface-dim uppercase font-mono text-[11px]">
                          <th className="py-3 px-3 w-10 text-center">★</th>
                          <th className="py-3 px-4">상품명</th>
                          <th className="py-3 px-3">카테고리</th>
                          <th className="py-3 px-4 text-right">판매가</th>
                          <th className="py-3 px-3 text-center">재고</th>
                          <th className="py-3 px-3 text-center">상태</th>
                          <th className="py-3 px-4 text-right">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredItems.map(item => {
                          const category = localCategories.find(c => c.id === item.categoryId);
                          const isSoldOut = item.stock <= 0;
                          const isLow = item.stock > 0 && item.stock <= 5;

                          return (
                            <tr
                              key={item.id}
                              className={`hover:bg-white/[0.03] transition-colors ${
                                !item.isActive ? 'opacity-50' : ''
                              }`}
                            >
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFavorite(item.id)}
                                  className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
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
                              <td className="py-3 px-3 text-surface-dim">
                                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[11px]">
                                  {category?.name || '미분류'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-secondary">
                                {item.price.toLocaleString()}원
                              </td>
                              <td className="py-3 px-3">
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
                                      className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 text-surface-dim hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustStock(item.id, 1)}
                                      className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustStock(item.id, 10)}
                                      className="px-1 h-5 rounded bg-secondary/15 hover:bg-secondary/25 text-secondary text-[10px] font-bold cursor-pointer"
                                    >
                                      +10
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(item.id)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
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
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!effectiveIsAdmin) {
                                        setShowAdminRequiredModal({ isOpen: true, featureName: '상품 삭제' });
                                        return;
                                      }
                                      setDeleteConfirmItem(item);
                                    }}
                                    title={effectiveIsAdmin ? "상품 삭제" : "상품 삭제 (관리자 전용)"}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      effectiveIsAdmin
                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300'
                                        : 'bg-white/5 hover:bg-amber-500/15 text-surface-dim hover:text-amber-300'
                                    }`}
                                  >
                                    {effectiveIsAdmin ? (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    ) : (
                                      <Lock className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Responsive Grid View (2-column layout on mobile, responsive on tablet/desktop) */
                <div
                  className={
                    colDensity === '2'
                      ? 'grid grid-cols-2 gap-2 sm:gap-3.5'
                      : colDensity === '3'
                      ? 'grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3.5'
                      : colDensity === '4'
                      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3.5'
                      : colDensity === '5'
                      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3'
                      : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7 gap-2 sm:gap-3.5'
                  }
                >
                  {filteredItems.map(item => {
                    const category = localCategories.find(c => c.id === item.categoryId);
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
                        <div className="bg-[#0b1324] border border-white/5 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-1 mb-2.5">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="text-xs text-surface-dim whitespace-nowrap shrink-0">재고</span>
                            <span
                              className={`text-xs sm:text-sm font-mono font-bold whitespace-nowrap shrink-0 ${
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
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 whitespace-nowrap shrink-0">
                                품절
                              </span>
                            )}
                            {isLow && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 whitespace-nowrap shrink-0">
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
                              onClick={() => {
                                if (!effectiveIsAdmin) {
                                  setShowAdminRequiredModal({ isOpen: true, featureName: '상품 삭제' });
                                  return;
                                }
                                setDeleteConfirmItem(item);
                              }}
                              title={effectiveIsAdmin ? "상품 삭제" : "상품 삭제 (관리자 전용)"}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                                effectiveIsAdmin
                                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300'
                                  : 'bg-white/5 hover:bg-amber-500/15 text-surface-dim hover:text-amber-300'
                              }`}
                            >
                              {effectiveIsAdmin ? (
                                <Trash2 className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Floating Batch Save Bar when changes exist */}
            {hasChanges && (
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#0d162b]/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0">
                    <Save className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5">
                      <span>수정된 품목이 <strong className="text-emerald-300 font-extrabold underline decoration-emerald-400">{modifiedItems.length}건</strong> 있습니다.</span>
                    </div>
                    <p className="text-[11px] text-surface-dim hidden sm:block">
                      재고 증감 및 정보 변경을 모두 마친 후 [변경사항 일괄 저장]을 누르면 즉시 동기화되고 단 1개의 활동 로그만 기록됩니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    disabled={isSavingChanges}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-surface-dim hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>되돌리기</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={isSavingChanges}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingChanges ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Check className="w-4 h-4 text-slate-950" />
                    )}
                    <span>변경사항 일괄 저장 ({modifiedItems.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Category Management */}
        {activeTab === 'categories' && (
          <div className="flex-1 flex flex-col p-3.5 sm:p-6 min-h-0 overflow-y-auto custom-scrollbar relative">
            {/* Add New Category Box */}
            <form
              onSubmit={handleAddCategory}
              className="bg-[#111c33] border border-white/10 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6 shrink-0"
            >
              <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="새 카테고리 이름 입력 (예: 제과류, 핫도그, 음료)"
                  className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/50"
                />
              </div>
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-secondary text-on-secondary disabled:opacity-40 hover:brightness-110 transition-all flex items-center justify-center space-x-1 shrink-0 cursor-pointer h-9 sm:h-auto"
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
              {localCategories.map((cat, idx) => {
                const assignedItemsCount = localItems.filter(it => it.categoryId === cat.id).length;
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
                        disabled={idx === localCategories.length - 1}
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
                        onClick={() => {
                          if (!effectiveIsAdmin) {
                            setShowAdminRequiredModal({ isOpen: true, featureName: '카테고리 삭제' });
                            return;
                          }
                          setDeleteConfirmCat(cat);
                        }}
                        title={effectiveIsAdmin ? "카테고리 삭제" : "카테고리 삭제 (관리자 전용)"}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ml-1 cursor-pointer transition-colors ${
                          effectiveIsAdmin
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300'
                            : 'bg-white/5 hover:bg-amber-500/15 text-surface-dim hover:text-amber-300'
                        }`}
                      >
                        {effectiveIsAdmin ? (
                          <Trash2 className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
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
          <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 custom-scrollbar">
            {/* Admin Permission Status Banner */}
            {effectiveIsAdmin ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-emerald-300">관리자 권한 활성화됨</div>
                    <p className="text-emerald-200/80 text-[11px] sm:text-xs">
                      새 프리셋 생성, 기존 프리셋 적용, 수정, 갱신, 삭제 및 시트 연동이 모두 가능합니다.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#162035] border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-amber-200">
                      프리셋 설정 및 메뉴 동기화는 관리자 전용 권한입니다
                    </h4>
                    <p className="text-[11px] sm:text-xs text-surface-dim mt-0.5 leading-relaxed">
                      등록된 프리셋 목록과 상세 품목 구성은 자유롭게 둘러볼 수 있으며, 프리셋 적용·저장·수정·삭제 및 시트 가져오기는 Google 관리자 계정으로 로그인 후 실행할 수 있습니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleAdminLogin}
                  disabled={isGoogleLoading}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center space-x-1.5 shrink-0 transition-all cursor-pointer shadow active:scale-95 disabled:opacity-50"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  <span>Google 관리자 로그인</span>
                </button>
              </div>
            )}

            {/* Section 0: Google Sheets / Excel Import Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c223a] via-[#0f1d3d] to-[#0a172e] border-2 border-secondary/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 shadow-lg shadow-secondary/30">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      구글 시트 / 엑셀 재고로 새 프리셋 만들기
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30">
                      5열 표준 양식
                    </span>
                    {!effectiveIsAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>관리자 전용</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-dim leading-relaxed">
                    시트의 [<strong>상품명, 카테고리, 판매가, 재고, 즐겨찾기</strong>] 데이터를 복사-붙여넣기하거나 파일을 올려 한 번에 새 프리셋을 생성하고 포스기에 즉시 세팅합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!effectiveIsAdmin) {
                    setShowAdminRequiredModal({ isOpen: true, featureName: '시트/엑셀 재고 가져오기' });
                    return;
                  }
                  setShowSheetImportModal(true);
                }}
                className={`w-full md:w-auto px-4.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 shrink-0 shadow-lg active:scale-[0.98] cursor-pointer ${
                  effectiveIsAdmin
                    ? 'bg-secondary hover:brightness-110 text-on-secondary shadow-secondary/25'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                }`}
              >
                {effectiveIsAdmin ? (
                  <FileSpreadsheet className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>시트/엑셀 재고 가져오기</span>
              </button>
            </div>

            {/* Section 1: Save Current Menu as New Preset */}
            <div className="p-3.5 sm:p-5 rounded-2xl bg-[#111c33] border border-white/10 space-y-3 sm:space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                  <BookmarkPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    현재 메뉴 구성을 새 프리셋으로 저장
                  </h3>
                  <p className="text-[11px] sm:text-xs text-surface-dim">
                    현재 활성화된 카테고리({categories.length}개) 및 상품({items.length}종)을 스냅샷으로 저장합니다.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreatePresetFromCurrent} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 pt-1">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    placeholder="프리셋 이름 (예: 축제 매점 특별메뉴)"
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/50"
                  />
                </div>
                <div className="sm:col-span-5 md:col-span-6">
                  <input
                    type="text"
                    value={newPresetDesc}
                    onChange={e => setNewPresetDesc(e.target.value)}
                    placeholder="프리셋 설명 (선택 사항)"
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/50"
                  />
                </div>
                <div className="sm:col-span-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={!newPresetName.trim() || isSavingPreset}
                    className="w-full h-full py-2.5 px-3 rounded-xl text-xs font-bold bg-secondary text-on-secondary disabled:opacity-40 hover:brightness-110 transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow min-h-[38px]"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingPreset ? '저장 중...' : '프리셋 저장'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section 2: Preset List */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <h3 className="text-xs font-bold text-surface-dim uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-secondary" />
                  <span>사용 가능한 메뉴 프리셋 ({allPresets.length}개)</span>
                </h3>

                {/* Preset Filter Tabs (All / Custom / BuiltIn) */}
                <div className="flex items-center space-x-1 bg-[#162035] border border-white/10 rounded-xl p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setPresetTypeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      presetTypeFilter === 'ALL'
                        ? 'bg-secondary text-on-secondary shadow-sm'
                        : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    전체 ({allPresets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetTypeFilter('CUSTOM')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      presetTypeFilter === 'CUSTOM'
                        ? 'bg-secondary text-on-secondary shadow-sm'
                        : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    사용자 정의 ({customPresets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetTypeFilter('BUILTIN')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      presetTypeFilter === 'BUILTIN'
                        ? 'bg-secondary text-on-secondary shadow-sm'
                        : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    기본 프리셋 ({builtInPresets.length})
                  </button>
                </div>
              </div>

              {/* Preset Cards Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                {filteredPresets.map(preset => {
                  const isExpanded = expandedPresetId === preset.id;
                  const totalStock = preset.items.reduce((s, it) => s + (it.stock || 0), 0);

                  return (
                    <div
                      key={preset.id}
                      className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                        preset.isBuiltIn
                          ? 'bg-[#101b38] border-indigo-500/20 hover:border-indigo-500/40 shadow-sm'
                          : 'bg-[#111c33] border-white/10 hover:border-white/20 shadow-sm'
                      }`}
                    >
                      {/* Preset Content */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col">
                        {/* Type & Meta Header */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {preset.isBuiltIn ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                기본 프리셋
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                사용자 정의
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-surface-dim border border-white/10" title={`프리셋 고유 ID: ${preset.id}`}>
                              ID: {preset.id}
                            </span>
                          </div>
                          {preset.createdAt && (
                            <span className="text-[10px] text-surface-dim/70">
                              {preset.isBuiltIn ? preset.createdAt : new Date(preset.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-base font-bold text-white tracking-tight">{preset.name}</h4>
                        <p className="text-xs text-surface-dim mt-1 line-clamp-2 leading-relaxed">
                          {preset.description || '별도 설명 없음'}
                        </p>

                        {/* Quick Metrics Chips */}
                        <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-white/5 text-[11px] text-center">
                          <div className="bg-white/5 p-1.5 rounded-lg">
                            <span className="text-surface-dim block text-[10px]">상품</span>
                            <strong className="text-white font-mono">{preset.items.length}종</strong>
                          </div>
                          <div className="bg-white/5 p-1.5 rounded-lg">
                            <span className="text-surface-dim block text-[10px]">카테고리</span>
                            <strong className="text-white font-mono">{preset.categories.length}개</strong>
                          </div>
                          <div className="bg-white/5 p-1.5 rounded-lg">
                            <span className="text-surface-dim block text-[10px]">총 재고</span>
                            <strong className="text-secondary font-mono">{totalStock.toLocaleString()}개</strong>
                          </div>
                        </div>

                        {/* Preview Expand Area */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5 text-xs animate-in fade-in">
                            <div>
                              <span className="text-[11px] font-bold text-surface-dim block mb-1">포함된 카테고리:</span>
                              <div className="flex flex-wrap gap-1">
                                {preset.categories.length === 0 ? (
                                  <span className="text-surface-dim text-xs italic">카테고리 없음</span>
                                ) : (
                                  preset.categories.map(c => (
                                    <span key={c.id} className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px]">
                                      {c.name}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-[11px] font-bold text-surface-dim block mb-1">
                                포함된 상품 목록 ({preset.items.length}종):
                              </span>
                              <div className="max-h-36 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                {preset.items.length === 0 ? (
                                  <span className="text-surface-dim text-xs italic">등록된 상품 없음</span>
                                ) : (
                                  preset.items.map(it => (
                                    <div key={it.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-black/20 border border-white/5">
                                      <span className="text-white truncate pr-2">{it.name}</span>
                                      <div className="flex items-center space-x-2 shrink-0 font-mono text-surface-dim text-[10px]">
                                        <span>{it.price.toLocaleString()}원</span>
                                        <span className="text-secondary font-bold">{it.stock}개</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Preset Action Bar (Mobile-first 2-Row Layout) */}
                      <div className="p-3 bg-[#0a1022] border-t border-white/10 space-y-2">
                        {/* Row 1: Preview Toggle & Secondary Controls */}
                        <div className="flex items-center justify-between gap-1.5">
                          {/* Preview Toggle */}
                          <button
                            type="button"
                            onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isExpanded ? '상세 접기' : '미리보기'}</span>
                          </button>

                          {/* Custom Preset Controls */}
                          {!preset.isBuiltIn && (
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPreset(preset)}
                                title="이름 및 설명 수정"
                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white flex items-center justify-center cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOverwritePresetWithCurrent(preset)}
                                title="현재 POS 메뉴 상태로 프리셋 덮어쓰기 저장"
                                className="px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 flex items-center space-x-1 cursor-pointer"
                              >
                                <Save className="w-3 h-3" />
                                <span>현재메뉴로 갱신</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTargetPreset(preset)}
                                title="프리셋 삭제"
                                className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Row 2: Full-width Primary Apply CTA Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!effectiveIsAdmin) {
                              setShowAdminRequiredModal({ isOpen: true, featureName: '프리셋 메뉴 설정' });
                              return;
                            }
                            setApplyTargetPreset(preset);
                          }}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.99] ${
                            effectiveIsAdmin
                              ? 'bg-secondary hover:brightness-110 text-on-secondary'
                              : 'bg-white/10 hover:bg-white/15 text-surface-dim hover:text-white border border-white/10'
                          }`}
                        >
                          {effectiveIsAdmin ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>{effectiveIsAdmin ? '이 프리셋으로 설정하기' : '이 프리셋으로 설정하기 (관리자 전용)'}</span>
                        </button>
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
            categories={localCategories}
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

        {/* Sheet / Excel Import Modal */}
        {showSheetImportModal && (
          <PosSheetImportModal
            currentCategories={localCategories}
            currentItems={localItems}
            onApplyPreset={handleApplyFromSheet}
            onSavePreset={handleSavePresetFromSheet}
            onClose={() => setShowSheetImportModal(false)}
            showToast={showToast}
          />
        )}

        {/* Modal: Admin Required Notification */}
        {showAdminRequiredModal.isOpen && (
          <div className="fixed inset-0 z-[240] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#0f172a] border border-amber-500/40 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">관리자 권한이 필요합니다</h4>
                <p className="text-xs text-surface-dim mt-1.5 leading-relaxed">
                  <strong className="text-amber-300">'{showAdminRequiredModal.featureName}'</strong> 기능은 매점 관리자(Google 관리자 계정) 전용 작업입니다.
                </p>
                <div className="mt-2.5 p-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-surface-dim">
                  등록된 Google 관리자 계정으로 로그인하시면 즉시 실행하실 수 있습니다.
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleGoogleAdminLogin}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>Google 관리자로 로그인</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminRequiredModal({ isOpen: false, featureName: '' })}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/10 text-surface-dim hover:text-white cursor-pointer transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Unsaved Changes Confirm on Close */}
        {showUnsavedConfirmModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#0f172a] border border-amber-500/40 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center mx-auto shadow-lg">
                <Save className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">저장되지 않은 변경사항이 있습니다</h4>
                <p className="text-xs text-surface-dim mt-2 leading-relaxed">
                  재고 또는 상품 정보가 <strong className="text-amber-300 font-bold">{modifiedItems.length}건</strong> 수정되었습니다.<br/>
                  저장하지 않고 닫으시면 수정한 내용이 모두 취소됩니다.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveChanges();
                    setShowUnsavedConfirmModal(false);
                    onClose();
                  }}
                  disabled={isSavingChanges}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isSavingChanges ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>저장하고 닫기</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDiscardChanges();
                    setShowUnsavedConfirmModal(false);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-red-500/20 text-surface-dim hover:text-red-300 border border-transparent hover:border-red-500/30 cursor-pointer transition-colors"
                >
                  저장 안 하고 닫기 (변경 취소)
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnsavedConfirmModal(false)}
                  className="w-full py-2 rounded-xl text-xs font-medium text-surface-dim hover:text-white cursor-pointer"
                >
                  계속 수정하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
