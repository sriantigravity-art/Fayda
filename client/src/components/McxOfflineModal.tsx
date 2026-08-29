import React, { useEffect, useState, useCallback } from 'react';
import { X, AlertTriangle, Clock, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Coins, Droplets, Flame, Zap } from 'lucide-react';

interface McxOfflineQuote {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  pctChange: number;
  prevClose: number;
  high: number;
  low: number;
  volume?: number;
  unit: string;
  source: 'MCX_WEBSITE' | 'IBJA_CACHED';
  settlementDate: string;
}

interface McxIcomdexIndex {
  name: string;
  value: number;
  change: number;
  pctChange: number;
}

interface McxOfflineData {
  commodities: McxOfflineQuote[];
  icomdex: McxIcomdexIndex[];
  marketStatus: 'CLOSED' | 'HOLIDAY' | 'PRE_OPEN';
  lastUpdated: string;
  closingDate: string;
}

interface Props {
  symbol: string;          // The commodity symbol user clicked (e.g. "GOLD")
  onClose: () => void;
  onProceedAnyway: () => void;  // Let the user see the (offline) chain anyway
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const COMMODITY_ICONS: Record<string, React.ReactNode> = {
  GOLD:       <Coins className="w-4 h-4 text-amber-400" />,
  SILVER:     <Coins className="w-4 h-4 text-slate-300" />,
  CRUDEOIL:   <Droplets className="w-4 h-4 text-orange-400" />,
  NATURALGAS: <Flame className="w-4 h-4 text-cyan-400" />,
  COPPER:     <Zap className="w-4 h-4 text-orange-300" />,
};

const STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  CLOSED:   { label: 'MARKET CLOSED',  color: 'text-bear',      desc: 'MCX trading session has ended (after 11:30 PM IST)' },
  HOLIDAY:  { label: 'MARKET HOLIDAY', color: 'text-amber',     desc: 'MCX is closed today (Saturday / Sunday / Holiday)' },
  PRE_OPEN: { label: 'PRE-OPEN',       color: 'text-amber',     desc: 'MCX Pre-open session. Trading begins at 9:00 AM IST' },
};

const fmtINR = (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

export const McxOfflineModal: React.FC<Props> = ({ symbol, onClose, onProceedAnyway }) => {
  const [data, setData] = useState<McxOfflineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mcxStatus, setMcxStatus] = useState<string>('CLOSED');

  const fetchOfflineData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, dataRes] = await Promise.all([
        fetch(`${API_BASE}/api/mcx-status`),
        fetch(`${API_BASE}/api/mcx-offline`)
      ]);
      if (statusRes.ok) {
        const s = await statusRes.json();
        setMcxStatus(s.status || 'CLOSED');
      }
      if (!dataRes.ok) throw new Error('Failed to load MCX data');
      const d: McxOfflineData = await dataRes.json();
      setData(d);
    } catch (e: any) {
      setError(e.message || 'Could not load offline data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOfflineData();
  }, [fetchOfflineData]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const statusInfo = STATUS_LABELS[mcxStatus] || STATUS_LABELS['CLOSED'];
  const clickedCommodity = data?.commodities.find(c => c.symbol === symbol);
  const otherCommodities = data?.commodities.filter(c => c.symbol !== symbol) || [];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-terminal-card border-2 border-bear/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-mono">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-bear/20 via-terminal-panel to-terminal-panel border-b border-bear/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bear/20 border border-bear/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-bear" />
            </div>
            <div>
              <div className="text-sm font-black text-terminal-text uppercase tracking-widest">
                MCX Commodity Market
              </div>
              <div className={`text-xs font-bold ${statusInfo.color} flex items-center gap-1.5 mt-0.5`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {statusInfo.label}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-border/40 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Status Banner ── */}
        <div className="px-5 py-3 bg-amber/5 border-b border-amber/20 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-amber font-semibold">{statusInfo.desc}</p>
            <p className="text-[11px] text-terminal-muted mt-0.5">
              MCX trading hours: <span className="text-terminal-text font-semibold">Monday–Friday, 9:00 AM – 11:30 PM IST</span>
              {' '}· <span className="text-terminal-text font-semibold">Commodity data below is last settlement</span>
            </p>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">

          {loading && (
            <div className="flex items-center justify-center py-12 gap-3">
              <RefreshCw className="w-5 h-5 text-accent-cyan animate-spin" />
              <span className="text-sm text-terminal-muted">Fetching last settlement data from MCX / IBJA…</span>
            </div>
          )}

          {error && !loading && (
            <div className="px-5 py-8 text-center">
              <AlertTriangle className="w-8 h-8 text-bear mx-auto mb-2" />
              <p className="text-sm text-bear font-semibold">{error}</p>
              <button onClick={fetchOfflineData} className="mt-3 text-xs text-accent-cyan hover:underline flex items-center gap-1 mx-auto">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <div className="p-5 space-y-4">

              {/* ── Clicked Commodity Highlight ── */}
              {clickedCommodity && (
                <div className="rounded-xl border-2 border-amber/40 bg-amber/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {COMMODITY_ICONS[clickedCommodity.symbol] || <Coins className="w-4 h-4 text-amber" />}
                    <span className="text-sm font-black text-terminal-text uppercase">{clickedCommodity.symbol}</span>
                    <span className="text-[10px] text-terminal-muted">{clickedCommodity.name}</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-terminal-border text-terminal-muted">
                      {clickedCommodity.source === 'IBJA_CACHED' ? '📌 IBJA Benchmark' : '🏛 MCX Data'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase mb-1">Last Price</div>
                      <div className="text-lg font-black text-terminal-text">₹{fmtINR(clickedCommodity.ltp)}</div>
                      <div className="text-[10px] text-terminal-muted">{clickedCommodity.unit}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase mb-1">Change</div>
                      <div className={`text-base font-bold flex items-center gap-1 ${clickedCommodity.change >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {clickedCommodity.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {clickedCommodity.change >= 0 ? '+' : ''}{fmtINR(clickedCommodity.change)}
                      </div>
                      <div className={`text-[10px] font-semibold ${clickedCommodity.pctChange >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {fmtPct(clickedCommodity.pctChange)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase mb-1">Day High</div>
                      <div className="text-sm font-bold text-bull">₹{fmtINR(clickedCommodity.high)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-terminal-muted uppercase mb-1">Day Low</div>
                      <div className="text-sm font-bold text-bear">₹{fmtINR(clickedCommodity.low)}</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-amber/20 text-[10px] text-terminal-muted">
                    Settlement date: <span className="text-terminal-text">{clickedCommodity.settlementDate}</span>
                    {' '}· Prev close: <span className="text-terminal-text">₹{fmtINR(clickedCommodity.prevClose)}</span>
                  </div>
                </div>
              )}

              {/* ── Other Commodities ── */}
              {otherCommodities.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-terminal-muted uppercase tracking-widest mb-2">
                    Other MCX Commodities — Last Settlement
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {otherCommodities.map(c => (
                      <div key={c.symbol} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-terminal-panel border border-terminal-border hover:border-terminal-muted/50 transition">
                        <div className="flex items-center gap-2">
                          {COMMODITY_ICONS[c.symbol] || <Coins className="w-3.5 h-3.5 text-terminal-muted" />}
                          <div>
                            <div className="text-xs font-bold text-terminal-text">{c.symbol}</div>
                            <div className="text-[10px] text-terminal-muted">{c.unit}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-terminal-text">₹{fmtINR(c.ltp)}</div>
                          <div className={`text-[10px] font-semibold flex items-center gap-0.5 justify-end ${c.change >= 0 ? 'text-bull' : 'text-bear'}`}>
                            {c.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {fmtPct(c.pctChange)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── iCOMDEX Indices ── */}
              {data.icomdex.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-terminal-muted uppercase tracking-widest mb-2">
                    MCX iCOMDEX Indices
                  </div>
                  <div className="space-y-1.5">
                    {data.icomdex.map(idx => (
                      <div key={idx.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-terminal-panel border border-terminal-border">
                        <span className="text-xs text-terminal-text">{idx.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-terminal-text">{idx.value.toFixed(2)}</span>
                          <span className={`text-[10px] font-semibold ${idx.change >= 0 ? 'text-bull' : 'text-bear'}`}>
                            {fmtPct(idx.pctChange)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Data attribution ── */}
              <div className="flex items-center justify-between text-[10px] text-terminal-muted pt-1 border-t border-terminal-border">
                <div className="flex items-center gap-1.5">
                  <span>Data: IBJA / MCX India</span>
                  <a
                    href="https://www.mcxindia.com/en/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-cyan hover:underline flex items-center gap-0.5"
                  >
                    MCX Website <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href="https://www.mcxindia.com/en/market-data/mcx-icomdex-indices"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-cyan hover:underline flex items-center gap-0.5"
                  >
                    iCOMDEX <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <span>Last updated: {new Date(data.lastUpdated).toLocaleTimeString('en-IN')}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="px-5 py-4 bg-terminal-panel border-t border-terminal-border flex items-center gap-3">
          <button
            onClick={onProceedAnyway}
            className="flex-1 py-2.5 px-4 rounded-xl bg-accent-cyan/10 border border-accent-cyan/40 text-accent-cyan text-xs font-bold hover:bg-accent-cyan/20 transition"
          >
            View Option Chain (Offline Data)
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-terminal-border text-terminal-muted text-xs font-bold hover:text-terminal-text transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
