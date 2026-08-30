import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Compass, 
  ChevronDown, 
  CheckCircle2,
  Activity,
  Layers
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
    { key: '1D', label: '1D', group: 'MACRO' },
    { key: '1W', label: '1W', group: 'MACRO' }
  ];

  const isUp = pb?.predictedBreakout.direction === 'UPWARD_BREAKOUT';
  const isDown = pb?.predictedBreakout.direction === 'DOWNWARD_BREAKDOWN';
  const prob = pb?.predictedBreakout.probability || 80;

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
        return <Compass className="w-4 h-4 text-accent-sky" />;
    }
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl flex flex-col overflow-hidden shadow-subtle font-sans select-none">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-terminal-panel/40 cursor-pointer flex items-center justify-between border-b border-terminal-border"
      >
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-accent-sky/15 text-accent-sky">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs sm:text-sm font-bold text-terminal-text">
                Multi-Timeframe Breakout Pattern Radar
              </h2>
              {pb && (
                <span className={`text-[10px] px-2 py-0.2 rounded font-bold border ${
                  isUp ? 'bg-bull/15 text-bull border-bull/30' : isDown ? 'bg-bear/15 text-bear border-bear/30' : 'bg-terminal-panel text-terminal-muted border-terminal-border'
                }`}>
                  {pb.detectedPattern.name} ({prob}%)
                </span>
              )}
            </div>
            <span className="text-[11px] text-terminal-muted hidden sm:block">
              Algorithmic geometric chart pattern recognition & probability forecasting
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ChevronDown className={`w-4 h-4 text-terminal-muted transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
        </div>
      </div>

      {isExpanded && pb && (
        <div className="p-4 space-y-3.5">
          {/* Timeframe Selector Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar font-mono text-xs">
            {timeframes.map((tf) => (
              <button
                key={tf.key}
                type="button"
                onClick={() => setSelectedTf(tf.key)}
                className={`px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                  selectedTf === tf.key
                    ? 'bg-accent-sky/15 border-accent-sky/50 text-accent-sky shadow-subtle'
                    : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Pattern Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            {/* Pattern Card */}
            <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1.5 font-sans">
              <span className="text-[10px] text-terminal-muted uppercase font-semibold block">Detected Pattern</span>
              <div className="flex items-center space-x-2">
                {getPatternIcon(pb.detectedPattern.type)}
                <span className="font-bold text-terminal-text text-sm">{pb.detectedPattern.name}</span>
              </div>
              <p className="text-[11px] text-terminal-muted leading-tight">
                {pb.detectedPattern.description}
              </p>
            </div>

            {/* Breakout Coordinates */}
            <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1 font-mono">
              <span className="text-[10px] text-terminal-muted font-sans uppercase font-semibold block">Key Breakout Levels</span>
              <div className="flex justify-between text-[11px]">
                <span className="text-terminal-muted">Neckline:</span>
                <strong className="text-terminal-text font-bold">₹{pb.detectedPattern.necklinePrice.toFixed(1)}</strong>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-terminal-muted">Confirmation:</span>
                <strong className="text-accent-sky font-bold">₹{pb.detectedPattern.confirmationPrice.toFixed(1)}</strong>
              </div>
            </div>

            {/* Target Projection */}
            <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1 font-mono">
              <span className="text-[10px] text-terminal-muted font-sans uppercase font-semibold block">Projected Target & Invalidation</span>
              <div className="flex justify-between text-[11px]">
                <span className="text-bull">Target (T1):</span>
                <strong className="text-bull font-bold">₹{pb.predictedBreakout.targetPrice.toFixed(1)} (+{pb.predictedBreakout.expectedPoints.toFixed(0)} pts)</strong>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-bear">Invalidation:</span>
                <strong className="text-bear font-bold">₹{pb.predictedBreakout.invalidationPrice.toFixed(1)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
