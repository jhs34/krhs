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
}

export function EventsPage({ 
  events, 
  isAdmin, 
  selectedDate, 
  onSelectDate, 
  currentDate, 
  onDateChange,
  onItemClick,
  onEditItem
}: EventsPageProps) {
  
  const upcomingEvents = events
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

  return (
    <div className="max-w-[1600px] w-full mx-auto px-6 md:px-12 flex flex-col space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <span className="status-chip bg-secondary/20 text-white border border-secondary/30">
            ACADEMIC CALENDAR
          </span>
        </div>
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
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="xl:col-span-4 relative min-h-[500px]"
        >
          <div className="xl:absolute xl:inset-0 bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden flex flex-col h-full w-full">
            <div className="p-8 pb-4 flex items-start justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-6 text-secondary-fixed-dim">
                <CalendarIcon className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans font-bold text-2xl text-white tracking-tight mb-2">
                {format(currentDate, 'yyyy년 M월')} 일정
              </h3>
            </div>
          </div>
          
          <div className="p-8 pt-0 flex-1 overflow-y-auto custom-scrollbar min-h-0">
            <ul className="space-y-4 pr-2 pb-4">
            {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
              <li 
                key={event.id} 
                className="flex flex-col p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group/item border border-white/5 cursor-pointer relative"
                onClick={() => onItemClick(event, 'event')}
              >
                <div className="flex items-center mb-3">
                  <span className="text-xs font-space font-bold text-white tracking-widest uppercase bg-black/40 px-2 py-1 rounded">
                    {format(event.date, 'MMM dd')}
                    {event.endDate && event.date.getTime() !== event.endDate.getTime() && (
                      ` ~ ${format(event.endDate, 'MMM dd')}`
                    )}
                  </span>
                </div>
                <div className="flex items-start pr-6">
                  {event.color && <div className="w-2 h-2 rounded-full mt-1.5 mr-3 shrink-0 shadow-sm" style={{ backgroundColor: event.color }} />}
                  <div>
                    <span className="block text-lg font-bold text-white mb-1 group-hover/item:text-secondary-fixed-dim transition-colors">{event.title}</span>
                    <span className="block text-sm text-surface-dim line-clamp-2 whitespace-pre-wrap">{event.description}</span>
                  </div>
                </div>
                {isAdmin && (
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors opacity-0 group-hover/item:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditItem('events', event);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            )) : (
              <li className="p-6 text-center text-surface-dim bg-white/5 rounded-2xl">예정된 학사 일정이 없습니다.</li>
            )}
          </ul>
          </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
