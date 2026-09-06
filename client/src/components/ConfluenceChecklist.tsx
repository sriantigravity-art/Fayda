import React from 'react';
import { ShieldCheck, CheckCircle2, Award, Zap, Activity } from 'lucide-react';
import { useTerminalMode } from '../context/TerminalModeContext';
import type { TipConfluenceBreakdown } from '../types';

export const ConfluenceChecklist: React.FC<{
  breakdown?: TipConfluenceBreakdown;
  role?: 'BUYER' | 'SELLER';
  score?: number;
}> = ({ breakdown, role = 'BUYER', score = 85 }) => {
  const { isBeginner, isIntermediate, isExpert, mode } = useTerminalMode();

  if (!breakdown) return null;

  // Factor definitions customized dynamically per trader mode
  const getFactorLabel = (key: string, defaultLabel: string): string => {
    if (isBeginner) {
      switch (key) {
        case 'oiConcentration': return '1. Big Player Defense Wall (OI Support/Roof)';
        case 'oiChange5m': return '2. Smart Money Live Inflow (5-Min Flow)';
        case 'emaStructure': return '3. Overall Market Trend (Moving Averages)';
        case 'indiaVix': return '4. Market Speed & Panic Gauge (India VIX)';
        case 'vwapBenchmark': return '5. Fair Value Price Floor (VWAP)';
        case 'pcrVelocity': return '6. Buyers vs Sellers Balance (Put-Call Ratio)';
        case 'bollingerBands': return '7. Safe Price Range Highway (Bollinger Bands)';
        case 'rsiMomentum': return '8. Buying Energy Speedometer (RSI)';
        case 'imiCandles': return '9. Green vs Red Candle Strength (IMI)';
        case 'maxPain': return '10. Expiry Safety Magnet (Max Pain)';
        default: return defaultLabel;
      }
    } else if (isExpert) {
      switch (key) {
        case 'oiConcentration': return '1. Strike OI Concentration & Dealer Gamma Wall';
        case 'oiChange5m': return '2. 5-Min Delta OI Microstructure Order Flow';
        case 'emaStructure': return '3. Multi-Timeframe EMA Alignment (9/20/50/200)';
        case 'indiaVix': return '4. India VIX Regime & IV Crush/Spike Velocity';
        case 'vwapBenchmark': return '5. VWAP Benchmark & Institutional Volume Delta';
        case 'pcrVelocity': return '6. Put-Call Ratio (PCR) Skew & 1st Derivative ΔPCR';
        case 'bollingerBands': return '7. Bollinger Bandwidth & 2σ Statistical Barrier';
        case 'rsiMomentum': return '8. RSI 14-Period Momentum & Divergence Filter';
        case 'imiCandles': return '9. Intraday Momentum Index (IMI) Candle Drift';
        case 'maxPain': return '10. Max Pain Magnetic Strike & Expiry Gravitational Pull';
        default: return defaultLabel;
      }
    }
    // Intermediate mode defaults
    return defaultLabel;
  };

  const factors = [
    { key: 'oiConcentration', defaultLabel: '1. Open Interest (OI) Concentration & Walls', weight: 15, item: breakdown.oiConcentration },
    { key: 'oiChange5m', defaultLabel: '2. 5-Min Delta OI Order Flow Velocity', weight: 15, item: breakdown.oiChange5m },
    { key: 'emaStructure', defaultLabel: '3. Moving Averages (9, 20, 50, 200 EMA)', weight: 12, item: breakdown.emaStructure },
    { key: 'indiaVix', defaultLabel: '4. India VIX Volatility Regime', weight: 10, item: breakdown.indiaVix },
    { key: 'vwapBenchmark', defaultLabel: '5. VWAP Dynamic Institutional Anchor', weight: 10, item: breakdown.vwapBenchmark },
    { key: 'pcrVelocity', defaultLabel: '6. Put-Call Ratio (PCR) & Delta PCR Trend', weight: 10, item: breakdown.pcrVelocity },
    { key: 'bollingerBands', defaultLabel: '7. Bollinger Bands 2σ Envelope', weight: 8, item: breakdown.bollingerBands },
    { key: 'rsiMomentum', defaultLabel: '8. Relative Strength Index (RSI 14)', weight: 7, item: breakdown.rsiMomentum },
    { key: 'imiCandles', defaultLabel: '9. Intraday Momentum Index (IMI)', weight: 5, item: breakdown.imiCandles },
    { key: 'maxPain', defaultLabel: '10. Max Pain Magnetic Strike', weight: 3, item: breakdown.maxPain },
  ];

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className="mt-3 p-3.5 rounded-xl bg-slate-900/95 dark:bg-black/90 border border-slate-700/80 dark:border-terminal-border/90 text-left space-y-2.5 shadow-xl"
    >
      {/* Header bar with Mode Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 dark:border-terminal-border/60 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent-gold" />
          <div>
            <span className="text-xs font-mono font-black text-slate-200 dark:text-terminal-text uppercase tracking-wide">
              {isBeginner 
                ? `🔰 10-Indicator Safety Checklist (${breakdown.confirmedCount}/10 Safe Conditions Met)` 
                : isExpert 
                ? `🔬 Quantitative 10-Factor Confluence Engine (${breakdown.confirmedCount}/10 Validated)` 
                : `📊 10-Indicator Technical Confluence Matrix (${breakdown.confirmedCount}/10 Confirmed)`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border ${
            isBeginner
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : isExpert
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40'
          }`}>
            {isBeginner ? '🔰 Beginner Safe Mode' : isExpert ? '🔬 Expert Quant Mode' : '📊 Intermediate Mode'}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black bg-accent-gold/20 text-accent-gold border border-accent-gold/40">
            🎯 {breakdown.totalConfluenceScore}% / 100%
          </span>
        </div>
      </div>

      {/* Grid of 10 Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        {factors.map(f => {
          const label = getFactorLabel(f.key, f.defaultLabel);
          return (
            <div 
              key={f.key}
              className={`p-2 rounded-lg border flex flex-col justify-between space-y-1 transition-all ${
                f.item?.confirmed 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-slate-200' 
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold truncate">
                  {f.item?.confirmed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-500 shrink-0 flex items-center justify-center text-[9px] text-slate-500">•</span>
                  )}
                  <span className="truncate" title={label}>{label}</span>
                </div>
                <span className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ml-1.5 ${
                  f.item?.confirmed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                }`}>
                  {f.item?.score || 0}/{f.weight} pts
                </span>
              </div>
              <p className="text-[10px] text-slate-300 dark:text-terminal-muted leading-tight pl-5">
                {f.item?.details || (isBeginner ? 'Awaiting market safety confirmation' : 'Awaiting tick trigger')}
              </p>
            </div>
          );
        })}

        {/* FII/DII Institutional Flow */}
        {breakdown.fiiDiiBonus && (
          <div className="sm:col-span-2 p-2 rounded-lg bg-sky-950/40 border border-sky-500/40 text-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🏛️</span>
              <div>
                <span className="font-bold text-[11px]">
                  {isBeginner 
                    ? 'Big Institutional Flow Bonus (FII / DII Accumulation)' 
                    : isExpert 
                    ? 'FII / DII Net Derivative Positioning & Cash Flow' 
                    : 'FII / DII Institutional Flow Confluence'}
                </span>
                <p className="text-[10px] text-slate-300 dark:text-terminal-muted">{breakdown.fiiDiiBonus.details}</p>
              </div>
            </div>
            <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 shrink-0">
              +{breakdown.fiiDiiBonus.bonus}% Institutional Boost
            </span>
          </div>
        )}
      </div>

      {/* Mode-tailored Guidance Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800">
        <div>
          {isBeginner ? (
            <span className="text-emerald-300">
              💡 <strong>Beginner Rule:</strong> Trade armed only when ≥ 80% safe criteria match. Never risk &gt; 2% of capital.
            </span>
          ) : isExpert ? (
            <span className="text-purple-300">
              🔬 <strong>Quant Logic:</strong> Standard Dev buffer &gt; 1.5σ • Black-Scholes IV pricing curve applied.
            </span>
          ) : (
            <span className="text-sky-300">
              📊 <strong>Technical Rule:</strong> Multi-indicator alignment across CPR, VWAP, and derivatives order flow.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span>Role: <strong className="text-slate-200">{role === 'SELLER' ? '🛡️ Option Seller (High POP)' : '🟢 Option Buyer (High Delta)'}</strong></span>
          <span>•</span>
          <span className="text-accent-gold font-bold">≥ 80% Win Probability</span>
        </div>
      </div>
    </div>
  );
};
