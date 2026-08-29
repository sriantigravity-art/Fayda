import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  Flame, 
  Layers, 
  Maximize2, 
  Minus, 
  Plus, 
  Target, 
  Activity, 
  Hourglass, 
  Zap,
  ChevronDown
} from 'lucide-react';
import type { SurgeLevel, ThetaIntensity, IvStatus, OptionStrikeData } from '../types';
import { StrikeDetailModal } from './StrikeDetailModal';

export const OptionChainHeatmap: React.FC = () => {
  const { currentIndexState, selectedIndex, strikeRange, setStrikeRange } = useMarket();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showFullChain, setShowFullChain] = useState(false);
  const [highlightTheta, setHighlightTheta] = useState(true);
  const [selectedStrikeForModal, setSelectedStrikeForModal] = useState<OptionStrikeData | null>(null);
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState(false);

  if (!currentIndexState) {
    return (
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-8 flex flex-col items-center justify-center min-h-[420px] text-terminal-muted">
        <Activity className="w-8 h-8 animate-spin mb-3 text-accent-cyan" />
        <span className="font-mono text-sm">Streaming live Option Chain & Greeks for {selectedIndex}...</span>
      </div>
    );
  }

  const { strikes, atmStrike, spotPrice, strikeStep, selectedExpiry, daysToExpiry } = currentIndexState;

  // Filter strikes based on range (+- 200 pts or full)
  const filteredStrikes = showFullChain
    ? strikes
    : strikes.filter((s) => Math.abs(s.strikePrice - atmStrike) <= strikeRange);

  const getSurgeBadge = (level: SurgeLevel, score: number) => {
    if (level === 'EXTREME') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-bear text-white shadow-[0_0_8px_rgba(255,59,105,0.7)] animate-pulse">
          <Flame className="w-3 h-3 mr-0.5" /> {score}
        </span>
      );
    }
    if (level === 'STRONG') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber/20 text-amber border border-amber/40">
          🔥 {score}
        </span>
      );
    }
    return null;
  };

  /**
   * Color-codes IV value strictly according to percentage:
   * IV < 12.5% = GREEN (Cheap Options / Buy Value)
   * IV > 18.0% = RED (Expensive / Crush Danger)
   * 12.5% - 18.0% = AMBER (Fair Value)
   */
  const getIvBadge = (iv: number, _status?: IvStatus) => {
    const ivVal = +(iv || 13.5).toFixed(1);

    if (ivVal < 12.5) {
      return (
        <span 
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-bull/20 text-bull border border-bull/50 shadow-[0_0_8px_rgba(0,245,155,0.25)]"
          title={`IV ${ivVal}% (<12.5%): Cheap Option Premium (High Buy Value, Minimal Volatility Crush Risk)`}
        >
          {ivVal}% <span className="text-[8px] ml-0.5 font-black">CHEAP</span>
        </span>
      );
    }

    if (ivVal > 18.0) {
      return (
        <span 
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-bear/25 text-bear border border-bear/50 shadow-[0_0_8px_rgba(255,59,105,0.25)]"
          title={`IV ${ivVal}% (>18%): Expensive Option Premium (High IV Crush Risk for Buyers, Favors Option Sellers)`}
        >
          {ivVal}% <span className="text-[8px] ml-0.5 font-black">HIGH</span>
        </span>
      );
    }

    return (
      <span 
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-amber/15 text-amber border border-amber/30"
        title={`IV ${ivVal}% (12.5% - 18%): Fair Value Pricing`}
      >
        {ivVal}% <span className="text-[8px] ml-0.5 opacity-80">FAIR</span>
      </span>
    );
  };

  const getThetaBadge = (theta: number, thetaPerHour: number, intensity: ThetaIntensity) => {
    const absTheta = Math.abs(theta || 0);
    if (absTheta === 0) {
      return <span className="text-[9px] font-mono text-terminal-muted/50">-</span>;
    }

    const formatted = absTheta >= 1.0 
      ? `-₹${absTheta.toFixed(1)}/d` 
      : `-₹${absTheta.toFixed(2)}/d`;

    if (intensity === 'EXTREME') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber/20 text-amber border border-amber/50 shadow-[0_0_8px_rgba(255,184,0,0.3)] animate-pulse" title={`Extreme Theta Decay: ₹${absTheta.toFixed(2)}/day (₹${Math.abs(thetaPerHour || 0).toFixed(2)}/hr)`}>
          <Hourglass className="w-2.5 h-2.5 mr-0.5 text-amber" />
          {formatted}
        </span>
      );
    }
    if (intensity === 'HIGH') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-terminal-panel text-amber/90 border border-amber/30" title={`High Theta Decay: ₹${absTheta.toFixed(2)}/day (₹${Math.abs(thetaPerHour || 0).toFixed(2)}/hr)`}>
          {formatted}
        </span>
      );
    }
    return (
      <span className="text-[9px] font-mono text-terminal-muted" title={`Theta Decay: ₹${absTheta.toFixed(2)}/day`}>
        {formatted}
      </span>
    );
  };

  const renderLtpCell = (ltp: number, ltpChange: number, ltpPctChange: number, isCall: boolean) => {
    if (!ltp || ltp <= 0) {
      return (
        <div className={`flex flex-col ${isCall ? 'items-end' : 'items-start'}`}>
          <span className="text-terminal-muted/50 font-mono text-xs">-</span>
        </div>
      );
    }

    const isPositive = ltpChange > 0;
    const isNegative = ltpChange < 0;
    const changeSign = isPositive ? '+' : '';

    return (
      <div className={`flex flex-col ${isCall ? 'items-end' : 'items-start'}`}>
        <span className="font-bold text-terminal-text text-xs tabular-nums">
          ₹{ltp.toFixed(2)}
        </span>
        {ltpChange !== 0 ? (
          <span className={`text-[9px] font-bold tabular-nums leading-tight ${isPositive ? 'text-bull' : isNegative ? 'text-bear' : 'text-terminal-muted'}`}>
            {changeSign}{ltpChange.toFixed(1)} ({changeSign}{ltpPctChange}%)
          </span>
        ) : (
          <span className="text-[9px] text-terminal-muted/70 font-mono leading-tight">
            0.0 (0.0%)
          </span>
        )}
      </div>
    );
  };

  const renderDeltaOI = (delta1m: number, totalDelta: number, isCall: boolean) => {
    const val = delta1m !== 0 ? delta1m : (totalDelta !== 0 ? totalDelta : 0);
    if (val === 0) {
      return <span className="text-terminal-muted/50 font-mono text-[11px]">-</span>;
    }

    const sign = val > 0 ? '+' : '';
    const abs = Math.abs(val);
    let formatted = '';
    if (abs >= 100000) {
      formatted = `${sign}${(val / 100000).toFixed(2)}L`;
    } else if (abs >= 1000) {
      formatted = `${sign}${(val / 1000).toFixed(1)}k`;
    } else {
      formatted = `${sign}${val}`;
    }

    const isPositive = val > 0;
    const colorClass = isCall 
      ? (isPositive ? 'text-bear font-black' : 'text-bull font-black') 
      : (isPositive ? 'text-bull font-black' : 'text-bear font-black');

    return (
      <div 
        className={`flex flex-col ${isCall ? 'items-end' : 'items-start'} cursor-help`}
        title={`1-Min ΔOI: ${delta1m > 0 ? '+' : ''}${delta1m.toLocaleString()} contracts\nDay Cumulative ΔOI: ${totalDelta > 0 ? '+' : ''}${totalDelta.toLocaleString()} contracts`}
      >
        <span className={`text-[11px] font-bold tabular-nums ${colorClass}`}>
          {formatted}
        </span>
        {totalDelta !== 0 && totalDelta !== val && (
          <span className="text-[8px] text-terminal-muted font-mono leading-none">
            Day: {totalDelta > 0 ? '+' : ''}{Math.abs(totalDelta) >= 100000 ? `${(totalDelta / 100000).toFixed(1)}L` : `${(totalDelta / 1000).toFixed(0)}k`}
          </span>
        )}
      </div>
    );
  };

  const maxCallOI = Math.max(...strikes.map((s) => s.callOI), 1);
  const maxPutOI = Math.max(...strikes.map((s) => s.putOI), 1);

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl flex flex-col overflow-hidden shadow-xl transition-all duration-300">
      {/* Header & Controls Bar (Accordion Trigger) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-3.5 bg-terminal-panel/60 cursor-pointer select-none group/hdr transition-all ${isExpanded ? 'border-b border-terminal-border' : ''}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-6 rounded-full bg-accent-cyan shadow-[0_0_10px_#00E5FF] shrink-0" />
            <div className="p-2 rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_12px_rgba(0,229,255,0.25)] group-hover/hdr:scale-105 transition-transform shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(0,229,255,0.3)] group-hover/hdr:text-accent-cyan transition-colors">
                  1-MIN OI DELTA, IV, THETA & ORDER FLOW HEATMAP
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan font-black border border-accent-cyan/40 shadow-sm">
                  {selectedIndex}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber/15 text-amber font-black border border-amber/40 shadow-sm">
                  {selectedExpiry} ({daysToExpiry} DTE)
                </span>
              </div>
              <p className="text-[11px] text-terminal-muted mt-0.5 font-mono flex flex-wrap items-center gap-2">
                <span>Spot: <strong className="text-terminal-text font-bold">{spotPrice.toFixed(2)}</strong> | ATM: <strong className="text-amber font-bold">{atmStrike}</strong> | Step: {strikeStep} pts</span>
                <span className="px-2 py-0.5 rounded-md bg-bull/10 text-bull border border-bull/30 text-[10px] font-bold hidden sm:inline">
                  ✓ Official 28-Aug-2026 NSE Settlement Close
                </span>
              </p>
            </div>
          </div>

          {/* Right Controls & Standardized Dropdown Toggle Button */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto sm:ml-auto">
            {/* Heatmap Range & Theta Highlight Toggles (visible when expanded) */}
            {isExpanded && (
              <div className="hidden sm:flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                {/* Theta Decay Highlight Toggle */}
                <button
                  onClick={() => setHighlightTheta(!highlightTheta)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition ${
                    highlightTheta
                      ? 'bg-amber/20 border-amber/50 text-amber font-bold shadow-[0_0_10px_rgba(255,184,0,0.2)]'
                      : 'bg-terminal-bg border-terminal-border text-terminal-muted hover:text-terminal-text'
                  }`}
                  title="Toggle Theta Decay (Time Value Erosion) Highlighter"
                >
                  <Hourglass className="w-3.5 h-3.5" />
                  <span>Theta {highlightTheta ? 'ON' : 'OFF'}</span>
                </button>

                {/* Range Controls */}
                <div className="flex items-center bg-terminal-bg border border-terminal-border rounded-lg p-0.5">
                  <button
                    onClick={() => {
                      setShowFullChain(false);
                      setStrikeRange(Math.max(strikeStep * 2, strikeRange - strikeStep * 2));
                    }}
                    disabled={showFullChain || strikeRange <= strikeStep * 2}
                    className="p-1 rounded hover:bg-terminal-panel text-terminal-muted hover:text-terminal-text disabled:opacity-30"
                    title="Narrow Strike Window"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="px-2 py-0.5 text-[11px] font-bold text-terminal-text">
                    {showFullChain ? 'ALL' : `±${strikeRange}`}
                  </span>

                  <button
                    onClick={() => {
                      setShowFullChain(false);
                      setStrikeRange(strikeRange + strikeStep * 2);
                    }}
                    disabled={showFullChain}
                    className="p-1 rounded hover:bg-terminal-panel text-terminal-muted hover:text-terminal-text disabled:opacity-30"
                    title="Widen Strike Window"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setShowFullChain(!showFullChain)}
                  className={`p-1.5 rounded-lg border transition ${
                    showFullChain
                      ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
                      : 'bg-terminal-bg border-terminal-border text-terminal-muted hover:text-terminal-text'
                  }`}
                  title={showFullChain ? 'Reset to Centered Range' : 'View Complete Strike Spectrum'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
              title={isExpanded ? 'Click to Collapse Option Chain Heatmap' : 'Click to Expand Option Chain Heatmap'}
            >
              <span className="tracking-wider uppercase">
                {isExpanded ? 'COLLAPSE' : 'VIEW HEATMAP'}
              </span>
              <div className={`p-0.5 rounded bg-accent-cyan/15 text-accent-cyan transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-accent-cyan/30' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Table Container & Footer */}
      {isExpanded && (
        <>
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[640px] animate-in fade-in duration-200">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="sticky top-0 z-20 bg-terminal-card border-b border-terminal-border shadow-sm">
            {/* Super Header */}
            <tr className="border-b border-terminal-border/50 text-[10px] uppercase font-bold tracking-wider">
              <th colSpan={2} className="py-1 px-2 text-center bg-bear/10 text-bear border-r border-terminal-border sm:hidden">
                ◀ CALLS (CE)
              </th>
              <th colSpan={3} className="hidden sm:table-cell lg:hidden py-1 px-2 text-center bg-bear/10 text-bear border-r border-terminal-border">
                ◀ CALLS (CE)
              </th>
              <th colSpan={6} className="hidden lg:table-cell py-1 px-3 text-center bg-bear/10 text-bear border-r border-terminal-border">
                ◀ CALL OPTIONS (CE) — RESISTANCE & WRITING
              </th>
              <th className="py-1 px-2 sm:px-3 text-center bg-terminal-panel text-terminal-text font-black border-r border-terminal-border">
                STRIKE (ATM)
              </th>
              <th colSpan={2} className="py-1 px-2 text-center bg-bull/10 text-bull sm:hidden">
                PUTS (PE) ▶
              </th>
              <th colSpan={3} className="hidden sm:table-cell lg:hidden py-1 px-2 text-center bg-bull/10 text-bull">
                PUTS (PE) ▶
              </th>
              <th colSpan={6} className="hidden lg:table-cell py-1 px-3 text-center bg-bull/10 text-bull">
                PUT OPTIONS (PE) — SUPPORT & DEMAND ▶
              </th>
            </tr>

            {/* Column Headers */}
            <tr className="text-terminal-muted text-[10px] uppercase">
              {/* Call Columns */}
              <th className="py-2 px-1.5 sm:px-2 text-right">1-Min ΔOI</th>
              <th className="hidden sm:table-cell py-2 px-1.5 sm:px-2 text-right">Total OI</th>
              <th className="hidden lg:table-cell py-2 px-2 text-right">Buy / Sell Vol</th>
              <th className="hidden lg:table-cell py-2 px-1.5 text-right">Theta (₹/d)</th>
              <th className="hidden lg:table-cell py-2 px-1.5 text-right">IV (%)</th>
              <th className="py-2 px-1.5 sm:px-2 text-right border-r border-terminal-border">LTP (₹)</th>

              {/* Center Strike Column */}
              <th className="py-2 px-2 sm:px-3 text-center font-bold text-terminal-text bg-terminal-panel/80 border-r border-terminal-border">
                Strike
              </th>

              {/* Put Columns */}
              <th className="py-2 px-1.5 sm:px-2 text-left">LTP (₹)</th>
              <th className="hidden lg:table-cell py-2 px-1.5 text-left">IV (%)</th>
              <th className="hidden lg:table-cell py-2 px-1.5 text-left">Theta (₹/d)</th>
              <th className="hidden lg:table-cell py-2 px-2 text-left">Buy / Sell Vol</th>
              <th className="hidden sm:table-cell py-2 px-1.5 sm:px-2 text-left">Total OI</th>
              <th className="py-2 px-1.5 sm:px-2 text-left">1-Min ΔOI</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-terminal-border/40">
            {filteredStrikes.map((row) => {
              const isAtm = row.isAtm;
              const isCallSurge = row.callSurgeLevel !== 'NORMAL';
              const isPutSurge = row.putSurgeLevel !== 'NORMAL';
              const isExtremeTheta = row.thetaIntensity === 'EXTREME' && highlightTheta;

              const rowBg = isAtm
                ? 'bg-amber/10 hover:bg-amber/15 font-semibold ring-1 ring-amber/30'
                : isExtremeTheta
                ? 'bg-amber/5 hover:bg-terminal-panel/60'
                : 'hover:bg-terminal-panel/40';

              const callOiPct = (row.callOI / maxCallOI) * 100;
              const putOiPct = (row.putOI / maxPutOI) * 100;

              const callBuyPct = row.callBuyVolPct || 50;
              const callSellPct = 100 - callBuyPct;

              const putBuyPct = row.putBuyVolPct || 50;
              const putSellPct = 100 - putBuyPct;

              return (
                <tr 
                  key={row.strikePrice} 
                  onClick={() => {
                    setSelectedStrikeForModal(row);
                    setIsStrikeModalOpen(true);
                  }}
                  className={`transition-colors cursor-pointer group/row ${rowBg}`}
                  title={`Tap row or strike ${row.strikePrice} for full analytics modal`}
                >
                  {/* CALL SIDE */}
                  
                  {/* 1. Call 1-Min Delta OI (Visible on Mobile) */}
                  <td className="py-2 px-1.5 sm:px-2 text-right tabular-nums">
                    <div className="flex items-center justify-end space-x-0.5 sm:space-x-1">
                      {isCallSurge && getSurgeBadge(row.callSurgeLevel, row.callSurgeScore)}
                      {renderDeltaOI(row.callOIChange1m, row.callOIChangeTotal, true)}
                    </div>
                  </td>

                  {/* 3. Call Total OI (Hidden on Mobile, Visible on >= sm) */}
                  <td className="hidden sm:table-cell py-2 px-1.5 sm:px-2 text-right relative tabular-nums">
                    <div
                      className="absolute right-0 top-1 bottom-1 bg-bear/15 rounded-l pointer-events-none"
                      style={{ width: `${Math.min(100, callOiPct)}%` }}
                    />
                    <span className="relative z-10 text-terminal-text font-medium text-[11px] sm:text-xs">
                      {(row.callOI / 100000).toFixed(2)}L
                    </span>
                  </td>

                  {/* 4. Call Buyer vs Seller Volume Breakdown (Hidden on Mobile) */}
                  <td className="hidden lg:table-cell py-2 px-2 text-right tabular-nums">
                    <div
                      className="flex flex-col items-end cursor-help"
                      title={`Call Order Flow for ${row.strikePrice} CE:\n• Buyer Volume: ${(row.callBuyVolume || 0).toLocaleString()} contracts (${callBuyPct}%)\n• Seller Volume: ${(row.callSellVolume || 0).toLocaleString()} contracts (${callSellPct}%)\n• Liquidity: ${row.callLiquidity || 'HIGH_LIQUIDITY'}\n• Total Volume: ${row.callVolume.toLocaleString()}`}
                    >
                      <div className="flex items-center space-x-1 text-[10px]">
                        <span className="text-bull font-bold">
                          B:{(row.callBuyVolume / 1000).toFixed(0)}k ({callBuyPct}%)
                        </span>
                        <span className="text-terminal-muted">/</span>
                        <span className="text-bear font-bold">
                          S:{(row.callSellVolume / 1000).toFixed(0)}k ({callSellPct}%)
                        </span>
                      </div>
                      <div className="w-20 h-1 bg-bear rounded-full overflow-hidden flex mt-0.5 border border-terminal-border/40">
                        <div
                          className="bg-bull h-full transition-all duration-300"
                          style={{ width: `${callBuyPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 5. Call Theta Decay (Hidden on Mobile) */}
                  <td className="hidden lg:table-cell py-2 px-1.5 text-right tabular-nums">
                    {getThetaBadge(row.callTheta, row.callThetaPerHour, row.thetaIntensity)}
                  </td>

                  {/* 6. Call IV (%) (Hidden on Mobile) */}
                  <td className="hidden lg:table-cell py-2 px-1.5 text-right tabular-nums">
                    {getIvBadge(row.callIv || row.iv, row.callIvStatus)}
                  </td>

                  {/* 7. Call LTP (Visible on Mobile) */}
                  <td className="py-2 px-1.5 sm:px-2 text-right tabular-nums border-r border-terminal-border">
                    {renderLtpCell(row.callLtp, row.callLtpChange, row.callLtpPctChange, true)}
                  </td>

                  {/* CENTER: STRIKE PRICE + THETA ACCELERATION INDICATOR */}
                  <td 
                    className={`py-2 px-2 sm:px-3 text-center font-bold tabular-nums border-r border-terminal-border relative group transition-all select-none ${
                      isAtm 
                        ? 'text-amber bg-amber/20 font-black text-xs sm:text-sm shadow-[0_0_10px_rgba(255,184,0,0.2)]' 
                        : 'text-terminal-text bg-terminal-panel/50 group-hover/row:text-accent-cyan group-hover/row:bg-accent-cyan/15'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      {isAtm && <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber animate-pulse" />}
                      <span className="underline decoration-dotted decoration-accent-cyan/40 underline-offset-2 font-black">{row.strikePrice}</span>
                      {isAtm && (
                        <span className="text-[7px] sm:text-[8px] px-1 py-0.2 rounded bg-amber text-terminal-bg font-black">
                          ATM
                        </span>
                      )}
                    </div>
                    {isExtremeTheta && (
                      <div className="text-[7px] sm:text-[8px] font-mono text-amber font-extrabold flex items-center justify-center gap-0.5 mt-0.5">
                        <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> THETA
                      </div>
                    )}
                  </td>

                  {/* PUT SIDE */}
                  
                  {/* 1. Put LTP (Visible on Mobile) */}
                  <td className="py-2 px-1.5 sm:px-2 text-left tabular-nums">
                    {renderLtpCell(row.putLtp, row.putLtpChange, row.putLtpPctChange, false)}
                  </td>

                  {/* 2. Put IV (%) (Hidden on Mobile) */}
                  <td className="hidden lg:table-cell py-2 px-1.5 text-left tabular-nums">
                    {getIvBadge(row.putIv || row.iv, row.putIvStatus)}
                  </td>

                  {/* 3. Put Theta Decay (Hidden on Mobile) */}
                  <td className="hidden lg:table-cell py-2 px-1.5 text-left tabular-nums">
                    {getThetaBadge(row.putTheta, row.putThetaPerHour, row.thetaIntensity)}
                  </td>

                  {/* 4. Put Buyer vs Seller Volume Breakdown (Hidden on Mobile) */}
                  <td className="hidden lg:table-cell py-2 px-2 text-left tabular-nums">
                    <div
                      className="flex flex-col items-start cursor-help"
                      title={`Put Order Flow for ${row.strikePrice} PE:\n• Buyer Volume: ${(row.putBuyVolume || 0).toLocaleString()} contracts (${putBuyPct}%)\n• Seller Volume: ${(row.putSellVolume || 0).toLocaleString()} contracts (${putSellPct}%)\n• Liquidity: ${row.putLiquidity || 'HIGH_LIQUIDITY'}\n• Total Volume: ${row.putVolume.toLocaleString()}`}
                    >
                      <div className="flex items-center space-x-1 text-[10px]">
                        <span className="text-bull font-bold">
                          B:{(row.putBuyVolume / 1000).toFixed(0)}k ({putBuyPct}%)
                        </span>
                        <span className="text-terminal-muted">/</span>
                        <span className="text-bear font-bold">
                          S:{(row.putSellVolume / 1000).toFixed(0)}k ({putSellPct}%)
                        </span>
                      </div>
                      <div className="w-20 h-1 bg-bear rounded-full overflow-hidden flex mt-0.5 border border-terminal-border/40">
                        <div
                          className="bg-bull h-full transition-all duration-300"
                          style={{ width: `${putBuyPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 5. Put Total OI (Hidden on Mobile, Visible on >= sm) */}
                  <td className="hidden sm:table-cell py-2 px-1.5 sm:px-2 text-left relative tabular-nums">
                    <div
                      className="absolute left-0 top-1 bottom-1 bg-bull/15 rounded-r pointer-events-none"
                      style={{ width: `${Math.min(100, putOiPct)}%` }}
                    />
                    <span className="relative z-10 text-terminal-text font-medium text-[11px] sm:text-xs">
                      {(row.putOI / 100000).toFixed(2)}L
                    </span>
                  </td>

                  {/* 6. Put 1-Min Delta OI (Visible on Mobile) */}
                  <td className="py-2 px-1.5 sm:px-2 text-left tabular-nums">
                    <div className="flex items-center justify-start space-x-0.5 sm:space-x-1">
                      {renderDeltaOI(row.putOIChange1m, row.putOIChangeTotal, false)}
                      {isPutSurge && getSurgeBadge(row.putSurgeLevel, row.putSurgeScore)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Heatmap Footer Legend with Prominent Green (<12.5%) and Red (>18%) Badges */}
      <div className="p-2.5 bg-terminal-panel/80 border-t border-terminal-border flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-terminal-muted">
        <div className="flex flex-wrap items-center gap-3">
          {/* GREEN CHEAP IV BADGE */}
          <span className="flex items-center gap-1.5 text-bull font-bold">
            <span className="px-1.5 py-0.5 rounded bg-bull/20 text-bull border border-bull/50 shadow-[0_0_8px_rgba(0,245,155,0.3)]">
              IV &lt; 12.5%
            </span>
            <span>Cheap Options (Buy Value)</span>
          </span>

          <span>•</span>

          {/* AMBER FAIR VALUE BADGE */}
          <span className="flex items-center gap-1.5 text-amber font-bold">
            <span className="px-1.5 py-0.5 rounded bg-amber/20 text-amber border border-amber/50">
              12.5% - 18%
            </span>
            <span>Fair Value</span>
          </span>

          <span>•</span>

          {/* RED EXPENSIVE IV BADGE */}
          <span className="flex items-center gap-1.5 text-bear font-bold">
            <span className="px-1.5 py-0.5 rounded bg-bear/25 text-bear border border-bear/50 shadow-[0_0_8px_rgba(255,59,105,0.3)]">
              IV &gt; 18%
            </span>
            <span>Expensive (Crush Danger)</span>
          </span>

          <span>•</span>

          <span className="flex items-center gap-1 text-accent-cyan font-bold">
            <Zap className="w-3 h-3 text-accent-cyan" />
            <span>High Liquidity (Tight Spreads)</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span>Expiry: <strong className="text-terminal-text">{selectedExpiry}</strong></span>
          <span>•</span>
          <span>DTE: <strong className="text-amber">{daysToExpiry} Days</strong></span>
        </div>
      </div>
      </>
      )}

      {/* Strike Deep-Dive Analytics Modal */}
      <StrikeDetailModal
        isOpen={isStrikeModalOpen}
        onClose={() => setIsStrikeModalOpen(false)}
        strike={selectedStrikeForModal}
        symbol={selectedIndex}
        spotPrice={spotPrice}
        selectedExpiry={selectedExpiry}
        daysToExpiry={daysToExpiry}
      />
    </div>
  );
};
