import React from 'react';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Reveal } from './Reveal';

interface ContactProps {
  supportUrl?: string;
}

export const Contact: React.FC<ContactProps> = ({ supportUrl }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  if (!supportUrl) {
    return null;
  }

  return (
    <section id="contact" className="section contact-section">
      <div className="container-page">
        <Reveal>
          <div className="contact-card">
            <div className="contact-icon" aria-hidden="true">
              <MessageCircle size={21} strokeWidth={1.6} />
            </div>
            <p className="eyebrow contact-eyebrow">{isAr ? 'الدعم' : 'Support'}</p>
            <h2 className="section-title heading-glow">{isAr ? 'محتاج مساعدة؟' : 'Need a hand?'}</h2>
            <p className="contact-text">{t.faq.supportText}</p>
            <a
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              {t.faq.supportBtn}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <p className="contact-note">
              {isAr ? 'بنرد عادةً خلال دقائق.' : 'We usually reply within minutes.'}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
