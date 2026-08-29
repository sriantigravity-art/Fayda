import {
  IndexSymbol,
  OptionStrikeData,
  PcrData,
  MaxPainData,
  StraddleRangeData,
  PatternBreakoutAnalysis,
  MasterStrategyConfluence,
  StrategyScoreItem
} from '../types.js';

export class ConfluenceEngine {
  /**
   * Evaluates all platform trading strategies and fuses them into a Master Buy/Sell Prediction
   */
  public static calculateMasterConfluence(
    symbol: IndexSymbol,
    spotPrice: number,
    strikes: OptionStrikeData[],
    pcr: PcrData,
    maxPain: MaxPainData,
    straddleRange: StraddleRangeData,
    daysToExpiry: number,
    patternBreakout?: PatternBreakoutAnalysis
  ): MasterStrategyConfluence {
    const atmStrike = strikes.find(s => s.isAtm)?.strikePrice || Math.round(spotPrice / 50) * 50;
    const nearStrikes = strikes.filter(s => Math.abs(s.strikePrice - atmStrike) <= 250);

    // 1. OI Delta Strategy (Weight: 20%)
    const callDelta1m = nearStrikes.reduce((acc, s) => acc + s.callOIChange1m, 0);
    const putDelta1m = nearStrikes.reduce((acc, s) => acc + s.putOIChange1m, 0);
    
    let oiScore = 75;
    let oiSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let oiStatus = 'Neutral 1-Min Delta';
    let oiDetails = 'Call and Put OI change balanced.';

    if (callDelta1m < -5000 && putDelta1m > 5000) {
      oiScore = 94;
      oiSignal = 'BULLISH';
      oiStatus = '🚀 Strong Call Short Covering';
      oiDetails = `Call writers unwinding (${(callDelta1m / 1000).toFixed(1)}k) with Put accumulation (+${(putDelta1m / 1000).toFixed(1)}k).`;
    } else if (putDelta1m < -5000 && callDelta1m > 5000) {
      oiScore = 93;
      oiSignal = 'BEARISH';
      oiStatus = '🚨 Put Panic Unwinding';
      oiDetails = `Put writers capitulating (${(putDelta1m / 1000).toFixed(1)}k) with heavy Call writing (+${(callDelta1m / 1000).toFixed(1)}k).`;
    } else if (callDelta1m < 0 || pcr.atmPlusMinus5Pcr > 1.1) {
      oiScore = 82;
      oiSignal = 'BULLISH';
      oiStatus = '📈 Bullish OI Bias';
      oiDetails = 'Positive Call short-covering pressure detected.';
    } else if (putDelta1m < 0 || pcr.atmPlusMinus5Pcr < 0.9) {
      oiScore = 82;
      oiSignal = 'BEARISH';
      oiStatus = '📉 Bearish OI Bias';
      oiDetails = 'Put writer liquidation pressure detected.';
    }

    const oiStrategy: StrategyScoreItem = {
      strategyName: '1-Min OI Delta & Squeeze Scanner',
      iconName: 'OI',
      score: oiScore,
      signal: oiSignal,
      weightPct: 20,
      statusBadge: oiStatus,
      details: oiDetails
    };

    // 2. Multi-Timeframe Price Action & Breakout Strategy (Weight: 20%)
    let boScore = patternBreakout?.predictedBreakout.probability || 85;
    let boSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let boStatus = 'Range Consolidation';
    let boDetails = 'Testing structural levels.';

    if (patternBreakout) {
      if (patternBreakout.predictedBreakout.direction === 'UPWARD_BREAKOUT') {
        boSignal = 'BULLISH';
        boStatus = `✓ ${patternBreakout.activePattern.patternName}`;
        boDetails = `${patternBreakout.activePattern.patternName} on ${patternBreakout.activeTimeframe} with neckline trigger at ₹${patternBreakout.predictedBreakout.triggerPrice.toFixed(1)}.`;
      } else if (patternBreakout.predictedBreakout.direction === 'DOWNWARD_BREAKDOWN') {
        boSignal = 'BEARISH';
        boStatus = `⚠️ ${patternBreakout.activePattern.patternName}`;
        boDetails = `${patternBreakout.activePattern.patternName} on ${patternBreakout.activeTimeframe} with breakdown trigger at ₹${patternBreakout.predictedBreakout.triggerPrice.toFixed(1)}.`;
      }
    }

    const breakoutStrategy: StrategyScoreItem = {
      strategyName: 'Multi-Timeframe Pattern & Breakout Engine',
      iconName: 'BREAKOUT',
      score: boScore,
      signal: boSignal,
      weightPct: 20,
      statusBadge: boStatus,
      details: boDetails
    };

    // 3. Volume Velocity & Order Flow Pressure Strategy (Weight: 15%)
    const avgCallBuyPct = nearStrikes.reduce((acc, s) => acc + (s.callBuyVolPct || 50), 0) / Math.max(1, nearStrikes.length);
    const avgPutBuyPct = nearStrikes.reduce((acc, s) => acc + (s.putBuyVolPct || 50), 0) / Math.max(1, nearStrikes.length);
    
    let volScore = 80;
    let volSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let volStatus = 'Balanced Order Flow';
    let volDetails = 'Buyer/Seller volumes are evenly matched.';

    if (avgCallBuyPct >= 65) {
      volScore = 90;
      volSignal = 'BULLISH';
      volStatus = `⚡ Aggressive Buyer Flow (${avgCallBuyPct.toFixed(0)}% Calls)`;
      volDetails = 'Market taker aggression lifting Call asks.';
    } else if (avgPutBuyPct >= 65) {
      volScore = 90;
      volSignal = 'BEARISH';
      volStatus = `🚨 Aggressive Put Buying (${avgPutBuyPct.toFixed(0)}% Puts)`;
      volDetails = 'Institutional Put buying hitting the bid.';
    } else if (avgCallBuyPct > avgPutBuyPct) {
      volScore = 83;
      volSignal = 'BULLISH';
      volStatus = 'Bullish Order Flow Bias';
      volDetails = 'Call buying interest exceeding sell pressure.';
    } else {
      volScore = 83;
      volSignal = 'BEARISH';
      volStatus = 'Bearish Order Flow Bias';
      volDetails = 'Put buying interest dominating flow.';
    }

    const volumeStrategy: StrategyScoreItem = {
      strategyName: 'Order Flow & Volume Velocity',
      iconName: 'VOLUME',
      score: volScore,
      signal: volSignal,
      weightPct: 15,
      statusBadge: volStatus,
      details: volDetails
    };

    // 4. 0DTE Gamma Explosion Velocity (Weight: 15%)
    let gammaScore = daysToExpiry === 0 ? 92 : daysToExpiry <= 2 ? 85 : 75;
    let gammaSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = boSignal !== 'NEUTRAL' ? boSignal : oiSignal;
    let gammaStatus = daysToExpiry === 0 ? '⚡ 0DTE Gamma Active' : `🗓️ ${daysToExpiry} DTE Swing Setup`;
    let gammaDetails = daysToExpiry === 0
      ? 'Sub-₹60 options primed for rapid non-linear gamma acceleration.'
      : 'Directional momentum setup with controlled theta risk.';

    const gammaStrategy: StrategyScoreItem = {
      strategyName: '0DTE Gamma Spike & Velocity Radar',
      iconName: 'GAMMA',
      score: gammaScore,
      signal: gammaSignal,
      weightPct: 15,
      statusBadge: gammaStatus,
      details: gammaDetails
    };

    // 5. PCR Sentiment & Shift Momentum (Weight: 10%)
    let pcrScore = 78;
    let pcrSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let pcrStatus = `PCR ${pcr.atmPlusMinus5Pcr.toFixed(2)}`;
    let pcrDetails = `1-Min PCR Shift: ${pcr.pcr1mChange >= 0 ? '+' : ''}${pcr.pcr1mChange.toFixed(3)}`;

    if (pcr.atmPlusMinus5Pcr >= 1.20) {
      pcrScore = 92;
      pcrSignal = 'BULLISH';
      pcrStatus = `🚀 Bullish PCR (${pcr.atmPlusMinus5Pcr.toFixed(2)})`;
      pcrDetails = 'Heavy Put writing providing strong support base.';
    } else if (pcr.atmPlusMinus5Pcr <= 0.80) {
      pcrScore = 92;
      pcrSignal = 'BEARISH';
      pcrStatus = `🚨 Bearish PCR (${pcr.atmPlusMinus5Pcr.toFixed(2)})`;
      pcrDetails = 'Heavy Call writing capping upside potential.';
    } else if (pcr.pcr1mChange > 0.02) {
      pcrScore = 84;
      pcrSignal = 'BULLISH';
      pcrStatus = '📈 Rising PCR Momentum';
      pcrDetails = 'Put writers adding aggressive support.';
    } else if (pcr.pcr1mChange < -0.02) {
      pcrScore = 84;
      pcrSignal = 'BEARISH';
      pcrStatus = '📉 Falling PCR Momentum';
      pcrDetails = 'Call writers adding aggressive resistance.';
    }

    const pcrStrategy: StrategyScoreItem = {
      strategyName: 'PCR Multi-Strike Sentiment',
      iconName: 'PCR',
      score: pcrScore,
      signal: pcrSignal,
      weightPct: 10,
      statusBadge: pcrStatus,
      details: pcrDetails
    };

    // 6. Max Pain & Straddle Range Strategy (Weight: 10%)
    const distToMaxPain = maxPain.differenceFromSpot;
    let mpScore = 82;
    let mpSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = distToMaxPain > 30 ? 'BULLISH' : distToMaxPain < -30 ? 'BEARISH' : 'NEUTRAL';
    let mpStatus = `Max Pain: ₹${maxPain.strikePrice}`;
    let mpDetails = `Spot is ${distToMaxPain >= 0 ? '+' : ''}${distToMaxPain.toFixed(0)} pts from Max Pain. Upper Breakeven: ₹${straddleRange.upperBreakeven.toFixed(0)}.`;

    const maxPainStrategy: StrategyScoreItem = {
      strategyName: 'Max Pain & Straddle Breakevens',
      iconName: 'MAXPAIN',
      score: mpScore,
      signal: mpSignal,
      weightPct: 10,
      statusBadge: mpStatus,
      details: mpDetails
    };

    // 7. IV Status & Theta Safety Filter (Weight: 10%)
    const atmStrikeObj = strikes.find(s => s.isAtm);
    const avgIv = atmStrikeObj?.iv || 13.5;
    let ivScore = avgIv < 14 ? 90 : avgIv < 17 ? 80 : 65;
    let ivStatus = avgIv < 14 ? '✓ Low IV Buying Edge' : avgIv > 18 ? '⚠️ High IV Crush Risk' : 'Fair IV';
    let ivDetails = `IV at ${avgIv.toFixed(1)}%. ${avgIv < 14 ? 'Premiums are cheap for option buyers.' : 'Theta decay is elevated.'}`;

    const ivThetaStrategy: StrategyScoreItem = {
      strategyName: 'IV Crush & Theta Safety Filter',
      iconName: 'IV_THETA',
      score: ivScore,
      signal: 'NEUTRAL',
      weightPct: 10,
      statusBadge: ivStatus,
      details: ivDetails
    };

    const strategies = [
      oiStrategy,
      breakoutStrategy,
      volumeStrategy,
      gammaStrategy,
      pcrStrategy,
      maxPainStrategy,
      ivThetaStrategy
    ];

    // Compute Weighted Master Confluence Score
    let bullWeight = 0;
    let bearWeight = 0;
    let totalScore = 0;

    strategies.forEach(s => {
      totalScore += s.score * (s.weightPct / 100);
      if (s.signal === 'BULLISH') bullWeight += s.weightPct;
      if (s.signal === 'BEARISH') bearWeight += s.weightPct;
    });

    const overallScore = Math.min(96, Math.max(65, Math.round(totalScore)));

    let overallSignal: 'STRONG_BUY_CALL' | 'BUY_CALL' | 'NEUTRAL_WAIT' | 'BUY_PUT' | 'STRONG_BUY_PUT' = 'NEUTRAL_WAIT';
    let action: 'BUY CALL' | 'BUY PUT' | 'WAIT' = 'WAIT';
    let signalTitle = '⚖️ NEUTRAL CONSOLIDATION (WAIT FOR BREAKOUT)';
    let convictionLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'NEUTRAL' = 'MODERATE';

    if (bullWeight >= 55) {
      overallSignal = overallScore >= 88 ? 'STRONG_BUY_CALL' : 'BUY_CALL';
      action = 'BUY CALL';
      signalTitle = overallScore >= 88 ? '🚀 STRONG BUY CALL (HIGH-CONVICTION BREAKOUT)' : '🟢 BUY CALL (BULLISH CONFLUENCE)';
      convictionLevel = overallScore >= 88 ? 'EXTREME' : 'HIGH';
    } else if (bearWeight >= 55) {
      overallSignal = overallScore >= 88 ? 'STRONG_BUY_PUT' : 'BUY_PUT';
      action = 'BUY PUT';
      signalTitle = overallScore >= 88 ? '🚨 STRONG BUY PUT (HIGH-CONVICTION BREAKDOWN)' : '🔴 BUY PUT (BEARISH CONFLUENCE)';
      convictionLevel = overallScore >= 88 ? 'EXTREME' : 'HIGH';
    } else if (bullWeight > bearWeight) {
      overallSignal = 'BUY_CALL';
      action = 'BUY CALL';
      signalTitle = '🟢 BUY CALL (MOMENTUM SQUEEZE)';
      convictionLevel = 'MODERATE';
    } else {
      overallSignal = 'BUY_PUT';
      action = 'BUY PUT';
      signalTitle = '🔴 BUY PUT (RESISTANCE REJECTION)';
      convictionLevel = 'MODERATE';
    }

    // Recommended Strike Selection
    const isBull = action === 'BUY CALL';
    const targetStrike = isBull
      ? Math.min(atmStrike + 400, atmStrike + (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50))
      : Math.max(atmStrike - 400, atmStrike - (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50));
    const optType = isBull ? 'CE' : 'PE';
    const recommendedStrike = `${symbol} ${targetStrike} ${optType}`;

    const strikeObj = strikes.find(s => s.strikePrice === targetStrike);
    const ltp = strikeObj ? (isBull ? strikeObj.callLtp : strikeObj.putLtp) : 110;
    const cleanLtp = Math.max(10, ltp);

    // Time-of-Day Movement Speed (Opening Drive, Midday Lull, and Last 30-Min Power Surge)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const totalMinutes = ist.getHours() * 60 + ist.getMinutes();

    let t1Mult = 1.35;
    let t2Mult = 1.70;
    let slMult = 0.80;
    let speedLabel = 'Standard Speed';
    let rrRatio = '1:2.3';

    if (totalMinutes >= 15 * 60) {
      // 03:00 PM - 03:40 PM: Closing 30-Min Power Surge / BTST / 0DTE Acceleration
      t1Mult = 1.55;
      t2Mult = 2.15;
      slMult = 0.78;
      speedLabel = '🔥 Closing Surge Velocity';
      rrRatio = '1:3.4';
    } else if (totalMinutes <= 9 * 60 + 45) {
      // 09:15 AM - 09:45 AM: Opening Drive / Initial Range Breakout
      t1Mult = 1.45;
      t2Mult = 1.90;
      slMult = 0.80;
      speedLabel = '⚡ Opening Drive Velocity';
      rrRatio = '1:2.8';
    } else if (totalMinutes >= 13 * 60 + 15) {
      // 01:15 PM - 03:00 PM: Afternoon European Inflow
      t1Mult = 1.38;
      t2Mult = 1.75;
      slMult = 0.82;
      speedLabel = '🌊 Afternoon Breakout Velocity';
      rrRatio = '1:2.5';
    } else if (totalMinutes >= 11 * 60 + 30) {
      // 11:30 AM - 01:15 PM: Midday Theta Chop
      t1Mult = 1.22;
      t2Mult = 1.45;
      slMult = 0.88;
      speedLabel = '⚖️ Midday Scalp Velocity';
      rrRatio = '1:2.1';
    }

    // High beta index scaling (BankNifty, Sensex)
    if (symbol === 'BANKNIFTY' || symbol === 'SENSEX' || symbol === 'BANKEX') {
      t1Mult = +(t1Mult * 1.05).toFixed(2);
      t2Mult = +(t2Mult * 1.10).toFixed(2);
    }

    const target1 = +(cleanLtp * t1Mult).toFixed(1);
    const target2 = +(cleanLtp * t2Mult).toFixed(1);
    const stoploss = +(cleanLtp * slMult).toFixed(1);

    const confluenceRationale = `${overallScore}% confluence (${speedLabel}) across 1-Min Delta OI (${oiStatus}), Pattern Breakout (${boStatus}), Order Flow (${volStatus}), and PCR Momentum (${pcrStatus}).`;

    return {
      overallScore,
      overallSignal,
      signalTitle,
      convictionLevel,
      recommendedStrike,
      action,
      entryZone: `₹${cleanLtp.toFixed(1)} - ₹${(cleanLtp * 1.03).toFixed(1)}`,
      target1,
      target2,
      stoploss,
      riskReward: rrRatio,
      strategies,
      confluenceRationale
    };
  }
}
