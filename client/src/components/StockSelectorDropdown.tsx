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
  BarChart2, 
  BarChart3, 
  X,
  Flame,
  Coins,
  Droplets,
  WifiOff,
  Link2,
  MoreVertical
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function checkMcxOpen(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/mcx-status`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return false;
    const d = await res.json();
    return !!d.isOpen;
  } catch {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + 3600000 * 5.5);
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;
    const min = ist.getHours() * 60 + ist.getMinutes();
    return min >= 9 * 60 && min < 23 * 60 + 30;
  }
}

export const getPrettyIndexName = (item: SymbolConfig): string => {
  if (item.symbol === 'NIFTY') return 'NIFTY50 Index';
  if (item.symbol === 'BANKNIFTY') return 'NIFTYBANK Index';
  if (item.symbol === 'SENSEX') return 'SENSEX Index';
  if (item.symbol === 'BANKEX') return 'BANKEX Index';
  if (item.symbol === 'FINNIFTY') return 'FINNIFTY Index';
  if (item.symbol === 'NIFTYNXT50') return 'NIFTYNXT50 Index';
  if (item.symbol === 'MIDCPNIFTY') return 'MIDCPNIFTY Index';
  if (item.symbol === 'INDIA_VIX') return 'INDIAVIX Index';
  return item.name || item.symbol;
};

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
    lot: 65,
    defaultRange: 200,
    fyersSymbol: '',
    isIndex: true,
    exchange: 'NSE'
  };

  const currentState = indices[selectedIndex];
  const isPositive = (currentState?.change || 0) >= 0;

  const indicesCount = ALL_SYMBOLS_CONFIG.filter(s => s.category === 'INDICES').length;
  const commodityCount = ALL_SYMBOLS_CONFIG.filter(s => s.category === 'COMMODITIES').length;
  const stocksCount = ALL_SYMBOLS_CONFIG.filter(s => s.category === 'NIFTY50_STOCKS').length;

  const filteredSymbols = ALL_SYMBOLS_CONFIG.filter((item: SymbolConfig) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        getPrettyIndexName(item).toLowerCase().includes(q)
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
    if (offlineSymbol) {
      setSelectedIndex(offlineSymbol);
    }
    setOfflineSymbol(null);
  }, [offlineSymbol, setSelectedIndex]);

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Header Bar Watchlist-Style Asset Selection Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-terminal-panel/80 transition text-left cursor-pointer shrink-0 border border-transparent hover:border-slate-200 dark:hover:border-terminal-border"
        title="Click to select Asset / Index"
      >
        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-terminal-text tracking-tight whitespace-nowrap">
          {getPrettyIndexName(currentConfig)}
        </span>

        {currentState && (
          <div className="flex items-center space-x-1 sm:space-x-1.5 text-xs sm:text-sm whitespace-nowrap font-mono font-bold">
            <span className="text-slate-900 dark:text-terminal-text font-bold">
              {currentState.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={isPositive ? 'text-emerald-600 dark:text-bull' : 'text-red-500 dark:text-bear'}>
              {isPositive ? '+' : ''}{currentState.change.toFixed(2)} ({isPositive ? '+' : ''}{currentState.pctChange.toFixed(2)}%)
            </span>
          </div>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-terminal-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-sky-500 dark:text-accent-cyan' : ''}`} />
      </button>

      {/* Popover Watchlist Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute left-2 sm:left-0 top-12 sm:top-full mt-1 w-[calc(100vw-16px)] sm:w-[480px] max-h-[520px] bg-white dark:bg-terminal-card border border-slate-200 dark:border-terminal-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
          {/* Header & Search Input */}
          <div className="p-3 border-b border-slate-200 dark:border-terminal-border bg-slate-50 dark:bg-terminal-panel space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-terminal-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol (e.g. NIFTY, SENSEX, CRUDEOIL, RELIANCE...)"
                className="w-full bg-white dark:bg-terminal-bg border border-slate-200 dark:border-terminal-border rounded-xl pl-9 pr-8 py-1.5 text-slate-800 dark:text-terminal-text text-xs focus:outline-none focus:border-sky-500 dark:focus:border-accent-cyan transition shadow-inner font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-terminal-muted hover:text-slate-700 dark:hover:text-terminal-text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-200/70 dark:bg-terminal-bg p-0.5 text-[10px] font-mono font-bold">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`py-1 rounded transition text-center ${
                  categoryFilter === 'ALL'
                    ? 'bg-white dark:bg-accent-cyan/20 text-slate-900 dark:text-accent-cyan shadow-sm'
                    : 'text-slate-500 dark:text-terminal-muted hover:text-slate-900 dark:hover:text-terminal-text'
                }`}
              >
                All ({ALL_SYMBOLS_CONFIG.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('INDICES')}
                className={`py-1 rounded transition text-center ${
                  categoryFilter === 'INDICES'
                    ? 'bg-white dark:bg-accent-cyan/20 text-slate-900 dark:text-accent-cyan shadow-sm'
                    : 'text-slate-500 dark:text-terminal-muted hover:text-slate-900 dark:hover:text-terminal-text'
                }`}
              >
                ⚡ Indices ({indicesCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('COMMODITIES')}
                className={`py-1 rounded transition text-center ${
                  categoryFilter === 'COMMODITIES'
                    ? 'bg-white dark:bg-amber/25 text-amber-700 dark:text-amber shadow-sm font-black'
                    : 'text-slate-500 dark:text-terminal-muted hover:text-slate-900 dark:hover:text-terminal-text'
                }`}
              >
                🛢️ MCX ({commodityCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('NIFTY50_STOCKS')}
                className={`py-1 rounded transition text-center ${
                  categoryFilter === 'NIFTY50_STOCKS'
                    ? 'bg-white dark:bg-bull/20 text-emerald-700 dark:text-bull shadow-sm'
                    : 'text-slate-500 dark:text-terminal-muted hover:text-slate-900 dark:hover:text-terminal-text'
                }`}
              >
                📈 Stocks ({stocksCount})
              </button>
            </div>
          </div>

          {/* Watchlist Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-terminal-border/40 max-h-[360px]">
            {filteredSymbols.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-terminal-muted">
                <p>No symbols match "{searchQuery}"</p>
              </div>
            ) : (
              filteredSymbols.map((item: SymbolConfig) => {
                const isSelected = selectedIndex === item.symbol;
                const state = indices[item.symbol];
                const isItemPositive = (state?.change || 0) >= 0;

                return (
                  <div
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    className={`group flex items-center justify-between px-3.5 py-2.5 transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-accent-cyan/15'
                        : 'hover:bg-slate-50 dark:hover:bg-terminal-panel'
                    } ${checkingMcx && item.symbol === selectedIndex ? 'opacity-70' : ''}`}
                  >
                    {/* Left: Asset Name */}
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`font-semibold text-xs sm:text-[13px] truncate ${
                        isSelected 
                          ? 'text-sky-600 dark:text-accent-cyan font-bold' 
                          : 'text-slate-800 dark:text-terminal-text'
                      }`}>
                        {getPrettyIndexName(item)}
                      </span>
                      {item.category === 'COMMODITIES' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 dark:bg-amber/10 border border-amber-200 dark:border-amber/30 text-amber-700 dark:text-amber font-bold shrink-0">
                          MCX
                        </span>
                      )}
                    </div>

                    {/* Right: Live Price & Delta + Pin Action */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {state ? (
                        <div className="flex items-center space-x-2 font-mono text-xs whitespace-nowrap text-right">
                          <span className="font-semibold text-slate-900 dark:text-terminal-text">
                            {state.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`font-bold ${isItemPositive ? 'text-emerald-600 dark:text-bull' : 'text-red-500 dark:text-bear'}`}>
                            {isItemPositive ? '+' : ''}{state.change.toFixed(2)} ({isItemPositive ? '+' : ''}{state.pctChange.toFixed(2)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-terminal-muted italic font-mono">
                          Click to load
                        </span>
                      )}

                      {/* Pin to Top Bar Action */}
                      <div className="flex items-center pl-1 text-slate-400 dark:text-terminal-muted">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleIndexVisibility(item.symbol);
                          }}
                          className="p-1 rounded border border-slate-200 dark:border-terminal-border/60 hover:bg-slate-100 dark:hover:bg-terminal-border text-slate-500 dark:text-terminal-muted hover:text-slate-800 dark:hover:text-terminal-text"
                          title={visibleIndices.includes(item.symbol) ? 'Pinned to top dashboard bar' : 'Pin to top dashboard bar'}
                        >
                          {visibleIndices.includes(item.symbol) ? (
                            <Check className="w-3 h-3 text-sky-500 dark:text-accent-cyan" />
                          ) : (
                            <Layers className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 border-t border-slate-200 dark:border-terminal-border bg-slate-50 dark:bg-terminal-panel/60 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-terminal-muted">
            <span>Fyers API Live Streaming Feed</span>
            <span className="font-bold text-sky-600 dark:text-accent-cyan">Active: {selectedIndex}</span>
          </div>
        </div>
      )}

      {/* MCX Market Offline Modal */}
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

export default StockSelectorDropdown;
