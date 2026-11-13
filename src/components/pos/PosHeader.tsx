import { useState, useEffect, useRef } from 'react';
import { Home, Boxes, Power, ReceiptText, ChevronDown, LogOut, WifiOff, Volume2, VolumeX, ShieldCheck, Maximize, Minimize, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { PosUser } from '../../types/pos';
import { useFullscreen } from '../../utils/useFullscreen';
import { POS_DROPDOWN_TRANSITION, POS_BUMP_TRANSITION } from '../../utils/motion';

interface PosHeaderProps {
  user: PosUser;
  isCloudConnected?: boolean;
  isOnline?: boolean;
  isSoundMuted?: boolean;
  onToggleSound?: () => void;
  onLogout?: () => void;
  onExitToPortal: () => void;
  onOpenProductManager?: () => void;
  onOpenGifticonManager?: () => void;
  onOpenSalesHistory?: () => void;
  onOpenAuditLog?: () => void;
  onOpenSettlement?: () => void;
  onEndShift?: () => void;
  totalSalesToday?: number;
  cashSalesToday?: number;
  transferSalesToday?: number;
}

export function PosHeader({
  user,
  isOnline = true,
  isSoundMuted = false,
  onToggleSound,
  onLogout,
  onExitToPortal,
  onOpenProductManager,
  onOpenGifticonManager,
  onOpenSalesHistory,
  onOpenAuditLog,
  onOpenSettlement,
  onEndShift,
  totalSalesToday = 0,
}: PosHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 glass-panel-dark border-b border-white/5 px-3 sm:px-5 flex items-center justify-between shrink-0 select-none relative z-50 flex-nowrap whitespace-nowrap">
      {/* Zone 1: Brand Title matching Navigation.tsx */}
      <div className="flex items-center space-x-3 shrink-0 min-w-0">
        <div className="flex items-center space-x-2">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            className="w-[20px] sm:w-[22px] h-auto brightness-0 invert opacity-90 block shrink-0"
            alt="KRHS"
          />
          <span className="font-sans font-bold text-sm sm:text-base text-white tracking-tight whitespace-nowrap">
            KRHS 매점
          </span>
        </div>

        {/* Quiet unboxed metadata */}
        <div className="hidden sm:flex items-center space-x-2 text-xs text-surface-dim pl-2.5 border-l border-white/10">
          <span>담당: <strong className="text-white font-semibold">{user.name}</strong></span>
          <span aria-hidden="true" className="hidden lg:inline">·</span>
          <motion.span
            key={totalSalesToday}
            initial={{ scale: 1.05, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={POS_BUMP_TRANSITION}
            className="hidden lg:inline-block font-mono tabular-nums text-white/80"
          >
            당일 {totalSalesToday.toLocaleString()}원
          </motion.span>
          <span aria-hidden="true" className="hidden xl:inline">·</span>
          <span className="hidden xl:inline font-mono tabular-nums text-surface-dim">
            {format(currentTime, 'HH:mm:ss')}
          </span>
        </div>

        {!isOnline && (
          <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-300 pl-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">오프라인</span>
          </span>
        )}
      </div>

      {/* Zone 2 & 3: Clean Text Actions & Primary Shift End */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 flex-nowrap">
        {/* Direct Text Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center space-x-1 mr-1">
          {onOpenSalesHistory && (
            <button
              type="button"
              onClick={onOpenSalesHistory}
              className="h-8 px-2.5 inline-flex items-center justify-center rounded-lg text-xs font-medium text-surface-dim hover:text-white hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap"
            >
              매출 내역
            </button>
          )}
          {onOpenProductManager && (
            <button
              type="button"
              onClick={onOpenProductManager}
              className="h-8 px-2.5 inline-flex items-center justify-center rounded-lg text-xs font-medium text-surface-dim hover:text-white hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap"
            >
              상품 관리
            </button>
          )}
          {onOpenSettlement && (
            <button
              type="button"
              onClick={onOpenSettlement}
              className="h-8 px-2.5 inline-flex items-center justify-center rounded-lg text-xs font-medium text-surface-dim hover:text-white hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap"
            >
              마감 정산
            </button>
          )}
        </div>

        {/* Mobile Quick Sales History Icon */}
        {onOpenSalesHistory && (
          <button
            type="button"
            onClick={onOpenSalesHistory}
            title="매출 내역"
            className="md:hidden h-8 px-2.5 inline-flex items-center justify-center space-x-1 rounded-lg text-xs font-medium text-surface-dim hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ReceiptText className="w-3.5 h-3.5 shrink-0" />
            <span>매출</span>
          </button>
        )}

        {/* Sound Feedback Toggle */}
        {onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            title={isSoundMuted ? '효과음 켜기' : '효과음 끄기 (음소거)'}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
              isSoundMuted
                ? 'text-red-400 hover:bg-white/5'
                : 'text-surface-dim hover:text-white hover:bg-white/5'
            }`}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}

        {/* Fullscreen Kiosk Mode Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? '전체화면 종료 (ESC)' : '전체화면 모드'}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
            isFullscreen
              ? 'text-secondary-container bg-secondary/15'
              : 'text-surface-dim hover:text-white hover:bg-white/5'
          }`}
          aria-label={isFullscreen ? '전체화면 종료' : '전체화면 모드'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Consolidated Management Menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="관리 메뉴"
            className={`h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isMenuOpen
                ? 'bg-white/15 text-white'
                : 'text-surface-dim hover:text-white hover:bg-white/5'
            }`}
          >
            <span>더보기</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={POS_DROPDOWN_TRANSITION}
                className="absolute right-0 top-full mt-2 w-52 bg-[#0f182b] border border-white/[0.12] rounded-xl shadow-2xl p-1.5 z-[100] origin-top-right"
              >
                <div className="px-3 py-2 border-b border-white/[0.06] text-[11px] font-sans text-surface-dim flex items-center justify-between">
                  <span>담당: {user.name}</span>
                </div>

                <div className="py-1 space-y-0.5">
                  {onOpenProductManager && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenProductManager();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                    >
                      <Boxes className="w-4 h-4 text-surface-dim shrink-0" />
                      <span>상품 및 재고 관리</span>
                    </button>
                  )}

                  {onOpenSettlement && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenSettlement();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                    >
                      <Calculator className="w-4 h-4 text-surface-dim shrink-0" />
                      <span>마감 정산 및 시재</span>
                    </button>
                  )}

                  {onOpenAuditLog && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAuditLog();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-surface-dim shrink-0" />
                      <span>감사 로그</span>
                    </button>
                  )}

                  <div className="h-[1px] bg-white/5 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onExitToPortal();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-surface-dim hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-surface-dim shrink-0" />
                    <span>학교 포털 메인으로</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Primary Action: End Shift / Return to Hub */}
        {onEndShift ? (
          <button
            type="button"
            onClick={onEndShift}
            title="POS 허브 화면으로 이동"
            className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Power className="w-3.5 h-3.5 text-surface-dim shrink-0" />
            <span className="hidden sm:inline">영업 종료</span>
          </button>
        ) : onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            title="POS 로그아웃"
            className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
