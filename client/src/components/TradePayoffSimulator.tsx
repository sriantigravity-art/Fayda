import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  ShieldAlert, 
  Target, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ExternalLink,
  Flame,
  Info,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useTerminalMode } from '../context/TerminalModeContext';
import type { SurgeEvent } from '../types';

export interface TradePayoffSimulatorProps {
  contractSymbol: string;
  entryPrice: number;
  currentLtp: number;
  target1Price: number;
  target1Pct: number;
  target2Price?: number;
  target2Pct?: number;
  stoplossPrice: number;
  stoplossPct: number;
  lotSize: number;
  role: 'BUYER' | 'SELLER';
  executionType: 'NET_DEBIT' | 'NET_CREDIT';
  optionType: 'CE' | 'PE' | 'SPREAD';
  strikePrice?: number;
  marginRequiredRupees?: number;
  maxProfitRupees?: number;
  maxLossRupees?: number;
  probabilityOfProfitPct?: number;
  legsSummary?: string;
  confluenceScore?: number;
  strategyTag?: string;
  matchingSurge?: SurgeEvent;
  onOpenSurge?: () => void;
}

export const TradePayoffSimulator: React.FC<TradePayoffSimulatorProps> = ({
  contractSymbol,
  entryPrice,
  currentLtp,
  target1Price,
  target1Pct,
  target2Price,
  target2Pct,
  stoplossPrice,
  stoplossPct,
  lotSize,
  role,
  executionType,
  optionType,
  strikePrice,
  marginRequiredRupees = 42000,
  maxProfitRupees,
  maxLossRupees,
  probabilityOfProfitPct = 78,
  legsSummary,
  confluenceScore = 88,
  strategyTag,
  matchingSurge,
  onOpenSurge
}) => {
  const { isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [selectedLots, setSelectedLots] = useState<number>(1);
  const [customLots, setCustomLots] = useState<string>('1');
  const [isCustomLot, setIsCustomLot] = useState<boolean>(false);

  const effectiveLots = isCustomLot ? Math.max(1, parseInt(customLots) || 1) : selectedLots;
  const quantity = effectiveLots * lotSize;

  const isSeller = role === 'SELLER' || executionType === 'NET_CREDIT';
  const isCall = optionType === 'CE';

  // Calculations
  const metrics = useMemo(() => {
    if (isSeller) {
      // Option Seller (Credit Spread)
      const baseCreditPerLot = maxProfitRupees || Math.round(entryPrice * lotSize);
      const baseLossPerLot = maxLossRupees || Math.round(stoplossPrice * lotSize);
      const totalCredit = baseCreditPerLot * effectiveLots;
      const totalMaxLoss = baseLossPerLot * effectiveLots;
      const totalMargin = marginRequiredRupees * effectiveLots;
      const grossNakedMargin = 118000 * effectiveLots;
      const marginSaved = grossNakedMargin - totalMargin;
      const marginReductionPct = Math.round((marginSaved / grossNakedMargin) * 100);
      const rocPct = totalMargin > 0 ? ((totalCredit / totalMargin) * 100).toFixed(1) : '0';

      return {
        isSeller: true,
        capitalRequired: totalMargin,
        target1Pnl: totalCredit,
        target1Pct: 100, // full credit capture
        target2Pnl: totalCredit,
        target2Pct: 100,
        stoplossPnl: -totalMaxLoss,
        stoplossPct: Math.round((totalMaxLoss / totalMargin) * 100),
        grossMargin: grossNakedMargin,
        marginSaved,
        marginReductionPct,
        rocPct,
        thetaDecayDaily: Math.round(totalCredit * 0.15)
      };
    } else {
      // Option Buyer (Net Debit)
      const capitalOutlay = Math.round(entryPrice * quantity);
      const target1Gain = Math.round((target1Price - entryPrice) * quantity);
      const t2Price = target2Price || +(entryPrice * 1.5).toFixed(1);
      const target2Gain = Math.round((t2Price - entryPrice) * quantity);
      const stoplossRisk = Math.round((entryPrice - stoplossPrice) * quantity);
      const thetaDecayDaily = Math.round(quantity * (entryPrice * 0.08));

      return {
        isSeller: false,
        capitalRequired: capitalOutlay,
        target1Pnl: target1Gain,
        target1Pct,
        target2Pnl: target2Gain,
        target2Pct: target2Pct || 50,
        stoplossPnl: -stoplossRisk,
        stoplossPct,
        grossMargin: capitalOutlay,
        marginSaved: 0,
        marginReductionPct: 0,
        rocPct: capitalOutlay > 0 ? ((target1Gain / capitalOutlay) * 100).toFixed(1) : '0',
        thetaDecayDaily
      };
    }
  }, [
    isSeller,
    entryPrice,
    target1Price,
    target1Pct,
    target2Price,
    target2Pct,
    stoplossPrice,
    stoplossPct,
    quantity,
    effectiveLots,
    lotSize,
    marginRequiredRupees,
    maxProfitRupees,
    maxLossRupees
  ]);

  const [simulatedShift, setSimulatedShift] = useState<number>(0);

  // 2D SVG Payoff Curve Coordinates calculation
  const curvePoints = useMemo(() => {
    const points: { x: number; y: number; pnl: number }[] = [];
    const steps = 30;
    const range = 150;
    
    const basePnlMax = metrics.target1Pnl * 1.3 || 10000;
    const baseLossMax = Math.abs(metrics.stoplossPnl) || 5000;

    for (let i = 0; i <= steps; i++) {
      const shift = -range + (i / steps) * (range * 2);
      const svgX = (i / steps) * 600;

      let pnl = 0;
      if (isSeller) {
        const delta = isCall ? -0.45 : 0.45;
        pnl = Math.min(metrics.target1Pnl, Math.max(metrics.stoplossPnl, metrics.target1Pnl + shift * delta * quantity * 0.15));
      } else {
        const delta = isCall ? 0.65 : -0.65;
        pnl = Math.max(metrics.stoplossPnl, shift * delta * (quantity * 0.4));
      }

      let svgY = 70;
      if (pnl >= 0) {
        svgY = 70 - Math.min(55, (pnl / (basePnlMax || 1)) * 55);
      } else {
        svgY = 70 + Math.min(55, (Math.abs(pnl) / (baseLossMax || 1)) * 55);
      }

      points.push({ x: svgX, y: svgY, pnl });
    }

    const svgPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    const profitPts = points.filter(p => p.y <= 70);
    const profitPolygon = profitPts.length > 1
      ? `${profitPts[0].x},70 ` + profitPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ` ${profitPts[profitPts.length - 1].x},70`
      : '0,70 0,70';

    const lossPts = points.filter(p => p.y >= 70);
    const lossPolygon = lossPts.length > 1
      ? `${lossPts[0].x},70 ` + lossPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ` ${lossPts[lossPts.length - 1].x},70`
      : '0,70 0,70';

    return { svgPath, profitPolygon, lossPolygon };
  }, [metrics, isSeller, isCall, quantity]);

  // Simulated Outcome at current simulatedShift
  const simulatedOutcome = useMemo(() => {
    let pnl = 0;
    if (isSeller) {
      const delta = isCall ? -0.45 : 0.45;
      pnl = Math.min(metrics.target1Pnl, Math.max(metrics.stoplossPnl, metrics.target1Pnl + simulatedShift * delta * quantity * 0.15));
    } else {
      const delta = isCall ? 0.65 : -0.65;
      pnl = Math.max(metrics.stoplossPnl, simulatedShift * delta * (quantity * 0.4));
    }
    const pct = metrics.capitalRequired > 0 ? +((pnl / metrics.capitalRequired) * 100).toFixed(1) : 0;
    return { pnl, pct };
  }, [simulatedShift, metrics, isSeller, isCall, quantity]);

  // Cursor coordinates on SVG canvas (600x140)
  const cursorCoords = useMemo(() => {
    const x = Math.max(10, Math.min(590, ((simulatedShift + 150) / 300) * 600));
    const basePnlMax = metrics.target1Pnl * 1.3 || 10000;
    const baseLossMax = Math.abs(metrics.stoplossPnl) || 5000;
    let y = 70;
    if (simulatedOutcome.pnl >= 0) {
      y = 70 - Math.min(55, (simulatedOutcome.pnl / (basePnlMax || 1)) * 55);
    } else {
      y = 70 + Math.min(55, (Math.abs(simulatedOutcome.pnl) / (baseLossMax || 1)) * 55);
    }
    return { x, y };
  }, [simulatedShift, simulatedOutcome, metrics]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-3 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          SECTION HEADER: LOT SIZER & PAYOFF CONTROLS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-accent-gold border border-amber-500/30 shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
              <span>Payoff & Projected P&L Simulator</span>
              <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-accent-gold border border-amber-500/20">
                Sensibull™ Architecture
              </span>
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Live simulation for {contractSymbol} • {effectiveLots} Lot{effectiveLots > 1 ? 's' : ''} ({quantity} Qty)
            </span>
          </div>
        </div>

        {/* Dynamic Lot Selector (For Intermediate & Expert) */}
        {!isBeginner && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase mr-1">
              Select Lots:
            </span>
            {[1, 2, 5, 10].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setIsCustomLot(false);
                  setSelectedLots(l);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  !isCustomLot && selectedLots === l
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
              >
                {l}L
              </button>
            ))}

            {isExpert && (
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customLots}
                  onChange={(e) => {
                    setIsCustomLot(true);
                    setCustomLots(e.target.value);
                  }}
                  className="w-12 px-1.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Lots"
                  title="Custom lot count"
                />
                <span className="text-[10px] font-mono text-slate-400">Lots</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. BEGINNER VIEW: SIMPLIFIED, REASSURING & PLAIN-ENGLISH
         ───────────────────────────────────────────────────────────── */}
      {isBeginner && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Required Capital */}
            <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold">
                1 Lot Capital Required
              </span>
              <span className="text-base font-mono font-black text-slate-900 dark:text-white mt-1">
                ₹{metrics.capitalRequired.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                {isSeller ? 'Hedged Margin Block' : `Exact entry cost for ${lotSize} shares`}
              </span>
            </div>

            {/* 2. Expected Target Gain */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 uppercase font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Profit at Target 1</span>
              </span>
              <span className="text-base font-mono font-black text-emerald-700 dark:text-emerald-400 mt-1">
                +₹{metrics.target1Pnl.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400/80 font-mono mt-0.5">
                Target ₹{target1Price.toFixed(1)} (+{metrics.target1Pct}%)
              </span>
            </div>

            {/* 3. Safety Stop Loss Risk */}
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-rose-800 dark:text-rose-400 uppercase font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                <span>Strict Safety Stop Loss</span>
              </span>
              <span className="text-base font-mono font-black text-rose-700 dark:text-rose-400 mt-1">
                -₹{Math.abs(metrics.stoplossPnl).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-rose-700 dark:text-rose-400/80 font-mono mt-0.5">
                Exit immediately if price touches ₹{stoplossPrice.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Reassuring Beginner Safety Rules */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-sans flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-accent-gold shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Golden Rule for Beginners:</strong>
              <span className="block mt-0.5 text-slate-700 dark:text-slate-300">
                Always set an automatic Stop Loss order at ₹{stoplossPrice.toFixed(1)} at your broker. If Target 1 is hit (+₹{metrics.target1Pnl.toLocaleString('en-IN')}), book 50% profit and trail your Stop Loss to ₹{entryPrice.toFixed(1)} (cost) for risk-free holding.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. INTERMEDIATE & EXPERT VIEW: DENSE PAYOFF METRICS & SIMULATOR
         ───────────────────────────────────────────────────────────── */}
      {!isBeginner && (
        <div className="space-y-3">
          {/* Main Payoff Matrix Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            {/* Capital Outlay */}
            <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                {isSeller ? 'Total Margin' : 'Capital Outlay'}
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                ₹{metrics.capitalRequired.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {quantity} qty @ ₹{entryPrice.toFixed(1)}
              </span>
            </div>

            {/* Target 1 Gain */}
            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/80">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-bold block">
                Target 1 Gain
              </span>
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                +₹{metrics.target1Pnl.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400/80 mt-0.5 block">
                ROI: +{metrics.rocPct}% (₹{target1Price.toFixed(1)})
              </span>
            </div>

            {/* Target 2 Gain */}
            <div className="p-2.5 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-300/80 dark:border-cyan-800/80">
              <span className="text-[10px] text-cyan-800 dark:text-cyan-400 uppercase font-bold block">
                Target 2 Gain
              </span>
              <span className="text-sm font-black text-cyan-700 dark:text-cyan-400 mt-0.5 block">
                +₹{metrics.target2Pnl.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-cyan-700 dark:text-cyan-400/80 mt-0.5 block">
                Runner Target (+{metrics.target2Pct}%)
              </span>
            </div>

            {/* Max SL Risk */}
            <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-300/80 dark:border-rose-800/80">
              <span className="text-[10px] text-rose-800 dark:text-rose-400 uppercase font-bold block">
                Max SL Risk
              </span>
              <span className="text-sm font-black text-rose-700 dark:text-rose-400 mt-0.5 block">
                -₹{Math.abs(metrics.stoplossPnl).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-rose-700 dark:text-rose-400/80 mt-0.5 block">
                Capped Loss (-{metrics.stoplossPct}%)
              </span>
            </div>
          </div>

          {/* Visual Payoff Risk:Reward Horizon Bar */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] flex flex-col space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
              <span>Risk: -₹{Math.abs(metrics.stoplossPnl).toLocaleString('en-IN')}</span>
              <span className="text-accent-gold font-bold">Breakeven: ₹{entryPrice.toFixed(1)}</span>
              <span className="text-emerald-400">Reward: +₹{metrics.target1Pnl.toLocaleString('en-IN')}</span>
            </div>

            {/* Dual Color Segmented Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 flex overflow-hidden">
              <div 
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: '30%' }}
                title={`Max Risk Floor (-${metrics.stoplossPct}%)`}
              />
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: '70%' }}
                title={`Target 1 Upside (+${metrics.target1Pct}%)`}
              />
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              INTERACTIVE 2D SVG PAYOFF DIAGRAM & SPOT SLIDER (SENSIBULL / OPSTRA)
             ───────────────────────────────────────────────────────────── */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-3.5 rounded-full bg-accent-gold" />
                <span className="text-xs font-mono font-black text-white uppercase tracking-wider">
                  Interactive 2D Strategy Payoff Curve
                </span>
                <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Expiry Payoff
                </span>
              </div>

              {/* Live Cursor Simulation Readout */}
              <div className="text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">Simulated Spot:</span>
                <span className="text-white font-black">
                  {(strikePrice || 25000) + simulatedShift} ({simulatedShift >= 0 ? `+${simulatedShift}` : `${simulatedShift}`} pts)
                </span>
                <span className="text-slate-600">•</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                  simulatedOutcome.pnl >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  P&L: {simulatedOutcome.pnl >= 0 ? '+' : ''}₹{Math.round(simulatedOutcome.pnl).toLocaleString('en-IN')} ({simulatedOutcome.pct >= 0 ? '+' : ''}{simulatedOutcome.pct}%)
                </span>
              </div>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="w-full h-36 relative overflow-hidden rounded-lg bg-slate-900/60 border border-slate-800/80">
              <svg 
                viewBox="0 0 600 140" 
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                <defs>
                  <linearGradient id="payoffProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="payoffLossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.02" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.45" />
                  </linearGradient>
                </defs>

                {/* Zero P&L Line */}
                <line x1="0" y1="70" x2="600" y2="70" stroke="#475569" strokeDasharray="3 3" strokeWidth="1.2" />

                {/* Vertical Current Spot Line (Center X = 300) */}
                <line x1="300" y1="10" x2="300" y2="130" stroke="#F59E0B" strokeDasharray="2 2" strokeWidth="1" opacity="0.7" />

                {/* Breakeven Marker (approx X = 360 for Call or X = 240 for Put) */}
                <line x1={isCall ? 360 : 240} y1="30" x2={isCall ? 360 : 240} y2="110" stroke="#38BDF8" strokeDasharray="1 2" strokeWidth="1" />

                {/* Payoff Curve Polygon Area (Profit) */}
                <polygon 
                  points={curvePoints.profitPolygon}
                  fill="url(#payoffProfitGrad)"
                />

                {/* Payoff Curve Polygon Area (Loss) */}
                <polygon 
                  points={curvePoints.lossPolygon}
                  fill="url(#payoffLossGrad)"
                />

                {/* Main Payoff Line */}
                <path 
                  d={curvePoints.svgPath}
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Dynamic Cursor on Payoff Curve */}
                <circle 
                  cx={cursorCoords.x} 
                  cy={cursorCoords.y} 
                  r="5" 
                  fill="#FFFFFF" 
                  stroke={simulatedOutcome.pnl >= 0 ? '#10B981' : '#EF4444'} 
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              </svg>

              {/* On-Chart Key Markers */}
              <div className="absolute top-1 left-2 text-[9px] font-mono text-emerald-400 font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                ▲ Max Profit Zone
              </div>
              <div className="absolute bottom-1 left-2 text-[9px] font-mono text-rose-400 font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-rose-500/30">
                ▼ Defined Risk Floor
              </div>
              <div className="absolute top-1 right-2 text-[9px] font-mono text-amber-400 font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
                Spot: {(strikePrice || 25000)}
              </div>
            </div>

            {/* Spot Price Simulation Slider */}
            <div className="flex items-center space-x-3 pt-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold shrink-0">
                Shift Spot: -150 pts
              </span>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={simulatedShift}
                onChange={(e) => setSimulatedShift(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold shrink-0">
                +150 pts
              </span>
              <button
                type="button"
                onClick={() => setSimulatedShift(0)}
                className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0"
                title="Reset simulation to current spot"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. OPSTRA-STYLE SMART MARGIN OPTIMIZER (FOR SELLERS)
         ───────────────────────────────────────────────────────────── */}
      {isSeller && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-slate-950 border border-purple-500/40 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-purple-200 uppercase tracking-wide">
                  Opstra™ Smart Capital Margin Optimizer
                </span>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {metrics.marginReductionPct}% Capital Saved
                </span>
              </div>
              <span className="text-[11px] text-slate-300 font-sans block mt-0.5">
                Gross Naked Margin: <del className="text-rose-400">₹{metrics.grossMargin.toLocaleString('en-IN')}</del> ➔ With Hedge Leg: <strong className="text-emerald-400 font-bold">₹{metrics.capitalRequired.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="text-[10px] text-purple-300 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-700/60">
              Hedge: {legsSummary || 'OTM Protective Leg'}
            </span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. QUANTSAPP-STYLE TRAPPED WRITERS & SHORT COVERING RADAR
         ───────────────────────────────────────────────────────────── */}
      {!isBeginner && (
        <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
              Institutional Pressure:
            </span>
            {isCall ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span>🚨 Trapped Call Writers Unwinding (-14% OI) • Short Covering Catalyst</span>
              </span>
            ) : isSeller ? (
              <span className="text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1">
                <span>🛡️ Strong Defense Wall Intact • High Writer Retention Zone</span>
              </span>
            ) : (
              <span className="text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1">
                <span>🚨 Trapped Put Writers Breaking Down (-18% OI) • Long Unwinding Velocity</span>
              </span>
            )}
          </div>

          {isExpert && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Dealer Gamma Acceleration: <strong className="text-accent-gold">1.84x</strong> • Delta Tilt: <strong className="text-emerald-400">+0.62</strong>
            </span>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. FLASH SURGE CONFLUENCE RADAR (IF LIVE SURGE ACTIVE)
         ───────────────────────────────────────────────────────────── */}
      {matchingSurge && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-bear/15 via-bear/10 to-transparent border border-bear/40 flex items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-bear animate-pulse shrink-0" />
            <div className="truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-bear uppercase text-[10px]">
                  ⚡ Live 1-Minute Flash Surge Active!
                </span>
                <span className="px-1.5 py-0.2 rounded bg-bear/20 text-bear font-bold text-[9px] border border-bear/30">
                  Score {matchingSurge.surgeScore}/100
                </span>
              </div>
              <span className="text-[11px] text-slate-700 dark:text-slate-300 font-sans truncate block">
                {isBeginner 
                  ? 'Heavy institutional order flow entering this strike right now.'
                  : `1m OI Velocity: +${matchingSurge.oiChangePct}% • Vol/OI: ${matchingSurge.volumeOIRatio || '3.2x'} • ${matchingSurge.horizonDescription || 'Intraday Spike'}`
                }
              </span>
            </div>
          </div>

          {onOpenSurge && (
            <button
              type="button"
              onClick={onOpenSurge}
              className="px-2.5 py-1 rounded-lg bg-bear hover:bg-bear/90 text-white font-mono font-bold text-[10px] uppercase flex items-center gap-1 transition shadow-sm cursor-pointer shrink-0"
              title="View full order-flow surge metrics"
            >
              <span>View Surge</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TradePayoffSimulator;
