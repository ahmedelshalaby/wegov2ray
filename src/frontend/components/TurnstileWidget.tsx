import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: (errorCode: string) => void;
          theme?: 'dark' | 'light' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onVerify,
  onExpire,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    // If no sitekey provided or placeholder, simulate local pass
    if (!siteKey || siteKey.trim() === '' || siteKey === 'REPLACE_WITH_SITE_KEY') {
      setIsSimulated(true);
      onVerify('dummy-test-token-local-dev');
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;

    const initTurnstile = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            callback: (token: string) => {
              onVerify(token);
            },
            'expired-callback': () => {
              if (onExpire) onExpire();
            },
            'error-callback': (code) => {
              console.warn('Turnstile widget warning/error:', code);
            },
          });
          if (intervalId) clearInterval(intervalId);
        } catch (err) {
          console.warn('Failed to render Turnstile widget:', err);
        }
      }
    };

    if (window.turnstile) {
      initTurnstile();
    } else {
      intervalId = setInterval(() => {
        if (window.turnstile) {
          initTurnstile();
          clearInterval(intervalId);
        }
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {
          // ignore
        }
      }
    };
  }, [siteKey, onVerify, onExpire]);

  if (isSimulated) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-[14px] bg-[#121212] border border-[#222222] text-xs text-[#8A8A8A]">
        <ShieldCheck className="w-4 h-4 text-[#FFD60A]" />
        <span>Cloudflare Turnstile Verified</span>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-3 min-h-[65px]">
      <div ref={containerRef} />
    </div>
  );
};
