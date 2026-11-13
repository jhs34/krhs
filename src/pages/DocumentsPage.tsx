import { Edit2, Download, ExternalLink } from 'lucide-react';
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
    <div className="max-w-7xl w-full mx-auto px-6 sm:px-12 md:px-16 lg:px-24 xl:px-32 flex flex-col space-y-6 sm:space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={PORTAL_HEADER_TRANSITION}
      >
        <h2 className="font-sans font-semibold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight mb-2 leading-[1.2] text-balance">
          자료실
        </h2>
        <p className="text-surface-dim text-sm sm:text-base leading-relaxed max-w-2xl break-keep">
          학교생활에 필요한 각종 신청 양식 및 배부 문서
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
              className="flex flex-col p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0a1120] hover:bg-[#0f182b] hover:border-white/[0.14] group cursor-pointer relative transition-colors"
            >
              <div className="flex items-start justify-between gap-2.5 mb-2.5">
                <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-secondary-container transition-colors line-clamp-1 min-w-0 flex-1">
                  {doc.title}
                </h3>

                {isAdmin && (
                  <button 
                    className="p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.12] text-white transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 cursor-pointer"
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
                <p className="text-xs sm:text-sm text-surface-dim line-clamp-2 mb-4 min-h-[2.5rem] whitespace-pre-wrap leading-relaxed">
                  {doc.description || '상세 설명이 없습니다.'}
                </p>
              </div>
              
              {hasAttachmentsOrLink && (
                <div className="mt-auto pt-3.5 border-t border-white/[0.06]">
                  <div className="flex flex-col space-y-1.5">
                    {doc.files?.length ? doc.files.map((file, fIdx) => (
                      <a 
                        key={fIdx} 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between text-xs text-surface-dim hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate mr-2">{file.name}</span>
                        <Download className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      </a>
                    )) : doc.fileUrl && (
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between text-xs text-surface-dim hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate mr-2">{doc.fileName || '첨부파일'}</span>
                        <Download className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      </a>
                    )}
                    {doc.link && (
                      <a
                        href={doc.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-xs text-secondary-container hover:text-white transition-colors bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 px-3 py-2 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate font-medium mr-2">참고 링크 바로가기</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-85" />
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
            className="col-span-full py-12 text-center text-surface-dim bg-[#0a1120] rounded-2xl border border-white/[0.08]"
          >
            등록된 문서가 없습니다.
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
