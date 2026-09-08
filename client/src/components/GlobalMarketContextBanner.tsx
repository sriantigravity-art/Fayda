import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Globe,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export const GlobalMarketContextBanner: React.FC = () => {
  const { globalMarketContext } = useMarket();
  const { isBeginner, isIntermediate } = useTerminalMode();

  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isAllView, setIsAllView] = useState<boolean>(false);

  const SLIDE_DURATION_MS = 5000;
  const TICK_INTERVAL_MS = 100;
  const elapsedRef = useRef<number>(0);

  const premarketSetup = globalMarketContext?.premarketSetup;
  const indicators = globalMarketContext?.indicators;
  const primaryDrivers = globalMarketContext?.primaryDrivers;
  const summary = globalMarketContext?.summary;

  const isSupportive = premarketSetup === 'SUPPORTIVE';
  const isRiskOff = premarketSetup === 'RISK_OFF';

  const supportiveLabel = isBeginner ? '🟢 WORLD MARKETS: POSITIVE' : isIntermediate ? '🟢 GLOBAL SETUP: SUPPORTIVE' : '🟢 MACRO RISK-ON: EXPANSION';
  const riskOffLabel = isBeginner ? '🔴 WORLD MARKETS: WEAK' : isIntermediate ? '🔴 GLOBAL SETUP: RISK-OFF' : '🔴 MACRO RISK-OFF: CONTRACTION';
  const mixedLabel = isBeginner ? '🟡 WORLD MARKETS: BALANCED' : isIntermediate ? '🟡 GLOBAL SETUP: MIXED' : '🟡 MACRO RISK: CONVERGING';

  const setupBadge = isSupportive ? (
    <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wider uppercase bg-bull/20 text-bull border border-bull/50 shadow-[0_0_12px_rgba(0,245,155,0.25)] flex items-center gap-1 shrink-0">
      <CheckCircle2 className="w-3 h-3" />
      <span>{supportiveLabel}</span>
    </span>
  ) : isRiskOff ? (
    <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wider uppercase bg-bear/20 text-bear border border-bear/50 shadow-[0_0_12px_rgba(255,59,105,0.25)] flex items-center gap-1 animate-pulse shrink-0">
      <AlertTriangle className="w-3 h-3" />
      <span>{riskOffLabel}</span>
    </span>
  ) : (
    <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wider uppercase bg-amber/20 text-amber border border-amber/50 flex items-center gap-1 shrink-0">
      <Activity className="w-3 h-3 text-amber" />
      <span>{mixedLabel}</span>
    </span>
  );

  const formatPct = (val: number, labelPrefix?: string) => {
    const isPos = val >= 0;
    return (
      <span className={`font-mono text-[10px] font-bold inline-flex items-center gap-0.5 ${isPos ? 'text-bull' : 'text-bear'}`}>
        {labelPrefix && <span className="opacity-70">{labelPrefix}</span>}
        <span>{isPos ? '+' : ''}{val.toFixed(2)}%</span>
      </span>
    );
  };

  const fiiIsPos = (indicators?.fiiNetBuyCr ?? 0) >= 0;
  const diiIsPos = (indicators?.diiNetBuyCr ?? 0) >= 0;

  // Build the 4 balanced slides containing 100% of global market indicators
  const slides = useMemo(() => {
    if (!indicators) return [];

    return [
      {
        id: 'india-commodities',
        categoryTitle: 'INDIA & COMMODITIES',
        categoryBadge: '🇮🇳 DOMESTIC & CRUDE',
        items: (
          <>
            {/* GIFT Nifty */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-terminal-muted text-[10px] font-mono font-semibold">GIFT NIFTY:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">₹{indicators.giftNifty.value.toFixed(0)}</span>
              {formatPct(indicators.giftNifty.changePct)}
            </div>

            {/* USD/INR */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-terminal-muted text-[10px] font-mono font-semibold">USD/INR:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">₹{indicators.usdInr.value.toFixed(2)}</span>
              {formatPct(indicators.usdInr.changePct)}
            </div>

            {/* Brent Crude */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-terminal-muted text-[10px] font-mono font-semibold">BRENT CRUDE:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">${indicators.brentCrude.value.toFixed(2)}</span>
              {formatPct(indicators.brentCrude.changePct)}
            </div>

            {/* Gold */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-amber-500/80 text-[10px] font-mono font-bold">GOLD:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">${(indicators.gold?.value ?? 2685.4).toFixed(1)}</span>
              {formatPct(indicators.gold?.changePct ?? 0.15)}
            </div>
          </>
        )
      },
      {
        id: 'us-europe-equities',
        categoryTitle: 'US & EUROPE EQUITIES',
        categoryBadge: '🇺🇸 US & 🇪🇺 EUROPE',
        items: (
          <>
            {/* S&P 500 */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-accent-cyan text-[10px] font-mono font-bold">S&P 500:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">{indicators.sp500.value.toFixed(0)}</span>
              {formatPct(indicators.sp500.changePct)}
            </div>

            {/* Nasdaq 100 */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-accent-cyan text-[10px] font-mono font-bold">NASDAQ:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">{indicators.nasdaq.value.toFixed(0)}</span>
              {formatPct(indicators.nasdaq.changePct)}
            </div>

            {/* FTSE 100 */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-purple-400 text-[10px] font-mono font-bold">FTSE 100:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">{(indicators.ftse?.value ?? 8240).toFixed(0)}</span>
              {formatPct(indicators.ftse?.changePct ?? 0.25)}
            </div>

            {/* DAX 40 */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-purple-400 text-[10px] font-mono font-bold">DAX 40:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">{(indicators.dax?.value ?? 18650).toFixed(0)}</span>
              {formatPct(indicators.dax?.changePct ?? 0.35)}
            </div>
          </>
        )
      },
      {
        id: 'asia-yields',
        categoryTitle: 'ASIA & GLOBAL MACRO',
        categoryBadge: '🇯🇵 ASIA & 🌐 YIELDS',
        items: (
          <>
            {/* Nikkei 225 */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-accent-sky text-[10px] font-mono font-bold">NIKKEI:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">{indicators.nikkei.value.toFixed(0)}</span>
              {formatPct(indicators.nikkei.changePct)}
            </div>

            {/* Hang Seng */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-accent-sky text-[10px] font-mono font-bold">HANG SENG:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">{indicators.hangSeng.value.toFixed(0)}</span>
              {formatPct(indicators.hangSeng.changePct)}
            </div>

            {/* US 10Y Yield */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-slate-400 text-[10px] font-mono font-bold">US 10Y:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">{(indicators.us10y?.value ?? 4.18).toFixed(2)}%</span>
              {formatPct(indicators.us10y?.changePct ?? -0.45)}
            </div>

            {/* Dollar Index (DXY) */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs hover:border-terminal-border transition-colors">
              <span className="text-slate-400 text-[10px] font-mono font-bold">DXY DOLLAR:</span>
              <span className="font-bold text-terminal-text font-mono text-xs">{(indicators.dxy?.value ?? 104.20).toFixed(2)}</span>
              {formatPct(indicators.dxy?.changePct ?? -0.18)}
            </div>
          </>
        )
      },
      {
        id: 'flows-catalyst',
        categoryTitle: 'INSTITUTIONAL FLOWS & CATALYST',
        categoryBadge: '🏦 FII/DII & CATALYST',
        items: (
          <>
            {/* FII Net */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border shrink-0 shadow-xs ${
              fiiIsPos ? 'bg-bull/10 border-bull/40 text-bull' : 'bg-bear/10 border-bear/40 text-bear'
            }`}>
              <span className="text-[10px] font-mono font-bold uppercase">FII FLOW:</span>
              <span className="font-bold font-mono text-xs">
                {fiiIsPos ? '+' : ''}₹{indicators.fiiNetBuyCr.toLocaleString()} Cr
              </span>
            </div>

            {/* DII Net */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border shrink-0 shadow-xs ${
              diiIsPos ? 'bg-bull/10 border-bull/40 text-bull' : 'bg-bear/10 border-bear/40 text-bear'
            }`}>
              <span className="text-[10px] font-mono font-bold uppercase">DII FLOW:</span>
              <span className="font-bold font-mono text-xs">
                {diiIsPos ? '+' : ''}₹{indicators.diiNetBuyCr.toLocaleString()} Cr
              </span>
            </div>

            {/* Catalyst summary pill */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-terminal-panel/90 dark:bg-slate-900/90 border border-terminal-border/90 shrink-0 shadow-xs max-w-[420px] truncate" title={primaryDrivers?.[0] || summary || ''}>
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="text-terminal-muted text-[10px] font-mono font-bold shrink-0 uppercase">CATALYST:</span>
              <span className="text-terminal-text text-xs truncate font-sans">
                {primaryDrivers?.[0] || summary || 'Global macro factors steady for Dalal Street.'}
              </span>
            </div>
          </>
        )
      }
    ];
  }, [indicators, primaryDrivers, summary, fiiIsPos, diiIsPos]);

  // 5-Second Loop Timer with Pause on Hover
  useEffect(() => {
    if (slides.length === 0 || isAllView) return;

    const interval = setInterval(() => {
      if (isPaused || isHovered) return;

      elapsedRef.current += TICK_INTERVAL_MS;

      if (elapsedRef.current >= SLIDE_DURATION_MS) {
        elapsedRef.current = 0;
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [slides.length, isPaused, isHovered, isAllView]);

  if (!globalMarketContext || !indicators || slides.length === 0) return null;

  const handlePrev = () => {
    elapsedRef.current = 0;
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    elapsedRef.current = 0;
    setCurrentSlide(prev => (prev + 1) % slides.length);
  };

  const handleSelectSlide = (idx: number) => {
    elapsedRef.current = 0;
    setCurrentSlide(idx);
  };

  return (
    <div 
      className="w-full bg-terminal-card/95 border-b border-terminal-border/80 text-terminal-text select-none text-xs font-mono shadow-sm relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Mobile/Tablet: 2-row layout. Desktop: single-row layout */}
      <div className="max-w-[1840px] mx-auto px-2 sm:px-4">

        {/* ── ROW 1 (always): Badge + Slide Controls ── */}
        <div className="flex items-center justify-between gap-2 py-1.5">
          {/* Left: Macro Setup Badge + Category pill (desktop only) */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {setupBadge}
            {/* Active Category Pill — desktop only */}
            {!isAllView && (
              <span className="hidden lg:inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-terminal-panel/90 border border-terminal-border text-terminal-muted shrink-0">
                {slides[currentSlide]?.categoryBadge}
              </span>
            )}
          </div>

          {/* Right: Slide Controls — always on Row 1 */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-terminal-border/60">
            {!isAllView && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 rounded-md hover:bg-terminal-panel border border-transparent hover:border-terminal-border text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
                  title="Previous market group"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {slides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSlide(idx)}
                      className={`transition-all duration-200 cursor-pointer rounded-full ${
                        currentSlide === idx
                          ? 'w-3.5 h-1.5 bg-accent-cyan shadow-xs shadow-accent-cyan/50'
                          : 'w-1.5 h-1.5 bg-slate-400/40 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500'
                      }`}
                      title={`Slide ${idx + 1}/${slides.length}: ${s.categoryTitle}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 rounded-md hover:bg-terminal-panel border border-transparent hover:border-terminal-border text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
                  title="Next market group"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaused(prev => !prev)}
                  className={`p-1 rounded-md transition-colors cursor-pointer border ${
                    isPaused
                      ? 'bg-amber-500/20 text-amber border-amber-500/40'
                      : 'hover:bg-terminal-panel text-terminal-muted hover:text-terminal-text border-transparent hover:border-terminal-border'
                  }`}
                  title={isPaused ? 'Resume auto-slide' : 'Pause auto-slide'}
                >
                  {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsAllView(prev => !prev)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer border ${
                isAllView
                  ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40'
                  : 'hover:bg-terminal-panel text-terminal-muted hover:text-terminal-text border-transparent hover:border-terminal-border'
              }`}
              title={isAllView ? 'Switch to 5s loop' : 'Expand all indicators'}
            >
              {isAllView ? '5s Loop' : 'All'}
            </button>
          </div>

          {/* Desktop only: Data chips inline on Row 1 (after divider) */}
          <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0 overflow-hidden pl-3 border-l border-terminal-border/40">
            {isAllView ? (
              <div className="flex items-center flex-wrap gap-1.5 text-[11px] font-sans overflow-x-auto no-scrollbar py-0.5">
                {slides.map(s => (
                  <React.Fragment key={s.id}>{s.items}</React.Fragment>
                ))}
              </div>
            ) : (
              <div
                key={currentSlide}
                className="flex items-center flex-nowrap overflow-x-auto no-scrollbar gap-1.5 text-[11px] font-sans transition-all duration-300 ease-out animate-in fade-in slide-in-from-left-2 py-0.5"
              >
                {slides[currentSlide]?.items}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 2 (mobile/tablet only, hidden on lg+): Data Chips scrollable ticker ── */}
        <div className="lg:hidden pb-1.5">
          {isAllView ? (
            <div className="flex items-center flex-wrap gap-1.5 text-[11px] font-sans overflow-x-auto no-scrollbar py-0.5">
              {slides.map(s => (
                <React.Fragment key={s.id}>{s.items}</React.Fragment>
              ))}
            </div>
          ) : (
            <div
              key={`mob-${currentSlide}`}
              className="flex items-center flex-nowrap overflow-x-auto no-scrollbar gap-1.5 text-[11px] font-sans animate-in fade-in slide-in-from-left-2 py-0.5"
            >
              {slides[currentSlide]?.items}
            </div>
          )}
        </div>

      </div>
      </div>
    );
  };

export default GlobalMarketContextBanner;
