import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  Zap, 
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMarket } from '../context/MarketContext';
import { 
  OFFICIAL_MARKET_HOLIDAYS, 
  WEEKEND_HOLIDAYS_2026, 
  EXCHANGE_EXPIRY_RULES 
} from '../utils/marketHolidays';
import { DynamicExpiryService } from '../utils/dynamicExpiryService';

interface MarketHolidaysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketHolidaysModal: React.FC<MarketHolidaysModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'EXPIRIES' | 'HOLIDAYS' | 'RULES'>('EXPIRIES');
  const [exchangeFilter, setExchangeFilter] = useState<'ALL' | 'NSE' | 'BSE' | 'MCX'>('ALL');

  const { indices } = useMarket();

  // Dynamically computed asset expiry matrix based on real-time IST clock & exchange holiday calendar
  const assetExpiryMatrix = useMemo(() => {
    return DynamicExpiryService.getDynamicAssetExpiryMatrix(indices);
  }, [indices]);

  const niftyBenchmark = useMemo(() => assetExpiryMatrix.find(a => a.symbol === 'NIFTY 50'), [assetExpiryMatrix]);
  const sensexBenchmark = useMemo(() => assetExpiryMatrix.find(a => a.symbol === 'SENSEX'), [assetExpiryMatrix]);
  const stockBenchmark = useMemo(() => assetExpiryMatrix.find(a => a.symbol.includes('STOCKS')), [assetExpiryMatrix]);

  if (!isOpen) return null;

  const filteredHolidays = OFFICIAL_MARKET_HOLIDAYS.filter(h => {
    if (exchangeFilter === 'ALL') return true;
    if (exchangeFilter === 'NSE') return h.nseClosed;
    if (exchangeFilter === 'BSE') return h.bseClosed;
    if (exchangeFilter === 'MCX') return h.mcxMorningClosed || h.mcxEveningClosed;
    return true;
  });

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark 
            ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.7)]' 
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Top Header Bar */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">F&O Expiry Calendar & Market Holidays</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  NSE • BSE • MCX
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Official regulatory specifications, upcoming settlement dates, and 2026 exchange holiday schedule
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isDark 
                ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white' 
                : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex items-center justify-between px-5 py-2 border-b text-xs font-bold ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/40'
        }`}>
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('EXPIRIES')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'EXPIRIES'
                  ? 'bg-accent-sky/20 border border-accent-sky text-accent-sky font-extrabold'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Asset Expiry Radar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HOLIDAYS')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'HOLIDAYS'
                  ? 'bg-amber-500/20 border border-amber-500 text-amber-400 font-extrabold'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>2026 Holiday Calendar ({OFFICIAL_MARKET_HOLIDAYS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('RULES')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'RULES'
                  ? 'bg-purple-500/20 border border-purple-500 text-purple-400 font-extrabold'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SEBI & Exchange Rules</span>
            </button>
          </div>

          {activeTab === 'HOLIDAYS' && (
            <div className="hidden sm:flex items-center gap-1">
              {(['ALL', 'NSE', 'BSE', 'MCX'] as const).map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setExchangeFilter(ex)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                    exchangeFilter === ex
                      ? 'bg-slate-800 text-white border border-slate-600'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: ASSET EXPIRY RADAR */}
          {activeTab === 'EXPIRIES' && (
            <div className="space-y-4">
              {/* Highlight Notification Banner */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                isDark ? 'bg-sky-950/30 border-sky-800/60 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
              }`}>
                <Info className="w-4 h-4 text-accent-sky shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">SEBI Single-Benchmark Expiry Schedule Active</div>
                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-sky-300/80' : 'text-sky-800'}`}>
                    • <strong>NIFTY 50</strong> expires every <strong>Tuesday</strong>. Next upcoming expiry: <strong className="underline font-mono">{niftyBenchmark?.nextExpiry || '29-Sep-2026'} ({niftyBenchmark?.dte === 0 ? 'Expires Today' : `${niftyBenchmark?.dte} days left`})</strong>.<br />
                    • <strong>SENSEX</strong> expires every <strong>Thursday</strong>. Next upcoming expiry: <strong className="underline font-mono">{sensexBenchmark?.nextExpiry || '24-Sep-2026'} ({sensexBenchmark?.dte === 0 ? 'Expires Today' : `${sensexBenchmark?.dte} days left`})</strong>.<br />
                    • <strong>All NSE Stocks</strong> expire on the <strong>Last Tuesday</strong> of the month: <strong className="underline font-mono">{stockBenchmark?.nextExpiry || '29-Sep-2026'} ({stockBenchmark?.dte === 0 ? 'Expires Today' : `${stockBenchmark?.dte} days left`})</strong>.
                  </p>
                </div>
              </div>

              {/* Grid of All Assets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assetExpiryMatrix.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm">{item.symbol}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-500/15 border border-slate-500/30 text-slate-400">
                            {item.exchange}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-[10px] text-terminal-muted">DTE:</span>
                          <span className={`text-xs font-bold px-1.5 py-0.2 rounded border ${
                            item.dte === 0
                              ? 'bg-rose-600 text-white border-rose-500 animate-pulse font-black'
                              : item.dte <= 2 
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                              : item.dte <= 5
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                          }`}>
                            {item.dte === 0 ? '0DTE (Today)' : `${item.dte}d`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-xs">
                        <span className="text-terminal-muted">Current Active Expiry:</span>
                        <span className="font-mono font-bold text-accent-sky">{item.nextExpiry}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="text-terminal-muted">Subsequent Cycles:</span>
                        <span className="font-mono text-terminal-text text-right">{item.subsequent.slice(0, 2).join(' • ')}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-terminal-border/50 text-[10.5px] text-terminal-muted flex items-center justify-between">
                      <span>{item.frequency}</span>
                      <span className="italic">{item.note}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-terminal-muted italic">
                * Note: When a scheduled expiry falls on an exchange holiday (e.g. Dussehra on Oct 20), the contract settlement automatically moves to the preceding active trading day (Monday Oct 19).
              </p>
            </div>
          )}

          {/* TAB 2: 2026 OFFICIAL MARKET HOLIDAY CALENDAR */}
          {activeTab === 'HOLIDAYS' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-terminal-border">
                <table className="w-full text-left text-xs">
                  <thead className={`text-[11px] uppercase tracking-wider font-bold border-b ${
                    isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">Date & Day</th>
                      <th className="py-2.5 px-3">Holiday Description</th>
                      <th className="py-2.5 px-3 text-center">NSE / BSE</th>
                      <th className="py-2.5 px-3 text-center">MCX Morning</th>
                      <th className="py-2.5 px-3 text-center">MCX Evening</th>
                      <th className="py-2.5 px-3">Expiry Shift Impact</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                    {filteredHolidays.map((h, i) => (
                      <tr key={i} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-terminal-text">{h.date}</div>
                          <div className="text-[10px] text-terminal-muted font-sans">{h.day}</div>
                        </td>
                        <td className="py-2.5 px-3 font-sans font-semibold">
                          <div className="text-terminal-text">{h.name}</div>
                          <div className="text-[10px] text-terminal-muted font-normal">{h.description}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.nseClosed ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-400'
                          }`}>
                            {h.nseClosed ? 'CLOSED' : 'OPEN'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.mcxMorningClosed ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-400'
                          }`}>
                            {h.mcxMorningClosed ? 'CLOSED' : 'OPEN'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.mcxEveningClosed ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {h.mcxEveningClosed ? 'CLOSED' : 'OPEN 5 PM'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[11px] text-amber-500">
                          {h.day === 'Tuesday' ? 'Nifty Weekly / Stock Expiry moves to Mon' : h.day === 'Thursday' ? 'Sensex Weekly moves to Wed' : h.day === 'Monday' ? 'Midcap / Bankex moves to Fri' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Weekend Holidays Box */}
              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <span>2026 Holidays Falling on Saturday or Sunday</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {WEEKEND_HOLIDAYS_2026.map((wh, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-terminal-panel/50 border border-terminal-border/50">
                      <div>
                        <span className="font-bold">{wh.name}</span>
                        <span className="text-terminal-muted ml-1.5">({wh.date})</span>
                      </div>
                      <span className="text-[10px] font-mono text-terminal-muted">{wh.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SEBI & EXCHANGE RULES */}
          {activeTab === 'RULES' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {EXCHANGE_EXPIRY_RULES.map((rule, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-terminal-text">{rule.benchmark}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-sky/15 text-accent-sky border border-accent-sky/30">
                          {rule.segment}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-500 font-mono">
                        {rule.expiryDay}
                      </span>
                    </div>
                    <p className={`mt-2 text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {rule.rule}
                    </p>
                  </div>
                ))}
              </div>

              {/* Statutory Notice */}
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs space-y-1">
                <div className="font-bold text-purple-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SEBI Regulatory Framework on Index Derivatives</span>
                </div>
                <p className="text-[11px] text-terminal-muted leading-relaxed">
                  As per SEBI circular dated October 01, 2024 (effective from November 20, 2024 and expanded on September 01, 2025), each recognized stock exchange offers weekly options contracts only on its single benchmark index (Nifty 50 on NSE, Sensex on BSE). This measure was instituted to streamline market volatility, reduce excessive retail leverage, and align settlement risk.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <span className="text-terminal-muted text-[11px]">
            Data synced with official NSE, BSE & MCX Master Calendars (2026/2027).
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-accent-sky hover:bg-accent-sky/90 text-slate-950 font-bold transition cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
