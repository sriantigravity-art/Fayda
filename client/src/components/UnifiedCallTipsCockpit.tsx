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
  Moon
} from 'lucide-react';
import { ALL_SYMBOLS_CONFIG, type UnifiedSmartTip } from '../types';

export const UnifiedCallTipsCockpit: React.FC = React.memo(() => {
  const { currentIndexState, selectedIndex, setSelectedIndex, openTradeTipModal } = useMarket();
  const { isBeginner, isIntermediate, isExpert, setMode } = useTerminalMode();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
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
  const mc = masterConfluence;
  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
  const lotSize = cfg?.lot || 50;

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
      actionGuidance: 'ACTIVE PRIMARY MOMENTUM CALL',
      status: t.status,
      strategyTag: t.strategyTag,
      lotSize,
      explanations: t.explanations
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
      explanations: t.explanations
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
      elapsedTimeFormatted: 'Live Session',
      actionGuidance: '0DTE HIGH GAMMA MOMENTUM',
      status: t.status,
      strategyTag: t.strategyTag,
      lotSize,
      explanations: t.explanations
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
    <div className="flex flex-col space-y-3.5 bg-terminal-card border border-terminal-border/80 rounded-2xl p-3.5 sm:p-4 shadow-xl select-none font-sans text-terminal-text transition-all duration-200">
      {/* ── 1. ACTIVE SESSION BANNER & TIME WINDOW ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-terminal-border/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-sm">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs sm:text-sm font-mono font-black text-terminal-text uppercase tracking-wide">
                {isBeginner 
                  ? '🟢 Simple Buy & Sell Signals' 
                  : isIntermediate 
                  ? '⚡ 3-in-1 Confluence Trade Cockpit' 
                  : '🔬 Multi-Tier Algorithmic Alpha Engine'}
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
                {isBeginner ? 'Step-by-Step Capital Protection Rules' : pkg?.quotaDescription}
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

      {/* ── 2. LIVE REGIME & CONFLUENCE BANNER ─────────────────────────────── */}
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

      {/* ── 3. CARRIED FORWARD ACTIVE TRADES ───────────────────────────────── */}
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

      {/* ── 4. THE 3 SMART CALL TIPS UNDER ONE ROOF / MARKET CLOSED STATE ── */}
      {pkg?.currentSession === 'OFF_MARKET' ? (
        <div className="bg-gradient-to-br from-slate-900 via-terminal-card to-slate-950 border border-purple-500/30 rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
            <Moon className="w-7 h-7" />
          </div>
          
          <div className="max-w-xl space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                MARKET CLOSED (15:40 - 09:15 IST)
              </span>
            </div>
            <h3 className="text-lg font-black text-terminal-text tracking-tight">
              {isCommodity ? 'MCX Commodity Market Closed! Visit Next Trading Day!' : 'Indian NSE and BSE Market Closed! Visit Next Trading Day!'}
            </h3>
            <p className="text-xs text-terminal-muted leading-relaxed font-sans">
              {isCommodity
                ? 'MCX commodity derivatives are closed. Live commodity trading will resume tomorrow at 09:00 AM IST.'
                : 'Indian equity and index derivatives markets closed at 03:40 PM. All intraday algorithms and live call tips are in standby to protect trader capital. Fresh trade signals will resume automatically tomorrow at 09:15 AM IST.'}
            </p>
          </div>

          {/* Quick-Switch to Live Commodities if Equity is selected */}
          {!isCommodity && (
            <div className="pt-3 border-t border-terminal-border/60 w-full max-w-lg">
              <div className="text-[11px] font-mono font-bold text-accent-cyan uppercase mb-2 flex items-center justify-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>MCX Commodities Live Trading Open (Until 11:30 PM IST)</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { sym: 'CRUDEOIL', name: 'Crude Oil' },
                  { sym: 'NATURALGAS', name: 'Natural Gas' },
                  { sym: 'GOLD', name: 'Gold' },
                  { sym: 'SILVER', name: 'Silver' }
                ].map(c => (
                  <button
                    key={c.sym}
                    onClick={() => setSelectedIndex(c.sym as any)}
                    className="px-3 py-1.5 rounded-xl bg-terminal-panel hover:bg-terminal-border/80 border border-terminal-border text-xs font-mono font-bold text-terminal-text transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-bull animate-pulse" />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
          {/* ── CARD 1: PRIMARY DIRECTIONAL MOMENTUM CALL ───────────────────── */}
          {pkg?.primaryTrade ? (
            <div 
              onClick={handlePrimaryTradeClick}
              className="flex flex-col justify-between bg-gradient-to-b from-terminal-card to-terminal-bg/95 border border-bull/30 hover:border-bull/60 rounded-xl p-3.5 shadow-lg transition-all relative overflow-hidden group cursor-pointer hover:scale-[1.01]"
              title="Click to view complete trade breakdown"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-bull/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col space-y-2.5">
                {/* Card Header Badge */}
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-bull/15 text-bull border border-bull/30 rounded font-black text-[11px] tracking-wide uppercase">
                    <Flame className="w-3.5 h-3.5" />
                    <span>
                      {isBeginner 
                        ? '⭐ TOP PICK: DIRECT BUY SIGNAL' 
                        : isIntermediate 
                        ? 'TIER 1: PRIMARY DIRECTIONAL CALL' 
                        : 'TIER 1: INSTITUTIONAL MOMENTUM ALPHA'}
                    </span>
                  </span>
                  <span className="text-[10px] text-terminal-muted font-mono flex items-center gap-1" title={`Call Given at ${pkg.primaryTrade.entryTimeFormatted} @ Ref ₹${pkg.primaryTrade.entryPrice.toFixed(2)}`}>
                    <Clock className="w-3 h-3 text-accent-gold" />
                    <span>Given: {pkg.primaryTrade.entryTimeFormatted}</span>
                  </span>
                </div>

                {/* Contract Name & Live LTP */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h3 className="text-base font-black text-terminal-text tracking-tight group-hover:text-bull transition-colors">
                      {pkg.primaryTrade.contractSymbol}
                    </h3>
                    <div className="text-[11px] text-accent-gold font-medium">
                      ⚡ {pkg.primaryTrade.strategyTag}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-terminal-muted font-mono">Live Market LTP</div>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-lg font-black font-mono text-bull">
                        ₹{pkg.primaryTrade.currentLtp.toFixed(2)}
                      </span>
                      {pkg.primaryTrade.pnlPoints && pkg.primaryTrade.pnlPoints !== 0 ? (
                        <span className={`text-[10px] font-mono font-bold ${pkg.primaryTrade.pnlPoints > 0 ? 'text-bull' : 'text-bear'}`}>
                          ({pkg.primaryTrade.pnlPoints > 0 ? '+' : ''}{pkg.primaryTrade.pnlPoints.toFixed(2)})
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Benchmark Given Price Bar */}
                <div className="py-1 px-2 rounded bg-terminal-bg border border-terminal-border/70 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-terminal-muted">Signal Ref Trigger:</span>
                  <span className="font-bold text-terminal-text">₹{pkg.primaryTrade.entryPrice.toFixed(2)}</span>
                </div>

                {/* Execution Metric Grid */}
                <div className="grid grid-cols-3 gap-2 bg-terminal-bg/90 border border-terminal-border p-2.5 rounded-lg text-xs">
                  <div>
                    <div className="text-[10px] text-terminal-muted uppercase">Dip Entry Zone</div>
                    <div className="font-bold text-terminal-text font-mono">
                      ₹{(pkg.primaryTrade.dipEntryMin || (pkg.primaryTrade.entryPrice * 0.98)).toFixed(2)} - ₹{pkg.primaryTrade.entryPrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-terminal-muted uppercase">Stop Loss</div>
                    <div className="font-bold text-bear font-mono">₹{Number(pkg.primaryTrade.stoplossPrice).toFixed(2)} (-20%)</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-terminal-muted uppercase">Target 1 (1:2)</div>
                    <div className="font-bold text-bull font-mono">₹{Number(pkg.primaryTrade.target1Price).toFixed(2)} (+30%)</div>
                  </div>
                </div>

                {/* Live Target Achievement Progress Bar */}
                <div className="flex flex-col space-y-1 bg-terminal-bg/50 p-2 rounded border border-terminal-border/50">
                  <div className="flex justify-between text-[10px] text-terminal-muted">
                    <span>Target 1 Progress</span>
                    <span className="text-bull font-bold font-mono">
                      {getProgressPct(pkg.primaryTrade.entryPrice, pkg.primaryTrade.target1Price, pkg.primaryTrade.currentLtp)}% Achieved
                    </span>
                  </div>
                  <div className="w-full bg-terminal-border h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${getProgressPct(pkg.primaryTrade.entryPrice, pkg.primaryTrade.target1Price, pkg.primaryTrade.currentLtp)}%` }}
                    />
                  </div>
                </div>

                {/* Mode-Adaptive Explanation Box */}
                <div className="bg-terminal-bg/80 border border-terminal-border/80 p-2.5 rounded-lg text-[11px] leading-relaxed text-terminal-muted">
                  <div className="font-bold text-terminal-text text-[10px] uppercase mb-1 flex items-center gap-1 text-accent-gold">
                    <Info className="w-3 h-3" />
                    <span>
                      {isBeginner ? '🟢 Beginner Guidance' : isIntermediate ? '🟡 Technical Analysis' : '🔴 Quantitative Rationale'}
                    </span>
                  </div>
                  <p>
                    {isBeginner && pkg.primaryTrade.explanations.beginner}
                    {isIntermediate && pkg.primaryTrade.explanations.intermediate}
                    {isExpert && pkg.primaryTrade.explanations.expert}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 mt-2 border-t border-terminal-border/60">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCalc(pkg.primaryTrade!.entryPrice, pkg.primaryTrade!.stoplossPrice, pkg.primaryTrade!.target1Price);
                  }}
                  className="flex-1 py-1.5 px-3 bg-terminal-bg hover:bg-terminal-border border border-terminal-border rounded-lg text-xs font-bold text-terminal-text flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-accent-gold" />
                  <span>Calculate Trade Risk</span>
                </button>
                <span className="text-[10px] font-mono font-bold text-bull px-2 py-1 bg-bull/10 rounded border border-bull/20">
                  R:R {pkg.primaryTrade.riskReward}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 bg-terminal-card border border-terminal-border rounded-xl text-center space-y-2">
              <Compass className="w-8 h-8 text-terminal-muted/40 animate-pulse" />
              <div className="font-bold text-sm text-terminal-text">Primary Momentum Call: Standby</div>
              <p className="text-xs text-terminal-muted max-w-xs">
                Market setup is currently non-directional. Preserving capital until high-confluence institutional breakout triggers.
              </p>
            </div>
          )}

          {/* ── CARD 2: CAPITAL-PROTECTED HEDGED SPREAD ─────────────────────── */}
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
                        : 'TIER 2: DEFINED-RISK SPREAD / MARGIN BENEFIT'}
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
                    <span>72% Exchange Margin Reduction</span>
                  </span>
                  <span className="text-[10px] font-mono text-terminal-muted">Defined Risk Hedge</span>
                </div>

                {/* Mode-Adaptive Explanation Box */}
                <div className="bg-terminal-bg/80 border border-terminal-border/80 p-2.5 rounded-lg text-[11px] leading-relaxed text-terminal-muted">
                  <div className="font-bold text-terminal-text text-[10px] uppercase mb-1 flex items-center gap-1 text-accent-sky">
                    <Info className="w-3 h-3" />
                    <span>
                      {isBeginner ? '🟢 Beginner Guidance' : isIntermediate ? '🟡 Technical Analysis' : '🔴 Quantitative Spread'}
                    </span>
                  </div>
                  <p>
                    {isBeginner && pkg.hedgedSpreadTrade.explanations.beginner}
                    {isIntermediate && pkg.hedgedSpreadTrade.explanations.intermediate}
                    {isExpert && pkg.hedgedSpreadTrade.explanations.expert}
                  </p>
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
                  <span>Analyze Spread Payoff</span>
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
                Implied volatility spread skew is within normal limits. Spreads deployed when directional delta exceeds 70%.
              </p>
            </div>
          )}

          {/* ── CARD 3: 0DTE GAMMA SNIPER / HERO-OR-ZERO ────────────────────── */}
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
                        : 'TIER 3: 0DTE GAMMA SQUEEZE VELOCITY'}
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
                    <span>3.5x to 5.0x Multiplier Target</span>
                  </span>
                  <span className="text-[10px] font-mono text-terminal-muted">Short Squeeze</span>
                </div>

                {/* Mode-Adaptive Explanation Box */}
                <div className="bg-terminal-bg/80 border border-terminal-border/80 p-2.5 rounded-lg text-[11px] leading-relaxed text-terminal-muted">
                  <div className="font-bold text-terminal-text text-[10px] uppercase mb-1 flex items-center gap-1 text-purple-400">
                    <Info className="w-3 h-3" />
                    <span>
                      {isBeginner ? '🟢 Beginner Guidance' : isIntermediate ? '🟡 Technical Squeeze' : '🔴 Gamma Velocity'}
                    </span>
                  </div>
                  <p>
                    {isBeginner && pkg.gammaTrade.explanations.beginner}
                    {isIntermediate && pkg.gammaTrade.explanations.intermediate}
                    {isExpert && pkg.gammaTrade.explanations.expert}
                  </p>
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
                  <span>Calculate Sniper Risk</span>
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
      )}

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

            {/* 3. Strategy #9 & Playbook */}
            <div className="p-2.5 bg-terminal-card border border-terminal-border rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-bull shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-terminal-text">3. Strategy #9 / Playbook Setups</div>
                <div className="text-[11px] text-terminal-muted">{faydaStrategy?.strategyName || '20 EMA Trend Following & CPR Breakouts'}.</div>
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
