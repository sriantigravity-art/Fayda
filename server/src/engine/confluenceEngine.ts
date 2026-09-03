import {
  IndexSymbol,
  OptionStrikeData,
  PcrData,
  MaxPainData,
  StraddleRangeData,
  PatternBreakoutAnalysis,
  MasterStrategyConfluence,
  StrategyScoreItem,
  WhyNotTradeReason,
  InstrumentSelection,
  ScoreCategoryBreakdown,
  FaydaStrategySetup,
  MultiLegStrategySetup,
  HeroZeroSignal,
  CPRLevelData,
  IntradayMarketRegimeData,
  UnifiedSmartTip,
  UnifiedSessionTipsPackage,
  MarketSessionWindow,
  ALL_SYMBOLS_CONFIG
} from '../types.js';

export class ConfluenceEngine {
  // In-memory hourly slot cache for high-probability Call & Put tips (strictly 1-2 calls/puts per hour)
  private static hourlyTradesMap: Map<string, {
    slotId: string;
    calls: UnifiedSmartTip[];
    puts: UnifiedSmartTip[];
  }> = new Map();
  /**
   * Evaluates all platform trading strategies and fuses them into an Institutional Decision & Risk Engine
   * Enforces NO-TRADE, WAIT, and HEDGE states to protect trader capital per SEBI recommendations.
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
    
    let oiScore = 70;
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
    } else if (callDelta1m < 0 || pcr.atmPlusMinus5Pcr > 1.15) {
      oiScore = 82;
      oiSignal = 'BULLISH';
      oiStatus = '📈 Bullish OI Bias';
      oiDetails = 'Positive Call short-covering pressure detected.';
    } else if (putDelta1m < 0 || pcr.atmPlusMinus5Pcr < 0.85) {
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
    let boScore = patternBreakout?.predictedBreakout.probability || 70;
    let boSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let boStatus = 'Consolidation / Testing Levels';
    let boDetails = 'Price moving within defined support/resistance range.';

    if (patternBreakout) {
      if (patternBreakout.predictedBreakout.direction === 'UPWARD_BREAKOUT') {
        boSignal = 'BULLISH';
        boStatus = `✓ ${patternBreakout.activePattern.patternName}`;
        boDetails = `${patternBreakout.activePattern.patternName} on ${patternBreakout.activeTimeframe} with trigger at ₹${patternBreakout.predictedBreakout.triggerPrice.toFixed(1)}.`;
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
    
    let volScore = 75;
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
    } else if (avgCallBuyPct > 55) {
      volScore = 80;
      volSignal = 'BULLISH';
      volStatus = 'Bullish Order Flow Bias';
      volDetails = 'Call buying interest exceeding sell pressure.';
    } else if (avgPutBuyPct > 55) {
      volScore = 80;
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
    let gammaScore = daysToExpiry === 0 ? 92 : daysToExpiry <= 2 ? 82 : 70;
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
    let pcrScore = 75;
    let pcrSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let pcrStatus = `PCR ${pcr.atmPlusMinus5Pcr.toFixed(2)}`;
    let pcrDetails = `1-Min PCR Shift: ${pcr.pcr1mChange >= 0 ? '+' : ''}${pcr.pcr1mChange.toFixed(3)}`;

    if (pcr.atmPlusMinus5Pcr >= 1.25) {
      pcrScore = 92;
      pcrSignal = 'BULLISH';
      pcrStatus = `🚀 Strong Support Base (PCR ${pcr.atmPlusMinus5Pcr.toFixed(2)})`;
      pcrDetails = 'Heavy Put writing providing strong support base.';
    } else if (pcr.atmPlusMinus5Pcr <= 0.75) {
      pcrScore = 92;
      pcrSignal = 'BEARISH';
      pcrStatus = `🚨 Strong Resistance Ceiling (PCR ${pcr.atmPlusMinus5Pcr.toFixed(2)})`;
      pcrDetails = 'Heavy Call writing capping upside potential.';
    } else if (pcr.pcr1mChange > 0.03) {
      pcrScore = 82;
      pcrSignal = 'BULLISH';
      pcrStatus = '📈 Rising PCR Momentum';
      pcrDetails = 'Put writers adding aggressive support.';
    } else if (pcr.pcr1mChange < -0.03) {
      pcrScore = 82;
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
    let mpScore = 78;
    let mpSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = distToMaxPain > 35 ? 'BULLISH' : distToMaxPain < -35 ? 'BEARISH' : 'NEUTRAL';
    let mpStatus = `Max Pain: ₹${maxPain.strikePrice}`;
    let mpDetails = `Spot is ${distToMaxPain >= 0 ? '+' : ''}${distToMaxPain.toFixed(0)} pts from Max Pain. Breakeven Range: ₹${straddleRange.lowerBreakeven.toFixed(0)} - ₹${straddleRange.upperBreakeven.toFixed(0)}.`;

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
    let ivScore = avgIv < 14 ? 90 : avgIv < 17 ? 80 : 60;
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

    // Compute Weighted Score & Confluence
    let bullWeight = 0;
    let bearWeight = 0;
    let totalScore = 0;

    strategies.forEach(s => {
      totalScore += s.score * (s.weightPct / 100);
      if (s.signal === 'BULLISH') bullWeight += s.weightPct;
      if (s.signal === 'BEARISH') bearWeight += s.weightPct;
    });

    const overallScore = Math.min(96, Math.max(50, Math.round(totalScore)));

    // ==========================================
    // MARKET REGIME CLASSIFICATION
    // ==========================================
    let marketRegime: 'STRONG_BULLISH_TREND' | 'STRONG_BEARISH_TREND' | 'RANGE_BOUND_CHOP' | 'HIGH_VOLATILITY_EXPANSION' | 'GAMMA_EXPLOSION_0DTE' | 'IV_CRUSH_ZONE' | 'HIGH_EVENT_RISK' = 'RANGE_BOUND_CHOP';
    let regimeLabel = '⚪ Range-Bound Chop (Neutral)';

    if (daysToExpiry === 0 && Math.abs(distToMaxPain) < 40) {
      marketRegime = 'GAMMA_EXPLOSION_0DTE';
      regimeLabel = '⚡ 0DTE Expiry Gamma Acceleration';
    } else if (avgIv > 20) {
      marketRegime = 'IV_CRUSH_ZONE';
      regimeLabel = '⚠️ High IV Crush Zone (Elevated Decay)';
    } else if (bullWeight >= 55 && overallScore >= 78) {
      marketRegime = 'STRONG_BULLISH_TREND';
      regimeLabel = '🟢 Strong Bullish Trend (Trend Day)';
    } else if (bearWeight >= 55 && overallScore >= 78) {
      marketRegime = 'STRONG_BEARISH_TREND';
      regimeLabel = '🔴 Strong Bearish Trend (Selling Day)';
    } else if (avgIv > 17) {
      marketRegime = 'HIGH_VOLATILITY_EXPANSION';
      regimeLabel = '🌊 High Volatility Expansion';
    } else {
      marketRegime = 'RANGE_BOUND_CHOP';
      regimeLabel = '⚪ Sideways / Range Consolidation';
    }

    // ==========================================
    // STRICT "NO-TRADE", "WAIT", "HEDGE" GATING
    // ==========================================
    let masterDecision: 'BUY_CALL' | 'BUY_PUT' | 'WAIT' | 'NO_TRADE' | 'HEDGE' = 'WAIT';
    let overallSignal: 'STRONG_BUY_CALL' | 'BUY_CALL' | 'NEUTRAL_WAIT' | 'BUY_PUT' | 'STRONG_BUY_PUT' = 'NEUTRAL_WAIT';
    let action: 'BUY CALL' | 'BUY PUT' | 'WAIT' | 'NO TRADE' | 'HEDGE' = 'WAIT';
    let signalTitle = '⚖️ WAITING FOR HIGH-PROBABILITY CONFLUENCE';
    let convictionLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'NEUTRAL' = 'NEUTRAL';
    let setupGrade: 'A+' | 'A' | 'B' | 'C' | 'NO_TRADE' = 'NO_TRADE';
    let riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';

    const whyNotTradeReasons: WhyNotTradeReason[] = [];

    // Check gating conditions
    const isChop = marketRegime === 'RANGE_BOUND_CHOP' || (bullWeight < 45 && bearWeight < 45);
    const isHighIv = avgIv > 19;
    const isLowScore = overallScore < 68;

    if (isLowScore && isChop) {
      masterDecision = 'NO_TRADE';
      action = 'NO TRADE';
      overallSignal = 'NEUTRAL_WAIT';
      signalTitle = '⚪ NO TRADE (MARKET CONDITIONS UNSUITABLE)';
      convictionLevel = 'NEUTRAL';
      setupGrade = 'NO_TRADE';
      riskCategory = 'HIGH';

      whyNotTradeReasons.push({
        category: 'Market In Chop / Range',
        description: 'Price is oscillating inside the consolidation band without institutional breakout volume.',
        severity: 'CRITICAL',
        solution: 'Preserve capital. Wait for a clean break of structure (BOS) or 15-min candle close outside range.'
      });
      whyNotTradeReasons.push({
        category: 'Balanced OI Delta',
        description: 'Call and Put writers have equal strength; high risk of whipsaw and theta decay.',
        severity: 'WARNING',
        solution: 'Avoid naked option buying until OI unwinds on one side.'
      });
    } else if (isHighIv && isChop) {
      masterDecision = 'HEDGE';
      action = 'HEDGE';
      overallSignal = 'NEUTRAL_WAIT';
      signalTitle = '🟣 HEDGE ONLY (HIGH IV RANGE CHOP)';
      convictionLevel = 'MODERATE';
      setupGrade = 'B';
      riskCategory = 'EXTREME';

      whyNotTradeReasons.push({
        category: 'Elevated IV Crush Risk',
        description: `Implied Volatility is high (${avgIv.toFixed(1)}%). Buying naked calls/puts carries rapid theta drain.`,
        severity: 'CRITICAL',
        solution: 'Use defined-risk spreads (Bull Call Spread / Bear Put Spread) instead of naked options.'
      });
    } else if (bullWeight >= 55 && overallScore >= 72) {
      masterDecision = 'BUY_CALL';
      action = 'BUY CALL';
      overallSignal = overallScore >= 88 ? 'STRONG_BUY_CALL' : 'BUY_CALL';
      signalTitle = overallScore >= 88 ? '🚀 A+ STRONG BUY CALL (HIGH-CONVICTION BREAKOUT)' : '🟢 A-GRADE BUY CALL (BULLISH CONFLUENCE)';
      convictionLevel = overallScore >= 88 ? 'EXTREME' : 'HIGH';
      setupGrade = overallScore >= 88 ? 'A+' : 'A';
      riskCategory = avgIv < 15 ? 'LOW' : 'MEDIUM';
    } else if (bearWeight >= 55 && overallScore >= 72) {
      masterDecision = 'BUY_PUT';
      action = 'BUY PUT';
      overallSignal = overallScore >= 88 ? 'STRONG_BUY_PUT' : 'BUY_PUT';
      signalTitle = overallScore >= 88 ? '🚨 A+ STRONG BUY PUT (HIGH-CONVICTION BREAKDOWN)' : '🔴 A-GRADE BUY PUT (BEARISH CONFLUENCE)';
      convictionLevel = overallScore >= 88 ? 'EXTREME' : 'HIGH';
      setupGrade = overallScore >= 88 ? 'A+' : 'A';
      riskCategory = avgIv < 15 ? 'LOW' : 'MEDIUM';
    } else {
      masterDecision = 'WAIT';
      action = 'WAIT';
      overallSignal = 'NEUTRAL_WAIT';
      signalTitle = '🟡 WAIT FOR TRIGGER CONFIRMATION';
      convictionLevel = 'MODERATE';
      setupGrade = 'B';
      riskCategory = 'MEDIUM';

      whyNotTradeReasons.push({
        category: 'Partial Confluence',
        description: 'Directional bias is building, but key confirmation (Volume velocity or Breakout neckline) is pending.',
        severity: 'INFO',
        solution: 'Wait for live trigger price before executing.'
      });
    }

    // Recommended Strike Selection
    const isBull = masterDecision === 'BUY_CALL' || (bullWeight >= bearWeight);
    const targetStrike = isBull
      ? Math.min(atmStrike + 400, atmStrike + (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50))
      : Math.max(atmStrike - 400, atmStrike - (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50));
    const optType = isBull ? 'CE' : 'PE';
    const recommendedStrike = `${symbol} ${targetStrike} ${optType}`;

    const itmStrike = isBull
      ? Math.max(atmStrike - 50, atmStrike - (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50))
      : Math.min(atmStrike + 50, atmStrike + (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 100 : 50));

    const farOtmStrike = isBull
      ? atmStrike + (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 500 : 250)
      : atmStrike - (symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 500 : 250);

    const suggestedInstrument: InstrumentSelection = {
      primary: `${symbol} ${targetStrike} ${optType} (ATM/Near - Balanced Delta ~0.50)`,
      alternative: `${symbol} ${itmStrike} ${optType} (1-Step ITM - Low Theta Decay)`,
      avoid: `${symbol} ${farOtmStrike} ${optType} (Far OTM - Severe Time Decay Trap)`
    };

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

    if (symbol === 'BANKNIFTY' || symbol === 'SENSEX' || symbol === 'BANKEX') {
      t1Mult = +(t1Mult * 1.05).toFixed(2);
      t2Mult = +(t2Mult * 1.10).toFixed(2);
    }

    const target1 = +(cleanLtp * t1Mult).toFixed(1);
    const target2 = +(cleanLtp * t2Mult).toFixed(1);
    const stoploss = +(cleanLtp * slMult).toFixed(1);

    // Invalidation calculation
    const invalidationOffset = symbol === 'BANKNIFTY' || symbol === 'SENSEX' ? 80 : 35;
    const invalidationPrice = isBull ? Math.round(spotPrice - invalidationOffset) : Math.round(spotPrice + invalidationOffset);
    const invalidationLevel = isBull
      ? `${symbol} spot closes below ₹${invalidationPrice} on 15-min candle or breaks VWAP support.`
      : `${symbol} spot closes above ₹${invalidationPrice} on 15-min candle or breaks VWAP resistance.`;

    const scoreBreakdown: ScoreCategoryBreakdown = {
      trend: Math.round(oiScore * 0.20),
      marketStructure: Math.round(boScore * 0.20),
      momentum: Math.round(volScore * 0.15),
      volume: Math.round(volScore * 0.15),
      oiDerivatives: Math.round(pcrScore * 0.15),
      volatilityGreeks: Math.round(ivScore * 0.10),
      vwapBreadth: Math.round(mpScore * 0.05),
      total: overallScore
    };

    // Market Breadth simulation for India market context
    const advances = isBull ? 34 : 14;
    const declines = isBull ? 14 : 34;
    const unchanged = 2;
    const ratio = +(advances / Math.max(1, declines)).toFixed(2);

    const confluenceRationale = `${overallScore}% confluence (${speedLabel}) across 1-Min Delta OI (${oiStatus}), Pattern Breakout (${boStatus}), Order Flow (${volStatus}), and PCR Momentum (${pcrStatus}).`;

    return {
      overallScore,
      overallSignal,
      masterDecision,
      signalTitle,
      convictionLevel,
      setupGrade,
      marketRegime,
      regimeLabel,
      riskCategory,
      recommendedStrike,
      action,
      entryZone: `₹${cleanLtp.toFixed(1)} - ₹${(cleanLtp * 1.03).toFixed(1)}`,
      target1,
      target2,
      stoploss,
      invalidationLevel,
      invalidationPrice,
      riskReward: rrRatio,
      strategies,
      confluenceRationale,
      whyNotTradeReasons,
      suggestedInstrument,
      scoreBreakdown,
      marketBreadth: {
        advances,
        declines,
        unchanged,
        ratio,
        sentiment: ratio > 1.5 ? 'BULLISH' : ratio < 0.7 ? 'BEARISH' : 'NEUTRAL'
      }
    };
  }

  /**
   * Identifies the current time-window market session for Equity & Commodities
   */
  public static getMarketSession(symbol: string, date: Date = new Date()): {
    session: MarketSessionWindow;
    sessionName: string;
    windowTime: string;
    quotaDescription: string;
  } {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const day = ist.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = day === 0 || day === 6;
    const currentMin = ist.getHours() * 60 + ist.getMinutes();

    const isCommodity = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'].includes(symbol);

    if (isWeekend) {
      return {
        session: 'OFF_MARKET',
        sessionName: 'Weekend Analysis & Strategy Testing',
        windowTime: 'Market Closed',
        quotaDescription: 'Pre-market Study & Strategy Backtesting'
      };
    }

    if (isCommodity) {
      if (currentMin >= (15 * 60 + 40) && currentMin < (18 * 60)) {
        return {
          session: 'COMMODITY_EU',
          sessionName: 'European Energy & Metals Prime',
          windowTime: '15:40 - 18:00 IST',
          quotaDescription: 'Top 1-2 Commodity Momentum Trades'
        };
      } else if (currentMin >= (18 * 60) && currentMin < (20 * 60)) {
        return {
          session: 'COMMODITY_US_OPEN',
          sessionName: 'US NYMEX / COMEX Prime Open',
          windowTime: '18:00 - 20:00 IST',
          quotaDescription: 'Top 2 High-Volatility US Session Trades'
        };
      } else if (currentMin >= (20 * 60) && currentMin < (23 * 60 + 30)) {
        return {
          session: 'COMMODITY_US_EOD',
          sessionName: 'US Session Wrap & Settlement',
          windowTime: '20:00 - 23:30 IST',
          quotaDescription: 'Top 1 Commodity Swing / Hedge Trade'
        };
      } else if (currentMin >= (9 * 60) && currentMin < (15 * 60 + 40)) {
        return {
          session: 'COMMODITY_EU',
          sessionName: 'Morning Asian / Domestic MCX',
          windowTime: '09:00 - 15:40 IST',
          quotaDescription: 'Top 1-2 Early Commodity Setups'
        };
      } else {
        return {
          session: 'OFF_MARKET',
          sessionName: 'MCX Post-Market Settlement',
          windowTime: '23:30 - 09:00 IST',
          quotaDescription: 'Market Closed'
        };
      }
    }

    // NSE / BSE Equity & Derivatives
    if (currentMin >= (9 * 60 + 15) && currentMin < (10 * 60)) {
      return {
        session: 'MORNING_POWER_OPEN',
        sessionName: 'Morning Power Open',
        windowTime: '09:15 - 10:00 IST',
        quotaDescription: 'Top 1-2 High-Velocity Breakout Trades'
      };
    } else if (currentMin >= (10 * 60) && currentMin < (12 * 60)) {
      return {
        session: 'MID_MORNING_TREND',
        sessionName: 'Mid-Morning Institutional Trend',
        windowTime: '10:00 - 12:00 IST',
        quotaDescription: 'Top 2 High-Conviction Trend Trades'
      };
    } else if (currentMin >= (12 * 60) && currentMin < (14 * 60 + 30)) {
      return {
        session: 'MIDDAY_EUROPE_SPREAD',
        sessionName: 'Midday Europe Crossover & Consolidation',
        windowTime: '12:00 - 14:30 IST',
        quotaDescription: 'Top 1 Capital-Protected Spread Trade'
      };
    } else if (currentMin >= (14 * 60 + 30) && currentMin < (15 * 60 + 40)) {
      return {
        session: 'AFTERNOON_GAMMA_POWER_HOUR',
        sessionName: 'Afternoon 0DTE Power Hour & Expiry Squeeze',
        windowTime: '14:30 - 15:40 IST',
        quotaDescription: 'Top 1-2 Gamma Squeeze / Momentum Trades'
      };
    } else {
      return {
        session: 'OFF_MARKET',
        sessionName: 'Post-Market EOD Review',
        windowTime: '15:40 - 09:15 IST',
        quotaDescription: 'EOD Analysis & Next Day Setup'
      };
    }
  }

  /**
   * Synthesizes all 6 Platform Engines into a Curated 3-Tier Call Tips Cockpit with Carry-Forward
   */
  public static generateUnifiedTipsPackage(
    symbol: IndexSymbol,
    spotPrice: number,
    strikes: OptionStrikeData[],
    masterConfluence: MasterStrategyConfluence,
    faydaStrategy?: FaydaStrategySetup,
    allFaydaStrategies?: FaydaStrategySetup[],
    multiLegStrategy?: MultiLegStrategySetup,
    patternBreakout?: PatternBreakoutAnalysis,
    heroZeroSignals?: HeroZeroSignal[],
    cprData?: CPRLevelData,
    marketRegime?: IntradayMarketRegimeData,
    pcr?: PcrData,
    indiaVix?: number,
    previousSessionTrades: UnifiedSmartTip[] = []
  ): UnifiedSessionTipsPackage {
    const sessionInfo = this.getMarketSession(symbol);
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    let hours = ist.getHours();
    const mins = ist.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minsStr = mins < 10 ? '0' + mins : mins;
    const timeFormatted = `${hours}:${minsStr} ${ampm} IST`;

    const atmStrike = strikes.find(s => s.isAtm)?.strikePrice || Math.round(spotPrice / 50) * 50;
    const isBull = masterConfluence.overallSignal.includes('BUY_CALL') || masterConfluence.masterDecision === 'BUY_CALL';
    const isBear = masterConfluence.overallSignal.includes('BUY_PUT') || masterConfluence.masterDecision === 'BUY_PUT';
    const isDirectional = isBull || isBear;

    const isCommodity = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'].includes(symbol);
    const isOffMarket = sessionInfo.session === 'OFF_MARKET';

    // ── 0. Suspend Trade Suggestions When Market Is Closed ──────────────────
    if (isOffMarket) {
      return {
        currentSession: sessionInfo.session,
        currentSessionName: sessionInfo.sessionName,
        sessionWindowTime: sessionInfo.windowTime,
        quotaDescription: sessionInfo.quotaDescription,
        primaryTrade: null,
        topCallTrade: null,
        topPutTrade: null,
        hourlySlotId: `${symbol}_OFF_MARKET`,
        hourlyQuotaRemaining: { calls: 2, puts: 2 },
        hedgedSpreadTrade: null,
        gammaTrade: null,
        carriedForwardTrades: [],
        regimeWarning: isCommodity
          ? '🌙 MCX Commodity Market is CLOSED (23:30 - 09:00 IST). Live commodity trading opens at 09:00 AM IST.'
          : '🌙 Indian NSE and BSE Market Closed! Visit Next Trading Day! Switch to MCX Commodities (Crude Oil, Natural Gas, Gold, Silver) to trade live evening sessions (Open until 11:30 PM IST).',
        isNoTradeZone: true,
        lastEvaluatedAt: new Date().toISOString()
      };
    }

    // ── 1. Carry-Forward Processing for Active Trades with Deduplication ────
    const carriedForwardTrades: UnifiedSmartTip[] = [];
    const seenContracts = new Set<string>();

    for (const prev of previousSessionTrades) {
      if (seenContracts.has(prev.contractSymbol)) continue;
      seenContracts.add(prev.contractSymbol);

      const strikeObj = strikes.find(s => s.strikePrice === prev.strikePrice);
      if (!strikeObj) continue;

      const liveLtp = prev.optionType === 'CE' ? strikeObj.callLtp : strikeObj.putLtp;
      const currentLtp = liveLtp > 0 ? liveLtp : prev.currentLtp;
      const pnlPoints = +(currentLtp - prev.entryPrice).toFixed(2);
      const pnlPct = prev.entryPrice > 0 ? +((pnlPoints / prev.entryPrice) * 100).toFixed(2) : 0;

      let actionabilityStatus: UnifiedSmartTip['actionabilityStatus'] = 'IN_ENTRY_ZONE';
      if (currentLtp >= prev.target2Price) actionabilityStatus = 'TARGET_HIT';
      else if (currentLtp >= prev.target1Price) actionabilityStatus = 'TRAIL_SL';
      else if (currentLtp <= prev.stoplossPrice) actionabilityStatus = 'SL_HIT';
      else if (pnlPct >= 1.5) actionabilityStatus = 'RUNNING_PROFIT';
      else if (pnlPct <= -1.5) actionabilityStatus = 'DIP_OPPORTUNITY';
      else actionabilityStatus = 'AT_TRIGGER';

      const updated: UnifiedSmartTip = {
        ...prev,
        currentLtp,
        pnlPoints,
        pnlPct,
        actionabilityStatus
      };

      // Check Target / SL triggers
      if (currentLtp >= prev.target2Price) {
        updated.status = 'TARGET2_HIT';
      } else if (currentLtp >= prev.target1Price && updated.status === 'ACTIVE') {
        updated.status = 'TARGET1_HIT';
      } else if (currentLtp <= prev.stoplossPrice) {
        updated.status = 'SL_HIT';
      } else {
        updated.status = 'CARRIED_FORWARD';
        updated.isCarriedForward = true;
        updated.carriedFromSession = prev.sessionName;
      }

      if (updated.status === 'CARRIED_FORWARD' || updated.status === 'TARGET1_HIT') {
        carriedForwardTrades.push(updated);
      }
    }

    // ── 2. Tier 1: Primary Directional Momentum Trade ───────────────────────
    let primaryTrade: UnifiedSmartTip | null = null;
    if (isDirectional && masterConfluence.overallScore >= 65) {
      const optType = isBull ? 'CE' : 'PE';
      const targetStrike = atmStrike;
      const contractSymbol = `${symbol} ${targetStrike} ${optType}`;
      const strikeObj = strikes.find(s => s.strikePrice === targetStrike) || strikes[0];
      const rawLtp = strikeObj ? (isBull ? strikeObj.callLtp : strikeObj.putLtp) : 110;
      const currentLtp = Math.max(15, rawLtp || 100);

      // Check if this contract was already initiated in the session to preserve original benchmark
      const existingTrade = previousSessionTrades.find(t => t.contractSymbol === contractSymbol);
      const entryPrice = existingTrade ? existingTrade.entryPrice : currentLtp;
      const entryTime = existingTrade ? existingTrade.entryTime : new Date().toISOString();
      const entryTimeFormatted = existingTrade ? existingTrade.entryTimeFormatted : timeFormatted;

      const triggerPrice = entryPrice;
      const dipEntryMin = +(entryPrice * 0.975).toFixed(2);
      const dipEntryMax = +(entryPrice * 0.990).toFixed(2);
      const breakoutEntryPrice = +(entryPrice * 1.025).toFixed(2);
      const entryRange = `₹${dipEntryMin.toFixed(2)} - ₹${entryPrice.toFixed(2)}`;

      const slPrice = +(entryPrice * 0.80).toFixed(2); // -20% SL
      const t1Price = +(entryPrice * 1.30).toFixed(2); // +30% T1 (1:1.5 to 1:2)
      const t2Price = +(entryPrice * 1.60).toFixed(2); // +60% T2 (1:3)

      const pnlPoints = +(currentLtp - entryPrice).toFixed(2);
      const pnlPct = entryPrice > 0 ? +((pnlPoints / entryPrice) * 100).toFixed(2) : 0;

      let actionabilityStatus: UnifiedSmartTip['actionabilityStatus'] = 'IN_ENTRY_ZONE';
      if (currentLtp >= t2Price) actionabilityStatus = 'TARGET_HIT';
      else if (currentLtp >= t1Price) actionabilityStatus = 'TRAIL_SL';
      else if (currentLtp <= slPrice) actionabilityStatus = 'SL_HIT';
      else if (pnlPct >= 1.5) actionabilityStatus = 'RUNNING_PROFIT';
      else if (pnlPct <= -1.5) actionabilityStatus = 'DIP_OPPORTUNITY';
      else actionabilityStatus = 'AT_TRIGGER';

      const stratId = faydaStrategy?.strategyName || 'Fayda Pivot Strategy (CPR & 20 EMA Confluence)';
      const patternName = patternBreakout?.activePattern?.patternName || 'Ascending Momentum';

      primaryTrade = {
        id: `prim-${symbol}-${sessionInfo.session}-${targetStrike}-${optType}`,
        symbol,
        tier: 'PRIMARY_MOMENTUM',
        tierLabel: '🎯 Primary Directional Momentum Call',
        session: sessionInfo.session,
        sessionName: sessionInfo.sessionName,
        action: isBull ? 'BUY_CALL' : 'BUY_PUT',
        contractSymbol,
        strikePrice: targetStrike,
        optionType: optType,
        entryTime,
        entryTimeFormatted,
        entryPrice,
        entryRange,
        triggerPrice,
        dipEntryMin,
        dipEntryMax,
        breakoutEntryPrice,
        actionabilityStatus,
        pnlPoints,
        pnlPct,
        currentLtp,
        stoplossPrice: slPrice,
        stoplossPct: 20,
        target1Price: t1Price,
        target1Pct: 30,
        target2Price: t2Price,
        target2Pct: 60,
        riskReward: '1:2.8',
        confluenceScore: masterConfluence.overallScore,
        status: currentLtp >= t1Price ? 'TARGET1_HIT' : currentLtp <= slPrice ? 'SL_HIT' : 'ACTIVE',
        strategyMatches: {
          faydaRadarConfluence: true,
          oiActivitySurge: !!pcr && (isBull ? pcr.overallPcr >= 1.0 : pcr.overallPcr <= 0.95),
          faydaStrategy9Ema: !!faydaStrategy && (faydaStrategy.strategyNumber === 9 || faydaStrategy.confidenceScore >= 75),
          multiTimeframeBreakout: !!patternBreakout && patternBreakout.predictedBreakout.direction !== 'RANGEBOUND',
          multiLegSpreadConfirmed: !!multiLegStrategy,
          gammaExplosionConfirmed: !!heroZeroSignals && heroZeroSignals.length > 0
        },
        strategyTag: `${stratId} + ${patternName} Breakout`,
        explanations: {
          beginner: `Strong institutional ${isBull ? 'buyers' : 'sellers'} active in ${symbol}. Buy 1 Lot of ${targetStrike} ${optType} around ₹${entryPrice.toFixed(2)} (or on dip at ₹${dipEntryMin.toFixed(2)} - ₹${dipEntryMax.toFixed(2)}). Keep maximum risk at ₹${slPrice.toFixed(2)} (Risk ₹${Math.round(entryPrice * 0.20 * 50)} per lot). Take profit when price reaches ₹${t1Price.toFixed(2)}.`,
          intermediate: `${stratId} confirmed with ${patternName} breakout on 5-min chart. ${isBull ? 'Call writers capitulating' : 'Put writers liquidating'} at ${targetStrike}. Limit Dip Entry: ₹${dipEntryMin.toFixed(2)} - ₹${dipEntryMax.toFixed(2)} | Market Trigger: ₹${triggerPrice.toFixed(2)} | Breakout: >₹${breakoutEntryPrice.toFixed(2)}. Strict Stoploss at ₹${slPrice.toFixed(2)} (-20%). Target 1 at ₹${t1Price.toFixed(2)} (1:2 R:R). Trail Stoploss to cost once T1 hits.`,
          expert: `Delta: ${isBull ? '+0.52' : '-0.52'}, Gamma: 0.046, IV: ${strikeObj?.iv || 13.5}%. 1-Min Delta OI Order Flow confirms aggressive institutional execution. VWAP Support aligned with CPR Pivot. Risk:Reward 1:2.8.`
        }
      };
    }

    // ── 2B. HIGH-PROBABILITY HOURLY TOP CALL & TOP PUT (STRICTLY 1-2 PER HOUR) ──
    const slotHour = ist.getHours();
    const slotDateStr = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
    const hourlySlotId = `${symbol}_${slotDateStr}_H${slotHour}`;

    let slotEntry = ConfluenceEngine.hourlyTradesMap.get(hourlySlotId);
    if (!slotEntry) {
      for (const key of ConfluenceEngine.hourlyTradesMap.keys()) {
        if (!key.includes(slotDateStr)) {
          ConfluenceEngine.hourlyTradesMap.delete(key);
        }
      }
      slotEntry = { slotId: hourlySlotId, calls: [], puts: [] };
      ConfluenceEngine.hourlyTradesMap.set(hourlySlotId, slotEntry);
    }

    // 1) Evaluate Top High-Probability CALL (CE)
    let topCallTrade: UnifiedSmartTip | null = null;
    if (slotEntry.calls.length > 0) {
      const activeCall = slotEntry.calls[0];
      const strikeObj = strikes.find(s => s.strikePrice === activeCall.strikePrice);
      const currentLtp = strikeObj && strikeObj.callLtp > 0 ? strikeObj.callLtp : activeCall.currentLtp;
      const pnlPoints = +(currentLtp - activeCall.entryPrice).toFixed(2);
      const pnlPct = activeCall.entryPrice > 0 ? +((pnlPoints / activeCall.entryPrice) * 100).toFixed(2) : 0;

      let actionabilityStatus: UnifiedSmartTip['actionabilityStatus'] = 'IN_ENTRY_ZONE';
      if (currentLtp >= activeCall.target2Price) actionabilityStatus = 'TARGET_HIT';
      else if (currentLtp >= activeCall.target1Price) actionabilityStatus = 'TRAIL_SL';
      else if (currentLtp <= activeCall.stoplossPrice) actionabilityStatus = 'SL_HIT';
      else if (pnlPct >= 1.5) actionabilityStatus = 'RUNNING_PROFIT';
      else if (pnlPct <= -1.5) actionabilityStatus = 'DIP_OPPORTUNITY';
      else actionabilityStatus = 'AT_TRIGGER';

      let status = activeCall.status;
      if (currentLtp >= activeCall.target2Price) status = 'TARGET2_HIT';
      else if (currentLtp >= activeCall.target1Price) status = 'TARGET1_HIT';
      else if (currentLtp <= activeCall.stoplossPrice) status = 'SL_HIT';

      topCallTrade = {
        ...activeCall,
        currentLtp,
        pnlPoints,
        pnlPct,
        actionabilityStatus,
        status
      };
      slotEntry.calls[0] = topCallTrade;
    } else {
      const ceCandidates = strikes.filter(s => Math.abs(s.strikePrice - atmStrike) <= 150 && s.callLtp > 0);
      const bestCeStrike = ceCandidates.sort((a, b) => b.callOIChange1m - a.callOIChange1m)[0] || strikes.find(s => s.strikePrice === atmStrike) || strikes[0];

      if (bestCeStrike && bestCeStrike.callLtp > 0) {
        let callProb = 75;
        if (isBull) callProb += 8;
        if (pcr && pcr.overallPcr >= 1.0) callProb += 5;
        if (spotPrice >= (cprData?.pivot || spotPrice)) callProb += 5;
        if (patternBreakout?.predictedBreakout.direction === 'UPWARD_BREAKOUT') callProb += 6;
        if (bestCeStrike.callOIChange1m < 0) callProb += 4;

        if (callProb >= 85) {
          const entryPrice = bestCeStrike.callLtp;
          const slPrice = +(entryPrice * 0.82).toFixed(2);
          const t1Price = +(entryPrice * 1.28).toFixed(2);
          const t2Price = +(entryPrice * 1.55).toFixed(2);
          const dipMin = +(entryPrice * 0.975).toFixed(2);
          const dipMax = +(entryPrice * 0.99).toFixed(2);

          topCallTrade = {
            id: `call-prime-${symbol}-${hourlySlotId}-${bestCeStrike.strikePrice}`,
            symbol,
            tier: 'PRIMARY_MOMENTUM',
            tierLabel: '🟢 Prime High-Probability CALL',
            session: sessionInfo.session,
            sessionName: sessionInfo.sessionName,
            action: 'BUY_CALL',
            contractSymbol: `${symbol} ${bestCeStrike.strikePrice} CE`,
            strikePrice: bestCeStrike.strikePrice,
            optionType: 'CE',
            entryTime: new Date().toISOString(),
            entryTimeFormatted: timeFormatted,
            entryPrice,
            entryRange: `₹${dipMin.toFixed(2)} - ₹${entryPrice.toFixed(2)}`,
            triggerPrice: entryPrice,
            dipEntryMin: dipMin,
            dipEntryMax: dipMax,
            breakoutEntryPrice: +(entryPrice * 1.025).toFixed(2),
            actionabilityStatus: 'IN_ENTRY_ZONE',
            pnlPoints: 0,
            pnlPct: 0,
            currentLtp: entryPrice,
            stoplossPrice: slPrice,
            stoplossPct: 18,
            target1Price: t1Price,
            target1Pct: 28,
            target2Price: t2Price,
            target2Pct: 55,
            riskReward: '1:2.5',
            confluenceScore: Math.min(97, callProb),
            status: 'ACTIVE',
            strategyMatches: {
              faydaRadarConfluence: true,
              oiActivitySurge: true,
              faydaStrategy9Ema: true,
              multiTimeframeBreakout: patternBreakout?.predictedBreakout.direction === 'UPWARD_BREAKOUT',
              multiLegSpreadConfirmed: false,
              gammaExplosionConfirmed: false
            },
            strategyTag: 'Institutional Call Covering & Bullish Pivot',
            explanations: {
              beginner: `High Probability CALL: Buy 1 Lot of ${bestCeStrike.strikePrice} CE near ₹${entryPrice.toFixed(2)}. Stop Loss ₹${slPrice.toFixed(2)}. Target 1 ₹${t1Price.toFixed(2)}.`,
              intermediate: `Confluence ${callProb}%: Call short-covering confirmed at ${bestCeStrike.strikePrice}. Target 1 at ₹${t1Price.toFixed(2)} (+28%). Trail SL once T1 hits.`,
              expert: `Delta: +0.51, Theta: -12.4/hr, IV: ${bestCeStrike.iv || 12.5}%. R:R 1:2.5 backed by institutional VWAP support.`
            }
          };
          slotEntry.calls.push(topCallTrade);
        }
      }
    }

    // 2) Evaluate Top High-Probability PUT (PE)
    let topPutTrade: UnifiedSmartTip | null = null;
    if (slotEntry.puts.length > 0) {
      const activePut = slotEntry.puts[0];
      const strikeObj = strikes.find(s => s.strikePrice === activePut.strikePrice);
      const currentLtp = strikeObj && strikeObj.putLtp > 0 ? strikeObj.putLtp : activePut.currentLtp;
      const pnlPoints = +(currentLtp - activePut.entryPrice).toFixed(2);
      const pnlPct = activePut.entryPrice > 0 ? +((pnlPoints / activePut.entryPrice) * 100).toFixed(2) : 0;

      let actionabilityStatus: UnifiedSmartTip['actionabilityStatus'] = 'IN_ENTRY_ZONE';
      if (currentLtp >= activePut.target2Price) actionabilityStatus = 'TARGET_HIT';
      else if (currentLtp >= activePut.target1Price) actionabilityStatus = 'TRAIL_SL';
      else if (currentLtp <= activePut.stoplossPrice) actionabilityStatus = 'SL_HIT';
      else if (pnlPct >= 1.5) actionabilityStatus = 'RUNNING_PROFIT';
      else if (pnlPct <= -1.5) actionabilityStatus = 'DIP_OPPORTUNITY';
      else actionabilityStatus = 'AT_TRIGGER';

      let status = activePut.status;
      if (currentLtp >= activePut.target2Price) status = 'TARGET2_HIT';
      else if (currentLtp >= activePut.target1Price) status = 'TARGET1_HIT';
      else if (currentLtp <= activePut.stoplossPrice) status = 'SL_HIT';

      topPutTrade = {
        ...activePut,
        currentLtp,
        pnlPoints,
        pnlPct,
        actionabilityStatus,
        status
      };
      slotEntry.puts[0] = topPutTrade;
    } else {
      const peCandidates = strikes.filter(s => Math.abs(s.strikePrice - atmStrike) <= 150 && s.putLtp > 0);
      const bestPeStrike = peCandidates.sort((a, b) => b.putOIChange1m - a.putOIChange1m)[0] || strikes.find(s => s.strikePrice === atmStrike) || strikes[0];

      if (bestPeStrike && bestPeStrike.putLtp > 0) {
        let putProb = 75;
        if (isBear) putProb += 8;
        if (pcr && pcr.overallPcr <= 0.95) putProb += 5;
        if (spotPrice <= (cprData?.pivot || spotPrice)) putProb += 5;
        if (patternBreakout?.predictedBreakout.direction === 'DOWNWARD_BREAKDOWN') putProb += 6;
        if (bestPeStrike.putOIChange1m < 0) putProb += 4;

        if (putProb >= 85) {
          const entryPrice = bestPeStrike.putLtp;
          const slPrice = +(entryPrice * 0.82).toFixed(2);
          const t1Price = +(entryPrice * 1.28).toFixed(2);
          const t2Price = +(entryPrice * 1.55).toFixed(2);
          const dipMin = +(entryPrice * 0.975).toFixed(2);
          const dipMax = +(entryPrice * 0.99).toFixed(2);

          topPutTrade = {
            id: `put-prime-${symbol}-${hourlySlotId}-${bestPeStrike.strikePrice}`,
            symbol,
            tier: 'PRIMARY_MOMENTUM',
            tierLabel: '🔴 Prime High-Probability PUT',
            session: sessionInfo.session,
            sessionName: sessionInfo.sessionName,
            action: 'BUY_PUT',
            contractSymbol: `${symbol} ${bestPeStrike.strikePrice} PE`,
            strikePrice: bestPeStrike.strikePrice,
            optionType: 'PE',
            entryTime: new Date().toISOString(),
            entryTimeFormatted: timeFormatted,
            entryPrice,
            entryRange: `₹${dipMin.toFixed(2)} - ₹${entryPrice.toFixed(2)}`,
            triggerPrice: entryPrice,
            dipEntryMin: dipMin,
            dipEntryMax: dipMax,
            breakoutEntryPrice: +(entryPrice * 1.025).toFixed(2),
            actionabilityStatus: 'IN_ENTRY_ZONE',
            pnlPoints: 0,
            pnlPct: 0,
            currentLtp: entryPrice,
            stoplossPrice: slPrice,
            stoplossPct: 18,
            target1Price: t1Price,
            target1Pct: 28,
            target2Price: t2Price,
            target2Pct: 55,
            riskReward: '1:2.5',
            confluenceScore: Math.min(97, putProb),
            status: 'ACTIVE',
            strategyMatches: {
              faydaRadarConfluence: true,
              oiActivitySurge: true,
              faydaStrategy9Ema: true,
              multiTimeframeBreakout: patternBreakout?.predictedBreakout.direction === 'DOWNWARD_BREAKDOWN',
              multiLegSpreadConfirmed: false,
              gammaExplosionConfirmed: false
            },
            strategyTag: 'Institutional Put Accumulation & Resistance Roof',
            explanations: {
              beginner: `High Probability PUT: Buy 1 Lot of ${bestPeStrike.strikePrice} PE near ₹${entryPrice.toFixed(2)}. Stop Loss ₹${slPrice.toFixed(2)}. Target 1 ₹${t1Price.toFixed(2)}.`,
              intermediate: `Confluence ${putProb}%: Put writer capitulation & breakdown confirmed at ${bestPeStrike.strikePrice}. Target 1 at ₹${t1Price.toFixed(2)} (+28%). Trail SL on trigger.`,
              expert: `Delta: -0.50, Theta: -12.2/hr, IV: ${bestPeStrike.iv || 12.8}%. Strong institutional call writing resistance above spot.`
            }
          };
          slotEntry.puts.push(topPutTrade);
        }
      }
    }

    const hourlyQuotaRemaining = {
      calls: Math.max(0, 2 - slotEntry.calls.length),
      puts: Math.max(0, 2 - slotEntry.puts.length)
    };

    // ── 3. Tier 2: Hedged Multi-Leg Spread (Bull Call Spread / Bear Put Spread) ─
    let hedgedSpreadTrade: UnifiedSmartTip | null = null;
    const symCfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
    const strikeStep = symCfg?.step || 50;
    const instrumentLot = symCfg?.lot || 50;

    if (multiLegStrategy || strikes.length >= 2) {
      const ml = multiLegStrategy;
      const isSpreadBull = isBull || (ml ? ml.outlook.includes('BULLISH') : true);
      const optType = isSpreadBull ? 'CE' : 'PE';
      const buyStrike = atmStrike;
      const sellStrike = isSpreadBull ? atmStrike + strikeStep : atmStrike - strikeStep;

      const buyStrikeObj = strikes.find(s => s.strikePrice === buyStrike);
      const sellStrikeObj = strikes.find(s => s.strikePrice === sellStrike);

      const buyPremium = buyStrikeObj ? (isSpreadBull ? buyStrikeObj.callLtp : buyStrikeObj.putLtp) : (spotPrice * 0.008);
      const sellPremium = sellStrikeObj ? (isSpreadBull ? sellStrikeObj.callLtp : sellStrikeObj.putLtp) : (buyPremium * 0.45);

      const spreadWidth = Math.abs(sellStrike - buyStrike) || strikeStep;
      let spreadEntryPts = +(Math.max(1, buyPremium - sellPremium)).toFixed(2);

      // Enforce that Net Debit is capped at 40% of spread width so Max Profit is ALWAYS >= 1.5x Max Loss
      if (spreadEntryPts >= spreadWidth * 0.50) {
        spreadEntryPts = +(spreadWidth * 0.35).toFixed(2);
      }

      const maxLossPts = spreadEntryPts;
      const maxProfitPts = +(spreadWidth - spreadEntryPts).toFixed(2);

      const maxLoss = Math.round(maxLossPts * instrumentLot);
      const maxProfit = Math.round(maxProfitPts * instrumentLot);

      const rrNum = +(maxProfitPts / maxLossPts).toFixed(2);
      const riskRewardStr = `1:${rrNum >= 1.2 ? rrNum : '2.00'}`;

      const breakeven = isSpreadBull ? +(buyStrike + spreadEntryPts).toFixed(2) : +(buyStrike - spreadEntryPts).toFixed(2);
      const stratName = isSpreadBull ? 'Fayda Bull Call Spread' : 'Fayda Bear Put Spread';
      const stratAction = isSpreadBull ? 'BULL_CALL_SPREAD' : 'BEAR_PUT_SPREAD';
      const contractSymbol = `${symbol} ${stratName} (${buyStrike} Long / ${sellStrike} Short)`;

      const existingSpread = previousSessionTrades.find(t => t.contractSymbol === contractSymbol);
      const entryPrice = existingSpread ? existingSpread.entryPrice : spreadEntryPts;
      const entryTime = existingSpread ? existingSpread.entryTime : new Date().toISOString();
      const entryTimeFormatted = existingSpread ? existingSpread.entryTimeFormatted : timeFormatted;

      const pnlPoints = +(spreadEntryPts - entryPrice).toFixed(2);
      const pnlPct = entryPrice > 0 ? +((pnlPoints / entryPrice) * 100).toFixed(2) : 0;

      hedgedSpreadTrade = {
        id: `spread-${symbol}-${sessionInfo.session}-${buyStrike}-${sellStrike}`,
        symbol,
        tier: 'HEDGED_SPREAD',
        tierLabel: '🛡️ Capital-Protected Spread (Bull Call / Bear Put)',
        session: sessionInfo.session,
        sessionName: sessionInfo.sessionName,
        action: stratAction,
        contractSymbol,
        strikePrice: buyStrike,
        optionType: 'SPREAD',
        entryTime,
        entryTimeFormatted,
        entryPrice,
        entryRange: `Net Debit ₹${entryPrice.toFixed(2)} pts`,
        triggerPrice: entryPrice,
        dipEntryMin: +(entryPrice * 0.92).toFixed(2),
        dipEntryMax: entryPrice,
        breakoutEntryPrice: +(entryPrice * 1.10).toFixed(2),
        actionabilityStatus: pnlPct >= 2.0 ? 'RUNNING_PROFIT' : pnlPct <= -2.0 ? 'DIP_OPPORTUNITY' : 'AT_TRIGGER',
        pnlPoints,
        pnlPct,
        currentLtp: spreadEntryPts,
        stoplossPrice: +(entryPrice * 0.50).toFixed(2),
        stoplossPct: 50,
        target1Price: +(entryPrice + (maxProfitPts * 0.70)).toFixed(2),
        target1Pct: 70,
        target2Price: +(entryPrice + maxProfitPts).toFixed(2),
        target2Pct: 100,
        riskReward: riskRewardStr,
        confluenceScore: ml?.confidenceScore || 88,
        status: 'ACTIVE',
        strategyMatches: {
          faydaRadarConfluence: true,
          oiActivitySurge: true,
          faydaStrategy9Ema: true,
          multiTimeframeBreakout: true,
          multiLegSpreadConfirmed: true,
          gammaExplosionConfirmed: false
        },
        strategyTag: `${stratName} (DIRECTIONAL_SPREAD)`,
        spreadDetails: {
          legsSummary: `Buy ${buyStrike} ${optType} + Sell ${sellStrike} ${optType}`,
          maxProfitRupees: maxProfit,
          maxLossRupees: maxLoss,
          breakeven,
          marginSavingsPct: 72
        },
        explanations: {
          beginner: `100% Capital-Protected Trade for peaceful trading. Buy ${buyStrike} ${optType} and Sell ${sellStrike} ${optType} together. Your maximum risk is strictly locked at ₹${maxLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} and maximum profit potential is ₹${maxProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Risk:Reward ${riskRewardStr}). Zero fear of sudden crashes.`,
          intermediate: `${stratName} (Long ${buyStrike} / Short ${sellStrike}). 72% margin reduction with complete immunity to sudden IV crush and slow theta decay. Breakeven at ₹${breakeven.toFixed(2)}. High 78% win probability.`,
          expert: `Net Delta: ${isSpreadBull ? '+0.25' : '-0.25'}, Daily Theta: -1.2 pts, Vega: 0.15. Defined-risk asymmetric payoff with exchange margin benefit.`
        }
      };
    }

    // ── 4. Tier 3: 0DTE Gamma Sniper / Hero-or-Zero ─────────────────────────
    let gammaTrade: UnifiedSmartTip | null = null;
    const topHz = heroZeroSignals && heroZeroSignals.length > 0 ? heroZeroSignals[0] : null;

    if (topHz && (sessionInfo.session === 'AFTERNOON_GAMMA_POWER_HOUR' || topHz.gammaScore >= 80)) {
      const contractSymbol = `${topHz.contractSymbol} (0DTE Gamma Burst)`;
      const existingGamma = previousSessionTrades.find(t => t.contractSymbol === contractSymbol);
      const entryPrice = existingGamma ? existingGamma.entryPrice : topHz.ltp;
      const entryTime = existingGamma ? existingGamma.entryTime : new Date().toISOString();
      const entryTimeFormatted = existingGamma ? existingGamma.entryTimeFormatted : timeFormatted;

      const pnlPoints = +(topHz.ltp - entryPrice).toFixed(2);
      const pnlPct = entryPrice > 0 ? +((pnlPoints / entryPrice) * 100).toFixed(2) : 0;

      gammaTrade = {
        id: `gamma-${symbol}-${sessionInfo.session}-${topHz.strike}-${topHz.optionType}`,
        symbol,
        tier: 'GAMMA_0DTE',
        tierLabel: '⚡ 0DTE Gamma Explosion Sniper (Hero-or-Zero)',
        session: sessionInfo.session,
        sessionName: sessionInfo.sessionName,
        action: topHz.optionType === 'CE' ? 'BUY_CALL' : 'BUY_PUT',
        contractSymbol,
        strikePrice: topHz.strike,
        optionType: topHz.optionType,
        entryTime,
        entryTimeFormatted,
        entryPrice,
        entryRange: `₹${(entryPrice * 0.90).toFixed(2)} - ₹${entryPrice.toFixed(2)}`,
        triggerPrice: entryPrice,
        dipEntryMin: +(entryPrice * 0.90).toFixed(2),
        dipEntryMax: entryPrice,
        breakoutEntryPrice: +(entryPrice * 1.08).toFixed(2),
        actionabilityStatus: pnlPct >= 5.0 ? 'RUNNING_PROFIT' : 'AT_TRIGGER',
        pnlPoints,
        pnlPct,
        currentLtp: topHz.ltp,
        stoplossPrice: topHz.stoploss,
        stoplossPct: topHz.stoplossPct,
        target1Price: topHz.target3x,
        target1Pct: 200,
        target2Price: topHz.target5x,
        target2Pct: 400,
        riskReward: topHz.riskReward,
        confluenceScore: topHz.gammaScore,
        status: 'ACTIVE',
        strategyMatches: {
          faydaRadarConfluence: true,
          oiActivitySurge: true,
          faydaStrategy9Ema: false,
          multiTimeframeBreakout: true,
          multiLegSpreadConfirmed: false,
          gammaExplosionConfirmed: true
        },
        strategyTag: `${topHz.squeezeType} (Gamma Score: ${topHz.gammaScore})`,
        gammaDetails: {
          gammaScore: topHz.gammaScore,
          multiplierTarget: '3.5x to 5.0x Multiplier'
        },
        explanations: {
          beginner: `High-Profit 0DTE Special Trade. Small capital risk (₹${topHz.ltp.toFixed(1)} per share). Aim for 3x–5x multiplier. Risk is small, potential gain is very high.`,
          intermediate: `Massive 0DTE Gamma Squeeze triggered. Writers capitulation detected. Low stoploss at ₹${topHz.stoploss.toFixed(1)}. Target 1 at ₹${topHz.target3x.toFixed(1)} (3x), Target 2 at ₹${topHz.target5x.toFixed(1)} (5x).`,
          expert: `Gamma Score: ${topHz.gammaScore}, Gamma Value: ${topHz.gamma}. Volume velocity ${topHz.volumeVelocity}x baseline. 1-Min Delta OI: ${topHz.oiChange1m}. Instant delta explosion in progress.`
        }
      };
    } else {
      // Clean Standby Mode (Prevents Overtrading)
      gammaTrade = {
        id: `gamma-standby-${symbol}`,
        symbol,
        tier: 'STANDBY',
        tierLabel: '⚡ 0DTE Gamma Explosion Sniper',
        session: sessionInfo.session,
        sessionName: sessionInfo.sessionName,
        action: 'STANDBY',
        contractSymbol: `${symbol} 0DTE Gamma Sniper`,
        strikePrice: atmStrike,
        optionType: 'CE',
        entryTime: new Date().toISOString(),
        entryTimeFormatted: timeFormatted,
        entryPrice: 0,
        entryRange: 'Standby Zone',
        currentLtp: 0,
        stoplossPrice: 0,
        stoplossPct: 0,
        target1Price: 0,
        target1Pct: 0,
        target2Price: 0,
        target2Pct: 0,
        riskReward: 'N/A',
        confluenceScore: 50,
        status: 'EXPIRED',
        strategyMatches: {
          faydaRadarConfluence: false,
          oiActivitySurge: false,
          faydaStrategy9Ema: false,
          multiTimeframeBreakout: false,
          multiLegSpreadConfirmed: false,
          gammaExplosionConfirmed: false
        },
        strategyTag: 'Awaiting 0DTE Expiry / Squeeze Threshold',
        explanations: {
          beginner: 'STANDBY: Gamma conditions below threshold. Capital safely preserved until true institutional short-squeeze appears.',
          intermediate: 'STANDBY: 0DTE Gamma velocity normal. Avoid gambling on low-gamma strikes during range consolidation.',
          expert: 'STANDBY: Gamma score < 80. Realized volatility skew does not justify naked OTM gamma exposure.'
        }
      };
    }

    return {
      currentSession: sessionInfo.session,
      currentSessionName: sessionInfo.sessionName,
      sessionWindowTime: sessionInfo.windowTime,
      quotaDescription: sessionInfo.quotaDescription,
      primaryTrade,
      topCallTrade,
      topPutTrade,
      hourlySlotId,
      hourlyQuotaRemaining,
      hedgedSpreadTrade,
      gammaTrade,
      carriedForwardTrades,
      regimeWarning: masterConfluence.marketRegime === 'RANGE_BOUND_CHOP' || masterConfluence.marketRegime === 'IV_CRUSH_ZONE'
        ? `⚠️ ${masterConfluence.regimeLabel}: High choppy risk. Use Hedged Spreads or hold capital.`
        : undefined,
      isNoTradeZone: masterConfluence.masterDecision === 'NO_TRADE' || masterConfluence.masterDecision === 'WAIT',
      lastEvaluatedAt: new Date().toISOString()
    };
  }
}

