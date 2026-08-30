import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { calculateDynamicTarget } from '../utils/tradeHorizon';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Target, 
  ShieldAlert, 
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Layers,
  Activity,
  Sliders
} from 'lucide-react';
import { ALL_SYMBOLS_CONFIG } from '../types';

export const TradeGuidanceCard: React.FC = () => {
  const { currentIndexState, selectedIndex } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [activeSetupForCalc, setActiveSetupForCalc] = useState<{ ltp: number; sl: number; target: number }>({
    ltp: 100,
    sl: 80,
    target: 140
  });

  if (!currentIndexState) return null;

  const { recommendedTrades, spotPrice, atmStrike, resistanceLevels, supportLevels, strikes, masterConfluence } = currentIndexState;
  const mc = masterConfluence;

  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
  const isIndex = cfg ? cfg.isIndex : true;

  const r1 = resistanceLevels.find(r => Math.abs(r.strikePrice - atmStrike) <= 400);
  const s1 = supportLevels.find(s => Math.abs(s.strikePrice - atmStrike) <= 400);

  // Helper to generate reference levels for EOD / Key Walls within ±400 pts
  const getEODReferenceSetup = (type: 'BULLISH' | 'BEARISH') => {
    const isBull = type === 'BULLISH';
    const targetStrikePrice = isBull 
      ? (r1 ? r1.strikePrice : Math.min(atmStrike + 400, atmStrike + (selectedIndex === 'BANKNIFTY' || selectedIndex === 'SENSEX' ? 200 : 100)))
      : (s1 ? s1.strikePrice : Math.max(atmStrike - 400, atmStrike - (selectedIndex === 'BANKNIFTY' || selectedIndex === 'SENSEX' ? 200 : 100)));
    
    const optType = isBull ? 'CE' : 'PE';
    const strikeObj = strikes.find(s => s.strikePrice === targetStrikePrice);
    const ltp = strikeObj ? (isBull ? strikeObj.callLtp : strikeObj.putLtp) : 120;
    const cleanLtp = Math.max(10, ltp);

    const dyn = calculateDynamicTarget(cleanLtp, targetStrikePrice, atmStrike);

    return {
      symbol: `${selectedIndex} ${targetStrikePrice} ${optType}`,
      strike: targetStrikePrice,
      type: optType,
      ltp: cleanLtp,
      recommendedEntry: `₹${cleanLtp.toFixed(2)} - ₹${(cleanLtp * 1.02).toFixed(2)}`,
      stoploss: `₹${dyn.slPrice.toFixed(2)} (-${dyn.slPct}%)`,
      target: `₹${dyn.targetPrice.toFixed(2)} (+${dyn.targetPct}%)`,
      riskReward: dyn.riskReward,
      iv: strikeObj ? (isBull ? strikeObj.callIv : strikeObj.putIv) : 13.5,
      delta: strikeObj ? (isBull ? strikeObj.callDelta : strikeObj.putDelta) : 0.50,
      gamma: strikeObj ? strikeObj.callGamma : 0.002,
      theta: strikeObj ? strikeObj.callTheta : -8.5,
      actionTitle: isBull ? `Call Wall Resistance: ${targetStrikePrice} CE` : `Put Floor Support: ${targetStrikePrice} PE`,
      actionDescription: isBull
        ? `Major resistance at ${targetStrikePrice} with ${r1 ? r1.oiFormatted : 'heavy'} Calls. Upside target on breakout above ₹${cleanLtp.toFixed(1)}.`
        : `Strong institutional support floor at ${targetStrikePrice} with ${s1 ? s1.oiFormatted : 'heavy'} Puts. Downside trigger on breakdown below ₹${cleanLtp.toFixed(1)}.`
    };
  };

  const primaryBias = mc?.primaryBias || (currentIndexState.pcr.atmPlusMinus5Pcr >= 1.05 ? 'BUY CALL' : currentIndexState.pcr.atmPlusMinus5Pcr <= 0.90 ? 'BUY PUT' : 'NO TRADE');
  const setupGrade = mc?.setupGrade || 'B';
  const confidenceScore = mc?.totalScore || 70;

  const activeSetup = primaryBias === 'BUY CALL' ? getEODReferenceSetup('BULLISH') : getEODReferenceSetup('BEARISH');

  const openRiskCalculatorForSetup = (setup: { ltp: number }) => {
    const dyn = calculateDynamicTarget(setup.ltp, atmStrike, atmStrike);
    setActiveSetupForCalc({
      ltp: setup.ltp,
      sl: dyn.slPrice,
      target: dyn.targetPrice
    });
    setIsRiskModalOpen(true);
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl shadow-subtle flex flex-col overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-terminal-border bg-terminal-panel/40 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-accent-sky/15 text-accent-sky">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs sm:text-sm font-bold text-terminal-text">
                Trade Guidance & Market Regime
              </h2>
              <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full font-bold border ${
                primaryBias === 'BUY CALL'
                  ? 'bg-bull/15 text-bull border-bull/30'
                  : primaryBias === 'BUY PUT'
                    ? 'bg-bear/15 text-bear border-bear/30'
                    : 'bg-terminal-elevated text-terminal-muted border-terminal-border'
              }`}>
                {primaryBias}
              </span>
            </div>
            <span className="text-[11px] text-terminal-muted hidden sm:block">
              Multi-factor algorithm evaluating OI momentum, Greeks, and structural support/resistance
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Grade Badge */}
          <div className="hidden sm:flex items-center px-2 py-1 rounded-lg bg-terminal-panel border border-terminal-border text-xs">
            <span className="text-terminal-muted mr-1.5 font-medium">Grade:</span>
            <span className="font-mono font-bold text-accent-sky">{setupGrade} ({confidenceScore}%)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* ========================================================================= */}
          {/* LEVEL 1 DECISION BANNER (BUY CALL / BUY PUT / NO TRADE / WAIT / HEDGE) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* Primary Signal Summary Card */}
            <div className={`lg:col-span-4 p-3.5 rounded-xl border flex flex-col justify-between ${
              primaryBias === 'BUY CALL'
                ? 'bg-bull/5 border-bull/30'
                : primaryBias === 'BUY PUT'
                  ? 'bg-bear/5 border-bear/30'
                  : 'bg-terminal-panel/60 border-terminal-border'
            }`}>
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-terminal-muted uppercase tracking-wider block">
                  Algorithmic Setup
                </span>
                <div className="flex items-center space-x-2">
                  {primaryBias === 'BUY CALL' ? (
                    <ArrowUpRight className="w-5 h-5 text-bull" />
                  ) : primaryBias === 'BUY PUT' ? (
                    <ArrowDownRight className="w-5 h-5 text-bear" />
                  ) : (
                    <Activity className="w-5 h-5 text-terminal-muted" />
                  )}
                  <span className={`text-base font-bold tracking-tight ${
                    primaryBias === 'BUY CALL' ? 'text-bull' : primaryBias === 'BUY PUT' ? 'text-bear' : 'text-terminal-text'
                  }`}>
                    {activeSetup.symbol}
                  </span>
                </div>
                <p className="text-xs text-terminal-muted leading-relaxed">
                  {activeSetup.actionDescription}
                </p>
              </div>

              <div className="pt-3 border-t border-terminal-border/60 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-terminal-text">
                  LTP: ₹{activeSetup.ltp.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => openRiskCalculatorForSetup(activeSetup)}
                  className="px-2.5 py-1 rounded-lg bg-accent-sky/15 border border-accent-sky/40 hover:bg-accent-sky/25 text-accent-sky font-sans text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Size Lots</span>
                </button>
              </div>
            </div>

            {/* Key Metric Levels Grid */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
              <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1">
                <span className="text-[10px] text-terminal-muted font-sans font-medium uppercase tracking-wider block">
                  Entry Zone
                </span>
                <span className="text-sm font-bold text-terminal-text tabular-nums block">
                  {activeSetup.recommendedEntry}
                </span>
                <span className="text-[10px] text-terminal-muted font-sans">Market execution</span>
              </div>

              <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1">
                <span className="text-[10px] text-bear font-sans font-medium uppercase tracking-wider block">
                  Stop Loss (SL)
                </span>
                <span className="text-sm font-bold text-bear tabular-nums block">
                  {activeSetup.stoploss}
                </span>
                <span className="text-[10px] text-terminal-muted font-sans">Hard invalidation</span>
              </div>

              <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1">
                <span className="text-[10px] text-bull font-sans font-medium uppercase tracking-wider block">
                  Target (T1)
                </span>
                <span className="text-sm font-bold text-bull tabular-nums block">
                  {activeSetup.target}
                </span>
                <span className="text-[10px] text-terminal-muted font-sans">Primary resistance</span>
              </div>

              <div className="p-3 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-1">
                <span className="text-[10px] text-terminal-muted font-sans font-medium uppercase tracking-wider block">
                  Risk : Reward
                </span>
                <span className="text-sm font-bold text-accent-sky tabular-nums block">
                  {activeSetup.riskReward}
                </span>
                <span className="text-[10px] text-terminal-muted font-sans">Favorable asymmetry</span>
              </div>
            </div>
          </div>

          {/* Expert Greeks Matrix (When Expert Mode Active) */}
          {isExpert && (
            <div className="p-3 rounded-xl bg-terminal-panel/40 border border-terminal-border font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-terminal-border/60 pb-1.5">
                <span className="text-[10px] text-accent-purple font-sans font-bold uppercase tracking-wider">
                  Expert Greek Matrix & Sensitivity
                </span>
                <span className="text-[10px] text-terminal-muted font-sans">ATM ± 1 Delta Profile</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>Delta: <strong className="text-terminal-text">{activeSetup.delta.toFixed(2)}</strong></div>
                <div>Gamma: <strong className="text-terminal-text">{activeSetup.gamma.toFixed(4)}</strong></div>
                <div>Theta: <strong className="text-bear">{activeSetup.theta.toFixed(1)}/day</strong></div>
                <div>IV: <strong className="text-amber">{activeSetup.iv.toFixed(1)}%</strong></div>
              </div>
            </div>
          )}

          {/* Regulatory Non-Advisory Notice */}
          <div className="p-2.5 rounded-lg bg-terminal-panel/30 border border-terminal-border text-[11px] font-sans text-terminal-muted flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
            <span>
              <strong>Regulatory Notice:</strong> Analytical setups and scenarios are mathematically derived for decision support only. Trading derivatives involves significant capital risk. Always maintain strict position sizing.
            </span>
          </div>
        </div>
      )}

      {/* Risk Calculator Modal */}
      <RiskCalculatorModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        defaultLtp={activeSetupForCalc.ltp}
        defaultSl={activeSetupForCalc.sl}
        defaultTarget={activeSetupForCalc.target}
      />
    </div>
  );
};
