import { getISTComponents, formatISTTime } from './formatTime';

export const COMMODITY_SYMBOLS = ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER', 'COPPER', 'ZINC'] as const;

export function isCommoditySymbol(symbol: string): boolean {
  if (!symbol) return false;
  return COMMODITY_SYMBOLS.includes(symbol.toUpperCase().trim() as any);
}

/**
 * Market hours check:
 * - MCX Commodities: 09:00 to 23:30 IST on working days (Mon-Fri)
 * - NSE / BSE Equities & Derivatives: 09:00 to 15:40 IST on working days (Mon-Fri)
 *   (Pre-market 09:00 - 09:15, Normal session 09:15 - 15:30, Closing session 15:30 - 15:40)
 *   Reopens next working day at 09:00 AM IST.
 */
import { isDateMarketHoliday } from './marketHolidays';

export function isMarketOpenForSymbol(symbol: string): boolean {
  const { hours, minutes, dayOfWeek, year, month, day } = getISTComponents();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Saturday & Sunday closed

  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isCommodity = isCommoditySymbol(symbol);

  // Check official exchange holidays
  if (isDateMarketHoliday(isoDate, isCommodity ? 'MCX' : 'NSE')) {
    return false;
  }

  const currentMin = hours * 60 + minutes;
  if (isCommodity) {
    return currentMin >= (9 * 60) && currentMin < (23 * 60 + 30);
  }

  // NSE & BSE: Open 09:00 AM to 03:40 PM IST
  return currentMin >= (9 * 60) && currentMin < (15 * 60 + 40);
}

/**
 * Returns whether broader NSE / BSE equity markets are currently in session (09:00 - 15:40 IST, Mon-Fri)
 */
export function isNseMarketOpen(): boolean {
  return isMarketOpenForSymbol('NIFTY');
}

/**
 * Returns the anchor time (in ms) for chart candle sequences:
 * - If market is currently open: returns current live timestamp (Date.now())
 * - If market is closed:
 *   - For NSE/BSE: returns timestamp of 15:40:00 IST on the last active trading session
 *   - For MCX Commodities: returns timestamp of 23:30:00 IST on the last active trading session
 */
export function getLastMarketSessionAnchor(symbol: string): {
  anchorMs: number;
  isLive: boolean;
  closingTimeFormatted: string;
  reopenNotice: string;
} {
  const isOpen = isMarketOpenForSymbol(symbol);
  const nowMs = Date.now();
  const { hours, minutes, dayOfWeek, year, month, day } = getISTComponents();
  const currentMin = hours * 60 + minutes;
  const isCommodity = isCommoditySymbol(symbol);

  if (isOpen) {
    return {
      anchorMs: nowMs,
      isLive: true,
      closingTimeFormatted: isCommodity ? '23:30 IST' : '15:40 IST',
      reopenNotice: isCommodity ? 'Closes at 11:30 PM IST' : 'Closes at 03:40 PM IST'
    };
  }

  // Market is closed: calculate the exact IST date of the most recent market day
  let daysBack = 0;
  if (dayOfWeek === 0) {
    // Sunday -> last session was Friday (2 days ago)
    daysBack = 2;
  } else if (dayOfWeek === 6) {
    // Saturday -> last session was Friday (1 day ago)
    daysBack = 1;
  } else if (dayOfWeek === 1 && currentMin < 9 * 60) {
    // Monday morning before 09:00 -> last session was Friday (3 days ago)
    daysBack = 3;
  } else if (currentMin < 9 * 60) {
    // Tue-Fri morning before 09:00 -> last session was yesterday (1 day ago)
    daysBack = 1;
  } else {
    // Weekday after market close (>= 15:40 for NSE/BSE, or >= 23:30 for MCX) -> today
    daysBack = 0;
  }

  // Create date for the session day in IST
  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  if (daysBack > 0) {
    targetDate.setUTCDate(targetDate.getUTCDate() - daysBack);
  }

  const sYear = targetDate.getUTCFullYear();
  const sMonth = targetDate.getUTCMonth();
  const sDay = targetDate.getUTCDate();

  // Closing candle anchor time:
  // For NSE/BSE: 15:40:00 IST (10:10:00 UTC)
  // For MCX: 23:30:00 IST (18:00:00 UTC)
  const closeHour = isCommodity ? 23 : 15;
  const closeMin = isCommodity ? 30 : 40;

  // UTC equivalent: IST - 5:30
  // 15:40 IST -> 10:10 UTC
  // 23:30 IST -> 18:00 UTC
  const utcHour = closeHour === 15 ? 10 : 18;
  const utcMin = closeHour === 15 ? 10 : 0;
  const anchorMs = Date.UTC(sYear, sMonth, sDay, utcHour, utcMin, 0);

  return {
    anchorMs,
    isLive: false,
    closingTimeFormatted: isCommodity ? '11:30 PM IST' : '03:40 PM IST',
    reopenNotice: 'Reopens at 09:00 AM IST on next working day'
  };
}

/**
 * Returns exact start-end time range for a bar in a given timeframe (1m, 3m, 5m, 15m)
 * - If market is open: returns current live candle interval (e.g. 10:15 - 10:20)
 * - If market is closed: returns session closing candle interval (e.g. 15:35 - 15:40 for NSE/BSE)
 */
export function getBarTimeRangeForSymbol(symbol: string, minutes: number): string {
  const isOpen = isMarketOpenForSymbol(symbol);
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (!isOpen) {
    // Closed: anchor to 15:40 IST for NSE/BSE, or 23:30 IST for MCX
    const isCommodity = isCommoditySymbol(symbol);
    const closeHour = isCommodity ? 23 : 15;
    const closeMinute = isCommodity ? 30 : 40;

    let startMinute = closeMinute - minutes;
    let startHour = closeHour;
    if (startMinute < 0) {
      startHour -= 1;
      startMinute += 60;
    }

    const startStr = `${pad(startHour)}:${pad(startMinute)}`;
    const endStr = `${pad(closeHour)}:${pad(closeMinute)}`;
    return `${startStr} - ${endStr}`;
  }

  // Live market:
  const { hours: currentH, minutes: currentM } = getISTComponents();
  const startMinute = Math.floor(currentM / minutes) * minutes;
  const endMinute = startMinute + minutes;

  const startStr = `${pad(currentH)}:${pad(startMinute)}`;
  const endH = endMinute >= 60 ? (currentH + 1) % 24 : currentH;
  const endM = endMinute >= 60 ? endMinute % 60 : endMinute;
  const endStr = `${pad(endH)}:${pad(endM)}`;

  return `${startStr} - ${endStr}`;
}

/**
 * Returns safe formatted tip time for a given symbol:
 * - If market is open: returns real-time / given time
 * - If market is closed: clamps fallback time to '03:15 PM IST' (or '03:20 PM IST') for NSE/BSE,
 *   preventing late-night (e.g. 22:30 IST) or early-morning timestamps on closed equity setups.
 */
export function getSafeTipTimeFormatted(
  symbol: string,
  givenTimeFormatted?: string | null,
  isCarryForward = false
): string {
  if (givenTimeFormatted && givenTimeFormatted !== 'Live' && !/^(undefined|null)$/i.test(givenTimeFormatted)) {
    const isCommodity = isCommoditySymbol(symbol);
    if (!isCommodity) {
      const match12 = givenTimeFormatted.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
      if (match12) {
        const h = parseInt(match12[1], 10);
        const m = parseInt(match12[2], 10);
        const ampm = match12[3].toUpperCase();
        if (ampm === 'PM' && (h === 12 ? false : h >= 4 || (h === 3 && m > 40))) {
          return isCarryForward ? '03:20 PM IST' : '03:15 PM IST';
        }
        if (ampm === 'AM' && h < 9) {
          return isCarryForward ? '03:20 PM IST' : '03:15 PM IST';
        }
      }
    }
    return givenTimeFormatted;
  }

  const isOpen = isMarketOpenForSymbol(symbol);
  if (isOpen) {
    return formatISTTime(null, { showSeconds: false, includeSuffix: true });
  }

  // Closed market default
  return isCarryForward ? '03:20 PM IST' : '03:15 PM IST';
}
