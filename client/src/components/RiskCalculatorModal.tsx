import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { 
  ShieldCheck, 
  X, 
  Calculator, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLtp?: number;
  defaultSl?: number;
  defaultTarget?: number;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultLtp = 100,
  defaultSl = 80,
  defaultTarget = 140
}) => {
  const { selectedIndex, currentIndexState } = useMarket();
  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
  const lotSize = cfg ? cfg.lot : (currentIndexState?.lotSize || 65);

  const [capital, setCapital] = useState<number>(() => {
    const saved = localStorage.getItem('fayda_user_capital');
    return saved ? parseFloat(saved) : 100000;
  });

  const [riskPct, setRiskPct] = useState<number>(1.0); // 1% risk per trade default
  const [entryPrice, setEntryPrice] = useState<number>(defaultLtp);
  const [slPrice, setSlPrice] = useState<number>(defaultSl);
  const [targetPrice, setTargetPrice] = useState<number>(defaultTarget);

  useEffect(() => {
    if (defaultLtp > 0) setEntryPrice(defaultLtp);
    if (defaultSl > 0) setSlPrice(defaultSl);
    if (defaultTarget > 0) setTargetPrice(defaultTarget);
  }, [defaultLtp, defaultSl, defaultTarget, isOpen]);

  useEffect(() => {
    localStorage.setItem('fayda_user_capital', capital.toString());
  }, [capital]);

  if (!isOpen) return null;

  // Calculations
  const maxRiskAmount = (capital * riskPct) / 100;
  const slPoints = Math.max(0.1, entryPrice - slPrice);
  const targetPoints = Math.max(0, targetPrice - entryPrice);
  const riskPerLot = slPoints * lotSize;
  const calculatedLots = Math.max(0, Math.floor(maxRiskAmount / Math.max(1, riskPerLot)));
  const allowedLots = calculatedLots;
  const maxQuantity = allowedLots * lotSize;
  const totalInvestment = maxQuantity * entryPrice;
  const expectedProfit = targetPoints * maxQuantity;
  const actualRiskAmount = slPoints * maxQuantity;
  const riskRewardRatio = slPoints > 0 ? (targetPoints / slPoints).toFixed(2) : '0.00';

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-4 md:p-6 flex min-h-full items-center justify-center select-none animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[88vh] bg-terminal-card border border-terminal-border rounded-2xl shadow-elevated flex flex-col overflow-hidden my-auto animate-scale-up">
        {/* Pinned Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-terminal-border p-4 sm:p-5 bg-terminal-panel/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent-sky/15 border border-accent-sky/30 text-accent-sky">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-sans font-bold text-terminal-text flex items-center gap-2">
                <span>SEBI-Compliant Risk & Sizing Calculator</span>
              </h2>
              <p className="text-xs text-terminal-muted font-sans">
                Mathematical capital preservation for {selectedIndex} (Lot Size: {lotSize})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
          {/* Account Capital */}
          <div className="bg-terminal-panel/80 border border-terminal-border rounded-xl p-3 flex flex-col space-y-1.5">
            <label className="text-terminal-muted font-bold flex items-center justify-between">
              <span>Account Capital (₹)</span>
              <span className="text-accent-cyan font-bold">₹{capital.toLocaleString('en-IN')}</span>
            </label>
            <input
              type="number"
              step="10000"
              min="10000"
              value={capital}
              onChange={(e) => setCapital(Math.max(1000, Number(e.target.value)))}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
            />
            {/* Quick Capital Preset Pills */}
            <div className="flex gap-1.5 pt-1">
              {[50000, 100000, 200000, 500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCapital(amt)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-semibold border transition ${
                    capital === amt
                      ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
                      : 'bg-terminal-bg border-terminal-border text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  ₹{(amt / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* Risk Per Trade */}
          <div className="bg-terminal-panel/80 border border-terminal-border rounded-xl p-3 flex flex-col space-y-1.5">
            <label className="text-terminal-muted font-bold flex items-center justify-between">
              <span>Max Risk / Trade</span>
              <span className="text-amber font-bold">{riskPct}% (₹{maxRiskAmount.toLocaleString('en-IN')})</span>
            </label>
            <div className="flex gap-1.5">
              {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRiskPct(pct)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                    riskPct === pct
                      ? 'bg-amber/20 border-amber text-amber shadow-sm'
                      : 'bg-terminal-bg border-terminal-border text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="text-[10px] text-terminal-muted pt-1">
              SEBI guidance suggests limiting risk per trade to &le; 1-2% of trading capital.
            </p>
          </div>

          {/* Option Entry LTP */}
          <div className="bg-terminal-panel/80 border border-terminal-border rounded-xl p-3 flex flex-col space-y-1">
            <label className="text-terminal-muted font-bold">Entry Option LTP (₹)</label>
            <input
              type="number"
              step="0.5"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Math.max(1, Number(e.target.value)))}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-terminal-text font-bold focus:outline-none focus:border-accent-cyan"
            />
          </div>

          {/* Stop Loss & Target */}
          <div className="bg-terminal-panel/80 border border-terminal-border rounded-xl p-3 flex flex-col space-y-1">
            <label className="text-terminal-muted font-bold flex justify-between">
              <span>Stop Loss (₹)</span>
              <span className="text-bear font-semibold">SL Dist: ₹{slPoints.toFixed(2)}</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={slPrice}
              onChange={(e) => setSlPrice(Math.max(0.1, Number(e.target.value)))}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-bear font-bold focus:outline-none focus:border-bear"
            />
          </div>
        </div>

        {/* Calculation Summary Card */}
        <div className="bg-gradient-to-br from-terminal-panel to-terminal-card border border-accent-cyan/30 rounded-xl p-4 flex flex-col space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-terminal-border/60 pb-2">
            <span className="text-xs text-terminal-muted uppercase tracking-wider font-bold">Recommended Position Sizing</span>
            <span className="text-xs px-2 py-0.5 rounded bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan font-bold">
              R:R 1:{riskRewardRatio}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 rounded-lg bg-terminal-bg/70 border border-terminal-border">
              <div className="text-[11px] text-terminal-muted">Max Lots</div>
              <div className="text-lg sm:text-xl font-bold text-accent-cyan">
                {allowedLots} <span className="text-xs text-terminal-muted font-normal">Lot{allowedLots > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-terminal-bg/70 border border-terminal-border">
              <div className="text-[11px] text-terminal-muted">Total Qty</div>
              <div className="text-lg sm:text-xl font-bold text-terminal-text">
                {maxQuantity} <span className="text-xs text-terminal-muted font-normal">units</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-terminal-bg/70 border border-bear/30">
              <div className="text-[11px] text-bear">Max Loss (SL)</div>
              <div className="text-base sm:text-lg font-bold text-bear">
                -₹{actualRiskAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-terminal-bg/70 border border-bull/30">
              <div className="text-[11px] text-bull">Target Gain</div>
              <div className="text-base sm:text-lg font-bold text-bull">
                +₹{expectedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-terminal-muted pt-1">
            <span>Total Capital Deployed: <strong className="text-terminal-text">₹{totalInvestment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ({((totalInvestment / capital) * 100).toFixed(2)}% of capital)</span>
            <span>Risk per Lot: <strong className="text-terminal-text">₹{riskPerLot.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Fayda 5 Golden Capital Preservation Rules */}
        <div className="bg-terminal-panel/60 border border-terminal-border rounded-xl p-3.5 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-terminal-text font-bold border-b border-terminal-border/60 pb-1.5">
            <span className="flex items-center gap-1.5 text-bull">
              <ShieldCheck className="w-4 h-4" />
              <span>Fayda 5 Golden Rules of Capital Preservation</span>
            </span>
            <span className="text-[10px] text-terminal-muted font-sans">Risk Protocol</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-terminal-muted font-sans">
            <div><strong>1. The 1% Rule:</strong> Max risk &le; 1% of total capital per trade (₹{maxRiskAmount.toLocaleString('en-IN')}).</div>
            <div><strong>2. Hard System SL:</strong> Always place technical SL in broker terminal, never mental.</div>
            <div><strong>3. Never Average Down:</strong> Never add contracts to a losing option trade.</div>
            <div><strong>4. 2-Loss Circuit Breaker:</strong> Max 2 trades/day. If both hit SL (-2%), STOP trading for the day.</div>
            <div className="sm:col-span-2 text-accent-sky"><strong>5. 1:2 Minimum R:R:</strong> Maintain &ge; 1:2 Risk to Reward for positive mathematical expectancy.</div>
          </div>
        </div>

        {/* SEBI Investor Education Advisory */}
        <div className="flex items-start gap-2.5 bg-amber/10 border border-amber/30 rounded-xl p-3 text-[11px] text-amber font-sans">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">SEBI Risk Advisory:</strong> 9 out of 10 individual traders in equity F&O incur net losses. Strict adherence to position sizing and predefined stop-loss rules is required to protect trading capital.
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-accent-sky/15 border border-accent-sky/40 text-accent-sky hover:bg-accent-sky/25 font-sans font-bold text-xs transition cursor-pointer"
          >
            Done & Apply
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
