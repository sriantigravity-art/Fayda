import React, { useState, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useDensity } from '../context/DensityContext';
import { 
  Layers, 
  Target, 
  Activity, 
  Hourglass, 
  Zap,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Sliders,
  Maximize2
} from 'lucide-react';
import type { SurgeLevel, ThetaIntensity, IvStatus, OptionStrikeData } from '../types';
import { StrikeDetailModal } from './StrikeDetailModal';

export const OptionChainHeatmap: React.FC = () => {
  const { currentIndexState, selectedIndex, strikeRange, setStrikeRange } = useMarket();
  const { density, rowPaddingClass, tableTextClass } = useDensity();
  
  const [showFullChain, setShowFullChain] = useState(false);
  const [showGreeks, setShowGreeks] = useState(true);
  const [highlightTheta, setHighlightTheta] = useState(true);
  const [selectedStrikeForModal, setSelectedStrikeForModal] = useState<OptionStrikeData | null>(null);
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState(false);
  
  const atmRowRef = useRef<HTMLTableRowElement>(null);

  if (!currentIndexState) {
    return (
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-8 flex flex-col items-center justify-center min-h-[380px] text-terminal-muted">
        <Activity className="w-6 h-6 animate-spin mb-3 text-accent-sky" />
        <span className="font-sans text-xs">Streaming real-time Option Chain for {selectedIndex}...</span>
      </div>
    );
  }

  const { strikes, atmStrike, spotPrice, strikeStep, selectedExpiry, daysToExpiry } = currentIndexState;

  // Filter strikes based on range (+- 200 pts or full)
  const filteredStrikes = showFullChain
    ? strikes
    : strikes.filter((s) => Math.abs(s.strikePrice - atmStrike) <= strikeRange);

  // Maximum OI for scaling proportional bars
  const maxCallOi = Math.max(...strikes.map((s) => s.call.openInterest), 1000);
  const maxPutOi = Math.max(...strikes.map((s) => s.put.openInterest), 1000);

  const jumpToAtm = () => {
    atmRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const getIvPill = (iv: number) => {
    const ivVal = +(iv || 13.5).toFixed(1);
    if (ivVal < 12.5) {
      return (
        <span className="text-bull font-mono text-[11px] font-medium" title="Cheap option premium (Low Volatility)">
          {ivVal}%
        </span>
      );
    }
    if (ivVal > 18.0) {
      return (
        <span className="text-bear font-mono text-[11px] font-medium" title="Expensive option premium (High IV Crush Risk)">
          {ivVal}%
        </span>
      );
    }
    return (
      <span className="text-terminal-muted font-mono text-[11px]" title="Fair Value">
        {ivVal}%
      </span>
    );
  };

  const getThetaPill = (theta: number, intensity: ThetaIntensity) => {
    if (!highlightTheta) return <span className="font-mono text-terminal-muted">{theta.toFixed(1)}</span>;
    if (intensity === 'EXTREME') {
      return (
        <span className="text-bear font-mono font-bold text-[11px]" title="Extreme Theta Decay Rate">
          {theta.toFixed(1)}
        </span>
      );
    }
    if (intensity === 'HIGH') {
      return (
        <span className="text-amber font-mono font-medium text-[11px]" title="Accelerated Decay Rate">
          {theta.toFixed(1)}
        </span>
      );
    }
    return <span className="font-mono text-terminal-muted text-[11px]">{theta.toFixed(1)}</span>;
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl shadow-subtle flex flex-col overflow-hidden select-none">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-terminal-border bg-terminal-panel/40 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-accent-sky/15 text-accent-sky">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs sm:text-sm font-sans font-bold text-terminal-text">
                Option Chain Matrix
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-terminal-elevated text-terminal-muted border border-terminal-border">
                {selectedExpiry}
              </span>
            </div>
            <span className="text-[11px] text-terminal-muted font-sans hidden sm:block">
              Institutional multi-strike Call/Put OI delta, volume & Greeks
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 font-sans text-xs">
          {/* Jump to ATM */}
          <button
            type="button"
            onClick={jumpToAtm}
            className="px-2.5 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-text font-medium text-[11px] transition flex items-center gap-1 cursor-pointer"
            title="Scroll to At-The-Money strike"
          >
            <Target className="w-3 h-3 text-accent-sky" />
            <span>ATM</span>
          </button>

          {/* Greek Toggle */}
          <button
            type="button"
            onClick={() => setShowGreeks(!showGreeks)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
              showGreeks ? 'bg-accent-sky/15 border-accent-sky/40 text-accent-sky' : 'bg-terminal-panel border-terminal-border text-terminal-muted'
            }`}
            title="Toggle Delta & Greek Columns"
          >
            Greeks
          </button>

          {/* Range Pills */}
          <div className="hidden sm:flex items-center bg-terminal-panel border border-terminal-border rounded-lg p-0.5 text-[10px] font-mono">
            <button
              onClick={() => { setShowFullChain(false); setStrikeRange(150); }}
              className={`px-1.5 py-0.5 rounded transition ${!showFullChain && strikeRange === 150 ? 'bg-terminal-card text-terminal-text font-bold shadow-subtle' : 'text-terminal-muted hover:text-terminal-text'}`}
            >
              ±150
            </button>
            <button
              onClick={() => { setShowFullChain(false); setStrikeRange(200); }}
              className={`px-1.5 py-0.5 rounded transition ${!showFullChain && strikeRange === 200 ? 'bg-terminal-card text-terminal-text font-bold shadow-subtle' : 'text-terminal-muted hover:text-terminal-text'}`}
            >
              ±200
            </button>
            <button
              onClick={() => { setShowFullChain(false); setStrikeRange(300); }}
              className={`px-1.5 py-0.5 rounded transition ${!showFullChain && strikeRange === 300 ? 'bg-terminal-card text-terminal-text font-bold shadow-subtle' : 'text-terminal-muted hover:text-terminal-text'}`}
            >
              ±300
            </button>
            <button
              onClick={() => setShowFullChain(true)}
              className={`px-1.5 py-0.5 rounded transition ${showFullChain ? 'bg-terminal-card text-terminal-text font-bold shadow-subtle' : 'text-terminal-muted hover:text-terminal-text'}`}
            >
              Full
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Canvas */}
      <div className="overflow-x-auto overflow-y-auto max-h-[580px] no-scrollbar">
        <table className="w-full text-left border-collapse font-mono">
          {/* Table Header */}
          <thead className="sticky top-0 z-20 bg-terminal-panel border-b border-terminal-border text-[10px] uppercase tracking-wider text-terminal-muted font-sans font-semibold">
            <tr>
              {/* CALLS HEADER */}
              <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">Call OI</th>
              <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">OI Δ</th>
              {showGreeks && (
                <>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">IV</th>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">Delta</th>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">Theta</th>
                </>
              )}
              <th className="py-2 px-2.5 text-right text-bull font-bold bg-bull/10 border-r border-terminal-border">Call LTP</th>

              {/* CENTER STRIKE HEADER */}
              <th className="py-2 px-3 text-center text-terminal-text font-bold bg-terminal-elevated border-r border-terminal-border">
                STRIKE
              </th>

              {/* PUTS HEADER */}
              <th className="py-2 px-2.5 text-left text-bear font-bold bg-bear/10 border-r border-terminal-borderSubtle">Put LTP</th>
              {showGreeks && (
                <>
                  <th className="py-2 px-2 text-left text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">Theta</th>
                  <th className="py-2 px-2 text-left text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">Delta</th>
                  <th className="py-2 px-2 text-left text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">IV</th>
                </>
              )}
              <th className="py-2 px-2 text-right text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">OI Δ</th>
              <th className="py-2 px-2 text-right text-bear font-bold bg-bear/5">Put OI</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className={`divide-y divide-terminal-borderSubtle ${tableTextClass}`}>
            {filteredStrikes.map((s) => {
              const isAtm = s.strikePrice === atmStrike;
              const isCallItm = s.strikePrice < spotPrice;
              const isPutItm = s.strikePrice > spotPrice;

              const callOiPct = (s.call.openInterest / maxCallOi) * 100;
              const putOiPct = (s.put.openInterest / maxPutOi) * 100;

              return (
                <tr
                  key={s.strikePrice}
                  ref={isAtm ? atmRowRef : null}
                  onClick={() => {
                    setSelectedStrikeForModal(s);
                    setIsStrikeModalOpen(true);
                  }}
                  className={`transition-colors cursor-pointer group ${
                    isAtm
                      ? 'bg-accent-sky/10 font-bold border-y-2 border-accent-sky'
                      : 'hover:bg-terminal-hover'
                  }`}
                >
                  {/* CALL OI with subtle progress tint */}
                  <td className={`${rowPaddingClass} text-right relative border-r border-terminal-borderSubtle ${isCallItm ? 'bg-bull/5' : ''}`}>
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-bull/10 pointer-events-none transition-all"
                      style={{ width: `${Math.min(100, callOiPct)}%` }}
                    />
                    <span className="relative z-10 tabular-nums text-terminal-text font-medium">
                      {s.call.openInterest.toLocaleString('en-IN')}
                    </span>
                  </td>

                  {/* CALL OI CHANGE */}
                  <td className={`${rowPaddingClass} text-right tabular-nums border-r border-terminal-borderSubtle ${isCallItm ? 'bg-bull/5' : ''}`}>
                    <span className={`font-semibold ${s.call.changeInOpenInterest >= 0 ? 'text-bull' : 'text-bear'}`}>
                      {s.call.changeInOpenInterest > 0 ? '+' : ''}{s.call.changeInOpenInterest.toLocaleString('en-IN')}
                    </span>
                  </td>

                  {/* CALL GREEKS */}
                  {showGreeks && (
                    <>
                      <td className={`${rowPaddingClass} text-right tabular-nums border-r border-terminal-borderSubtle ${isCallItm ? 'bg-bull/5' : ''}`}>
                        {getIvPill(s.call.iv)}
                      </td>
                      <td className={`${rowPaddingClass} text-right tabular-nums text-terminal-muted border-r border-terminal-borderSubtle ${isCallItm ? 'bg-bull/5' : ''}`}>
                        {s.call.delta.toFixed(2)}
                      </td>
                      <td className={`${rowPaddingClass} text-right tabular-nums border-r border-terminal-borderSubtle ${isCallItm ? 'bg-bull/5' : ''}`}>
                        {getThetaPill(s.call.theta, s.call.thetaIntensity)}
                      </td>
                    </>
                  )}

                  {/* CALL LTP */}
                  <td className={`${rowPaddingClass} text-right tabular-nums font-bold text-bull bg-bull/10 border-r border-terminal-border`}>
                    ₹{s.call.ltp.toFixed(2)}
                  </td>

                  {/* CENTER STRIKE PRICE */}
                  <td className={`${rowPaddingClass} text-center font-bold text-terminal-text bg-terminal-panel border-r border-terminal-border ${
                    isAtm ? 'bg-accent-sky/20 text-accent-sky shadow-subtle' : ''
                  }`}>
                    <div className="flex items-center justify-center space-x-1">
                      <span>{s.strikePrice}</span>
                      {isAtm && (
                        <span className="text-[9px] font-sans px-1 py-0.2 rounded bg-accent-sky text-white font-black">
                          ATM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* PUT LTP */}
                  <td className={`${rowPaddingClass} text-left tabular-nums font-bold text-bear bg-bear/10 border-r border-terminal-borderSubtle`}>
                    ₹{s.put.ltp.toFixed(2)}
                  </td>

                  {/* PUT GREEKS */}
                  {showGreeks && (
                    <>
                      <td className={`${rowPaddingClass} text-left tabular-nums border-r border-terminal-borderSubtle ${isPutItm ? 'bg-bear/5' : ''}`}>
                        {getThetaPill(s.put.theta, s.put.thetaIntensity)}
                      </td>
                      <td className={`${rowPaddingClass} text-left tabular-nums text-terminal-muted border-r border-terminal-borderSubtle ${isPutItm ? 'bg-bear/5' : ''}`}>
                        {s.put.delta.toFixed(2)}
                      </td>
                      <td className={`${rowPaddingClass} text-left tabular-nums border-r border-terminal-borderSubtle ${isPutItm ? 'bg-bear/5' : ''}`}>
                        {getIvPill(s.put.iv)}
                      </td>
                    </>
                  )}

                  {/* PUT OI CHANGE */}
                  <td className={`${rowPaddingClass} text-right tabular-nums border-r border-terminal-borderSubtle ${isPutItm ? 'bg-bear/5' : ''}`}>
                    <span className={`font-semibold ${s.put.changeInOpenInterest >= 0 ? 'text-bull' : 'text-bear'}`}>
                      {s.put.changeInOpenInterest > 0 ? '+' : ''}{s.put.changeInOpenInterest.toLocaleString('en-IN')}
                    </span>
                  </td>

                  {/* PUT OI with subtle progress tint */}
                  <td className={`${rowPaddingClass} text-right relative ${isPutItm ? 'bg-bear/5' : ''}`}>
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-bear/10 pointer-events-none transition-all"
                      style={{ width: `${Math.min(100, putOiPct)}%` }}
                    />
                    <span className="relative z-10 tabular-nums text-terminal-text font-medium">
                      {s.put.openInterest.toLocaleString('en-IN')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info Strip */}
      <div className="px-3 py-2 border-t border-terminal-border bg-terminal-panel/40 flex items-center justify-between text-[11px] font-sans text-terminal-muted">
        <div className="flex items-center space-x-2">
          <span>ATM: <strong className="font-mono text-terminal-text">{atmStrike}</strong></span>
          <span>•</span>
          <span>Spot Distance: <strong className="font-mono text-terminal-text">{(spotPrice - atmStrike).toFixed(1)} pts</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Click any strike row for deep order book & Greek radar</span>
        </div>
      </div>

      {/* Deep Strike Detail Modal */}
      {selectedStrikeForModal && (
        <StrikeDetailModal
          isOpen={isStrikeModalOpen}
          onClose={() => {
            setIsStrikeModalOpen(false);
            setSelectedStrikeForModal(null);
          }}
          strike={selectedStrikeForModal}
          spotPrice={spotPrice}
          atmStrike={atmStrike}
          selectedIndex={selectedIndex}
        />
      )}
    </div>
  );
};
