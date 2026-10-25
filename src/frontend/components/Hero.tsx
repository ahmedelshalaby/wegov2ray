import React from 'react';
import { ArrowDown, Zap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const Hero: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="w-full pt-16 pb-12 sm:pt-24 sm:pb-16 px-4 sm:px-6 text-center animate-fade-slide-up">
      <div className="max-w-3xl mx-auto flex flex-col items-center">
        {/* Floating Minimal Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#141414]/90 border border-[#262626] text-xs text-[#8A8A8A] mb-6 shadow-sm animate-float backdrop-blur-sm transition-all hover:border-[#FFD60A]/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD60A] glow-dot animate-pulse-glow" />
          <span>{t.hero.tag}</span>
        </div>

        {/* Short Punchy Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#E8E8E8] tracking-tight leading-tight mb-4">
          {t.hero.title}
        </h1>

        {/* Exactly 1 clean sentence */}
        <p className="text-base sm:text-lg text-[#8A8A8A] max-w-xl mx-auto leading-relaxed mb-8">
          {t.hero.subtitle}
        </p>

        {/* Primary CTA Button with soft yellow glow & light shimmer sweep */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <a
            href="#generator"
            className="btn-shimmer w-full sm:w-auto px-8 py-3.5 rounded-[14px] bg-[#FFD60A] hover:bg-[#FFE033] text-[#0A0A0A] font-bold text-sm sm:text-base transition-all duration-300 glow-on-hover shadow-glow hover:shadow-glow-lg inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 group"
          >
            <Zap className="w-4 h-4 fill-current group-hover:rotate-12 transition-transform duration-300" />
            <span>{t.hero.cta}</span>
            <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform duration-300" />
          </a>
        </div>
      </div>
    </section>
  );
};
