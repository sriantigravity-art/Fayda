import React, { useState, useMemo } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  Newspaper, 
  Filter, 
  Search, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  Clock,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import type { NewsSource, NewsSentiment, NewsImpactStamp } from '../types';

// Secondary frontend cleaner to guarantee 100% clean English sentences
const sanitizeContent = (raw: string): string => {
  if (!raw) return '';
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>?/gm, '')
    .replace(/Read more\.\.\./gi, '')
    .replace(/\[\.\.\.\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const NewsWireTab: React.FC = () => {
  const { newsList } = useMarket();
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | NewsSource>('ALL');
  const [stampFilter, setStampFilter] = useState<'ALL' | 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredNews = useMemo(() => {
    return newsList.filter((item) => {
      if (sourceFilter !== 'ALL' && item.source !== sourceFilter) return false;
      
      const stamp: NewsImpactStamp = item.impactStamp || (item.sentiment === 'BULLISH' ? 'POSITIVE' : item.sentiment === 'BEARISH' ? 'NEGATIVE' : 'NEUTRAL');
      if (stampFilter !== 'ALL' && stamp !== stampFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cleanHeadline = sanitizeContent(item.headline).toLowerCase();
        const cleanSummary = sanitizeContent(item.summary).toLowerCase();
        const cleanImpact = sanitizeContent(item.indianMarketImpact).toLowerCase();
        const sectors = (item.impactedSectors || []).join(' ').toLowerCase();
        const beneficiaries = (item.beneficiarySectors || []).join(' ').toLowerCase();
        const outlook = (item.dalalStreetOutlook || '').toLowerCase();

        if (
          !cleanHeadline.includes(q) && 
          !cleanSummary.includes(q) && 
          !cleanImpact.includes(q) && 
          !sectors.includes(q) && 
          !beneficiaries.includes(q) && 
          !outlook.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [newsList, sourceFilter, stampFilter, searchQuery]);

  const getSourceBadge = (source: NewsSource) => {
    switch (source) {
      case 'BLOOMBERG':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#1D2B53] text-white border border-[#2A3E75]">BLOOMBERG</span>;
      case 'MONEYCONTROL':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#0D3B66] text-[#64DFDF] border border-[#64DFDF]/40">MONEYCONTROL</span>;
      case 'CNBC_TV18':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#3E1F47] text-[#FF9E00] border border-[#FF9E00]/40">CNBC-TV18</span>;
      case 'REUTERS':
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#472D1F] text-[#FFB703] border border-[#FFB703]/40">REUTERS</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-terminal-panel text-accent-cyan border border-terminal-border">MARKET WIRE</span>;
    }
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-xl flex flex-col h-full overflow-hidden shadow-xl font-mono">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-terminal-border bg-terminal-panel/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan">
              <Newspaper className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-terminal-text flex items-center gap-1.5">
                <span>⚡ DALAL STREET NEWS & SECTOR IMPACT WIRE</span>
              </h3>
              <span className="text-[10px] text-terminal-muted hidden sm:block font-sans">
                Logical sector transmission, beneficiary stock mapping & impact stamps
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto sm:ml-auto">
            {/* Search & Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`px-3 py-1.5 rounded-xl border font-mono font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer ${
                isFiltersOpen
                  ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'bg-terminal-card border-terminal-border text-terminal-text hover:border-accent-cyan hover:text-accent-cyan'
              }`}
              title={isFiltersOpen ? "Collapse Search & Filters" : "Expand Search & Filters"}
            >
              <Search className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="tracking-wider uppercase">
                {isFiltersOpen ? 'COLLAPSE' : 'FILTER & SEARCH'}
              </span>
              {(sourceFilter !== 'ALL' || stampFilter !== 'ALL' || searchQuery.trim() !== '') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber animate-ping" />
              )}
              <div className={`p-0.5 rounded bg-accent-cyan/15 text-accent-cyan transition-transform duration-200 ${isFiltersOpen ? 'rotate-180 bg-accent-cyan/30' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            <span className="text-[10px] px-2 py-0.5 rounded-full bg-terminal-bg border border-terminal-border text-terminal-muted hidden sm:inline">
              {filteredNews.length} Reports
            </span>
          </div>
        </div>

        {/* Expandable Search & Source Filter Controls */}
        {isFiltersOpen && (
          <div className="space-y-2 pt-2.5 mt-2.5 border-t border-terminal-border/50 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Search bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-terminal-muted" />
              <input
                type="text"
                placeholder="Search by sector (Banking, IT, Auto, Crude, Metals) or stock (HDFC, Reliance, Tata)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-accent-cyan font-sans"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {/* Impact Stamp Filter */}
              <div className="flex items-center text-terminal-muted mr-1 text-[10px]">
                <Filter className="w-3 h-3 mr-1" /> Impact:
              </div>

              {(['ALL', 'POSITIVE', 'NEGATIVE', 'NEUTRAL'] as const).map((stmp) => (
                <button
                  key={stmp}
                  type="button"
                  onClick={() => setStampFilter(stmp)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    stampFilter === stmp
                      ? stmp === 'POSITIVE'
                        ? 'bg-bull/25 text-bull border border-bull/50 shadow-sm'
                        : stmp === 'NEGATIVE'
                        ? 'bg-bear/25 text-bear border border-bear/50 shadow-sm'
                        : stmp === 'NEUTRAL'
                        ? 'bg-amber/25 text-amber border border-amber/50 shadow-sm'
                        : 'bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/50'
                      : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                  }`}
                >
                  {stmp === 'ALL' ? 'All Impacts' : stmp === 'POSITIVE' ? '🟢 Positive Impact' : stmp === 'NEGATIVE' ? '🔴 Negative Impact' : '🟡 Neutral / Mixed'}
                </button>
              ))}

              <div className="h-3 w-[1px] bg-terminal-border mx-1" />

              {/* Source Filter */}
              {(['ALL', 'MONEYCONTROL', 'CNBC_TV18', 'BLOOMBERG', 'REUTERS'] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSourceFilter(src)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] transition cursor-pointer ${
                    sourceFilter === src
                      ? 'bg-accent-cyan/20 text-accent-cyan font-bold border border-accent-cyan/40'
                      : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                  }`}
                >
                  {src === 'ALL' ? 'All Sources' : src.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chronological News Cards Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 max-h-[660px]">
        {filteredNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-terminal-muted text-center px-4">
            <Newspaper className="w-8 h-8 mb-2 opacity-30 animate-pulse" />
            <p className="text-xs font-bold">No breaking news matching filter</p>
            <p className="text-[11px] mt-1 text-terminal-muted/70 font-sans">
              Live sector engine is continuously scanning Bloomberg, Moneycontrol, and CNBC feeds for Indian market impact events.
            </p>
          </div>
        ) : (
          filteredNews.map((item) => {
            const stamp: NewsImpactStamp = item.impactStamp || (item.sentiment === 'BULLISH' ? 'POSITIVE' : item.sentiment === 'BEARISH' ? 'NEGATIVE' : 'NEUTRAL');
            const isBull = stamp === 'POSITIVE';
            const isBear = stamp === 'NEGATIVE';
            const cleanHeadline = sanitizeContent(item.headline);
            const cleanSummary = sanitizeContent(item.summary);
            const cleanImpact = sanitizeContent(item.indianMarketImpact);
            const cleanOutlook = sanitizeContent(item.dalalStreetOutlook || '');

            const cardBorder = isBull
              ? 'border-bull/40 bg-bull/[0.03] shadow-[0_4px_20px_rgba(0,245,155,0.05)]'
              : isBear
              ? 'border-bear/40 bg-bear/[0.03] shadow-[0_4px_20px_rgba(255,59,105,0.05)]'
              : 'border-terminal-border bg-terminal-panel/30';

            return (
              <div
                key={item.id}
                className={`rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 hover:border-accent-cyan/60 hover:bg-terminal-card ${cardBorder}`}
              >
                {/* Header Tag with Big Positive / Negative Impact Stamp */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    {getSourceBadge(item.source)}
                    <span className="text-[10px] text-terminal-muted flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-terminal-muted" />
                      <span>{item.timeFormatted}</span>
                    </span>
                  </div>

                  {/* VISUAL IMPACT STAMP */}
                  <div className="flex items-center space-x-1.5">
                    {isBull ? (
                      <span className="px-2.5 py-0.5 rounded-md font-black text-[10px] tracking-wider uppercase bg-bull/20 text-bull border border-bull/60 shadow-[0_0_12px_rgba(0,245,155,0.25)] flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>POSITIVE IMPACT</span>
                      </span>
                    ) : isBear ? (
                      <span className="px-2.5 py-0.5 rounded-md font-black text-[10px] tracking-wider uppercase bg-bear/20 text-bear border border-bear/60 shadow-[0_0_12px_rgba(255,59,105,0.25)] flex items-center gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>NEGATIVE IMPACT</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-md font-black text-[10px] tracking-wider uppercase bg-amber/20 text-amber border border-amber/60 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-amber" />
                        <span>MIXED / ROTATION</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Headline */}
                <h4 className="font-bold text-xs sm:text-sm text-terminal-text leading-snug mb-1.5 font-sans">
                  {cleanHeadline}
                </h4>

                {/* Bite-sized summary */}
                <p className="text-[11px] sm:text-xs text-terminal-muted leading-relaxed mb-3 font-sans">
                  {cleanSummary}
                </p>

                {/* ========================================================================= */}
                {/* 1. SECTOR IMPACT & PERFORMERS ROW */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2.5 text-[11px] font-sans">
                  {/* Beneficiary / Outperforming Sectors */}
                  {item.beneficiarySectors && item.beneficiarySectors.length > 0 && (
                    <div className="p-2 rounded-xl bg-bull/10 border border-bull/30 flex items-start gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-bull shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black text-bull uppercase tracking-wider block font-mono">
                          🟢 Outperforming / Beneficiary Sectors:
                        </span>
                        <span className="text-terminal-text font-semibold text-[11px]">
                          {item.beneficiarySectors.join(' • ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Pressured / Vulnerable Sectors */}
                  {item.vulnerableSectors && item.vulnerableSectors.length > 0 && (
                    <div className="p-2 rounded-xl bg-bear/10 border border-bear/30 flex items-start gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-bear shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black text-bear uppercase tracking-wider block font-mono">
                          🔴 Pressured / Vulnerable Sectors:
                        </span>
                        <span className="text-terminal-text font-semibold text-[11px]">
                          {item.vulnerableSectors.join(' • ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================================= */}
                {/* 2. DIRECT LOGICAL IMPACT ON NIFTY / DALAL STREET */}
                {/* ========================================================================= */}
                <div className={`p-3 rounded-xl border text-[11px] font-sans space-y-1.5 ${
                  isBull
                    ? 'bg-bull/10 border-bull/40'
                    : isBear
                    ? 'bg-bear/10 border-bear/40'
                    : 'bg-amber/10 border-amber/40'
                }`}>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                    <span className="text-terminal-text">LOGICAL DALAL STREET & NIFTY IMPACT:</span>
                  </div>

                  <p className="text-terminal-text font-medium text-xs leading-relaxed">
                    {cleanImpact}
                  </p>

                  {cleanOutlook && (
                    <div className="pt-1.5 border-t border-terminal-border/50 text-[10px] font-mono text-terminal-muted flex items-center gap-1.5">
                      <span className="text-accent-cyan font-bold">Outlook:</span>
                      <span>{cleanOutlook}</span>
                    </div>
                  )}
                </div>

                {/* Source link if available */}
                {item.url && (
                  <div className="text-right mt-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-accent-cyan hover:underline inline-flex items-center gap-0.5 font-sans font-medium"
                    >
                      <span>Full coverage on {item.source}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

