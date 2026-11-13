import { format } from 'date-fns';
import { Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar } from '../components/Calendar';
import { AcademicEvent } from '../types';
import { EASE_OUT_EXPO, PORTAL_CARD_TRANSITION, PORTAL_HEADER_TRANSITION } from '../utils/motion';

interface EventsPageProps {
  events: AcademicEvent[];
  isAdmin: boolean;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onItemClick: (item: any, type: 'notice' | 'event' | 'document') => void;
  onEditItem: (tab: 'notices' | 'events' | 'documents', item: any) => void;
  onAddEventClick?: (date: Date) => void;
}

export function EventsPage({ 
  events, 
  isAdmin, 
  selectedDate, 
  onSelectDate, 
  currentDate, 
  onDateChange,
  onItemClick,
  onEditItem,
  onAddEventClick
}: EventsPageProps) {
  
  const upcomingEvents = events
    .filter(e => !e.isArchived)
    .filter(e => {
      const tMonth = currentDate.getMonth();
      const tYear = currentDate.getFullYear();
      const mStart = new Date(tYear, tMonth, 1);
      const mEnd = new Date(tYear, tMonth + 1, 0, 23, 59, 59);
      const eventStart = e.date;
      const eventEnd = e.endDate || e.date;
      return eventStart <= mEnd && eventEnd >= mStart;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const getDDayInfo = (eventDate: Date, eventEndDate?: Date) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const eventStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const effectiveEnd = eventEndDate || eventDate;
    const eventEndStart = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), effectiveEnd.getDate());
    
    const diffTime = eventStart.getTime() - todayStart.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return {
        text: 'D-Day',
        className: 'text-red-400 font-semibold'
      };
    } else if (todayStart > eventStart && todayStart <= eventEndStart) {
      return {
        text: '진행중',
        className: 'text-emerald-400 font-semibold'
      };
    } else if (diffDays > 0) {
      if (diffDays <= 7) {
        return {
          text: `D-${diffDays}`,
          className: 'text-secondary-container font-semibold'
        };
      }
      return {
        text: `D-${diffDays}`,
        className: 'text-surface-dim font-medium'
      };
    } else {
      const pastDays = Math.max(1, Math.round((todayStart.getTime() - eventEndStart.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        text: `D+${pastDays}`,
        className: 'text-surface-dim/60'
      };
    }
  };

  const monthKey = format(currentDate, 'yyyy-MM');

  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-6 sm:space-y-10">
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={PORTAL_HEADER_TRANSITION}
      >
        <h2 className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight mb-2 leading-[1.2] text-balance">
          학사일정
        </h2>
        <p className="text-surface-dim text-sm sm:text-base leading-relaxed max-w-2xl break-keep">
          연간 주요 행사 및 월별 학사일정 안내
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.04 }}
          className="xl:col-span-8 w-full"
        >
          <Calendar 
            currentDate={currentDate} 
            onDateChange={onDateChange} 
            events={events} 
            selectedDate={selectedDate} 
            onSelectDate={onSelectDate} 
            onItemClick={onItemClick}
            isAdmin={isAdmin}
            onAddEventClick={onAddEventClick}
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.08 }}
          className="xl:col-span-4 relative min-h-[420px] xl:min-h-[500px]"
        >
          <div className="xl:absolute xl:inset-0 bg-[#0a1120] rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col h-full w-full">
            <div className="p-5 sm:p-6 pb-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h3
                  key={`title-${monthKey}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
                  className="font-sans font-semibold text-base sm:text-lg text-white tracking-tight tabular-nums"
                >
                  {format(currentDate, 'yyyy년 M월')} 일정
                </motion.h3>
              </AnimatePresence>
              <span className="text-xs font-mono text-surface-dim tabular-nums">
                {upcomingEvents.length}건
              </span>
            </div>
          
            <div className="p-5 sm:p-6 pt-2 flex-1 overflow-y-auto custom-scrollbar min-h-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.ul
                  key={`list-${monthKey}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  className="divide-y divide-white/[0.06] pr-1"
                >
                  {upcomingEvents.length > 0 ? upcomingEvents.map(event => {
                    const dday = getDDayInfo(event.date, event.endDate);
                    return (
                      <li 
                        key={event.id} 
                        className="flex flex-col py-3.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition-colors group/item cursor-pointer relative"
                        onClick={() => onItemClick(event, 'event')}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-xs text-surface-dim flex-wrap">
                          <span className="font-mono tabular-nums text-white/80">
                            {format(event.date, 'yyyy.MM.dd')}
                            {event.endDate && format(event.date, 'yyyy-MM-dd') !== format(event.endDate, 'yyyy-MM-dd') && (
                              ` ~ ${format(event.endDate, 'MM.dd')}`
                            )}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-mono tabular-nums ${dday.className}`}>
                            {dday.text}
                          </span>
                        </div>
                        <div className="flex items-start pr-8">
                          {event.color && <span className="w-2 h-2 rounded-full mt-1.5 mr-2 shrink-0" style={{ backgroundColor: event.color }} />}
                          <div className="min-w-0 flex-1">
                            <span className="block text-sm sm:text-base font-medium text-white mb-0.5 group-hover/item:text-secondary-container transition-colors">{event.title}</span>
                            {event.description && (
                              <span className="block text-xs text-surface-dim line-clamp-2 whitespace-pre-wrap">{event.description}</span>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <button 
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.12] text-white transition-colors opacity-100 md:opacity-0 md:group-hover/item:opacity-100 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditItem('events', event);
                            }}
                            title="일정 수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </li>
                    );
                  }) : (
                    <li className="py-10 text-center text-xs sm:text-sm text-surface-dim list-none">이번 달에 예정된 학사일정이 없습니다.</li>
                  )}
                </motion.ul>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
