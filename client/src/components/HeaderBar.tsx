import React, { useState, useEffect, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode, type TerminalMode } from '../context/TerminalModeContext';
import { useDensity, type TerminalDensity } from '../context/DensityContext';
import { useAuth } from '../context/AuthContext';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime } from '../utils/formatTime';
import { sanitizeSpotData } from '../utils/lastClosedData';
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
  FileText,
  Menu,
  ChevronDown,
  BarChart2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FyersModal } from './FyersModal';
import { StockSelectorDropdown } from './StockSelectorDropdown';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { AuthModal } from './auth/AuthModal';
import { SuperAdminControlDrawer } from './admin/SuperAdminControlDrawer';
import { LegalDocumentModal, type LegalDocType } from './auth/LegalDocumentModal';
import { CommandPaletteModal } from './CommandPaletteModal';
import { PostMarketTradeJournal } from './PostMarketTradeJournal';
import { UserProfileEditModal } from './profile/UserProfileEditModal';

export const HeaderBar: React.FC = () => {
  const {
    currentIndexState,
    indices,
    indicesReceivedAt,
    selectedIndex,
    setSelectedIndex,
    visibleIndices,
    recentSurges,
    setStrikeRange,
    strikeRange,
    setOptionExpiry,
    fyersConfig,
    dataSource,
    setDataSource,
    globalMarketContext,
    toggleIndexVisibility,
    isConnected,
    isMuted,
    toggleMute,
    testSound
  } = useMarket();

  const { theme, toggleTheme } = useTheme();
  const { mode, setMode } = useTerminalMode();
  const { density, setDensity } = useDensity();
  const { user, isAuthenticated, isSuperAdmin, logout, panelVisibility } = useAuth();

  const [isFyersModalOpen, setIsFyersModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>('RISK_DISCLOSURE');
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileModeDropdownOpen, setIsMobileModeDropdownOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mobileModeRef = useRef<HTMLDivElement>(null);

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
      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement ||
        document.body.classList.contains('terminal-fullscreen-active')
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

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const doc = document as any;
    const docEl = document.documentElement as any;

    const isNativeFs = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    const isCssFs = document.body.classList.contains('terminal-fullscreen-active');

    if (isNativeFs || isCssFs) {
      try {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      } catch (err) {
        console.warn('[Fullscreen] Exit failed:', err);
      } finally {
        document.body.classList.remove('terminal-fullscreen-active');
        setIsFullscreen(false);
      }
    } else {
      let requested = false;
      try {
        const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        if (req) {
          const res = req.call(docEl);
          if (res && res.catch) {
            res.catch((err: any) => {
              console.warn('[Fullscreen] Native rejected, applying CSS full window:', err);
              document.body.classList.add('terminal-fullscreen-active');
              setIsFullscreen(true);
            });
          }
          requested = true;
          setIsFullscreen(true);
        }
      } catch (err) {
        console.warn('[Fullscreen] Native error, applying CSS full window:', err);
      }

      if (!requested) {
        document.body.classList.add('terminal-fullscreen-active');
        setIsFullscreen(true);
      }
    }
  };

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (mobileModeRef.current && !mobileModeRef.current.contains(e.target as Node)) {
        setIsMobileModeDropdownOpen(false);
      }
    };
    if (isMoreMenuOpen || isMobileModeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen, isMobileModeDropdownOpen]);

  // Live real-time clock with seconds strictly formatted in IST
  const [currentTime, setCurrentTime] = useState<string>(() => {
    return formatISTTime(null, { showSeconds: true });
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
      setCurrentTime(formatISTTime(null, { showSeconds: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const expiryDates = currentIndexState?.expiryDates || [];
  const selectedExpiry = currentIndexState?.selectedExpiry || '';
  const daysToExpiry = currentIndexState?.daysToExpiry ?? 4;
  
  const sanitizedCurrent = sanitizeSpotData(selectedIndex, currentIndexState);
  const selectedReceivedAt = indicesReceivedAt[selectedIndex] ?? 0;
  const isStateFresh = selectedReceivedAt > 0 && (Date.now() - selectedReceivedAt) <= 60000;
  const spotPrice = sanitizedCurrent.spotPrice;
  const netChange = isStateFresh ? sanitizedCurrent.change : 0;
  const pctChange = isStateFresh ? sanitizedCurrent.pctChange : 0;
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
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0 min-w-0">
          {/* Logo & Brand Name */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-accent-sky/15 flex items-center justify-center border border-accent-sky/30 shadow-subtle shrink-0">
              <img src="/favicon-32x32.png" className="w-4 h-4 object-contain" alt="Fayda" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-xs tracking-tight text-terminal-text">FAYDA PRO</span>
              <span className="text-[9px] text-terminal-muted font-mono tracking-wider">MARKET OS</span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-terminal-border hidden sm:block shrink-0" />

          {/* Quick Stock / Index Selector Dropdown */}
          <StockSelectorDropdown />

          {/* Live / Closed Market Indicator (Visible on mobile & desktop) */}
          <div className="flex items-center space-x-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-terminal-panel border border-terminal-border text-[10px] font-mono shrink-0" title={`Market is ${isConnected ? (isLiveMarketOpen ? 'LIVE' : 'CLOSED') : 'OFFLINE'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected && isLiveMarketOpen ? 'bg-bull animate-pulse' : isConnected ? 'bg-amber animate-pulse' : 'bg-bear'}`} />
            <span className="text-terminal-muted hidden md:inline">{isConnected ? (isLiveMarketOpen ? 'LIVE' : 'CLOSED') : 'OFFLINE'}</span>
          </div>
        </div>

        {/* RIGHT SECTION: RESPONSIVE ACTIONS & TOOLS */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">

          {/* Command Palette Trigger Button (Ctrl + K) */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-muted hover:text-terminal-text transition text-xs font-sans cursor-pointer shadow-subtle flex items-center space-x-1.5"
            title="Open Command Palette (Ctrl+K or ⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden md:inline">Command</span>
            <kbd className="px-1 py-0.2 rounded bg-terminal-elevated text-terminal-muted text-[10px] font-mono border border-terminal-border hidden sm:inline">
              ⌘K
            </kbd>
          </button>

          {/* DESKTOP-ONLY CONTROLS (Hidden on < 1024px, Available in Mobile Menu Dropdown) */}
          <div className="hidden lg:flex items-center space-x-1 sm:space-x-1.5">
            {/* Fyers Broker Connect Button */}
            <button
              type="button"
              onClick={() => setIsFyersModalOpen(true)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border text-xs font-sans font-bold transition cursor-pointer shrink-0 ${isFyersActive
                  ? 'bg-bull/15 border-bull/40 text-bull'
                  : 'bg-terminal-panel hover:bg-terminal-hover border-terminal-border text-terminal-muted hover:text-terminal-text'
                }`}
              title={isFyersActive ? 'Fyers API v3 Connected' : 'Connect Fyers Broker'}
            >
              <KeyRound className="w-3.5 h-3.5 text-accent-sky" />
              <span className="hidden xl:inline">{isFyersActive ? 'Fyers Live' : 'Connect Fyers'}</span>
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

            {/* 3-Mode Trader Toggle */}
            {panelVisibility.traderModeToggle && (
              <div className="flex items-center bg-terminal-panel border border-terminal-border rounded-lg p-0.5 text-xs font-sans font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('BEGINNER')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${mode === 'BEGINNER'
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
                  className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${mode === 'INTERMEDIATE'
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
                  className={`px-2 py-0.5 rounded transition cursor-pointer text-[11px] ${mode === 'EXPERT'
                      ? 'bg-accent-purple/15 text-accent-purple font-bold shadow-subtle'
                      : 'text-terminal-muted hover:text-terminal-text'
                    }`}
                  title="Expert Mode"
                >
                  Expert
                </button>
              </div>
            )}

            {/* Density Mode Switcher */}
            <button
              type="button"
              onClick={() => setDensity(density === 'COMPACT' ? 'STANDARD' : 'COMPACT')}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text text-[11px] font-sans font-medium transition cursor-pointer"
              title={`Current Density: ${density}. Click to switch.`}
            >
              <Activity className="w-3 h-3 text-accent-sky" />
              <span className="hidden xl:inline">{density === 'COMPACT' ? 'Compact' : 'Standard'}</span>
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
                <span className="hidden xl:inline">Risk Calc</span>
              </button>
            )}

            {/* Trade Journal & Performance Audit Report Button */}
            <button
              type="button"
              onClick={() => setIsJournalModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/40 hover:bg-purple-500/25 text-purple-300 transition font-sans text-xs font-bold shrink-0 cursor-pointer shadow-sm"
              title="Trade Journal: Date-Wise Prediction Performance, Target Hits & Nearness Audit"
            >
              <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden xl:inline">Trade Journal</span>
            </button>

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
              className={`p-1.5 rounded-lg border transition cursor-pointer ${isMuted
                  ? 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                  : 'bg-bull/15 border-bull/30 text-bull'
                }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Light / Dark Theme Toggle (Visible on Mobile & Desktop Top Header) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer shrink-0"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-accent-sky" /> : <Sun className="w-3.5 h-3.5 text-amber" />}
          </button>

          {/* Fullscreen Toggle (Visible on Mobile & Desktop Top Header) */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
              isFullscreen
                ? 'bg-accent-sky/20 border-accent-sky/50 text-accent-sky shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                : 'bg-terminal-panel hover:bg-terminal-border border-terminal-border text-terminal-muted hover:text-terminal-text'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F11 / Full Window)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* ========================================================================= */}
          {/* MOBILE / TABLET TRADER MODE DROPDOWN TRIGGER (< 1024px) */}
          {/* ========================================================================= */}
          {panelVisibility.traderModeToggle && (
            <div className="relative lg:hidden" ref={mobileModeRef}>
              <button
                type="button"
                onClick={() => setIsMobileModeDropdownOpen(!isMobileModeDropdownOpen)}
                className={`flex items-center space-x-1 p-1.5 sm:px-2 sm:py-1 rounded-lg border text-xs font-bold transition cursor-pointer shrink-0 shadow-sm ${mode === 'BEGINNER'
                    ? 'bg-bull/15 text-bull border-bull/40 shadow-[0_0_10px_rgba(0,245,155,0.2)]'
                    : mode === 'INTERMEDIATE'
                      ? 'bg-amber/15 text-amber border-amber/40 shadow-[0_0_10px_rgba(255,180,0,0.2)]'
                      : 'bg-accent-purple/15 text-accent-purple border-accent-purple/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  }`}
                title={`Mode: ${mode === 'BEGINNER' ? 'Beginner' : mode === 'INTERMEDIATE' ? 'Intermediate' : 'Expert'} - Click to switch`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px] font-sans hidden sm:inline">
                  {mode === 'BEGINNER' ? 'Beginner' : mode === 'INTERMEDIATE' ? 'Interm.' : 'Expert'}
                </span>
                <div className={`transition-transform duration-200 hidden sm:block ${isMobileModeDropdownOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </button>

              {/* Smooth Animated Dropdown Menu for Mobile Mode Selection */}
              {isMobileModeDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-terminal-card/95 border border-terminal-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col space-y-1 backdrop-blur-xl ring-1 ring-black/40">
                  <div className="px-2.5 py-1 border-b border-terminal-border/60 text-[10px] font-mono font-bold text-terminal-muted uppercase tracking-wider">
                    Experience Mode
                  </div>

                  {/* 1. Beginner Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('BEGINNER');
                      setIsMobileModeDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition text-left cursor-pointer ${mode === 'BEGINNER'
                        ? 'bg-bull/20 text-bull font-bold border border-bull/40'
                        : 'text-terminal-text hover:bg-terminal-panel hover:text-bull'
                      }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-bull shrink-0" />
                      <div>
                        <span className="block leading-tight font-bold">🟢 Beginner</span>
                        <span className="text-[9px] text-terminal-muted font-normal">Simplified signals & clarity</span>
                      </div>
                    </div>
                    {mode === 'BEGINNER' && <CheckCircle2 className="w-4 h-4 text-bull shrink-0 ml-1" />}
                  </button>

                  {/* 2. Intermediate Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('INTERMEDIATE');
                      setIsMobileModeDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition text-left cursor-pointer ${mode === 'INTERMEDIATE'
                        ? 'bg-amber/20 text-amber font-bold border border-amber/40'
                        : 'text-terminal-text hover:bg-terminal-panel hover:text-amber'
                      }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber shrink-0" />
                      <div>
                        <span className="block leading-tight font-bold">🟡 Intermediate</span>
                        <span className="text-[9px] text-terminal-muted font-normal">Multi-strike shifts & momentum</span>
                      </div>
                    </div>
                    {mode === 'INTERMEDIATE' && <CheckCircle2 className="w-4 h-4 text-amber shrink-0 ml-1" />}
                  </button>

                  {/* 3. Expert Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('EXPERT');
                      setIsMobileModeDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition text-left cursor-pointer ${mode === 'EXPERT'
                        ? 'bg-accent-purple/20 text-accent-purple font-bold border border-accent-purple/40'
                        : 'text-terminal-text hover:bg-terminal-panel hover:text-accent-purple'
                      }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-accent-purple shrink-0" />
                      <div>
                        <span className="block leading-tight font-bold">🟣 Expert</span>
                        <span className="text-[9px] text-terminal-muted font-normal">Gamma, Greeks & orderflow</span>
                      </div>
                    </div>
                    {mode === 'EXPERT' && <CheckCircle2 className="w-4 h-4 text-accent-purple shrink-0 ml-1" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 2: MULTI-INDEX STRIP + EXPIRY PICKER & LIVE CONTEXT METRICS */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1 border-t border-terminal-border/60 max-w-[1840px] w-full mx-auto text-xs">

        {/* Mobile View: Expiry Date Dropdown positioned on the Left */}
        {currentIndexState && expiryDates.length > 0 && (
          <div className="flex md:hidden items-center space-x-1 font-mono shrink-0">
            <Calendar className="w-3 h-3 text-accent-cyan" />
            <select
              value={selectedExpiry}
              onChange={(e) => setOptionExpiry(e.target.value)}
              className="bg-terminal-panel border border-terminal-border rounded-lg px-1.5 py-0.5 text-[10px] font-mono font-bold text-accent-cyan focus:outline-none focus:border-accent-sky cursor-pointer transition shadow-sm max-w-[115px]"
              title="Select Contract Expiry"
            >
              {expiryDates.map((exp: string, idx: number) => (
                <option key={idx} value={exp} className="bg-terminal-card text-terminal-text">
                  {exp} {idx === 0 ? '(Near)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Multi-Index Mini Ticker Strip */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {visibleIndices.map((sym: string) => {
            const isSelected = selectedIndex === sym;
            const rawState = sym === selectedIndex ? currentIndexState : indices[sym];
            const sanitized = sanitizeSpotData(sym, rawState);

            const receivedAt = sym === selectedIndex
              ? (indicesReceivedAt[selectedIndex] ?? 0)
              : (indicesReceivedAt[sym] ?? 0);
            const isFresh = receivedAt > 0 && (Date.now() - receivedAt) <= 60000;

            const pts = isFresh ? sanitized.change : null;
            const pct = isFresh ? sanitized.pctChange : null;
            const isPos = (pts ?? 0) >= 0;

            return (
              <div
                key={sym}
                onClick={() => {
                  if (sym !== selectedIndex) {
                    setSelectedIndex(sym as any);
                  }
                }}
                className={`group flex-shrink-0 px-2 py-0.5 rounded-lg border transition cursor-pointer select-none font-sans flex items-center space-x-1.5 sm:space-x-2 ${isSelected
                    ? 'bg-accent-sky/15 border-accent-sky/50 shadow-subtle'
                    : 'bg-terminal-panel/60 border-terminal-border hover:border-terminal-border/80 hover:bg-terminal-panel'
                  }`}
              >
                <div className="flex items-center space-x-1 font-mono font-bold text-[10px] sm:text-[11px]">
                  <span className="text-terminal-text">{sym}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-accent-sky" />}
                </div>
                <div className="flex items-baseline space-x-1 font-mono text-[10px] sm:text-[11px]">
                  <span className="text-terminal-text font-bold tabular-nums">
                    ₹{sanitized.spotPrice > 0 ? sanitized.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </span>
                  {pct !== null ? (
                    <span className={`text-[9px] sm:text-[10px] font-semibold tabular-nums ${isPos ? 'text-bull' : 'text-bear'}`}>
                      {isPos ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] text-terminal-muted tabular-nums animate-pulse">…</span>
                  )}
                </div>

                {/* Close / Unpin Asset Button */}
                {visibleIndices.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleIndexVisibility(sym as any);
                    }}
                    className="p-0.5 -mr-0.5 rounded-full text-terminal-muted hover:text-rose-400 hover:bg-rose-500/15 transition-all opacity-70 hover:opacity-100 cursor-pointer"
                    title={`Close ${sym} from bar`}
                    aria-label={`Close ${sym}`}
                  >
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop View: Expiry Selector + Live Context Metrics (ATM, PCR, Days to Expiry, Clock) */}
        {currentIndexState && (
          <div className="hidden md:flex items-center space-x-2 sm:space-x-3 text-xs font-sans ml-auto shrink-0">
            {/* Expiry Selector Dropdown */}
            {expiryDates.length > 0 && (
              <div className="flex items-center space-x-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-terminal-muted hidden sm:inline" />
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
              <span className={`font-mono font-bold ${isBullishSentiment ? 'text-bull' : isBearishSentiment ? 'text-bear' : 'text-amber'
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

      {/* User Profile Edit Modal */}
      <UserProfileEditModal isOpen={isProfileEditOpen} onClose={() => setIsProfileEditOpen(false)} />

      {/* Trade Journal & Performance Audit Modal */}
      {isJournalModalOpen && (
        <PostMarketTradeJournal isModal={true} onClose={() => setIsJournalModalOpen(false)} />
      )}
    </header>
  );
};
