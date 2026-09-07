import React, { useState, useMemo } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { ALL_SYMBOLS_CONFIG, type UnifiedSmartTip, type ActiveTradeTipData, type HeroZeroSignal } from '../types';
import { ConfluenceChecklist } from './ConfluenceChecklist';
import { RiskCalculatorModal } from './RiskCalculatorModal';
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
  Flame, 
  Clock, 
  Layers, 
  Sliders, 
  ExternalLink,
  Activity,
  AlertTriangle,
  Award,
  Sparkles,
  Info
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
  const { currentIndexState, selectedIndex, openTradeTipModal } = useMarket();
  const { isBeginner, isIntermediate, isExpert } = useTerminalMode();

  const [activeTab, setActiveTab] = useState<DeckCategory>('ALL');
  const [expandedConfluenceId, setExpandedConfluenceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState<boolean>(false);
  const [calcParams, setCalcParams] = useState<{ ltp: number; sl: number; target: number }>({
    ltp: 100,
    sl: 80,
    target: 140
  });

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

    // 1. PRIMARY TRADE
    if (pkg?.primaryTrade) {
      const t = pkg.primaryTrade;
      const isSeller = t.tradingRole === 'SELLER' || t.executionType === 'NET_CREDIT';
      list.push({
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
    if (pkg?.topCallTrade && pkg.topCallTrade.id !== pkg.primaryTrade?.id) {
      const t = pkg.topCallTrade;
      list.push({
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
    if (pkg?.topPutTrade && pkg.topPutTrade.id !== pkg.primaryTrade?.id) {
      const t = pkg.topPutTrade;
      list.push({
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
      list.push({
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
      list.push({
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
      list.push({
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
      list.push({
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
      list.push({
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
      list.push({
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
        list.push({
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

    return list;
  }, [currentIndexState, selectedIndex, lotSize]);

  // Filtered items based on selected tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return items;
    return items.filter(item => item.category === activeTab);
  }, [items, activeTab]);

  // Counts for each tab badge
  const counts = useMemo(() => {
    return {
      ALL: items.length,
      BUYERS: items.filter(i => i.category === 'BUYERS').length,
      SELLERS: items.filter(i => i.category === 'SELLERS').length,
      GAMMA: items.filter(i => i.category === 'GAMMA').length,
      BREAKOUTS: items.filter(i => i.category === 'BREAKOUTS').length,
    };
  }, [items]);

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

        {/* Section Tabs & Actions */}
        <div className="flex flex-wrap items-center gap-2">
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
      {/* ── MAIN TABULAR RECOMMENDATIONS DECK (HORIZONTAL SCROLL RESPONSIVE) ────── */}
      {/* ========================================================================= */}
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
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-accent-gold transition-colors">
                              {item.contractSymbol}
                            </span>
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
    </section>
  );
});
