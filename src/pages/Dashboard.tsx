import { useState } from 'react';
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

  const today = new Date();

  const filteredEvents = searchQuery.trim()
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

  const filteredNotices = searchQuery.trim()
    ? notices
        .filter(n => 
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

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
          <div className="flex items-center space-x-3 mb-4">
            <span className="status-chip text-[8px] bg-secondary/20 text-white border border-secondary/30">
              SYSTEM READY
            </span>
            <span className="text-[10px] sm:text-xs font-space text-surface-dim/60 font-medium tracking-widest uppercase">
              Terminal ID: KRHS-STU-26
            </span>
          </div>
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
              <span className="status-chip text-[8px] bg-secondary/20 text-white border border-secondary/30">
                SEARCH TERMINAL
              </span>
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
      <div id="dashboard-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-8">
        
        {/* Massive Card: Schedule */}
        <motion.div 
          id="upcoming-schedule"
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="sm:col-span-2 xl:col-span-12 bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden group hover:border-white/10 transition-colors p-6 md:p-10 lg:p-12"
        >
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-4 text-secondary-fixed-dim">
                <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans font-bold text-xl md:text-3xl text-white tracking-tight mb-2">다가오는 학사 일정</h3>
              <p className="text-surface-dim text-xs md:text-base">중요한 순간을 놓치지 않도록.</p>
            </div>
            <Link to="/events" className="border border-white/10 hover:border-white/30 text-white rounded-full px-3 py-1.5 bg-white/5 transition-colors text-xs md:text-sm font-medium">
              더보기
            </Link>
          </div>
          
          <ul className="space-y-4 md:space-y-6">
            {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
              <li 
                key={event.id} 
                className="flex flex-col md:flex-row md:items-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group/item border border-white/5 cursor-pointer relative"
                onClick={() => onItemClick(event, 'event')}
              >
                <div className="flex flex-row items-center gap-3 md:gap-4 mr-8 mb-4 md:mb-0 shrink-0">
                  <div className="flex flex-col items-center w-14 sm:w-16 shrink-0">
                    <span className="text-xs sm:text-sm font-space font-bold text-white tracking-widest uppercase">{format(event.date, 'MMM')}</span>
                    <span className="text-3xl sm:text-4xl font-space font-bold text-white leading-none mb-0.5">{format(event.date, 'dd')}</span>
                    {event.endDate && event.date.getTime() !== event.endDate.getTime() && (
                      <span className="text-[10px] sm:text-xs font-space text-surface-dim font-bold text-center">~ {format(event.endDate, 'dd')}</span>
                    )}
                  </div>
                  {(() => {
                    const dday = getDDayInfo(event.date);
                    return (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-space font-bold border shrink-0 transition-colors ${dday.className}`}>
                        {dday.text}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex-grow flex items-start pr-8 min-w-0">
                  {event.color && <div className="w-2.5 h-2.5 rounded-full mt-2 mr-3 md:mr-4 shrink-0 shadow-sm" style={{ backgroundColor: event.color }} />}
                  <div className="flex-1 min-w-0">
                    <span className="block text-xl font-bold text-white mb-2 group-hover/item:text-secondary-fixed-dim transition-colors truncate">{event.title}</span>
                    <span 
                      className="block text-xs md:text-sm text-surface-dim break-words" 
                      style={{ 
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {event.description}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <button 
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors"
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
              <li className="p-6 text-center text-surface-dim">예정된 학사 일정이 없습니다.</li>
            )}
          </ul>
        </motion.div>

        {/* Notices */}
        <motion.div
          id="notices-section"
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="sm:col-span-1 xl:col-span-6 bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden p-6 md:p-8 flex-grow flex flex-col justify-between"
        >
            <div className="flex items-start justify-between mb-4 md:mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-tertiary-fixed-dim/10 border border-tertiary-fixed-dim/20 flex items-center justify-center text-tertiary-fixed-dim">
                <Bell className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
              </div>
              <Link to="/notices" className="text-[10px] md:text-xs font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1 md:py-1.5 rounded-full transition-colors border border-white/5">더보기</Link>
            </div>
            <h3 className="font-sans font-bold text-xl md:text-2xl text-white tracking-tight mb-1 md:mb-2">공지사항</h3>
            <p className="text-surface-dim text-xs md:text-sm mb-4 md:mb-6">학교의 주요 소식을 확인하세요.</p>
            
            <ul className="space-y-3 md:space-y-4 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {notices.length > 0 ? notices.slice(0, 5).map(notice => (
                <li 
                  key={notice.id} 
                  className="group cursor-pointer border-b border-white/5 pb-4 last:border-0 last:pb-0 relative"
                  onClick={() => onItemClick(notice, 'notice')}
                >
                  <div className="flex items-start justify-between pr-8">
                    <div>
                      <span className="block text-xs font-space text-surface-dim mb-1 tracking-widest uppercase">{format(new Date(notice.date), 'MMM dd, yyyy')}</span>
                      <span className="block text-white font-medium group-hover:text-tertiary-fixed-dim transition-colors line-clamp-2 leading-snug">{notice.title}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      className="absolute right-0 top-0 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditItem('notices', notice);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              )) : (
                <motion.li 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-sm text-surface-dim text-center py-4 list-none"
                >
                  등록된 공지사항이 없습니다.
                </motion.li>
              )}
            </ul>
          </motion.div>
          
          {/* Documents */}
          <motion.div 
            id="documents-section"
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="sm:col-span-1 xl:col-span-6 bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden p-6 md:p-8 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-4 md:mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <FileText className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
              </div>
              <Link to="/documents" className="text-[10px] md:text-xs font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1 md:py-1.5 rounded-full transition-colors border border-white/5">더보기</Link>
            </div>
            <h3 className="font-sans font-bold text-xl md:text-2xl text-white tracking-tight mb-4 md:mb-6">문서 자료실</h3>
            
            <div className="space-y-3">
              {documents.length > 0 ? documents.slice(0, 5).map(doc => (
                <div 
                  key={doc.id} 
                  className="flex flex-col p-4 rounded-xl border border-white/5 bg-white/5 group/doc cursor-pointer relative"
                  onClick={() => onItemClick(doc, 'document')}
                >
                  <div className="flex items-center mb-2 pr-8">
                    <FileText className="w-5 h-5 text-surface-dim group-hover/doc:text-white mr-4 shrink-0 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white group-hover/doc:text-secondary-fixed-dim transition-colors truncate">{doc.title}</p>
                      <p className="text-xs text-surface-dim mt-0.5 truncate whitespace-pre-wrap">{doc.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1.5 ml-9 mt-2">
                    {doc.files?.length ? doc.files.map((file, idx) => (
                      <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-surface-dim hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20 mr-2 shrink-0"></span>
                        <span className="truncate font-space">{file.name}</span>
                      </a>
                    )) : doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-surface-dim hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20 mr-2 shrink-0"></span>
                        <span className="truncate font-space">{doc.fileName}</span>
                      </a>
                    )}
                  </div>
                  {isAdmin && (
                    <button 
                      className="absolute right-3 top-4 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors opacity-0 group-hover/doc:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditItem('documents', doc);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-sm text-surface-dim text-center py-4"
                >
                  등록된 문서가 없습니다.
                </motion.div>
              )}
            </div>
          </motion.div>

      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
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
