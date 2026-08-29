import React, { useEffect, useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  AlertTriangle, 
  X, 
  ShieldAlert, 
  Clock
} from 'lucide-react';

export const SquareOffAlertBanner: React.FC = () => {
  const { latestSquareOffAlert, dismissSquareOffAlert } = useMarket();
  const [progress, setProgress] = useState(100);
  const [secondsRemaining, setSecondsRemaining] = useState(12);
  const dismissRef = React.useRef(dismissSquareOffAlert);
  dismissRef.current = dismissSquareOffAlert;

  const alertId = latestSquareOffAlert?.id;

  useEffect(() => {
    if (!alertId) {
      setProgress(100);
      setSecondsRemaining(12);
      return;
    }

    setProgress(100);
    setSecondsRemaining(12);
    const durationMs = 12000; // 12 seconds auto-dismiss
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
  }, [alertId]);

  if (!latestSquareOffAlert) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[95%] animate-in fade-in slide-in-from-top-4 duration-300 font-mono select-none">
      <div className="bg-terminal-card/95 backdrop-blur-xl border-2 border-bear rounded-2xl p-4 sm:p-5 shadow-[0_0_50px_rgba(255,59,105,0.4)] relative overflow-hidden text-terminal-text">
        {/* Countdown Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-terminal-bg">
          <div
            className="h-full bg-bear transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,59,105,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header Alert Line */}
        <div className="flex items-center justify-between mt-1 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-bear text-white shadow-[0_0_15px_rgba(255,59,105,0.9)] animate-pulse">
              <AlertTriangle className="w-4 h-4 mr-1 text-white animate-bounce" /> 🚨 EMERGENCY SQUARE OFF
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-bear/20 text-bear border border-bear/40 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {latestSquareOffAlert.timeFormatted} IST
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-terminal-panel text-bear border border-bear/40 font-bold text-[10px]">
              {secondsRemaining}s
            </span>
            <button
              onClick={dismissSquareOffAlert}
              className="p-1 rounded-lg bg-terminal-panel hover:bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border transition"
              title="Dismiss Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message & Reversal Details */}
        <div className="bg-terminal-panel/80 border border-bear/40 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-black text-sm sm:text-base text-terminal-text tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-bear" />
              {latestSquareOffAlert.symbol} ({latestSquareOffAlert.action})
            </span>
            <span className="text-xs font-bold text-bear bg-bear/20 px-2 py-0.5 rounded border border-bear/40 animate-pulse">
              STOPLOSS HIT
            </span>
          </div>
          <p className="text-xs text-bear/90 font-medium leading-relaxed">
            {latestSquareOffAlert.reason}
          </p>
        </div>

        {/* Loss Capping Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
          <div className="bg-terminal-panel p-2 rounded-lg border border-terminal-border">
            <span className="text-[9px] text-terminal-muted block uppercase">Entry Price</span>
            <span className="font-bold text-terminal-text mt-0.5 block">₹{latestSquareOffAlert.entryPrice.toFixed(2)}</span>
          </div>
          <div className="bg-black/40 p-2 rounded-lg border border-white/10">
            <span className="text-[9px] text-terminal-muted block uppercase">SL Level</span>
            <span className="font-bold text-amber mt-0.5 block">₹{latestSquareOffAlert.stoplossPrice.toFixed(2)}</span>
          </div>
          <div className="bg-bear/20 p-2 rounded-lg border border-bear/50">
            <span className="text-[9px] text-bear block uppercase font-bold">Exit LTP (Loss Capped)</span>
            <span className="font-black text-bear mt-0.5 block">₹{latestSquareOffAlert.currentLtp.toFixed(2)} (-{latestSquareOffAlert.lossPoints} pts)</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={dismissSquareOffAlert}
            className="flex-1 py-2.5 px-4 rounded-xl bg-bear hover:bg-bear-hover text-white font-black text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(255,59,105,0.7)] flex items-center justify-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" /> Square Off Position & Cut Loss
          </button>
        </div>
      </div>
    </div>
  );
};
