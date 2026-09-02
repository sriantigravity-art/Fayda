import {
  IndexSymbol,
  NtmClusterState,
  NtmStrikeRegime,
  NtmRegimeType,
  NtmSentimentType,
  NtmStrikeOptionLeg
} from '../types.js';

interface RawStrikeData {
  strikePrice: number;
  callOI: number;
  callOIChangeTotal?: number;
  callLtp: number;
  callVolume: number;
  putOI: number;
  putOIChangeTotal?: number;
  putLtp: number;
  putVolume: number;
}

interface StrikeBaseline {
  initialOI: number;
  openLtp: number;
  previousLtp: number;
  date: string;
}

export class NtmClusterEngine {
  // Key format: `${symbol}_${strikePrice}_${CE/PE}`
  private baselines: Map<string, StrikeBaseline> = new Map();

  private getTodayDateStr(): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    return ist.toISOString().split('T')[0];
  }

  /**
   * Core Mathematical Classification Engine
   * Evaluates the live % change in OI and price movement direction
   * Thresholds:
   *  - OI >= +50.0%: Institutional Buildup
   *  - OI <= -15.0%: Institutional Unwinding / Squeeze
   */
  public classifyMarketRegime(
    oiChangePct: number,
    priceChange: number,
    fallbackDirection: number = 0
  ): {
    regime: NtmRegimeType;
    sentiment: NtmSentimentType;
    visualEmoji: string;
    actionDescription: string;
  } {
    const effectivePriceChange = priceChange !== 0 ? priceChange : fallbackDirection;

    if (oiChangePct >= 50.0 && effectivePriceChange > 0) {
      return {
        regime: 'Long Buildup',
        sentiment: 'Bullish',
        visualEmoji: '🟢',
        actionDescription: 'Aggressive buyers entering (+OI, +Price). Upward momentum expected.'
      };
    } else if (oiChangePct >= 50.0 && effectivePriceChange <= 0) {
      return {
        regime: 'Short Buildup',
        sentiment: 'Bearish',
        visualEmoji: '🔴',
        actionDescription: 'Heavy short writing (+OI, -Price). Resistance/selling pressure forming.'
      };
    } else if (oiChangePct <= -15.0 && effectivePriceChange > 0) {
      return {
        regime: 'Short Covering',
        sentiment: 'Strongly Bullish',
        visualEmoji: '🚀',
        actionDescription: 'Trapped short sellers panicking (-OI, +Price). Rapid upward squeeze likely.'
      };
    } else if (oiChangePct <= -15.0 && effectivePriceChange <= 0) {
      return {
        regime: 'Long Unwinding',
        sentiment: 'Strongly Bearish',
        visualEmoji: '⚠️',
        actionDescription: 'Long buyers dumping positions (-OI, -Price). Downward slide underway.'
      };
    } else {
      return {
        regime: 'Neutral',
        sentiment: 'Sideways',
        visualEmoji: '⚪',
        actionDescription: 'No heavy institutional buildup or unwinding detected.'
      };
    }
  }

  /**
   * Evaluates Near-The-Money (ATM ± 3 strikes) cluster for an index/symbol
   */
  public computeCluster(
    symbol: IndexSymbol,
    spotPrice: number,
    strikeStep: number,
    strikes: RawStrikeData[],
    spotChange: number = 0
  ): NtmClusterState {
    const today = this.getTodayDateStr();
    const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;

    // Filter ATM ± 3 strikes (7 strikes total: -3, -2, -1, ATM, +1, +2, +3)
    const targetStrikePrices: { strike: number; dist: number }[] = [];
    for (let offset = -3; offset <= 3; offset++) {
      targetStrikePrices.push({
        strike: atmStrike + (offset * strikeStep),
        dist: offset
      });
    }

    let clusterTotalCallOI = 0;
    let clusterTotalPutOI = 0;
    let clusterPrevCallOI = 0;
    let clusterPrevPutOI = 0;

    let bullishSignals = 0;
    let bearishSignals = 0;
    let neutralSignals = 0;

    const ntmStrikes: NtmStrikeRegime[] = [];

    // Global Resistance & Support Walls across the full chain
    let maxCallStrike = strikes[0]?.strikePrice || atmStrike;
    let maxCallOI = 0;
    let maxPutStrike = strikes[0]?.strikePrice || atmStrike;
    let maxPutOI = 0;

    strikes.forEach(s => {
      if (s.callOI > maxCallOI) {
        maxCallOI = s.callOI;
        maxCallStrike = s.strikePrice;
      }
      if (s.putOI > maxPutOI) {
        maxPutOI = s.putOI;
        maxPutStrike = s.strikePrice;
      }
    });

    targetStrikePrices.forEach(({ strike: strikePrice, dist }) => {
      const strikeData = strikes.find(s => s.strikePrice === strikePrice) || {
        strikePrice,
        callOI: 10000,
        callOIChangeTotal: 0,
        callLtp: 100,
        callVolume: 5000,
        putOI: 10000,
        putOIChangeTotal: 0,
        putLtp: 100,
        putVolume: 5000
      };

      // 1. Process Call Leg Baseline
      const callKey = `${symbol}_${strikePrice}_CE`;
      let callBaseline = this.baselines.get(callKey);
      if (!callBaseline || callBaseline.date !== today) {
        // First tick at market open establishes baseline
        const initOI = strikeData.callOIChangeTotal !== undefined && strikeData.callOI > strikeData.callOIChangeTotal
          ? (strikeData.callOI - strikeData.callOIChangeTotal)
          : strikeData.callOI;
        callBaseline = {
          initialOI: Math.max(1, initOI),
          openLtp: strikeData.callLtp,
          previousLtp: strikeData.callLtp,
          date: today
        };
        this.baselines.set(callKey, callBaseline);
      }

      const callOiChangePct = strikeData.callOIChangeTotal !== undefined && callBaseline.initialOI > 0
        ? ((strikeData.callOIChangeTotal) / callBaseline.initialOI) * 100
        : (((strikeData.callOI - callBaseline.initialOI) / callBaseline.initialOI) * 100);
      const callPriceChange = strikeData.callLtp - callBaseline.openLtp;
      const callEval = this.classifyMarketRegime(callOiChangePct, callPriceChange, spotChange);

      const callLeg: NtmStrikeOptionLeg = {
        ltp: strikeData.callLtp,
        oi: strikeData.callOI,
        baselineOI: callBaseline.initialOI,
        oiChangePct: +callOiChangePct.toFixed(2),
        priceChange: +callPriceChange.toFixed(2),
        volume: strikeData.callVolume,
        regime: callEval.regime,
        sentiment: callEval.sentiment,
        visualEmoji: callEval.visualEmoji,
        actionDescription: callEval.actionDescription
      };

      // 2. Process Put Leg Baseline
      const putKey = `${symbol}_${strikePrice}_PE`;
      let putBaseline = this.baselines.get(putKey);
      if (!putBaseline || putBaseline.date !== today) {
        const initOI = strikeData.putOIChangeTotal !== undefined && strikeData.putOI > strikeData.putOIChangeTotal
          ? (strikeData.putOI - strikeData.putOIChangeTotal)
          : strikeData.putOI;
        putBaseline = {
          initialOI: Math.max(1, initOI),
          openLtp: strikeData.putLtp,
          previousLtp: strikeData.putLtp,
          date: today
        };
        this.baselines.set(putKey, putBaseline);
      }

      const putOiChangePct = strikeData.putOIChangeTotal !== undefined && putBaseline.initialOI > 0
        ? ((strikeData.putOIChangeTotal) / putBaseline.initialOI) * 100
        : (((strikeData.putOI - putBaseline.initialOI) / putBaseline.initialOI) * 100);
      const putPriceChange = strikeData.putLtp - putBaseline.openLtp;
      const putEval = this.classifyMarketRegime(putOiChangePct, putPriceChange, -spotChange);

      const putLeg: NtmStrikeOptionLeg = {
        ltp: strikeData.putLtp,
        oi: strikeData.putOI,
        baselineOI: putBaseline.initialOI,
        oiChangePct: +putOiChangePct.toFixed(2),
        priceChange: +putPriceChange.toFixed(2),
        volume: strikeData.putVolume,
        regime: putEval.regime,
        sentiment: putEval.sentiment,
        visualEmoji: putEval.visualEmoji,
        actionDescription: putEval.actionDescription
      };

      // Accumulate cluster metrics
      clusterTotalCallOI += strikeData.callOI;
      clusterTotalPutOI += strikeData.putOI;
      clusterPrevCallOI += callBaseline.initialOI;
      clusterPrevPutOI += putBaseline.initialOI;

      // Strike Sentiment Scoring:
      // Call Long Buildup = Bullish (+1), Call Short Buildup (Call Writing) = Bearish (-1)
      // Call Short Covering = Bullish (+1.5), Call Long Unwinding = Bearish (-1)
      // Put Long Buildup = Bearish (-1), Put Short Buildup (Put Writing) = Bullish (+1)
      // Put Short Covering = Bearish (-1.5), Put Long Unwinding = Bullish (+1)
      if (callEval.regime === 'Long Buildup' || callEval.regime === 'Short Covering') bullishSignals += 1;
      else if (callEval.regime === 'Short Buildup' || callEval.regime === 'Long Unwinding') bearishSignals += 1;

      if (putEval.regime === 'Short Buildup' || putEval.regime === 'Long Unwinding') bullishSignals += 1;
      else if (putEval.regime === 'Long Buildup' || putEval.regime === 'Short Covering') bearishSignals += 1;

      if (callEval.regime === 'Neutral' && putEval.regime === 'Neutral') neutralSignals += 1;

      const strikePcr = strikeData.callOI > 0 ? +(strikeData.putOI / strikeData.callOI).toFixed(2) : 1.0;

      ntmStrikes.push({
        strikePrice,
        isAtm: dist === 0,
        distanceFromAtm: dist,
        call: callLeg,
        put: putLeg,
        pcr: strikePcr
      });
    });

    const totalDecided = bullishSignals + bearishSignals;
    const netBullishScorePct = totalDecided > 0 ? Math.round((bullishSignals / totalDecided) * 100) : 50;
    const netBearishScorePct = totalDecided > 0 ? Math.round((bearishSignals / totalDecided) * 100) : 50;

    // Determine Dominant Regime
    let dominantRegime: NtmRegimeType = 'Neutral';
    if (netBullishScorePct >= 65) dominantRegime = 'Long Buildup';
    else if (netBearishScorePct >= 65) dominantRegime = 'Short Buildup';
    else if (bullishSignals > bearishSignals) dominantRegime = 'Short Covering';
    else if (bearishSignals > bullishSignals) dominantRegime = 'Long Unwinding';

    // Consensus Signal
    let consensusSignal: 'STRONG_BULLISH' | 'BULLISH' | 'STRONG_BEARISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let consensusDescription = 'Near-the-money strikes show balanced institutional positioning.';

    const clusterPcr = clusterTotalCallOI > 0 ? +(clusterTotalPutOI / clusterTotalCallOI).toFixed(2) : 1.0;

    if (netBullishScorePct >= 75 && clusterPcr > 1.1) {
      consensusSignal = 'STRONG_BULLISH';
      consensusDescription = `🔥 Strong Institutional Bullish Cluster (${netBullishScorePct}%): Heavy Put writing support and Call accumulation across ATM ±3 strikes.`;
    } else if (netBullishScorePct >= 60) {
      consensusSignal = 'BULLISH';
      consensusDescription = `🟢 Bullish Bias (${netBullishScorePct}%): Buyers dominating near-the-money strikes with supportive PCR (${clusterPcr}).`;
    } else if (netBearishScorePct >= 75 && clusterPcr < 0.9) {
      consensusSignal = 'STRONG_BEARISH';
      consensusDescription = `🚨 Heavy Institutional Resistance Wall (${netBearishScorePct}%): Stiff Call writing and Put unwinding across ATM ±3 strikes.`;
    } else if (netBearishScorePct >= 60) {
      consensusSignal = 'BEARISH';
      consensusDescription = `🔴 Bearish Bias (${netBearishScorePct}%): Call writers capping upward momentum at key NTM strikes.`;
    }

    const formatOI = (val: number) => {
      if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
      return val.toLocaleString('en-IN');
    };

    const clusterCallOIChangePct = clusterPrevCallOI > 0
      ? +(((clusterTotalCallOI - clusterPrevCallOI) / clusterPrevCallOI) * 100).toFixed(2)
      : 0;
    const clusterPutOIChangePct = clusterPrevPutOI > 0
      ? +(((clusterTotalPutOI - clusterPrevPutOI) / clusterPrevPutOI) * 100).toFixed(2)
      : 0;

    return {
      symbol,
      spotPrice,
      atmStrike,
      strikeStep,
      strikes: ntmStrikes,
      bullishStrikesCount: bullishSignals,
      bearishStrikesCount: bearishSignals,
      neutralStrikesCount: neutralSignals,
      netBullishScorePct,
      netBearishScorePct,
      dominantRegime,
      consensusSignal,
      consensusDescription,
      resistanceWall: {
        strike: maxCallStrike,
        oi: maxCallOI,
        oiFormatted: formatOI(maxCallOI),
        distancePoints: +(maxCallStrike - spotPrice).toFixed(1)
      },
      supportWall: {
        strike: maxPutStrike,
        oi: maxPutOI,
        oiFormatted: formatOI(maxPutOI),
        distancePoints: +(spotPrice - maxPutStrike).toFixed(1)
      },
      clusterPcr,
      clusterTotalCallOI,
      clusterTotalPutOI,
      clusterCallOIChangePct,
      clusterPutOIChangePct,
      lastCalculatedAt: new Date().toISOString()
    };
  }
}

export const ntmClusterEngine = new NtmClusterEngine();
