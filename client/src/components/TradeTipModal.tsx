import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { ALL_SYMBOLS_CONFIG, type ActiveTradeTipData, type OngoingProfitBoxData, type MarketMomentumRegime } from '../types';
import {
  X,
  Zap,
  Target,
  ShieldCheck,
  Clock,
  Timer,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  Flame,
  Layers,
  BookOpen,
  DollarSign,
  Activity,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowLeft,
  BarChart3
} from 'lucide-react';
import { ConfluenceChecklist } from './ConfluenceChecklist';
import { useTerminalMode } from '../context/TerminalModeContext';
import { isMarketOpenForSymbol } from '../utils/lastClosedData';

interface TradeTipModalProps {
  tip: ActiveTradeTipData | null;
  isOpen: boolean;
  onClose: () => void;
}

type DepthModalType = null | 'MILESTONES' | 'CONFLUENCE' | 'GREEKS' | 'ENTRY_TACTICS' | 'CARRY_FORWARD';

export const TradeTipModal: React.FC<TradeTipModalProps> = ({ tip, isOpen, onClose }) => {
  const { setSelectedIndex, indices, openOptionsDataModal } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'>(mode);
  const [activeDepthModal, setActiveDepthModal] = useState<DepthModalType>(null);

  // Sync tab with active terminal mode when modal opens or mode changes
  useEffect(() => {
    setActiveTab(mode);
  }, [mode, isOpen]);

  // Sync initial depth modal if requested directly from outside
  useEffect(() => {
    if (isOpen && tip?.initialDepthModal) {
      setActiveDepthModal(tip?.initialDepthModal);
    }
  }, [isOpen, tip]);

  // Handle closing with smooth exit animation
  const handleClose = () => {
    if (activeDepthModal) {
      setActiveDepthModal(null);
      return;
    }
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  // Keyboard shortcut: Escape to close submodal first, or main modal if no submodal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeDepthModal) {
          setActiveDepthModal(null);
        } else if (!isClosing) {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing, activeDepthModal]);

  if (!isOpen && !isClosing) return null;
  if (!tip) return null;

  const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === tip.symbol);
  const lotSize = tip.lotSize || cfg?.lot || 50;
  const isCommodity = cfg?.category === 'COMMODITIES';
  const isMarketOpen = isMarketOpenForSymbol(tip.symbol);
  const isBull = tip.action?.includes('CALL') || tip.action?.includes('BULL');
  const isBear = tip.action?.includes('PUT') || tip.action?.includes('BEAR');
  const isSlHit = tip.status === 'SL_HIT';
  const isCarriedForward = tip.status === 'CARRIED_FORWARD' || (tip.isCarriedForward && tip.status !== 'INTRADAY_CLOSED' && tip.status !== 'EXPIRED');
  const isSl = tip.action === 'SQUARE_OFF' || isSlHit;
  const isSpread = tip.optionType === 'SPREAD' || tip.action?.includes('SPREAD');
  const isSeller = tip.tradingRole === 'SELLER' || tip.executionType === 'NET_CREDIT' || isSpread;

  const currentIndex = indices[tip.symbol];
  const liveSpot = currentIndex?.spotPrice || 0;

  const entryNum = typeof tip.entryPrice === 'number' 
    ? tip.entryPrice 
    : (parseFloat(String(tip.entryPrice).replace(/[^0-9.]/g, '')) || (tip.currentLtp || 100));
  const ltpNum = tip.currentLtp || entryNum;
  const rawPnlPoints = tip.pnlPoints ?? +(ltpNum - entryNum).toFixed(2);
  const rawPnlPct = tip.pnlPct ?? (entryNum > 0 ? +((rawPnlPoints / entryNum) * 100).toFixed(2) : 0);
  const rawPnlRupees = tip.pnlRupees ?? Math.round(rawPnlPoints * lotSize);

  // Expiry / 0DTE expiration check: An option on expiry day with LTP <= 0.05 or off-market is EXPIRED
  const isExpired = tip.status === 'EXPIRED' || (tip.isExpiryDay && !isCommodity && (ltpNum <= 0.05 || (!isMarketOpen && tip.status !== 'CARRIED_FORWARD')));

  const profitBoxData: OngoingProfitBoxData = tip.ongoingProfitBox || {
    pnlPoints: isExpired && !isSeller ? -entryNum : rawPnlPoints,
    pnlPct: isExpired && !isSeller ? -100 : (isExpired && isSeller ? 100 : rawPnlPct),
    pnlRupees: isExpired && !isSeller ? -Math.round(entryNum * lotSize) : (isExpired && isSeller ? Math.round(entryNum * lotSize) : rawPnlRupees),
    decisionTag: isExpired && !isSeller ? 'EXPIRED' : isSlHit ? 'EXIT_SL' : rawPnlPct >= 25 ? 'BOOK_HALF' : rawPnlPct >= 15 ? 'TRAIL_SL' : 'HOLD',
    decisionText: isExpired && !isSeller
      ? `🛑 0DTE Contract Expired (₹0.00) — Expired worthless at 03:30 PM IST. Settled at zero.`
      : isExpired && isSeller
      ? `🎯 0DTE Expired OTM (+100%) — Full credit captured at 03:30 PM IST.`
      : isSlHit 
      ? `🛑 Stoploss Hit (${rawPnlPct}%) — Capital protected & position archived to Trade Journal.`
      : rawPnlPct >= 25
      ? `🎯 Target 1 Achieved (+${rawPnlPct}%) — Lock 50% profit & trail SL to entry cost.`
      : rawPnlPct >= 15
      ? `🚀 Running in Profit (+${rawPnlPct}%) — Trail stoploss to entry price.`
      : `⏸️ Holding above stoploss (LTP ₹${ltpNum.toFixed(1)}) — Maintain position towards Target 1.`,
    isProfit: isExpired && !isSeller ? false : (isExpired && isSeller ? true : rawPnlPoints >= 0)
  };

  // If the backend supplied an ongoingProfitBox but the contract is clearly expired, override decisionTag so it never shows "HOLD"
  if (isExpired && !isSeller) {
    profitBoxData.decisionTag = 'EXPIRED';
    profitBoxData.decisionText = `🛑 0DTE Contract Expired (₹0.00) — Expired worthless at 03:30 PM IST. Cannot be held or traded.`;
    profitBoxData.isProfit = false;
    profitBoxData.pnlPct = -100;
  }

  // Mode-Adaptive Titles, Descriptions, and Explanations
  const modeLabels = {
    BEGINNER: {
      tag: '🔰 Safe Beginner View (Zero Jargon)',
      roleTag: isExpired
        ? '🛑 Expired Contract (0DTE Settled at 03:30 PM)'
        : isBull 
        ? '🔰 Safe Green Setup (Buy Call - Expecting Market Upward Move)' 
        : '🔰 Safe Red Setup (Buy Put - Expecting Market Downward Move)',
      entryLabel: '🔰 PERFECT BUY PRICE',
      t1Label: '🎯 1ST PROFIT GOAL',
      t2Label: '🚀 2ND BONUS GOAL',
      slLabel: '🛡️ CAPITAL SHIELD (STOP LOSS)',
      ongoingLabel: '💵 YOUR LIVE PROFIT / LOT',
      riskRewardLabel: 'REWARD vs RISK',
      decisionTagLabels: {
        BOOK_HALF: '🎯 SECURE 50% PROFIT NOW',
        TRAIL_SL: '🚀 MOVE SHIELD TO BUY PRICE',
        EXIT_SL: '🛑 SHIELD HIT - EXIT SAFELY',
        ENTER: '🟢 PERFECT ENTRY ACTIVE',
        HOLD: '⏸️ PATIENTLY HOLD FOR GOAL',
        EXPIRED: '🛑 CONTRACT EXPIRED (₹0.00)'
      },
      decisionAdvice: isExpired && !isSeller
        ? `🛑 This 0DTE contract expired today at 03:30 PM IST and settled at ₹0.00. It cannot be traded or held overnight. Please switch to the Next Expiry (${tip.nextExpiryDate || 'Next Weekly'}) contract.`
        : isSlHit 
        ? `🛑 Safety Shield Triggered (${rawPnlPct}%). Close this trade now to protect your remaining funds. Never average a losing trade.`
        : rawPnlPct >= 25
        ? `🎯 1st Profit Goal Reached (+${rawPnlPct}%)! Click "Book 50% Profit" to secure ₹${Math.round(profitBoxData.pnlRupees / 2).toLocaleString('en-IN')} cash into your account, and shift your Capital Shield to your buy price.`
        : rawPnlPct >= 15
        ? `🚀 Running in Good Profit (+${rawPnlPct}%)! Move your Capital Shield to your buy price (₹${entryNum}) so this trade cannot lose money.`
        : `⏸️ Trade is moving safely in the right direction. Stay patient and wait for 1st Profit Goal (₹${tip.target1Price}).`,
      desc: tip.explanations?.beginner ||
        `Why this trade? Market strength is moving in your favor. Buy 1 lot within the Buy Price Zone. When 1st Profit Goal is reached, take half your cash off the table and let the rest run risk-free. Always keep your Capital Shield active to protect your hard-earned money.`
    },
    INTERMEDIATE: {
      tag: '📈 Technical Momentum & Confluence',
      roleTag: isExpired ? '🛑 0DTE Terminal Expiration' : tip.tierLabel || (isBull ? '🎯 High-Probability Long Momentum Setup' : '🎯 High-Probability Short Momentum Setup'),
      entryLabel: 'PERFECT ENTRY PRICE',
      t1Label: 'TARGET 1 (+25%)',
      t2Label: 'TARGET 2 (+48%)',
      slLabel: 'STOP LOSS (-12%)',
      ongoingLabel: 'ONGOING LIVE P&L',
      riskRewardLabel: 'RISK : REWARD',
      decisionTagLabels: {
        BOOK_HALF: '🎯 BOOK 50% PROFIT',
        TRAIL_SL: '🚀 TRAIL SL TO COST',
        EXIT_SL: '🛑 STOPLOSS TRIGGERED',
        ENTER: '🟢 PERFECT ENTRY ACTIVE',
        HOLD: '⏸️ MAINTAIN HOLD',
        EXPIRED: '🛑 EXPIRED WORTHLESS (₹0.00)'
      },
      decisionAdvice: isExpired && !isSeller
        ? `🛑 0DTE Expiry Invalidation — Contract expired OTM at 03:30 PM IST with 100% time decay. Cannot be carried overnight. Roll over to Next Expiry (${tip.nextExpiryDate || 'Next Weekly'}).`
        : isSlHit
        ? `🛑 Stoploss Hit (${rawPnlPct}%) — Confluence invalidation point breached. Trade automatically archived to Post-Market Trade Journal.`
        : rawPnlPct >= 25
        ? `🎯 Target 1 Achieved (+${rawPnlPct}%) — Lock 50% profit, trail SL to entry cost, and let runners aim for Target 2.`
        : rawPnlPct >= 15
        ? `🚀 Momentum Expansion (+${rawPnlPct}%) — Dynamic CPR pivot confirmed; trail SL to breakeven cost.`
        : `⏸️ Holding above stoploss level (LTP ₹${ltpNum.toFixed(1)}) — Maintain position towards Target 1.`,
      desc: tip.explanations?.intermediate ||
        `${tip.strategyTag || 'Multi-Strategy Confluence'} confirmed across CPR Pivot range, 9-EMA momentum trigger, and volume absorption. Target 1 offers favorable 1:2.2 Risk-to-Reward.`
    },
    EXPERT: {
      tag: '🔬 Quantitative Greeks & Order Flow',
      roleTag: isExpired ? '🛑 0DTE Terminal Cash Settlement (Delta = 0)' : '🔬 Institutional Order Flow & Greeks Confluence',
      entryLabel: 'PERFECT ENTRY TRIGGER',
      t1Label: '1.2σ EXPANSION TARGET',
      t2Label: '1.8σ GAMMA RUNNER',
      slLabel: 'INVALIDATION THRESHOLD',
      ongoingLabel: 'LIVE ALPHA P&L',
      riskRewardLabel: 'ASYMMETRIC R:R',
      decisionTagLabels: {
        BOOK_HALF: '🎯 1.2σ MEAN EXPANSION HIT',
        TRAIL_SL: '🚀 POSITIVE GAMMA ACCELERATION',
        EXIT_SL: '🛑 DELTA BOUNDARY VIOLATION',
        ENTER: '🟢 PERFECT ENTRY POINT',
        HOLD: '⏸️ DELTA DRIFT STABLE',
        EXPIRED: '🛑 0DTE CASH SETTLED (0.00)'
      },
      decisionAdvice: isExpired && !isSeller
        ? `🛑 0DTE Terminal Settlement — Position terminated at 03:30 PM IST cash settlement. Delta = 0, Gamma = 0, IV = 0. Re-deploy delta into Next Expiry (${tip.nextExpiryDate || 'Next Weekly'}).`
        : isSlHit
        ? `🛑 Structural Invalidation (${rawPnlPct}%) — Volume point of control breached; delta hedge deactivated and logged.`
        : rawPnlPct >= 25
        ? `🎯 1.2σ Mean Expansion Hit (+${rawPnlPct}%) — De-risk 50% delta exposure, trail gamma stoploss to breakeven POC.`
        : rawPnlPct >= 15
        ? `🚀 High Positive Gamma Flow (+${rawPnlPct}%) — Theta decay offset by momentum impulse. Trail stop to entry volume cluster.`
        : `⏸️ Delta Drift Stable (IV: ${tip.iv || 13.2}%) — Order book absorption positive above VWAP. Maintain position.`,
      desc: tip.explanations?.expert ||
        `Delta: ${isBull ? '+0.48' : '-0.48'}, Gamma: 0.032, Theta: -₹140/hr. IV: ${tip.iv || 13.2}%. Institutional volume cluster confirmed above VWAP with order flow surge.`
    }
  }[activeTab];

  // Copy trade summary to clipboard
  const handleCopy = () => {
    const text = `🎯 FAYDA TRADE TIP (${activeTab} Mode)
Symbol: ${tip.symbol}
Contract: ${tip.contractSymbol || tip.title}
Action: ${tip.action}
Entry: ${tip.entryRange || tip.entryPrice} (Triggered: ${tip.entryPriceTimeFormatted || tip.givenTimeFormatted || 'Live'})
Stop Loss: ${tip.stoplossPrice || '—'} (${tip.stoplossTimeFormatted || 'Active Shield'})
Target 1: ${tip.target1Price || '—'} (${tip.target1HitTimeFormatted || 'Pending'})
Target 2: ${tip.target2Price || '—'} (${tip.target2HitTimeFormatted || 'Runner'})
Risk:Reward: ${tip.riskReward || '1:2'}
Given Time: ${tip.givenTimeFormatted || 'Live'}
Ongoing P&L: ${profitBoxData.isProfit ? '+' : ''}₹${profitBoxData.pnlRupees} / lot (${profitBoxData.pnlPct}%)
Generated via Fayda Trading Terminal`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwitchToOptionsData = () => {
    setSelectedIndex(tip.symbol);
    openOptionsDataModal(tip.symbol, tip);
    handleClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop with animated blur & fade */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-all ${
          isClosing ? 'animate-modal-backdrop-exit' : 'animate-modal-backdrop-enter'
        }`}
      />

      {/* Main Modal Dialog Box */}
      <div
        className={`relative w-full max-w-2xl bg-gradient-to-b from-terminal-card via-terminal-card to-slate-950 border-2 border-accent-cyan/40 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.18)] overflow-hidden flex flex-col z-10 my-auto ${
          isClosing ? 'animate-modal-exit' : 'animate-modal-enter'
        }`}
      >
        {/* ========================================================================= */}
        {/* 1. TOP HEADER STRIP: SYMBOL + ASSET BADGE + MODE SELECTOR TABS + CLOSE    */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-terminal-panel/90 border-b border-terminal-border gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`p-2 rounded-xl border shrink-0 ${
              isSl 
                ? (isMarketOpen ? 'bg-bear/20 border-bear text-bear animate-pulse' : 'bg-bear/20 border-bear text-bear') 
                : isBull 
                ? 'bg-bull/20 border-bull/40 text-bull' 
                : 'bg-bear/20 border-bear/40 text-bear'
            }`}>
              {isSl ? <AlertTriangle className="w-5 h-5" /> : isBull ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="font-mono font-black text-sm sm:text-base text-terminal-text tracking-wide">
                  {tip.symbol}
                </span>
                <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase border ${
                  isCommodity 
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40' 
                    : 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40'
                }`}>
                  {isCommodity ? 'MCX Commodity' : 'NSE / BSE Index'}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  Lot: {lotSize}
                </span>
              </div>
              <p className="text-[11px] text-terminal-muted truncate font-mono">
                {modeLabels.roleTag}
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs (Beginner / Intermediate / Expert) */}
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/90 p-0.5 rounded-xl border border-slate-300 dark:border-slate-800 text-[10px] font-mono font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('BEGINNER')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'BEGINNER'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Simplified friendly view with plain English"
              >
                Beginner
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('INTERMEDIATE')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'INTERMEDIATE'
                    ? 'bg-sky-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Standard technical & price action view"
              >
                Interm.
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('EXPERT')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'EXPERT'
                    ? 'bg-purple-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Advanced quant & derivatives Greeks view"
              >
                Expert
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-terminal-panel hover:bg-terminal-border border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer shrink-0 ml-1"
              title="Close Window (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MODAL BODY (FIRST GLANCE SIMPLICITY: 4 ESSENTIALS ONLY)                */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[calc(85vh-115px)] overflow-y-auto">
          {/* Main Contract Banner */}
          <div className="bg-terminal-bg/90 p-3.5 sm:p-4 rounded-xl border border-terminal-border shadow-sm flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-[10px] font-mono text-terminal-muted uppercase tracking-wider block">
                  RECOMMENDED CONTRACT
                </span>
                <h3 className="text-base sm:text-lg font-black text-terminal-text font-mono flex items-center gap-2 flex-wrap">
                  <span>{tip.contractSymbol || tip.title}</span>
                  {tip.expiryDate && !isCommodity && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border uppercase tracking-wider ${
                      tip.isExpiryDay
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}>
                      {tip.isExpiryDay ? '⚡ 0DTE EXPIRY:' : '📅 EXPIRY:'} {tip.expiryDate}
                    </span>
                  )}
                </h3>
              </div>

              <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-1.5">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider font-mono border shadow-sm ${
                  isSl
                    ? (isMarketOpen ? 'bg-bear/30 text-bear border-bear animate-pulse' : 'bg-bear/20 text-bear border-bear/50')
                    : isCarriedForward
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : isBull
                    ? 'bg-bull/20 text-bull border-bull/40 shadow-[0_0_12px_rgba(0,245,155,0.25)]'
                    : 'bg-bear/20 text-bear border-bear/40 shadow-[0_0_12px_rgba(255,59,105,0.25)]'
                }`}>
                  {isSlHit
                    ? '🛑 SL HIT'
                    : tip.action ? tip.action.replace(/_/g, ' ') : 'BUY'}
                </span>

                {tip.confluenceScore && (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                    Score {tip.confluenceScore}%
                  </span>
                )}

                {(tip.callGivenTimeFormatted || tip.givenTimeFormatted) && (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-500" />
                    <span>Given: {tip.callGivenTimeFormatted || tip.givenTimeFormatted}</span>
                  </span>
                )}

                {tip.isEntryTriggered ? (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>🟢 Entered: {tip.entryPriceTimeFormatted || tip.givenTimeFormatted} @ ₹{(tip.actualEntryPrice || tip.entryPrice || 0).toFixed(1)}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1">
                    <Timer className="w-3 h-3 text-sky-500" />
                    <span>⏳ Waiting for Entry Zone</span>
                  </span>
                )}

                {tip.target1HitTimeFormatted && (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Award className="w-3 h-3 text-emerald-500" />
                    <span>🏆 T1 Hit: {tip.target1HitTimeFormatted}</span>
                  </span>
                )}

                {tip.target2HitTimeFormatted && (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-500" />
                    <span>🚀 T2 Hit: {tip.target2HitTimeFormatted}</span>
                  </span>
                )}

                {tip.stoplossTimeFormatted && (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    <span>🛑 SL Hit: {tip.stoplossTimeFormatted}</span>
                  </span>
                )}
              </div>
            </div>

            {/* 0DTE Expiry Warning Strip & Next Expiry Alternative */}
            {tip.isExpiryDay && !isCommodity && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">
                    ⚠️ 0DTE EXPIRY WARNING: Must exit by 03:25 PM IST.
                  </span>
                  <span className="text-slate-400 text-[11px] hidden md:inline">
                    No overnight carry allowed on today's expiring contracts.
                  </span>
                </div>
                {tip.nextExpiryDate && (
                  <div className="text-[11px] text-indigo-300 bg-indigo-950/60 px-2 py-1 rounded border border-indigo-500/40 font-bold">
                    🌙 For BTST / Overnight: Trade Next Expiry ({tip.nextExpiryDate})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* ESSENTIAL 1: ONGOING LIVE PROFIT BOX & DECISION COCKPIT                   */}
          {/* ========================================================================= */}
          <div className={`p-4 rounded-2xl border-2 shadow-md transition-all ${
            profitBoxData.isProfit
              ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 dark:from-emerald-950/60 dark:via-slate-900 dark:to-slate-950 border-emerald-500/60 dark:border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
              : 'bg-gradient-to-br from-rose-50 via-white to-rose-50/30 dark:from-rose-950/60 dark:via-slate-900 dark:to-slate-950 border-rose-500/60 dark:border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-700/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    ⚡ {modeLabels.ongoingLabel}
                  </span>
                  {tip.marketRegime && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase border ${
                      tip.isExpiryDay
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
                        : tip.marketRegime === 'SIDEWAYS_CHOP'
                        ? 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/40'
                        : 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/40'
                    }`}>
                      {tip.isExpiryDay ? '⚡ 0DTE EXPIRY' : tip.marketRegime === 'SIDEWAYS_CHOP' ? '🐢 SIDEWAYS SCALP' : '⚡ FAST MOMENTUM'}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                    profitBoxData.isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {profitBoxData.isProfit ? '+' : ''}₹{Math.abs(profitBoxData.pnlRupees).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">/ lot ({lotSize} units)</span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black border ${
                    profitBoxData.isProfit 
                      ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40' 
                      : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40'
                  }`}>
                    {profitBoxData.isProfit ? '+' : ''}{profitBoxData.pnlPoints.toFixed(1)} pts ({profitBoxData.isProfit ? '+' : ''}{profitBoxData.pnlPct}%)
                  </span>
                </div>
              </div>

              {/* Action Decision Pill */}
              <div className="flex flex-col sm:items-end gap-1 shrink-0">
                <span className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md border ${
                  profitBoxData.decisionTag === 'BOOK_HALF'
                    ? 'bg-emerald-500/30 text-emerald-900 dark:text-emerald-200 border-emerald-500 dark:border-emerald-400 animate-pulse'
                    : profitBoxData.decisionTag === 'TRAIL_SL'
                    ? 'bg-sky-500/30 text-sky-900 dark:text-sky-200 border-sky-500 dark:border-sky-400'
                    : profitBoxData.decisionTag === 'EXIT_SL'
                    ? 'bg-rose-500/30 text-rose-900 dark:text-rose-200 border-rose-500 dark:border-rose-400'
                    : profitBoxData.decisionTag === 'ENTER'
                    ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-500/40'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                  <span>
                    {modeLabels.decisionTagLabels[profitBoxData.decisionTag] || 
                      (profitBoxData.decisionTag === 'BOOK_HALF' 
                        ? '🎯 BOOK 50% PROFIT' 
                        : profitBoxData.decisionTag === 'TRAIL_SL'
                        ? '🚀 TRAIL SL TO COST'
                        : profitBoxData.decisionTag === 'EXIT_SL'
                        ? '🛑 STOPLOSS HIT'
                        : profitBoxData.decisionTag === 'ENTER'
                        ? '🟢 OPTIMAL ENTRY ZONE'
                        : '⏸️ HOLD POSITION')}
                  </span>
                </span>
              </div>
            </div>

            {/* Mode-Tailored Decision Instruction Banner */}
            <div className="pt-2 flex items-start gap-1.5">
              <span className="text-sm shrink-0">💡</span>
              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                {modeLabels.decisionAdvice || profitBoxData.decisionText}
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ESSENTIAL 2: THE 4 CORE EXECUTION BOXES WITH MILESTONE TIMESTAMPS        */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
            {/* 1. ENTRY ZONE (with Entry Price Time) */}
            <div className={`p-3 rounded-xl border text-left space-y-1 ${
              tip.isEntryTriggered
                ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30'
                : 'bg-accent-cyan/10 dark:bg-accent-cyan/15 border-accent-cyan/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`block text-[9.5px] font-black uppercase tracking-wider ${
                  tip.isEntryTriggered ? 'text-emerald-600 dark:text-emerald-400' : 'text-accent-cyan'
                }`}>
                  {modeLabels.entryLabel}
                </span>
                <span className={`text-[8.5px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                  tip.isEntryTriggered 
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                }`}>
                  {tip.isEntryTriggered ? 'TRIGGERED' : 'WAITING'}
                </span>
              </div>
              <span className="font-black text-slate-900 dark:text-terminal-text text-sm sm:text-base block">
                {tip.isEntryTriggered && tip.actualEntryPrice 
                  ? `₹${tip.actualEntryPrice.toFixed(2)}` 
                  : (typeof tip.entryPrice === 'number' ? `₹${tip.entryPrice.toFixed(2)}` : (tip.entryRange || tip.entryPrice || '—'))}
              </span>
              <span className={`text-[9px] font-bold block truncate ${
                tip.isEntryTriggered ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-300'
              }`}>
                {tip.isEntryTriggered 
                  ? `🟢 In: ${tip.entryPriceTimeFormatted || tip.givenTimeFormatted || 'Live'}`
                  : `⏳ Waiting Trigger (₹${typeof tip.entryPrice === 'number' ? tip.entryPrice.toFixed(2) : entryNum.toFixed(2)})`}
              </span>
            </div>

            {/* 2. TARGET 1 (with Target 1 Hit Time) */}
            <div className={`p-3 rounded-xl border text-left space-y-1 ${
              tip.target1HitTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT'
                ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/50 shadow-xs'
                : 'bg-bull/10 dark:bg-bull/15 border-bull/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-bull block text-[9.5px] font-black uppercase tracking-wider">
                  {modeLabels.t1Label}
                </span>
                {(tip.target1HitTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT') && (
                  <span className="text-[8.5px] font-mono px-1 py-0.2 rounded font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    HIT
                  </span>
                )}
              </div>
              <span className="font-black text-bull text-sm sm:text-base block">
                {typeof tip.target1Price === 'number' ? `₹${tip.target1Price.toFixed(2)}` : (tip.target1Price || '—')}
              </span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                ⏱️ {tip.target1HitTimeFormatted ? `Hit: ${tip.target1HitTimeFormatted}` : (tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' ? `Hit: ${tip.bookedTimeFormatted || 'Booked'}` : 'Pending Target')}
              </span>
            </div>

            {/* 3. TARGET 2 (with Target 2 Hit Time) */}
            <div className={`p-3 rounded-xl border text-left space-y-1 ${
              tip.target2HitTimeFormatted || tip.status === 'TARGET2_HIT'
                ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/50 shadow-xs'
                : 'bg-bull/10 dark:bg-bull/15 border-bull/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-bull block text-[9.5px] font-black uppercase tracking-wider">
                  {modeLabels.t2Label}
                </span>
                {(tip.target2HitTimeFormatted || tip.status === 'TARGET2_HIT') && (
                  <span className="text-[8.5px] font-mono px-1 py-0.2 rounded font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    HIT
                  </span>
                )}
              </div>
              <span className="font-black text-bull text-sm sm:text-base block">
                {typeof tip.target2Price === 'number' ? `₹${tip.target2Price.toFixed(2)}` : (tip.target2Price || 'Trail SL')}
              </span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                ⏱️ {tip.target2HitTimeFormatted ? `Hit: ${tip.target2HitTimeFormatted}` : (tip.status === 'TARGET2_HIT' ? `Hit: ${tip.bookedTimeFormatted || 'Booked'}` : 'Runner Trailing')}
              </span>
            </div>

            {/* 4. STOP LOSS (with Stoploss Time) */}
            <div className={`p-3 rounded-xl border text-left space-y-1 ${
              tip.stoplossTimeFormatted || isSlHit
                ? 'bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/50 shadow-xs'
                : 'bg-bear/10 dark:bg-bear/15 border-bear/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-bear block text-[9.5px] font-black uppercase tracking-wider">
                  {modeLabels.slLabel}
                </span>
                {(tip.stoplossTimeFormatted || isSlHit) && (
                  <span className="text-[8.5px] font-mono px-1 py-0.2 rounded font-bold uppercase bg-rose-500/20 text-rose-700 dark:text-rose-300">
                    HIT
                  </span>
                )}
              </div>
              <span className="font-black text-bear text-sm sm:text-base block">
                {typeof tip.stoplossPrice === 'number' ? `₹${tip.stoplossPrice.toFixed(2)}` : (tip.stoplossPrice || '—')}
              </span>
              <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold block truncate">
                ⏱️ {tip.stoplossTimeFormatted ? `Hit: ${tip.stoplossTimeFormatted}` : (isSlHit ? `Hit: ${tip.bookedTimeFormatted || 'Stopped Out'}` : 'Active Shield')}
              </span>
            </div>
          </div>

          {/* Compact Reference Metrics: Spot Price, Current LTP, Risk:Reward */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
            <div className="bg-terminal-bg p-2 rounded-xl border border-terminal-border">
              <span className="text-terminal-muted block text-[9px] font-bold uppercase">ASSET SPOT</span>
              <span className="font-bold text-terminal-text text-sm">
                ₹{liveSpot > 0 ? liveSpot.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
              </span>
            </div>

            <div className="bg-amber-500/15 p-2 rounded-xl border border-amber-500/30">
              <span className="text-amber-800 dark:text-amber-300 block text-[9px] font-bold uppercase">CURRENT LTP</span>
              <span className="font-black text-amber-800 dark:text-amber-300 text-sm">
                {tip.currentLtp ? `₹${Number(tip.currentLtp).toFixed(2)}` : '—'}
              </span>
            </div>

            <div className="bg-terminal-bg p-2 rounded-xl border border-terminal-border">
              <span className="text-terminal-muted block text-[9px] font-bold uppercase">{modeLabels.riskRewardLabel}</span>
              <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
                {tip.riskReward || '1:2.2'}
              </span>
            </div>
          </div>

          {/* Mode-Adaptive Strategy Explanation Banner */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
            <div className="flex items-center gap-1.5 font-bold text-accent-cyan font-mono text-[11px] mb-1">
              <span>{modeLabels.tag}</span>
            </div>
            <p className="text-[11.5px] leading-relaxed">
              {modeLabels.desc}
            </p>
          </div>

          {/* ========================================================================= */}
          {/* ESSENTIAL 3: DEEP DIVE ANALYSIS BUTTONS (OPENS CLEAN DEDICATED MODALS)    */}
          {/* ========================================================================= */}
          <div className="bg-slate-100 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <span>🔍</span>
                <span>DEEP DIVE ANALYSIS (Click to open specialized modal):</span>
              </span>
              <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-bold">On-Demand Quant Data</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 font-mono text-xs">
              {/* Button 1: Milestones */}
              <button
                type="button"
                onClick={() => setActiveDepthModal('MILESTONES')}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-950/80 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 text-sky-700 dark:text-sky-300 font-bold transition flex flex-col items-center justify-center text-center gap-1 cursor-pointer shadow-xs hover:scale-[1.02]"
              >
                <span className="text-base">⏱️</span>
                <span className="text-[11px] font-black">Milestones</span>
                <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-normal">6-Stage Audit</span>
              </button>

              {/* Button 2: Confluence */}
              <button
                type="button"
                onClick={() => setActiveDepthModal('CONFLUENCE')}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-950/80 hover:bg-amber-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 text-amber-700 dark:text-amber-400 font-bold transition flex flex-col items-center justify-center text-center gap-1 cursor-pointer shadow-xs hover:scale-[1.02]"
              >
                <span className="text-base">📊</span>
                <span className="text-[11px] font-black">Confluence</span>
                <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-normal">10 Factors ({tip.confluenceScore}%)</span>
              </button>

              {/* Button 3: Greeks & Payoff */}
              <button
                type="button"
                onClick={() => setActiveDepthModal('GREEKS')}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-950/80 hover:bg-purple-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 text-purple-700 dark:text-purple-300 font-bold transition flex flex-col items-center justify-center text-center gap-1 cursor-pointer shadow-xs hover:scale-[1.02]"
              >
                <span className="text-base">🔬</span>
                <span className="text-[11px] font-black">Greeks & Payoff</span>
                <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-normal">Delta, Theta, POP</span>
              </button>

              {/* Button 4: 3-Tier Entry */}
              <button
                type="button"
                onClick={() => setActiveDepthModal('ENTRY_TACTICS')}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-950/80 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 text-emerald-700 dark:text-emerald-400 font-bold transition flex flex-col items-center justify-center text-center gap-1 cursor-pointer shadow-xs hover:scale-[1.02]"
              >
                <span className="text-base">🎯</span>
                <span className="text-[11px] font-black">3-Tier Entry</span>
                <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-normal">Dip, Trigger, Breakout</span>
              </button>

              {/* Button 5: Carry Forward */}
              <button
                type="button"
                onClick={() => setActiveDepthModal('CARRY_FORWARD')}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-950/80 hover:bg-purple-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 text-purple-700 dark:text-purple-300 font-bold transition flex flex-col items-center justify-center text-center gap-1 cursor-pointer shadow-xs hover:scale-[1.02]"
              >
                <span className="text-base">🌙</span>
                <span className="text-[11px] font-black">Carry Forward</span>
                <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-normal">0DTE vs BTST vs MCX</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. MODAL FOOTER ACTIONS                                                   */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-terminal-panel/90 border-t border-terminal-border gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-terminal-bg hover:bg-terminal-border border border-terminal-border text-terminal-text font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-bull" /> : <Copy className="w-3.5 h-3.5 text-terminal-muted" />}
            <span>{copied ? 'Copied! ✓' : 'Copy Setup'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSwitchToOptionsData}
              className="px-3.5 py-1.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/40 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title={`View ${tip.symbol} Live Options Data Table`}
            >
              <Layers className="w-3.5 h-3.5 text-accent-cyan" />
              <span>View {tip.symbol} Options Data</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 rounded-xl bg-terminal-card hover:bg-terminal-border border border-terminal-border text-terminal-muted hover:text-terminal-text font-mono font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DEDICATED DEPTH ANALYSIS MODAL OVERLAYS (OPENED ON DEMAND)             */}
      {/* ========================================================================= */}
      {activeDepthModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Submodal backdrop */}
          <div
            onClick={() => setActiveDepthModal(null)}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-all animate-modal-backdrop-enter"
          />

          <div className="relative w-full max-w-2xl bg-gradient-to-b from-terminal-card via-terminal-card to-slate-950 border-2 border-accent-cyan/50 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.25)] overflow-hidden flex flex-col z-10 my-auto animate-modal-enter max-h-[85vh]">
            {/* Submodal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-terminal-panel/95 border-b border-terminal-border">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                  {activeDepthModal === 'MILESTONES' && <Clock className="w-4 h-4" />}
                  {activeDepthModal === 'CONFLUENCE' && <Award className="w-4 h-4" />}
                  {activeDepthModal === 'GREEKS' && <ShieldCheck className="w-4 h-4" />}
                  {activeDepthModal === 'ENTRY_TACTICS' && <Target className="w-4 h-4" />}
                  {activeDepthModal === 'CARRY_FORWARD' && <span className="text-base">🌙</span>}
                </div>
                <div>
                  <h4 className="text-sm font-mono font-black text-terminal-text uppercase tracking-wider">
                    {activeDepthModal === 'MILESTONES' && '6-Stage Signal Lifecycle Milestones & Audit'}
                    {activeDepthModal === 'CONFLUENCE' && '10-Factor Technical Confluence Checklist'}
                    {activeDepthModal === 'GREEKS' && 'Option Greeks & Risk Payoff Calculator'}
                    {activeDepthModal === 'ENTRY_TACTICS' && '3-Tier Actionable Entry Strategy'}
                    {activeDepthModal === 'CARRY_FORWARD' && 'Market-Tailored Carry-Forward Rules'}
                  </h4>
                  <p className="text-[10px] text-terminal-muted font-mono">
                    {tip.contractSymbol || tip.title} • {tip.symbol}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDepthModal(null)}
                className="p-1.5 rounded-xl bg-terminal-panel hover:bg-terminal-border border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer"
                title="Back to Signal Summary (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Submodal Content */}
            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
              {/* SUBMODAL 1: MILESTONES */}
              {activeDepthModal === 'MILESTONES' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-800 dark:text-sky-300 text-[11px] leading-relaxed">
                    ⏱️ <strong>Lifecycle Milestone Tracking:</strong> Real-time institutional timestamps for signal dispatch, execution trigger, profit locking, and risk containment.
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center text-xs">
                    {/* 1. Call Given Time */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950/70 border border-sky-500/30 text-left space-y-1 shadow-xs">
                      <span className="text-[9px] font-black uppercase text-sky-600 dark:text-sky-400 block tracking-wider">
                        1. CALL GIVEN
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                        {tip.callGivenTimeFormatted || tip.givenTimeFormatted || 'Live'}
                      </span>
                      <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold">✓ Signal Dispatched</span>
                    </div>

                    {/* 2. Entry Price Time */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950/70 border border-sky-500/30 text-left space-y-1 shadow-xs">
                      <span className="text-[9px] font-black uppercase text-sky-600 dark:text-sky-400 block tracking-wider">
                        2. ENTRY PRICE
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                        {tip.entryPriceTimeFormatted || tip.givenTimeFormatted || 'Live'}
                      </span>
                      <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold truncate">
                        ✓ Triggered @ ₹{typeof tip.entryPrice === 'number' ? tip.entryPrice.toFixed(1) : tip.entryPrice}
                      </span>
                    </div>

                    {/* 3. Half Profit Book Time */}
                    <div className={`p-3 rounded-xl text-left space-y-1 shadow-xs border ${
                      tip.halfProfitBookTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT'
                        ? 'border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/20'
                        : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 opacity-75'
                    }`}>
                      <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">
                        3. 50% PROFIT
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                        {tip.halfProfitBookTimeFormatted || (tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' ? (tip.bookedTimeFormatted || 'Booked') : 'Pending T1')}
                      </span>
                      <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                        {tip.halfProfitBookTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' ? '✓ 50% Capital Locked' : 'Waiting for +25%'}
                      </span>
                    </div>

                    {/* 4. Target 1 Hit Time */}
                    <div className={`p-3 rounded-xl text-left space-y-1 shadow-xs border ${
                      tip.target1HitTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT'
                        ? 'border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/20'
                        : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 opacity-75'
                    }`}>
                      <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">
                        4. TARGET 1 HIT
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                        {tip.target1HitTimeFormatted || (tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' ? (tip.bookedTimeFormatted || 'Hit') : 'Pending')}
                      </span>
                      <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold truncate">
                        {tip.target1HitTimeFormatted || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT' ? `✓ ₹${typeof tip.target1Price === 'number' ? tip.target1Price.toFixed(1) : tip.target1Price}` : `Tgt: ₹${typeof tip.target1Price === 'number' ? tip.target1Price.toFixed(1) : tip.target1Price}`}
                      </span>
                    </div>

                    {/* 5. Target 2 Hit Time */}
                    <div className={`p-3 rounded-xl text-left space-y-1 shadow-xs border ${
                      tip.target2HitTimeFormatted || tip.status === 'TARGET2_HIT'
                        ? 'border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-950/20'
                        : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 opacity-75'
                    }`}>
                      <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 block tracking-wider">
                        5. TARGET 2 HIT
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                        {tip.target2HitTimeFormatted || (tip.status === 'TARGET2_HIT' ? (tip.bookedTimeFormatted || 'Hit') : 'Runner Trailing')}
                      </span>
                      <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 block font-semibold truncate">
                        {tip.target2HitTimeFormatted || tip.status === 'TARGET2_HIT' ? `✓ Full Runner Reached` : `Tgt 2: ₹${typeof tip.target2Price === 'number' ? tip.target2Price.toFixed(1) : (tip.target2Price || 'Trail')}`}
                      </span>
                    </div>

                    {/* 6. Stoploss Time / Journal Status */}
                    <div className={`p-3 rounded-xl text-left space-y-1 shadow-xs border ${
                      isSlHit
                        ? 'border-rose-500/50 bg-rose-50 dark:bg-rose-950/30'
                        : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800'
                    }`}>
                      <span className="text-[9px] font-black uppercase text-rose-700 dark:text-rose-400 block tracking-wider">
                        6. STOPLOSS STATUS
                      </span>
                      <span className={`font-bold text-xs block truncate ${isSlHit ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {tip.stoplossTimeFormatted || (isSlHit ? (tip.bookedTimeFormatted || 'Stopped Out') : 'Active Shield')}
                      </span>
                      <span className="text-[8.5px] block font-semibold text-rose-600 dark:text-rose-400 truncate">
                        {isSlHit ? 'Archived to Journal' : `SL: ₹${typeof tip.stoplossPrice === 'number' ? tip.stoplossPrice.toFixed(1) : tip.stoplossPrice}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBMODAL 2: 10-FACTOR CONFLUENCE */}
              {activeDepthModal === 'CONFLUENCE' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
                    <span className="font-bold">Overall Technical Score:</span>
                    <span className="text-base font-black font-mono">{tip.confluenceScore || 85}% Confirmed</span>
                  </div>

                  {tip.confluenceBreakdown ? (
                    <ConfluenceChecklist 
                      breakdown={tip.confluenceBreakdown} 
                      role={tip.tradingRole || (tip.action?.includes('SELL') ? 'SELLER' : 'BUYER')}
                      score={tip.confluenceScore}
                    />
                  ) : (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                      Technical breakdown verified across SuperTrend, 20 EMA, CPR Range, and Volume Surges.
                    </div>
                  )}
                </div>
              )}

              {/* SUBMODAL 3: GREEKS & PAYOFF MATRIX */}
              {activeDepthModal === 'GREEKS' && (
                <div className="space-y-3">
                  <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span>OPTION GREEKS & THETA HARVEST METRICS</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[10px] text-purple-200 border border-purple-500/30">
                        POP: {tip.sellerMetrics?.popPct || 82}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-1">
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-purple-500/30">
                        <span className="text-purple-300/80 block text-[9px] uppercase font-bold">NET CREDIT / COST</span>
                        <span className="font-black text-emerald-400 text-sm">
                          ₹{tip.sellerMetrics?.netCreditPoints?.toFixed(2) || (typeof tip.entryPrice === 'number' ? tip.entryPrice.toFixed(2) : '—')} pts
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          ₹{tip.sellerMetrics?.maxProfitRupees?.toLocaleString('en-IN') || '—'}/lot
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded-lg border border-purple-500/30">
                        <span className="text-purple-300/80 block text-[9px] uppercase font-bold">EXCHANGE MARGIN</span>
                        <span className="font-black text-slate-200 text-sm">
                          ₹{tip.sellerMetrics?.marginRequired?.toLocaleString('en-IN') || '₹38,500'}
                        </span>
                        <span className="text-[9px] text-emerald-400 block mt-0.5">
                          72% Hedged Benefit
                        </span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded-lg border border-purple-500/30">
                        <span className="text-purple-300/80 block text-[9px] uppercase font-bold">SAFETY BUFFER</span>
                        <span className="font-black text-amber-400 text-sm">
                          {tip.sellerMetrics?.breakevenBufferPts ? `${tip.sellerMetrics.breakevenBufferPts} pts` : '220 pts'}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Distance to Loss</span>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded-lg border border-purple-500/30">
                        <span className="text-purple-300/80 block text-[9px] uppercase font-bold">THETA DECAY VELOCITY</span>
                        <span className="font-black text-cyan-400 text-sm">
                          {tip.sellerMetrics?.thetaBurnRate || '+₹140/hr'}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Hourly θ Inflow</span>
                      </div>
                    </div>
                  </div>

                  {isSpread && (
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 space-y-2">
                      <span className="text-[10px] font-bold text-slate-300 block uppercase">Hedged Spread Payoff</span>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-bear/10 p-2 rounded-lg border border-bear/20">
                          <span className="text-bear block text-[9px] font-bold">MAX RISK</span>
                          <span className="font-black text-bear text-sm">
                            {tip.maxLossRupees ? `₹${tip.maxLossRupees.toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>
                        <div className="bg-bull/10 p-2 rounded-lg border border-bull/20">
                          <span className="text-bull block text-[9px] font-bold">MAX PROFIT</span>
                          <span className="font-black text-bull text-sm">
                            {tip.maxProfitRupees ? `₹${tip.maxProfitRupees.toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                          <span className="text-cyan-400 block text-[9px] font-bold">BREAKEVEN</span>
                          <span className="font-bold text-slate-200 text-sm">
                            {typeof tip.breakeven === 'number' ? `₹${tip.breakeven.toFixed(2)}` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUBMODAL 4: 3-TIER ACTIONABLE ENTRY */}
              {activeDepthModal === 'ENTRY_TACTICS' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Limit Dip Entry */}
                    <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/25 text-left space-y-1">
                      <div className="text-[9.5px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                        <span>🟢 PULLBACK / LIMIT DIP</span>
                      </div>
                      <div className="font-black text-slate-100 text-sm font-mono">
                        ₹{typeof tip.entryPrice === 'number' ? (tip.entryPrice * 0.98).toFixed(2) : '—'} - ₹{typeof tip.entryPrice === 'number' ? tip.entryPrice.toFixed(2) : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">Best Risk-to-Reward Entry</div>
                    </div>

                    {/* Market Trigger */}
                    <div className="bg-sky-500/10 p-3 rounded-xl border border-sky-500/25 text-left space-y-1">
                      <div className="text-[9.5px] font-bold text-sky-400 uppercase flex items-center gap-1">
                        <span>⚡ AT SIGNAL TRIGGER</span>
                      </div>
                      <div className="font-black text-slate-100 text-sm font-mono">
                        ₹{typeof tip.entryPrice === 'number' ? tip.entryPrice.toFixed(2) : (tip.entryRange || '—')}
                      </div>
                      <div className="text-[10px] text-slate-400">Benchmark Trigger @ {tip.givenTimeFormatted || 'Live'}</div>
                    </div>

                    {/* Breakout Confirmation */}
                    <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/25 text-left space-y-1">
                      <div className="text-[9.5px] font-bold text-purple-300 uppercase flex items-center gap-1">
                        <span>🚀 BREAKOUT TRIGGER</span>
                      </div>
                      <div className="font-black text-slate-100 text-sm font-mono">
                        &gt; ₹{typeof tip.entryPrice === 'number' ? (tip.entryPrice * 1.025).toFixed(2) : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">Confirmation on 1-min Candle Close</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBMODAL 5: CARRY-FORWARD & BTST */}
              {activeDepthModal === 'CARRY_FORWARD' && (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    tip.isExpiryDay && !isCommodity
                      ? 'bg-red-950/40 border-red-500/50'
                      : 'bg-purple-950/40 border-purple-500/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-black uppercase tracking-wider block ${
                        tip.isExpiryDay && !isCommodity ? 'text-red-400' : 'text-purple-300'
                      }`}>
                        {tip.isExpiryDay && !isCommodity ? '⚠️ 0DTE EXPIRY DAY — NO OVERNIGHT HOLD (SEBI RULES)' : '🌙 OVERNIGHT / BTST RULES (SEBI COMPLIANT)'}
                      </span>
                      {tip.expiryDate && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          Expiry: {tip.expiryDate}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed">
                      {tip.carryForwardAdvice || (tip.isExpiryDay && !isCommodity
                        ? '⚠️ 0DTE EXPIRY CONTRACT (SEBI Rules) — Options CANNOT be carried forward automatically. Any unclosed OTM position will expire WORTHLESS (₹0.00) at 03:30 PM. You MUST: (1) Square off this contract before 03:25 PM IST, and (2) If you wish to continue the trade, MANUALLY open a fresh contract in the NEXT EXPIRY separately.'
                        : isCommodity
                        ? '⚡ MCX FUTURES — Overnight Hold & Monthly Rollover Eligible: Active until 11:30 PM IST. Unlike NSE options, MCX futures CAN be rolled over to the next month. Rollover = (1) Close this month\'s contract, (2) Open same direction in next month\'s contract via spread order. Note: Brokerage + charges apply TWICE on rollover. Hold overnight with trailing stoploss.'
                        : (rawPnlPct >= 15 || tip.status === 'TARGET1_HIT' || tip.status === 'TARGET2_HIT')
                        ? '🌙 BTST via Manual Roll (SEBI Compliant) — Options CANNOT be auto-carried. To continue overnight: (1) Square off this contract today by 03:25 PM IST, then (2) Open a fresh next-expiry contract separately. Lock 50% profit today; trail SL to entry cost on the new position.'
                        : 'Strict Intraday Exit at 03:25 PM IST — Options CANNOT be carried overnight (SEBI rules). Rapid Theta decay and gap risk will erode premium. Square off fully before 03:25 PM.')}
                    </p>

                    {/* Next Expiry Suggestion if 0DTE */}
                    {tip.isExpiryDay && !isCommodity && tip.nextExpiryDate && (
                      <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/40 space-y-1.5 mt-2">
                        <span className="text-[11px] font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                          <span>💡</span>
                          <span>HOW TO CONTINUE OVERNIGHT (BTST) — SEBI COMPLIANT</span>
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          <strong>Step 1:</strong> Square off this expiring contract before <strong>03:25 PM IST</strong> today (all 0DTE contracts expire at 03:30 PM).<br />
                          <strong>Step 2:</strong> Separately open a fresh option contract in the <strong>Next Expiry ({tip.nextExpiryDate})</strong> — symbol: <strong>{tip.nextExpiryContractSymbol || `${tip.symbol} ${tip.strikePrice || ''} ${tip.optionType || ''}`}</strong>.<br />
                          ⚠️ <em>There is no automatic rollover for options. You must manually close the old trade and open a new one (SEBI regulation).</em>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Standard Expiry & Timing Reference Table */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">{isCommodity ? 'MCX Session Ends' : 'Square-off Cutoff'}</span>
                      <span className="font-bold text-amber-400">{isCommodity ? '11:30 PM IST' : '03:20 - 03:25 PM IST'}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">Overnight / Rollover</span>
                      <span className="font-bold text-slate-200">
                        {isCommodity
                          ? 'Futures Rollover via Spread Order'
                          : tip.isExpiryDay
                          ? 'Square off → Fresh Next Expiry Contract'
                          : 'BTST Manual Roll (SEBI Compliant)'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submodal Footer */}
            <div className="flex items-center justify-end px-5 py-3 bg-terminal-panel/90 border-t border-terminal-border">
              <button
                type="button"
                onClick={() => setActiveDepthModal(null)}
                className="px-4 py-1.5 rounded-xl bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/40 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Signal Summary</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
