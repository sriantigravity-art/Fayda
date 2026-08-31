import React, { useState, useMemo } from 'react';
import { useMarket } from '../context/MarketContext';
import type { SurgeEvent, SurgeLevel, IndexSymbol, TradeAction } from '../types';
import { calculateTargetHorizon } from '../utils/tradeHorizon';
import { 
  Flame, 
  Filter, 
  Clock, 
  Moon, 
  Sparkles, 
  Zap,
  ChevronDown,
  RotateCcw
} from 'lucide-react';

type TimeWindowFilter = 'ALL' | '5M' | '10M' | '15M' | '1H';

export const RadarFeed: React.FC = () => {
  const { recentSurges, visibleIndices, indices } = useMarket();

  // Local filters & collapse state
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<TimeWindowFilter>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | SurgeLevel>('ALL');
  const [indexFilter, setIndexFilter] = useState<'ALL' | IndexSymbol>('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | TradeAction>('ALL');

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

  const isLiveMarketOpen = isMarketHours();

  // Calculate live count of surges per time window
  const countsByTime = useMemo(() => {
    const now = Date.now();
    let count5m = 0, count10m = 0, count15m = 0, count1h = 0;
    
    recentSurges.forEach((s) => {
      if (!visibleIndices.includes(s.indexSymbol)) return;
      const diffMin = (now - new Date(s.timestamp).getTime()) / (60 * 1000);
      if (diffMin <= 5) count5m++;
      if (diffMin <= 10) count10m++;
      if (diffMin <= 15) count15m++;
      if (diffMin <= 60) count1h++;
    });

    return { count5m, count10m, count15m, count1h };
  }, [recentSurges, visibleIndices]);

  const filteredSurges = useMemo(() => {
    const now = Date.now();

    return recentSurges.filter((s) => {
      // Must belong to user's selected/visible indices
      if (!visibleIndices.includes(s.indexSymbol)) return false;
      const idxState = indices[s.indexSymbol];
      const atm = idxState?.atmStrike;
      if (atm && Math.abs(s.strikePrice - atm) > 600) return false;

      // Auto-Expire Signal after given validity window (e.g. 20m for Extreme Scalps, 45m for Strong, 60m for Moderate)
      const diffMin = (now - new Date(s.timestamp).getTime()) / (60 * 1000);
      const maxValidity = s.validUntilMinutes || (s.surgeLevel === 'EXTREME' ? 25 : s.surgeLevel === 'STRONG' ? 45 : 60);
      if (diffMin > maxValidity) return false;

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
  }, [recentSurges, visibleIndices, indices, timeFilter, levelFilter, indexFilter, actionFilter]);

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
      {/* Feed Header (Accordion Trigger) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-3.5 bg-terminal-panel/60 cursor-pointer select-none group/hdr transition-all ${isExpanded ? 'border-b border-terminal-border' : ''}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-6 rounded-full bg-bear shadow-[0_0_10px_#FF3B69] shrink-0" />
            <div className="p-2 rounded-xl bg-bear/15 text-bear border border-bear/30 shadow-[0_0_12px_rgba(255,59,105,0.25)] group-hover/hdr:scale-105 transition-transform shrink-0">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(255,59,105,0.3)] group-hover/hdr:text-bear transition-colors">
                  LIVE OI ACTIVITY RADAR
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-bear/15 text-bear font-black border border-bear/40 shadow-sm">
                  {filteredSurges.length} Events
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted font-mono mt-0.5">
                Real-time 1-Minute Open Interest Delta Surge & Absorption Scanner
              </p>
            </div>
          </div>

          {/* Right Action Suite & Filter Controls */}
          <div className="flex items-center justify-center sm:justify-end space-x-2 font-mono text-xs w-full sm:w-auto sm:ml-auto">
            {/* Live Filter Indicator Pills (visible when collapsed or expanded) */}
            <div className="hidden sm:flex items-center space-x-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-panel text-terminal-muted border border-terminal-border">
                {indexFilter === 'ALL' ? 'ALL STRIKES' : indexFilter}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-bull/10 text-bull border border-bull/30">
                1-Sec Live
              </span>
            </div>

            {/* Standardized Dropdown Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`px-3 py-1.5 rounded-xl border-2 font-mono font-black text-[11px] sm:text-xs transition-all hover:scale-105 flex items-center justify-center gap-2 shrink-0 shadow-sm ${
                isExpanded
                  ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'bg-terminal-card border-accent-cyan/70 text-terminal-text hover:border-accent-cyan hover:text-accent-cyan'
              }`}
              title={isExpanded ? "Click to Collapse Live OI Activity Radar" : "Click to Expand Live OI Activity Radar"}
            >
              <span className="tracking-wider uppercase">
                {isExpanded ? 'COLLAPSE' : 'VIEW RADAR'}
              </span>
              <div className={`p-0.5 rounded bg-accent-cyan/15 text-accent-cyan transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-accent-cyan/30' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Feed Suite & Scrollable Events */}
      {isExpanded && (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
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
          <div className="flex flex-col items-center justify-center py-10 text-terminal-muted text-center px-4">
            <Sparkles className="w-7 h-7 mb-2 opacity-30 animate-pulse text-accent-cyan" />
            <p className="font-mono text-xs font-bold text-terminal-text">No surge events match current filter.</p>
            <p className="text-[11px] mt-1 text-terminal-muted/70">
              Switch timeframe or await the next 1-minute institutional OI spike.
            </p>
          </div>
        ) : (
          filteredSurges.map((surge) => {
            const currentIdx = indices[surge.indexSymbol];
            const atm = currentIdx?.atmStrike || surge.strikePrice;
            const targetLtp = parseFloat(String(surge.suggestedContract.target || '').replace(/[^0-9.]/g, '')) || (surge.ltp * 1.35);
            const horizon = calculateTargetHorizon(
              surge.indexSymbol,
              surge.strikePrice,
              atm,
              surge.optionType,
              surge.ltp,
              targetLtp,
              surge.surgeScore
            );

            const isCall = surge.optionType === 'CE';
            const isExtreme = surge.surgeLevel === 'EXTREME';
            const isStrong = surge.surgeLevel === 'STRONG';

            const cardBorder = isExtreme
              ? 'border-bear/60 shadow-[0_0_15px_rgba(255,59,105,0.2)] ring-1 ring-bear/40 bg-bear/5'
              : isStrong
              ? 'border-amber/40 bg-terminal-panel/60'
              : 'border-terminal-border bg-terminal-panel/30';

            const isCheap = surge.ivStatus === 'CHEAP';
            const isExpensive = surge.ivStatus === 'EXPENSIVE_CRUSH_RISK';

            // Calculate relative time & expiration countdown
            const diffMs = Math.max(0, Date.now() - new Date(surge.timestamp).getTime());
            const diffMin = Math.floor(diffMs / (60 * 1000));
            const relTimeStr = diffMin === 0 ? 'Just now' : `${diffMin}m ago`;
            const maxValMin = surge.validUntilMinutes || (surge.surgeLevel === 'EXTREME' ? 20 : surge.surgeLevel === 'STRONG' ? 45 : 60);
            const remainingMin = Math.max(1, maxValMin - diffMin);

            return (
              <div
                key={surge.id}
                className={`rounded-xl p-3 border transition-all duration-200 hover:border-accent-cyan/50 hover:bg-terminal-card ${cardBorder}`}
              >
                {/* Top line of Card */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-[10px] text-terminal-text bg-terminal-bg px-1.5 py-0.5 rounded border border-terminal-border font-bold flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-accent-cyan" />
                      <span>{surge.timeFormatted}</span>
                      <span className="text-[9px] text-terminal-muted">({relTimeStr})</span>
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-terminal-panel border border-terminal-border text-amber font-bold">
                      ⏳ {remainingMin}m left
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
                      {surge.oiChange1mFormatted} ({surge.oiChangePct > 0 ? '+' : ''}{surge.oiChangePct}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-terminal-muted block text-[9px]">CURRENT OI</span>
                    <span className="font-semibold text-terminal-text">{surge.currentOIFormatted}</span>
                  </div>
                  <div>
                    <span className="text-terminal-muted block text-[9px]">PREMIUM (LTP)</span>
                    <span className="font-bold text-terminal-text">
                      ₹{surge.ltp.toFixed(2)}{' '}
                      <span className={`text-[10px] ${surge.ltpChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                        ({surge.ltpChange >= 0 ? '+' : ''}{surge.ltpPctChange}%)
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-terminal-muted block text-[9px]">VOLUME</span>
                    <span className="font-semibold text-terminal-text">{(surge.volume / 1000).toFixed(0)}k</span>
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

                  {/* Execution Matrix: Entry Zone, Exit/SL, Target, R:R */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[10px]">
                    <div className="bg-accent-cyan/10 p-1.5 rounded-md border border-accent-cyan/30">
                      <span className="text-accent-cyan block text-[8px] font-bold uppercase">ENTRY ZONE</span>
                      <span className="font-bold text-terminal-text block">{surge.suggestedContract.recommendedEntry}</span>
                    </div>
                    <div className="bg-bear/15 p-1.5 rounded-md border border-bear/30">
                      <span className="text-bear block text-[8px] font-bold uppercase">EXIT / STOPLOSS</span>
                      <span className="font-bold text-bear block">{surge.suggestedContract.stoploss}</span>
                    </div>
                    <div className="bg-bull/15 p-1.5 rounded-md border border-bull/30">
                      <span className="text-bull block text-[8px] font-bold uppercase">TARGET 1</span>
                      <span className="font-bold text-bull block">{surge.suggestedContract.target}</span>
                    </div>
                    <div className="bg-terminal-bg p-1.5 rounded-md border border-terminal-border">
                      <span className="text-terminal-muted block text-[8px] font-bold uppercase">R:R RATIO</span>
                      <span className="font-bold text-amber block">{surge.suggestedContract.riskReward || '1:2.0'}</span>
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
          <div className="p-3 rounded-xl bg-amber/10 border border-amber/30 text-center font-mono mt-2">
            <div className="flex items-center justify-center gap-1.5 text-amber font-bold text-xs mb-1">
              <Moon className="w-3.5 h-3.5 animate-pulse" />
              <span>Market is Closed (EOD Settlement)</span>
            </div>
            <p className="text-[10px] text-terminal-muted max-w-sm mx-auto leading-relaxed">
              Real-time Open Interest numbers do not change outside market hours (09:15 AM – 03:40 PM IST). 
              Live surge alerts will resume when market opens at 09:15 AM.
            </p>
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
};
