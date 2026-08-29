import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const DisclaimerTicker: React.FC = () => {
  const disclaimerText = [
    "⚠️ EDUCATIONAL & ANALYTICAL PURPOSES ONLY: This live stream and technical dashboard are designed strictly for market data observation and educational purposes.",
    "📜 NOT SEBI REGISTERED: We do NOT provide buy/sell calls, stock tips, or investment advisory.",
    "📉 SEBI MANDATORY RISK DISCLOSURE: 9 out of 10 individual traders in the equity derivatives (F&O) segment incur net financial losses.",
    "⚖️ Derivatives trading involves substantial risk of loss. Always consult a certified financial advisor before taking positions."
  ];

  return (
    <aside 
      aria-label="SEBI Statutory Compliance Ticker"
      className="fixed bottom-0 left-0 right-0 w-full z-50 bg-terminal-panel/95 backdrop-blur-md border-t border-amber/40 shadow-md py-1.5 px-3 flex items-center select-none"
    >
      {/* Permanent Fixed Compliance Badge on Left */}
      <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-amber/20 text-amber border border-amber/50 shrink-0 mr-3 font-mono font-black text-[10px] shadow-sm">
        <ShieldAlert className="w-3.5 h-3.5 text-amber shrink-0 animate-pulse" />
        <span className="hidden sm:inline">SEBI COMPLIANCE:</span>
        <span>EDUCATIONAL ONLY</span>
      </div>

      {/* Infinite Seamless Scrolling Disclaimer Stream */}
      <div className="overflow-hidden whitespace-nowrap flex-1 relative flex items-center">
        <div className="flex animate-marquee-seamless whitespace-nowrap text-[10px] sm:text-[11px] font-mono text-terminal-muted/90 font-medium">
          {/* First loop */}
          <div className="flex items-center space-x-8 shrink-0 pr-8">
            {disclaimerText.map((text, idx) => (
              <span key={`d1-${idx}`} className="flex items-center gap-2">
                <span>{text}</span>
                <span className="text-amber/50 font-bold">•</span>
              </span>
            ))}
          </div>

          {/* Duplicate loop for seamless infinite transition with zero blank gap */}
          <div className="flex items-center space-x-8 shrink-0 pr-8" aria-hidden="true">
            {disclaimerText.map((text, idx) => (
              <span key={`d2-${idx}`} className="flex items-center gap-2">
                <span>{text}</span>
                <span className="text-amber/50 font-bold">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
