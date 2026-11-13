import { format } from 'date-fns';
import { Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Notice } from '../services/firestore';
import { EASE_OUT_EXPO, PORTAL_CARD_TRANSITION, PORTAL_HEADER_TRANSITION, staggerDelay } from '../utils/motion';

interface NoticesPageProps {
  notices: Notice[];
  isAdmin: boolean;
  onItemClick: (item: any, type: 'notice' | 'event' | 'document') => void;
  onEditItem: (tab: 'notices' | 'events' | 'documents', item: any) => void;
}

export function NoticesPage({ notices, isAdmin, onItemClick, onEditItem }: NoticesPageProps) {
  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-6 sm:space-y-10">
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={PORTAL_HEADER_TRANSITION}
      >
        <h2 className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight mb-2 leading-[1.2] text-balance">
          공지사항
        </h2>
        <p className="text-surface-dim text-sm sm:text-base leading-relaxed max-w-2xl break-keep">
          교내 주요 소식 및 학사 안내 사항
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.04 }}
        className="bg-[#0a1120] rounded-2xl border border-white/[0.08] overflow-hidden p-5 sm:p-7 md:p-8"
      >
        <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/[0.06]">
          <h3 className="font-sans font-semibold text-base sm:text-lg text-white tracking-tight">
            전체 공지 목록
          </h3>
          <span className="text-xs font-mono text-surface-dim tabular-nums">
            총 {notices.length}건
          </span>
        </div>
        
        <ul className="divide-y divide-white/[0.06]">
          {notices.length > 0 ? notices.map((notice, idx) => {
            const fileCount = notice.files?.length ? notice.files.length : (notice.fileUrl ? 1 : 0);
            return (
              <motion.li 
                key={notice.id} 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: staggerDelay(idx, 0.025, 0.16), ease: EASE_OUT_EXPO }}
                className="group cursor-pointer py-4 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition-colors relative flex items-center justify-between gap-3"
                onClick={() => onItemClick(notice, 'notice')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-1.5 mb-1 text-xs text-surface-dim">
                    <span className="font-mono tabular-nums">
                      {format(new Date(notice.date), 'yyyy.MM.dd')}
                    </span>
                    {fileCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>첨부파일 {fileCount}건</span>
                      </>
                    )}
                    {notice.link && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>참고 링크</span>
                      </>
                    )}
                  </div>
                  <span className="block text-base sm:text-lg text-white font-medium group-hover:text-secondary-container transition-colors line-clamp-2 leading-relaxed">
                    {notice.title}
                  </span>
                </div>
                {isAdmin && (
                  <button 
                    className="p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.12] text-white transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 cursor-pointer"
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
            );
          }) : (
            <motion.li 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              className="text-sm text-surface-dim py-10 text-center list-none"
            >
              등록된 공지사항이 없습니다.
            </motion.li>
          )}
        </ul>
      </motion.div>
    </div>
  );
}
