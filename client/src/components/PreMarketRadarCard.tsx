import React from 'react';
import type { PreMarketChecklist, IntradayMarketRegimeData, IndexSymbol } from '../types';
import { useTerminalMode } from '../context/TerminalModeContext';
import { Clock, Globe, TrendingUp, Layers, AlertCircle, ArrowUpRight, Activity, Sparkles, ShieldCheck } from 'lucide-react';

interface PreMarketRadarCardProps {
  symbol: IndexSymbol;
  preMarket?: PreMarketChecklist;
  marketRegime?: IntradayMarketRegimeData;
}

export const PreMarketRadarCard: React.FC<PreMarketRadarCardProps> = ({
  symbol,
  preMarket,
  marketRegime
}) => {
  const { isBeginner, isExpert } = useTerminalMode();
  if (!preMarket && !marketRegime) return null;

  // =========================================================================
  // VIEW 1: BEGINNER MODE (Simplified Daily Outlook & Morning Roadmap)
  // =========================================================================
  if (isBeginner) {
    const isTrendingExpected = preMarket?.cprWidthForecast.includes('NARROW');

    return (
      <div className="w-full bg-terminal-card border border-terminal-border rounded-xl p-3.5 sm:p-4 shadow-subtle mb-3 select-none">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-accent-purple/20 text-accent-purple">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-terminal-text">
                Today's Morning Market Outlook ({symbol})
              </span>
              <p className="text-[11px] text-terminal-muted">
                Pre-market check before market opens at 09:15 AM
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
            isTrendingExpected ? 'bg-bull/15 border-bull/40 text-bull' : 'bg-amber/15 border-amber/40 text-amber'
          }`}>
            <Sparkles className="w-3 h-3" />
            <span>{isTrendingExpected ? '⚡ High Chance of Big Move' : '🛡️ High Chance of Slow Range'}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-sans text-xs mt-2">
          <div className="p-2.5 rounded-lg bg-terminal-panel border border-terminal-border">
            <span className="text-[10px] text-terminal-muted font-bold uppercase block">1. Global Cues (GIFT Nifty)</span>
            <span className="text-sm font-bold text-terminal-text block mt-0.5">{preMarket?.giftNiftyGap || 'Flat Opening'}</span>
            <span className="text-[10px] text-terminal-muted mt-0.5 block">Market opening momentum cue</span>
          </div>

          <div className="p-2.5 rounded-lg bg-terminal-panel border border-terminal-border">
            <span className="text-[10px] text-terminal-muted font-bold uppercase block">2. Overall Daily Trend</span>
            <span className={`text-sm font-bold block mt-0.5 ${preMarket?.dailyEma20Trend === 'BULLISH_ABOVE_20EMA' ? 'text-bull' : 'text-bear'}`}>
              {preMarket?.dailyEma20Trend === 'BULLISH_ABOVE_20EMA' ? '📈 Bullish Upward Bias' : '📉 Bearish Downward Bias'}
            </span>
            <span className="text-[10px] text-terminal-muted mt-0.5 block">Higher timeframe trend direction</span>
          </div>

          <div className="p-2.5 rounded-lg bg-terminal-panel border border-terminal-border">
            <span className="text-[10px] text-terminal-muted font-bold uppercase block">3. Today's Plan</span>
            <span className="text-xs font-bold text-accent-sky block mt-0.5">
              {isTrendingExpected ? 'Trade breakouts in trend direction' : 'Wait for dips & rallies near edges'}
            </span>
            <span className="text-[10px] text-terminal-muted mt-0.5 block">Recommended beginner playbook</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: INTERMEDIATE & EXPERT MODE (Full Chapter 6 Checklist & Market Regime)
  // =========================================================================
  return (
    <div className="w-full bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-subtle mb-3 select-none">
      {/* Title & Regime Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-accent-purple/15 text-accent-purple">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-xs sm:text-sm text-terminal-text tracking-wide">
                PRE-MARKET 09:00 AM PREPARATION RADAR & INTRADAY REGIME
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-terminal-panel text-terminal-muted border border-terminal-border">
                {symbol}
              </span>
              {isExpert && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-sky/15 text-accent-sky border border-accent-sky/30 font-bold">
                  Auction Structure
                </span>
              )}
            </div>
            <p className="text-[11px] text-terminal-muted">
              Chapter 6 Checklist • Multi-Timeframe Alignment & Participant Structure
            </p>
          </div>
        </div>

        {marketRegime && (
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border flex items-center space-x-1 ${
                marketRegime.structureType === 'TRENDING_DAY'
                  ? 'bg-bull/15 border-bull/40 text-bull'
                  : marketRegime.structureType === 'REVERSAL_DAY'
                  ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple'
                  : 'bg-amber/15 border-amber/40 text-amber'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>{marketRegime.structureLabel}</span>
            </span>
          </div>
        )}
      </div>

      {/* Grid of Checklist Criteria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
        {/* 1. Global / GIFT Nifty Cue */}
        <div className="p-2.5 rounded-lg bg-terminal-panel/60 border border-terminal-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-[10px] mb-1">
            <span className="flex items-center space-x-1">
              <Globe className="w-3 h-3 text-accent-sky" />
              <span>1. GIFT NIFTY / GAP</span>
            </span>
            <span className="text-[9px] px-1 rounded bg-terminal-panel border border-terminal-border">Global</span>
          </div>
          <div className="text-sm font-bold text-terminal-text">
            {preMarket?.giftNiftyGap || 'Flat (+5 pts)'}
          </div>
          <span className="text-[10px] text-terminal-muted mt-1">
            Bias: <strong className={preMarket?.globalTrend === 'BULLISH' ? 'text-bull' : 'text-bear'}>{preMarket?.globalTrend || 'NEUTRAL'}</strong>
          </span>
        </div>

        {/* 2. Daily 20 EMA Overall Trend */}
        <div className="p-2.5 rounded-lg bg-terminal-panel/60 border border-terminal-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-[10px] mb-1">
            <span className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-bull" />
              <span>2. DAILY 20 EMA TREND</span>
            </span>
            <span className="text-[9px] px-1 rounded bg-terminal-panel border border-terminal-border">Daily TF</span>
          </div>
          <div className="text-sm font-bold text-terminal-text">
            {preMarket?.dailyEma20Trend === 'BULLISH_ABOVE_20EMA' ? '📈 Above 20 EMA (Bullish)' : '📉 Below 20 EMA (Bearish)'}
          </div>
          <span className="text-[10px] text-terminal-muted mt-1">
            Macro structure filter
          </span>
        </div>

        {/* 3. CPR Width Day Prediction */}
        <div className="p-2.5 rounded-lg bg-terminal-panel/60 border border-terminal-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-[10px] mb-1">
            <span className="flex items-center space-x-1">
              <Layers className="w-3 h-3 text-accent-purple" />
              <span>3. CPR WIDTH PREDICTION</span>
            </span>
            <span className="text-[9px] px-1 rounded bg-terminal-panel border border-terminal-border">Structure</span>
          </div>
          <div className="text-sm font-bold text-terminal-text">
            {preMarket?.cprWidthForecast || 'AVERAGE_CPR'}
          </div>
          <span className="text-[10px] text-terminal-muted mt-1">
            {marketRegime?.participantType.replace(/_/g, ' ')}
          </span>
        </div>

        {/* 4. Supply & Demand Zones */}
        <div className="p-2.5 rounded-lg bg-terminal-panel/60 border border-terminal-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-terminal-muted text-[10px] mb-1">
            <span className="flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-amber" />
              <span>4. KEY SUPPLY / DEMAND</span>
            </span>
            <span className="text-[9px] px-1 rounded bg-terminal-panel border border-terminal-border">Levels</span>
          </div>
          <div className="text-[11px] font-bold text-terminal-text truncate">
            SZ: <span className="text-bear">{preMarket?.keySupplyZone || 'PDH / R1'}</span>
          </div>
          <div className="text-[11px] font-bold text-terminal-text truncate mt-0.5">
            DZ: <span className="text-bull">{preMarket?.keyDemandZone || 'PDL / S1'}</span>
          </div>
        </div>
      </div>

      {/* Initial Balance & Action Advice */}
      {marketRegime && (
        <div className="mt-2.5 pt-2 border-t border-terminal-border/60 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="text-terminal-muted flex items-center space-x-2">
            <span><strong>IB Range (09:15 - 10:15):</strong> ₹{marketRegime.initialBalance.ibl} - ₹{marketRegime.initialBalance.ibh} ({marketRegime.initialBalance.rangePts} pts)</span>
            <span>•</span>
            <span className="text-terminal-text">{marketRegime.initialBalance.status.replace(/_/g, ' ')}</span>
          </div>
          <div className="text-accent-sky font-medium">
            💡 {marketRegime.keyActionAdvice}
          </div>
        </div>
      )}
    </div>
  );
};
