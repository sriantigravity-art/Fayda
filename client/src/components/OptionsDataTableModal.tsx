import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useMarket } from '../context/MarketContext';
import { ALL_SYMBOLS_CONFIG, type OptionStrikeData } from '../types';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Layers,
  Activity,
  Calendar,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { StrikeDetailModal } from './StrikeDetailModal';

export const OptionsDataTableModal: React.FC = () => {
  const { 
    activeOptionsDataModal, 
    closeOptionsDataModal, 
    indices, 
    selectedIndex,
    setSelectedIndex,
    setOptionExpiry
  } = useMarket();

  const [isClosing, setIsClosing] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NIFTY');
  const [strikeRangeMode, setStrikeRangeMode] = useState<'ATM_5' | 'ATM_10' | 'ALL'>('ATM_10');
  const [showGreeks, setShowGreeks] = useState<boolean>(true);
  const [isModalFullscreen, setIsModalFullscreen] = useState<boolean>(false);
  const [selectedStrikeForDetail, setSelectedStrikeForDetail] = useState<OptionStrikeData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const atmRowRef = useRef<HTMLTableRowElement>(null);
  const tipRowRef = useRef<HTMLTableRowElement>(null);

  // Sync active symbol from context when modal opens
  useEffect(() => {
    if (activeOptionsDataModal?.symbol) {
      setSelectedSymbol(activeOptionsDataModal.symbol);
    }
  }, [activeOptionsDataModal]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      closeOptionsDataModal();
    }, 200);
  };

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeOptionsDataModal && !isClosing && !isDetailModalOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOptionsDataModal, isClosing, isDetailModalOpen]);

  const symbolCfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === selectedSymbol);
  const currentIndexState = indices[selectedSymbol];
  const liveSpot = currentIndexState?.spotPrice || 0;
  const spotChange = currentIndexState?.change || 0;
  const spotPct = currentIndexState?.pctChange || 0;
  const isPositive = spotChange >= 0;

  const tipContext = activeOptionsDataModal?.tipContext;
  const tipStrikePrice = tipContext?.strikePrice;

  const strikes = currentIndexState?.strikes || [];
  const atmStrike = currentIndexState?.atmStrike || 0;
  const activePcr = currentIndexState?.pcr?.pcr || 1.0;

  // Filter strikes according to selected range
  const filteredStrikes = useMemo(() => {
    if (strikes.length === 0) return [];
    if (strikeRangeMode === 'ALL') return strikes;

    const step = symbolCfg?.step || 50;
    const rangeCount = strikeRangeMode === 'ATM_5' ? 5 : 10;
    const maxDiff = step * rangeCount;

    return strikes.filter(s => Math.abs(s.strikePrice - atmStrike) <= maxDiff);
  }, [strikes, strikeRangeMode, atmStrike, symbolCfg]);

  const maxCallOi = useMemo(() => Math.max(...strikes.map(s => s.callOI || 0), 1000), [strikes]);
  const maxPutOi = useMemo(() => Math.max(...strikes.map(s => s.putOI || 0), 1000), [strikes]);

  const jumpToAtm = () => {
    atmRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const jumpToTipStrike = () => {
    tipRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!activeOptionsDataModal && !isClosing) return null;

  const popularSymbols = ['NIFTY', 'BANKNIFTY', 'SENSEX', 'CRUDEOIL', 'NATURALGAS', 'GOLD', 'RELIANCE', 'HDFCBANK'];

  const handleSymbolChange = (sym: string) => {
    setSelectedSymbol(sym);
    setSelectedIndex(sym as any);
  };

  const handleStrikeClick = (strike: OptionStrikeData) => {
    setSelectedStrikeForDetail(strike);
    setIsDetailModalOpen(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-5 overflow-hidden">
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
            : 'w-full max-w-7xl h-[92vh] max-h-[920px]'
        } ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 py-2.5 bg-terminal-panel/95 border-b border-terminal-border gap-2 shrink-0">
          {/* Symbol Title & Spot Price */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan shrink-0">
              <Layers className="w-5 h-5" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-black text-sm sm:text-base text-terminal-text tracking-wide">
                  {selectedSymbol}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-accent-sky/20 text-accent-sky border border-accent-sky/30">
                  {symbolCfg?.category || 'OPTIONS'}
                </span>
                <span className="text-xs text-terminal-muted hidden sm:inline">
                  Options Data Table
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
                  <span className="text-terminal-muted hidden md:inline">|</span>
                  <span className="text-terminal-muted hidden md:inline">ATM: <strong className="text-terminal-text">{atmStrike}</strong></span>
                  <span className="text-terminal-muted hidden md:inline">|</span>
                  <span className="text-terminal-muted hidden md:inline">PCR: <strong className={activePcr >= 1 ? 'text-bull' : 'text-bear'}>{activePcr.toFixed(2)}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Symbol Switcher */}
          <div className="hidden xl:flex items-center space-x-1.5 bg-terminal-bg/80 p-1 rounded-xl border border-terminal-border">
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

          {/* Header Controls & Expiry */}
          <div className="flex items-center space-x-2 ml-auto">
            {/* Expiry Selector */}
            {currentIndexState?.expiryDates && currentIndexState.expiryDates.length > 0 && (
              <div className="flex items-center space-x-1 font-mono text-xs">
                <Calendar className="w-3.5 h-3.5 text-terminal-muted hidden sm:inline" />
                <select
                  value={currentIndexState.selectedExpiry}
                  onChange={(e) => setOptionExpiry(e.target.value)}
                  className="bg-terminal-panel border border-terminal-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-accent-cyan focus:outline-none focus:border-accent-cyan cursor-pointer"
                >
                  {currentIndexState.expiryDates.map((exp: string, idx: number) => (
                    <option key={idx} value={exp} className="bg-terminal-card text-terminal-text">
                      {exp} {idx === 0 ? '(Near)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              title="Close Options Table"
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
                <span className="text-accent-cyan font-bold">{tipContext.entryRange || (typeof tipContext.entryPrice === 'number' ? `₹${tipContext.entryPrice.toFixed(2)}` : '—')}</span>
              </div>

              {tipContext.stoplossPrice !== undefined && (
                <div>
                  <span className="text-terminal-muted">Stop Loss: </span>
                  <span className="text-bear font-bold">
                    {typeof tipContext.stoplossPrice === 'number' 
                      ? `₹${tipContext.stoplossPrice.toFixed(2)}` 
                      : String(tipContext.stoplossPrice).startsWith('₹') 
                        ? tipContext.stoplossPrice 
                        : !isNaN(parseFloat(String(tipContext.stoplossPrice).replace(/[^0-9.]/g, '')))
                          ? `₹${parseFloat(String(tipContext.stoplossPrice).replace(/[^0-9.]/g, '')).toFixed(2)}`
                          : '—'}
                  </span>
                </div>
              )}

              {tipContext.target1Price !== undefined && (
                <div>
                  <span className="text-terminal-muted">Target 1: </span>
                  <span className="text-bull font-bold">
                    {typeof tipContext.target1Price === 'number' 
                      ? `₹${tipContext.target1Price.toFixed(2)}` 
                      : String(tipContext.target1Price).startsWith('₹') 
                        ? tipContext.target1Price 
                        : !isNaN(parseFloat(String(tipContext.target1Price).replace(/[^0-9.]/g, '')))
                          ? `₹${parseFloat(String(tipContext.target1Price).replace(/[^0-9.]/g, '')).toFixed(2)}`
                          : '—'}
                  </span>
                </div>
              )}

              {tipContext.target2Price !== undefined && (
                <div className="hidden sm:block">
                  <span className="text-terminal-muted">Target 2: </span>
                  <span className="text-bull font-bold">
                    {typeof tipContext.target2Price === 'number' 
                      ? `₹${tipContext.target2Price.toFixed(2)}` 
                      : String(tipContext.target2Price).startsWith('₹') 
                        ? tipContext.target2Price 
                        : !isNaN(parseFloat(String(tipContext.target2Price).replace(/[^0-9.]/g, '')))
                          ? `₹${parseFloat(String(tipContext.target2Price).replace(/[^0-9.]/g, '')).toFixed(2)}`
                          : '—'}
                  </span>
                </div>
              )}

              {tipStrikePrice && (
                <button
                  type="button"
                  onClick={jumpToTipStrike}
                  className="px-2 py-0.5 rounded bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan font-bold border border-accent-cyan/40 transition cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Focus Setup Strike ({tipStrikePrice})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Toolbar Controls */}
        <div className="px-3 sm:px-5 py-2 bg-terminal-panel/60 border-b border-terminal-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-terminal-muted text-[11px]">Range:</span>
            {(['ATM_5', 'ATM_10', 'ALL'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setStrikeRangeMode(r)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                  strikeRangeMode === r
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                    : 'bg-terminal-panel text-terminal-muted hover:text-terminal-text border border-terminal-border'
                }`}
              >
                {r === 'ATM_5' ? 'ATM ±5' : r === 'ATM_10' ? 'ATM ±10' : 'Full Chain'}
              </button>
            ))}

            <div className="h-3 w-[1px] bg-terminal-border mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => setShowGreeks(!showGreeks)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer hidden sm:inline-block ${
                showGreeks
                  ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                  : 'bg-terminal-panel text-terminal-muted hover:text-terminal-text border border-terminal-border'
              }`}
            >
              {showGreeks ? 'Greeks Active (Δ, Γ, Θ, IV)' : 'Standard View'}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={jumpToAtm}
              className="px-2.5 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-border border border-terminal-border text-terminal-text font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-accent-sky" />
              <span>Jump to ATM ({atmStrike})</span>
            </button>
          </div>
        </div>

        {/* Options Data Table */}
        <div className="flex-1 overflow-auto bg-terminal-bg">
          {filteredStrikes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-terminal-muted space-y-2">
              <Activity className="w-6 h-6 animate-spin text-accent-cyan" />
              <span className="font-mono text-xs">Streaming live option chain for {selectedSymbol}...</span>
            </div>
          ) : (
            <table className="w-full text-xs font-mono border-collapse select-none">
              <thead className="sticky top-0 z-20 bg-terminal-panel/95 backdrop-blur-md border-b border-terminal-border text-[11px] uppercase tracking-wider text-terminal-muted shadow-sm">
                <tr>
                  {/* CALLS HEADER */}
                  <th colSpan={showGreeks ? 5 : 4} className="py-2 px-2 text-center bg-bull/10 text-bull border-r border-terminal-border font-bold">
                    CALLS (CE)
                  </th>

                  {/* STRIKE HEADER */}
                  <th className="py-2 px-3 text-center bg-terminal-elevated text-terminal-text font-black border-r border-terminal-border w-28">
                    STRIKE
                  </th>

                  {/* PUTS HEADER */}
                  <th colSpan={showGreeks ? 5 : 4} className="py-2 px-2 text-center bg-bear/10 text-bear font-bold">
                    PUTS (PE)
                  </th>
                </tr>

                <tr className="border-b border-terminal-border text-[10px] text-terminal-muted font-bold">
                  {/* Calls columns */}
                  {showGreeks && <th className="py-1.5 px-2 text-center">Delta (Δ)</th>}
                  <th className="py-1.5 px-2 text-right">Call OI</th>
                  <th className="py-1.5 px-2 text-right">OI Chg</th>
                  <th className="py-1.5 px-2 text-right">Volume</th>
                  <th className="py-1.5 px-2 text-right border-r border-terminal-border">Call LTP (₹)</th>

                  {/* Strike column */}
                  <th className="py-1.5 px-2 text-center bg-terminal-elevated/80 border-r border-terminal-border text-terminal-text">
                    Price
                  </th>

                  {/* Puts columns */}
                  <th className="py-1.5 px-2 text-left">Put LTP (₹)</th>
                  <th className="py-1.5 px-2 text-left">Volume</th>
                  <th className="py-1.5 px-2 text-left">OI Chg</th>
                  <th className="py-1.5 px-2 text-left">Put OI</th>
                  {showGreeks && <th className="py-1.5 px-2 text-center">Delta (Δ)</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-terminal-border/40">
                {filteredStrikes.map((s) => {
                  const isAtm = s.strikePrice === atmStrike;
                  const isTipStrike = tipStrikePrice === s.strikePrice;
                  const isCallItm = s.strikePrice < atmStrike;
                  const isPutItm = s.strikePrice > atmStrike;

                  const callOiPct = Math.min(100, Math.round(((s.callOI || 0) / maxCallOi) * 100));
                  const putOiPct = Math.min(100, Math.round(((s.putOI || 0) / maxPutOi) * 100));

                  const callOiChgPos = (s.callOIChange1m || s.callOIChangeTotal || 0) >= 0;
                  const putOiChgPos = (s.putOIChange1m || s.putOIChangeTotal || 0) >= 0;

                  return (
                    <tr
                      key={s.strikePrice}
                      ref={isAtm ? atmRowRef : isTipStrike ? tipRowRef : undefined}
                      onClick={() => handleStrikeClick(s)}
                      className={`hover:bg-terminal-panel/80 transition cursor-pointer ${
                        isAtm 
                          ? 'bg-accent-sky/15 font-bold' 
                          : isTipStrike 
                            ? 'bg-accent-cyan/20 border-y-2 border-accent-cyan' 
                            : ''
                      }`}
                    >
                      {/* CALL DELTA */}
                      {showGreeks && (
                        <td className={`py-2 px-2 text-center text-[11px] ${isCallItm ? 'bg-bull/5 font-semibold text-terminal-text' : 'text-terminal-muted'}`}>
                          {typeof s.callDelta === 'number' ? s.callDelta.toFixed(2) : '+0.50'}
                        </td>
                      )}

                      {/* CALL OI WITH VISUAL BAR */}
                      <td className={`py-2 px-2 text-right relative ${isCallItm ? 'bg-bull/5' : ''}`}>
                        <div 
                          className="absolute right-0 top-1 bottom-1 bg-bull/20 rounded-l pointer-events-none"
                          style={{ width: `${callOiPct}%` }}
                        />
                        <span className="relative z-10 font-bold text-terminal-text">
                          {(s.callOI || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* CALL OI CHANGE */}
                      <td className={`py-2 px-2 text-right text-[11px] ${isCallItm ? 'bg-bull/5' : ''} ${callOiChgPos ? 'text-bull' : 'text-bear'}`}>
                        {callOiChgPos ? '+' : ''}{(s.callOIChangeTotal || s.callOIChange1m || 0).toLocaleString('en-IN')}
                      </td>

                      {/* CALL VOLUME */}
                      <td className={`py-2 px-2 text-right text-terminal-muted text-[11px] ${isCallItm ? 'bg-bull/5' : ''}`}>
                        {(s.callVolume || 0).toLocaleString('en-IN')}
                      </td>

                      {/* CALL LTP */}
                      <td className={`py-2 px-2 text-right border-r border-terminal-border font-bold text-sm ${
                        isCallItm ? 'bg-bull/10 text-bull' : 'text-terminal-text'
                      }`}>
                        ₹{(s.callLtp || 0).toFixed(2)}
                      </td>

                      {/* CENTER STRIKE PRICE */}
                      <td className={`py-2 px-2 text-center border-r border-terminal-border font-mono font-black ${
                        isAtm 
                          ? 'bg-accent-sky text-slate-950 shadow-md' 
                          : isTipStrike
                            ? 'bg-accent-cyan text-slate-950 shadow-md'
                            : 'bg-terminal-elevated text-terminal-text'
                      }`}>
                        <div className="flex flex-col items-center justify-center">
                          <span>{s.strikePrice}</span>
                          {isAtm && (
                            <span className="text-[9px] uppercase font-bold tracking-tighter px-1 rounded bg-slate-950 text-accent-sky">
                              ATM
                            </span>
                          )}
                          {isTipStrike && !isAtm && (
                            <span className="text-[8px] uppercase font-bold tracking-tighter px-1 rounded bg-slate-950 text-accent-cyan animate-pulse">
                              TIP STRIKE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PUT LTP */}
                      <td className={`py-2 px-2 text-left font-bold text-sm ${
                        isPutItm ? 'bg-bear/10 text-bear' : 'text-terminal-text'
                      }`}>
                        ₹{(s.putLtp || 0).toFixed(2)}
                      </td>

                      {/* PUT VOLUME */}
                      <td className={`py-2 px-2 text-left text-terminal-muted text-[11px] ${isPutItm ? 'bg-bear/5' : ''}`}>
                        {(s.putVolume || 0).toLocaleString('en-IN')}
                      </td>

                      {/* PUT OI CHANGE */}
                      <td className={`py-2 px-2 text-left text-[11px] ${isPutItm ? 'bg-bear/5' : ''} ${putOiChgPos ? 'text-bull' : 'text-bear'}`}>
                        {putOiChgPos ? '+' : ''}{(s.putOIChangeTotal || s.putOIChange1m || 0).toLocaleString('en-IN')}
                      </td>

                      {/* PUT OI WITH VISUAL BAR */}
                      <td className={`py-2 px-2 text-left relative ${isPutItm ? 'bg-bear/5' : ''}`}>
                        <div 
                          className="absolute left-0 top-1 bottom-1 bg-bear/20 rounded-r pointer-events-none"
                          style={{ width: `${putOiPct}%` }}
                        />
                        <span className="relative z-10 font-bold text-terminal-text">
                          {(s.putOI || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* PUT DELTA */}
                      {showGreeks && (
                        <td className={`py-2 px-2 text-center text-[11px] ${isPutItm ? 'bg-bear/5 font-semibold text-terminal-text' : 'text-terminal-muted'}`}>
                          {typeof s.putDelta === 'number' ? s.putDelta.toFixed(2) : '-0.50'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Summary */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 py-2.5 bg-terminal-panel/95 border-t border-terminal-border gap-2 text-xs font-mono shrink-0">
          <div className="flex items-center space-x-2 text-terminal-muted text-[11px]">
            <Info className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Click any strike row to view quantitative Greeks & IV buildup breakdown.</span>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 rounded-xl bg-terminal-card hover:bg-terminal-border border border-terminal-border text-terminal-muted hover:text-terminal-text font-mono font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Strike Detail Modal Sub-Dialog */}
      {selectedStrikeForDetail && (
        <StrikeDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          strike={selectedStrikeForDetail}
          spotPrice={liveSpot}
          symbol={selectedSymbol}
        />
      )}
    </div>,
    document.body
  );
};
