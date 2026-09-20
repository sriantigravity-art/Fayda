import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWatchlist, type WatchlistItem } from '../../context/WatchlistContext';
import { useMarket } from '../../context/MarketContext';
import { useTheme } from '../../context/ThemeContext';
import { ALL_SYMBOLS_CONFIG } from '../../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Search, 
  ExternalLink, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Check, 
  FolderPlus,
  SlidersHorizontal,
  Flame,
  Zap,
  ArrowRight,
  Maximize2,
  Minimize2,
  PanelRight
} from 'lucide-react';

export const WatchlistDrawerModal: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { 
    watchlists, 
    activeWatchlistId, 
    activeWatchlist, 
    setActiveWatchlistId, 
    createWatchlist, 
    deleteWatchlist, 
    addItemToWatchlist, 
    removeItemFromWatchlist,
    isWatchlistDrawerOpen,
    setIsWatchlistDrawerOpen 
  } = useWatchlist();

  const { 
    selectedIndex, 
    setSelectedIndex, 
    indices, 
    openStrikeChartModal,
    currentIndexState 
  } = useMarket();

  // View presentation mode: MODAL (centered spacious desktop dialog) vs DRAWER (side dock)
  const [viewMode, setViewMode] = useState<'MODAL' | 'DRAWER'>('MODAL');

  // Search & add item states
  const [activeTab, setActiveTab] = useState<'LIST' | 'ADD_SEARCH' | 'ADD_STRIKE'>('LIST');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newWatchlistName, setNewWatchlistName] = useState<string>('');
  const [isCreatingWl, setIsCreatingWl] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWatchlistDrawerOpen) {
        setIsWatchlistDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWatchlistDrawerOpen, setIsWatchlistDrawerOpen]);

  // Strike Option Builder states
  const [strikeUnderlying, setStrikeUnderlying] = useState<string>('NIFTY');
  const [customStrikePrice, setCustomStrikePrice] = useState<number>(23500);
  const [customOptionType, setCustomOptionType] = useState<'CE' | 'PE'>('CE');
  const [customExpiry, setCustomExpiry] = useState<string>('Current Weekly');

  if (!isWatchlistDrawerOpen) return null;

  // Filter available symbols for quick add
  const filteredSymbols = ALL_SYMBOLS_CONFIG.filter(cfg => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return cfg.symbol.toLowerCase().includes(q) || cfg.name.toLowerCase().includes(q) || cfg.category.toLowerCase().includes(q);
  }).slice(0, 18);

  const handleSelectWatchlistItem = (item: WatchlistItem) => {
    if (item.type === 'OPTION_STRIKE') {
      const parentSymbol = item.symbol.split(' ')[0] || selectedIndex;
      const strike = item.strikePrice || 23500;
      const optType = item.optionType || 'CE';
      
      // Dispatch live workbench event
      window.dispatchEvent(new CustomEvent('fayda:select-strike-chart', {
        detail: { symbol: parentSymbol, strikePrice: strike, optionType: optType }
      }));

      // Scroll to live workbench
      const workbenchEl = document.getElementById('strike-live-workbench');
      if (workbenchEl) {
        workbenchEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        workbenchEl.classList.add('ring-4', 'ring-sky-500/80', 'transition-all', 'duration-500');
        setTimeout(() => workbenchEl.classList.remove('ring-4', 'ring-sky-500/80'), 3000);
      }
      setIsWatchlistDrawerOpen(false);
    } else {
      // Index, Stock or Commodity
      setSelectedIndex(item.symbol as any);
      setIsWatchlistDrawerOpen(false);
    }
  };

  const handleCreateNewWatchlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    createWatchlist(newWatchlistName.trim());
    setNewWatchlistName('');
    setIsCreatingWl(false);
  };

  const handleAddSymbolItem = (cfg: typeof ALL_SYMBOLS_CONFIG[0]) => {
    let type: WatchlistItem['type'] = 'STOCK';
    if (cfg.category === 'INDICES') type = 'INDEX';
    else if (cfg.category === 'COMMODITIES') type = 'COMMODITY';

    addItemToWatchlist(activeWatchlistId, {
      symbol: cfg.symbol,
      displayName: cfg.name,
      type,
      exchange: (cfg.exchange as any) || 'NSE',
      lotSize: cfg.lot
    });
    setActiveTab('LIST');
  };

  const handleAddStrikeItem = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedSymbol = `${strikeUnderlying} ${customStrikePrice} ${customOptionType}`;
    const displayName = `${strikeUnderlying} ${customStrikePrice} ${customOptionType === 'CE' ? 'CALL' : 'PUT'}`;
    const cfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === strikeUnderlying);

    addItemToWatchlist(activeWatchlistId, {
      symbol: formattedSymbol,
      displayName,
      type: 'OPTION_STRIKE',
      exchange: (cfg?.exchange as any) || 'NSE',
      strikePrice: Number(customStrikePrice),
      optionType: customOptionType,
      expiryDate: customExpiry,
      lotSize: cfg?.lot || 50
    });
    setActiveTab('LIST');
  };

  // Helper to get simulated or live price for any item
  const getItemPrice = (item: WatchlistItem) => {
    const liveIndex = (indices as Record<string, any>)?.[item.symbol];
    if (liveIndex?.spotPrice) {
      return {
        price: Number(liveIndex.spotPrice) || 0,
        change: Number(liveIndex.change) || 0,
        pct: Number(liveIndex.pctChange) || 0
      };
    }
    if (item.symbol === selectedIndex && currentIndexState?.spotPrice) {
      return {
        price: Number(currentIndexState.spotPrice) || 0,
        change: Number(currentIndexState.change) || 0,
        pct: Number(currentIndexState.pctChange) || 0
      };
    }
    if (item.type === 'OPTION_STRIKE') {
      const baseLtp = item.optionType === 'CE' ? 142.50 : 118.20;
      return { price: baseLtp, change: 8.40, pct: 6.2 };
    }
    return { price: 1250.00, change: 12.50, pct: 1.01 };
  };

  return createPortal(
    <div 
      onClick={() => setIsWatchlistDrawerOpen(false)}
      className={`fixed inset-0 z-[9999] transition-all duration-300 font-mono ${
        viewMode === 'MODAL'
          ? 'flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/75 backdrop-blur-md animate-fade-in'
          : 'flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in'
      }`}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-terminal-card border border-terminal-border shadow-2xl flex flex-col justify-between overflow-hidden text-terminal-text transition-all duration-300 ${
          viewMode === 'MODAL'
            ? 'w-full max-w-5xl h-[88vh] max-h-[920px] rounded-2xl'
            : 'w-full max-w-2xl h-full border-l'
        }`}
      >
        {/* Drawer / Modal Header */}
        <div className="p-4 border-b border-terminal-border flex items-center justify-between bg-terminal-panel/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-terminal-text flex items-center gap-2">
                <span>MULTI-ASSET WATCHLIST MANAGER</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold">
                  {watchlists.length} WATCHLISTS
                </span>
              </h3>
              <p className="text-[11px] text-terminal-muted">
                Indices, Stocks, Option Strikes & MCX Commodities
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* View Mode Toggle: Centered Modal vs Side Panel */}
            <button
              type="button"
              onClick={() => setViewMode(prev => prev === 'MODAL' ? 'DRAWER' : 'MODAL')}
              className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated transition cursor-pointer flex items-center gap-1 text-xs"
              title={viewMode === 'MODAL' ? "Dock to Side Panel" : "Expand to Centered Desktop View"}
            >
              {viewMode === 'MODAL' ? (
                <>
                  <PanelRight className="w-4 h-4" />
                  <span className="hidden sm:inline text-[10px]">Side Panel</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline text-[10px]">Expand View</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsWatchlistDrawerOpen(false)}
              className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Watchlist Selection Strip & Controls */}
        <div className="p-3 border-b border-terminal-border bg-terminal-panel/40 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-terminal-muted uppercase tracking-wider">
              Selected Watchlist:
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsCreatingWl(prev => !prev)}
                className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ New Watchlist</span>
              </button>
              {!activeWatchlist.isDefault && (
                <button
                  type="button"
                  onClick={() => deleteWatchlist(activeWatchlistId)}
                  className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition"
                  title="Delete this watchlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* New Watchlist Inline Input Form */}
          {isCreatingWl && (
            <form onSubmit={handleCreateNewWatchlist} className="flex items-center gap-2 p-2 rounded-xl bg-terminal-elevated border border-sky-500/40 animate-fade-in">
              <input
                type="text"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                placeholder="e.g. My BankNifty Strikes, Tech Stocks..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-terminal-panel text-terminal-text text-xs border border-terminal-border focus:outline-none focus:border-sky-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newWatchlistName.trim()}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs disabled:opacity-50 transition cursor-pointer"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingWl(false)}
                className="px-2 py-1.5 text-xs text-terminal-muted hover:text-terminal-text cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Watchlist Tabs Strip - Wrapped so tabs are never cut off */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {watchlists.map(wl => {
              const isActive = wl.id === activeWatchlistId;
              return (
                <button
                  key={wl.id}
                  type="button"
                  onClick={() => {
                    setActiveWatchlistId(wl.id);
                    setActiveTab('LIST');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                      : 'bg-terminal-panel text-terminal-muted hover:text-terminal-text hover:bg-terminal-elevated border border-terminal-border'
                  }`}
                >
                  <span>{wl.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-terminal-elevated text-terminal-text'
                  }`}>
                    {wl.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Bar (View List, Add Stocks/Commodities, Add Option Strike) */}
        <div className="px-4 py-2 bg-terminal-panel/50 border-b border-terminal-border flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('LIST')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'LIST'
                  ? 'bg-terminal-elevated text-terminal-text shadow-xs'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              Watchlist Items ({activeWatchlist.items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ADD_SEARCH')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'ADD_SEARCH'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stock / Index</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ADD_STRIKE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'ADD_STRIKE'
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/40'
                  : 'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Add Option Strike</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* TAB 1: LIST ACTIVE ITEMS */}
          {activeTab === 'LIST' && (
            <div>
              {activeWatchlist.items.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-terminal-border space-y-3">
                  <Layers className="w-8 h-8 text-terminal-muted mx-auto opacity-60" />
                  <div className="text-sm font-bold text-terminal-text">Watchlist is Empty</div>
                  <p className="text-xs text-terminal-muted max-w-sm mx-auto">
                    Add stocks, commodities, or live option strikes to this watchlist for one-click tracking.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('ADD_SEARCH')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold border border-emerald-500/40 transition cursor-pointer"
                    >
                      + Add Stock / Commodity
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ADD_STRIKE')}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-bold border border-purple-500/40 transition cursor-pointer"
                    >
                      + Add Option Strike
                    </button>
                  </div>
                </div>
              ) : (
                <div className={viewMode === 'MODAL' ? "grid grid-cols-1 md:grid-cols-2 gap-2.5" : "space-y-2"}>
                  {activeWatchlist.items.map(item => {
                    const priceData = getItemPrice(item);
                    const isProfit = priceData.change >= 0;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-terminal-panel/70 hover:bg-terminal-elevated border border-terminal-border transition flex items-center justify-between gap-3 group shadow-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-terminal-text truncate">
                              {item.symbol}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              item.type === 'OPTION_STRIKE' 
                                ? (item.optionType === 'CE' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400')
                                : item.type === 'COMMODITY'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                : item.type === 'INDEX'
                                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
                                : 'bg-terminal-elevated text-terminal-muted'
                            }`}>
                              {item.type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-terminal-muted font-mono">
                              {item.exchange}
                            </span>
                          </div>
                          <div className="text-[11px] text-terminal-muted truncate mt-0.5">
                            {item.displayName}
                          </div>
                        </div>

                        {/* Price & Action */}
                        <div className="flex items-center space-x-3 shrink-0">
                          <div className="text-right font-mono">
                            <div className="text-xs font-bold text-terminal-text">
                              ₹{priceData.price.toFixed(2)}
                            </div>
                            <div className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${
                              isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              <span>{isProfit ? '+' : ''}{priceData.pct.toFixed(2)}%</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectWatchlistItem(item)}
                            className="p-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 transition cursor-pointer"
                            title="Open in Terminal Live Chart"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeItemFromWatchlist(activeWatchlistId, item.id)}
                            className="p-2 rounded-lg text-terminal-muted hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100"
                            title="Remove from watchlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH & ADD STOCKS / INDICES / COMMODITIES */}
          {activeTab === 'ADD_SEARCH' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-terminal-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Nifty 50 stocks, Indices, MCX Commodities..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-terminal-panel text-terminal-text text-xs border border-terminal-border focus:outline-none focus:border-sky-500 placeholder:text-terminal-muted"
                  autoFocus
                />
              </div>

              <div className={viewMode === 'MODAL' ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "space-y-1.5"}>
                {filteredSymbols.map(cfg => {
                  const alreadyAdded = activeWatchlist.items.some(i => i.symbol === cfg.symbol);
                  return (
                    <div 
                      key={cfg.symbol}
                      className="p-2.5 rounded-lg bg-terminal-panel/50 hover:bg-terminal-elevated border border-terminal-border flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-terminal-text flex items-center gap-2">
                          <span>{cfg.symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-terminal-elevated text-terminal-muted">
                            {cfg.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-terminal-muted">{cfg.name}</div>
                      </div>

                      {alreadyAdded ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddSymbolItem(cfg)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: QUICK STRIKE OPTION BUILDER */}
          {activeTab === 'ADD_STRIKE' && (
            <form onSubmit={handleAddStrikeItem} className="p-4 rounded-xl bg-terminal-panel/60 border border-terminal-border space-y-3">
              <div className="text-xs font-bold text-terminal-text flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span>Build Custom Option Strike Contract</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] text-terminal-muted">Underlying Index / Stock:</label>
                <select
                  value={strikeUnderlying}
                  onChange={(e) => setStrikeUnderlying(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-terminal-card text-terminal-text text-xs border border-terminal-border focus:outline-none focus:border-purple-500"
                >
                  <option value="NIFTY">NIFTY 50</option>
                  <option value="BANKNIFTY">BANK NIFTY</option>
                  <option value="FINNIFTY">FIN NIFTY</option>
                  <option value="MIDCPNIFTY">MIDCAP NIFTY</option>
                  <option value="RELIANCE">RELIANCE</option>
                  <option value="HDFCBANK">HDFC BANK</option>
                  <option value="CRUDEOIL">CRUDE OIL (MCX)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10.5px] text-terminal-muted">Strike Price:</label>
                  <input
                    type="number"
                    step="50"
                    value={customStrikePrice}
                    onChange={(e) => setCustomStrikePrice(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-terminal-card text-terminal-text text-xs border border-terminal-border focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] text-terminal-muted">Option Type:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomOptionType('CE')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        customOptionType === 'CE'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-terminal-card text-terminal-muted border border-terminal-border'
                      }`}
                    >
                      CALL (CE)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomOptionType('PE')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        customOptionType === 'PE'
                          ? 'bg-rose-500 text-white'
                          : 'bg-terminal-card text-terminal-muted border border-terminal-border'
                      }`}
                    >
                      PUT (PE)
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] text-terminal-muted">Expiry Window:</label>
                <select
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-terminal-card text-terminal-text text-xs border border-terminal-border focus:outline-none focus:border-purple-500"
                >
                  <option value="Current Weekly">Current Weekly Expiry</option>
                  <option value="Next Weekly">Next Weekly Expiry</option>
                  <option value="Monthly Expiry">Monthly Expiry</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg mt-2"
              >
                <span>Add {strikeUnderlying} {customStrikePrice} {customOptionType} to Watchlist</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-terminal-border bg-terminal-panel/80 flex items-center justify-between text-[11px] text-terminal-muted">
          <span>💡 Click any chart icon to load instrument into terminal</span>
          <span className="font-mono text-sky-500 dark:text-sky-400">Auto-saved</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
