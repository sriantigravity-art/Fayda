import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { OptionStrikeData } from '../types';
import { 
  X, 
  Flame, 
  Zap, 
  Layers, 
  Target, 
  Coins, 
  Copy,
  Check
} from 'lucide-react';

interface StrikeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  strike: OptionStrikeData | null;
  symbol: string;
  spotPrice: number;
  selectedExpiry: string;
  daysToExpiry: number;
}

export const StrikeDetailModal: React.FC<StrikeDetailModalProps> = ({
  isOpen,
  onClose,
  strike,
  symbol,
  spotPrice,
  selectedExpiry,
  daysToExpiry
}) => {
  const [copied, setCopied] = React.useState(false);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !strike) return null;

  const strikePrice = strike.strikePrice;
  const isAtm = strike.isAtm;
  const distFromSpot = strikePrice - spotPrice;
  const isCallItm = spotPrice >= strikePrice;
  const isPutItm = spotPrice <= strikePrice;

  // Straddle & Combined metrics
  const combinedPremium = +(strike.callLtp + strike.putLtp).toFixed(2);
  const upperBreakeven = +(strikePrice + combinedPremium).toFixed(1);
  const lowerBreakeven = +(strikePrice - combinedPremium).toFixed(1);
  const combinedThetaDaily = +(strike.callTheta + strike.putTheta).toFixed(2);
  const strikePcr = strike.callOI > 0 ? +(strike.putOI / strike.callOI).toFixed(2) : 1.0;

  const handleCopy = () => {
    const text = `${symbol} ${strikePrice} | Expiry: ${selectedExpiry} | Spot: ${spotPrice.toFixed(2)}
CALL CE: LTP ₹${strike.callLtp} (OI: ${(strike.callOI / 100000).toFixed(2)}L, IV: ${strike.callIv || strike.iv}%, Theta: ₹${strike.callTheta}/day)
PUT PE: LTP ₹${strike.putLtp} (OI: ${(strike.putOI / 100000).toFixed(2)}L, IV: ${strike.putIv || strike.iv}%, Theta: ₹${strike.putTheta}/day)
Combined Straddle: ₹${combinedPremium} | Range: ${lowerBreakeven} - ${upperBreakeven}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBuildupBadge = (buildup: string) => {
    switch (buildup) {
      case 'LONG_BUILDUP':
        return <span className="px-2 py-0.5 rounded bg-bull/20 text-bull border border-bull/40 font-bold text-[10px]">🟢 LONG BUILDUP (Bullish)</span>;
      case 'SHORT_BUILDUP':
        return <span className="px-2 py-0.5 rounded bg-bear/20 text-bear border border-bear/40 font-bold text-[10px]">🔴 SHORT BUILDUP (Bearish)</span>;
      case 'SHORT_COVERING':
        return <span className="px-2 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 font-bold text-[10px]">⚡ SHORT COVERING</span>;
      case 'LONG_UNWINDING':
        return <span className="px-2 py-0.5 rounded bg-amber/20 text-amber border border-amber/40 font-bold text-[10px]">⚠️ LONG UNWINDING</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-terminal-panel text-terminal-muted border border-terminal-border font-bold text-[10px]">NEUTRAL</span>;
    }
  };

  const getIvColor = (iv: number) => {
    if (iv < 12.5) return 'text-bull bg-bull/15 border-bull/40';
    if (iv > 18.0) return 'text-bear bg-bear/15 border-bear/40';
    return 'text-amber bg-amber/15 border-amber/40';
  };

  return createPortal(
    <div className="fixed inset-0 z-[105000] overflow-y-auto bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 flex min-h-full items-center justify-center select-none animate-fade-in">
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl max-h-[88vh] bg-terminal-card border border-terminal-border rounded-2xl shadow-elevated flex flex-col overflow-hidden my-auto animate-scale-up font-sans text-terminal-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-terminal-border bg-terminal-panel/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="p-2 rounded-xl bg-accent-sky/15 text-accent-sky border border-accent-sky/30 shadow-subtle shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="font-bold text-sm sm:text-base text-terminal-text tracking-tight">
                  {symbol} STRIKE <span className="text-accent-sky font-mono font-bold">{strikePrice}</span>
                </h2>
                {isAtm ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber text-terminal-bg font-black text-[10px] shadow-sm flex items-center gap-1">
                    <Target className="w-3 h-3" /> ATM CENTER
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    distFromSpot > 0 ? 'bg-bear/15 text-bear border-bear/30' : 'bg-bull/15 text-bull border-bull/30'
                  }`}>
                    {distFromSpot > 0 ? `+${distFromSpot.toFixed(1)} pts OTM` : `${distFromSpot.toFixed(1)} pts ITM`}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 font-bold">
                  {selectedExpiry} ({daysToExpiry} DTE)
                </span>
              </div>
              <p className="text-[11px] text-terminal-muted mt-0.5">
                Current Underlying Spot: <strong className="text-terminal-text font-bold">₹{spotPrice.toFixed(2)}</strong> | Strike PCR: <strong className="text-amber font-bold">{strikePcr.toFixed(2)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl bg-terminal-bg border border-terminal-border text-terminal-muted hover:text-terminal-text hover:border-accent-cyan transition text-xs flex items-center gap-1.5"
              title="Copy Strike Analytics"
            >
              {copied ? <Check className="w-4 h-4 text-bull" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-terminal-bg border border-terminal-border text-terminal-muted hover:text-terminal-text hover:bg-bear/20 hover:text-bear hover:border-bear/40 transition"
              title="Close (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Top Combined Straddle / Strangle Snapshot Card */}
          <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-accent-cyan/10 via-terminal-panel to-amber/10 border border-terminal-border flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber/15 text-amber border border-amber/30">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-terminal-muted font-bold block uppercase tracking-wider">Combined Straddle Premium</span>
                <span className="text-base sm:text-lg font-black text-terminal-text">
                  ₹{combinedPremium} <span className="text-[10px] text-terminal-muted font-normal">({((combinedPremium / spotPrice) * 100).toFixed(2)}% expected move)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-right">
              <div>
                <span className="text-[10px] text-terminal-muted block">Lower Breakeven</span>
                <span className="font-bold text-bear text-xs sm:text-sm">₹{lowerBreakeven}</span>
              </div>
              <div className="h-6 w-px bg-terminal-border" />
              <div>
                <span className="text-[10px] text-terminal-muted block">Upper Breakeven</span>
                <span className="font-bold text-bull text-xs sm:text-sm">₹{upperBreakeven}</span>
              </div>
              <div className="h-6 w-px bg-terminal-border hidden xs:block" />
              <div className="hidden xs:block">
                <span className="text-[10px] text-terminal-muted block">Combined Theta</span>
                <span className="font-bold text-amber text-xs sm:text-sm">{combinedThetaDaily} ₹/day</span>
              </div>
            </div>
          </div>

          {/* Dual-Pane Grid: CALL SIDE (Left) vs PUT SIDE (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {/* 🟢 CALL (CE) SIDE BREAKDOWN */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-terminal-panel/80 border border-bull/30 space-y-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-terminal-border/60">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-bull shadow-[0_0_8px_#00F59B]" />
                  <span className="font-black text-sm text-bull tracking-wide">CALL OPTION (CE)</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${isCallItm ? 'bg-bull/20 text-bull border border-bull/40' : 'bg-terminal-bg text-terminal-muted'}`}>
                    {isCallItm ? 'ITM' : 'OTM'}
                  </span>
                </div>
                {getBuildupBadge(strike.callBuildup)}
              </div>

              {/* Price & Day Change */}
              <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                <div>
                  <span className="text-[10px] text-terminal-muted block">Call Last Traded Price (LTP)</span>
                  <span className="text-xl sm:text-2xl font-black text-terminal-text tabular-nums">
                    ₹{strike.callLtp.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-xs sm:text-sm tabular-nums block ${strike.callLtpChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {strike.callLtpChange >= 0 ? '+' : ''}{strike.callLtpChange.toFixed(2)} ({strike.callLtpPctChange >= 0 ? '+' : ''}{strike.callLtpPctChange}%)
                  </span>
                  <span className="text-[10px] text-terminal-muted">Day Net Change</span>
                </div>
              </div>

              {/* Open Interest & 1-Min Delta */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                  <span className="text-[10px] text-terminal-muted block">Open Interest (OI)</span>
                  <span className="font-black text-terminal-text text-sm">{(strike.callOI / 100000).toFixed(2)} Lakhs</span>
                  <span className="text-[9px] text-terminal-muted block mt-0.5">{strike.callOI.toLocaleString()} contracts</span>
                </div>
                <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                  <span className="text-[10px] text-terminal-muted block">1-Min ΔOI Velocity</span>
                  <span className={`font-black text-sm ${strike.callOIChange1m >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {strike.callOIChange1m >= 0 ? '+' : ''}{strike.callOIChange1m.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-terminal-muted block mt-0.5">Day: {strike.callOIChangeTotal >= 0 ? '+' : ''}{strike.callOIChangeTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Order Flow & Volume Breakdown */}
              <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-terminal-muted">Order Flow (Buyer vs Seller)</span>
                  <span className="font-bold text-terminal-text">Total Vol: {strike.callVolume.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-bull">Buyers: {strike.callBuyVolPct || 50}% ({(strike.callBuyVolume / 1000).toFixed(1)}k)</span>
                  <span className="text-bear">Sellers: {100 - (strike.callBuyVolPct || 50)}% ({(strike.callSellVolume / 1000).toFixed(1)}k)</span>
                </div>
                <div className="w-full h-2 bg-bear rounded-full overflow-hidden flex border border-terminal-border/50">
                  <div className="bg-bull h-full transition-all duration-300" style={{ width: `${strike.callBuyVolPct || 50}%` }} />
                </div>
              </div>

              {/* Implied Volatility & Theta Decay */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                  <span className="text-[10px] text-terminal-muted block">Implied Volatility (IV)</span>
                  <span className={`px-2 py-0.5 rounded-md border font-black text-xs inline-block mt-1 ${getIvColor(strike.callIv || strike.iv)}`}>
                    {(strike.callIv || strike.iv).toFixed(1)}% {strike.callIvStatus}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                  <span className="text-[10px] text-terminal-muted block">Theta Decay (Time Value)</span>
                  <span className="font-bold text-amber text-xs block mt-1">₹{strike.callTheta} / day</span>
                  <span className="text-[9px] text-terminal-muted block">₹{strike.callThetaPerHour} / hour</span>
                </div>
              </div>

              {/* Surge Rating */}
              {strike.callSurgeLevel !== 'NORMAL' && (
                <div className="p-2 rounded-xl bg-bear/15 border border-bear/40 flex items-center justify-between text-xs font-bold text-bear">
                  <span className="flex items-center gap-1"><Flame className="w-4 h-4 animate-pulse" /> {strike.callSurgeLevel} OI SURGE</span>
                  <span>Score: {strike.callSurgeScore}</span>
                </div>
              )}
            </div>

            {/* 🔴 PUT (PE) SIDE BREAKDOWN */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-terminal-panel/80 border border-bear/30 space-y-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-terminal-border/60">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-bear shadow-[0_0_8px_#FF3B69]" />
                  <span className="font-black text-sm text-bear tracking-wide">PUT OPTION (PE)</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${isPutItm ? 'bg-bear/20 text-bear border border-bear/40' : 'bg-terminal-bg text-terminal-muted'}`}>
                    {isPutItm ? 'ITM' : 'OTM'}
                  </span>
                </div>
                {getBuildupBadge(strike.putBuildup)}
              </div>

              {/* Price & Day Change */}
              <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                <div>
                  <span className="text-[10px] text-terminal-muted block">Put Last Traded Price (LTP)</span>
                  <span className="text-xl sm:text-2xl font-black text-terminal-text tabular-nums">
                    ₹{strike.putLtp.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-xs sm:text-sm tabular-nums block ${strike.putLtpChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {strike.putLtpChange >= 0 ? '+' : ''}{strike.putLtpChange.toFixed(2)} ({strike.putLtpPctChange >= 0 ? '+' : ''}{strike.putLtpPctChange}%)
                  </span>
                  <span className="text-[10px] text-terminal-muted">Day Net Change</span>
                </div>
              </div>

              {/* Open Interest & 1-Min Delta */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                  <span className="text-[10px] text-terminal-muted block">Open Interest (OI)</span>
                  <span className="font-black text-terminal-text text-sm">{(strike.putOI / 100000).toFixed(2)} Lakhs</span>
                  <span className="text-[9px] text-terminal-muted block mt-0.5">{strike.putOI.toLocaleString()} contracts</span>
                </div>
                <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                  <span className="text-[10px] text-terminal-muted block">1-Min ΔOI Velocity</span>
                  <span className={`font-black text-sm ${strike.putOIChange1m >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {strike.putOIChange1m >= 0 ? '+' : ''}{strike.putOIChange1m.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-terminal-muted block mt-0.5">Day: {strike.putOIChangeTotal >= 0 ? '+' : ''}{strike.putOIChangeTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Order Flow & Volume Breakdown */}
              <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-terminal-muted">Order Flow (Buyer vs Seller)</span>
                  <span className="font-bold text-terminal-text">Total Vol: {strike.putVolume.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-bull">Buyers: {strike.putBuyVolPct || 50}% ({(strike.putBuyVolume / 1000).toFixed(1)}k)</span>
                  <span className="text-bear">Sellers: {100 - (strike.putBuyVolPct || 50)}% ({(strike.putSellVolume / 1000).toFixed(1)}k)</span>
                </div>
                <div className="w-full h-2 bg-bear rounded-full overflow-hidden flex border border-terminal-border/50">
                  <div className="bg-bull h-full transition-all duration-300" style={{ width: `${strike.putBuyVolPct || 50}%` }} />
                </div>
              </div>

              {/* Implied Volatility & Theta Decay */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                  <span className="text-[10px] text-terminal-muted block">Implied Volatility (IV)</span>
                  <span className={`px-2 py-0.5 rounded-md border font-black text-xs inline-block mt-1 ${getIvColor(strike.putIv || strike.iv)}`}>
                    {(strike.putIv || strike.iv).toFixed(1)}% {strike.putIvStatus}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-terminal-bg border border-terminal-border/60">
                  <span className="text-[10px] text-terminal-muted block">Theta Decay (Time Value)</span>
                  <span className="font-bold text-amber text-xs block mt-1">₹{strike.putTheta} / day</span>
                  <span className="text-[9px] text-terminal-muted block">₹{strike.putThetaPerHour} / hour</span>
                </div>
              </div>

              {/* Surge Rating */}
              {strike.putSurgeLevel !== 'NORMAL' && (
                <div className="p-2 rounded-xl bg-bear/15 border border-bear/40 flex items-center justify-between text-xs font-bold text-bear">
                  <span className="flex items-center gap-1"><Flame className="w-4 h-4 animate-pulse" /> {strike.putSurgeLevel} OI SURGE</span>
                  <span>Score: {strike.putSurgeScore}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-terminal-border bg-terminal-panel/60 flex items-center justify-between text-xs text-terminal-muted shrink-0">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Click any other strike on heatmap to inspect</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-accent-sky/15 hover:bg-accent-sky/25 border border-accent-sky/40 text-accent-sky font-bold transition text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
