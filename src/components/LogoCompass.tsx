import React from 'react';

interface LogoCompassProps {
  size?: number;
  className?: string;
  variant?: 'emerald' | 'indigo' | 'blue';
}

export const LogoCompass: React.FC<LogoCompassProps> = ({ 
  size = 32, 
  className = ''
}) => {
  const [hasError, setHasError] = React.useState(false);

  // Apply a 1.45x scaling multiplier so image logos match visual weight of SVG icons
  const displaySize = Math.max(Math.round(size * 1.45), 34);

  if (hasError) {
    // High quality fallback SVG Planet logo
    return (
      <svg 
        width={displaySize} 
        height={displaySize} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={`shrink-0 ${className}`}
      >
        <defs>
          <linearGradient id="fallback-planet-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="fallback-ring-grad" x1="2" y1="16" x2="30" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <path d="M 5 21 C 8 13, 22 10, 27 13" stroke="url(#fallback-ring-grad)" strokeWidth="2.5" opacity="0.5" />
        <circle cx="16" cy="16" r="9.5" fill="url(#fallback-planet-grad)" />
        <path d="M 4 19.5 C 7 24.5, 25 24.5, 28 17.5" stroke="url(#fallback-ring-grad)" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="25.5" cy="19.5" r="2" fill="white" />
      </svg>
    );
  }

  return (
    <img 
      src="/logo-planet.png" 
      alt="Gestão 360 Logo"
      onError={() => setHasError(true)}
      style={{ width: displaySize, height: displaySize }}
      className={`object-contain shrink-0 transition-transform duration-300 hover:scale-105 ${className}`}
    />
  );
};
