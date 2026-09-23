import React, { useState, useEffect, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode, type TerminalMode } from '../context/TerminalModeContext';
import { useDensity, type TerminalDensity } from '../context/DensityContext';
import { useAuth } from '../context/AuthContext';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime, getISTComponents } from '../utils/formatTime';
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
  Target,
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
  BarChart2,
  Layers
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { UnifiedBrokerModal } from './UnifiedBrokerModal';
import { StockSelectorDropdown } from './StockSelectorDropdown';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { AuthModal } from './auth/AuthModal';
import { SuperAdminControlDrawer } from './admin/SuperAdminControlDrawer';
import { LegalDocumentModal, type LegalDocType } from './auth/LegalDocumentModal';
import { CommandPaletteModal } from './CommandPaletteModal';
import { isBrowserFullscreen, toggleBrowserFullscreen, subscribeToFullscreen } from '../utils/fullscreenManager';
import { PostMarketTradeJournal } from './PostMarketTradeJournal';
import { UserProfileEditModal } from './profile/UserProfileEditModal';
import { TopSubscribeDropdown } from './subscription/TopSubscribeDropdown';
import { UserProfileDropdown } from './auth/UserProfileDropdown';
import { FastSubscriptionModal } from './subscription/FastSubscriptionModal';
import { WorkspaceSettingsDropdown } from './header/WorkspaceSettingsDropdown';
import { ExploreMegaMenu } from './header/ExploreMegaMenu';
import { TradePayoffSimulatorModal } from './TradePayoffSimulatorModal';
import { SoundSettingsModal } from './SoundSettingsModal';
import { McxOfflineModal } from './McxOfflineModal';
import { MarketHolidaysModal } from './MarketHolidaysModal';
import { CasProbableCloseModal } from './CasProbableCloseModal';
import { useTradingPersona } from '../context/TradingPersonaContext';
import { useWatchlist } from '../context/WatchlistContext';
import { MobileNavMenu } from './header/MobileNavMenu';
import { MobileToolsDropdown } from './header/MobileToolsDropdown';
import { MobileProDropdown } from './header/MobileProDropdown';

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
    effectiveBroker,
    dhanConfig,
    activeBroker,
    fyersConfig,
    dataSource,
    setDataSource,
    globalMarketContext,
    toggleIndexVisibility,
    isConnected,
    isMuted,
    toggleMute,
    testSound,
    openChartModal,
    openOptionsDataModal
  } = useMarket();

  const { theme, toggleTheme } = useTheme();
  const { mode, setMode } = useTerminalMode();
  const { density, setDensity } = useDensity();
  const { user, isAuthenticated, isSuperAdmin, logout, panelVisibility, togglePanelVisibility } = useAuth();
  const { metadata: personaMetadata, setIsPersonaModalOpen } = useTradingPersona();
  const { activeWatchlist, setIsWatchlistDrawerOpen } = useWatchlist();

  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isFyersModalOpen, setIsFyersModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>('RISK_DISCLOSURE');
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileEditTab, setProfileEditTab] = useState<'PROFILE' | 'PASSWORD' | 'MEMBERSHIP'>('PROFILE');
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [subscribeDefaultPlan, setSubscribeDefaultPlan] = useState<'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND'>('GOLD');
  const [isPayoffModalOpen, setIsPayoffModalOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [isMcxModalOpen, setIsMcxModalOpen] = useState(false);
  const [mcxModalSymbol, setMcxModalSymbol] = useState('CRUDEOIL');
  const [isHolidaysModalOpen, setIsHolidaysModalOpen] = useState(false);
  const [isCasModalOpen, setIsCasModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => isBrowserFullscreen());

  const handleNavigateToPanel = (panelId: string, panelVisibilityKey?: string, mobileTab?: string) => {
    if (panelVisibilityKey && (panelVisibility as any)[panelVisibilityKey] === false) {
      togglePanelVisibility(panelVisibilityKey as any);
    }

    if (mobileTab) {
      window.dispatchEvent(new CustomEvent('fayda-switch-mobile-tab', { detail: { tab: mobileTab } }));
    }

    if (panelId === 'panel-trade-registry') {
      window.dispatchEvent(new CustomEvent('fayda-show-trade-registry'));
    }

    setTimeout(() => {
      const el = document.getElementById(panelId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.remove('facility-target-highlight');
        void el.offsetWidth;
        el.classList.add('facility-target-highlight');
        setTimeout(() => {
          el.classList.remove('facility-target-highlight');
        }, 2600);
      }
    }, 120);
  };

  // Global Keyboard Shortcuts: Ctrl+K / Cmd+K (Palette), F11 (Fullscreen), and F (Fullscreen)
  useEffect(() => {
    const handleOpenJournal = () => setIsJournalModalOpen(true);
    window.addEventListener('fayda:open-journal', handleOpenJournal);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Intercept F11 to trigger synchronized HTML5 Fullscreen in Chrome & Edge
      if (e.key === 'F11') {
        e.preventDefault();
        toggleBrowserFullscreen();
        return;
      }

      // 'f' or 'F' key toggle when not typing inside form fields
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isInput = target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        );
        if (!isInput) {
          e.preventDefault();
          toggleBrowserFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync fullscreen state across standard events, vendor events, and window geometry
  useEffect(() => {
    return subscribeToFullscreen((active) => {
      setIsFullscreen(active);
    });
  }, []);

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    toggleBrowserFullscreen();
  };



  // 12-hour vs 24-hour clock preference (default: 12-hour with AM/PM)
  const [is24Hour, setIs24Hour] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fayda_clock_24h') === 'true';
    } catch {
      return false;
    }
  });

  const toggleClockFormat = () => {
    setIs24Hour(prev => {
      const next = !prev;
      try {
        localStorage.setItem('fayda_clock_24h', String(next));
      } catch {}
      return next;
    });
  };

  // Live real-time clock with seconds strictly formatted in IST
  const [currentTime, setCurrentTime] = useState<string>(() => {
    return formatISTTime(null, { showSeconds: true, includeSuffix: true, hour12: !is24Hour });
  });

  // Market Hours: NSE/BSE Equity (09:15 - 15:40 IST) vs MCX Commodities (09:00 - 23:30 IST)
  const isMarketHours = () => {
    const { hours, minutes, dayOfWeek } = getISTComponents();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    const currentMin = hours * 60 + minutes;
    const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
    const isCommodity = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';

    if (isCommodity) {
      return currentMin >= (9 * 60) && currentMin < (23 * 60);
    }

    // NSE & BSE open at 09:00 AM (pre-open/open) and close at 03:40 PM IST
    return currentMin >= (9 * 60) && currentMin < (15 * 60 + 40);
  };

  const isLiveMarketOpen = isMarketHours();

  useEffect(() => {
    const update = () => {
      setCurrentTime(formatISTTime(null, { showSeconds: true, includeSuffix: true, hour12: !is24Hour }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [is24Hour]);

  const expiryDates = currentIndexState?.expiryDates || [];
  const selectedExpiry = currentIndexState?.selectedExpiry || '';
  const daysToExpiry = currentIndexState?.daysToExpiry ?? 4;
  
  const sanitizedCurrent = sanitizeSpotData(selectedIndex, currentIndexState);
  const selectedReceivedAt = indicesReceivedAt[selectedIndex] ?? 0;
  // For the change value: show it as long as we've received data at least once (even if slightly stale)
  const isStateFresh = selectedReceivedAt > 0 && (Date.now() - selectedReceivedAt) <= 300000;
  const isGhostDelta = typeof sanitizedCurrent.change === 'number' && Math.abs(sanitizedCurrent.change - 84.80) < 0.05;
  const netChange = (isStateFresh && !isGhostDelta) ? sanitizedCurrent.change : 0;
  const pctChange = (isStateFresh && !isGhostDelta) ? sanitizedCurrent.pctChange : 0;
  const isPositive = netChange >= 0;

  const activePcr = currentIndexState?.pcr?.atmPlusMinus5Pcr ?? 1.0;
  const isBullishSentiment = activePcr >= 1.05;
  const isBearishSentiment = activePcr <= 0.90;

  const isFyersActive = !!(fyersConfig && (fyersConfig.isConnected || fyersConfig.accessToken || fyersConfig.hasToken));

  return (
    <header className="sticky top-0 z-[120] bg-terminal-card/95 backdrop-blur-md border-b border-terminal-border px-2 sm:px-4 py-1 sm:py-1.5 select-none shadow-subtle flex flex-col space-y-1 w-full max-w-full">
      {/* ========================================================================= */}
      {/* ROW 1: PRIMARY TOP HEADER BAR */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-3 max-w-[1840px] w-full mx-auto min-w-0 py-0.5">

        {/* LEFT SECTION: BRAND + ASSET SELECTOR + CONTEXT METRICS + CLOSED/LIVE NSE + CONNECT BROKER */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 min-w-0">
          {/* Logo & Brand Name */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-accent-sky/15 flex items-center justify-center border border-accent-sky/30 shadow-subtle shrink-0">
              <img src="/favicon-32x32.png" className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain" alt="Fayda" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-xs tracking-tight text-terminal-text">FAYDA PRO</span>
              <span className="text-[9px] text-terminal-muted font-mono tracking-wider">MARKET OS</span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-terminal-border hidden sm:block shrink-0" />

          {/* Quick Stock / Index Selector Dropdown */}
          <StockSelectorDropdown />

          {/* Expiry Selector + Live Context Metrics (ATM, PCR, Days to Expiry) beside top header asset name */}
          {currentIndexState && (
            <div className="hidden md:flex items-center space-x-1.5 sm:space-x-2 font-mono text-xs shrink-0">
              <div className="h-4 w-[1px] bg-terminal-border shrink-0" />

              {/* Expiry Selector Dropdown */}
              {expiryDates.length > 0 && (
                <div className="flex items-center space-x-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-terminal-muted hidden sm:inline" />
                  <select
                    value={selectedExpiry}
                    onChange={(e) => setOptionExpiry(e.target.value)}
                    className="bg-terminal-panel border border-terminal-border rounded-lg px-2 py-0.5 text-xs font-mono font-semibold text-terminal-text focus:outline-none focus:border-accent-sky cursor-pointer transition shadow-xs"
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

              <div className="h-3 w-[1px] bg-terminal-border hidden lg:block" />

              <div className="hidden lg:flex items-center space-x-1">
                <span className="text-terminal-muted font-medium text-[11px]">ATM:</span>
                <span className="font-mono font-bold text-terminal-text">{currentIndexState.atmStrike}</span>
              </div>

              <div className="h-3 w-[1px] bg-terminal-border hidden sm:block" />

              <div className="hidden sm:flex items-center space-x-1">
                <span className="text-terminal-muted font-medium text-[11px]">PCR:</span>
                <span className={`font-mono font-bold ${isBullishSentiment ? 'text-bull' : isBearishSentiment ? 'text-bear' : 'text-amber'}`}>
                  {activePcr.toFixed(2)}
                </span>
              </div>

              <div className="h-3 w-[1px] bg-terminal-border hidden xl:block" />

              <div className="hidden xl:flex items-center space-x-1">
                <span className="text-terminal-muted font-medium text-[11px]">Expiry:</span>
                <span className="font-mono font-bold text-terminal-text">{daysToExpiry}d</span>
              </div>

              <div className="h-3 w-[1px] bg-terminal-border shrink-0" />
            </div>
          )}

          {/* Live / Closed Market & Data Feed Indicator — shows active broker + correct exchange */}
          {(() => {
            const symCfg = ALL_SYMBOLS_CONFIG.find(s => s.symbol === selectedIndex);
            const exchange = symCfg?.exchange === 'BSE' ? 'BSE' : symCfg?.exchange === 'MCX' || symCfg?.category === 'COMMODITIES' ? 'MCX' : 'NSE';
            const resolvedBroker = effectiveBroker && effectiveBroker !== 'SIMULATOR' ? effectiveBroker : activeBroker;
            const brokerLabel = resolvedBroker === 'FYERS' ? 'FYERS' : resolvedBroker === 'DHAN' ? 'DHAN' : 'PAPER';
            const feedLabel = resolvedBroker === 'FYERS' ? 'Fyers API v3' : resolvedBroker === 'DHAN' ? 'DhanHQ Live' : `${exchange} Official Feed (Simulator)`;
            const brokerColor = resolvedBroker === 'FYERS'
              ? 'text-sky-400 bg-sky-500/15 border-sky-500/40'
              : resolvedBroker === 'DHAN'
              ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40'
              : 'text-slate-400 bg-slate-500/15 border-slate-500/30';
            return (
              <div
                className="flex items-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-terminal-panel hover:bg-terminal-hover border border-terminal-border hover:border-accent-sky/50 text-[9px] sm:text-[10px] font-mono shrink-0 cursor-pointer transition shadow-xs"
                title={`Market is ${isConnected ? (isLiveMarketOpen ? 'LIVE (Open)' : 'CLOSED') : 'OFFLINE'} | Active Broker: ${brokerLabel} | Data Feed: ${feedLabel} | Exchange: ${exchange} • Click to view Official F&O Expiry & Market Holiday Calendar`}
                onClick={() => setIsHolidaysModalOpen(true)}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected && isLiveMarketOpen ? 'bg-bull animate-pulse' : isConnected ? 'bg-amber animate-pulse' : 'bg-bear'}`} />
                <span className="text-terminal-muted font-bold">
                  {isConnected ? (isLiveMarketOpen ? 'LIVE' : 'CLOSED') : 'OFFLINE'}
                </span>
                {/* Broker badge — updates when user switches broker */}
                <span className={`hidden md:inline text-[9px] px-1 py-0.2 rounded border font-black ${brokerColor}`}>
                  {brokerLabel}
                </span>
                {/* Exchange badge — updates when user switches index */}
                <span className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-terminal-elevated text-terminal-muted border border-terminal-border">
                  {exchange}
                </span>
              </div>
            );
          })()}

          {/* Connect Broker Button placed right beside CLOSED NSE (desktop/tablet) */}
          <button
            type="button"
            onClick={() => setIsFyersModalOpen(true)}
            className={`hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:py-1 rounded-lg border text-[10px] sm:text-[11px] font-mono font-bold transition cursor-pointer shrink-0 shadow-xs ${
              isFyersActive
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-400 hover:bg-sky-500/25'
                : dhanConfig?.isConnected
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-terminal-panel hover:bg-terminal-hover border-terminal-border text-terminal-muted hover:text-terminal-text'
            }`}
            title="Connect / Switch Broker (Fyers API v3 / DhanHQ Live / Paper Simulator)"
          >
            <Zap className="w-3 h-3 text-accent-cyan shrink-0" />
            <span>
              {isFyersActive ? 'Fyers Live' : dhanConfig?.isConnected ? 'Dhan Live' : 'Connect Broker'}
            </span>
          </button>

          {/* CAS Probable Closing Price Capsule Button (Row 1) */}
          {currentIndexState?.probableClosingPrice && (
            <button
              id="cas-est-close-btn-desktop"
              type="button"
              onClick={() => setIsCasModalOpen(true)}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full border text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer shrink-0 shadow-xs ${
                currentIndexState.probableClosingPrice.isActiveWindow
                  ? 'bg-gradient-to-r from-amber-500/25 via-purple-500/20 to-sky-500/20 border-amber-500/60 text-amber-300 hover:border-amber-400 hover:shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-terminal-panel hover:bg-terminal-hover border-terminal-border hover:border-amber-500/40 text-terminal-text'
              }`}
              title="3:10 PM+ Probable Official Index Closing Price (30-min VWAP Engine). Click to open CAS Analysis & 0DTE Pin Risk Radar."
            >
              <Target className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
              <span className="text-[10px] text-terminal-muted uppercase">CAS Est:</span>
              <span className="font-extrabold text-amber-400 tabular-nums">
                ₹{currentIndexState.probableClosingPrice.probableClose.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className={`text-[9px] px-1 py-0.1 rounded font-black tabular-nums ${
                currentIndexState.probableClosingPrice.driftPoints >= 0 ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
              }`}>
                {currentIndexState.probableClosingPrice.driftPoints >= 0 ? '+' : ''}{currentIndexState.probableClosingPrice.driftPoints.toFixed(1)}
              </span>
            </button>
          )}
        </div>

        {/* RIGHT SECTION: THEME, FULLSCREEN, MOBILE MENU & PROFILE */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
          {/* Master Mobile Menu Button (< md) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex md:hidden items-center gap-1 px-2 py-1 rounded-lg bg-accent-sky/15 hover:bg-accent-sky/25 border border-accent-sky/40 text-accent-sky text-[11px] font-mono font-bold transition cursor-pointer shadow-xs"
            title="Open Mobile Navigation Menu & Tools"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-3.5 h-3.5 shrink-0" />
            <span className="font-extrabold">Menu</span>
          </button>

          {/* Light / Dark Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer shrink-0 shadow-xs"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-accent-sky" /> : <Sun className="w-3.5 h-3.5 text-amber" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`hidden sm:inline-flex p-1.5 rounded-lg border transition cursor-pointer shrink-0 shadow-xs ${
              isFullscreen
                ? 'bg-accent-sky/20 border-accent-sky/50 text-accent-sky shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                : 'bg-terminal-panel hover:bg-terminal-border border-terminal-border text-terminal-muted hover:text-terminal-text'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (F11 / Esc / F)' : 'Enter Fullscreen (F11 / F)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Dedicated User Account Section & Profile (Super Admin Control Centre inside) */}
          <UserProfileDropdown
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenSubscribeModal={(plan) => {
              if (plan) setSubscribeDefaultPlan(plan);
              setIsSubscribeModalOpen(true);
            }}
            onOpenProfileEdit={(tab) => {
              setProfileEditTab(tab || 'PROFILE');
              setIsProfileEditOpen(true);
            }}
            onOpenAdminDrawer={() => setIsAdminDrawerOpen(true)}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: EXPLORE, PERSONA, WATCHLIST, TOOLS + BECOME A MEMBER, SEARCH, EXPERT MODE */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ROW 2 - DESKTOP VIEW: EXPLORE, PERSONA, WATCHLIST, TOOLS + MEMBER, SEARCH, EXPERT */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between gap-1.5 sm:gap-2 pt-1 border-t border-terminal-border/60 max-w-[1840px] w-full mx-auto text-xs min-w-0">

        {/* LEFT: EXPLORE MEGA MENU, PERSONA FOCUS, WATCHLIST, JOURNAL, RISK CALC, PAYOFF */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 py-0.5">
          {/* Explore Mega Menu Dropdown */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsExploreOpen((prev) => !prev)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 border shadow-xs ${
                isExploreOpen
                  ? 'bg-accent-sky/20 border-accent-sky text-accent-sky shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                  : 'bg-terminal-panel hover:bg-terminal-hover border-terminal-border text-terminal-text hover:text-accent-sky'
              }`}
              title="Explore all 24+ market facilities, trading radars & analytics tools"
            >
              <Sparkles className="w-3 h-3 text-accent-sky animate-pulse shrink-0" />
              <span>Explore</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExploreOpen ? 'rotate-180 text-accent-sky' : ''}`} />
            </button>

            <ExploreMegaMenu
              isOpen={isExploreOpen}
              onClose={() => setIsExploreOpen(false)}
              onOpenJournal={() => setIsJournalModalOpen(true)}
              onOpenRiskCalc={() => setIsRiskModalOpen(true)}
              onOpenPayoffSimulator={() => setIsPayoffModalOpen(true)}
              onOpenFyers={() => setIsFyersModalOpen(true)}
              onOpenSound={() => setIsSoundModalOpen(true)}
              onOpenSubscription={(plan) => {
                if (plan) setSubscribeDefaultPlan(plan);
                setIsSubscribeModalOpen(true);
              }}
              onOpenProfile={(tab) => {
                setProfileEditTab(tab || 'PROFILE');
                setIsProfileEditOpen(true);
              }}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onOpenLegal={(doc) => {
                if (doc) setActiveLegalDoc(doc);
                setIsLegalModalOpen(true);
              }}
              onOpenAdmin={() => setIsAdminDrawerOpen(true)}
              onOpenChart={(sym) => openChartModal(sym)}
              onOpenOptionsTable={(sym) => openOptionsDataModal(sym)}
              onOpenMcx={(sym) => {
                setMcxModalSymbol(sym || 'CRUDEOIL');
                setIsMcxModalOpen(true);
              }}
              onOpenHolidays={() => setIsHolidaysModalOpen(true)}
              onNavigateToPanel={handleNavigateToPanel}
            />
          </div>

          {/* Persona Focus Quick-Switch Pill */}
          <button
            type="button"
            onClick={() => setIsPersonaModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-indigo-500/15 hover:from-sky-500/25 hover:to-indigo-500/25 border border-sky-500/40 text-[11px] font-mono font-bold text-sky-400 hover:text-sky-300 transition shadow-xs cursor-pointer shrink-0"
            title="Choose Trading Focus: Option Buyer/Seller, Derivatives, Equities, Commodities, All"
          >
            <span>{personaMetadata.icon}</span>
            <span className="font-extrabold">{personaMetadata.shortTitle}</span>
            <ChevronDown className="w-3 h-3 text-sky-400/70" />
          </button>

          {/* Multi-Asset Watchlist Manager Button */}
          <button
            type="button"
            onClick={() => setIsWatchlistDrawerOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-500 hover:text-amber-400 transition cursor-pointer shrink-0 shadow-xs"
            title="Open Multi-Asset Watchlist (Stocks, Option Strikes, MCX Commodities)"
          >
            <Layers className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Watchlist</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-400 font-extrabold">
              {activeWatchlist.items.length}
            </span>
          </button>

          <div className="h-4 w-[1px] bg-terminal-border/80 hidden sm:block shrink-0 mx-0.5" />

          {/* Trade Journal Quick Link */}
          <button
            type="button"
            onClick={() => setIsJournalModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-muted hover:text-terminal-text text-[11px] font-medium transition cursor-pointer shrink-0 shadow-xs"
            title="Post-Market Trade Journal & Strategy Audit"
          >
            <FileText className="w-3 h-3 text-purple-400 shrink-0" />
            <span>Journal</span>
          </button>

          {/* Risk Calculator Quick Link */}
          <button
            type="button"
            onClick={() => setIsRiskModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-muted hover:text-terminal-text text-[11px] font-medium transition cursor-pointer shrink-0 shadow-xs"
            title="Risk & Position Size Calculator"
          >
            <Calculator className="w-3 h-3 text-accent-sky shrink-0" />
            <span className="hidden sm:inline">Risk Calc</span>
            <span className="sm:hidden">Risk</span>
          </button>

          {/* Trade Payoff Simulator Quick Link */}
          <button
            type="button"
            onClick={() => setIsPayoffModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-muted hover:text-terminal-text text-[11px] font-medium transition cursor-pointer shrink-0 shadow-xs"
            title="Options Trade Payoff & P&L Simulator"
          >
            <Sliders className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Payoff</span>
          </button>
        </div>

        {/* RIGHT: BECOME A MEMBER, SEARCH, EXPERT MODE BUTTON */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 py-0.5 ml-auto">
          {/* Become a Member Dropdown */}
          <TopSubscribeDropdown />

          {/* Command Palette Quick Search (Ctrl+K) */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-muted hover:text-terminal-text text-[11px] font-mono transition cursor-pointer shrink-0 shadow-xs"
            title="Command Palette & Quick Search (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-accent-sky shrink-0" />
            <span className="hidden sm:inline text-terminal-text font-bold">Search</span>
            <kbd className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-terminal-card border border-terminal-border text-terminal-muted">⌘K</kbd>
          </button>

          {/* Mode & Workspace Settings Dropdown (Expert mode) */}
          <div className="inline-block">
            <WorkspaceSettingsDropdown
              mode={mode}
              setMode={setMode}
              density={density}
              setDensity={setDensity}
              isMuted={isMuted}
              toggleMute={toggleMute}
              isSuperAdmin={isSuperAdmin}
              onOpenAdminDrawer={() => setIsAdminDrawerOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2 - MOBILE VIEW: DEDICATED EXPIRY, METRICS & STANDARD DROPDOWN MENUS  */}
      {/* ========================================================================= */}
      <div className="flex md:hidden items-center justify-between gap-1.5 pt-1 border-t border-terminal-border/60 w-full text-xs min-w-0">
        {/* Left: Expiry Selector + Key Context Metrics */}
        <div className="flex items-center space-x-1.5 min-w-0 shrink-0">
          {currentIndexState && expiryDates.length > 0 && (
            <div className="flex items-center space-x-1 font-mono">
              <Calendar className="w-3 h-3 text-accent-cyan shrink-0" />
              <select
                value={selectedExpiry}
                onChange={(e) => setOptionExpiry(e.target.value)}
                className="bg-terminal-panel border border-terminal-border rounded-lg px-1.5 py-0.5 text-[10.5px] font-mono font-bold text-terminal-text focus:outline-none focus:border-accent-sky cursor-pointer transition shadow-xs max-w-[130px]"
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

          {currentIndexState && (
            <div className="flex items-center space-x-1 font-mono text-[10px]">
              <span className={`px-1.5 py-0.2 rounded font-bold ${isBullishSentiment ? 'bg-bull/15 text-bull' : isBearishSentiment ? 'bg-bear/15 text-bear' : 'bg-amber/15 text-amber'}`}>
                PCR {activePcr.toFixed(2)}
              </span>
              <span className="text-terminal-muted font-bold">
                {daysToExpiry}d
              </span>
            </div>
          )}
        </div>

        {/* Right: Standard Mobile Dropdown Menus */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* Mobile Tools Dropdown */}
          <MobileToolsDropdown
            onOpenExplore={() => setIsExploreOpen(true)}
            onOpenPersona={() => setIsPersonaModalOpen(true)}
            onOpenWatchlist={() => setIsWatchlistDrawerOpen(true)}
            onOpenJournal={() => setIsJournalModalOpen(true)}
            onOpenRiskCalc={() => setIsRiskModalOpen(true)}
            onOpenPayoff={() => setIsPayoffModalOpen(true)}
            onOpenHolidays={() => setIsHolidaysModalOpen(true)}
            activeWatchlistCount={activeWatchlist.items.length}
            currentPersonaTitle={personaMetadata.shortTitle}
            currentPersonaIcon={personaMetadata.icon}
          />

          {/* Mobile Pro Dropdown */}
          <MobileProDropdown
            onOpenSubscription={(plan) => {
              if (plan) setSubscribeDefaultPlan(plan);
              setIsSubscribeModalOpen(true);
            }}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenSound={() => setIsSoundModalOpen(true)}
            mode={mode}
            setMode={setMode}
            isMuted={isMuted}
            toggleMute={toggleMute}
            userTier={user?.plan || 'PRO'}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 3: ALL SELECTED ASSETS TICKER STRIP + REAL-TIME IST CLOCK */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1 border-t border-terminal-border/50 max-w-[1840px] w-full mx-auto text-xs min-w-0">
        {/* Left Container: Multi-Index Mini Ticker Strip */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5 touch-pan-x">
            {visibleIndices.map((sym: string) => {
              const isSelected = selectedIndex === sym;
              const rawState = sym === selectedIndex ? currentIndexState : indices[sym];
              const sanitized = sanitizeSpotData(sym, rawState);

              const receivedAt = sym === selectedIndex
                ? (indicesReceivedAt[selectedIndex] ?? 0)
                : (indicesReceivedAt[sym] ?? 0);
              const isFresh = receivedAt > 0 && (Date.now() - receivedAt) <= 300000;

              const isGhost = typeof sanitized.change === 'number' && Math.abs(sanitized.change - 84.80) < 0.05;
              const pts = (isFresh && !isGhost) ? sanitized.change : null;
              const pct = (isFresh && !isGhost) ? sanitized.pctChange : null;
              const isPos = (pts ?? 0) >= 0;

              return (
                <div
                  key={sym}
                  onClick={() => {
                    if (sym !== selectedIndex) {
                      setSelectedIndex(sym as any);
                    }
                  }}
                  className={`group flex-shrink-0 px-2 py-0.5 rounded-lg border transition cursor-pointer select-none font-sans flex items-center space-x-1.5 sm:space-x-2 ${
                    isSelected
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

        {/* Right Container: Live IST Clock */}
        <div className="flex items-center space-x-1.5 font-sans ml-auto shrink-0">
          <button
            type="button"
            onClick={toggleClockFormat}
            className="flex items-center space-x-1 font-mono text-terminal-muted hover:text-accent-sky text-[11px] cursor-pointer transition select-none bg-terminal-panel/80 hover:bg-terminal-panel border border-terminal-border px-2 py-0.5 sm:py-1 rounded-lg shrink-0 shadow-xs"
            title="Indian Standard Time (IST - Asia/Kolkata). Click to toggle 12h (AM/PM) / 24h format."
          >
            <Clock className="w-3 h-3 text-accent-sky shrink-0" />
            <span className="font-semibold">{currentTime}</span>
          </button>
        </div>
      </div>

      {/* Modals & Drawers */}
      <UnifiedBrokerModal isOpen={isFyersModalOpen} onClose={() => setIsFyersModalOpen(false)} />
      <RiskCalculatorModal isOpen={isRiskModalOpen} onClose={() => setIsRiskModalOpen(false)} defaultLtp={100} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <LegalDocumentModal isOpen={isLegalModalOpen} onClose={() => setIsLegalModalOpen(false)} initialDoc={activeLegalDoc} />
      <SuperAdminControlDrawer isOpen={isAdminDrawerOpen} onClose={() => setIsAdminDrawerOpen(false)} />
      <CommandPaletteModal isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />

      {/* User Profile Edit Modal */}
      <UserProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
        initialTab={profileEditTab}
        onOpenSubscribeModal={(plan) => {
          if (plan) setSubscribeDefaultPlan(plan);
          setIsSubscribeModalOpen(true);
        }}
      />

      {/* Fast Subscription & Upgrade Modal */}
      <FastSubscriptionModal
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        defaultPlan={subscribeDefaultPlan}
      />

      {/* Trade Journal & Performance Audit Modal */}
      {isJournalModalOpen && (
        <PostMarketTradeJournal isModal={true} onClose={() => setIsJournalModalOpen(false)} />
      )}

      {/* Standalone Trade Payoff Simulator Modal */}
      <TradePayoffSimulatorModal
        isOpen={isPayoffModalOpen}
        onClose={() => setIsPayoffModalOpen(false)}
      />

      {/* Audio & Sound Alerts Settings Modal */}
      <SoundSettingsModal
        isOpen={isSoundModalOpen}
        onClose={() => setIsSoundModalOpen(false)}
      />

      {/* MCX Commodities Modal */}
      {isMcxModalOpen && (
        <McxOfflineModal
          symbol={mcxModalSymbol}
          onClose={() => setIsMcxModalOpen(false)}
          onProceedAnyway={() => {
            setSelectedIndex(mcxModalSymbol as any);
            setIsMcxModalOpen(false);
          }}
        />
      )}

      {/* Official F&O Expiry & Market Holidays Calendar Modal */}
      <MarketHolidaysModal
        isOpen={isHolidaysModalOpen}
        onClose={() => setIsHolidaysModalOpen(false)}
      />

      {/* Standard Full Mobile Navigation Menu Drawer / Dropdown */}
      <MobileNavMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenExplore={() => setIsExploreOpen(true)}
        onOpenPersona={() => setIsPersonaModalOpen(true)}
        onOpenWatchlist={() => setIsWatchlistDrawerOpen(true)}
        onOpenJournal={() => setIsJournalModalOpen(true)}
        onOpenRiskCalc={() => setIsRiskModalOpen(true)}
        onOpenPayoff={() => setIsPayoffModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSubscription={(plan) => {
          if (plan) setSubscribeDefaultPlan(plan);
          setIsSubscribeModalOpen(true);
        }}
        onOpenBroker={() => setIsFyersModalOpen(true)}
        onOpenHolidays={() => setIsHolidaysModalOpen(true)}
        onOpenSound={() => setIsSoundModalOpen(true)}
        onOpenProfile={(tab) => {
          setProfileEditTab(tab || 'PROFILE');
          setIsProfileEditOpen(true);
        }}
        onOpenAdmin={() => setIsAdminDrawerOpen(true)}
        mode={mode}
        setMode={setMode}
        density={density}
        setDensity={setDensity}
        isMuted={isMuted}
        toggleMute={toggleMute}
        theme={theme}
        toggleTheme={toggleTheme}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        isSuperAdmin={isSuperAdmin}
        activeWatchlistCount={activeWatchlist.items.length}
        currentPersonaTitle={personaMetadata.shortTitle}
        currentPersonaIcon={personaMetadata.icon}
        isBrokerConnected={isFyersActive || !!dhanConfig?.isConnected}
        brokerName={isFyersActive ? 'Fyers' : dhanConfig?.isConnected ? 'Dhan' : 'Paper'}
        isLiveMarketOpen={isLiveMarketOpen}
        userEmail={user?.email}
        userTier={user?.plan || 'PRO'}
      />

      {/* CAS Probable Closing Price & 3:10 PM Settlement Radar Modal */}
      <CasProbableCloseModal
        isOpen={isCasModalOpen}
        onClose={() => setIsCasModalOpen(false)}
      />
    </header>
  );
};
