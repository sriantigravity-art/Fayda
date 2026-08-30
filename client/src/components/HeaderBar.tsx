import React, { useState, useEffect, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode, type TerminalMode } from '../context/TerminalModeContext';
import { useDensity, type TerminalDensity } from '../context/DensityContext';
import { useAuth } from '../context/AuthContext';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { 
  Volume2, 
  VolumeX, 
  Globe, 
  Calendar, 
  KeyRound, 
  Clock, 
  Radio, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Sun, 
  Moon, 
  X, 
  MoreHorizontal, 
  Sliders, 
  Maximize2, 
  Minimize2,
  Calculator,
  ShieldAlert,
  User,
  LogOut,
  Sparkles,
  Zap,
  Search,
  Command
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FyersModal } from './FyersModal';
import { StockSelectorDropdown } from './StockSelectorDropdown';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { AuthModal } from './auth/AuthModal';
import { SuperAdminControlDrawer } from './admin/SuperAdminControlDrawer';
import { CommandPaletteModal } from './CommandPaletteModal';

export const HeaderBar: React.FC = () => {
  const {
    indices,
    selectedIndex,
    setSelectedIndex,
    visibleIndices,
    toggleIndexVisibility,
    currentIndexState,
    isConnected,
    isMuted,
    toggleMute,
    testSound,
    setOptionExpiry,
    dataSource,
    setDataSource,
    fyersConfig
  } = useMarket();

  const { theme, toggleTheme } = useTheme();
  const { mode, setMode } = useTerminalMode();
  const { density, setDensity } = useDensity();
  const { user, isAuthenticated, isSuperAdmin, logout, panelVisibility } = useAuth();
  
  const [isFyersModalOpen, setIsFyersModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Global Ctrl + K / Cmd + K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('[Fullscreen Mode] Browser prevented fullscreen:', err);
    }
  };

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  // Live real-time clock with seconds
  const [currentTime, setCurrentTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  // Market Hours: NSE/BSE Equity (09:15 - 15:40 IST) vs MCX Commodities (09:00 - 23:30 IST)
  const isMarketHours = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;

    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
    const isCommodity = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';

    if (isCommodity) {
      return currentMin >= (9 * 60) && currentMin < (23 * 60 + 30);
    }

    return currentMin >= (9 * 60 + 15) && currentMin < (15 * 60 + 40);
  };

  const isLiveMarketOpen = isMarketHours();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-IN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const expiryDates = currentIndexState?.expiryDates || [];
  const selectedExpiry = currentIndexState?.selectedExpiry || 'Current Expiry';
  const daysToExpiry = currentIndexState?.daysToExpiry ?? 0;

  // Active Index Sentiment & Calculations
  const spotPrice = currentIndexState?.spotPrice ?? 0;
  const prevClose = currentIndexState?.previousClose ?? spotPrice;
  const changePoints = spotPrice - prevClose;
  const changePct = prevClose > 0 ? (changePoints / prevClose) * 100 : 0;
  const isPositiveChange = changePoints >= 0;

  const activePcr = currentIndexState?.pcr.atmPlusMinus5Pcr ?? 1.0;
  const isBullishSentiment = activePcr >= 1.10;
  const isBearishSentiment = activePcr <= 0.88;

  return (
    <header className="border-b border-terminal-border bg-terminal-card sticky top-0 z-40 px-3 sm:px-4 py-2 shadow-subtle select-none">
      <div className="flex items-center justify-between gap-3 min-w-0 max-w-[1840px] mx-auto">
        
        {/* ========================================================================= */}
        {/* ZONE 1: LEFT BRAND & PRIMARY MARKET STATE (LEVEL 1 INFORMATION) */}
        {/* ========================================================================= */}
        <div className="flex items-center space-x-3 shrink-0 min-w-0">
          {/* Fayda Brand Badge */}
          <div className="flex items-center space-x-2">
            <img src="/favicon-32x32.png" className="w-5 h-5 object-contain shrink-0" alt="Fayda" />
            <span className="font-sans font-extrabold text-sm sm:text-base tracking-tight text-terminal-text hidden xs:inline">
              FAYDA<span className="text-accent-sky font-bold text-xs ml-1">PRO</span>
            </span>
          </div>

          <div className="h-5 w-[1px] bg-terminal-border hidden sm:block" />

          {/* Asset Selector Dropdown */}
          <StockSelectorDropdown />

          {/* Live Spot Price & Change Delta */}
          {currentIndexState && (
            <div className="flex items-baseline space-x-2 shrink-0">
              <span className="font-mono font-bold text-sm sm:text-base md:text-lg text-terminal-text tabular-nums tracking-tight">
                ₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </span>

              <span
                className={`font-mono text-xs font-semibold flex items-center tabular-nums ${
                  isPositiveChange ? 'text-bull' : 'text-bear'
                }`}
              >
                {isPositiveChange ? '+' : ''}{changePoints.toFixed(1)} ({isPositiveChange ? '+' : ''}{changePct.toFixed(2)}%)
              </span>

              {/* Live Market Status Pill */}
              <span
                className={`hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold border ${
                  isLiveMarketOpen
                    ? 'bg-bull/10 text-bull border-bull/30'
                    : 'bg-terminal-panel text-terminal-muted border-terminal-border'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isLiveMarketOpen ? 'bg-bull animate-pulse' : 'bg-terminal-muted'}`} />
                {isLiveMarketOpen ? 'LIVE' : 'CLOSED'}
              </span>
            </div>
          )}

          {/* Expiry Selector Dropdown */}
          {expiryDates.length > 0 && (
            <div className="hidden xl:flex items-center space-x-1 pl-1">
              <Calendar className="w-3.5 h-3.5 text-terminal-muted" />
              <select
                value={selectedExpiry}
                onChange={(e) => setOptionExpiry(e.target.value)}
                className="bg-terminal-panel border border-terminal-border rounded-lg px-2 py-1 text-xs font-mono font-semibold text-terminal-text focus:outline-none focus:border-accent-sky cursor-pointer transition"
              >
                {expiryDates.map((exp: string, idx: number) => (
                  <option key={idx} value={exp} className="bg-terminal-card text-terminal-text">
                    {exp} {idx === 0 ? '(Near)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ZONE 2: CENTER KEY CONTEXT METRICS */}
        {/* ========================================================================= */}
        {currentIndexState && (
          <div className="hidden 2xl:flex items-center space-x-4 px-3 py-1 rounded-xl bg-terminal-panel/60 border border-terminal-border text-xs font-sans">
            <div className="flex items-center space-x-1.5">
              <span className="text-terminal-muted font-medium text-[11px]">ATM Strike:</span>
              <span className="font-mono font-bold text-terminal-text">{currentIndexState.atmStrike}</span>
            </div>

            <div className="h-3 w-[1px] bg-terminal-border" />

            <div className="flex items-center space-x-1.5">
              <span className="text-terminal-muted font-medium text-[11px]">PCR (ATM±5):</span>
              <span className={`font-mono font-bold ${
                isBullishSentiment ? 'text-bull' : isBearishSentiment ? 'text-bear' : 'text-amber'
              }`}>
                {activePcr.toFixed(2)}
              </span>
            </div>

            <div className="h-3 w-[1px] bg-terminal-border" />

            <div className="flex items-center space-x-1.5">
              <span className="text-terminal-muted font-medium text-[11px]">Days to Expiry:</span>
              <span className="font-mono font-bold text-terminal-text">{daysToExpiry}d</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ZONE 3: RIGHT ACTIONS & SETTINGS */}
        {/* ========================================================================= */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          
          {/* Command Palette Trigger Button (Ctrl + K) */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-muted hover:text-terminal-text transition text-xs font-sans cursor-pointer shadow-subtle"
            title="Open Command Palette (Ctrl+K or ⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden md:inline">Command</span>
            <kbd className="px-1.5 py-0.2 rounded bg-terminal-elevated text-terminal-muted text-[10px] font-mono border border-terminal-border">
              ⌘K
            </kbd>
          </button>

          {/* SuperAdmin Matrix Button (If Active) */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsAdminDrawerOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-accent-purple/15 border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/25 font-sans text-xs font-bold transition cursor-pointer shrink-0"
              title="SuperAdmin Live Control: Show/Hide panels & compliance audit"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Admin Matrix</span>
            </button>
          )}

          {/* 3-Mode Trader Toggle (Beginner / Intermediate / Expert) */}
          {panelVisibility.traderModeToggle && (
            <div className="hidden lg:flex items-center bg-terminal-panel border border-terminal-border rounded-lg p-0.5 text-xs font-sans font-semibold">
              <button
                type="button"
                onClick={() => setMode('BEGINNER')}
                className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${
                  mode === 'BEGINNER'
                    ? 'bg-bull/15 text-bull font-bold'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title="Beginner Mode: Capital preservation guardrails and simplified risk"
              >
                Beginner
              </button>

              <button
                type="button"
                onClick={() => setMode('INTERMEDIATE')}
                className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${
                  mode === 'INTERMEDIATE'
                    ? 'bg-amber/15 text-amber font-bold'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title="Intermediate Mode: Master 7-strategy confluence scoring and R:R ratios"
              >
                Interm.
              </button>

              <button
                type="button"
                onClick={() => setMode('EXPERT')}
                className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${
                  mode === 'EXPERT'
                    ? 'bg-accent-purple/15 text-accent-purple font-bold'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title="Expert Mode: Live Greeks, 1-min OI squeeze, and structural breakout levels"
              >
                Expert
              </button>
            </div>
          )}

          {/* Density Mode Switcher (Compact / Standard) */}
          <button
            type="button"
            onClick={() => setDensity(density === 'COMPACT' ? 'STANDARD' : 'COMPACT')}
            className="hidden lg:flex items-center space-x-1 px-2 py-1 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text text-[11px] font-sans font-medium transition cursor-pointer"
            title={`Current Density: ${density}. Click to switch.`}
          >
            <Activity className="w-3 h-3 text-accent-sky" />
            <span>{density === 'COMPACT' ? 'Compact' : 'Standard'}</span>
          </button>

          {/* SEBI Position Sizing & Risk Calculator Button */}
          {panelVisibility.riskCalc && (
            <button
              type="button"
              onClick={() => setIsRiskModalOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-accent-sky/15 border border-accent-sky/40 hover:bg-accent-sky/25 text-accent-sky transition font-sans text-xs font-bold shrink-0 cursor-pointer"
              title="SEBI Position Sizing & Account Risk Calculator"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Risk Calc</span>
            </button>
          )}

          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isMuted
                ? 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                : 'bg-bull/15 border-bull/30 text-bull'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Light / Dark Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-accent-sky" /> : <Sun className="w-3.5 h-3.5 text-amber" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* User Auth Profile Badge or Sign In */}
          {isAuthenticated && user ? (
            <div className="flex items-center bg-terminal-panel border border-terminal-border rounded-lg px-2 py-1 gap-1.5 font-sans text-xs shrink-0">
              <div className="w-5 h-5 rounded-full bg-accent-sky/20 text-accent-sky font-bold text-[10px] flex items-center justify-center">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <span className="text-terminal-text font-semibold max-w-[80px] truncate hidden sm:inline">
                {user.fullName}
              </span>
              <button
                type="button"
                onClick={logout}
                className="p-0.5 text-terminal-muted hover:text-bear transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-accent-sky/15 border border-accent-sky/40 hover:bg-accent-sky/25 text-accent-sky font-sans text-xs font-bold transition cursor-pointer shrink-0"
              title="Sign In with SEBI Consent"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Overflow Menu for Small Screens */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Popover Controls Menu for Mobile/Small Displays */}
      {isMoreMenuOpen && (
        <div 
          ref={moreMenuRef}
          className="absolute right-3 top-full mt-2 w-72 bg-terminal-card border border-terminal-border rounded-xl shadow-elevated z-50 p-3 space-y-3 font-sans text-xs animate-slide-down"
        >
          <div className="flex items-center justify-between pb-2 border-b border-terminal-border">
            <span className="font-semibold text-terminal-text">Terminal Settings</span>
            <button onClick={() => setIsMoreMenuOpen(false)} className="text-terminal-muted hover:text-terminal-text">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode switch */}
          <div className="space-y-1">
            <span className="text-[11px] text-terminal-muted font-medium block">Trader Experience Mode</span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => { setMode('BEGINNER'); setIsMoreMenuOpen(false); }}
                className={`py-1 rounded text-[11px] font-semibold border ${mode === 'BEGINNER' ? 'bg-bull/15 border-bull/40 text-bull' : 'bg-terminal-panel border-terminal-border text-terminal-muted'}`}
              >
                Beginner
              </button>
              <button
                onClick={() => { setMode('INTERMEDIATE'); setIsMoreMenuOpen(false); }}
                className={`py-1 rounded text-[11px] font-semibold border ${mode === 'INTERMEDIATE' ? 'bg-amber/15 border-amber/40 text-amber' : 'bg-terminal-panel border-terminal-border text-terminal-muted'}`}
              >
                Interm.
              </button>
              <button
                onClick={() => { setMode('EXPERT'); setIsMoreMenuOpen(false); }}
                className={`py-1 rounded text-[11px] font-semibold border ${mode === 'EXPERT' ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple' : 'bg-terminal-panel border-terminal-border text-terminal-muted'}`}
              >
                Expert
              </button>
            </div>
          </div>

          {/* Density switch */}
          <div className="space-y-1">
            <span className="text-[11px] text-terminal-muted font-medium block">Table Density</span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => { setDensity('COMPACT'); setIsMoreMenuOpen(false); }}
                className={`py-1 rounded text-[11px] font-semibold border ${density === 'COMPACT' ? 'bg-accent-sky/15 border-accent-sky/40 text-accent-sky' : 'bg-terminal-panel border-terminal-border text-terminal-muted'}`}
              >
                Compact
              </button>
              <button
                onClick={() => { setDensity('STANDARD'); setIsMoreMenuOpen(false); }}
                className={`py-1 rounded text-[11px] font-semibold border ${density === 'STANDARD' ? 'bg-accent-sky/15 border-accent-sky/40 text-accent-sky' : 'bg-terminal-panel border-terminal-border text-terminal-muted'}`}
              >
                Standard
              </button>
              <button
                onClick={() => { setDensity('COMFORTABLE'); setIsMoreMenuOpen(false); }}
                className={`py-1 rounded text-[11px] font-semibold border ${density === 'COMFORTABLE' ? 'bg-accent-sky/15 border-accent-sky/40 text-accent-sky' : 'bg-terminal-panel border-terminal-border text-terminal-muted'}`}
              >
                Comfort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Index Mini Strip */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 mt-1 border-t border-terminal-border/50">
        {indices.map((sym: string) => {
          const isSelected = selectedIndex === sym;
          const state = sym === selectedIndex ? currentIndexState : undefined;
          const isPos = state ? state.spotPrice >= state.previousClose : true;
          const pts = state ? state.spotPrice - state.previousClose : 0;
          const pct = state && state.previousClose > 0 ? (pts / state.previousClose) * 100 : 0;

          return (
            <div
              key={sym}
              onClick={() => {
                if (sym !== selectedIndex) {
                  setSelectedIndex(sym as any);
                }
              }}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg border transition cursor-pointer select-none min-w-[130px] font-sans ${
                isSelected
                  ? 'bg-accent-sky/10 border-accent-sky/50 shadow-subtle'
                  : 'bg-terminal-panel/60 border-terminal-border hover:border-terminal-border/80 hover:bg-terminal-panel'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[11px] text-terminal-text">{sym}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sky" />
                )}
              </div>

              {state ? (
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="font-mono font-semibold text-xs text-terminal-text tabular-nums">
                    ₹{state.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-medium tabular-nums ${
                      isPos ? 'text-bull' : 'text-bear'
                    }`}
                  >
                    {isPos ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-terminal-muted mt-0.5">
                  Streaming...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals & Drawers */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenRiskCalc={() => setIsRiskModalOpen(true)}
        onOpenAdminDrawer={() => setIsAdminDrawerOpen(true)}
        onOpenFyersModal={() => setIsFyersModalOpen(true)}
      />

      <FyersModal
        isOpen={isFyersModalOpen}
        onClose={() => setIsFyersModalOpen(false)}
      />

      <RiskCalculatorModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        defaultLtp={100}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <SuperAdminControlDrawer
        isOpen={isAdminDrawerOpen}
        onClose={() => setIsAdminDrawerOpen(false)}
      />
    </header>
  );
};
