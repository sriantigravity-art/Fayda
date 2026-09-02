import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { 
  Shield, 
  Target, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Flame,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { NtmClusterState, NtmStrikeRegime } from '../types';

export const NtmClusterRadar: React.FC = () => {
  const { currentIndexState } = useMarket();
  const { mode } = useTerminalMode();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!currentIndexState || !currentIndexState.ntmCluster) return null;

  const cluster: NtmClusterState = currentIndexState.ntmCluster;
  const {
    symbol,
    spotPrice,
    atmStrike,
    strikeStep,
    strikes,
    bullishStrikesCount,
    bearishStrikesCount,
    netBullishScorePct,
    netBearishScorePct,
    dominantRegime,
    consensusSignal,
    consensusDescription,
    resistanceWall,
    supportWall,
    clusterPcr
  } = cluster;

  const isBullishConsensus = consensusSignal === 'STRONG_BULLISH' || consensusSignal === 'BULLISH';
  const isBearishConsensus = consensusSignal === 'STRONG_BEARISH' || consensusSignal === 'BEARISH';

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'Long Buildup':
        return 'bg-bull/15 text-bull border-bull/40';
      case 'Short Buildup':
        return 'bg-bear/15 text-bear border-bear/40';
      case 'Short Covering':
        return 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40';
      case 'Long Unwinding':
        return 'bg-amber/15 text-amber border-amber/40';
      default:
        return 'bg-slate-100 dark:bg-terminal-panel text-terminal-muted border-slate-200 dark:border-terminal-border';
    }
  };

  return (
    <div className="w-full bg-white dark:bg-terminal-card border border-slate-200 dark:border-terminal-border rounded-2xl p-3.5 sm:p-4 shadow-xl select-none font-sans text-terminal-text transition-all duration-200">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-terminal-border/80">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl border shadow-sm ${
            isBullishConsensus
              ? 'bg-bull/15 text-bull border-bull/40'
              : isBearishConsensus
              ? 'bg-bear/15 text-bear border-bear/40'
              : 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40'
          }`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-terminal-text flex items-center gap-1.5">
                <span>ATM ±3 Strike Cluster Radar</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40">
                09:15 BASELINE ANCHORED
              </span>
            </div>
            <p className="text-[11px] text-terminal-muted font-mono mt-0.5">
              Aggregated Near-The-Money (NTM) multi-strike consensus scanning 7 immediate battleground strikes.
            </p>
          </div>
        </div>

        {/* Spot & ATM Chips */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <div className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-terminal-panel border border-slate-200 dark:border-terminal-border">
            <span className="text-terminal-muted text-[10px]">SPOT: </span>
            <span className="font-bold text-terminal-text">₹{spotPrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400 font-bold">
            <span className="text-[10px]">ATM: </span>
            <span>{atmStrike}</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-50 dark:bg-terminal-panel hover:bg-slate-100 dark:hover:bg-terminal-border/60 text-terminal-muted hover:text-terminal-text border border-slate-200 dark:border-terminal-border transition cursor-pointer"
            title="Toggle Strike Matrix"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Net Consensus & Key Walls Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-3">
        {/* Left: Net Consensus Gauge (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-50 dark:bg-terminal-panel/80 border border-slate-200 dark:border-terminal-border/80 rounded-xl p-3 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono uppercase border ${
                isBullishConsensus
                  ? 'bg-bull/20 text-bull border-bull/50 shadow-sm'
                  : isBearishConsensus
                  ? 'bg-bear/20 text-bear border-bear/50 shadow-sm'
                  : 'bg-amber/20 text-amber border-amber/50'
              }`}>
                {consensusSignal.replace('_', ' ')}
              </span>
              <span className="text-xs font-mono text-terminal-muted">
                Dominant: <strong className="text-terminal-text">{dominantRegime}</strong>
              </span>
            </div>
            <div className="text-xs font-mono font-bold">
              <span className="text-bull">{netBullishScorePct}% Bullish</span>
              <span className="text-terminal-muted mx-1.5">/</span>
              <span className="text-bear">{netBearishScorePct}% Bearish</span>
            </div>
          </div>

          {/* Progress Ratio Bar */}
          <div className="w-full bg-slate-200 dark:bg-terminal-panel h-2.5 rounded-full overflow-hidden flex border border-slate-300 dark:border-terminal-border">
            <div
              className="bg-bull h-full transition-all duration-500 shadow-sm"
              style={{ width: `${netBullishScorePct}%` }}
              title={`Bullish Signals: ${bullishStrikesCount}`}
            />
            <div
              className="bg-bear h-full transition-all duration-500 shadow-sm"
              style={{ width: `${netBearishScorePct}%` }}
              title={`Bearish Signals: ${bearishStrikesCount}`}
            />
          </div>

          <p className="text-[11px] font-mono text-terminal-text font-medium leading-tight">
            {consensusDescription}
          </p>
        </div>

        {/* Right: Institutional Support & Resistance Walls (5 Cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2">
          {/* Support Floor Wall */}
          <div className="bg-bull/5 border border-bull/30 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-bull">
              <span>Support Wall</span>
              <Shield className="w-3.5 h-3.5 text-bull" />
            </div>
            <div className="mt-1">
              <span className="text-base font-black font-mono text-terminal-text block">
                {supportWall.strike} PE
              </span>
              <span className="text-[10px] text-bull font-mono font-bold block">
                {supportWall.oiFormatted} Put OI
              </span>
            </div>
            <div className="text-[9px] text-terminal-muted font-mono mt-1 pt-1 border-t border-bull/20">
              {supportWall.distancePoints >= 0 ? `${supportWall.distancePoints} pts below spot` : 'At spot'}
            </div>
          </div>

          {/* Resistance Ceiling Wall */}
          <div className="bg-bear/5 border border-bear/30 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-bear">
              <span>Resistance Wall</span>
              <Target className="w-3.5 h-3.5 text-bear" />
            </div>
            <div className="mt-1">
              <span className="text-base font-black font-mono text-terminal-text block">
                {resistanceWall.strike} CE
              </span>
              <span className="text-[10px] text-bear font-mono font-bold block">
                {resistanceWall.oiFormatted} Call OI
              </span>
            </div>
            <div className="text-[9px] text-terminal-muted font-mono mt-1 pt-1 border-t border-bear/20">
              {resistanceWall.distancePoints >= 0 ? `${resistanceWall.distancePoints} pts above spot` : 'At spot'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Expandable 7-Strike Near-The-Money Matrix */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-terminal-border/80 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-terminal-panel text-terminal-muted text-[10px] uppercase font-bold border-b border-slate-200 dark:border-terminal-border">
              <tr>
                <th className="py-2 px-2.5 text-left">Call Regime</th>
                <th className="py-2 px-2 text-right">Call LTP</th>
                <th className="py-2 px-2 text-right">Call OI Δ%</th>
                <th className="py-2 px-3 text-center bg-slate-100 dark:bg-terminal-panel/90 font-black">Strike</th>
                <th className="py-2 px-2 text-left">Put OI Δ%</th>
                <th className="py-2 px-2 text-left">Put LTP</th>
                <th className="py-2 px-2.5 text-right">Put Regime</th>
                <th className="py-2 px-2 text-right">PCR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-terminal-border/40">
              {strikes.map((s) => {
                const isAtm = s.isAtm;
                return (
                  <tr
                    key={s.strikePrice}
                    className={`hover:bg-slate-50/80 dark:hover:bg-terminal-panel/40 transition duration-150 ${
                      isAtm ? 'bg-accent-cyan/5 font-bold' : ''
                    }`}
                  >
                    {/* Call Regime */}
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${getRegimeColor(s.call.regime)}`}>
                        <span>{s.call.visualEmoji}</span>
                        <span>{s.call.regime}</span>
                      </span>
                    </td>

                    {/* Call LTP */}
                    <td className="py-2 px-2 text-right whitespace-nowrap text-terminal-text font-bold">
                      ₹{s.call.ltp.toFixed(1)}
                    </td>

                    {/* Call OI Δ% */}
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <span className={`font-bold text-[11px] ${s.call.oiChangePct >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {s.call.oiChangePct >= 0 ? '+' : ''}{s.call.oiChangePct}%
                      </span>
                    </td>

                    {/* Strike Price Badge */}
                    <td className="py-2 px-3 text-center whitespace-nowrap bg-slate-50/60 dark:bg-terminal-panel/60">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                        isAtm
                          ? 'bg-accent-cyan text-slate-950 shadow-sm'
                          : 'text-terminal-text'
                      }`}>
                        {s.strikePrice} {isAtm ? '🎯 ATM' : ''}
                      </span>
                    </td>

                    {/* Put OI Δ% */}
                    <td className="py-2 px-2 text-left whitespace-nowrap">
                      <span className={`font-bold text-[11px] ${s.put.oiChangePct >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {s.put.oiChangePct >= 0 ? '+' : ''}{s.put.oiChangePct}%
                      </span>
                    </td>

                    {/* Put LTP */}
                    <td className="py-2 px-2 text-left whitespace-nowrap text-terminal-text font-bold">
                      ₹{s.put.ltp.toFixed(1)}
                    </td>

                    {/* Put Regime */}
                    <td className="py-2 px-2.5 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${getRegimeColor(s.put.regime)}`}>
                        <span>{s.put.visualEmoji}</span>
                        <span>{s.put.regime}</span>
                      </span>
                    </td>

                    {/* Strike PCR */}
                    <td className="py-2 px-2 text-right whitespace-nowrap font-bold text-[10px] text-accent-cyan">
                      {s.pcr.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Mode-Adaptive Context Explanation */}
      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-terminal-border/80 text-[11px] font-sans flex items-start gap-2 text-terminal-muted">
        <Info className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
        <div>
          {mode === 'BEGINNER' ? (
            <p>
              <strong className="text-terminal-text">Beginner Guide:</strong> The <strong>ATM ±3 Cluster</strong> shows where big institutional traders are placing their money right around the current price. When more green boxes appear on Put options, it means institutions are creating a solid floor (support) preventing the market from falling.
            </p>
          ) : mode === 'TECHNICAL' ? (
            <p>
              <strong className="text-terminal-text">Technical Radar:</strong> The 7-strike NTM cluster filters far-OTM noise by calculating cumulative delta from the 09:15 AM baseline. Minimum ≥50% OI surge signifies high-conviction institutional accumulation or wall formation.
            </p>
          ) : (
            <p>
              <strong className="text-terminal-text">Quantitative Derivatives:</strong> Aggregated Near-The-Money delta cluster (PCR NTM = {clusterPcr.toFixed(2)}) evaluates gamma positioning and trapped dealer exposure across key delta intervals (0.30 ≤ Δ ≤ 0.70).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(NtmClusterRadar);
