import { useState, useMemo, useRef, useEffect } from 'react';
import { Star, Search, AlertOctagon, ShoppingBag, Settings2, X, SlidersHorizontal, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PosCategory, PosItem, CartItem } from '../../types/pos';

export type MenuCardDensity = 'compact' | 'standard' | 'large';

const MENU_DENSITY_STORAGE_KEY = 'krhs_pos_menu_density_v2';

interface PosMenuGridProps {
  categories: PosCategory[];
  items: PosItem[];
  cart: CartItem[];
  onAddToCart: (item: PosItem) => void;
  onOpenProductManager?: () => void;
}

/**
 * Item Name Marquee Component
 * Automatically detects if text width exceeds container width.
 * If overflowing, smoothly scrolls back and forth with fade-in-out edge masking.
 */
function PosItemNameMarquee({
  name,
  className = '',
}: {
  name: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState<number>(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const diff = textRef.current.scrollWidth - containerRef.current.clientWidth;
        setOverflowDistance(diff > 2 ? diff : 0);
      }
    };

    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    return () => ro.disconnect();
  }, [name]);

  if (overflowDistance <= 0) {
    return (
      <div ref={containerRef} className="w-full overflow-hidden">
        <span ref={textRef} className={`text-white leading-snug line-clamp-2 break-keep ${className}`}>
          {name}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden relative py-0.5"
      style={{
        maskImage:
          'linear-gradient(to right, transparent 0px, black 6px, black calc(100% - 10px), transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0px, black 6px, black calc(100% - 10px), transparent 100%)',
      }}
    >
      <motion.span
        ref={textRef}
        className={`inline-block whitespace-nowrap text-white leading-snug ${className}`}
        animate={{
          x: [0, 0, -overflowDistance, -overflowDistance, 0],
        }}
        transition={{
          duration: Math.max(3.5, overflowDistance / 16 + 2.5),
          ease: 'easeInOut',
          repeat: Infinity,
          repeatDelay: 1,
          times: [0, 0.15, 0.5, 0.65, 1],
        }}
      >
        {name}
      </motion.span>
    </div>
  );
}

export function PosMenuGrid({ categories, items, cart, onAddToCart, onOpenProductManager }: PosMenuGridProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isDensityOpen, setIsDensityOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const densityRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Card density state (compact: ~120px, standard: ~155px, large: ~210px)
  const [density, setDensity] = useState<MenuCardDensity>(() => {
    try {
      const saved = localStorage.getItem(MENU_DENSITY_STORAGE_KEY);
      if (saved === 'compact' || saved === 'standard' || saved === 'large') {
        return saved;
      }
    } catch (e) {
      console.error('Failed to load menu density', e);
    }
    return 'standard';
  });

  // Persist density setting
  useEffect(() => {
    try {
      localStorage.setItem(MENU_DENSITY_STORAGE_KEY, density);
    } catch (e) {
      console.error('Failed to save menu density', e);
    }
  }, [density]);

  // Close density dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (densityRef.current && !densityRef.current.contains(e.target as Node)) {
        setIsDensityOpen(false);
      }
    };
    if (isDensityOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDensityOpen]);

  // Track container width in real-time as user drags split bar
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerWidth(Math.round(entry.contentRect.width));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute minimum card width and estimated column count
  const minCardWidth = useMemo(() => {
    switch (density) {
      case 'compact':
        return 120;
      case 'large':
        return 210;
      case 'standard':
      default:
        return 150;
    }
  }, [density]);

  // Estimated columns for current split width
  const estimatedColumns = useMemo(() => {
    if (!containerWidth) return 3;
    const paddingAndGaps = 28;
    const available = Math.max(containerWidth - paddingAndGaps, 100);
    const gap = 12;
    const cols = Math.floor((available + gap) / (minCardWidth + gap));
    return Math.max(1, cols);
  }, [containerWidth, minCardWidth]);

  // Map item counts currently in cart for visual badge feedback
  const cartCountMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach(ci => {
      map.set(ci.item.id, ci.count);
    });
    return map;
  }, [cart]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!item.isActive) return false;

      // Category filter
      if (selectedCategoryId === 'favorites') {
        if (!item.isFavorite) return false;
      } else if (selectedCategoryId !== 'all') {
        if (item.categoryId !== selectedCategoryId) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return item.name.toLowerCase().includes(query);
      }

      return true;
    });
  }, [items, selectedCategoryId, searchQuery]);

  // Group items by category when 'all' category is selected
  const categorySections = useMemo(() => {
    if (selectedCategoryId !== 'all') {
      return null;
    }

    const sections: { categoryId: string; categoryName: string; items: PosItem[] }[] = [];

    categories.forEach(cat => {
      const catItems = filteredItems.filter(item => item.categoryId === cat.id);
      if (catItems.length > 0) {
        sections.push({
          categoryId: cat.id,
          categoryName: cat.name,
          items: catItems,
        });
      }
    });

    const unassigned = filteredItems.filter(
      item => !categories.some(cat => cat.id === item.categoryId)
    );
    if (unassigned.length > 0) {
      sections.push({
        categoryId: 'uncategorized',
        categoryName: '기타/미분류',
        items: unassigned,
      });
    }

    return sections;
  }, [categories, filteredItems, selectedCategoryId]);

  // Render individual product card
  const renderItemCard = (item: PosItem) => {
    const inCartCount = cartCountMap.get(item.id) || 0;
    const isSoldOut = item.stock <= 0;
    const isLowStock = item.stock > 0 && item.stock <= 5;

    const cardPadding =
      density === 'compact'
        ? 'p-2 sm:p-2.5 min-h-[100px]'
        : density === 'large'
        ? 'p-3.5 sm:p-4 min-h-[140px]'
        : 'p-3 sm:p-3.5 min-h-[120px]';

    const titleSize =
      density === 'compact'
        ? 'text-xs sm:text-sm font-semibold'
        : density === 'large'
        ? 'text-base sm:text-lg font-black'
        : 'text-sm sm:text-base font-bold';

    const priceSize =
      density === 'compact'
        ? 'text-xs sm:text-sm font-bold'
        : density === 'large'
        ? 'text-base sm:text-xl font-black'
        : 'text-sm sm:text-lg font-black';

    return (
      <motion.button
        key={item.id}
        type="button"
        whileTap={!isSoldOut ? { scale: 0.96 } : {}}
        disabled={isSoldOut}
        onClick={() => onAddToCart(item)}
        className={`group relative text-left rounded-2xl border transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${cardPadding} ${
          isSoldOut
            ? 'bg-black/40 border-red-500/20 cursor-not-allowed opacity-75'
            : inCartCount > 0
            ? 'bg-secondary/15 border-secondary/50 shadow-md shadow-secondary/10 hover:border-secondary'
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 active:bg-secondary/20 shadow-sm'
        }`}
      >
        {/* Top Area: Left Item Name & Right Stock/Favorite */}
        <div className="flex items-start justify-between w-full gap-1 mb-1">
          {/* Left: Item Name with smooth edge-masked Marquee if overflowing */}
          <div className="flex-1 min-w-0 pr-1 overflow-hidden">
            <PosItemNameMarquee name={item.name} className={titleSize} />
          </div>

          {/* Right: Stock Badge & Favorite right below it */}
          <div className="flex flex-col items-end shrink-0 space-y-1">
            {isSoldOut ? (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-red-500 text-white shadow-sm whitespace-nowrap">
                품절
              </span>
            ) : isLowStock ? (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                {item.stock}개
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
                {item.stock}개
              </span>
            )}

            {item.isFavorite && (
              <span
                title="즐겨찾기 인기 상품"
                className="px-1 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-0.5 text-[9px] font-bold"
              >
                <Star className="w-2.5 h-2.5 fill-current text-amber-400" />
                <span className={density === 'compact' ? 'hidden' : 'inline'}>인기</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom: Price & in-cart indicator */}
        <div className="flex items-baseline justify-between w-full pt-1 mt-auto gap-1">
          <span className={`text-secondary-fixed tracking-tight ${priceSize}`}>
            {item.price.toLocaleString()}
            <span className="text-[10px] sm:text-xs font-normal ml-0.5 text-surface-dim">원</span>
          </span>

          {inCartCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-black bg-secondary text-white shadow-sm flex items-center space-x-0.5 animate-in zoom-in-50 whitespace-nowrap">
              <span>{inCartCount}개</span>
            </span>
          )}
        </div>

        {/* Sold-out Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center pointer-events-none">
            <AlertOctagon className="w-5 h-5 text-red-400 mb-1" />
            <span className="text-[10px] font-black text-red-400 tracking-wider uppercase">
              SOLD OUT
            </span>
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a1122] select-none">
      {/* Top Bar: Compact Single-Row Categories, Expandable Density & Search */}
      <div className="p-2 sm:p-2.5 border-b border-white/10 bg-[#090e1c] flex items-center justify-between gap-1.5 shrink-0 overflow-hidden">
        {/* Category tabs wrapper with soft fading edge gradients */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          {/* Left edge soft fade */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#090e1c] via-[#090e1c]/80 to-transparent z-10" />

          {/* Scrollable category tabs */}
          <div 
            className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto scrollbar-hide py-0.5 px-2 [mask-image:linear-gradient(to_right,transparent_0px,#000_12px,#000_calc(100%-12px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0px,#000_12px,#000_calc(100%-12px),transparent_100%)]"
          >
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-secondary text-white shadow-md shadow-secondary/20'
                  : 'bg-white/5 text-surface-dim hover:text-white hover:bg-white/10'
              }`}
            >
              전체 ({items.filter(i => i.isActive).length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategoryId('favorites')}
              className={`flex items-center space-x-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                selectedCategoryId === 'favorites'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-amber-300 hover:text-amber-200 hover:bg-white/10'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>인기 ({items.filter(i => i.isActive && i.isFavorite).length})</span>
            </button>

            {categories.map(cat => {
              const count = items.filter(i => i.isActive && i.categoryId === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-secondary text-white shadow-md shadow-secondary/20'
                      : 'bg-white/5 text-surface-dim hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Right edge soft fade */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#090e1c] via-[#090e1c]/80 to-transparent z-10" />
        </div>

        {/* Right Toolbar: Expandable Density Switcher & Expandable Search */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 justify-end">
          {/* Expandable Density Switcher (Collapsed to single icon by default) */}
          <div className="relative" ref={densityRef}>
            <AnimatePresence initial={false} mode="wait">
              {isDensityOpen ? (
                <motion.div
                  key="density-expanded"
                  initial={{ width: 34, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 34, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex items-center bg-[#131d33] border border-secondary/50 rounded-xl p-0.5 text-[11px] font-bold shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDensity('compact');
                      setIsDensityOpen(false);
                    }}
                    title={`작게 (${estimatedColumns}열)`}
                    className={`px-2 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                      density === 'compact'
                        ? 'bg-secondary text-white shadow-sm'
                        : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    <span>작게</span>
                    {density === 'compact' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDensity('standard');
                      setIsDensityOpen(false);
                    }}
                    title={`보통 (${estimatedColumns}열)`}
                    className={`px-2 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                      density === 'standard'
                        ? 'bg-secondary text-white shadow-sm'
                        : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    <span>보통</span>
                    {density === 'standard' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDensity('large');
                      setIsDensityOpen(false);
                    }}
                    title={`크게 (${estimatedColumns}열)`}
                    className={`px-2 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                      density === 'large'
                        ? 'bg-secondary text-white shadow-sm'
                        : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    <span>크게</span>
                    {density === 'large' && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDensityOpen(false)}
                    title="닫기"
                    className="p-1 text-surface-dim hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="density-collapsed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  type="button"
                  onClick={() => {
                    setIsDensityOpen(true);
                    setIsSearchOpen(false);
                  }}
                  title={`메뉴 카드 크기 조절 (현재: ${
                    density === 'compact' ? '작게' : density === 'large' ? '크게' : '보통'
                  }, 약 ${estimatedColumns}열)`}
                  className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white border border-white/10 transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-secondary" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Expandable Search Bar */}
          <AnimatePresence initial={false} mode="wait">
            {isSearchOpen || searchQuery ? (
              <motion.div
                key="search-input"
                initial={{ width: 34, opacity: 0 }}
                animate={{ width: 170, opacity: 1 }}
                exit={{ width: 34, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="relative flex items-center"
              >
                <Search className="w-3.5 h-3.5 text-surface-dim absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }
                  }}
                  placeholder="품목 검색..."
                  autoFocus
                  className="w-full bg-black/70 border border-secondary/50 rounded-xl pl-7 pr-6 py-1 text-xs text-white placeholder:text-surface-dim/50 focus:border-secondary outline-none shadow-md transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  title="검색 닫기"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-surface-dim hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="search-button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setIsDensityOpen(false);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                title="품목 빠른 검색"
                className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white border border-white/10 transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          {onOpenProductManager && (
            <button
              type="button"
              onClick={onOpenProductManager}
              title="상품 및 재고 관리 패널 열기"
              className="hidden xl:flex items-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white border border-white/10 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Settings2 className="w-3 h-3 text-secondary" />
              <span>품목 관리</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Fluid Menu Tiles Grid Container */}
      <div 
        ref={gridContainerRef}
        className="flex-1 overflow-y-auto p-2.5 sm:p-3 md:p-3.5 custom-scrollbar"
      >
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-surface-dim py-12">
            <ShoppingBag className="w-10 h-10 mb-2.5 text-white/20" />
            <p className="text-sm font-bold text-white/70">해당 조건의 품목이 없습니다.</p>
            <p className="text-xs text-surface-dim mt-1">다른 카테고리를 선택하거나 검색어를 변경해보세요.</p>
          </div>
        ) : categorySections && categorySections.length > 0 ? (
          /* Grouped by Category in 'All' view */
          <div className="space-y-4">
            {categorySections.map(section => (
              <div key={section.categoryId} className="space-y-2">
                {/* Category Group Header */}
                <div className="flex items-center space-x-2 px-1 pt-1">
                  <span className="w-2 h-2 rounded-full bg-secondary shadow-sm shadow-secondary/40" />
                  <h2 className="text-xs sm:text-sm font-black text-white tracking-tight">
                    {section.categoryName}
                  </h2>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-surface-dim border border-white/5">
                    {section.items.length}
                  </span>
                  <div className="flex-1 h-[1px] bg-white/10 ml-2" />
                </div>

                {/* Section Items Grid with CSS repeat(auto-fill, minmax) */}
                <div 
                  className="grid gap-2 sm:gap-2.5"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`
                  }}
                >
                  {section.items.map(item => renderItemCard(item))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single Category or Favorites View */
          <div 
            className="grid gap-2 sm:gap-2.5"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`
            }}
          >
            {filteredItems.map(item => renderItemCard(item))}
          </div>
        )}
      </div>
    </div>
  );
}
