import React from 'react';
import { Globe2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const LanguageToggle: React.FC = () => {
  const { language, toggleLanguage } = useLanguage();
  const next = language === 'ar' ? 'en' : 'ar';
  const visibleLabel = next === 'en' ? 'EN' : 'ع';

  return (
    <button
      type="button"
      className="language-toggle"
      onClick={toggleLanguage}
      aria-label={next === 'en' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Globe2 size={15} strokeWidth={1.7} aria-hidden="true" />
      <span lang={next} dir={next === 'ar' ? 'rtl' : 'ltr'}>
        {visibleLabel}
      </span>
    </button>
  );
};
