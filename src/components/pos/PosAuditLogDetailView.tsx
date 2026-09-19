import React, { useState } from 'react';
import {
  Clock,
  User,
  Tag,
  Activity,
  ArrowRight,
  Boxes,
  ShoppingBag,
  Calculator,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Coins,
  CreditCard,
  Receipt,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronUp,
  Code2,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Check,
  Copy,
} from 'lucide-react';
import { PosAuditLog, PosItemChangeDetail, PosLogCategory } from '../../types/pos';

interface PosAuditLogDetailViewProps {
  log: PosAuditLog;
}

export const PosAuditLogDetailView: React.FC<PosAuditLogDetailViewProps> = ({ log }) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatFullDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      return `${year}년 ${month}월 ${day}일 ${hours}:${mins}:${secs}`;
    } catch {
      return iso;
    }
  };

  const getRelativeTime = (iso: string) => {
    try {
      const now = new Date();
      const past = new Date(iso);
      const diffMs = now.getTime() - past.getTime();
      if (diffMs < 0) return '방금 전';
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return `${diffSecs}초 전`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}분 전`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}시간 전`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}일 전`;
    } catch {
      return '';
    }
  };

  const getCategoryInfo = (cat: PosLogCategory) => {
    switch (cat) {
      case 'INVENTORY':
        return {
          name: '재고/품목 관리',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Boxes,
        };
      case 'SALE':
        return {
          name: '판매/결제 내역',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: ShoppingBag,
        };
      case 'SETTLEMENT':
        return {
          name: '정산/마감 내역',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Calculator,
        };
      case 'SYSTEM':
        return {
          name: '시스템 설정',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Settings,
        };
      case 'AUTH':
        return {
          name: '계정/인증',
          bg: 'bg-slate-50 text-slate-700 border-slate-300',
          icon: ShieldCheck,
        };
      default:
        return {
          name: '기타 활동',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: Activity,
        };
    }
  };

  const catInfo = getCategoryInfo(log.category);
  const meta = log.metadata || {};
  const itemChanges: PosItemChangeDetail[] = Array.isArray(meta.itemChanges) ? meta.itemChanges : [];

  return (
    <div className="bg-slate-50 border-t border-slate-200/90 text-slate-800 p-3.5 sm:p-5 flex flex-col gap-4 text-xs font-sans">
      {/* 1. 핵심 감사 지표 (일시 / 작업자 / 업무 분류 / 활동 내용) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 일시 (Timestamp) */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>기록 일시 (Timestamp)</span>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs font-mono">
              {formatFullDateTime(log.timestamp)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                {getRelativeTime(log.timestamp)}
              </span>
              {log.sessionId && (
                <span className="text-slate-400 font-mono text-[10px]">
                  세션 #{log.sessionId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 작업자 (Operator / Actor) */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] mb-1">
            <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>작업 담당자 (Actor)</span>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
              <span>{log.actorName || '시스템'}</span>
              {log.actorName.includes('관리자') && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  관리자 권한
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">
              {log.actorUid ? `UID: ${log.actorUid.slice(0, 12)}...` : 'POS 인증 계정'}
            </div>
          </div>
        </div>

        {/* 업무 분류 (Category) */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] mb-1">
            <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>업무 영역 (Category)</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs border ${catInfo.bg}`}>
                <catInfo.icon className="w-3.5 h-3.5" />
                {catInfo.name}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              분류 코드: {log.category}
            </div>
          </div>
        </div>

        {/* 활동 내용 (Action) */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] mb-1">
            <Activity className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>작업 활동 (Action)</span>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs truncate" title={log.actionTitle}>
              {log.actionTitle}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              ACTION: {log.action}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 세부 처리 내역 및 변경 사항 (Details & Metadata) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-3.5 sm:px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-900 text-xs sm:text-sm">
              상세 변경 내역 및 작업 요약 (Details & Changes)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            작업 요약: {log.details}
          </span>
        </div>

        <div className="p-3.5 sm:p-4">
          {/* CASE 1: 상품 재고/정보 일괄 저장 (itemChanges가 있는 경우) */}
          {itemChanges.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pb-1.5 border-b border-slate-100">
                <span>총 <strong className="text-blue-600 font-bold">{itemChanges.length}개</strong> 품목의 세부 수정 내역:</span>
                {meta.categoriesModified && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                    카테고리 구성 변경 포함됨
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {itemChanges.map((change, idx) => (
                  <div
                    key={`${change.itemId}-${idx}`}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {change.itemName}
                        </span>
                        {change.categoryName && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-medium">
                            {change.categoryName}
                          </span>
                        )}
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        change.changeType === 'CREATED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : change.changeType === 'STOCK'
                          ? 'bg-blue-100 text-blue-800'
                          : change.changeType === 'PRICE'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}>
                        {change.changeType === 'CREATED'
                          ? '신규 등록'
                          : change.changeType === 'STOCK'
                          ? '재고 변동'
                          : change.changeType === 'PRICE'
                          ? '가격 변동'
                          : '정보 변경'}
                      </span>
                    </div>

                    {/* Diffs List */}
                    {change.diffs && change.diffs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {change.diffs.map((diff, dIdx) => {
                          const isStock = diff.field === 'stock';
                          const isPrice = diff.field === 'price';
                          return (
                            <div
                              key={dIdx}
                              className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <span className="text-slate-500 font-medium shrink-0">
                                {diff.label}
                              </span>
                              <div className="flex items-center gap-1.5 font-mono font-medium">
                                <span className="text-slate-400 line-through text-[11px]">
                                  {String(diff.from)}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className={`font-bold ${
                                  isStock
                                    ? 'text-blue-700'
                                    : isPrice
                                    ? 'text-purple-700'
                                    : 'text-slate-900'
                                }`}>
                                  {String(diff.to)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                        {change.summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CASE 2: 구버전 품목 일괄 저장 로그 (itemChanges가 없지만 count나 itemNames가 있는 경우) */}
          {itemChanges.length === 0 && (log.action === 'ITEM_UPDATED' || log.action === 'STOCK_ADJUSTED') && (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  <span>상품 변경 내역 ({meta.count ? `${meta.count}건` : '수정 완료'})</span>
                </div>
                <p className="text-xs text-slate-700">
                  {log.details}
                </p>
                {meta.itemNames && Array.isArray(meta.itemNames) && (
                  <div className="mt-1">
                    <span className="text-[11px] text-slate-500 font-medium">변경된 주요 상품:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {meta.itemNames.map((name: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-800 text-xs font-medium">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {meta.patch && typeof meta.patch === 'object' && (
                  <div className="mt-1 bg-white p-2.5 rounded-lg border border-blue-100 flex flex-wrap gap-2 text-xs">
                    {Object.entries(meta.patch).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1">
                        <span className="text-slate-500">{k}:</span>
                        <strong className="text-slate-900 font-mono">{String(v)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASE 3: 결제 완료 (ORDER_CREATED) */}
          {log.action === 'ORDER_CREATED' && (
            <div className="flex flex-col gap-3">
              <div className={`grid grid-cols-1 ${meta.buyerName ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2.5`}>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col">
                  <span className="text-[11px] text-emerald-700 font-semibold">결제 수단</span>
                  <span className="text-base font-bold text-emerald-950 mt-0.5 flex items-center gap-1.5">
                    {meta.paymentMethod === 'TRANSFER' ? (
                      <>
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>계좌이체</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4 text-emerald-600" />
                        <span>현금 결제</span>
                      </>
                    )}
                  </span>
                </div>
                {meta.buyerName && (
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col">
                    <span className="text-[11px] text-blue-700 font-semibold">결제자 이름</span>
                    <span className="text-base font-bold text-blue-950 mt-0.5 truncate">
                      {meta.buyerName}
                    </span>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col">
                  <span className="text-[11px] text-emerald-700 font-semibold">총 결제 금액</span>
                  <span className="text-base font-bold text-emerald-950 mt-0.5 font-mono">
                    {typeof meta.totalAmount === 'number' ? `${meta.totalAmount.toLocaleString()}원` : '-'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col">
                  <span className="text-[11px] text-emerald-700 font-semibold">주문 번호</span>
                  <span className="text-xs font-mono text-emerald-900 mt-1 font-bold truncate">
                    #{meta.orderId ? meta.orderId.slice(-8) : '-'}
                  </span>
                </div>
              </div>

              {meta.memo && (
                <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs flex items-start gap-2">
                  <span className="font-bold text-amber-900 shrink-0">주문 메모:</span>
                  <span className="text-amber-800 break-words">{meta.memo}</span>
                </div>
              )}

              {/* Items List */}
              {Array.isArray(meta.items) && meta.items.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden mt-1">
                  <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>구매 품목 내역 (총 {meta.itemsCount || meta.items.length}개)</span>
                    <span>수량 및 소계</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {meta.items.map((it: any, i: number) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50">
                        <span className="font-medium text-slate-900">{it.name}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500">{it.count}개</span>
                          <span className="text-slate-400">×</span>
                          <span className="text-slate-600">{Number(it.price || 0).toLocaleString()}원</span>
                          <span className="font-bold text-slate-900 ml-1">
                            = {Number((it.price || 0) * (it.count || 1)).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CASE 4: 결제 취소 / 환불 (ORDER_CANCELLED) */}
          {log.action === 'ORDER_CANCELLED' && (
            <div className="flex flex-col gap-3">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    주문 결제 취소 및 환불 처리
                  </span>
                  <span className="text-sm font-bold text-rose-700 font-mono">
                    환불액: {typeof meta.refundAmount === 'number' ? `${meta.refundAmount.toLocaleString()}원` : '-'}
                  </span>
                </div>
                <div className="text-xs text-rose-800 bg-white/80 p-2.5 rounded-lg border border-rose-200">
                  <strong>취소 사유:</strong> {meta.cancelReason || '고객 요청 / 단순 변심'}
                </div>
                {Array.isArray(meta.restoredItems) && meta.restoredItems.length > 0 && (
                  <div className="text-xs text-rose-700">
                    <span className="font-semibold">재고 자동 복원 품목:</span>{' '}
                    {meta.restoredItems.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CASE 5: 일일 마감 정산 (SETTLEMENT_CLOSED / SETTLEMENT_OPENED) */}
          {(log.action === 'SETTLEMENT_CLOSED' || log.action === 'SETTLEMENT_OPENED') && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-700 font-semibold">준비금</span>
                  <div className="text-xs font-bold text-purple-950 font-mono mt-0.5">
                    {Number(meta.initialCash || 0).toLocaleString()}원
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-700 font-semibold">총 매출액</span>
                  <div className="text-xs font-bold text-purple-950 font-mono mt-0.5">
                    {Number(meta.totalSales || 0).toLocaleString()}원
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-700 font-semibold">현금 실사액</span>
                  <div className="text-xs font-bold text-purple-950 font-mono mt-0.5">
                    {Number(meta.actualCashInput || 0).toLocaleString()}원
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-700 font-semibold">현금 오차</span>
                  <div className={`text-xs font-bold font-mono mt-0.5 ${
                    Number(meta.discrepancy || 0) === 0
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}>
                    {Number(meta.discrepancy || 0) === 0
                      ? '0원 (일치)'
                      : `${Number(meta.discrepancy || 0).toLocaleString()}원 차이`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CASE 6: 메뉴 프리셋 적용 (PRESET_APPLIED) */}
          {log.action === 'PRESET_APPLIED' && (
            <div className="flex flex-col gap-3">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    프리셋 명: [{meta.presetName || '메뉴 프리셋'}]
                  </span>
                  {meta.presetId && (
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300">
                      프리셋 ID: {meta.presetId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CASE 7: 기타 기본 메타데이터 테이블 (위의 특정 케이스에 안 걸리는 경우) */}
          {itemChanges.length === 0 &&
            log.action !== 'ITEM_UPDATED' &&
            log.action !== 'STOCK_ADJUSTED' &&
            log.action !== 'ORDER_CREATED' &&
            log.action !== 'ORDER_CANCELLED' &&
            log.action !== 'SETTLEMENT_CLOSED' &&
            log.action !== 'SETTLEMENT_OPENED' &&
            log.action !== 'PRESET_APPLIED' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <div className="text-xs font-semibold text-slate-700">
                  {log.details || '추가 세부 정보 없음'}
                </div>
                {Object.keys(meta).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {Object.entries(meta).map(([key, val]) => (
                      <div key={key} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-mono text-[11px]">{key}</span>
                        <span className="font-bold text-slate-900 font-mono text-[11px] truncate max-w-[200px]">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* 3. 감사 로그 원문 데이터 (Raw JSON) */}
      <div className="pt-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 font-mono transition-colors cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-400" />
            <span>감사 로그 원문 데이터 (Raw JSON) {showRawJson ? '접기' : '펼치기'}</span>
            {showRawJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showRawJson && (
            <button
              type="button"
              onClick={() => {
                const fullLogData = {
                  id: log.id,
                  timestamp: log.timestamp,
                  action: log.action,
                  actionTitle: log.actionTitle,
                  category: log.category,
                  actorName: log.actorName,
                  actorUid: log.actorUid,
                  details: log.details,
                  sessionId: log.sessionId,
                  metadata: log.metadata || {},
                };
                navigator.clipboard.writeText(JSON.stringify(fullLogData, null, 2));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 rounded transition-colors font-medium cursor-pointer"
              title="클립보드에 JSON 복사"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">복사 완료</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-500" />
                  <span>JSON 복사</span>
                </>
              )}
            </button>
          )}
        </div>

        {showRawJson && (
          <div className="mt-2 relative">
            <pre className="whitespace-pre-wrap overflow-x-auto text-[10px] leading-relaxed text-blue-300 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono shadow-inner max-h-96">
              {JSON.stringify(
                {
                  id: log.id,
                  timestamp: log.timestamp,
                  action: log.action,
                  actionTitle: log.actionTitle,
                  category: log.category,
                  actorName: log.actorName,
                  actorUid: log.actorUid,
                  details: log.details,
                  sessionId: log.sessionId,
                  metadata: log.metadata || {},
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
