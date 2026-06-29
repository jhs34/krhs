import { ClassTimetable } from '../types';

export const DEPARTMENTS = [
  { id: 'railway_operations', name: '철도운영정보과', classes: [1, 2] },
  { id: 'railway_machinery', name: '철도차량기계과', classes: [1] },
  { id: 'railway_electrical', name: '철도전기신호과', classes: [1] }
];

export const GRADES = [1, 2, 3];

// 1학년 철도차량기계과 1반 (Exact standard as in the prompt and snapshot image)
const grade1Machinery1: ClassTimetable = {
  0: { // Mon
    1: { subject: '진로활동', teacher: '장병현' },
    2: { subject: '통합과학1', teacher: '변영석' },
    3: { subject: '음악', teacher: '신유빈' },
    4: { subject: '철도 일반', teacher: '박성윤' },
    5: { subject: '공통영어1', teacher: '안치현' },
    6: { subject: '공통국어1', teacher: '신해균' },
    7: { subject: '미술', teacher: '최인영' }
  },
  1: { // Tue
    1: { subject: '체육1', teacher: '김경구' },
    2: { subject: '철도 일반', teacher: '박성윤' },
    3: { subject: '정보', teacher: '김류아' },
    4: { subject: '공통영어1', teacher: '안치현' },
    5: { subject: '공통수학1', teacher: '최현진' },
    6: { subject: '통합과학1', teacher: '변영석' },
    7: { subject: '기계 제도', teacher: '구창모' }
  },
  2: { // Wed
    1: { subject: '음악', teacher: '신유빈' },
    2: { subject: '공통국어1', teacher: '신해균' },
    3: { subject: '공통영어1', teacher: '안치현' },
    4: { subject: '통합사회1', teacher: '박성윤' },
    5: { subject: '공통수학1', teacher: '김건호' },
    6: { subject: '통합과학1', teacher: '변영석' },
    7: { subject: '기계 일반', teacher: '장병현' }
  },
  3: { // Thu
    1: { subject: '기계 제도', teacher: '구창모' },
    2: { subject: '공통국어1', teacher: '신해균' },
    3: { subject: '체육1', teacher: '김경구' },
    4: { subject: '공통수학1', teacher: '김건호' },
    5: { subject: '미술', teacher: '최인영' },
    6: { subject: '정보', teacher: '조영은' },
    7: { subject: '통합사회1', teacher: '박성윤' }
  },
  4: { // Fri
    1: { subject: '자율·자치 활동', teacher: '장병현' },
    2: { subject: '통합사회1', teacher: '박성윤' },
    3: { subject: '기계 일반', teacher: '장병현' },
    4: { subject: '동아리활동', teacher: '장병현' }
  }
};

// Help construct other dynamic templates
const SUBJECT_POOL = [
  { subject: '공통국어', teacher: '신해균' },
  { subject: '공통수학', teacher: '김건호' },
  { subject: '공통영어', teacher: '안치현' },
  { subject: '통합사회', teacher: '박성윤' },
  { subject: '통합과학', teacher: '변영석' },
  { subject: '체육', teacher: '김경구' },
  { subject: '음악', teacher: '신유빈' },
  { subject: '미술', teacher: '최인영' },
  { subject: '철도 일반', teacher: '박성윤' },
  { subject: '정보', teacher: '김류아' },
  { subject: '기계 제도', teacher: '구창모' },
  { subject: '철도전기일반', teacher: '이지훈' },
  { subject: '철도신호일반', teacher: '윤서준' },
  { subject: '운영기초', teacher: '최민지' },
  { subject: '철도안전', teacher: '정다혜' },
  { subject: '프로그래밍', teacher: '김동우' }
];

export function getDefaultTimetable(grade: number, department: string, classNumber: number): ClassTimetable {
  // Return the specific verified timetable for Grade 1, Machinery, Class 1
  if (grade === 1 && department === 'railway_machinery' && classNumber === 1) {
    return grade1Machinery1;
  }

  // Return empty timetable for other classes as requested
  const emptyTimetables: ClassTimetable = {};
  for (let day = 0; day <= 4; day++) {
    emptyTimetables[day] = {};
  }
  return emptyTimetables;
}
