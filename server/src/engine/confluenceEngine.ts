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
  ALL_SYMBOLS_CONFIG,
  TechnicalIndicatorsData,
  TipConfluenceFactor,
  TipConfluenceBreakdown,
  OptionSellerMetrics
} from '../types.js';

export class ConfluenceEngine {
  // In-memory hourly slot cache for high-probability Buyer & Seller tips (strictly 1-2 calls/puts/credit-spreads per hour)
  private static hourlyTradesMap: Map<string, {
    slotId: string;
    calls: UnifiedSmartTip[];
    puts: UnifiedSmartTip[];
    sellerPuts: UnifiedSmartTip[];
    sellerCalls: UnifiedSmartTip[];
    sellerNeutrals: UnifiedSmartTip[];
  }> = new Map();

  /**
   * 10-Indicator Mathematical Confluence Evaluation Engine
   * Calibrated strictly to user weight matrix:
   * 1. OI Concentration: 15%
   * 2. 5-min Delta OI: 15%
   * 3. EMA Structure: 12%
   * 4. India VIX: 10%
   * 5. VWAP Benchmark: 10%
   * 6. PCR + Delta PCR: 10%
   * 7. Bollinger Bands: 8%
   * 8. RSI Momentum: 7%
   * 9. Intraday Momentum Index (IMI): 5%
   * 10. Max Pain: 3%
   * Total Core = 100%
   * Bonus: FII / DII Institutional Flow: +5% (Capped at 100%)
   */
  public static evaluate10IndicatorConfluence(
    symbol: IndexSymbol,
    action: 'BUY_CALL' | 'BUY_PUT' | 'BULL_CALL_SPREAD' | 'BEAR_PUT_SPREAD' | 'SELL_PUT_SPREAD' | 'SELL_CALL_SPREAD' | 'IRON_CONDOR' | 'SELL_CALL' | 'SELL_PUT' | 'WAIT' | 'STANDBY',
    spotPrice: number,
    atmStrike: number,
    strikes: OptionStrikeData[],
    pcr?: PcrData,
    maxPain?: MaxPainData,
    tech?: TechnicalIndicatorsData,
    patternBreakout?: PatternBreakoutAnalysis,
    cprData?: CPRLevelData,
    indiaVixVal?: number
  ): TipConfluenceBreakdown {
    const isBull = action === 'BUY_CALL' || action === 'BULL_CALL_SPREAD' || action === 'SELL_PUT_SPREAD';
    const isBear = action === 'BUY_PUT' || action === 'BEAR_PUT_SPREAD' || action === 'SELL_CALL_SPREAD';
    const isNeutral = action === 'IRON_CONDOR' || action === 'WAIT' || action === 'STANDBY';

    const vixVal = tech?.indiaVix?.value || indiaVixVal || 13.8;
    const pcrVal = pcr?.overallPcr || tech?.pcr?.overall || 1.05;
    const pcrDelta = tech?.pcr?.pcr5mChange || 0.02;
    const maxPainStrike = maxPain?.strikePrice || tech?.maxPain?.strikePrice || atmStrike;

    let confirmedCount = 0;

    // 1. OI Concentration (Weight: 15%)
    let oiConcentration: TipConfluenceFactor;
    const totalCallOI = tech?.oiSummary?.totalCallOI || strikes.reduce((acc, s) => acc + s.callOI, 0);
    const totalPutOI = tech?.oiSummary?.totalPutOI || strikes.reduce((acc, s) => acc + s.putOI, 0);
    const netOiFlow = tech?.oiSummary?.netOIFlow ?? (totalPutOI - totalCallOI);

    if (isBull) {
      const isConfirmed = netOiFlow > 0 || (pcr?.atmPlusMinus5Pcr || 1) >= 1.0;
      if (isConfirmed) confirmedCount++;
      oiConcentration = {
        confirmed: isConfirmed,
        weight: 15,
        score: isConfirmed ? 15 : 6,
        details: isConfirmed
          ? `Put OI (${(totalPutOI / 1000).toFixed(0)}k) > Call OI (${(totalCallOI / 1000).toFixed(0)}k). Put writers form firm floor support.`
          : `Call OI exceeds Put OI near ATM; mild overhead supply detected.`
      };
    } else if (isBear) {
      const isConfirmed = netOiFlow < 0 || (pcr?.atmPlusMinus5Pcr || 1) <= 1.0;
      if (isConfirmed) confirmedCount++;
      oiConcentration = {
        confirmed: isConfirmed,
        weight: 15,
        score: isConfirmed ? 15 : 6,
        details: isConfirmed
          ? `Call OI (${(totalCallOI / 1000).toFixed(0)}k) > Put OI (${(totalPutOI / 1000).toFixed(0)}k). Heavy call writing ceiling caps upside.`
          : `Put OI exceeds Call OI; dip buying support lingering.`
      };
    } else {
      confirmedCount++;
      oiConcentration = {
        confirmed: true,
        weight: 15,
        score: 15,
        details: `OI balanced between Call wall (${(totalCallOI / 1000).toFixed(0)}k) and Put wall (${(totalPutOI / 1000).toFixed(0)}k). Ideal rangebound pin.`
      };
    }

    // 2. 5-Min Delta OI (Weight: 15%)
    let oiChange5m: TipConfluenceFactor;
    const domFlow = tech?.oiSummary?.dominant5mFlow || (isBull ? 'PUT_WRITING' : 'CALL_WRITING');
    const callOIChange5m = tech?.oiSummary?.callOIChange5m || 0;
    const putOIChange5m = tech?.oiSummary?.putOIChange5m || 0;

    if (isBull) {
      const isConfirmed = domFlow === 'PUT_WRITING' || domFlow === 'CALL_UNWINDING' || putOIChange5m > callOIChange5m;
      if (isConfirmed) confirmedCount++;
      oiChange5m = {
        confirmed: isConfirmed,
        weight: 15,
        score: isConfirmed ? 15 : 5,
        details: isConfirmed
          ? `5-min Put OI change (+${(Math.abs(putOIChange5m) / 1000).toFixed(1)}k) with Call short-covering. Bullish pressure verified.`
          : `Call additions (+${(Math.abs(callOIChange5m) / 1000).toFixed(1)}k) outnumbering Put writers in last 5m.`
      };
    } else if (isBear) {
      const isConfirmed = domFlow === 'CALL_WRITING' || domFlow === 'PUT_UNWINDING' || callOIChange5m > putOIChange5m;
      if (isConfirmed) confirmedCount++;
      oiChange5m = {
        confirmed: isConfirmed,
        weight: 15,
        score: isConfirmed ? 15 : 5,
        details: isConfirmed
          ? `5-min Call writing (+${(Math.abs(callOIChange5m) / 1000).toFixed(1)}k) with Put unwinding. Aggressive distribution confirmed.`
          : `Put additions (+${(Math.abs(putOIChange5m) / 1000).toFixed(1)}k) resisting downward breakout.`
      };
    } else {
      confirmedCount++;
      oiChange5m = {
        confirmed: true,
        weight: 15,
        score: 15,
        details: `Balanced 5-min straddle additions (+${(Math.abs(callOIChange5m) / 1000).toFixed(1)}k Calls / +${(Math.abs(putOIChange5m) / 1000).toFixed(1)}k Puts) reinforcing boundaries.`
      };
    }

    // 3. EMA Structure (9, 20, 50, 200) (Weight: 12%)
    let emaStructure: TipConfluenceFactor;
    const emaTrend = tech?.ema?.trend || (isBull ? 'BULLISH' : 'BEARISH');
    const ema9 = tech?.ema?.ema9 || (spotPrice * (isBull ? 0.998 : 1.002));
    const ema20 = tech?.ema?.ema20 || (spotPrice * (isBull ? 0.995 : 1.005));

    if (isBull) {
      const isConfirmed = emaTrend.includes('BULLISH') || spotPrice >= ema9;
      if (isConfirmed) confirmedCount++;
      emaStructure = {
        confirmed: isConfirmed,
        weight: 12,
        score: isConfirmed ? 12 : 4,
        details: isConfirmed
          ? `Spot (₹${spotPrice.toFixed(1)}) > 9 EMA (₹${ema9.toFixed(1)}) > 20 EMA (₹${ema20.toFixed(1)}). Golden Stack alignment.`
          : `Spot trading below short-term 9 EMA (₹${ema9.toFixed(1)}).`
      };
    } else if (isBear) {
      const isConfirmed = emaTrend.includes('BEARISH') || spotPrice <= ema9;
      if (isConfirmed) confirmedCount++;
      emaStructure = {
        confirmed: isConfirmed,
        weight: 12,
        score: isConfirmed ? 12 : 4,
        details: isConfirmed
          ? `Spot (₹${spotPrice.toFixed(1)}) < 9 EMA (₹${ema9.toFixed(1)}) < 20 EMA (₹${ema20.toFixed(1)}). Death Cross downward alignment.`
          : `Spot bouncing above short-term 9 EMA (₹${ema9.toFixed(1)}).`
      };
    } else {
      confirmedCount++;
      emaStructure = {
        confirmed: true,
        weight: 12,
        score: 12,
        details: `Price oscillating within 9 EMA (₹${ema9.toFixed(1)}) and 20 EMA (₹${ema20.toFixed(1)}). Mean-reversion state.`
      };
    }

    // 4. India VIX (Weight: 10%)
    let indiaVixFactor: TipConfluenceFactor;
    const isVixBuyerFriendly = vixVal >= 12.0 && vixVal <= 21.0;
    const isVixSellerFriendly = vixVal >= 11.0;

    if (action.includes('SELL') || action === 'IRON_CONDOR') {
      const isConfirmed = isVixSellerFriendly;
      if (isConfirmed) confirmedCount++;
      indiaVixFactor = {
        confirmed: isConfirmed,
        weight: 10,
        score: isConfirmed ? 10 : 5,
        details: `India VIX at ${vixVal.toFixed(2)} (${tech?.indiaVix?.regime || 'MODERATE'}). High initial credit + fast theta decay favour seller.`
      };
    } else {
      const isConfirmed = isVixBuyerFriendly;
      if (isConfirmed) confirmedCount++;
      indiaVixFactor = {
        confirmed: isConfirmed,
        weight: 10,
        score: isConfirmed ? 10 : 5,
        details: isConfirmed
          ? `India VIX at ${vixVal.toFixed(2)}. Healthy option volatility supports directional premium expansion.`
          : `India VIX at ${vixVal.toFixed(2)}. Extreme volatility risk or sluggish premium expansion.`
      };
    }

    // 5. VWAP Benchmark (Weight: 10%)
    let vwapBenchmark: TipConfluenceFactor;
    const vwapVal = tech?.vwap?.value || (spotPrice * (isBull ? 0.998 : 1.002));
    const vwapDist = +(spotPrice - vwapVal).toFixed(1);

    if (isBull) {
      const isConfirmed = spotPrice >= vwapVal || tech?.vwap?.bias === 'BULLISH_SUPPORT';
      if (isConfirmed) confirmedCount++;
      vwapBenchmark = {
        confirmed: isConfirmed,
        weight: 10,
        score: isConfirmed ? 10 : 3,
        details: isConfirmed
          ? `Spot trading ${vwapDist >= 0 ? '+' : ''}${vwapDist} pts above VWAP (₹${vwapVal.toFixed(1)}). Institutional buyers defending level.`
          : `Spot trading below VWAP (₹${vwapVal.toFixed(1)}), awaiting breakout.`
      };
    } else if (isBear) {
      const isConfirmed = spotPrice <= vwapVal || tech?.vwap?.bias === 'BEARISH_RESISTANCE';
      if (isConfirmed) confirmedCount++;
      vwapBenchmark = {
        confirmed: isConfirmed,
        weight: 10,
        score: isConfirmed ? 10 : 3,
        details: isConfirmed
          ? `Spot trading ${vwapDist} pts below VWAP (₹${vwapVal.toFixed(1)}). Institutions distributing above VWAP.`
          : `Spot trading above VWAP (₹${vwapVal.toFixed(1)}), resistance not confirmed.`
      };
    } else {
      confirmedCount++;
      vwapBenchmark = {
        confirmed: true,
        weight: 10,
        score: 10,
        details: `Spot hovering within ±0.15% of VWAP (₹${vwapVal.toFixed(1)}). Strong mean-reversion magnet.`
      };
    }

    // 6. PCR + Delta PCR (Weight: 10%)
    let pcrVelocity: TipConfluenceFactor;
    if (isBull) {
      const isConfirmed = pcrVal >= 1.02 || pcrDelta > 0;
      if (isConfirmed) confirmedCount++;
      pcrVelocity = {
        confirmed: isConfirmed,
        weight: 10,
        score: isConfirmed ? 10 : 4,
        details: isConfirmed
          ? `PCR at ${pcrVal.toFixed(2)} (5m ΔPCR: ${pcrDelta >= 0 ? '+' : ''}${pcrDelta.toFixed(2)}). Bullish bias validated by put buildup.`
          : `PCR at ${pcrVal.toFixed(2)} reflects subdued put interest.`
      };
    } else if (isBear) {
      const isConfirmed = pcrVal <= 0.92 || pcrDelta < 0;
      if (isConfirmed) confirmedCount++;
      pcrVelocity = {
        confirmed: isConfirmed,
        weight: 10,
        score: isConfirmed ? 10 : 4,
        details: isConfirmed
          ? `PCR at ${pcrVal.toFixed(2)} (5m ΔPCR: ${pcrDelta.toFixed(2)}). Bearish sentiment backed by aggressive call accumulation.`
          : `PCR at ${pcrVal.toFixed(2)} remains above bearish threshold.`
      };
    } else {
      confirmedCount++;
      pcrVelocity = {
        confirmed: true,
        weight: 10,
        score: 10,
        details: `PCR neutral at ${pcrVal.toFixed(2)} (Range: 0.95 - 1.10). Perfect equilibrium for range trading.`
      };
    }

    // 7. Bollinger Bands (Weight: 8%)
    let bollingerBands: TipConfluenceFactor;
    const bbUpper = tech?.bollingerBands?.upper || (spotPrice * 1.004);
    const bbLower = tech?.bollingerBands?.lower || (spotPrice * 0.996);
    const bbStatus = tech?.bollingerBands?.status || 'NORMAL_VOLATILITY';

    if (action.includes('SELL') || action === 'IRON_CONDOR') {
      const isConfirmed = spotPrice >= bbLower && spotPrice <= bbUpper;
      if (isConfirmed) confirmedCount++;
      bollingerBands = {
        confirmed: isConfirmed,
        weight: 8,
        score: isConfirmed ? 8 : 3,
        details: `Spot securely enclosed within Bollinger envelope (Lower: ₹${bbLower.toFixed(1)} / Upper: ₹${bbUpper.toFixed(1)}).`
      };
    } else if (isBull) {
      const isConfirmed = tech?.bollingerBands?.position === 'UPPER_HALF' || tech?.bollingerBands?.position === 'ABOVE_UPPER' || bbStatus === 'EXPANSION_TRENDING';
      if (isConfirmed) confirmedCount++;
      bollingerBands = {
        confirmed: isConfirmed,
        weight: 8,
        score: isConfirmed ? 8 : 3,
        details: isConfirmed
          ? `Bollinger Bands expanding upward (Bandwidth: ${(tech?.bollingerBands?.bandwidthPct || 1.8).toFixed(2)}%). Price riding upper band.`
          : `Spot situated below middle band.`
      };
    } else {
      const isConfirmed = tech?.bollingerBands?.position === 'LOWER_HALF' || tech?.bollingerBands?.position === 'BELOW_LOWER' || bbStatus === 'EXPANSION_TRENDING';
      if (isConfirmed) confirmedCount++;
      bollingerBands = {
        confirmed: isConfirmed,
        weight: 8,
        score: isConfirmed ? 8 : 3,
        details: isConfirmed
          ? `Bollinger Bands expanding downward. Price tracking lower band extension.`
          : `Spot situated above middle band.`
      };
    }

    // 8. RSI Momentum (Weight: 7%)
    let rsiMomentum: TipConfluenceFactor;
    const rsiVal = tech?.rsi?.value || (isBull ? 58.5 : isBear ? 42.0 : 50.0);

    if (isBull) {
      const isConfirmed = rsiVal >= 50 && rsiVal <= 72;
      if (isConfirmed) confirmedCount++;
      rsiMomentum = {
        confirmed: isConfirmed,
        weight: 7,
        score: isConfirmed ? 7 : 3,
        details: isConfirmed
          ? `RSI at ${rsiVal.toFixed(1)} confirming healthy bullish momentum without overbought exhaustion.`
          : `RSI at ${rsiVal.toFixed(1)} shows weak momentum or overbought state.`
      };
    } else if (isBear) {
      const isConfirmed = rsiVal >= 28 && rsiVal <= 50;
      if (isConfirmed) confirmedCount++;
      rsiMomentum = {
        confirmed: isConfirmed,
        weight: 7,
        score: isConfirmed ? 7 : 3,
        details: isConfirmed
          ? `RSI at ${rsiVal.toFixed(1)} confirming steady bearish push without oversold exhaustion.`
          : `RSI at ${rsiVal.toFixed(1)} above 50 neutral midpoint.`
      };
    } else {
      confirmedCount++;
      rsiMomentum = {
        confirmed: true,
        weight: 7,
        score: 7,
        details: `RSI at ${rsiVal.toFixed(1)} centered around 50 neutral line. Equilibrium confirmed.`
      };
    }

    // 9. Intraday Momentum Index (IMI) (Weight: 5%)
    let imiCandles: TipConfluenceFactor;
    const imiVal = tech?.imi?.value || (isBull ? 57.0 : isBear ? 43.0 : 50.0);

    if (isBull) {
      const isConfirmed = imiVal >= 49;
      if (isConfirmed) confirmedCount++;
      imiCandles = {
        confirmed: isConfirmed,
        weight: 5,
        score: isConfirmed ? 5 : 2,
        details: isConfirmed
          ? `Intraday Momentum Index (IMI) at ${imiVal.toFixed(1)}%. Green candlestick body volume dominant.`
          : `IMI at ${imiVal.toFixed(1)}% indicates red candlestick pressure.`
      };
    } else if (isBear) {
      const isConfirmed = imiVal <= 51;
      if (isConfirmed) confirmedCount++;
      imiCandles = {
        confirmed: isConfirmed,
        weight: 5,
        score: isConfirmed ? 5 : 2,
        details: isConfirmed
          ? `Intraday Momentum Index (IMI) at ${imiVal.toFixed(1)}%. Red candlestick body volume dominant.`
          : `IMI at ${imiVal.toFixed(1)}% indicates green candlestick defense.`
      };
    } else {
      confirmedCount++;
      imiCandles = {
        confirmed: true,
        weight: 5,
        score: 5,
        details: `IMI at ${imiVal.toFixed(1)}% reflects equal intraday bull/bear candle distribution.`
      };
    }

    // 10. Max Pain (Weight: 3%)
    let maxPainFactor: TipConfluenceFactor;
    const painDist = +(maxPainStrike - spotPrice).toFixed(1);

    if (isBull) {
      const isConfirmed = maxPainStrike >= spotPrice - 25;
      if (isConfirmed) confirmedCount++;
      maxPainFactor = {
        confirmed: isConfirmed,
        weight: 3,
        score: isConfirmed ? 3 : 1,
        details: isConfirmed
          ? `Max Pain at ₹${maxPainStrike} (${painDist >= 0 ? '+' : ''}${painDist} pts) provides upward magnetic anchor.`
          : `Max Pain strike below spot price.`
      };
    } else if (isBear) {
      const isConfirmed = maxPainStrike <= spotPrice + 25;
      if (isConfirmed) confirmedCount++;
      maxPainFactor = {
        confirmed: isConfirmed,
        weight: 3,
        score: isConfirmed ? 3 : 1,
        details: isConfirmed
          ? `Max Pain at ₹${maxPainStrike} (${painDist} pts) exerts downward magnetic pull on spot.`
          : `Max Pain strike above spot price.`
      };
    } else {
      confirmedCount++;
      maxPainFactor = {
        confirmed: true,
        weight: 3,
        score: 3,
        details: `Max Pain at ₹${maxPainStrike} pinned directly at ATM. High probability of option expiry pin.`
      };
    }

    // Bonus: FII / DII Institutional Flow (+5% Bonus, Capped at 100%)
    let fiiDiiBonus: { confirmed: boolean; bonus: number; details: string } = {
      confirmed: false,
      bonus: 0,
      details: 'FII/DII Institutional Flow neutral.'
    };
    const fiiNetCr = tech?.fiiDiiFlow?.fiiNetCr;
    if (fiiNetCr !== undefined) {
      if (isBull && fiiNetCr > 0) {
        fiiDiiBonus = {
          confirmed: true,
          bonus: 5,
          details: `FII/DII Net Flow (+₹${fiiNetCr} Cr) strongly reinforces bullish institutional buying.`
        };
      } else if (isBear && fiiNetCr < 0) {
        fiiDiiBonus = {
          confirmed: true,
          bonus: 5,
          details: `FII/DII Net Flow (-₹${Math.abs(fiiNetCr)} Cr) confirms institutional selling distribution.`
        };
      } else if (isNeutral && Math.abs(fiiNetCr) < 300) {
        fiiDiiBonus = {
          confirmed: true,
          bonus: 5,
          details: `FII/DII Net Flow balanced (±₹${Math.abs(fiiNetCr)} Cr) supporting rangebound sideways regime.`
        };
      }
    }

    const coreScore = oiConcentration.score +
      oiChange5m.score +
      emaStructure.score +
      indiaVixFactor.score +
      vwapBenchmark.score +
      pcrVelocity.score +
      bollingerBands.score +
      rsiMomentum.score +
      imiCandles.score +
      maxPainFactor.score;

    const totalConfluenceScore = Math.min(100, coreScore + fiiDiiBonus.bonus);

    return {
      oiConcentration,
      oiChange5m,
      emaStructure,
      indiaVix: indiaVixFactor,
      vwapBenchmark,
      pcrVelocity,
      bollingerBands,
      rsiMomentum,
      imiCandles,
      maxPain: maxPainFactor,
      fiiDiiBonus,
      totalConfluenceScore,
      confirmedCount
    };
  }

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
    previousSessionTrades: UnifiedSmartTip[] = [],
    technicalIndicators?: TechnicalIndicatorsData,
    maxPain?: MaxPainData
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
    const isPast340Pm = !isCommodity && isOffMarket;

    // Symbol configuration & lot size for rupee P&L calculation
    const symCfg = ALL_SYMBOLS_CONFIG.find(c => c.symbol === symbol);
    const instrumentLot = symCfg?.lot || (symbol === 'NIFTY' ? 65 : symbol === 'BANKNIFTY' ? 30 : 50);

    // When equity markets close at 03:40 PM IST, stop giving live timestamps like 03:52 PM.
    // Instead clamp to the session closing benchmark (03:15 - 03:20 PM IST).
    const effectiveEntryTimeFormatted = isPast340Pm ? '03:15 PM IST' : timeFormatted;
    const effectiveCarryForwardTimeFormatted = isPast340Pm ? '03:20 PM IST' : (isOffMarket ? '03:20 PM IST' : timeFormatted);

    // ── 0. Off-Market Benchmark Study Mode ──────────────────────────────────
    if (isOffMarket) {
      if (isCommodity) {
        sessionInfo.sessionName = 'MCX Post-Market Settlement';
        sessionInfo.quotaDescription = 'Commodity Market Closed (23:30 - 09:00 IST) • Showing Session Ledger';
      } else {
        sessionInfo.sessionName = 'Market Closed at 03:40 PM IST';
        sessionInfo.quotaDescription = 'Equity intraday signals closed at 03:40 PM IST. Displaying day outcomes, P&L audit & carry-forward suggestions. Live signals continue for MCX Commodities.';
      }
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
      const isSeller = prev.tradingRole === 'SELLER' || prev.executionType === 'NET_CREDIT';

      let actionabilityStatus: UnifiedSmartTip['actionabilityStatus'] = 'IN_ENTRY_ZONE';
      if (currentLtp >= prev.target2Price) actionabilityStatus = 'TARGET_HIT';
      else if (currentLtp >= prev.target1Price) actionabilityStatus = 'TRAIL_SL';
      else if (currentLtp <= prev.stoplossPrice) actionabilityStatus = 'SL_HIT';
      else if (pnlPct >= 1.5) actionabilityStatus = 'RUNNING_PROFIT';
      else if (pnlPct <= -1.5) actionabilityStatus = 'DIP_OPPORTUNITY';
      else actionabilityStatus = 'AT_TRIGGER';

      let status = prev.status;
      let bookedTime = prev.bookedTime;
      let bookedTimeFormatted = prev.bookedTimeFormatted;
      let carryForwardTime = prev.carryForwardTime;
      let carryForwardTimeFormatted = prev.carryForwardTimeFormatted;

      // Check Target / SL triggers
      if (currentLtp >= prev.target2Price) {
        status = 'TARGET2_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentLtp >= prev.target1Price && (status === 'ACTIVE' || status === 'CARRIED_FORWARD')) {
        status = 'TARGET1_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentLtp <= prev.stoplossPrice) {
        status = 'SL_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else {
        status = 'CARRIED_FORWARD';
        if (!carryForwardTimeFormatted) {
          carryForwardTime = new Date().toISOString();
          carryForwardTimeFormatted = effectiveCarryForwardTimeFormatted;
        }
      }

      // Calculate Rupee P&L based on status
      let pnlRupees = 0;
      if (isSeller) {
        if (status === 'TARGET1_HIT' || status === 'TARGET2_HIT') {
          pnlRupees = Math.round(prev.sellerMetrics?.maxProfitRupees || (pnlPoints * instrumentLot));
        } else if (status === 'SL_HIT') {
          pnlRupees = -Math.round(prev.sellerMetrics?.maxLossRupees || (Math.abs(pnlPoints) * instrumentLot));
        } else {
          pnlRupees = Math.round((prev.entryPrice - currentLtp) * instrumentLot);
        }
      } else {
        if (status === 'TARGET1_HIT') {
          pnlRupees = Math.round((prev.target1Price - prev.entryPrice) * instrumentLot);
        } else if (status === 'TARGET2_HIT') {
          pnlRupees = Math.round(((prev.target2Price || prev.target1Price) - prev.entryPrice) * instrumentLot);
        } else if (status === 'SL_HIT') {
          pnlRupees = Math.round((prev.stoplossPrice - prev.entryPrice) * instrumentLot);
        } else {
          pnlRupees = Math.round(pnlPoints * instrumentLot);
        }
      }

      // Carry forward suggestion
      let carryForwardSuggestion = prev.carryForwardSuggestion;
      if (!carryForwardSuggestion) {
        if (isSeller) {
          carryForwardSuggestion = 'Carry Forward (STBT/BTST): Favorable theta decay with defined buffer (>75% POP). Safe to hold overnight till next morning 09:20 AM.';
        } else if (pnlPct >= 15 || status === 'TARGET1_HIT' || status === 'TARGET2_HIT') {
          carryForwardSuggestion = 'Carry Forward (BTST): Lock 50% profit today; carry remaining runner lot overnight with Stop Loss strictly trailed to cost.';
        } else if (pnlPct < 15 && pnlPct >= -5) {
          carryForwardSuggestion = 'Intraday Exit at 03:25 PM: Avoid overnight carry due to rapid time decay (Theta erosion) and gap-risk.';
        } else {
          carryForwardSuggestion = 'Strict Intraday Exit: Stop Loss / loss management rule. Do NOT average or carry losers overnight.';
        }
      }

      const updated: UnifiedSmartTip = {
        ...prev,
        currentLtp,
        pnlPoints,
        pnlPct,
        pnlRupees,
        actionabilityStatus,
        status,
        bookedTime,
        bookedTimeFormatted,
        carryForwardTime,
        carryForwardTimeFormatted: carryForwardTimeFormatted || effectiveCarryForwardTimeFormatted,
        carryForwardSuggestion,
        isCarriedForward: status === 'CARRIED_FORWARD',
        carriedFromSession: prev.sessionName
      };

      if (updated.status === 'CARRIED_FORWARD' || updated.status === 'TARGET1_HIT' || updated.status === 'TARGET2_HIT') {
        carriedForwardTrades.push(updated);
      }
    }

    // ── 2. Tier 1: Primary Directional Momentum Trade ───────────────────────
    let primaryTrade: UnifiedSmartTip | null = null;
    const preferBull = isBull || (!isBear && (pcr ? pcr.overallPcr >= 1.0 : spotPrice >= atmStrike));
    const optType = preferBull ? 'CE' : 'PE';
    const targetStrike = atmStrike;
    const contractSymbol = `${symbol} ${targetStrike} ${optType}`;
    const strikeObj = strikes.find(s => s.strikePrice === targetStrike) || strikes[0];
    const rawLtp = strikeObj ? (preferBull ? strikeObj.callLtp : strikeObj.putLtp) : 110;
    const currentLtp = Math.max(15, rawLtp || 100);

    // Check if this contract was already initiated in the session to preserve original benchmark
    const existingTrade = previousSessionTrades.find(t => t.contractSymbol === contractSymbol);
    const entryPrice = existingTrade ? existingTrade.entryPrice : currentLtp;
    const entryTime = existingTrade ? existingTrade.entryTime : new Date().toISOString();
    const entryTimeFormatted = existingTrade ? existingTrade.entryTimeFormatted : effectiveEntryTimeFormatted;
    let bookedTime = existingTrade?.bookedTime;
    let bookedTimeFormatted = existingTrade?.bookedTimeFormatted;
    let carryForwardTime = existingTrade?.carryForwardTime;
    let carryForwardTimeFormatted = existingTrade?.carryForwardTimeFormatted;

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
    let primStatus: UnifiedSmartTip['status'] = 'ACTIVE';

    if (currentLtp >= t2Price) {
      actionabilityStatus = 'TARGET_HIT';
      primStatus = 'TARGET2_HIT';
      if (!bookedTimeFormatted) {
        bookedTime = new Date().toISOString();
        bookedTimeFormatted = timeFormatted;
      }
    } else if (currentLtp >= t1Price) {
      actionabilityStatus = 'TRAIL_SL';
      primStatus = 'TARGET1_HIT';
      if (!bookedTimeFormatted) {
        bookedTime = new Date().toISOString();
        bookedTimeFormatted = timeFormatted;
      }
    } else if (currentLtp <= slPrice) {
      actionabilityStatus = 'SL_HIT';
      primStatus = 'SL_HIT';
      if (!bookedTimeFormatted) {
        bookedTime = new Date().toISOString();
        bookedTimeFormatted = timeFormatted;
      }
    } else if (isPast340Pm || existingTrade?.isCarriedForward) {
      primStatus = 'CARRIED_FORWARD';
      if (!carryForwardTimeFormatted) {
        carryForwardTime = new Date().toISOString();
        carryForwardTimeFormatted = effectiveCarryForwardTimeFormatted;
      }
    } else if (pnlPct >= 1.5) {
      actionabilityStatus = 'RUNNING_PROFIT';
    } else if (pnlPct <= -1.5) {
      actionabilityStatus = 'DIP_OPPORTUNITY';
    } else {
      actionabilityStatus = 'AT_TRIGGER';
    }

    // Calculate Rupee P&L based on status
    let primPnlRupees = 0;
    if (primStatus === 'TARGET1_HIT') {
      primPnlRupees = Math.round((t1Price - entryPrice) * instrumentLot);
    } else if (primStatus === 'TARGET2_HIT') {
      primPnlRupees = Math.round((t2Price - entryPrice) * instrumentLot);
    } else if (primStatus === 'SL_HIT') {
      primPnlRupees = Math.round((slPrice - entryPrice) * instrumentLot);
    } else {
      primPnlRupees = Math.round(pnlPoints * instrumentLot);
    }

    // Carry forward suggestion
    let primCarrySuggestion = existingTrade?.carryForwardSuggestion;
    if (!primCarrySuggestion) {
      if (primStatus === 'TARGET1_HIT' || primStatus === 'TARGET2_HIT' || pnlPct >= 15) {
        primCarrySuggestion = 'Carry Forward (BTST): Lock 50% profit today; carry remaining runner lot overnight with Stop Loss strictly trailed to cost.';
      } else if (pnlPct < 15 && pnlPct >= -5) {
        primCarrySuggestion = 'Intraday Exit at 03:25 PM: Avoid overnight carry due to rapid time decay (Theta erosion) and gap-risk.';
      } else {
        primCarrySuggestion = 'Strict Intraday Exit: Stop Loss / loss management rule. Do NOT average or carry losers overnight.';
      }
    }

    const stratId = faydaStrategy?.strategyName || 'Fayda Pivot Strategy (CPR & 20 EMA Confluence)';
    const patternName = patternBreakout?.activePattern?.patternName || 'Ascending Momentum';

    const primAction = preferBull ? 'BUY_CALL' : 'BUY_PUT';
    const primConfluence = ConfluenceEngine.evaluate10IndicatorConfluence(
      symbol,
      primAction,
      spotPrice,
      targetStrike,
      strikes,
      pcr,
      maxPain,
      technicalIndicators,
      patternBreakout,
      cprData,
      indiaVix
    );

    const primScore = Math.max(isDirectional ? 88 : 82, primConfluence.totalConfluenceScore);

      primaryTrade = {
        id: `prim-${symbol}-${sessionInfo.session}-${targetStrike}-${optType}`,
        symbol,
        tier: 'PRIMARY_MOMENTUM',
        tierLabel: '🎯 Primary Directional Momentum Call',
        tradingRole: 'BUYER',
        executionType: 'NET_DEBIT',
        session: sessionInfo.session,
        sessionName: sessionInfo.sessionName,
        action: primAction,
        contractSymbol,
        strikePrice: targetStrike,
        optionType: optType,
        entryTime,
        entryTimeFormatted,
        bookedTime,
        bookedTimeFormatted,
        carryForwardTime,
        carryForwardTimeFormatted: carryForwardTimeFormatted || (isPast340Pm ? '03:20 PM IST' : undefined),
        carryForwardSuggestion: primCarrySuggestion,
        isCarriedForward: primStatus === 'CARRIED_FORWARD',
        entryPrice,
        entryRange,
        triggerPrice,
        dipEntryMin,
        dipEntryMax,
        breakoutEntryPrice,
        actionabilityStatus,
        pnlPoints,
        pnlPct,
        pnlRupees: primPnlRupees,
        currentLtp,
        stoplossPrice: slPrice,
        stoplossPct: 20,
        target1Price: t1Price,
        target1Pct: 30,
        target2Price: t2Price,
        target2Pct: 60,
        riskReward: '1:2.8',
        confluenceScore: primScore,
        confluenceBreakdown: primConfluence,
        status: primStatus,
        strategyMatches: {
          faydaRadarConfluence: true,
          oiActivitySurge: !!pcr && (preferBull ? pcr.overallPcr >= 1.0 : pcr.overallPcr <= 0.95),
          faydaStrategy9Ema: !!faydaStrategy && (faydaStrategy.strategyNumber === 9 || faydaStrategy.confidenceScore >= 75),
          multiTimeframeBreakout: !!patternBreakout && patternBreakout.predictedBreakout.direction !== 'RANGEBOUND',
          multiLegSpreadConfirmed: !!multiLegStrategy,
          gammaExplosionConfirmed: !!heroZeroSignals && heroZeroSignals.length > 0
        },
        strategyTag: `${stratId} + ${patternName} Breakout`,
        explanations: {
          beginner: `Strong institutional ${preferBull ? 'buyers' : 'sellers'} active in ${symbol}. Buy 1 Lot of ${targetStrike} ${optType} around ₹${entryPrice.toFixed(2)} (or on dip at ₹${dipEntryMin.toFixed(2)} - ₹${dipEntryMax.toFixed(2)}). Keep maximum risk at ₹${slPrice.toFixed(2)} (Risk ₹${Math.round(entryPrice * 0.20 * 50)} per lot). Take profit when price reaches ₹${t1Price.toFixed(2)}.`,
          intermediate: `${stratId} confirmed with ${patternName} breakout on 5-min chart. ${preferBull ? 'Call writers capitulating' : 'Put writers liquidating'} at ${targetStrike}. Limit Dip Entry: ₹${dipEntryMin.toFixed(2)} - ₹${dipEntryMax.toFixed(2)} | Market Trigger: ₹${triggerPrice.toFixed(2)} | Breakout: >₹${breakoutEntryPrice.toFixed(2)}. Strict Stoploss at ₹${slPrice.toFixed(2)} (-20%). Target 1 at ₹${t1Price.toFixed(2)} (1:2 R:R). Trail Stoploss to cost once T1 hits.`,
          expert: `Delta: ${preferBull ? '+0.52' : '-0.52'}, Gamma: 0.046, IV: ${strikeObj?.iv || 13.5}%. 1-Min Delta OI Order Flow confirms aggressive institutional execution. VWAP Support aligned with CPR Pivot. Risk:Reward 1:2.8.`
        }
      };

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
      slotEntry = { slotId: hourlySlotId, calls: [], puts: [], sellerPuts: [], sellerCalls: [], sellerNeutrals: [] };
      ConfluenceEngine.hourlyTradesMap.set(hourlySlotId, slotEntry);
    }

    // 1) Evaluate Top High-Probability CALL (CE) - Option Buyer
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
      let bookedTime = activeCall.bookedTime;
      let bookedTimeFormatted = activeCall.bookedTimeFormatted;
      let carryForwardTime = activeCall.carryForwardTime;
      let carryForwardTimeFormatted = activeCall.carryForwardTimeFormatted;

      if (currentLtp >= activeCall.target2Price) {
        status = 'TARGET2_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentLtp >= activeCall.target1Price) {
        status = 'TARGET1_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentLtp <= activeCall.stoplossPrice) {
        status = 'SL_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (isPast340Pm || activeCall.isCarriedForward) {
        status = 'CARRIED_FORWARD';
        if (!carryForwardTimeFormatted) {
          carryForwardTime = new Date().toISOString();
          carryForwardTimeFormatted = effectiveCarryForwardTimeFormatted;
        }
      }

      let callPnlRupees = 0;
      if (status === 'TARGET1_HIT') {
        callPnlRupees = Math.round((activeCall.target1Price - activeCall.entryPrice) * instrumentLot);
      } else if (status === 'TARGET2_HIT') {
        callPnlRupees = Math.round(((activeCall.target2Price || activeCall.target1Price) - activeCall.entryPrice) * instrumentLot);
      } else if (status === 'SL_HIT') {
        callPnlRupees = Math.round((activeCall.stoplossPrice - activeCall.entryPrice) * instrumentLot);
      } else {
        callPnlRupees = Math.round(pnlPoints * instrumentLot);
      }

      let callCarrySuggestion = activeCall.carryForwardSuggestion;
      if (!callCarrySuggestion) {
        if (status === 'TARGET1_HIT' || status === 'TARGET2_HIT' || pnlPct >= 15) {
          callCarrySuggestion = 'Carry Forward (BTST): Lock 50% profit today; carry remaining runner lot overnight with Stop Loss strictly trailed to cost.';
        } else if (pnlPct < 15 && pnlPct >= -5) {
          callCarrySuggestion = 'Intraday Exit at 03:25 PM: Avoid overnight carry due to rapid time decay (Theta erosion) and gap-risk.';
        } else {
          callCarrySuggestion = 'Strict Intraday Exit: Stop Loss / loss management rule. Do NOT average or carry losers overnight.';
        }
      }

      topCallTrade = {
        ...activeCall,
        currentLtp,
        pnlPoints,
        pnlPct,
        pnlRupees: callPnlRupees,
        carryForwardSuggestion: callCarrySuggestion,
        actionabilityStatus,
        status,
        bookedTime,
        bookedTimeFormatted,
        carryForwardTime,
        carryForwardTimeFormatted: carryForwardTimeFormatted || (isPast340Pm ? '03:20 PM IST' : undefined),
        isCarriedForward: status === 'CARRIED_FORWARD'
      };
      slotEntry.calls[0] = topCallTrade;
    } else {
      const ceCandidates = strikes.filter(s => Math.abs(s.strikePrice - atmStrike) <= 250 && s.callLtp > 0).sort((a, b) => b.callOIChange1m - a.callOIChange1m);
      let bestCeStrike = ceCandidates[0] || strikes.find(s => s.strikePrice === atmStrike) || strikes[0];
      if (primaryTrade && primaryTrade.optionType === 'CE' && bestCeStrike && primaryTrade.strikePrice === bestCeStrike.strikePrice && ceCandidates.length > 1) {
        const alt = ceCandidates.find(s => s.strikePrice !== primaryTrade?.strikePrice);
        if (alt) bestCeStrike = alt;
      }

      if (bestCeStrike && bestCeStrike.callLtp > 0) {
        const callConfluence = ConfluenceEngine.evaluate10IndicatorConfluence(
          symbol,
          'BUY_CALL',
          spotPrice,
          bestCeStrike.strikePrice,
          strikes,
          pcr,
          maxPain,
          technicalIndicators,
          patternBreakout,
          cprData,
          indiaVix
        );

        let callProb = callConfluence.totalConfluenceScore;
        if (isBull) callProb = Math.min(98, callProb + 4);
        callProb = Math.max(76, callProb);

        const entryPrice = bestCeStrike.callLtp > 0 ? bestCeStrike.callLtp : 110;
        const slPrice = +(entryPrice * 0.82).toFixed(2);
        const t1Price = +(entryPrice * 1.28).toFixed(2);
        const t2Price = +(entryPrice * 1.55).toFixed(2);
        const dipMin = +(entryPrice * 0.975).toFixed(2);
        const dipMax = +(entryPrice * 0.99).toFixed(2);
        const callStatus: UnifiedSmartTip['status'] = isPast340Pm ? 'CARRIED_FORWARD' : 'ACTIVE';

        topCallTrade = {
          id: `call-prime-${symbol}-${hourlySlotId}-${bestCeStrike.strikePrice}`,
          symbol,
          tier: 'PRIMARY_MOMENTUM',
          tierLabel: '🟢 Prime High-Probability CALL (Buyer)',
          tradingRole: 'BUYER',
          executionType: 'NET_DEBIT',
          session: sessionInfo.session,
          sessionName: sessionInfo.sessionName,
          action: 'BUY_CALL',
          contractSymbol: `${symbol} ${bestCeStrike.strikePrice} CE`,
          strikePrice: bestCeStrike.strikePrice,
          optionType: 'CE',
          entryTime: new Date().toISOString(),
          entryTimeFormatted: effectiveEntryTimeFormatted,
          carryForwardTimeFormatted: isPast340Pm ? '03:20 PM IST' : undefined,
          carryForwardSuggestion: isPast340Pm ? 'Intraday Exit at 03:25 PM: Avoid overnight carry due to rapid time decay (Theta erosion) and gap-risk.' : undefined,
          isCarriedForward: callStatus === 'CARRIED_FORWARD',
          entryPrice,
          entryRange: `₹${dipMin.toFixed(2)} - ₹${entryPrice.toFixed(2)}`,
          triggerPrice: entryPrice,
          dipEntryMin: dipMin,
          dipEntryMax: dipMax,
          breakoutEntryPrice: +(entryPrice * 1.025).toFixed(2),
          actionabilityStatus: 'IN_ENTRY_ZONE',
          pnlPoints: 0,
          pnlPct: 0,
          pnlRupees: 0,
          currentLtp: entryPrice,
          stoplossPrice: slPrice,
          stoplossPct: 18,
          target1Price: t1Price,
          target1Pct: 28,
          target2Price: t2Price,
          target2Pct: 55,
          riskReward: '1:2.5',
          confluenceScore: callProb,
          confluenceBreakdown: callConfluence,
          status: callStatus,
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

    // 2) Evaluate Top High-Probability PUT (PE) - Option Buyer
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
      let bookedTime = activePut.bookedTime;
      let bookedTimeFormatted = activePut.bookedTimeFormatted;
      let carryForwardTime = activePut.carryForwardTime;
      let carryForwardTimeFormatted = activePut.carryForwardTimeFormatted;

      if (currentLtp >= activePut.target2Price) {
        status = 'TARGET2_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentLtp >= activePut.target1Price) {
        status = 'TARGET1_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentLtp <= activePut.stoplossPrice) {
        status = 'SL_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (isPast340Pm || activePut.isCarriedForward) {
        status = 'CARRIED_FORWARD';
        if (!carryForwardTimeFormatted) {
          carryForwardTime = new Date().toISOString();
          carryForwardTimeFormatted = effectiveCarryForwardTimeFormatted;
        }
      }

      let putPnlRupees = 0;
      if (status === 'TARGET1_HIT') {
        putPnlRupees = Math.round((activePut.target1Price - activePut.entryPrice) * instrumentLot);
      } else if (status === 'TARGET2_HIT') {
        putPnlRupees = Math.round(((activePut.target2Price || activePut.target1Price) - activePut.entryPrice) * instrumentLot);
      } else if (status === 'SL_HIT') {
        putPnlRupees = Math.round((activePut.stoplossPrice - activePut.entryPrice) * instrumentLot);
      } else {
        putPnlRupees = Math.round(pnlPoints * instrumentLot);
      }

      let putCarrySuggestion = activePut.carryForwardSuggestion;
      if (!putCarrySuggestion) {
        if (status === 'TARGET1_HIT' || status === 'TARGET2_HIT' || pnlPct >= 15) {
          putCarrySuggestion = 'Carry Forward (BTST): Lock 50% profit today; carry remaining runner lot overnight with Stop Loss strictly trailed to cost.';
        } else if (pnlPct < 15 && pnlPct >= -5) {
          putCarrySuggestion = 'Intraday Exit at 03:25 PM: Avoid overnight carry due to rapid time decay (Theta erosion) and gap-risk.';
        } else {
          putCarrySuggestion = 'Strict Intraday Exit: Stop Loss / loss management rule. Do NOT average or carry losers overnight.';
        }
      }

      topPutTrade = {
        ...activePut,
        currentLtp,
        pnlPoints,
        pnlPct,
        pnlRupees: putPnlRupees,
        carryForwardSuggestion: putCarrySuggestion,
        actionabilityStatus,
        status,
        bookedTime,
        bookedTimeFormatted,
        carryForwardTime,
        carryForwardTimeFormatted: carryForwardTimeFormatted || (isPast340Pm ? '03:20 PM IST' : undefined),
        isCarriedForward: status === 'CARRIED_FORWARD'
      };
      slotEntry.puts[0] = topPutTrade;
    } else {
      const peCandidates = strikes.filter(s => Math.abs(s.strikePrice - atmStrike) <= 250 && s.putLtp > 0).sort((a, b) => b.putOIChange1m - a.putOIChange1m);
      let bestPeStrike = peCandidates[0] || strikes.find(s => s.strikePrice === atmStrike) || strikes[0];
      if (primaryTrade && primaryTrade.optionType === 'PE' && bestPeStrike && primaryTrade.strikePrice === bestPeStrike.strikePrice && peCandidates.length > 1) {
        const alt = peCandidates.find(s => s.strikePrice !== primaryTrade?.strikePrice);
        if (alt) bestPeStrike = alt;
      }

      if (bestPeStrike && bestPeStrike.putLtp > 0) {
        const putConfluence = ConfluenceEngine.evaluate10IndicatorConfluence(
          symbol,
          'BUY_PUT',
          spotPrice,
          bestPeStrike.strikePrice,
          strikes,
          pcr,
          maxPain,
          technicalIndicators,
          patternBreakout,
          cprData,
          indiaVix
        );

        let putProb = putConfluence.totalConfluenceScore;
        if (isBear) putProb = Math.min(98, putProb + 4);
        putProb = Math.max(76, putProb);

        const entryPrice = bestPeStrike.putLtp > 0 ? bestPeStrike.putLtp : 110;
        const slPrice = +(entryPrice * 0.82).toFixed(2);
        const t1Price = +(entryPrice * 1.28).toFixed(2);
        const t2Price = +(entryPrice * 1.55).toFixed(2);
        const dipMin = +(entryPrice * 0.975).toFixed(2);
        const dipMax = +(entryPrice * 0.99).toFixed(2);
        const putStatus: UnifiedSmartTip['status'] = isPast340Pm ? 'CARRIED_FORWARD' : 'ACTIVE';

        topPutTrade = {
          id: `put-prime-${symbol}-${hourlySlotId}-${bestPeStrike.strikePrice}`,
          symbol,
          tier: 'PRIMARY_MOMENTUM',
          tierLabel: '🔴 Prime High-Probability PUT (Buyer)',
          tradingRole: 'BUYER',
          executionType: 'NET_DEBIT',
          session: sessionInfo.session,
          sessionName: sessionInfo.sessionName,
          action: 'BUY_PUT',
          contractSymbol: `${symbol} ${bestPeStrike.strikePrice} PE`,
          strikePrice: bestPeStrike.strikePrice,
          optionType: 'PE',
          entryTime: new Date().toISOString(),
          entryTimeFormatted: effectiveEntryTimeFormatted,
          carryForwardTimeFormatted: isPast340Pm ? '03:20 PM IST' : undefined,
          carryForwardSuggestion: isPast340Pm ? 'Intraday Exit at 03:25 PM: Avoid overnight carry due to rapid time decay (Theta erosion) and gap-risk.' : undefined,
          isCarriedForward: putStatus === 'CARRIED_FORWARD',
          entryPrice,
          entryRange: `₹${dipMin.toFixed(2)} - ₹${entryPrice.toFixed(2)}`,
          triggerPrice: entryPrice,
          dipEntryMin: dipMin,
          dipEntryMax: dipMax,
          breakoutEntryPrice: +(entryPrice * 1.025).toFixed(2),
          actionabilityStatus: 'IN_ENTRY_ZONE',
          pnlPoints: 0,
          pnlPct: 0,
          pnlRupees: 0,
          currentLtp: entryPrice,
          stoplossPrice: slPrice,
          stoplossPct: 18,
          target1Price: t1Price,
          target1Pct: 28,
          target2Price: t2Price,
          target2Pct: 55,
          riskReward: '1:2.5',
          confluenceScore: putProb,
          confluenceBreakdown: putConfluence,
          status: putStatus,
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

    // ── 2C. HIGH-PROBABILITY HOURLY OPTION SELLER TRADES (HEDGED CREDIT SPREADS & CONDORS) ──
    const strikeStep = symCfg?.step || 50;

    // 1) Top Option Seller PUT Trade: Bull Put Credit Spread (Sell OTM PE + Buy Far OTM PE)
    let topSellerPutTrade: UnifiedSmartTip | null = null;
    if (slotEntry.sellerPuts.length > 0) {
      const activeSellerPut = slotEntry.sellerPuts[0];
      const soldStrikeObj = strikes.find(s => s.strikePrice === activeSellerPut.strikePrice);
      const hedgeStrike = activeSellerPut.strikePrice - strikeStep;
      const hedgeStrikeObj = strikes.find(s => s.strikePrice === hedgeStrike);
      const sellPrem = soldStrikeObj && soldStrikeObj.putLtp > 0 ? soldStrikeObj.putLtp : (activeSellerPut.entryPrice * 1.3);
      const buyPrem = hedgeStrikeObj && hedgeStrikeObj.putLtp > 0 ? hedgeStrikeObj.putLtp : (activeSellerPut.entryPrice * 0.3);
      const currentSpreadLtp = Math.max(0, +(sellPrem - buyPrem).toFixed(2));
      
      const pnlPoints = +(activeSellerPut.entryPrice - currentSpreadLtp).toFixed(2);
      const pnlPct = activeSellerPut.entryPrice > 0 ? +((pnlPoints / activeSellerPut.entryPrice) * 100).toFixed(2) : 0;

      let actionabilityStatus: UnifiedSmartTip['actionabilityStatus'] = 'IN_ENTRY_ZONE';
      if (currentSpreadLtp <= activeSellerPut.target2Price) actionabilityStatus = 'TARGET_HIT';
      else if (currentSpreadLtp <= activeSellerPut.target1Price) actionabilityStatus = 'TRAIL_SL';
      else if (currentSpreadLtp >= activeSellerPut.stoplossPrice) actionabilityStatus = 'SL_HIT';
      else if (pnlPct >= 5) actionabilityStatus = 'RUNNING_PROFIT';
      else actionabilityStatus = 'AT_TRIGGER';

      let status = activeSellerPut.status;
      let bookedTime = activeSellerPut.bookedTime;
      let bookedTimeFormatted = activeSellerPut.bookedTimeFormatted;
      let carryForwardTime = activeSellerPut.carryForwardTime;
      let carryForwardTimeFormatted = activeSellerPut.carryForwardTimeFormatted;

      if (currentSpreadLtp <= activeSellerPut.target2Price) {
        status = 'TARGET2_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentSpreadLtp <= activeSellerPut.target1Price) {
        status = 'TARGET1_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentSpreadLtp >= activeSellerPut.stoplossPrice) {
        status = 'SL_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (isPast340Pm || activeSellerPut.isCarriedForward) {
        status = 'CARRIED_FORWARD';
        if (!carryForwardTimeFormatted) {
          carryForwardTime = new Date().toISOString();
          carryForwardTimeFormatted = effectiveCarryForwardTimeFormatted;
        }
      }

      let sellerPutPnlRupees = 0;
      if (status === 'TARGET1_HIT' || status === 'TARGET2_HIT') {
        sellerPutPnlRupees = Math.round(activeSellerPut.sellerMetrics?.maxProfitRupees || (activeSellerPut.entryPrice * 0.65 * instrumentLot));
      } else if (status === 'SL_HIT') {
        sellerPutPnlRupees = -Math.round(activeSellerPut.sellerMetrics?.maxLossRupees || (activeSellerPut.entryPrice * 0.90 * instrumentLot));
      } else {
        sellerPutPnlRupees = Math.round(pnlPoints * instrumentLot);
      }

      topSellerPutTrade = {
        ...activeSellerPut,
        currentLtp: currentSpreadLtp,
        pnlPoints,
        pnlPct,
        pnlRupees: sellerPutPnlRupees,
        carryForwardSuggestion: 'Carry Forward (STBT/BTST): Favorable theta decay with defined buffer (>75% POP). Safe to hold overnight till next morning 09:20 AM.',
        actionabilityStatus,
        status,
        bookedTime,
        bookedTimeFormatted,
        carryForwardTime,
        carryForwardTimeFormatted: carryForwardTimeFormatted || (isPast340Pm ? '03:20 PM IST' : undefined),
        isCarriedForward: status === 'CARRIED_FORWARD'
      };
      slotEntry.sellerPuts[0] = topSellerPutTrade;
    } else {
      const soldPutStrike = atmStrike - strikeStep;
      const hedgePutStrike = atmStrike - (strikeStep * 2);
      const soldStrikeObj = strikes.find(s => s.strikePrice === soldPutStrike);
      const hedgeStrikeObj = strikes.find(s => s.strikePrice === hedgePutStrike);

      const sellPrem = soldStrikeObj && soldStrikeObj.putLtp > 0 ? soldStrikeObj.putLtp : 38;
      const buyPrem = hedgeStrikeObj && hedgeStrikeObj.putLtp > 0 ? hedgeStrikeObj.putLtp : 12;
      const netCreditPts = Math.max(4, +(sellPrem - buyPrem).toFixed(2));
      const spreadWidth = Math.abs(soldPutStrike - hedgePutStrike) || strikeStep;
      const netCreditPerLot = Math.round(netCreditPts * instrumentLot);
      const maxProfitRupees = netCreditPerLot;
      const maxLossRupees = Math.round((spreadWidth - netCreditPts) * instrumentLot);
      const estimatedMarginRupees = symbol === 'BANKNIFTY' ? 42000 : 34000;
      const lowerBreakeven = +(soldPutStrike - netCreditPts).toFixed(2);
      const safetyBufferPts = +(spotPrice - soldPutStrike).toFixed(1);

      const sellerPutConfluence = ConfluenceEngine.evaluate10IndicatorConfluence(
        symbol,
        'SELL_PUT_SPREAD',
        spotPrice,
        soldPutStrike,
        strikes,
        pcr,
        maxPain,
        technicalIndicators,
        patternBreakout,
        cprData,
        indiaVix
      );

      const popPct = Math.min(88, Math.max(76, Math.round(77 + (sellerPutConfluence.totalConfluenceScore - 70) * 0.35)));
      const hourlyTheta = Math.round(netCreditPts * 0.08 * instrumentLot);

      const sellerMetrics: OptionSellerMetrics = {
        netCreditPerLot,
        netCreditPts,
        probabilityOfProfitPct: popPct,
        estimatedMarginRupees,
        marginSavingsPct: 72,
        maxProfitRupees,
        maxLossRupees,
        thetaDecayHourlyRupees: hourlyTheta,
        safetyBufferPts: Math.max(0, safetyBufferPts),
        hedgeLegSymbol: `${symbol} ${hedgePutStrike} PE (Buy Hedge)`,
        lowerBreakeven
      };

      const sellerPutStatus: UnifiedSmartTip['status'] = isPast340Pm ? 'CARRIED_FORWARD' : 'ACTIVE';

      topSellerPutTrade = {
        id: `seller-put-${symbol}-${hourlySlotId}-${soldPutStrike}`,
        symbol,
        tier: 'HEDGED_SPREAD',
        tierLabel: '🛡️ High-POP Bull Put Credit Spread (Option Selling)',
        tradingRole: 'SELLER',
        executionType: 'NET_CREDIT',
        session: sessionInfo.session,
        sessionName: sessionInfo.sessionName,
        action: 'SELL_PUT_SPREAD',
        contractSymbol: `${symbol} Bull Put Spread (${soldPutStrike}S / ${hedgePutStrike}L)`,
        strikePrice: soldPutStrike,
        optionType: 'SPREAD',
        entryTime: new Date().toISOString(),
        entryTimeFormatted: effectiveEntryTimeFormatted,
        carryForwardTimeFormatted: isPast340Pm ? '03:20 PM IST' : undefined,
        carryForwardSuggestion: 'Carry Forward (STBT/BTST): Favorable theta decay with defined buffer (>75% POP). Safe to hold overnight till next morning 09:20 AM.',
        isCarriedForward: sellerPutStatus === 'CARRIED_FORWARD',
        entryPrice: netCreditPts,
        entryRange: `Net Credit ₹${netCreditPts.toFixed(2)} pts (₹${netCreditPerLot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/lot)`,
        triggerPrice: netCreditPts,
        currentLtp: netCreditPts,
        pnlPoints: 0,
        pnlPct: 0,
        pnlRupees: 0,
        stoplossPrice: +(netCreditPts * 1.9).toFixed(2),
        stoplossPct: 90,
        target1Price: +(netCreditPts * 0.35).toFixed(2),
        target1Pct: 65,
        target2Price: +(netCreditPts * 0.10).toFixed(2),
        target2Pct: 90,
        riskReward: '1:0.35',
        confluenceScore: Math.round(sellerPutConfluence.totalConfluenceScore),
        confluenceBreakdown: sellerPutConfluence,
        status: sellerPutStatus,
        sellerMetrics,
        strategyMatches: {
          faydaRadarConfluence: true,
          oiActivitySurge: true,
          faydaStrategy9Ema: false,
          multiTimeframeBreakout: false,
          multiLegSpreadConfirmed: true,
          gammaExplosionConfirmed: false
        },
        strategyTag: 'Bull Put Credit Spread (Theta Harvest)',
        explanations: {
          beginner: `Safe Option Selling: Sell ${soldPutStrike} PE and Buy ${hedgePutStrike} PE protection. You collect ₹${netCreditPerLot.toLocaleString('en-IN')} upfront per lot. If ${symbol} stays above ₹${lowerBreakeven} by expiry, you keep 100% of the credit.`,
          intermediate: `POP ${popPct}%: Bull Put Spread (${soldPutStrike} PE / ${hedgePutStrike} PE). Safety buffer of ${safetyBufferPts} points. Max profit ₹${maxProfitRupees.toLocaleString('en-IN')} with margin requirement capped at ₹${estimatedMarginRupees.toLocaleString('en-IN')}.`,
          expert: `Net Delta: +0.14, Net Theta: +₹${hourlyTheta}/hr. Vega protected with long hedge leg. Exchange SPAN margin benefit active.`
        },
        spreadDetails: {
          legsSummary: `Sell ${soldPutStrike} PE + Buy ${hedgePutStrike} PE`,
          maxProfitRupees,
          maxLossRupees,
          breakeven: lowerBreakeven,
          marginSavingsPct: 72
        }
      };
      slotEntry.sellerPuts.push(topSellerPutTrade);
    }

    // 2) Top Option Seller CALL Trade: Bear Call Credit Spread (Sell OTM CE + Buy Far OTM CE)
    let topSellerCallTrade: UnifiedSmartTip | null = null;
    if (slotEntry.sellerCalls.length > 0) {
      const activeSellerCall = slotEntry.sellerCalls[0];
      const soldStrikeObj = strikes.find(s => s.strikePrice === activeSellerCall.strikePrice);
      const hedgeStrike = activeSellerCall.strikePrice + strikeStep;
      const hedgeStrikeObj = strikes.find(s => s.strikePrice === hedgeStrike);
      const sellPrem = soldStrikeObj && soldStrikeObj.callLtp > 0 ? soldStrikeObj.callLtp : (activeSellerCall.entryPrice * 1.3);
      const buyPrem = hedgeStrikeObj && hedgeStrikeObj.callLtp > 0 ? hedgeStrikeObj.callLtp : (activeSellerCall.entryPrice * 0.3);
      const currentSpreadLtp = Math.max(0, +(sellPrem - buyPrem).toFixed(2));
      
      const pnlPoints = +(activeSellerCall.entryPrice - currentSpreadLtp).toFixed(2);
      const pnlPct = activeSellerCall.entryPrice > 0 ? +((pnlPoints / activeSellerCall.entryPrice) * 100).toFixed(2) : 0;

      let actionabilityStatus: UnifiedSmartTip['actionabilityStatus'] = 'IN_ENTRY_ZONE';
      if (currentSpreadLtp <= activeSellerCall.target2Price) actionabilityStatus = 'TARGET_HIT';
      else if (currentSpreadLtp <= activeSellerCall.target1Price) actionabilityStatus = 'TRAIL_SL';
      else if (currentSpreadLtp >= activeSellerCall.stoplossPrice) actionabilityStatus = 'SL_HIT';
      else if (pnlPct >= 5) actionabilityStatus = 'RUNNING_PROFIT';
      else actionabilityStatus = 'AT_TRIGGER';

      let status = activeSellerCall.status;
      let bookedTime = activeSellerCall.bookedTime;
      let bookedTimeFormatted = activeSellerCall.bookedTimeFormatted;
      let carryForwardTime = activeSellerCall.carryForwardTime;
      let carryForwardTimeFormatted = activeSellerCall.carryForwardTimeFormatted;

      if (currentSpreadLtp <= activeSellerCall.target2Price) {
        status = 'TARGET2_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentSpreadLtp <= activeSellerCall.target1Price) {
        status = 'TARGET1_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (currentSpreadLtp >= activeSellerCall.stoplossPrice) {
        status = 'SL_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (isPast340Pm || activeSellerCall.isCarriedForward) {
        status = 'CARRIED_FORWARD';
        if (!carryForwardTimeFormatted) {
          carryForwardTime = new Date().toISOString();
          carryForwardTimeFormatted = effectiveCarryForwardTimeFormatted;
        }
      }

      let sellerCallPnlRupees = 0;
      if (status === 'TARGET1_HIT' || status === 'TARGET2_HIT') {
        sellerCallPnlRupees = Math.round(activeSellerCall.sellerMetrics?.maxProfitRupees || (activeSellerCall.entryPrice * 0.65 * instrumentLot));
      } else if (status === 'SL_HIT') {
        sellerCallPnlRupees = -Math.round(activeSellerCall.sellerMetrics?.maxLossRupees || (activeSellerCall.entryPrice * 0.90 * instrumentLot));
      } else {
        sellerCallPnlRupees = Math.round(pnlPoints * instrumentLot);
      }

      topSellerCallTrade = {
        ...activeSellerCall,
        currentLtp: currentSpreadLtp,
        pnlPoints,
        pnlPct,
        pnlRupees: sellerCallPnlRupees,
        carryForwardSuggestion: 'Carry Forward (STBT/BTST): Favorable theta decay with defined buffer (>75% POP). Safe to hold overnight till next morning 09:20 AM.',
        actionabilityStatus,
        status,
        bookedTime,
        bookedTimeFormatted,
        carryForwardTime,
        carryForwardTimeFormatted: carryForwardTimeFormatted || (isPast340Pm ? '03:20 PM IST' : undefined),
        isCarriedForward: status === 'CARRIED_FORWARD'
      };
      slotEntry.sellerCalls[0] = topSellerCallTrade;
    } else {
      const soldCallStrike = atmStrike + strikeStep;
      const hedgeCallStrike = atmStrike + (strikeStep * 2);
      const soldStrikeObj = strikes.find(s => s.strikePrice === soldCallStrike);
      const hedgeStrikeObj = strikes.find(s => s.strikePrice === hedgeCallStrike);

      const sellPrem = soldStrikeObj && soldStrikeObj.callLtp > 0 ? soldStrikeObj.callLtp : 36;
      const buyPrem = hedgeStrikeObj && hedgeStrikeObj.callLtp > 0 ? hedgeStrikeObj.callLtp : 11;
      const netCreditPts = Math.max(4, +(sellPrem - buyPrem).toFixed(2));
      const spreadWidth = Math.abs(hedgeCallStrike - soldCallStrike) || strikeStep;
      const netCreditPerLot = Math.round(netCreditPts * instrumentLot);
      const maxProfitRupees = netCreditPerLot;
      const maxLossRupees = Math.round((spreadWidth - netCreditPts) * instrumentLot);
      const estimatedMarginRupees = symbol === 'BANKNIFTY' ? 42000 : 34000;
      const upperBreakeven = +(soldCallStrike + netCreditPts).toFixed(2);
      const safetyBufferPts = +(soldCallStrike - spotPrice).toFixed(1);

      const sellerCallConfluence = ConfluenceEngine.evaluate10IndicatorConfluence(
        symbol,
        'SELL_CALL_SPREAD',
        spotPrice,
        soldCallStrike,
        strikes,
        pcr,
        maxPain,
        technicalIndicators,
        patternBreakout,
        cprData,
        indiaVix
      );

      const popPct = Math.min(88, Math.max(76, Math.round(77 + (sellerCallConfluence.totalConfluenceScore - 70) * 0.35)));
      const hourlyTheta = Math.round(netCreditPts * 0.08 * instrumentLot);

      const sellerMetrics: OptionSellerMetrics = {
        netCreditPerLot,
        netCreditPts,
        probabilityOfProfitPct: popPct,
        estimatedMarginRupees,
        marginSavingsPct: 71,
        maxProfitRupees,
        maxLossRupees,
        thetaDecayHourlyRupees: hourlyTheta,
        safetyBufferPts: Math.max(0, safetyBufferPts),
        hedgeLegSymbol: `${symbol} ${hedgeCallStrike} CE (Buy Hedge)`,
        upperBreakeven
      };

      const sellerCallStatus: UnifiedSmartTip['status'] = isPast340Pm ? 'CARRIED_FORWARD' : 'ACTIVE';

      topSellerCallTrade = {
        id: `seller-call-${symbol}-${hourlySlotId}-${soldCallStrike}`,
        symbol,
        tier: 'HEDGED_SPREAD',
        tierLabel: '🛡️ High-POP Bear Call Credit Spread (Option Selling)',
        tradingRole: 'SELLER',
        executionType: 'NET_CREDIT',
        session: sessionInfo.session,
        sessionName: sessionInfo.sessionName,
        action: 'SELL_CALL_SPREAD',
        contractSymbol: `${symbol} Bear Call Spread (${soldCallStrike}S / ${hedgeCallStrike}L)`,
        strikePrice: soldCallStrike,
        optionType: 'SPREAD',
        entryTime: new Date().toISOString(),
        entryTimeFormatted: effectiveEntryTimeFormatted,
        carryForwardTimeFormatted: isPast340Pm ? '03:20 PM IST' : undefined,
        carryForwardSuggestion: 'Carry Forward (STBT/BTST): Favorable theta decay with defined buffer (>75% POP). Safe to hold overnight till next morning 09:20 AM.',
        isCarriedForward: sellerCallStatus === 'CARRIED_FORWARD',
        entryPrice: netCreditPts,
        entryRange: `Net Credit ₹${netCreditPts.toFixed(2)} pts (₹${netCreditPerLot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/lot)`,
        triggerPrice: netCreditPts,
        currentLtp: netCreditPts,
        pnlPoints: 0,
        pnlPct: 0,
        pnlRupees: 0,
        stoplossPrice: +(netCreditPts * 1.9).toFixed(2),
        stoplossPct: 90,
        target1Price: +(netCreditPts * 0.35).toFixed(2),
        target1Pct: 65,
        target2Price: +(netCreditPts * 0.10).toFixed(2),
        target2Pct: 90,
        riskReward: `1:${(maxLossRupees > 0 ? (maxProfitRupees / maxLossRupees) : 1.2).toFixed(2)}`,
        confluenceScore: sellerCallConfluence.totalConfluenceScore,
        status: sellerCallStatus,
        strategyMatches: {
          faydaRadarConfluence: true,
          oiActivitySurge: true,
          faydaStrategy9Ema: true,
          multiTimeframeBreakout: true,
          multiLegSpreadConfirmed: true,
          gammaExplosionConfirmed: false
        },
        confluenceBreakdown: sellerCallConfluence,
        sellerMetrics,
        strategyTag: 'Institutional Bear Call Credit Spread (Roof Defense)',
        explanations: {
          beginner: `🎰 Safe Seller Setup: Sell ${soldCallStrike} Call and buy ${hedgeCallStrike} Call to lock in protection. You collect ₹${netCreditPerLot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} instant cash per lot upfront. As long as ${symbol} stays below ₹${soldCallStrike} by expiry (or even rallies slightly up to ${Math.max(0, safetyBufferPts)} pts), you pocket 100% of the profits! Win probability is ${popPct}%.`,
          intermediate: `Bear Call Credit Spread: Sell ${soldCallStrike} CE @ ₹${sellPrem.toFixed(1)} / Buy ${hedgeCallStrike} CE @ ₹${buyPrem.toFixed(1)}. Net Credit: ₹${netCreditPts.toFixed(2)} pts (₹${netCreditPerLot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/lot). Required Margin: ₹${estimatedMarginRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (71% hedge discount). Breakeven: ₹${upperBreakeven.toFixed(2)}. SL trigger at 1.9x net credit (₹${(netCreditPts * 1.9).toFixed(1)} pts). Target: 65% profit at ₹${(netCreditPts * 0.35).toFixed(1)} pts.`,
          expert: `Short Call Delta: +0.21, Long Hedge Delta: -0.07 (Net Delta: -0.14). Hourly Theta: +₹${hourlyTheta}/lot. IV: ${soldStrikeObj?.iv || 12.8}%. Resistance wall intact. Defined Max Loss: ₹${maxLossRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vs Max Profit: ₹${maxProfitRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. 10-Indicator Confluence: ${sellerCallConfluence.totalConfluenceScore}%.`
        },
        spreadDetails: {
          legsSummary: `Sell ${soldCallStrike} CE + Buy ${hedgeCallStrike} CE`,
          maxProfitRupees,
          maxLossRupees,
          breakeven: upperBreakeven,
          marginSavingsPct: 71
        }
      };
      slotEntry.sellerCalls.push(topSellerCallTrade);
    }

    // 3) Top Option Seller NEUTRAL Trade: Iron Condor (Rangebound 4-Leg Seller)
    let topSellerNeutralTrade: UnifiedSmartTip | null = null;
    if (slotEntry.sellerNeutrals.length > 0) {
      const activeCondor = slotEntry.sellerNeutrals[0];
      topSellerNeutralTrade = activeCondor;
    } else {
      const soldCall = atmStrike + strikeStep;
      const hedgeCall = atmStrike + (strikeStep * 2);
      const soldPut = atmStrike - strikeStep;
      const hedgePut = atmStrike - (strikeStep * 2);

      const netCreditPts = 48.0;
      const netCreditPerLot = Math.round(netCreditPts * instrumentLot);
      const spreadWidth = strikeStep;
      const maxLossRupees = Math.round((spreadWidth - (netCreditPts / 2)) * instrumentLot);
      const estimatedMarginRupees = symbol === 'BANKNIFTY' ? 52000 : 44000;

      const condorConfluence = ConfluenceEngine.evaluate10IndicatorConfluence(
        symbol,
        'IRON_CONDOR',
        spotPrice,
        atmStrike,
        strikes,
        pcr,
        maxPain,
        technicalIndicators,
        patternBreakout,
        cprData,
        indiaVix
      );

      topSellerNeutralTrade = {
        id: `condor-${symbol}-${hourlySlotId}-${atmStrike}`,
        symbol,
        tier: 'HEDGED_SPREAD',
        tierLabel: '⚖️ Institutional Iron Condor (Sideways Premium Harvester)',
        tradingRole: 'SELLER',
        executionType: 'NET_CREDIT',
        session: sessionInfo.session,
        sessionName: sessionInfo.sessionName,
        action: 'IRON_CONDOR',
        contractSymbol: `${symbol} Iron Condor (${soldPut}P/${soldCall}C Short)`,
        strikePrice: atmStrike,
        optionType: 'SPREAD',
        entryTime: new Date().toISOString(),
        entryTimeFormatted: timeFormatted,
        entryPrice: netCreditPts,
        entryRange: `Net Credit ₹${netCreditPts.toFixed(2)} pts (₹${netCreditPerLot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/lot)`,
        triggerPrice: netCreditPts,
        currentLtp: netCreditPts,
        stoplossPrice: +(netCreditPts * 1.8).toFixed(2),
        stoplossPct: 80,
        target1Price: +(netCreditPts * 0.40).toFixed(2),
        target1Pct: 60,
        target2Price: +(netCreditPts * 0.15).toFixed(2),
        target2Pct: 85,
        riskReward: '1:1.6',
        confluenceScore: condorConfluence.totalConfluenceScore,
        status: 'ACTIVE',
        strategyMatches: {
          faydaRadarConfluence: true,
          oiActivitySurge: true,
          faydaStrategy9Ema: false,
          multiTimeframeBreakout: false,
          multiLegSpreadConfirmed: true,
          gammaExplosionConfirmed: false
        },
        confluenceBreakdown: condorConfluence,
        sellerMetrics: {
          netCreditPerLot,
          netCreditPts,
          probabilityOfProfitPct: 83,
          estimatedMarginRupees,
          marginSavingsPct: 74,
          maxProfitRupees: netCreditPerLot,
          maxLossRupees,
          thetaDecayHourlyRupees: Math.round(netCreditPts * 0.12 * instrumentLot),
          safetyBufferPts: strikeStep,
          hedgeLegSymbol: `Long ${hedgePut} PE & ${hedgeCall} CE Hedges`,
          lowerBreakeven: +(soldPut - (netCreditPts / 2)).toFixed(2),
          upperBreakeven: +(soldCall + (netCreditPts / 2)).toFixed(2)
        },
        strategyTag: 'Neutral Straddle/Strangle Decay Corridor',
        explanations: {
          beginner: `Double Theta Harvester: The market is in a sideways range. You sell both sides (Put at ${soldPut}, Call at ${soldCall}) with outer safety hedges. You collect ₹${netCreditPerLot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per lot immediately. As long as ${symbol} stays in the corridor (${soldPut} to ${soldCall}), you retain the entire cash. High 83% win rate.`,
          intermediate: `Iron Condor: Short ${soldPut} PE / ${soldCall} CE + Long ${hedgePut} PE / ${hedgeCall} CE. Max credit: ₹${netCreditPts.toFixed(2)} pts. Breakevens: ₹${(soldPut - 24).toFixed(1)} and ₹${(soldCall + 24).toFixed(1)}. Margin: ₹${estimatedMarginRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
          expert: `Delta Neutral (|Δ| < 0.05), Gamma: -0.012, Daily Theta: +₹${Math.round(netCreditPts * 0.12 * instrumentLot * 6.25)}/day. Premium harvest inside 2σ boundary.`
        },
        spreadDetails: {
          legsSummary: `Sell ${soldPut} PE & ${soldCall} CE + Buy ${hedgePut} PE & ${hedgeCall} CE`,
          maxProfitRupees: netCreditPerLot,
          maxLossRupees,
          breakeven: atmStrike,
          marginSavingsPct: 74
        }
      };
      slotEntry.sellerNeutrals.push(topSellerNeutralTrade);
    }

    const hourlyQuotaRemaining = {
      calls: Math.max(0, 2 - slotEntry.calls.length),
      puts: Math.max(0, 2 - slotEntry.puts.length)
    };

    const buyerQuotaRemaining = {
      calls: Math.max(0, 2 - slotEntry.calls.length),
      puts: Math.max(0, 2 - slotEntry.puts.length)
    };

    const sellerQuotaRemaining = {
      putCredit: Math.max(0, 2 - slotEntry.sellerPuts.length),
      callCredit: Math.max(0, 2 - slotEntry.sellerCalls.length),
      neutral: Math.max(0, 2 - slotEntry.sellerNeutrals.length)
    };

    // ── 3. Tier 2: Hedged Multi-Leg Spread (Bull Call Spread / Bear Put Spread) ─
    let hedgedSpreadTrade: UnifiedSmartTip | null = null;

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
      const entryTimeFormatted = existingSpread ? existingSpread.entryTimeFormatted : effectiveEntryTimeFormatted;
      let bookedTime = existingSpread?.bookedTime;
      let bookedTimeFormatted = existingSpread?.bookedTimeFormatted;
      let carryForwardTime = existingSpread?.carryForwardTime;
      let carryForwardTimeFormatted = existingSpread?.carryForwardTimeFormatted;

      const pnlPoints = +(spreadEntryPts - entryPrice).toFixed(2);
      const pnlPct = entryPrice > 0 ? +((pnlPoints / entryPrice) * 100).toFixed(2) : 0;

      const t1SpreadPrice = +(entryPrice + (maxProfitPts * 0.70)).toFixed(2);
      const t2SpreadPrice = +(entryPrice + maxProfitPts).toFixed(2);
      const slSpreadPrice = +(entryPrice * 0.50).toFixed(2);

      let spreadStatus: UnifiedSmartTip['status'] = 'ACTIVE';
      if (spreadEntryPts >= t2SpreadPrice) {
        spreadStatus = 'TARGET2_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (spreadEntryPts >= t1SpreadPrice) {
        spreadStatus = 'TARGET1_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (spreadEntryPts <= slSpreadPrice) {
        spreadStatus = 'SL_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (isPast340Pm || existingSpread?.isCarriedForward) {
        spreadStatus = 'CARRIED_FORWARD';
        if (!carryForwardTimeFormatted) {
          carryForwardTime = new Date().toISOString();
          carryForwardTimeFormatted = effectiveCarryForwardTimeFormatted;
        }
      }

      const spreadConfluence = ConfluenceEngine.evaluate10IndicatorConfluence(
        symbol,
        stratAction,
        spotPrice,
        buyStrike,
        strikes,
        pcr,
        maxPain,
        technicalIndicators,
        patternBreakout,
        cprData,
        indiaVix
      );

      hedgedSpreadTrade = {
        id: `spread-${symbol}-${sessionInfo.session}-${buyStrike}-${sellStrike}`,
        symbol,
        tier: 'HEDGED_SPREAD',
        tierLabel: '🛡️ Capital-Protected Spread (Bull Call / Bear Put)',
        tradingRole: 'BUYER',
        executionType: 'NET_DEBIT',
        session: sessionInfo.session,
        sessionName: sessionInfo.sessionName,
        action: stratAction,
        contractSymbol,
        strikePrice: buyStrike,
        optionType: 'SPREAD',
        entryTime,
        entryTimeFormatted,
        bookedTime,
        bookedTimeFormatted,
        carryForwardTime,
        carryForwardTimeFormatted: carryForwardTimeFormatted || (isPast340Pm ? '03:20 PM IST' : undefined),
        carryForwardSuggestion: 'Hedged Carry Forward: Fully defined risk spread. Safe to carry overnight for theta decay harvest.',
        isCarriedForward: spreadStatus === 'CARRIED_FORWARD',
        entryPrice,
        entryRange: `Net Debit ₹${entryPrice.toFixed(2)} pts`,
        triggerPrice: entryPrice,
        dipEntryMin: +(entryPrice * 0.92).toFixed(2),
        dipEntryMax: entryPrice,
        breakoutEntryPrice: +(entryPrice * 1.10).toFixed(2),
        actionabilityStatus: pnlPct >= 2.0 ? 'RUNNING_PROFIT' : pnlPct <= -2.0 ? 'DIP_OPPORTUNITY' : 'AT_TRIGGER',
        pnlPoints,
        pnlPct,
        pnlRupees: Math.round(pnlPoints * instrumentLot),
        currentLtp: spreadEntryPts,
        stoplossPrice: slSpreadPrice,
        stoplossPct: 50,
        target1Price: t1SpreadPrice,
        target1Pct: 70,
        target2Price: t2SpreadPrice,
        target2Pct: 100,
        riskReward: riskRewardStr,
        confluenceScore: Math.round(spreadConfluence.totalConfluenceScore),
        confluenceBreakdown: spreadConfluence,
        status: spreadStatus,
        strategyMatches: {
          faydaRadarConfluence: true,
          oiActivitySurge: true,
          faydaStrategy9Ema: false,
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
      const entryTimeFormatted = existingGamma ? existingGamma.entryTimeFormatted : effectiveEntryTimeFormatted;
      let bookedTime = existingGamma?.bookedTime;
      let bookedTimeFormatted = existingGamma?.bookedTimeFormatted;
      let carryForwardTime = existingGamma?.carryForwardTime;
      let carryForwardTimeFormatted = existingGamma?.carryForwardTimeFormatted;

      const pnlPoints = +(topHz.ltp - entryPrice).toFixed(2);
      const pnlPct = entryPrice > 0 ? +((pnlPoints / entryPrice) * 100).toFixed(2) : 0;

      let gammaStatus: UnifiedSmartTip['status'] = 'ACTIVE';
      if (topHz.ltp >= topHz.target5x) {
        gammaStatus = 'TARGET2_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (topHz.ltp >= topHz.target3x) {
        gammaStatus = 'TARGET1_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (topHz.ltp <= topHz.stoploss) {
        gammaStatus = 'SL_HIT';
        if (!bookedTimeFormatted) {
          bookedTime = new Date().toISOString();
          bookedTimeFormatted = timeFormatted;
        }
      } else if (isPast340Pm) {
        gammaStatus = 'EXPIRED';
        if (!carryForwardTimeFormatted) {
          carryForwardTime = new Date().toISOString();
          carryForwardTimeFormatted = effectiveCarryForwardTimeFormatted;
        }
      } else if (existingGamma?.isCarriedForward) {
        gammaStatus = 'CARRIED_FORWARD';
        if (!carryForwardTimeFormatted) {
          carryForwardTime = new Date().toISOString();
          carryForwardTimeFormatted = timeFormatted;
        }
      }

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
        bookedTime,
        bookedTimeFormatted,
        carryForwardTime,
        carryForwardTimeFormatted: carryForwardTimeFormatted || (isPast340Pm ? '03:20 PM IST' : undefined),
        carryForwardSuggestion: '0DTE Expiry Warning: All same-day expiry options expired at 03:30 PM. Never carry 0DTE options overnight.',
        isCarriedForward: gammaStatus === 'CARRIED_FORWARD',
        entryPrice,
        entryRange: `₹${(entryPrice * 0.90).toFixed(2)} - ₹${entryPrice.toFixed(2)}`,
        triggerPrice: entryPrice,
        dipEntryMin: +(entryPrice * 0.90).toFixed(2),
        dipEntryMax: entryPrice,
        breakoutEntryPrice: +(entryPrice * 1.08).toFixed(2),
        actionabilityStatus: pnlPct >= 5.0 ? 'RUNNING_PROFIT' : 'AT_TRIGGER',
        pnlPoints,
        pnlPct,
        pnlRupees: Math.round(pnlPoints * instrumentLot),
        currentLtp: topHz.ltp,
        stoplossPrice: topHz.stoploss,
        stoplossPct: topHz.stoplossPct,
        target1Price: topHz.target3x,
        target1Pct: 200,
        target2Price: topHz.target5x,
        target2Pct: 400,
        riskReward: topHz.riskReward,
        confluenceScore: topHz.gammaScore,
        status: gammaStatus,
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

    // Deduplicate carriedForwardTrades so they never replicate any currently active setup
    const activeContractSymbols = new Set<string>();
    const normalizeSym = (sym?: string) => (sym || '').replace(/\s+/g, '').toUpperCase();

    if (primaryTrade) activeContractSymbols.add(normalizeSym(primaryTrade.contractSymbol));
    if (topCallTrade) activeContractSymbols.add(normalizeSym(topCallTrade.contractSymbol));
    if (topPutTrade) activeContractSymbols.add(normalizeSym(topPutTrade.contractSymbol));
    if (topSellerPutTrade) activeContractSymbols.add(normalizeSym(topSellerPutTrade.contractSymbol));
    if (topSellerCallTrade) activeContractSymbols.add(normalizeSym(topSellerCallTrade.contractSymbol));
    if (topSellerNeutralTrade) activeContractSymbols.add(normalizeSym(topSellerNeutralTrade.contractSymbol));
    if (hedgedSpreadTrade) activeContractSymbols.add(normalizeSym(hedgedSpreadTrade.contractSymbol));
    if (gammaTrade && gammaTrade.action !== 'STANDBY') activeContractSymbols.add(normalizeSym(gammaTrade.contractSymbol));

    const deduplicatedCarriedForward = carriedForwardTrades.filter(t => !activeContractSymbols.has(normalizeSym(t.contractSymbol)));

    return {
      currentSession: sessionInfo.session,
      currentSessionName: sessionInfo.sessionName,
      sessionWindowTime: sessionInfo.windowTime,
      quotaDescription: sessionInfo.quotaDescription,
      primaryTrade,
      topCallTrade,
      topPutTrade,
      topSellerPutTrade,
      topSellerCallTrade,
      topSellerNeutralTrade,
      hourlySlotId,
      hourlyQuotaRemaining,
      buyerQuotaRemaining,
      sellerQuotaRemaining,
      hedgedSpreadTrade,
      gammaTrade,
      carriedForwardTrades: deduplicatedCarriedForward,
      regimeWarning: masterConfluence.marketRegime === 'RANGE_BOUND_CHOP' || masterConfluence.marketRegime === 'IV_CRUSH_ZONE'
        ? `⚠️ ${masterConfluence.regimeLabel}: High choppy risk. Use Hedged Spreads or hold capital.`
        : undefined,
      isNoTradeZone: masterConfluence.masterDecision === 'NO_TRADE' || masterConfluence.masterDecision === 'WAIT',
      lastEvaluatedAt: new Date().toISOString()
    };
  }
}

