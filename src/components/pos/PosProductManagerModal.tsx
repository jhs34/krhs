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
  Ban,
  TrendingUp,
} from 'lucide-react';
import { PosCategory, PosItem, PosPreset, PosUser, PosItemChangeDetail, PosFieldDiff } from '../../types/pos';
import { DEFAULT_POS_CATEGORIES, DEFAULT_POS_ITEMS } from '../../data/defaultPosData';
import {
  subscribePosPresets,
  savePosPreset,
  deletePosPreset,
  saveBatchPosItemsWithSummary,
  saveBatchPosCategories,
  deletePosCategory,
} from '../../services/posFirestore';
import { loginWithGoogle, logout } from '../../firebase';
import { createGoogleAdminPosUser, isGoogleAdminEmail } from '../../services/posAuth';
import { AnimatePresence, motion } from 'motion/react';
import { PosItemFormModal } from './PosItemFormModal';
import { PosSheetImportModal } from './PosSheetImportModal';
import { POS_MODAL_BACKDROP_TRANSITION, POS_MODAL_PANEL_TRANSITION } from '../../utils/motion';

interface PosProductManagerModalProps {
  categories: PosCategory[];
  items: PosItem[];
  todaySoldMap?: Record<string, number>;
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
  todaySoldMap,
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
    return localItems.filter(local => {
      const orig = items.find(it => it.id === local.id);
      if (!orig) return true; // Newly added
      const origSoldOut = Boolean(orig.isSoldOut);
      const localSoldOut = Boolean(local.isSoldOut);
      return (
        orig.name !== local.name ||
        orig.price !== local.price ||
        origSoldOut !== localSoldOut ||
        orig.categoryId !== local.categoryId ||
        Boolean(orig.isFavorite) !== Boolean(local.isFavorite) ||
        orig.isActive !== local.isActive ||
        orig.barcode !== local.barcode
      );
    });
  }, [localItems, items]);

  const isCategoriesModified = useMemo(() => {
    if (localCategories.length !== categories.length) return true;
    return localCategories.some((c, idx) => {
      const orig = categories[idx];
      return !orig || orig.name !== c.name || orig.orderIndex !== c.orderIndex;
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
      const userEmail = (googleUser?.email || googleUser?.providerData?.[0]?.email || '').toLowerCase().trim();
      if (!googleUser || !userEmail) {
        showToast('구글 계정 이메일 정보를 확인할 수 없습니다.', 'error');
        return;
      }
      if (!googleUser.emailVerified || !isGoogleAdminEmail(userEmail)) {
        await logout();
        showToast(`승인된 관리자 계정이 아닙니다. (${userEmail})`, 'error');
        return;
      }
      const adminUser = createGoogleAdminPosUser(
        userEmail,
        googleUser.displayName,
        googleUser.uid
      );
      setLocalIsAdmin(true);
      if (onGoogleAdminLogin) {
        onGoogleAdminLogin(adminUser);
      }
      showToast('관리자 계정으로 인증되었습니다.', 'success');
      setShowAdminRequiredModal({ isOpen: false, featureName: '' });
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
  const [colDensity, setColDensity] = useState<'auto' | '3' | '4' | '5' | '6'>('auto');

  // Category Tab state
  const [newCatName, setNewCatName] = useState('');
  const [editingCatOldName, setEditingCatOldName] = useState<string | null>(null);
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
        description: '라면 10종, 한강라면 4종, 과자 8종, 간식 3종, 음료수 7종, 아이스크림 1종 (총 33종 기본 메뉴 세트)',
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

  // Helper: check if item is sold out
  const isItemSoldOut = (it: PosItem) => Boolean(it.isSoldOut);

  // Filtered items (using localItems)
  const findCategoryOfItem = (itemCatId?: string) => {
    if (!itemCatId) return undefined;
    const clean = itemCatId.trim().toLowerCase();
    return localCategories.find(c => c.name.trim().toLowerCase() === clean);
  };

  const filteredItems = useMemo(() => {
    return localItems.filter(item => {
      const matchCat =
        selectedCategoryFilter === 'ALL'
          ? true
          : selectedCategoryFilter === 'FAVORITES'
          ? item.isFavorite
          : selectedCategoryFilter === 'SOLDOUT'
          ? isItemSoldOut(item)
          : (item.categoryId || '').trim().toLowerCase() === selectedCategoryFilter.trim().toLowerCase();
      const matchQuery =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchQuery;
    });
  }, [localItems, selectedCategoryFilter, searchQuery]);

  // Statistics (using localItems)
  const outOfStockCount = useMemo(() => localItems.filter(isItemSoldOut).length, [localItems]);
  const inStockCount = useMemo(() => localItems.length - outOfStockCount, [localItems, outOfStockCount]);
  const totalSoldCount = useMemo(() => localItems.reduce((sum, it) => sum + (it.totalSold || 0), 0), [localItems]);
  const favoritesCount = useMemo(() => localItems.filter(it => it.isFavorite).length, [localItems]);

  // Item Local Handlers (Fast local update only - no Firestore calls until 'Save' is pressed)
  const handleToggleSoldOut = (itemId: string) => {
    isDirtyRef.current = true;
    setLocalItems(prev =>
      prev.map(it => {
        if (it.id === itemId) {
          const nextSoldOut = !Boolean(it.isSoldOut);
          return {
            ...it,
            isSoldOut: nextSoldOut,
          };
        }
        return it;
      })
    );
  };

  const handleBatchSetSoldOut = (soldOut: boolean) => {
    isDirtyRef.current = true;
    const targetIds = new Set(filteredItems.map(it => it.id));
    setLocalItems(prev =>
      prev.map(it => {
        if (targetIds.has(it.id)) {
          return {
            ...it,
            isSoldOut: soldOut,
          };
        }
        return it;
      })
    );
    showToast(
      `${filteredItems.length}개 상품이 '${soldOut ? '품절' : '판매중'}' 상태로 일괄 변경되었습니다. (일괄 저장 버튼으로 확정)`,
      'success'
    );
  };

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

  // Category Handlers (Local)
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) return;

    if (localCategories.some(c => c.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      showToast(`'${cleanName}' 카테고리는 이미 존재합니다.`, 'error');
      return;
    }

    const newCategory: PosCategory = {
      name: cleanName,
      orderIndex: localCategories.length + 1,
    };

    isDirtyRef.current = true;
    setLocalCategories(prev => [...prev, newCategory]);
    setNewCatName('');
    showToast(`'${newCategory.name}' 카테고리가 추가되었습니다. (저장 버튼을 눌러 확정)`);
  };

  const handleSaveCategoryName = (oldName: string) => {
    const cleanName = editingCatName.trim();
    if (!cleanName) return;

    if (localCategories.some(c => c.name.trim().toLowerCase() === cleanName.toLowerCase() && c.name !== oldName)) {
      showToast(`'${cleanName}' 카테고리 이름이 이미 존재합니다.`, 'error');
      return;
    }

    isDirtyRef.current = true;
    setLocalCategories(prev =>
      prev.map(c => (c.name === oldName ? { ...c, name: cleanName } : c))
    );
    // Cascade rename to local items so assigned items are preserved
    setLocalItems(prev =>
      prev.map(it => (it.categoryId === oldName ? { ...it, categoryId: cleanName } : it))
    );
    if (oldName !== cleanName) {
      deletePosCategory(oldName, oldName).catch(() => {});
    }
    setEditingCatOldName(null);
    setEditingCatName('');
    showToast(`카테고리 이름이 '${cleanName}'(으)로 변경되었습니다. (저장 버튼을 눌러 확정)`);
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

    const hasItems = localItems.some(
      it => it.categoryId.trim().toLowerCase() === deleteConfirmCat.name.trim().toLowerCase()
    );
    if (hasItems) {
      showToast('해당 카테고리에 배정된 상품이 있어 삭제할 수 없습니다. 상품을 먼저 이동하거나 삭제하세요.', 'error');
      setDeleteConfirmCat(null);
      return;
    }

    isDirtyRef.current = true;
    if (onDeleteCategory) {
      onDeleteCategory(deleteConfirmCat.name);
    }
    deletePosCategory(deleteConfirmCat.name, deleteConfirmCat.name).catch(() => {});
    setLocalCategories(prev => prev.filter(c => c.name !== deleteConfirmCat.name));
    showToast(`'${deleteConfirmCat.name}' 카테고리가 삭제되었습니다.`);
    setDeleteConfirmCat(null);
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
        const cat = localCategories.find(c => c.name.trim().toLowerCase() === newItem.categoryId.trim().toLowerCase());
        const catName = cat ? cat.name : '기본 카테고리';

        if (!oldItem) {
          detailsList.push(`[${newItem.name}] 신규등록 (상태: ${newItem.isSoldOut ? '품절' : '판매중'})`);
          itemChanges.push({
            itemId: newItem.id,
            itemName: newItem.name,
            categoryName: catName,
            changeType: 'CREATED',
            summary: `신규 상품 등록 (판매가: ${newItem.price.toLocaleString()}원, 상태: ${newItem.isSoldOut ? '품절' : '판매중'})`,
            diffs: [
              { field: 'price', label: '판매 가격', from: '없음', to: `${newItem.price.toLocaleString()}원` },
              { field: 'isSoldOut', label: '판매 상태', from: '없음', to: newItem.isSoldOut ? '품절' : '판매중' },
            ],
          });
        } else {
          const subChanges: string[] = [];
          const diffs: PosFieldDiff[] = [];

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
            const oldCatName = localCategories.find(c => c.name.trim().toLowerCase() === oldItem.categoryId.trim().toLowerCase())?.name || '이전 카테고리';
            subChanges.push(`카테고리 '${oldCatName}'→'${catName}'`);
            diffs.push({
              field: 'categoryId',
              label: '카테고리',
              from: oldCatName,
              to: catName,
            });
          }
          const oldSoldOut = Boolean(oldItem.isSoldOut);
          const newSoldOut = Boolean(newItem.isSoldOut);
          if (oldSoldOut !== newSoldOut) {
            subChanges.push(newSoldOut ? '품절 처리' : '판매 개시(품절 해제)');
            diffs.push({
              field: 'isSoldOut',
              label: '품절 상태',
              from: oldSoldOut ? '품절' : '판매중',
              to: newSoldOut ? '품절' : '판매중',
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
      showToast(
        modifiedItems.length > 0
          ? `총 ${modifiedItems.length}개 상품의 변경사항이 안전하게 저장되었습니다.`
          : '카테고리 구성 변경사항이 안전하게 저장되었습니다.',
        'success'
      );
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

  // Preset Handlers (생성 · 수정 · 적용은 PIN 근무자 포함 전체 허용 / 영구 삭제는 관리자 전용)
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={POS_MODAL_BACKDROP_TRANSITION}
      className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={POS_MODAL_PANEL_TRANSITION}
        className="bg-primary border border-white/10 w-full max-w-[1440px] h-full sm:h-[92vh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-white/10 bg-[#0a1120] shrink-0 flex flex-col gap-2.5">
          {/* Row 1: Title + Stats on Left, Actions + Desktop Tabs + Pinned Close Button on Right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight whitespace-nowrap shrink-0">
                상품 관리
              </h2>
              <span className="text-xs text-surface-dim font-mono tabular-nums truncate">
                전체 {localItems.length} · 품절 {outOfStockCount}
                {hasChanges && (
                  <span className="ml-1.5 text-amber-300 font-sans font-bold">
                    · 수정 {modifiedItems.length > 0 ? `${modifiedItems.length}건` : '대기'}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {hasChanges && (
                <div className="hidden sm:flex items-center gap-1.5 mr-0.5">
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    disabled={isSavingChanges}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={isSavingChanges}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary hover:bg-secondary/90 text-white transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {isSavingChanges ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{modifiedItems.length > 0 ? `저장 (${modifiedItems.length})` : '저장'}</span>
                  </button>
                </div>
              )}

              {!effectiveIsAdmin ? (
                <button
                  type="button"
                  onClick={handleGoogleAdminLogin}
                  disabled={isGoogleLoading}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white border border-white/10 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {isGoogleLoading ? '...' : '관리자 전환'}
                </button>
              ) : (
                <span className="hidden sm:inline text-xs font-bold text-secondary-container whitespace-nowrap px-1">
                  관리자
                </span>
              )}

              {/* Desktop Segmented Tabs (lg and up) */}
              <div className="hidden lg:flex items-center gap-1 bg-primary p-1 rounded-lg border border-white/10 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'items'
                      ? 'bg-secondary text-white font-bold'
                      : 'text-surface-dim hover:text-white'
                  }`}
                >
                  상품 ({localItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('categories')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'categories'
                      ? 'bg-secondary text-white font-bold'
                      : 'text-surface-dim hover:text-white'
                  }`}
                >
                  카테고리 ({localCategories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'presets'
                      ? 'bg-secondary text-white font-bold'
                      : 'text-surface-dim hover:text-white'
                  }`}
                >
                  프리셋 ({allPresets.length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleAttemptClose}
                aria-label="상품 관리 닫기"
                className="p-1.5 sm:p-2 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Row 2 (Mobile & Tablet < lg): Full-width Segmented Tabs + Mobile Unsaved Action Bar */}
          <div className="lg:hidden flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-1 bg-primary p-1 rounded-lg border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`py-1.5 px-2 rounded-md font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
                  activeTab === 'items'
                    ? 'bg-secondary text-white font-bold'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                상품 ({localItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`py-1.5 px-2 rounded-md font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-secondary text-white font-bold'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                카테고리 ({localCategories.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`py-1.5 px-2 rounded-md font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
                  activeTab === 'presets'
                    ? 'bg-secondary text-white font-bold'
                    : 'text-surface-dim hover:text-white'
                }`}
              >
                프리셋 ({allPresets.length})
              </button>
            </div>

            {hasChanges && (
              <div className="sm:hidden flex items-center justify-between gap-2 pt-0.5">
                <span className="text-xs font-bold text-amber-300 truncate">
                  미저장 변경 {modifiedItems.length > 0 ? `${modifiedItems.length}건` : '있음'}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    disabled={isSavingChanges}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={isSavingChanges}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary hover:bg-secondary/90 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingChanges ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{modifiedItems.length > 0 ? `저장 (${modifiedItems.length})` : '저장'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Items Management */}
        {activeTab === 'items' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {/* Toolbar */}
            <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0a1120]/50 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
                <div className="relative w-full sm:w-56 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-dim" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="상품 검색"
                    className="w-full bg-[#0a1120] border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/40"
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

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                      selectedCategoryFilter === 'ALL'
                        ? 'bg-secondary text-white font-bold'
                        : 'bg-white/5 text-surface-dim hover:text-white'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('FAVORITES')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 cursor-pointer ${
                      selectedCategoryFilter === 'FAVORITES'
                        ? 'bg-secondary text-white font-bold'
                        : 'bg-white/5 text-surface-dim hover:text-white'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>즐겨찾기 ({favoritesCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('SOLDOUT')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                      selectedCategoryFilter === 'SOLDOUT'
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-white/5 text-surface-dim hover:text-white'
                    }`}
                  >
                    품절 ({outOfStockCount})
                  </button>

                  {localCategories.map(cat => {
                    const catCleanName = cat.name.trim().toLowerCase();
                    const isSelected = selectedCategoryFilter.trim().toLowerCase() === catCleanName;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat.name)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-secondary text-white font-bold'
                            : 'bg-white/5 text-surface-dim hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0">
                {selectedCategoryFilter === 'FAVORITES' && favoritesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowClearFavoritesConfirm(true)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
                  >
                    즐겨찾기 초기화
                  </button>
                )}

                <div className="flex items-center bg-[#0a1120] border border-white/10 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="그리드"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'grid' ? 'bg-secondary text-white' : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    title="목록"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'table' ? 'bg-secondary text-white' : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setShowAddModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary text-white hover:bg-secondary/90 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>상품 추가</span>
                </button>
              </div>
            </div>

            {/* Items List / Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-center">
                  <p className="text-surface-dim text-sm">표시할 상품이 없습니다.</p>
                </div>
              ) : viewMode === 'table' ? (
                <div className="border-t border-b border-white/10">
                  {/* Mobile Compact 2-Line List (md:hidden) */}
                  <div className="md:hidden divide-y divide-white/5">
                    {filteredItems.map(item => {
                      const category = findCategoryOfItem(item.categoryId);
                      const isSoldOut = isItemSoldOut(item);
                      const isItemModified = modifiedItems.some(m => m.id === item.id);
                      const todaySold = todaySoldMap?.[item.id] || 0;

                      return (
                        <div
                          key={item.id}
                          className={`py-3 px-2 flex flex-col gap-2 transition-colors ${!item.isActive ? 'opacity-45' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleFavorite(item.id)}
                                className="p-1 text-surface-dim hover:text-white shrink-0 cursor-pointer"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-surface-dim/40'
                                  }`}
                                />
                              </button>
                              <span className="font-bold text-white text-xs truncate">{item.name}</span>
                              <span className="text-[11px] text-surface-dim shrink-0">· {category?.name || '미분류'}</span>
                              {isItemModified && (
                                <span className="text-[10px] text-amber-300 shrink-0">· 수정</span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-xs text-white tabular-nums shrink-0">
                              {item.price.toLocaleString()}원
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pl-6 text-[11px]">
                            <div className="font-mono tabular-nums text-surface-dim">
                              {todaySold > 0 && (
                                <span className="text-secondary-container font-bold mr-2">오늘 {todaySold}</span>
                              )}
                              <span>누적 {item.totalSold || 0}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleSoldOut(item.id)}
                                className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                                  isSoldOut
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                                }`}
                              >
                                {isSoldOut ? '품절' : '판매중'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(item.id)}
                                className={`px-2 py-1 rounded bg-white/5 text-[11px] font-semibold cursor-pointer ${
                                  item.isActive ? 'text-surface-dim' : 'text-rose-400'
                                }`}
                              >
                                {item.isActive ? '진열' : '숨김'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setShowAddModal(true);
                                }}
                                className="p-1.5 rounded bg-white/5 text-surface-dim hover:text-white cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {effectiveIsAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmItem(item)}
                                  className="p-1.5 rounded bg-white/5 text-surface-dim hover:text-rose-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table (hidden md:block) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-surface-dim text-[11px]">
                          <th className="py-2.5 px-3 w-10 text-center">★</th>
                          <th className="py-2.5 px-3">상품명</th>
                          <th className="py-2.5 px-3">카테고리</th>
                          <th className="py-2.5 px-3 text-right">가격</th>
                          <th className="py-2.5 px-3 text-right">판매량</th>
                          <th className="py-2.5 px-3 text-center">상태</th>
                          <th className="py-2.5 px-3 text-center">노출</th>
                          <th className="py-2.5 px-3 text-right">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredItems.map(item => {
                          const category = findCategoryOfItem(item.categoryId);
                          const isSoldOut = isItemSoldOut(item);
                          const isItemModified = modifiedItems.some(m => m.id === item.id);
                          const todaySold = todaySoldMap?.[item.id] || 0;

                          return (
                            <tr
                              key={item.id}
                              className={`hover:bg-white/[0.02] transition-colors ${!item.isActive ? 'opacity-45' : ''}`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFavorite(item.id)}
                                  className="p-1 text-surface-dim hover:text-white cursor-pointer"
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${
                                      item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-surface-dim/40'
                                    }`}
                                  />
                                </button>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white">
                                <span>{item.name}</span>
                                {isItemModified && (
                                  <span className="ml-1.5 text-[10px] text-amber-300 font-normal">· 수정</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-surface-dim">{category?.name || '미분류'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-white tabular-nums">
                                {item.price.toLocaleString()}원
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-surface-dim">
                                {todaySold > 0 && (
                                  <span className="text-secondary-container font-bold mr-1.5">
                                    오늘 {todaySold}
                                  </span>
                                )}
                                <span>누적 {item.totalSold || 0}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSoldOut(item.id)}
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                                    isSoldOut
                                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                                  }`}
                                >
                                  {isSoldOut ? '품절' : '판매중'}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(item.id)}
                                  className={`text-[11px] font-semibold cursor-pointer ${
                                    item.isActive ? 'text-surface-dim hover:text-white' : 'text-rose-400'
                                  }`}
                                >
                                  {item.isActive ? '진열' : '숨김'}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingItem(item);
                                      setShowAddModal(true);
                                    }}
                                    className="p-1.5 rounded text-surface-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {effectiveIsAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmItem(item)}
                                      className="p-1.5 rounded text-surface-dim hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                  {filteredItems.map(item => {
                    const category = findCategoryOfItem(item.categoryId);
                    const isSoldOut = isItemSoldOut(item);
                    const isItemModified = modifiedItems.some(m => m.id === item.id);
                    const todaySold = todaySoldMap?.[item.id] || 0;

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-colors flex flex-col justify-between bg-[#0a1120] ${
                          !item.isActive
                            ? 'border-white/5 opacity-45'
                            : isSoldOut
                            ? 'border-rose-500/30'
                            : isItemModified
                            ? 'border-amber-500/40'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[11px] text-surface-dim truncate">
                              {category?.name || '미분류'}
                              {isItemModified ? ' · 수정' : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleFavorite(item.id)}
                              className="p-0.5 text-surface-dim hover:text-white transition-colors cursor-pointer shrink-0"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
                              />
                            </button>
                          </div>

                          <h3 className="text-sm font-bold text-white truncate" title={item.name}>
                            {item.name}
                          </h3>
                          <div className="flex items-baseline justify-between gap-1.5 mt-0.5">
                            <span className="text-xs font-mono font-bold text-secondary-container tabular-nums">
                              {item.price.toLocaleString()}원
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-surface-dim shrink-0">
                              {todaySold > 0 ? `오늘 ${todaySold} · ` : ''}판매 {item.totalSold || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-2.5 mt-2.5 border-t border-white/5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleSoldOut(item.id)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                                isSoldOut
                                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                              }`}
                            >
                              {isSoldOut ? '품절' : '판매중'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item.id)}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                item.isActive
                                  ? 'text-surface-dim hover:text-white'
                                  : 'text-rose-400 bg-rose-500/10'
                              }`}
                            >
                              {item.isActive ? '진열' : '숨김'}
                            </button>
                          </div>

                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setShowAddModal(true);
                              }}
                              className="p-1 rounded text-surface-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {effectiveIsAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmItem(item)}
                                className="p-1 rounded text-surface-dim hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
          <div className="flex-1 flex flex-col p-4 sm:p-6 min-h-0 overflow-y-auto custom-scrollbar max-w-3xl w-full mx-auto">
            <form onSubmit={handleAddCategory} className="flex items-center gap-2 mb-5 shrink-0">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="새 카테고리 이름"
                className="flex-1 bg-[#0a1120] border border-white/10 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/40"
              />
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-secondary text-white disabled:opacity-40 hover:bg-secondary/90 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </button>
            </form>

            <div className="border-t border-b border-white/10 divide-y divide-white/5">
              {localCategories.map((cat, idx) => {
                const assignedItemsCount = localItems.filter(
                  it => it.categoryId.trim().toLowerCase() === cat.name.trim().toLowerCase()
                ).length;
                const isEditing = editingCatOldName === cat.name;

                return (
                  <div
                    key={cat.name}
                    className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 text-surface-dim font-mono text-xs tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={e => setEditingCatName(e.target.value)}
                            className="bg-[#0a1120] border border-secondary rounded-md px-2.5 py-1 text-xs sm:text-sm text-white focus:outline-none flex-1"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryName(cat.name)}
                            className="p-1.5 rounded-md bg-secondary text-white cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatOldName(null)}
                            className="p-1.5 rounded-md bg-white/5 text-surface-dim hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="text-sm font-bold text-white truncate">{cat.name}</span>
                          <span className="text-xs font-mono tabular-nums text-surface-dim">
                            {assignedItemsCount}개
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-20 text-surface-dim hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, 'down')}
                        disabled={idx === localCategories.length - 1}
                        className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-20 text-surface-dim hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatOldName(cat.name);
                            setEditingCatName(cat.name);
                          }}
                          className="p-1.5 rounded-md hover:bg-white/10 text-surface-dim hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {effectiveIsAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmCat(cat)}
                          className="p-1.5 rounded-md hover:bg-rose-500/10 text-surface-dim hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Presets (Minimal & Clean) */}
        {activeTab === 'presets' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Compact Top Action Bar */}
            <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0a1120]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
              <form
                onSubmit={handleCreatePresetFromCurrent}
                className="flex items-center gap-2 flex-1 max-w-xl"
              >
                <input
                  type="text"
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  placeholder="현재 메뉴를 새 프리셋으로 저장 (이름 입력)"
                  className="flex-1 min-w-0 bg-[#0a1120] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-secondary placeholder:text-surface-dim/40"
                />
                <button
                  type="submit"
                  disabled={!newPresetName.trim() || isSavingPreset}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary text-white disabled:opacity-40 hover:bg-secondary/90 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingPreset ? '저장 중' : '현재 메뉴 저장'}</span>
                </button>
              </form>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-[#0a1120] border border-white/10 rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPresetTypeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      presetTypeFilter === 'ALL' ? 'bg-secondary text-white' : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    전체 ({allPresets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetTypeFilter('CUSTOM')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      presetTypeFilter === 'CUSTOM' ? 'bg-secondary text-white' : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    저장됨 ({customPresets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetTypeFilter('BUILTIN')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      presetTypeFilter === 'BUILTIN' ? 'bg-secondary text-white' : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    기본 ({builtInPresets.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSheetImportModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-secondary-container" />
                  <span>시트 불러오기</span>
                </button>
              </div>
            </div>

            {/* Preset Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPresets.map(preset => {
                  const isExpanded = expandedPresetId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      className="rounded-xl border border-white/10 hover:border-white/20 bg-[#0a1120] p-4 flex flex-col justify-between transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-bold text-white truncate">
                                {preset.name}
                              </h4>
                              <span className="text-[11px] text-surface-dim shrink-0">
                                {preset.isBuiltIn ? '기본' : '저장됨'}
                              </span>
                            </div>
                            <p className="text-xs font-mono tabular-nums text-surface-dim mt-1">
                              카테고리 {preset.categories.length} · 상품 {preset.items.length}
                            </p>
                          </div>

                          {!preset.isBuiltIn && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPreset(preset)}
                                title="이름/메모 수정"
                                className="p-1.5 rounded-md text-surface-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {effectiveIsAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTargetPreset(preset)}
                                  title="프리셋 삭제 (관리자 전용)"
                                  className="p-1.5 rounded-md text-surface-dim hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {preset.description &&
                          preset.description !== '별도 설명 없음' &&
                          !preset.description.startsWith('품목 ') && (
                            <p className="text-xs text-surface-dim/80 mt-2 line-clamp-1">
                              {preset.description}
                            </p>
                          )}

                        {/* Expandable Preview */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs">
                            <div className="text-[11px] text-surface-dim truncate">
                              분류: {preset.categories.map(c => c.name).join(', ') || '없음'}
                            </div>
                            <div className="max-h-36 overflow-y-auto pr-1 divide-y divide-white/5 border-t border-white/5 custom-scrollbar">
                              {preset.items.map(it => (
                                <div key={it.id} className="py-1.5 flex items-center justify-between text-[11px]">
                                  <span className="text-white truncate pr-2">{it.name}</span>
                                  <span className="font-mono tabular-nums text-surface-dim shrink-0">
                                    {it.price.toLocaleString()}원
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {isExpanded ? '접기' : '미리보기'}
                          </button>

                          {!preset.isBuiltIn && (
                            <button
                              type="button"
                              onClick={() => handleOverwritePresetWithCurrent(preset)}
                              title="현재 메뉴 상태로 이 프리셋 덮어쓰기"
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                            >
                              덮어쓰기
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setApplyTargetPreset(preset)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-secondary hover:bg-secondary/90 text-white transition-colors whitespace-nowrap cursor-pointer"
                        >
                          적용
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Item Form (Add / Edit) */}
        <AnimatePresence>
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
        </AnimatePresence>

        {/* Modal: Delete Item Confirm */}
        <AnimatePresence>
          {deleteConfirmItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={POS_MODAL_BACKDROP_TRANSITION}
              onClick={() => setDeleteConfirmItem(null)}
              className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 6 }}
                transition={POS_MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/10 w-full max-w-xs rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">상품 삭제</h4>
                  <p className="text-xs text-surface-dim mt-1">
                    '{deleteConfirmItem.name}' 상품을 삭제하시겠습니까?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmItem(null)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteItem}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white transition-all cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Delete Category Confirm */}
        <AnimatePresence>
          {deleteConfirmCat && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={POS_MODAL_BACKDROP_TRANSITION}
              onClick={() => setDeleteConfirmCat(null)}
              className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 6 }}
                transition={POS_MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/10 w-full max-w-xs rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">카테고리 삭제</h4>
                  <p className="text-xs text-surface-dim mt-1">
                    '{deleteConfirmCat.name}' 카테고리를 삭제하시겠습니까?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmCat(null)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCategory}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white transition-all cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Clear All Favorites Confirm */}
        <AnimatePresence>
          {showClearFavoritesConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={POS_MODAL_BACKDROP_TRANSITION}
              onClick={() => setShowClearFavoritesConfirm(false)}
              className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 6 }}
                transition={POS_MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/10 w-full max-w-xs rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">즐겨찾기 초기화</h4>
                  <p className="text-xs text-surface-dim mt-1">
                    즐겨찾기 {favoritesCount}개를 모두 해제하시겠습니까?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClearFavoritesConfirm(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteClearAllFavorites}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white transition-all cursor-pointer"
                  >
                    해제
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Apply Preset Confirm */}
        <AnimatePresence>
          {applyTargetPreset && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={POS_MODAL_BACKDROP_TRANSITION}
              onClick={() => setApplyTargetPreset(null)}
              className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 6 }}
                transition={POS_MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/10 w-full max-w-xs rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">프리셋 적용</h4>
                  <p className="text-xs text-surface-dim mt-1">
                    '{applyTargetPreset.name}' ({applyTargetPreset.items.length}개 상품) 구성을 현재 메뉴에 적용하시겠습니까?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setApplyTargetPreset(null)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPresetConfirm}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-secondary hover:bg-secondary/90 active:scale-[0.98] text-white transition-all cursor-pointer"
                  >
                    적용
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Edit Preset Info */}
        <AnimatePresence>
          {editingPreset && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={POS_MODAL_BACKDROP_TRANSITION}
              onClick={() => setEditingPreset(null)}
              className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 6 }}
                transition={POS_MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/10 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">프리셋 수정</h4>
                  <button
                    type="button"
                    onClick={() => setEditingPreset(null)}
                    className="p-1 rounded-lg text-surface-dim hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-surface-dim block mb-1">이름</label>
                    <input
                      type="text"
                      value={editPresetName}
                      onChange={e => setEditPresetName(e.target.value)}
                      className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-surface-dim block mb-1">메모 (선택)</label>
                    <input
                      type="text"
                      value={editPresetDesc}
                      onChange={e => setEditPresetDesc(e.target.value)}
                      className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPreset(null)}
                    className="py-2 px-3.5 rounded-lg text-xs font-semibold bg-white/5 text-surface-dim hover:text-white cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={!editPresetName.trim()}
                    onClick={handleSaveEditPreset}
                    className="py-2 px-4 rounded-lg text-xs font-bold bg-secondary active:scale-[0.98] text-white disabled:opacity-40 transition-all cursor-pointer"
                  >
                    저장
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Delete Preset Confirm */}
        <AnimatePresence>
          {deleteTargetPreset && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={POS_MODAL_BACKDROP_TRANSITION}
              onClick={() => setDeleteTargetPreset(null)}
              className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 6 }}
                transition={POS_MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/10 w-full max-w-xs rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">프리셋 삭제</h4>
                  <p className="text-xs text-surface-dim mt-1">
                    '{deleteTargetPreset.name}' 프리셋을 삭제하시겠습니까?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTargetPreset(null)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleDeletePresetConfirm}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white transition-all cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sheet / Excel Import Modal */}
        <AnimatePresence>
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
        </AnimatePresence>

        {/* Modal: Admin Required */}
        <AnimatePresence>
          {showAdminRequiredModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={POS_MODAL_BACKDROP_TRANSITION}
              onClick={() => setShowAdminRequiredModal({ isOpen: false, featureName: '' })}
              className="fixed inset-0 z-[240] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 6 }}
                transition={POS_MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/10 w-full max-w-xs rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">관리자 권한 필요</h4>
                  <p className="text-xs text-surface-dim mt-1">
                    '{showAdminRequiredModal.featureName}' 기능은 관리자 전용입니다.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminRequiredModal({ isOpen: false, featureName: '' })}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/5 text-surface-dim hover:text-white cursor-pointer"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleAdminLogin}
                    disabled={isGoogleLoading}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-secondary active:scale-[0.98] text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGoogleLoading ? '...' : '로그인'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Unsaved Changes Confirm on Close */}
        <AnimatePresence>
          {showUnsavedConfirmModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={POS_MODAL_BACKDROP_TRANSITION}
              onClick={() => setShowUnsavedConfirmModal(false)}
              className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 6 }}
                transition={POS_MODAL_PANEL_TRANSITION}
                onClick={e => e.stopPropagation()}
                className="bg-[#0a1120] border border-white/10 w-full max-w-xs rounded-2xl p-5 shadow-2xl space-y-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">변경사항 저장</h4>
                  <p className="text-xs text-surface-dim mt-1">
                    수정된 {modifiedItems.length}건을 저장하시겠습니까?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveChanges();
                      setShowUnsavedConfirmModal(false);
                      onClose();
                    }}
                    disabled={isSavingChanges}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-secondary active:scale-[0.98] text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    저장하고 닫기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDiscardChanges();
                      setShowUnsavedConfirmModal(false);
                      onClose();
                    }}
                    className="w-full py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-rose-500/15 text-surface-dim hover:text-rose-300 cursor-pointer"
                  >
                    저장 안 함
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUnsavedConfirmModal(false)}
                    className="w-full py-1.5 text-xs text-surface-dim hover:text-white cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
