import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock,
  Radio,
  Newspaper,
  Target,
  Layers,
  BarChart2
} from 'lucide-react';
import { RadarFeed } from './RadarFeed';
import { NewsWireTab } from './NewsWireTab';
import { IndiaVixCard } from './IndiaVixCard';

export const RightAnalyticsColumn: React.FC = () => {
  const { currentIndexState, newsList } = useMarket();
  const [activeTab, setActiveTab] = useState<'RADAR' | 'NEWS'>('RADAR');

  if (!currentIndexState) return null;

  const { pcr, resistanceLevels, supportLevels, maxPain, straddleRange, spotPrice } = currentIndexState;

  const getSentimentBadge = (sentiment: typeof pcr.sentiment) => {
    switch (sentiment) {
      case 'EXTREMELY_BULLISH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-bull/15 text-bull border border-bull/30">Strong Bullish</span>;
      case 'BULLISH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-bull/15 text-bull border border-bull/30">Bullish Bias</span>;
      case 'NEUTRAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-amber/15 text-amber border border-amber/30">Neutral / Range</span>;
      case 'BEARISH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-bear/15 text-bear border border-bear/30">Bearish Bias</span>;
      case 'EXTREMELY_BEARISH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-bear/15 text-bear border border-bear/30">Strong Bearish</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-terminal-panel text-terminal-muted border border-terminal-border">Neutral</span>;
    }
  };

  const totalCallOi = (pcr && pcr.totalCallOI) || 1;
  const totalPutOi = (pcr && pcr.totalPutOI) || 1;
  const totalOi = totalCallOi + totalPutOi;
  const putPct = ((totalPutOi / totalOi) * 100).toFixed(1);
  const callPct = ((totalCallOi / totalOi) * 100).toFixed(1);

  const maxPainStrike = typeof maxPain === 'object' && maxPain !== null ? maxPain.strikePrice : (maxPain || 0);

  return (
    <div className="flex flex-col space-y-3.5 select-none">
      {/* 1. Switchable Tab: LIVE OI ACTIVITY RADAR vs. Flash News Wire */}
      <div className="flex flex-col">
        {/* Tab Header Selector */}
        <div className="flex bg-terminal-panel border border-terminal-border rounded-xl p-1 font-sans text-xs mb-2 shadow-subtle">
          <button
            type="button"
            onClick={() => setActiveTab('RADAR')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              activeTab === 'RADAR'
                ? 'bg-terminal-card border border-terminal-border text-accent-sky shadow-subtle'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>OI Surge Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NEWS')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg font-semibold transition relative cursor-pointer ${
              activeTab === 'NEWS'
                ? 'bg-terminal-card border border-terminal-border text-amber shadow-subtle'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>News Wire</span>
            {newsList && newsList.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber/20 text-amber font-mono font-bold ml-1 border border-amber/30">
                {newsList.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="w-full">
          {activeTab === 'RADAR' ? <RadarFeed /> : <NewsWireTab />}
        </div>
      </div>

      {/* 2. PCR Sentiment & Open Interest Balance */}
      {pcr && (
        <div className="bg-terminal-card border border-terminal-border rounded-xl p-3.5 shadow-subtle space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-terminal-border pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-lg bg-accent-sky/15 text-accent-sky">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-bold text-xs sm:text-sm text-terminal-text">
                PCR Sentiment & OI Momentum
              </h2>
            </div>
            {getSentimentBadge(pcr.sentiment)}
          </div>

          {/* PCR Figures Grid */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2 rounded-lg bg-terminal-panel/60 border border-terminal-border">
              <span className="text-[10px] text-terminal-muted font-sans font-medium uppercase block">ATM ±5 PCR</span>
              <span className="text-sm font-bold text-terminal-text tabular-nums">{(pcr.atmPlusMinus5Pcr || 1.0).toFixed(2)}</span>
            </div>

            <div className="p-2 rounded-lg bg-terminal-panel/60 border border-terminal-border">
              <span className="text-[10px] text-terminal-muted font-sans font-medium uppercase block">Total PCR</span>
              <span className="text-sm font-bold text-terminal-text tabular-nums">{(pcr.totalPcr || 1.0).toFixed(2)}</span>
            </div>

            <div className="p-2 rounded-lg bg-terminal-panel/60 border border-terminal-border">
              <span className="text-[10px] text-terminal-muted font-sans font-medium uppercase block">PCR Shift</span>
              <span className={`text-sm font-bold tabular-nums ${(pcr.pcrChange || 0) >= 0 ? 'text-bull' : 'text-bear'}`}>
                {(pcr.pcrChange || 0) > 0 ? '+' : ''}{(pcr.pcrChange || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* OI Balance Ratio Bar */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-[11px]">
              <span className="text-bull font-medium">Put OI: {(totalPutOi / 100000).toFixed(1)}L ({putPct}%)</span>
              <span className="text-bear font-medium">Call OI: {(totalCallOi / 100000).toFixed(1)}L ({callPct}%)</span>
            </div>
            <div className="h-2 w-full bg-terminal-panel rounded-full overflow-hidden flex">
              <div className="bg-bull transition-all duration-500" style={{ width: `${putPct}%` }} />
              <div className="bg-bear transition-all duration-500" style={{ width: `${callPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* 3. Resistance & Support Walls (Key Institutional Anchors) */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-3.5 shadow-subtle space-y-3 font-sans">
        <div className="flex items-center space-x-2 border-b border-terminal-border pb-2">
          <div className="p-1 rounded-lg bg-accent-sky/15 text-accent-sky">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <h2 className="font-bold text-xs sm:text-sm text-terminal-text">
            Key Institutional Walls
          </h2>
        </div>

        <div className="space-y-2 font-mono text-xs">
          {/* Top Resistance Wall */}
          {resistanceLevels && resistanceLevels.slice(0, 2).map((res, idx) => (
            <div key={idx} className="p-2 rounded-lg bg-bear/5 border border-bear/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-bear/20 text-bear">
                  R{idx + 1}
                </span>
                <span className="font-bold text-terminal-text tabular-nums">{res.strikePrice} CE</span>
              </div>
              <div className="text-right text-[11px] text-terminal-muted">
                <span className="text-bear font-medium">{res.oiFormatted || 'High OI'}</span> ({Math.abs((res.strikePrice || 0) - (spotPrice || 0)).toFixed(0)} pts away)
              </div>
            </div>
          ))}

          {/* Current Spot Indicator */}
          <div className="py-1 px-2.5 rounded-lg bg-terminal-panel border border-terminal-border flex items-center justify-between text-xs">
            <span className="font-sans text-[11px] text-terminal-muted font-medium">Spot Anchor</span>
            <span className="font-bold text-terminal-text tabular-nums">₹{(spotPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
          </div>

          {/* Top Support Wall */}
          {supportLevels && supportLevels.slice(0, 2).map((sup, idx) => (
            <div key={idx} className="p-2 rounded-lg bg-bull/5 border border-bull/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-bull/20 text-bull">
                  S{idx + 1}
                </span>
                <span className="font-bold text-terminal-text tabular-nums">{sup.strikePrice} PE</span>
              </div>
              <div className="text-right text-[11px] text-terminal-muted">
                <span className="text-bull font-medium">{sup.oiFormatted || 'High OI'}</span> ({Math.abs((spotPrice || 0) - (sup.strikePrice || 0)).toFixed(0)} pts below)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Max Pain & Expected Expiry Straddle Range */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-3.5 shadow-subtle space-y-2.5 font-sans">
        <div className="flex items-center justify-between border-b border-terminal-border pb-2">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-lg bg-accent-sky/15 text-accent-sky">
              <Target className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-bold text-xs sm:text-sm text-terminal-text">
              Max Pain & Straddle Band
            </h2>
          </div>
          <span className="font-mono text-xs font-bold text-accent-sky tabular-nums">
            Pain: {maxPainStrike}
          </span>
        </div>

        {straddleRange && (
          <div className="p-2.5 rounded-lg bg-terminal-panel/60 border border-terminal-border space-y-1 font-mono text-xs">
            <div className="flex justify-between text-[11px] text-terminal-muted">
              <span>Lower Bound: <strong className="text-terminal-text">{straddleRange.lowerBreakeven || (spotPrice - 150)}</strong></span>
              <span>Upper Bound: <strong className="text-terminal-text">{straddleRange.upperBreakeven || (spotPrice + 150)}</strong></span>
            </div>
            <div className="text-[10px] text-terminal-muted font-sans text-center">
              Combined Straddle Premium: ₹{(straddleRange.combinedPremium || 0).toFixed(1)}
            </div>
          </div>
        )}
      </div>

      {/* 5. India VIX & Regime Indicator */}
      <IndiaVixCard />
    </div>
  );
};
