import { FileText, Edit2, Download, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { SchoolDocument } from '../services/firestore';
import { EASE_OUT_EXPO, PORTAL_CARD_TRANSITION, PORTAL_HEADER_TRANSITION, staggerDelay } from '../utils/motion';

interface DocumentsPageProps {
  documents: SchoolDocument[];
  isAdmin: boolean;
  onItemClick: (item: any, type: 'notice' | 'event' | 'document') => void;
  onEditItem: (tab: 'notices' | 'events' | 'documents', item: any) => void;
}

export function DocumentsPage({ documents, isAdmin, onItemClick, onEditItem }: DocumentsPageProps) {
  return (
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-6 sm:space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={PORTAL_HEADER_TRANSITION}
      >
        <h2 className="font-sans font-bold text-2xl sm:text-3xl md:text-5xl text-white tracking-tighter mb-2.5 sm:mb-3.5 leading-[1.2] md:leading-[1.15]">
          자료실
        </h2>
        <p className="text-surface-dim font-medium text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl break-keep">
          학교 생활에 필요한 각종 양식과 자료를 다운로드하세요.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...PORTAL_CARD_TRANSITION, delay: 0.04 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {documents.length > 0 ? documents.map((doc, idx) => {
          const hasAttachmentsOrLink = Boolean((doc.files && doc.files.length > 0) || doc.fileUrl || doc.link);
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: staggerDelay(idx, 0.03, 0.18), ease: EASE_OUT_EXPO }}
              key={doc.id}
              onClick={() => onItemClick(doc, 'document')}
              className="flex flex-col p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 bg-[#0a1120] hover:bg-white/[0.04] hover:border-white/10 group cursor-pointer relative transition-all"
            >
              <div className="flex items-start justify-between gap-2.5 mb-3">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-white/10 transition-colors shrink-0">
                    <FileText className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-secondary-fixed-dim transition-colors line-clamp-1">
                    {doc.title}
                  </h3>
                </div>

                {isAdmin && (
                  <button 
                    className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 cursor-pointer"
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
              
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-surface-dim line-clamp-2 mb-4 min-h-[2.5rem] whitespace-pre-wrap">
                  {doc.description || '상세 설명이 없습니다.'}
                </p>
              </div>
              
              {hasAttachmentsOrLink && (
                <div className="mt-auto pt-3.5 border-t border-white/5">
                  <div className="flex flex-col space-y-2">
                    {doc.files?.length ? doc.files.map((file, fIdx) => (
                      <a 
                        key={fIdx} 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between text-xs text-surface-dim hover:text-white transition-colors bg-white/5 px-3 py-2 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center truncate mr-2">
                          <span className="truncate font-space">{file.name}</span>
                        </div>
                        <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      </a>
                    )) : doc.fileUrl && (
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between text-xs text-surface-dim hover:text-white transition-colors bg-white/5 px-3 py-2 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center truncate mr-2">
                          <span className="truncate font-space">{doc.fileName || '첨부파일'}</span>
                        </div>
                        <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      </a>
                    )}
                    {doc.link && (
                      <a
                        href={doc.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-xs text-secondary-fixed-dim hover:text-white transition-colors bg-secondary/10 border border-secondary/20 px-3 py-2 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate font-medium mr-2">참고 링크 바로가기</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          );
        }) : (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
            className="col-span-full py-12 text-center text-surface-dim bg-[#0a1120]/60 rounded-3xl border border-white/5 shadow-inner"
          >
            등록된 문서가 없습니다.
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
