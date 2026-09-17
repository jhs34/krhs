import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GripVertical, RotateCcw, Columns2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PosSplitDividerProps {
  splitRatio: number; // percentage for left panel (0 - 100, e.g. 62)
  onRatioChange: (ratio: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  minRatio?: number; // default 30
  maxRatio?: number; // default 80
  defaultRatio?: number; // default 62
}

export const PosSplitDivider: React.FC<PosSplitDividerProps> = ({
  splitRatio,
  onRatioChange,
  containerRef,
  minRatio = 30,
  maxRatio = 80,
  defaultRatio = 62,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  // Close quick menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node)) {
        setShowQuickMenu(false);
      }
    };
    if (showQuickMenu) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuickMenu]);

  // Handle pointer down (mouse or touch)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setShowQuickMenu(false);
  }, []);

  // Global pointer move and pointer up listeners
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const clientX = e.clientX;
      const relativeX = clientX - rect.left;
      const rawPercent = (relativeX / rect.width) * 100;
      const clampedPercent = Math.min(Math.max(rawPercent, minRatio), maxRatio);
      onRatioChange(Math.round(clampedPercent * 10) / 10);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, containerRef, minRatio, maxRatio, onRatioChange]);

  const leftPercent = Math.round(splitRatio);
  const rightPercent = 100 - leftPercent;

  const presets = [
    { label: '메뉴 확장 (75:25)', left: 75 },
    { label: '표준 분할 (65:35)', left: 65 },
    { label: '균등 분할 (50:50)', left: 50 },
    { label: '장바구니 확장 (40:60)', left: 40 },
  ];

  return (
    <div
      id="pos-split-divider"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsHovered(false);
      }}
      className={`relative hidden md:flex items-center justify-center shrink-0 z-20 cursor-col-resize group select-none transition-all duration-150 ${
        isDragging
          ? 'w-3 bg-blue-500/30'
          : isHovered
          ? 'w-2.5 bg-blue-500/20'
          : 'w-2 bg-white/5 hover:bg-blue-500/20'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Visual Divider line */}
      <div
        className={`w-[1px] h-full transition-colors ${
          isDragging ? 'bg-blue-400' : isHovered ? 'bg-blue-400/80' : 'bg-white/10'
        }`}
      />

      {/* Samsung Galaxy Multi-Window Style Center Pill Handle */}
      <div
        onPointerDown={handlePointerDown}
        onDoubleClick={e => {
          e.stopPropagation();
          onRatioChange(defaultRatio);
        }}
        onClick={e => {
          if (!isDragging) {
            e.stopPropagation();
            setShowQuickMenu(prev => !prev);
          }
        }}
        title="드래그하여 화면 분할 비율 조절 (클릭: 빠른 비율 선택 / 더블클릭: 기본값 복원)"
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all ${
          isDragging
            ? 'w-6 h-20 bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-110 rounded-full border border-blue-300'
            : isHovered
            ? 'w-5 h-16 bg-blue-700/90 text-blue-200 shadow-md scale-105 rounded-full border border-blue-400/50'
            : 'w-4 h-12 bg-[#1e293b] text-slate-400 hover:text-white rounded-full border border-white/20 shadow-sm'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-current opacity-80" />
          <div className="w-1 h-1 rounded-full bg-current opacity-80" />
          <div className="w-1 h-1 rounded-full bg-current opacity-80" />
        </div>
      </div>

      {/* Floating Ratio Badge during Drag or Hover */}
      <AnimatePresence>
        {(isDragging || (isHovered && !showQuickMenu)) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.12 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-30 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white text-xs font-bold border border-blue-500/40 shadow-xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap"
          >
            <div className="flex items-center gap-1 text-blue-400">
              <Columns2 className="w-3.5 h-3.5" />
              <span>메뉴 {leftPercent}%</span>
            </div>
            <span className="text-slate-500">:</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <span>장바구니 {rightPercent}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Galaxy Style Quick Ratio Popup Menu on Click */}
      <AnimatePresence>
        {showQuickMenu && (
          <motion.div
            ref={quickMenuRef}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-[#0f172a] border border-blue-500/40 p-3 rounded-2xl shadow-2xl backdrop-blur-xl w-60 text-white"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Columns2 className="w-3.5 h-3.5 text-blue-400" />
                분할 화면 비율 설정
              </span>
              <button
                type="button"
                onClick={() => {
                  onRatioChange(defaultRatio);
                  setShowQuickMenu(false);
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                title="기본 62:38 복원"
              >
                <RotateCcw className="w-3 h-3" />
                기본값
              </button>
            </div>

            <div className="space-y-1.5">
              {presets.map(p => {
                const isCurrent = Math.abs(leftPercent - p.left) <= 2;
                return (
                  <button
                    key={p.left}
                    type="button"
                    onClick={() => {
                      onRatioChange(p.left);
                      setShowQuickMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">{p.left}% : {100 - p.left}%</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-slate-400 text-center leading-relaxed">
              💡 분할 바를 손이나 마우스로 잡고 자유롭게 드래그할 수도 있습니다.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
