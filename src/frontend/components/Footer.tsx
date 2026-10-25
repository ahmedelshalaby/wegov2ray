import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface FooterProps {
  onOpenLegal: (type: 'terms' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  const { t } = useLanguage();

  return (
    <footer className="w-full border-t border-[#1C1C1C] py-10 px-4 sm:px-6 bg-[#080808] text-xs text-[#8A8A8A]">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        {/* Brand & Tagline */}
        <div className="flex flex-col items-center sm:items-start gap-1">
          <div className="flex items-center gap-1 font-bold text-sm text-[#E8E8E8]">
            <span>wegov2ray</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD60A] glow-dot" />
          </div>
          <span className="text-[11px] text-[#6A6A6A]">{t.footer.tagline}</span>
        </div>

        {/* Legal Links */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onOpenLegal('terms')}
            className="hover:text-[#FFD60A] transition-colors cursor-pointer"
          >
            {t.footer.terms}
          </button>
          <span className="text-[#333333]">•</span>
          <button
            onClick={() => onOpenLegal('privacy')}
            className="hover:text-[#FFD60A] transition-colors cursor-pointer"
          >
            {t.footer.privacy}
          </button>
        </div>

        {/* Copyright */}
        <div className="text-[11px] text-[#555555] font-mono">
          {t.footer.copyright}
        </div>
      </div>
    </footer>
  );
};
