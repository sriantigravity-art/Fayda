import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calculator, Sparkles, TrendingUp, Sliders } from 'lucide-react';
import { TradePayoffSimulator } from './TradePayoffSimulator';
import { useMarket } from '../context/MarketContext';
import { useTheme } from '../context/ThemeContext';

import type { UnifiedSmartTip } from '../types';

interface TradePayoffSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTip?: UnifiedSmartTip | null;
  tip?: UnifiedSmartTip | null;
}

export const TradePayoffSimulatorModal: React.FC<TradePayoffSimulatorModalProps> = ({ 
  isOpen, 
  onClose,
  initialTip,
  tip
}) => {
  const activeTradeTip = initialTip || tip;
  const { currentIndexState, selectedIndex } = useMarket();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const spot = currentIndexState?.spotPrice || 25000;
  const atm = currentIndexState?.atmStrike || Math.round(spot / 50) * 50;
  const lot = currentIndexState?.symbolConfig?.lot || 75;

  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [optionType, setOptionType] = useState<'CE' | 'PE' | 'SPREAD'>('CE');
  const [strike, setStrike] = useState<number>(atm);
  const [entryPrice, setEntryPrice] = useState<number>(120);
  const [targetPrice, setTargetPrice] = useState<number>(180);
  const [stoplossPrice, setStoplossPrice] = useState<number>(85);
  const [lotSize, setLotSize] = useState<number>(lot);

  React.useEffect(() => {
    if (activeTradeTip) {
      const isSeller = activeTradeTip.tradingRole === 'SELLER' || activeTradeTip.executionType === 'NET_CREDIT';
      setRole(isSeller ? 'SELLER' : 'BUYER');
      setOptionType(activeTradeTip.optionType === 'PE' ? 'PE' : (activeTradeTip.optionType === 'SPREAD' ? 'SPREAD' : 'CE'));
      setStrike(activeTradeTip.strikePrice || atm);
      setEntryPrice(activeTradeTip.entryPrice || 120);
      setTargetPrice(activeTradeTip.target1Price || (activeTradeTip.entryPrice ? +(activeTradeTip.entryPrice * 1.3).toFixed(1) : 180));
      setStoplossPrice(activeTradeTip.stoplossPrice || (activeTradeTip.entryPrice ? +(activeTradeTip.entryPrice * 0.75).toFixed(1) : 85));
      setLotSize(lot);
    }
  }, [activeTradeTip, isOpen, atm, lot]);

  if (!isOpen) return null;

  const targetPct = entryPrice > 0 ? Number((((targetPrice - entryPrice) / entryPrice) * 100).toFixed(1)) : 50;
  const stoplossPct = entryPrice > 0 ? Number((((entryPrice - stoplossPrice) / entryPrice) * 100).toFixed(1)) : 30;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-[#10141f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#131926]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Trade Payoff & Risk Simulator
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-mono">
                  {selectedIndex} • SPOT ₹{spot.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulate net debit/credit, max profit & loss zones, break-even strikes, and P&L probabilities
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e121c] flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setRole('BUYER')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                role === 'BUYER' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Buyer (Debit)
            </button>
            <button
              type="button"
              onClick={() => setRole('SELLER')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                role === 'SELLER' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Seller (Credit)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            {(['CE', 'PE', 'SPREAD'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOptionType(t)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  optionType === t ? 'bg-accent-sky text-slate-950 font-black shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">Entry ₹:</label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
              className="w-18 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-center"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">Target ₹:</label>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(Number(e.target.value))}
              className="w-18 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-center"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">Stoploss ₹:</label>
            <input
              type="number"
              value={stoplossPrice}
              onChange={(e) => setStoplossPrice(Number(e.target.value))}
              className="w-18 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-center"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">Qty (Lot):</label>
            <input
              type="number"
              value={lotSize}
              onChange={(e) => setLotSize(Number(e.target.value))}
              className="w-16 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-center"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <TradePayoffSimulator
            contractSymbol={`${selectedIndex} ${strike} ${optionType}`}
            entryPrice={entryPrice}
            currentLtp={entryPrice}
            target1Price={targetPrice}
            target1Pct={targetPct}
            target2Price={Number((targetPrice * 1.25).toFixed(1))}
            target2Pct={Number((targetPct * 1.5).toFixed(1))}
            stoplossPrice={stoplossPrice}
            stoplossPct={stoplossPct}
            lotSize={lotSize}
            role={role}
            executionType={role === 'BUYER' ? 'NET_DEBIT' : 'NET_CREDIT'}
            optionType={optionType}
            strikePrice={strike}
            spotPrice={spot}
            marginRequiredRupees={entryPrice * lotSize}
            maxProfitRupees={role === 'BUYER' ? (targetPrice - entryPrice) * lotSize : entryPrice * lotSize}
            maxLossRupees={role === 'BUYER' ? (entryPrice - stoplossPrice) * lotSize : 50000}
            probabilityOfProfitPct={role === 'BUYER' ? 62 : 68}
            strategyTag={role === 'BUYER' ? `Long ${optionType} Momentum` : `Short ${optionType} Premium Harvest`}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
