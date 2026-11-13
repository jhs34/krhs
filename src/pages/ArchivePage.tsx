import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Edit2, Search, X, ExternalLink } from 'lucide-react';
import { AcademicEvent } from '../types';
import { Notice, SchoolDocument } from '../services/firestore';
import { EASE_OUT_EXPO, NAV_SPRING_TRANSITION, PORTAL_HEADER_TRANSITION } from '../utils/motion';

interface ArchivePageProps {
  events: AcademicEvent[];
  notices: Notice[];
  documents: SchoolDocument[];
  isAdmin: boolean;
  onItemClick: (item: any, type: 'notice' | 'event' | 'document') => void;
  onEditItem: (tab: 'notices' | 'events' | 'documents', item: any) => void;
}

export function ArchivePage({
  events,
  notices,
  documents,
  isAdmin,
  onItemClick,
  onEditItem
}: ArchivePageProps) {
  const [activeSubTab, setActiveSubTab] = useState<'events' | 'notices' | 'documents'>('events');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only archived items
  const archivedEvents = events
    .filter(e => e.isArchived)
    .filter(e => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return e.title.toLowerCase().includes(query) || (e.description && e.description.toLowerCase().includes(query));
    });

  const archivedNotices = notices
    .filter(n => n.isArchived)
    .filter(n => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(query) || (n.content && n.content.toLowerCase().includes(query));
    });

  const archivedDocuments = documents
    .filter(d => d.isArchived)
    .filter(d => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return d.title.toLowerCase().includes(query) || (d.description && d.description.toLowerCase().includes(query));
    });

  const getDeletionDDay = (archivedAtStr?: string) => {
    if (!archivedAtStr) return { text: '기한 정보 없음', className: 'text-surface-dim' };
    const archivedAt = new Date(archivedAtStr);
    const deleteAt = new Date(archivedAt.getTime() + 365 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const diffTime = deleteAt.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return { text: '곧 삭제 예정', className: 'text-red-400 font-semibold' };
    } else if (diffDays <= 14) {
      return { text: `${diffDays}일 후 영구 삭제`, className: 'text-amber-400 font-semibold' };
    } else {
      return { text: `${diffDays}일 후 삭제`, className: 'text-surface-dim' };
    }
  };

  const getArchivedDateLabel = (archivedAtStr?: string) => {
    if (!archivedAtStr) return '보관됨';
    try {
      return `${format(new Date(archivedAtStr), 'yyyy.MM.dd')} 보관됨`;
    } catch {
      return '보관됨';
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-6 sm:space-y-10">
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={PORTAL_HEADER_TRANSITION}
      >
        <h2 className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight mb-2 leading-[1.2] text-balance">
          보관함
        </h2>
        <p className="text-surface-dim text-sm sm:text-base leading-relaxed max-w-2xl break-keep">
          유효기간이 만료되었거나 지난 학사정보 보관소입니다. 보관 일자로부터 <span className="text-white font-medium">1년간 보관</span>된 후 영구 삭제되며 일반 목록과 검색에서 제외됩니다.
        </p>
      </motion.div>

      {/* Tab Selectors and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6 border-b border-white/[0.08] pb-2">
        <div className="flex shrink-0 space-x-5 sm:space-x-6 md:space-x-8 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveSubTab('events')}
            className={`pb-3.5 sm:pb-4 text-xs sm:text-sm md:text-base font-semibold transition-colors relative whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'events' ? 'text-white' : 'text-surface-dim hover:text-white'
            }`}
          >
            <span>보관된 일정 <span className="font-mono tabular-nums">({archivedEvents.length})</span></span>
            {activeSubTab === 'events' && (
              <motion.div layoutId="archive-subtab-line" transition={NAV_SPRING_TRANSITION} className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-fixed-dim" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('notices')}
            className={`pb-3.5 sm:pb-4 text-xs sm:text-sm md:text-base font-semibold transition-colors relative whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'notices' ? 'text-white' : 'text-surface-dim hover:text-white'
            }`}
          >
            <span>보관된 공지사항 <span className="font-mono tabular-nums">({archivedNotices.length})</span></span>
            {activeSubTab === 'notices' && (
              <motion.div layoutId="archive-subtab-line" transition={NAV_SPRING_TRANSITION} className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-fixed-dim" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('documents')}
            className={`pb-3.5 sm:pb-4 text-xs sm:text-sm md:text-base font-semibold transition-colors relative whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'documents' ? 'text-white' : 'text-surface-dim hover:text-white'
            }`}
          >
            <span>보관된 자료실 <span className="font-mono tabular-nums">({archivedDocuments.length})</span></span>
            {activeSubTab === 'documents' && (
              <motion.div layoutId="archive-subtab-line" transition={NAV_SPRING_TRANSITION} className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-fixed-dim" />
            )}
          </button>
        </div>

        {/* Search Bar inside Archive */}
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-dim group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="보관함 내용 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a1120] border border-white/10 group-hover:border-white/15 focus:border-secondary-fixed-dim/50 text-white rounded-lg pl-10 pr-10 py-2 text-sm outline-none transition-colors placeholder:text-surface-dim/55 font-sans"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                key="clear-archive-search"
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.14 }}
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-dim hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div>
        <AnimatePresence mode="wait" initial={false}>
          {activeSubTab === 'events' && (
            <motion.div
              key="archived-events"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {archivedEvents.length > 0 ? archivedEvents.map(event => {
                const dday = getDeletionDDay(event.archivedAt);
                return (
                  <div
                    key={event.id}
                    onClick={() => onItemClick(event, 'event')}
                    className="flex flex-col p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0a1120] hover:bg-[#0f182b] hover:border-white/[0.14] group cursor-pointer relative transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-2.5 text-xs text-surface-dim flex-wrap">
                      <span className="font-mono tabular-nums text-white/80">
                        {format(event.date, 'yyyy.MM.dd')}
                        {event.endDate && format(event.date, 'yyyy-MM-dd') !== format(event.endDate, 'yyyy-MM-dd') && (
                          ` ~ ${format(event.endDate, 'yyyy.MM.dd')}`
                        )}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-mono tabular-nums ${dday.className}`}>
                        {dday.text}
                      </span>
                    </div>

                    <div className="flex-1 pr-12">
                      <div className="flex items-center mb-1.5">
                        {event.color && <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: event.color }} />}
                        <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-secondary-container transition-colors line-clamp-1">
                          {event.title}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-surface-dim line-clamp-2 min-h-[2.5rem] whitespace-pre-wrap">
                        {event.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-white/[0.06] text-xs font-mono tabular-nums text-surface-dim/65">
                      {getArchivedDateLabel(event.archivedAt)}
                    </div>

                    {isAdmin && (
                      <button 
                        className="absolute right-4 bottom-4 p-2 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/[0.12] hover:border-white/20 text-white transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem('events', event);
                        }}
                        title="편집 및 보관 해제"
                      >
                        <Edit2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                );
              }) : (
                <div className="col-span-full py-12 text-center text-sm text-surface-dim bg-[#0a1120] rounded-2xl border border-white/[0.08]">
                  보관된 일정 데이터가 없습니다.
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'notices' && (
            <motion.div
              key="archived-notices"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
              className="bg-[#0a1120] rounded-2xl border border-white/[0.08] overflow-hidden p-5 sm:p-7 md:p-8"
            >
              <ul className="divide-y divide-white/[0.06]">
                {archivedNotices.length > 0 ? archivedNotices.map(notice => {
                  const dday = getDeletionDDay(notice.archivedAt);
                  return (
                    <li
                      key={notice.id}
                      onClick={() => onItemClick(notice, 'notice')}
                      className="group cursor-pointer py-4 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition-colors relative flex flex-col md:flex-row md:items-center md:justify-between pr-14"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 text-xs text-surface-dim flex-wrap">
                          <span className="font-mono tabular-nums">
                            {format(new Date(notice.date), 'yyyy.MM.dd')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-mono tabular-nums ${dday.className}`}>
                            {dday.text}
                          </span>
                          {notice.validUntil && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums text-red-400">
                                만료일 {format(new Date(notice.validUntil), 'yyyy.MM.dd')}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg text-white font-medium group-hover:text-secondary-container transition-colors line-clamp-1 leading-relaxed">
                          {notice.title}
                        </h3>
                        <p className="text-xs font-mono tabular-nums text-surface-dim/65 mt-1">
                          {getArchivedDateLabel(notice.archivedAt)}
                        </p>
                      </div>

                      {isAdmin && (
                        <button 
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/[0.12] hover:border-white/20 text-white transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem('notices', notice);
                          }}
                          title="편집 및 보관 해제"
                        >
                          <Edit2 className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </li>
                  );
                }) : (
                  <li className="py-10 text-center text-sm text-surface-dim list-none">
                    보관된 공지사항이 없습니다.
                  </li>
                )}
              </ul>
            </motion.div>
          )}

          {activeSubTab === 'documents' && (
            <motion.div
              key="archived-documents"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {archivedDocuments.length > 0 ? archivedDocuments.map(doc => {
                const dday = getDeletionDDay(doc.archivedAt);
                return (
                  <div
                    key={doc.id}
                    onClick={() => onItemClick(doc, 'document')}
                    className="flex flex-col p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0a1120] hover:bg-[#0f182b] hover:border-white/[0.14] group cursor-pointer relative transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-secondary-container transition-colors line-clamp-1 min-w-0 flex-1">
                        {doc.title}
                      </h3>
                      <span className={`text-xs font-mono tabular-nums shrink-0 ${dday.className}`}>
                        {dday.text}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                      <p className="text-xs sm:text-sm text-surface-dim line-clamp-2 mb-4 min-h-[2.5rem] whitespace-pre-wrap">
                        {doc.description}
                      </p>
                    </div>

                    <div className="mt-auto pt-3.5 border-t border-white/[0.06]">
                      {(doc.files?.length || doc.fileUrl || doc.link) && (
                        <div className="flex flex-col space-y-1.5 mb-3">
                          {doc.files?.length ? doc.files.map((file, fIdx) => (
                            <a 
                              key={fIdx} 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center justify-between text-xs text-surface-dim hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="truncate mr-2">{file.name}</span>
                              <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
                            </a>
                          )) : doc.fileUrl && (
                            <a 
                              href={doc.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center justify-between text-xs text-surface-dim hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="truncate mr-2">{doc.fileName || '첨부파일'}</span>
                              <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
                            </a>
                          )}
                          {doc.link && (
                            <a
                              href={doc.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between text-xs text-secondary-container hover:text-white transition-colors bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 px-2.5 py-1.5 rounded-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="truncate font-medium mr-2">참고 링크 바로가기</span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            </a>
                          )}
                        </div>
                      )}
                      <div className="text-xs font-mono tabular-nums text-surface-dim/65">
                        {getArchivedDateLabel(doc.archivedAt)}
                      </div>
                    </div>

                    {isAdmin && (
                      <button 
                        className="absolute right-4 bottom-4 p-2 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/[0.12] hover:border-white/20 text-white transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem('documents', doc);
                        }}
                        title="편집 및 보관 해제"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    )}
                  </div>
                );
              }) : (
                <div className="col-span-full py-12 text-center text-sm text-surface-dim bg-[#0a1120] rounded-2xl border border-white/[0.08]">
                  보관된 문서가 없습니다.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
