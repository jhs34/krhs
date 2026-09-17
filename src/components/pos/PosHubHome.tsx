import { useState, useEffect } from 'react';
import {
  Store,
  Boxes,
  LogOut,
  Home,
  Clock,
  ArrowRight,
  Sparkles,
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
            <span className="hidden sm:inline text-[10px] text-secondary-fixed opacity-80">
              ({user.role === 'admin' ? '관리자' : '판매원'})
            </span>
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
      <main className="flex-1 max-w-6xl w-full mx-auto p-5 sm:p-8 flex flex-col justify-center space-y-8">
        {/* Welcome Banner */}
        <div className="text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#121e3d] via-[#101b38] to-[#0c162e] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>학생회 매점 정식 인증 세션</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              안녕하세요, {user.name} 담당자님!
            </h2>
            <p className="text-sm text-surface-dim mt-1.5 max-w-xl leading-relaxed">
              매점 영업을 시작하려면 아래 <span className="text-white font-bold">[포스기 화면 (영업 시작)]</span>을 누르고, 상품 등록 및 재고 수량을 변경하려면 <span className="text-white font-bold">[상품 및 재고 관리]</span>를 선택하세요.
            </p>
          </div>

          <div className="relative z-10 flex items-center space-x-3 self-center sm:self-auto shrink-0 bg-black/40 border border-white/10 p-3 rounded-2xl">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div className="text-left">
              <div className="text-[11px] text-surface-dim">시스템 상태</div>
              <div className="text-xs font-black text-emerald-300">정상 작동 (영업 준비 완료)</div>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons (2x2 Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Action 1: POS Sales Register (영업 시작) */}
          <button
            type="button"
            onClick={onStartSales}
            className="group relative text-left bg-gradient-to-br from-[#182852] to-[#0f1b3b] hover:from-[#1e3266] hover:to-[#14234c] border-2 border-secondary/40 hover:border-secondary rounded-3xl p-6 shadow-2xl transition-all active:scale-[0.99] flex flex-col justify-between min-h-[200px] overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl pointer-events-none group-hover:bg-secondary/30 transition-all" />

            <div className="flex items-start justify-between relative z-10">
              <div className="w-13 h-13 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-lg shadow-secondary/30 group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-secondary/20 text-secondary border border-secondary/30">
                {hasActiveCart ? '판매 진행 중' : '영업 개시'}
              </span>
            </div>

            <div className="relative z-10 mt-5">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  포스기 화면 (영업 시작)
                </h3>
                <ArrowRight className="w-5 h-5 text-secondary group-hover:translate-x-1.5 transition-transform" />
              </div>
              <p className="text-xs text-surface-dim mt-1.5 leading-relaxed">
                바코드 스캔, 터치 상품 선택, 장바구니 계산 및 현금/계좌이체 결제 창으로 즉시 진입합니다.
              </p>
            </div>
          </button>

          {/* Action 2: Product & Inventory Manager (상품 재고 관리) */}
          <button
            type="button"
            onClick={onOpenProductManager}
            className="group relative text-left bg-gradient-to-br from-[#162438] to-[#0c1626] hover:from-[#1c2e47] hover:to-[#111e33] border-2 border-amber-500/30 hover:border-amber-400 rounded-3xl p-6 shadow-2xl transition-all active:scale-[0.99] flex flex-col justify-between min-h-[200px] overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

            <div className="flex items-start justify-between relative z-10">
              <div className="w-13 h-13 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Boxes className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                품목 {items.length}종 관리
              </span>
            </div>

            <div className="relative z-10 mt-5">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  상품 및 재고 관리
                </h3>
                <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1.5 transition-transform" />
              </div>
              <p className="text-xs text-surface-dim mt-1.5 leading-relaxed">
                신규 상품 등록, 가격/바코드 수정, 카테고리 순서 변경 및 품목별 재고 수량을 실시간으로 조정합니다.
              </p>
            </div>
          </button>

          {/* Action 3: Sales History & Receipts (매출 내역 및 영수증) */}
          <button
            type="button"
            onClick={onOpenSalesHistory}
            className="group relative text-left bg-gradient-to-br from-[#0e2a24] to-[#081714] hover:from-[#12362e] hover:to-[#0c1f1b] border-2 border-emerald-500/30 hover:border-emerald-400 rounded-3xl p-6 shadow-2xl transition-all active:scale-[0.99] flex flex-col justify-between min-h-[200px] overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

            <div className="flex items-start justify-between relative z-10">
              <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <ReceiptText className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                오늘 결제 {todayOrdersCount}건
              </span>
            </div>

            <div className="relative z-10 mt-5">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  매출 내역 및 영수증 관리
                </h3>
                <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1.5 transition-transform" />
              </div>
              <p className="text-xs text-surface-dim mt-1.5 leading-relaxed">
                전체 결제 내역 조회, 전자 영수증 재발급/출력, 결제 취소 및 환불 시 실시간 재고 자동 복원을 처리합니다.
              </p>
            </div>
          </button>

          {/* Action 4: Shift Settlement & Cash Drawer (일일 시재금 및 마감 정산) */}
          <button
            type="button"
            onClick={onOpenSettlement}
            className="group relative text-left bg-gradient-to-br from-[#241738] to-[#140b24] hover:from-[#2e1d47] hover:to-[#1a0e2e] border-2 border-violet-500/30 hover:border-violet-400 rounded-3xl p-6 shadow-2xl transition-all active:scale-[0.99] flex flex-col justify-between min-h-[200px] overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-500/20 transition-all" />

            <div className="flex items-start justify-between relative z-10">
              <div className="w-13 h-13 rounded-2xl bg-violet-500/20 border border-violet-500/40 text-violet-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Calculator className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                실적 {totalSalesToday.toLocaleString()}원
              </span>
            </div>

            <div className="relative z-10 mt-5">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  일일 시재금 및 마감 정산
                </h3>
                <ArrowRight className="w-5 h-5 text-violet-400 group-hover:translate-x-1.5 transition-transform" />
              </div>
              <p className="text-xs text-surface-dim mt-1.5 leading-relaxed">
                영업 시작 준비금과 현금 매출을 합산하여 금고 실측 현금과의 시재 과부족을 정산하고 마감 보고서를 생성합니다.
              </p>
            </div>
          </button>
        </div>

        {/* Quick KPI & Status Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#0e172e] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between text-surface-dim text-xs mb-1.5">
              <span>당일 총 매출액</span>
              <TrendingUp className="w-3.5 h-3.5 text-secondary" />
            </div>
            <div className="text-xl font-black text-white font-mono">
              {totalSalesToday.toLocaleString()}
              <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
            </div>
            <div className="text-[11px] text-surface-dim mt-1">
              이체 {transferSalesToday.toLocaleString()}원 / 현금 {cashSalesToday.toLocaleString()}원
            </div>
          </div>

          <div className="bg-[#0e172e] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between text-surface-dim text-xs mb-1.5">
              <span>총 재고 합계</span>
              <Boxes className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-white font-mono">
              {totalStockCount}
              <span className="text-xs font-normal text-surface-dim ml-0.5">개</span>
            </div>
            <div className="text-[11px] text-surface-dim mt-1">
              {categories.length}개 카테고리 · {items.length}개 품목
            </div>
          </div>

          <div className="bg-[#0e172e] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between text-surface-dim text-xs mb-1.5">
              <span>품절 품목 (재고 0)</span>
              <BadgeAlert className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className={`text-xl font-black font-mono ${outOfStockCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {outOfStockCount}
              <span className="text-xs font-normal text-surface-dim ml-0.5">종</span>
            </div>
            <div className="text-[11px] text-surface-dim mt-1">
              {outOfStockCount > 0 ? '즉시 입고 필요' : '모든 품목 재고 보유'}
            </div>
          </div>

          <div className="bg-[#0e172e] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between text-surface-dim text-xs mb-1.5">
              <span>재고 부족 (1~5개)</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className={`text-xl font-black font-mono ${lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {lowStockCount}
              <span className="text-xs font-normal text-surface-dim ml-0.5">종</span>
            </div>
            <div className="text-[11px] text-surface-dim mt-1">
              추가 발주 점검 권장
            </div>
          </div>
        </div>

        {/* Operating Guide Notice */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-surface-dim flex items-start space-x-3">
          <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="text-white font-bold">운영 규칙 안내:</span> 영업 도중 실수로 인한 판매 중단을 방지하기 위해, 포스기 판매 화면에서는 즉시 로그아웃 대신 <strong className="text-secondary-fixed">[계정 교환]</strong> 버튼을 통해 근무자를 변경할 수 있습니다. 당일 영업을 모두 마치신 후 <strong className="text-red-300">[영업 종료]</strong>를 하시면 본 메인 화면으로 돌아와 안전하게 로그아웃하실 수 있습니다.
          </div>
        </div>
      </main>
    </div>
  );
}
