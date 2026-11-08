import { useState, useMemo, useRef, useEffect } from 'react';
import { Star, Search, ShoppingBag, Settings2, X, SlidersHorizontal, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PosCategory, PosItem, CartItem } from '../../types/pos';

export type MenuCardDensity = 'compact' | 'standard' | 'large';

const MENU_DENSITY_STORAGE_KEY = 'krhs_pos_menu_density_v2';

interface PosMenuGridProps {
  categories: PosCategory[];
  items: PosItem[];
  cart: CartItem[];
  todaySoldMap?: Record<string, number>;
  onAddToCart: (item: PosItem) => void;
  onToggleSoldOut?: (item: PosItem) => void;
  onOpenProductManager?: () => void;
}

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

const LONG_PRESS_DURATION_MS = 550;
const LONG_PRESS_VISUAL_DELAY_MS = 120;
const POINTER_MOVE_THRESHOLD_PX = 8;

export function PosMenuGrid({
  categories,
  items,
  cart,
  todaySoldMap,
  onAddToCart,
  onToggleSoldOut,
  onOpenProductManager,
}: PosMenuGridProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isDensityOpen, setIsDensityOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const densityRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Long-press state for toggling sold-out without interfering with scroll/swipe
  const [holdingItemId, setHoldingItemId] = useState<string | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdVisualTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; itemId: string } | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);

  const cancelLongPress = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdVisualTimerRef.current !== null) {
      window.clearTimeout(holdVisualTimerRef.current);
      holdVisualTimerRef.current = null;
    }
    pointerStartRef.current = null;
    setHoldingItemId(null);
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
      if (holdVisualTimerRef.current !== null) window.clearTimeout(holdVisualTimerRef.current);
    };
  }, []);

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

  useEffect(() => {
    try {
      localStorage.setItem(MENU_DENSITY_STORAGE_KEY, density);
    } catch (e) {
      console.error('Failed to save menu density', e);
    }
  }, [density]);

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

  const minCardWidth = useMemo(() => {
    const isNarrow = containerWidth > 0 && containerWidth < 480;
    switch (density) {
      case 'compact':
        return isNarrow ? 92 : 105;
      case 'large':
        return isNarrow ? 260 : 210;
      case 'standard':
      default:
        return isNarrow ? 155 : 150;
    }
  }, [density, containerWidth]);

  const estimatedColumns = useMemo(() => {
    if (!containerWidth) return 2;
    if (containerWidth < 480) {
      return density === 'compact' ? 3 : density === 'large' ? 1 : 2;
    }
    const paddingAndGaps = density === 'compact' ? 20 : 28;
    const available = Math.max(containerWidth - paddingAndGaps, 100);
    const gap = density === 'compact' ? 8 : 12;
    const cols = Math.floor((available + gap) / (minCardWidth + gap));
    return Math.max(1, cols);
  }, [containerWidth, minCardWidth, density]);

  const cartCountMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach(ci => {
      map.set(ci.item.id, ci.count);
    });
    return map;
  }, [cart]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!item.isActive) return false;

      if (selectedCategoryId === 'favorites') {
        if (!item.isFavorite) return false;
      } else if (selectedCategoryId !== 'all') {
        const cleanSelected = selectedCategoryId.trim().toLowerCase();
        const itemCat = (item.categoryId || '').trim().toLowerCase();
        if (itemCat !== cleanSelected) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return item.name.toLowerCase().includes(query);
      }

      return true;
    });
  }, [items, selectedCategoryId, searchQuery]);

  const categorySections = useMemo(() => {
    if (selectedCategoryId !== 'all') {
      return null;
    }

    const sections: { categoryId: string; categoryName: string; items: PosItem[] }[] = [];

    categories.forEach(cat => {
      const catCleanName = cat.name.trim().toLowerCase();
      const catItems = filteredItems.filter(item => {
        const itemCat = (item.categoryId || '').trim().toLowerCase();
        return itemCat === catCleanName;
      });

      if (catItems.length > 0) {
        sections.push({
          categoryId: cat.name,
          categoryName: cat.name,
          items: catItems,
        });
      }
    });

    const unassigned = filteredItems.filter(item => {
      const itemCat = (item.categoryId || '').trim().toLowerCase();
      return !categories.some(cat => cat.name.trim().toLowerCase() === itemCat);
    });

    if (unassigned.length > 0) {
      sections.push({
        categoryId: 'uncategorized',
        categoryName: '기타/미분류',
        items: unassigned,
      });
    }

    return sections;
  }, [categories, filteredItems, selectedCategoryId]);

  const handleCardPointerDown = (e: React.PointerEvent<HTMLButtonElement>, item: PosItem) => {
    if (!onToggleSoldOut) return;
    // Only primary mouse button or touch/pen
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    cancelLongPress();
    longPressTriggeredRef.current = false;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      itemId: item.id,
    };

    holdVisualTimerRef.current = window.setTimeout(() => {
      if (pointerStartRef.current?.itemId === item.id) {
        setHoldingItemId(item.id);
      }
    }, LONG_PRESS_VISUAL_DELAY_MS);

    holdTimerRef.current = window.setTimeout(() => {
      if (pointerStartRef.current?.itemId === item.id) {
        longPressTriggeredRef.current = true;
        setHoldingItemId(null);
        pointerStartRef.current = null;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(35);
          } catch {}
        }
        onToggleSoldOut(item);
      }
    }, LONG_PRESS_DURATION_MS);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.hypot(dx, dy) > POINTER_MOVE_THRESHOLD_PX) {
      cancelLongPress();
    }
  };

  const handleCardClick = (item: PosItem) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onAddToCart(item);
  };

  const renderItemCard = (item: PosItem) => {
    const inCartCount = cartCountMap.get(item.id) || 0;
    const isSoldOut = Boolean(item.isSoldOut);
    const isHolding = holdingItemId === item.id;
    const todaySold = todaySoldMap?.[item.id] || 0;

    const cardPadding =
      density === 'compact'
        ? 'p-2.5 sm:p-3 min-h-[76px] sm:min-h-[84px]'
        : density === 'large'
        ? 'p-4 sm:p-5 min-h-[135px] sm:min-h-[150px]'
        : 'p-3 sm:p-4 min-h-[102px] sm:min-h-[112px]';

    const titleSize =
      density === 'compact'
        ? 'text-sm sm:text-base font-bold leading-tight tracking-tight'
        : density === 'large'
        ? 'text-xl sm:text-2xl font-bold leading-snug tracking-tight'
        : 'text-base sm:text-lg md:text-[19px] font-bold leading-snug tracking-tight';

    const priceSize =
      density === 'compact'
        ? 'text-xs sm:text-sm font-bold'
        : density === 'large'
        ? 'text-base sm:text-xl font-bold'
        : 'text-sm sm:text-base font-bold';

    return (
      <motion.button
        key={item.id}
        type="button"
        aria-disabled={isSoldOut}
        whileTap={!isSoldOut ? { scale: 0.98 } : { scale: 0.99 }}
        onPointerDown={e => handleCardPointerDown(e, item)}
        onPointerMove={handleCardPointerMove}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={e => {
          if (onToggleSoldOut) e.preventDefault();
        }}
        onClick={() => handleCardClick(item)}
        title={isSoldOut ? '길게 눌러 품절 해제' : '터치하여 담기 · 길게 눌러 품절 전환'}
        className={`group relative text-left rounded-2xl border transition-colors flex flex-col justify-between overflow-hidden cursor-pointer select-none ${cardPadding} ${
          isHolding
            ? isSoldOut
              ? 'bg-emerald-500/15 border-emerald-400/60'
              : 'bg-rose-500/15 border-rose-400/60'
            : isSoldOut
            ? 'bg-[#0a1120]/40 border-rose-500/20 opacity-60 hover:opacity-80'
            : inCartCount > 0
            ? 'bg-secondary/15 border-secondary-container/50 hover:border-secondary-container'
            : 'bg-[#0a1120] hover:bg-white/[0.06] border-white/5 hover:border-white/15'
        }`}
      >
        {/* Top Area: Item Name & Quiet Unboxed Meta */}
        <div className="flex items-start justify-between w-full gap-1.5 mb-2">
          <div className="flex-1 min-w-0 pr-1 overflow-hidden">
            <PosItemNameMarquee
              name={item.name}
              className={`${titleSize} ${isSoldOut ? 'line-through text-surface-dim' : ''}`}
            />
          </div>

          {/* Unboxed quiet metadata: Today's sold count */}
          <div className="flex items-center space-x-1 shrink-0 text-[10px] text-surface-dim">
            {item.isFavorite && (
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
            )}
            {isSoldOut ? (
              <span className="text-rose-400 font-bold leading-none">품절</span>
            ) : todaySold > 0 && density !== 'compact' ? (
              <span className="font-mono tabular-nums text-surface-dim/70 leading-none" title={`당일 판매 ${todaySold}개`}>
                오늘 {todaySold}
              </span>
            ) : null}
          </div>
        </div>

        {/* Bottom: Price & In-Cart Count */}
        <div className="flex items-center justify-between w-full pt-1.5 mt-auto border-t border-white/[0.04] gap-1">
          <div className="flex items-baseline">
            <span
              className={`transition-colors font-mono tabular-nums ${priceSize} ${
                isSoldOut
                  ? 'text-surface-dim'
                  : 'text-white group-hover:text-secondary-container'
              }`}
            >
              {item.price.toLocaleString()}
            </span>
            <span className="text-[11px] font-normal ml-0.5 text-surface-dim">원</span>
          </div>

          {isHolding ? (
            <span
              className={`text-[11px] font-bold whitespace-nowrap ${
                isSoldOut ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {isSoldOut ? '판매중 전환...' : '품절 전환...'}
            </span>
          ) : inCartCount > 0 ? (
            <span className="text-xs font-bold font-mono tabular-nums text-secondary-container whitespace-nowrap">
              {inCartCount}개 선택
            </span>
          ) : null}
        </div>

        {/* Visual Hold Progress Bar */}
        {isHolding && (
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              duration: (LONG_PRESS_DURATION_MS - LONG_PRESS_VISUAL_DELAY_MS) / 1000,
              ease: 'linear',
            }}
            className={`absolute bottom-0 left-0 h-1 ${
              isSoldOut ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
        )}
      </motion.button>
    );
  };

  const gridLayoutClass = useMemo(() => {
    if (density === 'compact') {
      return 'grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(105px,1fr))] gap-2 sm:gap-2.5';
    }
    if (density === 'large') {
      return 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 sm:gap-4';
    }
    return 'grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5 sm:gap-3';
  }, [density]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-primary select-none">
      {/* Top Category & Filter Strip: Clean Underline Tabs (No heavy pill boxes) */}
      <div className="px-3 sm:px-5 border-b border-white/10 bg-[#0a1120]/60 flex items-center justify-between gap-2 shrink-0 h-12">
        {/* Scrollable Category Tabs */}
        <div className="flex items-center space-x-4 sm:space-x-6 overflow-x-auto scrollbar-hide h-full flex-1 min-w-0 pr-2">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`h-full flex items-center text-xs sm:text-sm whitespace-nowrap border-t-2 border-t-transparent border-b-2 transition-colors shrink-0 cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'border-b-secondary-container text-white font-bold'
                : 'border-b-transparent text-surface-dim hover:text-white font-medium'
            }`}
          >
            <span>전체</span>
            <span className="ml-1 text-[11px] font-mono tabular-nums text-surface-dim/70">
              {items.filter(i => i.isActive).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategoryId('favorites')}
            className={`h-full flex items-center space-x-1 text-xs sm:text-sm whitespace-nowrap border-t-2 border-t-transparent border-b-2 transition-colors shrink-0 cursor-pointer ${
              selectedCategoryId === 'favorites'
                ? 'border-b-amber-400 text-white font-bold'
                : 'border-b-transparent text-surface-dim hover:text-white font-medium'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            <span>인기</span>
            <span className="text-[11px] font-mono tabular-nums text-surface-dim/70">
              {items.filter(i => i.isActive && i.isFavorite).length}
            </span>
          </button>

          {categories.map(cat => {
            const count = items.filter(
              i => i.isActive && i.categoryId.trim().toLowerCase() === cat.name.trim().toLowerCase()
            ).length;
            const isSelected = selectedCategoryId.trim().toLowerCase() === cat.name.trim().toLowerCase();
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategoryId(cat.name)}
                className={`h-full flex items-center text-xs sm:text-sm whitespace-nowrap border-t-2 border-t-transparent border-b-2 transition-colors shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-b-secondary-container text-white font-bold'
                    : 'border-b-transparent text-surface-dim hover:text-white font-medium'
                }`}
              >
                <span>{cat.name}</span>
                <span className="ml-1 text-[11px] font-mono tabular-nums text-surface-dim/70">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Toolbar: Density & Search */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <div className="relative shrink-0" ref={densityRef}>
            <AnimatePresence initial={false} mode="wait">
              {isDensityOpen ? (
                <motion.div
                  key="density-expanded"
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center bg-[#0a1120] border border-white/15 rounded-lg p-0.5 text-[11px] font-medium whitespace-nowrap overflow-hidden shrink-0"
                >
                  {(['compact', 'standard', 'large'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDensity(d);
                        setIsDensityOpen(false);
                      }}
                      className={`px-2 py-1 rounded-md transition-colors flex items-center space-x-1 whitespace-nowrap shrink-0 cursor-pointer ${
                        density === d
                          ? 'bg-secondary text-white font-bold'
                          : 'text-surface-dim hover:text-white'
                      }`}
                    >
                      <span>{d === 'compact' ? '작게' : d === 'large' ? '크게' : '보통'}</span>
                      {density === d && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsDensityOpen(false)}
                    className="p-1 text-surface-dim hover:text-white rounded-md ml-0.5 shrink-0 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsDensityOpen(true);
                    setIsSearchOpen(false);
                  }}
                  title={`카드 크기 조절 (약 ${estimatedColumns}열)`}
                  className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}
            </AnimatePresence>
          </div>

          {/* Search Input */}
          <AnimatePresence initial={false} mode="wait">
            {isSearchOpen || searchQuery ? (
              <motion.div
                key="search-input"
                initial={{ width: 34, opacity: 0 }}
                animate={{ width: 175, opacity: 1 }}
                exit={{ width: 34, opacity: 0 }}
                transition={{ duration: 0.16 }}
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
                  className="w-full bg-[#0a1120] border border-white/15 focus:border-secondary-container/50 rounded-lg pl-7 pr-6 py-1 text-xs text-white placeholder:text-surface-dim/50 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-surface-dim hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setIsDensityOpen(false);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                title="품목 검색"
                className="p-1.5 rounded-lg text-surface-dim hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </AnimatePresence>

          {onOpenProductManager && (
            <button
              type="button"
              onClick={onOpenProductManager}
              title="상품 관리"
              className="hidden xl:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-surface-dim hover:text-white hover:bg-white/5 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>품목 설정</span>
            </button>
          )}
        </div>
      </div>

      {/* Menu Grid Body */}
      <div
        ref={gridContainerRef}
        onScroll={cancelLongPress}
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          density === 'compact' ? 'p-3 sm:p-4 pb-36 sm:pb-28' : 'p-4 sm:p-6 pb-36 sm:pb-28'
        }`}
      >
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-surface-dim py-12">
            <ShoppingBag className="w-9 h-9 mb-2.5 text-white/15" strokeWidth={1.5} />
            <p className="text-sm font-bold text-white/70">해당 조건의 품목이 없습니다.</p>
            <p className="text-xs text-surface-dim mt-1">다른 카테고리를 선택하거나 검색어를 변경해보세요.</p>
          </div>
        ) : categorySections && categorySections.length > 0 ? (
          <div className="space-y-8">
            {categorySections.map(section => (
              <div key={section.categoryId} className="space-y-3">
                {/* Clean Editorial Section Header (No vertical pill bar or rounded-full chip) */}
                <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                  <div className="flex items-baseline space-x-2">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {section.categoryName}
                    </h2>
                    <span className="text-xs font-mono tabular-nums text-surface-dim">
                      {section.items.length}종
                    </span>
                  </div>
                </div>

                <div className={gridLayoutClass}>
                  {section.items.map(item => renderItemCard(item))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={gridLayoutClass}>
            {filteredItems.map(item => renderItemCard(item))}
          </div>
        )}
      </div>
    </div>
  );
}
