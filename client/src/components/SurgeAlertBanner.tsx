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
  ArrowDownUp
} from 'lucide-react';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime } from '../utils/formatTime';
import type { SurgeEvent } from '../types';

type ScoreCategory = 'ALL' | '60_PLUS' | '50_60' | '40_50';
type OptionSideFilter = 'ALL' | 'CE' | 'PE';
type SortOrder = 'PROBABILITY' | 'CE_FIRST' | 'PE_FIRST';

export const SurgeAlertBanner: React.FC = () => {
  const { recentSurges, setSelectedIndex, indices } = useMarket();
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('oi_radar_surge_sidebar_open');
    return saved === 'true';
  });
  const [scoreCategory, setScoreCategory] = useState<ScoreCategory>('60_PLUS');
  const [assetFilter, setAssetFilter] = useState<string>('ALL');
  const [sideFilter, setSideFilter] = useState<OptionSideFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('PROBABILITY');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // 1-second live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSidebar = () => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('oi_radar_surge_sidebar_open', String(next));
      return next;
    });
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        localStorage.setItem('oi_radar_surge_sidebar_open', 'false');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Helper to get strictly unexpired surges matching score, asset, and side filters
  const getFilteredSurges = (
    category: ScoreCategory, 
    symbol: string = 'ALL', 
    side: OptionSideFilter = 'ALL',
    order: SortOrder = 'PROBABILITY'
  ) => {
    const now = currentTime;
    const map = new Map<string, SurgeEvent>();

    recentSurges.forEach((s: SurgeEvent) => {
      const score = s.surgeScore ?? 0;

      // 1. Score bracket filter
      if (category === '60_PLUS' && score < 60) return;
      if (category === '50_60' && (score < 50 || score >= 60)) return;
      if (category === '40_50' && (score < 40 || score >= 50)) return;
      if (category === 'ALL' && score < 40) return;

      // 2. Option Side filter (CE vs PE)
      if (side !== 'ALL' && s.optionType !== side) return;

      // 3. Timeline unexpired check (20m for Extreme, 45m for Strong, 60m for Moderate)
      const ageMs = now - new Date(s.timestamp).getTime();
      const maxAgeMs = (s.validUntilMinutes || (s.surgeLevel === 'EXTREME' ? 20 : s.surgeLevel === 'STRONG' ? 45 : 60)) * 60 * 1000;
      if (ageMs > maxAgeMs) return;

      // 4. Asset filter
      if (symbol !== 'ALL') {
        const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === s.indexSymbol);
        if (symbol === 'COMMODITIES') {
          const isComm = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';
          if (!isComm) return;
        } else if (s.indexSymbol !== symbol) {
          return;
        }
      }

      // De-duplicate by contract key (symbol + strike + optionType)
      const contractKey = `${s.indexSymbol}_${s.strikePrice}_${s.optionType}`;
      if (!map.has(contractKey) || new Date(s.timestamp).getTime() > new Date(map.get(contractKey)!.timestamp).getTime()) {
        map.set(contractKey, s);
      }
    });

    const list = Array.from(map.values());

    // SORTING LOGIC:
    return list.sort((a, b) => {
      // If user selected CE first or PE first grouping:
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
  }, [recentSurges, scoreCategory, assetFilter, sideFilter, sortOrder, currentTime]);

  // Counts for each score category tab
  const count60Plus = useMemo(() => getFilteredSurges('60_PLUS', assetFilter, sideFilter).length, [recentSurges, assetFilter, sideFilter, currentTime]);
  const count50To60 = useMemo(() => getFilteredSurges('50_60', assetFilter, sideFilter).length, [recentSurges, assetFilter, sideFilter, currentTime]);
  const count40To50 = useMemo(() => getFilteredSurges('40_50', assetFilter, sideFilter).length, [recentSurges, assetFilter, sideFilter, currentTime]);
  const countAll = useMemo(() => getFilteredSurges('ALL', assetFilter, sideFilter).length, [recentSurges, assetFilter, sideFilter, currentTime]);

  // Counts for Calls vs Puts
  const countCalls = useMemo(() => getFilteredSurges(scoreCategory, assetFilter, 'CE').length, [recentSurges, scoreCategory, assetFilter, currentTime]);
  const countPuts = useMemo(() => getFilteredSurges(scoreCategory, assetFilter, 'PE').length, [recentSurges, scoreCategory, assetFilter, currentTime]);

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
      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-terminal-panel text-terminal-muted border border-terminal-border">
        {score}/100
      </span>
    );
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. RIGHT SIDE DOCK BUTTON: Clean Tab matching Global Indices
         ───────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="fixed right-0 top-[28%] sm:top-[30%] -translate-y-1/2 z-40 flex items-center justify-center p-2.5 sm:py-3.5 sm:px-2 rounded-l-2xl border-l-2 border-t-2 border-b-2 font-mono font-black text-[10px] sm:text-[11px] uppercase tracking-wider transition-all duration-200 shadow-[-4px_0_20px_rgba(255,59,105,0.45)] backdrop-blur-md bg-gradient-to-b from-terminal-panel via-terminal-card to-terminal-panel border-bear/80 text-terminal-text hover:text-bear hover:border-bear cursor-pointer group"
          title="Open Flash Surge Radar"
        >
          {/* Mobile View (< sm): Compact Glowing Right-Edge Icon */}
          <div className="flex sm:hidden items-center justify-center relative p-0.5">
            <Zap className="w-5 h-5 text-bear drop-shadow-[0_0_10px_rgba(255,59,105,0.8)] animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-bear opacity-75 animate-ping" style={{ animationDuration: '2.5s' }} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-bear shadow-[0_0_6px_#FF3B69]" />
          </div>

          {/* Tablet & Desktop View (>= sm): Clean Vertical Tab matching Global Indices */}
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
          2. BACKDROP CLICK-TO-DISMISS OVERLAY
         ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. SLIDE-OUT MODAL DRAWER (High-Density Table List View)
         ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 right-0 sm:top-12 sm:bottom-8 w-full sm:w-[580px] md:w-[680px] lg:w-[760px] max-w-full bg-terminal-bg/98 backdrop-blur-2xl sm:border-l-2 sm:border-t sm:border-b sm:border-terminal-border z-50 shadow-[0_0_60px_rgba(0,0,0,0.85)] sm:rounded-l-3xl flex flex-col font-mono transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 opacity-100 visible pointer-events-auto' : 'translate-x-full opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-terminal-border bg-terminal-panel/90 sm:rounded-tl-3xl flex flex-col gap-2.5 relative shrink-0">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-40 h-24 bg-bear/15 rounded-full blur-2xl pointer-events-none" />

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
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-bear/20 text-bear border border-bear/40">
                    SORTED: HIGH PROBABILITY FIRST
                  </span>
                </h2>
                <span className="text-[9px] sm:text-[10px] text-terminal-muted block">
                  Calibrated Institutional Momentum & Dip Entry Setups
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-xl bg-terminal-panel border border-terminal-border hover:bg-terminal-card hover:border-terminal-muted text-terminal-muted hover:text-terminal-text transition"
              title="Close Drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. SCORE CATEGORY TABS (40-50, 50-60, 60-70+) */}
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-terminal-bg border border-terminal-border/80 text-[10px] sm:text-xs">
            <button
              onClick={() => setScoreCategory('60_PLUS')}
              className={`py-1.5 px-2 rounded-lg font-black uppercase transition-all flex items-center justify-center gap-1 ${
                scoreCategory === '60_PLUS'
                  ? 'bg-bear text-white shadow-[0_0_12px_rgba(255,59,105,0.7)]'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
              }`}
            >
              <Flame className="w-3 h-3 text-white" />
              <span>60-70+ ({count60Plus})</span>
            </button>

            <button
              onClick={() => setScoreCategory('50_60')}
              className={`py-1.5 px-2 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                scoreCategory === '50_60'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
              }`}
            >
              <Zap className="w-3 h-3 text-amber" />
              <span>50-60 ({count50To60})</span>
            </button>

            <button
              onClick={() => setScoreCategory('40_50')}
              className={`py-1.5 px-2 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                scoreCategory === '40_50'
                  ? 'bg-terminal-card text-accent-cyan border border-accent-cyan/50 shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
              }`}
            >
              <Activity className="w-3 h-3 text-accent-cyan" />
              <span>40-50 ({count40To50})</span>
            </button>

            <button
              onClick={() => setScoreCategory('ALL')}
              className={`py-1.5 px-2 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                scoreCategory === 'ALL'
                  ? 'bg-terminal-card text-terminal-text border border-terminal-border shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>ALL ({countAll})</span>
            </button>
          </div>

          {/* 2. CALL (CE) / PUT (PE) SORT & FILTER ROW */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {/* Side Filter: ALL vs CALLS (CE) vs PUTS (PE) */}
            <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-terminal-bg border border-terminal-border/80 text-[10px]">
              <button
                onClick={() => setSideFilter('ALL')}
                className={`px-2 py-1 rounded font-bold uppercase transition ${
                  sideFilter === 'ALL'
                    ? 'bg-terminal-panel text-terminal-text shadow-sm'
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
                    : 'text-emerald-700 dark:text-bull hover:bg-terminal-panel'
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
                    : 'text-rose-600 dark:text-bear hover:bg-terminal-panel'
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
                    : 'bg-terminal-panel text-terminal-muted hover:text-terminal-text'
                }`}
                title="Sort by highest probability setup first"
              >
                Score / Prob
              </button>
              <button
                onClick={() => setSortOrder('CE_FIRST')}
                className={`px-1.5 py-0.5 rounded font-bold uppercase transition ${
                  sortOrder === 'CE_FIRST'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-bull border border-emerald-500/40'
                    : 'bg-terminal-panel text-terminal-muted hover:text-terminal-text'
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
                    : 'bg-terminal-panel text-terminal-muted hover:text-terminal-text'
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
                      ? 'bg-terminal-card text-accent-cyan border border-accent-cyan/50 shadow-sm'
                      : 'bg-terminal-bg text-terminal-muted border border-terminal-border/60 hover:text-terminal-text'
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TABLE LIST VIEW: Sorted with Call/Put and Probabilities
           ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 scrollbar-thin">
          {displayedSurges.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 font-mono">
              <div className="p-3 rounded-2xl bg-terminal-panel border border-terminal-border text-terminal-muted">
                <AlertOctagon className="w-8 h-8 opacity-40 animate-pulse" />
              </div>
              <div className="text-xs font-bold text-terminal-muted uppercase tracking-wider">
                No Active Setups in this Category
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

              // Timeline calculations
              const maxWindowMinutes = surge.validUntilMinutes || (surge.surgeLevel === 'EXTREME' ? 20 : surge.surgeLevel === 'STRONG' ? 45 : 60);
              const ageSeconds = Math.floor((currentTime - new Date(surge.timestamp).getTime()) / 1000);
              const totalWindowSeconds = maxWindowMinutes * 60;
              const remainingSeconds = Math.max(0, totalWindowSeconds - ageSeconds);
              const mins = Math.floor(remainingSeconds / 60);
              const secs = remainingSeconds % 60;
              const formattedCountdown = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
              const progressPct = totalWindowSeconds > 0 ? Math.min(100, Math.max(0, (remainingSeconds / totalWindowSeconds) * 100)) : 0;
              const diffMin = Math.floor(ageSeconds / 60);
              const relTimeStr = diffMin === 0 ? 'Just now' : `${diffMin}m ago`;

              return (
                <div
                  key={surge.id}
                  className="rounded-xl border border-terminal-border hover:border-bear/60 bg-terminal-card/90 p-3 transition-all duration-150 relative overflow-hidden shadow-sm hover:shadow-[0_0_20px_rgba(255,59,105,0.2)] flex flex-col space-y-2"
                >
                  {/* Fading Timeline Progress Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-terminal-bg">
                    <div
                      className="h-full bg-gradient-to-r from-bear via-amber to-bull transition-all duration-1000 ease-linear"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* 1. Header Line: Rank Tag, Score Badge, Option Type Tag, Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-terminal-panel text-terminal-muted font-mono font-bold text-[9px] border border-terminal-border">
                        #{idx + 1}
                      </span>
                      {getScoreBadge(surge.surgeScore)}
                      
                      {/* CE / PE Explicit Badge */}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        isCall
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-bull border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-600 dark:text-bear border border-rose-500/40'
                      }`}>
                        {isCall ? '🟢 CALL (CE)' : '🔴 PUT (PE)'}
                      </span>

                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        isBullAction 
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-bull border border-emerald-500/30' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-bear border border-rose-500/30'
                      }`}>
                        {surge.actionTitle}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-terminal-panel border border-terminal-border text-accent-cyan font-bold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatISTTime(surge.timestamp, { showSeconds: false })}</span>
                        <span className="text-[9px] text-terminal-muted">({relTimeStr})</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-bear/15 border border-bear/40 text-rose-700 dark:text-bear font-bold text-[9px]">
                        ⏳ {formattedCountdown}
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
                      className="px-2.5 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-bg border border-terminal-border text-accent-cyan text-[10px] font-bold flex items-center gap-1 transition shrink-0 shadow-sm"
                      title="Focus on this asset chart and option chain"
                    >
                      <span>Focus</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 3. Structured 4-Box High-Visibility Trade Matrix */}
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                    {/* Live LTP */}
                    <div className="p-1.5 rounded-lg bg-amber/15 border border-amber/50 shadow-sm">
                      <span className="text-[8px] text-amber-800 dark:text-amber block font-bold uppercase">LIVE LTP</span>
                      <span className="font-black text-xs sm:text-sm text-amber-700 dark:text-amber block tabular-nums mt-0.5">
                        ₹{currentOptionLtp.toFixed(2)}
                      </span>
                    </div>

                    {/* Entry Zone */}
                    <div className="p-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/40">
                      <span className="text-[8px] text-cyan-800 dark:text-accent-cyan block font-bold uppercase">ENTRY ZONE</span>
                      <span className="font-bold text-[10px] sm:text-xs text-terminal-text block truncate mt-0.5" title={contract?.recommendedEntry}>
                        {contract?.recommendedEntry || '—'}
                      </span>
                    </div>

                    {/* Stop Loss */}
                    <div className="p-1.5 rounded-lg bg-bear/15 border border-bear/50">
                      <span className="text-[8px] text-rose-700 dark:text-bear block font-bold uppercase flex items-center justify-center gap-0.5">
                        <ShieldAlert className="w-2.5 h-2.5" /> SL
                      </span>
                      <span className="font-bold text-[10px] sm:text-xs text-rose-700 dark:text-bear block mt-0.5">
                        {contract?.stoploss || '—'}
                      </span>
                    </div>

                    {/* Target */}
                    <div className="p-1.5 rounded-lg bg-bull/15 border border-bull/50">
                      <span className="text-[8px] text-emerald-800 dark:text-bull block font-bold uppercase flex items-center justify-center gap-0.5">
                        <Target className="w-2.5 h-2.5" /> TARGET
                      </span>
                      <span className="font-bold text-[10px] sm:text-xs text-emerald-700 dark:text-bull block mt-0.5">
                        {contract?.target || '—'}
                      </span>
                    </div>
                  </div>

                  {/* 4. Footer Flow Metrics */}
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                    <span>⚡ OI Surge: <strong className="text-terminal-text font-bold">{surge.oiChange1mFormatted}</strong></span>
                    <span>{surge.ivDescription || `IV ${surge.iv}%`}</span>
                    <span>{surge.suggestedContract?.liquidityNote || surge.liquidityRating}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Notice */}
        <div className="p-3 border-t border-terminal-border bg-terminal-panel/80 sm:rounded-bl-3xl flex items-center justify-between text-[10px] text-terminal-muted shrink-0">
          <span>⚡ Sorted: <strong className="text-terminal-text">{sortOrder === 'PROBABILITY' ? 'Highest Probability First' : sortOrder === 'CE_FIRST' ? 'Calls (CE) First' : 'Puts (PE) First'}</strong></span>
          <span>Side: <strong className="text-bear">{sideFilter === 'ALL' ? 'All Sides' : sideFilter === 'CE' ? 'Calls (CE) Only' : 'Puts (PE) Only'}</strong></span>
        </div>
      </aside>
    </>
  );
};

export default SurgeAlertBanner;
