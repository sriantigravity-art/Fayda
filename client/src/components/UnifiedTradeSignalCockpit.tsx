import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  BookOpen,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const UnifiedTradeSignalCockpit: React.FC = () => {
  const { 
    selectedIndex, 
    setSelectedIndex,
    currentIndexState, 
    indices,
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

  // Asset category filter, search & tabs ref
  const [assetCategory, setAssetCategory] = useState<'ALL' | 'INDICES' | 'COMMODITIES' | 'NIFTY50_STOCKS'>('ALL');
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const assetTabsRef = useRef<HTMLDivElement>(null);

  // Scroll asset tabs left/right
  const scrollAssetTabs = (direction: 'left' | 'right') => {
    if (assetTabsRef.current) {
      const amount = direction === 'left' ? -260 : 260;
      assetTabsRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Filter assets based on category and search
  const filteredAssets = useMemo(() => {
    return ALL_SYMBOLS_CONFIG.filter(item => {
      if (assetCategory !== 'ALL' && item.category !== assetCategory) return false;
      if (assetSearchQuery.trim()) {
        const q = assetSearchQuery.toLowerCase().trim();
        return item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [assetCategory, assetSearchQuery]);

  // Keep selected tab centered in view
  useEffect(() => {
    const activeEl = document.getElementById(`asset-tab-${selectedIndex}`);
    if (activeEl && assetTabsRef.current) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedIndex]);

  // Asset signal summary helper to show live badge on tabs
  const getAssetSignalSummary = (sym: string) => {
    const state = indices ? indices[sym] : null;
    const pkg = state?.unifiedTipsPackage;
    const hero = pkg?.primaryTrade || pkg?.topCallTrade || pkg?.topPutTrade || pkg?.gammaTrade;
    const spot = state?.spotPrice;
    if (!hero || hero.action === 'STANDBY') {
      return { hasSignal: false, spot };
    }
    const isTargetHit = hero.status === 'TARGET1_HIT' || hero.status === 'TARGET2_HIT' || hero.status === 'TARGET_HIT';
    const isSlHit = hero.status === 'SL_HIT' || hero.status === 'STOPLOSS_HIT';
    const isSquareOff = hero.status === 'INTRADAY_CLOSED' || hero.status === 'SQUARE_OFF';
    const isCall = hero.action.includes('CALL');
    const isPut = hero.action.includes('PUT');

    return {
      hasSignal: true,
      spot,
      action: hero.action,
      contractSymbol: hero.contractSymbol,
      isCall,
      isPut,
      isTargetHit,
      isSlHit,
      isSquareOff,
      quantumScore: hero.quantumScore || hero.confluenceScore
    };
  };

  const tipsPackage = currentIndexState?.unifiedTipsPackage;
  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex) || ALL_SYMBOLS_CONFIG[0] || { lot: 65, step: 50 };

  // Helper to check if a trade has reached a terminal milestone (Target Hit, SL Hit, Square Off)
  const isCompletedTrade = (tip: UnifiedSmartTip | null | undefined): boolean => {
    if (!tip) return false;
    const s = String(tip.status || '').toUpperCase();
    const a = String(tip.actionabilityStatus || '').toUpperCase();
    return s.includes('TARGET') || s.includes('SL_HIT') || s.includes('STOPLOSS') || s.includes('CLOSED') || s.includes('SQUARE_OFF') ||
           a.includes('TARGET') || a.includes('SL_HIT') || a.includes('SQUARE_OFF');
  };

  // Helper to prioritize fresh active signals: "show new signals only if given"
  const getBestTip = (candidates: (UnifiedSmartTip | null | undefined)[]): UnifiedSmartTip | null => {
    const valid = candidates.filter((t): t is UnifiedSmartTip => Boolean(t && t.action !== 'STANDBY' && t.status !== 'EXPIRED'));
    // 1. Pick first active (non-completed) signal if available
    const active = valid.find(t => !isCompletedTrade(t));
    if (active) return active;
    // 2. Fallback to latest trade (which will show docked in journal status)
    return valid[0] || null;
  };

  // User explicitly selected strike tip
  const [selectedStrikeTipId, setSelectedStrikeTipId] = useState<string | null>(null);

  // When asset changes, reset custom selected strike tip
  useEffect(() => {
    setSelectedStrikeTipId(null);
  }, [selectedIndex]);

  // All strike prices for which signals are given for the currently selected asset
  const assetSignalStrikes = useMemo(() => {
    if (!tipsPackage) return [];

    const candidates = [
      { tip: tipsPackage.primaryTrade, label: 'Primary Signal' },
      { tip: tipsPackage.topCallTrade, label: 'Buyer Call' },
      { tip: tipsPackage.topPutTrade, label: 'Buyer Put' },
      { tip: tipsPackage.gammaTrade, label: '0DTE Gamma' },
      { tip: tipsPackage.hedgedSpreadTrade, label: 'Hedged Spread' },
      { tip: tipsPackage.topSellerPutTrade, label: 'Seller Put Credit' },
      { tip: tipsPackage.topSellerCallTrade, label: 'Seller Call Credit' },
      { tip: tipsPackage.topSellerNeutralTrade, label: 'Iron Condor / Neutral' },
      ...(tipsPackage.carriedForwardTrades || []).map(t => ({ tip: t, label: 'BTST / Carry' }))
    ];

    const seen = new Set<string>();
    const res: Array<{
      tip: UnifiedSmartTip;
      label: string;
      strike: number;
      optionType: string;
      action: string;
      contractSymbol: string;
      ltp: number;
      score: number;
      status: string;
      isCall: boolean;
      isPut: boolean;
      isTargetHit: boolean;
      isSlHit: boolean;
      isSquareOff: boolean;
    }> = [];

    candidates.forEach(c => {
      if (!c.tip || c.tip.action === 'STANDBY' || c.tip.status === 'EXPIRED') return;
      const key = `${c.tip.contractSymbol || ''}_${c.tip.action}`;
      if (!seen.has(key)) {
        seen.add(key);
        const isTargetHit = c.tip.status === 'TARGET1_HIT' || c.tip.status === 'TARGET2_HIT' || c.tip.status === 'TARGET_HIT';
        const isSlHit = c.tip.status === 'SL_HIT' || c.tip.status === 'STOPLOSS_HIT';
        const isSquareOff = c.tip.status === 'INTRADAY_CLOSED' || c.tip.status === 'SQUARE_OFF';
        const isCall = c.tip.action.includes('CALL') || c.tip.optionType === 'CE';
        const isPut = c.tip.action.includes('PUT') || c.tip.optionType === 'PE';

        res.push({
          tip: c.tip,
          label: c.label,
          strike: c.tip.strikePrice || (c.tip as any).strike || 0,
          optionType: c.tip.optionType,
          action: c.tip.action,
          contractSymbol: c.tip.contractSymbol,
          ltp: c.tip.currentLtp,
          score: c.tip.quantumScore || c.tip.confluenceScore || 85,
          status: c.tip.status,
          isCall,
          isPut,
          isTargetHit,
          isSlHit,
          isSquareOff
        });
      }
    });

    return res;
  }, [tipsPackage]);

  // Strike tips slider ref and slider status
  const strikeSliderRef = useRef<HTMLDivElement>(null);
  const [canSlideLeft, setCanSlideLeft] = useState<boolean>(false);
  const [canSlideRight, setCanSlideRight] = useState<boolean>(false);
  const [sliderProgress, setSliderProgress] = useState<number>(0);

  const updateStrikeSliderState = () => {
    if (strikeSliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = strikeSliderRef.current;
      setCanSlideLeft(scrollLeft > 5);
      setCanSlideRight(scrollLeft + clientWidth < scrollWidth - 5);
      const maxScroll = scrollWidth - clientWidth;
      setSliderProgress(maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0);
    }
  };

  useEffect(() => {
    updateStrikeSliderState();
    const el = strikeSliderRef.current;
    if (el) {
      el.addEventListener('scroll', updateStrikeSliderState);
      window.addEventListener('resize', updateStrikeSliderState);
      const timer = setTimeout(updateStrikeSliderState, 150);
      return () => {
        el.removeEventListener('scroll', updateStrikeSliderState);
        window.removeEventListener('resize', updateStrikeSliderState);
        clearTimeout(timer);
      };
    }
  }, [assetSignalStrikes]);

  const slideStrikes = (dir: 'left' | 'right') => {
    if (strikeSliderRef.current) {
      const slideAmount = Math.max(220, strikeSliderRef.current.clientWidth * 0.65);
      strikeSliderRef.current.scrollBy({
        left: dir === 'left' ? -slideAmount : slideAmount,
        behavior: 'smooth'
      });
    }
  };

  // Current primary trade candidate (Active preferred, or docked setup if no new signal yet)
  const currentHeroTip: UnifiedSmartTip | null = useMemo(() => {
    if (!tipsPackage) return null;

    // If user clicked a specific strike price from the active strikes bar, prioritize it!
    if (selectedStrikeTipId) {
      const custom = assetSignalStrikes.find(s => s.tip.id === selectedStrikeTipId)?.tip;
      if (custom) return custom;
    }

    if (activeTab === 'BUYERS') {
      return getBestTip([tipsPackage.primaryTrade, tipsPackage.topCallTrade, tipsPackage.topPutTrade]);
    }
    if (activeTab === 'SELLERS') {
      return getBestTip([tipsPackage.topSellerPutTrade, tipsPackage.topSellerCallTrade, tipsPackage.topSellerNeutralTrade, tipsPackage.hedgedSpreadTrade]);
    }
    if (activeTab === 'GAMMA') {
      return (tipsPackage.gammaTrade && tipsPackage.gammaTrade.action !== 'STANDBY') 
        ? (isCompletedTrade(tipsPackage.gammaTrade) 
            ? getBestTip([tipsPackage.gammaTrade, tipsPackage.primaryTrade, tipsPackage.topCallTrade]) 
            : tipsPackage.gammaTrade)
        : getBestTip([tipsPackage.primaryTrade, tipsPackage.topCallTrade, tipsPackage.topPutTrade]);
    }
    return getBestTip([tipsPackage.primaryTrade, tipsPackage.topCallTrade, tipsPackage.topPutTrade]);
  }, [tipsPackage, activeTab, selectedStrikeTipId, assetSignalStrikes]);

  // Center active strike pill in view
  useEffect(() => {
    if (currentHeroTip?.id) {
      const strikeBtn = document.getElementById(`strike-tip-pill-${currentHeroTip.id}`);
      if (strikeBtn && strikeSliderRef.current) {
        strikeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentHeroTip?.id]);

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

    // Sort so active setups appear first, completed/docked setups appear at the end
    return res.sort((a, b) => {
      const aDone = isCompletedTrade(a) ? 1 : 0;
      const bDone = isCompletedTrade(b) ? 1 : 0;
      return aDone - bDone;
    });
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

  // Milestone lifecycle determinations
  const isTargetHit = Boolean(
    currentHeroTip?.status === 'TARGET1_HIT' || 
    currentHeroTip?.status === 'TARGET2_HIT' || 
    currentHeroTip?.status === 'TARGET_HIT' || 
    currentHeroTip?.actionabilityStatus === 'TARGET_HIT' ||
    currentHeroTip?.target1HitTimeFormatted
  );
  const isTarget1Hit = isTargetHit || Boolean(currentHeroTip?.target1HitTimeFormatted);
  const isTarget2Hit = currentHeroTip?.status === 'TARGET2_HIT' || Boolean(currentHeroTip?.target2HitTimeFormatted);
  const isSlHit = Boolean(
    currentHeroTip?.status === 'SL_HIT' || 
    currentHeroTip?.status === 'STOPLOSS_HIT' || 
    currentHeroTip?.actionabilityStatus === 'SL_HIT' ||
    currentHeroTip?.stoplossTimeFormatted ||
    currentHeroTip?.stoplossHitTime
  );
  const isSquareOff = Boolean(
    currentHeroTip?.status === 'INTRADAY_CLOSED' || 
    currentHeroTip?.status === 'SQUARE_OFF' || 
    currentHeroTip?.actionabilityStatus === 'SQUARE_OFF'
  );

  const entryTriggerTime = currentHeroTip?.entryPriceTimeFormatted || currentHeroTip?.callGivenTimeFormatted || currentHeroTip?.entryTimeFormatted || currentHeroTip?.entryTime || '---';
  const target1HitTime = currentHeroTip?.target1HitTimeFormatted || (isTarget1Hit ? (currentHeroTip?.bookedTimeFormatted || 'Triggered') : '---');
  const target2HitTime = currentHeroTip?.target2HitTimeFormatted || (isTarget2Hit ? (currentHeroTip?.bookedTimeFormatted || 'Triggered') : '---');
  const stoplossHitTime = currentHeroTip?.stoplossTimeFormatted || currentHeroTip?.stoplossHitTime || (isSlHit ? (currentHeroTip?.bookedTimeFormatted || 'Triggered') : '---');
  const squareOffTime = currentHeroTip?.squareOffTimeFormatted || (isSquareOff ? (currentHeroTip?.bookedTimeFormatted || 'Completed') : '---');

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

      {/* ── 1.1 ASSET TABS BAR: SELECT ASSET FOR LIVE QUANTUM SIGNALS ── */}
      <div className="px-4 sm:px-6 py-2.5 bg-terminal-panel/40 border-b border-terminal-border/70 space-y-2">
        {/* Top filter row: Category pills + Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center space-x-1 p-1 bg-terminal-bg/80 border border-terminal-border rounded-xl overflow-x-auto no-scrollbar">
            <span className="px-2 text-[10px] text-terminal-muted uppercase font-bold flex items-center gap-1">
              <span>Assets:</span>
            </span>
            {(['ALL', 'INDICES', 'COMMODITIES', 'NIFTY50_STOCKS'] as const).map(cat => {
              const label = cat === 'ALL' ? 'All Assets' : cat === 'INDICES' ? 'Indices' : cat === 'COMMODITIES' ? 'Commodities' : 'F&O Stocks';
              const count = cat === 'ALL' ? ALL_SYMBOLS_CONFIG.length : ALL_SYMBOLS_CONFIG.filter(c => c.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAssetCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer text-[11px] whitespace-nowrap ${
                    assetCategory === cat
                      ? 'bg-accent-cyan text-slate-950 shadow-sm font-black'
                      : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded-full ${
                    assetCategory === cat ? 'bg-slate-950/20 text-slate-900' : 'bg-terminal-panel text-terminal-muted'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick search input & Left/Right Scroll Arrows */}
          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-terminal-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search asset / stock..."
                value={assetSearchQuery}
                onChange={e => setAssetSearchQuery(e.target.value)}
                className="w-full bg-terminal-bg/80 border border-terminal-border rounded-lg pl-8 pr-6 py-1 text-xs font-mono text-terminal-text placeholder-terminal-muted focus:outline-none focus:border-accent-cyan transition"
              />
              {assetSearchQuery && (
                <button
                  type="button"
                  onClick={() => setAssetSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center space-x-1">
              <button
                type="button"
                onClick={() => scrollAssetTabs('left')}
                className="p-1.5 rounded-lg bg-terminal-bg/80 border border-terminal-border hover:bg-terminal-panel text-terminal-muted hover:text-terminal-text cursor-pointer transition"
                title="Scroll assets left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollAssetTabs('right')}
                className="p-1.5 rounded-lg bg-terminal-bg/80 border border-terminal-border hover:bg-terminal-panel text-terminal-muted hover:text-terminal-text cursor-pointer transition"
                title="Scroll assets right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Asset Tabs Strip */}
        <div
          ref={assetTabsRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth"
        >
          {filteredAssets.map(item => {
            const isSelected = selectedIndex === item.symbol;
            const sig = getAssetSignalSummary(item.symbol);
            const spot = sig.spot || (isSelected ? currentIndexState?.spotPrice : undefined);

            return (
              <button
                key={item.symbol}
                id={`asset-tab-${item.symbol}`}
                type="button"
                onClick={() => {
                  setSelectedIndex(item.symbol);
                  setSelectedStrikeTipId(null);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 border select-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-500/20 via-cyan-500/15 to-emerald-500/20 text-accent-cyan border-accent-cyan shadow-[0_0_12px_rgba(0,229,255,0.35)] ring-1 ring-accent-cyan'
                    : 'bg-terminal-bg/70 hover:bg-terminal-panel/90 text-terminal-muted hover:text-terminal-text border-terminal-border/80 hover:border-terminal-border'
                }`}
                title={`Switch to ${item.name} (${item.symbol}) Quantum Signals`}
              >
                {/* Active pulsating dot */}
                {isSelected ? (
                  <span className="w-2 h-2 rounded-full bg-accent-cyan animate-ping shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-terminal-border shrink-0" />
                )}

                <div className="flex flex-col items-start leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className={isSelected ? 'text-white font-extrabold' : 'text-terminal-text font-bold'}>
                      {item.symbol}
                    </span>
                    {item.isIndex && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/15 text-sky-400 font-semibold">
                        IDX
                      </span>
                    )}
                    {item.segment === 'COMMODITY' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 font-semibold">
                        MCX
                      </span>
                    )}
                  </div>
                  {spot && (
                    <span className="text-[10px] text-terminal-muted font-normal mt-0.5">
                      ₹{spot.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Signal Badge on the Asset Tab */}
                {sig.hasSignal && (
                  <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                    sig.isTargetHit
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : sig.isSlHit
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : sig.isSquareOff
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : sig.isCall
                      ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/25 text-rose-400 border border-rose-500/40'
                  }`}>
                    {sig.isTargetHit ? '🎯 TGT' : sig.isSlHit ? '🛑 SL' : sig.isSquareOff ? '⚠️ SQ' : sig.isCall ? '🟢 CALL' : '🔴 PUT'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 1.2 STRIKE PRICES FOR WHICH SIGNALS GIVEN (CLICK TO VIEW STRIKE SETUP / SLIDER NAVIGATION) ── */}
      <div className="px-4 sm:px-6 py-2.5 bg-terminal-panel/60 border-b border-terminal-border/70 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="font-extrabold text-terminal-text tracking-wide uppercase text-[11px]">
              Strike Signals Given for <span className="text-accent-cyan">{selectedIndex}</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 font-bold">
              {assetSignalStrikes.length} {assetSignalStrikes.length === 1 ? 'Strike Signal' : 'Strike Signals'}
            </span>
          </div>

          {/* Slider controls & helper text */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-terminal-muted hidden md:inline-block">
              ⚡ Click strike to view setup • Use slider arrows to browse all strikes
            </span>
            {assetSignalStrikes.length > 0 && (
              <div className="flex items-center gap-1 bg-terminal-bg/90 border border-terminal-border/90 rounded-lg p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => slideStrikes('left')}
                  disabled={!canSlideLeft}
                  className={`p-1 rounded-md transition-all ${
                    canSlideLeft
                      ? 'text-terminal-text hover:text-accent-cyan hover:bg-terminal-panel cursor-pointer active:scale-95'
                      : 'text-terminal-muted/40 cursor-not-allowed'
                  }`}
                  title="Slide left to view previous strike signals"
                  aria-label="Slide strikes left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1 text-terminal-muted select-none">
                  SLIDER
                </span>
                <button
                  type="button"
                  onClick={() => slideStrikes('right')}
                  disabled={!canSlideRight}
                  className={`p-1 rounded-md transition-all ${
                    canSlideRight
                      ? 'text-terminal-text hover:text-accent-cyan hover:bg-terminal-panel cursor-pointer active:scale-95'
                      : 'text-terminal-muted/40 cursor-not-allowed'
                  }`}
                  title="Slide right to view more strike signals"
                  aria-label="Slide strikes right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {assetSignalStrikes.length > 0 ? (
          <div className="space-y-1.5">
            {/* Slider wrapper with optional left/right gradient navigation overlays */}
            <div className="relative group">
              {/* Left slider button overlay */}
              {canSlideLeft && (
                <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-4 pl-1 bg-gradient-to-r from-terminal-bg via-terminal-bg/90 to-transparent pointer-events-none">
                  <button
                    type="button"
                    onClick={() => slideStrikes('left')}
                    className="pointer-events-auto p-1.5 rounded-full bg-terminal-panel/95 hover:bg-terminal-panel text-accent-cyan border border-accent-cyan/40 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Slide strikes left"
                    aria-label="Slide left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Scrollable Strike Row */}
              <div 
                ref={strikeSliderRef}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth"
                tabIndex={0}
                role="region"
                aria-label="Strike price signals slider"
              >
                {assetSignalStrikes.map(item => {
                  const isHeroActive = currentHeroTip?.id === item.tip.id;
                  return (
                    <button
                      key={item.tip.id}
                      id={`strike-tip-pill-${item.tip.id}`}
                      type="button"
                      onClick={() => setSelectedStrikeTipId(item.tip.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl font-mono text-xs transition-all duration-200 cursor-pointer flex items-center gap-2.5 border select-none ${
                        isHeroActive
                          ? 'bg-gradient-to-r from-sky-500/25 via-cyan-500/20 to-emerald-500/25 text-white border-accent-cyan shadow-[0_0_15px_rgba(0,229,255,0.4)] ring-2 ring-accent-cyan'
                          : 'bg-terminal-bg/80 hover:bg-terminal-panel text-terminal-muted hover:text-terminal-text border-terminal-border/80 hover:border-terminal-border'
                      }`}
                      title={`View ${item.contractSymbol} (${item.label})`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        item.isCall ? 'bg-bull' : item.isPut ? 'bg-bear' : 'bg-accent-gold'
                      }`} />

                      <div className="flex flex-col items-start leading-tight">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={isHeroActive ? 'text-accent-cyan font-black' : 'text-terminal-text'}>
                            {item.contractSymbol}
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                            item.isCall 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : item.isPut 
                              ? 'bg-rose-500/20 text-rose-400' 
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {item.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-[10px] text-terminal-muted flex items-center gap-1.5 mt-0.5">
                          <span>LTP: <strong className="text-terminal-text">₹{item.ltp.toFixed(2)}</strong></span>
                          <span>•</span>
                          <span>{item.score}% Quantum</span>
                        </div>
                      </div>

                      {/* Status chip */}
                      <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                        item.isTargetHit
                          ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/40'
                          : item.isSlHit
                          ? 'bg-rose-500/25 text-rose-400 border border-rose-500/40'
                          : item.isSquareOff
                          ? 'bg-amber-500/25 text-amber-400 border border-amber-500/40'
                          : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                      }`}>
                        {item.isTargetHit ? '🎯 TGT HIT' : item.isSlHit ? '🛑 SL HIT' : item.isSquareOff ? '⚠️ SQ OFF' : '⚡ ACTIVE'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right slider button overlay */}
              {canSlideRight && (
                <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-4 pr-1 bg-gradient-to-l from-terminal-bg via-terminal-bg/90 to-transparent pointer-events-none">
                  <button
                    type="button"
                    onClick={() => slideStrikes('right')}
                    className="pointer-events-auto p-1.5 rounded-full bg-terminal-panel/95 hover:bg-terminal-panel text-accent-cyan border border-accent-cyan/40 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Slide strikes right"
                    aria-label="Slide right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Slider track indicator & quick jump */}
            <div className="flex items-center gap-2 pt-0.5 px-0.5 select-none">
              <span className="text-[9px] text-terminal-muted font-mono tracking-wider">SLIDER</span>
              <div 
                className="flex-1 h-1.5 bg-terminal-bg border border-terminal-border/60 rounded-full overflow-hidden relative cursor-pointer group/track"
                title="Click anywhere along slider to slide across strike signals"
                onClick={(e) => {
                  if (strikeSliderRef.current) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    strikeSliderRef.current.scrollTo({
                      left: pct * (strikeSliderRef.current.scrollWidth - strikeSliderRef.current.clientWidth),
                      behavior: 'smooth'
                    });
                  }
                }}
              >
                <div 
                  className="h-full bg-gradient-to-r from-accent-cyan via-sky-400 to-emerald-400 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                  style={{ width: `${Math.max(12, Math.min(100, sliderProgress || 0))}%` }}
                />
              </div>
              <div className="flex items-center gap-1 font-mono text-[9px] text-terminal-muted">
                <span className="text-terminal-text font-bold">{assetSignalStrikes.length}</span>
                <span>STRIKES</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg border border-dashed border-terminal-border/80 bg-terminal-bg/40 flex items-center justify-between text-xs text-terminal-muted font-mono">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>No direct strike signals active for {selectedIndex} in current session. Engine in capital preservation mode.</span>
            </span>
            <span className="text-[10px] text-sky-400">Monitoring 10 Confluence Factors</span>
          </div>
        )}
      </div>

      {/* ── 2. HERO TRADE SIGNAL CARD (PRIMARY AUTHORITATIVE RECOMMENDATION) ── */}
      <div className="p-4 sm:p-6 space-y-4">
        {currentHeroTip ? (
          <div className="rounded-xl border border-terminal-border/90 bg-terminal-bg/60 p-4 sm:p-5 shadow-lg relative overflow-hidden">
            {/* Background gradient accent */}
            <div className={`absolute -right-24 -top-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-15 ${
              currentHeroTip.action.includes('CALL') ? 'bg-emerald-500' : 'bg-rose-500'
            }`} />

            {/* 🎯 TARGET HIT DIRECTIVE BANNER (DOCKED IN JOURNAL) */}
            {isTargetHit && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/80 text-emerald-600 dark:text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md relative z-20">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                      <span>🎯 SYSTEM DIRECTIVE: TARGET ACHIEVED & DOCKED IN TRADE JOURNAL</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold">
                        {isTarget2Hit ? 'TARGET 2 RUNNER HIT' : 'TARGET 1 HIT'}
                      </span>
                    </div>
                    <p className="text-xs text-terminal-text mt-0.5 font-mono">
                      Target hit at <strong>{target1HitTime}</strong> • Booked Profit: <strong>+{currentHeroTip.target1Pct.toFixed(0)}% (+₹{Math.round((currentHeroTip.target1Price - currentHeroTip.entryPrice) * (cfg?.lot || 50)).toLocaleString('en-IN')})</strong>.
                    </p>
                    <p className="text-[11px] text-terminal-muted mt-0.5 font-mono">
                      Completed position safely docked in Trade Journal. Showing new signals only once fresh setup conditions trigger.
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
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black font-mono font-bold text-xs hover:bg-emerald-400 transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View in Trade Journal</span>
                </button>
              </div>
            )}

            {/* 🛑 STOP LOSS TRIGGERED DIRECTIVE BANNER (DOCKED IN JOURNAL) */}
            {isSlHit && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/15 border-2 border-rose-500/80 text-rose-600 dark:text-rose-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md relative z-20">
                <div className="flex items-start gap-2.5">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-mono font-black text-sm text-rose-600 dark:text-rose-300 flex items-center gap-2">
                      <span>🛑 SYSTEM DIRECTIVE: STOP LOSS TRIGGERED & DOCKED IN TRADE JOURNAL</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold">
                        CAPITAL PRESERVED
                      </span>
                    </div>
                    <p className="text-xs text-terminal-text mt-0.5 font-mono">
                      Stop loss triggered at <strong>{stoplossHitTime}</strong> at ₹{currentHeroTip.stoplossPrice.toFixed(2)} (-{currentHeroTip.stoplossPct.toFixed(0)}%).
                    </p>
                    <p className="text-[11px] text-terminal-muted mt-0.5 font-mono">
                      Position closed and docked in Trade Journal. Showing new signals only if given.
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
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500 text-white font-mono font-bold text-xs hover:bg-rose-400 transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View in Trade Journal</span>
                </button>
              </div>
            )}

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

            {/* ── ⏱️ TRADE LIFECYCLE MILESTONES TIMELINE ── */}
            <div className="mt-3.5 p-3 rounded-xl bg-terminal-panel/80 border border-terminal-border/80 font-mono shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-terminal-border/60 text-xs">
                <span className="font-extrabold text-terminal-text flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>TRADE LIFECYCLE MILESTONES & AUDIT TIMESTAMPS</span>
                </span>
                <span className="text-[10px] text-terminal-muted hidden sm:inline-block">
                  Timestamp locked in IST (Audit Verified)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2.5 text-xs">
                {/* 1. Entry Triggered */}
                <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  entryTriggerTime !== '---' 
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                    : 'bg-terminal-card/60 border-terminal-border/60 text-terminal-muted'
                }`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>Entry Triggered</span>
                  </div>
                  <div className="text-xs font-black text-terminal-text mt-1">{entryTriggerTime}</div>
                  <div className="text-[9px] text-sky-400/80 mt-0.5">₹{(currentHeroTip.triggerPrice || currentHeroTip.entryPrice).toFixed(2)}</div>
                </div>

                {/* 2. Target 1 Hit */}
                <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  isTarget1Hit || target1HitTime !== '---'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-terminal-card/60 border-terminal-border/60 text-terminal-muted'
                }`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Target 1 Hit</span>
                  </div>
                  <div className="text-xs font-black text-terminal-text mt-1">{target1HitTime}</div>
                  <div className="text-[9px] text-emerald-400/80 mt-0.5">
                    {target1HitTime !== '---' ? `₹${currentHeroTip.target1Price.toFixed(2)} (+${currentHeroTip.target1Pct.toFixed(0)}%)` : 'In Progress'}
                  </div>
                </div>

                {/* 3. Target 2 Hit */}
                <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  isTarget2Hit || target2HitTime !== '---'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-terminal-card/60 border-terminal-border/60 text-terminal-muted'
                }`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Target 2 Hit</span>
                  </div>
                  <div className="text-xs font-black text-terminal-text mt-1">{target2HitTime}</div>
                  <div className="text-[9px] text-emerald-400/80 mt-0.5">
                    {target2HitTime !== '---' ? `₹${(currentHeroTip.target2Price || 0).toFixed(2)} (+${currentHeroTip.target2Pct.toFixed(0)}%)` : 'Runner Target'}
                  </div>
                </div>

                {/* 4. Stop Loss Triggered */}
                <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  isSlHit || stoplossHitTime !== '---'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                    : 'bg-terminal-card/60 border-terminal-border/60 text-terminal-muted'
                }`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-rose-400" />
                    <span>Stop Loss</span>
                  </div>
                  <div className="text-xs font-black text-terminal-text mt-1">{stoplossHitTime}</div>
                  <div className="text-[9px] text-rose-400/80 mt-0.5">
                    {isSlHit ? `Triggered at ₹${currentHeroTip.stoplossPrice.toFixed(2)}` : `Safe (> ₹${currentHeroTip.stoplossPrice.toFixed(2)})`}
                  </div>
                </div>

                {/* 5. Square Off */}
                <div className={`col-span-2 sm:col-span-1 p-2.5 rounded-lg border flex flex-col justify-between ${
                  isSquareOff || squareOffTime !== '---'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-terminal-card/60 border-terminal-border/60 text-terminal-muted'
                }`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Square Off</span>
                  </div>
                  <div className="text-xs font-black text-terminal-text mt-1">{squareOffTime}</div>
                  <div className="text-[9px] text-amber-400/80 mt-0.5">
                    {isSquareOff ? 'Docked in Journal' : '03:15 PM EOD'}
                  </div>
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
                      {tip.status === 'INTRADAY_CLOSED' || tip.status === 'SQUARE_OFF' ? (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                          ⚠️ SQUARE OFF (DOCKED)
                        </span>
                      ) : tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' || tip.status === 'TARGET_HIT' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          🎯 TARGET HIT (DOCKED)
                        </span>
                      ) : tip.status === 'SL_HIT' || tip.status === 'STOPLOSS_HIT' ? (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                          🛑 SL HIT (DOCKED)
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
