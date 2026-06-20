export interface AcademicEvent {
  id: string;
  date: Date;
  endDate?: Date;
  title: string;
  description: string;
  color?: string;
  isHoliday?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface TimetableMemo {
  id: string; // e.g., `${grade}_${department}_${classNumber}_${weekStart}_${dayOfWeek}_${period}`
  grade: number; // 1, 2, 3
  department: string; // e.g., 'railway_operations' | 'railway_machinery' | 'railway_electrical'
  classNumber: number; // 1 | 2
  weekStart: string; // 'YYYY-MM-DD' representing Monday of that week
  dayOfWeek: number; // 0 (Mon) ~ 4 (Fri)
  period: number; // 1 ~ 7
  memo: string; // performance assessment or special note
  createdAt: string;
}

export interface PeriodSlot {
  subject: string;
  teacher: string;
}

export interface ClassTimetable {
  [dayOfWeek: number]: { // 0 (Mon) ~ 4 (Fri)
    [period: number]: PeriodSlot; // 1 ~ 7
  };
}

export interface TimetableTemplate {
  id: string; // `${grade}_${department}_${classNumber}`
  grade: number;
  department: string;
  classNumber: number;
  rawTimetable: string; // contains ClassTimetable stringified
  updatedAt?: string;
}


