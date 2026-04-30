import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface SiteInfoPopupProps {
  title: string;
  content: string;
  onClose: () => void;
}

export function SiteInfoPopup({ title, content, onClose }: SiteInfoPopupProps) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0a1120] border border-white/10 w-full max-w-lg max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 border border-white/10 text-surface-dim hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
          <div className="text-surface-dim text-base leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
