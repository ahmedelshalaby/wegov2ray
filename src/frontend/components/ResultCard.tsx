import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Link2,
  QrCode,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../i18n/LanguageContext';
import { StoredSubscription } from '../utils/storage';
import { getAppDeepLinks } from '../utils/deeplinks';
import { CopyButton } from './CopyButton';

interface ResultCardProps {
  subscription: StoredSubscription;
  isRestored?: boolean;
  onReset: () => void;
}

const pad = (value: number) => String(value).padStart(2, '0');

const PROTOCOL_NAMES: Record<string, string> = {
  'vless-reality': 'VLESS Reality',
  'vless-ws': 'VLESS WS',
  'vmess-ws-tls': 'VMess WS TLS',
  'vmess-tcp': 'VMess TCP',
  'trojan-tls': 'Trojan TLS',
  shadowsocks: 'Shadowsocks',
  'vless-grpc-tls': 'VLESS gRPC TLS',
  'vless-httpupgrade-tls': 'VLESS HTTPUpgrade TLS',
};

function formatVolume(bytes: number, unlimited: string): string {
  if (!bytes) {
    return unlimited;
  }
  const tb = bytes / 1_099_511_627_776;
  if (tb >= 1) {
    return `${Number.isInteger(tb) ? tb : tb.toFixed(1)} TB`;
  }
  const gb = bytes / 1_073_741_824;
  return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  subscription,
  isRestored = false,
  onReset,
}) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const [linksOpen, setLinksOpen] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const diff = Math.max(0, subscription.expiresAt - now);
  const expired = diff <= 0;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  const appLinks = getAppDeepLinks(subscription.subUrl);
  const protocolName = PROTOCOL_NAMES[subscription.protocol] ?? subscription.protocol.toUpperCase();
  const volumeLabel = formatVolume(subscription.volume, t.result.unlimitedQuota);

  return (
    <article className="result-card" aria-labelledby="result-title">
      <header className="result-header">
        <div>
          <p className="result-kicker">
            <span className={`result-icon ${expired ? 'is-expired' : ''}`}>
              {expired ? (
                <Clock3 size={15} aria-hidden="true" />
              ) : (
                <Check size={15} strokeWidth={2.4} aria-hidden="true" />
              )}
            </span>
            {isAr ? 'جاهز' : 'Ready'}
          </p>
          <h3 id="result-title" className="result-title" data-result-heading tabIndex={-1}>
            {expired
              ? isAr
                ? 'انتهت صلاحية الاشتراك.'
                : 'Subscription expired.'
              : isRestored
                ? t.result.titleRestored
                : t.result.titleSuccess}
          </h3>
          <p className="result-subtitle">
            {expired
              ? isAr
                ? 'أنشئ اشتراكاً جديداً للمتابعة.'
                : 'Create a new subscription to continue.'
              : isAr
                ? 'انسخ رابط الاشتراك وأضفه لتطبيقك في ثوانٍ.'
                : 'Copy the subscription link and add it to your app.'}
          </p>
        </div>
        <div className="result-badges">
          {isRestored ? (
            <span className="result-badge result-badge-accent">{t.result.restoredBadge}</span>
          ) : null}
          <span className="result-badge">
            <Database size={12} aria-hidden="true" />
            {isAr ? 'محفوظ محلياً' : 'Saved locally'}
          </span>
        </div>
      </header>

      {expired ? (
        <div className="expired-panel">
          <div className="expired-copy">
            <Clock3 size={19} aria-hidden="true" />
            <p>{isAr ? 'انتهت مدة هذا الاشتراك.' : 'This subscription has expired.'}</p>
          </div>
          <button type="button" className="btn-primary" onClick={onReset}>
            {t.result.generateNew}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className="result-main">
            <div className="subscription-block">
              <p className="small-label">{t.result.subUrlLabel}</p>
              <div className="subscription-row">
                <div className="subscription-code" dir="ltr" title={subscription.subUrl}>
                  <Link2 size={15} aria-hidden="true" />
                  <span>{subscription.subUrl}</span>
                </div>
                <CopyButton
                  text={subscription.subUrl}
                  label={t.result.copyBtn}
                  className="copy-button-primary"
                />
              </div>
              <div className="result-meta">
                <div className="result-meta-item">
                  <span>{t.result.quotaLabel}</span>
                  <strong dir="ltr">{volumeLabel}</strong>
                </div>
                <div className="result-meta-item">
                  <span>{isAr ? 'البروتوكول' : 'Protocol'}</span>
                  <strong dir="ltr">{protocolName}</strong>
                </div>
              </div>
            </div>

            <aside className="qr-panel">
              <div className="qr-frame" aria-hidden="true">
                <QRCodeSVG
                  value={subscription.subUrl}
                  size={164}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#0A0A0A"
                  marginSize={2}
                  title={t.result.qrTitle}
                />
              </div>
              <div className="qr-caption">
                <p className="qr-title">
                  <QrCode size={14} aria-hidden="true" />
                  {t.result.qrTitle}
                </p>
                <p className="qr-hint">
                  {isAr ? 'افتح تطبيقك وامسح الكود.' : 'Open your app and scan the code.'}
                </p>
              </div>
            </aside>
          </div>

          <div className="countdown-block">
            <p className="small-label">{t.result.remainingLabel}</p>
            <div className="countdown" role="timer">
              <div className="countdown-cell">
                <strong dir="ltr">{pad(days)}</strong>
                <span>{isAr ? 'يوم' : 'Days'}</span>
              </div>
              <span className="countdown-colon" aria-hidden="true">
                :
              </span>
              <div className="countdown-cell">
                <strong dir="ltr">{pad(hours)}</strong>
                <span>{isAr ? 'ساعة' : 'Hours'}</span>
              </div>
              <span className="countdown-colon" aria-hidden="true">
                :
              </span>
              <div className="countdown-cell">
                <strong dir="ltr">{pad(minutes)}</strong>
                <span>{isAr ? 'دقيقة' : 'Min'}</span>
              </div>
              <span className="countdown-colon" aria-hidden="true">
                :
              </span>
              <div className="countdown-cell">
                <strong dir="ltr">{pad(seconds)}</strong>
                <span>{isAr ? 'ثانية' : 'Sec'}</span>
              </div>
            </div>
          </div>

          <section className="apps-section" aria-labelledby="apps-title">
            <div className="block-heading">
              <p className="small-label" id="apps-title">
                {t.result.deepLinksTitle}
              </p>
              <p className="block-hint">
                {isAr
                  ? 'اختار تطبيقك، أو الصق رابط الاشتراك يدوياً.'
                  : 'Pick your app, or paste the subscription link manually.'}
              </p>
            </div>
            <div className="app-links">
              {appLinks.map((app) => (
                <a key={app.name} className="app-link" href={app.scheme}>
                  <span className="app-mark" aria-hidden="true">
                    {app.name.charAt(0)}
                  </span>
                  <span className="app-name" dir="ltr">
                    {app.name}
                  </span>
                  <ArrowUpRight size={14} className="app-arrow" aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>

          {subscription.links.length > 0 ? (
            <section className="config-section">
              <button
                type="button"
                className="config-toggle"
                aria-expanded={linksOpen}
                aria-controls="config-links-panel"
                onClick={() => setLinksOpen((open) => !open)}
              >
                <span className="config-toggle-title">
                  <Link2 size={15} aria-hidden="true" />
                  {linksOpen ? t.result.hideConfigs : t.result.showConfigs}
                  <span className="config-count" dir="ltr">
                    {subscription.links.length}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`accordion-chevron ${linksOpen ? 'is-open' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {linksOpen ? (
                <div id="config-links-panel" className="config-panel">
                  <ul className="config-list">
                    {subscription.links.map((link, index) => (
                      <li key={`${index}-${link.slice(0, 12)}`} className="config-row">
                        <span className="config-kind" dir="ltr">
                          {link.startsWith('vless://') ? 'VLESS' : link.startsWith('vmess://') ? 'VMess' : 'CONF'}
                        </span>
                        <span className="config-inline" dir="ltr" title={link}>
                          {link}
                        </span>
                        <CopyButton text={link} label={t.result.configCopy} compact />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <footer className="result-footer">
            <p className="share-warning">
              <ShieldCheck size={14} aria-hidden="true" />
              {isAr ? 'لا تشارك هذا الرابط مع أي شخص.' : 'Do not share this link with anyone.'}
            </p>
            <button type="button" className="text-button" onClick={onReset}>
              <Trash2 size={14} aria-hidden="true" />
              {t.result.generateNew}
            </button>
          </footer>
        </>
      )}
    </article>
  );
};
