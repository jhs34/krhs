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
    <div className="bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden p-8 relative">
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-sans font-bold text-2xl text-white tracking-tight">
          {format(currentDate, 'yyyy년 M월')}
        </h3>
        <div className="flex space-x-2 items-center">
          <button
            onClick={() => {
              const today = new Date();
              onDateChange(today);
              onSelectDate(today);
              setPopupDate(null);
            }}
            className="px-4 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-white hover:bg-white/10 transition-colors mr-2"
          >
            오늘
          </button>
          <button 
            onClick={prevMonth}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map(day => (
          <div key={day} className="text-center text-surface-dim font-medium text-sm py-2">
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
            className="grid grid-cols-7 gap-2"
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
                    min-h-[150px] p-2 rounded-xl border flex flex-col items-start justify-start cursor-pointer transition-all relative group
                    ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}
                    ${isSelected 
                      ? 'border-white bg-white shadow-lg shadow-white/20 text-black' 
                      : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white'
                    }
                  `}
                >
                  <span className={`text-sm font-space mb-1 shrink-0 ${isSelected ? 'text-black font-extrabold' : 'text-white font-medium'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="w-full space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div key={event.id} 
                        className={`w-full text-left flex items-center px-1.5 py-1 rounded ${isSelected ? 'text-black mix-blend-multiply' : 'text-white'}`}
                        style={{ backgroundColor: event.color ? (isSelected ? `${event.color}40` : `${event.color}20`) : (isSelected ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)') }}
                      >
                        {event.color && <div className="w-1.5 h-1.5 rounded-full shrink-0 mr-1.5" style={{ backgroundColor: event.color }} />}
                        <span className={`truncate text-[10px] font-medium ${isSelected ? 'text-black' : 'text-white'}`}>{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-bold ${isSelected ? 'text-black/60 hover:text-black' : 'text-white/50 hover:text-white'} transition-colors`}>
                        + {dayEvents.length - 3}개 더보기
                      </div>
                    )}
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
