import React, { useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { AlertOctagon, X, Zap, Target, ShieldAlert, Clock, Timer } from 'lucide-react';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime } from '../utils/formatTime';

export const SurgeAlertBanner: React.FC = () => {
  const { latestExtremeSurge, dismissExtremeBanner, indices } = useMarket();
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // 1-second live countdown ticker for strict timebound expiry
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <div className="bg-gradient-to-r from-bear/15 via-terminal-panel to-bear/15 border-y-2 border-bear shadow-md px-3 sm:px-4 py-2.5 text-terminal-text relative z-30 font-mono animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="max-w-[1840px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left Side: Surge Event Description & Strike */}
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2 rounded-xl bg-bear/20 text-bear border border-bear/50 shadow-md shrink-0 animate-pulse">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-black text-[10px] sm:text-xs uppercase bg-bear text-white px-2 py-0.5 rounded shadow-[0_0_10px_rgba(255,59,105,0.7)] animate-pulse flex items-center gap-1">
                <Zap className="w-3 h-3" /> 🚨 FLASH EXTREME SURGE
              </span>
              <span className="font-black text-sm sm:text-base text-terminal-text tracking-wide">
                {latestExtremeSurge.indexSymbol} <span className={isCall ? 'text-bear' : 'text-bull'}>{latestExtremeSurge.strikePrice} {latestExtremeSurge.optionType}</span>
              </span>
              {/* Asset Spot Price Badge */}
              {assetSpotPrice > 0 && (
                <span className="px-2 py-0.5 rounded bg-terminal-bg border border-terminal-border text-terminal-text font-bold text-[10px] sm:text-xs flex items-center gap-1 shadow-sm">
                  <span className="text-terminal-muted">SPOT:</span>
                  <span className="tabular-nums font-black">₹{assetSpotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className={`text-[10px] ${isAssetPositive ? 'text-bull' : 'text-bear'}`}>
                    ({isAssetPositive ? '+' : ''}{assetPctChange.toFixed(2)}%)
                  </span>
                </span>
              )}
              {/* Prominent Timestamp Badge */}
              <span className="px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border text-accent-cyan font-bold text-[10px] sm:text-xs flex items-center gap-1 shadow-sm">
                <Clock className="w-3 h-3 text-accent-cyan" />
                <span>{formatISTTime(latestExtremeSurge.timestamp, { showSeconds: true, includeSuffix: true })}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-bear/25 border border-bear/60 text-bear font-black text-[10px] sm:text-xs flex items-center gap-1 shadow-sm">
                <Timer className="w-3 h-3 text-bear animate-spin" style={{ animationDuration: '3s' }} />
                <span>⏳ {formattedCountdown} Left</span>
              </span>
              <span className="text-xs font-bold text-amber bg-amber/15 px-1.5 py-0.5 rounded border border-amber/30">
                Score {latestExtremeSurge.surgeScore}/100
              </span>
              <span className="text-[11px] text-terminal-muted hidden sm:inline">
                ({latestExtremeSurge.oiChange1mFormatted} OI / 1m)
              </span>
            </div>
            <div className="text-[11px] text-terminal-text mt-1 flex flex-wrap items-center gap-1.5">
              <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${isBullAction ? 'bg-bull/20 text-bull border border-bull/40' : 'bg-bear/20 text-bear border border-bear/40'}`}>
                {latestExtremeSurge.actionTitle}
              </span>
              <span className="text-terminal-muted hidden md:inline">•</span>
              <span className="text-terminal-muted text-[10px] sm:text-[11px]">{latestExtremeSurge.actionDescription}</span>
            </div>
          </div>
        </div>

        {/* Right Side: High-Visibility Trade Setup (Option Strike, Current Premium, Entry, Exit SL, Target) */}
        <div className="flex items-center justify-between w-full lg:w-auto space-x-2 sm:space-x-3 shrink-0 min-w-0">
          <div className="grid grid-cols-2 sm:flex sm:flex-nowrap items-center gap-1.5 sm:gap-2 bg-terminal-card p-1.5 sm:p-2 rounded-xl border border-terminal-border shadow-inner w-full sm:w-auto">
            {/* Strike Option Contract */}
            <div className="px-2.5 py-1 bg-terminal-panel/80 rounded-lg border border-terminal-border/80 text-left">
              <span className="text-[8px] sm:text-[9px] text-accent-cyan block font-bold uppercase">OPTION STRIKE</span>
              <span className="font-black text-xs sm:text-sm text-terminal-text tracking-wide whitespace-nowrap">
                🎯 {contract.symbol}
              </span>
            </div>

            {/* Current Premium (LTP) */}
            <div className="px-2.5 py-1 bg-amber/15 rounded-lg border border-amber/50 text-left shadow-sm">
              <span className="text-[8px] sm:text-[9px] text-amber block font-bold uppercase">CURRENT PREMIUM</span>
              <span className="font-black text-xs sm:text-sm text-amber tracking-wide whitespace-nowrap">
                ₹{currentOptionLtp.toFixed(2)}
              </span>
            </div>

            {/* Entry Zone */}
            <div className="px-2.5 py-1 bg-accent-cyan/10 rounded-lg border border-accent-cyan/40 text-left">
              <span className="text-[8px] sm:text-[9px] text-accent-cyan block font-bold uppercase">ENTRY PRICE</span>
              <span className="font-bold text-xs sm:text-sm text-terminal-text whitespace-nowrap">
                {contract.recommendedEntry}
              </span>
            </div>

            {/* Exit / Stoploss */}
            <div className="px-2.5 py-1 bg-bear/15 rounded-lg border border-bear/50 text-left">
              <span className="text-[8px] sm:text-[9px] text-bear block font-bold uppercase flex items-center gap-0.5">
                <ShieldAlert className="w-2.5 h-2.5" /> STOP LOSS
              </span>
              <span className="font-bold text-xs sm:text-sm text-bear whitespace-nowrap">
                {contract.stoploss}
              </span>
            </div>

            {/* Target */}
            <div className="px-2.5 py-1 bg-bull/15 rounded-lg border border-bull/50 text-left">
              <span className="text-[8px] sm:text-[9px] text-bull block font-bold uppercase flex items-center gap-0.5">
                <Target className="w-2.5 h-2.5" /> TARGET
              </span>
              <span className="font-bold text-xs sm:text-sm text-bull whitespace-nowrap">
                {contract.target}
              </span>
            </div>

            {/* Risk-Reward */}
            <div className="px-2 py-1 bg-terminal-panel rounded-lg border border-terminal-border text-center hidden xl:block">
              <span className="text-[8px] text-terminal-muted block uppercase">R:R</span>
              <span className="font-bold text-xs text-amber">{contract.riskReward}</span>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismissExtremeBanner}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-black/80 text-white/70 hover:text-white border border-white/20 transition shrink-0"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
