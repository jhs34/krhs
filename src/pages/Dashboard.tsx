import { format } from 'date-fns';
import { Calendar as CalendarIcon, FileText, Bell, Edit2 } from 'lucide-react';
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
  events
}: DashboardProps) {
  return (
    <div className="max-w-[1600px] w-full mx-auto px-6 md:px-12 flex flex-col space-y-24">
      {/* Section 1: Dashboard Header */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="flex flex-col md:flex-row md:items-end justify-between border-b border-surface/10 pb-12 gap-8"
      >
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <span className="status-chip bg-secondary/20 text-white border border-secondary/30">
              SYSTEM READY
            </span>
            <span className="text-sm font-space text-surface-dim/60 font-medium tracking-widest uppercase">
              Terminal ID: KRHS-STU-26
            </span>
          </div>
          <h2 className="font-sans font-bold text-4xl md:text-6xl text-white tracking-tighter mb-4 leading-[70px]">
            내 손안의 교무실,<br />
            <span className="text-surface-dim">학생 통합 터미널</span>
          </h2>
          <p className="text-surface-dim font-medium text-lg md:text-xl max-w-2xl leading-relaxed">
            복잡한 공지와 일정, 이제 흩어진 정보를 찾지 마세요.<br /> 하나의 포털에서 완벽하게 연결됩니다.
          </p>
        </div>
      </motion.div>

      {/* Dashboard Grid - Editorial Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Massive Card: Schedule */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="xl:col-span-8 bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden group hover:border-white/10 transition-colors p-8 md:p-12"
        >
          <div className="flex items-start justify-between mb-12">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-6 text-secondary-fixed-dim">
                <CalendarIcon className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-sans font-bold text-3xl md:text-4xl text-white tracking-tight mb-3">다가오는 학사 일정</h3>
              <p className="text-surface-dim text-lg">중요한 순간을 놓치지 않도록.</p>
            </div>
            <Link to="/events" className="border border-white/10 hover:border-white/30 text-white rounded-full px-4 py-2 bg-white/5 transition-colors text-sm font-medium">
              더보기
            </Link>
          </div>
          
          <ul className="space-y-6">
            {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
              <li 
                key={event.id} 
                className="flex flex-col md:flex-row md:items-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group/item border border-white/5 cursor-pointer relative"
                onClick={() => onItemClick(event, 'event')}
              >
                <div className="flex flex-col items-start md:items-center mr-8 mb-4 md:mb-0 w-24 shrink-0">
                  <span className="text-sm font-space font-bold text-white tracking-widest uppercase">{format(event.date, 'MMM')}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-space font-bold text-white leading-none mb-1">{format(event.date, 'dd')}</span>
                    {event.endDate && event.date.getTime() !== event.endDate.getTime() && (
                      <span className="text-xs font-space text-surface-dim font-bold">~ {format(event.endDate, 'MMM dd')}</span>
                    )}
                  </div>
                </div>
                <div className="flex-grow flex items-start pr-8">
                  {event.color && <div className="w-2.5 h-2.5 rounded-full mt-2 mr-4 shrink-0 shadow-sm" style={{ backgroundColor: event.color }} />}
                  <div>
                    <span className="block text-xl font-bold text-white mb-2 group-hover/item:text-secondary-fixed-dim transition-colors">{event.title}</span>
                    <span className="block text-sm text-surface-dim whitespace-pre-wrap line-clamp-2">{event.description}</span>
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

        {/* Side Column: Checklist & Notices */}
        <div className="xl:col-span-4 flex flex-col space-y-8">
          
          {/* Notices */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden p-8 flex-grow"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-tertiary-fixed-dim/10 border border-tertiary-fixed-dim/20 flex items-center justify-center text-tertiary-fixed-dim">
                <Bell className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <Link to="/notices" className="text-xs font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors border border-white/5">더보기</Link>
            </div>
            <h3 className="font-sans font-bold text-2xl text-white tracking-tight mb-2">공지사항</h3>
            <p className="text-surface-dim text-sm mb-6">학교의 주요 소식을 확인하세요.</p>
            
            <ul className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                      {notice.files?.length ? (
                        <div className="flex flex-col space-y-1.5 mt-3 text-xs text-surface-dim">
                          {notice.files.map((file, idx) => (
                            <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1.5 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                              <FileText className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[200px]">{file.name}</span>
                            </a>
                          ))}
                        </div>
                      ) : notice.fileName && (
                        <div className="flex items-center space-x-1.5 mt-3 text-xs text-surface-dim">
                          <FileText className="w-3 h-3 shrink-0" />
                          <a href={notice.fileUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors truncate max-w-[200px]" onClick={(e) => e.stopPropagation()}>{notice.fileName}</a>
                        </div>
                      )}
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
                <li className="text-sm text-surface-dim">등록된 공지사항이 없습니다.</li>
              )}
            </ul>
          </motion.div>
          
          {/* Documents */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden p-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <FileText className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <Link to="/documents" className="text-xs font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors border border-white/5">더보기</Link>
            </div>
            <h3 className="font-sans font-bold text-2xl text-white tracking-tight mb-6">문서 자료실</h3>
            
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
                <div className="text-sm text-surface-dim text-center py-4">등록된 문서가 없습니다.</div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
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
        />
      </motion.div>
    </div>
  );
}
