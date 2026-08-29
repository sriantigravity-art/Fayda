import React, { useEffect, useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  Flame, 
  Zap, 
  X, 
  Sparkles, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  Activity
} from 'lucide-react';

export const HeroZeroFlashModal: React.FC = () => {
  const { latestHeroZeroFlash, dismissHeroZeroFlash } = useMarket();
  const [progress, setProgress] = useState(100);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const dismissRef = React.useRef(dismissHeroZeroFlash);
  dismissRef.current = dismissHeroZeroFlash;

  const flashId = latestHeroZeroFlash?.id;

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
      setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));

      if (elapsed >= durationMs) {
        clearInterval(interval);
        dismissRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [flashId]);

  if (!latestHeroZeroFlash) return null;

  const isCall = latestHeroZeroFlash.optionType === 'CE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-lg bg-terminal-card border-2 border-purple-500/80 rounded-3xl p-5 sm:p-6 shadow-[0_0_80px_rgba(168,85,247,0.4)] overflow-hidden font-mono text-terminal-text">
        {/* Top 10-Second Auto-dismiss Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-terminal-bg">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Ambient Glow Orbs */}
        <div className="absolute -top-20 -right-20 w-52 h-52 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Ribbon */}
        <div className="flex items-center justify-between mt-1 mb-3.5">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-black bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.8)] animate-pulse">
              <Flame className="w-4 h-4 mr-1 text-amber" /> ⚡ 0DTE HERO-OR-ZERO FLASH!
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber" /> GAMMA EXPLOSION
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black text-[10px]">
              {secondsRemaining}s
            </span>
            <button
              onClick={dismissHeroZeroFlash}
              className="p-1.5 rounded-lg bg-terminal-panel hover:bg-terminal-border text-terminal-muted hover:text-terminal-text transition"
              title="Close Flash Screen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Contract Card */}
        <div className="bg-terminal-panel/90 border border-terminal-border rounded-2xl p-4 mb-3.5 text-center relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-black uppercase flex items-center gap-1 ${
              isCall ? 'bg-bull/20 text-bull border border-bull/40' : 'bg-bear/20 text-bear border border-bear/40'
            }`}>
              {isCall ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isCall ? 'BUY CALL (CE)' : 'BUY PUT (PE)'}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-black bg-purple-500/25 text-purple-200 border border-purple-500/50">
              Γ SCORE {latestHeroZeroFlash.gammaScore}/100
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-terminal-text tracking-wide drop-shadow-[0_0_15px_rgba(168,85,247,0.4)] my-1">
            🎯 {latestHeroZeroFlash.contractSymbol}
          </h3>

          <div className="text-xs text-amber font-bold flex items-center justify-center gap-2">
            <span>LIVE PREMIUM: ₹{latestHeroZeroFlash.ltp.toFixed(2)}</span>
            <span>•</span>
            <span className="text-accent-cyan">Vol Velocity: {latestHeroZeroFlash.volumeVelocity}x</span>
          </div>
        </div>

        {/* Entry & Defined Stoploss */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-center text-xs">
          <div className="bg-accent-cyan/10 p-2.5 rounded-xl border border-accent-cyan/40">
            <span className="text-accent-cyan block text-[9px] font-bold uppercase">CHEAP ENTRY ZONE</span>
            <span className="font-black text-terminal-text text-sm sm:text-base mt-0.5 block">{latestHeroZeroFlash.entryZone}</span>
          </div>

          <div className="bg-bear/15 p-2.5 rounded-xl border border-bear/40">
            <span className="text-bear block text-[9px] font-bold uppercase flex items-center justify-center gap-1">
              <ShieldAlert className="w-3 h-3" /> DEFINED MAX RISK (SL)
            </span>
            <span className="font-black text-bear text-sm sm:text-base mt-0.5 block">
              ₹{latestHeroZeroFlash.stoploss} (-{latestHeroZeroFlash.stoplossPct}%)
            </span>
          </div>
        </div>

        {/* 3-Tier Multiplier Matrix */}
        <div className="bg-terminal-panel/60 border border-terminal-border/90 rounded-xl p-2.5 mb-3">
          <span className="text-[9px] text-terminal-muted block font-bold uppercase mb-1.5 flex items-center justify-between">
            <span className="text-amber flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber" /> EXPLOSIVE MULTIPLIER TARGETS
            </span>
            <span className="text-purple-300 font-bold">R:R {latestHeroZeroFlash.riskReward}</span>
          </span>

          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2 rounded-lg bg-bull/15 border border-bull/40">
              <span className="text-bull text-[9px] font-bold block uppercase">2x TARGET</span>
              <span className="font-black text-sm sm:text-base text-bull">₹{latestHeroZeroFlash.target1x}</span>
              <span className="text-[8px] text-bull/80 block">+100% ROI</span>
            </div>

            <div className="p-2 rounded-lg bg-amber/20 border border-amber/50 shadow-md">
              <span className="text-amber text-[9px] font-bold block uppercase">3.5x TARGET</span>
              <span className="font-black text-sm sm:text-base text-amber">₹{latestHeroZeroFlash.target3x}</span>
              <span className="text-[8px] text-amber/80 block">+250% ROI</span>
            </div>

            <div className="p-2 rounded-lg bg-purple-500/25 border border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse">
              <span className="text-purple-300 text-[9px] font-black block uppercase">5x HERO RUN</span>
              <span className="font-black text-sm sm:text-base text-purple-200">₹{latestHeroZeroFlash.target5x}</span>
              <span className="text-[8px] text-purple-300/80 block">+400% ROI</span>
            </div>
          </div>
        </div>

        {/* Spot Requirement & Squeeze Rationale */}
        <div className="bg-terminal-bg/80 border border-terminal-border/80 rounded-xl p-2.5 text-[11px] mb-3">
          <div className="flex items-center justify-between text-terminal-muted mb-1 pb-1 border-b border-terminal-border/50">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-accent-cyan" />
              <span>Required Spot Breakout:</span>
            </span>
            <strong className="text-accent-cyan font-black">~{latestHeroZeroFlash.requiredSpotMovePts} Points Move</strong>
          </div>
          <p className="text-[10px] text-terminal-text leading-relaxed mt-1">
            💡 {latestHeroZeroFlash.rationale}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between text-[10px] text-terminal-muted pt-1">
          <span className="flex items-center gap-1 text-purple-400 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>0DTE Expiry Engine Verified</span>
          </span>
          <button
            type="button"
            onClick={dismissHeroZeroFlash}
            className="px-4 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/50 font-bold transition"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
