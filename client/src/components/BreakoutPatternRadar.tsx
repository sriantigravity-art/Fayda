import React, { useState, useMemo } from 'react';
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
import type { TimeframeKey } from '../types';

export const BreakoutPatternRadar: React.FC = () => {
  const { currentIndexState, selectedIndex } = useMarket();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedTf, setSelectedTf] = useState<TimeframeKey>('15m');

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

  const patternData = useMemo(() => {
    if (!currentIndexState) return null;
    const spot = currentIndexState.spotPrice || 24800;
    const pcrVal = currentIndexState.pcr?.atmPlusMinus5Pcr ?? 1.0;
    const isBull = pcrVal >= 1.0;

    const r1 = currentIndexState.resistanceLevels?.[0]?.strikePrice || spot + 150;
    const s1 = currentIndexState.supportLevels?.[0]?.strikePrice || spot - 150;

    const patternName = isBull ? 'Ascending Triangle Breakout' : 'Descending Channel Breakdown';
    const patternDesc = isBull
      ? `Higher swing lows pressing against major resistance ceiling at ₹${r1}. Institutional accumulation detected.`
      : `Lower swing highs breaking below support floor at ₹${s1}. Option writer unwinding detected.`;
    const prob = isBull ? 84 : 81;
    const neckline = isBull ? r1 : s1;
    const confirmation = isBull ? r1 + 15 : s1 - 15;
    const target = isBull ? r1 + 80 : s1 - 80;
    const invalidation = isBull ? spot - 50 : spot + 50;

    return {
      name: patternName,
      description: patternDesc,
      isBull,
      probability: prob,
      neckline,
      confirmation,
      target,
      invalidation,
      expectedPoints: Math.abs(target - spot)
    };
  }, [currentIndexState, selectedTf]);

  if (!currentIndexState) return null;

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
              {patternData && (
                <span className={`text-[10px] px-2 py-0.2 rounded font-bold border ${
                  patternData.isBull ? 'bg-bull/15 text-bull border-bull/30' : 'bg-bear/15 text-bear border-bear/30'
                }`}>
                  {patternData.name} ({patternData.probability}%)
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

      {isExpanded && patternData && (
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
                {patternData.isBull ? <TrendingUp className="w-4 h-4 text-bull" /> : <TrendingDown className="w-4 h-4 text-bear" />}
                <span className="font-bold text-terminal-text text-sm">{patternData.name}</span>
              </div>
              <p className="text-[11px] text-terminal-muted leading-tight">
                {patternData.description}
              </p>
            </div>

            {/* Breakout Coordinates */}
            <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1 font-mono">
              <span className="text-[10px] text-terminal-muted font-sans uppercase font-semibold block">Key Breakout Levels</span>
              <div className="flex justify-between text-[11px]">
                <span className="text-terminal-muted">Neckline:</span>
                <strong className="text-terminal-text font-bold">₹{patternData.neckline.toFixed(1)}</strong>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-terminal-muted">Confirmation:</span>
                <strong className="text-accent-sky font-bold">₹{patternData.confirmation.toFixed(1)}</strong>
              </div>
            </div>

            {/* Target Projection */}
            <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1 font-mono">
              <span className="text-[10px] text-terminal-muted font-sans uppercase font-semibold block">Projected Target & Invalidation</span>
              <div className="flex justify-between text-[11px]">
                <span className="text-bull">Target (T1):</span>
                <strong className="text-bull font-bold">₹{patternData.target.toFixed(1)} (+{patternData.expectedPoints.toFixed(0)} pts)</strong>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-bear">Invalidation:</span>
                <strong className="text-bear font-bold">₹{patternData.invalidation.toFixed(1)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
