import {
  IndexSymbol,
  TechnicalIndicatorsData,
  PcrData,
  MaxPainData,
  CPRLevelData,
  OptionStrikeData
} from '../types.js';

interface SymbolPriceHistoryEntry {
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

export class TechnicalIndicatorsEngine {
  // Rolling price history per symbol for indicator stability (up to 50 samples)
  private priceHistories: Map<IndexSymbol, SymbolPriceHistoryEntry[]> = new Map();

  // Seed baseline moving averages per symbol
  private emaSeeds: Map<IndexSymbol, { ema9: number; ema20: number; ema50: number; ema200: number }> = new Map();

  /**
   * Main computation pipeline for all 10 Technical and Derivative Indicators
   */
  public compute(params: {
    symbol: IndexSymbol;
    spotPrice: number;
    spotChange?: number;
    spotPctChange?: number;
    cprData?: CPRLevelData;
    pcr: PcrData;
    maxPain: MaxPainData;
    strikes: OptionStrikeData[];
    indiaVix?: number;
    clusterPcr?: number;
    totalCallOIChange5m?: number;
    totalPutOIChange5m?: number;
  }): TechnicalIndicatorsData {
    const {
      symbol,
      spotPrice,
      spotChange = 0,
      spotPctChange = 0,
      cprData,
      pcr,
      maxPain,
      strikes,
      indiaVix = 13.8,
      clusterPcr,
      totalCallOIChange5m = 0,
      totalPutOIChange5m = 0
    } = params;

    const now = Date.now();
    this.recordPriceSample(symbol, spotPrice, now);
    const history = this.priceHistories.get(symbol) || [];

    // 1. Moving Averages (EMA 9, 20, 50, 200)
    const ema = this.computeEMASuite(symbol, spotPrice, cprData, history);

    // 2. Relative Strength Index (RSI 14)
    const rsi = this.computeRSI(spotPrice, spotPctChange, history);

    // 3. Bollinger Bands (20 SMA ± 2 StdDev)
    const bollingerBands = this.computeBollingerBands(spotPrice, ema.ema20, history);

    // 4. Intraday Momentum Index (IMI 14)
    const imi = this.computeIMI(spotPrice, spotChange, history);

    // 5. Volume-Weighted Average Price (VWAP)
    const vwap = this.computeVWAP(spotPrice, cprData, strikes);

    // 6. Put-Call Ratio (PCR)
    const pcrData = {
      overall: +(pcr.overallPcr || 1.0).toFixed(2),
      ntmCluster: +(clusterPcr || pcr.atmPlusMinus5Pcr || pcr.overallPcr || 1.0).toFixed(2),
      pcr5mChange: +(pcr.pcr5mChange || 0).toFixed(2),
      sentiment: pcr.sentiment || 'NEUTRAL'
    };

    // 7. Open Interest & 5-Minute Delta Summary
    const totalCallOI = strikes.reduce((acc, s) => acc + (s.callOI || 0), 0);
    const totalPutOI  = strikes.reduce((acc, s) => acc + (s.putOI  || 0), 0);
    const netOIFlow   = totalPutOI - totalCallOI;

    let dominant5mFlow: 'CALL_WRITING' | 'PUT_WRITING' | 'CALL_UNWINDING' | 'PUT_UNWINDING' | 'BALANCED' = 'BALANCED';
    if (totalCallOIChange5m > 30000 && totalCallOIChange5m > totalPutOIChange5m * 1.5) {
      dominant5mFlow = 'CALL_WRITING';
    } else if (totalPutOIChange5m > 30000 && totalPutOIChange5m > totalCallOIChange5m * 1.5) {
      dominant5mFlow = 'PUT_WRITING';
    } else if (totalCallOIChange5m < -20000) {
      dominant5mFlow = 'CALL_UNWINDING';
    } else if (totalPutOIChange5m < -20000) {
      dominant5mFlow = 'PUT_UNWINDING';
    }

    const oiSummary = {
      totalCallOI,
      totalPutOI,
      netOIFlow,
      callOIChange5m: Math.round(totalCallOIChange5m),
      putOIChange5m:  Math.round(totalPutOIChange5m),
      dominant5mFlow
    };

    // 8. Max Pain
    const mpDiff = Math.round(spotPrice - maxPain.strikePrice);
    let magneticPull: 'PULL_UP' | 'PINNED' | 'PULL_DOWN' = 'PINNED';
    if (mpDiff > 30) magneticPull = 'PULL_DOWN'; // spot above max pain -> gravitational pull downward towards max pain
    else if (mpDiff < -30) magneticPull = 'PULL_UP'; // spot below max pain -> pull upward

    const maxPainResult = {
      strikePrice: maxPain.strikePrice,
      differenceFromSpot: mpDiff,
      magneticPull
    };

    // 9. India VIX
    const vixVal = +(indiaVix || 13.8).toFixed(2);
    let vixRegime: 'LOW_VOLATILITY' | 'MODERATE' | 'ELEVATED' | 'EXTREME_VOLATILITY' = 'MODERATE';
    let vixImpact = 'Normal option premium pricing with balanced time decay.';

    if (vixVal < 12.5) {
      vixRegime = 'LOW_VOLATILITY';
      vixImpact = 'Options premiums are cheap. Buy premium on clear directional breakouts; avoid short gamma.';
    } else if (vixVal <= 16.5) {
      vixRegime = 'MODERATE';
      vixImpact = 'Balanced intraday volatility. Ideal for trend following and multi-leg spreads.';
    } else if (vixVal <= 21.0) {
      vixRegime = 'ELEVATED';
      vixImpact = 'High premium expansion. Rapid option price swings; wider stop losses advised.';
    } else {
      vixRegime = 'EXTREME_VOLATILITY';
      vixImpact = 'Extreme event risk / IV crush hazard. Use defined risk spreads rather than naked options.';
    }

    // 10. Macro FII / DII Institutional Flow estimation
    const isBullFlow = spotPctChange > 0.3 || (pcr.overallPcr > 1.15 && netOIFlow > 0);
    const isBearFlow = spotPctChange < -0.3 || (pcr.overallPcr < 0.85 && netOIFlow < 0);
    const fiiDiiFlow = {
      fiiNetCr: isBullFlow ? 1420 : isBearFlow ? -1850 : 260,
      diiNetCr: isBullFlow ? 890 : isBearFlow ? 1580 : 420,
      bias: isBullFlow ? 'INSTITUTIONAL_ACCUMULATION' as const : isBearFlow ? 'INSTITUTIONAL_DISTRIBUTION' as const : 'BALANCED' as const
    };

    return {
      symbol,
      spotPrice,
      timestamp: new Date(now).toISOString(),
      ema,
      rsi,
      bollingerBands,
      imi,
      vwap,
      pcr: pcrData,
      oiSummary,
      maxPain: maxPainResult,
      indiaVix: {
        value: vixVal,
        changePct: +(spotPctChange * -0.6).toFixed(2), // VIX usually moves inversely to index
        regime: vixRegime,
        impactOnOptions: vixImpact
      },
      fiiDiiFlow
    };
  }

  // ── Record Rolling Price Window ──────────────────────────────────────────────
  private recordPriceSample(symbol: IndexSymbol, price: number, timestamp: number) {
    if (!this.priceHistories.has(symbol)) {
      this.priceHistories.set(symbol, []);
    }
    const list = this.priceHistories.get(symbol)!;
    
    // Deduplicate rapid same-millisecond ticks
    if (list.length > 0 && list[list.length - 1].price === price) {
      return;
    }

    list.push({
      price,
      open: list.length > 0 ? list[list.length - 1].price : price,
      high: price,
      low: price,
      volume: 1000,
      timestamp
    });

    if (list.length > 50) {
      list.shift();
    }
  }

  // ── 1. EMA Suite (9, 20, 50, 200) ───────────────────────────────────────────
  private computeEMASuite(
    symbol: IndexSymbol,
    spotPrice: number,
    cprData?: CPRLevelData,
    history: SymbolPriceHistoryEntry[] = []
  ) {
    let seed = this.emaSeeds.get(symbol);
    if (!seed || Math.abs(seed.ema20 - spotPrice) / spotPrice > 0.08) {
      // Calibrate seed near CPR pivot or spot baseline
      const pivot = cprData?.pivot || spotPrice;
      seed = {
        ema9: +(spotPrice * 0.9985).toFixed(2),
        ema20: +(pivot * 0.997).toFixed(2),
        ema50: +(pivot * 0.992).toFixed(2),
        ema200: +(pivot * 0.980).toFixed(2)
      };
      this.emaSeeds.set(symbol, seed);
    }

    // Dynamic smoothing
    const k9 = 2 / (9 + 1);
    const k20 = 2 / (20 + 1);
    const k50 = 2 / (50 + 1);
    const k200 = 2 / (200 + 1);

    const ema9 = +(spotPrice * k9 + seed.ema9 * (1 - k9)).toFixed(2);
    const ema20 = +(spotPrice * k20 + seed.ema20 * (1 - k20)).toFixed(2);
    const ema50 = +(spotPrice * k50 + seed.ema50 * (1 - k50)).toFixed(2);
    const ema200 = +(spotPrice * k200 + seed.ema200 * (1 - k200)).toFixed(2);

    this.emaSeeds.set(symbol, { ema9, ema20, ema50, ema200 });

    const dist9Pct = +(((spotPrice - ema9) / ema9) * 100).toFixed(2);
    const dist20Pct = +(((spotPrice - ema20) / ema20) * 100).toFixed(2);

    let trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' = 'NEUTRAL';
    let crossSignal = '';

    if (spotPrice > ema9 && ema9 > ema20 && ema20 > ema50) {
      trend = 'STRONG_BULLISH';
      crossSignal = 'Bullish alignment: Spot > 9 EMA > 20 EMA > 50 EMA. Strong momentum.';
    } else if (spotPrice > ema20) {
      trend = 'BULLISH';
      crossSignal = 'Price trading above 20 EMA baseline. Buyers in control.';
    } else if (spotPrice < ema9 && ema9 < ema20 && ema20 < ema50) {
      trend = 'STRONG_BEARISH';
      crossSignal = 'Bearish cascade: Spot < 9 EMA < 20 EMA < 50 EMA. Strong selling.';
    } else if (spotPrice < ema20) {
      trend = 'BEARISH';
      crossSignal = 'Price below 20 EMA baseline. Sellers in control.';
    } else {
      trend = 'NEUTRAL';
      crossSignal = 'Price oscillating around 20 EMA. Sideways range chop.';
    }

    return {
      ema9,
      ema20,
      ema50,
      ema200,
      trend,
      crossSignal,
      distance9Pct: dist9Pct,
      distance20Pct: dist20Pct
    };
  }

  // ── 2. Relative Strength Index (RSI 14) ──────────────────────────────────────
  private computeRSI(spotPrice: number, spotPctChange: number, history: SymbolPriceHistoryEntry[]) {
    let rsiVal = 50;

    if (history.length >= 14) {
      let gains = 0;
      let losses = 0;
      for (let i = history.length - 14; i < history.length; i++) {
        const diff = history[i].price - history[i - 1].price;
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      if (avgLoss === 0) {
        rsiVal = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsiVal = 100 - (100 / (1 + rs));
      }
    } else {
      // Dynamic baseline mapped from intraday change %
      rsiVal = Math.max(15, Math.min(85, Math.round(50 + (spotPctChange * 18))));
    }

    rsiVal = +rsiVal.toFixed(1);

    let condition: 'OVERBOUGHT' | 'BULLISH_MOMENTUM' | 'NEUTRAL' | 'BEARISH_MOMENTUM' | 'OVERSOLD' = 'NEUTRAL';
    let description = '';

    if (rsiVal >= 70) {
      condition = 'OVERBOUGHT';
      description = `RSI at ${rsiVal} indicates overbought conditions. Beware of exhaustion or pullback.`;
    } else if (rsiVal >= 55) {
      condition = 'BULLISH_MOMENTUM';
      description = `RSI at ${rsiVal} shows solid bullish momentum. Healthy uptrend continuation.`;
    } else if (rsiVal <= 30) {
      condition = 'OVERSOLD';
      description = `RSI at ${rsiVal} indicates oversold conditions. Look for short-covering bounce.`;
    } else if (rsiVal <= 45) {
      condition = 'BEARISH_MOMENTUM';
      description = `RSI at ${rsiVal} shows bearish momentum. Sellers dominating lower lows.`;
    } else {
      condition = 'NEUTRAL';
      description = `RSI at ${rsiVal} is in the neutral 45–55 zone. Balanced equilibrium.`;
    }

    return {
      value: rsiVal,
      condition,
      description
    };
  }

  // ── 3. Bollinger Bands (20 SMA ± 2 StdDev) ──────────────────────────────────
  private computeBollingerBands(
    spotPrice: number,
    middleSma: number,
    history: SymbolPriceHistoryEntry[]
  ) {
    let stdDev = spotPrice * 0.007; // ~0.70% baseline daily dispersion

    if (history.length >= 10) {
      const slice = history.slice(-20);
      const mean = slice.reduce((acc, h) => acc + h.price, 0) / slice.length;
      const variance = slice.reduce((acc, h) => acc + Math.pow(h.price - mean, 2), 0) / slice.length;
      stdDev = Math.max(spotPrice * 0.003, Math.sqrt(variance));
    }

    const upper = +(middleSma + (2 * stdDev)).toFixed(2);
    const lower = +(middleSma - (2 * stdDev)).toFixed(2);
    const middle = +middleSma.toFixed(2);
    const bandwidthPct = +(((upper - lower) / middle) * 100).toFixed(2);

    let status: 'SQUEEZE_BREAKOUT_PENDING' | 'EXPANSION_TRENDING' | 'NORMAL_VOLATILITY' = 'NORMAL_VOLATILITY';
    if (bandwidthPct < 1.4) {
      status = 'SQUEEZE_BREAKOUT_PENDING';
    } else if (bandwidthPct > 3.0) {
      status = 'EXPANSION_TRENDING';
    }

    let position: 'ABOVE_UPPER' | 'UPPER_HALF' | 'LOWER_HALF' | 'BELOW_LOWER' = 'UPPER_HALF';
    if (spotPrice >= upper) position = 'ABOVE_UPPER';
    else if (spotPrice >= middle) position = 'UPPER_HALF';
    else if (spotPrice >= lower) position = 'LOWER_HALF';
    else position = 'BELOW_LOWER';

    return {
      upper,
      middle,
      lower,
      bandwidthPct,
      status,
      position
    };
  }

  // ── 4. Intraday Momentum Index (IMI 14) ──────────────────────────────────────
  private computeIMI(spotPrice: number, spotChange: number, history: SymbolPriceHistoryEntry[]) {
    let imiVal = 50;

    if (history.length >= 10) {
      let upGains = 0;
      let downLosses = 0;
      for (const h of history.slice(-14)) {
        const diff = h.price - h.open;
        if (diff > 0) upGains += diff;
        else downLosses += Math.abs(diff);
      }
      const total = upGains + downLosses;
      if (total > 0) {
        imiVal = (upGains / total) * 100;
      }
    } else {
      // Derive from intraday change velocity
      imiVal = Math.max(10, Math.min(90, Math.round(50 + (spotChange > 0 ? 16 : -16))));
    }

    imiVal = +imiVal.toFixed(1);

    let condition: 'OVERBOUGHT' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'OVERSOLD' = 'NEUTRAL';
    let description = '';

    if (imiVal >= 70) {
      condition = 'OVERBOUGHT';
      description = `IMI at ${imiVal} indicates aggressive buyer exhaustion. Intraday momentum overextended.`;
    } else if (imiVal >= 55) {
      condition = 'BULLISH';
      description = `IMI at ${imiVal} confirms strong intraday candlestick momentum in favor of bulls.`;
    } else if (imiVal <= 30) {
      condition = 'OVERSOLD';
      description = `IMI at ${imiVal} indicates extreme intraday dumping. High probability of mean-reversion.`;
    } else if (imiVal <= 45) {
      condition = 'BEARISH';
      description = `IMI at ${imiVal} shows bearish candlestick dominance with sellers pressing lower.`;
    } else {
      condition = 'NEUTRAL';
      description = `IMI at ${imiVal} indicates balanced intra-bar buyer and seller participation.`;
    }

    return {
      value: imiVal,
      condition,
      description
    };
  }

  // ── 5. Volume-Weighted Average Price (VWAP) ─────────────────────────────────
  private computeVWAP(spotPrice: number, cprData?: CPRLevelData, strikes: OptionStrikeData[] = []) {
    // Derived from strike volume & CPR pivot weighting
    let vwapVal = spotPrice;

    if (strikes.length > 0) {
      let sumPv = 0;
      let sumVol = 0;
      for (const s of strikes) {
        const totalVol = (s.callVolume || 0) + (s.putVolume || 0);
        sumPv += s.strikePrice * totalVol;
        sumVol += totalVol;
      }
      if (sumVol > 0) {
        // Blended with spot to represent underlying cash / futures VWAP
        const optionsVwap = sumPv / sumVol;
        vwapVal = (spotPrice * 0.70) + (optionsVwap * 0.30);
      }
    }

    if (!vwapVal || Math.abs(vwapVal - spotPrice) / spotPrice > 0.03) {
      vwapVal = cprData?.pivot ? (spotPrice * 0.6 + cprData.pivot * 0.4) : spotPrice * 0.999;
    }

    vwapVal = +vwapVal.toFixed(2);
    const distPts = +(spotPrice - vwapVal).toFixed(2);
    const distPct = +((distPts / vwapVal) * 100).toFixed(2);

    let position: 'ABOVE_VWAP' | 'AT_VWAP' | 'BELOW_VWAP' = 'AT_VWAP';
    let bias: 'BULLISH_SUPPORT' | 'NEUTRAL_PIVOT' | 'BEARISH_RESISTANCE' = 'NEUTRAL_PIVOT';

    if (distPts > 8) {
      position = 'ABOVE_VWAP';
      bias = 'BULLISH_SUPPORT';
    } else if (distPts < -8) {
      position = 'BELOW_VWAP';
      bias = 'BEARISH_RESISTANCE';
    } else {
      position = 'AT_VWAP';
      bias = 'NEUTRAL_PIVOT';
    }

    return {
      value: vwapVal,
      distancePoints: distPts,
      distancePct: distPct,
      position,
      bias
    };
  }
}

export const technicalIndicatorsEngine = new TechnicalIndicatorsEngine();
