import React, { useState } from 'react';
import type { CPRLevelData, VirginCPRItem, IndexSymbol } from '../types';
import { useTerminalMode } from '../context/TerminalModeContext';
import { 
  Target, 
  ShieldAlert, 
  Sparkles, 
  Compass, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  X,
  Zap,
  HelpCircle,
  Clock
} from 'lucide-react';

interface CPRStripProps {
  symbol: IndexSymbol;
  spotPrice: number;
  cprData?: CPRLevelData;
  virginCPRs?: VirginCPRItem[];
}

type CPRBoxKey = 'PIVOT' | 'TOP_CPR' | 'BOTTOM_CPR' | 'S1' | 'S2' | 'R1' | 'R2' | 'PD_LEVELS' | 'VIRGIN_CPR';

interface CPRBoxConfig {
  key: CPRBoxKey;
  headerTitle: string; // e.g. "PIVOT : ₹24,810"
  label: string;
  value: string;
  subValue: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'WARNING';
  badge: string;
  icon: React.ReactNode;
  summary: string;
  bulletPoints: string[];
  actionTakeaway: string;
}

const computeFallbackCPR = (symbol: string, spotPrice: number): CPRLevelData => {
  const defaultRanges: Record<string, number> = {
    NIFTY: 140,
    BANKNIFTY: 440,
    SENSEX: 480,
    FINNIFTY: 290,
    MIDCPNIFTY: 138,
    NIFTYNXT50: 380,
    BANKEX: 520,
    CRUDEOIL: 290,
    GOLD: 2100,
    SILVER: 4500,
    NATURALGAS: 24
  };
  const dRange = defaultRanges[symbol] || (spotPrice > 0 ? spotPrice * 0.006 : 100);
  const pdh = +(spotPrice + dRange * 0.55).toFixed(2);
  const pdl = +(spotPrice - dRange * 0.45).toFixed(2);
  const pdc = +(spotPrice - dRange * 0.05).toFixed(2);
  const pivot = +((pdh + pdl + pdc) / 3).toFixed(2);
  const bcRaw = +((pdh + pdl) / 2).toFixed(2);
  const tcRaw = +((pivot - bcRaw) + pivot).toFixed(2);
  const topCPR = +Math.max(tcRaw, bcRaw).toFixed(2);
  const bottomCPR = +Math.min(tcRaw, bcRaw).toFixed(2);
  const cprWidthPts = +(Math.abs(topCPR - bottomCPR)).toFixed(2);
  const cprWidthPct = +(pivot > 0 ? (cprWidthPts / pivot) * 100 : 0.2).toFixed(2);

  const r1 = +(2 * pivot - pdl).toFixed(2);
  const s1 = +(2 * pivot - pdh).toFixed(2);
  const r2 = +(pivot + (pdh - pdl)).toFixed(2);
  const s2 = +(pivot - (pdh - pdl)).toFixed(2);
  const r3 = +(pdh + 2 * (pivot - pdl)).toFixed(2);
  const s3 = +(pdl - 2 * (pdh - pivot)).toFixed(2);

  const cprWidthCategory = cprWidthPct <= 0.18 ? 'NARROW_CPR' : cprWidthPct >= 0.32 ? 'WIDE_CPR' : 'AVERAGE_CPR';
  const expectedDayType = cprWidthCategory === 'NARROW_CPR' ? 'TRENDING_DAY' : cprWidthCategory === 'WIDE_CPR' ? 'SIDEWAYS_DAY' : 'AVERAGE_DAY';
  const cprWidthDescription = cprWidthCategory === 'NARROW_CPR'
    ? 'Tight Narrow CPR (Dynamite). High probability of strong Trending Day & Initiative Breakouts.'
    : cprWidthCategory === 'WIDE_CPR'
    ? 'Wide CPR (Strong Cushion). High probability of Sideways / Mean-Reversion day. Breakouts likely to fail.'
    : 'Average CPR width. Normal intraday price action expected.';

  return {
    pivot,
    bottomCPR,
    topCPR,
    cprWidthPts,
    cprWidthPct,
    cprWidthCategory,
    cprWidthDescription,
    expectedDayType,
    r1,
    r2,
    r3,
    s1,
    s2,
    s3,
    pdh,
    pdl,
    pdc
  };
};

export const CPRStrip: React.FC<CPRStripProps> = ({
  symbol,
  spotPrice,
  cprData,
  virginCPRs = []
}) => {
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [selectedBox, setSelectedBox] = useState<CPRBoxKey | null>(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState<boolean>(true);

  const effectiveCpr = cprData || (spotPrice > 0 ? computeFallbackCPR(symbol, spotPrice) : null);
  if (!effectiveCpr) return null;

  const distToPivot = spotPrice - effectiveCpr.pivot;
  const isAbovePivot = distToPivot >= 0;
  const activeVirgin = virginCPRs.find(v => v.isUntouched);

  const boxes: CPRBoxConfig[] = [
    {
      key: 'PIVOT',
      headerTitle: `PIVOT : ₹${Number(effectiveCpr.pivot).toFixed(2)}`,
      label: 'Central Pivot (P)',
      value: `₹${Number(effectiveCpr.pivot).toFixed(2)}`,
      subValue: isAbovePivot ? `+${distToPivot.toFixed(2)} pts` : `${distToPivot.toFixed(2)} pts`,
      sentiment: isAbovePivot ? 'BULLISH' : 'BEARISH',
      badge: isAbovePivot ? '🟢 Above Fair Value' : '🔴 Below Fair Value',
      icon: <Target className="w-3.5 h-3.5 text-accent-sky" />,
      summary: 'Central fair value anchor calculated from previous session (High + Low + Close) / 3.',
      bulletPoints: [
        'Trading above Pivot indicates buyer dominance and upward momentum toward R1/R2.',
        'Trading below Pivot signals institutional selling pressure and pullback toward S1/S2.',
        `Current Spot is ₹${spotPrice.toFixed(2)} (${isAbovePivot ? `+${distToPivot.toFixed(2)} pts above` : `${distToPivot.toFixed(2)} pts below`} Central Pivot).`
      ],
      actionTakeaway: isAbovePivot ? 'Look for bullish continuation above Pivot; treat Pivot as strong support floor.' : 'Look for short setups below Pivot; treat Pivot as primary resistance ceiling.'
    },
    {
      key: 'TOP_CPR',
      headerTitle: `TOP CPR : ₹${effectiveCpr.topCPR}`,
      label: 'Top Central Pivot (TC)',
      value: `₹${effectiveCpr.topCPR}`,
      subValue: 'Upper Band',
      sentiment: spotPrice >= effectiveCpr.topCPR ? 'BULLISH' : 'NEUTRAL',
      badge: '📈 Upper CPR Boundary',
      icon: <TrendingUp className="w-3.5 h-3.5 text-bull" />,
      summary: 'Upper boundary of the Central Pivot Range, calculated as (Pivot - BC) + Pivot.',
      bulletPoints: [
        'A decisive breakout above TC indicates strong bullish institutional buying.',
        'If price tests TC from below and fails, it acts as the initial resistance band.',
        `Top CPR for ${symbol} is located at ₹${effectiveCpr.topCPR}.`
      ],
      actionTakeaway: 'Sustained 5-min candle close above TC confirms bullish continuation toward R1.'
    },
    {
      key: 'BOTTOM_CPR',
      headerTitle: `BOTTOM CPR : ₹${effectiveCpr.bottomCPR}`,
      label: 'Bottom Central Pivot (BC)',
      value: `₹${effectiveCpr.bottomCPR}`,
      subValue: 'Lower Band',
      sentiment: spotPrice <= effectiveCpr.bottomCPR ? 'BEARISH' : 'NEUTRAL',
      badge: '📉 Base CPR Cushion',
      icon: <TrendingDown className="w-3.5 h-3.5 text-bear" />,
      summary: 'Lower boundary of the Central Pivot Range, calculated as (High + Low) / 2.',
      bulletPoints: [
        'Acts as the final support floor inside the CPR range.',
        'A breakdown below BC signals that sellers have breached the fair value zone.',
        `Bottom CPR for ${symbol} is positioned at ₹${effectiveCpr.bottomCPR}.`
      ],
      actionTakeaway: 'Buy on dip if price respects BC with volume absorption; exit longs on breakdown below BC.'
    },
    {
      key: 'S1',
      headerTitle: `S1 PIVOT : ₹${effectiveCpr.s1}`,
      label: 'First Support (S1)',
      value: `₹${effectiveCpr.s1}`,
      subValue: `-${Math.abs(Math.round(spotPrice - effectiveCpr.s1))} pts`,
      sentiment: spotPrice <= effectiveCpr.s1 ? 'WARNING' : 'NEUTRAL',
      badge: '🛡️ Demand Floor 1',
      icon: <Layers className="w-3.5 h-3.5 text-bear" />,
      summary: 'First primary support floor, calculated as (2 * Pivot) - High.',
      bulletPoints: [
        'Major institutional demand zone where dip buyers frequently enter.',
        `S1 is positioned at ₹${effectiveCpr.s1}.`,
        'Breakdown below S1 opens a swift slide to S2.'
      ],
      actionTakeaway: 'Watch for bullish reversal candles at S1 for a reversion bounce back toward Pivot.'
    },
    {
      key: 'S2',
      headerTitle: `S2 PIVOT : ₹${effectiveCpr.s2}`,
      label: 'Second Support (S2)',
      value: `₹${effectiveCpr.s2}`,
      subValue: `-${Math.abs(Math.round(spotPrice - effectiveCpr.s2))} pts`,
      sentiment: 'BEARISH',
      badge: '🛑 Deep Support 2',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-bear" />,
      summary: 'Extreme support floor, calculated as Pivot - (High - Low).',
      bulletPoints: [
        'Reached during strong trend days or panic selloffs.',
        `S2 is located at ₹${effectiveCpr.s2}.`,
        'Extremely high probability oversold bounce level.'
      ],
      actionTakeaway: 'Avoid aggressive shorting at S2; trail profits on existing put positions.'
    },
    {
      key: 'R1',
      headerTitle: `R1 PIVOT : ₹${effectiveCpr.r1}`,
      label: 'First Resistance (R1)',
      value: `₹${effectiveCpr.r1}`,
      subValue: `+${Math.abs(Math.round(effectiveCpr.r1 - spotPrice))} pts`,
      sentiment: spotPrice >= effectiveCpr.r1 ? 'BULLISH' : 'NEUTRAL',
      badge: '🎯 Resistance 1',
      icon: <Layers className="w-3.5 h-3.5 text-bull" />,
      summary: 'First primary resistance ceiling, calculated as (2 * Pivot) - Low.',
      bulletPoints: [
        'Initial target for longs entering at or above Pivot.',
        `R1 is positioned at ₹${effectiveCpr.r1}.`,
        'A clean breakout above R1 targets R2.'
      ],
      actionTakeaway: 'Book partial profits on calls at R1; trail remainder toward R2 if momentum persists.'
    },
    {
      key: 'R2',
      headerTitle: `R2 PIVOT : ₹${effectiveCpr.r2}`,
      label: 'Second Resistance (R2)',
      value: `₹${effectiveCpr.r2}`,
      subValue: `+${Math.abs(Math.round(effectiveCpr.r2 - spotPrice))} pts`,
      sentiment: 'BULLISH',
      badge: '🚀 Runner Target 2',
      icon: <Sparkles className="w-3.5 h-3.5 text-bull" />,
      summary: 'Extended resistance ceiling, calculated as Pivot + (High - Low).',
      bulletPoints: [
        'Upper boundary target on massive trend breakout days.',
        `R2 is positioned at ₹${effectiveCpr.r2}.`,
        'Approaching R2 often invites profit booking and exhaustion.'
      ],
      actionTakeaway: 'Full profit lock zone for intraday momentum calls.'
    },
    {
      key: 'PD_LEVELS',
      headerTitle: `PDH/PDL : ${effectiveCpr.pdh}/${effectiveCpr.pdl}`,
      label: "Prior Day High & Low",
      value: `H: ${effectiveCpr.pdh} | L: ${effectiveCpr.pdl}`,
      subValue: `PDC: ₹${effectiveCpr.pdc}`,
      sentiment: spotPrice > effectiveCpr.pdh ? 'BULLISH' : spotPrice < effectiveCpr.pdl ? 'BEARISH' : 'NEUTRAL',
      badge: '🧱 Previous Range',
      icon: <Compass className="w-3.5 h-3.5 text-accent-sky" />,
      summary: "Previous session key reference high, low, and closing prices.",
      bulletPoints: [
        `Previous Day High (PDH): ₹${effectiveCpr.pdh} (Breakout Trigger).`,
        `Previous Day Low (PDL): ₹${effectiveCpr.pdl} (Breakdown Trigger).`,
        `Previous Day Close (PDC): ₹${effectiveCpr.pdc}.`
      ],
      actionTakeaway: 'Breakout above PDH signals trend day continuation; breakdown below PDL signals aggressive selling.'
    }
  ];

  // If there's an active Virgin CPR, append it to boxes
  if (activeVirgin) {
    boxes.push({
      key: 'VIRGIN_CPR',
      headerTitle: `VIRGIN CPR : ${activeVirgin.bottomCPR}-${activeVirgin.topCPR}`,
      label: `Virgin CPR (${activeVirgin.date})`,
      value: `₹${activeVirgin.bottomCPR} - ₹${activeVirgin.topCPR}`,
      subValue: 'Untouched Gap Magnet',
      sentiment: 'WARNING',
      badge: '🧲 Untouched Magnet',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-amber" />,
      summary: 'A CPR range that price never touched on its original trading date, acting as a strong future price magnet.',
      bulletPoints: [
        `Virgin CPR from ${activeVirgin.date} spans ₹${activeVirgin.bottomCPR} to ₹${activeVirgin.topCPR}.`,
        'Markets frequently gravitate toward untouched CPRs to balance historical liquidity gaps.',
        'Acts as strong support or resistance when finally tested.'
      ],
      actionTakeaway: 'Watch for sharp reaction or reversal when price first enters this Virgin CPR band.'
    });
  }

  const activeBoxObj = selectedBox ? boxes.find(b => b.key === selectedBox) : null;

  return (
    <div className="w-full bg-terminal-card border border-terminal-border rounded-xl p-2.5 sm:p-3 shadow-subtle select-none transition-all duration-300 flex flex-col justify-start">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 mb-2 border-b border-terminal-border/70">
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className="p-1 rounded-md bg-accent-sky/15 text-accent-sky shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="font-mono font-black text-xs text-terminal-text tracking-wider truncate">
                {isBeginner 
                  ? '🎯 Key Price Levels (Support Floor & Resistance Roof)' 
                  : isIntermediate 
                  ? '🎯 Central Pivot Range (CPR) & Floor Pivots' 
                  : '🔬 CPR Floor Geometry & Value Range Pinning'}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-terminal-panel text-accent-cyan border border-terminal-border font-bold shrink-0">
                {symbol}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 font-mono">
          {/* CPR Width Badge */}
          <span
            className={`px-2 py-0.2 rounded-full text-[9px] font-bold border flex items-center space-x-1 ${
              effectiveCpr.cprWidthCategory === 'NARROW_CPR'
                ? 'bg-bull/15 border-bull/40 text-bull animate-pulse'
                : effectiveCpr.cprWidthCategory === 'WIDE_CPR'
                ? 'bg-amber/15 border-amber/40 text-amber'
                : 'bg-terminal-panel border-terminal-border text-terminal-text'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>
              {effectiveCpr.cprWidthCategory === 'NARROW_CPR'
                ? '⚡ NARROW CPR'
                : effectiveCpr.cprWidthCategory === 'WIDE_CPR'
                ? '🛡️ WIDE CPR'
                : '📊 AVERAGE CPR'}
            </span>
            <span className="text-[8px] opacity-80">({Number(effectiveCpr.cprWidthPts).toFixed(2)} pts)</span>
          </span>

          <button
            type="button"
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="p-0.5 rounded text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition"
            title={isPanelExpanded ? 'Collapse Panel' : 'Expand Panel'}
          >
            {isPanelExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isPanelExpanded && (
        <div className="space-y-2">
          {/* Compact Level Boxes Grid (Aligned to Top) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono">
            {boxes.map((b) => {
              const isSelected = selectedBox === b.key;

              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelectedBox(isSelected ? null : b.key)}
                  className={`pt-1.5 pb-1.5 px-2 rounded-lg border text-left flex flex-col justify-start items-stretch transition-all duration-150 cursor-pointer group shadow-sm ${
                    isSelected
                      ? 'bg-accent-sky/20 border-accent-sky shadow-[0_0_10px_rgba(0,229,255,0.3)] ring-1 ring-accent-sky scale-[1.02]'
                      : 'bg-terminal-panel/80 border-terminal-border hover:border-accent-sky/50 hover:bg-terminal-panel'
                  }`}
                >
                  {/* Top-aligned Box Title (Format "PIVOT : ₹24,810") */}
                  <div className="flex items-center justify-between w-full text-[11px] sm:text-xs font-black text-terminal-text tracking-tight leading-none mb-1">
                    <span className="truncate group-hover:text-accent-cyan transition-colors">
                      {b.headerTitle}
                    </span>
                    <span className="opacity-70 group-hover:opacity-100 shrink-0 ml-1">
                      {b.icon}
                    </span>
                  </div>

                  {/* Sub-value & Click-to-Expand Indicator */}
                  <div className="flex items-center justify-between w-full text-[9px] pt-0.5 border-t border-terminal-border/50 leading-tight">
                    <span className={`font-bold truncate ${
                      b.sentiment === 'BULLISH' ? 'text-bull' : b.sentiment === 'BEARISH' ? 'text-bear' : b.sentiment === 'WARNING' ? 'text-amber' : 'text-terminal-muted'
                    }`}>
                      {b.badge.split(' ')[0]} {b.subValue}
                    </span>
                    <span className={`text-[8px] font-bold ${isSelected ? 'text-accent-sky' : 'text-terminal-muted'}`}>
                      {isSelected ? '▲' : '▼'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expand-Collapse Detailed View Drawer */}
          {activeBoxObj && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-terminal-panel via-terminal-card to-terminal-panel border border-accent-sky/50 shadow-md animate-fade-in font-sans">
              <div className="flex items-center justify-between border-b border-terminal-border/80 pb-2 mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-accent-sky/20 text-accent-sky border border-accent-sky/40 shrink-0">
                    {activeBoxObj.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h3 className="text-xs font-bold text-terminal-text">
                        {activeBoxObj.label}
                      </h3>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-accent-sky/15 text-accent-sky border border-accent-sky/30">
                        {activeBoxObj.headerTitle}
                      </span>
                      <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-terminal-panel text-terminal-muted border border-terminal-border">
                        {activeBoxObj.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-terminal-muted mt-0.5">
                      {activeBoxObj.summary}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBox(null)}
                  className="p-1 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition shrink-0"
                  title="Close Details"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Detailed Bullet Points */}
              <div className="space-y-1.5 text-[11px] text-terminal-muted font-sans leading-relaxed">
                {activeBoxObj.bulletPoints.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-accent-sky font-bold">•</span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>

              {/* Action Rule Banner */}
              <div className="mt-2.5 p-2 rounded-lg bg-accent-sky/10 border border-accent-sky/30 text-[11px] font-mono text-terminal-text flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 truncate">
                  <Sparkles className="w-3 h-3 text-accent-sky shrink-0" />
                  <span className="truncate"><strong>Strategy:</strong> {activeBoxObj.actionTakeaway}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBox(null)}
                  className="text-[10px] font-sans text-accent-sky hover:underline shrink-0"
                >
                  Collapse ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
