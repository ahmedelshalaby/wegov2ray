import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ChevronDown, ChevronUp, Clock, HardDrive, ExternalLink, RefreshCw, Smartphone } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { StoredSubscription } from '../utils/storage';
import { getAppDeepLinks } from '../utils/deeplinks';

interface ResultCardProps {
  subscription: StoredSubscription;
  isRestored?: boolean;
  onReset: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  subscription,
  isRestored = false,
  onReset,
}) => {
  const { t } = useLanguage();
  const [copiedSub, setCopiedSub] = useState(false);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
  const [showIndividualLinks, setShowIndividualLinks] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Remaining time countdown calculation
  useEffect(() => {
    const updateCountdown = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const diffSec = subscription.expiresAt - nowSec;

      if (diffSec <= 0) {
        setIsExpired(true);
        setTimeLeftStr('00:00:00 (منتهي / Expired)');
        return;
      }

      setIsExpired(false);
      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');

      if (days > 0) {
        setTimeLeftStr(`${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      } else {
        setTimeLeftStr(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [subscription.expiresAt]);

  const copyToClipboard = async (text: string, isMainSub = true, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isMainSub) {
        setCopiedSub(true);
        setTimeout(() => setCopiedSub(false), 2200);
      } else if (typeof index === 'number') {
        setCopiedLinkIndex(index);
        setTimeout(() => setCopiedLinkIndex(null), 2000);
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const deepLinks = getAppDeepLinks(subscription.subUrl);

  return (
    <div className="w-full max-w-2xl mx-auto rounded-[14px] bg-[#121212] border border-[#262626] p-5 sm:p-7 shadow-card relative overflow-hidden transition-all duration-300 animate-scale-in">
      {/* Top soft glowing accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFD60A] to-transparent opacity-85" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1F1F1F]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-[#E8E8E8]">
              {isRestored ? t.result.titleRestored : t.result.titleSuccess}
            </h3>
            {isRestored && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FFD60A]/10 text-[#FFD60A] border border-[#FFD60A]/30 animate-pulse-subtle">
                {t.result.restoredBadge}
              </span>
            )}
          </div>
          <p className="text-xs text-[#8A8A8A] mt-1">
            {subscription.protocol.toUpperCase()} • {t.result.quotaVal}
          </p>
        </div>

        {/* Action button to create another account */}
        <button
          onClick={onReset}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8A8A8A] hover:text-[#FFD60A] bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] hover:border-[#383838] rounded-[10px] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer group"
        >
          <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
          <span>{t.result.generateNew}</span>
        </button>
      </div>

      {/* Subscription URL Field */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-[#8A8A8A] mb-2">
          {t.result.subUrlLabel}
        </label>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="flex-1 px-3.5 py-2.5 rounded-[12px] bg-[#0A0A0A] border border-[#222222] hover:border-[#333333] transition-colors text-xs font-mono text-[#E8E8E8] break-all select-all flex items-center overflow-x-auto">
            {subscription.subUrl}
          </div>
          <button
            onClick={() => copyToClipboard(subscription.subUrl, true)}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 active:scale-95 ${
              copiedSub
                ? 'bg-[#34A853] text-white shadow-sm'
                : 'bg-[#FFD60A] text-[#0A0A0A] hover:bg-[#FFE033] glow-on-hover shadow-glow-sm hover:shadow-glow'
            }`}
          >
            {copiedSub ? <Check className="w-4 h-4 scale-110" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSub ? t.result.copiedBtn : t.result.copyBtn}</span>
          </button>
        </div>
      </div>

      {/* QR Code & Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 p-4 rounded-[12px] bg-[#0A0A0A]/70 border border-[#1E1E1E]">
        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center text-center p-2">
          <div className="p-3 bg-white rounded-[12px] shadow-sm mb-2.5 transition-transform duration-300 hover:scale-105 cursor-pointer">
            <QRCodeSVG
              value={subscription.subUrl}
              size={140}
              level="M"
              includeMargin={false}
            />
          </div>
          <span className="text-xs text-[#8A8A8A]">{t.result.qrTitle}</span>
        </div>

        {/* Quota & Countdown Stats */}
        <div className="flex flex-col justify-center gap-4">
          {/* Time Remaining */}
          <div className="flex items-start gap-3 p-2.5 rounded-[10px] bg-[#121212] border border-[#1E1E1E] transition-all hover:border-[#2A2A2A]">
            <div className="w-8 h-8 rounded-[10px] bg-[#FFD60A]/10 text-[#FFD60A] flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4 animate-pulse-subtle" />
            </div>
            <div>
              <span className="block text-xs text-[#8A8A8A]">{t.result.remainingLabel}</span>
              <span
                className={`text-sm sm:text-base font-bold font-mono tracking-tight transition-colors ${
                  isExpired ? 'text-red-400' : 'text-[#FFD60A]'
                }`}
              >
                {timeLeftStr}
              </span>
            </div>
          </div>

          {/* Data Quota */}
          <div className="flex items-start gap-3 p-2.5 rounded-[10px] bg-[#121212] border border-[#1E1E1E] transition-all hover:border-[#2A2A2A]">
            <div className="w-8 h-8 rounded-[10px] bg-[#222222] text-[#E8E8E8] flex items-center justify-center shrink-0 mt-0.5">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs text-[#8A8A8A]">{t.result.quotaLabel}</span>
              <span className="text-sm sm:text-base font-semibold text-[#E8E8E8]">
                {t.result.quotaVal}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Import Deep Links with interactive cards */}
      <div className="mb-5">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#E8E8E8] mb-3">
          <Smartphone className="w-4 h-4 text-[#FFD60A]" />
          <span>{t.result.deepLinksTitle}</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {deepLinks.map((app) => (
            <a
              key={app.name}
              href={app.scheme}
              className="flex flex-col items-center justify-center p-3 rounded-[12px] bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#FFD60A]/50 transition-all duration-200 hover:-translate-y-1 hover:shadow-glow-sm active:scale-95 text-center group cursor-pointer"
            >
              <div className="flex items-center gap-1 text-xs font-bold text-[#E8E8E8] group-hover:text-[#FFD60A] transition-colors">
                <span>{app.name}</span>
                <ExternalLink className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <span className="text-[10px] text-[#8A8A8A] mt-0.5">{app.badge}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Individual Config Links (Smooth Collapsible) */}
      {subscription.links && subscription.links.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#1F1F1F]">
          <button
            onClick={() => setShowIndividualLinks(!showIndividualLinks)}
            className="w-full flex items-center justify-between text-xs text-[#8A8A8A] hover:text-[#E8E8E8] py-1 cursor-pointer transition-colors"
          >
            <span>
              {showIndividualLinks ? t.result.hideConfigs : t.result.showConfigs} ({subscription.links.length})
            </span>
            <span className={`transition-transform duration-250 ${showIndividualLinks ? 'rotate-180 text-[#FFD60A]' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </span>
          </button>

          {showIndividualLinks && (
            <div className="mt-3 space-y-2.5 animate-fade-in">
              {subscription.links.map((link, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-[10px] bg-[#0A0A0A] border border-[#222222] hover:border-[#303030] transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-mono text-[#8A8A8A] truncate select-all">{link}</span>
                  <button
                    onClick={() => copyToClipboard(link, false, idx)}
                    className="shrink-0 p-1.5 rounded-[8px] bg-[#1A1A1A] hover:bg-[#252525] text-[#E8E8E8] hover:text-[#FFD60A] border border-[#2A2A2A] transition-all duration-150 active:scale-90 cursor-pointer"
                    title={t.result.configCopy}
                  >
                    {copiedLinkIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-green-400 scale-110" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
