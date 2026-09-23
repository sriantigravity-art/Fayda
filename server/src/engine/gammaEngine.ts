import type { OptionStrikeData, HeroZeroSignal, IndexSymbol } from '../types.js';

export class GammaEngine {
  /**
   * Evaluates the option chain to detect explosive 0DTE Gamma Spike & Hero-or-Zero setups.
   */
  public evaluateHeroZeroSignals(
    symbol: IndexSymbol,
    spotPrice: number,
    atmStrike: number,
    strikes: OptionStrikeData[],
    daysToExpiry: number,
    step: number
  ): HeroZeroSignal[] {
    const signals: HeroZeroSignal[] = [];

    // Calculate baseline volume across active chain
    const totalVols = strikes.map(s => s.callVolume + s.putVolume).filter(v => v > 0);
    const avgVolume = totalVols.length > 0 ? (totalVols.reduce((a, b) => a + b, 0) / totalVols.length) : 10000;

    // Is it 0DTE / Expiry Day?
    const isExpiryDay = daysToExpiry <= 1;

    // Time-of-day check for derivative viability (Strict rule: < 2.0 rs never allowed; 5.0 rs ok before 3:00 PM on perfect entry; after 3:00 PM low premium derivatives disallowed)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const isCommodity = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'].includes(symbol);
    const isNaturalGas = symbol === 'NATURALGAS';
    const isPast3Pm = !isCommodity && ist.getHours() >= 15;

    // Filter strikes within ±4 steps from ATM
    const candidateStrikes = strikes.filter(s => Math.abs(s.strikePrice - atmStrike) <= (step * 5));

    for (const strikeData of candidateStrikes) {
      const strike = strikeData.strikePrice;
      const stepDist = Math.abs(strike - atmStrike) / Math.max(1, step);

      // 1. Evaluate Call Option (CE)
      const callLtp = strikeData.callLtp;
      const callMaxLtp = isNaturalGas ? 12 : (symbol === 'BANKNIFTY' || symbol === 'SENSEX' || symbol === 'BANKEX' || symbol === 'GOLD' || symbol === 'SILVER') ? 140 : 65;

      // Derivative floor: Absolute floor >= 2.0; after 3:00 PM no cheap options (>= 15.0 required); before 3:00 PM >= 5.0 allowed on perfect entry
      const minViableCeLtp = isNaturalGas ? 0.6 : (isCommodity ? 3.0 : (isPast3Pm ? 15.0 : 5.0));

      if (callLtp >= minViableCeLtp && callLtp <= callMaxLtp) {
        const isShortCovering = strikeData.callBuildup === 'SHORT_COVERING' || (strikeData.callOIChange1m < 0 && strikeData.callLtpChange > 0);
        const isLongAccum = strikeData.callBuildup === 'LONG_BUILDUP';
        
        // Approximate Gamma
        const dteFactor = Math.max(0.2, daysToExpiry);
        const gamma = +(Math.exp(-0.5 * Math.pow(stepDist, 2)) / (spotPrice * 0.15 * Math.sqrt(dteFactor / 365))).toFixed(4);

        // Calculate Gamma Score (0-100)
        let gammaFactor = Math.min(40, Math.round(gamma * spotPrice * 0.8));
        if (isExpiryDay) gammaFactor = Math.min(45, gammaFactor * 1.4);

        const volMultiple = strikeData.callVolume / Math.max(1000, avgVolume * 0.3);
        const volScore = Math.min(30, Math.round(volMultiple * 10));
        const squeezeScore = isShortCovering ? 25 : isLongAccum ? 15 : 5;
        const proximityScore = Math.max(5, 15 - Math.round(stepDist * 3));

        const totalScore = Math.min(100, Math.max(20, gammaFactor + volScore + squeezeScore + proximityScore));

        // For lower premiums (5.0 - 10.0), require high score ("perfect entry")
        if (callLtp < 10.0 && totalScore < 80) {
          continue;
        }

        // Required index spot move to reach 3.5x target
        const estDelta = Math.max(0.15, Math.min(0.65, 0.50 - (stepDist * 0.10)));
        const target3x = +(callLtp * 3.5).toFixed(1);
        const requiredSpotMovePts = Math.round((target3x - callLtp) / estDelta);

        const stoploss = Math.max(2.0, +(callLtp * 0.50).toFixed(1));
        const target1x = +(callLtp * 2.0).toFixed(1);
        const target5x = +(callLtp * 5.0).toFixed(1);

        const conviction: 'EXTREME' | 'HIGH' | 'SPECULATIVE' = 
          totalScore >= 85 ? 'EXTREME' : totalScore >= 70 ? 'HIGH' : 'SPECULATIVE';

        const squeezeType = isShortCovering 
          ? 'SHORT_COVERING_CE' 
          : totalScore >= 85 ? 'GAMMA_EXPLOSION' : 'LONG_ACCUMULATION';

        const oiChgFmt = `${(strikeData.callOIChange1m / 1000).toFixed(1)}k`;
        const rationale = isShortCovering
          ? `⚡ SYSTEM DIRECTIVE: Short-Covering Squeeze | Unwinding at ${strike} CE (${oiChgFmt} OI) | Action: High multiplier runner.`
          : `⚡ SYSTEM DIRECTIVE: 0DTE Gamma Acceleration | Need +${requiredSpotMovePts} pts spot move | Payoff Target: 3.5x.`;

        const entryLow = Math.max(2.0, +(callLtp * 0.90).toFixed(1));
        const entryHigh = +(callLtp * 1.04).toFixed(1);

        signals.push({
          id: `${symbol}-${strike}-CE-${Date.now()}`,
          symbol,
          contractSymbol: `${symbol} ${strike} CE`,
          strike,
          optionType: 'CE',
          ltp: callLtp,
          entryZone: `₹${entryLow} - ₹${entryHigh}`,
          stoploss,
          stoplossPct: 50,
          target1x,
          target3x,
          target5x,
          gamma: +gamma,
          gammaScore: totalScore,
          volume: strikeData.callVolume,
          volumeVelocity: +volMultiple.toFixed(1),
          oiChange1m: strikeData.callOIChange1m,
          oiChangePct: Math.round((strikeData.callOIChange1m / Math.max(1, strikeData.callOI)) * 1000) / 10,
          isShortSqueeze: isShortCovering,
          squeezeType,
          requiredSpotMovePts,
          riskReward: '1:5.0',
          conviction,
          rationale,
          validUntilMinutes: 20,
          expiresAt: new Date(Date.now() + 20 * 60000).toISOString()
        });
      }

      // 2. Evaluate Put Option (PE)
      const putLtp = strikeData.putLtp;
      const putMaxLtp = isNaturalGas ? 12 : (symbol === 'BANKNIFTY' || symbol === 'SENSEX' || symbol === 'BANKEX' || symbol === 'GOLD' || symbol === 'SILVER') ? 140 : 65;

      const minViablePeLtp = isNaturalGas ? 0.6 : (isCommodity ? 3.0 : (isPast3Pm ? 15.0 : 5.0));

      if (putLtp >= minViablePeLtp && putLtp <= putMaxLtp) {
        const isShortCovering = strikeData.putBuildup === 'SHORT_COVERING' || (strikeData.putOIChange1m < 0 && strikeData.putLtpChange > 0);
        const isLongAccum = strikeData.putBuildup === 'LONG_BUILDUP';
        
        const dteFactor = Math.max(0.2, daysToExpiry);
        const gamma = +(Math.exp(-0.5 * Math.pow(stepDist, 2)) / (spotPrice * 0.15 * Math.sqrt(dteFactor / 365))).toFixed(4);

        let gammaFactor = Math.min(40, Math.round(gamma * spotPrice * 0.8));
        if (isExpiryDay) gammaFactor = Math.min(45, gammaFactor * 1.4);

        const volMultiple = strikeData.putVolume / Math.max(1000, avgVolume * 0.3);
        const volScore = Math.min(30, Math.round(volMultiple * 10));
        const squeezeScore = isShortCovering ? 25 : isLongAccum ? 15 : 5;
        const proximityScore = Math.max(5, 15 - Math.round(stepDist * 3));

        const totalScore = Math.min(100, Math.max(20, gammaFactor + volScore + squeezeScore + proximityScore));

        // For lower premiums (5.0 - 10.0), require high score ("perfect entry")
        if (putLtp < 10.0 && totalScore < 80) {
          continue;
        }

        const estDelta = Math.max(0.15, Math.min(0.65, 0.50 - (stepDist * 0.10)));
        const target3x = +(putLtp * 3.5).toFixed(1);
        const requiredSpotMovePts = Math.round((target3x - putLtp) / estDelta);

        const stoploss = Math.max(2.0, +(putLtp * 0.50).toFixed(1));
        const target1x = +(putLtp * 2.0).toFixed(1);
        const target5x = +(putLtp * 5.0).toFixed(1);

        const conviction: 'EXTREME' | 'HIGH' | 'SPECULATIVE' = 
          totalScore >= 85 ? 'EXTREME' : totalScore >= 70 ? 'HIGH' : 'SPECULATIVE';

        const squeezeType = isShortCovering 
          ? 'SHORT_COVERING_PE' 
          : totalScore >= 85 ? 'GAMMA_EXPLOSION' : 'LONG_ACCUMULATION';

        const oiChgFmt = `${(strikeData.putOIChange1m / 1000).toFixed(1)}k`;
        const rationale = isShortCovering
          ? `⚡ SYSTEM DIRECTIVE: Long Liquidation Breakdown | Capitulation at ${strike} PE (${oiChgFmt} OI) | Action: High multiplier runner.`
          : `⚡ SYSTEM DIRECTIVE: 0DTE Gamma Acceleration | Need -${requiredSpotMovePts} pts spot drop | Payoff Target: 3.5x.`;

        const putEntryLow = Math.max(2.0, +(putLtp * 0.90).toFixed(1));
        const putEntryHigh = +(putLtp * 1.04).toFixed(1);

        signals.push({
          id: `${symbol}-${strike}-PE-${Date.now()}`,
          symbol,
          contractSymbol: `${symbol} ${strike} PE`,
          strike,
          optionType: 'PE',
          ltp: putLtp,
          entryZone: `₹${putEntryLow} - ₹${putEntryHigh}`,
          stoploss,
          stoplossPct: 50,
          target1x,
          target3x,
          target5x,
          gamma: +gamma,
          gammaScore: totalScore,
          volume: strikeData.putVolume,
          volumeVelocity: +volMultiple.toFixed(1),
          oiChange1m: strikeData.putOIChange1m,
          oiChangePct: Math.round((strikeData.putOIChange1m / Math.max(1, strikeData.putOI)) * 1000) / 10,
          isShortSqueeze: isShortCovering,
          squeezeType,
          requiredSpotMovePts,
          riskReward: '1:5.0',
          conviction,
          rationale,
          validUntilMinutes: 20,
          expiresAt: new Date(Date.now() + 20 * 60000).toISOString()
        });
      }
    }

    // Sort by Gamma Score descending, return top 6 signals
    return signals.sort((a, b) => b.gammaScore - a.gammaScore).slice(0, 6);
  }
}

export const gammaEngine = new GammaEngine();
