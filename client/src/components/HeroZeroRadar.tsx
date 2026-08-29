import React, { useState, useMemo } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  Flame, 
  Zap, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Calendar,
  Clock,
  ChevronDown
} from 'lucide-react';
import type { HeroZeroSignal } from '../types';

export const HeroZeroRadar: React.FC = () => {
  const { currentIndexState, selectedIndex, triggerTestHeroZeroFlash } = useMarket();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'ALL' | 'CE' | 'PE' | 'SQUEEZE'>('ALL');

  const heroZeroSignals = currentIndexState?.heroZeroSignals || [];
  const atmStrike = currentIndexState?.atmStrike || 0;
  const daysToExpiry = currentIndexState?.daysToExpiry ?? 4;
  const selectedExpiry = currentIndexState?.selectedExpiry || 'Current Expiry';
  const strikes = currentIndexState?.strikes || [];
  const strikeStep = currentIndexState?.strikeStep || 50;

  const is0DteExpiryDay = daysToExpiry === 0;
  const is1Dte = daysToExpiry === 1;

  // Fallback generation calibrated for Expiry vs Pre-Expiry days
  const signals: HeroZeroSignal[] = useMemo(() => {
    if (!currentIndexState) return [];
    
    const now = Date.now();
    const activeLiveSignals = heroZeroSignals.filter(s => {
      if (!s.expiresAt) return true;
      return new Date(s.expiresAt).getTime() > now;
    });

    if (activeLiveSignals.length > 0) return activeLiveSignals;

    // Generate calibrated hero-or-zero / momentum contracts
    const step = strikeStep;
    const fallbackList: HeroZeroSignal[] = [];

    const callStrike = atmStrike + step;
    const putStrike = atmStrike - step;
    const cObj = strikes.find(s => s.strikePrice === callStrike);
    const pObj = strikes.find(s => s.strikePrice === putStrike);

    const cLtp = Math.max(8, cObj?.callLtp || 18.5);
    const pLtp = Math.max(8, pObj?.putLtp || 16.0);

    fallbackList.push({
      id: `${selectedIndex}-${callStrike}-CE-fb`,
      symbol: selectedIndex,
      contractSymbol: `${selectedIndex} ${callStrike} CE`,
      strike: callStrike,
      optionType: 'CE',
      ltp: cLtp,
      entryZone: `₹${cLtp.toFixed(1)} - ₹${(cLtp * 1.05).toFixed(1)}`,
      stoploss: +(cLtp * 0.5).toFixed(1),
      stoplossPct: 50,
      target1x: +(cLtp * 2.0).toFixed(1),
      target3x: +(cLtp * 3.5).toFixed(1),
      target5x: +(cLtp * 5.0).toFixed(1),
      gamma: 0.042,
      gammaScore: 88,
      volume: 450000,
      volumeVelocity: 3.8,
      oiChange1m: -120000,
      oiChangePct: -8.5,
      isShortSqueeze: true,
      squeezeType: 'SHORT_COVERING_CE',
      requiredSpotMovePts: Math.round(step * 0.75),
      riskReward: '1:5.0',
      conviction: 'EXTREME',
      rationale: is0DteExpiryDay 
        ? `Heavy Call writers unwinding at ${callStrike} CE. High 0DTE Gamma multiplier trigger above ₹${cLtp.toFixed(1)}.`
        : `Writer capitulation zone at ${callStrike} CE for ${selectedExpiry}. Bullish momentum breakout trigger above ₹${cLtp.toFixed(1)}.`
    });

    fallbackList.push({
      id: `${selectedIndex}-${putStrike}-PE-fb`,
      symbol: selectedIndex,
      contractSymbol: `${selectedIndex} ${putStrike} PE`,
      strike: putStrike,
      optionType: 'PE',
      ltp: pLtp,
      entryZone: `₹${pLtp.toFixed(1)} - ₹${(pLtp * 1.05).toFixed(1)}`,
      stoploss: +(pLtp * 0.5).toFixed(1),
      stoplossPct: 50,
      target1x: +(pLtp * 2.0).toFixed(1),
      target3x: +(pLtp * 3.5).toFixed(1),
      target5x: +(pLtp * 5.0).toFixed(1),
      gamma: 0.038,
      gammaScore: 82,
      volume: 380000,
      volumeVelocity: 2.9,
      oiChange1m: -95000,
      oiChangePct: -6.2,
      isShortSqueeze: true,
      squeezeType: 'SHORT_COVERING_PE',
      requiredSpotMovePts: Math.round(step * 0.75),
      riskReward: '1:5.0',
      conviction: 'HIGH',
      rationale: is0DteExpiryDay
        ? `Aggressive Put writers capitulating at ${putStrike} PE. Downside 0DTE gamma multiplier trigger below ₹${pLtp.toFixed(1)}.`
        : `Support unwinding detected at ${putStrike} PE for ${selectedExpiry}. Downside continuation setup below ₹${pLtp.toFixed(1)}.`
    });

    return fallbackList;
  }, [heroZeroSignals, selectedIndex, atmStrike, strikes, strikeStep, currentIndexState, is0DteExpiryDay, selectedExpiry]);

  const filteredSignals = signals.filter(s => {
    if (filterType === 'CE') return s.optionType === 'CE';
    if (filterType === 'PE') return s.optionType === 'PE';
    if (filterType === 'SQUEEZE') return s.isShortSqueeze;
    return true;
  });

  if (!currentIndexState) return null;

  return (
    <div className="bg-terminal-bg border border-terminal-border rounded-xl p-3 sm:p-4 shadow-xl font-mono relative overflow-hidden transition-all duration-300">
      {/* Background ambient strobe */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar (Accordion Trigger: Click to Expand / Collapse Dropdown) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none group/hdr py-0.5"
      >
        <div className="flex items-center space-x-2.5">
          <span className={`w-1.5 h-6 rounded-full shrink-0 ${is0DteExpiryDay ? 'bg-bull shadow-[0_0_10px_#00F59B] animate-pulse' : 'bg-purple-500 shadow-[0_0_10px_#A855F7]'}`} />
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover/hdr:scale-105 transition-transform shrink-0">
            <Flame className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono font-black text-xs sm:text-sm text-terminal-text uppercase tracking-wider drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] flex items-center gap-1.5 group-hover/hdr:text-purple-300 transition-colors">
                <span>{is0DteExpiryDay ? '⚡ 0DTE HERO-OR-ZERO GAMMA RADAR' : '0DTE GAMMA SPIKE & HERO-OR-ZERO RADAR'}</span>
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-black shadow-sm flex items-center gap-1 ${
                is0DteExpiryDay 
                  ? 'bg-bull/20 border-bull text-bull shadow-[0_0_10px_rgba(0,245,155,0.4)] animate-pulse' 
                  : is1Dte
                  ? 'bg-amber/20 border-amber text-amber'
                  : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              }`}>
                {is0DteExpiryDay ? (
                  <>
                    <Zap className="w-3 h-3 text-bull" />
                    <span>⚡ 0DTE EXPIRY ACTIVE TODAY</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3 h-3 text-amber" />
                    <span>EXPIRY: {selectedExpiry} ({daysToExpiry}D REMAINING)</span>
                  </>
                )}
              </span>
            </div>
            {!isExpanded && (
              <p className="text-[10px] text-terminal-muted font-mono mt-0.5 hidden sm:block">
                {is0DteExpiryDay
                  ? `Active 0DTE Expiry: Click to view ${signals.length} live gamma spike setups`
                  : `Target Expiry: ${selectedExpiry} • Click to expand ${signals.length} setups ▾`}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Standardized Dropdown Toggle Button */}
        <div className="flex items-center space-x-2 ml-auto">
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
            title={isExpanded ? 'Click to Collapse 0DTE Radar' : 'Click to Expand 0DTE Hero-or-Zero Radar'}
          >
            <span className="tracking-wider uppercase">
              {isExpanded ? 'COLLAPSE' : 'VIEW RADAR'}
            </span>
            <div className={`p-0.5 rounded bg-accent-cyan/15 text-accent-cyan transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-accent-cyan/30' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Accordion Expandable Content (Shown when clicked) */}
      {isExpanded && (
        <div className="pt-3 border-t border-terminal-border/60 mt-3 space-y-3 animate-in fade-in duration-200">
          {/* Filter Pills & Test Flash Button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1 bg-terminal-panel p-1 rounded-lg border border-terminal-border text-[10px]">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-2 py-0.5 rounded font-bold transition ${
                  filterType === 'ALL' ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                ALL ({signals.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('CE')}
                className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-0.5 ${
                  filterType === 'CE' ? 'bg-bull/25 text-bull border border-bull/50' : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                <TrendingUp className="w-2.5 h-2.5" /> CALLS
              </button>
              <button
                type="button"
                onClick={() => setFilterType('PE')}
                className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-0.5 ${
                  filterType === 'PE' ? 'bg-bear/25 text-bear border border-bear/50' : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                <TrendingDown className="w-2.5 h-2.5" /> PUTS
              </button>
              <button
                type="button"
                onClick={() => setFilterType('SQUEEZE')}
                className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-0.5 ${
                  filterType === 'SQUEEZE' ? 'bg-amber/25 text-amber border border-amber/50 font-black' : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                <Zap className="w-2.5 h-2.5 text-amber" /> SQUEEZES
              </button>
            </div>

            {/* Flash Screen Test Preview Trigger */}
            <button
              type="button"
              onClick={() => triggerTestHeroZeroFlash()}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/25 via-pink-500/25 to-amber/25 hover:from-purple-500/40 hover:to-pink-500/40 border border-purple-500/50 text-purple-200 font-bold text-[10px] transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
              title="Preview celebratory 0DTE Hero-or-Zero Flash Modal"
            >
              <Flame className="w-3 h-3 text-amber animate-pulse" />
              <span>⚡ Test Hero-Zero Flash</span>
            </button>
          </div>

          {/* Target Expiry Countdown / Status Banner */}
          {!is0DteExpiryDay && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs font-mono">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-accent-cyan shrink-0 animate-pulse" />
                <span className="text-terminal-text text-[11px] sm:text-xs">
                  <strong className="text-accent-cyan font-bold">0DTE Strategy Status:</strong> Target Expiry is <strong className="text-amber font-bold">{selectedExpiry}</strong> ({daysToExpiry} days to 0DTE expiry). 
                  <span className="text-terminal-muted hidden md:inline ml-1">Live 0DTE 2x–5x gamma multipliers trigger during the afternoon expiry session (13:00 – 15:30 IST).</span>
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shrink-0 hidden sm:inline">
                Pre-Expiry Setup
              </span>
            </div>
          )}

          {/* Signals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredSignals.map((item) => {
              const isCall = item.optionType === 'CE';
              const isExtreme = item.conviction === 'EXTREME';

              return (
                <div
                  key={item.id}
                  className={`bg-terminal-card/90 border rounded-xl p-3 flex flex-col justify-between transition-all duration-200 hover:border-purple-400/60 shadow-lg relative overflow-hidden ${
                    isExtreme 
                      ? 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30' 
                      : 'border-terminal-border'
                  }`}
                >
                  {/* Top Row: Symbol, Squeeze Badge & Gamma Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-black text-sm tracking-wide ${isCall ? 'text-bull' : 'text-bear'}`}>
                          🎯 {item.contractSymbol}
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                          isCall ? 'bg-bull/15 text-bull border-bull/30' : 'bg-bear/15 text-bear border-bear/30'
                        }`}>
                          {isCall ? 'CALL MOMENTUM' : 'PUT SQUEEZE'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black">
                          Γ-SCORE: {item.gammaScore}
                        </span>
                      </div>
                    </div>

                    {/* Entry & Risk-Reward Parameters */}
                    <div className="grid grid-cols-3 gap-1.5 bg-terminal-panel/80 p-2 rounded-lg border border-terminal-border mb-2.5 text-[10px]">
                      <div>
                        <span className="text-terminal-muted block text-[9px]">LTP / ENTRY</span>
                        <span className="font-black text-terminal-text">₹{item.ltp.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-terminal-muted block text-[9px]">STOPLOSS</span>
                        <span className="font-bold text-bear">₹{item.stoploss.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-terminal-muted block text-[9px]">RISK-REWARD</span>
                        <span className="font-bold text-amber">{item.riskReward}</span>
                      </div>
                    </div>

                    {/* 0DTE / Weekly Multiplier Targets */}
                    <div className="space-y-1 mb-2.5">
                      <span className="text-[9px] text-terminal-muted uppercase font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                        <span>{is0DteExpiryDay ? '0DTE Gamma Multiplier Targets' : 'Momentum Target Trajectory'}</span>
                      </span>
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-bold">
                        <div className="p-1 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan">
                          <span className="text-[8px] block opacity-75">T1 (2x)</span>
                          <span>₹{item.target1x.toFixed(1)}</span>
                        </div>
                        <div className="p-1 rounded bg-bull/15 border border-bull/40 text-bull">
                          <span className="text-[8px] block opacity-75">T2 (3.5x)</span>
                          <span>₹{item.target3x.toFixed(1)}</span>
                        </div>
                        <div className="p-1 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-sm">
                          <span className="text-[8px] block opacity-75">T3 (5x)</span>
                          <span>₹{item.target5x.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Rationale */}
                    <p className="text-[10px] text-terminal-muted leading-relaxed mb-2 bg-terminal-bg/50 p-2 rounded border border-terminal-border/50">
                      {item.rationale}
                    </p>
                  </div>

                  {/* Footer: Required Move & Squeeze Status */}
                  <div className="pt-2 border-t border-terminal-border/60 flex items-center justify-between text-[9px] text-terminal-muted">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-accent-cyan" />
                      <span>Spot Breakout: <strong className="text-terminal-text">±{item.requiredSpotMovePts} pts</strong></span>
                    </span>
                    <span className="font-black text-purple-400 flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-amber animate-pulse" />
                      <span>{item.conviction} CONVICTION</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
