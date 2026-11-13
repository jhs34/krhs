import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { MODAL_BACKDROP_TRANSITION, MODAL_PANEL_TRANSITION } from '../utils/motion';

interface SiteInfoPopupProps {
  title: string;
  content: string;
  onClose: () => void;
}

const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-secondary-container hover:text-white hover:underline break-all">
          {part}
        </a>
      );
    }
    return part;
  });
};

export function SiteInfoPopup({ title, content, onClose }: SiteInfoPopupProps) {
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
        className="bg-[#0a1120] border border-white/10 w-full max-w-lg max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-white leading-tight">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/[0.05] border border-white/10 text-surface-dim hover:text-white hover:bg-white/[0.12] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-grow">
          <div className="text-surface-dim text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {renderTextWithLinks(content)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
