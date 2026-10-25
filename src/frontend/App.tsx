import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Generator } from './components/Generator';
import { ServerStatus } from './components/ServerStatus';
import { SetupGuides } from './components/SetupGuides';
import { Faq } from './components/Faq';
import { Footer } from './components/Footer';
import { LegalModal } from './components/LegalModal';
import { AdSlot } from './components/AdSlot';

interface AppConfig {
  turnstileSiteKey?: string;
  supportUrl?: string;
  adsEnabled?: boolean;
}

const MainLayout: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>({
    turnstileSiteKey: '',
    supportUrl: 'https://t.me/wegov2ray',
    adsEnabled: false,
  });
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);

  useEffect(() => {
    // Fetch runtime config from backend
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: any) => {
        if (data && data.success) {
          setConfig({
            turnstileSiteKey: data.turnstileSiteKey || '',
            supportUrl: data.supportUrl || 'https://t.me/wegov2ray',
            adsEnabled: !!data.adsEnabled,
          });
        }
      })
      .catch((err) => console.warn('Could not load /api/config:', err));

    // Handle hash-based legal page navigation
    const checkHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#terms') setLegalModalType('terms');
      else if (hash === '#privacy') setLegalModalType('privacy');
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleCloseLegal = () => {
    setLegalModalType(null);
    if (window.location.hash === '#terms' || window.location.hash === '#privacy') {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-[#E8E8E8] flex flex-col justify-between selection:bg-[#FFD60A] selection:text-[#0A0A0A] overflow-hidden">
      {/* Background Soft Ambient Glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[450px] bg-[#FFD60A]/[0.045] blur-[130px] rounded-full animate-ambient"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-[700px] left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-[#FFD60A]/[0.03] blur-[150px] rounded-full"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <Header supportUrl={config.supportUrl} />
        
        <main>
          <Hero />

          {/* Ad Slot: Above Generator */}
          <AdSlot id="ad-top-generator" enabled={config.adsEnabled} />

          <Generator turnstileSiteKey={config.turnstileSiteKey} />

          {/* Ad Slot: After Result / Generator */}
          <AdSlot id="ad-after-result" enabled={config.adsEnabled} />

          <ServerStatus />

          <SetupGuides />

          <Faq supportUrl={config.supportUrl} />
        </main>
      </div>

      <Footer onOpenLegal={(type) => setLegalModalType(type)} />

      {/* Accessible Terms & Privacy Overlay */}
      <LegalModal type={legalModalType} onClose={handleCloseLegal} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <MainLayout />
    </LanguageProvider>
  );
};
