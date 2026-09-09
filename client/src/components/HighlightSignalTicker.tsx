import React, { useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { calculateTargetHorizon, calculateDynamicTarget } from '../utils/tradeHorizon';
import { getSignalTimingData, getUserTradeAdvice } from '../utils/signalTimeHelper';
import { Zap, Target, Clock, Pause, Play, ShieldCheck, Layers, Sparkles, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
import type { IndexSymbol, OngoingProfitBoxData, MarketMomentumRegime } from '../types';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime } from '../utils/formatTime';
import { isContractOrSignalExpired } from '../utils/expiryHelper';
import { isMarketOpenForSymbol } from '../utils/lastClosedData';

export const HighlightSignalTicker: React.FC = () => {
  const { indices, visibleIndices, setSelectedIndex, selectedIndex, openTradeTipModal } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [tickerSpeed, setTickerSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [activeTipIndex, setActiveTipIndex] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(7);

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

      // ── Off-market guard: pkg.currentSession is the only reliable stale flag ──
      // lastEvaluatedAt is always stamped to NOW on every server push — unusable.
      // tip.entryTime is a display string ("11:15 AM") — not an ISO date.
      // When OFF_MARKET: only carry-forward tips are eligible to show.
      const pkgSession = idxState?.unifiedTipsPackage?.currentSession;
      const isPkgOffMarket = pkgSession === 'OFF_MARKET';

      const isTipEligible = (tip: typeof primeCall): boolean => {
        if (!tip) return false;
        if (!isPkgOffMarket) return true; // live market — show all
        // Off-market: only explicitly carried-forward tips
        return tip.isCarriedForward === true || tip.status === 'CARRIED_FORWARD';
      };

      const primePick = (isTipEligible(primeCall) ? primeCall : null)
        || (isTipEligible(primePut) ? primePut : null);
      const fallbackTime = formatISTTime(lastUpdated || new Date());

      // 1. Absolute Priority: Mirror the Prime High-Probability Tip so there is ONE single source of truth
      if (primePick) {
        const isBull = primePick.contractSymbol.includes('CE');
        const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === sym);
        const lot = primePick.lotSize || cfg?.lot || 50;
        const entryPriceNum = typeof primePick.entryPrice === 'number' ? primePick.entryPrice : (parseFloat(String(primePick.entryPrice).replace(/[^0-9.]/g, '')) || primePick.currentLtp);
        const ltp = primePick.currentLtp || entryPriceNum;
        const pnlPoints = primePick.pnlPoints ?? +(ltp - entryPriceNum).toFixed(2);
        const pnlPct = primePick.pnlPct ?? (entryPriceNum > 0 ? +((pnlPoints / entryPriceNum) * 100).toFixed(2) : 0);
        const pnlRupees = primePick.pnlRupees ?? Math.round(pnlPoints * lot);

        const ongoingProfitBox: OngoingProfitBoxData = primePick.ongoingProfitBox || {
          pnlPoints,
          pnlPct,
          pnlRupees,
          decisionTag: pnlPct >= 25 ? 'BOOK_HALF' : pnlPct >= 15 ? 'TRAIL_SL' : pnlPct <= -8 ? 'EXIT_SL' : 'HOLD',
          decisionText: pnlPct >= 25 ? `🎯 Target Reached (+${pnlPct}%)` : `P&L: ${pnlPct >= 0 ? '+' : ''}₹${pnlRupees.toLocaleString('en-IN')}`,
          isProfit: pnlPoints >= 0
        };

        return {
          symbol: sym,
          strike: primePick.contractSymbol,
          action: isBull ? 'BUY CALL' : 'BUY PUT',
          isBull,
          isLiveSignal: true,
          ltp: primePick.currentLtp,
          entry: primePick.entryRange || `₹${primePick.entryPrice.toFixed(2)}`,
          entryPriceNum,
          exitSL: `₹${primePick.stoplossPrice.toFixed(2)}`,
          target: `₹${primePick.target1Price.toFixed(2)}`,
          target2: primePick.target2Price ? `₹${primePick.target2Price.toFixed(2)}` : undefined,
          riskReward: primePick.riskReward || '1:2.5',
          score: primePick.confluenceScore,
          rawTimestamp: primePick.entryTimeFormatted || lastUpdated || new Date().toISOString(),
          time: primePick.entryTimeFormatted || fallbackTime,
          isStoplossHit: primePick.status === 'SL_HIT',
          status: primePick.status,
          ongoingProfitBox,
          marketRegime: primePick.marketRegime,
          momentumDescription: primePick.momentumDescription,
          isExpiryDay: primePick.isExpiryDay,
          callGivenTime: primePick.callGivenTime,
          callGivenTimeFormatted: primePick.callGivenTimeFormatted || primePick.entryTimeFormatted || fallbackTime,
          entryPriceTime: primePick.entryPriceTime,
          entryPriceTimeFormatted: primePick.entryPriceTimeFormatted || primePick.entryTimeFormatted || fallbackTime,
          target1HitTime: primePick.target1HitTime,
          target1HitTimeFormatted: primePick.target1HitTimeFormatted,
          target2HitTime: primePick.target2HitTime,
          target2HitTimeFormatted: primePick.target2HitTimeFormatted,
          stoplossTime: primePick.stoplossTime,
          stoplossTimeFormatted: primePick.stoplossTimeFormatted,
          halfProfitBookTime: primePick.halfProfitBookTime,
          halfProfitBookTimeFormatted: primePick.halfProfitBookTimeFormatted,
          carryForwardAdvice: primePick.carryForwardAdvice,
          carryForwardSuggestion: primePick.carryForwardSuggestion,
          carryForwardTimeFormatted: primePick.carryForwardTimeFormatted,
          pnlPoints,
          pnlPct,
          pnlRupees,
          lotSize: lot,
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

    // Clear stopped-out positions from the live signal area to the Trade Journal
    return rawList.filter(item => item && !item.isStoplossHit);
  }, [symbolsToScan, indices, isBeginner, isIntermediate, isExpert, isLiveNseMarket, currentTime]);

  const renderSetupItem = (item: (typeof activeSetups)[0], uniquePrefix: string) => {
    const isSl = item.isStoplossHit;
    const isBull = item.isBull;
    const isMarketOpen = isMarketOpenForSymbol(item.symbol);
    const profitBox = (item as any).ongoingProfitBox as OngoingProfitBoxData | undefined;
    const isProfit = profitBox ? profitBox.isProfit : (item.ltp >= (parseFloat(String(item.entry).replace(/[^0-9.]/g, '')) || item.ltp));

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
        entryPrice: (item as any).entryPriceNum ?? (typeof item.ltp === 'number' ? item.ltp : 0),
        entryRange: item.entry,
        target1Price: parseFloat(String(item.target).replace(/[^0-9.]/g, '')) || (item.ltp * 1.3),
        target2Price: (item as any).target2 ? parseFloat(String((item as any).target2).replace(/[^0-9.]/g, '')) : (parseFloat(String(item.target).replace(/[^0-9.]/g, '')) || (item.ltp * 1.3)) * 1.25,
        stoplossPrice: parseFloat(String(item.exitSL).replace(/[^0-9.]/g, '')) || (item.ltp * 0.8),
        riskReward: item.riskReward,
        confluenceScore: item.score,
        currentLtp: item.ltp,
        status: (item as any).status || (isSl ? 'SL_HIT' : 'ACTIVE'),
        givenTimeFormatted: item.time,
        callGivenTime: (item as any).callGivenTime,
        callGivenTimeFormatted: (item as any).callGivenTimeFormatted || item.time,
        entryPriceTime: (item as any).entryPriceTime,
        entryPriceTimeFormatted: (item as any).entryPriceTimeFormatted || item.time,
        target1HitTime: (item as any).target1HitTime,
        target1HitTimeFormatted: (item as any).target1HitTimeFormatted,
        target2HitTime: (item as any).target2HitTime,
        target2HitTimeFormatted: (item as any).target2HitTimeFormatted,
        stoplossTime: (item as any).stoplossTime,
        stoplossTimeFormatted: (item as any).stoplossTimeFormatted,
        halfProfitBookTime: (item as any).halfProfitBookTime,
        halfProfitBookTimeFormatted: (item as any).halfProfitBookTimeFormatted,
        carryForwardAdvice: (item as any).carryForwardAdvice,
        carryForwardSuggestion: (item as any).carryForwardSuggestion,
        carryForwardTimeFormatted: (item as any).carryForwardTimeFormatted,
        marketRegime: (item as any).marketRegime,
        momentumDescription: (item as any).momentumDescription,
        isExpiryDay: (item as any).isExpiryDay,
        ongoingProfitBox: (item as any).ongoingProfitBox,
        pnlPoints: (item as any).pnlPoints,
        pnlPct: (item as any).pnlPct,
        pnlRupees: (item as any).pnlRupees,
        lotSize: (item as any).lotSize,
        title: item.strike,
        subtitle: `${item.action} • ${item.faydaStrategyMatch || 'Momentum Breakout'}`
      });
    };

    return (
      <button 
        key={`${uniquePrefix}-${item.symbol}`} 
        type="button"
        onClick={handleOpenModal}
        className={`group inline-flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 select-none shadow-xs hover:shadow-md shrink-0 cursor-pointer text-left ${
          isSl 
            ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/40 hover:border-rose-500' 
            : isBull
              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500'
              : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 hover:border-rose-500'
        }`}
        title={`Click to view emergent trade setup details for ${item.strike}`}
      >
        {/* Option Buy / Option Sell Badge */}
        <span className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
          isSl
            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40'
            : isBull
            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
            : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/40'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isBull ? 'bg-emerald-600 dark:bg-emerald-400 animate-pulse' : 'bg-rose-600 dark:bg-rose-400 animate-pulse'}`} />
          <span>
            {!isMarketOpen && isSl
              ? 'SL HIT (CLOSED)'
              : !isMarketOpen
              ? (isBull ? 'CALL (CLOSED)' : 'PUT (CLOSED)')
              : isSl
              ? 'SQUARE OFF'
              : isBull
              ? 'BUY CALL (CE)'
              : 'BUY PUT (PE)'}
          </span>
        </span>

        {/* Strike Price */}
        <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 group-hover:text-accent-cyan transition-colors shrink-0">
          {item.strike}
        </span>

        {/* Entry */}
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
          <span className="text-slate-500 dark:text-slate-400 text-[9px] uppercase font-bold">Entry:</span>
          <span className="font-bold text-sky-700 dark:text-sky-300">{item.entry}</span>
        </div>

        {/* Live LTP */}
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-700 dark:text-slate-200 shrink-0">
          <span className="text-slate-500 dark:text-slate-400 text-[9px] uppercase font-bold">LTP:</span>
          <span className="font-black text-amber-800 dark:text-amber-300">₹{(item.ltp || 0).toFixed(1)}</span>
        </div>

        {/* Target */}
        <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-800 dark:text-emerald-300 shrink-0">
          <span className="text-emerald-700 dark:text-emerald-400 text-[9px] uppercase font-bold">Target:</span>
          <span className="font-bold">{item.target}</span>
        </div>

        {/* ONGOING LIVE PROFIT BOX */}
        {profitBox && (
          <div className={`px-2 py-0.5 rounded-lg border font-mono flex items-center gap-1.5 shrink-0 transition-all ${
            isProfit
              ? 'bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
              : 'bg-rose-500/20 text-rose-950 dark:text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
          }`} title={profitBox.decisionText}>
            <span className="text-[10px] font-black">{isProfit ? '🟢' : '🔴'}</span>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[8px] uppercase font-black text-slate-700 dark:text-slate-300">
                {profitBox.decisionTag === 'BOOK_HALF' ? 'BOOK 50%' : profitBox.decisionTag === 'TRAIL_SL' ? 'TRAIL SL' : profitBox.decisionTag === 'ENTER' ? 'ENTRY' : 'P&L'}
              </span>
              <span className="font-black text-[10.5px]">
                {isProfit ? '+' : ''}₹{Math.abs(profitBox.pnlRupees).toLocaleString('en-IN')}
                <span className="text-[9px] font-semibold ml-1 opacity-90">({isProfit ? '+' : ''}{profitBox.pnlPct}%)</span>
              </span>
            </div>
          </div>
        )}

        {/* Timing */}
        <div className="hidden lg:flex items-center gap-1 text-[9px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
          <Clock className="w-2.5 h-2.5 text-accent-cyan" />
          <span>{timing.givenTimeShort}</span>
        </div>

        {/* Cue */}
        <span className="text-[9px] font-mono font-bold text-amber-800 dark:text-accent-gold group-hover:translate-x-0.5 transition-transform flex items-center shrink-0">
          Details ↗
        </span>
      </button>
    );
  };

  // 7-second automatic sequential rotation timer
  useEffect(() => {
    if (isPaused || isHovered || activeSetups.length <= 1) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setActiveTipIndex((curr) => (curr + 1) % activeSetups.length);
          return 7;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isHovered, activeSetups.length]);

  const handlePrevTip = () => {
    setActiveTipIndex((curr) => (curr - 1 + activeSetups.length) % activeSetups.length);
    setSecondsLeft(7);
  };

  const handleNextTip = () => {
    setActiveTipIndex((curr) => (curr + 1) % activeSetups.length);
    setSecondsLeft(7);
  };

  if (activeSetups.length === 0) return null;

  const istTimeString = formatISTTime(currentTime, { showSeconds: true, includeSuffix: true });
  const safeIndex = activeTipIndex % (activeSetups.length || 1);
  const currentSetup = activeSetups[safeIndex];

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
      {/* MOBILE LAYOUT: LINE 1 = RADAR + TIME + CONTROLS | LINE 2 = 7s FLASH TIP   */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:hidden py-1 px-2.5 space-y-1">
        {/* LINE 1: FAYDA RADAR BRAND (LEFT) + SYSTEM TIME & CONTROLS (RIGHT) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="p-1 rounded-md bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan shrink-0">
              <Zap className="w-3 h-3 animate-pulse" />
            </div>
            <span className="text-[10px] font-bold tracking-tight uppercase text-terminal-text truncate">
              {isBeginner ? '🧭 MARKET COMPASS' : isExpert ? '🔬 QUANT RADAR' : '🧭 FAYDA RADAR'}
            </span>
            <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
              isLiveNseMarket 
                ? 'bg-bull/20 text-bull border border-bull/40' 
                : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
            }`}>
              {isLiveNseMarket ? 'LIVE NSE' : 'MCX LIVE'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {/* Quick 7s Navigation */}
            <button
              type="button"
              onClick={handlePrevTip}
              className="p-1 rounded bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
              title="Previous trade tip"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 rounded bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
              title={isPaused ? "Resume 7s rotation" : "Pause 7s rotation"}
            >
              {isPaused ? <Play className="w-3 h-3 text-bull" /> : <Pause className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={handleNextTip}
              className="p-1 rounded bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
              title="Next trade tip"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            {/* System Time in IST */}
            <div className="flex items-center space-x-1 font-mono text-[9px] text-accent-cyan bg-terminal-card px-1.5 py-0.5 rounded border border-terminal-border">
              <Clock className="w-2.5 h-2.5 text-accent-cyan shrink-0" />
              <span className="font-bold">{istTimeString}</span>
            </div>
          </div>
        </div>

        {/* LINE 2: SINGLE FLASHING TRADE TIP (7 SECONDS PER TIP, ONE AFTER ONE) */}
        <div className="w-full flex items-center justify-between gap-1.5 py-0.5 border-t border-terminal-border/50">
          <div className="flex items-center gap-1 shrink-0">
            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span>7s FLASH</span>
            </span>
            <span className="text-[8.5px] font-mono text-slate-600 dark:text-slate-400 font-bold">
              {safeIndex + 1}/{activeSetups.length}
            </span>
            <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30">
              {secondsLeft}s
            </span>
          </div>

          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-center">
            {currentSetup && renderSetupItem(currentSetup, `mob-single-${safeIndex}`)}
          </div>
        </div>

        {/* Mobile 7-Second Countdown Draining Progress Bar */}
        <div className="w-full h-0.5 bg-terminal-border/40 overflow-hidden rounded-full">
          <div 
            className="h-full bg-gradient-to-r from-accent-cyan via-amber-400 to-emerald-400 transition-all duration-1000 ease-linear"
            style={{ width: `${(secondsLeft / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (>= sm): INLINE SINGLE 7-SECOND FLASHING TRADE TIP         */}
      {/* ========================================================================= */}
      <div className="hidden sm:flex items-center py-2 px-3 relative min-h-[48px] justify-between">
        {/* Left Sticky Label */}
        <div className="flex items-center space-x-1.5 pr-3 mr-2 border-r border-terminal-border/80 shrink-0 z-10 bg-terminal-card py-1 px-2.5 rounded-lg shadow-sm border border-terminal-border/60">
          <Zap className={`w-3.5 h-3.5 ${isLiveNseMarket ? 'text-accent-cyan' : 'text-amber-600 dark:text-amber-400'} animate-pulse`} />
          <span className="text-xs font-black tracking-wider uppercase text-terminal-text">
            {isBeginner ? '🧭 MARKET COMPASS' : isIntermediate ? '🧭 FAYDA RADAR' : '🔬 QUANT COMPASS'}
          </span>
          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
            isLiveNseMarket 
              ? 'bg-bull/20 text-bull border border-bull/40' 
              : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
          }`}>
            {isLiveNseMarket ? 'LIVE NSE' : 'MCX COMMODITIES LIVE'}
          </span>
        </div>

        {/* Center: EXACTLY ONE TRADE TIP SHOWN AT A TIME FOR 7 SECONDS */}
        <div className="flex-1 flex items-center justify-center space-x-3 px-2 min-w-0">
          {/* Flash Indicator Pill */}
          <div className="flex items-center space-x-1.5 bg-amber-500/15 border border-amber-500/35 px-2.5 py-1 rounded-lg shrink-0">
            <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="text-[10px] font-mono font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider">
              7s Flash Tip
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-900/60 px-1.5 py-0.2 rounded border border-slate-300 dark:border-slate-700">
              {safeIndex + 1} of {activeSetups.length}
            </span>
          </div>

          {/* Active Momentum Regime Pill */}
          {(currentSetup as any)?.marketRegime && (
            <div className={`hidden md:flex items-center space-x-1 px-2 py-1 rounded-lg border font-mono text-[9.5px] font-black uppercase tracking-wider shrink-0 ${
              (currentSetup as any).isExpiryDay 
                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : (currentSetup as any).marketRegime === 'SIDEWAYS_CHOP'
                ? 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/40'
                : 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/40'
            }`}>
              <span>{(currentSetup as any).isExpiryDay ? '⚡ 0DTE EXPIRY' : (currentSetup as any).marketRegime === 'SIDEWAYS_CHOP' ? '🐢 SIDEWAYS SCALP' : '⚡ FAST MOMENTUM'}</span>
            </div>
          )}

          {/* Quick Prev Tip Button */}
          <button
            type="button"
            onClick={handlePrevTip}
            className="p-1 rounded-lg bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text hover:border-terminal-muted transition cursor-pointer shrink-0"
            title="Show previous trade tip"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* The Single Active Trade Tip Card */}
          <div className="transition-all duration-300 ease-in-out shrink-0">
            {currentSetup && renderSetupItem(currentSetup, `desktop-single-${safeIndex}`)}
          </div>

          {/* Quick Next Tip Button */}
          <button
            type="button"
            onClick={handleNextTip}
            className="p-1 rounded-lg bg-terminal-card border border-terminal-border text-terminal-muted hover:text-terminal-text hover:border-terminal-muted transition cursor-pointer shrink-0"
            title="Show next trade tip"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* 7-Second Countdown Timer Badge */}
          <div className="flex items-center space-x-1 font-mono text-[10px] text-sky-700 dark:text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-md shrink-0" title="Auto-advancing to next tip in 7 seconds">
            <Timer className="w-3 h-3 text-sky-600 dark:text-sky-400 animate-pulse" />
            <span>Next in {secondsLeft}s</span>
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
            className="p-1 rounded text-terminal-muted hover:text-terminal-text transition cursor-pointer flex items-center gap-1 text-[11px] font-mono"
            title={isPaused ? "Resume 7-second auto flash" : "Pause on this trade tip"}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-bull" />
                <span className="text-bull text-[10px] font-bold">PAUSED</span>
              </>
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Full-width 7-Second Draining Progress Bar along Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-terminal-border/30 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-accent-cyan via-amber-400 to-emerald-400 transition-all duration-1000 ease-linear"
            style={{ width: `${(secondsLeft / 7) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
