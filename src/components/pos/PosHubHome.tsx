import { useState, useEffect } from 'react';
import {
  Store,
  Boxes,
  LogOut,
  Home,
  ArrowRight,
  ShieldCheck,
  ReceiptText,
  Calculator,
  Ticket,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { PosUser, PosItem, PosCategory, PosGifticon } from '../../types/pos';

interface PosHubHomeProps {
  user: PosUser;
  items: PosItem[];
  categories: PosCategory[];
  gifticons?: PosGifticon[];
  totalSalesToday: number;
  cashSalesToday: number;
  transferSalesToday: number;
  todayOrdersCount: number;
  todayTotalSoldCount?: number;
  hasActiveCart: boolean;
  onStartSales: () => void;
  onOpenProductManager: () => void;
  onOpenGifticonManager?: () => void;
  onOpenSalesHistory: () => void;
  onOpenSettlement: () => void;
  onOpenAuditLog?: () => void;
  onLogout: () => void;
  onExitToPortal: () => void;
}

export function PosHubHome({
  user,
  items,
  gifticons,
  totalSalesToday,
  cashSalesToday,
  transferSalesToday,
  todayOrdersCount,
  todayTotalSoldCount = 0,
  hasActiveCart,
  onStartSales,
  onOpenProductManager,
  onOpenGifticonManager,
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

  const isItemSoldOut = (it: PosItem) => Boolean(it.isSoldOut);
  const outOfStockCount = items.filter(isItemSoldOut).length;
  const inStockCount = items.length - outOfStockCount;
  const totalSoldCount = items.reduce((sum, it) => sum + (it.totalSold || 0), 0);
  const activeGifticonsCount = gifticons ? gifticons.filter(g => g.status === 'ACTIVE').length : 0;

  return (
    <div className="flex-1 flex flex-col bg-primary text-white overflow-y-auto select-none">
      {/* Top Navigation Bar matching KRHS Portal Navigation.tsx */}
      <header className="glass-panel-dark sticky top-0 z-30 border-b border-white/5 shrink-0">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between gap-4 pt-[2px]">
          {/* Zone 1: Brand Lockup matching Navigation.tsx */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              className="w-[22px] sm:w-[26px] h-auto brightness-0 invert opacity-90 block shrink-0"
              alt="KRHS"
            />
            <span className="font-sans font-bold tracking-tight text-white/95 text-base sm:text-lg leading-none translate-y-[1.5px] whitespace-nowrap">
              KRHS POS
            </span>
          </div>

          {/* Zone 2: Quiet inline status & operator info (unboxed) */}
          <div className="hidden md:flex items-center space-x-3 text-xs text-surface-dim whitespace-nowrap leading-none translate-y-[1.5px]">
            <span>담당: <strong className="text-white font-semibold">{user.name}</strong>{user.role === 'admin' ? ' (관리자)' : ''}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-white/80">{format(currentTime, 'yyyy.MM.dd HH:mm:ss')}</span>
          </div>

          {/* Zone 3: Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <span className="md:hidden inline-flex items-center text-xs text-surface-dim truncate max-w-[100px] leading-none translate-y-[1.5px]">
              <strong className="text-white">{user.name}</strong>
            </span>

            {onOpenAuditLog && (
              <button
                type="button"
                onClick={onOpenAuditLog}
                className="h-8 text-xs font-medium text-surface-dim hover:text-white px-2.5 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center space-x-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-secondary-container shrink-0" />
                <span className="hidden sm:inline leading-none translate-y-[1.5px]">감사 로그</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExitToPortal}
              className="h-8 text-xs font-medium text-surface-dim hover:text-white px-2.5 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center space-x-1.5"
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline leading-none translate-y-[1.5px]">학교 포털</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="h-8 text-xs font-medium text-surface-dim hover:text-red-300 bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none translate-y-[1.5px]">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content matching Dashboard.tsx */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-10 md:px-16 lg:px-24 py-8 sm:py-12 md:py-16 flex flex-col space-y-10 sm:space-y-12">
        {/* Section 1: Editorial Header */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6 }}
          className="border-b border-white/10 pb-7 sm:pb-9"
        >
          <div className="space-y-3">
            <h1 className="font-sans font-bold text-2xl sm:text-3xl md:text-5xl text-white tracking-tighter leading-[1.2] md:leading-[1.15]">
              한국철도고등학교,<br />
              <span className="text-surface-dim">매점 통합 운영 터미널</span>
            </h1>
            <p className="text-surface-dim font-medium text-xs sm:text-sm md:text-base max-w-xl leading-relaxed break-keep">
              안녕하세요, <span className="text-white font-semibold">{user.name}</span> 담당자님. 실시간 결제와 재고 관리, 일일 정산이 하나의 포털에서 연결됩니다.
            </p>
          </div>
        </motion.div>

        {/* Section 2: Dominant Focal Anchor (Sales Terminal Launch) + Editorial Module List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left 7 Cols: Primary Sales Register Launch Panel */}
          <motion.button
            type="button"
            onClick={onStartSales}
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="lg:col-span-7 text-left bg-[#0a1120] hover:bg-[#0d1629] border border-white/10 hover:border-secondary/60 rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col justify-between transition-all duration-300 group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-white">
                  <Store className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
                </div>
                {hasActiveCart && (
                  <span className="text-xs text-secondary-container font-semibold">
                    장바구니 유지 중
                  </span>
                )}
              </div>

              <h2 className="font-sans font-bold text-xl sm:text-2xl md:text-3xl text-white tracking-tight mb-2.5 group-hover:text-secondary-container transition-colors">
                포스기 판매 화면 시작
              </h2>
              <p className="text-xs sm:text-sm text-surface-dim leading-relaxed max-w-lg break-keep">
                매점 상품 터치 주문, 현금 거스름돈 자동 계산, 계좌이체 확인 및 기프티콘 코드 차감을 즉시 처리합니다.
              </p>
            </div>

            <div className="pt-6 mt-8 border-t border-white/5 flex items-center justify-between">
              <div className="text-xs text-surface-dim font-mono tabular-nums">
                판매 가능 {inStockCount}종 · 오늘 결제 {todayOrdersCount}건
              </div>
              <div className="inline-flex items-center space-x-2 text-sm font-bold text-white group-hover:translate-x-1 transition-transform">
                <span>{hasActiveCart ? '판매 화면으로 복귀' : '영업 시작하기'}</span>
                <ArrowRight className="w-4 h-4 text-secondary-container" />
              </div>
            </div>
          </motion.button>

          {/* Right 5 Cols: Clean Hairline-Divided Operations List (Unboxed individual items) */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="lg:col-span-5 bg-[#0a1120] border border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/10">
                <h3 className="font-sans font-bold text-base sm:text-lg text-white tracking-tight">
                  운영 및 정산 관리
                </h3>
              </div>

              <div className="divide-y divide-white/5">
                {/* Item 1: Product Manager */}
                <button
                  type="button"
                  onClick={onOpenProductManager}
                  className="w-full py-4 flex items-center justify-between text-left group cursor-pointer transition-colors"
                >
                  <div className="flex items-start space-x-3.5 min-w-0 pr-3">
                    <Boxes className="w-5 h-5 text-surface-dim group-hover:text-white mt-0.5 shrink-0 transition-colors" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-bold text-white group-hover:text-secondary-container transition-colors">
                        상품 및 재고 관리
                      </div>
                      <p className="text-xs text-surface-dim mt-0.5 truncate">
                        등록 상품 {items.length}종 · 품절 {outOfStockCount}종 · 프리셋 설정
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-dim group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                {/* Item 2: Sales History */}
                <button
                  type="button"
                  onClick={onOpenSalesHistory}
                  className="w-full py-4 flex items-center justify-between text-left group cursor-pointer transition-colors"
                >
                  <div className="flex items-start space-x-3.5 min-w-0 pr-3">
                    <ReceiptText className="w-5 h-5 text-surface-dim group-hover:text-white mt-0.5 shrink-0 transition-colors" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-bold text-white group-hover:text-secondary-container transition-colors">
                        매출 내역 및 영수증
                      </div>
                      <p className="text-xs text-surface-dim mt-0.5 truncate">
                        오늘 결제 {todayOrdersCount}건 · 개별 부분 환불 및 영수증 조회
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-dim group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                {/* Item 3: Shift Settlement */}
                <button
                  type="button"
                  onClick={onOpenSettlement}
                  className="w-full py-4 flex items-center justify-between text-left group cursor-pointer transition-colors"
                >
                  <div className="flex items-start space-x-3.5 min-w-0 pr-3">
                    <Calculator className="w-5 h-5 text-surface-dim group-hover:text-white mt-0.5 shrink-0 transition-colors" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-bold text-white group-hover:text-secondary-container transition-colors">
                        일일 마감 정산 및 시재
                      </div>
                      <p className="text-xs text-surface-dim mt-0.5 truncate">
                        기초 준비금 설정 · 권종별 금고 시재 대조 및 보고서
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-dim group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                {/* Item 4: Gifticon Manager */}
                {onOpenGifticonManager && (
                  <button
                    type="button"
                    onClick={onOpenGifticonManager}
                    className="w-full pt-4 pb-1 flex items-center justify-between text-left group cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0 pr-3">
                      <Ticket className="w-5 h-5 text-surface-dim group-hover:text-white mt-0.5 shrink-0 transition-colors" strokeWidth={1.5} />
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-bold text-white group-hover:text-secondary-container transition-colors">
                          기프티콘 관리
                        </div>
                        <p className="text-xs text-surface-dim mt-0.5 truncate">
                          사용 가능 {activeGifticonsCount}장 · 코드 등록 및 사용 내역 확인
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-surface-dim group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Section 3: Bottom Unboxed Live Telemetry Strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-8 border-t border-white/10"
        >
          <div className="space-y-1">
            <span className="text-[11px] text-surface-dim block">당일 매출 ({todayOrdersCount}건)</span>
            <div className="text-lg sm:text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
              {totalSalesToday.toLocaleString()}
              <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
            </div>
            <div className="text-[11px] text-surface-dim/70 font-mono tabular-nums">
              이체 {transferSalesToday.toLocaleString()} · 현금 {cashSalesToday.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-6">
            <span className="text-[11px] text-surface-dim block">당일 판매 수량</span>
            <div className="text-lg sm:text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
              {todayTotalSoldCount.toLocaleString()}
              <span className="text-xs font-normal text-surface-dim ml-0.5">개</span>
            </div>
            <div className="text-[11px] text-surface-dim/70 font-mono tabular-nums">
              누적 {totalSoldCount.toLocaleString()}개
            </div>
          </div>

          <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-6">
            <span className="text-[11px] text-surface-dim block">정상 판매 품목</span>
            <div className="text-lg sm:text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
              {inStockCount}
              <span className="text-xs font-normal text-surface-dim ml-0.5">/ {items.length}종</span>
            </div>
            <div className="text-[11px] text-surface-dim/70">
              품절 {outOfStockCount}종
            </div>
          </div>

          <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-6">
            <span className="text-[11px] text-surface-dim block">사용 가능 기프티콘</span>
            <div className="text-lg sm:text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
              {activeGifticonsCount}
              <span className="text-xs font-normal text-surface-dim ml-0.5">장</span>
            </div>
            <div className="text-[11px] text-surface-dim/70">
              즉시 할인 적용 가능
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
