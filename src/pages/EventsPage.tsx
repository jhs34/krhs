import { format, isAfter, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Calendar } from '../components/Calendar';
import { AcademicEvent } from '../types';

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

  const getDDayInfo = (eventDate: Date) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const eventStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    
    const diffTime = eventStart.getTime() - todayStart.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return {
        text: 'D-Day',
        className: 'bg-red-500/20 text-red-400 border-red-500/30'
      };
    } else if (diffDays > 0) {
      if (diffDays <= 7) {
        return {
          text: `D-${diffDays}`,
          className: 'bg-secondary/20 text-[#a78bfa] border-secondary/30'
        };
      }
      return {
        text: `D-${diffDays}`,
        className: 'bg-white/10 text-white border-white/15'
      };
    } else {
      return {
        text: `D+${Math.abs(diffDays)}`,
        className: 'bg-white/5 text-surface-dim/50 border-white/5'
      };
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-6 sm:space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="font-sans font-bold text-4xl md:text-5xl text-white tracking-tighter mb-4">
          학사일정
        </h2>
        <p className="text-surface-dim font-medium text-lg leading-relaxed max-w-2xl">
          학교의 주요 행사와 일정을 한눈에 확인하세요.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.2 }}
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
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="xl:col-span-4 relative min-h-[420px] xl:min-h-[500px]"
        >
          <div className="xl:absolute xl:inset-0 bg-[#0a1120] rounded-2xl sm:rounded-3xl border border-white/5 overflow-hidden flex flex-col h-full w-full">
            <div className="p-5 sm:p-6 pb-3.5 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary-fixed-dim shrink-0">
                  <CalendarIcon className="w-4 h-4 text-secondary-fixed-dim" strokeWidth={1.75} />
                </div>
                <h3 className="font-sans font-bold text-base sm:text-lg md:text-xl text-white tracking-tight">
                  {format(currentDate, 'yyyy년 M월')} 일정
                </h3>
              </div>
              <span className="text-xs font-mono text-surface-dim tabular-nums">
                {upcomingEvents.length}건
              </span>
            </div>
          
            <div className="p-5 sm:p-6 pt-4 flex-1 overflow-y-auto custom-scrollbar min-h-0">
              <ul className="space-y-3 pr-1 pb-2">
              {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                <li 
                  key={event.id} 
                  className="flex flex-col p-4 rounded-xl sm:rounded-2xl bg-white/[0.04] hover:bg-white/10 transition-colors group/item border border-white/5 cursor-pointer relative"
                  onClick={() => onItemClick(event, 'event')}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-space font-bold text-white tracking-wider uppercase bg-black/40 px-2 py-0.5 rounded">
                      {format(event.date, 'MMM dd')}
                      {event.endDate && event.date.getTime() !== event.endDate.getTime() && (
                        ` ~ ${format(event.endDate, 'MMM dd')}`
                      )}
                    </span>
                    {(() => {
                      const dday = getDDayInfo(event.date);
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-space font-bold border transition-colors ${dday.className}`}>
                          {dday.text}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-start pr-8">
                    {event.color && <div className="w-2 h-2 rounded-full mt-1.5 mr-2.5 shrink-0 shadow-sm" style={{ backgroundColor: event.color }} />}
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm sm:text-base font-bold text-white mb-0.5 group-hover/item:text-secondary-fixed-dim transition-colors">{event.title}</span>
                      {event.description && (
                        <span className="block text-xs sm:text-sm text-surface-dim line-clamp-2 whitespace-pre-wrap">{event.description}</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors opacity-100 md:opacity-0 md:group-hover/item:opacity-100 cursor-pointer"
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
              )) : (
                <li className="p-6 text-center text-xs sm:text-sm text-surface-dim bg-white/[0.03] rounded-2xl">예정된 학사 일정이 없습니다.</li>
              )}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
