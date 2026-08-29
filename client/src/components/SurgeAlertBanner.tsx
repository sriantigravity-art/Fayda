import React from 'react';
import { useMarket } from '../context/MarketContext';
import { AlertOctagon, X, Zap, Target, ShieldAlert, Clock } from 'lucide-react';

export const SurgeAlertBanner: React.FC = () => {
  const { latestExtremeSurge, dismissExtremeBanner, visibleIndices, indices } = useMarket();

  if (!latestExtremeSurge || !visibleIndices.includes(latestExtremeSurge.indexSymbol)) {
    return null;
  }

  const idxState = indices[latestExtremeSurge.indexSymbol];
  const atm = idxState?.atmStrike;
  if (atm && Math.abs(latestExtremeSurge.strikePrice - atm) > 400) {
    return null;
  }

  // Auto-expire surge banner once signal exceeds its validity window
  const ageMinutes = (Date.now() - new Date(latestExtremeSurge.timestamp).getTime()) / (60 * 1000);
  const maxWindow = latestExtremeSurge.validUntilMinutes || 20;
  if (ageMinutes > maxWindow) {
    return null;
  }

  const isCall = latestExtremeSurge.optionType === 'CE';
  const isBullAction = latestExtremeSurge.tradeAction === 'BUY_CALL';
  const contract = latestExtremeSurge.suggestedContract;

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
              {/* Prominent Timestamp Badge */}
              <span className="px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border text-accent-cyan font-bold text-[10px] sm:text-xs flex items-center gap-1 shadow-sm">
                <Clock className="w-3 h-3 text-accent-cyan" />
                <span>{latestExtremeSurge.timeFormatted} IST</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-bear/20 border border-bear/50 text-bear font-bold text-[10px] sm:text-xs flex items-center gap-1 shadow-sm">
                ⚡ 5-10 Min Target Window
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

        {/* Right Side: High-Visibility Trade Setup (Strike, Entry, Exit, Target) */}
        <div className="flex items-center justify-between w-full lg:w-auto space-x-2 sm:space-x-3 shrink-0">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-terminal-card p-1.5 sm:p-2 rounded-xl border border-terminal-border shadow-inner">
            {/* Strike Option Contract */}
            <div className="px-2.5 py-1 bg-terminal-panel/80 rounded-lg border border-terminal-border/80 text-left">
              <span className="text-[8px] sm:text-[9px] text-accent-cyan block font-bold uppercase">OPTION STRIKE</span>
              <span className="font-black text-xs sm:text-sm text-terminal-text tracking-wide whitespace-nowrap">
                🎯 {contract.symbol}
              </span>
            </div>

            {/* Entry Zone */}
            <div className="px-2.5 py-1 bg-accent-cyan/10 rounded-lg border border-accent-cyan/40 text-left">
              <span className="text-[8px] sm:text-[9px] text-accent-cyan block font-bold uppercase">ENTRY ZONE</span>
              <span className="font-bold text-xs sm:text-sm text-terminal-text whitespace-nowrap">
                {contract.recommendedEntry}
              </span>
            </div>

            {/* Exit / Stoploss */}
            <div className="px-2.5 py-1 bg-bear/15 rounded-lg border border-bear/50 text-left">
              <span className="text-[8px] sm:text-[9px] text-bear block font-bold uppercase flex items-center gap-0.5">
                <ShieldAlert className="w-2.5 h-2.5" /> EXIT / SL
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
            <div className="px-2 py-1 bg-terminal-panel rounded-lg border border-terminal-border text-center hidden md:block">
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
