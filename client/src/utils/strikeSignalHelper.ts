import type { MarketIndexState, UnifiedSmartTip, OptionStrikeData } from '../types';

export interface StrikeSignalLevels {
  hasActiveSignal: boolean;
  isExactStrikeMatch: boolean;
  signalSource: string;
  action: 'BUY_CALL' | 'BUY_PUT' | 'BULL_CALL_SPREAD' | 'BEAR_PUT_SPREAD';
  actionLabel: string;
  optionType: 'CE' | 'PE';
  strikePrice: number;
  entryPrice: number;
  entryRange: string;
  target1Price: number;
  target1Pct: number;
  target2Price: number;
  target2Pct: number;
  stoplossPrice: number;
  stoplossPct: number;
  riskReward: string;
  currentLtp: number;
  pnlPoints: number;
  pnlPct: number;
  isTarget1Hit: boolean;
  isTarget2Hit: boolean;
  isStoplossHit: boolean;
  statusText: string;
  statusColor: string;
  directiveAdvice: string;
  confluenceScore: number;
  strategyTag: string;
}

import { isCommoditySymbol } from './marketHours';

/**
 * Resolves or dynamically projects institutional signal entry, targets, and stoploss
 * for any given strike price, option type, and market index state.
 */
export function getStrikeSignalLevels(
  symbol: string,
  strikePrice: number,
  optionType: 'CE' | 'PE',
  strikeData?: OptionStrikeData | null,
  currentIndexState?: MarketIndexState | null
): StrikeSignalLevels {
  const currentLtp = strikeData 
    ? (optionType === 'CE' ? (strikeData.callLtp || 100) : (strikeData.putLtp || 100))
    : 100;

  const isCommodity = isCommoditySymbol(symbol);
  const isNaturalGas = (symbol || '').toUpperCase().trim() === 'NATURALGAS';

  // ── STRICT DERIVATIVE VIABILITY GUARD ─────────────────────────
  const utcTime = Date.now() + (new Date().getTimezoneOffset() * 60000);
  const istTime = new Date(utcTime + (3600000 * 5.5));
  const currentMin = istTime.getHours() * 60 + istTime.getMinutes();
  
  // Equity markets close at 15:30/15:40; MCX Commodities trade until 23:00 IST (11:00 PM)
  const isPast3Pm = !isCommodity && (currentMin >= (15 * 60));
  const isCommodityFinalHour = isCommodity && (currentMin >= (22 * 60)); // 10:00 PM IST (1 hr before 11:00 PM close)

  // Minimum viable LTP threshold:
  // - NATURALGAS: Strike steps are 5 pts, lot size 1250, ATM options trade at ₹1.5 - ₹5.0. Floor = ₹0.50
  // - Other commodities: Floor = ₹1.00
  // - Equity indices (NIFTY/BANKNIFTY): Floor = ₹2.00
  const minViableFloor = isNaturalGas ? 0.5 : (isCommodity ? 1.0 : 2.0);

  // 1. Absolute sub-penny floor
  if (currentLtp < minViableFloor) {
    return {
      hasActiveSignal: false,
      isExactStrikeMatch: false,
      signalSource: 'DERIVATIVE CAPITAL SHIELD',
      action: optionType === 'CE' ? 'BUY_CALL' : 'BUY_PUT',
      actionLabel: 'RESTRICTED / NO CALL',
      optionType,
      strikePrice,
      entryPrice: currentLtp,
      entryRange: `₹${currentLtp.toFixed(2)}`,
      target1Price: 0,
      target1Pct: 0,
      target2Price: 0,
      target2Pct: 0,
      stoplossPrice: 0,
      stoplossPct: 0,
      riskReward: 'N/A',
      currentLtp,
      pnlPoints: 0,
      pnlPct: 0,
      isTarget1Hit: false,
      isTarget2Hit: false,
      isStoplossHit: false,
      statusText: `PREMIUM < ₹${minViableFloor.toFixed(2)} (SUB-PENNY)`,
      statusColor: 'text-rose-400',
      directiveAdvice: `Option premium is below viable derivative limit (₹${minViableFloor.toFixed(2)}). Extreme theta decay & expiry to ₹0 risk. No buy signal allowed.`,
      confluenceScore: 0,
      strategyTag: 'Sub-Penny Expired Option'
    };
  }

  // 2. Final-hour low premium restriction:
  // - Equity indices: After 3:00 PM (30m before close), contracts <= ₹5.00 are prohibited
  // - Commodities: After 10:00 PM (60m before 11:00 PM close), contracts <= ₹0.80 (Natural Gas) or <= ₹3.00 are prohibited
  const isLateSessionProhibited = (!isCommodity && isPast3Pm && currentLtp <= 5.0) ||
    (isCommodity && isCommodityFinalHour && currentLtp <= (isNaturalGas ? 0.8 : 3.0));

  if (isLateSessionProhibited) {
    return {
      hasActiveSignal: false,
      isExactStrikeMatch: false,
      signalSource: isCommodity ? 'MCX FINAL-HOUR THETA SHIELD' : 'POST-3:00 PM THETA SHIELD',
      action: optionType === 'CE' ? 'BUY_CALL' : 'BUY_PUT',
      actionLabel: 'RESTRICTED / NO CALL',
      optionType,
      strikePrice,
      entryPrice: currentLtp,
      entryRange: `₹${currentLtp.toFixed(2)}`,
      target1Price: 0,
      target1Pct: 0,
      target2Price: 0,
      target2Pct: 0,
      stoplossPrice: 0,
      stoplossPct: 0,
      riskReward: 'N/A',
      currentLtp,
      pnlPoints: 0,
      pnlPct: 0,
      isTarget1Hit: false,
      isTarget2Hit: false,
      isStoplossHit: false,
      statusText: isCommodity 
        ? `MCX FINAL-HOUR LOW PREMIUM (≤ ₹${(isNaturalGas ? 0.8 : 3.0).toFixed(1)})` 
        : 'POST-3:00 PM LOW PREMIUM PROHIBITED (≤ ₹5.00)',
      statusColor: 'text-amber-400',
      directiveAdvice: isCommodity
        ? 'Late-session commodity expiry guard active after 10:00 PM IST due to settlement margin square-offs.'
        : 'After 03:00 PM IST, low-premium option contracts (≤ ₹5.00) are strictly prohibited due to imminent terminal theta decay to ₹0.',
      confluenceScore: 0,
      strategyTag: 'Late-Session Terminal Theta Guard'
    };
  }

  const pkg = currentIndexState?.unifiedTipsPackage;
  const allTips: UnifiedSmartTip[] = [];

  if (pkg) {
    if (pkg.primaryTrade) allTips.push(pkg.primaryTrade);
    if (pkg.topCallTrade) allTips.push(pkg.topCallTrade);
    if (pkg.topPutTrade) allTips.push(pkg.topPutTrade);
    if (pkg.gammaTrade) allTips.push(pkg.gammaTrade);
    if (pkg.hedgedSpreadTrade) allTips.push(pkg.hedgedSpreadTrade);
    if (pkg.topSellerCallTrade) allTips.push(pkg.topSellerCallTrade);
    if (pkg.topSellerPutTrade) allTips.push(pkg.topSellerPutTrade);
    if (pkg.carriedForwardTrades && Array.isArray(pkg.carriedForwardTrades)) {
      allTips.push(...pkg.carriedForwardTrades);
    }
  }

  // 1. Try finding an exact contract match (strike + option type)
  const exactTip = allTips.find(t => {
    if (!t) return false;
    const matchStrike = t.strikePrice === strikePrice;
    const isCall = optionType === 'CE';
    const tipIsCall = t.optionType === 'CE' || t.action?.includes('CALL') || t.action?.includes('BULL');
    const matchType = isCall === tipIsCall;
    return matchStrike && matchType;
  });

  // 2. Try finding Hero Zero signal on expiry
  const hzSignal = currentIndexState?.heroZeroSignals?.find(h => 
    h.strike === strikePrice && h.optionType === optionType
  );

  if (exactTip) {
    const entry = exactTip.entryPrice > 0 ? exactTip.entryPrice : currentLtp;
    const t1 = exactTip.target1Price > 0 ? exactTip.target1Price : +(entry * 1.25).toFixed(1);
    const t2 = exactTip.target2Price > 0 ? exactTip.target2Price : +(entry * 1.50).toFixed(1);
    const sl = exactTip.stoplossPrice > 0 ? exactTip.stoplossPrice : +(entry * 0.85).toFixed(1);

    const t1Pct = exactTip.target1Pct || (entry > 0 ? +(((t1 - entry) / entry) * 100).toFixed(1) : 25);
    const t2Pct = exactTip.target2Pct || (entry > 0 ? +(((t2 - entry) / entry) * 100).toFixed(1) : 50);
    const slPct = exactTip.stoplossPct || (entry > 0 ? +(((entry - sl) / entry) * 100).toFixed(1) : 15);

    const pnlPts = +(currentLtp - entry).toFixed(1);
    const pnlPct = entry > 0 ? +((pnlPts / entry) * 100).toFixed(1) : 0;

    const isT1 = currentLtp >= t1;
    const isT2 = currentLtp >= t2;
    const isSL = currentLtp <= sl;

    let statusText = 'IN ENTRY ZONE';
    let statusColor = 'text-accent-cyan';
    let directiveAdvice = 'Optimal risk:reward zone near trigger price.';

    if (isT2) {
      statusText = 'TARGET 2 ACHIEVED';
      statusColor = 'text-amber-400';
      directiveAdvice = 'Maximum target achieved! Book full gains and close position.';
    } else if (isT1) {
      statusText = 'TARGET 1 HIT';
      statusColor = 'text-emerald-400';
      directiveAdvice = 'Target 1 hit! Secure 50% profit and trail stoploss to cost.';
    } else if (isSL) {
      statusText = 'STOPLOSS HIT';
      statusColor = 'text-rose-400';
      directiveAdvice = 'Capital shield breached. Close trade and protect capital.';
    } else if (pnlPct >= 8) {
      statusText = `RUNNING +${pnlPct}%`;
      statusColor = 'text-emerald-400';
      directiveAdvice = 'Position running in profit. Maintain trailing stoploss.';
    }

    return {
      hasActiveSignal: true,
      isExactStrikeMatch: true,
      signalSource: exactTip.tierLabel || 'INSTITUTIONAL RADAR CONFLUENCE',
      action: optionType === 'CE' ? 'BUY_CALL' : 'BUY_PUT',
      actionLabel: optionType === 'CE' ? 'BUY CALL' : 'BUY PUT',
      optionType,
      strikePrice,
      entryPrice: entry,
      entryRange: exactTip.entryRange || `₹${(entry * 0.98).toFixed(1)} - ₹${(entry * 1.02).toFixed(1)}`,
      target1Price: t1,
      target1Pct: t1Pct,
      target2Price: t2,
      target2Pct: t2Pct,
      stoplossPrice: sl,
      stoplossPct: slPct,
      riskReward: exactTip.riskReward || '1 : 1.85',
      currentLtp,
      pnlPoints: pnlPts,
      pnlPct,
      isTarget1Hit: isT1,
      isTarget2Hit: isT2,
      isStoplossHit: isSL,
      statusText,
      statusColor,
      directiveAdvice,
      confluenceScore: exactTip.confluenceScore || 85,
      strategyTag: exactTip.strategyTag || 'Fayda Momentum Confluence'
    };
  }

  if (hzSignal) {
    const entry = hzSignal.ltp > 0 ? hzSignal.ltp : currentLtp;
    const t1 = hzSignal.target1x > 0 ? hzSignal.target1x : +(entry * 1.5).toFixed(1);
    const t2 = hzSignal.target3x > 0 ? hzSignal.target3x : +(entry * 2.5).toFixed(1);
    const sl = hzSignal.stoploss > 0 ? hzSignal.stoploss : +(entry * 0.7).toFixed(1);

    const t1Pct = entry > 0 ? +(((t1 - entry) / entry) * 100).toFixed(1) : 50;
    const t2Pct = entry > 0 ? +(((t2 - entry) / entry) * 100).toFixed(1) : 150;
    const slPct = entry > 0 ? +(((entry - sl) / entry) * 100).toFixed(1) : 30;

    const pnlPts = +(currentLtp - entry).toFixed(1);
    const pnlPct = entry > 0 ? +((pnlPts / entry) * 100).toFixed(1) : 0;

    return {
      hasActiveSignal: true,
      isExactStrikeMatch: true,
      signalSource: 'HERO-ZERO GAMMA BLAST',
      action: optionType === 'CE' ? 'BUY_CALL' : 'BUY_PUT',
      actionLabel: optionType === 'CE' ? 'BUY CALL' : 'BUY PUT',
      optionType,
      strikePrice,
      entryPrice: entry,
      entryRange: hzSignal.entryZone || `₹${(entry * 0.95).toFixed(1)} - ₹${(entry * 1.05).toFixed(1)}`,
      target1Price: t1,
      target1Pct: t1Pct,
      target2Price: t2,
      target2Pct: t2Pct,
      stoplossPrice: sl,
      stoplossPct: slPct,
      riskReward: '1 : 2.5',
      currentLtp,
      pnlPoints: pnlPts,
      pnlPct,
      isTarget1Hit: currentLtp >= t1,
      isTarget2Hit: currentLtp >= t2,
      isStoplossHit: currentLtp <= sl,
      statusText: currentLtp >= t1 ? 'TARGET HIT' : 'HERO-ZERO ACTIVE',
      statusColor: 'text-accent-gold',
      directiveAdvice: 'Gamma multiplier setup: Scale out at Target 1; trail remainder for 3x bonus.',
      confluenceScore: 90,
      strategyTag: 'Expiry Gamma Scalp'
    };
  }

  // 3. Fallback to directional template from heroTip or institutional matrix
  const directionalTip = optionType === 'CE' ? (pkg?.topCallTrade || pkg?.primaryTrade) : (pkg?.topPutTrade || pkg?.primaryTrade);
  const target1Pct = directionalTip?.target1Pct || 24.0;
  const target2Pct = directionalTip?.target2Pct || 48.0;
  const stoplossPct = directionalTip?.stoplossPct || 15.0;

  const entry = currentLtp > 0 ? currentLtp : 100;
  const t1 = +(entry * (1 + target1Pct / 100)).toFixed(1);
  const t2 = +(entry * (1 + target2Pct / 100)).toFixed(1);
  const sl = +(entry * (1 - stoplossPct / 100)).toFixed(1);

  const pnlPts = 0;
  const pnlPct = 0;

  return {
    hasActiveSignal: !!directionalTip,
    isExactStrikeMatch: false,
    signalSource: directionalTip ? 'FAYDA ALPHA ORDER FLOW CONFLUENCE' : 'FAYDA INSTITUTIONAL BENCHMARK',
    action: optionType === 'CE' ? 'BUY_CALL' : 'BUY_PUT',
    actionLabel: optionType === 'CE' ? 'BUY CALL' : 'BUY PUT',
    optionType,
    strikePrice,
    entryPrice: entry,
    entryRange: `₹${(entry * 0.98).toFixed(1)} - ₹${(entry * 1.02).toFixed(1)}`,
    target1Price: t1,
    target1Pct,
    target2Price: t2,
    target2Pct,
    stoplossPrice: sl,
    stoplossPct,
    riskReward: directionalTip?.riskReward || '1 : 1.75',
    currentLtp,
    pnlPoints: pnlPts,
    pnlPct,
    isTarget1Hit: false,
    isTarget2Hit: false,
    isStoplossHit: false,
    statusText: 'OPTIMAL ENTRY ZONE',
    statusColor: 'text-accent-cyan',
    directiveAdvice: 'Strike order flow confluence active. Maintain strict stoploss below Entry.',
    confluenceScore: directionalTip?.confluenceScore || 78,
    strategyTag: directionalTip?.strategyTag || 'Institutional Order Flow Setup'
  };
}
