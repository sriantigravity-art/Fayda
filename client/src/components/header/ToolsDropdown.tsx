import React, { useState, useRef, useEffect } from 'react';
import { 
  Wrench, 
  BarChart2, 
  Calculator, 
  Search, 
  ShieldAlert, 
  ChevronDown, 
  ChevronRight,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Sliders
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useMarket } from '../../context/MarketContext';
import { SoundSettingsModal } from '../SoundSettingsModal';

interface ToolsDropdownProps {
  onOpenJournal: () => void;
  onOpenRiskCalc: () => void;
  onOpenCommandPalette: () => void;
  onOpenLegal: () => void;
  onOpenSoundSettings?: () => void;
}

export const ToolsDropdown: React.FC<ToolsDropdownProps> = ({
  onOpenJournal,
  onOpenRiskCalc,
  onOpenCommandPalette,
  onOpenLegal,
  onOpenSoundSettings
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isMuted, toggleMute, soundVolume, testSound } = useMarket();
  const [isOpen, setIsOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
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
        <div className={`absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm rounded-2xl shadow-2xl p-2.5 z-[9999] animate-in fade-in slide-in-from-top-2 duration-150 border backdrop-blur-xl ${
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
              5 Utilities
            </span>
          </div>

          <div className="space-y-1.5">
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

            {/* 3. Sound & Audio Alerts Setting */}
            <div className={`p-2.5 rounded-xl border transition space-y-2 ${
              isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div 
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenSoundSettings) onOpenSoundSettings();
                  else setIsSoundModalOpen(true);
                }}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <div className={`p-2 rounded-xl border shrink-0 ${
                  isMuted 
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span className="text-terminal-text">Sound Alerts & Volume</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      isMuted 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}>
                      {isMuted ? 'MUTED' : `${Math.round(soundVolume * 100)}% VOL`}
                    </span>
                  </div>
                  <div className="text-[11px] text-terminal-muted truncate mt-0.5">
                    Real-time target hit chimes & surge alerts
                  </div>
                </div>
              </div>

              {/* Quick inline controls: Mute/Unmute, Test Chime, Open Studio */}
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-terminal-border/60">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isMuted
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                  }`}
                  title={isMuted ? 'Click to Unmute Sound' : 'Click to Mute Sound'}
                >
                  {isMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => testSound('chime')}
                  disabled={isMuted}
                  className="py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold border border-terminal-border bg-terminal-card hover:bg-terminal-panel text-terminal-text transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Audition Chime Sound"
                >
                  <Play className="w-2.5 h-2.5 text-accent-sky" />
                  <span>Test</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenSoundSettings) onOpenSoundSettings();
                    else setIsSoundModalOpen(true);
                  }}
                  className="py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold border border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 transition flex items-center gap-1 cursor-pointer"
                  title="Configure Volume & Sound Triggers"
                >
                  <Sliders className="w-2.5 h-2.5" />
                  <span>Studio</span>
                </button>
              </div>
            </div>

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

      {/* Sound Settings Studio Modal */}
      <SoundSettingsModal 
        isOpen={isSoundModalOpen} 
        onClose={() => setIsSoundModalOpen(false)} 
      />
    </div>
  );
};
