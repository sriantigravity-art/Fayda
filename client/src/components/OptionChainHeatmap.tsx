import React, { useState, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { useDensity } from '../context/DensityContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { 
  Layers, 
  Target, 
  Activity, 
  Hourglass, 
  Zap,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import type { SurgeLevel, ThetaIntensity, OptionStrikeData } from '../types';
import { StrikeDetailModal } from './StrikeDetailModal';

export const OptionChainHeatmap: React.FC = () => {
  const { currentIndexState, selectedIndex, strikeRange, setStrikeRange } = useMarket();
  const { density, rowPaddingClass, tableTextClass } = useDensity();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  
  const [showFullChain, setShowFullChain] = useState(false);
  const [showGreeks, setShowGreeks] = useState(true);
  const [highlightTheta, setHighlightTheta] = useState(true);
  const [selectedStrikeForModal, setSelectedStrikeForModal] = useState<OptionStrikeData | null>(null);
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState(false);
  
  const atmRowRef = useRef<HTMLTableRowElement>(null);

  if (!currentIndexState || !currentIndexState.strikes || currentIndexState.strikes.length === 0) {
    return (
      <div className="bg-terminal-card border border-terminal-border rounded-xl p-8 flex flex-col items-center justify-center min-h-[380px] text-terminal-muted">
        <Activity className="w-6 h-6 animate-spin mb-3 text-accent-sky" />
        <span className="font-sans text-xs">Streaming real-time Option Chain for {selectedIndex}...</span>
      </div>
    );
  }

  const { strikes, atmStrike, spotPrice, selectedExpiry } = currentIndexState;

  const filteredStrikes = showFullChain
    ? strikes
    : strikes.filter((s) => Math.abs(s.strikePrice - atmStrike) <= strikeRange);

  const maxCallOi = Math.max(...strikes.map((s) => s.callOI || 0), 1000);
  const maxPutOi = Math.max(...strikes.map((s) => s.putOI || 0), 1000);

  const jumpToAtm = () => {
    atmRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const getIvPill = (iv?: number) => {
    const ivVal = +(iv || 13.5).toFixed(2);
    if (ivVal < 12.5) return <span className="text-bull font-mono text-[11px] font-medium" title="Cheap option premium">{ivVal.toFixed(2)}%</span>;
    if (ivVal > 18.0) return <span className="text-bear font-mono text-[11px] font-medium" title="Expensive option premium">{ivVal.toFixed(2)}%</span>;
    return <span className="text-terminal-muted font-mono text-[11px]" title="Fair Value">{ivVal.toFixed(2)}%</span>;
  };

  const getThetaPill = (theta?: number) => {
    const th = theta || 0;
    if (!highlightTheta) return <span className="font-mono text-terminal-muted">{th.toFixed(2)}</span>;
    if (Math.abs(th) > 20) return <span className="text-bear font-mono font-bold text-[11px]" title="Extreme Theta Decay Rate">{th.toFixed(2)}</span>;
    if (Math.abs(th) > 10) return <span className="text-amber font-mono font-medium text-[11px]" title="Accelerated Decay Rate">{th.toFixed(2)}</span>;
    return <span className="font-mono text-terminal-muted text-[11px]">{th.toFixed(2)}</span>;
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl shadow-subtle flex flex-col overflow-hidden select-none transition-all duration-300">
      <div className="px-3.5 py-2.5 border-b border-terminal-border bg-terminal-panel/40 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-accent-sky/15 text-accent-sky">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs sm:text-sm font-sans font-bold text-terminal-text">
                {isBeginner ? 'Simplified Option Chain' : isIntermediate ? 'Option Chain Heatmap' : 'Quantitative Greek Exposure Matrix'}
              </h2>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                isBeginner ? 'bg-bull/15 text-bull border-bull/30' : isIntermediate ? 'bg-amber/15 text-amber border-amber/30' : 'bg-accent-purple/15 text-accent-purple border-accent-purple/30'
              }`}>
                {mode}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-terminal-elevated text-terminal-muted border border-terminal-border">
                {selectedExpiry}
              </span>
            </div>
            <span className="text-[11px] text-terminal-muted font-sans hidden sm:block">
              {isBeginner 
                ? 'Simplified strike prices, buy triggers, and buyer inflow indicators' 
                : isIntermediate 
                  ? 'Institutional multi-strike Call/Put OI delta, volume & Greeks' 
                  : 'Institutional Delta (Δ), Gamma (Γ), Theta (Θ), IV Skew & Volume Delta'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 font-sans text-xs">
          <button type="button" onClick={jumpToAtm} className="px-2.5 py-1 rounded-lg bg-terminal-panel hover:bg-terminal-hover border border-terminal-border text-terminal-text font-medium text-[11px] transition flex items-center gap-1 cursor-pointer" title="Scroll to At-The-Money strike">
            <Target className="w-3 h-3 text-accent-sky" />
            <span>ATM</span>
          </button>

          {!isBeginner && (
            <button
              type="button"
              onClick={() => setShowGreeks(!showGreeks)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                showGreeks ? 'bg-accent-sky/15 border-accent-sky/40 text-accent-sky' : 'bg-terminal-panel border-terminal-border text-terminal-muted'
              }`}
            >
              Greeks
            </button>
          )}

          <div className="hidden sm:flex items-center bg-terminal-panel border border-terminal-border rounded-lg p-0.5 text-[10px] font-mono">
            {[150, 200, 300].map(val => (
                <button key={val} onClick={() => { setShowFullChain(false); setStrikeRange(val); }} className={`px-1.5 py-0.5 rounded transition ${!showFullChain && strikeRange === val ? 'bg-terminal-card text-terminal-text font-bold shadow-subtle' : 'text-terminal-muted hover:text-terminal-text'}`}>±{val}</button>
            ))}
            <button onClick={() => setShowFullChain(true)} className={`px-1.5 py-0.5 rounded transition ${showFullChain ? 'bg-terminal-card text-terminal-text font-bold shadow-subtle' : 'text-terminal-muted hover:text-terminal-text'}`}>Full</button>
          </div>
        </div>
      </div>

      {isBeginner && (
        <div className="bg-bull/10 border-b border-bull/20 px-3.5 py-1.5 text-xs text-terminal-text flex items-center justify-between font-sans">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-bull" />
            <span><strong>Beginner Mode:</strong> Green = Call Options | Red = Put Options. Click any strike to view details.</span>
          </span>
          <span className="text-[10px] text-bull font-bold hidden md:inline">Simplified View</span>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto max-h-[580px] no-scrollbar">
        <table className="w-full text-left border-collapse font-mono">
          <thead className="sticky top-0 z-20 bg-terminal-panel border-b border-terminal-border text-[10px] uppercase tracking-wider text-terminal-muted font-sans font-semibold">
            <tr>
              {isBeginner ? (
                <>
                  <th className="py-2 px-3 text-left text-bull font-bold bg-bull/10 border-r border-terminal-borderSubtle">Call Flow</th>
                  <th className="py-2 px-3 text-right text-bull font-bold bg-bull/15 border-r border-terminal-border">Call LTP</th>
                  <th className="py-2 px-3 text-center text-terminal-text font-bold bg-terminal-elevated border-r border-terminal-border">STRIKE</th>
                  <th className="py-2 px-3 text-left text-bear font-bold bg-bear/15 border-r border-terminal-borderSubtle">Put LTP</th>
                  <th className="py-2 px-3 text-right text-bear font-bold bg-bear/10">Put Flow</th>
                </>
              ) : isExpert ? (
                <>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">OI</th>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">ΔOI</th>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">Δ</th>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">Γ</th>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">IV</th>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">Θ</th>
                  <th className="py-2 px-2.5 text-right text-bull font-bold bg-bull/10 border-r border-terminal-border">Call LTP</th>
                  <th className="py-2 px-3 text-center text-terminal-text font-bold bg-terminal-elevated border-r border-terminal-border">STRIKE</th>
                  <th className="py-2 px-2.5 text-left text-bear font-bold bg-bear/10 border-r border-terminal-borderSubtle">Put LTP</th>
                  <th className="py-2 px-2 text-left text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">Θ</th>
                  <th className="py-2 px-2 text-left text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">IV</th>
                  <th className="py-2 px-2 text-left text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">Γ</th>
                  <th className="py-2 px-2 text-left text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">Δ</th>
                  <th className="py-2 px-2 text-right text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">ΔOI</th>
                  <th className="py-2 px-2 text-right text-bear font-bold bg-bear/5">OI</th>
                </>
              ) : (
                <>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">OI</th>
                  <th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">ΔOI</th>
                  {showGreeks && (<><th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">IV</th><th className="py-2 px-2 text-right text-bull font-bold bg-bull/5 border-r border-terminal-borderSubtle">Θ</th></>)}
                  <th className="py-2 px-2.5 text-right text-bull font-bold bg-bull/10 border-r border-terminal-border">Call LTP</th>
                  <th className="py-2 px-3 text-center text-terminal-text font-bold bg-terminal-elevated border-r border-terminal-border">STRIKE</th>
                  <th className="py-2 px-2.5 text-left text-bear font-bold bg-bear/10 border-r border-terminal-borderSubtle">Put LTP</th>
                  {showGreeks && (<><th className="py-2 px-2 text-left text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">Θ</th><th className="py-2 px-2 text-left text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">IV</th></>)}
                  <th className="py-2 px-2 text-right text-bear font-bold bg-bear/5 border-r border-terminal-borderSubtle">ΔOI</th>
                  <th className="py-2 px-2 text-right text-bear font-bold bg-bear/5">OI</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y divide-terminal-borderSubtle ${tableTextClass}`}>
            {filteredStrikes.map((s) => {
              const isAtm = s.strikePrice === atmStrike;
              const callDelta = s.callDelta ?? (s.strikePrice < spotPrice ? 0.65 : 0.35);
              const putDelta = s.putDelta ?? (s.strikePrice > spotPrice ? -0.65 : -0.35);
              const callGamma = s.callGamma ?? (isAtm ? 0.0032 : 0.0018);
              return (
                <tr key={s.strikePrice} ref={isAtm ? atmRowRef : null} onClick={() => { setSelectedStrikeForModal(s); setIsStrikeModalOpen(true); }} className={`transition-colors cursor-pointer group ${isAtm ? 'bg-accent-sky/10 font-bold border-y-2 border-accent-sky' : 'hover:bg-terminal-hover'}`}>
                  {isBeginner ? (
                    <>
                      <td className={`${rowPaddingClass} px-3 text-left border-r border-terminal-borderSubtle`}><span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${(s.callOIChangeTotal || 0) < 0 ? 'bg-bull/20 text-bull border border-bull/30' : 'bg-terminal-panel text-terminal-muted'}`}>{(s.callOIChangeTotal || 0) < 0 ? '🚀 High Inflow' : isAtm ? '⭐ ATM' : '🟡 Balanced'}</span></td>
                      <td className={`${rowPaddingClass} text-right font-black text-sm text-bull bg-bull/10 border-r border-terminal-border`}>₹{(s.callLtp || 0).toFixed(2)}</td>
                      <td className={`${rowPaddingClass} text-center font-bold text-terminal-text bg-terminal-panel border-r border-terminal-border ${isAtm ? 'bg-accent-sky/20 text-accent-sky shadow-subtle' : ''}`}>{s.strikePrice}</td>
                      <td className={`${rowPaddingClass} text-left font-black text-sm text-bear bg-bear/10 border-r border-terminal-borderSubtle`}>₹{(s.putLtp || 0).toFixed(2)}</td>
                      <td className={`${rowPaddingClass} px-3 text-right`}><span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${(s.putOIChangeTotal || 0) > 0 ? 'bg-bull/15 text-bull border border-bull/30' : 'bg-terminal-panel text-terminal-muted'}`}>{(s.putOIChangeTotal || 0) > 0 ? '🛡️ Floor' : isAtm ? '⭐ ATM' : '🟡 Normal'}</span></td>
                    </>
                  ) : isExpert ? (
                    <>
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{(s.callOI || 0).toLocaleString('en-IN')}</td>
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{(s.callOIChangeTotal || 0) > 0 ? '+' : ''}{(s.callOIChangeTotal || 0).toLocaleString('en-IN')}</td>
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle text-accent-cyan`}>{callDelta.toFixed(2)}</td>
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle text-accent-purple`}>{callGamma.toFixed(4)}</td>
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{getIvPill(s.callIv)}</td>
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{getThetaPill(s.callTheta)}</td>
                      <td className={`${rowPaddingClass} text-right font-bold text-bull bg-bull/10 border-r border-terminal-border`}>₹{(s.callLtp || 0).toFixed(2)}</td>
                      <td className={`${rowPaddingClass} text-center font-bold text-terminal-text bg-terminal-panel border-r border-terminal-border ${isAtm ? 'bg-accent-sky/20 text-accent-sky' : ''}`}>{s.strikePrice}</td>
                      <td className={`${rowPaddingClass} text-left font-bold text-bear bg-bear/10 border-r border-terminal-borderSubtle`}>₹{(s.putLtp || 0).toFixed(2)}</td>
                      <td className={`${rowPaddingClass} text-left border-r border-terminal-borderSubtle`}>{getThetaPill(s.putTheta)}</td>
                      <td className={`${rowPaddingClass} text-left border-r border-terminal-borderSubtle`}>{getIvPill(s.putIv)}</td>
                      <td className={`${rowPaddingClass} text-left border-r border-terminal-borderSubtle text-accent-purple`}>{callGamma.toFixed(4)}</td>
                      <td className={`${rowPaddingClass} text-left border-r border-terminal-borderSubtle text-accent-cyan`}>{putDelta.toFixed(2)}</td>
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{(s.putOIChangeTotal || 0) > 0 ? '+' : ''}{(s.putOIChangeTotal || 0).toLocaleString('en-IN')}</td>
                      <td className={`${rowPaddingClass} text-right`}>{(s.putOI || 0).toLocaleString('en-IN')}</td>
                    </>
                  ) : (
                    <>
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{(s.callOI || 0).toLocaleString('en-IN')}</td>
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{(s.callOIChangeTotal || 0) > 0 ? '+' : ''}{(s.callOIChangeTotal || 0).toLocaleString('en-IN')}</td>
                      {showGreeks && (<><td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{getIvPill(s.callIv)}</td><td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{getThetaPill(s.callTheta)}</td></>)}
                      <td className={`${rowPaddingClass} text-right font-bold text-bull bg-bull/10 border-r border-terminal-border`}>₹{(s.callLtp || 0).toFixed(2)}</td>
                      <td className={`${rowPaddingClass} text-center font-bold text-terminal-text bg-terminal-panel border-r border-terminal-border ${isAtm ? 'bg-accent-sky/20 text-accent-sky' : ''}`}>{s.strikePrice}</td>
                      <td className={`${rowPaddingClass} text-left font-bold text-bear bg-bear/10 border-r border-terminal-borderSubtle`}>₹{(s.putLtp || 0).toFixed(2)}</td>
                      {showGreeks && (<><td className={`${rowPaddingClass} text-left border-r border-terminal-borderSubtle`}>{getThetaPill(s.putTheta)}</td><td className={`${rowPaddingClass} text-left border-r border-terminal-borderSubtle`}>{getIvPill(s.putIv)}</td></>)}
                      <td className={`${rowPaddingClass} text-right border-r border-terminal-borderSubtle`}>{(s.putOIChangeTotal || 0) > 0 ? '+' : ''}{(s.putOIChangeTotal || 0).toLocaleString('en-IN')}</td>
                      <td className={`${rowPaddingClass} text-right`}>{(s.putOI || 0).toLocaleString('en-IN')}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2 border-t border-terminal-border bg-terminal-panel/40 flex items-center justify-between text-[11px] font-sans text-terminal-muted">
        <div className="flex items-center space-x-2">
          <span>ATM: <strong className="font-mono text-terminal-text">{atmStrike}</strong></span>
          <span>•</span>
          <span>Spot Distance: <strong className="font-mono text-terminal-text">{(spotPrice - atmStrike).toFixed(2)} pts</strong></span>
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
          symbol={selectedIndex}
          spotPrice={spotPrice}
          selectedExpiry={selectedExpiry || 'Current Expiry'}
          daysToExpiry={currentIndexState?.daysToExpiry ?? 2}
        />
      )}
    </div>
  );
};
