import React from 'react';

interface FaydaBrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showProBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

export const FaydaBrandLogo: React.FC<FaydaBrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  showProBadge = true,
  className = '',
  onClick
}) => {
  const iconSizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8 sm:w-9 sm:h-9',
    lg: 'w-10 h-10 sm:w-11 sm:h-11',
    xl: 'w-12 h-12 sm:w-14 sm:h-14'
  }[size];

  const titleSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-xl'
  }[size];

  const subSizeClasses = {
    sm: 'text-[8px]',
    md: 'text-[9px] sm:text-[10px]',
    lg: 'text-[10px] sm:text-[11px]',
    xl: 'text-[11px] sm:text-xs'
  }[size];

  return (
    <div 
      className={`inline-flex items-center gap-2 sm:gap-2.5 select-none transition group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Official Fayda Logo Emblem */}
      <div className={`relative ${iconSizeClasses} rounded-xl bg-gradient-to-br from-indigo-500/20 via-sky-500/15 to-purple-500/20 p-1 flex items-center justify-center border border-accent-sky/30 shadow-sm group-hover:border-accent-sky transition-colors shrink-0 overflow-hidden`}>
        <img
          src="/fayda-logo.png"
          alt="Fayda Logo"
          className="w-full h-full object-contain filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // Graceful fallback to favicon.svg if png is not rendered
            (e.currentTarget as HTMLImageElement).src = '/favicon.svg';
          }}
        />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col leading-none text-left">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight ${titleSizeClasses} text-slate-900 dark:text-white group-hover:text-accent-sky transition-colors`}>
            FAYDA
          </span>
          {showProBadge && (
            <span className="px-1.5 py-0.2 rounded-md text-[9px] font-mono font-black uppercase bg-gradient-to-r from-accent-sky/20 to-blue-500/20 text-accent-sky border border-accent-sky/40">
              PRO
            </span>
          )}
        </div>
        {showSubtitle && (
          <span className={`font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 ${subSizeClasses} mt-0.5`}>
            QUANTUM MARKET OS
          </span>
        )}
      </div>
    </div>
  );
};
