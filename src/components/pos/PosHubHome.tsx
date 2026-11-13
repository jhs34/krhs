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
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { PosUser, PosItem, PosCategory } from '../../types/pos';
import { EASE_OUT_EXPO } from '../../utils/motion';

interface PosHubHomeProps {
  user: PosUser;
  items: PosItem[];
  categories: PosCategory[];
  totalSalesToday: number;
  cashSalesToday: number;
  transferSalesToday: number;
  todayDiscountTotal?: number;
  todayOrdersCount: number;
  todayTotalSoldCount?: number;
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
  totalSalesToday,
  cashSalesToday,
  transferSalesToday,
  todayDiscountTotal = 0,
  todayOrdersCount,
  todayTotalSoldCount = 0,
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

  const isItemSoldOut = (it: PosItem) => Boolean(it.isSoldOut);
  const outOfStockCount = items.filter(isItemSoldOut).length;
  const inStockCount = items.length - outOfStockCount;
  const totalSoldCount = items.reduce((sum, it) => sum + (it.totalSold || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-primary text-white overflow-y-auto select-none">
      {/* Top Navigation Bar matching KRHS Portal Navigation.tsx */}
      <header className="glass-panel-dark sticky top-0 z-30 border-b border-white/5 shrink-0">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Lockup matching Navigation.tsx */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              className="w-[22px] sm:w-[26px] h-auto brightness-0 invert opacity-90 block shrink-0"
              alt="KRHS"
            />
            <span className="font-sans font-bold tracking-tight text-white/95 text-base sm:text-lg whitespace-nowrap">
              KRHS POS
            </span>
          </div>

          {/* Zone 2: Quiet inline status & operator info (unboxed) */}
          <div className="hidden md:flex items-center space-x-3 text-xs text-surface-dim whitespace-nowrap">
            <span>담당: <strong className="text-white font-semibold">{user.name}</strong>{user.role === 'admin' ? ' (관리자)' : ''}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-white/80">{format(currentTime, 'yyyy.MM.dd HH:mm:ss')}</span>
          </div>

          {/* Zone 3: Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <span className="md:hidden inline-flex items-center text-xs text-surface-dim truncate max-w-[100px]">
              <strong className="text-white">{user.name}</strong>
            </span>

            {onOpenAuditLog && (
              <button
                type="button"
                onClick={onOpenAuditLog}
                className="h-8 text-xs font-medium text-surface-dim hover:text-white px-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center space-x-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-secondary-container shrink-0" />
                <span className="hidden sm:inline">감사 로그</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExitToPortal}
              className="h-8 text-xs font-medium text-surface-dim hover:text-white px-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center space-x-1.5"
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">학교 포털</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="h-8 text-xs font-medium text-surface-dim hover:text-red-300 bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content matching Dashboard.tsx */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-10 md:px-16 lg:px-24 py-8 sm:py-12 md:py-16 flex flex-col space-y-10 sm:space-y-12">
        {/* Section 1: Operational Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
          className="border-b border-white/[0.08] pb-6 sm:pb-8"
        >
          <div className="space-y-2">
            <h1 className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-tight">
              매점 운영 허브
            </h1>
            <p className="text-surface-dim text-xs sm:text-sm max-w-xl leading-relaxed break-keep">
              담당: <span className="text-white font-semibold">{user.name}</span> · 판매 화면 진입, 상품·재고 관리 및 일일 마감 정산을 진행합니다.
            </p>
          </div>
        </motion.div>

        {/* Section 2: Dominant Focal Anchor (Sales Terminal Launch) + Operations List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Left 7 Cols: Primary Sales Register Launch Panel */}
          <motion.button
            type="button"
            onClick={onStartSales}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.03, ease: EASE_OUT_EXPO }}
            className="lg:col-span-7 text-left bg-[#0a1120] hover:bg-[#0f182b] border border-white/[0.08] hover:border-secondary/50 rounded-2xl p-6 sm:p-8 md:p-10 flex flex-col justify-between transition-colors duration-150 group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="w-11 h-11 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-white">
                  <Store className="w-5 h-5" strokeWidth={1.5} />
                </div>
                {hasActiveCart && (
                  <span className="text-xs text-secondary-container font-semibold">
                    장바구니 유지 중
                  </span>
                )}
              </div>

              <h2 className="font-sans font-semibold text-xl sm:text-2xl md:text-3xl text-white tracking-tight mb-2.5 group-hover:text-secondary-container transition-colors">
                포스기 판매 화면 시작
              </h2>
              <p className="text-xs sm:text-sm text-surface-dim leading-relaxed max-w-lg break-keep">
                매점 상품 터치 주문, 현금 거스름돈 계산, 계좌이체 확인 및 할인 적용을 처리합니다.
              </p>
            </div>

            <div className="pt-6 mt-8 border-t border-white/[0.06] flex items-center justify-between">
              <div className="text-xs text-surface-dim font-mono tabular-nums">
                판매 가능 {inStockCount}종 · 오늘 결제 {todayOrdersCount}건
              </div>
              <div className="inline-flex items-center space-x-2 text-sm font-semibold text-white group-hover:translate-x-1 transition-transform">
                <span>{hasActiveCart ? '판매 화면으로 복귀' : '영업 시작하기'}</span>
                <ArrowRight className="w-4 h-4 text-secondary-container" />
              </div>
            </div>
          </motion.button>

          {/* Right 5 Cols: Clean Hairline-Divided Operations List */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.06, ease: EASE_OUT_EXPO }}
            className="lg:col-span-5 bg-[#0a1120] border border-white/[0.08] rounded-2xl p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/[0.08]">
                <h3 className="font-sans font-semibold text-base sm:text-lg text-white tracking-tight">
                  운영 및 정산 관리
                </h3>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {/* Item 1: Product Manager */}
                <button
                  type="button"
                  onClick={onOpenProductManager}
                  className="w-full py-4 flex items-center justify-between text-left group cursor-pointer transition-colors"
                >
                  <div className="flex items-start space-x-3.5 min-w-0 pr-3">
                    <Boxes className="w-5 h-5 text-surface-dim group-hover:text-white mt-0.5 shrink-0 transition-colors" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-semibold text-white group-hover:text-secondary-container transition-colors">
                        상품 및 재고 관리
                      </div>
                      <p className="text-xs text-surface-dim mt-0.5 truncate">
                        등록 상품 {items.length}종 · 품절 {outOfStockCount}종 · 메뉴별 판매량
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-dim group-hover:text-white group-hover:translate-x-1 transition-[color,transform] shrink-0" />
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
                      <div className="text-sm sm:text-base font-semibold text-white group-hover:text-secondary-container transition-colors">
                        매출 내역 및 영수증
                      </div>
                      <p className="text-xs text-surface-dim mt-0.5 truncate">
                        오늘 결제 {todayOrdersCount}건 · 개별 부분 환불 및 영수증 조회
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-dim group-hover:text-white group-hover:translate-x-1 transition-[color,transform] shrink-0" />
                </button>

                {/* Item 3: Shift Settlement */}
                <button
                  type="button"
                  onClick={onOpenSettlement}
                  className="w-full pt-4 pb-1 flex items-center justify-between text-left group cursor-pointer transition-colors"
                >
                  <div className="flex items-start space-x-3.5 min-w-0 pr-3">
                    <Calculator className="w-5 h-5 text-surface-dim group-hover:text-white mt-0.5 shrink-0 transition-colors" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-semibold text-white group-hover:text-secondary-container transition-colors">
                        일일 마감 정산 및 시재
                      </div>
                      <p className="text-xs text-surface-dim mt-0.5 truncate">
                        기초 준비금 설정 · 권종별 금고 시재 대조 및 보고서
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-dim group-hover:text-white group-hover:translate-x-1 transition-[color,transform] shrink-0" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Section 3: Bottom Unboxed Live Summary Strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.09, ease: EASE_OUT_EXPO }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-8 border-t border-white/[0.08]"
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

          <div className="space-y-1 sm:border-l sm:border-white/[0.08] sm:pl-6">
            <span className="text-[11px] text-surface-dim block">당일 판매 수량</span>
            <div className="text-lg sm:text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
              {todayTotalSoldCount.toLocaleString()}
              <span className="text-xs font-normal text-surface-dim ml-0.5">개</span>
            </div>
            <div className="text-[11px] text-surface-dim/70 font-mono tabular-nums">
              누적 {totalSoldCount.toLocaleString()}개
            </div>
          </div>

          <div className="space-y-1 sm:border-l sm:border-white/[0.08] sm:pl-6">
            <span className="text-[11px] text-surface-dim block">정상 판매 품목</span>
            <div className="text-lg sm:text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
              {inStockCount}
              <span className="text-xs font-normal text-surface-dim ml-0.5">/ {items.length}종</span>
            </div>
            <div className="text-[11px] text-surface-dim/70">
              품절 {outOfStockCount}종
            </div>
          </div>

          <div className="space-y-1 sm:border-l sm:border-white/[0.08] sm:pl-6">
            <span className="text-[11px] text-surface-dim block">당일 할인 적용</span>
            <div className={`text-lg sm:text-2xl font-bold font-mono tabular-nums tracking-tight ${todayDiscountTotal > 0 ? 'text-amber-300' : 'text-white'}`}>
              {todayDiscountTotal > 0 ? `-${todayDiscountTotal.toLocaleString()}` : '0'}
              <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
            </div>
            <div className="text-[11px] text-surface-dim/70">
              주문 할인 적용 합계
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
