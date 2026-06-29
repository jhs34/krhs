import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AcademicEvent } from '../types';

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

      // Filter events intersecting with this week using pure ISO dates list
      const weekEvents = events.filter(e => {
        const eStartStr = format(e.date, 'yyyy-MM-dd');
        const eEndStr = e.endDate ? format(e.endDate, 'yyyy-MM-dd') : eStartStr;
        return eStartStr <= wEndStr && eEndStr >= wStartStr;
      });

      // Sort: longer duration first, then earlier start time
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

      // Grid Slot Assignment
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
      const maxVisibleSlots = 2; // Show 2 layers of horizontal banner slots

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
  }, [days, events]);

  const popupDateEvents = popupDate ? events.filter(e => {
    const eStartStr = format(e.date, 'yyyy-MM-dd');
    const eEndStr = e.endDate ? format(e.endDate, 'yyyy-MM-dd') : eStartStr;
    const targetStr = format(popupDate, 'yyyy-MM-dd');
    return targetStr >= eStartStr && targetStr <= eEndStr;
  }) : [];

  return (
    <>
      <div className="bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden p-4 md:p-5 lg:p-6 relative">
        <div className="flex justify-between items-center mb-3 md:mb-5">
        <h3 className="font-sans font-bold text-lg md:text-xl lg:text-2xl text-white tracking-tight">
          {format(currentDate, 'yyyy년 M월')}
        </h3>
        <div className="flex space-x-1 md:space-x-2 items-center">
          <button
            onClick={() => {
              const today = new Date();
              onDateChange(today);
              onSelectDate(today);
              setPopupDate(null);
            }}
            className="px-3 md:px-4 h-8 md:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs md:text-sm font-bold text-white hover:bg-white/10 transition-colors mr-1 md:mr-2"
          >
            오늘
          </button>
          <button 
            onClick={prevMonth}
            className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
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
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={monthStart.toISOString()}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="flex flex-col space-y-1.5 md:space-y-2.5"
          >
            {weeksData.map(({ week, weekEvents, positionedEvents, maxSlot, maxVisibleSlots, weekHiddenCounts, getHiddenCount }, weekIdx) => {
                return (
                  <div key={weekIdx} className="relative w-full">
                    {/* Background Grid Cells */}
                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                      {week.map((day) => {
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const hiddenCount = getHiddenCount(day);

                        const dayStr = format(day, 'yyyy-MM-dd');
                        const dayEvents = events.filter(e => {
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
                              min-h-[58px] sm:min-h-[64px] md:min-h-[82px] lg:min-h-[94px] xl:min-h-[105px] p-0.5 md:p-1.5 rounded-[4px] md:rounded-lg border flex flex-col items-center md:items-start justify-start cursor-pointer transition-all relative
                              ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}
                              ${isSelected 
                                ? 'border-white bg-white/10 text-white shadow-md shadow-white/5' 
                                : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white'
                              }
                            `}
                          >
                            <span className={`text-[8px] sm:text-[10px] md:text-xs font-space shrink-0 mb-1 px-1 sm:px-1.5 py-[1px] md:py-0.5 rounded-full ${
                              isSelected 
                                ? 'bg-white text-black font-extrabold' 
                                : `${dateColorClass} font-medium`
                            }`}>
                              {format(day, 'd')}
                            </span>
                            
                            {/* Counter of hidden schedules removed as they are now rendered inside slot 1 next to the second event */}
                          </div>
                        );
                      })}
                    </div>

                    {/* Continuous Overlay Banner Grid Layer */}
                    <div className="absolute inset-x-0 top-6 sm:top-[28px] md:top-8 lg:top-[38px] xl:top-[42px] bottom-0.5 md:bottom-1 pointer-events-none flex flex-col space-y-[2px] md:space-y-1 overflow-hidden select-none">
                      {Array.from({ length: Math.min(maxVisibleSlots, maxSlot + 1) }).map((_, slotIdx) => {
                        const slotEvents = positionedEvents.filter(p => p.slot === slotIdx);
                        return (
                          <div key={slotIdx} className="grid grid-cols-7 grid-rows-1 gap-1 md:gap-2">
                            {(() => {
                              if (slotIdx === 0) {
                                // Slot 0: standard continuous overlay banners
                                return slotEvents.map(({ event, startIdx, endIdx }) => {
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
                                        pointer-events-auto h-[12px] sm:h-[15px] md:h-[18px] lg:h-[20px] shrink-0 flex items-center justify-start cursor-pointer transition-all select-none overflow-hidden hover:brightness-110 active:scale-[0.98] shadow-sm
                                        ${isStartOfEvent ? 'rounded-l-sm pl-1 sm:pl-1.5 md:pl-2 ml-[3px] md:ml-[4px]' : 'rounded-l-none pl-1 md:pl-1.5'}
                                        ${isEndOfEvent ? 'rounded-r-sm pr-1 sm:pr-1.5 md:pr-2 mr-[3px] md:mr-[4px]' : 'rounded-r-none pr-1 md:pr-1.5'}
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
                                          <div className={`w-0.5 h-0.5 sm:w-1 sm:h-1 md:w-1.5 md:h-1.5 rounded-full shrink-0 mr-1 md:mr-1.5 bg-current ${contrastClass}`} />
                                        )}
                                        <span className={`font-bold font-sans text-[6px] sm:text-[7.5px] md:text-[9.5px] leading-none truncate ${contrastClass} tracking-tighter`}>
                                          {event.title}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                });
                              } else {
                                // Slot 1: Special treatment for hidden schedules
                                const renderedElements: React.ReactNode[] = [];

                                // 1. Support existing slot 1 events (potentially split if they intersect hidden counts)
                                slotEvents.forEach(({ event, startIdx, endIdx }) => {
                                  const color = event.color || '#3b82f6';
                                  const contrastClass = getContrastColor(color);
                                  const isMultiDay = (endIdx - startIdx) > 0;
                                  
                                  // Check if has intersection with any day that has hidden events
                                  let hasHiddenIntersection = false;
                                  for (let d = startIdx; d <= endIdx; d++) {
                                    if (weekHiddenCounts[d] > 0) {
                                      hasHiddenIntersection = true;
                                      break;
                                    }
                                  }

                                  if (!hasHiddenIntersection) {
                                    // No intersection -> Render normally as one continuous block
                                    const gridColStart = startIdx + 1;
                                    const gridColEnd = endIdx + 2;
                                    const isStartOfEvent = format(event.date, 'yyyy-MM-dd') >= format(week[0], 'yyyy-MM-dd');
                                    const isEndOfEvent = event.endDate ? (format(event.endDate, 'yyyy-MM-dd') <= format(week[6], 'yyyy-MM-dd')) : true;

                                    renderedElements.push(
                                      <div
                                        key={event.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectDate(event.date);
                                          setPopupDate(event.date);
                                        }}
                                        className={`
                                          pointer-events-auto h-[12px] sm:h-[15px] md:h-[18px] lg:h-[20px] shrink-0 flex items-center justify-start cursor-pointer transition-all select-none overflow-hidden hover:brightness-110 active:scale-[0.98] shadow-sm
                                          ${isStartOfEvent ? 'rounded-l-sm pl-1 sm:pl-1.5 md:pl-2 ml-[3px] md:ml-[4px]' : 'rounded-l-none pl-1 md:pl-1.5'}
                                          ${isEndOfEvent ? 'rounded-r-sm pr-1 sm:pr-1.5 md:pr-2 mr-[3px] md:mr-[4px]' : 'rounded-r-none pr-1 md:pr-1.5'}
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
                                            <div className={`w-0.5 h-0.5 sm:w-1 sm:h-1 md:w-1.5 md:h-1.5 rounded-full shrink-0 mr-1 md:mr-1.5 bg-current ${contrastClass}`} />
                                          )}
                                          <span className={`font-bold font-sans text-[6px] sm:text-[7.5px] md:text-[9.5px] leading-none truncate ${contrastClass} tracking-tighter`}>
                                            {event.title}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    // Split this event day-by-day so we can shorten and show "+N" on the day of overflow
                                    for (let d = startIdx; d <= endIdx; d++) {
                                      const day = week[d];
                                      const hiddenCount = weekHiddenCounts[d];

                                      if (hiddenCount > 0) {
                                        // This day has hidden events in slot 1 - shorten text and show +N badge on the right
                                        renderedElements.push(
                                          <div
                                            key={`${event.id}-split-${d}`}
                                            style={{
                                              gridColumn: `${d + 1} / ${d + 2}`,
                                              gridRow: '1',
                                            }}
                                            className="pointer-events-none flex flex-row items-center gap-0.5 md:gap-1 w-full h-[12px] sm:h-[15px] md:h-[18px] lg:h-[20px] min-w-0 px-[3px] md:px-[4px]"
                                          >
                                            <div
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectDate(day);
                                                setPopupDate(day);
                                              }}
                                              className={`
                                                pointer-events-auto flex-grow h-[12px] sm:h-[15px] md:h-[18px] lg:h-[20px] flex items-center justify-start cursor-pointer transition-all select-none overflow-hidden hover:brightness-110 active:scale-[0.98] shadow-sm rounded-sm px-1 min-w-0
                                              `}
                                              style={{
                                                backgroundColor: color,
                                              }}
                                              title={`${event.title}${event.description ? ': ' + event.description : ''}`}
                                            >
                                              <span className={`font-bold font-sans text-[6px] sm:text-[7px] md:text-[8.5px] leading-none truncate ${contrastClass} tracking-tighter`}>
                                                {event.title}
                                              </span>
                                            </div>
                                            
                                            <div
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectDate(day);
                                                setPopupDate(day);
                                              }}
                                              className="pointer-events-auto h-[12px] sm:h-[15px] md:h-[18px] lg:h-[20px] shrink-0 flex items-center justify-center bg-zinc-700/80 border border-zinc-650/30 hover:bg-zinc-600 hover:border-zinc-500 rounded-[3px] px-1 font-black font-sans text-white text-[7px] sm:text-[8px] md:text-[9.5px] leading-none transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md select-none"
                                              title={`${hiddenCount}개의 일정이 더 있습니다 (클릭 시 확인)`}
                                            >
                                              +{hiddenCount}
                                            </div>
                                          </div>
                                        );
                                      } else {
                                        // This day doesn't have hidden events, render simple single-day block nicely
                                        renderedElements.push(
                                          <div
                                            key={`${event.id}-split-${d}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onSelectDate(day);
                                              setPopupDate(day);
                                            }}
                                            className={`
                                              pointer-events-auto h-[12px] sm:h-[15px] md:h-[18px] lg:h-[20px] shrink-0 flex items-center justify-start cursor-pointer transition-all select-none overflow-hidden hover:brightness-110 active:scale-[0.98] shadow-sm px-0.5
                                              ${d === startIdx ? 'rounded-l-sm pl-1 sm:pl-1.5 md:pl-2 ml-[3px] md:ml-[4px]' : 'rounded-l-none pl-1 md:pl-1.5'}
                                              ${d === endIdx ? 'rounded-r-sm pr-1 sm:pr-1.5 md:pr-2 mr-[3px] md:mr-[4px]' : 'rounded-r-none pr-1 md:pr-1.5'}
                                            `}
                                            style={{
                                              gridColumn: `${d + 1} / ${d + 2}`,
                                              gridRow: '1',
                                              backgroundColor: color,
                                            }}
                                            title={`${event.title}${event.description ? ': ' + event.description : ''}`}
                                          >
                                            <div className="w-full flex items-center min-w-0">
                                              {isMultiDay && d === startIdx && (
                                                <div className={`w-0.5 h-0.5 sm:w-1 sm:h-1 md:w-1.5 md:h-1.5 rounded-full shrink-0 mr-1 md:mr-1.5 bg-current ${contrastClass}`} />
                                              )}
                                              <span className={`font-bold font-sans text-[6px] sm:text-[7.5px] md:text-[9.5px] leading-none truncate ${contrastClass} tracking-tighter`}>
                                                {event.title}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      }
                                    }
                                  }
                                });

                                // 2. Support days with hidden events but NO event in slot 1 at all!
                                week.forEach((day, d) => {
                                  const hasSlot1Event = slotEvents.some(p => p.startIdx <= d && d <= p.endIdx);
                                  const hiddenCount = weekHiddenCounts[d];
                                  if (hiddenCount > 0 && !hasSlot1Event) {
                                    renderedElements.push(
                                      <div
                                        key={`standalone-badge-${d}`}
                                        style={{
                                          gridColumn: `${d + 1} / ${d + 2}`,
                                          gridRow: '1',
                                        }}
                                        className="pointer-events-none flex flex-row items-center justify-end w-full h-[12px] sm:h-[15px] md:h-[18px] lg:h-[20px] min-w-0 pr-[3px] md:pr-[4px]"
                                      >
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectDate(day);
                                            setPopupDate(day);
                                          }}
                                          className="pointer-events-auto h-[12px] sm:h-[15px] md:h-[18px] lg:h-[20px] shrink-0 flex items-center justify-center bg-zinc-700/80 border border-zinc-650/30 hover:bg-zinc-600 hover:border-zinc-500 rounded-[3px] px-1 font-black font-sans text-white text-[7px] sm:text-[8px] md:text-[9.5px] leading-none transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md select-none"
                                          title={`${hiddenCount}개의 일정이 더 있습니다 (클릭 시 확인)`}
                                        >
                                          +{hiddenCount}
                                        </div>
                                      </div>
                                    );
                                  }
                                });

                                return renderedElements;
                              }
                            })()}
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
            onClick={() => setPopupDate(null)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0a1120] border border-white/10 w-full max-w-sm max-h-[85%] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <span className="text-white font-space text-xs font-bold tracking-widest uppercase mb-1">{format(popupDate, 'MMMM yyyy')}</span>
                  <span className="text-white font-sans text-2xl font-bold">{format(popupDate, 'd일 EEEE')}</span>
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
                      className="p-2 rounded-full bg-secondary-fixed-dim/10 border border-secondary-fixed-dim/20 text-white hover:bg-secondary-fixed-dim/20 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => setPopupDate(null)} className="p-2 rounded-full bg-white/5 border border-white/10 text-surface-dim hover:text-white hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex-grow space-y-4">
                {popupDateEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    <p className="text-surface-dim text-sm font-medium mb-4">등록된 학사일정이 없습니다.</p>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (onAddEventClick) {
                            onAddEventClick(popupDate);
                            setPopupDate(null);
                          }
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>일정 등록</span>
                      </button>
                    )}
                  </div>
                ) : (
                  popupDateEvents.map(event => (
                    <div 
                      key={event.id} 
                      className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => {
                        if (onItemClick) {
                          setPopupDate(null);
                          onItemClick(event, 'event');
                        }
                      }}
                    >
                      <div className="flex items-center mb-2">
                        <div className="w-2.5 h-2.5 rounded-full mr-3 shadow-sm shrink-0" style={{ backgroundColor: event.color || 'rgba(255,255,255,0.5)' }} />
                        <span className="text-white font-bold">{event.title}</span>
                      </div>
                      <span className="text-surface-dim text-sm pl-[22px] leading-relaxed whitespace-pre-wrap">{event.description}</span>
                      {event.endDate && event.date.getTime() !== event.endDate.getTime() && (
                        <span className="text-xs font-space text-surface-dim/60 pl-[22px] mt-2 bg-white/5 w-fit px-2 py-0.5 rounded">
                          {format(event.date, 'MMM d')} ~ {format(event.endDate, 'MMM d')}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
