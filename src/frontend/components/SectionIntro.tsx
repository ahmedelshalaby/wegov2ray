import React from 'react';

interface SectionIntroProps {
  index: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export const SectionIntro: React.FC<SectionIntroProps> = ({
  index,
  eyebrow,
  title,
  subtitle,
  className = '',
}) => (
  <div className={`section-intro ${className}`.trim()}>
    <p className="eyebrow">
      <span className="eyebrow-index" dir="ltr">
        {index}
      </span>
      <span className="eyebrow-rule" aria-hidden="true" />
      <span>{eyebrow}</span>
    </p>
    <h2 className="section-title heading-glow">{title}</h2>
    {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
  </div>
);
