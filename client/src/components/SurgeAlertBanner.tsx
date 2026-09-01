import React, { useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { AlertOctagon, X, Zap, Target, ShieldAlert, Clock, Timer, Minimize2, Maximize2 } from 'lucide-react';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime } from '../utils/formatTime';

export const SurgeAlertBanner: React.FC = () => {
  const { latestExtremeSurge, dismissExtremeBanner, indices } = useMarket();
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // 1-second live countdown ticker for strict timebound expiry
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset minimized state when a new surge alert arrives
  useEffect(() => {
    if (latestExtremeSurge?.id) {
      setIsMinimized(false);
    }
  }, [latestExtremeSurge?.id]);

  if (!latestExtremeSurge) {
    return null;
  }

  // Guard 1: Do not display live flash surge banner when market is closed
  const isMarketOpen = (symbol: string): boolean => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;
    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
    const isCommodity = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';
    if (isCommodity) {
      return currentMin >= (9 * 60) && currentMin < (23 * 60 + 30);
    }
    return currentMin >= (9 * 60 + 15) && currentMin < (15 * 60 + 40);
  };

  if (!isMarketOpen(latestExtremeSurge.indexSymbol)) {
    return null;
  }

  const idxState = indices[latestExtremeSurge.indexSymbol];
  const atm = idxState?.atmStrike;
  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === latestExtremeSurge.indexSymbol);
  const maxAtmDist = cfg?.defaultRange ? cfg.defaultRange * 2.5 : 500;
  if (atm && Math.abs(latestExtremeSurge.strikePrice - atm) > maxAtmDist) {
    return null;
  }

  // Guard 2: Strict Timebound Window (Extreme: 10 mins, Strong: 15 mins)
  const maxWindowMinutes = latestExtremeSurge.validUntilMinutes || (latestExtremeSurge.surgeLevel === 'EXTREME' ? 10 : 15);
  const ageSeconds = (currentTime - new Date(latestExtremeSurge.timestamp).getTime()) / 1000;
  const totalWindowSeconds = maxWindowMinutes * 60;
  const remainingSeconds = Math.max(0, Math.floor(totalWindowSeconds - ageSeconds));

  // If time window expired, immediately remove from flash screen
  if (remainingSeconds <= 0) {
    return null;
  }

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedCountdown = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const isCall = latestExtremeSurge.optionType === 'CE';
  const isBullAction = latestExtremeSurge.tradeAction === 'BUY_CALL';
  const contract = latestExtremeSurge.suggestedContract;

  // Extract current live LTP of the option strike
  const strikeObj = idxState?.strikes?.find((s) => s.strikePrice === latestExtremeSurge.strikePrice);
  const currentOptionLtp = isCall
    ? (strikeObj?.callLtp ?? latestExtremeSurge.ltp)
    : (strikeObj?.putLtp ?? latestExtremeSurge.ltp);

  // Guard 3: Target Hit Check (Tip Completed -> Remove from flash screen)
  const targetPrice = parseFloat(String(contract?.target || '').replace(/[^0-9.]/g, ''));
  if (targetPrice > 0 && currentOptionLtp >= targetPrice) {
    return null;
  }

  // Guard 4: Stoploss Breached Check (Risk Level Hit -> Invalidate and remove)
  const stoplossPrice = parseFloat(String(contract?.stoploss || '').replace(/[^0-9.]/g, ''));
  if (stoplossPrice > 0 && currentOptionLtp > 0 && currentOptionLtp <= stoplossPrice) {
    return null;
  }

  // Guard 5: Surge Slowdown / Reversal Check
  if (strikeObj) {
    const currentBuildup = isCall ? strikeObj.callBuildup : strikeObj.putBuildup;
    if (isBullAction && currentBuildup === 'LONG_UNWINDING') {
      return null; // Buyers exited
    }
  }

  // Extract current asset spot price & day's delta
  const assetSpotPrice = idxState?.spotPrice || 0;
  const assetChange = idxState?.change || 0;
  const assetPctChange = idxState?.pctChange || 0;
  const isAssetPositive = assetChange >= 0;

  const progressPct = totalWindowSeconds > 0 ? Math.min(100, Math.max(0, (remainingSeconds / totalWindowSeconds) * 100)) : 0;

  // ─────────────────────────────────────────────────────────────
  // MINIMIZED STATE: Settles on the right side edge like Global Indices
  // ─────────────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="fixed right-0 top-[32%] sm:top-[34%] -translate-y-1/2 z-40 select-none font-mono animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center justify-center p-2.5 sm:py-3.5 sm:px-2.5 rounded-l-2xl border-l-2 border-t-2 border-b-2 font-mono font-black text-[10px] sm:text-[11px] uppercase tracking-wider transition-all duration-200 shadow-[-4px_0_25px_rgba(255,59,105,0.5)] backdrop-blur-xl bg-gradient-to-b from-terminal-panel via-terminal-card to-terminal-panel border-bear/80 text-terminal-text hover:text-bear hover:border-bear cursor-pointer group"
          title="Click to expand Extreme Surge Alert"
        >
          {/* Mobile View (< sm): Compact Glowing Right-Edge Tab */}
          <div className="flex sm:hidden flex-col items-center justify-center relative gap-1 p-0.5">
            <div className="relative">
              <Zap className="w-5 h-5 text-bear drop-shadow-[0_0_10px_rgba(255,59,105,0.8)] animate-pulse" />
              {/* Sober Flashing Beacon Orb */}
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-bear opacity-75 animate-ping" style={{ animationDuration: '2.5s' }} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-bear shadow-[0_0_8px_#FF3B69]" />
            </div>
            <span className="text-[9px] font-black text-amber tabular-nums mt-0.5">
              ₹{currentOptionLtp.toFixed(0)}
            </span>
          </div>

          {/* Tablet & Desktop View (>= sm): Full Vertical Dock Tab like Global Indices */}
          <div className="hidden sm:flex flex-col items-center gap-2" style={{ writingMode: 'vertical-rl' }}>
            <div className="flex items-center justify-center gap-1 rotate-180 mb-1">
              <span className="w-2 h-2 rounded-full bg-bear opacity-75 animate-ping" style={{ animationDuration: '2.5s' }} />
              <span className="w-2 h-2 rounded-full bg-bear shadow-[0_0_8px_#FF3B69]" />
            </div>
            
            <div className="flex items-center gap-1 text-bear">
              <Zap className="w-3.5 h-3.5 rotate-90 text-bear animate-pulse" />
              <span className="font-black text-bear tracking-widest">FLASH SURGE</span>
            </div>

            <div className="flex items-center gap-1 font-bold text-white tracking-wider my-0.5">
              <span>{latestExtremeSurge.indexSymbol}</span>
              <span className={isCall ? 'text-bull' : 'text-bear'}>{latestExtremeSurge.strikePrice} {latestExtremeSurge.optionType}</span>
            </div>

            <div className="px-1.5 py-0.5 rounded bg-amber/15 border border-amber/40 text-amber font-black text-[10px] tracking-normal my-0.5">
              ₹{currentOptionLtp.toFixed(1)}
            </div>

            <span className="text-[9px] text-terminal-muted tracking-normal">
              ⏳ {formattedCountdown}
            </span>
          </div>
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EXPANDED MODAL: Centered on Mobile, Pinned to Right on Tablet & Desktop
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed top-16 left-3 right-3 sm:left-auto sm:right-4 md:right-6 sm:top-20 z-[60] max-w-md sm:max-w-lg w-auto sm:w-full mx-auto sm:mx-0 select-none animate-in fade-in slide-in-from-top-4 sm:slide-in-from-right-6 duration-300 font-mono">
      <div className="bg-terminal-card/95 backdrop-blur-2xl border-2 border-bear/80 rounded-2xl p-3.5 sm:p-5 shadow-[0_0_50px_rgba(255,59,105,0.4)] relative overflow-hidden text-terminal-text">
        {/* Top Smooth Countdown Fading Progress Slider Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-terminal-bg/80">
          <div
            className="h-full bg-gradient-to-r from-bear via-amber to-bull transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(255,59,105,0.8)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Ambient Subtle Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-bear/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header Ribbon */}
        <div className="flex items-center justify-between mt-1 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase bg-bear text-white shadow-[0_0_12px_rgba(255,59,105,0.8)] animate-pulse">
              <Zap className="w-3 h-3 mr-1" /> FLASH EXTREME SURGE
            </span>
            <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md bg-bear/20 border border-bear/50 text-bear font-bold text-[10px] flex items-center gap-1">
              <Timer className="w-3 h-3 text-bear animate-spin" style={{ animationDuration: '4s' }} />
              <span>⏳ {formattedCountdown} Left</span>
            </span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5">
            <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded bg-terminal-panel border border-terminal-border text-accent-cyan font-bold text-[10px] flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-accent-cyan" />
              <span>{formatISTTime(latestExtremeSurge.timestamp, { showSeconds: true, includeSuffix: true })}</span>
            </span>
            {/* Minimize to right-side flashing icon */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded-lg bg-terminal-panel hover:bg-terminal-bg text-terminal-muted hover:text-white border border-terminal-border transition"
              title="Minimize to Right Side Pill"
            >
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            {/* Close completely */}
            <button
              onClick={dismissExtremeBanner}
              className="p-1 rounded-lg bg-terminal-panel hover:bg-terminal-bg text-terminal-muted hover:text-white border border-terminal-border transition"
              title="Close Flash Alert"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Contract Title & Spot Price */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-terminal-border/70">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-bear/20 text-bear border border-bear/40 shrink-0">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-base text-terminal-text tracking-wide">
                {latestExtremeSurge.indexSymbol} <span className={isCall ? 'text-bull font-black' : 'text-bear font-black'}>{latestExtremeSurge.strikePrice} {latestExtremeSurge.optionType}</span>
              </h3>
              <span className={`font-bold text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded ${isBullAction ? 'bg-bull/20 text-bull border border-bull/40' : 'bg-bear/20 text-bear border border-bear/40'}`}>
                {latestExtremeSurge.actionTitle}
              </span>
            </div>
          </div>

          {/* Spot price tag */}
          {assetSpotPrice > 0 && (
            <div className="text-right shrink-0">
              <span className="text-[8px] sm:text-[9px] text-terminal-muted block">SPOT PRICE</span>
              <span className="font-black text-xs sm:text-sm text-terminal-text tabular-nums">
                ₹{assetSpotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-[8px] sm:text-[9px] font-bold block ${isAssetPositive ? 'text-bull' : 'text-bear'}`}>
                {isAssetPositive ? '+' : ''}{assetPctChange.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* 4-Box High-Visibility Trade Matrix */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2.5 text-center text-xs">
          {/* Current Premium */}
          <div className="p-1.5 sm:p-2 rounded-xl bg-amber/15 border border-amber/50 shadow-sm">
            <span className="text-[8px] sm:text-[9px] text-amber block font-bold uppercase">LIVE LTP</span>
            <span className="font-black text-xs sm:text-sm text-amber block tabular-nums mt-0.5">
              ₹{currentOptionLtp.toFixed(2)}
            </span>
          </div>

          {/* Entry Zone */}
          <div className="p-1.5 sm:p-2 rounded-xl bg-accent-cyan/10 border border-accent-cyan/40">
            <span className="text-[8px] sm:text-[9px] text-accent-cyan block font-bold uppercase">ENTRY ZONE</span>
            <span className="font-bold text-[10px] sm:text-xs text-terminal-text block truncate mt-0.5" title={contract.recommendedEntry}>
              {contract.recommendedEntry}
            </span>
          </div>

          {/* Stoploss */}
          <div className="p-1.5 sm:p-2 rounded-xl bg-bear/15 border border-bear/50">
            <span className="text-[8px] sm:text-[9px] text-bear block font-bold uppercase flex items-center justify-center gap-0.5">
              <ShieldAlert className="w-2.5 h-2.5" /> STOP LOSS
            </span>
            <span className="font-bold text-[11px] sm:text-sm text-bear block mt-0.5">
              {contract.stoploss}
            </span>
          </div>

          {/* Target */}
          <div className="p-1.5 sm:p-2 rounded-xl bg-bull/15 border border-bull/50">
            <span className="text-[8px] sm:text-[9px] text-bull block font-bold uppercase flex items-center justify-center gap-0.5">
              <Target className="w-2.5 h-2.5" /> TARGET
            </span>
            <span className="font-bold text-[11px] sm:text-sm text-bull block mt-0.5">
              {contract.target}
            </span>
          </div>
        </div>

        {/* Action description footer */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
          <span className="truncate max-w-[70%]" title={latestExtremeSurge.actionDescription}>
            💡 {latestExtremeSurge.actionDescription}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber/15 text-amber border border-amber/30 font-bold shrink-0">
            Score {latestExtremeSurge.surgeScore}/100
          </span>
        </div>
      </div>
    </div>
  );
};

export default SurgeAlertBanner;
