import React from 'react';
import { ArrowDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface HeroProps {
  onNavigate: (section: 'generator') => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-halo" aria-hidden="true" />

      <div className="container-page hero-inner">
        <p className="hero-badge hero-stagger">
          <span className="live-dot" aria-hidden="true" />
          {t.hero.tag}
        </p>

        <h1 id="hero-title" className="display-title hero-stagger">
          <span className="display-line">
            {t.hero.titlePrefix} <span className="title-accent">{t.hero.titleAccent}</span>
          </span>
          <span className="display-line display-line-muted">{t.hero.titleSuffix}</span>
        </h1>

        <p className="hero-subtitle hero-stagger">{t.hero.subtitle}</p>

        <div className="hero-cta hero-stagger">
          <button type="button" className="btn-primary" onClick={() => onNavigate('generator')}>
            <span>{t.hero.cta}</span>
            <ArrowDown size={17} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <p className="hero-note hero-stagger">
          <span className="hero-note-dot" aria-hidden="true" />
          {t.hero.note}
        </p>
      </div>

      <div className="hero-foot" aria-hidden="true">
        <div className="container-page hero-foot-inner">
          <span className="hero-foot-line" />
          <span className="hero-foot-mark" />
          <span className="hero-foot-line" />
        </div>
      </div>
    </section>
  );
};
