import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, FileText, Bell, Edit2, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { AcademicEvent } from '../types';
import { Notice, SchoolDocument } from '../services/firestore';
import { Calendar } from '../components/Calendar';
import { Link } from 'react-router-dom';

interface DashboardProps {
  upcomingEvents: AcademicEvent[];
  notices: Notice[];
  documents: SchoolDocument[];
  isAdmin: boolean;
  onItemClick: (item: any, type: 'notice' | 'event' | 'document') => void;
  onEditItem: (tab: 'notices' | 'events' | 'documents', item: any) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  events: AcademicEvent[];
  onAddEventClick?: (date: Date) => void;
}

export function Dashboard({
  upcomingEvents,
  notices,
  documents,
  isAdmin,
  onItemClick,
  onEditItem,
  currentDate,
  onDateChange,
  selectedDate,
  onSelectDate,
  events,
  onAddEventClick
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    const today = new Date();
    return searchQuery.trim()
      ? events
          .filter(e => !e.isArchived)
          .filter(e => 
            e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .sort((a, b) => {
            const diffA = Math.abs(a.date.getTime() - today.getTime());
            const diffB = Math.abs(b.date.getTime() - today.getTime());
            return diffA - diffB;
          })
      : [];
  }, [searchQuery, events]);

  const filteredNotices = useMemo(() => {
    return searchQuery.trim()
      ? notices
          .filter(n => 
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [];
  }, [searchQuery, notices]);

  const hasResults = filteredEvents.length > 0 || filteredNotices.length > 0;

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
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-10 sm:space-y-16 md:space-y-24">
      {/* Section 1: Dashboard Header */}
      <motion.div 
        initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="flex flex-col md:flex-row md:items-end justify-between border-b border-surface/10 pb-12 gap-8"
      >
        <div className="flex-grow">
          <h2 className="font-sans font-bold text-2xl sm:text-3xl md:text-5xl text-white tracking-tighter mb-3 leading-[1.2] md:leading-[1.15]">
            내 손안의 교무실,<br />
            <span className="text-surface-dim">학생 통합 터미널</span>
          </h2>
          <p className="text-surface-dim font-medium text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed break-keep">
            복잡한 공지와 일정, 이제 흩어진 정보를 찾지 마세요.<br className="hidden sm:block" /> 하나의 포털에서 완벽하게 연결됩니다.
          </p>
        </div>

        {/* Search input container aligned with header bottom on desktop */}
        <div className="w-full md:w-80 lg:w-[400px] shrink-0">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-surface-dim group-focus-within:text-white transition-colors">
              <Search className="w-5 h-5 opacity-70" strokeWidth={2} />
            </div>
            <input
              type="text"
              placeholder="일정, 공지사항 키워드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-white/5 hover:bg-white/10 focus:bg-[#0a1120] text-sm text-white outline-none rounded-2xl border border-white/10 focus:border-secondary-fixed-dim/40 transition-all font-sans placeholder:text-surface-dim/50 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3.5 flex items-center text-surface-dim hover:text-white transition-colors"
                title="검색어 지우기"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Search Results Panel */}
      {searchQuery.trim() && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a1120] rounded-[24px] border border-white/10 overflow-hidden p-6 md:p-8 lg:p-10 space-y-8"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center space-x-3">
              <h3 className="font-sans font-bold text-base md:text-lg text-white">
                &lsquo;<span className="text-secondary-fixed-dim">{searchQuery}</span>&rsquo; 검색 결과 (총 {filteredEvents.length + filteredNotices.length}건)
              </h3>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-surface-dim hover:text-white transition-colors cursor-pointer"
            >
              검색 닫기
            </button>
          </div>

          {!hasResults ? (
            <div className="text-center py-12 text-surface-dim">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-30 text-white" />
              <p className="text-sm font-medium">검색 결과가 없습니다.</p>
              <p className="text-xs opacity-75 mt-1">다른 키워드로 다시 검색해보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Event Results */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-white font-bold text-sm uppercase tracking-wider opacity-80 border-b border-white/15 pb-2">
                  <CalendarIcon className="w-4 h-4 text-secondary-fixed-dim" />
                  <span>학사 일정 ({filteredEvents.length})</span>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredEvents.length > 0 ? (
                    filteredEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => onItemClick(event, 'event')}
                        className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-xs text-surface-dim flex items-center gap-2 flex-wrap font-space mb-1">
                            <span>
                              {format(event.date, 'yyyy.MM.dd')}
                              {event.endDate && event.date.getTime() !== event.endDate.getTime() && ` ~ ${format(event.endDate, 'yyyy.MM.dd')}`}
                            </span>
                            {(() => {
                              const dday = getDDayInfo(event.date);
                              return (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-space font-bold border ${dday.className}`}>
                                  {dday.text}
                                </span>
                              );
                            })()}
                          </span>
                          <span className="text-white font-medium group-hover:text-secondary-fixed-dim transition-colors block truncate">
                            {event.title}
                          </span>
                          {event.description && (
                            <span className="text-xs text-surface-dim block truncate mt-1">
                              {event.description}
                            </span>
                          )}
                        </div>
                        {event.color && (
                          <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: event.color }} />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-surface-dim py-4 text-center">일치하는 학사 일정이 없습니다.</p>
                  )}
                </div>
              </div>

              {/* Notice Results */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-white font-bold text-sm uppercase tracking-wider opacity-80 border-b border-white/15 pb-2">
                  <Bell className="w-4 h-4 text-tertiary-fixed-dim" />
                  <span>공지사항 ({filteredNotices.length})</span>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredNotices.length > 0 ? (
                    filteredNotices.map(notice => (
                      <div
                        key={notice.id}
                        onClick={() => onItemClick(notice, 'notice')}
                        className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between min-w-0">
                          <span className="text-xs text-surface-dim block font-space mb-1">
                            {format(new Date(notice.date), 'yyyy.MM.dd')}
                          </span>
                        </div>
                        <span className="text-white font-medium group-hover:text-tertiary-fixed-dim transition-colors block truncate">
                          {notice.title}
                        </span>
                        {notice.content && (
                          <span className="text-xs text-surface-dim block truncate mt-1">
                            {notice.content}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-surface-dim py-4 text-center">일치하는 공지사항이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Dashboard Grid - Editorial Layout */}
      <div id="dashboard-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Schedule Card: Balanced 2-Column Grid inside 12-col container */}
        <motion.div 
          id="upcoming-schedule"
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8 }}
          className="sm:col-span-2 xl:col-span-12 bg-[#0a1120] rounded-2xl sm:rounded-3xl border border-white/5 overflow-hidden group hover:border-white/10 transition-colors p-5 sm:p-6 md:p-8"
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary-fixed-dim shrink-0">
                <CalendarIcon className="w-4 h-4 text-secondary-fixed-dim" strokeWidth={1.75} />
              </div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h3 className="font-sans font-bold text-base sm:text-lg md:text-xl text-white tracking-tight">다가오는 학사 일정</h3>
                <span className="text-surface-dim text-xs hidden sm:inline">중요한 학교 일정을 확인하세요</span>
              </div>
            </div>
            <Link to="/events" className="border border-white/10 hover:border-white/30 text-white/80 hover:text-white rounded-full px-3 py-1 bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium shrink-0">
              더보기
            </Link>
          </div>
          
          {upcomingEvents.length > 0 ? (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {upcomingEvents.map((event, idx) => {
                const dday = getDDayInfo(event.date);
                return (
                  <motion.li 
                    key={event.id} 
                    initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] transition-colors group/item border border-white/5 cursor-pointer relative flex items-center justify-between gap-3"
                    onClick={() => onItemClick(event, 'event')}
                  >
                    {/* Left: Compact Date Badge + Title/Desc */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Date Block */}
                      <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 shrink-0 min-w-[48px] sm:min-w-[54px] text-center">
                        <span className="text-[9px] sm:text-[10px] font-space font-bold text-surface-dim tracking-wider uppercase leading-none">{format(event.date, 'MMM')}</span>
                        <span className="text-sm sm:text-base font-space font-bold text-white leading-none mt-1">{format(event.date, 'dd')}</span>
                        {event.endDate && event.date.getTime() !== event.endDate.getTime() && (
                          <span className="text-[8px] sm:text-[9px] font-space text-surface-dim font-medium leading-none mt-0.5">~{format(event.endDate, 'dd')}</span>
                        )}
                      </div>

                      {/* Content Column */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {event.color && (
                            <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: event.color }} />
                          )}
                          <h4 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover/item:text-secondary-fixed-dim transition-colors truncate">
                            {event.title}
                          </h4>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-space font-bold border shrink-0 transition-colors ml-auto ${dday.className}`}>
                            {dday.text}
                          </span>
                        </div>

                        {event.description && (
                          <p className="text-[11px] sm:text-xs text-surface-dim truncate leading-relaxed">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Edit Button (if Admin) */}
                    {isAdmin && (
                      <button 
                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem('events', event);
                        }}
                        title="일정 수정"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 sm:p-5 text-center text-xs sm:text-sm text-surface-dim bg-white/[0.03] rounded-xl sm:rounded-2xl">
              예정된 학사 일정이 없습니다.
            </div>
          )}
        </motion.div>

        {/* Notices */}
        <motion.div
          id="notices-section"
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="sm:col-span-1 xl:col-span-6 bg-[#0a1120] rounded-2xl sm:rounded-3xl border border-white/5 overflow-hidden p-5 sm:p-6 md:p-8 flex flex-col"
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-tertiary-fixed-dim/10 border border-tertiary-fixed-dim/20 flex items-center justify-center text-tertiary-fixed-dim shrink-0">
                <Bell className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <h3 className="font-sans font-bold text-base sm:text-lg md:text-xl text-white tracking-tight">공지사항</h3>
            </div>
            <Link to="/notices" className="border border-white/10 hover:border-white/30 text-white/80 hover:text-white rounded-full px-3 py-1 bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium shrink-0">
              더보기
            </Link>
          </div>
          
          <ul className="divide-y divide-white/5 flex-1">
            {notices.length > 0 ? notices.slice(0, 5).map((notice, idx) => (
              <motion.li 
                key={notice.id} 
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group cursor-pointer py-3 first:pt-0 last:pb-0 relative flex items-center justify-between gap-3"
                onClick={() => onItemClick(notice, 'notice')}
              >
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-space text-surface-dim/80 mb-0.5 tracking-wider uppercase">
                    {format(new Date(notice.date), 'yyyy.MM.dd')}
                  </span>
                  <span className="block text-sm sm:text-base text-white font-medium group-hover:text-tertiary-fixed-dim transition-colors line-clamp-1 leading-snug">
                    {notice.title}
                  </span>
                </div>
                {isAdmin && (
                  <button 
                    className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditItem('notices', notice);
                    }}
                    title="공지 수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.li>
            )) : (
              <li className="text-xs sm:text-sm text-surface-dim text-center py-6 list-none">
                등록된 공지사항이 없습니다.
              </li>
            )}
          </ul>
        </motion.div>
          
        {/* Documents */}
        <motion.div 
          id="documents-section"
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="sm:col-span-1 xl:col-span-6 bg-[#0a1120] rounded-2xl sm:rounded-3xl border border-white/5 overflow-hidden p-5 sm:p-6 md:p-8 flex flex-col"
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
                <FileText className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <h3 className="font-sans font-bold text-base sm:text-lg md:text-xl text-white tracking-tight">문서 자료실</h3>
            </div>
            <Link to="/documents" className="border border-white/10 hover:border-white/30 text-white/80 hover:text-white rounded-full px-3 py-1 bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium shrink-0">
              더보기
            </Link>
          </div>
          
          <div className="space-y-2.5 flex-1">
            {documents.length > 0 ? documents.slice(0, 4).map((doc, idx) => (
              <motion.div 
                key={doc.id} 
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="flex flex-col p-3.5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] group/doc cursor-pointer relative transition-colors"
                onClick={() => onItemClick(doc, 'document')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center min-w-0 flex-1">
                    <FileText className="w-4 h-4 text-surface-dim group-hover/doc:text-white mr-2.5 shrink-0 transition-colors" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-white group-hover/doc:text-secondary-fixed-dim transition-colors truncate">{doc.title}</p>
                      {doc.description && (
                        <p className="text-[11px] text-surface-dim mt-0.5 truncate">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors opacity-100 md:opacity-0 md:group-hover/doc:opacity-100 shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditItem('documents', doc);
                      }}
                      title="문서 수정"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {(doc.files?.length || doc.fileUrl) && (
                  <div className="flex flex-wrap gap-1.5 ml-6.5 mt-2">
                    {doc.files?.length ? doc.files.map((file, fIdx) => (
                      <a key={fIdx} href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[11px] text-surface-dim hover:text-white bg-white/5 px-2 py-0.5 rounded transition-colors max-w-full" onClick={(e) => e.stopPropagation()}>
                        <span className="truncate font-space">{file.name}</span>
                      </a>
                    )) : doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[11px] text-surface-dim hover:text-white bg-white/5 px-2 py-0.5 rounded transition-colors max-w-full" onClick={(e) => e.stopPropagation()}>
                        <span className="truncate font-space">{doc.fileName}</span>
                      </a>
                    )}
                  </div>
                )}
              </motion.div>
            )) : (
              <div className="text-xs sm:text-sm text-surface-dim text-center py-6">
                등록된 문서가 없습니다.
              </div>
            )}
          </div>
        </motion.div>

      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full -mt-2 lg:-mt-6 relative z-20"
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
    </div>
  );
}
