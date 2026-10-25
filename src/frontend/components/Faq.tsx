import React, { useState } from 'react';
import { ChevronDown, Send } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface FaqProps {
  supportUrl?: string;
}

export const Faq: React.FC<FaqProps> = ({ supportUrl = 'https://t.me/wegov2ray' }) => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="w-full py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block text-[11px] font-semibold text-[#FFD60A] bg-[#FFD60A]/10 px-3 py-1 rounded-full border border-[#FFD60A]/20 mb-2 transition-transform duration-200 hover:scale-105">
            {t.faq.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#E8E8E8] tracking-tight">
            {t.faq.title}
          </h2>
          <p className="text-sm text-[#8A8A8A] mt-2 max-w-md mx-auto">
            {t.faq.subtitle}
          </p>
        </div>

        <div className="w-full max-w-2xl mx-auto space-y-3">
          {t.faq.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-[14px] border transition-all duration-250 overflow-hidden ${
                  isOpen
                    ? 'bg-[#141414] border-[#FFD60A]/35 shadow-glow-sm'
                    : 'bg-[#121212] border-[#222222] hover:border-[#303030] hover:bg-[#151515]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-start cursor-pointer transition-colors"
                >
                  <span className={`text-sm sm:text-base font-semibold transition-colors ${isOpen ? 'text-[#FFD60A]' : 'text-[#E8E8E8]'}`}>
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#8A8A8A] transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#FFD60A]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-[#8A8A8A] leading-relaxed border-t border-[#1C1C1C] animate-fade-in">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Telegram Support CTA Card with Interactive Glow */}
        <div className="interactive-card w-full max-w-2xl mx-auto mt-8 p-6 rounded-[14px] bg-[#121212] border border-[#222222] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start shadow-card">
          <div>
            <h4 className="text-sm font-bold text-[#E8E8E8]">{t.faq.supportText}</h4>
            <span className="text-xs text-[#8A8A8A]">wegov2ray community & live announcements</span>
          </div>
          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#1D2B3A] hover:bg-[#25374B] text-[#54A9EB] hover:text-white border border-[#2B435C] hover:border-[#54A9EB]/50 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shrink-0 cursor-pointer shadow-sm group"
          >
            <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>{t.faq.supportBtn}</span>
          </a>
        </div>
      </div>
    </section>
  );
};
