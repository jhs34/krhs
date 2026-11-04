import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Columns2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PosSplitDividerProps {
  splitRatio: number;
  onRatioChange: (ratio: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  minRatio?: number;
  maxRatio?: number;
  defaultRatio?: number;
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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setShowQuickMenu(false);
  }, []);

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
    { label: '표준 분할 (62:38)', left: 62 },
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
      className={`relative hidden md:flex items-center justify-center shrink-0 z-20 cursor-col-resize group select-none transition-colors duration-150 w-1.5 ${
        isDragging || isHovered ? 'bg-secondary/30' : 'bg-transparent'
      }`}
      style={{ touchAction: 'none' }}
    >
      <div
        className={`w-[1px] h-full transition-colors ${
          isDragging ? 'bg-secondary-container' : isHovered ? 'bg-white/30' : 'bg-white/5'
        }`}
      />

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
        title="드래그하여 화면 비율 조절 (클릭: 비율 프리셋)"
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all rounded-md ${
          isDragging
            ? 'w-3.5 h-16 bg-secondary text-white'
            : isHovered
            ? 'w-3 h-14 bg-[#0a1120] text-white border border-white/25'
            : 'w-2 h-10 bg-white/10 text-transparent border border-white/10'
        }`}
      />

      <AnimatePresence>
        {(isDragging || (isHovered && !showQuickMenu)) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-30 px-2.5 py-1 rounded-lg bg-[#0a1120] text-white text-[11px] font-mono tabular-nums border border-white/15 shadow-xl whitespace-nowrap"
          >
            {leftPercent}% : {rightPercent}%
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickMenu && (
          <motion.div
            ref={quickMenuRef}
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-[#0a1120] border border-white/15 p-3 rounded-2xl shadow-2xl w-56 text-white"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Columns2 className="w-3.5 h-3.5 text-secondary-container" />
                화면 분할 비율
              </span>
              <button
                type="button"
                onClick={() => {
                  onRatioChange(defaultRatio);
                  setShowQuickMenu(false);
                }}
                className="text-[11px] text-surface-dim hover:text-white flex items-center gap-0.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                초기화
              </button>
            </div>

            <div className="space-y-1">
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
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-secondary text-white font-bold'
                        : 'text-surface-dim hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[10px] font-mono tabular-nums opacity-75">{p.left}:{100 - p.left}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
