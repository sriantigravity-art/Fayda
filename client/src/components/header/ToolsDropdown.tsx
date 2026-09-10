import React, { useState, useRef, useEffect } from 'react';
import { 
  Wrench, 
  BarChart2, 
  Calculator, 
  Search, 
  ShieldAlert, 
  ChevronDown, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ToolsDropdownProps {
  onOpenJournal: () => void;
  onOpenRiskCalc: () => void;
  onOpenCommandPalette: () => void;
  onOpenLegal: () => void;
}

export const ToolsDropdown: React.FC<ToolsDropdownProps> = ({
  onOpenJournal,
  onOpenRiskCalc,
  onOpenCommandPalette,
  onOpenLegal
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 shadow-sm ${
          isOpen
            ? isDark
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40'
              : 'bg-blue-50 text-blue-700 border-blue-300'
            : isDark
            ? 'bg-terminal-panel hover:bg-slate-800 border-terminal-border text-terminal-muted hover:text-terminal-text'
            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
        }`}
        title="Trading Tools (Journal, Risk Calculator, Command Palette, Legal)"
      >
        <Wrench className="w-3.5 h-3.5 text-accent-sky" />
        <span className="hidden sm:inline">Tools</span>
        <ChevronDown className={`w-3 h-3 text-terminal-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl shadow-2xl p-2.5 z-[9999] animate-in fade-in slide-in-from-top-2 duration-150 border backdrop-blur-xl ${
          isDark
            ? 'bg-[#0c1220]/95 border-slate-800 text-slate-100 shadow-black/80'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/40'
        }`}>
          {/* Header */}
          <div className="px-3 py-1.5 border-b border-terminal-border/60 flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-terminal-muted">
              Trading & Risk Tools
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-terminal-panel text-terminal-muted border border-terminal-border">
              4 Utilities
            </span>
          </div>

          <div className="space-y-1">
            {/* 1. Trade Journal */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenJournal();
              }}
              className={`w-full p-2 rounded-xl text-left transition flex items-start gap-2.5 cursor-pointer ${
                isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
              }`}
            >
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0 mt-0.5">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Trade Journal & Audit</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                    Live
                  </span>
                </div>
                <div className="text-[11px] text-terminal-muted truncate mt-0.5">
                  Date-wise predictions, target hits & nearness audit
                </div>
              </div>
            </button>

            {/* 2. Risk Calculator */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenRiskCalc();
              }}
              className={`w-full p-2 rounded-xl text-left transition flex items-start gap-2.5 cursor-pointer ${
                isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
              }`}
            >
              <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0 mt-0.5">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>SEBI Risk & Position Sizing</span>
                </div>
                <div className="text-[11px] text-terminal-muted truncate mt-0.5">
                  Optimal lot sizing, stop loss & capital protection
                </div>
              </div>
            </button>

            {/* 3. Command Palette */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCommandPalette();
              }}
              className={`w-full p-2 rounded-xl text-left transition flex items-start gap-2.5 cursor-pointer ${
                isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
              }`}
            >
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5">
                <Search className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Command Palette</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-terminal-panel text-[10px] font-mono border border-terminal-border text-terminal-muted">
                    ⌘K / Ctrl+K
                  </kbd>
                </div>
                <div className="text-[11px] text-terminal-muted truncate mt-0.5">
                  Instant search, symbol switch & quick terminal jumps
                </div>
              </div>
            </button>

            {/* 4. SEBI Compliance & Legal */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenLegal();
              }}
              className={`w-full p-2 rounded-xl text-left transition flex items-start gap-2.5 cursor-pointer ${
                isDark ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
              }`}
            >
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>SEBI Compliance & Disclaimers</span>
                </div>
                <div className="text-[11px] text-terminal-muted truncate mt-0.5">
                  Mandatory risk disclosure & statutory policies
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
