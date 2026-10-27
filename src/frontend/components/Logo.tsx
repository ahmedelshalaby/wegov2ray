import React from 'react';

interface LogoProps {
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ onClick }) => (
  <a href="/" className="brand" aria-label="wegov2ray" onClick={onClick}>
    <span className="brand-word" dir="ltr">
      wegov2ray
    </span>
    <span className="brand-dot" aria-hidden="true" />
  </a>
);
