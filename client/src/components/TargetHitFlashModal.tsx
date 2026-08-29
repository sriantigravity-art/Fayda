import React, { useEffect, useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  Target, 
  X, 
  ShieldCheck, 
  Award, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const TargetHitFlashModal: React.FC = () => {
  const { latestTargetHit, dismissTargetHit } = useMarket();
  const [progress, setProgress] = useState(100);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const dismissRef = React.useRef(dismissTargetHit);
  dismissRef.current = dismissTargetHit;

  const hitId = latestTargetHit?.id;

  useEffect(() => {
    if (!hitId) {
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
      setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));

      if (elapsed >= durationMs) {
        clearInterval(interval);
        dismissRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [hitId]);

  if (!latestTargetHit) return null;

  const isBull = latestTargetHit.isBull;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-terminal-card border-2 border-bull/80 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(0,245,155,0.45)] overflow-hidden font-mono text-terminal-text">
        {/* Top 10-Second Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-terminal-bg">
          <div
            className="h-full bg-gradient-to-r from-accent-cyan via-bull to-amber transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Ambient Glow Orbs */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-bull/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-accent-cyan/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Ribbon */}
        <div className="flex items-center justify-between mt-1 mb-4">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-black bg-bull text-terminal-bg shadow-[0_0_15px_rgba(0,245,155,0.8)] animate-pulse">
              <Target className="w-3.5 h-3.5 mr-1" /> 🎯 TARGET 1 HIT!
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber/20 text-amber border border-amber/40 flex items-center gap-1">
              <Award className="w-3 h-3" /> PROFIT BOOKED
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-bull/15 text-bull border border-bull/30 font-bold text-[10px]">
              {secondsRemaining}s
            </span>
            <button
              onClick={dismissTargetHit}
              className="p-1 rounded-lg bg-terminal-panel hover:bg-terminal-border text-terminal-muted hover:text-terminal-text transition"
              title="Close Flash Screen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Contract Banner */}
        <div className="bg-terminal-panel/80 border border-terminal-border/80 rounded-2xl p-4 mb-4 text-center relative overflow-hidden">
          <div className="flex items-center justify-center space-x-2 mb-1.5">
            <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
              isBull ? 'bg-bull/20 text-bull border border-bull/40' : 'bg-bear/20 text-bear border border-bear/40'
            }`}>
              {latestTargetHit.action}
            </span>
            <span className="text-[11px] text-terminal-muted">
              {latestTargetHit.timeFormatted} IST
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-amber animate-spin" />
            {latestTargetHit.symbol}
            <Sparkles className="w-5 h-5 text-amber animate-spin" />
          </h3>

          <p className="text-xs text-bull font-bold mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> High-Confidence OI Recommendation Target Achieved
          </p>
        </div>

        {/* Trade Execution Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 text-center">
          {/* Entry */}
          <div className="bg-terminal-bg/80 border border-terminal-border rounded-xl p-2.5">
            <span className="text-[9px] text-terminal-muted block uppercase font-semibold">Entry Level</span>
            <span className="font-bold text-xs sm:text-sm text-terminal-text block mt-0.5">
              ₹{latestTargetHit.entryPrice.toFixed(2)}
            </span>
          </div>

          {/* Target */}
          <div className="bg-terminal-bg/80 border border-terminal-border rounded-xl p-2.5">
            <span className="text-[9px] text-terminal-muted block uppercase font-semibold">Target Level</span>
            <span className="font-bold text-xs sm:text-sm text-accent-cyan block mt-0.5">
              ₹{latestTargetHit.targetPrice.toFixed(2)}
            </span>
          </div>

          {/* Exit / Live LTP */}
          <div className="bg-bull/15 border border-bull/50 rounded-xl p-2.5 shadow-[0_0_15px_rgba(0,245,155,0.2)]">
            <span className="text-[9px] text-bull block uppercase font-black">Exit / Live LTP</span>
            <span className="font-black text-xs sm:text-sm text-bull block mt-0.5">
              ₹{latestTargetHit.currentLtp.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Profit / Points Box */}
        <div className="bg-gradient-to-r from-bull/15 via-accent-cyan/15 to-bull/15 border-2 border-bull/60 rounded-2xl p-3.5 text-center mb-4 shadow-[0_0_25px_rgba(0,245,155,0.25)]">
          <span className="text-[10px] text-terminal-muted uppercase tracking-wider block font-bold">
            Total Points Captured & Return
          </span>
          <div className="flex items-center justify-center space-x-3 mt-1">
            <span className="font-black text-lg sm:text-2xl text-bull">
              +{latestTargetHit.pointsGained > 0 ? latestTargetHit.pointsGained.toFixed(2) : latestTargetHit.pointsGained} pts
            </span>
            <span className="text-terminal-muted text-sm font-bold">•</span>
            <span className="font-black text-lg sm:text-2xl text-amber">
              +{latestTargetHit.roiPct}% ROI
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={dismissTargetHit}
            className="flex-1 py-2.5 px-4 rounded-xl bg-bull hover:bg-bull-hover text-terminal-bg font-black text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(0,245,155,0.4)] flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Book Profit & Close
          </button>
          <button
            onClick={dismissTargetHit}
            className="py-2.5 px-3 rounded-xl bg-terminal-panel hover:bg-terminal-border text-terminal-muted hover:text-terminal-text font-bold text-xs transition border border-terminal-border flex items-center gap-1"
            title="Trail Stoploss to Cost Level"
          >
            <ShieldCheck className="w-4 h-4 text-accent-cyan" /> Trail SL
          </button>
        </div>
      </div>
    </div>
  );
};
