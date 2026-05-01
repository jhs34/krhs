import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AcademicEvent } from '../types';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  events: AcademicEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onItemClick?: (item: any, type: 'notice' | 'event' | 'document') => void;
}

export function Calendar({ currentDate, onDateChange, events, selectedDate, onSelectDate, onItemClick }: CalendarProps) {
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

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const popupDateEvents = popupDate ? events.filter(e => {
    const eStart = startOfDay(e.date);
    const eEnd = e.endDate ? startOfDay(e.endDate) : eStart;
    const dpStart = startOfDay(popupDate);
    return dpStart.getTime() >= eStart.getTime() && dpStart.getTime() <= eEnd.getTime();
  }) : [];

  return (
    <div className="bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden p-4 md:p-8 relative">
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <h3 className="font-sans font-bold text-lg md:text-2xl text-white tracking-tight">
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

      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 md:mb-4">
        {weekDays.map(day => (
          <div key={day} className="text-center text-surface-dim font-medium text-xs md:text-sm py-1 md:py-2">
            {day}
          </div>
        ))}
      </div>

      <div>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={monthStart.toISOString()}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-1 md:gap-2"
          >
            {days.map((day, i) => {
              const dayStart = startOfDay(day);
              const dayEvents = events.filter(e => {
                const eStart = startOfDay(e.date);
                const eEnd = e.endDate ? startOfDay(e.endDate) : eStart;
                return dayStart.getTime() >= eStart.getTime() && dayStart.getTime() <= eEnd.getTime();
              });
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const maxDisplay = 4;
              
              return (
                <div 
                  key={day.toString()} 
                  onClick={() => {
                    onSelectDate(day);
                    if (dayEvents.length > 0) setPopupDate(day);
                  }}
                  className={`
                    min-h-[40px] sm:min-h-[50px] md:min-h-[90px] lg:min-h-[120px] p-0.5 md:p-2 rounded-[4px] md:rounded-lg border flex flex-col items-center md:items-start justify-start cursor-pointer transition-all relative group overflow-hidden
                    ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}
                    ${isSelected 
                      ? 'border-white bg-white shadow-lg shadow-white/20 text-black' 
                      : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white'
                    }
                  `}
                >
                  <span className={`text-[7px] sm:text-[9px] md:text-xs lg:text-sm font-space shrink-0 mb-0.5 md:mb-1 ${isSelected ? 'text-black font-extrabold' : 'text-white font-medium'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="w-full mt-auto md:mt-0 mb-0.5 md:mb-0">
                    {/* Mobile View */}
                    <div className="block md:hidden w-full space-y-[1px]">
                      {dayEvents.slice(0, 2).map(event => (
                        <div key={event.id} 
                          className={`w-full overflow-hidden text-center flex items-center justify-center px-0.5 py-[1px] rounded-[1px] ${isSelected ? 'mix-blend-multiply' : ''}`}
                          style={{ backgroundColor: event.color || 'rgba(255,255,255,0.2)' }}
                        >
                          <span className={`block flex-1 min-w-0 truncate text-center text-[5px] leading-[6px] sm:text-[6px] sm:leading-[7px] font-bold ${isSelected ? 'text-black' : getContrastColor(event.color)} tracking-tighter`}>{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className={`w-full text-center px-0.5 py-[1px] rounded-[1px] text-[5px] leading-[6px] sm:text-[6px] sm:leading-[7px] font-bold ${isSelected ? 'text-black/60' : 'text-white/50'} tracking-tighter`}>
                          + {dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                    {/* Desktop View */}
                    <div className="hidden md:block w-full space-y-[3px] lg:space-y-1.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <div key={event.id} 
                          className={`w-full overflow-hidden text-left flex items-center justify-start px-1.5 py-1 lg:px-2 lg:py-1.5 rounded-sm lg:rounded ${isSelected ? 'mix-blend-multiply' : ''}`}
                          style={{ backgroundColor: event.color || 'rgba(255,255,255,0.2)' }}
                        >
                          {event.color && <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full shrink-0 mr-1.5 lg:mr-2" style={{ backgroundColor: isSelected ? 'rgba(0,0,0,0.5)' : (getContrastColor(event.color) === 'text-black' ? 'rgba(0,0,0,0.5)' : '#fff') }} />}
                          <span className={`block flex-1 min-w-0 truncate text-left text-[9px] leading-[10px] lg:text-[11px] lg:leading-[14px] font-bold ${isSelected ? 'text-black' : getContrastColor(event.color)} tracking-tighter`}>{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className={`w-full text-left px-1.5 py-1 lg:px-2 lg:py-1.5 rounded-sm lg:rounded text-[9px] leading-[10px] lg:text-[11px] lg:leading-[14px] font-bold ${isSelected ? 'text-black/60 hover:bg-black/5' : 'text-white/50 hover:bg-white/5'} transition-colors tracking-tighter cursor-pointer`}>
                          + {dayEvents.length - 3}개 더보기
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Date Detail Popup Modal */}
      <AnimatePresence>
        {popupDate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPopupDate(null)}
            className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 rounded-3xl"
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
                <button onClick={() => setPopupDate(null)} className="p-2 rounded-full bg-white/5 border border-white/10 text-surface-dim hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex-grow space-y-4">
                {popupDateEvents.map(event => (
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
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
