import { PosCategory, PosItem } from '../types/pos';

export const DEFAULT_POS_CATEGORIES: PosCategory[] = [
  { id: '라면', name: '라면', orderIndex: 1 },
  { id: '한강라면', name: '한강라면', orderIndex: 2 },
  { id: '과자', name: '과자', orderIndex: 3 },
  { id: '간식', name: '간식', orderIndex: 4 },
  { id: '음료수', name: '음료수', orderIndex: 5 },
  { id: '아이스크림', name: '아이스크림', orderIndex: 6 },
];

export const DEFAULT_POS_ITEMS: PosItem[] = [
  // 1. 라면 (10종)
  { id: 'ramen-1', name: '육개장', categoryId: '라면', price: 1000, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'ramen-2', name: '튀김우동(소)', categoryId: '라면', price: 1000, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'ramen-3', name: '너구리(소)', categoryId: '라면', price: 1000, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'ramen-4', name: '불닭볶음면 (일반)', categoryId: '라면', price: 1600, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'ramen-5', name: '불닭볶음면 (까르보)', categoryId: '라면', price: 1600, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'ramen-6', name: '불닭볶음탕면', categoryId: '라면', price: 1600, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'ramen-7', name: '신라면', categoryId: '라면', price: 1600, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'ramen-8', name: '참깨라면', categoryId: '라면', price: 1600, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'ramen-9', name: '사천 짜파게티', categoryId: '라면', price: 1600, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'ramen-10', name: '크림진짬뽕', categoryId: '라면', price: 1600, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },

  // 2. 한강라면 (4종)
  { id: 'hangang-1', name: '짜파게티', categoryId: '한강라면', price: 2500, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'hangang-2', name: '안성탕면', categoryId: '한강라면', price: 2500, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'hangang-3', name: '너구리', categoryId: '한강라면', price: 2500, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'hangang-4', name: '삼양라면', categoryId: '한강라면', price: 2500, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },

  // 3. 과자 (8종)
  { id: 'snack-1', name: '쫄병', categoryId: '과자', price: 1200, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'snack-2', name: '꼬북칩', categoryId: '과자', price: 1200, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'snack-3', name: '칸쵸', categoryId: '과자', price: 1200, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'snack-4', name: '초코송이', categoryId: '과자', price: 1200, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'snack-5', name: '도리토스', categoryId: '과자', price: 1500, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'snack-6', name: '홈런볼', categoryId: '과자', price: 1500, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'snack-7', name: '허니버터칩', categoryId: '과자', price: 1500, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'snack-8', name: '치토스', categoryId: '과자', price: 1500, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },

  // 4. 간식 (3종)
  { id: 'treat-1', name: '만두 (김치)', categoryId: '간식', price: 1700, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'treat-2', name: '만두 (고기)', categoryId: '간식', price: 1700, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'treat-3', name: '핫바', categoryId: '간식', price: 1200, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },

  // 5. 음료수 (7종)
  { id: 'drink-1', name: '코코팜', categoryId: '음료수', price: 1200, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'drink-2', name: '포카리', categoryId: '음료수', price: 1200, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'drink-3', name: '파워에이드', categoryId: '음료수', price: 1200, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'drink-4', name: '환타', categoryId: '음료수', price: 1200, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'drink-5', name: '허쉬초콜릿드링크', categoryId: '음료수', price: 1300, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'drink-6', name: '스프라이트', categoryId: '음료수', price: 1400, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
  { id: 'drink-7', name: '코카콜라', categoryId: '음료수', price: 1400, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },

  // 6. 아이스크림 (1종)
  { id: 'icecream-1', name: '빠삐코', categoryId: '아이스크림', price: 800, isSoldOut: false, totalSold: 0, isFavorite: false, isActive: true },
];
