import React from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { Gauge, Sparkles, TrendingUp, TrendingDown, HelpCircle, ShieldCheck } from 'lucide-react';

export const PcrGauges: React.FC = () => {
  const { currentIndexState, selectedIndex } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();

  if (!currentIndexState) return null;

  const { pcr } = currentIndexState;
  const { 
    overallPcr, 
    atmPlusMinus5Pcr, 
    atmPlusMinus10Pcr, 
    pcr1mChange, 
    pcr5mChange, 
    sentiment,
    totalCallOIChange1m,
    totalPutOIChange1m
  } = pcr;

  const getSentimentInfo = () => {
    switch (sentiment) {
      case 'EXTREMELY_BULLISH':
        return { text: '🔥 EXTREMELY BULLISH', color: 'text-bull bg-bull-subtle border-bull/40', desc: 'Aggressive Put Writing Support Floor' };
      case 'BULLISH':
        return { text: '🟢 BULLISH BIAS', color: 'text-bull bg-bull-subtle border-bull/30', desc: 'Put Writing outpaces Call Writing' };
      case 'EXTREMELY_BEARISH':
        return { text: '🚨 EXTREMELY BEARISH', color: 'text-bear bg-bear-subtle border-bear/40', desc: 'Massive Call Writing Resistance Overhead' };
      case 'BEARISH':
        return { text: '🔴 BEARISH BIAS', color: 'text-bear bg-bear-subtle border-bear/30', desc: 'Call Writing dominates at key resistance' };
      default:
        return { text: '⚖️ NEUTRAL / BALANCED', color: 'text-amber bg-amber-subtle border-amber/30', desc: 'Rangebound option flow' };
    }
  };

  const sentInfo = getSentimentInfo();
  const gaugePercent = Math.min(100, Math.max(0, Math.round(((atmPlusMinus5Pcr - 0.5) / 1.3) * 100)));

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl p-3.5 shadow-lg flex flex-col justify-between transition-all duration-300">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-accent-cyan" />
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-terminal-text">
              {isBeginner ? `${selectedIndex} Market Sentiment Meter` : `${selectedIndex} PCR MOMENTUM RADAR`}
            </h3>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${sentInfo.color}`}>
            {sentInfo.text}
          </span>
        </div>

        {/* BEGINNER MODE SIMPLIFIED VIEW */}
        {isBeginner ? (
          <div className="space-y-2.5 my-1 animate-in fade-in duration-200 font-sans">
            <div className="bg-terminal-bg border border-terminal-border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-terminal-text">
                  {atmPlusMinus5Pcr >= 1.05 ? '🟢 Buyers Dominant' : atmPlusMinus5Pcr <= 0.90 ? '🔴 Sellers Dominant' : '🟡 Neutral Market'}
                </span>
                <span className="font-mono font-black text-sm text-accent-cyan">
                  {atmPlusMinus5Pcr >= 1.05 ? `${Math.round(gaugePercent)}% Bullish` : `${Math.round(100 - gaugePercent)}% Bearish`}
                </span>
              </div>

              {/* Intuitive Colored Meter */}
              <div className="w-full bg-terminal-panel rounded-full h-2.5 my-2 overflow-hidden border border-terminal-border flex">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    atmPlusMinus5Pcr >= 1.05 ? 'bg-bull' : atmPlusMinus5Pcr <= 0.90 ? 'bg-bear' : 'bg-amber'
                  }`}
                  style={{ width: `${gaugePercent}%` }}
                />
              </div>

              <p className="text-[11px] text-terminal-muted leading-relaxed">
                {atmPlusMinus5Pcr >= 1.05 
                  ? 'Put writers (institutional support) are actively creating a safety floor. Dips are likely to find buyers.' 
                  : atmPlusMinus5Pcr <= 0.90 
                    ? 'Call writers (institutional resistance) are blocking upside. Rallies are likely to face selling pressure.' 
                    : 'Option activity is balanced. Market is in a sideways consolidation range.'}
              </p>
            </div>
          </div>
        ) : (
          /* INTERMEDIATE & EXPERT VIEWS */
          <>
            {/* Primary ATM +-5 PCR Highlight */}
            <div className="bg-terminal-bg border border-terminal-border rounded-xl p-3 my-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-mono text-terminal-muted">
                  ATM ± 5 STRIKES PCR (SMART MONEY):
                </span>
                <span className="text-xl font-mono font-black text-terminal-text tracking-wide">
                  {atmPlusMinus5Pcr.toFixed(2)}
                </span>
              </div>

              {/* Visual Bar Gauge */}
              <div className="w-full bg-terminal-panel rounded-full h-2 my-2 overflow-hidden border border-terminal-border flex">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    atmPlusMinus5Pcr >= 1.2
                      ? 'bg-bull shadow-[0_0_10px_rgba(0,245,155,0.6)]'
                      : atmPlusMinus5Pcr <= 0.8
                      ? 'bg-bear shadow-[0_0_10px_rgba(255,59,105,0.6)]'
                      : 'bg-amber'
                  }`}
                  style={{ width: `${gaugePercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[9px] font-mono text-terminal-muted">
                <span>0.50 (Oversold/Bearish)</span>
                <span>1.00 (Neutral)</span>
                <span>1.80 (Overbought/Bullish)</span>
              </div>
            </div>

            {/* Multi-Horizon Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px]">
              <div className="bg-terminal-panel/60 p-2 rounded-lg border border-terminal-border/50">
                <span className="text-terminal-muted block text-[9px]">OVERALL PCR</span>
                <span className="font-bold text-terminal-text text-xs">{overallPcr.toFixed(2)}</span>
              </div>
              <div className="bg-terminal-panel/60 p-2 rounded-lg border border-terminal-border/50">
                <span className="text-terminal-muted block text-[9px]">ATM ±10 PCR</span>
                <span className="font-bold text-terminal-text text-xs">{atmPlusMinus10Pcr.toFixed(2)}</span>
              </div>
              <div className="bg-terminal-panel/60 p-2 rounded-lg border border-terminal-border/50">
                <span className="text-terminal-muted block text-[9px]">1-MIN PCR Δ</span>
                <span className={`font-bold text-xs ${pcr1mChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {pcr1mChange >= 0 ? '▲ +' : '▼ '}{pcr1mChange.toFixed(3)}
                </span>
              </div>
              <div className="bg-terminal-panel/60 p-2 rounded-lg border border-terminal-border/50">
                <span className="text-terminal-muted block text-[9px]">5-MIN PCR Δ</span>
                <span className={`font-bold text-xs ${pcr5mChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {pcr5mChange >= 0 ? '▲ +' : '▼ '}{pcr5mChange.toFixed(3)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="text-[10px] font-mono text-terminal-muted pt-2 border-t border-terminal-border/40 mt-2 flex justify-between">
        <span>Total 1m CE Δ: <strong className={totalCallOIChange1m >= 0 ? 'text-bear' : 'text-bull'}>{(totalCallOIChange1m / 100000).toFixed(2)}L</strong></span>
        <span>Total 1m PE Δ: <strong className={totalPutOIChange1m >= 0 ? 'text-bull' : 'text-bear'}>{(totalPutOIChange1m / 100000).toFixed(2)}L</strong></span>
      </div>
    </div>
  );
};

