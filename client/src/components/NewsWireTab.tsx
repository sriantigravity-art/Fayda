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
  ChevronDown
} from 'lucide-react';
import type { NewsSource, NewsSentiment } from '../types';

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
  const [sentimentFilter, setSentimentFilter] = useState<'ALL' | NewsSentiment>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredNews = useMemo(() => {
    return newsList.filter((item) => {
      if (sourceFilter !== 'ALL' && item.source !== sourceFilter) return false;
      if (sentimentFilter !== 'ALL' && item.sentiment !== sentimentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cleanHeadline = sanitizeContent(item.headline).toLowerCase();
        const cleanSummary = sanitizeContent(item.summary).toLowerCase();
        const cleanImpact = sanitizeContent(item.indianMarketImpact).toLowerCase();
        if (!cleanHeadline.includes(q) && !cleanSummary.includes(q) && !cleanImpact.includes(q)) return false;
      }
      return true;
    });
  }, [newsList, sourceFilter, sentimentFilter, searchQuery]);

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
            <div className="p-1 rounded bg-accent-cyan/20 text-accent-cyan">
              <Newspaper className="w-4 h-4" />
            </div>
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-terminal-text flex items-center gap-1.5">
              <span>⚡ FLASH NEWS WIRE</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-bull-subtle text-bull border border-bull/30 hidden sm:inline">
                INDIAN IMPACT
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Standardized Expandable Search & Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`px-3 py-1.5 rounded-xl border-2 font-mono font-black text-[11px] sm:text-xs transition-all hover:scale-105 flex items-center gap-2 shrink-0 shadow-sm ${
                isFiltersOpen
                  ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'bg-terminal-card border-accent-cyan/70 text-terminal-text hover:border-accent-cyan hover:text-accent-cyan'
              }`}
              title={isFiltersOpen ? "Collapse Search & Filters" : "Expand Search & Filters"}
            >
              <Search className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="tracking-wider uppercase">
                {isFiltersOpen ? 'COLLAPSE' : 'SEARCH & FILTER'}
              </span>
              {(sourceFilter !== 'ALL' || sentimentFilter !== 'ALL' || searchQuery.trim() !== '') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber animate-ping" />
              )}
              <div className={`p-0.5 rounded bg-accent-cyan/15 text-accent-cyan transition-transform duration-200 ${isFiltersOpen ? 'rotate-180 bg-accent-cyan/30' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            <span className="text-[10px] px-2 py-0.5 rounded-full bg-terminal-bg border border-terminal-border text-terminal-muted hidden sm:inline">
              {filteredNews.length} Headlines
            </span>
          </div>
        </div>

        {/* Expandable Search & Source Filter Controls */}
        {isFiltersOpen && (
          <div className="space-y-2 pt-2 mt-2 border-t border-terminal-border/50 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Search bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-terminal-muted" />
              <input
                type="text"
                placeholder="Search news (e.g. RBI, Crude, Trump, Nifty, IT)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded-lg pl-8 pr-3 py-1 text-xs text-terminal-text focus:outline-none focus:border-accent-cyan"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <div className="flex items-center text-terminal-muted mr-1 text-[10px]">
                <Filter className="w-3 h-3 mr-1" /> Sources:
              </div>

              {(['ALL', 'MONEYCONTROL', 'CNBC_TV18', 'BLOOMBERG', 'REUTERS'] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSourceFilter(src)}
                  className={`px-2 py-0.5 rounded text-[10px] transition ${
                    sourceFilter === src
                      ? 'bg-accent-cyan/20 text-accent-cyan font-bold border border-accent-cyan/40'
                      : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                  }`}
                >
                  {src === 'ALL' ? 'All Feeds' : src.replace('_', ' ')}
                </button>
              ))}

              <div className="h-3 w-[1px] bg-terminal-border mx-0.5" />

              {(['ALL', 'BULLISH', 'BEARISH'] as const).map((snt) => (
                <button
                  key={snt}
                  type="button"
                  onClick={() => setSentimentFilter(snt)}
                  className={`px-2 py-0.5 rounded text-[10px] transition ${
                    sentimentFilter === snt
                      ? snt === 'BULLISH'
                        ? 'bg-bull/20 text-bull font-bold border border-bull/40'
                        : snt === 'BEARISH'
                        ? 'bg-bear/20 text-bear font-bold border border-bear/40'
                        : 'bg-accent-cyan/20 text-accent-cyan font-bold border border-accent-cyan/40'
                      : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                  }`}
                >
                  {snt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chronological News Cards Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[640px]">
        {filteredNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-terminal-muted text-center px-4">
            <Newspaper className="w-8 h-8 mb-2 opacity-30 animate-pulse" />
            <p className="text-xs font-bold">No breaking news matching filter</p>
            <p className="text-[11px] mt-1 text-terminal-muted/70">
              Live engine is continuously scanning Bloomberg, Moneycontrol, and CNBC feeds for Indian market impact events.
            </p>
          </div>
        ) : (
          filteredNews.map((item) => {
            const isBull = item.sentiment === 'BULLISH';
            const isBear = item.sentiment === 'BEARISH';
            const cleanHeadline = sanitizeContent(item.headline);
            const cleanSummary = sanitizeContent(item.summary);
            const cleanImpact = sanitizeContent(item.indianMarketImpact);

            const cardBorder = isBull
              ? 'border-bull/30 bg-bull/[0.02]'
              : isBear
              ? 'border-bear/30 bg-bear/[0.02]'
              : 'border-terminal-border bg-terminal-panel/30';

            return (
              <div
                key={item.id}
                className={`rounded-xl p-3 border transition-all duration-200 hover:border-accent-cyan/50 hover:bg-terminal-card ${cardBorder}`}
              >
                {/* Header Tag */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    {getSourceBadge(item.source)}
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      isBull
                        ? 'bg-bull/15 text-bull'
                        : isBear
                        ? 'bg-bear/15 text-bear'
                        : 'bg-amber/15 text-amber'
                    }`}>
                      {item.sentiment}
                    </span>
                  </div>

                  <span className="text-[10px] text-terminal-muted flex items-center gap-1">
                    <Clock className="w-3 h-3 text-terminal-muted" />
                    <span>{item.timeFormatted}</span>
                  </span>
                </div>

                {/* Headline */}
                <h4 className="font-bold text-xs sm:text-sm text-terminal-text leading-snug mb-1 font-sans">
                  {cleanHeadline}
                </h4>

                {/* Bite-sized summary */}
                <p className="text-[11px] text-terminal-muted leading-relaxed mb-2 font-sans">
                  {cleanSummary}
                </p>

                {/* Direct Indian Market Impact Highlight */}
                <div className={`p-2 rounded-lg border text-[11px] font-mono flex items-start gap-1.5 ${
                  isBull
                    ? 'bg-bull/10 border-bull/30 text-bull'
                    : isBear
                    ? 'bg-bear/10 border-bear/30 text-bear'
                    : 'bg-amber/10 border-amber/30 text-amber'
                }`}>
                  {isBull ? (
                    <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : isBear ? (
                    <TrendingDown className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber" />
                  )}
                  <div className="text-[10px] leading-tight">
                    <strong className="text-terminal-text block">IMPACT ON NIFTY / DALAL STREET:</strong>
                    <span>{cleanImpact}</span>
                  </div>
                </div>

                {/* Source link if available */}
                {item.url && (
                  <div className="text-right mt-1.5">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-accent-cyan hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Read on {item.source}</span>
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
