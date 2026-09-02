import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { useTerminalMode } from '../context/TerminalModeContext';
import { Zap, TrendingUp, TrendingDown, Shield, AlertTriangle, Target, Activity, ChevronDown, ChevronUp } from 'lucide-react';

// ─── VIX Regime Engine ────────────────────────────────────────────────────────
//
// Based on the professional volatility framework used by elite derivatives desks:
//   < 12   : ULTRA LOW — complacency / sell vol aggressively
//   12-15  : LOW       — sell premium, covered calls, bull spreads
//   15-18  : MODERATE  — balanced; small directional trades with defined risk
//   18-22  : ELEVATED  — buy protection, reduce size, prefer spreads
//   22-28  : HIGH      — mean-reversion setups; buy dips with tight stops
//   > 28   : EXTREME   — buy straddles at spikes; aggressive fade setups
//
// India VIX measures 30-day expected Nifty move (annualised)
// at VIX=15 → implied daily Nifty move ≈ ±0.94%

interface Strategy {
  title: string;
  action: string;
  rationale: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  profitFrom: string;
  avoid: string;
}

interface VixRegime {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gaugeColor: string;
  icon: React.ReactNode;
  dailyMovePct: number;
  strategies: Strategy[];
  contextNote: string;
}

function getVixRegime(vix: number): VixRegime {
  const dailyMovePct = +(vix / Math.sqrt(252)).toFixed(2);

  if (vix < 12) {
    return {
      label: 'ULTRA LOW — Complacency Zone',
      shortLabel: 'ULTRA LOW',
      color: 'text-accent-cyan',
      bgColor: 'bg-accent-cyan/5',
      borderColor: 'border-accent-cyan/40',
      gaugeColor: 'bg-accent-cyan',
      icon: <Shield className="w-4 h-4" />,
      dailyMovePct,
      contextNote: 'VIX < 12 historically precedes sharp reversals. Complacency is highest; smart money builds protection quietly.',
      strategies: [
        {
          title: '🏦 Short Strangle (Premium Harvest)',
          action: 'Sell OTM CE + OTM PE (1–2 strikes out each side) on weekly expiry',
          rationale: 'Ultra-low IV means theta decay is fast. Collect small, consistent income. The setup works until a black-swan event.',
          riskLevel: 'MEDIUM',
          profitFrom: 'Time decay with spot staying range-bound',
          avoid: 'Holding naked short strangles into major events (budget, RBI policy)'
        },
        {
          title: '🛡️ Cheap Tail Hedge (Insurance Buy)',
          action: 'Buy 1–2% OTM long-dated PE (2–4 weeks out) for tiny premium',
          rationale: 'When VIX is rock-bottom, tail-risk protection is cheapest. The best traders silently load portfolio insurance before the crowd panics.',
          riskLevel: 'LOW',
          profitFrom: 'VIX spike / sharp market fall after extended complacency',
          avoid: 'Buying ATM options — excessive theta bleed at low IV'
        },
        {
          title: '📈 Bull Call Spread',
          action: 'Buy ATM CE + Sell OTM CE (1–2 strikes up) same expiry',
          rationale: 'Low VIX = cheap debit; you pay minimal premium for defined upside. Spread limits cost while capturing directional move.',
          riskLevel: 'LOW',
          profitFrom: 'Gradual bullish grind; spot closing between strikes',
          avoid: 'Buying naked CE — any reversal will crush premium fast'
        }
      ]
    };
  }

  if (vix < 15) {
    return {
      label: 'LOW — Sell Premium Regime',
      shortLabel: 'LOW',
      color: 'text-bull',
      bgColor: 'bg-bull/5',
      borderColor: 'border-bull/40',
      gaugeColor: 'bg-bull',
      icon: <TrendingUp className="w-4 h-4" />,
      dailyMovePct,
      contextNote: 'VIX 12–15 is the ideal premium-selling zone. Systematic sellers collect 3–5% weekly income. Market is trending with low choppiness.',
      strategies: [
        {
          title: '🎯 Iron Condor (Core Strategy)',
          action: 'Sell CE + PE strangle ±2–3% OTM; buy wings ±4–5% OTM as hedges',
          rationale: 'The professional retail income trade. In a low-VIX trending market, spot stays in a defined range. Collect both sides with defined max loss from wing hedges.',
          riskLevel: 'MEDIUM',
          profitFrom: 'Spot staying within the iron condor range until expiry',
          avoid: 'Earnings / RBI policy week — skip those expiries or flatten early'
        },
        {
          title: '📊 Covered Call on Futures',
          action: 'Long Nifty/BankNifty futures + Sell OTM CE 1 strike above resistance',
          rationale: 'Low VIX = high theta per day. Selling covered calls against a long future reduces cost of carry and adds a systematic income layer.',
          riskLevel: 'MEDIUM',
          profitFrom: 'Spot staying below sold CE; premium decay over 3–5 days',
          avoid: 'Selling CE too close to ATM — gaps can force buy-back at a loss'
        },
        {
          title: '🚀 Bull Put Spread (Direction + Income)',
          action: 'Sell ATM–1 PE + Buy ATM–3 PE; receive net credit',
          rationale: 'With PCR bullish and VIX low, put side is cheap to sell while put writers control the market. Defined risk; profits from mild upside or flat market.',
          riskLevel: 'LOW',
          profitFrom: 'Market staying above the short put strike',
          avoid: 'Taking too wide a spread — manage with PCR confirmation'
        }
      ]
    };
  }

  if (vix < 18) {
    return {
      label: 'MODERATE — Balanced Opportunity',
      shortLabel: 'MODERATE',
      color: 'text-amber',
      bgColor: 'bg-amber/5',
      borderColor: 'border-amber/40',
      gaugeColor: 'bg-amber',
      icon: <Activity className="w-4 h-4" />,
      dailyMovePct,
      contextNote: 'VIX 15–18: healthy vol. Both buyers and sellers have edge. Ideal for directional trades with clear entry signals from OI and PCR.',
      strategies: [
        {
          title: '🎯 ATM Straddle — Event Plays',
          action: 'Buy ATM CE + ATM PE 2–3 days before key events (RBI, GDP, earnings)',
          rationale: 'At 15–18 VIX the straddle is not expensive yet directional uncertainty is rising. Buy before event, ride IV expansion and spot move, exit on the day of event.',
          riskLevel: 'MEDIUM',
          profitFrom: 'Big spot move in either direction OR IV spike into event',
          avoid: 'Holding straddle through the actual event — IV crush kills both legs'
        },
        {
          title: '📈 Directional OTM Option Buy',
          action: 'Buy 1-strike OTM CE or PE in the direction confirmed by OI + PCR signal',
          rationale: 'VIX 15–18 = premium affordable, moves happening. Use OI buildup to find the direction. Risk small, target 3–5x. This is the high-asymmetry zone.',
          riskLevel: 'HIGH',
          profitFrom: 'Clean directional breakout within 1–2 sessions',
          avoid: 'Going OTM more than 2 strikes — delta too low to profit from moderate moves'
        },
        {
          title: '🏗️ Ratio Spread',
          action: 'Buy 1 ATM CE + Sell 2 OTM CE (1:2 ratio call spread)',
          rationale: 'Collect near-zero debit for a moderately bullish position. The short 2× OTM CEs fund the ATM buy. Best when you expect a controlled rally, not a vertical spike.',
          riskLevel: 'MEDIUM',
          profitFrom: 'Spot moving to upper OTM strike and stalling',
          avoid: 'Gap-up opens — naked short leg of ratio becomes dangerous immediately'
        }
      ]
    };
  }

  if (vix < 22) {
    return {
      label: 'ELEVATED — Buy Protection Mode',
      shortLabel: 'ELEVATED',
      color: 'text-amber',
      bgColor: 'bg-amber/8',
      borderColor: 'border-amber/50',
      gaugeColor: 'bg-amber shadow-[0_0_10px_rgba(255,184,0,0.4)]',
      icon: <AlertTriangle className="w-4 h-4" />,
      dailyMovePct,
      contextNote: 'VIX 18–22: market stress is building. Premium sellers get hurt; option buyers start making real money. Reduce size, hedge everything, trade with defined risk only.',
      strategies: [
        {
          title: '🛡️ Protective Put Ladder',
          action: 'Buy ATM PE + 1-strike OTM PE in 1:2 ratio on holdings / long futures',
          rationale: 'Elevated VIX means downside accelerates. Ladder hedges give protection at multiple levels. Smart traders never go into elevated VIX without defined-risk hedges.',
          riskLevel: 'LOW',
          profitFrom: 'Spot falling 1–3%; multiplied payoff from ladder structure',
          avoid: 'Naked long futures or unhedged equity positions above 18 VIX'
        },
        {
          title: '⚡ Bear Put Spread (Controlled Bearish)',
          action: 'Buy ATM PE + Sell 2% OTM PE; net debit trade',
          rationale: 'When VIX is elevated markets often trend down. Bear put spread gives cheaper long-put entry while the OTM sold PE caps your max cost. Clean risk/reward for a trending bear move.',
          riskLevel: 'MEDIUM',
          profitFrom: 'Spot declining to the lower OTM put strike',
          avoid: 'Sizing too large — elevated VIX means intraday swings are violent'
        },
        {
          title: '📉 Short Futures + Strangle Hedge',
          action: 'Short 1 lot near-month futures + Buy wide OTM strangle as hedge',
          rationale: 'When institutional OI shows call writing with VIX rising, the trend is clearly down with spikes. Short with an OTM CE hedge prevents catastrophic loss from sudden reversal.',
          riskLevel: 'HIGH',
          profitFrom: 'Controlled bearish drift; futures profits; strangle protects against spikes',
          avoid: 'RBI/global macro event days — whipsaw will trigger both sides of strangle'
        }
      ]
    };
  }

  if (vix < 28) {
    return {
      label: 'HIGH — Mean Reversion Setup',
      shortLabel: 'HIGH',
      color: 'text-bear',
      bgColor: 'bg-bear/8',
      borderColor: 'border-bear/40',
      gaugeColor: 'bg-bear shadow-[0_0_10px_rgba(255,59,105,0.4)]',
      icon: <TrendingDown className="w-4 h-4" />,
      dailyMovePct,
      contextNote: 'VIX 22–28: fear is in the market. Elite traders make their best returns here — buy dips aggressively at key levels with tight stops. The crowd is selling; be the buyer.',
      strategies: [
        {
          title: '🔥 Dip Buyer (High-Conviction Long)',
          action: 'Buy 1–2% OTM CE on strong support levels (Max Pain / Put Wall OI)',
          rationale: 'When VIX > 22 and spot hits major support (put writing zones visible in OI data), the risk/reward of buying calls is exceptional. Professionals fade fear here with small size and tight stops.',
          riskLevel: 'HIGH',
          profitFrom: 'Snap-back rally of 1–3% from oversold / key support levels',
          avoid: 'Averaging into a position if support breaks — use hard stops'
        },
        {
          title: '⚡ Long Straddle — Spike & Fade',
          action: 'Buy ATM straddle when VIX is spiking intraday; target 50%+ premium expansion',
          rationale: 'VIX spikes are non-linear. When VIX jumps 2–3 points intraday, straddle value expands dramatically. Enter on the spike, ride the fear, exit when vol reverts.',
          riskLevel: 'HIGH',
          profitFrom: 'Further VIX spike OR big spot move in either direction',
          avoid: 'Holding straddle into close when IV typically compresses — exit by 2:30 PM'
        },
        {
          title: '🏦 Sell OTM PE at Support (Put Writing)',
          action: 'Sell 2–3% OTM PE at strong Put Wall support with 1:3 risk/reward target',
          rationale: 'High VIX inflates PE premium. At major OI support levels, FII put writing creates a natural floor. Sell elevated PEs at support, collect rich premium, manage at 50% profit.',
          riskLevel: 'MEDIUM',
          profitFrom: 'Spot bouncing from support; VIX reverting; PE premium collapsing',
          avoid: 'Selling PE on a breakdown below major Put OI floor — always hedge with wing buy'
        }
      ]
    };
  }

  // vix >= 28: EXTREME
  return {
    label: 'EXTREME — Panic / Black Swan Mode',
    shortLabel: 'EXTREME',
    color: 'text-bear',
    bgColor: 'bg-bear/12',
    borderColor: 'border-bear/60',
    gaugeColor: 'bg-bear shadow-[0_0_16px_rgba(255,59,105,0.7)]',
    icon: <AlertTriangle className="w-4 h-4 animate-pulse" />,
    dailyMovePct,
    contextNote: 'VIX > 28 is rare (< 5% of trading days) and is where the biggest money is made. Market is in panic. Be a buyer of options, not a seller.',
    strategies: [
      {
        title: '💥 Straddle at VIX Peak (Elite Entry)',
        action: 'Buy ATM straddle aggressively when VIX is at or near local peak (look for VIX hourly reversal)',
        rationale: 'The #1 insight of elite volatility traders: VIX is mean-reverting. Extreme VIX spikes are followed by equally explosive reversals. When VIX > 28 and rolls over, both IV normalisation AND a directional spot move create multi-bagger option payoffs.',
        riskLevel: 'HIGH',
        profitFrom: 'Spot making a sharp move in either direction; IV eventually normalising',
        avoid: 'Selling premium of any kind when VIX > 28 — risk of ruin is real'
      },
      {
        title: '🏗️ Synthetic Long at Capitulation',
        action: 'Buy ATM CE + Sell ATM PE (same expiry) when market is in freefall',
        rationale: 'A synthetic long behaves like a long future with defined-risk profile when combined with an OTM PE hedge. At extreme panic lows, you create a levered long position at the point of maximum fear — historically the highest-probability trade.',
        riskLevel: 'HIGH',
        profitFrom: 'Sharp V-shaped recovery from capitulation low',
        avoid: 'This trade if the macro trigger is structural — give it time and room'
      },
      {
        title: '🛡️ Scale-In Accumulation + OTM CE Ladder',
        action: 'Buy Nifty ETF (Nippon/SBI) on 3% decline intervals + buy OTM CE ladder as gamma kicker',
        rationale: 'The Buffett playbook adapted for derivatives: accumulate equity in panic, add OTM CEs as asymmetric upside. If market recovers (historically always has), CE ladder generates 5–20x on a small premium outlay.',
        riskLevel: 'MEDIUM',
        profitFrom: 'Recovery over days to weeks; CE ladder expires in-the-money',
        avoid: 'Panicking and selling equity positions at the VIX extreme bottom'
      }
    ]
  };
}

const RiskBadge: React.FC<{ level: Strategy['riskLevel'] }> = ({ level }) => {
  const styles = {
    LOW: 'bg-bull/15 text-bull border-bull/30',
    MEDIUM: 'bg-amber/15 text-amber border-amber/30',
    HIGH: 'bg-bear/15 text-bear border-bear/30'
  };
  return (
    <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${styles[level]}`}>
      {level} RISK
    </span>
  );
};

export const IndiaVixCard: React.FC = () => {
  const { currentIndexState } = useMarket();
  const { mode, isBeginner, isIntermediate, isExpert } = useTerminalMode();
  const indiaVix = currentIndexState?.indiaVix;

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('oi_radar_vix_card_open');
    return saved !== 'false'; // default open
  });

  const toggleOpen = () => {
    setIsOpen(prev => {
      const next = !prev;
      localStorage.setItem('oi_radar_vix_card_open', String(next));
      return next;
    });
  };

  // Loading / no-data state — always show header so user can see the card exists
  const regime = indiaVix && indiaVix > 0 ? getVixRegime(indiaVix) : null;
  const gaugePct = regime && indiaVix
    ? Math.min(100, Math.max(0, Math.round(((indiaVix - 8) / 32) * 100)))
    : 0;

  const headerBorderColor = regime ? regime.borderColor : 'border-terminal-border';
  const headerBgColor     = regime ? regime.bgColor     : 'bg-terminal-card';

  return (
    <div className={`rounded-xl border shadow-lg flex flex-col transition-all duration-300 ${headerBgColor} ${headerBorderColor}`}>

      {/* ── Collapsible Header (matches PCR / Theta pattern) ── */}
      <button
        type="button"
        onClick={toggleOpen}
        className="flex items-center justify-between w-full p-3.5 text-left group"
      >
        {/* Left: accent bar + icon + title */}
        <div className="flex items-center space-x-2">
          <span className={`w-1.5 h-5 rounded-full shrink-0 ${regime ? regime.gaugeColor : 'bg-amber shadow-[0_0_8px_#FFB800]'}`} />
          <div className={`p-1.5 rounded-lg border shrink-0 ${regime ? `${regime.bgColor} ${regime.borderColor}` : 'bg-amber/15 border-amber/30'}`}>
            <Zap className={`w-3.5 h-3.5 ${regime ? regime.color : 'text-amber'}`} />
          </div>
          <div>
            <h2 className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider text-terminal-text drop-shadow-[0_0_8px_rgba(255,184,0,0.3)]">
              {isBeginner 
                ? '⚡ India VIX: Market Fear & Risk Meter' 
                : isIntermediate 
                ? '⚡ INDIA VIX — MARKET VOLATILITY GAUGE' 
                : '🔬 INDIA VIX IMPLIED VOLATILITY & REGIME MATRIX'}
            </h2>
            <span className="text-[9px] text-terminal-muted block">
              {isBeginner 
                ? 'Shows how wildly the market is expected to move (Higher = Riskier)' 
                : isIntermediate 
                ? 'NSE Volatility Index • Options Strategies & Hedging Guidance' 
                : '30-Day Annualised Variance & Institutional Mean-Reversion Playbook'}
            </span>
          </div>
        </div>

        {/* Right: regime badge + VIX value + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {regime && indiaVix ? (
            <div className={`flex items-center gap-1 text-[10px] font-mono font-black px-2 py-1 rounded-lg border ${regime.bgColor} ${regime.borderColor} ${regime.color}`}>
              {regime.icon}
              <span>{indiaVix.toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-terminal-muted animate-pulse">Loading…</span>
          )}
          <div className="p-1 rounded-lg bg-terminal-panel border border-terminal-border text-terminal-muted group-hover:text-terminal-text transition">
            {isOpen
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />
            }
          </div>
        </div>
      </button>

      {/* ── Collapsible Body ── */}
      {isOpen && (
        <>
          {/* Loading state */}
          {(!indiaVix || indiaVix <= 0 || !regime) && (
            <div className="px-3.5 pb-3.5 text-[11px] text-terminal-muted font-mono animate-pulse text-center py-4 border-t border-terminal-border/40">
              Fetching India VIX from NSE…
            </div>
          )}

          {/* Live content */}
          {regime && indiaVix && indiaVix > 0 && (
            <>
              {/* VIX Value & Gauge */}
              <div className="px-3.5 pt-1 pb-2 border-t border-terminal-border/40">
                <div className="bg-terminal-bg/80 border border-terminal-border/60 rounded-xl p-3 mb-2.5">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[11px] font-mono text-terminal-muted">30-Day Implied Volatility:</span>
                    <span className={`text-2xl font-mono font-black tracking-wide ${regime.color}`}>
                      {indiaVix.toFixed(2)}
                    </span>
                  </div>

                  {/* Gauge Bar */}
                  <div className="w-full bg-terminal-panel rounded-full h-2.5 overflow-hidden border border-terminal-border/40 mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${regime.gaugeColor}`}
                      style={{ width: `${gaugePct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-terminal-muted">
                    <span>8 (Calm)</span>
                    <span>15</span>
                    <span>22</span>
                    <span>28</span>
                    <span>40 (Panic)</span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-1.5 mb-2.5 font-mono text-center text-[10px]">
                  <div className="bg-terminal-bg/70 border border-terminal-border/50 rounded-lg p-1.5">
                    <span className="text-terminal-muted block text-[8px]">DAILY MOVE</span>
                    <span className={`font-black ${regime.color}`}>±{regime.dailyMovePct}%</span>
                  </div>
                  <div className="bg-terminal-bg/70 border border-terminal-border/50 rounded-lg p-1.5">
                    <span className="text-terminal-muted block text-[8px]">REGIME</span>
                    <span className={`font-black text-[9px] ${regime.color}`}>{regime.shortLabel}</span>
                  </div>
                  <div className="bg-terminal-bg/70 border border-terminal-border/50 rounded-lg p-1.5">
                    <span className="text-terminal-muted block text-[8px]">WEEKLY MOVE</span>
                    <span className={`font-black ${regime.color}`}>±{(regime.dailyMovePct * Math.sqrt(5)).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Context Note */}
                <div className={`text-[9px] font-mono leading-tight px-2 py-1.5 rounded-lg border mb-1 ${regime.bgColor} ${regime.borderColor} ${regime.color}`}>
                  <span className="font-black">💡 </span>{regime.contextNote}
                </div>
              </div>

              {/* Strategy Cards */}
              <div className="px-3.5 pb-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className={`w-3.5 h-3.5 ${regime.color}`} />
                  <span className="font-mono font-black text-[10px] uppercase text-terminal-text tracking-wide">
                    VIX-CALIBRATED STRATEGIES
                  </span>
                </div>

                {regime.strategies.map((strat, idx) => (
                  <div
                    key={idx}
                    className="bg-terminal-bg/80 border border-terminal-border/60 rounded-xl p-2.5 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-black text-[11px] text-terminal-text leading-tight">
                        {strat.title}
                      </span>
                      <RiskBadge level={strat.riskLevel} />
                    </div>

                    <div className="text-[10px] font-mono text-terminal-muted bg-terminal-panel/60 px-2 py-1 rounded-lg border border-terminal-border/40 leading-tight">
                      <span className={`font-black ${regime.color}`}>ACTION: </span>{strat.action}
                    </div>

                    <div className="text-[9px] font-mono text-terminal-muted leading-tight">
                      <span className="text-accent-cyan font-bold">WHY: </span>{strat.rationale}
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                      <div className="bg-bull/8 border border-bull/20 rounded px-1.5 py-1 leading-tight">
                        <span className="text-bull font-black block">✓ PROFIT FROM</span>
                        <span className="text-terminal-muted">{strat.profitFrom}</span>
                      </div>
                      <div className="bg-bear/8 border border-bear/20 rounded px-1.5 py-1 leading-tight">
                        <span className="text-bear font-black block">✗ AVOID</span>
                        <span className="text-terminal-muted">{strat.avoid}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-3.5 pb-3 text-[9px] font-mono text-terminal-muted flex items-center gap-1.5 border-t border-terminal-border/40 pt-2">
                <Zap className="w-3 h-3 text-amber" />
                <span>Strategies calibrated to current India VIX regime • Updates every 15s</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

