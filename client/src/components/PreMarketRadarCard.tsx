import React, { useState } from 'react';
import type { PreMarketChecklist, IntradayMarketRegimeData, IndexSymbol } from '../types';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { 
  Clock, 
  Activity, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  X, 
  ShieldAlert, 
  BarChart3, 
  Zap, 
  Target, 
  Flame, 
  Layers, 
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Compass
} from 'lucide-react';

interface PreMarketRadarCardProps {
  symbol: IndexSymbol;
  preMarket?: PreMarketChecklist;
  marketRegime?: IntradayMarketRegimeData;
}

type MetricKey = 'PCR' | 'OI' | 'VIX' | 'MAX_PAIN' | 'IV' | 'THETA' | 'VOLUME' | 'SR';

interface MetricDetailConfig {
  key: MetricKey;
  headerTitle: string; // e.g. "PCR : 0.71"
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  value: string;
  subValue?: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'WARNING';
  badge: string;
  summary: string;
  bulletPoints: string[];
  actionTakeaway: string;
}

export const PreMarketRadarCard: React.FC<PreMarketRadarCardProps> = ({
  symbol,
  preMarket,
  marketRegime
}) => {
  const { currentIndexState } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState<boolean>(true);

  if (!currentIndexState) return null;

  const { pcr, strikes, maxPain, straddleRange, resistanceLevels, supportLevels, spotPrice, indiaVix } = currentIndexState;

  // 1. PCR Calculation & Context
  const activePcr = pcr?.overallPcr ?? 1.0;
  const pcrSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = activePcr >= 1.15 ? 'BULLISH' : activePcr <= 0.85 ? 'BEARISH' : 'NEUTRAL';

  // 2. Open Interest Aggregation
  const totalCallOI = strikes ? strikes.reduce((acc, s) => acc + (s.callOI || 0), 0) : 0;
  const totalPutOI = strikes ? strikes.reduce((acc, s) => acc + (s.putOI || 0), 0) : 0;
  const totalOICtr = totalCallOI + totalPutOI;
  const oiFormatted = totalOICtr >= 10000000 
    ? `${(totalOICtr / 10000000).toFixed(2)} Cr` 
    : `${(totalOICtr / 100000).toFixed(2)} L`;

  // 3. India VIX
  const vixValue = indiaVix && indiaVix > 0 ? indiaVix : 13.45;
  const vixSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'WARNING' = vixValue > 18 ? 'WARNING' : vixValue < 12 ? 'BULLISH' : 'NEUTRAL';

  // 4. Max Pain
  const maxPainStrike = maxPain?.strikePrice || Math.round(spotPrice / 50) * 50;
  const distToMaxPain = maxPainStrike - spotPrice;

  // 5. Implied Volatility (IV)
  const atmStrikeObj = strikes ? strikes.find(s => s.isAtm) : null;
  const avgIv = atmStrikeObj ? +(((atmStrikeObj.callIv || 13.5) + (atmStrikeObj.putIv || 13.5)) / 2).toFixed(1) : 13.8;

  // 6. Theta Time Decay
  const dailyTheta = straddleRange?.atmTotalThetaDaily || -8.5;
  const hourlyTheta = straddleRange?.atmTotalThetaHourly || +(dailyTheta / 6.4).toFixed(2);

  // 7. Volume
  const totalVol = strikes ? strikes.reduce((acc, s) => acc + (s.callVolume || 0) + (s.putVolume || 0), 0) : 0;
  const volFormatted = totalVol >= 10000000
    ? `${(totalVol / 10000000).toFixed(2)} Cr`
    : `${(totalVol / 100000).toFixed(1)} L`;

  // 8. Key Support & Resistance
  const majorRes = resistanceLevels && resistanceLevels.length > 0 ? resistanceLevels[0].strikePrice : Math.round(spotPrice + 150);
  const majorSupp = supportLevels && supportLevels.length > 0 ? supportLevels[0].strikePrice : Math.round(spotPrice - 150);

  // Metric Definitions & Educational Details
  const metricsData: MetricDetailConfig[] = [
    {
      key: 'PCR',
      headerTitle: `PCR : ${activePcr.toFixed(2)}`,
      label: 'PCR (Put-Call Ratio)',
      shortLabel: 'PCR',
      icon: <Activity className="w-3.5 h-3.5 text-accent-sky" />,
      value: activePcr.toFixed(2),
      subValue: activePcr >= 1.0 ? 'Puts > Calls' : 'Calls > Puts',
      sentiment: pcrSentiment,
      badge: activePcr >= 1.2 ? '🟢 Oversold / Bounce' : activePcr <= 0.8 ? '🔴 Heavy Calls' : '🟡 Neutral',
      summary: 'Compares the total number of open put contracts to call contracts to gauge institutional sentiment.',
      bulletPoints: [
        'A PCR > 1.15 signals dense Put writing defense and potential bullish bounce from support.',
        'A PCR < 0.85 indicates aggressive Call writing resistance and upside capping.',
        `Live ${symbol} PCR is ${activePcr.toFixed(2)} (${activePcr >= 1.0 ? 'Bullish Put cushion' : 'Call resistance dominance'}).`
      ],
      actionTakeaway: activePcr >= 1.1 ? 'Look for dip-buying setups near support.' : activePcr <= 0.85 ? 'Avoid chasing breakout calls near resistance.' : 'Trade range breakouts with OI confirmation.'
    },
    {
      key: 'OI',
      headerTitle: `OI : ${oiFormatted}`,
      label: 'OI (Open Interest)',
      shortLabel: 'Open Interest',
      icon: <Layers className="w-3.5 h-3.5 text-accent-purple" />,
      value: oiFormatted,
      subValue: 'Active Contracts',
      sentiment: 'NEUTRAL',
      badge: '📊 Active Open Interest',
      summary: 'Shows total active institutional contracts across all strikes.',
      bulletPoints: [
        'Rising OI with rising price confirms fresh long accumulation.',
        'Rising OI with falling price signals aggressive short buildup.',
        `Total active market interest across ${symbol} options is ${oiFormatted}.`
      ],
      actionTakeaway: 'Watch 1-min Delta OI spikes on ATM strikes to confirm institutional momentum.'
    },
    {
      key: 'VIX',
      headerTitle: `VIX : ${vixValue.toFixed(2)}`,
      label: 'India VIX (Volatility Index)',
      shortLabel: 'India VIX',
      icon: <Flame className="w-3.5 h-3.5 text-amber" />,
      value: vixValue.toFixed(2),
      subValue: vixValue > 18 ? 'High Vol' : 'Calm Vol',
      sentiment: vixSentiment,
      badge: vixValue > 16 ? '⚠️ Elevated Vol' : '🟢 Stable Vol',
      summary: 'Measures expected near-term annualized market volatility.',
      bulletPoints: [
        'High VIX (> 16) inflates options premiums; sharp pullbacks are common.',
        'Low VIX (< 13) indicates cheap options with reduced decay risk.',
        `Current India VIX is ${vixValue.toFixed(2)}.`
      ],
      actionTakeaway: vixValue > 16 ? 'Use defined-risk spreads to avoid IV crush.' : 'Favorable for directional single-leg buyers.'
    },
    {
      key: 'MAX_PAIN',
      headerTitle: `MAX PAIN : ₹${maxPainStrike.toLocaleString('en-IN')}`,
      label: 'Max Pain Strike',
      shortLabel: 'Max Pain',
      icon: <Target className="w-3.5 h-3.5 text-bull" />,
      value: `₹${maxPainStrike.toLocaleString('en-IN')}`,
      subValue: distToMaxPain >= 0 ? `+${distToMaxPain} pts` : `${distToMaxPain} pts`,
      sentiment: Math.abs(distToMaxPain) <= 50 ? 'BULLISH' : 'NEUTRAL',
      badge: '🎯 Expiry Magnet',
      summary: 'Strike price where maximum options expire worthless, acting as an expiry-day price magnet.',
      bulletPoints: [
        'Option writers defend this level to minimize payouts at expiry settlement.',
        `For ${symbol}, Max Pain is ₹${maxPainStrike.toLocaleString('en-IN')} (${distToMaxPain >= 0 ? `+${distToMaxPain}` : distToMaxPain} pts from spot).`,
        'Expect strong gravitational pull toward this strike as expiry approaches.'
      ],
      actionTakeaway: `Expect mean-reversion pull towards ₹${maxPainStrike} during afternoon sessions.`
    },
    {
      key: 'IV',
      headerTitle: `ATM IV : ${avgIv}%`,
      label: 'Implied Volatility (IV)',
      shortLabel: 'ATM IV',
      icon: <Zap className="w-3.5 h-3.5 text-accent-cyan" />,
      value: `${avgIv}%`,
      subValue: avgIv < 13 ? 'Cheap' : avgIv > 18 ? 'Expensive' : 'Fair',
      sentiment: avgIv > 18 ? 'WARNING' : 'BULLISH',
      badge: avgIv < 13 ? '🟢 Cheap Vol' : avgIv > 18 ? '🚨 Crush Risk' : '📊 Fair Value',
      summary: 'Pricing gauge reflecting option market expectations of future movement.',
      bulletPoints: [
        'High IV (> 18%) inflates premiums; buyers risk rapid IV crush post-event.',
        'Low IV (< 13%) offers low-cost premium buying opportunities.',
        `Average ATM Implied Volatility is ${avgIv}%.`
      ],
      actionTakeaway: avgIv > 18 ? 'Avoid buying far OTMs; use multi-leg spreads.' : 'Clean conditions for directional option buys.'
    },
    {
      key: 'THETA',
      headerTitle: `THETA : ${dailyTheta.toFixed(1)} pts`,
      label: 'Time Decay (Theta)',
      shortLabel: 'Theta Decay',
      icon: <Clock className="w-3.5 h-3.5 text-bear" />,
      value: `${dailyTheta.toFixed(1)} pts`,
      subValue: `${hourlyTheta} pts/hr`,
      sentiment: 'BEARISH',
      badge: '⏳ Daily Erosion',
      summary: 'Rate of premium erosion over time per contract.',
      bulletPoints: [
        'Long options continuously shed extrinsic value into expiry.',
        `ATM Straddle is shedding ~${Math.abs(dailyTheta).toFixed(1)} pts/day (~${Math.abs(hourlyTheta)} pts/hr).`,
        'Decay accelerates heavily during 0DTE sessions.'
      ],
      actionTakeaway: 'Book momentum scalps swiftly; avoid holding long options in sideways markets.'
    },
    {
      key: 'VOLUME',
      headerTitle: `VOLUME : ${volFormatted}`,
      label: 'Daily Traded Volume',
      shortLabel: 'Total Volume',
      icon: <BarChart3 className="w-3.5 h-3.5 text-accent-sky" />,
      value: volFormatted,
      subValue: 'Contracts',
      sentiment: 'NEUTRAL',
      badge: '⚡ High Liquidity',
      summary: 'Total turnover of option contracts traded in current session.',
      bulletPoints: [
        'High volume validates breakouts and institutional accumulation.',
        `Over ${volFormatted} contracts traded in ${symbol} today.`
      ],
      actionTakeaway: 'Trade high-volume liquid strikes to eliminate execution slippage.'
    },
    {
      key: 'SR',
      headerTitle: `S/R : ${majorSupp} / ${majorRes}`,
      label: 'Key Support & Resistance',
      shortLabel: 'Support & Res.',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-bull" />,
      value: `S: ${majorSupp} | R: ${majorRes}`,
      subValue: 'Floor / Ceiling',
      sentiment: 'BULLISH',
      badge: '🧱 Heavy Walls',
      summary: 'Dense institutional Put/Call writing strike boundaries.',
      bulletPoints: [
        `Support Floor (Put S1): ₹${majorSupp}`,
        `Resistance Ceiling (Call R1): ₹${majorRes}`,
        'Sustained breakouts above R1 or breakdowns below S1 trigger runaway momentum.'
      ],
      actionTakeaway: `Buy near support ₹${majorSupp} or book near resistance ₹${majorRes}.`
    }
  ];

  const activeMetricObj = selectedMetric ? metricsData.find(m => m.key === selectedMetric) : null;

  return (
    <div className="w-full bg-terminal-card border border-terminal-border rounded-xl p-2.5 sm:p-3 shadow-subtle select-none transition-all duration-300 flex flex-col justify-start">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 mb-2 border-b border-terminal-border/70">
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className="p-1 rounded-md bg-accent-purple/15 text-accent-purple shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="font-mono font-black text-xs text-terminal-text tracking-wider truncate">
                {isBeginner 
                  ? '🌅 Morning Market Plan & Key Levels' 
                  : isIntermediate 
                  ? '🌅 Pre-Market Radar & Pivot Range' 
                  : '🔬 Pre-Market Quantitative Setup & Macro Gap Model'}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-terminal-panel text-accent-cyan border border-terminal-border font-bold shrink-0">
                {symbol}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 font-mono">
          {marketRegime && (
            <span
              className={`px-2 py-0.2 rounded-full text-[9px] font-bold border flex items-center space-x-1 ${
                marketRegime.structureType === 'TRENDING_DAY'
                  ? 'bg-bull/15 border-bull/40 text-bull'
                  : marketRegime.structureType === 'REVERSAL_DAY'
                  ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple'
                  : 'bg-amber/15 border-amber/40 text-amber'
              }`}
            >
              <Activity className="w-2.5 h-2.5" />
              <span>{marketRegime.structureLabel}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="p-0.5 rounded text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition"
            title={isPanelExpanded ? 'Collapse Panel' : 'Expand Panel'}
          >
            {isPanelExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isPanelExpanded && (
        <div className="space-y-2">
          {/* 8 Compact Metric Boxes Aligned to Top */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono">
            {metricsData.map((m) => {
              const isSelected = selectedMetric === m.key;

              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMetric(isSelected ? null : m.key)}
                  className={`pt-1.5 pb-1.5 px-2 rounded-lg border text-left flex flex-col justify-start items-stretch transition-all duration-150 cursor-pointer group shadow-sm ${
                    isSelected
                      ? 'bg-accent-sky/20 border-accent-sky shadow-[0_0_10px_rgba(0,229,255,0.3)] ring-1 ring-accent-sky scale-[1.02]'
                      : 'bg-terminal-panel/80 border-terminal-border hover:border-accent-sky/50 hover:bg-terminal-panel'
                  }`}
                >
                  {/* Top-aligned Box Title (Format "PCR : 0.71") */}
                  <div className="flex items-center justify-between w-full text-[11px] sm:text-xs font-black text-terminal-text tracking-tight leading-none mb-1">
                    <span className="truncate group-hover:text-accent-cyan transition-colors">
                      {m.headerTitle}
                    </span>
                    <span className="opacity-70 group-hover:opacity-100 shrink-0 ml-1">
                      {m.icon}
                    </span>
                  </div>

                  {/* Sub-value & Click-to-Expand Indicator */}
                  <div className="flex items-center justify-between w-full text-[9px] pt-0.5 border-t border-terminal-border/50 leading-tight">
                    <span className={`font-bold truncate ${
                      m.sentiment === 'BULLISH' ? 'text-bull' : m.sentiment === 'BEARISH' ? 'text-bear' : m.sentiment === 'WARNING' ? 'text-amber' : 'text-terminal-muted'
                    }`}>
                      {m.badge.split(' ')[0]} {m.subValue}
                    </span>
                    <span className={`text-[8px] font-bold ${isSelected ? 'text-accent-sky' : 'text-terminal-muted'}`}>
                      {isSelected ? '▲' : '▼'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expand-Collapse Detailed View Drawer */}
          {activeMetricObj && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-terminal-panel via-terminal-card to-terminal-panel border border-accent-sky/50 shadow-md animate-fade-in font-sans">
              <div className="flex items-center justify-between border-b border-terminal-border/80 pb-2 mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-accent-sky/20 text-accent-sky border border-accent-sky/40 shrink-0">
                    {activeMetricObj.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h3 className="text-xs font-bold text-terminal-text">
                        {activeMetricObj.label}
                      </h3>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-accent-sky/15 text-accent-sky border border-accent-sky/30">
                        {activeMetricObj.headerTitle}
                      </span>
                      <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-terminal-panel text-terminal-muted border border-terminal-border">
                        {activeMetricObj.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-terminal-muted mt-0.5">
                      {activeMetricObj.summary}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMetric(null)}
                  className="p-1 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition shrink-0"
                  title="Close Details"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Detailed Bullet Points */}
              <div className="space-y-1.5 text-[11px] text-terminal-muted font-sans leading-relaxed">
                {activeMetricObj.bulletPoints.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-accent-sky font-bold">•</span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>

              {/* Action Rule Banner */}
              <div className="mt-2.5 p-2 rounded-lg bg-accent-sky/10 border border-accent-sky/30 text-[11px] font-mono text-terminal-text flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 truncate">
                  <Sparkles className="w-3 h-3 text-accent-sky shrink-0" />
                  <span className="truncate"><strong>Rule:</strong> {activeMetricObj.actionTakeaway}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMetric(null)}
                  className="text-[10px] font-sans text-accent-sky hover:underline shrink-0"
                >
                  Collapse ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
