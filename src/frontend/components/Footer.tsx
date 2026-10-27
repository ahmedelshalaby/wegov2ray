import React from 'react';
import { ArrowUp, Send } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Logo } from './Logo';

interface FooterProps {
  onOpenLegal: (type: 'terms' | 'privacy') => void;
  supportUrl?: string;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal, supportUrl }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container-page">
        <div className="footer-main">
          <div className="footer-brand">
            <Logo />
            <p className="footer-tagline">{t.footer.tagline}</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <p className="footer-heading">{isAr ? 'قانوني' : 'Legal'}</p>
              <button type="button" onClick={() => onOpenLegal('terms')}>
                {t.footer.terms}
              </button>
              <button type="button" onClick={() => onOpenLegal('privacy')}>
                {t.footer.privacy}
              </button>
            </div>
            <div className="footer-column">
              <p className="footer-heading">{isAr ? 'تواصل' : 'Contact'}</p>
              {supportUrl ? (
                <a
                  href={supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-support"
                >
                  <Send size={13} aria-hidden="true" />
                  Telegram
                </a>
              ) : (
                <span className="footer-muted">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            {t.footer.copyright} · {year}
          </p>
          <p className="footer-disclaimer">
            {isAr
              ? 'الخدمة مقدمة كما هي، بدون أي ضمانات.'
              : 'Service provided as-is, without warranties.'}
          </p>
          <button
            type="button"
            className="footer-top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ArrowUp size={14} aria-hidden="true" />
            {isAr ? 'للأعلى' : 'Back to top'}
          </button>
        </div>
      </div>
    </footer>
  );
};
