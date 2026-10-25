import React, { useState } from 'react';
import { Smartphone, Monitor, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type GuidePlatform = 'v2rayng' | 'hiddify' | 'streisand' | 'v2box' | 'v2rayn';

export const SetupGuides: React.FC = () => {
  const { t } = useLanguage();
  const [activePlatform, setActivePlatform] = useState<GuidePlatform>('hiddify');

  const platforms: { id: GuidePlatform; name: string; os: string; icon: React.ReactNode }[] = [
    {
      id: 'hiddify',
      name: 'Hiddify',
      os: 'All Platforms',
      icon: <Monitor className="w-4 h-4 text-[#FFD60A]" />,
    },
    {
      id: 'v2rayng',
      name: 'v2rayNG',
      os: 'Android',
      icon: <Smartphone className="w-4 h-4 text-[#FFD60A]" />,
    },
    {
      id: 'streisand',
      name: 'Streisand',
      os: 'iOS',
      icon: <Smartphone className="w-4 h-4 text-[#FFD60A]" />,
    },
    {
      id: 'v2box',
      name: 'V2Box',
      os: 'iOS / Android',
      icon: <Smartphone className="w-4 h-4 text-[#FFD60A]" />,
    },
    {
      id: 'v2rayn',
      name: 'v2rayN',
      os: 'Windows PC',
      icon: <Monitor className="w-4 h-4 text-[#FFD60A]" />,
    },
  ];

  const currentGuide = t.guides.platforms[activePlatform];

  return (
    <section id="guides" className="w-full py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block text-[11px] font-semibold text-[#FFD60A] bg-[#FFD60A]/10 px-3 py-1 rounded-full border border-[#FFD60A]/20 mb-2 transition-transform duration-200 hover:scale-105">
            {t.guides.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#E8E8E8] tracking-tight">
            {t.guides.title}
          </h2>
          <p className="text-sm text-[#8A8A8A] mt-2 max-w-md mx-auto">
            {t.guides.subtitle}
          </p>
        </div>

        {/* Platform Selector Tabs with smooth slide */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
          {platforms.map((p) => {
            const isSelected = activePlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border active:scale-95 ${
                  isSelected
                    ? 'bg-[#181818] border-[#FFD60A] text-[#E8E8E8] shadow-glow-sm scale-[1.02] -translate-y-0.5'
                    : 'bg-[#101010] border-[#222222] text-[#8A8A8A] hover:border-[#383838] hover:text-[#E8E8E8] hover:-translate-y-0.5'
                }`}
              >
                {p.icon}
                <span>{p.name}</span>
                <span className="text-[10px] text-[#8A8A8A] hidden sm:inline">({p.os})</span>
              </button>
            );
          })}
        </div>

        {/* Steps Card with smooth fade-in */}
        <div
          key={activePlatform}
          className="w-full max-w-2xl mx-auto rounded-[14px] bg-[#121212] border border-[#222222] p-6 sm:p-8 shadow-card transition-all duration-300 hover:border-[#2C2C2C] animate-fade-in"
        >
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1E1E1E]">
            <div>
              <h3 className="text-lg font-bold text-[#E8E8E8]">{currentGuide.name}</h3>
              <span className="text-xs text-[#FFD60A]">{currentGuide.os}</span>
            </div>
            <a
              href="#generator"
              className="inline-flex items-center gap-1.5 text-xs text-[#8A8A8A] hover:text-[#FFD60A] transition-all duration-200 hover:-translate-y-0.5 group"
            >
              <span>{t.hero.cta}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <div className="space-y-4">
            {currentGuide.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3.5 group">
                <div className="w-6 h-6 rounded-full bg-[#1C1C1C] text-[#FFD60A] group-hover:bg-[#FFD60A] group-hover:text-[#0A0A0A] border border-[#2A2A2A] group-hover:border-[#FFD60A] flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 transition-all duration-200 shadow-sm">
                  {idx + 1}
                </div>
                <p className="text-sm text-[#CCCCCC] group-hover:text-[#E8E8E8] leading-relaxed flex-1 transition-colors">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
