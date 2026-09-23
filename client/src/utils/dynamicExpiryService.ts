/**
 * Dynamic Expiry Engine for NSE, BSE & MCX
 * Computes official upcoming weekly & monthly derivatives contract expiry dates
 * and days-to-expiry (DTE) dynamically from the current IST date.
 * Zero hardcoded expired dates.
 */

import { OFFICIAL_MARKET_HOLIDAYS, type MarketHolidayItem } from './marketHolidays';

const NSE_BSE_HOLIDAYS_SET = new Set(
  OFFICIAL_MARKET_HOLIDAYS.filter(h => h.nseClosed || h.bseClosed).map(h => h.date)
);

const MCX_FULL_HOLIDAYS_SET = new Set(
  OFFICIAL_MARKET_HOLIDAYS.filter(h => h.mcxMorningClosed && h.mcxEveningClosed).map(h => h.date)
);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface DynamicAssetExpiryItem {
  symbol: string;
  exchange: 'NSE' | 'BSE' | 'MCX';
  segment: string;
  nextExpiry: string;
  subsequent: string[];
  frequency: string;
  dte: number;
  note: string;
}

export class DynamicExpiryService {
  /**
   * Get current date in IST
   */
  public static getIstDate(now = new Date()): Date {
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
  }

  public static formatDate(d: Date): string {
    const day = d.getDate().toString().padStart(2, '0');
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  public static parseDate(dateStr: string): Date {
    const cleanStr = dateStr.replace(/\s*\(.*\)/, '').trim();
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthIdx = MONTHS.indexOf(parts[1]);
      const year = parseInt(parts[2], 10);
      return new Date(year, monthIdx, day, 15, 40, 0);
    }
    return new Date();
  }

  public static calculateDTE(expiryStr: string, fromDate = new Date()): number {
    try {
      const expDate = this.parseDate(expiryStr);
      const istNow = this.getIstDate(fromDate);
      const expDay = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
      const istDay = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate()).getTime();
      const diffDays = Math.round((expDay - istDay) / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 0;
    }
  }

  /**
   * Shifts backward if target date falls on weekend or market holiday
   */
  public static precedingTradingDay(date: Date, exchange: 'NSE' | 'BSE' | 'MCX' = 'NSE'): { date: Date; wasShifted: boolean } {
    const d = new Date(date);
    let wasShifted = false;
    let iterations = 0;

    while (iterations < 14) {
      iterations++;
      // Weekend check (Sunday = 0, Saturday = 6)
      if (d.getDay() === 0 || d.getDay() === 6) {
        d.setDate(d.getDate() - 1);
        wasShifted = true;
        continue;
      }

      // Holiday check
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;

      const isHoliday = exchange === 'MCX'
        ? MCX_FULL_HOLIDAYS_SET.has(iso)
        : NSE_BSE_HOLIDAYS_SET.has(iso);

      if (isHoliday) {
        d.setDate(d.getDate() - 1);
        wasShifted = true;
        continue;
      }

      break;
    }

    return { date: d, wasShifted };
  }

  /**
   * Weekly expiry dates generator
   * targetDay: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
   */
  public static getWeeklyExpiries(
    targetDay: number,
    exchange: 'NSE' | 'BSE' = 'NSE',
    count = 5,
    fromDate = new Date()
  ): string[] {
    const ist = this.getIstDate(fromDate);
    const istHour = ist.getHours();
    const istMinute = ist.getMinutes();
    const currentDay = ist.getDay();

    let diff = targetDay - currentDay;

    // If today is the target day, check if past market settlement close (15:30 IST)
    if (diff === 0) {
      if (istHour > 15 || (istHour === 15 && istMinute >= 30)) {
        diff = 7;
      }
    } else if (diff < 0) {
      diff += 7;
    }

    const expiries: string[] = [];
    const firstTarget = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate() + diff, 15, 30);

    for (let i = 0; expiries.length < count; i++) {
      const scheduledTarget = new Date(firstTarget.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const { date: actualExpiry, wasShifted } = this.precedingTradingDay(scheduledTarget, exchange);

      const expStr = this.formatDate(actualExpiry) + (wasShifted ? ' (Shifted)*' : '');
      if (!expiries.some(e => e.split(' ')[0] === expStr.split(' ')[0])) {
        expiries.push(expStr);
      }
    }

    return expiries;
  }

  /**
   * Last Tuesday of Month (NSE stock options & monthly index contracts)
   */
  public static getLastTuesdayOfMonth(year: number, month: number): Date {
    const lastDay = new Date(year, month + 1, 0); // Last day of month
    const dayOfWeek = lastDay.getDay();
    const diff = (dayOfWeek - 2 + 7) % 7;
    return new Date(year, month, lastDay.getDate() - diff, 15, 30);
  }

  public static getMonthlyStockExpiries(count = 4, fromDate = new Date()): string[] {
    const expiries: string[] = [];
    const ist = this.getIstDate(fromDate);
    const istHour = ist.getHours();
    const istMinute = ist.getMinutes();

    for (let m = 0; expiries.length < count; m++) {
      const targetMonth = ist.getMonth() + m;
      const targetYear = ist.getFullYear() + Math.floor(targetMonth / 12);
      const normalMonth = targetMonth % 12;

      const lastTuesday = this.getLastTuesdayOfMonth(targetYear, normalMonth);
      const { date: actualExpiry, wasShifted } = this.precedingTradingDay(lastTuesday, 'NSE');

      // Check if already expired today
      const isPastToday = (actualExpiry.getFullYear() === ist.getFullYear() &&
        actualExpiry.getMonth() === ist.getMonth() &&
        actualExpiry.getDate() === ist.getDate()) &&
        (istHour > 15 || (istHour === 15 && istMinute >= 30));

      const isEarlierThanToday = actualExpiry.getTime() < new Date(ist.getFullYear(), ist.getMonth(), ist.getDate()).getTime();

      if (!isPastToday && !isEarlierThanToday) {
        const expStr = this.formatDate(actualExpiry) + (wasShifted ? ' (Shifted)*' : '');
        if (!expiries.includes(expStr)) expiries.push(expStr);
      }
    }

    return expiries;
  }

  /**
   * MCX Fixed Day of Month expiries
   */
  public static getNthDayOfMonths(
    dayOfMonth: number,
    count = 4,
    fromDate = new Date()
  ): string[] {
    const expiries: string[] = [];
    const ist = this.getIstDate(fromDate);
    const istHour = ist.getHours();

    for (let m = 0; expiries.length < count && m < count + 12; m++) {
      const target = new Date(ist.getFullYear(), ist.getMonth() + m, dayOfMonth, 23, 30);
      const { date: actualExpiry, wasShifted } = this.precedingTradingDay(target, 'MCX');

      const isEarlier = actualExpiry.getTime() < new Date(ist.getFullYear(), ist.getMonth(), ist.getDate()).getTime();
      const isTodayPast = (actualExpiry.getFullYear() === ist.getFullYear() &&
        actualExpiry.getMonth() === ist.getMonth() &&
        actualExpiry.getDate() === ist.getDate()) && istHour >= 23;

      if (!isEarlier && !isTodayPast) {
        const expStr = this.formatDate(actualExpiry) + (wasShifted ? ' (Shifted)*' : '');
        if (!expiries.includes(expStr)) expiries.push(expStr);
      }
    }

    return expiries;
  }

  /**
   * MCX Specific Delivery Months (e.g. Gold even months, Silver designated months)
   */
  public static getNthDayOfSpecificMonths(
    dayOfMonth: number,
    months: number[], // 0-indexed
    count = 4,
    fromDate = new Date()
  ): string[] {
    const expiries: string[] = [];
    const ist = this.getIstDate(fromDate);

    for (let yearOffset = 0; yearOffset <= 3 && expiries.length < count; yearOffset++) {
      for (const month of months) {
        if (expiries.length >= count) break;
        const target = new Date(ist.getFullYear() + yearOffset, month, dayOfMonth, 23, 30);
        const { date: actualExpiry, wasShifted } = this.precedingTradingDay(target, 'MCX');

        if (actualExpiry.getTime() >= new Date(ist.getFullYear(), ist.getMonth(), ist.getDate()).getTime()) {
          const expStr = this.formatDate(actualExpiry) + (wasShifted ? ' (Shifted)*' : '');
          if (!expiries.includes(expStr)) expiries.push(expStr);
        }
      }
    }

    return expiries;
  }

  /**
   * Generates the complete, live dynamic Asset Expiry Matrix
   */
  public static getDynamicAssetExpiryMatrix(
    liveIndicesState?: Record<string, any>,
    fromDate = new Date()
  ): DynamicAssetExpiryItem[] {
    // 1. NIFTY 50 (Weekly on Tuesday)
    const niftyServerExpiries: string[] | undefined = liveIndicesState?.['NIFTY']?.expiryDates;
    const niftyWeekly = (niftyServerExpiries && niftyServerExpiries.length > 0)
      ? niftyServerExpiries
      : this.getWeeklyExpiries(2, 'NSE', 5, fromDate);
    const niftyNext = niftyWeekly[0] || '29-Sep-2026';
    const niftySubsequent = niftyWeekly.slice(1, 5);

    // 2. SENSEX (Weekly on Thursday)
    const sensexServerExpiries: string[] | undefined = liveIndicesState?.['SENSEX']?.expiryDates;
    const sensexWeekly = (sensexServerExpiries && sensexServerExpiries.length > 0)
      ? sensexServerExpiries
      : this.getWeeklyExpiries(4, 'BSE', 5, fromDate);
    const sensexNext = sensexWeekly[0] || '24-Sep-2026';
    const sensexSubsequent = sensexWeekly.slice(1, 5);

    // 3. FINNIFTY (Weekly on Tuesday)
    const finServerExpiries: string[] | undefined = liveIndicesState?.['FINNIFTY']?.expiryDates;
    const finWeekly = (finServerExpiries && finServerExpiries.length > 0)
      ? finServerExpiries
      : this.getWeeklyExpiries(2, 'NSE', 5, fromDate);
    const finNext = finWeekly[0] || '29-Sep-2026';
    const finSubsequent = finWeekly.slice(1, 4);

    // 4. BANKNIFTY (Weekly on Wednesday / Monthly Last Tuesday)
    const bankServerExpiries: string[] | undefined = liveIndicesState?.['BANKNIFTY']?.expiryDates;
    const bankWeekly = (bankServerExpiries && bankServerExpiries.length > 0)
      ? bankServerExpiries
      : this.getWeeklyExpiries(3, 'NSE', 5, fromDate);
    const bankNext = bankWeekly[0] || '29-Sep-2026';
    const bankSubsequent = bankWeekly.slice(1, 4);

    // 5. NIFTY 50 STOCKS (Monthly on Last Tuesday)
    const stocksMonthly = this.getMonthlyStockExpiries(4, fromDate);
    const stocksNext = stocksMonthly[0] || '29-Sep-2026';
    const stocksSubsequent = stocksMonthly.slice(1, 4);

    // 6. MCX CRUDE OIL (19th of each month)
    const crudeExpiries = this.getNthDayOfMonths(19, 4, fromDate);
    const crudeNext = crudeExpiries[0] || '19-Oct-2026';
    const crudeSubsequent = crudeExpiries.slice(1, 4);

    // 7. MCX NATURAL GAS (25th of each month)
    const ngExpiries = this.getNthDayOfMonths(25, 4, fromDate);
    const ngNext = ngExpiries[0] || '25-Sep-2026';
    const ngSubsequent = ngExpiries.slice(1, 4);

    // 8. MCX GOLD (5th of Even Months: Feb=1, Apr=3, Jun=5, Aug=7, Oct=9, Dec=11)
    const goldExpiries = this.getNthDayOfSpecificMonths(5, [1, 3, 5, 7, 9, 11], 4, fromDate);
    const goldNext = goldExpiries[0] || '05-Oct-2026';
    const goldSubsequent = goldExpiries.slice(1, 4);

    // 9. MCX SILVER (5th of designated contract months: Mar=2, May=4, Jul=6, Sep=8, Nov=10, Dec=11)
    const silverExpiries = this.getNthDayOfSpecificMonths(5, [2, 4, 6, 8, 10, 11], 4, fromDate);
    const silverNext = silverExpiries[0] || '05-Nov-2026';
    const silverSubsequent = silverExpiries.slice(1, 4);

    return [
      {
        symbol: 'NIFTY 50',
        exchange: 'NSE',
        segment: 'Index Derivatives',
        nextExpiry: niftyNext,
        subsequent: niftySubsequent,
        frequency: 'Weekly (Tuesday)',
        dte: this.calculateDTE(niftyNext, fromDate),
        note: 'Official SEBI benchmark for NSE. Expiry every Tuesday.'
      },
      {
        symbol: 'SENSEX',
        exchange: 'BSE',
        segment: 'Index Derivatives',
        nextExpiry: sensexNext,
        subsequent: sensexSubsequent,
        frequency: 'Weekly (Thursday)',
        dte: this.calculateDTE(sensexNext, fromDate),
        note: 'Official SEBI benchmark for BSE. Expiry every Thursday.'
      },
      {
        symbol: 'FINNIFTY',
        exchange: 'NSE',
        segment: 'Financial Services',
        nextExpiry: finNext,
        subsequent: finSubsequent,
        frequency: 'Weekly / Monthly (Tuesday)',
        dte: this.calculateDTE(finNext, fromDate),
        note: 'Aligned to Tuesday expiry cycle.'
      },
      {
        symbol: 'BANKNIFTY',
        exchange: 'NSE',
        segment: 'Banking Index',
        nextExpiry: bankNext,
        subsequent: bankSubsequent,
        frequency: 'Wednesdays / Monthly Last Tuesday',
        dte: this.calculateDTE(bankNext, fromDate),
        note: 'Weekly Wednesday contracts + monthly contract expiring on last Tuesday of the month.'
      },
      {
        symbol: 'NIFTY 50 STOCKS (RELIANCE, TCS, etc.)',
        exchange: 'NSE',
        segment: 'Stock Options & Futures',
        nextExpiry: stocksNext,
        subsequent: stocksSubsequent,
        frequency: 'Monthly (Last Tuesday)',
        dte: this.calculateDTE(stocksNext, fromDate),
        note: 'Under revised NSE standard, all equity stocks expire on the last Tuesday of the month.'
      },
      {
        symbol: 'CRUDE OIL',
        exchange: 'MCX',
        segment: 'Commodity Derivatives',
        nextExpiry: crudeNext,
        subsequent: crudeSubsequent,
        frequency: 'Monthly (19th)',
        dte: this.calculateDTE(crudeNext, fromDate),
        note: 'Expires on 19th of each calendar month (or preceding business day).'
      },
      {
        symbol: 'NATURAL GAS',
        exchange: 'MCX',
        segment: 'Commodity Derivatives',
        nextExpiry: ngNext,
        subsequent: ngSubsequent,
        frequency: 'Monthly (25th)',
        dte: this.calculateDTE(ngNext, fromDate),
        note: 'Expires on 25th of each calendar month (or preceding business day).'
      },
      {
        symbol: 'GOLD (1kg / Mini)',
        exchange: 'MCX',
        segment: 'Precious Metals',
        nextExpiry: goldNext,
        subsequent: goldSubsequent,
        frequency: 'Bi-Monthly (5th of Even Months)',
        dte: this.calculateDTE(goldNext, fromDate),
        note: 'Expires on 5th of Feb, Apr, Jun, Aug, Oct, Dec (or preceding business day).'
      },
      {
        symbol: 'SILVER (30kg / Mini)',
        exchange: 'MCX',
        segment: 'Precious Metals',
        nextExpiry: silverNext,
        subsequent: silverSubsequent,
        frequency: 'Bi-Monthly (Delivery Months)',
        dte: this.calculateDTE(silverNext, fromDate),
        note: 'Expires on 5th of scheduled contract months (or preceding business day).'
      }
    ];
  }
}
