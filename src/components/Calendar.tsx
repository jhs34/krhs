import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AcademicEvent } from '../types';
import { EASE_OUT_EXPO, MODAL_BACKDROP_TRANSITION, MODAL_PANEL_TRANSITION } from '../utils/motion';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  events: AcademicEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onItemClick?: (item: any, type: 'notice' | 'event' | 'document') => void;
  isAdmin?: boolean;
  onAddEventClick?: (date: Date) => void;
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -20 : 20,
    opacity: 0,
  }),
};

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

export function Calendar({ 
  currentDate, 
  onDateChange, 
  events, 
  selectedDate, 
  onSelectDate, 
  onItemClick,
  isAdmin = false,
  onAddEventClick
}: CalendarProps) {
  const getContrastColor = (hexcolor?: string) => {
    if (!hexcolor) return 'text-white';
    let hex = hexcolor.replace("#", "");
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return 'text-white';
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'text-black' : 'text-white';
  };

  const [direction, setDirection] = useState(0);
  const [popupDate, setPopupDate] = useState<Date | null>(null);
  const activeEvents = useMemo(() => events.filter(e => !e.isArchived), [events]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const nextMonth = () => {
    setDirection(1);
    onDateChange(addMonths(currentDate, 1));
  };
  
  const prevMonth = () => {
    setDirection(-1);
    onDateChange(subMonths(currentDate, 1));
  };

  const weeksData = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return weeks.map((week) => {
      const wStartStr = format(week[0], 'yyyy-MM-dd');
      const wEndStr = format(week[6], 'yyyy-MM-dd');
      const weekDateStrings = week.map(d => format(d, 'yyyy-MM-dd'));

      const weekEvents = activeEvents.filter(e => {
        const eStartStr = format(e.date, 'yyyy-MM-dd');
        const eEndStr = e.endDate ? format(e.endDate, 'yyyy-MM-dd') : eStartStr;
        return eStartStr <= wEndStr && eEndStr >= wStartStr;
      });

      const sortedEvents = [...weekEvents].sort((a, b) => {
        const aStartStr = format(a.date, 'yyyy-MM-dd');
        const aEndStr = a.endDate ? format(a.endDate, 'yyyy-MM-dd') : aStartStr;
        const bStartStr = format(b.date, 'yyyy-MM-dd');
        const bEndStr = b.endDate ? format(b.endDate, 'yyyy-MM-dd') : bStartStr;

        const aDays = Math.round((new Date(aEndStr).getTime() - new Date(aStartStr).getTime()) / (24 * 60 * 60 * 1000));
        const bDays = Math.round((new Date(bEndStr).getTime() - new Date(bStartStr).getTime()) / (24 * 60 * 60 * 1000));
        
        if (aDays !== bDays) return bDays - aDays;
        return aStartStr.localeCompare(bStartStr);
      });

      const slots: (AcademicEvent | null)[][] = [];
      const positionedEvents: { event: AcademicEvent; startIdx: number; endIdx: number; slot: number }[] = [];

      sortedEvents.forEach(event => {
        const eStartStr = format(event.date, 'yyyy-MM-dd');
        const eEndStr = event.endDate ? format(event.endDate, 'yyyy-MM-dd') : eStartStr;
        
        let startIdx = 0;
        let endIdx = 6;
        
        for (let i = 0; i < 7; i++) {
          if (weekDateStrings[i] >= eStartStr) {
            startIdx = i;
            break;
          }
        }
        
        for (let i = 6; i >= 0; i--) {
          if (weekDateStrings[i] <= eEndStr) {
            endIdx = i;
            break;
          }
        }
        
        startIdx = Math.max(0, Math.min(6, startIdx));
        endIdx = Math.max(0, Math.min(6, endIdx));

        let assignedSlot = 0;
        while (true) {
          if (!slots[assignedSlot]) {
            slots[assignedSlot] = Array(7).fill(null);
          }
          
          let isSlotFree = true;
          for (let d = startIdx; d <= endIdx; d++) {
            if (slots[assignedSlot][d] !== null) {
              isSlotFree = false;
              break;
            }
          }
          
          if (isSlotFree) {
            for (let d = startIdx; d <= endIdx; d++) {
              slots[assignedSlot][d] = event;
            }
            positionedEvents.push({ event, startIdx, endIdx, slot: assignedSlot });
            break;
          }
          assignedSlot++;
        }
      });

      const maxSlot = positionedEvents.length > 0 ? Math.max(...positionedEvents.map(p => p.slot)) : -1;
      const maxVisibleSlots = 2;

      const getHiddenCount = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return weekEvents.filter(e => {
          const eStartStr = format(e.date, 'yyyy-MM-dd');
          const eEndStr = e.endDate ? format(e.endDate, 'yyyy-MM-dd') : eStartStr;
          if (dayStr >= eStartStr && dayStr <= eEndStr) {
            const pe = positionedEvents.find(p => p.event.id === e.id);
            return pe && pe.slot >= maxVisibleSlots;
          }
          return false;
        }).length;
      };

      const weekHiddenCounts = week.map(day => getHiddenCount(day));

      return {
        week,
        weekEvents,
        positionedEvents,
        maxSlot,
        maxVisibleSlots,
        weekHiddenCounts,
        getHiddenCount
      };
    });
  }, [days, activeEvents]);

  const popupDateEvents = popupDate ? activeEvents.filter(e => {
    const eStartStr = format(e.date, 'yyyy-MM-dd');
    const eEndStr = e.endDate ? format(e.endDate, 'yyyy-MM-dd') : eStartStr;
    const targetStr = format(popupDate, 'yyyy-MM-dd');
    return targetStr >= eStartStr && targetStr <= eEndStr;
  }) : [];

  return (
    <>
      <div className="bg-[#0a1120] rounded-2xl border border-white/[0.08] overflow-hidden p-4 md:p-5 lg:p-6 relative">
        <div className="flex justify-between items-center mb-3 md:mb-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h3
              key={format(monthStart, 'yyyy-MM')}
              initial={{ opacity: 0, y: direction >= 0 ? 6 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction >= 0 ? -6 : 6 }}
              transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
              className="font-sans font-semibold text-lg md:text-xl lg:text-2xl text-white tracking-tight tabular-nums"
            >
              {format(currentDate, 'yyyy년 M월')}
            </motion.h3>
          </AnimatePresence>
          <div className="flex space-x-1.5 md:space-x-2 items-center">
            <button
              onClick={() => {
                const today = new Date();
                setDirection(today >= currentDate ? 1 : -1);
                onDateChange(today);
                onSelectDate(today);
                setPopupDate(null);
              }}
              className="px-3 md:px-3.5 h-8 md:h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-xs md:text-sm font-semibold text-white hover:bg-white/[0.1] transition-colors mr-0.5 cursor-pointer whitespace-nowrap"
            >
              오늘
            </button>
            <button 
              onClick={prevMonth}
              className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={nextMonth}
              className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
              aria-label="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 md:mb-3">
          {weekDays.map((day, idx) => (
            <div 
              key={day} 
              className={`text-center font-medium text-xs md:text-sm py-0.5 md:py-1 ${
                idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-surface-dim'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        <div>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={monthStart.toISOString()}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              className="flex flex-col space-y-1.5 md:space-y-2"
            >
              {weeksData.map(({ week, positionedEvents, maxSlot, maxVisibleSlots, getHiddenCount }, weekIdx) => {
                return (
                  <div key={weekIdx} className="relative w-full">
                    {/* Background Grid Cells */}
                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                      {week.map((day) => {
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const hiddenCount = getHiddenCount(day);

                        const dayStr = format(day, 'yyyy-MM-dd');
                        const dayEvents = activeEvents.filter(e => {
                          const eStartStr = format(e.date, 'yyyy-MM-dd');
                          const eEndStr = e.endDate ? format(e.endDate, 'yyyy-MM-dd') : eStartStr;
                          return dayStr >= eStartStr && dayStr <= eEndStr;
                        });

                        const dayWeekIdx = day.getDay();
                        const isSunday = dayWeekIdx === 0;
                        const isSaturday = dayWeekIdx === 6;
                        const hasHoliday = dayEvents.some(e => e.isHoliday);

                        let dateColorClass = 'text-white';
                        if (hasHoliday || isSunday) {
                          dateColorClass = 'text-red-400';
                        } else if (isSaturday) {
                          dateColorClass = 'text-blue-400';
                        }

                        return (
                          <div 
                            key={day.toString()} 
                            onClick={() => {
                              onSelectDate(day);
                              setPopupDate(day);
                            }}
                            className={`
                              min-h-[62px] sm:min-h-[68px] md:min-h-[84px] lg:min-h-[96px] xl:min-h-[106px] p-1 md:p-1.5 rounded-md md:rounded-lg border flex flex-col items-center md:items-start justify-start cursor-pointer transition-colors relative
                              ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}
                              ${isSelected 
                                ? 'border-white/60 bg-white/[0.09] text-white' 
                                : 'border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.06] hover:border-white/[0.16] text-white'
                              }
                            `}
                          >
                            <div className="w-full flex items-center justify-between shrink-0 mb-1 px-0.5">
                              <span className={`text-[10px] sm:text-xs font-mono tabular-nums shrink-0 px-1.5 py-0.5 rounded-md ${
                                isSelected 
                                  ? 'bg-white text-black font-bold' 
                                  : `${dateColorClass} font-medium`
                              }`}>
                                {format(day, 'd')}
                              </span>

                              {hiddenCount > 0 && (
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectDate(day);
                                    setPopupDate(day);
                                  }}
                                  className="pointer-events-auto h-4 sm:h-[18px] px-1 sm:px-1.5 rounded bg-white/[0.12] hover:bg-white/[0.2] text-white font-semibold font-mono tabular-nums text-[9px] sm:text-[10px] leading-none flex items-center justify-center transition-colors cursor-pointer select-none"
                                  title={`${hiddenCount}개의 일정이 더 있습니다`}
                                >
                                  +{hiddenCount}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Continuous Overlay Banner Grid Layer */}
                    <div className="absolute inset-x-0 top-6 sm:top-7 md:top-8 lg:top-9 bottom-0.5 md:bottom-1 pointer-events-none flex flex-col space-y-0.5 md:space-y-1 overflow-hidden select-none">
                      {Array.from({ length: Math.min(maxVisibleSlots, maxSlot + 1) }).map((_, slotIdx) => {
                        const slotEvents = positionedEvents.filter(p => p.slot === slotIdx);
                        return (
                          <div key={slotIdx} className="grid grid-cols-7 grid-rows-1 gap-1 md:gap-2">
                            {slotEvents.map(({ event, startIdx, endIdx }) => {
                              const color = event.color || '#3b82f6';
                              const contrastClass = getContrastColor(color);
                              const isMultiDay = (endIdx - startIdx) > 0;
                              
                              const gridColStart = startIdx + 1;
                              const gridColEnd = endIdx + 2;
                              
                              const isStartOfEvent = format(event.date, 'yyyy-MM-dd') >= format(week[0], 'yyyy-MM-dd');
                              const isEndOfEvent = event.endDate ? (format(event.endDate, 'yyyy-MM-dd') <= format(week[6], 'yyyy-MM-dd')) : true;

                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectDate(event.date);
                                    setPopupDate(event.date);
                                  }}
                                  className={`
                                    pointer-events-auto h-[14px] sm:h-[16px] md:h-[19px] lg:h-[21px] shrink-0 flex items-center justify-start cursor-pointer transition-opacity select-none overflow-hidden hover:opacity-90
                                    ${isStartOfEvent ? 'rounded-l pl-1 sm:pl-1.5 md:pl-2 ml-[3px] md:ml-[4px]' : 'rounded-l-none pl-1 md:pl-1.5'}
                                    ${isEndOfEvent ? 'rounded-r pr-1 sm:pr-1.5 md:pr-2 mr-[3px] md:mr-[4px]' : 'rounded-r-none pr-1 md:pr-1.5'}
                                  `}
                                  style={{ 
                                    gridColumn: `${gridColStart} / ${gridColEnd}`,
                                    gridRow: '1',
                                    backgroundColor: color,
                                  }}
                                  title={`${event.title}${event.description ? ': ' + event.description : ''}`}
                                >
                                  <div className="w-full flex items-center min-w-0">
                                    {isMultiDay && isStartOfEvent && (
                                      <div className={`w-1 h-1 rounded-full shrink-0 mr-1 bg-current ${contrastClass}`} />
                                    )}
                                    <span className={`font-semibold font-sans text-[9px] sm:text-[10px] md:text-[11px] leading-none truncate ${contrastClass} tracking-tight`}>
                                      {event.title}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Date Detail Popup Modal */}
      <AnimatePresence>
        {popupDate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MODAL_BACKDROP_TRANSITION}
            onClick={() => setPopupDate(null)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 6, opacity: 0 }}
              transition={MODAL_PANEL_TRANSITION}
              onClick={e => e.stopPropagation()}
              className="bg-[#0a1120] border border-white/10 w-full max-w-sm max-h-[85%] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <span className="text-surface-dim font-mono tabular-nums text-xs mb-0.5">{format(popupDate, 'yyyy년 M월')}</span>
                  <span className="text-white font-sans text-xl font-semibold">
                    {format(popupDate, 'd일')} {weekDays[popupDate.getDay()]}요일
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        if (onAddEventClick) {
                          onAddEventClick(popupDate);
                          setPopupDate(null);
                        }
                      }}
                      title="일정 추가"
                      className="p-2 rounded-lg bg-secondary/15 border border-secondary/30 text-white hover:bg-secondary/25 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setPopupDate(null)} className="p-2 rounded-lg bg-white/[0.05] border border-white/10 text-surface-dim hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex-grow">
                {popupDateEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4">
                    <p className="text-surface-dim text-sm mb-4">등록된 학사일정이 없습니다.</p>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (onAddEventClick) {
                            onAddEventClick(popupDate);
                            setPopupDate(null);
                          }
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] transition-colors flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>일정 등록</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {popupDateEvents.map(event => (
                      <div 
                        key={event.id} 
                        className="py-3.5 first:pt-0 last:pb-0 px-2 -mx-2 rounded-lg flex flex-col cursor-pointer hover:bg-white/[0.04] transition-colors"
                        onClick={() => {
                          if (onItemClick) {
                            setPopupDate(null);
                            onItemClick(event, 'event');
                          }
                        }}
                      >
                        <div className="flex items-center mb-1">
                          <span className="w-2 h-2 rounded-full mr-2.5 shrink-0" style={{ backgroundColor: event.color || '#3b82f6' }} />
                          <span className="text-white font-semibold text-sm sm:text-base">{event.title}</span>
                        </div>
                        {event.description && (
                          <span className="text-surface-dim text-xs sm:text-sm pl-[18px] leading-relaxed whitespace-pre-wrap">{event.description}</span>
                        )}
                        {event.endDate && format(event.date, 'yyyy-MM-dd') !== format(event.endDate, 'yyyy-MM-dd') && (
                          <span className="text-xs font-mono tabular-nums text-surface-dim/75 pl-[18px] mt-1">
                            {format(event.date, 'yyyy.MM.dd')} ~ {format(event.endDate, 'MM.dd')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
