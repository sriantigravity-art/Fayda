import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { calculateTargetHorizon, calculateDynamicTarget } from '../utils/tradeHorizon';
import { Zap, Target, Clock, Pause, Play } from 'lucide-react';
import type { IndexSymbol } from '../types';
import { ALL_SYMBOLS_CONFIG } from '../types';

export const HighlightSignalTicker: React.FC = () => {
  const { indices, visibleIndices, setSelectedIndex, selectedIndex } = useMarket();
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [tickerSpeed, setTickerSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST'>('SLOW');

  const speedSeconds = tickerSpeed === 'SLOW' ? 75 : tickerSpeed === 'NORMAL' ? 48 : 28;
  const isAnimationPaused = isPaused || isHovered;

  // Check Official Market Hours: 09:15 to 15:40 IST (Mon-Fri)
  const isMarketHours = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;

    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    return currentMin >= (9 * 60 + 15) && currentMin < (15 * 60 + 40);
  };

  const isLiveMarket = isMarketHours();

  // Build list of active setups across all visible indices (always populated in both live & offline)
  const activeSetups = visibleIndices.map((sym: IndexSymbol) => {
    const state = indices[sym];
    if (!state) return null;

    const { recommendedTrades, atmStrike, resistanceLevels, strikes, lastUpdated, daysToExpiry, pcr } = state;
    const { bullishPick, bearishPick } = recommendedTrades;
    const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === sym);
    const isIndex = cfg ? cfg.isIndex : true;

    const fallbackTime = lastUpdated 
      ? new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : 'EOD Settle';

    // Check if signal has expired past its validity window
    const now = Date.now();
    const isPickExpired = (p: typeof bullishPick) => {
      if (!p) return true;
      const ageMin = (now - new Date(p.timestamp).getTime()) / (60 * 1000);
      const maxAge = p.validUntilMinutes || (p.surgeLevel === 'EXTREME' ? 20 : p.surgeLevel === 'STRONG' ? 45 : 60);
      return ageMin > maxAge;
    };

    // 1. First priority: Genuine live unexpired surge pick
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
        time: pick.timeFormatted || fallbackTime,
        isStoplossHit: isSlHit,
        horizon
      };
    }

    // 3. If offline or no live surge pick: Generate authentic exchange reference wall setup
    const isBull = true;
    const r1 = resistanceLevels?.[0];
    const targetStrike = r1 ? r1.strikePrice : Math.min(atmStrike + 400, atmStrike + (sym === 'BANKNIFTY' || sym === 'SENSEX' ? 200 : 100));
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

    return {
      symbol: sym,
      strike: `${sym} ${targetStrike} ${optType}`,
      action: isBull ? 'BUY CALL' : 'BUY PUT',
      isBull,
      isLiveSignal: false,
      ltp: cleanLtp,
      entry: `₹${cleanLtp.toFixed(1)} - ₹${(cleanLtp * 1.02).toFixed(1)}`,
      exitSL: `₹${dyn.slPrice.toFixed(1)} (-${dyn.slPct}%)`,
      target: `₹${dyn.targetPrice.toFixed(1)} (+${dyn.targetPct}%)`,
      riskReward: dyn.riskReward,
      score: 88,
      time: isLiveMarket ? '1-Min Ref' : 'EOD Settle',
      isStoplossHit: isSlHit,
      horizon
    };
  }).filter(Boolean);

  const renderSetupItem = (item: any, keySuffix: string) => {
    const isSelected = selectedIndex === item.symbol;
    const isSl = item.isStoplossHit;
    const hz = item.horizon;

    return (
      <div
        key={`${item.symbol}-${keySuffix}`}
        onClick={() => setSelectedIndex(item.symbol)}
        className={`flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl border transition cursor-pointer shrink-0 ${
          isSl
            ? 'bg-bear/20 border-bear shadow-[0_0_15px_rgba(255,59,105,0.4)] animate-pulse'
            : isSelected
            ? 'bg-terminal-card border-accent-cyan shadow-[0_0_18px_rgba(0,229,255,0.35)] ring-1 ring-accent-cyan/60'
            : 'bg-terminal-panel/90 border-terminal-border hover:border-accent-cyan/50 hover:bg-terminal-card'
        }`}
        title={`${hz.categoryBadge} | ${hz.marketSituation} | ${hz.suitability}`}
      >
        {/* EXPLICIT TRADE STATUS / CATEGORY BADGE */}
        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0 ${
          isSl 
            ? 'bg-bear/30 text-bear border-bear animate-pulse' 
            : item.isLiveSignal
            ? 'bg-bull/25 text-bull border-bull shadow-[0_0_10px_rgba(0,245,155,0.35)] animate-pulse'
            : hz.categoryTagColor
        }`}>
          <span>{isSl ? '🛑 STOPLOSS HIT' : item.isLiveSignal ? '⚡ LIVE SIGNAL' : hz.categoryBadge}</span>
        </div>

        {/* Index & Strike Badge */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className={`font-black text-xs sm:text-sm tracking-wide ${isSl ? 'text-bear' : item.isBull ? 'text-bull' : 'text-bear'}`}>
            {isSl ? '🛑' : item.isBull ? '▲' : '▼'} {item.strike}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
            isSl ? 'bg-bear text-white font-black' : item.isBull ? 'bg-bull/20 text-bull border border-bull/40' : 'bg-bear/20 text-bear border border-bear/40'
          }`}>
            {isSl ? 'SQUARE OFF' : item.action}
          </span>
        </div>

        {/* Time Horizon & Holding Badge */}
        <div className="flex items-center space-x-1.5 bg-terminal-bg/90 px-2 py-0.5 rounded-md border border-terminal-border text-[9px] text-terminal-muted shrink-0 font-bold">
          <div className="flex items-center space-x-1">
            <Clock className="w-2.5 h-2.5 text-accent-cyan" />
            <span>{item.time}</span>
          </div>
          <span className="px-1.5 py-0.2 rounded bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan text-[8px] font-extrabold">
            {hz.timeHorizonLabel}
          </span>
        </div>

        {/* Entry / Square Off Zone */}
        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[10px] sm:text-[11px] shrink-0 ${
          isSl ? 'bg-bear/25 border-bear text-white' : 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
        }`}>
          <span className="font-bold">{isSl ? 'EXIT AT:' : 'ENTRY:'}</span>
          <span className="font-bold whitespace-nowrap">{isSl ? `₹${item.ltp} (Cut Loss)` : item.entry}</span>
        </div>

        {/* Target & R:R Ratio */}
        <div className="flex items-center space-x-1.5 shrink-0 text-[10px] sm:text-[11px]">
          <span className="px-2 py-0.5 rounded-md bg-bull/15 border border-bull/30 text-bull font-bold flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>TGT: {item.target}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-amber/10 border border-amber/30 text-amber text-[9px] font-bold">
            R:R {item.riskReward}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="bg-terminal-card border-b border-terminal-border font-mono relative overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center max-w-[1840px] mx-auto px-2.5 sm:px-3 py-1 sm:py-1.5 gap-1 sm:gap-0">
        {/* Line 1 on Mobile / Left on Desktop: Status, Title & Mobile Controls */}
        <div className="flex items-center justify-between sm:justify-start space-x-2 shrink-0 sm:pr-3 sm:border-r border-terminal-border z-10 bg-terminal-card pb-0.5 sm:pb-0">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-3.5 sm:h-4 rounded-full bg-accent-cyan shadow-[0_0_8px_#00E5FF] shrink-0" />
            <span className="font-black text-[10px] sm:text-xs tracking-wider uppercase text-terminal-text drop-shadow-[0_0_8px_rgba(0,229,255,0.4)] flex items-center gap-1">
              <Zap className="w-3 h-3 text-accent-cyan animate-pulse" />
              <span>RADAR PICKS:</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded-full border text-[8px] sm:text-[9px] font-bold ${
              isLiveMarket
                ? 'bg-bull/15 text-bull border-bull/40'
                : 'bg-amber/15 text-amber border-amber/40'
            }`}>
              {isLiveMarket ? 'LIVE' : 'EOD'}
            </span>
          </div>

          {/* Mobile Right Controls on Line 1 */}
          <div className="flex sm:hidden items-center space-x-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`p-1 px-1.5 rounded-md border transition flex items-center gap-1 ${
                isPaused 
                  ? 'bg-amber/20 border-amber text-amber font-bold' 
                  : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
              }`}
              title={isPaused ? "Resume Ticker Scrolling" : "Pause Ticker"}
            >
              {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
              <span className="text-[8px] font-bold">{isPaused ? 'RESUME' : 'PAUSE'}</span>
            </button>
          </div>
        </div>

        {/* Line 2 on Mobile / Center on Desktop: Full-Width Scrolling Tape Container */}
        <div className="flex-1 overflow-hidden relative mx-0 sm:mx-2 w-full pt-0.5 sm:pt-0 border-t sm:border-t-0 border-terminal-border/40">
          <div
            className="flex items-center space-x-2.5 sm:space-x-3 w-max will-change-transform"
            style={{
              animation: `marquee-scroll ${speedSeconds}s linear infinite`,
              animationPlayState: isAnimationPaused ? 'paused' : 'running'
            }}
          >
            {/* Repeat list for seamless infinite loop with zero blank gaps */}
            {activeSetups.map((item, idx) => renderSetupItem(item, `orig-${idx}`))}
            {activeSetups.map((item, idx) => renderSetupItem(item, `dup1-${idx}`))}
            {activeSetups.map((item, idx) => renderSetupItem(item, `dup2-${idx}`))}
          </div>
        </div>

        {/* Desktop Controls (hidden on mobile, right-docked on desktop) */}
        <div className="hidden sm:flex items-center space-x-1.5 shrink-0 pl-3 border-l border-terminal-border z-10 bg-terminal-card text-[10px]">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1 rounded-md border transition ${
              isPaused 
                ? 'bg-amber/20 border-amber text-amber font-bold shadow-[0_0_8px_rgba(255,184,0,0.3)]' 
                : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
            }`}
            title={isPaused ? "Resume Ticker Scrolling" : "Pause Ticker"}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>

          <div className="flex items-center space-x-0.5 bg-terminal-panel p-0.5 rounded-md border border-terminal-border">
            {(['SLOW', 'NORMAL', 'FAST'] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setTickerSpeed(spd)}
                className={`px-1.5 py-0.2 rounded text-[8px] font-bold transition ${
                  tickerSpeed === spd
                    ? 'bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/40 shadow-sm'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {spd === 'SLOW' ? '1x' : spd === 'NORMAL' ? '1.5x' : '2.5x'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
