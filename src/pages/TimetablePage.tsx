import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit2
} from 'lucide-react';
import { DEPARTMENTS, GRADES, getDefaultTimetable } from '../data/timetableTemplates';
import { SUBJECT_THEMES, hexToRgba } from '../data/subjectThemes';
import { subscribeToTimetableMemos, saveTimetableMemo, deleteTimetableMemo, subscribeToTimetableTemplates } from '../services/firestore';
import { TimetableMemo, ClassTimetable } from '../types';
import { EASE_OUT_EXPO, MODAL_BACKDROP_TRANSITION, MODAL_PANEL_TRANSITION, NAV_SPRING_TRANSITION, PORTAL_CARD_TRANSITION, PORTAL_HEADER_TRANSITION } from '../utils/motion';

interface TimetablePageProps {
  isAdmin: boolean;
}

export { SUBJECT_THEMES, hexToRgba };

type TimetableTransitionMode = 'forward' | 'backward' | 'filter';

const slideVariants = {
  enter: (dir: TimetableTransitionMode) => ({
    x: dir === 'filter' ? 0 : dir === 'forward' ? 22 : -22,
    y: dir === 'filter' ? 6 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    y: 0,
    opacity: 1,
  },
  exit: (dir: TimetableTransitionMode) => ({
    x: dir === 'filter' ? 0 : dir === 'forward' ? -22 : 22,
    y: dir === 'filter' ? -4 : 0,
    opacity: 0,
  }),
};

const dayOfWeekNames = ['월', '화', '수', '목', '금'];

export default function TimetablePage({ isAdmin }: TimetablePageProps) {
  // 1. Selector States
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [selectedDept, setSelectedDept] = useState<string>('railway_machinery');
  const [selectedClass, setSelectedClass] = useState<number>(1);

  // 2. Week Date States
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    return isNaN(d.getTime()) ? new Date('2026-06-20') : d;
  });

  // 3. Timetable Memos State from Firestore
  const [memos, setMemos] = useState<TimetableMemo[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{
    dayOfWeek: number;
    period: number;
    subject: string;
    existingMemo: string;
    existingColor?: string;
  } | null>(null);
  const [memoInput, setMemoInput] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // 4. Timetable templates from Firestore
  const [templates, setTemplates] = useState<any[]>([]);
  const [viewingMemo, setViewingMemo] = useState<{
    dayOfWeek: number;
    period: number;
    subject: string;
    teacher: string;
    memo: string;
  } | null>(null);

  const [animationDirection, setAnimationDirection] = useState<TimetableTransitionMode>('filter');

  // Auto-lock class choice if the department only has 1 class
  useEffect(() => {
    const deptInfo = DEPARTMENTS.find(d => d.id === selectedDept);
    if (deptInfo && !deptInfo.classes.includes(selectedClass)) {
      setSelectedClass(deptInfo.classes[0]);
    }
  }, [selectedDept, selectedClass]);

  // Subscribe to timetable memos
  useEffect(() => {
    const unsubscribe = subscribeToTimetableMemos((fetchedMemos) => {
      setMemos(fetchedMemos);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to timetable templates
  useEffect(() => {
    const unsubscribe = subscribeToTimetableTemplates((fetchedTemplates) => {
      setTemplates(fetchedTemplates);
    });
    return () => unsubscribe();
  }, []);

  // Helper: Get Monday of a key date
  const getMonday = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const mondayDate = getMonday(currentDate);

  // Get date for Monday ~ Friday
  const getDaysOfThisWeek = (): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const nextDay = new Date(mondayDate);
      nextDay.setDate(mondayDate.getDate() + i);
      days.push(nextDay);
    }
    return days;
  };

  const weekDays = getDaysOfThisWeek();

  // Highlight current day if it falls in the current week
  const isCurrentDay = (dayDate: Date): boolean => {
    const today = new Date();
    return today.getFullYear() === dayDate.getFullYear() &&
           today.getMonth() === dayDate.getMonth() &&
           today.getDate() === dayDate.getDate();
  };

  // Format date to string helpers
  const formatWeekRangeString = (): string => {
    const start = weekDays[0];
    const end = weekDays[4];
    return `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')} ~ ${end.getFullYear()}.${String(end.getMonth() + 1).padStart(2, '0')}.${String(end.getDate()).padStart(2, '0')}`;
  };

  const formatDateKey = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDisplayDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  };

  const formatMonthDay = (date: Date): string => {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${mm}.${dd}`;
  };

  const weekStartKey = formatDateKey(mondayDate);
  const weekStartDisplay = formatDisplayDate(mondayDate);

  // Time Slot mapping
  const getPeriodTime = (dayOfWeek: number, period: number): string => {
    if (dayOfWeek === 4) { // Friday
      switch (period) {
        case 1: return '08:40 ~ 09:30';
        case 2: return '09:40 ~ 10:30';
        case 3: return '10:40 ~ 11:30';
        case 4: return '11:40 ~ 12:30';
        default: return '';
      }
    } else { // Monday ~ Thursday
      switch (period) {
        case 1: return '09:00 ~ 09:50';
        case 2: return '10:00 ~ 10:50';
        case 3: return '11:00 ~ 11:50';
        case 4: return '13:00 ~ 13:50';
        case 5: return '14:00 ~ 14:50';
        case 6: return '15:00 ~ 15:50';
        case 7: return '16:00 ~ 16:50';
        default: return '';
      }
    }
  };

  // Move week backward
  const handlePrevWeek = () => {
    setAnimationDirection('backward');
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 7);
    setCurrentDate(prev);
  };

  // Move week forward
  const handleNextWeek = () => {
    setAnimationDirection('forward');
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  // Reset to today's week
  const handleResetToToday = () => {
    const today = new Date();
    const diff = today.getTime() - currentDate.getTime();
    setAnimationDirection(diff >= 0 ? 'forward' : 'backward');
    setCurrentDate(today);
  };

  // Retrieve base timetable from Firestore database template or static fallback
  const baseTimetable = useMemo(() => {
    const defaultData = getDefaultTimetable(selectedGrade, selectedDept, selectedClass);
    const match = templates.find(
      (t) =>
        t.grade === selectedGrade &&
        t.department === selectedDept &&
        t.classNumber === selectedClass
    );
    if (match) {
      try {
        const parsed = JSON.parse(match.rawTimetable) as ClassTimetable;
        const result: ClassTimetable = {};
        for (let d = 0; d <= 4; d++) {
          result[d] = {};
          const maxPeriod = d === 4 ? 4 : 7;
          for (let p = 1; p <= maxPeriod; p++) {
            const parsedSlot = parsed[d]?.[p];
            if (parsedSlot && parsedSlot.subject && parsedSlot.subject.trim() !== '') {
              result[d][p] = {
                subject: parsedSlot.subject.trim(),
                teacher: (parsedSlot.teacher || '').trim()
              };
            }
          }
        }
        return result;
      } catch (e) {
        console.error('Failed to parse rawTimetable from template DB', e);
      }
    }
    return defaultData;
  }, [templates, selectedGrade, selectedDept, selectedClass]);

  // Check if base timetable is completely empty (no subjects defined)
  const isTimetableEmpty = useMemo(() => {
    for (let day = 0; day <= 4; day++) {
      const daySlots = baseTimetable[day];
      if (daySlots) {
        for (const period of Object.keys(daySlots)) {
          const slot = daySlots[parseInt(period)];
          if (slot && slot.subject && slot.subject.trim() !== '') {
            return false;
          }
        }
      }
    }
    return true;
  }, [baseTimetable]);

  // Find memo override for specific day and period
  const getMemoForSlot = (dayIdx: number, periodNum: number): TimetableMemo | undefined => {
    const compositeId = `${selectedGrade}_${selectedDept}_${selectedClass}_${weekStartKey}_${dayIdx}_${periodNum}`;
    return memos.find(m => m.id === compositeId);
  };

  // Open memo editor
  const handleOpenEditMemo = (dayIdx: number, periodNum: number, subjectName: string) => {
    const existing = getMemoForSlot(dayIdx, periodNum);
    setEditingSlot({
      dayOfWeek: dayIdx,
      period: periodNum,
      subject: subjectName,
      existingMemo: existing?.memo || '',
      existingColor: existing?.color || ''
    });
    setMemoInput(existing?.memo || '');
    setSelectedColor(existing?.color || '');
    setIsEditModalOpen(true);
  };

  // Save memo override
  const handleSaveMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    const compositeId = `${selectedGrade}_${selectedDept}_${selectedClass}_${weekStartKey}_${editingSlot.dayOfWeek}_${editingSlot.period}`;

    if (memoInput.trim() === '' && !selectedColor) {
      await deleteTimetableMemo(compositeId);
    } else {
      const dataToSave: any = {
        id: compositeId,
        grade: selectedGrade,
        department: selectedDept,
        classNumber: selectedClass,
        weekStart: weekStartKey,
        dayOfWeek: editingSlot.dayOfWeek,
        period: editingSlot.period,
        memo: memoInput.trim(),
      };
      if (selectedColor) {
        dataToSave.color = selectedColor;
      }
      await saveTimetableMemo(dataToSave);
    }

    setIsEditModalOpen(false);
    setEditingSlot(null);
    setMemoInput('');
    setSelectedColor('');
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-3.5 sm:px-12 md:px-16 lg:px-24 xl:px-32">
      
      {/* 1. Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={PORTAL_HEADER_TRANSITION}
        className="mb-6 sm:mb-8"
      >
        <h1 className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl tracking-tight text-white mb-2 leading-[1.2] text-balance">
          주간 학급별 시간표
        </h1>
        <p className="text-sm sm:text-base text-surface-dim leading-relaxed font-sans max-w-2xl break-keep">
          학과·반별 주간 수업 시간표 및 수행평가·변동 메모 조회
        </p>
      </motion.div>

      {/* 2. Filters & Selection Card */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.03 }}
        className="bg-[#0a1120] border border-white/[0.08] p-4 sm:p-5 rounded-2xl mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          
          {/* Grade Select */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-surface-dim pl-0.5">학년</label>
            <div className="grid grid-cols-3 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]" id="grade-selector">
              {GRADES.map(g => {
                const isActive = selectedGrade === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      if (selectedGrade !== g) {
                        setAnimationDirection('filter');
                        setSelectedGrade(g);
                      }
                    }}
                    className={`relative py-1.5 rounded-lg text-xs font-semibold transition-colors text-center cursor-pointer whitespace-nowrap ${
                      isActive ? 'text-white' : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="timetable-grade-pill"
                        transition={NAV_SPRING_TRANSITION}
                        className="absolute inset-0 bg-white/[0.14] rounded-lg border border-white/10"
                      />
                    )}
                    <span className="relative z-10">{g}학년</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department Select */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-surface-dim pl-0.5 font-sans">학과</label>
            <div className="grid grid-cols-3 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]" id="dept-selector">
              {DEPARTMENTS.map(dept => {
                const isActive = selectedDept === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      if (selectedDept !== dept.id) {
                        setAnimationDirection('filter');
                        setSelectedDept(dept.id);
                      }
                    }}
                    className={`relative py-1.5 rounded-lg text-xs font-semibold transition-colors text-center px-1 truncate cursor-pointer ${
                      isActive ? 'text-white' : 'text-surface-dim hover:text-white'
                    }`}
                    title={dept.name}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="timetable-dept-pill"
                        transition={NAV_SPRING_TRANSITION}
                        className="absolute inset-0 bg-white/[0.14] rounded-lg border border-white/10"
                      />
                    )}
                    <span className="relative z-10">{dept.name.replace('철도', '')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Select */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-surface-dim pl-0.5">배정 반</label>
            <div className="grid grid-cols-2 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]" id="class-selector">
              {[1, 2].map(c => {
                const totalClasses = DEPARTMENTS.find(d => d.id === selectedDept)?.classes || [1];
                const isAvailable = totalClasses.includes(c);
                const isActive = isAvailable && selectedClass === c;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => {
                      if (isAvailable && selectedClass !== c) {
                        setAnimationDirection('filter');
                        setSelectedClass(c);
                      }
                    }}
                    className={`relative py-1.5 rounded-lg text-xs font-semibold transition-colors text-center whitespace-nowrap ${
                      !isAvailable 
                        ? 'opacity-25 cursor-not-allowed text-white/20'
                        : isActive 
                          ? 'text-white cursor-pointer' 
                          : 'text-surface-dim hover:text-white cursor-pointer'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="timetable-class-pill"
                        transition={NAV_SPRING_TRANSITION}
                        className="absolute inset-0 bg-white/[0.14] rounded-lg border border-white/10"
                      />
                    )}
                    <span className="relative z-10">{c}반</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </motion.div>

      {/* 3. Week Navigation & Range */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.06 }}
        className="flex items-center justify-between gap-2 py-2 px-0.5 sm:px-1 mb-3"
      >
        <span className="text-xs sm:text-sm md:text-base font-semibold text-white font-mono tabular-nums whitespace-nowrap">
          {formatWeekRangeString()}
        </span>

        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-lg border border-white/10 bg-white/[0.04] text-surface-dim hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
            title="이전 주"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleResetToToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.1] transition-colors cursor-pointer whitespace-nowrap"
          >
            이번 주
          </button>

          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg border border-white/10 bg-white/[0.04] text-surface-dim hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
            title="다음 주"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* 4. Timetable Grid View */}
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.08 }}
        className="w-full rounded-2xl border border-white/[0.08] bg-[#0a1120] overflow-hidden"
      >
        {isTimetableEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center min-h-[360px]">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5">기본 시간표 준비 중</h3>
            <p className="text-sm text-surface-dim max-w-md break-keep leading-relaxed">
              선택한 학급의 기본 시간표가 아직 등록되지 않았습니다. 학사 시간표 확정 후 반영됩니다.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false} custom={animationDirection}>
            <motion.div
              key={`${selectedGrade}_${selectedDept}_${selectedClass}_${weekStartKey}`}
              custom={animationDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
              className="w-full min-w-0 grid grid-cols-5 divide-x divide-white/[0.06] bg-[#0a1120]"
            >
          
          {/* Loop over Days 0 ~ 4 (Mon ~ Fri) */}
          {weekDays.map((dayDate, dayIdx) => {
            const dayName = dayOfWeekNames[dayIdx];
            const isToday = isCurrentDay(dayDate);
            const totalPeriods = dayIdx === 4 ? 4 : 7;

            return (
              <div key={dayIdx} className={`flex flex-col flex-1 pb-2 min-h-[500px] sm:min-h-[560px] md:min-h-[600px] ${isToday ? 'bg-secondary/[0.04]' : ''}`}>
                
                {/* Column Day Header */}
                <div className={`p-2 sm:py-3 border-b flex flex-col items-center justify-center text-center sticky top-0 bg-[#0a1120]/95 backdrop-blur z-10 ${
                  isToday ? 'border-b-secondary-container' : 'border-b-white/[0.06]'
                }`}>
                  <span className={`text-xs sm:text-sm mb-0.5 ${
                    isToday ? 'text-secondary-container font-bold' : 'text-white/85 font-semibold'
                  }`}>
                    <span className="block sm:hidden">{dayName[0]}</span>
                    <span className="hidden sm:block">{dayName}요일</span>
                  </span>
                  <span className={`text-[10px] sm:text-xs font-mono tabular-nums ${isToday ? 'text-white font-semibold' : 'text-surface-dim/65'}`}>
                    {formatMonthDay(dayDate)}
                  </span>
                </div>

                {/* Day Period Cells */}
                <div className="px-0.5 py-1 sm:p-1.5 md:p-2 space-y-1 sm:space-y-2 md:space-y-1.5 flex-grow">
                  {Array.from({ length: 7 }, (_, pIdx) => {
                    const periodNum = pIdx + 1;
                    const isOutsideSchool = periodNum > totalPeriods;
                    
                    if (isOutsideSchool) {
                      return (
                        <div 
                          key={periodNum}
                          className="min-h-[64px] sm:min-h-[76px] md:min-h-[82px] rounded-lg sm:rounded-xl border border-white/[0.03] bg-white/[0.01] flex flex-col items-center justify-center text-center p-1 sm:p-2 opacity-40"
                        >
                          <span className="text-[10px] sm:text-[11px] font-medium text-surface-dim/60 font-mono tabular-nums">
                            {periodNum}교시
                          </span>
                          <span className="text-[10px] sm:text-xs text-surface-dim/50 mt-1 select-none text-center leading-tight">
                            {periodNum === 5 ? (
                              <>
                                <span className="block sm:hidden">점심·귀가</span>
                                <span className="hidden sm:block">점심시간 및 귀가</span>
                              </>
                            ) : periodNum === 6 ? (
                              <>
                                <span className="block sm:hidden">종례완료</span>
                                <span className="hidden sm:block">종례 완료</span>
                              </>
                            ) : (
                              '일정 없음'
                            )}
                          </span>
                        </div>
                      );
                    }

                    const baseSlot = baseTimetable[dayIdx]?.[periodNum];
                    const customMemo = getMemoForSlot(dayIdx, periodNum);
                    const periodTime = getPeriodTime(dayIdx, periodNum);
                    const activeColor = customMemo?.color || '';
                    const hasMemoText = Boolean(customMemo && customMemo.memo && customMemo.memo.trim() !== '');

                    const customStyle: React.CSSProperties = activeColor ? {
                      backgroundColor: hexToRgba(activeColor, 0.12),
                      borderColor: hexToRgba(activeColor, 0.35),
                    } : {};

                    const hasColorTheme = !!activeColor;

                    return (
                      <div
                        key={periodNum}
                        onClick={() => {
                          if (hasMemoText && customMemo) {
                            setViewingMemo({
                              dayOfWeek: dayIdx,
                              period: periodNum,
                              subject: baseSlot?.subject || '수업 없음',
                              teacher: baseSlot?.teacher || '',
                              memo: customMemo.memo
                            });
                          } else if (isAdmin) {
                            handleOpenEditMemo(dayIdx, periodNum, baseSlot?.subject || '수업 없음');
                          }
                        }}
                        className={`group relative rounded-lg sm:rounded-xl border px-1.5 py-1.5 sm:px-2.5 sm:py-2 md:px-3 md:py-2.5 flex flex-col justify-between transition-colors duration-150 min-h-[64px] sm:min-h-[76px] md:min-h-[82px] select-none ${
                          hasMemoText
                            ? !customMemo?.color
                              ? 'bg-amber-500/[0.08] border-amber-500/30 cursor-pointer hover:bg-amber-500/[0.13]' 
                              : 'cursor-pointer hover:brightness-110'
                            : hasColorTheme
                              ? `${isAdmin ? 'cursor-pointer ' : ''}hover:brightness-110`
                              : `${isAdmin ? 'cursor-pointer ' : ''}bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04]`
                        }`}
                        style={customStyle}
                      >
                        {/* Period & Time header */}
                        <div className="flex items-center justify-between border-b border-white/[0.05] pb-0.5 sm:pb-1 mb-1 shrink-0">
                          <span className="text-[10px] sm:text-[11px] font-semibold text-white/65 font-mono tabular-nums whitespace-nowrap shrink-0">
                            {periodNum}교시
                          </span>
                          
                          <span className="hidden md:inline text-[10px] font-mono tabular-nums text-surface-dim/60">
                            {periodTime}
                          </span>

                          {hasMemoText && (
                            <span 
                              title="클릭하여 주간 수행평가/메모 확인"
                              className="md:hidden w-3.5 h-3.5 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold text-[9px] leading-none"
                            >
                              !
                            </span>
                          )}
                        </div>

                        {/* Subject detail */}
                        {baseSlot ? (
                          <div className="flex flex-col text-left items-start w-full min-w-0">
                            <div className="flex items-center space-x-1 sm:space-x-1.5 w-full max-w-full min-w-0 mb-0.5 sm:mb-1">
                              <div className="marquee-container min-w-0 flex-1">
                                <span className="text-white text-[11px] sm:text-xs md:text-sm font-semibold tracking-tight sm:tracking-normal leading-tight font-sans marquee-text" title={baseSlot.subject}>
                                  {baseSlot.subject}
                                </span>
                              </div>
                              {hasMemoText && (
                                <span 
                                  title="클릭하여 주간 수행평가/메모 확인"
                                  className="hidden md:flex w-4 h-4 shrink-0 rounded-full bg-amber-500 items-center justify-center text-black font-bold text-[10px]"
                                >
                                  !
                                </span>
                              )}
                            </div>
                            {baseSlot.teacher && baseSlot.teacher.trim() ? (
                              <span className="text-[10px] sm:text-[11px] text-surface-dim font-normal leading-tight truncate w-full block shrink-0">
                                {baseSlot.teacher.trim()}<span className="hidden sm:inline"> 선생님</span>
                              </span>
                            ) : (
                              <span className="text-[10px] sm:text-[11px] text-transparent select-none leading-tight truncate w-full block shrink-0" aria-hidden="true">
                                -
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col w-full flex-1 justify-center items-start py-0.5">
                            <span className="text-surface-dim/40 text-[10px] sm:text-xs leading-tight font-sans">일정 없음</span>
                          </div>
                        )}

                        {/* Desktop-Only Hover Action Control for Admin */}
                        {isAdmin && (
                          <div className="hidden md:flex absolute right-1.5 bottom-1.5 opacity-0 md:group-hover:opacity-100 transition-opacity space-x-1 bg-[#040812]/95 border border-white/10 rounded-lg p-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditMemo(dayIdx, periodNum, baseSlot?.subject || '수업 없음');
                              }}
                              className="p-1 rounded text-surface-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              title="메모 수정/등록"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}

            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>

      {/* 5. Weekly Memo Footnote */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.1 }}
        className="mt-4 pt-3.5 border-t border-white/[0.06] text-xs text-surface-dim space-y-1 font-sans leading-relaxed px-1"
      >
        <p>
          수행평가나 수업 변동사항이 등록된 교시는 과목명 옆에 <span className="text-amber-400 font-semibold">!</span> 표시가 나타나며, 해당 교시를 누르면 세부 내용을 확인할 수 있습니다.
        </p>
        {isAdmin && (
          <p className="text-secondary-container font-medium">
            관리자는 각 교시 칸을 선택하여 주차별 수행평가 및 메모를 등록·수정할 수 있습니다.
          </p>
        )}
      </motion.div>

      {/* 6. Admin Dialog / Popups */}
      <AnimatePresence>
        {isEditModalOpen && editingSlot && (
          <div key="timetable-edit-memo-modal" className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MODAL_BACKDROP_TRANSITION}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 6, opacity: 0 }}
              transition={MODAL_PANEL_TRANSITION}
              className="relative w-full max-w-md border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 overflow-y-auto max-h-[90vh] bg-[#0a1120] custom-scrollbar"
            >
              <div className="pb-3.5 mb-4 border-b border-white/[0.08]">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  주간 수행평가 및 메모 등록
                </h3>
                <p className="text-xs text-surface-dim mt-1">
                  선택한 주차의 과목에 메모를 게시합니다. 내용을 비우고 저장하면 메모가 제거됩니다.
                </p>
              </div>

              <div className="divide-y divide-white/[0.06] border-b border-white/[0.08] pb-3 mb-4 text-xs leading-relaxed font-sans">
                <div className="flex items-center justify-between py-1.5 first:pt-0">
                  <span className="text-surface-dim">대상 주차</span>
                  <span className="text-secondary-container font-semibold font-mono tabular-nums">{weekStartDisplay} 주간</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-surface-dim">학급 · 교시</span>
                  <span className="text-white/90">
                    {selectedGrade}학년 {DEPARTMENTS.find(d => d.id === selectedDept)?.name} {selectedClass}반 · {dayOfWeekNames[editingSlot.dayOfWeek]}요일 {editingSlot.period}교시
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 last:pb-0">
                  <span className="text-surface-dim">기준 과목</span>
                  <span className="text-white font-semibold">{editingSlot.subject}</span>
                </div>
              </div>

              <form onSubmit={handleSaveMemo} className="space-y-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-surface-dim">메모 / 수행평가 내용</label>
                  <textarea
                    autoFocus
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                    placeholder="예: 영어 단어 수행평가 (1과 ~ 3과) 단어장 지참 필수"
                    rows={3}
                    maxLength={150}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-secondary-fixed-dim transition-colors resize-none"
                  />
                  <div className="flex justify-between text-[11px] text-surface-dim">
                    <span>구체적인 수행평가 범위나 준비물을 입력해 주세요.</span>
                    <span className="font-mono tabular-nums">{memoInput.length}/150자</span>
                  </div>
                </div>

                {/* Exception Theme Color Picker */}
                <div className="flex flex-col space-y-2.5 pt-1 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between pt-2">
                    <label className="text-xs font-semibold text-surface-dim">
                      셀 강조 색상 (선택)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedColor('')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        selectedColor === ''
                          ? 'bg-white/[0.14] text-white'
                          : 'text-surface-dim hover:text-white bg-white/[0.04] hover:bg-white/[0.08]'
                      }`}
                    >
                      기본 테마
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-0.5">
                    {Object.entries(SUBJECT_THEMES).filter(([key]) => key !== '제도').map(([key, theme]) => {
                      const finalHex = theme.hex.toLowerCase();
                      const isChosen = selectedColor.toLowerCase() === finalHex;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedColor(finalHex)}
                          className={`w-7 h-7 rounded-full transition-transform relative flex items-center justify-center border cursor-pointer ${
                            isChosen
                              ? 'border-white scale-110'
                              : 'border-white/15 hover:scale-105'
                          }`}
                          style={{ backgroundColor: finalHex }}
                          title={`${theme.name} (${finalHex})`}
                        >
                          {isChosen && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 border-t border-white/[0.08] pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] rounded-lg text-xs font-semibold text-surface-dim hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    취소
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-secondary hover:bg-secondary/90 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    저장
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingMemo && (
          <div key="timetable-view-memo-modal" className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MODAL_BACKDROP_TRANSITION}
              onClick={() => setViewingMemo(null)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 6, opacity: 0 }}
              transition={MODAL_PANEL_TRANSITION}
              className="relative w-full max-w-sm border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden bg-[#0a1120]"
            >
              <div className="border-b border-white/[0.08] pb-3.5 mb-3.5">
                <div className="text-amber-400 font-semibold text-xs mb-1">
                  수행평가 · 주간 메모
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {viewingMemo.subject}
                  {viewingMemo.teacher && viewingMemo.teacher.trim() && (
                    <span className="text-xs font-normal text-surface-dim ml-2">
                      {viewingMemo.teacher.trim()} 선생님
                    </span>
                  )}
                </h3>
              </div>

              <div className="divide-y divide-white/[0.06] border-b border-white/[0.08] pb-3 mb-4 text-xs leading-relaxed font-sans">
                <div className="flex justify-between py-1.5 first:pt-0">
                  <span className="text-surface-dim">대상 일자</span>
                  <span className="text-secondary-container font-semibold font-mono tabular-nums">
                    {formatDisplayDate(weekDays[viewingMemo.dayOfWeek])} ({dayOfWeekNames[viewingMemo.dayOfWeek]})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 last:pb-0">
                  <span className="text-surface-dim">학급 · 교시</span>
                  <span className="text-white/90">
                    {selectedGrade}학년 {DEPARTMENTS.find(d => d.id === selectedDept)?.name} {selectedClass}반 · {viewingMemo.period}교시
                  </span>
                </div>
              </div>

              <div className="py-1 mb-5 select-text">
                <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                  {viewingMemo.memo}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] pt-4">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingMemo;
                      setViewingMemo(null);
                      handleOpenEditMemo(target.dayOfWeek, target.period, target.subject);
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-secondary hover:bg-secondary/90 transition-colors flex-1 sm:flex-none cursor-pointer whitespace-nowrap"
                  >
                    메모 수정
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingMemo(null)}
                  className="px-4 py-2 border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] rounded-lg text-xs font-semibold text-surface-dim hover:text-white transition-colors flex-1 sm:flex-none cursor-pointer whitespace-nowrap"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
