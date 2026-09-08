import React, { useState, useMemo, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { ALL_SYMBOLS_CONFIG, type UnifiedSmartTip, type HeroZeroSignal, type SurgeEvent } from '../types';
import { ConfluenceChecklist } from './ConfluenceChecklist';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { TradePayoffSimulator } from './TradePayoffSimulator';
import { IndexContributionBarometer } from './IndexContributionBarometer';
import { TradeLifecycleAdvisor } from './TradeLifecycleAdvisor';
import { BrokerBasketModal, type BrokerBasketItem } from './BrokerBasketModal';
import { 
  Zap, 
  Target, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Layers, 
  ExternalLink, 
  Award, 
  Sparkles, 
  Info, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Play,
  Pause,
  Timer,
  Flame,
  FileSpreadsheet,
  List
} from 'lucide-react';

export type DeckCategory = 'ALL' | 'BUYERS' | 'SELLERS' | 'GAMMA' | 'BREAKOUTS';

interface RecommendationTableItem {
  id: string;
  category: 'BUYERS' | 'SELLERS' | 'GAMMA' | 'BREAKOUTS';
  categoryTitle: string;
  contractSymbol: string;
  strikePrice?: number;
  optionType: 'CE' | 'PE' | 'SPREAD';
  action: string;
  actionBadge: string;
  role: 'BUYER' | 'SELLER';
  executionType: 'NET_DEBIT' | 'NET_CREDIT';
  strategyTag: string;
  entryTimeFormatted: string;
  entryRange: string;
  entryPrice: number;
  currentLtp: number;
  target1Price: number;
  target1Pct: number;
  target2Price?: number;
  target2Pct?: number;
  stoplossPrice: number;
  stoplossPct: number;
  riskReward: string;
  confluenceScore: number;
  status: string;
  // Seller / Spread specific
  netCreditRupees?: number;
  maxProfitRupees?: number;
  maxLossRupees?: number;
  marginRequiredRupees?: number;
  probabilityOfProfitPct?: number;
  breakeven?: number;
  legsSummary?: string;
  // Gamma specific
  gammaScore?: number;
  multiplierTarget?: string;
  // Raw tip or context
  rawTip?: UnifiedSmartTip;
  rawHeroSignal?: HeroZeroSignal;
}

export const TopTradeRecommendationsDeck: React.FC = React.memo(() => {
  const { currentIndexState, selectedIndex, openTradeTipModal, recentSurges } = useMarket();
  const { isBeginner, isIntermediate, isExpert } = useTerminalMode();

  const [activeTab, setActiveTab] = useState<DeckCategory>('ALL');
  const [viewMode, setViewMode] = useState<'FLASH' | 'LIST' | 'BUTTONS' | 'TABLE'>('FLASH');
  const [flashIndex, setFlashIndex] = useState<number>(0);
  const [flashSecondsLeft, setFlashSecondsLeft] = useState<number>(7);
  const [isFlashPaused, setIsFlashPaused] = useState<boolean>(false);
  const [isFlashHovered, setIsFlashHovered] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedConfluenceId, setExpandedConfluenceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [calcParams, setCalcParams] = useState<{ ltp: number; sl: number; target: number }>({
    ltp: 100,
    sl: 80,
    target: 140
  });
  const [isBasketModalOpen, setIsBasketModalOpen] = useState<boolean>(false);
  const [activeBasketItem, setActiveBasketItem] = useState<BrokerBasketItem | null>(null);
  const [radarStrikePrice, setRadarStrikePrice] = useState<number | null>(null);

  // Synchronize with Tactical Strike Slider Radar when user slides/selects any strike
  useEffect(() => {
    const handleRadarStrike = (e: Event) => {
      const customEvent = e as CustomEvent<{ strikePrice: number; offset: number; selectedIndex: string }>;
      if (customEvent.detail?.strikePrice) {
        setRadarStrikePrice(customEvent.detail.strikePrice);
      }
    };
    window.addEventListener('radar_strike_selected', handleRadarStrike);
    return () => window.removeEventListener('radar_strike_selected', handleRadarStrike);
  }, []);

  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
  const lotSize = cfg?.lot || currentIndexState?.lotSize || 50;

  // Build unified recommendation items
  const items: RecommendationTableItem[] = useMemo(() => {
    if (!currentIndexState) return [];

    const pkg = currentIndexState.unifiedTipsPackage;
    const heroZeroSignals = currentIndexState.heroZeroSignals;
    const patternBreakout = currentIndexState.patternBreakout;
    const multiLegStrategy = currentIndexState.multiLegStrategy;

    const list: RecommendationTableItem[] = [];
    const seenContracts = new Set<string>();

    const getDedupeKey = (item: {
      contractSymbol?: string;
      strikePrice?: number;
      optionType?: string;
      action?: string;
      role?: string;
      category?: string;
    }) => {
      const rawContract = (item.contractSymbol || '')
        .replace(/\s+/g, '')
        .toUpperCase();
      
      return `${item.category || 'TRADE'}_${item.role || 'BUYER'}_${item.optionType || ''}_${item.action || ''}_${item.strikePrice || 0}_${rawContract}`;
    };

    const addUniqueItem = (item: RecommendationTableItem) => {
      const key = getDedupeKey(item);
      if (seenContracts.has(key)) {
        return; // Deduplicate: Skip duplicate recommendation
      }
      seenContracts.add(key);
      list.push(item);
    };

    // 1. PRIMARY TRADE
    if (pkg?.primaryTrade) {
      const t = pkg.primaryTrade;
      const isSeller = t.tradingRole === 'SELLER' || t.executionType === 'NET_CREDIT';
      addUniqueItem({
        id: `primary-${t.id}`,
        category: isSeller ? 'SELLERS' : 'BUYERS',
        categoryTitle: isSeller ? '🛡️ Option Sellers & Credit Spreads' : '🟢 Option Buyers (High Alpha CE/PE)',
        contractSymbol: t.contractSymbol,
        strikePrice: t.strikePrice,
        optionType: t.optionType,
        action: t.action,
        actionBadge: t.action === 'BUY_CALL' ? 'BUY CALL' : t.action === 'BUY_PUT' ? 'BUY PUT' : t.action.replace('_', ' '),
        role: t.tradingRole || (isSeller ? 'SELLER' : 'BUYER'),
        executionType: t.executionType || (isSeller ? 'NET_CREDIT' : 'NET_DEBIT'),
        strategyTag: t.strategyTag || 'Institutional High-Probability Confluence',
        entryTimeFormatted: t.entryTimeFormatted || '11:15 AM',
        entryRange: t.entryRange || `₹${t.entryPrice.toFixed(1)}`,
        entryPrice: t.entryPrice,
        currentLtp: t.currentLtp || t.entryPrice,
        target1Price: t.target1Price,
        target1Pct: t.target1Pct,
        target2Price: t.target2Price,
        target2Pct: t.target2Pct,
        stoplossPrice: t.stoplossPrice,
        stoplossPct: t.stoplossPct,
        riskReward: t.riskReward || '1:2.5',
        confluenceScore: t.confluenceScore || 92,
        status: t.status || 'ACTIVE',
        netCreditRupees: t.sellerMetrics?.netCreditRupees,
        maxProfitRupees: t.sellerMetrics?.maxProfitRupees || t.spreadDetails?.maxProfitRupees,
        maxLossRupees: t.sellerMetrics?.maxLossRupees || t.spreadDetails?.maxLossRupees,
        marginRequiredRupees: t.sellerMetrics?.marginRequiredRupees,
        probabilityOfProfitPct: t.sellerMetrics?.probabilityOfProfitPct,
        breakeven: t.spreadDetails?.breakeven,
        legsSummary: t.spreadDetails?.legsSummary,
        rawTip: t
      });
    }

    // 2. TOP CALL TRADE (Option Buyer)
    if (pkg?.topCallTrade) {
      const t = pkg.topCallTrade;
      addUniqueItem({
        id: `buyer-call-${t.id}`,
        category: 'BUYERS',
        categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
        contractSymbol: t.contractSymbol,
        strikePrice: t.strikePrice,
        optionType: 'CE',
        action: t.action,
        actionBadge: 'BUY CALL',
        role: 'BUYER',
        executionType: 'NET_DEBIT',
        strategyTag: t.strategyTag || 'Bullish VWAP Pullback & Heavy Put Writing',
        entryTimeFormatted: t.entryTimeFormatted || 'Live Session',
        entryRange: t.entryRange || `₹${t.entryPrice.toFixed(1)}`,
        entryPrice: t.entryPrice,
        currentLtp: t.currentLtp || t.entryPrice,
        target1Price: t.target1Price,
        target1Pct: t.target1Pct,
        target2Price: t.target2Price,
        target2Pct: t.target2Pct,
        stoplossPrice: t.stoplossPrice,
        stoplossPct: t.stoplossPct,
        riskReward: t.riskReward || '1:2.4',
        confluenceScore: t.confluenceScore || 88,
        status: t.status || 'ACTIVE',
        rawTip: t
      });
    }

    // 3. TOP PUT TRADE (Option Buyer)
    if (pkg?.topPutTrade) {
      const t = pkg.topPutTrade;
      addUniqueItem({
        id: `buyer-put-${t.id}`,
        category: 'BUYERS',
        categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
        contractSymbol: t.contractSymbol,
        strikePrice: t.strikePrice,
        optionType: 'PE',
        action: t.action,
        actionBadge: 'BUY PUT',
        role: 'BUYER',
        executionType: 'NET_DEBIT',
        strategyTag: t.strategyTag || 'Bearish Breakdown & Heavy Call Concentration',
        entryTimeFormatted: t.entryTimeFormatted || 'Live Session',
        entryRange: t.entryRange || `₹${t.entryPrice.toFixed(1)}`,
        entryPrice: t.entryPrice,
        currentLtp: t.currentLtp || t.entryPrice,
        target1Price: t.target1Price,
        target1Pct: t.target1Pct,
        target2Price: t.target2Price,
        target2Pct: t.target2Pct,
        stoplossPrice: t.stoplossPrice,
        stoplossPct: t.stoplossPct,
        riskReward: t.riskReward || '1:2.3',
        confluenceScore: t.confluenceScore || 86,
        status: t.status || 'ACTIVE',
        rawTip: t
      });
    }

    // 4. TOP SELLER PUT TRADE (Bull Put Credit Spread)
    if (pkg?.topSellerPutTrade) {
      const t = pkg.topSellerPutTrade;
      addUniqueItem({
        id: `seller-put-${t.id}`,
        category: 'SELLERS',
        categoryTitle: '🛡️ Option Sellers & Credit Spreads',
        contractSymbol: t.contractSymbol,
        strikePrice: t.strikePrice,
        optionType: 'SPREAD',
        action: t.action,
        actionBadge: 'SELL PUT SPREAD',
        role: 'SELLER',
        executionType: 'NET_CREDIT',
        strategyTag: t.strategyTag || 'Bull Put Credit Spread (High POP)',
        entryTimeFormatted: t.entryTimeFormatted || 'Morning Slot',
        entryRange: t.entryRange || `₹${t.entryPrice.toFixed(1)} Credit`,
        entryPrice: t.entryPrice,
        currentLtp: t.currentLtp || t.entryPrice,
        target1Price: t.target1Price,
        target1Pct: t.target1Pct,
        target2Price: t.target2Price,
        target2Pct: t.target2Pct,
        stoplossPrice: t.stoplossPrice,
        stoplossPct: t.stoplossPct,
        riskReward: t.riskReward || '1:1.6',
        confluenceScore: t.confluenceScore || 91,
        status: t.status || 'ACTIVE',
        netCreditRupees: t.sellerMetrics?.netCreditRupees || Math.round(t.entryPrice * lotSize),
        maxProfitRupees: t.sellerMetrics?.maxProfitRupees || Math.round(t.entryPrice * lotSize),
        maxLossRupees: t.sellerMetrics?.maxLossRupees || Math.round(t.stoplossPrice * lotSize),
        marginRequiredRupees: t.sellerMetrics?.marginRequiredRupees || 48000,
        probabilityOfProfitPct: t.sellerMetrics?.probabilityOfProfitPct || 78,
        breakeven: t.spreadDetails?.breakeven,
        legsSummary: t.spreadDetails?.legsSummary || `Sell OTM PE / Buy Far OTM PE Hedge`,
        rawTip: t
      });
    }

    // 5. TOP SELLER CALL TRADE (Bear Call Credit Spread)
    if (pkg?.topSellerCallTrade) {
      const t = pkg.topSellerCallTrade;
      addUniqueItem({
        id: `seller-call-${t.id}`,
        category: 'SELLERS',
        categoryTitle: '🛡️ Option Sellers & Credit Spreads',
        contractSymbol: t.contractSymbol,
        strikePrice: t.strikePrice,
        optionType: 'SPREAD',
        action: t.action,
        actionBadge: 'SELL CALL SPREAD',
        role: 'SELLER',
        executionType: 'NET_CREDIT',
        strategyTag: t.strategyTag || 'Bear Call Credit Spread (Resistance Wall)',
        entryTimeFormatted: t.entryTimeFormatted || 'Morning Slot',
        entryRange: t.entryRange || `₹${t.entryPrice.toFixed(1)} Credit`,
        entryPrice: t.entryPrice,
        currentLtp: t.currentLtp || t.entryPrice,
        target1Price: t.target1Price,
        target1Pct: t.target1Pct,
        target2Price: t.target2Price,
        target2Pct: t.target2Pct,
        stoplossPrice: t.stoplossPrice,
        stoplossPct: t.stoplossPct,
        riskReward: t.riskReward || '1:1.5',
        confluenceScore: t.confluenceScore || 89,
        status: t.status || 'ACTIVE',
        netCreditRupees: t.sellerMetrics?.netCreditRupees || Math.round(t.entryPrice * lotSize),
        maxProfitRupees: t.sellerMetrics?.maxProfitRupees || Math.round(t.entryPrice * lotSize),
        maxLossRupees: t.sellerMetrics?.maxLossRupees || Math.round(t.stoplossPrice * lotSize),
        marginRequiredRupees: t.sellerMetrics?.marginRequiredRupees || 49000,
        probabilityOfProfitPct: t.sellerMetrics?.probabilityOfProfitPct || 81,
        breakeven: t.spreadDetails?.breakeven,
        legsSummary: t.spreadDetails?.legsSummary || `Sell OTM CE / Buy Far OTM CE Hedge`,
        rawTip: t
      });
    }

    // 6. TOP SELLER NEUTRAL TRADE (Iron Condor / Strangle)
    if (pkg?.topSellerNeutralTrade) {
      const t = pkg.topSellerNeutralTrade;
      addUniqueItem({
        id: `seller-neutral-${t.id}`,
        category: 'SELLERS',
        categoryTitle: '🛡️ Option Sellers & Credit Spreads',
        contractSymbol: t.contractSymbol,
        strikePrice: t.strikePrice,
        optionType: 'SPREAD',
        action: t.action,
        actionBadge: 'IRON CONDOR',
        role: 'SELLER',
        executionType: 'NET_CREDIT',
        strategyTag: t.strategyTag || 'Iron Condor Non-Directional Theta Harvest',
        entryTimeFormatted: t.entryTimeFormatted || 'Daily Slot',
        entryRange: t.entryRange || `₹${t.entryPrice.toFixed(1)} Credit`,
        entryPrice: t.entryPrice,
        currentLtp: t.currentLtp || t.entryPrice,
        target1Price: t.target1Price,
        target1Pct: t.target1Pct,
        target2Price: t.target2Price,
        target2Pct: t.target2Pct,
        stoplossPrice: t.stoplossPrice,
        stoplossPct: t.stoplossPct,
        riskReward: t.riskReward || '1:1.8',
        confluenceScore: t.confluenceScore || 87,
        status: t.status || 'ACTIVE',
        netCreditRupees: t.sellerMetrics?.netCreditRupees || Math.round(t.entryPrice * lotSize),
        maxProfitRupees: t.sellerMetrics?.maxProfitRupees || Math.round(t.entryPrice * lotSize),
        maxLossRupees: t.sellerMetrics?.maxLossRupees || Math.round(t.stoplossPrice * lotSize),
        marginRequiredRupees: t.sellerMetrics?.marginRequiredRupees || 56000,
        probabilityOfProfitPct: t.sellerMetrics?.probabilityOfProfitPct || 84,
        breakeven: t.spreadDetails?.breakeven,
        legsSummary: t.spreadDetails?.legsSummary || `Sell OTM Strangle / Buy Wing Hedges`,
        rawTip: t
      });
    }

    // 7. GAMMA / 0DTE HERO-OR-ZERO
    if (pkg?.gammaTrade && pkg.gammaTrade.action !== 'STANDBY') {
      const t = pkg.gammaTrade;
      addUniqueItem({
        id: `gamma-${t.id}`,
        category: 'GAMMA',
        categoryTitle: '⚡ 0DTE Hero-or-Zero (Gamma Explosion)',
        contractSymbol: t.contractSymbol,
        strikePrice: t.strikePrice,
        optionType: t.optionType,
        action: t.action,
        actionBadge: '0DTE HERO',
        role: 'BUYER',
        executionType: 'NET_DEBIT',
        strategyTag: t.strategyTag || '0DTE Post-1:30 PM Gamma Scalp Sniper',
        entryTimeFormatted: t.entryTimeFormatted || 'Power Hour',
        entryRange: t.entryRange || `₹${t.entryPrice.toFixed(1)}`,
        entryPrice: t.entryPrice,
        currentLtp: t.currentLtp || t.entryPrice,
        target1Price: t.target1Price,
        target1Pct: t.target1Pct,
        target2Price: t.target2Price,
        target2Pct: t.target2Pct,
        stoplossPrice: t.stoplossPrice,
        stoplossPct: t.stoplossPct,
        riskReward: t.riskReward || '1:4.0',
        confluenceScore: t.confluenceScore || 94,
        status: t.status || 'ACTIVE',
        gammaScore: t.gammaDetails?.gammaScore || 9.2,
        multiplierTarget: t.gammaDetails?.multiplierTarget || '3x - 5x',
        rawTip: t
      });
    } else if (heroZeroSignals && heroZeroSignals.length > 0) {
      const hz = heroZeroSignals[0];
      addUniqueItem({
        id: `gamma-${hz.id}`,
        category: 'GAMMA',
        categoryTitle: '⚡ 0DTE Hero-or-Zero (Gamma Explosion)',
        contractSymbol: hz.contractSymbol,
        strikePrice: hz.strike,
        optionType: hz.optionType,
        action: hz.optionType === 'CE' ? 'BUY_CALL' : 'BUY_PUT',
        actionBadge: '0DTE HERO',
        role: 'BUYER',
        executionType: 'NET_DEBIT',
        strategyTag: hz.rationale || 'High Velocity Gamma Squeeze',
        entryTimeFormatted: 'Power Hour',
        entryRange: hz.entryZone || `₹${hz.ltp.toFixed(1)}`,
        entryPrice: hz.ltp,
        currentLtp: hz.ltp,
        target1Price: hz.target1x,
        target1Pct: Math.round(((hz.target1x - hz.ltp) / hz.ltp) * 100),
        target2Price: hz.target3x,
        target2Pct: Math.round(((hz.target3x - hz.ltp) / hz.ltp) * 100),
        stoplossPrice: hz.stoploss,
        stoplossPct: hz.stoplossPct || 35,
        riskReward: hz.riskReward || '1:3.5',
        confluenceScore: 92,
        status: 'ACTIVE',
        gammaScore: hz.gammaScore || 8.8,
        multiplierTarget: '3x Multiplier',
        rawHeroSignal: hz
      });
    }

    // 8. HEDGED SPREAD / BREAKOUT
    if (pkg?.hedgedSpreadTrade) {
      const t = pkg.hedgedSpreadTrade;
      addUniqueItem({
        id: `hedged-${t.id}`,
        category: 'BREAKOUTS',
        categoryTitle: '📈 Breakouts & Multi-Leg Formations',
        contractSymbol: t.contractSymbol,
        strikePrice: t.strikePrice,
        optionType: 'SPREAD',
        action: t.action,
        actionBadge: t.action.replace(/_/g, ' '),
        role: t.tradingRole || 'BUYER',
        executionType: t.executionType || 'NET_DEBIT',
        strategyTag: t.strategyTag || 'Hedged Defined-Risk Directional Spread',
        entryTimeFormatted: t.entryTimeFormatted || '10:30 AM',
        entryRange: t.entryRange || `₹${t.entryPrice.toFixed(1)}`,
        entryPrice: t.entryPrice,
        currentLtp: t.currentLtp || t.entryPrice,
        target1Price: t.target1Price,
        target1Pct: t.target1Pct,
        target2Price: t.target2Price,
        target2Pct: t.target2Pct,
        stoplossPrice: t.stoplossPrice,
        stoplossPct: t.stoplossPct,
        riskReward: t.riskReward || '1:2.8',
        confluenceScore: t.confluenceScore || 87,
        status: t.status || 'ACTIVE',
        maxProfitRupees: t.spreadDetails?.maxProfitRupees,
        maxLossRupees: t.spreadDetails?.maxLossRupees,
        breakeven: t.spreadDetails?.breakeven,
        legsSummary: t.spreadDetails?.legsSummary,
        rawTip: t
      });
    }

    // 9. CARRIED FORWARD TRADES
    if (pkg?.carriedForwardTrades && pkg.carriedForwardTrades.length > 0) {
      pkg.carriedForwardTrades.forEach((t, idx) => {
        const isSeller = t.tradingRole === 'SELLER' || t.executionType === 'NET_CREDIT';
        addUniqueItem({
          id: `carried-${t.id}-${idx}`,
          category: isSeller ? 'SELLERS' : 'BUYERS',
          categoryTitle: isSeller ? '🛡️ Option Sellers & Credit Spreads' : '🟢 Option Buyers (High Alpha CE/PE)',
          contractSymbol: t.contractSymbol,
          strikePrice: t.strikePrice,
          optionType: t.optionType,
          action: t.action,
          actionBadge: t.action === 'BUY_CALL' ? 'BUY CALL' : t.action === 'BUY_PUT' ? 'BUY PUT' : t.action.replace('_', ' '),
          role: t.tradingRole || (isSeller ? 'SELLER' : 'BUYER'),
          executionType: t.executionType || (isSeller ? 'NET_CREDIT' : 'NET_DEBIT'),
          strategyTag: `[Carried from ${t.carriedFromSession || 'Prior Session'}] ${t.strategyTag}`,
          entryTimeFormatted: t.entryTimeFormatted || 'Earlier',
          entryRange: t.entryRange || `₹${t.entryPrice.toFixed(1)}`,
          entryPrice: t.entryPrice,
          currentLtp: t.currentLtp || t.entryPrice,
          target1Price: t.target1Price,
          target1Pct: t.target1Pct,
          target2Price: t.target2Price,
          target2Pct: t.target2Pct,
          stoplossPrice: t.stoplossPrice,
          stoplossPct: t.stoplossPct,
          riskReward: t.riskReward || '1:2.0',
          confluenceScore: t.confluenceScore || 85,
          status: t.status || 'ACTIVE',
          rawTip: t
        });
      });
    }

    // 10. COMPREHENSIVE MULTI-STRIKE OPTION BUYER TIPS (ATM, ITM-1, OTM+1, & TACTICAL RADAR SELECTION)
    const strikes = currentIndexState.strikes || [];
    const spot = currentIndexState.spotPrice || 0;
    const step = currentIndexState.strikeStep || (strikes.length > 1 ? Math.abs(strikes[1].strikePrice - strikes[0].strikePrice) : 50);
    const atmStrike = currentIndexState.atmStrike || (strikes.length > 0 ? strikes.reduce((prev, curr) => 
      Math.abs(curr.strikePrice - spot) < Math.abs(prev.strikePrice - spot) ? curr : prev, strikes[0]).strikePrice : spot);

    if (strikes.length > 0 && spot > 0) {
      // Find strike objects around ATM
      const atmObj = strikes.find(s => s.strikePrice === atmStrike);
      const itm1Obj = strikes.find(s => s.strikePrice === atmStrike - step);
      const otm1Obj = strikes.find(s => s.strikePrice === atmStrike + step);
      const radarObj = radarStrikePrice ? strikes.find(s => s.strikePrice === radarStrikePrice) : null;

      // 10a. ATM Call Setup (if not already added via pkg)
      if (atmObj) {
        const callPrice = Math.max(atmObj.callLtp || 0, 45);
        addUniqueItem({
          id: `buyer-atm-ce-${atmObj.strikePrice}`,
          category: 'BUYERS',
          categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
          contractSymbol: `${selectedIndex} ${atmObj.strikePrice} CE`,
          strikePrice: atmObj.strikePrice,
          optionType: 'CE',
          action: 'BUY_CALL',
          actionBadge: 'BUY CALL (ATM)',
          role: 'BUYER',
          executionType: 'NET_DEBIT',
          strategyTag: 'ATM High-Alpha Momentum Breakout & Aggressive Put Writing',
          entryTimeFormatted: 'Live Intraday',
          entryRange: `₹${(callPrice * 0.98).toFixed(1)} - ₹${callPrice.toFixed(1)}`,
          entryPrice: callPrice,
          currentLtp: callPrice,
          target1Price: +(callPrice * 1.30).toFixed(1),
          target1Pct: 30,
          target2Price: +(callPrice * 1.65).toFixed(1),
          target2Pct: 65,
          stoplossPrice: +(callPrice * 0.78).toFixed(1),
          stoplossPct: 22,
          riskReward: '1:2.4',
          confluenceScore: 89,
          status: 'ACTIVE'
        });

        // 10b. ATM Put Setup (if not already added via pkg)
        const putPrice = Math.max(atmObj.putLtp || 0, 45);
        addUniqueItem({
          id: `buyer-atm-pe-${atmObj.strikePrice}`,
          category: 'BUYERS',
          categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
          contractSymbol: `${selectedIndex} ${atmObj.strikePrice} PE`,
          strikePrice: atmObj.strikePrice,
          optionType: 'PE',
          action: 'BUY_PUT',
          actionBadge: 'BUY PUT (ATM)',
          role: 'BUYER',
          executionType: 'NET_DEBIT',
          strategyTag: 'ATM Intraday Breakdown Scalp & Call Resistance Wall',
          entryTimeFormatted: 'Live Intraday',
          entryRange: `₹${(putPrice * 0.98).toFixed(1)} - ₹${putPrice.toFixed(1)}`,
          entryPrice: putPrice,
          currentLtp: putPrice,
          target1Price: +(putPrice * 1.30).toFixed(1),
          target1Pct: 30,
          target2Price: +(putPrice * 1.65).toFixed(1),
          target2Pct: 65,
          stoplossPrice: +(putPrice * 0.78).toFixed(1),
          stoplossPct: 22,
          riskReward: '1:2.4',
          confluenceScore: 88,
          status: 'ACTIVE'
        });
      }

      // 10c. ITM-1 Call (Conservative Trend Follower - Delta ~0.65, Low Theta)
      if (itm1Obj) {
        const p = Math.max(itm1Obj.callLtp || 0, 75);
        addUniqueItem({
          id: `buyer-itm1-ce-${itm1Obj.strikePrice}`,
          category: 'BUYERS',
          categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
          contractSymbol: `${selectedIndex} ${itm1Obj.strikePrice} CE`,
          strikePrice: itm1Obj.strikePrice,
          optionType: 'CE',
          action: 'BUY_CALL',
          actionBadge: 'BUY CALL (ITM)',
          role: 'BUYER',
          executionType: 'NET_DEBIT',
          strategyTag: 'ITM Conservative Trend Follower (Delta ~0.65, Low Theta)',
          entryTimeFormatted: 'Session Trend',
          entryRange: `₹${(p * 0.98).toFixed(1)} - ₹${p.toFixed(1)}`,
          entryPrice: p,
          currentLtp: p,
          target1Price: +(p * 1.28).toFixed(1),
          target1Pct: 28,
          target2Price: +(p * 1.60).toFixed(1),
          target2Pct: 60,
          stoplossPrice: +(p * 0.82).toFixed(1),
          stoplossPct: 18,
          riskReward: '1:2.6',
          confluenceScore: 91,
          status: 'ACTIVE'
        });
      }

      // 10d. OTM-1 Call (Resistance Breakout Squeeze - High Velocity Gamma)
      if (otm1Obj) {
        const p = Math.max(otm1Obj.callLtp || 0, 35);
        addUniqueItem({
          id: `buyer-otm1-ce-${otm1Obj.strikePrice}`,
          category: 'BUYERS',
          categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
          contractSymbol: `${selectedIndex} ${otm1Obj.strikePrice} CE`,
          strikePrice: otm1Obj.strikePrice,
          optionType: 'CE',
          action: 'BUY_CALL',
          actionBadge: 'BUY CALL (OTM)',
          role: 'BUYER',
          executionType: 'NET_DEBIT',
          strategyTag: 'Resistance Breakout Squeeze (High Velocity Gamma)',
          entryTimeFormatted: 'Breakout Slot',
          entryRange: `₹${(p * 0.98).toFixed(1)} - ₹${p.toFixed(1)}`,
          entryPrice: p,
          currentLtp: p,
          target1Price: +(p * 1.35).toFixed(1),
          target1Pct: 35,
          target2Price: +(p * 1.75).toFixed(1),
          target2Pct: 75,
          stoplossPrice: +(p * 0.75).toFixed(1),
          stoplossPct: 25,
          riskReward: '1:2.8',
          confluenceScore: 87,
          status: 'ACTIVE'
        });
      }

      // 10e. ITM-1 Put (Institutional Breakdown Runner - Delta ~0.65, Cushion)
      if (otm1Obj) { // For Put, strike > spot is ITM
        const p = Math.max(otm1Obj.putLtp || 0, 75);
        addUniqueItem({
          id: `buyer-itm1-pe-${otm1Obj.strikePrice}`,
          category: 'BUYERS',
          categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
          contractSymbol: `${selectedIndex} ${otm1Obj.strikePrice} PE`,
          strikePrice: otm1Obj.strikePrice,
          optionType: 'PE',
          action: 'BUY_PUT',
          actionBadge: 'BUY PUT (ITM)',
          role: 'BUYER',
          executionType: 'NET_DEBIT',
          strategyTag: 'ITM Institutional Breakdown Runner (Delta ~0.65, Cushion)',
          entryTimeFormatted: 'Session Trend',
          entryRange: `₹${(p * 0.98).toFixed(1)} - ₹${p.toFixed(1)}`,
          entryPrice: p,
          currentLtp: p,
          target1Price: +(p * 1.28).toFixed(1),
          target1Pct: 28,
          target2Price: +(p * 1.60).toFixed(1),
          target2Pct: 60,
          stoplossPrice: +(p * 0.82).toFixed(1),
          stoplossPct: 18,
          riskReward: '1:2.6',
          confluenceScore: 90,
          status: 'ACTIVE'
        });
      }

      // 10f. OTM-1 Put (Support Floor Collapse Scalp - Momentum Acceleration)
      if (itm1Obj) { // For Put, strike < spot is OTM
        const p = Math.max(itm1Obj.putLtp || 0, 35);
        addUniqueItem({
          id: `buyer-otm1-pe-${itm1Obj.strikePrice}`,
          category: 'BUYERS',
          categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
          contractSymbol: `${selectedIndex} ${itm1Obj.strikePrice} PE`,
          strikePrice: itm1Obj.strikePrice,
          optionType: 'PE',
          action: 'BUY_PUT',
          actionBadge: 'BUY PUT (OTM)',
          role: 'BUYER',
          executionType: 'NET_DEBIT',
          strategyTag: 'Support Floor Collapse Scalp (Aggressive Put Flow)',
          entryTimeFormatted: 'Breakdown Slot',
          entryRange: `₹${(p * 0.98).toFixed(1)} - ₹${p.toFixed(1)}`,
          entryPrice: p,
          currentLtp: p,
          target1Price: +(p * 1.35).toFixed(1),
          target1Pct: 35,
          target2Price: +(p * 1.75).toFixed(1),
          target2Pct: 75,
          stoplossPrice: +(p * 0.75).toFixed(1),
          stoplossPct: 25,
          riskReward: '1:2.8',
          confluenceScore: 86,
          status: 'ACTIVE'
        });
      }

      // 10g. Tactical Radar-Selected Strike Tips (Synchronized when user clicks or slides in Tactical Radar)
      if (radarObj && radarObj.strikePrice !== atmStrike && radarObj.strikePrice !== itm1Obj?.strikePrice && radarObj.strikePrice !== otm1Obj?.strikePrice) {
        const pCall = Math.max(radarObj.callLtp || 0, 25);
        const pPut = Math.max(radarObj.putLtp || 0, 25);

        addUniqueItem({
          id: `radar-buyer-ce-${radarObj.strikePrice}`,
          category: 'BUYERS',
          categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
          contractSymbol: `${selectedIndex} ${radarObj.strikePrice} CE`,
          strikePrice: radarObj.strikePrice,
          optionType: 'CE',
          action: 'BUY_CALL',
          actionBadge: 'RADAR CE',
          role: 'BUYER',
          executionType: 'NET_DEBIT',
          strategyTag: `🎯 Tactical Radar Selection (${radarObj.strikePrice} CE Momentum Tip)`,
          entryTimeFormatted: 'Radar Selected',
          entryRange: `₹${(pCall * 0.98).toFixed(1)} - ₹${pCall.toFixed(1)}`,
          entryPrice: pCall,
          currentLtp: pCall,
          target1Price: +(pCall * 1.30).toFixed(1),
          target1Pct: 30,
          target2Price: +(pCall * 1.65).toFixed(1),
          target2Pct: 65,
          stoplossPrice: +(pCall * 0.78).toFixed(1),
          stoplossPct: 22,
          riskReward: '1:2.5',
          confluenceScore: 89,
          status: 'ACTIVE'
        });

        addUniqueItem({
          id: `radar-buyer-pe-${radarObj.strikePrice}`,
          category: 'BUYERS',
          categoryTitle: '🟢 Option Buyers (High Alpha CE/PE)',
          contractSymbol: `${selectedIndex} ${radarObj.strikePrice} PE`,
          strikePrice: radarObj.strikePrice,
          optionType: 'PE',
          action: 'BUY_PUT',
          actionBadge: 'RADAR PE',
          role: 'BUYER',
          executionType: 'NET_DEBIT',
          strategyTag: `🎯 Tactical Radar Selection (${radarObj.strikePrice} PE Reversal Tip)`,
          entryTimeFormatted: 'Radar Selected',
          entryRange: `₹${(pPut * 0.98).toFixed(1)} - ₹${pPut.toFixed(1)}`,
          entryPrice: pPut,
          currentLtp: pPut,
          target1Price: +(pPut * 1.30).toFixed(1),
          target1Pct: 30,
          target2Price: +(pPut * 1.65).toFixed(1),
          target2Pct: 65,
          stoplossPrice: +(pPut * 0.78).toFixed(1),
          stoplossPct: 22,
          riskReward: '1:2.5',
          confluenceScore: 88,
          status: 'ACTIVE'
        });
      }
    }

    const hasSeller = list.some(i => i.role === 'SELLER' || i.category === 'SELLERS');

    if (!hasSeller && strikes.length > 0 && spot > 0) {
      const step = strikes.length > 1 ? Math.abs(strikes[1].strikePrice - strikes[0].strikePrice) : 50;
      const otmPutStrike = strikes.find(s => s.strikePrice <= spot - step * 2) || strikes[0];
      const otmCallStrike = strikes.find(s => s.strikePrice >= spot + step * 2) || strikes[strikes.length - 1];
      if (otmPutStrike) {
        const creditPrice = Math.max(otmPutStrike.putLtp || 0, 22);
        addUniqueItem({
          id: `fallback-seller-put-${otmPutStrike.strikePrice}`,
          category: 'SELLERS',
          categoryTitle: '🛡️ Option Sellers & Credit Spreads',
          contractSymbol: `${selectedIndex} ${otmPutStrike.strikePrice} PE Bull Put Spread`,
          strikePrice: otmPutStrike.strikePrice,
          optionType: 'PE',
          action: 'SELL_PUT_SPREAD',
          actionBadge: 'SELL PE SPREAD',
          role: 'SELLER',
          executionType: 'NET_CREDIT',
          strategyTag: 'Bull Put Credit Spread (High POP)',
          entryTimeFormatted: 'Live Intraday',
          entryRange: `₹${creditPrice.toFixed(1)} Credit`,
          entryPrice: creditPrice,
          currentLtp: creditPrice,
          target1Price: +(creditPrice * 0.20).toFixed(1),
          target1Pct: 80,
          target2Price: +(creditPrice * 0.05).toFixed(1),
          target2Pct: 95,
          stoplossPrice: +(creditPrice * 2.0).toFixed(1),
          stoplossPct: 100,
          riskReward: '1:3.0',
          confluenceScore: 86,
          status: 'ACTIVE',
          netCreditRupees: Math.round(creditPrice * lotSize),
          maxProfitRupees: Math.round(creditPrice * lotSize),
          maxLossRupees: Math.round((step - creditPrice) * lotSize),
          marginRequiredRupees: 38000,
          probabilityOfProfitPct: 82
        });
      }
      if (otmCallStrike) {
        const creditPrice = Math.max(otmCallStrike.callLtp || 0, 22);
        addUniqueItem({
          id: `fallback-seller-call-${otmCallStrike.strikePrice}`,
          category: 'SELLERS',
          categoryTitle: '🛡️ Option Sellers & Credit Spreads',
          contractSymbol: `${selectedIndex} ${otmCallStrike.strikePrice} CE Bear Call Spread`,
          strikePrice: otmCallStrike.strikePrice,
          optionType: 'CE',
          action: 'SELL_CALL_SPREAD',
          actionBadge: 'SELL CE SPREAD',
          role: 'SELLER',
          executionType: 'NET_CREDIT',
          strategyTag: 'Bear Call Credit Spread (High POP)',
          entryTimeFormatted: 'Live Intraday',
          entryRange: `₹${creditPrice.toFixed(1)} Credit`,
          entryPrice: creditPrice,
          currentLtp: creditPrice,
          target1Price: +(creditPrice * 0.20).toFixed(1),
          target1Pct: 80,
          target2Price: +(creditPrice * 0.05).toFixed(1),
          target2Pct: 95,
          stoplossPrice: +(creditPrice * 2.0).toFixed(1),
          stoplossPct: 100,
          riskReward: '1:3.0',
          confluenceScore: 85,
          status: 'ACTIVE',
          netCreditRupees: Math.round(creditPrice * lotSize),
          maxProfitRupees: Math.round(creditPrice * lotSize),
          maxLossRupees: Math.round((step - creditPrice) * lotSize),
          marginRequiredRupees: 38000,
          probabilityOfProfitPct: 83
        });
      }
    }

    // Final defensive deduplication pass to guarantee zero duplicates
    const finalSeen = new Set<string>();
    const deduplicatedList: RecommendationTableItem[] = [];
    for (const item of list) {
      const k = getDedupeKey(item);
      if (!finalSeen.has(k)) {
        finalSeen.add(k);
        deduplicatedList.push(item);
      }
    }

    return deduplicatedList;
  }, [currentIndexState, selectedIndex, lotSize, radarStrikePrice]);

  // Filtered items based on selected tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return items;
    if (activeTab === 'BUYERS') {
      return items.filter(item => item.role === 'BUYER' || item.category === 'BUYERS');
    }
    if (activeTab === 'SELLERS') {
      return items.filter(item => item.role === 'SELLER' || item.category === 'SELLERS');
    }
    if (activeTab === 'GAMMA') {
      return items.filter(item => item.category === 'GAMMA');
    }
    if (activeTab === 'BREAKOUTS') {
      return items.filter(item => item.category === 'BREAKOUTS');
    }
    return items.filter(item => item.category === activeTab);
  }, [items, activeTab]);

  // Counts for each tab badge
  const counts = useMemo(() => {
    return {
      ALL: items.length,
      BUYERS: items.filter(i => i.role === 'BUYER' || i.category === 'BUYERS').length,
      SELLERS: items.filter(i => i.role === 'SELLER' || i.category === 'SELLERS').length,
      GAMMA: items.filter(i => i.category === 'GAMMA').length,
      BREAKOUTS: items.filter(i => i.category === 'BREAKOUTS').length,
    };
  }, [items]);

  // Currently focused item for emergent details view
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return filteredItems.find(i => i.id === selectedItemId) || null;
  }, [filteredItems, selectedItemId]);

  // Reset 7-second flash countdown when category tab changes
  useEffect(() => {
    setFlashIndex(0);
    setFlashSecondsLeft(7);
  }, [activeTab]);

  // 7-Second Automatic Sequential Flash Tip Rotation
  useEffect(() => {
    if (isFlashPaused || isFlashHovered || filteredItems.length <= 1) return;

    const interval = setInterval(() => {
      setFlashSecondsLeft(prev => {
        if (prev <= 1) {
          setFlashIndex(curr => (curr + 1) % filteredItems.length);
          return 7;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isFlashPaused, isFlashHovered, filteredItems.length]);

  const handlePrevFlashTip = () => {
    if (filteredItems.length === 0) return;
    setFlashIndex(curr => (curr - 1 + filteredItems.length) % filteredItems.length);
    setFlashSecondsLeft(7);
  };

  const handleNextFlashTip = () => {
    if (filteredItems.length === 0) return;
    setFlashIndex(curr => (curr + 1) % filteredItems.length);
    setFlashSecondsLeft(7);
  };

  const safeFlashIndex = filteredItems.length > 0 ? flashIndex % filteredItems.length : 0;
  const currentFlashTip = filteredItems[safeFlashIndex] || null;

  // Active surges for current symbol
  const activeSurgesForSymbol = useMemo(() => {
    return (recentSurges || []).filter(s => s.indexSymbol === selectedIndex);
  }, [recentSurges, selectedIndex]);

  // Helper to match a recommendation item with active surge
  const getMatchingSurge = (item: RecommendationTableItem): SurgeEvent | undefined => {
    if (!recentSurges || recentSurges.length === 0) return undefined;
    return recentSurges.find(s => {
      if (s.indexSymbol !== selectedIndex) return false;
      if (item.strikePrice && s.strikePrice === item.strikePrice && s.optionType === item.optionType) {
        return true;
      }
      if (s.contractSymbol && item.contractSymbol && s.contractSymbol.replace(/\s+/g, '') === item.contractSymbol.replace(/\s+/g, '')) {
        return true;
      }
      return false;
    });
  };

  // Open the Flash Surge Radar modal (with optional focus filter)
  const handleOpenSurgeModal = (item?: RecommendationTableItem) => {
    window.dispatchEvent(new CustomEvent('open_surge_modal', {
      detail: {
        asset: selectedIndex,
        side: item ? (item.optionType === 'CE' ? 'CE' : item.optionType === 'PE' ? 'PE' : 'ALL') : 'ALL',
        category: 'ALL'
      }
    }));
  };

  if (!currentIndexState) return null;

  // Handler to open full Trade Tip Modal
  const handleOpenTipModal = (item: RecommendationTableItem) => {
    if (item.rawTip) {
      const t = item.rawTip;
      openTradeTipModal({
        symbol: t.symbol || selectedIndex,
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
        elapsedTimeFormatted: 'Live Terminal Session',
        actionGuidance: t.strategyTag,
        status: t.status,
        strategyTag: t.strategyTag,
        lotSize,
        explanations: t.explanations,
        tradingRole: t.tradingRole,
        executionType: t.executionType,
        confluenceBreakdown: t.confluenceBreakdown,
        sellerMetrics: t.sellerMetrics
      });
    } else if (item.rawHeroSignal) {
      const hz = item.rawHeroSignal;
      openTradeTipModal({
        symbol: hz.symbol,
        title: hz.contractSymbol,
        contractSymbol: hz.contractSymbol,
        action: hz.optionType === 'CE' ? 'BUY_CALL' : 'BUY_PUT',
        optionType: hz.optionType,
        tierLabel: '0DTE HERO-OR-ZERO',
        sessionName: 'Power Hour',
        confluenceScore: 92,
        entryPrice: hz.ltp,
        entryRange: hz.entryZone,
        currentLtp: hz.ltp,
        stoplossPrice: hz.stoploss,
        stoplossPct: hz.stoplossPct,
        target1Price: hz.target1x,
        target1Pct: Math.round(((hz.target1x - hz.ltp) / hz.ltp) * 100),
        target2Price: hz.target3x,
        target2Pct: Math.round(((hz.target3x - hz.ltp) / hz.ltp) * 100),
        riskReward: hz.riskReward,
        givenTimeFormatted: 'Power Hour',
        elapsedTimeFormatted: '0DTE Special',
        actionGuidance: hz.rationale,
        status: 'ACTIVE',
        strategyTag: '0DTE Gamma Sniper',
        lotSize
      });
    } else {
      openTradeTipModal({
        symbol: selectedIndex,
        title: item.contractSymbol,
        contractSymbol: item.contractSymbol,
        action: item.action,
        optionType: item.optionType,
        tierLabel: item.categoryTitle,
        sessionName: 'Live Session',
        confluenceScore: item.confluenceScore,
        entryPrice: item.entryPrice,
        entryRange: item.entryRange,
        currentLtp: item.currentLtp,
        stoplossPrice: item.stoplossPrice,
        stoplossPct: item.stoplossPct,
        target1Price: item.target1Price,
        target1Pct: item.target1Pct,
        target2Price: item.target2Price,
        target2Pct: item.target2Pct,
        riskReward: item.riskReward,
        givenTimeFormatted: item.entryTimeFormatted,
        elapsedTimeFormatted: 'Live Terminal Session',
        actionGuidance: item.strategyTag,
        status: item.status,
        strategyTag: item.strategyTag,
        lotSize,
        tradingRole: item.role,
        executionType: item.executionType,
        sellerMetrics: {
          netCreditRupees: item.netCreditRupees,
          maxProfitRupees: item.maxProfitRupees,
          maxLossRupees: item.maxLossRupees,
          marginRequiredRupees: item.marginRequiredRupees,
          probabilityOfProfitPct: item.probabilityOfProfitPct
        }
      });
    }
  };

  // Click handler for buttons: select to reveal details (smooth scroll), or toggle if already selected
  const handleButtonClick = (item: RecommendationTableItem) => {
    if (selectedItemId === item.id) {
      setSelectedItemId(null);
    } else {
      setSelectedItemId(item.id);
      setTimeout(() => {
        const el = document.getElementById('emergent-details-panel');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
  };

  // Helper for seller summary in clipboard
  const getSellerMetricsRupeesSummary = (item: RecommendationTableItem) => {
    if (item.role !== 'SELLER') return '';
    return `💵 MAX PROFIT: ₹${(item.maxProfitRupees || 0).toLocaleString('en-IN')}/lot | MAX LOSS: ₹${(item.maxLossRupees || 0).toLocaleString('en-IN')}/lot | POP: ${item.probabilityOfProfitPct || 75}%`;
  };

  // Quick Copy to Clipboard
  const handleCopySetup = (item: RecommendationTableItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = [
      `🎯 [FAYDA TERMINAL] LIVE TRADE RECOMMENDATION`,
      `⚡ SYMBOL: ${item.contractSymbol}`,
      `🏷️ ACTION: ${item.actionBadge} (${item.role === 'SELLER' ? 'Option Seller • Net Credit' : 'Option Buyer • Net Debit'})`,
      `💰 ENTRY ZONE: ${item.entryRange} (LTP: ₹${item.currentLtp.toFixed(1)})`,
      `🎯 TARGET 1: ₹${item.target1Price.toFixed(1)} (+${item.target1Pct}%)`,
      item.target2Price ? `🚀 TARGET 2: ₹${item.target2Price.toFixed(1)} (+${item.target2Pct}%)` : '',
      `🛑 STOP LOSS: ₹${item.stoplossPrice.toFixed(1)} (-${item.stoplossPct}%)`,
      `📊 CONFLUENCE: ${item.confluenceScore}% | R:R: ${item.riskReward}`,
      getSellerMetricsRupeesSummary(item),
      `⏱️ ENTRY TIME: ${item.entryTimeFormatted}`,
      `🛡️ DISCIPLINE: Always adhere to strict stop loss. Trail SL to cost upon hitting Target 1.`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Open Risk Calculator prefilled
  const handleOpenCalc = (item: RecommendationTableItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCalcParams({
      ltp: item.currentLtp || item.entryPrice,
      sl: item.stoplossPrice,
      target: item.target1Price
    });
    setIsRiskModalOpen(true);
  };

  // Toggle Confluence Breakdown Checklist
  const handleToggleConfluence = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedConfluenceId(prev => prev === id ? null : id);
  };

  // Reusable Emergent Details Panel for both LIST and BUTTONS views
  const renderEmergentDetailsPanel = () => {
    if (!selectedItem) return null;

    const isCall = selectedItem.optionType === 'CE' || selectedItem.action === 'BUY_CALL';
    const isPut = selectedItem.optionType === 'PE' || selectedItem.action === 'BUY_PUT';
    const isSeller = selectedItem.role === 'SELLER' || selectedItem.optionType === 'SPREAD';
    const isGamma = selectedItem.category === 'GAMMA';

    return (
      <div id="emergent-details-panel" className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0d1527] dark:via-[#0a1120] dark:to-[#070c17] border-2 border-amber-400/90 dark:border-accent-gold/70 shadow-xl shadow-amber-500/10 transition-all duration-300 my-3">
        {/* Emergent Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-accent-gold border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white">
                  {selectedItem.contractSymbol}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                  isSeller
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                    : isCall
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                }`}>
                  {selectedItem.actionBadge} ({isSeller ? 'Option Seller • Net Credit' : 'Option Buyer • Net Debit'})
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{selectedItem.status}</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                {selectedItem.strategyTag}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setSelectedItemId(null)}
            className="self-end sm:self-center p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Close emergent details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Emergent 4-Card Analytical Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
          {/* 1. Entry & Live Price */}
          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1">
              Entry & Live Tracking
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                Entry: <strong className="text-slate-900 dark:text-white font-bold">{selectedItem.entryRange}</strong>
              </span>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                LTP: <strong className="text-slate-900 dark:text-white">₹{selectedItem.currentLtp.toFixed(1)}</strong>
              </span>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 dark:text-slate-400">P&L / Lot:</span>
              <span className={`font-black ${
                (selectedItem.currentLtp - selectedItem.entryPrice) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {(selectedItem.currentLtp - selectedItem.entryPrice) >= 0 ? '+' : ''}
                ₹{Math.round((selectedItem.currentLtp - selectedItem.entryPrice) * lotSize).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 2. Profit Targets */}
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 uppercase font-bold block mb-1">
              Profit Targets
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400">
                T1: ₹{selectedItem.target1Price.toFixed(1)} (+{selectedItem.target1Pct}%)
              </span>
              {selectedItem.target2Price && (
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  T2: ₹{selectedItem.target2Price.toFixed(1)} (+{selectedItem.target2Pct}%)
                </span>
              )}
            </div>
            <div className="mt-2 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-emerald-800 dark:text-emerald-400 font-semibold">T1 Profit / Lot:</span>
              <span className="font-black text-emerald-700 dark:text-emerald-400">
                +₹{Math.round((selectedItem.target1Price - selectedItem.entryPrice) * lotSize).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 3. Stop Loss & Risk Management */}
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60">
            <span className="text-[10px] font-mono text-rose-800 dark:text-rose-400 uppercase font-bold block mb-1">
              Capital Protection & SL
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-400">
                SL: ₹{selectedItem.stoplossPrice.toFixed(1)} (-{selectedItem.stoplossPct}%)
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                R:R: {selectedItem.riskReward}
              </span>
            </div>
            <div className="mt-2 pt-1.5 border-t border-rose-200/60 dark:border-rose-800/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-rose-800 dark:text-rose-400 font-semibold">Max Risk / Lot:</span>
              <span className="font-black text-rose-700 dark:text-rose-400">
                -₹{Math.round((selectedItem.entryPrice - selectedItem.stoplossPrice) * lotSize).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 4. Execution Role & Edge */}
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
            <span className="text-[10px] font-mono text-amber-800 dark:text-accent-gold uppercase font-bold block mb-1">
              {isSeller ? 'Option Seller Profile' : 'Confluence Edge'}
            </span>
            {isSeller ? (
              <div>
                <div className="flex items-baseline justify-between text-xs font-mono">
                  <span className="text-purple-700 dark:text-purple-300 font-bold">
                    POP: {selectedItem.probabilityOfProfitPct || 78}%
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Margin: ₹{Math.round((selectedItem.marginRequiredRupees || 48000) / 1000)}k
                  </span>
                </div>
                <div className="mt-2 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-amber-800 dark:text-accent-gold font-semibold">Max Profit:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    ₹{(selectedItem.maxProfitRupees || Math.round(selectedItem.entryPrice * lotSize)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline justify-between text-xs font-mono">
                  <span className="text-amber-700 dark:text-accent-gold font-bold">
                    Score: {selectedItem.confluenceScore}%
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Top Confluence
                  </span>
                </div>
                <div className="mt-2 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-amber-800 dark:text-accent-gold font-semibold">Lot Size:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {lotSize} shares / lot
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Trade Lifecycle & Trailing SL Decision Engine */}
        <TradeLifecycleAdvisor
          contractSymbol={selectedItem.contractSymbol}
          entryPrice={selectedItem.entryPrice}
          currentLtp={selectedItem.currentLtp}
          target1Price={selectedItem.target1Price}
          target1Pct={selectedItem.target1Pct}
          target2Price={selectedItem.target2Price}
          target2Pct={selectedItem.target2Pct}
          stoplossPrice={selectedItem.stoplossPrice}
          stoplossPct={selectedItem.stoplossPct}
          role={selectedItem.role}
          executionType={selectedItem.executionType}
          matchingSurge={getMatchingSurge(selectedItem)}
        />

        {/* Sensibull Payoff Simulator, Opstra Margin Optimizer, & Quantsapp Radar */}
        <TradePayoffSimulator
          contractSymbol={selectedItem.contractSymbol}
          entryPrice={selectedItem.entryPrice}
          currentLtp={selectedItem.currentLtp}
          target1Price={selectedItem.target1Price}
          target1Pct={selectedItem.target1Pct}
          target2Price={selectedItem.target2Price}
          target2Pct={selectedItem.target2Pct}
          stoplossPrice={selectedItem.stoplossPrice}
          stoplossPct={selectedItem.stoplossPct}
          lotSize={lotSize}
          role={selectedItem.role}
          executionType={selectedItem.executionType}
          optionType={selectedItem.optionType}
          strikePrice={selectedItem.strikePrice}
          spotPrice={currentIndexState?.spotPrice}
          marginRequiredRupees={selectedItem.marginRequiredRupees}
          maxProfitRupees={selectedItem.maxProfitRupees}
          maxLossRupees={selectedItem.maxLossRupees}
          probabilityOfProfitPct={selectedItem.probabilityOfProfitPct}
          legsSummary={selectedItem.legsSummary}
          confluenceScore={selectedItem.confluenceScore}
          strategyTag={selectedItem.strategyTag}
          matchingSurge={getMatchingSurge(selectedItem)}
          onOpenSurge={() => handleOpenSurgeModal(selectedItem)}
        />

        {/* Rationale & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span className="font-bold text-amber-700 dark:text-accent-gold">Strategy Thesis:</span>
            <span className="truncate max-w-md">{selectedItem.strategyTag}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Confluence Breakdown Toggle */}
            <button
              type="button"
              onClick={(e) => handleToggleConfluence(selectedItem.id, e)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-amber-500" />
              <span>Confluence Checklist</span>
              {expandedConfluenceId === selectedItem.id ? (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* Copy Setup */}
            <button
              type="button"
              onClick={(e) => handleCopySetup(selectedItem, e)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedId === selectedItem.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Signal</span>
                </>
              )}
            </button>

            {/* Calculator */}
            <button
              type="button"
              onClick={(e) => handleOpenCalc(selectedItem, e)}
              className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 border border-sky-300 dark:border-sky-800/80 text-sky-800 dark:text-sky-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calc Risk</span>
            </button>

            {/* Multi-Broker Basket Payload Generator */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBasketItem({
                  contractSymbol: selectedItem.contractSymbol,
                  strikePrice: selectedItem.strikePrice,
                  optionType: selectedItem.optionType,
                  action: selectedItem.action,
                  lotSize,
                  lots: 1,
                  entryPrice: selectedItem.entryPrice,
                  stoplossPrice: selectedItem.stoplossPrice,
                  target1Price: selectedItem.target1Price,
                  executionType: selectedItem.executionType
                });
                setIsBasketModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 border border-purple-300 dark:border-purple-800/80 text-purple-800 dark:text-purple-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Generate Multi-Broker Order Basket (Fyers / Dhan / Zerodha)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Broker Basket</span>
            </button>

            {/* Open Full Modal */}
            <button
              type="button"
              onClick={() => handleOpenTipModal(selectedItem)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <span>Open Full Institutional Blueprint</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable 10-Indicator Confluence Checklist */}
        {expandedConfluenceId === selectedItem.id && selectedItem.rawTip?.confluenceBreakdown && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-950 rounded-xl p-3.5 border border-amber-300/60 dark:border-amber-500/30 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-mono font-black text-slate-900 dark:text-white uppercase">
                    10-Indicator Confluence Checklist for {selectedItem.contractSymbol}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Mode: <strong className="text-amber-600 dark:text-accent-gold uppercase">{isBeginner ? 'Beginner' : isExpert ? 'Expert' : 'Intermediate'}</strong>
                </span>
              </div>

              <ConfluenceChecklist 
                breakdown={selectedItem.rawTip.confluenceBreakdown} 
                role={selectedItem.role} 
                score={selectedItem.confluenceScore} 
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section 
      id="top-trade-recommendations-command-center"
      aria-label="Top Trade Recommendations Command Center"
      className="w-full bg-white dark:bg-gradient-to-b dark:from-[#0b1424] dark:via-[#0e172a] dark:to-[#080d1a] border border-amber-400/60 dark:border-accent-gold/40 rounded-2xl shadow-lg dark:shadow-[0_4px_30px_rgba(255,184,0,0.12)] overflow-hidden transition-all duration-200 select-none font-sans"
    >
      {/* ========================================================================= */}
      {/* ── TOP HEADER STRIP: BRANDING + SECTION TABS + RISK CALCULATOR ────────── */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Title & Pulse Indicator */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 dark:from-accent-gold/25 dark:to-amber-500/5 text-amber-700 dark:text-accent-gold border border-amber-500/40 shadow-sm flex items-center justify-center">
            <Target className="w-5 h-5 animate-pulse text-amber-600 dark:text-accent-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-mono font-black text-slate-900 dark:text-white tracking-wide uppercase flex items-center gap-2">
                <span>⚡ Trade Recommendations & Tips</span>
                <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 dark:text-terminal-muted lowercase font-sans">
                  (Top Command Center)
                </span>
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Priority</span>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                {selectedIndex} • Lot: {lotSize}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span>{isBeginner ? 'Safe high-probability setups with defined profit targets & stop loss' : isExpert ? 'Multi-indicator alpha confluence with Greek profiles & delta order flow' : 'Institutional momentum setups & probability-of-profit credit spreads'}</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-amber-700 dark:text-amber-400 font-bold">10-Factor Confluence</span>
            </p>
          </div>
        </div>

        {/* Section Tabs, View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: 7s Flash Solo vs Actionable List vs Quick Focus Buttons vs Tabular Matrix */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300 dark:border-slate-800 gap-1 text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setViewMode('FLASH')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'FLASH'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
              title="Flash trade tips for 7 seconds one after another (solo focus)"
            >
              <Zap className={`w-3.5 h-3.5 ${viewMode === 'FLASH' ? 'text-slate-950' : 'text-amber-500'} animate-pulse`} />
              <span>⚡ 7s Flash Solo</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
              title="View recommendations in comprehensive actionable list format"
            >
              <List className="w-3.5 h-3.5" />
              <span>📝 Detailed List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('BUTTONS')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'BUTTONS'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
              title="View recommendations as interactive quick-focus buttons"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Quick Buttons</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
              title="View recommendations in complete 9-column tabular matrix"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>📋 Full Table</span>
            </button>
          </div>

          {/* Section Filter Pills */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300 dark:border-slate-800 gap-1 text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span>🎯 All Setups</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'ALL' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {counts.ALL}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('BUYERS')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'BUYERS'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span>🟢 Buyers</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'BUYERS' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {counts.BUYERS}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SELLERS')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'SELLERS'
                  ? 'bg-purple-500 text-white font-black shadow-md shadow-purple-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span>🛡️ Sellers & Spreads</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'SELLERS' ? 'bg-white/25 text-white font-black' : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {counts.SELLERS}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('GAMMA')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'GAMMA'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span>⚡ 0DTE Hero</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'GAMMA' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {counts.GAMMA}
              </span>
            </button>
          </div>

          {/* ⚡ Flash Surge Confluence Drawer / Modal Trigger */}
          <button
            type="button"
            onClick={() => handleOpenSurgeModal()}
            className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              activeSurgesForSymbol.length > 0
                ? 'bg-gradient-to-r from-rose-500/15 via-bear/20 to-rose-500/15 text-bear border-bear/60 hover:bg-bear/25 animate-pulse shadow-[0_0_12px_rgba(255,59,105,0.25)]'
                : 'bg-slate-200/80 dark:bg-slate-900/90 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800'
            }`}
            title="Open 1-minute real-time institutional Flash Surge Radar"
          >
            <Zap className={`w-3.5 h-3.5 ${activeSurgesForSymbol.length > 0 ? 'text-bear fill-bear' : 'text-slate-400'}`} />
            <span>{isBeginner ? '⚡ High Demand' : '⚡ Flash Surges'}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              activeSurgesForSymbol.length > 0 ? 'bg-bear text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {activeSurgesForSymbol.length}
            </span>
          </button>

          {/* Risk Calculator Launcher */}
          <button
            type="button"
            onClick={() => {
              setCalcParams({
                ltp: items[0]?.currentLtp || 100,
                sl: items[0]?.stoplossPrice || 80,
                target: items[0]?.target1Price || 140
              });
              setIsRiskModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 border border-sky-300 dark:border-sky-800/80 text-sky-800 dark:text-sky-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Open Capital & Risk Calculator"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Position Calc</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── 0. ⚡ 7-SECOND LIVE FLASH SOLO VIEW (ONE BY ONE ROTATION) ───────────── */}
      {/* ========================================================================= */}
      {viewMode === 'FLASH' && (
        <div 
          className="p-3.5 sm:p-5 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col space-y-4"
          onMouseEnter={() => setIsFlashHovered(true)}
          onMouseLeave={() => setIsFlashHovered(false)}
        >
          {filteredItems.length === 0 ? (
            <div className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Info className="w-6 h-6 text-amber-500" />
                <span>No active trade setups currently under this filter. Waiting for high-conviction order flow.</span>
              </div>
            </div>
          ) : currentFlashTip && (
            <div className="flex flex-col space-y-4">
              {/* TOP SPOTLIGHT CONTROLLER STRIP */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-3.5 rounded-2xl border border-amber-500/40 dark:border-accent-gold/40 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/40">
                    <Zap className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black uppercase text-amber-600 dark:text-accent-gold tracking-wider">
                        ⚡ 7-Second Live Flash Spotlight
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                        Tip {safeFlashIndex + 1} of {filteredItems.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Flashing 1 trade tip at a time for 7 seconds. Showing next tip automatically.
                    </p>
                  </div>
                </div>

                {/* 7s Flash Controls: Prev, Pause, Next, Countdown */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevFlashTip}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-mono"
                    title="Previous trade tip"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden md:inline font-bold">Prev</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFlashPaused(!isFlashPaused)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
                    title={isFlashPaused ? "Resume 7-second auto flash" : "Pause on this trade tip"}
                  >
                    {isFlashPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">RESUME</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400">PAUSE</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextFlashTip}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-mono"
                    title="Next trade tip"
                  >
                    <span className="hidden md:inline font-bold">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* 7s Countdown Badge */}
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                    <Timer className="w-3.5 h-3.5 animate-pulse text-sky-500" />
                    <span>Next in {flashSecondsLeft}s</span>
                  </div>
                </div>
              </div>

              {/* 7-Second Draining Countdown Progress Bar */}
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-accent-cyan via-amber-400 to-emerald-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${(flashSecondsLeft / 7) * 100}%` }}
                />
              </div>

              {/* THE SINGLE ACTIVE TRADE TIP CARD (SOLO FOCUS) */}
              {(() => {
                const isCall = currentFlashTip.optionType === 'CE' || currentFlashTip.action === 'BUY_CALL';
                const isPut = currentFlashTip.optionType === 'PE' || currentFlashTip.action === 'BUY_PUT';
                const isSeller = currentFlashTip.role === 'SELLER' || currentFlashTip.optionType === 'SPREAD';
                const isGamma = currentFlashTip.category === 'GAMMA';

                const strikeLabel = currentFlashTip.strikePrice
                  ? `${currentFlashTip.strikePrice.toLocaleString('en-IN')} ${currentFlashTip.optionType}`
                  : currentFlashTip.contractSymbol;

                const ltpDiff = currentFlashTip.currentLtp - currentFlashTip.entryPrice;
                const isProfitable = isSeller ? (currentFlashTip.entryPrice >= currentFlashTip.currentLtp) : (ltpDiff >= 0);

                return (
                  <div className={`p-5 sm:p-6 rounded-2xl border-2 transition-all duration-300 bg-white dark:bg-slate-900/90 shadow-xl ${
                    isSeller 
                      ? 'border-purple-500 shadow-purple-500/10' 
                      : isGamma 
                      ? 'border-cyan-500 shadow-cyan-500/10' 
                      : isCall 
                      ? 'border-emerald-500 shadow-emerald-500/10' 
                      : 'border-rose-500 shadow-rose-500/10'
                  }`}>
                    {/* Top Row: Action Badge + Strike + Confluence */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {isSeller ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>OPTION SELL / SPREAD</span>
                          </span>
                        ) : isGamma ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black uppercase tracking-wider bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                            <span>0DTE HERO / GAMMA</span>
                          </span>
                        ) : isCall ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>BUY CALL (CE)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span>BUY PUT (PE)</span>
                          </span>
                        )}

                        <span className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
                          {strikeLabel}
                        </span>

                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {currentFlashTip.actionBadge}
                        </span>
                      </div>

                      {/* Confluence Pill */}
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-accent-gold border border-amber-500/30 font-mono text-xs font-black flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>{currentFlashTip.confluenceScore}% Confluence</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {currentFlashTip.entryTimeFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Strategy Tag */}
                    <div className="py-2.5 text-xs font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-semibold">{currentFlashTip.strategyTag}</span>
                    </div>

                    {/* 6 High-Alpha Metrics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 my-3">
                      {/* Entry Zone */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Entry Range</div>
                        <div className="text-sm font-mono font-black text-sky-600 dark:text-sky-400 mt-0.5">
                          {currentFlashTip.entryRange}
                        </div>
                      </div>

                      {/* Live LTP */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Current LTP</div>
                        <div className="text-base font-mono font-black text-amber-600 dark:text-amber-400 mt-0.5">
                          ₹{currentFlashTip.currentLtp.toFixed(2)}
                        </div>
                        <div className={`text-[10px] font-mono font-bold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {ltpDiff >= 0 ? `+₹${ltpDiff.toFixed(1)}` : `-₹${Math.abs(ltpDiff).toFixed(1)}`}
                        </div>
                      </div>

                      {/* Target 1 */}
                      <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                        <div className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400">Target 1</div>
                        <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ₹{currentFlashTip.target1Price.toFixed(2)}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-emerald-500">
                          +{currentFlashTip.target1Pct}%
                        </div>
                      </div>

                      {/* Target 2 */}
                      <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                        <div className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400">Target 2</div>
                        <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ₹{(currentFlashTip.target2Price || currentFlashTip.target1Price * 1.25).toFixed(2)}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-emerald-500">
                          +{currentFlashTip.target2Pct || 60}%
                        </div>
                      </div>

                      {/* Stoploss */}
                      <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
                        <div className="text-[10px] uppercase font-mono text-rose-600 dark:text-rose-400">Stop Loss</div>
                        <div className="text-sm font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5">
                          ₹{currentFlashTip.stoplossPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-rose-500">
                          -{currentFlashTip.stoplossPct}%
                        </div>
                      </div>

                      {/* Risk Reward */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Risk : Reward</div>
                        <div className="text-sm font-mono font-black text-slate-900 dark:text-white mt-0.5">
                          {currentFlashTip.riskReward}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          Lot: {lotSize}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        {/* Open Trade Tip Modal */}
                        <button
                          type="button"
                          onClick={() => handleOpenTipModal(currentFlashTip)}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Detailed Setup Ticket</span>
                        </button>

                        {/* Open Risk Calc */}
                        <button
                          type="button"
                          onClick={() => {
                            setCalcParams({
                              ltp: Number(currentFlashTip.currentLtp || currentFlashTip.entryPrice || 0),
                              sl: Number(currentFlashTip.stoplossPrice || 0),
                              target: Number(currentFlashTip.target1Price || 0)
                            });
                            setIsRiskModalOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Position Calc</span>
                        </button>

                        {/* Add to Broker Basket */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBasketItem({
                              contractSymbol: currentFlashTip.contractSymbol,
                              strikePrice: currentFlashTip.strikePrice || 0,
                              optionType: currentFlashTip.optionType === 'SPREAD' ? 'CE' : (currentFlashTip.optionType || 'CE'),
                              action: currentFlashTip.action?.includes('PUT') ? 'BUY_PUT' : currentFlashTip.action?.includes('CALL') ? 'BUY_CALL' : (currentFlashTip.action || 'BUY'),
                              lotSize: lotSize || 50,
                              lots: 1,
                              entryPrice: Number(currentFlashTip.currentLtp || currentFlashTip.entryPrice || 0),
                              stoplossPrice: Number(currentFlashTip.stoplossPrice || 0),
                              target1Price: Number(currentFlashTip.target1Price || 0),
                              executionType: currentFlashTip.role === 'SELLER' ? 'NET_CREDIT' : 'NET_DEBIT'
                            });
                            setIsBasketModalOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Basket Order</span>
                        </button>
                      </div>

                      {/* Confluence toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleConfluence(currentFlashTip.id, e)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-amber-600 dark:text-accent-gold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{expandedConfluenceId === currentFlashTip.id ? 'Hide Confluence' : 'Check Confluence Checklist'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedConfluenceId === currentFlashTip.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Expandable Confluence Checklist */}
                    {expandedConfluenceId === currentFlashTip.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <ConfluenceChecklist 
                          confluenceScore={currentFlashTip.confluenceScore}
                          symbol={selectedIndex}
                          action={currentFlashTip.action}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Helpful Hint to switch to List */}
              <div className="text-center py-2">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Showing 1 trade tip for 7 seconds. Want to see all {filteredItems.length} recommendations at once? Click{' '}
                  <button
                    type="button"
                    onClick={() => setViewMode('LIST')}
                    className="text-amber-500 hover:underline font-bold cursor-pointer"
                  >
                    📝 Detailed List
                  </button>
                  .
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── 1. ACTIONABLE DETAILED LIST VIEW (COMPREHENSIVE) ────────────────────── */}
      {/* ========================================================================= */}
      {viewMode === 'LIST' && (
        <div className="p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Info className="w-6 h-6 text-amber-500" />
                <span>No active trade setups currently under this filter. Waiting for high-conviction order flow.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2.5">
              {filteredItems.map(item => {
                const isSelected = selectedItemId === item.id;
                const isCall = item.optionType === 'CE' || item.action === 'BUY_CALL';
                const isPut = item.optionType === 'PE' || item.action === 'BUY_PUT';
                const isSeller = item.role === 'SELLER' || item.optionType === 'SPREAD';
                const isGamma = item.category === 'GAMMA';

                const strikeLabel = item.strikePrice
                  ? `${item.strikePrice.toLocaleString('en-IN')} ${item.optionType}`
                  : item.contractSymbol;

                const ltpDiff = item.currentLtp - item.entryPrice;
                const isProfitable = isSeller ? (item.entryPrice >= item.currentLtp) : (ltpDiff >= 0);
                const matchingSurge = getMatchingSurge(item);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleButtonClick(item)}
                    className={`group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden p-3.5 sm:p-4 pl-4 sm:pl-5 bg-white dark:bg-slate-900/85 select-none shadow-xs hover:shadow-md ${
                      isSelected
                        ? isSeller
                          ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/25'
                          : isGamma
                          ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20 dark:bg-cyan-950/25'
                          : isCall
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/25'
                          : 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/25'
                        : isSeller
                        ? 'border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600'
                        : isGamma
                        ? 'border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-600'
                        : isCall
                        ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600'
                        : 'border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600'
                    }`}
                  >
                    {/* Left Colored Accent Stripe */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                      isSeller ? 'bg-purple-500' : isGamma ? 'bg-cyan-500' : isCall ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      {/* Left: Contract Symbol, Action & Strategy */}
                      <div className="flex-1 min-w-[260px]">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isSeller ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/80 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              <span>OPTION SELL</span>
                            </span>
                          ) : isGamma ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/80 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                              <span>0DTE HERO</span>
                            </span>
                          ) : isCall ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>BUY CALL</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/80 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              <span>BUY PUT</span>
                            </span>
                          )}

                          <span className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-accent-gold transition-colors">
                            {strikeLabel}
                          </span>

                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {item.actionBadge}
                          </span>

                          {item.id.includes('radar') && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 flex items-center gap-1 animate-pulse">
                              <Target className="w-3 h-3 text-cyan-500" />
                              <span>RADAR SYNC</span>
                            </span>
                          )}

                          {matchingSurge && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSurgeModal(item);
                              }}
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 flex items-center gap-1 animate-pulse cursor-pointer"
                              title="Live Order Flow Surge Active"
                            >
                              <Zap className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
                              <span>⚡ +{matchingSurge.oiChangePct}% OI/m</span>
                            </span>
                          )}

                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-auto sm:ml-0">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{item.entryTimeFormatted || '11:15 AM'}</span>
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 font-sans line-clamp-1">
                          {item.strategyTag}
                        </p>
                      </div>

                      {/* Middle: 4 Key Metrics Blocks (Entry, LTP, Target, SL) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 min-w-[320px]">
                        {/* Entry Range */}
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase block">Entry Zone</span>
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                            {item.entryRange || `₹${item.entryPrice.toFixed(1)}`}
                          </span>
                        </div>

                        {/* Live LTP & P&L */}
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase block">Live LTP</span>
                          <div className="flex items-baseline justify-between">
                            <span className={`text-xs font-mono font-black ${
                              isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                            }`}>
                              ₹{item.currentLtp.toFixed(1)}
                            </span>
                            <span className={`text-[10px] font-mono font-bold ${
                              isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {ltpDiff >= 0 ? '+' : ''}{Math.round(ltpDiff * lotSize)}
                            </span>
                          </div>
                        </div>

                        {/* Target 1 */}
                        <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 uppercase block">Target 1</span>
                          <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 truncate block">
                            ₹{item.target1Price.toFixed(1)} (+{item.target1Pct}%)
                          </span>
                        </div>

                        {/* Stop Loss */}
                        <div className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60">
                          <span className="text-[9px] font-mono text-rose-700 dark:text-rose-400 uppercase block">Stop Loss (SL)</span>
                          <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-400 truncate block">
                            ₹{item.stoplossPrice.toFixed(1)} (-{item.stoplossPct}%)
                          </span>
                        </div>
                      </div>

                      {/* Right: Confluence Score & Action Toolbar */}
                      <div className="flex items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60 dark:border-slate-800/60">
                        {/* Confluence Pill */}
                        <div className="flex flex-col items-center justify-center px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60">
                          <span className="text-[9px] font-mono text-amber-700 dark:text-accent-gold uppercase font-bold">Confluence</span>
                          <span className="text-xs font-mono font-black text-amber-600 dark:text-accent-gold">{item.confluenceScore}%</span>
                        </div>

                        {/* Copy Setup */}
                        <button
                          type="button"
                          onClick={(e) => handleCopySetup(item, e)}
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Copy trade recommendation to clipboard"
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Position Risk Calculator */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenCalc(item, e)}
                          className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 transition cursor-pointer"
                          title="Open Position & Risk Calculator"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>

                        {/* Details Toggle */}
                        <button
                          type="button"
                          onClick={() => handleButtonClick(item)}
                          className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span>{isSelected ? 'Details ▲' : 'Details ▾'}</span>
                        </button>

                        {/* Full Blueprint Modal */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTipModal(item);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black transition flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Open full strategy blueprint modal"
                        >
                          <span>Blueprint</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Emergent Details Panel inside LIST view */}
          {renderEmergentDetailsPanel()}

          {/* Quick toggle hint */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
            <span>💡 Pro Tip: Click any trade row to view full lifecycle analysis, or click Blueprint for comprehensive trading plan.</span>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className="text-amber-700 dark:text-accent-gold hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>Switch to dense 9-column matrix view</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── 1. QUICK FOCUS BUTTONS VIEW (MINIMALIST, ATTRACTIVE, PROFESSIONAL) ─── */}
      {/* ========================================================================= */}
      {viewMode === 'BUTTONS' && (
        <div className="p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col space-y-4">
          {/* Quick Focus Interactive Buttons Grid */}
          {filteredItems.length === 0 ? (
            <div className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Info className="w-6 h-6 text-amber-500" />
                <span>No active trade setups currently under this filter. Waiting for high-conviction order flow.</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map(item => {
                const isSelected = selectedItemId === item.id;
                const isCall = item.optionType === 'CE' || item.action === 'BUY_CALL';
                const isPut = item.optionType === 'PE' || item.action === 'BUY_PUT';
                const isSeller = item.role === 'SELLER' || item.optionType === 'SPREAD';
                const isGamma = item.category === 'GAMMA';

                const strikeLabel = item.strikePrice
                  ? `${item.strikePrice.toLocaleString('en-IN')} ${item.optionType}`
                  : item.contractSymbol;

                const ltpDiff = item.currentLtp - item.entryPrice;
                const isProfitable = isSeller ? (item.entryPrice >= item.currentLtp) : (ltpDiff >= 0);
                const matchingSurge = getMatchingSurge(item);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleButtonClick(item)}
                    className={`group relative text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between select-none ${
                      isSelected
                        ? isSeller
                          ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10'
                          : isGamma
                          ? 'bg-cyan-50/80 dark:bg-cyan-950/30 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                          : isCall
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                          : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/30 shadow-lg shadow-rose-500/10'
                        : isSeller
                        ? 'bg-white dark:bg-slate-900/80 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 shadow-sm hover:shadow-md'
                        : isGamma
                        ? 'bg-white dark:bg-slate-900/80 hover:bg-cyan-50/20 dark:hover:bg-cyan-950/20 border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-600 shadow-sm hover:shadow-md'
                        : isCall
                        ? 'bg-white dark:bg-slate-900/80 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm hover:shadow-md'
                        : 'bg-white dark:bg-slate-900/80 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Top Accent Line for Selected State */}
                    {isSelected && (
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        isSeller ? 'bg-purple-500' : isGamma ? 'bg-cyan-500' : isCall ? 'bg-emerald-500' : 'bg-rose-500'
                      }`} />
                    )}

                    {/* Top Badges: Option Buy / Sell + Live Surge + Time */}
                    <div className="flex items-center justify-between gap-1.5 w-full flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isSeller ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/80 shadow-xs flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span>OPTION SELL</span>
                          </span>
                        ) : isGamma ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/80 shadow-xs flex items-center gap-1">
                            <Zap className="w-3 h-3 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                            <span>0DTE HERO</span>
                          </span>
                        ) : isCall ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 shadow-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>OPTION BUY (CE)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/80 shadow-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span>OPTION BUY (PE)</span>
                          </span>
                        )}

                        {/* ⚡ Live Surge Flow Badge */}
                        {matchingSurge && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSurgeModal(item);
                            }}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 flex items-center gap-1 animate-pulse shadow-xs cursor-pointer"
                            title={`Live 1-Minute Order Flow Surge Active! Score: ${matchingSurge.surgeScore}/100, Velocity: +${matchingSurge.oiChangePct}% OI/min. Click to inspect surge order flow.`}
                          >
                            <Zap className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
                            <span>
                              {isBeginner 
                                ? '⚡ Surge' 
                                : isIntermediate 
                                ? `⚡ +${matchingSurge.oiChangePct}% OI/m` 
                                : `⚡ Flow ${matchingSurge.surgeScore}`}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.entryTimeFormatted || '11:15 AM'}</span>
                      </div>
                    </div>

                    {/* Strike Price & Strategy Tag */}
                    <div className="my-2.5">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-accent-gold transition-colors">
                          {strikeLabel}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {item.actionBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-sans" title={item.strategyTag}>
                        {item.strategyTag}
                      </p>
                    </div>

                    {/* Compact Minimalist Key Metrics: Entry, LTP, Target */}
                    <div className="grid grid-cols-3 gap-1.5 w-full">
                      {/* Entry */}
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 flex flex-col">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase">Entry</span>
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.entryRange || `₹${item.entryPrice.toFixed(1)}`}
                        </span>
                      </div>

                      {/* LTP */}
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 flex flex-col">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase">LTP</span>
                        <span className={`text-xs font-mono font-black truncate ${
                          isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          ₹{item.currentLtp.toFixed(1)}
                        </span>
                      </div>

                      {/* Target */}
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 flex flex-col">
                        <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 uppercase">Target</span>
                        <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 truncate">
                          ₹{item.target1Price.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Micro-Bar: Confluence + Interactive Cues */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] font-mono w-full">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <span>Score:</span>
                        <span className="font-black text-amber-600 dark:text-accent-gold">{item.confluenceScore}%</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-0.5 font-bold ${
                          isSelected 
                            ? 'text-amber-600 dark:text-accent-gold' 
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                        }`}>
                          <span>{isSelected ? 'Details Active ▲' : 'Click Details ▾'}</span>
                          <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                        </span>

                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTipModal(item);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              handleOpenTipModal(item);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-0.5 transition-all shadow-xs cursor-pointer"
                          title="Open Full Strategy Blueprint Modal"
                        >
                          <span>Blueprint</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Emergent Details Panel (Emerges When User Clicks Any Button) */}
          {renderEmergentDetailsPanel()}

          {/* Quick toggle to table */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
            <span>💡 Pro Tip: Click any recommendation button to emerge quick execution details, or click again to launch deep Greek analysis.</span>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className="text-amber-700 dark:text-accent-gold hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>Switch to dense 9-column matrix view</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── 2. MAIN TABULAR RECOMMENDATIONS DECK (HORIZONTAL SCROLL RESPONSIVE) ─── */}
      {/* ========================================================================= */}
      {viewMode === 'TABLE' && (
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800/90 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 sm:px-4 w-[240px]">Contract & Strategy</th>
                <th className="py-2.5 px-3 w-[150px]">Action & Role</th>
                <th className="py-2.5 px-3 w-[150px]">
                  <div className="flex flex-col">
                    <span>Entry Zone</span>
                    <span className="text-[9px] font-normal text-slate-500 dark:text-slate-500 lowercase">Live LTP</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 w-[170px]">
                  <div className="flex flex-col">
                    <span>Targets (T1 / T2)</span>
                    <span className="text-[9px] font-normal text-slate-500 dark:text-slate-500 lowercase">Profit %</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 w-[140px]">
                  <div className="flex flex-col">
                    <span>Stop Loss</span>
                    <span className="text-[9px] font-normal text-slate-500 dark:text-slate-500 lowercase">Capital Risk %</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 w-[130px]">Confluence</th>
                <th className="py-2.5 px-3 w-[100px]">R : R / POP</th>
                <th className="py-2.5 px-3 w-[90px]">Status</th>
                <th className="py-2.5 px-3 text-right pr-4 w-[160px]">Actions</th>
              </tr>
            </thead>

          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/70 text-xs font-sans">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 font-mono">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Info className="w-6 h-6 text-amber-500" />
                    <span>No active trade setups currently under this filter. Waiting for high-conviction order flow.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const isExpanded = expandedConfluenceId === item.id;
                const isCall = item.optionType === 'CE' || item.action === 'BUY_CALL';
                const isPut = item.optionType === 'PE' || item.action === 'BUY_PUT';
                const isSpread = item.role === 'SELLER' || item.optionType === 'SPREAD';
                const isGamma = item.category === 'GAMMA';
                const matchingSurge = getMatchingSurge(item);

                return (
                  <React.Fragment key={item.id}>
                    <tr 
                      onClick={() => handleOpenTipModal(item)}
                      className={`group hover:bg-amber-50/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/40 dark:bg-slate-900/30'
                      }`}
                    >
                      {/* 1. CONTRACT & STRATEGY */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-accent-gold transition-colors">
                              {item.contractSymbol}
                            </span>
                            {matchingSurge && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSurgeModal(item);
                                }}
                                className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[9px] font-mono font-black animate-pulse cursor-pointer flex items-center gap-0.5 shadow-xs"
                                title={`Live 1-Minute Surge Active! Score: ${matchingSurge.surgeScore}/100. Click to inspect.`}
                              >
                                <Zap className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
                                <span>SURGE</span>
                              </span>
                            )}
                            {isGamma && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-black">
                                0DTE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5" title={item.strategyTag}>
                            {item.strategyTag}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{item.entryTimeFormatted}</span>
                            {item.legsSummary && (
                              <>
                                <span>•</span>
                                <span className="text-purple-600 dark:text-purple-400 font-semibold truncate max-w-[150px]">
                                  {item.legsSummary}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. ACTION & ROLE */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-start gap-1">
                          {isSpread ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/80 shadow-sm flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>{item.actionBadge}</span>
                            </span>
                          ) : isCall ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 shadow-sm flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{item.actionBadge}</span>
                            </span>
                          ) : isPut ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/80 shadow-sm flex items-center gap-1">
                              <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>{item.actionBadge}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 shadow-sm flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>{item.actionBadge}</span>
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {item.role === 'SELLER' ? 'Option Seller • Net Credit' : 'Option Buyer • Net Debit'}
                          </span>
                        </div>
                      </td>

                      {/* 3. ENTRY ZONE & LIVE LTP */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <div className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 inline-flex items-center gap-1 w-fit">
                            <span className="text-xs font-mono font-bold text-sky-800 dark:text-sky-300">
                              {item.entryRange}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
                            <span className="text-slate-500 dark:text-slate-400">LTP:</span>
                            <span className="font-black text-slate-900 dark:text-white">
                              ₹{item.currentLtp.toFixed(1)}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                        </div>
                      </td>

                      {/* 4. TARGETS (T1 / T2 / MAX PROFIT) */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col space-y-1">
                          {item.role === 'SELLER' ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] font-mono font-bold">
                                  Max Profit
                                </span>
                                <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400">
                                  ₹{(item.maxProfitRupees || Math.round(item.entryPrice * lotSize)).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                Net Credit: ₹{item.entryPrice.toFixed(1)}/sh
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-mono font-bold">
                                  T1
                                </span>
                                <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400">
                                  ₹{item.target1Price.toFixed(1)}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  (+{item.target1Pct}%)
                                </span>
                              </div>

                              {item.target2Price && (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 text-[10px] font-mono font-bold">
                                    T2
                                  </span>
                                  <span className="font-mono font-black text-xs text-cyan-700 dark:text-cyan-400">
                                    ₹{item.target2Price.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                                    (+{item.target2Pct}%)
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* 5. STOP LOSS / MAX RISK */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col space-y-1">
                          {item.role === 'SELLER' ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-mono font-bold">
                                  Max Loss
                                </span>
                                <span className="font-mono font-black text-xs text-rose-700 dark:text-rose-400">
                                  ₹{(item.maxLossRupees || Math.round(item.stoplossPrice * lotSize)).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                Defined Capped Spread
                              </span>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-mono font-bold">
                                SL
                              </span>
                              <span className="font-mono font-black text-xs text-rose-700 dark:text-rose-400">
                                ₹{item.stoplossPrice.toFixed(1)}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
                                (-{item.stoplossPct}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. CONFLUENCE SCORE & CHECKLIST TRIGGER */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={(e) => handleToggleConfluence(item.id, e)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-accent-gold/15 hover:bg-amber-100 dark:hover:bg-accent-gold/25 border border-amber-300 dark:border-accent-gold/40 text-amber-800 dark:text-accent-gold font-mono text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm group-hover:border-amber-400"
                          title="Click to view 10-indicator confluence breakdown"
                        >
                          <Target className="w-3.5 h-3.5 text-amber-600 dark:text-accent-gold" />
                          <span>{item.confluenceScore}%</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 ml-0.5 text-amber-700 dark:text-accent-gold" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-0.5 text-amber-700 dark:text-accent-gold" />
                          )}
                        </button>
                      </td>

                      {/* 7. RISK : REWARD / POP */}
                      <td className="py-3 px-3 font-mono">
                        {item.role === 'SELLER' ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-purple-700 dark:text-purple-300">
                              {item.probabilityOfProfitPct || 78}% POP
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              Margin: ₹{Math.round((item.marginRequiredRupees || 48000) / 1000)}k
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {item.riskReward}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              Risk:Reward
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 8. STATUS */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* 9. ACTIONS */}
                      <td className="py-3 px-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Copy Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCopySetup(item, e)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Copy setup to clipboard"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Quick Calc Button */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenCalc(item, e)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Calculate lot size & risk"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>

                          {/* View Strategy Modal Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTipModal(item);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-amber-500/20"
                          >
                            <span>Strategy</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDABLE CONFLUENCE CHECKLIST ROW */}
                    {isExpanded && item.rawTip?.confluenceBreakdown && (
                      <tr className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
                        <td colSpan={9} className="p-3 sm:p-4">
                          <div className="bg-white dark:bg-slate-950 rounded-xl p-3 border border-amber-300/60 dark:border-amber-500/30 shadow-inner">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                              <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-mono font-black text-slate-900 dark:text-white uppercase">
                                  10-Indicator Confluence Checklist for {item.contractSymbol}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                Mode: <strong className="text-amber-600 dark:text-accent-gold uppercase">{isBeginner ? 'Beginner' : isExpert ? 'Expert' : 'Intermediate'}</strong>
                              </span>
                            </div>

                            <ConfluenceChecklist 
                              breakdown={item.rawTip.confluenceBreakdown} 
                              role={item.role} 
                              score={item.confluenceScore} 
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>Viewing complete institutional 9-column ledger table.</span>
          <button
            type="button"
            onClick={() => setViewMode('BUTTONS')}
            className="text-amber-700 dark:text-accent-gold hover:underline flex items-center gap-1 font-bold cursor-pointer"
          >
            <span>Switch to Quick Focus Buttons</span>
            <Zap className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )}

      {/* ── HEAVYWEIGHT POINT CONTRIBUTION BAROMETER (STOCKEDGE / SENSEX / BANKNIFTY) ─── */}
      <div className="px-3 sm:px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
        <IndexContributionBarometer />
      </div>

      {/* ========================================================================= */}
      {/* ── BOTTOM SUMMARY DECK STRIP ──────────────────────────────────────────── */}
      {/* ========================================================================= */}
      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Green = Buyers</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Purple = Sellers / Credit Spreads</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Cyan = 0DTE Gamma</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Click any row to view full interactive execution blueprint</span>
        </div>
      </div>

      {/* Risk Calculator Modal */}
      {isRiskModalOpen && (
        <RiskCalculatorModal
          isOpen={isRiskModalOpen}
          onClose={() => setIsRiskModalOpen(false)}
          defaultLtp={calcParams.ltp}
          defaultSl={calcParams.sl}
          defaultTarget={calcParams.target}
        />
      )}

      {/* Multi-Broker Basket Payload Modal */}
      {isBasketModalOpen && activeBasketItem && (
        <BrokerBasketModal
          isOpen={isBasketModalOpen}
          onClose={() => setIsBasketModalOpen(false)}
          basketItem={activeBasketItem}
        />
      )}
    </section>
  );
});
