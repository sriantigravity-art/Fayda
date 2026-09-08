import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { 
  Zap, 
  X, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ShieldAlert,
  Target, 
  Sparkles, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink,
  Award,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ALL_SYMBOLS_CONFIG, type TipLifecycleFlashEvent } from '../types';
import { isMarketOpenForSymbol } from '../utils/lastClosedData';

export const TradeLifecycleFlashModal: React.FC = () => {
  const { 
    latestLifecycleFlash, 
    dismissLifecycleFlash, 
    openTradeTipModal,
    selectedIndex
  } = useMarket();

  const [progress, setProgress] = useState(100);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [copied, setCopied] = useState(false);

  const dismissRef = useRef(dismissLifecycleFlash);
  dismissRef.current = dismissLifecycleFlash;

  const flashId = latestLifecycleFlash?.id;

  useEffect(() => {
    if (!flashId) {
      setProgress(100);
      setSecondsRemaining(10);
      return;
    }

    setProgress(100);
    setSecondsRemaining(10);
    const durationMs = 10000; // 10 seconds auto-dismiss
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, durationMs - elapsed);
      const pct = (remainingMs / durationMs) * 100;

      setProgress(pct);
      setSecondsRemaining(Math.max(0, Math.ceil(remainingMs / 1000)));

      if (elapsed >= durationMs) {
        clearInterval(interval);
        dismissRef.current();
      }
    }, 50);

    const hardTimeout = setTimeout(() => {
      clearInterval(interval);
      dismissRef.current();
    }, durationMs + 150);

    return () => {
      clearInterval(interval);
      clearTimeout(hardTimeout);
    };
  }, [flashId]);

  const isMarketOpen = isMarketOpenForSymbol(latestLifecycleFlash?.symbol || '');

  // Only show flash tips for the asset selected by user in header dropdown,
  // AND strictly only show modal box when book profit, exit, trailing stoploss, or book loss,
  // AND strictly only when market is open for this symbol (cash market closes at 03:40 PM IST).
  if (
    !latestLifecycleFlash || 
    !isMarketOpen ||
    (latestLifecycleFlash.symbol && selectedIndex && latestLifecycleFlash.symbol !== selectedIndex) ||
    !['BOOK_HALF_PROFIT', 'BOOK_FULL_PROFIT', 'BOOK_LOSS', 'TIGHTEN_SL'].includes(latestLifecycleFlash.type)
  ) {
    return null;
  }

  const event = latestLifecycleFlash;
  const isCall = event.action.includes('CALL') || event.optionType === 'CE';
  const isLoss = event.type === 'BOOK_LOSS';
  const isProfit = event.type === 'BOOK_HALF_PROFIT' || event.type === 'BOOK_FULL_PROFIT';
  const isNew = event.type === 'NEW_TIP';
  const isHold = event.type === 'HOLD_MOMENTUM';

  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === event.symbol);
  const lotSize = cfg?.lot || 50;

  const pnlPts = event.pnlPoints ?? +(event.currentLtp - event.entryPrice).toFixed(1);
  const pnlPct = event.pnlPct ?? +(((event.currentLtp - event.entryPrice) / (event.entryPrice || 1)) * 100).toFixed(1);
  const isPositivePnl = pnlPts >= 0;

  const handleOpenDetailedModal = () => {
    openTradeTipModal({
      symbol: event.symbol,
      title: event.contractSymbol,
      contractSymbol: event.contractSymbol,
      action: isCall ? 'BUY_CALL' : 'BUY_PUT',
      optionType: event.optionType === 'SPREAD' ? 'CE' : event.optionType,
      strikePrice: parseInt(event.contractSymbol.replace(/[^0-9]/g, '')) || 0,
      confluenceScore: event.confluenceScore,
      entryPrice: event.entryPrice,
      entryRange: event.entryRange || `₹${event.entryPrice.toFixed(1)}`,
      currentLtp: event.currentLtp,
      stoplossPrice: event.stoplossPrice,
      stoplossPct: event.stoplossPct,
      target1Price: event.target1Price,
      target1Pct: event.target1Pct,
      target2Price: event.target2Price,
      target2Pct: event.target2Pct,
      riskReward: '1:2.5',
      givenTimeFormatted: event.entryTimeFormatted || 'Live Session',
      bookedTimeFormatted: event.bookedTimeFormatted || event.timeFormatted,
      carryForwardTimeFormatted: event.carryForwardTimeFormatted,
      isCarriedForward: !!event.carryForwardTimeFormatted,
      elapsedTimeFormatted: 'Live Lifecycle Alert',
      actionGuidance: event.recommendedAction,
      status: isLoss ? 'SL_HIT' : isProfit ? 'PROFIT_LOCKED' : 'ACTIVE',
      strategyTag: event.strategyTag,
      lotSize
    });
    dismissLifecycleFlash();
  };

  const handleCopyAlert = () => {
    const text = `🚨 [FAYDA SEBI DISCIPLINE ALERT] ${event.directiveTitle}\n• Contract: ${event.contractSymbol} (${event.action})\n• Guidance: ${event.professionalGuidance}\n• Current LTP: ₹${event.currentLtp.toFixed(2)} (${isPositivePnl ? '+' : ''}${pnlPts} pts | ${pnlPct}%)\n• Recommended Action: ${event.recommendedAction}\n• Trailing SL: ₹${(event.recommendedSl || event.stoplossPrice).toFixed(2)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Color theme styling based on lifecycle stage
  const getThemeStyles = () => {
    if (isLoss) {
      return {
        borderClass: 'border-rose-500/80 shadow-[0_0_60px_rgba(244,63,94,0.45)]',
        accentGradient: 'from-rose-600 via-rose-500 to-amber-600',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
        icon: <ShieldAlert className="w-6 h-6 text-rose-400 animate-bounce" />,
        headerTitleColor: 'text-rose-400'
      };
    }
    if (event.type === 'BOOK_FULL_PROFIT') {
      return {
        borderClass: 'border-emerald-400/90 shadow-[0_0_70px_rgba(16,185,129,0.55)]',
        accentGradient: 'from-emerald-500 via-teal-400 to-amber-400',
        badgeBg: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50',
        icon: <Award className="w-6 h-6 text-emerald-400 animate-pulse" />,
        headerTitleColor: 'text-emerald-400'
      };
    }
    if (event.type === 'BOOK_HALF_PROFIT') {
      return {
        borderClass: 'border-amber-400/85 shadow-[0_0_60px_rgba(245,158,11,0.45)]',
        accentGradient: 'from-amber-500 via-emerald-400 to-cyan-400',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
        icon: <Target className="w-6 h-6 text-amber-400 animate-pulse" />,
        headerTitleColor: 'text-amber-300'
      };
    }
    if (isHold) {
      return {
        borderClass: 'border-cyan-400/85 shadow-[0_0_60px_rgba(6,182,212,0.4)]',
        accentGradient: 'from-cyan-500 via-teal-400 to-emerald-400',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
        icon: <TrendingUp className="w-6 h-6 text-cyan-400 animate-pulse" />,
        headerTitleColor: 'text-cyan-300'
      };
    }
    // NEW_TIP or TIGHTEN_SL default
    return {
      borderClass: 'border-amber-500/80 shadow-[0_0_60px_rgba(245,158,11,0.35)]',
      accentGradient: 'from-amber-500 via-sky-400 to-emerald-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      icon: <Zap className="w-6 h-6 text-amber-400 animate-pulse" />,
      headerTitleColor: 'text-amber-400'
    };
  };

  const theme = getThemeStyles();

  const modalContent = (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          dismissLifecycleFlash();
        }
      }}
    >
      <div 
        className={`relative w-full max-w-xl rounded-3xl border-2 overflow-hidden text-slate-100 transition-all bg-slate-950/95 shadow-2xl font-mono ${theme.borderClass}`}
      >
        {/* Top 10-Second Auto-Dismiss Progress Bar */}
        <div className="w-full h-1.5 bg-slate-900 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${theme.accentGradient} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Ambient Glow Elements */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-inner flex items-center justify-center">
              {theme.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${theme.badgeBg}`}>
                  {event.directiveBadge}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  🎯 {event.confluenceScore}% Confluence
                </span>
              </div>
              <h2 className={`text-sm sm:text-base font-black tracking-tight mt-1 ${theme.headerTitleColor}`}>
                {event.directiveTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
              {secondsRemaining}s
            </span>
            <button
              onClick={dismissLifecycleFlash}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Main Contract & Direction Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  isCall ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {event.action}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 text-[10px] font-bold">
                    Given: {event.entryTimeFormatted || 'Earlier Session'}
                  </span>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                    isLoss ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {isLoss ? 'Loss Booked:' : 'Profit Booked:'} {event.bookedTimeFormatted || event.timeFormatted}
                  </span>
                  {event.carryForwardTimeFormatted && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                      Carry Forward: {event.carryForwardTimeFormatted}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                <span>{event.contractSymbol}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Strategy: <span className="text-slate-200 font-semibold">{event.strategyTag}</span>
              </div>
            </div>

            {/* Live LTP & P&L Capsule */}
            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
              <div className="text-[10px] uppercase text-slate-400 font-bold">Current LTP</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400">
                ₹{event.currentLtp.toFixed(2)}
              </div>
              <div className={`text-xs font-black mt-0.5 ${isPositivePnl ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositivePnl ? `+₹${pnlPts} (+${pnlPct}%)` : `-₹${Math.abs(pnlPts)} (${pnlPct}%)`}
              </div>
            </div>
          </div>

          {/* Professional Financial Analysis & Directive Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/30 flex items-start gap-3 shadow-sm">
            <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-black block">
                Standard Trading Protocol & Directive:
              </span>
              <p className="text-xs sm:text-[13px] text-slate-200 font-sans leading-relaxed font-medium mt-1">
                {event.professionalGuidance}
              </p>
            </div>
          </div>

          {/* Key Strategic Levels Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            {/* Entry */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Entry Zone</span>
              <span className="text-sm font-black text-sky-400 block mt-0.5">
                {event.entryRange || `₹${event.entryPrice.toFixed(1)}`}
              </span>
            </div>

            {/* Target 1 */}
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[9px] text-emerald-400 uppercase font-bold block">Target 1</span>
              <span className="text-sm font-black text-emerald-400 block mt-0.5">
                ₹{event.target1Price.toFixed(1)}
              </span>
              <span className="text-[9px] text-emerald-500 font-bold block">+{event.target1Pct}%</span>
            </div>

            {/* Target 2 */}
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[9px] text-emerald-400 uppercase font-bold block">Target 2</span>
              <span className="text-sm font-black text-emerald-400 block mt-0.5">
                ₹{(event.target2Price || event.target1Price * 1.25).toFixed(1)}
              </span>
              <span className="text-[9px] text-emerald-500 font-bold block">+{event.target2Pct || 60}%</span>
            </div>

            {/* Stoploss / Trailing SL */}
            <div className={`p-2.5 rounded-xl border ${
              isLoss ? 'bg-rose-950/40 border-rose-500/60' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <span className="text-[9px] text-rose-400 uppercase font-bold block">
                {event.recommendedSl ? 'Trailing SL' : 'Stop Loss'}
              </span>
              <span className="text-sm font-black text-rose-400 block mt-0.5">
                ₹{(event.recommendedSl || event.stoplossPrice).toFixed(1)}
              </span>
              <span className="text-[9px] text-slate-400 block">
                {event.recommendedSl && event.recommendedSl >= event.entryPrice ? 'Risk-Free' : `-${event.stoplossPct}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 bg-slate-900/80 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={handleCopyAlert}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Copy alert text to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <span className="text-[11px] font-sans text-slate-500">
              Auto-closes in {secondsRemaining}s
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={dismissLifecycleFlash}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Dismiss
            </button>

            <button
              type="button"
              onClick={handleOpenDetailedModal}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 flex items-center justify-center gap-1.5 transition shadow-lg cursor-pointer ${
                isLoss 
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30' 
                  : isProfit 
                  ? 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-400/30' 
                  : 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/30'
              }`}
            >
              <span>{event.recommendedAction}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TradeLifecycleFlashModal;
