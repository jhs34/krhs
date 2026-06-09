import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Bell, FileText, Download, Archive, Trash, Search, X } from 'lucide-react';
import { AcademicEvent } from '../types';
import { Notice, SchoolDocument } from '../services/firestore';

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
    if (!archivedAtStr) return { text: '기한 정보 없음', className: 'bg-white/5 text-surface-dim border-white/5' };
    const archivedAt = new Date(archivedAtStr);
    const deleteAt = new Date(archivedAt.getTime() + 365 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const diffTime = deleteAt.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return { text: '곧 삭제 예정', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
    } else if (diffDays <= 14) {
      return { text: `${diffDays}일 후 영구 삭제`, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    } else {
      return { text: `${diffDays}일 후 삭제`, className: 'bg-white/10 text-surface-dim border-white/10' };
    }
  };

  const getArchivedDateLabel = (archivedAtStr?: string) => {
    if (!archivedAtStr) return '보관됨';
    try {
      return `${format(new Date(archivedAtStr), 'yyyy-MM-dd')} 보관됨`;
    } catch {
      return '보관됨';
    }
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-6 sm:space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <span className="status-chip bg-secondary/10 text-white border border-secondary/20 flex items-center gap-1.5 py-1 px-3">
            <Archive className="w-3.5 h-3.5 text-white" /> ARCHIVE STORAGE
          </span>
        </div>
        <h2 className="font-sans font-bold text-4xl md:text-5xl text-white tracking-tighter mb-4">
          보관함
        </h2>
        <p className="text-surface-dim font-medium text-lg leading-relaxed max-w-2xl">
          오래되거나 유효기간이 완료된 학사정보 보관소입니다. 여기에 보관된 항목은 보관 일자로부터 <span className="text-white font-semibold underline decoration-secondary">1년 동안 임시 보관</span>된 후 영구 삭제되며, 일반 검색 데이터 및 각 메뉴 목록에서 제외됩니다.
        </p>
      </motion.div>

      {/* Tab Selectors and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-white/10 pb-2">
        <div className="flex shrink-0 space-x-6 md:space-x-8 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('events')}
            className={`pb-4 text-sm md:text-base font-bold transition-all relative ${
              activeSubTab === 'events' ? 'text-white' : 'text-surface-dim hover:text-white'
            }`}
          >
            <span>보관된 일정 ({archivedEvents.length})</span>
            {activeSubTab === 'events' && (
              <motion.div layoutId="archive-subtab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-fixed-dim" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('notices')}
            className={`pb-4 text-sm md:text-base font-bold transition-all relative ${
              activeSubTab === 'notices' ? 'text-white' : 'text-surface-dim hover:text-white'
            }`}
          >
            <span>보관된 공지사항 ({archivedNotices.length})</span>
            {activeSubTab === 'notices' && (
              <motion.div layoutId="archive-subtab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-fixed-dim" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('documents')}
            className={`pb-4 text-sm md:text-base font-bold transition-all relative ${
              activeSubTab === 'documents' ? 'text-white' : 'text-surface-dim hover:text-white'
            }`}
          >
            <span>보관된 자료실 ({archivedDocuments.length})</span>
            {activeSubTab === 'documents' && (
              <motion.div layoutId="archive-subtab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-fixed-dim" />
            )}
          </button>
        </div>

        {/* Search Bar inside Archive */}
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-dim group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="보관함 내용 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a1120] border border-white/5 group-hover:border-white/10 focus:border-secondary-fixed-dim/50 text-white rounded-full pl-11 pr-11 py-2 text-sm outline-none transition-all placeholder:text-surface-dim/50 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-dim hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div>
        <AnimatePresence mode="wait">
          {activeSubTab === 'events' && (
            <motion.div
              key="archived-events"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {archivedEvents.length > 0 ? archivedEvents.map(event => {
                const dday = getDeletionDDay(event.archivedAt);
                return (
                  <div
                    key={event.id}
                    onClick={() => onItemClick(event, 'event')}
                    className="flex flex-col p-6 rounded-3xl border border-white/5 bg-[#0a1120] hover:bg-white/5 hover:border-white/10 group cursor-pointer relative transition-all"
                  >
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="text-xs font-space font-bold text-white tracking-widest uppercase bg-black/40 px-2.5 py-1 rounded">
                        {format(event.date, 'yyyy-MM-dd')}
                        {event.endDate && event.date.getTime() !== event.endDate.getTime() && (
                          ` ~ ${format(event.endDate, 'yyyy-MM-dd')}`
                        )}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-space font-bold border transition-colors ${dday.className}`}>
                        {dday.text}
                      </span>
                    </div>

                    <div className="flex-1 pr-12">
                      <div className="flex items-center mb-2">
                        {event.color && <div className="w-2.5 h-2.5 rounded-full mr-2.5 shrink-0" style={{ backgroundColor: event.color }} />}
                        <h3 className="text-lg font-bold text-white group-hover:text-secondary-fixed-dim transition-colors line-clamp-1">
                          {event.title}
                        </h3>
                      </div>
                      <p className="text-sm text-surface-dim line-clamp-2 h-10 whitespace-pre-wrap">
                        {event.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 text-[11px] font-space text-surface-dim/60">
                      {getArchivedDateLabel(event.archivedAt)}
                    </div>

                    {isAdmin && (
                      <button 
                        className="absolute right-4 bottom-4 p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-[#64ffda]/20 hover:border-[#64ffda]/30 text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem('events', event);
                        }}
                        title="편집 및 보관 해제"
                      >
                        <Archive className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                );
              }) : (
                <div className="col-span-full py-16 text-center text-surface-dim bg-[#0a1120] rounded-3xl border border-white/5 flex flex-col items-center justify-center space-y-3">
                  <Archive className="w-8 h-8 opacity-45" />
                  <span>보관된 일정 데이터가 없습니다.</span>
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'notices' && (
            <motion.div
              key="archived-notices"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden p-6 md:p-8"
            >
              <ul className="space-y-6">
                {archivedNotices.length > 0 ? archivedNotices.map(notice => {
                  const dday = getDeletionDDay(notice.archivedAt);
                  return (
                    <li
                      key={notice.id}
                      onClick={() => onItemClick(notice, 'notice')}
                      className="group cursor-pointer border-b border-white/5 pb-6 last:border-0 last:pb-0 relative flex flex-col md:flex-row md:items-center md:justify-between pr-14"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-space text-surface-dim bg-white/5 px-2 py-0.5 rounded">
                            {format(new Date(notice.date), 'yyyy-MM-dd')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-space font-bold border ${dday.className}`}>
                            {dday.text}
                          </span>
                          {notice.validUntil && (
                            <span className="text-[10px] text-red-400 bg-red-400/5 px-2 py-0.5 rounded border border-red-500/10">
                              유효기간: {format(new Date(notice.validUntil), 'yyyy-MM-dd')} (만료됨)
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg text-white font-medium group-hover:text-tertiary-fixed-dim transition-colors line-clamp-1 leading-relaxed">
                          {notice.title}
                        </h3>
                        <p className="text-xs text-surface-dim/60 mt-1">
                          {getArchivedDateLabel(notice.archivedAt)}
                        </p>
                      </div>

                      {isAdmin && (
                        <button 
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-[#64ffda]/20 hover:border-[#64ffda]/30 text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditItem('notices', notice);
                          }}
                          title="편집 및 보관 해제"
                        >
                          <Archive className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </li>
                  );
                }) : (
                  <li className="py-12 text-center text-surface-dim bg-white/5 rounded-2xl flex flex-col items-center justify-center space-y-3">
                    <Archive className="w-8 h-8 opacity-45" />
                    <span>보관된 공지사항이 없습니다.</span>
                  </li>
                )}
              </ul>
            </motion.div>
          )}

          {activeSubTab === 'documents' && (
            <motion.div
              key="archived-documents"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {archivedDocuments.length > 0 ? archivedDocuments.map(doc => {
                const dday = getDeletionDDay(doc.archivedAt);
                return (
                  <div
                    key={doc.id}
                    onClick={() => onItemClick(doc, 'document')}
                    className="flex flex-col p-6 rounded-3xl border border-white/5 bg-[#0a1120] hover:bg-white/5 hover:border-white/10 group cursor-pointer relative transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-white/10 transition-colors">
                        <FileText className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-space font-bold border transition-colors ${dday.className}`}>
                        {dday.text}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className="text-lg font-bold text-white group-hover:text-secondary-fixed-dim transition-colors line-clamp-1 mb-2">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-surface-dim line-clamp-2 mb-4 h-10 whitespace-pre-wrap">
                        {doc.description}
                      </p>
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5">
                      <div className="flex flex-col space-y-2 mb-4">
                        {doc.files?.length ? doc.files.map((file, fIdx) => (
                          <a 
                            key={fIdx} 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center justify-between text-xs text-surface-dim hover:text-white transition-colors bg-white/5 px-2.5 py-1.5 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate font-space">{file.name}</span>
                            <Download className="w-3.5 h-3.5 shrink-0 opacity-50" />
                          </a>
                        )) : doc.fileUrl && (
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center justify-between text-xs text-surface-dim hover:text-white transition-colors bg-white/5 px-2.5 py-1.5 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate font-space">{doc.fileName}</span>
                            <Download className="w-3.5 h-3.5 shrink-0 opacity-50" />
                          </a>
                        )}
                      </div>
                      <div className="text-[10px] text-surface-dim/60">
                        {getArchivedDateLabel(doc.archivedAt)}
                      </div>
                    </div>

                    {isAdmin && (
                      <button 
                        className="absolute right-4 bottom-4 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-[#64ffda]/20 hover:border-[#64ffda]/30 text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem('documents', doc);
                        }}
                        title="편집 및 보관 해제"
                      >
                        <Archive className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                );
              }) : (
                <div className="col-span-full py-16 text-center text-surface-dim bg-[#0a1120] rounded-3xl border border-white/5 flex flex-col items-center justify-center space-y-3">
                  <Archive className="w-8 h-8 opacity-45" />
                  <span>보관된 문서가 없습니다.</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
