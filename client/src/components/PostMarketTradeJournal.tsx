import React, { useState, useEffect, useMemo } from 'react';
import { useMarket, getApiBase } from '../context/MarketContext';
import type { 
  JournalTradeCall, 
  JournalSummaryMetrics, 
  JournalReportResponse, 
  AssetCategory 
} from '../types';
import { 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  ShieldAlert, 
  Zap, 
  Clock, 
  Layers, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  BarChart2, 
  Sparkles, 
  ChevronRight,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

interface Props {
  isModal?: boolean;
  onClose?: () => void;
}

export const PostMarketTradeJournal: React.FC<Props> = ({ isModal = false, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROFIT' | 'LOSS' | 'NEAR_TARGET' | 'ACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [report, setReport] = useState<JournalReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch Available Dates on Mount
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/api/journal/dates`);
        const json = await res.json();
        if (json.dates && Array.isArray(json.dates) && json.dates.length > 0) {
          setAvailableDates(json.dates);
          if (!selectedDate) {
            setSelectedDate(json.dates[0]);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load journal dates:', err.message);
      }
    };
    fetchDates();
  }, []);

  // Fetch Report whenever date, category, or status changes
  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiBase = getApiBase();
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`${apiBase}/api/journal/report?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json: JournalReportResponse = await res.json();
      setReport(json);
      if (json.availableDates && json.availableDates.length > 0) {
        setAvailableDates(json.availableDates);
      }
      if (!selectedDate && json.date) {
        setSelectedDate(json.date);
      }
    } catch (err: any) {
      console.error('Error fetching trade journal report:', err);
      setError('Could not load journal data. Please check server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDate, selectedCategory, statusFilter]);

  // Client-side text search filter
  const displayedSignals = useMemo(() => {
    if (!report?.signals) return [];
    if (!searchQuery.trim()) return report.signals;
    const q = searchQuery.toLowerCase();
    return report.signals.filter(s => 
      s.symbol.toLowerCase().includes(q) ||
      s.contractName.toLowerCase().includes(q) ||
      s.action.toLowerCase().includes(q) ||
      s.signalSource.toLowerCase().includes(q) ||
      s.timeFormatted.toLowerCase().includes(q)
    );
  }, [report?.signals, searchQuery]);

  const summary = report?.summary;

  const handleCopySummary = () => {
    if (!summary || !report) return;
    const text = `📊 Fayda Pro Trade Journal Summary (${report.date})
• Total Calls: ${summary.totalCalls}
• Win Rate: ${summary.winRatePct}%
• Near-Target Accuracy (≥80%): ${summary.nearTargetAccuracyPct}%
• Total Book Profit: +${summary.totalPointsProfit} pts
• Total Book Loss: -${summary.totalPointsLoss} pts
• Net P&L: ${summary.netPoints >= 0 ? '+' : ''}${summary.netPoints} pts
• Avg Risk-Reward: ${summary.avgRiskReward}
${summary.bestTrade ? `• Best Trade: ${summary.bestTrade.contractName} (+${summary.bestTrade.points} pts / +${summary.bestTrade.pnlPct}%)` : ''}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`bg-terminal-card border border-terminal-border rounded-2xl p-3 sm:p-5 text-terminal-text font-sans shadow-lg select-none ${isModal ? 'max-h-[88vh] overflow-y-auto' : ''}`}>
      {/* ========================================================================= */}
      {/* 1. Header Toolbar: Title, Date Selector Dropdown, Refresh & Copy Buttons */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-terminal-border/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40 shadow-sm shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-terminal-text tracking-tight flex items-center gap-2">
                Trade Journal & Predictions Audit
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-purple-500/20 text-purple-400 border border-purple-500/40">
                POST-MARKET LEDGER
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-terminal-muted mt-0.5 font-mono">
              Complete historical performance log of all trade calls, targets hit, stoplosses, and near-target reports.
            </p>
          </div>
        </div>

        {/* Date Dropdown & Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Date Selector Dropdown */}
          <div className="flex items-center space-x-1.5 bg-terminal-panel border border-terminal-border rounded-xl px-2.5 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-accent-cyan" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-terminal-text focus:outline-none cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d} className="bg-terminal-card text-terminal-text">
                  {d} {d === availableDates[0] ? '(Latest / Today)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Copy Summary Button */}
          <button
            onClick={handleCopySummary}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-terminal-panel hover:bg-terminal-border/60 text-terminal-muted hover:text-terminal-text text-xs font-mono font-semibold border border-terminal-border transition shadow-sm"
            title="Copy Report Summary to Clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-bull" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchReport}
            disabled={isLoading}
            className="p-2 rounded-xl bg-terminal-panel hover:bg-terminal-border/60 text-terminal-muted hover:text-terminal-text border border-terminal-border transition shadow-sm"
            title="Refresh Ledger"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-accent-cyan' : ''}`} />
          </button>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-bear/20 hover:bg-bear/30 text-bear border border-bear/40 text-xs font-bold font-mono transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Top Summary KPI Cards (Win Rate, Points Profit/Loss, Near-Target Acc)  */}
      {/* ========================================================================= */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 my-4">
          {/* Card 1: Win Rate % */}
          <div className="bg-terminal-panel/90 border border-terminal-border rounded-xl p-3 shadow-inner flex flex-col justify-between">
            <div className="flex items-center justify-between text-terminal-muted text-[10px] sm:text-xs font-mono uppercase font-bold">
              <span>Win Rate</span>
              <Award className="w-3.5 h-3.5 text-amber" />
            </div>
            <div className="mt-1 flex items-baseline space-x-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-bull tracking-tight">
                {summary.winRatePct}%
              </span>
              <span className="text-[10px] text-terminal-muted font-mono">
                ({summary.profitableCalls}W / {summary.lossCalls}L)
              </span>
            </div>
            <div className="w-full bg-terminal-bg h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-bull h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summary.winRatePct)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Net P&L Points */}
          <div className="bg-terminal-panel/90 border border-terminal-border rounded-xl p-3 shadow-inner flex flex-col justify-between">
            <div className="flex items-center justify-between text-terminal-muted text-[10px] sm:text-xs font-mono uppercase font-bold">
              <span>Net Points P&L</span>
              <TrendingUp className="w-3.5 h-3.5 text-bull" />
            </div>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${summary.netPoints >= 0 ? 'text-bull' : 'text-bear'}`}>
                {summary.netPoints >= 0 ? '+' : ''}{summary.netPoints.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-terminal-muted font-mono">pts</span>
            </div>
            <div className="flex items-center justify-between text-[9px] text-terminal-muted font-mono mt-1 pt-1 border-t border-terminal-border/60">
              <span className="text-bull">+{summary.totalPointsProfit} gain</span>
              <span className="text-bear">-{summary.totalPointsLoss} loss</span>
            </div>
          </div>

          {/* Card 3: Target Hit & Nearness Accuracy */}
          <div className="bg-terminal-panel/90 border border-terminal-border rounded-xl p-3 shadow-inner flex flex-col justify-between">
            <div className="flex items-center justify-between text-terminal-muted text-[10px] sm:text-xs font-mono uppercase font-bold">
              <span>Near-Target Acc</span>
              <Target className="w-3.5 h-3.5 text-accent-cyan" />
            </div>
            <div className="mt-1 flex items-baseline space-x-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-accent-cyan tracking-tight">
                {summary.nearTargetAccuracyPct}%
              </span>
              <span className="text-[10px] text-terminal-muted font-mono">
                (≥80% reached)
              </span>
            </div>
            <p className="text-[9px] text-terminal-muted mt-1 truncate">
              {summary.nearTargetCalls} calls within strike distance
            </p>
          </div>

          {/* Card 4: Total Calls & Avg Risk:Reward */}
          <div className="bg-terminal-panel/90 border border-terminal-border rounded-xl p-3 shadow-inner flex flex-col justify-between">
            <div className="flex items-center justify-between text-terminal-muted text-[10px] sm:text-xs font-mono uppercase font-bold">
              <span>Calls & R:R</span>
              <Layers className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-terminal-text tracking-tight">
                {summary.totalCalls}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">
                Avg R:R {summary.avgRiskReward}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[9px] font-mono text-terminal-muted mt-1">
              <span>{summary.categoryBreakdown.options.total} Opt</span>
              <span>•</span>
              <span>{summary.categoryBreakdown.stocks.total} Stk</span>
              <span>•</span>
              <span>{summary.categoryBreakdown.commodities.total} Com</span>
            </div>
          </div>

          {/* Card 5: Best Trade of the Day (Hidden on small screens) */}
          <div className="hidden lg:flex bg-terminal-panel/90 border border-terminal-border rounded-xl p-3 shadow-inner flex-col justify-between">
            <div className="flex items-center justify-between text-terminal-muted text-[10px] sm:text-xs font-mono uppercase font-bold">
              <span>Best Trade of Day</span>
              <Sparkles className="w-3.5 h-3.5 text-amber" />
            </div>
            {summary.bestTrade ? (
              <div className="mt-1">
                <div className="text-xs font-black font-mono text-terminal-text truncate">
                  🎯 {summary.bestTrade.contractName}
                </div>
                <div className="text-sm font-black font-mono text-bull mt-0.5">
                  +{summary.bestTrade.points} pts (+{summary.bestTrade.pnlPct}%)
                </div>
              </div>
            ) : (
              <span className="text-xs text-terminal-muted mt-1">No settled trades</span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Filters: Category Tabs (Options, Stocks, Commodities), Status, Search */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 my-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center bg-terminal-panel p-1 rounded-xl border border-terminal-border text-xs font-mono">
          {(['ALL', 'OPTIONS', 'STOCKS', 'COMMODITIES'] as AssetCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                selectedCategory === cat
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 shadow-sm'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <span>{cat === 'ALL' ? 'All Assets' : cat === 'OPTIONS' ? '⚡ Options (Indices)' : cat === 'STOCKS' ? '🏢 Stocks (Nifty 50)' : '🛢️ MCX Commodities'}</span>
            </button>
          ))}
        </div>

        {/* Status Filter Chips & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <div className="flex items-center space-x-1.5 bg-terminal-panel border border-terminal-border rounded-xl px-2.5 py-1.5 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-terminal-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-terminal-text focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-terminal-card">All Statuses</option>
              <option value="PROFIT" className="bg-terminal-card">🎯 Book Profit (Target Hit)</option>
              <option value="NEAR_TARGET" className="bg-terminal-card">⚡ Near Target (≥80%)</option>
              <option value="LOSS" className="bg-terminal-card">🛑 Book Loss (SL Hit)</option>
              <option value="ACTIVE" className="bg-terminal-card">⏳ Active / Open</option>
            </select>
          </div>

          {/* Quick Search */}
          <div className="flex items-center space-x-1.5 bg-terminal-panel border border-terminal-border rounded-xl px-2.5 py-1.5 text-xs font-mono flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-terminal-muted" />
            <input
              type="text"
              placeholder="Search symbol, strike..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-terminal-text placeholder:text-terminal-muted focus:outline-none w-28 sm:w-40 font-mono"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Trade Calls & Predictions Performance Table / Cards                    */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-terminal-muted space-y-3">
          <RotateCcw className="w-8 h-8 animate-spin text-accent-cyan" />
          <p className="text-xs font-mono">Loading date-wise predictions and target audit...</p>
        </div>
      ) : displayedSignals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-terminal-muted space-y-2 bg-terminal-panel/40 rounded-xl border border-dashed border-terminal-border my-2">
          <HelpCircle className="w-8 h-8 text-terminal-muted" />
          <p className="text-sm font-bold font-mono text-terminal-text">No Trade Calls Found for Selected Filter</p>
          <p className="text-xs font-mono max-w-md">
            Try switching the date, clearing the search query, or selecting 'All Assets' to view past recorded trade predictions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto my-2 rounded-xl border border-terminal-border/80 shadow-sm">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-terminal-panel text-terminal-muted text-[10px] uppercase font-bold border-b border-terminal-border">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Asset / Strike</th>
                <th className="py-2.5 px-3">Signal Source</th>
                <th className="py-2.5 px-3 text-right">Entry Zone</th>
                <th className="py-2.5 px-3 text-right">Target 1</th>
                <th className="py-2.5 px-3 text-right">Stop Loss</th>
                <th className="py-2.5 px-3 text-right">Peak LTP</th>
                <th className="py-2.5 px-3 text-right">Exit / LTP</th>
                <th className="py-2.5 px-3">Near-Target Progress</th>
                <th className="py-2.5 px-3 text-right">P&L (Booked)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border/50 bg-terminal-card/80">
              {displayedSignals.map((call) => {
                const isBull = call.action === 'BUY_CALL' || call.action === 'BUY';
                const isTargetHit = call.status === 'TARGET_HIT';
                const isSlHit = call.status === 'STOPLOSS_HIT';
                const isNearTarget = call.status === 'NEAR_TARGET' || call.nearTargetPct >= 80;

                return (
                  <tr 
                    key={call.id}
                    className="hover:bg-terminal-panel/50 transition duration-150"
                  >
                    {/* Time */}
                    <td className="py-3 px-3 whitespace-nowrap text-terminal-muted text-[11px]">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-accent-cyan shrink-0" />
                        <span>{call.timeFormatted}</span>
                      </div>
                    </td>

                    {/* Asset & Contract */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          isBull ? 'bg-bull/15 text-bull border border-bull/30' : 'bg-bear/15 text-bear border border-bear/30'
                        }`}>
                          {call.action}
                        </span>
                        <span className="font-bold text-terminal-text">
                          {call.contractName}
                        </span>
                      </div>
                      <span className="text-[9px] text-terminal-muted block mt-0.5">
                        {call.category}
                      </span>
                    </td>

                    {/* Signal Source */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border text-terminal-text text-[10px] font-bold">
                        {call.signalSource === 'OI_SURGE' ? '🔥 OI Surge' :
                         call.signalSource === 'HERO_ZERO' ? '🚀 0DTE Hero-Zero' :
                         call.signalSource === 'BREAKOUT' ? '⚡ Pattern Breakout' :
                         '🧠 Confluence Engine'}
                      </span>
                    </td>

                    {/* Entry Price */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-accent-cyan">
                      ₹{call.entryPrice.toFixed(2)}
                    </td>

                    {/* Target Price */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-bull">
                      ₹{call.target1Price.toFixed(2)}
                    </td>

                    {/* Stop Loss */}
                    <td className="py-3 px-3 text-right whitespace-nowrap text-bear">
                      ₹{call.stoplossPrice.toFixed(2)}
                    </td>

                    {/* Peak LTP Achieved */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-amber">
                      ₹{call.peakLtp.toFixed(2)}
                    </td>

                    {/* Exit / Current LTP */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-terminal-text">
                      ₹{(call.exitLtp || call.currentLtp).toFixed(2)}
                    </td>

                    {/* Near-Target Progress Bar & Explanation */}
                    <td className="py-3 px-3 min-w-[190px]">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={isTargetHit ? 'text-bull font-bold' : isNearTarget ? 'text-amber font-bold' : isSlHit ? 'text-bear' : 'text-terminal-muted'}>
                            {call.nearTargetDescription}
                          </span>
                          <span className="font-bold tabular-nums">
                            {call.nearTargetPct}%
                          </span>
                        </div>
                        {/* Progress track */}
                        <div className="w-full bg-terminal-panel h-1.5 rounded-full overflow-hidden border border-terminal-border/50">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isTargetHit ? 'bg-bull' : isNearTarget ? 'bg-amber' : isSlHit ? 'bg-bear' : 'bg-accent-cyan'
                            }`}
                            style={{ width: `${Math.max(4, Math.min(100, call.nearTargetPct))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* P&L / Outcome Badge */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {isTargetHit ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-bull/20 text-bull border border-bull/50 font-black shadow-sm text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>+{call.pointsPnl} pts (+{call.pnlPct}%)</span>
                        </span>
                      ) : isSlHit ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-bear/20 text-bear border border-bear/50 font-black text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{call.pointsPnl} pts ({call.pnlPct}%)</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg border font-bold text-[10px] ${
                          call.pointsPnl >= 0 ? 'bg-bull/10 text-bull border-bull/30' : 'bg-bear/10 text-bear border-bear/30'
                        }`}>
                          <span>{call.pointsPnl >= 0 ? '+' : ''}{call.pointsPnl} pts ({call.pnlPct}%)</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Footer Notes & Compliance Disclaimer                                   */}
      {/* ========================================================================= */}
      <div className="mt-3 pt-3 border-t border-terminal-border text-[10px] font-mono text-terminal-muted flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-bull animate-pulse" />
          <span>Automated Price Action & Confluence Journal Engine active</span>
        </div>
        <div>
          <span>Near-Target criteria evaluates peak favorable excursion vs Target 1 horizon.</span>
        </div>
      </div>
    </div>
  );
};
