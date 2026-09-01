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
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { formatISTTime } from '../utils/formatTime';
import type { IndexSymbol, SurgeEvent } from '../types';

export const SurgeAlertBanner: React.FC = () => {
  const { recentSurges, setSelectedIndex, selectedIndex, indices } = useMarket();
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('oi_radar_surge_sidebar_open');
    return saved === 'true';
  });
  const [assetFilter, setAssetFilter] = useState<string>('ALL');
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

  // Filter surges: Strict Score >= 60, unexpired, and within active market hours
  const activeScore60Surges = useMemo(() => {
    const now = currentTime;
    return recentSurges.filter((s: SurgeEvent) => {
      // 1. Strict Score 60+ requirement
      if ((s.surgeScore ?? 0) < 60) return false;

      // 2. Unexpired timeline check (10m for Extreme, 15m for Strong, 20m for Moderate)
      const ageMs = now - new Date(s.timestamp).getTime();
      const maxAgeMs = (s.validUntilMinutes || (s.surgeLevel === 'EXTREME' ? 10 : 15)) * 60 * 1000;
      if (ageMs > maxAgeMs) return false;

      // 3. Asset filter
      if (assetFilter !== 'ALL') {
        const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === s.indexSymbol);
        if (assetFilter === 'COMMODITIES') {
          const isComm = cfg?.category === 'COMMODITIES' || cfg?.segment === 'COMMODITY' || cfg?.exchange === 'MCX';
          if (!isComm) return false;
        } else if (s.indexSymbol !== assetFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [recentSurges, assetFilter, currentTime]);

  // Overall count of all active score 60+ surges
  const totalActiveCount = useMemo(() => {
    const now = currentTime;
    return recentSurges.filter((s: SurgeEvent) => {
      if ((s.surgeScore ?? 0) < 60) return false;
      const ageMs = now - new Date(s.timestamp).getTime();
      const maxAgeMs = (s.validUntilMinutes || (s.surgeLevel === 'EXTREME' ? 10 : 15)) * 60 * 1000;
      return ageMs <= maxAgeMs;
    }).length;
  }, [recentSurges, currentTime]);

  // Unique asset list for filtering
  const availableAssetFilters = useMemo(() => {
    const set = new Set<string>();
    recentSurges.forEach((s) => {
      if ((s.surgeScore ?? 0) >= 60) {
        set.add(s.indexSymbol);
      }
    });
    return Array.from(set);
  }, [recentSurges]);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. RIGHT SIDE BUTTON: Clean Tab matching Global Indices
         ───────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="fixed right-0 top-[28%] sm:top-[30%] -translate-y-1/2 z-40 flex items-center justify-center p-2.5 sm:py-3 sm:px-2 rounded-l-2xl border-l-2 border-t-2 border-b-2 font-mono font-black text-[10px] sm:text-[11px] uppercase tracking-wider transition-all duration-200 shadow-[-4px_0_20px_rgba(255,59,105,0.45)] backdrop-blur-md bg-gradient-to-b from-terminal-panel via-terminal-card to-terminal-panel border-bear/80 text-terminal-text hover:text-bear hover:border-bear cursor-pointer group"
          title="Open Flash Surge Radar (Score 60+ Institutional Flow)"
        >
          {/* Mobile View (< sm): Compact Glowing Right-Edge Icon */}
          <div className="flex sm:hidden items-center justify-center relative p-0.5">
            <Zap className="w-5 h-5 text-bear drop-shadow-[0_0_10px_rgba(255,59,105,0.8)] animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-bear opacity-75 animate-ping" style={{ animationDuration: '2.5s' }} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-bear shadow-[0_0_6px_#FF3B69]" />
            {totalActiveCount > 0 && (
              <span className="absolute -bottom-1.5 -left-1 bg-bear text-white text-[8px] font-black px-1 rounded-full shadow-sm">
                {totalActiveCount}
              </span>
            )}
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

            {totalActiveCount > 0 && (
              <span className="mt-1 px-1.5 py-0.2 rounded-full bg-bear text-white font-black text-[9px] shadow-[0_0_8px_rgba(255,59,105,0.8)]">
                {totalActiveCount}
              </span>
            )}
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
          3. SLIDE-OUT DRAWER PANEL (Right Side Window with List View)
         ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 right-0 sm:top-14 sm:bottom-10 w-full sm:w-[420px] md:w-[460px] max-w-full bg-terminal-bg/98 backdrop-blur-2xl sm:border-l sm:border-t sm:border-b sm:border-terminal-border z-50 shadow-[0_0_60px_rgba(0,0,0,0.85)] sm:rounded-l-3xl flex flex-col font-mono transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 opacity-100 visible pointer-events-auto' : 'translate-x-full opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-terminal-border bg-terminal-panel/90 sm:rounded-tl-3xl flex flex-col gap-2 relative shrink-0">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-32 h-20 bg-bear/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-1.5 h-5 rounded-full bg-bear shadow-[0_0_8px_#FF3B69] shrink-0" />
              <div className="p-1.5 rounded-lg bg-bear/15 text-bear border border-bear/30 shadow-[0_0_10px_rgba(255,59,105,0.3)] shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(255,59,105,0.4)] flex items-center gap-1.5">
                  <span>FLASH SURGE RADAR</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-bear/20 text-bear border border-bear/40">
                    60+ SCORE
                  </span>
                </h2>
                <span className="text-[9px] sm:text-[10px] text-terminal-muted block">
                  Institutional Momentum & Scalping Signals
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

          {/* Asset Category Filters Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-thin pt-1 pb-0.5">
            <button
              onClick={() => setAssetFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition shrink-0 ${
                assetFilter === 'ALL'
                  ? 'bg-bear text-white shadow-[0_0_10px_rgba(255,59,105,0.6)]'
                  : 'bg-terminal-card text-terminal-muted border border-terminal-border hover:text-terminal-text'
              }`}
            >
              ALL ({totalActiveCount})
            </button>
            {['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'].map((sym) => {
              const count = recentSurges.filter(s => s.indexSymbol === sym && (s.surgeScore ?? 0) >= 60).length;
              return (
                <button
                  key={sym}
                  onClick={() => setAssetFilter(sym)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition shrink-0 ${
                    assetFilter === sym
                      ? 'bg-bear text-white shadow-[0_0_10px_rgba(255,59,105,0.6)]'
                      : 'bg-terminal-card text-terminal-muted border border-terminal-border hover:text-terminal-text'
                  }`}
                >
                  {sym} {count > 0 && <span className="opacity-80">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* List View of Active Surges (Ordered by Latest First) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin">
          {activeScore60Surges.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 font-mono">
              <div className="p-3 rounded-2xl bg-terminal-panel border border-terminal-border text-terminal-muted">
                <AlertOctagon className="w-8 h-8 opacity-40 animate-pulse" />
              </div>
              <div className="text-xs font-bold text-terminal-muted uppercase tracking-wider">
                No Active 60+ Score Surges
              </div>
              <p className="text-[11px] text-terminal-muted/70 max-w-xs leading-relaxed">
                The institutional momentum engine is actively scanning. High-conviction flow with score ≥ 60 will list here instantly in real time.
              </p>
            </div>
          ) : (
            activeScore60Surges.map((surge) => {
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
              const maxWindowMinutes = surge.validUntilMinutes || (surge.surgeLevel === 'EXTREME' ? 10 : 15);
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
                  className="rounded-2xl border-2 border-terminal-border hover:border-bear/70 bg-terminal-card/90 p-3.5 sm:p-4 transition-all duration-200 relative overflow-hidden shadow-sm hover:shadow-[0_0_25px_rgba(255,59,105,0.25)] flex flex-col space-y-2.5"
                >
                  {/* Fading Timeline Progress Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-terminal-bg">
                    <div
                      className="h-full bg-gradient-to-r from-bear via-amber to-bull transition-all duration-1000 ease-linear"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Header Row: Score Badge + Timestamp + Countdown */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-bear text-white shadow-[0_0_10px_rgba(255,59,105,0.7)] flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> Score {surge.surgeScore}/100
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isBullAction ? 'bg-bull/20 text-bull border border-bull/40' : 'bg-bear/20 text-bear border border-bear/40'}`}>
                        {surge.actionTitle}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-terminal-panel border border-terminal-border text-accent-cyan font-bold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatISTTime(surge.timestamp, { showSeconds: false })}</span>
                        <span className="text-[9px] text-terminal-muted">({relTimeStr})</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-bear/15 border border-bear/40 text-bear font-bold">
                        ⏳ {formattedCountdown}
                      </span>
                    </div>
                  </div>

                  {/* Strike & Asset Title */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-white tracking-wide">
                        {surge.indexSymbol} <span className={isCall ? 'text-bull' : 'text-bear'}>{surge.strikePrice} {surge.optionType}</span>
                      </h3>
                      <span className="text-[10px] text-terminal-muted block">
                        {surge.actionDescription}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedIndex(surge.indexSymbol);
                      }}
                      className="px-2 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-bg border border-terminal-border text-accent-cyan text-[10px] font-bold flex items-center gap-1 transition shrink-0"
                      title="Focus on this asset chart and option chain"
                    >
                      <span>Focus</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 4-Box High-Visibility Trade Matrix */}
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                    {/* Live LTP */}
                    <div className="p-1.5 rounded-xl bg-amber/15 border border-amber/50 shadow-sm">
                      <span className="text-[8px] text-amber block font-bold uppercase">LIVE LTP</span>
                      <span className="font-black text-xs sm:text-sm text-amber block tabular-nums mt-0.5">
                        ₹{currentOptionLtp.toFixed(2)}
                      </span>
                    </div>

                    {/* Entry Zone */}
                    <div className="p-1.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/40">
                      <span className="text-[8px] text-accent-cyan block font-bold uppercase">ENTRY ZONE</span>
                      <span className="font-bold text-[10px] sm:text-xs text-terminal-text block truncate mt-0.5" title={contract?.recommendedEntry}>
                        {contract?.recommendedEntry || '—'}
                      </span>
                    </div>

                    {/* Stop Loss */}
                    <div className="p-1.5 rounded-xl bg-bear/15 border border-bear/50">
                      <span className="text-[8px] text-bear block font-bold uppercase flex items-center justify-center gap-0.5">
                        <ShieldAlert className="w-2.5 h-2.5" /> SL
                      </span>
                      <span className="font-bold text-[11px] sm:text-sm text-bear block mt-0.5">
                        {contract?.stoploss || '—'}
                      </span>
                    </div>

                    {/* Target */}
                    <div className="p-1.5 rounded-xl bg-bull/15 border border-bull/50">
                      <span className="text-[8px] text-bull block font-bold uppercase flex items-center justify-center gap-0.5">
                        <Target className="w-2.5 h-2.5" /> TARGET
                      </span>
                      <span className="font-bold text-[11px] sm:text-sm text-bull block mt-0.5">
                        {contract?.target || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Footer Metrics */}
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                    <span>⚡ OI Surge: <strong className="text-terminal-text">{surge.oiChange1mFormatted}</strong></span>
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
          <span>⚡ Auto-refreshing institutional flow</span>
          <span>Score threshold: <strong className="text-bear">60+</strong></span>
        </div>
      </aside>
    </>
  );
};

export default SurgeAlertBanner;
