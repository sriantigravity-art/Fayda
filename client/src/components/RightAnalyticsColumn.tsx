import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Hourglass,
  Clock,
  Radio,
  Newspaper,
  Target,
  Layers
} from 'lucide-react';
import { RadarFeed } from './RadarFeed';
import { NewsWireTab } from './NewsWireTab';

export const RightAnalyticsColumn: React.FC = () => {
  const { currentIndexState, newsList } = useMarket();
  const [activeTab, setActiveTab] = useState<'RADAR' | 'NEWS'>('RADAR');

  if (!currentIndexState) return null;

  const { pcr, resistanceLevels, supportLevels, maxPain, straddleRange, selectedExpiry, daysToExpiry } = currentIndexState;

  const getSentimentBadge = (sentiment: typeof pcr.sentiment) => {
    switch (sentiment) {
      case 'EXTREMELY_BULLISH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bull text-terminal-bg">🚀 EXTREMELY BULLISH</span>;
      case 'BULLISH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bull/20 text-bull border border-bull/40">📈 BULLISH BIAS</span>;
      case 'NEUTRAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber/20 text-amber border border-amber/40">⚖️ NEUTRAL / RANGE</span>;
      case 'BEARISH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bear/20 text-bear border border-bear/40">📉 BEARISH BIAS</span>;
      case 'EXTREMELY_BEARISH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bear text-white">🚨 EXTREMELY BEARISH</span>;
    }
  };

  return (
    <div className="flex flex-col space-y-3.5 transition-all duration-300">
      {/* 1. Switchable Tab: LIVE OI ACTIVITY RADAR vs. Flash News Wire (Top Placement) */}
      <div className="flex flex-col transition-all duration-300">
        {/* Tab Header Selector */}
        <div className="flex bg-terminal-panel border border-terminal-border rounded-xl p-1 font-mono text-xs mb-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('RADAR')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg font-bold transition ${
              activeTab === 'RADAR'
                ? 'bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>⚡ OI Surge Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NEWS')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg font-bold transition relative ${
              activeTab === 'NEWS'
                ? 'bg-amber/20 border border-amber/40 text-amber shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>📰 Flash News Wire</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber text-terminal-bg font-black ml-1">
              {newsList.length}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="w-full transition-all duration-300">
          {activeTab === 'RADAR' ? <RadarFeed /> : <NewsWireTab />}
        </div>
      </div>

      {/* 2. PCR Momentum & Multi-Strike Aggregation */}
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-terminal-border">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-5 rounded-full bg-accent-cyan shadow-[0_0_8px_#00E5FF] shrink-0" />
            <div className="p-1.5 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_10px_rgba(0,229,255,0.2)] shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]">
              PCR SENTIMENT & OI MOMENTUM
            </h2>
          </div>
          {getSentimentBadge(pcr.sentiment)}
        </div>

        {/* PCR Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 font-mono text-center mb-2.5">
          <div className="bg-terminal-bg/70 p-2 rounded-lg border border-terminal-border/60">
            <span className="text-[9px] text-terminal-muted block">ATM ± 5 STRIKES</span>
            <span className={`text-sm font-bold ${pcr.atmPlusMinus5Pcr >= 1 ? 'text-bull' : 'text-bear'}`}>
              {pcr.atmPlusMinus5Pcr.toFixed(2)}
            </span>
          </div>

          <div className="bg-terminal-bg/70 p-2 rounded-lg border border-terminal-border/60">
            <span className="text-[9px] text-terminal-muted block">1-MIN PCR Δ</span>
            <span className={`text-sm font-bold flex items-center justify-center ${pcr.pcr1mChange >= 0 ? 'text-bull' : 'text-bear'}`}>
              {pcr.pcr1mChange >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {pcr.pcr1mChange > 0 ? '+' : ''}{pcr.pcr1mChange.toFixed(3)}
            </span>
          </div>

          <div className="bg-terminal-bg/70 p-2 rounded-lg border border-terminal-border/60">
            <span className="text-[9px] text-terminal-muted block">TOTAL INDEX PCR</span>
            <span className="text-sm font-bold text-terminal-text">
              {pcr.overallPcr.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Call vs Put Total Exposure Progress */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-terminal-muted mb-1">
            <span className="text-bear font-bold">Calls: {(pcr.totalCallOI / 100000).toFixed(1)}L</span>
            <span className="text-bull font-bold">Puts: {(pcr.totalPutOI / 100000).toFixed(1)}L</span>
          </div>
          <div className="w-full h-1.5 bg-terminal-bg rounded-full overflow-hidden flex">
            <div
              className="bg-bear h-full transition-all duration-500"
              style={{
                width: `${(pcr.totalCallOI / (pcr.totalCallOI + pcr.totalPutOI || 1)) * 100}%`
              }}
            />
            <div
              className="bg-bull h-full transition-all duration-500"
              style={{
                width: `${(pcr.totalPutOI / (pcr.totalCallOI + pcr.totalPutOI || 1)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. MAX PAIN STRIKE & ATM STRADDLE RANGE */}
      <div className="grid grid-cols-2 gap-2.5 font-mono">
        <div className="bg-terminal-card border border-terminal-border rounded-xl p-3 shadow-md">
          <div className="flex items-center space-x-1.5 text-terminal-muted mb-1">
            <span className="w-1 h-3 rounded-full bg-amber shadow-[0_0_6px_#FFB800]" />
            <Target className="w-3.5 h-3.5 text-amber" />
            <span className="text-[10px] uppercase font-black text-terminal-text">MAX PAIN STRIKE</span>
          </div>
          <span className="text-base font-black text-amber block">
            {maxPain.strikePrice}
          </span>
          <span className="text-[10px] text-terminal-muted block mt-0.5">
            Loss: ₹{maxPain.totalLossCrores} Cr ({maxPain.differenceFromSpot > 0 ? '+' : ''}{maxPain.differenceFromSpot} pts)
          </span>
        </div>

        <div className="bg-terminal-card border border-terminal-border rounded-xl p-3 shadow-md">
          <div className="flex items-center space-x-1.5 text-terminal-muted mb-1">
            <span className="w-1 h-3 rounded-full bg-accent-cyan shadow-[0_0_6px_#00E5FF]" />
            <Layers className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="text-[10px] uppercase font-black text-terminal-text">ATM STRADDLE RANGE</span>
          </div>
          <span className="text-sm font-bold text-terminal-text block">
            {straddleRange.lowerBreakeven} – {straddleRange.upperBreakeven}
          </span>
          <span className="text-[10px] text-terminal-muted block mt-0.5">
            Prem: ₹{straddleRange.combinedPremium} (±{straddleRange.expectedMovePct}%)
          </span>
        </div>
      </div>

      {/* 4. KEY RESISTANCE WALLS & SUPPORT FLOORS */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Resistance Walls */}
        <div className="bg-terminal-card border border-bear/30 rounded-xl p-3 shadow-md font-mono">
          <div className="flex items-center space-x-1.5 text-bear font-black text-xs mb-2">
            <span className="w-1 h-3.5 rounded-full bg-bear shadow-[0_0_6px_#FF3B69]" />
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">CALL WALLS (R1–R3)</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {resistanceLevels.map((lvl) => (
              <div key={lvl.levelName} className="flex justify-between items-center bg-terminal-bg/80 p-1.5 rounded border border-terminal-border/50">
                <span className="font-bold text-terminal-text">{lvl.levelName}: {lvl.strikePrice}</span>
                <span className="text-[11px] text-bear font-semibold">{lvl.oiFormatted}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support Floors */}
        <div className="bg-terminal-card border border-bull/30 rounded-xl p-3 shadow-md font-mono">
          <div className="flex items-center space-x-1.5 text-bull font-black text-xs mb-2">
            <span className="w-1 h-3.5 rounded-full bg-bull shadow-[0_0_6px_#00F59B]" />
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">PUT FLOORS (S1–S3)</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {supportLevels.map((lvl) => (
              <div key={lvl.levelName} className="flex justify-between items-center bg-terminal-bg/80 p-1.5 rounded border border-terminal-border/50">
                <span className="font-bold text-terminal-text">{lvl.levelName}: {lvl.strikePrice}</span>
                <span className="text-[11px] text-bull font-semibold">{lvl.oiFormatted}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. THETA DECAY & TIME VALUE RATE METER */}
      <div className="bg-terminal-card border border-amber/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-terminal-border">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-5 rounded-full bg-amber shadow-[0_0_8px_#FFB800] shrink-0" />
            <div className="p-1.5 rounded-lg bg-amber/15 text-amber border border-amber/30 shadow-[0_0_10px_rgba(255,184,0,0.2)] shrink-0">
              <Hourglass className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(255,184,0,0.3)]">
              THETA TIME DECAY METER
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber/15 border border-amber/40 text-amber font-black shadow-sm">
            {daysToExpiry === 0 ? '0-DTE EXPIRY CRUSH' : `${daysToExpiry} DTE`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-center mb-2">
          <div className="bg-terminal-bg/80 p-2 rounded-lg border border-terminal-border/60">
            <span className="text-[9px] text-terminal-muted block">ATM STRADDLE DAILY DECAY</span>
            <span className="text-sm font-black text-amber">
              -₹{Math.abs(straddleRange.atmTotalThetaDaily).toFixed(1)} / day
            </span>
          </div>
          <div className="bg-terminal-bg/80 p-2 rounded-lg border border-terminal-border/60">
            <span className="text-[9px] text-terminal-muted block">HOURLY DECAY RATE</span>
            <span className="text-sm font-black text-amber">
              -₹{Math.abs(straddleRange.atmTotalThetaHourly).toFixed(1)} / hour
            </span>
          </div>
        </div>

        <div className="text-[10px] font-mono text-terminal-muted bg-terminal-panel/60 p-2 rounded border border-terminal-border/50 flex items-start gap-1.5 leading-relaxed">
          <Clock className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
          <span>
            {daysToExpiry <= 1
              ? `Expiry acceleration active. ATM premium decays at ₹${Math.abs(straddleRange.atmTotalThetaHourly).toFixed(1)}/hr. Option sellers capture high erosion.`
              : `Normal time decay pace for ${selectedExpiry}. Out-of-the-money options lose value each session.`}
          </span>
        </div>
      </div>
    </div>
  );
};
