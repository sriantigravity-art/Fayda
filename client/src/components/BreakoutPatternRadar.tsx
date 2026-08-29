import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Clock, 
  Compass, 
  Layers, 
  ChevronDown, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import type { TimeframeKey, ChartPatternType } from '../types';

export const BreakoutPatternRadar: React.FC = () => {
  const { currentIndexState, selectedIndex } = useMarket();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedTf, setSelectedTf] = useState<TimeframeKey>('15m');

  if (!currentIndexState) return null;

  const { spotPrice, patternBreakout } = currentIndexState;
  const pb = patternBreakout;

  const timeframes: { key: TimeframeKey; label: string; group: 'SCALP' | 'SWING' | 'MACRO' }[] = [
    { key: '1m', label: '1m', group: 'SCALP' },
    { key: '3m', label: '3m', group: 'SCALP' },
    { key: '5m', label: '5m', group: 'SCALP' },
    { key: '15m', label: '15m', group: 'SWING' },
    { key: '1h', label: '1h', group: 'SWING' },
    { key: '4h', label: '4h', group: 'SWING' },
    { key: '1D', label: '1D (Day)', group: 'MACRO' },
    { key: '1W', label: '1W (Week)', group: 'MACRO' },
    { key: '1M', label: '1M (Month)', group: 'MACRO' },
    { key: '6M', label: '6M (6-Month)', group: 'MACRO' }
  ];

  // Helper formatting
  const isUp = pb?.predictedBreakout.direction === 'UPWARD_BREAKOUT';
  const isDown = pb?.predictedBreakout.direction === 'DOWNWARD_BREAKDOWN';
  const prob = pb?.predictedBreakout.probability || 85;

  const getPatternIcon = (type?: ChartPatternType) => {
    switch (type) {
      case 'TRIPLE_TOP':
      case 'DOUBLE_TOP':
      case 'DESCENDING_TRIANGLE':
      case 'HEAD_AND_SHOULDERS':
        return <TrendingDown className="w-4 h-4 text-bear" />;
      case 'TRIPLE_BOTTOM':
      case 'DOUBLE_BOTTOM':
      case 'ASCENDING_TRIANGLE':
      case 'INVERSE_HEAD_AND_SHOULDERS':
        return <TrendingUp className="w-4 h-4 text-bull" />;
      default:
        return <Compass className="w-4 h-4 text-accent-cyan" />;
    }
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl flex flex-col overflow-hidden shadow-xl transition-all duration-300">
      {/* Header Bar & Accordion Trigger */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-3.5 bg-terminal-panel/60 cursor-pointer select-none group/hdr transition-all ${isExpanded ? 'border-b border-terminal-border' : ''}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Title & Badge */}
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-6 rounded-full bg-accent-cyan shadow-[0_0_10px_#00E5FF] shrink-0" />
            <div className="p-2 rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_12px_rgba(0,229,255,0.25)] group-hover/hdr:scale-105 transition-transform shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(0,229,255,0.3)] group-hover/hdr:text-accent-cyan transition-colors">
                  MULTI-TIMEFRAME S/R, PATTERN & BREAKOUT PREDICTOR
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan font-black border border-accent-cyan/40 shadow-sm">
                  {selectedIndex}
                </span>
                {pb && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black border shadow-sm ${
                    isUp 
                      ? 'bg-bull/20 text-bull border-bull/40 shadow-[0_0_10px_rgba(0,245,155,0.25)]' 
                      : isDown 
                      ? 'bg-bear/20 text-bear border-bear/40 shadow-[0_0_10px_rgba(255,59,105,0.25)]' 
                      : 'bg-amber/20 text-amber border-amber/40'
                  }`}>
                    {isUp ? '🚀 UPWARD BREAKOUT' : isDown ? '🚨 DOWNWARD BREAKDOWN' : '⚖️ RANGE SQUEEZE'} ({prob}%)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-terminal-muted mt-0.5 font-mono flex flex-wrap items-center gap-2">
                <span>Spot: <strong className="text-terminal-text font-bold">{spotPrice.toFixed(2)}</strong></span>
                <span>•</span>
                <span>1m to 6M Multi-Timeframe Confluence Engine</span>
              </p>
            </div>
          </div>

          {/* Right Controls: Standardized Toggle Button */}
          <div className="flex items-center space-x-2 font-mono text-xs ml-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`px-3 py-1.5 rounded-xl border-2 font-mono font-black text-[11px] sm:text-xs transition-all hover:scale-105 flex items-center gap-2 shrink-0 shadow-sm ${
                isExpanded
                  ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'bg-terminal-card border-accent-cyan/70 text-terminal-text hover:border-accent-cyan hover:text-accent-cyan'
              }`}
              title={isExpanded ? "Click to Collapse Pattern Breakout Radar" : "Click to Expand Pattern Breakout Radar"}
            >
              <span className="tracking-wider uppercase">
                {isExpanded ? 'COLLAPSE' : 'VIEW PATTERNS'}
              </span>
              <div className={`p-0.5 rounded bg-accent-cyan/15 text-accent-cyan transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-accent-cyan/30' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && pb && (
        <div className="p-3.5 space-y-3.5 font-mono animate-in fade-in duration-200">
          {/* TIMEFRAME SELECTOR ROW: 1m, 3m, 5m, 15m, 1h, 4h, 1D, 1W, 1M, 6M */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-terminal-panel/50 border border-terminal-border">
            <div className="flex items-center space-x-1.5 text-xs text-terminal-muted">
              <Clock className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="font-bold text-terminal-text text-[11px] uppercase">TIMEFRAME HORIZON:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {timeframes.map((tf) => (
                <button
                  key={tf.key}
                  type="button"
                  onClick={() => setSelectedTf(tf.key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black transition-all ${
                    selectedTf === tf.key
                      ? 'bg-accent-cyan text-terminal-bg shadow-[0_0_12px_rgba(0,229,255,0.4)] scale-105'
                      : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN BREAKOUT METRICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Active Chart Pattern Card */}
            <div className="bg-terminal-panel/60 p-3.5 rounded-xl border border-terminal-border flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between border-b border-terminal-border/60 pb-2">
                <div className="flex items-center space-x-1.5">
                  <div className="p-1.5 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan">
                    {getPatternIcon(pb.activePattern.patternType)}
                  </div>
                  <span className="text-[10px] text-terminal-muted uppercase font-bold">ACTIVE PATTERN</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                  {pb.activePattern.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h3 className="font-black text-sm text-terminal-text flex items-center gap-1.5">
                  {pb.activePattern.patternName}
                </h3>
                <p className="text-[11px] text-terminal-muted mt-1 leading-relaxed">
                  {pb.activePattern.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 text-[10px] text-terminal-muted border-t border-terminal-border/40">
                <span>Neckline Trigger: <strong className="text-amber font-bold">₹{pb.activePattern.necklinePrice.toFixed(1)}</strong></span>
                <span className="px-1.5 py-0.2 rounded bg-terminal-bg text-terminal-text border border-terminal-border">
                  {selectedTf} Frame
                </span>
              </div>
            </div>

            {/* 2. Predicted Breakout Trajectory & Probability Meter */}
            <div className="bg-terminal-panel/60 p-3.5 rounded-xl border border-terminal-border flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between border-b border-terminal-border/60 pb-2">
                <div className="flex items-center space-x-1.5">
                  <div className={`p-1.5 rounded-lg border ${
                    isUp ? 'bg-bull/15 text-bull border-bull/30' : isDown ? 'bg-bear/15 text-bear border-bear/30' : 'bg-amber/15 text-amber border-amber/30'
                  }`}>
                    <Zap className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-terminal-muted uppercase font-bold">BREAKOUT PROBABILITY</span>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                  prob >= 85 ? 'bg-bull text-terminal-bg font-black' : 'bg-amber text-terminal-bg font-black'
                }`}>
                  {prob}% CONFIDENCE
                </span>
              </div>

              {/* Progress Bar Gauge */}
              <div>
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span className={isUp ? 'text-bull' : isDown ? 'text-bear' : 'text-amber'}>
                    {pb.predictedBreakout.direction.replace('_', ' ')}
                  </span>
                  <span className="text-terminal-text">+{pb.predictedBreakout.expectedMovePts} PTS MOVE</span>
                </div>
                <div className="w-full h-2 bg-terminal-bg rounded-full overflow-hidden border border-terminal-border/60">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isUp ? 'bg-gradient-to-r from-accent-cyan to-bull' : isDown ? 'bg-gradient-to-r from-amber to-bear' : 'bg-accent-cyan'
                    }`}
                    style={{ width: `${prob}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-terminal-border/40">
                <div className="bg-terminal-bg p-1 rounded border border-terminal-border/60">
                  <span className="text-terminal-muted block text-[8px]">TRIGGER PRICE</span>
                  <span className="font-bold text-terminal-text">₹{pb.predictedBreakout.triggerPrice.toFixed(1)}</span>
                </div>
                <div className="bg-terminal-bg p-1 rounded border border-terminal-border/60">
                  <span className="text-terminal-muted block text-[8px]">EST. HORIZON</span>
                  <span className="font-bold text-accent-cyan">{pb.predictedBreakout.timeHorizon}</span>
                </div>
              </div>
            </div>

            {/* 3. Trade Setup & Measured Move Box */}
            <div className="bg-terminal-panel/60 p-3.5 rounded-xl border border-terminal-border flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between border-b border-terminal-border/60 pb-2">
                <div className="flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-accent-cyan" />
                  <span className="text-[10px] text-terminal-muted uppercase font-bold">MEASURED TARGETS</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-amber/15 text-amber text-[9px] font-black border border-amber/30">
                  R:R {pb.predictedBreakout.riskReward}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-bull/10 p-1.5 rounded-lg border border-bull/30">
                  <span className="text-[8px] text-bull block font-bold uppercase">TARGET 1</span>
                  <span className="font-black text-bull text-xs">₹{pb.predictedBreakout.target1.toFixed(1)}</span>
                </div>
                <div className="bg-bull/15 p-1.5 rounded-lg border border-bull/40">
                  <span className="text-[8px] text-bull block font-bold uppercase">TARGET 2 (1.618x)</span>
                  <span className="font-black text-bull text-xs">₹{pb.predictedBreakout.target2.toFixed(1)}</span>
                </div>
                <div className="bg-bear/15 p-1.5 rounded-lg border border-bear/30">
                  <span className="text-[8px] text-bear block font-bold uppercase">STOPLOSS (CUT)</span>
                  <span className="font-black text-bear text-xs">₹{pb.predictedBreakout.stoploss.toFixed(1)}</span>
                </div>
              </div>

              {/* Live OI Confirmation Status */}
              <div className={`p-2 rounded-lg border flex items-center gap-1.5 text-[10px] ${
                pb.oiConfirmation.isConfirmedByOI
                  ? 'bg-bull/10 border-bull/30 text-bull font-bold'
                  : pb.oiConfirmation.trapRisk === 'HIGH'
                  ? 'bg-bear/15 border-bear/40 text-bear font-bold animate-pulse'
                  : 'bg-amber/10 border-amber/30 text-amber'
              }`}>
                {pb.oiConfirmation.isConfirmedByOI ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-bull" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-bear" />
                )}
                <span>{pb.oiConfirmation.verdict}</span>
              </div>
            </div>
          </div>

          {/* MULTI-TIMEFRAME CONFLUENCE RADAR PILLS (1D, 1W, 1M, 6M) */}
          <div className="bg-terminal-panel/40 p-3 rounded-xl border border-terminal-border/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-terminal-border/50">
              <span className="font-bold text-terminal-text uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Multi-Timeframe S/R Confluence Spectrum (1D • 1W • 1M • 6M)</span>
              </span>
              <span className="text-[10px] text-terminal-muted">
                Spot: <strong className="text-terminal-text">{spotPrice.toFixed(1)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {pb.mtfLevels.slice(0, 6).map((lvl, i) => {
                const isOverhead = lvl.price >= spotPrice;
                return (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border transition text-center ${
                      isOverhead
                        ? 'bg-bear/10 border-bear/30 hover:border-bear/60'
                        : 'bg-bull/10 border-bull/30 hover:border-bull/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[8px] text-terminal-muted mb-0.5">
                      <span className="font-bold">{lvl.timeframe}</span>
                      <span className={`font-black ${isOverhead ? 'text-bear' : 'text-bull'}`}>
                        {isOverhead ? 'RESISTANCE' : 'SUPPORT'}
                      </span>
                    </div>
                    <span className="text-xs font-black text-terminal-text block">
                      ₹{lvl.price.toFixed(1)}
                    </span>
                    <span className="text-[9px] text-terminal-muted block truncate" title={lvl.label}>
                      {lvl.label}
                    </span>
                    <span className="text-[9px] font-bold text-amber block mt-0.5">
                      {lvl.distancePts} pts ({lvl.distancePct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
