import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  CheckCircle2, 
  Activity, 
  Volume2, 
  VolumeX, 
  Zap, 
  Sliders,
  Check
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { TerminalMode } from '../../context/TerminalModeContext';
import type { TerminalDensity } from '../../context/DensityContext';

interface WorkspaceSettingsDropdownProps {
  mode: TerminalMode;
  setMode: (mode: TerminalMode) => void;
  density: TerminalDensity;
  setDensity: (density: TerminalDensity) => void;
  isMuted: boolean;
  toggleMute: () => void;
  isSuperAdmin: boolean;
  onOpenAdminDrawer?: () => void;
}

export const WorkspaceSettingsDropdown: React.FC<WorkspaceSettingsDropdownProps> = ({
  mode,
  setMode,
  density,
  setDensity,
  isMuted,
  toggleMute,
  isSuperAdmin,
  onOpenAdminDrawer
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

  // Mode badge styling helper
  const getModeStyles = () => {
    switch (mode) {
      case 'BEGINNER':
        return {
          label: 'Beginner',
          dot: 'bg-bull',
          badge: 'bg-bull/15 text-bull border-bull/40 shadow-[0_0_10px_rgba(0,245,155,0.15)]'
        };
      case 'INTERMEDIATE':
        return {
          label: 'Interm.',
          dot: 'bg-amber',
          badge: 'bg-amber/15 text-amber border-amber/40 shadow-[0_0_10px_rgba(255,180,0,0.15)]'
        };
      case 'EXPERT':
        return {
          label: 'Expert',
          dot: 'bg-accent-purple',
          badge: 'bg-accent-purple/15 text-accent-purple border-accent-purple/40 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
        };
    }
  };

  const modeStyle = getModeStyles();

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button: Displays Current Experience Mode */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border shrink-0 shadow-sm ${modeStyle.badge}`}
        title={`Experience Mode: ${mode} • Click to adjust mode, density & audio`}
      >
        <span className={`w-2 h-2 rounded-full ${modeStyle.dot}`} />
        <span>{modeStyle.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Flyout Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl shadow-2xl p-3 z-[9999] animate-in fade-in slide-in-from-top-2 duration-150 border backdrop-blur-xl ${
          isDark
            ? 'bg-[#0c1220]/95 border-slate-800 text-slate-100 shadow-black/80'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/40'
        }`}>
          
          {/* Section 1: Trader Experience Mode */}
          <div className="pb-2.5 border-b border-terminal-border/60">
            <div className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-terminal-muted mb-1.5 flex items-center justify-between">
              <span>Experience Mode</span>
              <span className="text-[9px] text-terminal-muted">3 Levels</span>
            </div>

            <div className="space-y-1">
              {/* Beginner */}
              <button
                type="button"
                onClick={() => {
                  setMode('BEGINNER');
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-sans transition flex items-center justify-between cursor-pointer ${
                  mode === 'BEGINNER'
                    ? 'bg-bull/15 text-bull font-bold border border-bull/30'
                    : isDark
                    ? 'hover:bg-slate-800/80 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-bull shrink-0" />
                  <div>
                    <span className="font-bold block text-left">🟢 Beginner</span>
                    <span className="text-[10px] text-terminal-muted block text-left">Simplified signals & clarity</span>
                  </div>
                </div>
                {mode === 'BEGINNER' && <Check className="w-3.5 h-3.5 text-bull shrink-0" />}
              </button>

              {/* Intermediate */}
              <button
                type="button"
                onClick={() => {
                  setMode('INTERMEDIATE');
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-sans transition flex items-center justify-between cursor-pointer ${
                  mode === 'INTERMEDIATE'
                    ? 'bg-amber/15 text-amber font-bold border border-amber/30'
                    : isDark
                    ? 'hover:bg-slate-800/80 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber shrink-0" />
                  <div>
                    <span className="font-bold block text-left">🟡 Intermediate</span>
                    <span className="text-[10px] text-terminal-muted block text-left">Multi-strike shifts & momentum</span>
                  </div>
                </div>
                {mode === 'INTERMEDIATE' && <Check className="w-3.5 h-3.5 text-amber shrink-0" />}
              </button>

              {/* Expert */}
              <button
                type="button"
                onClick={() => {
                  setMode('EXPERT');
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-sans transition flex items-center justify-between cursor-pointer ${
                  mode === 'EXPERT'
                    ? 'bg-accent-purple/15 text-accent-purple font-bold border border-accent-purple/30'
                    : isDark
                    ? 'hover:bg-slate-800/80 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-purple shrink-0" />
                  <div>
                    <span className="font-bold block text-left">🟣 Expert</span>
                    <span className="text-[10px] text-terminal-muted block text-left">Gamma, Greeks & orderflow</span>
                  </div>
                </div>
                {mode === 'EXPERT' && <Check className="w-3.5 h-3.5 text-accent-purple shrink-0" />}
              </button>
            </div>
          </div>

          {/* Section 2: Display Density & Sound Chimes */}
          <div className="pt-2.5 space-y-2">
            <div className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-terminal-muted">
              Display & Audio Preferences
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Density Toggle */}
              <button
                type="button"
                onClick={() => setDensity(density === 'COMPACT' ? 'STANDARD' : 'COMPACT')}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-850' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-accent-sky shrink-0" />
                <div className="text-left">
                  <div className="text-[11px] font-bold">Density</div>
                  <div className="text-[10px] text-terminal-muted font-mono">{density}</div>
                </div>
              </button>

              {/* Sound Audio Alerts Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  isMuted
                    ? isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-bull/15 border-bull/30 text-bull font-bold'
                }`}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 shrink-0" /> : <Volume2 className="w-3.5 h-3.5 shrink-0" />}
                <div className="text-left">
                  <div className="text-[11px] font-bold">Audio</div>
                  <div className="text-[10px] font-mono">{isMuted ? 'Muted' : 'Live Chime'}</div>
                </div>
              </button>
            </div>

            {/* SuperAdmin Live Matrix Button (if superadmin) */}
            {isSuperAdmin && onOpenAdminDrawer && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAdminDrawer();
                }}
                className="w-full mt-1.5 py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 font-bold text-xs transition flex items-center justify-between cursor-pointer shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open SuperAdmin Live Matrix</span>
                </span>
                <span className="text-[10px] font-mono bg-purple-500/30 px-1.5 py-0.2 rounded text-white">
                  Admin
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
