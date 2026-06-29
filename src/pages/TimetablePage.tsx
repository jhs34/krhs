import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  BookOpen, 
  User, 
  AlertCircle, 
  Save, 
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { DEPARTMENTS, GRADES, getDefaultTimetable } from '../data/timetableTemplates';
import { SUBJECT_THEMES, hexToRgba } from '../data/subjectThemes';
import { subscribeToTimetableMemos, saveTimetableMemo, deleteTimetableMemo, subscribeToTimetableTemplates } from '../services/firestore';
import { TimetableMemo, ClassTimetable } from '../types';

interface TimetablePageProps {
  isAdmin: boolean;
}

export { SUBJECT_THEMES, hexToRgba };

const slideVariants = {
  enter: (dir: 'forward' | 'backward') => ({
    x: dir === 'forward' ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: 'forward' | 'backward') => ({
    x: dir === 'forward' ? -30 : 30,
    opacity: 0,
  }),
};

const dayOfWeekNames = ['월', '화', '수', '목', '금'];

export default function TimetablePage({ isAdmin }: TimetablePageProps) {
  // 1. Selector States
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [selectedDept, setSelectedDept] = useState<string>('railway_machinery');
  const [selectedClass, setSelectedClass] = useState<number>(1);

  // 2. Week Date States (Default to current system week containing June 20, 2026, or current date)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Current local time has June 20, 2026
    const d = new Date();
    // Guard against invalid Date object
    return isNaN(d.getTime()) ? new Date('2026-06-20') : d;
  });

  // 3. Timetable Memos State from Firestore
  const [memos, setMemos] = useState<TimetableMemo[]>([]);
  const [expandedMemos, setExpandedMemos] = useState<{ [key: string]: boolean }>({});
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

  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward');

  const toggleMemo = (dayIdx: number, periodNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${dayIdx}_${periodNum}`;
    setExpandedMemos(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
    // adjust if Sunday (day === 0)
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

  const formatMonthDay = (date: Date): string => {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${mm}.${dd}`;
  };

  const weekStartKey = formatDateKey(mondayDate);

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
    const match = templates.find(
      (t) =>
        t.grade === selectedGrade &&
        t.department === selectedDept &&
        t.classNumber === selectedClass
    );
    if (match) {
      try {
        return JSON.parse(match.rawTimetable) as ClassTimetable;
      } catch (e) {
        console.error('Failed to parse rawTimetable from template DB', e);
      }
    }
    return getDefaultTimetable(selectedGrade, selectedDept, selectedClass);
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
      // Delete if both input and color are empty/cleared
      await deleteTimetableMemo(compositeId);
    } else {
      // Save/Upsert safely without passing any undefined custom properties
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

  // Delete memo immediately
  const handleDeleteMemoDirectly = async (dayIdx: number, periodNum: number) => {
    const compositeId = `${selectedGrade}_${selectedDept}_${selectedClass}_${weekStartKey}_${dayIdx}_${periodNum}`;
    if (confirm('메모를 삭제하시겠습니까?')) {
      await deleteTimetableMemo(compositeId);
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32">
      
      {/* 1. Header Section */}
      <div className="text-center md:text-left mb-4 md:mb-5">
        <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="text-[10px] sm:text-xs font-bold text-surface-dim font-space uppercase tracking-wider">Academic Tracker</span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-sans font-black tracking-tight text-white mb-1 leading-tight">
          주간 학급별 시간표
        </h1>
        <p className="text-xs sm:text-sm text-surface-dim leading-normal font-sans max-w-2xl mx-auto md:mx-0 break-keep">
          한국철도고등학교 학과 및 반별 주간 수업 일정표를 조회하고, 실시간 수행평가 일정과 주간 특이사항 메모를 확인하세요.
        </p>
      </div>

      {/* 2. Filters & Selection Card */}
      <div className="glass-panel-dark border-white/5 p-3.5 sm:p-4 rounded-xl shadow-lg mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Grade Select */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-surface-dim pl-1">학년</label>
            <div className="grid grid-cols-3 bg-white/5 p-1 rounded-xl border border-white/5" id="grade-selector">
              {GRADES.map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedGrade === g 
                      ? 'bg-white/10 text-white shadow-sm' 
                      : 'text-surface-dim hover:text-white'
                  }`}
                >
                  {g}학년
                </button>
              ))}
            </div>
          </div>

          {/* Department Select */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-surface-dim pl-1 font-sans">학과</label>
            <div className="grid grid-cols-3 bg-white/5 p-1 rounded-xl border border-white/5" id="dept-selector">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => {
                    setSelectedDept(dept.id);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center px-1 truncate ${
                    selectedDept === dept.id 
                      ? 'bg-white/10 text-white shadow-sm' 
                      : 'text-surface-dim hover:text-white'
                  }`}
                  title={dept.name}
                >
                  {dept.name.replace('철도', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Class Select */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-bold text-surface-dim pl-1">배정 반</label>
            <div className="grid grid-cols-2 bg-white/5 p-1 rounded-xl border border-white/5" id="class-selector">
              {[1, 2].map(c => {
                const totalClasses = DEPARTMENTS.find(d => d.id === selectedDept)?.classes || [1];
                const isAvailable = totalClasses.includes(c);
                return (
                  <button
                    key={c}
                    disabled={!isAvailable}
                    onClick={() => setSelectedClass(c)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                      !isAvailable 
                        ? 'opacity-25 cursor-not-allowed text-white/20'
                        : selectedClass === c 
                          ? 'bg-white/10 text-white shadow-sm' 
                          : 'text-surface-dim hover:text-white'
                    }`}
                  >
                    {c}반
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* 3. Week Navigation & Range */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 py-2 px-2 mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-secondary-fixed shrink-0" />
          <span className="text-sm md:text-base font-bold text-white font-space">
            {formatWeekRangeString()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 sm:p-2 rounded-lg border border-white/5 bg-white/5 text-surface-dim hover:text-white hover:bg-white/10 transition-colors shadow-md"
            title="이전 주"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={handleResetToToday}
            className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-white/5 bg-white/5 text-surface-dim hover:text-white hover:bg-white/10 transition-colors shadow-md"
          >
            오늘이 속한 주
          </button>

          <button
            onClick={handleNextWeek}
            className="p-1.5 sm:p-2 rounded-lg border border-white/5 bg-white/5 text-surface-dim hover:text-white hover:bg-white/10 transition-colors shadow-md"
            title="다음 주"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Timetable Grid View */}
      {/* Information indicator for smaller layouts */}
      {!isTimetableEmpty && (
        <div className="text-center text-xs text-surface-dim/60 mb-2 flex items-center justify-center space-x-1.5 select-none px-2 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-secondary-fixed shrink-0" />
          <span>요일별 시간표를 한눈에 볼 수 있습니다. 💡 (!) 표시된 과목을 누르면 상세 메모가 표시됩니다.</span>
        </div>
      )}

      <div className="w-full rounded-2xl border border-white/5 shadow-2xl bg-white/[0.01] overflow-hidden">
        {isTimetableEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[#0d121f]/40 min-h-[380px]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-5 border border-white/10 text-secondary-fixed animate-pulse">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">곧 시간표가 등록될 예정입니다.</h3>
            <p className="text-sm text-surface-dim/70 max-w-md break-keep leading-relaxed">
              선택하신 학급의 시간표가 아직 등록되지 않았습니다. 시간표가 확정되는 대로 실시간으로 업데이트될 예정이오니 잠시만 기다려 주세요!
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false} custom={animationDirection}>
            <motion.div
              key={weekStartKey}
              custom={animationDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="w-full min-w-0 grid grid-cols-5 divide-x divide-white/5 bg-primary-dark"
            >
          
          {/* Loop over Days 0 ~ 4 (Mon ~ Fri) */}
          {weekDays.map((dayDate, dayIdx) => {
            const dayName = dayOfWeekNames[dayIdx];
            const isToday = isCurrentDay(dayDate);
            const totalPeriods = dayIdx === 4 ? 4 : 7; // Friday has 4 periods, Mon-Thu has 7

            return (
              <div key={dayIdx} className={`flex flex-col flex-1 pb-2 min-h-[350px] ${isToday ? 'bg-[#00e5ff]/[0.02]' : ''}`}>
                
                {/* Column Day Header */}
                <div className={`p-1.5 sm:p-2 sm:py-3 border-b border-white/5 flex flex-col items-center justify-center text-center sticky top-0 bg-primary-dark/95 backdrop-blur z-10 ${
                  isToday ? 'border-b-secondary-fixed' : ''
                }`}>
                  <span className={`text-[11px] sm:text-sm font-black mb-0.5 px-1 sm:px-2.5 py-0.5 rounded-full ${
                    isToday ? 'bg-secondary/20 text-white font-extrabold border border-secondary/20' : 'text-surface-dim/90'
                  }`}>
                    <span className="block sm:hidden">{dayName[0]}</span>
                    <span className="hidden sm:block">{dayName}요일</span>
                  </span>
                  <span className={`text-[9px] sm:text-xs font-mono font-medium ${isToday ? 'text-secondary-fixed font-bold' : 'text-surface-dim/50'}`}>
                    {formatMonthDay(dayDate)}
                  </span>
                </div>

                {/* Day Period Cells */}
                <div className="p-1 sm:p-1.5 md:p-2 space-y-1.5 sm:space-y-2.5 md:space-y-1.5 flex-grow">
                  {Array.from({ length: 7 }, (_, pIdx) => {
                    const periodNum = pIdx + 1;
                    const isOutsideSchool = periodNum > totalPeriods;
                    
                    if (isOutsideSchool) {
                      // Block for non-operating Friday afternoon slots
                      return (
                        <div 
                          key={periodNum}
                          className="min-h-[48px] sm:min-h-[60px] md:min-h-[70px] md:h-[calc((100vh-420px)/7)] max-h-[92px] rounded-xl border border-white/[0.02] bg-white/[0.01] flex flex-col items-center justify-center text-center p-1 sm:p-2 opacity-35 hover:opacity-50 transition-opacity"
                        >
                          <span className="text-[8px] sm:text-[10px] font-bold text-surface-dim/40 font-mono">
                            {periodNum}교시<span className="hidden sm:inline"> | 후반</span>
                          </span>
                          <span className="text-[9px] sm:text-[11px] font-bold text-surface-dim/30 mt-1 select-none text-center leading-tight">
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

                    // Active school cell details
                    const baseSlot = baseTimetable[dayIdx]?.[periodNum];
                    const customMemo = getMemoForSlot(dayIdx, periodNum);
                    const periodTime = getPeriodTime(dayIdx, periodNum);

                    // Determine theme color hierarchy:
                    // 1) customMemo color override, 2) none
                    const activeColor = customMemo?.color || '';

                    // Dynamically compile style for custom selected colors
                    const customStyle: React.CSSProperties = activeColor ? {
                      backgroundColor: hexToRgba(activeColor, 0.12),
                      borderColor: hexToRgba(activeColor, 0.35),
                      boxShadow: `inset 0 0 12px ${hexToRgba(activeColor, 0.05)}, 0 4px 10px ${hexToRgba(activeColor, 0.1)}`,
                    } : {};

                    const hasColorTheme = !!activeColor;

                    return (
                      <div
                        key={periodNum}
                        onClick={(e) => {
                          if (customMemo && customMemo.memo && customMemo.memo.trim() !== '') {
                            setViewingMemo({
                              dayOfWeek: dayIdx,
                              period: periodNum,
                              subject: baseSlot?.subject || '수업 없음',
                              teacher: baseSlot?.teacher || '',
                              memo: customMemo.memo
                            });
                          }
                        }}
                        className={`group relative rounded-lg sm:rounded-xl border px-1.5 py-1 sm:px-2.5 sm:pt-2 sm:pb-3 md:px-3 md:pt-2.5 md:pb-3.5 flex flex-col justify-between transition-all duration-200 min-h-[48px] sm:min-h-[60px] md:min-h-[70px] md:h-[calc((100vh-420px)/7)] max-h-[92px] select-none ${
                          customMemo && customMemo.memo && customMemo.memo.trim() !== ''
                            ? !customMemo.color
                              ? 'bg-[#1e1c16] border-amber-600/30 ring-1 ring-amber-500/20 shadow-md shadow-amber-950/10 cursor-pointer hover:bg-[#252219]' 
                              : 'cursor-pointer hover:brightness-110'
                            : hasColorTheme
                              ? 'hover:brightness-110 bg-opacity-25'
                              : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                        style={customStyle}
                      >
                        {/* Period & Time header */}
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-0.5 md:pb-1 mb-0.5 md:mb-1">
                          <span className="text-[8.5px] sm:text-[10px] font-black text-white/55 tracking-wide font-sans bg-white/5 px-1 sm:px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                            {periodNum}교시
                          </span>
                          
                          <span className="hidden md:flex text-[9.5px] font-mono text-surface-dim/50 font-medium items-center space-x-1">
                            <Clock className="w-2.5 h-2.5 text-surface-dim/30" />
                            <span>{periodTime}</span>
                          </span>
                        </div>

                        {/* Subject detail */}
                        {baseSlot ? (
                          <div className="flex flex-col space-y-0.5 text-left items-start">
                            <div className="flex items-center space-x-1 sm:space-x-1.5 w-full max-w-full min-w-0">
                              <div className="marquee-container min-w-0 flex-1">
                                <span className="text-white text-[10px] sm:text-xs font-black leading-tight font-sans marquee-text" title={baseSlot.subject}>
                                  {baseSlot.subject}
                                </span>
                              </div>
                              {customMemo && customMemo.memo && customMemo.memo.trim() !== '' && (
                                <span 
                                  title="클릭하여 주간 수행평가/메모 확인"
                                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-[8px] sm:text-[9px] shadow-[0_1px_3px_rgba(245,158,11,0.5)] animate-pulse"
                                >
                                  !
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-surface-dim font-medium truncate">
                              {baseSlot.teacher}<span className="hidden sm:inline"> 선생님</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-surface-dim/35 text-[9px] sm:text-[11px] leading-tight font-sans">일정 없음</span>
                        )}

                        {/* Hover Overlay Action Controls for Admin */}
                        {isAdmin && (
                          <div className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 bg-primary-dark/95 border border-white/5 rounded-lg p-0.5 shadow-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditMemo(dayIdx, periodNum, baseSlot?.subject || '수업 없음');
                              }}
                              className="p-1 rounded text-surface-dim hover:text-white hover:bg-white/5 transition-colors"
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
      </div>

      {/* 5. Custom Weekly Info description cards */}
      <div className="mt-6 p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-start space-x-3 text-surface-dim">
        <Info className="w-5 h-5 text-secondary-fixed shrink-0 mt-0.5" />
        <div className="text-xs space-y-1 font-sans leading-relaxed">
          <p className="font-bold text-white">수행평가 및 주간 변동사항 안내</p>
          <p>
            각 교시별 주간 특이사항(수행평가, 시간대체 수업, 외부강사 강연 등)은 해당 교시 하단에 주황색 카드 형태로 표기됩니다.
            이 일정은 학사 관리를 위해 주차별로 개별 관리되므로, 올바른 날짜를 선택하여 확인해주시기 바랍니다.
          </p>
          {isAdmin && (
            <p className="text-[#00e5ff] font-medium pt-1">
              * 관리자는 마우스를 시간표 슬롯 위에 올렸을 때 나타나는 연필 아이콘을 클릭하여 주간 수행평가 일정을 등록 및 수정할 수 있습니다.
            </p>
          )}
        </div>
      </div>

      {/* 6. Admin Dialog / Popups */}
      <AnimatePresence>
        {isEditModalOpen && editingSlot && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md glass-panel border-white/10 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl p-4 sm:p-5 md:p-6 overflow-y-auto max-h-[90vh] bg-[#0d121f] scrollbar-thin scrollbar-thumb-white/10"
            >
              <div className="border-b border-white/5 pb-3 mb-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                  <Edit2 className="w-4.5 h-4.5 text-[#00e5ff]" />
                  <span>주간 수행평가 및 메모 등록</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-surface-dim mt-1">
                  선택한 주차의 과목 하단에 메모를 게시합니다. 내용을 지우면 메모가 제거됩니다.
                </p>
              </div>

              {/* Informational Header */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs space-y-1 mb-3 leading-relaxed font-sans text-white/90">
                <div>
                  <span className="font-bold text-surface-dim mr-2 font-mono">대상 주차:</span>
                  <span className="text-[#00e5ff] font-bold">{weekStartKey} 주간</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 mt-1 border-t border-white/5">
                  <div>
                    <span className="font-bold text-surface-dim mr-1 font-mono">학급:</span>
                    <span>{selectedGrade}학년 {DEPARTMENTS.find(d => d.id === selectedDept)?.name} {selectedClass}반</span>
                  </div>
                  <div>
                    <span className="font-bold text-surface-dim mr-1 font-mono">시간:</span>
                    <span>{dayOfWeekNames[editingSlot.dayOfWeek]}요일 {editingSlot.period}교시</span>
                  </div>
                </div>
                <div className="pt-1 mt-1 border-t border-white/5">
                  <span className="font-bold text-surface-dim mr-2 font-mono">기준 과목:</span>
                  <span className="text-white font-extrabold">{editingSlot.subject}</span>
                </div>
              </div>

              <form onSubmit={handleSaveMemo} className="space-y-3">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-surface-dim pl-1">메모 / 수행평가 내용</label>
                  <textarea
                    autoFocus
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                    placeholder="예: 영어 단어 수행평가 (1과 ~ 3과) 단어장 지참 필수"
                    rows={3}
                    maxLength={150}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-secondary-fixed focus:border-secondary-fixed transition-colors resize-none"
                  />
                  <div className="flex justify-between text-[11px] text-surface-dim pl-1">
                    <span>* 구체적인 수행평가 정보를 적어주세요.</span>
                    <span>{memoInput.length}/150자</span>
                  </div>
                </div>

                {/* Exception Theme Color Picker */}
                <div className="flex flex-col space-y-2 pt-1">
                  <label className="text-xs font-bold text-surface-dim pl-1 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-secondary-fixed" />
                    <span>시간표 개별 적용 테마 색상 (예외 지정)</span>
                  </label>
                  <div className="flex flex-col space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    {/* Default Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedColor('')}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center space-x-1.5 ${
                        selectedColor === ''
                          ? 'bg-white/15 text-white ring-1 ring-white/20 font-black'
                          : 'text-surface-dim hover:text-white bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span>색상 미지정 (기본 테마)</span>
                    </button>

                    <div className="border-t border-white/5 pt-1" />

                    {/* Palette Choices */}
                    <div className="flex flex-wrap gap-2.5 justify-center">
                      {Object.entries(SUBJECT_THEMES).filter(([key]) => key !== '제도').map(([key, theme]) => {
                        const finalHex = theme.hex.toLowerCase();
                        const isChosen = selectedColor.toLowerCase() === finalHex;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedColor(finalHex)}
                            className={`w-8 h-8 rounded-full transition-all relative flex items-center justify-center border hover:scale-110 active:scale-95 ${
                              isChosen
                                ? 'border-white scale-105 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                                : 'border-white/10'
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
                  <span className="text-[10px] text-surface-dim/70 pl-1">
                    * 지정하지 않을 경우, 기본 테마가 적용되어 차분한 일반 셀 색상으로 유지됩니다.
                  </span>
                </div>

                <div className="flex items-center justify-end space-x-2 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-white/5 hover:border-white/10 bg-white/5 rounded-xl text-xs font-bold text-surface-dim hover:text-white transition-all shadow-md"
                  >
                    취소
                  </button>

                  <button
                    type="submit"
                    className="px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-secondary/80 hover:bg-secondary border border-secondary/20 transition-all flex items-center space-x-1 shadow-md shadow-secondary/10"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>저장</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {viewingMemo && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingMemo(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm glass-panel border-amber-500/20 rounded-2xl shadow-2xl p-6 overflow-hidden bg-[#111624]"
            >
              <div className="border-b border-white/5 pb-4 mb-4">
                <span className="bg-amber-500 text-black font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-sm inline-block mb-1.5" style={{ fontFamily: 'Inter' }}>
                  수행평가 / 주간 메모
                </span>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-400" />
                  <span>주간 일정 세부 내용</span>
                </h3>
              </div>

              {/* Informational Header */}
              <div className="p-3.5 bg-white/5 border border-white/5 rounded-xl text-xs space-y-1.5 mb-4 leading-relaxed font-sans text-white/90">
                <div className="flex justify-between border-b border-white/[0.04] pb-1.5 mb-1">
                  <span className="font-bold text-surface-dim font-mono">대상 주차:</span>
                  <span className="text-[#00e5ff] font-bold">
                    {weekStartKey} 주간 ({formatDateKey(weekDays[viewingMemo.dayOfWeek])})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="font-bold text-surface-dim mr-1 font-mono">상세정보:</span>
                    <span>{selectedGrade}학년 {DEPARTMENTS.find(d => d.id === selectedDept)?.name} {selectedClass}반</span>
                  </div>
                  <div>
                    <span className="font-bold text-surface-dim mr-1 font-mono">시간:</span>
                    <span>{dayOfWeekNames[viewingMemo.dayOfWeek]}요일 {viewingMemo.period}교시</span>
                  </div>
                </div>
                <div className="pt-2 mt-1 border-t border-white/5">
                  <span className="font-bold text-surface-dim mr-2 font-mono">해당 교시:</span>
                  <span className="text-[#00e5ff] font-extrabold">{viewingMemo.subject}</span>
                  {viewingMemo.teacher && (
                    <span className="text-white/60 text-[11px] ml-1">({viewingMemo.teacher} 선생님)</span>
                  )}
                </div>
              </div>

              {/* Memo content block */}
              <div className="bg-[#1e1a12] border border-amber-500/20 rounded-xl p-4 mb-4 select-text">
                <div className="text-amber-200 text-xs font-semibold whitespace-pre-wrap leading-relaxed">
                  {viewingMemo.memo}
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setViewingMemo(null)}
                  className="px-4 py-2 border border-white/5 hover:border-white/10 bg-white/5 rounded-xl text-xs font-bold text-surface-dim hover:text-white transition-all shadow-md w-full sm:w-auto"
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
