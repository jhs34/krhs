import { FileText, Edit2, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { SchoolDocument } from '../services/firestore';
import { format } from 'date-fns';

interface DocumentsPageProps {
  documents: SchoolDocument[];
  isAdmin: boolean;
  onItemClick: (item: any, type: 'notice' | 'event' | 'document') => void;
  onEditItem: (tab: 'notices' | 'events' | 'documents', item: any) => void;
}

export function DocumentsPage({ documents, isAdmin, onItemClick, onEditItem }: DocumentsPageProps) {
  return (
    <div className="max-w-[1600px] w-full mx-auto px-6 md:px-12 flex flex-col space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <span className="status-chip bg-white/10 text-white border border-white/20">
            DOCUMENTS
          </span>
        </div>
        <h2 className="font-sans font-bold text-4xl md:text-5xl text-white tracking-tighter mb-4">
          자료실
        </h2>
        <p className="text-surface-dim font-medium text-lg leading-relaxed max-w-2xl">
          학교 생활에 필요한 각종 양식과 자료를 다운로드하세요.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.length > 0 ? documents.map((doc, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, delay: idx * 0.05 }}
            key={doc.id}
            onClick={() => onItemClick(doc, 'document')}
            className="flex flex-col p-6 rounded-3xl border border-white/5 bg-[#0a1120] hover:bg-white/5 hover:border-white/10 group cursor-pointer relative transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:bg-white/10 transition-colors">
              <FileText className="w-6 h-6" strokeWidth={1.5} />
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
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20 mr-2 shrink-0"></span>
                      <span className="truncate font-space">{file.name}</span>
                    </div>
                    <Download className="w-3.5 h-3.5 shrink-0 opacity-50 hover:opacity-100" />
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
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20 mr-2 shrink-0"></span>
                      <span className="truncate font-space">{doc.fileName}</span>
                    </div>
                    <Download className="w-3.5 h-3.5 shrink-0 opacity-50 hover:opacity-100" />
                  </a>
                )}
              </div>
            </div>

            {isAdmin && (
              <button 
                className="absolute right-4 top-4 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditItem('documents', doc);
                }}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )) : (
          <div className="col-span-full py-12 text-center text-surface-dim bg-[#0a1120] rounded-3xl border border-white/5">
            등록된 문서가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
