import { format } from 'date-fns';
import { Bell, Edit2, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { Notice } from '../services/firestore';

interface NoticesPageProps {
  notices: Notice[];
  isAdmin: boolean;
  onItemClick: (item: any, type: 'notice' | 'event' | 'document') => void;
  onEditItem: (tab: 'notices' | 'events' | 'documents', item: any) => void;
}

export function NoticesPage({ notices, isAdmin, onItemClick, onEditItem }: NoticesPageProps) {
  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-6 sm:space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="font-sans font-bold text-4xl md:text-5xl text-white tracking-tighter mb-4">
          공지사항
        </h2>
        <p className="text-surface-dim font-medium text-lg leading-relaxed max-w-2xl">
          학교의 주요 소식과 알림을 확인하세요.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="bg-[#0a1120] rounded-2xl sm:rounded-3xl border border-white/5 overflow-hidden p-5 sm:p-7 md:p-8"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-tertiary-fixed-dim/10 border border-tertiary-fixed-dim/20 flex items-center justify-center text-tertiary-fixed-dim shrink-0">
              <Bell className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="font-sans font-bold text-base sm:text-lg text-white tracking-tight">
              전체 공지 목록
            </h3>
          </div>
          <span className="text-xs font-mono text-surface-dim tabular-nums">
            총 {notices.length}건
          </span>
        </div>
        
        <ul className="divide-y divide-white/5">
          {notices.length > 0 ? notices.map((notice, idx) => (
            <motion.li 
              key={notice.id} 
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.4, delay: 0.2 + idx * 0.04 }}
              className="group cursor-pointer py-4 first:pt-1 last:pb-0 relative flex items-center justify-between gap-3"
              onClick={() => onItemClick(notice, 'notice')}
            >
              <div className="min-w-0 flex-1">
                <span className="inline-block text-xs font-space text-surface-dim mb-1.5 tracking-widest uppercase bg-white/5 px-2 py-0.5 rounded">
                  {format(new Date(notice.date), 'yyyy-MM-dd')}
                </span>
                <span className="block text-base sm:text-lg text-white font-medium group-hover:text-tertiary-fixed-dim transition-colors line-clamp-2 leading-relaxed">
                  {notice.title}
                </span>
              </div>
              {isAdmin && (
                <button 
                  className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditItem('notices', notice);
                  }}
                  title="공지 수정"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </motion.li>
          )) : (
            <motion.li 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-sm text-surface-dim bg-white/[0.03] rounded-2xl p-6 text-center list-none"
            >
              등록된 공지사항이 없습니다.
            </motion.li>
          )}
        </ul>
      </motion.div>
    </div>
  );
}
