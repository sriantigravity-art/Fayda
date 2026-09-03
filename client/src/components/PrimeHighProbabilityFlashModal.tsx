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
    openTradeTipModal 
  } = useMarket();

  const [progress, setProgress] = useState(100);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [isPaused, setIsPaused] = useState(false);
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
      if (isPaused) return;

      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, durationMs - elapsed);
      const pct = (remainingMs / durationMs) * 100;

      setProgress(pct);
      setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));

      if (elapsed >= durationMs) {
        clearInterval(interval);
        dismissRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [flashId, isPaused]);

  if (!latestHighProbFlash) return null;

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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden text-terminal-text transition-all ${
          isCall 
            ? 'bg-gradient-to-b from-[#061e14] via-terminal-card to-terminal-bg border-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.3)]' 
            : 'bg-gradient-to-b from-[#240a12] via-terminal-card to-terminal-bg border-rose-500/60 shadow-[0_0_50px_rgba(244,63,94,0.3)]'
        }`}
      >
        {/* Countdown Progress Bar */}
        <div className="w-full h-1.5 bg-terminal-border/40">
          <div 
            className={`h-full transition-all duration-75 ${
              isCall ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-rose-500 to-amber-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-border/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isCall ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
            }`}>
              {isCall ? <TrendingUp className="w-5 h-5 animate-bounce" /> : <TrendingDown className="w-5 h-5 animate-bounce" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-black uppercase tracking-wider ${
                  isCall ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isCall ? '🟢 PRIME HIGH-PROBABILITY CALL' : '🔴 PRIME HIGH-PROBABILITY PUT'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-accent-gold/20 text-accent-gold border border-accent-gold/40">
                  🎯 {tip.confluenceScore}% CONFLUENCE
                </span>
              </div>
              <div className="text-[11px] text-terminal-muted flex items-center gap-1.5 mt-0.5 font-mono">
                <Clock className="w-3 h-3 text-accent-cyan" />
                <span>Triggered at {tip.entryTimeFormatted}</span>
                <span>•</span>
                <span className="text-accent-cyan">Hourly Slot Lock (1/2 Active)</span>
              </div>
            </div>
          </div>

          <button
            onClick={dismissHighProbFlash}
            className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-border/40 transition-all"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Main Contract Card */}
          <div className="bg-terminal-bg/90 border border-terminal-border/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-terminal-muted font-bold uppercase tracking-wider">Suggested Contract</div>
              <div className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2 mt-0.5">
                <span>{tip.contractSymbol}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  isCall ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {isCall ? 'BULLISH' : 'BEARISH'}
                </span>
              </div>
              <div className="text-xs text-terminal-muted font-mono mt-1">
                Strategy: <span className="text-terminal-text font-bold">{tip.strategyTag}</span>
              </div>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-terminal-border/60">
              <div className="text-[10px] text-terminal-muted uppercase font-bold">Suggested Entry Zone</div>
              <div className="text-lg font-black font-mono text-accent-cyan mt-0.5">
                {tip.entryRange}
              </div>
              <div className="text-[11px] text-terminal-muted font-mono">
                Risk:Reward: <span className="text-accent-gold font-bold">{tip.riskReward}</span>
              </div>
            </div>
          </div>

          {/* Level Targets Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-center">
              <div className="text-[10px] font-mono font-bold uppercase text-rose-400">Stop Loss</div>
              <div className="text-base font-black font-mono text-rose-300 mt-1">₹{tip.stoplossPrice.toFixed(2)}</div>
              <div className="text-[10px] text-rose-400/80 font-mono mt-0.5">-{tip.stoplossPct}% Risk</div>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-center">
              <div className="text-[10px] font-mono font-bold uppercase text-emerald-400">Target 1</div>
              <div className="text-base font-black font-mono text-emerald-300 mt-1">₹{tip.target1Price.toFixed(2)}</div>
              <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">+{tip.target1Pct}% Gain</div>
            </div>

            <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-3 text-center">
              <div className="text-[10px] font-mono font-bold uppercase text-cyan-400">Target 2 (Runner)</div>
              <div className="text-base font-black font-mono text-cyan-300 mt-1">₹{tip.target2Price.toFixed(2)}</div>
              <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">+{tip.target2Pct}% Gain</div>
            </div>
          </div>

          {/* Explanation Snippet */}
          <div className="bg-terminal-bg/60 border border-terminal-border/60 rounded-xl p-3 text-xs leading-relaxed text-terminal-muted">
            <span className="text-accent-gold font-bold">Why this setup: </span>
            {tip.explanations.intermediate || tip.explanations.beginner}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 p-4 bg-terminal-bg/80 border-t border-terminal-border/60">
          <div className="text-xs text-terminal-muted font-mono">
            Auto-closing in <span className="font-bold text-accent-cyan">{secondsRemaining}s</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySetup}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-terminal-card hover:bg-terminal-border/40 border border-terminal-border text-terminal-text transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-terminal-muted" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleOpenDetailedModal}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-black text-terminal-bg shadow-lg transition-all ${
                isCall 
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-emerald-500/20' 
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 shadow-rose-500/20 text-white'
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
