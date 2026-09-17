import { useState, useMemo } from 'react';
import { 
  Calculator, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Coins, 
  Banknote, 
  Printer, 
  Copy, 
  Check, 
  Lock, 
  FileText,
  Calendar,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { PosOrder, PosSettlement } from '../../types/pos';

interface PosSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PosOrder[];
  currentUserName: string;
  currentUserId: string;
  settlement: PosSettlement | null;
  onSaveSettlement: (settlement: PosSettlement) => void;
}

export function PosSettlementModal({
  isOpen,
  onClose,
  orders,
  currentUserName,
  currentUserId,
  settlement,
  onSaveSettlement,
}: PosSettlementModalProps) {
  // Opening preparation cash (준비금)
  const [initialCash, setInitialCash] = useState<number>(() => settlement?.initialCash ?? 50000);

  // Denominations for physical cash counting (한국 원화 화폐 규격: 5만원, 1만원, 5천원, 1천원, 500원, 100원)
  const [counts, setCounts] = useState<{ [denom: number]: number }>({
    50000: 0,
    10000: 0,
    5000: 0,
    1000: 0,
    500: 0,
    100: 0,
  });

  const [directCashInput, setDirectCashInput] = useState<string>('');
  const [useDirectInput, setUseDirectInput] = useState<boolean>(false);
  const [closingNote, setClosingNote] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [isFinalized, setIsFinalized] = useState<boolean>(() => settlement?.status === 'CLOSED');

  // Calculate order metrics for today
  const activeOrders = useMemo(() => orders.filter(o => !o.isCancelled), [orders]);
  const cancelledOrders = useMemo(() => orders.filter(o => o.isCancelled), [orders]);

  const transferSales = useMemo(
    () => activeOrders.filter(o => o.paymentMethod === 'TRANSFER').reduce((s, o) => s + o.totalAmount, 0),
    [activeOrders]
  );

  const cashSales = useMemo(
    () => activeOrders.filter(o => o.paymentMethod === 'CASH').reduce((s, o) => s + o.totalAmount, 0),
    [activeOrders]
  );

  const totalSales = transferSales + cashSales;

  // Expected cash in drawer = initialCash + cashSales
  const expectedCashInDrawer = initialCash + cashSales;

  // Actual cash in drawer
  const countedCash = useMemo(() => {
    if (useDirectInput) {
      return parseInt(directCashInput.replace(/[^0-9]/g, ''), 10) || 0;
    }
    return Object.entries(counts).reduce((sum, [denom, count]) => {
      return sum + Number(denom) * (count || 0);
    }, 0);
  }, [useDirectInput, directCashInput, counts]);

  // Discrepancy (실측금액 - 장부상금액)
  const discrepancy = countedCash - expectedCashInDrawer;

  if (!isOpen) return null;

  const handleCountChange = (denom: number, val: string) => {
    const n = Math.max(0, parseInt(val, 10) || 0);
    setCounts(prev => ({ ...prev, [denom]: n }));
  };

  const handleQuickAdd = (denom: number, delta: number) => {
    setCounts(prev => ({ ...prev, [denom]: Math.max(0, (prev[denom] || 0) + delta) }));
  };

  // Finalize Shift Settlement
  const handleFinalize = () => {
    const todayId = format(new Date(), 'yyyy-MM-dd');
    const newSettlement: PosSettlement = {
      id: todayId,
      openedAt: settlement?.openedAt || new Date().toISOString(),
      closedAt: new Date().toISOString(),
      openedBy: settlement?.openedBy || currentUserName,
      closedBy: currentUserName,
      initialCash,
      transferSales,
      cashSales,
      totalSales,
      actualCashInput: countedCash,
      discrepancy,
      status: 'CLOSED',
    };

    onSaveSettlement(newSettlement);
    setIsFinalized(true);
  };

  // Copy Settlement Report
  const handleCopyReport = () => {
    const now = format(new Date(), 'yyyy.MM.dd HH:mm');
    const lines = [
      '================================',
      '      한국철도고등학교 매점      ',
      '       [ 일일 영업 마감 보고서 ]  ',
      '================================',
      `마감일시: ${now}`,
      `마감담당: ${currentUserName}`,
      '--------------------------------',
      `[매출 실적]`,
      `· 총 주문 건수: ${orders.length}건 (정상 ${activeOrders.length}건, 취소 ${cancelledOrders.length}건)`,
      `· 계좌이체 매출: ${transferSales.toLocaleString()}원`,
      `· 현금 매출:     ${cashSales.toLocaleString()}원`,
      `· 총 매출 합계:   ${totalSales.toLocaleString()}원`,
      '--------------------------------',
      `[금고 시재금 정산]`,
      `· 시작 준비금:   ${initialCash.toLocaleString()}원`,
      `· 장부상 현금:   ${expectedCashInDrawer.toLocaleString()}원`,
      `· 실측된 현금:   ${countedCash.toLocaleString()}원`,
      `· 시재 과부족:   ${discrepancy === 0 ? '0원 (일치)' : `${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString()}원 (${discrepancy > 0 ? '과잉' : '부족'})`}`,
      '================================',
      closingNote ? `특이사항: ${closingNote}` : '특이사항 없음.',
      '================================',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e172e] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#090e1c] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-white">일일 시재금 및 마감 정산</h2>
                {isFinalized && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    마감 완료
                  </span>
                )}
              </div>
              <p className="text-xs text-surface-dim">
                당일 총 매출 합계와 금고 현금을 대조하여 시재 과부족을 정산하고 마감합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* Section 1: Sales Performance Dashboard */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-dim mb-3 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span>1. 당일 영업 매출 실적 집계</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Revenue */}
              <div className="bg-[#121c38] border border-secondary/30 rounded-2xl p-4">
                <span className="text-xs text-surface-dim block mb-1">총 매출 합계</span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono">
                  {totalSales.toLocaleString()}
                  <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                </span>
                <span className="text-[11px] text-secondary-fixed block mt-1">
                  결제 {activeOrders.length}건
                </span>
              </div>

              {/* Transfer Sales */}
              <div className="bg-[#121c38] border border-indigo-500/20 rounded-2xl p-4">
                <span className="text-xs text-indigo-300 block mb-1">계좌이체 매출</span>
                <span className="text-xl sm:text-2xl font-black text-indigo-200 font-mono">
                  {transferSales.toLocaleString()}
                  <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                </span>
                <span className="text-[11px] text-surface-dim block mt-1">
                  {activeOrders.filter(o => o.paymentMethod === 'TRANSFER').length}건 완료
                </span>
              </div>

              {/* Cash Sales */}
              <div className="bg-[#121c38] border border-emerald-500/20 rounded-2xl p-4">
                <span className="text-xs text-emerald-300 block mb-1">현금 매출</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-200 font-mono">
                  {cashSales.toLocaleString()}
                  <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                </span>
                <span className="text-[11px] text-surface-dim block mt-1">
                  {activeOrders.filter(o => o.paymentMethod === 'CASH').length}건 완료
                </span>
              </div>

              {/* Cancelled */}
              <div className="bg-[#121c38] border border-red-500/20 rounded-2xl p-4">
                <span className="text-xs text-red-300 block mb-1">취소 및 환불</span>
                <span className="text-xl sm:text-2xl font-black text-red-300 font-mono">
                  {cancelledOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}
                  <span className="text-xs font-normal text-surface-dim ml-0.5">원</span>
                </span>
                <span className="text-[11px] text-red-400/80 block mt-1">
                  {cancelledOrders.length}건 취소됨
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Cash Drawer Reconciliation (금고 시재금 대조) */}
          <div className="bg-[#090e1c] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center space-x-2">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>2. 금고 현금 시재금 정산 및 대조</span>
                </h3>
                <p className="text-xs text-surface-dim mt-0.5">
                  영업 시작 준비금과 오늘 발생한 현금 매출의 합산액을 실제 금고 현금과 대조합니다.
                </p>
              </div>

              {/* Initial Preparation Cash Setting */}
              <div className="flex items-center space-x-2 shrink-0">
                <label className="text-xs text-surface-dim font-bold">시작 준비금:</label>
                <div className="relative">
                  <input
                    type="number"
                    value={initialCash}
                    onChange={e => setInitialCash(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    disabled={isFinalized}
                    className="w-28 bg-black/50 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-right font-mono font-bold text-white outline-none focus:border-secondary"
                  />
                  <span className="text-xs text-surface-dim absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                    원
                  </span>
                </div>
              </div>
            </div>

            {/* Expected vs Actual Highlight */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Expected in Drawer */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-surface-dim block mb-1">장부상 금고 현금</span>
                <div className="text-lg font-black font-mono text-white">
                  {expectedCashInDrawer.toLocaleString()}원
                </div>
                <div className="text-[11px] text-surface-dim mt-0.5">
                  준비금({initialCash.toLocaleString()}) + 현금매출({cashSales.toLocaleString()})
                </div>
              </div>

              {/* Counted Cash in Drawer */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-surface-dim">실측된 금고 현금</span>
                  <button
                    type="button"
                    onClick={() => setUseDirectInput(!useDirectInput)}
                    className="text-[10px] text-secondary hover:underline"
                  >
                    {useDirectInput ? '권종별 계산기로 전환' : '직접 금액 입력으로 전환'}
                  </button>
                </div>
                <div className="text-lg font-black font-mono text-emerald-400">
                  {countedCash.toLocaleString()}원
                </div>
                <div className="text-[11px] text-surface-dim mt-0.5">
                  {useDirectInput ? '직접 입력 모드' : '아래 지폐/동전 합산'}
                </div>
              </div>

              {/* Discrepancy (과부족) */}
              <div
                className={`p-3.5 rounded-xl border ${
                  discrepancy === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : discrepancy > 0
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <span className="text-xs block mb-1 font-bold">시재 과부족 (오차)</span>
                <div className="text-lg font-black font-mono">
                  {discrepancy === 0
                    ? '0원 (정상 일치)'
                    : `${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString()}원`}
                </div>
                <div className="text-[11px] font-medium mt-0.5">
                  {discrepancy === 0
                    ? '장부와 실측 현금이 일치합니다.'
                    : discrepancy > 0
                    ? '장부보다 현금이 많습니다 (과잉).'
                    : '장부보다 현금이 부족합니다 (확인 요망).'}
                </div>
              </div>
            </div>

            {/* Denomination Counter Grid */}
            {!useDirectInput ? (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-surface-dim flex items-center space-x-1.5">
                  <Coins className="w-3.5 h-3.5 text-secondary" />
                  <span>권종별 수량 입력 (자동 합산)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  {[
                    { denom: 50000, label: '5만원', type: '지폐' },
                    { denom: 10000, label: '1만원', type: '지폐' },
                    { denom: 5000, label: '5천원', type: '지폐' },
                    { denom: 1000, label: '1천원', type: '지폐' },
                    { denom: 500, label: '500원', type: '동전' },
                    { denom: 100, label: '100원', type: '동전' },
                  ].map(({ denom, label, type }) => {
                    const count = counts[denom] || 0;
                    const subtotal = denom * count;

                    return (
                      <div key={denom} className="bg-black/30 border border-white/10 p-2 rounded-xl">
                        <div className="font-bold text-white/80 mb-1 flex justify-between items-center">
                          <span className="text-white font-bold">{label}</span>
                          <span className="text-[9px] text-surface-dim px-1 py-0.2 bg-white/5 rounded">{type}</span>
                        </div>

                        <div className="flex items-center space-x-1 mb-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(denom, -1)}
                            className="w-5 h-5 rounded-md bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={e => handleCountChange(denom, e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-md py-0.5 text-center text-xs font-bold text-white outline-none focus:border-secondary"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(denom, 1)}
                            className="w-5 h-5 rounded-md bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-[10px] text-right font-mono text-emerald-400/90 truncate">
                          {subtotal.toLocaleString()}원
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <label className="text-xs font-bold text-surface-dim block mb-1">
                  실제 세어본 금고 총 현금 (원):
                </label>
                <input
                  type="text"
                  value={directCashInput}
                  onChange={e => setDirectCashInput(e.target.value)}
                  placeholder="예: 125000"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white outline-none focus:border-secondary"
                />
              </div>
            )}
          </div>

          {/* Section 3: Closing Notes */}
          <div>
            <label className="text-xs font-bold text-surface-dim block mb-1.5">
              3. 마감 특이사항 / 업무 인수인계 메모 (선택사항)
            </label>
            <textarea
              value={closingNote}
              onChange={e => setClosingNote(e.target.value)}
              placeholder="예: 잔돈 부족으로 1,000원권 20장 교환함, 음료수 재고 1박스 입고 확인 등"
              rows={2}
              className="w-full bg-[#090e1c] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder:text-surface-dim/50 outline-none focus:border-secondary resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#090e1c] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors border border-white/10"
            >
              {copiedReport ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">보고서 복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-surface-dim" />
                  <span>마감 보고서 복사</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors border border-white/10"
            >
              <Printer className="w-4 h-4 text-surface-dim" />
              <span>보고서 인쇄</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-surface-dim hover:text-white text-xs font-bold transition-colors"
            >
              닫기
            </button>

            <button
              type="button"
              onClick={handleFinalize}
              className="flex items-center justify-center space-x-2 py-2.5 px-5 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-black shadow-lg shadow-secondary/20 transition-all active:scale-[0.98]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isFinalized ? '마감 내역 재저장' : '일일 영업 마감 확정'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
