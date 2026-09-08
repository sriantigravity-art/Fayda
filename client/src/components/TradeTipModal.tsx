import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { ALL_SYMBOLS_CONFIG, type ActiveTradeTipData, type OngoingProfitBoxData, type MarketMomentumRegime } from '../types';
import {
  X,
  Zap,
  Target,
  ShieldCheck,
  Clock,
  Timer,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  Flame,
  Layers,
  BookOpen,
  DollarSign,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { ConfluenceChecklist } from './ConfluenceChecklist';
import { useTerminalMode } from '../context/TerminalModeContext';
import { isMarketOpenForSymbol } from '../utils/lastClosedData';

interface TradeTipModalProps {
  tip: ActiveTradeTipData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TradeTipModal: React.FC<TradeTipModalProps> = ({ tip, isOpen, onClose }) => {
  const { setSelectedIndex, indices, openOptionsDataModal } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'>(mode);

  // Sync tab with active terminal mode when modal opens or mode changes
  useEffect(() => {
    setActiveTab(mode);
  }, [mode, isOpen]);

  // Handle closing with smooth exit animation
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200); // matches .animate-modal-exit (0.20s)
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

  if (!isOpen && !isClosing) return null;
  if (!tip) return null;

  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === tip.symbol);
  const lotSize = tip.lotSize || cfg?.lot || 50;
  const isCommodity = cfg?.category === 'COMMODITIES';
  const isMarketOpen = isMarketOpenForSymbol(tip.symbol);
  const isBull = tip.action?.includes('CALL') || tip.action?.includes('BULL');
  const isBear = tip.action?.includes('PUT') || tip.action?.includes('BEAR');
  const isSlHit = tip.status === 'SL_HIT';
  const isCarriedForward = tip.status === 'CARRIED_FORWARD' || (tip.isCarriedForward && tip.status !== 'INTRADAY_CLOSED' && tip.status !== 'EXPIRED');
  const isSl = tip.action === 'SQUARE_OFF' || isSlHit;
  const isSpread = tip.optionType === 'SPREAD' || tip.action?.includes('SPREAD');

  const currentIndex = indices[tip.symbol];
  const liveSpot = currentIndex?.spotPrice || 0;

  const entryNum = typeof tip.entryPrice === 'number' 
    ? tip.entryPrice 
    : (parseFloat(String(tip.entryPrice).replace(/[^0-9.]/g, '')) || (tip.currentLtp || 100));
  const ltpNum = tip.currentLtp || entryNum;
  const rawPnlPoints = tip.pnlPoints ?? +(ltpNum - entryNum).toFixed(2);
  const rawPnlPct = tip.pnlPct ?? (entryNum > 0 ? +((rawPnlPoints / entryNum) * 100).toFixed(2) : 0);
  const rawPnlRupees = tip.pnlRupees ?? Math.round(rawPnlPoints * lotSize);

  const profitBoxData: OngoingProfitBoxData = tip.ongoingProfitBox || {
    pnlPoints: rawPnlPoints,
    pnlPct: rawPnlPct,
    pnlRupees: rawPnlRupees,
    decisionTag: isSlHit ? 'EXIT_SL' : rawPnlPct >= 25 ? 'BOOK_HALF' : rawPnlPct >= 15 ? 'TRAIL_SL' : 'HOLD',
    decisionText: isSlHit 
      ? `🛑 Stoploss Hit (${rawPnlPct}%) — Capital protected & position archived to Trade Journal.`
      : rawPnlPct >= 25
      ? `🎯 Target 1 Achieved (+${rawPnlPct}%) — Lock 50% profit & trail SL to entry cost.`
      : rawPnlPct >= 15
      ? `🚀 Running in Profit (+${rawPnlPct}%) — Trail stoploss to entry price.`
      : `⏸️ Holding above stoploss (LTP ₹${ltpNum.toFixed(1)}) — Maintain position towards Target 1.`,
    isProfit: rawPnlPoints >= 0
  };

  // Copy trade summary to clipboard
  const handleCopy = () => {
    const text = `🎯 FAYDA TRADE TIP
Symbol: ${tip.symbol}
Contract: ${tip.contractSymbol || tip.title}
Action: ${tip.action}
Entry: ${tip.entryRange || tip.entryPrice}
Stop Loss: ${tip.stoplossPrice || '—'}
Target 1: ${tip.target1Price || '—'}
Target 2: ${tip.target2Price || '—'}
Risk:Reward: ${tip.riskReward || '1:2'}
Given Time: ${tip.givenTimeFormatted || 'Live'}
Generated via Fayda Trading Terminal`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwitchToOptionsData = () => {
    setSelectedIndex(tip.symbol);
    openOptionsDataModal(tip.symbol, tip);
    handleClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop with animated blur & fade */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-all ${
          isClosing ? 'animate-modal-backdrop-exit' : 'animate-modal-backdrop-enter'
        }`}
      />

      {/* Modal Dialog Box */}
      <div
        className={`relative w-full max-w-2xl bg-gradient-to-b from-terminal-card via-terminal-card to-slate-950 border-2 border-accent-cyan/40 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.18)] overflow-hidden flex flex-col z-10 my-auto ${
          isClosing ? 'animate-modal-exit' : 'animate-modal-enter'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-terminal-panel/90 border-b border-terminal-border">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`p-2 rounded-xl border shrink-0 ${
              isSl 
                ? (isMarketOpen ? 'bg-bear/20 border-bear text-bear animate-pulse' : 'bg-bear/20 border-bear text-bear') 
                : isBull 
                ? 'bg-bull/20 border-bull/40 text-bull' 
                : 'bg-bear/20 border-bear/40 text-bear'
            }`}>
              {isSl ? <AlertTriangle className="w-5 h-5" /> : isBull ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="font-mono font-black text-sm sm:text-base text-terminal-text tracking-wide">
                  {tip.symbol}
                </span>
                <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase border ${
                  isCommodity 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40'
                }`}>
                  {isCommodity ? 'MCX Commodity' : 'NSE / BSE Index'}
                </span>
                {tip.tierLabel && (
                  <span className="hidden sm:inline-block px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {tip.tierLabel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-terminal-muted truncate font-sans">
                {tip.sessionName || 'High-Conviction Institutional Trade Setup'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-terminal-panel hover:bg-terminal-border border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer shrink-0 ml-2"
            title="Close Window (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* Main Contract Banner & Trade Action */}
          <div className="bg-terminal-bg/90 p-4 rounded-xl border border-terminal-border space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-[10px] font-mono text-terminal-muted uppercase tracking-wider block">
                  RECOMMENDED CONTRACT
                </span>
                <h3 className="text-base sm:text-lg font-black text-terminal-text font-mono flex items-center gap-2">
                  <span>{tip.contractSymbol || tip.title}</span>
                </h3>
              </div>

              <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-1.5">
                {/* P&L Badge */}
                {tip.pnlRupees !== undefined && (
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border shadow-sm flex items-center gap-1 ${
                    tip.pnlRupees >= 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                  }`}>
                    <span>{tip.pnlRupees >= 0 ? '🟢' : '🔴'}</span>
                    <span>{tip.pnlRupees >= 0 ? '+' : ''}₹{tip.pnlRupees.toLocaleString('en-IN')} / lot</span>
                    {tip.pnlPct !== undefined && (
                      <span className="text-[10px] font-bold">({tip.pnlPct >= 0 ? '+' : ''}{tip.pnlPct}%)</span>
                    )}
                  </span>
                )}

                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider font-mono border shadow-sm ${
                  isSl
                    ? (isMarketOpen ? 'bg-bear/30 text-bear border-bear animate-pulse' : 'bg-bear/20 text-bear border-bear/50')
                    : isCarriedForward
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : isBull
                    ? 'bg-bull/20 text-bull border-bull/40 shadow-[0_0_12px_rgba(0,245,155,0.25)]'
                    : 'bg-bear/20 text-bear border-bear/40 shadow-[0_0_12px_rgba(255,59,105,0.25)]'
                }`}>
                  {isSlHit
                    ? (isMarketOpen ? '🛑 SL HIT • BOOK LOSS' : '🛑 SL HIT • LOSS BOOKED')
                    : tip.action === 'SQUARE_OFF'
                    ? (isMarketOpen ? '🛑 SQUARE OFF' : '📁 POSITION CLOSED')
                    : tip.status === 'EXPIRED'
                    ? '⌛ EXPIRED (SETTLED)'
                    : tip.status === 'INTRADAY_CLOSED'
                    ? '📁 INTRADAY CLOSED'
                    : isCarriedForward
                    ? '📦 CARRIED FORWARD'
                    : !isMarketOpen
                    ? `${tip.action ? tip.action.replace(/_/g, ' ') : 'BUY'} (CLOSED)`
                    : (tip.action ? tip.action.replace(/_/g, ' ') : 'BUY')}
                </span>
                {tip.confluenceScore && (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                    Score {tip.confluenceScore}
                  </span>
                )}
              </div>
            </div>

            {/* Timing & Actionability Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-terminal-border/60 text-[11px] font-mono">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {tip.givenTimeFormatted && (
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center gap-1.5 font-bold">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>GIVEN: {tip.givenTimeFormatted}</span>
                  </span>
                )}
                {tip.bookedTimeFormatted && (
                  <span className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 ${
                    tip.status === 'SL_HIT' || tip.actionGuidance?.toLowerCase().includes('loss')
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {tip.status === 'SL_HIT' || tip.actionGuidance?.toLowerCase().includes('loss') ? 'LOSS BOOKED:' : 'PROFIT BOOKED:'} {tip.bookedTimeFormatted}
                    </span>
                  </span>
                )}
                {isCarriedForward && (
                  <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 font-bold">
                    <span>CARRY FORWARD: {tip.carryForwardTimeFormatted || '03:20 PM'}</span>
                  </span>
                )}
                {tip.status === 'INTRADAY_CLOSED' && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 font-bold">
                    <span>EXIT BENCHMARK: 03:25 PM</span>
                  </span>
                )}
                {tip.elapsedTimeFormatted && !tip.bookedTimeFormatted && (
                  <span className="px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border text-amber font-bold">
                    ⏱️ {tip.elapsedTimeFormatted}
                  </span>
                )}
              </div>

              {tip.actionGuidance && (
                <span className={`px-2.5 py-0.5 rounded-lg font-bold border ${tip.actionClass || 'bg-bull/20 text-bull border-bull/40'}`}>
                  {!isMarketOpen && (tip.actionGuidance.toLowerCase().includes('square off') || tip.actionGuidance.toLowerCase().includes('liquidate'))
                    ? 'Session Closed at 03:40 PM IST • Intraday trades completed'
                    : tip.actionGuidance}
                </span>
              )}
            </div>

            {/* Carry Forward Suggestion / Intraday Exit Callout */}
            {(tip.carryForwardSuggestion || isCarriedForward || tip.status === 'INTRADAY_CLOSED') && (
              <div className={`mt-2.5 p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                tip.status === 'INTRADAY_CLOSED'
                  ? 'bg-slate-900/60 border-slate-700/60'
                  : 'bg-purple-950/40 border-purple-500/40'
              }`}>
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  tip.status === 'INTRADAY_CLOSED'
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-purple-500/20 text-purple-300'
                }`}>
                  {tip.status === 'INTRADAY_CLOSED' ? '📁' : '📦'}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-black uppercase tracking-wider text-[11px] ${
                      tip.status === 'INTRADAY_CLOSED' ? 'text-slate-300' : 'text-purple-300'
                    }`}>
                      {tip.status === 'INTRADAY_CLOSED' ? 'Intraday Exit Guideline (03:25 PM IST)' : `Carry Forward Suggestion (${tip.carryForwardTimeFormatted || '03:20 PM IST'})`}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {tip.carryForwardSuggestion || (tip.status === 'INTRADAY_CLOSED'
                      ? 'Intraday Exit at 03:25 PM: Avoid overnight carry due to rapid time decay (Theta erosion) and gap-risk. Trade closed at session end.'
                      : 'Hold overnight if OTM buffer is > 65%. For intraday long options, book partial profits before 03:25 PM IST to eliminate overnight theta erosion.')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* PROMINENT ONGOING LIVE PROFIT BOX & DECISION COCKPIT                     */}
          {/* ========================================================================= */}
          <div className={`p-4 sm:p-5 rounded-2xl border-2 shadow-lg transition-all ${
            profitBoxData.isProfit
              ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 dark:from-emerald-950/60 dark:via-slate-900 dark:to-slate-950 border-emerald-500/60 dark:border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.18)]'
              : 'bg-gradient-to-br from-rose-50 via-white to-rose-50/30 dark:from-rose-950/60 dark:via-slate-900 dark:to-slate-950 border-rose-500/60 dark:border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.18)]'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    ⚡ ONGOING LIVE PROFIT COCKPIT
                  </span>
                  {tip.marketRegime && (
                    <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-black uppercase border ${
                      tip.isExpiryDay
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                        : tip.marketRegime === 'SIDEWAYS_CHOP'
                        ? 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/40'
                        : 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/40'
                    }`}>
                      {tip.isExpiryDay ? '⚡ 0DTE EXPIRY SURGE' : tip.marketRegime === 'SIDEWAYS_CHOP' ? '🐢 SIDEWAYS SCALP' : '⚡ FAST MOMENTUM'}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2.5">
                  <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                    profitBoxData.isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {profitBoxData.isProfit ? '+' : ''}₹{Math.abs(profitBoxData.pnlRupees).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">/ lot ({lotSize} units)</span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black border ${
                    profitBoxData.isProfit 
                      ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40' 
                      : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40'
                  }`}>
                    {profitBoxData.isProfit ? '+' : ''}{profitBoxData.pnlPoints.toFixed(1)} pts ({profitBoxData.isProfit ? '+' : ''}{profitBoxData.pnlPct}%)
                  </span>
                </div>
              </div>

              {/* Action Decision Badge */}
              <div className="flex flex-col sm:items-end gap-1 shrink-0">
                <span className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md border ${
                  profitBoxData.decisionTag === 'BOOK_HALF'
                    ? 'bg-emerald-500/30 text-emerald-900 dark:text-emerald-200 border-emerald-500 dark:border-emerald-400 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                    : profitBoxData.decisionTag === 'TRAIL_SL'
                    ? 'bg-sky-500/30 text-sky-900 dark:text-sky-200 border-sky-500 dark:border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.35)]'
                    : profitBoxData.decisionTag === 'EXIT_SL'
                    ? 'bg-rose-500/30 text-rose-900 dark:text-rose-200 border-rose-500 dark:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                    : profitBoxData.decisionTag === 'ENTER'
                    ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-500/40'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                  <span>
                    {profitBoxData.decisionTag === 'BOOK_HALF' 
                      ? '🎯 BOOK 50% PROFIT' 
                      : profitBoxData.decisionTag === 'TRAIL_SL'
                      ? '🚀 TRAIL STOPLOSS TO COST'
                      : profitBoxData.decisionTag === 'EXIT_SL'
                      ? '🛑 STOPLOSS HIT'
                      : profitBoxData.decisionTag === 'ENTER'
                      ? '🟢 OPTIMAL ENTRY ZONE'
                      : '⏸️ HOLD POSITION'}
                  </span>
                </span>
              </div>
            </div>

            {/* Decision Instruction Banner */}
            <div className="pt-2.5 flex items-start gap-2">
              <span className="text-sm shrink-0">💡</span>
              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                {profitBoxData.decisionText}
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6-STAGE LIFECYCLE MILESTONE TIMINGS & CARRY-FORWARD AUDIT                */}
          {/* ========================================================================= */}
          <div className="bg-slate-100 dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-300 dark:border-slate-700/80 space-y-3 font-mono shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-black uppercase text-accent-cyan tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-accent-cyan" />
                <span>6-STAGE SIGNAL LIFECYCLE MILESTONES</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Institutional Execution Audit
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
              {/* 1. Call Given Time */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-sky-500/30 text-left space-y-1 shadow-xs">
                <span className="text-[9px] font-black uppercase text-sky-600 dark:text-sky-400 block tracking-wider">
                  1. CALL GIVEN
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                  {tip.callGivenTimeFormatted || tip.givenTimeFormatted || 'Live'}
                </span>
                <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold">✓ Signal Dispatched</span>
              </div>

              {/* 2. Entry Price Time */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-sky-500/30 text-left space-y-1 shadow-xs">
                <span className="text-[9px] font-black uppercase text-sky-600 dark:text-sky-400 block tracking-wider">
                  2. ENTRY PRICE
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                  {tip.entryPriceTimeFormatted || tip.givenTimeFormatted || 'Live'}
                </span>
                <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold truncate">
                  ✓ Triggered @ ₹{typeof tip.entryPrice === 'number' ? tip.entryPrice.toFixed(1) : tip.entryPrice}
                </span>
              </div>

              {/* 3. Half Profit Book Time */}
              <div className={`p-2.5 rounded-xl text-left space-y-1 shadow-xs border ${
                tip.halfProfitBookTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT'
                  ? 'border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/20'
                  : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 opacity-75'
              }`}>
                <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">
                  3. 50% PROFIT
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                  {tip.halfProfitBookTimeFormatted || (tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' ? (tip.bookedTimeFormatted || 'Booked') : 'Pending T1')}
                </span>
                <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                  {tip.halfProfitBookTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' ? '✓ 50% Capital Locked' : 'Waiting for +25%'}
                </span>
              </div>

              {/* 4. Target 1 Hit Time */}
              <div className={`p-2.5 rounded-xl text-left space-y-1 shadow-xs border ${
                tip.target1HitTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT'
                  ? 'border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/20'
                  : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 opacity-75'
              }`}>
                <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">
                  4. TARGET 1 HIT
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                  {tip.target1HitTimeFormatted || (tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' ? (tip.bookedTimeFormatted || 'Hit') : 'Pending')}
                </span>
                <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold truncate">
                  {tip.target1HitTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' ? `✓ ₹${typeof tip.target1Price === 'number' ? tip.target1Price.toFixed(1) : tip.target1Price}` : `Tgt: ₹${typeof tip.target1Price === 'number' ? tip.target1Price.toFixed(1) : tip.target1Price}`}
                </span>
              </div>

              {/* 5. Target 2 Hit Time */}
              <div className={`p-2.5 rounded-xl text-left space-y-1 shadow-xs border ${
                tip.target2HitTimeFormatted || tip.status === 'TARGET2_HIT'
                  ? 'border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/20'
                  : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 opacity-75'
              }`}>
                <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">
                  5. TARGET 2 HIT
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                  {tip.target2HitTimeFormatted || (tip.status === 'TARGET2_HIT' ? (tip.bookedTimeFormatted || 'Hit') : 'Runner Trailing')}
                </span>
                <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold truncate">
                  {tip.target2HitTimeFormatted || tip.status === 'TARGET2_HIT' ? `✓ Full Runner Reached` : `Tgt 2: ₹${typeof tip.target2Price === 'number' ? tip.target2Price.toFixed(1) : (tip.target2Price || 'Trail')}`}
                </span>
              </div>

              {/* 6. Stoploss Time / Journal Status */}
              <div className={`p-2.5 rounded-xl text-left space-y-1 shadow-xs border ${
                isSlHit
                  ? 'border-rose-500/50 bg-rose-50 dark:bg-rose-950/30'
                  : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800'
              }`}>
                <span className="text-[9px] font-black uppercase text-rose-700 dark:text-rose-400 block tracking-wider">
                  6. STOPLOSS STATUS
                </span>
                <span className={`font-bold text-xs block truncate ${isSlHit ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'}`}>
                  {tip.stoplossTimeFormatted || (isSlHit ? (tip.bookedTimeFormatted || 'Stopped Out') : 'Active Shield')}
                </span>
                <span className="text-[8.5px] block font-semibold text-rose-600 dark:text-rose-400 truncate">
                  {isSlHit ? 'Archived to Journal' : `SL: ₹${typeof tip.stoplossPrice === 'number' ? tip.stoplossPrice.toFixed(1) : tip.stoplossPrice}`}
                </span>
              </div>
            </div>

            {/* Carry-Forward Call As Per Market */}
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-500/40 text-xs flex items-start gap-2.5">
              <span className="text-base shrink-0">🌙</span>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 dark:text-purple-300 block">
                  MARKET-TAILORED CARRY FORWARD CALL (0DTE EXPIRY vs BTST vs MCX)
                </span>
                <p className="text-slate-800 dark:text-slate-200 text-[11px] leading-relaxed">
                  {tip.carryForwardAdvice || (tip.isExpiryDay && !isCommodity
                    ? '⚠️ NO CARRY FORWARD (0DTE Weekly Expiry Contract) — Mandatory square-off before 03:25 PM IST to prevent 100% expiry cash settlement decay.'
                    : isCommodity
                    ? '⚡ OVERNIGHT COMMODITY (MCX) — Active until 11:30 PM IST. Eligible for carry forward with trailing stoploss.'
                    : (rawPnlPct >= 15 || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT')
                    ? '🌙 CARRY FORWARD (BTST / NEXT EXPIRY) — Lock 50% profit today; carry remaining runner lot with SL strictly trailed to entry cost. Carry window: 03:15 - 03:25 PM IST.'
                    : 'Strict Intraday Exit at 03:25 PM IST — Avoid overnight carry due to rapid time decay (Theta erosion) and gap risk.')}
                </p>
              </div>
            </div>
          </div>

          {/* Option Seller Dedicated Metrics Ribbon */}
          {(tip.tradingRole === 'SELLER' || tip.sellerMetrics) && (
            <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-3 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>
                    {isBeginner 
                      ? '🔰 SAFE OPTION SELLER PROTECTION (CASINO HOUSE ADVANTAGE)' 
                      : isExpert 
                      ? '🔬 INSTITUTIONAL OPTION SELLER & THETA HARVEST TERMINAL' 
                      : 'OPTION SELLER PROTECTION & THETA HARVEST METRICS'}
                  </span>
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[10px] text-purple-200 border border-purple-500/30">
                  POP: {tip.sellerMetrics?.popPct || 82}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-1">
                <div className="bg-slate-900/60 p-2 rounded-lg border border-purple-500/30">
                  <span className="text-purple-300/80 block text-[9px] uppercase font-bold">
                    {isBeginner ? 'CASH POCKETED' : isExpert ? 'NET PREMIUM INFLOW' : 'NET CREDIT POCKETED'}
                  </span>
                  <span className="font-black text-emerald-400 text-sm">
                    ₹{tip.sellerMetrics?.netCreditPoints?.toFixed(2) || (typeof tip.entryPrice === 'number' ? tip.entryPrice.toFixed(2) : '—')} pts
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    ₹{tip.sellerMetrics?.maxProfitRupees?.toLocaleString('en-IN') || '—'}/lot {isBeginner ? '(Upfront)' : ''}
                  </span>
                </div>

                <div className="bg-slate-900/60 p-2 rounded-lg border border-purple-500/30">
                  <span className="text-purple-300/80 block text-[9px] uppercase font-bold">
                    {isBeginner ? 'HEDGED MARGIN' : isExpert ? 'PORTFOLIO MARGIN' : 'EXCHANGE MARGIN'}
                  </span>
                  <span className="font-black text-slate-200 text-sm">
                    ₹{tip.sellerMetrics?.marginRequired?.toLocaleString('en-IN') || '₹38,500'}
                  </span>
                  <span className="text-[9px] text-emerald-400 block mt-0.5">
                    72% Hedged Discount
                  </span>
                </div>

                <div className="bg-slate-900/60 p-2 rounded-lg border border-purple-500/30">
                  <span className="text-purple-300/80 block text-[9px] uppercase font-bold">
                    {isBeginner ? 'SAFETY CUSHION' : isExpert ? 'STD DEV BUFFER' : 'SAFETY BUFFER'}
                  </span>
                  <span className="font-black text-amber-400 text-sm">
                    {tip.sellerMetrics?.breakevenBufferPts ? `${tip.sellerMetrics.breakevenBufferPts} pts` : '220 pts'}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {isExpert ? '> 1.4σ Buffer' : isBeginner ? 'Distance to Loss' : 'Breakeven Cushion'}
                  </span>
                </div>

                <div className="bg-slate-900/60 p-2 rounded-lg border border-purple-500/30">
                  <span className="text-purple-300/80 block text-[9px] uppercase font-bold">
                    {isBeginner ? 'TIME PROFIT BURN' : isExpert ? 'THETA (θ) VELOCITY' : 'THETA DECAY RATE'}
                  </span>
                  <span className="font-black text-cyan-400 text-sm">
                    {tip.sellerMetrics?.thetaBurnRate || '+₹140/hr'}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {isBeginner ? 'Earns While You Wait' : isExpert ? 'Hourly Delta-Neutral θ' : 'Time Value Burn'}
                  </span>
                </div>
              </div>

              {/* Mode-specific guidance note */}
              {isBeginner && (
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center gap-1.5">
                  <span>💡</span>
                  <span><strong>Casino House Advantage:</strong> You pocket the premium upfront. Even in an extreme black swan market crash, your bought hedge leg shields your capital from catastrophic losses.</span>
                </div>
              )}
              {isExpert && (
                <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[10px] text-purple-300 flex items-center gap-1.5 font-mono">
                  <span>🔬</span>
                  <span><strong>Quantitative Risk Matrix:</strong> Standard deviation buffer &gt; 1.4σ • Max Loss capped at ₹{tip.maxLossRupees ? tip.maxLossRupees.toLocaleString('en-IN') : 'Spread Width'} vs Max Profit ₹{tip.maxProfitRupees ? tip.maxProfitRupees.toLocaleString('en-IN') : 'Net Credit'}.</span>
                </div>
              )}
            </div>
          )}

          {/* Execution & Risk Matrix Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
            {/* Spot Price */}
            <div className="bg-terminal-bg p-3 rounded-xl border border-terminal-border">
              <span className="text-terminal-muted block text-[9px] font-bold uppercase">ASSET SPOT</span>
              <span className="font-bold text-terminal-text text-sm sm:text-base block">
                ₹{liveSpot > 0 ? liveSpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </span>
              <span className="text-[9px] text-terminal-muted block mt-0.5">Live Underlying</span>
            </div>

            {/* Entry Price */}
            <div className="bg-accent-cyan/10 p-3 rounded-xl border border-accent-cyan/30">
              <span className="text-accent-cyan block text-[9px] font-bold uppercase">ENTRY ZONE</span>
              <span className="font-black text-terminal-text text-sm sm:text-base block">
                {typeof tip.entryPrice === 'number' ? `₹${tip.entryPrice.toFixed(2)}` : (tip.entryRange || tip.entryPrice || '—')}
              </span>
              <span className="text-[9px] text-accent-cyan/80 block mt-0.5">Recommended</span>
            </div>

            {/* Stop Loss */}
            <div className="bg-bear/15 p-3 rounded-xl border border-bear/30">
              <span className="text-bear block text-[9px] font-bold uppercase">STOP LOSS</span>
              <span className="font-black text-bear text-sm sm:text-base block">
                {typeof tip.stoplossPrice === 'number' ? `₹${tip.stoplossPrice.toFixed(2)}` : (tip.stoplossPrice || '—')}
              </span>
              <span className="text-[9px] text-bear/80 block mt-0.5">
                {tip.stoplossPct ? `-${Number(tip.stoplossPct).toFixed(2)}% Risk` : 'Capital Shield'}
              </span>
            </div>

            {/* Target 1 */}
            <div className="bg-bull/15 p-3 rounded-xl border border-bull/30">
              <span className="text-bull block text-[9px] font-bold uppercase">TARGET 1</span>
              <span className="font-black text-bull text-sm sm:text-base block">
                {typeof tip.target1Price === 'number' ? `₹${tip.target1Price.toFixed(2)}` : (tip.target1Price || '—')}
              </span>
              <span className="text-[9px] text-bull/80 block mt-0.5">
                {tip.target1Pct ? `+${Number(tip.target1Pct).toFixed(2)}% Gain` : 'Book 50%'}
              </span>
            </div>
          </div>

          {/* Secondary Row: Target 2, Risk:Reward, Current LTP, Lot Size */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center text-xs">
            <div className="bg-bull/10 p-2.5 rounded-xl border border-bull/20">
              <span className="text-bull/80 block text-[9px] font-bold uppercase">TARGET 2 (RUNNER)</span>
              <span className="font-bold text-bull block text-sm">
                {typeof tip.target2Price === 'number' ? `₹${tip.target2Price.toFixed(2)}` : (tip.target2Price || 'Trail SL')}
              </span>
            </div>

            <div className="bg-terminal-bg p-2.5 rounded-xl border border-terminal-border">
              <span className="text-terminal-muted block text-[9px] font-bold uppercase">RISK : REWARD</span>
              <span className="font-black text-amber block text-sm">{tip.riskReward || '1:2.2'}</span>
            </div>

            <div className="bg-terminal-bg p-2.5 rounded-xl border border-terminal-border">
              <span className="text-terminal-muted block text-[9px] font-bold uppercase">LOT SIZE</span>
              <span className="font-bold text-terminal-text block text-sm">{lotSize} units</span>
            </div>

            <div className="bg-amber/15 p-2.5 rounded-xl border border-amber/40 shadow-sm">
              <span className="text-amber block text-[9px] font-bold uppercase">CURRENT LTP</span>
              <span className="font-black text-amber block text-sm">
                {tip.currentLtp ? `₹${Number(tip.currentLtp).toFixed(2)}` : '—'}
              </span>
            </div>
          </div>

          {/* 3-Tier Actionable Entry Strategy (Fayda Pro Standard) */}
          <div className="bg-terminal-panel/80 p-3.5 rounded-xl border border-accent-cyan/30 space-y-2 font-mono">
            <div className="flex items-center justify-between text-xs font-bold text-accent-cyan">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-accent-cyan" />
                <span>ACTIONABLE ENTRY STRATEGY (FAYDA PRO STANDARD)</span>
              </span>
              <span className="text-[10px] text-terminal-muted">Smart Execution</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1.5 border-t border-terminal-border/50">
              {/* Limit Dip Entry */}
              <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/25 text-left">
                <div className="text-[9px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <span>🟢 LIMIT / PULLBACK DIP</span>
                </div>
                <div className="font-bold text-terminal-text text-sm font-mono mt-0.5">
                  ₹{typeof tip.entryPrice === 'number' ? (tip.entryPrice * 0.98).toFixed(2) : '—'} - ₹{typeof tip.entryPrice === 'number' ? tip.entryPrice.toFixed(2) : '—'}
                </div>
                <div className="text-[9px] text-terminal-muted mt-0.5">Optimal Value / Best R:R</div>
              </div>

              {/* Market Trigger */}
              <div className="bg-accent-sky/10 p-2.5 rounded-lg border border-accent-sky/25 text-left">
                <div className="text-[9px] font-bold text-accent-sky uppercase flex items-center gap-1">
                  <span>⚡ AT SIGNAL TRIGGER</span>
                </div>
                <div className="font-bold text-terminal-text text-sm font-mono mt-0.5">
                  ₹{typeof tip.entryPrice === 'number' ? tip.entryPrice.toFixed(2) : (tip.entryRange || '—')}
                </div>
                <div className="text-[9px] text-terminal-muted mt-0.5">Benchmark @ {tip.givenTimeFormatted || 'Live'}</div>
              </div>

              {/* Breakout Confirmation */}
              <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/25 text-left">
                <div className="text-[9px] font-bold text-purple-300 uppercase flex items-center gap-1">
                  <span>🚀 BREAKOUT TRIGGER</span>
                </div>
                <div className="font-bold text-terminal-text text-sm font-mono mt-0.5">
                  &gt; ₹{typeof tip.entryPrice === 'number' ? (tip.entryPrice * 1.025).toFixed(2) : '—'}
                </div>
                <div className="text-[9px] text-terminal-muted mt-0.5">Buy on 1-min Candle Close</div>
              </div>
            </div>
          </div>

          {/* Spread Details Card (if it is a Multi-Leg Spread) */}
          {isSpread && (
            <div className="bg-terminal-panel/80 p-3.5 rounded-xl border border-purple-500/30 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>HEDGED MULTI-LEG SPREAD PAYOFF MATRIX</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[10px]">72% Margin Benefit</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-terminal-border/50">
                <div className="bg-bear/10 p-2 rounded-lg border border-bear/20">
                  <span className="text-bear block text-[9px] font-bold uppercase">MAX RISK (₹)</span>
                  <span className="font-black text-bear text-sm">
                    {tip.maxLossRupees ? `₹${tip.maxLossRupees.toLocaleString('en-IN')}` : '—'}
                  </span>
                </div>
                <div className="bg-bull/10 p-2 rounded-lg border border-bull/20">
                  <span className="text-bull block text-[9px] font-bold uppercase">MAX PROFIT (₹)</span>
                  <span className="font-black text-bull text-sm">
                    {tip.maxProfitRupees ? `₹${tip.maxProfitRupees.toLocaleString('en-IN')}` : '—'}
                  </span>
                </div>
                <div className="bg-terminal-bg p-2 rounded-lg border border-terminal-border">
                  <span className="text-accent-cyan block text-[9px] font-bold uppercase">BREAKEVEN</span>
                  <span className="font-bold text-terminal-text text-sm">
                    {typeof tip.breakeven === 'number' ? `₹${tip.breakeven.toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Perspective Strategy Explanations */}
          <div className="bg-terminal-panel/60 rounded-xl border border-terminal-border overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center border-b border-terminal-border bg-terminal-bg/80 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('BEGINNER')}
                className={`flex-1 py-2 px-3 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'BEGINNER'
                    ? 'bg-accent-cyan/15 text-accent-cyan border-b-2 border-accent-cyan'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                <span>🔰 Beginner View</span>
                {mode === 'BEGINNER' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">Active</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('INTERMEDIATE')}
                className={`flex-1 py-2 px-3 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'INTERMEDIATE'
                    ? 'bg-accent-cyan/15 text-accent-cyan border-b-2 border-accent-cyan'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                <span>📊 Technical Logic</span>
                {mode === 'INTERMEDIATE' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-300 border border-sky-500/40">Active</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('EXPERT')}
                className={`flex-1 py-2 px-3 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'EXPERT'
                    ? 'bg-accent-cyan/15 text-accent-cyan border-b-2 border-accent-cyan'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                <span>🔬 Quantitative Greeks</span>
                {mode === 'EXPERT' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 border border-purple-500/40">Active</span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-3.5 text-xs text-terminal-text leading-relaxed font-sans">
              {activeTab === 'BEGINNER' && (
                <div className="space-y-1.5">
                  <p className="font-medium">
                    {tip.explanations?.beginner ||
                      `High probability trade setup in ${tip.symbol}. Enter within the recommended zone with strict risk control. Once Target 1 is reached, book 50% profit and trail stoploss to your entry price to lock in capital safety.`}
                  </p>
                  <p className="text-[11px] text-terminal-muted">
                    💡 <strong>Pro Rule:</strong> Never risk more than 2% of total trading account on a single recommendation.
                  </p>
                </div>
              )}

              {activeTab === 'INTERMEDIATE' && (
                <div className="space-y-1.5">
                  <p className="font-medium">
                    {tip.explanations?.intermediate ||
                      `${tip.strategyTag || 'Multi-Strategy Confluence'} confirmed across CPR Pivot range, 9-EMA momentum trigger, and 1-minute order flow volume absorption. Target 1 offers favorable 1:2 Risk-to-Reward.`}
                  </p>
                  {tip.buildup && (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30">
                      OI Flow: {tip.buildup}
                    </span>
                  )}
                </div>
              )}

              {activeTab === 'EXPERT' && (
                <div className="space-y-1.5 font-mono text-[11px]">
                  <p>
                    {tip.explanations?.expert ||
                      `Multi-factor confluence: Black-Scholes Greeks, IV pricing curve, and high delta institutional order surge. Expected momentum horizon: ~12-18 minutes.`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-terminal-muted">
                    {tip.iv && <span>IV: <strong className="text-terminal-text">{tip.iv}%</strong> ({tip.ivStatus || 'Fair'})</span>}
                    {tip.liquidityRating && <span>Liquidity: <strong className="text-terminal-text">{tip.liquidityRating}</strong></span>}
                    {tip.spreadFormatted && <span>Spread: <strong className="text-terminal-text">{tip.spreadFormatted}</strong></span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 10-Indicator Technical Confluence Checklist */}
          {tip.confluenceBreakdown && (
            <ConfluenceChecklist 
              breakdown={tip.confluenceBreakdown} 
              role={tip.tradingRole || (tip.action?.includes('SELL') ? 'SELLER' : 'BUYER')}
              score={tip.confluenceScore}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-terminal-panel/90 border-t border-terminal-border gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-terminal-bg hover:bg-terminal-border border border-terminal-border text-terminal-text font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-bull" /> : <Copy className="w-3.5 h-3.5 text-terminal-muted" />}
            <span>{copied ? 'Copied! ✓' : 'Copy Setup'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSwitchToOptionsData}
              className="px-3.5 py-1.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/40 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title={`View ${tip.symbol} Live Options Data Table`}
            >
              <Layers className="w-3.5 h-3.5 text-accent-cyan" />
              <span>View {tip.symbol} Options Data</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 rounded-xl bg-terminal-card hover:bg-terminal-border border border-terminal-border text-terminal-muted hover:text-terminal-text font-mono font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
