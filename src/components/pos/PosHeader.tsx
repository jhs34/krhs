import { useState, useEffect, useRef } from 'react';
import { Home, Clock, Store, Boxes, RefreshCw, Power, ReceiptText, MoreVertical, ChevronDown, LogOut, Cloud, WifiOff, Volume2, VolumeX, ShieldCheck, Maximize, Minimize, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { PosUser } from '../../types/pos';
import { useFullscreen } from '../../utils/useFullscreen';

interface PosHeaderProps {
  user: PosUser;
  isCloudConnected?: boolean;
  isOnline?: boolean;
  isSoundMuted?: boolean;
  onToggleSound?: () => void;
  onLogout?: () => void;
  onExitToPortal: () => void;
  onOpenProductManager?: () => void;
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
  isCloudConnected = true,
  isOnline = true,
  isSoundMuted = false,
  onToggleSound,
  onLogout,
  onExitToPortal,
  onOpenProductManager,
  onOpenSalesHistory,
  onOpenAuditLog,
  onOpenSettlement,
  onEndShift,
}: PosHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown when clicking outside
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
    <header className="h-12 md:h-14 bg-[#080d1a] border-b border-white/10 px-2.5 sm:px-4 flex items-center justify-between shrink-0 select-none shadow-md relative z-50 flex-nowrap whitespace-nowrap">
      {/* Left: Store Title & Status Pill */}
      <div className="flex items-center space-x-2 shrink-0 min-w-0">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-tr from-secondary to-indigo-600 flex items-center justify-center shadow-md shadow-secondary/20 shrink-0">
          <Store className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
        </div>
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="font-bold text-xs sm:text-sm md:text-base text-white tracking-tight whitespace-nowrap">
            KRHS 매점
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden xs:inline sm:inline">영업 중</span>
          </span>
          {!isOnline && (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shrink-0">
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">오프라인</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Sound Toggle, Compact Clock, Staff Badge, Sales History, Management Dropdown, End Shift */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 flex-nowrap">
        {/* Sound Feedback Toggle */}
        {onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            title={isSoundMuted ? '효과음 켜기' : '효과음 끄기 (음소거)'}
            className={`w-8 h-8 flex items-center justify-center rounded-xl border text-xs transition-colors shrink-0 cursor-pointer ${
              isSoundMuted
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-secondary" />}
          </button>
        )}

        {/* Fullscreen Kiosk Mode Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? '전체화면 종료 (ESC)' : '전체화면 모드 (POS 키오스크)'}
          className={`w-8 h-8 flex items-center justify-center rounded-xl border text-xs transition-colors shrink-0 cursor-pointer ${
            isFullscreen
              ? 'bg-secondary/25 border-secondary/40 text-secondary hover:bg-secondary/35 shadow-sm shadow-secondary/20'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
          aria-label={isFullscreen ? '전체화면 종료' : '전체화면 모드'}
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5 text-secondary" />}
        </button>

        {/* Compact Clock (Time only - visible on large screens) */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs text-surface-dim bg-white/5 h-8 px-2.5 rounded-xl border border-white/5 font-mono whitespace-nowrap">
          <Clock className="w-3 h-3 text-secondary" />
          <span className="text-white/80">{format(currentTime, 'HH:mm:ss')}</span>
        </div>

        {/* Staff badge */}
        <div className="h-8 flex items-center space-x-1.5 bg-secondary/15 border border-secondary/30 px-2.5 rounded-xl text-xs whitespace-nowrap shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span className="text-white font-bold max-w-[70px] sm:max-w-none truncate">{user.name}</span>
          {user.role === 'admin' && (
            <span className="hidden sm:inline text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">
              관리자
            </span>
          )}
        </div>

        {/* Action 1: Sales History & Receipts (Direct quick button) */}
        {onOpenSalesHistory && (
          <button
            type="button"
            onClick={onOpenSalesHistory}
            title="매출 내역 조회 및 영수증 확인"
            className="h-8 w-8 sm:w-auto flex items-center justify-center space-x-1 sm:px-2.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 transition-colors border border-emerald-500/30 shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ReceiptText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">매출 내역</span>
          </button>
        )}

        {/* Action 2: Consolidated Management Menu (Dropdown) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="관리 도구 및 추가 메뉴"
            className={`h-8 w-8 sm:w-auto flex items-center justify-center space-x-1 sm:px-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm whitespace-nowrap shrink-0 cursor-pointer ${
              isMenuOpen
                ? 'bg-secondary text-white border-secondary shadow-secondary/30'
                : 'bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white border-white/10'
            }`}
          >
            <MoreVertical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">관리</span>
            <ChevronDown className={`hidden sm:inline w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Floating Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#0d162b] border border-white/20 rounded-2xl shadow-2xl p-1.5 z-[100] animate-in fade-in zoom-in-95 backdrop-blur-md">
              <div className="px-3 py-2 border-b border-white/10 text-[11px] font-bold text-surface-dim flex items-center justify-between">
                <span>포스 관리 도구</span>
                <span className="text-[10px] text-secondary">KRHS POS</span>
              </div>

              <div className="py-1 space-y-0.5">
                {/* Product / Stock Management */}
                {onOpenProductManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenProductManager();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-colors text-left"
                  >
                    <Boxes className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>상품 및 재고 관리</span>
                      <span className="text-[10px] text-surface-dim font-normal">품목 등록/수정/재고 실사</span>
                    </div>
                  </button>
                )}

                {/* Audit Log */}
                {onOpenAuditLog && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenAuditLog();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>POS 감사 로그</span>
                      <span className="text-[10px] text-surface-dim font-normal">결제/취소/재고/정산 변경 기록</span>
                    </div>
                  </button>
                )}

                {/* Shift Settlement & Cash Drawer */}
                {onOpenSettlement && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettlement();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Calculator className="w-4 h-4 text-violet-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>일일 시재금 및 마감 정산</span>
                      <span className="text-[10px] text-surface-dim font-normal">금고 시재 대조 및 마감 일지 조회</span>
                    </div>
                  </button>
                )}

                {/* Fullscreen Kiosk Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    toggleFullscreen();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4 text-secondary shrink-0" /> : <Maximize className="w-4 h-4 text-secondary shrink-0" />}
                  <div className="flex flex-col">
                    <span>{isFullscreen ? '전체화면 종료' : '전체화면 모드 (키오스크)'}</span>
                    <span className="text-[10px] text-surface-dim font-normal">{isFullscreen ? '일반 창 화면으로 복귀' : '브라우저 주소창 숨김'}</span>
                  </div>
                </button>

                <div className="h-[1px] bg-white/10 my-1" />

                {/* Exit to School Portal */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExitToPortal();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-surface-dim hover:text-white hover:bg-white/10 transition-colors text-left"
                >
                  <Home className="w-4 h-4 text-surface-dim shrink-0" />
                  <span>학교 포털 메인으로</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action 3: End Shift / Logout Button */}
        {onEndShift ? (
          <button
            type="button"
            onClick={onEndShift}
            title="영업 종료 후 메인화면으로 이동"
            className="h-8 w-8 sm:w-auto flex items-center justify-center space-x-1 sm:px-2.5 rounded-xl text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 transition-colors border border-red-500/30 shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Power className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">영업 종료</span>
          </button>
        ) : onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            title="POS 로그아웃"
            className="h-8 w-8 sm:w-auto flex items-center justify-center space-x-1 sm:px-2.5 rounded-xl text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 transition-colors border border-red-500/20 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
