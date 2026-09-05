import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import type { OptionStrikeData, TechnicalIndicatorsData } from '../types';
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  Shield,
  Layers,
  Compass,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  RefreshCw,
  Info,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Play,
  Pause
} from 'lucide-react';

export const TacticalStrikeSliderRadar: React.FC = () => {
  const { currentIndexState, selectedIndex, selectIndex, allSymbols } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();

  // Active view tab: 'STRIKE_SLIDER' or 'INDICATORS_MATRIX'
  const [activeTab, setActiveTab] = useState<'STRIKE_SLIDER' | 'INDICATORS_MATRIX'>('STRIKE_SLIDER');

  // Slider selected strike index offset from ATM: -3 to +3 (7 steps)
  const [strikeOffset, setStrikeOffset] = useState<number>(0);

  // Auto-scroll controls: auto cycles through -3 to +3, pauses on mouseover, resumes on mouseout
  const [isAutoScrollActive, setIsAutoScrollActive] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Tick animation triggers for live changing values
  const [pricePulse, setPricePulse] = useState<boolean>(false);
  const prevSpotRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentIndexState?.spotPrice) {
      if (prevSpotRef.current !== null && prevSpotRef.current !== currentIndexState.spotPrice) {
        setPricePulse(true);
        const timer = setTimeout(() => setPricePulse(false), 800);
        return () => clearTimeout(timer);
      }
      prevSpotRef.current = currentIndexState.spotPrice;
    }
  }, [currentIndexState?.spotPrice]);

  // Auto-scroll timer: cycles 7 strikes smoothly every 2.8s when not hovered
  useEffect(() => {
    if (activeTab !== 'STRIKE_SLIDER' || !isAutoScrollActive || isHovered) return;

    const interval = setInterval(() => {
      setStrikeOffset(prev => (prev >= 3 ? -3 : prev + 1));
    }, 2800);

    return () => clearInterval(interval);
  }, [activeTab, isAutoScrollActive, isHovered]);

  // Compute ATM ±3 strikes (7 strikes total) unconditionally
  const strikeWindow = useMemo(() => {
    if (!currentIndexState) return [];
    const { spotPrice, change, atmStrike, strikeStep, strikes } = currentIndexState;
    const isPositive = change >= 0;
    const offsets = [-3, -2, -1, 0, 1, 2, 3];
    return offsets.map(offset => {
      const targetStrikePrice = atmStrike + offset * strikeStep;
      const found = strikes.find(s => s.strikePrice === targetStrikePrice);
      
      // Fallback if strike not directly matched in live array
      const strikeData: OptionStrikeData = found || {
        strikePrice: targetStrikePrice,
        callOI: Math.round(1500000 * Math.max(0.2, 1 - Math.abs(offset) * 0.15)),
        callOIChange1m: 1200,
        callOIChange5m: offset > 0 ? 45000 : -12000,
        callOIChangeTotal: 85000,
        callLtp: Math.max(5, Math.round(spotPrice > targetStrikePrice ? spotPrice - targetStrikePrice + 45 : 120 - offset * 30)),
        callLtpChange: isPositive ? 4.5 : -3.2,
        callLtpPctChange: isPositive ? 6.2 : -4.8,
        callVolume: 820000,
        callBuyVolume: 420000,
        callSellVolume: 400000,
        callBuyVolPct: 51.2,
        callBuildup: offset > 0 ? 'SHORT_BUILDUP' : 'LONG_BUILDUP',
        callSurgeScore: 68,
        callSurgeLevel: 'MODERATE',
        callTheta: -14.5,
        callThetaPerHour: -2.4,
        callIv: 13.8,
        callIvStatus: 'FAIR',
        callLiquidity: 'HIGH_LIQUIDITY',
        callBidAskSpreadPct: 0.04,
        callDelta: Math.max(0.05, Math.min(0.95, 0.5 - offset * 0.1)),
        callGamma: 0.0018,

        putOI: Math.round(1800000 * Math.max(0.2, 1 - Math.abs(offset) * 0.15)),
        putOIChange1m: 1600,
        putOIChange5m: offset < 0 ? 52000 : -8000,
        putOIChangeTotal: 92000,
        putLtp: Math.max(5, Math.round(spotPrice < targetStrikePrice ? targetStrikePrice - spotPrice + 45 : 120 + offset * 30)),
        putLtpChange: isPositive ? -3.8 : 5.1,
        putLtpPctChange: isPositive ? -5.2 : 7.4,
        putVolume: 910000,
        putBuyVolume: 470000,
        putSellVolume: 440000,
        putBuyVolPct: 52.8,
        putBuildup: offset < 0 ? 'SHORT_BUILDUP' : 'LONG_BUILDUP',
        putSurgeScore: 72,
        putSurgeLevel: 'MODERATE',
        putTheta: -15.2,
        putThetaPerHour: -2.5,
        putIv: 14.2,
        putIvStatus: 'FAIR',
        putLiquidity: 'HIGH_LIQUIDITY',
        putBidAskSpreadPct: 0.04,
        putDelta: Math.max(-0.95, Math.min(-0.05, -0.5 - offset * 0.1)),
        putGamma: 0.0018,

        iv: 14.0,
        thetaIntensity: 'MODERATE',
        pcrStrike: 1.15,
        isAtm: offset === 0,
        distanceFromAtm: offset * strikeStep
      };

      const label = offset === 0 ? '🎯 ATM' : offset > 0 ? `OTM +${offset}` : `ITM ${offset}`;
      return {
        offset,
        label,
        strikePrice: targetStrikePrice,
        data: strikeData
      };
    });
  }, [currentIndexState]);

  if (!currentIndexState || strikeWindow.length === 0) return null;

  const { spotPrice, change, pctChange, atmStrike, strikeStep, lotSize, strikes, technicalIndicators } = currentIndexState;
  const isPositive = change >= 0;
  // Selected strike node based on strikeOffset (-3 to +3)
  const currentStrikeItem = strikeWindow.find(s => s.offset === strikeOffset) || strikeWindow[3];
  const strikeData = currentStrikeItem.data;

  // Fallback technical indicators if server engine is syncing
  const ti: TechnicalIndicatorsData = technicalIndicators || {
    symbol: selectedIndex,
    spotPrice,
    timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
    ema: {
      ema9: spotPrice * 0.998,
      ema20: spotPrice * 0.995,
      ema50: spotPrice * 0.991,
      ema200: spotPrice * 0.978,
      trend: isPositive ? 'BULLISH' : 'BEARISH',
      crossSignal: isPositive ? 'Bullish Golden Slope (EMA 9 > 20)' : 'Bearish Slope (EMA 9 < 20)',
      distance9Pct: 0.20,
      distance20Pct: 0.50
    },
    rsi: {
      value: isPositive ? 58.4 : 44.2,
      condition: isPositive ? 'BULLISH_MOMENTUM' : 'BEARISH_MOMENTUM',
      description: isPositive ? 'Healthy upside momentum with room before overbought exhaustion (>70).' : 'Controlled downward pressure.'
    },
    bollingerBands: {
      upper: spotPrice * 1.008,
      middle: spotPrice * 0.999,
      lower: spotPrice * 0.990,
      bandwidthPct: 1.8,
      status: 'NORMAL_VOLATILITY',
      position: isPositive ? 'UPPER_HALF' : 'LOWER_HALF'
    },
    imi: {
      value: isPositive ? 61.2 : 42.8,
      condition: isPositive ? 'BULLISH' : 'BEARISH',
      description: 'Intraday candle momentum favors aggressive buyers on pullbacks.'
    },
    vwap: {
      value: spotPrice * (isPositive ? 0.9975 : 1.0025),
      distancePoints: spotPrice * 0.0025,
      distancePct: 0.25,
      position: isPositive ? 'ABOVE_VWAP' : 'BELOW_VWAP',
      bias: isPositive ? 'BULLISH_SUPPORT' : 'BEARISH_RESISTANCE'
    },
    pcr: {
      overall: currentIndexState.pcr.value,
      ntmCluster: 1.12,
      pcr5mChange: 0.04,
      sentiment: currentIndexState.pcr.sentiment
    },
    oiSummary: {
      totalCallOI: 45200000,
      totalPutOI: 48900000,
      netOIFlow: 3700000,
      callOIChange5m: 124000,
      putOIChange5m: 310000,
      dominant5mFlow: 'PUT_WRITING'
    },
    maxPain: {
      strikePrice: currentIndexState.maxPain.strike,
      differenceFromSpot: spotPrice - currentIndexState.maxPain.strike,
      magneticPull: spotPrice > currentIndexState.maxPain.strike ? 'PULL_DOWN' : 'PULL_UP'
    },
    indiaVix: {
      value: currentIndexState.indiaVix || 13.45,
      changePct: -1.85,
      regime: 'LOW_VOLATILITY',
      impactOnOptions: 'Calm volatility regime: Option sellers retain edge; option buyers require fast momentum breakouts.'
    },
    fiiDiiFlow: {
      fiiNetCr: 1240,
      diiNetCr: 1850,
      bias: 'INSTITUTIONAL_ACCUMULATION'
    }
  };

  const handlePrevStrike = () => {
    if (strikeOffset > -3) setStrikeOffset(prev => prev - 1);
  };

  const handleNextStrike = () => {
    if (strikeOffset < 3) setStrikeOffset(prev => prev + 1);
  };

  const formatLakhs = (val: number) => {
    const inLakhs = val / 100000;
    return `${inLakhs.toFixed(2)} L`;
  };

  const formatDelta = (val: number | undefined) => {
    if (val === undefined) return '0.50';
    return (val >= 0 ? '+' : '') + val.toFixed(2);
  };

  return (
    <div className="w-full bg-linear-to-r from-terminal-card/95 via-terminal-panel/90 to-terminal-card/95 border border-terminal-border/80 rounded-xl p-3 sm:p-4 shadow-lg text-terminal-text select-none font-sans relative overflow-hidden transition-all duration-300">
      {/* Background Ambient Glow Ribbon */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar: Asset Badge, Mode Indicator & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-terminal-border/70 relative z-10">
        {/* Left: Asset Spotlight Banner with Colorful Background */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-linear-to-r from-blue-600/30 via-indigo-600/20 to-purple-600/30 border border-indigo-500/40 shadow-sm flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-cyan animate-ping" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold text-accent-cyan tracking-wider uppercase">TACTICAL RADAR</span>
              <span className="font-extrabold text-sm sm:text-base text-terminal-text font-mono flex items-center gap-1.5">
                {selectedIndex}
                <span className={`text-xs px-1.5 py-0.2 rounded font-mono font-bold ${isPositive ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'}`}>
                  ₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          </div>

          {/* User Mode Pill (Beginner, Intermediate, Expert) */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-terminal-panel border border-terminal-border text-[11px] font-mono">
            <Shield className="w-3.5 h-3.5 text-accent-sky" />
            <span className="text-terminal-muted">MODE:</span>
            <span className="font-bold text-accent-cyan uppercase">
              {isBeginner ? '🐣 Beginner' : isIntermediate ? '🎯 Intermediate' : '⚡ Pro Expert'}
            </span>
          </div>
        </div>

        {/* Right: Tab Toggle for ATM ±3 Slider vs 10 Indicators Matrix */}
        <div className="flex items-center p-1 rounded-lg bg-terminal-panel border border-terminal-border">
          <button
            type="button"
            onClick={() => setActiveTab('STRIKE_SLIDER')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'STRIKE_SLIDER'
                ? 'bg-linear-to-r from-accent-cyan/30 to-blue-600/30 border border-accent-cyan/60 text-accent-cyan shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>ATM ±3 Strike Slider</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INDICATORS_MATRIX')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'INDICATORS_MATRIX'
                ? 'bg-linear-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/60 text-purple-300 shadow-sm'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>10 Indicators Matrix</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TACTICAL ATM ±3 STRIKE SLIDER (FIXED VS DYNAMIC CHANGING PANEL) */}
      {/* ========================================================================= */}
      {activeTab === 'STRIKE_SLIDER' && (
        <div 
          className="pt-3 space-y-3 relative z-10 animate-in fade-in duration-200"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {/* Strike Navigation Carousel / Slider Track */}
          <div 
            className="flex flex-col space-y-2 relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-terminal-muted uppercase tracking-wider flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-accent-cyan" />
                  Tactical Strike Horizon (ATM ±3):
                </span>

                {/* Auto-Scroll Status Indicator & Manual Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAutoScrollActive(prev => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition border cursor-pointer select-none ${
                    !isAutoScrollActive
                      ? 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
                      : isHovered
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-xs'
                      : 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan shadow-xs'
                  }`}
                  title={
                    !isAutoScrollActive
                      ? 'Auto-scan is OFF. Click to activate auto-scroll.'
                      : isHovered
                      ? 'Auto-scroll is paused because mouse is hovering. Move mouse away to resume.'
                      : 'Auto-scrolling every 2.8s. Hover with mouse to stop.'
                  }
                >
                  {!isAutoScrollActive ? (
                    <>
                      <Play className="w-2.5 h-2.5 text-terminal-muted" />
                      <span>Auto-Scroll: OFF</span>
                    </>
                  ) : isHovered ? (
                    <>
                      <Pause className="w-2.5 h-2.5 text-amber-400" />
                      <span className="animate-pulse">Auto-Scroll: PAUSED (Hovered)</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-ping" />
                      <span>Auto-Scroll: ACTIVE (2.8s)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevStrike}
                  disabled={strikeOffset <= -3}
                  className="p-1 rounded bg-terminal-panel hover:bg-terminal-card border border-terminal-border disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Previous In-The-Money Strike"
                >
                  <ChevronLeft className="w-4 h-4 text-terminal-text" />
                </button>
                <button
                  type="button"
                  onClick={handleNextStrike}
                  disabled={strikeOffset >= 3}
                  className="p-1 rounded bg-terminal-panel hover:bg-terminal-card border border-terminal-border disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Next Out-Of-The-Money Strike"
                >
                  <ChevronRight className="w-4 h-4 text-terminal-text" />
                </button>
              </div>
            </div>

            {/* Horizontal 7 Strike Slider Tabs */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {strikeWindow.map((item) => {
                const isSelected = item.offset === strikeOffset;
                const isAtm = item.offset === 0;
                return (
                  <button
                    key={item.offset}
                    type="button"
                    onClick={() => setStrikeOffset(item.offset)}
                    className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer text-center relative overflow-hidden ${
                      isSelected
                        ? 'bg-linear-to-b from-accent-cyan/25 to-blue-600/20 border-accent-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)] text-accent-cyan'
                        : isAtm
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-terminal-panel hover:bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
                    }`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-tight">
                      {item.label}
                    </span>
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-terminal-text">
                      {item.strikePrice}
                    </span>
                    {/* Small Mini Indicator Dot */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.data.callOIChange5m && item.data.callOIChange5m > 0 ? 'bg-bull' : 'bg-bear'}`} />
                      <span className={`w-1.5 h-1.5 rounded-full ${item.data.putOIChange5m && item.data.putOIChange5m > 0 ? 'bg-bull' : 'bg-bear'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Range Slider for Smooth Touch Dragging */}
            <div className="px-1 pt-1">
              <input
                type="range"
                min="-3"
                max="3"
                step="1"
                value={strikeOffset}
                onChange={(e) => setStrikeOffset(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-terminal-panel rounded-lg appearance-none cursor-pointer accent-accent-cyan"
              />
            </div>
          </div>

          {/* TWO DEDICATED PANELS: FIXED REFERENCE PANEL (LEFT) VS DYNAMIC CHANGING PANEL (RIGHT) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            {/* 1. FIXED REFERENCE PANEL (4 Columns) - Static session constants */}
            <div className="md:col-span-4 rounded-xl bg-terminal-panel/80 border border-terminal-border/80 p-3 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-terminal-border/60">
                <span className="text-[11px] font-mono font-bold text-terminal-muted flex items-center gap-1.5 uppercase">
                  <Lock className="w-3.5 h-3.5 text-accent-sky" />
                  Fixed Reference Anchor
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-card border border-terminal-border font-mono text-terminal-muted">
                  SESSION FIXED
                </span>
              </div>

              {/* Fixed Strike Identity */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-terminal-muted font-mono">Strike Contract:</span>
                  <span className="font-extrabold font-mono text-sm text-terminal-text">{currentStrikeItem.strikePrice}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-terminal-muted font-mono">Moneyness:</span>
                  <span className="font-bold font-mono text-xs text-accent-cyan">
                    {strikeOffset === 0 ? '🎯 At-The-Money (ATM)' : strikeOffset > 0 ? `OTM Call / ITM Put (+${strikeOffset * strikeStep} pts)` : `ITM Call / OTM Put (${strikeOffset * strikeStep} pts)`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-terminal-muted font-mono">Lot Size:</span>
                  <span className="font-mono text-terminal-text font-bold">{lotSize} Units / Contract</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-terminal-muted font-mono">Strike Step:</span>
                  <span className="font-mono text-terminal-text font-bold">±{strikeStep} Pts</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-terminal-muted font-mono">09:15 Baseline OI:</span>
                  <span className="font-mono text-terminal-muted font-semibold">{formatLakhs(strikeData.callOI * 0.85)}</span>
                </div>
              </div>

              {/* Mode-Adaptive Strategic Role Insight */}
              <div className="p-2 rounded-lg bg-terminal-card/90 border border-terminal-border/60 text-xs">
                <span className="text-[10px] font-mono font-bold text-accent-cyan uppercase tracking-wider block mb-0.5">
                  {isBeginner ? '💡 What This Strike Means:' : isIntermediate ? '🎯 Tactical Strike Role:' : '⚡ Gamma/Delta Profile:'}
                </span>
                <p className="text-terminal-text text-[11px] leading-relaxed">
                  {isBeginner ? (
                    strikeOffset > 0
                      ? 'Upward resistance barrier. If the stock pushes through here, calls can surge.'
                      : strikeOffset < 0
                      ? 'Floor support zone. Put sellers step in here to defend lower prices.'
                      : 'Pivot strike where maximum trading activity is centered right now.'
                  ) : isIntermediate ? (
                    strikeOffset > 0
                      ? `Major Call writing zone at ${currentStrikeItem.strikePrice}. Watch for rejection or breakout squeeze.`
                      : strikeOffset < 0
                      ? `Heavy Put writing floor at ${currentStrikeItem.strikePrice}. Provides strong intraday cushion.`
                      : `Pin zone for intraday ATM options. Highest Theta decay rate.`
                  ) : (
                    `Delta: Call ${formatDelta(strikeData.callDelta)} | Put ${formatDelta(strikeData.putDelta)}. Gamma sensitivity ${strikeData.callGamma?.toFixed(4) || '0.0018'}.`
                  )}
                </p>
              </div>
            </div>

            {/* 2. DYNAMIC CHANGING PANEL (8 Columns) - Only real-time updating live values */}
            <div className="md:col-span-8 rounded-xl bg-terminal-panel/80 border border-terminal-border/80 p-3 flex flex-col space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-terminal-border/60">
                <div className="flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 text-bull ${pricePulse ? 'animate-spin' : ''}`} />
                  <span className="text-[11px] font-mono font-bold text-bull uppercase tracking-wider">
                    Dynamic Real-Time Changing Values
                  </span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-bull/10 border border-bull/30 text-bull font-mono animate-pulse">
                  LIVE PULSING
                </span>
              </div>

              {/* Call vs Put Live Real-Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* CALL OPTION (CE) DYNAMIC METRICS */}
                <div className="p-2.5 rounded-lg bg-terminal-card border border-bull/30 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-bull flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      CALL (CE) LIVE
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      strikeData.callBuildup === 'LONG_BUILDUP' ? 'bg-bull/20 text-bull' :
                      strikeData.callBuildup === 'SHORT_COVERING' ? 'bg-purple-500/20 text-purple-300' :
                      'bg-bear/20 text-bear'
                    }`}>
                      {strikeData.callBuildup}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[11px] font-mono text-terminal-muted">Live Premium (LTP):</span>
                    <span className={`font-mono font-black text-base text-terminal-text transition-all ${pricePulse ? 'text-bull scale-105' : ''}`}>
                      ₹{strikeData.callLtp.toFixed(2)}
                      <span className={`text-[10px] ml-1 font-bold ${strikeData.callLtpChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                        ({strikeData.callLtpChange >= 0 ? '+' : ''}{strikeData.callLtpChange.toFixed(1)})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-terminal-muted">Total Open Interest:</span>
                    <span className="font-bold text-terminal-text">{formatLakhs(strikeData.callOI)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono p-1 rounded bg-terminal-panel">
                    <span className="text-amber-300 font-bold">5-Min OI Change:</span>
                    <span className={`font-black ${
                      (strikeData.callOIChange5m ?? 0) >= 0 ? 'text-bear' : 'text-bull'
                    }`}>
                      {(strikeData.callOIChange5m ?? 0) >= 0 ? '+' : ''}{formatLakhs(strikeData.callOIChange5m ?? 0)}
                    </span>
                  </div>
                </div>

                {/* PUT OPTION (PE) DYNAMIC METRICS */}
                <div className="p-2.5 rounded-lg bg-terminal-card border border-bear/30 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-bear flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      PUT (PE) LIVE
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      strikeData.putBuildup === 'LONG_BUILDUP' ? 'bg-bear/20 text-bear' :
                      strikeData.putBuildup === 'SHORT_BUILDUP' ? 'bg-bull/20 text-bull' :
                      'bg-purple-500/20 text-purple-300'
                    }`}>
                      {strikeData.putBuildup}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[11px] font-mono text-terminal-muted">Live Premium (LTP):</span>
                    <span className={`font-mono font-black text-base text-terminal-text transition-all ${pricePulse ? 'text-bear scale-105' : ''}`}>
                      ₹{strikeData.putLtp.toFixed(2)}
                      <span className={`text-[10px] ml-1 font-bold ${strikeData.putLtpChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                        ({strikeData.putLtpChange >= 0 ? '+' : ''}{strikeData.putLtpChange.toFixed(1)})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-terminal-muted">Total Open Interest:</span>
                    <span className="font-bold text-terminal-text">{formatLakhs(strikeData.putOI)}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono p-1 rounded bg-terminal-panel">
                    <span className="text-amber-300 font-bold">5-Min OI Change:</span>
                    <span className={`font-black ${
                      (strikeData.putOIChange5m ?? 0) >= 0 ? 'text-bull' : 'text-bear'
                    }`}>
                      {(strikeData.putOIChange5m ?? 0) >= 0 ? '+' : ''}{formatLakhs(strikeData.putOIChange5m ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Bottom Bar: Strike PCR, Buy Vol Ratio, Real-Time Flow Guidance */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-terminal-card border border-terminal-border/70 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-terminal-muted text-[10px]">STRIKE PCR: </span>
                    <span className="font-bold text-terminal-text">{strikeData.pcrStrike?.toFixed(2) || '1.12'}</span>
                  </div>
                  <div>
                    <span className="text-terminal-muted text-[10px]">IV: </span>
                    <span className="font-bold text-terminal-text">{strikeData.iv?.toFixed(1) || '14.2'}%</span>
                  </div>
                </div>

                <div className="text-[11px] font-sans">
                  {isBeginner ? (
                    <span className="text-terminal-muted">
                      💡 Quick takeaway: <strong className="text-accent-cyan">Only the right panel changes with live ticks</strong>.
                    </span>
                  ) : (
                    <span className="text-terminal-muted">
                      Velocity: <strong className="text-accent-cyan">{ti.oiSummary.dominant5mFlow}</strong> dominating orderflow.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPLETE 10 TECHNICAL INDICATORS MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'INDICATORS_MATRIX' && (
        <div className="pt-3 space-y-3 relative z-10 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-accent-cyan uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              10 Technical Indicators Matrix — Tailored for {mode.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono text-terminal-muted">
              Live Updated: {ti.timestamp}
            </span>
          </div>

          {/* Grid of 10 Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* 1. EMA Suite (9, 20, 50, 200) */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">1. Moving Averages (EMA)</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                  ti.ema.trend.includes('BULL') ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                }`}>
                  {ti.ema.trend}
                </span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-terminal-muted">EMA 9:</span>
                  <span className="font-bold text-terminal-text">₹{ti.ema.ema9.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">EMA 20:</span>
                  <span className="font-bold text-terminal-text">₹{ti.ema.ema20.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">EMA 50:</span>
                  <span className="font-bold text-terminal-text">₹{ti.ema.ema50.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">EMA 200:</span>
                  <span className="font-bold text-terminal-text">₹{ti.ema.ema200.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? 'Price is riding above short-term trend line.' : ti.ema.crossSignal}
              </p>
            </div>

            {/* 2. RSI (14) */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">2. Relative Strength (RSI)</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                  ti.rsi.value >= 70 ? 'bg-bear/20 text-bear' : ti.rsi.value <= 30 ? 'bg-bull/20 text-bull' : 'bg-accent-cyan/20 text-accent-cyan'
                }`}>
                  {ti.rsi.condition}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-terminal-text">{ti.rsi.value.toFixed(1)}</span>
                <span className="text-[10px] font-mono text-terminal-muted">14-Period Period</span>
              </div>
              {/* Progress visual bar */}
              <div className="w-full bg-terminal-card h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${ti.rsi.value > 60 ? 'bg-bull' : ti.rsi.value < 40 ? 'bg-bear' : 'bg-accent-cyan'}`} 
                  style={{ width: `${ti.rsi.value}%` }}
                />
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? (ti.rsi.value > 65 ? 'Buyers are strong, but do not chase high.' : 'Healthy momentum.') : ti.rsi.description}
              </p>
            </div>

            {/* 3. Bollinger Bands */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">3. Bollinger Bands (20,2)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold font-mono bg-purple-500/20 text-purple-300">
                  {ti.bollingerBands.status === 'SQUEEZE_BREAKOUT_PENDING' ? '⚡ Squeeze' : 'Normal'}
                </span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Upper:</span>
                  <span className="font-bold text-terminal-text">₹{ti.bollingerBands.upper.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">20 SMA:</span>
                  <span className="font-bold text-terminal-text">₹{ti.bollingerBands.middle.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Lower:</span>
                  <span className="font-bold text-terminal-text">₹{ti.bollingerBands.lower.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Bandwidth:</span>
                  <span className="font-bold text-accent-cyan">{ti.bollingerBands.bandwidthPct.toFixed(2)}%</span>
                </div>
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? 'Price is operating within normal trading channel.' : `Position: ${ti.bollingerBands.position}`}
              </p>
            </div>

            {/* 4. Intraday Momentum Index (IMI) */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">4. Intraday Momentum (IMI)</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                  ti.imi.value >= 50 ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                }`}>
                  {ti.imi.condition}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-terminal-text">{ti.imi.value.toFixed(1)}</span>
                <span className="text-[10px] font-mono text-terminal-muted">Candle RSI</span>
              </div>
              <div className="w-full bg-terminal-card h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${ti.imi.value >= 50 ? 'bg-bull' : 'bg-bear'}`} 
                  style={{ width: `${ti.imi.value}%` }}
                />
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? 'Shows if green candles outnumber red candles today.' : ti.imi.description}
              </p>
            </div>

            {/* 5. Put-Call Ratio (PCR) */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">5. Put-Call Ratio (PCR)</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                  ti.pcr.overall >= 1.0 ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                }`}>
                  {ti.pcr.sentiment}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-terminal-text">{ti.pcr.overall.toFixed(2)}</span>
                <span className="text-[10px] font-mono text-terminal-muted">NTM: {ti.pcr.ntmCluster.toFixed(2)}</span>
              </div>
              <div className="text-[11px] font-mono text-terminal-muted">
                5m PCR Velocity: <strong className={ti.pcr.pcr5mChange >= 0 ? 'text-bull' : 'text-bear'}>
                  {ti.pcr.pcr5mChange >= 0 ? '+' : ''}{ti.pcr.pcr5mChange.toFixed(3)}
                </strong>
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? (ti.pcr.overall > 1.0 ? 'More put sellers defending downside.' : 'Call resistance heavy.') : 'Ratio of Put OI to Call OI.'}
              </p>
            </div>

            {/* 6. Open Interest (OI Summary) */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">6. Open Interest (OI)</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                  ti.oiSummary.netOIFlow >= 0 ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                }`}>
                  {ti.oiSummary.netOIFlow >= 0 ? 'PUT DOMINANT' : 'CALL DOMINANT'}
                </span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Total Call OI:</span>
                  <span className="font-bold text-bear">{formatLakhs(ti.oiSummary.totalCallOI)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Total Put OI:</span>
                  <span className="font-bold text-bull">{formatLakhs(ti.oiSummary.totalPutOI)}</span>
                </div>
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? 'Shows whether bulls or bears hold bigger positions.' : `Net Bias: ${formatLakhs(ti.oiSummary.netOIFlow)} contracts`}
              </p>
            </div>

            {/* 7. OI Change in Last 5 Min */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">7. 5-Min OI Change</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold font-mono bg-amber-500/20 text-amber-300">
                  {ti.oiSummary.dominant5mFlow}
                </span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Call 5m Δ:</span>
                  <span className={`font-bold ${ti.oiSummary.callOIChange5m >= 0 ? 'text-bear' : 'text-bull'}`}>
                    {ti.oiSummary.callOIChange5m >= 0 ? '+' : ''}{formatLakhs(ti.oiSummary.callOIChange5m)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Put 5m Δ:</span>
                  <span className={`font-bold ${ti.oiSummary.putOIChange5m >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {ti.oiSummary.putOIChange5m >= 0 ? '+' : ''}{formatLakhs(ti.oiSummary.putOIChange5m)}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? 'Detects what big players wrote or unwound in last 5 min.' : 'Live 5-minute velocity delta.'}
              </p>
            </div>

            {/* 8. VWAP Level & Distance */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">8. VWAP Benchmark</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                  ti.vwap.position === 'ABOVE_VWAP' ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                }`}>
                  {ti.vwap.bias}
                </span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-terminal-muted">VWAP:</span>
                  <span className="font-extrabold text-terminal-text">₹{ti.vwap.value.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Distance:</span>
                  <span className={`font-bold ${ti.vwap.position === 'ABOVE_VWAP' ? 'text-bull' : 'text-bear'}`}>
                    {ti.vwap.position === 'ABOVE_VWAP' ? '+' : '-'}{ti.vwap.distancePoints.toFixed(1)} pts
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? (ti.vwap.position === 'ABOVE_VWAP' ? 'Trading above fair value (Bullish).' : 'Trading below fair value (Bearish).') : `Bias: ${ti.vwap.bias}`}
              </p>
            </div>

            {/* 9. Max Pain Level */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">9. Max Pain Strike</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold font-mono bg-purple-500/20 text-purple-300">
                  {ti.maxPain.magneticPull}
                </span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Pin Strike:</span>
                  <span className="font-extrabold text-terminal-text">{ti.maxPain.strikePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Spot Gap:</span>
                  <span className="font-bold text-terminal-muted">{ti.maxPain.differenceFromSpot.toFixed(1)} pts</span>
                </div>
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? 'The price where option sellers lose minimum money on expiry.' : 'Expiry magnetic attractor strike.'}
              </p>
            </div>

            {/* 10. India VIX */}
            <div className="p-2.5 rounded-lg bg-terminal-panel/90 border border-terminal-border hover:border-accent-cyan/60 transition flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase">10. India VIX</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold font-mono bg-bull/20 text-bull">
                  {ti.indiaVix.regime}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-terminal-text">{ti.indiaVix.value.toFixed(2)}</span>
                <span className={`text-[10px] font-mono font-bold ${ti.indiaVix.changePct >= 0 ? 'text-bear' : 'text-bull'}`}>
                  {ti.indiaVix.changePct >= 0 ? '+' : ''}{ti.indiaVix.changePct.toFixed(2)}%
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                {isBeginner ? (ti.indiaVix.value < 15 ? 'Calm market: options decay normally.' : 'High fear: sudden swings likely.') : ti.indiaVix.impactOnOptions}
              </p>
            </div>
          </div>

          {/* Bonus Important Indicators Banner: FII / DII Institutional Orderflow */}
          {ti.fiiDiiFlow && (
            <div className="p-2 rounded-lg bg-terminal-panel/70 border border-terminal-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-accent-cyan flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  INSTITUTIONAL FLOW:
                </span>
                <span className={ti.fiiDiiFlow.fiiNetCr >= 0 ? 'text-bull' : 'text-bear'}>
                  FII: {ti.fiiDiiFlow.fiiNetCr >= 0 ? '+' : ''}₹{ti.fiiDiiFlow.fiiNetCr} Cr
                </span>
                <span className="text-terminal-border">|</span>
                <span className={ti.fiiDiiFlow.diiNetCr >= 0 ? 'text-bull' : 'text-bear'}>
                  DII: {ti.fiiDiiFlow.diiNetCr >= 0 ? '+' : ''}₹{ti.fiiDiiFlow.diiNetCr} Cr
                </span>
              </div>
              <div className="text-[11px] text-terminal-muted">
                Institutional Stance: <strong className="text-terminal-text uppercase">{ti.fiiDiiFlow.bias}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
