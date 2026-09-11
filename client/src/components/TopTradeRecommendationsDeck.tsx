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
  CheckCircle2,
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
  List,
  Columns2
} from 'lucide-react';

export type DeckCategory = 'ALL' | 'BUYERS' | 'SELLERS' | 'GAMMA' | 'BREAKOUTS' | 'CALLS' | 'PUTS';
export type OptionSideFilter = 'ALL' | 'CE' | 'PE';
export type DeckViewMode = 'FLASH' | 'LIST' | 'SPLIT' | 'BUTTONS' | 'TABLE';

interface RecommendationTableItem {
  id: string;
  category: 'BUYERS' | 'SELLERS' | 'GAMMA' | 'BREAKOUTS';
  categoryTitle: string;
  contractSymbol: string;
  assetSymbol?: string;
  assetName?: string;
  strikePrice?: number;
  optionType: 'CE' | 'PE' | 'SPREAD';
  action: string;
  actionBadge: string;
  role: 'BUYER' | 'SELLER';
  executionType: 'NET_DEBIT' | 'NET_CREDIT';
  strategyTag: string;
  entryTimeFormatted: string;
  bookedTimeFormatted?: string;
  carryForwardTimeFormatted?: string;
  carryForwardSuggestion?: string;
  isCarriedForward?: boolean;
  entryRange: string;
  entryPrice: number;
  currentLtp: number;
  pnlPoints: number;
  pnlPct: number;
  pnlRupees: number;
  isProfitable: boolean;
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
  // Lifecycle Milestones & Mode Context
  callGivenTimeFormatted?: string;
  isEntryTriggered?: boolean;
  actualEntryPrice?: number;
  entryPriceTimeFormatted?: string;
  target1HitTimeFormatted?: string;
  target2HitTimeFormatted?: string;
  stoplossTimeFormatted?: string;
  marketRegime?: string;
  isExpiryDay?: boolean;
  explanations?: {
    beginner?: string;
    intermediate?: string;
    expert?: string;
  };
  // Raw tip or context
  rawTip?: UnifiedSmartTip;
  rawHeroSignal?: HeroZeroSignal;
}

interface LockedDeckMilestone {
  callGivenTimeFormatted: string;
  isEntryTriggered: boolean;
  actualEntryPrice?: number;
  entryPriceTimeFormatted?: string;
  target1HitTimeFormatted?: string;
  target2HitTimeFormatted?: string;
  stoplossTimeFormatted?: string;
}

const deckLockedMilestonesMap = new Map<string, LockedDeckMilestone>();

/**
 * High-fidelity Traffic Signal / Traffic Light SVG Icon
 * Features dark housing with visors and red, amber, and animated green lights
 */
export const TrafficSignalIcon: React.FC<{ className?: string; animated?: boolean }> = ({ 
  className = "w-5 h-5",
  animated = true 
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="Traffic Signal Icon"
  >
    {/* Mounting Bracket Caps */}
    <rect x="11" y="0.5" width="2" height="1.5" rx="0.5" fill="#475569" />
    <rect x="11" y="22" width="2" height="1.5" rx="0.5" fill="#475569" />

    {/* Main Traffic Light Housing */}
    <rect
      x="6.5"
      y="1.5"
      width="11"
      height="21"
      rx="3.5"
      className="fill-slate-900 stroke-slate-600 dark:fill-[#080d1a] dark:stroke-slate-500"
      strokeWidth="1.2"
    />

    {/* Visor Caps / Hoods */}
    <path
      d="M7 4.8C7.6 3.5 9.8 2.8 12 2.8C14.2 2.8 16.4 3.5 17 4.8"
      stroke="#64748b"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M7 11.3C7.6 10 9.8 9.3 12 9.3C14.2 9.3 16.4 10 17 11.3"
      stroke="#64748b"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M7 17.8C7.6 16.5 9.8 15.8 12 15.8C14.2 15.8 16.4 16.5 17 17.8"
      stroke="#64748b"
      strokeWidth="1.2"
      strokeLinecap="round"
    />

    {/* Red Light (Top) */}
    <circle
      cx="12"
      cy="5.8"
      r="2.2"
      className="fill-rose-500 stroke-rose-400/80"
      strokeWidth="0.5"
    />
    {/* Amber Light (Middle) */}
    <circle
      cx="12"
      cy="12"
      r="2.2"
      className="fill-amber-400 stroke-amber-300/80"
      strokeWidth="0.5"
    />
    {/* Green Light (Bottom - Active with pulse) */}
    <circle
      cx="12"
      cy="18.2"
      r="2.2"
      className={`fill-emerald-400 stroke-emerald-300/90 ${animated ? 'animate-pulse' : ''}`}
      strokeWidth="0.5"
    />
  </svg>
);

export const TopTradeRecommendationsDeck: React.FC = React.memo(() => {
  const { currentIndexState, selectedIndex, setSelectedIndex, openTradeTipModal, recentSurges, setOptionExpiry } = useMarket();
  const { isBeginner, isIntermediate, isExpert } = useTerminalMode();

  const symConfig = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex);
  const isCommodity = symConfig?.category === 'COMMODITIES';
  const isOffMarket = currentIndexState?.unifiedTipsPackage?.currentSession === 'OFF_MARKET';
  const pkg = currentIndexState?.unifiedTipsPackage;
  const activeExpiryDate = pkg?.activeExpiryDate || currentIndexState?.selectedExpiry;
  const upcomingExpiries = pkg?.upcomingExpiries || [];
  const nextExpiryDate = pkg?.nextExpiryDate;
  const isExpiryDay = pkg?.isExpiryDay || false;


  const [activeTab, setActiveTab] = useState<DeckCategory>('ALL');
  const [optionSideFilter, setOptionSideFilter] = useState<OptionSideFilter>('ALL');
  const [viewMode, setViewMode] = useState<DeckViewMode>('FLASH');
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

    // ── Off-market / stale tips guard ─────────────────────────────────
    // pkg.currentSession === 'OFF_MARKET' is the ONLY reliable signal that tips
    // are from a prior session. lastEvaluatedAt is stamped to NOW on every server
    // push — so it cannot detect staleness. tip.entryTime is "11:15 AM" (formatted
    // display string) — not an ISO date.
    //
    // Rule: when OFF_MARKET, hide all pkg tips EXCEPT explicitly carried-forward
    // positions (status=CARRIED_FORWARD or isCarriedForward=true). These persist
    // until the system issues a square-off directive (TARGET_HIT / SL_HIT today).
    const isPkgOffMarket = pkg?.currentSession === 'OFF_MARKET';

    /** Returns true if a tip from a stale off-market pkg should be shown */
    const isPkgTipAllowed = (t: { isCarriedForward?: boolean; status?: string } | null | undefined): boolean => {
      if (!isPkgOffMarket) return true;       // live market — show everything
      if (!t) return false;
      // Off-market: only carry-forwards survive
      return t.isCarriedForward === true || t.status === 'CARRIED_FORWARD';
    };

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

    const addUniqueItem = (rawItem: Partial<RecommendationTableItem> & {
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
      stoplossPrice: number;
      stoplossPct: number;
      riskReward: string;
      confluenceScore: number;
      status: string;
    }) => {
      const key = getDedupeKey(rawItem);
      if (seenContracts.has(key)) {
        return; // Deduplicate: Skip duplicate recommendation
      }

      // ── Prior-day package guard ───────────────────────────────────────────────
      // If the pkg was computed on a prior IST day (pkg.lastEvaluatedAt is stale),
      // hide this tip unless it is explicitly a carry-forward.
      if (!isPkgTipAllowed(rawItem.rawTip)) {
        return; // → Trade Journal only
      }

      seenContracts.add(key);

      const isItemExpiry = rawItem.isExpiryDay ?? rawItem.rawTip?.isExpiryDay ?? isExpiryDay;
      const isSeller = rawItem.role === 'SELLER' || rawItem.optionType === 'SPREAD';
      const entry = (rawItem.isEntryTriggered && rawItem.actualEntryPrice)
        ? rawItem.actualEntryPrice
        : (rawItem.entryPrice ?? rawItem.rawTip?.entryPrice ?? 0);

      // Look up live option strike LTP from currentIndexState
      const strikePrice = rawItem.strikePrice ?? rawItem.rawTip?.strikePrice;
      const optionType = rawItem.optionType ?? rawItem.rawTip?.optionType;
      const liveStrike = currentIndexState?.strikes?.find(s => s.strikePrice === strikePrice);
      const liveStrikeLtp = liveStrike 
        ? (optionType === 'CE' ? liveStrike.callLtp : (optionType === 'PE' ? liveStrike.putLtp : 0)) 
        : 0;
      const ltp = (liveStrikeLtp > 0) ? liveStrikeLtp : (rawItem.currentLtp ?? rawItem.rawTip?.currentLtp ?? 0);

      const isContractExpired = Boolean(
        rawItem.status === 'EXPIRED' ||
        rawItem.rawTip?.status === 'EXPIRED' ||
        (isItemExpiry && !isCommodity && ltp <= 0.05)
      );

      // Check target achievements
      const target1Price = rawItem.target1Price ?? rawItem.rawTip?.target1Price ?? 0;
      const target2Price = rawItem.target2Price ?? rawItem.rawTip?.target2Price ?? 0;
      const stoplossPrice = rawItem.stoplossPrice ?? rawItem.rawTip?.stoplossPrice ?? 0;

      const isTarget2Hit = rawItem.status === 'TARGET2_HIT' 
        || rawItem.rawTip?.status === 'TARGET2_HIT' 
        || Boolean(rawItem.target2HitTimeFormatted || rawItem.rawTip?.target2HitTimeFormatted)
        || Boolean(target2Price > 0 && !isSeller && ltp >= target2Price)
        || Boolean(target2Price > 0 && isSeller && ltp <= target2Price);

      const isTarget1Hit = isTarget2Hit
        || rawItem.status === 'TARGET1_HIT' 
        || rawItem.rawTip?.status === 'TARGET1_HIT' 
        || Boolean(rawItem.target1HitTimeFormatted || rawItem.rawTip?.target1HitTimeFormatted)
        || Boolean(target1Price > 0 && !isSeller && ltp >= target1Price)
        || Boolean(target1Price > 0 && isSeller && ltp <= target1Price);

      const isSlHit = rawItem.status === 'SL_HIT'
        || rawItem.rawTip?.status === 'SL_HIT'
        || Boolean(rawItem.stoplossTimeFormatted || rawItem.rawTip?.stoplossTimeFormatted)
        || Boolean(stoplossPrice > 0 && !isSeller && ltp <= stoplossPrice)
        || Boolean(stoplossPrice > 0 && isSeller && ltp >= stoplossPrice);

      const finalStatus = isContractExpired 
        ? 'EXPIRED' 
        : isTarget2Hit 
        ? 'TARGET2_HIT' 
        : isTarget1Hit 
        ? 'TARGET1_HIT' 
        : isSlHit 
        ? 'SL_HIT' 
        : (rawItem.status || 'ACTIVE');

      // 1. P&L in points
      let points = 0;
      if (isContractExpired && !isSeller) {
        points = -entry;
      } else if (entry > 0 && ltp > 0) {
        points = isSeller ? (entry - ltp) : (ltp - entry);
      } else if (rawItem.pnlPoints !== undefined && rawItem.pnlPoints !== 0) {
        points = rawItem.pnlPoints;
      } else if (rawItem.rawTip?.pnlPoints !== undefined && rawItem.rawTip.pnlPoints !== 0) {
        points = rawItem.rawTip.pnlPoints;
      }
      points = Number(points.toFixed(2));

      // 2. P&L in percentage
      let pct = 0;
      if (isContractExpired && !isSeller) {
        pct = -100;
      } else if (entry > 0) {
        pct = Number(((points / entry) * 100).toFixed(1));
      } else if (rawItem.pnlPct !== undefined && rawItem.pnlPct !== 0) {
        pct = rawItem.pnlPct;
      } else if (rawItem.rawTip?.pnlPct !== undefined && rawItem.rawTip.pnlPct !== 0) {
        pct = rawItem.rawTip.pnlPct;
      }

      // 3. P&L in Rupees per lot
      let rupees = 0;
      if (isContractExpired && !isSeller) {
        rupees = -Math.round(entry * (lotSize || 50));
      } else {
        rupees = Math.round(points * (lotSize || 50));
      }

      const isProfitable = isContractExpired ? (isSeller ? true : false) : (rawItem.isProfitable !== undefined ? rawItem.isProfitable : rupees >= 0);

      // 4. Carry forward suggestion & time
      let suggestion = rawItem.carryForwardSuggestion || rawItem.rawTip?.carryForwardSuggestion;
      if (isContractExpired) {
        suggestion = 'CONTRACT EXPIRED — SEBI Rules: (1) This option expired at 03:30 PM and settled at ₹0.00. There is NO automatic rollover. (2) To continue the trade, you must manually open a fresh contract in the NEXT EXPIRY separately.';
      } else if (!suggestion) {
        if (isSeller) {
          suggestion = 'Option Seller Overnight Hold: Theta decay works in your favour if OTM decay buffer >65%. You may hold overnight — but options expire at expiry day; settlement is automatic. Close before 03:25 PM if underlying is within 0.4% of sold strike.';
        } else {
          suggestion = 'Intraday Recommendation: Book 50% profits near T1/T2. Options CANNOT be carried overnight (SEBI rules) — avoid holding naked long options; overnight Theta decay will erode premium rapidly.';
        }
      }

      const milestoneKey = rawItem.id || key;
      let mRecord = deckLockedMilestonesMap.get(milestoneKey);
      
      const nowFormatted = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const initialGiven = rawItem.callGivenTimeFormatted || rawItem.rawTip?.callGivenTimeFormatted || rawItem.entryTimeFormatted || rawItem.rawTip?.entryTimeFormatted || nowFormatted;

      if (!mRecord) {
        mRecord = {
          callGivenTimeFormatted: initialGiven,
          isEntryTriggered: rawItem.isEntryTriggered ?? rawItem.rawTip?.isEntryTriggered ?? false,
          actualEntryPrice: rawItem.actualEntryPrice ?? rawItem.rawTip?.actualEntryPrice,
          entryPriceTimeFormatted: rawItem.entryPriceTimeFormatted || rawItem.rawTip?.entryPriceTimeFormatted,
          target1HitTimeFormatted: rawItem.target1HitTimeFormatted || rawItem.rawTip?.target1HitTimeFormatted,
          target2HitTimeFormatted: rawItem.target2HitTimeFormatted || rawItem.rawTip?.target2HitTimeFormatted,
          stoplossTimeFormatted: rawItem.stoplossTimeFormatted || rawItem.rawTip?.stoplossTimeFormatted,
        };
        deckLockedMilestonesMap.set(milestoneKey, mRecord);
      } else {
        if (rawItem.rawTip?.callGivenTimeFormatted) mRecord.callGivenTimeFormatted = rawItem.rawTip.callGivenTimeFormatted;
        if (rawItem.rawTip?.isEntryTriggered) {
          mRecord.isEntryTriggered = true;
          if (rawItem.rawTip.actualEntryPrice) mRecord.actualEntryPrice = rawItem.rawTip.actualEntryPrice;
          if (rawItem.rawTip.entryPriceTimeFormatted) mRecord.entryPriceTimeFormatted = rawItem.rawTip.entryPriceTimeFormatted;
        }
        if (rawItem.rawTip?.target1HitTimeFormatted) mRecord.target1HitTimeFormatted = rawItem.rawTip.target1HitTimeFormatted;
        if (rawItem.rawTip?.target2HitTimeFormatted) mRecord.target2HitTimeFormatted = rawItem.rawTip.target2HitTimeFormatted;
        if (rawItem.rawTip?.stoplossTimeFormatted) mRecord.stoplossTimeFormatted = rawItem.rawTip.stoplossTimeFormatted;
      }

      // Check entry trigger on current tick
      if (!mRecord.isEntryTriggered && entry > 0 && ltp > 0) {
        const isWithinEntry = isSeller
          ? (ltp >= entry * 0.98 && ltp <= entry * 1.05)
          : (ltp <= entry * 1.015 && ltp >= entry * 0.88);
        if (isWithinEntry) {
          mRecord.isEntryTriggered = true;
          mRecord.actualEntryPrice = ltp;
          mRecord.entryPriceTimeFormatted = nowFormatted;
        }
      }

      // Check Target and Stoploss milestones if entered
      if (mRecord.isEntryTriggered && ltp > 0) {
        const target1Price = rawItem.target1Price ?? rawItem.rawTip?.target1Price ?? 0;
        const target2Price = rawItem.target2Price ?? rawItem.rawTip?.target2Price;
        const stoplossPrice = rawItem.stoplossPrice ?? rawItem.rawTip?.stoplossPrice ?? 0;

        if (target1Price > 0 && !mRecord.target1HitTimeFormatted) {
          if ((!isSeller && ltp >= target1Price) || (isSeller && ltp <= target1Price)) {
            mRecord.target1HitTimeFormatted = nowFormatted;
          }
        }

        if (target2Price && target2Price > 0 && !mRecord.target2HitTimeFormatted) {
          if ((!isSeller && ltp >= target2Price) || (isSeller && ltp <= target2Price)) {
            mRecord.target2HitTimeFormatted = nowFormatted;
          }
        }

        if (stoplossPrice > 0 && !mRecord.stoplossTimeFormatted) {
          if ((!isSeller && ltp <= stoplossPrice) || (isSeller && ltp >= stoplossPrice)) {
            mRecord.stoplossTimeFormatted = nowFormatted;
          }
        }
      }

      const carryForwardTimeFormatted = rawItem.carryForwardTimeFormatted || rawItem.rawTip?.carryForwardTimeFormatted || '03:20 PM';

      const entryPriceTimeFormatted = mRecord.entryPriceTimeFormatted || rawItem.entryPriceTimeFormatted || rawItem.rawTip?.entryPriceTimeFormatted || mRecord.callGivenTimeFormatted;
      const target1HitTimeFormatted = mRecord.target1HitTimeFormatted || rawItem.target1HitTimeFormatted || rawItem.rawTip?.target1HitTimeFormatted || (finalStatus === 'TARGET1_HIT' || finalStatus === 'TARGET2_HIT' ? rawItem.bookedTimeFormatted || rawItem.rawTip?.bookedTimeFormatted : undefined);
      const target2HitTimeFormatted = mRecord.target2HitTimeFormatted || rawItem.target2HitTimeFormatted || rawItem.rawTip?.target2HitTimeFormatted || (finalStatus === 'TARGET2_HIT' ? rawItem.bookedTimeFormatted || rawItem.rawTip?.bookedTimeFormatted : undefined);
      const stoplossTimeFormatted = mRecord.stoplossTimeFormatted || rawItem.stoplossTimeFormatted || rawItem.rawTip?.stoplossTimeFormatted || (finalStatus === 'STOPLOSS_HIT' || finalStatus === 'SL_HIT' || finalStatus === 'EXPIRED' ? rawItem.bookedTimeFormatted || rawItem.rawTip?.bookedTimeFormatted : undefined);
      const marketRegime = rawItem.marketRegime || rawItem.rawTip?.marketRegime;
      const explanations = rawItem.explanations || rawItem.rawTip?.explanations;
      const rawAssetSymbol = rawItem.assetSymbol || (rawItem.rawTip as any)?.symbol || (rawItem.rawHeroSignal as any)?.symbol || (rawItem.contractSymbol ? rawItem.contractSymbol.split(' ')[0] : '') || selectedIndex;
      const matchedSym = ALL_SYMBOLS_CONFIG.find(c => c.symbol.toUpperCase() === rawAssetSymbol.toUpperCase()) || symConfig;
      const resolvedAssetSymbol = matchedSym?.symbol || rawAssetSymbol || selectedIndex;
      const resolvedAssetName = matchedSym?.name || resolvedAssetSymbol;
      const actionBadge = isContractExpired ? 'EXPIRED (₹0.00)' : (rawItem.actionBadge || rawItem.action || 'SIGNAL');

      const fullItem: RecommendationTableItem = {
        ...rawItem,
        assetSymbol: resolvedAssetSymbol,
        assetName: resolvedAssetName,
        status: finalStatus,
        actionBadge,
        pnlPoints: points,
        pnlPct: pct,
        pnlRupees: rupees,
        isProfitable,
        carryForwardSuggestion: suggestion,
        carryForwardTimeFormatted,
        callGivenTimeFormatted: mRecord.callGivenTimeFormatted,
        isEntryTriggered: mRecord.isEntryTriggered,
        actualEntryPrice: mRecord.actualEntryPrice,
        entryPriceTimeFormatted,
        target1HitTimeFormatted,
        target2HitTimeFormatted,
        stoplossTimeFormatted,
        marketRegime,
        isExpiryDay: isItemExpiry,
        explanations
      };

      list.push(fullItem);
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
        bookedTimeFormatted: t.bookedTimeFormatted,
        carryForwardTimeFormatted: t.carryForwardTimeFormatted,
        isCarriedForward: t.isCarriedForward,
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
        bookedTimeFormatted: t.bookedTimeFormatted,
        carryForwardTimeFormatted: t.carryForwardTimeFormatted,
        isCarriedForward: t.isCarriedForward,
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
        bookedTimeFormatted: t.bookedTimeFormatted,
        carryForwardTimeFormatted: t.carryForwardTimeFormatted,
        isCarriedForward: t.isCarriedForward,
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
        bookedTimeFormatted: t.bookedTimeFormatted,
        carryForwardTimeFormatted: t.carryForwardTimeFormatted,
        isCarriedForward: t.isCarriedForward,
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
        bookedTimeFormatted: t.bookedTimeFormatted,
        carryForwardTimeFormatted: t.carryForwardTimeFormatted,
        isCarriedForward: t.isCarriedForward,
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
        bookedTimeFormatted: t.bookedTimeFormatted,
        carryForwardTimeFormatted: t.carryForwardTimeFormatted,
        isCarriedForward: t.isCarriedForward,
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
        bookedTimeFormatted: t.bookedTimeFormatted,
        carryForwardTimeFormatted: t.carryForwardTimeFormatted,
        isCarriedForward: t.isCarriedForward,
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
        bookedTimeFormatted: t.bookedTimeFormatted,
        carryForwardTimeFormatted: t.carryForwardTimeFormatted,
        isCarriedForward: t.isCarriedForward,
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
          bookedTimeFormatted: t.bookedTimeFormatted,
          carryForwardTimeFormatted: t.carryForwardTimeFormatted || t.entryTimeFormatted,
          isCarriedForward: true,
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
          entryRange: `₹${callPrice.toFixed(2)}`,
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
          entryRange: `₹${putPrice.toFixed(2)}`,
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
          entryRange: `₹${p.toFixed(2)}`,
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
          entryRange: `₹${p.toFixed(2)}`,
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
          entryRange: `₹${p.toFixed(2)}`,
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
          entryRange: `₹${p.toFixed(2)}`,
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
          entryRange: `₹${pCall.toFixed(2)}`,
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
          entryRange: `₹${pPut.toFixed(2)}`,
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

  // Filtered items based on selected tab & option side filter
  const filteredItems = useMemo(() => {
    let base = items;
    if (activeTab === 'BUYERS') {
      base = base.filter(item => item.role === 'BUYER' || item.category === 'BUYERS');
    } else if (activeTab === 'SELLERS') {
      base = base.filter(item => item.role === 'SELLER' || item.category === 'SELLERS');
    } else if (activeTab === 'GAMMA') {
      base = base.filter(item => item.category === 'GAMMA');
    } else if (activeTab === 'BREAKOUTS') {
      base = base.filter(item => item.category === 'BREAKOUTS');
    } else if (activeTab === 'CALLS') {
      base = base.filter(item => item.optionType === 'CE' || item.action === 'BUY_CALL');
    } else if (activeTab === 'PUTS') {
      base = base.filter(item => item.optionType === 'PE' || item.action === 'BUY_PUT');
    } else if (activeTab !== 'ALL') {
      base = base.filter(item => item.category === activeTab);
    }

    if (optionSideFilter === 'CE') {
      return base.filter(item => item.optionType === 'CE' || item.action === 'BUY_CALL');
    }
    if (optionSideFilter === 'PE') {
      return base.filter(item => item.optionType === 'PE' || item.action === 'BUY_PUT');
    }
    return base;
  }, [items, activeTab, optionSideFilter]);

  // Dedicated Call & Put segregated lists for Split Dual View
  const callItems = useMemo(() => {
    let base = items;
    if (activeTab === 'BUYERS') base = base.filter(item => item.role === 'BUYER' || item.category === 'BUYERS');
    else if (activeTab === 'SELLERS') base = base.filter(item => item.role === 'SELLER' || item.category === 'SELLERS');
    else if (activeTab === 'GAMMA') base = base.filter(item => item.category === 'GAMMA');
    return base.filter(item => item.optionType === 'CE' || item.action === 'BUY_CALL');
  }, [items, activeTab]);

  const putItems = useMemo(() => {
    let base = items;
    if (activeTab === 'BUYERS') base = base.filter(item => item.role === 'BUYER' || item.category === 'BUYERS');
    else if (activeTab === 'SELLERS') base = base.filter(item => item.role === 'SELLER' || item.category === 'SELLERS');
    else if (activeTab === 'GAMMA') base = base.filter(item => item.category === 'GAMMA');
    return base.filter(item => item.optionType === 'PE' || item.action === 'BUY_PUT');
  }, [items, activeTab]);

  // Counts for each tab badge
  const counts = useMemo(() => {
    return {
      ALL: items.length,
      BUYERS: items.filter(i => i.role === 'BUYER' || i.category === 'BUYERS').length,
      SELLERS: items.filter(i => i.role === 'SELLER' || i.category === 'SELLERS').length,
      GAMMA: items.filter(i => i.category === 'GAMMA').length,
      BREAKOUTS: items.filter(i => i.category === 'BREAKOUTS').length,
      CALLS: items.filter(i => i.optionType === 'CE' || i.action === 'BUY_CALL').length,
      PUTS: items.filter(i => i.optionType === 'PE' || i.action === 'BUY_PUT').length,
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

  // Handler to open full Trade Tip Modal (with optional initial depth modal)
  const handleOpenTipModal = (
    item: RecommendationTableItem, 
    initialDepthModal?: 'MILESTONES' | 'CONFLUENCE' | 'GREEKS' | 'ENTRY_TACTICS' | 'CARRY_FORWARD' | null
  ) => {
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
        givenTimeFormatted: item.callGivenTimeFormatted || t.callGivenTimeFormatted || t.entryTimeFormatted || item.entryTimeFormatted,
        callGivenTimeFormatted: item.callGivenTimeFormatted || t.callGivenTimeFormatted || item.entryTimeFormatted,
        isEntryTriggered: item.isEntryTriggered ?? t.isEntryTriggered,
        actualEntryPrice: item.actualEntryPrice ?? t.actualEntryPrice,
        entryPriceTimeFormatted: item.entryPriceTimeFormatted || t.entryPriceTimeFormatted || item.entryTimeFormatted,
        target1HitTimeFormatted: item.target1HitTimeFormatted || t.target1HitTimeFormatted,
        target2HitTimeFormatted: item.target2HitTimeFormatted || t.target2HitTimeFormatted,
        stoplossTimeFormatted: item.stoplossTimeFormatted || t.stoplossTimeFormatted,
        bookedTimeFormatted: t.bookedTimeFormatted || item.bookedTimeFormatted,
        carryForwardTimeFormatted: t.carryForwardTimeFormatted || item.carryForwardTimeFormatted,
        carryForwardSuggestion: t.carryForwardSuggestion || item.carryForwardSuggestion,
        isCarriedForward: t.isCarriedForward || item.isCarriedForward,
        marketRegime: (item.marketRegime || t.marketRegime) as any,
        isExpiryDay: item.isExpiryDay ?? t.isExpiryDay,
        pnlRupees: item.pnlRupees,
        pnlPoints: item.pnlPoints,
        pnlPct: item.pnlPct,
        elapsedTimeFormatted: 'Live Terminal Session',
        actionGuidance: t.strategyTag,
        status: t.status,
        strategyTag: t.strategyTag,
        lotSize,
        explanations: t.explanations || item.explanations,
        tradingRole: t.tradingRole,
        executionType: t.executionType,
        confluenceBreakdown: t.confluenceBreakdown,
        sellerMetrics: t.sellerMetrics,
        initialDepthModal: initialDepthModal || null
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
        givenTimeFormatted: item.callGivenTimeFormatted || item.entryTimeFormatted || 'Power Hour',
        callGivenTimeFormatted: item.callGivenTimeFormatted || item.entryTimeFormatted,
        isEntryTriggered: item.isEntryTriggered,
        actualEntryPrice: item.actualEntryPrice,
        entryPriceTimeFormatted: item.entryPriceTimeFormatted || item.entryTimeFormatted,
        target1HitTimeFormatted: item.target1HitTimeFormatted,
        target2HitTimeFormatted: item.target2HitTimeFormatted,
        stoplossTimeFormatted: item.stoplossTimeFormatted,
        bookedTimeFormatted: item.bookedTimeFormatted,
        carryForwardTimeFormatted: item.carryForwardTimeFormatted,
        carryForwardSuggestion: item.carryForwardSuggestion,
        isCarriedForward: item.isCarriedForward,
        marketRegime: 'VOLATILE_SURGE',
        isExpiryDay: item.isExpiryDay ?? isExpiryDay,
        pnlRupees: item.pnlRupees,
        pnlPoints: item.pnlPoints,
        pnlPct: item.pnlPct,
        elapsedTimeFormatted: '0DTE Special',
        actionGuidance: hz.rationale,
        status: 'ACTIVE',
        strategyTag: '0DTE Gamma Sniper',
        lotSize,
        initialDepthModal: initialDepthModal || null
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
        givenTimeFormatted: item.callGivenTimeFormatted || item.entryTimeFormatted,
        callGivenTimeFormatted: item.callGivenTimeFormatted || item.entryTimeFormatted,
        isEntryTriggered: item.isEntryTriggered,
        actualEntryPrice: item.actualEntryPrice,
        entryPriceTimeFormatted: item.entryPriceTimeFormatted || item.entryTimeFormatted,
        target1HitTimeFormatted: item.target1HitTimeFormatted,
        target2HitTimeFormatted: item.target2HitTimeFormatted,
        stoplossTimeFormatted: item.stoplossTimeFormatted,
        bookedTimeFormatted: item.bookedTimeFormatted,
        carryForwardTimeFormatted: item.carryForwardTimeFormatted,
        carryForwardSuggestion: item.carryForwardSuggestion,
        isCarriedForward: item.isCarriedForward,
        marketRegime: (item.marketRegime || 'TRENDING_EXPANSION') as any,
        isExpiryDay: item.isExpiryDay,
        pnlRupees: item.pnlRupees,
        pnlPoints: item.pnlPoints,
        pnlPct: item.pnlPct,
        elapsedTimeFormatted: 'Live Terminal Session',
        actionGuidance: item.strategyTag,
        status: item.status,
        strategyTag: item.strategyTag,
        lotSize,
        explanations: item.explanations,
        tradingRole: item.role,
        executionType: item.executionType,
        sellerMetrics: {
          netCreditRupees: item.netCreditRupees,
          maxProfitRupees: item.maxProfitRupees,
          maxLossRupees: item.maxLossRupees,
          marginRequiredRupees: item.marginRequiredRupees,
          probabilityOfProfitPct: item.probabilityOfProfitPct
        },
        initialDepthModal: initialDepthModal || null
      });
    }
  };

  // Click handler for Fayda signals & details: open full interactive trade blueprint modal popup
  const handleButtonClick = (item: RecommendationTableItem) => {
    handleOpenTipModal(item);
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
      `🚦 [FAYDA SIGNALS] LIVE SIGNAL`,
      `⚡ SYMBOL: ${item.contractSymbol}`,
      `🏷️ ACTION: ${item.actionBadge} (${item.role === 'SELLER' ? 'Option Seller • Net Credit' : 'Option Buyer • Net Debit'})`,
      `💰 PERFECT ENTRY: ${item.entryRange} (LTP: ₹${item.currentLtp.toFixed(2)})`,
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

  // Reusable Emergent Details Modal Box Popup (Fixed Overlay Backdrop, Never Inline)
  const renderEmergentDetailsPanel = () => {
    if (!selectedItem) return null;

    const isCall = selectedItem.optionType === 'CE' || selectedItem.action === 'BUY_CALL';
    const isPut = selectedItem.optionType === 'PE' || selectedItem.action === 'BUY_PUT';
    const isSeller = selectedItem.role === 'SELLER' || selectedItem.optionType === 'SPREAD';
    const isGamma = selectedItem.category === 'GAMMA';

    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 select-text"
        onClick={() => setSelectedItemId(null)}
      >
        <div 
          id="emergent-details-panel" 
          className="w-full max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0d1527] dark:via-[#0a1120] dark:to-[#070c17] border-2 border-amber-400/90 dark:border-accent-gold/70 shadow-2xl shadow-amber-500/15 transition-all duration-300 my-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Emergent Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-accent-gold border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-black uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/35 flex items-center gap-1 shadow-xs" title={`Underlying Asset: ${selectedItem.assetName || selectedItem.assetSymbol || selectedIndex}`}>
                  <span>{selectedItem.assetName || selectedItem.assetSymbol || selectedIndex}</span>
                </span>
                <span className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white">
                  {selectedItem.strikePrice ? `${selectedItem.strikePrice.toLocaleString('en-IN')} ${selectedItem.optionType}` : selectedItem.contractSymbol}
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
                {selectedItem.status === 'EXPIRED' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1">
                    <span>🛑 EXPIRED (₹0.00)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>{selectedItem.status}</span>
                  </span>
                )}
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
                selectedItem.isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {selectedItem.pnlRupees >= 0 ? '+' : ''}
                ₹{selectedItem.pnlRupees.toLocaleString('en-IN')} ({selectedItem.pnlPct >= 0 ? '+' : ''}{selectedItem.pnlPct}%)
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

        {/* BTST/Overnight Guidance Banner */}
        {selectedItem.carryForwardSuggestion && (
          <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 my-3 flex items-start gap-2.5 text-xs font-mono">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-300 shrink-0 mt-0.5">
              🌙
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider text-[11px]">
                  BTST / Overnight Guidance ({selectedItem.carryForwardTimeFormatted || '03:20 PM IST'}) — SEBI Compliant
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                {selectedItem.carryForwardSuggestion}
              </p>
            </div>
          </div>
        )}

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
          isExpiryDay={selectedItem.isExpiryDay ?? isExpiryDay}
          status={selectedItem.status}
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
      </div>
    );
  };

  const renderTradeCard = (item: RecommendationTableItem) => {
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
        onClick={() => handleOpenTipModal(item)}
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

              {/* Asset Title & Strike Price */}
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-black uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/35 flex items-center gap-1 shrink-0" title={`Asset: ${item.assetName || item.assetSymbol || selectedIndex}`}>
                <span>{item.assetName || item.assetSymbol || selectedIndex}</span>
              </span>

              <span className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-accent-gold transition-colors">
                {strikeLabel}
              </span>

              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {item.actionBadge}
              </span>

              {item.expiryDate && !isCommodity && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${
                  item.isExpiryDay
                    ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                    : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                }`}>
                  {item.isExpiryDay ? '⚡ 0DTE:' : '📅'} {item.expiryDate}
                </span>
              )}

              {/* Dedicated P&L Badge */}
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border ${
                item.isProfitable
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
              }`}>
                P&L: {item.pnlRupees >= 0 ? '+' : ''}₹{item.pnlRupees.toLocaleString('en-IN')} / lot ({item.pnlPct >= 0 ? '+' : ''}{item.pnlPct}%)
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

              <div className="flex items-center gap-1.5 flex-wrap ml-auto sm:ml-0 text-[11px] font-mono">
                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Given: {item.callGivenTimeFormatted || item.entryTimeFormatted || '11:15 AM'}</span>
                </span>
                {item.isEntryTriggered ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Entered: {item.entryPriceTimeFormatted || 'Live'} @ ₹{(item.actualEntryPrice || item.entryPrice).toFixed(1)}</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Timer className="w-2.5 h-2.5" />
                    <span>Waiting for Entry Zone</span>
                  </span>
                )}
                {item.target1HitTimeFormatted && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Award className="w-2.5 h-2.5 text-emerald-500" />
                    <span>T1 Hit: {item.target1HitTimeFormatted}</span>
                  </span>
                )}
                {item.target2HitTimeFormatted && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-purple-500" />
                    <span>T2 Hit: {item.target2HitTimeFormatted}</span>
                  </span>
                )}
                {item.stoplossTimeFormatted && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                    <span>SL Hit: {item.stoplossTimeFormatted}</span>
                  </span>
                )}
                {item.bookedTimeFormatted && !item.target1HitTimeFormatted && !item.stoplossTimeFormatted && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                    item.status === 'SL_HIT'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}>
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>{item.status === 'SL_HIT' ? 'Loss Booked:' : 'Profit Booked:'} {item.bookedTimeFormatted}</span>
                  </span>
                )}
                {(item.isCarriedForward || item.carryForwardTimeFormatted) && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
                    <span>BTST Window: {item.carryForwardTimeFormatted || item.entryTimeFormatted}</span>
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans line-clamp-1">
              {item.strategyTag}
            </p>

            {/* BTST/Overnight Guidance Strip */}
            {item.carryForwardSuggestion && (
              <div className="mt-1.5 p-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 flex items-center gap-2 text-[11px] font-mono text-purple-900 dark:text-purple-200">
                <span className="font-bold text-purple-700 dark:text-purple-400 shrink-0">🌙 BTST/Overnight Guidance ({item.carryForwardTimeFormatted || '03:20 PM'}) — SEBI:</span>
                <span className="text-slate-600 dark:text-slate-300 truncate">{item.carryForwardSuggestion}</span>
              </div>
            )}
          </div>

          {/* Middle: 4 Key Metrics Blocks (Entry, LTP, Target, SL) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 min-w-[280px]">
            {/* Entry Range */}
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase block">Perfect Entry</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                {item.entryRange || `₹${item.entryPrice.toFixed(2)}`}
              </span>
              <span className={`text-[9px] font-mono font-bold mt-0.5 truncate block ${item.isEntryTriggered ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {item.isEntryTriggered ? `🟢 In: ${item.entryPriceTimeFormatted || 'Live'}` : `⏳ Trigger @ ₹${item.entryPrice.toFixed(2)}`}
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
              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 truncate block">
                {item.target1HitTimeFormatted ? `🏆 Hit: ${item.target1HitTimeFormatted}` : 'Pending Target'}
              </span>
            </div>

            {/* Stop Loss */}
            <div className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60">
              <span className="text-[9px] font-mono text-rose-700 dark:text-rose-400 uppercase block">Stop Loss (SL)</span>
              <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-400 truncate block">
                ₹{item.stoplossPrice.toFixed(1)} (-{item.stoplossPct}%)
              </span>
              <span className="text-[9px] font-mono text-rose-600 dark:text-rose-400 font-bold mt-0.5 truncate block">
                {item.stoplossTimeFormatted ? `🛑 Hit: ${item.stoplossTimeFormatted}` : 'Active Shield'}
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

            {/* Details Modal Popup Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTipModal(item);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Click to open full trade setup details modal popup"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Details ↗</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section 
      id="top-trade-recommendations-command-center"
      aria-label="Fayda Signals Command Center"
      className="w-full bg-white dark:bg-gradient-to-b dark:from-[#0b1424] dark:via-[#0e172a] dark:to-[#080d1a] border border-amber-400/60 dark:border-accent-gold/40 rounded-2xl shadow-lg dark:shadow-[0_4px_30px_rgba(255,184,0,0.12)] overflow-hidden transition-all duration-200 select-none font-sans"
    >
      {/* ========================================================================= */}
      {/* ── TOP HEADER STRIP: BRANDING + SECTION TABS + RISK CALCULATOR ────────── */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Title & Pulse Indicator */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-slate-900/90 dark:bg-slate-950 text-amber-500 border border-slate-700/80 dark:border-slate-700/90 shadow-md flex items-center justify-center shrink-0">
            <TrafficSignalIcon className="w-6 h-6" animated={true} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-mono font-black text-slate-900 dark:text-white tracking-wide uppercase flex items-center gap-2">
                <TrafficSignalIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" animated={true} />
                <span>Fayda Signals</span>
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
              {/* ── Expiry Badge ── */}
              {!isCommodity && activeExpiryDate && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1 border ${
                  isExpiryDay
                    ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 animate-pulse'
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800/60'
                }`}>
                  {isExpiryDay ? '⚡' : '📅'} {activeExpiryDate}{isExpiryDay ? ' • 0DTE' : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span>{isBeginner ? 'Safe high-probability setups with defined profit targets & stop loss' : isExpert ? 'Multi-indicator alpha confluence with Greek profiles & delta order flow' : 'Institutional momentum setups & probability-of-profit credit spreads'}</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-amber-700 dark:text-amber-400 font-bold">10-Factor Confluence</span>
            </p>
            {/* ── 0DTE Alert Banner ── */}
            {isExpiryDay && !isCommodity && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                  {isOffMarket 
                    ? '🛑 0DTE CONTRACTS EXPIRED AT 03:30 PM — Today\'s contracts settled at ₹0.00 / intrinsic cash value.'
                    : '⚠️ 0DTE TODAY (SEBI Rules) — Options CANNOT be carried overnight. Square off by 03:25 PM IST. To continue, manually open next-expiry contract.'}
                </span>
                {nextExpiryDate && setOptionExpiry && (
                  <button
                    type="button"
                    onClick={() => setOptionExpiry(nextExpiryDate)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 transition-all cursor-pointer flex items-center gap-1"
                    title={`Open fresh Next Expiry (${nextExpiryDate}) contract for BTST — SEBI requires manual close + re-open`}
                  >
                    🌙 Open Fresh Next Expiry ({nextExpiryDate}) for BTST →
                  </button>
                )}
              </div>
            )}
            {/* ── Expiry Switcher Pills (when multiple expiries available) ── */}
            {!isCommodity && upcomingExpiries.length > 1 && !isExpiryDay && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500 uppercase">Expiry:</span>
                {upcomingExpiries.slice(0, 3).map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setOptionExpiry(exp)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                      exp === activeExpiryDate
                        ? 'bg-amber-500 text-slate-900 border-amber-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {exp === activeExpiryDate ? '✓ ' : ''}{exp}
                  </button>
                ))}
              </div>
            )}
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
            <button
              type="button"
              onClick={() => {
                setViewMode('SPLIT');
                setOptionSideFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'SPLIT'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
              title="View Calls and Puts side-by-side in separate columns"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>⚖️ Side-by-Side</span>
            </button>
          </div>

          {/* ── Option Type Filter Pills (CALL vs PUT vs BOTH) ────────────────── */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300 dark:border-slate-800 gap-1 text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setOptionSideFilter('ALL')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                optionSideFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
              title="Show both Call & Put setups"
            >
              <span>Both (CE & PE)</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${optionSideFilter === 'ALL' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {counts.ALL}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOptionSideFilter('CE');
                if (viewMode === 'SPLIT') setViewMode('LIST');
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                optionSideFilter === 'CE'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
              title="Filter and view only Bullish Call (CE) setups"
            >
              <span className={`w-2 h-2 rounded-full ${optionSideFilter === 'CE' ? 'bg-slate-950' : 'bg-emerald-500'} animate-pulse`} />
              <span>🟢 Calls (CE)</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${optionSideFilter === 'CE' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'}`}>
                {counts.CALLS}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOptionSideFilter('PE');
                if (viewMode === 'SPLIT') setViewMode('LIST');
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                optionSideFilter === 'PE'
                  ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
              title="Filter and view only Bearish Put (PE) setups"
            >
              <span className={`w-2 h-2 rounded-full ${optionSideFilter === 'PE' ? 'bg-white' : 'bg-rose-500'} animate-pulse`} />
              <span>🔴 Puts (PE)</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${optionSideFilter === 'PE' ? 'bg-white/20 text-white font-black' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'}`}>
                {counts.PUTS}
              </span>
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
      {/* ── AFTER-HOURS 03:40 PM IST BANNER (HALTED FOR EQUITIES, ACTIVE FOR MCX) ─ */}
      {/* ========================================================================= */}
      {isOffMarket && !isCommodity && (
        <div className="mx-3.5 sm:mx-5 mt-3.5 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-amber-500/10 border border-amber-500/40 dark:border-amber-400/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono shadow-sm">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  EQUITY INTRADAY HALTED (03:40 PM IST)
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Closed at 03:40 PM IST • Showing Closing Outcomes & P&L Audit
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                New intraday signals for NSE/BSE cease after 03:40 PM. All trades show final entry time, booked profit/loss time, and BTST guidance (SEBI: close current contract + open fresh next-expiry manually). MCX Commodities remain active for live trading until 11:30 PM IST.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIndex('CRUDEOIL')}
            className="self-start md:self-center px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
          >
            <span>Switch to MCX Commodities</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {isCommodity && (
        <div className="mx-3.5 sm:mx-5 mt-3.5 p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase">
              MCX Commodity Evening Session Live (Trades until 11:30 PM IST)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">
            Active real-time alpha & breakout signals enabled
          </span>
        </div>
      )}

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
                      {optionSideFilter === 'CE' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                          🟢 CALLS ONLY
                        </span>
                      )}
                      {optionSideFilter === 'PE' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40">
                          🔴 PUTS ONLY
                        </span>
                      )}
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
                const isProfitable = currentFlashTip.isProfitable;

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

                        {/* Asset Title & Strike Price */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/35 flex items-center gap-1.5 shadow-xs" title={`Underlying Asset: ${currentFlashTip.assetName || currentFlashTip.assetSymbol || selectedIndex}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>{currentFlashTip.assetName || currentFlashTip.assetSymbol || selectedIndex}</span>
                          </span>
                          <span className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
                            {strikeLabel}
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {currentFlashTip.actionBadge}
                        </span>

                        {currentFlashTip.expiryDate && !isCommodity && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border uppercase tracking-wider flex items-center gap-1 ${
                            currentFlashTip.isExpiryDay
                              ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800/60'
                          }`}>
                            {currentFlashTip.isExpiryDay ? '⚡ 0DTE:' : '📅'} {currentFlashTip.expiryDate}
                          </span>
                        )}
                      </div>

                      {/* Confluence Pill, P&L Badge & Timing Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* P&L BADGE (Rupees per lot & Pct) */}
                        <div className={`px-3 py-1 rounded-xl text-xs font-mono font-black border flex items-center gap-1.5 ${
                          currentFlashTip.isProfitable
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                        }`}>
                          <span>{currentFlashTip.isProfitable ? '🟢' : '🔴'} P&L:</span>
                          <span>{currentFlashTip.pnlRupees >= 0 ? '+' : ''}₹{currentFlashTip.pnlRupees.toLocaleString('en-IN')} / lot</span>
                          <span className="text-[10px]">({currentFlashTip.pnlPct >= 0 ? '+' : ''}{currentFlashTip.pnlPct}%)</span>
                        </div>

                        <div className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-accent-gold border border-amber-500/30 font-mono text-xs font-black flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>{currentFlashTip.confluenceScore}% Confluence</span>
                        </div>

                        {/* Timing Badges: Given, Booked (Profit/Loss), Carry Forward */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-500" />
                            <span>Given: {currentFlashTip.callGivenTimeFormatted || currentFlashTip.entryTimeFormatted}</span>
                          </span>

                          {currentFlashTip.isEntryTriggered ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Entered: {currentFlashTip.entryPriceTimeFormatted || 'Live'} @ ₹{(currentFlashTip.actualEntryPrice || currentFlashTip.entryPrice).toFixed(1)}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center gap-1">
                              <Timer className="w-3.5 h-3.5 text-amber-500" />
                              <span>Waiting for Entry Zone</span>
                            </span>
                          )}

                          {currentFlashTip.target1HitTimeFormatted && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-emerald-500" />
                              <span>T1 Hit: {currentFlashTip.target1HitTimeFormatted}</span>
                            </span>
                          )}

                          {currentFlashTip.target2HitTimeFormatted && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                              <span>T2 Hit: {currentFlashTip.target2HitTimeFormatted}</span>
                            </span>
                          )}

                          {currentFlashTip.stoplossTimeFormatted && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                              <span>SL Hit: {currentFlashTip.stoplossTimeFormatted}</span>
                            </span>
                          )}

                          {currentFlashTip.bookedTimeFormatted && !currentFlashTip.target1HitTimeFormatted && !currentFlashTip.stoplossTimeFormatted && (
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1 ${
                              currentFlashTip.status === 'SL_HIT'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                            }`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{currentFlashTip.status === 'SL_HIT' ? 'Loss Booked:' : 'Profit Booked:'} {currentFlashTip.bookedTimeFormatted}</span>
                            </span>
                          )}

                          {(currentFlashTip.isCarriedForward || currentFlashTip.carryForwardTimeFormatted) && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
                              <span>BTST Window: {currentFlashTip.carryForwardTimeFormatted || '03:20 PM'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Strategy Tag */}
                    <div className="py-2.5 text-xs font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-semibold">{currentFlashTip.strategyTag}</span>
                    </div>

                    {/* Carry Forward Suggestion Banner */}
                    {currentFlashTip.carryForwardSuggestion && (
                      <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 my-2.5 flex items-start gap-2.5 text-xs font-mono">
                        <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-300 shrink-0 mt-0.5">
                          🌙
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-purple-800 dark:text-purple-300 uppercase tracking-wider text-[11px]">
                              BTST / Overnight Guidance ({currentFlashTip.carryForwardTimeFormatted || '03:20 PM IST'}) — SEBI Compliant
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                            {currentFlashTip.carryForwardSuggestion}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 7 High-Alpha Metrics Cards (Including Dedicated P&L / Lot Card) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 my-3">
                      {/* Entry Zone */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">
                          {isBeginner ? '🔰 Perfect Buy Price' : isExpert ? 'Perfect Entry Trigger' : 'Perfect Entry'}
                        </div>
                        <div className="text-sm font-mono font-black text-sky-600 dark:text-sky-400 mt-0.5">
                          {currentFlashTip.entryRange}
                        </div>
                        <div className={`text-[9px] font-mono font-bold mt-0.5 truncate ${currentFlashTip.isEntryTriggered ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {currentFlashTip.isEntryTriggered ? `🟢 In: ${currentFlashTip.entryPriceTimeFormatted || 'Live'}` : `⏳ Trigger @ ₹${currentFlashTip.entryPrice?.toFixed(2) || currentFlashTip.entryRange}`}
                        </div>
                      </div>

                      {/* Live LTP */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">
                          {isBeginner ? 'Current Price' : isExpert ? 'Option LTP' : 'Current LTP'}
                        </div>
                        <div className="text-base font-mono font-black text-amber-600 dark:text-amber-400 mt-0.5">
                          ₹{currentFlashTip.currentLtp.toFixed(2)}
                        </div>
                        <div className={`text-[10px] font-mono font-bold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {ltpDiff >= 0 ? `+₹${ltpDiff.toFixed(1)}` : `-₹${Math.abs(ltpDiff).toFixed(1)}`}
                        </div>
                      </div>

                      {/* Dedicated P&L / Lot Card */}
                      <div className={`p-3 rounded-xl border ${
                        currentFlashTip.isProfitable
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80'
                          : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80'
                      }`}>
                        <div className={`text-[10px] uppercase font-mono font-bold ${
                          currentFlashTip.isProfitable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {isBeginner ? '💵 Profit / Lot' : isExpert ? 'Live Alpha P&L' : 'P&L / Lot'}
                        </div>
                        <div className={`text-base font-mono font-black mt-0.5 ${
                          currentFlashTip.isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {currentFlashTip.pnlRupees >= 0 ? '+' : ''}₹{currentFlashTip.pnlRupees.toLocaleString('en-IN')}
                        </div>
                        <div className={`text-[10px] font-mono font-bold ${
                          currentFlashTip.isProfitable ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {currentFlashTip.pnlPoints >= 0 ? `+${currentFlashTip.pnlPoints} pts` : `${currentFlashTip.pnlPoints} pts`} ({currentFlashTip.pnlPct >= 0 ? '+' : ''}{currentFlashTip.pnlPct}%)
                        </div>
                      </div>

                      {/* Target 1 */}
                      <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                        <div className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400">
                          {isBeginner ? '🎯 Profit Goal 1' : isExpert ? '1.2σ Expansion' : 'Target 1'}
                        </div>
                        <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ₹{currentFlashTip.target1Price.toFixed(2)}
                        </div>
                        <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 truncate">
                          ⏱️ {currentFlashTip.target1HitTimeFormatted ? `Hit: ${currentFlashTip.target1HitTimeFormatted}` : (currentFlashTip.status === 'TARGET1_HIT' || currentFlashTip.status === 'TARGET2_HIT' ? (currentFlashTip.bookedTimeFormatted || 'Booked') : 'Pending Target')}
                        </div>
                      </div>

                      {/* Target 2 */}
                      <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                        <div className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400">
                          {isBeginner ? '🚀 Bonus Goal 2' : isExpert ? '1.8σ Gamma Runner' : 'Target 2'}
                        </div>
                        <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ₹{(currentFlashTip.target2Price || currentFlashTip.target1Price * 1.25).toFixed(2)}
                        </div>
                        <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 truncate">
                          ⏱️ {currentFlashTip.target2HitTimeFormatted ? `Hit: ${currentFlashTip.target2HitTimeFormatted}` : (currentFlashTip.status === 'TARGET2_HIT' ? (currentFlashTip.bookedTimeFormatted || 'Booked') : 'Runner Trailing')}
                        </div>
                      </div>

                      {/* Stoploss */}
                      <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
                        <div className="text-[10px] uppercase font-mono text-rose-600 dark:text-rose-400">
                          {isBeginner ? '🛡️ Capital Shield' : isExpert ? 'Invalidation Level' : 'Stop Loss'}
                        </div>
                        <div className="text-sm font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5">
                          ₹{currentFlashTip.stoplossPrice.toFixed(2)}
                        </div>
                        <div className="text-[9px] font-mono text-rose-600 dark:text-rose-400 font-bold mt-0.5 truncate">
                          ⏱️ {currentFlashTip.stoplossTimeFormatted ? `Hit: ${currentFlashTip.stoplossTimeFormatted}` : (currentFlashTip.status === 'STOPLOSS_HIT' ? (currentFlashTip.bookedTimeFormatted || 'Stopped Out') : 'Active Shield')}
                        </div>
                      </div>

                      {/* Risk Reward */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                        <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">
                          {isBeginner ? 'Reward vs Risk' : isExpert ? 'Asymmetric R:R' : 'Risk : Reward'}
                        </div>
                        <div className="text-sm font-mono font-black text-slate-900 dark:text-white mt-0.5">
                          {currentFlashTip.riskReward}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          Lot: {lotSize}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar with Progressive Disclosure Depth Triggers */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Open Trade Tip Modal */}
                        <button
                          type="button"
                          onClick={() => handleOpenTipModal(currentFlashTip)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{isBeginner ? '🔰 Quick Setup Guide' : isExpert ? '🔬 Greek Blueprint' : '⚡ 3-Sec Quick Signal'}</span>
                        </button>

                        {/* Quick Depth Button: Milestones */}
                        <button
                          type="button"
                          onClick={() => handleOpenTipModal(currentFlashTip, 'MILESTONES')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Open 6-Stage Timestamped Milestones Modal"
                        >
                          <Clock className="w-3 h-3 text-sky-500" />
                          <span>⏱️ Milestones</span>
                        </button>

                        {/* Quick Depth Button: Confluence */}
                        <button
                          type="button"
                          onClick={() => handleOpenTipModal(currentFlashTip, 'CONFLUENCE')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Open 10-Factor Confluence Checklist Modal"
                        >
                          <Award className="w-3 h-3 text-amber-500" />
                          <span>📊 Confluence</span>
                        </button>

                        {/* Quick Depth Button: Greeks */}
                        <button
                          type="button"
                          onClick={() => handleOpenTipModal(currentFlashTip, 'GREEKS')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Open Option Greeks & Payoff Calculator Modal"
                        >
                          <ShieldCheck className="w-3 h-3 text-purple-400" />
                          <span>🔬 Greeks</span>
                        </button>

                        {/* Quick Depth Button: BTST/Overnight Rules */}
                        <button
                          type="button"
                          onClick={() => handleOpenTipModal(currentFlashTip, 'CARRY_FORWARD')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Open BTST / Overnight Rules (SEBI Compliant)"
                        >
                          <span>🌙</span>
                          <span>BTST Rules</span>
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
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Calculator className="w-3 h-3" />
                          <span>Calc</span>
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
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Basket</span>
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
                  Showing 1 Fayda signal for 7 seconds. Want to see all {filteredItems.length} signals at once? Click{' '}
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
              {filteredItems.map(item => renderTradeCard(item))}
            </div>
          )}

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
      {/* ── 2. SEPARATE SIDE-BY-SIDE CALL (CE) & PUT (PE) DUAL COLUMN VIEW ──────── */}
      {/* ========================================================================= */}
      {viewMode === 'SPLIT' && (
        <div className="p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col space-y-4">
          {/* Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Bullish Call Setups (CE): {callItems.length}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Bearish Put Setups (PE): {putItems.length}</span>
              </div>
            </div>
            <span className="text-slate-500 dark:text-slate-400">
              ⚡ Side-by-Side Dual-Stream Execution Deck
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* 🟢 Left Column: Calls (CE) */}
            <div className="flex flex-col space-y-2.5">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-black">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>🟢 CALL (CE) SIGNALS & BULL SPREADS</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px]">
                  {callItems.length} active
                </span>
              </div>

              {callItems.length === 0 ? (
                <div className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Info className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                  <span>No active Call setups under current filter</span>
                </div>
              ) : (
                callItems.map(item => renderTradeCard(item))
              )}
            </div>

            {/* 🔴 Right Column: Puts (PE) */}
            <div className="flex flex-col space-y-2.5">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-mono text-xs font-black">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>🔴 PUT (PE) SIGNALS & BEAR SPREADS</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px]">
                  {putItems.length} active
                </span>
              </div>

              {putItems.length === 0 ? (
                <div className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Info className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                  <span>No active Put setups under current filter</span>
                </div>
              ) : (
                putItems.map(item => renderTradeCard(item))
              )}
            </div>
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
                    onClick={() => handleOpenTipModal(item)}
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

                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Given: {item.callGivenTimeFormatted || item.entryTimeFormatted || '11:15 AM'}</span>
                        </div>
                        {item.isEntryTriggered ? (
                          <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                            🟢 In: {item.entryPriceTimeFormatted || item.entryTimeFormatted}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-0.5">
                            ⏳ Waiting Zone
                          </span>
                        )}
                        {item.target1HitTimeFormatted && (
                          <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                            🏆 T1: {item.target1HitTimeFormatted}
                          </span>
                        )}
                        {item.stoplossTimeFormatted && (
                          <span className="px-1.5 py-0.2 rounded font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-0.5">
                            🛑 SL: {item.stoplossTimeFormatted}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Strike Price & Strategy Tag */}
                    <div className="my-2.5">
                      <div className="flex items-baseline justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-black uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/35 flex items-center gap-1 shrink-0" title={`Asset: ${item.assetName || item.assetSymbol || selectedIndex}`}>
                            <span>{item.assetName || item.assetSymbol || selectedIndex}</span>
                          </span>
                          <span className="text-base sm:text-lg font-mono font-black text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-accent-gold transition-colors">
                            {strikeLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {item.actionBadge}
                          </span>
                          {item.expiryDate && !isCommodity && (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase ${
                              item.isExpiryDay
                                ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                            }`}>
                              {item.isExpiryDay ? '⚡ 0DTE' : item.expiryDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-sans" title={item.strategyTag}>
                        {item.strategyTag}
                      </p>
                    </div>

                    {/* Compact Minimalist Key Metrics: Entry, LTP, P&L, Target with Timestamps */}
                    <div className="grid grid-cols-4 gap-1.5 w-full">
                      {/* Entry */}
                      <div className={`p-1.5 rounded-lg border flex flex-col ${
                        item.isEntryTriggered
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/80'
                      }`}>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                          {isBeginner ? 'Perfect Buy' : isExpert ? 'Trigger' : 'Perfect Entry'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.entryRange || `₹${item.entryPrice.toFixed(2)}`}
                        </span>
                        <span className={`text-[8px] font-mono truncate mt-0.5 font-bold ${
                          item.isEntryTriggered ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'
                        }`}>
                          {item.isEntryTriggered 
                            ? `🟢 In: ${item.entryPriceTimeFormatted || item.entryTimeFormatted || 'Live'}` 
                            : `⏳ Trigger @ ₹${item.entryPrice.toFixed(2)}`}
                        </span>
                      </div>

                      {/* LTP */}
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 flex flex-col">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                          {isBeginner ? 'Price' : isExpert ? 'LTP' : 'LTP'}
                        </span>
                        <span className={`text-xs font-mono font-black truncate ${
                          item.isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          ₹{item.currentLtp.toFixed(1)}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          Live Tick
                        </span>
                      </div>

                      {/* P&L / Lot */}
                      <div className={`p-1.5 rounded-lg border flex flex-col ${
                        item.isProfitable 
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60' 
                          : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60'
                      }`}>
                        <span className={`text-[9px] font-mono uppercase font-bold ${
                          item.isProfitable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {isBeginner ? 'Profit' : isExpert ? 'Alpha' : 'P&L/Lot'}
                        </span>
                        <span className={`text-xs font-mono font-black truncate ${
                          item.isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {item.pnlRupees >= 0 ? '+' : ''}₹{item.pnlRupees.toLocaleString('en-IN')}
                        </span>
                        <span className={`text-[8px] font-mono font-bold truncate mt-0.5 ${
                          item.isProfitable ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {item.pnlPoints >= 0 ? `+${item.pnlPoints}p` : `${item.pnlPoints}p`}
                        </span>
                      </div>

                      {/* Target */}
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 flex flex-col">
                        <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 uppercase">
                          {isBeginner ? 'Goal 1' : isExpert ? '1.2σ' : 'Target'}
                        </span>
                        <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 truncate">
                          ₹{item.target1Price.toFixed(1)}
                        </span>
                        <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400 truncate mt-0.5 font-bold">
                          ⏱️ {item.target1HitTimeFormatted ? `Hit: ${item.target1HitTimeFormatted}` : 'Pending'}
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
                        <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-accent-gold group-hover:text-amber-500">
                          <span>Details ↗</span>
                          <ExternalLink className="w-3 h-3" />
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
                          <span>{isBeginner ? 'Guide' : isExpert ? 'Greeks' : 'Blueprint'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

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
                <th className="py-2.5 px-3 w-[140px]">
                  <div className="flex flex-col">
                    <span>Entry Zone</span>
                    <span className="text-[9px] font-normal text-slate-500 dark:text-slate-500 lowercase">Live LTP</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 w-[130px]">
                  <div className="flex flex-col">
                    <span>P&L / Lot</span>
                    <span className="text-[9px] font-normal text-slate-500 dark:text-slate-500 lowercase">Points / %</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 w-[150px]">
                  <div className="flex flex-col">
                    <span>Targets (T1 / T2)</span>
                    <span className="text-[9px] font-normal text-slate-500 dark:text-slate-500 lowercase">Profit %</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 w-[130px]">
                  <div className="flex flex-col">
                    <span>Stop Loss</span>
                    <span className="text-[9px] font-normal text-slate-500 dark:text-slate-500 lowercase">Capital Risk %</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 w-[110px]">Confluence</th>
                <th className="py-2.5 px-3 w-[95px]">R : R / POP</th>
                <th className="py-2.5 px-3 w-[85px]">Status</th>
                <th className="py-2.5 px-3 text-right pr-4 w-[150px]">Actions</th>
              </tr>
            </thead>

          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/70 text-xs font-sans">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 px-4 text-center text-slate-500 dark:text-slate-400 font-mono">
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
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-black uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/35 flex items-center gap-1 shrink-0" title={`Asset: ${item.assetName || item.assetSymbol || selectedIndex}`}>
                              <span>{item.assetName || item.assetSymbol || selectedIndex}</span>
                            </span>
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-accent-gold transition-colors">
                              {item.strikePrice ? `${item.strikePrice.toLocaleString('en-IN')} ${item.optionType}` : item.contractSymbol}
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
                            {item.expiryDate && !isCommodity && (
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border uppercase ${
                                item.isExpiryDay
                                  ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                              }`}>
                                {item.isExpiryDay ? '⚡ 0DTE' : item.expiryDate}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5" title={item.strategyTag}>
                            {item.strategyTag}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Given: {item.callGivenTimeFormatted || item.entryTimeFormatted}</span>
                            </span>
                            {item.isEntryTriggered ? (
                              <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                                🟢 Entered: {item.entryPriceTimeFormatted || item.entryTimeFormatted} @ ₹{(item.actualEntryPrice || item.entryPrice).toFixed(1)}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-0.5">
                                ⏳ Waiting for Entry Zone
                              </span>
                            )}
                            {item.target1HitTimeFormatted && (
                              <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                                🏆 T1 Hit: {item.target1HitTimeFormatted}
                              </span>
                            )}
                            {item.target2HitTimeFormatted && (
                              <span className="px-1.5 py-0.2 rounded font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-0.5">
                                🚀 T2 Hit: {item.target2HitTimeFormatted}
                              </span>
                            )}
                            {item.stoplossTimeFormatted && (
                              <span className="px-1.5 py-0.2 rounded font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-0.5">
                                🛑 SL Hit: {item.stoplossTimeFormatted}
                              </span>
                            )}
                            {item.bookedTimeFormatted && !item.target1HitTimeFormatted && !item.stoplossTimeFormatted && (
                              <span className={`px-1.5 py-0.2 rounded font-bold border flex items-center gap-0.5 ${
                                item.status === 'SL_HIT'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              }`}>
                                {item.status === 'SL_HIT' ? 'Loss Booked:' : 'Profit Booked:'} {item.bookedTimeFormatted}
                              </span>
                            )}
                            {(item.isCarriedForward || item.carryForwardTimeFormatted) && (
                              <span className="px-1.5 py-0.2 rounded font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                BTST Window: {item.carryForwardTimeFormatted || '03:20 PM'}
                              </span>
                            )}
                            {item.carryForwardSuggestion && (
                              <span className="text-purple-600 dark:text-purple-400 font-medium truncate max-w-[200px]" title={item.carryForwardSuggestion}>
                                🌙 {item.carryForwardSuggestion}
                              </span>
                            )}
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
                          <div className={`px-2 py-0.5 rounded border inline-flex items-center gap-1 w-fit ${
                            item.isEntryTriggered
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60'
                              : 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60'
                          }`}>
                            <span className={`text-xs font-mono font-bold ${
                              item.isEntryTriggered ? 'text-emerald-800 dark:text-emerald-300' : 'text-sky-800 dark:text-sky-300'
                            }`}>
                              {item.entryRange}
                            </span>
                          </div>
                          <span className={`text-[9px] font-mono font-bold mt-0.5 ${
                            item.isEntryTriggered ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'
                          }`}>
                            {item.isEntryTriggered 
                              ? `🟢 In: ${item.entryPriceTimeFormatted || item.entryTimeFormatted} @ ₹${(item.actualEntryPrice || item.entryPrice).toFixed(1)}` 
                              : `⏳ Trigger @ ₹${item.entryPrice.toFixed(2)}`}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
                            <span className="text-slate-500 dark:text-slate-400">LTP:</span>
                            <span className="font-black text-slate-900 dark:text-white">
                              ₹{item.currentLtp.toFixed(1)}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                        </div>
                      </td>

                      {/* 4. P&L / LOT (RUPEES & PERCENTAGE) */}
                      <td className="py-3 px-3 font-mono">
                        <div className="flex flex-col">
                          <span className={`text-xs font-black ${
                            item.isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {item.pnlRupees >= 0 ? '+' : ''}₹{item.pnlRupees.toLocaleString('en-IN')}
                          </span>
                          <span className={`text-[10px] font-bold ${
                            item.isProfitable ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {item.pnlPoints >= 0 ? `+${item.pnlPoints} pts` : `${item.pnlPoints} pts`} ({item.pnlPct >= 0 ? '+' : ''}{item.pnlPct}%)
                          </span>
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
                              <span className="text-[8.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                ⏱️ {item.target1HitTimeFormatted ? `Hit: ${item.target1HitTimeFormatted}` : 'Pending'}
                              </span>

                              {item.target2Price && (
                                <>
                                  <div className="flex items-center gap-1.5 pt-0.5">
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
                                  <span className="text-[8.5px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                                    ⏱️ {item.target2HitTimeFormatted ? `Hit: ${item.target2HitTimeFormatted}` : 'Pending'}
                                  </span>
                                </>
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
                            <div className="flex flex-col space-y-0.5">
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
                              <span className="text-[8.5px] font-mono font-bold text-rose-600 dark:text-rose-400">
                                ⏱️ {item.stoplossTimeFormatted ? `Hit: ${item.stoplossTimeFormatted}` : 'Active'}
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
                        {item.status === 'EXPIRED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/80 flex items-center gap-1 w-fit">
                            <span>🛑 EXPIRED</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>{item.status}</span>
                          </span>
                        )}
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

      {/* Emergent Details Modal Box Popup (renders as modal dialog with backdrop overlay, never inline) */}
      {renderEmergentDetailsPanel()}
    </section>
  );
});
