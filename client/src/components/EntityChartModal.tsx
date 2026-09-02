import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { ALL_SYMBOLS_CONFIG } from '../types';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart2
} from 'lucide-react';

// Map terminal symbols to official TradingView symbols
export const getTradingViewSymbol = (symbol: string): string => {
  const clean = (symbol || '').toUpperCase().trim();
  
  // Indices
  if (clean === 'NIFTY') return 'NSE:NIFTY';
  if (clean === 'BANKNIFTY') return 'NSE:BANKNIFTY';
  if (clean === 'FINNIFTY') return 'NSE:CNXFINANCE';
  if (clean === 'MIDCPNIFTY') return 'NSE:MIDCPNIFTY';
  if (clean === 'NIFTYNXT50') return 'NSE:NIFTYNXT50';
  if (clean === 'SENSEX') return 'BSE:SENSEX';
  if (clean === 'BANKEX') return 'BSE:BANKEX';

  // MCX Commodities (Continuous Futures 1!)
  if (clean === 'CRUDEOIL') return 'MCX:CRUDEOIL1!';
  if (clean === 'NATURALGAS') return 'MCX:NATURALGAS1!';
  if (clean === 'GOLD') return 'MCX:GOLD1!';
  if (clean === 'SILVER') return 'MCX:SILVER1!';
  if (clean === 'COPPER') return 'MCX:COPPER1!';
  if (clean === 'ZINC') return 'MCX:ZINC1!';

  // Nifty 50 Equities
  return `NSE:${clean}`;
};

export const EntityChartModal: React.FC = () => {
  const { activeChartModal, closeChartModal, indices, setSelectedIndex } = useMarket();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NIFTY');
  const [timeframe, setTimeframe] = useState<string>('5');
  const [isModalFullscreen, setIsModalFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync active symbol from context when modal opens
  useEffect(() => {
    if (activeChartModal?.symbol) {
      setSelectedSymbol(activeChartModal.symbol);
    }
  }, [activeChartModal]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      closeChartModal();
    }, 200);
  };

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeChartModal && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeChartModal, isClosing]);

  const tvSymbol = useMemo(() => getTradingViewSymbol(selectedSymbol), [selectedSymbol]);
  const symbolCfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedSymbol);
  const currentIndexState = indices[selectedSymbol];
  const liveSpot = currentIndexState?.spotPrice || 0;
  const spotChange = currentIndexState?.change || 0;
  const spotPct = currentIndexState?.pctChange || 0;
  const isPositive = spotChange >= 0;

  const tipContext = activeChartModal?.tipContext;

  // TradingView Widget Injection
  useEffect(() => {
    if (!activeChartModal || !containerRef.current) return;

    containerRef.current.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.id = `tradingview_${selectedSymbol}_${Date.now()}`;
    widgetDiv.className = 'w-full h-full';
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: timeframe,
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1',
      locale: 'in',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_side_toolbar: false,
      withdateranges: true,
      studies: [
        'STD;EMA',
        'STD;VWAP',
        'STD;Supertrend'
      ],
      container_id: widgetDiv.id
    });

    containerRef.current.appendChild(script);
  }, [activeChartModal, selectedSymbol, timeframe, tvSymbol]);

  if (!activeChartModal && !isClosing) return null;

  const popularSymbols = ['NIFTY', 'BANKNIFTY', 'SENSEX', 'CRUDEOIL', 'NATURALGAS', 'GOLD', 'RELIANCE', 'HDFCBANK'];

  const handleOpenExternal = () => {
    const url = `https://in.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSymbolChange = (sym: string) => {
    setSelectedSymbol(sym);
    setSelectedIndex(sym as any);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={handleClose}
        className={`fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-all ${
          isClosing ? 'animate-modal-backdrop-exit' : 'animate-modal-backdrop-enter'
        }`}
      />

      {/* Modal Window */}
      <div 
        className={`relative bg-terminal-card border-2 border-accent-cyan/40 rounded-2xl shadow-[0_0_60px_rgba(0,229,255,0.22)] overflow-hidden flex flex-col z-10 ${
          isModalFullscreen 
            ? 'w-full h-full rounded-none border-0' 
            : 'w-full max-w-6xl h-[92vh] max-h-[900px]'
        } ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 py-2.5 bg-terminal-panel/95 border-b border-terminal-border gap-2 shrink-0">
          {/* Symbol Title & Spot Price */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-black text-sm sm:text-base text-terminal-text tracking-wide">
                  {selectedSymbol}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-accent-sky/20 text-accent-sky border border-accent-sky/30 hidden xs:inline">
                  {symbolCfg?.category || 'ASSET'}
                </span>
                <span className="text-[11px] font-mono text-terminal-muted hidden sm:inline">
                  ({tvSymbol})
                </span>
              </div>

              {liveSpot > 0 && (
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-terminal-text font-bold">
                    ₹{liveSpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[11px] font-semibold flex items-center ${isPositive ? 'text-bull' : 'text-bear'}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                    {isPositive ? '+' : ''}{spotChange.toFixed(2)} ({isPositive ? '+' : ''}{spotPct.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Symbol Switcher & Timeframe Selector */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-terminal-bg/80 p-1 rounded-xl border border-terminal-border">
            {popularSymbols.map(sym => (
              <button
                key={sym}
                type="button"
                onClick={() => handleSymbolChange(sym)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  selectedSymbol === sym 
                    ? 'bg-accent-cyan text-slate-950 shadow-sm' 
                    : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Timeframe selector & Actions */}
          <div className="flex items-center space-x-2 ml-auto">
            {/* Timeframe selector */}
            <div className="flex items-center bg-terminal-panel border border-terminal-border rounded-lg p-0.5 text-xs font-mono">
              {[
                { label: '1m', val: '1' },
                { label: '5m', val: '5' },
                { label: '15m', val: '15' },
                { label: '1h', val: '60' },
                { label: '1D', val: 'D' }
              ].map(tf => (
                <button
                  key={tf.val}
                  type="button"
                  onClick={() => setTimeframe(tf.val)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                    timeframe === tf.val 
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40' 
                      : 'text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* External TradingView Link */}
            <button
              type="button"
              onClick={handleOpenExternal}
              className="p-1.5 rounded-lg bg-terminal-panel hover:bg-terminal-border border border-terminal-border text-terminal-muted hover:text-accent-cyan transition cursor-pointer"
              title="Open full chart on TradingView"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsModalFullscreen(!isModalFullscreen)}
              className="p-1.5 rounded-lg bg-terminal-panel hover:bg-terminal-border border border-terminal-border text-terminal-muted hover:text-terminal-text transition cursor-pointer hidden sm:flex"
              title={isModalFullscreen ? 'Restore Size' : 'Expand Fullscreen'}
            >
              {isModalFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-terminal-panel hover:bg-bear/20 hover:text-bear border border-terminal-border text-terminal-muted transition cursor-pointer"
              title="Close Chart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trade Setup Reference Strip (if opened from a trade tip) */}
        {tipContext && tipContext.symbol === selectedSymbol && (
          <div className="bg-terminal-panel/90 border-b border-terminal-border px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan font-bold text-[11px] border border-accent-cyan/30 flex items-center gap-1">
                <Target className="w-3 h-3 text-accent-cyan" />
                <span>{tipContext.contractSymbol || tipContext.title}</span>
              </span>
              <span className="text-terminal-muted text-[11px]">Given: {tipContext.givenTimeFormatted || 'Live'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px]">
              <div>
                <span className="text-terminal-muted">Entry Zone: </span>
                <span className="text-accent-cyan font-bold">{tipContext.entryRange || `₹${tipContext.entryPrice}`}</span>
              </div>

              {tipContext.stoplossPrice && (
                <div>
                  <span className="text-terminal-muted">Stop Loss: </span>
                  <span className="text-bear font-bold">₹{Number(tipContext.stoplossPrice).toFixed(2)}</span>
                </div>
              )}

              {tipContext.target1Price && (
                <div>
                  <span className="text-terminal-muted">Target 1: </span>
                  <span className="text-bull font-bold">₹{Number(tipContext.target1Price).toFixed(2)}</span>
                </div>
              )}

              {tipContext.target2Price && (
                <div className="hidden sm:block">
                  <span className="text-terminal-muted">Target 2: </span>
                  <span className="text-bull font-bold">₹{Number(tipContext.target2Price).toFixed(2)}</span>
                </div>
              )}

              {tipContext.currentLtp && (
                <div className="bg-amber/10 px-2 py-0.5 rounded border border-amber/30 text-amber font-bold">
                  LTP: ₹{Number(tipContext.currentLtp).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart Canvas Area */}
        <div className="flex-1 w-full h-full min-h-[400px] bg-slate-950 relative">
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </div>,
    document.body
  );
};
