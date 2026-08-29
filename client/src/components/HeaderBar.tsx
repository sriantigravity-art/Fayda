import React, { useState, useEffect, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
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
  Minimize2 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FyersModal } from './FyersModal';
import { StockSelectorDropdown } from './StockSelectorDropdown';

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
  const [isFyersModalOpen, setIsFyersModalOpen] = useState(false);
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
    <header className="border-b border-terminal-border bg-terminal-panel/95 backdrop-blur sticky top-0 z-40 px-2 sm:px-4 py-1.5 sm:py-2 shadow-md">
      {/* 1st Row: Master Control Header Bar (2 Lines on Mobile, Single Row on Desktop) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 sm:gap-2 min-w-0">
        {/* LINE 1 ON MOBILE / LEFT SIDE ON DESKTOP */}
        <div className="flex items-center justify-between md:justify-start space-x-2 shrink-0 min-w-0 w-full md:w-auto">
          {/* Brand Logo (Enlarged and prominent on mobile top-left) */}
          <div className="flex items-center shrink-0">
            <img
              src="/fayda-logo.png"
              alt="Fayda Logo"
              className="h-7 xs:h-8 md:h-8.5 w-auto max-w-[110px] xs:max-w-[125px] md:max-w-[125px] object-contain drop-shadow-[0_0_10px_rgba(0,229,255,0.25)] transition-transform duration-200 hover:scale-105"
            />
          </div>

          {/* DESKTOP-ONLY INLINE CONTROLS (Hidden on mobile < md) */}
          <div className="hidden md:flex items-center space-x-1.5 shrink-0">
            {/* ONE-LINER SELECT ASSET DROPDOWN */}
            <StockSelectorDropdown />

            {/* Verified Account Name / Connect Fyers */}
            <button
              onClick={() => setIsFyersModalOpen(true)}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-mono rounded-xl border transition shrink-0 ${
                fyersConfig.isConnected
                  ? 'bg-bull/15 border-bull/50 text-bull font-bold hover:bg-bull/25'
                  : 'bg-accent-cyan/10 border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/20'
              }`}
              title="Click to view or update Fyers API token"
            >
              {fyersConfig.isConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-bull shrink-0" />
                  <span className="font-semibold text-xs">SRS</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span>Connect Fyers</span>
                </>
              )}
            </button>

            {/* LIVE MARKET SENTIMENT BADGE (Visible on screens >= 1380px) */}
            <div
              className={`hidden 2xl:inline-flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-lg border transition shadow-sm shrink-0 ${
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

            {/* Market Status (Visible on screens >= 1024px) */}
            <div
              className={`hidden lg:inline-flex items-center px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-md border shrink-0 ${
                isLiveMarketOpen
                  ? 'bg-bull-subtle border-bull text-bull shadow-[0_0_8px_rgba(0,245,155,0.4)]'
                  : 'bg-amber/15 border-amber/40 text-amber'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isLiveMarketOpen ? 'bg-bull animate-ping' : 'bg-amber'}`} />
              {isLiveMarketOpen ? 'LIVE' : 'OFFICIAL EOD'}
            </div>
          </div>

          {/* MOBILE-ONLY TOP-RIGHT ROW: Fullscreen Button + Clock + Settings */}
          <div className="flex md:hidden items-center space-x-1.5 shrink-0">
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

            {/* Popover Dropdown Panel */}
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-[280px] sm:w-[320px] bg-terminal-card/95 backdrop-blur-xl border-2 border-accent-cyan/60 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-50 p-3 space-y-2.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-terminal-border">
                  <span className="font-bold text-terminal-text flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                    <Sliders className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>TERMINAL CONTROLS</span>
                  </span>
                  <button onClick={() => setIsMoreMenuOpen(false)} className="text-terminal-muted hover:text-terminal-text">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Fullscreen Mode Toggle */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-terminal-panel/60 border border-terminal-border">
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
                <div className="flex items-center justify-between p-2 rounded-xl bg-terminal-panel/60 border border-terminal-border">
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

                {/* Data Source Switcher */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-terminal-panel/60 border border-terminal-border">
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
                <div className="flex items-center justify-between p-2 rounded-xl bg-terminal-panel/60 border border-terminal-border">
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
                <div className="flex items-center justify-between p-2 rounded-xl bg-terminal-panel/60 border border-terminal-border">
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
                <div className="flex items-center justify-between p-2 rounded-xl bg-terminal-panel/60 border border-terminal-border text-[11px]">
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
          </div>
        </div>
      </div>

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
    </header>
  );
};
