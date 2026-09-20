import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  FileText,
  Calculator,
  Sliders,
  Calendar,
  Zap,
  ChevronDown,
  X
} from 'lucide-react';

interface MobileToolsDropdownProps {
  onOpenExplore: () => void;
  onOpenPersona: () => void;
  onOpenWatchlist: () => void;
  onOpenJournal: () => void;
  onOpenRiskCalc: () => void;
  onOpenPayoff: () => void;
  onOpenHolidays: () => void;
  activeWatchlistCount: number;
  currentPersonaTitle?: string;
  currentPersonaIcon?: string;
}

export const MobileToolsDropdown: React.FC<MobileToolsDropdownProps> = ({
  onOpenExplore,
  onOpenPersona,
  onOpenWatchlist,
  onOpenJournal,
  onOpenRiskCalc,
  onOpenPayoff,
  onOpenHolidays,
  activeWatchlistCount,
  currentPersonaTitle = 'Focus',
  currentPersonaIcon = '⚡'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer border shadow-xs ${
          isOpen
            ? 'bg-accent-sky/20 border-accent-sky text-accent-sky shadow-[0_0_8px_rgba(0,229,255,0.3)]'
            : 'bg-terminal-panel hover:bg-terminal-hover border-terminal-border text-terminal-text hover:text-accent-sky'
        }`}
        title="Quick Trading Tools Menu"
      >
        <Zap className="w-3 h-3 text-accent-sky shrink-0" />
        <span>Tools</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent-sky' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed sm:absolute left-2 sm:left-auto sm:right-0 top-20 sm:top-full mt-1.5 w-[calc(100vw-16px)] sm:w-64 bg-terminal-card border border-terminal-border rounded-xl shadow-2xl z-[150] p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-2 py-1 border-b border-terminal-border/60">
            <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">Trading Tools</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded text-terminal-muted hover:text-terminal-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSelect(onOpenExplore)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-terminal-panel text-left text-xs font-semibold text-terminal-text transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-sky shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold">Explore Facilities</div>
              <div className="text-[9px] text-terminal-muted font-mono">All 24+ Radars & Tools</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(onOpenPersona)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-terminal-panel text-left text-xs font-semibold text-terminal-text transition cursor-pointer"
          >
            <span className="text-sm shrink-0">{currentPersonaIcon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{currentPersonaTitle}</div>
              <div className="text-[9px] text-terminal-muted font-mono">Switch Trading Focus</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(onOpenWatchlist)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-terminal-panel text-left text-xs font-semibold text-terminal-text transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <div>
                <div className="font-bold">Watchlist</div>
                <div className="text-[9px] text-terminal-muted font-mono">Multi-Asset Desk</div>
              </div>
            </div>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-500 font-black">
              {activeWatchlistCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(onOpenJournal)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-terminal-panel text-left text-xs font-semibold text-terminal-text transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold">Trade Journal</div>
              <div className="text-[9px] text-terminal-muted font-mono">Post-Market Audit</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(onOpenRiskCalc)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-terminal-panel text-left text-xs font-semibold text-terminal-text transition cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 text-accent-sky shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold">Risk Calculator</div>
              <div className="text-[9px] text-terminal-muted font-mono">Position Sizing</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(onOpenPayoff)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-terminal-panel text-left text-xs font-semibold text-terminal-text transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold">Payoff Simulator</div>
              <div className="text-[9px] text-terminal-muted font-mono">Options P&L Curve</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(onOpenHolidays)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-terminal-panel text-left text-xs font-semibold text-terminal-text transition cursor-pointer border-t border-terminal-border/50 pt-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold">F&O Expiry & Holidays</div>
              <div className="text-[9px] text-terminal-muted font-mono">2026 Schedule & SEBI Rules</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
