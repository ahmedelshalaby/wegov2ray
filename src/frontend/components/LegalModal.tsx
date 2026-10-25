import React, { useEffect } from 'react';
import { X, ShieldAlert, FileText } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface LegalModalProps {
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  const { t } = useLanguage();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (type) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [type, onClose]);

  if (!type) return null;

  const isTerms = type === 'terms';
  const title = isTerms ? t.legal.termsTitle : t.legal.privacyTitle;
  const content = isTerms ? t.legal.termsContent : t.legal.privacyContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-[16px] bg-[#121212] border border-[#262626] shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#202020] bg-[#161616]">
          <div className="flex items-center gap-2.5">
            {isTerms ? (
              <FileText className="w-5 h-5 text-[#FFD60A]" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#FFD60A]" />
            )}
            <h3 className="text-base sm:text-lg font-bold text-[#E8E8E8]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[10px] bg-[#1E1E1E] hover:bg-[#2A2A2A] text-[#8A8A8A] hover:text-[#E8E8E8] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm text-[#B0B0B0] leading-relaxed">
          {content.map((sec, idx) => (
            <div key={idx} className="p-4 rounded-[12px] bg-[#0E0E0E] border border-[#1E1E1E]">
              <h4 className="font-bold text-[#E8E8E8] text-sm sm:text-base mb-2">
                {sec.heading}
              </h4>
              <p className="text-xs sm:text-sm text-[#8A8A8A] leading-relaxed">{sec.text}</p>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#202020] bg-[#141414] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-[12px] bg-[#FFD60A] text-[#0A0A0A] font-bold text-xs sm:text-sm hover:bg-[#FFE033] transition-all glow-on-hover cursor-pointer"
          >
            {t.legal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
