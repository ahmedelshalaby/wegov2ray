import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';

export const Faq: React.FC = () => {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="section faq-section">
      <div className="container-page">
        <div className="split-layout split-layout-wide">
          <Reveal>
            <SectionIntro
              index="04"
              eyebrow={t.faq.badge}
              title={t.faq.title}
              subtitle={t.faq.subtitle}
            />
          </Reveal>

          <Reveal>
            <div className="faq-list">
              {t.faq.items.map((item, index) => {
                const open = openIndex === index;
                return (
                  <div key={item.q} className={`faq-item ${open ? 'is-open' : ''}`}>
                    <h3>
                      <button
                        type="button"
                        className="faq-trigger"
                        aria-expanded={open}
                        aria-controls={`faq-panel-${index}`}
                        id={`faq-trigger-${index}`}
                        onClick={() => setOpenIndex(open ? null : index)}
                      >
                        <span>{item.q}</span>
                        <span className="faq-icon" aria-hidden="true">
                          <Plus size={15} strokeWidth={1.8} />
                        </span>
                      </button>
                    </h3>
                    {open ? (
                      <div
                        id={`faq-panel-${index}`}
                        className="faq-panel"
                        role="region"
                        aria-labelledby={`faq-trigger-${index}`}
                      >
                        <p>{item.a}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
