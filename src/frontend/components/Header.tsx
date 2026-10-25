import React from 'react';
import { Languages, Send } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface HeaderProps {
  supportUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({ supportUrl = 'https://t.me/wegov2ray' }) => {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0A0A0A]/80 border-b border-[#1A1A1A] transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo with Pulsing Glowing Dot */}
        <a href="#" className="flex items-center gap-1 group transition-transform duration-200 active:scale-95">
          <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#E8E8E8] group-hover:text-white transition-colors">
            wegov2ray
          </span>
          <span className="w-2 h-2 rounded-full bg-[#FFD60A] glow-dot translate-y-0.5 animate-pulse-glow" />
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#8A8A8A]">
          <a
            href="#generator"
            className="hover:text-[#FFD60A] transition-all duration-200 hover:-translate-y-0.5"
          >
            {t.nav.generator}
          </a>
          <a
            href="#status"
            className="hover:text-[#FFD60A] transition-all duration-200 hover:-translate-y-0.5"
          >
            {t.nav.status}
          </a>
          <a
            href="#guides"
            className="hover:text-[#FFD60A] transition-all duration-200 hover:-translate-y-0.5"
          >
            {t.nav.guides}
          </a>
          <a
            href="#faq"
            className="hover:text-[#FFD60A] transition-all duration-200 hover:-translate-y-0.5"
          >
            {t.nav.faq}
          </a>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Telegram Support Link */}
          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-[10px] bg-[#141414] hover:bg-[#1C1C1C] text-[#8A8A8A] hover:text-[#54A9EB] border border-[#222222] hover:border-[#333333] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
            title="Telegram Support"
          >
            <Send className="w-4 h-4" />
          </a>

          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#141414] hover:bg-[#1C1C1C] border border-[#222222] hover:border-[#3A3A3A] text-xs font-semibold text-[#E8E8E8] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-[#FFD60A]" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
