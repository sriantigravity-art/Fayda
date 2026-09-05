import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Sparkles, 
  ChevronDown, 
  Flame, 
  Activity, 
  Layers, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export const GlobalMarketContextBanner: React.FC = () => {
  const { globalMarketContext } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!globalMarketContext) return null;

  const { globalRiskMode, premarketSetup, summary, primaryDrivers, indicators } = globalMarketContext;

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
      {/* Primary Ticker Ribbon */}
      <div className="max-w-[1840px] mx-auto px-2 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left Side: Setup Badge & Key Global Indicators */}
        <div className="flex items-center flex-wrap gap-2 overflow-x-auto no-scrollbar py-0.5">
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

        {/* Right Side: Toggle Deep Context Drawer */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[11px] font-sans font-bold transition cursor-pointer shrink-0 ${
            isExpanded
              ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
              : 'bg-terminal-panel hover:bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
          }`}
          title="Toggle Global & Macro Intelligence Transmission Breakdown"
        >
          <Globe className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="hidden xs:inline">Macro Breakdown</span>
          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-accent-cyan' : ''}`}>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* Expandable Macro & Transmission Breakdown Drawer */}
      {isExpanded && (
        <div className="border-t border-terminal-border bg-terminal-panel/80 p-3 sm:p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="max-w-[1840px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-3 text-xs font-sans">
            {/* Left 7 Columns: Executive Global Synthesis */}
            <div className="md:col-span-7 flex flex-col space-y-2">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-black uppercase text-accent-cyan tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>GLOBAL EVENT → INDIA TRANSMISSION SYNTHESIS</span>
              </div>
              <p className="text-terminal-text leading-relaxed font-medium">
                {summary}
              </p>

              {/* Primary Macro Transmission Drivers */}
              <div className="pt-1.5 space-y-1">
                <span className="text-[10px] font-mono font-bold text-terminal-muted uppercase tracking-wider block">
                  Primary Transmission Catalysts:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {primaryDrivers.map((driver, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 p-1.5 rounded-lg bg-terminal-card border border-terminal-border text-[11px]">
                      <span className="text-accent-cyan font-bold">•</span>
                      <span className="text-terminal-muted">{driver}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Key Asset Performance Matrix */}
            <div className="md:col-span-5 flex flex-col space-y-2 border-t md:border-t-0 md:border-l border-terminal-border pt-2 md:pt-0 md:pl-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase text-terminal-muted">
                  Global Asset Matrix
                </span>
                <span className="text-[10px] font-mono text-terminal-muted">
                  Mode: <strong className="text-terminal-text uppercase">{globalRiskMode}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[10px]">
                <div className="p-1.5 rounded bg-terminal-card border border-terminal-border flex flex-col">
                  <span className="text-terminal-muted">S&P 500</span>
                  <span className="font-bold text-terminal-text">{indicators.sp500.value.toFixed(0)}</span>
                  {formatPct(indicators.sp500.changePct)}
                </div>

                <div className="p-1.5 rounded bg-terminal-card border border-terminal-border flex flex-col">
                  <span className="text-terminal-muted">NASDAQ</span>
                  <span className="font-bold text-terminal-text">{indicators.nasdaq.value.toFixed(0)}</span>
                  {formatPct(indicators.nasdaq.changePct)}
                </div>

                <div className="p-1.5 rounded bg-terminal-card border border-terminal-border flex flex-col">
                  <span className="text-terminal-muted">NIKKEI 225</span>
                  <span className="font-bold text-terminal-text">{indicators.nikkei.value.toFixed(0)}</span>
                  {formatPct(indicators.nikkei.changePct)}
                </div>

                <div className="p-1.5 rounded bg-terminal-card border border-terminal-border flex flex-col">
                  <span className="text-terminal-muted">HANG SENG</span>
                  <span className="font-bold text-terminal-text">{indicators.hangSeng.value.toFixed(0)}</span>
                  {formatPct(indicators.hangSeng.changePct)}
                </div>

                <div className="p-1.5 rounded bg-terminal-card border border-terminal-border flex flex-col">
                  <span className="text-terminal-muted">GOLD (Troy Oz)</span>
                  <span className="font-bold text-terminal-text">${indicators.gold.value.toFixed(0)}</span>
                  {formatPct(indicators.gold.changePct)}
                </div>

                <div className="p-1.5 rounded bg-terminal-card border border-terminal-border flex flex-col">
                  <span className="text-terminal-muted">DII FLOW</span>
                  <span className="font-bold text-bull">+₹{indicators.diiNetBuyCr} Cr</span>
                  <span className="text-terminal-muted text-[9px]">Domestic SIPs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
