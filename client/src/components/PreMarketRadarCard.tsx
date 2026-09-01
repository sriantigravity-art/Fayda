import React, { useState } from 'react';
import type { PreMarketChecklist, IntradayMarketRegimeData, IndexSymbol, OptionStrikeData } from '../types';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { 
  Clock, 
  Activity, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  X, 
  ShieldAlert, 
  BarChart3, 
  Zap, 
  Target, 
  Flame, 
  Layers, 
  DollarSign,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

interface PreMarketRadarCardProps {
  symbol: IndexSymbol;
  preMarket?: PreMarketChecklist;
  marketRegime?: IntradayMarketRegimeData;
}

type MetricKey = 'PCR' | 'OI' | 'VIX' | 'MAX_PAIN' | 'IV' | 'THETA' | 'VOLUME' | 'SR';

interface MetricDetailConfig {
  key: MetricKey;
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
  const { isBeginner, isExpert } = useTerminalMode();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);

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
      label: 'PCR (Put-Call Ratio)',
      shortLabel: 'PCR',
      icon: <Activity className="w-4 h-4 text-accent-sky" />,
      value: activePcr.toFixed(2),
      subValue: activePcr >= 1.0 ? 'Puts > Calls' : 'Calls > Puts',
      sentiment: pcrSentiment,
      badge: activePcr >= 1.2 ? '🟢 Oversold / Bounce' : activePcr <= 0.8 ? '🔴 Heavy Calls' : '🟡 Neutral',
      summary: 'Compares the number of put options (bets that market will fall) to call options (bets that market will rise).',
      bulletPoints: [
        'A PCR above 1 usually means more puts than calls, which can signal an oversold market and a potential bounce up.',
        'A PCR well below 1 suggests heavy call buying, pointing to a potential overbought market or strong bullish momentum.',
        `Live ${symbol} PCR stands at ${activePcr.toFixed(2)}, indicating ${activePcr >= 1.0 ? 'solid Put writer cushion under market.' : 'heavy Call writer resistance overhead.'}`
      ],
      actionTakeaway: activePcr >= 1.1 ? 'Look for bullish dip-buying setups near support levels.' : activePcr <= 0.85 ? 'Exercise caution buying calls into heavy resistance.' : 'Trade range breakouts with OI confirmation.'
    },
    {
      key: 'OI',
      label: 'OI (Open Interest)',
      shortLabel: 'Open Interest',
      icon: <Layers className="w-4 h-4 text-accent-purple" />,
      value: oiFormatted,
      subValue: 'Active Contracts',
      sentiment: 'NEUTRAL',
      badge: '📊 Live Accumulation',
      summary: 'Shows the total number of active or open options contracts that are not yet settled.',
      bulletPoints: [
        'Rising OI with rising prices means new buyers are entering, supporting an upward trend.',
        'Rising OI with falling prices means new short positions are building, signaling a strong downward trend.',
        `Total active market interest across ${symbol} option strikes currently stands at ${oiFormatted}.`
      ],
      actionTakeaway: 'Watch 1-minute Delta OI on ATM strikes to confirm whether breakouts have genuine institutional backing.'
    },
    {
      key: 'VIX',
      label: 'India VIX (Volatility Index)',
      shortLabel: 'India VIX',
      icon: <Flame className="w-4 h-4 text-amber" />,
      value: vixValue.toFixed(2),
      subValue: vixValue > 18 ? 'High Volatility' : 'Calm Volatility',
      sentiment: vixSentiment,
      badge: vixValue > 16 ? '⚠️ Elevated Vol' : '🟢 Stable Cushion',
      summary: "Measures the market's expectation of near-term volatility or price swings based on index option prices.",
      bulletPoints: [
        'A high VIX means the market expects wild swings, making options expensive to buy.',
        'A low VIX means the market is calm, making options cheaper.',
        `Current India VIX is at ${vixValue.toFixed(2)}, reflecting ${vixValue < 14 ? 'calm market conditions with controlled option pricing.' : 'heightened volatility expectations.'}`
      ],
      actionTakeaway: vixValue > 16 ? 'Be careful of sharp pullbacks and IV crush after big events.' : 'Great environment for directional breakout setups.'
    },
    {
      key: 'MAX_PAIN',
      label: 'Max Pain Strike',
      shortLabel: 'Max Pain',
      icon: <Target className="w-4 h-4 text-bull" />,
      value: `₹${maxPainStrike.toLocaleString('en-IN')}`,
      subValue: distToMaxPain >= 0 ? `+${distToMaxPain} pts` : `${distToMaxPain} pts`,
      sentiment: Math.abs(distToMaxPain) <= 50 ? 'BULLISH' : 'NEUTRAL',
      badge: '🎯 Expiry Magnet',
      summary: 'The strike price where the highest number of options (both puts and calls) expire worthless.',
      bulletPoints: [
        'Market expiration often gravitates toward this price as option writers try to inflict maximum financial "pain" on option buyers.',
        `For ${symbol}, Max Pain is currently pegged at ₹${maxPainStrike.toLocaleString('en-IN')}.`,
        'As expiry day progresses (especially after 01:30 PM), prices tend to magnetize towards this strike.'
      ],
      actionTakeaway: `Expect strong mean-reversion pull towards ₹${maxPainStrike} on weekly/monthly expiry sessions.`
    },
    {
      key: 'IV',
      label: 'Implied Volatility (IV)',
      shortLabel: 'ATM IV',
      icon: <Zap className="w-4 h-4 text-accent-cyan" />,
      value: `${avgIv}%`,
      subValue: avgIv < 13 ? 'Cheap Premiums' : avgIv > 18 ? 'Expensive' : 'Fair Value',
      sentiment: avgIv > 18 ? 'WARNING' : 'BULLISH',
      badge: avgIv < 13 ? '🟢 Cheap Vol' : avgIv > 18 ? '🚨 Crush Risk' : '📊 Fair Value',
      summary: 'Shows how much the market expects the price to move before expiration. High IV inflates option premiums.',
      bulletPoints: [
        'High IV inflates option premiums; buyers risk losing money to IV crush once uncertainty settles.',
        'Low IV offers affordable premium buying opportunities with low decay vulnerability.',
        `Average ATM Implied Volatility is currently ${avgIv}%.`
      ],
      actionTakeaway: avgIv > 18 ? 'Avoid buying far OTM options; use spreads to hedge volatility risk.' : 'Safe conditions for directional single-leg option buys.'
    },
    {
      key: 'THETA',
      label: 'Time Decay (Theta)',
      shortLabel: 'Theta Decay',
      icon: <Clock className="w-4 h-4 text-bear" />,
      value: `${dailyTheta.toFixed(1)} pts`,
      subValue: `${hourlyTheta} pts/hr`,
      sentiment: 'BEARISH',
      badge: '⏳ Daily Erosion',
      summary: 'Options lose value every single day as they get closer to their expiration date.',
      bulletPoints: [
        'Buyers lose money to Theta time decay; sellers/writers benefit from the erosion.',
        `ATM Straddle is currently shedding ~${Math.abs(dailyTheta).toFixed(1)} points per session (~${Math.abs(hourlyTheta)} pts/hr).`,
        'Theta acceleration becomes non-linear during the final 48 hours of expiration (0DTE).'
      ],
      actionTakeaway: 'Take quick profits on scalps; do not hold long option positions during slow lunchtime consolidation.'
    },
    {
      key: 'VOLUME',
      label: 'Daily Traded Volume',
      shortLabel: 'Total Volume',
      icon: <BarChart3 className="w-4 h-4 text-accent-sky" />,
      value: volFormatted,
      subValue: 'Contracts Traded',
      sentiment: 'NEUTRAL',
      badge: '⚡ High Liquidity',
      summary: 'Shows how many contracts traded on a specific day.',
      bulletPoints: [
        'High volume confirms strong institutional conviction and participant interest at specific strike prices.',
        'Volume spikes at breakout levels validate genuine buyer/seller momentum.',
        `Over ${volFormatted} contracts have exchanged hands in today's ${symbol} session.`
      ],
      actionTakeaway: 'Always trade strikes with high liquidity and tight bid-ask spreads to avoid execution slippage.'
    },
    {
      key: 'SR',
      label: 'Key Support & Resistance (OI Walls)',
      shortLabel: 'Support & Res.',
      icon: <ShieldAlert className="w-4 h-4 text-bull" />,
      value: `S: ${majorSupp} / R: ${majorRes}`,
      subValue: `Floor & Ceiling`,
      sentiment: 'BULLISH',
      badge: '🧱 Heavy OI Walls',
      summary: 'Uses OI buildup spikes to spot heavy institutional walls where price might stop or reverse.',
      bulletPoints: [
        `Primary Floor (Put Support S1): ₹${majorSupp} (Dense institutional Put writing defense).`,
        `Primary Ceiling (Call Resistance R1): ₹${majorRes} (Dense institutional Call writing resistance).`,
        'A clean break with 1-min Delta OI expansion through either wall signals explosive runaway momentum.'
      ],
      actionTakeaway: `Buy near support ₹${majorSupp} or sell near resistance ₹${majorRes}; ride breakouts if walls collapse.`
    }
  ];

  const activeMetricObj = selectedMetric ? metricsData.find(m => m.key === selectedMetric) : null;

  return (
    <div className="w-full bg-terminal-card border border-terminal-border rounded-xl p-3 sm:p-4 shadow-subtle mb-3 select-none transition-all duration-300">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-accent-purple/15 text-accent-purple">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-xs sm:text-sm text-terminal-text tracking-wide">
                PRE-MARKET PREPARATION RADAR & MARKET INTELLIGENCE
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-terminal-panel text-terminal-muted border border-terminal-border">
                {symbol}
              </span>
            </div>
            <p className="text-[11px] text-terminal-muted">
              Click any metric tile below to inspect live institutional breakdown & technical rules
            </p>
          </div>
        </div>

        {marketRegime && (
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border flex items-center space-x-1 ${
                marketRegime.structureType === 'TRENDING_DAY'
                  ? 'bg-bull/15 border-bull/40 text-bull'
                  : marketRegime.structureType === 'REVERSAL_DAY'
                  ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple'
                  : 'bg-amber/15 border-amber/40 text-amber'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>{marketRegime.structureLabel}</span>
            </span>
          </div>
        )}
      </div>

      {/* 8-Tile Interactive Numbers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono">
        {metricsData.map((m) => {
          const isSelected = selectedMetric === m.key;

          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedMetric(isSelected ? null : m.key)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer group ${
                isSelected
                  ? 'bg-accent-sky/20 border-accent-sky shadow-md ring-1 ring-accent-sky/50 scale-[1.02]'
                  : 'bg-terminal-panel/70 border-terminal-border hover:border-terminal-border/90 hover:bg-terminal-panel'
              }`}
            >
              <div className="flex items-center justify-between w-full text-[10px] text-terminal-muted font-sans font-medium mb-1">
                <span className="truncate">{m.shortLabel}</span>
                <span className="opacity-70 group-hover:opacity-100 transition-opacity">{m.icon}</span>
              </div>

              {/* Clean Numbers Only */}
              <div className="text-sm sm:text-base font-black text-terminal-text tracking-tight truncate my-0.5">
                {m.value}
              </div>

              <div className="flex items-center justify-between w-full text-[9px] mt-1 pt-1 border-t border-terminal-border/50">
                <span className={`font-bold truncate ${
                  m.sentiment === 'BULLISH' ? 'text-bull' : m.sentiment === 'BEARISH' ? 'text-bear' : m.sentiment === 'WARNING' ? 'text-amber' : 'text-terminal-muted'
                }`}>
                  {m.badge.split(' ')[0]} {m.subValue}
                </span>
                <ChevronRight className={`w-3 h-3 text-terminal-muted transition-transform ${isSelected ? 'rotate-90 text-accent-sky' : 'group-hover:translate-x-0.5'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Interactive Detail Drawer (Shows on Clicking any Tile) */}
      {activeMetricObj && (
        <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-terminal-panel via-terminal-card to-terminal-panel border border-accent-sky/50 shadow-elevated animate-fade-in font-sans">
          <div className="flex items-center justify-between border-b border-terminal-border/80 pb-2.5 mb-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-accent-sky/20 text-accent-sky border border-accent-sky/40">
                {activeMetricObj.icon}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs sm:text-sm font-bold text-terminal-text">
                    {activeMetricObj.label}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-sky/15 text-accent-sky border border-accent-sky/30">
                    Live: {activeMetricObj.value}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-terminal-panel text-terminal-muted border border-terminal-border">
                    {activeMetricObj.badge}
                  </span>
                </div>
                <p className="text-xs text-terminal-muted mt-0.5">
                  {activeMetricObj.summary}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMetric(null)}
              className="p-1 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-panel transition cursor-pointer"
              title="Close Details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Detailed Bullet Points & Guidance */}
          <div className="space-y-2 text-xs text-terminal-muted font-sans leading-relaxed">
            {activeMetricObj.bulletPoints.map((pt, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-accent-sky font-bold">•</span>
                <span>{pt}</span>
              </div>
            ))}
          </div>

          {/* Actionable Takeaway Banner */}
          <div className="mt-3 p-2.5 rounded-lg bg-accent-sky/10 border border-accent-sky/30 text-xs font-mono text-terminal-text flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-accent-sky shrink-0" />
              <span><strong>Action Rule:</strong> {activeMetricObj.actionTakeaway}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMetric(null)}
              className="text-[10px] font-sans text-accent-sky hover:underline shrink-0"
            >
              Close ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
