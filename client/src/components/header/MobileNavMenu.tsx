import React, { useEffect } from 'react';
import {
  X,
  Sparkles,
  Layers,
  FileText,
  Calculator,
  Sliders,
  Calendar,
  Zap,
  Search,
  Crown,
  Settings,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  ShieldCheck,
  User,
  ChevronRight,
  BarChart2,
  Activity,
  CheckCircle2
} from 'lucide-react';
import type { TerminalMode } from '../../context/TerminalModeContext';
import type { TerminalDensity } from '../../context/DensityContext';

interface MobileNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExplore: () => void;
  onOpenPersona: () => void;
  onOpenWatchlist: () => void;
  onOpenJournal: () => void;
  onOpenRiskCalc: () => void;
  onOpenPayoff: () => void;
  onOpenCommandPalette: () => void;
  onOpenSubscription: (plan?: 'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND') => void;
  onOpenBroker: () => void;
  onOpenHolidays: () => void;
  onOpenSound: () => void;
  onOpenProfile: (tab?: 'PROFILE' | 'PASSWORD' | 'MEMBERSHIP') => void;
  onOpenAdmin?: () => void;
  mode: TerminalMode;
  setMode: (m: TerminalMode) => void;
  density: TerminalDensity;
  setDensity: (d: TerminalDensity) => void;
  isMuted: boolean;
  toggleMute: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isSuperAdmin: boolean;
  activeWatchlistCount: number;
  currentPersonaTitle: string;
  currentPersonaIcon: string;
  isBrokerConnected: boolean;
  brokerName: string;
  isLiveMarketOpen: boolean;
  userEmail?: string;
  userTier?: string;
}

export const MobileNavMenu: React.FC<MobileNavMenuProps> = ({
  isOpen,
  onClose,
  onOpenExplore,
  onOpenPersona,
  onOpenWatchlist,
  onOpenJournal,
  onOpenRiskCalc,
  onOpenPayoff,
  onOpenCommandPalette,
  onOpenSubscription,
  onOpenBroker,
  onOpenHolidays,
  onOpenSound,
  onOpenProfile,
  onOpenAdmin,
  mode,
  setMode,
  density,
  setDensity,
  isMuted,
  toggleMute,
  theme,
  toggleTheme,
  isFullscreen,
  toggleFullscreen,
  isSuperAdmin,
  activeWatchlistCount,
  currentPersonaTitle,
  currentPersonaIcon,
  isBrokerConnected,
  brokerName,
  isLiveMarketOpen,
  userEmail,
  userTier = 'PRO'
}) => {
  // Prevent background scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col md:hidden animate-in fade-in duration-200 select-none">
      {/* Dimmed Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Down / Slide-In Mobile Navigation Panel */}
      <div className="relative z-10 flex flex-col w-full max-h-[92vh] mt-auto sm:mt-0 bg-terminal-card border-t sm:border-b border-terminal-border rounded-t-3xl sm:rounded-none sm:rounded-b-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Top Drag Handle & Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-terminal-border/80 bg-terminal-panel/90">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-accent-sky/15 flex items-center justify-center border border-accent-sky/30 shadow-subtle shrink-0">
              <img src="/favicon-32x32.png" className="w-4 h-4 object-contain" alt="Fayda" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs tracking-tight text-terminal-text">FAYDA MOBILE OS</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase bg-accent-sky/20 text-accent-sky border border-accent-sky/40">
                  {userTier}
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted font-mono">Quick Tools, Radars & Settings</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
            aria-label="Close Mobile Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 no-scrollbar">

          {/* 1. QUICK SEARCH / COMMAND PALETTE */}
          <button
            type="button"
            onClick={() => handleAction(onOpenCommandPalette)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text text-xs font-mono transition cursor-pointer shadow-xs"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-accent-sky" />
              <span className="text-terminal-text font-bold">Search tools, indices & commands...</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-card border border-terminal-border text-terminal-muted">⌘K</span>
          </button>

          {/* 2. PRIMARY TRADING TOOLS & RADARS */}
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-terminal-muted">
                Trading Radars & Analytics
              </span>
              <span className="text-[9px] font-mono text-accent-sky">24+ Tools</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Explore Mega Menu */}
              <button
                type="button"
                onClick={() => handleAction(onOpenExplore)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-accent-sky/10 hover:bg-accent-sky/20 border border-accent-sky/30 text-left transition cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-accent-sky/20 text-accent-sky shrink-0">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-terminal-text">Explore Radar</div>
                  <div className="text-[9px] text-terminal-muted font-mono truncate">All 24+ Facilities</div>
                </div>
              </button>

              {/* Persona Focus */}
              <button
                type="button"
                onClick={() => handleAction(onOpenPersona)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 hover:from-sky-500/20 hover:to-indigo-500/20 border border-sky-500/30 text-left transition cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 text-sm shrink-0">
                  {currentPersonaIcon || '⚡'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-terminal-text truncate">{currentPersonaTitle || 'Persona Focus'}</div>
                  <div className="text-[9px] text-sky-400 font-mono truncate">Change Focus</div>
                </div>
              </button>

              {/* Multi-Asset Watchlist */}
              <button
                type="button"
                onClick={() => handleAction(onOpenWatchlist)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-terminal-text">Watchlist</span>
                    <span className="text-[9px] px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-500 font-black">
                      {activeWatchlistCount}
                    </span>
                  </div>
                  <div className="text-[9px] text-terminal-muted font-mono truncate">Multi-Asset Desk</div>
                </div>
              </button>

              {/* Post-Market Trade Journal */}
              <button
                type="button"
                onClick={() => handleAction(onOpenJournal)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-terminal-text">Trade Journal</div>
                  <div className="text-[9px] text-terminal-muted font-mono truncate">Post-Market Audit</div>
                </div>
              </button>

              {/* Risk & Position Size Calculator */}
              <button
                type="button"
                onClick={() => handleAction(onOpenRiskCalc)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-left transition cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-terminal-card text-accent-sky shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-terminal-text">Risk Calculator</div>
                  <div className="text-[9px] text-terminal-muted font-mono truncate">Position Sizing</div>
                </div>
              </button>

              {/* Trade Payoff Simulator */}
              <button
                type="button"
                onClick={() => handleAction(onOpenPayoff)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-left transition cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-terminal-card text-emerald-400 shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-terminal-text">Payoff Simulator</div>
                  <div className="text-[9px] text-terminal-muted font-mono truncate">Options P&L Curve</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. CALENDAR, HOLIDAYS & BROKER STATUS */}
          <div>
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-terminal-muted">
                Market Calendar & Execution
              </span>
            </div>

            <div className="space-y-1.5">
              {/* F&O Expiry & Market Holiday Calendar */}
              <button
                type="button"
                onClick={() => handleAction(onOpenHolidays)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel hover:bg-terminal-hover border border-terminal-border transition cursor-pointer text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-terminal-text">F&O Expiry & Holiday Calendar</div>
                    <div className="text-[9px] text-terminal-muted font-mono">NSE • BSE • MCX Official 2026 Schedule</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-terminal-muted" />
              </button>

              {/* Connect Broker / Active Execution Feed */}
              <button
                type="button"
                onClick={() => handleAction(onOpenBroker)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel hover:bg-terminal-hover border border-terminal-border transition cursor-pointer text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    isBrokerConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-terminal-card text-accent-cyan'
                  }`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-terminal-text">Broker Connection</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                        isBrokerConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {brokerName || 'Paper'}
                      </span>
                    </div>
                    <div className="text-[9px] text-terminal-muted font-mono">Fyers v3 • DhanHQ • Simulator</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-terminal-muted" />
              </button>
            </div>
          </div>

          {/* 4. WORKSPACE MODES & DENSITY */}
          <div className="p-3 rounded-2xl bg-terminal-panel/80 border border-terminal-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-terminal-muted">Terminal Mode</span>
              <span className="text-[10px] font-mono font-bold text-accent-sky">{mode}</span>
            </div>
            
            <div className="grid grid-cols-4 gap-1.5">
              {(['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'PRO'] as TerminalMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold text-center transition cursor-pointer border ${
                    mode === m
                      ? 'bg-accent-sky/20 border-accent-sky text-accent-sky shadow-xs'
                      : 'bg-terminal-card border-terminal-border/60 text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {m === 'INTERMEDIATE' ? 'INTER' : m}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-terminal-border/50">
              <span className="text-[10px] font-mono font-bold uppercase text-terminal-muted">Density</span>
              <div className="flex items-center gap-1">
                {(['COMFORTABLE', 'COMPACT', 'DENSE'] as TerminalDensity[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    className={`py-1 px-2 rounded text-[9px] font-mono font-bold transition cursor-pointer border ${
                      density === d
                        ? 'bg-accent-sky/20 border-accent-sky text-accent-sky'
                        : 'bg-terminal-card border-terminal-border/50 text-terminal-muted'
                    }`}
                  >
                    {d[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. QUICK TOGGLES (THEME, SOUND, FULLSCREEN) */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-terminal-panel hover:bg-terminal-hover border border-terminal-border transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber mb-1" /> : <Moon className="w-4 h-4 text-accent-sky mb-1" />}
              <span className="text-[10px] font-bold text-terminal-text">{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(onOpenSound)}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-terminal-panel hover:bg-terminal-hover border border-terminal-border transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-bear mb-1" /> : <Volume2 className="w-4 h-4 text-bull mb-1" />}
              <span className="text-[10px] font-bold text-terminal-text">{isMuted ? 'Muted' : 'Audio ON'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-terminal-panel hover:bg-terminal-hover border border-terminal-border transition cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-accent-sky mb-1" /> : <Maximize2 className="w-4 h-4 text-terminal-muted mb-1" />}
              <span className="text-[10px] font-bold text-terminal-text">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
            </button>
          </div>

          {/* 6. MEMBERSHIP & ACCOUNT */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/15 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
                <Crown className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-500">Upgrade Membership</div>
                <div className="text-[9px] text-terminal-muted font-mono">Unlock Institutional Greeks & Alerts</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleAction(() => onOpenSubscription('GOLD'))}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md"
            >
              Plans
            </button>
          </div>

          {/* 7. PROFILE & SUPER ADMIN */}
          <div className="pt-2 border-t border-terminal-border/60 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => handleAction(() => onOpenProfile('PROFILE'))}
              className="flex items-center space-x-1.5 text-terminal-muted hover:text-terminal-text py-1 transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>My Account</span>
            </button>

            {isSuperAdmin && onOpenAdmin && (
              <button
                type="button"
                onClick={() => handleAction(onOpenAdmin)}
                className="flex items-center space-x-1.5 text-accent-cyan font-bold py-1 transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </button>
            )}
          </div>

        </div>

        {/* Safe-Area Bottom Inset Padding for iOS */}
        <div className="h-4 sm:h-2 bg-terminal-panel" />
      </div>
    </div>
  );
};
