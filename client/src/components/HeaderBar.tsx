import React, { useState, useEffect, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode, type TerminalMode } from '../context/TerminalModeContext';
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
  ShieldAlert
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FyersModal } from './FyersModal';
import { StockSelectorDropdown } from './StockSelectorDropdown';
import { RiskCalculatorModal } from './RiskCalculatorModal';

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
  const [isFyersModalOpen, setIsFyersModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

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

  const getPcrBadgeColor = (pcr: number) => {
    if (pcr >= 1.1) return 'bg-bull-subtle text-bull border-bull/30';
    if (pcr <= 0.88) return 'bg-bear-subtle text-bear border-bear/30';
    return 'bg-amber-subtle text-amber border-amber/30';
  };

  const expiryDates = currentIndexState?.expiryDates || [];
  const selectedExpiry = currentIndexState?.selectedExpiry || 'Current Expiry';
  const daysToExpiry = currentIndexState?.daysToExpiry ?? 0;

  // Active Index Sentiment
  const activePcr = currentIndexState?.pcr.atmPlusMinus5Pcr ?? 1.0;
  const isBullishSentiment = activePcr >= 1.10;
  const isBearishSentiment = activePcr <= 0.88;

  return (
    <header className="border-b border-terminal-border bg-terminal-panel sticky top-0 z-40 px-2 sm:px-4 py-1.5 sm:py-2 shadow-md">
      {/* 1st Row: Master Control Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 sm:gap-2 min-w-0">
        
        {/* ========================================================================= */}
        {/* MOBILE VIEW (< md): 2-LINE CLEAN TITLEBAR                                 */}
        {/* ========================================================================= */}
        <div className="flex md:hidden flex-col gap-1.5 w-full">
          {/* MOBILE LINE 1: Brand Logo (Left) + Clock & Fullscreen & Settings (Right) */}
          <div className="flex items-center justify-between w-full">
            {/* Logo */}
            <div className="flex items-center shrink-0">
              <img
                src="/fayda-logo.png"
                alt="Fayda Logo"
                className="h-8.5 xs:h-9.5 w-auto max-w-[125px] xs:max-w-[145px] object-contain drop-shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-transform duration-200 hover:scale-105"
              />
            </div>

            {/* Mobile Top-Right Controls: Clock (Left of Fullscreen) + Fullscreen Button + Settings */}
            <div className="flex items-center space-x-1.5 shrink-0">
              {/* Digital Market Clock */}
              <div className="flex items-center space-x-1 px-1.5 xs:px-2 py-0.5 xs:py-1 bg-gradient-to-r from-terminal-card via-terminal-bg to-terminal-card border-2 border-accent-cyan/60 rounded-xl shadow-[0_0_12px_rgba(0,229,255,0.2)] font-mono shrink-0">
                <Clock className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-accent-cyan animate-pulse shrink-0" />
                <span className="text-[11px] xs:text-xs font-black text-terminal-text tracking-wider tabular-nums font-mono drop-shadow-[0_0_6px_rgba(0,229,255,0.4)]">
                  {currentTime}
                </span>
                <span className="text-[7px] xs:text-[8px] text-accent-cyan font-extrabold uppercase">
                  IST
                </span>
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1 xs:p-1.5 rounded-xl border bg-terminal-card border-terminal-border hover:border-accent-cyan/60 text-terminal-muted hover:text-accent-cyan transition shadow-sm flex items-center justify-center shrink-0"
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen Mode"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-accent-cyan" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-terminal-muted hover:text-accent-cyan" />
                )}
              </button>

              {/* More Controls (•••) */}
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`p-1 xs:p-1.5 rounded-xl border transition shadow-sm flex items-center justify-center shrink-0 ${
                  isMoreMenuOpen 
                    ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan' 
                    : 'bg-terminal-card border-terminal-border hover:border-accent-cyan/60 text-terminal-muted hover:text-terminal-text'
                }`}
                title="More Institutional Controls & Settings"
              >
                <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* MOBILE LINE 2: Controls Row (Asset Selector & Expiry) */}
          <div className="flex items-center justify-between w-full pt-1 border-t border-terminal-border/30">
            {/* Left: Asset Dropdown */}
            <div className="flex items-center space-x-1 shrink-0">
              <StockSelectorDropdown />
            </div>

            {/* Right: Expiry Selector */}
            <div className="flex items-center space-x-1 shrink-0">
              <div className="flex items-center bg-terminal-card border border-terminal-border rounded-lg px-1.5 py-0.5 space-x-1 text-xs font-mono shrink-0">
                <Calendar className="w-3 h-3 text-amber shrink-0" />
                <span className="text-[9px] text-terminal-muted font-bold uppercase">Expiry:</span>
                {expiryDates.length > 0 ? (
                  <select
                    value={selectedExpiry}
                    onChange={(e) => setOptionExpiry(e.target.value)}
                    className="bg-transparent text-terminal-text font-bold focus:outline-none cursor-pointer text-[10px] max-w-[85px]"
                  >
                    {expiryDates.map((exp: string) => (
                      <option key={exp} value={exp} className="bg-terminal-card text-terminal-text">
                        {exp}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold text-terminal-text text-[10px]">{selectedExpiry}</span>
                )}
                <span className="text-[8px] px-1 py-0.2 rounded bg-amber/10 border border-amber/30 text-amber font-bold">
                  {daysToExpiry === 0 ? '0D' : `${daysToExpiry}D`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP VIEW (>= md): COMPLETE INSTITUTIONAL 1-ROW MASTER BAR             */}
        {/* ========================================================================= */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* DESKTOP LEFT SIDE: Brand Logo, Asset Selector, Expiry Selector, Sentiment */}
          <div className="flex items-center space-x-2 shrink-0 min-w-0">
            <div className="flex items-center shrink-0">
              <img
                src="/fayda-logo.png"
                alt="Fayda Logo"
                className="h-8.5 w-auto max-w-[125px] object-contain drop-shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-transform duration-200 hover:scale-105"
              />
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              {/* ONE-LINER SELECT ASSET DROPDOWN */}
              <StockSelectorDropdown />

              {/* Option Expiry Selector (Beside Select Asset) */}
              <div className="flex items-center bg-terminal-card border border-terminal-border rounded-xl px-2.5 py-1 space-x-1.5 text-xs font-mono shrink-0 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-amber shrink-0" />
                <span className="text-[11px] text-terminal-muted font-bold uppercase tracking-wider">Expiry:</span>
                {expiryDates.length > 0 ? (
                  <select
                    value={selectedExpiry}
                    onChange={(e) => setOptionExpiry(e.target.value)}
                    className="bg-transparent text-terminal-text font-bold focus:outline-none cursor-pointer text-xs"
                  >
                    {expiryDates.map((exp: string) => (
                      <option key={exp} value={exp} className="bg-terminal-card text-terminal-text">
                        {exp}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold text-terminal-text text-xs">{selectedExpiry}</span>
                )}
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber/10 border border-amber/30 text-amber font-bold">
                  {daysToExpiry === 0 ? '0D' : `${daysToExpiry}D`}
                </span>
              </div>

              {/* LIVE MARKET SENTIMENT BADGE (Visible on screens >= 1200px) */}
              <div
                className={`hidden xl:inline-flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-lg border transition shadow-sm shrink-0 ${
                  isBullishSentiment
                    ? 'bg-bull/20 border-bull text-bull shadow-[0_0_12px_rgba(0,245,155,0.35)] animate-pulse'
                    : isBearishSentiment
                    ? 'bg-bear/20 border-bear text-bear shadow-[0_0_12px_rgba(255,59,105,0.35)] animate-pulse'
                    : 'bg-amber/15 border-amber/50 text-amber'
                }`}
                title={`Live OI Market Sentiment for ${selectedIndex}: PCR ${activePcr.toFixed(2)}`}
              >
                {isBullishSentiment ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-bull shrink-0" />
                    <span>BULLISH ({activePcr.toFixed(2)})</span>
                  </>
                ) : isBearishSentiment ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 text-bear shrink-0" />
                    <span>BEARISH ({activePcr.toFixed(2)})</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 text-amber shrink-0" />
                    <span>NEUTRAL ({activePcr.toFixed(2)})</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* DESKTOP RIGHT SIDE: Trader Mode, Risk Calc, Audio, Theme, Fullscreen, Clock, Settings */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* 3-MODE TRADER LEVEL TOGGLE (BEGINNER / INTERMEDIATE / EXPERT) */}
            <div className="hidden lg:flex items-center bg-terminal-card border border-terminal-border rounded-xl p-0.5 font-mono text-[10px] font-bold shadow-sm">
              <button
                type="button"
                onClick={() => setMode('BEGINNER')}
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  mode === 'BEGINNER'
                    ? 'bg-bull/20 border border-bull/40 text-bull shadow-sm'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title="Beginner Mode: Plain-English bias, capital preservation guardrails, simplified risk"
              >
                <span>🟢</span>
                <span>BEGINNER</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('INTERMEDIATE')}
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  mode === 'INTERMEDIATE'
                    ? 'bg-amber/20 border border-amber/40 text-amber shadow-sm'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title="Intermediate Mode: Master 7-strategy confluence scoring, strike selection, and R:R ratios"
              >
                <span>🟡</span>
                <span>INTERMEDIATE</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('EXPERT')}
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  mode === 'EXPERT'
                    ? 'bg-purple-500/20 border border-purple-500/40 text-purple-400 shadow-sm'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
                title="Expert Mode: Live Greeks (Delta, Gamma, Theta, Vega), 1-min OI Delta squeeze, and structural BOS"
              >
                <span>🟣</span>
                <span>EXPERT</span>
              </button>
            </div>

            {/* SEBI Position Sizing & Risk Calculator Button */}
            <button
              type="button"
              onClick={() => setIsRiskModalOpen(true)}
              className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-accent-cyan/15 border border-accent-cyan/40 hover:bg-accent-cyan/25 text-accent-cyan transition shadow-sm font-mono text-[10px] font-bold shrink-0 cursor-pointer"
              title="SEBI Position Sizing & Account Risk Calculator"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">RISK CALC</span>
            </button>

            {/* Audio Chime Toggle */}
            <div className="flex items-center bg-terminal-card border border-terminal-border rounded-lg p-0.5 text-xs shrink-0">
              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
                className={`p-1.5 rounded transition ${
                  isMuted ? 'text-terminal-muted hover:text-terminal-text' : 'bg-bull/20 text-bull'
                }`}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Light / Dark Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-terminal-card border border-terminal-border hover:border-accent-cyan transition shadow-sm font-mono text-[10px] font-bold text-terminal-text shrink-0"
              title={theme === 'dark' ? 'Current: Dark Mode (Click for Light Theme ☀️)' : 'Current: Light Mode (Click for Dark Theme 🌙)'}
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-accent-cyan" />
                  <span className="text-terminal-text">DARK</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber" />
                  <span className="text-terminal-text">LIGHT</span>
                </>
              )}
            </button>

            {/* 1-Tap Native Fullscreen Mode Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl border bg-terminal-card border-terminal-border hover:border-accent-cyan/60 text-terminal-muted hover:text-accent-cyan transition shadow-sm flex items-center justify-center shrink-0"
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen Mode (All Mobile & Desktop Devices)"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-accent-cyan" />
              ) : (
                <Maximize2 className="w-4 h-4 text-terminal-muted hover:text-accent-cyan" />
              )}
            </button>

            {/* PROMINENT DIGITAL MARKET CLOCK */}
            <div className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-r from-terminal-card via-terminal-bg to-terminal-card border-2 border-accent-cyan/60 rounded-xl shadow-[0_0_12px_rgba(0,229,255,0.2)] font-mono shrink-0">
              <Clock className="w-3.5 h-3.5 text-accent-cyan animate-pulse shrink-0" />
              <span className="text-xs md:text-sm font-black text-terminal-text tracking-wider tabular-nums font-mono drop-shadow-[0_0_6px_rgba(0,229,255,0.4)]">
                {currentTime}
              </span>
              <span className="text-[8px] text-accent-cyan font-extrabold uppercase">
                IST
              </span>
            </div>

            {/* RESPONSIVE INSTITUTIONAL MORE (•••) DROPDOWN MENU BUTTON */}
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`p-1.5 rounded-xl border transition shadow-sm flex items-center justify-center shrink-0 ${
                isMoreMenuOpen 
                  ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan' 
                  : 'bg-terminal-card border-terminal-border hover:border-accent-cyan/60 text-terminal-muted hover:text-terminal-text'
              }`}
              title="More Institutional Controls & Settings"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* POPOVER CONTROLS PANEL (Accessible on both mobile and desktop) */}
      {isMoreMenuOpen && (
        <div 
          ref={moreMenuRef} 
          className="absolute right-2 sm:right-4 top-full mt-2 w-[290px] sm:w-[330px] bg-terminal-card border-2 border-accent-cyan/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] z-50 p-3 space-y-2.5 text-xs animate-in fade-in zoom-in-95 duration-150 font-mono"
        >
          <div className="flex items-center justify-between pb-2 border-b border-terminal-border">
            <span className="font-bold text-terminal-text flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-accent-cyan" />
              <span>TERMINAL CONTROLS</span>
            </span>
            <button onClick={() => setIsMoreMenuOpen(false)} className="text-terminal-muted hover:text-terminal-text">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Trader Level 3-Mode Selector in Popover */}
          <div className="p-2.5 rounded-xl bg-terminal-panel border border-terminal-border space-y-1.5">
            <span className="font-bold text-terminal-text block text-[11px]">Trader Experience Mode</span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setMode('BEGINNER')}
                className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                  mode === 'BEGINNER'
                    ? 'bg-bull/20 border-bull text-bull shadow-sm'
                    : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
                }`}
              >
                🟢 Beginner
              </button>
              <button
                onClick={() => setMode('INTERMEDIATE')}
                className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                  mode === 'INTERMEDIATE'
                    ? 'bg-amber/20 border-amber text-amber shadow-sm'
                    : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
                }`}
              >
                🟡 Interm.
              </button>
              <button
                onClick={() => setMode('EXPERT')}
                className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${
                  mode === 'EXPERT'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-sm'
                    : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
                }`}
              >
                🟣 Expert
              </button>
            </div>
          </div>

          {/* Risk Calculator Trigger in Popover */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel border border-terminal-border">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-accent-cyan" />
              <div>
                <span className="font-bold text-terminal-text block text-[11px]">Position Sizing</span>
                <span className="text-[10px] text-terminal-muted">SEBI Risk & Capital Guard</span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsMoreMenuOpen(false);
                setIsRiskModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/30 text-[10px] font-bold transition cursor-pointer"
            >
              Open Calc
            </button>
          </div>

          {/* Fullscreen Mode Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel border border-terminal-border">
            <div className="flex items-center space-x-2">
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-accent-cyan" /> : <Maximize2 className="w-4 h-4 text-accent-cyan" />}
              <div>
                <span className="font-bold text-terminal-text block text-[11px]">Full Screen Mode</span>
                <span className="text-[10px] text-terminal-muted">{isFullscreen ? 'Active (Full View)' : 'All Mobile & Desktop'}</span>
              </div>
            </div>
            <button
              onClick={toggleFullscreen}
              className="px-2.5 py-1 rounded-lg bg-terminal-card hover:bg-terminal-bg border border-terminal-border text-terminal-text font-bold text-[10px] transition flex items-center gap-1.5 shadow-sm"
            >
              {isFullscreen ? 'Exit Full' : 'Full Screen'}
            </button>
          </div>

          {/* Market Sentiment & PCR Row */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel border border-terminal-border">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-accent-cyan" />
              <div>
                <span className="font-bold text-terminal-text block text-[11px]">{selectedIndex} Sentiment</span>
                <span className="text-[10px] text-terminal-muted">ATM PCR: {activePcr.toFixed(2)}</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isBullishSentiment ? 'bg-bull/20 text-bull border border-bull/40' : isBearishSentiment ? 'bg-bear/20 text-bear border border-bear/40' : 'bg-amber/20 text-amber border border-amber/40'
            }`}>
              {isBullishSentiment ? '▲ BULLISH' : isBearishSentiment ? '▼ BEARISH' : '⬌ NEUTRAL'}
            </span>
          </div>

          {/* Fyers Broker API Account */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel border border-terminal-border">
            <div className="flex items-center space-x-2">
              <KeyRound className={`w-4 h-4 ${fyersConfig.isConnected ? 'text-bull' : 'text-accent-cyan'}`} />
              <div>
                <span className="font-bold text-terminal-text block text-[11px]">Fyers Broker API</span>
                <span className="text-[10px] text-terminal-muted">
                  {fyersConfig.isConnected ? 'Connected: SRS Trading Account' : 'Connect API Token'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsMoreMenuOpen(false);
                setIsFyersModalOpen(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 shadow-sm ${
                fyersConfig.isConnected
                  ? 'bg-bull/15 border-bull/50 text-bull hover:bg-bull/25'
                  : 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/25'
              }`}
            >
              {fyersConfig.isConnected ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-bull shrink-0" />
                  <span>Config SRS</span>
                </>
              ) : (
                <span>Connect</span>
              )}
            </button>
          </div>

          {/* Live Market / Official EOD Session Status */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel border border-terminal-border">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isLiveMarketOpen ? 'bg-bull animate-ping' : 'bg-amber'}`} />
              <div>
                <span className="font-bold text-terminal-text block text-[11px]">Market Session</span>
                <span className="text-[10px] text-terminal-muted">
                  {isLiveMarketOpen ? 'NSE / BSE / MCX Regular Trading' : 'Official Settlement Close / EOD'}
                </span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border shrink-0 ${
                isLiveMarketOpen
                  ? 'bg-bull-subtle border-bull text-bull shadow-[0_0_8px_rgba(0,245,155,0.4)]'
                  : 'bg-amber/15 border-amber/40 text-amber'
              }`}
            >
              {isLiveMarketOpen ? 'LIVE MARKET' : 'OFFICIAL EOD'}
            </span>
          </div>

          {/* Data Source Switcher */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel border border-terminal-border">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-bull" />
              <div>
                <span className="font-bold text-terminal-text block text-[11px]">Data Source</span>
                <span className="text-[10px] text-terminal-muted">{dataSource === 'FYERS_LIVE' ? 'Fyers WebSocket API' : 'NSE Official Bhavcopy'}</span>
              </div>
            </div>
            <button
              onClick={() => setDataSource(dataSource === 'FYERS_LIVE' ? 'NSE_LIVE' : 'FYERS_LIVE')}
              className="px-2 py-1 rounded-lg bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/40 text-accent-cyan font-bold text-[10px] transition"
            >
              Switch
            </button>
          </div>

          {/* Audio Alerts & Voice Chime */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel border border-terminal-border">
            <div className="flex items-center space-x-2">
              {isMuted ? <VolumeX className="w-4 h-4 text-terminal-muted" /> : <Volume2 className="w-4 h-4 text-bull" />}
              <div>
                <span className="font-bold text-terminal-text block text-[11px]">Audio Alerts</span>
                <span className="text-[10px] text-terminal-muted">{isMuted ? 'Muted' : 'Live Audio Active'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleMute}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                  isMuted ? 'bg-terminal-bg text-terminal-muted border-terminal-border' : 'bg-bull/20 text-bull border-bull/40'
                }`}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={testSound}
                className="px-1.5 py-1 rounded-lg bg-terminal-bg text-terminal-text border border-terminal-border text-[10px] hover:border-accent-cyan"
              >
                Test
              </button>
            </div>
          </div>

          {/* Theme Mode Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel border border-terminal-border">
            <div className="flex items-center space-x-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-accent-cyan" /> : <Sun className="w-4 h-4 text-amber" />}
              <div>
                <span className="font-bold text-terminal-text block text-[11px]">Appearance</span>
                <span className="text-[10px] text-terminal-muted">{theme === 'dark' ? 'Dark Terminal Mode' : 'Light Pro Mode'}</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="px-2.5 py-1 rounded-lg bg-terminal-card hover:bg-terminal-bg border border-terminal-border text-terminal-text font-bold text-[10px] transition flex items-center gap-1.5 shadow-sm"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3 h-3 text-amber" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-accent-cyan" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-terminal-panel border border-terminal-border text-[11px]">
            <div className="flex items-center space-x-2">
              <Radio className={`w-4 h-4 ${isConnected ? 'text-bull' : 'text-bear'}`} />
              <span className="text-terminal-muted">Connection:</span>
            </div>
            <span className={`font-bold ${isConnected ? 'text-bull' : 'text-bear animate-pulse'}`}>
              {isConnected ? '100% ONLINE (1-Sec Stream)' : 'OFFLINE'}
            </span>
          </div>
        </div>
      )}

      {/* 2nd Row: Horizontal Swipeable Ticker Tape of Asset Cards */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pt-1.5 pb-0.5 border-t border-terminal-border/40 mt-1.5 touch-pan-x">
        {visibleIndices.map((sym) => {
          const state = indices[sym];
          const isSelected = selectedIndex === sym;
          const isPositive = state ? state.change >= 0 : true;
          const pcrVal = state?.pcr.atmPlusMinus5Pcr ?? 1.0;
          const cardBull = pcrVal >= 1.10;
          const cardBear = pcrVal <= 0.88;

          const changeSign = isPositive ? '+' : '';
          const pointsFormatted = state ? `${changeSign}${state.change.toFixed(2)}` : '0.00';
          const pctFormatted = state ? `${changeSign}${state.pctChange.toFixed(2)}%` : '0.00%';

          return (
            <div
              key={sym}
              onClick={() => setSelectedIndex(sym)}
              className={`cursor-pointer rounded-xl p-2 transition border flex flex-col justify-between shrink-0 min-w-[145px] sm:min-w-[170px] ${
                isSelected
                  ? 'bg-terminal-card border-accent-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)] ring-1 ring-accent-cyan/40'
                  : 'bg-terminal-bg/80 border-terminal-border hover:border-terminal-hover hover:bg-terminal-card/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className={`font-mono font-black text-[11px] sm:text-xs ${isSelected ? 'text-accent-cyan' : 'text-terminal-text'}`}>
                    {sym}
                  </span>
                  {isSelected && (
                    <span className="inline-flex items-center px-1 py-0.2 text-[7px] font-mono uppercase rounded bg-accent-cyan/20 text-accent-cyan font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>

                {state && (
                  <div className="flex items-center space-x-1">
                    {cardBull ? (
                      <TrendingUp className="w-3 h-3 text-bull shrink-0" />
                    ) : cardBear ? (
                      <TrendingDown className="w-3 h-3 text-bear shrink-0" />
                    ) : (
                      <Activity className="w-3 h-3 text-amber shrink-0" />
                    )}
                    <span className={`font-mono text-[8px] px-1 py-0.2 rounded border ${getPcrBadgeColor(pcrVal)} font-bold`}>
                      PCR {pcrVal.toFixed(2)}
                    </span>
                    {visibleIndices.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleIndexVisibility(sym);
                        }}
                        className="opacity-40 hover:opacity-100 hover:bg-bear/25 hover:text-bear p-0.5 rounded text-terminal-muted transition ml-0.5"
                        title={`Deselect ${sym}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {state ? (
                <div className="flex items-baseline justify-between mt-1">
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-xs sm:text-sm text-terminal-text">
                      ₹{state.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                    </span>
                    <span
                      className={`font-mono text-[9px] font-bold ${
                        isPositive ? 'text-bull' : 'text-bear'
                      }`}
                    >
                      {pointsFormatted} ({pctFormatted})
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-terminal-muted self-end">
                    ATM <span className="text-amber font-semibold">{state.atmStrike}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-terminal-muted mt-1 animate-pulse">
                  Streaming...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fyers Connect Modal */}
      <FyersModal
        isOpen={isFyersModalOpen}
        onClose={() => setIsFyersModalOpen(false)}
      />

      {/* SEBI Position Sizing & Risk Calculator Modal */}
      <RiskCalculatorModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        defaultLtp={100}
      />
    </header>
  );
};
