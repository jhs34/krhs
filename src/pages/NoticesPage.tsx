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
    <div className="max-w-[1600px] w-full mx-auto px-6 md:px-12 flex flex-col space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <span className="status-chip bg-primary/20 text-white border border-primary/30">
            NOTICES
          </span>
        </div>
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
        className="bg-[#0a1120] rounded-3xl border border-white/5 overflow-hidden p-8"
      >
        <div className="flex items-start justify-between mb-8">
          <div className="w-12 h-12 rounded-xl bg-tertiary-fixed-dim/10 border border-tertiary-fixed-dim/20 flex items-center justify-center text-tertiary-fixed-dim">
            <Bell className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>
        
        <ul className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
          {notices.length > 0 ? notices.map(notice => (
            <li 
              key={notice.id} 
              className="group cursor-pointer border-b border-white/5 pb-6 pt-2 last:border-0 last:pb-0 relative"
              onClick={() => onItemClick(notice, 'notice')}
            >
              <div className="flex items-start justify-between pr-12">
                <div>
                  <span className="block text-sm font-space text-surface-dim mb-2 tracking-widest uppercase bg-white/5 w-fit px-2 py-0.5 rounded">
                    {format(new Date(notice.date), 'yyyy-MM-dd')}
                  </span>
                  <span className="block text-lg text-white font-medium group-hover:text-tertiary-fixed-dim transition-colors line-clamp-2 leading-relaxed">
                    {notice.title}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <button 
                  className="absolute right-2 top-4 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors opacity-0 group-hover:opacity-100"
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
            <li className="text-sm text-surface-dim bg-white/5 rounded-2xl p-6 text-center">등록된 공지사항이 없습니다.</li>
          )}
        </ul>
      </motion.div>
    </div>
  );
}
