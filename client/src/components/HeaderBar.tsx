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
import { ToolsDropdown } from './header/ToolsDropdown';
import { WorkspaceSettingsDropdown } from './header/WorkspaceSettingsDropdown';

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
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileEditTab, setProfileEditTab] = useState<'PROFILE' | 'PASSWORD' | 'MEMBERSHIP'>('PROFILE');
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [subscribeDefaultPlan, setSubscribeDefaultPlan] = useState<'FREE' | 'SILVER' | 'GOLD' | 'DIAMOND'>('GOLD');
  const [isFullscreen, setIsFullscreen] = useState(() => isBrowserFullscreen());

  // Global Keyboard Shortcuts: Ctrl+K / Cmd+K (Palette), F11 (Fullscreen), and F (Fullscreen)
  useEffect(() => {
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
                className="flex items-center space-x-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-terminal-panel border border-terminal-border text-[10px] font-mono shrink-0 cursor-pointer"
                title={`Market is ${isConnected ? (isLiveMarketOpen ? 'LIVE (Open)' : 'CLOSED') : 'OFFLINE'} | Active Broker: ${brokerLabel} | Data Feed: ${feedLabel} | Exchange: ${exchange}`}
                onClick={() => setIsFyersModalOpen(true)}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected && isLiveMarketOpen ? 'bg-bull animate-pulse' : isConnected ? 'bg-amber animate-pulse' : 'bg-bear'}`} />
                <span className="text-terminal-muted font-bold">
                  {isConnected ? (isLiveMarketOpen ? 'LIVE' : 'CLOSED') : 'OFFLINE'}
                </span>
                {/* Broker badge — updates when user switches broker */}
                <span className={`hidden sm:inline text-[9px] px-1 py-0.2 rounded border font-black ${brokerColor}`}>
                  {brokerLabel}
                </span>
                {/* Exchange badge — updates when user switches index */}
                <span className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-terminal-elevated text-terminal-muted border border-terminal-border">
                  {exchange}
                </span>
              </div>
            );
          })()}
        </div>

        {/* CENTER SECTION: PROMINENT TOP-MIDDLE SUBSCRIBER MANAGEMENT & DROPDOWN */}
        <div className="flex items-center justify-center shrink-0 z-30">
          <TopSubscribeDropdown />
        </div>

        {/* RIGHT SECTION: STREAMLINED & GROUPED ACTIONS & TOOLS */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">

          {/* 1. Unified Broker Connect Button */}
          <button
            type="button"
            onClick={() => setIsFyersModalOpen(true)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-xl border text-xs font-sans font-bold transition cursor-pointer shrink-0 shadow-sm ${
              effectiveBroker === 'DHAN'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : effectiveBroker === 'FYERS'
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400'
                : dhanConfig.isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-terminal-panel hover:bg-terminal-hover border-terminal-border text-terminal-muted hover:text-terminal-text'
              }`}
            title={
              effectiveBroker === 'DHAN'
                ? 'DhanHQ API Connected (25 req/s Live)'
                : effectiveBroker === 'FYERS'
                ? 'Fyers API v3 Connected'
                : dhanConfig.isConnected
                ? 'DhanHQ Connected (Trading Execution Ready • Live Data via NSE Feed)'
                : 'Connect Broker (Dhan / Fyers / Angel / Zerodha)'
            }
          >
            <KeyRound className={`w-3.5 h-3.5 ${
              effectiveBroker === 'DHAN'
                ? 'text-emerald-500 animate-pulse'
                : effectiveBroker === 'FYERS'
                ? 'text-sky-500 animate-pulse'
                : dhanConfig.isConnected
                ? 'text-emerald-500'
                : 'text-accent-sky'
            }`} />
            <span className="hidden sm:inline">
              {effectiveBroker === 'DHAN'
                ? 'Dhan Live'
                : effectiveBroker === 'FYERS'
                ? 'Fyers Live'
                : dhanConfig.isConnected
                ? (dhanConfig.hasDataApi === false ? 'Dhan (Trade)' : 'Dhan Live')
                : 'Connect'}
            </span>
          </button>

          {/* 2. Grouped Trading Tools Dropdown (Trade Journal, Risk Calc, Command Palette, SEBI Legal) */}
          <ToolsDropdown
            onOpenJournal={() => setIsJournalModalOpen(true)}
            onOpenRiskCalc={() => setIsRiskModalOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenLegal={() => {
              setActiveLegalDoc('RISK_DISCLOSURE');
              setIsLegalModalOpen(true);
            }}
          />

          {/* 3. Grouped Mode & Workspace Settings Dropdown (Beginner/Interm/Expert, Density, Audio, SuperAdmin) */}
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

          {/* 4. Light / Dark Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-xl bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer shrink-0 shadow-sm"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-accent-sky" /> : <Sun className="w-3.5 h-3.5 text-amber" />}
          </button>

          {/* 5. Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-xl border transition cursor-pointer shrink-0 shadow-sm ${
              isFullscreen
                ? 'bg-accent-sky/20 border-accent-sky/50 text-accent-sky shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                : 'bg-terminal-panel hover:bg-terminal-border border-terminal-border text-terminal-muted hover:text-terminal-text'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (F11 / Esc / F)' : 'Enter Fullscreen (F11 / F)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* 6. Dedicated User Account Section & Profile / Password / Logout Dropdown */}
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
    </header>
  );
};
