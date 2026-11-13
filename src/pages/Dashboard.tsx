import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Edit2, Search, X, ExternalLink, Download, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AcademicEvent } from '../types';
import { Notice, SchoolDocument } from '../services/firestore';
import { Calendar } from '../components/Calendar';
import { Link } from 'react-router-dom';
import { EASE_OUT_EXPO, PORTAL_CARD_TRANSITION, PORTAL_HEADER_TRANSITION, staggerDelay } from '../utils/motion';

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

  const isMultiDayEvent = (start: Date, end?: Date) =>
    Boolean(end && format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd'));

  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-10 sm:space-y-14 md:space-y-20">
      {/* Section 1: Dashboard Header */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={PORTAL_HEADER_TRANSITION}
        className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/[0.08] pb-8 sm:pb-10 gap-6"
      >
        <div className="flex-grow">
          <h2 className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight mb-2.5 leading-[1.2] text-balance">
            학사 대시보드
          </h2>
          <p className="text-surface-dim text-sm sm:text-base max-w-2xl leading-relaxed break-keep">
            진행 중인 주요 학사일정과 최근 공지사항, 배부 문서 요약
          </p>
        </div>

        {/* Search input container aligned with header bottom on desktop */}
        <div className="w-full md:w-80 lg:w-96 shrink-0">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-surface-dim group-focus-within:text-white transition-colors">
              <Search className="w-4 h-4 opacity-75" strokeWidth={2} />
            </div>
            <input
              type="text"
              placeholder="일정, 공지사항 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[#0a1120] hover:bg-[#0f182b] focus:bg-[#0f182b] text-sm text-white outline-none rounded-xl border border-white/10 focus:border-secondary-fixed-dim/50 transition-colors font-sans placeholder:text-surface-dim/55"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  key="clear-dashboard-search"
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.14 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-surface-dim hover:text-white transition-colors cursor-pointer"
                  title="검색어 지우기"
                >
                  <X className="w-4 h-4" strokeWidth={2.25} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Search Results Panel */}
      <AnimatePresence>
        {searchQuery.trim() && (
          <motion.div
            key="dashboard-search-results"
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className="bg-[#0a1120] rounded-2xl border border-white/[0.08] overflow-hidden p-5 sm:p-7 md:p-8 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="font-sans font-semibold text-base md:text-lg text-white">
                &lsquo;<span className="text-secondary-container">{searchQuery}</span>&rsquo; 검색 결과 <span className="font-mono tabular-nums text-sm text-surface-dim ml-1">({filteredEvents.length + filteredNotices.length}건)</span>
              </h3>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-surface-dim hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                닫기
              </button>
            </div>

            {!hasResults ? (
              <div className="text-center py-10 text-surface-dim">
                <p className="text-sm font-medium text-white/80">일치하는 검색 결과가 없습니다.</p>
                <p className="text-xs text-surface-dim mt-1">다른 검색어로 다시 시도해보세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Event Results */}
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-2">
                    <span className="text-sm font-semibold text-white">학사일정</span>
                    <span className="text-xs font-mono tabular-nums text-surface-dim">{filteredEvents.length}건</span>
                  </div>
                  <div className="divide-y divide-white/[0.06] max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map(event => {
                        const dday = getDDayInfo(event.date, event.endDate);
                        return (
                          <div
                            key={event.id}
                            onClick={() => onItemClick(event, 'event')}
                            className="py-3 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-surface-dim flex items-center gap-1.5 flex-wrap mb-1">
                                <span className="font-mono tabular-nums">
                                  {format(event.date, 'yyyy.MM.dd')}
                                  {isMultiDayEvent(event.date, event.endDate) && event.endDate && ` ~ ${format(event.endDate, 'yyyy.MM.dd')}`}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className={`font-mono tabular-nums ${dday.className}`}>
                                  {dday.text}
                                </span>
                              </div>
                              <span className="text-sm text-white font-medium group-hover:text-secondary-container transition-colors block truncate">
                                {event.title}
                              </span>
                              {event.description && (
                                <span className="text-xs text-surface-dim block truncate mt-0.5">
                                  {event.description}
                                </span>
                              )}
                            </div>
                            {event.color && (
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-surface-dim py-6 text-center">일치하는 학사일정이 없습니다.</p>
                    )}
                  </div>
                </div>

                {/* Notice Results */}
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-2">
                    <span className="text-sm font-semibold text-white">공지사항</span>
                    <span className="text-xs font-mono tabular-nums text-surface-dim">{filteredNotices.length}건</span>
                  </div>
                  <div className="divide-y divide-white/[0.06] max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredNotices.length > 0 ? (
                      filteredNotices.map(notice => (
                        <div
                          key={notice.id}
                          onClick={() => onItemClick(notice, 'notice')}
                          className="py-3 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors flex flex-col justify-between group"
                        >
                          <span className="text-xs text-surface-dim font-mono tabular-nums mb-1">
                            {format(new Date(notice.date), 'yyyy.MM.dd')}
                          </span>
                          <span className="text-sm text-white font-medium group-hover:text-secondary-container transition-colors block truncate">
                            {notice.title}
                          </span>
                          {notice.content && (
                            <span className="text-xs text-surface-dim block truncate mt-0.5">
                              {notice.content}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-surface-dim py-6 text-center">일치하는 공지사항이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Grid */}
      <div id="dashboard-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Schedule Section: Single-elevation container with clean hairline rows */}
        <motion.div 
          id="upcoming-schedule"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={PORTAL_CARD_TRANSITION}
          className="sm:col-span-2 xl:col-span-12 bg-[#0a1120] rounded-2xl border border-white/[0.08] overflow-hidden p-5 sm:p-6 md:p-8"
        >
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/[0.06]">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h3 className="font-sans font-semibold text-base sm:text-lg md:text-xl text-white tracking-tight">다가오는 학사일정</h3>
              <span className="text-surface-dim text-xs hidden sm:inline">예정 및 진행 중인 주요 일정</span>
            </div>
            <Link to="/events" className="inline-flex items-center gap-1 text-xs font-medium text-surface-dim hover:text-white transition-colors whitespace-nowrap shrink-0">
              <span>전체보기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          {upcomingEvents.length > 0 ? (
            <ul className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8 divide-y divide-white/[0.06] lg:divide-y-0">
              {upcomingEvents.map((event, idx) => {
                const dday = getDDayInfo(event.date, event.endDate);
                const isBottomDesktopRow =
                  upcomingEvents.length % 2 === 0
                    ? idx >= upcomingEvents.length - 2
                    : idx === upcomingEvents.length - 1;
                return (
                  <motion.li 
                    key={event.id} 
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.24, delay: staggerDelay(idx, 0.035, 0.14), ease: EASE_OUT_EXPO }}
                    className={`py-3.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition-colors group/item cursor-pointer relative flex items-center justify-between gap-3 ${
                      !isBottomDesktopRow ? 'lg:border-b lg:border-white/[0.06]' : ''
                    }`}
                    onClick={() => onItemClick(event, 'event')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs text-surface-dim mb-1 flex-wrap">
                        <span className="font-mono tabular-nums text-white/80">
                          {format(event.date, 'yyyy.MM.dd')}
                          {isMultiDayEvent(event.date, event.endDate) && event.endDate && ` ~ ${format(event.endDate, 'MM.dd')}`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-mono tabular-nums ${dday.className}`}>
                          {dday.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 min-w-0">
                        {event.color && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                        )}
                        <h4 className="text-sm sm:text-base font-medium text-white group-hover/item:text-secondary-container transition-colors truncate">
                          {event.title}
                        </h4>
                      </div>

                      {event.description && (
                        <p className="text-xs text-surface-dim truncate leading-relaxed mt-0.5">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <button 
                        className="p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.12] text-white transition-colors shrink-0 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 cursor-pointer"
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
            <div className="py-8 text-center text-xs sm:text-sm text-surface-dim">
              예정된 학사일정이 없습니다.
            </div>
          )}
        </motion.div>

        {/* Notices */}
        <motion.div
          id="notices-section"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.04 }}
          className="sm:col-span-1 xl:col-span-6 bg-[#0a1120] rounded-2xl border border-white/[0.08] overflow-hidden p-5 sm:p-6 md:p-8 flex flex-col"
        >
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/[0.06]">
            <h3 className="font-sans font-semibold text-base sm:text-lg md:text-xl text-white tracking-tight">공지사항</h3>
            <Link to="/notices" className="inline-flex items-center gap-1 text-xs font-medium text-surface-dim hover:text-white transition-colors whitespace-nowrap shrink-0">
              <span>전체보기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <ul className="divide-y divide-white/[0.06] flex-1">
            {notices.length > 0 ? notices.slice(0, 5).map((notice, idx) => (
              <motion.li 
                key={notice.id} 
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.24, delay: staggerDelay(idx, 0.03, 0.15), ease: EASE_OUT_EXPO }}
                className="group cursor-pointer py-3.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition-colors relative flex items-center justify-between gap-3"
                onClick={() => onItemClick(notice, 'notice')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-surface-dim mb-1">
                    <span className="font-mono tabular-nums">
                      {format(new Date(notice.date), 'yyyy.MM.dd')}
                    </span>
                    {((notice.files && notice.files.length > 0) || notice.fileUrl) && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>첨부 {notice.files?.length || 1}건</span>
                      </>
                    )}
                    {notice.link && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>참고 링크</span>
                      </>
                    )}
                  </div>
                  <span className="block text-sm sm:text-base text-white font-medium group-hover:text-secondary-container transition-colors line-clamp-1 leading-snug">
                    {notice.title}
                  </span>
                </div>
                {isAdmin && (
                  <button 
                    className="p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.12] text-white transition-colors shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
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
              <li className="text-xs sm:text-sm text-surface-dim text-center py-8 list-none">
                등록된 공지사항이 없습니다.
              </li>
            )}
          </ul>
        </motion.div>
          
        {/* Documents */}
        <motion.div 
          id="documents-section"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.08 }}
          className="sm:col-span-1 xl:col-span-6 bg-[#0a1120] rounded-2xl border border-white/[0.08] overflow-hidden p-5 sm:p-6 md:p-8 flex flex-col"
        >
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/[0.06]">
            <h3 className="font-sans font-semibold text-base sm:text-lg md:text-xl text-white tracking-tight">문서 자료실</h3>
            <Link to="/documents" className="inline-flex items-center gap-1 text-xs font-medium text-surface-dim hover:text-white transition-colors whitespace-nowrap shrink-0">
              <span>전체보기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="divide-y divide-white/[0.06] flex-1">
            {documents.length > 0 ? documents.slice(0, 4).map((doc, idx) => (
              <motion.div 
                key={doc.id} 
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.24, delay: staggerDelay(idx, 0.03, 0.15), ease: EASE_OUT_EXPO }}
                className="flex flex-col py-3.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] group/doc cursor-pointer relative transition-colors"
                onClick={() => onItemClick(doc, 'document')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-medium text-white group-hover/doc:text-secondary-container transition-colors truncate">{doc.title}</p>
                    {doc.description && (
                      <p className="text-xs text-surface-dim mt-0.5 truncate">{doc.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <button 
                      className="p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.12] text-white transition-colors opacity-100 md:opacity-0 md:group-hover/doc:opacity-100 shrink-0 cursor-pointer"
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
                {(doc.files?.length || doc.fileUrl || doc.link) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                    {doc.files?.length ? doc.files.map((file, fIdx) => (
                      <a key={fIdx} href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-surface-dim hover:text-white transition-colors max-w-full" onClick={(e) => e.stopPropagation()}>
                        <Download className="w-3 h-3 shrink-0 opacity-70" />
                        <span className="truncate">{file.name}</span>
                      </a>
                    )) : doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-surface-dim hover:text-white transition-colors max-w-full" onClick={(e) => e.stopPropagation()}>
                        <Download className="w-3 h-3 shrink-0 opacity-70" />
                        <span className="truncate">{doc.fileName || '첨부파일'}</span>
                      </a>
                    )}
                    {doc.link && (
                      <a href={doc.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-secondary-container hover:text-white transition-colors max-w-full" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">참고 링크</span>
                      </a>
                    )}
                  </div>
                )}
              </motion.div>
            )) : (
              <div className="text-xs sm:text-sm text-surface-dim text-center py-8">
                등록된 문서가 없습니다.
              </div>
            )}
          </div>
        </motion.div>

      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={PORTAL_CARD_TRANSITION}
        className="w-full -mt-2 lg:-mt-4 relative z-20"
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
