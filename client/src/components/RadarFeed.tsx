import React, { useState, useMemo, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import type { SurgeEvent, SurgeLevel, IndexSymbol, TradeAction } from '../types';
import { calculateTargetHorizon } from '../utils/tradeHorizon';
import { getSignalTimingData, getUserTradeAdvice, formatIstClock } from '../utils/signalTimeHelper';
import { PostMarketTradeJournal } from './PostMarketTradeJournal';
import { isContractOrSignalExpired } from '../utils/expiryHelper';
import { 
  Flame, 
  Filter, 
  Clock, 
  Moon, 
  Sparkles, 
  Zap,
  ChevronDown,
  RotateCcw,
  BookOpen,
  BarChart2,
  ExternalLink,
  Target,
  Timer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type TimeWindowFilter = 'ALL' | '5M' | '10M' | '15M' | '1H';

export const RadarFeed: React.FC = () => {
  const { recentSurges, visibleIndices, indices, setSelectedIndex, openTradeTipModal } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();

  const COMMODITY_SYMBOLS: IndexSymbol[] = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'];
  const isCommodity = (sym: string) => COMMODITY_SYMBOLS.includes(sym as IndexSymbol);

  // Official NSE Equity Derivatives Market Hours: 09:15 to 15:40 IST (Mon-Fri)
  const isMarketHours = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;

    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    return currentMin >= (9 * 60 + 15) && currentMin < (15 * 60 + 40);
  };

  // Check if specific symbol market is currently open
  const isSymbolMarketOpen = (sym: string) => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;

    const currentMin = ist.getHours() * 60 + ist.getMinutes();
    if (isCommodity(sym)) {
      // MCX Commodities: 09:00 to 23:30 IST
      return currentMin >= (9 * 60) && currentMin < (23 * 60 + 30);
    }
    // NSE / BSE Equity & Index Derivatives: 09:15 to 15:40 IST
    return currentMin >= (9 * 60 + 15) && currentMin < (15 * 60 + 40);
  };

  const isLiveMarketOpen = isMarketHours();

  // Local state
  const [isJournalModalOpen, setIsJournalModalOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<TimeWindowFilter>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | SurgeLevel>('ALL');
  const [indexFilter, setIndexFilter] = useState<'ALL' | IndexSymbol>('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | TradeAction>('ALL');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // 1-second live clock ticker for real-time elapsed calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate live count of surges per time window
  const countsByTime = useMemo(() => {
    const now = currentTime;
    let count5m = 0, count10m = 0, count15m = 0, count1h = 0;
    
    recentSurges.forEach((s) => {
      // Must belong to currently open market
      if (!isSymbolMarketOpen(s.indexSymbol)) return;
      if (!visibleIndices.includes(s.indexSymbol) && !(isCommodity(s.indexSymbol) && !isLiveMarketOpen)) return;
      if (isContractOrSignalExpired(s.expiryDate, s.timestamp, s.validUntilMinutes)) return;
      const diffMin = (now - new Date(s.timestamp).getTime()) / (60 * 1000);
      if (diffMin <= 5) count5m++;
      if (diffMin <= 10) count10m++;
      if (diffMin <= 15) count15m++;
      if (diffMin <= 60) count1h++;
    });

    return { count5m, count10m, count15m, count1h };
  }, [recentSurges, visibleIndices, currentTime, isLiveMarketOpen]);

  const formatIstTime = (timestamp?: string, defaultStr?: string) => {
    if (!timestamp) return defaultStr || '';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return defaultStr || '';
      return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    } catch {
      return defaultStr || '';
    }
  };

  const filteredSurges = useMemo(() => {
    const now = currentTime;
    return recentSurges.filter((s) => {
      // 1. STRICT: Only show surges for symbols whose market is OPEN right now!
      // When NSE/BSE is closed, NO NSE/BSE surges are allowed in the live radar!
      if (!isSymbolMarketOpen(s.indexSymbol)) return false;

      // Must belong to user's selected/visible indices OR active open commodities
      if (!visibleIndices.includes(s.indexSymbol)) {
        if (!isLiveMarketOpen && isCommodity(s.indexSymbol)) {
          // allow live commodities after equity close
        } else {
          return false;
        }
      }

      const idxState = indices[s.indexSymbol];
      const atm = idxState?.atmStrike;
      if (atm && Math.abs(s.strikePrice - atm) > 600) return false;

      // Auto-Expire Signal after contract expiry date
      if (isContractOrSignalExpired(s.expiryDate, s.timestamp, s.validUntilMinutes)) return false;

      const diffMin = Math.max(0, (now - new Date(s.timestamp).getTime()) / (60 * 1000));
      const maxValMin = s.validUntilMinutes || (s.surgeLevel === 'EXTREME' ? 20 : s.surgeLevel === 'STRONG' ? 45 : 60);

      // In live market, expired signals (> validity window) are removed from active feed and shifted to Journal
      if (diffMin > maxValMin) return false;

      // Time Window Filter
      if (timeFilter !== 'ALL') {
        if (timeFilter === '5M' && diffMin > 5) return false;
        if (timeFilter === '10M' && diffMin > 10) return false;
        if (timeFilter === '15M' && diffMin > 15) return false;
        if (timeFilter === '1H' && diffMin > 60) return false;
      }

      if (levelFilter !== 'ALL' && s.surgeLevel !== levelFilter) return false;
      if (indexFilter !== 'ALL' && s.indexSymbol !== indexFilter) return false;
      if (actionFilter !== 'ALL' && s.tradeAction !== actionFilter) return false;
      return true;
    });
  }, [recentSurges, visibleIndices, indices, timeFilter, levelFilter, indexFilter, actionFilter, currentTime, isLiveMarketOpen]);

  const getSurgeLevelBadge = (level: SurgeLevel) => {
    switch (level) {
      case 'EXTREME':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bear text-white shadow-[0_0_12px_rgba(255,59,105,0.6)] animate-pulse">
            🚨 EXTREME SURGE
          </span>
        );
      case 'STRONG':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber/20 text-amber border border-amber/40">
            🔥 STRONG SURGE
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-terminal-panel text-terminal-muted border border-terminal-border">
            🟡 MODERATE
          </span>
        );
      default:
        return null;
    }
  };

  const getBuildupBadge = (buildup: SurgeEvent['buildup']) => {
    switch (buildup) {
      case 'LONG_BUILDUP':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bull-subtle text-bull border border-bull/30">LONG BUILDUP</span>;
      case 'SHORT_BUILDUP':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bear-subtle text-bear border border-bear/30">SHORT BUILDUP</span>;
      case 'SHORT_COVERING':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30">SHORT COVERING</span>;
      case 'LONG_UNWINDING':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-subtle text-amber border border-amber/30">LONG UNWINDING</span>;
    }
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl flex flex-col overflow-hidden shadow-xl transition-all duration-300">
      {/* Feed Header with Running Live Market Clock */}
      <div className="p-3 sm:p-3.5 bg-terminal-panel/80 border-b border-terminal-border">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-6 rounded-full bg-bear shadow-[0_0_10px_#FF3B69] shrink-0" />
            <div className="p-2 rounded-xl bg-bear/15 text-bear border border-bear/30 shadow-[0_0_12px_rgba(255,59,105,0.25)] shrink-0">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(255,59,105,0.3)]">
                  {isBeginner 
                    ? '🟢 Live Big Player Inflow Radar' 
                    : isIntermediate 
                    ? '⚡ LIVE OI ACTIVITY RADAR & SIGNALS' 
                    : '🔬 REAL-TIME ORDER FLOW SURGE RADAR'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-bear/15 text-bear font-black border border-bear/40 shadow-sm">
                  {filteredSurges.length} Active
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted font-mono mt-0.5">
                {isBeginner 
                  ? 'Instant alerts when massive orders and institutional money enter the market' 
                  : isIntermediate 
                  ? 'Real-time 1-Minute Open Interest Delta Surge & Absorption Scanner' 
                  : 'High-frequency order flow absorption, delta rate of change & institutional surge detector'}
              </p>
            </div>
          </div>

          {/* Action Suite: Live Clock + Trade Journal Modal Button & Collapse */}
          <div className="flex items-center space-x-2 font-mono text-xs w-full sm:w-auto sm:ml-auto">
            {/* Live Running Market Clock */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-terminal-bg border border-terminal-border text-[11px] text-accent-cyan shadow-sm">
              <Clock className="w-3.5 h-3.5 text-accent-cyan animate-pulse" />
              <span className="text-terminal-muted text-[10px] hidden xs:inline">LIVE:</span>
              <strong className="text-terminal-text">{formatIstClock(currentTime, true)}</strong>
            </div>

            {/* Direct Open Modal Action Button */}
            <button
              type="button"
              onClick={() => setIsJournalModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 font-bold transition text-[11px] shadow-sm hover:scale-105"
              title="Click to Open Trade Journal & Date-Wise Predictions Report in a separate modal"
            >
              <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
              <span>{isBeginner ? 'Past Trade History' : 'Trade Journal'}</span>
              <ExternalLink className="w-3 h-3 text-purple-400 ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl bg-terminal-panel hover:bg-terminal-border/60 text-terminal-muted hover:text-terminal-text border border-terminal-border transition"
              title="Expand / Collapse"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Feed Suite & Scrollable Events */}
      {isExpanded && (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* TOP LINK & TITLE BANNER: Quick launcher for Trade Journal Modal */}
          <div className="p-3 bg-gradient-to-r from-purple-500/10 via-terminal-panel/60 to-accent-cyan/10 border-b border-terminal-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-black text-xs text-terminal-text">
                    {isBeginner ? '📒 Daily Past Trade History & Profit Results' : isIntermediate ? 'Predictions & Target Performance Journal' : 'Algorithmic Performance & Target Execution Audit Log'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                    AUDIT REPORT
                  </span>
                </div>
                <p className="text-[10px] text-terminal-muted font-mono truncate mt-0.5">
                  {isBeginner ? 'All past recommendations with verified entry, targets hit & profit/loss audit.' : 'Stored calls by time, entry, book profit/loss & near-target % across Options, Stocks & Commodities.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsJournalModalOpen(true)}
              className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-mono font-black text-xs flex items-center justify-center space-x-1.5 shrink-0 transition shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-105"
            >
              <span>View Date-Wise Report</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Internal Filter Toggle & Suite */}
          <div className="px-3.5 pt-2 pb-1 bg-terminal-panel/30 border-b border-terminal-border/60">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[10px] text-terminal-muted font-bold uppercase">Surge Filters</span>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                  isFiltersOpen
                    ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40'
                    : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border-terminal-border'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>{isFiltersOpen ? 'Hide Filters' : 'Show Filter Chips'}</span>
              </button>
            </div>

            {isFiltersOpen && (
              <div className="bg-terminal-panel/60 p-2.5 rounded-xl border border-terminal-border/80 mb-2 space-y-2 font-mono text-[11px] animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Row 1: TIME WINDOW / DURATION FILTER BAR */}
                <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-terminal-border/40">
                  <span className="text-accent-cyan font-bold flex items-center gap-1 mr-1 text-[10px]">
                    <Clock className="w-3 h-3 text-accent-cyan" /> TIME WINDOW:
                  </span>
              <button
                type="button"
                onClick={() => setTimeFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                  timeFilter === 'ALL'
                    ? 'bg-accent-cyan text-terminal-bg font-black shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                    : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                }`}
              >
                All Session ({recentSurges.length})
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('5M')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                  timeFilter === '5M'
                    ? 'bg-bear text-white font-black shadow-[0_0_10px_rgba(255,59,105,0.5)] animate-pulse'
                    : 'bg-terminal-bg text-terminal-muted hover:text-bear border border-terminal-border'
                }`}
              >
                ⚡ 5-Min Flash ({countsByTime.count5m})
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('10M')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                  timeFilter === '10M'
                    ? 'bg-amber text-terminal-bg font-black shadow-[0_0_10px_rgba(255,184,0,0.5)]'
                    : 'bg-terminal-bg text-terminal-muted hover:text-amber border border-terminal-border'
                }`}
              >
                ⏱️ 10-Min Scalp ({countsByTime.count10m})
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('15M')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                  timeFilter === '15M'
                    ? 'bg-bull text-terminal-bg font-black shadow-[0_0_10px_rgba(0,245,155,0.5)]'
                    : 'bg-terminal-bg text-terminal-muted hover:text-bull border border-terminal-border'
                }`}
              >
                📈 15-Min Momentum ({countsByTime.count15m})
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('1H')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                  timeFilter === '1H'
                    ? 'bg-accent-cyan/30 text-accent-cyan font-black border border-accent-cyan'
                    : 'bg-terminal-bg text-terminal-muted hover:text-accent-cyan border border-terminal-border'
                }`}
              >
                ⏳ 1-Hour Trend ({countsByTime.count1h})
              </button>
            </div>

            {/* Row 2: Severity, Index, and Action Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="text-terminal-muted font-bold flex items-center gap-1 mr-0.5">
                <Filter className="w-3 h-3" /> TYPE:
              </span>

              {/* Severity filter */}
              {(['ALL', 'EXTREME', 'STRONG', 'MODERATE'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2 py-0.5 rounded transition font-bold ${
                    levelFilter === lvl
                      ? 'bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/50 shadow-sm'
                      : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                  }`}
                >
                  {lvl === 'ALL' ? 'All Types' : lvl}
                </button>
              ))}

              <div className="h-3 w-[1px] bg-terminal-border mx-1" />

              {/* Index filter */}
              <button
                type="button"
                onClick={() => setIndexFilter('ALL')}
                className={`px-2 py-0.5 rounded transition font-bold ${
                  indexFilter === 'ALL'
                    ? 'bg-amber/25 text-amber border border-amber/50 shadow-sm'
                    : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                }`}
              >
                All Indices ({visibleIndices.length})
              </button>

              {visibleIndices.map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIndexFilter(idx)}
                  className={`px-2 py-0.5 rounded transition font-bold ${
                    indexFilter === idx
                      ? 'bg-amber/25 text-amber border border-amber/50 shadow-sm'
                      : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                  }`}
                >
                  {idx}
                </button>
              ))}

              <div className="h-3 w-[1px] bg-terminal-border mx-1" />

              {/* Action filter */}
              {(['ALL', 'BUY_CALL', 'BUY_PUT'] as const).map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setActionFilter(act)}
                  className={`px-2 py-0.5 rounded transition font-bold ${
                    actionFilter === act
                      ? act === 'BUY_CALL'
                        ? 'bg-bull/25 text-bull border border-bull/50 shadow-sm'
                        : act === 'BUY_PUT'
                        ? 'bg-bear/25 text-bear border border-bear/50 shadow-sm'
                        : 'bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/50 shadow-sm'
                      : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                  }`}
                >
                  {act === 'ALL' ? 'All Directions' : act === 'BUY_CALL' ? '🟢 Calls Only' : '🔴 Puts Only'}
                </button>
              ))}

              {/* Reset All Button */}
              {(timeFilter !== 'ALL' || levelFilter !== 'ALL' || indexFilter !== 'ALL' || actionFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setTimeFilter('ALL');
                    setLevelFilter('ALL');
                    setIndexFilter('ALL');
                    setActionFilter('ALL');
                  }}
                  className="px-2 py-0.5 rounded bg-bear/20 hover:bg-bear/30 text-bear border border-bear/40 font-bold ml-auto flex items-center gap-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Reset
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Stream List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[640px] divide-y-0">
        {filteredSurges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-terminal-muted text-center px-2 space-y-3">
            {!isLiveMarketOpen ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-terminal-card border border-purple-200 dark:border-purple-500/30 w-full max-w-sm flex flex-col items-center space-y-2.5 shadow-sm dark:shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-400 flex items-center justify-center">
                  <Moon className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1 text-center">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40">
                    NSE & BSE MARKET CLOSED
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-900 dark:text-terminal-text">Indian NSE and BSE Market Closed! Visit Next Trading Day!</p>
                  <p className="text-[10px] text-slate-600 dark:text-terminal-muted leading-relaxed font-sans">
                    Indian equity and index markets closed at 03:40 PM. Outdated tips are archived in the Journal to protect your capital.
                  </p>
                </div>

                {/* Quick Switch to Commodities */}
                <div className="pt-2 border-t border-terminal-border/60 w-full space-y-2">
                  <span className="text-[10px] font-mono font-bold text-accent-cyan uppercase block flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>Live MCX Commodities (Open till 11:30 PM)</span>
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {[
                      { sym: 'CRUDEOIL', name: 'Crude Oil' },
                      { sym: 'NATURALGAS', name: 'Natural Gas' },
                      { sym: 'GOLD', name: 'Gold' },
                      { sym: 'SILVER', name: 'Silver' }
                    ].map(c => (
                      <button
                        key={c.sym}
                        onClick={() => setSelectedIndex(c.sym as any)}
                        className="px-2.5 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-border border border-terminal-border text-[11px] font-mono font-bold text-terminal-text transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(true)}
                  className="mt-1 w-full py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Open Audit Report & Trade Journal</span>
                </button>
              </div>
            ) : (
              <>
                <Sparkles className="w-7 h-7 mb-2 opacity-30 animate-pulse text-accent-cyan" />
                <p className="font-mono text-xs font-bold text-terminal-text">No active surge events match current filter.</p>
                <p className="text-[11px] mt-1 text-terminal-muted/70">
                  Expired recommendations are automatically shifted to the Trade Journal ledger.
                </p>
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Open Predictions & Journal Report</span>
                </button>
              </>
            )}
          </div>
        ) : (
          filteredSurges.map((surge) => {
            const isCall = surge.optionType === 'CE';
            const currentIdx = indices[surge.indexSymbol];
            const atm = currentIdx?.atmStrike || surge.strikePrice;
            const strikeObj = currentIdx?.strikes?.find((s) => s.strikePrice === surge.strikePrice);
            const liveOptionLtp = strikeObj ? (isCall ? strikeObj.callLtp : strikeObj.putLtp) : surge.ltp;
            const currentOptionLtp = (liveOptionLtp && liveOptionLtp > 0) ? liveOptionLtp : surge.ltp;

            const entryBase = typeof surge.suggestedContract?.ltp === 'number' && surge.suggestedContract.ltp > 0
              ? surge.suggestedContract.ltp
              : surge.ltp;

            const targetPrice = parseFloat(String(surge.suggestedContract?.target || '').replace(/[^0-9.]/g, '')) || (entryBase * 1.35);
            const stoplossPrice = parseFloat(String(surge.suggestedContract?.stoploss || '').replace(/[^0-9.]/g, '')) || (entryBase * 0.82);

            const horizon = calculateTargetHorizon(
              surge.indexSymbol,
              surge.strikePrice,
              atm,
              surge.optionType,
              currentOptionLtp,
              targetPrice,
              surge.surgeScore
            );

            const isExtreme = surge.surgeLevel === 'EXTREME';
            const isStrong = surge.surgeLevel === 'STRONG';

            const cardBorder = isExtreme
              ? 'border-bear/60 shadow-[0_0_15px_rgba(255,59,105,0.2)] ring-1 ring-bear/40 bg-bear/5'
              : isStrong
              ? 'border-amber/40 bg-terminal-panel/60'
              : 'border-terminal-border bg-terminal-panel/30';

            const isCheap = surge.ivStatus === 'CHEAP';
            const isExpensive = surge.ivStatus === 'EXPENSIVE_CRUSH_RISK';

            // Timing & Actionability Calculation
            const maxValMin = surge.validUntilMinutes || (surge.surgeLevel === 'EXTREME' ? 20 : surge.surgeLevel === 'STRONG' ? 45 : 60);
            const timing = getSignalTimingData(
              surge.givenTimestamp || surge.timestamp,
              maxValMin,
              currentTime
            );

            const advice = getUserTradeAdvice({
              currentLtp: currentOptionLtp,
              entryPrice: entryBase,
              targetPrice,
              stoplossPrice,
              elapsedMinutes: timing.elapsedMinutes,
              maxValidityMinutes: timing.validUntilMinutes
            });

            const handleCardClick = () => {
              openTradeTipModal({
                id: surge.id,
                symbol: surge.indexSymbol,
                title: `${surge.indexSymbol} ${surge.strikePrice} ${surge.optionType}`,
                contractSymbol: surge.suggestedContract?.symbol || `${surge.indexSymbol} ${surge.strikePrice} ${surge.optionType}`,
                action: surge.tradeAction,
                optionType: surge.optionType,
                strikePrice: surge.strikePrice,
                tierLabel: '🔥 LIVE OI SURGE SIGNAL',
                confluenceScore: surge.surgeScore,
                entryPrice: entryBase,
                entryRange: surge.suggestedContract?.recommendedEntry || `₹${entryBase.toFixed(2)}`,
                currentLtp: currentOptionLtp,
                stoplossPrice: stoplossPrice,
                target1Price: targetPrice,
                riskReward: surge.suggestedContract?.riskReward || '1:2.0',
                givenTimeFormatted: timing.givenTimeFormatted,
                elapsedTimeFormatted: timing.elapsedFormatted,
                actionGuidance: advice.explanation,
                actionBadge: advice.badgeLabel,
                actionClass: advice.badgeClass,
                status: 'ACTIVE',
                buildup: surge.buildup,
                iv: surge.iv,
                ivStatus: surge.ivStatus,
                liquidityRating: surge.liquidityRating,
                spreadFormatted: surge.spreadFormatted,
                oiChange1mFormatted: surge.oiChange1mFormatted,
                oiChangePct: surge.oiChangePct,
                currentOIFormatted: surge.currentOIFormatted,
                volumeFormatted: surge.volumeFormatted,
                strategyTag: surge.actionTitle
              });
            };

            return (
              <div
                key={surge.id}
                onClick={handleCardClick}
                className={`rounded-xl p-3 border transition-all duration-200 hover:border-accent-cyan/50 hover:bg-terminal-card cursor-pointer hover:shadow-md ${cardBorder}`}
                title="Click to view full signal breakdown in interactive modal"
              >
                {/* 1. Top line of Card: Fixed Given Time, Live Elapsed Status, Strike & Buildup */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    {/* Fixed Tip Given Time Badge */}
                    <span 
                      className="font-mono text-[10px] text-terminal-text bg-terminal-bg px-2 py-0.5 rounded border border-terminal-border font-bold flex items-center gap-1 shadow-sm"
                      title={`Fixed Signal Trigger Time: ${timing.givenTimeFormatted} IST (Permanent)`}
                    >
                      <Clock className="w-2.5 h-2.5 text-accent-cyan" />
                      <span className="text-terminal-muted text-[9px] uppercase">GIVEN:</span>
                      <strong className="text-accent-cyan">{timing.givenTimeShort}</strong>
                    </span>

                    {/* Live Remaining Time Badge */}
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-terminal-panel border border-terminal-border text-amber font-bold">
                      ⏳ {timing.remainingMinutes}m left
                    </span>

                    <span className="font-mono font-bold text-xs text-terminal-text">
                      {surge.indexSymbol} <span className={isCall ? 'text-bear' : 'text-bull'}>{surge.strikePrice} {surge.optionType}</span>
                    </span>
                    {getBuildupBadge(surge.buildup)}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* EXPLICIT TRADE CATEGORY BADGE */}
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${horizon.categoryTagColor}`}>
                      {horizon.categoryBadge}
                    </span>
                    {getSurgeLevelBadge(surge.surgeLevel)}
                    <span className="font-mono text-xs font-bold text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded border border-accent-cyan/30">
                      Score {surge.surgeScore}
                    </span>
                  </div>
                </div>

                {/* 2. Real-Time Math Equation & Action Feasibility Bar */}
                <div className="bg-terminal-bg/85 p-2 rounded-lg border border-terminal-border/80 mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Timer className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                    <span className="text-terminal-muted font-bold text-[9px] uppercase shrink-0">TIMING:</span>
                    <span className="text-terminal-text truncate">
                      {timing.liveTimeFormatted} <span className="text-terminal-muted text-[9px]">(Live)</span> - {timing.givenTimeFormatted} <span className="text-terminal-muted text-[9px]">(Given)</span> = <strong className="text-accent-cyan font-bold">{timing.elapsedFormatted}</strong>
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded font-bold text-[9px] border shrink-0 ${timing.actionability.tagClass}`}>
                    {timing.actionability.badge}
                  </span>
                </div>

                {/* 3. Explicit User Action Guidance Callout (ENTER / HOLD / BOOK PROFIT / TRAIL SL / EXIT) */}
                <div className={`p-2 rounded-lg border mb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono ${
                  advice.actionType === 'BOOK_PROFIT'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : advice.actionType === 'EXIT_SL'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : advice.actionType === 'TRAIL_SL'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : advice.actionType === 'ENTER_NOW'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase shadow-sm shrink-0 ${advice.badgeClass}`}>
                      {advice.badgeLabel}
                    </span>
                    <span className="text-[10px] text-terminal-text font-sans truncate">{advice.explanation}</span>
                  </div>
                  {advice.shouldArchiveToJournal && (
                    <button
                      type="button"
                      onClick={() => setIsJournalModalOpen(true)}
                      className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-[10px] flex items-center gap-1 shrink-0 ml-auto"
                    >
                      <BookOpen className="w-3 h-3" /> Shift to Journal
                    </button>
                  )}
                </div>

                {/* Score Progress Bar */}
                <div className="w-full bg-terminal-bg rounded-full h-1.5 mb-2 overflow-hidden border border-terminal-border/40">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      surge.surgeScore >= 80
                        ? 'bg-gradient-to-r from-amber to-bear'
                        : surge.surgeScore >= 50
                        ? 'bg-gradient-to-r from-bull to-amber'
                        : 'bg-terminal-muted'
                    }`}
                    style={{ width: `${surge.surgeScore}%` }}
                  />
                </div>

                {/* IV & Liquidity Line */}
                <div className="flex items-center justify-between text-[10px] font-mono mb-2 px-1 text-terminal-muted">
                  <div className="flex items-center gap-1.5">
                    <span>IV:</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold border ${
                      isCheap
                        ? 'bg-bull/15 text-bull border-bull/30'
                        : isExpensive
                        ? 'bg-bear/15 text-bear border-bear/30'
                        : 'bg-terminal-panel text-terminal-text border-terminal-border'
                    }`}>
                      {surge.iv ? `${surge.iv}% (${isCheap ? 'CHEAP' : isExpensive ? 'CRUSH RISK' : 'FAIR'})` : '13.5%'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-accent-cyan font-bold">
                    <Zap className="w-3 h-3 text-accent-cyan" />
                    <span>HIGH LIQUIDITY</span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-terminal-bg/70 p-2 rounded-lg border border-terminal-border/60 font-mono text-[11px] mb-2.5">
                  <div>
                    <span className="text-terminal-muted block text-[9px]">1-MIN OI DELTA</span>
                    <span className={`font-bold ${surge.oiChange1m >= 0 ? (isCall ? 'text-bear' : 'text-bull') : 'text-amber'}`}>
                      {surge.oiChange1mFormatted} ({surge.oiChangePct > 0 ? '+' : ''}{Number(surge.oiChangePct).toFixed(2)}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-terminal-muted block text-[9px]">CURRENT OI</span>
                    <span className="font-semibold text-terminal-text">{surge.currentOIFormatted}</span>
                  </div>
                  <div>
                    <span className="text-terminal-muted block text-[9px]">PREMIUM (LTP)</span>
                    <span className="font-bold text-terminal-text">
                      ₹{currentOptionLtp.toFixed(2)}{' '}
                      <span className={`text-[10px] ${surge.ltpChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                        ({surge.ltpChange >= 0 ? '+' : ''}{Number(surge.ltpPctChange).toFixed(2)}%)
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-terminal-muted block text-[9px]">VOLUME</span>
                    <span className="font-semibold text-terminal-text">{(surge.volume / 1000).toFixed(2)}k</span>
                  </div>
                </div>

                {/* Actionable Signal Translation with Full Execution Matrix */}
                <div className="bg-terminal-panel/80 p-2.5 rounded-lg border border-terminal-border space-y-2 font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-terminal-border/50">
                    <div>
                      <span className={`text-xs font-bold uppercase ${
                        surge.tradeAction === 'BUY_CALL' ? 'text-bull' : 'text-bear'
                      }`}>
                        {surge.actionTitle}
                      </span>
                      <p className="text-[10px] text-terminal-muted mt-0.5">
                        {surge.actionDescription}
                      </p>
                    </div>

                    <div className="shrink-0 bg-terminal-bg px-2.5 py-1 rounded-lg border border-terminal-border text-right">
                      <span className="text-[9px] text-accent-cyan block uppercase font-bold">SUGGESTED STRIKE</span>
                      <span className="font-black text-terminal-text text-xs tracking-wide">
                        🎯 {surge.suggestedContract.symbol}
                      </span>
                    </div>
                  </div>

                  {/* Execution Matrix: Asset Spot, Option LTP, Entry Zone, Exit/SL, Target, R:R */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center text-[10px]">
                    <div className="bg-terminal-bg p-1.5 rounded-md border border-terminal-border">
                      <span className="text-accent-sky block text-[8px] font-bold uppercase">ASSET SPOT</span>
                      <span className="font-bold text-terminal-text block">
                        ₹{currentIdx && currentIdx.spotPrice > 0 ? currentIdx.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </span>
                    </div>
                    <div className="bg-accent-cyan/10 p-1.5 rounded-md border border-accent-cyan/30">
                      <span className="text-accent-cyan block text-[8px] font-bold uppercase">ENTRY PRICE</span>
                      <span className="font-bold text-terminal-text block">{surge.suggestedContract.recommendedEntry}</span>
                    </div>
                    <div className="bg-bear/15 p-1.5 rounded-md border border-bear/30">
                      <span className="text-bear block text-[8px] font-bold uppercase">STOP LOSS</span>
                      <span className="font-bold text-bear block">{surge.suggestedContract.stoploss}</span>
                    </div>
                    <div className="bg-bull/15 p-1.5 rounded-md border border-bull/30">
                      <span className="text-bull block text-[8px] font-bold uppercase">TARGET 1</span>
                      <span className="font-bold text-bull block">{surge.suggestedContract.target}</span>
                    </div>
                    <div className="bg-amber/15 p-1.5 rounded-md border border-amber/40 col-span-2 sm:col-span-1 shadow-sm">
                      <span className="text-amber block text-[8px] font-bold uppercase">CURRENT PREMIUM</span>
                      <span className="font-black text-amber block">₹{currentOptionLtp.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Analysis Breakdown: Expected Target Window & Horizon */}
                  <div className="flex items-center justify-between text-[9px] text-terminal-muted bg-terminal-bg/80 px-2 py-1 rounded border border-terminal-border/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-accent-cyan" />
                      <strong className="text-accent-cyan">{horizon.label}:</strong> {horizon.desc}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Market is Closed (EOD Settlement) Bottom Notice */}
        {!isLiveMarketOpen && (
          <div className="p-3 rounded-xl bg-amber/10 border border-amber/30 text-center font-mono mt-2 flex flex-col items-center">
            <div className="flex items-center justify-center gap-1.5 text-amber font-bold text-xs mb-1">
              <Moon className="w-3.5 h-3.5 animate-pulse" />
              <span>Market is Closed (EOD Settlement)</span>
            </div>
            <p className="text-[10px] text-terminal-muted max-w-sm mx-auto leading-relaxed mb-2.5">
              Live OI surge alerts are paused outside market hours. All trade calls, target hits, and near-target metrics are stored in the historical ledger.
            </p>
            <button
              type="button"
              onClick={() => setIsJournalModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-mono font-bold text-xs flex items-center space-x-1.5 transition shadow-md hover:scale-105"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Open Predictions & Calls Audit Report</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      </div>
      )}

      {/* Standalone Separate Modal Dialog */}
      {isJournalModalOpen && (
        <PostMarketTradeJournal isModal={true} onClose={() => setIsJournalModalOpen(false)} />
      )}
    </div>
  );
};
