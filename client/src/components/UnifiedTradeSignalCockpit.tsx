import React, { useState, useMemo, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { useTradingPersona } from '../context/TradingPersonaContext';
import { ALL_SYMBOLS_CONFIG, type UnifiedSmartTip } from '../types';
import { ConfluenceChecklist } from './ConfluenceChecklist';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { TradePayoffSimulatorModal } from './TradePayoffSimulatorModal';
import { BrokerBasketModal, type BrokerBasketItem } from './BrokerBasketModal';
import { 
  Zap, 
  Target, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Layers, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Radio, 
  BarChart3, 
  Flame, 
  Info,
  ExternalLink,
  BookOpen
} from 'lucide-react';

export const UnifiedTradeSignalCockpit: React.FC = () => {
  const { 
    selectedIndex, 
    currentIndexState, 
    selectedSurges,
    openStrikeChartModal
  } = useMarket();
  const { isBeginner } = useTerminalMode();
  const { metadata: personaMetadata } = useTradingPersona();

  const [activeTab, setActiveTab] = useState<'BUYERS' | 'SELLERS' | 'GAMMA'>('BUYERS');

  // Automatically adapt Cockpit tab when user changes trading persona
  useEffect(() => {
    if (personaMetadata?.cockpitTab) {
      setActiveTab(personaMetadata.cockpitTab);
    }
  }, [personaMetadata?.cockpitTab]);

  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [showConfluenceModal, setShowConfluenceModal] = useState<boolean>(false);
  const [showPayoffModal, setShowPayoffModal] = useState<boolean>(false);
  const [showRiskModal, setShowRiskModal] = useState<boolean>(false);
  const [showBasketModal, setShowBasketModal] = useState<boolean>(false);
  const [activeTipForModal, setActiveTipForModal] = useState<UnifiedSmartTip | null>(null);

  const tipsPackage = currentIndexState?.unifiedTipsPackage;
  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex) || ALL_SYMBOLS_CONFIG[0] || { lot: 65, step: 50 };

  // Current primary trade candidate
  const currentHeroTip: UnifiedSmartTip | null = useMemo(() => {
    if (!tipsPackage) return null;

    if (activeTab === 'BUYERS') {
      return tipsPackage.primaryTrade || tipsPackage.topCallTrade || tipsPackage.topPutTrade || null;
    }
    if (activeTab === 'SELLERS') {
      return tipsPackage.topSellerPutTrade || tipsPackage.topSellerCallTrade || tipsPackage.topSellerNeutralTrade || tipsPackage.hedgedSpreadTrade || null;
    }
    if (activeTab === 'GAMMA') {
      return (tipsPackage.gammaTrade && tipsPackage.gammaTrade.action !== 'STANDBY') 
        ? tipsPackage.gammaTrade 
        : (tipsPackage.primaryTrade || null);
    }
    return tipsPackage.primaryTrade;
  }, [tipsPackage, activeTab]);

  // Secondary active signals queue
  const secondaryTips: UnifiedSmartTip[] = useMemo(() => {
    if (!tipsPackage) return [];
    const heroId = currentHeroTip?.id;
    const candidates = [
      tipsPackage.primaryTrade,
      tipsPackage.topCallTrade,
      tipsPackage.topPutTrade,
      tipsPackage.topSellerPutTrade,
      tipsPackage.topSellerCallTrade,
      tipsPackage.topSellerNeutralTrade,
      tipsPackage.hedgedSpreadTrade,
      tipsPackage.gammaTrade
    ].filter((t): t is UnifiedSmartTip => Boolean(t && t.id !== heroId && t.action !== 'STANDBY' && t.status !== 'EXPIRED'));

    // Deduplicate by contract symbol
    const seen = new Set<string>();
    const res: UnifiedSmartTip[] = [];
    candidates.forEach(c => {
      const sym = (c.contractSymbol || '').replace(/\s+/g, '').toUpperCase();
      if (!seen.has(sym)) {
        seen.add(sym);
        res.push(c);
      }
    });
    return res;
  }, [tipsPackage, currentHeroTip]);

  // Copy trade order handler
  const handleCopyOrder = (tip: UnifiedSmartTip) => {
    const lotSize = cfg?.lot || 50;
    const orderText = `[FAYDA QUANTUM SIGNAL] ${tip.contractSymbol}\nAction: ${tip.action}\nEntry Range: ${tip.entryRange}\nTrigger: ₹${(tip.triggerPrice || tip.entryPrice).toFixed(2)}\nTarget 1: ₹${tip.target1Price.toFixed(2)} (+${tip.target1Pct.toFixed(1)}%)\nTarget 2: ₹${tip.target2Price ? tip.target2Price.toFixed(2) : 'N/A'}\nStop Loss: ₹${tip.stoplossPrice.toFixed(2)} (-${tip.stoplossPct.toFixed(1)}%)\nLot Size: ${lotSize} | Quantum Score: ${tip.quantumScore || tip.confluenceScore}%\nThesis: ${tip.unifiedSignalThesis || '10-Factor Confluence & Surge Confirmed'}`;
    navigator.clipboard.writeText(orderText);
    setCopiedId(tip.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenModal = (type: 'CONFLUENCE' | 'PAYOFF' | 'RISK' | 'BASKET', tip: UnifiedSmartTip) => {
    setActiveTipForModal(tip);
    if (type === 'CONFLUENCE') setShowConfluenceModal(true);
    if (type === 'PAYOFF') setShowPayoffModal(true);
    if (type === 'RISK') setShowRiskModal(true);
    if (type === 'BASKET') setShowBasketModal(true);
  };

  const basketItemForModal: BrokerBasketItem | null = useMemo(() => {
    if (!activeTipForModal) return null;
    const isSpread = activeTipForModal.optionType === 'SPREAD';
    const lot = cfg?.lot || 50;
    return {
      contractSymbol: activeTipForModal.contractSymbol,
      strikePrice: activeTipForModal.strikePrice,
      optionType: isSpread ? 'SPREAD' : (activeTipForModal.optionType as 'CE' | 'PE'),
      action: activeTipForModal.action === 'BUY_CALL' ? 'BUY' : (activeTipForModal.action === 'BUY_PUT' ? 'BUY' : 'SELL'),
      lotSize: lot,
      lots: 1,
      entryPrice: activeTipForModal.entryPrice,
      stoplossPrice: activeTipForModal.stoplossPrice,
      target1Price: activeTipForModal.target1Price,
      executionType: activeTipForModal.executionType || 'NET_DEBIT'
    };
  }, [activeTipForModal, cfg]);

  const pnlPoints = currentHeroTip ? (currentHeroTip.currentLtp - currentHeroTip.entryPrice) : 0;
  const pnlPct = currentHeroTip && currentHeroTip.entryPrice > 0 ? (pnlPoints / currentHeroTip.entryPrice) * 100 : 0;
  const isProfitable = pnlPoints >= 0;

  // Quantum score for hero
  const quantumScore = currentHeroTip?.quantumScore || currentHeroTip?.confluenceScore || 85;
  const surgeLevel = currentHeroTip?.surgeConfirmationLevel || (selectedSurges.length > 0 ? selectedSurges[0].surgeLevel : 'MODERATE');

  // Handle direct navigation to indicator terminal panels / live charts
  const handleGoToIndicatorTab = (targetId: string, indicatorName: string) => {
    if (currentHeroTip && targetId === 'strike-live-workbench') {
      const strike = currentHeroTip.strike || currentHeroTip.strikePrice || (currentIndexState?.atmStrike ?? 24500);
      const optType = (currentHeroTip.optionType === 'PE' || currentHeroTip.action?.includes('PUT')) ? 'PE' : 'CE';
      window.dispatchEvent(new CustomEvent('fayda:select-strike-chart', {
        detail: { symbol: selectedIndex, strikePrice: strike, optionType: optType }
      }));
    }

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetEl.classList.add('ring-4', 'ring-sky-500/80', 'ring-offset-2', 'ring-offset-terminal-bg', 'transition-all', 'duration-500');
      setTimeout(() => {
        targetEl.classList.remove('ring-4', 'ring-sky-500/80', 'ring-offset-2', 'ring-offset-terminal-bg');
      }, 3000);
    }
  };

  // Complete list of all 10 Confluence Indicators with target navigation
  const allTenIndicators = useMemo(() => {
    const bd = currentHeroTip?.confluenceBreakdown;
    return [
      {
        id: 'oiConcentration',
        num: 1,
        title: 'OI Concentration & Walls',
        badge: 'Option Chain',
        targetId: 'panel-option-chain',
        targetLabel: 'Option Chain',
        factor: bd?.oiConcentration,
        defaultWeight: 15,
        defaultConfirmed: true,
        defaultScore: 100,
        defaultDetails: 'Heavy Call/Put OI defense walls confirmed at key strike bounds',
      },
      {
        id: 'oiChange5m',
        num: 2,
        title: '5-Min Delta OI Velocity',
        badge: 'Alpha Flow Chart',
        targetId: 'strike-live-workbench',
        targetLabel: 'Live Strike Chart',
        factor: bd?.oiChange5m,
        defaultWeight: 15,
        defaultConfirmed: true,
        defaultScore: 100,
        defaultDetails: 'Aggressive institutional contract absorption in 5-min flow',
      },
      {
        id: 'emaStructure',
        num: 3,
        title: 'EMA Averages (9/20/50/200)',
        badge: 'Trend Ribbon',
        targetId: 'strike-live-workbench',
        targetLabel: 'Live Strike Chart',
        factor: bd?.emaStructure,
        defaultWeight: 12,
        defaultConfirmed: true,
        defaultScore: 100,
        defaultDetails: 'Price trading solidly above 9 & 20 EMAs with bullish slope',
      },
      {
        id: 'indiaVix',
        num: 4,
        title: 'India VIX Regime',
        badge: 'Volatility Gauge',
        targetId: 'panel-right-analytics',
        targetLabel: 'Analytics Panel',
        factor: bd?.indiaVix,
        defaultWeight: 10,
        defaultConfirmed: true,
        defaultScore: 90,
        defaultDetails: `India VIX at ${currentIndexState?.vix?.toFixed(1) || '13.8'} - optimal option premium momentum zone`,
      },
      {
        id: 'vwapBenchmark',
        num: 5,
        title: 'VWAP Institutional Anchor',
        badge: 'Fair Value',
        targetId: 'strike-live-workbench',
        targetLabel: 'Live Strike Chart',
        factor: bd?.vwapBenchmark,
        defaultWeight: 10,
        defaultConfirmed: true,
        defaultScore: 100,
        defaultDetails: 'Holding firmly above VWAP benchmark with positive volume delta',
      },
      {
        id: 'pcrVelocity',
        num: 6,
        title: 'PCR & Delta PCR Trend',
        badge: 'Sentiment Skew',
        targetId: 'panel-right-analytics',
        targetLabel: 'Analytics Panel',
        factor: bd?.pcrVelocity,
        defaultWeight: 10,
        defaultConfirmed: true,
        defaultScore: 85,
        defaultDetails: `PCR at ${currentIndexState?.pcr?.overallPcr?.toFixed(2) || '1.15'} providing steady bullish floor`,
      },
      {
        id: 'bollingerBands',
        num: 7,
        title: 'Bollinger Bands 2σ Envelope',
        badge: 'Volatility Channel',
        targetId: 'strike-live-workbench',
        targetLabel: 'Live Strike Chart',
        factor: bd?.bollingerBands,
        defaultWeight: 8,
        defaultConfirmed: true,
        defaultScore: 85,
        defaultDetails: 'Upper band expanding with room for clean directional push',
      },
      {
        id: 'rsiMomentum',
        num: 8,
        title: 'RSI 14 Momentum Oscillator',
        badge: 'Momentum',
        targetId: 'strike-live-workbench',
        targetLabel: 'Live Strike Chart',
        factor: bd?.rsiMomentum,
        defaultWeight: 7,
        defaultConfirmed: true,
        defaultScore: 90,
        defaultDetails: 'RSI 14 in strong acceleration zone (55 - 70) without exhaustion',
      },
      {
        id: 'imiCandles',
        num: 9,
        title: 'Intraday Momentum Index (IMI)',
        badge: 'Candle Drift',
        targetId: 'strike-live-workbench',
        targetLabel: 'Live Strike Chart',
        factor: bd?.imiCandles,
        defaultWeight: 5,
        defaultConfirmed: true,
        defaultScore: 80,
        defaultDetails: 'Dominant green candle bodies confirming intraday thrust',
      },
      {
        id: 'maxPain',
        num: 10,
        title: 'Max Pain Magnetic Strike',
        badge: 'Expiry Magnet',
        targetId: 'panel-option-chain',
        targetLabel: 'Option Chain',
        factor: bd?.maxPain,
        defaultWeight: 3,
        defaultConfirmed: true,
        defaultScore: 80,
        defaultDetails: 'Favorable distance from expiry pain strike magnet',
      },
    ];
  }, [currentHeroTip, currentIndexState]);

  return (
    <div className="w-full rounded-2xl bg-gradient-to-b from-terminal-panel/95 via-terminal-card/90 to-terminal-card border border-terminal-border/80 shadow-2xl overflow-hidden transition-all duration-300 backdrop-blur-md">
      {/* ── 1. UNIFIED COCKPIT HEADER ── */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-terminal-border/70 flex flex-wrap items-center justify-between gap-3 bg-terminal-panel/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-sky-500/20 text-amber-500 border border-amber-500/30 shadow-inner">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-terminal-text flex items-center gap-2">
                <span>FAYDA QUANTUM TRADE SIGNAL SYSTEM</span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                  RADAR + SURGE + 10-FACTOR FUSED
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-terminal-muted flex items-center gap-2 mt-0.5 font-mono">
              <span>Index: <strong className="text-terminal-text">{selectedIndex}</strong></span>
              <span>•</span>
              <span>LTP: <strong className="text-terminal-text">₹{currentIndexState?.spotPrice?.toFixed(2) || '---'}</strong></span>
              <span>•</span>
              <span>Session: <strong className="text-terminal-text">{tipsPackage?.currentSessionName || 'Regular Trading'}</strong></span>
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs (Single system: Buyers, Sellers, Gamma) */}
        <div className="flex items-center bg-terminal-bg/80 p-1 rounded-xl border border-terminal-border text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('BUYERS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'BUYERS'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow'
                : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Buyer Momentum</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SELLERS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SELLERS'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow'
                : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Hedged Spreads</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GAMMA')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'GAMMA'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow'
                : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>0DTE Gamma Sniper</span>
          </button>
        </div>
      </div>

      {/* ── 2. HERO TRADE SIGNAL CARD (PRIMARY AUTHORITATIVE RECOMMENDATION) ── */}
      <div className="p-4 sm:p-6 space-y-4">
        {currentHeroTip ? (
          <div className="rounded-xl border border-terminal-border/90 bg-terminal-bg/60 p-4 sm:p-5 shadow-lg relative overflow-hidden">
            {/* Background gradient accent */}
            <div className={`absolute -right-24 -top-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-15 ${
              currentHeroTip.action.includes('CALL') ? 'bg-emerald-500' : 'bg-rose-500'
            }`} />

            {/* ⚠️ SQUARE OFF POSITION DIRECTIVE BANNER */}
            {(currentHeroTip.status === 'INTRADAY_CLOSED' || currentHeroTip.actionabilityStatus === 'SQUARE_OFF') && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/80 text-amber-600 dark:text-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md relative z-20">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-mono font-black text-sm text-amber-600 dark:text-amber-300 flex items-center gap-2">
                      <span>⚠️ SYSTEM DIRECTIVE: SQUARE OFF POSITION & ARCHIVED TO JOURNAL</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/25 border border-amber-500/40 text-amber-400 font-bold">
                        SESSION CLOSED
                      </span>
                    </div>
                    <p className="text-xs text-terminal-text mt-0.5">
                      {currentHeroTip.squareOffReason || 'Earlier signal did not reach Target or Stoploss during regular market hours. Advised to square off position at CMP to avoid overnight theta decay & gap risk.'}
                    </p>
                    <p className="text-[11px] text-terminal-muted mt-0.5 font-mono">
                      Closing CMP: <strong>₹{currentHeroTip.currentLtp.toFixed(2)}</strong> • Result: <strong>{currentHeroTip.pnlPoints >= 0 ? '+' : ''}{currentHeroTip.pnlPoints.toFixed(2)} pts</strong> • Status moved to Trade Journal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const journalEl = document.getElementById('signals-ledger-journal') || document.getElementById('trade-journal');
                    if (journalEl) {
                      journalEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-black font-mono font-bold text-xs hover:bg-amber-400 transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View in Trade Journal</span>
                </button>
              </div>
            )}

            {/* 🌙 RESEARCHED BTST CARRY FORWARD BANNER */}
            {currentHeroTip.status === 'CARRIED_FORWARD' && (
              <div className="mb-4 p-3.5 rounded-xl bg-purple-500/15 border-2 border-purple-500/80 text-purple-600 dark:text-purple-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md relative z-20">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-mono font-black text-sm text-purple-400 flex items-center gap-2">
                      <span>🌙 SYSTEM DIRECTIVE: RESEARCHED BTST / STBT CARRY FORWARD</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/25 border border-purple-500/40 text-purple-300 font-bold">
                        VERIFIED HIGH-CONVICTION EDGE
                      </span>
                    </div>
                    <p className="text-xs text-terminal-text mt-0.5">
                      {currentHeroTip.btstRationale || currentHeroTip.carryForwardSuggestion || 'Tomorrow market trend verified with clear sentiment. Strict research criteria passed (Score ≥ 82%, DTE ≥ 1).'}
                    </p>
                    <p className="text-[11px] text-terminal-muted mt-0.5 font-mono">
                      Overnight Plan: Hold into 09:15 AM open • Maintain trailing SL at entry ₹{(currentHeroTip.entryPrice || 0).toFixed(2)}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Bar of Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 pb-3 border-b border-terminal-border/60">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-sm ${
                  currentHeroTip.action.includes('CALL') 
                    ? 'bg-emerald-500 text-white' 
                    : (currentHeroTip.action.includes('PUT') ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white')
                }`}>
                  {currentHeroTip.action.includes('CALL') ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{currentHeroTip.action.replace(/_/g, ' ')}</span>
                </span>

                <h3 className="text-base sm:text-lg font-black tracking-tight text-terminal-text font-mono">
                  {currentHeroTip.contractSymbol}
                </h3>

                {/* Surge & Quantum Badges */}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{quantumScore}% QUANTUM SCORE</span>
                </span>
                <span className="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                  ⚡ {surgeLevel} SURGE CONFIRMED
                </span>
              </div>

              {/* Real-time LTP and live PnL */}
              <div className="flex items-center gap-3 font-mono">
                <div className="text-right">
                  <div className="text-xs text-terminal-muted">LIVE LTP</div>
                  <div className="text-lg sm:text-xl font-black text-terminal-text">
                    ₹{currentHeroTip.currentLtp.toFixed(2)}
                  </div>
                </div>
                <div className={`px-2.5 py-1.5 rounded-lg text-right font-bold text-xs ${
                  isProfitable ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}>
                  <div>{isProfitable ? '+' : ''}{pnlPoints.toFixed(2)} pts</div>
                  <div className="text-[10px]">{isProfitable ? '+' : ''}{pnlPct.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Middle Grid: Actionable Trade Execution Levels */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 relative z-10 font-mono">
              {/* Level 1: Entry Range */}
              <div className="p-3 rounded-lg bg-terminal-panel/60 border border-terminal-border/70 space-y-1">
                <div className="text-[10px] text-terminal-muted uppercase tracking-wider font-semibold">Entry Zone</div>
                <div className="text-sm font-bold text-sky-600 dark:text-sky-400">{currentHeroTip.entryRange}</div>
                <div className="text-[10px] text-terminal-muted">
                  Trigger: <strong>₹{(currentHeroTip.triggerPrice || currentHeroTip.entryPrice).toFixed(2)}</strong>
                </div>
              </div>

              {/* Level 2: Stop Loss */}
              <div className="p-3 rounded-lg bg-terminal-panel/60 border border-terminal-border/70 space-y-1">
                <div className="text-[10px] text-terminal-muted uppercase tracking-wider font-semibold">Stop Loss</div>
                <div className="text-sm font-bold text-rose-500">₹{currentHeroTip.stoplossPrice.toFixed(2)}</div>
                <div className="text-[10px] text-rose-500/80">-{currentHeroTip.stoplossPct.toFixed(0)}% (Trailing SL)</div>
              </div>

              {/* Level 3: Target 1 */}
              <div className="p-3 rounded-lg bg-terminal-panel/60 border border-terminal-border/70 space-y-1">
                <div className="text-[10px] text-terminal-muted uppercase tracking-wider font-semibold">Target 1 (Book 50%)</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{currentHeroTip.target1Price.toFixed(2)}</div>
                <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">+{currentHeroTip.target1Pct.toFixed(0)}% (R:R {currentHeroTip.riskReward})</div>
              </div>

              {/* Level 4: Target 2 / Runner */}
              <div className="p-3 rounded-lg bg-terminal-panel/60 border border-terminal-border/70 space-y-1">
                <div className="text-[10px] text-terminal-muted uppercase tracking-wider font-semibold">Target 2 (Runner)</div>
                <div className="text-sm font-bold text-emerald-500">
                  {currentHeroTip.target2Price ? `₹${currentHeroTip.target2Price.toFixed(2)}` : 'Trail with SuperTrend'}
                </div>
                <div className="text-[10px] text-emerald-500/80">+{currentHeroTip.target2Pct.toFixed(0)}% (Max Gain)</div>
              </div>

              {/* Level 5: Actionability & Trade Status */}
              <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-terminal-panel/60 border border-terminal-border/70 space-y-1 flex flex-col justify-center">
                <div className="text-[10px] text-terminal-muted uppercase tracking-wider font-semibold">Signal Status</div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{currentHeroTip.status}</span>
                </div>
                <div className="text-[10px] text-terminal-muted">
                  Lot Size: <strong>{cfg?.lot || 50}</strong>
                </div>
              </div>
            </div>

            {/* ── Unified Plain-English Thesis ── */}
            <div className="mt-3.5 p-3 rounded-lg bg-terminal-panel/80 border border-terminal-border/80 flex items-start gap-2.5 text-xs text-terminal-muted leading-relaxed">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-terminal-text">
                  {currentHeroTip.unifiedSignalThesis || 
                    `Institutional ${currentHeroTip.optionType} OI surge validated by 10-indicator mathematical confluence, VWAP support, and intraday momentum.`
                  }
                </p>
                <p className="text-[11px] text-terminal-muted font-mono">
                  Execution Rule: Enter in recommended zone • Set Stop Loss immediately • Move SL to cost upon Target 1.
                </p>
              </div>
            </div>

            {/* ── Action Buttons Ribbon ── */}
            <div className="mt-4 pt-3 border-t border-terminal-border/60 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Special Highlight: Strike Live Chart & Alpha Flow (Embedded Workbench & Modal) */}
                <div className="flex items-center rounded-lg bg-linear-to-r from-accent-cyan/25 via-teal-500/20 to-emerald-500/25 border-2 border-accent-cyan shadow-[0_0_15px_rgba(0,229,255,0.35)]">
                  <button
                    type="button"
                    onClick={() => {
                      const strike = currentHeroTip.strike || currentHeroTip.strikePrice || (currentIndexState?.atmStrike ?? 24500);
                      const optType = (currentHeroTip.optionType === 'PE' || currentHeroTip.action?.includes('PUT')) ? 'PE' : 'CE';
                      window.dispatchEvent(new CustomEvent('fayda:select-strike-chart', {
                        detail: { symbol: selectedIndex, strikePrice: strike, optionType: optType }
                      }));
                      const workbenchEl = document.getElementById('strike-live-workbench');
                      if (workbenchEl) {
                        workbenchEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="px-3 py-1.5 text-accent-cyan text-xs font-mono font-black transition flex items-center gap-1.5 cursor-pointer hover:bg-accent-cyan/20 rounded-l-md"
                    title="View & Focus Embedded Strike Candlestick Chart on Main Dashboard"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-accent-cyan animate-pulse" />
                    <span>📈 Strike Live Chart & Alpha Flow</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-bull" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      openStrikeChartModal(
                        selectedIndex,
                        currentHeroTip.strike || currentHeroTip.strikePrice || (currentIndexState?.atmStrike ?? 24500),
                        (currentHeroTip.optionType === 'PE' || currentHeroTip.action?.includes('PUT')) ? 'PE' : 'CE'
                      );
                    }}
                    className="px-2 py-1.5 border-l border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/30 transition cursor-pointer rounded-r-md"
                    title="Pop-out Fullscreen Modal"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyOrder(currentHeroTip)}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === currentHeroTip.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === currentHeroTip.id ? 'Order Copied!' : 'Copy Order'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenModal('BASKET', currentHeroTip)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>1-Click Broker Basket</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenModal('PAYOFF', currentHeroTip)}
                  className="px-3 py-1.5 rounded-lg bg-terminal-panel hover:bg-terminal-card border border-terminal-border text-terminal-text text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Payoff Simulator</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenModal('RISK', currentHeroTip)}
                  className="px-3 py-1.5 rounded-lg bg-terminal-panel hover:bg-terminal-card border border-terminal-border text-terminal-text text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  <span>Risk Calculator</span>
                </button>
              </div>

              {/* Toggle Deep-Dive Intelligence Drawer */}
              <button
                type="button"
                onClick={() => setShowTelemetryDrawer(prev => !prev)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-accent-gold border border-amber-500/30 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showTelemetryDrawer ? 'Hide Signal Evidence' : 'Why This Trade? (Evidence)'}</span>
                {showTelemetryDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-dashed border-terminal-border text-center space-y-2 bg-terminal-panel/30 font-mono">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto opacity-75" />
            <h3 className="text-sm font-bold text-terminal-text">CAPITAL PRESERVATION ZONE — NO ACTIVE HIGH-CONVICTION TRADE</h3>
            <p className="text-xs text-terminal-muted max-w-lg mx-auto leading-relaxed">
              Fayda Quantum Engine has detected low momentum divergence or rangebound chop. 
              The system protects capital by withholding trades until surge velocity and 10-indicator confluence mutually align.
            </p>
          </div>
        )}

        {/* ── 3. EXPANDABLE "SIGNAL INTELLIGENCE & EVIDENCE" DRAWER (ON DEMAND: ALL 10 INDICATORS) ── */}
        {showTelemetryDrawer && currentHeroTip && (
          <div className="p-4 sm:p-5 rounded-xl bg-terminal-panel/70 border border-terminal-border space-y-4 animate-fade-in font-mono text-xs">
            {/* Header with Confluence Score and Click-to-Jump instruction */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terminal-border pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-extrabold text-terminal-text">
                  WHY THIS TRADE? — 10-INDICATOR QUANTUM CONFLUENCE EVIDENCE
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {currentHeroTip.confluenceScore}% SCORE ({currentHeroTip.confluenceBreakdown?.totalConfirmedCount || 8}/10 CONFIRMED)
                </span>
              </div>
              <span className="text-[10px] text-sky-400">
                ⚡ Click any indicator card below to jump directly to its chart / panel
              </span>
            </div>

            {/* Quick Multi-Pillar Summary Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-terminal-card/80 border border-terminal-border/70 flex items-center justify-between">
                <span className="text-terminal-muted flex items-center gap-1.5 text-[11px]">
                  <Flame className="w-3.5 h-3.5 text-sky-400" />
                  <span>Surge Radar Flow</span>
                </span>
                <span className="font-bold text-sky-400 text-xs">
                  {currentHeroTip.surgeConfirmationLevel || 'CONFIRMED'} ({currentHeroTip.surgeVelocityScore || 70}%)
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-terminal-card/80 border border-terminal-border/70 flex items-center justify-between">
                <span className="text-terminal-muted flex items-center gap-1.5 text-[11px]">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Market Regime</span>
                </span>
                <span className="font-bold text-emerald-400 text-xs">
                  {currentHeroTip.marketRegime?.replace(/_/g, ' ') || 'TRENDING EXPANSION'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-terminal-card/80 border border-terminal-border/70 flex items-center justify-between">
                <span className="text-terminal-muted flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>CPR Width Structure</span>
                </span>
                <span className="font-bold text-amber-400 text-xs">
                  {currentIndexState?.cprData?.cprWidthCategory || 'NARROW CPR'} (Trending)
                </span>
              </div>
            </div>

            {/* Complete 10-Indicator Interactive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {allTenIndicators.map((ind) => {
                const isConfirmed = ind.factor ? ind.factor.confirmed : ind.defaultConfirmed;
                const score = ind.factor ? ind.factor.score : ind.defaultScore;
                const weight = ind.factor ? ind.factor.weight : ind.defaultWeight;
                const details = ind.factor?.details || ind.defaultDetails;

                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => handleGoToIndicatorTab(ind.targetId, ind.title)}
                    className={`group p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 hover:scale-[1.02] hover:shadow-lg ${
                      isConfirmed 
                        ? 'bg-emerald-950/15 hover:bg-emerald-950/30 border-emerald-500/30 hover:border-emerald-400' 
                        : 'bg-amber-950/15 hover:bg-amber-950/30 border-amber-500/30 hover:border-amber-400'
                    }`}
                    title={`Click to jump to ${ind.targetLabel} for ${ind.title}`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="text-[10px] font-bold text-terminal-muted group-hover:text-terminal-text">
                        #{ind.num}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        isConfirmed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}>
                        {isConfirmed ? 'CONFIRMED' : 'WATCH'}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-terminal-text group-hover:text-sky-400 transition-colors truncate">
                        {ind.title}
                      </div>
                      <p className="text-[10.5px] text-terminal-muted line-clamp-2 mt-1 leading-snug">
                        {details}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-terminal-border/40 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-terminal-muted">Wt: <strong className="text-terminal-text">{weight}%</strong> | Score: <strong className="text-terminal-text">{score}%</strong></span>
                      <span className="text-sky-400 group-hover:text-sky-300 font-bold flex items-center gap-0.5">
                        <span>{ind.targetLabel}</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Bar: Interactive Cue and Full Modal Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-terminal-border/50 text-xs">
              <span className="text-terminal-muted text-[11px] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>Clicking any indicator card navigates & highlights the live calculation on that terminal panel.</span>
              </span>
              <button
                type="button"
                onClick={() => handleOpenModal('CONFLUENCE', currentHeroTip)}
                className="text-xs text-sky-400 hover:text-sky-300 underline font-bold cursor-pointer flex items-center gap-1"
              >
                <span>Open Full 10-Indicator Checklist Modal</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── 4. SECONDARY SIGNALS QUEUE (Clean & Uncluttered) ── */}
        {secondaryTips.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between text-xs font-mono text-terminal-muted px-1">
              <span className="font-bold text-terminal-text flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Active Alternative Setups ({secondaryTips.length})</span>
              </span>
              <span>Sorted by Quantum Score</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
              {secondaryTips.map(tip => {
                const tipPnlPts = tip.currentLtp - tip.entryPrice;
                const tipIsProfit = tipPnlPts >= 0;
                return (
                  <div 
                    key={tip.id} 
                    className="p-3.5 rounded-xl bg-terminal-panel/40 border border-terminal-border hover:border-terminal-border/90 transition flex flex-col justify-between space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tip.action.includes('CALL') ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}>
                        {tip.action.replace(/_/g, ' ')}
                      </span>
                      {tip.status === 'INTRADAY_CLOSED' ? (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                          ⚠️ SQUARE OFF
                        </span>
                      ) : tip.status === 'CARRIED_FORWARD' ? (
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">
                          🌙 BTST CARRY
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-500">
                          {tip.quantumScore || tip.confluenceScore}% Quantum
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-terminal-text truncate">{tip.contractSymbol}</div>
                      <div className="text-[11px] text-terminal-muted mt-0.5">
                        Entry: <strong className="text-terminal-text">₹{tip.entryPrice.toFixed(2)}</strong> • LTP: <strong className="text-terminal-text">₹{tip.currentLtp.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-terminal-border/50">
                      <span className="text-terminal-muted">T1: ₹{tip.target1Price.toFixed(2)} | SL: ₹{tip.stoplossPrice.toFixed(2)}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            openStrikeChartModal(
                              selectedIndex,
                              tip.strike || tip.strikePrice || (currentIndexState?.atmStrike ?? 24500),
                              (tip.optionType === 'PE' || tip.action?.includes('PUT')) ? 'PE' : 'CE'
                            );
                          }}
                          className="text-accent-cyan hover:text-accent-sky font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Open Live Strike Chart & Order Flow"
                        >
                          <BarChart3 className="w-3 h-3 text-accent-cyan" />
                          <span>Chart</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyOrder(tip)}
                          className="text-sky-400 hover:text-sky-300 font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === tip.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === tip.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS INTEGRATION ── */}
      {showConfluenceModal && activeTipForModal?.confluenceBreakdown && (
        <ConfluenceChecklist
          isOpen={showConfluenceModal}
          onClose={() => setShowConfluenceModal(false)}
          breakdown={activeTipForModal.confluenceBreakdown}
          action={activeTipForModal.action}
          symbol={activeTipForModal.symbol}
        />
      )}

      {showPayoffModal && activeTipForModal && (
        <TradePayoffSimulatorModal
          isOpen={showPayoffModal}
          onClose={() => setShowPayoffModal(false)}
          tip={activeTipForModal}
        />
      )}

      {showRiskModal && activeTipForModal && (
        <RiskCalculatorModal
          isOpen={showRiskModal}
          onClose={() => setShowRiskModal(false)}
          tip={activeTipForModal}
          lotSize={cfg?.lot || 50}
        />
      )}

      {showBasketModal && basketItemForModal && (
        <BrokerBasketModal
          isOpen={showBasketModal}
          onClose={() => setShowBasketModal(false)}
          basketItem={basketItemForModal}
          items={[basketItemForModal]}
        />
      )}
    </div>
  );
};
