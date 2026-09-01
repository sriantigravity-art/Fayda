import React, { useState } from 'react';
import type { MultiLegStrategySetup, MultiLegStrategyId, SyntheticArbitrageItem } from '../types';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { 
  Layers, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ShieldAlert, 
  DollarSign, 
  Target, 
  Zap, 
  Clock, 
  Percent, 
  Info, 
  CheckCircle2, 
  ChevronRight,
  Scale
} from 'lucide-react';

export const MultiLegStrategyCard: React.FC = () => {
  const { currentIndexState, selectedIndex } = useMarket();
  const { isBeginner, isExpert } = useTerminalMode();

  const [selectedStrategyId, setSelectedStrategyId] = useState<MultiLegStrategyId | 'PUT_CALL_PARITY_ARB'>('BULL_CALL_SPREAD');
  const [showArbTab, setShowArbTab] = useState<boolean>(false);

  if (!currentIndexState) return null;

  const { multiLegStrategy, allMultiLegStrategies = [], syntheticArbitrage = [], lotSize, spotPrice } = currentIndexState;

  const activeStrategy: MultiLegStrategySetup | undefined = allMultiLegStrategies.find(
    s => s.strategyId === selectedStrategyId
  ) || multiLegStrategy || allMultiLegStrategies[0];

  const strategySelectorList: { id: MultiLegStrategyId; name: string; icon: string; category: string }[] = [
    { id: 'BULL_CALL_SPREAD', name: 'Bull Call Spread', icon: '📈', category: 'Directional Spread' },
    { id: 'BULL_PUT_SPREAD', name: 'Bull Put Credit Spread', icon: '🛡️', category: 'Credit Spread' },
    { id: 'BEAR_PUT_SPREAD', name: 'Bear Put Spread', icon: '📉', category: 'Directional Spread' },
    { id: 'CALL_RATIO_BACKSPREAD', name: 'Call Ratio 1:2 Backspread', icon: '🚀', category: 'Explosive Upside' },
    { id: 'PUT_RATIO_BACKSPREAD', name: 'Put Ratio 1:2 Backspread', icon: '💥', category: 'Crash Payoff' },
    { id: 'LONG_STRADDLE', name: 'Long Straddle', icon: '⚡', category: 'Volatility Event' },
    { id: 'SHORT_STRADDLE', name: 'Short Straddle', icon: '💰', category: 'Theta Harvesting' }
  ];

  return (
    <div className="w-full bg-terminal-card border border-terminal-border rounded-xl p-3.5 sm:p-4 shadow-subtle mb-3 select-none transition-all duration-300">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-terminal-border">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-accent-sky/15 text-accent-sky">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-xs sm:text-sm text-terminal-text tracking-wide">
                FAYDA MULTI-LEG STRATEGY BUILDER & SPREAD MATRIX
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-terminal-panel text-terminal-muted border border-terminal-border">
                {selectedIndex} (Lot: {lotSize})
              </span>
              {isExpert && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/30 font-bold">
                  Hedge Margin & Arb
                </span>
              )}
            </div>
            <p className="text-[11px] text-terminal-muted">
              {isBeginner 
                ? 'Protected multi-leg spreads: Cap maximum risk and eliminate severe time decay'
                : 'Institutional defined-risk spreads, 1:2 ratio backspreads & delta-neutral straddles'}
            </p>
          </div>
        </div>

        {/* Tab Toggle: Strategies vs Synthetic Put-Call Parity Arbitrage */}
        <div className="flex items-center space-x-1.5 bg-terminal-panel p-0.5 rounded-lg border border-terminal-border text-xs font-mono">
          <button
            type="button"
            onClick={() => setShowArbTab(false)}
            className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
              !showArbTab ? 'bg-terminal-card text-terminal-text font-bold shadow-subtle' : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            Spreads & Backspreads
          </button>
          <button
            type="button"
            onClick={() => setShowArbTab(true)}
            className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer flex items-center gap-1 ${
              showArbTab ? 'bg-terminal-card text-accent-sky font-bold shadow-subtle' : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Put-Call Parity Arb</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: PUT-CALL PARITY ARBITRAGE SCANNER (Chapter 6)                     */}
      {/* ========================================================================= */}
      {showArbTab ? (
        <div className="space-y-3 font-mono">
          <div className="bg-accent-sky/10 border border-accent-sky/30 rounded-xl p-3 text-xs text-terminal-text flex items-start gap-2">
            <Info className="w-4 h-4 text-accent-sky shrink-0 mt-0.5" />
            <div className="space-y-1 font-sans">
              <strong className="text-terminal-text">Put-Call Parity Arbitrage Scanner (C - P = Spot - Strike):</strong>
              <p className="text-terminal-muted text-[11px]">
                Checks for synthetic future mispricings across active strikes. If Synthetic Price significantly deviates from Spot Price (₹{spotPrice}), conversion or reversal arbitrage opportunity exists.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-terminal-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-terminal-panel text-[10px] text-terminal-muted font-sans uppercase">
                <tr>
                  <th className="p-2.5">Strike</th>
                  <th className="p-2.5 text-right">Call Price</th>
                  <th className="p-2.5 text-right">Put Price</th>
                  <th className="p-2.5 text-right">Synthetic Future</th>
                  <th className="p-2.5 text-right">Deviation (Pts)</th>
                  <th className="p-2.5 text-left">Arbitrage Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/60">
                {syntheticArbitrage.map((arb) => (
                  <tr key={arb.strikePrice} className="hover:bg-terminal-panel/50">
                    <td className="p-2.5 font-bold text-terminal-text">{arb.strikePrice}</td>
                    <td className="p-2.5 text-right text-bull">₹{arb.callPrice.toFixed(1)}</td>
                    <td className="p-2.5 text-right text-bear">₹{arb.putPrice.toFixed(1)}</td>
                    <td className="p-2.5 text-right font-bold text-terminal-text">₹{arb.syntheticPrice.toFixed(1)}</td>
                    <td className={`p-2.5 text-right font-bold ${
                      Math.abs(arb.deviationPts) > 10 ? 'text-amber' : 'text-terminal-muted'
                    }`}>
                      {arb.deviationPts >= 0 ? `+${arb.deviationPts}` : arb.deviationPts}
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        arb.arbitrageType === 'REVERSAL_ARB'
                          ? 'bg-bull/15 text-bull border border-bull/30'
                          : arb.arbitrageType === 'CONVERSION_ARB'
                          ? 'bg-bear/15 text-bear border border-bear/30'
                          : 'bg-terminal-panel text-terminal-muted'
                      }`}>
                        {arb.opportunityNote}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW B: MULTI-LEG STRATEGIES BUILDER & PAYOFF CARDS                       */
        /* ========================================================================= */
        <div className="space-y-3 font-sans">
          {/* Strategy Selection Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {strategySelectorList.map((item) => {
              const isSelected = activeStrategy?.strategyId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedStrategyId(item.id)}
                  className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-accent-sky/20 border-accent-sky text-terminal-text font-bold shadow-subtle ring-1 ring-accent-sky/40'
                      : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel/80'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          {activeStrategy && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-terminal-panel via-terminal-card to-terminal-panel border border-accent-sky/40 shadow-sm space-y-3 font-mono">
              {/* Strategy Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terminal-border/60 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded-lg bg-accent-sky/20 text-accent-sky">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-terminal-text font-sans">
                        {activeStrategy.strategyName}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        activeStrategy.type === 'NET_CREDIT'
                          ? 'bg-bull/15 text-bull border-bull/30'
                          : activeStrategy.type === 'ZERO_COST'
                          ? 'bg-accent-purple/15 text-accent-purple border-accent-purple/30'
                          : 'bg-accent-sky/15 text-accent-sky border-accent-sky/30'
                      }`}>
                        {activeStrategy.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-terminal-panel text-terminal-text border border-terminal-border font-bold">
                    {activeStrategy.riskReward}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-bull/15 text-bull border border-bull/30 font-bold">
                    {activeStrategy.confidenceScore}% Setup Score
                  </span>
                </div>
              </div>

              <p className="text-xs text-terminal-muted font-sans leading-relaxed">
                {activeStrategy.description}
              </p>

              {/* Legs Table */}
              <div className="bg-terminal-bg/70 rounded-xl p-2.5 border border-terminal-border space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-terminal-muted font-sans">Option Legs Structure:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {activeStrategy.legs.map((leg, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-terminal-panel border border-terminal-border flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          leg.action === 'BUY' ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                        }`}>
                          {leg.action} {leg.lotRatio > 1 ? `(${leg.lotRatio}x)` : ''}
                        </span>
                        <span className="font-bold text-terminal-text">
                          {leg.strikePrice} {leg.optionType}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-terminal-muted text-[11px]">
                        <span>LTP: <strong className="text-terminal-text">₹{leg.premium.toFixed(1)}</strong></span>
                        <span>•</span>
                        <span>Δ {leg.delta.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4-Column Payoff & Breakeven Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                {/* 1. Net Outlay */}
                <div className="p-2.5 rounded-lg bg-terminal-panel border border-terminal-border flex flex-col justify-between">
                  <span className="text-[10px] text-terminal-muted uppercase font-sans">
                    {activeStrategy.netDebitCreditPts >= 0 ? 'Net Credit Received' : 'Net Debit Outlay'}
                  </span>
                  <span className="text-sm font-black text-terminal-text mt-0.5">
                    {activeStrategy.netDebitCreditPts >= 0 ? '+' : ''}{activeStrategy.netDebitCreditPts} pts
                  </span>
                  <span className="text-[10px] text-accent-sky font-bold">
                    ₹{Math.abs(activeStrategy.netDebitCreditRupees).toLocaleString('en-IN')} (1 Lot)
                  </span>
                </div>

                {/* 2. Max Profit */}
                <div className="p-2.5 rounded-lg bg-terminal-panel border border-bull/30 flex flex-col justify-between">
                  <span className="text-[10px] text-bull uppercase font-sans">Max Profit Potential</span>
                  <span className="text-sm font-black text-bull mt-0.5 truncate">
                    {typeof activeStrategy.maxProfitPts === 'number' ? `+${activeStrategy.maxProfitPts} pts` : activeStrategy.maxProfitPts}
                  </span>
                  <span className="text-[10px] text-bull font-bold truncate">
                    {typeof activeStrategy.maxProfitRupees === 'number' ? `+₹${activeStrategy.maxProfitRupees.toLocaleString('en-IN')}` : activeStrategy.maxProfitRupees}
                  </span>
                </div>

                {/* 3. Max Risk / Loss */}
                <div className="p-2.5 rounded-lg bg-terminal-panel border border-bear/30 flex flex-col justify-between">
                  <span className="text-[10px] text-bear uppercase font-sans">Maximum Risk Cap</span>
                  <span className="text-sm font-black text-bear mt-0.5 truncate">
                    {typeof activeStrategy.maxLossPts === 'number' ? `-${activeStrategy.maxLossPts} pts` : activeStrategy.maxLossPts}
                  </span>
                  <span className="text-[10px] text-bear font-bold truncate">
                    {typeof activeStrategy.maxLossRupees === 'number' ? `-₹${activeStrategy.maxLossRupees.toLocaleString('en-IN')}` : activeStrategy.maxLossRupees}
                  </span>
                </div>

                {/* 4. Breakeven Points */}
                <div className="p-2.5 rounded-lg bg-terminal-panel border border-accent-sky/30 flex flex-col justify-between">
                  <span className="text-[10px] text-accent-sky uppercase font-sans">Breakeven Levels</span>
                  <div className="text-xs font-bold text-terminal-text mt-0.5 truncate">
                    {activeStrategy.upperBreakeven && <div>Upper: ₹{activeStrategy.upperBreakeven}</div>}
                    {activeStrategy.lowerBreakeven && <div>Lower: ₹{activeStrategy.lowerBreakeven}</div>}
                  </div>
                  <span className="text-[9px] text-terminal-muted">Expiry Zero-Loss Price</span>
                </div>
              </div>

              {/* Net Greeks & Hedge Margin Savings */}
              <div className="p-2.5 rounded-lg bg-terminal-panel/80 border border-terminal-border/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex items-center space-x-3 text-terminal-muted">
                  <span>Net Delta: <strong className="text-accent-cyan">{activeStrategy.netDelta > 0 ? `+${activeStrategy.netDelta}` : activeStrategy.netDelta}</strong></span>
                  <span>•</span>
                  <span>Net Theta: <strong className={activeStrategy.netThetaDaily >= 0 ? 'text-bull' : 'text-bear'}>{activeStrategy.netThetaDaily >= 0 ? `+${activeStrategy.netThetaDaily}` : activeStrategy.netThetaDaily} pts/d</strong></span>
                  <span>•</span>
                  <span>Net Vega: <strong className="text-accent-purple">{activeStrategy.netVega}</strong></span>
                </div>

                <div className="flex items-center space-x-2 text-bull">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    Req. Margin: <strong>₹{activeStrategy.estimatedMarginRupees.toLocaleString('en-IN')}</strong> ({activeStrategy.marginSavingsPct}% Hedge Benefit)
                  </span>
                </div>
              </div>

              {/* Tactical Rules & Exit Playbook */}
              <div className="space-y-1.5 pt-1 text-xs text-terminal-muted font-sans">
                <strong className="text-terminal-text text-[11px]">Tactical Playbook & Rules:</strong>
                {activeStrategy.tacticalRules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-bull shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
