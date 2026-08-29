import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { calculateTargetHorizon, calculateDynamicTarget } from '../utils/tradeHorizon';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Target, 
  ShieldAlert, 
  Clock, 
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import type { SurgeEvent } from '../types';
import { ALL_SYMBOLS_CONFIG } from '../types';

export const TradeGuidanceCard: React.FC = () => {
  const { currentIndexState, selectedIndex } = useMarket();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!currentIndexState) return null;

  const { recommendedTrades, spotPrice, atmStrike, pcr, daysToExpiry, resistanceLevels, supportLevels, strikes, masterConfluence } = currentIndexState;
  const { bullishPick, bearishPick } = recommendedTrades;
  const mc = masterConfluence;

  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
  const isIndex = cfg ? cfg.isIndex : true;

  const r1 = resistanceLevels.find(r => Math.abs(r.strikePrice - atmStrike) <= 400);
  const s1 = supportLevels.find(s => Math.abs(s.strikePrice - atmStrike) <= 400);

  // Helper to generate reference levels for EOD / Key Walls within ±400 pts
  const getEODReferenceSetup = (type: 'BULLISH' | 'BEARISH') => {
    const isBull = type === 'BULLISH';
    const targetStrikePrice = isBull 
      ? (r1 ? r1.strikePrice : Math.min(atmStrike + 400, atmStrike + (selectedIndex === 'BANKNIFTY' || selectedIndex === 'SENSEX' ? 200 : 100)))
      : (s1 ? s1.strikePrice : Math.max(atmStrike - 400, atmStrike - (selectedIndex === 'BANKNIFTY' || selectedIndex === 'SENSEX' ? 200 : 100)));
    
    const optType = isBull ? 'CE' : 'PE';
    const strikeObj = strikes.find(s => s.strikePrice === targetStrikePrice);
    const ltp = strikeObj ? (isBull ? strikeObj.callLtp : strikeObj.putLtp) : 120;
    const cleanLtp = Math.max(10, ltp);

    const dyn = calculateDynamicTarget(cleanLtp, targetStrikePrice, atmStrike);

    return {
      symbol: `${selectedIndex} ${targetStrikePrice} ${optType}`,
      strike: targetStrikePrice,
      type: optType,
      ltp: cleanLtp,
      recommendedEntry: `₹${cleanLtp.toFixed(2)} - ₹${(cleanLtp * 1.02).toFixed(2)}`,
      stoploss: `₹${dyn.slPrice.toFixed(2)} (-${dyn.slPct}%)`,
      target: `₹${dyn.targetPrice.toFixed(2)} (+${dyn.targetPct}%)`,
      riskReward: dyn.riskReward,
      iv: strikeObj ? (isBull ? strikeObj.callIv : strikeObj.putIv) : 13.5,
      actionTitle: isBull ? `🟢 CALL WALL BREAKOUT: ${targetStrikePrice} CE` : `🔴 PUT FLOOR BREAKDOWN: ${targetStrikePrice} PE`,
      actionDescription: isBull
        ? `Major resistance at ${targetStrikePrice} with ${r1 ? r1.oiFormatted : 'heavy'} Calls. Upside target on breakout above ₹${cleanLtp.toFixed(1)}.`
        : `Strong institutional support floor at ${targetStrikePrice} with ${s1 ? s1.oiFormatted : 'heavy'} Puts. Downside trigger on breakdown below ₹${cleanLtp.toFixed(1)}.`
    };
  };

  const renderTradeBox = (pick: SurgeEvent | null, type: 'BULLISH' | 'BEARISH') => {
    const isBull = type === 'BULLISH';
    const now = Date.now();
    const isPickExpired = (p: typeof bullishPick) => {
      if (!p) return true;
      const ageMin = (now - new Date(p.timestamp).getTime()) / (60 * 1000);
      const maxAge = p.validUntilMinutes || (p.surgeLevel === 'EXTREME' ? 20 : p.surgeLevel === 'STRONG' ? 45 : 60);
      return ageMin > maxAge;
    };

    const validPick = (pick && !isPickExpired(pick) && Math.abs(pick.strikePrice - atmStrike) <= 400) ? pick : null;
    const eodSetup = !validPick ? getEODReferenceSetup(type) : null;

    const contract = validPick ? validPick.suggestedContract : eodSetup!;
    const title = validPick ? validPick.actionTitle : eodSetup!.actionTitle;
    const desc = validPick ? validPick.actionDescription : eodSetup!.actionDescription;
    const score = validPick ? validPick.surgeScore : 85;
    const time = validPick ? validPick.timeFormatted : 'EOD Settle';
    const iv = validPick ? validPick.iv : eodSetup!.iv;

    const liveLtp = typeof contract.ltp === 'number' ? contract.ltp : 0;
    const slNum = parseFloat(String(contract.stoploss || '').replace(/[^0-9.]/g, '')) || 0;
    const tgtNum = parseFloat(String(contract.target || '').replace(/[^0-9.]/g, '')) || 0;

    const isTargetHit = liveLtp > 0 && tgtNum > 0 && liveLtp >= tgtNum;
    const isStoplossHit = liveLtp > 0 && slNum > 0 && liveLtp <= slNum;

    // Calculate smart market situation analysis & trade category
    const horizon = calculateTargetHorizon(
      selectedIndex,
      contract.strike,
      atmStrike,
      isBull ? 'CE' : 'PE',
      liveLtp,
      tgtNum,
      score,
      daysToExpiry ?? 2,
      pcr?.atmPlusMinus5Pcr ?? 1.0,
      isIndex
    );

    const borderColor = isStoplossHit
      ? 'border-2 border-bear shadow-[0_0_25px_rgba(255,59,105,0.4)]'
      : isTargetHit
      ? 'border-2 border-bull shadow-[0_0_25px_rgba(0,245,155,0.4)]'
      : isBull 
      ? 'border-bull/40 hover:border-bull' 
      : 'border-bear/40 hover:border-bear';

    const bgGradient = isStoplossHit
      ? 'bg-bear-subtle/30 animate-pulse'
      : isTargetHit
      ? 'bg-bull-subtle/30 animate-pulse'
      : isBull
      ? 'bg-gradient-to-b from-bull-subtle/20 to-terminal-card'
      : 'bg-gradient-to-b from-bear-subtle/20 to-terminal-card';

    return (
      <div className={`p-4 rounded-xl border ${borderColor} ${bgGradient} flex flex-col justify-between space-y-3 relative overflow-hidden transition-all duration-300 shadow-md`}>
        {/* Top Status & Trade Category Badge */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-terminal-border/60 pb-2.5">
          <div className="flex items-center space-x-2">
            <span className={`p-1.5 rounded-lg border ${
              isStoplossHit ? 'bg-bear/30 border-bear text-bear animate-pulse' :
              isTargetHit ? 'bg-bull/30 border-bull text-bull animate-pulse' :
              isBull ? 'bg-bull/20 text-bull border-bull/40' : 'bg-bear/20 text-bear border-bear/40'
            }`}>
              {isStoplossHit ? <ShieldAlert className="w-4 h-4" /> : isTargetHit ? <ShieldCheck className="w-4 h-4" /> : isBull ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </span>
            <div>
              <span className={`font-mono font-bold text-xs uppercase block ${
                isStoplossHit ? 'text-bear' : isTargetHit ? 'text-bull' : isBull ? 'text-bull' : 'text-bear'
              }`}>
                {isStoplossHit ? '🛑 STOPLOSS HIT (CUT POSITION)' : isTargetHit ? '🎯 TARGET HIT (PROFIT SECURED)' : isBull ? 'BULLISH SETUP' : 'BEARISH SETUP'}
              </span>
              <span className="text-[10px] text-terminal-muted font-mono flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-accent-cyan" />
                <span>Detected: {time}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-black uppercase tracking-wider ${
              isStoplossHit ? 'bg-bear/30 text-bear border-bear animate-pulse' : horizon.categoryTagColor
            }`}>
              {isStoplossHit ? '🛑 SQUARE OFF' : horizon.categoryBadge}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-terminal-bg border border-terminal-border text-terminal-text font-bold">
              Score: {score}
            </span>
          </div>
        </div>

        {/* Contract Title & Rationale */}
        <div>
          <h3 className="font-mono font-black text-sm text-terminal-text tracking-wide">
            {title}
          </h3>
          <p className="text-[11px] text-terminal-muted font-mono mt-1 leading-relaxed">
            {desc}
          </p>
        </div>

        {/* Trade Execution Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] bg-terminal-bg/70 p-2.5 rounded-xl border border-terminal-border">
          <div className="bg-terminal-panel p-2 rounded-lg border border-terminal-border/60">
            <span className="text-terminal-muted block text-[9px] font-bold uppercase">ENTRY ZONE</span>
            <span className="font-bold text-terminal-text block truncate">{contract.recommendedEntry}</span>
          </div>

          <div className="bg-terminal-panel p-2 rounded-lg border border-terminal-border/60">
            <span className="text-terminal-muted block text-[9px] font-bold uppercase">CURRENT LTP</span>
            <span className={`font-black block ${liveLtp >= slNum ? 'text-terminal-text' : 'text-bear'}`}>
              ₹{liveLtp.toFixed(2)}
            </span>
          </div>

          <div className="bg-terminal-panel p-2 rounded-lg border border-terminal-border/60">
            <span className="text-terminal-muted block text-[9px] font-bold uppercase">TARGET (T1)</span>
            <span className="font-bold text-bull block truncate">{contract.target}</span>
          </div>

          <div className="bg-terminal-panel p-2 rounded-lg border border-terminal-border/60">
            <span className="text-terminal-muted block text-[9px] font-bold uppercase">STOPLOSS (SL)</span>
            <span className="font-bold text-bear block truncate">{contract.stoploss}</span>
          </div>
        </div>

        {/* Strategy Context & Safety Indicators */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-terminal-muted pt-1 border-t border-terminal-border/40">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3 text-accent-cyan" />
            <span>R:R Ratio: <strong className="text-terminal-text font-bold">{contract.riskReward || '1:2.0'}</strong></span>
          </span>
          <span>•</span>
          <span className="px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan font-bold border border-accent-cyan/30">
            {horizon.velocityBadge}
          </span>
          <span>•</span>
          <span>IV: <strong className={iv > 18 ? 'text-bear font-bold' : 'text-bull font-bold'}>{iv.toFixed(1)}%</strong> ({iv > 18 ? 'High IV' : 'Safe IV'})</span>
          <span>•</span>
          <span className="text-accent-cyan font-bold">{horizon.timeHorizonLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl flex flex-col overflow-hidden shadow-xl transition-all duration-300">
      {/* Header Bar & Accordion Trigger */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-3.5 bg-terminal-panel/60 cursor-pointer select-none group/hdr transition-all ${isExpanded ? 'border-b border-terminal-border' : ''}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-6 rounded-full bg-accent-cyan shadow-[0_0_10px_#00E5FF] shrink-0" />
            <div className="p-2 rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_12px_rgba(0,229,255,0.25)] group-hover/hdr:scale-105 transition-transform shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(0,229,255,0.3)] group-hover/hdr:text-accent-cyan transition-colors">
                  AI TRADE GUIDANCE & MULTI-STRATEGY CONFLUENCE PICKS
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan font-black border border-accent-cyan/40 shadow-sm">
                  {selectedIndex}
                </span>
                {mc && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black border shadow-sm ${
                    mc.overallSignal.includes('CALL')
                      ? 'bg-bull/20 text-bull border-bull/40 shadow-[0_0_10px_rgba(0,245,155,0.25)]'
                      : mc.overallSignal.includes('PUT')
                      ? 'bg-bear/20 text-bear border-bear/40 shadow-[0_0_10px_rgba(255,59,105,0.25)]'
                      : 'bg-amber/20 text-amber border-amber/40'
                  }`}>
                    {mc.overallScore}% CONFLUENCE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-terminal-muted mt-0.5 font-mono flex flex-wrap items-center gap-2">
                <span>Spot: <strong className="text-terminal-text font-bold">{spotPrice.toFixed(2)}</strong> | ATM: <strong className="text-amber font-bold">{atmStrike}</strong></span>
                <span>•</span>
                <span>Fused across OI Delta, Price Action Breakouts, Order Flow & 0DTE Gamma</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-end space-x-2 font-mono text-xs w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`px-3 py-1.5 rounded-xl border-2 font-mono font-black text-[11px] sm:text-xs transition-all hover:scale-105 flex items-center justify-center gap-2 shrink-0 shadow-sm ${
                isExpanded
                  ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'bg-terminal-card border-accent-cyan/70 text-terminal-text hover:border-accent-cyan hover:text-accent-cyan'
              }`}
              title={isExpanded ? "Click to Collapse Trade Guidance" : "Click to Expand Trade Guidance"}
            >
              <span className="tracking-wider uppercase">
                {isExpanded ? 'COLLAPSE' : 'VIEW GUIDANCE'}
              </span>
              <div className={`p-0.5 rounded bg-accent-cyan/15 text-accent-cyan transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-accent-cyan/30' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Trade Setups Body */}
      {isExpanded && (
        <div className="p-3.5 space-y-3.5 animate-in fade-in duration-200">
          {/* 1. MASTER 7-STRATEGY CONFLUENCE OVERVIEW */}
          {mc && (
            <div className="bg-terminal-panel/60 p-3.5 rounded-xl border border-terminal-border space-y-3 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-terminal-border/60">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg border ${
                    mc.overallSignal.includes('CALL') ? 'bg-bull/20 text-bull border-bull/40' : mc.overallSignal.includes('PUT') ? 'bg-bear/20 text-bear border-bear/40' : 'bg-amber/20 text-amber border-amber/40'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-terminal-muted block font-bold uppercase">MASTER CONFLUENCE PREDICTION</span>
                    <h3 className="font-black text-sm sm:text-base text-terminal-text">
                      {mc.signalTitle}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[9px] text-terminal-muted block uppercase font-bold">RECOMMENDED STRIKE</span>
                    <span className="font-black text-xs sm:text-sm text-accent-cyan">{mc.recommendedStrike}</span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-xl border text-center ${
                    mc.convictionLevel === 'EXTREME' ? 'bg-bull text-terminal-bg font-black' : 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40 font-bold'
                  }`}>
                    <span className="text-[9px] block uppercase leading-none">SCORE</span>
                    <span className="text-sm font-black">{mc.overallScore}%</span>
                  </div>
                </div>
              </div>

              {/* 7 Core Strategies Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {mc.strategies.map((strat, idx) => (
                  <div key={idx} className="bg-terminal-bg p-2 rounded-lg border border-terminal-border/70 flex flex-col justify-between space-y-1 text-center">
                    <span className="text-[8px] text-terminal-muted block font-bold uppercase truncate" title={strat.strategyName}>
                      {strat.strategyName.split(' ')[0]} {strat.strategyName.split(' ')[1] || ''}
                    </span>
                    <span className={`text-[10px] font-black block truncate ${
                      strat.signal === 'BULLISH' ? 'text-bull' : strat.signal === 'BEARISH' ? 'text-bear' : 'text-amber'
                    }`}>
                      {strat.statusBadge}
                    </span>
                    <div className="w-full h-1 bg-terminal-panel rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full ${strat.signal === 'BULLISH' ? 'bg-bull' : strat.signal === 'BEARISH' ? 'bg-bear' : 'bg-amber'}`}
                        style={{ width: `${strat.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. DUAL HIGH-CONVICTION CALL & PUT STRIKE PICKS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {renderTradeBox(bullishPick, 'BULLISH')}
            {renderTradeBox(bearishPick, 'BEARISH')}
          </div>
        </div>
      )}
    </div>
  );
};
