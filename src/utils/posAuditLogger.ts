import { PosLogAction, PosLogSeverity, PosLogCategory } from '../types/pos';

/**
 * Generate standard POS Audit Log ID
 * Format: [PREFIX]-[YYYYMMDD]-[HHMMSS]-[SSS]
 * e.g., PAY-20261021-193722-482, SXX-20261021-213010-015
 */
export function generateAuditLogId(action: PosLogAction, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');

  const prefix = (action || 'PAY').slice(0, 3).toUpperCase();
  return `${prefix}-${y}${m}${d}-${hh}${mm}${ss}-${ms}`;
}

/**
 * Resolve severity and human action title from 3-letter action code
 */
export function resolveLogMetadata(action: PosLogAction): {
  actionTitle: string;
  category: PosLogCategory;
  severity: PosLogSeverity;
} {
  switch (action) {
    // 결제 (Payment)
    case 'PAY':
      return { actionTitle: '결제 완료', category: 'SALE', severity: 'INFO' };
    case 'PCA':
      return { actionTitle: '현금 결제 완료', category: 'SALE', severity: 'INFO' };
    case 'PTR':
      return { actionTitle: '계좌이체 결제 완료', category: 'SALE', severity: 'INFO' };
    case 'PCC':
      return { actionTitle: '결제 취소 (환불/재고복원)', category: 'SALE', severity: 'WARN' };
    case 'PUP':
      return { actionTitle: '결제 정보 수정', category: 'SALE', severity: 'INFO' };
    case 'PDL':
      return { actionTitle: '매출 내역 삭제', category: 'SALE', severity: 'CRITICAL' };

    // 재고/상품 (Inventory)
    case 'ICR':
      return { actionTitle: '상품 신규 등록', category: 'INVENTORY', severity: 'INFO' };
    case 'IUP':
      return { actionTitle: '상품 정보/재고 수정', category: 'INVENTORY', severity: 'INFO' };
    case 'IMU':
      return { actionTitle: '상품 일괄 저장', category: 'INVENTORY', severity: 'INFO' };
    case 'IDL':
      return { actionTitle: '상품 삭제', category: 'INVENTORY', severity: 'WARN' };

    // 카테고리 (Category)
    case 'CCR':
      return { actionTitle: '카테고리 추가', category: 'INVENTORY', severity: 'INFO' };
    case 'CUP':
      return { actionTitle: '카테고리 수정', category: 'INVENTORY', severity: 'INFO' };
    case 'CMU':
      return { actionTitle: '카테고리 일괄 저장', category: 'INVENTORY', severity: 'INFO' };
    case 'CDL':
      return { actionTitle: '카테고리 삭제', category: 'INVENTORY', severity: 'WARN' };

    // 프리셋 (Preset)
    case 'PSA':
      return { actionTitle: '메뉴 프리셋 적용', category: 'INVENTORY', severity: 'WARN' };
    case 'PSC':
      return { actionTitle: '새 프리셋 등록', category: 'INVENTORY', severity: 'INFO' };
    case 'PSO':
      return { actionTitle: '프리셋 내용 갱신 (덮어쓰기)', category: 'INVENTORY', severity: 'INFO' };
    case 'PSU':
      return { actionTitle: '프리셋 정보 수정', category: 'INVENTORY', severity: 'INFO' };
    case 'PSD':
      return { actionTitle: '프리셋 삭제', category: 'INVENTORY', severity: 'WARN' };

    // 기프티콘 (Gifticon)
    case 'GCR':
      return { actionTitle: '기프티콘 개별 등록', category: 'GIFTICON', severity: 'INFO' };
    case 'GMC':
      return { actionTitle: '기프티콘 일괄 등록', category: 'GIFTICON', severity: 'INFO' };
    case 'GUS':
      return { actionTitle: '기프티콘 결제 사용', category: 'GIFTICON', severity: 'INFO' };
    case 'GRT':
      return { actionTitle: '기프티콘 미사용 복원', category: 'GIFTICON', severity: 'INFO' };
    case 'GUP':
      return { actionTitle: '기프티콘 정보/상태 수정', category: 'GIFTICON', severity: 'WARN' };
    case 'GDL':
      return { actionTitle: '기프티콘 삭제', category: 'GIFTICON', severity: 'CRITICAL' };

    // 정산 (Settlement)
    case 'SOO':
      return { actionTitle: '마감 정산 정상 완료 (일치)', category: 'SETTLEMENT', severity: 'INFO' };
    case 'SXX':
      return { actionTitle: '마감 정산 불일치 경고 (오차)', category: 'SETTLEMENT', severity: 'CRITICAL' };
    case 'SUP':
      return { actionTitle: '마감 일지 수정', category: 'SETTLEMENT', severity: 'WARN' };
    case 'SDL':
      return { actionTitle: '마감 일지 삭제', category: 'SETTLEMENT', severity: 'CRITICAL' };

    // 계정 (Auth)
    case 'ALI':
      return { actionTitle: '근무자/관리자 로그인', category: 'AUTH', severity: 'INFO' };
    case 'ALO':
      return { actionTitle: '로그아웃 / 영업 종료', category: 'AUTH', severity: 'INFO' };

    // 시스템 (System)
    case 'XRS':
      return { actionTitle: 'POS 데이터 전체 초기화', category: 'SYSTEM', severity: 'CRITICAL' };

    default:
      return { actionTitle: '시스템 활동', category: 'SYSTEM', severity: 'INFO' };
  }
}
