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
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
  Zap,
  Search,
  Command,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FyersModal } from './FyersModal';
import { StockSelectorDropdown } from './StockSelectorDropdown';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { AuthModal } from './auth/AuthModal';
import { SuperAdminControlDrawer } from './admin/SuperAdminControlDrawer';
import { LegalDocumentModal, type LegalDocType } from './auth/LegalDocumentModal';
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
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>('RISK_DISCLOSURE');
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

  // Sync fullscreen state with all browser vendor prefix events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const doc = document as any;
    const docEl = document.documentElement as any;

    const isFs = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFs) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err: any) => console.warn('[Fullscreen] Request failed:', err));
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch((err: any) => console.warn('[Fullscreen] Exit failed:', err));
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
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
  const selectedExpiry = currentIndexState?.selectedExpiry || '';
  const daysToExpiry = currentIndexState?.daysToExpiry ?? 4;
  const spotPrice = currentIndexState?.spotPrice || 24800;
  const prevClose = currentIndexState?.previousClose || 24700;
  const netChange = spotPrice - prevClose;
  const pctChange = prevClose > 0 ? (netChange / prevClose) * 100 : 0;
  const isPositive = netChange >= 0;

  const activePcr = currentIndexState?.pcr?.atmPlusMinus5Pcr ?? 1.0;
  const isBullishSentiment = activePcr >= 1.05;
  const isBearishSentiment = activePcr <= 0.90;

  const isFyersActive = !!(fyersConfig && (fyersConfig.isConnected || fyersConfig.accessToken || fyersConfig.hasToken));

  return (
    <header className="sticky top-0 z-40 bg-terminal-card/95 backdrop-blur-md border-b border-terminal-border px-2.5 sm:px-4 py-1.5 select-none shadow-subtle flex flex-col space-y-1.5">
      {/* ========================================================================= */}
      {/* TIER 1: PRIMARY ACTION & CONTROL BAR */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 max-w-[1840px] w-full mx-auto">
        
        {/* LEFT SECTION: BRAND + ASSET SELECTOR + SPOT METRICS */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {/* Logo & Brand Name */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-accent-sky/15 flex items-center justify-center border border-accent-sky/30 shadow-subtle shrink-0">
              <img src="/favicon-32x32.png" className="w-4 h-4 object-contain" alt="Fayda" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-xs tracking-tight text-terminal-text">FAYDA PRO</span>
              <span className="text-[9px] text-terminal-muted font-mono tracking-wider">MARKET OS</span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-terminal-border hidden sm:block" />

          {/* Quick Stock / Index Selector Dropdown */}
          <StockSelectorDropdown />

          {/* Live Spot Price & Day's Delta */}
          <div className="flex items-baseline space-x-1.5 font-mono">
            <span className="text-sm sm:text-base font-black text-terminal-text tabular-nums">
              ₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[11px] font-semibold flex items-center tabular-nums ${
              isPositive ? 'text-bull' : 'text-bear'
            }`}>
              {isPositive ? '+' : ''}{netChange.toFixed(2)} ({isPositive ? '+' : ''}{pctChange.toFixed(2)}%)
            </span>
          </div>

          {/* Live / Closed Market Indicator */}
          <div className="hidden md:flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-terminal-panel border border-terminal-border text-[10px] font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${isLiveMarketOpen ? 'bg-bull animate-pulse' : 'bg-bear'}`} />
            <span className="text-terminal-muted">{isLiveMarketOpen ? 'LIVE' : 'CLOSED'}</span>
          </div>
        </div>

        {/* RIGHT SECTION: COMPLETE SUITE OF CONTROLS (ALWAYS VISIBLE) */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          
          {/* Command Palette Trigger Button (Ctrl + K) */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-muted hover:text-terminal-text transition text-xs font-sans cursor-pointer shadow-subtle"
            title="Open Command Palette (Ctrl+K or ⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden md:inline">Command</span>
            <kbd className="px-1 py-0.2 rounded bg-terminal-elevated text-terminal-muted text-[10px] font-mono border border-terminal-border hidden sm:inline">
              ⌘K
            </kbd>
          </button>

          {/* Fyers Broker Connect / Live API Button */}
          <button
            type="button"
            onClick={() => setIsFyersModalOpen(true)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border text-xs font-sans font-bold transition cursor-pointer shrink-0 ${
              isFyersActive
                ? 'bg-bull/15 border-bull/40 text-bull'
                : 'bg-terminal-panel hover:bg-terminal-hover border-terminal-border text-terminal-muted hover:text-terminal-text'
            }`}
            title={isFyersActive ? 'Fyers API v3 Connected & Authorized' : 'Connect Fyers Broker Feed'}
          >
            <KeyRound className="w-3.5 h-3.5 text-accent-sky" />
            <span className="hidden lg:inline">{isFyersActive ? 'Fyers Live' : 'Connect Fyers'}</span>
          </button>

          {/* SuperAdmin Matrix Button (If Active) */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsAdminDrawerOpen(true)}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-accent-purple/15 border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/25 font-sans text-xs font-bold transition cursor-pointer shrink-0"
              title="SuperAdmin Live Control"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Admin</span>
            </button>
          )}

          {/* 3-Mode Trader Toggle (Beginner / Intermediate / Expert) */}
          {panelVisibility.traderModeToggle && (
            <div className="flex items-center bg-terminal-panel border border-terminal-border rounded-lg p-0.5 text-xs font-sans font-semibold">
              <button
                type="button"
                onClick={() => setMode('BEGINNER')}
                className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${
                  mode === 'BEGINNER'
                    ? 'bg-bull/15 text-bull font-bold shadow-subtle'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title="Beginner Mode"
              >
                Beginner
              </button>

              <button
                type="button"
                onClick={() => setMode('INTERMEDIATE')}
                className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${
                  mode === 'INTERMEDIATE'
                    ? 'bg-amber/15 text-amber font-bold shadow-subtle'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title="Intermediate Mode"
              >
                Interm.
              </button>

              <button
                type="button"
                onClick={() => setMode('EXPERT')}
                className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${
                  mode === 'EXPERT'
                    ? 'bg-accent-purple/15 text-accent-purple font-bold shadow-subtle'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title="Expert Mode"
              >
                Expert
              </button>
            </div>
          )}

          {/* Density Mode Switcher (Compact / Standard) */}
          <button
            type="button"
            onClick={() => setDensity(density === 'COMPACT' ? 'STANDARD' : 'COMPACT')}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text text-[11px] font-sans font-medium transition cursor-pointer"
            title={`Current Density: ${density}. Click to switch.`}
          >
            <Activity className="w-3 h-3 text-accent-sky" />
            <span className="hidden sm:inline">{density === 'COMPACT' ? 'Compact' : 'Standard'}</span>
          </button>

          {/* SEBI Position Sizing & Risk Calculator Button */}
          {panelVisibility.riskCalc && (
            <button
              type="button"
              onClick={() => setIsRiskModalOpen(true)}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-accent-sky/15 border border-accent-sky/40 hover:bg-accent-sky/25 text-accent-sky transition font-sans text-xs font-bold shrink-0 cursor-pointer"
              title="SEBI Position Sizing & Risk Calculator"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Risk Calc</span>
            </button>
          )}

          {/* Legal / SEBI Compliance Center Button */}
          <button
            type="button"
            onClick={() => {
              setActiveLegalDoc('RISK_DISCLOSURE');
              setIsLegalModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
            title="SEBI Disclaimers & Legal Compliance Center"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber" />
          </button>

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
            className="p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
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
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-accent-sky/15 border border-accent-sky/40 hover:bg-accent-sky/25 text-accent-sky font-sans text-xs font-bold transition cursor-pointer shrink-0"
              title="Sign In with SEBI Consent"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 2: MULTI-INDEX STRIP + EXPIRY PICKER & LIVE CONTEXT METRICS */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-terminal-border/60 max-w-[1840px] w-full mx-auto text-xs">
        
        {/* Left: Multi-Index Mini Ticker Strip */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
          {visibleIndices.map((sym: string) => {
            const isSelected = selectedIndex === sym;
            const state = sym === selectedIndex ? currentIndexState : indices[sym];
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
                className={`flex-shrink-0 px-2 py-0.5 rounded-lg border transition cursor-pointer select-none font-sans flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-accent-sky/15 border-accent-sky/50 shadow-subtle'
                    : 'bg-terminal-panel/60 border-terminal-border hover:border-terminal-border/80 hover:bg-terminal-panel'
                }`}
              >
                <div className="flex items-center space-x-1 font-mono font-bold text-[11px]">
                  <span className="text-terminal-text">{sym}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-accent-sky" />}
                </div>
                <div className="flex items-baseline space-x-1 font-mono text-[11px]">
                  <span className="text-terminal-text font-bold tabular-nums">
                    ₹{state ? state.spotPrice.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : '—'}
                  </span>
                  <span className={`text-[10px] font-semibold tabular-nums ${isPos ? 'text-bull' : 'text-bear'}`}>
                    {isPos ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Expiry Selector + Live Context Metrics (ATM, PCR, Days to Expiry, Clock) */}
        {currentIndexState && (
          <div className="flex items-center space-x-3 text-xs font-sans ml-auto">
            {/* Expiry Selector Dropdown */}
            {expiryDates.length > 0 && (
              <div className="flex items-center space-x-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-terminal-muted" />
                <select
                  value={selectedExpiry}
                  onChange={(e) => setOptionExpiry(e.target.value)}
                  className="bg-terminal-panel border border-terminal-border rounded-lg px-2 py-0.5 text-xs font-mono font-semibold text-terminal-text focus:outline-none focus:border-accent-sky cursor-pointer transition"
                >
                  {expiryDates.map((exp: string, idx: number) => (
                    <option key={idx} value={exp} className="bg-terminal-card text-terminal-text">
                      {exp} {idx === 0 ? '(Near)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="h-3 w-[1px] bg-terminal-border hidden sm:block" />

            <div className="hidden sm:flex items-center space-x-1">
              <span className="text-terminal-muted font-medium text-[11px]">ATM:</span>
              <span className="font-mono font-bold text-terminal-text">{currentIndexState.atmStrike}</span>
            </div>

            <div className="h-3 w-[1px] bg-terminal-border hidden sm:block" />

            <div className="hidden sm:flex items-center space-x-1">
              <span className="text-terminal-muted font-medium text-[11px]">PCR:</span>
              <span className={`font-mono font-bold ${
                isBullishSentiment ? 'text-bull' : isBearishSentiment ? 'text-bear' : 'text-amber'
              }`}>
                {activePcr.toFixed(2)}
              </span>
            </div>

            <div className="h-3 w-[1px] bg-terminal-border hidden sm:block" />

            <div className="hidden sm:flex items-center space-x-1">
              <span className="text-terminal-muted font-medium text-[11px]">Expiry:</span>
              <span className="font-mono font-bold text-terminal-text">{daysToExpiry}d</span>
            </div>

            <div className="h-3 w-[1px] bg-terminal-border hidden sm:block" />

            {/* Live IST Clock */}
            <div className="flex items-center space-x-1 font-mono text-terminal-muted text-[11px]">
              <Clock className="w-3 h-3 text-accent-sky" />
              <span>{currentTime} IST</span>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      <FyersModal isOpen={isFyersModalOpen} onClose={() => setIsFyersModalOpen(false)} />
      <RiskCalculatorModal isOpen={isRiskModalOpen} onClose={() => setIsRiskModalOpen(false)} defaultLtp={100} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <LegalDocumentModal isOpen={isLegalModalOpen} onClose={() => setIsLegalModalOpen(false)} initialDoc={activeLegalDoc} />
      <SuperAdminControlDrawer isOpen={isAdminDrawerOpen} onClose={() => setIsAdminDrawerOpen(false)} />
      <CommandPaletteModal isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </header>
  );
};
