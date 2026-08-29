import React, { useState, useMemo, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  Globe, 
  ChevronRight, 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  X, 
  Sparkles
} from 'lucide-react';

export const GlobalIndicesSidebar: React.FC = () => {
  const { globalIndices } = useMarket();
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('oi_radar_global_sidebar_open');
    return saved === 'true';
  });
  const [regionFilter, setRegionFilter] = useState<'ALL' | 'US' | 'ASIA' | 'EUROPE' | 'COMMODITIES' | 'YIELDS'>('ALL');

  const toggleSidebar = () => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('oi_radar_global_sidebar_open', String(next));
      return next;
    });
  };

  const filteredIndices = useMemo(() => {
    if (regionFilter === 'ALL') return globalIndices;
    if (regionFilter === 'YIELDS') {
      return globalIndices.filter((i) => i.region === 'YIELDS' || i.region === 'CURRENCY');
    }
    return globalIndices.filter((i) => i.region === regionFilter);
  }, [globalIndices, regionFilter]);

  const stats = useMemo(() => {
    let pos = 0;
    let neg = 0;
    let neu = 0;
    globalIndices.forEach((i) => {
      if (i.pctChange > 0.1) pos++;
      else if (i.pctChange < -0.1) neg++;
      else neu++;
    });

    const isNetBullish = pos >= neg;
    return { pos, neg, neu, isNetBullish };
  }, [globalIndices]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        localStorage.setItem('oi_radar_global_sidebar_open', 'false');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* 1. Backdrop Click-to-Dismiss Overlay */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* 2. Slide-out Drawer Panel with Protruding Left Vertical Toggle Handle */}
      <aside
        className={`fixed top-14 bottom-10 right-0 w-[310px] sm:w-[360px] md:w-[390px] bg-terminal-bg/95 backdrop-blur-2xl border-l border-t border-b border-terminal-border z-40 shadow-[0_0_60px_rgba(0,0,0,0.85)] rounded-l-3xl flex flex-col font-mono transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Protruding Vertical Toggle Handle on Left Edge */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -left-[38px] top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5 py-3 px-1.5 rounded-l-2xl border-l border-t border-b font-mono font-black text-[10px] sm:text-[11px] uppercase tracking-wider transition-all duration-200 shadow-[-6px_0_20px_rgba(0,229,255,0.35)] backdrop-blur-md bg-gradient-to-b from-terminal-panel via-terminal-card to-terminal-panel border-accent-cyan/60 text-terminal-text hover:text-accent-cyan hover:border-accent-cyan cursor-pointer"
          title={isOpen ? 'Collapse Global Indices Panel (Esc)' : 'Expand Top International Indices'}
          style={{ writingMode: 'vertical-rl' }}
        >
          <div className="flex items-center justify-center gap-1 rotate-180 mb-1">
            {isOpen ? (
              <ChevronRight className="w-3.5 h-3.5 text-accent-cyan" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 text-accent-cyan animate-pulse" />
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-bull animate-ping" />
          </div>
          
          <div className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 rotate-90 text-accent-cyan" />
            <span>GLOBAL INDICES</span>
          </div>

          <span className="text-[9px] px-1 py-0.2 rounded bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 font-mono mt-1">
            {globalIndices.length}
          </span>
        </button>
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-terminal-border bg-terminal-panel/80 rounded-tl-3xl flex flex-col gap-2 relative">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-32 h-20 bg-accent-cyan/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-1.5 h-5 rounded-full bg-accent-cyan shadow-[0_0_8px_#00E5FF] shrink-0" />
              <div className="p-1.5 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_10px_rgba(0,229,255,0.2)] shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]">
                  GLOBAL MARKET RADAR
                </h2>
                <span className="text-[10px] text-terminal-muted block">
                  Top International Indices & Sentiment
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg bg-terminal-card hover:bg-terminal-border text-terminal-muted hover:text-terminal-text transition"
                title="Close Global Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Net Sentiment Banner */}
          <div className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px] font-bold ${
            stats.isNetBullish 
              ? 'bg-bull/10 border-bull/30 text-bull' 
              : 'bg-bear/10 border-bear/30 text-bear'
          }`}>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OVERALL GLOBAL BIAS:</span>
            </span>
            <span className="font-black uppercase">
              {stats.isNetBullish ? '🟢 POSITIVE FOR INDIA' : '🔴 CAUTION / HEADWIND'}
            </span>
          </div>

          {/* Region Filter Tabs */}
          <div className="flex flex-wrap gap-1 text-[10px] pt-1">
            {(['ALL', 'US', 'ASIA', 'EUROPE', 'COMMODITIES', 'YIELDS'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegionFilter(r)}
                className={`px-2 py-0.5 rounded-md font-bold transition ${
                  regionFilter === r
                    ? 'bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/50 shadow-sm'
                    : 'bg-terminal-card text-terminal-muted hover:text-terminal-text border border-terminal-border'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Indices Cards List */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2">
          {filteredIndices.map((item) => {
            const isPositive = item.pctChange > 0;
            const isNegative = item.pctChange < 0;
            const isGiftNifty = item.id === 'GIFT_NIFTY';

            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border transition-all duration-200 hover:border-accent-cyan/50 bg-terminal-card/90 shadow-sm ${
                  isGiftNifty 
                    ? 'border-accent-cyan/60 bg-accent-cyan/5 shadow-[0_0_15px_rgba(0,229,255,0.15)] ring-1 ring-accent-cyan/30' 
                    : 'border-terminal-border/80'
                }`}
              >
                {/* Top Row: Flag + Name + Status */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-base leading-none">{item.flag}</span>
                    <span className="font-mono font-black text-xs text-terminal-text">
                      {item.name}
                    </span>
                    {isGiftNifty && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40">
                        KEY BENCHMARK
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase ${
                      item.status === 'OPEN'
                        ? 'bg-bull/15 text-bull border border-bull/30'
                        : 'bg-terminal-panel text-terminal-muted border border-terminal-border'
                    }`}>
                      <span className={`w-1 h-1 rounded-full mr-1 ${item.status === 'OPEN' ? 'bg-bull animate-ping' : 'bg-terminal-muted'}`} />
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Second Row: Price & Changes */}
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-mono font-extrabold text-sm sm:text-base text-terminal-text">
                    {item.region === 'COMMODITIES' && item.id.includes('CRUDE')
                      ? `$${item.price.toFixed(2)}`
                      : item.region === 'COMMODITIES' && item.id.includes('GOLD')
                      ? `$${item.price.toLocaleString('en-US', { minimumFractionDigits: 1 })}`
                      : item.region === 'YIELDS'
                      ? `${item.price.toFixed(2)}%`
                      : item.region === 'CURRENCY'
                      ? `₹${item.price.toFixed(2)}`
                      : item.price.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                  </span>

                  <span className={`font-mono text-xs font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                    isPositive
                      ? 'bg-bull/15 text-bull border border-bull/30'
                      : isNegative
                      ? 'bg-bear/15 text-bear border border-bear/30'
                      : 'bg-amber/15 text-amber border border-amber/30'
                  }`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : null}
                    {isPositive ? '+' : ''}{item.change.toFixed(2)} ({isPositive ? '+' : ''}{item.pctChange.toFixed(2)}%)
                  </span>
                </div>

                {/* Third Row: Impact Notes on Indian Market */}
                {item.notes && (
                  <div className="text-[10px] text-terminal-muted bg-terminal-bg/70 px-2 py-1 rounded-lg border border-terminal-border/40 mt-1 flex items-start gap-1">
                    <span className="text-accent-cyan font-bold shrink-0">💡</span>
                    <span className="leading-tight">{item.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-2.5 border-t border-terminal-border bg-terminal-panel/80 text-[10px] font-mono text-terminal-muted flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-accent-cyan" />
            <span>Auto-refreshing every 4s</span>
          </span>
          <span className="text-accent-cyan font-bold">NSE IX • CME • ICE</span>
        </div>
      </aside>
    </>
  );
};
