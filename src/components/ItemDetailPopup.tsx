import { motion } from 'motion/react';
import { X, Edit2, Download, ExternalLink, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { MODAL_BACKDROP_TRANSITION, MODAL_PANEL_TRANSITION } from '../utils/motion';

interface ItemDetailPopupProps {
  item: any;
  type: 'notice' | 'event' | 'document';
  isAdmin: boolean;
  onClose: () => void;
  onEdit: (type: 'notices' | 'events' | 'documents', item: any) => void;
}

export function ItemDetailPopup({ item, type, isAdmin, onClose, onEdit }: ItemDetailPopupProps) {
  if (!item) return null;

  const isEvent = type === 'event';
  const isNotice = type === 'notice';
  const isDocument = type === 'document';

  const title = item.title;
  let content = '';
  if (isEvent) content = item.description;
  else if (isNotice) content = item.content;
  else if (isDocument) content = item.description;

  const attachmentList: Array<{ name: string; url: string }> =
    Array.isArray(item.files) && item.files.length > 0
      ? item.files.filter((f: any) => f && f.url)
      : item.fileUrl
      ? [{ name: item.fileName || '첨부파일', url: item.fileUrl }]
      : [];

  const externalLink: string = typeof item.link === 'string' ? item.link.trim() : '';

  const formatYmd = (val: any) => {
    const d = val instanceof Date ? val : new Date(val);
    return isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
  };

  const startYmd = item.date ? formatYmd(item.date) : '';
  const endYmd = item.endDate ? formatYmd(item.endDate) : '';

  const renderContentWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 hover:underline break-all">
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={MODAL_BACKDROP_TRANSITION}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.96, y: 8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 6, opacity: 0 }}
        transition={MODAL_PANEL_TRANSITION}
        className="bg-[#0a1120] border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between bg-white/5">
          <div className="flex-1 pr-4 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase inline-flex items-center ${
                isEvent ? 'bg-secondary/20 text-white' : 
                isNotice ? 'bg-primary/50 text-white border border-white/20' : 
                'bg-tertiary/20 text-white'
              }`}>
                {isEvent ? '학사일정' : isNotice ? '공지사항' : '문서자료'}
              </span>
              {item.isArchived && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  보관됨
                </span>
              )}
              {isEvent && startYmd && (
                <span className="text-surface-dim font-space text-xs font-bold tracking-wider tabular-nums">
                  {startYmd}
                  {endYmd && endYmd !== startYmd && ` ~ ${endYmd}`}
                </span>
              )}
              {isNotice && startYmd && (
                <span className="text-surface-dim font-space text-xs font-bold tracking-wider tabular-nums">
                  {startYmd}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-white leading-snug break-keep">{title}</h2>
          </div>
          <div className="flex space-x-2 shrink-0">
            {isAdmin && (
              <button 
                onClick={() => {
                  onClose();
                  onEdit(isNotice ? 'notices' : isEvent ? 'events' : 'documents', item);
                }} 
                className="p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="수정하기"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full bg-white/5 border border-white/10 text-surface-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow space-y-5">
          {content ? (
            <div className="text-surface-dim text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              {renderContentWithLinks(content)}
            </div>
          ) : (
            <div className="text-surface-dim/50 text-sm">상세 내용이 없습니다.</div>
          )}

          {(externalLink || attachmentList.length > 0) && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              {externalLink && (
                <div>
                  <div className="text-xs font-bold text-white/80 mb-1.5">참고 링크</div>
                  <a
                    href={externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-secondary/10 hover:bg-secondary/20 border border-secondary/25 text-xs sm:text-sm text-white transition-colors"
                  >
                    <span className="truncate font-mono text-secondary-fixed-dim">{externalLink}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white shrink-0">
                      <span>바로가기</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </a>
                </div>
              )}

              {attachmentList.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white/80 mb-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-surface-dim" />
                    <span>첨부파일 ({attachmentList.length}건)</span>
                  </div>
                  <div className="space-y-2">
                    {attachmentList.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm text-surface-dim hover:text-white transition-colors"
                      >
                        <span className="truncate font-medium text-white">{file.name}</span>
                        <span className="inline-flex items-center gap-1 text-xs shrink-0">
                          <span>열기</span>
                          <Download className="w-3.5 h-3.5" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
