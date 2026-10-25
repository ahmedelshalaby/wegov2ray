import React, { useState, useEffect } from 'react';
import { Zap, Shield, Globe, Layers, AlertCircle, Loader2, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { TurnstileWidget } from './TurnstileWidget';
import { ResultCard } from './ResultCard';
import { StoredSubscription, saveLastSubscription, loadLastSubscription, clearLastSubscription } from '../utils/storage';

export type SupportedProtocol = 'vless-reality' | 'vless-ws' | 'vmess-ws-tls' | 'vmess-tcp';
export type SupportedDuration = 86400 | 345600 | 604800;

interface GeneratorProps {
  turnstileSiteKey?: string;
}

export const Generator: React.FC<GeneratorProps> = ({ turnstileSiteKey }) => {
  const { t } = useLanguage();
  const [selectedProtocol, setSelectedProtocol] = useState<SupportedProtocol>('vless-reality');
  const [selectedDuration, setSelectedDuration] = useState<SupportedDuration>(86400);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<StoredSubscription | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  // Check localStorage on mount for an unexpired subscription
  useEffect(() => {
    const saved = loadLastSubscription();
    if (saved) {
      setActiveSubscription(saved);
      setIsRestored(true);
    }
  }, []);

  const protocolsConfig: {
    id: SupportedProtocol;
    icon: React.ReactNode;
    title: string;
    desc: string;
  }[] = [
    {
      id: 'vless-reality',
      icon: <Zap className="w-5 h-5 text-[#FFD60A]" />,
      title: t.generator.protocols['vless-reality'].name,
      desc: t.generator.protocols['vless-reality'].desc,
    },
    {
      id: 'vless-ws',
      icon: <Globe className="w-5 h-5 text-[#FFD60A]" />,
      title: t.generator.protocols['vless-ws'].name,
      desc: t.generator.protocols['vless-ws'].desc,
    },
    {
      id: 'vmess-ws-tls',
      icon: <Shield className="w-5 h-5 text-[#FFD60A]" />,
      title: t.generator.protocols['vmess-ws-tls'].name,
      desc: t.generator.protocols['vmess-ws-tls'].desc,
    },
    {
      id: 'vmess-tcp',
      icon: <Layers className="w-5 h-5 text-[#FFD60A]" />,
      title: t.generator.protocols['vmess-tcp'].name,
      desc: t.generator.protocols['vmess-tcp'].desc,
    },
  ];

  const durationsConfig: { id: SupportedDuration; label: string }[] = [
    { id: 86400, label: t.generator.durations['86400'] },
    { id: 345600, label: t.generator.durations['345600'] },
    { id: 604800, label: t.generator.durations['604800'] },
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          protocol: selectedProtocol,
          duration: selectedDuration,
          turnstileToken: turnstileToken,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.warn('Response JSON parse error:', parseErr);
      }

      if (!res.ok || !data || !data.success) {
        if (res.status === 503) {
          setErrorMessage(t.generator.serviceFullMsg);
        } else if (res.status === 429) {
          setErrorMessage(data?.error_ar || t.generator.limitMsg);
        } else if (data?.error_ar || data?.error) {
          setErrorMessage(data.error_ar || data.error);
        } else if (res.status === 400 || res.status === 401 || res.status === 403) {
          setErrorMessage(data?.error_ar || data?.error || 'يرجى التأكد من ضبط مفتاح Nexora API وإعادة المحاولة.');
        } else {
          setErrorMessage(t.generator.genericError);
        }
        return;
      }

      const newSub: StoredSubscription = {
        subUrl: data.subUrl,
        links: data.links || [],
        expiresAt: data.expiresAt,
        volume: data.volume,
        protocol: data.protocol || selectedProtocol,
        duration: data.duration || selectedDuration,
        createdAt: Math.floor(Date.now() / 1000),
      };

      // Save to localStorage
      saveLastSubscription(newSub);
      setActiveSubscription(newSub);
      setIsRestored(false);
    } catch (err) {
      console.error('Generation exception:', err);
      setErrorMessage(t.generator.genericError);
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

  return (
    <section id="generator" className="w-full py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* If an active subscription exists, show the result card */}
        {activeSubscription ? (
          <div className="animate-scale-in">
            <ResultCard
              subscription={activeSubscription}
              isRestored={isRestored}
              onReset={handleReset}
            />
          </div>
        ) : (
          /* Generator Form Card */
          <div className="w-full max-w-2xl mx-auto rounded-[14px] bg-[#121212] border border-[#222222] p-6 sm:p-8 shadow-card transition-all duration-300 hover:border-[#2C2C2C] animate-fade-slide-up">
            {/* Header */}
            <div className="text-center mb-8">
              <span className="inline-block text-[11px] font-semibold text-[#FFD60A] bg-[#FFD60A]/10 px-3 py-1 rounded-full border border-[#FFD60A]/20 mb-2 transition-transform duration-200 hover:scale-105">
                {t.generator.badge}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#E8E8E8] tracking-tight">
                {t.generator.title}
              </h2>
              <p className="text-sm text-[#8A8A8A] mt-2 max-w-md mx-auto">
                {t.generator.subtitle}
              </p>
            </div>

            {/* Error Banner with smooth slide */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-[12px] bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-3 animate-fade-in shadow-sm">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* 1. Protocol Selection: 4 Cards with Fluid Animations */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3">
                {t.generator.protocolLabel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {protocolsConfig.map((proto) => {
                  const isSelected = selectedProtocol === proto.id;
                  return (
                    <button
                      key={proto.id}
                      type="button"
                      onClick={() => setSelectedProtocol(proto.id)}
                      className={`text-start p-4 rounded-[14px] border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'bg-[#181818] border-[#FFD60A] shadow-glow-sm ring-1 ring-[#FFD60A]/30 -translate-y-0.5'
                          : 'bg-[#0E0E0E] border-[#222222] hover:border-[#333333] hover:bg-[#141414] hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span className={`font-bold text-sm transition-colors ${isSelected ? 'text-[#FFD60A]' : 'text-[#E8E8E8]'}`}>
                          {proto.title}
                        </span>
                        <div className={`p-1.5 rounded-[8px] transition-transform duration-200 ${isSelected ? 'bg-[#FFD60A]/20 scale-110' : 'bg-[#1E1E1E]'}`}>
                          {proto.icon}
                        </div>
                      </div>
                      <p className="text-xs text-[#8A8A8A] leading-relaxed line-clamp-2">
                        {proto.desc}
                      </p>
                      {isSelected && (
                        <div className="absolute bottom-1.5 end-2">
                          <Check className="w-3.5 h-3.5 text-[#FFD60A]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Duration Selection: Chips with Spring Transition */}
            <div className="mb-7">
              <label className="block text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3">
                {t.generator.durationLabel}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {durationsConfig.map((dur) => {
                  const isSelected = selectedDuration === dur.id;
                  return (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setSelectedDuration(dur.id)}
                      className={`py-3 px-3 rounded-[12px] border text-xs sm:text-sm font-semibold transition-all duration-200 text-center cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#FFD60A]/15 border-[#FFD60A] text-[#FFD60A] shadow-glow-sm scale-[1.02]'
                          : 'bg-[#0E0E0E] border-[#222222] text-[#8A8A8A] hover:text-[#E8E8E8] hover:border-[#333333] hover:-translate-y-0.5'
                      }`}
                    >
                      {dur.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cloudflare Turnstile */}
            <div className="mb-6 flex flex-col items-center">
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken('')}
              />
            </div>

            {/* Create Account Button with Sheen Sweep */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="btn-shimmer w-full py-4 px-6 rounded-[14px] bg-[#FFD60A] text-[#0A0A0A] font-bold text-sm sm:text-base hover:bg-[#FFE033] transition-all duration-300 glow-on-hover shadow-glow hover:shadow-glow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#0A0A0A]" />
                  <span>{t.generator.generatingBtn}</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-200" />
                  <span>{t.generator.generateBtn}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
