import { useState, useEffect } from 'react';
import {
  Store,
  Boxes,
  LogOut,
  Home,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ReceiptText,
  BadgeAlert,
  Calculator,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { PosUser, PosItem, PosCategory } from '../../types/pos';

interface PosHubHomeProps {
  user: PosUser;
  items: PosItem[];
  categories: PosCategory[];
  totalSalesToday: number;
  cashSalesToday: number;
  transferSalesToday: number;
  todayOrdersCount: number;
  hasActiveCart: boolean;
  onStartSales: () => void;
  onOpenProductManager: () => void;
  onOpenSalesHistory: () => void;
  onOpenSettlement: () => void;
  onOpenAuditLog?: () => void;
  onLogout: () => void;
  onExitToPortal: () => void;
}

export function PosHubHome({
  user,
  items,
  categories,
  totalSalesToday,
  cashSalesToday,
  transferSalesToday,
  todayOrdersCount,
  hasActiveCart,
  onStartSales,
  onOpenProductManager,
  onOpenSalesHistory,
  onOpenSettlement,
  onOpenAuditLog,
  onLogout,
  onExitToPortal,
}: PosHubHomeProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const outOfStockCount = items.filter(it => it.stock <= 0).length;
  const lowStockCount = items.filter(it => it.stock > 0 && it.stock <= 5).length;
  const totalStockCount = items.reduce((sum, it) => sum + it.stock, 0);

  return (
    <div className="flex-1 flex flex-col bg-[#070d1e] text-white overflow-y-auto select-none">
      {/* Top Header Bar */}
      <header className="h-14 sm:h-16 px-3 sm:px-5 md:px-6 bg-[#0c162e] border-b border-white/10 flex items-center justify-between shrink-0 select-none flex-nowrap whitespace-nowrap overflow-hidden relative z-20">
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-secondary/20 border border-secondary/40 text-secondary flex items-center justify-center font-black text-sm sm:text-lg shrink-0 shadow-md shadow-secondary/15">
            <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                한국철도고 매점
              </h1>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30 whitespace-nowrap shrink-0">
                POS HUB
              </span>
            </div>
            <p className="hidden md:block text-[10px] lg:text-[11px] text-surface-dim font-space">
              KOREA RAILROAD HIGH SCHOOL POS DASHBOARD
            </p>
          </div>
        </div>

        {/* Right Info: Clock, User Badge, Logout & Portal */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 shrink-0 flex-nowrap">
          {/* Clock: Time only on lg, full format on xl */}
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-surface-dim bg-white/5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/5 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-secondary shrink-0" />
            <span className="font-medium text-white/90">
              {format(currentTime, 'HH:mm:ss')}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 bg-secondary/15 border border-secondary/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs whitespace-nowrap shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-white font-bold max-w-[65px] xs:max-w-[90px] sm:max-w-none truncate">{user.name}</span>
            {user.role === 'admin' && (
              <span className="hidden sm:inline text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">
                관리자
              </span>
            )}
          </div>

          {/* Audit Log Button */}
          {onOpenAuditLog && (
            <button
              type="button"
              onClick={onOpenAuditLog}
              title="POS 감사 및 활동 로그 확인"
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/40 transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="hidden sm:inline">감사 로그</span>
            </button>
          )}

          {/* Safe Logout Button at Main Hub */}
          <button
            type="button"
            onClick={onLogout}
            title="POS 시스템 로그아웃"
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 border border-red-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">로그아웃</span>
          </button>

          {/* Exit to School Portal */}
          <button
            type="button"
            onClick={onExitToPortal}
            title="학교 포털 홈으로 이동"
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">포털</span>
          </button>
        </div>
      </header>

      {/* Main Hub Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-6 md:p-8 flex flex-col space-y-4 sm:space-y-6 md:space-y-8">
        {/* Welcome Text */}
        <div className="space-y-1 sm:space-y-1.5 pt-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
            안녕하세요, {user.name} 담당자님!
          </h2>
          <p className="text-xs sm:text-sm text-surface-dim max-w-2xl leading-relaxed">
            매점 영업을 시작하려면 아래 <span className="text-white font-bold">[포스기 화면]</span>을 누르고, 상품 등록 및 재고 수량을 변경하려면 <span className="text-white font-bold">[상품 및 재고 관리]</span>를 선택하세요.
          </p>
        </div>

        {/* Primary Action Buttons (2x2 Grid on all screens) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-5">
          {/* Action 1: POS Sales Register (영업 시작) */}
          <button
            type="button"
            onClick={onStartSales}
            className="group relative text-left bg-gradient-to-br from-[#182852] to-[#0f1b3b] hover:from-[#1e3266] hover:to-[#14234c] border-2 border-secondary/40 hover:border-secondary rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xl transition-all active:scale-[0.98] flex flex-col justify-between min-h-[105px] sm:min-h-[140px] overflow-hidden cursor-pointer"
          >
            {/* Background Glow */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-secondary/20 rounded-full blur-2xl pointer-events-none group-hover:bg-secondary/30 transition-all" />

            <div className="flex items-start justify-between relative z-10 w-full">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-secondary text-white flex items-center justify-center shadow-lg shadow-secondary/30 group-hover:scale-105 transition-transform shrink-0">
                <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-secondary/20 text-secondary border border-secondary/30 truncate">
                {hasActiveCart ? '판매 중' : '영업 개시'}
              </span>
            </div>

            <div className="relative z-10 mt-2 sm:mt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight">
                  포스기 화면
                </h3>
                <ArrowRight className="w-4 h-4 text-secondary group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
              </div>
            </div>
          </button>

          {/* Action 2: Product & Inventory Manager (상품 재고 관리) */}
          <button
            type="button"
            onClick={onOpenProductManager}
            className="group relative text-left bg-gradient-to-br from-[#162438] to-[#0c1626] hover:from-[#1c2e47] hover:to-[#111e33] border-2 border-amber-500/30 hover:border-amber-400 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xl transition-all active:scale-[0.98] flex flex-col justify-between min-h-[105px] sm:min-h-[140px] overflow-hidden cursor-pointer"
          >
            {/* Background Glow */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

            <div className="flex items-start justify-between relative z-10 w-full">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                <Boxes className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate">
                {items.length}종
              </span>
            </div>

            <div className="relative z-10 mt-2 sm:mt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight">
                  상품 관리
                </h3>
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
              </div>
            </div>
          </button>

          {/* Action 3: Sales History & Receipts (매출 내역 및 영수증) */}
          <button
            type="button"
            onClick={onOpenSalesHistory}
            className="group relative text-left bg-gradient-to-br from-[#0e2a24] to-[#081714] hover:from-[#12362e] hover:to-[#0c1f1b] border-2 border-emerald-500/30 hover:border-emerald-400 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xl transition-all active:scale-[0.98] flex flex-col justify-between min-h-[105px] sm:min-h-[140px] overflow-hidden cursor-pointer"
          >
            {/* Background Glow */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

            <div className="flex items-start justify-between relative z-10 w-full">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                <ReceiptText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 truncate">
                오늘 {todayOrdersCount}건
              </span>
            </div>

            <div className="relative z-10 mt-2 sm:mt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight">
                  매출 내역
                </h3>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
              </div>
            </div>
          </button>

          {/* Action 4: Shift Settlement & Cash Drawer (일일 시재금 및 마감 정산) */}
          <button
            type="button"
            onClick={onOpenSettlement}
            className="group relative text-left bg-gradient-to-br from-[#241738] to-[#140b24] hover:from-[#2e1d47] hover:to-[#1a0e2e] border-2 border-violet-500/30 hover:border-violet-400 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xl transition-all active:scale-[0.98] flex flex-col justify-between min-h-[105px] sm:min-h-[140px] overflow-hidden cursor-pointer"
          >
            {/* Background Glow */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-violet-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/20 transition-all" />

            <div className="flex items-start justify-between relative z-10 w-full">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-violet-500/20 border border-violet-500/40 text-violet-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30 truncate">
                마감 관리
              </span>
            </div>

            <div className="relative z-10 mt-2 sm:mt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight">
                  마감 정산
                </h3>
                <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
              </div>
            </div>
          </button>
        </div>

        {/* Quick KPI & Status Overview Bar (Compact single line on mobile, grid on desktop) */}
        <div className="bg-[#0e172e] border border-white/10 rounded-2xl p-2.5 sm:p-4 shadow-sm">
          {/* Mobile Single Row Strip (Horizontal scroll without overflowing) */}
          <div className="grid grid-cols-2 min-[480px]:grid-cols-4 gap-2 sm:gap-4 divide-y sm:divide-y-0 divide-white/5">
            <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start p-1.5 sm:p-0">
              <div className="flex items-center gap-1 text-surface-dim text-[11px] sm:text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-secondary shrink-0" />
                <span>당일 매출</span>
              </div>
              <div className="text-sm sm:text-lg font-black text-white font-mono mt-0 sm:mt-1">
                {totalSalesToday.toLocaleString()}
                <span className="text-[10px] sm:text-xs font-normal text-surface-dim ml-0.5">원</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start p-1.5 sm:p-0">
              <div className="flex items-center gap-1 text-surface-dim text-[11px] sm:text-xs">
                <Boxes className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>총 재고</span>
              </div>
              <div className="text-sm sm:text-lg font-black text-white font-mono mt-0 sm:mt-1">
                {totalStockCount}
                <span className="text-[10px] sm:text-xs font-normal text-surface-dim ml-0.5">개</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start p-1.5 sm:p-0 pt-2 sm:pt-0">
              <div className="flex items-center gap-1 text-surface-dim text-[11px] sm:text-xs">
                <BadgeAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>품절 품목</span>
              </div>
              <div className={`text-sm sm:text-lg font-black font-mono mt-0 sm:mt-1 ${outOfStockCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {outOfStockCount}
                <span className="text-[10px] sm:text-xs font-normal text-surface-dim ml-0.5">종</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-start justify-between sm:justify-start p-1.5 sm:p-0 pt-2 sm:pt-0">
              <div className="flex items-center gap-1 text-surface-dim text-[11px] sm:text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>재고 부족</span>
              </div>
              <div className={`text-sm sm:text-lg font-black font-mono mt-0 sm:mt-1 ${lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {lowStockCount}
                <span className="text-[10px] sm:text-xs font-normal text-surface-dim ml-0.5">종</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
