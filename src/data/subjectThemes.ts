export const SUBJECT_THEMES: { [key: string]: { hex: string; name: string; reason: string } } = {
  '국어': { hex: '#800020', name: '국어', reason: '원고지와 고전 문학의 깊이감, 차분한 텍스트 몰입' },
  '사회': { hex: '#C05A46', name: '사회', reason: '지리, 역사, 인간 사회를 품는 따뜻한 대지의 색' },
  '체육': { hex: '#FF6B35', name: '체육', reason: '신체 활동의 폭발적인 에너지와 역동성' },
  '기계일반': { hex: '#E5A93B', name: '기계일반', reason: '중장비와 기어 등 기계 시스템의 강력한 동력' },
  '미술': { hex: '#FFD700', name: '미술', reason: '캔버스 위에 펼쳐지는 시각적 창의성과 다채로운 스펙트럼' },
  '과학': { hex: '#1E4620', name: '과학', reason: '자연과학, 생명력, 실험실의 탐구심과 신비로움' },
  '정보': { hex: '#008080', name: '정보', reason: '코딩 화면과 테크놀로지가 주는 미래지향적 감성' },
  '철도': { hex: '#4682B4', name: '철도일반', reason: '끝없이 뻗어 나가는 철길과 기차의 단단한 금속성' },
  '제도': { hex: '#004B87', name: '기계제도', reason: '정밀한 CAD 도면과 청사진, 오차 없는 설계선' },
  '기계제도': { hex: '#004B87', name: '기계제도', reason: '정밀한 CAD 도면과 청사진, 오차 없는 설계선' },
  '수학': { hex: '#1B365D', name: '수학', reason: '오차 없는 냉철한 이성과 명확한 논리 구조' },
  '영어': { hex: '#7B68EE', name: '영어', reason: '글로벌 감각과 현대적이고 세련된 언어적 스펙트럼' },
  '음악': { hex: '#D4A5A5', name: '음악', reason: '선율의 부드러움과 리드미컬한 예술적 영감' },
};

export const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex) return `rgba(255, 255, 255, ${alpha})`;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getSubjectDefaultColor = (subject: string): string | null => {
  if (!subject) return null;
  for (const key of Object.keys(SUBJECT_THEMES)) {
    if (subject.includes(key)) {
      return SUBJECT_THEMES[key].hex;
    }
  }
  return null;
};
