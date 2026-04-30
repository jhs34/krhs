import React from 'react';
import { motion } from 'motion/react';
import { X, Calendar as CalendarIcon, FileText, ArrowRight, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

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

  const files = item.files || [];
  if (item.fileUrl && files.length === 0) {
    files.push({ url: item.fileUrl, name: item.fileName || '첨부파일' });
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0a1120] border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-start justify-between bg-white/5">
          <div className="flex-1 pr-4">
            <div className="flex items-center space-x-3 mb-2">
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase inline-flex items-center ${
                isEvent ? 'bg-secondary/20 text-white' : 
                isNotice ? 'bg-primary/50 text-white border border-white/20' : 
                'bg-tertiary/20 text-white'
              }`}>
                {isEvent ? '학사일정' : isNotice ? '공지사항' : '문서자료'}
              </span>
              {isEvent && item.date && (
                <span className="text-surface-dim font-space text-xs font-bold tracking-wider">
                  {format(new Date(item.date), 'yyyy-MM-dd')}
                  {item.endDate && item.date !== item.endDate && ` ~ ${format(new Date(item.endDate), 'yyyy-MM-dd')}`}
                </span>
              )}
              {isNotice && item.date && (
                <span className="text-surface-dim font-space text-xs font-bold tracking-wider">
                  {format(new Date(item.date), 'yyyy-MM-dd')}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white leading-tight">{title}</h2>
          </div>
          <div className="flex space-x-2 shrink-0">
            {isAdmin && (
              <button 
                onClick={() => {
                  onClose();
                  onEdit(isNotice ? 'notices' : isEvent ? 'events' : 'documents', item);
                }} 
                className="p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                title="수정하기"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full bg-white/5 border border-white/10 text-surface-dim hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
          {content && (
            <div className="text-surface-dim text-base leading-relaxed whitespace-pre-wrap mb-8">
              {content}
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-surface-dim" />첨부파일
              </h3>
              <div className="grid gap-2">
                {files.map((file: any, idx: number) => (
                  <a 
                    key={idx} 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-dim/10 flex items-center justify-center mr-3 shrink-0">
                      <FileText className="w-4 h-4 text-surface-dim group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-sm text-surface-dim group-hover:text-white transition-colors truncate flex-1 font-space">
                      {file.name}
                    </span>
                    <ArrowRight className="w-4 h-4 text-surface-dim/30 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Placeholder for future page links */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-surface-dim hover:text-white transition-colors flex items-center space-x-2 opacity-50 cursor-not-allowed">
            <span>상세 페이지로 이동 (준비중)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
