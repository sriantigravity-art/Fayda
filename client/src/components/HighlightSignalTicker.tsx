import React, { useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { calculateTargetHorizon, calculateDynamicTarget } from '../utils/tradeHorizon';
import { getSignalTimingData, getUserTradeAdvice } from '../utils/signalTimeHelper';
import { Zap, Target, Clock, Pause, Play, ShieldCheck, Layers, Sparkles, Timer } from 'lucide-react';
import type { IndexSymbol } from '../types';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime } from '../utils/formatTime';
import { isContractOrSignalExpired } from '../utils/expiryHelper';

export const HighlightSignalTicker: React.FC = () => {
  const { indices, visibleIndices, setSelectedIndex, selectedIndex, openTradeTipModal } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [tickerSpeed, setTickerSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Live 1-second ticker for real-time elapsed calculations & clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ticker speed: 18s (FAST), 28s (NORMAL), 48s (SLOW)
  const speedSeconds = tickerSpeed === 'SLOW' ? 48 : tickerSpeed === 'NORMAL' ? 28 : 18;
  const isAnimationPaused = isPaused || isHovered;

  const COMMODITY_SYMBOLS: IndexSymbol[] = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'];
  const isCommodity = (sym: string) => COMMODITY_SYMBOLS.includes(sym as IndexSymbol);

  // Check Official Market Hours: 09:15 to 15:40 IST (Mon-Fri) for NSE/BSE Equity
  const isNseMarketHours = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;

    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    return currentMin >= (9 * 60 + 15) && currentMin < (15 * 60 + 40);
  };

  // Check if specific symbol market is currently open
  const isSymbolMarketOpen = (sym: string) => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;

    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    if (isCommodity(sym)) {
      // MCX Commodities: 09:00 to 23:30 IST
      return currentMin >= (9 * 60) && currentMin < (23 * 60 + 30);
    }
    // NSE / BSE Equity & Index Derivatives: 09:15 to 15:40 IST
    return currentMin >= (9 * 60 + 15) && currentMin < (15 * 60 + 40);
  };

  const isLiveNseMarket = isNseMarketHours();

  // Determine symbols to scan based on active market hours
  const symbolsToScan = React.useMemo(() => {
    if (isLiveNseMarket) {
      return visibleIndices;
    }
    // After NSE hours: Strictly scan only open MCX Commodities!
    const activeCommoditiesInVisible = visibleIndices.filter(s => isCommodity(s) && isSymbolMarketOpen(s));
    if (activeCommoditiesInVisible.length > 0) {
      return activeCommoditiesInVisible;
    }
    // If user has only equity symbols selected in visibleIndices, provide live open MCX commodities
    return COMMODITY_SYMBOLS.filter(c => isSymbolMarketOpen(c));
  }, [visibleIndices, isLiveNseMarket, currentTime]);

  // Build list of active setups across eligible open symbols
  const activeSetups = React.useMemo(() => {
    return symbolsToScan.map((sym) => {
      const idxState = indices[sym];
      const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === sym);
      const isIndex = cfg?.isIndex ?? true;
      const { 
        recommendedTrades, 
        atmStrike, 
        strikes = [], 
        daysToExpiry, 
        pcr,
        resistanceLevels,
        lastUpdated,
        patternBreakout,
        faydaStrategy,
        multiLegStrategy
      } = idxState || { atmStrike: 100, strikes: [], recommendedTrades: {} as any };

      const primeCall = idxState?.sessionTips?.topCallTrade;
      const primePut = idxState?.sessionTips?.topPutTrade;
      const primePick = primeCall || primePut;
      const fallbackTime = formatISTTime(lastUpdated || new Date());

      // 1. Absolute Priority: Mirror the Prime High-Probability Tip so there is ONE single source of truth
      if (primePick) {
        const isBull = primePick.contractSymbol.includes('CE');
        return {
          symbol: sym,
          strike: primePick.contractSymbol,
          action: isBull ? 'BUY CALL' : 'BUY PUT',
          isBull,
          isLiveSignal: true,
          ltp: primePick.currentLtp,
          entry: primePick.entryRange || `₹${primePick.entryPrice.toFixed(2)}`,
          exitSL: `₹${primePick.stoplossPrice.toFixed(2)}`,
          target: `₹${primePick.target1Price.toFixed(2)}`,
          riskReward: primePick.riskReward || '1:2.5',
          score: primePick.confluenceScore,
          rawTimestamp: primePick.entryTimeFormatted || lastUpdated || new Date().toISOString(),
          time: primePick.entryTimeFormatted || fallbackTime,
          isStoplossHit: primePick.status === 'SL_HIT',
          horizon: undefined,
          breakoutStatus: primePick.strategyTag,
          faydaStrategyMatch: `🎯 ${primePick.confluenceScore}% Confluence Prime`,
          multiLegAlternative: undefined
        };
      }

      const bullishPick = recommendedTrades?.bullishPick;
      const bearishPick = recommendedTrades?.bearishPick;

      const isPickExpired = (p: typeof bullishPick) => {
        if (!p) return true;
        return isContractOrSignalExpired(p.expiryDate, p.timestamp, p.validUntilMinutes);
      };

      // 2. Secondary fallback: High-conviction surge pick (Score >= 88%)
      let pick = (bullishPick && !isPickExpired(bullishPick) && Math.abs(bullishPick.strikePrice - atmStrike) <= 400) ? bullishPick : null;
      if (!pick && bearishPick && !isPickExpired(bearishPick) && Math.abs(bearishPick.strikePrice - atmStrike) <= 400) {
        pick = bearishPick;
      }

      // 2. If live pick is active & unexpired:
      if (pick) {
        const isBull = pick.tradeAction === 'BUY_CALL';
        const pLtp = typeof pick.suggestedContract.ltp === 'number' ? pick.suggestedContract.ltp : 0;
        const pSl = parseFloat(String(pick.suggestedContract.stoploss || '').replace(/[^0-9.]/g, '')) || 0;
        const pTgt = parseFloat(String(pick.suggestedContract.target || '').replace(/[^0-9.]/g, '')) || (pLtp * 1.35);
        const isSlHit = pLtp > 0 && pSl > 0 && pLtp <= pSl;

        const horizon = calculateTargetHorizon(
          sym,
          pick.strikePrice,
          atmStrike,
          pick.optionType,
          pLtp,
          pTgt,
          pick.surgeScore,
          daysToExpiry ?? 2,
          pcr?.atmPlusMinus5Pcr ?? 1.0,
          isIndex
        );

        return {
          symbol: sym,
          strike: pick.suggestedContract.symbol,
          action: pick.tradeAction === 'BUY_CALL' ? 'BUY CALL' : 'BUY PUT',
          isBull,
          isLiveSignal: true,
          ltp: pick.suggestedContract.ltp,
          entry: pick.suggestedContract.recommendedEntry,
          exitSL: pick.suggestedContract.stoploss,
          target: pick.suggestedContract.target,
          riskReward: pick.suggestedContract.riskReward || '1:2.0',
          score: pick.surgeScore,
          rawTimestamp: pick.timestamp || lastUpdated || new Date().toISOString(),
          time: pick.timeFormatted || fallbackTime,
          isStoplossHit: isSlHit,
          horizon,
          breakoutStatus: pick.breakoutStatus || (patternBreakout ? `✓ ${patternBreakout.activePattern.patternName} Breakout` : undefined),
          faydaStrategyMatch: pick.faydaStrategyMatch || (faydaStrategy ? `✓ ${faydaStrategy.strategyName}` : undefined),
          multiLegAlternative: pick.multiLegAlternative || (multiLegStrategy ? {
            spreadName: multiLegStrategy.strategyName,
            legsSummary: multiLegStrategy.description,
            maxRiskRupees: typeof multiLegStrategy.maxLossRupees === 'number' ? multiLegStrategy.maxLossRupees : 2500,
            maxProfitRupees: typeof multiLegStrategy.maxProfitRupees === 'number' ? multiLegStrategy.maxProfitRupees : 5000,
            breakeven: multiLegStrategy.upperBreakeven || 0,
            marginBenefitPct: multiLegStrategy.marginSavingsPct || 70
          } : undefined)
        };
      }

      // 3. Live reference setup for currently open symbols
      const isBull = true;
      const maxRange = cfg?.defaultRange ? cfg.defaultRange * 2.5 : 500;
      const step = cfg?.step || 50;
      const r1 = resistanceLevels && resistanceLevels.length > 0 
        ? (resistanceLevels.find(r => Math.abs(r.strikePrice - atmStrike) <= maxRange && r.strikePrice >= atmStrike) || resistanceLevels[0])
        : null;
      const targetStrike = r1 ? r1.strikePrice : (atmStrike + step * 2);
      const optType = isBull ? 'CE' : 'PE';
      const strikeObj = strikes.find(s => s.strikePrice === targetStrike);
      const ltp = strikeObj ? strikeObj.callLtp : 120;
      const cleanLtp = Math.max(10, ltp);

      const dyn = calculateDynamicTarget(cleanLtp, targetStrike, atmStrike);
      const isSlHit = cleanLtp > 0 && dyn.slPrice > 0 && cleanLtp <= dyn.slPrice;

      const horizon = calculateTargetHorizon(
        sym,
        targetStrike,
        atmStrike,
        optType,
        cleanLtp,
        dyn.targetPrice,
        88,
        daysToExpiry ?? 2,
        pcr?.atmPlusMinus5Pcr ?? 1.0,
        isIndex
      );

      const rawTimestamp = lastUpdated || new Date().toISOString();

      return {
        symbol: sym,
        strike: `${sym} ${targetStrike} ${optType}`,
        action: isBull ? 'BUY CALL' : 'BUY PUT',
        isBull,
        isLiveSignal: false,
        ltp: cleanLtp,
        entry: `₹${(cleanLtp * 0.98).toFixed(2)} - ₹${(cleanLtp * 1.02).toFixed(2)}`,
        exitSL: `₹${dyn.slPrice.toFixed(2)}`,
        target: `₹${dyn.targetPrice.toFixed(2)}`,
        riskReward: dyn.riskReward,
        score: 88,
        rawTimestamp,
        time: fallbackTime,
        isStoplossHit: isSlHit,
        horizon,
        breakoutStatus: patternBreakout ? `✓ ${patternBreakout.activePattern.patternName} Breakout` : undefined,
        faydaStrategyMatch: faydaStrategy ? `✓ ${faydaStrategy.strategyName}` : undefined,
        multiLegAlternative: multiLegStrategy ? {
          spreadName: multiLegStrategy.strategyName,
          legsSummary: multiLegStrategy.description,
          maxRiskRupees: typeof multiLegStrategy.maxLossRupees === 'number' ? multiLegStrategy.maxLossRupees : 2500,
          maxProfitRupees: typeof multiLegStrategy.maxProfitRupees === 'number' ? multiLegStrategy.maxProfitRupees : 5000,
          breakeven: multiLegStrategy.upperBreakeven || 0,
          marginBenefitPct: multiLegStrategy.marginSavingsPct || 70
        } : undefined
      };
    });
  }, [symbolsToScan, indices, isBeginner, isIntermediate, isExpert, isLiveNseMarket, currentTime]);

  const renderSetupItem = (item: (typeof activeSetups)[0], uniquePrefix: string) => {
    const isSl = item.isStoplossHit;
    const isBull = item.isBull;

    const timing = getSignalTimingData(
      item.rawTimestamp,
      item.horizon?.validUntilMinutes ?? (item.score >= 90 ? 25 : 35),
      currentTime
    );

    const advice = getUserTradeAdvice({
      currentLtp: item.ltp,
      entryPrice: parseFloat(String(item.entry).replace(/[^0-9.]/g, '')) || item.ltp,
      targetPrice: parseFloat(String(item.target).replace(/[^0-9.]/g, '')) || (item.ltp * 1.3),
      stoplossPrice: parseFloat(String(item.exitSL).replace(/[^0-9.]/g, '')) || (item.ltp * 0.8),
      elapsedMinutes: timing.elapsedMinutes,
      maxValidityMinutes: timing.validUntilMinutes
    });

    const handleOpenModal = () => {
      openTradeTipModal({
        symbol: item.symbol,
        contractSymbol: item.strike,
        optionType: item.strike.includes('PE') ? 'PE' : 'CE',
        action: item.isBull ? 'BUY_CALL' : 'BUY_PUT',
        strikePrice: parseInt(item.strike.replace(/[^0-9]/g, '')) || 0,
        entryPrice: typeof item.ltp === 'number' ? item.ltp : 0,
        entryRange: item.entry,
        target1Price: parseFloat(String(item.target).replace(/[^0-9.]/g, '')) || (item.ltp * 1.3),
        target2Price: (parseFloat(String(item.target).replace(/[^0-9.]/g, '')) || (item.ltp * 1.3)) * 1.25,
        stoplossPrice: parseFloat(String(item.exitSL).replace(/[^0-9.]/g, '')) || (item.ltp * 0.8),
        riskReward: item.riskReward,
        confluenceScore: item.score,
        currentLtp: item.ltp,
        status: isSl ? 'SL_HIT' : 'ACTIVE',
        givenTimeFormatted: item.time,
        title: item.strike,
        subtitle: `${item.action} • ${item.faydaStrategyMatch || 'Momentum Breakout'}`
      });
    };

    return (
      <div 
        key={`${uniquePrefix}-${item.symbol}`} 
        onClick={handleOpenModal}
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all select-none shadow-sm shrink-0 cursor-pointer ${
          isSl 
            ? 'bg-bear/10 border-bear/40 hover:bg-bear/20 hover:border-bear' 
            : isBull
              ? 'bg-bull/10 border-bull/30 hover:bg-bull/20 hover:border-bull'
              : 'bg-bear/10 border-bear/30 hover:bg-bear/20 hover:border-bear'
        }`}
        title={`Click to view trade tip setup details for ${item.strike}`}
      >
        {/* Symbol & Strike */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="font-mono font-bold text-xs text-terminal-text">{item.symbol}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
            isBull ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
          }`}>
            {item.strike}
          </span>
        </div>

        {/* Live LTP */}
        <div className="flex items-center space-x-1 font-mono text-xs font-bold text-terminal-text shrink-0">
          <span className="text-[10px] text-terminal-muted">LTP:</span>
          <span>₹{(item.ltp || 0).toFixed(2)}</span>
        </div>

        {/* Timing Tag */}
        <div className="hidden md:flex items-center space-x-1 text-[10px] font-mono text-terminal-muted shrink-0">
          <Clock className="w-2.5 h-2.5 text-accent-cyan" />
          <span>{timing.givenTimeShort}</span>
        </div>

        {/* Actionability Badge */}
        <div className="flex items-center shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${advice.badgeClass}`}>
            {advice.badgeLabel}
          </span>
        </div>

        {/* Entry / Square Off Zone */}
        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[10px] sm:text-[11px] shrink-0 font-mono ${
          isSl ? 'bg-bear/25 border-bear text-white' : 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
        }`}>
          <span className="font-bold">{isSl ? 'EXIT:' : 'ENTRY:'}</span>
          <span className="font-bold whitespace-nowrap">{isSl ? `₹${(item.ltp || 0).toFixed(2)}` : item.entry}</span>
        </div>
      </div>
    );
  };

  if (activeSetups.length === 0) return null;

  const istTimeString = formatISTTime(currentTime, { showSeconds: true, includeSuffix: true });

  return (
    <div 
      className="w-full bg-terminal-panel/95 border-b border-terminal-border backdrop-blur-md overflow-hidden select-none relative group z-20 shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      onTouchCancel={() => setIsHovered(false)}
    >
      {/* ========================================================================= */}
      {/* MOBILE LAYOUT: LINE 1 = FAYDA RADAR + SYSTEM TIME | LINE 2 = FAST TICKER  */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:hidden py-1 px-2.5 space-y-1">
        {/* LINE 1: FAYDA RADAR BRAND (LEFT) + SYSTEM TIME & CONTROLS (RIGHT) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center space-x-1.5">
            <div className="p-1 rounded-md bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-terminal-text">
              {isBeginner ? '🧭 MARKET COMPASS' : isExpert ? '🔬 QUANT RADAR' : '🧭 FAYDA RADAR'}
            </span>
            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
              isLiveNseMarket 
                ? 'bg-bull/20 text-bull border border-bull/40' 
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {isLiveNseMarket ? 'LIVE NSE' : 'MCX LIVE'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* System Time in IST */}
            <div className="flex items-center space-x-1 font-mono text-[10px] text-accent-cyan bg-terminal-card px-2 py-0.5 rounded-lg border border-terminal-border shadow-sm">
              <Clock className="w-3 h-3 text-accent-cyan shrink-0" />
              <span className="font-bold">{istTimeString}</span>
            </div>

            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 rounded-lg bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
              title={isPaused ? "Resume ticker" : "Pause ticker"}
            >
              {isPaused ? <Play className="w-3 h-3 text-bull" /> : <Pause className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* LINE 2: CONTINUOUS SCROLLING TICKER (FREEZES ON MOUSEOVER / TOUCH) */}
        <div 
          className="overflow-hidden whitespace-nowrap w-full relative flex items-center py-0.5 border-t border-terminal-border/50 active:cursor-grabbing"
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
          onTouchCancel={() => setIsHovered(false)}
        >
          <div 
            className="flex items-center whitespace-nowrap will-change-transform py-0.5"
            style={{
              animationName: 'marqueeTicker',
              animationDuration: `${speedSeconds}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: isAnimationPaused ? 'paused' : 'running',
              width: 'max-content'
            }}
          >
            <div className="flex items-center space-x-2.5 shrink-0 pr-2.5">
              {activeSetups.map((item, idx) => renderSetupItem(item, `mob-orig-${idx}`))}
            </div>
            <div className="flex items-center space-x-2.5 shrink-0 pr-2.5" aria-hidden="true">
              {activeSetups.map((item, idx) => renderSetupItem(item, `mob-dup-${idx}`))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (>= sm): INLINE SINGLE ROW WITH FAST SCROLLING TICKER      */}
      {/* ========================================================================= */}
      <div className="hidden sm:flex items-center py-2 px-3 relative min-h-[48px]">
        {/* Left Sticky Label */}
        <div className="flex items-center space-x-1.5 pr-3 mr-2 border-r border-terminal-border/80 shrink-0 z-10 bg-terminal-card py-1 px-2.5 rounded-lg shadow-sm border border-terminal-border/60">
          <Zap className={`w-3.5 h-3.5 ${isLiveNseMarket ? 'text-accent-cyan' : 'text-amber-400'} animate-pulse`} />
          <span className="text-xs font-black tracking-wider uppercase text-terminal-text">
            {isBeginner ? '🧭 MARKET COMPASS' : isIntermediate ? '🧭 FAYDA RADAR' : '🔬 QUANT COMPASS'}
          </span>
          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
            isLiveNseMarket 
              ? 'bg-bull/20 text-bull border border-bull/40' 
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}>
            {isLiveNseMarket ? 'LIVE NSE' : 'MCX COMMODITIES LIVE'}
          </span>
        </div>

        {/* Continuous Marquee Container */}
        <div className="overflow-hidden whitespace-nowrap flex-1 min-w-0 max-w-full relative flex items-center py-1">
          <div 
            className="flex items-center whitespace-nowrap will-change-transform py-0.5"
            style={{
              animationName: 'marqueeTicker',
              animationDuration: `${speedSeconds}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: isAnimationPaused ? 'paused' : 'running',
              width: 'max-content'
            }}
          >
            <div className="flex items-center space-x-3 shrink-0 pr-3">
              {activeSetups.map((item, idx) => renderSetupItem(item, `orig-${idx}`))}
            </div>
            <div className="flex items-center space-x-3 shrink-0 pr-3" aria-hidden="true">
              {activeSetups.map((item, idx) => renderSetupItem(item, `dup-${idx}`))}
            </div>
          </div>
        </div>

        {/* Right System Time & Play/Pause Controls */}
        <div className="flex items-center space-x-2 pl-2 ml-2 border-l border-terminal-border/80 shrink-0 z-10 bg-terminal-card py-1 px-2.5 rounded-lg border border-terminal-border/60 shadow-sm">
          <div className="flex items-center space-x-1 font-mono text-xs text-accent-cyan font-bold">
            <Clock className="w-3.5 h-3.5 text-accent-cyan" />
            <span>{istTimeString}</span>
          </div>

          <div className="h-3 w-[1px] bg-terminal-border mx-0.5" />

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 rounded text-terminal-muted hover:text-terminal-text transition cursor-pointer"
            title={isPaused ? "Resume ticker" : "Pause ticker"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-bull" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
