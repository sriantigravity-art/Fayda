import React from 'react';
import type { CPRLevelData, VirginCPRItem, IndexSymbol } from '../types';
import { useTerminalMode } from '../context/TerminalModeContext';
import { Target, ShieldAlert, Sparkles, Compass, Layers, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface CPRStripProps {
  symbol: IndexSymbol;
  spotPrice: number;
  cprData?: CPRLevelData;
  virginCPRs?: VirginCPRItem[];
}

export const CPRStrip: React.FC<CPRStripProps> = ({
  symbol,
  spotPrice,
  cprData,
  virginCPRs = []
}) => {
  const { isBeginner, isExpert } = useTerminalMode();
  if (!cprData) return null;

  const distToPivot = spotPrice - cprData.pivot;
  const isAbovePivot = distToPivot >= 0;
  const activeVirgin = virginCPRs.find(v => v.isUntouched);

  // =========================================================================
  // VIEW 1: BEGINNER MODE (Intuitive Market Compass & Safe/Caution Zones)
  // =========================================================================
  if (isBeginner) {
    const rangeSpan = Math.max(1, cprData.pdh - cprData.pdl);
    const pricePosPct = Math.min(100, Math.max(0, ((spotPrice - cprData.pdl) / rangeSpan) * 100));

    return (
      <div className="w-full bg-terminal-card border border-terminal-border rounded-xl p-3.5 sm:p-4 shadow-subtle mb-3 select-none">
        {/* Beginner Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-lg ${isAbovePivot ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'}`}>
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-terminal-text">
                Market Compass & Pivot Level ({symbol})
              </span>
              <p className="text-[11px] text-terminal-muted">
                Simple daily roadmap: Central Pivot is the market's fair value baseline
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
              isAbovePivot ? 'bg-bull/15 border-bull/40 text-bull' : 'bg-bear/15 border-bear/40 text-bear'
            }`}>
              {isAbovePivot ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isAbovePivot ? '🟢 Above Pivot (Bullish Territory)' : '🔴 Below Pivot (Caution Territory)'}</span>
            </span>
          </div>
        </div>

        {/* Beginner Compass Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs mt-2">
          {/* Day Floor */}
          <div className="p-2.5 rounded-lg bg-terminal-panel border border-terminal-border flex flex-col">
            <span className="text-[10px] text-terminal-muted font-sans font-bold uppercase">1. Yesterday's Low (Support Floor)</span>
            <span className="text-sm font-bold text-terminal-text mt-0.5">₹{cprData.pdl}</span>
            <span className="text-[10px] text-bull mt-0.5">Major buying defense level</span>
          </div>

          {/* Central Pivot */}
          <div className={`p-2.5 rounded-lg border flex flex-col ${
            isAbovePivot ? 'bg-bull/10 border-bull/30' : 'bg-bear/10 border-bear/30'
          }`}>
            <span className="text-[10px] text-accent-sky font-sans font-bold uppercase">2. Central Pivot (Fair Value)</span>
            <span className="text-sm font-bold text-terminal-text mt-0.5">₹{cprData.pivot}</span>
            <span className={`text-[10px] font-bold mt-0.5 ${isAbovePivot ? 'text-bull' : 'text-bear'}`}>
              {isAbovePivot ? `+${distToPivot.toFixed(1)} pts above Pivot` : `${distToPivot.toFixed(1)} pts below Pivot`}
            </span>
          </div>

          {/* Day Ceiling */}
          <div className="p-2.5 rounded-lg bg-terminal-panel border border-terminal-border flex flex-col">
            <span className="text-[10px] text-terminal-muted font-sans font-bold uppercase">3. Yesterday's High (Resistance Ceiling)</span>
            <span className="text-sm font-bold text-terminal-text mt-0.5">₹{cprData.pdh}</span>
            <span className="text-[10px] text-bear mt-0.5">Upside profit-booking zone</span>
          </div>
        </div>

        {/* Beginner Visual Range Progress Bar */}
        <div className="mt-3 pt-2.5 border-t border-terminal-border/60">
          <div className="flex items-center justify-between text-[10px] font-mono text-terminal-muted mb-1">
            <span>Day Floor: ₹{cprData.pdl}</span>
            <span className="text-terminal-text font-bold">Current Spot: ₹{spotPrice} ({pricePosPct.toFixed(0)}% in range)</span>
            <span>Day Ceiling: ₹{cprData.pdh}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-terminal-panel border border-terminal-border overflow-hidden relative">
            <div
              className={`h-full transition-all duration-500 ${isAbovePivot ? 'bg-bull' : 'bg-bear'}`}
              style={{ width: `${pricePosPct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: INTERMEDIATE & EXPERT MODE (Full 7-Level Pivot Ladder & VCPR)
  // =========================================================================
  return (
    <div className="w-full bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-subtle mb-3 select-none">
      {/* Header & CPR Width Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-accent-sky/15 text-accent-sky">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-xs sm:text-sm text-terminal-text tracking-wide">
                CENTRAL PIVOT RANGE (CPR) & FLOOR PIVOTS
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-terminal-panel text-terminal-muted border border-terminal-border">
                {symbol}
              </span>
              {isExpert && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/30 font-bold">
                  Quant GEX & S/R
                </span>
              )}
            </div>
            <p className="text-[11px] text-terminal-muted">
              {cprData.cprWidthDescription}
            </p>
          </div>
        </div>

        {/* CPR Width Status Badge */}
        <div className="flex items-center space-x-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border flex items-center space-x-1 ${
              cprData.cprWidthCategory === 'NARROW_CPR'
                ? 'bg-bull/15 border-bull/40 text-bull animate-pulse'
                : cprData.cprWidthCategory === 'WIDE_CPR'
                ? 'bg-amber/15 border-amber/40 text-amber'
                : 'bg-terminal-panel border-terminal-border text-terminal-text'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>
              {cprData.cprWidthCategory === 'NARROW_CPR'
                ? '⚡ NARROW CPR (Trend Day Prob > 70%)'
                : cprData.cprWidthCategory === 'WIDE_CPR'
                ? '🛡️ WIDE CPR (Chop / Fade Breakouts)'
                : '📊 AVERAGE CPR'}
            </span>
            <span className="text-[10px] opacity-80">({cprData.cprWidthPts} pts • {cprData.cprWidthPct}%)</span>
          </span>
        </div>
      </div>

      {/* CPR Level Cards Strip (7 Levels) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs font-mono">
        {/* S2 */}
        <div className="p-2 rounded-lg bg-terminal-panel/60 border border-terminal-border flex flex-col items-center justify-center">
          <span className="text-[10px] text-bear font-bold">S2 PIVOT</span>
          <span className="text-terminal-text font-bold">₹{cprData.s2}</span>
          <span className="text-[9px] text-terminal-muted">-{Math.round(spotPrice - cprData.s2)} pts</span>
        </div>

        {/* S1 */}
        <div className="p-2 rounded-lg bg-terminal-panel/60 border border-terminal-border flex flex-col items-center justify-center">
          <span className="text-[10px] text-bear font-bold">S1 PIVOT</span>
          <span className="text-terminal-text font-bold">₹{cprData.s1}</span>
          <span className="text-[9px] text-terminal-muted">-{Math.round(spotPrice - cprData.s1)} pts</span>
        </div>

        {/* Bottom CPR (BC) */}
        <div className="p-2 rounded-lg bg-accent-sky/5 border border-accent-sky/30 flex flex-col items-center justify-center">
          <span className="text-[10px] text-accent-sky font-bold">BOTTOM CPR (BC)</span>
          <span className="text-terminal-text font-bold">₹{cprData.bottomCPR}</span>
          <span className="text-[9px] text-terminal-muted">Base Cushion</span>
        </div>

        {/* Central Pivot (P) */}
        <div className={`p-2 rounded-lg border flex flex-col items-center justify-center ${
          isAbovePivot
            ? 'bg-bull/10 border-bull/40 ring-1 ring-bull/20'
            : 'bg-bear/10 border-bear/40 ring-1 ring-bear/20'
        }`}>
          <div className="flex items-center space-x-1">
            <Target className="w-3 h-3 text-accent-sky" />
            <span className="text-[10px] font-bold text-terminal-text">PIVOT (P)</span>
          </div>
          <span className="text-sm font-bold text-terminal-text">₹{cprData.pivot}</span>
          <span className={`text-[10px] font-bold ${isAbovePivot ? 'text-bull' : 'text-bear'}`}>
            {isAbovePivot ? `+${distToPivot.toFixed(1)} pts` : `${distToPivot.toFixed(1)} pts`}
          </span>
        </div>

        {/* Top CPR (TC) */}
        <div className="p-2 rounded-lg bg-accent-sky/5 border border-accent-sky/30 flex flex-col items-center justify-center">
          <span className="text-[10px] text-accent-sky font-bold">TOP CPR (TC)</span>
          <span className="text-terminal-text font-bold">₹{cprData.topCPR}</span>
          <span className="text-[9px] text-terminal-muted">Top Band</span>
        </div>

        {/* R1 */}
        <div className="p-2 rounded-lg bg-terminal-panel/60 border border-terminal-border flex flex-col items-center justify-center">
          <span className="text-[10px] text-bull font-bold">R1 PIVOT</span>
          <span className="text-terminal-text font-bold">₹{cprData.r1}</span>
          <span className="text-[9px] text-terminal-muted">+{Math.round(cprData.r1 - spotPrice)} pts</span>
        </div>

        {/* R2 */}
        <div className="p-2 rounded-lg bg-terminal-panel/60 border border-terminal-border flex flex-col items-center justify-center">
          <span className="text-[10px] text-bull font-bold">R2 PIVOT</span>
          <span className="text-terminal-text font-bold">₹{cprData.r2}</span>
          <span className="text-[9px] text-terminal-muted">+{Math.round(cprData.r2 - spotPrice)} pts</span>
        </div>
      </div>

      {/* Prior Day Reference Levels & Virgin CPR Warning */}
      <div className="mt-2.5 pt-2 border-t border-terminal-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex items-center space-x-3 text-terminal-muted">
          <span>PDH: <strong className="text-terminal-text">₹{cprData.pdh}</strong></span>
          <span>•</span>
          <span>PDL: <strong className="text-terminal-text">₹{cprData.pdl}</strong></span>
          <span>•</span>
          <span>PDC: <strong className="text-terminal-text">₹{cprData.pdc}</strong></span>
        </div>

        {activeVirgin && (
          <div className="flex items-center space-x-1.5 text-amber bg-amber/10 px-2 py-0.5 rounded border border-amber/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              <strong>Virgin CPR ({activeVirgin.date}):</strong> ₹{activeVirgin.bottomCPR} - ₹{activeVirgin.topCPR} (Strong Magnet / Unfilled Gap)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
