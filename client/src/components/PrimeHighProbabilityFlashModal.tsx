import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { 
  Zap, 
  X, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Target, 
  Sparkles, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { ALL_SYMBOLS_CONFIG } from '../types';

export const PrimeHighProbabilityFlashModal: React.FC = () => {
  const { 
    latestHighProbFlash, 
    dismissHighProbFlash, 
    openTradeTipModal,
    selectedIndex
  } = useMarket();

  const [progress, setProgress] = useState(100);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [copied, setCopied] = useState(false);

  const dismissRef = React.useRef(dismissHighProbFlash);
  dismissRef.current = dismissHighProbFlash;

  const flashId = latestHighProbFlash?.id;

  useEffect(() => {
    if (!flashId) {
      setProgress(100);
      setSecondsRemaining(10);
      return;
    }

    setProgress(100);
    setSecondsRemaining(10);
    const durationMs = 10000;
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

    // Guaranteed fallback timeout to ensure dismissal after 10 seconds
    const hardTimeout = setTimeout(() => {
      clearInterval(interval);
      dismissRef.current();
    }, durationMs + 100);

    return () => {
      clearInterval(interval);
      clearTimeout(hardTimeout);
    };
  }, [flashId]);

  if (!latestHighProbFlash || (latestHighProbFlash.symbol && selectedIndex && latestHighProbFlash.symbol !== selectedIndex)) {
    return null;
  }

  const { tip, direction, symbol } = latestHighProbFlash;
  const isCall = direction === 'CALL';
  const symCfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
  const lotSize = symCfg?.lot || 50;

  const handleOpenDetailedModal = () => {
    openTradeTipModal({
      symbol: tip.symbol,
      title: tip.contractSymbol,
      contractSymbol: tip.contractSymbol,
      action: tip.action,
      optionType: tip.optionType,
      tierLabel: tip.tierLabel,
      sessionName: tip.sessionName,
      confluenceScore: tip.confluenceScore,
      entryPrice: tip.entryPrice,
      entryRange: tip.entryRange,
      currentLtp: tip.currentLtp,
      stoplossPrice: tip.stoplossPrice,
      stoplossPct: tip.stoplossPct,
      target1Price: tip.target1Price,
      target1Pct: tip.target1Pct,
      target2Price: tip.target2Price,
      target2Pct: tip.target2Pct,
      riskReward: tip.riskReward,
      givenTimeFormatted: tip.entryTimeFormatted,
      elapsedTimeFormatted: 'Just Triggered',
      actionGuidance: `HIGH-PROBABILITY HOURLY ${isCall ? 'CALL' : 'PUT'} SETUP`,
      status: tip.status,
      strategyTag: tip.strategyTag,
      lotSize,
      explanations: tip.explanations
    });
    dismissHighProbFlash();
  };

  const handleCopySetup = () => {
    const text = `🎯 FAYDA HIGH-PROBABILITY ${isCall ? 'CALL' : 'PUT'}: ${tip.contractSymbol}\n• Entry Zone: ${tip.entryRange}\n• Target 1: ₹${tip.target1Price.toFixed(2)} (+${tip.target1Pct}%)\n• Target 2: ₹${tip.target2Price.toFixed(2)} (+${tip.target2Pct}%)\n• Stop Loss: ₹${tip.stoplossPrice.toFixed(2)} (-${tip.stoplossPct}%)\n• Confluence: ${tip.confluenceScore}% High Probability`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          dismissHighProbFlash();
        }
      }}
    >
      <div 
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden text-slate-900 dark:text-terminal-text transition-all bg-white dark:bg-slate-950 ${
          isCall 
            ? 'border-emerald-300 dark:border-emerald-500/60 shadow-emerald-500/10 dark:shadow-[0_0_50px_rgba(16,185,129,0.3)]' 
            : 'border-rose-300 dark:border-rose-500/60 shadow-rose-500/10 dark:shadow-[0_0_50px_rgba(244,63,94,0.3)]'
        }`}
      >
        {/* Countdown Progress Bar */}
        <div className="w-full h-1.5 bg-slate-200 dark:bg-terminal-border/40">
          <div 
            className={`h-full transition-all duration-75 ${
              isCall ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gradient-to-r from-rose-500 to-amber-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-terminal-border/60 bg-slate-50/80 dark:bg-transparent">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isCall 
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40' 
                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/40'
            }`}>
              {isCall ? <TrendingUp className="w-5 h-5 animate-bounce" /> : <TrendingDown className="w-5 h-5 animate-bounce" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-mono font-black uppercase tracking-wider ${
                  isCall ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}>
                  {isCall ? '🟢 PRIME HIGH-PROBABILITY CALL' : '🔴 PRIME HIGH-PROBABILITY PUT'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-100 dark:bg-accent-gold/20 text-amber-800 dark:text-accent-gold border border-amber-300 dark:border-accent-gold/40">
                  🎯 {tip.confluenceScore}% CONFLUENCE
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-terminal-muted flex items-center gap-1.5 mt-0.5 font-mono">
                <Clock className="w-3 h-3 text-cyan-600 dark:text-accent-cyan" />
                <span>Triggered at {tip.entryTimeFormatted}</span>
                <span>•</span>
                <span className="text-cyan-700 dark:text-accent-cyan font-bold">Hourly Slot Lock (1/2 Active)</span>
              </div>
            </div>
          </div>

          <button
            onClick={dismissHighProbFlash}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-terminal-muted dark:hover:text-terminal-text hover:bg-slate-200/60 dark:hover:bg-terminal-border/40 transition-all cursor-pointer"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Main Contract Card */}
          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-terminal-border/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="text-xs text-slate-500 dark:text-terminal-muted font-bold uppercase tracking-wider">Suggested Contract</div>
              <div className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <span>{tip.contractSymbol}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  isCall ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-transparent' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-transparent'
                }`}>
                  {isCall ? 'BULLISH' : 'BEARISH'}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-terminal-muted font-mono mt-1">
                Strategy: <span className="text-slate-900 dark:text-terminal-text font-bold">{tip.strategyTag}</span>
              </div>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-terminal-border/60">
              <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase font-bold">Suggested Entry Zone</div>
              <div className="text-lg font-black font-mono text-cyan-700 dark:text-accent-cyan mt-0.5">
                {tip.entryRange}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-terminal-muted font-mono">
                Risk:Reward: <span className="text-amber-700 dark:text-accent-gold font-bold">{tip.riskReward}</span>
              </div>
            </div>
          </div>

          {/* Level Targets Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 text-center shadow-xs">
              <div className="text-[10px] font-mono font-black uppercase text-rose-800 dark:text-rose-400">Stop Loss</div>
              <div className="text-base font-black font-mono text-rose-700 dark:text-rose-300 mt-1">₹{tip.stoplossPrice.toFixed(2)}</div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400/90 font-mono mt-0.5 font-bold">-{tip.stoplossPct}% Risk</div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3 text-center shadow-xs">
              <div className="text-[10px] font-mono font-black uppercase text-emerald-800 dark:text-emerald-400">Target 1</div>
              <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1">₹{tip.target1Price.toFixed(2)}</div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400/90 font-mono mt-0.5 font-bold">+{tip.target1Pct}% Gain</div>
            </div>

            <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30 rounded-xl p-3 text-center shadow-xs">
              <div className="text-[10px] font-mono font-black uppercase text-sky-800 dark:text-cyan-400">Target 2 (Runner)</div>
              <div className="text-base font-black font-mono text-sky-700 dark:text-cyan-300 mt-1">₹{tip.target2Price.toFixed(2)}</div>
              <div className="text-[10px] text-sky-700 dark:text-cyan-400/90 font-mono mt-0.5 font-bold">+{tip.target2Pct}% Gain</div>
            </div>
          </div>

          {/* Explanation Snippet */}
          <div className="bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-terminal-border/60 rounded-xl p-3 text-xs leading-relaxed text-slate-800 dark:text-terminal-muted shadow-xs">
            <span className="text-amber-800 dark:text-accent-gold font-bold">Why this setup: </span>
            {tip.explanations.intermediate || tip.explanations.beginner}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-terminal-border/60">
          <div className="text-xs text-slate-600 dark:text-terminal-muted font-mono">
            Auto-closing in <span className="font-bold text-cyan-700 dark:text-accent-cyan">{secondsRemaining}s</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySetup}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-white dark:bg-terminal-card hover:bg-slate-100 dark:hover:bg-terminal-border/40 border border-slate-300 dark:border-terminal-border text-slate-800 dark:text-terminal-text transition-all shadow-xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-terminal-muted" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleOpenDetailedModal}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-black text-white shadow-md transition-all cursor-pointer ${
                isCall 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20' 
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-500/20'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Full Strategy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
