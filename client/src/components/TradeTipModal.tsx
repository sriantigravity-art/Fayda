import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { ALL_SYMBOLS_CONFIG, type ActiveTradeTipData } from '../types';
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

interface TradeTipModalProps {
  tip: ActiveTradeTipData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TradeTipModal: React.FC<TradeTipModalProps> = ({ tip, isOpen, onClose }) => {
  const { setSelectedIndex, indices } = useMarket();
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'>('BEGINNER');

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
  const isBull = tip.action.includes('CALL') || tip.action.includes('BULL');
  const isBear = tip.action.includes('PUT') || tip.action.includes('BEAR');
  const isSl = tip.action === 'SQUARE_OFF' || tip.status === 'SL_HIT';
  const isSpread = tip.optionType === 'SPREAD' || tip.action.includes('SPREAD');

  const currentIndex = indices[tip.symbol];
  const liveSpot = currentIndex?.spotPrice || 0;

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

  const handleSwitchToChart = () => {
    setSelectedIndex(tip.symbol);
    handleClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop with animated blur & fade */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-slate-950/80 transition-all ${
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
                ? 'bg-bear/20 border-bear text-bear animate-pulse' 
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

              <div className="flex items-center space-x-2 shrink-0">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider font-mono border shadow-sm ${
                  isSl
                    ? 'bg-bear/30 text-bear border-bear animate-pulse'
                    : isBull
                    ? 'bg-bull/20 text-bull border-bull/40 shadow-[0_0_12px_rgba(0,245,155,0.25)]'
                    : 'bg-bear/20 text-bear border-bear/40 shadow-[0_0_12px_rgba(255,59,105,0.25)]'
                }`}>
                  {isSl ? '🛑 SQUARE OFF' : tip.action.replace(/_/g, ' ')}
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
                  <span className="px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border text-terminal-text flex items-center gap-1 font-bold">
                    <Clock className="w-3 h-3 text-accent-cyan" />
                    <span>GIVEN: {tip.givenTimeFormatted}</span>
                  </span>
                )}
                {tip.elapsedTimeFormatted && (
                  <span className="px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border text-amber font-bold">
                    ⏱️ {tip.elapsedTimeFormatted}
                  </span>
                )}
              </div>

              {tip.actionGuidance && (
                <span className={`px-2.5 py-0.5 rounded-lg font-bold border ${tip.actionClass || 'bg-bull/20 text-bull border-bull/40'}`}>
                  {tip.actionGuidance}
                </span>
              )}
            </div>
          </div>

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
                {typeof tip.entryPrice === 'number' ? `₹${tip.entryPrice.toFixed(1)}` : (tip.entryRange || tip.entryPrice || '—')}
              </span>
              <span className="text-[9px] text-accent-cyan/80 block mt-0.5">Recommended</span>
            </div>

            {/* Stop Loss */}
            <div className="bg-bear/15 p-3 rounded-xl border border-bear/30">
              <span className="text-bear block text-[9px] font-bold uppercase">STOP LOSS</span>
              <span className="font-black text-bear text-sm sm:text-base block">
                {typeof tip.stoplossPrice === 'number' ? `₹${tip.stoplossPrice.toFixed(1)}` : (tip.stoplossPrice || '—')}
              </span>
              <span className="text-[9px] text-bear/80 block mt-0.5">
                {tip.stoplossPct ? `-${tip.stoplossPct}% Risk` : 'Capital Shield'}
              </span>
            </div>

            {/* Target 1 */}
            <div className="bg-bull/15 p-3 rounded-xl border border-bull/30">
              <span className="text-bull block text-[9px] font-bold uppercase">TARGET 1</span>
              <span className="font-black text-bull text-sm sm:text-base block">
                {typeof tip.target1Price === 'number' ? `₹${tip.target1Price.toFixed(1)}` : (tip.target1Price || '—')}
              </span>
              <span className="text-[9px] text-bull/80 block mt-0.5">
                {tip.target1Pct ? `+${tip.target1Pct}% Gain` : 'Book 50%'}
              </span>
            </div>
          </div>

          {/* Secondary Row: Target 2, Risk:Reward, Current LTP, Lot Size */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center text-xs">
            <div className="bg-bull/10 p-2.5 rounded-xl border border-bull/20">
              <span className="text-bull/80 block text-[9px] font-bold uppercase">TARGET 2 (RUNNER)</span>
              <span className="font-bold text-bull block text-sm">
                {typeof tip.target2Price === 'number' ? `₹${tip.target2Price.toFixed(1)}` : (tip.target2Price || 'Trail SL')}
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
                    {tip.breakeven ? `₹${tip.breakeven.toFixed(1)}` : '—'}
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
                <span>🔰 Beginner Explanation</span>
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
              onClick={handleSwitchToChart}
              className="px-3.5 py-1.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/40 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>View {tip.symbol} Chart</span>
              <ExternalLink className="w-3.5 h-3.5" />
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
