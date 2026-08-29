import React, { useEffect, useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { 
  Zap, 
  X, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Radio, 
  Globe,
  Clock
} from 'lucide-react';
import type { NewsSource } from '../types';

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

export const FlashNewsBanner: React.FC = () => {
  const { latestFlashNews, dismissFlashNews } = useMarket();
  const [progress, setProgress] = useState(100);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const dismissRef = React.useRef(dismissFlashNews);
  dismissRef.current = dismissFlashNews;

  const currentNewsId = latestFlashNews?.id;

  useEffect(() => {
    if (!currentNewsId) {
      setProgress(100);
      setSecondsRemaining(10);
      return;
    }

    setProgress(100);
    setSecondsRemaining(10);
    const durationMs = 10000; // Strict 10 seconds flash
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, durationMs - elapsed);
      const pct = (remainingMs / durationMs) * 100;
      
      setProgress(pct);
      setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));

      if (elapsed >= durationMs) {
        clearInterval(interval);
        dismissRef.current();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentNewsId]);

  if (!latestFlashNews) return null;

  const getSourceBadge = (source: NewsSource) => {
    switch (source) {
      case 'BLOOMBERG':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1D2B53] text-white border border-[#2A3E75]">BLOOMBERG</span>;
      case 'MONEYCONTROL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0D3B66] text-[#64DFDF] border border-[#64DFDF]/40">MONEYCONTROL</span>;
      case 'CNBC_TV18':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#3E1F47] text-[#FF9E00] border border-[#FF9E00]/40">CNBC-TV18</span>;
      case 'REUTERS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#472D1F] text-[#FFB703] border border-[#FFB703]/40">REUTERS</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-terminal-panel text-accent-cyan border border-terminal-border">MARKET WIRE</span>;
    }
  };

  const isBull = latestFlashNews.sentiment === 'BULLISH';
  const isBear = latestFlashNews.sentiment === 'BEARISH';
  const cleanHeadline = sanitizeContent(latestFlashNews.headline);
  const cleanSummary = sanitizeContent(latestFlashNews.summary);
  const cleanImpact = sanitizeContent(latestFlashNews.indianMarketImpact);

  return (
    <div className="fixed top-14 right-4 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300 select-none">
      <div className="bg-terminal-card/95 backdrop-blur-xl border-2 border-accent-cyan/60 rounded-2xl p-4 shadow-[0_0_35px_rgba(0,229,255,0.3)] relative overflow-hidden font-mono text-terminal-text">
        {/* 10-Second Linear Countdown Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-terminal-bg">
          <div
            className="h-full bg-gradient-to-r from-accent-cyan via-amber to-bear transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header line */}
        <div className="flex items-center justify-between mt-1 mb-2">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-black bg-bear text-white shadow-[0_0_10px_rgba(255,59,105,0.7)] animate-pulse">
              <Zap className="w-3 h-3 mr-1" /> FLASH BREAKING
            </span>
            {getSourceBadge(latestFlashNews.source)}
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.2 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 font-bold text-[9px]">
              {secondsRemaining}s
            </span>
            <span className="px-1.5 py-0.2 rounded bg-terminal-panel border border-terminal-border text-terminal-text font-bold text-[9px] flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-accent-cyan" />
              <span>{latestFlashNews.timeFormatted}</span>
            </span>
            <button
              onClick={dismissFlashNews}
              className="p-1 rounded hover:bg-terminal-panel text-terminal-muted hover:text-terminal-text transition"
              title="Close Notification (Docks into News Wire)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Headline */}
        <h4 className="font-bold text-xs sm:text-sm text-terminal-text leading-snug mb-1.5 font-sans">
          {cleanHeadline}
        </h4>

        {/* Bite-sized summary */}
        <p className="text-[11px] text-terminal-muted leading-relaxed mb-2 font-sans">
          {cleanSummary}
        </p>

        {/* Highlighted Direct Indian Market Impact Box */}
        <div className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-start gap-2 ${
          isBull
            ? 'bg-bull/10 border-bull/40 text-bull'
            : isBear
            ? 'bg-bear/10 border-bear/40 text-bear'
            : 'bg-amber/10 border-amber/40 text-amber'
        }`}>
          {isBull ? (
            <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
          ) : isBear ? (
            <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <Globe className="w-4 h-4 shrink-0 mt-0.5 text-amber" />
          )}
          <div>
            <span className="font-bold block text-[10px] uppercase">
              🎯 NIFTY / INDIAN MARKET IMPACT:
            </span>
            <span className="text-terminal-text font-medium text-[11px] leading-tight">
              {cleanImpact}
            </span>
          </div>
        </div>

        {/* Footer info: 10s auto-dock notice */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-terminal-border/50 text-[10px] text-terminal-muted">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-accent-cyan animate-ping" />
            <span>Auto-docking to News Wire in {Math.ceil((progress / 100) * 10)}s</span>
          </span>
          {latestFlashNews.url && (
            <a
              href={latestFlashNews.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent-cyan hover:underline flex items-center gap-1"
            >
              <span>Source link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
