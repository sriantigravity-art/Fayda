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
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  X,
  Zap
} from 'lucide-react';
import type { NewsSource, NewsImpactStamp, GlobalEventCategory } from '../types';

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
  const { newsList, globalMarketContext } = useMarket();
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | NewsSource>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | GlobalEventCategory>('ALL');
  const [stampFilter, setStampFilter] = useState<'ALL' | 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredNews = useMemo(() => {
    return newsList.filter((item) => {
      if (sourceFilter !== 'ALL' && item.source !== sourceFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      
      const stamp: NewsImpactStamp = item.impactStamp || (item.sentiment === 'BULLISH' ? 'POSITIVE' : item.sentiment === 'BEARISH' ? 'NEGATIVE' : 'NEUTRAL');
      if (stampFilter !== 'ALL' && stamp !== stampFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cleanHeadline = sanitizeContent(item.headline).toLowerCase();
        const cleanSummary = sanitizeContent(item.summary).toLowerCase();
        const cleanImpact = sanitizeContent(item.indianMarketImpact).toLowerCase();
        const sectors = (item.impactedSectors || []).join(' ').toLowerCase();
        const beneficiaries = (item.beneficiarySectors || []).join(' ').toLowerCase();
        const whyIndia = (item.transmissionPath?.whyIndia || '').toLowerCase();
        const outlook = (item.dalalStreetOutlook || '').toLowerCase();

        if (
          !cleanHeadline.includes(q) && 
          !cleanSummary.includes(q) && 
          !cleanImpact.includes(q) && 
          !sectors.includes(q) && 
          !beneficiaries.includes(q) && 
          !whyIndia.includes(q) &&
          !outlook.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [newsList, sourceFilter, categoryFilter, stampFilter, searchQuery]);

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

  const getCategoryLabel = (cat: GlobalEventCategory) => {
    switch (cat) {
      case 'US_POLITICS_TARIFFS': return '🇺🇸 Trump Tariffs';
      case 'H1B_IMMIGRATION': return '💼 H-1B & Tech';
      case 'CRUDE_COMMODITY': return '🛢️ Crude & Energy';
      case 'FED_RATES_MACRO': return '🏛️ US Fed & Macro';
      case 'GEOPOLITICS_WAR': return '⚔️ Geopolitics & War';
      case 'CHINA_STIMULUS': return '🇨🇳 China Stimulus';
      case 'FII_FLOWS': return '💵 FII Capital Flows';
      case 'RBI_POLICY': return '🇮🇳 RBI Policy';
      default: return '📈 Indian Indices';
    }
  };

  return (
    <div className="bg-terminal-card border border-terminal-border rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl font-sans">
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-terminal-border bg-terminal-panel/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text">
                ⚡ FAYDA NEWS
              </h3>
              <span className="text-[11px] text-terminal-muted hidden sm:block">
                Real-time market news, macroeconomic catalysts & sector impact analysis
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm ${
                isFiltersOpen
                  ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                  : 'bg-terminal-card border-terminal-border text-terminal-text hover:border-accent-cyan hover:text-accent-cyan'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="uppercase tracking-wider">
                {isFiltersOpen ? 'COLLAPSE' : 'FILTER & SEARCH'}
              </span>
              {(sourceFilter !== 'ALL' || categoryFilter !== 'ALL' || stampFilter !== 'ALL' || searchQuery.trim() !== '') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber animate-ping" />
              )}
              <div className={`p-0.5 rounded transition-transform duration-200 ${isFiltersOpen ? 'rotate-180 text-accent-cyan' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        {/* Expandable Filter Controls */}
        {isFiltersOpen && (
          <div className="space-y-2.5 pt-3 mt-3 border-t border-terminal-border/60 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-terminal-muted" />
              <input
                type="text"
                placeholder="Search global themes (Trump, Tariffs, H-1B, Crude, War, Fed, China, TCS, Reliance)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded-xl pl-9 pr-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-accent-cyan font-sans"
              />
            </div>

            {/* Global Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-terminal-muted text-[10px] font-mono uppercase font-bold mr-1">
                Category:
              </span>
              {(['ALL', 'US_POLITICS_TARIFFS', 'H1B_IMMIGRATION', 'CRUDE_COMMODITY', 'FED_RATES_MACRO', 'GEOPOLITICS_WAR', 'CHINA_STIMULUS', 'FII_FLOWS', 'RBI_POLICY'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/50 shadow-sm'
                      : 'bg-terminal-bg text-terminal-muted hover:text-terminal-text border border-terminal-border'
                  }`}
                >
                  {cat === 'ALL' ? 'All Global Themes' : getCategoryLabel(cat)}
                </button>
              ))}
            </div>

            {/* Impact Stamp Filter */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-terminal-muted text-[10px] font-mono uppercase font-bold mr-1">
                Impact:
              </span>
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
            </div>
          </div>
        )}
      </div>

      {/* Chronological News Cards Stream with 3-Layer Intelligence Breakdown */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 max-h-[720px]">
        {filteredNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-terminal-muted text-center px-4">
            <Globe className="w-10 h-10 mb-3 opacity-30 animate-spin" />
            <p className="text-sm font-bold text-terminal-text">No global events matching active filter</p>
            <p className="text-xs mt-1 text-terminal-muted max-w-md">
              The engine is continuously monitoring Reuters, Bloomberg, CNBC-TV18, and Moneycontrol for international transmission events.
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
              ? 'border-bull/40 bg-bull/[0.02] shadow-[0_4px_25px_rgba(0,245,155,0.06)]'
              : isBear
              ? 'border-bear/40 bg-bear/[0.02] shadow-[0_4px_25px_rgba(255,59,105,0.06)]'
              : 'border-terminal-border bg-terminal-panel/40';

            const layered = item.layeredScores;
            const trans = item.transmissionPath;

            return (
              <div
                key={item.id}
                className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:border-accent-cyan/70 hover:bg-terminal-card flex flex-col space-y-3.5 ${cardBorder}`}
              >
                {/* 1. Header Metadata & Impact Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {getSourceBadge(item.source)}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-panel border border-terminal-border text-terminal-muted">
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className="text-[10px] text-terminal-muted flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-terminal-muted" />
                      <span>{item.timeFormatted}</span>
                    </span>
                  </div>

                  {/* VISUAL IMPACT STAMP */}
                  <div className="flex items-center space-x-2">
                    {isBull ? (
                      <span className="px-3 py-1 rounded-lg font-black text-xs tracking-wider uppercase bg-bull/20 text-bull border border-bull/60 shadow-[0_0_15px_rgba(0,245,155,0.3)] flex items-center gap-1.5">
                        <ArrowUpRight className="w-4 h-4" />
                        <span>POSITIVE IMPACT</span>
                      </span>
                    ) : isBear ? (
                      <span className="px-3 py-1 rounded-lg font-black text-xs tracking-wider uppercase bg-bear/20 text-bear border border-bear/60 shadow-[0_0_15px_rgba(255,59,105,0.3)] flex items-center gap-1.5">
                        <ArrowDownRight className="w-4 h-4" />
                        <span>NEGATIVE IMPACT</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-lg font-black text-xs tracking-wider uppercase bg-amber/20 text-amber border border-amber/60 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-amber" />
                        <span>MIXED / ROTATION</span>
                      </span>
                    )}

                    {layered && (
                      <span className="px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border text-[10px] font-mono font-bold text-accent-cyan">
                        Confidence {layered.confidenceScore}%
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Headline & Summary */}
                <div>
                  <h4 className="font-black text-sm sm:text-base text-terminal-text leading-snug mb-1">
                    {cleanHeadline}
                  </h4>
                  <p className="text-xs sm:text-sm text-terminal-muted leading-relaxed">
                    {cleanSummary}
                  </p>
                </div>

                {/* 3. SIGNAL CONFLICT WARNING (If Company News vs Global Macro Clash) */}
                {trans?.signalConflict?.hasConflict && (
                  <div className="p-2.5 rounded-xl bg-amber/10 border border-amber/30 text-amber text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block uppercase text-[10px] tracking-wider font-mono">
                        ⚠️ Macro vs Fundamental Divergence Detected:
                      </strong>
                      <span className="text-terminal-text font-medium leading-tight">
                        {trans.signalConflict.description}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. MULTI-HOP TRANSMISSION IMPACT PATH CHIPS */}
                {trans && trans.steps && trans.steps.length > 0 && (
                  <div className="p-3 rounded-xl bg-terminal-panel border border-terminal-border">
                    <span className="text-[10px] font-mono font-bold text-accent-cyan uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>CAUSAL TRANSMISSION PATH (GLOBAL EVENT → STOCK IMPACT):</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                      {trans.steps.map((step, idx) => (
                        <React.Fragment key={idx}>
                          <span className="px-2.5 py-1 rounded-lg bg-terminal-card border border-terminal-border text-terminal-text font-semibold text-[11px] shadow-sm">
                            {step}
                          </span>
                          {idx < trans.steps.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. 3-LAYER SCORES BREAKDOWN (Fundamental, Global, Market Reaction) */}
                {layered && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-xl bg-terminal-card border border-terminal-border flex flex-col">
                      <span className="text-terminal-muted text-[10px]">1. Fundamental</span>
                      <span className={`font-black text-sm ${layered.fundamentalScore >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {layered.fundamentalScore >= 0 ? '+' : ''}{layered.fundamentalScore}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-terminal-card border border-terminal-border flex flex-col">
                      <span className="text-terminal-muted text-[10px]">2. Global Context</span>
                      <span className={`font-black text-sm ${layered.globalContextScore >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {layered.globalContextScore >= 0 ? '+' : ''}{layered.globalContextScore}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-terminal-card border border-terminal-border flex flex-col">
                      <span className="text-terminal-muted text-[10px]">3. Market Reaction</span>
                      <span className={`font-black text-sm ${layered.marketReactionScore >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {layered.marketReactionScore >= 0 ? '+' : ''}{layered.marketReactionScore}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-terminal-card border border-accent-cyan/40 flex flex-col">
                      <span className="text-accent-cyan text-[10px] font-bold">Final Fayda Score</span>
                      <span className={`font-black text-sm ${layered.finalFaydaScore >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {layered.finalFaydaScore >= 0 ? '+' : ''}{layered.finalFaydaScore}
                      </span>
                    </div>
                  </div>
                )}

                {/* 6. "WHY DOES THIS GLOBAL NEWS MATTER TO INDIA?" */}
                {trans?.whyIndia && (
                  <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border text-xs">
                    <strong className="text-[10px] font-mono font-bold text-accent-cyan uppercase tracking-wider block mb-1">
                      🇮🇳 WHY DOES THIS MATTER TO DALAL STREET & INDIA?
                    </strong>
                    <p className="text-terminal-text leading-relaxed font-medium">
                      {trans.whyIndia}
                    </p>
                  </div>
                )}

                {/* 7. BENEFICIARIES & VULNERABLE SECTORS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {item.beneficiarySectors && item.beneficiarySectors.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-bull/10 border border-bull/30 flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-bull shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black text-bull uppercase tracking-wider block font-mono">
                          🟢 Outperforming / Beneficiary Sectors:
                        </span>
                        <span className="text-terminal-text font-semibold text-xs">
                          {item.beneficiarySectors.join(' • ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {item.vulnerableSectors && item.vulnerableSectors.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-bear/10 border border-bear/30 flex items-start gap-2">
                      <TrendingDown className="w-4 h-4 text-bear shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black text-bear uppercase tracking-wider block font-mono">
                          🔴 Pressured / Vulnerable Sectors:
                        </span>
                        <span className="text-terminal-text font-semibold text-xs">
                          {item.vulnerableSectors.join(' • ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 8. DIRECT DALAL STREET & NIFTY OUTLOOK */}
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  isBull ? 'bg-bull/10 border-bull/40' : isBear ? 'bg-bear/10 border-bear/40' : 'bg-amber/10 border-amber/40'
                }`}>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                    <span className="text-terminal-text">LOGICAL DALAL STREET & NIFTY TRANSMISSION:</span>
                  </div>
                  <p className="text-terminal-text font-medium text-xs leading-relaxed">
                    {cleanImpact}
                  </p>
                  {cleanOutlook && (
                    <div className="pt-1.5 border-t border-terminal-border/50 text-[11px] font-mono text-terminal-muted flex items-center gap-1.5">
                      <span className="text-accent-cyan font-bold">Outlook:</span>
                      <span>{cleanOutlook}</span>
                    </div>
                  )}
                </div>

                {/* 9. Related Global Event Links */}
                {item.relatedGlobalEvents && item.relatedGlobalEvents.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-terminal-muted">
                    <span className="text-terminal-muted font-bold">Linked Global Themes:</span>
                    {item.relatedGlobalEvents.map((evt, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-terminal-panel border border-terminal-border text-terminal-text">
                        {evt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Engine Logic Modal */}
      {isHowItWorksOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-terminal-card border border-terminal-border rounded-2xl max-w-2xl w-full p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-terminal-border pb-3">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-accent-cyan" />
                <h3 className="font-bold text-sm text-terminal-text uppercase font-mono">
                  Fayda Global & Geopolitical Intelligence Model
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(false)}
                className="p-1 rounded hover:bg-terminal-panel text-terminal-muted hover:text-terminal-text transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-terminal-text">
              <p>
                The Fayda Engine rejects naive keyword counting (e.g. marking "fall" as automatically negative). It applies <strong>Multi-Hop Economic Transmission</strong>:
              </p>

              <div className="p-3 rounded-xl bg-terminal-panel border border-terminal-border font-mono text-[11px] text-accent-cyan">
                GLOBAL EVENT → GLOBAL ASSET → INDIA MACRO → INDIAN SECTOR → COMPANY EXPOSURE → STOCK PRICE
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-terminal-text font-mono uppercase text-[11px]">
                  Core Transmission Archetypes:
                </h4>
                <ul className="space-y-1.5 list-disc pl-4 text-terminal-muted">
                  <li><strong>Crude Oil Drops:</strong> 🟢 Positive for India (contracts import bill, expands Paint & OMC margins, strengthens INR).</li>
                  <li><strong>H-1B / AI Workload Drops:</strong> 🔴 Negative for IT Services (billable hours & T&M contract value deflation).</li>
                  <li><strong>Trump Tariffs:</strong> Dissected by product & competitor differential (relative advantage vs blanket negative).</li>
                  <li><strong>US Fed Dovish Surprise:</strong> 🟢 Positive for FII liquidity carry trades into Nifty & Bank Nifty.</li>
                  <li><strong>Geopolitical Conflict / War (Levels 0-7):</strong> Transmitted via shipping lane insurance, safe haven gold/USD, and energy prices.</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-[11px] font-mono">
                <strong>Final Fayda Score Blend:</strong><br />
                0.30 × Fundamental + 0.15 × Global Context + 0.15 × Surprise + 0.10 × Guidance + 0.10 × Market Reaction + 0.20 × Exposure/Confidence
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
