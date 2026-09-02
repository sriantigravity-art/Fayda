import React, { useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { calculateDynamicTarget } from '../utils/tradeHorizon';
import { getSignalTimingData, getUserTradeAdvice, formatIstClock } from '../utils/signalTimeHelper';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Target, 
  ShieldAlert, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle, 
  Calculator, 
  Layers, 
  Activity, 
  Sliders,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  BookOpen,
  Compass,
  Clock,
  Timer
} from 'lucide-react';
import { ALL_SYMBOLS_CONFIG } from '../types';

export const TradeGuidanceCard: React.FC = () => {
  const { currentIndexState, selectedIndex } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert, modeTitle, modeDescription, modeBadgeClass } = useTerminalMode();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [activeSetupForCalc, setActiveSetupForCalc] = useState<{ ltp: number; sl: number; target: number }>({
    ltp: 100,
    sl: 80,
    target: 140
  });

  // 1-second live clock ticker
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!currentIndexState) return null;

  const { recommendedTrades, spotPrice, atmStrike, resistanceLevels, supportLevels, strikes, masterConfluence, change, pctChange } = currentIndexState;
  const netChange = change ?? 0;
  const netPctChange = pctChange ?? 0;
  const mc = masterConfluence;

  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
  const isIndex = cfg ? cfg.isIndex : true;
  const lotSize = cfg?.lot || 50;

  const maxRange = cfg?.defaultRange ? cfg.defaultRange * 2.5 : 500;
  const step = cfg?.step || 50;

  const r1 = resistanceLevels && resistanceLevels.length > 0 
    ? (resistanceLevels.find(r => Math.abs(r.strikePrice - atmStrike) <= maxRange && r.strikePrice >= atmStrike) || resistanceLevels[0]) 
    : null;
  const s1 = supportLevels && supportLevels.length > 0 
    ? (supportLevels.find(s => Math.abs(s.strikePrice - atmStrike) <= maxRange && s.strikePrice <= atmStrike) || supportLevels[0]) 
    : null;

  // Helper to generate reference levels for EOD / Key Walls within dynamic strike range
  const getEODReferenceSetup = (type: 'BULLISH' | 'BEARISH') => {
    const isBull = type === 'BULLISH';
    const targetStrikePrice = isBull 
      ? (r1 ? r1.strikePrice : atmStrike + step * 2)
      : (s1 ? s1.strikePrice : atmStrike - step * 2);
    
    const optType = isBull ? 'CE' : 'PE';
    const strikeObj = strikes && strikes.length > 0 ? strikes.find(s => s.strikePrice === targetStrikePrice) : null;
    const ltp = strikeObj ? (isBull ? strikeObj.callLtp : strikeObj.putLtp) : 120;
    const cleanLtp = Math.max(10, ltp || 100);

    const dyn = calculateDynamicTarget(cleanLtp, targetStrikePrice, atmStrike);

    const rawIv = strikeObj ? (isBull ? strikeObj.callIv : strikeObj.putIv) : 13.5;
    const rawTheta = strikeObj ? (isBull ? strikeObj.callTheta : strikeObj.putTheta) : -8.5;
    const computedDelta = isBull 
      ? (targetStrikePrice > atmStrike ? 0.42 : 0.58) 
      : (targetStrikePrice < atmStrike ? -0.42 : -0.58);

    return {
      symbol: `${selectedIndex} ${targetStrikePrice} ${optType}`,
      strike: targetStrikePrice,
      type: optType,
      ltp: cleanLtp,
      recommendedEntry: `₹${cleanLtp.toFixed(2)} - ₹${(cleanLtp * 1.02).toFixed(2)}`,
      stoploss: `₹${dyn.slPrice.toFixed(2)} (-${dyn.slPct}%)`,
      target: `₹${dyn.targetPrice.toFixed(2)} (+${dyn.targetPct}%)`,
      slPoints: +(cleanLtp - dyn.slPrice).toFixed(2),
      targetPoints: +(dyn.targetPrice - cleanLtp).toFixed(2),
      slPct: dyn.slPct,
      targetPct: dyn.targetPct,
      riskReward: dyn.riskReward,
      iv: typeof rawIv === 'number' && !isNaN(rawIv) ? rawIv : 13.5,
      delta: computedDelta,
      gamma: 0.0028,
      theta: typeof rawTheta === 'number' && !isNaN(rawTheta) ? rawTheta : -8.5,
      actionTitle: isBull ? `Call Wall Resistance: ${targetStrikePrice} CE` : `Put Floor Support: ${targetStrikePrice} PE`,
      actionDescription: isBull
        ? `Major resistance at ${targetStrikePrice} with ${r1 ? r1.oiFormatted : 'heavy'} Calls. Upside target on breakout above ₹${cleanLtp.toFixed(2)}.`
        : `Strong institutional support floor at ${targetStrikePrice} with ${s1 ? s1.oiFormatted : 'heavy'} Puts. Downside trigger on breakdown below ₹${cleanLtp.toFixed(2)}.`
    };
  };

  const primaryBias = mc?.primaryBias || (currentIndexState.pcr && currentIndexState.pcr.atmPlusMinus5Pcr >= 1.05 ? 'BUY CALL' : currentIndexState.pcr && currentIndexState.pcr.atmPlusMinus5Pcr <= 0.90 ? 'BUY PUT' : 'NO TRADE');
  const setupGrade = mc?.setupGrade || 'B';
  const confidenceScore = mc?.totalScore || 70;

  const activeSetup = primaryBias === 'BUY CALL' ? getEODReferenceSetup('BULLISH') : getEODReferenceSetup('BEARISH');

  const timing = getSignalTimingData(currentIndexState.lastUpdated || new Date().toISOString(), 30, currentTime);
  const advice = getUserTradeAdvice({
    currentLtp: activeSetup.ltp,
    entryPrice: typeof activeSetup.ltp === 'number' ? activeSetup.ltp : 100,
    targetPrice: typeof activeSetup.targetPoints === 'number' ? activeSetup.ltp + activeSetup.targetPoints : activeSetup.ltp * 1.35,
    stoplossPrice: typeof activeSetup.slPoints === 'number' ? activeSetup.ltp - activeSetup.slPoints : activeSetup.ltp * 0.85,
    elapsedMinutes: timing.elapsedMinutes,
    maxValidityMinutes: timing.validUntilMinutes
  });

  const openRiskCalculatorForSetup = (setup: { ltp: number }) => {
    const dyn = calculateDynamicTarget(setup.ltp, atmStrike, atmStrike);
    setActiveSetupForCalc({
      ltp: setup.ltp,
      sl: dyn.slPrice,
      target: dyn.targetPrice
    });
    setIsRiskModalOpen(true);
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl shadow-subtle flex flex-col overflow-hidden font-sans select-none transition-all duration-300">
      {/* Top Header Bar with Mode Lens Badge & Live Clock */}
      <div className="px-3.5 sm:px-4 py-3 border-b border-terminal-border bg-terminal-panel/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div className={`p-1.5 rounded-lg ${
            isBeginner ? 'bg-bull/20 text-bull' : isIntermediate ? 'bg-amber/20 text-amber' : 'bg-accent-purple/20 text-accent-purple'
          }`}>
            {isBeginner ? <Compass className="w-4 h-4" /> : isIntermediate ? <Zap className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs sm:text-sm font-bold text-terminal-text">
                {isBeginner 
                  ? '🔰 Simple Step-by-Step Trade Guide' 
                  : isIntermediate 
                  ? '📊 Strategic Regime & Technical Playbook' 
                  : '🔬 Quantitative Greeks Sensitivity & Dealer Flow Matrix'}
              </h2>
              {/* Dynamic Mode Badge */}
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${modeBadgeClass}`}>
                {mode}
              </span>
              <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full font-bold border ${
                primaryBias === 'BUY CALL'
                  ? 'bg-bull/15 text-bull border-bull/30'
                  : primaryBias === 'BUY PUT'
                    ? 'bg-bear/15 text-bear border-bear/30'
                    : 'bg-terminal-elevated text-terminal-muted border-terminal-border'
              }`}>
                {primaryBias}
              </span>
            </div>
            <span className="text-[11px] text-terminal-muted hidden sm:block">
              {modeDescription}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono">
          {/* Running Live Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-terminal-bg border border-terminal-border text-[11px] text-accent-cyan">
            <Clock className="w-3 h-3 text-accent-cyan animate-pulse" />
            <span className="text-terminal-muted text-[10px] hidden xs:inline">LIVE:</span>
            <strong className="text-terminal-text">{formatIstClock(currentTime, true)}</strong>
          </div>

          {/* Grade / Confidence Badge */}
          <div className="flex items-center px-2 py-1 rounded-lg bg-terminal-panel border border-terminal-border text-xs">
            <span className="text-terminal-muted mr-1.5 font-medium">{isBeginner ? 'Accuracy:' : 'Grade:'}</span>
            <span className="font-mono font-bold text-accent-sky">{isBeginner ? `${confidenceScore}% Confidence` : `${setupGrade} (${confidenceScore}%)`}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 sm:p-4 space-y-3.5">
          {/* Signal Timing Equation & Actionability Decision Strip */}
          <div className="p-2.5 rounded-xl bg-terminal-panel/90 border border-terminal-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-terminal-bg border border-terminal-border text-accent-cyan font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-accent-cyan" />
                <span>GIVEN: {timing.givenTimeShort}</span>
              </span>
              <span className="text-terminal-muted text-[11px]">
                {timing.liveTimeFormatted} - {timing.givenTimeFormatted} = <strong className="text-accent-cyan font-bold">{timing.elapsedFormatted}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase shadow-sm ${advice.badgeClass}`}>
                {advice.badgeLabel}
              </span>
              <span className="text-[10px] text-terminal-muted">⏳ {timing.remainingMinutes}m valid</span>
            </div>
          </div>

          {/* Day's Net Movement & Price Action Context Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-terminal-panel/80 border border-terminal-border text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-sans font-bold text-terminal-muted">Day's Net Movement (Delta):</span>
              <span className={`font-black flex items-center gap-0.5 ${netChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                {netChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{netChange >= 0 ? '+' : ''}{netChange.toFixed(2)} pts ({netPctChange >= 0 ? '+' : ''}{netPctChange.toFixed(2)}%)</span>
              </span>
            </div>
            <span className="text-[10px] text-terminal-muted font-sans hidden sm:inline">
              Net point difference between live market LTP (₹{spotPrice > 0 ? spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}) and yesterday's official close
            </span>
          </div>

          {/* Active Fayda 25 Strategy Setup Banner */}
          {currentIndexState.faydaStrategy && (() => {
            const strat = currentIndexState.faydaStrategy;
            return (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-terminal-panel via-terminal-card to-terminal-panel border border-accent-sky/40 shadow-sm space-y-2.5 font-mono">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="p-1 rounded-lg bg-accent-sky/20 text-accent-sky text-xs">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs sm:text-sm text-terminal-text">
                          Fayda Strategy #{strat.strategyNumber}: {strat.strategyName}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          strat.category === 'TRENDING'
                            ? 'bg-bull/15 text-bull border-bull/30'
                            : strat.category === 'REVERSAL'
                            ? 'bg-accent-purple/15 text-accent-purple border-accent-purple/30'
                            : 'bg-amber/15 text-amber border-amber/30'
                        }`}>
                          {strat.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-accent-sky/15 text-accent-sky border border-accent-sky/30 font-bold">
                      R:R {strat.riskReward}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-terminal-panel text-terminal-text border border-terminal-border font-bold">
                      {strat.confidenceScore}% Conviction
                    </span>
                  </div>
                </div>

                <p className="text-xs text-terminal-muted font-sans leading-relaxed">
                  {strat.description}
                </p>

                {/* Breakout & Pattern Confluence */}
                {currentIndexState.patternBreakout && currentIndexState.patternBreakout.predictedBreakout && (
                  <div className="p-2 rounded-lg bg-accent-purple/10 border border-accent-purple/30 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <span className="flex items-center gap-1 text-accent-purple font-bold">
                      <Target className="w-3 h-3" />
                      <span>Chart Breakout: {currentIndexState.patternBreakout.activePattern?.patternName || 'Breakout'} ({currentIndexState.patternBreakout.activeTimeframe || '15m'})</span>
                    </span>
                    <span className="text-terminal-text font-mono font-bold">
                      Trigger: ₹{currentIndexState.patternBreakout.predictedBreakout.triggerPrice?.toFixed(2) || '—'} → TGT: ₹{currentIndexState.patternBreakout.predictedBreakout.target1?.toFixed(2) || '—'}
                    </span>
                  </div>
                )}

                {/* Technical Stop Loss, Entry, & Targets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-terminal-border/60">
                  <div className="p-2 rounded-lg bg-terminal-bg/70 border border-terminal-border">
                    <span className="text-[9px] text-terminal-muted uppercase block">Trigger Condition</span>
                    <span className="text-[11px] font-bold text-accent-sky truncate block">
                      {strat.triggerCondition}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-terminal-bg/70 border border-bear/30">
                    <span className="text-[9px] text-bear uppercase block">Technical Stop Loss</span>
                    <span className="text-[11px] font-bold text-bear block">
                      ₹{strat.stoplossPrice}
                    </span>
                    <span className="text-[9px] text-terminal-muted truncate block">
                      {strat.stoplossRationale}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-terminal-bg/70 border border-bull/30">
                    <span className="text-[9px] text-bull uppercase block">Target 1 (1:2 R:R)</span>
                    <span className="text-[11px] font-bold text-bull block">
                      ₹{strat.target1Price}
                    </span>
                    <span className="text-[9px] text-terminal-muted block">Primary Book</span>
                  </div>

                  <div className="p-2 rounded-lg bg-terminal-bg/70 border border-bull/30">
                    <span className="text-[9px] text-bull uppercase block">Target 2 (Next Pivot)</span>
                    <span className="text-[11px] font-bold text-bull block">
                      ₹{strat.target2Price}
                    </span>
                    <span className="text-[9px] text-terminal-muted block">Runner Target</span>
                  </div>
                </div>

                {/* Fayda Multi-Leg Spread Alternative Pairing */}
                {currentIndexState.multiLegStrategy && (
                  <div className="p-2.5 rounded-xl bg-bull/10 border border-bull/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-bull shrink-0" />
                      <div>
                        <span className="font-bold text-terminal-text font-sans">
                          Fayda Defined-Risk Spread Alternative: {currentIndexState.multiLegStrategy.strategyName}
                        </span>
                        <p className="text-[10px] text-terminal-muted font-sans">
                          {currentIndexState.multiLegStrategy.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-terminal-panel text-bear font-bold">
                        Max Risk: {typeof currentIndexState.multiLegStrategy.maxLossRupees === 'number' ? `₹${currentIndexState.multiLegStrategy.maxLossRupees.toLocaleString('en-IN')}` : currentIndexState.multiLegStrategy.maxLossRupees}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-bull/20 text-bull font-bold">
                        {currentIndexState.multiLegStrategy.marginSavingsPct}% Margin Benefit
                      </span>
                    </div>
                  </div>
                )}

                {/* Order Flow Confirmation status */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-terminal-muted font-sans">
                  <span className="flex items-center gap-1.5 text-accent-cyan">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{strat.oiConfirmationDetails}</span>
                  </span>
                  <span className="text-[10px] text-terminal-muted">Timeframe: {strat.timeframe}</span>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* VIEW 1: BEGINNER MODE (Simplified, Plain English, Lot Risk & Rules)        */}
          {/* ========================================================================= */}
          {isBeginner && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Beginner Top Action Banner */}
              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                primaryBias === 'BUY CALL' ? 'bg-bull/10 border-bull/40' : primaryBias === 'BUY PUT' ? 'bg-bear/10 border-bear/40' : 'bg-terminal-panel border-terminal-border'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {primaryBias === 'BUY CALL' ? <TrendingUp className="w-5 h-5 text-bull animate-bounce" /> : <TrendingDown className="w-5 h-5 text-bear animate-bounce" />}
                    <span className="font-black text-sm sm:text-base tracking-tight text-terminal-text">
                      {primaryBias === 'BUY CALL' ? `🟢 Easy Trade Signal: Buy ${activeSetup.symbol}` : `🔴 Easy Trade Signal: Buy ${activeSetup.symbol}`}
                    </span>
                  </div>
                  <p className="text-xs text-terminal-muted">
                    {primaryBias === 'BUY CALL'
                      ? `Buyers are actively entering the market. Target upside is set at ₹${activeSetup.target} with strict Stop Loss at ₹${activeSetup.stoploss}.`
                      : `Sellers are dominating the market. Downside target is set at ₹${activeSetup.target} with strict Stop Loss at ₹${activeSetup.stoploss}.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openRiskCalculatorForSetup(activeSetup)}
                  className="px-4 py-2 rounded-xl bg-accent-sky hover:bg-accent-sky/90 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shrink-0"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Calculate Lot Risk (1 Lot)</span>
                </button>
              </div>

              {/* Beginner 3-Card Simple Numbers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                {/* Entry Price Card */}
                <div className="p-3 bg-terminal-panel rounded-xl border border-terminal-border">
                  <span className="text-[10px] font-sans font-bold text-accent-cyan uppercase block">1. Recommended Buy Price</span>
                  <span className="text-base sm:text-lg font-black text-terminal-text mt-0.5 block">{activeSetup.recommendedEntry}</span>
                  <span className="text-[10px] text-terminal-muted font-sans mt-0.5 block">Current Price: ₹{activeSetup.ltp.toFixed(2)}</span>
                </div>

                {/* Stop Loss Card */}
                <div className="p-3 bg-bear/10 rounded-xl border border-bear/30">
                  <span className="text-[10px] font-sans font-bold text-bear uppercase block">2. Strict Stop Loss (Safety Exit)</span>
                  <span className="text-base sm:text-lg font-black text-bear mt-0.5 block">{activeSetup.stoploss}</span>
                  <span className="text-[10px] text-terminal-muted font-sans mt-0.5 block">Risk: -₹{(activeSetup.slPoints * lotSize).toLocaleString('en-IN')} per lot</span>
                </div>

                {/* Target Card */}
                <div className="p-3 bg-bull/10 rounded-xl border border-bull/30">
                  <span className="text-[10px] font-sans font-bold text-bull uppercase block">3. Profit Target (Book Here)</span>
                  <span className="text-base sm:text-lg font-black text-bull mt-0.5 block">{activeSetup.target}</span>
                  <span className="text-[10px] text-terminal-muted font-sans mt-0.5 block">Reward: +₹{(activeSetup.targetPoints * lotSize).toLocaleString('en-IN')} per lot</span>
                </div>
              </div>

              {/* Beginner 3-Rule Capital Protection Checklist */}
              <div className="p-3 bg-terminal-panel/50 rounded-xl border border-terminal-border/80 text-xs space-y-1.5 font-sans">
                <span className="font-bold text-terminal-text text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-bull" /> 3 Golden Rules for Beginners:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-terminal-muted text-[11px]">
                  <div>✓ <strong>Trade Only 1 Lot</strong> to preserve capital while learning.</div>
                  <div>✓ <strong>Exit Immediately</strong> if price touches Stop Loss at ₹{activeSetup.stoploss}.</div>
                  <div>✓ <strong>Never Average Down</strong> in losing option buyer positions.</div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: INTERMEDIATE MODE (Technical Confluence, Risk-Reward, Levels)     */}
          {/* ========================================================================= */}
          {isIntermediate && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                {/* Primary Signal Summary Card */}
                <div className={`lg:col-span-4 p-3.5 rounded-xl border flex flex-col justify-between ${
                  primaryBias === 'BUY CALL'
                    ? 'bg-bull/5 border-bull/30'
                    : primaryBias === 'BUY PUT'
                      ? 'bg-bear/5 border-bear/30'
                      : 'bg-terminal-panel/60 border-terminal-border'
                }`}>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-terminal-muted uppercase tracking-wider block">
                      Multi-Factor Algorithmic Setup
                    </span>
                    <div className="flex items-center space-x-2">
                      {primaryBias === 'BUY CALL' ? (
                        <ArrowUpRight className="w-5 h-5 text-bull" />
                      ) : primaryBias === 'BUY PUT' ? (
                        <ArrowDownRight className="w-5 h-5 text-bear" />
                      ) : (
                        <Activity className="w-5 h-5 text-terminal-muted" />
                      )}
                      <span className={`text-base font-bold tracking-tight ${
                        primaryBias === 'BUY CALL' ? 'text-bull' : primaryBias === 'BUY PUT' ? 'text-bear' : 'text-terminal-text'
                      }`}>
                        {activeSetup.symbol}
                      </span>
                    </div>
                    <p className="text-xs text-terminal-muted leading-relaxed">
                      {activeSetup.actionDescription}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-terminal-border/60 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-terminal-text">
                      LTP: ₹{activeSetup.ltp.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openRiskCalculatorForSetup(activeSetup)}
                      className="px-2.5 py-1 rounded-lg bg-accent-sky/15 border border-accent-sky/40 hover:bg-accent-sky/25 text-accent-sky font-sans text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Size Position</span>
                    </button>
                  </div>
                </div>

                {/* Key Metric Levels Grid */}
                <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                  <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1">
                    <span className="text-[10px] text-terminal-muted font-sans font-medium uppercase tracking-wider block">
                      Entry Zone
                    </span>
                    <span className="text-sm font-bold text-terminal-text tabular-nums block">
                      {activeSetup.recommendedEntry}
                    </span>
                    <span className="text-[10px] text-terminal-muted font-sans">Market execution</span>
                  </div>

                  <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1">
                    <span className="text-[10px] text-bear font-sans font-medium uppercase tracking-wider block">
                      Stop Loss (SL)
                    </span>
                    <span className="text-sm font-bold text-bear tabular-nums block">
                      {activeSetup.stoploss}
                    </span>
                    <span className="text-[10px] text-terminal-muted font-sans">Hard invalidation</span>
                  </div>

                  <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1">
                    <span className="text-[10px] text-bull font-sans font-medium uppercase tracking-wider block">
                      Target (T1)
                    </span>
                    <span className="text-sm font-bold text-bull tabular-nums block">
                      {activeSetup.target}
                    </span>
                    <span className="text-[10px] text-terminal-muted font-sans">Primary resistance</span>
                  </div>

                  <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1">
                    <span className="text-[10px] text-terminal-muted font-sans font-medium uppercase tracking-wider block">
                      Risk : Reward
                    </span>
                    <span className="text-sm font-bold text-accent-sky tabular-nums block">
                      {activeSetup.riskReward}
                    </span>
                    <span className="text-[10px] text-terminal-muted font-sans">Favorable asymmetry</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: EXPERT MODE (Quant Greek Matrix, Delta/Gamma, Order Flow Vol)    */}
          {/* ========================================================================= */}
          {isExpert && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Expert Top Setup + Order Flow Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                <div className="lg:col-span-4 p-3.5 bg-accent-purple/5 border border-accent-purple/30 rounded-xl flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-accent-purple uppercase tracking-wider block font-mono">
                      Institutional Order Flow Setup
                    </span>
                    <div className="text-sm sm:text-base font-black text-terminal-text font-mono">
                      🎯 {activeSetup.symbol} (Delta {(activeSetup.delta ?? 0.50).toFixed(2)})
                    </div>
                    <p className="text-xs text-terminal-muted font-mono leading-relaxed">
                      {activeSetup.actionDescription}
                    </p>
                  </div>
                  <div className="pt-2.5 border-t border-accent-purple/20 flex items-center justify-between font-mono text-xs">
                    <span>LTP: ₹{activeSetup.ltp.toFixed(2)}</span>
                    <span className="text-bull font-bold">R:R {activeSetup.riskReward}</span>
                  </div>
                </div>

                {/* Quantitative Sensitivity Cards */}
                <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                  <div className="p-3 bg-terminal-panel rounded-xl border border-terminal-border">
                    <span className="text-[10px] text-accent-cyan uppercase block font-bold">Delta (Δ) Exposure</span>
                    <span className="text-base font-black text-terminal-text mt-0.5 block">{(activeSetup.delta ?? 0.50).toFixed(2)}</span>
                    <span className="text-[9px] text-terminal-muted">Rate of price change</span>
                  </div>

                  <div className="p-3 bg-terminal-panel rounded-xl border border-terminal-border">
                    <span className="text-[10px] text-accent-purple uppercase block font-bold">Gamma (Γ) Squeeze</span>
                    <span className="text-base font-black text-terminal-text mt-0.5 block">{(activeSetup.gamma ?? 0.0028).toFixed(4)}</span>
                    <span className="text-[9px] text-terminal-muted">Delta acceleration</span>
                  </div>

                  <div className="p-3 bg-terminal-panel rounded-xl border border-terminal-border">
                    <span className="text-[10px] text-bear uppercase block font-bold">Theta (Θ) Decay / Day</span>
                    <span className="text-base font-black text-bear mt-0.5 block">{(activeSetup.theta ?? -8.5).toFixed(2)} pts</span>
                    <span className="text-[9px] text-terminal-muted">Daily time erosion</span>
                  </div>

                  <div className="p-3 bg-terminal-panel rounded-xl border border-terminal-border">
                    <span className="text-[10px] text-amber uppercase block font-bold">IV Skew & Vega (ν)</span>
                    <span className="text-base font-black text-amber mt-0.5 block">{(activeSetup.iv ?? 13.5).toFixed(2)}% IV</span>
                    <span className="text-[9px] text-terminal-muted">Vol expansion sensitivity</span>
                  </div>
                </div>
              </div>

              {/* Full Multi-Strike Greek Matrix Table */}
              <div className="p-3 bg-terminal-panel/60 border border-terminal-border rounded-xl font-mono text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-terminal-border/60 pb-1.5">
                  <span className="text-[10px] font-black text-accent-purple uppercase tracking-wider">
                    Institutional Greek Sensitivity & Dealer Flow Matrix
                  </span>
                  <span className="text-[10px] text-terminal-muted">ATM ± 2 Strike Greeks</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="text-terminal-muted text-[9px] uppercase border-b border-terminal-border/50">
                      <tr>
                        <th className="py-1 px-2">Contract</th>
                        <th className="py-1 px-2 text-right">LTP</th>
                        <th className="py-1 px-2 text-right">Delta (Δ)</th>
                        <th className="py-1 px-2 text-right">Gamma (Γ)</th>
                        <th className="py-1 px-2 text-right">Theta (Θ)</th>
                        <th className="py-1 px-2 text-right">IV</th>
                        <th className="py-1 px-2 text-right">Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-terminal-border/30">
                      <tr>
                        <td className="py-1.5 px-2 font-bold text-terminal-text">{activeSetup.symbol}</td>
                        <td className="py-1.5 px-2 text-right font-bold">₹{activeSetup.ltp.toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-right text-accent-cyan font-bold">{(activeSetup.delta ?? 0.50).toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-right text-accent-purple font-bold">{(activeSetup.gamma ?? 0.0028).toFixed(4)}</td>
                        <td className="py-1.5 px-2 text-right text-bear font-bold">{(activeSetup.theta ?? -8.5).toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-right text-amber font-bold">{(activeSetup.iv ?? 13.5).toFixed(2)}%</td>
                        <td className="py-1.5 px-2 text-right text-bull font-bold">Entry {activeSetup.recommendedEntry}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Regulatory Non-Advisory Notice */}
          <div className="p-2.5 rounded-lg bg-terminal-panel/30 border border-terminal-border text-[11px] font-sans text-terminal-muted flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
            <span>
              <strong>Regulatory Notice:</strong> Analytical setups and scenarios are mathematically derived for decision support only. Trading derivatives involves significant capital risk. Always maintain strict position sizing.
            </span>
          </div>
        </div>
      )}

      {/* Risk Calculator Modal */}
      <RiskCalculatorModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        defaultLtp={activeSetupForCalc.ltp}
        defaultSl={activeSetupForCalc.sl}
        defaultTarget={activeSetupForCalc.target}
      />
    </div>
  );
};
