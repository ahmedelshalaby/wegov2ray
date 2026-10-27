import React from 'react';

interface AdSlotProps {
  id: 'ad-top-generator' | 'ad-after-result' | 'ad-sidebar';
  enabled?: boolean;
}

export const AdSlot: React.FC<AdSlotProps> = ({ id, enabled = false }) => {
  // If ads are not enabled, render nothing (no layout shift, zero footprint)
  if (!enabled) {
    return null;
  }

  // Define fixed heights and aspect sizes according to standard responsive IAB guidelines
  const configs = {
    'ad-top-generator': {
      classes: 'w-full max-w-3xl mx-auto h-[90px] mb-8',
      format: 'horizontal',
      label: 'Advertisement Banner (728x90 / Responsive)',
    },
    'ad-after-result': {
      classes: 'w-full max-w-2xl mx-auto h-[100px] mt-6',
      format: 'horizontal',
      label: 'Sponsored Content (Responsive)',
    },
    'ad-sidebar': {
      classes: 'hidden lg:block w-[300px] h-[600px] sticky top-24',
      format: 'vertical',
      label: 'Skyscraper Ad (300x600)',
    },
  };

  const config = configs[id] || configs['ad-top-generator'];

  return (
    <div
      id={id}
      className={`ad-slot-container rounded-[14px] border border-[#222222] bg-[#121212]/50 flex items-center justify-center overflow-hidden transition-all text-[#8A8A8A] text-xs ${config.classes}`}
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client="ca-pub-PLACEHOLDER"
        data-ad-slot={id}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <span className="sr-only">{config.label}</span>
    </div>
  );
};
