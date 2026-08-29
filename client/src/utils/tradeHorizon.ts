export type TradeCategory = 'SCALPING' | 'INTRADAY' | 'SWING' | 'DELIVERY';

export interface DynamicTargetResult {
  slPoints: number;
  targetPoints: number;
  slPct: number;
  targetPct: number;
  slPrice: number;
  targetPrice: number;
  riskReward: string;
  sessionVelocityName: string;
  speedMultiplier: number;
  velocityBadge: string;
}

export interface TargetTimeHorizonResult {
  tradeCategory: TradeCategory;
  categoryBadge: string;
  categoryTagColor: string;
  categoryIcon: string;
  timeHorizonLabel: string;
  recommendedHolding: string;
  suitability: string;
  marketSituation: string;
  minMinutes: number;
  maxMinutes: number;
  requiredSpotMove: number;
  estimatedDelta: number;
  desc: string;
  color: string;
  badge: string;
  label: string;
  velocityName: string;
  velocityBadge: string;
}

/**
 * Calculates Market Session Velocity Multipliers based on official IST Indian Trading Session Dynamics
 */
export function getSessionVelocityDetails(symbol?: string) {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const totalMinutes = ist.getHours() * 60 + ist.getMinutes();

  let sessionVelocityMultiplier = 1.0;
  let sessionVelocityName = 'Standard Trading Speed';
  let velocityBadge = '⚡ NORMAL VELOCITY';

  // 1. Time-of-Day Institutional Velocity Phase (IST)
  if (totalMinutes >= 15 * 60) {
    // 03:00 PM - 03:40 PM: Final 30-Minute Power Surge / 0DTE Squeeze / BTST Volume Surge
    sessionVelocityMultiplier = 1.65;
    sessionVelocityName = '🔥 Closing 30-Min Power Surge (MOC & BTST Acceleration)';
    velocityBadge = '🔥 ULTRA SURGE SPEED (1.65x)';
  } else if (totalMinutes <= 9 * 60 + 45) {
    // 09:15 AM - 09:45 AM: Opening Drive / Initial Range Breakout (ORB)
    sessionVelocityMultiplier = 1.45;
    sessionVelocityName = '⚡ Opening Drive Momentum (Price Discovery & ORB)';
    velocityBadge = '⚡ OPENING SURGE SPEED (1.45x)';
  } else if (totalMinutes >= 13 * 60 + 15) {
    // 01:15 PM - 03:00 PM: Afternoon Trend Breakout & European Market Synergy
    sessionVelocityMultiplier = 1.30;
    sessionVelocityName = '🌊 Afternoon Breakout Expansion (European Market Inflow)';
    velocityBadge = '🚀 ACCELERATING VELOCITY (1.30x)';
  } else if (totalMinutes <= 11 * 60 + 30) {
    // 09:45 AM - 11:30 AM: Morning Trend Continuation
    sessionVelocityMultiplier = 1.15;
    sessionVelocityName = '📈 Morning Directional Trend';
    velocityBadge = '📈 TRENDING VELOCITY (1.15x)';
  } else {
    // 11:30 AM - 01:15 PM: Midday Lull / Sideways Theta Decay
    sessionVelocityMultiplier = 0.85;
    sessionVelocityName = '⚖️ Midday Consolidation Lull (Theta Erosion Zone)';
    velocityBadge = '🐢 COILING / SCALP VELOCITY (0.85x)';
  }

  // 2. Asset-Specific Movement Speed (Beta Multiplier)
  let assetBetaMultiplier = 1.0;
  const symUpper = (symbol || '').toUpperCase();
  if (symUpper.includes('BANK') || symUpper === 'SENSEX') {
    assetBetaMultiplier = 1.35; // BankNifty / Sensex wide point moves
  } else if (symUpper.includes('MIDCP')) {
    assetBetaMultiplier = 1.30; // Midcap explosive percentage expansion
  } else if (symUpper === 'CRUDEOIL' || symUpper === 'NATURALGAS') {
    assetBetaMultiplier = 1.40; // High commodity momentum
  } else if (symUpper === 'SILVER' || symUpper === 'GOLD') {
    assetBetaMultiplier = 1.25;
  }

  const combinedMultiplier = +(sessionVelocityMultiplier * assetBetaMultiplier).toFixed(2);

  return {
    sessionVelocityMultiplier,
    assetBetaMultiplier,
    combinedMultiplier,
    sessionVelocityName,
    velocityBadge
  };
}

export function calculateDynamicTarget(
  ltp: number,
  strike: number,
  atmStrike?: number,
  tradeCategory?: TradeCategory,
  symbol?: string
): DynamicTargetResult {
  const cleanLtp = Math.max(5, ltp);
  const { combinedMultiplier, sessionVelocityName, velocityBadge } = getSessionVelocityDetails(symbol);

  // Moneyness adjustment: OTM options have lower delta, smaller achievable point move
  const distFromAtm = atmStrike ? Math.abs(strike - atmStrike) : 0;
  let moneynessMultiplier = 1.0;
  if (distFromAtm > 300) {
    moneynessMultiplier = 0.70;
  } else if (distFromAtm > 150) {
    moneynessMultiplier = 0.85;
  }

  // Base institutional target percentage dynamically scaled by movement speed & time-of-day
  // Base 28% scaled up to 45%-70% during opening and closing 30-min surges
  let baseTargetPct = 28 * combinedMultiplier * moneynessMultiplier;

  // Adjust target based on trade style
  if (tradeCategory === 'SCALPING') {
    baseTargetPct = Math.max(12, Math.min(38, baseTargetPct * 0.75));
  } else if (tradeCategory === 'SWING') {
    baseTargetPct = Math.max(35, Math.min(85, baseTargetPct * 1.45));
  } else if (tradeCategory === 'DELIVERY') {
    baseTargetPct = Math.max(45, Math.min(120, baseTargetPct * 1.80));
  } else {
    // Standard Intraday
    baseTargetPct = Math.max(20, Math.min(65, baseTargetPct));
  }

  const targetPct = Math.round(baseTargetPct);

  // Stoploss percentage (Strict 1:2.0 to 1:3.0 Risk-to-Reward)
  let slPct = Math.round(Math.max(6, Math.min(22, targetPct * 0.45)));

  let targetPoints = +(cleanLtp * (targetPct / 100)).toFixed(1);
  let slPoints = +(cleanLtp * (slPct / 100)).toFixed(1);

  // High premium absolute point adjustment
  if (cleanLtp > 350) {
    targetPoints = +(cleanLtp * (Math.max(12, targetPct * 0.75) / 100)).toFixed(1);
    slPoints = +(cleanLtp * (Math.max(5, slPct * 0.70) / 100)).toFixed(1);
  }

  const slPrice = Math.max(1, +(cleanLtp - slPoints).toFixed(1));
  const targetPrice = +(cleanLtp + targetPoints).toFixed(1);
  const rrRatio = (targetPoints / Math.max(1, slPoints)).toFixed(1);

  return {
    slPoints,
    targetPoints,
    slPct,
    targetPct,
    slPrice,
    targetPrice,
    riskReward: `1:${rrRatio}`,
    sessionVelocityName,
    speedMultiplier: combinedMultiplier,
    velocityBadge
  };
}

/**
 * Intelligent Market Situation Analyzer that determines the exact trade category:
 * - FOR SCALPING (1-15 Mins)
 * - FOR INTRADAY (15 Mins - 3 Hours)
 * - FOR SWING TRADING (2-7 Days / Next Expiry)
 * - FOR DELIVERY / POSITIONAL (Equity / Monthly Hedged)
 */
export function calculateTargetHorizon(
  symbol: string,
  strikePrice: number,
  atmStrike: number,
  optionType: 'CE' | 'PE',
  entryLtp: number,
  targetLtp: number,
  score: number = 80,
  daysToExpiry: number = 2,
  pcr: number = 1.0,
  isIndex: boolean = true
): TargetTimeHorizonResult {
  const distFromAtm = Math.abs(strikePrice - atmStrike);
  const targetGainPoints = Math.max(2, targetLtp - entryLtp);

  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const totalMinutes = ist.getHours() * 60 + ist.getMinutes();

  const { sessionVelocityName, velocityBadge } = getSessionVelocityDetails(symbol);

  // Approximate Option Delta based on strike distance from ATM
  let estimatedDelta = 0.50; // ATM default
  if (distFromAtm <= 50) {
    estimatedDelta = 0.50;
  } else if (distFromAtm <= 150) {
    estimatedDelta = 0.38;
  } else if (distFromAtm <= 300) {
    estimatedDelta = 0.24;
  } else {
    estimatedDelta = 0.15; // Far OTM
  }

  // Spot Points move needed on the underlying index to hit option target
  const requiredSpotMove = +(targetGainPoints / estimatedDelta).toFixed(1);

  let tradeCategory: TradeCategory = 'INTRADAY';
  let categoryBadge = '📈 FOR INTRADAY';
  let categoryTagColor = 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50';
  let categoryIcon = '📈';
  let timeHorizonLabel = '30-90 MIN INTRADAY';
  let recommendedHolding = 'Intraday (Square off before 03:15 PM)';
  let suitability = 'Intraday Momentum Traders';
  let marketSituation = '';

  const isPowerSurgeHour = totalMinutes >= 15 * 60; // 03:00 PM - 03:40 PM
  const isOpeningSurge = totalMinutes <= 9 * 60 + 45; // 09:15 AM - 09:45 AM
  const is0DTE = daysToExpiry <= 1;
  const isHighVelocity = score >= 85;

  if (!isIndex && daysToExpiry >= 12) {
    // 1. DELIVERY / POSITIONAL (Equity Stocks or Far Monthly Expiry)
    tradeCategory = 'DELIVERY';
    categoryBadge = '📦 FOR DELIVERY / POSITIONAL';
    categoryTagColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
    categoryIcon = '📦';
    timeHorizonLabel = 'MULTI-WEEK DELIVERY / POSITIONAL';
    recommendedHolding = '2 to 4 Weeks (Positional delivery hold)';
    suitability = 'Cash Delivery Investors & Positional Derivative Traders';
    marketSituation = `Stock setup on ${symbol} with ${daysToExpiry} days to expiry. Massive structural OI base building allows low-decay multi-week holding.`;
  } else if (daysToExpiry >= 5 || (!isIndex && daysToExpiry >= 4)) {
    // 2. SWING TRADING (Multi-day weekly / monthly expiry)
    tradeCategory = 'SWING';
    categoryBadge = '🔄 FOR SWING TRADING';
    categoryTagColor = 'bg-amber/20 text-amber border-amber/50 shadow-[0_0_12px_rgba(255,170,0,0.3)]';
    categoryIcon = '🔄';
    timeHorizonLabel = '2-5 DAYS SWING SETUP';
    recommendedHolding = '2 to 5 Trading Sessions (Carry forward overnight)';
    suitability = 'Swing Option Buyers & Trend Followers';
    marketSituation = `Expiry is ${daysToExpiry} days away with gentle daily theta decay. Aligned with macro ${pcr >= 1.1 ? 'bullish' : pcr <= 0.9 ? 'bearish' : 'neutral'} trend for multi-day continuation.`;
  } else if (isPowerSurgeHour) {
    // 3. POWER HOUR CLOSING SURGE
    tradeCategory = 'SCALPING';
    categoryBadge = '🔥 CLOSING POWER SURGE';
    categoryTagColor = 'bg-bear/25 text-bear border-bear/60 shadow-[0_0_16px_rgba(255,59,105,0.4)] animate-pulse';
    categoryIcon = '🔥';
    timeHorizonLabel = '5-25 MIN FINAL ACCELERATION';
    recommendedHolding = '5 to 25 Minutes (Strict trailing SL, rapid target payoff)';
    suitability = 'High-Speed 0DTE & BTST Surge Scalpers';
    marketSituation = `Final 30-minute institutional MOC rebalancing & short squeeze. Maximum point velocity with non-linear option expansion.`;
  } else if (isOpeningSurge) {
    // 4. OPENING DRIVE SURGE
    tradeCategory = 'SCALPING';
    categoryBadge = '⚡ OPENING DRIVE SURGE';
    categoryTagColor = 'bg-accent-cyan/25 text-accent-cyan border-accent-cyan/60 shadow-[0_0_14px_rgba(0,229,255,0.4)] animate-pulse';
    categoryIcon = '⚡';
    timeHorizonLabel = '5-20 MIN OPENING BREAKOUT';
    recommendedHolding = '5 to 20 Minutes (Capture opening range burst)';
    suitability = 'Opening Range Breakout (ORB) Scalpers';
    marketSituation = `Opening price discovery & overnight gap resolution creating explosive initial point expansion.`;
  } else if (is0DTE || (isHighVelocity && distFromAtm <= 50)) {
    // 5. INTRADAY SCALP
    tradeCategory = 'SCALPING';
    categoryBadge = '⚡ FOR SCALPING';
    categoryTagColor = 'bg-purple-500/25 text-purple-300 border-purple-400/60 shadow-[0_0_14px_rgba(168,85,247,0.4)] animate-pulse';
    categoryIcon = '⚡';
    timeHorizonLabel = '5-20 MIN QUICK SCALP';
    recommendedHolding = '5 to 20 Minutes (Strict trailing SL, exit on pause)';
    suitability = 'High-Speed Option Scalpers';
    marketSituation = `Near ATM ${optionType} with high delta sensitivity. Ideal for capturing immediate momentum.`;
  } else {
    // 6. INTRADAY TREND
    tradeCategory = 'INTRADAY';
    categoryBadge = '📈 FOR INTRADAY';
    categoryTagColor = 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50 shadow-[0_0_12px_rgba(0,229,255,0.3)]';
    categoryIcon = '📈';
    timeHorizonLabel = '30-90 MIN INTRADAY TREND';
    recommendedHolding = '30 Mins to 2 Hours (Square off before 03:15 PM)';
    suitability = 'Intraday Trend & Breakout Traders';
    marketSituation = `Supported by multi-strike OI buildup and PCR (${pcr.toFixed(2)}) directional alignment across the session.`;
  }

  // Calculate speed timing in minutes
  let normalSpeedPerMin = 5.0;
  if (symbol === 'SILVER') normalSpeedPerMin = 45.0;
  else if (symbol === 'GOLD') normalSpeedPerMin = 25.0;
  else if (symbol.toUpperCase().includes('BANK') || symbol === 'SENSEX') normalSpeedPerMin = 18.0;
  else if (symbol === 'CRUDEOIL') normalSpeedPerMin = 4.0;
  else if (symbol === 'NATURALGAS') normalSpeedPerMin = 0.4;
  else if (symbol === 'COPPER' || symbol === 'ZINC') normalSpeedPerMin = 1.0;

  const baseMinutes = requiredSpotMove / normalSpeedPerMin;
  const scoreMultiplier = score >= 90 ? 0.65 : score >= 75 ? 0.90 : 1.20;

  let minMinutes = Math.round(Math.max(3, baseMinutes * 0.7 * scoreMultiplier));
  let maxMinutes = Math.round(Math.max(10, baseMinutes * 1.4 * scoreMultiplier));

  if (isPowerSurgeHour || isOpeningSurge) {
    minMinutes = Math.min(minMinutes, 4);
    maxMinutes = Math.min(maxMinutes, 20);
  } else if (tradeCategory === 'SCALPING') {
    minMinutes = Math.min(minMinutes, 5);
    maxMinutes = Math.min(maxMinutes, 20);
  } else if (tradeCategory === 'INTRADAY') {
    minMinutes = Math.max(15, minMinutes);
    maxMinutes = Math.max(35, Math.min(110, maxMinutes));
  }

  const desc = `Requires ~${requiredSpotMove} pts move in ${symbol} (Delta ≈ ${estimatedDelta.toFixed(2)})`;

  return {
    tradeCategory,
    categoryBadge,
    categoryTagColor,
    categoryIcon,
    timeHorizonLabel,
    recommendedHolding,
    suitability,
    marketSituation,
    minMinutes,
    maxMinutes,
    requiredSpotMove,
    estimatedDelta,
    desc,
    color: categoryTagColor,
    badge: categoryBadge,
    label: timeHorizonLabel,
    velocityName: sessionVelocityName,
    velocityBadge
  };
}
