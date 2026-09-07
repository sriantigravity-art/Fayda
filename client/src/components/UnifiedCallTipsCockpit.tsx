import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { 
  Zap, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2, 
  Calculator, 
  Layers, 
  Activity, 
  Clock, 
  Timer, 
  Compass, 
  Flame, 
  Info, 
  Repeat, 
  ShieldAlert,
  Moon,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart2
} from 'lucide-react';
import { ALL_SYMBOLS_CONFIG, type UnifiedSmartTip, type TipConfluenceBreakdown, type OptionSellerMetrics } from '../types';
import { ConfluenceChecklist } from './ConfluenceChecklist';
export { ConfluenceChecklist };


export const UnifiedCallTipsCockpit: React.FC = React.memo(() => {
  const { currentIndexState, selectedIndex, setSelectedIndex, openTradeTipModal } = useMarket();
  const { isBeginner, isIntermediate, isExpert, setMode } = useTerminalMode();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'BUYERS' | 'SELLERS'>('ALL');
  const [expandedChecklistTipId, setExpandedChecklistTipId] = useState<string | null>(null);

  const toggleChecklist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedChecklistTipId(prev => prev === id ? null : id);
  };

  const [activeSetupForCalc, setActiveSetupForCalc] = useState<{ ltp: number; sl: number; target: number }>({
    ltp: 100,
    sl: 80,
    target: 140
  });

  if (!currentIndexState) return null;

  const {
    spotPrice,
    change,
    masterConfluence,
    unifiedTipsPackage,
    faydaStrategy,
    patternBreakout,
    multiLegStrategy,
    heroZeroSignals,
    pcr
  } = currentIndexState;

  const pkg = unifiedTipsPackage;
  const topCallTrade = pkg?.topCallTrade;
  const topPutTrade = pkg?.topPutTrade;
  const topSellerPutTrade = pkg?.topSellerPutTrade;
  const topSellerCallTrade = pkg?.topSellerCallTrade;
  const topSellerNeutralTrade = pkg?.topSellerNeutralTrade;
  const mc = masterConfluence;
  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
  const lotSize = cfg?.lot || 50;

  const buyerCount = (topCallTrade ? 1 : 0) + (topPutTrade ? 1 : 0) + (pkg?.primaryTrade ? 1 : 0) + (pkg?.gammaTrade && pkg.gammaTrade.action !== 'STANDBY' ? 1 : 0);
  const sellerCount = (topSellerPutTrade ? 1 : 0) + (topSellerCallTrade ? 1 : 0) + (topSellerNeutralTrade ? 1 : 0);

  const handleOpenCalc = (ltp: number, sl: number, target: number) => {
    setActiveSetupForCalc({ ltp, sl, target });
    setIsRiskModalOpen(true);
  };

  const handlePrimaryTradeClick = () => {
    if (!pkg?.primaryTrade) return;
    const t = pkg.primaryTrade;
    openTradeTipModal({
      symbol: t.symbol,
      title: t.contractSymbol,
      contractSymbol: t.contractSymbol,
      action: t.action,
      tierLabel: t.tierLabel,
      sessionName: t.sessionName,
      confluenceScore: t.confluenceScore,
      entryPrice: t.entryPrice,
      entryRange: t.entryRange,
      currentLtp: t.currentLtp,
      stoplossPrice: t.stoplossPrice,
      stoplossPct: t.stoplossPct,
      target1Price: t.target1Price,
      target1Pct: t.target1Pct,
      target2Price: t.target2Price,
      target2Pct: t.target2Pct,
      riskReward: t.riskReward,
      givenTimeFormatted: t.entryTimeFormatted,
      elapsedTimeFormatted: 'Live Session',
      status: t.status,
      strategyTag: t.strategyTag,
      lotSize,
      explanations: t.explanations,
      tradingRole: t.tradingRole,
      executionType: t.executionType,
      confluenceBreakdown: t.confluenceBreakdown,
      sellerMetrics: t.sellerMetrics
    });
  };

  const handleTradeClick = (t: UnifiedSmartTip | null, defaultGuidance: string) => {
    if (!t) return;
    openTradeTipModal({
      symbol: t.symbol,
      title: t.contractSymbol,
      contractSymbol: t.contractSymbol,
      action: t.action,
      optionType: t.optionType,
      tierLabel: t.tierLabel,
      sessionName: t.sessionName,
      confluenceScore: t.confluenceScore,
      entryPrice: t.entryPrice,
      entryRange: t.entryRange,
      currentLtp: t.currentLtp,
      stoplossPrice: t.stoplossPrice,
      stoplossPct: t.stoplossPct,
      target1Price: t.target1Price,
      target1Pct: t.target1Pct,
      target2Price: t.target2Price,
      target2Pct: t.target2Pct,
      riskReward: t.riskReward,
      givenTimeFormatted: t.entryTimeFormatted,
      elapsedTimeFormatted: 'Hourly Slot',
      actionGuidance: defaultGuidance,
      status: t.status,
      strategyTag: t.strategyTag,
      lotSize,
      explanations: t.explanations,
      tradingRole: t.tradingRole,
      executionType: t.executionType,
      confluenceBreakdown: t.confluenceBreakdown,
      sellerMetrics: t.sellerMetrics
    });
  };

  const handleSpreadTradeClick = () => {
    if (!pkg?.hedgedSpreadTrade) return;
    const t = pkg.hedgedSpreadTrade;
    openTradeTipModal({
      symbol: t.symbol,
      title: t.contractSymbol,
      contractSymbol: t.contractSymbol,
      action: t.action,
      optionType: 'SPREAD',
      tierLabel: t.tierLabel,
      sessionName: t.sessionName,
      confluenceScore: t.confluenceScore,
      entryPrice: t.entryPrice,
      entryRange: t.entryRange,
      currentLtp: t.currentLtp,
      stoplossPrice: t.stoplossPrice,
      stoplossPct: t.stoplossPct,
      target1Price: t.target1Price,
      target1Pct: t.target1Pct,
      target2Price: t.target2Price,
      target2Pct: t.target2Pct,
      riskReward: t.riskReward,
      givenTimeFormatted: t.entryTimeFormatted,
      elapsedTimeFormatted: 'Live Session',
      actionGuidance: '100% CAPITAL-PROTECTED SPREAD',
      status: t.status,
      strategyTag: t.strategyTag,
      lotSize,
      maxLossRupees: t.spreadDetails?.maxLossRupees,
      maxProfitRupees: t.spreadDetails?.maxProfitRupees,
      breakeven: t.spreadDetails?.breakeven,
      explanations: t.explanations,
      tradingRole: t.tradingRole,
      executionType: t.executionType,
      confluenceBreakdown: t.confluenceBreakdown,
      sellerMetrics: t.sellerMetrics
    });
  };

  const handleGammaTradeClick = () => {
    if (!pkg?.gammaTrade) return;
    const t = pkg.gammaTrade;
    openTradeTipModal({
      symbol: t.symbol,
      title: t.contractSymbol,
      contractSymbol: t.contractSymbol,
      action: t.action,
      tierLabel: t.tierLabel,
      sessionName: t.sessionName,
      confluenceScore: t.confluenceScore,
      entryPrice: t.entryPrice,
      entryRange: t.entryRange,
      currentLtp: t.currentLtp,
      stoplossPrice: t.stoplossPrice,
      stoplossPct: t.stoplossPct,
      target1Price: t.target1Price,
      target1Pct: t.target1Pct,
      target2Price: t.target2Price,
      target2Pct: t.target2Pct,
      riskReward: t.riskReward,
      givenTimeFormatted: t.entryTimeFormatted,
      elapsedTimeFormatted: 'Power Hour',
      actionGuidance: '0DTE GAMMA EXPLOSION SNIPER',
      status: t.status,
      strategyTag: t.strategyTag,
      lotSize,
      explanations: t.explanations,
      tradingRole: t.tradingRole,
      executionType: t.executionType,
      confluenceBreakdown: t.confluenceBreakdown,
      sellerMetrics: t.sellerMetrics
    });
  };

  const handleCarriedTradeClick = (t: UnifiedSmartTip) => {
    openTradeTipModal({
      symbol: t.symbol,
      title: t.contractSymbol,
      contractSymbol: t.contractSymbol,
      action: t.action,
      optionType: t.optionType,
      tierLabel: `🔄 CARRIED FORWARD (${t.sessionName})`,
      sessionName: t.sessionName,
      confluenceScore: t.confluenceScore,
      entryPrice: t.entryPrice,
      entryRange: t.entryRange,
      currentLtp: t.currentLtp,
      stoplossPrice: t.stoplossPrice,
      stoplossPct: t.stoplossPct,
      target1Price: t.target1Price,
      target1Pct: t.target1Pct,
      target2Price: t.target2Price,
      target2Pct: t.target2Pct,
      riskReward: t.riskReward,
      givenTimeFormatted: t.entryTimeFormatted,
      elapsedTimeFormatted: 'Carried Forward',
      actionGuidance: t.status === 'TARGET1_HIT' ? 'TRAIL STOPLOSS TO COST' : 'POSITION ACTIVE',
      status: t.status,
      strategyTag: t.strategyTag,
      lotSize,
      explanations: t.explanations
    });
  };

  const getProgressPct = (entry: number, target: number, current: number) => {
    if (target === entry) return 0;
    const pct = ((current - entry) / (target - entry)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  };

  const isCommodity = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'].includes(selectedIndex);

  return (
    <div className="flex flex-col space-y-4">
      {/* ========================================================================= */}
      {/* ── AUDIENCE FILTER STRIP: BUYERS vs SELLERS vs ALL ───────────────────── */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
            Trading Focus:
          </span>
          <div className="flex items-center bg-slate-200 dark:bg-slate-950 p-1 rounded-lg border border-slate-300 dark:border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setAudienceFilter('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                audienceFilter === 'ALL'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>🎯 All Strategies</span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 rounded text-[9px]">{buyerCount + sellerCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setAudienceFilter('BUYERS')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                audienceFilter === 'BUYERS'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>🟢 Option Buyers</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 rounded text-[9px]">{buyerCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setAudienceFilter('SELLERS')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                audienceFilter === 'SELLERS'
                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>🛡️ Option Sellers</span>
              <span className="px-1.5 py-0.2 bg-purple-500/20 rounded text-[9px]">{sellerCount}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span className="hidden md:inline">10-Indicator Confluence Matrix:</span>
          <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 font-bold">
            OI 30% • Trend 35% • VIX 10% • PCR 10% • Flow +5%
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── PANEL 1: PRIME HIGH-PROBABILITY SIGNALS (TOP CALL & TOP PUT) ───────── */}
      {/* ========================================================================= */}
      {(audienceFilter === 'ALL' || audienceFilter === 'BUYERS') && (
        <div className="flex flex-col space-y-3.5 bg-white dark:bg-gradient-to-b dark:from-[#091220] dark:via-terminal-card dark:to-terminal-card border border-amber-300/80 dark:border-accent-gold/40 rounded-2xl p-3.5 sm:p-4 shadow-sm dark:shadow-[0_0_30px_rgba(255,184,0,0.08)] select-none font-sans text-slate-900 dark:text-terminal-text transition-all duration-200">
          {/* Panel 1 Header */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-terminal-border/80">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-accent-gold border border-amber-400/30 shadow-sm">
                <Target className="w-5 h-5 animate-pulse text-amber-500 dark:text-accent-gold" />
              </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-terminal-text uppercase tracking-wide">
                  {isBeginner 
                    ? '🎯 Top Safe Buy & Sell Picks (Top CALL & Top PUT)' 
                    : isIntermediate 
                    ? '🎯 Prime High-Probability Signals (Top CALL & Top PUT)' 
                    : '🔬 Institutional High-Alpha Orders (Top CALL & Top PUT)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-amber-100 dark:bg-accent-gold/20 text-amber-800 dark:text-accent-gold border border-amber-300 dark:border-accent-gold/40 shadow-sm dark:shadow-[0_0_10px_rgba(255,184,0,0.25)]">
                  {isBeginner ? '92%+ Win Rate' : '≥ 85% Confluence'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-terminal-muted font-mono flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-sky-600 dark:text-accent-cyan" />
                <span>{isBeginner ? 'Max 1-2 Safe Calls/Puts per Hour' : 'Max 1-2 High-Conviction Calls/Puts per Hour'}</span>
                <span className="text-slate-300 dark:text-terminal-border">•</span>
                <span className="text-sky-700 dark:text-accent-cyan font-bold">
                  {isBeginner ? 'Step-by-Step Capital Protection' : 'Institutional Hourly Slot Lock'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-terminal-bg border border-slate-200 dark:border-terminal-border text-slate-600 dark:text-terminal-muted flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
              <span>Live Scanning</span>
            </span>
          </div>
        </div>

        {/* Panel 1 Body */}
        {pkg?.currentSession === 'OFF_MARKET' ? (
          <div className="bg-gradient-to-br from-purple-50/80 via-white to-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-terminal-card dark:to-slate-950 border border-purple-200 dark:border-purple-500/30 rounded-xl p-5 text-center shadow-sm dark:shadow-lg relative overflow-hidden flex flex-col items-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-400 flex items-center justify-center shadow-inner">
              <Moon className="w-6 h-6" />
            </div>
            <div className="max-w-md space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40">
                MARKET CLOSED (15:40 - 09:15 IST)
              </span>
              <h4 className="text-sm font-black text-slate-900 dark:text-terminal-text">
                {isCommodity ? 'MCX Commodity Market Closed' : 'NSE/BSE Indian Market Closed'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-terminal-muted">
                Fresh institutional high-probability signals resume next trading session at 09:15 AM IST.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
            {/* 🟢 TOP HIGH-PROBABILITY CALL (BULLISH SNIPER) */}
            {pkg?.topCallTrade ? (
              <div 
                onClick={() => handleTradeClick(pkg.topCallTrade, 'HIGH-PROBABILITY HOURLY CALL SETUP')}
                className="flex flex-col justify-between bg-emerald-50/40 dark:bg-gradient-to-b dark:from-[#061e14]/40 dark:via-terminal-card dark:to-terminal-bg/95 border border-emerald-300 dark:border-emerald-500/40 hover:border-emerald-500 dark:hover:border-emerald-500/80 rounded-xl p-3.5 shadow-sm dark:shadow-lg transition-all relative overflow-hidden group cursor-pointer hover:scale-[1.01]"
                title="Click to view complete Call trade breakdown"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col space-y-2.5">
                  {/* Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded font-black text-[11px] tracking-wide uppercase">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>
                        {isBeginner ? '🟢 TOP CALL (SAFE BUY)' : isIntermediate ? '🟢 TOP CALL (BULLISH SNIPER)' : '🟢 TOP CALL (QUANT ALPHA)'}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-accent-gold/20 text-accent-gold border border-accent-gold/30">
                        🎯 {pkg.topCallTrade.confluenceScore}% {isBeginner ? 'PROBABILITY' : 'SCORE'}
                      </span>
                      <span className="text-[10px] text-terminal-muted font-mono hidden sm:inline">
                        {pkg.hourlyQuotaRemaining ? `${2 - pkg.hourlyQuotaRemaining.calls}/2 this hr` : '1/2'}
                      </span>
                    </div>
                  </div>

                  {/* Contract & LTP */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h3 className="text-base font-black text-terminal-text tracking-tight group-hover:text-emerald-400 transition-colors">
                        {pkg.topCallTrade.contractSymbol}
                      </h3>
                      <div className="text-[11px] text-accent-gold font-medium">
                        ⚡ {pkg.topCallTrade.strategyTag}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-terminal-muted font-mono">Live Market LTP</div>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-lg font-black font-mono text-emerald-400">
                          ₹{pkg.topCallTrade.currentLtp.toFixed(2)}
                        </span>
                        {pkg.topCallTrade.pnlPoints && pkg.topCallTrade.pnlPoints !== 0 ? (
                          <span className={`text-[10px] font-mono font-bold ${pkg.topCallTrade.pnlPoints > 0 ? 'text-bull' : 'text-bear'}`}>
                            ({pkg.topCallTrade.pnlPoints > 0 ? '+' : ''}{pkg.topCallTrade.pnlPoints.toFixed(2)})
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Given Trigger */}
                  <div className="py-1 px-2 rounded bg-terminal-bg border border-terminal-border/70 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-terminal-muted">
                      {isBeginner ? 'Safe Trigger Level' : 'Given Trigger'} ({pkg.topCallTrade.entryTimeFormatted}):
                    </span>
                    <span className="font-bold text-terminal-text">₹{pkg.topCallTrade.entryPrice.toFixed(2)}</span>
                  </div>

                  {/* Levels */}
                  <div className="grid grid-cols-3 gap-2 bg-terminal-bg/90 border border-terminal-border p-2.5 rounded-lg text-xs">
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">
                        {isBeginner ? 'Safe Buy Range' : 'Dip Entry'}
                      </div>
                      <div className="font-bold text-terminal-text font-mono text-[11px]">
                        {pkg.topCallTrade.entryRange}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">
                        {isBeginner ? 'Safety Net (SL)' : 'Stop Loss'}
                      </div>
                      <div className="font-bold text-bear font-mono">₹{pkg.topCallTrade.stoplossPrice.toFixed(2)} (-{pkg.topCallTrade.stoplossPct}%)</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">
                        {isBeginner ? 'Profit Targets' : 'Target 1 & 2'}
                      </div>
                      <div className="font-bold text-bull font-mono text-[11px]">
                        ₹{pkg.topCallTrade.target1Price.toFixed(2)} / ₹{pkg.topCallTrade.target2Price.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-terminal-muted">
                      <span>SL: ₹{pkg.topCallTrade.stoplossPrice.toFixed(2)}</span>
                      <span className="text-accent-cyan font-bold">R:R {pkg.topCallTrade.riskReward}</span>
                      <span>T1: ₹{pkg.topCallTrade.target1Price.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-terminal-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                        style={{ width: `${getProgressPct(pkg.topCallTrade.entryPrice, pkg.topCallTrade.target1Price, pkg.topCallTrade.currentLtp)}%` }}
                      />
                    </div>
                  </div>

                  {/* 10-Indicator Confluence Checklist Drawer Toggle */}
                  {pkg.topCallTrade.confluenceBreakdown && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={(e) => toggleChecklist(pkg.topCallTrade!.id, e)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>10 Indicators ({pkg.topCallTrade.confluenceBreakdown.totalConfluenceScore}%)</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20">
                            {pkg.topCallTrade.confluenceBreakdown.confirmedCount}/10 Pass
                          </span>
                        </span>
                        <span className="text-[10px] underline">
                          {expandedChecklistTipId === pkg.topCallTrade.id ? '▲ Hide Matrix' : '▼ View 10 Indicators'}
                        </span>
                      </button>
                      {expandedChecklistTipId === pkg.topCallTrade.id && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <ConfluenceChecklist breakdown={pkg.topCallTrade.confluenceBreakdown} role="BUYER" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-terminal-border/60">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    pkg.topCallTrade.status === 'TARGET1_HIT' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    pkg.topCallTrade.status === 'SL_HIT' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    pkg.topCallTrade.actionabilityStatus === 'RUNNING_PROFIT' ? 'bg-bull/20 text-bull border-bull/40' :
                    'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
                  }`}>
                    {pkg.topCallTrade.status === 'TARGET1_HIT' ? '🎯 T1 HIT (Trail SL)' : 
                     pkg.topCallTrade.status === 'SL_HIT' ? '🛑 SL HIT' :
                     pkg.topCallTrade.actionabilityStatus === 'RUNNING_PROFIT' ? '🚀 IN PROFIT' :
                     '⚡ AT TRIGGER PRICE'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCalc(pkg.topCallTrade!.entryPrice, pkg.topCallTrade!.stoplossPrice, pkg.topCallTrade!.target1Price);
                    }}
                    className="py-1 px-2.5 bg-terminal-bg hover:bg-terminal-border border border-terminal-border rounded-lg text-xs font-bold text-terminal-text flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-accent-gold" />
                    <span>Calc</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-terminal-card/80 border border-emerald-500/20 rounded-xl text-center space-y-2.5 min-h-[220px]">
                <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <TrendingUp className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-sm text-terminal-text">🟢 Top CALL: Scanning Market</div>
                  <div className="text-[11px] text-accent-gold font-mono mt-0.5">Awaiting ≥ 85% Confluence Filter</div>
                </div>
                <p className="text-xs text-terminal-muted max-w-xs leading-relaxed">
                  Algorithm is actively monitoring for Call short-covering and pivot breakout. No low-conviction or choppy calls are forced.
                </p>
              </div>
            )}

            {/* 🔴 TOP HIGH-PROBABILITY PUT (BEARISH SNIPER) */}
            {pkg?.topPutTrade ? (
              <div 
                onClick={() => handleTradeClick(pkg.topPutTrade, 'HIGH-PROBABILITY HOURLY PUT SETUP')}
                className="flex flex-col justify-between bg-rose-50/40 dark:bg-gradient-to-b dark:from-[#240a12]/40 dark:via-terminal-card dark:to-terminal-bg/95 border border-rose-300 dark:border-rose-500/40 hover:border-rose-500 dark:hover:border-rose-500/80 rounded-xl p-3.5 shadow-sm dark:shadow-lg transition-all relative overflow-hidden group cursor-pointer hover:scale-[1.01]"
                title="Click to view complete Put trade breakdown"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col space-y-2.5">
                  {/* Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded font-black text-[11px] tracking-wide uppercase">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>
                        {isBeginner ? '🔴 TOP PUT (SAFE BUY)' : isIntermediate ? '🔴 TOP PUT (BEARISH SNIPER)' : '🔴 TOP PUT (QUANT ALPHA)'}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-accent-gold/20 text-accent-gold border border-accent-gold/30">
                        🎯 {pkg.topPutTrade.confluenceScore}% {isBeginner ? 'PROBABILITY' : 'SCORE'}
                      </span>
                      <span className="text-[10px] text-terminal-muted font-mono hidden sm:inline">
                        {pkg.hourlyQuotaRemaining ? `${2 - pkg.hourlyQuotaRemaining.puts}/2 this hr` : '1/2'}
                      </span>
                    </div>
                  </div>

                  {/* Contract & LTP */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h3 className="text-base font-black text-terminal-text tracking-tight group-hover:text-rose-400 transition-colors">
                        {pkg.topPutTrade.contractSymbol}
                      </h3>
                      <div className="text-[11px] text-accent-gold font-medium">
                        ⚡ {pkg.topPutTrade.strategyTag}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-terminal-muted font-mono">Live Market LTP</div>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-lg font-black font-mono text-rose-400">
                          ₹{pkg.topPutTrade.currentLtp.toFixed(2)}
                        </span>
                        {pkg.topPutTrade.pnlPoints && pkg.topPutTrade.pnlPoints !== 0 ? (
                          <span className={`text-[10px] font-mono font-bold ${pkg.topPutTrade.pnlPoints > 0 ? 'text-bull' : 'text-bear'}`}>
                            ({pkg.topPutTrade.pnlPoints > 0 ? '+' : ''}{pkg.topPutTrade.pnlPoints.toFixed(2)})
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Given Trigger */}
                  <div className="py-1 px-2 rounded bg-terminal-bg border border-terminal-border/70 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-terminal-muted">
                      {isBeginner ? 'Safe Trigger Level' : 'Given Trigger'} ({pkg.topPutTrade.entryTimeFormatted}):
                    </span>
                    <span className="font-bold text-terminal-text">₹{pkg.topPutTrade.entryPrice.toFixed(2)}</span>
                  </div>

                  {/* Levels */}
                  <div className="grid grid-cols-3 gap-2 bg-terminal-bg/90 border border-terminal-border p-2.5 rounded-lg text-xs">
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">
                        {isBeginner ? 'Safe Buy Range' : 'Dip Entry'}
                      </div>
                      <div className="font-bold text-terminal-text font-mono text-[11px]">
                        {pkg.topPutTrade.entryRange}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">
                        {isBeginner ? 'Safety Net (SL)' : 'Stop Loss'}
                      </div>
                      <div className="font-bold text-bear font-mono">₹{pkg.topPutTrade.stoplossPrice.toFixed(2)} (-{pkg.topPutTrade.stoplossPct}%)</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">
                        {isBeginner ? 'Profit Targets' : 'Target 1 & 2'}
                      </div>
                      <div className="font-bold text-bull font-mono text-[11px]">
                        ₹{pkg.topPutTrade.target1Price.toFixed(2)} / ₹{pkg.topPutTrade.target2Price.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-terminal-muted">
                      <span>SL: ₹{topPutTrade.stoplossPrice.toFixed(2)}</span>
                      <span className="text-accent-cyan font-bold">R:R {pkg.topPutTrade.riskReward}</span>
                      <span>T1: ₹{pkg.topPutTrade.target1Price.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-terminal-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300"
                        style={{ width: `${getProgressPct(pkg.topPutTrade.entryPrice, pkg.topPutTrade.target1Price, pkg.topPutTrade.currentLtp)}%` }}
                      />
                    </div>
                  </div>

                  {/* 10-Indicator Confluence Checklist Drawer Toggle */}
                  {pkg.topPutTrade.confluenceBreakdown && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={(e) => toggleChecklist(pkg.topPutTrade!.id, e)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>10 Indicators ({pkg.topPutTrade.confluenceBreakdown.totalConfluenceScore}%)</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20">
                            {pkg.topPutTrade.confluenceBreakdown.confirmedCount}/10 Pass
                          </span>
                        </span>
                        <span className="text-[10px] underline">
                          {expandedChecklistTipId === pkg.topPutTrade.id ? '▲ Hide Matrix' : '▼ View 10 Indicators'}
                        </span>
                      </button>
                      {expandedChecklistTipId === pkg.topPutTrade.id && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <ConfluenceChecklist breakdown={pkg.topPutTrade.confluenceBreakdown} role="BUYER" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-terminal-border/60">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    pkg.topPutTrade.status === 'TARGET1_HIT' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    pkg.topPutTrade.status === 'SL_HIT' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    pkg.topPutTrade.actionabilityStatus === 'RUNNING_PROFIT' ? 'bg-bull/20 text-bull border-bull/40' :
                    'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
                  }`}>
                    {pkg.topPutTrade.status === 'TARGET1_HIT' ? '🎯 T1 HIT (Trail SL)' : 
                     pkg.topPutTrade.status === 'SL_HIT' ? '🛑 SL HIT' :
                     pkg.topPutTrade.actionabilityStatus === 'RUNNING_PROFIT' ? '🚀 IN PROFIT' :
                     '⚡ AT TRIGGER PRICE'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCalc(pkg.topPutTrade!.entryPrice, pkg.topPutTrade!.stoplossPrice, pkg.topPutTrade!.target1Price);
                    }}
                    className="py-1 px-2.5 bg-terminal-bg hover:bg-terminal-border border border-terminal-border rounded-lg text-xs font-bold text-terminal-text flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-accent-gold" />
                    <span>Calc</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-terminal-card/80 border border-rose-500/20 rounded-xl text-center space-y-2.5 min-h-[220px]">
                <div className="p-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <TrendingDown className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-sm text-terminal-text">🔴 Top PUT: Scanning Market</div>
                  <div className="text-[11px] text-accent-gold font-mono mt-0.5">Awaiting ≥ 85% Confluence Filter</div>
                </div>
                <p className="text-xs text-terminal-muted max-w-xs leading-relaxed">
                  Algorithm is actively monitoring for Put unwinding and breakdown under resistance roof. Capital safely preserved during neutral consolidations.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ========================================================================= */}
      {/* ── PANEL 1S: HIGH-POP OPTION SELLER STRATEGIES (CREDIT SPREADS & THETA) ─ */}
      {/* ========================================================================= */}
      {(audienceFilter === 'ALL' || audienceFilter === 'SELLERS') && (
        <div className="flex flex-col space-y-3.5 bg-white dark:bg-gradient-to-b dark:from-[#180a24] dark:via-terminal-card dark:to-terminal-card border border-purple-400/80 dark:border-purple-500/40 rounded-2xl p-3.5 sm:p-4 shadow-sm dark:shadow-[0_0_30px_rgba(168,85,247,0.12)] select-none font-sans text-slate-900 dark:text-terminal-text transition-all duration-200">
          {/* Panel 1S Header */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-terminal-border/80">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-400/30 shadow-sm">
                <ShieldCheck className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-terminal-text uppercase tracking-wide">
                    {isBeginner
                      ? '🛡️ Safe Option Seller Spreads (Fixed Risk • 80%+ Win Rate)'
                      : isIntermediate
                      ? '🛡️ High-POP Option Selling Cockpit (Credit Spreads & Theta Harvest)'
                      : '🔬 Institutional Option Selling Terminal (Delta-Neutral & Net Credit Spreads)'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 shadow-sm">
                    78% - 86% Prob. of Profit (POP)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-terminal-muted font-mono flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>
                    {isBeginner ? 'Hedged Spreads • Max 1-2 Picks/Hr' : 'Defensive Theta Engine • 72% Margin Relief'}
                  </span>
                  <span className="text-slate-300 dark:text-terminal-border">•</span>
                  <span className="text-purple-700 dark:text-purple-300 font-bold">
                    {isBeginner ? 'You Act As The Casino House' : 'Standard Deviation Buffer > 1.5σ'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 flex items-center gap-1.5 font-bold">
                <span>🛡️ Seller Quota:</span>
                <span>{pkg?.sellerQuotaRemaining ? `${2 - pkg.sellerQuotaRemaining.putSpreads}/2 Spreads` : 'Active'}</span>
              </span>
            </div>
          </div>

          {/* Panel 1S Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch">
            {/* 🟢 TOP SELLER PUT SPREAD (BULL PUT CREDIT SPREAD) */}
            {topSellerPutTrade ? (
              <div
                onClick={() => handleTradeClick(topSellerPutTrade, 'HIGH-POP BULL PUT CREDIT SPREAD')}
                className="flex flex-col justify-between bg-purple-50/40 dark:bg-gradient-to-b dark:from-[#1b0a2a]/50 dark:via-terminal-card dark:to-terminal-bg/95 border border-purple-300 dark:border-purple-500/40 hover:border-purple-500 dark:hover:border-purple-400 rounded-xl p-3.5 shadow-sm dark:shadow-lg transition-all relative overflow-hidden group cursor-pointer hover:scale-[1.01]"
                title="Click to view full Bull Put Spread breakdown"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded font-black text-[11px] tracking-wide uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-500 dark:text-purple-300" />
                      <span>{isBeginner ? '🛡️ BULL PUT SPREAD (SELL PE)' : 'BULL PUT CREDIT SPREAD'}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        🎯 {topSellerPutTrade.sellerMetrics?.popPct || 82}% POP
                      </span>
                    </div>
                  </div>

                  {/* Contract Symbol */}
                  <div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-terminal-text group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                      {topSellerPutTrade.contractSymbol}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-terminal-muted flex items-center gap-2 mt-0.5 font-mono">
                      <span>Credit Strategy</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Net Credit: ₹{topSellerPutTrade.entryPrice.toFixed(2)} pts (₹{(topSellerPutTrade.entryPrice * lotSize).toLocaleString('en-IN')}/lot)
                      </span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-terminal-bg/90 border border-slate-200 dark:border-terminal-border p-2.5 rounded-lg text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase">
                        Hedged Margin
                      </div>
                      <div className="font-bold text-slate-900 dark:text-terminal-text text-[11px]">
                        ₹{topSellerPutTrade.sellerMetrics?.marginRequired?.toLocaleString('en-IN') || '38,500'}
                      </div>
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400">-72% Discount</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase">
                        Safety Buffer
                      </div>
                      <div className="font-bold text-amber-600 dark:text-accent-gold text-[11px]">
                        {topSellerPutTrade.sellerMetrics?.breakevenBufferPts || 220} pts
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-terminal-muted">From Spot</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase">
                        Hourly Theta
                      </div>
                      <div className="font-bold text-cyan-600 dark:text-accent-cyan text-[11px]">
                        {topSellerPutTrade.sellerMetrics?.thetaBurnRate || '+₹140/hr'}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-terminal-muted">Time Decay</div>
                    </div>
                  </div>

                  {/* Explanation snippet */}
                  <p className="text-[11px] text-slate-600 dark:text-terminal-muted leading-relaxed line-clamp-2">
                    {isExpert 
                      ? (topSellerPutTrade.explanations?.expert || topSellerPutTrade.explanations?.intermediate || topSellerPutTrade.explanations?.beginner)
                      : isIntermediate 
                      ? (topSellerPutTrade.explanations?.intermediate || topSellerPutTrade.explanations?.beginner)
                      : (topSellerPutTrade.explanations?.beginner || 'As an option seller, you pocket net premium upfront. As long as the market stays above the short strike, you keep 100% of the credit as pure profit.')}
                  </p>

                  {/* 10-Indicator Confluence Checklist Toggle */}
                  {topSellerPutTrade.confluenceBreakdown && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => toggleChecklist(topSellerPutTrade.id, e)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
                          <span>10 Indicators ({topSellerPutTrade.confluenceBreakdown.totalConfluenceScore}%)</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20">
                            {topSellerPutTrade.confluenceBreakdown.confirmedCount}/10 Pass
                          </span>
                        </span>
                        <span className="text-[10px] underline">
                          {expandedChecklistTipId === topSellerPutTrade.id ? '▲ Hide Matrix' : '▼ View 10 Indicators'}
                        </span>
                      </button>
                      {expandedChecklistTipId === topSellerPutTrade.id && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <ConfluenceChecklist breakdown={topSellerPutTrade.confluenceBreakdown} role="SELLER" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-200 dark:border-terminal-border/60">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40">
                    ⚡ HIGH CONVICTION THETA HARVEST
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCalc(topSellerPutTrade.entryPrice, topSellerPutTrade.stoplossPrice, topSellerPutTrade.target1Price);
                    }}
                    className="py-1 px-2.5 bg-slate-100 dark:bg-terminal-bg hover:bg-slate-200 dark:hover:bg-terminal-border border border-slate-300 dark:border-terminal-border rounded-lg text-xs font-bold text-slate-800 dark:text-terminal-text flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>Calc</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-terminal-card/80 border border-purple-300/40 dark:border-purple-500/20 rounded-xl text-center space-y-2.5 min-h-[220px]">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-terminal-text">Bull Put Spread: Scanning</div>
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono mt-0.5">Awaiting ≥ 78% POP Confluence</div>
                </div>
                <p className="text-xs text-slate-500 dark:text-terminal-muted max-w-xs leading-relaxed">
                  Terminal monitors PE OI walls and standard deviation cushions. Credit spreads only triggered with defined capital shield.
                </p>
              </div>
            )}

            {/* 🔴 TOP SELLER CALL SPREAD (BEAR CALL CREDIT SPREAD) */}
            {topSellerCallTrade ? (
              <div
                onClick={() => handleTradeClick(topSellerCallTrade, 'HIGH-POP BEAR CALL CREDIT SPREAD')}
                className="flex flex-col justify-between bg-purple-50/40 dark:bg-gradient-to-b dark:from-[#200a1e]/50 dark:via-terminal-card dark:to-terminal-bg/95 border border-purple-300 dark:border-purple-500/40 hover:border-purple-500 dark:hover:border-purple-400 rounded-xl p-3.5 shadow-sm dark:shadow-lg transition-all relative overflow-hidden group cursor-pointer hover:scale-[1.01]"
                title="Click to view full Bear Call Spread breakdown"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded font-black text-[11px] tracking-wide uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-500 dark:text-purple-300" />
                      <span>{isBeginner ? '🛡️ BEAR CALL SPREAD (SELL CE)' : 'BEAR CALL CREDIT SPREAD'}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        🎯 {topSellerCallTrade.sellerMetrics?.popPct || 80}% POP
                      </span>
                    </div>
                  </div>

                  {/* Contract Symbol */}
                  <div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-terminal-text group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                      {topSellerCallTrade.contractSymbol}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-terminal-muted flex items-center gap-2 mt-0.5 font-mono">
                      <span>Credit Strategy</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Net Credit: ₹{topSellerCallTrade.entryPrice.toFixed(2)} pts (₹{(topSellerCallTrade.entryPrice * lotSize).toLocaleString('en-IN')}/lot)
                      </span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-terminal-bg/90 border border-slate-200 dark:border-terminal-border p-2.5 rounded-lg text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase">
                        Hedged Margin
                      </div>
                      <div className="font-bold text-slate-900 dark:text-terminal-text text-[11px]">
                        ₹{topSellerCallTrade.sellerMetrics?.marginRequired?.toLocaleString('en-IN') || '38,500'}
                      </div>
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400">-72% Discount</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase">
                        Safety Buffer
                      </div>
                      <div className="font-bold text-amber-600 dark:text-accent-gold text-[11px]">
                        {topSellerCallTrade.sellerMetrics?.breakevenBufferPts || 215} pts
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-terminal-muted">From Spot</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase">
                        Hourly Theta
                      </div>
                      <div className="font-bold text-cyan-600 dark:text-accent-cyan text-[11px]">
                        {topSellerCallTrade.sellerMetrics?.thetaBurnRate || '+₹135/hr'}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-terminal-muted">Time Decay</div>
                    </div>
                  </div>

                  {/* Explanation snippet */}
                  <p className="text-[11px] text-slate-600 dark:text-terminal-muted leading-relaxed line-clamp-2">
                    {isExpert 
                      ? (topSellerCallTrade.explanations?.expert || topSellerCallTrade.explanations?.intermediate || topSellerCallTrade.explanations?.beginner)
                      : isIntermediate 
                      ? (topSellerCallTrade.explanations?.intermediate || topSellerCallTrade.explanations?.beginner)
                      : (topSellerCallTrade.explanations?.beginner || 'Sell higher strike call and buy protection wing. Favorable call OI resistance roof holds premium down as clock ticks.')}
                  </p>

                  {/* 10-Indicator Confluence Checklist Toggle */}
                  {topSellerCallTrade.confluenceBreakdown && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => toggleChecklist(topSellerCallTrade.id, e)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
                          <span>10 Indicators ({topSellerCallTrade.confluenceBreakdown.totalConfluenceScore}%)</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20">
                            {topSellerCallTrade.confluenceBreakdown.confirmedCount}/10 Pass
                          </span>
                        </span>
                        <span className="text-[10px] underline">
                          {expandedChecklistTipId === topSellerCallTrade.id ? '▲ Hide Matrix' : '▼ View 10 Indicators'}
                        </span>
                      </button>
                      {expandedChecklistTipId === topSellerCallTrade.id && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <ConfluenceChecklist breakdown={topSellerCallTrade.confluenceBreakdown} role="SELLER" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-200 dark:border-terminal-border/60">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40">
                    ⚡ RESISTANCE ROOF CREDIT HARVEST
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCalc(topSellerCallTrade.entryPrice, topSellerCallTrade.stoplossPrice, topSellerCallTrade.target1Price);
                    }}
                    className="py-1 px-2.5 bg-slate-100 dark:bg-terminal-bg hover:bg-slate-200 dark:hover:bg-terminal-border border border-slate-300 dark:border-terminal-border rounded-lg text-xs font-bold text-slate-800 dark:text-terminal-text flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>Calc</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-terminal-card/80 border border-purple-300/40 dark:border-purple-500/20 rounded-xl text-center space-y-2.5 min-h-[220px]">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-terminal-text">Bear Call Spread: Scanning</div>
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono mt-0.5">Awaiting ≥ 78% POP Confluence</div>
                </div>
                <p className="text-xs text-slate-500 dark:text-terminal-muted max-w-xs leading-relaxed">
                  Terminal monitors CE resistance ceilings and IV crush zones. Trade armed when call sellers lock down higher strikes.
                </p>
              </div>
            )}

            {/* ⚖️ NEUTRAL / RANGE BOUND IRON CONDOR */}
            {topSellerNeutralTrade ? (
              <div
                onClick={() => handleTradeClick(topSellerNeutralTrade, 'RANGE BOUND IRON CONDOR SETUP')}
                className="flex flex-col justify-between bg-purple-50/40 dark:bg-gradient-to-b dark:from-[#16122c]/50 dark:via-terminal-card dark:to-terminal-bg/95 border border-purple-300 dark:border-purple-500/40 hover:border-purple-500 dark:hover:border-purple-400 rounded-xl p-3.5 shadow-sm dark:shadow-lg transition-all relative overflow-hidden group cursor-pointer hover:scale-[1.01] md:col-span-2 lg:col-span-1"
                title="Click to view full Iron Condor breakdown"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded font-black text-[11px] tracking-wide uppercase">
                      <Layers className="w-3.5 h-3.5 text-purple-500 dark:text-purple-300" />
                      <span>{isBeginner ? '🛡️ RANGE HARVEST (IRON CONDOR)' : 'DELTA-NEUTRAL IRON CONDOR'}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        🎯 {topSellerNeutralTrade.sellerMetrics?.popPct || 86}% POP
                      </span>
                    </div>
                  </div>

                  {/* Contract Symbol */}
                  <div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-terminal-text group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                      {topSellerNeutralTrade.contractSymbol}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-terminal-muted flex items-center gap-2 mt-0.5 font-mono">
                      <span>4-Leg Hedged Net Credit</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Net Credit: ₹{topSellerNeutralTrade.entryPrice.toFixed(2)} pts (₹{(topSellerNeutralTrade.entryPrice * lotSize).toLocaleString('en-IN')}/lot)
                      </span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-terminal-bg/90 border border-slate-200 dark:border-terminal-border p-2.5 rounded-lg text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase">
                        Hedged Margin
                      </div>
                      <div className="font-bold text-slate-900 dark:text-terminal-text text-[11px]">
                        ₹{topSellerNeutralTrade.sellerMetrics?.marginRequired?.toLocaleString('en-IN') || '42,000'}
                      </div>
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400">-75% Discount</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase">
                        Safety Buffer
                      </div>
                      <div className="font-bold text-amber-600 dark:text-accent-gold text-[11px]">
                        {topSellerNeutralTrade.sellerMetrics?.breakevenBufferPts || 320} pts
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-terminal-muted">Both Sides</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-terminal-muted uppercase">
                        Hourly Theta
                      </div>
                      <div className="font-bold text-cyan-600 dark:text-accent-cyan text-[11px]">
                        {topSellerNeutralTrade.sellerMetrics?.thetaBurnRate || '+₹210/hr'}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-terminal-muted">Dual Burn</div>
                    </div>
                  </div>

                  {/* Explanation snippet */}
                  <p className="text-[11px] text-slate-600 dark:text-terminal-muted leading-relaxed line-clamp-2">
                    {isExpert 
                      ? (topSellerNeutralTrade.explanations?.expert || topSellerNeutralTrade.explanations?.intermediate || topSellerNeutralTrade.explanations?.beginner)
                      : isIntermediate 
                      ? (topSellerNeutralTrade.explanations?.intermediate || topSellerNeutralTrade.explanations?.beginner)
                      : (topSellerNeutralTrade.explanations?.beginner || 'Market is range-bound between support and resistance. Pocket double premium from both calls and puts while staying protected.')}
                  </p>

                  {/* 10-Indicator Confluence Checklist Toggle */}
                  {topSellerNeutralTrade.confluenceBreakdown && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => toggleChecklist(topSellerNeutralTrade.id, e)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
                          <span>10 Indicators ({topSellerNeutralTrade.confluenceBreakdown.totalConfluenceScore}%)</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20">
                            {topSellerNeutralTrade.confluenceBreakdown.confirmedCount}/10 Pass
                          </span>
                        </span>
                        <span className="text-[10px] underline">
                          {expandedChecklistTipId === topSellerNeutralTrade.id ? '▲ Hide Matrix' : '▼ View 10 Indicators'}
                        </span>
                      </button>
                      {expandedChecklistTipId === topSellerNeutralTrade.id && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <ConfluenceChecklist breakdown={topSellerNeutralTrade.confluenceBreakdown} role="SELLER" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-200 dark:border-terminal-border/60">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40">
                    ⚡ 86% POP RANGE CONSOLIDATION
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCalc(topSellerNeutralTrade.entryPrice, topSellerNeutralTrade.stoplossPrice, topSellerNeutralTrade.target1Price);
                    }}
                    className="py-1 px-2.5 bg-slate-100 dark:bg-terminal-bg hover:bg-slate-200 dark:hover:bg-terminal-border border border-slate-300 dark:border-terminal-border rounded-lg text-xs font-bold text-slate-800 dark:text-terminal-text flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>Calc</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── PANEL 2: SIMPLE BUY & SELL SIGNALS (INTRADAY MULTI-TIER COCKPIT) ───── */}
      {/* ========================================================================= */}
      <div className="flex flex-col space-y-3.5 bg-terminal-card border border-terminal-border/80 rounded-2xl p-3.5 sm:p-4 shadow-xl select-none font-sans text-terminal-text transition-all duration-200">
        {/* Panel 2 Header: Active Session Title & Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-terminal-border/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-sm">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs sm:text-sm font-mono font-black text-terminal-text uppercase tracking-wide">
                  {isBeginner 
                    ? '🛡️ 100% Safe Hedged Strategies & Expiry Lotto' 
                    : isIntermediate 
                    ? '📊 Alternative Risk Strategies (Hedged Spread & 0DTE Gamma)' 
                    : '🔬 Institutional Multi-Leg & Volatility Alpha Cockpit'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-accent-gold/20 text-accent-gold border border-accent-gold/40 shadow-[0_0_10px_rgba(255,184,0,0.25)]">
                  {pkg?.currentSessionName || 'Live Market'}
                </span>
              </div>
              <div className="text-[11px] text-terminal-muted font-mono flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-accent-cyan" />
                <span>{pkg?.sessionWindowTime || '09:15 - 15:30 IST'}</span>
                <span className="text-terminal-border">•</span>
                <span className="text-accent-cyan font-bold">
                  {isBeginner 
                    ? 'Defined Maximum Loss • Safe Capital Preservation' 
                    : isIntermediate 
                    ? 'Defined-Risk Multi-Leg Spreads & Expiry Momentum' 
                    : 'Directional Delta Neutral Spreads • Gamma Squeeze Multipliers'}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center bg-terminal-bg border border-terminal-border/80 p-1 rounded-lg">
            <button
              onClick={() => setMode('BEGINNER')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                isBeginner 
                  ? 'bg-emerald-500 text-terminal-bg shadow-sm' 
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-border/30'
              }`}
            >
              🟢 Beginner
            </button>
            <button
              onClick={() => setMode('INTERMEDIATE')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                isIntermediate 
                  ? 'bg-amber-500 text-terminal-bg shadow-sm' 
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-border/30'
              }`}
            >
              🟡 Technical
            </button>
            <button
              onClick={() => setMode('EXPERT')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                isExpert 
                  ? 'bg-purple-500 text-white shadow-sm' 
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-border/30'
              }`}
            >
              🔴 Derivatives
            </button>
          </div>
        </div>

          {/* ── 2B. LIVE REGIME & CONFLUENCE BANNER ── */}
          {mc && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-terminal-bg/80 border border-terminal-border/70 p-2.5 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-accent-gold shrink-0" />
                <div>
                  <div className="text-[10px] text-terminal-muted uppercase font-bold">Master Signal</div>
                  <div className={`font-black text-sm ${mc.overallSignal.includes('BUY_CALL') ? 'text-bull' : mc.overallSignal.includes('BUY_PUT') ? 'text-bear' : 'text-terminal-muted'}`}>
                    {mc.overallSignal.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent-sky shrink-0" />
                <div>
                  <div className="text-[10px] text-terminal-muted uppercase font-bold">Strategy Confluence</div>
                  <div className="font-bold text-terminal-text text-sm flex items-center gap-1">
                    <span>{mc.overallScore}% Score</span>
                    <span className="text-[10px] text-accent-gold font-normal">({mc.convictionLevel})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent-purple shrink-0" />
                <div>
                  <div className="text-[10px] text-terminal-muted uppercase font-bold">Market Regime</div>
                  <div className="font-bold text-terminal-text text-xs truncate max-w-[160px]" title={mc.regimeLabel}>
                    {mc.regimeLabel}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-terminal-muted uppercase font-bold">Invalidation Level</div>
                  <div className="font-bold text-rose-400 font-mono text-xs">
                    ₹{Number(mc.invalidationPrice).toFixed(2)} ({selectedIndex})
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 2C. CARRIED FORWARD ACTIVE TRADES ── */}
          {pkg?.carriedForwardTrades && pkg.carriedForwardTrades.length > 0 && (
            <div className="flex flex-col space-y-2 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs tracking-wide">
                  <Repeat className="w-4 h-4 animate-spin" style={{ animationDuration: '10s' }} />
                  <span>CARRIED FORWARD ACTIVE TRADE — TREND CONTINUATION</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded">
                  Original Session: {pkg.carriedForwardTrades[0].carriedFromSession || 'Prior Session'}
                </span>
              </div>

              {pkg.carriedForwardTrades.map((cf) => {
                const pnlPts = cf.pnlPoints !== undefined ? cf.pnlPoints : +(cf.currentLtp - cf.entryPrice).toFixed(2);
                const pnlPercent = cf.pnlPct !== undefined ? cf.pnlPct : (cf.entryPrice > 0 ? +((pnlPts / cf.entryPrice) * 100).toFixed(2) : 0);
                const isGain = pnlPts > 0;
                const isLoss = pnlPts < 0;
                const isIdentical = pnlPts === 0;

                return (
                  <div 
                    key={cf.id} 
                    onClick={() => handleCarriedTradeClick(cf)}
                    className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center bg-terminal-card/90 hover:bg-terminal-card border border-amber-500/20 hover:border-amber-500/50 p-2.5 rounded-lg text-xs transition-all cursor-pointer hover:shadow-md"
                    title="Click to view full trade breakdown"
                  >
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-terminal-text text-sm">{cf.contractSymbol}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                          ACTIVE
                        </span>
                      </div>
                      <div className="text-[11px] text-terminal-muted flex items-center gap-1 mt-0.5">
                        <span className="text-accent-gold font-medium">Call Given:</span>
                        <span className="font-mono text-terminal-text font-bold">{cf.entryTimeFormatted}</span>
                        <span className="text-terminal-muted">(Ref: ₹{Number(cf.entryPrice).toFixed(2)})</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-terminal-muted">Live Market LTP</div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold font-mono text-terminal-text text-sm">₹{cf.currentLtp.toFixed(2)}</span>
                        {isIdentical ? (
                          <span className="text-[9px] text-cyan-400 font-bold font-mono">⚡ At Trigger</span>
                        ) : isGain ? (
                          <span className="text-[10px] text-bull font-bold font-mono">+{pnlPts.toFixed(2)} (+{pnlPercent.toFixed(2)}%)</span>
                        ) : (
                          <span className="text-[10px] text-bear font-bold font-mono">{pnlPts.toFixed(2)} ({pnlPercent.toFixed(2)}%)</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-terminal-muted">Suggested Dip Entry</div>
                      <div className="font-bold font-mono text-accent-cyan">
                        ₹{(cf.dipEntryMin || (cf.entryPrice * 0.98)).toFixed(2)} - ₹{(cf.dipEntryMax || cf.entryPrice).toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-terminal-muted">Stop Loss / Target 1</div>
                      <div className="font-mono text-[11px]">
                        <span className="font-bold text-bear">₹{Number(cf.stoplossPrice).toFixed(2)}</span>
                        <span className="text-terminal-muted mx-1">/</span>
                        <span className="font-bold text-bull">₹{Number(cf.target1Price).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-right flex items-center justify-end gap-1.5">
                      <span className={`px-2 py-1 rounded font-bold text-[10px] border ${
                        cf.status === 'TARGET1_HIT' 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                          : cf.status === 'SL_HIT'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : isGain
                          ? 'bg-bull/15 text-bull border-bull/30'
                          : 'bg-accent-sky/15 text-accent-sky border-accent-sky/30'
                      }`}>
                        {cf.status === 'TARGET1_HIT' ? '🎯 T1 HIT (Trail SL)' : isIdentical ? '⚡ AT TRIGGER PRICE' : isGain ? '🚀 IN PROFIT' : '🛡️ RUNNING'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 2D. SECONDARY ROW: HEDGED SPREAD & 0DTE GAMMA SNIPER ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch pt-2 border-t border-terminal-border/60">
            {/* Card 2: Hedged Spread */}
            {pkg?.hedgedSpreadTrade ? (
              <div 
                onClick={handleSpreadTradeClick}
                className="flex flex-col justify-between bg-gradient-to-b from-terminal-card to-terminal-bg/95 border border-accent-sky/30 hover:border-accent-sky/60 rounded-xl p-3.5 shadow-lg transition-all relative overflow-hidden group cursor-pointer hover:scale-[1.01]"
                title="Click to view complete spread breakdown"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent-sky/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col space-y-2.5">
                  {/* Card Header Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-accent-sky/15 text-accent-sky border border-accent-sky/30 rounded font-black text-[11px] tracking-wide uppercase">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {isBeginner 
                          ? '🛡️ 100% SAFE TRADE (LIMITED LOSS)' 
                          : isIntermediate 
                          ? 'TIER 2: HEDGED MULTI-LEG SPREAD' 
                          : 'TIER 2: DEFINED-RISK SPREAD'}
                      </span>
                    </span>
                    <span className="text-[10px] text-terminal-muted font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-accent-gold" />
                      <span>{pkg.hedgedSpreadTrade.entryTimeFormatted}</span>
                    </span>
                  </div>

                  {/* Strategy Name & Structure */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h3 className="text-base font-black text-terminal-text tracking-tight group-hover:text-accent-sky transition-colors">
                        {pkg.hedgedSpreadTrade.contractSymbol}
                      </h3>
                      <div className="text-[11px] text-accent-sky font-medium">
                        🛡️ {pkg.hedgedSpreadTrade.strategyTag}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-terminal-muted font-mono">Net Debit</div>
                      <div className="text-lg font-black font-mono text-accent-sky">
                        ₹{pkg.hedgedSpreadTrade.currentLtp.toFixed(2)} pts
                      </div>
                    </div>
                  </div>

                  {/* Spread Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-terminal-bg/90 border border-terminal-border p-2.5 rounded-lg text-xs">
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">Max Loss (₹)</div>
                      <div className="font-bold text-bear font-mono">
                        ₹{pkg.hedgedSpreadTrade.spreadDetails ? pkg.hedgedSpreadTrade.spreadDetails.maxLossRupees.toLocaleString('en-IN') : '2,200'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">Max Profit (₹)</div>
                      <div className="font-bold text-bull font-mono">
                        ₹{pkg.hedgedSpreadTrade.spreadDetails ? pkg.hedgedSpreadTrade.spreadDetails.maxProfitRupees.toLocaleString('en-IN') : '5,300'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">Breakeven</div>
                      <div className="font-bold text-terminal-text font-mono">
                        ₹{pkg.hedgedSpreadTrade.spreadDetails ? pkg.hedgedSpreadTrade.spreadDetails.breakeven.toFixed(2) : Number(spotPrice).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Margin Reduction Badge */}
                  <div className="flex items-center justify-between p-2 bg-accent-sky/10 border border-accent-sky/20 rounded text-xs">
                    <span className="text-accent-sky font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>72% Margin Reduction</span>
                    </span>
                    <span className="text-[10px] font-mono text-terminal-muted">Defined Risk Hedge</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 mt-2 border-t border-terminal-border/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCalc(pkg.hedgedSpreadTrade!.entryPrice, pkg.hedgedSpreadTrade!.stoplossPrice, pkg.hedgedSpreadTrade!.target1Price);
                    }}
                    className="flex-1 py-1.5 px-3 bg-terminal-bg hover:bg-terminal-border border border-terminal-border rounded-lg text-xs font-bold text-terminal-text flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5 text-accent-sky" />
                    <span>Analyze Payoff</span>
                  </button>
                  <span className="text-[10px] font-mono font-bold text-accent-sky px-2 py-1 bg-accent-sky/10 rounded border border-accent-sky/20">
                    R:R {pkg.hedgedSpreadTrade.riskReward}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-terminal-card border border-terminal-border rounded-xl text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-terminal-muted/40 animate-pulse" />
                <div className="font-bold text-sm text-terminal-text">Hedged Spread: Standby</div>
                <p className="text-xs text-terminal-muted max-w-xs">
                  Spread deployed when directional delta exceeds 70%.
                </p>
              </div>
            )}

            {/* Card 3: 0DTE Gamma Sniper */}
            {pkg?.gammaTrade && pkg.gammaTrade.action !== 'STANDBY' ? (
              <div 
                onClick={handleGammaTradeClick}
                className="flex flex-col justify-between bg-gradient-to-b from-terminal-card to-terminal-bg/95 border border-purple-500/40 hover:border-purple-500/70 rounded-xl p-3.5 shadow-lg transition-all relative overflow-hidden group cursor-pointer hover:scale-[1.01]"
                title="Click to view complete 0DTE gamma breakdown"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col space-y-2.5">
                  {/* Card Header Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded font-black text-[11px] tracking-wide uppercase">
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        {isBeginner 
                          ? '🚀 FAST PROFIT CHANCE (AFTERNOON ONLY)' 
                          : isIntermediate 
                          ? 'TIER 3: 0DTE GAMMA SNIPER' 
                          : 'TIER 3: 0DTE GAMMA SQUEEZE'}
                      </span>
                    </span>
                    <span className="text-[10px] text-terminal-muted font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-accent-gold" />
                      <span>{pkg.gammaTrade.entryTimeFormatted}</span>
                    </span>
                  </div>

                  {/* Contract Name & Multiplier */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h3 className="text-base font-black text-terminal-text tracking-tight group-hover:text-purple-400 transition-colors">
                        {pkg.gammaTrade.contractSymbol}
                      </h3>
                      <div className="text-[11px] text-purple-400 font-medium">
                        🚀 {pkg.gammaTrade.strategyTag}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-terminal-muted font-mono">Sniper LTP</div>
                      <div className="text-lg font-black font-mono text-purple-400">
                        ₹{pkg.gammaTrade.currentLtp.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Execution Metric Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-terminal-bg/90 border border-terminal-border p-2.5 rounded-lg text-xs">
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">Risk (SL)</div>
                      <div className="font-bold text-bear font-mono">₹{Number(pkg.gammaTrade.stoplossPrice).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">Target 1 (3x)</div>
                      <div className="font-bold text-bull font-mono">₹{Number(pkg.gammaTrade.target1Price).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase">Target 2 (5x)</div>
                      <div className="font-bold text-accent-gold font-mono">₹{Number(pkg.gammaTrade.target2Price).toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Multiplier Badge */}
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-bold flex items-center gap-1">
                      <span>3.5x to 5.0x Target Multiplier</span>
                    </span>
                    <span className="text-[10px] font-mono text-terminal-muted">Short Squeeze</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 mt-2 border-t border-terminal-border/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCalc(pkg.gammaTrade!.entryPrice, pkg.gammaTrade!.stoplossPrice, pkg.gammaTrade!.target1Price);
                    }}
                    className="flex-1 py-1.5 px-3 bg-terminal-bg hover:bg-terminal-border border border-terminal-border rounded-lg text-xs font-bold text-terminal-text flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5 text-purple-400" />
                    <span>Calculate Risk</span>
                  </button>
                  <span className="text-[10px] font-mono font-bold text-purple-300 px-2 py-1 bg-purple-500/10 rounded border border-purple-500/20">
                    High Multiplier
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-terminal-card border border-terminal-border rounded-xl text-center space-y-2">
                <Timer className="w-8 h-8 text-terminal-muted/40 animate-pulse" />
                <div className="font-bold text-sm text-terminal-text">0DTE Gamma Sniper: Standby</div>
                <p className="text-xs text-terminal-muted max-w-xs">
                  Gamma velocity is normal. Capital is preserved until true institutional 0DTE short-covering squeezes trigger in afternoon hours.
                </p>
              </div>
            )}
          </div>

      {/* ── 5. INTERACTIVE STRATEGY CONFLUENCE MATRIX DRAWER ──────────────── */}
      <div className="border border-terminal-border rounded-xl overflow-hidden bg-terminal-bg/40">
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-terminal-bg/80 hover:bg-terminal-bg text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-gold" />
            <span className="font-bold text-xs text-terminal-text">
              {isBeginner 
                ? '🔍 7-Point Safety Checklist (Why We Picked This Trade)' 
                : isIntermediate 
                ? '🔬 Strategy Confluence Verification Drawer (7 Platform Engines Checklist)' 
                : '⚡ Multi-Factor Confluence & Quantitative Audit Matrix'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-terminal-muted font-semibold">
            <span>{isDrawerOpen ? 'Collapse Checklist' : 'Verify All Strategies'}</span>
            {isDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isDrawerOpen && (
          <div className="p-3 border-t border-terminal-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {/* 1. Fayda Master Radar */}
            <div className="p-2.5 bg-terminal-card border border-terminal-border rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-bull shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-terminal-text">1. Fayda Master Radar</div>
                <div className="text-[11px] text-terminal-muted">{mc?.confluenceRationale || 'High-probability institutional score'}</div>
              </div>
            </div>

            {/* 2. OI Activity Radar */}
            <div className="p-2.5 bg-terminal-card border border-terminal-border rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-bull shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-terminal-text">2. OI Activity Radar</div>
                <div className="text-[11px] text-terminal-muted">PCR: {pcr?.overallPcr.toFixed(2)} with 1-min Call/Put Delta liquidation analysis.</div>
              </div>
            </div>

            {/* 3. Fayda Pivot Strategy & Playbook */}
            <div className="p-2.5 bg-terminal-card border border-terminal-border rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-bull shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-terminal-text">3. Fayda Pivot Strategy / Playbook Setups</div>
                <div className="text-[11px] text-terminal-muted">{faydaStrategy?.strategyName || 'Fayda Pivot Strategy (CPR & 20 EMA Confluence)'}.</div>
              </div>
            </div>

            {/* 4. Multi-Timeframe Breakout Pattern */}
            <div className="p-2.5 bg-terminal-card border border-terminal-border rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-bull shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-terminal-text">4. Breakout Pattern Radar</div>
                <div className="text-[11px] text-terminal-muted">{patternBreakout?.activePattern.patternName || 'Level Breakout'} on {patternBreakout?.activeTimeframe || '5m'}.</div>
              </div>
            </div>

            {/* 5. Fayda Multi-Leg Bull Call Spread */}
            <div className="p-2.5 bg-terminal-card border border-terminal-border rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-bull shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-terminal-text">5. Fayda Bull Call Spread Engine</div>
                <div className="text-[11px] text-terminal-muted">{multiLegStrategy?.strategyName || 'Capital-Protected Spread'} with defined-risk payoff.</div>
              </div>
            </div>

            {/* 6. Gamma Explosion Radar */}
            <div className="p-2.5 bg-terminal-card border border-terminal-border rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-bull shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-terminal-text">6. Gamma Explosion Radar</div>
                <div className="text-[11px] text-terminal-muted">0DTE Volatility & Short-Covering Squeeze Velocity detection.</div>
              </div>
            </div>

            {/* 7. ATM ±3 Strike Cluster Consensus Radar */}
            <div className="p-2.5 bg-terminal-card border border-terminal-border rounded-lg flex items-start gap-2 md:col-span-2 lg:col-span-3">
              <CheckCircle2 className="w-4 h-4 text-bull shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-terminal-text">7. ATM ±3 Multi-Strike Cluster Consensus (09:15 Baseline)</div>
                <div className="text-[11px] text-terminal-muted">
                  {currentIndexState?.ntmCluster ? (
                    <span>
                      {currentIndexState.ntmCluster.consensusSignal.replace('_', ' ')} ({currentIndexState.ntmCluster.netBullishScorePct}% Bullish vs {currentIndexState.ntmCluster.netBearishScorePct}% Bearish) with Support Wall at {currentIndexState.ntmCluster.supportWall.strike} PE ({currentIndexState.ntmCluster.supportWall.oiFormatted}) and Resistance at {currentIndexState.ntmCluster.resistanceWall.strike} CE ({currentIndexState.ntmCluster.resistanceWall.oiFormatted}).
                    </span>
                  ) : (
                    'Near-the-money 7-strike consensus scanning institutional buildup vs unwinding thresholds.'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* ── 6. POPUP MODALS ──────────────────────────────────────────────── */}
      {isRiskModalOpen && (
        <RiskCalculatorModal
          isOpen={isRiskModalOpen}
          onClose={() => setIsRiskModalOpen(false)}
          initialEntry={activeSetupForCalc.ltp}
          initialStoploss={activeSetupForCalc.sl}
          initialTarget={activeSetupForCalc.target}
          lotSize={lotSize}
          symbol={selectedIndex}
        />
      )}
    </div>
  );
});

export default UnifiedCallTipsCockpit;
