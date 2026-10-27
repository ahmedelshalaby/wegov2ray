import React, { useEffect, useState } from 'react';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { AuthUser } from './AuthDialog';
import { LanguageToggle } from './LanguageToggle';
import { Logo } from './Logo';

interface HeaderProps {
  supportUrl?: string;
  user?: AuthUser | null;
  onLogin: (mode: 'login' | 'register') => void;
  onDashboard: () => void;
  onLogout: () => void;
  onNavigate: (section: string) => void;
}

const NAV_SECTIONS = ['generator', 'status', 'guides', 'faq'] as const;

export const Header: React.FC<HeaderProps> = ({
  supportUrl = 'https://t.me/wegov2ray',
  user,
  onLogin,
  onDashboard,
  onLogout,
  onNavigate,
}) => {
  const { language, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAr = language === 'ar';

  const labels = {
    login: isAr ? 'تسجيل الدخول' : 'Sign in',
    register: isAr ? 'إنشاء حساب' : 'Sign up',
    dashboard: isAr ? 'لوحة الحساب' : 'Dashboard',
    logout: isAr ? 'تسجيل الخروج' : 'Sign out',
    openMenu: isAr ? 'فتح القائمة' : 'Open menu',
    closeMenu: isAr ? 'إغلاق القائمة' : 'Close menu',
  };

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const go = (section: string) => {
    setMenuOpen(false);
    onNavigate(section);
  };

  return (
    <header className="site-header">
      <div className="container-page header-inner">
        <Logo
          onClick={() => {
            setMenuOpen(false);
            onNavigate('home');
          }}
        />

        <nav className="desktop-nav" aria-label={t.nav.generator}>
          {NAV_SECTIONS.map((section) => (
            <button
              key={section}
              type="button"
              className="nav-link"
              onClick={() => go(section)}
            >
              {t.nav[section]}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <button type="button" className="btn-secondary header-auth-btn" onClick={onDashboard}>
                <LayoutDashboard size={14} aria-hidden="true" />
                <span className="header-auth-label">{labels.dashboard}</span>
              </button>
              <button
                type="button"
                className="btn-secondary header-auth-icon"
                onClick={onLogout}
                title={labels.logout}
                aria-label={labels.logout}
              >
                <LogOut size={14} aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary header-auth-btn"
                onClick={() => onLogin('login')}
              >
                {labels.login}
              </button>
              <button
                type="button"
                className="btn-primary header-auth-btn"
                onClick={() => onLogin('register')}
              >
                {labels.register}
              </button>
            </>
          )}

          <LanguageToggle />

          <button
            type="button"
            className="mobile-menu-button"
            aria-label={menuOpen ? labels.closeMenu : labels.openMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <div className="mobile-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />
          <nav id="mobile-navigation" className="mobile-nav" aria-label={t.nav.generator}>
            <div className="container-page">
              {NAV_SECTIONS.map((section, index) => (
                <button
                  key={section}
                  type="button"
                  className="mobile-nav-link"
                  onClick={() => go(section)}
                >
                  <span>{t.nav[section]}</span>
                  <span className="mobile-nav-index" dir="ltr">
                    0{index + 1}
                  </span>
                </button>
              ))}
              {supportUrl ? (
                <a
                  href={supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-nav-link"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{t.nav.support}</span>
                  <span className="mobile-nav-index" dir="ltr">
                    05
                  </span>
                </a>
              ) : null}
              <div className="mobile-nav-legal">
                {user ? (
                  <>
                    <button type="button" onClick={() => { setMenuOpen(false); onDashboard(); }}>
                      {labels.dashboard}
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); onLogout(); }}>
                      {labels.logout}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { setMenuOpen(false); onLogin('login'); }}>
                      {labels.login}
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); onLogin('register'); }}>
                      {labels.register}
                    </button>
                  </>
                )}
              </div>
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
};
