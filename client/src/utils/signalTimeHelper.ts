/**
 * Signal Timing & Trade Actionability Helper
 * Calculates fixed tip given time, live running market time, elapsed duration equation,
 * and user actionability feasibility status across all trading recommendations.
 * Computes explicit user action guidance: ENTER, HOLD, BOOK PROFIT, TRAIL SL, EXIT SL, and auto-archiving to Journal.
 */

export type UserTradeActionType = 
  | 'ENTER_NOW' 
  | 'HOLD_POSITION' 
  | 'BOOK_PROFIT' 
  | 'TRAIL_SL' 
  | 'EXIT_SL' 
  | 'EXPIRED_ARCHIVE';

export interface SignalTimingData {
  givenTimeIso: string;
  givenTimeFormatted: string;       // e.g. "09:55:00 AM"
  givenTimeShort: string;           // e.g. "09:55 AM"
  liveTimeFormatted: string;        // e.g. "10:03:15 AM"
  elapsedSeconds: number;
  elapsedMinutes: number;
  elapsedFormatted: string;         // e.g. "7m 15s" or "45s"
  formulaText: string;              // e.g. "10:03:15 - 09:55:00 = 7m 15s"
  validUntilMinutes: number;
  remainingMinutes: number;
  progressPct: number;              // 0 to 100% of validity window
  isExpired: boolean;
  actionability: {
    status: 'PRIME' | 'ACTIVE' | 'MONITOR' | 'EXTENDED' | 'EXPIRED';
    badge: string;
    tagClass: string;
    advice: string;
    canTrade: boolean;
  };
}

export interface TradeActionAdvice {
  actionType: UserTradeActionType;
  badgeLabel: string;
  badgeClass: string;
  buttonLabel: string;
  explanation: string;
  pnlPoints: number;
  pnlPct: number;
  isTargetAchieved: boolean;
  isStoplossHit: boolean;
  isExpired: boolean;
  shouldArchiveToJournal: boolean;
}

/**
 * Format a timestamp into Indian Standard Time (IST) HH:mm:ss A or HH:mm A
 */
export function formatIstClock(timestamp?: string | number | Date, includeSeconds = true): string {
  if (!timestamp) return '--:--:--';
  try {
    const d = typeof timestamp === 'number' || typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    if (isNaN(d.getTime())) return '--:--:--';

    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined
    });
  } catch {
    return '--:--:--';
  }
}

/**
 * Compute signal timing breakdown and actionability grading
 */
export function getSignalTimingData(
  givenTimestamp?: string | number | Date,
  validUntilMinutes = 30,
  currentLiveMs = Date.now()
): SignalTimingData {
  let givenDate: Date;
  if (!givenTimestamp) {
    givenDate = new Date(currentLiveMs);
  } else if (typeof givenTimestamp === 'string' || typeof givenTimestamp === 'number') {
    givenDate = new Date(givenTimestamp);
    if (isNaN(givenDate.getTime())) givenDate = new Date(currentLiveMs);
  } else {
    givenDate = givenTimestamp;
  }

  const givenMs = givenDate.getTime();
  const elapsedMs = Math.max(0, currentLiveMs - givenMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  // Elapsed formatted representation
  let elapsedFormatted = 'Just now';
  if (elapsedSeconds < 60) {
    elapsedFormatted = `${elapsedSeconds}s`;
  } else {
    const remSec = elapsedSeconds % 60;
    elapsedFormatted = remSec > 0 ? `${elapsedMinutes}m ${remSec}s` : `${elapsedMinutes}m`;
  }

  const givenTimeFormatted = formatIstClock(givenDate, true);
  const givenTimeShort = formatIstClock(givenDate, false);
  const liveTimeFormatted = formatIstClock(currentLiveMs, true);

  const formulaText = `${liveTimeFormatted} - ${givenTimeFormatted} = ${elapsedFormatted}`;

  const maxMin = Math.max(5, validUntilMinutes);
  const remainingMinutes = Math.max(0, maxMin - elapsedMinutes);
  const progressPct = Math.min(100, Math.round((elapsedMinutes / maxMin) * 100));
  const isExpired = elapsedMinutes >= maxMin;

  // Determine actionability status
  let actionability: SignalTimingData['actionability'];

  if (elapsedMinutes < 3) {
    actionability = {
      status: 'PRIME',
      badge: '🟢 PRIME ENTRY (<3m)',
      tagClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 animate-pulse',
      advice: 'Fresh signal! High probability entry window near trigger price.',
      canTrade: true
    };
  } else if (elapsedMinutes < 10) {
    actionability = {
      status: 'ACTIVE',
      badge: '🟢 ACTIVE ZONE (3-10m)',
      tagClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/35',
      advice: 'Active momentum. Confirm current LTP is within ±2% of entry zone.',
      canTrade: true
    };
  } else if (elapsedMinutes < 25) {
    actionability = {
      status: 'MONITOR',
      badge: '🟡 MONITOR DIP (10-25m)',
      tagClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35',
      advice: 'Matured setup. Enter only if price pulls back to recommended entry or support.',
      canTrade: true
    };
  } else if (elapsedMinutes < maxMin) {
    actionability = {
      status: 'EXTENDED',
      badge: '🟠 EXTENDED (>25m)',
      tagClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/35',
      advice: 'Extended duration. Elevated theta decay risk—prefer fresh surge setups.',
      canTrade: false
    };
  } else {
    actionability = {
      status: 'EXPIRED',
      badge: '⏳ WINDOW CLOSED',
      tagClass: 'bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/35',
      advice: 'Signal validity window has expired. Shifted to Trade Journal.',
      canTrade: false
    };
  }

  return {
    givenTimeIso: givenDate.toISOString(),
    givenTimeFormatted,
    givenTimeShort,
    liveTimeFormatted,
    elapsedSeconds,
    elapsedMinutes,
    elapsedFormatted,
    formulaText,
    validUntilMinutes: maxMin,
    remainingMinutes,
    progressPct,
    isExpired,
    actionability
  };
}

/**
 * Calculates user trade action decision:
 * EXIT / CONTINUE / HOLD / BOOK PROFIT / TRAIL SL / SHIFT TO JOURNAL
 */
export function getUserTradeAdvice(params: {
  currentLtp: number;
  entryPrice: number;
  targetPrice: number;
  stoplossPrice: number;
  elapsedMinutes: number;
  maxValidityMinutes?: number;
}): TradeActionAdvice {
  const { currentLtp, entryPrice, targetPrice, stoplossPrice, elapsedMinutes } = params;
  const maxMin = params.maxValidityMinutes || 30;

  const cleanEntry = Math.max(1, entryPrice);
  const pnlPoints = +(currentLtp - cleanEntry).toFixed(2);
  const pnlPct = +( (pnlPoints / cleanEntry) * 100 ).toFixed(1);

  const isTargetAchieved = targetPrice > 0 && currentLtp >= targetPrice;
  const isStoplossHit = stoplossPrice > 0 && currentLtp <= stoplossPrice;
  const isExpired = elapsedMinutes >= maxMin;

  // 1. Target 1 achieved: Book Call
  if (isTargetAchieved) {
    return {
      actionType: 'BOOK_PROFIT',
      badgeLabel: '🎯 TARGET 1 HIT — BOOK PROFIT',
      badgeClass: 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse',
      buttonLabel: 'Book Call & Shift to Journal',
      explanation: `Target ₹${targetPrice.toFixed(1)} achieved (+${pnlPct}%). Lock full profits or trail tight SL.`,
      pnlPoints,
      pnlPct,
      isTargetAchieved: true,
      isStoplossHit: false,
      isExpired: false,
      shouldArchiveToJournal: true
    };
  }

  // 2. Stoploss hit: Exit Call
  if (isStoplossHit) {
    return {
      actionType: 'EXIT_SL',
      badgeLabel: '🛑 STOPLOSS HIT — EXIT CALL',
      badgeClass: 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse',
      buttonLabel: 'Exit Position & Record Journal',
      explanation: `Price breached SL floor ₹${stoplossPrice.toFixed(1)} (${pnlPct}%). Exit to preserve capital.`,
      pnlPoints,
      pnlPct,
      isTargetAchieved: false,
      isStoplossHit: true,
      isExpired: false,
      shouldArchiveToJournal: true
    };
  }

  // 3. Time expired without reaching target/SL: Expire and Shift
  if (isExpired) {
    return {
      actionType: 'EXPIRED_ARCHIVE',
      badgeLabel: '⏳ EXPIRED — SHIFT TO JOURNAL',
      badgeClass: 'bg-slate-700 text-slate-200 border border-slate-600',
      buttonLabel: 'Archived to Journal',
      explanation: `Signal exceeded active ${maxMin}m validity window. Shifted to post-market performance ledger.`,
      pnlPoints,
      pnlPct,
      isTargetAchieved: false,
      isStoplossHit: false,
      isExpired: true,
      shouldArchiveToJournal: true
    };
  }

  // 4. In solid profit (> 60% of distance to target): Trail SL
  const targetDistance = targetPrice - cleanEntry;
  const currentDistance = currentLtp - cleanEntry;
  if (targetDistance > 0 && currentDistance / targetDistance >= 0.60) {
    return {
      actionType: 'TRAIL_SL',
      badgeLabel: '🚀 60%+ TO TARGET — TRAIL SL TO COST',
      badgeClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40',
      buttonLabel: 'Trail SL to Entry',
      explanation: `Running +${pnlPct}% in profit. Trail stoploss to breakeven (₹${cleanEntry.toFixed(1)}) to lock risk-free ride.`,
      pnlPoints,
      pnlPct,
      isTargetAchieved: false,
      isStoplossHit: false,
      isExpired: false,
      shouldArchiveToJournal: false
    };
  }

  // 5. In entry zone (< 5 mins or near entry): Enter / Continue
  if (elapsedMinutes < 5 || (currentLtp >= cleanEntry * 0.97 && currentLtp <= cleanEntry * 1.03)) {
    return {
      actionType: 'ENTER_NOW',
      badgeLabel: '🟢 PRIME ENTRY — CONTINUE CALL',
      badgeClass: 'bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/40',
      buttonLabel: 'Enter Call Now',
      explanation: `Within optimal entry zone ₹${(cleanEntry * 0.98).toFixed(1)} - ₹${(cleanEntry * 1.02).toFixed(1)}. High probability momentum.`,
      pnlPoints,
      pnlPct,
      isTargetAchieved: false,
      isStoplossHit: false,
      isExpired: false,
      shouldArchiveToJournal: false
    };
  }

  // 6. Pullback or holding above SL: Hold
  return {
    actionType: 'HOLD_POSITION',
    badgeLabel: '⏸️ HOLD POSITION — ABOVE SL',
    badgeClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40',
    buttonLabel: 'Hold Position',
    explanation: `Consolidating above SL floor ₹${stoplossPrice.toFixed(1)}. Hold position and monitor volume delta.`,
    pnlPoints,
    pnlPct,
    isTargetAchieved: false,
    isStoplossHit: false,
    isExpired: false,
    shouldArchiveToJournal: false
  };
}
