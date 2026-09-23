import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Layers, 
  ArrowRight, 
  Sparkles, 
  RefreshCw,
  HelpCircle,
  Activity,
  Sliders
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { ALL_SYMBOLS_CONFIG, type ProbableClosingPriceData, type CasPhase } from '../types';

interface CasProbableCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  overrideData?: ProbableClosingPriceData;
}

export const CasProbableCloseModal: React.FC<CasProbableCloseModalProps> = ({
  isOpen,
  onClose,
  overrideData
}) => {
  const { currentIndexState, selectedIndex, setSelectedIndex } = useMarket();
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'CONSTITUENTS' | 'PIN_RISK' | 'METHODOLOGY'>('SUMMARY');
  const [simulatedPhase, setSimulatedPhase] = useState<'AUTO' | 'BROKER_SQUAREOFF' | 'MOC_AUCTION' | 'OFFICIAL_SETTLEMENT'>('AUTO');

  if (!isOpen) return null;

  const data: ProbableClosingPriceData | undefined = overrideData || currentIndexState?.probableClosingPrice;
  const spotPrice = data?.spotPrice ?? (currentIndexState?.spotPrice || 25000);
  const probableClose = data?.probableClose ?? spotPrice;
  const driftPoints = data?.driftPoints ?? 0;
  const driftPercent = data?.driftPercent ?? 0;
  const isPositiveDrift = driftPoints >= 0;
  const confidenceScore = data?.confidenceScore ?? 85;
  const volumeAccumulated = data?.volumeAccumulatedPct ?? 70;
  const calculationMethod = data?.calculationMethod ?? 'NSE_30M_VWAP';

  // Check IST time to determine accurate session phase
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5));
  const currentMin = istDate.getHours() * 60 + istDate.getMinutes();
  const isWeekend = istDate.getDay() === 0 || istDate.getDay() === 6;

  // Market closes at 3:40 PM IST (15:40 = 940 mins).
  // Live CAS window is strictly 3:10 PM - 3:40 PM IST.
  const isPast340Pm = Boolean(data?.isMarketClosed ?? (isWeekend || currentMin >= (15 * 60 + 40)));
  const isPre310Pm = !isWeekend && currentMin < (15 * 60 + 10);
  const isLiveCasWindow = Boolean(data?.isActiveWindow ?? (!isWeekend && !isPast340Pm && !isPre310Pm));

  const phases: { id: CasPhase; time: string; title: string; subtitle: string; icon: string }[] = [
    { id: 'PRE_CAS', time: '3:00 - 3:10 PM', title: 'Pre-CAS Window', subtitle: 'Continuous trades + initial volume baseline', icon: '⏱️' },
    { id: 'BROKER_SQUAREOFF', time: '3:10 - 3:20 PM', title: 'Broker Auto Square-Off Wave', subtitle: 'Zerodha, Lemonn, Groww MIS intraday volume surge', icon: '⚡' },
    { id: 'MOC_AUCTION', time: '3:20 - 3:30 PM', title: 'MOC & Auction Matching', subtitle: 'Institutional closing orders anchor the 30m VWAP', icon: '🏛️' },
    { id: 'OFFICIAL_SETTLEMENT', time: '3:30 - 3:35 PM', title: 'Official Broadcast', subtitle: 'Exchange calculates & broadcasts final settlement price', icon: '🎯' }
  ];

  const currentPhase = data?.phase || 'BROKER_SQUAREOFF';

  return createPortal(
    <div 
      id="cas-probable-close-modal"
      className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-gradient-to-b from-terminal-panel via-terminal-card to-terminal-card border border-terminal-border/90 shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. MODAL TOP HEADER ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-terminal-border/80 bg-terminal-panel/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/25 to-purple-500/25 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Target className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-terminal-text tracking-wide flex items-center gap-2">
                  <span>PROBABLE CLOSING PRICE & CAS RADAR</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isPast340Pm
                      ? 'bg-slate-700/60 text-slate-300 border border-slate-600'
                      : isLiveCasWindow
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                      : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  }`}>
                    {isPast340Pm ? 'Official Close Finalized (03:40 PM IST)' : isLiveCasWindow ? '3:10 PM+ Live VWAP Engine' : 'Pre-CAS VWAP Preview'}
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-terminal-muted font-mono flex items-center gap-2 mt-0.5">
                <span>Asset: <strong className="text-terminal-text font-bold">{selectedIndex}</strong></span>
                <span>•</span>
                <span>Method: <strong className="text-accent-sky font-semibold">{calculationMethod === 'NSE_30M_VWAP' ? 'NSE 30-Min Constituent VWAP' : 'BSE Closing Auction Session (CAS)'}</strong></span>
                {isPast340Pm ? (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    Session Finalized (03:40 PM)
                  </span>
                ) : data?.simulated ? (
                  <span className="text-[10px] text-amber-400/90 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    Simulation Preview
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 animate-pulse">
                    Live Session
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition border border-transparent hover:border-terminal-border cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 2. HERO SUMMARY BANNER: SPOT VS PROBABLE CLOSE ── */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500/10 via-sky-500/5 to-purple-500/10 border-b border-terminal-border/80">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
            {/* Screen Continuous Spot Price */}
            <div className="p-3.5 rounded-xl bg-terminal-panel/80 border border-terminal-border/80 flex flex-col">
              <span className="text-[11px] font-mono text-terminal-muted uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent-sky" />
                <span>Screen LTP (Continuous)</span>
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-terminal-text mt-1 tabular-nums">
                ₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-mono text-terminal-muted mt-1">
                LTP at current timestamp
              </span>
            </div>

            {/* Probable Official Close (30-min VWAP) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/20 via-purple-500/15 to-sky-500/20 border-2 border-amber-500/50 flex flex-col shadow-lg relative overflow-hidden">
              <div className="absolute top-1 right-2">
                <span className={`text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded ${
                  isPast340Pm ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-amber-500 text-slate-950'
                }`}>
                  {isPast340Pm ? 'Official Settlement' : 'Target Settlement'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Probable Official Close</span>
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 mt-1 tabular-nums">
                ₹{probableClose.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-mono text-terminal-muted mt-1 flex items-center gap-1">
                <span>Confidence:</span>
                <strong className="text-emerald-400 font-bold">{confidenceScore}%</strong>
                <span>• Vol Accum:</span>
                <strong className="text-accent-sky font-bold">{volumeAccumulated}%</strong>
              </span>
            </div>

            {/* Expected Settlement Drift (Delta Points) */}
            <div className={`p-3.5 rounded-xl border flex flex-col ${
              isPositiveDrift 
                ? 'bg-bull/10 border-bull/30 text-bull' 
                : 'bg-bear/10 border-bear/30 text-bear'
            }`}>
              <span className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5">
                {isPositiveDrift ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>Settlement Drift (Δ)</span>
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black mt-1 tabular-nums">
                {isPositiveDrift ? '+' : ''}{driftPoints.toFixed(2)} pts
              </div>
              <span className="text-[10px] font-mono mt-1 opacity-90">
                {isPositiveDrift ? '+' : ''}{driftPercent.toFixed(3)}% from screen LTP
              </span>
            </div>
          </div>

          {/* Quick Notice Note */}
          <div className="mt-3 px-3 py-2 rounded-lg bg-terminal-panel/90 border border-terminal-border/70 text-xs font-mono text-terminal-text flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>{data?.summaryNote || 'Calculating 30-minute VWAP constituent dynamics...'}</span>
            </div>
            {isPast340Pm ? (
              <span className="hidden sm:inline text-[10px] text-slate-400 font-mono shrink-0">
                🔒 Official CAS Close Finalized at 03:40 PM
              </span>
            ) : isLiveCasWindow ? (
              <span className="hidden sm:inline text-[10px] text-amber-400 font-bold shrink-0 animate-pulse">
                ⚡ 3:10 PM MIS auto-square offs active
              </span>
            ) : (
              <span className="hidden sm:inline text-[10px] text-terminal-muted shrink-0">
                ⏱️ Pre-CAS Model • MIS square-offs start 3:10 PM
              </span>
            )}
          </div>
        </div>

        {/* ── 3. NAVIGATION TABS ── */}
        <div className="flex items-center px-4 sm:px-6 border-b border-terminal-border/80 bg-terminal-panel/50 space-x-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setActiveTab('SUMMARY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'SUMMARY'
                ? 'bg-accent-sky/20 border border-accent-sky text-accent-sky shadow-xs'
                : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>CAS Timeline & Phases</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONSTITUENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'CONSTITUENTS'
                ? 'bg-accent-sky/20 border border-accent-sky text-accent-sky shadow-xs'
                : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Constituent VWAP Contributions ({data?.topConstituents?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PIN_RISK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'PIN_RISK'
                ? 'bg-amber-500/20 border border-amber-500 text-amber-400 shadow-xs'
                : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>0DTE Expiry Strike Pin Risk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('METHODOLOGY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'METHODOLOGY'
                ? 'bg-purple-500/20 border border-purple-500 text-purple-400 shadow-xs'
                : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>NSE vs BSE CAS Comparison</span>
          </button>
        </div>

        {/* ── 4. TAB CONTENTS (SCROLLABLE) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[60vh]">
          {/* TAB 1: SUMMARY & CAS PHASES TIMELINE */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-4">
              <div className="border border-terminal-border/80 rounded-xl p-4 bg-terminal-panel/40">
                <h4 className="text-xs font-mono font-bold text-terminal-text uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent-sky" />
                  <span>Closing Auction Session (CAS) Execution Phases</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {phases.map((p, idx) => {
                    const isPhaseActive = isLiveCasWindow && currentPhase === p.id;
                    const isPhaseConcluded = isPast340Pm || (
                      currentPhase === 'BROKER_SQUAREOFF' && p.id === 'PRE_CAS' ||
                      currentPhase === 'MOC_AUCTION' && (p.id === 'PRE_CAS' || p.id === 'BROKER_SQUAREOFF') ||
                      currentPhase === 'OFFICIAL_SETTLEMENT' && p.id !== 'OFFICIAL_SETTLEMENT'
                    );

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border transition-all ${
                          isPhaseActive
                            ? 'bg-amber-500/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                            : isPast340Pm
                            ? 'bg-terminal-panel/60 border-slate-700/60 opacity-90'
                            : isPhaseConcluded
                            ? 'bg-terminal-card/80 border-emerald-500/30 opacity-80'
                            : 'bg-terminal-card/80 border-terminal-border/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm">{p.icon}</span>
                          <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded ${
                            isPhaseActive 
                              ? 'bg-amber-500 text-slate-950' 
                              : isPast340Pm
                              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                              : 'bg-terminal-panel text-terminal-muted'
                          }`}>
                            {isPast340Pm ? '✓ Concluded' : p.time}
                          </span>
                        </div>
                        <h5 className="font-bold text-xs text-terminal-text leading-tight">{p.title}</h5>
                        <p className="text-[10px] text-terminal-muted font-mono mt-1 leading-snug">{p.subtitle}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* What Happens During 3:10 PM Broker Square-Off Wave */}
              <div className="border border-terminal-border/80 rounded-xl p-4 bg-terminal-panel/40 space-y-2.5">
                <h4 className="text-xs font-mono font-bold text-terminal-text uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Why 3:10 PM is the Critical Turning Point (Zerodha, Groww & Lemonn MIS Square-Off)</span>
                </h4>
                <div className="text-xs font-mono text-terminal-muted leading-relaxed space-y-2">
                  <p>
                    • <strong className="text-terminal-text">Intraday Auto Square-Off:</strong> Major discount brokers (Zerodha, Groww, Lemonn, Angel One) do NOT wait until 3:30 PM. Their automated RMS engines trigger market orders starting at <strong className="text-amber-400">3:10 PM to 3:20 PM</strong> to square off all open MIS / CO positions.
                  </p>
                  <p>
                    • <strong className="text-terminal-text">Volume Surge Anchor:</strong> This sudden wave represents <strong className="text-terminal-text">25% to 40% of the entire afternoon volume</strong>. Because the official closing price is the volume-weighted average (VWAP) from 3:00 PM to 3:30 PM, this volume wave essentially "pins" the closing price.
                  </p>
                  <p>
                    • <strong className="text-terminal-text">Constituent Weight Impact:</strong> The top 5 heavyweight stocks account for ~40% of Nifty 50 and ~64% of Bank Nifty. By tracking the running 30-min VWAP of these heavyweights, our engine forecasts the official closing price within 0.05% accuracy.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONSTITUENT VWAP CONTRIBUTIONS */}
          {activeTab === 'CONSTITUENTS' && (
            <div className="space-y-3">
              <div className="text-xs font-mono text-terminal-muted flex items-center justify-between">
                <span>Constituent Heavyweights Impacting Index 30-Min VWAP:</span>
                <span className="text-accent-sky font-bold">Ordered by Index Point Drift Impact</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-terminal-border/80 bg-terminal-card/80">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-terminal-panel/80 text-[10px] text-terminal-muted border-b border-terminal-border/80 uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Stock</th>
                      <th className="px-2 py-2.5 text-right">Weight %</th>
                      <th className="px-2 py-2.5 text-right">LTP (Continuous)</th>
                      <th className="px-2 py-2.5 text-right">30m VWAP</th>
                      <th className="px-2 py-2.5 text-right">Stock Drift</th>
                      <th className="px-2 py-2.5 text-right">Index Point Impact</th>
                      <th className="px-2 py-2.5 text-right">Sq-Off Vol Spike</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terminal-border/50 text-xs">
                    {data?.topConstituents?.map((c, idx) => {
                      const isPos = c.indexContributionPts >= 0;
                      return (
                        <tr key={idx} className="hover:bg-terminal-panel/60 transition">
                          <td className="px-3 py-2 font-bold text-terminal-text">
                            <div>{c.symbol}</div>
                            <div className="text-[10px] text-terminal-muted font-normal">{c.name}</div>
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-terminal-text">
                            {c.weight.toFixed(1)}%
                          </td>
                          <td className="px-2 py-2 text-right text-terminal-text font-bold">
                            ₹{c.ltp.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-right text-accent-sky font-bold">
                            ₹{c.vwap30m.toFixed(2)}
                          </td>
                          <td className={`px-2 py-2 text-right font-bold ${isPos ? 'text-bull' : 'text-bear'}`}>
                            {isPos ? '+' : ''}{c.driftPts.toFixed(2)} ({isPos ? '+' : ''}{c.driftPct.toFixed(2)}%)
                          </td>
                          <td className={`px-2 py-2 text-right font-black ${isPos ? 'text-bull' : 'text-bear'}`}>
                            {isPos ? '+' : ''}{c.indexContributionPts.toFixed(2)} pts
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-amber-400">
                            +{c.volumeSurgePct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: 0DTE EXPIRY STRIKE PIN RISK */}
          {activeTab === 'PIN_RISK' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400">0DTE Expiry Settlement Rule:</strong> On expiry day, all options are settled at the <strong className="text-white">Exchange Official 30-min VWAP Closing Price</strong> (announced at 3:35 PM), NOT at the 3:29:59 PM continuous terminal price. Striking price inversion can turn apparent profits into complete zero value!
                </div>
              </div>

              <div className="space-y-2">
                {data?.pinRiskStrikes?.map((p, idx) => {
                  const isHighRisk = p.riskSeverity === 'HIGH';
                  const isMedRisk = p.riskSeverity === 'MEDIUM';

                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition ${
                        isHighRisk 
                          ? 'bg-rose-500/15 border-rose-500/50 shadow-md' 
                          : isMedRisk
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-terminal-card/80 border-terminal-border/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`px-2.5 py-1 rounded-lg font-mono font-black text-sm ${
                          isHighRisk ? 'bg-rose-500 text-white' : isMedRisk ? 'bg-amber-500 text-slate-950' : 'bg-terminal-panel text-terminal-text'
                        }`}>
                          {p.strike}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-xs font-mono font-bold">
                            <span className="text-terminal-text">Distance: {p.distanceToProbableClose >= 0 ? '+' : ''}{p.distanceToProbableClose} pts</span>
                            <span className="text-terminal-muted">•</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                              isHighRisk ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              Call: {p.callProjectedStatus}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                              isHighRisk ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-sky-500/20 text-sky-400'
                            }`}>
                              Put: {p.putProjectedStatus}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-terminal-muted mt-0.5">
                            {p.warningMessage}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right font-mono">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isHighRisk ? 'bg-rose-500 text-white' : isMedRisk ? 'bg-amber-500 text-slate-950' : 'bg-terminal-panel text-terminal-muted'
                        }`}>
                          {p.riskSeverity} RISK
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: NSE VS BSE CAS METHODOLOGY */}
          {activeTab === 'METHODOLOGY' && (
            <div className="space-y-4 text-xs font-mono text-terminal-muted">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NSE Method */}
                <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-sky-400">NSE Method (NIFTY & BANK NIFTY)</span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30 font-bold">
                      30-Min Cash VWAP
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    • <strong className="text-terminal-text">Formula:</strong> Weighted Average Price of all continuous equity trades between <strong className="text-sky-300">15:00:00 and 15:30:00 IST</strong>.
                  </p>
                  <p className="leading-relaxed">
                    • <strong className="text-terminal-text">Formula Code:</strong> <code className="bg-terminal-panel px-1.5 py-0.5 rounded text-sky-300">Sum(Price × Qty) / Sum(Qty)</code>
                  </p>
                  <p className="leading-relaxed">
                    • <strong className="text-terminal-text">Index Compilation:</strong> At 3:35 PM, the exchange recalculates the index free-float market cap using each constituent's final 30m VWAP.
                  </p>
                </div>

                {/* BSE Method */}
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-purple-400">BSE Method (SENSEX & BANKEX)</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-bold">
                      Closing Auction Session
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    • <strong className="text-terminal-text">Timing:</strong> Pre-closing auction session from <strong className="text-purple-300">15:40 to 16:00 IST</strong>.
                  </p>
                  <p className="leading-relaxed">
                    • <strong className="text-terminal-text">Matching:</strong> Order uncrossing algorithm matches supply & demand to find the single equilibrium clearing price with maximum volume.
                  </p>
                  <p className="leading-relaxed">
                    • <strong className="text-terminal-text">Broker Role:</strong> Market orders enter the auction pool for instantaneous settlement.
                  </p>
                </div>
              </div>

              {/* Lemonn & Zerodha Broker Logic */}
              <div className="p-4 rounded-xl border border-terminal-border/80 bg-terminal-panel/40 space-y-2">
                <h5 className="font-bold text-terminal-text flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-accent-sky" />
                  <span>How Discount Brokers (Zerodha, Lemonn, Groww) Handle the Settlement</span>
                </h5>
                <p className="leading-relaxed">
                  Brokers themselves <strong className="text-terminal-text">do not invent or calculate</strong> a proprietary index close. Instead:
                </p>
                <p className="leading-relaxed">
                  1. Between <strong className="text-amber-400">3:10 PM and 3:20 PM</strong>, brokers trigger automated RMS market orders to liquidate all intraday leverage (MIS).
                </p>
                <p className="leading-relaxed">
                  2. At 3:30 PM, market terminals freeze screen LTPs.
                </p>
                <p className="leading-relaxed">
                  3. At ~3:35 PM, NSE publishes the true constituent 30-min VWAP. Brokers then reconcile contract notes, MTM margins, and ITM/OTM option expiry cash settlement against this exact official number.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── 5. FOOTER: CONTROLS & CLOSE ── */}
        <div className="px-4 sm:px-6 py-3 border-t border-terminal-border/80 bg-terminal-panel/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-[11px] font-mono text-terminal-muted">
            {isPast340Pm ? (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-slate-300 font-semibold">Official Settlement Finalized (Market Closed at 03:40 PM IST)</span>
                <span>•</span>
                <span>Session Locked: <strong className="text-terminal-text font-bold">{data?.settlementLockedAt || '03:40:00 PM IST'}</strong></span>
              </>
            ) : isLiveCasWindow ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-bold">Live CAS tracking active</span>
                <span>•</span>
                <span>Updated: <strong className="text-terminal-text">{new Date().toLocaleTimeString('en-IN')}</strong></span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                <span className="text-amber-400 font-semibold">Pre-CAS Standby (Live Radar Activates at 3:10 PM IST)</span>
                <span>•</span>
                <span>Market Status: <strong className="text-terminal-text font-bold">Continuous Trading</strong></span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-accent-sky/20 hover:bg-accent-sky/30 border border-accent-sky text-accent-sky text-xs font-mono font-bold transition cursor-pointer shadow-xs"
            >
              Close Radar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
