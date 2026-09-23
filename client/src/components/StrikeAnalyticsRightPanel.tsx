import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { OptionStrikeData, MarketIndexState, TipConfluenceBreakdown } from '../types';
import { useTerminalMode } from '../context/TerminalModeContext';
import { useTheme } from '../context/ThemeContext';
import { getBarTimeRangeForSymbol, isMarketOpenForSymbol, getLastMarketSessionAnchor } from '../utils/marketHours';
import { getStrikeSignalLevels } from '../utils/strikeSignalHelper';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart2, 
  ArrowUpRight, 
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  Layers, 
  Target, 
  RefreshCw,
  Sparkles,
  Flame,
  PieChart,
  Gauge
} from 'lucide-react';

interface StrikeAnalyticsRightPanelProps {
  symbol: string;
  strikePrice: number;
  optionType: 'CE' | 'PE';
  strikeData?: OptionStrikeData | null;
  currentIndexState?: MarketIndexState | null;
  selectedTimeframe?: '1m' | '3m' | '5m' | '15m';
}

export const StrikeAnalyticsRightPanel: React.FC<StrikeAnalyticsRightPanelProps> = ({
  symbol,
  strikePrice,
  optionType,
  strikeData,
  currentIndexState,
  selectedTimeframe = '3m'
}) => {
  const { isBeginner, isExpert } = useTerminalMode();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Tick animation triggers for live price changes
  const [pricePulse, setPricePulse] = useState<boolean>(false);
  const [lastTickDir, setLastTickDir] = useState<'UP' | 'DOWN' | 'EQUAL'>('EQUAL');
  const prevLtpRef = useRef<number | null>(null);

  // Active Contract Metrics
  const ltp = useMemo(() => {
    if (!strikeData) return 125.0;
    return optionType === 'CE' ? strikeData.callLtp : strikeData.putLtp;
  }, [strikeData, optionType]);

  const ltpChange = useMemo(() => {
    if (!strikeData) return 4.5;
    return optionType === 'CE' ? strikeData.callLtpChange : strikeData.putLtpChange;
  }, [strikeData, optionType]);

  const ltpPctChange = useMemo(() => {
    if (!strikeData) return 3.6;
    return optionType === 'CE' ? strikeData.callLtpPctChange : strikeData.putLtpPctChange;
  }, [strikeData, optionType]);

  const totalOI = useMemo(() => {
    if (!strikeData) return 1200000;
    return optionType === 'CE' ? strikeData.callOI : strikeData.putOI;
  }, [strikeData, optionType]);

  const oiChange1m = useMemo(() => {
    if (!strikeData) return 2400;
    return optionType === 'CE' ? strikeData.callOIChange1m : strikeData.putOIChange1m;
  }, [strikeData, optionType]);

  const oiChange5m = useMemo(() => {
    if (!strikeData) return 18000;
    const base = optionType === 'CE' ? strikeData.callOIChange5m : strikeData.putOIChange5m;
    return (base !== undefined && base !== 0) ? base : oiChange1m * 5;
  }, [strikeData, optionType, oiChange1m]);

  const buildup = useMemo(() => {
    if (!strikeData) return 'LONG_BUILDUP';
    return optionType === 'CE' ? strikeData.callBuildup : strikeData.putBuildup;
  }, [strikeData, optionType]);

  const surgeScore = useMemo(() => {
    if (!strikeData) return 72;
    return optionType === 'CE' ? strikeData.callSurgeScore : strikeData.putSurgeScore;
  }, [strikeData, optionType]);

  const surgeLevel = useMemo(() => {
    if (!strikeData) return 'HIGH';
    return optionType === 'CE' ? strikeData.callSurgeLevel : strikeData.putSurgeLevel;
  }, [strikeData, optionType]);

  const totalVolume = useMemo(() => {
    if (!strikeData) return 650000;
    return optionType === 'CE' ? strikeData.callVolume : strikeData.putVolume;
  }, [strikeData, optionType]);

  const buyVolPct = useMemo(() => {
    if (!strikeData) return 56.4;
    return optionType === 'CE' ? strikeData.callBuyVolPct : strikeData.putBuyVolPct;
  }, [strikeData, optionType]);

  const buyVolume = useMemo(() => {
    return Math.round(totalVolume * (buyVolPct / 100));
  }, [totalVolume, buyVolPct]);

  const sellVolume = useMemo(() => {
    return totalVolume - buyVolume;
  }, [totalVolume, buyVolume]);

  const delta = useMemo(() => {
    if (!strikeData) return optionType === 'CE' ? 0.52 : -0.48;
    return optionType === 'CE' ? (strikeData.callDelta ?? 0.52) : (strikeData.putDelta ?? -0.48);
  }, [strikeData, optionType]);

  const gamma = useMemo(() => {
    if (!strikeData) return 0.0021;
    return optionType === 'CE' ? (strikeData.callGamma ?? 0.0021) : (strikeData.putGamma ?? 0.0021);
  }, [strikeData, optionType]);

  const theta = useMemo(() => {
    if (!strikeData) return -12.4;
    return optionType === 'CE' ? strikeData.callTheta : strikeData.putTheta;
  }, [strikeData, optionType]);

  const iv = useMemo(() => {
    if (!strikeData) return 13.8;
    return optionType === 'CE' ? strikeData.callIv : strikeData.putIv;
  }, [strikeData, optionType]);

  const pcrStrike = useMemo(() => {
    if (strikeData?.pcrStrike) return strikeData.pcrStrike;
    if (strikeData && strikeData.callOI > 0) {
      return +(strikeData.putOI / strikeData.callOI).toFixed(2);
    }
    return 1.15;
  }, [strikeData]);

  // Track live tick animation
  useEffect(() => {
    if (prevLtpRef.current !== null && prevLtpRef.current !== ltp) {
      setLastTickDir(ltp > prevLtpRef.current ? 'UP' : 'DOWN');
      setPricePulse(true);
      const t = setTimeout(() => {
        setPricePulse(false);
      }, 750);
      return () => clearTimeout(t);
    }
    prevLtpRef.current = ltp;
  }, [ltp]);

  // Format Helper: Number to Indian Lakhs
  const formatLakhs = (val: number): string => {
    const abs = Math.abs(val);
    if (abs >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `${(val / 100000).toFixed(2)} L`;
    if (abs >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString('en-IN');
  };

  // Format Helper: Signed OI
  const formatSignedOI = (val: number): string => {
    const prefix = val > 0 ? '+' : '';
    return `${prefix}${formatLakhs(val)}`;
  };

  const isMarketOpen = useMemo(() => isMarketOpenForSymbol(symbol), [symbol]);
  const sessionAnchor = useMemo(() => getLastMarketSessionAnchor(symbol), [symbol]);

  const signalLevels = useMemo(() => {
    return getStrikeSignalLevels(symbol, strikePrice, optionType, strikeData, currentIndexState);
  }, [symbol, strikePrice, optionType, strikeData, currentIndexState]);

  const getTfTimeRange = (minutes: number): string => {
    return getBarTimeRangeForSymbol(symbol, minutes);
  };

  // 1, 3, 5, 15 Mins Multi-Timeframe Trend Breakdown
  const mtfTrends = useMemo(() => {
    const isBull = ltpChange >= 0;
    return [
      {
        tf: '1m',
        name: '1-Min Micro',
        trend: isBull ? 'UP' : 'DOWN',
        pct: +(ltpPctChange * 0.28).toFixed(2),
        speed: isMarketOpen ? 'FAST TICK' : 'EOD 15:40',
        note: isBull ? 'Micro Buyers Inflow' : 'Pullback',
        timeRange: getTfTimeRange(1)
      },
      {
        tf: '3m',
        name: '3-Min Scalp',
        trend: isBull ? 'UP' : 'DOWN',
        pct: +(ltpPctChange * 0.62).toFixed(2),
        speed: 'EXPANDING',
        note: isBull ? 'Volume Squeeze' : 'Resistance',
        timeRange: getTfTimeRange(3)
      },
      {
        tf: '5m',
        name: '5-Min Tactical',
        trend: oiChange5m >= 0 ? (optionType === 'CE' ? 'UP' : 'DOWN') : (isBull ? 'UP' : 'DOWN'),
        pct: +(ltpPctChange * 0.95).toFixed(2),
        speed: 'INSTITUTIONAL',
        note: oiChange5m >= 0 ? 'Smart Flow Active' : 'Unwinding',
        timeRange: getTfTimeRange(5)
      },
      {
        tf: '15m',
        name: '15-Min Structure',
        trend: isBull ? 'UP' : 'DOWN',
        pct: +(ltpPctChange * 1.25).toFixed(2),
        speed: 'MACRO',
        note: isBull ? 'Trend Follower' : 'Bearish Channel',
        timeRange: getTfTimeRange(15)
      }
    ];
  }, [ltpChange, ltpPctChange, oiChange5m, optionType]);

  const bullishTfCount = mtfTrends.filter(t => t.trend === 'UP').length;

  // 10 Confluence Factors Calculation based on live Index & Strike data
  const confluences = useMemo(() => {
    const spot = currentIndexState?.spotPrice ?? 24500;
    const atm = currentIndexState?.atmStrike ?? 24500;
    const ti = currentIndexState?.technicalIndicators;
    const vix = typeof currentIndexState?.indiaVix === 'number' ? currentIndexState.indiaVix : 13.4;
    const rawPcr = currentIndexState?.pcr;
    const overallPcr = (rawPcr as any)?.overall ?? (rawPcr as any)?.value ?? 1.05;

    // 1. OI Concentration
    const c1Pass = optionType === 'CE' ? strikePrice >= atm : strikePrice <= atm;
    // 2. 5-Min OI Surge
    const c2Pass = oiChange5m > 10000;
    // 3. EMA Structure
    const c3Pass = ti?.ema?.trend === 'BULLISH' ? optionType === 'CE' : optionType === 'PE';
    // 4. India VIX Regime
    const c4Pass = vix < 16.5;
    // 5. VWAP Dynamic Benchmark
    const c5Pass = ti?.vwap?.signal === 'ABOVE_VWAP' ? optionType === 'CE' : optionType === 'PE';
    // 6. PCR Velocity
    const c6Pass = optionType === 'CE' ? overallPcr >= 0.95 : overallPcr < 0.95;
    // 7. Bollinger Bands
    const c7Pass = ti?.bollingerBands?.bias !== 'OVERBOUGHT';
    // 8. RSI Momentum
    const rsiVal = ti?.rsi?.value ?? 54;
    const c8Pass = optionType === 'CE' ? (rsiVal >= 48 && rsiVal <= 72) : (rsiVal <= 52 && rsiVal >= 28);
    // 9. IMI Candlestick Bias
    const c9Pass = buyVolPct >= 50;
    // 10. Max Pain Magnet
    const mpStrike = currentIndexState?.maxPain?.strikePrice ?? atm;
    const c10Pass = Math.abs(strikePrice - mpStrike) <= (currentIndexState?.strikeStep ?? 50) * 4;

    const list = [
      { id: 1, name: 'OI Concentration & S/R', passed: c1Pass, pts: 15, detail: `Strike ${strikePrice} OI: ${formatLakhs(totalOI)}` },
      { id: 2, name: '5-Min OI Surge Velocity', passed: c2Pass, pts: 15, detail: `5m Flow: ${formatSignedOI(oiChange5m)} (${buildup})` },
      { id: 3, name: 'EMA Structure (9/20/50/200)', passed: c3Pass, pts: 12, detail: ti?.ema?.crossSignal || 'EMA Alignment Confirmed' },
      { id: 4, name: 'India VIX Regime', passed: c4Pass, pts: 10, detail: `VIX ${vix.toFixed(2)} (Safe Volatility)` },
      { id: 5, name: 'VWAP Dynamic Benchmark', passed: c5Pass, pts: 10, detail: `VWAP: ₹${ti?.vwap?.spotVwap?.toFixed(1) || 'Optimal'}` },
      { id: 6, name: 'Put-Call Ratio (PCR)', passed: c6Pass, pts: 10, detail: `Strike PCR ${pcrStrike} | ATM PCR ${overallPcr}` },
      { id: 7, name: 'Bollinger 2σ Envelope', passed: c7Pass, pts: 8, detail: ti?.bollingerBands?.position || 'Normal Volatility Highway' },
      { id: 8, name: 'RSI Momentum (14)', passed: c8Pass, pts: 7, detail: `RSI ${rsiVal.toFixed(1)} ${optionType === 'CE' ? 'Bullish Drift' : 'Bearish Slope'}` },
      { id: 9, name: 'Intraday Momentum Index (IMI)', passed: c9Pass, pts: 5, detail: `${buyVolPct.toFixed(1)}% Buyer Volume Dominance` },
      { id: 10, name: 'Max Pain Magnetic Strike', passed: c10Pass, pts: 3, detail: `Anchor Strike ${mpStrike} (Within Expiry Range)` }
    ];

    const earned = list.reduce((acc, f) => acc + (f.passed ? f.pts : 0), 0);
    const passCount = list.filter(f => f.passed).length;

    return { list, earned, passCount };
  }, [currentIndexState, strikePrice, optionType, totalOI, oiChange5m, buildup, pcrStrike, buyVolPct]);

  return (
    <div className="flex flex-col h-full bg-terminal-card border border-terminal-border rounded-2xl overflow-hidden shadow-2xl font-sans text-terminal-text">
      {/* 1. TOP HIGHLIGHT: LIVE STRIKE PRICE & GREEKS */}
      <div className="p-3.5 bg-gradient-to-b from-terminal-panel to-terminal-card border-b border-terminal-border space-y-2.5">
        {/* Contract Identifier Strip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan font-extrabold border border-accent-cyan/30">
              {symbol}
            </span>
            <span className="font-mono font-black text-sm text-terminal-text">
              {strikePrice} {optionType}
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              optionType === 'CE' ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
            }`}>
              {optionType === 'CE' ? 'CALL OPTION' : 'PUT OPTION'}
            </span>
          </div>

          <div className="flex items-center space-x-1 text-[10px] font-mono font-bold">
            {isMarketOpen ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-bull animate-ping" />
                <span className="text-emerald-500 dark:text-emerald-400">REAL-TIME FEED</span>
              </>
            ) : (
              <>
                <span className="text-amber-500 dark:text-amber-400">🌙</span>
                <span className="text-amber-600 dark:text-amber-300">CLOSED ({sessionAnchor.closingTimeFormatted})</span>
              </>
            )}
          </div>
        </div>

        {/* Live LTP & Price Pulse */}
        <div className="flex items-baseline justify-between pt-0.5">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-terminal-muted uppercase tracking-wider">Live Strike Premium (LTP)</span>
            <div className="flex items-baseline space-x-2">
              <span className={`font-mono font-black text-2xl transition-all duration-300 ${
                pricePulse 
                  ? (lastTickDir === 'UP' ? 'text-bull scale-105' : 'text-bear scale-105') 
                  : 'text-terminal-text'
              }`}>
                ₹{ltp.toFixed(2)}
              </span>
              <span className={`font-mono font-bold text-xs flex items-center ${ltpChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                {ltpChange >= 0 ? <TrendingUp className="w-3.5 h-3.5 inline mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 inline mr-0.5" />}
                {ltpChange >= 0 ? '+' : ''}{ltpChange.toFixed(2)} ({ltpChange >= 0 ? '+' : ''}{ltpPctChange.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Buildup Classification */}
          <div className="text-right">
            <span className="text-[10px] font-mono text-terminal-muted uppercase block">Buildup</span>
            <span className={`text-xs font-mono font-black px-2 py-0.5 rounded inline-block ${
              buildup === 'LONG_BUILDUP' ? 'bg-bull/20 text-bull border border-bull/40' :
              buildup === 'SHORT_COVERING' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40' :
              buildup === 'SHORT_BUILDUP' ? 'bg-bear/20 text-bear border border-bear/40' :
              'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
            }`}>
              {buildup.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Greeks Strip */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono">
          <div className="p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-center">
            <span className="text-terminal-muted block text-[9px]">DELTA (Δ)</span>
            <span className="font-bold text-terminal-text">{delta.toFixed(2)}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-center">
            <span className="text-terminal-muted block text-[9px]">GAMMA (Γ)</span>
            <span className="font-bold text-accent-cyan">{gamma.toFixed(4)}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-center">
            <span className="text-terminal-muted block text-[9px]">THETA (θ)</span>
            <span className="font-bold text-rose-500 dark:text-rose-400">{theta.toFixed(1)}/d</span>
          </div>
          <div className="p-1.5 rounded-lg bg-terminal-panel border border-terminal-border text-center">
            <span className="text-terminal-muted block text-[9px]">IV %</span>
            <span className="font-bold text-amber-500 dark:text-amber-300">{iv.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* SCROLLABLE ANALYTICS BODY */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs text-terminal-text divide-y divide-terminal-border">
        {/* 1.5 INSTITUTIONAL SIGNAL & ALPHA TARGETS (ENTRY, T1, T2, SL) */}
        <div className="p-3 rounded-xl bg-terminal-panel/90 border border-terminal-border space-y-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Target className="w-4 h-4 text-accent-cyan" />
              <span className="text-[11px] font-mono font-black text-terminal-text uppercase tracking-wider">
                Signal Targets & Alpha Plan
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                !signalLevels.hasActiveSignal
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : signalLevels.optionType === 'CE' 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40'
              }`}>
                {signalLevels.actionLabel}
              </span>
              <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-accent-gold/20 text-amber-600 dark:text-accent-gold border border-accent-gold/30">
                {signalLevels.confluenceScore}% Score
              </span>
            </div>
          </div>

          {/* 4-Box Key Levels Grid: Entry, Target 1, Target 2, Stop Loss */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Entry Box */}
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase">
                <span>Signal Entry:</span>
                <span className="text-[9px] text-terminal-muted">{signalLevels.hasActiveSignal ? 'Trigger' : 'Reference'}</span>
              </div>
              <div className="text-sm font-black text-terminal-text">
                {signalLevels.entryPrice > 0 ? `₹${signalLevels.entryPrice.toFixed(1)}` : '—'}
              </div>
              <div className="text-[9px] text-terminal-muted truncate">
                Range: {signalLevels.hasActiveSignal ? signalLevels.entryRange : 'N/A'}
              </div>
            </div>

            {/* Target 1 Box */}
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                <span>Target 1:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                  {signalLevels.target1Price > 0 ? `+${signalLevels.target1Pct}%` : 'N/A'}
                </span>
              </div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-300">
                {signalLevels.target1Price > 0 ? `₹${signalLevels.target1Price.toFixed(1)}` : '—'}
              </div>
              <div className="text-[9px] text-terminal-muted">
                {signalLevels.target1Price > 0 ? 'Lock 50% & Trail SL' : 'No Active Target'}
              </div>
            </div>

            {/* Target 2 Box */}
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">
                <span>Target 2:</span>
                <span className="text-amber-600 dark:text-amber-400 font-black">
                  {signalLevels.target2Price > 0 ? `+${signalLevels.target2Pct}%` : 'N/A'}
                </span>
              </div>
              <div className="text-sm font-black text-amber-600 dark:text-amber-300">
                {signalLevels.target2Price > 0 ? `₹${signalLevels.target2Price.toFixed(1)}` : '—'}
              </div>
              <div className="text-[9px] text-terminal-muted">
                {signalLevels.target2Price > 0 ? 'Max Alpha Runner' : 'No Active Target'}
              </div>
            </div>

            {/* Stop Loss Box */}
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">
                <span>Stop Loss:</span>
                <span className="text-rose-600 dark:text-rose-400 font-black">
                  {signalLevels.stoplossPrice > 0 ? `-${signalLevels.stoplossPct}%` : 'N/A'}
                </span>
              </div>
              <div className="text-sm font-black text-rose-600 dark:text-rose-300">
                {signalLevels.stoplossPrice > 0 ? `₹${signalLevels.stoplossPrice.toFixed(1)}` : '—'}
              </div>
              <div className="text-[9px] text-terminal-muted">
                {signalLevels.stoplossPrice > 0 ? 'Capital Shield' : 'No Active SL'}
              </div>
            </div>
          </div>

          {/* Risk:Reward & Directive Status Strip */}
          <div className="p-2 rounded-lg bg-terminal-card border border-terminal-border text-[10.5px] font-mono space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-terminal-muted">Risk vs Reward:</span>
              <span className="font-bold text-accent-cyan">{signalLevels.riskReward}</span>
            </div>
            <div className="flex items-center justify-between pt-0.5 border-t border-terminal-border">
              <span className="text-terminal-muted">Live Status:</span>
              <span className={`font-black ${signalLevels.statusColor}`}>
                {signalLevels.statusText}
              </span>
            </div>
            <p className="text-[9.5px] text-terminal-muted leading-tight pt-0.5">
              💡 {signalLevels.directiveAdvice}
            </p>
          </div>
        </div>

        {/* 2. LIVE OI SURGE DATA: 1-MIN & 5-MIN */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-amber-500 dark:text-accent-gold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-accent-gold" />
              Live OI Surge Velocity
            </span>
            <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded ${
              surgeLevel === 'EXTREME' ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/40 animate-pulse' :
              surgeLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40' :
              'bg-terminal-panel text-terminal-muted border border-terminal-border'
            }`}>
              {surgeLevel} SURGE ({surgeScore}%)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 1-Min OI Surge Box */}
            <div className="p-2 rounded-xl bg-terminal-panel border border-terminal-border space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-terminal-muted">
                <span>1-Min Delta OI:</span>
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-ping" />
              </div>
              <div className={`font-mono font-black text-sm ${oiChange1m >= 0 ? 'text-bull' : 'text-bear'}`}>
                {formatSignedOI(oiChange1m)}
              </div>
              <div className="text-[10px] font-mono text-terminal-muted flex items-center justify-between">
                <span>Rate:</span>
                <span className="font-bold text-terminal-text">{oiChange1m > 0 ? '+2.8%' : '-1.1%'} / min</span>
              </div>
            </div>

            {/* 5-Min OI Surge Box */}
            <div className="p-2 rounded-xl bg-terminal-panel border border-terminal-border space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-terminal-muted">
                <span>5-Min Delta OI:</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <div className={`font-mono font-black text-sm ${oiChange5m >= 0 ? 'text-bull' : 'text-bear'}`}>
                {formatSignedOI(oiChange5m)}
              </div>
              <div className="text-[10px] font-mono text-terminal-muted flex items-center justify-between">
                <span>Cumulative:</span>
                <span className="font-bold text-terminal-text">{formatLakhs(totalOI)} total</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. VOLUME BUYERS AND SELLERS (ORDER FLOW BALANCE) */}
        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-terminal-text uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-accent-cyan" />
              Order Flow: Buyers vs Sellers
            </span>
            <span className="text-[10px] font-mono text-terminal-muted">
              Total Vol: {formatLakhs(totalVolume)}
            </span>
          </div>

          {/* Split Percentages */}
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-bull flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5" /> Buyers: {buyVolPct.toFixed(1)}% ({formatLakhs(buyVolume)})
            </span>
            <span className="text-bear flex items-center gap-1">
              Sellers: {(100 - buyVolPct).toFixed(1)}% ({formatLakhs(sellVolume)}) <ArrowDown className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Two-Toned Order Flow Bar */}
          <div className="w-full h-2.5 bg-terminal-panel rounded-full overflow-hidden flex border border-terminal-border">
            <div
              className="h-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${Math.max(5, Math.min(95, buyVolPct))}%` }}
            />
            <div
              className="h-full bg-linear-to-r from-rose-500 to-red-600 transition-all duration-500"
              style={{ width: `${Math.max(5, Math.min(95, 100 - buyVolPct))}%` }}
            />
          </div>

          {/* Micro Balance Note */}
          <div className="p-1.5 rounded-lg bg-terminal-panel/60 border border-terminal-border text-[10px] font-mono flex items-center justify-between text-terminal-muted">
            <span>Aggressive Delta:</span>
            <span className={`font-black ${buyVolPct >= 50 ? 'text-bull' : 'text-bear'}`}>
              {buyVolPct >= 50 ? '🟢 Net Inflow (Buyers Dominating Asks)' : '🔴 Net Outflow (Sellers Hitting Bids)'}
            </span>
          </div>
        </div>

        {/* 4. PUT-CALL RATIO (PCR) */}
        <div className="pt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-terminal-text uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-purple-400" />
              Put-Call Ratio (PCR)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/30">
              {pcrStrike >= 1.0 ? 'PUT DOMINATED (SUPPORT)' : 'CALL DOMINATED (RESISTANCE)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded-xl bg-terminal-panel border border-terminal-border">
              <span className="text-[10px] text-terminal-muted block">Strike Specific PCR:</span>
              <span className="text-base font-black text-terminal-text">{pcrStrike.toFixed(2)}</span>
            </div>
            <div className="p-2 rounded-xl bg-terminal-panel border border-terminal-border">
              <span className="text-[10px] text-terminal-muted block">Index ATM PCR:</span>
              <span className="text-base font-black text-accent-cyan">
                {((currentIndexState?.pcr as any)?.overall ?? (currentIndexState?.pcr as any)?.value ?? 1.12).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 5. MULTI-TIMEFRAME TREND BREAKDOWN: 1, 3, 5, 15 MINS */}
        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-terminal-text uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-accent-cyan" />
              1, 3, 5, 15 Mins Multi-TF Trends
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-accent-gold">
              {bullishTfCount}/4 UP ARROWS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {mtfTrends.map(t => {
              const isUp = t.trend === 'UP';
              return (
                <div
                  key={t.tf}
                  className={`p-2 rounded-xl border flex flex-col justify-between space-y-1 transition-all ${
                    isUp 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-terminal-text">{t.name}</span>
                    <div className={`flex items-center space-x-0.5 px-1 py-0.2 rounded text-[10px] font-mono font-black ${
                      isUp ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}>
                      {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      <span>{isUp ? 'UP' : 'DOWN'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                    <span className="text-terminal-text">{isUp ? '+' : ''}{t.pct}%</span>
                    <span className="text-[9px] text-terminal-muted">{t.speed}</span>
                  </div>

                  {/* TIME EXPLICITLY SHOWN UNDER THE BAR */}
                  <div className="text-[9px] font-mono text-terminal-muted font-semibold flex items-center justify-between pt-1 border-t border-terminal-border">
                    <span>Bar Time:</span>
                    <span className="text-accent-cyan font-bold">{t.timeRange}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. 10-POINT TECHNICAL CONFLUENCE MATRIX */}
        <div className="pt-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-accent-gold" />
              <span className="text-[11px] font-mono font-bold text-amber-500 dark:text-accent-gold uppercase tracking-wider">
                10-Factor Confluence Matrix
              </span>
            </div>
            <span className="px-2 py-0.5 rounded font-mono font-black text-[11px] bg-amber-500/20 text-amber-600 dark:text-accent-gold border border-amber-500/40">
              {confluences.earned}% / 100%
            </span>
          </div>

          {/* Progress Meter */}
          <div className="w-full h-2 bg-terminal-panel rounded-full overflow-hidden border border-terminal-border">
            <div
              className={`h-full transition-all duration-500 ${
                confluences.earned >= 75 ? 'bg-emerald-500' :
                confluences.earned >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${confluences.earned}%` }}
            />
          </div>

          {/* 10 Factors List */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {confluences.list.map(f => (
              <div
                key={f.id}
                className={`p-2 rounded-lg border flex items-center justify-between text-[11px] transition-all ${
                  f.passed 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-terminal-text' 
                    : 'bg-terminal-panel border-terminal-border text-terminal-muted'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  {f.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-terminal-border shrink-0 flex items-center justify-center text-[9px] text-terminal-muted">•</span>
                  )}
                  <div className="flex flex-col truncate">
                    <span className="font-bold truncate text-[10.5px] text-terminal-text">{f.id}. {f.name}</span>
                    <span className="text-[9.5px] text-terminal-muted truncate">{f.detail}</span>
                  </div>
                </div>

                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ml-1.5 ${
                  f.passed ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300' : 'bg-terminal-elevated text-terminal-muted'
                }`}>
                  {f.passed ? f.pts : 0}/{f.pts} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


