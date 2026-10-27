import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  className = '',
  compact = false,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  const copyLabel = label ?? t.result.copyBtn;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      className={`copy-button ${compact ? 'copy-button-compact' : ''} ${className}`.trim()}
      onClick={() => void handleCopy()}
      aria-label={copied ? t.result.copiedBtn : copyLabel}
      title={copyLabel}
      data-copied={copied ? 'true' : 'false'}
    >
      {copied ? (
        <Check size={15} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Copy size={15} strokeWidth={1.7} aria-hidden="true" />
      )}
      {!compact ? <span>{copied ? t.result.copiedBtn : copyLabel}</span> : null}
      <span className="sr-only" aria-live="polite">
        {copied ? t.result.copiedBtn : ''}
      </span>
    </button>
  );
};
