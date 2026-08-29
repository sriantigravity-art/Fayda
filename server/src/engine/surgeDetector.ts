import { SurgeLevel, IndexSymbol } from '../types.js';

export interface ScoreFactors {
  oiVelocityScore: number;    // 0-100
  volumeScore: number;        // 0-100
  premiumScore: number;       // 0-100
  pcrScore: number;           // 0-100
  atmProximityScore: number;  // 0-100
}

export function calculateSurgeScore(
  symbol: IndexSymbol,
  oiChange1m: number,
  avgOiChange1m: number,
  volume: number,
  avgVolume: number,
  ltpPctChange: number,
  pcr1mChange: number,
  strike: number,
  atmStrike: number
): { score: number; level: SurgeLevel; factors: ScoreFactors } {
  // 1. OI Velocity (40%)
  const absOiChange = Math.abs(oiChange1m);
  const baselineOi = Math.max(10000, avgOiChange1m);
  const oiMultiple = absOiChange / baselineOi;
  
  // Convert multiple to 0-100 scale (e.g. 1x=20, 2x=45, 4x=75, 7x+=100)
  let oiVelocityScore = Math.min(100, Math.round(oiMultiple * 15));
  if (symbol === 'NIFTY' && absOiChange > 250000) oiVelocityScore = Math.max(oiVelocityScore, 85);
  if (symbol === 'NIFTY' && absOiChange > 400000) oiVelocityScore = 100;
  if (symbol === 'BANKNIFTY' && absOiChange > 150000) oiVelocityScore = Math.max(oiVelocityScore, 85);
  if (symbol === 'BANKNIFTY' && absOiChange > 300000) oiVelocityScore = 100;
  if ((symbol === 'SENSEX' || symbol === 'BANKEX') && absOiChange > 50000) oiVelocityScore = Math.max(oiVelocityScore, 85);
  if ((symbol === 'SENSEX' || symbol === 'BANKEX') && absOiChange > 100000) oiVelocityScore = 100;

  // 2. Relative Volume (20%)
  const baselineVol = Math.max(50000, avgVolume);
  const volMultiple = volume / baselineVol;
  const volumeScore = Math.min(100, Math.round(volMultiple * 25));

  // 3. Premium Movement (20%)
  const absPremPct = Math.abs(ltpPctChange);
  // e.g. 5% change -> 50, 10% change -> 80, 15%+ -> 100
  const premiumScore = Math.min(100, Math.round(absPremPct * 6.5));

  // 4. PCR Movement (10%)
  const absPcrChange = Math.abs(pcr1mChange);
  // e.g. 0.05 change -> 50, 0.15+ change -> 100
  const pcrScore = Math.min(100, Math.round(absPcrChange * 500));

  // 5. ATM Proximity (10%)
  let step = 50;
  if (symbol === 'BANKNIFTY' || symbol === 'SENSEX' || symbol === 'BANKEX' || symbol === 'NIFTYNXT50') step = 100;
  else if (symbol === 'SILVER') step = 500;
  else if (symbol === 'GOLD') step = 200;
  else if (symbol === 'CRUDEOIL') step = 50;
  else if (symbol === 'NATURALGAS' || symbol === 'COPPER') step = 5;
  else if (symbol === 'ZINC' || symbol === 'MIDCPNIFTY') step = 25;

  const strikeDistance = Math.abs(strike - atmStrike) / Math.max(1, step);
  // 0 distance (ATM) = 100, 1 strike = 90, 2 strikes = 75, 4 strikes = 40, >6 = 10
  let atmProximityScore = Math.max(5, 100 - (strikeDistance * 15));

  // Composite Score
  const totalScore = Math.min(100, Math.max(0, Math.round(
    (oiVelocityScore * 0.40) +
    (volumeScore * 0.20) +
    (premiumScore * 0.20) +
    (pcrScore * 0.10) +
    (atmProximityScore * 0.10)
  )));

  // Determine Level
  let level: SurgeLevel = 'NORMAL';
  if (totalScore >= 80 || oiMultiple >= 5.0) {
    level = 'EXTREME';
  } else if (totalScore >= 60 || oiMultiple >= 3.0) {
    level = 'STRONG';
  } else if (totalScore >= 35 || oiMultiple >= 1.8) {
    level = 'MODERATE';
  }

  return {
    score: totalScore,
    level,
    factors: {
      oiVelocityScore,
      volumeScore,
      premiumScore,
      pcrScore,
      atmProximityScore
    }
  };
}

export function formatIndianNumber(num: number): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  let res = '';
  
  if (absNum >= 10000000) {
    res = `${(absNum / 10000000).toFixed(2)} Cr`;
  } else if (absNum >= 100000) {
    res = `${(absNum / 100000).toFixed(2)}L`;
  } else if (absNum >= 1000) {
    res = `${(absNum / 1000).toFixed(1)}k`;
  } else {
    res = absNum.toString();
  }

  return isNegative ? `-${res}` : `+${res}`;
}
