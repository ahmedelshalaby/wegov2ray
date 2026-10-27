import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Globe2,
  Layers,
  Loader2,
  Network,
  Shield,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { TurnstileWidget } from './TurnstileWidget';
import { ResultCard } from './ResultCard';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';
import { StoredSubscription, saveLastSubscription, loadLastSubscription, clearLastSubscription } from '../utils/storage';

export type SupportedProtocol =
  | 'vless-reality'
  | 'vless-ws'
  | 'vmess-ws-tls'
  | 'trojan-tls'
  | 'shadowsocks'
  | 'vless-grpc-tls'
  | 'vless-httpupgrade-tls';
export type SupportedDuration = 86400 | 345600 | 604800;

interface GeneratorProps {
  turnstileSiteKey?: string;
  authenticated: boolean;
  onLogin: () => void;
}

const PROTOCOL_ICONS: Record<SupportedProtocol, LucideIcon> = {
  'vless-reality': Zap,
  'vless-ws': Globe2,
  'vmess-ws-tls': ShieldCheck,
  'trojan-tls': Shield,
  shadowsocks: Layers,
  'vless-grpc-tls': Network,
  'vless-httpupgrade-tls': Globe2,
};

const PROTOCOL_NAMES: Record<SupportedProtocol, string> = {
  'vless-reality': 'VLESS + REALITY',
  'vless-ws': 'VLESS + WebSocket + TLS',
  'vmess-ws-tls': 'VMess + WebSocket + TLS',
  'trojan-tls': 'Trojan + TLS',
  shadowsocks: 'Shadowsocks',
  'vless-grpc-tls': 'VLESS + gRPC + TLS',
  'vless-httpupgrade-tls': 'VLESS + HTTPUpgrade + TLS',
};

const PROTOCOL_DESCRIPTIONS: Record<SupportedProtocol, { ar: string; en: string }> = {
  'vless-reality': { ar: 'اتصال سريع وآمن بتقنية Reality', en: 'Fast, secure connection using Reality' },
  'vless-ws': { ar: 'اتصال VLESS عبر WebSocket مشفّر', en: 'VLESS connection over encrypted WebSocket' },
  'vmess-ws-tls': { ar: 'توافق واسع عبر WebSocket و TLS', en: 'Broad compatibility with WebSocket and TLS' },
  'trojan-tls': { ar: 'اتصال Trojan مشفّر باستخدام TLS', en: 'Encrypted Trojan connection using TLS' },
  shadowsocks: { ar: 'اتصال Shadowsocks خفيف وسريع', en: 'Lightweight, fast Shadowsocks connection' },
  'vless-grpc-tls': { ar: 'اتصال VLESS عبر gRPC و TLS', en: 'VLESS connection over gRPC and TLS' },
  'vless-httpupgrade-tls': { ar: 'اتصال VLESS عبر HTTPUpgrade و TLS', en: 'VLESS connection over HTTPUpgrade and TLS' },
};

/**
 * Guests get the three headline protocols so the form never renders empty.
 * Signed-in users get whatever the 3x-ui panel currently exposes.
 */
const GUEST_PROTOCOLS: SupportedProtocol[] = ['vless-reality', 'vless-ws', 'vmess-ws-tls'];
const guestOptions = () =>
  GUEST_PROTOCOLS.map((protocol) => ({ protocol, label: PROTOCOL_NAMES[protocol] }));

/** Translation keys carry a leading "01 · " index that the layout already renders. */
const stripIndex = (value: string) => value.replace(/^\s*\d+\s*·\s*/, '');

export const Generator: React.FC<GeneratorProps> = ({ turnstileSiteKey, authenticated, onLogin }) => {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const [selectedProtocol, setSelectedProtocol] = useState<SupportedProtocol>('vless-reality');
  const [selectedDuration, setSelectedDuration] = useState<SupportedDuration>(86400);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<StoredSubscription | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<{ protocol: SupportedProtocol; label: string }[]>(guestOptions);
  const [accountPolicy, setAccountPolicy] = useState({ expiryDays: 7, trafficGB: 0 });
  const requestKey = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!authenticated) {
      setActiveSubscription(null);
      setIsRestored(false);
      setAvailableOptions(guestOptions());
    }
  }, [authenticated]);

  // Restore the last subscription this device created, exactly like the old site.
  useEffect(() => {
    const saved = loadLastSubscription();
    if (saved) {
      setActiveSubscription(saved);
      setIsRestored(true);
    }
  }, []);

  const durationsConfig: { id: SupportedDuration; label: string }[] = [
    { id: 86400, label: t.generator.durations['86400'] },
    { id: 345600, label: t.generator.durations['345600'] },
    { id: 604800, label: t.generator.durations['604800'] },
  ];

  useEffect(() => {
    if (!authenticated) {
      setAvailableOptions(guestOptions());
      return;
    }
    fetch('/api/accounts/options')
      .then(async (res) => {
        const data: any = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'تعذر تحميل أنواع الاتصال');
        setAvailableOptions(data.options || []);
        setAccountPolicy(data.accountPolicy || { expiryDays: 7, trafficGB: 0 });
        if (data.options?.length && !data.options.some((option: any) => option.protocol === selectedProtocol)) {
          setSelectedProtocol(data.options[0].protocol);
        }
      })
      .catch((err) => setErrorMessage(err.message || 'تعذر الاتصال بالخدمة الآن.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const handleGenerate = async () => {
    if (!authenticated) {
      onLogin();
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey.current },
        body: JSON.stringify({ protocol: selectedProtocol, duration: selectedDuration, turnstileToken }),
      });
      const data: any = await res.json();
      if (!res.ok || !data?.success || !data.account?.config) {
        setErrorMessage(res.status === 429 ? t.generator.limitMsg : data?.error || 'تعذر إنشاء الحساب.');
        return;
      }
      const account = data.account;
      const newSub: StoredSubscription = {
        subUrl: account.config,
        links: [account.config],
        expiresAt: account.expiresAt,
        volume: account.trafficLimitBytes || 0,
        protocol: account.protocol || selectedProtocol,
        duration: Math.max(0, account.expiresAt - account.createdAt),
        createdAt: account.createdAt,
      };
      setActiveSubscription(newSub);
      setIsRestored(false);
      saveLastSubscription(newSub);
      requestKey.current = crypto.randomUUID();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.generator.genericError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    clearLastSubscription();
    setActiveSubscription(null);
    setIsRestored(false);
    setErrorMessage(null);
  };

  const protocolsConfig = availableOptions.map((option) => ({
    id: option.protocol,
    name: PROTOCOL_NAMES[option.protocol] || option.label,
    desc: PROTOCOL_DESCRIPTIONS[option.protocol]?.[language] || '',
  }));

  const canSubmit = !isLoading && (authenticated ? Boolean(turnstileToken) : true);

  return (
    <section id="generator" className="section generator-section">
      <div className="container-page">
        <Reveal>
          <SectionIntro
            index="01"
            eyebrow={stripIndex(t.generator.badge)}
            title={t.generator.title}
            subtitle={t.generator.subtitle}
          />
        </Reveal>

        <div className="generator-shell">
          <div className="generator-main">
            {activeSubscription ? (
              <div className="result-anchor">
                <Reveal>
                  <ResultCard
                    subscription={activeSubscription}
                    isRestored={isRestored}
                    onReset={handleReset}
                  />
                </Reveal>
              </div>
            ) : (
              <Reveal>
                <div className="generator-card" id="generator-form">
                  <div className="generator-card-head">
                    <span className="card-signal" aria-hidden="true" />
                    <p>
                      {stripIndex(t.generator.protocolLabel)} <span dir="ltr">/</span>{' '}
                      {isAr ? 'المدة' : 'Duration'}
                    </p>
                    <span className="generator-free">
                      <span className="generator-free-dot" aria-hidden="true" />
                      {isAr ? 'مجاني' : 'Free'}
                    </span>
                  </div>

                  <form
                    className="generator-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleGenerate();
                    }}
                    noValidate
                  >
                    <fieldset className="form-fieldset">
                      <legend className="field-label">
                        <span className="field-index" dir="ltr">
                          01
                        </span>
                        {stripIndex(t.generator.protocolLabel)}
                      </legend>
                      <div className="protocol-grid">
                        {protocolsConfig.map((item) => {
                          const Icon = PROTOCOL_ICONS[item.id] ?? Zap;
                          const selected = selectedProtocol === item.id;
                          return (
                            <label
                              key={item.id}
                              className={`protocol-card ${selected ? 'is-selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name="protocol"
                                value={item.id}
                                checked={selected}
                                className="sr-only"
                                onChange={() => {
                                  setSelectedProtocol(item.id);
                                  setErrorMessage(null);
                                }}
                              />
                              <span className="protocol-card-top">
                                <span className="protocol-icon" aria-hidden="true">
                                  <Icon size={17} strokeWidth={1.7} />
                                </span>
                                <span className="protocol-check" aria-hidden="true">
                                  {selected ? <Check size={12} strokeWidth={2.4} /> : null}
                                </span>
                              </span>
                              <span className="protocol-name" dir="ltr">
                                {item.name}
                              </span>
                              <span className="protocol-tagline">{item.desc}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <fieldset className="form-fieldset duration-fieldset">
                      <legend className="field-label">
                        <span className="field-index" dir="ltr">
                          02
                        </span>
                        {isAr
                          ? `المدة (حتى ${accountPolicy.expiryDays} يوم)`
                          : `Duration (up to ${accountPolicy.expiryDays} days)`}
                      </legend>
                      <div className="duration-grid">
                        {durationsConfig
                          .filter((dur) => dur.id <= accountPolicy.expiryDays * 86400)
                          .map((item) => {
                            const selected = selectedDuration === item.id;
                            return (
                              <label
                                key={item.id}
                                className={`duration-chip ${selected ? 'is-selected' : ''}`}
                              >
                                <input
                                  type="radio"
                                  name="duration"
                                  value={item.id}
                                  checked={selected}
                                  className="sr-only"
                                  onChange={() => {
                                    setSelectedDuration(item.id);
                                    setErrorMessage(null);
                                  }}
                                />
                                <span>{item.label}</span>
                                <span className="duration-check" aria-hidden="true">
                                  {selected ? <Check size={11} strokeWidth={2.5} /> : null}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                      <p className="duration-hint">
                        {isAr ? 'حد البيانات:' : 'Data limit:'}{' '}
                        {accountPolicy.trafficGB
                          ? `${accountPolicy.trafficGB} GB`
                          : isAr
                            ? 'غير محدود'
                            : 'Unlimited'}
                      </p>
                    </fieldset>

                    <div className="form-action-area">
                      <TurnstileWidget
                        siteKey={turnstileSiteKey}
                        onVerify={(token) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken('')}
                      />

                      {errorMessage ? (
                        <div className="form-alert" role="alert">
                          <AlertCircle size={16} aria-hidden="true" />
                          <p>{errorMessage}</p>
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        className="btn-primary create-button"
                        disabled={!canSubmit}
                        aria-busy={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={17} className="spin" aria-hidden="true" />
                            <span>{t.generator.generatingBtn}</span>
                          </>
                        ) : (
                          <>
                            <span>{authenticated ? t.generator.generateBtn : isAr ? 'سجّل الدخول للإنشاء' : 'Sign in to create'}</span>
                            <ArrowRight
                              size={17}
                              strokeWidth={2}
                              className="cta-directional"
                              aria-hidden="true"
                            />
                          </>
                        )}
                      </button>

                      <p className="create-note">
                        <span>{isAr ? 'مجاني · بدون تسجيل' : 'Free · No signup'}</span>
                        <span className="dot-separator" aria-hidden="true">
                          ·
                        </span>
                        <span>{isAr ? 'حماية Cloudflare Turnstile' : 'Cloudflare Turnstile protected'}</span>
                      </p>
                    </div>
                  </form>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
