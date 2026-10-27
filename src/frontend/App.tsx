import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Generator } from './components/Generator';
import { ServerStatus } from './components/ServerStatus';
import { SetupGuides } from './components/SetupGuides';
import { Faq } from './components/Faq';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { LegalModal } from './components/LegalModal';
import { AdSlot } from './components/AdSlot';
import { AuthDialog, AuthUser } from './components/AuthDialog';
import { Dashboard } from './components/Dashboard';

interface AppConfig {
  turnstileSiteKey?: string;
  supportUrl?: string;
  adsEnabled?: boolean;
}

type PageSection = 'home' | 'generator' | 'status' | 'guides' | 'faq';
type RouteState =
  | { view: 'section'; section: PageSection }
  | { view: 'dashboard' }
  | { view: 'modal'; modal: 'terms' | 'privacy' };

const cleanUrl = () => `${window.location.pathname}${window.location.search}`;

const scrollToSection = (section: PageSection) => {
  if (section === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    ),
  );
};

const MainLayout: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>({
    turnstileSiteKey: '',
    supportUrl: 'https://t.me/wegov2ray',
    adsEnabled: false,
  });
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const applyRoute = (route: RouteState) => {
    setLegalModalType(route.view === 'modal' ? route.modal : null);
    if (route.view === 'dashboard') {
      setShowDashboard(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowDashboard(false);
    if (route.view === 'section') scrollToSection(route.section);
  };

  const navigateTo = (section: PageSection) => {
    const current = history.state as RouteState | null;
    if (current?.view !== 'section' || current.section !== section) {
      history.pushState({ view: 'section', section } satisfies RouteState, '', cleanUrl());
    }
    applyRoute({ view: 'section', section });
  };

  const openLegal = (modal: 'terms' | 'privacy') => {
    history.pushState({ view: 'modal', modal } satisfies RouteState, '', cleanUrl());
    setLegalModalType(modal);
  };

  const closeLegal = () => {
    if ((history.state as RouteState | null)?.view === 'modal') history.back();
    else setLegalModalType(null);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (data?.success) setUser(data.user);
      })
      .catch(() => undefined);
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (data?.success)
          setConfig({
            turnstileSiteKey: data.turnstileSiteKey || '',
            supportUrl: data.supportUrl || 'https://t.me/wegov2ray',
            adsEnabled: !!data.adsEnabled,
          });
      })
      .catch(() => undefined);

    const params = new URLSearchParams(window.location.search);
    const legacyHash = window.location.hash.slice(1);
    const legacyPath = legacyHash.split('?')[0].toLowerCase();
    const legacyToken = new URLSearchParams(legacyHash.split('?')[1] || '').get('token');
    const validSections: PageSection[] = ['home', 'generator', 'status', 'guides', 'faq'];
    if (legacyPath === 'verify-email' && legacyToken) params.set('verify-email', legacyToken);
    if (legacyPath === 'reset-password' && legacyToken) params.set('reset-password', legacyToken);
    if (params.has('verify-email') || params.has('reset-password')) {
      setAuthMode('login');
      history.replaceState(history.state, '', `${window.location.pathname}?${params.toString()}`);
    }

    let initialRoute: RouteState =
      (history.state as RouteState | null) || { view: 'section', section: 'home' };
    if (legacyPath === 'terms' || legacyPath === 'privacy')
      initialRoute = { view: 'modal', modal: legacyPath };
    else if (legacyPath === 'dashboard') initialRoute = { view: 'dashboard' };
    else if (validSections.includes(legacyPath as PageSection))
      initialRoute = { view: 'section', section: legacyPath as PageSection };
    if (window.location.hash) history.replaceState(initialRoute, '', cleanUrl());
    else if (!history.state) history.replaceState(initialRoute, '', cleanUrl());
    applyRoute(initialRoute);

    const onPopState = (event: PopStateEvent) =>
      applyRoute((event.state as RouteState | null) || { view: 'section', section: 'home' });
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setShowDashboard(false);
    navigateTo('home');
  };

  const openDashboard = () => {
    const route: RouteState = { view: 'dashboard' };
    history.pushState(route, '', cleanUrl());
    applyRoute(route);
  };

  return (
    <>
      <Header
        supportUrl={config.supportUrl}
        user={user}
        onLogin={setAuthMode}
        onDashboard={openDashboard}
        onLogout={() => void logout()}
        onNavigate={(section) => navigateTo(section as PageSection)}
      />

      <main id="main-content">
        {showDashboard && user ? (
          <Dashboard user={user} onGenerate={() => navigateTo('generator')} />
        ) : (
          <>
            <Hero onNavigate={() => navigateTo('generator')} />
            <AdSlot id="ad-top-generator" enabled={config.adsEnabled} />
            <Generator
              turnstileSiteKey={config.turnstileSiteKey}
              authenticated={!!user}
              onLogin={() => setAuthMode('login')}
            />
            <AdSlot id="ad-after-result" enabled={config.adsEnabled} />
            <ServerStatus />
            <SetupGuides />
            <Faq />
            <Contact supportUrl={config.supportUrl} />
          </>
        )}
      </main>

      <Footer onOpenLegal={openLegal} supportUrl={config.supportUrl} />

      <LegalModal type={legalModalType} onClose={closeLegal} />
      <AuthDialog
        open={authMode !== null}
        initialMode={authMode || 'login'}
        onClose={() => setAuthMode(null)}
        onAuthenticated={(newUser) => {
          setUser(newUser);
          setShowDashboard(false);
        }}
      />
    </>
  );
};

export const App: React.FC = () => (
  <LanguageProvider>
    <MainLayout />
  </LanguageProvider>
);
