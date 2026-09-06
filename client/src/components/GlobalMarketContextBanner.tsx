import React from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export const GlobalMarketContextBanner: React.FC = () => {
  const { globalMarketContext } = useMarket();
  const { isBeginner, isIntermediate } = useTerminalMode();

  if (!globalMarketContext) return null;

  const { premarketSetup, indicators } = globalMarketContext;

  const isSupportive = premarketSetup === 'SUPPORTIVE';
  const isRiskOff = premarketSetup === 'RISK_OFF';

  const supportiveLabel = isBeginner ? '🟢 WORLD MARKETS: POSITIVE' : isIntermediate ? '🟢 GLOBAL SETUP: SUPPORTIVE' : '🟢 MACRO RISK-ON: EXPANSION';
  const riskOffLabel = isBeginner ? '🔴 WORLD MARKETS: WEAK' : isIntermediate ? '🔴 GLOBAL SETUP: RISK-OFF' : '🔴 MACRO RISK-OFF: CONTRACTION';
  const mixedLabel = isBeginner ? '🟡 WORLD MARKETS: BALANCED' : isIntermediate ? '🟡 GLOBAL SETUP: MIXED' : '🟡 MACRO RISK: CONVERGING';

  const setupBadge = isSupportive ? (
    <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wider uppercase bg-bull/20 text-bull border border-bull/50 shadow-[0_0_12px_rgba(0,245,155,0.25)] flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      <span>{supportiveLabel}</span>
    </span>
  ) : isRiskOff ? (
    <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wider uppercase bg-bear/20 text-bear border border-bear/50 shadow-[0_0_12px_rgba(255,59,105,0.25)] flex items-center gap-1 animate-pulse">
      <AlertTriangle className="w-3 h-3" />
      <span>{riskOffLabel}</span>
    </span>
  ) : (
    <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wider uppercase bg-amber/20 text-amber border border-amber/50 flex items-center gap-1">
      <Activity className="w-3 h-3 text-amber" />
      <span>{mixedLabel}</span>
    </span>
  );

  const formatPct = (val: number, labelPrefix?: string) => {
    const isPos = val >= 0;
    return (
      <span className={`font-mono text-[10px] font-bold inline-flex items-center gap-0.5 ${isPos ? 'text-bull' : 'text-bear'}`}>
        {labelPrefix && <span className="opacity-70">{labelPrefix}</span>}
        <span>{isPos ? '+' : ''}{val.toFixed(2)}%</span>
      </span>
    );
  };

  const fiiIsPos = (indicators.fiiNetBuyCr ?? 0) >= 0;
  const diiIsPos = (indicators.diiNetBuyCr ?? 0) >= 0;

  return (
    <div className="w-full bg-terminal-card/95 border-b border-terminal-border/80 text-terminal-text select-none text-xs font-mono shadow-sm">
      {/* Primary World Market Ticker Ribbon */}
      <div className="max-w-[1840px] mx-auto px-2 sm:px-4 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2 overflow-x-auto no-scrollbar py-0.5 w-full">
          {setupBadge}

          {/* Quick Indicators Chips Matrix */}
          <div className="flex items-center flex-nowrap overflow-x-auto no-scrollbar gap-1.5 sm:gap-2 text-[11px] font-sans">
            {/* GIFT Nifty */}
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border shrink-0 shadow-xs">
              <span className="text-terminal-muted text-[10px] font-mono font-semibold">GIFT NIFTY:</span>
              <span className="font-bold text-terminal-text font-mono">₹{indicators.giftNifty.value.toFixed(0)}</span>
              {formatPct(indicators.giftNifty.changePct)}
            </div>

            {/* USD/INR */}
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border shrink-0 shadow-xs">
              <span className="text-terminal-muted text-[10px] font-mono font-semibold">USD/INR:</span>
              <span className="font-bold text-terminal-text font-mono">₹{indicators.usdInr.value.toFixed(2)}</span>
              {formatPct(indicators.usdInr.changePct)}
            </div>

            {/* Brent Crude */}
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border shrink-0 shadow-xs">
              <span className="text-terminal-muted text-[10px] font-mono font-semibold">CRUDE OIL:</span>
              <span className="font-bold text-terminal-text font-mono">${indicators.brentCrude.value.toFixed(2)}</span>
              {formatPct(indicators.brentCrude.changePct)}
            </div>

            {/* Asia Markets (Nikkei & Hang Seng) */}
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border shrink-0 shadow-xs">
              <span className="text-terminal-muted text-[10px] font-mono font-bold text-accent-sky">ASIA:</span>
              <span className="text-terminal-muted text-[10px] font-mono">Nikkei</span>
              <span className="font-bold text-terminal-text font-mono">{indicators.nikkei.value.toFixed(0)}</span>
              {formatPct(indicators.nikkei.changePct)}
              <span className="text-terminal-border font-light">|</span>
              <span className="text-terminal-muted text-[10px] font-mono">HSI</span>
              <span className="font-bold text-terminal-text font-mono">{indicators.hangSeng.value.toFixed(0)}</span>
              {formatPct(indicators.hangSeng.changePct)}
            </div>

            {/* US Markets (S&P 500 & Nasdaq) */}
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border shrink-0 shadow-xs">
              <span className="text-terminal-muted text-[10px] font-mono font-bold text-accent-cyan">US:</span>
              <span className="text-terminal-muted text-[10px] font-mono">S&P</span>
              <span className="font-bold text-terminal-text font-mono">{indicators.sp500.value.toFixed(0)}</span>
              {formatPct(indicators.sp500.changePct)}
              <span className="text-terminal-border font-light">|</span>
              <span className="text-terminal-muted text-[10px] font-mono">NDX</span>
              <span className="font-bold text-terminal-text font-mono">{indicators.nasdaq.value.toFixed(0)}</span>
              {formatPct(indicators.nasdaq.changePct)}
            </div>

            {/* Europe Markets (FTSE & DAX) */}
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border shrink-0 shadow-xs">
              <span className="text-terminal-muted text-[10px] font-mono font-bold text-purple-400">EUROPE:</span>
              <span className="text-terminal-muted text-[10px] font-mono">FTSE</span>
              <span className="font-bold text-terminal-text font-mono">{(indicators.ftse?.value ?? 8240).toFixed(0)}</span>
              {formatPct(indicators.ftse?.changePct ?? 0.25)}
              <span className="text-terminal-border font-light">|</span>
              <span className="text-terminal-muted text-[10px] font-mono">DAX</span>
              <span className="font-bold text-terminal-text font-mono">{(indicators.dax?.value ?? 18650).toFixed(0)}</span>
              {formatPct(indicators.dax?.changePct ?? 0.35)}
            </div>

            {/* FII Data */}
            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded border shrink-0 ${
              fiiIsPos ? 'bg-bull/10 border-bull/40 text-bull' : 'bg-bear/10 border-bear/40 text-bear'
            }`}>
              <span className="text-[10px] font-mono font-bold">FII:</span>
              <span className="font-bold font-mono text-[11px]">
                {fiiIsPos ? '+' : ''}₹{indicators.fiiNetBuyCr.toLocaleString()} Cr
              </span>
            </div>

            {/* DII Data */}
            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded border shrink-0 ${
              diiIsPos ? 'bg-bull/10 border-bull/40 text-bull' : 'bg-bear/10 border-bear/40 text-bear'
            }`}>
              <span className="text-[10px] font-mono font-bold">DII:</span>
              <span className="font-bold font-mono text-[11px]">
                {diiIsPos ? '+' : ''}₹{indicators.diiNetBuyCr.toLocaleString()} Cr
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
