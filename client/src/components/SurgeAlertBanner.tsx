import React, { useState, useMemo, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  Zap, 
  ChevronLeft, 
  X, 
  Clock, 
  Target, 
  ShieldAlert, 
  AlertOctagon, 
  TrendingUp, 
  TrendingDown, 
  Timer,
  ArrowRight,
  Flame,
  Activity,
  Layers,
  ArrowDownUp,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Sparkles,
  Pause,
  Play
} from 'lucide-react';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime } from '../utils/formatTime';
import type { SurgeEvent } from '../types';

type ScoreCategory = 'ALL' | 'TARGET_WINS' | '60_PLUS' | '50_60' | '40_50';
type OptionSideFilter = 'ALL' | 'CE' | 'PE';
type SortOrder = 'PROBABILITY' | 'CE_FIRST' | 'PE_FIRST';

export const SurgeAlertBanner: React.FC = () => {
  const { recentSurges, setSelectedIndex, indices } = useMarket();
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('oi_radar_surge_modal_open');
    return saved === 'true';
  });
  const [scoreCategory, setScoreCategory] = useState<ScoreCategory>('60_PLUS');
  const [assetFilter, setAssetFilter] = useState<string>('ALL');
  const [sideFilter, setSideFilter] = useState<OptionSideFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('PROBABILITY');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // 1-second live ticker (pauses when hovering to keep user focus stable)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isHovered) {
        setCurrentTime(Date.now());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isHovered]);

  const toggleModal = () => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('oi_radar_surge_modal_open', String(next));
      return next;
    });
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        localStorage.setItem('oi_radar_surge_modal_open', 'false');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Helper to check if a surge has achieved target
  const checkIsTargetHit = (surge: SurgeEvent): boolean => {
    const isCall = surge.optionType === 'CE';
    const contract = surge.suggestedContract;
    const idxState = indices[surge.indexSymbol];
    const strikeObj = idxState?.strikes?.find((s) => s.strikePrice === surge.strikePrice);
    const currentOptionLtp = isCall
      ? (strikeObj?.callLtp ?? surge.ltp)
      : (strikeObj?.putLtp ?? surge.ltp);

    const entryBase = typeof contract?.ltp === 'number' && contract.ltp > 0
      ? contract.ltp
      : (surge.ltp > 0 ? surge.ltp : currentOptionLtp);

    let targetPrice = parseFloat(String(contract?.target || '').replace(/[^0-9.]/g, ''));
    if (!targetPrice || targetPrice <= entryBase) {
      targetPrice = +(entryBase * 1.25).toFixed(2);
    }
    return targetPrice > 0 && currentOptionLtp >= targetPrice;
  };

  // Helper to get active trades matching score, asset, and side filters
  const getFilteredSurges = (
    category: ScoreCategory, 
    symbol: string = 'ALL', 
    side: OptionSideFilter = 'ALL',
    order: SortOrder = 'PROBABILITY'
  ) => {
    const map = new Map<string, SurgeEvent>();

    recentSurges.forEach((s: SurgeEvent) => {
      const score = s.surgeScore ?? 0;

      // 1. Score bracket / Target Win filter
      if (category === 'TARGET_WINS') {
        if (!checkIsTargetHit(s)) return;
      } else if (category === '60_PLUS' && score < 60) return;
      else if (category === '50_60' && (score < 50 || score >= 60)) return;
      else if (category === '40_50' && (score < 40 || score >= 50)) return;
      else if (category === 'ALL' && score < 40) return;

      // 2. Option Side filter (CE vs PE)
      if (side !== 'ALL' && s.optionType !== side) return;

      // 3. Asset filter
      if (symbol !== 'ALL') {
        const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === s.indexSymbol);
        if (symbol === 'COMMODITIES') {
          const isComm = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';
          if (!isComm) return;
        } else if (s.indexSymbol !== symbol) {
          return;
        }
      }

      // De-duplicate by contract key, locking the earliest initial trigger timestamp
      const contractKey = `${s.indexSymbol}_${s.strikePrice}_${s.optionType}`;
      if (!map.has(contractKey)) {
        map.set(contractKey, {
          ...s,
          givenTimestamp: s.givenTimestamp || s.timestamp
        });
      } else {
        const existing = map.get(contractKey)!;
        const earliestTime = new Date(existing.givenTimestamp || existing.timestamp).getTime() < new Date(s.givenTimestamp || s.timestamp).getTime()
          ? (existing.givenTimestamp || existing.timestamp)
          : (s.givenTimestamp || s.timestamp);

        map.set(contractKey, {
          ...s,
          givenTimestamp: earliestTime
        });
      }
    });

    const list = Array.from(map.values());

    // SORTING LOGIC: Target hits first, then probability / side
    return list.sort((a, b) => {
      const aHit = checkIsTargetHit(a);
      const bHit = checkIsTargetHit(b);
      if (aHit !== bHit) return aHit ? -1 : 1;

      if (order === 'CE_FIRST') {
        if (a.optionType !== b.optionType) {
          return a.optionType === 'CE' ? -1 : 1;
        }
      } else if (order === 'PE_FIRST') {
        if (a.optionType !== b.optionType) {
          return a.optionType === 'PE' ? -1 : 1;
        }
      }

      // High Probability / Score first within group:
      const scoreDiff = (b.surgeScore ?? 0) - (a.surgeScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  };

  const displayedSurges = useMemo(() => {
    return getFilteredSurges(scoreCategory, assetFilter, sideFilter, sortOrder);
  }, [recentSurges, scoreCategory, assetFilter, sideFilter, sortOrder, currentTime, indices]);

  // Counts for each score category tab
  const countTargetWins = useMemo(() => getFilteredSurges('TARGET_WINS', assetFilter, sideFilter).length, [recentSurges, assetFilter, sideFilter, currentTime, indices]);
  const count60Plus = useMemo(() => getFilteredSurges('60_PLUS', assetFilter, sideFilter).length, [recentSurges, assetFilter, sideFilter, currentTime, indices]);
  const count50To60 = useMemo(() => getFilteredSurges('50_60', assetFilter, sideFilter).length, [recentSurges, assetFilter, sideFilter, currentTime, indices]);
  const count40To50 = useMemo(() => getFilteredSurges('40_50', assetFilter, sideFilter).length, [recentSurges, assetFilter, sideFilter, currentTime, indices]);
  const countAll = useMemo(() => getFilteredSurges('ALL', assetFilter, sideFilter).length, [recentSurges, assetFilter, sideFilter, currentTime, indices]);

  // Counts for Calls vs Puts
  const countCalls = useMemo(() => getFilteredSurges(scoreCategory, assetFilter, 'CE').length, [recentSurges, scoreCategory, assetFilter, currentTime, indices]);
  const countPuts = useMemo(() => getFilteredSurges(scoreCategory, assetFilter, 'PE').length, [recentSurges, scoreCategory, assetFilter, currentTime, indices]);

  const getScoreBadge = (score: number) => {
    if (score >= 70) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-black text-xs bg-bear text-white shadow-[0_0_10px_rgba(255,59,105,0.7)] animate-pulse">
          <Flame className="w-3 h-3 mr-0.5" /> {score}/100
        </span>
      );
    }
    if (score >= 60) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-black text-xs bg-amber-600 text-white shadow-sm">
          <Zap className="w-3 h-3 mr-0.5" /> {score}/100
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-amber/20 text-amber-800 dark:text-amber border border-amber/40">
          <Activity className="w-3 h-3 mr-0.5" /> {score}/100
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-slate-100 dark:bg-terminal-panel text-terminal-muted border border-slate-200 dark:border-terminal-border">
        {score}/100
      </span>
    );
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. RIGHT SIDE TRIGGER BUTTON: Clean Floating Tab
         ───────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleModal}
          className="fixed right-0 top-[28%] sm:top-[30%] -translate-y-1/2 z-40 flex items-center justify-center p-2.5 sm:py-3.5 sm:px-2 rounded-l-2xl border-l-2 border-t-2 border-b-2 font-mono font-black text-[10px] sm:text-[11px] uppercase tracking-wider transition-all duration-200 shadow-[-4px_0_20px_rgba(255,59,105,0.45)] backdrop-blur-md bg-gradient-to-b from-terminal-panel via-terminal-card to-terminal-panel border-bear/80 text-terminal-text hover:text-bear hover:border-bear cursor-pointer group"
          title="Open Flash Surge Radar Modal"
        >
          {/* Mobile View (< sm): Compact Glowing Right-Edge Icon */}
          <div className="flex sm:hidden items-center justify-center relative p-0.5">
            <Zap className="w-5 h-5 text-bear drop-shadow-[0_0_10px_rgba(255,59,105,0.8)] animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-bear opacity-75 animate-ping" style={{ animationDuration: '2.5s' }} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-bear shadow-[0_0_6px_#FF3B69]" />
          </div>

          {/* Tablet & Desktop View (>= sm): Clean Vertical Tab */}
          <div className="hidden sm:flex flex-col items-center gap-1.5" style={{ writingMode: 'vertical-rl' }}>
            <div className="flex items-center justify-center gap-1 rotate-180 mb-1">
              <ChevronLeft className="w-3.5 h-3.5 text-bear animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-bear opacity-75 animate-ping" style={{ animationDuration: '2.5s' }} />
            </div>
            
            <div className="flex items-center gap-1 text-bear">
              <Zap className="w-3.5 h-3.5 rotate-90 text-bear" />
              <span>FLASH SURGE</span>
            </div>
          </div>
        </button>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. STANDALONE CENTERED MODALBOX (Theme Aware: Pure Light / Dark)
         ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={toggleModal}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
          />

          {/* Center Modalbox Container */}
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-slate-50 dark:bg-terminal-bg backdrop-blur-2xl border-2 border-slate-200 dark:border-terminal-border rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col font-mono relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Header Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-terminal-border bg-white dark:bg-terminal-panel/90 flex flex-col gap-2.5 relative shrink-0">
              {/* Ambient Glow */}
              <div className="absolute top-0 right-0 w-48 h-24 bg-bear/10 dark:bg-bear/15 rounded-full blur-3xl pointer-events-none" />

              {/* Top Title Line */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="w-1.5 h-5 rounded-full bg-bear shadow-[0_0_8px_#FF3B69] shrink-0" />
                  <div className="p-1.5 rounded-lg bg-bear/15 text-bear border border-bear/30 shadow-[0_0_10px_rgba(255,59,105,0.3)] shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(255,59,105,0.3)] flex items-center gap-2">
                      <span>FLASH SURGE RADAR</span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-bull border border-emerald-500/40 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span>SYSTEM WIN & TARGET TRACKER</span>
                      </span>
                    </h2>
                    <span className="text-[9px] sm:text-[10px] text-terminal-muted block">
                      Institutional Momentum Radar • Dynamic Greeks Horizon • Target 1 Hit Verification
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Live Hover Freeze Indicator */}
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border transition ${
                    isHovered 
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber border-amber-500/40' 
                      : 'bg-slate-100 dark:bg-terminal-bg text-terminal-muted border-slate-200 dark:border-terminal-border'
                  }`}>
                    {isHovered ? <Pause className="w-2.5 h-2.5 animate-pulse" /> : <Play className="w-2.5 h-2.5 text-bull" />}
                    <span>{isHovered ? 'STREAM PAUSED (HOVER)' : 'LIVE STREAM'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={toggleModal}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-terminal-panel border border-slate-200 dark:border-terminal-border hover:bg-slate-200 dark:hover:bg-terminal-card hover:border-terminal-muted text-terminal-muted hover:text-terminal-text transition cursor-pointer"
                    title="Close Modal (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1. SCORE & TARGET WIN CATEGORY TABS */}
              <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-terminal-bg border border-slate-200 dark:border-terminal-border/80 text-[10px] sm:text-xs">
                {/* 🏆 Target Wins Highlight Tab */}
                <button
                  onClick={() => setScoreCategory('TARGET_WINS')}
                  className={`py-1.5 px-1.5 rounded-lg font-black uppercase transition-all flex items-center justify-center gap-1 ${
                    scoreCategory === 'TARGET_WINS'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                      : 'text-emerald-700 dark:text-bull hover:bg-white dark:hover:bg-terminal-panel'
                  }`}
                  title="Filter by trades that have successfully achieved Target 1"
                >
                  <Trophy className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                  <span>WINS ({countTargetWins})</span>
                </button>

                <button
                  onClick={() => setScoreCategory('60_PLUS')}
                  className={`py-1.5 px-1.5 rounded-lg font-black uppercase transition-all flex items-center justify-center gap-1 ${
                    scoreCategory === '60_PLUS'
                      ? 'bg-bear text-white shadow-[0_0_12px_rgba(255,59,105,0.7)]'
                      : 'text-terminal-muted hover:text-terminal-text hover:bg-white dark:hover:bg-terminal-panel'
                  }`}
                >
                  <Flame className="w-3 h-3 text-white" />
                  <span>60-70+ ({count60Plus})</span>
                </button>

                <button
                  onClick={() => setScoreCategory('50_60')}
                  className={`py-1.5 px-1.5 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                    scoreCategory === '50_60'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-white dark:hover:bg-terminal-panel'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber" />
                  <span>50-60 ({count50To60})</span>
                </button>

                <button
                  onClick={() => setScoreCategory('40_50')}
                  className={`py-1.5 px-1.5 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                    scoreCategory === '40_50'
                      ? 'bg-white dark:bg-terminal-card text-accent-cyan border border-accent-cyan/50 shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text hover:bg-white dark:hover:bg-terminal-panel'
                  }`}
                >
                  <Activity className="w-3 h-3 text-accent-cyan" />
                  <span>40-50 ({count40To50})</span>
                </button>

                <button
                  onClick={() => setScoreCategory('ALL')}
                  className={`py-1.5 px-1.5 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                    scoreCategory === 'ALL'
                      ? 'bg-white dark:bg-terminal-card text-terminal-text border border-slate-200 dark:border-terminal-border shadow-sm'
                      : 'text-terminal-muted hover:text-terminal-text hover:bg-white dark:hover:bg-terminal-panel'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>ALL ({countAll})</span>
                </button>
              </div>

              {/* 2. CALL (CE) / PUT (PE) SORT & FILTER ROW */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                {/* Side Filter: ALL vs CALLS (CE) vs PUTS (PE) */}
                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-100/80 dark:bg-terminal-bg border border-slate-200 dark:border-terminal-border/80 text-[10px]">
                  <button
                    onClick={() => setSideFilter('ALL')}
                    className={`px-2 py-1 rounded font-bold uppercase transition ${
                      sideFilter === 'ALL'
                        ? 'bg-white dark:bg-terminal-panel text-terminal-text shadow-sm'
                        : 'text-terminal-muted hover:text-terminal-text'
                    }`}
                  >
                    All Sides
                  </button>
                  <button
                    onClick={() => setSideFilter('CE')}
                    className={`px-2 py-1 rounded font-bold uppercase transition flex items-center gap-1 ${
                      sideFilter === 'CE'
                        ? 'bg-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'text-emerald-700 dark:text-bull hover:bg-white dark:hover:bg-terminal-panel'
                    }`}
                  >
                    <span>🟢 Calls (CE)</span>
                    <span className="text-[9px] opacity-80">({countCalls})</span>
                  </button>
                  <button
                    onClick={() => setSideFilter('PE')}
                    className={`px-2 py-1 rounded font-bold uppercase transition flex items-center gap-1 ${
                      sideFilter === 'PE'
                        ? 'bg-rose-600 text-white shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                        : 'text-rose-600 dark:text-bear hover:bg-white dark:hover:bg-terminal-panel'
                    }`}
                  >
                    <span>🔴 Puts (PE)</span>
                    <span className="text-[9px] opacity-80">({countPuts})</span>
                  </button>
                </div>

                {/* Sorting Order Toggle (Score vs CE First vs PE First) */}
                <div className="flex items-center space-x-1 text-[10px]">
                  <span className="text-[9px] text-terminal-muted flex items-center gap-0.5">
                    <ArrowDownUp className="w-2.5 h-2.5" /> Sort:
                  </span>
                  <button
                    onClick={() => setSortOrder('PROBABILITY')}
                    className={`px-1.5 py-0.5 rounded font-bold uppercase transition ${
                      sortOrder === 'PROBABILITY'
                        ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                        : 'bg-white dark:bg-terminal-panel text-terminal-muted hover:text-terminal-text'
                    }`}
                    title="Sort by Target Wins and highest probability setup first"
                  >
                    Wins / Score
                  </button>
                  <button
                    onClick={() => setSortOrder('CE_FIRST')}
                    className={`px-1.5 py-0.5 rounded font-bold uppercase transition ${
                      sortOrder === 'CE_FIRST'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-bull border border-emerald-500/40'
                        : 'bg-white dark:bg-terminal-panel text-terminal-muted hover:text-terminal-text'
                    }`}
                    title="Sort Calls (CE) first, then Puts (PE)"
                  >
                    CE First
                  </button>
                  <button
                    onClick={() => setSortOrder('PE_FIRST')}
                    className={`px-1.5 py-0.5 rounded font-bold uppercase transition ${
                      sortOrder === 'PE_FIRST'
                        ? 'bg-rose-500/20 text-rose-600 dark:text-bear border border-rose-500/40'
                        : 'bg-white dark:bg-terminal-panel text-terminal-muted hover:text-terminal-text'
                    }`}
                    title="Sort Puts (PE) first, then Calls (CE)"
                  >
                    PE First
                  </button>
                </div>
              </div>

              {/* 3. Asset Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-thin pb-0.5">
                <span className="text-[9px] text-terminal-muted font-bold uppercase tracking-wider shrink-0 mr-1">
                  Asset:
                </span>
                {['ALL', 'NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX', 'COMMODITIES'].map((sym) => {
                  const active = assetFilter === sym;
                  return (
                    <button
                      key={sym}
                      onClick={() => setAssetFilter(sym)}
                      className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase transition shrink-0 ${
                        active
                          ? 'bg-white dark:bg-terminal-card text-accent-cyan border border-accent-cyan/50 shadow-sm'
                          : 'bg-slate-100/90 dark:bg-terminal-bg text-terminal-muted border border-slate-200 dark:border-terminal-border/60 hover:text-terminal-text'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                TABLE LIST VIEW: Real-time Trade Lifecycle & Target Hit Flash
               ───────────────────────────────────────────────────────────── */}
            <div 
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin bg-slate-100/60 dark:bg-terminal-bg"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {displayedSurges.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 font-mono">
                  <div className="p-3 rounded-2xl bg-white dark:bg-terminal-panel border border-slate-200 dark:border-terminal-border text-terminal-muted">
                    <AlertOctagon className="w-8 h-8 opacity-40 animate-pulse" />
                  </div>
                  <div className="text-xs font-bold text-terminal-muted uppercase tracking-wider">
                    {scoreCategory === 'TARGET_WINS' ? 'No Target Wins in this Category Yet' : 'No Active Setups in this Category'}
                  </div>
                  <p className="text-[11px] text-terminal-muted/70 max-w-xs leading-relaxed">
                    The institutional momentum engine is actively scanning. High-probability surge trades matching your criteria will appear here automatically.
                  </p>
                </div>
              ) : (
                displayedSurges.map((surge, idx) => {
                  const isCall = surge.optionType === 'CE';
                  const isBullAction = surge.tradeAction === 'BUY_CALL';
                  const contract = surge.suggestedContract;
                  const idxState = indices[surge.indexSymbol];

                  // Live LTP lookup
                  const strikeObj = idxState?.strikes?.find((s) => s.strikePrice === surge.strikePrice);
                  const currentOptionLtp = isCall
                    ? (strikeObj?.callLtp ?? surge.ltp)
                    : (strikeObj?.putLtp ?? surge.ltp);

                  // Extract parsed numerical levels with strict sanity checks
                  const entryBase = typeof contract?.ltp === 'number' && contract.ltp > 0
                    ? contract.ltp
                    : (surge.ltp > 0 ? surge.ltp : currentOptionLtp);

                  let targetPrice = parseFloat(String(contract?.target || '').replace(/[^0-9.]/g, ''));
                  let stoplossPrice = parseFloat(String(contract?.stoploss || '').replace(/[^0-9.]/g, ''));

                  if (!targetPrice || targetPrice <= entryBase) {
                    targetPrice = +(entryBase * 1.25).toFixed(2);
                  }
                  if (!stoplossPrice || stoplossPrice >= entryBase) {
                    stoplossPrice = +(entryBase * 0.90).toFixed(2);
                  }

                  // Live P&L and Trade Lifecycle State
                  const pnlPoints = +(currentOptionLtp - entryBase).toFixed(2);
                  const pnlPct = entryBase > 0 ? +((pnlPoints / entryBase) * 100).toFixed(1) : 0;
                  const isTargetHit = targetPrice > 0 && currentOptionLtp >= targetPrice;
                  const isStoplossHit = stoplossPrice > 0 && currentOptionLtp > 0 && currentOptionLtp <= stoplossPrice;
                  const isRunningInProfit = pnlPct >= 2.0 && !isTargetHit && !isStoplossHit;
                  const isInEntryZone = currentOptionLtp >= (entryBase * 0.96) && currentOptionLtp <= (entryBase * 1.04) && !isTargetHit && !isStoplossHit;
                  const isPullback = currentOptionLtp < (entryBase * 0.96) && !isStoplossHit;

                  // Timeline & Fixed Call Trigger Time
                  const callGivenTime = surge.givenTimestamp || surge.timestamp;
                  const ageSeconds = Math.floor((currentTime - new Date(callGivenTime).getTime()) / 1000);
                  const diffMin = Math.floor(ageSeconds / 60);
                  const relTimeStr = diffMin === 0 ? 'Just now' : `${diffMin}m ago`;
                  const formattedGivenTime = formatISTTime(callGivenTime, { showSeconds: false });

                  return (
                    <div
                      key={surge.id}
                      className={`rounded-2xl border-2 p-3.5 transition-all duration-200 relative overflow-hidden shadow-sm flex flex-col space-y-2.5 ${
                        isTargetHit
                          ? 'border-emerald-500 bg-white dark:bg-gradient-to-b dark:from-terminal-card dark:to-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40'
                          : isStoplossHit
                          ? 'border-rose-300 dark:border-rose-500/60 bg-white dark:bg-terminal-card'
                          : isRunningInProfit
                          ? 'border-emerald-400 dark:border-emerald-500/70 bg-white dark:bg-terminal-card shadow-sm'
                          : 'border-slate-200 dark:border-terminal-border hover:border-bear/60 bg-white dark:bg-terminal-card'
                      }`}
                    >
                      {/* 🌟 CELEBRATORY TARGET 1 HIT FLASH BANNER 🌟 */}
                      {isTargetHit && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 border-2 border-emerald-300 text-white flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.6)] animate-pulse">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-white/25 text-yellow-300 shadow-sm flex items-center justify-center shrink-0">
                              <Trophy className="w-4 h-4 text-yellow-300" />
                            </div>
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                <span>🎯 TARGET 1 HIT • SYSTEM LOGIC WIN!</span>
                                <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                              </span>
                              <span className="text-[10px] text-emerald-100 font-bold block">
                                Gain: +₹{pnlPoints} (+{pnlPct}%) • Target ₹{targetPrice.toFixed(2)} Hit
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-yellow-400 text-emerald-950 font-black text-[10px] uppercase shadow-sm shrink-0">
                            🏆 100% WIN
                          </span>
                        </div>
                      )}

                      {/* Top Progress / P&L Indicator */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-terminal-panel text-terminal-muted font-mono font-bold text-[9px] border border-slate-200 dark:border-terminal-border">
                            #{idx + 1}
                          </span>
                          {getScoreBadge(surge.surgeScore)}
                          
                          {/* CE / PE Explicit Badge */}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            isCall
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-bull border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-bear border border-rose-500/30'
                          }`}>
                            {isCall ? '🟢 CALL (CE)' : '🔴 PUT (PE)'}
                          </span>

                          {/* Trade Lifecycle Status Pill */}
                          {isTargetHit ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-2.5 h-2.5" /> TARGET 1 HIT (+{pnlPct}%)
                            </span>
                          ) : isStoplossHit ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> SL HIT ({pnlPct}%)
                            </span>
                          ) : isRunningInProfit ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-bull border border-emerald-500/40 flex items-center gap-1">
                              <TrendingUp className="w-2.5 h-2.5" /> RUNNING (+{pnlPct}%)
                            </span>
                          ) : isInEntryZone ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-800 dark:text-accent-cyan border border-cyan-500/40 flex items-center gap-1">
                              <Target className="w-2.5 h-2.5" /> IN DIP ENTRY ZONE
                            </span>
                          ) : isPullback ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-800 dark:text-amber border border-amber-500/40 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> PULLBACK ABOVE SL ({pnlPct}%)
                            </span>
                          ) : null}
                        </div>

                        {/* Fixed Signal Given Time */}
                        <div className="flex items-center space-x-1.5 text-[10px]">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-terminal-panel border border-slate-200 dark:border-terminal-border text-accent-cyan font-bold flex items-center gap-1.5 shadow-sm" title={`Original Signal Triggered at ${formattedGivenTime} IST`}>
                            <Clock className="w-3 h-3 text-accent-cyan shrink-0" />
                            <span>GIVEN AT: <strong className="text-terminal-text">{formattedGivenTime}</strong></span>
                            <span className="text-[9px] text-terminal-muted">({relTimeStr})</span>
                          </span>
                        </div>
                      </div>

                      {/* 2. Asset & Strike Name + Focus Button */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-black text-sm sm:text-base text-terminal-text tracking-wide flex items-center gap-1.5">
                            <span>{surge.indexSymbol}</span>
                            <span className={isCall ? 'text-emerald-700 dark:text-bull font-black' : 'text-rose-600 dark:text-bear font-black'}>
                              {surge.strikePrice} {surge.optionType}
                            </span>
                          </h3>
                          <span className="text-[10px] text-terminal-muted block mt-0.5 leading-tight">
                            {surge.actionDescription}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedIndex(surge.indexSymbol);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-terminal-panel hover:bg-slate-200 dark:hover:bg-terminal-bg border border-slate-200 dark:border-terminal-border text-accent-cyan text-[10px] font-bold flex items-center gap-1 transition shrink-0 shadow-sm cursor-pointer"
                          title="Focus on this asset chart and option chain"
                        >
                          <span>Focus</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* 3. Structured 4-Box High-Visibility Trade Matrix */}
                      <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                        {/* Live LTP & P&L */}
                        <div className={`p-2 rounded-xl border shadow-sm ${
                          isTargetHit || pnlPoints >= 0 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-bull' 
                            : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-bear'
                        }`}>
                          <span className="text-[8px] text-terminal-muted block font-bold uppercase tracking-wider">LIVE LTP</span>
                          <span className="font-black text-xs sm:text-sm block tabular-nums mt-0.5">
                            ₹{currentOptionLtp.toFixed(2)}
                          </span>
                          <span className="text-[8px] font-bold block opacity-90">
                            {pnlPoints >= 0 ? `+₹${pnlPoints} (+${pnlPct}%)` : `-₹${Math.abs(pnlPoints)} (${pnlPct}%)`}
                          </span>
                        </div>

                        {/* Entry Zone */}
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-terminal-panel border border-cyan-200 dark:border-cyan-500/30">
                          <span className="text-[8px] text-cyan-800 dark:text-accent-cyan block font-bold uppercase tracking-wider">ENTRY ZONE</span>
                          <span className="font-bold text-[10px] sm:text-xs text-terminal-text block truncate mt-0.5" title={`₹${(entryBase * 0.98).toFixed(2)} - ₹${(entryBase * 1.02).toFixed(2)}`}>
                            {`₹${(entryBase * 0.98).toFixed(2)} - ₹${(entryBase * 1.02).toFixed(2)}`}
                          </span>
                        </div>

                        {/* Stop Loss */}
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-terminal-panel border border-rose-200 dark:border-rose-500/30">
                          <span className="text-[8px] text-rose-700 dark:text-bear block font-bold uppercase tracking-wider flex items-center justify-center gap-0.5">
                            <ShieldAlert className="w-2.5 h-2.5" /> SL
                          </span>
                          <span className="font-bold text-[10px] sm:text-xs text-rose-700 dark:text-bear block mt-0.5">
                            ₹{stoplossPrice.toFixed(2)} (-10%)
                          </span>
                        </div>

                        {/* Target */}
                        <div className={`p-2 rounded-xl border ${
                          isTargetHit 
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500 text-emerald-700 dark:text-bull shadow-sm' 
                            : 'bg-slate-50 dark:bg-terminal-panel border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-bull'
                        }`}>
                          <span className="text-[8px] text-emerald-800 dark:text-bull block font-bold uppercase tracking-wider flex items-center justify-center gap-0.5">
                            <Target className="w-2.5 h-2.5" /> TARGET
                          </span>
                          <span className="font-black text-[10px] sm:text-xs block mt-0.5">
                            ₹{targetPrice.toFixed(2)} (+25%)
                          </span>
                        </div>
                      </div>

                      {/* 4. Dynamic Analytical Momentum Horizon Bar */}
                      <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-terminal-panel/90 border border-slate-200 dark:border-terminal-border/80 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                        <span className="flex items-center gap-1.5 text-accent-cyan font-bold">
                          <Timer className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                          <span>{surge.horizonDescription || '⏱️ Momentum Horizon: 15-20 min'}</span>
                        </span>
                        <span className="text-terminal-muted">
                          Flow Velocity: <strong className="text-emerald-700 dark:text-bull">{surge.oiChangePct > 0 ? `+${surge.oiChangePct}%` : `${surge.oiChangePct}%`} OI/min</strong>
                        </span>
                      </div>

                      {/* 5. Footer Flow Metrics */}
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-terminal-muted pt-1 border-t border-slate-200 dark:border-terminal-border/50">
                        <span>⚡ OI Surge: <strong className="text-terminal-text font-bold">{surge.oiChange1mFormatted}</strong></span>
                        <span>{surge.ivDescription || `IV ${surge.iv}%`}</span>
                        <span>{surge.suggestedContract?.liquidityNote || surge.liquidityRating}</span>
                        <span className="text-accent-cyan font-bold">Risk:Reward 1:2.5</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer Notice */}
            <div className="p-3 border-t border-slate-200 dark:border-terminal-border bg-white dark:bg-terminal-panel/80 rounded-b-3xl flex items-center justify-between text-[10px] text-terminal-muted shrink-0">
              <span className="flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                <span>Hover any entry to freeze live stream • Target 1 Hits Verified Live</span>
              </span>
              <span>Side: <strong className="text-bear">{sideFilter === 'ALL' ? 'All Sides' : sideFilter === 'CE' ? 'Calls (CE) Only' : 'Puts (PE) Only'}</strong></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SurgeAlertBanner;
