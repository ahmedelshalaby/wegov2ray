import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';

export const SetupGuides: React.FC = () => {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState<string | null>('v2rayng');

  const guides = Object.entries(t.guides.platforms);

  return (
    <section id="guides" className="section guides-section">
      <div className="container-page">
        <div className="split-layout split-layout-wide">
          <Reveal>
            <div className="split-intro">
              <SectionIntro
                index="03"
                eyebrow={t.guides.badge}
                title={t.guides.title}
                subtitle={t.guides.subtitle}
              />
            </div>
          </Reveal>

          <Reveal>
            <div className="guide-list">
              {guides.map(([id, guide], index) => {
                const open = openId === id;
                return (
                  <div key={id} className={`guide-item ${open ? 'is-open' : ''}`}>
                    <h3>
                      <button
                        type="button"
                        className="guide-trigger"
                        aria-expanded={open}
                        aria-controls={`guide-panel-${id}`}
                        id={`guide-trigger-${id}`}
                        onClick={() => setOpenId(open ? null : id)}
                      >
                        <span className="guide-index" dir="ltr">
                          0{index + 1}
                        </span>
                        <span className="guide-app">
                          <span className="guide-name" dir="ltr">
                            {guide.name}
                          </span>
                          <span className="guide-platform" dir="ltr">
                            {guide.os}
                          </span>
                        </span>
                        <ChevronDown
                          size={17}
                          className={`accordion-chevron ${open ? 'is-open' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    </h3>

                    {open ? (
                      <div
                        id={`guide-panel-${id}`}
                        className="guide-panel"
                        role="region"
                        aria-labelledby={`guide-trigger-${id}`}
                      >
                        <ol className="guide-steps">
                          {guide.steps.map((step, stepIndex) => (
                            <li key={step}>
                              <span className="guide-step-index" dir="ltr">
                                0{stepIndex + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
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
