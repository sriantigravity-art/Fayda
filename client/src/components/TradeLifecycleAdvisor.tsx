import React, { useMemo, useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Target, 
  TrendingUp, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';
import { useTerminalMode } from '../context/TerminalModeContext';
import type { SurgeEvent } from '../types';

export interface TradeLifecycleAdvisorProps {
  contractSymbol: string;
  entryPrice: number;
  currentLtp: number;
  target1Price: number;
  target1Pct: number;
  target2Price?: number;
  target2Pct?: number;
  stoplossPrice: number;
  stoplossPct: number;
  role: 'BUYER' | 'SELLER';
  executionType: 'NET_DEBIT' | 'NET_CREDIT';
  matchingSurge?: SurgeEvent;
  isExpiryDay?: boolean;
  status?: string;
  isCarriedForward?: boolean;
  lifecycleDirective?: 'BOOK_PROFIT' | 'CARRY_FORWARD_CONTINUE' | 'STOPLOSS_HIT' | 'SQUARE_OFF' | 'HOLD_OR_ACCUMULATE';
  lifecycleDirectiveText?: string;
  carryForwardSuggestion?: string;
}

export type LifecycleStage = 
  | 'ACCUMULATION' 
  | 'IN_PROFIT' 
  | 'HALF_TARGET_TRAIL' 
  | 'TARGET_1_HIT' 
  | 'TARGET_2_HIT' 
  | 'STOPLOSS_HIT'
  | 'EXPIRED';

export const TradeLifecycleAdvisor: React.FC<TradeLifecycleAdvisorProps> = ({
  contractSymbol,
  entryPrice,
  currentLtp,
  target1Price,
  target1Pct,
  target2Price,
  target2Pct = 50,
  stoplossPrice,
  stoplossPct,
  role,
  matchingSurge,
  isExpiryDay,
  status,
  isCarriedForward,
  lifecycleDirective,
  lifecycleDirectiveText,
  carryForwardSuggestion
}) => {
  const { isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const isSeller = role === 'SELLER';

  // Analysis of current price vs targets
  const analysis = useMemo(() => {
    const isSquareOff = status === 'INTRADAY_CLOSED' || status === 'SQUARE_OFF' || lifecycleDirective === 'SQUARE_OFF';
    const isExpired = status === 'EXPIRED' || (isExpiryDay && currentLtp <= 0.05);
    const pnlPoints = isExpired ? -entryPrice : +(currentLtp - entryPrice).toFixed(1);
    const pnlPct = isExpired ? -100 : +(((currentLtp - entryPrice) / entryPrice) * 100).toFixed(1);
    const targetDistanceTotal = target1Price - entryPrice;
    const targetDistanceCovered = targetDistanceTotal > 0 ? (currentLtp - entryPrice) / targetDistanceTotal : 0;

    let stage: LifecycleStage = 'ACCUMULATION';
    let badgeText = 'ENTRY ACCUMULATION ZONE';
    let badgeColor = 'bg-cyan-500/20 text-cyan-700 dark:text-accent-cyan border-cyan-500/40';
    let actionDirective = 'HOLD / ENTER DIP';
    let actionClass = 'bg-cyan-500 text-slate-950 font-bold';
    let primaryInstruction = lifecycleDirectiveText || `🎯 SYSTEM ADVISORY: In Entry Zone (LTP ₹${currentLtp.toFixed(1)}) | Action: Enter on dip | Stoploss: ₹${stoplossPrice.toFixed(1)}.`;
    let recommendedSl = stoplossPrice;

    if (isExpired) {
      stage = 'EXPIRED';
      badgeText = '🛑 CONTRACT EXPIRED (₹0.00)';
      badgeColor = 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40';
      actionDirective = 'EXPIRED (0.00) — DO NOT HOLD';
      actionClass = 'bg-rose-700 text-white font-black';
      primaryInstruction = '🛑 SYSTEM DIRECTIVE: CONTRACT EXPIRED | Settled at ₹0.00 | Action: Liquidate/archive record. Do NOT hold expired contracts.';
      recommendedSl = 0;
    } else if (isSquareOff) {
      stage = 'EXPIRED';
      badgeText = `⚠️ SQUARE OFF POSITION (${pnlPct >= 0 ? '+' : ''}${pnlPct}%)`;
      badgeColor = 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40';
      actionDirective = 'SQUARE OFF POSITION';
      actionClass = 'bg-amber-500 text-slate-950 font-black animate-pulse';
      primaryInstruction = lifecycleDirectiveText || '⚠️ SYSTEM DIRECTIVE: SQUARE OFF POSITION | Action: Close position at CMP to avoid overnight decay.';
      recommendedSl = stoplossPrice;
    } else if (currentLtp <= stoplossPrice || status === 'SL_HIT' || lifecycleDirective === 'STOPLOSS_HIT') {
      stage = 'STOPLOSS_HIT';
      badgeText = `🛑 STOP LOSS HIT (${pnlPct}%)`;
      badgeColor = 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40';
      actionDirective = 'STOPLOSS — CUT POSITION';
      actionClass = 'bg-rose-600 text-white animate-pulse font-black';
      primaryInstruction = lifecycleDirectiveText || `🛑 SYSTEM DIRECTIVE: Stoploss Breached (₹${stoplossPrice.toFixed(1)}) | Action: Exit position now to preserve capital.`;
      recommendedSl = stoplossPrice;
    } else if (target2Price && currentLtp >= target2Price) {
      stage = 'TARGET_2_HIT';
      badgeText = `🚀 RUNNER TARGET 2 HIT (+${pnlPct}%)`;
      badgeColor = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40';
      actionDirective = 'BOOK PROFIT (RUNNER)';
      actionClass = 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-500/30';
      primaryInstruction = lifecycleDirectiveText || `🚀 SYSTEM DIRECTIVE: Target 2 Achieved (₹${target2Price.toFixed(1)}) | Action: Book complete profits now or trail SL to ₹${target1Price.toFixed(1)}.`;
      recommendedSl = target1Price;
    } else if (currentLtp >= target1Price || status === 'TARGET1_HIT' || lifecycleDirective === 'BOOK_PROFIT') {
      stage = 'TARGET_1_HIT';
      badgeText = `🏆 TARGET 1 HIT (+${pnlPct}%)`;
      badgeColor = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40';
      actionDirective = 'BOOK PROFIT (50%-70%)';
      actionClass = 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30';
      primaryInstruction = lifecycleDirectiveText || `🏆 SYSTEM DIRECTIVE: Target 1 Achieved (₹${target1Price.toFixed(1)}) | Action: Book 50%–70% profit now | Rule: Trail SL to cost (₹${entryPrice.toFixed(1)}) for risk-free runner.`;
      recommendedSl = entryPrice;
    } else if (isCarriedForward || status === 'CARRIED_FORWARD' || lifecycleDirective === 'CARRY_FORWARD_CONTINUE') {
      stage = 'IN_PROFIT';
      badgeText = `🌙 BTST ACTIVE (${pnlPct >= 0 ? '+' : ''}${pnlPct}%)`;
      badgeColor = 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40';
      actionDirective = 'CARRY FORWARD CONTINUE';
      actionClass = 'bg-purple-600 text-white font-black shadow-md shadow-purple-500/30';
      primaryInstruction = lifecycleDirectiveText || carryForwardSuggestion || `🌙 SYSTEM DIRECTIVE: CARRY FORWARD CONTINUE | CMP ₹${currentLtp.toFixed(1)} (${pnlPoints >= 0 ? '+' : ''}${pnlPoints.toFixed(1)} pts) | Action: Maintain overnight position with trailing SL at cost ₹${entryPrice.toFixed(1)}.`;
      recommendedSl = Math.max(stoplossPrice, entryPrice);
    } else if (targetDistanceCovered >= 0.5) {
      stage = 'HALF_TARGET_TRAIL';
      badgeText = `⚡ 50% TARGET ADVANCE (+${pnlPct}%)`;
      badgeColor = 'bg-amber-500/20 text-amber-700 dark:text-accent-gold border-amber-500/40';
      actionDirective = 'TIGHTEN SL TO BREAKEVEN';
      actionClass = 'bg-amber-500 text-slate-950 font-bold';
      primaryInstruction = `⚡ SYSTEM DIRECTIVE: +50% Advance to Target 1 | Action: Trail SL to breakeven ₹${(entryPrice * 1.02).toFixed(1)} to eliminate capital risk.`;
      recommendedSl = +(entryPrice * 1.02).toFixed(1);
    } else if (pnlPct > 5) {
      stage = 'IN_PROFIT';
      badgeText = `🟢 RUNNING IN GAIN (+${pnlPct}%)`;
      badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      actionDirective = 'RIDE MOMENTUM';
      actionClass = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold';
      primaryInstruction = `🟢 SYSTEM ADVISORY: Trade In Profit (+${pnlPct}%) | Action: Maintain trailing SL at ₹${stoplossPrice.toFixed(1)} | Rule: Do not add size at high price.`;
      recommendedSl = stoplossPrice;
    }

    // Time-based session intelligence
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const currentMinutesOfDay = hours * 60 + minutes;

    let sessionNote = '';
    let isExpiryUrgent = false;

    if (currentMinutesOfDay >= 15 * 60 + 15) {
      sessionNote = '⏰ SYSTEM SESSION NOTICE: Intraday Auto Square-Off Window | Action: Close buyer positions before 03:25 PM to avoid zero settlement.';
      isExpiryUrgent = true;
    } else if (currentMinutesOfDay >= 14 * 60 + 45) {
      sessionNote = '⚠️ SYSTEM SESSION NOTICE: Power Hour Volatility | Action: Lock trailing profits tight; protect against late gamma swings.';
      isExpiryUrgent = true;
    } else if (currentMinutesOfDay >= 11 * 60 + 30 && currentMinutesOfDay <= 13 * 60 + 30) {
      sessionNote = '⏳ SYSTEM SESSION NOTICE: Mid-Day Theta Consolidation | Status: Rangebound decay active; avoid overtrading.';
    } else if (currentMinutesOfDay < 10 * 60) {
      sessionNote = '🌅 SYSTEM SESSION NOTICE: Morning Breakout Session | Status: High institutional opening momentum; maintain strict stoploss buffer.';
    }

    return {
      stage,
      pnlPoints,
      pnlPct,
      badgeText,
      badgeColor,
      actionDirective,
      actionClass,
      primaryInstruction,
      recommendedSl,
      sessionNote,
      isExpiryUrgent
    };
  }, [currentLtp, entryPrice, target1Price, target2Price, stoplossPrice, currentTime]);

  return (
    <div className="w-full bg-gradient-to-r from-amber-50/70 via-slate-50 to-amber-50/70 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border border-amber-300 dark:border-accent-gold/40 rounded-xl p-3 font-mono text-xs select-none shadow-xs">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER: DYNAMIC LIFECYCLE DIRECTIVE + RECOMMENDED ACTION
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shrink-0">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-accent-gold animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wide flex items-center gap-1.5">
                <span>Dynamic Trade Lifecycle Advisor</span>
                <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-800 dark:text-accent-gold border border-amber-500/30">
                  SEBI Discipline Engine
                </span>
              </span>
              <span className={`px-2 py-0.2 rounded text-[10px] font-black border ${analysis.badgeColor}`}>
                {analysis.badgeText}
              </span>
            </div>
          </div>
        </div>

        {/* Action Directive Button */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Recommended Directive:</span>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wide shadow-xs flex items-center gap-1 ${analysis.actionClass}`}>
            <Zap className="w-3 h-3" />
            <span>{analysis.actionDirective}</span>
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CORE INSTRUCTION & RECOMMENDED TRAILING STOP LOSS
         ───────────────────────────────────────────────────────────── */}
      <div className="my-2.5 grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Primary Trade Management Directive */}
        <div className="md:col-span-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-2 shadow-xs">
          <Award className="w-4 h-4 text-amber-600 dark:text-accent-gold shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
              Rule of Engagement (Standard Trading Discipline):
            </span>
            <p className="text-[11px] text-slate-800 dark:text-slate-200 font-sans mt-0.5 leading-relaxed font-medium">
              {analysis.primaryInstruction}
            </p>
          </div>
        </div>

        {/* Recommended Trailing Stop Loss Box */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
            Trailing SL Target:
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-black text-amber-600 dark:text-accent-gold">
              ₹{analysis.recommendedSl.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {analysis.recommendedSl === entryPrice ? 'Risk-Free (Cost)' : analysis.recommendedSl > entryPrice ? 'Guaranteed Profit' : 'Initial Floor'}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SESSION & SURGE TAILWIND NOTICES
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-sans">
        {/* Time of Day Context */}
        {analysis.sessionNote && (
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{analysis.sessionNote}</span>
          </div>
        )}

        {/* Live Surge Tailwind */}
        {matchingSurge && (
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-mono font-bold">
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse shrink-0" />
            <span>Institutional 1m Flow: +{matchingSurge.oiChangePct}% OI/min (Score {matchingSurge.surgeScore}/100)</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeLifecycleAdvisor;
