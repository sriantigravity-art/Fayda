import React from 'react';
import type { CPRLevelData, VirginCPRItem, IndexSymbol } from '../types';
import { Target, ShieldAlert, Sparkles, Compass, Layers } from 'lucide-react';

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
  if (!cprData) return null;

  const distToPivot = spotPrice - cprData.pivot;
  const isAbovePivot = distToPivot >= 0;

  const activeVirgin = virginCPRs.find(v => v.isUntouched);

  return (
    <div className="w-full bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-subtle mb-3">
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
                ? '⚡ NARROW CPR (High Trend Prob)'
                : cprData.cprWidthCategory === 'WIDE_CPR'
                ? '🛡️ WIDE CPR (Chop / Reversal Prob)'
                : '📊 AVERAGE CPR'}
            </span>
            <span className="text-[10px] opacity-80">({cprData.cprWidthPts} pts • {cprData.cprWidthPct}%)</span>
          </span>
        </div>
      </div>

      {/* CPR Level Cards Strip */}
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
