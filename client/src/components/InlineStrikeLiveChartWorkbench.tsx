import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTheme } from '../context/ThemeContext';
import { StrikePriceLiveChart, type StrikeTimeframe } from './StrikePriceLiveChart';
import { StrikeAnalyticsRightPanel } from './StrikeAnalyticsRightPanel';
import { isMarketOpenForSymbol, getLastMarketSessionAnchor } from '../utils/marketHours';
import { getStrikeSignalLevels } from '../utils/strikeSignalHelper';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { 
  BarChart3, 
  Maximize2, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Sparkles, 
  Layers, 
  Flame, 
  Target, 
  Zap, 
  RefreshCw,
  Compass,
  ArrowUpRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export const InlineStrikeLiveChartWorkbench: React.FC = () => {
  const { 
    selectedIndex, 
    currentIndexState, 
    indices,
    openStrikeChartModal 
  } = useMarket();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Internal state
  const [timeframe, setTimeframe] = useState<StrikeTimeframe>('3m');
  const [activeOptionType, setActiveOptionType] = useState<'CE' | 'PE'>('CE');
  const [activeStrike, setActiveStrike] = useState<number>(24500);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);
  const [viewSize, setViewSize] = useState<'fit' | 'standard' | 'expanded'>('fit');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Symbol config for strike step
  const symbolConfig = useMemo(() => {
    return ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex) || { lot: 65, step: 50 };
  }, [selectedIndex]);

  // Primary hero tip from the unified cockpit
  const heroTip = useMemo(() => {
    const pkg = currentIndexState?.unifiedTipsPackage;
    if (!pkg) return null;
    return pkg.primaryTrade || pkg.topCallTrade || pkg.topPutTrade || null;
  }, [currentIndexState]);

  // Available strikes list from current state
  const availableStrikes = useMemo(() => {
    if (!currentIndexState?.strikes || currentIndexState.strikes.length === 0) {
      const atm = currentIndexState?.atmStrike || 24500;
      const step = symbolConfig.step || 50;
      return [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(s => atm + s * step);
    }
    return currentIndexState.strikes.map(s => s.strikePrice).sort((a, b) => a - b);
  }, [currentIndexState, symbolConfig.step]);

  // Initial & automatic sync with hero tip or ATM strike on symbol switch
  const lastSyncedSymbolRef = useRef<string>('');
  useEffect(() => {
    const atm = currentIndexState?.atmStrike || 24500;
    const tipStrike = heroTip?.strike || heroTip?.strikePrice;
    if (tipStrike && (availableStrikes.includes(tipStrike) || availableStrikes.length === 0)) {
      setActiveStrike(tipStrike);
      const isPut = heroTip.optionType === 'PE' || heroTip.action?.includes('PUT');
      setActiveOptionType(isPut ? 'PE' : 'CE');
    } else if (lastSyncedSymbolRef.current !== selectedIndex || !availableStrikes.includes(activeStrike)) {
      setActiveStrike(atm);
      setActiveOptionType('CE');
    }
    lastSyncedSymbolRef.current = selectedIndex;
  }, [selectedIndex, heroTip, currentIndexState?.atmStrike, availableStrikes, activeStrike]);

  // Global event listener for custom strike selection triggers across the application
  useEffect(() => {
    const handleSelectStrike = (e: Event) => {
      const customEvent = e as CustomEvent<{ symbol?: string; strikePrice: number; optionType: 'CE' | 'PE' }>;
      if (customEvent.detail) {
        if (customEvent.detail.strikePrice) {
          setActiveStrike(customEvent.detail.strikePrice);
        }
        if (customEvent.detail.optionType) {
          setActiveOptionType(customEvent.detail.optionType);
        }
        setIsCollapsed(false);
        setIsHighlighted(true);
        setTimeout(() => setIsHighlighted(false), 2000);

        if (containerRef.current) {
          containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    window.addEventListener('fayda:select-strike-chart', handleSelectStrike);
    return () => window.removeEventListener('fayda:select-strike-chart', handleSelectStrike);
  }, []);

  // Find strike data object
  const strikeData = useMemo(() => {
    if (!currentIndexState?.strikes) return null;
    return currentIndexState.strikes.find(s => s.strikePrice === activeStrike) || null;
  }, [currentIndexState, activeStrike]);

  // Live premium ltp for current active strike
  const activeLtp = useMemo(() => {
    if (!strikeData) return 0;
    return activeOptionType === 'CE' ? strikeData.callLtp : strikeData.putLtp;
  }, [strikeData, activeOptionType]);

  const activeOiChange = useMemo(() => {
    if (!strikeData) return 0;
    return activeOptionType === 'CE' ? strikeData.callOiChange : strikeData.putOiChange;
  }, [strikeData, activeOptionType]);

  const isMarketOpen = isMarketOpenForSymbol(selectedIndex);
  const sessionAnchor = getLastMarketSessionAnchor(selectedIndex);

  const signalLevels = useMemo(() => {
    return getStrikeSignalLevels(selectedIndex, activeStrike, activeOptionType, strikeData, currentIndexState);
  }, [selectedIndex, activeStrike, activeOptionType, strikeData, currentIndexState]);

  // Handler to resync with current hero tip
  const handleResyncHero = () => {
    if (heroTip && heroTip.strike) {
      setActiveStrike(heroTip.strike);
      const isPut = heroTip.optionType === 'PE' || heroTip.action?.includes('PUT');
      setActiveOptionType(isPut ? 'PE' : 'CE');
      setIsHighlighted(true);
      setTimeout(() => setIsHighlighted(false), 1500);
    } else {
      const atm = currentIndexState?.atmStrike || 24500;
      setActiveStrike(atm);
    }
  };

  return (
    <section 
      id="strike-live-workbench" 
      ref={containerRef}
      className={`w-full rounded-2xl bg-terminal-card border transition-all duration-300 shadow-xl overflow-hidden ${
        isHighlighted 
          ? 'border-accent-cyan ring-4 ring-accent-cyan/30 shadow-[0_0_40px_rgba(0,229,255,0.35)]' 
          : 'border-terminal-border hover:border-terminal-border/80'
      }`}
    >
      {/* ── Top Terminal Control Ribbon ── */}
      <div className="px-3.5 sm:px-4 py-3 bg-gradient-to-r from-terminal-panel via-terminal-card to-terminal-panel border-b border-terminal-border flex flex-wrap items-center justify-between gap-3">
        {/* Left: Title & Active Contract Identification */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="p-2 rounded-xl bg-accent-cyan/15 border border-accent-cyan/35 text-accent-cyan shadow-sm flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-accent-cyan animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-sm sm:text-base text-terminal-text tracking-wide flex items-center gap-1.5">
                <span>{selectedIndex}</span>
                <span className="text-accent-cyan">{activeStrike}</span>
                <span className={activeOptionType === 'CE' ? 'text-bull' : 'text-bear'}>{activeOptionType}</span>
              </span>

              {/* Active LTP Pill */}
              <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-terminal-panel border border-terminal-border text-terminal-text flex items-center gap-1 shadow-xs">
                <span className="text-[10px] text-terminal-muted">LTP:</span>
                <span className={activeOptionType === 'CE' ? 'text-bull' : 'text-bear'}>₹{activeLtp > 0 ? activeLtp.toFixed(1) : '---'}</span>
              </span>

              {/* Signal Targets Pill */}
              <div className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-terminal-elevated/80 border border-cyan-500/30 text-terminal-text flex items-center gap-1.5 flex-wrap shadow-xs">
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-extrabold uppercase">ENTRY:</span>
                <span className="text-terminal-text font-black">₹{signalLevels.entryPrice.toFixed(1)}</span>
                <span className="text-terminal-border font-normal">|</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">T1:</span>
                <span className="text-emerald-600 dark:text-emerald-300 font-black">₹{signalLevels.target1Price.toFixed(1)}</span>
                <span className="text-terminal-border font-normal">|</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase">T2:</span>
                <span className="text-amber-600 dark:text-amber-300 font-black">₹{signalLevels.target2Price.toFixed(1)}</span>
                <span className="text-terminal-border font-normal">|</span>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold uppercase">SL:</span>
                <span className="text-rose-600 dark:text-rose-300 font-black">₹{signalLevels.stoplossPrice.toFixed(1)}</span>
              </div>

              {/* Session Status Pill */}
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border flex items-center gap-1 ${
                isMarketOpen 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                <span>{isMarketOpen ? 'LIVE SESSION' : `CARRY-FORWARD ANCHOR (${sessionAnchor.closingTimeFormatted})`}</span>
              </span>
            </div>

            <p className="text-[11px] font-mono text-terminal-muted hidden sm:block">
              Embedded Institutional Strike Candlestick Chart & Real-Time Order Flow Confluence Radar
            </p>
          </div>
        </div>

        {/* Right: Quick Switchers & Actions */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Quick Strike Selector Dropdown */}
          <div className="flex items-center space-x-1.5 bg-terminal-panel px-2 py-1 rounded-lg border border-terminal-border">
            <span className="text-[11px] font-mono text-terminal-muted">Strike:</span>
            <select
              value={activeStrike}
              onChange={(e) => setActiveStrike(Number(e.target.value))}
              aria-label="Select strike price"
              className="bg-transparent text-xs font-mono font-bold text-terminal-text border-0 focus:outline-none cursor-pointer"
            >
              {availableStrikes.map((s) => (
                <option key={s} value={s} className="bg-terminal-card text-terminal-text">
                  {s} {s === currentIndexState?.atmStrike ? '(ATM)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* CE / PE Switcher */}
          <div className="flex items-center rounded-lg bg-terminal-panel p-0.5 border border-terminal-border font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveOptionType('CE')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                activeOptionType === 'CE'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-terminal-muted hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>CALL (CE)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveOptionType('PE')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                activeOptionType === 'PE'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-terminal-muted hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <TrendingDown className="w-3 h-3" />
              <span>PUT (PE)</span>
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="hidden md:flex items-center rounded-lg bg-terminal-panel p-0.5 border border-terminal-border font-mono text-xs">
            {(['1m', '3m', '5m', '15m'] as StrikeTimeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                  timeframe === tf
                    ? 'bg-accent-cyan text-white dark:text-slate-950 shadow-xs'
                    : 'text-terminal-muted hover:text-accent-cyan'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Screen Fit Height Selector */}
          <div className="hidden sm:flex items-center rounded-lg bg-terminal-panel p-0.5 border border-terminal-border font-mono text-xs">
            <button
              type="button"
              onClick={() => setViewSize('fit')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer text-[11px] ${
                viewSize === 'fit'
                  ? 'bg-accent-cyan text-slate-950 font-black shadow-xs'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
              title="Compact Screen Fit (460px) - clean viewing without vertical scrolling"
            >
              Fit Screen (460px)
            </button>
            <button
              type="button"
              onClick={() => setViewSize('standard')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer text-[11px] ${
                viewSize === 'standard'
                  ? 'bg-accent-cyan text-slate-950 font-black shadow-xs'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
              title="Standard view height (520px)"
            >
              Standard (520px)
            </button>
            <button
              type="button"
              onClick={() => setViewSize('expanded')}
              className={`px-2 py-1 rounded-md font-bold transition cursor-pointer text-[11px] ${
                viewSize === 'expanded'
                  ? 'bg-accent-cyan text-slate-950 font-black shadow-xs'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
              title="Expanded large view (640px)"
            >
              Large
            </button>
          </div>

          {/* Sync Hero Button */}
          {heroTip && (
            <button
              type="button"
              onClick={handleResyncHero}
              className="px-2.5 py-1.5 rounded-lg bg-accent-gold/10 hover:bg-accent-gold/20 text-accent-gold border border-accent-gold/30 text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer"
              title={`Sync with Cockpit Hero Signal: ${heroTip.strike} ${heroTip.optionType}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Sync Hero Tip</span>
            </button>
          )}

          {/* Expand Fullscreen Pop-out Button */}
          <button
            type="button"
            onClick={() => openStrikeChartModal(selectedIndex, activeStrike, activeOptionType, strikeData)}
            className="p-1.5 rounded-lg bg-terminal-panel hover:bg-accent-cyan/20 text-terminal-muted hover:text-accent-cyan border border-terminal-border transition cursor-pointer"
            title="Pop-out Immersive Fullscreen Window"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-1.5 rounded-lg bg-terminal-panel hover:bg-terminal-elevated text-terminal-muted hover:text-terminal-text border border-terminal-border transition cursor-pointer"
            title={isCollapsed ? "Expand Live Chart Workbench" : "Collapse Workbench"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4 text-accent-cyan" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Main Collapsible Body ── */}
      {!isCollapsed && (
        <div className="p-2.5 sm:p-3 bg-terminal-bg grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Left Column (8 of 12 cols): Interactive Candlestick Chart */}
          <div className={`lg:col-span-8 flex flex-col ${
            viewSize === 'fit' 
              ? 'h-[460px] xl:h-[480px]' 
              : viewSize === 'standard' 
              ? 'h-[520px] xl:h-[550px]' 
              : 'h-[640px] xl:h-[680px]'
          } rounded-xl border border-terminal-border bg-terminal-card shadow-inner overflow-hidden`}>
            <StrikePriceLiveChart
              symbol={selectedIndex}
              strikePrice={activeStrike}
              optionType={activeOptionType}
              strikeData={strikeData}
              currentIndexState={currentIndexState}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              onOptionTypeChange={setActiveOptionType}
              onExpandFullscreen={() => openStrikeChartModal(selectedIndex, activeStrike, activeOptionType, strikeData)}
              height="100%"
            />
          </div>

          {/* Right Column (4 of 12 cols): Institutional Alpha Order Flow Intelligence Panel */}
          <div className={`lg:col-span-4 flex flex-col ${
            viewSize === 'fit' 
              ? 'h-[460px] xl:h-[480px]' 
              : viewSize === 'standard' 
              ? 'h-[520px] xl:h-[550px]' 
              : 'h-[640px] xl:h-[680px]'
          } rounded-xl border border-terminal-border bg-terminal-card shadow-inner overflow-hidden`}>
            <StrikeAnalyticsRightPanel
              symbol={selectedIndex}
              strikePrice={activeStrike}
              optionType={activeOptionType}
              strikeData={strikeData}
              currentIndexState={currentIndexState}
              selectedTimeframe={timeframe}
            />
          </div>
        </div>
      )}
    </section>
  );
};
