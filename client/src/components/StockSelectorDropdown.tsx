import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMarket } from '../context/MarketContext';
import { ALL_SYMBOLS_CONFIG } from '../types';
import type { SymbolConfig } from '../types';
import { McxOfflineModal } from './McxOfflineModal';
import { 
  Search, 
  ChevronDown, 
  Layers, 
  Check, 
  Sparkles, 
  BarChart3, 
  X,
  Flame,
  Coins,
  Droplets,
  WifiOff
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function checkMcxOpen(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/mcx-status`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return false;
    const d = await res.json();
    return !!d.isOpen;
  } catch {
    // Fallback: compute client-side from IST time
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + 3600000 * 5.5);
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;
    const min = ist.getHours() * 60 + ist.getMinutes();
    return min >= 9 * 60 && min < 23 * 60 + 30;
  }
}

export const StockSelectorDropdown: React.FC = () => {
  const { selectedIndex, setSelectedIndex, indices, visibleIndices, toggleIndexVisibility } = useMarket();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'INDICES' | 'COMMODITIES' | 'NIFTY50_STOCKS'>('ALL');

  // MCX offline modal state
  const [offlineSymbol, setOfflineSymbol] = useState<string | null>(null);
  const [checkingMcx, setCheckingMcx] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentConfig = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedIndex) || {
    symbol: selectedIndex,
    name: selectedIndex,
    category: 'INDICES',
    step: 50,
    lot: 75,
    defaultRange: 200,
    fyersSymbol: '',
    isIndex: true,
    exchange: 'NSE'
  };

  const indicesCount = ALL_SYMBOLS_CONFIG.filter(s => s.category === 'INDICES').length;
  const commodityCount = ALL_SYMBOLS_CONFIG.filter(s => s.category === 'COMMODITIES').length;
  const stocksCount = ALL_SYMBOLS_CONFIG.filter(s => s.category === 'NIFTY50_STOCKS').length;

  const filteredSymbols = ALL_SYMBOLS_CONFIG.filter((item: SymbolConfig) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSelect = useCallback(async (symbol: string) => {
    const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
    const isCommodity = cfg?.category === 'COMMODITIES' || cfg?.exchange === 'MCX';

    // For MCX commodities: check if market is open before proceeding
    if (isCommodity) {
      setCheckingMcx(true);
      const isOpen = await checkMcxOpen();
      setCheckingMcx(false);

      if (!isOpen) {
        // Market is closed — show offline data modal instead of loading option chain
        setOfflineSymbol(symbol);
        setIsOpen(false);
        setSearchQuery('');
        return;
      }
    }

    setSelectedIndex(symbol);
    setIsOpen(false);
    setSearchQuery('');
  }, [setSelectedIndex]);

  const handleOfflineProceed = useCallback(() => {
    // User clicked "View Option Chain (Offline Data)" — load it anyway
    if (offlineSymbol) {
      setSelectedIndex(offlineSymbol);
    }
    setOfflineSymbol(null);
  }, [offlineSymbol, setSelectedIndex]);

  const getSymbolIcon = (item: SymbolConfig) => {
    if (item.category === 'COMMODITIES') {
      if (item.symbol === 'CRUDEOIL') return <Droplets className="w-3.5 h-3.5 text-amber" />;
      if (item.symbol === 'NATURALGAS') return <Flame className="w-3.5 h-3.5 text-accent-cyan" />;
      if (item.symbol === 'GOLD' || item.symbol === 'SILVER') return <Coins className="w-3.5 h-3.5 text-amber" />;
      return <Flame className="w-3.5 h-3.5 text-amber" />;
    }
    if (item.isIndex) return <Layers className="w-3.5 h-3.5 text-accent-cyan" />;
    return <BarChart3 className="w-3.5 h-3.5 text-bull" />;
  };

  return (
    <div className="relative font-mono" ref={dropdownRef}>
      {/* One-Liner Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-terminal-card via-terminal-panel to-terminal-card border border-accent-cyan/50 hover:border-accent-cyan transition shadow-sm text-left group shrink-0"
        title="Click to select Asset (Nifty, BankNifty, Sensex, MCX Commodities, Nifty 50 Stocks)"
      >
        <span className="text-[10px] sm:text-xs font-bold text-accent-cyan flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
          <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent-cyan shrink-0" />
          <span className="hidden xs:inline sm:hidden">ASSET:</span>
          <span className="hidden sm:inline">Select ASSET:</span>
          <strong className="text-terminal-text font-black px-1 sm:px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 text-[10px] sm:text-xs">
            {currentConfig.symbol}
          </strong>
        </span>
        <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-terminal-muted transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent-cyan' : ''}`} />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute left-3 sm:left-0 top-14 sm:top-full mt-1 w-[calc(100vw-24px)] sm:w-[440px] max-h-[480px] bg-terminal-card border-2 border-accent-cyan/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
          {/* Header & Search Bar */}
          <div className="p-3 border-b border-terminal-border bg-terminal-panel space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-terminal-text uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                <span>SELECT ASSET (INDEX / COMMODITY / STOCK)</span>
              </span>
              <span className="text-[10px] text-terminal-muted">
                {filteredSymbols.length} Available
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-terminal-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol (e.g. CRUDEOIL, GOLD, NIFTY, TCS...)"
                className="w-full bg-terminal-bg border border-terminal-border rounded-xl pl-9 pr-8 py-2 text-terminal-text text-xs focus:outline-none focus:border-accent-cyan transition shadow-inner font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-terminal-bg p-0.5 border border-terminal-border text-[10px]">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`py-1 rounded font-bold transition text-center ${
                  categoryFilter === 'ALL'
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-sm'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                All ({ALL_SYMBOLS_CONFIG.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('INDICES')}
                className={`py-1 rounded font-bold transition text-center ${
                  categoryFilter === 'INDICES'
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-sm'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                ⚡ Indices ({indicesCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('COMMODITIES')}
                className={`py-1 rounded font-bold transition text-center ${
                  categoryFilter === 'COMMODITIES'
                    ? 'bg-amber/25 text-amber border border-amber/50 shadow-sm font-black'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                🛢️ MCX ({commodityCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('NIFTY50_STOCKS')}
                className={`py-1 rounded font-bold transition text-center ${
                  categoryFilter === 'NIFTY50_STOCKS'
                    ? 'bg-bull/20 text-bull border border-bull/40 shadow-sm'
                    : 'text-terminal-muted hover:text-terminal-text'
                }`}
              >
                📈 Stocks ({stocksCount})
              </button>
            </div>
          </div>

          {/* Scrollable Symbol List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y-0 max-h-[320px]">
            {filteredSymbols.length === 0 ? (
              <div className="py-8 text-center text-terminal-muted">
                <p>No symbols match "{searchQuery}"</p>
              </div>
            ) : (
              filteredSymbols.map((item: SymbolConfig) => {
                const isSelected = selectedIndex === item.symbol;
                const state = indices[item.symbol];

                return (
                  <div key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-accent-cyan/15 border-accent-cyan text-terminal-text shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                        : item.category === 'COMMODITIES'
                        ? 'bg-terminal-bg/60 border-transparent hover:border-amber/40 hover:bg-amber/5'
                        : 'bg-terminal-bg/60 border-transparent hover:border-terminal-border hover:bg-terminal-panel'
                    } ${checkingMcx && item.symbol === selectedIndex ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-1.5 rounded-lg border ${
                        item.category === 'COMMODITIES'
                          ? 'bg-amber/10 text-amber border-amber/30'
                          : item.isIndex 
                          ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30' 
                          : 'bg-bull/10 text-bull border-bull/30'
                      }`}>
                        {getSymbolIcon(item)}
                      </div>

                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-black text-xs sm:text-sm ${isSelected ? 'text-accent-cyan' : 'text-terminal-text'}`}>
                            {item.symbol}
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-terminal-panel border border-terminal-border text-terminal-muted font-semibold">
                            Lot {item.lot} • Step ₹{item.step}
                          </span>
                          {/* MCX offline badge — shown only for commodities */}
                          {item.category === 'COMMODITIES' && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-amber/10 border border-amber/30 text-amber font-bold flex items-center gap-0.5">
                              <WifiOff className="w-2 h-2" />
                              MCX
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-terminal-muted truncate max-w-[160px] sm:max-w-[200px]">
                          {item.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {state ? (
                        <div className="text-right">
                          <span className="font-bold text-xs text-terminal-text block">
                            ₹{state.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[10px] font-bold ${state.change >= 0 ? 'text-bull' : 'text-bear'}`}>
                            {state.change >= 0 ? '+' : ''}{state.pctChange.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-terminal-muted italic">
                          Click to stream
                        </span>
                      )}

                      {/* Visible/Pinned Indicator toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleIndexVisibility(item.symbol);
                        }}
                        className={`p-1.5 rounded-lg border transition ${
                          visibleIndices.includes(item.symbol)
                            ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
                            : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                        }`}
                        title={visibleIndices.includes(item.symbol) ? 'Pinned to top dashboard bar' : 'Pin to top dashboard bar'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2 border-t border-terminal-border bg-terminal-panel/40 flex items-center justify-between text-[10px] text-terminal-muted">
            <span>Tip: Click checkmark to Pin/Unpin symbol to top bar</span>
            <span className="font-bold text-accent-cyan">Active: {selectedIndex}</span>
          </div>
        </div>
      )}

      {/* MCX Market Offline Modal — shown when commodity is clicked while MCX is closed */}
      {offlineSymbol && (
        <McxOfflineModal
          symbol={offlineSymbol}
          onClose={() => setOfflineSymbol(null)}
          onProceedAnyway={handleOfflineProceed}
        />
      )}
    </div>
  );
};
